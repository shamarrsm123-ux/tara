import { isProbePassing, runSqlcipherProbe } from '../sqlcipherProbe';

// In-memory stand-in for expo-sqlite. `isEncrypted` models SQLCipher: data is readable only with
// the key it was written with. With isEncrypted=false it models plain SQLite (keys ignored).
// `stall` makes that call never settle, modelling a native module that doesn't respond (e.g. on web).
type Stall = 'none' | 'delete' | 'open';
const fakeDisk: { isEncrypted: boolean; key: string | null; rows: number[]; stall: Stall } = {
  isEncrypted: true,
  key: null,
  rows: [],
  stall: 'none',
};
const neverSettles = () => new Promise<never>(() => undefined);

beforeEach(() => {
  fakeDisk.isEncrypted = true;
  fakeDisk.stall = 'none';
});

jest.mock('expo-crypto', () => {
  let counter = 0;
  return { getRandomBytes: (n: number) => new Uint8Array(n).fill(++counter) };
});

jest.mock('expo-sqlite', () => ({
  deleteDatabaseAsync: async () => {
    if (fakeDisk.stall === 'delete') return neverSettles();
    fakeDisk.key = null;
    fakeDisk.rows = [];
  },
  openDatabaseAsync: async () => {
    if (fakeDisk.stall === 'open') return neverSettles();
    let sessionKey: string | null = null;
    const isLocked = () => fakeDisk.isEncrypted && fakeDisk.key !== null && fakeDisk.key !== sessionKey;
    return {
      execAsync: async (sql: string) => {
        const keyMatch = sql.match(/PRAGMA key = "x'([0-9a-f]+)'"/);
        if (keyMatch) {
          sessionKey = keyMatch[1] ?? null;
          return;
        }
        if (sql.startsWith('CREATE TABLE')) {
          fakeDisk.key = sessionKey;
          fakeDisk.rows = [42];
        }
      },
      getFirstAsync: async (sql: string) => {
        if (sql.startsWith('PRAGMA cipher_version')) {
          return fakeDisk.isEncrypted ? { cipher_version: '4.6.1 community' } : null;
        }
        if (isLocked()) throw new Error('file is not a database');
        return fakeDisk.rows.length > 0 ? { v: fakeDisk.rows[0] } : null;
      },
      closeAsync: async () => undefined,
    };
  },
}));

describe('runSqlcipherProbe', () => {
  test('passes every step when the database is encrypted with SQLCipher', async () => {
    fakeDisk.isEncrypted = true;

    const steps = await runSqlcipherProbe();

    expect(steps.map((s) => s.isPass)).toEqual([true, true, true, true]);
    expect(isProbePassing(steps)).toBe(true);
  });

  test('fails when the build uses plain SQLite (no cipher, any key reads data)', async () => {
    fakeDisk.isEncrypted = false;

    const steps = await runSqlcipherProbe();

    expect(isProbePassing(steps)).toBe(false);
    expect(steps.filter((s) => !s.isPass).map((s) => s.name)).toEqual([
      'SQLCipher linked (cipher_version)',
      'Wrong key is rejected',
      'No key is rejected',
    ]);
  });
});

describe('runSqlcipherProbe timeouts', () => {
  test('fails visibly instead of hanging when SQLite never responds', async () => {
    fakeDisk.stall = 'delete';

    const steps = await runSqlcipherProbe(20);

    expect(steps).toEqual([{ name: 'SQLite responds (TimeoutError)', isPass: false }]);
    expect(isProbePassing(steps)).toBe(false);
  });

  test('marks each stalled step as a timeout failure', async () => {
    fakeDisk.stall = 'open';

    const steps = await runSqlcipherProbe(20);

    expect(steps).toHaveLength(4);
    expect(steps.every((s) => !s.isPass && s.name.endsWith('(TimeoutError)'))).toBe(true);
  });
});

describe('isProbePassing', () => {
  test('is false for an empty result', () => {
    expect(isProbePassing([])).toBe(false);
  });
});
