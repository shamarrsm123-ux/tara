// Web preview: no SMS app — say so instead of faking it (06 §2 dev tool).
export type ComposerResult = 'opened' | 'unavailable';

export async function openComposer(_phoneE164: string, _message: string): Promise<ComposerResult> {
  return 'unavailable';
}
