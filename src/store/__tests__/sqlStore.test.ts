/**
 * @jest-environment node
 */
// The encrypted store against real SQLite (12 §3–4): contract suite + file-level checks — no DB or key
// before "Yes", CHECK/trigger backstops, wipe order (05 §4), interrupted setup, migrations.
import { describe, expect, test } from '@jest/globals';
import { createSqlStore, type DbFiles } from '../sqlStore';
import { filesIn, makeTestDeps, rawDb } from './nodeSqliteDeps';
import { describeStoreContract, expectCode, T0, TRY_INPUT } from './storeContract';

describeStoreContract('SQL store', () => {
  const deps = makeTestDeps(T0);
  return { store: createSqlStore(deps), setNow: deps.setNow };
});

describe('SQL store — files on disk (12 §4)', () => {
  test('before "Yes" there is no database file and no key; after it there are both', async () => {
    const deps = makeTestDeps(T0);
    const store = createSqlStore(deps);
    expect(filesIn(deps.dir)).toEqual([]);
    expect(deps.keyring.peek()).toBeNull();
    await store.createFromTrySession(TRY_INPUT);
    expect(filesIn(deps.dir)).toContain('tara.db');
    expect(deps.keyring.peek()).toMatch(/^[0-9a-f]{64}$/);
  });

  test('the database itself rejects retention > 7 and a 4th contact', async () => {
    const deps = makeTestDeps(T0);
    const store = createSqlStore(deps);
    await store.createFromTrySession(TRY_INPUT);
    const db = rawDb(deps.dbPath);
    expect(() => db.exec('UPDATE settings SET retention_days = 14 WHERE id = 1;')).toThrow(/CHECK/);
    db.exec("INSERT INTO family_contact (name, phone_e164, created_at) VALUES ('a', '+201001234561', 1), ('b', '+201001234562', 1), ('c', '+201001234563', 1);");
    expect(() => db.exec("INSERT INTO family_contact (name, phone_e164, created_at) VALUES ('d', '+201001234564', 1);")).toThrow(/CONTACT_LIMIT/);
    db.close();
  });

  test('Delete Everything: key first (crypto-shred), then DB files, then preferences; folder empty after', async () => {
    const deps = makeTestDeps(T0);
    const store = createSqlStore(deps);
    await store.createFromTrySession(TRY_INPUT);
    await store.setDisplayName('Amira');
    deps.log.length = 0;
    await store.wipeEverything();
    expect(deps.log).toEqual(['key.remove', 'files.remove', 'prefs.clear']);
    expect(filesIn(deps.dir)).toEqual([]);
    expect(deps.keyring.peek()).toBeNull();
  });

  test('a setup that fails half-way leaves nothing behind', async () => {
    const deps = makeTestDeps(T0);
    const failingFiles: DbFiles = { open: () => Promise.reject(new Error('disk full')), remove: deps.files.remove };
    const store = createSqlStore({ ...deps, files: failingFiles });
    await expect(store.createFromTrySession(TRY_INPUT)).rejects.toThrow('disk full');
    expect(await store.isSetUp()).toBe(false);
    expect(deps.keyring.peek()).toBeNull();
    expect(filesIn(deps.dir)).toEqual([]);
    expect(await deps.prefs.read()).toBeNull();
  });

  test('data survives a restart (a new store on the same files)', async () => {
    const deps = makeTestDeps(T0);
    await createSqlStore(deps).createFromTrySession(TRY_INPUT);
    const reopened = createSqlStore(deps);
    expect(await reopened.isSetUp()).toBe(true);
    expect(await reopened.getBaseline()).toEqual(TRY_INPUT.baseline);
  });

  test('a v1 database is upgraded to v2 in place, keeping her data (05 §5)', async () => {
    const deps = makeTestDeps(T0);
    const first = createSqlStore(deps);
    await first.createFromTrySession(TRY_INPUT);
    await first.setDisplayName('Amira');
    const db = rawDb(deps.dbPath);
    db.exec('DROP TABLE check_in; DROP TABLE cycle_start; ALTER TABLE settings DROP COLUMN cycle_length_days; ALTER TABLE settings DROP COLUMN cycle_aware; PRAGMA user_version = 1;');
    db.close();
    const upgraded = createSqlStore(deps);
    expect((await upgraded.getProfile()).displayName).toBe('Amira');
    expect(await upgraded.getSettings()).toMatchObject({ cycleAware: false, cycleLengthDays: 28 });
    expect(await upgraded.listCycleStarts()).toEqual([]);
  });

  test('the database itself keeps at most 6 cycle starts and rejects bad check-in levels', async () => {
    const deps = makeTestDeps(T0);
    await createSqlStore(deps).createFromTrySession(TRY_INPUT);
    const db = rawDb(deps.dbPath);
    db.exec('INSERT INTO cycle_start (day_ms, is_estimated) VALUES (1,0),(2,0),(3,0),(4,0),(5,0),(6,0),(7,0);');
    expect(db.prepare('SELECT COUNT(*) AS n FROM cycle_start;').get()).toEqual({ n: 6 });
    expect(() => db.exec('INSERT INTO check_in (day_ms, mood, irritability, body) VALUES (1, 5, 0, 0);')).toThrow(/CHECK/);
    db.close();
  });

  test('a database from a newer app version is refused, not overwritten (05 §5)', async () => {
    const deps = makeTestDeps(T0);
    await createSqlStore(deps).createFromTrySession(TRY_INPUT);
    const db = rawDb(deps.dbPath);
    db.exec('PRAGMA user_version = 99;');
    db.close();
    await expectCode(createSqlStore(deps).getSettings(), 'STORE_CORRUPT');
  });

  test('writes are serialized in call order', async () => {
    const deps = makeTestDeps(T0);
    const store = createSqlStore(deps);
    await store.createFromTrySession(TRY_INPUT);
    await Promise.all([store.setDisplayName('A'), store.setDisplayName('B'), store.setDisplayName('C')]);
    expect((await store.getProfile()).displayName).toBe('C');
  });
});
