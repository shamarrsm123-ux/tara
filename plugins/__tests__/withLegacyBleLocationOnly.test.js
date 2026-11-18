const { describe, expect, test } = require('@jest/globals');
const { keepLegacyFineLocationOnly } = require('../withLegacyBleLocationOnly');

const perm = (name, extra = {}) => ({ $: { 'android:name': name, ...extra } });

describe('withLegacyBleLocationOnly (10 §4, P7)', () => {
  test('drops coarse location and caps fine location at Android 11', () => {
    const input = {
      manifest: {
        'uses-permission-sdk-23': [perm('android.permission.ACCESS_COARSE_LOCATION', { 'android:maxSdkVersion': '30' }), perm('android.permission.ACCESS_FINE_LOCATION')],
        'uses-permission': [perm('android.permission.BLUETOOTH_SCAN'), perm('android.permission.ACCESS_FINE_LOCATION')],
      },
    };
    const out = keepLegacyFineLocationOnly(input).manifest;
    expect(out['uses-permission-sdk-23']).toEqual([
      perm('android.permission.ACCESS_FINE_LOCATION', { 'android:maxSdkVersion': '30' }),
      perm('android.permission.ACCESS_COARSE_LOCATION', { 'tools:node': 'remove' }),
    ]);
    expect(out['uses-permission'].map((p) => p.$['android:name'])).toEqual(['android.permission.BLUETOOTH_SCAN']);
  });
});
