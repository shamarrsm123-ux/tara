// Home cards for PMDD-aware cooling (03 Flows 19–20): today's menstrual phase with what TARA does differently,
// the heads-up the day before the late luteal phase, "My period started" (today or a few days ago), and the
// evening check-in (three questions, three answers each). Phase logic lives in engine/cycle; this only draws it.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { CycleStatus } from '../../engine/cycle';
import { CHECKIN_ITEMS, type CheckInItem, type CheckInLevel } from '../../shared/storePort';
import { formatNumber } from '../i18n/format';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Segmented } from './Segmented';
import { Card, Tag } from './Surface';
import { VoiceButton } from './VoiceButton';

/** "It started earlier": yesterday up to this many days ago. */
const EARLIER_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const LEVELS: readonly CheckInLevel[] = [0, 1, 2];
const UNANSWERED = -1;

interface CycleHomeCardProps {
  status: CycleStatus;
  onLogDay1: (daysAgo: number) => void;
}

export function CycleHomeCard({ status, onLogDay1 }: CycleHomeCardProps) {
  const { t, lang, palette } = useUi();
  const [isPickingDay, setIsPickingDay] = useState(false);
  const log = (daysAgo: number) => {
    setIsPickingDay(false);
    onLogDay1(daysAgo);
  };
  const tint = status.support === 'more' ? 'apricot' : 'peach';
  return (
    <Card tint={tint} testID="cycle-card">
      {status.phase === null || status.cycleDay === null ? (
        <AppText variant="body" testID="cycle-log-first">
          {t('cycle.logFirst')}
        </AppText>
      ) : (
        <>
          <View style={styles.header}>
            <Tag label={t(`cycle.phase.${status.phase}`)} color={status.support === 'more' ? palette.high : palette.accent} testID="cycle-phase" />
            <AppText variant="caption" color="textMuted">
              {t('cycle.dayOf', { day: formatNumber(status.cycleDay, lang), length: formatNumber(status.lengthDays, lang) })}
            </AppText>
          </View>
          <AppText variant="body" isBold={status.support === 'more'} testID="cycle-support">
            {t(`cycle.support.${status.support}`)}
          </AppText>
        </>
      )}
      {status.daysUntilLateLuteal !== null && (
        <View style={styles.header}>
          <AppText variant="body" style={styles.flex} testID="cycle-heads-up">
            {t('cycle.headsUp')}
          </AppText>
          <VoiceButton line="cycleHeadsUp" />
        </View>
      )}
      {status.isLate && (
        <AppText variant="body" testID="cycle-late">
          {t('cycle.late')}
        </AppText>
      )}
      <Button label={t('cycle.started')} variant="outlined" tone="neutral" onPress={() => log(0)} testID="cycle-started" />
      {isPickingDay ? (
        <View style={styles.chips}>
          {EARLIER_DAYS.map((n) => (
            <Button
              key={n}
              label={n === 1 ? t('cycle.yesterday') : t('cycle.daysAgo', { n: formatNumber(n, lang) })}
              variant="outlined"
              tone="neutral"
              onPress={() => log(n)}
              testID={`cycle-started-${n}`}
            />
          ))}
        </View>
      ) : (
        <Button label={t('cycle.startedEarlier')} variant="outlined" tone="neutral" onPress={() => setIsPickingDay(true)} testID="cycle-started-earlier" />
      )}
    </Card>
  );
}

type Answers = Record<CheckInItem, CheckInLevel | typeof UNANSWERED>;
const NONE: Answers = { mood: UNANSWERED, irritability: UNANSWERED, body: UNANSWERED };

interface CheckInCardProps {
  onSave: (answers: Record<CheckInItem, CheckInLevel>) => void;
  onLater: () => void;
}

const isComplete = (a: Answers): a is Record<CheckInItem, CheckInLevel> => CHECKIN_ITEMS.every((k) => a[k] !== UNANSWERED);

export function CheckInCard({ onSave, onLater }: CheckInCardProps) {
  const { t } = useUi();
  const [answers, setAnswers] = useState<Answers>(NONE);
  return (
    <Card testID="check-in">
      <View style={styles.header}>
        <AppText variant="question" isBold style={styles.flex}>
          {t('checkIn.title')}
        </AppText>
        <VoiceButton line="checkInQuestion" />
      </View>
      {CHECKIN_ITEMS.map((item) => (
        <Segmented<number>
          key={item}
          label={t(`checkIn.${item}`)}
          value={answers[item]}
          options={LEVELS.map((l) => ({ value: l, label: t(`checkIn.level${l}`) }))}
          onChange={(v) => setAnswers((prev) => ({ ...prev, [item]: v as CheckInLevel }))}
          testID={`check-in-${item}`}
        />
      ))}
      <Button label={t('checkIn.save')} isDisabled={!isComplete(answers)} onPress={() => isComplete(answers) && onSave(answers)} testID="check-in-save" />
      <Button label={t('checkIn.later')} variant="outlined" tone="neutral" onPress={onLater} testID="check-in-later" />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, flexWrap: 'wrap' },
  flex: { flex: 1 },
  chips: { gap: SPACE.sm },
});
