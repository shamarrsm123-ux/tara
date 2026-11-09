/* global jest */
// Native audio isn't available under Jest; voice playback is asserted through this mock.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), remove: jest.fn() })),
}));
