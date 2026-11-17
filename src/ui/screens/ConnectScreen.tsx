// Flow 1 — Wear & Connect (03, 04 §10, 10 §4): instruction; Connect → TARA's Bluetooth explanation first (plus the
// "location" sentence on Android 8–11) → phone permission → 10 s scan. One tarha connects; several are listed with
// Blink so she can pick hers; none (or permission refused) → "Try again" / "Use demo instead". Once connected, the
// live graph and fit chip appear, a voice nudge plays if the fit stays poor, and Next unlocks after 5 s of Good fit.
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GOOD_FIT_SHOW_MS, GRAPH_WINDOW_MS, type MonitorSnapshot } from '../../engine/session';
import type { FoundTarha } from '../../shared/tarhaSource';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { FitChip } from '../components/FitChip';
import { LiveGraph } from '../components/LiveGraph';
import { ScreenFrame } from '../components/ScreenFrame';
import { Card } from '../components/Surface';
import { SunnyFieldScene } from '../art/Scenes';
import { useUi } from '../theme/UiProvider';
import { FIT_NUDGE_MS, SPACE } from '../theme/tokens';
import { playVoice } from '../voice/player';

export type ConnectPhase = 'idle' | 'explain' | 'searching' | 'choose' | 'notFound' | 'denied' | 'connected';

interface ConnectScreenProps {
  phase: ConnectPhase;
  snapshot: MonitorSnapshot | null;
  isDemo: boolean;
  /** Tarhas found by the scan (shown when there are several). */
  found?: readonly FoundTarha[];
  /** Android 8–11: the phone's own dialog will say "location" (10 §4). */
  needsLocationText?: boolean;
  onConnect: () => void;
  onAllow?: () => void;
  onBlink?: (id: string) => void;
  onChoose?: (id: string) => void;
  onUseDemo: () => void;
  onNext: () => void;
  onBack: () => void;
}


function useFitNudge(isPoorFit: boolean) {
  const { lang } = useUi();
  useEffect(() => {
    if (!isPoorFit) return undefined;
    const id = setTimeout(() => playVoice(lang, 'fitMove'), FIT_NUDGE_MS);
    return () => clearTimeout(id);
  }, [isPoorFit, lang]);
}

export function ConnectScreen({ phase, snapshot, isDemo, found = [], needsLocationText = false, onConnect, onAllow, onBlink, onChoose, onUseDemo, onNext, onBack }: ConnectScreenProps) {
  const { t } = useUi();
  const live = phase === 'connected' ? snapshot : null;
  const isPoorFit = live !== null && live.fit !== null && live.fit !== 'good';
  const canContinue = live !== null && live.goodFitMs >= GOOD_FIT_SHOW_MS;
  useFitNudge(isPoorFit);

  const footer =
    phase === 'explain' ? (
      <Button label={t('connect.allow')} hasArrow onPress={() => onAllow?.()} testID="connect-allow" />
    ) : phase === 'choose' ? undefined : phase === 'notFound' || phase === 'denied' ? (
      <>
        <Button label={t('connect.useDemo')} hasArrow onPress={onUseDemo} testID="connect-demo" />
        <Button label={t('connect.tryAgain')} onPress={onConnect} variant="outlined" tone="neutral" testID="connect-retry" />
      </>
    ) : phase === 'connected' ? (
      <Button label={t('connect.next')} hasArrow onPress={onNext} isDisabled={!canContinue} testID="connect-next" />
    ) : (
      <Button label={t('connect.button')} hasArrow onPress={onConnect} isDisabled={phase === 'searching'} testID="connect-button" />
    );

  return (
    <ScreenFrame testID="screen-connect" title={t('connect.title')} voiceLine="connectWear" onBack={onBack} demo={isDemo ? { isSpedUp: false } : null} footer={footer}>
      {live !== null ? (
        <View style={styles.live}>
          {live.fit !== null && <FitChip fit={live.fit} testID="connect-fit" />}
          <LiveGraph points={live.points} coolingBands={live.coolingBands} nowMs={live.nowMs} windowMs={GRAPH_WINDOW_MS} />
          {isPoorFit && <AppText variant="body">{t('connect.fitMove')}</AppText>}
        </View>
      ) : (
        <SunnyFieldScene height={250} tarha="coral" />
      )}
      <AppText variant="body">{t('connect.instruction')}</AppText>
      {phase === 'searching' && (
        <AppText variant="body" color="textMuted">
          {t('connect.searching')}
        </AppText>
      )}
      {phase === 'explain' && (
        <Card tint="peach" testID="connect-explain">
          <AppText variant="body">{t('connect.btExplain')}</AppText>
          {needsLocationText && (
            <AppText variant="body" testID="connect-location-explain">
              {t('connect.locationExplain')}
            </AppText>
          )}
        </Card>
      )}
      {phase === 'choose' && (
        <View style={styles.live} testID="connect-choose">
          <AppText variant="question">{t('connect.choose')}</AppText>
          {found.map((tarha) => (
            <Card key={tarha.id}>
              <AppText variant="body" isBold>
                {tarha.name}
              </AppText>
              <Button label={t('connect.blink')} variant="outlined" tone="neutral" onPress={() => onBlink?.(tarha.id)} testID={`connect-blink-${tarha.id}`} />
              <Button label={t('connect.thisOne')} onPress={() => onChoose?.(tarha.id)} testID={`connect-choose-${tarha.id}`} />
            </Card>
          ))}
        </View>
      )}
      {phase === 'denied' && (
        <AppText variant="question" testID="connect-denied">
          {t('connect.denied')}
        </AppText>
      )}
      {phase === 'notFound' && (
        <AppText variant="question" testID="connect-not-found">
          {t('connect.notFound')}
        </AppText>
      )}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  live: { gap: SPACE.md },
});
