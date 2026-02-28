/**
 * Build real KB envelopes from docs/kb-primitives (KB-000 … KB-019).
 * Writes to repo seeds/kb-primitives/ and docs/kb-primitives/LIST.md.
 * Run from repo root: pnpm --filter @alexandrian/protocol build && node packages/protocol/scripts/kb-primitives-to-envelopes.mjs
 * Or from packages/protocol: pnpm build && node scripts/kb-primitives-to-envelopes.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

const { artifactHashFromPayload, kbHashFromEnvelope } = await import("../dist/canonical.js");

const PRIMITIVES = [
  { id: "KB-000", title: "Knowledge Block Envelope Specification (M1)", steps: ["Envelope schema", "Field requirements", "Invariants", "Canonical hash scope"] },
  { id: "KB-001", title: "Canonical Serialization Pipeline", steps: ["Field selection", "Canonical JSON (RFC 8785)", "Byte encoding", "Domain separation", "Hash"] },
  { id: "KB-002", title: "Domain-Separated Hashing Rules", steps: ["Cross-object namespaces", "Collision avoidance", "Tag format"] },
  { id: "KB-003", title: "Lineage DAG Semantics", steps: ["Parents", "Acyclicity", "Derivation meaning"] },
  { id: "KB-004", title: "Verification & Retrieval Procedure", steps: ["Trust by recomputation", "No central authority", "Retrieval steps"] },
  { id: "KB-010", title: "Task Object & Deterministic Intent", steps: ["Task schema", "Machine-parseable", "Evaluatable", "Deterministic outcome criteria"] },
  { id: "KB-011", title: "Capability Advertisement Protocol", steps: ["Agents declare capabilities", "Market of specialization"] },
  { id: "KB-012", title: "Submission Settlement Protocol", steps: ["Task resolved", "Winning KB", "Deterministic evaluation"] },
  { id: "KB-013", title: "Attribution & Royalty Graph", steps: ["Value propagation along DAG", "Incentivizes composition"] },
  { id: "KB-014", title: "Reputation Accumulation Model", steps: ["Trust from measurable performance", "No voting"] },
  { id: "KB-015", title: "Protocol Upgrade Proposal (PUP)", steps: ["Upgrades as KB-like artifacts", "Adoption not global switch"] },
  { id: "KB-016", title: "Resolver & Version Negotiation", steps: ["Which ruleset interprets a KB", "Compatible subset"] },
  { id: "KB-017", title: "Forking & Parallel Epistemic Universes", steps: ["Incompatible branches coexist", "Shared history until divergence"] },
  { id: "KB-018", title: "Governance Legitimacy Signals", steps: ["Influence from adoption × productivity", "No privileged voters"] },
  { id: "KB-019", title: "Canonicality Emergence (Soft Consensus)", steps: ["Default version emerges from coordination", "Not declared"] ],
];

const outDir = join(repoRoot, "seeds", "kb-primitives");
mkdirSync(outDir, { recursive: true });

const list = [];
const indexItems = [];

for (const { id, title, steps } of PRIMITIVES) {
  const payload = {
    type: "procedure",
    title: `${id} — ${title}`,
    steps,
    preconditions: [],
    postconditions: [],
  };
  const artifactHash = artifactHashFromPayload(payload);
  const envelope = {
    type: "procedure",
    domain: "alexandrian.primitives",
    sources: [],
    artifactHash,
    tier: "open",
    payload,
  };
  const kbId = kbHashFromEnvelope(envelope);

  const dir = join(outDir, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "envelope.json"), JSON.stringify(envelope, null, 2) + "\n");

  list.push({ doc: `docs/kb-primitives/${id}.md`, kbId, title: `${id} — ${title}` });
  indexItems.push({ path: `seeds/kb-primitives/${id}/envelope.json`, type: "procedure", domain: "alexandrian.primitives", tier: "open", artifactHash, sources: [], kbId, title: payload.title });
  console.log(id, "->", kbId.slice(0, 22) + "...");
}

writeFileSync(
  join(outDir, "index.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), count: list.length, items: indexItems }, null, 2) + "\n"
);

const listMd = [
  "# KB primitives → real KBs",
  "",
  "Each `docs/kb-primitives/KB-XXX.md` document has a corresponding **real** Knowledge Block envelope under `seeds/kb-primitives/KB-XXX/envelope.json`. These are protocol-valid envelopes (procedure type, domain `alexandrian.primitives`, deterministic kbId).",
  "",
  "Regenerate: from repo root run `pnpm --filter @alexandrian/protocol build && node packages/protocol/scripts/kb-primitives-to-envelopes.mjs`",
  "",
  "## List",
  "",
  "| Doc | kbId (contentHash) | Title |",
  "|-----|--------------------|-------|",
  ...list.map(({ doc, kbId, title }) => `| [${doc}](../../${doc}) | \`${kbId}\` | ${title} |`),
  "",
];
writeFileSync(join(repoRoot, "docs", "kb-primitives", "LIST.md"), listMd.join("\n"));

console.log("\nWritten seeds/kb-primitives/*/envelope.json, seeds/kb-primitives/index.json, docs/kb-primitives/LIST.md. Total:", list.length, "real KBs");
