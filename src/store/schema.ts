// Ordered, append-only schema migrations (05 §5). The version lives in PRAGMA user_version; each migration
// runs inside one transaction. Critical limits are enforced by the database too: retention ≤ 7 days and at
// most 3 family contacts (12 §3 "DB CHECK also rejects direct insert").

export interface Migration {
  version: number;
  sql: string;
}

const EVENT_TYPES = [
  'high_episode_start',
  'high_episode_end',
  'prompt_shown',
  'prompt_yes',
  'prompt_no',
  'cooling_start',
  'cooling_stop',
  'reminder_fired',
  'help_question_shown',
  'help_opened_sms',
  'battery_low',
  'disconnect',
  'reconnect',
]
  .map((t) => `'${t}'`)
  .join(',');

const V1 = `
CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT CHECK (display_name IS NULL OR length(display_name) <= 30),
  age_group TEXT CHECK (age_group IS NULL OR age_group IN ('18_25','26_35','36_50')),
  language TEXT NOT NULL CHECK (language IN ('ar_EG','am_ET','en')),
  created_at INTEGER NOT NULL
);
CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  retention_days INTEGER NOT NULL DEFAULT 7 CHECK (retention_days IN (1,3,7) AND retention_days <= 7),
  speak_automatically INTEGER NOT NULL DEFAULT 1 CHECK (speak_automatically IN (0,1)),
  cooling_mode TEXT NOT NULL DEFAULT 'ask' CHECK (cooling_mode IN ('ask','auto')),
  cooling_minutes INTEGER NOT NULL DEFAULT 10 CHECK (cooling_minutes IN (5,10,15)),
  alert_sensitivity TEXT NOT NULL DEFAULT 'normal' CHECK (alert_sensitivity IN ('fewer','normal','more')),
  place_labels_enabled INTEGER NOT NULL DEFAULT 0 CHECK (place_labels_enabled IN (0,1)),
  enabled_place_labels TEXT NOT NULL DEFAULT '[]',
  app_lock INTEGER NOT NULL DEFAULT 0 CHECK (app_lock IN (0,1)),
  theme TEXT NOT NULL DEFAULT 'sun' CHECK (theme IN ('sun','night','auto')),
  pattern_offers INTEGER NOT NULL DEFAULT 1 CHECK (pattern_offers IN (0,1))
);
CREATE TABLE baseline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  ratio_median REAL NOT NULL,
  ratio_spread REAL NOT NULL CHECK (ratio_spread > 0),
  is_default INTEGER NOT NULL CHECK (is_default IN (0,1)),
  active INTEGER NOT NULL CHECK (active IN (0,1))
);
CREATE TABLE minute_summary (
  ts_minute INTEGER PRIMARY KEY,
  utc_offset_min INTEGER NOT NULL,
  stress_mean INTEGER NOT NULL CHECK (stress_mean BETWEEN 0 AND 100),
  stress_max INTEGER NOT NULL CHECK (stress_max BETWEEN 0 AND 100),
  valid_seconds INTEGER NOT NULL CHECK (valid_seconds BETWEEN 0 AND 60),
  zone TEXT NOT NULL CHECK (zone IN ('calm','rising','high','unknown')),
  cooling_on INTEGER NOT NULL CHECK (cooling_on IN (0,1))
);
CREATE TABLE event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  utc_offset_min INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN (${EVENT_TYPES})),
  source TEXT CHECK (source IS NULL OR source IN ('manual','auto','prompt'))
);
CREATE INDEX event_ts ON event (ts);
CREATE TABLE pattern (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_start_min INTEGER NOT NULL CHECK (slot_start_min BETWEEN 0 AND 1439),
  matching_days INTEGER NOT NULL,
  detected_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('offered','accepted','declined','faded')),
  declined_until INTEGER,
  reminder_notification_id TEXT
);
CREATE TABLE family_contact (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 30),
  phone_e164 TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TRIGGER family_contact_limit BEFORE INSERT ON family_contact
WHEN (SELECT COUNT(*) FROM family_contact) >= 3
BEGIN SELECT RAISE(ABORT, 'CONTACT_LIMIT'); END;
CREATE TABLE paired_tarha (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  device_id TEXT NOT NULL,
  name TEXT NOT NULL,
  firmware TEXT NOT NULL,
  paired_at INTEGER NOT NULL
);
`;

export const MIGRATIONS: readonly Migration[] = [{ version: 1, sql: V1 }];
export const SCHEMA_VERSION = MIGRATIONS.length;
