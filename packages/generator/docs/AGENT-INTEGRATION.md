# Agent Integration — Alexandrian as a Knowledge Engine

The Alexandrian system can be exposed as a **knowledge and reasoning service** to AI agents (e.g. LangChain, AutoGen, CrewAI). Agents call it as a tool that provides structured engineering knowledge, planning guidance, and documentation generation.

## Role in the Agent Stack

```
User task
  ↓
Agent
  ↓
Alexandrian Knowledge Engine
  ↓
Relevant KBs + Artifacts + Plan
  ↓
Agent executes task
```

Instead of relying only on LLM reasoning, the agent has **structured engineering knowledge** (KBs, artifacts, concepts) and optional execution plans and docs.

## Core Modules (Service Layer)

When run as a service, expose:

| Module | Purpose |
|--------|--------|
| **retrieval_engine** | Which KBs, artifacts, and concepts to load for a task (`retrieve`) |
| **artifact_loader** | Resolve artifact_refs and load artifact content (e.g. from IPFS or local store) |
| **execution_planner** | Build step order from shortlisted KBs (`buildExecutionPlanOrder`, EPG) |
| **documentation_generator** | Produce documentation artifact from a KB (`createDocumentationArtifactFromKb`) |

## Recommended Agent Tool Set

Agents interact with the system through **tools**. Recommended tools:

| Tool | Input | Output | Implementation |
|------|--------|--------|----------------|
| **alexandrian_retrieve** | `{ task: string }` | Concepts, KB candidates, artifacts, routed capabilities | `retrieve(task, pool, options)` → JSON |
| **alexandrian_plan** | `{ task: string }` | Ordered steps, suggested KBs, skills | Routing + execution plan builder; optional EPG |
| **alexandrian_derive** | `{ task: string }` or derivation params | New KB (hash), attached artifacts, doc ref | Expansion/derivation pipeline (future: derive from task) |
| **alexandrian_document** | `{ kb_hash: string }` | Documentation artifact (20 sections) | `createDocumentationArtifactFromKb(record)` → JSON |

### Tool: alexandrian_retrieve

**Input:**

```json
{ "task": "design scalable authentication system" }
```

**Output:** (see KNOWLEDGE-RETRIEVAL.md)

```json
{
  "concepts": ["API_AUTHENTICATION", "SEC_TOKEN_JWT", ...],
  "kb_candidates": [ { "kb_hash": "0x...", "title": "...", "score": 0.82 }, ... ],
  "artifacts": ["api_design_standards", "authentication_patterns", ...]
}
```

The agent uses this as **structured context** for reasoning.

### Tool: alexandrian_plan

**Input:** `{ "task": "..." }`

**Output:** Ordered steps (and optionally which KBs back each step), e.g.:

1. Define authentication architecture  
2. Design login API  
3. Implement token management  
4. Configure session storage  
5. Add security safeguards  

Implementation: run retrieval → take top-K KBs → `buildExecutionPlanOrder(shortlist)` (or EPG node for task domain).

### Tool: alexandrian_document

**Input:** `{ "kb_hash": "0x1ad07cb3" }`

**Output:** Universal documentation artifact (overview, architecture, procedures, edge cases, dependencies, testing, deployment, etc.). Implementation: load `QueueRecord` for that hash, then `createDocumentationArtifactFromKb(record)`.

### Tool: alexandrian_derive

**Input:** Task or explicit parent KBs + transformation. **Output:** New KB hash, artifact_refs, documentation artifact. Implementation: existing derivation/expansion pipeline; future: “derive from task” that selects parents via retrieval then derives.

## Agent Workflow with Alexandrian

Typical flow:

1. **Task received** → Agent gets user request.
2. **Retrieve knowledge** → Call `alexandrian_retrieve(task)`.
3. **Generate execution plan** → Call `alexandrian_plan(task)` (or derive from retrieve result).
4. **Perform implementation** → Agent uses KB titles, steps, and artifact names as context; may call code/tools.
5. **Generate documentation** → For any new or key KB, call `alexandrian_document(kb_hash)`.
6. **Store derived KB** (optional) — If the agent creates new knowledge, submit to derivation pipeline.

The KB system acts as the **reasoning backbone**: retrieval + plan + docs.

## Integration with Agent Frameworks

Most frameworks let you **register tools**. Example pattern:

```javascript
const tools = [
  alexandrian_retrieve,
  alexandrian_plan,
  alexandrian_derive,
  alexandrian_document
];
// Register with agent (LangChain, AutoGen, CrewAI, etc.)
```

The agent can then call these during reasoning. Each tool should:

- Accept the framework’s tool-call payload (e.g. `input.task`).
- Call the corresponding Alexandrian function (CLI or in-process).
- Return the structured JSON expected by the agent.

## Multi-Agent Architecture

With multiple agents (e.g. architect, backend, frontend, DevOps), **all agents share the same knowledge engine**. Example:

- **Architect agent** → `alexandrian_plan`, `alexandrian_retrieve` → creates system plan.
- **Backend agent** → `alexandrian_retrieve("design API")` → implements API using retrieved KBs/artifacts.
- **Frontend agent** → `alexandrian_retrieve("build React UI")` → creates UI.
- **DevOps agent** → `alexandrian_retrieve("CI/CD pipeline")` → designs deployment.

Each agent queries the same Alexandrian retrieval and planning layer.

## Retrieval-Augmented Generation (RAG)

Traditional RAG: documents → LLM.

**Alexandrian RAG:**

```
task → ontology → KB retrieval → artifact composition → LLM reasoning
```

The agent’s context is **task-specific KBs + artifacts + concepts**, not raw docs. This yields more focused and structured engineering context.

## Deployment Architecture

For production, run the KB system as a **service** with endpoints such as:

- `POST /retrieve` — body `{ task }` → retrieval result.
- `POST /plan` — body `{ task }` → execution plan.
- `POST /document` — body `{ kb_hash }` → documentation artifact.
- `POST /derive` — body with task or parent refs → new KB + doc.

Agents call these over HTTP (or via an SDK that wraps them). The generator CLI can be used as the implementation behind these endpoints (e.g. spawn process or call in-process).

## Performance

- **Precompute** capability index (and optionally KB metadata index) so retrieval doesn’t scan all files each time.
- **Cache** artifact metadata and, if needed, resolved artifact content.
- **Optional:** Store KB/artifact embeddings and use **hybrid retrieval** (symbolic + vector) for better recall.

## Safety and Validation

Before agents execute plans or store derived KBs:

- Validate KB schema (existing validator).
- Validate artifact references (artifact_refs resolve).
- Validate ontology concepts (concept IDs exist in taxonomy).

This keeps the knowledge base consistent and prevents corrupted or invalid entries.

## Final Architecture (with retrieval)

```
User task
  ↓
Knowledge Retrieval Engine (KRRE)
  ↓
Relevant concepts, KBs, artifacts
  ↓
Execution planner
  ↓
KB derivation (optional)
  ↓
Documentation artifact
  ↓
LLM / agent reasoning → solution
```

## Before Productization

Validate these components:

1. **Retrieval engine** — `--mode retrieve` and `retrieve()` produce sensible top-K for real tasks.
2. **Artifact system** — artifact_refs resolve; priority artifacts exist and are loadable.
3. **Documentation generation** — Every KB gets a valid 20-section doc.
4. **Execution planner** — Plan order is coherent and matches task.
5. **Agent integration** — Tools (retrieve, plan, document, derive) are wired and callable from at least one framework.

Once these work reliably, the platform is ready to deliver value in **AI-assisted engineering workflows** and to be polished for broader agent/LLM integration.
