/**
 * Search & Information Retrieval Seeds (~80 seed procedures).
 * Full-text search, vector search, hybrid retrieval, ranking, query understanding,
 * re-ranking, index management, and search quality evaluation.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Full-text search (10) */
const FULL_TEXT: SeedSpec[] = [
  { domain: "search.fulltext.indexing", title: "Designing full-text search index pipelines", concept: C("tokenize → normalize → stem/lemmatize → build inverted index; field weights; update on document change") },
  { domain: "search.fulltext.bm25", title: "Implementing BM25 ranking for full-text search", concept: C("score = IDF * (TF * (k1+1)) / (TF + k1*(1-b+b*dl/avgdl)); tune k1=1.2, b=0.75; re-tune on domain") },
  { domain: "search.fulltext.tokenization", title: "Designing tokenization pipelines for search indexes", concept: C("split by whitespace and punctuation; lowercase; language-specific stemmer; preserve numbers and acronyms") },
  { domain: "search.fulltext.synonyms", title: "Implementing synonym expansion in search queries", concept: C("synonym dictionary; expand at query time or index time; prefer query-time for flexibility; domain-specific") },
  { domain: "search.fulltext.fuzzy", title: "Implementing fuzzy matching for typo-tolerant search", concept: C("Levenshtein distance ≤ 2 for long terms; prefix match first; fuzzy only on no-results or low-confidence") },
  { domain: "search.fulltext.phrase", title: "Implementing phrase and proximity search", concept: C("positional index; phrase match requires tokens in order and adjacent; proximity: tokens within N positions") },
  { domain: "search.fulltext.highlighting", title: "Implementing search result snippet highlighting", concept: C("find matched terms in document; extract surrounding context window; bold matched spans; handle multi-term") },
  { domain: "search.fulltext.multilingual", title: "Designing multilingual full-text search pipelines", concept: C("detect language per document; apply language-specific analyzer; cross-language via translation or embedding") },
  { domain: "search.fulltext.field_boosting", title: "Designing field boosting strategies for search relevance", concept: C("title > subtitle > body > metadata; apply boost multiplier per field; tune boosts with evaluation set") },
  { domain: "search.fulltext.autocomplete", title: "Implementing search autocomplete and query suggestion", concept: C("prefix trie or edge n-gram index; rank by query frequency; personalize by user history; deduplicate") },
];

/** 2. Vector search (10) */
const VECTOR_SEARCH: SeedSpec[] = [
  { domain: "search.vector.embedding", title: "Designing embedding generation pipelines for vector search", concept: C("embed text with model; normalize to unit sphere; batch embed; cache by content hash; re-embed on model change") },
  { domain: "search.vector.index", title: "Implementing approximate nearest neighbor vector indexes", concept: C("HNSW for recall/latency balance; IVF for large scale; tune ef_construction and M; benchmark recall@10") },
  { domain: "search.vector.similarity", title: "Selecting similarity metrics for vector search", concept: C("cosine for normalized; dot product for unnormalized; L2 for magnitude matters; match to embedding training objective") },
  { domain: "search.vector.filtering", title: "Implementing pre-filter and post-filter in vector search", concept: C("pre-filter: narrow candidate set then ANN; post-filter: ANN then apply filter; pre-filter loses recall on small sets") },
  { domain: "search.vector.chunking", title: "Designing document chunking strategies for vector search", concept: C("chunk by sentence or paragraph; overlap by N tokens; chunk size 256–512 tokens; test recall per chunk size") },
  { domain: "search.vector.multi_vector", title: "Implementing multi-vector document representations", concept: C("embed each chunk; store all vectors per document; max-sim aggregation at query time; ColBERT-style late interaction") },
  { domain: "search.vector.reindex", title: "Designing vector index rebuild and live update strategies", concept: C("batch rebuild on model change; incremental insert for new docs; background rebuild with alias swap on completion") },
  { domain: "search.vector.compression", title: "Implementing vector index compression for storage efficiency", concept: C("product quantization; scalar quantization; benchmark recall vs size tradeoff; decompress only for re-ranking") },
  { domain: "search.vector.namespace", title: "Designing vector index namespace and tenant isolation", concept: C("namespace per tenant or collection; isolated index or metadata filter; no cross-namespace leakage") },
  { domain: "search.vector.evaluation", title: "Evaluating vector search recall and precision", concept: C("recall@K on labeled dataset; compare to BM25 baseline; measure latency at p50/p95; set minimum recall threshold") },
];

/** 3. Hybrid retrieval (8) */
const HYBRID: SeedSpec[] = [
  { domain: "search.hybrid.fusion", title: "Implementing hybrid search with score fusion strategies", concept: C("RRF: 1/(rank+k) sum across systems; normalize scores before weighted sum; tune alpha on evaluation set") },
  { domain: "search.hybrid.rrf", title: "Implementing reciprocal rank fusion for hybrid search", concept: C("RRF score = Σ 1/(k + rank_i) across retrievers; k=60 default; no score normalization needed; robust to score scale") },
  { domain: "search.hybrid.routing", title: "Designing query-type routing between lexical and semantic search", concept: C("keyword queries → BM25; natural language → vector; ambiguous → hybrid; classify by query embedding") },
  { domain: "search.hybrid.sparse_dense", title: "Combining sparse BM25 and dense vector retrieval", concept: C("retrieve top-K from each; merge candidate set; re-rank merged set with cross-encoder; deduplicate by doc ID") },
  { domain: "search.hybrid.learned_sparse", title: "Implementing learned sparse retrieval with SPLADE", concept: C("SPLADE: expand query and document to sparse term weights; inverted index; better recall than BM25; slower indexing") },
  { domain: "search.hybrid.ensemble", title: "Designing ensemble retrieval pipelines with multiple retrievers", concept: C("multiple retrievers → merge candidates → deduplicate → re-rank; diversity across retrievers improves recall") },
  { domain: "search.hybrid.late_interaction", title: "Implementing late interaction models for hybrid ranking", concept: C("ColBERT: token-level embeddings; MaxSim over query-document token pairs; high recall, more storage") },
  { domain: "search.hybrid.two_stage", title: "Designing two-stage retrieve-then-rank pipelines", concept: C("stage 1: fast retrieval (BM25 or ANN) for top 100; stage 2: cross-encoder re-rank top 100; return top 10") },
];

/** 4. Ranking & relevance (10) */
const RANKING: SeedSpec[] = [
  { domain: "search.ranking.ltr", title: "Implementing learning-to-rank models for search", concept: C("features: BM25, vector similarity, recency, click rate; LambdaMART or LightGBM; train on click logs; NDCG metric") },
  { domain: "search.ranking.ndcg", title: "Computing NDCG for search ranking evaluation", concept: C("DCG = Σ (2^rel - 1) / log2(rank+1); NDCG = DCG / IDCG; requires relevance labels; target NDCG@10") },
  { domain: "search.ranking.click_signals", title: "Incorporating click and engagement signals into ranking", concept: C("CTR, dwell time, scroll depth; position-bias correction; session-level signals; decay old signals") },
  { domain: "search.ranking.freshness", title: "Implementing document freshness signals in search ranking", concept: C("recency boost: score * exp(-λ * age_days); tune λ by query type; news queries: high λ; evergreen: low λ") },
  { domain: "search.ranking.diversity", title: "Implementing result diversity in search result sets", concept: C("MMR: balance relevance and diversity; re-rank to penalize similar documents; tune λ between relevance and diversity") },
  { domain: "search.ranking.personalization", title: "Designing personalized search ranking systems", concept: C("user embedding from history; shift query embedding toward user embedding; blend global and personal ranking") },
  { domain: "search.ranking.position_bias", title: "Correcting for position bias in click-based ranking signals", concept: C("propensity model: P(click | relevant, position); divide click by propensity; IPS-weighted training") },
  { domain: "search.ranking.xgboost", title: "Training gradient boosted trees for search ranking", concept: C("feature engineering; pointwise, pairwise, or listwise loss; cross-validate on eval set; NDCG as eval metric") },
  { domain: "search.ranking.cross_encoder", title: "Implementing cross-encoder re-rankers for precision", concept: C("concat query + document → transformer → relevance score; slow but high quality; apply to top 50 candidates") },
  { domain: "search.ranking.cold_start", title: "Handling cold start for new documents in ranking systems", concept: C("new docs get freshness boost; content-based signals until click data accumulates; threshold to switch to click-based") },
];

/** 5. Query understanding (8) */
const QUERY_UNDERSTANDING: SeedSpec[] = [
  { domain: "search.query.intent", title: "Classifying search query intent for routing", concept: C("navigational / informational / transactional; classify by embedding or classifier; route to specialized handler") },
  { domain: "search.query.expansion", title: "Implementing query expansion for improved recall", concept: C("expand with synonyms, related terms, or LLM suggestions; evaluate recall improvement; constrain expansion count") },
  { domain: "search.query.rewrite", title: "Implementing query rewriting for improved precision", concept: C("spell correction; abbreviation expansion; LLM rewrite for natural language; A/B test rewrites vs original") },
  { domain: "search.query.entity", title: "Implementing entity extraction from search queries", concept: C("NER on query; link entities to knowledge base; use entities for structured filter injection") },
  { domain: "search.query.segmentation", title: "Segmenting compound search queries into sub-queries", concept: C("detect AND/OR operators; split by comma or semicolon; run sub-queries independently; merge results") },
  { domain: "search.query.suggestion", title: "Implementing query suggestion from query logs", concept: C("n-gram language model over past queries; complete by prefix; rank by frequency and recency; filter low-quality") },
  { domain: "search.query.spell_correction", title: "Implementing search query spell correction", concept: C("Noisy channel model: P(query|intended) * P(intended); edit distance candidates; rank by language model score") },
  { domain: "search.query.semantic_parsing", title: "Implementing semantic parsing for structured search queries", concept: C("parse to structured filter: field:value operators; date ranges; numeric comparisons; fallback to full-text on parse fail") },
];

/** 6. Index management (8) */
const INDEX_MGMT: SeedSpec[] = [
  { domain: "search.index.design", title: "Designing search index schema for relevance and performance", concept: C("field types: keyword, text, numeric, date; field weights; nested for structured docs; source includes for highlight") },
  { domain: "search.index.sharding", title: "Designing search index sharding strategies", concept: C("shard by document ID hash; shard count = expected_docs / docs_per_shard; rebalance on growth; avoid hot shards") },
  { domain: "search.index.replication", title: "Implementing search index replication for availability", concept: C("primary + N replicas; read from replica; write to primary; sync on commit; replica lag monitoring") },
  { domain: "search.index.update", title: "Designing real-time document update pipelines for search", concept: C("upsert by document ID; partial update for mutable fields; full re-index for structural changes; lag SLA") },
  { domain: "search.index.deletion", title: "Handling document deletion in search indexes", concept: C("soft delete with tombstone; hard delete at merge time; partial update to mark deleted; filter deleted in query") },
  { domain: "search.index.merge", title: "Designing Lucene segment merge policies for search performance", concept: C("tiered merge: small segments merge first; tune max_merge_at_once and floor_segment; merge during off-peak") },
  { domain: "search.index.warm", title: "Implementing index warm-up for low-latency search", concept: C("pre-load segments into OS page cache; run warm queries on startup; route traffic after warm-up complete") },
  { domain: "search.index.backup", title: "Designing search index backup and restore procedures", concept: C("snapshot repository to S3; scheduled daily snapshot; restore to new cluster; verify doc count and random queries") },
];

/** 7. Search quality evaluation (8) */
const QUALITY_EVAL: SeedSpec[] = [
  { domain: "search.quality.offline", title: "Designing offline search quality evaluation pipelines", concept: C("curated query-document relevance dataset; compute NDCG, MRR, Precision@K; track per model version") },
  { domain: "search.quality.online", title: "Implementing online A/B testing for search ranking changes", concept: C("interleaved results or separate experiment; metric: CTR, session success, time-to-click; SRM check first") },
  { domain: "search.quality.labels", title: "Designing relevance labeling workflows for search evaluation", concept: C("rater guidelines with examples; 4-point scale; multi-rater; inter-rater agreement; focus on ambiguous queries") },
  { domain: "search.quality.zero_results", title: "Monitoring and reducing zero-result search queries", concept: C("track zero-result rate by query; cluster zero-result queries; add synonyms or fallback logic per cluster") },
  { domain: "search.quality.abandonment", title: "Analyzing search abandonment signals for quality improvement", concept: C("no click after search = abandonment; segment by query type; high abandonment → ranking or coverage problem") },
  { domain: "search.quality.regression", title: "Implementing search quality regression testing", concept: C("fixed query set with expected top results; alert if expected doc drops out of top N; run on every index change") },
  { domain: "search.quality.head_torso_tail", title: "Stratifying search quality analysis by query frequency", concept: C("head: top 1k queries; torso: 1k-100k; tail: rest; evaluate separately; tail needs recall; head needs precision") },
  { domain: "search.quality.rag_eval", title: "Evaluating retrieval quality in RAG pipelines", concept: C("context recall: does retrieved context contain answer; context precision: is retrieved context relevant; faithfulness: is answer grounded") },
];

export const SEARCH_IR_SEED_SPECS: SeedSpec[] = [
  ...FULL_TEXT,
  ...VECTOR_SEARCH,
  ...HYBRID,
  ...RANKING,
  ...QUERY_UNDERSTANDING,
  ...INDEX_MGMT,
  ...QUALITY_EVAL,
];
