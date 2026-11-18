// Opens the phone's SMS app with the number and text filled in (09 §8, P8). TARA never sends anything itself:
// she presses Send in the SMS app. Called only from the preview's Send button (and the family test message).
import * as SMS from 'expo-sms';

export type ComposerResult = 'opened' | 'unavailable';

export async function openComposer(phoneE164: string, message: string): Promise<ComposerResult> {
  if (!(await SMS.isAvailableAsync())) return 'unavailable';
  await SMS.sendSMSAsync([phoneE164], message);
  return 'opened';
}
