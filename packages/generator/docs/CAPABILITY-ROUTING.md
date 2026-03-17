# Capability Routing (Capability Gating)

When an agent has thousands of KB procedures, **selection overload** is the main failure mode: even good retrieval can return dozens of candidates, and LLMs choose poorly from large lists. **Capability routing** reduces the search space before the model selects procedures.

## Flow

```
Task
  ↓
Task Decomposition  (split into subtasks; optional)
  ↓
Capability Router  (per subtask → capability names + confidence scores)
  ↓
Relevant Capability Groups  (e.g. Security, EVM; keep score > 0.4)
  ↓
Retrieve within cluster  (e.g. 350 KBs → top 15)
  ↓
Graph neighbor expansion  (add parent/sibling procedures)
  ↓
Shortlist  (5–8 by procedural quality + optional ranking weights)
  ↓
Execution plan  (interface-chained order)
```

This turns a 10k selection problem into a **50–100** selection problem per cluster, which LLMs handle much more reliably.

## 1. Capability clusters

KB artifacts are grouped by **capability** using `semantic.domain` (prefix match). Example clusters:

| Capability     | Example domains                          |
|----------------|------------------------------------------|
| Planning       | agent.planning                           |
| Reasoning      | agent.reasoning                          |
| Security       | software.security, evm.solidity.security |
| Architecture   | software.architecture, distributed.systems |
| Retrieval      | ai.retrieval                             |
| EVM            | evm.solidity                             |
| DataSystems    | data.*, database.*, sql.*                |
| …              | (see `capability-clusters.ts`)           |

A 10k queue typically collapses into **40–120** capability clusters; each cluster contains dozens or hundreds of KBs.

## 2. Task decomposition (before routing)

For multi-part tasks, **decompose first**, then route each subtask. Merged capabilities use the **max score** per capability across subtasks.

## 3. Capability router (with confidence scores)

Before retrieval, **classify the task** into one or more capabilities with **confidence scores** (keep score > 0.4).

- **Example task:** “Find vulnerabilities in this Solidity contract.”  
  **Router output:** `["Security", "EVM"]`

- **Example task:** “Design a fault-tolerant microservice system.”  
  **Router output:** `["Architecture", "ErrorRecovery", "Observability"]`

This narrows the search to those clusters only.

## 4. Retrieve within capability

Once the router selects capabilities, run **retrieval only within those clusters**.

- Capability: `EVM` → e.g. ~350 KBs  
- Embedding search inside that set: 350 → **top 15**

The agent then chooses from **15** procedures, not 10,000.

## 5. Graph neighbor expansion

After retrieval, **expand with graph neighbors**: for each top KB, add its parents and siblings (same parent). This gives the agent **procedural bundles** (e.g. reentrancy_detection + checks_effects_interactions + state_update_validation) instead of isolated nodes.

## 6. Interface compatibility and execution plan

Artifacts have **inputs** and **outputs**. **Interface compatibility** scores how well the output of procedure A feeds the input of procedure B (0–1). After shortlisting, **build an execution plan** by ordering procedures so that outputs chain to inputs (greedy: pick next procedure that best matches the last one’s outputs). This produces a step graph the agent can run in order.

## 6. Shortlist and execution graph

From the top candidates, build a **shortlist** (typically **5–8** procedures). Example:

- detect_reentrancy  
- checks_effects_interactions  
- state_update_validation  
- safe_external_call_pattern  

The agent builds a plan using only these procedures, so selection is reliable.

## Implementation (generator)

- **`lib/capability-clusters.ts`**  
  - `CAPABILITY_CLUSTERS`: capability name → domain prefixes.  
  - `getCapabilitiesForDomain(domain)`, `buildCapabilityIndex(records)`, `getRecordsForCapabilities(index, capabilities)`.

- **`lib/capability-router.ts`**  
  - `decomposeTask(task)`: split task into subtasks (and / then / with / comma).  
  - `routeTaskToCapabilities(task, minScore)`: returns `{ capability, score }[]` (score > 0.4 by default).  
  - `classifyTaskToCapabilities(task)`: legacy; returns capability names only.

- **`lib/capability-routing-pipeline.ts`**  
  - `getRecordsForRoutedCapabilities(index, routed)`: candidates for routed capabilities.  
  - `buildNeighborMap(pool)`: kbHash → neighbor kbHashes (parents + siblings).  
  - `expandWithGraphNeighbors(pool, records, neighborMap, maxExtra)`: add neighbors to candidate set.  
  - `interfaceCompatibilityScore(recordA, recordB)`: 0–1 how well A’s outputs feed B’s inputs.  
  - `buildExecutionPlanOrder(shortlist)`: order shortlist by interface chaining.  
  - `getProceduralQualityScore(record)`: 0–1 for ranking (procedural specificity / max).

- **Usage in a runtime**  
  1. Load queue (or prebuilt capability index JSON with metadata).  
  2. Build capability index and neighbor map.  
  3. Decompose task → route each subtask → merge capabilities (max score per cap).  
  4. Get candidates: `getRecordsForRoutedCapabilities(index, routed)`.  
  5. Optionally expand with `expandWithGraphNeighbors`.  
  6. Rank by: 0.5 semantic + 0.25 capability_score + 0.15 domain_match + 0.10 procedural_quality.  
  7. Shortlist 5–8 → `buildExecutionPlanOrder(shortlist)` → execution plan.

## Exporting the capability index

```bash
node dist/index.js --mode export-capability-index
```

Writes `staging/capability-index.json`: capability → array of entries with **metadata for ranking without loading full artifacts**:

- `kbHash`, `domain`, `title`  
- `proceduralScore`, `stepCount`, `tags`, `inputs`, `outputs`

## Demo: routing debug output

To see the full pipeline on a sample (or custom) task:

```bash
node dist/index.js --mode routing-debug
node dist/index.js --mode routing-debug --task "Find vulnerabilities in this Solidity contract"
```

Prints: **Task** → **Decomposition** (if multiple parts) → **Router** (capabilities with scores) → **Candidate KBs per capability** → **After retrieval** → **Shortlist** (top 8 by procedural quality) → **Execution plan** (interface-chained order). This visually proves the KB is driving the agent.

## Future: capability coverage test

Run **100 sample tasks**, measure router accuracy, retrieval success, and procedure relevance. Tune keyword lists, capability clusters, and ranking weights from the results. (Not yet implemented.)

## Why it works

| Options presented to LLM | Typical accuracy |
|--------------------------|------------------|
| 10                       | high             |
| 50                       | moderate         |
| 500                      | poor             |
| 10,000                   | very poor        |

Capability routing keeps the effective option set in the **tens to low hundreds** per cluster, then shortlisting keeps the final choice set in the **5–8** range.

## Multi-hop retrieval

Complex tasks can require **multiple capabilities**. Example: “Design a secure payment microservice” → `["Architecture", "Security", "Observability"]`. Retrieve from each cluster, merge and dedupe candidates, then rank and shortlist. The same index supports this by taking the union of records for the routed capabilities.

## Task taxonomy and Web Engineering attachment

**`lib/task-taxonomy.ts`** defines a **Task → KB cluster** map for structured task classification:

- **Task types** (e.g. `web_application_design`, `frontend_interface`, `backend_service`, `rest_api`, `saas_platform`, `dashboard_ui`, `fullstack_web`) each have an **attach_kb_clusters** list (e.g. WebEngineering, Frontend, Backend, Security, Performance, Observability, Testing, DevOps, Documentation, UX).
- **`getKbClustersForTaskType(task_type)`** returns the clusters to attach for that task type (for use by a task classifier or routing layer).
- **`isWebRelatedTask(task)`** returns true if the task string contains web-related keywords (web app, frontend, REST API, SaaS, dashboard, etc.); useful to force attachment of WebEngineering + Frontend + Backend clusters.

**Web Engineering** and **Frontend Deep** seeds (domains `web.*`, `frontend.*`) are in capability clusters **WebEngineering**, **Frontend**, **Backend**, **FrontendDeep**. When the router sees tasks like “design a web application”, “build a REST API”, “create a dashboard UI”, it returns these clusters so retrieval pulls in the correct KB bundle (architecture, security, performance, UX, testing, DevOps, observability).

## Execution Planning Graph (EPG)

**`lib/execution-planning-graph.ts`** defines **ExecutionPlanNode** (plan_id, task_domain, steps[], required_skills[], attached_kb_clusters[]). The EPG converts knowledge into executable reasoning plans: **Task → Classification → Skills → Execution Plan → Steps → KBs → Solution**.

- **`getExecutionPlan(plan_id)`** / **`getExecutionPlansForDomain(task_domain)`**: load plan(s) for a task domain.
- **`--mode execution-plan --task "…"`**: prints the matching EPG node (steps, required skills, KB clusters to attach).

Plans exist for: software_architecture, web_engineering, distributed_systems, machine_learning, data_engineering, scientific_research, algorithm_engineering, security_engineering, devops, observability, testing_reliability, product_ux.

## Additional seed layers (routing)

- **FailureDebug** (`failure_debug.*`): debugging and failure diagnosis. Keywords: debug, diagnos, troubleshoot, memory leak, stack trace, race condition, network partition, latency spike, deployment failure.
- **Verification** (`verification.*`): agent self-check. Keywords: verify, validate, audit, compliance, benchmark.
- **Invariant** (`invariant.*`): Standard + References + Failure Mode + Verification. Keywords: circuit breaker, idempotent, backpressure, graceful degradation, observability, retry, tracing.
- **Antipattern** (`antipattern.*`): anti-pattern prevention. Keywords: anti-pattern, god object, tight coupling, chatty, N+1, data leakage, prop drilling.
