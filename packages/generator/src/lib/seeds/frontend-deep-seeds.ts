/**
 * Frontend Engineering Deep Detail Layer (~600 seeds).
 * High-impact procedural seeds for layout, typography, CSS, responsive design,
 * accessibility, component architecture, browser rendering, performance,
 * micro-interactions, state management, observability, and testing.
 * Attach automatically to tasks: web app, frontend, dashboard UI, SaaS frontend, responsive layout.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Layout & spacing systems (15 explicit) */
const LAYOUT_SPACING: SeedSpec[] = [
  { domain: "frontend.layout", title: "Designing consistent spacing scale systems", concept: C("scale; tokens; 4/8pt") },
  { domain: "frontend.layout", title: "Implementing 4-point and 8-point spacing grids", concept: C("4pt/8pt base; multiples") },
  { domain: "frontend.layout", title: "Designing layout rhythm using spacing tokens", concept: C("rhythm; vertical; tokens") },
  { domain: "frontend.layout", title: "Creating consistent padding and margin standards", concept: C("padding; margin; system") },
  { domain: "frontend.layout", title: "Designing vertical rhythm systems", concept: C("line-height; spacing; scale") },
  { domain: "frontend.layout", title: "Implementing grid-based layout frameworks", concept: C("grid; columns; gap") },
  { domain: "frontend.layout", title: "Designing column layout strategies", concept: C("columns; breakpoints; fluid") },
  { domain: "frontend.layout", title: "Implementing responsive container widths", concept: C("container; max-width; padding") },
  { domain: "frontend.layout", title: "Designing spacing systems for design tokens", concept: C("tokens; scale; use") },
  { domain: "frontend.layout", title: "Creating spacing consistency across components", concept: C("shared scale; apply") },
  { domain: "frontend.layout", title: "Designing spacing rules for nested components", concept: C("nested; margin collapse; gap") },
  { domain: "frontend.layout", title: "Implementing container-based layout constraints", concept: C("constraint; min/max") },
  { domain: "frontend.layout", title: "Designing adaptive spacing for mobile interfaces", concept: C("mobile; density; touch") },
  { domain: "frontend.layout", title: "Creating visual balance through spacing systems", concept: C("balance; whitespace; hierarchy") },
  { domain: "frontend.layout", title: "Designing whitespace strategies for readability", concept: C("whitespace; line length; block") },
];

/** 2. Typography engineering (10 explicit) */
const TYPOGRAPHY: SeedSpec[] = [
  { domain: "frontend.typography", title: "Designing scalable typography systems", concept: C("scale; ratio; tokens") },
  { domain: "frontend.typography", title: "Implementing typographic scale hierarchies", concept: C("h1–h6; body; caption") },
  { domain: "frontend.typography", title: "Designing responsive typography rules", concept: C("fluid type; clamp; breakpoints") },
  { domain: "frontend.typography", title: "Implementing line height optimization", concept: C("line-height; readability; ratio") },
  { domain: "frontend.typography", title: "Designing readable text block widths", concept: C("max-width; measure; columns") },
  { domain: "frontend.typography", title: "Implementing font loading optimization", concept: C("font-display; preload; subset") },
  { domain: "frontend.typography", title: "Designing fallback font strategies", concept: C("stack; generic; metrics") },
  { domain: "frontend.typography", title: "Implementing variable font systems", concept: C("variable font; axis; weight") },
  { domain: "frontend.typography", title: "Designing accessible typography contrast", concept: C("contrast ratio; size; weight") },
  { domain: "frontend.typography", title: "Implementing typography tokens", concept: C("font; size; weight; line tokens") },
];

/** 3. CSS architecture & maintainability (10 explicit) */
const CSS_ARCH: SeedSpec[] = [
  { domain: "frontend.css", title: "Designing scalable CSS architecture", concept: C("structure; layers; BEM/utility") },
  { domain: "frontend.css", title: "Implementing BEM naming conventions", concept: C("block; element; modifier") },
  { domain: "frontend.css", title: "Designing modular CSS component systems", concept: C("module; scope; compose") },
  { domain: "frontend.css", title: "Implementing CSS utility class frameworks", concept: C("utility; compose; purge") },
  { domain: "frontend.css", title: "Designing CSS variable token systems", concept: C("custom properties; theme; cascade") },
  { domain: "frontend.css", title: "Implementing scoped CSS modules", concept: C("scope; hash; no leak") },
  { domain: "frontend.css", title: "Designing CSS architecture for large applications", concept: C("split; layer; order") },
  { domain: "frontend.css", title: "Implementing maintainable stylesheet structures", concept: C("file structure; import") },
  { domain: "frontend.css", title: "Designing CSS dependency boundaries", concept: C("boundary; no cross-import") },
  { domain: "frontend.css", title: "Implementing layered CSS architecture", concept: C("reset; base; component; util") },
];

/** 4. Responsive design heuristics (10 explicit) */
const RESPONSIVE: SeedSpec[] = [
  { domain: "frontend.responsive", title: "Designing mobile-first responsive interfaces", concept: C("mobile first; progressive enhance") },
  { domain: "frontend.responsive", title: "Implementing breakpoint strategy systems", concept: C("breakpoints; tokens; min/max") },
  { domain: "frontend.responsive", title: "Designing responsive grid layouts", concept: C("grid; fluid; breakpoints") },
  { domain: "frontend.responsive", title: "Implementing adaptive layout scaling", concept: C("scale; clamp; container") },
  { domain: "frontend.responsive", title: "Designing responsive typography scaling", concept: C("fluid type; viewport") },
  { domain: "frontend.responsive", title: "Implementing responsive image strategies", concept: C("srcset; sizes; picture") },
  { domain: "frontend.responsive", title: "Designing responsive component behavior", concept: C("component; breakpoint; variant") },
  { domain: "frontend.responsive", title: "Implementing container query systems", concept: C("container query; @container") },
  { domain: "frontend.responsive", title: "Designing flexible layout patterns", concept: C("flex; grid; wrap") },
  { domain: "frontend.responsive", title: "Implementing responsive navigation systems", concept: C("nav; hamburger; drawer") },
];

/** 5. Accessibility engineering (10 explicit) */
const A11Y: SeedSpec[] = [
  { domain: "frontend.a11y", title: "Implementing WCAG accessibility standards", concept: C("WCAG 2.x; level AA; test") },
  { domain: "frontend.a11y", title: "Designing keyboard-navigable interfaces", concept: C("tab; focus; order; skip") },
  { domain: "frontend.a11y", title: "Implementing ARIA roles and attributes", concept: C("role; aria-*; semantics") },
  { domain: "frontend.a11y", title: "Designing screen reader compatible layouts", concept: C("announce; order; live") },
  { domain: "frontend.a11y", title: "Implementing accessible form validation", concept: C("aria-invalid; describedby; message") },
  { domain: "frontend.a11y", title: "Designing focus management strategies", concept: C("focus trap; return; restore") },
  { domain: "frontend.a11y", title: "Implementing skip navigation links", concept: C("skip link; main content") },
  { domain: "frontend.a11y", title: "Designing accessible modal dialog systems", concept: C("focus trap; escape; announce") },
  { domain: "frontend.a11y", title: "Implementing accessible dropdown menus", concept: C("keyboard; aria-expanded; role") },
  { domain: "frontend.a11y", title: "Designing accessible interactive components", concept: C("keyboard; focus; label") },
];

/** 6. Component architecture (10 explicit) */
const COMPONENT_ARCH: SeedSpec[] = [
  { domain: "frontend.components", title: "Designing reusable UI component systems", concept: C("reuse; props; composition") },
  { domain: "frontend.components", title: "Implementing atomic design architecture", concept: C("atoms; molecules; organisms") },
  { domain: "frontend.components", title: "Designing scalable component hierarchies", concept: C("hierarchy; composition; slot") },
  { domain: "frontend.components", title: "Implementing component composition patterns", concept: C("compose; slot; render prop") },
  { domain: "frontend.components", title: "Designing reusable layout components", concept: C("layout; grid; stack; flex") },
  { domain: "frontend.components", title: "Implementing stateful component boundaries", concept: C("state; lift; boundary") },
  { domain: "frontend.components", title: "Designing component isolation strategies", concept: C("isolate; style; test") },
  { domain: "frontend.components", title: "Implementing UI component testing frameworks", concept: C("render; event; assert") },
  { domain: "frontend.components", title: "Designing component documentation systems", concept: C("Storybook; props; examples") },
  { domain: "frontend.components", title: "Implementing component versioning systems", concept: C("version; changelog; compat") },
];

/** 7. Browser rendering behavior (10 explicit) */
const BROWSER_RENDER: SeedSpec[] = [
  { domain: "frontend.rendering", title: "Understanding browser rendering pipelines", concept: C("parse; layout; paint; composite") },
  { domain: "frontend.rendering", title: "Designing DOM update efficiency strategies", concept: C("batch; minimal DOM; key") },
  { domain: "frontend.rendering", title: "Implementing layout thrashing prevention", concept: C("read then write; batch reads") },
  { domain: "frontend.rendering", title: "Designing repaint minimization strategies", concept: C("contain; layer; will-change") },
  { domain: "frontend.rendering", title: "Implementing GPU acceleration for animations", concept: C("transform; opacity; layer") },
  { domain: "frontend.rendering", title: "Designing CSS containment strategies", concept: C("contain; layout; paint") },
  { domain: "frontend.rendering", title: "Implementing efficient DOM tree structures", concept: C("flat; fragment; minimal") },
  { domain: "frontend.rendering", title: "Designing rendering performance diagnostics", concept: C("profile; LCP; layout shift") },
  { domain: "frontend.rendering", title: "Implementing browser compatibility checks", concept: C("feature; polyfill; fallback") },
  { domain: "frontend.rendering", title: "Designing progressive enhancement strategies", concept: C("core first; enhance; fallback") },
];

/** 8. Frontend performance optimization (10 explicit) */
const FRONTEND_PERF: SeedSpec[] = [
  { domain: "frontend.perf", title: "Designing JavaScript bundle optimization", concept: C("split; tree-shake; minify") },
  { domain: "frontend.perf", title: "Implementing code splitting strategies", concept: C("dynamic import; route; lazy") },
  { domain: "frontend.perf", title: "Designing lazy loading architectures", concept: C("lazy; suspense; boundary") },
  { domain: "frontend.perf", title: "Implementing resource preloading", concept: C("preload; prefetch; priority") },
  { domain: "frontend.perf", title: "Designing asset compression pipelines", concept: C("minify; compress; hash") },
  { domain: "frontend.perf", title: "Implementing image optimization strategies", concept: C("format; size; lazy; srcset") },
  { domain: "frontend.perf", title: "Designing caching strategies for frontend assets", concept: C("cache; immutable; version") },
  { domain: "frontend.perf", title: "Implementing performance budget systems", concept: C("budget; CI; alert") },
  { domain: "frontend.perf", title: "Designing runtime performance monitoring", concept: C("RUM; LCP; FID; CLS") },
  { domain: "frontend.perf", title: "Implementing resource prioritization strategies", concept: C("priority; preload; defer") },
];

/** 9. Interaction & micro-interactions (10 explicit) */
const MICRO_INTERACTIONS: SeedSpec[] = [
  { domain: "frontend.interaction", title: "Designing responsive UI feedback systems", concept: C("feedback; immediate; clear") },
  { domain: "frontend.interaction", title: "Implementing hover interaction patterns", concept: C("hover; focus; active") },
  { domain: "frontend.interaction", title: "Designing loading state animations", concept: C("loading; skeleton; spinner") },
  { domain: "frontend.interaction", title: "Implementing skeleton screen loading", concept: C("skeleton; layout; transition") },
  { domain: "frontend.interaction", title: "Designing animation timing systems", concept: C("duration; easing; token") },
  { domain: "frontend.interaction", title: "Implementing interaction affordances", concept: C("affordance; cue; signifier") },
  { domain: "frontend.interaction", title: "Designing confirmation interaction patterns", concept: C("confirm; undo; feedback") },
  { domain: "frontend.interaction", title: "Implementing gesture-based interactions", concept: C("swipe; pinch; touch") },
  { domain: "frontend.interaction", title: "Designing UI transition consistency", concept: C("consistent; duration; easing") },
  { domain: "frontend.interaction", title: "Implementing animation performance optimization", concept: C("transform; opacity; 60fps") },
];

/** 10. State & data flow design (10 explicit) */
const STATE_DATA: SeedSpec[] = [
  { domain: "frontend.state", title: "Designing frontend state management systems", concept: C("global; local; server state") },
  { domain: "frontend.state", title: "Implementing predictable state update flows", concept: C("unidirectional; reducer; action") },
  { domain: "frontend.state", title: "Designing client-side caching systems", concept: C("cache; stale; invalidate") },
  { domain: "frontend.state", title: "Implementing API data synchronization", concept: C("sync; refetch; optimistic") },
  { domain: "frontend.state", title: "Designing state normalization strategies", concept: C("normalize; by id; relation") },
  { domain: "frontend.state", title: "Implementing optimistic UI updates", concept: C("optimistic; rollback; conflict") },
  { domain: "frontend.state", title: "Designing error state handling", concept: C("error boundary; retry; fallback") },
  { domain: "frontend.state", title: "Implementing frontend data validation", concept: C("validate; schema; client") },
];

/** 11. Frontend observability (5 explicit) */
const FRONTEND_OBS: SeedSpec[] = [
  { domain: "frontend.observability", title: "Implementing frontend error monitoring", concept: C("capture; report; source map") },
  { domain: "frontend.observability", title: "Designing client telemetry pipelines", concept: C("events; RUM; sample") },
  { domain: "frontend.observability", title: "Implementing performance tracking metrics", concept: C("LCP; FID; CLS; TTFB") },
  { domain: "frontend.observability", title: "Designing frontend analytics instrumentation", concept: C("events; user; funnel") },
  { domain: "frontend.observability", title: "Implementing user interaction tracking", concept: C("click; scroll; timing") },
];

/** 12. Frontend testing & reliability (5 explicit) */
const FRONTEND_TEST: SeedSpec[] = [
  { domain: "frontend.testing", title: "Designing component testing strategies", concept: C("unit; integration; user event") },
  { domain: "frontend.testing", title: "Implementing UI regression testing", concept: C("snapshot; visual; diff") },
  { domain: "frontend.testing", title: "Designing visual snapshot testing", concept: C("snapshot; pixel; threshold") },
  { domain: "frontend.testing", title: "Implementing browser compatibility testing", concept: C("matrix; cross-browser; real") },
  { domain: "frontend.testing", title: "Designing frontend CI testing pipelines", concept: C("CI; gate; parallel") },
];

export const FRONTEND_DEEP_SEED_SPECS: SeedSpec[] = [
  ...LAYOUT_SPACING,
  ...TYPOGRAPHY,
  ...CSS_ARCH,
  ...RESPONSIVE,
  ...A11Y,
  ...COMPONENT_ARCH,
  ...BROWSER_RENDER,
  ...FRONTEND_PERF,
  ...MICRO_INTERACTIONS,
  ...STATE_DATA,
  ...FRONTEND_OBS,
  ...FRONTEND_TEST,
];
