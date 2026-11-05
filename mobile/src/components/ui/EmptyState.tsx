import { Text, View } from 'react-native';

import { useTheme } from '../../theme';
import { CustomButton } from './CustomButton';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  const { colors, spacing, type } = useTheme();
  return (
    <View style={{ gap: spacing.sm, paddingVertical: spacing.lg }}>
      <Text style={[type.heading, { color: colors.text }]}>{title}</Text>
      <Text style={[type.body, { color: colors.muted }]}>{message}</Text>
      {actionLabel && onAction ? <CustomButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
