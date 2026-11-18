// 13 Phase 10 acceptance (12 §6 flow 5, 12 §4 P8): add a contact → Help → Yes → place "In the field" → the preview
// text is exact → the SMS composer opens ONLY from Send, with exactly that text and number.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as SMS from 'expo-sms';
import { DEFAULT_BASELINE } from '../../signal/stress';
import { createMemoryStore } from '../../store/memoryStore';
import { translatorFor } from '../../ui/i18n';
import { initialStateFor } from '../launch';
import { TryFlow } from '../TryFlow';

const t = translatorFor('en');
const press = (id: string) => fireEvent.press(screen.getByTestId(id));
const settle = async (n = 3) => {
  for (let i = 0; i < n; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });
  }
};

async function setUp(withPlaces: boolean, seed: readonly (readonly [string, string])[] = []) {
  const store = createMemoryStore(() => Date.now());
  await store.createFromTrySession({ lang: 'en', baseline: DEFAULT_BASELINE, prefs: {} });
  await store.setDisplayName('Amal');
  for (const [name, phoneE164] of seed) await store.addContact({ name, phoneE164 });
  if (withPlaces) await store.updateSettings({ placeLabelsEnabled: true, enabledPlaceLabels: ['in_field', 'at_home'] });
  await render(<TryFlow store={store} initial={await initialStateFor(store)} />);
  await settle();
  return store;
}

describe('Family & help request (13 Phase 10)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 17, 11, 0) });
    jest.mocked(SMS.sendSMSAsync).mockClear();
  });
  afterEach(() => jest.useRealTimers());

  test('add contact → Help → Yes → In the field → exact preview → composer only on Send', async () => {
    const store = await setUp(true);
    await press('tab-safety');
    await settle();
    await press('family-add');
    await fireEvent.changeText(screen.getByTestId('family-name'), 'Mama');
    await fireEvent.changeText(screen.getByTestId('family-phone'), '+20 100 123 4567');
    await press('family-save');
    await settle();
    expect(await store.listContacts()).toHaveLength(1);
    expect(screen.getByText('Mama  …567')).toBeTruthy();

    await press('tab-home');
    await settle();
    await press('help-button');
    await press('help-yes');
    await press('help-place-in_field');
    const expected = 'Amal needs help. Place: In the field. — sent from TARA';
    expect(screen.getByTestId('help-message')).toHaveTextContent(expected);
    expect(SMS.sendSMSAsync).not.toHaveBeenCalled(); // nothing is opened before she presses Send

    await press('help-send');
    await settle();
    expect(SMS.sendSMSAsync).toHaveBeenCalledTimes(1);
    expect(SMS.sendSMSAsync).toHaveBeenCalledWith(['+201001234567'], expected);
    expect(screen.getByText(t('help.didSend'))).toBeTruthy();
    await press('help-did-send-yes');
    expect(screen.queryByTestId('help-preview')).toBeNull();
  });

  test('no family yet → "Add family" goes to Safety; nothing is sent', async () => {
    await setUp(false);
    await press('help-button');
    await press('help-yes');
    expect(screen.getByText(t('help.noFamily'))).toBeTruthy();
    await press('help-add-family');
    await settle();
    expect(screen.getByTestId('screen-safety')).toBeTruthy();
    expect(SMS.sendSMSAsync).not.toHaveBeenCalled();
  });

  test('a 4th contact is refused with a plain message', async () => {
    await setUp(false, [
      ['A', '+201001234561'],
      ['B', '+201001234562'],
      ['C', '+201001234563'],
    ]);
    await press('tab-safety');
    await settle();
    expect(screen.queryByTestId('family-add')).toBeNull();
    expect(screen.getByText(t('family.max'))).toBeTruthy();
  });
});
