/**
 * Platform & Infrastructure Seeds (~80 seed procedures).
 * Kubernetes operators, Helm, service mesh, multi-region, FinOps,
 * platform team API design, observability infrastructure, and SRE practices.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Kubernetes operators (10) */
const K8S_OPERATORS: SeedSpec[] = [
  { domain: "platform.k8s.operator", title: "Designing Kubernetes operator architectures", concept: C("CRD + controller; reconcile loop: observe desired vs actual → act; idempotent reconcile; status conditions") },
  { domain: "platform.k8s.crd", title: "Designing Custom Resource Definitions for Kubernetes operators", concept: C("schema validation via OpenAPI v3; printer columns; status subresource; version conversion webhook") },
  { domain: "platform.k8s.reconciler", title: "Implementing Kubernetes reconciliation loops with controller-runtime", concept: C("fetch CR; compare desired vs actual state; create/update/delete child resources; update status; requeue on error") },
  { domain: "platform.k8s.finalizers", title: "Implementing Kubernetes finalizers for cleanup orchestration", concept: C("add finalizer on create; on delete: run cleanup logic; remove finalizer to allow deletion; idempotent cleanup") },
  { domain: "platform.k8s.admission", title: "Designing Kubernetes admission webhooks for policy enforcement", concept: C("validating: reject invalid resources; mutating: inject defaults or sidecars; fail-open vs fail-closed; cert rotation") },
  { domain: "platform.k8s.rbac", title: "Designing Kubernetes RBAC policies for multi-tenant clusters", concept: C("namespace-scoped roles; minimal permissions; aggregate ClusterRoles; audit role bindings quarterly") },
  { domain: "platform.k8s.hpa", title: "Designing Kubernetes HPA and KEDA scaling configurations", concept: C("HPA: CPU/memory; KEDA: custom metrics (queue depth, RPS); scale-to-zero; stabilization window") },
  { domain: "platform.k8s.resource_limits", title: "Designing Kubernetes resource request and limit policies", concept: C("requests = guaranteed; limits = max; VPA for right-sizing; LimitRange defaults per namespace") },
  { domain: "platform.k8s.pod_disruption", title: "Designing PodDisruptionBudgets for high-availability workloads", concept: C("minAvailable or maxUnavailable; set per critical service; enforce during node drain and cluster upgrades") },
  { domain: "platform.k8s.multi_cluster", title: "Designing multi-cluster Kubernetes federation architectures", concept: C("workload placement policy; cross-cluster service discovery; global ingress; cluster failure isolation") },
];

/** 2. Helm & GitOps (8) */
const HELM_GITOPS: SeedSpec[] = [
  { domain: "platform.helm.chart", title: "Designing Helm chart structures for reusable infrastructure", concept: C("templates + values.yaml; library charts for shared snippets; subchart dependencies; schema validation") },
  { domain: "platform.helm.values", title: "Designing Helm values hierarchy for multi-environment deployments", concept: C("base values.yaml; environment overlay; secrets via external-secrets; validate schema on render") },
  { domain: "platform.helm.testing", title: "Implementing Helm chart testing with helm test", concept: C("test pod per chart; assert endpoints respond; connection test for databases; run in CI on PR") },
  { domain: "platform.gitops.argocd", title: "Designing ArgoCD application and project structures", concept: C("AppProject per team; Application per service; sync policy auto or manual; health checks per resource type") },
  { domain: "platform.gitops.flux", title: "Designing Flux GitOps pipelines for Kubernetes clusters", concept: C("GitRepository → Kustomization → HelmRelease; reconcile interval; dependsOn for ordering; alerts for failures") },
  { domain: "platform.gitops.secrets", title: "Managing secrets in GitOps pipelines securely", concept: C("External Secrets Operator; reference secrets from Vault or AWS SM; never commit plaintext secrets to git") },
  { domain: "platform.gitops.promotion", title: "Designing GitOps environment promotion workflows", concept: C("dev → staging → prod via PR or tag; image tag promotion; automated PR on new image; manual gate for prod") },
  { domain: "platform.gitops.drift", title: "Detecting and remediating infrastructure drift in GitOps", concept: C("continuous reconciliation compares live vs git; alert on diff; auto-sync or manual review; drift report") },
];

/** 3. Service mesh (8) */
const SERVICE_MESH: SeedSpec[] = [
  { domain: "platform.mesh.traffic", title: "Designing service mesh traffic management policies", concept: C("VirtualService for routing rules; DestinationRule for load balancing; weight-based canary; fault injection") },
  { domain: "platform.mesh.mtls", title: "Implementing mutual TLS via service mesh for zero-trust networking", concept: C("PeerAuthentication: STRICT mTLS; cert rotation automatic; mesh-wide policy; namespace exemptions documented") },
  { domain: "platform.mesh.observability", title: "Extracting observability data from service mesh telemetry", concept: C("Envoy emits: request count, latency histogram, error rate; export to Prometheus; trace via Zipkin/Jaeger") },
  { domain: "platform.mesh.circuit_breaker", title: "Configuring service mesh circuit breakers and outlier detection", concept: C("consecutive errors threshold; eject for N seconds; passive health check; alert on ejected host") },
  { domain: "platform.mesh.retry", title: "Configuring service mesh retry and timeout policies", concept: C("retry on: 5xx, reset, connect-failure; per-request timeout; global default timeout; idempotent routes only") },
  { domain: "platform.mesh.ingress", title: "Designing service mesh ingress gateway architectures", concept: C("single gateway per cluster; TLS termination; route by host/path; rate limit at gateway; WAF integration") },
  { domain: "platform.mesh.authorization", title: "Implementing service mesh authorization policies", concept: C("AuthorizationPolicy: allow by principal + namespace + path; deny by default; audit mode first; layer with RBAC") },
  { domain: "platform.mesh.egress", title: "Controlling service mesh egress traffic to external services", concept: C("ServiceEntry for external hosts; restrict egress by default; log egress; rate limit external calls") },
];

/** 4. Multi-region architecture (8) */
const MULTI_REGION: SeedSpec[] = [
  { domain: "platform.multiregion.active_active", title: "Designing active-active multi-region architectures", concept: C("traffic in all regions simultaneously; global load balancer; data replication with conflict resolution; latency-based routing") },
  { domain: "platform.multiregion.active_passive", title: "Designing active-passive failover architectures", concept: C("primary handles traffic; standby warm; DNS failover; RTO and RPO targets; failover runbook") },
  { domain: "platform.multiregion.data_replication", title: "Designing cross-region database replication strategies", concept: C("async replication with lag monitoring; lag SLA; promote standby on primary failure; re-sync after failover") },
  { domain: "platform.multiregion.failover", title: "Implementing multi-region failover automation", concept: C("health check → threshold breach → trigger failover → update DNS → verify → notify; test quarterly") },
  { domain: "platform.multiregion.latency", title: "Optimizing multi-region latency with geographic routing", concept: C("route user to nearest region; geolocation-based DNS; anycast for stateless services; cache at edge") },
  { domain: "platform.multiregion.compliance", title: "Designing multi-region data residency compliance architectures", concept: C("store user data in user's region; prevent cross-region data movement; document data flows; audit residency") },
  { domain: "platform.multiregion.chaos", title: "Designing multi-region chaos engineering procedures", concept: C("inject: region failure, partition, latency spike; measure: failover time, error rate; run in staging first") },
  { domain: "platform.multiregion.cost", title: "Optimizing multi-region infrastructure cost allocation", concept: C("cross-region traffic costs; minimize unnecessary replication; cache aggressively; co-locate compute with data") },
];

/** 5. FinOps (8) */
const FINOPS: SeedSpec[] = [
  { domain: "platform.finops.tagging", title: "Designing cloud resource tagging taxonomy for cost allocation", concept: C("tags: team, service, environment, cost-center; enforce via policy; report by tag; tag untagged resources alert") },
  { domain: "platform.finops.rightsizing", title: "Implementing compute rightsizing analysis and automation", concept: C("collect CPU/memory utilization; compare to provisioned; recommend smaller instance; auto-apply in dev") },
  { domain: "platform.finops.reserved", title: "Designing reserved instance and savings plan purchasing strategies", concept: C("analyze 12-month baseline usage; purchase 1-year reserved for stable; spot for batch; savings plan for flexible") },
  { domain: "platform.finops.budgets", title: "Implementing cloud budget alerts and anomaly detection", concept: C("budget per team per month; alert at 80% and 100%; anomaly detection for unexpected spend spikes") },
  { domain: "platform.finops.showback", title: "Designing cloud cost showback and chargeback systems", concept: C("allocate shared costs by CPU/memory share; generate per-team monthly report; chargeback via internal billing") },
  { domain: "platform.finops.waste", title: "Identifying and eliminating cloud infrastructure waste", concept: C("unused EBS volumes, unattached IPs, stopped instances, old snapshots; automate cleanup with approval gate") },
  { domain: "platform.finops.unit_economics", title: "Computing cloud infrastructure unit economics per product", concept: C("cost per user, per transaction, per API call; trend over time; set reduction target; correlate with engineering changes") },
  { domain: "platform.finops.egress", title: "Optimizing cloud data egress costs in infrastructure design", concept: C("minimize cross-AZ traffic; CDN for user-facing assets; compress before transfer; co-locate high-traffic services") },
];

/** 6. SRE practices (10) */
const SRE: SeedSpec[] = [
  { domain: "platform.sre.slo", title: "Designing SLO measurement and error budget systems", concept: C("SLI: request success rate; SLO: 99.9%; error budget = 1 - SLO; track consumption; freeze changes at budget exhausted") },
  { domain: "platform.sre.sli", title: "Defining SLIs for reliability measurement", concept: C("availability: good requests / total; latency: % requests < threshold; choose SLIs that reflect user experience") },
  { domain: "platform.sre.toil", title: "Identifying and reducing operational toil", concept: C("manual, repetitive, automatable work; measure toil hours per week; target < 50% of time; automate highest-volume toil") },
  { domain: "platform.sre.postmortem", title: "Designing blameless postmortem procedures", concept: C("timeline reconstruction; 5 whys root cause; contributing factors; action items with owners; share widely") },
  { domain: "platform.sre.oncall", title: "Designing effective on-call rotation procedures", concept: C("rotation schedule; runbook per alert; escalation path; clear handoff; postmortem for P1; blameless culture") },
  { domain: "platform.sre.alert", title: "Designing actionable alert and on-call notification systems", concept: C("alert = symptom, not cause; every alert needs runbook; no alert without action; review and prune monthly") },
  { domain: "platform.sre.runbook", title: "Writing effective runbooks for incident response", concept: C("trigger: alert description; steps: numbered, precise commands; decision tree for branches; expected output per step") },
  { domain: "platform.sre.capacity", title: "Implementing capacity planning procedures for infrastructure", concept: C("baseline utilization; project 6-month growth; add headroom; review quarterly; trigger provisioning at threshold") },
  { domain: "platform.sre.chaos", title: "Designing chaos engineering experiments for production systems", concept: C("define steady state; inject failure; measure deviation; automate game days; require rollback mechanism") },
  { domain: "platform.sre.incident", title: "Designing incident classification and response procedures", concept: C("P1: total outage; P2: major degradation; P3: minor; commander role; war room; 15-min update cadence") },
];

/** 7. Platform engineering APIs (8) */
const PLATFORM_API: SeedSpec[] = [
  { domain: "platform.api.idp", title: "Designing internal developer platform API architectures", concept: C("self-service API for: provisioning, deployments, secrets, logs; golden paths; CLI and UI over same API") },
  { domain: "platform.api.paved_road", title: "Designing paved road infrastructure patterns for engineering teams", concept: C("opinionated defaults; escape hatches documented; support model: paved road = supported; off-road = self-serve") },
  { domain: "platform.api.service_catalog", title: "Implementing service catalog systems for platform teams", concept: C("register: service, owner, SLO, dependencies, runbooks; auto-populate from code; searchable; linked to dashboards") },
  { domain: "platform.api.provisioning", title: "Designing self-service infrastructure provisioning APIs", concept: C("template-based; approve or auto-approve by class; track ownership; de-provision on expiry; cost estimate shown") },
  { domain: "platform.api.environment", title: "Designing environment lifecycle management systems", concept: C("create/delete environments via API; ephemeral envs for PRs; TTL-based expiry; cost cap per environment") },
  { domain: "platform.api.dependency", title: "Tracking service dependencies in platform service catalogs", concept: C("declare upstream dependencies; auto-detect from traffic; visualize dependency graph; alert on undeclared dependency") },
  { domain: "platform.api.golden_path", title: "Implementing golden path templates for new service creation", concept: C("scaffold from template; CI/CD pre-wired; observability pre-configured; lint and test pre-configured; ready in minutes") },
  { domain: "platform.api.migration", title: "Designing platform migration procedures for legacy services", concept: C("assessment → pilot → migrate → validate → decommission; migration guide per pattern; track progress in catalog") },
];

export const PLATFORM_INFRASTRUCTURE_SEED_SPECS: SeedSpec[] = [
  ...K8S_OPERATORS,
  ...HELM_GITOPS,
  ...SERVICE_MESH,
  ...MULTI_REGION,
  ...FINOPS,
  ...SRE,
  ...PLATFORM_API,
];
