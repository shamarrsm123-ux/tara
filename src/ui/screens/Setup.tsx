// Optional setup after "Yes, keep TARA" (03 Flow O6, rebuilt 2026-11-17): one question per screen, "Step n of 5"
// dots, every step skippable — name → age range → PMDD-aware cooling (turn on? → when did your last period
// start? → usual cycle length) → reminders → family. Each answer is saved before moving on; a failed save shows
// "Couldn't save" and stays. Plain background.
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { CYCLE_LENGTH_DEFAULT_DAYS, CYCLE_LENGTH_MAX_DAYS, CYCLE_LENGTH_MIN_DAYS } from '../../engine/constants';
import { DISPLAY_NAME_MAX, type AgeGroup } from '../../shared/storePort';
import type { VoiceLineId } from '../../shared/types';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ScreenFrame } from '../components/ScreenFrame';
import { formatNumber } from '../i18n/format';
import { useUi } from '../theme/UiProvider';
import { PRIMARY_BUTTON_HEIGHT, RADIUS, SPACE, TYPE_SIZE } from '../theme/tokens';
import { FamilySection, type FamilyTools } from './FamilySection';
import { ProgressDots } from './Onboarding';

export const SETUP_TOTAL = 5;

/** Runs one save; on failure shows "Couldn't save" and stays on the step. */
function useAttempt() {
  const [isBusy, setIsBusy] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const attempt = async (work: () => Promise<void>) => {
    if (isBusy) return;
    setIsBusy(true);
    setHasFailed(false);
    try {
      await work();
    } catch {
      setHasFailed(true);
    } finally {
      setIsBusy(false);
    }
  };
  return { isBusy, hasFailed, attempt };
}

interface SetupFrameProps {
  step: number;
  question: string;
  voiceLine?: VoiceLineId;
  onBack?: () => void;
  footer?: ReactNode;
  hasFailed?: boolean;
  testID: string;
  children?: ReactNode;
  demo?: Demo;
}

function SetupFrame({ step, question, voiceLine, onBack, footer, hasFailed = false, testID, children, demo = null }: SetupFrameProps) {
  const { t, lang } = useUi();
  return (
    <ScreenFrame testID={testID} voiceLine={voiceLine} onBack={onBack} footer={footer} demo={demo}>
      <ProgressDots
        index={step}
        total={SETUP_TOTAL}
        label={t('setup.step', { n: formatNumber(step + 1, lang), total: formatNumber(SETUP_TOTAL, lang) })}
        testID="setup-dots"
      />
      <AppText variant="headline" isBold>
        {question}
      </AppText>
      {children}
      {hasFailed && (
        <AppText variant="body" color="high" isBold testID="setup-failed">
          {t('save.failed')}
        </AppText>
      )}
    </ScreenFrame>
  );
}

/** The DEMO ribbon stays on while the demo tarha is connected (03 Flow 18). */
type Demo = { isSpedUp: boolean } | null;

interface StepProps {
  onNext: () => void;
  onBack?: () => void;
  demo?: Demo;
}

export function NameStep({ onSave, onNext, demo }: StepProps & { onSave: (name: string | null) => Promise<void> }) {
  const { t, palette, fonts, isRtl } = useUi();
  const [name, setName] = useState('');
  const { isBusy, hasFailed, attempt } = useAttempt();
  const save = (value: string | null) =>
    void attempt(async () => {
      await onSave(value);
      onNext();
    });
  return (
    <SetupFrame
      demo={demo}
      step={0}
      question={t('save.nameQuestion')}
      voiceLine="nameQuestion"
      hasFailed={hasFailed}
      testID="screen-setup-name"
      footer={
        <>
          <Button label={t('setup.next')} hasArrow onPress={() => save(name)} isDisabled={isBusy || name.trim().length === 0} testID="setup-name-save" />
          <Button label={t('setup.skip')} variant="outlined" tone="neutral" onPress={() => save(null)} testID="setup-name-skip" />
        </>
      }
    >
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
          {
            borderColor: palette.sand,
            color: palette.text,
            fontFamily: fonts.regular,
            textAlign: isRtl ? 'right' : 'left',
            writingDirection: isRtl ? 'rtl' : 'ltr',
          },
        ]}
        testID="setup-name-input"
      />
    </SetupFrame>
  );
}

const AGE_CHIPS: readonly { group: AgeGroup; key: 'save.age18_25' | 'save.age26_35' | 'save.age36_50' }[] = [
  { group: '18_25', key: 'save.age18_25' },
  { group: '26_35', key: 'save.age26_35' },
  { group: '36_50', key: 'save.age36_50' },
];

/** A big tappable choice (age ranges, period start). */
function Chip({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) {
  const { palette } = useUi();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.chip, { backgroundColor: palette.tintPeach, borderColor: palette.sand, opacity: pressed ? 0.7 : 1 }]}
      testID={testID}
    >
      <AppText variant="button" style={styles.center}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function AgeStep({ onSave, onNext, onBack, demo }: StepProps & { onSave: (group: AgeGroup | null) => Promise<void> }) {
  const { t } = useUi();
  const { hasFailed, attempt } = useAttempt();
  const save = (group: AgeGroup | null) =>
    void attempt(async () => {
      await onSave(group);
      onNext();
    });
  return (
    <SetupFrame
      demo={demo}
      step={1}
      question={t('save.ageQuestion')}
      voiceLine="ageQuestion"
      onBack={onBack}
      hasFailed={hasFailed}
      testID="screen-setup-age"
      footer={<Button label={t('setup.skip')} variant="outlined" tone="neutral" onPress={() => save(null)} testID="setup-age-skip" />}
    >
      <View style={styles.grid}>
        {AGE_CHIPS.map(({ group, key }) => (
          <Chip key={group} label={t(key)} onPress={() => save(group)} testID={`setup-age-${group}`} />
        ))}
      </View>
    </SetupFrame>
  );
}

export interface CycleAnswer {
  /** Days since her last period started; null = longer ago / doesn't know (Home will ask her to log it). */
  daysAgo: number | null;
  lengthDays: number;
}

const START_DAYS = [0, 1, 2, 3, 4, 5, 6, 7] as const;
type CycleStage = 'ask' | 'when' | 'length';

export function CycleStep({ onSave, onNext, onBack, demo }: StepProps & { onSave: (answer: CycleAnswer) => Promise<void> }) {
  const { t, lang } = useUi();
  const [stage, setStage] = useState<CycleStage>('ask');
  const [daysAgo, setDaysAgo] = useState<number | null>(null);
  const [length, setLength] = useState(CYCLE_LENGTH_DEFAULT_DAYS);
  const { isBusy, hasFailed, attempt } = useAttempt();
  const finish = (lengthDays: number) =>
    void attempt(async () => {
      await onSave({ daysAgo, lengthDays });
      onNext();
    });
  const back = stage === 'ask' ? onBack : () => setStage(stage === 'length' ? 'when' : 'ask');
  const dayLabel = (n: number) => (n === 0 ? t('setup.today') : n === 1 ? t('cycle.yesterday') : t('cycle.daysAgo', { n: formatNumber(n, lang) }));

  if (stage === 'ask') {
    return (
      <SetupFrame
        demo={demo}
        step={2}
        question={t('setup.cycleQuestion')}
        voiceLine="cycleQuestion"
        onBack={back}
        testID="screen-setup-cycle"
        footer={
          <>
            <Button label={t('setup.cycleYes')} onPress={() => setStage('when')} testID="setup-cycle-yes" />
            <Button label={t('setup.cycleNo')} variant="outlined" tone="neutral" onPress={onNext} testID="setup-cycle-no" />
          </>
        }
      >
        <AppText variant="body" color="textMuted">
          {t('cycle.explain')}
        </AppText>
      </SetupFrame>
    );
  }
  if (stage === 'when') {
    const choose = (n: number | null) => {
      setDaysAgo(n);
      setStage('length');
    };
    return (
      <SetupFrame demo={demo} step={2} question={t('setup.whenQuestion')} onBack={back} testID="screen-setup-cycle-when">
        <View style={styles.grid}>
          {START_DAYS.map((n) => (
            <Chip key={n} label={dayLabel(n)} onPress={() => choose(n)} testID={`setup-cycle-day-${n}`} />
          ))}
        </View>
        <Button label={t('setup.dontKnow')} variant="outlined" tone="neutral" onPress={() => choose(null)} testID="setup-cycle-day-unknown" />
      </SetupFrame>
    );
  }
  return (
    <SetupFrame
      demo={demo}
      step={2}
      question={t('setup.lengthQuestion')}
      onBack={back}
      hasFailed={hasFailed}
      testID="screen-setup-cycle-length"
      footer={
        <>
          <Button label={t('setup.next')} hasArrow onPress={() => finish(length)} isDisabled={isBusy} testID="setup-cycle-length-next" />
          <Button
            label={t('setup.lengthDontKnow')}
            variant="outlined"
            tone="neutral"
            onPress={() => finish(CYCLE_LENGTH_DEFAULT_DAYS)}
            testID="setup-cycle-length-unknown"
          />
        </>
      }
    >
      <View style={styles.stepper}>
        <View style={styles.flex}>
          <Button
            label={t('cycle.shorter')}
            variant="outlined"
            tone="neutral"
            isDisabled={length <= CYCLE_LENGTH_MIN_DAYS}
            onPress={() => setLength(length - 1)}
            testID="setup-cycle-shorter"
          />
        </View>
        <AppText variant="headline" isBold testID="setup-cycle-length">
          {t('cycle.lengthValue', { n: formatNumber(length, lang) })}
        </AppText>
        <View style={styles.flex}>
          <Button
            label={t('cycle.longer')}
            variant="outlined"
            tone="neutral"
            isDisabled={length >= CYCLE_LENGTH_MAX_DAYS}
            onPress={() => setLength(length + 1)}
            testID="setup-cycle-longer"
          />
        </View>
      </View>
    </SetupFrame>
  );
}

export function RemindersStep({ onSave, onNext, onBack, demo }: StepProps & { onSave: (yes: boolean) => Promise<void> }) {
  const { t } = useUi();
  const { isBusy, hasFailed, attempt } = useAttempt();
  const answer = (yes: boolean) =>
    void attempt(async () => {
      await onSave(yes);
      onNext();
    });
  return (
    <SetupFrame
      demo={demo}
      step={3}
      question={t('setup.remindersQuestion')}
      voiceLine="patternExample"
      onBack={onBack}
      hasFailed={hasFailed}
      testID="screen-setup-reminders"
      footer={
        <>
          <Button label={t('common.yes')} onPress={() => answer(true)} isDisabled={isBusy} testID="setup-reminders-yes" />
          <Button label={t('common.no')} variant="outlined" tone="neutral" onPress={() => answer(false)} isDisabled={isBusy} testID="setup-reminders-no" />
        </>
      }
    />
  );
}

export function FamilyStep({ family, onNext, onBack, demo }: StepProps & { family: FamilyTools }) {
  const { t } = useUi();
  const hasContacts = family.contacts.length > 0;
  return (
    <SetupFrame
      demo={demo}
      step={4}
      question={t('setup.familyQuestion')}
      voiceLine="familyQuestion"
      onBack={onBack}
      testID="screen-setup-family"
      footer={
        <Button
          label={t(hasContacts ? 'setup.finish' : 'setup.skip')}
          hasArrow={hasContacts}
          variant={hasContacts ? 'filled' : 'outlined'}
          tone={hasContacts ? undefined : 'neutral'}
          onPress={onNext}
          testID="setup-finish"
        />
      }
    >
      <AppText variant="body" color="textMuted">
        {t('setup.familyBody')}
      </AppText>
      <FamilySection {...family} />
    </SetupFrame>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: PRIMARY_BUTTON_HEIGHT + SPACE.sm, borderWidth: 1.5, borderRadius: 18, paddingHorizontal: SPACE.lg, fontSize: TYPE_SIZE.title },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md },
  chip: {
    flexBasis: '45%',
    flexGrow: 1,
    minHeight: PRIMARY_BUTTON_HEIGHT + SPACE.md,
    borderRadius: RADIUS.tile,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACE.sm,
  },
  center: { textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  flex: { flex: 1 },
});
