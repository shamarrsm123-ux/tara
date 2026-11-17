// The app shell after Learn Your Calm: the active tab (Home · My Days · Safety), the bottom tab bar with the
// centre Cool button (04a v2 D6), and the Screen 3 prompts drawn over whichever tab is open, so a High-stress
// question is never missed (03 Flow 3). 🟡 03 §0 lists the tabs for Daily mode; per the team decision of
// 2026-11-16 they are also shown in Try mode, with Try-mode content.
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MonitorSnapshot } from '../../engine/session';
import { AlertLessCard, PromptCard } from '../components/ActionCards';
import { DemoRibbon } from '../components/DemoRibbon';
import { TabBar, type MainTab } from '../components/TabBar';
import { SPACE } from '../theme/tokens';
import { HomeScreen, isCoolingActive } from './HomeScreen';
import { MyDaysScreen } from './MyDaysScreen';
import { SafetyScreen } from './SafetyScreen';

export interface MainActions {
  onCool: (on: boolean) => void;
  onExtend: () => void;
  onPromptAnswer: (yes: boolean) => void;
  onPromptDismiss: () => void;
  onAlertLess: (yes: boolean) => void;
  onBack: () => void;
}

interface MainShellProps extends MainActions {
  snapshot: MonitorSnapshot;
  demo: { isSpedUp: boolean } | null;
}

const OVERLAY_SCRIM = 'rgba(28, 28, 30, 0.5)';

/** Full-screen card over the app. The demo ribbon is drawn again on top so the scrim never dims it (08 §12). */
function Overlay({ children, demo }: { children: ReactNode; demo: { isSpedUp: boolean } | null }) {
  return (
    <View style={styles.overlay} testID="home-overlay">
      {demo !== null && <DemoRibbon isSpedUp={demo.isSpedUp} />}
      <View style={styles.overlayBody}>{children}</View>
    </View>
  );
}

export function MainShell({ snapshot, demo, onCool, onExtend, onPromptAnswer, onPromptDismiss, onAlertLess, onBack }: MainShellProps) {
  const [tab, setTab] = useState<MainTab>('home');
  const e = snapshot.engine;
  const startCooling = () => {
    setTab('home');
    onCool(true);
  };
  const answerPrompt = (yes: boolean) => {
    if (yes) setTab('home');
    onPromptAnswer(yes);
  };

  return (
    <View style={styles.fill}>
      <View style={styles.fill}>
        {tab === 'home' && <HomeScreen snapshot={snapshot} demo={demo} onCool={onCool} onExtend={onExtend} onBack={onBack} />}
        {tab === 'myDays' && <MyDaysScreen snapshot={snapshot} demo={demo} />}
        {tab === 'safety' && <SafetyScreen demo={demo} />}
      </View>
      <TabBar active={tab} onSelect={setTab} isCooling={isCoolingActive(snapshot)} isCoolBlocked={e.coolBlockReason !== null} onCool={startCooling} />
      {e.isPromptShowing ? (
        <Overlay demo={demo}>
          <PromptCard blockReason={e.coolBlockReason} onAnswer={answerPrompt} onDismiss={onPromptDismiss} />
        </Overlay>
      ) : (
        e.isAskingAlertLess && (
          <Overlay demo={demo}>
            <AlertLessCard onAnswer={onAlertLess} />
          </Overlay>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: OVERLAY_SCRIM,
    overflow: 'hidden',
  },
  overlayBody: { flex: 1, justifyContent: 'center', padding: SPACE.md },
});
