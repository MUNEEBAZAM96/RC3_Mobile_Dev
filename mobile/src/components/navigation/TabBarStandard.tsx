import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';
import { pressTab, type AppTabBarProps } from './types';

const INDICATOR_WIDTH = 28;

export function TabBarStandard({ state, descriptors, ...rest }: AppTabBarProps) {
  const { colors, spacing, type, minTapTarget, radius } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabWidth = width / state.routes.length;

  // Short pill indicator centred under the active tab; springs between tabs.
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withSpring(state.index * tabWidth + tabWidth / 2 - INDICATOR_WIDTH / 2, {
          damping: 18,
          stiffness: 220,
          reduceMotion: ReduceMotion.System,
        }),
      },
    ],
  }));

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        paddingBottom: Math.max(insets.bottom, spacing.sm),
        paddingTop: spacing.xs,
      }}
    >
      <View style={{ height: 3, marginBottom: 2 }}>
        <Animated.View
          style={[
            indicatorStyle,
            {
              width: INDICATOR_WIDTH,
              height: 3,
              borderRadius: radius.full,
              backgroundColor: colors.tabActive,
            },
          ]}
        />
      </View>
      <View style={{ flexDirection: 'row' }}>
        {state.routes.map((route: AppTabBarProps['state']['routes'][number], index: number) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const focused = state.index === index;
          const color = focused ? colors.tabActive : colors.muted;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={() =>
                pressTab({ state, descriptors, ...rest }, route.key, route.name, focused)
              }
              style={({ pressed }) => ({
                width: tabWidth,
                alignItems: 'center',
                minHeight: minTapTarget,
                justifyContent: 'center',
                gap: 3,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 3,
                  borderRadius: radius.full,
                  backgroundColor: focused ? colors.primarySoft : 'transparent',
                }}
              >
                {options.tabBarIcon?.({ focused, color, size: 22 })}
              </View>
              <Text style={[type.caption, { color, fontSize: 11 }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
