// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./libraries/ReputationLogic.sol";

/**
 * @dev Minimal ERC-2981 interface.
 *      Marketplaces and routers use this to discover royalty requirements without
 *      needing to understand the full attribution DAG.
 */
interface IERC2981 {
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external view returns (address receiver, uint256 royaltyAmount);
}

/**
 * @title  AlexandrianRegistryV2
 * @notice Permanent record, provenance graph, and settlement engine
 *         for AI-native Knowledge Blocks.
 *
 * Core features:
 *   - Typed Knowledge Blocks (6 artifact types)
 *   - Royalty DAG with proportional attribution (basis points)
 *   - Atomic query fee settlement through the DAG
 *   - Deterministic reputation scoring (no hidden state)
 *   - Domain and type indexes for agent retrieval routing
 *   - Pull payments (pendingWithdrawals / withdrawEarnings)
 *   - On-chain observability: totalFeesEarned per KB, protocolFeeTotal
 *   - MAX_PARENTS = 8 enforcement
 *   - Query identity: queryNonce per KB, querierOf
 *   - Pause / circuit breaker (owner-controlled)
 *   - AttributionLinked event emitted in publishKB for subgraph DAG reconstruction
 *   - Custom errors replacing string reverts (lower gas, cleaner ABI)
 *
 * Existing Asset system is completely unchanged.
 */
contract AlexandrianRegistryV2 is Ownable, ReentrancyGuard, IERC2981 {

    // =========================================================================
    // CUSTOM ERRORS
    // =========================================================================

    // Asset system
    error AssetDoesNotExist();
    error AssetAlreadyExists();
    error ParentAssetNotFound();
    error OnlyCreator();
    error AssetInactive();

    // KB publication
    error InvalidHash();
    error InvalidCurator();
    error AlreadyPublished();
    error InsufficientStake();
    error CIDRequired();
    error DomainRequired();
    error TooManyParents();
    error NoSelfReference();
    error ParentNotRegistered();
    error DuplicateParent();
    error SharesExceedDistributable();

    // KB existence
    error KBNotRegistered();

    // Settlement
    error InvalidQuerier();
    error IncorrectFee();
    error KBIsSlashed();

    // Withdrawals
    error NoEarnings();
    error WithdrawFailed();
    error NothingToWithdraw();
    error TreasuryWithdrawFailed();
    error InvalidRecipient();

    // Staking
    error ZeroStake();
    error OnlyCurator();
    error StakeSlashed();
    error StillLocked();
    error AlreadySlashed();
    error NoStake();

    // Reputation / endorsement
    error NoSelfEndorse();
    error NotRegisteredCurator();

    // Pause
    error ProtocolPaused();
    error AlreadyPaused();
    error NotPaused();

    // Identity linking
    error IdentityAlreadyLinked();

    // Admin
    error FeeTooHigh();
    error SlashRateTooHigh();

    // =========================================================================
    // ENUMERATIONS
    // =========================================================================

    enum KBType {
        Practice,            // 0
        Feature,             // 1
        StateMachine,        // 2
        PromptEngineering,   // 3
        ComplianceChecklist, // 4
        Rubric               // 5
    }

    enum TrustTier {
        HumanStaked,     // 0  human curator, full accountability
        AgentDerived,    // 1  derived from Tier 0 KBs
        AgentDiscovered  // 2  novel agent content, probationary
    }

    // =========================================================================
    // STRUCTS  existing (unchanged)
    // =========================================================================

    struct Asset {
        bytes32   fingerprint;
        string    cid;
        address   creator;
        uint256   timestamp;
        uint256   blockNumber;
        License   license;
        bytes32[] parents;
        bool      active;
    }

    struct License {
        string licenseType;
        bool   commercialUse;
        bool   attribution;
        bool   shareAlike;
        bool   derivatives;
    }

    struct Provenance {
        bytes32 assetId;
        bytes32 parentId;
        uint256 depth;
        uint256 timestamp;
    }

    // =========================================================================
    // STRUCTS  V1
    // =========================================================================

    /**
     * @dev One edge in the royalty DAG.
     *      royaltyShareBps in basis points (1/10000).
     *      All shares for one KB must sum to <= 10000 (100% of distributable).
     */
    struct AttributionLink {
        bytes32 parentHash;
        uint16  royaltyShareBps;
        bytes4  relationship; // "derv" | "extd" | "ctrd" | "vald"
    }

    struct StakeRecord {
        uint256 amount;
        uint256 lockedUntil;
        bool    slashed;
    }

    struct ReputationRecord {
        uint32  queryVolume;
        uint32  endorsements;
        uint16  score;        // 0–1000
        uint256 lastUpdated;
    }

    struct KnowledgeBlock {
        address   curator;
        KBType    kbType;
        TrustTier trustTier;
        string    cid;
        string    embeddingCid;
        string    domain;
        string    licenseType;
        uint256   queryFee;
        uint256   timestamp;
        string    version;
        bool      exists;
    }

    // =========================================================================
    // STATE  existing (unchanged)
    // =========================================================================

    mapping(bytes32 => Asset)        public assets;
    mapping(address => bytes32[])    public creatorAssets;
    mapping(bytes32 => Provenance[]) public provenanceGraph;

    // =========================================================================
    // STATE  V1
    // =========================================================================

    mapping(bytes32 => KnowledgeBlock)    public knowledgeBlocks;
    mapping(bytes32 => AttributionLink[]) public attributionDAG;
    mapping(bytes32 => StakeRecord)       public stakes;
    mapping(bytes32 => ReputationRecord)  public reputation;

    mapping(address => bytes32[]) public curatorBlocks;
    mapping(uint8   => bytes32[]) public blocksByType;
    mapping(bytes32 => bytes32[]) public blocksByDomain;
    mapping(bytes32 => bytes32[]) public derivedBlocks;

    uint256 public constant MAX_PARENTS = 8;

    uint256 public protocolFeesBps = 200;
    uint256 public slashRateBps    = 1000;
    uint256 public minStakeAmount  = 1e15;
    uint256 public treasuryBalance;

    // =========================================================================
    // STATE  V2 — observability
    // =========================================================================

    /// @dev Per-KB cumulative distributable fees (excludes protocol cut).
    mapping(bytes32 => uint256) public totalFeesEarned;

    /// @dev Lifetime protocol fee collected across all settlements.
    uint256 public protocolFeeTotal;

    // =========================================================================
    // STATE  V2 — pull payments
    // =========================================================================

    /// @dev Accrued but unwithdraw earnings per address (curator + parents).
    mapping(address => uint256) public pendingWithdrawals;

    // =========================================================================
    // STATE  V2 — query identity
    // =========================================================================

    /// @dev Monotonic query counter per KB. Incremented on every paid settlement.
    mapping(bytes32 => uint64) public queryNonce;

    /// @dev Maps (contentHash, nonce) → querier address.
    mapping(bytes32 => mapping(uint64 => address)) public querierOf;

    // =========================================================================
    // STATE  V2 — Agent identity chain (kbId => successor kbId)
    // =========================================================================

    mapping(bytes32 => bytes32) public identityChain;

    // =========================================================================
    // STATE  V2 — pause / circuit breaker
    // =========================================================================

    bool public paused;

    // =========================================================================
    // EVENTS  existing (unchanged)
    // =========================================================================

    event AssetRegistered(bytes32 indexed assetId, bytes32 indexed fingerprint, string cid, address indexed creator, uint256 timestamp);
    event DerivationRegistered(bytes32 indexed derivedId, bytes32 indexed parentId, uint256 depth);
    event LicenseUpdated(bytes32 indexed assetId, License license);

    // =========================================================================
    // EVENTS  V1
    // =========================================================================

    event KBPublished(bytes32 indexed contentHash, address indexed curator, KBType indexed kbType, string domain, uint256 queryFee, uint256 timestamp);
    event KBStaked(bytes32 indexed contentHash, address indexed curator, uint256 amount);
    event KBUnstaked(bytes32 indexed contentHash, address indexed curator, uint256 amount);
    event KBSlashed(bytes32 indexed contentHash, address indexed curator, uint256 slashedAmount, string reason);

    /// @dev 5-param shape locked. queryNonce links settlement to querier identity.
    event QuerySettled(bytes32 indexed contentHash, address indexed querier, uint256 totalFee, uint256 protocolFee, uint64 queryNonce);

    event RoyaltyPaid(bytes32 indexed contentHash, address indexed recipient, uint256 amount);
    event ReputationUpdated(bytes32 indexed contentHash, uint16 newScore, uint32 queryVolume);
    event KBEndorsed(bytes32 indexed contentHash, address indexed endorser);

    /// @dev Emitted per parent link so subgraph can reconstruct DAG edges from events.
    event AttributionLinked(bytes32 indexed child, bytes32 indexed parent, uint16 bps, bytes4 relationship);

    // =========================================================================
    // EVENTS  V2
    // =========================================================================

    event EarningsWithdrawn(address indexed recipient, uint256 amount);
    event TreasuryWithdrawn(address indexed to, uint256 amount);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event IdentityLinked(bytes32 indexed previousIdentity, bytes32 indexed newIdentity);

    // =========================================================================
    // MODIFIERS
    // =========================================================================

    modifier assetExists(bytes32 assetId) {
        if (assets[assetId].timestamp == 0) revert AssetDoesNotExist();
        _;
    }

    modifier kbExists(bytes32 contentHash) {
        if (!knowledgeBlocks[contentHash].exists) revert KBNotRegistered();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ProtocolPaused();
        _;
    }

    constructor() Ownable(msg.sender) {}

    // =========================================================================
    // V2 — PAUSE / CIRCUIT BREAKER
    // =========================================================================

    /// @notice Halt all state-modifying protocol operations. Owner-only circuit breaker.
    /// @dev Reverts with `AlreadyPaused` if the protocol is already paused.
    function pause() external onlyOwner {
        if (paused) revert AlreadyPaused();
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Re-enable protocol operations after a pause. Owner-only.
    /// @dev Reverts with `NotPaused` if the protocol is not currently paused.
    function unpause() external onlyOwner {
        if (!paused) revert NotPaused();
        paused = false;
        emit Unpaused(msg.sender);
    }

    // =========================================================================
    // V1 — PUBLICATION
    // =========================================================================

    /// @notice Publish a Knowledge Block. Curator may differ from msg.sender (allows seeding / delegated publish).
    /// @dev Trust model: we do not require curator == msg.sender. See docs/PROTOCOL-TRUST-AND-SUBGRAPH.md.
    function publishKB(
        bytes32           contentHash,
        address           curator,
        KBType            kbType,
        TrustTier         trustTier,
        string  calldata  cid,
        string  calldata  embeddingCid,
        string  calldata  domain,
        string  calldata  licenseType,
        uint256           queryFee,
        string  calldata  version,
        AttributionLink[] calldata parents
    ) external payable nonReentrant whenNotPaused {
        if (contentHash == bytes32(0))             revert InvalidHash();
        if (curator == address(0))                 revert InvalidCurator();
        if (knowledgeBlocks[contentHash].exists)   revert AlreadyPublished();
        if (msg.value < minStakeAmount)            revert InsufficientStake();
        if (bytes(cid).length == 0)                revert CIDRequired();
        if (bytes(domain).length == 0)             revert DomainRequired();
        if (parents.length > MAX_PARENTS)          revert TooManyParents();

        _validateAttributionShares(contentHash, parents);

        knowledgeBlocks[contentHash] = KnowledgeBlock({
            curator:      curator,
            kbType:       kbType,
            trustTier:    trustTier,
            cid:          cid,
            embeddingCid: embeddingCid,
            domain:       domain,
            licenseType:  licenseType,
            queryFee:     queryFee,
            timestamp:    block.timestamp,
            version:      version,
            exists:       true
        });

        for (uint256 i = 0; i < parents.length; i++) {
            attributionDAG[contentHash].push(parents[i]);
            derivedBlocks[parents[i].parentHash].push(contentHash);
            emit AttributionLinked(contentHash, parents[i].parentHash, parents[i].royaltyShareBps, parents[i].relationship);
        }

        stakes[contentHash] = StakeRecord({
            amount:      msg.value,
            lockedUntil: block.timestamp + 30 days,
            slashed:     false
        });

        reputation[contentHash] = ReputationRecord({
            queryVolume:      0,
            endorsements:     0,
            score:            0,
            lastUpdated:      block.timestamp
        });

        curatorBlocks[curator].push(contentHash);
        blocksByType[uint8(kbType)].push(contentHash);
        // Domain index key must match subgraph: keccak256(bytes(domain))
        blocksByDomain[keccak256(bytes(domain))].push(contentHash);

        emit KBPublished(contentHash, curator, kbType, domain, queryFee, block.timestamp);
        emit KBStaked(contentHash, curator, msg.value);
    }

    // =========================================================================
    // V1 — SETTLEMENT
    // =========================================================================

    /**
     * @notice Settle a query fee atomically through the attribution DAG.
     *
     *   1. Protocol fee → treasury (and protocolFeeTotal)
     *   2. Parent shares → accrued to pendingWithdrawals (pull)
     *   3. Remainder → curator pendingWithdrawals (pull)
     *   4. queryNonce incremented; querierOf recorded
     *
     * msg.value must equal kb.queryFee exactly.
     * Slashed KBs cannot be queried.
     * Free queries (msg.value == 0) do not update reputation or queryNonce.
     */
    function settleQuery(
        bytes32 contentHash,
        address querier
    ) external payable nonReentrant whenNotPaused kbExists(contentHash) {
        if (querier == address(0))             revert InvalidQuerier();
        KnowledgeBlock storage kb = knowledgeBlocks[contentHash];
        if (msg.value != kb.queryFee)          revert IncorrectFee();
        if (stakes[contentHash].slashed)       revert KBIsSlashed();

        uint256 protocolFee   = (msg.value * protocolFeesBps) / 10000;
        treasuryBalance      += protocolFee;
        protocolFeeTotal     += protocolFee;
        uint256 distributable = msg.value - protocolFee;
        totalFeesEarned[contentHash] += distributable;

        AttributionLink[] storage links = attributionDAG[contentHash];
        uint256 parentTotal = 0;

        for (uint256 i = 0; i < links.length; i++) {
            bytes32 parent = links[i].parentHash;

            if (!knowledgeBlocks[parent].exists) continue;
            if (stakes[parent].slashed) continue; // slashed KBs ineligible for royalties; share accrues to curator

            uint256 share = (distributable * links[i].royaltyShareBps) / 10000;
            if (share == 0) continue;

            parentTotal += share;

            address parentCurator = knowledgeBlocks[parent].curator;
            pendingWithdrawals[parentCurator] += share;
            emit RoyaltyPaid(parent, parentCurator, share);
            if (msg.value > 0) {
                reputation[parent].queryVolume += 1;
            }
        }

        uint256 curatorAmount = distributable - parentTotal;
        if (curatorAmount > 0) {
            pendingWithdrawals[kb.curator] += curatorAmount;
            emit RoyaltyPaid(contentHash, kb.curator, curatorAmount);
        }

        // Increment nonce and record querier (paid queries only).
        uint64 nonce = 0;
        if (msg.value > 0) {
            queryNonce[contentHash] += 1;
            nonce = queryNonce[contentHash];
            querierOf[contentHash][nonce] = querier;

            reputation[contentHash].queryVolume += 1;
            _recomputeScore(contentHash);
        }

        emit QuerySettled(contentHash, querier, msg.value, protocolFee, nonce);
    }

    // =========================================================================
    // V2 — AGENT IDENTITY LINKING
    // =========================================================================

    /**
     * @notice Link a previous identity KB to its successor.
     * @dev Append-only: previousIdentity may be linked once. Verification of recovery proofs
     *      is performed off-chain using the KB payload (recoveryCommitment / recoveryProof).
     */
    function linkIdentity(bytes32 previousIdentity, bytes32 newIdentity) external {
        if (!knowledgeBlocks[newIdentity].exists) revert KBNotRegistered();
        if (knowledgeBlocks[previousIdentity].curator != msg.sender) revert OnlyCurator();
        if (identityChain[previousIdentity] != bytes32(0)) revert IdentityAlreadyLinked();
        identityChain[previousIdentity] = newIdentity;
        emit IdentityLinked(previousIdentity, newIdentity);
    }

    // =========================================================================
    // V2 — PULL PAYMENTS
    // =========================================================================

    /// @notice Withdraw accrued earnings (royalties + curator share) from settlements.
    function withdrawEarnings() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NoEarnings();
        pendingWithdrawals[msg.sender] = 0;
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        if (!sent) revert WithdrawFailed();
        emit EarningsWithdrawn(msg.sender, amount);
    }

    // =========================================================================
    // V1 — STAKING
    // =========================================================================

    /// @notice Add ETH stake to an existing Knowledge Block, resetting the 30-day lock window.
    /// @param contentHash The KB content hash to stake into. Must be registered and caller must be curator.
    function addStake(bytes32 contentHash) external payable nonReentrant kbExists(contentHash) {
        if (msg.value == 0)                                          revert ZeroStake();
        if (knowledgeBlocks[contentHash].curator != msg.sender)      revert OnlyCurator();
        stakes[contentHash].amount      += msg.value;
        stakes[contentHash].lockedUntil  = block.timestamp + 30 days;
        emit KBStaked(contentHash, msg.sender, msg.value);
    }

    /// @notice Withdraw the full stake from a KB after the 30-day lock expires.
    /// @dev Reverts with `StakeSlashed` if slashed, `StillLocked` if within lock period.
    /// @param contentHash The KB content hash to withdraw stake from.
    function withdrawStake(bytes32 contentHash) external nonReentrant kbExists(contentHash) {
        if (knowledgeBlocks[contentHash].curator != msg.sender)      revert OnlyCurator();
        StakeRecord storage s = stakes[contentHash];
        if (s.slashed)                       revert StakeSlashed();
        if (block.timestamp < s.lockedUntil) revert StillLocked();
        if (s.amount == 0)                   revert NothingToWithdraw();
        uint256 amount = s.amount;
        s.amount = 0;
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        if (!sent) revert WithdrawFailed();
        emit KBUnstaked(contentHash, msg.sender, amount);
    }

    // =========================================================================
    // V1 — SLASHING
    // =========================================================================

    /// @notice Slash a KB's stake, transferring `slashRateBps` of the stake to the treasury.
    ///         Slashed KBs are permanently barred from query settlement. Owner-only.
    /// @param contentHash The KB to slash.
    /// @param reason Human-readable justification emitted in the `KBSlashed` event.
    function slash(bytes32 contentHash, string calldata reason)
        external onlyOwner kbExists(contentHash)
    {
        StakeRecord storage s = stakes[contentHash];
        if (s.slashed)    revert AlreadySlashed();
        if (s.amount == 0) revert NoStake();
        uint256 slashAmount = (s.amount * slashRateBps) / 10000;
        s.amount  -= slashAmount;
        s.slashed  = true;
        treasuryBalance += slashAmount;
        emit KBSlashed(contentHash, knowledgeBlocks[contentHash].curator, slashAmount, reason);
    }

    // =========================================================================
    // V1 — REPUTATION
    // =========================================================================

    /// @notice Endorse a Knowledge Block to boost its reputation score.
    /// @dev Caller must be a registered curator (have published at least one KB). Self-endorsement reverts.
    /// @param contentHash The KB content hash to endorse.
    function endorse(bytes32 contentHash) external kbExists(contentHash) {
        if (knowledgeBlocks[contentHash].curator == msg.sender) revert NoSelfEndorse();
        if (curatorBlocks[msg.sender].length == 0)              revert NotRegisteredCurator();
        reputation[contentHash].endorsements += 1;
        _recomputeScore(contentHash);
        emit KBEndorsed(contentHash, msg.sender);
    }

    // =========================================================================
    // V1 — VIEWS
    // =========================================================================

    /// @notice Returns true if the given content hash is a registered Knowledge Block.
    /// @param contentHash The keccak256 content hash to look up.
    function isRegistered(bytes32 contentHash) external view returns (bool) {
        return knowledgeBlocks[contentHash].exists;
    }

    /// @notice Returns the curator address for a registered KB.
    /// @param contentHash The KB content hash.
    /// @return The curator's wallet address.
    function getCurator(bytes32 contentHash) external view returns (address) {
        if (!knowledgeBlocks[contentHash].exists) revert KBNotRegistered();
        return knowledgeBlocks[contentHash].curator;
    }

    /// @notice Returns the full KnowledgeBlock struct for a registered KB.
    /// @param contentHash The KB content hash.
    function getKnowledgeBlock(bytes32 contentHash)
        external view kbExists(contentHash) returns (KnowledgeBlock memory)
    { return knowledgeBlocks[contentHash]; }

    /// @notice Returns all AttributionLink edges for a KB (the on-chain royalty DAG).
    /// @param contentHash The KB content hash.
    function getAttributionDAG(bytes32 contentHash)
        external view kbExists(contentHash) returns (AttributionLink[] memory)
    { return attributionDAG[contentHash]; }

    /// @notice Returns the StakeRecord (amount, lockedUntil, slashed) for a KB.
    /// @param contentHash The KB content hash.
    function getStake(bytes32 contentHash)
        external view kbExists(contentHash) returns (StakeRecord memory)
    { return stakes[contentHash]; }

    /// @notice Returns the ReputationRecord (queryVolume, endorsements, score) for a KB.
    /// @param contentHash The KB content hash.
    function getReputation(bytes32 contentHash)
        external view kbExists(contentHash) returns (ReputationRecord memory)
    { return reputation[contentHash]; }

    /// @notice Returns all KB content hashes published by a curator address.
    /// @param curator The curator wallet address.
    function getCuratorBlocks(address curator) external view returns (bytes32[] memory) {
        return curatorBlocks[curator];
    }

    /// @notice Returns all KB content hashes registered under a given KBType.
    /// @param kbType The KBType enum value to filter by.
    function getBlocksByType(KBType kbType) external view returns (bytes32[] memory) {
        return blocksByType[uint8(kbType)];
    }

    /// @notice Returns all KB content hashes for a given domain string.
    /// @dev The domain is keccak256-hashed to form the mapping key. Pass the exact domain string.
    /// @param domain The human-readable domain string (e.g. "software.security").
    function getBlocksByDomain(string calldata domain) external view returns (bytes32[] memory) {
        return blocksByDomain[keccak256(bytes(domain))];
    }

    /// @notice Returns all KB content hashes that cite `parentHash` as a direct attribution parent.
    /// @param parentHash The parent KB content hash.
    function getDerivedBlocks(bytes32 parentHash) external view returns (bytes32[] memory) {
        return derivedBlocks[parentHash];
    }

    /// @notice Returns true if `childHash` has `parentHash` as a direct attribution parent.
    /// @param childHash  The child KB content hash.
    /// @param parentHash The parent KB content hash to check.
    function isDerivedFrom(bytes32 childHash, bytes32 parentHash) external view returns (bool) {
        AttributionLink[] storage links = attributionDAG[childHash];
        for (uint256 i = 0; i < links.length; i++) {
            if (links[i].parentHash == parentHash) return true;
        }
        return false;
    }

    /// @notice Returns the curator and total parent share splits for a KB, in basis points.
    /// @param contentHash The KB content hash.
    /// @return curatorBps Basis points remaining for the curator after protocol and parent cuts.
    /// @return parentBps  Total basis points allocated to parent KBs in the attribution DAG.
    function getShareSplit(bytes32 contentHash)
        external view kbExists(contentHash)
        returns (uint256 curatorBps, uint256 parentBps)
    {
        AttributionLink[] storage links = attributionDAG[contentHash];
        uint256 total = 0;
        for (uint256 i = 0; i < links.length; i++) total += links[i].royaltyShareBps;
        uint256 afterProtocol = 10000 - protocolFeesBps;
        parentBps  = total;
        curatorBps = total >= afterProtocol ? 0 : afterProtocol - total;
    }

    // =========================================================================
    // V1 — ADMIN
    // =========================================================================

    /// @notice Update the protocol fee rate applied to every query settlement. Owner-only.
    /// @param bps New fee in basis points. Maximum 1000 (10%).
    function setProtocolFee(uint256 bps) external onlyOwner {
        if (bps > 1000) revert FeeTooHigh();
        protocolFeesBps = bps;
    }

    /// @notice Update the fraction of stake burned when a KB is slashed. Owner-only.
    /// @param bps New slash rate in basis points. Maximum 5000 (50%).
    function setSlashRate(uint256 bps) external onlyOwner {
        if (bps > 5000) revert SlashRateTooHigh();
        slashRateBps = bps;
    }

    /// @notice Update the minimum ETH stake required to publish a Knowledge Block. Owner-only.
    /// @param amount New minimum stake in wei.
    function setMinStake(uint256 amount) external onlyOwner { minStakeAmount = amount; }

    /// @notice Withdraw the accumulated treasury balance to a recipient address. Owner-only.
    /// @param to Recipient address. Must be non-zero.
    function withdrawTreasury(address payable to) external onlyOwner nonReentrant {
        if (to == address(0)) revert InvalidRecipient();
        uint256 amount = treasuryBalance;
        treasuryBalance = 0;
        (bool sent, ) = to.call{value: amount}("");
        if (!sent) revert TreasuryWithdrawFailed();
        emit TreasuryWithdrawn(to, amount);
    }

    // =========================================================================
    // INTERNAL
    // =========================================================================

    function _validateAttributionShares(
        bytes32 contentHash,
        AttributionLink[] calldata parents
    ) internal view {
        uint256 totalBps = 0;
        for (uint256 i = 0; i < parents.length; i++) {
            if (parents[i].parentHash == contentHash) revert NoSelfReference();
            if (!knowledgeBlocks[parents[i].parentHash].exists) revert ParentNotRegistered();
            for (uint256 j = i + 1; j < parents.length; j++) {
                if (parents[i].parentHash == parents[j].parentHash) revert DuplicateParent();
            }
            totalBps += parents[i].royaltyShareBps;
        }
        if (totalBps > 10000) revert SharesExceedDistributable();
    }

    /**
     * @dev Deterministic reputation formula. Anyone can verify off-chain.
     *      Delegates pure math to ReputationLogic library.
     *
     *   queryWeight       = min(500, queryVolume * 2)
     *   endorsementWeight = min(100, endorsements * 20)
     *   score             = min(1000, sum)
     */
    function _recomputeScore(bytes32 contentHash) internal {
        ReputationRecord storage r = reputation[contentHash];
        r.score       = ReputationLogic.computeScore(r.queryVolume, r.endorsements);
        r.lastUpdated = block.timestamp;
        emit ReputationUpdated(contentHash, r.score, r.queryVolume);
    }

    // =========================================================================
    // EXISTING FUNCTIONS (unchanged from original Asset system)
    // =========================================================================

    /// @notice Register a content-addressed asset with optional provenance parents (legacy Asset system).
    /// @param fingerprint  keccak256 content hash of the asset.
    /// @param cid          IPFS CID for the asset payload.
    /// @param license      License configuration for this asset.
    /// @param parents      Parent asset IDs for provenance tracking (empty array if none).
    /// @return assetId     The generated asset identifier (keccak256 of fingerprint + sender + timestamp).
    function registerAsset(bytes32 fingerprint, string memory cid, License memory license, bytes32[] memory parents)
        external returns (bytes32)
    {
        bytes32 assetId = keccak256(abi.encodePacked(fingerprint, msg.sender, block.timestamp));
        if (assets[assetId].timestamp != 0) revert AssetAlreadyExists();
        for (uint i = 0; i < parents.length; i++) {
            if (assets[parents[i]].timestamp == 0) revert ParentAssetNotFound();
            provenanceGraph[assetId].push(Provenance({ assetId: assetId, parentId: parents[i], depth: i, timestamp: block.timestamp }));
            emit DerivationRegistered(assetId, parents[i], i);
        }
        assets[assetId] = Asset({ fingerprint: fingerprint, cid: cid, creator: msg.sender, timestamp: block.timestamp, blockNumber: block.number, license: license, parents: parents, active: true });
        creatorAssets[msg.sender].push(assetId);
        emit AssetRegistered(assetId, fingerprint, cid, msg.sender, block.timestamp);
        return assetId;
    }

    /// @notice Returns all Provenance records for an asset (its derivation history).
    function getProvenance(bytes32 assetId) external view assetExists(assetId) returns (Provenance[] memory) { return provenanceGraph[assetId]; }
    /// @notice Returns the full Asset struct for a registered asset.
    function getAsset(bytes32 assetId) external view assetExists(assetId) returns (Asset memory) { return assets[assetId]; }
    /// @notice Returns true if the asset's stored fingerprint matches `claimedFingerprint`.
    function verifyAsset(bytes32 assetId, bytes32 claimedFingerprint) external view assetExists(assetId) returns (bool) { return assets[assetId].fingerprint == claimedFingerprint; }
    /// @notice Update the license configuration for an asset. Creator only.
    function updateLicense(bytes32 assetId, License memory newLicense) external assetExists(assetId) {
        if (assets[assetId].creator != msg.sender) revert OnlyCreator();
        if (!assets[assetId].active)               revert AssetInactive();
        assets[assetId].license = newLicense;
        emit LicenseUpdated(assetId, newLicense);
    }
    /// @notice Deactivate an asset (soft-delete, irreversible). Creator only.
    function deactivateAsset(bytes32 assetId) external assetExists(assetId) {
        if (assets[assetId].creator != msg.sender) revert OnlyCreator();
        assets[assetId].active = false;
    }
    /// @notice Returns all asset IDs registered by a creator address.
    function getCreatorAssets(address creator) external view returns (bytes32[] memory) { return creatorAssets[creator]; }
    /// @notice Returns true if `childId` is directly derived from `parentId` in the provenance graph.
    function isDerivedFromAsset(bytes32 childId, bytes32 parentId) external view returns (bool) {
        Provenance[] memory h = provenanceGraph[childId];
        for (uint i = 0; i < h.length; i++) if (h[i].parentId == parentId) return true;
        return false;
    }

    /// @notice Accepts direct ETH transfers, crediting the treasury balance.
    receive() external payable { treasuryBalance += msg.value; }

    // =========================================================================
    // ERC-165 + ERC-2981 (royalty metadata)
    // =========================================================================

    /// @dev ERC-2981 interfaceId = bytes4(keccak256("royaltyInfo(uint256,uint256)"))
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;
    /// @dev ERC-165 interfaceId = bytes4(keccak256("supportsInterface(bytes4)"))
    bytes4 private constant _INTERFACE_ID_ERC165  = 0x01ffc9a7;

    /**
     * @notice ERC-2981 royalty signal for marketplaces and royalty routers.
     * @dev Returns (owner, protocolFeesBps * salePrice / 10000).
     *      The full attribution DAG (multi-recipient, per-KB splits) is available via
     *      getAttributionDAG(contentHash) for integrations that want provenance-aware splits.
     *      tokenId is ignored — this contract is not an NFT; contentHash is the canonical key.
     */
    function royaltyInfo(uint256 /* tokenId */, uint256 salePrice)
        external view override returns (address receiver, uint256 royaltyAmount)
    {
        receiver      = owner();
        royaltyAmount = (salePrice * protocolFeesBps) / 10000;
    }

    /**
     * @notice ERC-165 interface detection.
     * @dev Supports ERC-165 (0x01ffc9a7) and ERC-2981 (0x2a55205a).
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == _INTERFACE_ID_ERC165
            || interfaceId == _INTERFACE_ID_ERC2981;
    }
}
