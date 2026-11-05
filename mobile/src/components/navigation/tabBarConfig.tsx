import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';

export interface TabDefinition {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
}

export const fintech5Tabs: TabDefinition[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'rewards', title: 'Rewards', icon: 'diamond-outline', iconFocused: 'diamond' },
  { name: 'finance', title: 'Finance', icon: 'bar-chart-outline', iconFocused: 'bar-chart' },
  { name: 'cards', title: 'Cards', icon: 'card-outline', iconFocused: 'card' },
  { name: 'profile', title: 'Me', icon: 'person-outline', iconFocused: 'person' },
];

export const classic3Tabs: TabDefinition[] = [
  { name: 'index', title: 'Home', icon: 'grid-outline', iconFocused: 'grid' },
  { name: 'explore', title: 'Explore', icon: 'compass-outline', iconFocused: 'compass' },
  { name: 'profile', title: 'Profile', icon: 'person-outline', iconFocused: 'person' },
];

export const sharedLiving3Tabs: TabDefinition[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'shopping', title: 'Shopping', icon: 'cart-outline', iconFocused: 'cart' },
  { name: 'expenses', title: 'Expenses', icon: 'wallet-outline', iconFocused: 'wallet' },
];

export function optionsForTab(tab: TabDefinition): BottomTabNavigationOptions {
  return {
    title: tab.title,
    tabBarIcon: ({ color, size, focused }: { focused: boolean; color: ColorValue; size: number }) => (
      <Ionicons name={focused ? tab.iconFocused : tab.icon} color={typeof color === 'string' ? color : '#6B7280'} size={size} />
    ),
  };
}
