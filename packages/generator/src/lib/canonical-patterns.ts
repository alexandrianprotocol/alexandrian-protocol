/**
 * Canonical modern architecture & infrastructure patterns (~120).
 * Used in the seed upgrade prompt so the AI prefers these in "references".
 */

export const CANONICAL_PATTERNS_DISTRIBUTED = [
  "Circuit Breaker",
  "Bulkhead Isolation",
  "Saga Pattern",
  "Event Sourcing",
  "CQRS",
  "Leader Election",
  "Gossip Protocol",
  "Consistent Hashing",
  "Service Discovery",
  "API Gateway",
  "Sidecar Pattern",
  "Ambassador Pattern",
  "Strangler Fig Pattern",
  "Backpressure Control",
  "Distributed Rate Limiting",
];

export const CANONICAL_PATTERNS_DATA = [
  "Lambda Architecture",
  "Kappa Architecture",
  "Change Data Capture",
  "Data Lake Architecture",
  "Data Mesh",
  "Data Fabric",
  "Event Streaming",
  "Snapshotting",
  "Write-Ahead Logging",
  "Partitioned Storage",
];

export const CANONICAL_PATTERNS_CLOUD = [
  "Immutable Infrastructure",
  "Blue-Green Deployment",
  "Canary Deployment",
  "Rolling Deployment",
  "Infrastructure as Code",
  "Multi-Region Failover",
  "Edge Computing Architecture",
  "Serverless Architecture",
  "Micro VM Isolation",
  "Autoscaling Architecture",
];

export const CANONICAL_PATTERNS_MICROSERVICES = [
  "Domain Driven Design",
  "Bounded Context",
  "API Composition",
  "Aggregator Pattern",
  "Backend for Frontend",
  "Service Mesh",
  "Sidecar Proxy",
  "Request Collapsing",
  "Distributed Configuration",
];

export const CANONICAL_PATTERNS_MESSAGING = [
  "Message Queue",
  "Publish Subscribe",
  "Event Bus",
  "Dead Letter Queue",
  "Idempotent Consumer",
  "Competing Consumers",
];

export const CANONICAL_PATTERNS_RELIABILITY = [
  "Retry with Backoff",
  "Graceful Degradation",
  "Health Check Pattern",
  "Heartbeat Pattern",
  "Fail Fast Pattern",
  "Timeout Pattern",
];

export const CANONICAL_PATTERNS_OBSERVABILITY = [
  "Distributed Tracing",
  "Structured Logging",
  "Metrics Aggregation",
  "Telemetry Pipeline",
  "OpenTelemetry Pipeline",
  "Sampling Strategies",
];

export const CANONICAL_PATTERNS_SECURITY = [
  "Zero Trust Architecture",
  "Defense in Depth",
  "Secrets Rotation",
  "Key Management Service",
  "Mutual TLS",
  "Certificate Pinning",
];

export const CANONICAL_PATTERNS_AI = [
  "Feature Store",
  "Model Registry",
  "Online / Offline Feature Store",
  "Shadow Deployment",
  "Model Canary Deployment",
  "Vector Search Architecture",
  "Retrieval Augmented Generation Pipeline",
];

export const CANONICAL_PATTERNS_FRONTEND = [
  "Component-Based Architecture",
  "Design Token System",
  "Atomic Design",
];

export const CANONICAL_PATTERNS_DEVOPS = [
  "GitOps",
  "Continuous Delivery",
  "Trunk-Based Development",
];

export const CANONICAL_PATTERNS_OTHER = [
  "Workflow Orchestration",
  "DAG Scheduling",
  "Job Queue Architecture",
  "Stream Processing",
  "Windowed Aggregation",
  "Eventual Consistency",
  "Strong Consistency",
  "Conflict-Free Replicated Data Types (CRDTs)",
  "Horizontal Scaling",
  "Sharding",
  "Load Shedding",
  "Queue-Based Load Leveling",
  "Request Hedging",
  "Token Bucket Rate Limiting",
  "Leaky Bucket Rate Limiting",
  "Shadow Traffic Testing",
  "Fault Injection",
  "Chaos Engineering",
  "Feature Flags",
  "Progressive Delivery",
  "Dark Launch",
  "Platform as a Product",
  "Internal Developer Platform",
  "Cache Aside",
  "Write Through Cache",
  "Write Behind Cache",
  "Refresh Ahead Cache",
  "Two Phase Commit",
  "Three Phase Commit",
  "Saga Transaction",
  "Reverse Proxy",
  "Forward Proxy",
  "Edge Proxy",
  "Self Healing Systems",
  "Automated Remediation",
  "WASM Service Architecture",
  "AI Agent Orchestration Pattern",
  "Autonomous Workflow Agents",
  "Knowledge Graph Architecture",
];

/** Flattened list of all canonical pattern names for prompt injection. */
export const ALL_CANONICAL_PATTERNS: string[] = [
  ...CANONICAL_PATTERNS_DISTRIBUTED,
  ...CANONICAL_PATTERNS_DATA,
  ...CANONICAL_PATTERNS_CLOUD,
  ...CANONICAL_PATTERNS_MICROSERVICES,
  ...CANONICAL_PATTERNS_MESSAGING,
  ...CANONICAL_PATTERNS_RELIABILITY,
  ...CANONICAL_PATTERNS_OBSERVABILITY,
  ...CANONICAL_PATTERNS_SECURITY,
  ...CANONICAL_PATTERNS_AI,
  ...CANONICAL_PATTERNS_FRONTEND,
  ...CANONICAL_PATTERNS_DEVOPS,
  ...CANONICAL_PATTERNS_OTHER,
];
