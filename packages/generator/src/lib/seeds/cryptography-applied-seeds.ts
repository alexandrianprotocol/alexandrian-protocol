/**
 * Applied Cryptography Seeds (~75 seed procedures).
 * Symmetric encryption, asymmetric systems, digital signatures,
 * zero-knowledge proofs, commitment schemes, key derivation,
 * secure multiparty computation, and cryptographic protocols.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Symmetric encryption (8) */
const SYMMETRIC: SeedSpec[] = [
  { domain: "crypto.symmetric.aes_gcm", title: "Implementing AES-GCM authenticated encryption", concept: C("random 96-bit nonce per encryption; never reuse nonce; verify authentication tag before decryption; 128 or 256 bit key") },
  { domain: "crypto.symmetric.chacha20", title: "Implementing ChaCha20-Poly1305 for symmetric authenticated encryption", concept: C("256-bit key; 96-bit random nonce; Poly1305 authenticates; software-fast alternative to AES when no AES-NI") },
  { domain: "crypto.symmetric.envelope", title: "Implementing envelope encryption for scalable key management", concept: C("DEK encrypts data; KEK encrypts DEK; store encrypted DEK with data; rotate KEK without re-encrypting data") },
  { domain: "crypto.symmetric.cbc", title: "Migrating away from AES-CBC to authenticated encryption modes", concept: C("CBC lacks authentication; padding oracle attacks; migrate to GCM; handle legacy data with MAC-then-encrypt") },
  { domain: "crypto.symmetric.nonce_management", title: "Designing nonce management systems for symmetric encryption", concept: C("random nonce: 96 bits for GCM; or counter: monotonic per key; never reuse; track max encryptions per key") },
  { domain: "crypto.symmetric.key_rotation", title: "Implementing symmetric key rotation procedures", concept: C("generate new key; re-encrypt DEKs; mark old key deprecated; decrypt with old during grace; remove after migration") },
  { domain: "crypto.symmetric.stream", title: "Implementing stream cipher patterns for large data encryption", concept: C("ChaCha20 stream; encrypt in chunks; seek by nonce + counter; no padding needed; authenticate full message") },
  { domain: "crypto.symmetric.algorithm_selection", title: "Selecting symmetric encryption algorithms for security requirements", concept: C("prefer: AES-256-GCM or ChaCha20-Poly1305; avoid: 3DES, RC4, AES-ECB, AES-CBC without MAC; document choice") },
];

/** 2. Asymmetric cryptography (8) */
const ASYMMETRIC: SeedSpec[] = [
  { domain: "crypto.asymmetric.rsa", title: "Implementing RSA encryption and decryption correctly", concept: C("RSA-OAEP for encryption; never raw RSA; 2048 minimum, 4096 for long-term; padding oracle resistance") },
  { domain: "crypto.asymmetric.elliptic_curve", title: "Implementing elliptic curve cryptography for key generation", concept: C("P-256 or X25519 for key exchange; Ed25519 for signatures; Curve25519: constant-time, side-channel resistant") },
  { domain: "crypto.asymmetric.key_exchange", title: "Implementing Diffie-Hellman key exchange for session keys", concept: C("ECDH with P-256 or X25519; ephemeral keys for forward secrecy; derive session key with KDF from shared secret") },
  { domain: "crypto.asymmetric.hybrid", title: "Designing hybrid encryption combining asymmetric and symmetric", concept: C("encrypt DEK with recipient public key (RSA-OAEP or ECIES); encrypt data with DEK (AES-GCM); send both") },
  { domain: "crypto.asymmetric.pki", title: "Designing PKI certificate lifecycle management", concept: C("CA hierarchy; certificate issuance; revocation via OCSP or CRL; renewal automation; pinning for critical systems") },
  { domain: "crypto.asymmetric.forward_secrecy", title: "Implementing forward secrecy with ephemeral key exchange", concept: C("new ECDHE key pair per session; derive session key; discard private key after; past sessions protected from key compromise") },
  { domain: "crypto.asymmetric.key_generation", title: "Implementing secure asymmetric key pair generation", concept: C("generate in secure context; CSPRNG seeded; store private key encrypted; never transmit private key; backup escrow") },
  { domain: "crypto.asymmetric.post_quantum", title: "Designing post-quantum asymmetric cryptography migration strategies", concept: C("audit RSA and EC usage; evaluate CRYSTALS-Kyber for KEM; CRYSTALS-Dilithium for signatures; hybrid during transition") },
];

/** 3. Digital signatures (8) */
const SIGNATURES: SeedSpec[] = [
  { domain: "crypto.signatures.ecdsa", title: "Implementing ECDSA digital signatures correctly", concept: C("deterministic ECDSA (RFC 6979) to avoid nonce reuse; P-256 or secp256k1; hash message before signing") },
  { domain: "crypto.signatures.ed25519", title: "Implementing Ed25519 digital signatures", concept: C("EdDSA over Curve25519; deterministic; fast verification; no nonce management; preferred for new systems") },
  { domain: "crypto.signatures.rsa_pss", title: "Implementing RSA-PSS digital signatures", concept: C("RSA-PSS with SHA-256 minimum; random salt; verify salt length; reject PKCS#1 v1.5 for new systems") },
  { domain: "crypto.signatures.verification", title: "Implementing digital signature verification procedures", concept: C("verify signature before processing data; check: algorithm, key, hash, signature bytes; reject on any failure") },
  { domain: "crypto.signatures.multi_sig", title: "Implementing multi-signature threshold schemes", concept: C("k-of-n threshold; Schnorr multi-sig for aggregation; verify k signatures before accepting; on-chain: gas efficient") },
  { domain: "crypto.signatures.blind", title: "Implementing blind signature protocols for privacy-preserving signing", concept: C("signer signs without seeing message; user unblinds; signer cannot link signature to signing session; Chaum RSA blind") },
  { domain: "crypto.signatures.aggregate", title: "Implementing aggregate signature schemes for batch verification", concept: C("BLS signatures aggregate: n sigs → 1 sig; batch verify; used in consensus; requires pairing-friendly curve") },
  { domain: "crypto.signatures.certificate", title: "Designing code and artifact signing with digital certificates", concept: C("sign artifacts at build time; include signature in distribution; verify before execution; revoke on key compromise") },
];

/** 4. Zero-knowledge proofs (8) */
const ZKP: SeedSpec[] = [
  { domain: "crypto.zkp.design", title: "Designing zero-knowledge proof systems for privacy-preserving applications", concept: C("prover knows witness w; proves statement x = f(w) without revealing w; verifier checks proof; soundness + completeness") },
  { domain: "crypto.zkp.snark", title: "Implementing zk-SNARK proof systems for succinct verification", concept: C("Groth16 or PLONK; trusted setup or universal SRS; compile circuit; generate proof; verify in O(1); used in blockchain") },
  { domain: "crypto.zkp.stark", title: "Implementing zk-STARK proof systems for transparent verification", concept: C("no trusted setup; transparent randomness; larger proofs than SNARKs; quantum resistant; fast prover") },
  { domain: "crypto.zkp.circuit", title: "Designing arithmetic circuits for zero-knowledge proof compilation", concept: C("express computation as arithmetic circuit; R1CS or PLONK constraints; minimize gate count; test circuit separately") },
  { domain: "crypto.zkp.range_proof", title: "Implementing range proofs for confidential transaction validation", concept: C("prove value in [0, 2^n) without revealing value; Bulletproofs: no trusted setup; used in Monero and Confidential Tx") },
  { domain: "crypto.zkp.membership", title: "Implementing zero-knowledge set membership proofs", concept: C("prove element in set without revealing element; Merkle inclusion proof; or ZK-accumulator; verifier has set commitment") },
  { domain: "crypto.zkp.identity", title: "Designing zero-knowledge identity verification systems", concept: C("prove attribute (age > 18) without revealing attribute value; ZK credential; verifiable presentation; selective disclosure") },
  { domain: "crypto.zkp.rollup", title: "Designing ZK rollup architectures for scalable blockchain computation", concept: C("batch transactions off-chain; generate validity proof; post proof + state root on-chain; verifier checks proof only") },
];

/** 5. Cryptographic hash functions (8) */
const HASH_FUNCTIONS: SeedSpec[] = [
  { domain: "crypto.hash.selection", title: "Selecting cryptographic hash functions for security applications", concept: C("SHA-256 or SHA-3 for integrity; BLAKE3 for speed; Argon2id for passwords; never MD5 or SHA-1 for security") },
  { domain: "crypto.hash.mac", title: "Implementing HMAC for message authentication", concept: C("HMAC-SHA256 with 256-bit key; verify in constant time; key separate from data; use for API request signing") },
  { domain: "crypto.hash.commitment", title: "Implementing cryptographic commitment schemes", concept: C("commit: hash(value || nonce); bind without revealing; reveal: show value + nonce; verifier recomputes hash") },
  { domain: "crypto.hash.merkle", title: "Implementing Merkle tree construction and proof verification", concept: C("leaf = hash(data); parent = hash(left || right); root commits to all leaves; inclusion proof = sibling path") },
  { domain: "crypto.hash.password", title: "Implementing secure password hashing with memory-hard KDFs", concept: C("Argon2id: memory=64MB, iter=3, parallelism=4; bcrypt cost=12 fallback; salt=random 128-bit; never SHA for passwords") },
  { domain: "crypto.hash.content_addressing", title: "Implementing content-addressed storage using cryptographic hashes", concept: C("address = hash(content); deterministic; deduplication free; tamper-evident; CID in IPFS; block hash in Git") },
  { domain: "crypto.hash.transcript", title: "Implementing Fiat-Shamir transcript hashing for non-interactive proofs", concept: C("hash all prior messages to derive verifier challenge; makes interactive proof non-interactive; bind to context") },
  { domain: "crypto.hash.length_extension", title: "Defending against hash length extension attacks", concept: C("SHA-256 and SHA-512 vulnerable; use HMAC instead of hash(key || message); or SHA-3 / BLAKE which are immune") },
];

/** 6. Key derivation (8) */
const KDF: SeedSpec[] = [
  { domain: "crypto.kdf.hkdf", title: "Implementing HKDF for cryptographic key derivation", concept: C("extract: HMAC(salt, IKM) → PRK; expand: HMAC(PRK, info || counter) → OKM; derive multiple keys from one secret") },
  { domain: "crypto.kdf.pbkdf2", title: "Implementing PBKDF2 for password-based key derivation", concept: C("PBKDF2-HMAC-SHA256; iterations ≥ 600000 (NIST 2023); random 128-bit salt; prefer Argon2id for new systems") },
  { domain: "crypto.kdf.argon2", title: "Implementing Argon2id for password and credential hashing", concept: C("memory=64MB, iterations=3, parallelism=4; higher memory increases cost for attacker; tune to 1s target time") },
  { domain: "crypto.kdf.hierarchy", title: "Designing hierarchical key derivation for key management systems", concept: C("master secret → domain keys → purpose keys via HKDF; each key has narrow scope; rotate leaf without root change") },
  { domain: "crypto.kdf.session", title: "Deriving session keys from handshake secrets", concept: C("TLS 1.3 pattern: ECDHE → IKM → HKDF-extract → HKDF-expand for each session key direction") },
  { domain: "crypto.kdf.bip32", title: "Implementing BIP-32 hierarchical deterministic key derivation", concept: C("master seed → child keys via HMAC-SHA512; hardened vs normal derivation; path notation m/44'/60'/0'/0/0") },
  { domain: "crypto.kdf.deterministic", title: "Designing deterministic key derivation for reproducible key pairs", concept: C("derive from seed + context string; same seed + context = same key; enable backup from seed phrase only") },
  { domain: "crypto.kdf.domain_separation", title: "Implementing domain separation in key derivation functions", concept: C("unique info/context string per key purpose; prevents cross-use; HKDF-Expand with distinct labels per domain") },
];

/** 7. Secure multiparty computation (8) */
const MPC: SeedSpec[] = [
  { domain: "crypto.mpc.secret_sharing", title: "Implementing Shamir secret sharing for distributed key management", concept: C("split secret into N shares; any k shares reconstruct; polynomial interpolation; (k, N) threshold scheme") },
  { domain: "crypto.mpc.threshold_signing", title: "Designing threshold signature schemes for distributed signing", concept: C("k-of-n parties must collaborate to sign; no single party has full key; FROST or GG20 protocol; on-chain compatible") },
  { domain: "crypto.mpc.garbled_circuit", title: "Implementing garbled circuit protocols for secure computation", concept: C("garbler encrypts circuit; evaluator evaluates without learning inputs; oblivious transfer for input wires") },
  { domain: "crypto.mpc.ot", title: "Implementing oblivious transfer protocols for privacy-preserving computation", concept: C("sender has n messages; receiver selects one; sender learns nothing; receiver learns only selected; 1-of-n OT") },
  { domain: "crypto.mpc.private_intersection", title: "Designing private set intersection protocols", concept: C("two parties find intersection of sets without revealing non-intersection elements; PSI via hash or OT") },
  { domain: "crypto.mpc.homomorphic", title: "Implementing partially homomorphic encryption for privacy-preserving analytics", concept: C("Paillier: additive HE; multiply encrypted values; reveal only aggregate; used in private data analysis") },
  { domain: "crypto.mpc.federated_key", title: "Designing federated key ceremony procedures for distributed trust", concept: C("N parties generate key shares independently; combine public keys; no single party has full private key; transparent ceremony") },
  { domain: "crypto.mpc.dkg", title: "Implementing distributed key generation protocols", concept: C("Pedersen DKG: each party contributes randomness; verify commitments; abort if cheating; result: shared key no trusted dealer") },
];

export const CRYPTOGRAPHY_APPLIED_SEED_SPECS: SeedSpec[] = [
  ...SYMMETRIC,
  ...ASYMMETRIC,
  ...SIGNATURES,
  ...ZKP,
  ...HASH_FUNCTIONS,
  ...KDF,
  ...MPC,
];
