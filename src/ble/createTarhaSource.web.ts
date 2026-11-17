// Web preview (dev tool, 06 §2): browsers can't talk to the tarha, so there is no Bluetooth — Flow 1 then offers
// "Use demo instead", exactly as when no tarha is found.
import type { Clock } from '../shared/types';
import type { BleTarhaSource } from './BleTarhaSource';

export interface Bluetooth {
  source: BleTarhaSource;
  needsLocationExplanation: boolean;
  requestPermission(): Promise<boolean>;
}

export function createBluetooth(_clock: Clock): Bluetooth | null {
  return null;
}
