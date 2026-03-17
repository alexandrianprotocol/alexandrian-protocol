# Seed Upgrade Pipeline

Converts staged KB seeds (raw invariants or loose statements) into **high-value engineering standards** using AI normalization.

## Goal

**Before:** Conceptual invariants (e.g. "Distributed systems fail", "Retries improve reliability")  
**After:** Structured entries with **title**, **summary** (≤280 chars), **standard**, **procedure** (3–6 steps), **references** (design patterns), **failure_modes**, **verification**, **tags**.

## Pipeline

```
staging/pending  →  AI upgrade (GPT-4o)  →  schema validation  →  repair  →  staging/refined
```

## Schema (UpgradedKBEntry)

| Field | Constraint |
|-------|------------|
| title | required, non-empty |
| summary | ≤280 characters |
| standard | required, non-empty |
| procedure | 3–6 steps (array of strings) |
| references | array (prefer canonical patterns) |
| failure_modes | array |
| verification | array (testable criteria) |
| tags | 3–10, snake_case |

## CLI

```bash
# Upgrade all pending seeds (default concurrency 5, model from OPENAI_UPGRADE_MODEL or gpt-4o)
node dist/index.js --mode upgrade-seeds

# Limit to first 100 seeds, dry-run (no write)
node dist/index.js --mode upgrade-seeds --count 100 --dry-run

# Concurrency and model
node dist/index.js --mode upgrade-seeds --concurrency 10 --model gpt-4o --count 500
```

**Environment:**

- `OPENAI_API_KEY` — required for upgrade.
- `OPENAI_UPGRADE_MODEL` — optional; default **`gpt-4o`**. Use `gpt-4o-mini` only for cheaper bulk (lower quality).

## Model recommendation

| Step | Recommended model | Why |
|------|-------------------|-----|
| **Generate raw seeds** (`ai-seeds`) | `gpt-4o-mini` (set `OPENAI_MODEL=gpt-4o-mini`) | Cheap bulk; output can be loose. |
| **Upgrade seeds** (`upgrade-seeds`) | **`gpt-4o`** (default) | Strong reasoning for turning invariants into standards, procedure steps, and pattern references. |

**4o-mini** is fine for generating many seeds quickly. For **normalizing** those seeds into high-value entries (Standard, References, Procedure, Verification), use **GPT-4o** so the model reliably produces structured, pattern-anchored output. The pipeline defaults to `gpt-4o` for upgrade; override with `--model gpt-4o-mini` only if cost is a constraint.

## Audit (QA)

After upgrading, run audit on `staging/refined`:

```bash
node dist/index.js --mode audit-kb
```

Checks:

- **missing_verification** — empty verification array
- **missing_references** — empty references array
- **short_procedure** — fewer than 3 steps
- **long_summary** — summary >280 chars
- **duplicate_procedure** — same procedure content across entries

## Canonical patterns

The transformation prompt prefers **references** from a curated list of ~120 patterns (see `lib/canonical-patterns.ts`), including:

- Distributed: Circuit Breaker, Bulkhead, Saga, Event Sourcing, CQRS, API Gateway, Backpressure, etc.
- Data: Lambda/Kappa, Change Data Capture, Data Mesh, Event Streaming, WAL, etc.
- Cloud: Blue-Green, Canary, IaC, Serverless, Autoscaling, etc.
- Reliability: Retry with Backoff, Graceful Degradation, Health Check, Timeout, etc.
- Observability: Distributed Tracing, Structured Logging, OpenTelemetry, etc.
- Security: Zero Trust, Defense in Depth, Secrets Rotation, etc.

## Recommended workflow

1. **Generate** seeds (e.g. `--mode ai-seeds --count 500`).
2. **Upgrade** with GPT-4o: `--mode upgrade-seeds --count 500`.
3. **Audit**: `--mode audit-kb`.
4. Optionally **expand** or **export capability index** for use in routing.

## SaaS / full-stack blueprint seeds

High-value seeds that encode production SaaS and full-stack best practices (repo structure, documentation, observability, API design, error handling, security, multi-tenant, feature flags, cost observability, supply chain) are in **`lib/saas-fullstack-blueprint-seeds.ts`**. Generate them with:

```bash
node dist/index.js --mode ai-seeds --blueprint --count 40
```

They are also included when using `--all-layers`. Use these as reference for what “high-value” looks like (Standard + References + Failure mode + Verification).

## Files

- `lib/upgraded-kb-entry.ts` — schema, validation, repair.
- `lib/canonical-patterns.ts` — list of pattern names for prompt.
- `lib/transform-seed-to-upgraded.ts` — OpenAI call and prompt.
- `lib/upgrade-seeds-pipeline.ts` — load pending, transform, validate, write refined.
- `lib/audit-kb.ts` — audit refined entries.
- `lib/saas-fullstack-blueprint-seeds.ts` — production SaaS & full-stack blueprint seeds.
