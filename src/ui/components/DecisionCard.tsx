// Decision Card (04 §9.4): full-width card, colored top band, 24sp question, ▶, optional illustration,
// two same-size buttons — Yes filled blue, No outlined (04 §5: No is never hidden).
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { VoiceLineId } from '../../shared/types';
import { useUi } from '../theme/UiProvider';
import { RADIUS, SPACE } from '../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { VoiceButton } from './VoiceButton';

export type CardTone = 'high' | 'cool' | 'neutral';

interface DecisionCardProps {
  tone: CardTone;
  question: string;
  yesLabel: string;
  noLabel: string;
  onYes: () => void;
  onNo: () => void;
  voiceLine?: VoiceLineId;
  illustration?: ReactNode;
  testID?: string;
}

const BAND_HEIGHT = 14;

export function DecisionCard({ tone, question, yesLabel, noLabel, onYes, onNo, voiceLine, illustration, testID }: DecisionCardProps) {
  const { palette } = useUi();
  const bandColor = tone === 'neutral' ? palette.sand : palette[tone];
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.sand }]} testID={testID}>
      <View style={[styles.band, { backgroundColor: bandColor }]} testID={testID ? `${testID}-band` : undefined} />
      <View style={styles.body}>
        <View style={styles.header}>
          <AppText variant="question" style={styles.question}>
            {question}
          </AppText>
          {voiceLine !== undefined && <VoiceButton line={voiceLine} />}
        </View>
        {illustration !== undefined && <View style={styles.illustration}>{illustration}</View>}
        <View style={styles.buttons}>
          <Button label={yesLabel} onPress={onYes} tone="cool" testID={testID ? `${testID}-yes` : undefined} />
          <Button label={noLabel} onPress={onNo} variant="outlined" tone="neutral" testID={testID ? `${testID}-no` : undefined} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', borderRadius: RADIUS.card, borderWidth: 1, overflow: 'hidden' },
  band: { height: BAND_HEIGHT },
  body: { padding: SPACE.lg, gap: SPACE.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  question: { flex: 1 },
  illustration: { alignItems: 'center' },
  buttons: { gap: SPACE.md },
});
