import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

// ── GDPR ───────────────────────────────────────────────────────────────────
const GDPR: SeedSpec[] = [
  { domain: "regulatory.gdpr.data_subject_request", title: "GDPR data subject access request (DSAR) fulfillment procedure", concept: C("receive DSAR; verify identity within 5 days; locate PII across all data stores (DB, logs, backups, third-parties); compile data export in machine-readable format; respond within 30 days (extensible to 90 with notice); log request and response with timestamp; retain log for 3 years") },
  { domain: "regulatory.gdpr.right_to_erasure", title: "Right to erasure: PII deletion across all data stores", concept: C("receive deletion request; propagate deletion to: primary DB, read replicas, analytics warehouse, backups (flag for exclusion on restore), third-party processors (send deletion API call); complete within 30 days; issue confirmation to data subject; exception: retention required by law → notify subject of exception") },
  { domain: "regulatory.gdpr.consent_management", title: "Consent collection, storage, and withdrawal procedure", concept: C("collect: explicit opt-in (no pre-checked boxes); store: consent_record = {user_id, purpose, timestamp, version, channel}; withdrawal: honor within 24h; propagate withdrawal to all processing systems; re-request consent on purpose change; audit log immutable; retention: consent records for duration + 3 years") },
  { domain: "regulatory.gdpr.breach_notification", title: "Personal data breach: 72-hour notification procedure", concept: C("detect breach; assess: nature of data, estimated subjects affected, likely consequences; notify DPA within 72h of awareness (even if incomplete); if high risk to individuals: notify affected subjects without undue delay; document: breach register with facts, effects, remedial action; review security controls post-breach") },
  { domain: "regulatory.gdpr.data_minimization", title: "Data minimization audit: identify and remove excess PII collection", concept: C("catalog all data fields collected; for each field: document purpose and legal basis; fields without clear purpose → mark for removal; implement collection check at ingestion pipeline; quarterly audit: compare schema to approved data map; remove unauthorized fields within 30 days of discovery") },
];

// ── SOC 2 ─────────────────────────────────────────────────────────────────
const SOC2: SeedSpec[] = [
  { domain: "regulatory.soc2.access_review", title: "SOC 2 access review: quarterly user access audit procedure", concept: C("export user list with roles from all systems; send to manager for approval; remove access for: terminated employees (within 24h), role changes (within 7 days), unconfirmed in 5 business days; document evidence: before/after access report; retain for 1 year; repeat quarterly") },
  { domain: "regulatory.soc2.change_management", title: "SOC 2 change management: approval and evidence collection", concept: C("all production changes require: ticket with business justification, peer review approval, test evidence; emergency changes: post-hoc approval within 24h; deploy via pipeline (no manual production access); record: change_id, approver, deploy_time, test_results; retain evidence for audit period (1 year)") },
  { domain: "regulatory.soc2.incident_response_evidence", title: "SOC 2 incident response documentation for audit trail", concept: C("create incident ticket at detection; record: detection_time, classification, affected_systems, actions_taken with timestamps, resolution_time, root_cause; conduct postmortem for P0/P1; store postmortem in immutable log; demonstrate MTTD < SLO and MTTR < SLO in audit; retain for 1 year") },
  { domain: "regulatory.soc2.vendor_risk_assessment", title: "Third-party vendor risk assessment for SOC 2 compliance", concept: C("for each vendor processing customer data: obtain SOC 2 Type II report; verify report is < 12 months old; review findings and management responses; sign DPA; assess: data classification, access scope, subprocessor list; document in vendor register; reassess annually or on incident") },
];

// ── ISO 27001 ──────────────────────────────────────────────────────────────
const ISO27001: SeedSpec[] = [
  { domain: "regulatory.iso27001.risk_assessment", title: "ISO 27001 information security risk assessment procedure", concept: C("identify assets: information assets, systems, processes; identify threats and vulnerabilities per asset; assess: likelihood (1-5) × impact (1-5) = risk_score; treat risks with score ≥ 12: mitigate, transfer, accept, or avoid; document in risk register; review annually and on significant change") },
  { domain: "regulatory.iso27001.asset_inventory", title: "Information asset inventory maintenance and classification", concept: C("catalog all assets: systems, data stores, APIs, third-party services; classify: Public, Internal, Confidential, Restricted; assign owner; document: asset_id, description, classification, owner, location; review quarterly; decommission: remove from inventory and destroy data per retention policy") },
  { domain: "regulatory.iso27001.isms_internal_audit", title: "ISMS internal audit: scope, sampling, and nonconformity procedure", concept: C("define scope per audit plan; sample controls: 5 per control domain; test: review evidence against control objective; document findings as: Conformant, Minor NC, Major NC; issue corrective action for each NC with owner and due date; verify closure within 30 days; report to management") },
];

// ── PCI-DSS ────────────────────────────────────────────────────────────────
const PCI_DSS: SeedSpec[] = [
  { domain: "regulatory.pci.cardholder_data_scope", title: "PCI DSS cardholder data environment scoping and network segmentation", concept: C("identify: all systems that store, process, or transmit cardholder data (CHD); segment CDE from non-CDE with firewall; test segmentation annually with penetration test; document data flow diagram; minimize CHD scope: tokenize at entry point; systems out-of-scope must not have connectivity to CDE") },
  { domain: "regulatory.pci.vulnerability_scan", title: "PCI DSS quarterly vulnerability scan and remediation procedure", concept: C("run ASV-approved external scan quarterly; internal scan monthly; classify findings: Critical (CVSS≥9), High (7-9), Medium (4-7); critical and high: remediate within 30 days; re-scan after remediation; retain scan reports for 1 year; submit passing ASV report to acquirer quarterly") },
  { domain: "regulatory.pci.key_management", title: "PCI DSS encryption key management lifecycle procedure", concept: C("generate keys in HSM; split knowledge: two custodians required; key_version tracked in key registry; rotation: annually for DEK, every 2 years for KEK; destruction: secure wipe with certificate; document: generation, activation, expiry, destruction dates; access: limited to authorized custodians with dual control") },
];

// ── HIPAA ─────────────────────────────────────────────────────────────────
const HIPAA: SeedSpec[] = [
  { domain: "regulatory.hipaa.phi_access_log", title: "HIPAA PHI access logging and audit trail requirements", concept: C("log: all access to PHI = {user_id, patient_id, access_type, timestamp, system, ip_address}; log integrity: write-once storage, tamper-evident hash chain; retention: 6 years; review: monthly anomaly detection on access patterns; audit: provide access log within 60 days of patient request") },
  { domain: "regulatory.hipaa.breach_risk_assessment", title: "HIPAA breach risk assessment: four-factor analysis", concept: C("assess: (1) nature and extent of PHI involved; (2) unauthorized persons who accessed/could access; (3) whether PHI actually acquired or viewed; (4) extent of harm mitigation; score each factor Low/Medium/High; if any High → notify HHS within 60 days; if Low across all → document as not a reportable breach") },
];

export const REGULATORY_COMPLIANCE_SEED_SPECS: SeedSpec[] = [
  ...GDPR,
  ...SOC2,
  ...ISO27001,
  ...PCI_DSS,
  ...HIPAA,
];
