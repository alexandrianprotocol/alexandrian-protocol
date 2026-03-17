/**
 * Knowledge Graph & Semantic Systems Seeds (~80 seed procedures).
 * Ontology design, RDF/OWL modeling, SPARQL, entity resolution,
 * graph embeddings, knowledge extraction, graph construction, and reasoning.
 * Directly relevant to Alexandrian Protocol KB graph architecture.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Ontology design (10) */
const ONTOLOGY: SeedSpec[] = [
  { domain: "kg.ontology.design", title: "Designing domain ontologies for knowledge graph systems", concept: C("identify classes, properties, and relationships; define hierarchy; minimize redundancy; align to upper ontology") },
  { domain: "kg.ontology.class_hierarchy", title: "Designing class hierarchies for knowledge graph ontologies", concept: C("superclass → subclass via rdfs:subClassOf; inherit properties; avoid deep hierarchies > 5 levels; test reasoning") },
  { domain: "kg.ontology.properties", title: "Designing object and datatype properties in OWL ontologies", concept: C("object property: links instances; datatype property: links to literal; define domain, range, cardinality constraints") },
  { domain: "kg.ontology.axioms", title: "Defining OWL axioms for knowledge graph constraint enforcement", concept: C("disjointness, equivalence, restrictions; inverse properties; transitivity; use reasoner to validate consistency") },
  { domain: "kg.ontology.modularization", title: "Modularizing large ontologies into composable modules", concept: C("split by domain; owl:imports for reuse; stable core; volatile extensions; versioned per module") },
  { domain: "kg.ontology.alignment", title: "Aligning heterogeneous ontologies for knowledge integration", concept: C("map equivalent classes and properties; owl:equivalentClass; skos:closeMatch; automated + manual review") },
  { domain: "kg.ontology.versioning", title: "Implementing ontology versioning strategies", concept: C("owl:versionInfo; owl:priorVersion; backward compatibility; migration path for breaking changes; changelog") },
  { domain: "kg.ontology.documentation", title: "Documenting ontologies with rdfs:comment and skos:definition", concept: C("every class and property has rdfs:label + rdfs:comment + skos:example; human-readable and machine-readable") },
  { domain: "kg.ontology.reuse", title: "Reusing established upper ontologies and vocabularies", concept: C("prefer: schema.org, FOAF, PROV-O, Dublin Core; extend rather than reinvent; document alignment decisions") },
  { domain: "kg.ontology.evaluation", title: "Evaluating ontology quality and fitness for purpose", concept: C("coverage: does it express domain concepts; consistency: reasoner finds no contradictions; usability: developer review") },
];

/** 2. RDF and linked data (8) */
const RDF: SeedSpec[] = [
  { domain: "kg.rdf.modeling", title: "Modeling domain knowledge as RDF triples", concept: C("subject predicate object; IRI for subject and predicate; IRI or literal for object; blank nodes sparingly") },
  { domain: "kg.rdf.serialization", title: "Selecting RDF serialization formats for knowledge graph systems", concept: C("Turtle for human authoring; JSON-LD for web APIs; N-Triples for streaming; Parquet for analytics; RDF/XML legacy") },
  { domain: "kg.rdf.jsonld", title: "Designing JSON-LD contexts for linked data publication", concept: C("@context maps terms to IRIs; @type for class; @id for IRI field; compact IRIs via prefix; frame for projection") },
  { domain: "kg.rdf.named_graphs", title: "Using named graphs for provenance and context in RDF datasets", concept: C("quad: subject predicate object graph; named graph = context; record source, timestamp, confidence per graph") },
  { domain: "kg.rdf.canonicalization", title: "Implementing RDF dataset canonicalization for signing and hashing", concept: C("RDNA algorithm; normalize blank node IDs; deterministic serialization; hash canonical form; verify signature") },
  { domain: "kg.rdf.validation", title: "Validating RDF graphs with SHACL shape constraints", concept: C("NodeShape per class; PropertyShape per constraint; sh:minCount, sh:maxCount, sh:datatype; validate on ingest") },
  { domain: "kg.rdf.inference", title: "Implementing RDFS and OWL inference over knowledge graphs", concept: C("forward chaining: apply rules to derive new triples; RDFS: subclass, subproperty, domain, range; OWL: RL profile") },
  { domain: "kg.rdf.provenance", title: "Tracking provenance of RDF triples with PROV-O", concept: C("prov:Entity, prov:Activity, prov:Agent; wasGeneratedBy, wasAttributedTo, wasDerivedFrom; per named graph") },
];

/** 3. SPARQL query design (8) */
const SPARQL: SeedSpec[] = [
  { domain: "kg.sparql.basic", title: "Designing SPARQL SELECT queries for knowledge graph retrieval", concept: C("triple patterns; FILTER; OPTIONAL; UNION; LIMIT OFFSET for pagination; PREFIX declarations at top") },
  { domain: "kg.sparql.federation", title: "Implementing SPARQL federation across distributed endpoints", concept: C("SERVICE clause for remote endpoint; federated joins; minimize data transferred; timeout per service") },
  { domain: "kg.sparql.construct", title: "Using SPARQL CONSTRUCT to transform knowledge graph subgraphs", concept: C("CONSTRUCT {template} WHERE {pattern}; transform into new RDF; use for ETL and graph API responses") },
  { domain: "kg.sparql.update", title: "Designing SPARQL UPDATE operations for knowledge graph mutations", concept: C("INSERT DATA; DELETE DATA; INSERT WHERE; DELETE WHERE; transaction semantics; named graph targeting") },
  { domain: "kg.sparql.optimization", title: "Optimizing SPARQL query performance for large knowledge graphs", concept: C("selective triple patterns first; avoid optional where possible; use FILTER after pattern matching; index on frequent predicates") },
  { domain: "kg.sparql.path", title: "Using SPARQL property paths for transitive graph traversal", concept: C("/ for sequence; | for alternative; * zero or more; + one or more; ? optional; ^ inverse; use for hierarchy") },
  { domain: "kg.sparql.aggregation", title: "Implementing SPARQL aggregation queries for analytics", concept: C("GROUP BY; COUNT; SUM; AVG; MIN; MAX; HAVING for group filter; combine with property paths") },
  { domain: "kg.sparql.named_graph", title: "Querying named graphs in SPARQL for provenance-aware retrieval", concept: C("GRAPH ?g {pattern}; FROM NAMED for specific graphs; GRAPH ?g to bind graph IRI; filter by graph metadata") },
];

/** 4. Entity resolution (8) */
const ENTITY_RESOLUTION: SeedSpec[] = [
  { domain: "kg.entity.resolution", title: "Designing entity resolution pipelines for knowledge graph construction", concept: C("block by candidate key; compare by similarity; link if score > threshold; review borderline; sameAs assertion") },
  { domain: "kg.entity.blocking", title: "Implementing blocking strategies for scalable entity resolution", concept: C("reduce comparison space; block by: name prefix, soundex, geohash; LSH for high-dim features; sorted neighborhood") },
  { domain: "kg.entity.similarity", title: "Designing entity similarity scoring for record linkage", concept: C("field weights; Jaro-Winkler for names; exact for IDs; embedding cosine for text; weighted sum; threshold tuning") },
  { domain: "kg.entity.disambiguation", title: "Implementing entity disambiguation in knowledge graph systems", concept: C("candidate set from search; rank by context similarity; prior probability by entity frequency; return top-1 or abstain") },
  { domain: "kg.entity.coreference", title: "Resolving coreference chains in knowledge graph extraction", concept: C("within-doc: pronouns, aliases; cross-doc: same entity different mentions; cluster by mention embedding similarity") },
  { domain: "kg.entity.deduplication", title: "Detecting and merging duplicate entities in knowledge graphs", concept: C("find owl:sameAs candidates; merge: union properties, prefer authoritative source; keep both IRIs; log merge") },
  { domain: "kg.entity.identity", title: "Designing entity identity management for knowledge graph evolution", concept: C("stable IRI per entity; aliases list; redirect deprecated IRIs; version entity state; provenance per assertion") },
  { domain: "kg.entity.evaluation", title: "Evaluating entity resolution quality with precision and recall", concept: C("gold standard pairs; precision = correct links / total links; recall = correct links / total true links; F1") },
];

/** 5. Knowledge graph embeddings (8) */
const EMBEDDINGS: SeedSpec[] = [
  { domain: "kg.embedding.transE", title: "Implementing TransE knowledge graph embedding models", concept: C("relation as translation in embedding space; h + r ≈ t; train with margin loss; use for link prediction") },
  { domain: "kg.embedding.link_prediction", title: "Designing link prediction pipelines using knowledge graph embeddings", concept: C("embed entities and relations; score (h, r, ?) by model; rank candidates; threshold for assertion; evaluate MRR") },
  { domain: "kg.embedding.entity", title: "Generating entity embeddings from knowledge graph structure", concept: C("combine: graph structure (TransE/RotatE) + text (BERT) + type info; fuse by concatenation or attention") },
  { domain: "kg.embedding.relation", title: "Learning relation embeddings for semantic similarity in knowledge graphs", concept: C("relation embedding captures semantic role; similar relations cluster; use for relation classification and alignment") },
  { domain: "kg.embedding.training", title: "Training knowledge graph embedding models at scale", concept: C("negative sampling: corrupt h or t; batch size tuning; learning rate schedule; early stop by MRR on valid set") },
  { domain: "kg.embedding.evaluation", title: "Evaluating knowledge graph embedding quality with standard benchmarks", concept: C("FB15K-237, WN18RR, YAGO3-10; metrics: MRR, Hits@1, Hits@10; filtered setting to exclude known true triples") },
  { domain: "kg.embedding.downstream", title: "Using knowledge graph embeddings for downstream tasks", concept: C("entity classification: embed → classify; relation extraction: embed pair → predict relation; QA: retrieve by embed") },
  { domain: "kg.embedding.freshness", title: "Updating knowledge graph embeddings for new entities and relations", concept: C("inductive: text encoder for unseen entities; retrain periodically; fine-tune on new facts; monitor MRR drift") },
];

/** 6. Knowledge extraction (8) */
const EXTRACTION: SeedSpec[] = [
  { domain: "kg.extraction.ner", title: "Implementing named entity recognition for knowledge graph construction", concept: C("span detection + entity type; fine-tune on domain corpus; output: entity spans with type and confidence") },
  { domain: "kg.extraction.relation", title: "Implementing relation extraction pipelines for knowledge graph population", concept: C("entity pair + sentence → relation label; BERT entity markers; per-relation threshold; distant supervision for training") },
  { domain: "kg.extraction.event", title: "Implementing event extraction for temporal knowledge graph population", concept: C("trigger detection + argument roles; event type taxonomy; ACE schema; output: event, time, participants, location") },
  { domain: "kg.extraction.coreference", title: "Integrating coreference resolution into knowledge extraction pipelines", concept: C("resolve before extraction; link pronouns to entities; cross-sentence chains; improves relation extraction quality") },
  { domain: "kg.extraction.document", title: "Designing document-level knowledge extraction pipelines", concept: C("chunk → extract per chunk → merge across chunks → deduplicate → assert to graph; track source document") },
  { domain: "kg.extraction.llm", title: "Using LLMs for structured knowledge extraction from text", concept: C("prompt: extract entities and relations as JSON; few-shot examples; validate against schema; hallucination detection") },
  { domain: "kg.extraction.quality", title: "Validating extracted knowledge before knowledge graph ingestion", concept: C("schema validation; confidence threshold filter; human review sample; precision/recall against gold; reject below threshold") },
  { domain: "kg.extraction.incremental", title: "Designing incremental knowledge extraction from document streams", concept: C("process new documents only; extract delta; merge into graph; update affected entity embeddings; replay on schema change") },
];

/** 7. Graph traversal and reasoning (8) */
const REASONING: SeedSpec[] = [
  { domain: "kg.reasoning.path", title: "Designing knowledge graph path reasoning for multi-hop queries", concept: C("beam search over relation paths; score by path plausibility; compose relation embeddings; return top-k paths") },
  { domain: "kg.reasoning.rule", title: "Implementing rule-based reasoning over knowledge graphs", concept: C("Horn rules: body → head; mine rules from graph (AMIE); apply forward chaining; confidence threshold per rule") },
  { domain: "kg.reasoning.subgraph", title: "Extracting and reasoning over knowledge graph subgraphs", concept: C("seed from entity; expand N hops; prune by relevance; reason within subgraph; scalable vs full-graph reasoning") },
  { domain: "kg.reasoning.inconsistency", title: "Detecting and resolving knowledge graph inconsistencies", concept: C("OWL reasoner for logical contradictions; confidence-based retraction; provenance tracking to identify source") },
  { domain: "kg.reasoning.temporal", title: "Implementing temporal reasoning over time-stamped knowledge graphs", concept: C("valid time intervals per fact; query at time T; temporal link prediction; detect contradictory temporal facts") },
  { domain: "kg.reasoning.qa", title: "Designing knowledge graph question answering pipelines", concept: C("parse question → entity linking → SPARQL or embedding retrieval → answer extraction → confidence score") },
  { domain: "kg.reasoning.graph_neural", title: "Applying graph neural networks for knowledge graph reasoning", concept: C("R-GCN for entity classification; CompGCN for relation-aware; message passing over graph; train on link prediction") },
  { domain: "kg.reasoning.explanation", title: "Generating explanations for knowledge graph reasoning outputs", concept: C("return supporting evidence triples; path from query entity to answer; provenance of each triple; confidence breakdown") },
];

export const KNOWLEDGE_GRAPH_SEMANTIC_SEED_SPECS: SeedSpec[] = [
  ...ONTOLOGY,
  ...RDF,
  ...SPARQL,
  ...ENTITY_RESOLUTION,
  ...EMBEDDINGS,
  ...EXTRACTION,
  ...REASONING,
];
