import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { CustomCard, EmptyState } from '../ui';
import { useTheme } from '../../theme';
import type { BalanceRow, Member } from '../../types/household';
import { formatPkr } from '../../utils/currency';
import { initials } from '../../utils/format';

interface BalanceSummaryTableProps {
  balances: BalanceRow[];
  members: Member[];
  /** Highlights the row of the member currently being viewed as. */
  activeMemberId?: string | null;
}

/**
 * Scannable household ledger. Every number comes from GET /api/balances;
 * the footer shows the sum the API returned, which must read PKR 0.00.
 */
export function BalanceSummaryTable({
  balances,
  members,
  activeMemberId,
}: BalanceSummaryTableProps) {
  const { colors, spacing, type, radius } = useTheme();
  const nameFor = (id: string) =>
    members.find((m) => m.id === id)?.name ?? balances.find((b) => b.member_id === id)?.name ?? id;
  const sumNet = Math.round(balances.reduce((acc, row) => acc + row.net_balance, 0) * 100) / 100;
  const balanced = Math.abs(sumNet) < 0.005;

  if (balances.length === 0) {
    return (
      <CustomCard>
        <EmptyState
          compact
          icon="people-outline"
          title="No balances yet"
          message="Log a shared expense or check out a shopping trip and the ledger appears here."
        />
      </CustomCard>
    );
  }

  return (
    <CustomCard flush>
      {/* Header row */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm + 4,
          paddingBottom: spacing.xs,
        }}
      >
        <Text style={[type.caption, { color: colors.muted, flex: 1.4 }]}>MEMBER · PKR</Text>
        <Text style={[type.caption, { color: colors.muted, flex: 1, textAlign: 'right' }]}>
          PAID
        </Text>
        <Text style={[type.caption, { color: colors.muted, flex: 1, textAlign: 'right' }]}>
          SHARE
        </Text>
        <Text style={[type.caption, { color: colors.muted, flex: 1.1, textAlign: 'right' }]}>
          NET
        </Text>
      </View>

      {balances.map((row, index) => {
        const sign = row.net_balance > 0 ? 1 : row.net_balance < 0 ? -1 : 0;
        const netColor = sign > 0 ? colors.success : sign < 0 ? colors.danger : colors.muted;
        const active = row.member_id === activeMemberId;
        return (
          <View
            key={row.member_id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm + 2,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: active ? colors.primarySoft : 'transparent',
            }}
          >
            <View
              style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: radius.full,
                  backgroundColor: active ? colors.primary : colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={[type.caption, { color: active ? colors.primaryText : colors.text }]}>
                  {initials(nameFor(row.member_id))}
                </Text>
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text style={[type.label, { color: colors.text }]} numberOfLines={1}>
                  {nameFor(row.member_id)}
                </Text>
                <Text style={[type.caption, { color: colors.muted }]}>{row.member_id}</Text>
              </View>
            </View>
            <Text
              style={[
                type.caption,
                { color: colors.text, flex: 1, textAlign: 'right', fontSize: 12 },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatPkr(row.total_paid)}
            </Text>
            <Text
              style={[
                type.caption,
                { color: colors.text, flex: 1, textAlign: 'right', fontSize: 12 },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatPkr(row.total_share_owed)}
            </Text>
            <Text
              style={[type.label, { color: netColor, flex: 1.1, textAlign: 'right' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {sign > 0 ? '+' : ''}
              {formatPkr(row.net_balance).replace('PKR ', '')}
            </Text>
          </View>
        );
      })}

      {/* Footer: conservation check */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: balanced ? colors.successSoft : colors.dangerSoft,
          borderBottomLeftRadius: radius.xl,
          borderBottomRightRadius: radius.xl,
        }}
      >
        <Ionicons
          name={balanced ? 'shield-checkmark' : 'warning'}
          size={16}
          color={balanced ? colors.success : colors.danger}
        />
        <Text style={[type.caption, { color: balanced ? colors.success : colors.danger, flex: 1 }]}>
          {balanced ? 'Household nets sum to zero' : 'Nets do not sum to zero'}
        </Text>
        <Text style={[type.label, { color: balanced ? colors.success : colors.danger }]}>
          {formatPkr(sumNet)}
        </Text>
      </View>
    </CustomCard>
  );
}
