/**
 * AI transformation: convert a raw/invariant seed into a structured high-value engineering standard (UpgradedKBEntry).
 * Recommended model: gpt-4o for best quality; 4o-mini for cheaper bulk.
 */

import OpenAI from "openai";
import type { UpgradedKBEntry } from "../upgraded-kb-entry.js";
import { ALL_CANONICAL_PATTERNS } from "../canonical-patterns.js";

const SYSTEM_PROMPT = `You are an expert software architect and technical documentation writer.

Convert the following engineering invariant or seed into a structured engineering knowledge entry.

Requirements:
- Return JSON only, with no markdown or explanation.
- Use these exact field names: title, summary, standard, procedure, references, failure_modes, verification, tags.
- summary: ≤280 characters.
- procedure: array of 3–6 concrete steps (strings).
- references: prefer recognized design patterns or industry practices from the canonical list when relevant; you may add others (e.g. "AWS Retry Guidelines", "Google SRE").
- failure_modes: 1–4 short descriptions of what goes wrong if this is ignored.
- verification: 1–4 machine-testable criteria (see below).
- tags: 3–10 lowercase snake_case tags (e.g. distributed_systems, reliability, api_design).

Verification (machine-testable):
- Each verification item MUST include a measurable formula, threshold, or invariant — not vague language.
- BAD: "Verify system performance remains acceptable." / "Ensure queries are efficient." / "Check integrity of generated knowledge."
- GOOD: "query_latency_p95 < 200ms" / "run graph query benchmark with 10k nodes; assert p95 < 200ms" / "artifact_hash matches keccak256(JCS(envelope))."
- Prefer: metric name, formula or threshold, test procedure, and dataset or input conditions where relevant.
- Example format: "metric: X; formula: Y; test: Z" or a single line with a clear inequality or equality (e.g. "latency_p95 < 200ms", "error_rate < 0.001").

Atomic title (one concept only):
- Title must describe ONE atomic concept. Do not combine multiple concepts (e.g. "Integrity Verification in AI-Prompting Derived Knowledge Bases" is too many).
- BAD: "Scenario Evaluation with Derived Knowledge Base" / "Contingency Planning with AI Prompting Derived Knowledge Base"
- GOOD: "Graph Query Latency Threshold Verification" / "Deterministic Artifact Hash Integrity Check" / "P95 Latency Benchmark for 10k-Node Graph"

Step quality:
- Steps must NOT start with these verbs unless a concrete mechanism immediately follows in the same sentence: identify, implement, adjust, optimize, monitor, consider, ensure, review, handle, manage, use, apply, add, create, update, check, merge, detect, classify, iterate, integrate, combine, validate, define, build, deploy, collect, generate, process, compare, transform, evaluate, assess, configure, setup, enable, perform.
- Every step MUST be ≥15 words and contain at least one specific mechanism: a tool name, function call pattern, formula, numeric threshold (e.g. ">60%", "<200ms"), SQL pattern, or CLI command.
- BAD: "Validate the merged output for consistency." (8 words, no mechanism)
- GOOD: "Validate the merged output for consistency by asserting all required fields pass JSON Schema draft-07 validation; emit VALIDATION_FAILED with field path on the first failing field." (28 words, has mechanism)
- BAD: "Merge artifacts from AI prompting and transaction processes." (8 words, no mechanism)
- GOOD: "Merge artifacts from AI prompting and transaction processes by applying field-level structural comparison on shared key fields; flag conflicts where hash(A.field) ≠ hash(B.field) and log to conflict_log." (29 words, has mechanism)
- Prefer concrete mechanisms, tools, and thresholds. For example:
  - Instead of: "Identify key attributes for partitioning"
    Write: "Run EXPLAIN ANALYZE on the 10 slowest queries and extract columns appearing in WHERE clauses across >60% of queries."
  - Instead of: "Monitor query performance"
    Write: "Set pg_stat_statements.track = all and alert when p95 query time exceeds 50ms for 5 consecutive minutes."

Failure mode requirements:
- Every failure_mode MUST include a causal chain using 'because', 'when', or 'causing'.
- BAD: "Inconsistent data due to improper merging."
- GOOD: "Inconsistent data when merge omits NULL handling: records with NULL key fields are silently dropped, causing referential integrity violations in downstream consumers."

The entry must represent a best-practice engineering standard, not a vague invariant.`;

const PATTERNS_HINT = `
When relevant, prefer citing these canonical patterns in "references": ${ALL_CANONICAL_PATTERNS.slice(0, 60).join(", ")} (and others from the same family: Circuit Breaker, Saga, CQRS, Event Sourcing, Idempotent Consumer, Retry with Backoff, Graceful Degradation, Health Check, Distributed Tracing, etc.).`;

export interface TransformSeedOptions {
  /** Model to use. Default gpt-4o for quality; use 4o-mini for cheaper bulk. */
  model?: string;
}

/**
 * Retry wrapper: 3 attempts on primary model with exponential backoff, then one attempt on fallback.
 * Non-retryable: HTTP 400 and SyntaxError — propagated immediately.
 */
async function withRetry<T>(
  fn: (model: string) => Promise<T>,
  primaryModel: string,
  fallbackModel: string = "gpt-4o-mini",
  maxRetries: number = 3
): Promise<T> {
  const baseDelay = 1000;
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = delay * 0.2 * (Math.random() - 0.5);
        await new Promise((r) => setTimeout(r, Math.round(delay + jitter)));
      }
      return await fn(primaryModel);
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number }).status;
      if (status === 400 || err instanceof SyntaxError) throw err;
      console.error(`[transform-seed] attempt ${attempt + 1}/${maxRetries} failed (status=${status ?? "?"}) — will retry`);
    }
  }
  if (primaryModel !== fallbackModel) {
    console.error(`[transform-seed] primary model exhausted retries; trying fallback ${fallbackModel}`);
    try {
      return await fn(fallbackModel);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/**
 * Transform a seed string (title + claim + summary, or raw invariant text) into an UpgradedKBEntry using OpenAI.
 * Throws on missing API key or invalid response.
 */
export async function transformSeedToUpgraded(
  seedText: string,
  options?: TransformSeedOptions
): Promise<UpgradedKBEntry> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env in the project root.");
  }

  const model = options?.model ?? process.env.OPENAI_UPGRADE_MODEL ?? "gpt-4o";
  const client = new OpenAI({ apiKey });

  const userContent =
    `Convert the following engineering idea into a structured best-practice entry.\n\n` +
    `Return JSON with fields: title, summary (≤280 chars), standard, procedure (3–6 steps), references, failure_modes, verification, tags.\n` +
    `Verification: use measurable formulas/thresholds (e.g. "latency_p95 < 200ms", "run benchmark; assert p95 < 200ms"). Title: one atomic concept only.\n` +
    PATTERNS_HINT +
    `\n\nInput seed:\n${seedText.trim()}`;

  const response = await withRetry(
    (m) =>
      client.chat.completions.create({
        model: m,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    model,
    "gpt-4o-mini"
  );

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned no content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI response was not valid JSON");
  }

  const entry = parsed as Record<string, unknown>;
  const result: UpgradedKBEntry = {
    title: String(entry.title ?? "").trim() || "Untitled",
    summary: String(entry.summary ?? "").trim(),
    standard: String(entry.standard ?? "").trim(),
    procedure: Array.isArray(entry.procedure) ? entry.procedure.map(String).filter(Boolean) : [],
    references: Array.isArray(entry.references) ? entry.references.map(String).filter(Boolean) : [],
    failure_modes: Array.isArray(entry.failure_modes) ? entry.failure_modes.map(String).filter(Boolean) : [],
    verification: Array.isArray(entry.verification) ? entry.verification.map(String).filter(Boolean) : [],
    tags: Array.isArray(entry.tags) ? entry.tags.map((t) => String(t).trim().toLowerCase().replace(/\s+/g, "_")).filter(Boolean) : [],
  };

  // Warn when verification items lack numeric formulas (repair will fix, but log for visibility).
  const vagueVerification = result.verification.filter(
    (v) => /\b(acceptable|appropriate|reasonable|sufficient)\b/i.test(v) && !/[<>=!]=?\s*\d/.test(v)
  );
  if (vagueVerification.length > 0) {
    console.warn(
      `[transform-seed] ${vagueVerification.length} vague verification item(s) detected — dimension repair will strengthen: "${vagueVerification[0].slice(0, 80)}"`
    );
  }

  return result;
}
