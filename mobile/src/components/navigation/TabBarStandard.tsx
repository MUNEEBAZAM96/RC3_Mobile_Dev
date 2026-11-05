import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { useTheme } from '../../theme';
import { pressTab, type AppTabBarProps } from './types';

export function TabBarStandard({ state, descriptors, ...rest }: AppTabBarProps) {
  const { colors, spacing, type, minTapTarget } = useTheme();
  const { width } = useWindowDimensions();
  const tabWidth = width / state.routes.length;

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(state.index * tabWidth, { damping: 18, stiffness: 220 }) }],
  }));

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        paddingBottom: spacing.sm,
        paddingTop: spacing.xs,
      }}
    >
      <View style={{ height: 3, marginBottom: 4, overflow: 'hidden' }}>
        <Animated.View
          style={[
            indicatorStyle,
            {
              width: tabWidth,
              height: 3,
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
              onPress={() => pressTab({ state, descriptors, ...rest }, route.key, route.name, focused)}
              style={{ width: tabWidth, alignItems: 'center', minHeight: minTapTarget, justifyContent: 'center', gap: 2 }}
            >
              {options.tabBarIcon?.({ focused, color, size: 22 })}
              <Text style={[type.caption, { color, fontSize: 11 }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
