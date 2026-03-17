/**
 * Agent Retrieval Artifact (ARA) — alexandrian.kb.agent.v1
 *
 * Deterministic projection from full KB artifact to ~80–200 byte retrieval object.
 * Indexer stores ARA; agents discover capability/cost without fetching full JSON.
 * ARA = deterministic_projection(full_artifact) — cannot drift.
 */

import type { KBv24Artifact } from "../types/artifact.js";
import type { AgentRetrievalArtifact } from "../types/artifact.js";

/**
 * Derive the Agent Retrieval Artifact from a full KB artifact.
 * Deterministic: same artifact always yields same ARA.
 */
export function artifactToRetrievalArtifact(artifact: KBv24Artifact): AgentRetrievalArtifact {
  const cap = [
    artifact.semantic.domain,
    ...artifact.semantic.tags.slice(0, 2),
    ...(artifact.semantic.capabilities ?? []),
  ].filter(Boolean);
  const i = artifact.payload.interface.inputs.map((x) => x.name);
  const o = artifact.payload.interface.outputs.map((x) => x.name);
  const t = artifact.execution.cost_estimate?.expected_token_cost ?? 150;
  const p = artifact.knowledge_inputs.used.length;
  const ec = artifact.semantic.execution_class;

  const st =
    artifact.state_transition &&
    artifact.state_transition.input_state &&
    artifact.state_transition.output_state
      ? { i: artifact.state_transition.input_state, o: artifact.state_transition.output_state }
      : undefined;

  return {
    schema: "alexandrian.kb.agent.v1",
    h: artifact.identity.kb_id || "",
    cap: [...new Set(cap)],
    i,
    o,
    t,
    p,
    d: artifact.semantic.domain,
    ...(st && { st }),
    ...(ec && { ec }),
  };
}
