// 13 Phase 6 acceptance, through the real UI and the real SQL store on disk (12 §4):
// choosing No leaves no files; choosing Yes creates the database + key; Delete Everything returns to a fresh
// install. (That the file is *encrypted* is checked on a device: scripts/device/verify-sqlcipher.sh.)
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createSqlStore } from '../../store/sqlStore';
import { filesIn, makeTestDeps } from '../../store/__tests__/nodeSqliteDeps';
import { translatorFor } from '../../ui/i18n';
import { TryFlow } from '../TryFlow';
import { INITIAL_TRY } from '../tryNavigation';

const t = translatorFor('en');
jest.setTimeout(30_000);

async function seconds(n: number) {
  for (let i = 0; i < n; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}
const press = (id: string) => fireEvent.press(screen.getByTestId(id));

/** Language → … → Home → prompt Yes → Continue → Example → Save question. */
async function toSaveQuestion() {
  const deps = makeTestDeps(Date.now());
  const store = createSqlStore(deps);
  await render(<TryFlow store={store} initial={INITIAL_TRY} />);
  for (const id of ['lang-en', 'language-continue', 'welcome-try', 'connect-button']) await press(id);
  await seconds(1);
  await press('connect-demo');
  await seconds(6);
  await press('connect-next');
  await press('calibrate-skip');
  await seconds(11);
  expect(screen.queryByTestId('home-continue')).toBeNull(); // the story continues only after the cooling scene
  await press('prompt-yes');
  await seconds(2);
  await press('home-continue');
  expect(screen.getByTestId('screen-example')).toBeTruthy();
  await press('example-no');
  expect(screen.getByTestId('example-meter')).toBeTruthy();
  await press('example-next');
  expect(screen.getByText(t('save.question'))).toBeTruthy();
  expect(filesIn(deps.dir)).toEqual([]); // still nothing on disk at Screen 5
  return { deps, store };
}

describe('Screens 4–6 and Delete Everything (13 Phase 6)', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 10, 16, 14, 0) }));
  afterEach(() => jest.useRealTimers());

  test('"No" → "Nothing was saved." → Choose Language, with no files, no key and no preferences', async () => {
    const { deps, store } = await toSaveQuestion();
    await press('save-no');
    expect(screen.getByTestId('screen-nothing-saved-message')).toHaveTextContent(t('save.nothingSaved'));
    await press('notice-ok');
    expect(screen.getByTestId('screen-language')).toBeTruthy();
    expect(filesIn(deps.dir)).toEqual([]);
    expect(deps.keyring.peek()).toBeNull();
    expect(await store.isSetUp()).toBe(false);
  });

  test('"Yes" → database + key; name and age range saved; Screen 6; Done → Daily mode; Delete Everything → fresh', async () => {
    const { deps, store } = await toSaveQuestion();
    await press('save-yes');
    await seconds(1);
    expect(filesIn(deps.dir)).toContain('tara.db');
    expect(deps.keyring.peek()).not.toBeNull();

    await fireEvent.changeText(screen.getByTestId('save-name-input'), 'Amira');
    await press('save-name-save');
    await seconds(1);
    await press('save-age-26_35');
    await seconds(1);
    expect(await store.getProfile()).toMatchObject({ displayName: 'Amira', ageGroup: '26_35', language: 'en' });
    expect((await store.getSettings()).patternOffers).toBe(false); // the Screen 4 answer

    expect(screen.getByTestId('screen-privacy')).toBeTruthy();
    expect(screen.getByTestId('safety-retention')).toHaveTextContent('7 days');
    await press('safety-retention-3');
    await seconds(1);
    expect((await store.getSettings()).retentionDays).toBe(3);
    expect(screen.queryByTestId('safety-retention-3')).toBeNull(); // never longer: only 1 day is offered now
    expect(screen.getByTestId('safety-retention-1')).toBeTruthy();
    await press('place-yes');
    await seconds(1);
    await press('place-at_market');
    await seconds(1);
    expect((await store.getSettings()).enabledPlaceLabels).toEqual(['in_field', 'at_home', 'on_road']);

    await press('privacy-done');
    expect(screen.getByTestId('tab-bar')).toBeTruthy();
    expect(screen.queryByTestId('back')).toBeNull(); // Daily mode: no way back into the story

    await press('tab-safety');
    await press('delete-everything');
    expect(screen.getByText(t('deleteAll.explain'))).toBeTruthy();
    await fireEvent(screen.getByTestId('delete-hold'), 'pressIn');
    await seconds(4);
    expect(screen.getByTestId('screen-deleted-message')).toHaveTextContent(t('deleteAll.done'));
    expect(filesIn(deps.dir)).toEqual([]);
    expect(deps.keyring.peek()).toBeNull();
    expect(await deps.prefs.read()).toBeNull();
    await press('notice-ok');
    expect(screen.getByTestId('screen-language')).toBeTruthy();
  });
});
