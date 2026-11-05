import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { TabBarStandard } from '../../src/components/navigation/TabBarStandard';
import { sharedLiving3Tabs } from '../../src/components/navigation/tabBarConfig';
import type { AppTabBarProps } from '../../src/components/navigation/types';
import { useTheme } from '../../src/theme';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <TabBarStandard {...(props as AppTabBarProps)} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
      }}
    >
      {sharedLiving3Tabs.map((def) => (
        <Tabs.Screen
          key={def.name}
          name={def.name}
          options={{
            title: def.title,
            tabBarIcon: ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
              <Ionicons
                name={focused ? def.iconFocused : def.icon}
                color={typeof color === 'string' ? color : '#6B7280'}
                size={size}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
