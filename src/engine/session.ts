// Monitoring session (06 §5 pipeline): TarhaSource → signal/ → engine/ → actions, with the last 10 minutes of
// Calm kept in memory for the live graph. No React and no storage: per-second values never leave RAM
// (10 §1). Works the same for the demo and the real tarha because both implement TarhaSource.
import { Calibrator } from '../signal/calibrator';
import { FitStabilizer, fitLevel, isValid } from '../signal/fit';
import { StressComputer, type Baseline } from '../signal/stress';
import { Listeners, type ConnectionState, type TarhaSource, type Unsubscribe } from '../shared/tarhaSource';
import {
  DEFAULT_SETTINGS,
  type Clock,
  type FitLevel,
  type GraphPoint,
  type MetricsSample,
  type Settings,
  type SourceKind,
  type TarhaStatus,
  type TimeBand,
  type Zone,
} from '../shared/types';
import { createEngine, type EngineTiming } from './engine';
import type { EngineAction, EngineInput, EngineSnapshot } from './types';

export const GRAPH_WINDOW_MS = 10 * 60_000;
/** Calm is shown only after this much continuous Good fit after (re)connecting (11 §2, 03 Flow 1/15). */
export const GOOD_FIT_SHOW_MS = 5_000;

export interface CalibrationState {
  progress: number;
  isPaused: boolean;
  isDone: boolean;
}

export interface MonitorSnapshot {
  sourceKind: SourceKind;
  connection: ConnectionState;
  calm: number | null;
  zone: Zone;
  fit: FitLevel | null;
  points: readonly GraphPoint[];
  coolingBands: readonly TimeBand[];
  nowMs: number;
  /** Monotonic time of this snapshot, for countdowns against `engine.coolingEndsAtMono`. */
  nowMono: number;
  engine: EngineSnapshot;
  /** How long the fit has been continuously Good (0 when not). */
  goodFitMs: number;
  /** Learn Your Calm progress while it runs (03 Flow 1b). */
  calibration: CalibrationState | null;
  /** The baseline in use; saved only if she says Yes on Screen 5. */
  baseline: Baseline;
}

export interface MonitorOptions {
  source: TarhaSource;
  clock: Clock;
  baseline: Baseline;
  settings?: Settings;
  /** Demo-only overrides (07 §8); real sessions never pass this. */
  timing?: EngineTiming;
  /** Receives every engine action (UI shows prompts, plays voice/haptics, store logs events). */
  onAction?: (action: EngineAction) => void;
}

export interface MonitorSession {
  connect(id: string): Promise<void>;
  disconnect(): Promise<void>;
  dispatch(input: EngineInput): void;
  getSnapshot(): MonitorSnapshot;
  subscribe(listener: () => void): Unsubscribe;
  /** Starts Learn Your Calm: 60 valid seconds; the result replaces the baseline automatically. */
  startCalibration(): void;
  /** Uses this baseline from now on (Skip → default; Recalibrate later). */
  replaceBaseline(baseline: Baseline): void;
  dispose(): void;
}

const appendWithin = (points: readonly GraphPoint[], point: GraphPoint): GraphPoint[] => [
  ...points.filter((p) => p.tMs > point.tMs - GRAPH_WINDOW_MS),
  point,
];

function updateBands(bands: readonly TimeBand[], isCooling: boolean, wasCooling: boolean, nowMs: number): TimeBand[] {
  const recent = bands.filter((b) => b.toMs > nowMs - GRAPH_WINDOW_MS);
  if (!isCooling) return recent;
  if (!wasCooling || recent.length === 0) return [...recent, { fromMs: nowMs, toMs: nowMs }];
  return [...recent.slice(0, -1), { ...recent[recent.length - 1]!, toMs: nowMs }];
}

export function createMonitorSession(options: MonitorOptions): MonitorSession {
  const { source, clock } = options;
  const engine = createEngine(clock, options.settings ?? DEFAULT_SETTINGS, options.timing ?? {});
  const computer = new StressComputer(options.baseline, clock);
  let calibrator: Calibrator | null = null;
  let goodSinceMs: number | null = null;
  const fitStabilizer = new FitStabilizer();
  const listeners = new Listeners<void>();
  let lastStatus: TarhaStatus | null = null;

  let snapshot: MonitorSnapshot = {
    sourceKind: source.kind,
    connection: 'disconnected',
    calm: null,
    zone: 'unknown',
    fit: null,
    points: [],
    coolingBands: [],
    nowMs: clock.nowMs(),
    nowMono: clock.monotonicMs(),
    engine: engine.snapshot(),
    goodFitMs: 0,
    calibration: null,
    baseline: options.baseline,
  };

  const applyBaseline = (baseline: Baseline) => {
    computer.replaceBaseline(baseline);
    snapshot = { ...snapshot, baseline };
  };

  const calibrate = (sample: MetricsSample): CalibrationState | null => {
    if (calibrator === null) return snapshot.calibration;
    const { progress, paused } = calibrator.push(sample);
    if (progress < 1) return { progress, isPaused: paused, isDone: false };
    applyBaseline(calibrator.result());
    calibrator = null;
    return { progress: 1, isPaused: false, isDone: true };
  };

  const publish = (patch: Partial<MonitorSnapshot>) => {
    const engineSnap = engine.snapshot();
    const nowMs = clock.nowMs();
    const isCooling = engineSnap.cooling === 'on';
    const wasCooling = snapshot.engine.cooling === 'on';
    snapshot = { ...snapshot, ...patch, nowMs, nowMono: clock.monotonicMs(), engine: engineSnap, coolingBands: updateBands(snapshot.coolingBands, isCooling, wasCooling, nowMs) };
    listeners.emit();
  };

  const perform = (actions: readonly EngineAction[]) => {
    actions.forEach((action) => {
      if (action.a === 'coolOn' || action.a === 'coolOff') {
        const request = action.a === 'coolOn' ? source.coolOn(action.durationS) : source.coolOff();
        // A rejected command is shown to her by the engine itself: "starting" times out after 2 s (11 §4).
        request.catch((error: unknown) => {
          if (__DEV__) console.warn(`session: ${action.a} failed`, error instanceof Error ? error.name : 'unknown');
        });
      }
      options.onAction?.(action);
    });
  };

  const step = (input: EngineInput) => perform(engine.step(input, clock.monotonicMs()));

  const onMetrics = (sample: MetricsSample) => {
    const mono = clock.monotonicMs();
    const calibration = calibrate(sample);
    const reading = computer.push(sample);
    const fit = fitStabilizer.push(fitLevel(sample), mono);
    goodSinceMs = isValid(sample) ? (goodSinceMs ?? mono) : null;
    step({ t: 'tick', calm: reading.calm, zone: reading.zone, valid: reading.valid });
    publish({
      calm: reading.calm,
      zone: reading.zone,
      fit,
      calibration,
      goodFitMs: goodSinceMs === null ? 0 : mono - goodSinceMs,
      points: appendWithin(snapshot.points, { tMs: clock.nowMs(), calm: reading.calm }),
    });
  };

  const onStatus = (status: TarhaStatus) => {
    lastStatus = status;
    step({ t: 'status', status, connected: snapshot.connection === 'connected' });
    publish({});
  };

  const onConnection = (connection: ConnectionState) => {
    snapshot = { ...snapshot, connection };
    goodSinceMs = null;
    if (connection === 'disconnected' && lastStatus !== null) step({ t: 'status', status: lastStatus, connected: false });
    // No stale Calm while not connected (03 Flow 15).
    publish(connection === 'connected' ? { goodFitMs: 0 } : { calm: null, zone: 'unknown', fit: null, goodFitMs: 0 });
  };

  const subscriptions = [source.onMetrics(onMetrics), source.onStatus(onStatus), source.onConnection(onConnection)];

  return {
    connect: (id) => source.connect(id),
    disconnect: () => source.disconnect(),
    dispatch: (input) => {
      step(input);
      publish({});
    },
    getSnapshot: () => snapshot,
    subscribe: (listener) => listeners.add(() => listener()),
    startCalibration: () => {
      calibrator = new Calibrator();
      publish({ calibration: { progress: 0, isPaused: false, isDone: false } });
    },
    replaceBaseline: (baseline) => {
      calibrator = null;
      applyBaseline(baseline);
      publish({ calibration: null });
    },
    dispose: () => subscriptions.forEach((unsubscribe) => unsubscribe()),
  };
}
