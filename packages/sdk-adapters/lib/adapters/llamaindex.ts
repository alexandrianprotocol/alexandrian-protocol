/**
 * AlexandrianNodeRetriever — LlamaIndex node retriever integration.
 *
 * Drop-in retriever for LlamaIndex query engines. Wraps `enhanceQuery()`
 * to deliver Alexandrian KB context as LlamaIndex NodeWithScore objects, with full
 * support for blending with an existing vector index retriever.
 *
 * ── Usage patterns ────────────────────────────────────────────────────────────
 *
 * 1. Standalone (no existing retriever):
 * ```ts
 * const retriever = new AlexandrianNodeRetriever({ limit: 4 });
 * const engine = new RetrieverQueryEngine(retriever);
 * ```
 *
 * 2. Replace mode — Alexandrian first, vector index only when no KBs found:
 * ```ts
 * const retriever = new AlexandrianNodeRetriever({
 *   fallback: index.asRetriever(),
 *   mergeMode: "replace",          // default
 *   fallbackThreshold: 1,          // default: call vector only if 0 KBs returned
 * });
 * ```
 *
 * 3. Prepend mode — always call both concurrently, KBs appear first:
 * ```ts
 * const retriever = new AlexandrianNodeRetriever({
 *   fallback: index.asRetriever(),
 *   mergeMode: "prepend",
 *   alexandrianBoost: 1.2,         // default: 20% score edge for structured KBs
 * });
 * ```
 *
 * 4. Append mode — always call both, vector nodes first, KBs as supplement:
 * ```ts
 * const retriever = new AlexandrianNodeRetriever({
 *   fallback: index.asRetriever(),
 *   mergeMode: "append",
 * });
 * ```
 *
 * Attribution and on-chain settlement are the application's responsibility.
 * Use `retriever.lastEnhancement` after each call for `kbsUsed` and `settlementPreview`.
 * Use `retriever.lastFallbackNodes` to inspect what the vector index returned.
 *
 * Peer dependency: llamaindex >= 0.3.0
 */

import {
  enhanceQuery,
  type EnhanceQueryOptions,
  type EnhancedQuery,
  type SelectedKB,
} from "../enhanceQuery.js";
import { inferDomains } from "../inferDomains.js";

// ── LlamaIndex interface shims ────────────────────────────────────────────────
// Structural typing — file compiles without llamaindex installed (peer dependency).

export interface LlamaIndexTextNode {
  id_: string;
  text: string;
  metadata: Record<string, unknown>;
  getContent(): string;
}

export interface LlamaIndexNodeWithScore {
  node: LlamaIndexTextNode;
  score: number;
}

export interface LlamaIndexBaseRetriever {
  retrieve(query: string): Promise<LlamaIndexNodeWithScore[]>;
}

// ── Merge modes ───────────────────────────────────────────────────────────────

/**
 * Controls how Alexandrian KB nodes are combined with the fallback retriever.
 *
 * - `"replace"` (default) — Alexandrian only; call fallback when kbsUsed < fallbackThreshold.
 * - `"prepend"` — Always call both concurrently; Alexandrian nodes appear first.
 *   Re-ranked by boosted score if `alexandrianBoost !== 1.0`.
 * - `"append"` — Always call both concurrently; fallback nodes appear first.
 */
export type MergeMode = "replace" | "prepend" | "append";

// ── Options ───────────────────────────────────────────────────────────────────

export interface AlexandrianNodeRetrieverOptions extends EnhanceQueryOptions {
  /**
   * Whether to auto-infer domains from the query text using `inferDomains()`.
   * Default: true when no domains are provided, false when domains are provided.
   */
  autoDomains?: boolean;

  /**
   * An existing LlamaIndex retriever (VectorStoreIndex.asRetriever(), etc.) to use
   * as fallback or blend source alongside Alexandrian KB results.
   *
   * When omitted, the retriever operates in standalone mode.
   */
  fallback?: LlamaIndexBaseRetriever;

  /**
   * How to combine Alexandrian results with the fallback retriever.
   * @default "replace"
   */
  mergeMode?: MergeMode;

  /**
   * (replace mode only) Minimum number of Alexandrian KB hits required before
   * the fallback retriever is skipped entirely.
   * @default 1
   */
  fallbackThreshold?: number;

  /**
   * Score multiplier applied to Alexandrian nodes when merging results in
   * prepend/append mode. 1.2 gives structured KB nodes a 20% ranking edge.
   * Set to 1.0 to preserve insertion order without re-ranking by score.
   * @default 1.2
   */
  alexandrianBoost?: number;
}

// ── AlexandrianNodeRetriever ──────────────────────────────────────────────────

/**
 * LlamaIndex-compatible node retriever backed by the Alexandrian Protocol.
 *
 * Sits "in front of" or "alongside" your existing LlamaIndex vector index.
 * Returns NodeWithScore objects with `metadata.retrievedBy` tagged as
 * `"alexandrian"` or `"vector-fallback"` so the query engine can distinguish sources.
 *
 * Public state after each call:
 * - `lastEnhancement`   — full EnhancedQuery (kbsUsed, settlementPreview, warnings)
 * - `lastFallbackNodes` — raw NodeWithScore[] from the vector index, if it was called
 */
export class AlexandrianNodeRetriever implements LlamaIndexBaseRetriever {
  private readonly options: AlexandrianNodeRetrieverOptions;

  /**
   * Full EnhancedQuery result from the most recent retrieval call.
   *
   * ⚠️ Concurrent-use hazard: this field is overwritten on every call.
   * If you share one retriever instance across concurrent requests (e.g. in a
   * web server handler), read `lastEnhancement` immediately after `await retrieve()`
   * in the same async context — another in-flight call may overwrite it before you read it.
   * For fully concurrent-safe access, create a separate retriever instance per request
   * or capture the return value from `retrieve()` instead.
   */
  public lastEnhancement: EnhancedQuery | null = null;

  /**
   * Raw nodes returned by the fallback retriever on the last call, or null.
   *
   * ⚠️ Same concurrent-use hazard as `lastEnhancement` — see note above.
   */
  public lastFallbackNodes: LlamaIndexNodeWithScore[] | null = null;

  constructor(options: AlexandrianNodeRetrieverOptions = {}) {
    this.options = options;
  }

  /**
   * Retrieve relevant KB nodes for a query string.
   * Called automatically by LlamaIndex query engines.
   */
  async retrieve(query: string): Promise<LlamaIndexNodeWithScore[]> {
    const {
      fallback,
      mergeMode = "replace",
      fallbackThreshold = 1,
      alexandrianBoost = 1.2,
      autoDomains,
      ...enhanceOptions
    } = this.options;

    this.lastFallbackNodes = null;

    // Auto-infer domains when not explicitly provided
    const shouldAutoDomain = autoDomains !== false && !enhanceOptions.domains?.length;
    const resolvedOptions: EnhanceQueryOptions = {
      ...enhanceOptions,
      domains: shouldAutoDomain
        ? (inferDomains(query) ?? undefined)
        : enhanceOptions.domains,
    };

    // ── prepend / append: run Alexandrian + fallback concurrently ─────────────
    if (fallback && (mergeMode === "prepend" || mergeMode === "append")) {
      // Run concurrently but isolate fallback errors — a vector index failure should
      // never discard the Alexandrian KB results that already succeeded.
      const [enhanced, fallbackResult] = await Promise.all([
        enhanceQuery(query, resolvedOptions),
        fallback.retrieve(query).catch((err: unknown) => {
          console.warn("[AlexandrianNodeRetriever] fallback retriever error (ignored):", err);
          return [] as LlamaIndexNodeWithScore[];
        }),
      ]);

      this.lastEnhancement = enhanced;
      this.lastFallbackNodes = fallbackResult;

      const axNodes = enhanced.kbsUsed.map((kb, i) =>
        toNodeWithScore(kb, enhanced.enrichedPrompt, i, alexandrianBoost)
      );
      const fbNodes = tagFallbackNodes(fallbackResult);

      const merged =
        mergeMode === "prepend"
          ? [...axNodes, ...fbNodes]
          : [...fbNodes, ...axNodes];

      // Re-rank combined list by boosted score when boost is non-trivial
      return alexandrianBoost !== 1.0 ? sortByScore(merged) : merged;
    }

    // ── replace mode (or no fallback): Alexandrian first ─────────────────────
    const enhanced = await enhanceQuery(query, resolvedOptions);
    this.lastEnhancement = enhanced;

    // In replace mode there is no merging — boost is irrelevant. Pass 1.0 so
    // metadata score reflects the raw normalised reputation score (0–1) only.
    const axNodes = enhanced.kbsUsed.map((kb, i) =>
      toNodeWithScore(kb, enhanced.enrichedPrompt, i, 1.0)
    );

    // No fallback configured — standalone mode
    if (!fallback) {
      if (axNodes.length === 0) {
        // Return a fallback node so LlamaIndex engines don't receive an empty context
        const fallbackNode: LlamaIndexTextNode = {
          id_: "alexandrian-fallback",
          text: enhanced.enrichedPrompt,
          metadata: {
            source: "alexandrian://fallback",
            retrievedBy: "alexandrian",
            // Omit kbIndex — there is no KB to reference; callers must not
            // use this as an index into kbsUsed.
            warnings: enhanced.warnings,
          },
          getContent() { return this.text; },
        };
        return [{ node: fallbackNode, score: 0 }];
      }
      return axNodes;
    }

    // Replace mode + fallback configured: skip vector index if enough KBs returned
    if (enhanced.kbsUsed.length >= fallbackThreshold) {
      return axNodes;
    }

    // Below threshold — call vector index and prepend any Alexandrian results
    const fallbackNodes = await fallback.retrieve(query);
    this.lastFallbackNodes = fallbackNodes;

    return [...axNodes, ...tagFallbackNodes(fallbackNodes)];
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Neutral score for vector fallback nodes missing an explicit score. */
const VECTOR_FALLBACK_SCORE = 0.5;

function toNodeWithScore(
  kb: SelectedKB,
  enrichedPrompt: string,
  index: number,
  boost: number
): LlamaIndexNodeWithScore {
  // Normalise reputationScore (0–1000) → [0, 1], then apply structured-KB boost
  const score = Math.min(1, Math.max(0, (kb.reputationScore / 1000) * boost));

  const node: LlamaIndexTextNode = {
    id_: kb.contentHash,
    // KB-1 carries the full enriched prompt; subsequent KBs carry their summary
    text: index === 0 ? enrichedPrompt : kb.summary || kb.title,
    metadata: {
      source:          `alexandrian://${kb.contentHash}`,
      contentHash:     kb.contentHash,
      domain:          kb.domain,
      kbType:          kb.kbType,
      title:           kb.title,
      reputationScore: kb.reputationScore,
      queryFeeWei:     kb.queryFeeWei,
      royaltyBps:      kb.royaltyBps,
      cid:             kb.cid,
      kbIndex:         index + 1,
      retrievedBy:     "alexandrian",
    },
    getContent() { return this.text; },
  };

  return { node, score };
}

/**
 * Tag NodeWithScore objects from the fallback retriever.
 * Adds `metadata.retrievedBy = "vector-fallback"` so the query engine and
 * caller can distinguish fallback nodes from Alexandrian KB nodes.
 * Normalises missing scores to a neutral 0.5.
 *
 * ⚠️ Implementation note — prototype safety:
 * Spreading a real LlamaIndex TextNode (`{...ns.node, metadata: {...}}`) creates
 * a plain object, which silently drops prototype methods like `getContent()`.
 * A LlamaIndex query engine that calls `node.getContent()` on tagged nodes would
 * get a TypeError. We therefore build a plain-object shim that delegates
 * `getContent()` back to the original node instance, so the engine always gets
 * valid text regardless of whether the node is a class instance or a plain object.
 */
function tagFallbackNodes(
  nodes: LlamaIndexNodeWithScore[]
): LlamaIndexNodeWithScore[] {
  return nodes.map((ns, i) => {
    const originalNode = ns.node;
    const taggedNode: LlamaIndexTextNode = {
      // Shallow-copy own enumerable properties (id_, text, any extras)
      ...originalNode,
      // Overwrite metadata with the tagging additions
      metadata: {
        ...originalNode.metadata,
        retrievedBy:   "vector-fallback",
        fallbackIndex: i,
      },
      // Re-attach getContent() explicitly so the method survives the plain-object
      // spread. Delegates to the original instance for full compatibility with
      // real LlamaIndex TextNode subclasses that override getContent().
      getContent() {
        return typeof originalNode.getContent === "function"
          ? originalNode.getContent()
          : (originalNode.text ?? "");
      },
    };

    return {
      ...ns,
      score: typeof ns.score === "number" ? ns.score : VECTOR_FALLBACK_SCORE,
      node: taggedNode,
    };
  });
}

/**
 * Sort NodeWithScore[] descending by score.
 * Used in prepend/append mode when alexandrianBoost !== 1.0 so boosted
 * Alexandrian nodes surface above lower-scored vector chunks.
 */
function sortByScore(
  nodes: LlamaIndexNodeWithScore[]
): LlamaIndexNodeWithScore[] {
  return [...nodes].sort(
    (a, b) =>
      (typeof b.score === "number" ? b.score : VECTOR_FALLBACK_SCORE) -
      (typeof a.score === "number" ? a.score : VECTOR_FALLBACK_SCORE)
  );
}
