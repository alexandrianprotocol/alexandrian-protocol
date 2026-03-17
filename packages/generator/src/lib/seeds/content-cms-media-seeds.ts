/**
 * Content, CMS & Media Seeds (~60 seed procedures).
 * Headless CMS architecture, media transcoding, adaptive bitrate streaming,
 * image CDN design, SEO pipelines, rich text schema, and content versioning.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Headless CMS architecture (10) */
const HEADLESS_CMS: SeedSpec[] = [
  { domain: "content.cms.architecture", title: "Designing headless CMS architectures for multi-channel delivery", concept: C("content model separate from presentation; API-first; deliver to web, mobile, email, kiosk; single source of truth") },
  { domain: "content.cms.content_model", title: "Designing flexible content models for CMS systems", concept: C("content types + fields; references between types; required vs optional; locale per field; versioned schema") },
  { domain: "content.cms.api", title: "Designing CMS delivery API patterns for frontend consumption", concept: C("REST or GraphQL; field selection; include/exclude; locale param; preview vs published; CDN-cacheable responses") },
  { domain: "content.cms.preview", title: "Implementing draft preview systems in headless CMS architectures", concept: C("preview token; draft API endpoint; next.js draft mode or preview mode; separate preview CDN; expiry on publish") },
  { domain: "content.cms.localization", title: "Designing localization and internationalization in CMS systems", concept: C("locale per field; fallback locale chain; translation workflow; locale-specific assets; locale routing") },
  { domain: "content.cms.workflow", title: "Designing content editorial workflow and approval systems", concept: C("draft → review → approved → published; role-based stage transitions; notification on stage change; audit log") },
  { domain: "content.cms.scheduling", title: "Implementing content publish scheduling in CMS systems", concept: C("publish-at timestamp; unpublish-at timestamp; scheduler checks on interval; timezone-aware; preview before publish") },
  { domain: "content.cms.webhooks", title: "Designing CMS webhook systems for content change events", concept: C("emit on: publish, unpublish, delete; payload: content type, ID, locale, timestamp; retry on failure; signature verify") },
  { domain: "content.cms.search", title: "Integrating search indexing with CMS content pipelines", concept: C("webhook on publish → index document; on unpublish → delete from index; mapping CMS fields to search fields") },
  { domain: "content.cms.cache", title: "Designing CDN cache invalidation for CMS content delivery", concept: C("tag-based invalidation; tag by content ID and type; purge on publish; surrogate-key response header") },
];

/** 2. Media transcoding pipelines (8) */
const TRANSCODING: SeedSpec[] = [
  { domain: "content.media.transcoding", title: "Designing video transcoding pipelines for web delivery", concept: C("upload → transcode to H.264/H.265/AV1 at multiple bitrates → package → store; async job queue; webhook on complete") },
  { domain: "content.media.presets", title: "Defining video transcoding presets for multi-quality delivery", concept: C("presets: 1080p, 720p, 480p, 360p; bitrate per preset; keyframe interval; two-pass for quality; profile/level") },
  { domain: "content.media.thumbnails", title: "Implementing video thumbnail generation pipelines", concept: C("extract frame at N seconds; generate sprite sheet; upload to CDN; pick scene-representative frame via model") },
  { domain: "content.media.audio", title: "Designing audio transcoding pipelines for web delivery", concept: C("transcode to AAC 128kbps + 256kbps; HLS audio-only rendition; normalize loudness to -14 LUFS; strip metadata") },
  { domain: "content.media.image_processing", title: "Designing image processing pipelines for media management", concept: C("resize, crop, format convert (WebP/AVIF), compress; on-demand via URL params; cache processed output; watermark") },
  { domain: "content.media.metadata", title: "Extracting and storing media metadata in content pipelines", concept: C("extract: duration, resolution, codec, bitrate, GPS, EXIF; store in DB; use for search and display") },
  { domain: "content.media.drm", title: "Designing DRM integration for protected media delivery", concept: C("Widevine + FairPlay + PlayReady; license server; key rotation; entitlement check before license issue") },
  { domain: "content.media.storage", title: "Designing tiered storage architectures for media assets", concept: C("hot: CDN origin; warm: S3 standard; cold: Glacier; lifecycle rules move by age and access frequency") },
];

/** 3. Adaptive bitrate streaming (8) */
const ABR_STREAMING: SeedSpec[] = [
  { domain: "content.streaming.hls", title: "Designing HLS adaptive bitrate streaming architectures", concept: C("master playlist → variant playlists per bitrate; 2–6 second segments; CDN-delivered; TS or fMP4 format") },
  { domain: "content.streaming.dash", title: "Designing MPEG-DASH adaptive bitrate streaming architectures", concept: C("MPD manifest; representations per quality; segment timeline; CMAF with HLS and DASH dual packaging") },
  { domain: "content.streaming.abr_algorithm", title: "Designing ABR algorithm selection logic for adaptive streaming", concept: C("throughput-based: select bitrate < measured bandwidth × safety factor; buffer-based at low buffer; hybrid switch") },
  { domain: "content.streaming.low_latency", title: "Implementing low-latency HLS and DASH streaming", concept: C("LL-HLS: partial segments; blocking playlist reload; target 2–4 second latency; CDN with push support") },
  { domain: "content.streaming.live", title: "Designing live streaming ingest and delivery architectures", concept: C("ingest via RTMP/SRT; transcode on ingest; package to HLS/DASH; CDN pull from origin; DVR window") },
  { domain: "content.streaming.cdn", title: "Designing CDN configuration for adaptive bitrate streaming", concept: C("long TTL for segments and playlists; manifest short TTL for live; cache key excludes query params; edge tokenization") },
  { domain: "content.streaming.analytics", title: "Implementing video streaming quality of experience analytics", concept: C("collect: buffering ratio, bitrate switches, startup time, errors; segment by CDN node, ISP, device; QoE score") },
  { domain: "content.streaming.subtitle", title: "Implementing subtitle and closed caption delivery in streaming", concept: C("WebVTT sidecar; embed in HLS as text track; TTML for broadcast; SDH track separate; language selection") },
];

/** 4. Image CDN design (8) */
const IMAGE_CDN: SeedSpec[] = [
  { domain: "content.imagecdn.url_api", title: "Designing image CDN URL API for on-demand transformation", concept: C("URL params: w, h, q, f, fit, crop; signed URL for security; cache key = URL; immutable cache on width/height") },
  { domain: "content.imagecdn.format", title: "Implementing automatic image format selection in CDN delivery", concept: C("Accept header: WebP if supported, AVIF if supported, else JPEG; 30–50% size savings vs JPEG; format in cache key") },
  { domain: "content.imagecdn.responsive", title: "Designing responsive image srcset delivery via image CDN", concept: C("srcset: 320w, 640w, 1024w, 1440w; sizes attribute; CDN generates each size on demand; cache each size") },
  { domain: "content.imagecdn.optimization", title: "Implementing image compression optimization in CDN pipelines", concept: C("quality 80 for JPEG; lossless for logos; strip EXIF; progressive JPEG for large; benchmark quality vs size") },
  { domain: "content.imagecdn.watermark", title: "Implementing dynamic watermark overlays in image CDN", concept: C("overlay watermark image at specified position; opacity; scale relative to image; cache watermarked output") },
  { domain: "content.imagecdn.blurhash", title: "Generating and delivering blur placeholder hashes for images", concept: C("generate BlurHash on upload; store with asset; deliver as low-data placeholder; decode in browser with JS") },
  { domain: "content.imagecdn.security", title: "Implementing image CDN URL signing for access control", concept: C("HMAC-SHA256 over URL path + expiry; append signature and expiry to URL; CDN validates before serving") },
  { domain: "content.imagecdn.origin", title: "Designing image CDN origin fetch and caching strategies", concept: C("CDN fetches from S3 origin on miss; cache-control: max-age=31536000 immutable; content hash in URL for cache bust") },
];

/** 5. SEO infrastructure (8) */
const SEO: SeedSpec[] = [
  { domain: "content.seo.metadata", title: "Designing SEO metadata pipeline systems", concept: C("title, description, og:*, twitter:*, canonical; auto-generate from content; per-page overrides; validate with tool") },
  { domain: "content.seo.sitemap", title: "Implementing dynamic sitemap generation for content sites", concept: C("sitemap.xml from content DB; lastmod from updated_at; priority by page type; split if > 50k URLs; ping search engines") },
  { domain: "content.seo.structured_data", title: "Implementing structured data markup for search rich results", concept: C("JSON-LD in head; schema.org types: Article, Product, FAQ, BreadcrumbList; validate with Search Console tool") },
  { domain: "content.seo.rendering", title: "Designing server-side rendering for SEO-critical content", concept: C("SSR or SSG for content pages; bot-detectable prerendering as fallback for SPA; test with Googlebot UA") },
  { domain: "content.seo.core_web_vitals", title: "Optimizing Core Web Vitals for SEO ranking improvement", concept: C("LCP < 2.5s: optimize hero image; CLS < 0.1: reserve space for dynamic elements; INP < 200ms: defer JS") },
  { domain: "content.seo.redirect", title: "Implementing SEO-safe redirect strategies for content migrations", concept: C("301 for permanent; 302 for temporary; preserve URL structure where possible; audit redirect chains; update sitemaps") },
  { domain: "content.seo.canonicalization", title: "Implementing canonical URL strategies for duplicate content", concept: C("canonical tag on all pages; self-canonical; paginated: rel=next/prev; parameter normalization in canonical") },
  { domain: "content.seo.monitoring", title: "Implementing SEO health monitoring for content platforms", concept: C("track: indexed pages, crawl errors, Core Web Vitals, ranking keywords; alert on index drop; Search Console integration") },
];

/** 6. Content versioning & rich text (8) */
const CONTENT_VERSIONING: SeedSpec[] = [
  { domain: "content.versioning.history", title: "Implementing content version history and diff systems", concept: C("store each published version; diff adjacent versions; restore to any version; audit log of changes and authors") },
  { domain: "content.versioning.branching", title: "Designing content branching for parallel editorial workflows", concept: C("branch from main; edit independently; merge branch to main; resolve conflicts; release branch for campaigns") },
  { domain: "content.richtext.schema", title: "Designing portable rich text schemas for headless CMS", concept: C("Portable Text or Slate.js JSON; block types: paragraph, heading, list, image, embed; marks: bold, italic, link") },
  { domain: "content.richtext.rendering", title: "Implementing rich text rendering from schema to HTML", concept: C("recursive renderer per block type; marks wrap inline content; custom components per block type; XSS prevention") },
  { domain: "content.richtext.validation", title: "Validating rich text content against schema constraints", concept: C("check allowed block types; max nesting depth; required fields per block; strip unknown types on import") },
  { domain: "content.richtext.migration", title: "Migrating rich text content between schema formats", concept: C("map source blocks to target; handle unknown types as fallback; validate output; batch migrate with rollback") },
  { domain: "content.versioning.rollback", title: "Implementing content rollback procedures for published content", concept: C("re-publish previous version; CDN cache invalidate; notify stakeholders; log rollback event with reason") },
  { domain: "content.versioning.audit", title: "Implementing content audit trail systems for compliance", concept: C("log: who, what, when, diff; immutable log; query by author, content ID, date range; export for compliance") },
];

export const CONTENT_CMS_MEDIA_SEED_SPECS: SeedSpec[] = [
  ...HEADLESS_CMS,
  ...TRANSCODING,
  ...ABR_STREAMING,
  ...IMAGE_CDN,
  ...SEO,
  ...CONTENT_VERSIONING,
];
