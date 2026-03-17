/**
 * Engineering Lifecycle Ontology — stages from ideation to maintenance.
 * Used by documentation artifacts and KB classification to encode full software engineering coverage.
 */

export type LifecycleStage =
  | "ideation"
  | "requirements"
  | "design"
  | "implementation"
  | "testing"
  | "deployment"
  | "monitoring"
  | "maintenance";

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  "ideation",
  "requirements",
  "design",
  "implementation",
  "testing",
  "deployment",
  "monitoring",
  "maintenance",
];

/** Domain/tag keywords that suggest a lifecycle stage. */
const STAGE_SIGNALS: Record<LifecycleStage, string[]> = {
  ideation: ["ideation", "feature idea", "product", "discovery", "brainstorm", "roadmap"],
  requirements: ["requirements", "prd", "spec", "user story", "acceptance", "scope"],
  design: ["design", "architecture", "blueprint", "ddd", "bounded context", "system design", "api design", "ui design"],
  implementation: ["implementation", "develop", "code", "build", "refactor", "integrate", "api", "frontend", "backend"],
  testing: ["testing", "test", "qa", "e2e", "integration test", "unit test", "regression", "fuzz", "chaos"],
  deployment: ["deployment", "deploy", "ci/cd", "release", "rollout", "infrastructure", "devops"],
  monitoring: ["monitoring", "observability", "metrics", "logging", "tracing", "alert", "sre"],
  maintenance: ["maintenance", "support", "incident", "postmortem", "technical debt", "refactor", "upgrade"],
};

/**
 * Infer the primary lifecycle stage for a KB from its domain and tags.
 * Returns the best-matching stage or "implementation" as default.
 */
export function inferLifecycleStage(domain: string, tags: string[]): LifecycleStage {
  const text = `${(domain ?? "").toLowerCase()} ${(tags ?? []).join(" ").toLowerCase()}`;
  let best: LifecycleStage = "implementation";
  let bestScore = 0;
  for (const [stage, keywords] of Object.entries(STAGE_SIGNALS)) {
    const score = keywords.filter((k) => text.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = stage as LifecycleStage;
    }
  }
  return best;
}
