// The web preview's memory store must honor the same contract as the encrypted store.
import { createMemoryStore } from '../memoryStore';
import { describeStoreContract, T0 } from './storeContract';

describeStoreContract('Memory store', () => {
  let nowMs = T0;
  return { store: createMemoryStore(() => nowMs), setNow: (ms) => (nowMs = ms) };
});
