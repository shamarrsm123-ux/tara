/* global jest */
// Native audio isn't available under Jest; voice playback is asserted through this mock.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), remove: jest.fn() })),
}));

// UI tests run without Bluetooth (like the web preview): Flow 1 then offers "Use demo instead". Tests that need
// a tarha mock this module themselves with the simulated transport (src/ble/__tests__/simTransport.ts).
jest.mock('./src/ble/createTarhaSource', () => ({ createBluetooth: () => null }));
