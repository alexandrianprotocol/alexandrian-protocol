/**
 * Compiler & Language Tooling Seeds (~70 seed procedures).
 * Lexer/parser design, type systems, IR and optimization, code generation,
 * incremental compilation, static analysis, and grammar authoring.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Lexer & parser design (12) */
const PARSER: SeedSpec[] = [
  { domain: "compiler.lexer.design", title: "Designing hand-written lexer tokenizers", concept: C("state machine over character stream; emit token(type, value, span); skip whitespace; error on unknown") },
  { domain: "compiler.lexer.regex", title: "Implementing regex-based lexer generators", concept: C("ordered regex rules; match longest; emit token per rule; fallback to error token; test with corpus") },
  { domain: "compiler.parser.recursive_descent", title: "Implementing recursive descent parsers for LL(1) grammars", concept: C("one function per non-terminal; consume token; call child parsers; return AST node; error on mismatch") },
  { domain: "compiler.parser.pratt", title: "Implementing Pratt parsers for operator precedence", concept: C("prefix and infix parselets; binding power determines precedence; left-recursive via right bp") },
  { domain: "compiler.parser.error_recovery", title: "Designing parser error recovery strategies", concept: C("panic mode: skip to synchronizing token; error node in AST; continue parse; collect all errors") },
  { domain: "compiler.parser.lookahead", title: "Implementing lookahead strategies for LL(k) grammars", concept: C("peek k tokens; branch by k-token prefix; memoize lookahead; detect and report ambiguity") },
  { domain: "compiler.parser.lr", title: "Designing LR parser tables for bottom-up parsing", concept: C("SLR/LALR/GLR; shift-reduce table; handle reduce/reduce conflicts; prefer LALR for most grammars") },
  { domain: "compiler.parser.ast_design", title: "Designing typed AST node hierarchies", concept: C("sealed class hierarchy per node type; span field on every node; visitor-friendly design; no nullable fields") },
  { domain: "compiler.parser.span", title: "Tracking source spans for error reporting in parsers", concept: C("each token carries byte offset; AST nodes carry span from first to last token; map to line/col on error") },
  { domain: "compiler.parser.concrete_syntax", title: "Implementing concrete syntax trees with trivia preservation", concept: C("retain whitespace and comments as trivia; useful for formatters; round-trip: print CST = original source") },
  { domain: "compiler.parser.packrat", title: "Implementing packrat memoization for PEG parsers", concept: C("memoize parse result per (rule, position); O(n*g) time; PEG is unambiguous; handle left recursion") },
  { domain: "compiler.grammar.design", title: "Designing unambiguous context-free grammars", concept: C("one parse tree per input; eliminate ambiguity by precedence rules or grammar transformation") },
];

/** 2. Type system design (10) */
const TYPE_SYSTEM: SeedSpec[] = [
  { domain: "compiler.types.inference", title: "Implementing Hindley-Milner type inference", concept: C("generate constraints from AST; unify constraints; apply substitution; generalize let bindings") },
  { domain: "compiler.types.unification", title: "Implementing type unification algorithms", concept: C("unify two types; occurs check; merge substitutions; report conflict with span") },
  { domain: "compiler.types.generics", title: "Designing generic type systems with instantiation", concept: C("type variables in generic; monomorphize at use site; cache per type argument; cycle detection") },
  { domain: "compiler.types.subtyping", title: "Implementing structural subtyping checks", concept: C("A <: B if A has all fields of B; covariant for output; contravariant for function input") },
  { domain: "compiler.types.narrowing", title: "Implementing type narrowing from control flow analysis", concept: C("type at each branch based on guard expression; union on join; never on unreachable") },
  { domain: "compiler.types.nominal", title: "Designing nominal type systems with explicit compatibility", concept: C("types compatible only if same name or explicit extends; newtypes for distinct primitives") },
  { domain: "compiler.types.algebraic", title: "Implementing algebraic data types with pattern matching", concept: C("sum types as sealed class; product types as record; exhaustive match check; destructuring in match") },
  { domain: "compiler.types.effects", title: "Designing effect type systems for side-effect tracking", concept: C("effect set on function type; compose effects; IO and Pure as distinct effect types; infer from body") },
  { domain: "compiler.types.gradual", title: "Implementing gradual typing for dynamic-to-static migration", concept: C("dynamic type Any; casts inserted at boundaries; blame tracking for runtime failures; migrate incrementally") },
  { domain: "compiler.types.dependent", title: "Designing dependent type checking for value-level types", concept: C("type depends on runtime value; proof terms as values; type equality via definitional equality; proofs required") },
];

/** 3. IR & optimization passes (10) */
const IR_OPT: SeedSpec[] = [
  { domain: "compiler.ir.design", title: "Designing intermediate representation for compiler passes", concept: C("three-address code or SSA; typed IR; each instruction: op, operands, result; explicit control flow graph") },
  { domain: "compiler.ir.ssa", title: "Converting code to static single assignment form", concept: C("each variable defined once; phi nodes at join points; dom tree for placement; iterated dominance frontier") },
  { domain: "compiler.ir.cfg", title: "Constructing and analyzing control flow graphs", concept: C("basic blocks: maximal straight-line code; edges per branch; compute dominators; natural loops") },
  { domain: "compiler.opt.constant_folding", title: "Implementing constant folding optimization passes", concept: C("evaluate compile-time constant expressions; replace with result; propagate through SSA uses") },
  { domain: "compiler.opt.dead_code", title: "Implementing dead code elimination optimization passes", concept: C("liveness analysis backwards; remove defs with no live uses; remove unreachable blocks") },
  { domain: "compiler.opt.inlining", title: "Implementing function inlining optimization passes", concept: C("inline small functions at call site; growth budget; update SSA; avoid recursive inlining") },
  { domain: "compiler.opt.loop", title: "Implementing loop optimization passes", concept: C("loop invariant code motion; strength reduction; unrolling; vectorization; requires natural loop detection") },
  { domain: "compiler.opt.alias", title: "Implementing alias analysis for memory optimization", concept: C("must/may alias; type-based (TBAA); enables hoisting and reordering; conservative if unsure") },
  { domain: "compiler.opt.register_alloc", title: "Implementing register allocation via graph coloring", concept: C("interference graph; K-color for K registers; spill on uncolorable nodes; coalesce copies") },
  { domain: "compiler.opt.pass_ordering", title: "Designing compiler pass ordering and pipelines", concept: C("analysis before transform; canonicalize early; optimize in loops; validate IR invariants between passes") },
];

/** 4. Code generation (8) */
const CODEGEN: SeedSpec[] = [
  { domain: "compiler.codegen.instruction_selection", title: "Implementing instruction selection from IR", concept: C("tree pattern matching on IR nodes; tiling with cost; emit target instruction per tile") },
  { domain: "compiler.codegen.calling_convention", title: "Implementing calling convention ABI in code generation", concept: C("args in registers up to N then stack; caller/callee-saved; return value in register; alignment") },
  { domain: "compiler.codegen.stack_layout", title: "Designing stack frame layout for generated code", concept: C("frame: saved regs + locals + args; align to 16 bytes; prologue/epilogue; frame pointer optional") },
  { domain: "compiler.codegen.relocation", title: "Generating relocatable code with symbol references", concept: C("emit placeholder for unresolved refs; relocation table entry per ref; linker resolves at link time") },
  { domain: "compiler.codegen.debug_info", title: "Emitting DWARF debug information from compiler", concept: C("DICompileUnit; DISubprogram per function; DILocalVariable; line number table; DW_OP for locations") },
  { domain: "compiler.codegen.wasm", title: "Generating WebAssembly bytecode from IR", concept: C("structured control flow (block/loop/if); value stack model; type section; import/export; linear memory") },
  { domain: "compiler.codegen.jit", title: "Designing JIT compilation pipelines", concept: C("interpret until hot; compile hot function; install machine code; patch call sites; tier deoptimize on assumption break") },
  { domain: "compiler.codegen.linking", title: "Designing linker symbol resolution and section merging", concept: C("collect objects; resolve symbols; merge sections; apply relocations; write executable") },
];

/** 5. Incremental compilation (8) */
const INCREMENTAL: SeedSpec[] = [
  { domain: "compiler.incremental.dependency", title: "Tracking compilation unit dependencies for incremental builds", concept: C("file → exported symbols; file → imported symbols; recompile if any dependency changed") },
  { domain: "compiler.incremental.fingerprint", title: "Fingerprinting compilation inputs for cache validity", concept: C("hash source + flags + dep versions; cache valid if fingerprint matches; invalidate on mismatch") },
  { domain: "compiler.incremental.interface", title: "Generating compilation interface files for downstream isolation", concept: C("emit .d.ts or .hi; downstream depends only on interface; recompile downstream on interface change") },
  { domain: "compiler.incremental.query_based", title: "Designing query-based incremental compilation systems", concept: C("each analysis result is a query with tracked inputs; recompute on stale inputs; memoize stable queries") },
  { domain: "compiler.incremental.red_green", title: "Implementing red-green tree incremental parsing", concept: C("reuse unchanged subtrees from previous parse; reparse only dirty range; update parent spans") },
  { domain: "compiler.incremental.salsa", title: "Designing Salsa-style incremental computation frameworks", concept: C("input → query → derived query; track reads; invalidate on input change; recompute only what changed") },
  { domain: "compiler.incremental.parallel", title: "Parallelizing incremental compilation across translation units", concept: C("independent units compile in parallel; barrier at link; share type info via precompiled headers") },
  { domain: "compiler.incremental.cache", title: "Designing persistent compilation cache storage", concept: C("content-addressable cache by fingerprint; evict LRU; max size; share across CI workers") },
];

/** 6. Static analysis (8) */
const STATIC_ANALYSIS: SeedSpec[] = [
  { domain: "compiler.analysis.dataflow", title: "Implementing dataflow analysis frameworks", concept: C("lattice of facts; transfer function per instruction; fixed-point iteration; forward or backward") },
  { domain: "compiler.analysis.reachability", title: "Implementing reachability analysis for dead code detection", concept: C("mark reachable from entry; BFS over CFG; report unreachable blocks and functions") },
  { domain: "compiler.analysis.taint", title: "Implementing taint tracking for security vulnerability detection", concept: C("label source values as tainted; propagate through operations; report on sink with tainted input") },
  { domain: "compiler.analysis.nullability", title: "Implementing nullability analysis for null safety", concept: C("nullable vs non-null types; propagate through assignments; warn on dereference of nullable without check") },
  { domain: "compiler.analysis.escape", title: "Implementing escape analysis for stack allocation optimization", concept: C("value escapes if referenced after function return; non-escaping values can be stack allocated") },
  { domain: "compiler.analysis.shape", title: "Implementing shape analysis for heap structure tracking", concept: C("abstract heap as graph of heap objects; track aliasing; used for memory safety and GC optimization") },
  { domain: "compiler.analysis.effect", title: "Implementing effect analysis to detect side effects", concept: C("track reads/writes per function; pure if no effects; use for hoisting and parallelization") },
  { domain: "compiler.analysis.symbolic_exec", title: "Implementing symbolic execution for program verification", concept: C("symbolic inputs; path condition; explore branches; check assertions on all paths; report violations") },
];

export const COMPILER_LANGUAGE_TOOLS_SEED_SPECS: SeedSpec[] = [
  ...PARSER,
  ...TYPE_SYSTEM,
  ...IR_OPT,
  ...CODEGEN,
  ...INCREMENTAL,
  ...STATIC_ANALYSIS,
];
