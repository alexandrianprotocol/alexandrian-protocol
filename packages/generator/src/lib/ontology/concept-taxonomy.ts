/**
 * Concept Taxonomy for Engineering — hierarchical ontology with stable identifiers.
 * Format: <DOMAIN>_<CATEGORY>_<CONCEPT>. Supports routing, artifact composition, and KB seed classification.
 *
 * Stabilization: Use a core ontology (~150–300 concepts) first. Focus on domains the system
 * already touches (UI, API, Distributed, Cloud, Security, DevOps, Architecture, Testing).
 * Expand toward ~2000 only after architecture is validated. See docs/STABILIZATION-ROADMAP.md.
 */

export type ConceptTaxonomyDomain =
  | "UI_UX"
  | "API_BACKEND"
  | "DISTRIBUTED_SYSTEMS"
  | "CLOUD_INFRASTRUCTURE"
  | "SECURITY"
  | "DEVOPS"
  | "DATA_ENGINEERING"
  | "AI_SYSTEMS"
  | "SOFTWARE_ARCHITECTURE"
  | "PROGRAMMING"
  | "TESTING_QUALITY"
  | "OBSERVABILITY"
  | "NETWORKING"
  | "PERFORMANCE_ENGINEERING";

export interface ConceptEntry {
  concept_id: string;
  domain: ConceptTaxonomyDomain;
  category: string;
  name: string;
  description: string;
  related_concepts?: string[];
}

export type ConceptRelationshipType = "depends_on" | "applies_to" | "implements" | "specializes" | "related_to";

export interface ConceptRelationship {
  source: string;
  relationship: ConceptRelationshipType;
  target: string;
}

/** Top-level domains for the taxonomy. */
export const CONCEPT_DOMAINS: ConceptTaxonomyDomain[] = [
  "UI_UX",
  "API_BACKEND",
  "DISTRIBUTED_SYSTEMS",
  "CLOUD_INFRASTRUCTURE",
  "SECURITY",
  "DEVOPS",
  "DATA_ENGINEERING",
  "AI_SYSTEMS",
  "SOFTWARE_ARCHITECTURE",
  "PROGRAMMING",
  "TESTING_QUALITY",
  "OBSERVABILITY",
  "NETWORKING",
  "PERFORMANCE_ENGINEERING",
];

function C(
  concept_id: string,
  domain: ConceptTaxonomyDomain,
  category: string,
  name: string,
  description: string,
  related?: string[]
): ConceptEntry {
  return { concept_id, domain, category, name, description, ...(related?.length ? { related_concepts: related } : {}) };
}

// ── UI / UX ─────────────────────────────────────────────────────────────────
const UI_UX_CONCEPTS: ConceptEntry[] = [
  C("UI_COMPONENT_BUTTON", "UI_UX", "component", "Button", "Interactive UI element used to trigger actions"),
  C("UI_COMPONENT_FORM", "UI_UX", "component", "Form", "Container for user input fields and submission"),
  C("UI_COMPONENT_INPUT", "UI_UX", "component", "Input", "Single user input field"),
  C("UI_COMPONENT_MODAL", "UI_UX", "component", "Modal", "Overlay dialog for focused interaction"),
  C("UI_COMPONENT_CARD", "UI_UX", "component", "Card", "Content container with clear boundary"),
  C("UI_COMPONENT_NAVBAR", "UI_UX", "component", "Navbar", "Primary navigation bar"),
  C("UI_COMPONENT_DROPDOWN", "UI_UX", "component", "Dropdown", "Select or menu that expands on trigger"),
  C("UI_COMPONENT_TABLE", "UI_UX", "component", "Table", "Tabular data display"),
  C("UI_COMPONENT_TOOLTIP", "UI_UX", "component", "Tooltip", "Short contextual hint on hover/focus"),
  C("UI_COMPONENT_SIDEBAR", "UI_UX", "component", "Sidebar", "Secondary navigation or context panel"),
  C("UI_COMPONENT_BREADCRUMB", "UI_UX", "component", "Breadcrumb", "Hierarchical navigation trail"),
  C("UI_LAYOUT_GRID", "UI_UX", "layout", "Grid", "CSS Grid layout system"),
  C("UI_LAYOUT_FLEXBOX", "UI_UX", "layout", "Flexbox", "Flexible box layout"),
  C("UI_LAYOUT_RESPONSIVE", "UI_UX", "layout", "Responsive", "Layout that adapts to viewport"),
  C("UI_LAYOUT_BREAKPOINTS", "UI_UX", "layout", "Breakpoints", "Viewport thresholds for layout change"),
  C("UI_LAYOUT_CONTAINER", "UI_UX", "layout", "Container", "Width-constrained content wrapper"),
  C("UI_PATTERN_AUTH_LOGIN", "UI_UX", "pattern", "Login", "Authentication login screen pattern", ["API_AUTH_JWT", "SEC_AUTHENTICATION"]),
  C("UI_PATTERN_SIGNUP", "UI_UX", "pattern", "Signup", "User registration flow"),
  C("UI_PATTERN_DASHBOARD", "UI_UX", "pattern", "Dashboard", "Overview and metrics display"),
  C("UI_PATTERN_NAVIGATION", "UI_UX", "pattern", "Navigation", "Wayfinding and menu structure"),
  C("UI_PATTERN_SEARCH", "UI_UX", "pattern", "Search", "Search input and results"),
  C("UI_PATTERN_ONBOARDING", "UI_UX", "pattern", "Onboarding", "First-time user guidance"),
  C("UI_ACCESSIBILITY_WCAG", "UI_UX", "accessibility", "WCAG", "Web Content Accessibility Guidelines"),
  C("UI_ACCESSIBILITY_CONTRAST", "UI_UX", "accessibility", "Contrast", "Color contrast requirements"),
  C("UI_ACCESSIBILITY_KEYBOARD_NAV", "UI_UX", "accessibility", "Keyboard navigation", "Full operation via keyboard"),
  C("UI_ACCESSIBILITY_SCREEN_READER", "UI_UX", "accessibility", "Screen reader", "Screen reader compatible content"),
  C("UI_DESIGN_TOKENS", "UI_UX", "design", "Design tokens", "Named design values (spacing, color, type)"),
  C("UI_SPACING_SYSTEM", "UI_UX", "design", "Spacing system", "Consistent spacing scale"),
  C("UI_COLOR_SYSTEM", "UI_UX", "design", "Color system", "Palette and semantic colors"),
  C("UI_TYPOGRAPHY_SCALE", "UI_UX", "design", "Typography scale", "Type hierarchy and sizes"),
  C("UI_ICON_SYSTEM", "UI_UX", "design", "Icon system", "Consistent icon set and usage"),
];

// ── API & Backend ───────────────────────────────────────────────────────────
const API_BACKEND_CONCEPTS: ConceptEntry[] = [
  C("API_PROTOCOL_HTTP", "API_BACKEND", "protocol", "HTTP", "Hypertext Transfer Protocol"),
  C("API_PROTOCOL_GRPC", "API_BACKEND", "protocol", "gRPC", "RPC framework over HTTP/2"),
  C("API_PROTOCOL_GRAPHQL", "API_BACKEND", "protocol", "GraphQL", "Query language for APIs"),
  C("API_PROTOCOL_WEBSOCKET", "API_BACKEND", "protocol", "WebSocket", "Full-duplex communication"),
  C("API_PATTERN_REST_RESOURCE", "API_BACKEND", "pattern", "REST resource", "Resource-oriented URL design"),
  C("API_PATTERN_ENDPOINT_VERSIONING", "API_BACKEND", "pattern", "Endpoint versioning", "API version in path or header"),
  C("API_PATTERN_PAGINATION", "API_BACKEND", "pattern", "Pagination", "Paginated list responses"),
  C("API_PATTERN_RATE_LIMITING", "API_BACKEND", "pattern", "Rate limiting", "Request rate limits"),
  C("API_PATTERN_IDEMPOTENCY", "API_BACKEND", "pattern", "Idempotency", "Safe retry via idempotency keys"),
  C("API_PATTERN_WEBHOOK", "API_BACKEND", "pattern", "Webhook", "Event push to client URL"),
  C("API_AUTHENTICATION", "API_BACKEND", "auth", "Authentication", "Verifying identity of clients"),
  C("API_AUTH_JWT", "API_BACKEND", "auth", "JWT", "JSON Web Token authentication"),
  C("API_AUTH_OAUTH", "API_BACKEND", "auth", "OAuth", "OAuth 2.0 delegation"),
  C("API_AUTH_SESSION", "API_BACKEND", "auth", "Session", "Session-based authentication"),
  C("API_ERROR_HANDLING", "API_BACKEND", "behavior", "Error handling", "Structured error responses"),
  C("API_RESPONSE_SCHEMA", "API_BACKEND", "behavior", "Response schema", "Consistent response shape"),
  C("API_INPUT_VALIDATION", "API_BACKEND", "behavior", "Input validation", "Request validation"),
  C("API_REQUEST_ROUTING", "API_BACKEND", "behavior", "Request routing", "Route to handler"),
  C("API_SERVICE_LAYER", "API_BACKEND", "layer", "Service layer", "Business logic layer"),
  C("API_CONTROLLER_LAYER", "API_BACKEND", "layer", "Controller layer", "HTTP handling layer"),
  C("API_REPOSITORY_PATTERN", "API_BACKEND", "layer", "Repository", "Data access abstraction"),
  C("API_SERVICE_DISCOVERY", "API_BACKEND", "layer", "Service discovery", "Discover backend services"),
];

// ── Distributed Systems ────────────────────────────────────────────────────
const DISTRIBUTED_CONCEPTS: ConceptEntry[] = [
  C("DIST_PATTERN_CIRCUIT_BREAKER", "DISTRIBUTED_SYSTEMS", "pattern", "Circuit breaker", "Fail fast when dependency is unhealthy", ["API_SERVICE_LAYER"]),
  C("DIST_PATTERN_BULKHEAD", "DISTRIBUTED_SYSTEMS", "pattern", "Bulkhead", "Isolate resource pools"),
  C("DIST_PATTERN_RETRY", "DISTRIBUTED_SYSTEMS", "pattern", "Retry", "Retry with backoff"),
  C("DIST_PATTERN_SAGA", "DISTRIBUTED_SYSTEMS", "pattern", "Saga", "Distributed transaction pattern"),
  C("DIST_PATTERN_EVENT_SOURCING", "DISTRIBUTED_SYSTEMS", "pattern", "Event sourcing", "State from event log"),
  C("DIST_PATTERN_CQRS", "DISTRIBUTED_SYSTEMS", "pattern", "CQRS", "Command-query responsibility separation"),
  C("DIST_CONSISTENCY_STRONG", "DISTRIBUTED_SYSTEMS", "consistency", "Strong consistency", "Linearizable reads/writes"),
  C("DIST_CONSISTENCY_EVENTUAL", "DISTRIBUTED_SYSTEMS", "consistency", "Eventual consistency", "Convergence after writes stop"),
  C("DIST_CONSISTENCY_CAUSAL", "DISTRIBUTED_SYSTEMS", "consistency", "Causal consistency", "Causally ordered visibility"),
  C("DIST_CONSENSUS_RAFT", "DISTRIBUTED_SYSTEMS", "consensus", "Raft", "Consensus algorithm"),
  C("DIST_CONSENSUS_PAXOS", "DISTRIBUTED_SYSTEMS", "consensus", "Paxos", "Consensus algorithm"),
  C("DIST_QUEUE_MESSAGE", "DISTRIBUTED_SYSTEMS", "messaging", "Message queue", "Asynchronous message queue"),
  C("DIST_STREAM_PROCESSING", "DISTRIBUTED_SYSTEMS", "messaging", "Stream processing", "Continuous event processing"),
  C("DIST_EVENT_BUS", "DISTRIBUTED_SYSTEMS", "messaging", "Event bus", "Pub/sub event distribution"),
  C("DIST_TOPIC_PARTITION", "DISTRIBUTED_SYSTEMS", "messaging", "Topic partition", "Partitioned topic"),
  C("DIST_SERVICE_DISCOVERY", "DISTRIBUTED_SYSTEMS", "infra", "Service discovery", "Dynamic service lookup"),
  C("DIST_LOAD_BALANCING", "DISTRIBUTED_SYSTEMS", "infra", "Load balancing", "Traffic distribution"),
  C("DIST_FAILOVER", "DISTRIBUTED_SYSTEMS", "infra", "Failover", "Switch to standby on failure"),
  C("DIST_REPLICATION", "DISTRIBUTED_SYSTEMS", "infra", "Replication", "Data replication"),
  C("DIST_SHARDING", "DISTRIBUTED_SYSTEMS", "infra", "Sharding", "Horizontal data partitioning"),
];

// ── Cloud Infrastructure ───────────────────────────────────────────────────
const CLOUD_CONCEPTS: ConceptEntry[] = [
  C("CLOUD_PLATFORM_KUBERNETES", "CLOUD_INFRASTRUCTURE", "platform", "Kubernetes", "Container orchestration"),
  C("CLOUD_PLATFORM_DOCKER", "CLOUD_INFRASTRUCTURE", "platform", "Docker", "Container runtime"),
  C("CLOUD_PLATFORM_SERVERLESS", "CLOUD_INFRASTRUCTURE", "platform", "Serverless", "FaaS / serverless runtimes"),
  C("CLOUD_PATTERN_AUTOSCALING", "CLOUD_INFRASTRUCTURE", "pattern", "Autoscaling", "Scale by load"),
  C("CLOUD_PATTERN_MULTI_REGION", "CLOUD_INFRASTRUCTURE", "pattern", "Multi-region", "Deploy across regions"),
  C("CLOUD_PATTERN_HIGH_AVAILABILITY", "CLOUD_INFRASTRUCTURE", "pattern", "High availability", "HA deployment"),
  C("CLOUD_STORAGE_OBJECT", "CLOUD_INFRASTRUCTURE", "storage", "Object storage", "Blob/object storage"),
  C("CLOUD_STORAGE_BLOCK", "CLOUD_INFRASTRUCTURE", "storage", "Block storage", "Block-level storage"),
  C("CLOUD_STORAGE_DATABASE", "CLOUD_INFRASTRUCTURE", "storage", "Database", "Managed database"),
  C("CLOUD_NETWORK_VPC", "CLOUD_INFRASTRUCTURE", "network", "VPC", "Virtual private cloud"),
  C("CLOUD_NETWORK_SUBNET", "CLOUD_INFRASTRUCTURE", "network", "Subnet", "Subnet segmentation"),
  C("CLOUD_NETWORK_LOAD_BALANCER", "CLOUD_INFRASTRUCTURE", "network", "Load balancer", "L4/L7 load balancer"),
  C("CLOUD_NETWORK_CDN", "CLOUD_INFRASTRUCTURE", "network", "CDN", "Content delivery network"),
  C("CLOUD_COMPUTE_CONTAINER", "CLOUD_INFRASTRUCTURE", "compute", "Container", "Container compute"),
  C("CLOUD_COMPUTE_VM", "CLOUD_INFRASTRUCTURE", "compute", "VM", "Virtual machine"),
  C("CLOUD_COMPUTE_FUNCTION", "CLOUD_INFRASTRUCTURE", "compute", "Function", "Serverless function"),
  C("CLOUD_INFRA_TERRAFORM", "CLOUD_INFRASTRUCTURE", "infra", "Terraform", "IaC with Terraform"),
  C("CLOUD_INFRA_IAC", "CLOUD_INFRASTRUCTURE", "infra", "IaC", "Infrastructure as Code"),
];

// ── Security ───────────────────────────────────────────────────────────────
const SECURITY_CONCEPTS: ConceptEntry[] = [
  C("SEC_AUTHENTICATION", "SECURITY", "auth", "Authentication", "Verify identity"),
  C("SEC_AUTHORIZATION", "SECURITY", "auth", "Authorization", "Verify permissions"),
  C("SEC_TOKEN_JWT", "SECURITY", "token", "JWT", "JSON Web Token"),
  C("SEC_TOKEN_OAUTH", "SECURITY", "token", "OAuth", "OAuth tokens"),
  C("SEC_ENCRYPTION_SYMMETRIC", "SECURITY", "encryption", "Symmetric encryption", "Single-key encryption"),
  C("SEC_ENCRYPTION_ASYMMETRIC", "SECURITY", "encryption", "Asymmetric encryption", "Public/private key"),
  C("SEC_ENCRYPTION_TLS", "SECURITY", "encryption", "TLS", "Transport layer security"),
  C("SEC_INPUT_VALIDATION", "SECURITY", "validation", "Input validation", "Validate and sanitize input"),
  C("SEC_OUTPUT_SANITIZATION", "SECURITY", "validation", "Output sanitization", "Escape output"),
  C("SEC_SECRET_MANAGEMENT", "SECURITY", "secrets", "Secret management", "Secure secret storage"),
  C("SEC_KEY_ROTATION", "SECURITY", "secrets", "Key rotation", "Rotate keys periodically"),
  C("SEC_NETWORK_FIREWALL", "SECURITY", "network", "Firewall", "Network firewall"),
  C("SEC_NETWORK_ZERO_TRUST", "SECURITY", "network", "Zero trust", "Zero trust network"),
  C("SEC_SECURITY_HEADERS", "SECURITY", "headers", "Security headers", "CSP, HSTS, etc."),
  C("SEC_RATE_LIMITING", "SECURITY", "behavior", "Rate limiting", "Throttle requests"),
  C("SEC_VULNERABILITY_SCAN", "SECURITY", "assessment", "Vulnerability scan", "Scan for vulns"),
  C("SEC_DEPENDENCY_AUDIT", "SECURITY", "assessment", "Dependency audit", "Audit dependencies"),
];

// ── DevOps ──────────────────────────────────────────────────────────────────
const DEVOPS_CONCEPTS: ConceptEntry[] = [
  C("DEVOPS_PIPELINE_CI", "DEVOPS", "pipeline", "CI", "Continuous integration"),
  C("DEVOPS_PIPELINE_CD", "DEVOPS", "pipeline", "CD", "Continuous deployment"),
  C("DEVOPS_PIPELINE_BUILD", "DEVOPS", "pipeline", "Build", "Build stage"),
  C("DEVOPS_PIPELINE_TEST", "DEVOPS", "pipeline", "Test", "Test stage"),
  C("DEVOPS_DEPLOYMENT_BLUE_GREEN", "DEVOPS", "deployment", "Blue-green", "Blue-green deployment"),
  C("DEVOPS_DEPLOYMENT_CANARY", "DEVOPS", "deployment", "Canary", "Canary release"),
  C("DEVOPS_DEPLOYMENT_ROLLING", "DEVOPS", "deployment", "Rolling", "Rolling update"),
  C("DEVOPS_INFRASTRUCTURE_IAC", "DEVOPS", "infrastructure", "IaC", "Infrastructure as Code"),
  C("DEVOPS_INFRASTRUCTURE_PROVISIONING", "DEVOPS", "infrastructure", "Provisioning", "Resource provisioning"),
  C("DEVOPS_MONITORING", "DEVOPS", "observability", "Monitoring", "System monitoring"),
  C("DEVOPS_LOGGING", "DEVOPS", "observability", "Logging", "Log aggregation"),
  C("DEVOPS_METRICS", "DEVOPS", "observability", "Metrics", "Metrics collection"),
  C("DEVOPS_TRACING", "DEVOPS", "observability", "Tracing", "Distributed tracing"),
  C("DEVOPS_INCIDENT_RESPONSE", "DEVOPS", "incident", "Incident response", "Incident handling"),
  C("DEVOPS_RUNBOOK", "DEVOPS", "incident", "Runbook", "Operational runbook"),
];

// ── Observability ───────────────────────────────────────────────────────────
const OBSERVABILITY_CONCEPTS: ConceptEntry[] = [
  C("OBS_METRICS_COLLECTION", "OBSERVABILITY", "metrics", "Metrics collection", "Collect and expose metrics"),
  C("OBS_LOGGING_STRUCTURED", "OBSERVABILITY", "logging", "Structured logging", "Structured log format"),
  C("OBS_TRACING_DISTRIBUTED", "OBSERVABILITY", "tracing", "Distributed tracing", "Cross-service traces"),
  C("OBS_ALERTING_THRESHOLD", "OBSERVABILITY", "alerting", "Threshold alerting", "Alert on threshold"),
  C("OBS_ALERTING_ANOMALY", "OBSERVABILITY", "alerting", "Anomaly alerting", "Alert on anomaly"),
  C("OBS_DASHBOARD_SYSTEM", "OBSERVABILITY", "dashboard", "Dashboard", "Monitoring dashboard"),
  C("OBS_PERFORMANCE_MONITOR", "OBSERVABILITY", "monitor", "Performance monitor", "Performance metrics"),
];

// ── Software Architecture ───────────────────────────────────────────────────
const ARCH_CONCEPTS: ConceptEntry[] = [
  C("ARCH_PATTERN_LAYERED", "SOFTWARE_ARCHITECTURE", "pattern", "Layered", "Layered architecture"),
  C("ARCH_PATTERN_HEXAGONAL", "SOFTWARE_ARCHITECTURE", "pattern", "Hexagonal", "Ports and adapters"),
  C("ARCH_PATTERN_CLEAN_ARCHITECTURE", "SOFTWARE_ARCHITECTURE", "pattern", "Clean Architecture", "Dependency rule and layers"),
  C("ARCH_PATTERN_MICROSERVICES", "SOFTWARE_ARCHITECTURE", "pattern", "Microservices", "Service decomposition"),
  C("ARCH_PATTERN_MONOLITH", "SOFTWARE_ARCHITECTURE", "pattern", "Monolith", "Single deployable unit"),
  C("ARCH_PATTERN_EVENT_DRIVEN", "SOFTWARE_ARCHITECTURE", "pattern", "Event-driven", "Event-driven architecture"),
  C("ARCH_BOUNDARY_SERVICE", "SOFTWARE_ARCHITECTURE", "boundary", "Service boundary", "Service boundary"),
  C("ARCH_BOUNDARY_MODULE", "SOFTWARE_ARCHITECTURE", "boundary", "Module boundary", "Module boundary"),
  C("ARCH_DEPENDENCY_INJECTION", "SOFTWARE_ARCHITECTURE", "technique", "Dependency injection", "Inject dependencies"),
  C("ARCH_INTERFACE_CONTRACT", "SOFTWARE_ARCHITECTURE", "technique", "Interface contract", "Stable interface"),
  C("ARCH_DOMAIN_MODEL", "SOFTWARE_ARCHITECTURE", "technique", "Domain model", "Core domain logic"),
  C("ARCH_AGGREGATE_ROOT", "SOFTWARE_ARCHITECTURE", "technique", "Aggregate root", "DDD aggregate root"),
  C("ARCH_SEPARATION_CONCERNS", "SOFTWARE_ARCHITECTURE", "principle", "Separation of concerns", "Distinct responsibilities"),
  C("ARCH_LOOSE_COUPLING", "SOFTWARE_ARCHITECTURE", "principle", "Loose coupling", "Minimal coupling"),
  C("ARCH_HIGH_COHESION", "SOFTWARE_ARCHITECTURE", "principle", "High cohesion", "Related logic together"),
];

// ── Testing & Quality ───────────────────────────────────────────────────────
const TESTING_CONCEPTS: ConceptEntry[] = [
  C("TEST_UNIT", "TESTING_QUALITY", "test", "Unit test", "Unit testing"),
  C("TEST_INTEGRATION", "TESTING_QUALITY", "test", "Integration test", "Integration testing"),
  C("TEST_END_TO_END", "TESTING_QUALITY", "test", "E2E test", "End-to-end testing"),
  C("TEST_PROPERTY_BASED", "TESTING_QUALITY", "test", "Property-based", "Property-based testing"),
  C("TEST_MOCKING", "TESTING_QUALITY", "technique", "Mocking", "Test doubles"),
  C("TEST_STUBS", "TESTING_QUALITY", "technique", "Stubs", "Stub dependencies"),
  C("TEST_FIXTURES", "TESTING_QUALITY", "technique", "Fixtures", "Test fixtures"),
  C("QUALITY_STATIC_ANALYSIS", "TESTING_QUALITY", "quality", "Static analysis", "Static code analysis"),
  C("QUALITY_LINTING", "TESTING_QUALITY", "quality", "Linting", "Lint rules"),
  C("QUALITY_CODE_REVIEW", "TESTING_QUALITY", "quality", "Code review", "Code review process"),
];

// ── Data Engineering ───────────────────────────────────────────────────────
const DATA_CONCEPTS: ConceptEntry[] = [
  C("DATA_MODEL_RELATIONAL", "DATA_ENGINEERING", "model", "Relational", "Relational data model"),
  C("DATA_MODEL_DOCUMENT", "DATA_ENGINEERING", "model", "Document", "Document model"),
  C("DATA_MODEL_GRAPH", "DATA_ENGINEERING", "model", "Graph", "Graph data model"),
  C("DATA_STORAGE_SQL", "DATA_ENGINEERING", "storage", "SQL", "SQL database"),
  C("DATA_STORAGE_NOSQL", "DATA_ENGINEERING", "storage", "NoSQL", "NoSQL store"),
  C("DATA_STORAGE_WAREHOUSE", "DATA_ENGINEERING", "storage", "Warehouse", "Data warehouse"),
  C("DATA_PIPELINE_ETL", "DATA_ENGINEERING", "pipeline", "ETL", "Extract-transform-load"),
  C("DATA_PIPELINE_STREAMING", "DATA_ENGINEERING", "pipeline", "Streaming", "Streaming pipeline"),
  C("DATA_PROCESSING_BATCH", "DATA_ENGINEERING", "processing", "Batch", "Batch processing"),
  C("DATA_PROCESSING_REALTIME", "DATA_ENGINEERING", "processing", "Real-time", "Real-time processing"),
];

// ── AI Systems ─────────────────────────────────────────────────────────────
const AI_CONCEPTS: ConceptEntry[] = [
  C("AI_MODEL_TRANSFORMER", "AI_SYSTEMS", "model", "Transformer", "Transformer architecture"),
  C("AI_MODEL_CNN", "AI_SYSTEMS", "model", "CNN", "Convolutional network"),
  C("AI_MODEL_RNN", "AI_SYSTEMS", "model", "RNN", "Recurrent network"),
  C("AI_TRAINING_SUPERVISED", "AI_SYSTEMS", "training", "Supervised", "Supervised training"),
  C("AI_TRAINING_UNSUPERVISED", "AI_SYSTEMS", "training", "Unsupervised", "Unsupervised training"),
  C("AI_FEATURE_ENGINEERING", "AI_SYSTEMS", "practice", "Feature engineering", "Feature design"),
  C("AI_MODEL_EVALUATION", "AI_SYSTEMS", "practice", "Model evaluation", "Evaluate model"),
  C("AI_MODEL_DEPLOYMENT", "AI_SYSTEMS", "practice", "Model deployment", "Deploy model"),
];

/** Flattened concept taxonomy (representative subset; expand toward ~2000). */
export const CONCEPT_TAXONOMY: ConceptEntry[] = [
  ...UI_UX_CONCEPTS,
  ...API_BACKEND_CONCEPTS,
  ...DISTRIBUTED_CONCEPTS,
  ...CLOUD_CONCEPTS,
  ...SECURITY_CONCEPTS,
  ...DEVOPS_CONCEPTS,
  ...OBSERVABILITY_CONCEPTS,
  ...ARCH_CONCEPTS,
  ...TESTING_CONCEPTS,
  ...DATA_CONCEPTS,
  ...AI_CONCEPTS,
];

/** Explicit concept relationships for graph traversal and composition. */
export const CONCEPT_RELATIONSHIPS: ConceptRelationship[] = [
  { source: "UI_PATTERN_AUTH_LOGIN", relationship: "depends_on", target: "API_AUTHENTICATION" },
  { source: "UI_PATTERN_AUTH_LOGIN", relationship: "depends_on", target: "API_AUTH_JWT" },
  { source: "DIST_PATTERN_CIRCUIT_BREAKER", relationship: "applies_to", target: "API_SERVICE_LAYER" },
  { source: "DIST_PATTERN_CIRCUIT_BREAKER", relationship: "applies_to", target: "DIST_SERVICE_DISCOVERY" },
  { source: "API_PATTERN_REST_RESOURCE", relationship: "implements", target: "API_PROTOCOL_HTTP" },
  { source: "ARCH_PATTERN_MICROSERVICES", relationship: "related_to", target: "DIST_SERVICE_DISCOVERY" },
  { source: "DEVOPS_PIPELINE_CD", relationship: "depends_on", target: "DEVOPS_PIPELINE_CI" },
  { source: "CLOUD_PLATFORM_KUBERNETES", relationship: "applies_to", target: "CLOUD_COMPUTE_CONTAINER" },
];

const conceptById = new Map<string, ConceptEntry>(CONCEPT_TAXONOMY.map((c) => [c.concept_id, c]));
const relationshipsBySource = new Map<string, ConceptRelationship[]>();
for (const r of CONCEPT_RELATIONSHIPS) {
  const list = relationshipsBySource.get(r.source) ?? [];
  list.push(r);
  relationshipsBySource.set(r.source, list);
}

/** Get a concept by id. */
export function getConcept(concept_id: string): ConceptEntry | undefined {
  return conceptById.get(concept_id);
}

/** Get all concepts in a domain. */
export function getConceptsByDomain(domain: ConceptTaxonomyDomain): ConceptEntry[] {
  return CONCEPT_TAXONOMY.filter((c) => c.domain === domain);
}

/** Get concepts in a domain and category. */
export function getConceptsByCategory(domain: ConceptTaxonomyDomain, category: string): ConceptEntry[] {
  return CONCEPT_TAXONOMY.filter((c) => c.domain === domain && c.category === category);
}

/** Domain signal (e.g. "web.backend", "api_backend") → concept IDs for retrieval/KB mapping. */
const DOMAIN_SIGNAL_TO_CONCEPT_IDS: Record<string, string[]> = {
  ui_ux: ["UI_PATTERN_AUTH_LOGIN", "UI_COMPONENT_FORM", "UI_ACCESSIBILITY_WCAG"],
  "web.ux": ["UI_PATTERN_AUTH_LOGIN", "UI_LAYOUT_RESPONSIVE"],
  "web.frontend": ["UI_COMPONENT_BUTTON", "UI_LAYOUT_GRID", "UI_DESIGN_TOKENS"],
  api_backend: ["API_PATTERN_REST_RESOURCE", "API_AUTH_JWT", "API_SERVICE_LAYER"],
  "web.backend": ["API_PROTOCOL_HTTP", "API_PATTERN_RATE_LIMITING"],
  distributed: ["DIST_PATTERN_CIRCUIT_BREAKER", "DIST_SERVICE_DISCOVERY"],
  cloud: ["CLOUD_PLATFORM_KUBERNETES", "CLOUD_PATTERN_AUTOSCALING"],
  security: ["SEC_AUTHENTICATION", "SEC_INPUT_VALIDATION"],
  devops: ["DEVOPS_PIPELINE_CI", "DEVOPS_DEPLOYMENT_BLUE_GREEN"],
  observability: ["OBS_METRICS_COLLECTION", "OBS_TRACING_DISTRIBUTED"],
  testing: ["TEST_UNIT", "TEST_INTEGRATION", "TEST_E2E"],
  architecture: ["ARCH_PATTERN_MICROSERVICES", "ARCH_LAYERED"],
};

/** Map a domain signal string (e.g. KB domain or capability cluster prefix) to concept IDs. */
export function getConceptIdsForDomainSignal(domain: string): string[] {
  const d = (domain ?? "").toLowerCase().trim();
  if (!d) return [];
  for (const [key, ids] of Object.entries(DOMAIN_SIGNAL_TO_CONCEPT_IDS)) {
    const normKey = key.replace(/_/g, ".");
    if (d === key || d === normKey || d.includes(key) || d.includes(normKey)) return ids;
  }
  return [];
}

/** Get related concept ids (from entry.related_concepts and relationship targets). */
export function getRelatedConcepts(concept_id: string): string[] {
  const entry = conceptById.get(concept_id);
  const rels = relationshipsBySource.get(concept_id) ?? [];
  const fromEntry = entry?.related_concepts ?? [];
  const fromRels = rels.map((r) => r.target);
  return [...new Set([...fromEntry, ...fromRels])];
}

/** Get relationships where this concept is source. */
export function getRelationshipsFor(concept_id: string): ConceptRelationship[] {
  return relationshipsBySource.get(concept_id) ?? [];
}

/** Map concept taxonomy domain to artifact library domain for routing. */
export function conceptDomainToArtifactDomain(domain: ConceptTaxonomyDomain): string {
  const map: Record<ConceptTaxonomyDomain, string> = {
    UI_UX: "ui_ux",
    API_BACKEND: "api_backend",
    DISTRIBUTED_SYSTEMS: "distributed",
    CLOUD_INFRASTRUCTURE: "cloud",
    SECURITY: "security",
    DEVOPS: "devops",
    DATA_ENGINEERING: "data_engineering",
    AI_SYSTEMS: "ai_systems",
    SOFTWARE_ARCHITECTURE: "architecture",
    PROGRAMMING: "programming",
    TESTING_QUALITY: "testing",
    OBSERVABILITY: "observability",
    NETWORKING: "networking",
    PERFORMANCE_ENGINEERING: "performance",
  };
  return map[domain] ?? domain.toLowerCase();
}

/** Resolve a concept id to suggested artifact names (for composition). Override or extend per deployment. */
export function getSuggestedArtifactsForConcept(concept_id: string): string[] {
  const entry = conceptById.get(concept_id);
  if (!entry) return [];
  const domain = conceptDomainToArtifactDomain(entry.domain);
  const suggestions: string[] = [];
  if (entry.domain === "UI_UX" && (entry.category === "pattern" || entry.concept_id === "UI_PATTERN_AUTH_LOGIN")) {
    suggestions.push("ui_login_patterns", "ui_form_patterns", "ui_accessibility_rules");
  }
  if (entry.domain === "API_BACKEND") suggestions.push("api_design_standards", "api_error_format_standards");
  if (entry.domain === "DISTRIBUTED_SYSTEMS") suggestions.push("distributed_system_patterns", "distributed_resilience_patterns");
  if (entry.domain === "SECURITY") suggestions.push("secure_coding_guidelines", "authentication_patterns");
  return suggestions.length ? suggestions : [];
}
