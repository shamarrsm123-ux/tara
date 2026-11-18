// My Days tab (03 Flow 14, 02 §8.15, 04 §10). Saved: the last 7 days as a date strip, each with a small bar of time
// in green / amber / red; tap a day → that day's Calm graph with blue cooling bands; footer with her retention
// ("TARA keeps only the last N days" — nothing older exists). Try mode: today's in-memory graph and a note that
// nothing is saved yet.
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { addDays, coolingBandsFromMinutes, dayStartOf, pointsFromMinutes, summarizeDays, type DaySummary, type MinuteLike } from '../../engine/history';
import type { CyclePhase } from '../../engine/cycle';
import { GRAPH_WINDOW_MS, type MonitorSnapshot } from '../../engine/session';
import { CHECKIN_ITEMS, type CheckInRow } from '../../shared/storePort';
import { DEFAULT_SETTINGS } from '../../shared/types';
import { formatDayParts, formatNumber } from '../i18n/format';
import { AppText } from '../components/AppText';
import { LiveGraph } from '../components/LiveGraph';
import { ScreenFrame } from '../components/ScreenFrame';
import { Card, Tag } from '../components/Surface';
import { useUi } from '../theme/UiProvider';
import { RADIUS, SPACE } from '../theme/tokens';

export interface SavedHistory {
  minutes: readonly MinuteLike[];
  retentionDays: number;
  /** PMDD-aware cooling on: each day's phase and check-in (03 Flow 14 + 19–20). */
  cycle?: DayCycleInfo | null;
}

export interface DayCycleInfo {
  phaseOn: (dayMs: number) => CyclePhase | null;
  checkIns: readonly CheckInRow[];
}

interface MyDaysScreenProps {
  snapshot: MonitorSnapshot;
  demo: { isSpedUp: boolean } | null;
  /** Stored minute summaries once she has saved; null in Try mode. */
  history?: SavedHistory | null;
}

const STRIP_DAYS = 7;
const DAY_MS = 86_400_000;
const DAY_BUCKET_MS = 10 * 60_000;
const ZONE_BAR_H = 6;

function ZoneBar({ day }: { day: DaySummary }) {
  const { palette } = useUi();
  const total = day.calmMin + day.risingMin + day.highMin;
  if (total === 0) return <View style={[styles.zoneBar, { backgroundColor: palette.track }]} />;
  return (
    <View style={styles.zoneBar}>
      {(['calm', 'rising', 'high'] as const).map((z) => {
        const n = z === 'calm' ? day.calmMin : z === 'rising' ? day.risingMin : day.highMin;
        return n > 0 ? <View key={z} style={{ flex: n, backgroundColor: palette[z] }} /> : null;
      })}
    </View>
  );
}

interface DateStripProps {
  nowMs: number;
  days: readonly (DaySummary | null)[];
  selected: number;
  onSelect?: (index: number) => void;
}

function DateStrip({ nowMs, days, selected, onSelect }: DateStripProps) {
  const { palette, lang } = useUi();
  const today = dayStartOf(nowMs);
  return (
    <View style={styles.strip} testID="days-strip">
      {days.map((day, i) => {
        const isSelected = i === selected;
        const dayStart = addDays(today, i - (STRIP_DAYS - 1));
        const { day: num, weekday } = formatDayParts(dayStart, lang);
        const isAvailable = onSelect !== undefined && day !== null;
        return (
          <Pressable
            key={dayStart}
            disabled={!isAvailable}
            onPress={() => onSelect?.(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: !isAvailable }}
            style={[styles.day, { backgroundColor: isSelected ? palette.accent : palette.tintPeach, opacity: day === null && onSelect !== undefined ? 0.4 : 1 }]}
            testID={`day-${i}`}
          >
            <AppText variant="caption" isBold color={isSelected ? 'onAccent' : 'text'}>
              {num}
            </AppText>
            <AppText variant="caption" color={isSelected ? 'onAccent' : 'textMuted'} numberOfLines={1}>
              {weekday}
            </AppText>
            {day !== null && <ZoneBar day={day} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function SavedDays({ snapshot, history }: { snapshot: MonitorSnapshot; history: SavedHistory }) {
  const { t } = useUi();
  const [selected, setSelected] = useState(STRIP_DAYS - 1);
  const summaries = summarizeDays(history.minutes, snapshot.nowMs, STRIP_DAYS);
  // Days beyond her retention window don't exist (03 Flow 14 step 4).
  const days = summaries.map((d, i) => (i >= STRIP_DAYS - history.retentionDays ? d : null));
  const dayStart = summaries[selected]?.dayStartMs ?? dayStartOf(snapshot.nowMs);
  const isToday = selected === STRIP_DAYS - 1;
  const dayEnd = isToday ? snapshot.nowMs : dayStart + DAY_MS;
  const minutes = history.minutes.filter((m) => m.tsMinute >= dayStart && m.tsMinute < dayEnd);
  return (
    <>
      <DateStrip nowMs={snapshot.nowMs} days={days} selected={selected} onSelect={setSelected} />
      <Card>
        <LiveGraph
          title={isToday ? t('myDays.today') : undefined}
          points={pointsFromMinutes(minutes)}
          coolingBands={coolingBandsFromMinutes(minutes)}
          nowMs={dayEnd}
          windowMs={Math.max(dayEnd - dayStart, DAY_BUCKET_MS)}
          bucketMs={DAY_BUCKET_MS}
          testID="my-days-graph"
        />
      </Card>
      {history.cycle != null && <DayCycleCard dayMs={dayStart} cycle={history.cycle} />}
    </>
  );
}

/** The selected day's menstrual phase and check-in answers. */
function DayCycleCard({ dayMs, cycle }: { dayMs: number; cycle: DayCycleInfo }) {
  const { t, palette } = useUi();
  const phase = cycle.phaseOn(dayMs);
  const checkIn = cycle.checkIns.find((c) => c.dayMs === dayMs);
  return (
    <Card tint="peach" testID="my-days-cycle">
      {phase !== null && <Tag label={t(`cycle.phase.${phase}`)} color={palette.accent} testID="my-days-phase" />}
      {checkIn === undefined ? (
        <AppText variant="body" color="textMuted">
          {t('checkIn.none')}
        </AppText>
      ) : (
        CHECKIN_ITEMS.map((item) => (
          <AppText key={item} variant="body" testID={`my-days-check-in-${item}`}>
            {`${t(`checkIn.${item}`)}: ${t(`checkIn.level${checkIn[item]}`)}`}
          </AppText>
        ))
      )}
    </Card>
  );
}

export function MyDaysScreen({ snapshot, demo, history = null }: MyDaysScreenProps) {
  const { t, lang } = useUi();
  const retention = history?.retentionDays ?? DEFAULT_SETTINGS.retentionDays;
  return (
    <ScreenFrame testID="screen-my-days" title={t('tabs.myDays')} demo={demo}>
      {history !== null ? (
        <SavedDays snapshot={snapshot} history={history} />
      ) : (
        <>
          <DateStrip nowMs={snapshot.nowMs} days={Array.from({ length: STRIP_DAYS }, () => null)} selected={STRIP_DAYS - 1} />
          <Card>
            <LiveGraph title={t('myDays.today')} points={snapshot.points} coolingBands={snapshot.coolingBands} nowMs={snapshot.nowMs} windowMs={GRAPH_WINDOW_MS} />
          </Card>
          <Card tint="peach">
            <AppText variant="body" testID="my-days-try-note">
              {t('myDays.tryNote')}
            </AppText>
          </Card>
        </>
      )}
      <AppText variant="caption" color="textMuted" style={styles.footer} testID="my-days-footer">
        {t('myDays.keepsOnly', { days: formatNumber(retention, lang) })}
      </AppText>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, alignItems: 'center', paddingVertical: SPACE.sm, paddingHorizontal: 4, borderRadius: RADIUS.tag + 4, gap: 4 },
  zoneBar: { flexDirection: 'row', alignSelf: 'stretch', height: ZONE_BAR_H, borderRadius: ZONE_BAR_H / 2, overflow: 'hidden' },
  footer: { textAlign: 'center' },
});
