const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "artifacts", "build-info");
const files = fs.readdirSync(dir).map((f) => path.join(dir, f));
if (files.length === 0) {
  console.error("No build-info files found.");
  process.exit(1);
}

const latest = files
  .map((f) => ({ f, t: fs.statSync(f).mtimeMs }))
  .sort((a, b) => b.t - a.t)[0].f;

const json = JSON.parse(fs.readFileSync(latest, "utf8"));
const outPath = path.join(__dirname, "..", "standard-json-input.json");
fs.writeFileSync(outPath, JSON.stringify(json.input));

console.log("build-info:", latest);
console.log("wrote:", outPath);
if (json.solcVersion) console.log("solc:", json.solcVersion);
if (json.input && json.input.settings) {
  const s = json.input.settings;
  console.log(
    "optimizer:",
    s.optimizer ? `enabled=${s.optimizer.enabled} runs=${s.optimizer.runs}` : "none"
  );
  if (s.viaIR !== undefined) console.log("viaIR:", s.viaIR);
  if (s.evmVersion) console.log("evmVersion:", s.evmVersion);
}
if (json.output && json.output.contracts) {
  const names = [];
  for (const file of Object.keys(json.output.contracts)) {
    for (const contractName of Object.keys(json.output.contracts[file])) {
      if (contractName === "AlexandrianRegistryV2") {
        names.push(`${file}:${contractName}`);
      }
    }
  }
  if (names.length) console.log("contract:", names[0]);
}
