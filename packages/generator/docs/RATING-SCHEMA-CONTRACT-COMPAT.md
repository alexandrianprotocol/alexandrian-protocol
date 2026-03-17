# Rating: Schema, Contract (RegistryV2), and Backward Compatibility

---

## 1. Schema (KB artifact v2.4 / v2.5)

| Criterion | Score | Notes |
|-----------|--------|--------|
| **Clarity** | 9/10 | Canonical field order, single artifact type (KBv24Artifact), clear required vs optional (SCHEMA-CONTRACT.md). identity, claim, semantic, knowledge_inputs, reasoning, execution, validation, payload, evidence, provenance. |
| **Extensibility** | 8/10 | Schema version in identity (v2.4 | v2.5); optional blocks (cost_estimate, state_transition, preconditions, structured steps) allow evolution without breaking. Deprecated composition_type retained. |
| **Machine usefulness** | 8/10 | v2.5: structured steps (id, action, inputs, produces), typed interface, cost_estimate, optional state_transition for GDKR. ARA projection for lightweight retrieval. |
| **Determinism** | 9/10 | Hash boundary explicit (exclude kb_id, author.address). JCS + schema domain tag for content hash. Same artifact → same hash. |
| **Validation** | 8/10 | Validator enforces seed/derived rules, 2–3 parents, transformation enum, steps count. Relaxed “output in produces” to avoid brittle failures. |

**Overall schema: 8.6 / 10** — Production-grade, versioned, and agent-oriented. Optional **capabilities** (string[]) and **execution_class** (reasoning | transformation | evaluation | validation) improve retrieval and agent selection; ARA projects them when present.

---

## 2. Contract (AlexandrianRegistryV2)

| Criterion | Score | Notes |
|-----------|--------|--------|
| **Minimal on-chain** | 9/10 | KnowledgeBlock = curator, timestamp, queryFee, exists. artifactHashes and cidDigest in separate mappings. Domain/type/CID in events for indexer; no blocksByType/blocksByDomain/derivedBlocks. |
| **Gas efficiency** | 8/10 | Packed struct (uint64, uint96), bytes32 keys, custom errors. queryFee uint96; no string storage for CID. |
| **Safety** | 9/10 | ReentrancyGuard, whenNotPaused, seed/parent checks (SeedHasParents, NotEnoughParents), duplicate parent check, share validation. Pull payments (pendingWithdrawals). |
| **Provenance** | 9/10 | AttributionLink[] per KB; royalty bps; AttributionLinked per parent; settlement walks DAG. ERC-2981 royaltyInfo. |
| **Observability** | 8/10 | KBPublished(cid, embeddingCid, domain, queryFee, timestamp); indexer can reconstruct full metadata. totalFeesEarned, queryNonce, querierOf. |
| **Scale** | 8/10 | No global cap; contentHash keyed. 10k KBs = 10k entries; batch publish not in contract (caller can batch txs). |

**Overall contract: 8.5 / 10** — Clean separation of minimal state vs events; indexer-first design. Optional: batch publish helper to reduce tx count for 10k.

---

## 3. Backward Compatibility

| Layer | Status | Notes |
|-------|--------|--------|
| **Schema v2.4 → v2.5** | ✅ Compatible | Validator accepts both schemas. v2.5 adds optional/structured fields; v2.4 artifacts still valid. Hash uses identity.schema as domain tag so v2.5 same content has different hash (intended). |
| **Legacy artifacts in staging** | ✅ Handled | Generator filters pool by artifact?.semantic?.domain; legacy envelopes skipped for derived/expansion. repair.ts can upgrade legacy → v2.4. |
| **composition_type** | ✅ Backward compatible | Deprecated but still required in schema; new artifacts set "merge". transformation carries semantics. |
| **Contract ABI** | ⚠️ Breaking if upgrading from V1 | V2: publishKB signature includes artifactHash; event KBPublished has cid, embeddingCid, uint96 queryFee. Old clients must use new ABI. Same major version (V2) is stable. |
| **SDK / indexer** | ✅ Aligned | SDK uses getKnowledgeBlock + getArtifactHash + getCidDigest; getKBsByType/Domain/Derived removed and direct to indexer. Indexer ingests KBPublished + AttributionLinked. |
| **Publish order** | ✅ Documented | getPublishOrder(records) by (depth, kbHash) ensures parents before children; no contract change. |

**Overall backward compatibility: 8/10** — Schema and generator are backward friendly (v2.4 + v2.5, deprecated fields kept). Contract V2 is a clear cut; clients must use new ABI and event shapes.

---

## 4. AI API Prompt (OpenAI — ai-seeds)

The generator uses **two messages**: a **system** prompt (fixed) and a **user** prompt (per spec).

### System prompt (fixed)

```
You are a knowledge engineer for the Alexandrian Protocol. You produce exactly one KB artifact in JSON format that follows the KBv2.5 schema (structured steps + cost_estimate).

Rules for super-seeds:
1. One fundamental concept per artifact (concept atomicity). Reusable across domains.
2. identity.is_seed must be true. knowledge_inputs.used must be [].
3. identity.kb_id must be "". provenance.author.address must be "".
4. identity.schema must be "alexandrian.kb.v2.5".
5. payload.inline_artifact.steps must be an array of 3–7 STRUCTURED steps (objects with id, action, inputs, produces). Each step: id (unique, e.g. "define_goal"), action (verb_snake_case), inputs (array of names from interface or previous step produces), produces (array of output names; last step must produce the interface output name e.g. "result"). First step has empty inputs or "goal".
6. execution must include cost_estimate: { "resource_class": "cheap"|"moderate"|"expensive", "expected_token_cost": number, "time_complexity": "O(...)" }.
7. interface.inputs and interface.outputs use typed names: e.g. type "task", "task_graph", "execution_strategy".
8. claim.confidence use null for unassessed. provenance.royalty_bps 250. lineage: { "depth": 0, "parent_hash": null }.

Output only valid JSON for a single artifact. Use structured steps like:
"inline_artifact": {
  "steps": [
    { "id": "define_goal", "action": "define_goal", "inputs": ["goal"], "produces": ["goal_spec"] },
    { "id": "identify_subtasks", "action": "identify_subtasks", "inputs": ["goal_spec"], "produces": ["subtasks"] },
    { "id": "map_dependencies", "action": "map_dependencies", "inputs": ["subtasks"], "produces": ["result"] }
  ]
}
Last step's produces must match payload.interface.outputs[0].name (e.g. "result").
```

### User prompt (template)

```
Generate a single super-seed KB artifact for:
- domain: ${spec.domain}
- title: ${spec.title}
- identity.epistemic_type must be: ${epistemicType}
- concept: ${spec.concept}   (if spec.concept is set)

Output only the JSON object, no markdown or explanation.
```

- **Source:** `packages/generator/src/lib/ai-generator.ts` — `SYSTEM_PROMPT` (lines 45–65) and the `userContent` string (lines 200–206).
- **Model:** `process.env.OPENAI_MODEL ?? "gpt-4o"`.
- **Options:** `response_format: { type: "json_object" }`, `temperature: 0.3`.
- **Epistemic type:** Passed in user message from `spec.epistemic_type ?? options?.epistemicType ?? sampleEpistemicType()` (distribution: procedure 40%, fact 20%, analysis 20%, heuristic 10%, algorithm 10%).

After the response, the code applies `defaults(parsed)`, forces seed fields and the chosen `epistemicType`, then runs `validateArtifact(artifact)` and throws if invalid.
