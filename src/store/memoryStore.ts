// Memory-only Store for the web preview (dev tool, 08): same contract and validation as the encrypted store
// (checked by the shared contract suite), but nothing touches disk and everything is gone on reload.
import { TaraError } from '../shared/errors';
import { CONTACT_LIMIT, type BaselineRecord, type Contact, type EventRow, type MinuteRow, type PairedTarha, type PatternRow, type PlainPrefs, type Profile, type Store } from '../shared/storePort';
import { DEFAULT_SETTINGS, type Settings } from '../shared/types';
import {
  normalizeDisplayName,
  retentionCutoff,
  validateAgeGroup,
  validateBaseline,
  validateContact,
  validateEvent,
  validateMinute,
  validatePattern,
  validateSettingsPatch,
} from './validate';

interface Data {
  profile: Profile;
  settings: Settings;
  baseline: BaselineRecord;
  minutes: readonly MinuteRow[];
  events: readonly EventRow[];
  patterns: readonly PatternRow[];
  contacts: readonly Contact[];
  paired: PairedTarha | null;
  nextContactId: number;
}

export function createMemoryStore(now: () => number = Date.now): Store {
  let data: Data | null = null;
  let prefs: PlainPrefs | null = null;
  let isWiping = false;

  function current(): Data {
    if (isWiping) throw new TaraError('WIPING');
    if (data === null) throw new TaraError('STORE_LOCKED', 'not set up');
    return data;
  }
  const read = <T>(pick: (d: Data) => T): Promise<T> => {
    try {
      return Promise.resolve(pick(current()));
    } catch (error) {
      return Promise.reject(error);
    }
  };
  const write = (change: (d: Data) => Data): Promise<void> =>
    read((d) => {
      data = change(d);
    });

  const prune = (d: Data): { next: Data; deletedRows: number } => {
    const cutoff = retentionCutoff(now(), d.settings.retentionDays);
    const minutes = d.minutes.filter((m) => m.tsMinute >= cutoff);
    const events = d.events.filter((e) => e.ts >= cutoff);
    return { next: { ...d, minutes, events }, deletedRows: d.minutes.length - minutes.length + d.events.length - events.length };
  };

  return {
    isSetUp: async () => prefs?.hasCompletedSetup === true && data !== null,
    readPlainPrefs: async () => prefs,

    async createFromTrySession(input) {
      const settings = { ...DEFAULT_SETTINGS, ...validateSettingsPatch(input.prefs) };
      const baseline = validateBaseline(input.baseline);
      if (isWiping) throw new TaraError('WIPING');
      if (prefs?.hasCompletedSetup === true) throw new TaraError('VALIDATION_ERROR', 'already set up');
      data = {
        profile: { displayName: null, ageGroup: null, language: input.lang, createdAt: now() },
        settings,
        baseline,
        minutes: [],
        events: [],
        patterns: [],
        contacts: [],
        paired: null,
        nextContactId: 1,
      };
      prefs = { hasCompletedSetup: true, language: input.lang };
    },

    getProfile: () => read((d) => d.profile),
    setDisplayName(name) {
      const displayName = normalizeDisplayName(name);
      return write((d) => ({ ...d, profile: { ...d.profile, displayName } }));
    },
    setAgeGroup(group) {
      const ageGroup = validateAgeGroup(group);
      return write((d) => ({ ...d, profile: { ...d.profile, ageGroup } }));
    },

    getSettings: () => read((d) => d.settings),
    updateSettings(patch) {
      const valid = validateSettingsPatch(patch);
      return write((d) => {
        const next = { ...d, settings: { ...d.settings, ...valid } };
        return valid.retentionDays === undefined ? next : prune(next).next;
      });
    },

    getBaseline: () => read((d) => d.baseline),
    replaceBaseline(baseline) {
      const valid = validateBaseline(baseline);
      return write((d) => ({ ...d, baseline: valid }));
    },

    appendMinute(row) {
      const valid = validateMinute(row);
      return write((d) => ({ ...d, minutes: [...d.minutes.filter((m) => m.tsMinute !== valid.tsMinute), valid] }));
    },
    appendEvent(event) {
      const valid = validateEvent(event);
      return write((d) => ({ ...d, events: [...d.events, valid] }));
    },
    queryMinutes: (from, to) => read((d) => d.minutes.filter((m) => m.tsMinute >= from && m.tsMinute < to).toSorted((a, b) => a.tsMinute - b.tsMinute)),
    queryEvents: (from, to) => read((d) => d.events.filter((e) => e.ts >= from && e.ts < to).toSorted((a, b) => a.ts - b.ts)),

    getPatterns: () => read((d) => [...d.patterns]),
    savePatterns(patterns) {
      const valid = patterns.map(validatePattern);
      return write((d) => ({ ...d, patterns: valid }));
    },

    listContacts: () => read((d) => [...d.contacts]),
    addContact(contact) {
      const valid = validateContact(contact);
      return read((d) => {
        if (d.contacts.length >= CONTACT_LIMIT) throw new TaraError('CONTACT_LIMIT');
        const added: Contact = { id: d.nextContactId, ...valid, createdAt: now() };
        data = { ...d, contacts: [...d.contacts, added], nextContactId: d.nextContactId + 1 };
        return added;
      });
    },
    removeContact: (id) => write((d) => ({ ...d, contacts: d.contacts.filter((c) => c.id !== id) })),

    setPairedTarha: (tarha) => write((d) => ({ ...d, paired: tarha })),
    getPairedTarha: () => read((d) => d.paired),

    runRetention: () =>
      read((d) => {
        const { next, deletedRows } = prune(d);
        data = next;
        return { deletedRows };
      }),

    async wipeEverything() {
      isWiping = true;
      await Promise.resolve(); // let callers observe WIPING, as with the real store
      data = null;
      prefs = null;
      isWiping = false;
    },
  };
}
