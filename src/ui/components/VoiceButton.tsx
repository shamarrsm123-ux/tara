// ▶ speaker button (04 §6): thin outlined round button, like the reference's bell (04a v2 §4). 56dp target.
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { VoiceLineId } from '../../shared/types';
import { useUi } from '../theme/UiProvider';
import { TOUCH_MIN } from '../theme/tokens';
import { playVoice } from '../voice/player';

const ICON = 24;

export function VoiceButton({ line, testID }: { line: VoiceLineId; testID?: string }) {
  const { lang, palette, t } = useUi();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.playVoice')}
      hitSlop={8}
      onPress={() => playVoice(lang, line)}
      style={({ pressed }) => [styles.button, { backgroundColor: palette.surface, borderColor: palette.line, opacity: pressed ? 0.7 : 1 }]}
      testID={testID}
    >
      <Svg width={ICON} height={ICON} viewBox="0 0 24 24">
        <Path d="M3 9 H7 L12 5 V19 L7 15 H3 Z" stroke={palette.text} strokeWidth={1.8} strokeLinejoin="round" fill="none" />
        <Path d="M15.5 8.5 Q18 12 15.5 15.5 M18 6 Q22 12 18 18" stroke={palette.text} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: TOUCH_MIN, height: TOUCH_MIN, borderRadius: TOUCH_MIN / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
