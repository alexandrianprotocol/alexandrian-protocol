/**
 * Cybersecurity Seeds (~100 seed procedures).
 * Threat detection, incident response, vulnerability analysis, network intrusion,
 * IAM, cloud security, cryptography, SOC automation, and malware analysis.
 * Domain: cybersecurity.*
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Threat detection (12) */
const THREAT_DETECTION: SeedSpec[] = [
  { domain: "cybersecurity.threat_detection", title: "Designing rule-based threat detection systems for SIEM platforms", concept: C("detection rule: event pattern + threshold + time window; alert on match; tune false positive rate; version rules") },
  { domain: "cybersecurity.threat_detection", title: "Implementing anomaly-based threat detection with behavioral baselines", concept: C("establish baseline per entity; flag deviation > N sigma; sliding window baseline; alert with anomaly score") },
  { domain: "cybersecurity.threat_detection", title: "Detecting SQL injection attacks in application request pipelines", concept: C("pattern match: UNION, SELECT, OR 1=1, comment sequences; WAF rule; parameterized query enforcement; log attempts") },
  { domain: "cybersecurity.threat_detection", title: "Implementing privilege escalation detection in authentication logs", concept: C("invariant: user should not gain admin role without approval workflow; alert on admin grant without prior request event") },
  { domain: "cybersecurity.threat_detection", title: "Detecting anomalous network traffic patterns for intrusion detection", concept: C("baseline: bytes/connections per source IP; alert on sudden spike; geo-anomaly; port scan pattern; time-of-day model") },
  { domain: "cybersecurity.threat_detection", title: "Implementing lateral movement detection in enterprise networks", concept: C("alert: SMB/RDP from workstation to workstation; unusual internal scanning; credential use from new host") },
  { domain: "cybersecurity.threat_detection", title: "Detecting data exfiltration patterns in network and endpoint logs", concept: C("large outbound transfer; new external destination; compressed archive creation + network transfer sequence") },
  { domain: "cybersecurity.threat_detection", title: "Implementing threat indicator correlation across security data sources", concept: C("IOC enrichment: IP, domain, hash; correlate across: firewall, endpoint, DNS, proxy; unified alert with context") },
  { domain: "cybersecurity.threat_detection", title: "Detecting credential stuffing and brute force attacks", concept: C("velocity: > N failed logins per IP per minute; distributed: same password across IPs; alert and challenge") },
  { domain: "cybersecurity.threat_detection", title: "Implementing UEBA for insider threat detection", concept: C("user behavioral baseline; flag: off-hours access, mass download, new resource access, peer deviation") },
  { domain: "cybersecurity.threat_detection", title: "Detecting command and control beaconing in network traffic", concept: C("periodic connection to external host; regular interval ± jitter; long-lived low-bandwidth flows; DNS beaconing") },
  { domain: "cybersecurity.threat_detection", title: "Implementing detection-as-code pipelines for threat detection rules", concept: C("rules in YAML or Sigma; CI validates syntax; test against known-bad samples; deploy to SIEM on merge") },
];

/** 2. Incident response (10) */
const INCIDENT_RESPONSE: SeedSpec[] = [
  { domain: "cybersecurity.incident_response", title: "Designing cybersecurity incident response playbooks", concept: C("trigger → triage → contain → investigate → eradicate → recover → postmortem; step owner; time SLA per step") },
  { domain: "cybersecurity.incident_response", title: "Implementing incident severity classification systems", concept: C("P1: active breach with data loss; P2: confirmed compromise; P3: suspicious activity; P4: policy violation; SLA per level") },
  { domain: "cybersecurity.incident_response", title: "Designing containment procedures for compromised systems", concept: C("isolate host from network; revoke credentials; block C2 IPs; preserve evidence before remediation; document steps") },
  { domain: "cybersecurity.incident_response", title: "Implementing forensic evidence collection procedures", concept: C("memory dump; disk image; network capture; log preservation; chain of custody; write blocker for disk") },
  { domain: "cybersecurity.incident_response", title: "Designing tabletop exercise procedures for incident response readiness", concept: C("scenario-based; decision points; measure: detection time, escalation, communication; debrief and update playbooks") },
  { domain: "cybersecurity.incident_response", title: "Implementing communication procedures during security incidents", concept: C("internal: exec, legal, comms; external: regulator, customers if required; holding statement templates; disclosure timeline") },
  { domain: "cybersecurity.incident_response", title: "Designing eradication procedures after confirmed compromise", concept: C("remove persistence: scheduled tasks, reg keys, services; patch exploited vuln; reset all affected credentials; re-image if needed") },
  { domain: "cybersecurity.incident_response", title: "Implementing post-incident root cause analysis procedures", concept: C("timeline reconstruction; 5-whys; contributing factors; control gaps identified; remediation items with owners and dates") },
  { domain: "cybersecurity.incident_response", title: "Designing automated incident response orchestration workflows", concept: C("SOAR playbook: alert → enrich → score → contain → notify; auto-contain low-risk; human gate for high-impact") },
  { domain: "cybersecurity.incident_response", title: "Implementing threat hunting procedures for proactive detection", concept: C("hypothesis from threat intel; query logs for IOCs; pivot on findings; document hunts; operationalize as detection rule") },
];

/** 3. Vulnerability analysis (10) */
const VULNERABILITY: SeedSpec[] = [
  { domain: "cybersecurity.vulnerability_analysis", title: "Designing vulnerability management lifecycle procedures", concept: C("scan → discover → assess → prioritize → remediate → verify → track; SLA by CVSS score; exception process") },
  { domain: "cybersecurity.vulnerability_analysis", title: "Implementing CVSS scoring for vulnerability prioritization", concept: C("base: attack vector, complexity, privileges, scope, impact; temporal: exploit maturity, patch availability; environment: asset criticality") },
  { domain: "cybersecurity.vulnerability_analysis", title: "Implementing SAST integration in CI/CD pipelines for vulnerability detection", concept: C("run SAST on PR; gate on high severity; suppress false positives with annotations; track finding trend") },
  { domain: "cybersecurity.vulnerability_analysis", title: "Implementing SCA for open-source dependency vulnerability detection", concept: C("SBOM generation; check against NVD/OSV; block on critical; weekly scan; policy on max allowed severity") },
  { domain: "cybersecurity.vulnerability_analysis", title: "Designing penetration testing scope and rules of engagement", concept: C("define scope: IP ranges, domains, apps; out-of-scope: production DB, DoS; timing window; emergency contact") },
  { domain: "cybersecurity.vulnerability_analysis", title: "Implementing DAST scanning for web application vulnerabilities", concept: C("spider app; inject payloads: XSS, SQLi, SSRF, XXE; authenticated scan; compare findings to baseline") },
  { domain: "cybersecurity.vulnerability_analysis", title: "Designing vulnerability disclosure and patching procedures", concept: C("triage within 24h; critical patch in 7 days; high in 30 days; medium in 90 days; emergency patch process") },
  { domain: "cybersecurity.vulnerability_analysis", title: "Implementing container image vulnerability scanning in deployment pipelines", concept: C("scan on build; scan base image daily; block deploy on critical; generate SBOM per image; track over time") },
  { domain: "cybersecurity.vulnerability_analysis", title: "Designing attack surface management for continuous vulnerability visibility", concept: C("enumerate: domains, IPs, services, certificates, cloud assets; monitor for changes; detect new exposure") },
  { domain: "cybersecurity.vulnerability_analysis", title: "Implementing vulnerability risk scoring using exploit intelligence", concept: C("EPSS: probability of exploitation in 30 days; combine CVSS + EPSS + asset criticality; prioritize top N") },
];

/** 4. Network intrusion detection (8) */
const NETWORK_IDS: SeedSpec[] = [
  { domain: "cybersecurity.network_intrusion_detection", title: "Designing network intrusion detection system architectures", concept: C("tap or SPAN port; signature detection + anomaly; alert to SIEM; decrypt TLS at inspection point if needed") },
  { domain: "cybersecurity.network_intrusion_detection", title: "Implementing Snort/Suricata rules for network intrusion detection", concept: C("rule: action proto src dst -> dst port; content match; pcre for complex; threshold to limit alerts; test offline") },
  { domain: "cybersecurity.network_intrusion_detection", title: "Designing network traffic baseline models for anomaly detection", concept: C("per-host: bytes/day, connections/hour, top destinations; alert on deviation; rolling baseline with decay") },
  { domain: "cybersecurity.network_intrusion_detection", title: "Implementing DNS-based threat detection for C2 and exfiltration", concept: C("alert: high-entropy domain, NX domain spike, long TTL, TXT exfiltration, DGA domain pattern") },
  { domain: "cybersecurity.network_intrusion_detection", title: "Detecting port scanning and reconnaissance in network logs", concept: C("SYN to N distinct ports from single source in time window; RST-heavy flows; half-open connections; alert and block") },
  { domain: "cybersecurity.network_intrusion_detection", title: "Implementing network flow analysis for threat detection", concept: C("NetFlow/IPFIX; aggregate per 5-tuple; flag: long duration low bandwidth, unusual port, geo anomaly") },
  { domain: "cybersecurity.network_intrusion_detection", title: "Designing encrypted traffic analysis for TLS threat detection", concept: C("JA3/JA3S fingerprint; certificate anomalies; flow metadata: size, timing, burst pattern; no decryption needed") },
  { domain: "cybersecurity.network_intrusion_detection", title: "Implementing zero-trust network segmentation for lateral movement prevention", concept: C("microsegmentation; allow-list per workload; deny east-west by default; enforce at host firewall + network layer") },
];

/** 5. Identity and access management (10) */
const IAM: SeedSpec[] = [
  { domain: "cybersecurity.identity_access_management", title: "Designing privileged access management systems", concept: C("PAM vault: credentials checked out per session; time-limited; recorded session; MFA required; audit log all access") },
  { domain: "cybersecurity.identity_access_management", title: "Implementing just-in-time access provisioning systems", concept: C("request → approval → temporary grant → auto-expire; no standing privilege; audit trail per access grant") },
  { domain: "cybersecurity.identity_access_management", title: "Designing role-based access control for enterprise systems", concept: C("roles map to job functions; least privilege; quarterly access review; detect toxic combinations; automate provisioning") },
  { domain: "cybersecurity.identity_access_management", title: "Implementing multi-factor authentication enforcement policies", concept: C("MFA required for: admin access, external access, sensitive data; phishing-resistant: FIDO2 preferred over TOTP") },
  { domain: "cybersecurity.identity_access_management", title: "Designing service account and machine identity lifecycle management", concept: C("short-lived credentials; no shared service accounts; rotate secrets on schedule; detect unused service accounts") },
  { domain: "cybersecurity.identity_access_management", title: "Implementing OAuth 2.0 and OIDC for federated identity", concept: C("authorization code + PKCE; short-lived access tokens; refresh rotation; audience restriction; introspection endpoint") },
  { domain: "cybersecurity.identity_access_management", title: "Designing identity governance and access certification procedures", concept: C("quarterly cert campaign; manager reviews subordinate access; auto-revoke if not certified; exception with justification") },
  { domain: "cybersecurity.identity_access_management", title: "Implementing continuous authentication for high-risk sessions", concept: C("step-up auth on sensitive action; behavioral biometrics for re-auth; risk score triggers step-up; token binding") },
  { domain: "cybersecurity.identity_access_management", title: "Detecting and responding to account takeover attacks", concept: C("alert: new device, new geo, password change after failed logins; challenge with MFA; notify user; suspend on high confidence") },
  { domain: "cybersecurity.identity_access_management", title: "Implementing directory service hardening procedures", concept: C("disable legacy auth; enforce password policy; Tier 0 admin isolation; Protected Users group; PAC validation") },
];

/** 6. Cloud security (10) */
const CLOUD_SECURITY: SeedSpec[] = [
  { domain: "cybersecurity.cloud_security", title: "Designing cloud security posture management procedures", concept: C("CSPM: continuous config assessment; detect: public S3, open SG, unencrypted EBS; score by severity; remediate auto") },
  { domain: "cybersecurity.cloud_security", title: "Implementing IAM least-privilege policies for cloud workloads", concept: C("grant only required actions on required resources; no wildcards in prod; SCP boundaries; access analyzer") },
  { domain: "cybersecurity.cloud_security", title: "Designing cloud network security architecture with defense in depth", concept: C("VPC; private subnets for workloads; NACLs + SGs; no direct internet to DB tier; egress control; flow logs") },
  { domain: "cybersecurity.cloud_security", title: "Implementing cloud workload runtime security monitoring", concept: C("eBPF-based syscall monitoring; detect: unexpected process, file write, network connect; alert and optionally kill") },
  { domain: "cybersecurity.cloud_security", title: "Designing secrets management in cloud environments", concept: C("Vault or cloud-native secrets manager; no secrets in env vars or code; rotation automation; access audit log") },
  { domain: "cybersecurity.cloud_security", title: "Implementing cloud audit logging and compliance monitoring", concept: C("CloudTrail / Cloud Audit Logs; immutable; alert on: root usage, policy change, console login without MFA") },
  { domain: "cybersecurity.cloud_security", title: "Designing supply chain security for cloud-native pipelines", concept: C("sign container images; verify signature at deploy; SLSA provenance; pin base images; SBOM per release") },
  { domain: "cybersecurity.cloud_security", title: "Implementing data loss prevention controls in cloud environments", concept: C("classify data; DLP policy per classification; block public share of sensitive; scan uploads; alert on violation") },
  { domain: "cybersecurity.cloud_security", title: "Designing cloud incident response procedures for compromised workloads", concept: C("isolate: remove from LB, quarantine SG; snapshot disk; revoke IAM keys; preserve logs; forensic analysis") },
  { domain: "cybersecurity.cloud_security", title: "Implementing infrastructure-as-code security scanning", concept: C("Checkov or tfsec on Terraform; block high severity findings in CI; track finding trend; policy-as-code in OPA") },
];

/** 7. Cryptography in security engineering (10) */
const CRYPTO_SECURITY: SeedSpec[] = [
  { domain: "cybersecurity.cryptography", title: "Implementing TLS certificate validation procedures", concept: C("verify: chain to trusted CA, hostname match, not expired, not revoked (OCSP); reject on any failure; pin for critical") },
  { domain: "cybersecurity.cryptography", title: "Designing key management lifecycle procedures", concept: C("generate in HSM; store encrypted; rotate on schedule; revoke on compromise; audit key usage; backup escrow") },
  { domain: "cybersecurity.cryptography", title: "Implementing data encryption at rest with envelope encryption", concept: C("data key encrypts data; master key encrypts data key; store encrypted data key with data; rotate master key annually") },
  { domain: "cybersecurity.cryptography", title: "Designing cryptographic algorithm selection guidelines", concept: C("symmetric: AES-256-GCM; asymmetric: RSA-2048 or EC P-256; hash: SHA-256+; KDF: Argon2id; avoid: MD5, SHA1, DES") },
  { domain: "cybersecurity.cryptography", title: "Implementing secure random number generation in security systems", concept: C("use OS CSPRNG: /dev/urandom, CryptGenRandom; never use Math.random for security; seed with sufficient entropy") },
  { domain: "cybersecurity.cryptography", title: "Implementing password hashing with modern key derivation functions", concept: C("Argon2id: memory=64MB, iterations=3, parallelism=4; bcrypt: cost=12 fallback; never MD5 or SHA for passwords") },
  { domain: "cybersecurity.cryptography", title: "Designing digital signature verification procedures for software artifacts", concept: C("sign with private key at build; distribute public key out-of-band; verify before execution; reject invalid signature") },
  { domain: "cybersecurity.cryptography", title: "Implementing certificate transparency monitoring procedures", concept: C("monitor CT logs for unauthorized certs for your domains; alert on new cert; automate via crt.sh or Google CT") },
  { domain: "cybersecurity.cryptography", title: "Designing post-quantum cryptography migration procedures", concept: C("inventory: RSA and EC usage; plan migration to CRYSTALS-Kyber/Dilithium; hybrid mode during transition; timeline") },
  { domain: "cybersecurity.cryptography", title: "Implementing HSM integration for cryptographic key protection", concept: C("generate and store keys in HSM; sign and decrypt in HSM; application never sees private key; audit all operations") },
];

/** 8. SOC automation (10) */
const SOC_AUTOMATION: SeedSpec[] = [
  { domain: "cybersecurity.soc_automation", title: "Designing SOAR playbook architectures for SOC automation", concept: C("trigger: alert; enrich: threat intel, asset, user; score: risk; respond: contain, notify; close: document outcome") },
  { domain: "cybersecurity.soc_automation", title: "Implementing alert triage automation in SOC workflows", concept: C("auto-close low-fidelity alerts; enrich with context; score severity; route high to analyst; SLA per score") },
  { domain: "cybersecurity.soc_automation", title: "Designing threat intelligence integration for SOC automation", concept: C("ingest STIX/TAXII feeds; extract IOCs; enrich alerts automatically; age out stale indicators; track hit rate") },
  { domain: "cybersecurity.soc_automation", title: "Implementing automated containment actions in SOAR platforms", concept: C("block IP at firewall; isolate host via EDR; disable user account; actions require confidence threshold; log every action") },
  { domain: "cybersecurity.soc_automation", title: "Designing SOC metrics and KPI measurement systems", concept: C("MTTD, MTTR, alert volume, false positive rate, analyst workload per shift; trend weekly; SLA compliance rate") },
  { domain: "cybersecurity.soc_automation", title: "Implementing case management automation for security incidents", concept: C("auto-create case from high-severity alert; attach evidence; auto-assign by rotation; SLA timer; escalate on breach") },
  { domain: "cybersecurity.soc_automation", title: "Designing automated phishing response playbooks", concept: C("email report → extract IOCs → check mailboxes for same → delete matches → block sender → notify reporter") },
  { domain: "cybersecurity.soc_automation", title: "Implementing AI-assisted alert analysis for SOC analysts", concept: C("LLM summarizes alert context; suggests next steps; analyst confirms; feedback loop improves suggestions over time") },
  { domain: "cybersecurity.soc_automation", title: "Designing shift handover automation for 24/7 SOC operations", concept: C("auto-generate shift report: open cases, alerts, actions taken, metrics; distribute before shift change; acknowledge") },
  { domain: "cybersecurity.soc_automation", title: "Implementing detection engineering pipelines for SOC rule management", concept: C("detection-as-code; PR workflow; test against benign and malicious samples; deploy to SIEM; measure efficacy") },
];

export const CYBERSECURITY_SEED_SPECS: SeedSpec[] = [
  ...THREAT_DETECTION,
  ...INCIDENT_RESPONSE,
  ...VULNERABILITY,
  ...NETWORK_IDS,
  ...IAM,
  ...CLOUD_SECURITY,
  ...CRYPTO_SECURITY,
  ...SOC_AUTOMATION,
];
