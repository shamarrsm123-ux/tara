// Safety tab (03 Flow 6, 04 §10 Screen 6), Try-mode version: shield header with "processed on your phone only",
// then status rows — retention (7 days) and "No internet used ✓" (tap for the airplane-mode explanation).
// 🟡 Shortening retention, Delete Everything, Family, Place and Lock arrive with storage in Phase 6.
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DEFAULT_SETTINGS } from '../../shared/types';
import { formatNumber } from '../i18n/format';
import { AppText } from '../components/AppText';
import { ScreenFrame } from '../components/ScreenFrame';
import { Card, IconSquare } from '../components/Surface';
import { IconLock, IconNoInternet, IconShield } from '../icons/Icons';
import { useUi } from '../theme/UiProvider';
import { SPACE, TOUCH_MIN } from '../theme/tokens';

interface SafetyScreenProps {
  demo: { isSpedUp: boolean } | null;
}

const CHECK = '✓';
const ICON_SQUARE = 48;

export function SafetyScreen({ demo }: SafetyScreenProps) {
  const { t, palette, lang } = useUi();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  return (
    <ScreenFrame testID="screen-safety" title={t('tabs.safety')} demo={demo}>
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
            {t('safety.retentionValue', { days: formatNumber(DEFAULT_SETTINGS.retentionDays, lang) })}
          </AppText>
        </View>
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
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  list: { gap: SPACE.sm, paddingVertical: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: TOUCH_MIN },
  divider: { height: 1, marginStart: ICON_SQUARE + SPACE.md },
  flex: { flex: 1 },
});
