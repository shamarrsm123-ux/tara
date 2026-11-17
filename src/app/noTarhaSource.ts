// The real-tarha source until BLE exists (Phase 7): it finds nothing and never connects, so Daily mode after a
// relaunch honestly shows "Tarha not connected" instead of inventing data. Replaced by ble/ in Phase 7.
import { TaraError } from '../shared/errors';
import type { ConnectionState, FoundTarha, TarhaSource, Unsubscribe } from '../shared/tarhaSource';
import type { MetricsSample, TarhaStatus } from '../shared/types';

const NOOP: Unsubscribe = () => undefined;

export class NoTarhaSource implements TarhaSource {
  readonly kind = 'tarha' as const;

  scan(): Promise<FoundTarha[]> {
    return Promise.resolve([]);
  }
  blink(): Promise<void> {
    return Promise.reject(new TaraError('BLE_NOT_FOUND'));
  }
  connect(): Promise<void> {
    return Promise.reject(new TaraError('BLE_NOT_FOUND'));
  }
  disconnect(): Promise<void> {
    return Promise.resolve();
  }
  forget(): Promise<void> {
    return Promise.resolve();
  }
  onMetrics(_cb: (sample: MetricsSample) => void): Unsubscribe {
    return NOOP;
  }
  onStatus(_cb: (status: TarhaStatus) => void): Unsubscribe {
    return NOOP;
  }
  onConnection(_cb: (state: ConnectionState) => void): Unsubscribe {
    return NOOP;
  }
  coolOn(): Promise<void> {
    return Promise.reject(new TaraError('BLE_DISCONNECTED'));
  }
  coolOff(): Promise<void> {
    return Promise.resolve();
  }
}
