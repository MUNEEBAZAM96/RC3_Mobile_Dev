import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { useTheme } from '../../theme';

interface ChatComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Rendered to the left of the input (for example the voice button). */
  leading?: React.ReactNode;
}

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  sending,
  disabled,
  placeholder,
  leading,
}: ChatComposerProps) {
  const { colors, spacing, radius, minTapTarget } = useTheme();
  const canSend = value.trim().length > 0 && !sending && !disabled;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
      }}
    >
      {leading}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'flex-end',
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.xl,
          backgroundColor: colors.card,
          paddingLeft: spacing.md,
          paddingRight: 4,
          paddingVertical: 4,
          minHeight: minTapTarget,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? 'Ask about balances, budget or splits…'}
          placeholderTextColor={colors.muted}
          multiline
          maxLength={2000}
          editable={!disabled}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={() => {
            if (canSend) onSend();
          }}
          accessibilityLabel="Message GharSplit AI"
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 15,
            maxHeight: 120,
            paddingVertical: 8,
            paddingRight: spacing.sm,
          }}
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend, busy: sending }}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canSend ? colors.primary : colors.surface,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons
              name="arrow-up"
              size={20}
              color={canSend ? colors.primaryText : colors.muted}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}
