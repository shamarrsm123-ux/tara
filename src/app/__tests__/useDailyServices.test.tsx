// Regression: on a platform without battery events (the web preview) Daily mode must not crash — the
// phone-battery alert just doesn't run (found 2026-11-17: blank screen after Save on web).
import { renderHook } from '@testing-library/react-native';
import * as Battery from 'expo-battery';
import type { MonitorSession } from '../../engine/session';
import { DEFAULT_BASELINE } from '../../signal/stress';
import { createMemoryStore } from '../../store/memoryStore';
import { useDailyServices } from '../useDailyServices';

test('no battery listener available → Daily services still start and unmount cleanly', async () => {
  jest.mocked(Battery.addBatteryLevelListener).mockImplementationOnce(() => {
    throw new TypeError('ExpoBattery.default.addListener is not a function');
  });
  const store = createMemoryStore(() => Date.now());
  await store.createFromTrySession({ lang: 'en', baseline: DEFAULT_BASELINE, prefs: {} });
  const session = { dispatch: jest.fn() } as unknown as MonitorSession;
  const hook = await renderHook(() => useDailyServices(store, null, session, true));
  expect(() => hook.unmount()).not.toThrow();
});
