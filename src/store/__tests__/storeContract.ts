// The Store contract (09 §6, 12 §3) as one suite, run against every Store implementation so the web
// preview's memory store and the encrypted SQL store can never drift apart.
import { describe, expect, test } from '@jest/globals';
import { isTaraError, type ErrorCode } from '../../shared/errors';
import type { MinuteRow, Store, TrySessionInput } from '../../shared/storePort';
import { DEFAULT_SETTINGS } from '../../shared/types';

export const T0 = new Date(2026, 10, 16, 12, 0).getTime();
const DAY = 86_400_000;

export interface Harness {
  store: Store;
  setNow(ms: number): void;
}

export const TRY_INPUT: TrySessionInput = {
  lang: 'ar_EG',
  baseline: { m: -0.6, s: 0.22, isDefault: false },
  prefs: { patternOffers: false },
};

export const minute = (tsMinute: number, extra: Partial<MinuteRow> = {}): MinuteRow => ({
  tsMinute,
  stressMean: 40,
  stressMax: 55,
  validSeconds: 58,
  zone: 'calm',
  coolingOn: false,
  source: 'tarha',
  ...extra,
});

export async function expectCode(promise: Promise<unknown>, code: ErrorCode): Promise<void> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(isTaraError(error, code)).toBe(true);
}

export function describeStoreContract(name: string, make: () => Harness): void {
  describe(`${name} — Store contract (09 §6, 12 §3)`, () => {
    test('nothing exists before Screen 5 "Yes"; reads are locked', async () => {
      const { store } = make();
      expect(await store.isSetUp()).toBe(false);
      expect(await store.readPlainPrefs()).toBeNull();
      await expectCode(store.getSettings(), 'STORE_LOCKED');
    });

    test('createFromTrySession writes language, baseline and preferences — and no readings', async () => {
      const { store } = make();
      await store.createFromTrySession(TRY_INPUT);
      expect(await store.isSetUp()).toBe(true);
      expect(await store.readPlainPrefs()).toEqual({ hasCompletedSetup: true, language: 'ar_EG' });
      expect(await store.getProfile()).toMatchObject({ language: 'ar_EG', displayName: null, ageGroup: null });
      expect(await store.getBaseline()).toEqual(TRY_INPUT.baseline);
      expect(await store.getSettings()).toEqual({ ...DEFAULT_SETTINGS, patternOffers: false });
      expect(await store.queryMinutes(0, Number.MAX_SAFE_INTEGER)).toEqual([]);
      expect(await store.queryEvents(0, Number.MAX_SAFE_INTEGER)).toEqual([]);
      await expectCode(store.createFromTrySession(TRY_INPUT), 'VALIDATION_ERROR');
    });

    test('name is optional and at most 30 characters; age is a range or skipped', async () => {
      const { store } = make();
      await store.createFromTrySession(TRY_INPUT);
      await store.setDisplayName('  Amira  ');
      await store.setAgeGroup('26_35');
      expect(await store.getProfile()).toMatchObject({ displayName: 'Amira', ageGroup: '26_35' });
      await store.setDisplayName('   ');
      expect((await store.getProfile()).displayName).toBeNull();
      expect(() => store.setDisplayName('x'.repeat(31))).toThrow();
      expect(() => store.setAgeGroup('51_60' as never)).toThrow();
    });

    test('retention can never exceed 7 days', async () => {
      const { store } = make();
      await store.createFromTrySession(TRY_INPUT);
      expect(() => store.updateSettings({ retentionDays: 14 as never })).toThrow();
      await store.updateSettings({ retentionDays: 3 });
      expect((await store.getSettings()).retentionDays).toBe(3);
    });

    test('retention: −8 d goes at 7 days; switching to 1 day removes −6 d immediately (12 §3)', async () => {
      const { store } = make();
      await store.createFromTrySession(TRY_INPUT);
      await store.appendMinute(minute(T0 - 8 * DAY));
      await store.appendMinute(minute(T0 - 6 * DAY));
      await store.appendEvent({ ts: T0 - 8 * DAY, type: 'prompt_shown', source: null, origin: 'tarha' });
      await store.appendEvent({ ts: T0 - 6 * DAY, type: 'cooling_start', source: 'prompt', origin: 'tarha' });
      expect(await store.runRetention()).toEqual({ deletedRows: 2 });
      expect((await store.queryMinutes(0, T0)).map((m) => m.tsMinute)).toEqual([T0 - 6 * DAY]);
      await store.updateSettings({ retentionDays: 1 });
      expect(await store.queryMinutes(0, T0)).toEqual([]);
      expect(await store.queryEvents(0, T0)).toEqual([]);
    });

    test('demo data is rejected (10 P13)', async () => {
      const { store } = make();
      await store.createFromTrySession(TRY_INPUT);
      expect(() => store.appendMinute(minute(T0, { source: 'demo' }))).toThrow();
      expect(() => store.appendEvent({ ts: T0, type: 'prompt_shown', source: null, origin: 'demo' })).toThrow();
      expect(await store.queryMinutes(0, Number.MAX_SAFE_INTEGER)).toEqual([]);
    });

    test('contacts: E.164 only, at most 3', async () => {
      const { store } = make();
      await store.createFromTrySession(TRY_INPUT);
      expect(() => store.addContact({ name: 'Mama', phoneE164: '0100 123 4567' })).toThrow();
      await store.addContact({ name: 'Mama', phoneE164: '+20 100 123 4567' });
      await store.addContact({ name: 'Sara', phoneE164: '+201001234568' });
      const third = await store.addContact({ name: 'Hana', phoneE164: '+251911234567' });
      await expectCode(store.addContact({ name: 'Four', phoneE164: '+201001234569' }), 'CONTACT_LIMIT');
      expect((await store.listContacts()).map((c) => c.phoneE164)).toEqual(['+201001234567', '+201001234568', '+251911234567']);
      await store.removeContact(third.id);
      expect(await store.listContacts()).toHaveLength(2);
    });

    test('one active baseline; settings, patterns and paired tarha round-trip', async () => {
      const { store } = make();
      await store.createFromTrySession(TRY_INPUT);
      await store.replaceBaseline({ m: -0.5, s: 0.3, isDefault: false });
      expect(await store.getBaseline()).toEqual({ m: -0.5, s: 0.3, isDefault: false });
      await store.updateSettings({ placeLabelsEnabled: true, enabledPlaceLabels: ['in_field', 'at_home'] });
      expect(await store.getSettings()).toMatchObject({ placeLabelsEnabled: true, enabledPlaceLabels: ['in_field', 'at_home'] });
      expect(() => store.updateSettings({ enabledPlaceLabels: ['gps' as never] })).toThrow();
      const pattern = { slotStartMin: 840, matchingDays: 5, detectedAt: T0, status: 'offered' as const, declinedUntil: null, reminderNotificationId: null };
      await store.savePatterns([pattern]);
      expect(await store.getPatterns()).toEqual([pattern]);
      const tarha = { deviceId: 'AA:BB', name: 'TARA-3F2A', firmware: '0.1.0', pairedAt: T0 };
      await store.setPairedTarha(tarha);
      expect(await store.getPairedTarha()).toEqual(tarha);
      await store.setPairedTarha(null);
      expect(await store.getPairedTarha()).toBeNull();
    });

    test('Delete Everything returns to a fresh install; writes during the wipe reject with WIPING; idempotent', async () => {
      const { store } = make();
      await store.createFromTrySession(TRY_INPUT);
      await store.setDisplayName('Amira');
      const wipe = store.wipeEverything();
      await expectCode(store.setAgeGroup('18_25'), 'WIPING');
      await wipe;
      expect(await store.isSetUp()).toBe(false);
      expect(await store.readPlainPrefs()).toBeNull();
      await expectCode(store.getProfile(), 'STORE_LOCKED');
      await store.wipeEverything();
      await store.createFromTrySession({ ...TRY_INPUT, lang: 'en' });
      expect(await store.getProfile()).toMatchObject({ language: 'en', displayName: null });
    });
  });
}
