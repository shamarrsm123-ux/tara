// Bottom tab bar (04 §10: Home · My Days · Safety, icon + label, 64dp) with the raised round Cool button in the
// centre (04a v2 D6, the reference's "+" pattern). The Cool button carries its own label and its full
// accessible name "Cool Around My Head". While cooling is on it turns blue and only shows that it is on —
// Stop lives on the cooling card (03 Flow 3).
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconDays, IconHome, IconShield, IconSnow } from '../icons/Icons';
import { useUi } from '../theme/UiProvider';
import { ACCENT_GLOW, FAB_LIFT, FAB_SIZE, SHADOW, SPACE, TAB_BAR_HEIGHT, TOUCH_MIN } from '../theme/tokens';
import { AppText } from './AppText';

export type MainTab = 'home' | 'myDays' | 'safety';

interface TabBarProps {
  active: MainTab;
  onSelect: (tab: MainTab) => void;
  isCooling: boolean;
  isCoolBlocked: boolean;
  onCool: () => void;
}

type TabIcon = ComponentType<{ color: string; size?: number }>;
type TabLabelKey = 'tabs.home' | 'tabs.myDays' | 'tabs.safety';

const TAB_ICON = 26;
const FAB_ICON = 30;

interface TabItemProps {
  tab: MainTab;
  Icon: TabIcon;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function TabItem({ tab, Icon, label, isActive, onPress }: TabItemProps) {
  const { palette } = useUi();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.6 : 1 }]}
      testID={`tab-${tab}`}
    >
      <Icon color={isActive ? palette.accent : palette.neutral} size={TAB_ICON} />
      <AppText variant="caption" isBold={isActive} color={isActive ? 'accent' : 'textMuted'} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

function CoolButton({ isCooling, isBlocked, onCool }: { isCooling: boolean; isBlocked: boolean; onCool: () => void }) {
  const { palette, t } = useUi();
  const isDisabled = isBlocked || isCooling;
  return (
    <View style={styles.fabSlot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isCooling ? t('status.coolingOn') : t('cool.start')}
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={onCool}
        style={({ pressed }) => [
          styles.fab,
          !isDisabled && ACCENT_GLOW,
          {
            backgroundColor: isCooling ? palette.cool : palette.accent,
            borderColor: palette.surface,
            opacity: isBlocked && !isCooling ? 0.45 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
        testID={isCooling ? 'home-cooling-on' : 'home-cool'}
      >
        <IconSnow color={palette.onAccent} size={FAB_ICON} />
      </Pressable>
      <AppText variant="caption" isBold color={isCooling ? 'cool' : 'accent'} numberOfLines={1}>
        {isCooling ? t('status.on') : t('tabs.cool')}
      </AppText>
    </View>
  );
}

const LEADING: readonly { tab: MainTab; Icon: TabIcon; label: TabLabelKey }[] = [
  { tab: 'home', Icon: IconHome, label: 'tabs.home' },
  { tab: 'myDays', Icon: IconDays, label: 'tabs.myDays' },
];
const TRAILING: readonly { tab: MainTab; Icon: TabIcon; label: TabLabelKey }[] = [{ tab: 'safety', Icon: IconShield, label: 'tabs.safety' }];

export function TabBar({ active, onSelect, isCooling, isCoolBlocked, onCool }: TabBarProps) {
  const { palette, t } = useUi();
  const render = (entries: typeof LEADING) =>
    entries.map((e) => <TabItem key={e.tab} tab={e.tab} Icon={e.Icon} label={t(e.label)} isActive={active === e.tab} onPress={() => onSelect(e.tab)} />);
  return (
    <View style={[styles.bar, { backgroundColor: palette.surface }]} accessibilityRole="tablist" testID="tab-bar">
      {render(LEADING)}
      <CoolButton isCooling={isCooling} isBlocked={isCoolBlocked} onCool={onCool} />
      {render(TRAILING)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: TAB_BAR_HEIGHT,
    paddingHorizontal: SPACE.sm,
    paddingBottom: SPACE.sm,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...SHADOW,
    shadowOffset: { width: 0, height: -6 },
  },
  tab: { flex: 1, minHeight: TOUCH_MIN + SPACE.sm, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  fabSlot: { flex: 1, alignItems: 'center', gap: 2, marginTop: -FAB_LIFT },
  fab: { width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
});
