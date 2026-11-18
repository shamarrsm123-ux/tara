// App Lock with the phone's own screen lock (03 Flow 17, 02 §8.12, P11): TARA never stores a password. If the
// phone has no screen lock, TARA says it can't lock and offers the phone's settings.
import * as LocalAuthentication from 'expo-local-authentication';
import { Linking } from 'react-native';

export type LockAvailability = 'ready' | 'noScreenLock' | 'unsupported';

export async function lockAvailability(): Promise<LockAvailability> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level === LocalAuthentication.SecurityLevel.NONE ? 'noScreenLock' : 'ready';
  } catch {
    return 'unsupported';
  }
}

/** Shows the phone's unlock (PIN / pattern / fingerprint). Resolves true when she unlocked. */
export async function unlockWithPhone(prompt: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, disableDeviceFallback: false });
    return result.success;
  } catch {
    return false;
  }
}

export function openPhoneSettings(): void {
  void Linking.openSettings().catch(() => undefined);
}
