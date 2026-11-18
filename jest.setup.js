/* global jest */
// Native audio isn't available under Jest; voice playback is asserted through this mock.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), remove: jest.fn() })),
}));

// UI tests run without Bluetooth (like the web preview): Flow 1 then offers "Use demo instead". Tests that need
// a tarha mock this module themselves with the simulated transport (src/ble/__tests__/simTransport.ts).
jest.mock('./src/ble/createTarhaSource', () => ({ createBluetooth: () => null }));

// Notifee's native module isn't available under Jest: UI tests run with no OS notifier (like the web preview).
jest.mock('./src/notify/createNotifier', () => ({ createNotifier: () => null, registerMonitoringService: () => undefined }));

// Phone battery under Jest: a steady 80 % with a removable listener (02 §8.14 logic is tested in engine/).
jest.mock('expo-battery', () => ({
  getBatteryLevelAsync: jest.fn(async () => 0.8),
  addBatteryLevelListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// SMS composer under Jest: records calls so tests can prove it opens only from the preview's Send (12 §4 P8).
jest.mock('expo-sms', () => ({
  isAvailableAsync: jest.fn(async () => true),
  sendSMSAsync: jest.fn(async () => ({ result: 'unknown' })),
}));
