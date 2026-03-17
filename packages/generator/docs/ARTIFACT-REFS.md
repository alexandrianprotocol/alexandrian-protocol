# IPFS Artifact References (artifact_refs)

KB entries keep **procedural knowledge** (how to do something) in the artifact; **reference knowledge** (standards, lists, UI patterns, design tokens) lives in IPFS artifacts. Entries reference them via `artifact_refs` so agents can fetch when needed. Every reference artifact should follow the **Universal Artifact Schema** so they are consistent, composable, and machine-reasonable across UI, backend, cloud, AI, and security.

---

## Universal Artifact Schema

Every IPFS reference artifact (for the 50-artifact library) follows one predictable structure so agents can **discover knowledge**, **expand reasoning**, **generate checklists**, **derive procedures**, and **cross-reference concepts**.

### Required metadata

| Field | Purpose |
|-------|---------|
| `artifact_version` | Schema version (e.g. `"1.0"`) |
| `artifact_name` | Unique identifier (e.g. `api_design_standards`) |
| `artifact_domain` | `ui_ux` \| `api_backend` \| `distributed` \| `cloud` \| `devops` \| `security` |
| `artifact_type` | `design_reference` \| `standards_reference` \| `patterns_reference` \| `checklist_reference` \| `procedures_reference` \| `reference` |
| `description` | Short explanation |

### Optional sections

| Section | Type | Purpose |
|---------|------|---------|
| `invariants` | `string[]` | Engineering truths; constraint validation; design decisions |
| `procedures` | `{ name, steps[] }[]` | Extended procedures for task expansion |
| `checklists` | `{ name, items[] }[]` | Task / validation / implementation checklists |
| `patterns` | `{ name, domain?, description?, usage? }[]` | Reusable architecture/design patterns |
| `standards` | `{ name, organization?, description? }[]` | Industry references |
| `tradeoffs` | `{ decision, advantages[], disadvantages[] }[]` | Design tradeoffs for reasoning |
| `anti_patterns` | `{ name, description, risk? }[]` | What to avoid |
| `references` | `string[]` | External refs (RFCs, guides) |
| `related_artifacts` | `string[]` | Other artifact names (artifact graph) |
| `examples` | `{ title, ... }[]` | Example implementations |

Domain-specific extension fields (e.g. `phrases`, `button_styles`, `error_format`) are allowed; the validator only checks the standard fields.

### Validation

```bash
node dist/index.js --mode validate-artifacts
```

Validates every `.json` in `artifacts/` (except `artifact-index.json`) against the Universal Artifact Schema. Use this before uploading to IPFS.

### Pipeline fit

- **Seed** → **upgrade-seeds** → **analyze-artifacts** → **artifact creation** (using this schema) → **upload to IPFS** → **attach artifact_refs**. Artifacts that follow the schema work with the registry and agent reasoning.

---

## Schema

Optional top-level field on KBv2.4/KBv2.5 artifacts:

```ts
artifact_refs?: ArtifactRef[];

interface ArtifactRef {
  type: string;   // e.g. ui_components, api_design_standards
  uri: string;    // ipfs://Qm... or registry id
  label?: string; // optional display label
}
```

- **type**: Canonical category (see below). Used for discovery and routing.
- **uri**: Location. In production this is `ipfs://<CID>`; for dev it can be a registry name or file path.
- **label**: Optional short name for UI or logs.

## Separation of Knowledge

| In the KB (small, procedural) | In IPFS artifacts (reference) |
|-------------------------------|------------------------------|
| How to design a login page    | List of login components, copy phrases, button styles |
| How to apply API standards    | REST conventions, error format, versioning rules |
| How to apply accessibility   | WCAG-style rules, keyboard/screen-reader checklist |

**Rule**: Do not embed long enumerations (>10 items) in the KB. Put them in an artifact and add an `artifact_ref`.

## Canonical artifact types

Use these as `artifact_refs[].type` so agents can resolve and index consistently:

- **UI/UX**: `ui_components`, `ui_copywriting`, `layout_patterns`, `design_tokens`, `accessibility_rules`, `ux_usability_principles`
- **Engineering standards**: `software_architecture_standards`, `api_design_standards`, `distributed_system_patterns`, `cloud_architecture_patterns`, `error_handling_patterns`
- **Operations**: `environment_variables`, `deployment_strategies`, `incident_response_playbooks`, `observability_patterns`
- **Technology**: `deprecated_technologies`, `recommended_frameworks`
- **Security**: `secure_coding_practices`, `authentication_patterns`, `secrets_management_guidelines`

See `ARTIFACT_TYPES` in `src/lib/artifact-registry.ts`.

## Artifact registry

- **Registry**: `src/lib/artifact-registry.ts` — `ARTIFACT_REGISTRY` (name → type, uri, description). Use for resolving names to URIs.
- **Index file**: `artifacts/artifact-index.json` — list of known artifacts with `local_path` for dev and `uri` for IPFS.
- **Example artifacts** (upload to IPFS and replace placeholder URIs):
  - `artifacts/ui_login_patterns.json` — login components, phrases, button styles, a11y rules
  - `artifacts/api_design_standards.json` — REST conventions, error format, versioning
  - `artifacts/ux_usability_principles.json` — usability heuristics (e.g. Don't Make Me Think style)

## Generator behavior

- The AI generator prompt (rule 12) tells the model: do not embed long lists; use `artifact_refs` with a suitable `type` and `uri` for standards/UI/API/reference content.
- If the model returns `artifact_refs`, they are validated (each element must have `type` and `uri`) and kept on the artifact. They are included in the canonical hash when present.

## Validation

- `validateArtifactRefs()` in `artifact-registry.ts`: ensures `artifact_refs` is an array and each element has non-empty `type` and `uri`.
- The main artifact validator calls this when `artifact_refs` is present.

## Agent flow

1. Task (e.g. “Design login page”) → capability routing → KBs + optional artifact_refs.
2. Agent loads KB procedure (steps, interface, claim).
3. For each `artifact_ref` in the KB, agent resolves `uri` (registry or IPFS), fetches artifact, uses it as reference (e.g. checklist, allowed values, rules).
4. Agent combines procedure + artifact content to produce the solution.

## Checklist generation

Artifacts are ideal for checklists: e.g. “Design login page” KB references `ui_login_patterns`. Agent fetches the artifact and builds a checklist from `components`, `phrases`, and `accessibility_rules`.

## Seed analysis (which seeds need artifact refs?)

Run **before** building the artifact library to see which artifacts will have the highest leverage:

```bash
node dist/index.js --mode analyze-artifacts
```

This scans all KBs in `staging/pending` and:

- Detects signals: **large list**, **standards/guidelines**, **UI patterns**, **API patterns**, **distributed/cloud/DevOps/security patterns**
- Flags seeds that should reference an artifact (`requires_artifact`)
- Suggests artifact names from the canonical library (by domain and signal)
- Prints:
  - Total seeds and how many already have `artifact_refs`
  - Count of candidates (seeds that should reference an artifact)
  - **By suggested artifact** (top 25): which artifact names would get the most references
  - **By domain**: which domains have the most candidates

Use the output to prioritize which of the ~50 artifacts to create and upload to IPFS first.

## Canonical artifact library (~50 artifacts)

The generator ships with a catalog of **50 reference artifacts** in `src/lib/artifact-library.ts`, grouped by domain:

| Domain        | Count | Examples |
|---------------|-------|----------|
| UI/UX         | 12    | ui_components_library, ui_layout_patterns, ui_copy_phrases, ui_accessibility_rules, ui_design_tokens, ui_responsive_breakpoints |
| API & Backend | 10    | http_status_codes, api_design_standards, api_error_format_standards, authentication_flows, webhook_design_patterns |
| Distributed   | 8     | distributed_system_patterns, message_queue_patterns, stream_processing_patterns, load_balancing_strategies |
| Cloud         | 8     | kubernetes_deployment_patterns, autoscaling_strategies, serverless_patterns, container_security_practices |
| DevOps        | 6     | ci_cd_pipeline_patterns, deployment_strategies, observability_patterns, incident_response_runbooks |
| Security      | 6     | secure_coding_guidelines, authentication_patterns, encryption_practices, input_validation_rules |

`ARTIFACT_REGISTRY` is built from this catalog (placeholder URIs until you upload to IPFS). The analyzer uses it to suggest which artifact each seed should reference.

## Adding new reference artifacts

1. Add an entry to `ARTIFACT_LIBRARY` in `src/lib/artifact-library.ts` (name, domain, description).
2. Add a JSON file under `artifacts/` with a clear structure (e.g. `artifact_type`, `version`, and domain-specific arrays/objects).
3. Upload to IPFS and get the CID.
4. Update `ARTIFACT_REGISTRY` in `artifact-registry.ts` if you override the default placeholder (or keep the auto-generated placeholder until upload).
5. In KB seeds that encode a procedure for that standard/domain, set `artifact_refs: [{ type: "<domain>", uri: "ipfs://<CID>" }]`.
