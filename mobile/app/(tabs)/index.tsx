import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  ActivityRow,
  BudgetProgressBar,
  CategoryBreakdown,
  MemberSegmentedControl,
  NetBalanceCard,
} from '../../src/components/household';
import { enterRise } from '../../src/components/household/motion';
import { Screen } from '../../src/components/layout/Screen';
import { LinkRoommateModal } from '../../src/components/onboarding/LinkRoommateModal';
import {
  CustomButton,
  CustomCard,
  ErrorState,
  LoadingScreen,
  StatusPill,
} from '../../src/components/ui';
import { useSession } from '../../src/features/auth/session';
import { householdApi, isUnavailable } from '../../src/services/api/household';
import { useActivityFeed } from '../../src/store/activityFeed';
import { useHouseholdStore } from '../../src/store/household';
import { usePreferences } from '../../src/store/preferences';
import { useTheme } from '../../src/theme';
import type { BalanceRow, BudgetSummary, CategorySpending } from '../../src/types/household';
import { errorMessage, initials } from '../../src/utils/format';
import { monthLabel } from '../../src/utils/time';

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
  const { isSignedIn } = useSession();
  const linkedMemberId = usePreferences((s) => s.linkedMemberId);
  const linkedMemberPromptDone = usePreferences((s) => s.linkedMemberPromptDone);
  const events = useActivityFeed((s) => s.events);
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
  const linkedMember = useMemo(
    () => members.find((m) => m.id === linkedMemberId),
    [members, linkedMemberId],
  );
  const recentEvents = useMemo(() => events.slice(0, 3), [events]);
  const showLinkPrompt =
    isSignedIn && !linkedMemberId && !linkedMemberPromptDone && members.length > 0 && !loading;

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
            {greeting().toUpperCase()}
            {linkedMember ? `, ${linkedMember.name.toUpperCase()}` : ''} ·{' '}
            {monthLabel().toUpperCase()}
          </Text>
          <Text accessibilityRole="header" style={[type.title, { color: colors.text }]}>
            GharSplit
          </Text>
          <Text style={[type.body, { color: colors.muted }]}>Shared flat · Lahore</Text>
        </View>
        <Pressable
          onPress={() => router.push(isSignedIn ? '/profile' : '/settings')}
          accessibilityRole="button"
          accessibilityLabel={isSignedIn ? 'Profile' : 'Sign in'}
          style={({ pressed }) => ({
            minHeight: minTapTarget,
            minWidth: minTapTarget,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.full,
            backgroundColor: isSignedIn ? colors.primarySoft : colors.card,
            borderWidth: 1,
            borderColor: isSignedIn ? colors.primary : colors.border,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          {linkedMember ? (
            <Text style={[type.label, { color: colors.primary }]}>
              {initials(linkedMember.name)}
            </Text>
          ) : (
            <Ionicons
              name={isSignedIn ? 'person' : 'person-outline'}
              size={20}
              color={isSignedIn ? colors.primary : colors.text}
            />
          )}
        </Pressable>
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
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={[type.label, { color: colors.muted }]}>Viewing as</Text>
            {linkedMember && linkedMember.id !== activeMemberId ? (
              <Pressable
                onPress={() => setActiveMemberId(linkedMember.id)}
                accessibilityRole="button"
                accessibilityLabel={`Back to ${linkedMember.name}`}
                hitSlop={8}
              >
                <Text style={[type.caption, { color: colors.primary }]}>
                  Back to me ({linkedMember.name})
                </Text>
              </Pressable>
            ) : null}
          </View>
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

      {/* Quick actions */}
      <Animated.View entering={enterRise(3)} style={{ flexDirection: 'row', gap: spacing.sm }}>
        <QuickAction
          icon="sparkles"
          title="Finance Assistant"
          body="Ask GharSplit AI about balances"
          onPress={() => router.push('/assistant')}
          accent
        />
        <QuickAction
          icon="pulse-outline"
          title="Flat feed"
          body={
            recentEvents.length > 0
              ? `${events.length} recent event${events.length === 1 ? '' : 's'}`
              : 'Activity timeline'
          }
          onPress={() => router.push('/household-feed')}
        />
      </Animated.View>

      {/* Recent activity */}
      <Animated.View entering={enterRise(3)}>
        <CustomCard>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={[type.heading, { color: colors.text, fontSize: 18 }]}>
              Recent activity
            </Text>
            <Pressable
              onPress={() => router.push('/household-feed')}
              accessibilityRole="button"
              accessibilityLabel="See all activity"
              hitSlop={8}
              style={{ minHeight: 32, justifyContent: 'center' }}
            >
              <Text style={[type.label, { color: colors.primary }]}>See all</Text>
            </Pressable>
          </View>
          {recentEvents.length === 0 ? (
            <Text style={[type.body, { color: colors.muted, fontSize: 14 }]}>
              Checkouts, bills and settlements you log on this phone show up here.
            </Text>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {recentEvents.map((event) => (
                <ActivityRow key={event.id} event={event} compact />
              ))}
            </View>
          )}
        </CustomCard>
      </Animated.View>

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

      <LinkRoommateModal
        visible={showLinkPrompt}
        members={members}
        onClose={() => usePreferences.getState().setLinkedMemberPromptDone(true)}
      />
    </Screen>
  );
}

function QuickAction({
  icon,
  title,
  body,
  onPress,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  onPress: () => void;
  accent?: boolean;
}) {
  const { colors, spacing, type, radius } = useTheme();
  return (
    <CustomCard
      onPress={onPress}
      accessibilityLabel={title}
      tone={accent ? 'hero' : 'default'}
      style={{ flex: 1 }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          backgroundColor: accent ? 'rgba(255,255,255,0.14)' : colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={18} color={accent ? colors.heroText : colors.primary} />
      </View>
      <View style={{ gap: 2, marginTop: spacing.xs }}>
        <Text
          style={[type.label, { color: accent ? colors.heroText : colors.text, fontSize: 15 }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={[
            type.caption,
            { color: accent ? colors.heroText : colors.muted, opacity: accent ? 0.85 : 1 },
          ]}
          numberOfLines={2}
        >
          {body}
        </Text>
      </View>
    </CustomCard>
  );
}
