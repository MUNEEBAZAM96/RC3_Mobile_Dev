import { Text, View } from 'react-native';

import { CustomCard } from '../ui';
import { useTheme } from '../../theme';
import type { BalanceRow, Member } from '../../types/household';
import { formatPkr } from '../../utils/currency';

interface NetBalanceCardProps {
  member: Member | undefined;
  balance: BalanceRow | undefined;
}

export function NetBalanceCard({ member, balance }: NetBalanceCardProps) {
  const { colors, spacing, type } = useTheme();
  const net = balance?.net_balance ?? 0;
  const label =
    net > 0
      ? `You are owed ${formatPkr(net)}`
      : net < 0
        ? `You owe ${formatPkr(Math.abs(net))}`
        : 'All settled up';

  return (
    <CustomCard>
      <Text style={[type.caption, { color: colors.muted }]}>{member?.name ?? 'Member'} · net balance</Text>
      <Text style={[type.title, { color: colors.text, marginTop: spacing.xs }]}>{label}</Text>
      {balance ? (
        <View style={{ marginTop: spacing.sm, gap: 4 }}>
          <Text style={[type.body, { color: colors.muted }]}>Paid {formatPkr(balance.total_paid)}</Text>
          <Text style={[type.body, { color: colors.muted }]}>Share owed {formatPkr(balance.total_share_owed)}</Text>
        </View>
      ) : null}
    </CustomCard>
  );
}
