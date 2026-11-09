// `metrics` packet codec (07 §2.3, §2.7). 14 bytes, little-endian. No raw waveform is ever transmitted.
//
//  0 ver u8 · 1 seq u16 · 3 theta u16 · 5 alpha u16 · 7 beta u16 · 9 fit u8 · 10 temp i16 (×100 °C,
//  0x7FFF = none) · 12 flags u8 (bit0 motion, bit1 saturation) · 13 crc8 over bytes 0–12
//
// 🟡 07 says "CRC-8" without a variant: CRC-8/SMBUS (poly 0x07, init 0x00, no reflection, no xorout).
// Firmware (Phase 7) must use the same. A packet longer than 14 bytes with a supported version is accepted
// and its trailing bytes ignored (07 §2.6: new fields are only appended).
import { METRICS_PACKET_BYTES, PROTOCOL_VERSION } from '../engine/constants';
import type { MetricsSample, SourceKind } from '../shared/types';

const CRC_POLY = 0x07;
const CRC_OFFSET = 13;
const TEMP_NONE = 0x7fff;
const TEMP_SCALE = 100;
const FLAG_MOTION = 0b01;
const FLAG_SATURATION = 0b10;
const U16_MAX = 0xffff;

export type PacketErrorReason = 'length' | 'crc' | 'version' | 'zeroBands';

export interface PacketError {
  kind: 'packetError';
  code: 'PACKET_INVALID' | 'BLE_PROTOCOL_VERSION';
  reason: PacketErrorReason;
}

const packetError = (reason: PacketErrorReason): PacketError => ({
  kind: 'packetError',
  code: reason === 'version' ? 'BLE_PROTOCOL_VERSION' : 'PACKET_INVALID',
  reason,
});

export function isPacketError(value: MetricsSample | PacketError): value is PacketError {
  return (value as PacketError).kind === 'packetError';
}

export function crc8(bytes: Uint8Array, length: number = bytes.length): number {
  let crc = 0;
  for (let i = 0; i < length; i += 1) {
    crc ^= bytes[i]!;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x80 ? ((crc << 1) ^ CRC_POLY) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}

export function decodeMetrics(bytes: Uint8Array, source: SourceKind, mono: number): MetricsSample | PacketError {
  if (bytes.length < METRICS_PACKET_BYTES) return packetError('length');
  if (crc8(bytes, CRC_OFFSET) !== bytes[CRC_OFFSET]) return packetError('crc');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint8(0) !== PROTOCOL_VERSION) return packetError('version');

  const theta = view.getUint16(3, true);
  const alpha = view.getUint16(5, true);
  const beta = view.getUint16(7, true);
  if (theta === 0 && alpha === 0 && beta === 0) return packetError('zeroBands');

  const rawTemp = view.getInt16(10, true);
  const flags = view.getUint8(12);
  return {
    source,
    seq: view.getUint16(1, true),
    theta,
    alpha,
    beta,
    fit: view.getUint8(9),
    skinTempC: rawTemp === TEMP_NONE ? null : rawTemp / TEMP_SCALE,
    motion: (flags & FLAG_MOTION) !== 0,
    saturated: (flags & FLAG_SATURATION) !== 0,
    receivedAtMono: mono,
  };
}

export interface MetricsFields {
  seq: number;
  theta: number;
  alpha: number;
  beta: number;
  fit: number;
  skinTempC: number | null;
  motion: boolean;
  saturated: boolean;
}

const toU16 = (v: number) => Math.min(U16_MAX, Math.max(0, Math.round(v)));

/** Encodes a packet exactly as the firmware does. Used by demo/ and the firmware simulator. */
export function encodeMetrics(f: MetricsFields): Uint8Array {
  const bytes = new Uint8Array(METRICS_PACKET_BYTES);
  const view = new DataView(bytes.buffer);
  view.setUint8(0, PROTOCOL_VERSION);
  view.setUint16(1, f.seq & U16_MAX, true);
  view.setUint16(3, toU16(f.theta), true);
  view.setUint16(5, toU16(f.alpha), true);
  view.setUint16(7, toU16(f.beta), true);
  view.setUint8(9, Math.min(100, Math.max(0, Math.round(f.fit))));
  view.setInt16(10, f.skinTempC === null ? TEMP_NONE : Math.round(f.skinTempC * TEMP_SCALE), true);
  view.setUint8(12, (f.motion ? FLAG_MOTION : 0) | (f.saturated ? FLAG_SATURATION : 0));
  view.setUint8(CRC_OFFSET, crc8(bytes, CRC_OFFSET));
  return bytes;
}
