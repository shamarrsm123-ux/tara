// Onboarding acceptance (03 Flows O1–O6, rebuilt 2026-11-17) through the real UI and the real SQL store on disk
// (12 §4): nothing exists before "Yes, keep TARA"; "Not now" keeps TARA for this session with no files; "Yes"
// creates the database + key and every setup answer is saved; Delete Everything returns to a fresh install.
// (That the file is *encrypted* is checked on a device: scripts/device/verify-sqlcipher.sh.)
import { fireEvent, render, screen } from '@testing-library/react-native';
import { createSqlStore } from '../../store/sqlStore';
import { filesIn, makeTestDeps } from '../../store/__tests__/nodeSqliteDeps';
import { translatorFor } from '../../ui/i18n';
import { TryFlow } from '../TryFlow';
import { INITIAL_TRY } from '../tryNavigation';
import { press, seconds, toKeepQuestion } from './onboard';

const t = translatorFor('en');
jest.setTimeout(30_000);

async function renderFresh() {
  const deps = makeTestDeps(Date.now());
  const store = createSqlStore(deps);
  await render(<TryFlow store={store} initial={INITIAL_TRY} />);
  return { deps, store };
}

describe('Onboarding (03 Flows O1–O6) and Delete Everything', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 10, 17, 10, 0) }));
  afterEach(() => jest.useRealTimers());

  test('Meet TARA: three pages with dots; Back walks the pages, then to the language picker', async () => {
    await renderFresh();
    await press('lang-en');
    await press('language-continue');
    expect(screen.getByText(t('intro.coolTitle'))).toBeTruthy();
    expect(screen.getByTestId('intro-dots')).toBeTruthy();
    await press('intro-next');
    expect(screen.getByText(t('intro.calmTitle'))).toBeTruthy();
    await press('intro-next');
    expect(screen.getByText(t('intro.privateTitle'))).toBeTruthy();
    expect(screen.getByTestId('intro-start')).toBeTruthy();
    await press('back');
    expect(screen.getByText(t('intro.calmTitle'))).toBeTruthy();
    await press('back');
    await press('back');
    expect(screen.getByTestId('screen-language')).toBeTruthy();
  });

  test('"Not now" → nothing saved, TARA keeps running unsaved; its card brings the question back', async () => {
    const { deps, store } = await renderFresh();
    await toKeepQuestion();
    expect(screen.getByText(t('keep.title'))).toBeTruthy();
    expect(screen.getByTestId('save-meter')).toBeTruthy();
    expect(filesIn(deps.dir)).toEqual([]); // nothing on disk at the question
    await press('save-no');
    expect(screen.getByTestId('screen-nothing-saved-message')).toHaveTextContent(t('save.nothingSaved'));
    await press('notice-ok');
    expect(screen.getByTestId('screen-home')).toBeTruthy();
    expect(screen.getByTestId('try-keep')).toBeTruthy();
    expect(screen.getByText(t('keep.tryCard'))).toBeTruthy();
    expect(filesIn(deps.dir)).toEqual([]);
    expect(deps.keyring.peek()).toBeNull();
    expect(await store.isSetUp()).toBe(false);
    await press('try-keep-button');
    expect(screen.getByTestId('screen-save')).toBeTruthy();
  });

  test('"Yes" → database + key; name, age, PMDD-aware cooling, reminders saved; Daily with the tip; Delete → fresh', async () => {
    const { deps, store } = await renderFresh();
    await toKeepQuestion();
    await press('save-yes');
    await seconds(1);
    expect(filesIn(deps.dir)).toContain('tara.db');
    expect(deps.keyring.peek()).not.toBeNull();

    expect(screen.getByTestId('screen-setup-name')).toBeTruthy();
    expect(screen.queryByTestId('back')).toBeNull(); // no way back to the Save question
    await fireEvent.changeText(screen.getByTestId('setup-name-input'), 'Amira');
    await press('setup-name-save');
    await seconds(1);
    await press('setup-age-26_35');
    await seconds(1);
    expect(await store.getProfile()).toMatchObject({ displayName: 'Amira', ageGroup: '26_35', language: 'en' });

    expect(screen.getByText(t('setup.cycleQuestion'))).toBeTruthy();
    await press('setup-cycle-yes');
    await press('setup-cycle-day-3');
    await press('setup-cycle-longer');
    await press('setup-cycle-longer');
    expect(screen.getByTestId('setup-cycle-length')).toHaveTextContent(t('cycle.lengthValue', { n: '30' }));
    await press('setup-cycle-length-next');
    await seconds(1);
    expect(await store.getSettings()).toMatchObject({ cycleAware: true, cycleLengthDays: 30 });
    expect(await store.listCycleStarts()).toEqual([{ dayMs: new Date(2026, 10, 14).getTime(), isEstimated: false }]);

    await press('setup-reminders-no');
    await seconds(1);
    expect((await store.getSettings()).patternOffers).toBe(false);
    expect(screen.getByTestId('screen-setup-family')).toBeTruthy();
    await press('setup-finish');
    await seconds(1);

    expect(screen.getByTestId('tab-bar')).toBeTruthy();
    expect(screen.getByText(t('setup.tip'))).toBeTruthy();
    expect(screen.getByTestId('cycle-phase')).toHaveTextContent(t('cycle.phase.menstrual'));
    await press('first-tip-ok');
    expect(screen.queryByTestId('first-tip')).toBeNull();

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

  test('setup: "Longer ago / I don\'t know" turns PMDD-aware cooling on with no date — Home asks for day 1', async () => {
    const { store } = await renderFresh();
    await toKeepQuestion();
    await press('save-yes');
    await seconds(1);
    await press('setup-name-skip');
    await seconds(1);
    await press('setup-age-skip');
    await seconds(1);
    await press('setup-cycle-yes');
    await press('setup-cycle-day-unknown');
    await press('setup-cycle-length-unknown');
    await seconds(1);
    expect(await store.getSettings()).toMatchObject({ cycleAware: true, cycleLengthDays: 28 });
    expect(await store.listCycleStarts()).toEqual([]);
    await press('setup-reminders-yes');
    await seconds(1);
    await press('setup-finish');
    await seconds(1);
    expect(screen.getByTestId('cycle-log-first')).toBeTruthy();
  });
});
