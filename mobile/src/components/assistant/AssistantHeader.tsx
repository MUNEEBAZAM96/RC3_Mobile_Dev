import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../../theme';
import { StatusPill } from '../ui';

interface AssistantHeaderProps {
  /** Who the assistant believes it is talking to. */
  speakingTo: string | null;
  /** Timestamp of the last snapshot, or null while loading. */
  fetchedAt: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  demoMode?: boolean;
}

export function AssistantHeader({
  speakingTo,
  fetchedAt,
  refreshing,
  onRefresh,
  demoMode,
}: AssistantHeaderProps) {
  const { colors, spacing, type, radius, minTapTarget } = useTheme();
  const time = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.lg,
          backgroundColor: colors.hero,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="sparkles" size={20} color={colors.heroText} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}
        >
          <Text style={[type.heading, { color: colors.text, fontSize: 17 }]}>GharSplit AI</Text>
          {demoMode ? <StatusPill label="Demo mode" tone="warning" size="sm" /> : null}
        </View>
        <Text style={[type.caption, { color: colors.muted }]} numberOfLines={1}>
          Uses your live flat data{speakingTo ? ` · talking to ${speakingTo}` : ''}
          {time ? ` · synced ${time}` : ''}
        </Text>
      </View>
      <Pressable
        onPress={onRefresh}
        disabled={refreshing}
        accessibilityRole="button"
        accessibilityLabel="Refresh household data"
        accessibilityState={{ busy: refreshing }}
        style={({ pressed }) => ({
          width: minTapTarget,
          height: minTapTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.full,
          opacity: refreshing ? 0.5 : pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="refresh" size={20} color={colors.primary} />
      </Pressable>
    </View>
  );
}
