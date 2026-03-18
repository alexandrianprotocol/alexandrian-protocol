# Alexandrian SDK — Quick Start

Get structured, KB-grounded LLM output in under 5 minutes.
No API keys. No config. No blockchain required to start.

---

## Install

```bash
npm install @alexandrian/sdk-adapters
```

---

## 1 — Ask a question (10 lines)

```ts
import { alexandrian } from "@alexandrian/sdk-adapters";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const { enrichedPrompt, kbsUsed } = await alexandrian.enhance(
  "How do I design a secure login endpoint?"
);

const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: enrichedPrompt },
    { role: "user",   content: "Give me a step-by-step implementation plan." },
  ],
});

console.log(response.choices[0].message.content);
console.log(`Grounded by ${kbsUsed.length} KBs`);
```

**What happens:** domains are inferred from your question → top KBs are fetched from the live subgraph → IPFS artifacts are loaded → `enrichedPrompt` is your system message, ready for any LLM.

---

## 2 — Security audit (1 line)

```ts
import { alexandrian } from "@alexandrian/sdk-adapters";

const evaluation = await alexandrian.presets.security.audit(myExpressRoutes);

// Pass evaluation.evaluationPrompt to your LLM as the system message:
const llmResponse = await callYourLLM(evaluation.evaluationPrompt);

// Parse structured findings:
const findings = alexandrian.parseFindings(llmResponse);
console.log(findings?.summary);
// → "Two critical vulnerabilities found: SQL injection in /login, missing rate limiting."

const critical = findings?.findings.filter(f => f.severity === "critical");
console.log(`${critical?.length} critical issues — criteriaCount: ${evaluation.criteriaCount}`);
```

**What `criteriaCount` means:**
- `> 0` — real KB criteria were applied (SecurityRule, AuditChecklist, ComplianceChecklist, etc.)
- `= 0` — no criteria KBs found; results rely on general LLM knowledge only

---

## 3 — Code review

```ts
const review = await alexandrian.presets.coding.review(myTypeScriptFile);
const llmOut = await callYourLLM(review.evaluationPrompt);
const result = alexandrian.parseFindings(llmOut);

result?.findings.forEach(f =>
  console.log(`[${f.severity}] ${f.category}: ${f.description}`)
);
```

---

## 4 — Compliance check (OWASP / SOC2 / GDPR)

```ts
const audit = await alexandrian.presets.compliance.audit(myApiSpec, {
  focus: "OWASP Top 10",
});

const llmOut  = await callYourLLM(audit.evaluationPrompt);
const results = alexandrian.parseFindings(llmOut);

results?.checklistCoverage.forEach(item =>
  console.log(`${item.status.toUpperCase()} — ${item.item}`)
);
```

---

## 5 — LangChain drop-in

```ts
import { AlexandrianRetriever } from "@alexandrian/sdk-adapters";
import { RetrievalQAChain }     from "langchain/chains";
import { ChatOpenAI }           from "@langchain/openai";

const retriever = new AlexandrianRetriever({ limit: 4 });
const chain     = RetrievalQAChain.fromLLM(new ChatOpenAI(), retriever);
const answer    = await chain.call({ query: "How do I prevent SQL injection?" });
```

Blend with your existing vector store:

```ts
const retriever = new AlexandrianRetriever({
  limit:            4,
  fallback:         vectorStore.asRetriever(),
  mergeMode:        "prepend",   // Alexandrian KBs first, then vector results
  alexandrianBoost: 1.2,
});
```

---

## 6 — LlamaIndex drop-in

```ts
import { AlexandrianNodeRetriever } from "@alexandrian/sdk-adapters";
import { RetrieverQueryEngine }     from "llamaindex";

const retriever = new AlexandrianNodeRetriever({ limit: 4 });
const engine    = new RetrieverQueryEngine({ retriever });
const response  = await engine.query({ query: "Best practices for JWT auth?" });
```

---

## 7 — Settle citations on-chain (optional)

```ts
import { alexandrian, settleCitation } from "@alexandrian/sdk-adapters";
import { AlexandrianSDK }             from "@alexandrian/sdk-adapters";
import { ethers }                      from "ethers";

// One-time SDK setup (requires a wallet signer)
const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
const sdk    = new AlexandrianSDK({ signer });

// Run a query
const result = await alexandrian.presets.security.audit(code);
const llmOut = await callYourLLM(result.evaluationPrompt);

// Settle after you've received value
const { settled, totalEthSpent } = await settleCitation(result, sdk);
console.log(`Settled ${settled.length} KBs — ${totalEthSpent.toFixed(6)} ETH`);
```

Settlement is fully optional and silent by default. No wallet is required to use presets, enhance, or evaluate.

---

## Presets

| Preset                          | Best for                                         |
|---------------------------------|--------------------------------------------------|
| `alexandrian.presets.security`  | Code review, security audits, CVE checks         |
| `alexandrian.presets.compliance`| OWASP, SOC2, GDPR, PCI, HIPAA                   |
| `alexandrian.presets.coding`    | Engineering Q&A, best practices, code patterns   |
| `alexandrian.presets.agentMemory` | AI agent design, RAG pipelines, LLM prompting  |

All presets expose: `enhance(query)` · `review(code)` · `audit(artifact)` · `compare(impl, standard)`

---

## Output shape

```ts
// enhance() returns EnhancedQuery:
{
  enrichedPrompt: string,     // → LLM system message
  kbsUsed: SelectedKB[],      // → KB metadata for attribution
  settlementPreview: {...},   // → fee breakdown (no on-chain call)
  warnings: string[],         // → IPFS timeouts, fallback notices
  fromCache: boolean,
}

// review() / audit() / compare() returns EvaluationQuery:
{
  evaluationPrompt: string,   // → LLM system message (includes artifact + criteria)
  kbsUsed: SelectedKB[],
  criteriaCount: number,      // → 0 means no criteria KBs found
  taskMode: "review" | "audit" | "compare",
  settlementPreview: {...},
  warnings: string[],
  fromCache: boolean,
}
```

---

## What makes this different

**Without Alexandrian:**
> Generic LLM output — verbose, unanchored, no KB references.

**With Alexandrian:**
> Structured output anchored to published KBs, with:
> - Specific step/item citations (`KB-2, item 3`)
> - Severity-ranked findings
> - Checklist coverage map
> - On-chain attribution trail

---

## Next: publish your own KBs

Contribute knowledge to the graph and earn query fees:

```bash
# In packages/generator:
npx alexandrian generate --domain engineering.api.security --type ComplianceChecklist
npx alexandrian publish --stake 0.001
```

See [packages/generator/README.md](../generator/README.md) for the full KB generation guide.
