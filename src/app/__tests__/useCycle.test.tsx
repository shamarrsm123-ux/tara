// useCycle → engine (07 §10.3): today's support level reaches the engine, and drops back to 'none' when turned off.
import { act, renderHook } from '@testing-library/react-native';
import type { MonitorSession } from '../../engine/session';
import type { EngineInput } from '../../engine/types';
import { DEFAULT_BASELINE } from '../../signal/stress';
import { DEFAULT_SETTINGS, type Settings } from '../../shared/types';
import { createMemoryStore } from '../../store/memoryStore';
import { useCycle } from '../useCycle';

describe('useCycle', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 10, 17, 10, 0) }));
  afterEach(() => jest.useRealTimers());

  test('late luteal → engine gets "more"; turning it off → "none"', async () => {
    const store = createMemoryStore(() => Date.now());
    await store.createFromTrySession({ lang: 'en', baseline: DEFAULT_BASELINE, prefs: {} });
    await store.addCycleStart({ dayMs: new Date(2026, 9, 26).getTime(), isEstimated: false });
    const sent: EngineInput[] = [];
    const session = { dispatch: (i: EngineInput) => sent.push(i) } as unknown as MonitorSession;
    const on: Settings = { ...DEFAULT_SETTINGS, cycleAware: true };
    const now = Date.now();
    const hook = await renderHook(({ settings }: { settings: Settings }) => useCycle(store, settings, session, true, now), { initialProps: { settings: on } });
    await act(async () => {
      jest.advanceTimersByTime(10);
      await Promise.resolve();
    });
    expect(hook.result.current.status?.phase).toBe('lateLuteal');
    expect(sent.at(-1)).toEqual({ t: 'cycleSupport', support: 'more' });
    await hook.rerender({ settings: { ...on, cycleAware: false } });
    expect(hook.result.current.status).toBeNull();
    expect(sent.at(-1)).toEqual({ t: 'cycleSupport', support: 'none' });
  });
});
