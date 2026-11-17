// Tarha GATT protocol (07 §2): UUIDs, the 6-byte status packet, control opcodes, base64 (react-native-ble-plx
// moves bytes as base64 strings) and the reconnect backoff. Pure — shared by the phone transport, the tests and
// documented for the firmware (firmware/src/protocol.h must match).
import { COOL_MAX_DURATION_S, RECONNECT_BACKOFF_MAX_S, RECONNECT_BACKOFF_START_S } from '../engine/constants';
import { TaraError } from '../shared/errors';
import type { TarhaCooling, TarhaStatus } from '../shared/types';

export const UUIDS = {
  service: '7a1a0001-5f3e-4b8a-9d2c-1e6f0a7b3c00',
  metrics: '7a1a0002-5f3e-4b8a-9d2c-1e6f0a7b3c00',
  status: '7a1a0003-5f3e-4b8a-9d2c-1e6f0a7b3c00',
  control: '7a1a0004-5f3e-4b8a-9d2c-1e6f0a7b3c00',
} as const;

/** Advertised name prefix, e.g. "TARA-3F2A". */
export const TARHA_NAME_PREFIX = 'TARA-';
export const PROTOCOL_VERSION = 1;
export const STATUS_PACKET_BYTES = 6;

export const OPCODE = { coolOn: 0x01, coolOff: 0x02, blink: 0x03, ping: 0x04 } as const;

const COOLING_CODES: readonly TarhaCooling[] = ['off', 'on', 'locked_battery', 'locked_rest', 'fault'];

export type ControlCommand = { op: 'coolOn'; durationS: number } | { op: 'coolOff' } | { op: 'blink' } | { op: 'ping' };

export function encodeControl(cmd: ControlCommand): Uint8Array {
  if (cmd.op !== 'coolOn') return Uint8Array.of(OPCODE[cmd.op]);
  if (!Number.isInteger(cmd.durationS) || cmd.durationS <= 0 || cmd.durationS > COOL_MAX_DURATION_S) {
    throw new TaraError('VALIDATION_ERROR', 'cooling duration');
  }
  return Uint8Array.of(OPCODE.coolOn, cmd.durationS & 0xff, cmd.durationS >> 8);
}

export function decodeControl(bytes: Uint8Array): ControlCommand | null {
  switch (bytes[0]) {
    case OPCODE.coolOn:
      return bytes.length >= 3 ? { op: 'coolOn', durationS: bytes[1]! | (bytes[2]! << 8) } : null;
    case OPCODE.coolOff:
      return { op: 'coolOff' };
    case OPCODE.blink:
      return { op: 'blink' };
    case OPCODE.ping:
      return { op: 'ping' };
    default:
      return null;
  }
}

export function encodeStatus(s: TarhaStatus): Uint8Array {
  const remaining = Math.max(0, Math.min(0xffff, Math.round(s.coolingRemainingS)));
  return Uint8Array.of(PROTOCOL_VERSION, Math.round(s.batteryPct), COOLING_CODES.indexOf(s.cooling), remaining & 0xff, remaining >> 8, s.faults);
}

/** Status packet → TarhaStatus; malformed or unsupported → PACKET_INVALID / BLE_PROTOCOL_VERSION. */
export function decodeStatus(bytes: Uint8Array): TarhaStatus {
  if (bytes.length < STATUS_PACKET_BYTES) throw new TaraError('PACKET_INVALID', 'status length');
  if (bytes[0] !== PROTOCOL_VERSION) throw new TaraError('BLE_PROTOCOL_VERSION');
  const cooling = COOLING_CODES[bytes[2]!];
  if (cooling === undefined || bytes[1]! > 100) throw new TaraError('PACKET_INVALID', 'status value');
  return { batteryPct: bytes[1]!, cooling, coolingRemainingS: bytes[3]! | (bytes[4]! << 8), faults: bytes[5]! };
}

/** 09 §2: reconnect after 2 s → 4 s → 8 s → … at most 60 s. `attempt` starts at 0. */
export function reconnectDelayMs(attempt: number): number {
  const seconds = Math.min(RECONNECT_BACKOFF_MAX_S, RECONNECT_BACKOFF_START_S * 2 ** Math.max(0, attempt));
  return seconds * 1000;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b, c] = [bytes[i]!, bytes[i + 1], bytes[i + 2]];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + (b === undefined ? '=' : B64[(n >> 6) & 63]!) + (c === undefined ? '=' : B64[n & 63]!);
  }
  return out;
}

export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const chunk = [0, 1, 2, 3].map((k) => B64.indexOf(clean[i + k] ?? 'A'));
    const n = (chunk[0]! << 18) | (chunk[1]! << 12) | (chunk[2]! << 6) | chunk[3]!;
    bytes.push((n >> 16) & 0xff);
    if (i + 2 < clean.length) bytes.push((n >> 8) & 0xff);
    if (i + 3 < clean.length) bytes.push(n & 0xff);
  }
  return Uint8Array.from(bytes);
}
