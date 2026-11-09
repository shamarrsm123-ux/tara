// Plays bundled voice lines with expo-audio. One line at a time: a new line stops the previous one.
// Audio files are bundled assets — nothing is downloaded or recorded (06 §2, 10 §3).
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { Lang, VoiceLineId } from '../../shared/types';
import { VOICE_ASSETS } from './lines';

let current: AudioPlayer | null = null;

export function stopVoice(): void {
  current?.remove();
  current = null;
}

/** Returns false if the platform couldn't play audio; callers keep working silently (text is always on screen). */
export function playVoice(lang: Lang, line: VoiceLineId): boolean {
  stopVoice();
  try {
    const player = createAudioPlayer(VOICE_ASSETS[lang][line].source);
    player.play();
    current = player;
    return true;
  } catch (error: unknown) {
    if (__DEV__) {
      // Content-free: the line id is not personal data (06 §9).
      console.warn(`voice: could not play ${line}`, error instanceof Error ? error.name : 'unknown');
    }
    return false;
  }
}
