const { afterEach, beforeEach, describe, expect, jest: jestApi, test } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const forbiddenDeps = require('../forbiddenDeps');
const sourceScan = require('../sourceScan');
const apkPermissions = require('../apkPermissions');

// Each check's CLI must exit non-zero on a violation so CI fails (12 §4).
class ExitCalled extends Error {
  constructor(code) {
    super(`exit ${code}`);
    this.code = code;
  }
}

const runMain = (main, args) => {
  process.argv = ['node', 'script', ...args];
  try {
    main();
    return 0;
  } catch (error) {
    if (error instanceof ExitCalled) return error.code;
    throw error;
  }
};

let tmp;
const originalArgv = process.argv;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tara-cli-'));
  jestApi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new ExitCalled(code);
  });
  jestApi.spyOn(console, 'log').mockImplementation(() => undefined);
  jestApi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  process.argv = originalArgv;
  jestApi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
});

const write = (file, content) => {
  fs.mkdirSync(path.dirname(path.join(tmp, file)), { recursive: true });
  fs.writeFileSync(path.join(tmp, file), content);
};

describe('forbiddenDeps CLI', () => {
  test('exits 0 for a clean project', () => {
    write('package.json', JSON.stringify({ dependencies: { expo: '1' } }));
    write('package-lock.json', JSON.stringify({ packages: { 'node_modules/expo': {} } }));
    expect(runMain(forbiddenDeps.main, [tmp])).toBe(0);
  });

  test('exits 1 when Firebase is in the lockfile', () => {
    write('package.json', JSON.stringify({ dependencies: {} }));
    write('package-lock.json', JSON.stringify({ packages: { 'node_modules/firebase': {} } }));
    expect(runMain(forbiddenDeps.main, [tmp])).toBe(1);
  });
});

describe('sourceScan CLI', () => {
  test('exits 0 when app source is clean', () => {
    write('src/a.ts', 'export const a = 1;\n');
    expect(runMain(sourceScan.main, [tmp])).toBe(0);
  });

  test('exits 1 when app source calls fetch', () => {
    write('src/a.ts', 'fetch("x");\n');
    expect(runMain(sourceScan.main, [tmp])).toBe(1);
  });
});

describe('apkPermissions CLI', () => {
  test('exits 0 for a release APK without INTERNET', () => {
    write('b.txt', "package: name='org.tara.app'\nuses-permission: name='android.permission.VIBRATE'\n");
    expect(runMain(apkPermissions.main, [path.join(tmp, 'b.txt')])).toBe(0);
  });

  test('exits 1 for a release APK with INTERNET', () => {
    write('b.txt', "package: name='org.tara.app'\nuses-permission: name='android.permission.INTERNET'\n");
    expect(runMain(apkPermissions.main, [path.join(tmp, 'b.txt')])).toBe(1);
  });

  test('exits 2 when input is not aapt output (never silently passes)', () => {
    write('b.txt', 'not badging output\n');
    expect(runMain(apkPermissions.main, [path.join(tmp, 'b.txt')])).toBe(2);
  });
});
