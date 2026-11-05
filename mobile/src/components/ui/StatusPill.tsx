import { Text, View } from 'react-native';

import { useTheme } from '../../theme';

interface StatusPillProps {
  label: string;
  tone?: 'success' | 'neutral' | 'danger';
}

export function StatusPill({ label, tone = 'success' }: StatusPillProps) {
  const { colors, type, radius } = useTheme();
  const color = tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : colors.muted;

  return (
    <View style={{ alignItems: 'flex-end', gap: 2 }}>
      <Text style={[type.label, { color: colors.text }]}>{label.split(' ')[0]}</Text>
      <Text style={[type.caption, { color }]}>{label.includes(' ') ? label.split(' ').slice(1).join(' ') : label}</Text>
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
