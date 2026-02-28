# Export As Standalone Repository

Use this to publish `release/grant-m1` as its own repository root.

## Option A: git subtree split (recommended)

From the monorepo root:

```bash
git subtree split --prefix release/grant-m1 -b grant-m1-release
git push <new-remote-url> grant-m1-release:main
```

## Option B: archive and initialize

```bash
git archive --format=tar HEAD:release/grant-m1 | tar -x -C /tmp/grant-m1
cd /tmp/grant-m1
git init
git add -A
git commit -m "grant-m1 initial release surface"
git branch -M main
git remote add origin <new-remote-url>
git push -u origin main
```
