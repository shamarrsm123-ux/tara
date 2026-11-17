// Screen 5 — Save This Experience? + Age Check (03 Flow 5, 04 §10). "No" → "Okay. Nothing was saved." (the
// container then wipes memory and returns to Choose Language). "Yes" → the container creates the encrypted
// store; then an optional name (one large field, Save / Skip) and the age range as four large chips in a 2×2
// grid (18–25, 26–35, 36–50, Skip) — never an exact age.
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { DISPLAY_NAME_MAX, type AgeGroup } from '../../shared/storePort';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DecisionCard } from '../components/DecisionCard';
import { ScreenFrame } from '../components/ScreenFrame';
import { VoiceButton } from '../components/VoiceButton';
import { useUi } from '../theme/UiProvider';
import { PRIMARY_BUTTON_HEIGHT, RADIUS, SPACE, TYPE_SIZE } from '../theme/tokens';
import { NoticeScreen } from './NoticeScreen';

interface SaveScreenProps {
  demo: { isSpedUp: boolean } | null;
  /** Creates the store. Rejects if saving failed (nothing is left behind in that case). */
  onSave: () => Promise<void>;
  /** Called after "Nothing was saved." is acknowledged. */
  onNothingSaved: () => void;
  onName: (name: string | null) => Promise<void>;
  onAge: (group: AgeGroup | null) => Promise<void>;
  onDone: () => void;
  onBack: () => void;
}

type Step = 'ask' | 'nothing' | 'name' | 'age';

const AGE_CHIPS: readonly { group: AgeGroup | null; key: 'save.age18_25' | 'save.age26_35' | 'save.age36_50' | 'save.skip' }[] = [
  { group: '18_25', key: 'save.age18_25' },
  { group: '26_35', key: 'save.age26_35' },
  { group: '36_50', key: 'save.age36_50' },
  { group: null, key: 'save.skip' },
];

function NameStep({ onName }: { onName: (name: string | null) => void }) {
  const { t, palette, fonts, isRtl } = useUi();
  const [name, setName] = useState('');
  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <AppText variant="question" style={styles.flex}>
          {t('save.nameQuestion')}
        </AppText>
        <VoiceButton line="nameQuestion" />
      </View>
      <TextInput
        value={name}
        onChangeText={setName}
        maxLength={DISPLAY_NAME_MAX}
        placeholder={t('save.namePlaceholder')}
        placeholderTextColor={palette.textMuted}
        autoCorrect={false}
        autoComplete="off"
        accessibilityLabel={t('save.namePlaceholder')}
        style={[
          styles.input,
          { borderColor: palette.sand, color: palette.text, fontFamily: fonts.regular, textAlign: isRtl ? 'right' : 'left', writingDirection: isRtl ? 'rtl' : 'ltr' },
        ]}
        testID="save-name-input"
      />
      <Button label={t('save.save')} onPress={() => onName(name)} isDisabled={name.trim().length === 0} testID="save-name-save" />
      <Button label={t('save.skip')} onPress={() => onName(null)} variant="outlined" tone="neutral" testID="save-name-skip" />
    </View>
  );
}

function AgeStep({ onAge }: { onAge: (group: AgeGroup | null) => void }) {
  const { t, palette } = useUi();
  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <AppText variant="question" style={styles.flex}>
          {t('save.ageQuestion')}
        </AppText>
        <VoiceButton line="ageQuestion" />
      </View>
      <View style={styles.grid}>
        {AGE_CHIPS.map(({ group, key }) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            onPress={() => onAge(group)}
            style={({ pressed }) => [styles.chip, { backgroundColor: group === null ? palette.surface : palette.tintPeach, borderColor: palette.sand, opacity: pressed ? 0.7 : 1 }]}
            testID={`save-age-${group ?? 'skip'}`}
          >
            <AppText variant="title" color={group === null ? 'textMuted' : 'text'}>
              {t(key)}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function SaveScreen({ demo, onSave, onNothingSaved, onName, onAge, onDone, onBack }: SaveScreenProps) {
  const { t } = useUi();
  const [step, setStep] = useState<Step>('ask');
  const [isBusy, setIsBusy] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  /** Runs a store call; on failure shows "Couldn't save" and stays on this step. */
  const attempt = async (work: () => Promise<void>, next: () => void) => {
    setIsBusy(true);
    setHasFailed(false);
    try {
      await work();
      next();
    } catch {
      setHasFailed(true);
    } finally {
      setIsBusy(false);
    }
  };

  if (step === 'nothing') return <NoticeScreen testID="screen-nothing-saved" message={t('save.nothingSaved')} voiceLine="nothingSaved" onOk={onNothingSaved} />;

  return (
    <ScreenFrame testID="screen-save" voiceLine={step === 'ask' ? 'saveQuestion' : undefined} onBack={step === 'ask' ? onBack : undefined} demo={demo}>
      {step === 'ask' && (
        <DecisionCard
          tone="neutral"
          question={t('save.question')}
          yesLabel={t('common.yes')}
          noLabel={t('common.no')}
          voiceLine="saveQuestion"
          onYes={() => {
            if (!isBusy) void attempt(onSave, () => setStep('name'));
          }}
          onNo={() => setStep('nothing')}
          testID="save"
        />
      )}
      {step === 'name' && <NameStep onName={(name) => void attempt(() => onName(name), () => setStep('age'))} />}
      {step === 'age' && <AgeStep onAge={(group) => void attempt(() => onAge(group), onDone)} />}
      {hasFailed && (
        <AppText variant="body" color="high" isBold testID="save-failed">
          {t('save.failed')}
        </AppText>
      )}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  block: { gap: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  flex: { flex: 1 },
  input: { minHeight: PRIMARY_BUTTON_HEIGHT + SPACE.sm, borderWidth: 1.5, borderRadius: 18, paddingHorizontal: SPACE.lg, fontSize: TYPE_SIZE.title },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md },
  chip: {
    flexBasis: '45%',
    flexGrow: 1,
    minHeight: PRIMARY_BUTTON_HEIGHT + SPACE.lg,
    borderRadius: RADIUS.tile,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
