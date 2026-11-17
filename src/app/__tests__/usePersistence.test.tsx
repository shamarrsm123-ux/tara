// Daily-mode writes (03 Flow 7 step 3, 05 §3): one row per finished minute, retention on start; nothing when
// inactive (Try mode or the demo source).
import { act, renderHook } from '@testing-library/react-native';
import type { MonitorSession, MonitorSnapshot } from '../../engine/session';
import type { GraphPoint } from '../../shared/types';
import { createMemoryStore } from '../../store/memoryStore';
import { usePersistence } from '../usePersistence';

const M = new Date(2026, 10, 16, 14, 0).getTime();

function fakeSession() {
  let points: GraphPoint[] = [];
  const listeners = new Set<() => void>();
  const session = {
    subscribe: (cb: () => void) => (listeners.add(cb), () => void listeners.delete(cb)),
    getSnapshot: () => ({ points, engine: { cooling: 'off' } }) as unknown as MonitorSnapshot,
  } as unknown as MonitorSession;
  const push = (secondsFrom: number, count: number, calm: number | null) => {
    points = [...points, ...Array.from({ length: count }, (_, i) => ({ tMs: M + (secondsFrom + i) * 1000, calm }))];
    listeners.forEach((cb) => cb());
  };
  return { session, push };
}

async function setUpStore() {
  const store = createMemoryStore(() => M + 120_000);
  await store.createFromTrySession({ lang: 'en', baseline: { m: -0.7, s: 0.25, isDefault: true }, prefs: {} });
  return store;
}

describe('usePersistence', () => {
  test('writes one summary per finished minute (stress = 100 − Calm)', async () => {
    const store = await setUpStore();
    const { session, push } = fakeSession();
    await renderHook(() => usePersistence(store, session, true));
    await act(async () => {
      push(0, 60, 70);
      push(60, 1, 70);
    });
    expect(await store.queryMinutes(0, Number.MAX_SAFE_INTEGER)).toEqual([
      { tsMinute: M, stressMean: 30, stressMax: 30, validSeconds: 60, zone: 'calm', coolingOn: false, source: 'tarha' },
    ]);
  });

  test('inactive (Try mode or demo): nothing is written', async () => {
    const store = await setUpStore();
    const { session, push } = fakeSession();
    await renderHook(() => usePersistence(store, session, false));
    await act(async () => {
      push(0, 61, 70);
    });
    expect(await store.queryMinutes(0, Number.MAX_SAFE_INTEGER)).toEqual([]);
  });
});
