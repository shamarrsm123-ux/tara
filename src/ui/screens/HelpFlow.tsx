// Help request (03 Flow 11, P8): question → (no family yet) → who → place (only if she enabled place labels) →
// preview of the exact message → Send opens the phone's SMS app (she presses Send there) → "Did your message
// send?". The composer is opened ONLY from the preview's Send button (09 §8). No GPS, ever.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Contact } from '../../shared/storePort';
import type { PlaceLabel } from '../../shared/types';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DecisionCard } from '../components/DecisionCard';
import { Card } from '../components/Surface';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';

export interface HelpTools {
  contacts: readonly Contact[];
  /** Place labels she chose to offer; empty when place labels are off. */
  placeLabels: readonly PlaceLabel[];
  buildMessage: (place: PlaceLabel | null) => string;
  /** Opens the SMS composer; resolves 'unavailable' if the phone has no SMS app. */
  openComposer: (contact: Contact, message: string) => Promise<'opened' | 'unavailable'>;
  onAddFamily: () => void;
}

interface HelpFlowProps extends HelpTools {
  /** Engine-initiated question (Flow 11 B): Yes/No is reported to the engine. */
  onQuestionAnswer?: (yes: boolean) => void;
  onClose: () => void;
}

type Step = 'ask' | 'noFamily' | 'who' | 'place' | 'preview' | 'didSend' | 'unavailable';

export function HelpFlow({ contacts, placeLabels, buildMessage, openComposer, onAddFamily, onQuestionAnswer, onClose }: HelpFlowProps) {
  const { t, palette } = useUi();
  const [step, setStep] = useState<Step>('ask');
  const [contact, setContact] = useState<Contact | null>(null);
  const [place, setPlace] = useState<PlaceLabel | null>(null);

  const afterContact = (c: Contact) => {
    setContact(c);
    setStep(placeLabels.length > 0 ? 'place' : 'preview');
  };
  const onYes = () => {
    onQuestionAnswer?.(true);
    const [only] = contacts;
    if (contacts.length === 0 || only === undefined) setStep('noFamily');
    else if (contacts.length === 1) afterContact(only);
    else setStep('who');
  };

  if (step === 'ask') {
    return (
      <DecisionCard
        tone="neutral"
        question={t('help.question')}
        yesLabel={t('common.yes')}
        noLabel={t('common.no')}
        voiceLine="helpQuestion"
        onYes={onYes}
        onNo={() => {
          onQuestionAnswer?.(false);
          onClose();
        }}
        testID="help"
      />
    );
  }
  if (step === 'noFamily') {
    return (
      <Card testID="help-no-family">
        <AppText variant="question">{t('help.noFamily')}</AppText>
        <Button label={t('help.addFamily')} onPress={onAddFamily} testID="help-add-family" />
        <Button label={t('help.notNow')} variant="outlined" tone="neutral" onPress={onClose} testID="help-not-now" />
      </Card>
    );
  }
  if (step === 'who') {
    return (
      <Card testID="help-who">
        <AppText variant="question">{t('help.who')}</AppText>
        {contacts.map((c) => (
          <Button key={c.id} label={c.name} variant="outlined" tone="neutral" onPress={() => afterContact(c)} testID={`help-who-${c.id}`} />
        ))}
      </Card>
    );
  }
  if (step === 'place') {
    return (
      <Card testID="help-place">
        <AppText variant="question">{t('help.place')}</AppText>
        {placeLabels.map((label) => (
          <Button
            key={label}
            label={t(`place.${label}`)}
            variant="outlined"
            tone="neutral"
            onPress={() => {
              setPlace(label);
              setStep('preview');
            }}
            testID={`help-place-${label}`}
          />
        ))}
        <Button
          label={t('help.noPlace')}
          variant="outlined"
          tone="neutral"
          onPress={() => {
            setPlace(null);
            setStep('preview');
          }}
          testID="help-place-none"
        />
      </Card>
    );
  }
  const message = buildMessage(place);
  if (step === 'preview' && contact !== null) {
    return (
      <Card testID="help-preview">
        <AppText variant="body" color="textMuted">
          {t('help.preview', { name: contact.name })}
        </AppText>
        <View style={[styles.bubble, { backgroundColor: palette.chip }]}>
          <AppText variant="question" testID="help-message">
            {message}
          </AppText>
        </View>
        <Button
          label={t('help.send')}
          hasArrow
          onPress={() => void openComposer(contact, message).then((r) => setStep(r === 'opened' ? 'didSend' : 'unavailable'))}
          testID="help-send"
        />
        <Button label={t('help.notNow')} variant="outlined" tone="neutral" onPress={onClose} testID="help-cancel" />
      </Card>
    );
  }
  if (step === 'unavailable') {
    return (
      <Card testID="help-unavailable">
        <AppText variant="question">{t('help.unavailable')}</AppText>
        <Button label={t('common.ok')} onPress={onClose} testID="help-unavailable-ok" />
      </Card>
    );
  }
  return (
    <DecisionCard
      tone="neutral"
      question={t('help.didSend')}
      yesLabel={t('common.yes')}
      noLabel={t('help.tryAgain')}
      onYes={onClose}
      onNo={() => setStep('preview')}
      testID="help-did-send"
    />
  );
}

const styles = StyleSheet.create({
  bubble: { padding: SPACE.md, borderRadius: 18, borderBottomStartRadius: 4 },
});
