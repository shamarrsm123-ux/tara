// The Store contract (09 §6) as a port: store/ implements it, the app shell receives an instance from the
// composition root (App.tsx). app/ and ui/ never import store/ directly (06 §4), so demo data and the Try
// session cannot reach disk by accident. Field meanings and limits: 05 §2.
import type { EventType, Lang, Settings, SourceKind, Zone } from './types';

export type AgeGroup = '18_25' | '26_35' | '36_50';
export const AGE_GROUPS: readonly AgeGroup[] = ['18_25', '26_35', '36_50'];

/** 05 §2.1: optional name (≤ 30 chars) and age range only — never an exact age or phone number. */
export const DISPLAY_NAME_MAX = 30;
export const CONTACT_NAME_MAX = 30;
export const CONTACT_LIMIT = 3;
export const MAX_RETENTION_DAYS = 7;

export interface Profile {
  displayName: string | null;
  ageGroup: AgeGroup | null;
  language: Lang;
  createdAt: number;
}

/** The calibration result (05 §2.3): median and robust spread of the stress ratio. */
export interface BaselineRecord {
  m: number;
  s: number;
  isDefault: boolean;
}

/** One summary per minute (05 §2.4) — the only brain-derived time series ever written. */
export interface MinuteRow {
  tsMinute: number;
  stressMean: number;
  stressMax: number;
  validSeconds: number;
  zone: Zone;
  coolingOn: boolean;
  /** Where the samples came from. `demo` is always rejected (10 P13). */
  source: SourceKind;
}

export type EventCause = 'manual' | 'auto' | 'prompt';

export interface EventRow {
  ts: number;
  type: EventType;
  source: EventCause | null;
  /** Where the event came from. `demo` is always rejected (10 P13). */
  origin: SourceKind;
}

export type PatternStatus = 'offered' | 'accepted' | 'declined' | 'faded';

export interface PatternRow {
  slotStartMin: number;
  matchingDays: number;
  detectedAt: number;
  status: PatternStatus;
  declinedUntil: number | null;
  reminderNotificationId: string | null;
}

export interface NewContact {
  name: string;
  phoneE164: string;
}

export interface Contact extends NewContact {
  id: number;
  createdAt: number;
}

export interface PairedTarha {
  deviceId: string;
  name: string;
  firmware: string;
  pairedAt: number;
}

/** Plain, non-personal preferences readable before the DB is decrypted (05 §1). */
export interface PlainPrefs {
  hasCompletedSetup: boolean;
  language: Lang;
}

export interface TrySessionInput {
  lang: Lang;
  baseline: BaselineRecord;
  prefs: Partial<Settings>;
}

export interface Store {
  isSetUp(): Promise<boolean>;
  /** Language to render with before anything is decrypted; null when not set up. */
  readPlainPrefs(): Promise<PlainPrefs | null>;
  /** Screen 5 "Yes" — the only way storage comes into existence (11 §1). */
  createFromTrySession(input: TrySessionInput): Promise<void>;
  getProfile(): Promise<Profile>;
  setDisplayName(name: string | null): Promise<void>;
  setAgeGroup(group: AgeGroup | null): Promise<void>;
  getSettings(): Promise<Settings>;
  /** retention > 7 → VALIDATION_ERROR. */
  updateSettings(patch: Partial<Settings>): Promise<void>;
  getBaseline(): Promise<BaselineRecord>;
  replaceBaseline(baseline: BaselineRecord): Promise<void>;
  appendMinute(row: MinuteRow): Promise<void>;
  appendEvent(event: EventRow): Promise<void>;
  queryMinutes(fromMs: number, toMs: number): Promise<MinuteRow[]>;
  queryEvents(fromMs: number, toMs: number): Promise<EventRow[]>;
  getPatterns(): Promise<PatternRow[]>;
  savePatterns(patterns: readonly PatternRow[]): Promise<void>;
  listContacts(): Promise<Contact[]>;
  /** > 3 → CONTACT_LIMIT; invalid number → VALIDATION_ERROR. */
  addContact(contact: NewContact): Promise<Contact>;
  removeContact(id: number): Promise<void>;
  setPairedTarha(tarha: PairedTarha | null): Promise<void>;
  getPairedTarha(): Promise<PairedTarha | null>;
  runRetention(): Promise<{ deletedRows: number }>;
  /** 05 §4 steps 2–4 (the app does step 1 first). Idempotent; other writes reject with WIPING meanwhile. */
  wipeEverything(): Promise<void>;
}
