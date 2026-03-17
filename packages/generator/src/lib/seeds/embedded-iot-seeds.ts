/**
 * Embedded Systems & IoT Seeds (~65 seed procedures).
 * Firmware architecture, RTOS, OTA updates, sensor pipelines,
 * edge-cloud sync, power management, and hardware abstraction.
 */

import type { SeedSpec } from "../ai-generator.js";

const C = (op: string): string =>
  `Operational procedure. Example: defined inputs → deterministic outputs. Decision rule: ${op}. Anti-example: vague or non-actionable steps.`;

/** 1. Firmware architecture (10) */
const FIRMWARE: SeedSpec[] = [
  { domain: "embedded.firmware.architecture", title: "Designing layered firmware architecture for embedded systems", concept: C("HAL → RTOS → middleware → application; each layer has stable interface; port by swapping HAL only") },
  { domain: "embedded.firmware.hal", title: "Designing hardware abstraction layer interfaces for firmware", concept: C("GPIO, UART, SPI, I2C, ADC APIs; driver implements HAL interface; application never touches registers directly") },
  { domain: "embedded.firmware.bootloader", title: "Designing bootloader architectures for embedded devices", concept: C("verify application signature; load into RAM or execute in-place; fallback to factory image on corrupt; lockout") },
  { domain: "embedded.firmware.memory", title: "Designing firmware memory layout for constrained devices", concept: C("flash: bootloader | app_a | app_b | config | data; RAM: stack | heap | BSS | data; linker script defines regions") },
  { domain: "embedded.firmware.state_machine", title: "Implementing firmware state machines for device lifecycle", concept: C("states: init → idle → active → sleep → error; event-driven transitions; log state changes; watchdog per state") },
  { domain: "embedded.firmware.error_handling", title: "Designing embedded firmware error handling and fault recovery", concept: C("assert with file:line log; hardfault handler; watchdog reset; error code propagation; persistent fault log") },
  { domain: "embedded.firmware.configuration", title: "Implementing firmware configuration storage on embedded devices", concept: C("NVS or EEPROM for config; validate on load; default fallback; wear leveling for write-heavy config") },
  { domain: "embedded.firmware.logging", title: "Implementing firmware logging and diagnostics for embedded systems", concept: C("ring buffer log in RAM; flush to UART or storage on demand; severity levels; timestamp with tick counter") },
  { domain: "embedded.firmware.testing", title: "Designing embedded firmware testing strategies", concept: C("unit test on host with mocked HAL; integration on target with hardware; CI with hardware-in-the-loop") },
  { domain: "embedded.firmware.versioning", title: "Implementing firmware version management and compatibility checks", concept: C("semantic version in binary; bootloader checks version before boot; downgrade protection; version in OTA manifest") },
];

/** 2. RTOS design (8) */
const RTOS: SeedSpec[] = [
  { domain: "embedded.rtos.tasks", title: "Designing RTOS task architectures for embedded systems", concept: C("task per subsystem; priority by deadline; stack size per task; infinite loop with blocking wait; no busy-wait") },
  { domain: "embedded.rtos.priority", title: "Assigning RTOS task priorities for real-time guarantees", concept: C("rate-monotonic: higher rate = higher priority; critical tasks highest; idle task lowest; avoid priority inversion") },
  { domain: "embedded.rtos.ipc", title: "Designing inter-task communication in RTOS systems", concept: C("queues for data; semaphores for sync; mutexes for shared resources; event groups for multi-signal wait") },
  { domain: "embedded.rtos.mutex", title: "Implementing mutex priority inheritance to prevent priority inversion", concept: C("priority inheritance mutex; holder inherits highest waiter priority; revert on release; avoid recursive mutex") },
  { domain: "embedded.rtos.timing", title: "Designing real-time timing with RTOS tick and delay functions", concept: C("vTaskDelayUntil for periodic tasks; tick period = 1ms; measure jitter; avoid blocking longer than period") },
  { domain: "embedded.rtos.stack", title: "Sizing RTOS task stacks for reliability", concept: C("measure peak stack usage with watermark; set 150% of peak; monitor watermark in production; alert on overflow") },
  { domain: "embedded.rtos.watchdog", title: "Implementing watchdog timer patterns for RTOS applications", concept: C("hardware watchdog; each task refreshes its token; supervisor checks all tokens; reset if any missed") },
  { domain: "embedded.rtos.idle", title: "Designing RTOS idle task and tickless idle for power saving", concept: C("tickless idle: suppress tick during idle; wake on event; measure sleep duration; resume scheduler correctly") },
];

/** 3. OTA firmware updates (8) */
const OTA: SeedSpec[] = [
  { domain: "embedded.ota.design", title: "Designing OTA firmware update architectures for IoT devices", concept: C("A/B partition scheme; download to inactive partition; verify; swap on next boot; rollback if boot fails") },
  { domain: "embedded.ota.security", title: "Implementing secure OTA firmware update verification", concept: C("sign firmware with private key; device verifies with public key embedded at manufacture; reject unsigned") },
  { domain: "embedded.ota.delta", title: "Implementing delta OTA firmware updates for bandwidth efficiency", concept: C("binary diff from base version; download patch only; apply patch to current; verify result; smaller = faster") },
  { domain: "embedded.ota.rollback", title: "Designing firmware OTA rollback procedures for failed updates", concept: C("boot counter; if boot count > threshold without mark-good → rollback to previous; mark-good on health check pass") },
  { domain: "embedded.ota.staged", title: "Designing staged OTA rollout for IoT device fleets", concept: C("rollout by: cohort %, device type, region; monitor error rate per cohort; halt and rollback on threshold breach") },
  { domain: "embedded.ota.resumable", title: "Implementing resumable OTA downloads for unreliable connections", concept: C("HTTP range requests; track downloaded bytes; resume from last offset; verify checksum on complete") },
  { domain: "embedded.ota.manifest", title: "Designing OTA update manifest formats for IoT fleets", concept: C("manifest: version, signature, URL, checksum, size, target hardware ID; device checks hardware compatibility") },
  { domain: "embedded.ota.fleet", title: "Managing OTA update campaigns across IoT device fleets", concept: C("campaign: target cohort, firmware version, schedule; track: pending, downloading, updated, failed per device") },
];

/** 4. Sensor data pipelines (8) */
const SENSOR: SeedSpec[] = [
  { domain: "embedded.sensor.acquisition", title: "Designing sensor data acquisition pipelines for embedded systems", concept: C("DMA transfer from ADC; double buffer; ISR signals task; task processes completed buffer; no copy on critical path") },
  { domain: "embedded.sensor.filtering", title: "Implementing digital filters for sensor data in embedded systems", concept: C("low-pass IIR for noise; Kalman for sensor fusion; moving average for simple smoothing; fixed-point arithmetic") },
  { domain: "embedded.sensor.calibration", title: "Implementing sensor calibration procedures and storage", concept: C("factory calibration coefficients; store in NVS; apply on each reading; recalibration command; validate range") },
  { domain: "embedded.sensor.fusion", title: "Designing sensor fusion architectures for IoT devices", concept: C("fuse: accelerometer + gyroscope + magnetometer; complementary filter or Kalman; output: attitude, position") },
  { domain: "embedded.sensor.sampling", title: "Designing sensor sampling rate and aliasing prevention", concept: C("Nyquist: sample ≥ 2× signal frequency; anti-alias filter before ADC; power vs resolution tradeoff per sensor") },
  { domain: "embedded.sensor.aggregation", title: "Designing sensor data aggregation before cloud transmission", concept: C("aggregate N samples locally; send statistics (mean, min, max, std); reduce transmission frequency; local store-and-forward") },
  { domain: "embedded.sensor.timestamp", title: "Implementing accurate timestamps for sensor data on embedded devices", concept: C("hardware RTC with battery; sync to NTP on connect; drift compensation; monotonic counter for relative timing") },
  { domain: "embedded.sensor.error", title: "Detecting and handling sensor errors in embedded pipelines", concept: C("out-of-range detection; stuck value detection; timeout on no reading; substitute with last valid + alert") },
];

/** 5. Edge-cloud synchronization (8) */
const EDGE_CLOUD: SeedSpec[] = [
  { domain: "embedded.edge.store_forward", title: "Implementing store-and-forward patterns for intermittent connectivity", concept: C("persist data locally on disconnect; queue for transmission; drain queue on reconnect; deduplicate by ID") },
  { domain: "embedded.edge.mqtt", title: "Designing MQTT communication patterns for IoT edge devices", concept: C("QoS 1 for reliable delivery; clean session vs persistent; will message; topic hierarchy by device/type/metric") },
  { domain: "embedded.edge.compression", title: "Compressing IoT telemetry for edge-cloud transmission efficiency", concept: C("CBOR or MessagePack for binary; delta encode time series; compress batch; LZ4 for speed; zstd for ratio") },
  { domain: "embedded.edge.shadow", title: "Implementing device shadow patterns for cloud-device state sync", concept: C("shadow = desired + reported + delta; device syncs reported to cloud; cloud pushes desired; device applies delta") },
  { domain: "embedded.edge.command", title: "Designing cloud-to-device command delivery for IoT systems", concept: C("command queue per device; at-least-once delivery; device acks on execute; timeout and retry; idempotent commands") },
  { domain: "embedded.edge.time_sync", title: "Synchronizing time between edge devices and cloud systems", concept: C("NTP or PTP on connect; track drift; compensate in sensor timestamps; max acceptable drift per use case") },
  { domain: "embedded.edge.protocol", title: "Selecting edge-to-cloud communication protocols for IoT", concept: C("MQTT: lightweight pub/sub; CoAP: constrained REST; HTTP/2: flexible; select by: power, bandwidth, latency, QoS") },
  { domain: "embedded.edge.batch", title: "Designing batched telemetry transmission for IoT power efficiency", concept: C("accumulate N readings; transmit batch when full or at interval; batch reduces radio duty cycle; local compression") },
];

/** 6. Power management (8) */
const POWER: SeedSpec[] = [
  { domain: "embedded.power.sleep_modes", title: "Designing sleep mode strategies for battery-powered IoT devices", concept: C("light sleep: fast wake; deep sleep: minimum power; select by wake frequency; wake sources: timer, GPIO, UART") },
  { domain: "embedded.power.duty_cycle", title: "Implementing duty cycling for IoT sensor and radio power reduction", concept: C("wake → sample → transmit → sleep; optimize each phase duration; measure current per phase; target mAh/day") },
  { domain: "embedded.power.radio", title: "Optimizing radio transmission for IoT power efficiency", concept: C("minimize tx time; batch data; highest data rate reduces tx duration; tx power = minimum for reliable range") },
  { domain: "embedded.power.profiling", title: "Profiling embedded firmware power consumption", concept: C("current probe on power rail; correlate with firmware execution; identify sleep/wake transitions; measure avg mA") },
  { domain: "embedded.power.budget", title: "Designing power budgets for battery-powered IoT devices", concept: C("budget: idle + active + tx + sleep; calculate battery life = capacity / avg_current; target per use case") },
  { domain: "embedded.power.harvesting", title: "Designing energy harvesting systems for self-powered IoT devices", concept: C("source: solar, vibration, RF; MPPT for solar; supercap storage for burst; design for intermittent power") },
  { domain: "embedded.power.voltage", title: "Designing voltage regulation strategies for embedded power systems", concept: C("LDO for low noise; buck converter for efficiency; track input range; brown-out detection; power sequencing") },
  { domain: "embedded.power.hibernate", title: "Implementing device hibernate and wake patterns for ultra-low power", concept: C("deep sleep with RTC wake; persist critical state to NVS before sleep; restore state on wake; boot to active") },
];

export const EMBEDDED_IOT_SEED_SPECS: SeedSpec[] = [
  ...FIRMWARE,
  ...RTOS,
  ...OTA,
  ...SENSOR,
  ...EDGE_CLOUD,
  ...POWER,
];
