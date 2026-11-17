// Expo config plugin: keep only the location permission Android 8–11 needs to scan for Bluetooth devices
// (10 §4, P7). react-native-ble-plx adds both ACCESS_COARSE_LOCATION and ACCESS_FINE_LOCATION as
// <uses-permission-sdk-23 maxSdkVersion="30">; TARA's spec allows FINE only, capped at Android 11 (API 30).
// This removes COARSE and forces the cap on FINE. Android 12+ uses BLUETOOTH_SCAN with neverForLocation.
const { withAndroidManifest } = require('expo/config-plugins');

const MAX_SDK = '30';
const COARSE = 'android.permission.ACCESS_COARSE_LOCATION';
const FINE = 'android.permission.ACCESS_FINE_LOCATION';

/** Pure transform of the parsed manifest (exported for tests). */
function keepLegacyFineLocationOnly(manifest) {
  const sdk23 = (manifest.manifest['uses-permission-sdk-23'] || [])
    .filter((p) => p.$['android:name'] !== COARSE)
    .map((p) => (p.$['android:name'] === FINE ? { ...p, $: { ...p.$, 'android:maxSdkVersion': MAX_SDK } } : p));
  const plain = (manifest.manifest['uses-permission'] || []).filter(
    (p) => !(p.$['android:name'] === FINE && p.$['tools:node'] !== 'remove' && p.$['android:maxSdkVersion'] !== MAX_SDK),
  );
  return { ...manifest, manifest: { ...manifest.manifest, 'uses-permission-sdk-23': sdk23, 'uses-permission': plain } };
}

const withLegacyBleLocationOnly = (config) =>
  withAndroidManifest(config, (c) => {
    c.modResults = keepLegacyFineLocationOnly(c.modResults);
    return c;
  });

module.exports = withLegacyBleLocationOnly;
module.exports.keepLegacyFineLocationOnly = keepLegacyFineLocationOnly;
