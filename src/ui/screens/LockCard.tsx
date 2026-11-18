// "Lock TARA so only you can open it?" (03 Flow 6 step 5, Flow 17). Yes turns the lock on only if the phone has a
// screen lock; otherwise TARA explains and offers the phone's settings. When on: a line saying so + Turn off.
import { useState } from 'react';
import type { LockAvailability } from '../../lock/appLock';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DecisionCard } from '../components/DecisionCard';
import { Card } from '../components/Surface';
import { useUi } from '../theme/UiProvider';

export interface LockTools {
  isOn: boolean;
  /** Turns the lock on if the phone can; returns why not otherwise. */
  onTurnOn: () => Promise<LockAvailability>;
  onTurnOff: () => void;
  onOpenSettings: () => void;
}

export function LockCard({ isOn, onTurnOn, onTurnOff, onOpenSettings }: LockTools) {
  const { t } = useUi();
  const [problem, setProblem] = useState<Exclude<LockAvailability, 'ready'> | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  if (isOn) {
    return (
      <Card testID="lock-on">
        <AppText variant="body">{t('lock.on')}</AppText>
        <Button label={t('lock.turnOff')} variant="outlined" tone="neutral" onPress={onTurnOff} testID="lock-off" />
      </Card>
    );
  }
  if (problem !== null) {
    return (
      <Card testID="lock-problem">
        <AppText variant="body">{t(problem === 'noScreenLock' ? 'lock.noScreenLock' : 'lock.unsupported')}</AppText>
        {problem === 'noScreenLock' && <Button label={t('lock.openSettings')} onPress={onOpenSettings} testID="lock-settings" />}
        <Button label={t('common.ok')} variant="outlined" tone="neutral" onPress={() => setProblem(null)} />
      </Card>
    );
  }
  if (isDismissed) return null;
  return (
    <DecisionCard
      tone="neutral"
      question={t('lock.question')}
      yesLabel={t('common.yes')}
      noLabel={t('common.no')}
      onYes={() =>
        void onTurnOn().then((a) => {
          if (a !== 'ready') setProblem(a);
        })
      }
      onNo={() => setIsDismissed(true)}
      testID="lock"
    />
  );
}
