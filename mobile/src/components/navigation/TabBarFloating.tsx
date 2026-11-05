import { BlurView } from 'expo-blur';
import { Platform, View } from 'react-native';

import { useTheme } from '../../theme';
import { TabBarStandard } from './TabBarStandard';
import type { AppTabBarProps } from './types';

export function TabBarFloating(props: AppTabBarProps) {
  const { colors, spacing, radius } = useTheme();

  if (Platform.OS === 'android') {
    return (
      <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
        <View style={{ borderRadius: radius.xxl, overflow: 'hidden', backgroundColor: colors.card, elevation: 8 }}>
          <TabBarStandard {...props} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
      <BlurView intensity={70} tint="light" style={{ borderRadius: radius.xxl, overflow: 'hidden' }}>
        <TabBarStandard {...props} />
      </BlurView>
    </View>
  );
}
