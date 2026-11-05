import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { BalanceSummaryTable, ExpenseForm, SettleUpModal } from '../../src/components/household';
import { Screen } from '../../src/components/layout/Screen';
import { AppHeader, CustomButton, CustomCard, ErrorState, LoadingScreen, SectionHeader } from '../../src/components/ui';
import { householdApi } from '../../src/services/api/household';
import { useHouseholdStore } from '../../src/store/household';
import { useTheme } from '../../src/theme';
import type { BalanceRow } from '../../src/types/household';
import { errorMessage } from '../../src/utils/format';

export default function ExpensesScreen() {
  const { colors, spacing, type } = useTheme();
  const { members, loadMembers } = useHouseholdStore();
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

  if (loading && balances.length === 0) {
    return <LoadingScreen />;
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
        <AppHeader title="Expenses" subtitle="Log bills, view balances, settle up" />
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        <ExpenseForm members={members} onSuccess={() => void load()} />

        <CustomButton label="Settle up" onPress={() => setSettleOpen(true)} />

        <BalanceSummaryTable balances={balances} members={members} />

        <CustomCard>
          <SectionHeader title="Smart Settle (Hour 3.5)" />
          <Text style={[type.body, { color: colors.muted, marginBottom: spacing.sm }]}>
            Organizer surprise task will add optimized payment suggestions here.
          </Text>
          <CustomButton label="Coming soon" onPress={() => undefined} disabled />
        </CustomCard>
      </Screen>

      <SettleUpModal
        visible={settleOpen}
        onClose={() => setSettleOpen(false)}
        members={members}
        onSuccess={() => void load()}
      />
    </>
  );
}
