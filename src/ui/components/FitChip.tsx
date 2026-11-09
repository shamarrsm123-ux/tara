// Sensor Fit Chip (04 §9.3): green dot "Good", amber "Adjust", red "No contact". Color + dot + word.
import { StyleSheet, View } from 'react-native';
import type { FitLevel } from '../../shared/types';
import { useUi } from '../theme/UiProvider';
import { RADIUS, SPACE } from '../theme/tokens';
import { AppText } from './AppText';

const COLOR = { good: 'calm', adjust: 'rising', none: 'high' } as const;
const WORD = { good: 'fit.good', adjust: 'fit.adjust', none: 'fit.none' } as const;
const DOT_SIZE = 14;
const BORDER_WIDTH = 2;

interface FitChipProps {
  fit: FitLevel;
  testID?: string;
}

export function FitChip({ fit, testID }: FitChipProps) {
  const { palette, t } = useUi();
  const color = palette[COLOR[fit]];
  const word = t(WORD[fit]);
  return (
    <View
      accessible
      accessibilityLabel={word}
      style={[styles.chip, { borderColor: color, backgroundColor: palette.surface }]}
      testID={testID}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="body" isBold>
        {word}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACE.sm,
    paddingVertical: SPACE.xs,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.chip,
    borderWidth: BORDER_WIDTH,
  },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2 },
});
