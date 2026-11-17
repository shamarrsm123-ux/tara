// Test transport: a simulated tarha behind BleTransport, built on the firmware simulator (demo/firmware.ts) so
// cooling limits behave like the ESP32. Lets ble/ be tested without hardware (12 §3).
import { commandFirmware, initialFirmware, statusOf, type FirmwareState } from '../../demo/firmware';
import type { FoundTarha, Unsubscribe } from '../../shared/tarhaSource';
import { encodeMetrics } from '../../signal/packet';
import type { BleLink, BleTransport, CharKey, Timers } from '../BleTarhaSource';
import { decodeControl, encodeStatus } from '../protocol';

export interface SimTarha {
  transport: BleTransport;
  found: FoundTarha[];
  /** Set false to offer an unencrypted link (12 §4 "Insecure BLE link refused"). */
  isEncrypted: boolean;
  /** When false, connect attempts fail (tarha off / out of range). */
  isReachable: boolean;
  firmware: FirmwareState;
  writes: { id: string; char: CharKey; bytes: Uint8Array }[];
  openLinks(): number;
  sendMetrics(fields?: Partial<Parameters<typeof encodeMetrics>[0]>): void;
  sendRaw(char: CharKey, bytes: Uint8Array): void;
  /** Drops the current link as if the tarha went out of range. */
  drop(): void;
}

export function makeSimTarha(): SimTarha {
  const listeners = new Map<CharKey, Set<(b: Uint8Array) => void>>();
  const dropListeners = new Set<() => void>();
  let links = 0;
  let seq = 0;
  const sim: SimTarha = {
    found: [{ id: 'AA:01', name: 'TARA-3F2A' }],
    isEncrypted: true,
    isReachable: true,
    firmware: initialFirmware(80),
    writes: [],
    openLinks: () => links,
    sendMetrics(fields = {}) {
      const bytes = encodeMetrics({ seq: seq++, theta: 1000, alpha: 1000, beta: 1000, fit: 90, skinTempC: 34, motion: false, saturated: false, ...fields });
      sim.sendRaw('metrics', bytes);
    },
    sendRaw(char, bytes) {
      listeners.get(char)?.forEach((cb) => cb(bytes));
    },
    drop() {
      links = 0;
      [...dropListeners].forEach((cb) => cb());
    },
    transport: {
      scan: async () => sim.found,
      async connect(id: string): Promise<BleLink> {
        if (!sim.isReachable) throw new Error('unreachable');
        links += 1;
        let isOpen = true;
        const link: BleLink = {
          isEncrypted: async () => sim.isEncrypted,
          read: async () => encodeStatus(statusOf(sim.firmware)),
          async write(char, bytes) {
            sim.writes = [...sim.writes, { id, char, bytes }];
            const cmd = decodeControl(bytes);
            if (cmd?.op === 'coolOn' || cmd?.op === 'coolOff') {
              sim.firmware = commandFirmware(sim.firmware, cmd);
              sim.sendRaw('status', encodeStatus(statusOf(sim.firmware)));
            }
          },
          monitor(char, cb): Unsubscribe {
            const set = listeners.get(char) ?? new Set();
            set.add(cb);
            listeners.set(char, set);
            return () => set.delete(cb);
          },
          onDisconnected(cb): Unsubscribe {
            dropListeners.add(cb);
            return () => dropListeners.delete(cb);
          },
          async close() {
            if (isOpen) links = Math.max(0, links - 1);
            isOpen = false;
          },
        };
        return link;
      },
    },
  };
  return sim;
}

/** Manual timers: records every scheduled delay and runs them on demand. */
export function manualTimers(): Timers & { delays: number[]; runNext(): void } {
  const queue: { cb: () => void; ms: number; id: number }[] = [];
  let next = 0;
  const delays: number[] = [];
  return {
    delays,
    set(cb, ms) {
      next += 1;
      queue.push({ cb, ms, id: next });
      delays.push(ms);
      return next;
    },
    clear(handle) {
      const i = queue.findIndex((q) => q.id === handle);
      if (i >= 0) queue.splice(i, 1);
    },
    runNext() {
      queue.shift()?.cb();
    },
  };
}
