import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useTheme, type ThemeColors } from '../../theme';

export type PillTone = 'success' | 'neutral' | 'danger' | 'warning' | 'primary';

interface StatusPillProps {
  label: string;
  tone?: PillTone;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md';
}

function toneColors(colors: ThemeColors, tone: PillTone): { background: string; text: string } {
  switch (tone) {
    case 'success':
      return { background: colors.successSoft, text: colors.success };
    case 'danger':
      return { background: colors.dangerSoft, text: colors.danger };
    case 'warning':
      return { background: colors.warningSoft, text: colors.warning };
    case 'primary':
      return { background: colors.primarySoft, text: colors.primary };
    default:
      return { background: colors.surface, text: colors.muted };
  }
}

/** Compact status chip with a soft tinted background, readable in light and dark. */
export function StatusPill({ label, tone = 'neutral', icon, size = 'md' }: StatusPillProps) {
  const { colors, type, radius } = useTheme();
  const palette = toneColors(colors, tone);
  const compact = size === 'sm';

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: compact ? 8 : 10,
        paddingVertical: compact ? 3 : 5,
        borderRadius: radius.full,
        backgroundColor: palette.background,
      }}
    >
      {icon ? <Ionicons name={icon} size={compact ? 11 : 13} color={palette.text} /> : null}
      <Text style={[compact ? type.caption : type.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

/** Amount + status line for transaction rows */
export function TransactionTrailing({ amount, status }: { amount: string; status: string }) {
  const { colors, type } = useTheme();
  return (
    <View style={{ alignItems: 'flex-end', gap: 2 }}>
      <Text style={[type.label, { color: colors.text }]}>{amount}</Text>
      <Text style={[type.caption, { color: colors.success }]}>{status}</Text>
    </View>
  );
}
