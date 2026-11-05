import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../../theme';

interface CustomButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function CustomButton({ label, onPress, loading, disabled, variant = 'primary' }: CustomButtonProps) {
  const { colors, minTapTarget, spacing } = useTheme();
  const isPrimary = variant === 'primary';
  const color = variant === 'danger' ? colors.danger : colors.primary;
  const background = isPrimary || variant === 'danger' ? color : 'transparent';
  const textColor = variant === 'secondary' ? color : variant === 'danger' ? colors.card : colors.primaryText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: minTapTarget,
          paddingHorizontal: spacing.md,
          backgroundColor: background,
          borderColor: color,
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          opacity: pressed || disabled ? 0.7 : 1,
        },
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '700' },
});
