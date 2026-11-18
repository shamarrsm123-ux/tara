// Family for emergencies (03 Flow 10): up to 3 contacts typed in (name + number starting with +); each shows the
// name and the last 3 digits; optional test message via the SMS app; remove with a confirmation. 🟡 The phone's
// contact picker is not used, so TARA never needs a contacts permission.
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { CONTACT_LIMIT, CONTACT_NAME_MAX, type Contact } from '../../shared/storePort';
import { lastDigits } from '../../sos/message';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Surface';
import { useUi } from '../theme/UiProvider';
import { PRIMARY_BUTTON_HEIGHT, SPACE, TYPE_SIZE } from '../theme/tokens';

export type AddResult = 'ok' | 'invalid' | 'limit';

export interface FamilyTools {
  contacts: readonly Contact[];
  onAdd: (name: string, phone: string) => Promise<AddResult>;
  onRemove: (id: number) => void;
  onTest: (contact: Contact) => void;
}

const PHONE_MAX = 20;

function AddForm({ onAdd, onDone }: { onAdd: FamilyTools['onAdd']; onDone: () => void }) {
  const { t, palette, fonts, isRtl } = useUi();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+');
  const [error, setError] = useState<AddResult | null>(null);
  const input = [styles.input, { borderColor: palette.sand, color: palette.text, fontFamily: fonts.regular, textAlign: isRtl ? ('right' as const) : ('left' as const) }];
  return (
    <View style={styles.block} testID="family-form">
      <TextInput value={name} onChangeText={setName} maxLength={CONTACT_NAME_MAX} placeholder={t('family.name')} placeholderTextColor={palette.textMuted} style={input} testID="family-name" />
      <TextInput
        value={phone}
        onChangeText={setPhone}
        maxLength={PHONE_MAX}
        keyboardType="phone-pad"
        placeholder={t('family.phone')}
        placeholderTextColor={palette.textMuted}
        style={[input, { writingDirection: 'ltr', textAlign: 'left' }]}
        testID="family-phone"
      />
      {error !== null && (
        <AppText variant="body" color="high" isBold testID="family-error">
          {t(error === 'limit' ? 'family.max' : 'family.invalid')}
        </AppText>
      )}
      <Button
        label={t('family.save')}
        onPress={() =>
          void onAdd(name, phone).then((r) => {
            if (r === 'ok') onDone();
            else setError(r);
          })
        }
        testID="family-save"
      />
      <Button label={t('mute.cancel')} variant="outlined" tone="neutral" onPress={onDone} testID="family-cancel" />
    </View>
  );
}

export function FamilySection({ contacts, onAdd, onRemove, onTest, startOpen = false }: FamilyTools & { startOpen?: boolean }) {
  const { t } = useUi();
  const [isAdding, setIsAdding] = useState(startOpen);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  return (
    <Card testID="family-section">
      <AppText variant="question" isBold>
        {t('family.title')}
      </AppText>
      {contacts.map((c) => (
        <View key={c.id} style={styles.block} testID={`family-contact-${c.id}`}>
          <AppText variant="body" isBold>
            {`${c.name}  ${t('family.ending', { digits: lastDigits(c.phoneE164) })}`}
          </AppText>
          {confirmId === c.id ? (
            <>
              <AppText variant="body">{t('family.confirmRemove')}</AppText>
              <Button label={t('family.remove')} tone="high" onPress={() => onRemove(c.id)} testID={`family-remove-yes-${c.id}`} />
              <Button label={t('mute.cancel')} variant="outlined" tone="neutral" onPress={() => setConfirmId(null)} />
            </>
          ) : (
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button label={t('family.test')} variant="outlined" tone="neutral" onPress={() => onTest(c)} testID={`family-test-${c.id}`} />
              </View>
              <View style={styles.flex}>
                <Button label={t('family.remove')} variant="outlined" tone="neutral" onPress={() => setConfirmId(c.id)} testID={`family-remove-${c.id}`} />
              </View>
            </View>
          )}
        </View>
      ))}
      {isAdding ? (
        <AddForm onAdd={onAdd} onDone={() => setIsAdding(false)} />
      ) : contacts.length < CONTACT_LIMIT ? (
        <Button label={t('family.add')} onPress={() => setIsAdding(true)} testID="family-add" />
      ) : (
        <AppText variant="caption" color="textMuted">
          {t('family.max')}
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  block: { gap: SPACE.sm },
  row: { flexDirection: 'row', gap: SPACE.sm },
  flex: { flex: 1 },
  input: { minHeight: PRIMARY_BUTTON_HEIGHT, borderWidth: 1.5, borderRadius: 18, paddingHorizontal: SPACE.lg, fontSize: TYPE_SIZE.body },
});
