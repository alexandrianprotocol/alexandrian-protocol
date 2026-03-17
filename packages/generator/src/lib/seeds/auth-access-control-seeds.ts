/**
 * Authentication & Access Control Seeds (~90 seed procedures).
 * MFA, RBAC/ABAC, credential rotation, API key management,
 * session management, OAuth/OIDC, zero trust, and SSO.
 * Domain: auth.*
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Multi-factor authentication (10) */
const MFA: SeedSpec[] = [
  { domain: "auth.mfa.setup", title: "Implementing multi-factor authentication setup procedures", concept: C("enroll: generate TOTP secret; display QR; require verification code before activating; store hashed backup codes") },
  { domain: "auth.mfa.totp", title: "Implementing TOTP-based MFA with time drift tolerance", concept: C("RFC 6238; allow ±1 window (30s drift); HMAC-SHA1; 6-digit code; verify once per window to prevent replay") },
  { domain: "auth.mfa.fido2", title: "Implementing FIDO2/WebAuthn for phishing-resistant MFA", concept: C("register: challenge → authenticator → pubkey stored; authenticate: challenge → assertion → verify signature with pubkey") },
  { domain: "auth.mfa.sms_fallback", title: "Designing SMS MFA fallback with security controls", concept: C("SMS is weakest factor; rate limit OTP sends; expire in 10 min; SS7 attack warning; prefer TOTP or FIDO2") },
  { domain: "auth.mfa.enforcement", title: "Enforcing MFA across user populations with step-up auth", concept: C("require MFA at login for sensitive roles; step-up before high-risk action; grace period with enforced deadline") },
  { domain: "auth.mfa.recovery", title: "Designing MFA recovery procedures for locked-out users", concept: C("backup codes: 8 one-time codes; identity verification before reset; audit recovery events; invalidate old factor") },
  { domain: "auth.mfa.adaptive", title: "Implementing adaptive MFA based on risk signals", concept: C("score: new device, new geo, impossible travel, IP reputation; high score triggers MFA challenge; low skips step-up") },
  { domain: "auth.mfa.push", title: "Implementing push notification MFA with number matching", concept: C("push to registered device; display number on screen; user matches number in app; resist MFA fatigue attacks") },
  { domain: "auth.mfa.passkey", title: "Implementing passkey authentication as MFA replacement", concept: C("WebAuthn credential = phishing-resistant; synced passkey across devices; platform authenticator; passwordless + MFA in one") },
  { domain: "auth.mfa.audit", title: "Auditing MFA enrollment and authentication events", concept: C("log: enroll, verify success/fail, recovery, factor change; alert on: factor removal, mass fail, recovery spike") },
];

/** 2. Role-based access control (10) */
const RBAC: SeedSpec[] = [
  { domain: "auth.rbac.design", title: "Designing role-based access control systems", concept: C("roles → permissions → resources; user assigned roles; check permission at enforcement point; deny by default") },
  { domain: "auth.rbac.role_hierarchy", title: "Implementing role hierarchy and inheritance in RBAC systems", concept: C("junior inherits from senior role; no circular inheritance; flatten at enforcement; document hierarchy explicitly") },
  { domain: "auth.rbac.least_privilege", title: "Applying least privilege principles in RBAC system design", concept: C("grant minimum permissions for job function; no wildcard grants; quarterly review; remove unused roles") },
  { domain: "auth.rbac.validation", title: "Implementing RBAC permission validation at API boundaries", concept: C("check permission per request; middleware before handler; log denied access; no client-side enforcement only") },
  { domain: "auth.rbac.separation_of_duties", title: "Implementing separation of duties constraints in RBAC", concept: C("define toxic combinations: approve + submit, create + pay; detect at assignment; block or alert on SOD violation") },
  { domain: "auth.rbac.abac", title: "Extending RBAC with attribute-based access control policies", concept: C("ABAC: user attributes + resource attributes + environment → policy decision; OPA or Cedar for policy evaluation") },
  { domain: "auth.rbac.review", title: "Designing RBAC access certification and review procedures", concept: C("quarterly manager review of direct report roles; auto-revoke if not certified; exception with business justification") },
  { domain: "auth.rbac.delegation", title: "Implementing controlled role delegation in RBAC systems", concept: C("delegate subset of own permissions; delegate cannot exceed delegator; time-limited; audit delegation chain") },
  { domain: "auth.rbac.provisioning", title: "Automating RBAC role provisioning from HR system", concept: C("HR event → SCIM provisioning → role assignment; deprovision on offboard; role from job code; audit sync events") },
  { domain: "auth.rbac.testing", title: "Testing RBAC permission enforcement with role-based test suites", concept: C("test each role: can access allowed; cannot access denied; test boundary conditions; regression on permission changes") },
];

/** 3. Credential rotation (10) */
const CREDENTIAL_ROTATION: SeedSpec[] = [
  { domain: "auth.rotation.api_keys", title: "Implementing API key rotation procedures without downtime", concept: C("dual-key window: issue new key; update consumer; verify new key works; revoke old key; overlap period N days") },
  { domain: "auth.rotation.database", title: "Implementing database credential rotation procedures", concept: C("generate new password; update in secrets manager; deploy new config; verify connectivity; revoke old password") },
  { domain: "auth.rotation.certificates", title: "Implementing TLS certificate rotation with zero downtime", concept: C("provision new cert before expiry; load alongside old; cutover; verify; revoke old; automate with cert-manager") },
  { domain: "auth.rotation.service_accounts", title: "Rotating service account credentials in production systems", concept: C("create new SA key; distribute via secrets manager; redeploy consumers; verify; delete old key; 30-day overlap") },
  { domain: "auth.rotation.secrets_manager", title: "Automating credential rotation via secrets manager integrations", concept: C("rotation Lambda/function per secret type; test rotation function; enable automatic rotation; alert on failure") },
  { domain: "auth.rotation.schedule", title: "Designing credential rotation schedules by credential type", concept: C("API keys: 90 days; passwords: 180 days; certs: 1 year (automate); root creds: 30 days; adjust by risk tier") },
  { domain: "auth.rotation.detection", title: "Detecting credential rotation failures in automated pipelines", concept: C("monitor: last rotated timestamp; alert if > schedule; test rotation in staging; rollback procedure on failure") },
  { domain: "auth.rotation.emergency", title: "Designing emergency credential rotation procedures for compromise", concept: C("revoke immediately; issue new; broadcast to consumers via alert; verify revocation effective; postmortem") },
  { domain: "auth.rotation.short_lived", title: "Implementing short-lived credential patterns to minimize rotation burden", concept: C("tokens valid 1h; refresh via longer-lived grant; no manual rotation; compromise impact limited by TTL") },
  { domain: "auth.rotation.audit", title: "Auditing credential rotation compliance and history", concept: C("log: rotated by, timestamp, old/new key ID; report rotation compliance rate; alert on missed rotation") },
];

/** 4. API key management (8) */
const API_KEYS: SeedSpec[] = [
  { domain: "auth.apikey.generation", title: "Implementing secure API key generation and distribution", concept: C("generate: 32 bytes CSPRNG → base64url; prefix for identification (sk_, pk_); hash before storing; show once on creation") },
  { domain: "auth.apikey.hashing", title: "Implementing API key storage with one-way hashing", concept: C("store SHA-256 of key; compare hash on request; never store plaintext; show only prefix in UI for identification") },
  { domain: "auth.apikey.scoping", title: "Designing API key scope and permission restriction systems", concept: C("key has scope list; validate key has required scope per endpoint; minimal scope by default; document scope per endpoint") },
  { domain: "auth.apikey.leak_response", title: "Designing API key leak detection and response procedures", concept: C("monitor: GitHub, Pastebin, dark web; alert on detection; revoke immediately; notify owner; audit usage since leak") },
  { domain: "auth.apikey.expiry", title: "Implementing API key expiry and renewal procedures", concept: C("expiry date at creation; warn 30 days before; grace period after; auto-rotate for internal; manual for external") },
  { domain: "auth.apikey.rate_limiting", title: "Implementing per-API-key rate limiting and quota enforcement", concept: C("rate limit by key; quota per billing tier; return 429 with Retry-After; track usage per key; alert near quota") },
  { domain: "auth.apikey.audit", title: "Implementing API key usage audit logging", concept: C("log: key ID, endpoint, timestamp, IP, response code; query by key for forensics; alert on anomalous usage pattern") },
  { domain: "auth.apikey.rotation_automation", title: "Automating API key rotation for internal service-to-service auth", concept: C("secrets manager stores key; rotation function generates new; pushes to consumers; verifies; deletes old; scheduled") },
];

/** 5. Session management (10) */
const SESSIONS: SeedSpec[] = [
  { domain: "auth.session.token_design", title: "Designing secure session token generation and storage", concept: C("random 32-byte token → hex/base64; store hash in DB; HttpOnly Secure SameSite=Strict cookie; never in URL or localStorage") },
  { domain: "auth.session.jwt", title: "Implementing secure JWT session token patterns", concept: C("sign with RS256 or ES256; short expiry 15min; refresh token rotation; store refresh in HttpOnly cookie; verify sig + exp + aud") },
  { domain: "auth.session.refresh", title: "Implementing refresh token rotation for long-lived sessions", concept: C("refresh issues new access + new refresh; invalidate old refresh; detect reuse → invalidate family; sliding window expiry") },
  { domain: "auth.session.revocation", title: "Implementing session revocation for logout and compromise response", concept: C("server-side session store; delete on logout; invalidate all sessions on password change; revoke by user or device") },
  { domain: "auth.session.fixation", title: "Preventing session fixation attacks in authentication flows", concept: C("regenerate session ID after successful login; invalidate pre-auth session; bind session to browser fingerprint") },
  { domain: "auth.session.timeout", title: "Implementing session idle timeout and absolute timeout policies", concept: C("idle timeout: 15-30min inactivity; absolute: 8h max; warn before expiry; extend on activity; re-auth on expiry") },
  { domain: "auth.session.concurrent", title: "Designing concurrent session limits and device management", concept: C("max N sessions per user; list active devices; force-logout oldest or all; alert on new device login") },
  { domain: "auth.session.csrf", title: "Implementing CSRF protection for session-based authentication", concept: C("SameSite=Strict cookie; or Double Submit Cookie; or synchronizer token; validate on state-changing requests") },
  { domain: "auth.session.binding", title: "Implementing session binding to client properties for security", concept: C("bind to: IP, User-Agent; mismatch = suspicious; challenge or invalidate; balance security vs proxy users") },
  { domain: "auth.session.audit", title: "Auditing session lifecycle events for security monitoring", concept: C("log: create, refresh, revoke, expiry, concurrent limit hit; alert on: session from new country, mass revocation") },
];

/** 6. OAuth 2.0 and OIDC (10) */
const OAUTH: SeedSpec[] = [
  { domain: "auth.oauth.authorization_code", title: "Implementing OAuth 2.0 authorization code flow with PKCE", concept: C("code_verifier → SHA256 → code_challenge; exchange code + verifier for tokens; prevents interception attacks") },
  { domain: "auth.oauth.token_validation", title: "Implementing OAuth access token validation at resource servers", concept: C("verify: signature, exp, aud, iss, scope; local JWT validation or introspection; cache introspection response") },
  { domain: "auth.oauth.scopes", title: "Designing OAuth scope hierarchies for API authorization", concept: C("fine-grained scopes per resource and action; display consent per scope; minimal default scope; document each scope") },
  { domain: "auth.oauth.client_credentials", title: "Implementing OAuth client credentials flow for machine-to-machine auth", concept: C("client_id + client_secret → access token; no user context; scope per client; short TTL; rotate client_secret regularly") },
  { domain: "auth.oauth.oidc_claims", title: "Designing OIDC ID token claims for user identity federation", concept: C("standard claims: sub, email, name, picture; custom claims namespaced; validate: nonce, iat, exp, aud, iss") },
  { domain: "auth.oauth.token_storage", title: "Implementing secure OAuth token storage in client applications", concept: C("access token: memory only; refresh token: HttpOnly cookie; never localStorage for sensitive tokens; BFF pattern") },
  { domain: "auth.oauth.pkce", title: "Implementing PKCE for public OAuth clients", concept: C("random 32-byte verifier; S256 challenge; include in auth request; verify in token exchange; required for SPA and mobile") },
  { domain: "auth.oauth.introspection", title: "Implementing OAuth token introspection for opaque token validation", concept: C("POST /introspect with token; returns active + claims; cache response TTL = token remaining life; auth introspection endpoint") },
  { domain: "auth.oauth.rotation", title: "Implementing OAuth client secret rotation procedures", concept: C("generate new secret; dual-secret period; update all consumers; verify; deactivate old; overlap window = deployment time") },
  { domain: "auth.oauth.server_design", title: "Designing OAuth 2.0 authorization server architectures", concept: C("endpoints: /authorize, /token, /introspect, /.well-known/openid-configuration; JWT or opaque tokens; rate limit /token") },
];

/** 7. Zero trust architecture (8) */
const ZERO_TRUST: SeedSpec[] = [
  { domain: "auth.zerotrust.principles", title: "Implementing zero trust architecture principles", concept: C("verify explicitly: authenticate and authorize every request; least privilege; assume breach; inspect all traffic") },
  { domain: "auth.zerotrust.network", title: "Designing zero trust network access architectures", concept: C("no implicit trust by network location; verify identity before network access; microsegmentation; east-west inspection") },
  { domain: "auth.zerotrust.device", title: "Implementing device trust assessment in zero trust architectures", concept: C("device health check: OS patch level, MDM enrollment, disk encryption, no jailbreak; device posture in access decision") },
  { domain: "auth.zerotrust.policy_engine", title: "Designing zero trust policy engine architectures", concept: C("PEP → PDP → access decision; policy: user identity + device + resource + risk + time; deny by default; log decisions") },
  { domain: "auth.zerotrust.workload", title: "Implementing workload identity for zero trust service-to-service auth", concept: C("SPIFFE SVID per workload; mTLS using SVID; no long-lived secrets; rotate certificates automatically; SPIRE agent") },
  { domain: "auth.zerotrust.continuous", title: "Implementing continuous authorization in zero trust systems", concept: C("re-evaluate policy per request not just at login; revoke mid-session on risk change; token binding to device cert") },
  { domain: "auth.zerotrust.data", title: "Implementing data-centric zero trust controls", concept: C("classify data; apply controls at data layer; encryption + access control per object; audit access to sensitive data") },
  { domain: "auth.zerotrust.migration", title: "Designing zero trust migration procedures from perimeter security", concept: C("inventory: apps, users, devices, data; prioritize by risk; migrate incrementally; measure: access denied events, anomalies") },
];

/** 8. SSO and federation (8) */
const SSO: SeedSpec[] = [
  { domain: "auth.sso.saml", title: "Implementing SAML 2.0 SSO integration for enterprise applications", concept: C("IdP-initiated or SP-initiated; validate: signature, issuer, conditions, audience, timing; map attributes to user profile") },
  { domain: "auth.sso.oidc_federation", title: "Implementing OIDC federation for SSO across service providers", concept: C("SP registers with IdP; redirect to IdP; exchange code; validate ID token; create local session; link accounts") },
  { domain: "auth.sso.jit_provisioning", title: "Implementing just-in-time user provisioning via SSO assertions", concept: C("on first SSO login: extract claims; create local account; assign roles from groups claim; update on subsequent login") },
  { domain: "auth.sso.scim", title: "Implementing SCIM provisioning for automated user lifecycle management", concept: C("SCIM 2.0 endpoint; push create/update/deactivate from IdP; map SCIM schema to local schema; webhook or polling") },
  { domain: "auth.sso.group_mapping", title: "Implementing SSO group-to-role mapping for authorization", concept: C("IdP group in SAML assertion or OIDC groups claim; map group → role in SP; update on login; document mapping") },
  { domain: "auth.sso.session_sync", title: "Implementing SSO session synchronization and single logout", concept: C("IdP-initiated SLO: IdP notifies all SPs; SP-initiated: SP notifies IdP + other SPs; SAML SLO or OIDC front-channel logout") },
  { domain: "auth.sso.fallback", title: "Designing SSO fallback procedures for IdP outages", concept: C("local admin account bypasses SSO; break-glass procedure; alert on IdP unavailability; test fallback quarterly") },
  { domain: "auth.sso.multi_idp", title: "Implementing multi-IdP federation for B2B SaaS applications", concept: C("tenant → IdP mapping; dynamic OIDC discovery; per-tenant client registration; domain hint routing; multiple SAML configs") },
];

export const AUTH_ACCESS_CONTROL_SEED_SPECS: SeedSpec[] = [
  ...MFA,
  ...RBAC,
  ...CREDENTIAL_ROTATION,
  ...API_KEYS,
  ...SESSIONS,
  ...OAUTH,
  ...ZERO_TRUST,
  ...SSO,
];
