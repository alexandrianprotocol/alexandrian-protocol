/**
 * KBv2.4 Artifact Type Definitions
 *
 * Canonical field order (for readability and deterministic serialization):
 *   identity → claim → semantic → knowledge_inputs → reasoning →
 *   execution → validation → payload → evidence → provenance
 *
 * Hash boundary: all fields EXCEPT identity.kb_id (circular) and
 * provenance.author.address (filled at publish time).
 */

// ── Scalar union types ─────────────────────────────────────────────────────

/**
 * Epistemological dimension: what kind of knowledge (confidence weighting, inference style).
 * Three values only — enough for routing without ambiguous edge cases.
 */
export type EpistemicType = "declarative" | "procedural" | "evaluative";

/**
 * Functional KB type: how the knowledge is used (execution routing, composition).
 * Agents primarily use kb_type; epistemic_type informs confidence and style.
 */
export type KBType =
  | "procedure"
  | "pattern"
  | "invariant"
  | "constraint"
  | "evaluation"
  | "transformation"
  | "protocol"
  | "artifact_spec"
  | "context"
  | "anti_pattern"
  | "heuristic";

export type ArtifactStatus = "active" | "deprecated" | "draft";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert";

/** automatic = safe for autonomous execution; advisory = requires human review. */
export type ExecutionMode = "automatic" | "advisory";

export type DeterminismType = "deterministic" | "probabilistic" | "non-deterministic";

export type CompositionType =
  | "merge"
  | "extend"
  | "override"
  | "specialize"
  | "generalize";

export type ArtifactType =
  | "procedure"
  | "algorithm"
  | "explanation"
  | "template"
  | "checklist"
  | "reference";

/** inline = payload only in KB; ipfs = payload fetched from IPFS; url = external URL; hybrid = inline + references to IPFS modules via artifact_refs (seed-with-module). */
export type ArtifactLocation = "inline" | "ipfs" | "url" | "hybrid";

// ── Section interfaces ─────────────────────────────────────────────────────

/** Supported schema versions; v2.5 adds structured steps and cost_estimate. */
export type ArtifactSchemaVersion = "alexandrian.kb.v2.4" | "alexandrian.kb.v2.5";

export interface KBIdentity {
  /** Filled by builder after hashing — excluded from hash computation. */
  kb_id: string;
  /** Epistemological: declarative | procedural | evaluative. */
  epistemic_type: EpistemicType;
  /** Functional type for execution routing and interface contract. See EXECUTION-SEMANTICS.md. */
  kb_type: KBType;
  title: string;
  /** Semver string, e.g. "1.0.0" */
  version: string;
  status: ArtifactStatus;
  is_seed: boolean;
  schema: ArtifactSchemaVersion;
}

/**
 * Output shape for kb_type: "context". Context KBs activate knowledge clusters;
 * the indexer/agent consumes this structure to start reasoning chains.
 * Schema-level contract: context KB output is exactly this type.
 */
export interface ContextKBOutput {
  /** Ordered list of kb_id (or content-addressed hashes) to load for this context. */
  kb_ids: string[];
  /** Optional: KB IDs grouped by kb_type for agent routing (e.g. { "procedure": ["0x..."], "invariant": ["0x..."] }). */
  by_type?: Record<string, string[]>;
}

export interface KBClaim {
  statement: string;
  /**
   * null = unassessed (unknown weight); 0.0–1.0 = assessed confidence.
   * Agents must treat null as unknown, not high confidence.
   */
  confidence: number | null;
  falsifiable: boolean;
}

/** Helps agents choose artifacts by execution role (reasoning vs transformation vs evaluation vs validation). */
export type ExecutionClass = "reasoning" | "transformation" | "evaluation" | "validation";

export interface KBSemantic {
  summary: string;
  tags: string[];
  domain: string;
  difficulty: DifficultyLevel;
  /** Optional. Agent-oriented capabilities for retrieval (e.g. task_planning, goal_decomposition). Improves search beyond domain. */
  capabilities?: string[];
  /** Optional. Execution role so agents can pick artifacts faster (reasoning | transformation | evaluation | validation). */
  execution_class?: ExecutionClass;
  /**
   * Optional. Ontology concept_ids this KB references (e.g. UI_AUTH_LOGIN_FORM, API_PATTERN_REST_RESOURCE).
   * Enables routing and composition to use the Knowledge Ontology; if absent, concepts are inferred from domain.
   */
  concepts?: string[];
  /**
   * Optional. Ontology invariant_ids this KB enforces or references (e.g. INV_API_DETERMINISTIC_RESPONSE).
   * Enables composition and validation to align with the invariant registry.
   */
  invariants?: string[];
}

export interface KBInputRef {
  kb_id: string;
  /** e.g. "parent" | "reference" | "evidence" */
  role: string;
  /** Optional. What this parent contributed (for traceability and composition). */
  contribution?: string;
}

/**
 * The one reasoning transformation this derived KB applies to its parents.
 * Every non-seed artifact should introduce exactly one of these.
 * Enforces reasoning edges, not isolated nodes.
 */
export type DerivationTransformation =
  | "specialization"   // narrow the concept
  | "generalization"   // broaden the concept
  | "composition"      // combine two techniques (synthesis)
  | "adaptation"       // adapt to another context
  | "optimization"     // improve a method
  | "failure_mode"     // explain how something fails
  | "evaluation"       // measure whether something works
  | "variant";         // alternative formulation

export interface KBKnowledgeInputs {
  minimum_required: number;
  recommended: number;
  /** @deprecated Use transformation for derivation semantics. Keep for backward compatibility; new artifacts can set "merge". */
  composition_type: CompositionType;
  /** References to parent KBs used in derivation. Empty for seeds. Derived: exactly 2–3 parents. */
  used: KBInputRef[];
  /** For derived KBs only: the one transformation this artifact applies. */
  transformation?: DerivationTransformation;
}

/** One dependency in reasoning.requires; reason explains why the dependency exists. */
export interface KBRequiresEntry {
  kb_id: string;
  /** Optional. Why this KB is required (for reasoning engines and auditing). */
  reason?: string;
}

export interface KBReasoning {
  /** KBs this artifact logically depends on. Each entry may be kb_id string or { kb_id, reason? }. */
  requires: (string | KBRequiresEntry)[];
  /** kb_ids this KB contradicts or supersedes */
  contradicts: string[];
  /** kb_ids that are related but not required */
  related: string[];
}

/** Optional cost hints for agent strategy selection (v2.5). */
export interface CostEstimate {
  time_complexity?: string;
  expected_latency_ms?: number;
  expected_token_cost?: number;
  /** cheap | moderate | expensive */
  resource_class?: "cheap" | "moderate" | "expensive";
}

export interface KBExecution {
  /** 1–5, where 1 = community, 5 = audited */
  trust_tier: number;
  execution_mode: ExecutionMode;
  determinism: DeterminismType;
  idempotent: boolean;
  /** v2.5: optional cost hints for agent efficiency choices */
  cost_estimate?: CostEstimate;
  /** Optional: e.g. "tool:postgres_available", "permission:write_logs". Lets agents skip artifacts they can't satisfy. */
  preconditions?: string[];
}

/** One validation condition; optional id anchors it for machine comparison (e.g. parent_hash#cond_0). */
export interface KBValidationCondition {
  /** Optional. Stable identifier for cross-artifact comparison; can be content-addressed (e.g. kb_hash#cond_0). */
  id?: string;
  condition: string;
}

export interface KBValidation {
  /** Each item may be a string or { id?, condition }; id enables machine comparison across artifacts. */
  success_conditions: (string | KBValidationCondition)[];
  failure_conditions: (string | KBValidationCondition)[];
  metrics: string[];
}

export interface KBInterfaceParam {
  name: string;
  type: string;
  description: string;
  /** Optional default for parameters (v2.5). */
  default?: string | number | boolean;
}

export interface KBInterface {
  inputs: KBInterfaceParam[];
  outputs: KBInterfaceParam[];
  parameters: KBInterfaceParam[];
}

/** One step in a machine-executable procedure (v2.5). Enables dataflow and conditions. */
export interface StructuredStep {
  id: string;
  action: string;
  /** Names of inputs (interface inputs or previous step produces). */
  inputs?: string[];
  /** Names of outputs this step produces (feeds downstream steps or interface outputs). */
  produces?: string[];
  /** Optional guard; step runs when condition holds. */
  condition?: string;
  notes?: string;
}

/** v2.4: string steps. v2.5: structured steps for dataflow and composability. */
export type StepItem = string | StructuredStep;

export interface KBInlineArtifact {
  steps: StepItem[];
}

export interface KBPayload {
  artifact_type: ArtifactType;
  location: ArtifactLocation;
  interface: KBInterface;
  inline_artifact: KBInlineArtifact;
}

export interface KBEvidence {
  sources: string[];
  benchmarks: string[];
  notes: string;
}

export interface KBLineage {
  depth: number;
  parent_hash: string | null;
}

export interface KBAuthor {
  /** Filled at publish time — excluded from hash computation. Use "" in templates. */
  address: string;
}

export interface KBProvenance {
  author: KBAuthor;
  /** Basis points. 250 = 2.5%. Default for seeds. */
  royalty_bps: number;
  lineage: KBLineage;
}

// ── Reference artifacts (IPFS) ──────────────────────────────────────────────

/**
 * Reference to an external knowledge artifact (e.g. on IPFS).
 * Use for large structured reference knowledge (standards, UI patterns, design tokens)
 * so KB entries stay small and procedural; agents fetch the artifact when needed.
 * URI is typically ipfs://<CID> or a well-known id from the artifact registry.
 */
export interface ArtifactRef {
  /** Category of reference (e.g. ui_components, api_design_standards). */
  type: string;
  /** Location: ipfs://Qm... or registry id. */
  uri: string;
  /** Optional short label for display. */
  label?: string;
}

// ── Goal-directed knowledge routing (GDKR) ───────────────────────────────────

/**
 * Declares the state transition this artifact implements.
 * Enables goal-directed routing: agents query (current_state, desired_state)
 * and receive a minimal execution pipeline (shortest path through KBs).
 * Indexer builds a state graph; planner runs A* / Dijkstra.
 */
export interface StateTransition {
  /** State required before this artifact can run. */
  input_state: string;
  /** State produced after this artifact runs. */
  output_state: string;
}

// ── Top-level artifact ─────────────────────────────────────────────────────

/**
 * Full KBv2.4 artifact. Every field is mandatory — no omissions.
 *
 * Hash excludes:
 *  - identity.kb_id  (circular: it IS the hash)
 *  - provenance.author.address  (set at publish time; unknown at generation)
 */
export interface KBv24Artifact {
  identity: KBIdentity;
  claim: KBClaim;
  semantic: KBSemantic;
  knowledge_inputs: KBKnowledgeInputs;
  reasoning: KBReasoning;
  execution: KBExecution;
  validation: KBValidation;
  payload: KBPayload;
  evidence: KBEvidence;
  provenance: KBProvenance;
  /** Optional. When set, indexer can use artifact as an edge in goal-directed planning. */
  state_transition?: StateTransition;
  /**
   * Optional. References to IPFS (or registry) artifacts containing reference knowledge.
   * Use for standards, UI patterns, design tokens, etc. Do not embed long enumerations in the KB;
   * store them in artifacts and reference here so agents can fetch when needed.
   */
  artifact_refs?: ArtifactRef[];
  /**
   * Optional. Narrative layer (semantic compression): purpose, design rationale, context.
   * Recommended for seeds and high-value anchors; optional for standard artifacts.
   * Keeps machine-readable core small while preserving human explanations for generation.
   */
  narrative?: KBNarrative;
}

/** Optional narrative block for seeds/anchors: purpose, rationale, context (dual-layer with semantic core). */
export interface KBNarrative {
  purpose?: string;
  design_rationale?: string;
  context?: string;
}

// ── Agent Retrieval Artifact (ARA) — alexandrian.kb.agent.v1 ─────────────────

/**
 * Compressed artifact for fast capability discovery (~80–200 bytes).
 * Indexer stores this; agents rank by capability/cost then fetch full artifact from IPFS if needed.
 * Deterministically derived from full artifact — no drift.
 */
export interface AgentRetrievalArtifact {
  schema: "alexandrian.kb.agent.v1";
  /** artifact hash (identity.kb_id) */
  h: string;
  /** capabilities: domain, tags, and semantic.capabilities for retrieval */
  cap: string[];
  /** input names from payload.interface.inputs */
  i: string[];
  /** output names from payload.interface.outputs */
  o: string[];
  /** estimated token cost (execution.cost_estimate.expected_token_cost) */
  t: number;
  /** number of parents (knowledge_inputs.used.length) */
  p: number;
  /** domain (semantic.domain) */
  d: string;
  /** Goal-directed routing: state transition (input_state → output_state). Present when artifact has state_transition. */
  st?: { i: string; o: string };
  /** Optional. execution_class for fast filtering (reasoning | transformation | evaluation | validation). */
  ec?: ExecutionClass;
  /** Epistemic type for GetByType(epistemic_type, kb_type, domain). */
  et?: EpistemicType;
  /** KB type for compound index and type-specific routing. */
  kt?: KBType;
}
