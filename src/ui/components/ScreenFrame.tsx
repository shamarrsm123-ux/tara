// Common screen layout (04 §5–6, 04a v2 §4): demo ribbon when the demo source is active (04 §9.6), a header
// with thin outlined round buttons (back on the leading side, ▶ voice on the trailing side) and an optional
// centred title, scrollable content, and the primary action fixed at the bottom so it never needs scrolling.
// Home passes its own `header` (greeting row) instead.
import { useEffect, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { VoiceLineId } from '../../shared/types';
import { Backdrop } from '../art/Backdrop';
import { IconBack } from '../icons/Icons';
import { useUi } from '../theme/UiProvider';
import { SPACE, TOUCH_MIN, type BackdropMood } from '../theme/tokens';
import { AppText } from './AppText';
import { playAutoVoice } from '../voice/player';
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
  /** Optional title centred in the header. */
  title?: string;
  /** Replaces the default header row entirely. */
  header?: ReactNode;
  /** Soft illustrated background mood (04a v3 §6); null = plain. */
  backdrop?: BackdropMood | null;
  testID?: string;
}

const TOP_INSET = 24;

export function BackButton({ onPress }: { onPress: () => void }) {
  const { palette, t, isRtl } = useUi();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, styles.round, { borderColor: palette.line, backgroundColor: palette.surface, opacity: pressed ? 0.7 : 1 }]}
      testID="back"
    >
      <IconBack color={palette.text} isFlipped={isRtl} size={26} />
    </Pressable>
  );
}

export function ScreenFrame({ children, footer, voiceLine, shouldAutoPlay = true, onBack, demo = null, title, header, backdrop = 'warm', testID }: ScreenFrameProps) {
  const { palette, lang } = useUi();

  useEffect(() => {
    if (voiceLine !== undefined && shouldAutoPlay) playAutoVoice(lang, voiceLine);
  }, [voiceLine, lang, shouldAutoPlay]);

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]} testID={testID}>
      {backdrop !== null && <Backdrop mood={backdrop} />}
      {demo !== null && <DemoRibbon isSpedUp={demo.isSpedUp} />}
      {header ?? (
        <View style={styles.header}>
          {onBack !== undefined ? <BackButton onPress={onBack} /> : <View style={styles.iconButton} />}
          {title !== undefined ? (
            <AppText variant="body" isBold style={styles.title}>
              {title}
            </AppText>
          ) : (
            <View style={styles.flex} />
          )}
          {voiceLine !== undefined ? <VoiceButton line={voiceLine} /> : <View style={styles.iconButton} />}
        </View>
      )}
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer !== undefined && <View style={styles.footer}>{footer}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, position: 'relative', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.lg, paddingTop: TOP_INSET, paddingBottom: SPACE.md, gap: SPACE.md },
  iconButton: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },
  round: { borderRadius: TOUCH_MIN / 2, borderWidth: 1 },
  title: { flex: 1, textAlign: 'center' },
  flex: { flex: 1 },
  content: { paddingHorizontal: SPACE.lg, paddingBottom: SPACE.lg, gap: SPACE.lg },
  footer: { paddingHorizontal: SPACE.lg, paddingBottom: SPACE.lg, paddingTop: SPACE.sm, gap: SPACE.md },
});
