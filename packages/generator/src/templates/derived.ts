/**
 * Derived KB Factories
 *
 * 15 derived KB factories. Each factory specifies which parent domains
 * it needs and a build function that takes those parent QueueRecords
 * and produces an EnvelopeInput (type synthesis | adaptation | enhancement).
 *
 * All factories require >= 2 parents (enforced by builder.ts).
 */

import type { EnvelopeInput } from "../lib/core/builder.js";
import { extractExcerpt } from "../lib/selector.js";
import type { QueueRecord } from "../lib/core/builder.js";

export interface DerivedFactory {
  /** Human-readable name for logging */
  name: string;
  /** Domains to look for parents in (order matters for selectParents) */
  requiredDomains: string[];
  /** Minimum number of parents needed */
  requiredCount: number;
  /** Output domain for the derived KB */
  outputDomain: string;
  /** Build the envelope input given the selected parents */
  build: (parents: QueueRecord[]) => EnvelopeInput;
}

export const DERIVED_FACTORIES: DerivedFactory[] = [
  // ── Cross-domain: security + solidity ────────────────────────────────────

  {
    name: "security-timing-in-evm",
    requiredDomains: ["software.security", "evm.solidity"],
    requiredCount: 2,
    outputDomain: "evm.solidity",
    build: (parents) => ({
      type: "synthesis",
      domain: "evm.solidity",
      tier: "open",
      sources: parents.map((p) => p.kbHash),
      payload: {
        type: "synthesis",
        question:
          "How should Solidity smart contracts implement constant-time comparison for sensitive values?",
        answer:
          "EVM contracts should use keccak256 hashing for secret comparison rather than " +
          "byte-by-byte equality, since the EVM executes deterministically and individual " +
          "SLOAD/comparison costs are observable via gas. Commit-reveal schemes or " +
          "zero-knowledge proofs avoid exposing the secret entirely.",
        citations: Object.fromEntries(
          parents.map((p) => [p.kbHash, extractExcerpt(p)])
        ),
      },
      derivation: {
        type: "compose",
        inputs: parents.map((p) => ({
          kbId: p.kbHash,
          selectors: ["payload.rationale", "payload.failureModes"],
        })),
        recipe: { strategy: "domain-adaptation", targetDomain: "evm.solidity" },
      },
    }),
  },

  {
    name: "access-control-patterns",
    requiredDomains: ["evm.solidity", "software.architecture"],
    requiredCount: 2,
    outputDomain: "evm.solidity",
    build: (parents) => ({
      type: "synthesis",
      domain: "evm.solidity",
      tier: "open",
      sources: parents.map((p) => p.kbHash),
      payload: {
        type: "synthesis",
        question:
          "How can role-based access control in Solidity follow architectural separation-of-concerns?",
        answer:
          "Apply CQRS principles at the contract level: separate read functions (views) " +
          "from write functions (state-modifying), and apply distinct role requirements to each. " +
          "Operational roles (e.g. PUBLISHER_ROLE) govern writes; no role required for reads. " +
          "Administrative roles govern role assignment itself, separate from protocol operation.",
        citations: Object.fromEntries(
          parents.map((p) => [p.kbHash, extractExcerpt(p)])
        ),
      },
      derivation: {
        type: "compose",
        inputs: parents.map((p) => ({
          kbId: p.kbHash,
          selectors: ["payload.rationale", "payload.contexts"],
        })),
        recipe: { strategy: "pattern-application", pattern: "CQRS" },
      },
    }),
  },

  // ── Cross-domain: security + sql ─────────────────────────────────────────

  {
    name: "sql-injection-in-orm-contexts",
    requiredDomains: ["software.security", "sql.optimization"],
    requiredCount: 2,
    outputDomain: "sql.optimization",
    build: (parents) => ({
      type: "synthesis",
      domain: "sql.optimization",
      tier: "open",
      sources: parents.map((p) => p.kbHash),
      payload: {
        type: "synthesis",
        question:
          "How should parameterized queries and ORM usage be combined to prevent SQL injection " +
          "while maintaining query performance?",
        answer:
          "Use the ORM's built-in parameterized query interface for all user-supplied values. " +
          "When raw() or literal() escape hatches are required for dynamic ORDER BY or column names, " +
          "enforce a strict allowlist and validate against it before query construction. " +
          "Add an index on frequently filtered columns to ensure parameterized queries remain fast.",
        citations: Object.fromEntries(
          parents.map((p) => [p.kbHash, extractExcerpt(p)])
        ),
      },
      derivation: {
        type: "compose",
        inputs: parents.map((p) => ({
          kbId: p.kbHash,
          selectors: ["payload.rationale", "payload.failureModes"],
        })),
        recipe: { strategy: "intersection", concern: "security-and-performance" },
      },
    }),
  },

  // ── Cross-domain: architecture + testing ─────────────────────────────────

  {
    name: "property-testing-for-event-sourced-systems",
    requiredDomains: ["software.architecture", "software.testing"],
    requiredCount: 2,
    outputDomain: "software.testing",
    build: (parents) => ({
      type: "synthesis",
      domain: "software.testing",
      tier: "open",
      sources: parents.map((p) => p.kbHash),
      payload: {
        type: "synthesis",
        question:
          "How should property-based testing be applied to event-sourced aggregates?",
        answer:
          "Model the aggregate as a pure function: (State, Event) → State. Generate " +
          "arbitrary sequences of valid events and assert that invariants hold after replay. " +
          "Key properties: replay idempotency (same event sequence → same final state), " +
          "no negative balances, valid state machine transitions. Use shrinking to minimise " +
          "failing event sequences to their essential cause.",
        citations: Object.fromEntries(
          parents.map((p) => [p.kbHash, extractExcerpt(p)])
        ),
      },
      derivation: {
        type: "compose",
        inputs: parents.map((p) => ({
          kbId: p.kbHash,
          selectors: ["payload.rationale", "payload.contexts"],
        })),
        recipe: { strategy: "method-application", method: "property-based-testing" },
      },
    }),
  },

  {
    name: "contract-testing-for-microservices",
    requiredDomains: ["software.testing", "software.architecture"],
    requiredCount: 2,
    outputDomain: "software.testing",
    build: (parents) => ({
      type: "synthesis",
      domain: "software.testing",
      tier: "open",
      sources: parents.map((p) => p.kbHash),
      payload: {
        type: "synthesis",
        question:
          "How does consumer-driven contract testing integrate with a microservices saga pattern?",
        answer:
          "Each saga step's service interface is a contract boundary. Consumers (orchestrator " +
          "or choreography listeners) define contracts against the events and commands they send. " +
          "Provider verification runs in CI for each service independently. This catches " +
          "schema drift before deployment without requiring full end-to-end saga execution.",
        citations: Object.fromEntries(
          parents.map((p) => [p.kbHash, extractExcerpt(p)])
        ),
      },
      derivation: {
        type: "compose",
        inputs: parents.map((p) => ({
          kbId: p.kbHash,
          selectors: ["payload.rationale", "payload.failureModes"],
        })),
        recipe: { strategy: "integration", concern: "distributed-testing" },
      },
    }),
  },

  // ── Cross-domain: security + testing ─────────────────────────────────────

  {
    name: "fuzzing-for-security-vulnerabilities",
    requiredDomains: ["software.testing", "software.security"],
    requiredCount: 2,
    outputDomain: "software.testing",
    build: (parents) => ({
      type: "synthesis",
      domain: "software.testing",
      tier: "open",
      sources: parents.map((p) => p.kbHash),
      payload: {
        type: "synthesis",
        question:
          "How should fuzz testing be structured to surface security vulnerabilities rather than just crashes?",
        answer:
          "Define security-specific oracles beyond crash detection: unexpected privilege escalation, " +
          "timing variance in secret-handling code, unexpected state transitions, and output that " +
          "leaks internal structure. Use sanitizers (AddressSanitizer, MemorySanitizer) to catch " +
          "undefined behaviour. Combine coverage-guided fuzzing with manual seed cases from " +
          "known vulnerability classes.",
        citations: Object.fromEntries(
          parents.map((p) => [p.kbHash, extractExcerpt(p)])
        ),
      },
      derivation: {
        type: "compose",
        inputs: parents.map((p) => ({
          kbId: p.kbHash,
          selectors: ["payload.rationale", "payload.contexts", "payload.failureModes"],
        })),
        recipe: { strategy: "method-application", method: "security-fuzzing" },
      },
    }),
  },

  // ── Adaptation: security → solidity ──────────────────────────────────────

  {
    name: "input-validation-adapted-for-solidity",
    requiredDomains: ["software.security", "evm.solidity"],
    requiredCount: 2,
    outputDomain: "evm.solidity",
    build: (parents) => ({
      type: "adaptation",
      domain: "evm.solidity",
      tier: "open",
      sources: parents.map((p) => p.kbHash),
      payload: {
        type: "adaptation",
        targetDomain: "evm.solidity",
        adaptedContent:
          "In Solidity, input validation is performed via require() statements at function " +
          "entry. Validate: (1) address non-zero (address(0) guard), (2) numerical bounds " +
          "(amounts within protocol limits), (3) array length limits (prevent unbounded loops), " +
          "(4) enum/state validity (only valid enum values passed). Custom errors (revert " +
          "ErrorName()) are preferred over string reverts for gas efficiency.",
        tradeoffs: [
          "require() reverts consume all gas in pre-London forks; custom errors are cheaper",
          "On-chain validation cannot reference off-chain oracle data without additional calls",
          "Overly strict validation at entry may reject valid future protocol states during upgrades",
        ],
      },
      derivation: {
        type: "transform",
        inputs: parents.map((p) => ({
          kbId: p.kbHash,
          selectors: ["payload.rationale", "payload.contexts"],
        })),
        recipe: { transformationType: "domain-adaptation", targetLanguage: "solidity" },
      },
    }),
  },

  // ── Adaptation: architecture → evm ───────────────────────────────────────

  {
    name: "event-sourcing-adapted-for-evm",
    requiredDomains: ["software.architecture", "evm.solidity"],
    requiredCount: 2,
    outputDomain: "evm.solidity",
    build: (parents) => ({
      type: "adaptation",
      domain: "evm.solidity",
      tier: "open",
      sources: parents.map((p) => p.kbHash),
      payload: {
        type: "adaptation",
        targetDomain: "evm.solidity",
        adaptedContent:
          "The EVM is inherently event-sourced: all state transitions are recorded as " +
          "on-chain events replayed from the genesis block. Smart contracts should emit " +
          "structured events for every state change, treating emitted events as the " +
          "authoritative log. Avoid storing redundant state that can be reconstructed from " +
          "events by the indexer. Snapshots (periodic on-chain state checkpoints) reduce " +
          "indexer replay cost at the expense of storage.",
        tradeoffs: [
          "Events are immutable but cannot be queried on-chain — indexer required for event-based queries",
          "Snapshot patterns add deployment complexity and storage cost",
          "Event-heavy contracts cost more gas per call than state-only contracts",
        ],
      },
      derivation: {
        type: "transform",
        inputs: parents.map((p) => ({
          kbId: p.kbHash,
          selectors: ["payload.rationale", "payload.contexts"],
        })),
        recipe: { transformationType: "domain-adaptation", targetPlatform: "evm" },
      },
    }),
  },

  // ── Adaptation: sql → graphql ─────────────────────────────────────────────

  {
    name: "n-plus-one-adapted-for-graphql",
    requiredDomains: ["sql.optimization", "software.architecture"],
    requiredCount: 2,
    outputDomain: "sql.optimization",
    build: (parents) => ({
      type: "adaptation",
      domain: "sql.optimization",
      tier: "open",
      sources: parents.map((p) => p.kbHash),
      payload: {
        type: "adaptation",
        targetDomain: "graphql",
        adaptedContent:
          "GraphQL resolvers are the primary source of N+1 queries in modern APIs. " +
          "Each field resolver runs independently, causing one query per list item by default. " +
          "Solve with the Dataloader pattern: batch all keys collected during a tick, then " +
          "issue a single IN query. For deeply nested queries, use join-based dataloaders " +
          "that compute the full subtree in a single query using lateral joins or CTEs.",
        tradeoffs: [
          "Dataloader adds a request-scoped cache that must be invalidated per request to avoid stale reads",
          "Join-based loaders are faster but harder to cache at the row level",
          "Over-fetching (requesting unused fields) cannot be solved by Dataloader alone — persisted queries help",
        ],
      },
      derivation: {
        type: "transform",
        inputs: parents.map((p) => ({
          kbId: p.kbHash,
          selectors: ["payload.rationale", "payload.failureModes"],
        })),
        recipe: { transformationType: "context-adaptation", targetContext: "graphql-resolvers" },
      },
    }),
  },

  // ── Synthesis: prompting + security ──────────────────────────────────────

  {
    name: "prompt-injection-defense",
    requiredDomains: ["ai.prompting", "software.security"],
    requiredCount: 2,
    outputDomain: "ai.prompting",
    build: (parents) => ({
      type: "synthesis",
      domain: "ai.prompting",
      tier: "open",
      sources: parents.map((p) => p.kbHash),
      payload: {
        type: "synthesis",
        question:
          "How should systems that process LLM outputs defend against prompt injection attacks?",
        answer:
          "Treat LLM output as untrusted user input. Validate all structured outputs against " +
          "a schema before use. Do not interpolate LLM responses into further prompts or " +
          "system commands without sanitization. Use a separate validation prompt to " +
          "assess whether a response follows the intended format before acting on it. " +
          "Privilege-separate the LLM call from any state-modifying actions.",
        citations: Object.fromEntries(
          parents.map((p) => [p.kbHash, extractExcerpt(p)])
        ),
      },
      derivation: {
        type: "compose",
        inputs: parents.map((p) => ({
          kbId: p.kbHash,
          selectors: ["payload.rationale", "payload.evalCriteria"],
        })),
        recipe: { strategy: "security-application", concern: "llm-output-safety" },
      },
    }),
  },

  {
    name: "llm-output-testing-strategies",
    requiredDomains: ["ai.prompting", "software.testing"],
    requiredCount: 2,
    outputDomain: "ai.prompting",
    build: (parents) => ({
      type: "synthesis",
      domain: "ai.prompting",
      tier: "open",
      sources: parents.map((p) => p.kbHash),
      payload: {
        type: "synthesis",
        question:
          "How should property-based and contract testing principles be applied to LLM outputs?",
        answer:
          "Define output properties rather than expected exact outputs: structural validity " +
          "(JSON schema), semantic range (sentiment within expected polarity), factual " +
          "constraints (no dates beyond known range). Use property-based generators to " +
          "create prompt variants and assert properties hold across the distribution. " +
          "Consumer-driven contracts between the prompt author and the model version prevent " +
          "silent regressions on model updates.",
        citations: Object.fromEntries(
          parents.map((p) => [p.kbHash, extractExcerpt(p)])
        ),
      },
      derivation: {
        type: "compose",
        inputs: parents.map((p) => ({
          kbId: p.kbHash,
          selectors: ["payload.evalCriteria", "payload.rationale"],
        })),
        recipe: { strategy: "methodology-transfer", from: "software-testing", to: "llm-testing" },
      },
    }),
  },

  // ── Synthesis: meta.protocol + architecture ───────────────────────────────

  {
    name: "deterministic-knowledge-dags",
    requiredDomains: ["meta.protocol", "software.architecture"],
    requiredCount: 2,
    outputDomain: "meta.protocol",
    build: (parents) => ({
      type: "synthesis",
      domain: "meta.protocol",
      tier: "open",
      sources: parents.map((p) => p.kbHash),
      payload: {
        type: "synthesis",
        question:
          "How should event-sourcing principles be applied to the design of a deterministic knowledge DAG?",
        answer:
          "Treat each KB registration as an immutable event. The knowledge graph state " +
          "at any point is the result of replaying all registration events up to that block. " +
          "Deterministic identity ensures the same KB registered at different times produces " +
          "the same node in the graph. Provenance is the lineage chain of events — " +
          "an audit trail that is immutable by construction. Read models (indexes, embeddings) " +
          "are projections over the event log, not authoritative state.",
        citations: Object.fromEntries(
          parents.map((p) => [p.kbHash, extractExcerpt(p)])
        ),
      },
      derivation: {
        type: "compose",
        inputs: parents.map((p) => ({
          kbId: p.kbHash,
          selectors: ["payload.rationale"],
        })),
        recipe: { strategy: "conceptual-integration", theme: "event-sourced-knowledge-graph" },
      },
    }),
  },

  {
    name: "epistemic-integrity-in-ai-systems",
    requiredDomains: ["meta.protocol", "software.security"],
    requiredCount: 2,
    outputDomain: "meta.protocol",
    build: (parents) => ({
      type: "synthesis",
      domain: "meta.protocol",
      tier: "open",
      sources: parents.map((p) => p.kbHash),
      payload: {
        type: "synthesis",
        question:
          "How do epistemic integrity requirements for knowledge graphs intersect with security?",
        answer:
          "Knowledge poisoning is the knowledge-graph analogue of SQL injection: an attacker " +
          "injects plausible but false nodes that are cited by legitimate derived knowledge, " +
          "propagating the error through the DAG. Defense requires: (1) validator agents that " +
          "check factual consistency before registration, (2) stake-based accountability so " +
          "publishers bear cost for malicious nodes, (3) contradiction linkage that surfaces " +
          "conflicting claims rather than silently overwriting them.",
        citations: Object.fromEntries(
          parents.map((p) => [p.kbHash, extractExcerpt(p)])
        ),
      },
      derivation: {
        type: "compose",
        inputs: parents.map((p) => ({
          kbId: p.kbHash,
          selectors: ["payload.rationale", "payload.failureModes"],
        })),
        recipe: { strategy: "threat-model-application", domain: "knowledge-integrity" },
      },
    }),
  },

  // ── Synthesis: architecture + sql ─────────────────────────────────────────

  {
    name: "event-sourcing-with-sql-read-models",
    requiredDomains: ["software.architecture", "sql.optimization"],
    requiredCount: 2,
    outputDomain: "software.architecture",
    build: (parents) => ({
      type: "synthesis",
      domain: "software.architecture",
      tier: "open",
      sources: parents.map((p) => p.kbHash),
      payload: {
        type: "synthesis",
        question:
          "How should SQL read models be optimised for event-sourced systems?",
        answer:
          "Project events into denormalised SQL read models tailored to query access patterns. " +
          "Each projection is a separate table with its own indexes, updated via event handlers. " +
          "Avoid joins across projections — denormalisation is intentional. Use partial indexes " +
          "for active/inactive status filters. Run VACUUM ANALYZE after bulk event replay to " +
          "update planner statistics before the system opens to traffic.",
        citations: Object.fromEntries(
          parents.map((p) => [p.kbHash, extractExcerpt(p)])
        ),
      },
      derivation: {
        type: "compose",
        inputs: parents.map((p) => ({
          kbId: p.kbHash,
          selectors: ["payload.rationale", "payload.contexts"],
        })),
        recipe: { strategy: "pattern-combination", patterns: ["event-sourcing", "read-model"] },
      },
    }),
  },

  // ── Synthesis: evm.solidity + software.testing ────────────────────────────

  {
    name: "smart-contract-fuzz-testing",
    requiredDomains: ["evm.solidity", "software.testing"],
    requiredCount: 2,
    outputDomain: "evm.solidity",
    build: (parents) => ({
      type: "synthesis",
      domain: "evm.solidity",
      tier: "open",
      sources: parents.map((p) => p.kbHash),
      payload: {
        type: "synthesis",
        question:
          "How should fuzz testing be applied to Solidity smart contracts?",
        answer:
          "Use Foundry's invariant testing (forge test --match-contract Invariant) to " +
          "fuzz call sequences against the contract. Define invariants as properties: " +
          "total supply conservation, no ETH created from nothing, no address with " +
          "balance exceeding the cap. Run with --fuzz-runs=10000 in CI. Supplement with " +
          "Echidna for property-based fuzzing with custom corpus generation. " +
          "Combine with gas snapshot tests to detect gas regression from fuzz-found paths.",
        citations: Object.fromEntries(
          parents.map((p) => [p.kbHash, extractExcerpt(p)])
        ),
      },
      derivation: {
        type: "compose",
        inputs: parents.map((p) => ({
          kbId: p.kbHash,
          selectors: ["payload.rationale", "payload.contexts", "payload.failureModes"],
        })),
        recipe: { strategy: "method-application", method: "fuzz-testing", target: "smart-contracts" },
      },
    }),
  },
];
