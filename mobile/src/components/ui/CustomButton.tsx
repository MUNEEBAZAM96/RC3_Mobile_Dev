import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../../theme';

interface CustomButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'md' | 'sm';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

export function CustomButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  size = 'md',
  icon,
  style,
}: CustomButtonProps) {
  const { colors, minTapTarget, spacing, radius, type } = useTheme();
  const accent = variant === 'danger' ? colors.danger : colors.primary;
  const filled = variant === 'primary' || variant === 'danger';
  const background = filled ? accent : variant === 'ghost' ? colors.primarySoft : 'transparent';
  const textColor = filled ? colors.primaryText : accent;
  const compact = size === 'sm';
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      hitSlop={compact ? 6 : 0}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: compact ? 40 : minTapTarget,
          paddingHorizontal: compact ? spacing.sm + 4 : spacing.md,
          borderRadius: compact ? radius.md : radius.lg,
          backgroundColor: background,
          borderColor: accent,
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed && !inactive ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 16 : 18} color={textColor} /> : null}
          <Text
            style={[compact ? type.label : styles.label, { color: textColor }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontSize: 16, fontWeight: '700' },
});
