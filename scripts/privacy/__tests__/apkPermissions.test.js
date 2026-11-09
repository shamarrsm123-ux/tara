const { describe, expect, test } = require('@jest/globals');
const { parsePermissions, findPermissionViolations } = require('../apkPermissions');

const badging = (...lines) => ["package: name='org.tara.app' versionCode='1'", ...lines].join('\n');

describe('parsePermissions', () => {
  test('reads names and maxSdkVersion from aapt badging output', () => {
    const out = badging(
      "uses-permission: name='android.permission.VIBRATE'",
      "uses-permission: name='android.permission.ACCESS_FINE_LOCATION' maxSdkVersion='30'",
    );
    expect(parsePermissions(out)).toEqual([
      { name: 'android.permission.VIBRATE', maxSdk: null },
      { name: 'android.permission.ACCESS_FINE_LOCATION', maxSdk: 30 },
    ]);
  });
});

describe('findPermissionViolations', () => {
  test('passes a release APK without network or location permissions', () => {
    const out = badging("uses-permission: name='android.permission.VIBRATE'");
    expect(findPermissionViolations(out)).toEqual([]);
  });

  test('fails when INTERNET is present (P1)', () => {
    const out = badging("uses-permission: name='android.permission.INTERNET'");
    expect(findPermissionViolations(out)).toHaveLength(1);
  });

  test.each(['ACCESS_COARSE_LOCATION', 'ACCESS_BACKGROUND_LOCATION'])('fails on %s (P7)', (perm) => {
    const out = badging(`uses-permission: name='android.permission.${perm}'`);
    expect(findPermissionViolations(out)).toHaveLength(1);
  });

  test.each(['RECORD_AUDIO', 'FOREGROUND_SERVICE_MICROPHONE'])('fails on microphone permission %s', (perm) => {
    const out = badging(`uses-permission: name='android.permission.${perm}'`);
    expect(findPermissionViolations(out)).toHaveLength(1);
  });

  test('allows fine location only when capped at Android 11 (10 §4)', () => {
    const capped = badging("uses-permission: name='android.permission.ACCESS_FINE_LOCATION' maxSdkVersion='30'");
    const uncapped = badging("uses-permission: name='android.permission.ACCESS_FINE_LOCATION'");
    const tooHigh = badging("uses-permission: name='android.permission.ACCESS_FINE_LOCATION' maxSdkVersion='31'");
    expect(findPermissionViolations(capped)).toEqual([]);
    expect(findPermissionViolations(uncapped)).toHaveLength(1);
    expect(findPermissionViolations(tooHigh)).toHaveLength(1);
  });
});
