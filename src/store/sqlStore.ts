// The encrypted store (09 §6, 05). SQL lives here; the platform pieces (database files, keystore, plain
// preferences) are injected, so the same code runs on SQLCipher on the phone and on plain SQLite in tests.
// Rules: nothing exists before `createFromTrySession` (11 §1); every operation goes through one serialized
// queue (06 §8); `wipeEverything` follows 05 §4 and makes other operations reject with WIPING.
import { TaraError } from '../shared/errors';
import type {
  AgeGroup,
  BaselineRecord,
  Contact,
  EventRow,
  MinuteRow,
  NewContact,
  PairedTarha,
  PatternRow,
  PlainPrefs,
  Profile,
  Store,
  TrySessionInput,
} from '../shared/storePort';
import { DEFAULT_SETTINGS, LANGS, type Lang, type Settings } from '../shared/types';
import { MIGRATIONS, SCHEMA_VERSION } from './schema';
import {
  normalizeDisplayName,
  retentionCutoff,
  utcOffsetMin,
  validateAgeGroup,
  validateBaseline,
  validateContact,
  validateEvent,
  validateMinute,
  validatePattern,
  validateSettingsPatch,
} from './validate';

export type SqlValue = string | number | null;

export interface SqlConnection {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: readonly SqlValue[]): Promise<{ changes: number; lastId: number }>;
  all<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  close(): Promise<void>;
}

/** The encrypted database file. `open` must apply the key before any other statement. */
export interface DbFiles {
  open(keyHex: string): Promise<SqlConnection>;
  /** Deletes the database and its -wal / -shm / -journal files. Must not fail if they are absent. */
  remove(): Promise<void>;
}

/** The DB key in the phone's secure keystore (05 §1). */
export interface Keyring {
  read(): Promise<string | null>;
  /** Creates and stores a new random 256-bit key, returned as hex. */
  create(): Promise<string>;
  remove(): Promise<void>;
}

export interface PrefsStorage {
  read(): Promise<PlainPrefs | null>;
  write(prefs: PlainPrefs): Promise<void>;
  clear(): Promise<void>;
}

export interface SqlStoreDeps {
  files: DbFiles;
  keyring: Keyring;
  prefs: PrefsStorage;
  now: () => number;
}

const b = (v: boolean) => (v ? 1 : 0);

interface SettingsRow {
  retention_days: number;
  speak_automatically: number;
  cooling_mode: Settings['coolingMode'];
  cooling_minutes: number;
  alert_sensitivity: Settings['alertSensitivity'];
  place_labels_enabled: number;
  enabled_place_labels: string;
  app_lock: number;
  theme: Settings['theme'];
  pattern_offers: number;
}

function settingsFromRow(r: SettingsRow): Settings {
  return {
    retentionDays: r.retention_days as Settings['retentionDays'],
    speakAutomatically: r.speak_automatically === 1,
    coolingMode: r.cooling_mode,
    coolingMinutes: r.cooling_minutes as Settings['coolingMinutes'],
    alertSensitivity: r.alert_sensitivity,
    placeLabelsEnabled: r.place_labels_enabled === 1,
    enabledPlaceLabels: JSON.parse(r.enabled_place_labels) as Settings['enabledPlaceLabels'],
    appLock: r.app_lock === 1,
    theme: r.theme,
    patternOffers: r.pattern_offers === 1,
  };
}

const SETTINGS_COLUMNS =
  'retention_days, speak_automatically, cooling_mode, cooling_minutes, alert_sensitivity, place_labels_enabled, enabled_place_labels, app_lock, theme, pattern_offers';

function settingsParams(s: Settings): SqlValue[] {
  return [
    s.retentionDays,
    b(s.speakAutomatically),
    s.coolingMode,
    s.coolingMinutes,
    s.alertSensitivity,
    b(s.placeLabelsEnabled),
    JSON.stringify(s.enabledPlaceLabels),
    b(s.appLock),
    s.theme,
    b(s.patternOffers),
  ];
}

/** Runs every pending migration in its own transaction; a failure leaves the old schema intact (05 §5). */
async function migrate(conn: SqlConnection): Promise<void> {
  const [row] = await conn.all<{ user_version: number }>('PRAGMA user_version;');
  const version = row?.user_version ?? 0;
  if (version > SCHEMA_VERSION) throw new TaraError('STORE_CORRUPT', 'database is newer than this app');
  await conn.exec('PRAGMA secure_delete = ON;');
  if (version === 0) await conn.exec('PRAGMA auto_vacuum = INCREMENTAL;');
  for (const m of MIGRATIONS.filter((x) => x.version > version)) {
    await conn.exec('BEGIN;');
    try {
      await conn.exec(m.sql);
      await conn.exec(`PRAGMA user_version = ${m.version};`);
      await conn.exec('COMMIT;');
    } catch {
      await conn.exec('ROLLBACK;');
      throw new TaraError('STORE_CORRUPT', `migration ${m.version} failed`);
    }
  }
}

async function inTransaction<T>(conn: SqlConnection, body: () => Promise<T>): Promise<T> {
  await conn.exec('BEGIN;');
  try {
    const result = await body();
    await conn.exec('COMMIT;');
    return result;
  } catch (error) {
    await conn.exec('ROLLBACK;');
    throw error;
  }
}

/** Maps the contact-limit trigger to its typed error. */
function asContactError(error: unknown): unknown {
  // Duck-typed: native drivers may throw errors from another JS realm, where `instanceof Error` is false.
  const message = typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '';
  return message.includes('CONTACT_LIMIT') ? new TaraError('CONTACT_LIMIT') : error;
}

export function createSqlStore(deps: SqlStoreDeps): Store {
  const { files, keyring, prefs, now } = deps;
  let conn: SqlConnection | null = null;
  let isWiping = false;
  let tail: Promise<unknown> = Promise.resolve();

  /** One operation at a time, in order (06 §8). */
  function enqueue<T>(op: () => Promise<T>): Promise<T> {
    const result = tail.then(op, op);
    tail = result.catch(() => undefined);
    return result;
  }

  async function connection(): Promise<SqlConnection> {
    if (conn !== null) return conn;
    const key = await keyring.read();
    if (key === null) throw new TaraError('STORE_LOCKED', 'no key');
    const opened = await files.open(key);
    await migrate(opened);
    conn = opened;
    return opened;
  }

  /** Every operation except the wipe itself: rejects while wiping, then runs with an open connection. */
  function op<T>(body: (c: SqlConnection) => Promise<T>): Promise<T> {
    if (isWiping) return Promise.reject(new TaraError('WIPING'));
    return enqueue(async () => {
      if (isWiping) throw new TaraError('WIPING');
      return body(await connection());
    });
  }

  async function closeQuietly(): Promise<void> {
    const open = conn;
    conn = null;
    if (open !== null) await open.close().catch(() => undefined);
  }

  /** Removes whatever a half-finished setup or a wipe left behind. Each step runs even if an earlier one fails. */
  async function destroyAll(): Promise<void> {
    const steps = [() => keyring.remove(), () => closeQuietly(), () => files.remove(), () => prefs.clear()];
    let firstError: unknown = null;
    for (const step of steps) {
      try {
        await step();
      } catch (error) {
        firstError ??= error;
      }
    }
    if (firstError !== null) throw firstError;
  }

  async function writeInitialRows(c: SqlConnection, input: TrySessionInput, settings: Settings, baseline: BaselineRecord): Promise<void> {
    const t = now();
    await inTransaction(c, async () => {
      await c.run('INSERT INTO profile (id, display_name, age_group, language, created_at) VALUES (1, NULL, NULL, ?, ?);', [input.lang, t]);
      await c.run(`INSERT INTO settings (id, ${SETTINGS_COLUMNS}) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`, settingsParams(settings));
      await c.run('INSERT INTO baseline (created_at, ratio_median, ratio_spread, is_default, active) VALUES (?, ?, ?, ?, 1);', [
        t,
        baseline.m,
        baseline.s,
        b(baseline.isDefault),
      ]);
    });
  }

  async function readSettings(c: SqlConnection): Promise<Settings> {
    const [row] = await c.all<SettingsRow>(`SELECT ${SETTINGS_COLUMNS} FROM settings WHERE id = 1;`);
    if (row === undefined) throw new TaraError('STORE_CORRUPT', 'settings missing');
    return settingsFromRow(row);
  }

  async function retention(c: SqlConnection): Promise<{ deletedRows: number }> {
    const { retentionDays } = await readSettings(c);
    const cutoff = retentionCutoff(now(), retentionDays);
    const minutes = await c.run('DELETE FROM minute_summary WHERE ts_minute < ?;', [cutoff]);
    const events = await c.run('DELETE FROM event WHERE ts < ?;', [cutoff]);
    await c.exec('PRAGMA incremental_vacuum;');
    return { deletedRows: minutes.changes + events.changes };
  }

  return {
    async isSetUp() {
      const p = await prefs.read();
      return p?.hasCompletedSetup === true && (await keyring.read()) !== null;
    },

    readPlainPrefs: () => prefs.read(),

    createFromTrySession(input) {
      const settings: Settings = { ...DEFAULT_SETTINGS, ...validateSettingsPatch(input.prefs) };
      const baseline = validateBaseline(input.baseline);
      if (isWiping) return Promise.reject(new TaraError('WIPING'));
      return enqueue(async () => {
        if ((await prefs.read())?.hasCompletedSetup === true) throw new TaraError('VALIDATION_ERROR', 'already set up');
        await destroyAll(); // leftovers from an interrupted earlier attempt
        try {
          const key = await keyring.create();
          const opened = await files.open(key);
          conn = opened;
          await migrate(opened);
          await writeInitialRows(opened, input, settings, baseline);
          await prefs.write({ hasCompletedSetup: true, language: input.lang });
        } catch (error) {
          await destroyAll().catch(() => undefined);
          throw error;
        }
      });
    },

    getProfile: () =>
      op(async (c) => {
        const [r] = await c.all<{ display_name: string | null; age_group: AgeGroup | null; language: Lang; created_at: number }>(
          'SELECT display_name, age_group, language, created_at FROM profile WHERE id = 1;',
        );
        if (r === undefined) throw new TaraError('STORE_CORRUPT', 'profile missing');
        return { displayName: r.display_name, ageGroup: r.age_group, language: r.language, createdAt: r.created_at } satisfies Profile;
      }),

    setDisplayName(name) {
      const value = normalizeDisplayName(name);
      return op(async (c) => void (await c.run('UPDATE profile SET display_name = ? WHERE id = 1;', [value])));
    },

    setAgeGroup(group) {
      const value = validateAgeGroup(group);
      return op(async (c) => void (await c.run('UPDATE profile SET age_group = ? WHERE id = 1;', [value])));
    },

    setLanguage(lang) {
      if (!LANGS.includes(lang)) throw new TaraError('VALIDATION_ERROR', 'language');
      return op(async (c) => {
        await c.run('UPDATE profile SET language = ? WHERE id = 1;', [lang]);
        await prefs.write({ hasCompletedSetup: true, language: lang });
      });
    },

    getSettings: () => op(readSettings),

    updateSettings(patch) {
      const valid = validateSettingsPatch(patch);
      return op(async (c) => {
        const next = { ...(await readSettings(c)), ...valid };
        const assignments = SETTINGS_COLUMNS.split(', ')
          .map((col) => `${col} = ?`)
          .join(', ');
        await c.run(`UPDATE settings SET ${assignments} WHERE id = 1;`, settingsParams(next));
        if (valid.retentionDays !== undefined) await retention(c); // 05 §3: right after the setting changes
      });
    },

    getBaseline: () =>
      op(async (c) => {
        const [r] = await c.all<{ ratio_median: number; ratio_spread: number; is_default: number }>(
          'SELECT ratio_median, ratio_spread, is_default FROM baseline WHERE active = 1;',
        );
        if (r === undefined) throw new TaraError('STORE_CORRUPT', 'baseline missing');
        return { m: r.ratio_median, s: r.ratio_spread, isDefault: r.is_default === 1 };
      }),

    replaceBaseline(baseline) {
      const valid = validateBaseline(baseline);
      return op((c) =>
        inTransaction(c, async () => {
          await c.run('DELETE FROM baseline;'); // keep only the active one (05 §2.3)
          await c.run('INSERT INTO baseline (created_at, ratio_median, ratio_spread, is_default, active) VALUES (?, ?, ?, ?, 1);', [
            now(),
            valid.m,
            valid.s,
            b(valid.isDefault),
          ]);
        }),
      );
    },

    appendMinute(row) {
      const r = validateMinute(row);
      return op(async (c) => {
        await c.run(
          'INSERT OR REPLACE INTO minute_summary (ts_minute, utc_offset_min, stress_mean, stress_max, valid_seconds, zone, cooling_on) VALUES (?, ?, ?, ?, ?, ?, ?);',
          [r.tsMinute, utcOffsetMin(r.tsMinute), r.stressMean, r.stressMax, r.validSeconds, r.zone, b(r.coolingOn)],
        );
      });
    },

    appendEvent(event) {
      const e = validateEvent(event);
      return op(async (c) => {
        await c.run('INSERT INTO event (ts, utc_offset_min, type, source) VALUES (?, ?, ?, ?);', [e.ts, utcOffsetMin(e.ts), e.type, e.source]);
      });
    },

    queryMinutes: (fromMs, toMs) =>
      op(async (c) => {
        const rows = await c.all<{ ts_minute: number; stress_mean: number; stress_max: number; valid_seconds: number; zone: MinuteRow['zone']; cooling_on: number }>(
          'SELECT ts_minute, stress_mean, stress_max, valid_seconds, zone, cooling_on FROM minute_summary WHERE ts_minute >= ? AND ts_minute < ? ORDER BY ts_minute;',
          [fromMs, toMs],
        );
        return rows.map((r) => ({
          tsMinute: r.ts_minute,
          stressMean: r.stress_mean,
          stressMax: r.stress_max,
          validSeconds: r.valid_seconds,
          zone: r.zone,
          coolingOn: r.cooling_on === 1,
          source: 'tarha' as const,
        }));
      }),

    queryEvents: (fromMs, toMs) =>
      op(async (c) => {
        const rows = await c.all<{ ts: number; type: EventRow['type']; source: EventRow['source'] }>(
          'SELECT ts, type, source FROM event WHERE ts >= ? AND ts < ? ORDER BY ts, id;',
          [fromMs, toMs],
        );
        return rows.map((r) => ({ ts: r.ts, type: r.type, source: r.source, origin: 'tarha' as const }));
      }),

    getPatterns: () =>
      op(async (c) => {
        const rows = await c.all<{
          slot_start_min: number;
          matching_days: number;
          detected_at: number;
          status: PatternRow['status'];
          declined_until: number | null;
          reminder_notification_id: string | null;
        }>('SELECT slot_start_min, matching_days, detected_at, status, declined_until, reminder_notification_id FROM pattern ORDER BY slot_start_min;');
        return rows.map((r) => ({
          slotStartMin: r.slot_start_min,
          matchingDays: r.matching_days,
          detectedAt: r.detected_at,
          status: r.status,
          declinedUntil: r.declined_until,
          reminderNotificationId: r.reminder_notification_id,
        }));
      }),

    savePatterns(patterns) {
      const valid = patterns.map(validatePattern);
      return op((c) =>
        inTransaction(c, async () => {
          await c.run('DELETE FROM pattern;');
          for (const p of valid) {
            await c.run(
              'INSERT INTO pattern (slot_start_min, matching_days, detected_at, status, declined_until, reminder_notification_id) VALUES (?, ?, ?, ?, ?, ?);',
              [p.slotStartMin, p.matchingDays, p.detectedAt, p.status, p.declinedUntil, p.reminderNotificationId],
            );
          }
        }),
      );
    },

    listContacts: () =>
      op(async (c) => {
        const rows = await c.all<{ id: number; name: string; phone_e164: string; created_at: number }>(
          'SELECT id, name, phone_e164, created_at FROM family_contact ORDER BY id;',
        );
        return rows.map((r) => ({ id: r.id, name: r.name, phoneE164: r.phone_e164, createdAt: r.created_at }) satisfies Contact);
      }),

    addContact(contact: NewContact) {
      const valid = validateContact(contact);
      return op(async (c) => {
        const t = now();
        try {
          const { lastId } = await c.run('INSERT INTO family_contact (name, phone_e164, created_at) VALUES (?, ?, ?);', [valid.name, valid.phoneE164, t]);
          return { id: lastId, ...valid, createdAt: t };
        } catch (error) {
          throw asContactError(error);
        }
      });
    },

    removeContact: (id) => op(async (c) => void (await c.run('DELETE FROM family_contact WHERE id = ?;', [id]))),

    setPairedTarha: (tarha: PairedTarha | null) =>
      op(async (c) => {
        await c.run('DELETE FROM paired_tarha;');
        if (tarha !== null) {
          await c.run('INSERT INTO paired_tarha (id, device_id, name, firmware, paired_at) VALUES (1, ?, ?, ?, ?);', [
            tarha.deviceId,
            tarha.name,
            tarha.firmware,
            tarha.pairedAt,
          ]);
        }
      }),

    getPairedTarha: () =>
      op(async (c) => {
        const [r] = await c.all<{ device_id: string; name: string; firmware: string; paired_at: number }>(
          'SELECT device_id, name, firmware, paired_at FROM paired_tarha WHERE id = 1;',
        );
        return r === undefined ? null : { deviceId: r.device_id, name: r.name, firmware: r.firmware, pairedAt: r.paired_at };
      }),

    runRetention: () => op(retention),

    wipeEverything() {
      isWiping = true; // from now on every other operation rejects with WIPING (09 §6)
      return enqueue(async () => {
        try {
          await destroyAll(); // 05 §4: key first (crypto-shred), then DB files, then preferences
        } finally {
          isWiping = false;
        }
      });
    },
  };
}
