# First 10k KBs — Operational Knowledge Design

The first 10k KBs are designed as **operational knowledge** for AI agents: decide, plan, execute, verify. Every KB should help an agent complete a step in the capability loop.

## Guiding rule

> **Every KB should help an agent decide, plan, execute, or verify something.**

Passive content is avoided; each KB has **inputs**, **outputs**, **steps**, **success_conditions**, and **failure_conditions** so agents can execute and validate.

## Agent capability loop

```
goal → planning → tool selection → execution → validation → reflection
```

## Target distribution (10k)

| Category                    | KB count | Domains (examples) |
|----------------------------|----------|--------------------|
| Planning & reasoning       | 2,500    | agent.planning, agent.retrieval, ai.reasoning_patterns |
| Execution strategies       | 2,000    | agent.execution, agent.tool_selection, agent.error_recovery |
| Validation & testing       | 1,500    | software.testing, ai.output_validation, knowledge.validation |
| Software engineering       | 2,000    | software.architecture, design_patterns, debugging, performance |
| Data systems               | 1,000    | database.optimization, indexing, sql.optimization |
| Security                   | 500      | software.security |
| Knowledge infrastructure   | 500      | knowledge.graphs, knowledge.versioning, meta.protocol |

## Domain tree (agent tasks)

Domains map to **agent tasks**, not academic disciplines:

- **agent.*** — planning, execution, memory, retrieval, tool_selection, error_recovery, self_reflection
- **software.*** — architecture, design_patterns, testing, debugging, performance, observability, security
- **database.*** / **sql.*** — optimization, indexing, schema_design
- **ai.*** — prompting, output_validation, reasoning_patterns
- **knowledge.*** — graphs, validation, versioning
- **meta.protocol** — protocol and KB meta-knowledge

See `src/config/agent-capability-domains.ts` for the full list and category mapping.

## Seed coverage

- **Existing seeds** (`templates/seeds.ts`): security, solidity, sql, architecture, testing, ai.prompting, meta.protocol.
- **Operational seeds** (`templates/operational-seeds.ts`): planning (task decomposition, hierarchical, prioritization, dependency resolution, constraint-based, iterative refinement), execution (API pattern, CLI pattern, tool selection, error recovery), validation (unit test generation, output consistency, regression testing), software (dependency injection, debugging), data (B-tree index), knowledge (semantic tagging).

Run `pnpm generate:seeds` (or `--mode seeds`) to emit all seeds; then `--mode derived` to add derived KBs from cross-domain factories. Use `--count 10000` when scaling.

## Execution-oriented structure

Each KB includes:

- **identity** — title, epistemic_type, is_seed, schema
- **claim** — statement, confidence, falsifiable
- **semantic** — summary, tags, domain, difficulty
- **knowledge_inputs** — used[] (empty for seeds), minimum_required, composition_type
- **reasoning** — requires, contradicts, related
- **execution** — trust_tier, execution_mode, determinism, idempotent
- **validation** — success_conditions, failure_conditions, metrics
- **payload** — artifact_type, interface (inputs, outputs), inline_artifact.steps
- **evidence** — sources, benchmarks, notes
- **provenance** — author, royalty_bps, lineage

Agents can run **KB(inputs) → outputs** and check **success_conditions** / **failure_conditions** to verify results.

## Scaling to 10k

1. **Seeds**: Add more seed templates per category in `operational-seeds.ts` and `seeds.ts` to approach target counts, or generate variants from a smaller set (e.g. parameterized by domain).
2. **Derived**: Derived factories (in `templates/derived.ts`) combine parents from different domains; running with a large pool produces many derived KBs. Ensure parent selection uses the domain config so coverage matches the distribution.
3. **CLI**: `node dist/index.js --mode all --count 10000` (or run seeds then derived with appropriate counts).

## Reuse and composability

High-value KBs are:

- **Domain-specific** — one concept or pattern
- **Composable** — can be chained (e.g. Task Decomposition → Tool Selection → Execution → Validation)
- **Deterministic** — same inputs → same outputs where applicable
- **Reusable** — applicable across many agent tasks

Prioritized areas: error recovery, tool selection, debugging, test generation, query optimization, dependency resolution.
