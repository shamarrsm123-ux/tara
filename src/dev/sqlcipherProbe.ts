// Phase 0 debug-only probe: proves expo-sqlite is linked against SQLCipher on a real device (06 §2).
// Not product code. Rendered only when __DEV__ is true. Uses a throwaway random key that is never
// shown or logged. Leaves `tara-probe.db` on disk so scripts/device/verify-sqlcipher.sh can pull it
// and confirm the file header is not plaintext SQLite; that script deletes the file afterwards.
import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

export const PROBE_DB_NAME = 'tara-probe.db';
const KEY_BYTES = 32;
const PROBE_VALUE = 42;

export interface ProbeStep {
  name: string;
  isPass: boolean;
}

type Db = SQLite.SQLiteDatabase;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function openWithKey(hexKey: string | null): Promise<Db> {
  const db = await SQLite.openDatabaseAsync(PROBE_DB_NAME);
  if (hexKey !== null) {
    await db.execAsync(`PRAGMA key = "x'${hexKey}'";`);
  }
  return db;
}

/** True if the probe row is readable. A wrong or missing key makes SQLCipher throw
 *  "file is not a database" — that rejection is the expected outcome, so it maps to false. */
async function canRead(db: Db): Promise<boolean> {
  try {
    const row = await db.getFirstAsync<{ v: number }>('SELECT v FROM probe LIMIT 1;');
    return row?.v === PROBE_VALUE;
  } catch {
    return false;
  } finally {
    await db.closeAsync();
  }
}

export const PROBE_STEP_TIMEOUT_MS = 10_000;

class ProbeTimeoutError extends Error {
  override name = 'TimeoutError';
}

/** Rejects if `promise` hasn't settled within `ms`, so a stalled native call fails visibly. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ProbeTimeoutError(`no response after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function step(name: string, run: () => Promise<boolean>, timeoutMs: number): Promise<ProbeStep> {
  try {
    return { name, isPass: await withTimeout(run(), timeoutMs) };
  } catch (error: unknown) {
    const kind = error instanceof Error ? error.name : 'UnknownError';
    return { name: `${name} (${kind})`, isPass: false };
  }
}

export function isProbePassing(steps: readonly ProbeStep[]): boolean {
  return steps.length > 0 && steps.every((s) => s.isPass);
}

async function createProbeDb(key: string): Promise<boolean> {
  const db = await openWithKey(key);
  const row = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version;');
  await db.execAsync(`CREATE TABLE probe (v INTEGER NOT NULL); INSERT INTO probe (v) VALUES (${PROBE_VALUE});`);
  await db.closeAsync();
  return typeof row?.cipher_version === 'string' && row.cipher_version.length > 0;
}

export async function runSqlcipherProbe(timeoutMs: number = PROBE_STEP_TIMEOUT_MS): Promise<ProbeStep[]> {
  const key = toHex(Crypto.getRandomBytes(KEY_BYTES));
  const wrongKey = toHex(Crypto.getRandomBytes(KEY_BYTES));
  try {
    await withTimeout(SQLite.deleteDatabaseAsync(PROBE_DB_NAME), timeoutMs);
  } catch (error: unknown) {
    // No probe DB from a previous run is the normal case; a stalled native module is not.
    if (error instanceof ProbeTimeoutError) {
      return [{ name: 'SQLite responds (TimeoutError)', isPass: false }];
    }
  }
  return [
    await step('SQLCipher linked (cipher_version)', () => createProbeDb(key), timeoutMs),
    await step('Correct key reads data', async () => canRead(await openWithKey(key)), timeoutMs),
    await step('Wrong key is rejected', async () => !(await canRead(await openWithKey(wrongKey))), timeoutMs),
    await step('No key is rejected', async () => !(await canRead(await openWithKey(null))), timeoutMs),
  ];
}
