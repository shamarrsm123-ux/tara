// Drives the rebuilt first run (03 Flows O1–O6) through the real UI, for the app tests.
import { act, fireEvent, screen } from '@testing-library/react-native';

export async function seconds(n: number): Promise<void> {
  for (let i = 0; i < n; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}

export const press = (id: string) => fireEvent.press(screen.getByTestId(id));

/** Language → Meet TARA (3 pages) → Get started → Connect with the demo tarha → Next. */
export async function toCalibrate(lang = 'en'): Promise<void> {
  await press(`lang-${lang}`);
  await press('language-continue');
  await press('intro-next');
  await press('intro-next');
  await press('intro-start');
  await press('connect-button');
  await seconds(1);
  await press('connect-demo');
  await seconds(6);
  await press('connect-next');
}

/** … → skip calibration → "Keep TARA on this phone?". */
export async function toKeepQuestion(lang = 'en'): Promise<void> {
  await toCalibrate(lang);
  await press('calibrate-skip');
  await seconds(1);
}

/** "Yes, keep TARA" → skip every setup step → Daily mode (the one-time tip is dismissed). */
export async function keepAndSkipSetup(): Promise<void> {
  await press('save-yes');
  await seconds(1);
  await press('setup-name-skip');
  await seconds(1);
  await press('setup-age-skip');
  await seconds(1);
  await press('setup-cycle-no');
  await press('setup-reminders-no');
  await seconds(1);
  await press('setup-finish');
  await seconds(1);
  await press('first-tip-ok');
}

/** The whole first run to Daily mode with the demo tarha. */
export async function onboardToDaily(): Promise<void> {
  await toKeepQuestion();
  await keepAndSkipSetup();
}

/** Language → Meet TARA → "See a 30-second demo": the Story scenario starts right away. */
export async function toStory(lang = 'en'): Promise<void> {
  await press(`lang-${lang}`);
  await press('language-continue');
  await press('intro-demo');
  await seconds(1);
}
