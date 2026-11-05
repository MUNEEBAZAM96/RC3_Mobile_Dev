import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';

interface CustomCardProps {
  children: ReactNode;
  onPress?: () => void;
}

export function CustomCard({ children, onPress }: CustomCardProps) {
  const { colors, spacing } = useTheme();
  const style = [styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: spacing.md, gap: spacing.sm }];
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [style, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16 },
  pressed: { opacity: 0.85 },
});
