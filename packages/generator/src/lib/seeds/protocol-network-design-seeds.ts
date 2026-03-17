/**
 * Protocol & Network Design Seeds (~70 seed procedures).
 * Binary protocol framing, session multiplexing, connection state machines,
 * protocol versioning, gRPC design, NAT traversal, and distributed consensus.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Binary protocol framing (10) */
const FRAMING: SeedSpec[] = [
  { domain: "protocol.framing.length_prefix", title: "Designing length-prefixed binary protocol framing", concept: C("4-byte big-endian length header; read length; read exactly N bytes; handle partial reads; max frame size") },
  { domain: "protocol.framing.delimiter", title: "Designing delimiter-based protocol framing", concept: C("sentinel byte or sequence; scan for delimiter; handle delimiter in data via escaping; simpler but slower") },
  { domain: "protocol.framing.fixed", title: "Designing fixed-length frame protocol formats", concept: C("fixed header size; type field determines payload size; pad to boundary; simplest parsing; wastes space for small msgs") },
  { domain: "protocol.framing.varint", title: "Implementing variable-length integer encoding in protocols", concept: C("LEB128: 7 bits per byte; MSB=1 means more bytes; MSB=0 means last byte; Protobuf and gRPC use varint") },
  { domain: "protocol.framing.magic", title: "Designing protocol magic number and version header fields", concept: C("4-byte magic number identifies protocol; major version byte; minor version byte; reject unknown magic") },
  { domain: "protocol.framing.checksum", title: "Implementing frame integrity checksums in binary protocols", concept: C("CRC32 or xxHash appended to frame; verify before processing; discard corrupted frames; request retransmit") },
  { domain: "protocol.framing.compression", title: "Designing per-frame compression in binary protocols", concept: C("compression flag in header; compress payload if flag set; negotiate algorithm on handshake; threshold for compression") },
  { domain: "protocol.framing.encryption", title: "Designing frame-level encryption in binary protocols", concept: C("encrypt after framing; IV per frame or per session with counter; authenticate with AEAD; nonce never reuse") },
  { domain: "protocol.framing.streaming", title: "Designing streaming frame protocols for continuous data", concept: C("chunk data into frames; sequence numbers; out-of-order buffering; flow control per stream; FIN frame to close") },
  { domain: "protocol.framing.multiplexing", title: "Implementing stream multiplexing over single protocol connections", concept: C("stream ID in frame header; interleave frames from multiple streams; flow control per stream and per connection") },
];

/** 2. Protocol state machines (8) */
const STATE_MACHINE: SeedSpec[] = [
  { domain: "protocol.state.handshake", title: "Designing protocol handshake state machines", concept: C("INIT → HELLO_SENT → HELLO_RECV → ESTABLISHED; timeout per state; reject invalid transition; log state changes") },
  { domain: "protocol.state.session", title: "Designing connection session state management", concept: C("session ID; state: connected, authenticating, active, closing, closed; persist state in memory; GC on close") },
  { domain: "protocol.state.keepalive", title: "Implementing protocol keepalive and timeout detection", concept: C("ping frame on idle; expect pong within T seconds; close connection on timeout; configurable interval") },
  { domain: "protocol.state.graceful_close", title: "Implementing graceful protocol connection teardown", concept: C("FIN frame; wait for peer FIN-ACK; drain in-flight requests; timeout to force close; half-close for reads") },
  { domain: "protocol.state.error", title: "Designing protocol error state handling and recovery", concept: C("error frame: code + message; close stream or connection based on severity; recoverable vs fatal errors") },
  { domain: "protocol.state.reconnect", title: "Designing protocol reconnection and session resumption", concept: C("session token on connect; present on reconnect; server resumes if token valid and not expired; replay unacked") },
  { domain: "protocol.state.flow_control", title: "Implementing protocol flow control state machines", concept: C("window size per stream; sender blocks at window limit; receiver sends WINDOW_UPDATE; HTTP/2 model") },
  { domain: "protocol.state.auth", title: "Designing protocol authentication state machines", concept: C("CONNECTED → CHALLENGE_SENT → RESPONSE_RECV → AUTHENTICATED; timeout; max retries; ban on excess failure") },
];

/** 3. gRPC service design (8) */
const GRPC: SeedSpec[] = [
  { domain: "protocol.grpc.service", title: "Designing gRPC service definitions with Protobuf", concept: C("service + RPC methods; request and response messages; use proto3; import well-known types; document each field") },
  { domain: "protocol.grpc.streaming", title: "Designing gRPC streaming patterns for different use cases", concept: C("unary: request-response; server stream: polling → push; client stream: upload; bidi: real-time; choose by data flow") },
  { domain: "protocol.grpc.error", title: "Implementing gRPC error status codes and error details", concept: C("map domain errors to gRPC status codes; ErrorInfo in details; include request_id; NOT_FOUND vs PERMISSION_DENIED") },
  { domain: "protocol.grpc.interceptor", title: "Designing gRPC interceptor chains for cross-cutting concerns", concept: C("unary and streaming interceptors; order: auth → rate limit → logging → handler; client and server side") },
  { domain: "protocol.grpc.deadline", title: "Implementing gRPC deadline propagation across services", concept: C("propagate deadline via context; subtract local processing budget; return DEADLINE_EXCEEDED early if insufficient") },
  { domain: "protocol.grpc.reflection", title: "Implementing gRPC server reflection for tooling support", concept: C("register reflection service; enables grpcurl and Postman; expose service descriptors; disable in production if needed") },
  { domain: "protocol.grpc.health", title: "Implementing gRPC health checking protocol", concept: C("grpc.health.v1.Health service; SERVING / NOT_SERVING / UNKNOWN; per-service health; K8s readiness probe integration") },
  { domain: "protocol.grpc.gateway", title: "Designing gRPC-Gateway for HTTP/JSON transcoding", concept: C("proto annotations map HTTP verbs and paths; gateway transcodes JSON ↔ proto; reverse proxy pattern; swagger gen") },
];

/** 4. Protocol versioning (8) */
const VERSIONING: SeedSpec[] = [
  { domain: "protocol.versioning.negotiation", title: "Designing protocol version negotiation in handshakes", concept: C("client sends supported versions list; server picks highest mutually supported; reject if no overlap") },
  { domain: "protocol.versioning.backward_compat", title: "Maintaining backward compatibility in protocol evolution", concept: C("new fields optional; old clients ignore unknown; old servers ignore unknown; never change existing field semantics") },
  { domain: "protocol.versioning.deprecation", title: "Designing protocol feature deprecation procedures", concept: C("announce deprecation; track usage; warn clients using deprecated feature; remove after N months; sunset date") },
  { domain: "protocol.versioning.migration", title: "Designing protocol version migration procedures for clients", concept: C("dual support during migration window; migration guide per version; track client version distribution; hard cutoff date") },
  { domain: "protocol.versioning.capability", title: "Implementing protocol capability advertisement systems", concept: C("server advertises supported extensions; client selects compatible subset; negotiated capabilities in session state") },
  { domain: "protocol.versioning.api_stability", title: "Defining API stability levels for protocol message fields", concept: C("stable: no breaking changes; beta: may change with notice; alpha: experimental, no compat guarantee; label in proto") },
  { domain: "protocol.versioning.breaking", title: "Classifying breaking vs non-breaking protocol changes", concept: C("breaking: remove field, change semantics, change type; non-breaking: add optional field, new enum value, new method") },
  { domain: "protocol.versioning.changelog", title: "Designing protocol version changelog and migration documentation", concept: C("per-version changelog: added, changed, deprecated, removed; migration steps per breaking change; linked in spec") },
];

/** 5. NAT traversal & P2P (8) */
const NAT_P2P: SeedSpec[] = [
  { domain: "protocol.nat.stun", title: "Implementing STUN-based NAT address discovery", concept: C("STUN server returns observed public IP and port; client learns its reflexive address; use for ICE") },
  { domain: "protocol.nat.turn", title: "Designing TURN relay fallback for NAT traversal", concept: C("TURN server relays when direct connection fails; authenticate via username/password; bandwidth cost; last resort") },
  { domain: "protocol.nat.ice", title: "Implementing ICE candidate gathering and connectivity checks", concept: C("gather: host, srflx, relay candidates; exchange via signaling; check in priority order; nominate working pair") },
  { domain: "protocol.nat.hole_punching", title: "Implementing UDP hole punching for P2P connectivity", concept: C("both peers send to each other's public address simultaneously; NAT opens pinhole; timing is key") },
  { domain: "protocol.p2p.signaling", title: "Designing signaling protocols for P2P connection establishment", concept: C("signaling server exchanges SDP offers and ICE candidates; WebSocket or HTTP long-poll; signaling is not data path") },
  { domain: "protocol.p2p.dht", title: "Designing distributed hash table protocols for decentralized systems", concept: C("Kademlia: XOR distance metric; k-bucket routing table; iterative or recursive lookup; replication factor K") },
  { domain: "protocol.p2p.gossip", title: "Implementing gossip protocols for peer-to-peer state propagation", concept: C("fanout to F random peers; state merges via CRDT or version vector; epidemic spread; convergence time log(N)") },
  { domain: "protocol.p2p.discovery", title: "Designing peer discovery mechanisms for P2P networks", concept: C("bootstrap nodes; mDNS for LAN; DHT for WAN; rendezvous service; track peer quality by uptime and latency") },
];

/** 6. Consensus & distributed coordination (8) */
const CONSENSUS: SeedSpec[] = [
  { domain: "protocol.consensus.raft", title: "Implementing Raft consensus for distributed state machines", concept: C("leader election by random timeout; log replication to quorum; commit when majority acks; snapshot + truncate log") },
  { domain: "protocol.consensus.leader_election", title: "Designing leader election protocols for distributed systems", concept: C("lease-based election; TTL on lock; candidate acquires lock; renews on heartbeat; follower retries on expiry") },
  { domain: "protocol.consensus.quorum", title: "Designing quorum-based write protocols for distributed data", concept: C("write to W nodes; read from R nodes; W + R > N guarantees overlap; tune W and R per durability/latency needs") },
  { domain: "protocol.consensus.paxos", title: "Implementing single-decree Paxos for distributed agreement", concept: C("prepare phase: propose ballot; promise phase: quorum promises; accept phase: quorum accepts; chosen when quorum accepts") },
  { domain: "protocol.consensus.vector_clock", title: "Implementing vector clocks for distributed event ordering", concept: C("each node maintains counter; increment on send; merge by max on receive; compare: happened-before or concurrent") },
  { domain: "protocol.consensus.two_phase_commit", title: "Implementing two-phase commit for distributed transactions", concept: C("prepare: all participants vote ready; commit: coordinator sends commit if all ready; abort if any vote abort; timeout abort") },
  { domain: "protocol.consensus.saga", title: "Designing saga patterns for distributed transaction compensation", concept: C("each step has compensating transaction; choreography or orchestration; compensate in reverse order on failure") },
  { domain: "protocol.consensus.merkle", title: "Implementing Merkle trees for efficient data consistency verification", concept: C("hash leaves; build tree bottom-up; compare root hashes for equality; exchange subtrees to find diff") },
];

export const PROTOCOL_NETWORK_DESIGN_SEED_SPECS: SeedSpec[] = [
  ...FRAMING,
  ...STATE_MACHINE,
  ...GRPC,
  ...VERSIONING,
  ...NAT_P2P,
  ...CONSENSUS,
];
