import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

// ── ML Training Algorithms ─────────────────────────────────────────────────
const ML_TRAINING: SeedSpec[] = [
  { domain: "academic.ml.gradient_clipping", title: "Gradient clipping for training stability (Pascanu et al. 2013)", concept: C("compute global_gradient_norm = sqrt(sum(g²) for all params); if norm > threshold (1.0), scale each gradient by threshold/norm; apply before optimizer step; verify: training loss decreases monotonically; threshold is hyperparameter, tune per architecture") },
  { domain: "academic.ml.learning_rate_schedule", title: "Cosine annealing learning rate schedule with warm restart", concept: C("lr(t) = lr_min + 0.5(lr_max - lr_min)(1 + cos(π × t/T)); restart every T steps; T doubles per restart (SGDR); warm-up for first 5% of steps; validate: final val_loss < baseline constant-lr run") },
  { domain: "academic.ml.batch_normalization", title: "Batch normalization layer: forward pass and training procedure", concept: C("normalize: x_hat = (x - μ_batch) / sqrt(σ²_batch + ε); scale: y = γ × x_hat + β; learn γ and β; use running stats (momentum=0.1) at inference; disable BN before gradient checkpointing; ε=1e-5 default") },
  { domain: "academic.ml.dropout_regularization", title: "Dropout regularization: training vs inference behavior", concept: C("training: zero each activation with probability p independently; scale by 1/(1-p) (inverted dropout); inference: use all activations, no scaling; p=0.5 for FC layers, p=0.1 for conv layers; validate: train/val gap narrows with dropout") },
  { domain: "academic.ml.adam_optimizer", title: "Adam optimizer: parameter update rule and hyperparameters", concept: C("m_t = β1 × m_{t-1} + (1-β1) × g_t; v_t = β2 × v_{t-1} + (1-β2) × g_t²; m_hat = m_t/(1-β1^t); v_hat = v_t/(1-β2^t); θ_t = θ_{t-1} - lr × m_hat/(sqrt(v_hat)+ε); defaults: β1=0.9, β2=0.999, ε=1e-8") },
  { domain: "academic.ml.early_stopping", title: "Early stopping with patience to prevent overfitting", concept: C("monitor val_loss each epoch; if val_loss does not improve for patience=10 epochs, stop; restore best checkpoint; compute improvement_threshold=1e-4 to ignore noise; save checkpoint when val_loss < best_val_loss - threshold") },
];

// ── Distributed Consensus ──────────────────────────────────────────────────
const CONSENSUS: SeedSpec[] = [
  { domain: "academic.consensus.raft_leader_election", title: "Raft leader election: term progression and vote granting", concept: C("follower starts election on timeout (150–300ms random); increments term, votes for self, sends RequestVote RPCs; candidate wins with majority votes; new leader sends heartbeats within election_timeout; node rejects vote if its log is more up-to-date") },
  { domain: "academic.consensus.raft_log_replication", title: "Raft log replication: AppendEntries RPC and commit rule", concept: C("leader appends entry to log; sends AppendEntries to all followers; entry committed when stored on majority; leader applies committed entries to state machine; follower rejects AppendEntries if prevLogTerm/prevLogIndex mismatch → leader backtracks nextIndex") },
  { domain: "academic.consensus.paxos_prepare_accept", title: "Paxos single-decree consensus: Prepare and Accept phases", concept: C("Phase 1: Proposer sends Prepare(n) to majority; acceptors promise not to accept n' < n; Phase 2: Proposer sends Accept(n, v) using highest-numbered value from promises; acceptor accepts if n >= max_promised; commit on majority Accept responses") },
  { domain: "academic.consensus.byzantine_fault_tolerance", title: "PBFT three-phase protocol for Byzantine fault tolerance", concept: C("Pre-prepare: primary broadcasts request with sequence n; Prepare: replicas broadcast Prepare(v,n,digest); commit when 2f+1 Prepare msgs received; Commit: broadcast Commit; execute when 2f+1 Commit msgs; requires 3f+1 replicas for f Byzantine faults") },
  { domain: "academic.consensus.vector_clocks", title: "Vector clock event ordering in distributed systems", concept: C("each node maintains clock[i] for each of N nodes; on local event: clock[self]++; on send: include clock in message; on receive: clock[i] = max(clock[i], msg.clock[i]) for all i, then clock[self]++; event A → B iff clock_A < clock_B componentwise") },
  { domain: "academic.consensus.two_phase_commit", title: "Two-phase commit protocol for distributed transaction atomicity", concept: C("Phase 1 (Prepare): coordinator sends PREPARE to all participants; each votes YES (logs prepare) or NO; Phase 2 (Commit): if all YES, coordinator sends COMMIT and logs decision; if any NO, sends ABORT; participants apply or rollback on receipt; coordinator waits for ACKs") },
];

// ── Cryptography ───────────────────────────────────────────────────────────
const CRYPTOGRAPHY: SeedSpec[] = [
  { domain: "academic.crypto.diffie_hellman", title: "Diffie-Hellman key exchange: parameter selection and validation", concept: C("choose prime p (≥2048 bits), generator g; Alice: a=random, A=g^a mod p; Bob: b=random, B=g^b mod p; shared secret: S=B^a mod p = A^b mod p; validate p is safe prime (p=2q+1, q prime); use RFC 3526 groups; never reuse (a,b)") },
  { domain: "academic.crypto.rsa_key_generation", title: "RSA key generation procedure and security parameter selection", concept: C("generate p,q prime of ≥1024 bits each; n=p×q; φ(n)=(p-1)(q-1); choose e=65537 (prime, gcd(e,φ)=1); d=e^{-1} mod φ; validate: e×d ≡ 1 mod φ; key size ≥2048 bits for 112-bit security; destroy p,q,φ after key gen") },
  { domain: "academic.crypto.zero_knowledge_schnorr", title: "Schnorr zero-knowledge proof of discrete log knowledge", concept: C("Prover knows x s.t. Y=g^x; choose r=random, commit R=g^r; verifier sends challenge c=H(g,Y,R); prover responds s=r+cx mod q; verifier checks g^s == R × Y^c; soundness: forking lemma; completeness: algebraic identity; use in 3-move sigma protocol") },
  { domain: "academic.crypto.hash_collision_resistance", title: "Hash function collision resistance: birthday bound and security", concept: C("birthday bound: collision found with probability 0.5 after 2^{n/2} queries for n-bit hash; SHA-256 requires 2^128 queries; validate: no known collision attacks; use domain separation (prefix) when hashing different types; HMAC adds key material") },
];

// ── Optimization Algorithms ────────────────────────────────────────────────
const OPTIMIZATION: SeedSpec[] = [
  { domain: "academic.optimization.binary_search", title: "Binary search correctness invariant and termination proof", concept: C("invariant: answer in [lo, hi]; mid = lo + (hi-lo)/2 (avoids overflow); if arr[mid] == target return mid; if arr[mid] < target lo = mid+1; else hi = mid-1; terminates: hi-lo decreases each iteration; time O(log n); requires sorted array") },
  { domain: "academic.optimization.dynamic_programming", title: "Dynamic programming: optimal substructure identification and memoization", concept: C("identify subproblem: f(n) depends on f(k) for k < n; define recurrence with base case; memoize with dict or array; bottom-up fills table in dependency order; top-down recurses with memo check first; time = O(distinct subproblems × cost per subproblem)") },
  { domain: "academic.optimization.greedy_exchange_argument", title: "Greedy algorithm correctness via exchange argument", concept: C("assume OPT differs from greedy at position i; swap OPT[i] with greedy[i]; show new solution is no worse than OPT; conclude greedy is optimal; apply to: interval scheduling, Huffman coding, Kruskal MST; fails when local choice disrupts global optimum") },
  { domain: "academic.optimization.gradient_descent_convergence", title: "Gradient descent convergence rate for convex and non-convex objectives", concept: C("convex: loss converges at O(1/t) with lr=1/L (L=Lipschitz constant); strongly convex: linear convergence O((1-μ/L)^t); non-convex: converges to stationary point ‖∇f‖→0; lr too large → divergence; validate: gradient norm decreases each epoch") },
  { domain: "academic.optimization.simulated_annealing", title: "Simulated annealing schedule design and acceptance criterion", concept: C("initial temp T0 = -ΔE_avg / ln(p0) where p0=0.8; cooling: T_t = T0 × α^t, α=0.95; accept worse solution with prob exp(-ΔE/T); stop when T < T_min or no improvement for N_max iterations; validate: final energy < random restart baseline") },
];

export const ACADEMIC_ALGORITHMS_SEED_SPECS: SeedSpec[] = [
  ...ML_TRAINING,
  ...CONSENSUS,
  ...CRYPTOGRAPHY,
  ...OPTIMIZATION,
];
