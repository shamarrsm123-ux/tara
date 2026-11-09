// Simulated tarha (09 §2, 03 Flow 18). Emits real 14-byte metrics packets through the real decoder, so the
// demo exercises the same path as a real tarha. Every sample is tagged `source: 'demo'`; nothing is stored.
//
// The script says what Calm level should be *shown*. Because signal/ smooths with an EMA, the source
// pre-compensates: it keeps a mirror of that EMA and emits the index that makes the smoothed value land on
// the script. Before a scenario starts it emits a calm signal with a small alternating spread so a real
// Learn Your Calm run converges to the default baseline the scripts are written against.
import { COOL_MAX_DURATION_S, EMA_RESET_INVALID_S } from '../engine/constants';
import { decodeMetrics, encodeMetrics, isPacketError } from '../signal/packet';
import { DEFAULT_BASELINE, emaFactor, indexForStress } from '../signal/stress';
import { TaraError } from '../shared/errors';
import { Listeners, type ConnectionState, type FoundTarha, type TarhaSource, type Unsubscribe } from '../shared/tarhaSource';
import type { Clock, MetricsSample, TarhaStatus } from '../shared/types';
import { commandFirmware, initialFirmware, statusOf, tickFirmware, type FirmwareState } from './firmware';
import { IDLE_FRAME, isValidFrame, SCENARIOS, type DemoScenario, type DemoScenarioId } from './scenarios';

export const DEMO_TARHA: FoundTarha = { id: 'demo-tarha', name: 'TARA-DEMO' };

const TICK_MS = 1000;
const MS_PER_S = 1000;
const STATUS_EVERY_TICKS = 10;
/** Alternating spread whose MAD × 1.4826 equals the default baseline's spread (0.25). */
const CALIBRATION_SPREAD = DEFAULT_BASELINE.s / 1.4826;
const INDEX_LIMIT = 3;
const BAND_BASE = 500;
const SKIN_TEMP_C = 33.5;

export interface DemoSourceOptions {
  clock: Clock;
  scenario: DemoScenarioId;
  tickMs?: number;
}

export class DemoTarhaSource implements TarhaSource {
  readonly kind = 'demo' as const;
  readonly scenario: DemoScenario;
  private readonly clock: Clock;
  private readonly tickMs: number;
  private readonly metrics = new Listeners<MetricsSample>();
  private readonly statuses = new Listeners<TarhaStatus>();
  private readonly connections = new Listeners<ConnectionState>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private firmware: FirmwareState = initialFirmware(IDLE_FRAME.batteryPct);
  private seq = 0;
  private ticks = 0;
  private scenarioStartMs: number | null = null;
  private coolingSinceS: number | null = null;
  private emaMirror: number | null = null;
  private lastValidMs: number | null = null;
  private lastStatusKey = '';

  constructor(options: DemoSourceOptions) {
    this.clock = options.clock;
    this.scenario = SCENARIOS[options.scenario];
    this.tickMs = options.tickMs ?? TICK_MS;
  }

  get isConnected(): boolean {
    return this.timer !== null;
  }

  async scan(): Promise<FoundTarha[]> {
    return [DEMO_TARHA];
  }

  async blink(): Promise<void> {
    // The demo tarha has no LED; identifying it always succeeds.
  }

  async connect(id: string): Promise<void> {
    if (id !== DEMO_TARHA.id) throw new TaraError('BLE_NOT_FOUND');
    if (this.timer !== null) return;
    this.connections.emit('connecting');
    this.timer = setInterval(() => this.tick(), this.tickMs);
    this.connections.emit('connected');
    this.emitStatus(true);
  }

  async disconnect(): Promise<void> {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
    this.connections.emit('disconnected');
  }

  async forget(): Promise<void> {
    await this.disconnect();
  }

  /** Starts the scripted part (after connect and Learn Your Calm). Demo-only control, not part of TarhaSource. */
  startScenario(): void {
    this.scenarioStartMs = this.clock.monotonicMs();
    this.coolingSinceS = null;
  }

  onMetrics(cb: (sample: MetricsSample) => void): Unsubscribe {
    return this.metrics.add(cb);
  }

  onStatus(cb: (status: TarhaStatus) => void): Unsubscribe {
    return this.statuses.add(cb);
  }

  onConnection(cb: (state: ConnectionState) => void): Unsubscribe {
    return this.connections.add(cb);
  }

  async coolOn(durationS: number): Promise<void> {
    if (durationS > COOL_MAX_DURATION_S || durationS <= 0) throw new TaraError('VALIDATION_ERROR');
    if (this.timer === null) throw new TaraError('BLE_DISCONNECTED');
    this.firmware = commandFirmware(this.firmware, { op: 'coolOn', durationS });
    this.markCoolingStart();
    this.emitStatus(true);
  }

  async coolOff(): Promise<void> {
    if (this.timer === null) throw new TaraError('BLE_DISCONNECTED');
    this.firmware = commandFirmware(this.firmware, { op: 'coolOff' });
    this.emitStatus(true);
  }

  private scenarioSeconds(): number | null {
    return this.scenarioStartMs === null ? null : (this.clock.monotonicMs() - this.scenarioStartMs) / MS_PER_S;
  }

  private markCoolingStart(): void {
    const t = this.scenarioSeconds();
    if (this.firmware.cooling === 'on' && this.coolingSinceS === null && t !== null) this.coolingSinceS = t;
  }

  private tick(): void {
    const now = this.clock.monotonicMs();
    const t = this.scenarioSeconds();
    const frame = t === null ? IDLE_FRAME : this.scenario.frame(t, this.coolingSinceS);
    this.firmware = tickFirmware(this.firmware, this.tickMs / MS_PER_S, frame.batteryPct);
    this.markCoolingStart();
    this.ticks += 1;

    const isValid = isValidFrame(frame);
    const index = this.nextIndex(indexForStress(100 - frame.calm, DEFAULT_BASELINE), isValid, t === null, now);
    const bytes = encodeMetrics({
      seq: this.seq,
      theta: BAND_BASE,
      alpha: BAND_BASE,
      beta: 2 * BAND_BASE * Math.exp(index),
      fit: frame.fit,
      skinTempC: SKIN_TEMP_C,
      motion: frame.motion,
      saturated: false,
    });
    this.seq = (this.seq + 1) & 0xffff;
    const sample = decodeMetrics(bytes, 'demo', now);
    if (!isPacketError(sample)) this.metrics.emit(sample);
    this.emitStatus(this.ticks % STATUS_EVERY_TICKS === 0);
  }

  /** Index to emit so the pipeline's EMA lands on `target` (see header). */
  private nextIndex(target: number, isValid: boolean, isIdle: boolean, now: number): number {
    if (!isValid) return target;
    const hasLongGap = this.lastValidMs !== null && now - this.lastValidMs > EMA_RESET_INVALID_S * MS_PER_S;
    const mirror = hasLongGap ? null : this.emaMirror;
    const alpha = emaFactor();
    const raw = isIdle
      ? target + (this.seq % 2 === 0 ? CALIBRATION_SPREAD : -CALIBRATION_SPREAD)
      : mirror === null
        ? target
        : mirror + (target - mirror) / alpha;
    const emitted = Math.min(INDEX_LIMIT, Math.max(-INDEX_LIMIT, raw));
    this.emaMirror = mirror === null ? emitted : mirror + (emitted - mirror) * alpha;
    this.lastValidMs = now;
    return emitted;
  }

  private emitStatus(force: boolean): void {
    const status = statusOf(this.firmware);
    const key = `${status.cooling}:${status.batteryPct}`;
    if (!force && key === this.lastStatusKey) return;
    this.lastStatusKey = key;
    this.statuses.emit(status);
  }
}
