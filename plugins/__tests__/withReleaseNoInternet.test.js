const { describe, expect, test } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  RELEASE_MANIFEST_XML,
  RELEASE_MANIFEST_RELATIVE_PATH,
  writeReleaseManifest,
} = require('../withReleaseNoInternet');

describe('withReleaseNoInternet', () => {
  test('release manifest removes INTERNET with tools:node="remove"', () => {
    expect(RELEASE_MANIFEST_XML).toMatch(
      /<uses-permission android:name="android\.permission\.INTERNET" tools:node="remove" \/>/,
    );
    expect(RELEASE_MANIFEST_XML).toContain('xmlns:tools="http://schemas.android.com/tools"');
  });

  test('release manifest also drops the dev-only overlay permission', () => {
    expect(RELEASE_MANIFEST_XML).toMatch(
      /<uses-permission android:name="android\.permission\.SYSTEM_ALERT_WINDOW" tools:node="remove" \/>/,
    );
  });

  test('targets the release source set, not main or debug', () => {
    expect(RELEASE_MANIFEST_RELATIVE_PATH).toBe(path.join('app', 'src', 'release', 'AndroidManifest.xml'));
  });

  test('registers an android dangerous mod that writes the release manifest', async () => {
    const withReleaseNoInternet = require('../withReleaseNoInternet');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tara-mod-'));
    const config = withReleaseNoInternet({ name: 'tara', slug: 'tara' });
    const [mod] = Object.values(config.mods.android);

    await mod({ modRequest: { platformProjectRoot: root, nextMod: async (c) => c }, modResults: {} });

    expect(fs.existsSync(path.join(root, RELEASE_MANIFEST_RELATIVE_PATH))).toBe(true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('writes the manifest into the android project', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tara-android-'));

    const written = writeReleaseManifest(root);

    expect(fs.readFileSync(written, 'utf8')).toBe(RELEASE_MANIFEST_XML);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
