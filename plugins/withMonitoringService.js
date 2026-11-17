// Expo config plugin: the Android foreground service that keeps TARA monitoring with the screen off (03 Flow 7,
// 06 §2 Notifee). Android 14+ requires a declared service type: "connectedDevice" (talking to the tarha over
// Bluetooth). Adds only the permissions that needs: FOREGROUND_SERVICE, FOREGROUND_SERVICE_CONNECTED_DEVICE and
// POST_NOTIFICATIONS (Android 13+). No location type is ever declared (P7).
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const SERVICE = 'app.notifee.core.ForegroundService';
const PERMISSIONS = [
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE',
  'android.permission.POST_NOTIFICATIONS',
];

/** Pure transform of the parsed manifest (exported for tests). */
function addMonitoringService(manifest) {
  const root = manifest.manifest;
  const existing = new Set((root['uses-permission'] || []).map((p) => p.$['android:name']));
  const permissions = [...(root['uses-permission'] || []), ...PERMISSIONS.filter((p) => !existing.has(p)).map((name) => ({ $: { 'android:name': name } }))];
  const app = (root.application || [])[0] || { $: {} };
  const services = (app.service || []).filter((s) => s.$['android:name'] !== SERVICE);
  const service = { $: { 'android:name': SERVICE, 'android:exported': 'false', 'android:foregroundServiceType': 'connectedDevice', 'tools:replace': 'android:foregroundServiceType' } };
  const nextApp = { ...app, service: [...services, service] };
  return {
    ...manifest,
    manifest: { ...root, $: { ...root.$, 'xmlns:tools': 'http://schemas.android.com/tools' }, 'uses-permission': permissions, application: [nextApp, ...(root.application || []).slice(1)] },
  };
}

const withMonitoringService = (config) =>
  withAndroidManifest(config, (c) => {
    AndroidConfig.Manifest.ensureToolsAvailable(c.modResults);
    c.modResults = addMonitoringService(c.modResults);
    return c;
  });

module.exports = withMonitoringService;
module.exports.addMonitoringService = addMonitoringService;
