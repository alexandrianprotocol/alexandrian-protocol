# Pre-10k artifact generation checklist

Run a **1k test** before generating 10k artifacts. If the graph looks healthy, proceed to the full run.

---

## 1. Run 1k test

```bash
cd packages/generator
npm run build
node dist/index.js --mode all --count 1000 --target 1000
```

---

## 2. Check output stats

After the run, the CLI prints:

- **By depth:** L0, L1, L2, L3, L4 counts. Expect L0 ≈ 100 (seeds), then increasing L1→L4.
- **Top domains:** No single domain should dominate (healthy spread).
- **Derived; cross-domain %:** Aim for **≥ 30%** of derived artifacts having parents from two different domain roots. If cross-domain % is very low, expansion may be over-constrained or pool too narrow.
- **Avg parents:** Should be ~2–3 for derived.
- **Avg children/node:** Indicates connectivity; very low may mean a shallow or disconnected graph.

---

## 3. Sanity checks

| Check | What to do |
|-------|------------|
| **Depth distribution** | L0 ≈ 100, L1 in hundreds, L2/L3/L4 non-zero. If L2+ are empty, expansion may have hit max passes or target too low. |
| **Cross-domain %** | If &lt; 20%, consider relaxing domain matrix or adding more diverse seeds. |
| **Duplicate artifacts** | Spot-check staging: same title/claim in same domain should be rare (content fingerprint + title similarity guard). |
| **Graph connectivity** | Avg children/node &gt; 0; no single isolated cluster. Optional: load staging into a graph and check largest component size. |

---

## 4. If 1k looks healthy

Run the full 10k:

```bash
node dist/index.js --mode all --count 10000 --target 10000
```

---

## 5. Contract: batch publishing (optional improvement)

Right now, 10k KBs ⇒ 10k transactions. To reduce cost:

- Add **`publishKBBatch(contentHashes[], ...)`** (or similar) to the registry contract that loops over a batch and emits events (batch size 25–50 is a good tradeoff with gas limits).
- Publish script: load staging, sort by `getPublishOrder(records)`, then call the batch function in chunks instead of one tx per KB.

See **GAPS-AND-IMPLEMENTATION.md** §3.1 for gas/batching notes.

---

## 6. Bundle validation before publish

Use `staging/refined` as the source of truth and treat bundled output as disposable build output.

```bash
npm run bundle:local
node scripts/check-bundle-freshness.mjs --bundled-dir staging/bundled-local
```

- `bundle:local` writes full local bundle directories to `staging/bundles-local/` and an index to `staging/bundled-local/`.
- `check-bundle-freshness` recomputes the current `artifactHash` from `staging/refined` and compares it against a bundled index.
- For real publishable CIDs, set `PINATA_API_JWT` and run `npm run bundle`.
