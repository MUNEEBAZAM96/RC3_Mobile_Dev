import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text } from 'react-native';

import { useTheme } from '../../theme';

interface QuickPromptChipsProps {
  prompts: readonly string[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
}

export function QuickPromptChips({ prompts, onPick, disabled }: QuickPromptChipsProps) {
  const { colors, spacing, type, radius } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
      }}
    >
      {prompts.map((prompt) => (
        <Pressable
          key={prompt}
          onPress={() => onPick(prompt)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Ask: ${prompt}`}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 40,
            paddingHorizontal: spacing.sm + 4,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="flash-outline" size={14} color={colors.primary} />
          <Text style={[type.label, { color: colors.text }]}>{prompt}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
