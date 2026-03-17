# Execution Semantics & KB Type Contract

**Status: Locked before generation.** Every KB has a defined input/output contract by `kb_type`. The validator enforces that an artifact's `payload.interface` matches its declared `identity.kb_type` semantics.

---

## 1. Epistemic Type (3 values)

| Value         | Meaning |
|---------------|--------|
| `declarative` | Describes a truth or model; confidence weighting and inference style favor facts. |
| `procedural`  | Describes how to perform an action; step-oriented execution. |
| `evaluative`  | Describes how to judge correctness; metrics and pass/fail. |

Used for: confidence weighting, inference style, and (with `kb_type`) compound index `GetByType(epistemic_type, kb_type, domain)`.

---

## 2. KB Type (11 values) — Execution Semantics

| kb_type        | Execution meaning              | Typical inputs                    | Output contract (validator checks) |
|----------------|--------------------------------|-----------------------------------|------------------------------------|
| `procedure`    | Execute ordered steps          | task context, parameters          | strategy, implementation steps      |
| `pattern`      | Adapt template to context     | system constraints, domain context| architecture template              |
| `invariant`    | Validate candidate solution   | artifact, system state            | pass/fail validation               |
| `constraint`   | Restrict solution space       | candidate plan                    | allowed / disallowed decision       |
| `evaluation`   | Measure system behavior       | system output, metrics definitions| scores, test results                |
| `transformation` | Map artifact A → B            | source artifact                   | derived artifact                   |
| `protocol`     | Enforce interaction sequence  | messages, state transitions       | protocol-compliant exchange         |
| `artifact_spec`| Validate artifact structure    | artifact instance                 | schema compliance result            |
| `context`      | Activate knowledge cluster    | task description, environment state| **context_result** (see §4)         |
| `anti_pattern` | Describe what to avoid        | candidate solution / design       | warnings, violation flags           |
| `heuristic`    | Apply rule-of-thumb            | domain context, inputs            | recommendation, approximate output  |

The validator ensures:

- For `kb_type: "context"`, `payload.interface.outputs` includes exactly one output with `type: "context_result"` (and optionally `name: "relevant_kb_set"` or `"kb_set"`). The **value** of that output at runtime must conform to `ContextKBOutput` (see `types/artifact.ts`).
- For other types, interface inputs/outputs are checked for presence and non-empty arrays; type-specific output names are recommended in the generator prompt but not enforced as an enum to allow domain variation.

---

## 3. Invalid epistemic_type × kb_type Pairs

The following pairs are **rejected by the validator** (nonsensical; would corrupt agent routing):

| epistemic_type | kb_type       | Reason |
|----------------|---------------|--------|
| `declarative`  | `transformation` | Transformation is inherently procedural (doing something). |
| `declarative`  | `procedure`   | Procedure execution is inherently procedural. |
| `evaluative`   | `transformation` | Transformation produces artifacts, not judgments. |
| `evaluative`   | `protocol`    | Protocol is interaction rules, not evaluation. |
| `evaluative`   | `context`     | Context yields a KB set; not an evaluation. |

All other 3 × 11 − 5 = **28 combinations** are allowed.

---

## 4. Context KB Output — Schema-Level Specification

**Purpose:** Context KBs are the entry point for task → context → cluster retrieval. Their output format determines how agents initiate reasoning chains.

**Contract:** For `kb_type: "context"`, the single output with `type: "context_result"` carries a value that conforms to:

```ts
interface ContextKBOutput {
  /** Ordered list of kb_id (content-addressed hashes) to load for this context. */
  kb_ids: string[];
  /** Optional: KB IDs grouped by kb_type for agent routing. */
  by_type?: Record<string, string[]>;
}
```

- **Not** a free-form array: it is this structured object.
- **Not** a query string for the indexer: the indexer/materializer produces `ContextKBOutput` when evaluating a context KB (e.g. by running a stored query or lookup and returning `{ kb_ids, by_type? }`).
- Agents and the indexer consume `kb_ids` (and optionally `by_type`) to load the next KBs in the chain.

Validator rule: `payload.interface.outputs` must contain exactly one param with `type: "context_result"`.

---

## 5. Indexer: GetByType Query

The indexer **must** support a compound query so agents can ask for "all procedural evaluation KBs in the security domain" in one lookup:

- **Query:** `GetByType(epistemic_type, kb_type, domain)`
- **Returns:** Ordered list of artifacts (or ARA handles) by:
  1. Trust tier (ascending or descending by policy)
  2. Execution success rate (when available)

This compound index is required in the indexer spec; no filtering over the full artifact set.

---

## 6. Sequencing (Schema Freeze)

1. Add `kb_type` and simplified `epistemic_type` to schema. ✅  
2. Define invalid combination pairs. ✅  
3. Add context KB output type specification. ✅  
4. Update generator prompt to require both fields and valid combinations.  
5. Update validator to enforce type-specific interface contracts and invalid pairs.  
6. Run upgrade-seeds against staging to repair existing artifacts.  

After that, the schema is locked; further changes are validator rules and tooling, not schema.
