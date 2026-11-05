import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import type { ActivityEvent, ActivityType } from '../../store/activityFeed';
import { useTheme, type ThemeColors } from '../../theme';
import { formatPkr } from '../../utils/currency';
import { relativeTime } from '../../utils/time';

function visual(
  colors: ThemeColors,
  kind: ActivityType,
): { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string; label: string } {
  switch (kind) {
    case 'checkout':
      return {
        icon: 'bag-check-outline',
        bg: colors.primarySoft,
        fg: colors.primary,
        label: 'Checkout',
      };
    case 'expense':
      return {
        icon: 'receipt-outline',
        bg: colors.warningSoft,
        fg: colors.warning,
        label: 'Expense',
      };
    case 'settle':
      return {
        icon: 'swap-horizontal-outline',
        bg: colors.successSoft,
        fg: colors.success,
        label: 'Settlement',
      };
    default:
      return { icon: 'add-circle-outline', bg: colors.surface, fg: colors.muted, label: 'List' };
  }
}

interface ActivityRowProps {
  event: ActivityEvent;
  /** Draw the vertical timeline connector below the icon. */
  connector?: boolean;
  compact?: boolean;
}

export function ActivityRow({ event, connector, compact }: ActivityRowProps) {
  const { colors, spacing, type, radius } = useTheme();
  const v = visual(colors, event.type);
  const size = compact ? 32 : 40;

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm + 4, alignItems: 'stretch' }}>
      <View style={{ alignItems: 'center', width: size }}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: radius.md,
            backgroundColor: v.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={v.icon} size={compact ? 16 : 19} color={v.fg} />
        </View>
        {connector ? (
          <View
            style={{
              flex: 1,
              width: 2,
              backgroundColor: colors.border,
              marginVertical: 4,
              borderRadius: 1,
            }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, paddingBottom: connector ? spacing.md : 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <Text
            style={[type.label, { color: colors.text, flex: 1, fontSize: compact ? 14 : 15 }]}
            numberOfLines={2}
          >
            {event.title}
          </Text>
          {event.amount !== undefined ? (
            <Text
              style={[
                type.label,
                { color: event.type === 'settle' ? colors.success : colors.text },
              ]}
            >
              {formatPkr(event.amount)}
            </Text>
          ) : null}
        </View>
        <Text style={[type.caption, { color: colors.muted }]}>
          {v.label}
          {event.memberName ? ` · ${event.memberName}` : ''} · {relativeTime(event.createdAt)}
        </Text>
      </View>
    </View>
  );
}
