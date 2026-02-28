/**
 * Alexandrian Protocol — Canonical Envelope & Metadata Separation
 *
 * Content-addressed infrastructure: the hash preimage contains NO timestamp
 * and NO signature. Same content + same lineage → same kbId regardless of
 * curator or registration time.
 *
 * IPFS storage layer:
 * - Canonical Envelope: JCS-serialized payload (hashed → contentHash / CIDv1).
 * - Signed Metadata: timestamp, signature, envelopeCid (linked but distinct).
 */

/** KB type for canonical envelope (camelCase in serialized form). */
export type CanonicalKBType =
  | "practice"
  | "feature"
  | "stateMachine"
  | "promptEngineering"
  | "complianceChecklist"
  | "rubric"
  | "synthesis"
  | "pattern"
  | "adaptation"
  | "enhancement"
  | "factual"
  | "derived"
  | "procedure"
  | "toolDefinition"
  | "codebank"
  | "researchArtifact"
  | "knowledgeGraph"
  | "agentMemory"
  | "evaluation"
  | "capability"
  | "agentIdentity"
  | "demandBeacon"
  | "hypothesis"
  | "inquiry"
  | "beliefUpdate"
  | "reasoningChain"
  | "collaboration"
  | "knowledgeGap"
  | "agentManifest"
  | "protocolEndorsement";

export type TierLevel = "open" | "verified" | "premium" | "restricted";

/** Method of deterministic synthesis. */
export type DerivationType = "compose" | "transform" | "extract" | "summarize";

/** Selectors point to specific fields or segments used from a source (e.g. ["payload.states", "payload.invariants"]). */
export interface CanonicalDerivationInput {
  kbId: string;
  selectors: string[];
}

/** Derivation metadata — the intellectual recipe. Included in hash preimage for reproducibility. */
export interface CanonicalDerivation {
  type: DerivationType;
  inputs: CanonicalDerivationInput[];
  /** Deterministic transformation parameters (object keys sorted in JCS) */
  recipe: Record<string, unknown>;
}

/**
 * Canonical envelope: the object that is JCS-serialized and hashed.
 * All keys camelCase. No timestamp, no signature.
 * sources MUST be sorted before hashing (use sortSources()).
 *
 * When derivation is present, this is a DerivedBlock: payload MUST conform to one of the 10 v2 schemas.
 */
export interface CanonicalEnvelope {
  /** One of the artifact types (payload determines output schema) */
  type: CanonicalKBType;
  /** Domain (e.g. "software.security") */
  domain: string;
  /** Source kbIds (content hashes). Sorted before JCS pass. */
  sources: string[];
  /** Artifact content hash (keccak256 of payload bytes). Included in hash preimage. */
  artifactHash: string;
  /** Access tier committed to identity hash. */
  tier: TierLevel;
  /** Type-specific payload — camelCase keys per schema; MUST match one of 10 v2 schemas */
  payload: CanonicalPayload;
  /** When present: deterministic synthesis metadata; inputs[].kbId must be in sources */
  derivation?: CanonicalDerivation;
}

/** Compliance requirement (deterministic ID, description, mandatory flag) */
export interface CanonicalComplianceRequirement {
  id: string;
  description: string;
  isMandatory: boolean;
}

/** Evidence mapping: type of proof + validation logic (e.g. Rego/OPA) */
export interface CanonicalEvidenceMapping {
  type: "log_entry" | "audit_trail" | "cryptographic_proof";
  validationLogic: string;
}

/** Rubric dimension: criterion + weight (0.0–1.0) */
export interface CanonicalRubricDimension {
  criterion: string;
  weight: number;
}

/** Rubric thresholds: pass (positive signal) and escalate (Escalation Protocol) */
export interface CanonicalRubricThresholds {
  pass: number;
  escalate: number;
}

/** Citation map: source kbId → excerpt contributed from that source (Tier 1 Synthesis) */
export interface CanonicalCitationMap {
  [sourceKbId: string]: string;
}

/** Occurrence: where a pattern was observed (Tier 1 Pattern Extraction) */
export interface CanonicalPatternOccurrence {
  kbHash: string;
  context: string;
}

export type CanonicalPayload =
  | { type: "practice"; rationale: string; contexts: unknown[]; failureModes: unknown[] }
  | { type: "feature"; interfaceContract: unknown; testScaffold: unknown }
  | { type: "stateMachine"; states: unknown[]; transitions: unknown[]; invariants: unknown[] }
  | { type: "promptEngineering"; template: string; modelVersion: string; evalCriteria: unknown[] }
  | {
      type: "complianceChecklist";
      jurisdictionTags: string[];
      requirements: CanonicalComplianceRequirement[];
      evidenceMapping: CanonicalEvidenceMapping;
    }
  | {
      type: "rubric";
      dimensions: CanonicalRubricDimension[];
      scoringLogic: string;
      thresholds: CanonicalRubricThresholds;
    }
  | {
      type: "synthesis";
      question: string;
      answer: string;
      citations: CanonicalCitationMap;
    }
  | {
      type: "pattern";
      pattern: string;
      occurrences: CanonicalPatternOccurrence[];
      applicability: string;
    }
  | {
      type: "adaptation";
      targetDomain: string;
      adaptedContent: string;
      tradeoffs: string[];
    }
  | {
      type: "enhancement";
      concern: "observability" | "security" | "performance" | "accessibility";
      enhancedContent: string;
    }
  | {
      type: "factual";
      claim: string;
      sources: string[];
      confidence: number;
    }
  | {
      type: "derived";
      parent: string;
      transformation: string;
      summary: string;
    }
  | {
      type: "procedure";
      title: string;
      steps: string[];
      preconditions: string[];
      postconditions: string[];
    }
  | {
      type: "toolDefinition";
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
      outputSchema: Record<string, unknown>;
      examples: unknown[];
    }
  | {
      type: "codebank";
      title: string;
      language: string;
      problem: string;
      solution: string;
      testsCid?: string;
    }
  | {
      type: "researchArtifact";
      title: string;
      abstract: string;
      artifactCid: string;
      artifactHash: string;
      mimeType?: string;
      sizeBytes?: number;
    }
  | {
      type: "knowledgeGraph";
      nodes: unknown[];
      edges: unknown[];
      schema: Record<string, unknown>;
    }
  | {
      type: "agentMemory";
      task: string;
      decision: string;
      sources: string[];
      outcome?: string;
    }
  | {
      type: "evaluation";
      targetKbId: string;
      assessment: string;
      score: number;
    }
  | {
      type: "capability";
      agent: string;
      domains: string[];
      taskTypes: string[];
      inputFormats: string[];
      outputFormats: string[];
      version: string;
    }
  | {
      type: "agentIdentity";
      handle: string;
      publicKey: string;
      recoveryCommitment: string;
      attestation?: string;
      newAddress?: string;
      recoveryProof?: string;
    }
  | {
      type: "demandBeacon";
      requester: string;
      topic: string;
      maxFee: string;
      domain: string;
    }
  | {
      type: "hypothesis";
      statement: string;
      rationale: string;
      confidence: number;
      testPlan: string;
      outcome: "pending" | "confirmed" | "rejected";
    }
  | {
      type: "inquiry";
      question: string;
      context: string;
      missingInfo: string[];
      priority: "low" | "medium" | "high";
    }
  | {
      type: "beliefUpdate";
      priorKbId: string;
      update: string;
      evidenceKbIds: string[];
    }
  | {
      type: "reasoningChain";
      steps: { claim: string; sources: string[] }[];
      conclusion: string;
    }
  | {
      type: "collaboration";
      contributors: string[];
      contributionKbIds: string[];
      summary: string;
    }
  | {
      type: "knowledgeGap";
      domain: string;
      gap: string;
      request: string;
      maxFeeWei?: string;
    }
  | {
      type: "agentManifest";
      handle: string;
      identityKbId: string;
      capabilities: string[];
      needs: string[];
    }
  | {
      type: "protocolEndorsement";
      agentKbId: string;
      sessions: number;
      settlementCount: number;
      statement: string;
      evidenceKbIds: string[];
    };

/**
 * Signed metadata: stored separately from the envelope on IPFS.
 * Links to the envelope via envelopeCid (CIDv1 of canonical payload).
 */
export interface SignedMetadata {
  /** CIDv1 (base32) of the canonical envelope */
  envelopeCid: string;
  /** Curator address */
  curator: string;
  /** Unix timestamp of registration (not in hash preimage) */
  timestamp: number;
  /** Signature over envelopeCid (or over canonical envelope bytes) */
  signature: string;
}
