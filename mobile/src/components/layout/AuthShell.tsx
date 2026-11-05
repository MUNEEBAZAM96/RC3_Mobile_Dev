import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../theme';
import { Screen } from './Screen';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const { colors, spacing, type } = useTheme();

  return (
    <Screen>
      <View
        style={{
          borderRadius: 20,
          padding: spacing.lg,
          gap: spacing.sm,
          backgroundColor: colors.primary,
        }}
      >
        <Text accessibilityRole="header" style={[type.title, { color: colors.primaryText }]}>
          {title}
        </Text>
        <Text style={[type.body, { color: colors.primaryText, opacity: 0.92 }]}>{subtitle}</Text>
      </View>
      <View
        style={{
          borderRadius: 20,
          padding: spacing.lg,
          gap: spacing.md,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {children}
      </View>
      {footer}
    </Screen>
  );
}
