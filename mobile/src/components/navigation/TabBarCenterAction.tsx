import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { useTheme } from '../../theme';
import { pressTab, type AppTabBarProps } from './types';

export function TabBarCenterAction({ state, descriptors, ...rest }: AppTabBarProps) {
  const { colors, spacing, type, minTapTarget } = useTheme();
  const { width } = useWindowDimensions();
  const routes = state.routes;
  const centerIndex = Math.floor(routes.length / 2);
  const tabWidth = width / routes.length;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        paddingBottom: spacing.sm,
        paddingTop: spacing.xs,
        flexDirection: 'row',
      }}
    >
      {routes.map((route: AppTabBarProps['state']['routes'][number], index: number) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const focused = state.index === index;
        const color = focused ? colors.tabActive : colors.muted;
        const isCenter = index === centerIndex;

        if (isCenter) {
          return (
            <View key={route.key} style={{ width: tabWidth, alignItems: 'center', marginTop: -20 }}>
              <Pressable
                onPress={() => router.push('/labs/camera')}
                accessibilityRole="button"
                accessibilityLabel="Quick action"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.xs,
                }}
              >
                <Ionicons name="scan-outline" size={26} color={colors.primaryText} />
              </Pressable>
              <Text style={[type.caption, { color: colors.muted, fontSize: 11 }]}>Scan</Text>
            </View>
          );
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={() => pressTab({ state, descriptors, ...rest }, route.key, route.name, focused)}
            style={{ width: tabWidth, alignItems: 'center', minHeight: minTapTarget, justifyContent: 'center', gap: 2 }}
          >
            {options.tabBarIcon?.({ focused, color, size: 22 })}
            <Text style={[type.caption, { color, fontSize: 11 }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
