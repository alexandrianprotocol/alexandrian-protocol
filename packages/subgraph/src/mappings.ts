import { BigInt, Address, Bytes, log } from "@graphprotocol/graph-ts";

import {
  AgentRegistered as AgentRegisteredEvent,
  AttributionLinked as AttributionLinkedEvent,
  KBEndorsed as KBEndorsedEvent,
  KBPublished as KBPublishedEvent,
  KBSlashed as KBSlashedEvent,
  KBStaked as KBStakedEvent,
  KBUnstaked as KBUnstakedEvent,
  QuerySettled as QuerySettledEvent,
  ReputationUpdated as ReputationUpdatedEvent,
  RoyaltyPaid as RoyaltyPaidEvent,
} from "../generated/AlexandrianRegistryV2/AlexandrianRegistryV2";

import {
  Agent,
  KnowledgeBlock,
  ParentEdge,
  RoyaltyDistribution,
  Settlement,
  _Payer,
  _TxContext,
} from "../generated/schema";

// ── Constants ────────────────────────────────────────────────────────────────

const ZERO_ADDRESS = Address.fromString(
  "0x0000000000000000000000000000000000000000"
);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Load an existing KnowledgeBlock or create a zero-initialised stub.
 * Stubs occur when AttributionLinked / RoyaltyPaid reference a KB
 * before its KBPublished event (shouldn't happen on-chain, but safe).
 */
function loadOrCreateKB(contentHashHex: string): KnowledgeBlock {
  let kb = KnowledgeBlock.load(contentHashHex);
  if (kb == null) {
    kb = new KnowledgeBlock(contentHashHex);
    kb.contentHash = Bytes.fromHexString(contentHashHex); // 32-byte bytes32 stub
    kb.domain = "";
    kb.curator = ZERO_ADDRESS;
    kb.creator = ZERO_ADDRESS;
    kb.kbType = 0;
    kb.queryFee = BigInt.zero();
    kb.cid = "";
    kb.embeddingCid = "";
    kb.blockNumber = BigInt.zero();
    kb.publishLogIndex = BigInt.zero();
    kb.timestamp = BigInt.zero();
    kb.stakeAmount = BigInt.zero();
    kb.isSlashed = false;
    kb.reputationScore = 0;
    kb.queryVolume = BigInt.zero();
    kb.endorsementCount = BigInt.zero();
    kb.settlementCount = BigInt.zero();
    kb.totalSettledValue = BigInt.zero();
    kb.uniquePayerCount = BigInt.zero();
    kb.lastSettledAt = BigInt.zero();
    kb.childCount = 0;
    kb.lineageDepth = 0;
  }
  return kb as KnowledgeBlock;
}

// ── Event handlers ───────────────────────────────────────────────────────────

/**
 * KBPublished — creates the canonical KnowledgeBlock entity.
 * Records publishLogIndex and blockNumber required by TheGraphIndexerAdapter.
 */
export function handleKBPublished(event: KBPublishedEvent): void {
  let id = event.params.contentHash.toHex();
  let kb = loadOrCreateKB(id);

  kb.contentHash = event.params.contentHash;
  kb.domain = event.params.domain;
  kb.curator = event.params.curator;
  kb.creator = event.params.agent; // publishing agent wallet
  kb.kbType = event.params.kbType;
  kb.queryFee = event.params.queryFee;
  kb.cid = event.params.cid;
  kb.embeddingCid = event.params.embeddingCid;
  kb.blockNumber = event.block.number;
  kb.publishLogIndex = event.logIndex;
  kb.timestamp = event.params.timestamp;

  kb.save();
}

/**
 * AttributionLinked — creates a ParentEdge in the lineage DAG.
 * Increments parent.childCount and propagates lineageDepth to child.
 */
export function handleAttributionLinked(event: AttributionLinkedEvent): void {
  let parentHex = event.params.parent.toHex();
  let childHex = event.params.child.toHex();
  let edgeId = parentHex + "-" + childHex;

  let edge = new ParentEdge(edgeId);
  edge.parent = parentHex;
  edge.child = childHex;
  edge.royaltyShareBps = event.params.bps;
  edge.relationshipType = event.params.relationship.toHexString();
  edge.blockNumber = event.block.number;
  edge.logIndex = event.logIndex;
  edge.save();

  // Update parent childCount
  let parentKb = loadOrCreateKB(parentHex);
  parentKb.childCount = parentKb.childCount + 1;
  parentKb.save();

  // Propagate lineageDepth: child.lineageDepth = max(current, parent.lineageDepth + 1)
  let childKb = loadOrCreateKB(childHex);
  let candidateDepth = parentKb.lineageDepth + 1;
  if (candidateDepth > childKb.lineageDepth) {
    childKb.lineageDepth = candidateDepth;
  }
  childKb.save();
}

/**
 * KBStaked — increments stakeAmount for the KB.
 */
export function handleKBStaked(event: KBStakedEvent): void {
  let kb = loadOrCreateKB(event.params.contentHash.toHex());
  kb.stakeAmount = kb.stakeAmount.plus(event.params.amount);
  kb.save();
}

/**
 * KBUnstaked — decrements stakeAmount (floor at zero).
 */
export function handleKBUnstaked(event: KBUnstakedEvent): void {
  let kb = loadOrCreateKB(event.params.contentHash.toHex());
  let updated = kb.stakeAmount.minus(event.params.amount);
  kb.stakeAmount = updated.lt(BigInt.zero()) ? BigInt.zero() : updated;
  kb.save();
}

/**
 * KBSlashed — marks KB as slashed.
 */
export function handleKBSlashed(event: KBSlashedEvent): void {
  let kb = loadOrCreateKB(event.params.contentHash.toHex());
  kb.isSlashed = true;
  kb.save();
}

/**
 * QuerySettled — creates a Settlement and materialises derived KB signals.
 * Stores a _TxContext so RoyaltyPaid handlers can link back to this settlement.
 */
export function handleQuerySettled(event: QuerySettledEvent): void {
  let contentHashHex = event.params.contentHash.toHex();
  let settlementId =
    event.transaction.hash.toHex() + "-" + event.logIndex.toString();

  // Create Settlement entity
  let settlement = new Settlement(settlementId);
  settlement.txHash = event.transaction.hash;
  settlement.blockNumber = event.block.number;
  settlement.logIndex = event.logIndex;
  settlement.timestamp = event.block.timestamp;
  settlement.value = event.params.totalFee;
  settlement.protocolFee = event.params.protocolFee;
  settlement.queryNonce = event.params.queryNonce;
  settlement.kb = contentHashHex;
  settlement.payer = event.params.querier;
  settlement.save();

  // Store tx → settlement mapping for RoyaltyPaid correlation
  let txCtx = new _TxContext(event.transaction.hash.toHex());
  txCtx.settlementId = settlementId;
  txCtx.save();

  // Update KB materialised signals
  let kb = loadOrCreateKB(contentHashHex);
  kb.settlementCount = kb.settlementCount.plus(BigInt.fromI32(1));
  kb.totalSettledValue = kb.totalSettledValue.plus(event.params.totalFee);
  kb.lastSettledAt = event.block.timestamp;

  // Unique payer tracking — only increment on first settlement from this address
  let payerId = contentHashHex + "-" + event.params.querier.toHex();
  if (_Payer.load(payerId) == null) {
    let payer = new _Payer(payerId);
    payer.save();
    kb.uniquePayerCount = kb.uniquePayerCount.plus(BigInt.fromI32(1));
  }

  kb.save();
}

/**
 * RoyaltyPaid — creates a RoyaltyDistribution linked to the current settlement.
 * Relies on _TxContext written by handleQuerySettled in the same tx.
 */
export function handleRoyaltyPaid(event: RoyaltyPaidEvent): void {
  let txCtx = _TxContext.load(event.transaction.hash.toHex());
  if (txCtx == null) {
    log.warning(
      "RoyaltyPaid without a matching QuerySettled in tx {} — skipping",
      [event.transaction.hash.toHex()]
    );
    return;
  }

  let contentHashHex = event.params.contentHash.toHex();
  let recipientHex = event.params.recipient.toHex();
  // Deterministic id: settlementId + recipient + parent KB
  let id = txCtx.settlementId + "-" + recipientHex + "-" + contentHashHex;

  let dist = new RoyaltyDistribution(id);
  dist.settlement = txCtx.settlementId;
  dist.kb = contentHashHex;
  dist.recipient = event.params.recipient;
  dist.amount = event.params.amount;
  dist.save();
}

/**
 * ReputationUpdated — syncs reputationScore and queryVolume from on-chain event.
 */
export function handleReputationUpdated(event: ReputationUpdatedEvent): void {
  let kb = loadOrCreateKB(event.params.contentHash.toHex());
  kb.reputationScore = event.params.newScore;
  // queryVolume is uint32 in Solidity; BigInt.fromI32 handles values up to 2^31-1.
  // For larger values the on-chain ReputationUpdated event will cap before overflow.
  kb.queryVolume = event.params.queryVolume;
  kb.save();
}

/**
 * KBEndorsed — increments endorsementCount.
 */
export function handleKBEndorsed(event: KBEndorsedEvent): void {
  let kb = loadOrCreateKB(event.params.contentHash.toHex());
  kb.endorsementCount = kb.endorsementCount.plus(BigInt.fromI32(1));
  kb.save();
}

/**
 * AgentRegistered — creates or overwrites the Agent entity.
 */
export function handleAgentRegistered(event: AgentRegisteredEvent): void {
  let id = event.params.agent.toHex();
  let agent = Agent.load(id);
  if (agent == null) {
    agent = new Agent(id);
  }
  agent.role = event.params.role;
  agent.operator = event.params.operator;
  agent.registeredAt = event.block.timestamp;
  agent.blockNumber = event.block.number;
  agent.save();
}
