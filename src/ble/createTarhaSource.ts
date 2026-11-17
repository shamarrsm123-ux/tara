// Phone: the real tarha over Bluetooth. The web preview resolves createTarhaSource.web.ts (no Bluetooth).
import type { Clock } from '../shared/types';
import { BleTarhaSource } from './BleTarhaSource';
import { needsLocationExplanation, requestBluetoothPermission } from './permissions';
import { plxTransport } from './plxTransport';

export interface Bluetooth {
  source: BleTarhaSource;
  needsLocationExplanation: boolean;
  requestPermission(): Promise<boolean>;
}

export function createBluetooth(clock: Clock): Bluetooth | null {
  return { source: new BleTarhaSource(plxTransport, clock), needsLocationExplanation: needsLocationExplanation(), requestPermission: requestBluetoothPermission };
}
