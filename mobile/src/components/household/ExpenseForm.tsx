import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CustomButton, InputField, StatusPill } from '../ui';
import { expenseSchema } from '../../features/household/schemas';
import { householdApi } from '../../services/api/household';
import { useTheme } from '../../theme';
import { EXPENSE_CATEGORIES, type Member, type SplitType } from '../../types/household';
import { formatPkr } from '../../utils/currency';
import { errorMessage } from '../../utils/format';
import { MemberSegmentedControl, MemberToggleChips } from './MemberSegmentedControl';
import { enterFade, layoutSpring } from './motion';

interface ExpenseFormProps {
  members: Member[];
  onSuccess: () => void;
}

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Groceries: 'basket-outline',
  Utilities: 'flash-outline',
  Entertainment: 'game-controller-outline',
  Cleaning: 'sparkles-outline',
};

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ExpenseForm({ members, onSuccess }: ExpenseFormProps) {
  const { colors, spacing, type, radius, minTapTarget } = useTheme();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [otherCategory, setOtherCategory] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [amount, setAmount] = useState('');
  // `null` means "not chosen yet": defaults are derived from `members` during render,
  // so the form needs no effect to sync when members arrive from the API.
  const [chosenPayerId, setPayerId] = useState<string | null>(null);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [chosenEqualIds, setEqualMemberIds] = useState<string[] | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [isRecurring, setIsRecurring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const defaultPayerId = members.find((m) => m.id === 'M01')?.id ?? members[0]?.id ?? null;
  const payerId = chosenPayerId ?? defaultPayerId;
  const equalMemberIds = useMemo(
    () => chosenEqualIds ?? members.map((m) => m.id),
    [chosenEqualIds, members],
  );

  const effectiveCategory = otherCategory ? customCategory : category;

  // Running total for the custom split (display only; the server validates again).
  const amountNumber = Number(amount);
  const assigned = useMemo(
    () => members.reduce((sum, m) => sum + (Number(customAmounts[m.id]) || 0), 0),
    [members, customAmounts],
  );
  const remaining =
    Number.isFinite(amountNumber) && amount.trim() !== ''
      ? Math.round((amountNumber - assigned) * 100) / 100
      : null;

  function toggleEqualMember(id: string) {
    setEqualMemberIds(
      equalMemberIds.includes(id)
        ? equalMemberIds.filter((x) => x !== id)
        : [...equalMemberIds, id],
    );
  }

  function resetForm() {
    setTitle('');
    setAmount('');
    setCustomCategory('');
    setOtherCategory(false);
    setCategory(EXPENSE_CATEGORIES[0]);
    setIsRecurring(false);
    setCustomAmounts({});
    setEqualMemberIds(null);
    setSplitType('equal');
  }

  async function submit() {
    if (loading) return;
    const custom_splits = members.map((m) => ({
      member_id: m.id,
      amount: Number(customAmounts[m.id] || 0),
    }));
    const parsed = expenseSchema.safeParse({
      title,
      category: effectiveCategory,
      date,
      amount,
      payer_id: payerId ?? '',
      split_type: splitType,
      equal_member_ids: equalMemberIds,
      custom_splits,
      is_recurring: isRecurring,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = parsed.data;
      await householdApi.createExpense({
        title: data.title,
        category: data.category,
        amount: data.amount,
        payer_id: data.payer_id,
        split_type: data.split_type,
        date: data.date,
        split_members: data.split_type === 'equal' ? data.equal_member_ids : undefined,
        splits:
          data.split_type === 'custom'
            ? data.custom_splits.filter((row) => row.amount > 0)
            : undefined,
        ...(data.is_recurring ? { is_recurring: true } : {}),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      onSuccess();
    } catch (err) {
      setError(errorMessage(err, 'Could not save expense.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      <InputField
        label="What was it for?"
        value={title}
        onChangeText={setTitle}
        placeholder="Internet bill"
        returnKeyType="next"
      />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1.2 }}>
          <InputField
            label="Amount"
            prefix="PKR"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="1500.00"
          />
        </View>
        <View style={{ flex: 1 }}>
          <InputField
            label="Date"
            value={date}
            onChangeText={setDate}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            placeholder="YYYY-MM-DD"
          />
        </View>
      </View>

      {/* Category chips */}
      <View style={{ gap: spacing.sm }}>
        <Text style={[type.label, { color: colors.text }]}>Category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {EXPENSE_CATEGORIES.map((c) => {
            const active = !otherCategory && category === c;
            return (
              <Chip
                key={c}
                label={c}
                icon={CATEGORY_ICON[c]}
                active={active}
                onPress={() => {
                  setOtherCategory(false);
                  setCategory(c);
                }}
              />
            );
          })}
          <Chip
            label="Other"
            icon="ellipsis-horizontal-circle-outline"
            active={otherCategory}
            onPress={() => setOtherCategory(true)}
          />
        </View>
        {otherCategory ? (
          <Animated.View entering={enterFade}>
            <InputField
              label="Custom category"
              value={customCategory}
              onChangeText={setCustomCategory}
              placeholder="Dining out"
              autoCapitalize="words"
            />
          </Animated.View>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={[type.label, { color: colors.text }]}>Paid by</Text>
        <MemberSegmentedControl
          members={members}
          activeMemberId={payerId}
          onSelect={setPayerId}
          compact
        />
      </View>

      {/* Split strategy */}
      <View style={{ gap: spacing.sm }}>
        <Text style={[type.label, { color: colors.text }]}>Split</Text>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: 4,
          }}
        >
          {(['equal', 'custom'] as const).map((mode) => {
            const active = splitType === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setSplitType(mode)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  minHeight: 40,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? colors.card : 'transparent',
                  borderWidth: active ? 1 : 0,
                  borderColor: colors.border,
                }}
              >
                <Text style={[type.label, { color: active ? colors.text : colors.muted }]}>
                  {mode === 'equal' ? 'Equal split' : 'Custom shares'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Animated.View
          layout={layoutSpring}
          key={splitType}
          entering={enterFade}
          style={{ gap: spacing.sm }}
        >
          {splitType === 'equal' ? (
            <>
              <MemberToggleChips
                members={members}
                selectedIds={equalMemberIds}
                onToggle={toggleEqualMember}
                compact
              />
              <Text style={[type.caption, { color: colors.muted }]}>
                {equalMemberIds.length > 0
                  ? `Shared equally across ${equalMemberIds.length}. Leftover paisa goes to the lowest member ID first.`
                  : 'Select at least one member.'}
              </Text>
            </>
          ) : (
            <>
              {members.map((member) => (
                <InputField
                  key={member.id}
                  label={`${member.name}'s share`}
                  prefix="PKR"
                  value={customAmounts[member.id] ?? ''}
                  onChangeText={(v) => setCustomAmounts((prev) => ({ ...prev, [member.id]: v }))}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              ))}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: remaining === 0 ? colors.successSoft : colors.surface,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm + 2,
                }}
              >
                <Text style={[type.label, { color: colors.text }]}>Remaining to assign</Text>
                <Text
                  style={[
                    type.label,
                    {
                      color:
                        remaining === null
                          ? colors.muted
                          : remaining === 0
                            ? colors.success
                            : colors.danger,
                    },
                  ]}
                >
                  {remaining === null ? 'Enter amount first' : formatPkr(remaining)}
                </Text>
              </View>
            </>
          )}
        </Animated.View>
      </View>

      {/* Recurring (Hour 3.5 · Option 4) */}
      <Pressable
        onPress={() => setIsRecurring((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isRecurring }}
        accessibilityLabel="Mark as monthly recurring bill"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: minTapTarget,
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: isRecurring ? colors.primary : colors.muted,
            backgroundColor: isRecurring ? colors.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isRecurring ? <Ionicons name="checkmark" size={16} color={colors.primaryText} /> : null}
        </View>
        <Text style={[type.body, { color: colors.text, flex: 1 }]}>
          Mark as monthly recurring bill
        </Text>
        {isRecurring ? <StatusPill label="Monthly" tone="primary" size="sm" icon="repeat" /> : null}
      </Pressable>

      {error ? (
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            alignItems: 'center',
            backgroundColor: colors.dangerSoft,
            borderRadius: radius.md,
            padding: spacing.sm + 2,
          }}
        >
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <Text style={[type.label, { color: colors.danger, flex: 1 }]}>{error}</Text>
        </View>
      ) : null}

      <CustomButton
        label="Save expense"
        icon="add-circle-outline"
        onPress={() => void submit()}
        loading={loading}
        disabled={loading}
      />
    </View>
  );
}

function Chip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, type, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 40,
        paddingHorizontal: spacing.sm + 4,
        borderRadius: radius.full,
        borderWidth: 1.5,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primarySoft : colors.card,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {icon ? (
        <Ionicons name={icon} size={15} color={active ? colors.primary : colors.muted} />
      ) : null}
      <Text style={[type.label, { color: active ? colors.primary : colors.text }]}>{label}</Text>
    </Pressable>
  );
}
