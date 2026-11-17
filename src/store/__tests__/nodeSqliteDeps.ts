/// <reference types="node" />
// Test-only platform pieces for createSqlStore: real SQLite via node:sqlite in a temp folder, an in-memory
// keyring and prefs. SQLite ignores `PRAGMA key`, so encryption itself is verified on a device (12 §4,
// scripts/device/verify-sqlcipher.sh); everything else — schema, CHECKs, retention, wipe order — is real.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { PlainPrefs } from '../../shared/storePort';
import type { DbFiles, Keyring, PrefsStorage, SqlConnection, SqlStoreDeps, SqlValue } from '../sqlStore';

export interface TestDeps extends SqlStoreDeps {
  dir: string;
  dbPath: string;
  /** Ordered log of destructive platform calls, to check the 05 §4 wipe order. */
  log: string[];
  keyring: Keyring & { peek(): string | null };
  setNow(ms: number): void;
}

function connect(dbPath: string, keyHex: string): SqlConnection {
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA key = "x'${keyHex}'";`);
  const params = (p: readonly SqlValue[] = []) => p as SqlValue[];
  return {
    exec: async (sql) => void db.exec(sql),
    run: async (sql, p) => {
      const r = db.prepare(sql).run(...params(p));
      return { changes: Number(r.changes), lastId: Number(r.lastInsertRowid) };
    },
    all: async <T>(sql: string, p?: readonly SqlValue[]) => db.prepare(sql).all(...params(p)) as T[],
    close: async () => db.close(),
  };
}

export function makeTestDeps(startMs: number): TestDeps {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tara-store-'));
  const dbPath = path.join(dir, 'tara.db');
  const log: string[] = [];
  let key: string | null = null;
  let prefs: PlainPrefs | null = null;
  let nowMs = startMs;
  let keyCount = 0;

  const files: DbFiles = {
    open: async (keyHex) => {
      log.push('open');
      return connect(dbPath, keyHex);
    },
    remove: async () => {
      log.push('files.remove');
      ['', '-wal', '-shm', '-journal'].forEach((suffix) => fs.rmSync(dbPath + suffix, { force: true }));
    },
  };
  const keyring = {
    read: async () => key,
    create: async () => {
      keyCount += 1;
      key = `${keyCount}`.padStart(64, '0');
      log.push('key.create');
      return key;
    },
    remove: async () => {
      log.push('key.remove');
      key = null;
    },
    peek: () => key,
  };
  const prefsStorage: PrefsStorage = {
    read: async () => prefs,
    write: async (p) => {
      prefs = { ...p };
    },
    clear: async () => {
      log.push('prefs.clear');
      prefs = null;
    },
  };
  return { dir, dbPath, log, files, keyring, prefs: prefsStorage, now: () => nowMs, setNow: (ms) => (nowMs = ms) };
}

/** Every file in the store's folder — the app-data check from 12 §4. */
export function filesIn(dir: string): string[] {
  return fs.readdirSync(dir);
}

/** Raw access for "the DB rejects a direct insert" checks. */
export function rawDb(dbPath: string): DatabaseSync {
  return new DatabaseSync(dbPath);
}
