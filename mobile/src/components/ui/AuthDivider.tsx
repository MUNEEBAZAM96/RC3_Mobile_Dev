import { Text, View } from 'react-native';

import { useTheme } from '../../theme';

interface AuthDividerProps {
  label?: string;
}

export function AuthDivider({ label = 'or' }: AuthDividerProps) {
  const { colors, spacing, type } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <Text style={[type.label, { color: colors.muted, textTransform: 'uppercase' }]}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}
