// My Days tab (03 Flow 14, 04 §10), Try-mode version: a 7-day date strip with today selected (04a v2, the
// reference's day picker), today's Calm graph from the in-memory session, and the retention footer. In Try mode
// nothing is stored (11 §1), so earlier days are shown empty and a note says so. 🟡 Full history (7 day bars,
// tap a day) comes with storage in Phase 8.
import { StyleSheet, View } from 'react-native';
import { GRAPH_WINDOW_MS, type MonitorSnapshot } from '../../engine/session';
import { DEFAULT_SETTINGS } from '../../shared/types';
import { formatDayParts, formatNumber } from '../i18n/format';
import { AppText } from '../components/AppText';
import { LiveGraph } from '../components/LiveGraph';
import { ScreenFrame } from '../components/ScreenFrame';
import { Card } from '../components/Surface';
import { useUi } from '../theme/UiProvider';
import { RADIUS, SPACE } from '../theme/tokens';

interface MyDaysScreenProps {
  snapshot: MonitorSnapshot;
  demo: { isSpedUp: boolean } | null;
}

const DAY_MS = 86_400_000;
const STRIP_DAYS = 7;

function DateStrip({ nowMs }: { nowMs: number }) {
  const { palette, lang } = useUi();
  const days = Array.from({ length: STRIP_DAYS }, (_, i) => nowMs - (STRIP_DAYS - 1 - i) * DAY_MS);
  return (
    <View style={styles.strip} testID="days-strip">
      {days.map((ms, i) => {
        const isToday = i === STRIP_DAYS - 1;
        const { day, weekday } = formatDayParts(ms, lang);
        return (
          <View key={ms} style={[styles.day, { backgroundColor: isToday ? palette.accent : palette.tintPeach }]} accessibilityState={{ selected: isToday }}>
            <AppText variant="caption" isBold color={isToday ? 'onAccent' : 'text'}>
              {day}
            </AppText>
            <AppText variant="caption" color={isToday ? 'onAccent' : 'textMuted'} numberOfLines={1}>
              {weekday}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

export function MyDaysScreen({ snapshot, demo }: MyDaysScreenProps) {
  const { t, lang } = useUi();
  return (
    <ScreenFrame testID="screen-my-days" title={t('tabs.myDays')} demo={demo}>
      <DateStrip nowMs={snapshot.nowMs} />
      <Card>
        <LiveGraph title={t('myDays.today')} points={snapshot.points} coolingBands={snapshot.coolingBands} nowMs={snapshot.nowMs} windowMs={GRAPH_WINDOW_MS} />
      </Card>
      <Card tint="peach">
        <AppText variant="body" testID="my-days-try-note">
          {t('myDays.tryNote')}
        </AppText>
      </Card>
      <AppText variant="caption" color="textMuted" style={styles.footer}>
        {t('myDays.keepsOnly', { days: formatNumber(DEFAULT_SETTINGS.retentionDays, lang) })}
      </AppText>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, alignItems: 'center', paddingVertical: SPACE.sm, borderRadius: RADIUS.tag + 4 },
  footer: { textAlign: 'center' },
});
