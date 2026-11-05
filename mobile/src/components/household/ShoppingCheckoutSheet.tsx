import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BottomSheet, CustomButton, InputField } from '../ui';
import { checkoutSchema } from '../../features/household/schemas';
import { householdApi } from '../../services/api/household';
import { useTheme } from '../../theme';
import type { CheckoutPayload, Member, ShoppingItem } from '../../types/household';
import { formatPkr } from '../../utils/currency';
import { errorMessage } from '../../utils/format';
import { MemberSegmentedControl, MemberToggleChips } from './MemberSegmentedControl';
import { enterFade, layoutSpring } from './motion';

interface ShoppingCheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  selectedItemIds: string[];
  /** Used to show the item titles inside the sheet. */
  items?: ShoppingItem[];
  onSuccess: () => void;
}

function parseAmount(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * The sheet shell. Form state lives in `CheckoutForm`, which mounts with the modal,
 * so every open starts from a clean form without any effect-driven resets.
 */
export function ShoppingCheckoutSheet({
  visible,
  onClose,
  members,
  selectedItemIds,
  items = [],
  onSuccess,
}: ShoppingCheckoutSheetProps) {
  return (
    <BottomSheet visible={visible} title="Checkout" onClose={onClose}>
      {visible ? (
        <CheckoutForm
          members={members}
          selectedItemIds={selectedItemIds}
          items={items}
          onSuccess={onSuccess}
          onClose={onClose}
        />
      ) : null}
    </BottomSheet>
  );
}

type CheckoutFormProps = Omit<ShoppingCheckoutSheetProps, 'visible' | 'items'> & {
  items: ShoppingItem[];
};

function CheckoutForm({ members, selectedItemIds, items, onSuccess, onClose }: CheckoutFormProps) {
  const { colors, spacing, type, radius } = useTheme();
  const [totalPaid, setTotalPaid] = useState('');
  const [payerId, setPayerId] = useState<string | null>(
    () => members.find((m) => m.id === 'M01')?.id ?? members[0]?.id ?? null,
  );
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>(() => members.map((m) => m.id));
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [taxPercent, setTaxPercent] = useState('');
  const [discount, setDiscount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedItems = useMemo(
    () => items.filter((i) => selectedItemIds.includes(i.id)),
    [items, selectedItemIds],
  );

  // Live receipt math (display only; the server posts the expense with its own calculation).
  const itemsTotal = parseAmount(totalPaid);
  const tax = parseAmount(taxPercent);
  const off = parseAmount(discount);
  const hasAdjustments = (tax !== null && tax > 0) || (off !== null && off > 0);
  const finalTotal =
    itemsTotal === null ? null : Math.max(0, itemsTotal * (1 + (tax ?? 0) / 100) - (off ?? 0));

  function toggleSplitMember(id: string) {
    setSplitMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (loading) return;
    const parsed = checkoutSchema.safeParse({
      item_ids: selectedItemIds,
      total_paid: totalPaid,
      payer_id: payerId ?? '',
      split_members: splitMemberIds,
      tax_percent: taxPercent,
      discount_amount: discount,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: CheckoutPayload = {
        item_ids: parsed.data.item_ids,
        total_paid: parsed.data.total_paid,
        payer_id: parsed.data.payer_id,
        split_members: parsed.data.split_members,
      };
      if (parsed.data.tax_percent !== undefined && parsed.data.tax_percent > 0)
        payload.tax_percent = parsed.data.tax_percent;
      if (parsed.data.discount_amount !== undefined && parsed.data.discount_amount > 0)
        payload.discount_amount = parsed.data.discount_amount;
      await householdApi.checkout(payload);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Checkout failed.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ maxHeight: 520 }}
      contentContainerStyle={{ gap: spacing.md }}
    >
      {/* Selected items */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.sm + 4,
          gap: 6,
        }}
      >
        <Text style={[type.caption, { color: colors.muted }]}>
          {selectedItemIds.length} ITEM{selectedItemIds.length === 1 ? '' : 'S'} IN THIS TRIP
        </Text>
        {selectedItems.length > 0 ? (
          selectedItems.map((item) => (
            <View
              key={item.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={[type.body, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[type.caption, { color: colors.muted }]}>
                {item.requested_qty} {item.unit}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[type.body, { color: colors.muted }]}>Items will be marked as bought.</Text>
        )}
      </View>

      <InputField
        label="Total paid"
        prefix="PKR"
        value={totalPaid}
        onChangeText={setTotalPaid}
        keyboardType="decimal-pad"
        placeholder="780.00"
        hint={
          splitMemberIds.length > 0
            ? `Split equally across ${splitMemberIds.length} member${splitMemberIds.length === 1 ? '' : 's'} by the server`
            : undefined
        }
      />

      <View style={{ gap: spacing.sm }}>
        <Text style={[type.label, { color: colors.text }]}>Paid by</Text>
        <MemberSegmentedControl
          members={members}
          activeMemberId={payerId}
          onSelect={setPayerId}
          compact
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={[type.label, { color: colors.text }]}>Split between</Text>
        <MemberToggleChips
          members={members}
          selectedIds={splitMemberIds}
          onToggle={toggleSplitMember}
          compact
        />
        {splitMemberIds.length === 0 ? (
          <Text style={[type.caption, { color: colors.danger }]}>
            Select at least one member for the split.
          </Text>
        ) : null}
      </View>

      {/* Receipt adjustments (Hour 3.5 · Option 2) */}
      <Animated.View
        layout={layoutSpring}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          overflow: 'hidden',
        }}
      >
        <Pressable
          onPress={() => setAdjustOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: adjustOpen }}
          accessibilityLabel="Receipt adjustments: tax and discount"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            minHeight: 48,
            paddingHorizontal: spacing.md,
          }}
        >
          <Ionicons name="receipt-outline" size={18} color={colors.primary} />
          <Text style={[type.label, { color: colors.text, flex: 1 }]}>Receipt adjustments</Text>
          {hasAdjustments && !adjustOpen ? (
            <Text style={[type.caption, { color: colors.primary }]}>
              {tax ? `${tax}% GST` : ''}
              {tax && off ? ' · ' : ''}
              {off ? `−${formatPkr(off)}` : ''}
            </Text>
          ) : null}
          <Ionicons
            name={adjustOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.muted}
          />
        </Pressable>
        {adjustOpen ? (
          <Animated.View
            entering={enterFade}
            style={{ padding: spacing.md, paddingTop: 0, gap: spacing.sm }}
          >
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Tax"
                  suffix="%"
                  value={taxPercent}
                  onChangeText={setTaxPercent}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Discount"
                  prefix="PKR"
                  value={discount}
                  onChangeText={setDiscount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
            </View>
            <Text style={[type.caption, { color: colors.muted }]}>
              Final = items total × (1 + tax%) − discount
            </Text>
          </Animated.View>
        ) : null}
      </Animated.View>

      {/* Live total */}
      <Animated.View
        layout={layoutSpring}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.primarySoft,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 4,
        }}
      >
        <View>
          <Text style={[type.caption, { color: colors.primary }]}>EXPENSE TO POST</Text>
          {hasAdjustments && itemsTotal !== null ? (
            <Text style={[type.caption, { color: colors.muted }]}>
              Items {formatPkr(itemsTotal)}
            </Text>
          ) : null}
        </View>
        <Text style={[type.heading, { color: colors.primary }]}>
          {finalTotal !== null ? formatPkr(finalTotal) : 'PKR —'}
        </Text>
      </Animated.View>

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
        label="Post expense"
        icon="checkmark-circle-outline"
        onPress={() => void submit()}
        loading={loading}
        disabled={loading || splitMemberIds.length === 0}
      />
    </ScrollView>
  );
}
