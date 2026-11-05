import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  BudgetProgressBar,
  CategoryBreakdown,
  MemberSegmentedControl,
  NetBalanceCard,
} from '../../src/components/household';
import { enterRise } from '../../src/components/household/motion';
import { Screen } from '../../src/components/layout/Screen';
import {
  CustomButton,
  CustomCard,
  ErrorState,
  LoadingScreen,
  StatusPill,
} from '../../src/components/ui';
import { householdApi, isUnavailable } from '../../src/services/api/household';
import { useHouseholdStore } from '../../src/store/household';
import { useTheme } from '../../src/theme';
import type { BalanceRow, BudgetSummary, CategorySpending } from '../../src/types/household';
import { errorMessage } from '../../src/utils/format';

function monthLabel(date = new Date()): string {
  return date.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
}

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { colors, spacing, type, minTapTarget, radius } = useTheme();
  const { members, activeMemberId, setActiveMemberId, loadMembers, membersError } =
    useHouseholdStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [categories, setCategories] = useState<CategorySpending[]>([]);
  const [categoriesUnavailable, setCategoriesUnavailable] = useState(false);
  const [recurringBusy, setRecurringBusy] = useState(false);
  const [recurringNotice, setRecurringNotice] = useState<{
    tone: 'success' | 'neutral' | 'danger';
    text: string;
  } | null>(null);

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
      // Hour 3.5 (Option 3): optional; a 404/501 just hides the numbers.
      try {
        setCategories(await householdApi.getCategoryBreakdown());
        setCategoriesUnavailable(false);
      } catch (err) {
        if (isUnavailable(err)) {
          setCategories([]);
          setCategoriesUnavailable(true);
        } else {
          throw err;
        }
      }
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

  const activeMember = useMemo(
    () => members.find((m) => m.id === activeMemberId),
    [members, activeMemberId],
  );
  const activeBalance = useMemo(
    () => balances.find((b) => b.member_id === activeMemberId),
    [balances, activeMemberId],
  );

  async function applyRecurring() {
    if (recurringBusy) return;
    setRecurringBusy(true);
    setRecurringNotice(null);
    try {
      const result = await householdApi.applyRecurringExpenses();
      setRecurringNotice({
        tone: 'success',
        text:
          result.created > 0
            ? `Posted ${result.created} recurring bill${result.created === 1 ? '' : 's'} for ${monthLabel()}.`
            : 'No recurring bills to post this month.',
      });
      await loadDashboard();
    } catch (err) {
      if (isUnavailable(err))
        setRecurringNotice({
          tone: 'neutral',
          text: 'Recurring bills are not enabled on the server yet.',
        });
      else
        setRecurringNotice({
          tone: 'danger',
          text: errorMessage(err, 'Could not generate recurring bills.'),
        });
    } finally {
      setRecurringBusy(false);
    }
  }

  if (loading && !budget) {
    return <LoadingScreen label="Loading household" />;
  }

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void loadDashboard();
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[type.caption, { color: colors.muted }]}>
            {greeting().toUpperCase()} · LAHORE
          </Text>
          <Text accessibilityRole="header" style={[type.title, { color: colors.text }]}>
            Shared Living
          </Text>
          <Text style={[type.body, { color: colors.muted }]}>{monthLabel()}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={({ pressed }) => ({
            minHeight: minTapTarget,
            minWidth: minTapTarget,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.full,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      {error || membersError ? (
        <ErrorState
          message={error ?? membersError ?? 'Something went wrong.'}
          onRetry={() => void loadDashboard()}
        />
      ) : null}

      {/* Viewing as */}
      {members.length > 0 ? (
        <Animated.View entering={enterRise(0)} style={{ gap: spacing.sm }}>
          <Text style={[type.label, { color: colors.muted }]}>Viewing as</Text>
          <MemberSegmentedControl
            members={members}
            activeMemberId={activeMemberId}
            onSelect={setActiveMemberId}
          />
        </Animated.View>
      ) : null}

      {/* Hero */}
      <Animated.View entering={enterRise(1)}>
        <NetBalanceCard member={activeMember} balance={activeBalance} />
      </Animated.View>

      {/* Budget */}
      {budget ? (
        <Animated.View entering={enterRise(2)}>
          <CustomCard>
            <BudgetProgressBar budget={budget} periodLabel={monthLabel()} />
          </CustomCard>
        </Animated.View>
      ) : null}

      {/* Quick row: shopping + recurring */}
      <Animated.View entering={enterRise(3)} style={{ gap: spacing.md }}>
        <CustomCard
          onPress={() => router.push('/(tabs)/shopping')}
          accessibilityLabel={`${pendingCount} pending shopping items. Open shopping list`}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.lg,
                backgroundColor: pendingCount > 0 ? colors.warningSoft : colors.successSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name="cart-outline"
                size={22}
                color={pendingCount > 0 ? colors.warning : colors.success}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[type.label, { color: colors.text, fontSize: 15 }]}>Shopping list</Text>
              <Text style={[type.body, { color: colors.muted, fontSize: 14 }]}>
                {pendingCount === 0
                  ? 'Nothing pending. Nice.'
                  : `${pendingCount} pending item${pendingCount === 1 ? '' : 's'} waiting`}
              </Text>
            </View>
            {pendingCount > 0 ? (
              <StatusPill label={String(pendingCount)} tone="warning" size="sm" />
            ) : null}
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </View>
        </CustomCard>

        {/* Hour 3.5 (Option 4) */}
        <CustomCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.lg,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="repeat" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[type.label, { color: colors.text, fontSize: 15 }]}>
                Recurring bills
              </Text>
              <Text style={[type.body, { color: colors.muted, fontSize: 14 }]}>
                Re-post internet, maid salary and other fixed bills.
              </Text>
            </View>
          </View>
          <CustomButton
            label="Generate monthly recurring bills"
            icon="calendar-outline"
            variant="secondary"
            onPress={() => void applyRecurring()}
            loading={recurringBusy}
            disabled={recurringBusy}
          />
          {recurringNotice ? (
            <Text
              style={[
                type.caption,
                {
                  color:
                    recurringNotice.tone === 'success'
                      ? colors.success
                      : recurringNotice.tone === 'danger'
                        ? colors.danger
                        : colors.muted,
                },
              ]}
            >
              {recurringNotice.text}
            </Text>
          ) : null}
        </CustomCard>
      </Animated.View>

      {/* Hour 3.5 (Option 3): hidden until the server exposes the endpoint, so the demo never shows an unfinished block. */}
      {categoriesUnavailable ? null : (
        <Animated.View entering={enterRise(4)}>
          <CategoryBreakdown categories={categories} monthlyBudget={budget?.monthly_budget ?? 0} />
        </Animated.View>
      )}
    </Screen>
  );
}
