// Monitoring session (06 §5 pipeline): TarhaSource → signal/ → engine/ → actions, with the last 10 minutes of
// Calm kept in memory for the live graph. No React and no storage: per-second values never leave RAM
// (10 §1). Works the same for the demo and the real tarha because both implement TarhaSource.
import { FitStabilizer, fitLevel } from '../signal/fit';
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

export interface MonitorSnapshot {
  sourceKind: SourceKind;
  connection: ConnectionState;
  calm: number | null;
  zone: Zone;
  fit: FitLevel | null;
  points: readonly GraphPoint[];
  coolingBands: readonly TimeBand[];
  nowMs: number;
  engine: EngineSnapshot;
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
    engine: engine.snapshot(),
  };

  const publish = (patch: Partial<MonitorSnapshot>) => {
    const engineSnap = engine.snapshot();
    const nowMs = clock.nowMs();
    const isCooling = engineSnap.cooling === 'on';
    const wasCooling = snapshot.engine.cooling === 'on';
    snapshot = { ...snapshot, ...patch, nowMs, engine: engineSnap, coolingBands: updateBands(snapshot.coolingBands, isCooling, wasCooling, nowMs) };
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
    const reading = computer.push(sample);
    const fit = fitStabilizer.push(fitLevel(sample), clock.monotonicMs());
    step({ t: 'tick', calm: reading.calm, zone: reading.zone, valid: reading.valid });
    publish({ calm: reading.calm, zone: reading.zone, fit, points: appendWithin(snapshot.points, { tMs: clock.nowMs(), calm: reading.calm }) });
  };

  const onStatus = (status: TarhaStatus) => {
    lastStatus = status;
    step({ t: 'status', status, connected: snapshot.connection === 'connected' });
    publish({});
  };

  const onConnection = (connection: ConnectionState) => {
    snapshot = { ...snapshot, connection };
    if (connection === 'disconnected' && lastStatus !== null) step({ t: 'status', status: lastStatus, connected: false });
    // No stale Calm while not connected (03 Flow 15).
    publish(connection === 'connected' ? {} : { calm: null, zone: 'unknown', fit: null });
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
    dispose: () => subscriptions.forEach((unsubscribe) => unsubscribe()),
  };
}
