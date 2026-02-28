/**
 * Alexandrian Protocol — Knowledge Block Schema Definitions
 * Version: 1.0.0
 *
 * All Knowledge Blocks extend the BaseKnowledgeBlock.
 * Each artifact type adds typed fields specific to its domain.
 *
 * Immutability guarantee: once registered on-chain, content_hash
 * anchors the entire structure. Any mutation produces a new KB
 * with a new registration and derivation link to the original.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ENUMERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export enum KBType {
  Practice = "practice",
  Feature = "feature",
  StateMachine = "state_machine",
  PromptEngineering = "prompt_engineering",
  ComplianceChecklist = "compliance_checklist",
  Rubric = "rubric",
}

export enum TrustTier {
  /** Human curator, staked, fully accountable */
  HumanStaked = "human_staked",
  /** Agent-derived from Tier 1 KBs, reputation-weighted */
  AgentDerived = "agent_derived",
  /** Agent-generated novel content, pending human endorsement */
  AgentDiscovered = "agent_discovered",
}

export enum KBLicenseType {
  QueryFee = "query_fee", // Pay per retrieval
  Subscription = "subscription", // Time-based access
  OpenAccess = "open_access", // Free, attribution required
  Restricted = "restricted", // Allowlist only
}

export enum SecurityClassification {
  Critical = "critical", // Directly impacts security posture
  High = "high", // Significant security implications
  Medium = "medium", // Moderate security implications
  Low = "low", // Minimal security implications
  None = "none", // No security relevance
}

export enum Severity {
  Critical = "critical",
  High = "high",
  Medium = "medium",
  Low = "low",
  Info = "info",
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

export interface CuratorIdentity {
  /** On-chain wallet address */
  address: string;
  /** Stake amount in protocol tokens */
  stake: bigint;
  /** Trust tier of this curator */
  tier: TrustTier;
  /** Cumulative reputation score (0–1000) */
  reputation_score: number;
}

export interface LicenseParams {
  type: KBLicenseType;
  /** Fee in protocol tokens per query (null if open_access) */
  query_fee: bigint | null;
  /** Attribution requirement text */
  attribution_required: boolean;
  /** Allowlisted agent addresses (null if unrestricted) */
  allowlist: string[] | null;
  /** License expiry unix timestamp (null if perpetual) */
  expires_at: number | null;
}

export interface AttributionLink {
  /** Content hash of the parent KB */
  parent_hash: string;
  /** On-chain KB ID of the parent */
  parent_id: string;
  /** Proportion of query fee routed to this parent (0–1, must sum to ≤1) */
  royalty_share: number;
  /** Nature of the derivation */
  relationship: "derived_from" | "extends" | "contradicts" | "validates";
}

export interface QualityScore {
  /** Overall computed score (0–100) */
  overall: number;
  /** Query volume contributing to score */
  query_volume: number;
  /** Ratio of positive downstream outcomes (0–1) */
  outcome_signal: number;
  /** Human endorsements count */
  endorsements: number;
  /** Last score computation unix timestamp */
  computed_at: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// BASE KNOWLEDGE BLOCK
// ─────────────────────────────────────────────────────────────────────────────

export interface BaseKnowledgeBlock {
  /** Unique on-chain identifier */
  id: string;
  /** SHA-256 hash of canonical serialized content — immutability anchor */
  content_hash: string;
  /** KB artifact type */
  type: KBType;
  /** Curator cryptographic identity and stake */
  curator: CuratorIdentity;
  /** Domain classification (e.g. "software.security", "software.patterns") */
  domain: string;
  /** Human-readable title */
  title: string;
  /** Concise description of what this KB contains */
  description: string;
  /** Canonical content — the actual knowledge payload */
  content: string;
  /** Programmatic license terms */
  license: LicenseParams;
  /** Derivation links to parent KBs */
  attribution: AttributionLink[];
  /** Reference to semantic embedding stored on IPFS */
  embedding_cid: string;
  /** Content storage CID on IPFS/Filecoin */
  content_cid: string;
  /** Reputation-weighted quality signal */
  quality: QualityScore;
  /** Semantic tags for retrieval routing */
  tags: string[];
  /** Unix timestamp of on-chain registration */
  registered_at: number;
  /** Semver string — new version = new KB + attribution link to previous */
  version: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PRACTICE BLOCK
//    A verified, versioned engineering practice with rationale, conditions,
//    applicable contexts, and known failure modes.
// ─────────────────────────────────────────────────────────────────────────────

export interface FailureMode {
  description: string;
  severity: Severity;
  /** Conditions that trigger this failure */
  trigger: string;
  /** How to detect it has occurred */
  detection: string;
  /** Recommended mitigation */
  mitigation: string;
}

export interface ApplicableContext {
  /** Programming language (null = language-agnostic) */
  language: string | null;
  /** Framework or runtime (null = framework-agnostic) */
  framework: string | null;
  /** Semver range where this practice applies (e.g. ">=18.0.0") */
  version_range: string | null;
  /** Environmental constraints (e.g. "serverless", "high-concurrency") */
  environment: string[];
}

export interface PracticeBlock extends BaseKnowledgeBlock {
  type: KBType.Practice;

  /** The core recommendation — what to do */
  recommendation: string;
  /** The reasoning — why this is the correct approach */
  rationale: string;
  /** Conditions under which this practice applies */
  applicable_contexts: ApplicableContext[];
  /** Conditions under which this practice should NOT be used */
  contraindications: string[];
  /** Security classification of this practice */
  security_classification: SecurityClassification;
  /** Known failure modes if practice is applied incorrectly */
  failure_modes: FailureMode[];
  /** Concrete implementation examples */
  examples: {
    title: string;
    code: string;
    language: string;
    notes: string;
  }[];
  /** Authoritative source citations */
  citations: {
    title: string;
    url: string;
    accessed_at: number;
  }[];
  /** Related KB IDs for cross-referencing */
  related_kbs: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FEATURE BLOCK
//    An opinionated, parameterized feature specification an AI agent
//    can retrieve and act on directly. Not documentation — a deployable intent.
// ─────────────────────────────────────────────────────────────────────────────

export interface ParameterSpec {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default_value?: unknown;
  validation_rules: string[];
}

export interface EdgeCase {
  scenario: string;
  expected_behavior: string;
  severity: Severity;
  test_hint: string;
}

export interface FeatureBlock extends BaseKnowledgeBlock {
  type: KBType.Feature;

  /** Interface contract — inputs and outputs */
  interface: {
    inputs: ParameterSpec[];
    outputs: ParameterSpec[];
    side_effects: string[];
  };
  /** Ordered acceptance criteria — what "done" means */
  acceptance_criteria: string[];
  /** Opinionated implementation approach */
  implementation_pattern: string;
  /** Non-functional requirements */
  constraints: {
    performance: string[];
    security: string[];
    scalability: string[];
  };
  /** Known edge cases that must be handled */
  edge_cases: EdgeCase[];
  /** Reference to a Rubric Block KB ID for evaluation */
  rubric_kb_id: string | null;
  /** Reference IDs to Practice Blocks this feature depends on */
  depends_on_practices: string[];
  /** Test scaffold — hints for generating a test suite */
  test_scaffold: {
    unit_test_cases: string[];
    integration_test_cases: string[];
    adversarial_test_cases: string[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STATE MACHINE BLOCK
//    A curated, validated state machine an agent can instantiate.
//    Encodes the edge cases only practitioners who have shipped it know.
// ─────────────────────────────────────────────────────────────────────────────

export interface SMState {
  id: string;
  label: string;
  description: string;
  /** Is this a valid terminal state */
  is_terminal: boolean;
  /** Invariants that must hold while in this state */
  invariants: string[];
  /** Allowed actions while in this state */
  allowed_actions: string[];
}

export interface SMTransition {
  id: string;
  from_state: string;
  to_state: string;
  /** Event or action that triggers this transition */
  trigger: string;
  /** Conditions that must be true for the transition to fire */
  guards: string[];
  /** Side effects executed when transition fires */
  side_effects: string[];
  /** Compensation actions if side effects must be rolled back */
  compensation: string[];
}

export interface StateMachineBlock extends BaseKnowledgeBlock {
  type: KBType.StateMachine;

  /** All valid states */
  states: SMState[];
  /** All valid transitions */
  transitions: SMTransition[];
  /** The initial state ID */
  initial_state: string;
  /** Terminal state IDs */
  terminal_states: string[];
  /** State combinations that must never occur */
  invalid_state_declarations: string[];
  /** System-wide invariants that must hold across all states */
  global_invariants: string[];
  /** Context/data shape passed through the machine */
  context_schema: Record<string, unknown>;
  /** Known real-world failure patterns for this machine type */
  known_failure_patterns: FailureMode[];
  /** Whether this machine supports composition with other state machines */
  composable: boolean;
  /** IDs of compatible State Machine Blocks for composition */
  composable_with: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PROMPT ENGINEERING BLOCK
//    Curated, tested prompt patterns with known failure modes and
//    evaluation criteria. Versioned against model releases.
// ─────────────────────────────────────────────────────────────────────────────

export interface ModelCompatibility {
  provider: string;
  model_family: string;
  /** Semver-style version range (e.g. "gpt-4-*", "model-*") */
  version_pattern: string;
  /** Validated performance on this model (0–1) */
  validated_performance: number;
}

export interface PromptEngineeringBlock extends BaseKnowledgeBlock {
  type: KBType.PromptEngineering;

  /** The prompt template with {variable} placeholders */
  template: string;
  /** Variables the template accepts */
  variables: ParameterSpec[];
  /** System prompt if applicable */
  system_prompt: string | null;
  /** Technique used (e.g. "chain-of-thought", "few-shot", "self-consistency") */
  technique: string;
  /** Task category this prompt is designed for */
  task_category: string;
  /** Models this prompt has been validated against */
  model_compatibility: ModelCompatibility[];
  /** Required context for this prompt to function correctly */
  context_requirements: string[];
  /** Measured failure modes with reproduction conditions */
  failure_modes: FailureMode[];
  /** How to evaluate prompt output quality */
  evaluation_criteria: {
    dimension: string;
    measurement: string;
    passing_threshold: string;
  }[];
  /** Concrete worked examples */
  examples: {
    input_values: Record<string, string>;
    expected_output: string;
    notes: string;
  }[];
  /** Model version this prompt was last validated against */
  validated_on_model_version: string;
  /** Unix timestamp of last validation */
  last_validated_at: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. COMPLIANCE CHECKLIST BLOCK
//    Machine-executable compliance requirements derived from regulatory
//    sources with citations, jurisdiction tags, and exception handling.
// ─────────────────────────────────────────────────────────────────────────────

export interface ComplianceRequirement {
  id: string;
  description: string;
  /** The specific regulation article or section */
  regulatory_reference: string;
  /** Pass/fail evaluation criteria */
  pass_criteria: string;
  /** Conditions under which this requirement is exempt */
  exception_conditions: string[];
  /** What evidence satisfies this requirement */
  evidence_mapping: string[];
  severity: Severity;
  /** Whether this requirement is automatically verifiable */
  automatable: boolean;
  /** Implementation guidance */
  implementation_notes: string;
}

export interface ComplianceChecklistBlock extends BaseKnowledgeBlock {
  type: KBType.ComplianceChecklist;

  /** The regulation or standard this checklist covers */
  regulation: string;
  /** Jurisdictions where this checklist applies */
  jurisdictions: string[];
  /** Version of the regulation this checklist is derived from */
  regulation_version: string;
  /** Ordered list of compliance requirements */
  requirements: ComplianceRequirement[];
  /** Decision tree for determining applicability */
  applicability_criteria: string[];
  /** Exceptions that modify the checklist */
  global_exceptions: string[];
  /** Authoritative regulatory sources */
  regulatory_sources: {
    title: string;
    url: string;
    version: string;
    accessed_at: number;
  }[];
  /** Unix timestamp when this checklist was last verified against regulation */
  last_verified_at: number;
  /** Human expert who verified this checklist (curator identity shorthand) */
  verified_by: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. RUBRIC BLOCK
//    A structured evaluation framework agents apply to their own
//    or other agents' outputs. Enables self-assessment without
//    hallucinating judgment.
// ─────────────────────────────────────────────────────────────────────────────

export interface RubricDimension {
  id: string;
  name: string;
  description: string;
  /** Weight of this dimension in the overall score (0–1, all must sum to 1) */
  weight: number;
  /** Ordered scoring levels from lowest to highest */
  scoring_levels: {
    score: number;
    label: string;
    criteria: string;
  }[];
  /** Conditions that automatically fail this dimension regardless of score */
  disqualifying_conditions: string[];
  /** Whether this dimension can be evaluated programmatically */
  automatable: boolean;
  /** Guidance for automated evaluation */
  automation_hints: string | null;
}

export interface RubricBlock extends BaseKnowledgeBlock {
  type: KBType.Rubric;

  /** The type of output this rubric evaluates */
  evaluates: string;
  /** Domain this rubric applies to */
  evaluation_domain: string;
  /** Scoring dimensions */
  dimensions: RubricDimension[];
  /** Minimum overall score to pass (0–100) */
  passing_threshold: number;
  /** Conditions that fail the entire evaluation regardless of scores */
  global_disqualifiers: string[];
  /** How to aggregate dimension scores into overall score */
  aggregation_method: "weighted_average" | "minimum" | "custom";
  /** Custom aggregation logic if aggregation_method is "custom" */
  aggregation_formula: string | null;
  /** Concrete evaluation examples */
  examples: {
    input_description: string;
    dimension_scores: Record<string, number>;
    overall_score: number;
    pass: boolean;
    notes: string;
  }[];
  /** Reference to Feature Block KB IDs this rubric evaluates */
  evaluates_feature_kb_ids: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DERIVED BLOCK — Deterministic Synthesis (Strict Schema-Preserving Composition)
// ─────────────────────────────────────────────────────────────────────────────

/** Input reference: which parent KB and which selectors (e.g. ["payload.states", "payload.invariants"]). */
export interface DerivationInput {
  kbId: string;
  selectors: string[];
}

/** Derivation recipe — how parents were combined. */
export interface DerivationInfo {
  type: "compose" | "transform" | "extract" | "summarize";
  parents: string[];
  inputs: DerivationInput[];
  recipe: Record<string, unknown>;
}

/**
 * DerivedBlock: first-class object for deterministic synthesis.
 * The resulting payload MUST conform to one of the 6 v1 schemas (Executable Constraint).
 * kbId = CID(SHA256(JCS(Envelope))) — envelope includes parents, derivationType, inputs, payload.
 *
 * Use with sdk.publishDerived() which handles lexicographical parent sorting and CID derivation.
 */
export interface DerivedBlockInput {
  domain: string;
  derivation: DerivationInfo;
  /** Result MUST match one of the 6 v1 schemas (practice, feature, stateMachine, etc.) */
  payload:
    | PracticeBlock
    | FeatureBlock
    | StateMachineBlock
    | PromptEngineeringBlock
    | ComplianceChecklistBlock
    | RubricBlock;
}

// ─────────────────────────────────────────────────────────────────────────────
// UNION TYPE — all v1 Knowledge Block types
// ─────────────────────────────────────────────────────────────────────────────

export type KnowledgeBlock =
  | PracticeBlock
  | FeatureBlock
  | StateMachineBlock
  | PromptEngineeringBlock
  | ComplianceChecklistBlock
  | RubricBlock;

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface KBRegistrationRequest {
  block: KnowledgeBlock;
  /** Curator wallet signature over content_hash */
  signature: string;
  /** Protocol token stake amount */
  stake: bigint;
}

export interface KBRegistrationResult {
  id: string;
  content_hash: string;
  registered_at: number;
  tx_hash: string;
}

export interface KBQuery {
  /** Natural language or structured intent */
  intent: string;
  /** KB type filter */
  type?: KBType;
  /** Domain filter */
  domain?: string;
  /** Tag filters */
  tags?: string[];
  /** Minimum quality score (0–100) */
  min_quality?: number;
  /** Minimum trust tier */
  min_trust_tier?: TrustTier;
  /** Maximum fee willing to pay per query in protocol tokens */
  max_fee?: bigint;
  /** Requesting agent wallet address */
  agent_address: string;
}

export interface KBQueryResult {
  block: KnowledgeBlock;
  /** Relevance score for this query (0–1) */
  relevance: number;
  /** Fee charged for this retrieval in protocol tokens */
  fee_charged: bigint;
  /** Settlement transaction hash */
  settlement_tx: string;
}
