/**
 * Verification output helper — semantic layering (VOA).
 * OUTPUT_MODE=protocol → research protocol language; default → presentation semantics (developer).
 */
import { ProtocolLanguage, type ProtocolLanguageKey, type OutputMode } from "../../docs/terminology-map";

export function say(key: ProtocolLanguageKey): string {
  const mode: OutputMode = (process.env.OUTPUT_MODE === "protocol" ? "protocol" : "product") as OutputMode;
  return ProtocolLanguage[key][mode];
}

/** Format knowledge block count line (e.g. "📦 Generated 1 knowledge block(s)"). */
export function formatKnowledgeBlocks(count: number): string {
  const prefix = say("knowledge_blocks_label");
  const suffix = say("knowledge_blocks_suffix");
  return `${prefix} ${count} ${suffix}`;
}
