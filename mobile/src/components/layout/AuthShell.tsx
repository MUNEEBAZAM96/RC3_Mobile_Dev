import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';
import { Screen } from './Screen';

interface AuthShellProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, eyebrow, children, footer }: AuthShellProps) {
  const { colors, spacing, type, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Screen>
      <View style={{ height: insets.top }} />
      <View
        style={{
          borderRadius: radius.xl,
          padding: spacing.lg,
          gap: spacing.sm,
          backgroundColor: colors.hero,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.md,
              backgroundColor: 'rgba(255,255,255,0.14)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="home" size={18} color={colors.heroText} />
          </View>
          {eyebrow ? (
            <Text style={[type.caption, { color: colors.heroText, opacity: 0.85 }]}>
              {eyebrow.toUpperCase()}
            </Text>
          ) : null}
        </View>
        <Text accessibilityRole="header" style={[type.title, { color: colors.heroText }]}>
          {title}
        </Text>
        <Text style={[type.body, { color: colors.heroText, opacity: 0.92 }]}>{subtitle}</Text>
      </View>
      <View
        style={{
          borderRadius: radius.xl,
          padding: spacing.lg,
          gap: spacing.md,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {children}
      </View>
      <View style={{ gap: spacing.md, paddingVertical: spacing.sm }}>{footer}</View>
    </Screen>
  );
}
