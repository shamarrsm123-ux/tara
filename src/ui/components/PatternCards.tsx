// Home cards for smart reminders (03 Flows 4 & 8): the offer ("You often feel stressed around 2 PM…" Yes/No), the
// reminder card at reminder time (Okay / Not today), the "stopped the reminder" notice when a pattern fades, and
// "I need more days" when there is too little history. Times are shown in her language's clock format.
import { formatClock } from '../i18n/format';
import { useUi } from '../theme/UiProvider';
import { AppText } from './AppText';
import { Button } from './Button';
import { DecisionCard } from './DecisionCard';
import { Card } from './Surface';

export interface PatternCardsProps {
  offerSlot: number | null;
  dueSlot: number | null;
  fadedSlot: number | null;
  needMoreDays: boolean;
  /** Minute of day → timestamp today, for formatting. */
  timeOf: (minuteOfDay: number) => number;
  reminderOf: (minuteOfDay: number) => number;
  onAccept: (slot: number) => void;
  onDecline: (slot: number) => void;
  onDismissDue: () => void;
  onDismissFaded: () => void;
}

export function PatternCards(p: PatternCardsProps) {
  const { t, lang } = useUi();
  const clock = (minute: number) => formatClock(p.timeOf(minute), lang);
  return (
    <>
      {p.dueSlot !== null && (
        <DecisionCard
          tone="neutral"
          question={t('pattern.reminderNow', { time: clock(p.dueSlot) })}
          yesLabel={t('pattern.okay')}
          noLabel={t('pattern.notToday')}
          voiceLine="reminderNow"
          onYes={p.onDismissDue}
          onNo={p.onDismissDue}
          testID="pattern-due"
        />
      )}
      {p.offerSlot !== null && (
        <DecisionCard
          tone="neutral"
          question={t('pattern.offer', { time: clock(p.offerSlot), reminder: clock(p.reminderOf(p.offerSlot)) })}
          yesLabel={t('common.yes')}
          noLabel={t('common.no')}
          voiceLine="patternOffer"
          onYes={() => p.offerSlot !== null && p.onAccept(p.offerSlot)}
          onNo={() => p.offerSlot !== null && p.onDecline(p.offerSlot)}
          testID="pattern-offer"
        />
      )}
      {p.fadedSlot !== null && (
        <Card tint="lemon" testID="pattern-faded">
          <AppText variant="body">{t('pattern.faded', { time: clock(p.fadedSlot) })}</AppText>
          <Button label={t('common.ok')} variant="outlined" tone="neutral" onPress={p.onDismissFaded} testID="pattern-faded-ok" />
        </Card>
      )}
      {p.needMoreDays && (
        <Card tint="apricot" testID="pattern-need-more">
          <AppText variant="body">{t('pattern.needMore')}</AppText>
        </Card>
      )}
    </>
  );
}
