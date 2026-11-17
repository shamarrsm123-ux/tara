// Screen 4 — Smart Pattern, Try-story version (03 Flow 4, 04 §10): an "Example" card with a week strip (a red
// dot near 2 PM on most days), the voiced question with Yes/No (kept in memory until Screen 5), then the live
// Calm meter and "Your brain is calm." with Next.
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MonitorSnapshot } from '../../engine/session';
import { formatDayParts } from '../i18n/format';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { CalmMeter } from '../components/CalmMeter';
import { ScreenFrame } from '../components/ScreenFrame';
import { Card, Tag } from '../components/Surface';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';
import { playVoice } from '../voice/player';
import { meterStatusFor } from './HomeScreen';

interface ExampleScreenProps {
  snapshot: MonitorSnapshot;
  demo: { isSpedUp: boolean } | null;
  answer: boolean | null;
  onAnswer: (yes: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

const DAY_MS = 86_400_000;
const DAYS = 7;
/** Days of the example week that had stress around 2 PM ("most days"). */
const STRESSED_DAYS: ReadonlySet<number> = new Set([0, 1, 2, 4, 5]);
const TRACK_H = 120;
const DAY_START_H = 6;
const DAY_END_H = 20;
const PATTERN_H = 14;
const DOT = 14;
const DOT_TOP = ((PATTERN_H - DAY_START_H) / (DAY_END_H - DAY_START_H)) * TRACK_H - DOT / 2;

function WeekStrip({ nowMs }: { nowMs: number }) {
  const { palette, lang } = useUi();
  return (
    <View style={styles.week} testID="example-week">
      {Array.from({ length: DAYS }, (_, i) => {
        const { weekday } = formatDayParts(nowMs - (DAYS - 1 - i) * DAY_MS, lang);
        return (
          <View key={i} style={styles.dayCol}>
            <View style={[styles.track, { backgroundColor: palette.surface }]}>
              {STRESSED_DAYS.has(i) && <View style={[styles.dot, { backgroundColor: palette.high }]} />}
            </View>
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              {weekday}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

export function ExampleScreen({ snapshot, demo, answer, onAnswer, onNext, onBack }: ExampleScreenProps) {
  const { t, palette, lang } = useUi();
  const isAnswered = answer !== null;
  useEffect(() => {
    if (isAnswered) playVoice(lang, 'brainCalm');
  }, [isAnswered, lang]);

  return (
    <ScreenFrame
      testID="screen-example"
      voiceLine="patternExample"
      onBack={onBack}
      demo={demo}
      footer={isAnswered ? <Button label={t('example.next')} hasArrow onPress={onNext} testID="example-next" /> : undefined}
    >
      <Card tint="peach">
        <Tag label={t('example.tag')} color={palette.accent} testID="example-tag" />
        <WeekStrip nowMs={snapshot.nowMs} />
      </Card>
      {!isAnswered ? (
        <View style={styles.block}>
          <AppText variant="question">{t('example.question')}</AppText>
          <Button label={t('common.yes')} onPress={() => onAnswer(true)} testID="example-yes" />
          <Button label={t('common.no')} onPress={() => onAnswer(false)} variant="outlined" tone="neutral" testID="example-no" />
        </View>
      ) : (
        <View style={styles.block}>
          <CalmMeter calm={snapshot.calm} zone={snapshot.zone} status={meterStatusFor(snapshot)} testID="example-meter" />
          {snapshot.zone === 'calm' && (
            <AppText variant="question" isBold color="calm" style={styles.center} testID="example-calm">
              {t('example.calm')}
            </AppText>
          )}
        </View>
      )}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', gap: 6 },
  dayCol: { flex: 1, alignItems: 'center', gap: SPACE.xs },
  track: { width: '100%', height: TRACK_H, borderRadius: 12 },
  dot: { position: 'absolute', top: DOT_TOP, alignSelf: 'center', width: DOT, height: DOT, borderRadius: DOT / 2 },
  block: { gap: SPACE.md },
  center: { textAlign: 'center' },
});
