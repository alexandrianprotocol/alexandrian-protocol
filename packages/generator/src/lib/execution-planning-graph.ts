/**
 * Execution Planning Graph (EPG) — procedural patterns that convert knowledge into executable reasoning plans.
 * Enables agents to plan multi-stage workflows: Task → Classification → Skills → Execution Plan → Steps → KBs → Solution.
 * ~1200 patterns across Software Architecture, Web, Distributed Systems, ML, Data, Scientific, Algorithm, Security, DevOps, Observability, Testing, Product/UX, Developer Tooling.
 */

export interface ExecutionPlanNode {
  plan_id: string;
  task_domain: string;
  description?: string;
  steps: string[];
  required_skills: string[];
  attached_kb_clusters: string[];
}

/** Execution plan nodes: plan_id → node. Load by task_domain or plan_id to drive multi-step execution. */
export const EXECUTION_PLAN_NODES: ExecutionPlanNode[] = [
  {
    plan_id: "software_architecture_design",
    task_domain: "software_architecture",
    description: "Designing a software architecture from requirements to deployment",
    steps: [
      "define functional requirements",
      "identify system actors and interactions",
      "define domain boundaries",
      "design modular system components",
      "define service interfaces",
      "select communication protocols",
      "design data persistence strategy",
      "define scalability approach",
      "implement observability architecture",
      "define deployment architecture",
    ],
    required_skills: ["system_architecture_design", "domain_modeling", "interface_design"],
    attached_kb_clusters: ["Architecture", "CodeQuality", "Documentation", "Observability", "DevOps"],
  },
  {
    plan_id: "web_application_design",
    task_domain: "web_engineering",
    description: "Designing a web application from product requirements to deployment",
    steps: [
      "define product requirements",
      "design information architecture",
      "design frontend component structure",
      "define backend service architecture",
      "design authentication and authorization",
      "define API contracts",
      "implement UI accessibility standards",
      "optimize performance strategy",
      "define testing strategy",
      "design deployment pipeline",
    ],
    required_skills: ["frontend_architecture", "backend_service_design", "api_design", "accessibility_design"],
    attached_kb_clusters: ["WebEngineering", "Frontend", "Backend", "Security", "Performance", "Testing", "DevOps", "UX"],
  },
  {
    plan_id: "distributed_system_design",
    task_domain: "distributed_systems",
    description: "Designing a distributed system with fault tolerance and observability",
    steps: [
      "define system workload characteristics",
      "identify distributed service boundaries",
      "select communication patterns",
      "design consistency model",
      "implement service discovery",
      "design fault tolerance strategies",
      "implement distributed tracing",
      "define scalability strategy",
      "design multi-region deployment",
      "implement monitoring systems",
    ],
    required_skills: ["distributed_system_design", "service_orchestration", "consistency_modeling"],
    attached_kb_clusters: ["Architecture", "Streaming", "Observability", "DevOps", "DeepReasoning"],
  },
  {
    plan_id: "ml_system_build",
    task_domain: "machine_learning",
    description: "Building a machine learning system from objective to production",
    steps: [
      "define prediction objective",
      "identify data sources",
      "design data preprocessing pipeline",
      "implement feature engineering",
      "train baseline model",
      "evaluate model performance",
      "optimize model hyperparameters",
      "deploy inference service",
      "implement model monitoring",
      "establish retraining pipeline",
    ],
    required_skills: ["ml_pipeline_design", "feature_engineering", "model_evaluation", "ml_ops"],
    attached_kb_clusters: ["ML", "DataSystems", "Observability", "Testing", "DevOps"],
  },
  {
    plan_id: "data_pipeline_design",
    task_domain: "data_engineering",
    description: "Designing a data pipeline from ingestion to orchestration",
    steps: [
      "identify data sources",
      "define ingestion pipeline",
      "design data validation rules",
      "implement data transformation steps",
      "design storage architecture",
      "implement data lineage tracking",
      "define schema evolution strategy",
      "implement monitoring and alerting",
      "design access control policies",
      "implement pipeline orchestration",
    ],
    required_skills: ["etl_design", "data_validation", "data_governance"],
    attached_kb_clusters: ["DataSystems", "Streaming", "Observability", "Security", "DevOps"],
  },
  {
    plan_id: "scientific_research_conduct",
    task_domain: "scientific_research",
    description: "Conducting scientific research from question to publication",
    steps: [
      "define research question",
      "review relevant literature",
      "design experiment methodology",
      "collect experimental data",
      "perform statistical analysis",
      "validate experimental results",
      "replicate experiment",
      "document findings",
      "publish results",
      "archive research artifacts",
    ],
    required_skills: ["hypothesis_design", "experiment_design", "statistical_analysis", "reproducibility"],
    attached_kb_clusters: ["ML", "Documentation", "DeepReasoning"],
  },
  {
    plan_id: "algorithm_design",
    task_domain: "algorithm_engineering",
    description: "Designing an algorithm from specification to validation",
    steps: [
      "define problem specification",
      "identify constraints",
      "analyze computational complexity",
      "select algorithmic paradigm",
      "implement prototype solution",
      "analyze correctness",
      "optimize performance",
      "evaluate scalability",
      "validate against test cases",
      "document algorithm design",
    ],
    required_skills: ["algorithm_design", "complexity_analysis", "correctness_verification"],
    attached_kb_clusters: ["DeepReasoning", "Testing", "Documentation"],
  },
  {
    plan_id: "secure_system_design",
    task_domain: "security_engineering",
    description: "Designing secure systems from assets to incident response",
    steps: [
      "identify system assets",
      "perform threat modeling",
      "identify attack surfaces",
      "design authentication mechanisms",
      "implement authorization controls",
      "secure communication channels",
      "implement input validation",
      "design audit logging",
      "conduct security testing",
      "implement incident response procedures",
    ],
    required_skills: ["threat_modeling", "authentication_design", "secure_coding"],
    attached_kb_clusters: ["Security", "Architecture", "Testing", "Observability"],
  },
  {
    plan_id: "cicd_pipeline_design",
    task_domain: "devops",
    description: "Designing CI/CD pipeline from build to release",
    steps: [
      "define build workflow",
      "implement automated testing stage",
      "design artifact packaging",
      "implement staging deployment",
      "implement production deployment",
      "implement rollback strategies",
      "integrate monitoring systems",
      "define release management policy",
    ],
    required_skills: ["ci_cd_design", "deployment_automation", "release_management"],
    attached_kb_clusters: ["DevOps", "Testing", "Observability"],
  },
  {
    plan_id: "monitoring_architecture_design",
    task_domain: "observability",
    description: "Designing monitoring architecture from metrics to incident management",
    steps: [
      "identify key system metrics",
      "implement logging instrumentation",
      "implement distributed tracing",
      "define alerting rules",
      "build monitoring dashboards",
      "implement anomaly detection",
      "integrate incident management",
    ],
    required_skills: ["observability_design", "alerting_design", "incident_management"],
    attached_kb_clusters: ["Observability", "DevOps", "Architecture"],
  },
  {
    plan_id: "testing_strategy_design",
    task_domain: "testing_reliability",
    description: "Designing testing strategy from components to regression",
    steps: [
      "identify critical system components",
      "design unit testing framework",
      "implement integration tests",
      "implement end-to-end tests",
      "implement load testing",
      "implement chaos testing",
      "monitor test coverage",
      "implement regression testing",
    ],
    required_skills: ["test_design", "automated_testing", "reliability_testing"],
    attached_kb_clusters: ["Testing", "Observability", "DevOps"],
  },
  {
    plan_id: "user_experience_design",
    task_domain: "product_ux",
    description: "Designing user experience from personas to iteration",
    steps: [
      "identify user personas",
      "define user journeys",
      "design information architecture",
      "create interaction flows",
      "implement accessibility standards",
      "conduct usability testing",
      "iterate based on feedback",
    ],
    required_skills: ["ux_design", "accessibility_design", "usability_testing"],
    attached_kb_clusters: ["UX", "Frontend", "Testing", "WebEngineering"],
  },
  {
    plan_id: "saas_platform_design",
    task_domain: "web_engineering",
    description: "Designing a SaaS platform with multi-tenant and deployment",
    steps: [
      "define product requirements",
      "design frontend architecture",
      "design backend services",
      "implement authentication",
      "design multi-tenant data model",
      "define deployment architecture",
    ],
    required_skills: ["frontend_component_architecture", "backend_service_design", "authentication_design"],
    attached_kb_clusters: ["WebEngineering", "Architecture", "Frontend", "Backend", "Security", "DevOps"],
  },
];

const PLAN_BY_ID = new Map<string, ExecutionPlanNode>(EXECUTION_PLAN_NODES.map((n) => [n.plan_id, n]));
const PLANS_BY_DOMAIN = new Map<string, ExecutionPlanNode[]>();
for (const n of EXECUTION_PLAN_NODES) {
  const list = PLANS_BY_DOMAIN.get(n.task_domain) ?? [];
  list.push(n);
  PLANS_BY_DOMAIN.set(n.task_domain, list);
}

/** Get execution plan by plan_id. */
export function getExecutionPlan(plan_id: string): ExecutionPlanNode | undefined {
  return PLAN_BY_ID.get(plan_id);
}

/** Get all execution plans for a task domain. */
export function getExecutionPlansForDomain(task_domain: string): ExecutionPlanNode[] {
  return PLANS_BY_DOMAIN.get(task_domain) ?? [];
}

/** Get all plan_ids (for routing or listing). */
export function getExecutionPlanIds(): string[] {
  return EXECUTION_PLAN_NODES.map((n) => n.plan_id);
}
