"use strict";
/**
 * Derive kbId (kbHash) from an envelope. Used for cross-process reproducibility proof.
 * Run from repo root: pnpm --filter @alexandrian/protocol exec node scripts/derive-kb-id.cjs test-vectors/canonical/types/practice-minimal/envelope.json
 */
const fs = require("fs");
const path = require("path");

// Resolve path relative to cwd (repo root when run via pnpm exec from root)
const envelopePath = process.argv[2];
if (!envelopePath) {
  process.stderr.write("Usage: node scripts/derive-kb-id.cjs <envelope.json>\n");
  process.exit(1);
}
const fullPath = path.isAbsolute(envelopePath) ? envelopePath : path.resolve(process.cwd(), envelopePath);
const envelope = JSON.parse(fs.readFileSync(fullPath, "utf8"));

const { kbHashFromEnvelope } = require("../dist/core/index.js");
const kbId = kbHashFromEnvelope(envelope);
process.stdout.write(kbId + "\n");
