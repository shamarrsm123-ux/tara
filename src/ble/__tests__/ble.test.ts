// ble/ against a simulated tarha (09 §2, 07 §2, 12 §3–4): no hardware needed.
import { isTaraError } from '../../shared/errors';
import type { ConnectionState } from '../../shared/tarhaSource';
import type { MetricsSample, TarhaStatus } from '../../shared/types';
import { crc8, encodeMetrics } from '../../signal/packet';
import { BleTarhaSource } from '../BleTarhaSource';
import { decodeControl, decodeStatus, encodeControl, encodeStatus, fromBase64, reconnectDelayMs, toBase64 } from '../protocol';
import { makeSimTarha, manualTimers } from './simTransport';

const clock = { nowMs: () => 0, monotonicMs: () => 0 };
const flush = () => new Promise((r) => setImmediate(r));

function setup() {
  const sim = makeSimTarha();
  const timers = manualTimers();
  const source = new BleTarhaSource(sim.transport, clock, timers);
  const states: ConnectionState[] = [];
  const samples: MetricsSample[] = [];
  const statuses: TarhaStatus[] = [];
  source.onConnection((s) => states.push(s));
  source.onMetrics((s) => samples.push(s));
  source.onStatus((s) => statuses.push(s));
  return { sim, timers, source, states, samples, statuses };
}

describe('protocol (07 §2.4–2.5)', () => {
  test('status and control round-trip; cooling longer than 20 min is refused before sending', () => {
    const status: TarhaStatus = { batteryPct: 64, cooling: 'locked_rest', coolingRemainingS: 300, faults: 0 };
    expect(decodeStatus(encodeStatus(status))).toEqual(status);
    expect(decodeControl(encodeControl({ op: 'coolOn', durationS: 600 }))).toEqual({ op: 'coolOn', durationS: 600 });
    expect(() => encodeControl({ op: 'coolOn', durationS: 1201 })).toThrow();
    expect(() => decodeStatus(Uint8Array.of(2, 50, 0, 0, 0, 0))).toThrow();
  });

  test('base64 matches the standard encoding (react-native-ble-plx wire format)', () => {
    expect(toBase64(Uint8Array.of(1, 2, 3, 250))).toBe('AQID+g==');
    expect([...fromBase64('AQID+g==')]).toEqual([1, 2, 3, 250]);
    expect([...fromBase64(toBase64(Uint8Array.of(9, 8)))]).toEqual([9, 8]);
  });

  test('reconnect backoff: 2 s → 4 s → 8 s … max 60 s (09 §2)', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(reconnectDelayMs)).toEqual([2000, 4000, 8000, 16000, 32000, 60000, 60000]);
  });
});

describe('BleTarhaSource (09 §2)', () => {
  test('an unencrypted link is refused with BLE_INSECURE_LINK and closed (12 §4)', async () => {
    const { sim, source, states } = setup();
    sim.isEncrypted = false;
    const error = await source.connect('AA:01').catch((e: unknown) => e);
    expect(isTaraError(error, 'BLE_INSECURE_LINK')).toBe(true);
    expect(sim.openLinks()).toBe(0);
    expect(states.at(-1)).toBe('disconnected');
  });

  test('connected: status read at once; metrics decode as real tarha samples; bad packets are dropped', async () => {
    const { sim, source, states, samples, statuses } = setup();
    await source.connect('AA:01');
    expect(states).toEqual(['connecting', 'connected']);
    expect(statuses[0]).toMatchObject({ batteryPct: 80, cooling: 'off' });
    sim.sendMetrics({ fit: 88 });
    sim.sendRaw('metrics', Uint8Array.of(1, 2, 3));
    expect(samples).toHaveLength(1);
    expect(samples[0]).toMatchObject({ source: 'tarha', fit: 88 });
  });

  test('cooling commands reach the firmware, which reports its own state', async () => {
    const { sim, source, statuses } = setup();
    await expect(source.coolOn(600)).rejects.toMatchObject({ code: 'BLE_DISCONNECTED' });
    await source.connect('AA:01');
    await expect(source.coolOn(1500)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(sim.writes).toEqual([]); // refused before anything was sent
    await source.coolOn(600);
    expect(statuses.at(-1)).toMatchObject({ cooling: 'on', coolingRemainingS: 600 });
    await source.coolOff();
    expect(statuses.at(-1)).toMatchObject({ cooling: 'off' });
    expect(sim.writes.map((w) => decodeControl(w.bytes)?.op)).toEqual(['coolOn', 'coolOff']);
  });

  test('a dropped link reconnects with backoff until it succeeds; disconnect() stops it', async () => {
    const { sim, timers, source, states } = setup();
    await source.connect('AA:01');
    sim.isReachable = false;
    sim.drop();
    expect(states.at(-1)).toBe('disconnected');
    timers.runNext();
    await flush();
    timers.runNext();
    await flush();
    sim.isReachable = true;
    timers.runNext();
    await flush();
    expect(timers.delays).toEqual([2000, 4000, 8000]);
    expect(states.at(-1)).toBe('connected');

    await source.disconnect();
    sim.drop();
    expect(timers.delays).toHaveLength(3); // no new reconnect after an intentional disconnect
  });

  test('a tarha speaking another protocol version is not interpreted (07 §2.6)', async () => {
    const { sim, source, samples } = setup();
    await source.connect('AA:01');
    const bytes = encodeMetrics({ seq: 1, theta: 1000, alpha: 1000, beta: 1000, fit: 90, skinTempC: 34, motion: false, saturated: false });
    bytes[0] = 2; // a newer protocol version, with a valid checksum
    bytes[13] = crc8(bytes, 13);
    sim.sendRaw('metrics', bytes);
    await flush();
    expect(samples).toHaveLength(0);
    expect(source.lastError?.code).toBe('BLE_PROTOCOL_VERSION');
    expect(sim.openLinks()).toBe(0);
  });

  test('blink identifies a tarha without staying connected', async () => {
    const { sim, source } = setup();
    expect(await source.scan(10_000)).toEqual([{ id: 'AA:01', name: 'TARA-3F2A' }]);
    await source.blink('AA:01');
    expect(decodeControl(sim.writes[0]!.bytes)).toEqual({ op: 'blink' });
    expect(sim.openLinks()).toBe(0);
  });

  test('Daily mode keeps trying a remembered tarha that is off, with backoff (03 Flow 7)', async () => {
    const { sim, timers, source, states } = setup();
    sim.isReachable = false;
    source.keepConnecting('AA:01');
    await flush();
    expect(timers.delays).toEqual([2000]);
    sim.isReachable = true;
    timers.runNext();
    await flush();
    expect(states.at(-1)).toBe('connected');
  });
});
