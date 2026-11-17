// Bluetooth permissions per Android version (10 §4, P7):
//  - Android 12+ (API 31): BLUETOOTH_SCAN (declared neverForLocation) + BLUETOOTH_CONNECT. No location.
//  - Android 8–11: the OS requires ACCESS_FINE_LOCATION to scan; TARA explains first and never reads location.
//  - iOS / web: nothing to request here.
import { PermissionsAndroid, Platform } from 'react-native';

const ANDROID_12 = 31;

const androidVersion = (): number => (Platform.OS === 'android' ? Number(Platform.Version) : Number.POSITIVE_INFINITY);

/** True when the phone will show its "location" dialog for Bluetooth, so TARA's explanation must come first. */
export function needsLocationExplanation(): boolean {
  return Platform.OS === 'android' && androidVersion() < ANDROID_12;
}

/** Asks for exactly what this Android version needs; resolves true when scanning is allowed. */
export async function requestBluetoothPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const P = PermissionsAndroid.PERMISSIONS;
  if (androidVersion() >= ANDROID_12) {
    const result = await PermissionsAndroid.requestMultiple([P.BLUETOOTH_SCAN, P.BLUETOOTH_CONNECT]);
    return Object.values(result).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  }
  return (await PermissionsAndroid.request(P.ACCESS_FINE_LOCATION)) === PermissionsAndroid.RESULTS.GRANTED;
}
