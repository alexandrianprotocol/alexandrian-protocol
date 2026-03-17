/**
 * Knowledge Triangle Rule — each artifact must contribute a distinct (concept, method, constraint).
 * Reject artifacts whose triangle duplicates an existing one or a parent's (semantic redundancy).
 * Concept is canonicalized so variants (apply_circuit_breaker, enforce_circuit_breaker_pattern) map to one key.
 *
 * Pipeline order: procedural specificity → knowledge triangle rule → semantic similarity (content fingerprint).
 */

import type { KBv24Artifact, StructuredStep, StepItem } from "../types/artifact.js";
import type { QueueRecord } from "./core/builder.js";
import { canonicalConcept } from "./concept-canonicalizer.js";

const MAX_TOKEN_LEN = 40;

function normalize(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, MAX_TOKEN_LEN) || "general";
}

/** Domain-only fallback for concept (last segment). */
function conceptFromDomain(artifact: KBv24Artifact): string {
  const domain = (artifact.semantic?.domain ?? "").trim();
  if (!domain) return "general";
  const segments = domain.split(".").filter(Boolean);
  const last = segments[segments.length - 1] ?? "general";
  const prev = segments[segments.length - 2];
  if (prev && last.length < 4) return normalize(`${prev}_${last}`);
  return normalize(last);
}

/** Extract concept with canonicalization (domain + title + first action → canonical stem when possible). */
function extractConcept(artifact: KBv24Artifact): string {
  const domain = (artifact.semantic?.domain ?? "").trim();
  const title = (artifact.identity?.title ?? "").trim();
  const steps = artifact.payload?.inline_artifact?.steps ?? [];
  const firstAction =
    steps.length > 0 && typeof steps[0] === "object" && steps[0] !== null && "action" in steps[0]
      ? (steps[0] as StructuredStep).action ?? ""
      : "";
  const fallback = conceptFromDomain(artifact);
  return canonicalConcept(domain, title, firstAction) || fallback;
}


/** Extract method from step actions (procedure/strategy). */
function extractMethod(artifact: KBv24Artifact): string {
  const steps = artifact.payload?.inline_artifact?.steps ?? [];
  const actions: string[] = [];
  for (const s of steps) {
    if (typeof s === "object" && s != null && "action" in s) {
      const a = (s as StructuredStep).action?.trim();
      if (a) actions.push(a);
    }
  }
  if (actions.length === 0) {
    const claim = (artifact.claim?.statement ?? "").toLowerCase();
    const using = /using\s+(\w+(?:\s+\w+)?)/.exec(claim);
    if (using) return normalize(using[1]);
    const by = /by\s+(\w+(?:\s+\w+)?)/.exec(claim);
    if (by) return normalize(by[1]);
    return "general";
  }
  if (actions.length === 1) return normalize(actions[0]);
  return normalize(`${actions[0]}_${actions[actions.length - 1]}`);
}

/** Extract constraint from validation or claim (conditions/limits). */
function extractConstraint(artifact: KBv24Artifact): string {
  const v = artifact.validation;
  if (v?.metrics?.length && v.metrics[0]) return normalize(String(v.metrics[0]));
  if (v?.failure_conditions?.length && v.failure_conditions[0]) {
    const raw = v.failure_conditions[0];
    const first = (typeof raw === "string" ? raw : (raw as { condition: string }).condition ?? "").toLowerCase();
    const words = first.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean).slice(0, 3);
    return normalize(words.join("_"));
  }
  if (v?.success_conditions?.length && v.success_conditions[0]) {
    const raw = v.success_conditions[0];
    const first = (typeof raw === "string" ? raw : (raw as { condition: string }).condition ?? "").toLowerCase();
    const words = first.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2);
    return normalize(words.join("_"));
  }
  const claim = (artifact.claim?.statement ?? "").toLowerCase();
  const toMatch = /\bto\s+(\w+(?:\s+\w+)?)/.exec(claim);
  if (toMatch) return normalize(toMatch[1]);
  const underMatch = /\bunder\s+(\w+(?:\s+\w+)?)/.exec(claim);
  if (underMatch) return normalize(underMatch[1]);
  const forMatch = /\bfor\s+(\w+(?:\s+\w+)?)/.exec(claim);
  if (forMatch) return normalize(forMatch[1]);
  return "general";
}

export interface KnowledgeTriangle {
  concept: string;
  method: string;
  constraint: string;
}

/** Extract (concept, method, constraint) from an artifact. */
export function extractTriangle(artifact: KBv24Artifact): KnowledgeTriangle {
  return {
    concept: extractConcept(artifact),
    method: extractMethod(artifact),
    constraint: extractConstraint(artifact),
  };
}

/** Stable key for registry and duplicate check. */
export function triangleKey(concept: string, method: string, constraint: string): string {
  return `${normalize(concept)}|${normalize(method)}|${normalize(constraint)}`;
}

/** Key from artifact. */
export function triangleKeyFromArtifact(artifact: KBv24Artifact): string {
  const t = extractTriangle(artifact);
  return triangleKey(t.concept, t.method, t.constraint);
}

/** Build set of all triangle keys in the queue (for duplicate detection). */
export function buildTriangleRegistry(records: QueueRecord[]): Set<string> {
  const set = new Set<string>();
  for (const r of records) {
    if (r.artifact) {
      const key = triangleKeyFromArtifact(r.artifact);
      set.add(key);
    }
  }
  return set;
}

/**
 * Returns true if artifact's triangle is already in the registry (duplicate).
 * For derived artifacts, pass parents to also reject when triangle equals a parent's.
 */
export function isDuplicateTriangle(
  artifact: KBv24Artifact,
  registry: Set<string>,
  parentRecords?: QueueRecord[]
): boolean {
  const key = triangleKeyFromArtifact(artifact);
  if (registry.has(key)) return true;
  if (parentRecords?.length) {
    for (const p of parentRecords) {
      if (p.artifact && triangleKeyFromArtifact(p.artifact) === key) return true;
    }
  }
  return false;
}

/** Add artifact's triangle to registry (call after accepting). */
export function addTriangleToRegistry(artifact: KBv24Artifact, registry: Set<string>): void {
  registry.add(triangleKeyFromArtifact(artifact));
}
