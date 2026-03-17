/**
 * Web Engineering KB Layer — Task → KB Attachment Map for web application development.
 * When a task involves web page design, frontend, backend, full-stack, SaaS, or API services,
 * these KBs attach automatically (via capability routing) to provide architecture, security,
 * performance, UX, and DevOps practices.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** Core Web Engineering Bundle — attach to every web-related task */
const CORE_ARCHITECTURE: SeedSpec[] = [
  { domain: "web.architecture", title: "Designing scalable web application architecture", concept: C("scale axes; stateless; CDN; caching") },
  { domain: "web.architecture", title: "Applying separation of concerns in web applications", concept: C("frontend/backend/logic separation") },
  { domain: "web.architecture", title: "Implementing frontend-backend architecture separation", concept: C("API boundary; contract-first") },
  { domain: "web.architecture", title: "Designing modular web application components", concept: C("modules; stable interfaces") },
  { domain: "web.architecture", title: "Designing service-oriented web architectures", concept: C("services; contracts; discovery") },
  { domain: "web.architecture", title: "Implementing API-driven architectures", concept: C("API-first; versioning") },
  { domain: "web.architecture", title: "Designing stateless web services", concept: C("no server-side session; token or DB state") },
];

const CORE_PERFORMANCE: SeedSpec[] = [
  { domain: "web.performance", title: "Implementing browser caching strategies", concept: C("cache headers; ETag; immutable assets") },
  { domain: "web.performance", title: "Designing content delivery network strategies", concept: C("CDN; edge; cache invalidation") },
  { domain: "web.performance", title: "Implementing HTTP compression strategies", concept: C("gzip/brotli; compress responses") },
  { domain: "web.performance", title: "Designing asset bundling pipelines", concept: C("bundle; tree-shake; minify") },
  { domain: "web.performance", title: "Implementing lazy loading for resources", concept: C("defer; dynamic import; intersection observer") },
  { domain: "web.performance", title: "Designing efficient client-side rendering", concept: C("CSR; hydration; code split") },
  { domain: "web.performance", title: "Implementing server-side rendering strategies", concept: C("SSR; stream; cache") },
  { domain: "web.performance", title: "Designing web performance budgets", concept: C("budget; CI gate; LCP/FID/CLS") },
];

const CORE_SECURITY: SeedSpec[] = [
  { domain: "web.security", title: "Preventing cross-site scripting attacks", concept: C("escape output; CSP; sanitize") },
  { domain: "web.security", title: "Preventing cross-site request forgery", concept: C("CSRF token; SameSite cookie") },
  { domain: "web.security", title: "Designing secure session management", concept: C("session store; rotation; expiry") },
  { domain: "web.security", title: "Implementing secure cookie handling", concept: C("HttpOnly; Secure; SameSite") },
  { domain: "web.security", title: "Designing API authentication systems", concept: C("tokens; OAuth; scope") },
  { domain: "web.security", title: "Implementing input validation for web applications", concept: C("validate; sanitize; allowlist") },
  { domain: "web.security", title: "Designing secure file upload handling", concept: C("type check; size limit; scan") },
];

const CORE_OBSERVABILITY: SeedSpec[] = [
  { domain: "web.observability", title: "Implementing frontend error monitoring", concept: C("error boundary; report; source map") },
  { domain: "web.observability", title: "Designing backend logging systems", concept: C("structured log; level; trace id") },
  { domain: "web.observability", title: "Implementing distributed request tracing", concept: C("trace id; span; propagate") },
  { domain: "web.observability", title: "Designing performance monitoring dashboards", concept: C("metrics; SLI; alert") },
  { domain: "web.observability", title: "Implementing client telemetry collection", concept: C("RUM; events; sampling") },
];

const CORE_TESTING: SeedSpec[] = [
  { domain: "web.testing", title: "Designing frontend component testing", concept: C("unit; render; user events") },
  { domain: "web.testing", title: "Implementing API integration tests", concept: C("contract; status; schema") },
  { domain: "web.testing", title: "Designing end-to-end testing pipelines", concept: C("E2E; browser; critical path") },
  { domain: "web.testing", title: "Implementing browser compatibility testing", concept: C("matrix; visual; polyfill") },
];

/** Frontend Engineering Bundle — attach when task includes UI, frontend, React/Vue/Angular, dashboards */
const FRONTEND_UI_ARCH: SeedSpec[] = [
  { domain: "web.frontend", title: "Designing component-based UI architecture", concept: C("components; composition; props") },
  { domain: "web.frontend", title: "Implementing reusable UI component libraries", concept: C("library; docs; version") },
  { domain: "web.frontend", title: "Designing design system architectures", concept: C("tokens; components; guidelines") },
  { domain: "web.frontend", title: "Implementing state management strategies", concept: C("global vs local; sync; devtools") },
  { domain: "web.frontend", title: "Designing frontend module boundaries", concept: C("modules; lazy load; boundaries") },
];

const FRONTEND_UX: SeedSpec[] = [
  { domain: "web.frontend.ux", title: "Designing consistent spacing systems", concept: C("scale; tokens; consistency") },
  { domain: "web.frontend.ux", title: "Implementing typography scale hierarchies", concept: C("scale; role; contrast") },
  { domain: "web.frontend.ux", title: "Designing responsive layout grids", concept: C("grid; breakpoints; fluid") },
  { domain: "web.frontend.ux", title: "Implementing visual hierarchy principles", concept: C("contrast; size; weight") },
  { domain: "web.frontend.ux", title: "Designing user feedback mechanisms", concept: C("loading; success; error states") },
  { domain: "web.frontend.ux", title: "Implementing loading state interfaces", concept: C("skeleton; spinner; progress") },
  { domain: "web.frontend.ux", title: "Designing intuitive navigation systems", concept: C("nav; breadcrumb; IA") },
  { domain: "web.frontend.ux", title: "Implementing accessibility standards", concept: C("WCAG; keyboard; screen reader") },
];

const FRONTEND_ACCESSIBILITY: SeedSpec[] = [
  { domain: "web.frontend.a11y", title: "Applying WCAG accessibility guidelines", concept: C("WCAG level; criteria; test") },
  { domain: "web.frontend.a11y", title: "Designing keyboard navigable interfaces", concept: C("tab order; focus; skip") },
  { domain: "web.frontend.a11y", title: "Implementing ARIA accessibility attributes", concept: C("roles; labels; live") },
  { domain: "web.frontend.a11y", title: "Designing screen reader compatible interfaces", concept: C("semantic; announce; order") },
];

const FRONTEND_PERF: SeedSpec[] = [
  { domain: "web.frontend.perf", title: "Implementing code splitting strategies", concept: C("split by route; dynamic import") },
  { domain: "web.frontend.perf", title: "Designing lazy loading components", concept: C("lazy; suspense; boundary") },
  { domain: "web.frontend.perf", title: "Implementing asset optimization pipelines", concept: C("minify; compress; hash") },
  { domain: "web.frontend.perf", title: "Designing efficient DOM update strategies", concept: C("virtual DOM; batch; key") },
];

const FRONTEND_MAINTAIN: SeedSpec[] = [
  { domain: "web.frontend.maintain", title: "Designing scalable component structures", concept: C("atomic; composition") },
  { domain: "web.frontend.maintain", title: "Implementing design tokens systems", concept: C("tokens; theme; cascade") },
  { domain: "web.frontend.maintain", title: "Designing UI documentation systems", concept: C("Storybook; props; examples") },
];

/** Backend Service Bundle — attach when task includes backend, APIs, server, microservices */
const BACKEND_API: SeedSpec[] = [
  { domain: "web.backend", title: "Designing RESTful APIs", concept: C("resources; HTTP; idempotency") },
  { domain: "web.backend", title: "Designing GraphQL APIs", concept: C("schema; resolve; N+1") },
  { domain: "web.backend", title: "Implementing API versioning strategies", concept: C("URL or header; deprecate") },
  { domain: "web.backend", title: "Designing API rate limiting systems", concept: C("limit; key; backoff") },
  { domain: "web.backend", title: "Implementing pagination strategies", concept: C("cursor or offset; limit") },
];

const BACKEND_SERVICE: SeedSpec[] = [
  { domain: "web.backend", title: "Designing stateless backend services", concept: C("no local state; scale horizontal") },
  { domain: "web.backend", title: "Implementing service layer architecture", concept: C("layer; boundary; DTO") },
  { domain: "web.backend", title: "Designing domain service boundaries", concept: C("domain; aggregate; boundary") },
  { domain: "web.backend", title: "Implementing dependency injection patterns", concept: C("inject; test; config") },
];

const BACKEND_RELIABILITY: SeedSpec[] = [
  { domain: "web.backend", title: "Implementing retry strategies", concept: C("retry; backoff; idempotency") },
  { domain: "web.backend", title: "Designing circuit breaker patterns", concept: C("open/closed/half-open") },
  { domain: "web.backend", title: "Implementing service health checks", concept: C("liveness; readiness; deps") },
  { domain: "web.backend", title: "Designing graceful degradation strategies", concept: C("fallback; partial; degrade") },
];

const BACKEND_DATA: SeedSpec[] = [
  { domain: "web.backend", title: "Designing database access layers", concept: C("repository; transaction; pool") },
  { domain: "web.backend", title: "Implementing data validation pipelines", concept: C("validate; schema; reject") },
  { domain: "web.backend", title: "Designing transaction management strategies", concept: C("ACID; isolation; rollback") },
];

/** Web UX micro-details — high-impact small details */
const WEB_UX_INTERACTION: SeedSpec[] = [
  { domain: "web.ux", title: "Implementing loading indicators", concept: C("indicator; placement; duration") },
  { domain: "web.ux", title: "Designing optimistic UI updates", concept: C("update UI; rollback on error") },
  { domain: "web.ux", title: "Implementing skeleton loading states", concept: C("skeleton; layout; transition") },
  { domain: "web.ux", title: "Designing hover feedback systems", concept: C("hover; focus; active") },
  { domain: "web.ux", title: "Implementing transition animations", concept: C("duration; easing; reduce motion") },
];

const WEB_UX_NAV: SeedSpec[] = [
  { domain: "web.ux", title: "Designing breadcrumb navigation", concept: C("breadcrumb; hierarchy; link") },
  { domain: "web.ux", title: "Implementing intuitive menu structures", concept: C("menu; grouping; depth") },
  { domain: "web.ux", title: "Designing search interfaces", concept: C("search; suggest; result") },
];

const WEB_UX_ERROR: SeedSpec[] = [
  { domain: "web.ux", title: "Designing meaningful error messages", concept: C("user language; action; code") },
  { domain: "web.ux", title: "Implementing graceful error states", concept: C("state; retry; fallback") },
  { domain: "web.ux", title: "Designing retry UI patterns", concept: C("retry button; auto-retry; backoff") },
];

const WEB_UX_A11Y: SeedSpec[] = [
  { domain: "web.ux", title: "Designing high contrast UI themes", concept: C("contrast ratio; theme; toggle") },
  { domain: "web.ux", title: "Implementing focus state indicators", concept: C("focus ring; visible; skip") },
  { domain: "web.ux", title: "Designing accessible form validation", concept: C("aria-invalid; message; link") },
];

/** Documentation, DevOps, Observability (web-specific) */
const WEB_DOCS: SeedSpec[] = [
  { domain: "web.docs", title: "Writing API documentation", concept: C("OpenAPI; examples; version") },
  { domain: "web.docs", title: "Creating frontend component documentation", concept: C("props; examples; usage") },
  { domain: "web.docs", title: "Designing developer onboarding guides", concept: C("setup; run; contribute") },
  { domain: "web.docs", title: "Creating architecture diagrams", concept: C("C4; flow; keep current") },
  { domain: "web.docs", title: "Writing deployment documentation", concept: C("env; steps; rollback") },
];

const WEB_DEVOPS: SeedSpec[] = [
  { domain: "web.devops", title: "Designing CI/CD pipelines", concept: C("build; test; deploy stages") },
  { domain: "web.devops", title: "Implementing automated deployment systems", concept: C("trigger; verify; notify") },
  { domain: "web.devops", title: "Designing staging environments", concept: C("staging; parity; promote") },
  { domain: "web.devops", title: "Implementing feature flag systems", concept: C("flag; target; rollout") },
  { domain: "web.devops", title: "Designing rollback deployment procedures", concept: C("rollback; verify; alert") },
];

const WEB_OBS: SeedSpec[] = [
  { domain: "web.observability", title: "Designing logging systems", concept: C("structured; level; trace") },
  { domain: "web.observability", title: "Implementing performance monitoring", concept: C("metrics; SLI; dashboard") },
  { domain: "web.observability", title: "Designing error tracking systems", concept: C("capture; group; notify") },
  { domain: "web.observability", title: "Implementing request tracing", concept: C("trace id; span; propagate") },
  { domain: "web.observability", title: "Designing alerting pipelines", concept: C("rule; threshold; route") },
];

export const WEB_ENGINEERING_SEED_SPECS: SeedSpec[] = [
  ...CORE_ARCHITECTURE,
  ...CORE_PERFORMANCE,
  ...CORE_SECURITY,
  ...CORE_OBSERVABILITY,
  ...CORE_TESTING,
  ...FRONTEND_UI_ARCH,
  ...FRONTEND_UX,
  ...FRONTEND_ACCESSIBILITY,
  ...FRONTEND_PERF,
  ...FRONTEND_MAINTAIN,
  ...BACKEND_API,
  ...BACKEND_SERVICE,
  ...BACKEND_RELIABILITY,
  ...BACKEND_DATA,
  ...WEB_UX_INTERACTION,
  ...WEB_UX_NAV,
  ...WEB_UX_ERROR,
  ...WEB_UX_A11Y,
  ...WEB_DOCS,
  ...WEB_DEVOPS,
  ...WEB_OBS,
];
