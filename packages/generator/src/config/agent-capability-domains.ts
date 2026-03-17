/**
 * Agent capability domain config — 10k KB design
 *
 * Organizes KBs by the agent loop: goal → planning → tool selection → execution → validation → reflection.
 * Every KB should help an agent decide, plan, execute, or verify.
 *
 * Target distribution (first 10k):
 *   Planning & reasoning        2,500
 *   Execution strategies        2,000
 *   Validation & testing        1,500
 *   Software engineering        2,000
 *   Data systems                1,000
 *   Security                      500
 *   Knowledge infrastructure     500
 */

export const CAPABILITY_LOOP_CATEGORIES = {
  planning_reasoning: { targetCount: 2_500, label: "Planning & reasoning" },
  execution_strategies: { targetCount: 2_000, label: "Execution strategies" },
  validation_testing: { targetCount: 1_500, label: "Validation & testing" },
  software_engineering: { targetCount: 2_000, label: "Software engineering" },
  data_systems: { targetCount: 1_000, label: "Data systems" },
  security: { targetCount: 500, label: "Security" },
  knowledge_infrastructure: { targetCount: 500, label: "Knowledge infrastructure" },
} as const;

/** Domain tree mapped to agent tasks (not academic disciplines). */
export const AGENT_CAPABILITY_DOMAINS = [
  // Agent cognition
  "agent.planning",
  "agent.planning.task_decomposition",
  "agent.planning.hierarchical",
  "agent.execution",
  "agent.memory",
  "agent.retrieval",
  "agent.tool_selection",
  "agent.error_recovery",
  "agent.self_reflection",
  // Prompt / LLM
  "ai.prompting",
  "ai.output_validation",
  "ai.reasoning_patterns",
  // Software
  "software.architecture",
  "software.design_patterns",
  "software.testing",
  "software.debugging",
  "software.performance",
  "software.reliability",
  "software.observability",
  "software.security",
  // Data
  "database.optimization",
  "database.indexing",
  "database.schema_design",
  "sql.optimization",
  // Distributed
  "distributed.systems",
  "distributed.consensus",
  // Knowledge / protocol
  "knowledge.graphs",
  "knowledge.validation",
  "knowledge.versioning",
  "meta.protocol",
] as const;

/** Category → domain mapping for seeding and derived generation. */
export const CATEGORY_TO_DOMAINS: Record<keyof typeof CAPABILITY_LOOP_CATEGORIES, readonly string[]> = {
  planning_reasoning: [
    "agent.planning",
    "agent.planning.task_decomposition",
    "agent.planning.hierarchical",
    "agent.retrieval",
    "ai.reasoning_patterns",
  ],
  execution_strategies: [
    "agent.execution",
    "agent.tool_selection",
    "agent.error_recovery",
    "agent.memory",
  ],
  validation_testing: [
    "software.testing",
    "ai.output_validation",
    "knowledge.validation",
  ],
  software_engineering: [
    "software.architecture",
    "software.design_patterns",
    "software.debugging",
    "software.performance",
    "software.reliability",
    "software.observability",
  ],
  data_systems: [
    "database.optimization",
    "database.indexing",
    "sql.optimization",
    "database.schema_design",
  ],
  security: ["software.security"],
  knowledge_infrastructure: [
    "knowledge.graphs",
    "knowledge.versioning",
    "meta.protocol",
  ],
};
