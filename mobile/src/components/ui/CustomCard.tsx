import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { cardShadow, useTheme } from '../../theme';

interface CustomCardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Surface treatment. `hero` uses the deep brand colour, `soft` the primary tint. */
  tone?: 'default' | 'hero' | 'soft';
  /** Remove inner padding when the card manages its own rows. */
  flush?: boolean;
  elevated?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function CustomCard({
  children,
  onPress,
  tone = 'default',
  flush,
  elevated,
  accessibilityLabel,
  style,
}: CustomCardProps) {
  const { colors, spacing, radius } = useTheme();
  const background =
    tone === 'hero' ? colors.hero : tone === 'soft' ? colors.primarySoft : colors.card;
  const borderColor = tone === 'default' ? colors.border : background;
  const base: StyleProp<ViewStyle> = [
    styles.card,
    elevated ? cardShadow(3) : null,
    {
      backgroundColor: background,
      borderColor,
      borderRadius: radius.xl,
      padding: flush ? 0 : spacing.md,
      gap: flush ? 0 : spacing.sm,
    },
    style,
  ];

  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
