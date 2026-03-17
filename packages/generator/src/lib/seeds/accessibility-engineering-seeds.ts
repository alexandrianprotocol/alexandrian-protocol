/**
 * Accessibility Engineering Seeds (~65 seed procedures).
 * WCAG 2.2 implementation, ARIA design, keyboard navigation,
 * screen reader testing, color accessibility, cognitive accessibility,
 * and accessibility automation in CI pipelines.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. WCAG 2.2 implementation (10) */
const WCAG: SeedSpec[] = [
  { domain: "a11y.wcag.perceivable", title: "Implementing WCAG perceivable principle for web content", concept: C("text alternatives for non-text; captions for audio; adaptable content; distinguishable: contrast, resize, spacing") },
  { domain: "a11y.wcag.operable", title: "Implementing WCAG operable principle for interactive components", concept: C("keyboard accessible; no seizure risk; navigable; sufficient time; pointer accessible; target size ≥ 24x24px") },
  { domain: "a11y.wcag.understandable", title: "Implementing WCAG understandable principle for UI clarity", concept: C("readable text; predictable behavior; input assistance: labels, errors, suggestions; language attribute set") },
  { domain: "a11y.wcag.robust", title: "Implementing WCAG robust principle for assistive technology compatibility", concept: C("valid HTML; name, role, value for all components; status messages programmatically determined; parse errors fixed") },
  { domain: "a11y.wcag.aa_compliance", title: "Designing WCAG 2.2 AA compliance verification procedures", concept: C("audit each criterion; manual + automated; remediation backlog; track pass/fail per page; retest quarterly") },
  { domain: "a11y.wcag.new_criteria", title: "Implementing WCAG 2.2 new success criteria", concept: C("2.4.11 focus not obscured; 2.4.12 focus not fully hidden; 2.5.3 target size 24x24px; 3.2.6 consistent help") },
  { domain: "a11y.wcag.documentation", title: "Documenting WCAG conformance claims and known exceptions", concept: C("accessibility statement: conformance level, known issues, contact, last reviewed; honest about gaps; publish publicly") },
  { domain: "a11y.wcag.testing_methodology", title: "Designing systematic WCAG testing methodology", concept: C("automated: axe-core; manual: keyboard, screen reader; user testing with disabled users; document each test result") },
  { domain: "a11y.wcag.legal_risk", title: "Implementing accessibility compliance procedures to manage legal risk", concept: C("audit before launch; prioritize P1 issues; document remediation plan; track open issues; external audit annually") },
  { domain: "a11y.wcag.remediation", title: "Designing accessibility remediation prioritization procedures", concept: C("severity: blocker = prevents task completion; critical = major barrier; moderate = workaround exists; prioritize blockers") },
];

/** 2. ARIA design (10) */
const ARIA: SeedSpec[] = [
  { domain: "a11y.aria.roles", title: "Implementing ARIA roles for custom interactive components", concept: C("use native HTML semantics first; add role only when no native element; role must match user expectation") },
  { domain: "a11y.aria.labels", title: "Implementing ARIA labels and descriptions for interactive elements", concept: C("aria-label for icon buttons; aria-labelledby for visible label; aria-describedby for additional context; no duplication") },
  { domain: "a11y.aria.live_regions", title: "Implementing ARIA live regions for dynamic content updates", concept: C("aria-live=polite for non-urgent; aria-live=assertive for critical; aria-atomic=true for full message; avoid excessive announcements") },
  { domain: "a11y.aria.expanded", title: "Implementing ARIA expanded state for disclosure components", concept: C("aria-expanded=true/false on trigger; references controlled element via aria-controls; update on toggle") },
  { domain: "a11y.aria.invalid", title: "Implementing ARIA invalid and error description for form validation", concept: C("aria-invalid=true on error; aria-describedby links to error message element; error visible; corrects on fix") },
  { domain: "a11y.aria.modal", title: "Implementing ARIA modal dialog patterns", concept: C("role=dialog; aria-modal=true; aria-labelledby; trap focus inside; return focus on close; Escape closes") },
  { domain: "a11y.aria.combobox", title: "Implementing ARIA combobox pattern for autocomplete components", concept: C("input role=combobox; listbox popup; aria-expanded; aria-activedescendant tracks focused option; keyboard: arrow, enter, escape") },
  { domain: "a11y.aria.tree", title: "Implementing ARIA tree widget for hierarchical navigation", concept: C("role=tree; treeitem children; aria-expanded per node; aria-selected; keyboard: arrow keys navigate; enter activates") },
  { domain: "a11y.aria.grid", title: "Implementing ARIA grid pattern for data table interaction", concept: C("role=grid; row, gridcell; aria-rowcount, aria-colcount for virtual; row selection with aria-selected; keyboard navigation") },
  { domain: "a11y.aria.anti_patterns", title: "Avoiding common ARIA misuse anti-patterns", concept: C("no aria-label on div with no role; no role=button on div without keyboard handler; no duplicate IDs; no aria-hidden on focused element") },
];

/** 3. Keyboard navigation (8) */
const KEYBOARD: SeedSpec[] = [
  { domain: "a11y.keyboard.focus_management", title: "Implementing keyboard focus management for interactive applications", concept: C("logical tab order; visible focus indicator; manage focus on route change, modal open/close, content load") },
  { domain: "a11y.keyboard.focus_visible", title: "Designing visible focus indicators meeting WCAG 2.2 requirements", concept: C("focus indicator: 3px outline, 3:1 contrast vs adjacent color; never outline:none without replacement; test with keyboard") },
  { domain: "a11y.keyboard.skip_links", title: "Implementing skip navigation links for keyboard users", concept: C("first link: skip to main content; visible on focus; bypass repeated blocks; test with keyboard; anchor to main landmark") },
  { domain: "a11y.keyboard.trap", title: "Implementing focus trap patterns for modals and drawers", concept: C("trap focus to modal while open; Tab wraps at boundary; Shift+Tab wraps backwards; Escape closes and returns focus") },
  { domain: "a11y.keyboard.shortcuts", title: "Designing keyboard shortcut systems for complex applications", concept: C("document all shortcuts; avoid browser/OS conflicts; allow customization; notify with shortcut indicator in UI") },
  { domain: "a11y.keyboard.roving_tabindex", title: "Implementing roving tabindex pattern for composite widgets", concept: C("one element in group has tabindex=0; others tabindex=-1; arrow keys move focus and update tabindex within group") },
  { domain: "a11y.keyboard.testing", title: "Designing keyboard accessibility testing procedures", concept: C("unplug mouse; navigate entire user journey by keyboard only; verify: reach all interactive elements, no traps, logical order") },
  { domain: "a11y.keyboard.forms", title: "Implementing keyboard-accessible form interaction patterns", concept: C("Enter submits; Tab advances fields; error moves focus to error summary; label click focuses input; no keyboard traps") },
];

/** 4. Screen reader testing (8) */
const SCREEN_READER: SeedSpec[] = [
  { domain: "a11y.screenreader.nvda", title: "Implementing NVDA screen reader testing procedures for Windows", concept: C("NVDA with Chrome or Firefox; test: headings nav, landmark nav, forms mode, interactive elements, live regions") },
  { domain: "a11y.screenreader.voiceover", title: "Implementing VoiceOver screen reader testing procedures for macOS/iOS", concept: C("VO+U for rotor; test: element order, labels, roles, state, grouped elements; iOS: swipe navigation") },
  { domain: "a11y.screenreader.jaws", title: "Implementing JAWS screen reader testing procedures for enterprise", concept: C("JAWS with IE/Chrome; virtual cursor; forms mode; heading and landmark navigation; table reading") },
  { domain: "a11y.screenreader.announcements", title: "Validating screen reader announcements for interactive state changes", concept: C("toggle button: announce pressed/not pressed; live region: announce update; modal: announce dialog name on open") },
  { domain: "a11y.screenreader.images", title: "Implementing accessible image descriptions for screen readers", concept: C("informative: descriptive alt; decorative: alt=''; complex: alt + long description; charts: data table alternative") },
  { domain: "a11y.screenreader.tables", title: "Implementing accessible data tables for screen reader navigation", concept: C("th with scope; caption; summary for complex; avoid layout tables; header+id for complex multi-header tables") },
  { domain: "a11y.screenreader.reading_order", title: "Validating screen reader reading order matches visual order", concept: C("DOM order = reading order; CSS reordering does not change DOM order; screen reader follows DOM; test with SR") },
  { domain: "a11y.screenreader.custom_components", title: "Testing custom component screen reader compatibility", concept: C("verify: announced on focus, state changes announced, action result announced, keyboard interaction works in SR mode") },
];

/** 5. Color accessibility (8) */
const COLOR: SeedSpec[] = [
  { domain: "a11y.color.contrast_text", title: "Implementing WCAG color contrast requirements for text", concept: C("normal text: 4.5:1; large text (18pt or 14pt bold): 3:1; test with contrast checker; include hover and focus states") },
  { domain: "a11y.color.contrast_ui", title: "Implementing WCAG contrast requirements for UI components", concept: C("non-text UI: 3:1 against adjacent color; applies to: input borders, focus indicators, chart elements, icons") },
  { domain: "a11y.color.not_only", title: "Ensuring color is not the only means of conveying information", concept: C("error: icon + text + border color; required field: asterisk + label text; status: icon + color; link: underline + color") },
  { domain: "a11y.color.dark_mode", title: "Designing accessible dark mode color schemes", concept: C("recalculate contrast for dark background; maintain 4.5:1; test all states; don't invert images; use design tokens") },
  { domain: "a11y.color.colorblind", title: "Designing for colorblind accessibility in UI systems", concept: C("simulate deuteranopia, protanopia, tritanopia; avoid red/green only distinction; test with Sim Daltonism; use patterns") },
  { domain: "a11y.color.design_tokens", title: "Implementing accessible color token systems for design systems", concept: C("token encodes role not value; foreground/background pairs pre-validated for contrast; semantic + component tokens") },
  { domain: "a11y.color.testing", title: "Automating color contrast testing in design and development workflows", concept: C("Figma: contrast plugin in design; CI: axe-core color rules; storybook: accessibility addon; fail build on violation") },
  { domain: "a11y.color.high_contrast", title: "Supporting Windows high contrast mode in web applications", concept: C("test in HCM: black/white themes; avoid background-image for functional icons; use currentColor; forced-colors media query") },
];

/** 6. Cognitive accessibility (8) */
const COGNITIVE: SeedSpec[] = [
  { domain: "a11y.cognitive.plain_language", title: "Implementing plain language guidelines for cognitive accessibility", concept: C("reading level ≤ grade 8; short sentences; active voice; common words; define jargon; COGA guidelines") },
  { domain: "a11y.cognitive.error_prevention", title: "Designing error prevention patterns for cognitive accessibility", concept: C("confirm before destructive actions; allow undo; input validation with clear correction guidance; no time limits where possible") },
  { domain: "a11y.cognitive.consistent_navigation", title: "Implementing consistent navigation for cognitive accessibility", concept: C("same nav in same location; same order; consistent terminology; breadcrumbs; multiple ways to find content") },
  { domain: "a11y.cognitive.timeout", title: "Implementing accessible timeout and session expiry patterns", concept: C("warn 2 minutes before timeout; allow extension; no timeout for auth or turn off; WCAG 2.2.1 requirement") },
  { domain: "a11y.cognitive.memory", title: "Designing low-memory-load UI patterns for cognitive accessibility", concept: C("visible labels not just placeholders; show selected state; summary before submit; no hide-important-info on hover only") },
  { domain: "a11y.cognitive.distraction", title: "Reducing cognitive distraction in accessible UI design", concept: C("user can pause/stop animations; no auto-playing audio; no blinking; reduce motion: prefers-reduced-motion media query") },
  { domain: "a11y.cognitive.help", title: "Implementing contextual help patterns for cognitive accessibility", concept: C("inline instructions; tooltip on ? icon; help link nearby complex interactions; WCAG 3.3.5 help requirement") },
  { domain: "a11y.cognitive.form_design", title: "Designing cognitively accessible form patterns", concept: C("one concept per page; clear group headings; visible required indicator; inline error on blur; progress for multi-step") },
];

/** 7. Accessibility automation (8) */
const A11Y_AUTOMATION: SeedSpec[] = [
  { domain: "a11y.automation.axe", title: "Integrating axe-core automated accessibility testing in CI pipelines", concept: C("axe-core in Jest or Playwright; assert zero violations on each page; fail build on new violations; baseline existing") },
  { domain: "a11y.automation.playwright", title: "Implementing accessibility testing with Playwright accessibility snapshots", concept: C("getByRole for selectors; accessibility snapshot assertions; check ARIA tree; test keyboard interactions in E2E") },
  { domain: "a11y.automation.storybook", title: "Implementing accessibility testing in Storybook component development", concept: C("axe accessibility addon; test each story; accessibility panel shows violations; fix before merge; component-level coverage") },
  { domain: "a11y.automation.linting", title: "Implementing static accessibility linting for component code", concept: C("eslint-plugin-jsx-a11y; lint for: missing alt, role misuse, interactive event handlers; fix at authoring time") },
  { domain: "a11y.automation.coverage", title: "Measuring automated accessibility test coverage for web applications", concept: C("track % of pages/components with axe tests; violations by severity over time; new violation gate in CI") },
  { domain: "a11y.automation.contrast", title: "Automating color contrast validation in design and CI systems", concept: C("extract color pairs from computed styles; calculate ratio; fail on < 4.5:1 for text; report violating elements") },
  { domain: "a11y.automation.regression", title: "Implementing accessibility regression testing pipelines", concept: C("snapshot accessibility tree; alert on unexpected changes; review changes in PR; prevent unintentional degradation") },
  { domain: "a11y.automation.monitoring", title: "Implementing production accessibility monitoring for content-heavy sites", concept: C("crawl pages with axe; track violation count by type; alert on increase; report by page and component owner") },
];

export const ACCESSIBILITY_ENGINEERING_SEED_SPECS: SeedSpec[] = [
  ...WCAG,
  ...ARIA,
  ...KEYBOARD,
  ...SCREEN_READER,
  ...COLOR,
  ...COGNITIVE,
  ...A11Y_AUTOMATION,
];
