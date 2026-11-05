import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CalendarCard } from '../../src/components/calendar/CalendarCard';
import {
  BudgetProgressBar,
  CategoryBreakdown,
  MemberSegmentedControl,
  NetBalanceCard,
} from '../../src/components/household';
import { Screen } from '../../src/components/layout/Screen';
import { LinkRoommateModal } from '../../src/components/onboarding/LinkRoommateModal';
import { CustomCard, ErrorState, LoadingScreen, QuickChipRow } from '../../src/components/ui';
import { useSession } from '../../src/features/auth/session';
import { householdApi, isUnavailable } from '../../src/services/api/household';
import { useHouseholdStore } from '../../src/store/household';
import { usePreferences } from '../../src/store/preferences';
import { showToast } from '../../src/store/toast';
import { useTheme } from '../../src/theme';
import type { BalanceRow, BudgetSummary, CategorySpending } from '../../src/types/household';
import { errorMessage, initials } from '../../src/utils/format';
import { monthLabel } from '../../src/utils/time';

export default function HomeScreen() {
  const { colors, spacing, type, minTapTarget, radius } = useTheme();
  const { members, activeMemberId, setActiveMemberId, loadMembers, membersError } =
    useHouseholdStore();
  const { isSignedIn } = useSession();
  const linkedMemberId = usePreferences((s) => s.linkedMemberId);
  const linkedMemberPromptDone = usePreferences((s) => s.linkedMemberPromptDone);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [categories, setCategories] = useState<CategorySpending[]>([]);
  const [categoriesUnavailable, setCategoriesUnavailable] = useState(true);
  const [recurringBusy, setRecurringBusy] = useState(false);

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
      setBudget(await householdApi.getBudgetSummary(spending));
      // Hour 3.5 (Option 3): optional; a 404/501 simply hides the section.
      try {
        setCategories(await householdApi.getCategoryBreakdown());
        setCategoriesUnavailable(false);
      } catch (err) {
        if (!isUnavailable(err)) throw err;
        setCategories([]);
        setCategoriesUnavailable(true);
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
  const showLinkPrompt =
    isSignedIn && !linkedMemberId && !linkedMemberPromptDone && members.length > 0 && !loading;

  async function applyRecurring() {
    if (recurringBusy) return;
    setRecurringBusy(true);
    try {
      const result = await householdApi.applyRecurringExpenses();
      showToast(
        result.created > 0
          ? `Posted ${result.created} recurring bill${result.created === 1 ? '' : 's'} for ${monthLabel()}.`
          : 'No recurring bills to post this month.',
        result.created > 0 ? 'success' : 'info',
      );
      await loadDashboard();
    } catch (err) {
      showToast(
        isUnavailable(err)
          ? 'Recurring bills are not enabled on the server yet.'
          : errorMessage(err, 'Could not generate recurring bills.'),
        isUnavailable(err) ? 'info' : 'danger',
      );
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text accessibilityRole="header" style={[type.title, { color: colors.text }]}>
            GharSplit
          </Text>
          <Text style={[type.body, { color: colors.muted }]}>Shared flat · Lahore</Text>
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="link"
            accessibilityLabel="Manage flat members"
            style={{ minHeight: minTapTarget, justifyContent: 'center' }}
          >
            <Text style={[type.label, { color: colors.primary, fontSize: 14 }]}>Manage flat members</Text>
          </Pressable>
        </View>
        <HeaderButton
          label={isSignedIn ? 'Profile' : 'Sign in'}
          onPress={() => router.push(isSignedIn ? '/profile' : '/settings')}
          content={
            linkedMember ? (
              <Text style={[type.label, { color: colors.primary }]}>
                {initials(linkedMember.name)}
              </Text>
            ) : (
              <Ionicons
                name={isSignedIn ? 'person' : 'person-outline'}
                size={20}
                color={colors.text}
              />
            )
          }
          active={Boolean(linkedMember)}
        />
        <HeaderButton
          label="Settings"
          onPress={() => router.push('/settings')}
          content={<Ionicons name="settings-outline" size={20} color={colors.text} />}
        />
      </View>

      {error || membersError ? (
        <ErrorState
          message={error ?? membersError ?? 'Something went wrong.'}
          onRetry={() => void loadDashboard()}
        />
      ) : null}

      <CustomCard>
        <QuickChipRow
          label="Quick actions"
          options={[
            { id: 'settle', label: 'Settle up', icon: 'swap-horizontal-outline' },
            { id: 'bill', label: 'Add bill', icon: 'receipt-outline' },
            { id: 'shop', label: 'Shopping', icon: 'cart-outline' },
          ]}
          onSelect={(id) => {
            if (id === 'settle') {
              router.push('/(tabs)/expenses');
              showToast('Tap Settle up on Expenses.', 'info');
            } else if (id === 'bill') {
              router.push('/(tabs)/expenses');
              showToast('Open Add shared expense below balances.', 'info');
            } else {
              router.push('/(tabs)/shopping');
            }
          }}
        />
      </CustomCard>

      {/* Member switcher */}
      {members.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
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
        </View>
      ) : null}

      {/* Net balance */}
      <NetBalanceCard member={activeMember} balance={activeBalance} />

      {/* Budget line */}
      {budget ? (
        <View style={{ paddingHorizontal: spacing.xs, paddingTop: spacing.xs }}>
          <BudgetProgressBar budget={budget} periodLabel={monthLabel()} />
        </View>
      ) : null}

      {/* Calendar */}
      <CalendarCard variant="home" onOpenFull={() => router.push('/calendar')} />

      {/* Pending shopping */}
      <Pressable
        onPress={() => router.push('/(tabs)/shopping')}
        accessibilityRole="button"
        accessibilityLabel={`${pendingCount} pending shopping items. Open shopping list`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: minTapTarget + 8,
          paddingVertical: spacing.sm,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons
          name="cart-outline"
          size={22}
          color={pendingCount > 0 ? colors.warning : colors.muted}
        />
        <View style={{ flex: 1 }}>
          <Text style={[type.label, { color: colors.text, fontSize: 15 }]}>Shopping list</Text>
          <Text style={[type.body, { color: colors.muted, fontSize: 14 }]}>
            {pendingCount === 0
              ? 'Nothing pending'
              : `${pendingCount} pending item${pendingCount === 1 ? '' : 's'}`}
          </Text>
        </View>
        {pendingCount > 0 ? (
          <Text style={[type.heading, { color: colors.warning, fontSize: 18 }]}>
            {pendingCount}
          </Text>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      {/* Tools: plain rows, not cards */}
      <View>
        <ToolRow
          icon="sparkles-outline"
          title="Finance Assistant"
          body="Ask GharSplit AI about balances and budget"
          onPress={() => router.push('/assistant')}
        />
        <ToolRow
          icon="mic-outline"
          title="Voice assistant"
          body="Speak about expenses and splits"
          onPress={() => router.push('/voice-coach')}
        />
        <ToolRow
          icon="pulse-outline"
          title="Flat feed"
          body="Everything logged on this phone"
          onPress={() => router.push('/household-feed')}
        />
        <ToolRow
          icon="repeat"
          title="Post monthly recurring bills"
          body="Re-post internet, maid salary and other fixed bills"
          onPress={() => void applyRecurring()}
          busy={recurringBusy}
          last
        />
      </View>

      {/* Hour 3.5 (Option 3): shown only once the server exposes it */}
      {categoriesUnavailable ? null : (
        <CategoryBreakdown categories={categories} monthlyBudget={budget?.monthly_budget ?? 0} />
      )}

      <LinkRoommateModal
        visible={showLinkPrompt}
        members={members}
        onClose={() => usePreferences.getState().setLinkedMemberPromptDone(true)}
      />
    </Screen>
  );
}

function HeaderButton({
  label,
  onPress,
  content,
  active,
}: {
  label: string;
  onPress: () => void;
  content: React.ReactNode;
  active?: boolean;
}) {
  const { colors, minTapTarget, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: minTapTarget,
        height: minTapTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: colors.card,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {content}
    </Pressable>
  );
}

function ToolRow({
  icon,
  title,
  body,
  onPress,
  busy,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  onPress: () => void;
  busy?: boolean;
  last?: boolean;
}) {
  const { colors, spacing, type, minTapTarget } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ busy: !!busy, disabled: !!busy }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: minTapTarget + 8,
        paddingVertical: spacing.sm,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
        opacity: busy ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
      <View style={{ flex: 1 }}>
        <Text style={[type.label, { color: colors.text, fontSize: 15 }]}>{title}</Text>
        <Text style={[type.body, { color: colors.muted, fontSize: 14 }]} numberOfLines={1}>
          {busy ? 'Posting…' : body}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}
