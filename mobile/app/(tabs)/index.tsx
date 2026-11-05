import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  BudgetProgressBar,
  MemberSegmentedControl,
  NetBalanceCard,
} from '../../src/components/household';
import { Screen } from '../../src/components/layout/Screen';
import { AppHeader, CustomCard, ErrorState, LoadingScreen } from '../../src/components/ui';
import { householdApi } from '../../src/services/api/household';
import { useHouseholdStore } from '../../src/store/household';
import { useTheme } from '../../src/theme';
import type { BalanceRow, BudgetSummary } from '../../src/types/household';
import { errorMessage } from '../../src/utils/format';

export default function HomeScreen() {
  const { colors, spacing, type, minTapTarget } = useTheme();
  const { members, activeMemberId, setActiveMemberId, loadMembers, membersError } = useHouseholdStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const loadDashboard = useCallback(async () => {
    setError(null);
    try {
      await loadMembers(true);
      const [balanceRows, pendingItems] = await Promise.all([
        householdApi.getBalances(),
        householdApi.getShopping('pending'),
      ]);
      setBalances(balanceRows);
      setPendingCount(pendingItems.length);
      const spending = balanceRows.reduce((sum, row) => sum + row.total_paid, 0);
      const summary = await householdApi.getBudgetSummary(spending);
      setBudget(summary);
    } catch (err) {
      setError(errorMessage(err, 'Could not load dashboard.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadMembers]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const activeMember = useMemo(() => members.find((m) => m.id === activeMemberId), [members, activeMemberId]);
  const activeBalance = useMemo(
    () => balances.find((b) => b.member_id === activeMemberId),
    [balances, activeMemberId],
  );

  if (loading && !budget) {
    return <LoadingScreen />;
  }

  return (
    <Screen refreshing={refreshing} onRefresh={() => {
      setRefreshing(true);
      void loadDashboard();
    }}>
      <AppHeader
        title="Shared Living"
        subtitle="Household dashboard"
        right={
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={{ minHeight: minTapTarget, minWidth: minTapTarget, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </Pressable>
        }
      />
      {error || membersError ? (
        <ErrorState message={error ?? membersError ?? 'Something went wrong.'} onRetry={() => void loadDashboard()} />
      ) : null}
      {members.length > 0 ? (
        <>
          <Text style={[type.label, { color: colors.text }]}>Viewing as</Text>
          <MemberSegmentedControl members={members} activeMemberId={activeMemberId} onSelect={setActiveMemberId} />
        </>
      ) : null}
      {budget ? (
        <CustomCard>
          <BudgetProgressBar budget={budget} />
        </CustomCard>
      ) : null}
      <NetBalanceCard member={activeMember} balance={activeBalance} />
      <CustomCard>
        <Text style={[type.label, { color: colors.text }]}>Shopping</Text>
        <Text style={[type.body, { color: colors.muted, marginTop: spacing.xs }]}>
          {pendingCount} pending item{pendingCount === 1 ? '' : 's'} on the list
        </Text>
      </CustomCard>
    </Screen>
  );
}
