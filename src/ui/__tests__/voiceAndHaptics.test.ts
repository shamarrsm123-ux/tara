import { createAudioPlayer } from 'expo-audio';
import { Platform, Vibration } from 'react-native';
import { LANGS, VOICE_LINE_IDS } from '../../shared/types';
import { HAPTIC_GAP_MS, HAPTIC_LONG_MS, HAPTIC_PULSES, HAPTIC_SHORT_MS, playHaptic, vibrationTimings } from '../haptics';
import { placeholderEntries, VOICE_ASSETS } from '../voice/lines';
import { playVoice, stopVoice } from '../voice/player';

const mockCreate = createAudioPlayer as jest.Mock;

describe('voice registry (12 §2.4)', () => {
  test('every voice line has an asset in every language', () => {
    const missing = LANGS.flatMap((l) => VOICE_LINE_IDS.filter((id) => typeof VOICE_ASSETS[l][id]?.source !== 'number'));
    expect(missing).toEqual([]);
  });

  test('placeholders are flagged so a release check can block them (Phase 12)', () => {
    expect(placeholderEntries()).toHaveLength(LANGS.length * VOICE_LINE_IDS.length);
  });
});

describe('voice player', () => {
  beforeEach(() => mockCreate.mockClear());

  test('plays the bundled asset for the language and line', () => {
    expect(playVoice('ar_EG', 'highPrompt')).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(VOICE_ASSETS.ar_EG.highPrompt.source);
    const player = mockCreate.mock.results[0]!.value as { play: jest.Mock };
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  test('a new line stops the previous one', () => {
    playVoice('en', 'langName');
    const first = mockCreate.mock.results[0]!.value as { remove: jest.Mock };
    playVoice('en', 'deleteHold');
    expect(first.remove).toHaveBeenCalledTimes(1);
    stopVoice();
  });

  test('returns false instead of throwing when audio is unavailable', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockCreate.mockImplementationOnce(() => {
      throw new Error('no audio');
    });
    expect(playVoice('en', 'langName')).toBe(false);
  });
});

describe('haptics (04 §7)', () => {
  test('pulse patterns match the spec table', () => {
    expect(HAPTIC_PULSES).toEqual({
      rising: ['short', 'short'],
      highPrompt: ['long', 'long'],
      coolingStarted: ['short'],
      reminder: ['short', 'long'],
      batteryLow: ['short', 'short', 'short'],
    });
  });

  test('timings alternate vibration and gap', () => {
    expect(vibrationTimings('reminder')).toEqual([HAPTIC_SHORT_MS, HAPTIC_GAP_MS, HAPTIC_LONG_MS]);
    expect(vibrationTimings('coolingStarted')).toEqual([HAPTIC_SHORT_MS]);
  });

  test('Android patterns start with a zero wait', () => {
    const spy = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => undefined);
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    playHaptic('highPrompt');
    expect(spy).toHaveBeenCalledWith([0, HAPTIC_LONG_MS, HAPTIC_GAP_MS, HAPTIC_LONG_MS]);
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    playHaptic('highPrompt');
    expect(spy).toHaveBeenLastCalledWith([HAPTIC_LONG_MS, HAPTIC_GAP_MS, HAPTIC_LONG_MS]);
    Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
  });
});
