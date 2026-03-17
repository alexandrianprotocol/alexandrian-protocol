/**
 * Mobile Engineering Seeds (~70 seed procedures).
 * Offline-first architecture, app lifecycle, push notifications, performance,
 * navigation, accessibility, OTA updates, and cross-platform patterns.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Offline-first architecture (10) */
const OFFLINE_FIRST: SeedSpec[] = [
  { domain: "mobile.offline.sync", title: "Designing offline-first data synchronization architectures", concept: C("local DB as source of truth; sync queue for mutations; push when online; pull on reconnect; merge conflicts") },
  { domain: "mobile.offline.conflict", title: "Implementing conflict resolution for offline-first apps", concept: C("last-write-wins or custom merge; timestamp + server authority; present conflict UI for ambiguous cases") },
  { domain: "mobile.offline.queue", title: "Designing offline mutation queues for deferred operations", concept: C("persist operations to local queue on offline; drain queue on connectivity restored; retry with backoff") },
  { domain: "mobile.offline.cache", title: "Implementing local cache strategies for offline data access", concept: C("SQLite or Realm for structured data; IndexedDB for web; cache-first read; invalidate on sync") },
  { domain: "mobile.offline.delta_sync", title: "Designing delta sync protocols for efficient data synchronization", concept: C("client sends last-seen timestamp or vector clock; server returns only changed records; apply delta") },
  { domain: "mobile.offline.optimistic", title: "Implementing optimistic local updates in offline-first apps", concept: C("apply mutation locally before sync; show immediately; rollback on sync failure; notify user") },
  { domain: "mobile.offline.storage_quota", title: "Managing local storage quotas in mobile offline apps", concept: C("estimate storage usage; evict LRU data when near limit; prioritize user-created content; warn before eviction") },
  { domain: "mobile.offline.network_detection", title: "Detecting network connectivity changes in mobile apps", concept: C("network change listener; debounce rapid changes; check reachability to specific host; trigger sync on connect") },
  { domain: "mobile.offline.schema_migration", title: "Implementing local database schema migrations in mobile apps", concept: C("versioned migration scripts; run on app launch before data access; test on each target OS version") },
  { domain: "mobile.offline.background_sync", title: "Designing background sync for mobile offline data", concept: C("background fetch or WorkManager; sync within time budget; exponential retry; respect battery restrictions") },
];

/** 2. App lifecycle management (8) */
const LIFECYCLE: SeedSpec[] = [
  { domain: "mobile.lifecycle.states", title: "Handling app lifecycle state transitions correctly", concept: C("active → background → suspended → terminated; save state on background; restore on resume; don't block main thread") },
  { domain: "mobile.lifecycle.state_preservation", title: "Implementing state preservation and restoration in mobile apps", concept: C("encode UI state to persistent store on background; restore on next launch; test low-memory termination path") },
  { domain: "mobile.lifecycle.background_tasks", title: "Scheduling background tasks within OS constraints", concept: C("iOS: BGTaskScheduler; Android: WorkManager; respect time limits; test under battery saver and Doze mode") },
  { domain: "mobile.lifecycle.deep_links", title: "Handling deep links and universal links in mobile apps", concept: C("register URL schemes and associated domains; parse path to navigation target; handle from any app state") },
  { domain: "mobile.lifecycle.scene", title: "Designing multi-scene and multi-window app architectures", concept: C("independent scene lifecycle; shared model layer; scene state persistence per scene; iPad multi-window support") },
  { domain: "mobile.lifecycle.memory_pressure", title: "Responding to memory pressure events in mobile apps", concept: C("register memory warning observer; purge caches on warning; measure footprint; avoid large in-memory objects") },
  { domain: "mobile.lifecycle.crash_reporting", title: "Implementing crash reporting and symbolication pipelines", concept: C("integrate crash SDK; upload dSYMs on each build; symbolicate before analysis; triage by affected user count") },
  { domain: "mobile.lifecycle.launch_time", title: "Optimizing mobile app launch time and cold start performance", concept: C("defer non-critical init; async load on background; measure launch time in CI; target < 400ms to first frame") },
];

/** 3. Push notification systems (8) */
const PUSH: SeedSpec[] = [
  { domain: "mobile.push.registration", title: "Implementing device token registration for push notifications", concept: C("request permission; get token from APNs/FCM; send to server with user ID; refresh on token change") },
  { domain: "mobile.push.payload", title: "Designing push notification payload structures", concept: C("title, body, data payload; data-only for background processing; badge count; notification category for actions") },
  { domain: "mobile.push.delivery", title: "Implementing reliable push notification delivery pipelines", concept: C("server → APNs/FCM; handle token expiry; retry on transient error; log delivery status; invalidate stale tokens") },
  { domain: "mobile.push.silent", title: "Designing silent push notification handling for background sync", concept: C("content-available: 1; no user-visible notification; app wakes to sync data; time budget ~30s") },
  { domain: "mobile.push.rich", title: "Implementing rich push notifications with media attachments", concept: C("attachment download in notification service extension; cache media; display in expanded notification") },
  { domain: "mobile.push.targeting", title: "Designing push notification targeting and segmentation", concept: C("segment by: topic, user cohort, device type, OS version; per-user preference; respect opt-out") },
  { domain: "mobile.push.deep_link", title: "Handling push notification tap deep links to specific screens", concept: C("parse notification payload on tap; navigate to target screen; handle from terminated state") },
  { domain: "mobile.push.analytics", title: "Implementing push notification engagement analytics", concept: C("track: delivered, displayed, tapped, dismissed; funnel by segment; optimize timing by open rate") },
];

/** 4. Performance optimization (10) */
const PERFORMANCE: SeedSpec[] = [
  { domain: "mobile.perf.rendering", title: "Optimizing mobile UI rendering for 60fps", concept: C("profile with Xcode Instruments or Android Profiler; identify frame drops; move work off main thread") },
  { domain: "mobile.perf.list", title: "Optimizing list and scroll view performance for large datasets", concept: C("virtualize list; recycle cells; async image loading; prefetch N items ahead; profile scroll FPS") },
  { domain: "mobile.perf.image", title: "Optimizing image loading and caching in mobile apps", concept: C("async download; disk + memory cache; resize to display size; WebP or HEIC; placeholder while loading") },
  { domain: "mobile.perf.network", title: "Optimizing network request performance in mobile apps", concept: C("HTTP/2 multiplexing; connection reuse; request prioritization; cache headers; compress payloads") },
  { domain: "mobile.perf.startup", title: "Reducing app binary size and startup overhead", concept: C("strip unused architectures; asset catalog compression; lazy-load frameworks; measure IPA size in CI") },
  { domain: "mobile.perf.battery", title: "Optimizing mobile app battery consumption", concept: C("minimize background activity; batch network requests; use significant-change location; profile energy in Instruments") },
  { domain: "mobile.perf.memory", title: "Profiling and reducing mobile app memory usage", concept: C("Leaks instrument; Allocations instrument; fix retain cycles; limit cache size; monitor memory warnings") },
  { domain: "mobile.perf.gpu", title: "Optimizing GPU usage and overdraw in mobile UIs", concept: C("Overdraw viewer; reduce layer compositing; opaque views where possible; minimize blending layers") },
  { domain: "mobile.perf.profiling", title: "Designing mobile performance profiling procedures", concept: C("profile on real device; record 30s of representative usage; analyze flame graph; fix top 3 hotspots") },
  { domain: "mobile.perf.benchmarking", title: "Implementing mobile performance benchmarking in CI", concept: C("measure: cold start, scroll FPS, screen transition time; assert against thresholds; alert on regression") },
];

/** 5. Navigation & routing (8) */
const NAVIGATION: SeedSpec[] = [
  { domain: "mobile.nav.stack", title: "Designing stack-based navigation architectures in mobile apps", concept: C("push/pop stack; coordinator pattern; pass only necessary data; avoid view controller coupling") },
  { domain: "mobile.nav.tab", title: "Implementing tab bar navigation with state preservation", concept: C("persistent tab state; restore scroll position; badge count from notification; active tab on deep link") },
  { domain: "mobile.nav.coordinator", title: "Implementing the coordinator pattern for navigation decoupling", concept: C("coordinator owns navigation; view controllers delegate back; child coordinators for sub-flows; start/finish lifecycle") },
  { domain: "mobile.nav.declarative", title: "Designing declarative navigation for SwiftUI and Jetpack Compose", concept: C("navigation path as state; push by appending to path; pop by removing; deep link by setting path programmatically") },
  { domain: "mobile.nav.back_gesture", title: "Handling back gesture and hardware back button correctly", concept: C("intercept back if unsaved changes; confirm dialog; otherwise allow navigation; test on Android back button") },
  { domain: "mobile.nav.transition", title: "Designing custom navigation transitions and animations", concept: C("interactive dismiss gesture; hero animation between screens; respect reduce-motion preference") },
  { domain: "mobile.nav.modal", title: "Designing modal presentation patterns in mobile apps", concept: C("modal for: creation, action sheet, alerts; full-screen or sheet; dismiss on background tap; keyboard avoidance") },
  { domain: "mobile.nav.router", title: "Implementing URL-based routing for cross-platform mobile navigation", concept: C("register route patterns; parse URL to destination; support web and deep link origins; test all routes") },
];

/** 6. Accessibility on mobile (8) */
const ACCESSIBILITY: SeedSpec[] = [
  { domain: "mobile.a11y.voiceover", title: "Implementing VoiceOver and TalkBack accessibility in mobile apps", concept: C("accessibilityLabel; accessibilityHint; accessibilityTraits; group related elements; test with screen reader enabled") },
  { domain: "mobile.a11y.dynamic_type", title: "Supporting Dynamic Type and large font sizes in mobile UIs", concept: C("use system font styles; scalable font metrics; test at largest accessibility size; no truncation of critical text") },
  { domain: "mobile.a11y.contrast", title: "Ensuring color contrast compliance in mobile UIs", concept: C("4.5:1 for normal text; 3:1 for large text; test with accessibility inspector; dark mode contrast separately") },
  { domain: "mobile.a11y.touch_targets", title: "Designing accessible touch target sizes for mobile UIs", concept: C("minimum 44x44pt touch target; expand hit area without changing visual size; test with fat finger") },
  { domain: "mobile.a11y.focus_order", title: "Implementing correct accessibility focus order in mobile UIs", concept: C("focus follows logical reading order; group elements with container; skip decorative elements") },
  { domain: "mobile.a11y.announcements", title: "Implementing accessibility announcements for dynamic content changes", concept: C("post accessibility announcement on content update; not on every change; describe what changed") },
  { domain: "mobile.a11y.switch_control", title: "Supporting Switch Control and keyboard navigation in mobile apps", concept: C("all interactive elements reachable without touch; focus ring visible; keyboard shortcut support on iPad") },
  { domain: "mobile.a11y.testing", title: "Designing mobile accessibility testing procedures", concept: C("manual: screen reader + large text + inverted colors; automated: accessibility inspector; CI: snapshot with labels") },
];

/** 7. OTA updates & deployment (8) */
const OTA: SeedSpec[] = [
  { domain: "mobile.ota.codepush", title: "Implementing OTA JavaScript bundle updates for React Native", concept: C("CodePush or EAS Update; push JS bundle without App Store; rollback on error; staged rollout by %; skip native changes") },
  { domain: "mobile.ota.rollout", title: "Designing staged OTA update rollout strategies", concept: C("rollout to 5% → monitor crash rate → ramp to 100%; kill switch to halt; user-visible update prompt option") },
  { domain: "mobile.ota.versioning", title: "Designing OTA update versioning and compatibility checks", concept: C("native version range for JS bundle compatibility; reject bundle incompatible with native; version in manifest") },
  { domain: "mobile.ota.background_download", title: "Implementing background OTA update downloads", concept: C("download bundle in background; install on next cold start; not mid-session; verify checksum before install") },
  { domain: "mobile.ota.rollback", title: "Designing OTA update rollback procedures", concept: C("keep last N bundles; auto-rollback on crash threshold; manual rollback via dashboard; restore previous bundle") },
  { domain: "mobile.ota.app_store", title: "Designing App Store release and phased rollout procedures", concept: C("phased release: 1%/2%/5%/10%/20%/50%/100% over 7 days; pause on spike in crashes or 1-star reviews") },
  { domain: "mobile.ota.feature_flags", title: "Using feature flags to decouple mobile deployments from feature releases", concept: C("ship code dark; enable via flag server-side; rollout without new binary; kill switch if issue") },
  { domain: "mobile.ota.ci_cd", title: "Designing CI/CD pipelines for mobile app builds and distribution", concept: C("build → test → sign → upload to TestFlight/Firebase → notify testers; automate version bump and changelog") },
];

export const MOBILE_ENGINEERING_SEED_SPECS: SeedSpec[] = [
  ...OFFLINE_FIRST,
  ...LIFECYCLE,
  ...PUSH,
  ...PERFORMANCE,
  ...NAVIGATION,
  ...ACCESSIBILITY,
  ...OTA,
];
