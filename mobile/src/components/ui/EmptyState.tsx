import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useTheme } from '../../theme';
import { CustomButton } from './CustomButton';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({
  title,
  message,
  icon,
  actionLabel,
  onAction,
  compact,
}: EmptyStateProps) {
  const { colors, spacing, type, radius } = useTheme();
  return (
    <View
      style={{
        gap: spacing.sm,
        paddingVertical: compact ? spacing.sm : spacing.lg,
        alignItems: compact ? 'flex-start' : 'center',
      }}
    >
      {icon ? (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.full,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>
      ) : null}
      <Text style={[type.heading, { color: colors.text, textAlign: compact ? 'left' : 'center' }]}>
        {title}
      </Text>
      <Text style={[type.body, { color: colors.muted, textAlign: compact ? 'left' : 'center' }]}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <CustomButton label={actionLabel} onPress={onAction} variant="secondary" size="sm" />
      ) : null}
    </View>
  );
}
