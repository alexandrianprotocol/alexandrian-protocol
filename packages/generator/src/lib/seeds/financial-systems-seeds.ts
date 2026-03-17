/**
 * Financial Systems Seeds (~70 seed procedures).
 * Double-entry ledgers, payment pipelines, reconciliation, fraud detection,
 * billing, currency arithmetic, compliance reporting, and chargeback handling.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Ledger & accounting design (10) */
const LEDGER: SeedSpec[] = [
  { domain: "finance.ledger.double_entry", title: "Designing double-entry ledger systems", concept: C("every transaction: debit one account, credit another; debits = credits always; never delete entries") },
  { domain: "finance.ledger.accounts", title: "Designing chart of accounts for financial systems", concept: C("account types: asset, liability, equity, revenue, expense; code hierarchy; natural balance per type") },
  { domain: "finance.ledger.immutability", title: "Implementing immutable ledger entry patterns", concept: C("append-only entries; corrections via reversing entry + new entry; no UPDATE or DELETE on posted entries") },
  { domain: "finance.ledger.balance", title: "Designing efficient ledger balance computation", concept: C("materialized running balance per account; or sum(debits) - sum(credits); index by account + created_at") },
  { domain: "finance.ledger.journal", title: "Designing journal entry workflows with approval gates", concept: C("draft → review → posted; post atomically; revert posts via reversal entry; audit trail per step") },
  { domain: "finance.ledger.period_close", title: "Designing accounting period close procedures", concept: C("lock period after close date; run trial balance; carry retained earnings; open next period") },
  { domain: "finance.ledger.multi_currency", title: "Implementing multi-currency ledger accounting", concept: C("store amount in transaction currency + functional currency; revalue FX periodically; FX gain/loss account") },
  { domain: "finance.ledger.reconciliation_balance", title: "Reconciling ledger balances with external statements", concept: C("match entries to statement items by amount + date; flag unmatched; surface to reviewer") },
  { domain: "finance.ledger.audit_trail", title: "Designing ledger audit trail systems", concept: C("log: entry ID, account, amount, currency, creator, timestamp, memo; query by account and time range") },
  { domain: "finance.ledger.reporting", title: "Generating financial reports from ledger data", concept: C("P&L: revenue - expense by period; balance sheet: assets = liabilities + equity; cash flow indirect method") },
];

/** 2. Payment pipeline (10) */
const PAYMENTS: SeedSpec[] = [
  { domain: "finance.payment.idempotency", title: "Implementing idempotent payment processing", concept: C("idempotency key per request; store result keyed by idempotency key; return stored result on duplicate") },
  { domain: "finance.payment.state_machine", title: "Designing payment state machine architectures", concept: C("states: pending → processing → settled | failed | refunded; persist each transition; event on each change") },
  { domain: "finance.payment.gateway", title: "Designing payment gateway integration patterns", concept: C("abstract gateway interface; webhook handler per provider; retry on transient error; idempotency key per call") },
  { domain: "finance.payment.retry", title: "Implementing payment retry strategies with backoff", concept: C("exponential backoff; max retries by error type; do not retry card declined; retry on network error") },
  { domain: "finance.payment.webhook", title: "Designing robust payment webhook processing", concept: C("verify signature; ack 200 immediately; process async; idempotent handler; retry failed processing") },
  { domain: "finance.payment.capture", title: "Implementing auth-and-capture payment flows", concept: C("authorize: reserve funds; capture: charge within capture window; void unused auth; partial capture allowed") },
  { domain: "finance.payment.routing", title: "Designing payment processor routing and fallback", concept: C("primary processor; fallback on failure or outage; routing by currency or amount; log processor used") },
  { domain: "finance.payment.reconciliation", title: "Reconciling payment processor records with internal ledger", concept: C("daily settlement file from processor; match by txn ID; flag missing or mismatched; report exceptions") },
  { domain: "finance.payment.pci", title: "Designing PCI-compliant payment data handling", concept: C("never store raw card data; tokenize via vault; scope cardholder data environment; log access") },
  { domain: "finance.payment.split", title: "Implementing split payment and marketplace disbursement", concept: C("collect total; split by share or fee rules; transfer to sub-accounts; settle on schedule; reconcile") },
];

/** 3. Reconciliation (8) */
const RECONCILIATION: SeedSpec[] = [
  { domain: "finance.reconciliation.process", title: "Designing automated financial reconciliation pipelines", concept: C("load internal records and external source; match by key fields; categorize: matched, unmatched, exception") },
  { domain: "finance.reconciliation.matching", title: "Implementing fuzzy matching for reconciliation edge cases", concept: C("exact match by txn ID first; fuzzy match by amount + date window for legacy; flag multiple candidates") },
  { domain: "finance.reconciliation.exception", title: "Designing reconciliation exception workflows", concept: C("route unmatched to exception queue; assign to reviewer; resolve by matching, adjusting, or write-off") },
  { domain: "finance.reconciliation.tolerance", title: "Implementing reconciliation tolerance and rounding rules", concept: C("tolerance threshold in cents; auto-match within tolerance; log tolerance used; escalate large gaps") },
  { domain: "finance.reconciliation.schedule", title: "Designing reconciliation run schedules and cutoff times", concept: C("intraday for critical flows; daily at statement cutoff; monthly for balance sheet; alert on failure") },
  { domain: "finance.reconciliation.audit", title: "Auditing reconciliation results for completeness", concept: C("count and sum both sides; assert totals match; log match rate; alert if < threshold") },
  { domain: "finance.reconciliation.nostro", title: "Designing nostro account reconciliation for bank accounts", concept: C("match internal cash ledger to bank statement; SWIFT MT940 parsing; exception aging report") },
  { domain: "finance.reconciliation.intercompany", title: "Implementing intercompany reconciliation workflows", concept: C("each entity records intercompany transactions; match by trade reference; eliminate on consolidation") },
];

/** 4. Fraud detection (8) */
const FRAUD: SeedSpec[] = [
  { domain: "finance.fraud.rules", title: "Designing rule-based fraud detection systems", concept: C("ordered rule list; each rule: condition → action (block, flag, review); configure thresholds per rule") },
  { domain: "finance.fraud.velocity", title: "Implementing velocity check fraud patterns", concept: C("count transactions per user/IP/card per time window; block if > threshold; sliding window in Redis") },
  { domain: "finance.fraud.scoring", title: "Designing ML-based fraud scoring pipelines", concept: C("feature vector per transaction; score with model; route to manual review if score in grey zone") },
  { domain: "finance.fraud.device", title: "Implementing device fingerprinting for fraud detection", concept: C("collect browser/device signals; hash to fingerprint; track fingerprint risk score over time") },
  { domain: "finance.fraud.alert", title: "Designing fraud alert and case management workflows", concept: C("alert on high-score transaction; create case; analyst reviews evidence; decision: approve/decline/escalate") },
  { domain: "finance.fraud.chargeback", title: "Implementing chargeback dispute handling workflows", concept: C("receive chargeback; gather evidence; submit rebuttal within window; track win/loss rate per reason code") },
  { domain: "finance.fraud.network", title: "Designing fraud network graph analysis", concept: C("link accounts by shared attributes; detect clusters; high-risk cluster triggers enhanced review") },
  { domain: "finance.fraud.feedback", title: "Implementing fraud model feedback loops from outcomes", concept: C("label confirmed fraud and legit; retrain model on labeled set; A/B test new model vs production") },
];

/** 5. Billing & subscription (8) */
const BILLING: SeedSpec[] = [
  { domain: "finance.billing.subscription", title: "Designing subscription billing lifecycle state machines", concept: C("states: trialing → active → past_due → canceled; invoice on period end; retry on failure; dunning") },
  { domain: "finance.billing.proration", title: "Implementing proration calculations for plan changes", concept: C("unused days credit + new plan charge for remaining days; calculate at second granularity") },
  { domain: "finance.billing.dunning", title: "Designing dunning retry and escalation procedures", concept: C("retry D+1, D+3, D+7, D+14; smart retry by card failure reason; notify user; suspend on final failure") },
  { domain: "finance.billing.usage", title: "Implementing usage-based billing metering pipelines", concept: C("collect usage events; aggregate per billing period; rate per unit; finalize invoice at period end") },
  { domain: "finance.billing.invoice", title: "Designing invoice generation and line item composition", concept: C("invoice = header + line items; line item: description, qty, unit price, subtotal; tax per jurisdiction") },
  { domain: "finance.billing.tax", title: "Implementing tax calculation integration for SaaS billing", concept: C("pass address + line items to tax API (Avalara, TaxJar); record tax amount; remit per jurisdiction") },
  { domain: "finance.billing.credits", title: "Designing customer credit and coupon application systems", concept: C("credit balance reduces invoice total; apply credits before charging; expire unused credits with warning") },
  { domain: "finance.billing.revenue_recognition", title: "Designing revenue recognition procedures for SaaS", concept: C("recognize ratably over subscription period; deferred revenue on prepay; ASC 606 compliance") },
];

/** 6. Currency arithmetic (8) */
const CURRENCY: SeedSpec[] = [
  { domain: "finance.currency.arithmetic", title: "Implementing safe currency arithmetic without floating point", concept: C("store amounts as integer minor units (cents); add/subtract as integers; divide last to minimize error") },
  { domain: "finance.currency.rounding", title: "Designing rounding rules for currency calculations", concept: C("banker's rounding for splits; half-up for display; document rounding rule per operation; test edge cases") },
  { domain: "finance.currency.fx_rates", title: "Integrating FX rate providers for multi-currency systems", concept: C("poll rates from provider; cache with TTL; fallback to last known; timestamp each rate used") },
  { domain: "finance.currency.conversion", title: "Implementing currency conversion with audit trail", concept: C("record source amount + currency + rate + target amount; rate snapshot immutable once transaction posted") },
  { domain: "finance.currency.precision", title: "Handling currency precision differences across currencies", concept: C("CLDR decimal places per currency; JPY: 0; USD: 2; KWD: 3; validate input against currency precision") },
  { domain: "finance.currency.display", title: "Formatting currency amounts for localized display", concept: C("Intl.NumberFormat(locale, {style:currency, currency}); never format for storage; use locale of user") },
  { domain: "finance.currency.settlement", title: "Designing multi-currency settlement and netting", concept: C("net positions per currency pair; settle net amounts; minimize number of transfers") },
  { domain: "finance.currency.revaluation", title: "Implementing periodic FX revaluation of balance sheet", concept: C("revalue FX-denominated balances at period-end rate; post FX gain/loss to P&L; reverse at next period") },
];

/** 7. Compliance & reporting (8) */
const COMPLIANCE: SeedSpec[] = [
  { domain: "finance.compliance.audit_log", title: "Designing tamper-evident audit logging for financial systems", concept: C("append-only log; hash chain or signed entries; immutable storage; query by entity + time range") },
  { domain: "finance.compliance.retention", title: "Implementing financial data retention policies", concept: C("7-year minimum for financial records; archive to cold storage after 2 years; deletion controls") },
  { domain: "finance.compliance.kyc", title: "Designing KYC verification pipeline workflows", concept: C("collect identity docs; submit to verification provider; store result + expiry; block on failure") },
  { domain: "finance.compliance.aml", title: "Implementing AML transaction monitoring procedures", concept: C("screen transactions against watchlists; velocity rules; SAR filing workflow; record retention") },
  { domain: "finance.compliance.pii_handling", title: "Designing PII data handling in financial systems", concept: C("minimize collection; encrypt at rest; access control; right-to-erasure procedure; audit access log") },
  { domain: "finance.compliance.reporting", title: "Designing regulatory reporting pipelines", concept: C("scheduled extraction; format per regulation; validate against schema; submit via API or SFTP; ack receipt") },
  { domain: "finance.compliance.access_control", title: "Implementing role-based access control for financial data", concept: C("roles: teller, manager, auditor, admin; least privilege; log all access; quarterly access review") },
  { domain: "finance.compliance.sox", title: "Designing SOX-compliant financial system controls", concept: C("segregation of duties; dual approval for sensitive ops; evidence collection per control; auditor access") },
];

export const FINANCIAL_SYSTEMS_SEED_SPECS: SeedSpec[] = [
  ...LEDGER,
  ...PAYMENTS,
  ...RECONCILIATION,
  ...FRAUD,
  ...BILLING,
  ...CURRENCY,
  ...COMPLIANCE,
];
