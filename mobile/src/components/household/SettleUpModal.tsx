import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BottomSheet, CustomButton, InputField } from '../ui';
import { settleSchema } from '../../features/household/schemas';
import { householdApi } from '../../services/api/household';
import { useTheme } from '../../theme';
import type { BalanceRow, Member } from '../../types/household';
import { pushEvent } from '../../store/activityFeed';
import { showToast } from '../../store/toast';
import { formatPkr } from '../../utils/currency';
import { errorMessage } from '../../utils/format';
import { MemberSegmentedControl } from './MemberSegmentedControl';
import { enterFade, layoutSpring } from './motion';

interface SettleUpModalProps {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  /** Current API balances, used only to show helpful context (who owes, who is owed). */
  balances?: BalanceRow[];
  /** Pre-fill from a Smart Settle suggestion. */
  preset?: { sender_id: string; recipient_id: string; amount: number } | null;
  onSuccess: () => void;
}

/**
 * The sheet shell. Form state lives in `SettleForm`, which mounts with the modal,
 * so each open starts fresh (and picks up the latest balances) without effects.
 */
export function SettleUpModal({
  visible,
  onClose,
  members,
  balances = [],
  preset,
  onSuccess,
}: SettleUpModalProps) {
  return (
    <BottomSheet visible={visible} title="Settle up" onClose={onClose}>
      {visible ? (
        <SettleForm
          members={members}
          balances={balances}
          preset={preset}
          onSuccess={onSuccess}
          onClose={onClose}
        />
      ) : null}
    </BottomSheet>
  );
}

type SettleFormProps = Omit<SettleUpModalProps, 'visible' | 'balances'> & {
  balances: BalanceRow[];
};

function defaultParties(
  members: Member[],
  balances: BalanceRow[],
): { sender: string | null; recipient: string | null } {
  // Sensible defaults: biggest debtor pays biggest creditor.
  const debtor = [...balances].sort((a, b) => a.net_balance - b.net_balance)[0];
  const creditor = [...balances].sort((a, b) => b.net_balance - a.net_balance)[0];
  return {
    sender:
      debtor && debtor.net_balance < 0
        ? debtor.member_id
        : (members.find((m) => m.id === 'M02')?.id ?? members[0]?.id ?? null),
    recipient:
      creditor && creditor.net_balance > 0
        ? creditor.member_id
        : (members.find((m) => m.id === 'M01')?.id ?? members[1]?.id ?? null),
  };
}

function SettleForm({ members, balances, preset, onSuccess, onClose }: SettleFormProps) {
  const { colors, spacing, type, radius } = useTheme();
  const [senderId, setSenderId] = useState<string | null>(
    () => preset?.sender_id ?? defaultParties(members, balances).sender,
  );
  const [recipientId, setRecipientId] = useState<string | null>(
    () => preset?.recipient_id ?? defaultParties(members, balances).recipient,
  );
  const [amount, setAmount] = useState(() => (preset ? preset.amount.toFixed(2) : ''));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const senderRow = useMemo(
    () => balances.find((b) => b.member_id === senderId),
    [balances, senderId],
  );
  const recipientRow = useMemo(
    () => balances.find((b) => b.member_id === recipientId),
    [balances, recipientId],
  );
  const nameFor = (id: string | null) => members.find((m) => m.id === id)?.name ?? '—';
  const samePerson = senderId !== null && senderId === recipientId;
  // min(sender's debt, recipient's credit): the largest payment the server will accept.
  const suggested = useMemo(() => {
    if (!senderRow || !recipientRow || samePerson) return null;
    const debt = -senderRow.net_balance;
    const credit = recipientRow.net_balance;
    const value = Math.round(Math.min(debt, credit) * 100) / 100;
    return value > 0 ? value : null;
  }, [senderRow, recipientRow, samePerson]);

  async function submit() {
    if (loading) return;
    const parsed = settleSchema.safeParse({
      sender_id: senderId ?? '',
      recipient_id: recipientId ?? '',
      amount,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await householdApi.settle(parsed.data);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      pushEvent({
        type: 'settle',
        title: `${nameFor(parsed.data.sender_id)} paid ${nameFor(parsed.data.recipient_id)}`,
        amount: parsed.data.amount,
        memberName: nameFor(parsed.data.sender_id),
      });
      showToast(`Settlement recorded. ${formatPkr(parsed.data.amount)} moved, spending unchanged.`);
      onSuccess();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Settlement failed.'));
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
      <Text style={[type.body, { color: colors.muted }]}>
        Record a cash payment between two members. Settlements never change household spending.
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Text style={[type.label, { color: colors.text }]}>Who is paying?</Text>
        <MemberSegmentedControl
          members={members}
          activeMemberId={senderId}
          onSelect={setSenderId}
          compact
        />
        {senderRow ? (
          <Text
            style={[
              type.caption,
              { color: senderRow.net_balance < 0 ? colors.danger : colors.muted },
            ]}
          >
            {senderRow.net_balance < 0
              ? `${nameFor(senderId)} owes ${formatPkr(Math.abs(senderRow.net_balance))}`
              : `${nameFor(senderId)} has no debt right now`}
          </Text>
        ) : null}
      </View>

      <View style={{ alignItems: 'center' }}>
        <Ionicons name="arrow-down" size={18} color={colors.muted} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={[type.label, { color: colors.text }]}>Who receives?</Text>
        <MemberSegmentedControl
          members={members}
          activeMemberId={recipientId}
          onSelect={setRecipientId}
          compact
        />
        {recipientRow ? (
          <Text
            style={[
              type.caption,
              { color: recipientRow.net_balance > 0 ? colors.success : colors.muted },
            ]}
          >
            {recipientRow.net_balance > 0
              ? `${nameFor(recipientId)} is owed ${formatPkr(recipientRow.net_balance)}`
              : `${nameFor(recipientId)} is not owed anything`}
          </Text>
        ) : null}
        {samePerson ? (
          <Text style={[type.caption, { color: colors.danger }]}>
            Sender and recipient must be different people.
          </Text>
        ) : null}
      </View>

      <InputField
        label="Amount"
        prefix="PKR"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="250.00"
        hint={
          suggested !== null
            ? `Clears the most possible between them: ${formatPkr(suggested)}`
            : undefined
        }
      />
      <CustomButton
        label={suggested !== null ? `Suggest amount · ${formatPkr(suggested)}` : 'Suggest amount'}
        icon="bulb-outline"
        variant="ghost"
        size="sm"
        onPress={() => {
          if (suggested !== null) setAmount(suggested.toFixed(2));
        }}
        disabled={suggested === null}
      />

      <Animated.View
        layout={layoutSpring}
        entering={enterFade}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.sm + 4,
        }}
      >
        <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
        <Text style={[type.label, { color: colors.text, flex: 1 }]} numberOfLines={2}>
          {nameFor(senderId)} pays {nameFor(recipientId)}{' '}
          {amount.trim() !== '' && Number.isFinite(Number(amount))
            ? formatPkr(Number(amount))
            : 'PKR —'}
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
        label="Record payment"
        icon="checkmark-done-outline"
        onPress={() => void submit()}
        loading={loading}
        disabled={loading || samePerson}
      />
    </ScrollView>
  );
}
