// First-run screens rebuilt 2026-11-17 (03 Flows O2 and O5): Meet TARA — three illustrated pages with progress
// dots and a voice line each, "Get started" and "See a 30-second demo" — and "Keep TARA on this phone?" with her
// live Calm meter, the three privacy points and Yes / Not now. Plain background (no gradient) on purpose.
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MonitorSnapshot } from '../../engine/session';
import type { VoiceLineId } from '../../shared/types';
import { CoolBreezeScene, PhoneShieldScene, SunnyFieldScene } from '../art/Scenes';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { CalmMeter } from '../components/CalmMeter';
import { ScreenFrame } from '../components/ScreenFrame';
import { Card, IconSquare } from '../components/Surface';
import { IconClock, IconLock, IconNoInternet } from '../icons/Icons';
import { formatNumber } from '../i18n/format';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';
import { meterStatusFor } from './HomeScreen';
import { NoticeScreen } from './NoticeScreen';

const DOT = 8;
const DOT_ACTIVE = 24;
const INACTIVE_OPACITY = 0.3;

/** "● ● ○" — where she is in a short sequence; spoken as "Page 2 of 3". */
export function ProgressDots({ index, total, label, testID }: { index: number; total: number; label: string; testID?: string }) {
  const { palette } = useUi();
  return (
    <View style={styles.dots} accessible accessibilityLabel={label} testID={testID}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              width: i === index ? DOT_ACTIVE : DOT,
              backgroundColor: i <= index ? palette.accent : palette.textMuted,
              opacity: i <= index ? 1 : INACTIVE_OPACITY,
            },
          ]}
        />
      ))}
    </View>
  );
}

interface IntroPage {
  title: 'intro.coolTitle' | 'intro.calmTitle' | 'intro.privateTitle';
  body: 'intro.coolBody' | 'intro.calmBody' | 'intro.privateBody';
  voice: VoiceLineId;
  art: ReactNode;
}

const ART_H = 340;
const PAGES: readonly IntroPage[] = [
  { title: 'intro.coolTitle', body: 'intro.coolBody', voice: 'introCool', art: <SunnyFieldScene height={ART_H} /> },
  { title: 'intro.calmTitle', body: 'intro.calmBody', voice: 'introCalm', art: <CoolBreezeScene height={ART_H} /> },
  { title: 'intro.privateTitle', body: 'intro.privateBody', voice: 'introPrivate', art: <PhoneShieldScene height={ART_H} /> },
];

interface IntroScreenProps {
  onGetStarted: () => void;
  onDemo: () => void;
  onBack: () => void;
}

/** Flow O2 — Meet TARA. Back on the first page returns to the language picker. */
export function IntroScreen({ onGetStarted, onDemo, onBack }: IntroScreenProps) {
  const { t, lang } = useUi();
  const [index, setIndex] = useState(0);
  const page = PAGES[index] ?? PAGES[0]!;
  const isLast = index === PAGES.length - 1;
  return (
    <ScreenFrame
      key={page.voice} // a new page plays its own voice line
      testID="screen-intro"
      voiceLine={page.voice}
      onBack={index === 0 ? onBack : () => setIndex(index - 1)}
      footer={
        <>
          <Button
            label={t(isLast ? 'intro.getStarted' : 'intro.next')}
            hasArrow
            onPress={isLast ? onGetStarted : () => setIndex(index + 1)}
            testID={isLast ? 'intro-start' : 'intro-next'}
          />
          <Button label={t('intro.demo')} variant="outlined" tone="neutral" onPress={onDemo} testID="intro-demo" />
        </>
      }
    >
      <View testID={`intro-page-${index}`}>{page.art}</View>
      <ProgressDots
        index={index}
        total={PAGES.length}
        label={t('intro.page', { n: formatNumber(index + 1, lang), total: formatNumber(PAGES.length, lang) })}
        testID="intro-dots"
      />
      <AppText variant="headline" isBold>
        {t(page.title)}
      </AppText>
      <AppText variant="body" color="textMuted">
        {t(page.body)}
      </AppText>
      {isLast && (
        <AppText variant="caption" color="textMuted">
          {t('welcome.disclaimer')}
        </AppText>
      )}
    </ScreenFrame>
  );
}

const POINTS = [
  { key: 'keep.point1', Icon: IconLock },
  { key: 'keep.point2', Icon: IconClock },
  { key: 'keep.point3', Icon: IconNoInternet },
] as const;

interface KeepScreenProps {
  snapshot: MonitorSnapshot | null;
  demo: { isSpedUp: boolean } | null;
  /** Creates the store. Rejects if saving failed (nothing is left behind in that case). */
  onSave: () => Promise<void>;
  /** "Not now" → "Okay. Nothing was saved." → acknowledged. */
  onNotNow: () => void;
  onBack: () => void;
}

/** Flow O5 — Keep TARA on this phone? Nothing exists on disk until "Yes" (11 §1). */
export function KeepScreen({ snapshot, demo, onSave, onNotNow, onBack }: KeepScreenProps) {
  const { t, palette } = useUi();
  const [isNothingSaved, setIsNothingSaved] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const save = async () => {
    if (isBusy) return;
    setIsBusy(true);
    setHasFailed(false);
    try {
      await onSave();
    } catch {
      setHasFailed(true);
    } finally {
      setIsBusy(false);
    }
  };

  if (isNothingSaved) return <NoticeScreen testID="screen-nothing-saved" message={t('save.nothingSaved')} voiceLine="nothingSaved" onOk={onNotNow} />;

  return (
    <ScreenFrame
      testID="screen-save"
      voiceLine="keepQuestion"
      onBack={onBack}
      demo={demo}
      footer={
        <>
          <Button label={t('keep.yes')} onPress={() => void save()} isDisabled={isBusy} testID="save-yes" />
          <Button label={t('keep.no')} variant="outlined" tone="neutral" onPress={() => setIsNothingSaved(true)} testID="save-no" />
        </>
      }
    >
      <AppText variant="headline" isBold>
        {t('keep.title')}
      </AppText>
      {snapshot !== null && (
        <Card>
          <CalmMeter calm={snapshot.calm} zone={snapshot.zone} status={meterStatusFor(snapshot)} testID="save-meter" />
          <AppText variant="body" color="textMuted" style={styles.center}>
            {t('keep.calmNow')}
          </AppText>
        </Card>
      )}
      <Card style={styles.points}>
        {POINTS.map(({ key, Icon }) => (
          <View key={key} style={styles.row}>
            <IconSquare tint="peach">
              <Icon color={palette.accent} />
            </IconSquare>
            <AppText variant="body" style={styles.flex}>
              {t(key)}
            </AppText>
          </View>
        ))}
      </Card>
      {hasFailed && (
        <AppText variant="body" color="high" isBold testID="save-failed">
          {t('save.failed')}
        </AppText>
      )}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: DOT, borderRadius: DOT / 2 },
  center: { textAlign: 'center' },
  points: { gap: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  flex: { flex: 1 },
});
