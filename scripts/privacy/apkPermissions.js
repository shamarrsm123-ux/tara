// Release APK permission check (10 P1/P7 and §4, 12 §4).
// Input: output of `aapt dump badging <apk>` or `aapt2 dump badging <apk>` on stdin or as a file.
//  - INTERNET must be absent (P1).
//  - Coarse/background location must be absent (P7).
//  - Fine location is allowed only when capped at maxSdkVersion <= 30 (Android 8–11 BLE scan, 10 §4).
//  - Microphone must be absent: voice lines are bundled playback only (🟡 Phase 1 hardening, 10 §3).
const fs = require('fs');

const MAX_SDK_FOR_LEGACY_BLE_LOCATION = 30;
const PERMISSION_LINE = /^uses-permission(?:-sdk-23)?:\s*name='([^']+)'(?:.*maxSdkVersion='(\d+)')?/;

const IMPLIED_LINE = /^uses-implied-permission:\s*name='([^']+)'/;

/** Permissions aapt only *infers* (e.g. COARSE from FINE): it prints them as a `uses-permission` line followed by a
 *  `uses-implied-permission` line. They are not in the APK's manifest, so they aren't requested by TARA. */
function impliedPermissions(badging) {
  return new Set(
    badging
      .split('\n')
      .map((line) => line.trim().match(IMPLIED_LINE))
      .filter(Boolean)
      .map(([, name]) => name),
  );
}

function parsePermissions(badging) {
  const implied = impliedPermissions(badging);
  return badging
    .split('\n')
    .map((line) => line.trim().match(PERMISSION_LINE))
    .filter(Boolean)
    .map(([, name, maxSdk]) => ({ name, maxSdk: maxSdk ? Number(maxSdk) : null }))
    .filter((p) => !implied.has(p.name));
}

function findPermissionViolations(badging) {
  return parsePermissions(badging).flatMap(({ name, maxSdk }) => {
    if (name === 'android.permission.INTERNET') {
      return [{ name, reason: 'release must not request INTERNET (P1)' }];
    }
    if (name === 'android.permission.ACCESS_COARSE_LOCATION' || name === 'android.permission.ACCESS_BACKGROUND_LOCATION') {
      return [{ name, reason: 'location permission not allowed (P7)' }];
    }
    if (name === 'android.permission.RECORD_AUDIO' || name === 'android.permission.FOREGROUND_SERVICE_MICROPHONE') {
      return [{ name, reason: 'microphone not allowed — TARA only plays bundled voice files (10 §3)' }];
    }
    if (name === 'android.permission.ACCESS_FINE_LOCATION') {
      const isCapped = maxSdk !== null && maxSdk <= MAX_SDK_FOR_LEGACY_BLE_LOCATION;
      return isCapped ? [] : [{ name, reason: 'fine location only allowed with maxSdkVersion<=30 (10 §4)' }];
    }
    return [];
  });
}

function main() {
  const input = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : fs.readFileSync(0, 'utf8');
  const permissions = parsePermissions(input);
  if (permissions.length === 0 && !/package:/.test(input)) {
    console.error('ERROR: input does not look like `aapt dump badging` output.');
    process.exit(2);
  }
  const violations = findPermissionViolations(input);
  impliedPermissions(input).forEach((name) => console.log(`  (implied by aapt, not declared: ${name})`));
  console.log('Release APK permissions:');
  permissions.forEach((p) => console.log(`  ${p.name}${p.maxSdk ? ` (maxSdk ${p.maxSdk})` : ''}`));
  if (violations.length > 0) {
    violations.forEach((v) => console.error(`VIOLATION ${v.name} — ${v.reason}`));
    process.exit(1);
  }
  console.log('OK: release APK permissions satisfy P1/P7.');
}

if (require.main === module) main();

module.exports = { main, parsePermissions, findPermissionViolations, impliedPermissions };
