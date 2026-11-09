// Common screen layout (04 §5–6): demo ribbon when the demo source is active (04 §9.6), back button,
// ▶ voice button in the top corner, scrollable content, and the primary action fixed at the bottom so it
// is never more than a thumb away and never needs scrolling to reach.
import { useEffect, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { VoiceLineId } from '../../shared/types';
import { IconBack } from '../icons/Icons';
import { useUi } from '../theme/UiProvider';
import { SPACE, TOUCH_MIN } from '../theme/tokens';
import { playVoice } from '../voice/player';
import { DemoRibbon } from './DemoRibbon';
import { VoiceButton } from './VoiceButton';

interface ScreenFrameProps {
  children: ReactNode;
  footer?: ReactNode;
  voiceLine?: VoiceLineId;
  /** Plays the voice line on first view when "Speak automatically" is on (04 §6). */
  shouldAutoPlay?: boolean;
  onBack?: () => void;
  demo?: { isSpedUp: boolean } | null;
  testID?: string;
}

const TOP_INSET = 32;

export function ScreenFrame({ children, footer, voiceLine, shouldAutoPlay = true, onBack, demo = null, testID }: ScreenFrameProps) {
  const { palette, lang, t, isRtl } = useUi();

  useEffect(() => {
    if (voiceLine !== undefined && shouldAutoPlay) playVoice(lang, voiceLine);
  }, [voiceLine, lang, shouldAutoPlay]);

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]} testID={testID}>
      {demo !== null && <DemoRibbon isSpedUp={demo.isSpedUp} />}
      <View style={styles.header}>
        {onBack !== undefined ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={onBack} style={styles.iconButton} testID="back">
            <IconBack color={palette.text} isFlipped={isRtl} />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}
        {voiceLine !== undefined && <VoiceButton line={voiceLine} />}
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
      {footer !== undefined && <View style={styles.footer}>{footer}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, position: 'relative', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACE.md, paddingTop: TOP_INSET },
  iconButton: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: SPACE.lg, paddingBottom: SPACE.lg, gap: SPACE.lg },
  footer: { paddingHorizontal: SPACE.lg, paddingBottom: SPACE.lg, paddingTop: SPACE.sm, gap: SPACE.md },
});
