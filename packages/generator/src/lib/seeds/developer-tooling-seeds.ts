/**
 * Developer Tooling Seeds (~80 seed procedures).
 * CLI design, plugin systems, build systems, code generation, AST transformation,
 * LSP servers, linter design, REPLs, and developer experience engineering.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. CLI design (10) */
const CLI_DESIGN: SeedSpec[] = [
  { domain: "tooling.cli.argument_parsing", title: "Designing CLI argument parsing with subcommands", concept: C("define commands, options, and flags; positional args; help auto-generated; validate before execute") },
  { domain: "tooling.cli.help", title: "Implementing CLI help and usage documentation", concept: C("--help per command; usage line; option descriptions; examples section; man page output") },
  { domain: "tooling.cli.output_format", title: "Designing CLI output formatting for human and machine consumers", concept: C("default human-readable; --json flag for machine; --quiet suppresses; status to stderr, data to stdout") },
  { domain: "tooling.cli.config", title: "Implementing CLI configuration file layering", concept: C("merge: defaults < env < config file < flag; config file in XDG path; validate on load") },
  { domain: "tooling.cli.error_handling", title: "Designing CLI error reporting and exit codes", concept: C("exit 0 success; 1 general error; 2 usage error; descriptive message to stderr; --verbose for trace") },
  { domain: "tooling.cli.progress", title: "Implementing CLI progress indicators for long operations", concept: C("spinner for unknown duration; progress bar for known steps; suppress when stdout is not TTY") },
  { domain: "tooling.cli.interactive", title: "Designing interactive CLI prompts for user input", concept: C("prompt type by value: confirm, select, input, password; validate each answer; allow --yes for CI") },
  { domain: "tooling.cli.completion", title: "Implementing shell completion for CLI commands", concept: C("generate completion script for bash/zsh/fish; install via --install-completion; complete subcommands and flags") },
  { domain: "tooling.cli.testing", title: "Testing CLI tools with subprocess invocation harnesses", concept: C("spawn CLI as subprocess; assert stdout, stderr, exit code; use fixture dirs for file-based commands") },
  { domain: "tooling.cli.plugin_loading", title: "Designing CLI plugin discovery and loading mechanisms", concept: C("scan PATH for cli-plugin-* binaries; exec as subprocess; delegate via argv forwarding") },
];

/** 2. Plugin systems (8) */
const PLUGIN_SYSTEMS: SeedSpec[] = [
  { domain: "tooling.plugin.discovery", title: "Designing plugin discovery by convention and registry", concept: C("discover by naming convention or explicit list; scan node_modules or PATH; validate manifest on load") },
  { domain: "tooling.plugin.api", title: "Designing stable plugin API contracts", concept: C("define plugin interface version; check compatibility on load; expose only extension points; never expose internals") },
  { domain: "tooling.plugin.isolation", title: "Isolating plugin execution to prevent host crashes", concept: C("child process or vm sandbox; message-passing protocol; timeout unresponsive plugin; recover on crash") },
  { domain: "tooling.plugin.hooks", title: "Implementing hook-based plugin extension points", concept: C("register hook handlers; execute in priority order; allow async hooks; bail-able hooks for validation") },
  { domain: "tooling.plugin.lifecycle", title: "Designing plugin activation and deactivation lifecycle", concept: C("activate on load; deactivate on disable or reload; cleanup resources in deactivate; store no globals") },
  { domain: "tooling.plugin.versioning", title: "Implementing plugin version compatibility checking", concept: C("plugin declares hostVersion range; host checks semver compatibility; warn or reject incompatible") },
  { domain: "tooling.plugin.hot_reload", title: "Designing hot-reload plugin systems for development tools", concept: C("watch plugin source; re-require on change; call deactivate then activate; preserve plugin state if possible") },
  { domain: "tooling.plugin.marketplace", title: "Designing plugin registry and marketplace architectures", concept: C("registry: name, version, description, download URL, signature; verify signature on install; rating system") },
];

/** 3. Build systems & monorepo tooling (10) */
const BUILD_SYSTEMS: SeedSpec[] = [
  { domain: "tooling.build.dependency_graph", title: "Designing build dependency graph computation", concept: C("parse package manifests; build directed graph; topological sort; execute in order with parallelism at each level") },
  { domain: "tooling.build.caching", title: "Implementing build output caching by input hash", concept: C("hash: source files + deps + compiler version + flags; cache key = hash; restore output on hit") },
  { domain: "tooling.build.affected", title: "Computing affected packages for incremental builds", concept: C("git diff to find changed files; map files to packages; traverse dependency graph to find all affected") },
  { domain: "tooling.build.remote_cache", title: "Designing remote build cache systems", concept: C("content-addressable store (S3, GCS); upload output on miss; download on hit; fallback on network error") },
  { domain: "tooling.build.parallelism", title: "Implementing parallel build task scheduling", concept: C("topological sort; execute tasks at same level in parallel; worker pool sized to CPU count; serial on conflict") },
  { domain: "tooling.build.incremental", title: "Designing incremental compilation strategies", concept: C("track file → output mapping; only recompile changed files and dependents; invalidate on interface change") },
  { domain: "tooling.build.workspace", title: "Designing monorepo workspace dependency resolution", concept: C("local package reference vs registry; hoist shared deps to root; enforce workspace protocol for locals") },
  { domain: "tooling.build.task_pipeline", title: "Implementing task pipeline definitions in monorepo build tools", concept: C("declare task depends-on; topological execution; cache inputs and outputs; restore from cache before run") },
  { domain: "tooling.build.lint_pipeline", title: "Integrating linting and formatting into build pipelines", concept: C("lint as parallel task; fail build on error; format check in CI; auto-fix in pre-commit hook") },
  { domain: "tooling.build.bundler", title: "Designing JavaScript bundler configuration for libraries and apps", concept: C("library: ESM + CJS dual output; app: entry point + code splitting; tree-shaking via sideEffects:false") },
];

/** 4. Code generation (8) */
const CODE_GEN: SeedSpec[] = [
  { domain: "tooling.codegen.template", title: "Designing template-based code generation systems", concept: C("template engine (Handlebars, Nunjucks, EJS); data model; validate output parses; test generated code") },
  { domain: "tooling.codegen.ast", title: "Generating code from AST using builder APIs", concept: C("construct AST nodes programmatically; print via AST printer; prefer AST over string concat to avoid syntax errors") },
  { domain: "tooling.codegen.schema", title: "Generating typed code from schema definitions", concept: C("schema (JSON Schema, Protobuf, GraphQL) → types; regenerate on schema change; check generated files in CI") },
  { domain: "tooling.codegen.openapi", title: "Generating SDK client code from OpenAPI specifications", concept: C("openapi-generator or custom; generate types + client methods; pin spec version; regenerate in CI") },
  { domain: "tooling.codegen.scaffold", title: "Designing scaffolding systems for project and component generation", concept: C("template directory; variable substitution; post-generate install/init step; idempotency check") },
  { domain: "tooling.codegen.validation", title: "Validating generated code output for syntax and correctness", concept: C("parse generated output with target language parser; typecheck; run generated tests if applicable") },
  { domain: "tooling.codegen.idempotency", title: "Designing idempotent code generation pipelines", concept: C("deterministic output for same input; generated files unchanged if source unchanged; check in CI") },
  { domain: "tooling.codegen.migration", title: "Generating migration code from schema diff", concept: C("diff old and new schema; generate add/drop/alter statements; require review before apply") },
];

/** 5. AST transformation (8) */
const AST_TRANSFORM: SeedSpec[] = [
  { domain: "tooling.ast.visitor", title: "Implementing AST visitor patterns for code analysis", concept: C("enter/exit hooks per node type; collect findings; stateful via context object passed through") },
  { domain: "tooling.ast.transform", title: "Designing AST transformation pipelines for codemods", concept: C("clone AST; mutate target nodes; regenerate code from AST; preserve formatting with recast") },
  { domain: "tooling.ast.codemod", title: "Writing safe codemods for large-scale code refactoring", concept: C("targeted AST pattern match; scope to usage sites; dry-run with diff; apply to random sample first") },
  { domain: "tooling.ast.scope", title: "Implementing scope analysis for variable reference resolution", concept: C("build scope chain; resolve each reference to binding; detect unresolved or shadowed bindings") },
  { domain: "tooling.ast.treesitter", title: "Using Tree-sitter for language-agnostic code analysis", concept: C("tree-sitter parse → concrete syntax tree; query with s-expressions; incremental reparse on edit") },
  { domain: "tooling.ast.type_inference", title: "Implementing lightweight type inference from AST", concept: C("annotate literal types; propagate through expressions; unify on assignment; report conflicts") },
  { domain: "tooling.ast.pattern_matching", title: "Designing structural AST pattern matching for code search", concept: C("define pattern with wildcards; DFS match against tree; collect captures; return source locations") },
  { domain: "tooling.ast.serialization", title: "Serializing and deserializing ASTs for caching and tools", concept: C("JSON or binary AST format; preserve node ranges; version field; invalidate cache on grammar change") },
];

/** 6. LSP server design (8) */
const LSP: SeedSpec[] = [
  { domain: "tooling.lsp.architecture", title: "Designing Language Server Protocol server architectures", concept: C("stdio or TCP transport; request/response + notifications; state per open document; async handler per method") },
  { domain: "tooling.lsp.incremental_sync", title: "Implementing incremental document sync in LSP servers", concept: C("textDocument/didChange with incremental edits; apply edit to shadow document; reparse incrementally") },
  { domain: "tooling.lsp.diagnostics", title: "Implementing LSP diagnostics publishing for errors and warnings", concept: C("run analysis on save; compute diagnostics; publishDiagnostics with URI and range array; clear on fix") },
  { domain: "tooling.lsp.completion", title: "Designing LSP code completion item generation", concept: C("context at cursor: scope + type; filter candidates by prefix; return CompletionItems with kind and detail") },
  { domain: "tooling.lsp.hover", title: "Implementing LSP hover information providers", concept: C("resolve symbol at position; look up type or documentation; return Hover with MarkupContent") },
  { domain: "tooling.lsp.goto", title: "Implementing LSP go-to-definition and find-references", concept: C("resolve symbol; look up definition location; find-references: scan all files for references to binding") },
  { domain: "tooling.lsp.performance", title: "Optimizing LSP server response latency", concept: C("cache parse trees; debounce analysis; async where possible; respond to completion < 100ms") },
  { domain: "tooling.lsp.initialization", title: "Designing LSP server capability negotiation", concept: C("advertise capabilities in initialize response; check client capabilities before use; graceful degradation") },
];

/** 7. Linter & formatter design (8) */
const LINTER: SeedSpec[] = [
  { domain: "tooling.linter.rule", title: "Designing lint rule implementations with AST visitors", concept: C("visitor for target node type; check predicate; report with node location, message, and fix") },
  { domain: "tooling.linter.fixable", title: "Implementing auto-fixable lint rules", concept: C("fix: minimal AST transform or text replacement; apply in isolation; validate fixed code parses") },
  { domain: "tooling.linter.rule_config", title: "Designing lint rule configuration and severity systems", concept: C("rule id → error|warn|off; per-file overrides; extends base config; validate config schema on load") },
  { domain: "tooling.linter.plugin", title: "Designing lint plugin architectures for custom rule sets", concept: C("plugin exports rules map; host registers rules with prefix; load via config plugins array") },
  { domain: "tooling.formatter.algorithm", title: "Designing Prettier-style formatter algorithms", concept: C("parse to IR; Wadler-Lindig algorithm; group/indent/line/softline; fit to printWidth; deterministic") },
  { domain: "tooling.formatter.idempotency", title: "Validating formatter idempotency", concept: C("format → format again → must be identical; test on representative corpus; fail CI on non-idempotent output") },
  { domain: "tooling.linter.performance", title: "Optimizing linter performance for large codebases", concept: C("cache per-file results by content hash; run in worker threads; skip unchanged files; parallel file processing") },
  { domain: "tooling.linter.suppression", title: "Designing lint suppression comment systems", concept: C("// eslint-disable-next-line rule-name; require reason; track suppression debt; fail on rule-all disable") },
];

/** 8. REPL design (8) */
const REPL: SeedSpec[] = [
  { domain: "tooling.repl.input", title: "Designing REPL input handling with readline and history", concept: C("readline interface; history file in home dir; Ctrl-C cancels line; Ctrl-D exits; arrow key navigation") },
  { domain: "tooling.repl.eval", title: "Designing REPL evaluation loops with error isolation", concept: C("eval in try/catch; print error without crashing REPL; preserve session state on error") },
  { domain: "tooling.repl.context", title: "Managing persistent evaluation context across REPL sessions", concept: C("context object carries bindings; update on each eval; serialize to file for session persistence") },
  { domain: "tooling.repl.multiline", title: "Implementing multi-line input detection in REPLs", concept: C("detect incomplete parse (unclosed brace); switch to multi-line mode; prompt changes to ...; submit on blank") },
  { domain: "tooling.repl.completion", title: "Implementing REPL tab completion for context-aware suggestions", concept: C("complete identifiers in context; complete properties after dot; complete paths after slash") },
  { domain: "tooling.repl.output", title: "Designing REPL output formatting for complex values", concept: C("pretty-print objects up to depth N; truncate arrays at M; color by type; limit total output lines") },
  { domain: "tooling.repl.magic_commands", title: "Designing REPL magic command systems for meta-operations", concept: C(".help, .load file, .save file, .exit; % prefix or dot prefix; parse before eval; list in .help") },
  { domain: "tooling.repl.testing", title: "Testing REPL behavior with scripted input sequences", concept: C("pipe input sequence to REPL stdin; capture stdout; assert output contains expected strings") },
];

export const DEVELOPER_TOOLING_SEED_SPECS: SeedSpec[] = [
  ...CLI_DESIGN,
  ...PLUGIN_SYSTEMS,
  ...BUILD_SYSTEMS,
  ...CODE_GEN,
  ...AST_TRANSFORM,
  ...LSP,
  ...LINTER,
  ...REPL,
];
