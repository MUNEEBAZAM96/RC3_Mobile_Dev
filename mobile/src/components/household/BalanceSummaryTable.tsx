import { Text, View } from 'react-native';

import { CustomCard, SectionHeader } from '../ui';
import { useTheme } from '../../theme';
import type { BalanceRow, Member } from '../../types/household';
import { formatPkr } from '../../utils/currency';

interface BalanceSummaryTableProps {
  balances: BalanceRow[];
  members: Member[];
}

export function BalanceSummaryTable({ balances, members }: BalanceSummaryTableProps) {
  const { colors, spacing, type } = useTheme();
  const nameFor = (id: string) => members.find((m) => m.id === id)?.name ?? balances.find((b) => b.member_id === id)?.name ?? id;

  return (
    <View style={{ gap: spacing.sm }}>
      <SectionHeader title="Household balances" />
      {balances.length === 0 ? (
        <Text style={[type.body, { color: colors.muted }]}>No balance data yet.</Text>
      ) : (
        balances.map((row) => (
          <CustomCard key={row.member_id}>
            <Text style={[type.label, { color: colors.text }]}>{nameFor(row.member_id)}</Text>
            <View style={{ marginTop: spacing.xs, gap: 2 }}>
              <Text style={[type.caption, { color: colors.muted }]}>Paid {formatPkr(row.total_paid)} · Owed {formatPkr(row.total_share_owed)}</Text>
              <Text style={[type.label, { color: row.net_balance >= 0 ? colors.success : colors.danger }]}>
                Net {formatPkr(row.net_balance)}
              </Text>
            </View>
          </CustomCard>
        ))
      )}
    </View>
  );
}
