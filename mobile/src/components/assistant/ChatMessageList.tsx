import { Ionicons } from '@expo/vector-icons';
import { forwardRef, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '../../theme';
import { enterRise } from '../household/motion';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  /** Assistant bubbles that represent an error state (not sent back to the model). */
  error?: boolean;
  /** True when the server answered with its demo payload (no provider key configured). */
  demo?: boolean;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  pending: boolean;
  speakingId: string | null;
  onListen?: (message: ChatMessage) => void;
  onStopListening?: () => void;
  header?: ReactElement | null;
  empty?: ReactElement | null;
  bottomInset: number;
}

export const ChatMessageList = forwardRef<FlatList<ChatMessage>, ChatMessageListProps>(
  function ChatMessageList(
    { messages, pending, speakingId, onListen, onStopListening, header, empty, bottomInset },
    ref,
  ) {
    const { colors, spacing, type, radius } = useTheme();

    return (
      <FlatList
        ref={ref}
        data={messages}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: spacing.md + bottomInset,
          gap: spacing.sm,
          flexGrow: 1,
        }}
        ListHeaderComponent={header ?? undefined}
        ListEmptyComponent={empty ?? undefined}
        ListFooterComponent={
          !pending ? undefined : (
            <Animated.View
              entering={enterRise(0)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                alignSelf: 'flex-start',
              }}
            >
              <Bot />
              <View
                style={{
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.xl,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm + 2,
                  flexDirection: 'row',
                  gap: spacing.sm,
                  alignItems: 'center',
                }}
              >
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[type.caption, { color: colors.muted }]}>Reading the ledger…</Text>
              </View>
            </Animated.View>
          )
        }
        renderItem={({ item, index }) => {
          const mine = item.role === 'user';
          const isSpeaking = speakingId === item.id;
          return (
            <Animated.View
              entering={enterRise(Math.min(index, 3))}
              style={{
                flexDirection: 'row',
                justifyContent: mine ? 'flex-end' : 'flex-start',
                gap: spacing.sm,
              }}
            >
              {!mine ? <Bot error={item.error} /> : null}
              <View style={{ maxWidth: '82%', gap: 4 }}>
                <View
                  style={{
                    backgroundColor: mine
                      ? colors.primary
                      : item.error
                        ? colors.dangerSoft
                        : colors.card,
                    borderWidth: mine ? 0 : 1,
                    borderColor: item.error ? colors.danger : colors.border,
                    borderRadius: radius.xl,
                    borderBottomRightRadius: mine ? 6 : radius.xl,
                    borderBottomLeftRadius: mine ? radius.xl : 6,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm + 2,
                  }}
                >
                  <Text
                    style={[
                      type.body,
                      {
                        color: mine ? colors.primaryText : item.error ? colors.danger : colors.text,
                        fontSize: 15,
                        lineHeight: 21,
                      },
                    ]}
                    selectable
                  >
                    {item.text}
                  </Text>
                </View>
                {!mine && !item.error && onListen ? (
                  <Pressable
                    onPress={() => (isSpeaking ? onStopListening?.() : onListen(item))}
                    accessibilityRole="button"
                    accessibilityLabel={isSpeaking ? 'Stop listening' : 'Listen to this reply'}
                    hitSlop={8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      alignSelf: 'flex-start',
                      minHeight: 28,
                      paddingHorizontal: 4,
                    }}
                  >
                    <Ionicons
                      name={isSpeaking ? 'stop-circle' : 'volume-medium-outline'}
                      size={15}
                      color={colors.primary}
                    />
                    <Text style={[type.caption, { color: colors.primary }]}>
                      {isSpeaking ? 'Stop' : 'Listen'}
                    </Text>
                    {item.demo ? (
                      <Text style={[type.caption, { color: colors.muted }]}> · demo reply</Text>
                    ) : null}
                  </Pressable>
                ) : null}
              </View>
            </Animated.View>
          );
        }}
      />
    );
  },
);

function Bot({ error }: { error?: boolean }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: radius.full,
        backgroundColor: error ? colors.dangerSoft : colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
      }}
    >
      <Ionicons
        name={error ? 'alert' : 'sparkles'}
        size={14}
        color={error ? colors.danger : colors.primary}
      />
    </View>
  );
}
