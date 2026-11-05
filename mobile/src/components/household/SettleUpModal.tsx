import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { BottomSheet, CustomButton, InputField } from '../ui';
import { settleSchema } from '../../features/household/schemas';
import { householdApi } from '../../services/api/household';
import { useTheme } from '../../theme';
import type { Member } from '../../types/household';
import { errorMessage } from '../../utils/format';
import { MemberSegmentedControl } from './MemberSegmentedControl';

interface SettleUpModalProps {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  onSuccess: () => void;
}

export function SettleUpModal({ visible, onClose, members, onSuccess }: SettleUpModalProps) {
  const { colors, type } = useTheme();
  const [senderId, setSenderId] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAmount('');
    setError(null);
    setSenderId(members.find((m) => m.id === 'M02')?.id ?? members[0]?.id ?? null);
    setRecipientId(members.find((m) => m.id === 'M01')?.id ?? members[1]?.id ?? null);
  }, [visible, members]);

  async function submit() {
    const parsed = settleSchema.safeParse({
      sender_id: senderId ?? '',
      recipient_id: recipientId ?? '',
      amount,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form.');
      return;
    }
    if (parsed.data.sender_id === parsed.data.recipient_id) {
      setError('Sender and recipient must be different.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await householdApi.settle(parsed.data);
      onSuccess();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Settlement failed.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheet visible={visible} title="Settle up" onClose={onClose}>
      <Text style={[type.label, { color: colors.text }]}>Sender (pays)</Text>
      <MemberSegmentedControl members={members} activeMemberId={senderId} onSelect={setSenderId} />
      <Text style={[type.label, { color: colors.text }]}>Recipient (receives)</Text>
      <MemberSegmentedControl members={members} activeMemberId={recipientId} onSelect={setRecipientId} />
      <InputField label="Amount (PKR)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="250.00" />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <CustomButton label="Record payment" onPress={() => void submit()} loading={loading} disabled={loading} />
    </BottomSheet>
  );
}
