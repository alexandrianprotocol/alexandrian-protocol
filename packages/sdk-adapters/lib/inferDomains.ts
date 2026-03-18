/**
 * inferDomains — keyword-to-domain mapping for Alexandrian Protocol queries.
 *
 * Infers relevant subgraph domain prefixes from a free-text question.
 * Allows up to 2 rule-group matches so cross-cutting questions
 * (e.g. "risk of this authentication decision") hit all relevant domains.
 * Caps at 6 domains total to keep subgraph queries focused.
 * Returns null when no keywords match, triggering a cross-domain query.
 *
 * Each rule includes BOTH domain formats:
 *  - `engineering.*` — future M2 domain format used in presets/evaluation mode
 *  - `cybersecurity.*`, `antipattern.*`, `regulatory.*`, `agent.*` etc. — the
 *    actual domain names used by the KB generator (and indexed in the live subgraph)
 *
 * Ordered from most-specific to least-specific so early matches win.
 */

export interface DomainRule {
  patterns: RegExp[];
  domains: string[];
}

/**
 * Ordered rule table mapping question keywords to subgraph domain prefixes.
 * Import and extend this array to add protocol-specific domains.
 */
export const DOMAIN_RULES: DomainRule[] = [
  {
    // Security: auth, injection, XSS, CSRF, TLS, rate limiting, throttling, middleware
    // Rate limiting and throttling are API-security concerns — grouped here so
    // "implement rate limiting express redis" hits security/ops, not the database rule.
    patterns: [/security|authen|authoriz|jwt|oauth|bearer|permission|csrf|xss|injection|sqli|cors|tls|ssl|zero.?trust|rate.?limit|throttl|quota|circuit.?break|middleware/i],
    domains:  [
      "engineering.api.security",
      "cybersecurity.threat_detection",
      "cybersecurity.vulnerability_analysis",
      "auth.access_control",
    ],
  },
  {
    // EVM / blockchain / Web3
    patterns: [/contract|solidity|evm|smart.?contract|token|erc.?20|erc.?721|nft|web3|blockchain|dapp|defi|hardhat|foundry|abi/i],
    domains:  ["engineering.evm", "web3.smart_contracts"],
  },
  {
    // Database, storage, schema, migration
    patterns: [/database|schema|migration|postgres|mysql|mongo|sql|nosql|orm|index|storage|data.?model/i],
    domains:  ["engineering.data", "software.database_design"],
  },
  {
    // DevOps, CI/CD, infra, monitoring, SRE
    patterns: [/deploy|devops|ci.?cd|docker|kubernetes|k8s|pipeline|infrastructure|monitoring|observ|alerting|on.?call|sre/i],
    domains:  ["engineering.ops", "software.cicd", "platform.infrastructure"],
  },
  {
    // AI agents, LLM, RAG, prompts, embeddings
    patterns: [/agent|prompt|llm|gpt|claude|langchain|embedding|retrieval|rag|chatbot|inference|fine.?tun/i],
    domains:  ["engineering.agent", "agent.planning", "agent.memory", "rag.systems"],
  },
  {
    // Compliance, OWASP, regulatory, audit checklists
    patterns: [/compliance|owasp|nist|soc.?2|hipaa|gdpr|audit|checklist|standard|regulation|pci/i],
    domains:  [
      "engineering.compliance",
      "regulatory.soc2",
      "regulatory.gdpr",
      "regulatory.pci",
    ],
  },
  {
    // Evaluation-mode queries: code review, best practice, anti-pattern, refactor
    patterns: [/\bcode.?review\b|\bbest.?practice|\banti.?pattern|\brefactor|\bimprove.?code|\bcode.?quality|\bvulnerabilit.*code|\bsecurity.*code|\bcode.*security/i],
    domains:  [
      "antipattern.security",
      "antipattern.architecture",
      "engineering.api.security",
      "engineering.compliance",
    ],
  },
  {
    // Threats, vulnerabilities, exploits, pentesting
    patterns: [/risk|threat|vulnerabilit|attack|exploit|cve|pentest|red.?team/i],
    domains:  [
      "engineering.risk",
      "cybersecurity.vulnerability_analysis",
      "cybersecurity.incident_response",
    ],
  },
  {
    // Experimentation, A/B testing, feature flags
    patterns: [/experiment|hypothesis|a.?b.?test|canary|rollout|feature.?flag|metric|measure/i],
    domains:  ["engineering.experimentation", "engineering.ops", "product.experimentation"],
  },
  {
    // Decisions, tradeoffs, evaluation, ranking
    patterns: [/decision|tradeoff|compare|option|choose|select|evaluation|score|rank/i],
    domains:  ["engineering.decision", "software.architecture_decisions"],
  },
  {
    // Postmortems, incidents, case studies
    patterns: [/case.?stud|postmortem|incident|retrospective|lessons.?learned|history/i],
    domains:  ["engineering.ops", "postmortem.cascade", "cybersecurity.incident_response"],
  },
  {
    // API design, REST, GraphQL, webhooks
    patterns: [/api|rest|graphql|endpoint|openapi|swagger|route|http|request|response|webhook|grpc/i],
    domains:  [
      "engineering.api.design",
      "software.api_design",
      "api_design_patterns",
    ],
  },
  {
    // Performance, latency, throughput, optimization
    patterns: [/performance|latency|throughput|optimize|profil|cache|bottleneck|slow|speed/i],
    domains:  ["engineering.performance", "software.performance_engineering"],
  },
];

/**
 * Infer relevant subgraph domains from a free-text question.
 *
 * @param question  The user's raw question or agent intent string.
 * @param rules     Domain rule table — defaults to the built-in DOMAIN_RULES.
 * @returns         Array of domain strings, or null if no keywords matched
 *                  (caller should then query all domains).
 *
 * @example
 * inferDomains("How do I secure my JWT endpoint?")
 * // → ["engineering.api.security"]
 *
 * inferDomains("What are the risks of this authentication decision?")
 * // → ["engineering.risk", "engineering.api.security", "engineering.decision"]
 *
 * inferDomains("What is the meaning of life?")
 * // → null  (no keyword match — caller should query all domains)
 */
export function inferDomains(
  question: string,
  rules: DomainRule[] = DOMAIN_RULES
): string[] | null {
  const matched = new Set<string>();
  let groupCount = 0;

  for (const { patterns, domains } of rules) {
    if (patterns.some((p) => p.test(question))) {
      domains.forEach((d) => matched.add(d));
      groupCount++;
      if (groupCount >= 2 || matched.size >= 6) break;
    }
  }

  return matched.size > 0 ? [...matched] : null;
}
