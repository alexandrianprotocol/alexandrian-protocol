/**
 * Web3 & Onchain Engineering Seeds (~90 seed procedures).
 * Smart contract architecture, storage layout, gas optimization, upgrade patterns,
 * security, token standards, event indexing, oracle design, account abstraction, cross-chain.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Smart contract architecture (10) */
const CONTRACT_ARCHITECTURE: SeedSpec[] = [
  { domain: "web3.contract.architecture", title: "Designing smart contract system architecture with separated concerns", concept: C("separate storage, logic, and access control contracts; minimize coupling; define interface boundaries") },
  { domain: "web3.contract.architecture", title: "Designing upgradeable contract architectures", concept: C("UUPS: logic contract with _authorizeUpgrade; Transparent: admin-proxy separation; Beacon: shared impl for clones") },
  { domain: "web3.contract.architecture", title: "Implementing factory contract patterns for clone deployment", concept: C("ERC-1167 minimal proxy; clone from implementation; initialize via initdata; cheaper than full deploy") },
  { domain: "web3.contract.architecture", title: "Designing diamond proxy contract architectures", concept: C("EIP-2535: facets per feature; DiamondStorage; loupe functions; selector routing") },
  { domain: "web3.contract.architecture", title: "Designing pull-payment settlement architectures", concept: C("accumulate in pendingWithdrawals[]; caller pulls via withdraw(); prevents reentrancy and push failures") },
  { domain: "web3.contract.architecture", title: "Designing access control systems for multi-role contracts", concept: C("OpenZeppelin AccessControl: role bytes32; grantRole/revokeRole; onlyRole modifier per function") },
  { domain: "web3.contract.architecture", title: "Designing pausable contract architectures", concept: C("Pausable mixin; pause/unpause by owner or guardian; whenNotPaused on state-modifying functions") },
  { domain: "web3.contract.architecture", title: "Designing governance-controlled contract parameter systems", concept: C("admin setter with event; timelock for sensitive params; param validation in setter") },
  { domain: "web3.contract.architecture", title: "Designing contract system versioning and migration", concept: C("registry maps name → address; upgrade registry atomically; emit VersionUpdated event") },
  { domain: "web3.contract.architecture", title: "Designing multi-contract interaction state machines", concept: C("define states and transitions; validate state in modifier; emit event on each transition") },
];

/** 2. Storage layout & gas optimization (10) */
const GAS_STORAGE: SeedSpec[] = [
  { domain: "web3.gas.storage_packing", title: "Optimizing storage slot packing in Solidity structs", concept: C("pack vars < 32 bytes into same slot; order by size descending; verify with storage layout tool") },
  { domain: "web3.gas.sstore", title: "Minimizing SSTORE costs by avoiding cold writes", concept: C("check if value changed before write; pack multiple flags into single slot; use transient storage for temps") },
  { domain: "web3.gas.calldata", title: "Optimizing calldata encoding for external function calls", concept: C("use bytes calldata for variable data; prefer uint256 over smaller uints in external params") },
  { domain: "web3.gas.events", title: "Using events to replace on-chain storage for queryable data", concept: C("emit event instead of storing non-critical data; index query-relevant fields; 375 gas per log") },
  { domain: "web3.gas.loops", title: "Optimizing gas in unbounded loop patterns", concept: C("cap iteration; paginate with cursor; move computation off-chain; use merkle proofs for membership") },
  { domain: "web3.gas.immutables", title: "Using immutable and constant variables for gas savings", concept: C("immutable for constructor-set; constant for compile-time; both avoid SLOAD; inline in bytecode") },
  { domain: "web3.gas.errors", title: "Using custom errors instead of revert strings for gas savings", concept: C("error CustomError(arg); revert CustomError(val); 4-byte selector vs string encoding") },
  { domain: "web3.gas.batch", title: "Designing batch operation patterns to amortize base gas", concept: C("multicall or loop in single tx; 21k base gas once; validate array length cap") },
  { domain: "web3.gas.assembly", title: "Using assembly for gas-critical operations in Solidity", concept: C("inline assembly for hash-and-return, tight loops; fuzz test output; document invariants") },
  { domain: "web3.gas.view_vs_write", title: "Separating view functions from state-mutating paths", concept: C("view: no state change, free off-chain; write: costs gas; never mix in same function") },
];

/** 3. Security patterns (10) */
const SECURITY: SeedSpec[] = [
  { domain: "web3.security.reentrancy", title: "Preventing reentrancy attacks using CEI pattern", concept: C("Checks → Effects → Interactions; update state before external call; ReentrancyGuard as backup") },
  { domain: "web3.security.access_control", title: "Auditing access control completeness in smart contracts", concept: C("every state-modifying function has role or owner check; test with unauthorized caller") },
  { domain: "web3.security.oracle_manipulation", title: "Defending against oracle price manipulation", concept: C("TWAP over N blocks; multi-source aggregation; max price deviation check; circuit breaker") },
  { domain: "web3.security.overflow", title: "Preventing integer overflow and underflow in Solidity", concept: C("Solidity 0.8+ reverts on overflow; use unchecked only for gas optimization with proven bounds") },
  { domain: "web3.security.signature", title: "Implementing secure signature verification with EIP-712", concept: C("typed data hash; domain separator includes chainId and contract address; recover signer; check nonce") },
  { domain: "web3.security.front_running", title: "Mitigating front-running and MEV attacks in protocols", concept: C("commit-reveal; time-weighted pricing; slippage tolerance; private mempool for sensitive ops") },
  { domain: "web3.security.flash_loan", title: "Designing flash loan attack defenses in DeFi contracts", concept: C("spot price manipulation defense: TWAP; reentrancy guard; balance check before and after in same block") },
  { domain: "web3.security.dos", title: "Preventing denial-of-service attacks in smart contracts", concept: C("cap array lengths; pull over push; avoid external calls in loops; gas limit on loops") },
  { domain: "web3.security.upgrade_auth", title: "Securing upgrade authority in proxy contracts", concept: C("two-step ownership transfer; timelock on upgrade; multisig as upgrader; emit UpgradeScheduled event") },
  { domain: "web3.security.invariant_testing", title: "Designing invariant testing suites for smart contracts", concept: C("stateful fuzzing (Echidna/Foundry); assert protocol invariants after every call; ghost variables") },
];

/** 4. Token standards (8) */
const TOKEN_STANDARDS: SeedSpec[] = [
  { domain: "web3.token.erc20", title: "Implementing ERC-20 token extensions safely", concept: C("permit (EIP-2612); snapshot; votes; cap; use OpenZeppelin base; override only as needed") },
  { domain: "web3.token.erc721", title: "Designing gas-efficient ERC-721 NFT contracts", concept: C("ERC721A for batch mint; lazy reveal with base URI; royalties via EIP-2981") },
  { domain: "web3.token.erc1155", title: "Designing ERC-1155 multi-token contracts for gaming or editions", concept: C("batch mint/transfer; fungible + non-fungible in one contract; metadata per tokenId") },
  { domain: "web3.token.soulbound", title: "Implementing soulbound (non-transferable) token patterns", concept: C("override transfer to revert except mint; allow burn; use for credentials or attestations") },
  { domain: "web3.token.staking", title: "Designing token staking and reward distribution contracts", concept: C("reward per share accumulator pattern; updateReward modifier; pull-based claim; handle fee-on-transfer") },
  { domain: "web3.token.vesting", title: "Implementing token vesting schedules in contracts", concept: C("cliff + linear vesting; releasable = min(elapsed/duration, 1) * total - released; pull claim") },
  { domain: "web3.token.bonding_curve", title: "Designing bonding curve token price mechanisms", concept: C("reserve ratio; buy/sell price from formula; slippage tolerance; reserve held in contract") },
  { domain: "web3.token.permit", title: "Implementing gasless approvals with EIP-2612 permit", concept: C("permit: owner signs {spender, value, nonce, deadline}; verifySignature; increment nonce; set allowance") },
];

/** 5. Event indexing & subgraph design (8) */
const INDEXING: SeedSpec[] = [
  { domain: "web3.indexing.events", title: "Designing contract event schemas for indexer compatibility", concept: C("emit events for every state change; index query fields; use indexed keyword for filter params") },
  { domain: "web3.indexing.subgraph", title: "Designing The Graph subgraph schemas for protocol data", concept: C("entity per core object; derived fields for aggregates; block handler for epoch events") },
  { domain: "web3.indexing.handler", title: "Implementing event handlers in subgraph mappings", concept: C("load or create entity; update fields; save; handle BigInt safely; avoid store calls in loops") },
  { domain: "web3.indexing.aggregates", title: "Designing aggregate entities for protocol analytics", concept: C("Protocol entity updated on every relevant event; dailySnapshot via entity ID = day number") },
  { domain: "web3.indexing.derived", title: "Designing derived field strategies in subgraph schemas", concept: C("@derivedFrom for reverse lookups; avoid storing both sides; query via derived field") },
  { domain: "web3.indexing.pagination", title: "Implementing GraphQL pagination for large entity sets", concept: C("use first + skip for small sets; cursor with id_gt for large; max 1000 per query") },
  { domain: "web3.indexing.reorg", title: "Handling blockchain reorgs in indexing pipelines", concept: C("use block confirmations before finalizing; subgraph handles reorgs automatically; custom indexer: tombstone on reorg") },
  { domain: "web3.indexing.offchain", title: "Designing off-chain indexing pipelines for onchain events", concept: C("poll events via eth_getLogs; store in Postgres; backfill from genesis; idempotent upsert by txHash+logIndex") },
];

/** 6. Oracle & external data (8) */
const ORACLES: SeedSpec[] = [
  { domain: "web3.oracle.price_feed", title: "Integrating Chainlink price feeds with staleness checks", concept: C("latestRoundData(); check updatedAt + maxStaleness; check answeredInRound == roundId; validate price > 0") },
  { domain: "web3.oracle.twap", title: "Implementing Uniswap V3 TWAP oracle for manipulation resistance", concept: C("observe N blocks; compute tick cumulative delta; divide by N; use as price; longer N = safer") },
  { domain: "web3.oracle.push", title: "Designing push oracle update mechanisms", concept: C("off-chain keeper reads external price; signs and submits; contract verifies signature; updates price") },
  { domain: "web3.oracle.pull", title: "Designing pull oracle patterns with cryptographic proofs", concept: C("user submits signed price proof with tx; contract verifies signature and timestamp; use if fresh") },
  { domain: "web3.oracle.aggregation", title: "Aggregating multiple oracle sources for robust pricing", concept: C("fetch N oracles; reject outliers by std dev; median or weighted average; revert if quorum not met") },
  { domain: "web3.oracle.randomness", title: "Integrating Chainlink VRF for verifiable randomness", concept: C("requestRandomWords; store requestId; fulfill in callback; use words for game/selection logic") },
  { domain: "web3.oracle.automation", title: "Designing Chainlink Automation for on-chain job scheduling", concept: C("implement checkUpkeep → performUpkeep; gas limit; use custom logic upkeep for complex conditions") },
  { domain: "web3.oracle.circuit_breaker", title: "Implementing price circuit breakers for oracle failures", concept: C("max deviation per block; pause protocol if price moves > threshold; admin resume with new oracle") },
];

/** 7. Account abstraction (8) */
const ACCOUNT_ABSTRACTION: SeedSpec[] = [
  { domain: "web3.aa.erc4337", title: "Designing ERC-4337 account abstraction architectures", concept: C("UserOperation → Bundler → EntryPoint.handleOps → Wallet.validateUserOp → execute") },
  { domain: "web3.aa.paymaster", title: "Implementing ERC-4337 paymaster contracts for gas sponsorship", concept: C("validatePaymasterUserOp: check allowance or signature; postOp: account for used gas; deposit in EntryPoint") },
  { domain: "web3.aa.session_keys", title: "Designing session key patterns for account abstraction wallets", concept: C("grant session key with scope (target, value limit, expiry); validate in validateUserOp; revoke on expiry") },
  { domain: "web3.aa.recovery", title: "Implementing social recovery for smart account wallets", concept: C("guardians list; threshold of guardian signatures to initiate recovery; timelock before recovery finalizes") },
  { domain: "web3.aa.batch", title: "Designing batched transaction execution in smart accounts", concept: C("executeBatch(targets, values, calldatas); atomic; revert all on any failure") },
  { domain: "web3.aa.signature", title: "Designing multi-signature validation in smart account wallets", concept: C("k-of-n signers; recover each signer; check set membership; validate in validateUserOp") },
  { domain: "web3.aa.bundler", title: "Designing bundler selection and failover strategies", concept: C("primary bundler + fallback; sendUserOperation with retry; validate simulation before submit") },
  { domain: "web3.aa.upgrade", title: "Designing upgradeable smart account architectures", concept: C("UUPS with _authorizeUpgrade gated to self; propose then execute with timelock; test upgrade path") },
];

/** 8. Cross-chain patterns (8) */
const CROSS_CHAIN: SeedSpec[] = [
  { domain: "web3.crosschain.message", title: "Designing cross-chain message passing architectures", concept: C("source emits event; relayer observes and submits to destination; destination verifies proof and executes") },
  { domain: "web3.crosschain.bridge_security", title: "Auditing cross-chain bridge security assumptions", concept: C("trust model: optimistic, ZK, or multisig; verify source finality before destination unlock; rate limit") },
  { domain: "web3.crosschain.token_bridge", title: "Designing lock-and-mint token bridge patterns", concept: C("lock on source; mint wrapped on destination; burn wrapped to unlock; validate canonical bridge") },
  { domain: "web3.crosschain.ccip", title: "Integrating Chainlink CCIP for cross-chain token transfers", concept: C("IRouterClient.ccipSend; fee in LINK or native; receive in ccipReceive; validate sender on destination") },
  { domain: "web3.crosschain.layerzero", title: "Designing LayerZero OApp patterns for cross-chain messaging", concept: C("OApp: endpoint.send in _send; _lzReceive for delivery; set trusted remotes; handle retry") },
  { domain: "web3.crosschain.state_sync", title: "Designing cross-chain state synchronization protocols", concept: C("source state root; merkle proof of value; destination verifies root from light client or oracle") },
  { domain: "web3.crosschain.idempotency", title: "Ensuring idempotent cross-chain message delivery", concept: C("unique messageId; store processed IDs; revert on duplicate; replay-safe execution") },
  { domain: "web3.crosschain.rollup", title: "Designing contracts for L1/L2 rollup bridge interactions", concept: C("L1→L2: inbox message; L2→L1: output root + withdrawal proof; finality window before L1 withdrawal") },
];

/** 9. DeFi protocol patterns (8) */
const DEFI: SeedSpec[] = [
  { domain: "web3.defi.amm", title: "Designing automated market maker pool architectures", concept: C("constant product x*y=k; virtual reserves; fee taken from input; LP token proportional to share") },
  { domain: "web3.defi.lending", title: "Designing lending protocol collateral and liquidation systems", concept: C("collateral factor; health factor = collateral value / borrow value; liquidate when HF < 1") },
  { domain: "web3.defi.liquidation", title: "Implementing efficient liquidation engine patterns", concept: C("keeper bot monitors health factor; liquidate partial for incentive; dutch auction fallback") },
  { domain: "web3.defi.yield", title: "Designing yield aggregator vault architectures", concept: C("ERC-4626 vault; strategy deposits to protocol; harvest compounds yield; share price increases") },
  { domain: "web3.defi.fee_distribution", title: "Implementing protocol fee distribution mechanisms", concept: C("fee accumulated in contract; snapshot shares at epoch; claim proportional; veToken boost") },
  { domain: "web3.defi.governance", title: "Designing on-chain governance with timelocked execution", concept: C("propose → vote → queue in timelock → execute; quorum and threshold; veto guardian") },
  { domain: "web3.defi.slippage", title: "Implementing slippage protection in swap contracts", concept: C("user sets minAmountOut; revert if actual output < min; calculate expected before submitting") },
  { domain: "web3.defi.eip4626", title: "Implementing ERC-4626 tokenized vault standard", concept: C("convertToShares/Assets formulas; deposit/mint/withdraw/redeem; totalAssets includes accrued yield") },
];

export const WEB3_ONCHAIN_SEED_SPECS: SeedSpec[] = [
  ...CONTRACT_ARCHITECTURE,
  ...GAS_STORAGE,
  ...SECURITY,
  ...TOKEN_STANDARDS,
  ...INDEXING,
  ...ORACLES,
  ...ACCOUNT_ABSTRACTION,
  ...CROSS_CHAIN,
  ...DEFI,
];
