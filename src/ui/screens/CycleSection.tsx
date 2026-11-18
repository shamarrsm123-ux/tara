// Settings → PMDD-aware cooling (03 Flow 19): what it does and what is kept, on/off, her usual cycle length
// (21–45 days; once real day-1 dates exist the learned length is shown), "Not right? I am in my…" to correct the
// phase, and "Forget my cycle dates". Turning it off leaves the dates; Delete Everything removes them with the rest.
import { StyleSheet, View } from 'react-native';
import { CYCLE_LENGTH_MAX_DAYS, CYCLE_LENGTH_MIN_DAYS } from '../../engine/constants';
import { CYCLE_PHASES, type CyclePhase, type CycleStatus } from '../../engine/cycle';
import type { Settings } from '../../shared/types';
import { formatNumber } from '../i18n/format';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Segmented } from '../components/Segmented';
import { Card } from '../components/Surface';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';

export interface CycleSettingsTools {
  status: CycleStatus | null;
  onCorrect: (phase: CyclePhase) => void;
  onForget: () => void;
}

interface CycleSectionProps extends CycleSettingsTools {
  settings: Settings;
  onSettings: (patch: Partial<Settings>) => void;
}

const clampLength = (n: number) => Math.min(CYCLE_LENGTH_MAX_DAYS, Math.max(CYCLE_LENGTH_MIN_DAYS, n));

export function CycleSection({ settings, onSettings, status, onCorrect, onForget }: CycleSectionProps) {
  const { t, lang } = useUi();
  const length = settings.cycleLengthDays;
  const isLearned = status !== null && status.lengthDays !== length;
  return (
    <Card testID="settings-cycle">
      <Segmented
        label={t('cycle.title')}
        value={settings.cycleAware}
        options={[
          { value: true, label: t('settings.on') },
          { value: false, label: t('settings.off') },
        ]}
        onChange={(v) => onSettings({ cycleAware: v })}
        testID="set-cycle"
      />
      <AppText variant="body" color="textMuted">
        {t('cycle.explain')}
      </AppText>
      {settings.cycleAware && (
        <>
          <AppText variant="body" isBold>
            {t('cycle.length')}
          </AppText>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button label={t('cycle.shorter')} variant="outlined" tone="neutral" isDisabled={length <= CYCLE_LENGTH_MIN_DAYS} onPress={() => onSettings({ cycleLengthDays: clampLength(length - 1) })} testID="cycle-shorter" />
            </View>
            <AppText variant="question" isBold testID="cycle-length">
              {t('cycle.lengthValue', { n: formatNumber(length, lang) })}
            </AppText>
            <View style={styles.flex}>
              <Button label={t('cycle.longer')} variant="outlined" tone="neutral" isDisabled={length >= CYCLE_LENGTH_MAX_DAYS} onPress={() => onSettings({ cycleLengthDays: clampLength(length + 1) })} testID="cycle-longer" />
            </View>
          </View>
          {isLearned && (
            <AppText variant="caption" color="textMuted" testID="cycle-learned">
              {t('cycle.learned', { n: formatNumber(status.lengthDays, lang) })}
            </AppText>
          )}
          <AppText variant="body" isBold>
            {t('cycle.correct')}
          </AppText>
          {CYCLE_PHASES.map((phase) => (
            <Button
              key={phase}
              label={t(`cycle.phase.${phase}`)}
              variant={status?.phase === phase ? 'filled' : 'outlined'}
              tone={status?.phase === phase ? undefined : 'neutral'}
              onPress={() => onCorrect(phase)}
              testID={`cycle-correct-${phase}`}
            />
          ))}
          <Button label={t('cycle.forget')} variant="outlined" tone="neutral" onPress={onForget} testID="cycle-forget" />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  flex: { flex: 1 },
});
