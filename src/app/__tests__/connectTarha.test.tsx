// Flow 1 with a (simulated) real tarha (03 Flow 1 step 4, 10 §4, 13 Phase 7): explanation before the phone's
// permission dialog, the "location" sentence on Android 8–11, one tarha → connected (no DEMO label), several →
// choose with Blink, permission refused → message + demo offer.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createMemoryStore } from '../../store/memoryStore';
import { decodeControl } from '../../ble/protocol';
import { translatorFor } from '../../ui/i18n';
import { TryFlow } from '../TryFlow';
import { INITIAL_TRY } from '../tryNavigation';

const mockBt = { isGranted: true, sim: null as null | ReturnType<typeof import('../../ble/__tests__/simTransport').makeSimTarha> };

jest.mock('../../ble/createTarhaSource', () => ({
  createBluetooth: () => {
    const { makeSimTarha } = jest.requireActual('../../ble/__tests__/simTransport');
    const { BleTarhaSource } = jest.requireActual('../../ble/BleTarhaSource');
    mockBt.sim = makeSimTarha();
    return {
      source: new BleTarhaSource(mockBt.sim!.transport, { nowMs: () => Date.now(), monotonicMs: () => Date.now() }),
      needsLocationExplanation: true,
      requestPermission: async () => mockBt.isGranted,
    };
  },
}));

const t = translatorFor('en');
const press = (id: string) => fireEvent.press(screen.getByTestId(id));
async function seconds(n: number, perSecond?: () => void) {
  for (let i = 0; i < n; i += 1) {
    await act(async () => {
      perSecond?.();
      jest.advanceTimersByTime(1000);
    });
  }
}

async function toConnect() {
  await render(<TryFlow store={createMemoryStore()} initial={INITIAL_TRY} />);
  for (const id of ['lang-en', 'language-continue', 'welcome-try', 'connect-button']) await press(id);
}

// Full-UI flows drive fake time through many renders; give them room under a loaded coverage run.
jest.setTimeout(30_000);

describe('Flow 1 with a real tarha (13 Phase 7)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 17, 9, 0) });
    mockBt.isGranted = true;
  });
  afterEach(() => jest.useRealTimers());

  test('explanation first (with the Android 8–11 location sentence) → one tarha connects as real data', async () => {
    await toConnect();
    expect(screen.getByText(t('connect.btExplain'))).toBeTruthy();
    expect(screen.getByTestId('connect-location-explain')).toHaveTextContent(t('connect.locationExplain'));
    await press('connect-allow');
    await seconds(1);
    expect(screen.getByTestId('connect-next').props.accessibilityState).toMatchObject({ disabled: true });
    await seconds(7, () => mockBt.sim!.sendMetrics({ fit: 92 }));
    expect(screen.getByTestId('connect-next').props.accessibilityState).toMatchObject({ disabled: false });
    expect(screen.queryByText(t('demo.ribbon'))).toBeNull(); // real data is never labeled demo
  });

  test('several tarhas → choose; Blink lights the chosen one; "This is mine" connects', async () => {
    await render(<TryFlow store={createMemoryStore()} initial={INITIAL_TRY} />);
    mockBt.sim!.found = [
      { id: 'AA:01', name: 'TARA-3F2A' },
      { id: 'AA:02', name: 'TARA-77C1' },
    ];
    for (const id of ['lang-en', 'language-continue', 'welcome-try', 'connect-button', 'connect-allow']) await press(id);
    await seconds(1);
    expect(screen.getByText(t('connect.choose'))).toBeTruthy();
    await press('connect-blink-AA:02');
    await seconds(1);
    expect(mockBt.sim!.writes.map((w) => [w.id, decodeControl(w.bytes)?.op])).toEqual([['AA:02', 'blink']]);
    await press('connect-choose-AA:02');
    await seconds(1);
    expect(screen.getByTestId('connect-next')).toBeTruthy();
  });

  test('Bluetooth refused → plain message, Try again and Use demo instead', async () => {
    mockBt.isGranted = false;
    await toConnect();
    await press('connect-allow');
    await seconds(1);
    expect(screen.getByTestId('connect-denied')).toHaveTextContent(t('connect.denied'));
    expect(screen.getByTestId('connect-demo')).toBeTruthy();
    expect(screen.getByTestId('connect-retry')).toBeTruthy();
  });
});
