// Phone wiring for the encrypted store (06 §2, 05 §1): SQLCipher via expo-sqlite, a random 256-bit key in the
// Android Keystore / iOS Keychain via expo-secure-store (never in the DB or preferences), and the two plain
// preferences (setup done, language) in the same app-private secure storage. The web preview resolves
// `platformStore.web.ts` instead.
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { TaraError } from '../shared/errors';
import type { PlainPrefs, Store } from '../shared/storePort';
import { LANGS, type Lang } from '../shared/types';
import { createSqlStore, type DbFiles, type Keyring, type PrefsStorage, type SqlConnection } from './sqlStore';

const DB_NAME = 'tara.db';
const KEY_ALIAS = 'tara.db.key';
const PREFS_ALIAS = 'tara.prefs';
const KEY_BYTES = 32;
/** Key and prefs never leave this device (no backup/transfer) and are readable only while unlocked. */
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

const toHex = (bytes: Uint8Array) => Array.from(bytes, (x) => x.toString(16).padStart(2, '0')).join('');

function wrap(db: SQLite.SQLiteDatabase): SqlConnection {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params = []) => {
      const r = await db.runAsync(sql, [...params]);
      return { changes: r.changes, lastId: r.lastInsertRowId };
    },
    all: (sql, params = []) => db.getAllAsync(sql, [...params]),
    close: () => db.closeAsync(),
  };
}

const files: DbFiles = {
  async open(keyHex) {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`PRAGMA key = "x'${keyHex}'";`); // must be the first statement (SQLCipher)
    try {
      await db.getFirstAsync('SELECT count(*) FROM sqlite_master;'); // wrong key → "file is not a database"
    } catch {
      await db.closeAsync().catch(() => undefined);
      throw new TaraError('STORE_LOCKED', 'database key rejected');
    }
    return wrap(db);
  },
  async remove() {
    // 🟡 deleteDatabaseAsync removes the DB file; the -wal/-shm check is part of the device wipe test (12 §4).
    await SQLite.deleteDatabaseAsync(DB_NAME).catch(() => undefined);
  },
};

const keyring: Keyring = {
  read: () => SecureStore.getItemAsync(KEY_ALIAS, SECURE_OPTIONS),
  async create() {
    const key = toHex(Crypto.getRandomBytes(KEY_BYTES));
    await SecureStore.setItemAsync(KEY_ALIAS, key, SECURE_OPTIONS);
    return key;
  },
  remove: () => SecureStore.deleteItemAsync(KEY_ALIAS, SECURE_OPTIONS),
};

function parsePrefs(raw: string | null): PlainPrefs | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Partial<PlainPrefs>;
    const isValid = typeof value.hasCompletedSetup === 'boolean' && LANGS.includes(value.language as Lang);
    return isValid ? { hasCompletedSetup: value.hasCompletedSetup as boolean, language: value.language as Lang } : null;
  } catch {
    return null; // unreadable prefs = not set up; the app starts fresh rather than crashing
  }
}

const prefs: PrefsStorage = {
  read: async () => parsePrefs(await SecureStore.getItemAsync(PREFS_ALIAS, SECURE_OPTIONS)),
  write: (p) => SecureStore.setItemAsync(PREFS_ALIAS, JSON.stringify(p), SECURE_OPTIONS),
  clear: () => SecureStore.deleteItemAsync(PREFS_ALIAS, SECURE_OPTIONS),
};

export function createPlatformStore(): Store {
  return createSqlStore({ files, keyring, prefs, now: Date.now });
}

/** True on the encrypted phone store; the web preview keeps everything in memory. */
export const IS_PERSISTENT = true;
