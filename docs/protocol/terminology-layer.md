# Layered Verification Interface with Semantic Translation

This pattern is **Verification-Oriented Architecture (VOA)** (verification-first naming): system guarantees are primary, tests verify invariants, and interfaces expose verification, not implementation. The naming separation is **Semantic Layering** (semantic separation): different audiences consume different semantic views of the same truth.

**In this repo:**

- **verify** — Verification-oriented interface. `pnpm verify:m1` and `pnpm verify:m2` output **research protocol language** and print the “Research Mode (Protocol Guarantees)” banner.
- **test** — Default interface. `pnpm test:integration`, `pnpm test:m2` output **presentation semantics** (developer vocabulary).

---

## Semantic layering

| Layer | Language | Audience | Commands |
|-------|----------|----------|----------|
| **Protocol semantics** | Research protocol language | Verify scripts, invariants, specs, grant reviewers | `pnpm verify:m1`, `pnpm verify:m2` |
| **Presentation semantics** | Developer vocabulary | Test output (default), demos, docs | `pnpm test:integration`, `pnpm test:m2` |

Same guarantees; different semantic views. Compilers, operating systems, and protocols use this pattern constantly.

---

## Artifacts (internal file structure)

- **`docs/terminology-map.ts`** — Source of truth for both semantic layers. Wording aligned with **IMPLEMENTED-FEATURES-AND-TESTS.md** and **M1** docs. Keys map to `protocol` (research protocol language) and `product` (presentation semantics).
- **`docs/terminology-translations.md`** — Full translation table: all keys, research protocol language ↔ presentation semantics.
- **`docs/terminology-structure.json`** — Machine-readable keys and strings; plus strings not yet in the map (for i18n).
- **`tests/utils/verification-output.ts`** — Helper `say(key)` and `formatKnowledgeBlocks(count)`. Reads `OUTPUT_MODE`: `protocol` → research protocol language; default → presentation semantics.

---

## Usage

| Command | Tests | Output |
|---------|--------|--------|
| `pnpm test:integration` | M1 suite | **Presentation semantics** (developer vocabulary) |
| `pnpm verify:m1` | M1 suite | **Research protocol language** + banner |
| `pnpm test:m2` | M2 suite | **Presentation semantics** |
| `pnpm verify:m2` | M2 suite | **Research protocol language** + banner |

**Test** = presentation semantics: “Alexandrian Protocol — Demo”, `🔐 Deterministic identity verified`, `All checks passed.`, etc.  
**Verify** = research protocol language: “Research Mode (Protocol Guarantees)”, “Alexandrian Protocol — Verification”, and spec-style strings (e.g. deterministic identity, canonical byte derivation, graph integrity).

---

## Extending

1. Add a new key and both `protocol` (research protocol language) and `product` (presentation semantics) in `docs/terminology-map.ts`.
2. Use `say("new_key")` (or a formatter) in tests or scripts.
3. Do not hardcode user-facing strings in tests.

---

## Gitignore

Generated or local overrides are ignored (see root `.gitignore`):

- `docs/*.generated.*`
- `docs/terminology-map.local.*`
