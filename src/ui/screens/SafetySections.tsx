// Parts of Screen 6 / the Safety tab (03 Flows 6 and 13): retention that can only get shorter, Delete
// Everything (explanation + 3-second hold), and the general-place opt-in with its fixed labels (no GPS).
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PLACE_LABELS, type PlaceLabel, type Settings } from '../../shared/types';
import { formatNumber } from '../i18n/format';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { HoldToConfirm } from '../components/HoldToConfirm';
import { Card } from '../components/Surface';
import { useUi } from '../theme/UiProvider';
import { RADIUS, SPACE, TOUCH_MIN } from '../theme/tokens';

const RETENTION_CHOICES: readonly Settings['retentionDays'][] = [1, 3, 7];

/** "1 day" / "3 days" in her language. */
export function useRetentionLabel(): (days: number) => string {
  const { t, lang } = useUi();
  return (days) => (days === 1 ? t('safety.retentionOneDay') : t('safety.retentionValue', { days: formatNumber(days, lang) }));
}

/** "Tap to make it shorter (1 or 3 days). Never longer." — only shorter choices are offered. */
export function ShorterRetention({ current, onChoose }: { current: Settings['retentionDays']; onChoose: (days: Settings['retentionDays']) => void }) {
  const { t, palette } = useUi();
  const label = useRetentionLabel();
  const shorter = RETENTION_CHOICES.filter((d) => d < current);
  if (shorter.length === 0) return null;
  return (
    <View style={styles.block}>
      <AppText variant="caption" color="textMuted">
        {t('safety.makeShorter')}
      </AppText>
      <View style={styles.chips}>
        {shorter.map((days) => (
          <Pressable
            key={days}
            accessibilityRole="button"
            onPress={() => onChoose(days)}
            style={({ pressed }) => [styles.chip, { backgroundColor: palette.tintApricot, borderColor: palette.sand, opacity: pressed ? 0.7 : 1 }]}
            testID={`safety-retention-${days}`}
          >
            <AppText variant="body" isBold>
              {label(days)}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Red Delete Everything → explanation → hold 3 seconds (03 Flow 13 steps 1–2). */
export function DeleteEverything({ onConfirm }: { onConfirm: () => void }) {
  const { t } = useUi();
  const [isOpen, setIsOpen] = useState(false);
  if (!isOpen) return <Button label={t('deleteAll.button')} tone="high" onPress={() => setIsOpen(true)} testID="delete-everything" />;
  return (
    <Card testID="delete-everything-confirm">
      <AppText variant="body">{t('deleteAll.explain')}</AppText>
      <HoldToConfirm label={t('deleteAll.button')} voiceLine="deleteHold" onConfirm={onConfirm} testID="delete-hold" />
      <Button label={t('common.no')} variant="outlined" tone="neutral" onPress={() => setIsOpen(false)} testID="delete-cancel" />
    </Card>
  );
}

interface PlaceCardProps {
  isEnabled: boolean;
  labels: readonly PlaceLabel[];
  onChange: (isEnabled: boolean, labels: readonly PlaceLabel[]) => void;
}

/** "General place" opt-in (03 Flow 6 step 4). 🟡 Yes pre-selects all four labels; she un-ticks what she won't use. */
export function PlaceCard({ isEnabled, labels, onChange }: PlaceCardProps) {
  const { t, palette } = useUi();
  const toggle = (label: PlaceLabel) => {
    const next = labels.includes(label) ? labels.filter((l) => l !== label) : PLACE_LABELS.filter((l) => l === label || labels.includes(l));
    onChange(next.length > 0, next);
  };
  return (
    <Card testID="place-card">
      <AppText variant="body">{t('place.question')}</AppText>
      {!isEnabled ? (
        <View style={styles.block}>
          <Button label={t('common.yes')} onPress={() => onChange(true, PLACE_LABELS)} testID="place-yes" />
          <Button label={t('common.no')} variant="outlined" tone="neutral" onPress={() => onChange(false, [])} testID="place-no" />
        </View>
      ) : (
        <View style={styles.block}>
          <AppText variant="body" isBold>
            {t('place.choose')}
          </AppText>
          <View style={styles.chips}>
            {PLACE_LABELS.map((label) => {
              const isOn = labels.includes(label);
              return (
                <Pressable
                  key={label}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isOn }}
                  onPress={() => toggle(label)}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: isOn ? palette.accent : palette.surface, borderColor: isOn ? palette.accent : palette.sand, opacity: pressed ? 0.7 : 1 },
                  ]}
                  testID={`place-${label}`}
                >
                  <AppText variant="body" isBold color={isOn ? 'onAccent' : 'text'}>
                    {t(`place.${label}`)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  block: { gap: SPACE.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  chip: { minHeight: TOUCH_MIN, paddingHorizontal: SPACE.lg, borderRadius: RADIUS.button, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
