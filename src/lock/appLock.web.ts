// Web preview: there is no phone screen lock to use, so App Lock reports it can't lock (never a fake lock).
export type LockAvailability = 'ready' | 'noScreenLock' | 'unsupported';

export async function lockAvailability(): Promise<LockAvailability> {
  return 'unsupported';
}

export async function unlockWithPhone(_prompt: string): Promise<boolean> {
  return false;
}

export function openPhoneSettings(): void {}
