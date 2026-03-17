# Goal-Directed Knowledge Routing (GDKR)

Agents query by **goal state**, not by keywords or embeddings. The system returns the **minimal execution pipeline** (shortest path through KB artifacts) to achieve that goal.

## Schema

Every KB artifact may declare:

```json
"state_transition": {
  "input_state": "goal_defined",
  "output_state": "task_graph_created"
}
```

- **input_state** — State required before this artifact can run.
- **output_state** — State produced after this artifact runs.

## How the planner works

1. Agent sends a query: `(current_state, desired_state)`  
   e.g. `sql_query_slow` → `sql_query_fast`.
2. Indexer holds a **state graph**: nodes = states, edges = artifacts (with cost from ARA `t`).
3. Planner runs **shortest path** (e.g. A* or Dijkstra) from `current_state` to `desired_state`.
4. Result: ordered list of artifact hashes. Agent executes them in sequence.

Example chain:

```
goal_defined → task_graph_created → execution_plan_created → task_executed → result_validated
```

Each edge is one KB artifact. Royalties apply per artifact when the agent runs the pipeline.

## State ontology

Canonical states (see `config/state-ontology.ts`) align with the agent capability loop:

- `raw_goal` → `goal_defined` (goal definition)
- `goal_defined` → `task_graph_created` (task decomposition)
- `task_graph_created` → `execution_plan_created` (planning)
- `execution_plan_created` → `task_executed` (execution)
- `task_executed` → `result_validated` (validation)
- `failure_detected` → `failure_recovered` (error recovery)
- `context_compressed`, `query_optimized`, etc.

Seeds and derived KBs get `state_transition` from domain/title or from transformation type so the graph connects.

## ARA projection

When an artifact has `state_transition`, the Agent Retrieval Artifact includes:

- **st: { i: input_state, o: output_state }**

The indexer can build and query the state graph without loading full artifacts from IPFS.

## Why this beats keyword retrieval

- **Web search:** returns documents → agent must interpret.
- **GDKR:** returns an execution pipeline → agent runs it.

Combined with settlement per artifact, the system becomes **reasoning infrastructure** and an **execution marketplace**, not just a knowledge base.
