/**
 * Boundary checks (lint-style).
 * Enforces:
 * - sdk-core must not import sdk-adapters
 * - M1 production paths must not import from m2/ or experimental/
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

function collectFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (
        entry === "node_modules" ||
        entry === ".git" ||
        entry === ".claude" ||
        entry === "dist"
      ) {
        continue;
      }
      collectFiles(p, out);
    } else if (/\.(ts|tsx|js|mjs|cjs|mts|cts)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

function extractImportSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /\bimport\s+[^"'`]*?\sfrom\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bexport\s+[^"'`]*?\sfrom\s*["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    let match = null;
    while ((match = pattern.exec(source)) !== null) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

function checkNoImport(root, forbiddenPatterns) {
  const files = collectFiles(root);
  const violations = [];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const imports = extractImportSpecifiers(src);
    for (const specifier of imports) {
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(specifier)) {
          violations.push({ file, specifier, pattern: pattern.toString() });
        }
      }
    }
  }
  return violations;
}

const root = process.cwd();
const sdkCoreRoot = join(root, "packages", "sdk-core");

const checks = [
  {
    name: "sdk-core -> sdk-adapters",
    root: sdkCoreRoot,
    forbiddenPatterns: [/sdk-adapters/],
  },
  {
    name: "m1 source -> m2/experimental",
    root: root,
    forbiddenPatterns: [
      /(^|[\\/])m2([\\/]|$)/,
      /(^|[\\/])experimental([\\/]|$)/,
    ],
    skipFiles: (file) => {
      const normalized = file.replace(/\\/g, "/");
      if (normalized.startsWith("m2/")) return true;
      if (normalized.startsWith("experimental/")) return true;
      if (normalized.startsWith("docs/")) return true;
      return false;
    },
  },
];

const allViolations = [];

for (const check of checks) {
  const violations = checkNoImport(check.root, check.forbiddenPatterns).filter((v) => {
    if (!check.skipFiles) return true;
    const rel = v.file.replace(root, "").replace(/^[/\\]/, "");
    return !check.skipFiles(rel);
  });
  if (violations.length) {
    allViolations.push({ check: check.name, violations });
  }
}

if (allViolations.length) {
  console.error("Boundary violations found:");
  for (const group of allViolations) {
    console.error(`\n[${group.check}]`);
    for (const v of group.violations) {
      console.error(
        `- ${v.file} imports "${v.specifier}" (matched ${v.pattern})`
      );
    }
  }
  process.exit(1);
}
console.log("Boundary checks passed.");
