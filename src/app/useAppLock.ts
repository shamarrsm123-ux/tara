// App Lock state (03 Flow 17, P11): when on, TARA starts locked and locks again whenever she leaves the app;
// unlocking uses the phone's own screen lock. Turning it on requires the phone to have a screen lock.
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { lockAvailability, openPhoneSettings, unlockWithPhone, type LockAvailability } from '../lock/appLock';
import type { Store } from '../shared/storePort';
import type { Settings } from '../shared/types';
import type { LockTools } from '../ui/screens/LockCard';

export interface AppLock {
  isLocked: boolean;
  unlock: () => void;
  tools: LockTools | null;
}

export function useAppLock(store: Store, settings: Settings | null, onSettingsSaved: (s: Settings) => void, prompt: string): AppLock {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const isOn = settings?.appLock === true;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setIsUnlocked(false); // lock again when she leaves TARA
    });
    return () => sub.remove();
  }, []);

  const unlock = useCallback(() => {
    void unlockWithPhone(prompt).then((ok) => {
      if (ok) setIsUnlocked(true);
    });
  }, [prompt]);

  const save = async (appLock: boolean) => {
    await store.updateSettings({ appLock });
    onSettingsSaved(await store.getSettings());
  };

  const tools: LockTools | null =
    settings === null
      ? null
      : {
          isOn,
          onTurnOn: async (): Promise<LockAvailability> => {
            const availability = await lockAvailability();
            if (availability === 'ready') {
              setIsUnlocked(true); // she is using TARA right now; it locks next time she opens it
              await save(true);
            }
            return availability;
          },
          onTurnOff: () => void save(false).catch(() => undefined),
          onOpenSettings: openPhoneSettings,
        };

  return { isLocked: isOn && !isUnlocked, unlock, tools };
}
