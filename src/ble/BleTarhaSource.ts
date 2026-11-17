// The real tarha as a TarhaSource (09 §2, 07 §2). Talks to a BleTransport (react-native-ble-plx on the phone,
// a firmware simulator in tests), so the rules below are tested without hardware:
//  - connect refuses a link that is not encrypted (BLE_INSECURE_LINK);
//  - metrics decode with source 'tarha'; a protocol-version mismatch stops interpretation ("Please update TARA");
//  - coolOn > 1200 s → VALIDATION_ERROR; commands need a live link (BLE_DISCONNECTED);
//  - an unexpected drop reconnects with backoff 2 s → 4 s → 8 s … max 60 s until disconnect()/forget().
import { TaraError } from '../shared/errors';
import { Listeners, type ConnectionState, type FoundTarha, type TarhaSource, type Unsubscribe } from '../shared/tarhaSource';
import type { Clock, MetricsSample, TarhaStatus } from '../shared/types';
import { decodeMetrics, isPacketError } from '../signal/packet';
import { decodeStatus, encodeControl, reconnectDelayMs, type ControlCommand } from './protocol';

export type CharKey = 'metrics' | 'status' | 'control';

/** One open GATT connection. */
export interface BleLink {
  /** True only on an encrypted (bonded) link — 07 §2.2. */
  isEncrypted(): Promise<boolean>;
  read(char: CharKey): Promise<Uint8Array>;
  write(char: CharKey, bytes: Uint8Array): Promise<void>;
  monitor(char: CharKey, cb: (bytes: Uint8Array) => void): Unsubscribe;
  onDisconnected(cb: () => void): Unsubscribe;
  close(): Promise<void>;
}

export interface BleTransport {
  scan(timeoutMs: number): Promise<FoundTarha[]>;
  connect(id: string): Promise<BleLink>;
}

export interface Timers {
  set(cb: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const GLOBAL_TIMERS: Timers = {
  set: (cb, ms) => setTimeout(cb, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export class BleTarhaSource implements TarhaSource {
  readonly kind = 'tarha' as const;
  private readonly metrics = new Listeners<MetricsSample>();
  private readonly statuses = new Listeners<TarhaStatus>();
  private readonly connections = new Listeners<ConnectionState>();
  private link: BleLink | null = null;
  private subscriptions: Unsubscribe[] = [];
  private deviceId: string | null = null;
  private isWanted = false;
  private attempt = 0;
  private reconnectHandle: unknown = null;
  /** Set when the tarha speaks a protocol this app doesn't support (07 §2.6). */
  lastError: TaraError | null = null;

  constructor(
    private readonly transport: BleTransport,
    private readonly clock: Clock,
    private readonly timers: Timers = GLOBAL_TIMERS,
  ) {}

  scan(timeoutMs: number): Promise<FoundTarha[]> {
    return this.transport.scan(timeoutMs);
  }

  /** Identify a tarha during pairing: its LED blinks for 3 s (07 §2.5). */
  async blink(id: string): Promise<void> {
    if (this.link !== null && this.deviceId === id) return this.link.write('control', encodeControl({ op: 'blink' }));
    const temp = await this.transport.connect(id);
    try {
      await temp.write('control', encodeControl({ op: 'blink' }));
    } finally {
      await temp.close();
    }
  }

  async connect(id: string): Promise<void> {
    this.deviceId = id;
    this.isWanted = true;
    this.attempt = 0;
    this.lastError = null;
    await this.open();
  }

  /** Daily mode (03 Flow 7 step 1): reconnect to the remembered tarha whenever it is reachable, with backoff.
   *  Never retries an insecure link. */
  keepConnecting(id: string): void {
    this.deviceId = id;
    this.isWanted = true;
    this.attempt = 0;
    this.open().catch((error: unknown) => {
      if (this.isWanted && !(error instanceof TaraError && error.code === 'BLE_INSECURE_LINK')) this.scheduleReconnect();
    });
  }

  async disconnect(): Promise<void> {
    this.isWanted = false;
    this.cancelReconnect();
    await this.closeLink();
    this.connections.emit('disconnected');
  }

  /** Forget the tarha (03 Flow 5 "No", Flow 13). 🟡 Removing the Android bond needs the system Bluetooth settings. */
  async forget(): Promise<void> {
    await this.disconnect();
    this.deviceId = null;
  }

  onMetrics(cb: (sample: MetricsSample) => void): Unsubscribe {
    return this.metrics.add(cb);
  }

  onStatus(cb: (status: TarhaStatus) => void): Unsubscribe {
    return this.statuses.add(cb);
  }

  onConnection(cb: (state: ConnectionState) => void): Unsubscribe {
    return this.connections.add(cb);
  }

  coolOn(durationS: number): Promise<void> {
    return this.command({ op: 'coolOn', durationS });
  }

  coolOff(): Promise<void> {
    return this.command({ op: 'coolOff' });
  }

  private async command(cmd: ControlCommand): Promise<void> {
    const bytes = encodeControl(cmd); // validates before anything is sent
    if (this.link === null) throw new TaraError('BLE_DISCONNECTED');
    await this.link.write('control', bytes);
  }

  private async open(): Promise<void> {
    if (this.deviceId === null) throw new TaraError('BLE_NOT_FOUND');
    this.connections.emit('connecting');
    const link = await this.transport.connect(this.deviceId);
    if (!(await link.isEncrypted())) {
      await link.close();
      this.isWanted = false;
      this.connections.emit('disconnected');
      throw new TaraError('BLE_INSECURE_LINK');
    }
    this.link = link;
    this.subscriptions = [
      link.monitor('metrics', (bytes) => this.onMetricsBytes(bytes)),
      link.monitor('status', (bytes) => this.onStatusBytes(bytes)),
      link.onDisconnected(() => this.onDrop()),
    ];
    this.attempt = 0;
    this.connections.emit('connected');
    this.onStatusBytes(await link.read('status'));
  }

  private onMetricsBytes(bytes: Uint8Array): void {
    const sample = decodeMetrics(bytes, 'tarha', this.clock.monotonicMs());
    if (!isPacketError(sample)) {
      this.metrics.emit(sample);
      return;
    }
    if (sample.reason === 'version') this.refuseProtocol();
    // Other bad packets are simply invalid seconds (07 §2.7).
  }

  private onStatusBytes(bytes: Uint8Array): void {
    try {
      this.statuses.emit(decodeStatus(bytes));
    } catch (error) {
      if (error instanceof TaraError && error.code === 'BLE_PROTOCOL_VERSION') this.refuseProtocol();
    }
  }

  /** 07 §2.6: never interpret a protocol we don't know — stop and say "Please update TARA". */
  private refuseProtocol(): void {
    this.lastError = new TaraError('BLE_PROTOCOL_VERSION');
    void this.disconnect();
  }

  private onDrop(): void {
    void this.closeLink();
    this.connections.emit('disconnected');
    if (this.isWanted) this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    this.cancelReconnect();
    const delay = reconnectDelayMs(this.attempt);
    this.attempt += 1;
    this.reconnectHandle = this.timers.set(() => {
      this.reconnectHandle = null;
      if (!this.isWanted) return;
      this.open().catch(() => {
        if (this.isWanted) this.scheduleReconnect();
      });
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectHandle !== null) this.timers.clear(this.reconnectHandle);
    this.reconnectHandle = null;
  }

  private async closeLink(): Promise<void> {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions = [];
    const link = this.link;
    this.link = null;
    if (link !== null) await link.close().catch(() => undefined); // already gone is fine
  }
}
