# Docs Sync Policy (Grant M1 Release)

This release docs folder is complete and self-contained for standalone publishing.

To reduce drift across repositories, a subset of docs is mirrored from root:

- `docs/M1-DEMO.md` -> `release/grant-m1/docs/M1-DEMO.md`
- `docs/protocol/PROTOCOL-SPEC.md` -> `release/grant-m1/docs/protocol/PROTOCOL-SPEC.md`

Root repo commands:

```bash
pnpm run docs:sync:release:m1
pnpm run docs:check:release:m1
```

Policy:
- Keep release-only grant artifacts here.
- For mapped docs, prefer editing canonical root docs, then sync.
- Non-mapped docs in `release/grant-m1/docs` may intentionally diverge for release narrative.
