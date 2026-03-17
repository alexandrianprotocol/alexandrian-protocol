/**
 * API Design Patterns Seeds (~80 seed procedures).
 * REST resource modeling, pagination, idempotency, webhooks,
 * GraphQL schema design, versioning, deprecation, and API governance.
 * Domain: api.*
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. REST resource modeling (10) */
const REST: SeedSpec[] = [
  { domain: "api.rest.resource_modeling", title: "Designing REST resource hierarchies and URL structures", concept: C("noun not verb; /resources/{id}/sub-resources; stable resource identifiers; no action verbs in path") },
  { domain: "api.rest.http_methods", title: "Mapping CRUD operations to HTTP methods correctly", concept: C("GET: read; POST: create; PUT: full replace; PATCH: partial update; DELETE: remove; HEAD: metadata; OPTIONS: CORS") },
  { domain: "api.rest.status_codes", title: "Selecting appropriate HTTP status codes for API responses", concept: C("200 OK; 201 Created + Location; 204 No Content; 400 Bad Request; 401 Unauth; 403 Forbidden; 404 Not Found; 409 Conflict; 422 Validation; 429 Rate Limit; 500 Server Error") },
  { domain: "api.rest.response_envelope", title: "Designing consistent REST API response envelope formats", concept: C("data field for payload; meta for pagination; errors array for failures; links for HATEOAS; consistent across all endpoints") },
  { domain: "api.rest.error_format", title: "Designing standardized REST API error response formats", concept: C("error: type URI, title, status, detail, instance; RFC 7807 Problem Details; machine-readable type; human-readable detail") },
  { domain: "api.rest.filtering", title: "Implementing REST API filtering and query parameter conventions", concept: C("filter[field]=value; sort=-created_at; fields=id,name for sparse fieldsets; consistent across all collection endpoints") },
  { domain: "api.rest.hateoas", title: "Implementing HATEOAS hypermedia links in REST API responses", concept: C("links: self, next, prev, related resources; rel attribute names; href absolute URL; allow client navigation without URL knowledge") },
  { domain: "api.rest.content_negotiation", title: "Implementing REST API content negotiation with Accept headers", concept: C("Accept: application/json; application/xml; vendor media types; 406 Not Acceptable on unsupported; default to JSON") },
  { domain: "api.rest.collection", title: "Designing REST collection endpoint behaviors and conventions", concept: C("GET /resources: list; POST /resources: create; collection response: items array + total count + pagination links") },
  { domain: "api.rest.singleton", title: "Designing REST singleton resource patterns", concept: C("singleton: /users/{id}/profile; GET returns single resource; PUT replaces; PATCH updates; no collection for singleton") },
];

/** 2. Pagination (8) */
const PAGINATION: SeedSpec[] = [
  { domain: "api.pagination.cursor", title: "Implementing cursor-based pagination for stable API result sets", concept: C("encode cursor from last item ID or composite; opaque to client; next_cursor in response; consistent under mutation") },
  { domain: "api.pagination.keyset", title: "Implementing keyset pagination for high-performance API endpoints", concept: C("WHERE (created_at, id) > (last_created_at, last_id) ORDER BY created_at, id LIMIT N; index on (created_at, id)") },
  { domain: "api.pagination.offset", title: "Implementing offset pagination with total count for UI components", concept: C("?page=N&per_page=M; LIMIT/OFFSET in DB; return total_count; performant only for small page numbers") },
  { domain: "api.pagination.link_headers", title: "Implementing RFC 5988 Link headers for API pagination", concept: C("Link: <url>; rel=next, <url>; rel=prev, <url>; rel=first, <url>; rel=last; standard; works with HTTP clients") },
  { domain: "api.pagination.infinite_scroll", title: "Designing API pagination contracts for infinite scroll UIs", concept: C("cursor-based; has_more boolean; next_cursor null when exhausted; client appends on scroll; no total count required") },
  { domain: "api.pagination.consistency", title: "Ensuring pagination consistency under concurrent writes", concept: C("cursor encodes stable sort key; inserts after cursor not seen; deletes before cursor skipped; snapshot isolation") },
  { domain: "api.pagination.metadata", title: "Designing pagination metadata in API responses", concept: C("meta: current_page, per_page, total_count, total_pages, has_next, has_prev; include in all paginated responses") },
  { domain: "api.pagination.limits", title: "Implementing API pagination limits and default conventions", concept: C("default per_page=20; max per_page=100; enforce max; 400 if exceeded; document defaults in API reference") },
];

/** 3. Idempotency (8) */
const IDEMPOTENCY: SeedSpec[] = [
  { domain: "api.idempotency.key", title: "Implementing API idempotency keys for safe request retries", concept: C("client sends Idempotency-Key header; server stores result keyed by (key, endpoint); return stored result on duplicate") },
  { domain: "api.idempotency.storage", title: "Designing idempotency key storage and expiry procedures", concept: C("store: key, endpoint, status, response; TTL 24h; reject duplicate in-flight with 409; return result after completion") },
  { domain: "api.idempotency.http_methods", title: "Identifying idempotent HTTP methods and safe retry patterns", concept: C("GET, HEAD, PUT, DELETE are idempotent by spec; POST is not; add idempotency key for POST; PATCH if designed idempotent") },
  { domain: "api.idempotency.payment", title: "Implementing idempotency for payment and financial API operations", concept: C("idempotency key per payment attempt; lock on key before processing; store outcome; return stored on retry; 24h TTL") },
  { domain: "api.idempotency.mutation", title: "Designing idempotent mutation operations in API endpoints", concept: C("upsert by natural key; conditional update with version check; return same result for same logical request") },
  { domain: "api.idempotency.distributed", title: "Implementing distributed idempotency across multiple API servers", concept: C("shared idempotency store (Redis); atomic check-and-set on key; lock prevents concurrent processing of same key") },
  { domain: "api.idempotency.client", title: "Designing client-side idempotency key generation procedures", concept: C("UUID v4 per logical operation; persist key across retries; new key for new logical operation; do not reuse keys") },
  { domain: "api.idempotency.testing", title: "Testing API idempotency with duplicate request test suites", concept: C("send same request twice; assert identical response; verify no duplicate side effects; test concurrent duplicate requests") },
];

/** 4. Webhooks (10) */
const WEBHOOKS: SeedSpec[] = [
  { domain: "api.webhooks.design", title: "Designing webhook event payload schemas", concept: C("payload: event_type, event_id, created_at, api_version, data object; stable schema; versioned envelope") },
  { domain: "api.webhooks.delivery", title: "Implementing reliable webhook delivery with retry procedures", concept: C("persist event; deliver async; retry on non-2xx: 1min, 5min, 30min, 2h, 8h; dead letter after N retries; idempotency_key") },
  { domain: "api.webhooks.signing", title: "Implementing webhook payload signing for consumer verification", concept: C("HMAC-SHA256 of payload with shared secret; include in Svix-Signature or X-Signature header; consumer verifies") },
  { domain: "api.webhooks.registration", title: "Designing webhook endpoint registration and management APIs", concept: C("POST /webhooks: URL + event types + secret; test delivery; list, update, delete; display delivery status per endpoint") },
  { domain: "api.webhooks.filtering", title: "Implementing webhook event type filtering for consumers", concept: C("consumer registers for subset of events; filter at producer; only send relevant events; reduces consumer noise") },
  { domain: "api.webhooks.ordering", title: "Handling out-of-order webhook delivery at consumer endpoints", concept: C("event_id for deduplication; created_at for ordering; consumer processes idempotently; event log for replay") },
  { domain: "api.webhooks.fanout", title: "Designing webhook fan-out architectures for multi-tenant systems", concept: C("event → message bus → per-tenant delivery queue → HTTP delivery worker; isolate slow consumers; backpressure") },
  { domain: "api.webhooks.testing", title: "Designing webhook testing tools and local development procedures", concept: C("tunnel: ngrok or smee.io; test event replay; resend failed deliveries; signature verification test endpoint") },
  { domain: "api.webhooks.timeout", title: "Designing webhook consumer timeout and fast-return requirements", concept: C("consumer must respond within 30s; process async and respond 200 immediately; retry on timeout; document requirement") },
  { domain: "api.webhooks.monitoring", title: "Monitoring webhook delivery health and consumer reliability", concept: C("track: delivery success rate, p99 latency, retry rate, dead letter count per endpoint; alert on unhealthy consumer") },
];

/** 5. GraphQL schema design (10) */
const GRAPHQL: SeedSpec[] = [
  { domain: "api.graphql.schema_design", title: "Designing GraphQL schemas with type-first modeling", concept: C("define types before resolvers; strong typing; nullable by default; non-null for guaranteed fields; document with descriptions") },
  { domain: "api.graphql.mutations", title: "Designing GraphQL mutation patterns with input types and payloads", concept: C("mutation takes single input type; returns payload type with: result + errors + clientMutationId; consistent pattern") },
  { domain: "api.graphql.connections", title: "Implementing Relay-style connections for GraphQL pagination", concept: C("connection: edges[{node, cursor}] + pageInfo{hasNextPage, endCursor}; first/after or last/before arguments") },
  { domain: "api.graphql.n_plus_one", title: "Solving GraphQL N+1 query problems with DataLoader batching", concept: C("DataLoader batches per-request; collect IDs; single DB query per batch; cache within request; per-type loader") },
  { domain: "api.graphql.federation", title: "Designing GraphQL federation for distributed schema composition", concept: C("Apollo Federation: subgraph schemas; @key directive; reference resolver; gateway composes; @external for cross-service fields") },
  { domain: "api.graphql.authorization", title: "Implementing field-level authorization in GraphQL resolvers", concept: C("check permission per resolver; use shield or directive; return null or error for unauthorized fields; log access") },
  { domain: "api.graphql.complexity", title: "Implementing GraphQL query complexity limits to prevent abuse", concept: C("assign cost per field; accumulate cost at parse time; reject if > max_complexity; depth limit; rate limit by complexity") },
  { domain: "api.graphql.subscriptions", title: "Designing GraphQL subscription architectures for real-time data", concept: C("WebSocket transport; subscribe by topic; filter events server-side; connection management; reconnect with cursor") },
  { domain: "api.graphql.error_handling", title: "Designing GraphQL error handling patterns with typed errors", concept: C("union return type: Success | Error; error in data not errors array; machine-readable error codes; partial results allowed") },
  { domain: "api.graphql.persisted_queries", title: "Implementing persisted GraphQL queries for performance and security", concept: C("client registers query with hash; sends hash instead of full query; server validates hash; reduces payload; prevents arbitrary queries") },
];

/** 6. API versioning and deprecation (10) */
const VERSIONING: SeedSpec[] = [
  { domain: "api.versioning.strategy", title: "Selecting API versioning strategies for long-term maintainability", concept: C("URL path: /v1/; header: Api-Version: 2024-01-01; query param: ?version=2; path versioning clearest; header for SaaS") },
  { domain: "api.versioning.breaking_changes", title: "Classifying breaking vs non-breaking API changes", concept: C("breaking: remove field, change type, rename, change behavior; non-breaking: add optional field, new endpoint, add enum value") },
  { domain: "api.versioning.date_based", title: "Implementing date-based API versioning like Stripe", concept: C("version = date of last breaking change; request sends API-Version header; server routes to version logic; changelog by date") },
  { domain: "api.versioning.deprecation_header", title: "Implementing API deprecation headers for consumer notification", concept: C("Deprecation: timestamp; Sunset: date; Link: successor URL; log usage of deprecated; notify consumers by email") },
  { domain: "api.versioning.sunset", title: "Designing API sunset procedures for safe endpoint removal", concept: C("announce 6-12 months ahead; Sunset header; track consumer usage; migrate top consumers; remove only when usage zero") },
  { domain: "api.versioning.compatibility", title: "Maintaining API backward compatibility during version evolution", concept: C("additive changes only in current version; never remove or rename; new version for breaking; test old clients on new deploy") },
  { domain: "api.versioning.changelog", title: "Designing API changelog procedures for consumer communication", concept: C("per-version changelog: added, changed, deprecated, removed; migration guide for breaking; publish before release") },
  { domain: "api.versioning.sdk_versioning", title: "Aligning SDK version releases with API version changes", concept: C("SDK major version = API major version; SDK patch for bug fixes; auto-generate SDK from OpenAPI; changelog sync") },
  { domain: "api.versioning.internal", title: "Designing internal API versioning for microservice boundaries", concept: C("consumer-driven contracts; provider tests consumer expectations; additive changes safe; breaking requires coordination") },
  { domain: "api.versioning.lifecycle", title: "Designing API version lifecycle management procedures", concept: C("GA → deprecated → sunset → removed; support N-1 versions; SLA on deprecated version support duration; migration docs") },
];

export const API_DESIGN_PATTERNS_SEED_SPECS: SeedSpec[] = [
  ...REST,
  ...PAGINATION,
  ...IDEMPOTENCY,
  ...WEBHOOKS,
  ...GRAPHQL,
  ...VERSIONING,
];
