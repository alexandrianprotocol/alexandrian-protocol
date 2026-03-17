/**
 * Analyze staged KB seeds to determine which should reference IPFS artifacts.
 * Run this first to see which artifact libraries will have the highest leverage.
 *
 * Signals: large enumerations, standards/guidelines, UI/API/distributed/cloud/DevOps/security patterns.
 * Output: per-seed flags, domain counts, and suggested artifact types for prioritization.
 */

import type { KBv24Artifact } from "../types/artifact.js";
import type { QueueRecord } from "./core/builder.js";
import { ARTIFACT_LIBRARY, signalKindToDomain, getArtifactsByDomain } from "./artifacts/artifact-library.js";
import type { ArtifactDomain } from "./artifacts/artifact-library.js";

export interface SeedArtifactSignal {
  kind: "large_list" | "standards" | "ui_patterns" | "api_patterns" | "distributed_patterns" | "cloud_patterns" | "devops_patterns" | "security_patterns";
  detail?: string;
}

export interface SeedArtifactCandidate {
  kbHash: string;
  domain: string;
  title: string;
  requires_artifact: boolean;
  suggested_artifact_names: string[];
  signals: SeedArtifactSignal[];
  already_has_refs: boolean;
}

export interface ArtifactAnalysisResult {
  total: number;
  with_artifact_refs: number;
  candidates: SeedArtifactCandidate[];
  by_domain: Record<string, { total: number; candidates: number; suggested: Record<string, number> }>;
  by_suggested_artifact: Record<string, number>;
}

const STANDARDS_KEYWORDS = /\b(standard|guideline|convention|rule|best practice|checklist|criteria)\b/i;
const UI_KEYWORDS = /\b(component|layout|form|button|navigation|design token|spacing|color|accessibility|a11y|responsive|breakpoint|typography|ui |ux |frontend|widget|modal|dropdown)\b/i;
const API_KEYWORDS = /\b(api|rest|http|status code|error code|versioning|rate limit|webhook|resource naming|graphql)\b/i;
const DISTRIBUTED_KEYWORDS = /\b(distributed|resilience|circuit breaker|saga|cqrs|message queue|stream|event.driven|consistency|service discovery|load balanc|replication)\b/i;
const CLOUD_KEYWORDS = /\b(kubernetes|autoscal|multi.region|cdn|serverless|container|terraform|infrastructure)\b/i;
const DEVOPS_KEYWORDS = /\b(ci\/cd|deployment|observability|incident|runbook|environment variable|logging|trace|metric|alert)\b/i;
const SECURITY_KEYWORDS = /\b(security|encryption|secret|input validation|authentication|authorization|header|cors|csrf)\b/i;
const LARGE_LIST_SIGNALS = /\b(list|enumeration|set of|catalog|library|inventory)\b/i;

function getSearchableText(artifact: KBv24Artifact): string {
  const parts: string[] = [];
  const id = artifact.identity;
  if (id?.title) parts.push(id.title);
  const sem = artifact.semantic;
  if (sem?.summary) parts.push(sem.summary);
  if (sem?.domain) parts.push(sem.domain);
  if (Array.isArray(sem?.tags)) parts.push((sem.tags as string[]).join(" "));
  const claim = artifact.claim;
  if (claim?.statement) parts.push(claim.statement);
  const steps = artifact.payload?.inline_artifact?.steps;
  if (Array.isArray(steps)) {
    for (const s of steps) {
      if (typeof s === "string") parts.push(s);
      else if (s && typeof s === "object" && "action" in s) parts.push((s as { action?: string }).action ?? "");
    }
  }
  return parts.join(" ").toLowerCase();
}

function getDomainCluster(domain: string): ArtifactDomain | "web" | "other" {
  const d = domain.toLowerCase();
  if (d.includes("frontend") || d.includes("web.ux") || d.includes("web.frontend") || d.includes("ui") || d.includes("layout") || d.includes("accessibility")) return "ui_ux";
  if (d.includes("api") || d.includes("backend") || d.includes("rest") || d.includes("graphql")) return "api_backend";
  if (d.includes("distributed") || d.includes("messaging") || d.includes("stream") || d.includes("resilience")) return "distributed";
  if (d.includes("cloud") || d.includes("kubernetes") || d.includes("infrastructure") || d.includes("terraform")) return "cloud";
  if (d.includes("devops") || d.includes("deploy") || d.includes("observability") || d.includes("incident") || d.includes("runbook")) return "devops";
  if (d.includes("security") || d.includes("auth") || d.includes("encryption")) return "security";
  if (d.includes("web.")) return "web";
  return "other";
}

/** Suggest artifact names from signals and domain cluster. */
function suggestArtifacts(signals: SeedArtifactSignal[], domainCluster: ArtifactDomain | "web" | "other"): string[] {
  const names = new Set<string>();
  for (const s of signals) {
    const artDomain = signalKindToDomain(s.kind);
    if (artDomain) {
      getArtifactsByDomain(artDomain).slice(0, 4).forEach((n) => names.add(n));
    }
  }
  if (domainCluster !== "web" && domainCluster !== "other") {
    getArtifactsByDomain(domainCluster).slice(0, 3).forEach((n) => names.add(n));
  }
  if (domainCluster === "web") {
    getArtifactsByDomain("ui_ux").slice(0, 3).forEach((n) => names.add(n));
  }
  return [...names];
}

/** Analyze one artifact for artifact-ref signals. */
export function analyzeOneSeed(artifact: KBv24Artifact): { requires_artifact: boolean; signals: SeedArtifactSignal[]; suggested_artifact_names: string[] } {
  const text = getSearchableText(artifact);
  const signals: SeedArtifactSignal[] = [];

  if (STANDARDS_KEYWORDS.test(text)) signals.push({ kind: "standards" });
  if (UI_KEYWORDS.test(text)) signals.push({ kind: "ui_patterns" });
  if (API_KEYWORDS.test(text)) signals.push({ kind: "api_patterns" });
  if (DISTRIBUTED_KEYWORDS.test(text)) signals.push({ kind: "distributed_patterns" });
  if (CLOUD_KEYWORDS.test(text)) signals.push({ kind: "cloud_patterns" });
  if (DEVOPS_KEYWORDS.test(text)) signals.push({ kind: "devops_patterns" });
  if (SECURITY_KEYWORDS.test(text)) signals.push({ kind: "security_patterns" });

  const steps = artifact.payload?.inline_artifact?.steps ?? [];
  const stepCount = Array.isArray(steps) ? steps.length : 0;
  const validation = artifact.validation;
  const totalListItems = (validation?.success_conditions?.length ?? 0) + (validation?.failure_conditions?.length ?? 0) + (validation?.metrics?.length ?? 0);
  if (stepCount > 6 || totalListItems > 10 || LARGE_LIST_SIGNALS.test(text)) {
    signals.push({ kind: "large_list", detail: stepCount > 6 ? `steps=${stepCount}` : totalListItems > 10 ? `validation_items=${totalListItems}` : "keyword" });
  }

  const requires_artifact = signals.length > 0;
  const domainCluster = getDomainCluster((artifact.semantic?.domain as string) ?? "");
  const suggested_artifact_names = suggestArtifacts(signals, domainCluster);

  return { requires_artifact, signals, suggested_artifact_names };
}

/** Run analysis on all records in the queue. */
export function analyzeSeedsForArtifacts(records: QueueRecord[]): ArtifactAnalysisResult {
  const candidates: SeedArtifactCandidate[] = [];
  const by_domain: Record<string, { total: number; candidates: number; suggested: Record<string, number> }> = {};
  const by_suggested_artifact: Record<string, number> = {};
  let with_artifact_refs = 0;

  for (const record of records) {
    const artifact = record.artifact as KBv24Artifact | undefined;
    if (!artifact) continue;

    const domain = (artifact.semantic?.domain as string) ?? record.domain ?? "";
    const title = (artifact.identity?.title as string) ?? "Untitled";
    const existingRefs = artifact.artifact_refs;
    const already_has_refs = Array.isArray(existingRefs) && existingRefs.length > 0;
    if (already_has_refs) with_artifact_refs++;

    const { requires_artifact, signals, suggested_artifact_names } = analyzeOneSeed(artifact);

    candidates.push({
      kbHash: record.kbHash,
      domain,
      title,
      requires_artifact,
      suggested_artifact_names,
      signals,
      already_has_refs,
    });

    if (!by_domain[domain]) {
      by_domain[domain] = { total: 0, candidates: 0, suggested: {} };
    }
    by_domain[domain].total++;
    if (requires_artifact) {
      by_domain[domain].candidates++;
      for (const name of suggested_artifact_names) {
        by_domain[domain].suggested[name] = (by_domain[domain].suggested[name] ?? 0) + 1;
        by_suggested_artifact[name] = (by_suggested_artifact[name] ?? 0) + 1;
      }
    }
  }

  return {
    total: records.length,
    with_artifact_refs,
    candidates,
    by_domain,
    by_suggested_artifact,
  };
}

/** Print a concise summary to console. */
export function printArtifactAnalysisSummary(result: ArtifactAnalysisResult): void {
  const req = result.candidates.filter((c) => c.requires_artifact).length;
  console.log("\n--- Seed analysis for IPFS artifact refs ---");
  console.log(`Total seeds: ${result.total}`);
  console.log(`Already have artifact_refs: ${result.with_artifact_refs}`);
  console.log(`Candidates (should reference artifact): ${req}`);
  console.log("\nBy suggested artifact (top 25):");
  const sorted = Object.entries(result.by_suggested_artifact).sort((a, b) => b[1] - a[1]).slice(0, 25);
  for (const [name, count] of sorted) {
    console.log(`  ${name}: ${count}`);
  }
  console.log("\nBy domain (domains with most candidates):");
  const domainRows = Object.entries(result.by_domain)
    .map(([domain, data]) => ({ domain, ...data }))
    .filter((d) => d.candidates > 0)
    .sort((a, b) => b.candidates - a.candidates)
    .slice(0, 30);
  for (const row of domainRows) {
    console.log(`  ${row.domain}: total=${row.total} candidates=${row.candidates}`);
  }
}
