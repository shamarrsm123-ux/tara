// Which screen the app opens on (11 §1): Daily mode in her saved language once set up, otherwise a fresh
// Choose Language. If the store can't be read, the app starts fresh rather than crashing — it never guesses.
import type { Store } from '../shared/storePort';
import { INITIAL_TRY, setUpState, type TryState } from './tryNavigation';

export async function initialStateFor(store: Store): Promise<TryState> {
  try {
    const prefs = await store.readPlainPrefs();
    return prefs !== null && (await store.isSetUp()) ? setUpState(prefs.language) : INITIAL_TRY;
  } catch {
    return INITIAL_TRY;
  }
}
