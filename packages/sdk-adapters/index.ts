export { AlexandrianSDK } from "./client/AlexandrianSDK.js";
export * from "./client/AlexandrianSDK.js";
export { CanonicalMemoryAdapter, type CanonicalMemoryConfig } from "./lib/memory/index.js";
export * as Head from "./lib/head/index.js";
export {
  getStageEconomics,
  getStageFromEnv,
  type ProtocolStage,
  type StageEconomics,
} from "./lib/stage.js";
export {
  MAINNET_CHAIN_ID,
  MAINNET_EXPLORER_URL,
  MAINNET_REGISTRY_ADDRESS,
  MAINNET_SUBGRAPH_URL,
  getRegistryAddress,
} from "./lib/addresses.js";
export { getExplorerForChainId, getExplorerTxUrl } from "./lib/explorer.js";
export {
  ALEXANDRIAN_PROOF_SPEC_VERSION,
  buildProofSpecV1,
  canonicalProofBytes,
  computePayloadHash,
  computeProofHash,
  type ProofSpecPayload,
  type ProofSpecState,
  type ProofSpecV1,
} from "./lib/proof-spec.js";
export { PoolsClient, type PoolHead, type PoolGraph, type PoolGraphNode, type PoolGraphEdge } from "./lib/pools.js";
export { buildProof, verifyProof, type CanonicalProof, type CanonicalStatus } from "./lib/proof.js";
export { SubscriptionsClient, type PoolEvent, type PoolEventPayload } from "./lib/subscriptions.js";
export {
  AlexandrianClient,
  type PoolID,
  type VersionID,
  type TxHash,
  type PoolPolicy,
  type Version,
  type PoolProof,
} from "./lib/client.js";
export { canonicalizeContent, hashContent, hashText, type ContentPointer, type Receipt } from "./lib/utils.js";
export * from "./types/index.js";
export {
  EthersChainAdapter,
  EthersTransactionAdapter,
  HeadSourceStub,
  ContractHeadSource,
  SubgraphHeadSource,
  RegistryAdapterContract,
  TheGraphIndexerAdapter,
  type IndexerAdapter,
  ObservabilityAdapterStub,
  type ObservabilityAdapter,
  type ObservabilityEvent,
  MemoryAdapterStub,
  ProofAdapterStub,
  PoolsAdapterStub,
  RegistryAdapterStub,
  StorageAdapterStub,
  type ChainAdapter,
  type HeadSource,
  type TransactionAdapter,
  type MemoryAdapter,
  type ProofAdapter,
  type PoolsAdapter,
  type RegistryAdapter,
  type StorageAdapter,
} from "./lib/adapters/index.js";
export * as OpenAdapters from "./lib/adapters/open/index.js";

// ── Query Enhancement ─────────────────────────────────────────────────────────
export { enhanceQuery } from "./lib/enhanceQuery.js";
export type {
  EnhanceQueryOptions,
  EnhancedQuery,
  EnhanceDebugInfo,
  SelectedKB,
  SettlementPreview,
  KBType,
} from "./lib/enhanceQuery.js";
export {
  UpstashCacheAdapter,
  kbMetaKey,
  domainKey,
  domainTypeKey,
  enhanceCacheKey,
} from "./lib/adapters/upstash.js";

// ── Domain Inference ──────────────────────────────────────────────────────────
export { inferDomains, DOMAIN_RULES } from "./lib/inferDomains.js";
export type { DomainRule } from "./lib/inferDomains.js";

// ── 1-Line Client ─────────────────────────────────────────────────────────────
// `AlexandrianQueryClient` is the query-enhancement facade.
// `AlexandrianClient` (from lib/client.js, also exported above) is the ethers blockchain adapter.
export { alexandrian, AlexandrianQueryClient, PRESETS } from "./lib/alexandrian.js";
export type { AlexandrianEnhanceOptions, PresetName } from "./lib/alexandrian.js";

// ── Evaluation Mode ───────────────────────────────────────────────────────────
// Low-level entry point: `evaluateArtifact(artifact, mode, options?)` + `parseFindings(llmOutput)`
// High-level (preferred): `alexandrian.review()`, `.audit()`, `.compare()`, `.parseFindings()`
export { evaluateArtifact, parseFindings } from "./lib/evaluate.js";

// ── Citation Settlement ────────────────────────────────────────────────────────
// On-chain settlement helpers — optional, requires AlexandrianSDK + ethers Signer.
// `settleCitation(result, sdk)` — settle all KBs from an enhance/evaluation result.
// `settlementPreview(kbsUsed)` — dry-run fee calculation, no on-chain call.
export { settleCitation, settlementPreview } from "./lib/settle.js";
export type { SettleCitationOptions, SettleCitationResult } from "./lib/settle.js";
export type {
  EvaluationMode,
  EvaluationQuery,
  EvaluationOptions,
  EvaluationFinding,
  EvaluationChecklistItem,
  FindingSeverity,
  ParsedFindings,
} from "./lib/evaluate.js";

// ── Framework Adapters ────────────────────────────────────────────────────────
// LangChain — wraps enhanceQuery(), supports vector DB fallback/blend
export {
  AlexandrianRetriever,
} from "./lib/adapters/langchain.js";
export type {
  AlexandrianRetrieverOptions,
  LangChainDocument,
  LangChainBaseRetriever,
  MergeMode,
} from "./lib/adapters/langchain.js";

// LlamaIndex — maps SelectedKB → NodeWithScore, supports vector index fallback/blend
export {
  AlexandrianNodeRetriever,
} from "./lib/adapters/llamaindex.js";
export type {
  AlexandrianNodeRetrieverOptions,
  LlamaIndexNodeWithScore,
  LlamaIndexTextNode,
  LlamaIndexBaseRetriever,
  // MergeMode is the same union type in both adapters — import from langchain to avoid
  // a duplicate type export. LlamaIndex adapter re-declares it locally for its own docs.
} from "./lib/adapters/llamaindex.js";
