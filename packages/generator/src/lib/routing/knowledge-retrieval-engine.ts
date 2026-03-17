/**
 * Knowledge Retrieval & Ranking Engine (KRRE).
 * Determines which KBs, artifacts, and ontology concepts should load for a task.
 * Pipeline: task → concept extraction → ontology lookup → candidate KB retrieval →
 * artifact retrieval → ranking → top-K selection.
 */

import type { QueueRecord } from "../core/builder.js";
import { routeTaskToCapabilities, ROUTER_MIN_CONFIDENCE } from "./capability-router.js";
import { buildCapabilityIndex, getRecordsForCapabilities, CAPABILITY_CLUSTERS } from "./capability-clusters.js";
import { getProceduralQualityScore } from "./capability-routing-pipeline.js";
import {
  CONCEPT_TAXONOMY,
  getConceptIdsForDomainSignal,
  getRelatedConcepts,
  getSuggestedArtifactsForConcept,
} from "../ontology/concept-taxonomy.js";

export interface RetrievalCandidate {
  kb_hash: string;
  title: string;
  domain: string;
  score: number;
  concept_overlap?: number;
  domain_match?: number;
  procedural_quality?: number;
  artifact_connections?: number;
}

export interface RetrievalResult {
  task: string;
  concepts: string[];
  related_concepts: string[];
  kb_candidates: RetrievalCandidate[];
  artifacts: string[];
  /** Capabilities routed for this task (for debugging). */
  routed_capabilities: { capability: string; score: number }[];
}

const DEFAULT_TOP_K = 20;
const DEFAULT_TOP_ARTIFACTS = 15;
const WEIGHTS = {
  concept_overlap: 0.35,
  domain_match: 0.25,
  procedural_quality: 0.2,
  artifact_connections: 0.2,
};

/** Extract concept IDs from task text: keyword match on concept name/description. */
function extractConceptsFromTaskText(task: string): string[] {
  const t = (task ?? "").toLowerCase();
  const words = t.split(/\s+/).filter((w) => w.length > 2);
  const out = new Set<string>();
  for (const c of CONCEPT_TAXONOMY) {
    const name = (c.name ?? "").toLowerCase();
    const desc = (c.description ?? "").toLowerCase();
    const id = c.concept_id.toLowerCase();
    for (const w of words) {
      if (name.includes(w) || desc.includes(w) || id.includes(w.replace(/\s/g, "_"))) {
        out.add(c.concept_id);
        break;
      }
    }
  }
  return [...out];
}

/** Get concept IDs implied by routed capabilities (via cluster domain prefixes). */
function conceptsFromRoutedCapabilities(routed: { capability: string; score: number }[]): string[] {
  const domains = new Set<string>();
  for (const r of routed) {
    const prefixes = CAPABILITY_CLUSTERS[r.capability as keyof typeof CAPABILITY_CLUSTERS];
    if (prefixes) for (const p of prefixes) domains.add(p.trim().toLowerCase());
  }
  const concepts = new Set<string>();
  for (const d of domains) {
    for (const cid of getConceptIdsForDomainSignal(d)) concepts.add(cid);
  }
  return [...concepts];
}

/** Concept overlap between task concepts and KB. Uses semantic.concepts when present, else domain-inferred. */
function conceptOverlap(
  taskConcepts: Set<string>,
  kbConceptsExplicit: string[] | undefined,
  kbDomain: string
): number {
  const kbConcepts = new Set(
    kbConceptsExplicit?.length ? kbConceptsExplicit : getConceptIdsForDomainSignal(kbDomain)
  );
  if (kbConcepts.size === 0) return 0;
  let match = 0;
  for (const c of taskConcepts) if (kbConcepts.has(c)) match++;
  return taskConcepts.size > 0 ? match / Math.max(taskConcepts.size, kbConcepts.size) : 0;
}

/** Domain match: 1 if this KB's domain is in the routed capability set. */
function domainMatchScore(domain: string, routedCapabilities: string[]): number {
  const d = (domain ?? "").toLowerCase();
  for (const cap of routedCapabilities) {
    const prefixes = CAPABILITY_CLUSTERS[cap as keyof typeof CAPABILITY_CLUSTERS];
    if (!prefixes) continue;
    for (const p of prefixes) {
      const prefix = p.trim().toLowerCase();
      if (d === prefix || d.startsWith(prefix + ".")) return 1;
    }
  }
  return 0;
}

/** Artifact connection score: 0–1 from artifact_refs count. */
function artifactScore(record: QueueRecord): number {
  const refs = (record.artifact as { artifact_refs?: unknown[] })?.artifact_refs ?? [];
  const n = refs.length;
  if (n === 0) return 0;
  return Math.min(1, 0.5 + 0.5 * (n / 3));
}

/**
 * Run the full retrieval pipeline: task → concepts → candidate KBs → ranking → top-K.
 */
export function retrieve(
  task: string,
  pool: QueueRecord[],
  options: { topK?: number; topArtifacts?: number; minCapabilityScore?: number } = {}
): RetrievalResult {
  const topK = options.topK ?? DEFAULT_TOP_K;
  const topArtifacts = options.topArtifacts ?? DEFAULT_TOP_ARTIFACTS;
  const minScore = options.minCapabilityScore ?? ROUTER_MIN_CONFIDENCE;

  const routed = routeTaskToCapabilities(task, minScore);
  const taskConceptsSet = new Set<string>([
    ...extractConceptsFromTaskText(task),
    ...conceptsFromRoutedCapabilities(routed),
  ]);
  const taskConcepts = [...taskConceptsSet];

  const index = buildCapabilityIndex(pool);
  const capabilityNames = routed.map((r) => r.capability);
  const candidates = getRecordsForCapabilities(index, capabilityNames);

  if (candidates.length === 0) {
    return {
      task,
      concepts: taskConcepts,
      related_concepts: [],
      kb_candidates: [],
      artifacts: [...new Set(taskConcepts.flatMap((c) => getSuggestedArtifactsForConcept(c)))].slice(0, topArtifacts),
      routed_capabilities: routed,
    };
  }

  const scored: RetrievalCandidate[] = [];
  let maxProc = 0;
  for (const r of candidates) {
    const proc = getProceduralQualityScore(r);
    if (proc > maxProc) maxProc = proc;
  }
  for (const r of candidates) {
    const domain = r.domain ?? (r.artifact as { semantic?: { domain?: string; concepts?: string[] } })?.semantic?.domain ?? "";
    const explicitConcepts = (r.artifact as { semantic?: { concepts?: string[] } })?.semantic?.concepts;
    const co = conceptOverlap(taskConceptsSet, explicitConcepts, domain);
    const dm = domainMatchScore(domain, capabilityNames);
    const pq = maxProc > 0 ? getProceduralQualityScore(r) / maxProc : 0;
    const ac = artifactScore(r);
    const score =
      WEIGHTS.concept_overlap * co +
      WEIGHTS.domain_match * dm +
      WEIGHTS.procedural_quality * pq +
      WEIGHTS.artifact_connections * ac;

    scored.push({
      kb_hash: r.kbHash,
      title: (r.artifact as { identity?: { title?: string } })?.identity?.title ?? "Untitled",
      domain,
      score,
      concept_overlap: co,
      domain_match: dm,
      procedural_quality: pq,
      artifact_connections: ac,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const topKBs = scored.slice(0, topK);

  const artifactSet = new Set<string>();
  for (const c of taskConcepts) {
    for (const a of getSuggestedArtifactsForConcept(c)) artifactSet.add(a);
  }
  for (const k of topKBs) {
    const rec = candidates.find((r) => r.kbHash === k.kb_hash);
    if (rec) {
      const refs = (rec.artifact as { artifact_refs?: { uri?: string; label?: string; type?: string }[] })?.artifact_refs ?? [];
      for (const ref of refs) {
        const id = ref.uri || ref.label || ref.type;
        if (id) artifactSet.add(id);
      }
    }
  }
  const related = new Set<string>();
  for (const c of taskConcepts) {
    for (const r of getRelatedConcepts(c)) related.add(r);
  }

  return {
    task,
    concepts: taskConcepts,
    related_concepts: [...related].slice(0, 30),
    kb_candidates: topKBs,
    artifacts: [...artifactSet].slice(0, topArtifacts),
    routed_capabilities: routed,
  };
}
