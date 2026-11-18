import { translatorFor } from '../../ui/i18n';
import { buildHelpMessage, buildTestMessage, lastDigits } from '../message';

describe('help message (03 Flow 11 step 4)', () => {
  const t = translatorFor('en');
  test('exact text with name and place', () => {
    expect(buildHelpMessage(t, 'Amal', 'in_field')).toBe('Amal needs help. Place: In the field. — sent from TARA');
  });
  test('no name, no place', () => {
    expect(buildHelpMessage(t, null, null)).toBe('Your family member needs help. — sent from TARA');
  });
  test('Arabic message uses her language', () => {
    expect(buildHelpMessage(translatorFor('ar_EG'), 'أمل', 'at_home')).toBe('أمل محتاجة مساعدة. المكان: في البيت. — مبعوتة من تارا');
  });
  test('test message and last digits', () => {
    expect(buildTestMessage(t, 'Amal')).toBe('This is a test from TARA. Amal added you as an emergency contact.');
    expect(lastDigits('+201001234567')).toBe('567');
  });
});
