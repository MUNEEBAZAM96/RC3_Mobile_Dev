import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AmountChipRow, CustomButton, InputField, QuickChipRow, StatusPill } from '../ui';
import { DateQuickPick } from './DateQuickPick';
import {
  pickExpenseProofFromCamera,
  pickExpenseProofFromLibrary,
  uriToBase64,
  type ExpenseProofMime,
} from '../../features/household/expenseProof';
import { expenseSchema } from '../../features/household/schemas';
import {
  CUSTOM_SPLIT_TEMPLATES,
  EXPENSE_AMOUNT_CHIPS,
  EXPENSE_TITLE_PRESETS,
} from '../../features/household/presets';
import { ApiError, householdApi } from '../../services/api/household';
import { pushEvent } from '../../store/activityFeed';
import { clampDueDay, upsertRecurringTemplate } from '../../store/recurringSchedule';
import { showToast } from '../../store/toast';
import { useTheme } from '../../theme';
import { EXPENSE_CATEGORIES, type Member, type SplitType } from '../../types/household';
import { formatPkr } from '../../utils/currency';
import { errorMessage } from '../../utils/format';
import { previewEqualSplit } from '../../utils/splitPreview';
import { todayIso } from '../../utils/time';
import { MemberSegmentedControl, MemberToggleChips } from './MemberSegmentedControl';
import { enterFade, layoutSpring } from './motion';
import { SplitPreviewRow } from './SplitPreviewRow';

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

const TITLE_PRESET_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  grocery: 'basket-outline',
  cleaning: 'sparkles-outline',
  internet: 'wifi-outline',
  electricity: 'flash-outline',
  gas: 'flame-outline',
  maid: 'person-outline',
};

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
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [proofMime, setProofMime] = useState<ExpenseProofMime | null>(null);
  const [proofUploading, setProofUploading] = useState(false);

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
  const equalPreview = useMemo(
    () =>
      splitType === 'equal' && Number.isFinite(amountNumber) && amountNumber > 0
        ? previewEqualSplit(amountNumber, equalMemberIds)
        : [],
    [splitType, amountNumber, equalMemberIds],
  );

  function toggleEqualMember(id: string) {
    setEqualMemberIds(
      equalMemberIds.includes(id)
        ? equalMemberIds.filter((x) => x !== id)
        : [...equalMemberIds, id],
    );
  }

  function applyTitlePreset(presetId: string) {
    const preset = EXPENSE_TITLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setTitle(preset.title);
    if (preset.category) {
      setOtherCategory(false);
      setCategory(preset.category);
    }
    if (preset.amount !== undefined) setAmount(String(preset.amount));
  }

  function applyCustomTemplate(templateId: string) {
    const template = CUSTOM_SPLIT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setSplitType('custom');
    setAmount(String(template.totalAmount));
    const next: Record<string, string> = {};
    for (const m of members) next[m.id] = '';
    for (const share of template.shares) {
      if (members.some((m) => m.id === share.member_id)) {
        next[share.member_id] = String(share.amount);
      }
    }
    setCustomAmounts(next);
  }

  function fillEqualIntoCustomFields() {
    const total = Number(amount);
    if (!Number.isFinite(total) || total <= 0) return;
    const ids = members.map((m) => m.id);
    const preview = previewEqualSplit(total, ids);
    const next: Record<string, string> = {};
    for (const row of preview) next[row.member_id] = String(row.amount);
    setCustomAmounts(next);
    setSplitType('custom');
  }

  function fillRemainderFor(memberId: string) {
    if (remaining === null || remaining <= 0) return;
    const current = Number(customAmounts[memberId]) || 0;
    setCustomAmounts((prev) => ({
      ...prev,
      [memberId]: String(Math.round((current + remaining) * 100) / 100),
    }));
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
    setProofUri(null);
    setProofMime(null);
  }

  async function attachProof(from: 'camera' | 'library') {
    const picked =
      from === 'camera' ? await pickExpenseProofFromCamera() : await pickExpenseProofFromLibrary();
    if (!picked) return;
    setProofUri(picked.uri);
    setProofMime(picked.mimeType);
  }

  async function submit() {
    if (loading || proofUploading) return;
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
      const created = await householdApi.createExpense({
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

      if (proofUri && proofMime) {
        setProofUploading(true);
        try {
          const image_base64 = await uriToBase64(proofUri);
          await householdApi.uploadExpenseProof(created.id, {
            mime_type: proofMime,
            image_base64,
          });
        } catch (proofErr) {
          const hint =
            proofErr instanceof ApiError && proofErr.status === 503
              ? ' Proof upload is not configured on the server.'
              : '';
          showToast(`Expense saved; proof upload failed.${hint}`);
        } finally {
          setProofUploading(false);
        }
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const payerName = members.find((m) => m.id === data.payer_id)?.name;
      if (data.is_recurring) {
        // The API ignores is_recurring today; remember the due day locally so the calendar can show it.
        const dueDay = Number(data.date.slice(-2));
        upsertRecurringTemplate({
          title: data.title,
          amount: data.amount,
          payerName: payerName ?? data.payer_id,
          payerId: data.payer_id,
          dayOfMonth: clampDueDay(dueDay),
        });
      }
      pushEvent({
        type: 'expense',
        title: `${data.title} · ${data.category}${data.is_recurring ? ' · monthly' : ''}`,
        amount: data.amount,
        memberName: payerName,
      });
      showToast(
        `Saved. ${formatPkr(data.amount)} split ${data.split_type === 'equal' ? 'equally' : 'by custom shares'}.`,
      );
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
      <QuickChipRow
        label="Quick bills"
        options={EXPENSE_TITLE_PRESETS.map((p) => ({
          id: p.id,
          label: p.title,
          icon: TITLE_PRESET_ICON[p.id] ?? 'receipt-outline',
          sublabel: p.amount ? `PKR ${p.amount}` : undefined,
        }))}
        onSelect={applyTitlePreset}
      />

      <InputField
        label="Amount"
        prefix="PKR"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="1500.00"
      />
      <AmountChipRow
        amounts={EXPENSE_AMOUNT_CHIPS}
        onSelect={(n) => setAmount(String(n))}
        selectedAmount={Number.isFinite(Number(amount)) ? Number(amount) : null}
        format={(n) => `${n}`}
      />

      <DateQuickPick value={date} onChange={setDate} />

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
              {equalPreview.length > 0 ? (
                <SplitPreviewRow shares={equalPreview} members={members} payerId={payerId} />
              ) : (
                <Text style={[type.caption, { color: colors.muted }]}>
                  {equalMemberIds.length > 0
                    ? `Shared equally across ${equalMemberIds.length}. Leftover paisa goes to the lowest member ID first.`
                    : 'Select at least one member.'}
                </Text>
              )}
            </>
          ) : (
            <>
              <QuickChipRow
                label="Split templates"
                options={CUSTOM_SPLIT_TEMPLATES.filter(
                  (t) =>
                    members.length >= 3 ||
                    t.shares.every((s) => members.some((m) => m.id === s.member_id)),
                ).map((t) => ({
                  id: t.id,
                  label: t.label,
                  icon: 'git-branch-outline',
                  sublabel: `PKR ${t.totalAmount}`,
                }))}
                onSelect={applyCustomTemplate}
              />
              <CustomButton
                label="Split equally into fields"
                icon="calculator-outline"
                variant="ghost"
                size="sm"
                onPress={fillEqualIntoCustomFields}
              />
              {members.map((member) => (
                <View key={member.id} style={{ gap: spacing.xs }}>
                  <InputField
                    label={`${member.name}'s share`}
                    prefix="PKR"
                    value={customAmounts[member.id] ?? ''}
                    onChangeText={(v) => setCustomAmounts((prev) => ({ ...prev, [member.id]: v }))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                  {remaining !== null && remaining > 0 ? (
                    <CustomButton
                      label={`Add remaining ${formatPkr(remaining)} here`}
                      variant="ghost"
                      size="sm"
                      onPress={() => fillRemainderFor(member.id)}
                    />
                  ) : null}
                </View>
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

      <View style={{ gap: spacing.sm }}>
        <Text style={[type.label, { color: colors.text }]}>Payment proof (optional)</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <CustomButton
            label="Take photo"
            icon="camera-outline"
            variant="secondary"
            size="sm"
            onPress={() => void attachProof('camera')}
            disabled={loading || proofUploading}
          />
          <CustomButton
            label="Choose from gallery"
            icon="images-outline"
            variant="secondary"
            size="sm"
            onPress={() => void attachProof('library')}
            disabled={loading || proofUploading}
          />
        </View>
        {proofUri ? (
          <View style={{ gap: spacing.sm }}>
            <Image
              source={{ uri: proofUri }}
              style={{
                width: '100%',
                height: 160,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
              }}
              resizeMode="cover"
              accessibilityLabel="Payment proof preview"
            />
            <CustomButton
              label="Remove proof"
              icon="trash-outline"
              variant="ghost"
              size="sm"
              onPress={() => {
                setProofUri(null);
                setProofMime(null);
              }}
              disabled={loading || proofUploading}
            />
          </View>
        ) : (
          <Text style={[type.caption, { color: colors.muted }]}>
            Attach a receipt or transfer screenshot so roommates can verify payment.
          </Text>
        )}
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
        loading={loading || proofUploading}
        disabled={loading || proofUploading}
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
