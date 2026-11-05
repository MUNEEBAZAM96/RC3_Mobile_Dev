import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function AppHeader({ title, subtitle, right }: AppHeaderProps) {
  const { colors, spacing, type } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text accessibilityRole="header" style={[type.title, { color: colors.text }]}>
          {title}
        </Text>
        {subtitle ? <Text style={[type.body, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}
