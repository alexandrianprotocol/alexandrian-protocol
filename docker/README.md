# Alexandrian Sandbox

Local Filecoin-ready stack for testing the **Alexandrian Runtime** (Gatekeeper + Meter). The runtime runs inside the API service and sits between the API and Storage/Contracts.

## Services

| Service     | Role                                      | Ports              |
|------------|--------------------------------------------|--------------------|
| **blockchain** | Hardhat node – Registry.sol, $SCRIBE      | 8545               |
| **ipfs**      | Hot storage for knowledge retrieval        | 4001, 5001, 8080   |
| **cache**     | Redis – RoyaltyGraph traversal, payouts    | 6379               |
| **api**       | API & Runtime (Gatekeeper + Meter)         | 3000               |

## Quick start

From the repo root:

```bash
docker compose -f docker/docker-compose.yml up --build
```

- API: http://localhost:3000  
- Health: http://localhost:3000/health  
- RPC: http://localhost:8545 (blockchain)  
- IPFS API: http://localhost:5001  
- Redis: localhost:6379  

## Environment (API)

The API container receives:

- `DATABASE_URL` – Redis URL (e.g. `redis://cache:6379`)
- `RPC_URL` – Chain RPC (e.g. `http://blockchain:8545`)
- `IPFS_NODE` – IPFS API (e.g. `http://ipfs:5001`)
- `PORT` – HTTP port (default 3000)
- `DEPLOYER_PRIVATE_KEY`, `REGISTRY_ADDRESS`, `TOKEN_ADDRESS` – for POST /api/ingest (registry.publish)

**Security:** `docker-compose.yml` uses the publicly known Hardhat test key for local dev only. **Never put real private keys or production secrets in this file.** For production, use Docker secrets, `env_file` pointing to an untracked file, or your orchestrator’s secret management.

## Runtime architecture

- **Gatekeeper**: On-chain license check (Registry.sol), payment verification ($SCRIBE / subscription), optional decryption key release.
- **Meter**: Granular usage (chunks/embeddings), proof-of-usage for the royalty DAG.

See `packages/runtime` for implementation.

---

## Out of scope (M2+)

This sandbox is M1. Full API runtime, production orchestration, and M2 services are deferred to M2+. **Full list:** [docs/M1-SCOPE-FREEZE.md](../docs/M1-SCOPE-FREEZE.md).
