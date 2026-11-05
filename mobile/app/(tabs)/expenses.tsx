import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  BalanceSummaryTable,
  ExpenseForm,
  SettleUpModal,
  SmartSettleCard,
} from '../../src/components/household';
import { enterRise } from '../../src/components/household/motion';
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
  const { colors, spacing, type, radius } = useTheme();
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
        <AppHeader
          title="Expenses"
          subtitle="Log bills, see who owes whom, settle up"
          right={
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.full,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="wallet" size={22} color={colors.primary} />
            </View>
          }
        />
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {/* Summary strip */}
        <Animated.View entering={enterRise(0)} style={{ flexDirection: 'row', gap: spacing.sm }}>
          <CustomCard style={{ flex: 1 }}>
            <Text style={[type.caption, { color: colors.muted }]}>TOTAL SPENT</Text>
            <Text
              style={[type.heading, { color: colors.text, fontSize: 18 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatPkr(totalSpending)}
            </Text>
          </CustomCard>
          <CustomCard style={{ flex: 1 }} tone={allSettled ? 'soft' : 'default'}>
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
          </CustomCard>
        </Animated.View>

        {/* Ledger */}
        <Animated.View entering={enterRise(1)} style={{ gap: spacing.sm }}>
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
        </Animated.View>

        {/* Hour 3.5 (Option 1) */}
        <Animated.View entering={enterRise(2)}>
          <SmartSettleCard members={members} onSettled={() => void load()} />
        </Animated.View>

        {/* Log expense */}
        <Animated.View entering={enterRise(3)}>
          <CustomCard>
            <SectionHeader title="Log shared expense" />
            <ExpenseForm members={members} onSuccess={() => void load()} />
          </CustomCard>
        </Animated.View>
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
