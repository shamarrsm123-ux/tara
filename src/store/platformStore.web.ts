// Web preview (dev tool): SQLCipher and the keystore don't exist in a browser, so the preview uses the
// memory-only store. Saving works for the session and is gone on reload — nothing is written to the browser.
import type { Store } from '../shared/storePort';
import { createMemoryStore } from './memoryStore';

export function createPlatformStore(): Store {
  return createMemoryStore();
}

export const IS_PERSISTENT = false;
