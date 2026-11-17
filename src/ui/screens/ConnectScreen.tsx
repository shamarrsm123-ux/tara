// Flow 1 — Wear & Connect (03, 04 §10): fit animation and instruction; Connect; if no tarha is found,
// "Try again" or "Use demo instead". Once connected, the live graph and fit chip replace the animation, a
// voice nudge plays if the fit stays poor, and Next unlocks after 5 s of Good fit.
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GOOD_FIT_SHOW_MS, GRAPH_WINDOW_MS, type MonitorSnapshot } from '../../engine/session';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { FitChip } from '../components/FitChip';
import { LiveGraph } from '../components/LiveGraph';
import { ScreenFrame } from '../components/ScreenFrame';
import { SunnyFieldScene } from '../art/Scenes';
import { useUi } from '../theme/UiProvider';
import { FIT_NUDGE_MS, SPACE } from '../theme/tokens';
import { playVoice } from '../voice/player';

export type ConnectPhase = 'idle' | 'searching' | 'notFound' | 'connected';

interface ConnectScreenProps {
  phase: ConnectPhase;
  snapshot: MonitorSnapshot | null;
  isDemo: boolean;
  onConnect: () => void;
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

export function ConnectScreen({ phase, snapshot, isDemo, onConnect, onUseDemo, onNext, onBack }: ConnectScreenProps) {
  const { t } = useUi();
  const live = phase === 'connected' ? snapshot : null;
  const isPoorFit = live !== null && live.fit !== null && live.fit !== 'good';
  const canContinue = live !== null && live.goodFitMs >= GOOD_FIT_SHOW_MS;
  useFitNudge(isPoorFit);

  const footer =
    phase === 'notFound' ? (
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
