// Decision Card (04 §9.4, 04a D4): white rounded card with a tag pill (dot + word), the question, ▶,
// optional illustration, and two same-size pills — Yes filled orange, No outlined (04 §5).
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { VoiceLineId } from '../../shared/types';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card, Tag } from './Surface';
import { VoiceButton } from './VoiceButton';

export type CardTone = 'high' | 'cool' | 'neutral';

interface DecisionCardProps {
  tone: CardTone;
  question: string;
  yesLabel: string;
  noLabel: string;
  onYes: () => void;
  onNo: () => void;
  /** Word shown in the tag pill; omitted for neutral questions. */
  tagLabel?: string;
  voiceLine?: VoiceLineId;
  illustration?: ReactNode;
  testID?: string;
}

export function DecisionCard({ tone, question, yesLabel, noLabel, onYes, onNo, tagLabel, voiceLine, illustration, testID }: DecisionCardProps) {
  const { palette } = useUi();
  return (
    <Card testID={testID}>
      {tagLabel !== undefined && tone !== 'neutral' && <Tag label={tagLabel} color={palette[tone]} testID={testID ? `${testID}-tag` : undefined} />}
      <View style={styles.header}>
        <AppText variant="question" style={styles.question}>
          {question}
        </AppText>
        {voiceLine !== undefined && <VoiceButton line={voiceLine} />}
      </View>
      {illustration !== undefined && <View style={styles.illustration}>{illustration}</View>}
      <View style={styles.buttons}>
        <Button label={yesLabel} onPress={onYes} hasArrow testID={testID ? `${testID}-yes` : undefined} />
        <Button label={noLabel} onPress={onNo} variant="outlined" tone="neutral" testID={testID ? `${testID}-no` : undefined} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  question: { flex: 1 },
  illustration: { alignItems: 'center' },
  buttons: { gap: SPACE.md, marginTop: SPACE.sm },
});
