import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CustomCard, StatusPill } from '../ui';
import { useTheme } from '../../theme';
import type { BalanceRow, Member } from '../../types/household';
import { formatPkr } from '../../utils/currency';
import { initials } from '../../utils/format';
import { enterFade, exitFade, layoutSpring } from './motion';

interface NetBalanceCardProps {
  member: Member | undefined;
  balance: BalanceRow | undefined;
}

/**
 * The hero of the dashboard: the active member's net position, straight from the API.
 * Copy is fixed by the brief: "You are owed PKR 250.00" / "You owe PKR 450.00" / "You are settled".
 */
export function NetBalanceCard({ member, balance }: NetBalanceCardProps) {
  const { colors, spacing, type, radius } = useTheme();
  const net = balance?.net_balance ?? 0;
  const sign: 'positive' | 'negative' | 'zero' =
    net > 0 ? 'positive' : net < 0 ? 'negative' : 'zero';

  const headline =
    sign === 'positive'
      ? `You are owed ${formatPkr(net)}`
      : sign === 'negative'
        ? `You owe ${formatPkr(Math.abs(net))}`
        : 'You are settled';
  const accent =
    sign === 'positive' ? colors.success : sign === 'negative' ? colors.danger : colors.muted;
  const pillTone = sign === 'positive' ? 'success' : sign === 'negative' ? 'danger' : 'neutral';
  const pillLabel = sign === 'positive' ? 'To receive' : sign === 'negative' ? 'To pay' : 'Settled';
  const pillIcon =
    sign === 'positive'
      ? 'arrow-down-circle'
      : sign === 'negative'
        ? 'arrow-up-circle'
        : 'checkmark-circle';

  return (
    <CustomCard elevated style={{ gap: 0, padding: 0 }}>
      <View style={{ padding: spacing.md, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.full,
              backgroundColor: colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[type.label, { color: colors.primary }]}>
              {initials(member?.name ?? '?')}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.caption, { color: colors.muted }]}>NET BALANCE</Text>
            <Text style={[type.label, { color: colors.text }]}>{member?.name ?? 'Member'}</Text>
          </View>
          <StatusPill label={pillLabel} tone={pillTone} icon={pillIcon} size="sm" />
        </View>

        <Animated.View
          key={`${member?.id ?? 'none'}-${net}`}
          entering={enterFade}
          exiting={exitFade}
          layout={layoutSpring}
        >
          <Text
            style={[type.balance, { color: accent }]}
            accessibilityRole="header"
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {headline}
          </Text>
        </Animated.View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          borderBottomLeftRadius: radius.xl,
          borderBottomRightRadius: radius.xl,
        }}
      >
        <Stat icon="card-outline" label="Paid" value={balance?.total_paid ?? 0} />
        <Divider />
        <Stat icon="pie-chart-outline" label="Share" value={balance?.total_share_owed ?? 0} />
        <Divider />
        <Stat
          icon="swap-horizontal-outline"
          label="Settled"
          value={(balance?.settlements_received ?? 0) + (balance?.settlements_sent ?? 0)}
        />
      </View>
    </CustomCard>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  const { colors, spacing, type } = useTheme();
  return (
    <View
      style={{ flex: 1, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm, gap: 2 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name={icon} size={12} color={colors.muted} />
        <Text style={[type.caption, { color: colors.muted }]}>{label}</Text>
      </View>
      <Text style={[type.label, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatPkr(value)}
      </Text>
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ width: 1, backgroundColor: colors.border }} />;
}
