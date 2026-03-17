/**
 * Data Mesh & Lakehouse Seeds (~70 seed procedures).
 * Data product design, data contracts, lakehouse formats, medallion architecture,
 * data catalog, schema registry, data quality SLAs, and federated governance.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Data product design (10) */
const DATA_PRODUCT: SeedSpec[] = [
  { domain: "datamesh.product.design", title: "Designing data products with clear ownership and SLAs", concept: C("data product = dataset + schema + SLA + owner + docs; treat as product with consumers; versioned releases") },
  { domain: "datamesh.product.interface", title: "Designing data product output port interfaces", concept: C("output ports: file, table, API, stream, events; document schema and freshness per port; consumer SLA") },
  { domain: "datamesh.product.discovery", title: "Implementing data product discovery in data mesh architectures", concept: C("register in data catalog with: domain, owner, schema, SLA, quality score; searchable; linked to lineage") },
  { domain: "datamesh.product.sla", title: "Defining and enforcing data product SLAs", concept: C("freshness SLA: updated within N hours; quality SLA: error rate < threshold; availability SLA; alert on breach") },
  { domain: "datamesh.product.versioning", title: "Implementing data product versioning and breaking change policies", concept: C("semver for schema; additive changes are backward compatible; breaking changes require new major version + migration") },
  { domain: "datamesh.product.access", title: "Designing data product access control and self-service provisioning", concept: C("consumer requests access; owner approves or auto-approve by classification; access expires; audit log") },
  { domain: "datamesh.product.observability", title: "Implementing data product observability and health monitoring", concept: C("monitor: freshness, row count, null rate, schema drift, consumer query count; SLA health dashboard") },
  { domain: "datamesh.product.cost", title: "Tracking and allocating costs for data product production and consumption", concept: C("compute cost per product; chargeback to consumer teams by query volume; cost efficiency metric per product") },
  { domain: "datamesh.product.lifecycle", title: "Managing data product lifecycle from creation to deprecation", concept: C("create → active → deprecated → retired; deprecation notice N months ahead; migration guide for consumers") },
  { domain: "datamesh.product.testing", title: "Designing data product quality testing procedures", concept: C("schema validation; row count sanity checks; statistical distribution checks; consumer acceptance tests") },
];

/** 2. Data contracts (8) */
const DATA_CONTRACTS: SeedSpec[] = [
  { domain: "datamesh.contract.definition", title: "Defining data contracts between producers and consumers", concept: C("contract: schema, SLA, semantics, quality expectations; signed by producer and consumer; versioned") },
  { domain: "datamesh.contract.schema", title: "Implementing schema enforcement in data contracts", concept: C("schema in registry; producer validates before publish; consumer validates on read; alert on violation") },
  { domain: "datamesh.contract.testing", title: "Implementing data contract testing in CI pipelines", concept: C("consumer-driven contract tests; producer runs consumer tests in CI; fail if contract broken") },
  { domain: "datamesh.contract.evolution", title: "Designing data contract evolution and backward compatibility rules", concept: C("additive: new optional field allowed; breaking: requires new contract version + consumer migration; grace period") },
  { domain: "datamesh.contract.monitoring", title: "Monitoring data contract violations in production", concept: C("validate producer output against contract on each write; alert on violation; track violation rate per contract") },
  { domain: "datamesh.contract.negotiation", title: "Designing data contract negotiation workflows", concept: C("consumer proposes requirements; producer reviews feasibility; agree on schema + SLA; formalize in contract") },
  { domain: "datamesh.contract.registry", title: "Implementing a data contract registry for organizational governance", concept: C("central registry: contracts by domain; version history; consumer list; compliance status; expiry tracking") },
  { domain: "datamesh.contract.semantic", title: "Encoding semantic meaning in data contracts", concept: C("field descriptions; units; enums with definitions; business glossary link; null meaning defined") },
];

/** 3. Lakehouse table formats (8) */
const LAKEHOUSE_FORMATS: SeedSpec[] = [
  { domain: "lakehouse.delta.design", title: "Designing Delta Lake table architectures for analytics", concept: C("Delta log for ACID; Z-order for multi-dim filtering; optimize and vacuum schedule; partition by date") },
  { domain: "lakehouse.iceberg.design", title: "Designing Apache Iceberg table architectures", concept: C("hidden partitioning; time travel via snapshots; partition evolution without rewrite; catalog integration") },
  { domain: "lakehouse.format.selection", title: "Selecting lakehouse table format for workload requirements", concept: C("Delta: Spark + Databricks; Iceberg: multi-engine, catalog flexibility; Hudi: upsert-heavy workloads") },
  { domain: "lakehouse.compaction", title: "Implementing table compaction and optimization procedures", concept: C("small file problem; compact to target file size 128–256MB; schedule during off-peak; Z-order on hot columns") },
  { domain: "lakehouse.time_travel", title: "Implementing time travel queries in lakehouse table formats", concept: C("query snapshot by timestamp or version; retention policy for snapshots; point-in-time recovery; audit queries") },
  { domain: "lakehouse.schema_evolution", title: "Implementing schema evolution in lakehouse table formats", concept: C("add nullable column: safe; rename column: add alias; drop column: mark deprecated first; test consumer queries") },
  { domain: "lakehouse.partitioning", title: "Designing partitioning strategies for lakehouse tables", concept: C("partition by date for time-series; cardinality: 100–10k partitions ideal; avoid over-partitioning; hidden partitioning") },
  { domain: "lakehouse.caching", title: "Implementing query result and metadata caching for lakehouse", concept: C("cache table metadata in memory; cache frequent query results; invalidate on table write; Alluxio for data caching") },
];

/** 4. Medallion architecture (8) */
const MEDALLION: SeedSpec[] = [
  { domain: "lakehouse.medallion.bronze", title: "Designing bronze layer ingestion in medallion architectures", concept: C("raw data as-is; append-only; schema-on-read; retain source format; track ingestion timestamp and source") },
  { domain: "lakehouse.medallion.silver", title: "Designing silver layer transformation in medallion architectures", concept: C("clean, deduplicate, standardize; schema-on-write; apply business rules; DQ checks; track lineage from bronze") },
  { domain: "lakehouse.medallion.gold", title: "Designing gold layer aggregation in medallion architectures", concept: C("domain-specific aggregates; optimized for BI tools; updated on schedule; documented for business consumers") },
  { domain: "lakehouse.medallion.pipeline", title: "Orchestrating medallion architecture ETL pipelines", concept: C("bronze first; silver depends on bronze; gold depends on silver; SLA per layer; restart from failed layer") },
  { domain: "lakehouse.medallion.quality", title: "Implementing data quality gates between medallion layers", concept: C("DQ checks at each layer transition; row count, null rate, referential integrity; block promotion on failure") },
  { domain: "lakehouse.medallion.lineage", title: "Tracking data lineage across medallion architecture layers", concept: C("column-level lineage from source to gold; record transformation per layer; visualize in catalog") },
  { domain: "lakehouse.medallion.incremental", title: "Implementing incremental processing in medallion pipeline layers", concept: C("watermark-based incremental reads; process only new or changed records; idempotent transforms; merge into silver") },
  { domain: "lakehouse.medallion.sla", title: "Defining SLAs for each medallion layer freshness", concept: C("bronze: 15min lag; silver: 30min; gold: 1hr; monitor per layer; alert on SLA breach; consumer notified") },
];

/** 5. Data catalog & discovery (8) */
const DATA_CATALOG: SeedSpec[] = [
  { domain: "datamesh.catalog.design", title: "Designing enterprise data catalog architectures", concept: C("catalog: datasets, schemas, ownership, lineage, quality, usage stats; auto-populate from pipelines; search + browse") },
  { domain: "datamesh.catalog.metadata", title: "Designing metadata models for data catalog systems", concept: C("technical: schema, format, location; business: description, owner, sensitivity; operational: freshness, row count") },
  { domain: "datamesh.catalog.lineage", title: "Implementing automated data lineage capture in catalogs", concept: C("parse SQL for table references; capture at execution time; column-level lineage from transformation code") },
  { domain: "datamesh.catalog.search", title: "Implementing search and discovery in data catalog systems", concept: C("full-text search over metadata; filter by domain, owner, sensitivity; semantic search by description embedding") },
  { domain: "datamesh.catalog.tagging", title: "Implementing data classification tagging systems in catalogs", concept: C("sensitivity tags: public, internal, confidential, PII; auto-classify PII columns; propagate tags to downstream") },
  { domain: "datamesh.catalog.quality_scores", title: "Computing and displaying data quality scores in catalogs", concept: C("quality = weighted avg of: completeness, uniqueness, timeliness, accuracy; display per dataset; trend over time") },
  { domain: "datamesh.catalog.usage", title: "Tracking dataset usage and consumer analytics in catalogs", concept: C("query log → extract table references → aggregate per dataset; popular datasets; consumer list; usage trend") },
  { domain: "datamesh.catalog.governance", title: "Implementing data governance workflows in catalog systems", concept: C("data steward approval for sensitive access; policy enforcement; compliance report; GDPR right-to-erasure tracking") },
];

/** 6. Schema registry (8) */
const SCHEMA_REGISTRY: SeedSpec[] = [
  { domain: "datamesh.registry.design", title: "Designing schema registry architectures for event-driven systems", concept: C("central schema store; producer registers schema; consumer fetches by ID; validate on produce and consume") },
  { domain: "datamesh.registry.compatibility", title: "Implementing schema compatibility checking in schema registries", concept: C("backward: new schema reads old data; forward: old schema reads new data; full: both; configure per subject") },
  { domain: "datamesh.registry.avro", title: "Designing Avro schema evolution strategies for Kafka topics", concept: C("add fields with defaults; remove fields by marking optional first; never rename or reorder; use unions for nulls") },
  { domain: "datamesh.registry.protobuf", title: "Designing Protobuf schema evolution strategies", concept: C("never reuse field numbers; add new fields; deprecate old with comment; required → optional migration path") },
  { domain: "datamesh.registry.versioning", title: "Implementing schema versioning policies in schema registries", concept: C("auto-increment version on change; version locked per Kafka partition; consumer pinned to version range") },
  { domain: "datamesh.registry.ci", title: "Integrating schema registry validation into CI pipelines", concept: C("check compatibility in CI before merge; block if incompatible; test consumer deserialization with new schema") },
  { domain: "datamesh.registry.migration", title: "Designing schema migration procedures for breaking changes", concept: C("dual-write old and new schema; consumer migrates; stop writing old schema; deprecate old version") },
  { domain: "datamesh.registry.multiformat", title: "Managing multiple schema formats in a unified registry", concept: C("support Avro, Protobuf, JSON Schema; unified subject naming; format declared per subject; consistent compatibility API") },
];

export const DATA_MESH_LAKEHOUSE_SEED_SPECS: SeedSpec[] = [
  ...DATA_PRODUCT,
  ...DATA_CONTRACTS,
  ...LAKEHOUSE_FORMATS,
  ...MEDALLION,
  ...DATA_CATALOG,
  ...SCHEMA_REGISTRY,
];
