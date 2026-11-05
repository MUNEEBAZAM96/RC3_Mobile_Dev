import { Text, View } from 'react-native';

import { useTheme } from '../../theme';
import { CustomButton } from './CustomButton';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  const { colors, spacing, type } = useTheme();
  return (
    <View style={{ gap: spacing.sm, paddingVertical: spacing.md }}>
      <Text style={[type.heading, { color: colors.danger }]}>{title}</Text>
      <Text style={[type.body, { color: colors.text }]}>{message}</Text>
      {onRetry ? <CustomButton label="Try again" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}
