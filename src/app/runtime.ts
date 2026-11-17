// Creating and tearing down the monitoring runtime (source + session). The Try story runs on the demo source;
// Daily mode after a relaunch runs on the real-tarha source (none until BLE, Phase 7). Tearing down disconnects
// and forgets the tarha (03 Flow 5 "No", Flow 13 step 3).
import { DemoTarhaSource } from '../demo/DemoTarhaSource';
import { createMonitorSession, type MonitorSession } from '../engine/session';
import type { EngineAction } from '../engine/types';
import type { Baseline } from '../signal/stress';
import { systemClock } from '../shared/clock';
import type { TarhaSource } from '../shared/tarhaSource';
import { NoTarhaSource } from './noTarhaSource';

export interface Runtime {
  source: TarhaSource;
  session: MonitorSession;
  /** Set when the demo source is active — everything shown is labeled DEMO and nothing is stored. */
  demo: DemoTarhaSource | null;
}

type OnAction = (action: EngineAction) => void;

export function createDemoRuntime(baseline: Baseline, onAction: OnAction): Runtime {
  const demo = new DemoTarhaSource({ clock: systemClock, scenario: 'story' });
  const session = createMonitorSession({
    source: demo,
    clock: systemClock,
    baseline,
    timing: { sustainS: demo.scenario.sustainOverrideS },
    onAction,
  });
  return { source: demo, session, demo };
}

export function createDailyRuntime(baseline: Baseline, onAction: OnAction): Runtime {
  const source = new NoTarhaSource();
  return { source, session: createMonitorSession({ source, clock: systemClock, baseline, onAction }), demo: null };
}

const discarded = new WeakSet<Runtime>();

/** Stops monitoring, disconnects and forgets the tarha. Safe to call more than once. */
export async function discardRuntime(runtime: Runtime | null): Promise<void> {
  if (runtime === null || discarded.has(runtime)) return;
  discarded.add(runtime);
  runtime.session.dispose();
  await runtime.source.disconnect().catch(() => undefined); // already gone is fine
  await runtime.source.forget().catch(() => undefined);
}
