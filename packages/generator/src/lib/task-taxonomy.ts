/**
 * Universal Task Taxonomy for Engineering & STEM (~1500 task types).
 * Maps task domains/categories to KB clusters that should attach for routing and knowledge orchestration.
 * Use: Task Classifier → Task Type → attach_kb_clusters → Load KB procedures.
 */

export interface TaskTaxonomyEntry {
  task_id: string;
  domain: string;
  category: string;
  description: string;
  /** Capability/cluster names to attach (match CAPABILITY_CLUSTERS keys). */
  attach_kb_clusters: string[];
  priority?: "high" | "medium" | "low";
}

/**
 * Task type → KB clusters to attach.
 * When the capability router classifies a task into a domain, these clusters are used to restrict retrieval.
 */
export const TASK_TO_KB_CLUSTERS: Record<string, string[]> = {
  // Web engineering — full bundle for web/frontend/backend/SaaS/API tasks
  web_application_design: [
    "WebEngineering",
    "Architecture",
    "Frontend",
    "Backend",
    "Security",
    "Performance",
    "Observability",
    "Testing",
    "DevOps",
    "Documentation",
    "UX",
  ],
  frontend_interface: [
    "WebEngineering",
    "Frontend",
    "FrontendDeep",
    "UX",
    "Performance",
    "Testing",
    "Observability",
  ],
  backend_service: [
    "WebEngineering",
    "Backend",
    "Architecture",
    "Security",
    "DataSystems",
    "Observability",
    "Testing",
    "DevOps",
  ],
  rest_api: [
    "WebEngineering",
    "Backend",
    "Architecture",
    "Security",
    "Documentation",
    "Testing",
  ],
  saas_platform: [
    "WebEngineering",
    "Architecture",
    "Frontend",
    "Backend",
    "Security",
    "DevOps",
    "Observability",
    "Performance",
  ],
  dashboard_ui: [
    "WebEngineering",
    "Frontend",
    "FrontendDeep",
    "UX",
    "Performance",
    "Observability",
  ],
  fullstack_web: [
    "WebEngineering",
    "Architecture",
    "Frontend",
    "Backend",
    "Security",
    "Performance",
    "Testing",
    "DevOps",
    "Observability",
    "Documentation",
    "UX",
  ],

  // Software / distributed / security / data (align with existing clusters)
  software_architecture: ["Architecture", "CodeQuality", "Documentation"],
  distributed_systems: ["Architecture", "Streaming", "Observability", "DevOps"],
  security_engineering: ["Security", "Architecture", "Testing"],
  data_engineering: ["DataSystems", "Streaming", "Observability", "DevOps"],
  ml_ai_pipeline: ["ML", "DataSystems", "Observability", "Testing"],
  devops_deployment: ["DevOps", "Observability", "Testing", "Documentation"],
  testing_qa: ["Testing", "Observability", "CodeQuality"],
  observability_monitoring: ["Observability", "DevOps", "Testing"],
};

/**
 * Get KB cluster names to attach for a given task type (e.g. from a task classifier).
 * Returns empty array if task_type unknown.
 */
export function getKbClustersForTaskType(task_type: string): string[] {
  const key = (task_type ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  return TASK_TO_KB_CLUSTERS[key] ?? [];
}

/**
 * Check if a task string looks like a web-related task (for routing).
 * Used to decide whether to attach WebEngineering + Frontend + Backend clusters.
 */
export function isWebRelatedTask(task: string): boolean {
  const t = (task ?? "").toLowerCase();
  const webKeywords = [
    "web application",
    "web app",
    "frontend",
    "user interface",
    "ui ",
    "react",
    "vue",
    "angular",
    "dashboard",
    "rest api",
    "graphql",
    "saas",
    "full-stack",
    "fullstack",
    "web page",
    "web platform",
    "api service",
    "backend service",
    "responsive",
    "single page",
    "spa",
  ];
  return webKeywords.some((kw) => t.includes(kw));
}
