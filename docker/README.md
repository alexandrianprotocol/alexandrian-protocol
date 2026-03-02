# Alexandrian Sandbox

Local stack for testing the Alexandrian runtime against a live Hardhat chain, IPFS node, and Redis cache. Architected to be Filecoin/FVM-ready — this Docker setup does not start a real Filecoin node.

## Services

| Service | Role | Ports |
|---|---|---|
| `blockchain` | Hardhat node — Registry.sol, $SCRIBE | 8545 |
| `ipfs` | Hot storage for knowledge retrieval | 4001, 5001, 8080 |
| `cache` | Redis — RoyaltyGraph traversal, payouts | 6379 |
| `api` | API & Runtime (Gatekeeper + Meter) | 3000 |

## Quick Start
```bash
git clone https://github.com/jlo-code/alexandria-protocol-v3.git
cd alexandria-protocol-v3
docker compose -f docker/docker-compose.yml up --build
```

| Endpoint | URL |
|---|---|
| API | http://localhost:3000 |
| Health | http://localhost:3000/health |
| RPC | http://localhost:8545 |
| IPFS API | http://localhost:5001 |
| Redis | localhost:6379 |

## Environment Variables

The API container accepts the following environment variables:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Redis connection URL | `redis://cache:6379` |
| `RPC_URL` | Chain RPC endpoint | `http://blockchain:8545` |
| `IPFS_NODE` | IPFS API endpoint | `http://ipfs:5001` |
| `PORT` | HTTP port | `3000` |
| `DEPLOYER_PRIVATE_KEY` | For `POST /api/ingest` | — |
| `REGISTRY_ADDRESS` | Deployed registry contract | — |
| `TOKEN_ADDRESS` | Deployed token contract | — |

> **Security:** `docker-compose.yml` uses the publicly known Hardhat test key for local dev only.
> Never put real private keys or production secrets in this file.
> For production, use Docker secrets, an `env_file` pointing to an untracked file,
> or your orchestrator's secret management.

## Runtime Architecture

| Component | Role |
|---|---|
| **Gatekeeper** | On-chain license check (Registry.sol), payment verification ($SCRIBE / subscription), optional decryption key release |
| **Meter** | Granular usage tracking (chunks/embeddings), proof-of-usage generation for the royalty DAG |

See `packages/runtime` for implementation.

## Document Map

| For | See |
|---|---|
| M1 scope boundary | `docs/M1-SCOPE-FREEZE.md` |
| Protocol invariants | `protocol/INVARIANTS.md` |
| Full verification suite | `VERIFY-M1.md` |
| Live deployment proof | `grants/LIVE-DEMO-ARTIFACT.md` |

---

## Out of Scope (M2+)

This sandbox covers M1. Full API runtime, production orchestration, and M2 services are deferred to M2+.
See [docs/M1-SCOPE-FREEZE.md](../docs/M1-SCOPE-FREEZE.md) for the full scope boundary.
