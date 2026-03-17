/**
 * AI Safety & Red Teaming Seeds (~70 seed procedures).
 * Prompt injection defense, red team design, output policy enforcement,
 * safe tool-use authorization, model safety evaluation, and behavioral monitoring.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Prompt injection defense (10) */
const PROMPT_INJECTION: SeedSpec[] = [
  { domain: "ai.safety.injection.defense", title: "Designing prompt injection defense architectures for LLM systems", concept: C("separate trusted instructions from untrusted content; never concatenate user input into system prompt directly") },
  { domain: "ai.safety.injection.detection", title: "Implementing prompt injection detection classifiers", concept: C("classifier trained on injection patterns; score each input; block or flag above threshold; log for review") },
  { domain: "ai.safety.injection.sandboxing", title: "Sandboxing untrusted content from LLM instruction context", concept: C("mark untrusted content with XML tags; instruct model to treat as data; validate model treats it as data") },
  { domain: "ai.safety.injection.indirect", title: "Defending against indirect prompt injection via web content", concept: C("sanitize retrieved content before injection into context; strip instruction-like patterns; warn model of untrusted sources") },
  { domain: "ai.safety.injection.input_validation", title: "Implementing input validation for LLM application endpoints", concept: C("length limit; character class filter; reject known injection payloads; validate against schema") },
  { domain: "ai.safety.injection.output_validation", title: "Validating LLM output for injection-driven anomalies", concept: C("check output for unexpected instructions, code, or policy violations; block if detected; log for audit") },
  { domain: "ai.safety.injection.privilege_separation", title: "Designing privilege-separated LLM agent architectures", concept: C("separate high-privilege orchestrator from low-privilege content processors; content cannot escalate privileges") },
  { domain: "ai.safety.injection.context_isolation", title: "Isolating conversation contexts for multi-tenant LLM systems", concept: C("per-user system prompt; no cross-user context leakage; validate isolation in adversarial test") },
  { domain: "ai.safety.injection.monitoring", title: "Monitoring LLM inputs and outputs for injection patterns", concept: C("log all inputs; async classifier scan; alert on detected patterns; rate limit flagged users") },
  { domain: "ai.safety.injection.test", title: "Designing prompt injection test suites for LLM applications", concept: C("catalog: direct override attempts, role-play escapes, indirect via tool output; test all injection surfaces") },
];

/** 2. Red team design (10) */
const RED_TEAM: SeedSpec[] = [
  { domain: "ai.safety.redteam.methodology", title: "Designing systematic red team methodologies for AI systems", concept: C("define threat model; enumerate attack surfaces; assign red team personas; document findings with severity") },
  { domain: "ai.safety.redteam.scenarios", title: "Developing adversarial red team scenario libraries", concept: C("categories: jailbreaks, misuse, injection, bias, privacy extraction; version scenario library; track pass/fail") },
  { domain: "ai.safety.redteam.automated", title: "Implementing automated red team pipelines for LLM evaluation", concept: C("adversarial model generates attacks; target model responds; judge model scores; iterate over attack corpus") },
  { domain: "ai.safety.redteam.jailbreak", title: "Cataloguing and testing jailbreak attack vectors", concept: C("role-play personas, many-shot priming, token manipulation, encoding; test each against policy; document bypass rate") },
  { domain: "ai.safety.redteam.dual_use", title: "Evaluating dual-use capability risks in foundation models", concept: C("enumerate high-risk capability domains; probe uplift vs baseline; score risk level; apply mitigations") },
  { domain: "ai.safety.redteam.multimodal", title: "Red teaming multimodal AI systems across input modalities", concept: C("image-based injection; audio adversarial examples; cross-modal attacks; test each modality independently") },
  { domain: "ai.safety.redteam.agentic", title: "Red teaming agentic AI systems with tool access", concept: C("test: unauthorized tool use, privilege escalation, data exfiltration, catastrophic irreversible actions") },
  { domain: "ai.safety.redteam.persona", title: "Designing red team persona attack strategies", concept: C("DAN, character roleplay, fictional framing, hypothetical scenarios; document which personas bypass policy") },
  { domain: "ai.safety.redteam.reporting", title: "Designing red team finding severity classification systems", concept: C("critical: policy bypass with harmful output; high: partial bypass; medium: edge case; low: theoretical") },
  { domain: "ai.safety.redteam.cadence", title: "Designing continuous red team evaluation cadences", concept: C("pre-release red team gate; monthly ongoing; triggered by capability upgrade; adversarial probing by external team") },
];

/** 3. Output policy enforcement (10) */
const POLICY: SeedSpec[] = [
  { domain: "ai.safety.policy.classifier", title: "Designing output safety classifier pipelines", concept: C("pre-output classifier on generated text; categories: harmful, policy-violating, PII; block if above threshold") },
  { domain: "ai.safety.policy.constitutional", title: "Implementing constitutional AI self-critique loops", concept: C("generate → self-critique vs principles → revise; repeat until no violation; validate with judge model") },
  { domain: "ai.safety.policy.layered", title: "Designing layered output safety enforcement pipelines", concept: C("rule-based filter → ML classifier → human review queue; each layer catches different failure modes") },
  { domain: "ai.safety.policy.refuse", title: "Designing refusal response generation systems", concept: C("detect policy violation; generate non-harmful refusal explanation; suggest alternative if applicable; log") },
  { domain: "ai.safety.policy.grounding", title: "Implementing retrieval grounding to reduce hallucination risk", concept: C("answer only from retrieved context; cite sources; flag when answer not in context; reduce unsupported claims") },
  { domain: "ai.safety.policy.pii_redaction", title: "Implementing PII detection and redaction in LLM outputs", concept: C("scan output for PII patterns; redact before delivery; log redaction event; alert on repeated PII detection") },
  { domain: "ai.safety.policy.watermarking", title: "Implementing AI-generated content watermarking", concept: C("statistical watermark in token distribution; detectable post-hoc; does not significantly affect quality") },
  { domain: "ai.safety.policy.rate_limiting", title: "Designing policy-aware rate limiting for LLM API endpoints", concept: C("rate limit by risk tier; stricter limits for sensitive capability endpoints; ban on repeated policy violations") },
  { domain: "ai.safety.policy.audit", title: "Designing AI output audit log systems for compliance", concept: C("log: request, response, user ID, model version, latency, policy decisions; immutable; query by user or violation") },
  { domain: "ai.safety.policy.explainability", title: "Designing explainable policy decision systems for AI outputs", concept: C("output: decision (allow/block), rule matched, confidence; log for review; user-facing explanation if blocked") },
];

/** 4. Safe tool-use authorization (8) */
const TOOL_AUTH: SeedSpec[] = [
  { domain: "ai.safety.tools.authorization", title: "Designing tool-use authorization frameworks for AI agents", concept: C("each tool has capability scope; agent role maps to allowed tool set; deny by default; audit all tool calls") },
  { domain: "ai.safety.tools.confirmation", title: "Implementing human-in-the-loop confirmation for high-impact actions", concept: C("classify action impact: read/low/medium/high/irreversible; require human confirm for high and irreversible") },
  { domain: "ai.safety.tools.scope_limiting", title: "Designing tool capability scope limiting for agent safety", concept: C("tool exposed with minimal scope; read-only where possible; parameterize allowed targets; no wildcard access") },
  { domain: "ai.safety.tools.sandboxing", title: "Sandboxing AI agent tool execution environments", concept: C("code execution in isolated container; network blocked; filesystem limited; timeout enforced; output scanned") },
  { domain: "ai.safety.tools.rate_limiting", title: "Rate limiting AI agent tool call frequency", concept: C("max calls per tool per session; alert on abnormal frequency; circuit break on repeated errors") },
  { domain: "ai.safety.tools.rollback", title: "Designing rollback mechanisms for reversible AI agent actions", concept: C("log each action with enough state to undo; provide undo path; require confirm for irreversible actions") },
  { domain: "ai.safety.tools.logging", title: "Designing comprehensive tool call audit logs for AI agents", concept: C("log: tool name, params, result, agent ID, session ID, timestamp; alert on unusual patterns") },
  { domain: "ai.safety.tools.injection_defense", title: "Defending against tool output injection in AI agent pipelines", concept: C("treat tool output as untrusted data; validate schema; sanitize before re-injecting into context") },
];

/** 5. Model safety evaluation (10) */
const SAFETY_EVAL: SeedSpec[] = [
  { domain: "ai.safety.eval.benchmarks", title: "Designing safety evaluation benchmark suites for LLMs", concept: C("categories: harm, bias, robustness, honesty; fixed eval set; track pass rate per version; public baselines") },
  { domain: "ai.safety.eval.harm_categories", title: "Taxonomizing harm categories for AI safety evaluation", concept: C("categories: violence, CSAM, self-harm, disinformation, illegal activity; severity tiers per category") },
  { domain: "ai.safety.eval.bias", title: "Evaluating demographic bias in AI model outputs", concept: C("test prompts varied by demographic signals; measure output distribution disparity; document findings") },
  { domain: "ai.safety.eval.honesty", title: "Evaluating AI model honesty and calibration", concept: C("factual accuracy on knowledge benchmark; calibration of confidence; hallucination rate on grounded tasks") },
  { domain: "ai.safety.eval.robustness", title: "Evaluating model robustness to input perturbations", concept: C("typos, paraphrases, character substitutions; assert consistent output; regression on safety under perturbation") },
  { domain: "ai.safety.eval.capability_elicitation", title: "Designing capability elicitation evaluations for safety thresholds", concept: C("best-of-N prompting; few-shot; chain-of-thought; measure peak capability; compare to safety threshold") },
  { domain: "ai.safety.eval.regression", title: "Implementing safety regression testing for model updates", concept: C("fixed eval set; run on each model version; block deployment on safety regression; alert on any violation") },
  { domain: "ai.safety.eval.human_feedback", title: "Designing human evaluation protocols for AI safety assessment", concept: C("rater guidelines; safety rubric; blind to model version; inter-rater agreement check; aggregate by category") },
  { domain: "ai.safety.eval.uplift", title: "Evaluating dangerous capability uplift provided by AI models", concept: C("baseline: information freely available; measure uplift vs baseline; quantify real-world risk increase") },
  { domain: "ai.safety.eval.agentic", title: "Evaluating safety properties of agentic AI systems", concept: C("test: scope adherence, instruction following under manipulation, graceful refusal, irreversible action avoidance") },
];

/** 6. Behavioral monitoring (8) */
const MONITORING: SeedSpec[] = [
  { domain: "ai.safety.monitoring.anomaly", title: "Detecting anomalous AI model behavior in production", concept: C("baseline output distribution; alert on shift in refusal rate, topic distribution, or length distribution") },
  { domain: "ai.safety.monitoring.policy_violation", title: "Monitoring AI output policy violation rates in production", concept: C("classifier samples outputs; track violation rate per category; alert on increase; route violating outputs to review") },
  { domain: "ai.safety.monitoring.user_feedback", title: "Integrating user safety feedback signals into monitoring", concept: C("thumbs down / report button; categorize feedback; alert on spike; route to safety review queue") },
  { domain: "ai.safety.monitoring.shadow_classifier", title: "Running shadow safety classifiers on production AI outputs", concept: C("async classify outputs with stricter classifier; compare to deployed classifier; surface disagreements for review") },
  { domain: "ai.safety.monitoring.capability_drift", title: "Monitoring AI capability drift after fine-tuning updates", concept: C("run capability benchmark on each model update; compare to base; alert on unexpected capability change") },
  { domain: "ai.safety.monitoring.session_analysis", title: "Analyzing multi-turn session patterns for safety violations", concept: C("track session-level escalation patterns; jailbreak attempts across turns; flag and review full session") },
  { domain: "ai.safety.monitoring.incident", title: "Designing AI safety incident response procedures", concept: C("detection → severity classification → contain (rate limit or pause) → investigate → remediate → postmortem") },
  { domain: "ai.safety.monitoring.transparency", title: "Designing safety transparency reporting systems for AI products", concept: C("periodic report: violation rate, categories, mitigations, benchmark scores; internal and external audience") },
];

export const AI_SAFETY_RED_TEAMING_SEED_SPECS: SeedSpec[] = [
  ...PROMPT_INJECTION,
  ...RED_TEAM,
  ...POLICY,
  ...TOOL_AUTH,
  ...SAFETY_EVAL,
  ...MONITORING,
];
