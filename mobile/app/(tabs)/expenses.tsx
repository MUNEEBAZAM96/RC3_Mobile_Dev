import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import {
  BalanceSummaryTable,
  ExpenseForm,
  SettleUpModal,
  SmartSettleCard,
} from '../../src/components/household';
import { Screen } from '../../src/components/layout/Screen';
import {
  AppHeader,
  CustomButton,
  CustomCard,
  ErrorState,
  LoadingScreen,
  SectionHeader,
} from '../../src/components/ui';
import { householdApi } from '../../src/services/api/household';
import { useHouseholdStore } from '../../src/store/household';
import { useTheme } from '../../src/theme';
import type { BalanceRow } from '../../src/types/household';
import { formatPkr } from '../../src/utils/currency';
import { errorMessage } from '../../src/utils/format';

export default function ExpensesScreen() {
  const { colors, spacing, type } = useTheme();
  const { members, activeMemberId, loadMembers } = useHouseholdStore();
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settleOpen, setSettleOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      await loadMembers();
      setBalances(await householdApi.getBalances());
    } catch (err) {
      setError(errorMessage(err, 'Could not load balances.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadMembers]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const totalSpending = useMemo(
    () => balances.reduce((sum, row) => sum + row.total_paid, 0),
    [balances],
  );
  const openDebts = useMemo(
    () => balances.filter((b) => b.net_balance < -0.004).length,
    [balances],
  );
  const allSettled = balances.length > 0 && openDebts === 0;

  if (loading && balances.length === 0) {
    return <LoadingScreen label="Loading balances" />;
  }

  return (
    <>
      <Screen
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load();
        }}
      >
        <AppHeader title="Expenses" subtitle="Log bills, see who owes whom, settle up" />
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {/* Summary line */}
        <View
          style={{
            flexDirection: 'row',
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            paddingVertical: spacing.sm,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.caption, { color: colors.muted }]}>TOTAL SPENT</Text>
            <Text
              style={[type.heading, { color: colors.text, fontSize: 18 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatPkr(totalSpending)}
            </Text>
          </View>
          <View
            style={{ width: 1, backgroundColor: colors.border, marginHorizontal: spacing.md }}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.caption, { color: colors.muted }]}>OPEN DEBTS</Text>
            <Text
              style={[
                type.heading,
                {
                  color: allSettled ? colors.success : openDebts > 0 ? colors.danger : colors.text,
                  fontSize: 18,
                },
              ]}
            >
              {allSettled ? 'All square' : `${openDebts} member${openDebts === 1 ? '' : 's'}`}
            </Text>
          </View>
        </View>

        {/* Ledger */}
        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Household balances" />
          <BalanceSummaryTable
            balances={balances}
            members={members}
            activeMemberId={activeMemberId}
          />
          <CustomButton
            label="Settle up"
            icon="swap-horizontal"
            onPress={() => setSettleOpen(true)}
            disabled={members.length < 2}
          />
        </View>

        {/* Hour 3.5 (Option 1) */}
        <SmartSettleCard members={members} onSettled={() => void load()} />

        {/* Log expense */}
        <CustomCard>
          <SectionHeader title="Log shared expense" />
          <ExpenseForm members={members} onSuccess={() => void load()} />
        </CustomCard>
      </Screen>

      <SettleUpModal
        visible={settleOpen}
        onClose={() => setSettleOpen(false)}
        members={members}
        balances={balances}
        onSuccess={() => void load()}
      />
    </>
  );
}
