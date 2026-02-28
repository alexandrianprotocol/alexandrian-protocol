# Root seed

The root KB is a **production-grade genesis node**: minimal, stable, machine-first. It anchors identity and economics only.

## Hash model (PROTOCOL-SPEC §2)

- **contentHash / kbId** = `keccak256(JCS(envelope_with_sources_sorted))`
- **artifactHash** = `keccak256(JCS(artifact))`

No SHA-256 or Blake3 for these; optional CID multihash is separate.

## Files

| File | Purpose |
|------|--------|
| **artifact.json** | Standalone artifact: type, name, description, protocolVersion, canonicalization, kbIdDerivation, artifactHashDerivation, economicValidity, notes. Declares consensus-critical derivations; intentionally minimal and stable. |
| **envelope.json** | Envelope with `sources: []`, `artifactHash` (points to artifact), minimal `payload` (e.g. artifactURI). Always include `sources: []` so kbId derivation canonicalizes the full envelope. |

## Compute hashes

From repo root:

```bash
node scripts/compute-hashes.mjs seeds/root/envelope.json seeds/root/artifact.json
```

Prints `artifactHash` and `contentHash`. To update the envelope file with the computed `artifactHash`:

```bash
node scripts/compute-hashes.mjs seeds/root/envelope.json seeds/root/artifact.json --write
```

Then paste or keep the printed `artifactHash` in `envelope.json`; from that moment the root kbId is frozen and reproducible.

## Housekeeping KBs vs root

The **root KB** should only anchor name/version/derivation (genesis). Do not overload it.

**Housekeeping KBs** (domain taxonomy, authoring, spec index, etc.) live elsewhere, e.g.:

- `seeds/meta.alexandria/domain-taxonomy/*`
- `seeds/meta.alexandria/kb-authoring/*`
- `seeds/meta.alexandria/spec-index/*`

They are not parents of everything; this avoids a single “god KB.”

## Off-chain stamp

Stamping is safe as: `stamp = sign({ kbId, artifactHash, protocolVersion, checks… })`. **The stamp must NOT affect kbId.** Off-chain stamps are fine for now; on-chain attestation can be added later.

## Envelope schema (spec alignment)

For mainnet publish and subgraph indexing, the envelope must match PROTOCOL-SPEC §2–4: `domain`, `type`, `tier`, `sources`, `artifactHash`, `payload`. The spec requires `payload` to conform to the schema for `type` (e.g. for `practice`, see Artifact Type Registry). This root uses a minimal payload (e.g. `artifactURI`); add any required fields for your `type` if validation or the contract expects them.

## Legacy script

`scripts/compute-root-artifact-hash.mjs` still works for the root only (reads fixed paths, updates envelope). For arbitrary envelope + artifact paths and both hashes, use `scripts/compute-hashes.mjs`.

## Out of scope (M2+)

This root seed is M1. On-chain attestation, stamp verification, or alternate artifact formats are deferred to M2+. **Full list:** [docs/M1-SCOPE-FREEZE.md](../../docs/M1-SCOPE-FREEZE.md).
