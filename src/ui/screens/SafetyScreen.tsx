// Screen 6 — Privacy & Safety (03 Flow 6, 04 §10), also the Safety tab. Header "processed on your phone only";
// rows: delete-after (shorter only), "No internet used ✓" (tap for why), then Delete Everything; then the
// optional General place card. Before saving (Try mode) only the true statements are shown — there is nothing
// to shorten or delete yet. 🟡 Family (Flow 10) and Lock (Phase 11) cards join when those features exist, so
// no Yes button here ever promises something the build can't do (04 §12).
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DEFAULT_SETTINGS, type Settings } from '../../shared/types';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ScreenFrame } from '../components/ScreenFrame';
import { Card, IconSquare } from '../components/Surface';
import { IconLock, IconNoInternet, IconShield } from '../icons/Icons';
import { useUi } from '../theme/UiProvider';
import { SPACE, TOUCH_MIN } from '../theme/tokens';
import { DeleteEverything, PlaceCard, ShorterRetention, useRetentionLabel } from './SafetySections';

export interface SavedSafety {
  settings: Settings;
  onSettings: (patch: Partial<Settings>) => void;
  onDeleteEverything: () => void;
}

interface SafetyScreenProps {
  demo: { isSpedUp: boolean } | null;
  /** Null in Try mode (nothing saved yet). */
  saved: SavedSafety | null;
  /** Screen 6 of the story shows Done → Daily mode; the tab doesn't. */
  onDone?: () => void;
}

const CHECK = '✓';
const ICON_SQUARE = 48;

export function SafetyScreen({ demo, saved, onDone }: SafetyScreenProps) {
  const { t, palette } = useUi();
  const retentionLabel = useRetentionLabel();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const retentionDays = saved?.settings.retentionDays ?? DEFAULT_SETTINGS.retentionDays;
  const isStory = onDone !== undefined;
  return (
    <ScreenFrame
      testID={isStory ? 'screen-privacy' : 'screen-safety'}
      title={t('tabs.safety')}
      voiceLine="privacyHeader"
      shouldAutoPlay={isStory}
      demo={demo}
      footer={isStory ? <Button label={t('safety.done')} hasArrow onPress={onDone} testID="privacy-done" /> : undefined}
    >
      <Card tint="peach">
        <IconSquare>
          <IconShield color={palette.accent} />
        </IconSquare>
        <AppText variant="question" isBold>
          {t('safety.header')}
        </AppText>
      </Card>
      <Card style={styles.list}>
        <View style={styles.row}>
          <IconSquare tint="apricot">
            <IconLock color={palette.accent} />
          </IconSquare>
          <AppText variant="body" style={styles.flex}>
            {t('safety.retention')}
          </AppText>
          <AppText variant="body" isBold testID="safety-retention">
            {retentionLabel(retentionDays)}
          </AppText>
        </View>
        {saved !== null && <ShorterRetention current={retentionDays} onChoose={(days) => saved.onSettings({ retentionDays: days })} />}
        <View style={[styles.divider, { backgroundColor: palette.line }]} />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isInfoOpen }}
          onPress={() => setIsInfoOpen((open) => !open)}
          style={styles.row}
          testID="safety-no-internet"
        >
          <IconSquare tint="lemon">
            <IconNoInternet color={palette.accent} />
          </IconSquare>
          <AppText variant="body" style={styles.flex}>
            {t('safety.noInternet')}
          </AppText>
          <AppText variant="question" isBold color="calm">
            {CHECK}
          </AppText>
        </Pressable>
        {isInfoOpen && (
          <AppText variant="body" color="textMuted" testID="safety-no-internet-info">
            {t('safety.noInternetInfo')}
          </AppText>
        )}
      </Card>
      {saved !== null && <DeleteEverything onConfirm={saved.onDeleteEverything} />}
      {saved !== null && (
        <PlaceCard
          isEnabled={saved.settings.placeLabelsEnabled}
          labels={saved.settings.enabledPlaceLabels}
          onChange={(isEnabled, labels) => saved.onSettings({ placeLabelsEnabled: isEnabled, enabledPlaceLabels: labels })}
        />
      )}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  list: { gap: SPACE.sm, paddingVertical: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: TOUCH_MIN },
  divider: { height: 1, marginStart: ICON_SQUARE + SPACE.md },
  flex: { flex: 1 },
});
