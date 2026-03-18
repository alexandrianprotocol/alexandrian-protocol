/**
 * AlexandrianRetriever — LangChain BaseRetriever integration.
 *
 * Drop-in retriever for LangChain chains and agents. Wraps `enhanceQuery()`
 * to deliver Alexandrian KB context as LangChain Document objects, with full
 * support for blending with an existing vector DB retriever.
 *
 * ── Usage patterns ────────────────────────────────────────────────────────────
 *
 * 1. Standalone (no existing retriever):
 * ```ts
 * const retriever = new AlexandrianRetriever({ limit: 4 });
 * const chain = RetrievalQAChain.fromLLM(llm, retriever);
 * ```
 *
 * 2. Replace mode — Alexandrian first, vector DB only when no KBs found:
 * ```ts
 * const retriever = new AlexandrianRetriever({
 *   fallback: vectorStore.asRetriever(),
 *   mergeMode: "replace",          // default
 *   fallbackThreshold: 1,          // default: call vector only if 0 KBs returned
 * });
 * ```
 *
 * 3. Prepend mode — always call both, structured KBs before vector chunks:
 * ```ts
 * const retriever = new AlexandrianRetriever({
 *   fallback: vectorStore.asRetriever(),
 *   mergeMode: "prepend",
 *   alexandrianBoost: 1.2,         // default: 20% score edge for structured KBs
 * });
 * ```
 *
 * 4. Append mode — always call both, vector chunks as primary, KBs as supplement:
 * ```ts
 * const retriever = new AlexandrianRetriever({
 *   fallback: vectorStore.asRetriever(),
 *   mergeMode: "append",
 * });
 * ```
 *
 * Attribution and on-chain settlement are the application's responsibility.
 * Use `retriever.lastEnhancement` after each call for `kbsUsed` and `settlementPreview`.
 * Use `retriever.lastFallbackDocs` to inspect what the vector DB returned.
 *
 * Peer dependency: langchain >= 0.1.0
 */

import {
  enhanceQuery,
  type EnhanceQueryOptions,
  type EnhancedQuery,
  type SelectedKB,
} from "../enhanceQuery.js";
import { inferDomains } from "../inferDomains.js";

// ── LangChain interface shims ─────────────────────────────────────────────────
// Structural typing — file compiles without langchain installed (peer dependency).

export interface LangChainDocument {
  pageContent: string;
  metadata: Record<string, unknown>;
}

export interface LangChainBaseRetriever {
  getRelevantDocuments(query: string): Promise<LangChainDocument[]>;
}

// ── Merge modes ───────────────────────────────────────────────────────────────

/**
 * Controls how Alexandrian KB results are combined with the fallback retriever.
 *
 * - `"replace"` (default) — Alexandrian only; call fallback when kbsUsed < fallbackThreshold.
 *   This is the "invisible upgrade" pattern: existing stack is unchanged for novel queries,
 *   but gets structured KB context injected for queries Alexandrian covers.
 *
 * - `"prepend"` — Always call both concurrently; Alexandrian results appear first.
 *   Re-rank by score if `alexandrianBoost !== 1.0`.
 *   Use when you want Alexandrian to always lead and vector DB to pad depth.
 *
 * - `"append"` — Always call both concurrently; fallback results appear first.
 *   Use when you trust your vector DB for primary recall but want KB structure appended.
 */
export type MergeMode = "replace" | "prepend" | "append";

// ── Options ───────────────────────────────────────────────────────────────────

export interface AlexandrianRetrieverOptions extends EnhanceQueryOptions {
  /**
   * Whether to auto-infer domains from the query text using `inferDomains()`.
   * Default: true when no domains are provided, false when domains are provided.
   */
  autoDomains?: boolean;

  /**
   * An existing LangChain retriever (vector DB, BM25, etc.) to use as fallback
   * or blend source alongside Alexandrian KB results.
   *
   * When omitted, the retriever operates in standalone mode.
   */
  fallback?: LangChainBaseRetriever;

  /**
   * How to combine Alexandrian results with the fallback retriever.
   * @default "replace"
   */
  mergeMode?: MergeMode;

  /**
   * (replace mode only) Minimum number of Alexandrian KB hits required before
   * the fallback retriever is skipped entirely. Set to 2 to require at least 2
   * KBs before trusting Alexandrian alone.
   * @default 1
   */
  fallbackThreshold?: number;

  /**
   * Score multiplier applied to Alexandrian documents when re-ranking merged results
   * in prepend/append mode. 1.2 gives structured KB results a 20% ranking edge over
   * raw vector chunks. Set to 1.0 to preserve insertion order without re-ranking.
   * @default 1.2
   */
  alexandrianBoost?: number;
}

// ── AlexandrianRetriever ──────────────────────────────────────────────────────

/**
 * LangChain-compatible retriever backed by the Alexandrian Protocol subgraph.
 *
 * Sits "in front of" or "alongside" your existing vector DB retriever.
 * Returns Documents with `metadata.retrievedBy` tagged as `"alexandrian"` or
 * `"vector-fallback"` so the LLM chain can distinguish sources.
 *
 * Public state after each call:
 * - `lastEnhancement` — full EnhancedQuery (kbsUsed, settlementPreview, warnings)
 * - `lastFallbackDocs` — raw Documents from the vector DB, if it was called
 */
export class AlexandrianRetriever implements LangChainBaseRetriever {
  private readonly options: AlexandrianRetrieverOptions;

  /**
   * Full EnhancedQuery result from the most recent retrieval call.
   *
   * ⚠️ Concurrent-use hazard: this field is overwritten on every call.
   * If you share one retriever instance across concurrent requests (e.g. in a
   * web server handler), read `lastEnhancement` immediately after `await retrieve()`
   * in the same async context — another in-flight call may overwrite it before you read it.
   * For fully concurrent-safe access, create a separate retriever instance per request
   * or capture the return value from `getRelevantDocuments()` instead.
   */
  public lastEnhancement: EnhancedQuery | null = null;

  /**
   * Raw documents returned by the fallback retriever on the last call, or null.
   *
   * ⚠️ Same concurrent-use hazard as `lastEnhancement` — see note above.
   */
  public lastFallbackDocs: LangChainDocument[] | null = null;

  constructor(options: AlexandrianRetrieverOptions = {}) {
    this.options = options;
  }

  /**
   * Retrieve relevant documents for a query.
   * Called automatically by LangChain chains — you rarely need to call this directly.
   */
  async getRelevantDocuments(query: string): Promise<LangChainDocument[]> {
    const {
      fallback,
      mergeMode = "replace",
      fallbackThreshold = 1,
      alexandrianBoost = 1.2,
      autoDomains,
      // Everything else is a valid EnhanceQueryOptions field
      ...enhanceOptions
    } = this.options;

    this.lastFallbackDocs = null;

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
      // Run concurrently but isolate fallback errors — a vector DB failure should
      // never discard the Alexandrian KB results that already succeeded.
      const [enhanced, fallbackResult] = await Promise.all([
        enhanceQuery(query, resolvedOptions),
        fallback.getRelevantDocuments(query).catch((err: unknown) => {
          console.warn("[AlexandrianRetriever] fallback retriever error (ignored):", err);
          return [] as LangChainDocument[];
        }),
      ]);

      this.lastEnhancement = enhanced;
      this.lastFallbackDocs = fallbackResult;

      const axDocs = enhanced.kbsUsed.map((kb, i) =>
        toDocument(kb, enhanced.enrichedPrompt, i, alexandrianBoost)
      );
      const fbDocs = tagFallbackDocs(fallbackResult);

      const merged =
        mergeMode === "prepend"
          ? [...axDocs, ...fbDocs]
          : [...fbDocs, ...axDocs];

      // Re-rank by score when boost is non-trivial so structured KBs surface correctly
      return alexandrianBoost !== 1.0 ? sortByScore(merged) : merged;
    }

    // ── replace mode (or no fallback): Alexandrian first ─────────────────────
    const enhanced = await enhanceQuery(query, resolvedOptions);
    this.lastEnhancement = enhanced;

    // In replace mode there is no merging — boost is irrelevant. Pass 1.0 so
    // metadata.score reflects the raw normalised reputation score (0–1) only.
    const axDocs = enhanced.kbsUsed.map((kb, i) =>
      toDocument(kb, enhanced.enrichedPrompt, i, 1.0)
    );

    // No fallback configured — standalone mode
    if (!fallback) {
      if (axDocs.length === 0) {
        // Return generic prompt so LangChain chains don't throw "No documents found"
        return [
          {
            pageContent: enhanced.enrichedPrompt,
            metadata: {
              source: "alexandrian://fallback",
              retrievedBy: "alexandrian",
              // Omit kbIndex — there is no KB to reference; callers must not
              // use this as an index into kbsUsed.
              warnings: enhanced.warnings,
            },
          },
        ];
      }
      return axDocs;
    }

    // Replace mode + fallback configured: skip vector DB if enough KBs returned
    if (enhanced.kbsUsed.length >= fallbackThreshold) {
      return axDocs;
    }

    // Below threshold — call vector DB and prepend any Alexandrian results
    const fallbackDocs = await fallback.getRelevantDocuments(query);
    this.lastFallbackDocs = fallbackDocs;

    return [...axDocs, ...tagFallbackDocs(fallbackDocs)];
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Neutral score assigned to vector fallback documents that carry no score. */
const VECTOR_FALLBACK_SCORE = 0.5;

function toDocument(
  kb: SelectedKB,
  enrichedPrompt: string,
  index: number,
  boost: number
): LangChainDocument {
  // Normalise reputationScore (0–1000) to [0, 1], then apply structured-KB boost
  const score = Math.min(1, Math.max(0, (kb.reputationScore / 1000) * boost));

  return {
    // KB-1 carries the full enriched prompt (complete grounded context for the chain).
    // Subsequent KBs carry their individual summary to avoid context duplication.
    pageContent: index === 0 ? enrichedPrompt : kb.summary || kb.title,
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
      score,
      retrievedBy:     "alexandrian",
    },
  };
}

/**
 * Tag documents returned by the fallback retriever so the LLM chain (and the
 * caller via `lastFallbackDocs`) can distinguish them from Alexandrian KB docs.
 * Preserves all existing metadata; adds `retrievedBy` and a neutral `score` if absent.
 */
function tagFallbackDocs(docs: LangChainDocument[]): LangChainDocument[] {
  return docs.map((doc, i) => ({
    ...doc,
    metadata: {
      ...doc.metadata,
      score:
        typeof doc.metadata["score"] === "number"
          ? doc.metadata["score"]
          : VECTOR_FALLBACK_SCORE,
      retrievedBy:    "vector-fallback",
      fallbackIndex:  i,
    },
  }));
}

/**
 * Sort documents descending by `metadata.score`.
 * Used in prepend/append mode when alexandrianBoost !== 1.0 so the
 * structured KB results surface ahead of lower-scored vector chunks.
 */
function sortByScore(docs: LangChainDocument[]): LangChainDocument[] {
  return [...docs].sort((a, b) => {
    const sa =
      typeof a.metadata["score"] === "number"
        ? (a.metadata["score"] as number)
        : VECTOR_FALLBACK_SCORE;
    const sb =
      typeof b.metadata["score"] === "number"
        ? (b.metadata["score"] as number)
        : VECTOR_FALLBACK_SCORE;
    return sb - sa;
  });
}
