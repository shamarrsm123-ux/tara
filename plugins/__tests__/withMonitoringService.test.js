const { describe, expect, test } = require('@jest/globals');
const { addMonitoringService } = require('../withMonitoringService');

describe('withMonitoringService (03 Flow 7, P7)', () => {
  test('declares the connectedDevice foreground service and only the permissions it needs', () => {
    const out = addMonitoringService({ manifest: { $: {}, 'uses-permission': [{ $: { 'android:name': 'android.permission.VIBRATE' } }], application: [{ $: {} }] } }).manifest;
    expect(out['uses-permission'].map((p) => p.$['android:name'])).toEqual([
      'android.permission.VIBRATE',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE',
      'android.permission.POST_NOTIFICATIONS',
    ]);
    expect(out.application[0].service).toEqual([
      { $: { 'android:name': 'app.notifee.core.ForegroundService', 'android:exported': 'false', 'android:foregroundServiceType': 'connectedDevice', 'tools:replace': 'android:foregroundServiceType' } },
    ]);
    expect(JSON.stringify(out)).not.toMatch(/LOCATION/);
  });
});
