/**
 * Game Development Seeds (~70 seed procedures).
 * ECS architecture, game loops, physics, deterministic netcode,
 * state rollback, AI/pathfinding, asset streaming, and rendering pipelines.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Entity-component-system architecture (10) */
const ECS: SeedSpec[] = [
  { domain: "game.ecs.design", title: "Designing entity-component-system game architectures", concept: C("entities = IDs; components = plain data; systems = logic over components; decouple behavior from data") },
  { domain: "game.ecs.storage", title: "Designing ECS component storage for cache-efficient access", concept: C("archetype storage: components of same type contiguous; SoA layout; iterate by component type for cache hits") },
  { domain: "game.ecs.query", title: "Implementing ECS component query systems", concept: C("query by component signature; iterate matched entities; support include, exclude, optional components") },
  { domain: "game.ecs.system_order", title: "Designing ECS system execution order and dependency graphs", concept: C("declare system dependencies; topological sort; run independent systems in parallel; fixed update order") },
  { domain: "game.ecs.events", title: "Implementing ECS event and messaging systems", concept: C("event queue per event type; systems subscribe; consume events each tick; clear at end of tick; ring buffer") },
  { domain: "game.ecs.prefab", title: "Designing prefab and entity template systems in ECS", concept: C("prefab = component set with default values; instantiate copies; support nested prefabs; diff for overrides") },
  { domain: "game.ecs.serialization", title: "Implementing ECS world serialization for save games", concept: C("serialize entity ID → component map; version each component schema; migration on load; exclude transient components") },
  { domain: "game.ecs.hierarchy", title: "Implementing parent-child entity hierarchies in ECS", concept: C("parent component stores child entity IDs; transform propagation system; efficient subtree queries") },
  { domain: "game.ecs.pooling", title: "Implementing entity and component pooling in ECS", concept: C("free list for recycled entity IDs; generation counter to detect stale references; component pool per type") },
  { domain: "game.ecs.reactive", title: "Implementing reactive ECS systems for change detection", concept: C("added/removed/changed component events; dirty flag per component; systems react to changes only") },
];

/** 2. Game loop design (8) */
const GAME_LOOP: SeedSpec[] = [
  { domain: "game.loop.fixed_timestep", title: "Implementing fixed timestep game loops with interpolation", concept: C("fixed update step 1/60s; accumulate delta; run N fixed steps; interpolate render state by remainder") },
  { domain: "game.loop.variable_timestep", title: "Designing variable timestep game loops with delta time", concept: C("measure frame delta; cap max delta to avoid spiral of death; multiply physics by delta; consistent behavior") },
  { domain: "game.loop.update_order", title: "Designing game loop update phase ordering", concept: C("input → physics → game logic → animation → rendering; strict order; fixed vs variable rate per phase") },
  { domain: "game.loop.frame_budget", title: "Profiling and managing game loop frame time budgets", concept: C("16.6ms at 60fps; budget per system; measure each phase; drop non-critical work when over budget") },
  { domain: "game.loop.multithreading", title: "Designing multi-threaded game loop architectures", concept: C("main thread: logic; render thread: GPU submit; job system for parallel work; sync at frame boundaries") },
  { domain: "game.loop.tick_rate", title: "Designing server tick rate and client interpolation for multiplayer", concept: C("server: 20–60 ticks/s; client: render at monitor rate; interpolate between received states; extrapolate on lag") },
  { domain: "game.loop.sleeping", title: "Implementing game loop sleeping for battery and CPU efficiency", concept: C("sleep remaining frame budget; timer resolution on Windows (timeBeginPeriod); vsync; yield on background") },
  { domain: "game.loop.determinism", title: "Designing deterministic game loop execution for replay and netcode", concept: C("fixed timestep required; no floating point platform variance; seeded RNG; same input → same output always") },
];

/** 3. Physics systems (8) */
const PHYSICS: SeedSpec[] = [
  { domain: "game.physics.integration", title: "Implementing physics integration methods for game simulations", concept: C("symplectic Euler for stability; Verlet for constraints; RK4 for high accuracy; fixed timestep required") },
  { domain: "game.physics.collision_detection", title: "Designing broad and narrow phase collision detection", concept: C("broad: AABB sweep and prune or BVH; narrow: GJK + EPA for convex; SAT for simple; generate contact manifold") },
  { domain: "game.physics.collision_response", title: "Implementing collision response and impulse resolution", concept: C("compute impulse from relative velocity and mass; apply to both bodies; coefficient of restitution; friction") },
  { domain: "game.physics.constraints", title: "Implementing physics constraint solvers for joints and joints", concept: C("constraint = limit on relative motion; sequential impulse solver; iterate N times per step; warm starting") },
  { domain: "game.physics.raycasting", title: "Implementing efficient raycasting for game physics queries", concept: C("BVH traversal; early exit on hit; layer mask filtering; multiple results sorted by distance; batch queries") },
  { domain: "game.physics.determinism", title: "Designing deterministic physics simulations for multiplayer games", concept: C("fixed timestep; no random forces; avoid platform-specific float behavior; quantize inputs; test replay equality") },
  { domain: "game.physics.optimization", title: "Optimizing game physics performance with sleeping and islands", concept: C("sleep slow-moving bodies; wake on impact; simulation islands for parallel solving; broad phase spatial hash") },
  { domain: "game.physics.character", title: "Implementing character controller physics for player movement", concept: C("kinematic controller; step-over stairs; slope limit; ground detection; separate from rigid body physics") },
];

/** 4. Deterministic netcode (8) */
const NETCODE: SeedSpec[] = [
  { domain: "game.netcode.lockstep", title: "Implementing lockstep deterministic netcode for multiplayer", concept: C("all peers advance only when all inputs received for frame; deterministic simulation; hash check for desyncs") },
  { domain: "game.netcode.rollback", title: "Implementing rollback netcode for low-latency multiplayer", concept: C("predict remote input; simulate ahead; rollback on mismatch; re-simulate from divergence point; GGPO model") },
  { domain: "game.netcode.input_prediction", title: "Designing client-side input prediction for responsive feel", concept: C("apply own input immediately; server confirms; reconcile on mismatch; smooth position correction") },
  { domain: "game.netcode.state_sync", title: "Designing server-authoritative state synchronization", concept: C("server simulates; sends delta state to clients; client interpolates between received states; authority on server") },
  { domain: "game.netcode.lag_compensation", title: "Implementing lag compensation for hit detection in shooters", concept: C("server rewinds world to client's perceived time; validate hit at rewound state; max rewind window cap") },
  { domain: "game.netcode.interest_management", title: "Designing interest management for large multiplayer worlds", concept: C("area of interest per player; only replicate nearby entities; dynamic relevance radius; priority by distance") },
  { domain: "game.netcode.anti_cheat", title: "Designing server-authoritative anti-cheat architectures", concept: C("server validates all outcomes; client sends inputs only; detect statistical anomalies; server-side hit verification") },
  { domain: "game.netcode.packet_design", title: "Designing game network packet formats for efficiency", concept: C("bit packing; delta compression vs baseline; priority-based send; redundant inputs for packet loss; sequence numbers") },
];

/** 5. Game AI & pathfinding (8) */
const GAME_AI: SeedSpec[] = [
  { domain: "game.ai.navmesh", title: "Implementing navmesh pathfinding for game AI agents", concept: C("bake navmesh from geometry; A* on navmesh polygons; funnel algorithm for smooth path; dynamic obstacles") },
  { domain: "game.ai.astar", title: "Implementing A* pathfinding for game tile and graph maps", concept: C("f = g + h; heuristic: Manhattan for grid, Euclidean for free; open/closed sets; reconstruct path on goal") },
  { domain: "game.ai.behavior_tree", title: "Designing behavior trees for game AI decision making", concept: C("composite nodes: sequence, selector, parallel; leaf nodes: action, condition; tick returns: success/failure/running") },
  { domain: "game.ai.fsm", title: "Implementing finite state machines for game AI", concept: C("states + transitions + conditions; enter/exit/update per state; hierarchical FSM for complex agents") },
  { domain: "game.ai.steering", title: "Implementing steering behaviors for game agent movement", concept: C("seek, flee, arrive, pursue, evade, flock; combine with weights; separation prevents overlap; obstacle avoidance") },
  { domain: "game.ai.perception", title: "Designing AI perception systems for game agents", concept: C("line-of-sight check; hearing radius; memory of last-known position; forget after timeout; sense priority") },
  { domain: "game.ai.utility", title: "Implementing utility-based AI decision systems for games", concept: C("score each action by utility function; pick highest score; factors: health, distance, threat; normalize scores") },
  { domain: "game.ai.group", title: "Designing group AI and formation systems for game agents", concept: C("formation slot assignment; leader follows path; followers maintain formation offset; recompute on leader deviation") },
];

/** 6. Asset streaming (8) */
const ASSET_STREAMING: SeedSpec[] = [
  { domain: "game.assets.streaming", title: "Designing runtime asset streaming systems for open world games", concept: C("load assets by proximity; priority queue by distance; background thread loading; hot-swap on main thread") },
  { domain: "game.assets.lod", title: "Implementing level-of-detail systems for game assets", concept: C("multiple mesh resolutions; switch by screen-space size or distance; hysteresis to prevent LOD popping") },
  { domain: "game.assets.texture_streaming", title: "Implementing texture streaming for memory management", concept: C("stream mip levels by required resolution; resident low-res always; load higher mips on demand; evict LRU") },
  { domain: "game.assets.bundle", title: "Designing asset bundle and packaging systems for games", concept: C("group assets by level or feature; bundle = versioned archive; download on demand; verify checksum on extract") },
  { domain: "game.assets.compression", title: "Designing asset compression pipelines for game distribution", concept: C("textures: BC7/ASTC by platform; audio: Vorbis/Opus; mesh: Meshoptimizer; compress at build; decompress at load") },
  { domain: "game.assets.hot_reload", title: "Implementing hot asset reloading for game development workflows", concept: C("watch asset files; reimport on change; hot-swap in running game; preserve entity references; only in dev builds") },
  { domain: "game.assets.addressable", title: "Designing addressable asset systems for runtime content loading", concept: C("address → resolve → load → cache; remote catalog for DLC; reference counting; unload on zero refs") },
  { domain: "game.assets.patching", title: "Designing game patch and DLC delivery systems", concept: C("binary diff from base version; download delta only; verify integrity; atomic apply; rollback on failure") },
];

export const GAME_DEVELOPMENT_SEED_SPECS: SeedSpec[] = [
  ...ECS,
  ...GAME_LOOP,
  ...PHYSICS,
  ...NETCODE,
  ...GAME_AI,
  ...ASSET_STREAMING,
];
