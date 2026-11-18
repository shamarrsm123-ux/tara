// Input validation for the store boundary (09 §6, 05 §2). Everything that reaches disk passes through here
// first, and the DB CHECK constraints repeat the critical limits (retention ≤ 7, 3 contacts) as a backstop.
import { TaraError } from '../shared/errors';
import {
  AGE_GROUPS,
  CONTACT_NAME_MAX,
  DISPLAY_NAME_MAX,
  MAX_RETENTION_DAYS,
  type AgeGroup,
  type BaselineRecord,
  type EventRow,
  type MinuteRow,
  type NewContact,
  type CheckInRow,
  type CycleStartRow,
  type PatternRow,
} from '../shared/storePort';
import { isValidCycleLength } from '../engine/cycle';
import { PLACE_LABELS, type PlaceLabel, type Settings, type SourceKind } from '../shared/types';

export const DAY_MS = 86_400_000;
/** E.164: "+", country code (no leading 0), 7–15 digits in total. */
const E164 = /^\+[1-9]\d{6,14}$/;

const ALLOWED: { [K in keyof Settings]: (v: unknown) => boolean } = {
  retentionDays: (v) => v === 1 || v === 3 || v === 7,
  speakAutomatically: (v) => typeof v === 'boolean',
  coolingMode: (v) => v === 'ask' || v === 'auto',
  coolingMinutes: (v) => v === 5 || v === 10 || v === 15,
  alertSensitivity: (v) => v === 'fewer' || v === 'normal' || v === 'more',
  placeLabelsEnabled: (v) => typeof v === 'boolean',
  enabledPlaceLabels: (v) => Array.isArray(v) && v.every((l) => PLACE_LABELS.includes(l as PlaceLabel)) && new Set(v).size === v.length,
  appLock: (v) => typeof v === 'boolean',
  theme: (v) => v === 'sun' || v === 'night' || v === 'auto',
  patternOffers: (v) => typeof v === 'boolean',
  cycleAware: (v) => typeof v === 'boolean',
  cycleLengthDays: (v) => typeof v === 'number' && isValidCycleLength(v),
};

function invalid(what: string): never {
  throw new TaraError('VALIDATION_ERROR', `invalid ${what}`);
}

const isSettingsKey = (key: string): key is keyof Settings => Object.hasOwn(ALLOWED, key);

/** Returns a copy holding only known, valid settings; anything else → VALIDATION_ERROR. */
export function validateSettingsPatch(patch: Partial<Settings>): Partial<Settings> {
  Object.entries(patch).forEach(([key, value]) => {
    if (!isSettingsKey(key)) invalid(`setting ${key}`);
    if (key === 'retentionDays' && typeof value === 'number' && value > MAX_RETENTION_DAYS) invalid('retention (max 7 days)');
    if (!ALLOWED[key](value)) invalid(`value for ${key}`);
  });
  return { ...patch };
}

/** Trimmed name, or null when empty. Longer than 30 characters → VALIDATION_ERROR. */
export function normalizeDisplayName(name: string | null): string | null {
  if (name === null) return null;
  const trimmed = name.trim();
  if (trimmed.length === 0) return null;
  if ([...trimmed].length > DISPLAY_NAME_MAX) invalid('display name');
  return trimmed;
}

export function validateAgeGroup(group: AgeGroup | null): AgeGroup | null {
  if (group !== null && !AGE_GROUPS.includes(group)) invalid('age group');
  return group;
}

export function validateContact(contact: NewContact): NewContact {
  const name = contact.name.trim();
  const phone = contact.phoneE164.replace(/[\s-]/g, '');
  if (name.length === 0 || [...name].length > CONTACT_NAME_MAX) invalid('contact name');
  if (!E164.test(phone)) invalid('phone number');
  return { name, phoneE164: phone };
}

export function validateBaseline(b: BaselineRecord): BaselineRecord {
  if (!Number.isFinite(b.m) || !Number.isFinite(b.s) || b.s <= 0) invalid('baseline');
  return { m: b.m, s: b.s, isDefault: b.isDefault };
}

/** Demo data is never persisted (10 P13, 11 §8.2). */
export function assertNotDemo(origin: SourceKind): void {
  if (origin === 'demo') invalid('source: demo data is never stored');
}

const isStress = (v: number) => Number.isInteger(v) && v >= 0 && v <= 100;

export function validateMinute(row: MinuteRow): MinuteRow {
  assertNotDemo(row.source);
  const isOk =
    Number.isInteger(row.tsMinute) &&
    isStress(row.stressMean) &&
    isStress(row.stressMax) &&
    row.stressMax >= row.stressMean &&
    Number.isInteger(row.validSeconds) &&
    row.validSeconds >= 0 &&
    row.validSeconds <= 60;
  if (!isOk) invalid('minute summary');
  return row;
}

export function validateEvent(event: EventRow): EventRow {
  assertNotDemo(event.origin);
  if (!Number.isInteger(event.ts)) invalid('event time');
  return event;
}

export function validatePattern(p: PatternRow): PatternRow {
  const isOk = Number.isInteger(p.slotStartMin) && p.slotStartMin >= 0 && p.slotStartMin < 1440 && Number.isInteger(p.matchingDays) && p.matchingDays >= 0;
  if (!isOk) invalid('pattern');
  return p;
}

/** A day 1 must be a whole timestamp and not in the future (05 §2.9). */
export function validateCycleStart(start: CycleStartRow, nowMs: number): CycleStartRow {
  if (!Number.isInteger(start.dayMs) || start.dayMs > nowMs || typeof start.isEstimated !== 'boolean') invalid('cycle start');
  return { dayMs: start.dayMs, isEstimated: start.isEstimated };
}

const isLevel = (v: unknown) => v === 0 || v === 1 || v === 2;

export function validateCheckIn(row: CheckInRow, nowMs: number): CheckInRow {
  const isOk = Number.isInteger(row.dayMs) && row.dayMs <= nowMs && isLevel(row.mood) && isLevel(row.irritability) && isLevel(row.body);
  if (!isOk) invalid('check-in');
  return { dayMs: row.dayMs, mood: row.mood, irritability: row.irritability, body: row.body };
}

/** Rows older than this are deleted by the retention job (05 §3). */
export function retentionCutoff(nowMs: number, retentionDays: number): number {
  return nowMs - retentionDays * DAY_MS;
}

/** Minutes east of UTC at that instant, stored with every timestamp (05 §2). */
export function utcOffsetMin(epochMs: number): number {
  return -new Date(epochMs).getTimezoneOffset();
}
