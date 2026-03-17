/**
 * Retrieval-Augmented Generation (RAG) Seeds (~90 seed procedures).
 * Embedding models, vector search, chunking strategies, retrieval ranking,
 * context selection, RAG pipeline design, evaluation, and agentic RAG.
 * Domain: ai.rag.*
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Embedding models (10) */
const EMBEDDING_MODELS: SeedSpec[] = [
  { domain: "ai.rag.embedding_models", title: "Selecting embedding models for RAG retrieval systems", concept: C("evaluate on domain benchmark; MTEB score by task type; balance: quality vs latency vs cost; multilingual if needed") },
  { domain: "ai.rag.embedding_models", title: "Fine-tuning embedding models for domain-specific RAG retrieval", concept: C("contrastive fine-tune on domain pairs; positive: relevant; hard negatives: same topic different answer; eval MRR") },
  { domain: "ai.rag.embedding_models", title: "Implementing bi-encoder embedding architectures for RAG", concept: C("encode query and document independently; cosine similarity at retrieval time; fast but weaker than cross-encoder") },
  { domain: "ai.rag.embedding_models", title: "Implementing cross-encoder reranking for RAG result quality", concept: C("cross-encoder: joint encoding of query + document; slower but higher quality; use after bi-encoder shortlist") },
  { domain: "ai.rag.embedding_models", title: "Implementing late interaction models for efficient dense retrieval", concept: C("ColBERT: per-token embeddings; MaxSim scoring; higher quality than bi-encoder; higher index storage cost") },
  { domain: "ai.rag.embedding_models", title: "Managing embedding model versioning in RAG pipelines", concept: C("version index per model; re-embed on model upgrade; shadow index for new model; cutover after eval passes") },
  { domain: "ai.rag.embedding_models", title: "Optimizing embedding inference throughput for RAG systems", concept: C("batch encode; GPU with TensorRT or ONNX; dynamic batching; cache embeddings for static documents") },
  { domain: "ai.rag.embedding_models", title: "Implementing sparse-dense hybrid embeddings for RAG retrieval", concept: C("dense: semantic; sparse: BM25/SPLADE; combine scores; sparse captures exact terms; dense captures semantics") },
  { domain: "ai.rag.embedding_models", title: "Evaluating embedding model quality for RAG retrieval tasks", concept: C("BEIR benchmark; domain-specific eval set; metrics: NDCG@10, MRR, Recall@K; compare against baseline") },
  { domain: "ai.rag.embedding_models", title: "Implementing asymmetric embedding for query-document RAG retrieval", concept: C("query: short, high-level; document: long, detailed; asymmetric model trained on query-passage pairs") },
];

/** 2. Vector search (10) */
const VECTOR_SEARCH: SeedSpec[] = [
  { domain: "ai.rag.vector_search", title: "Designing vector index architectures for RAG retrieval at scale", concept: C("HNSW for quality; IVF-PQ for scale; flat for < 100k docs; choose by: doc count, latency SLA, accuracy target") },
  { domain: "ai.rag.vector_search", title: "Implementing HNSW vector indexes for approximate nearest neighbor search", concept: C("M: connections per node; ef_construction: build quality; ef_search: query quality; tune: recall vs latency") },
  { domain: "ai.rag.vector_search", title: "Implementing IVF-PQ vector indexes for billion-scale retrieval", concept: C("IVF: cluster into nlist centroids; PQ: quantize residuals; nprobe controls recall/speed; GPU for throughput") },
  { domain: "ai.rag.vector_search", title: "Implementing metadata filtering with vector search in RAG", concept: C("pre-filter by metadata then vector search; or post-filter results; pushdown filter to index if supported") },
  { domain: "ai.rag.vector_search", title: "Designing vector database selection for RAG applications", concept: C("Pinecone: managed, simple; Weaviate: hybrid, graph; Qdrant: filtering, on-prem; pgvector: Postgres native") },
  { domain: "ai.rag.vector_search", title: "Implementing hybrid search combining vector and keyword retrieval", concept: C("BM25 score + cosine score; RRF fusion; tune alpha weight; hybrid outperforms either alone on most tasks") },
  { domain: "ai.rag.vector_search", title: "Implementing vector search result deduplication in RAG pipelines", concept: C("MMR: diverse by penalizing similar results; cosine threshold dedup; cluster results; return one per cluster") },
  { domain: "ai.rag.vector_search", title: "Designing multi-vector retrieval for document and passage indexes", concept: C("index both passage and document embeddings; retrieve passages; expand to parent doc for context; re-rank") },
  { domain: "ai.rag.vector_search", title: "Implementing real-time vector index updates for dynamic knowledge bases", concept: C("upsert on document change; soft delete on removal; HNSW supports real-time upsert; batch for efficiency") },
  { domain: "ai.rag.vector_search", title: "Measuring and optimizing vector search recall in RAG pipelines", concept: C("recall@K: fraction of true relevant in top-K; measure on eval set; increase nprobe or ef_search to improve") },
];

/** 3. Chunking strategies (10) */
const CHUNKING: SeedSpec[] = [
  { domain: "ai.rag.chunking_strategies", title: "Implementing fixed-size chunking strategies for RAG document ingestion", concept: C("chunk by token count; overlap N tokens between chunks; preserve sentence boundaries; chunk size = context budget / 2") },
  { domain: "ai.rag.chunking_strategies", title: "Implementing semantic chunking for RAG document segmentation", concept: C("split at embedding similarity drops; detect topic boundaries; variable chunk size; better for long documents") },
  { domain: "ai.rag.chunking_strategies", title: "Implementing document-structure-aware chunking for RAG", concept: C("split by: headings, paragraphs, code blocks, tables; respect document structure; attach section metadata to chunk") },
  { domain: "ai.rag.chunking_strategies", title: "Implementing hierarchical chunking for multi-granularity RAG retrieval", concept: C("small chunks for retrieval; parent chunk for context; retrieve small, expand to parent before generation") },
  { domain: "ai.rag.chunking_strategies", title: "Implementing late chunking for contextual embedding generation", concept: C("embed full document first; chunk after embedding; each chunk embedding has full-document context; better quality") },
  { domain: "ai.rag.chunking_strategies", title: "Designing chunk overlap strategies to preserve context across boundaries", concept: C("overlap = 10–20% of chunk size; prevents splitting mid-sentence; detect boundary by sentence end; test retrieval quality") },
  { domain: "ai.rag.chunking_strategies", title: "Enriching chunks with metadata for improved RAG retrieval", concept: C("attach: source, section, page, date, entity mentions, summary; filterable at retrieval; improves ranking") },
  { domain: "ai.rag.chunking_strategies", title: "Implementing proposition-level chunking for factoid RAG retrieval", concept: C("split into atomic propositions; each chunk = one claim; higher precision; more chunks; good for QA tasks") },
  { domain: "ai.rag.chunking_strategies", title: "Selecting chunk size based on embedding model token limits", concept: C("chunk ≤ model max tokens; account for special tokens; measure retrieval quality at 256, 512, 1024 token chunks") },
  { domain: "ai.rag.chunking_strategies", title: "Implementing code-aware chunking for technical RAG applications", concept: C("split at function/class boundaries; preserve full function; attach language, file path, module as metadata") },
];

/** 4. Retrieval ranking (10) */
const RETRIEVAL_RANKING: SeedSpec[] = [
  { domain: "ai.rag.retrieval_ranking", title: "Implementing reciprocal rank fusion for multi-source RAG retrieval", concept: C("RRF score = Σ 1/(k + rank_i); combine vector, BM25, metadata scores; k=60 default; normalize and sort") },
  { domain: "ai.rag.retrieval_ranking", title: "Implementing cross-encoder reranking in RAG retrieval pipelines", concept: C("top-K from bi-encoder → cross-encoder score all K → re-sort → take top-N for context; latency tradeoff") },
  { domain: "ai.rag.retrieval_ranking", title: "Designing query-dependent retrieval re-ranking for RAG", concept: C("classify query type; use specialized ranker per type; factoid vs summary vs comparison require different ranking") },
  { domain: "ai.rag.retrieval_ranking", title: "Implementing learned sparse retrieval for RAG keyword matching", concept: C("SPLADE: learn token weights per document; better than BM25; matches embedding retrieval quality on exact-match tasks") },
  { domain: "ai.rag.retrieval_ranking", title: "Implementing time-aware retrieval ranking for RAG freshness", concept: C("decay score by age; boost recent documents; configurable half-life per domain; combine with semantic score") },
  { domain: "ai.rag.retrieval_ranking", title: "Implementing personalized retrieval ranking for RAG systems", concept: C("user preference embedding; boost documents similar to user history; privacy-preserving; configurable weight") },
  { domain: "ai.rag.retrieval_ranking", title: "Implementing diversity-aware retrieval ranking for RAG", concept: C("MMR: balance relevance and diversity; penalize similar retrieved documents; configurable lambda; reduces redundancy") },
  { domain: "ai.rag.retrieval_ranking", title: "Designing confidence-aware retrieval ranking for RAG pipelines", concept: C("score retrieval confidence; low confidence → fallback strategy; abstain or indicate uncertainty; calibrate scores") },
  { domain: "ai.rag.retrieval_ranking", title: "Implementing source credibility scoring in RAG retrieval ranking", concept: C("weight by source authority; freshness; citation count; human-verified flag; domain match to query") },
  { domain: "ai.rag.retrieval_ranking", title: "Evaluating retrieval ranking quality with NDCG and MRR metrics", concept: C("label relevance 0-3 for top-K; NDCG@10: position-weighted; MRR: rank of first relevant; compare ranker variants") },
];

/** 5. Context selection and management (10) */
const CONTEXT_SELECTION: SeedSpec[] = [
  { domain: "ai.rag.context_selection", title: "Designing context token budget management for RAG generation", concept: C("budget = max_context - system_prompt - query - answer_reserve; fill with ranked chunks until budget exhausted") },
  { domain: "ai.rag.context_selection", title: "Implementing context compression to fit more evidence in RAG prompts", concept: C("LLMLingua: compress retrieved text; remove low-information tokens; target 50% compression; test answer quality") },
  { domain: "ai.rag.context_selection", title: "Implementing lost-in-the-middle mitigation for RAG context ordering", concept: C("most relevant chunks first and last; least relevant in middle; LLM attention strongest at extremes") },
  { domain: "ai.rag.context_selection", title: "Designing context deduplication to remove redundant RAG evidence", concept: C("cosine threshold dedup; keep most relevant of similar chunks; reduces noise; improves answer precision") },
  { domain: "ai.rag.context_selection", title: "Implementing dynamic context selection based on query complexity", concept: C("simple query: fewer chunks; complex: more; classify by query type; adjust K dynamically; budget-constrained") },
  { domain: "ai.rag.context_selection", title: "Implementing citation tracking from RAG context to generated answers", concept: C("tag each chunk with source ID; instruct LLM to cite IDs; extract citations from output; verify citation relevance") },
  { domain: "ai.rag.context_selection", title: "Designing context validation before RAG generation", concept: C("check retrieved context addresses the query; low-relevance fallback; hallucination risk if context irrelevant") },
  { domain: "ai.rag.context_selection", title: "Implementing multi-turn context management for conversational RAG", concept: C("retrieve fresh context per turn; carry conversation history in prompt; manage combined token budget per turn") },
  { domain: "ai.rag.context_selection", title: "Implementing query-context relevance filtering before RAG generation", concept: C("score each retrieved chunk vs query; drop below threshold; prevents hallucination from irrelevant chunks") },
  { domain: "ai.rag.context_selection", title: "Designing fallback strategies when RAG retrieval is insufficient", concept: C("if max relevance < threshold: abstain, or use parametric knowledge with caveat, or request clarification") },
];

/** 6. RAG pipeline design (10) */
const RAG_PIPELINE: SeedSpec[] = [
  { domain: "ai.rag.pipeline", title: "Designing end-to-end RAG pipeline architectures", concept: C("ingest → chunk → embed → index → retrieve → rank → select → generate → validate → respond; async where possible") },
  { domain: "ai.rag.pipeline", title: "Implementing query transformation for improved RAG retrieval", concept: C("HyDE: generate hypothetical answer; embed answer for retrieval; step-back prompting; multi-query expansion") },
  { domain: "ai.rag.pipeline", title: "Implementing multi-query RAG to improve retrieval coverage", concept: C("LLM generates N query variants; retrieve for each; union results; dedup; re-rank combined set") },
  { domain: "ai.rag.pipeline", title: "Designing corrective RAG with retrieval quality feedback loops", concept: C("evaluate retrieval relevance; if low: web search fallback; re-retrieve with refined query; iterative improvement") },
  { domain: "ai.rag.pipeline", title: "Implementing self-RAG with selective retrieval decisions", concept: C("LLM decides when to retrieve; special tokens signal retrieve/no-retrieve; critique retrieved docs; select best") },
  { domain: "ai.rag.pipeline", title: "Designing modular RAG with swappable pipeline components", concept: C("abstract each stage: retriever, ranker, compressor, generator; swap implementations; A/B test components independently") },
  { domain: "ai.rag.pipeline", title: "Implementing streaming RAG for low-latency generation", concept: C("retrieve async while streaming preamble; inject context mid-stream; token streaming to client; SSE or WebSocket") },
  { domain: "ai.rag.pipeline", title: "Designing knowledge graph-augmented RAG retrieval pipelines", concept: C("entity link query → KG retrieval → structured facts + vector retrieval → combine for richer context") },
  { domain: "ai.rag.pipeline", title: "Implementing RAG with table and structured data retrieval", concept: C("detect tabular query; SQL or pandas retrieval; convert result to text; combine with vector retrieval") },
  { domain: "ai.rag.pipeline", title: "Designing document ingestion pipelines for RAG knowledge bases", concept: C("parse PDF/HTML/Markdown → clean → chunk → embed → upsert; idempotent by content hash; incremental update") },
];

/** 7. RAG evaluation (10) */
const RAG_EVAL: SeedSpec[] = [
  { domain: "ai.rag.evaluation", title: "Designing RAG evaluation frameworks for end-to-end quality", concept: C("RAGAS metrics: faithfulness, answer relevance, context recall, context precision; eval set with ground truth") },
  { domain: "ai.rag.evaluation", title: "Implementing faithfulness evaluation for RAG-generated answers", concept: C("decompose answer into claims; verify each claim against retrieved context; faithfulness = claims supported / total") },
  { domain: "ai.rag.evaluation", title: "Implementing answer relevance evaluation for RAG pipelines", concept: C("score answer relevance to question; LLM judge or embedding similarity; penalize non-answers and hallucinations") },
  { domain: "ai.rag.evaluation", title: "Implementing context recall evaluation in RAG retrieval stages", concept: C("ground truth relevant docs; recall = retrieved relevant / total relevant; optimize K and retrieval strategy") },
  { domain: "ai.rag.evaluation", title: "Designing hallucination detection for RAG-generated outputs", concept: C("claim extraction + evidence verification; NLI model; flag claims not supported by context; human review sample") },
  { domain: "ai.rag.evaluation", title: "Implementing automated RAG test set generation", concept: C("LLM generates question-answer pairs from documents; diverse question types; validate with human review sample") },
  { domain: "ai.rag.evaluation", title: "Designing RAG regression testing for pipeline changes", concept: C("eval set; run before and after change; assert no regression on primary metrics; alert on degradation > threshold") },
  { domain: "ai.rag.evaluation", title: "Implementing online RAG quality monitoring in production", concept: C("sample production queries; LLM judge faithfulness and relevance; track metrics over time; alert on drift") },
  { domain: "ai.rag.evaluation", title: "Designing human evaluation protocols for RAG answer quality", concept: C("rater rubric: correctness, completeness, faithfulness, fluency; blind to system version; inter-rater agreement check") },
  { domain: "ai.rag.evaluation", title: "Benchmarking RAG system performance on standard question answering datasets", concept: C("eval on: NaturalQuestions, TriviaQA, HotpotQA; EM and F1 metrics; compare to state-of-art baselines") },
];

/** 8. Agentic RAG (10) */
const AGENTIC_RAG: SeedSpec[] = [
  { domain: "ai.rag.agentic", title: "Designing agentic RAG systems with iterative retrieval and reasoning", concept: C("agent decides when to retrieve; issues sub-queries; aggregates evidence across retrievals; reason over combined context") },
  { domain: "ai.rag.agentic", title: "Implementing plan-then-retrieve RAG for multi-step question answering", concept: C("decompose complex question into sub-questions; retrieve for each; aggregate answers; synthesize final answer") },
  { domain: "ai.rag.agentic", title: "Designing tool-augmented RAG agents with multiple retrieval sources", concept: C("tools: vector search, SQL, API, calculator; agent selects tool per sub-question; combine results in context") },
  { domain: "ai.rag.agentic", title: "Implementing adaptive retrieval depth control in agentic RAG", concept: C("confidence threshold: if low → retrieve more; max retrieval budget; stop when confident or budget exhausted") },
  { domain: "ai.rag.agentic", title: "Designing memory-augmented RAG agents with episodic retrieval", concept: C("store past interactions in episodic memory; retrieve relevant past context per query; combine with document retrieval") },
  { domain: "ai.rag.agentic", title: "Implementing recursive summarization for long document RAG", concept: C("chunk → summarize each → index summaries; retrieve summaries; then drill into relevant full chunks") },
  { domain: "ai.rag.agentic", title: "Designing RAG agents with web search integration for freshness", concept: C("detect out-of-date knowledge; trigger web search; scrape and chunk results; combine with indexed knowledge") },
  { domain: "ai.rag.agentic", title: "Implementing RAG agent grounding verification before response", concept: C("extract claims from draft; verify each against retrieved context; revise unsupported claims; cite verified claims") },
  { domain: "ai.rag.agentic", title: "Designing multi-agent RAG architectures for specialized retrieval domains", concept: C("router agent assigns sub-questions to domain specialists; each specialist retrieves from domain index; aggregator synthesizes") },
  { domain: "ai.rag.agentic", title: "Implementing RAG agent observability and trace logging", concept: C("trace: query → retrieval → ranking → context → generation; log latency and scores per stage; debug with trace") },
];

export const RAG_SYSTEMS_SEED_SPECS: SeedSpec[] = [
  ...EMBEDDING_MODELS,
  ...VECTOR_SEARCH,
  ...CHUNKING,
  ...RETRIEVAL_RANKING,
  ...CONTEXT_SELECTION,
  ...RAG_PIPELINE,
  ...RAG_EVAL,
  ...AGENTIC_RAG,
];
