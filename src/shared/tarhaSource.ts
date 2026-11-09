// `TarhaSource` (09 §2): implemented by ble/ (real tarha, Phase 7) and demo/ (simulated). Every feature
// works identically on both, and demo data can't be mistaken for real data — `kind` and each sample's
// `source` say where it came from.
import type { MetricsSample, SourceKind, TarhaStatus } from './types';

export type Unsubscribe = () => void;
export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

export interface FoundTarha {
  id: string;
  name: string;
}

export interface TarhaSource {
  readonly kind: SourceKind;
  scan(timeoutMs: number): Promise<FoundTarha[]>;
  blink(id: string): Promise<void>;
  /** Requires a bonded, encrypted link (BLE_INSECURE_LINK otherwise). */
  connect(id: string): Promise<void>;
  disconnect(): Promise<void>;
  /** Removes the bond (and, in the real app, the paired_tarha row). */
  forget(): Promise<void>;
  onMetrics(cb: (sample: MetricsSample) => void): Unsubscribe;
  onStatus(cb: (status: TarhaStatus) => void): Unsubscribe;
  onConnection(cb: (state: ConnectionState) => void): Unsubscribe;
  /** Resolves when the tarha ACKs; cooling state is confirmed via onStatus. > 1200 s → VALIDATION_ERROR. */
  coolOn(durationS: number): Promise<void>;
  coolOff(): Promise<void>;
}

/** Small typed listener set shared by source implementations. */
export class Listeners<T> {
  private callbacks: ReadonlySet<(value: T) => void> = new Set();

  add(cb: (value: T) => void): Unsubscribe {
    this.callbacks = new Set([...this.callbacks, cb]);
    return () => {
      this.callbacks = new Set([...this.callbacks].filter((c) => c !== cb));
    };
  }

  emit(value: T): void {
    this.callbacks.forEach((cb) => cb(value));
  }
}
