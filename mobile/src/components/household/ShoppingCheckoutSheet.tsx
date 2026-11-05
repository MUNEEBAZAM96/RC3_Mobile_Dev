import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { BottomSheet, CustomButton, InputField } from '../ui';
import { checkoutSchema } from '../../features/household/schemas';
import { householdApi } from '../../services/api/household';
import { useTheme } from '../../theme';
import type { Member } from '../../types/household';
import { errorMessage } from '../../utils/format';
import { MemberSegmentedControl } from './MemberSegmentedControl';

interface ShoppingCheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  selectedItemIds: string[];
  onSuccess: () => void;
}

export function ShoppingCheckoutSheet({ visible, onClose, members, selectedItemIds, onSuccess }: ShoppingCheckoutSheetProps) {
  const { colors, spacing, type } = useTheme();
  const [totalPaid, setTotalPaid] = useState('');
  const [payerId, setPayerId] = useState<string | null>(null);
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTotalPaid('');
    setError(null);
    setPayerId(members.find((m) => m.id === 'M01')?.id ?? members[0]?.id ?? null);
    setSplitMemberIds(members.map((m) => m.id));
  }, [visible, members]);

  const splitMembers = useMemo(() => members.filter((m) => splitMemberIds.includes(m.id)), [members, splitMemberIds]);

  function toggleSplitMember(id: string) {
    setSplitMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    const parsed = checkoutSchema.safeParse({
      item_ids: selectedItemIds,
      total_paid: totalPaid,
      payer_id: payerId ?? '',
      split_members: splitMemberIds,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await householdApi.checkout(parsed.data);
      onSuccess();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Checkout failed.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheet visible={visible} title="Checkout" onClose={onClose}>
      <Text style={[type.body, { color: colors.muted }]}>{selectedItemIds.length} item(s) selected</Text>
      <InputField label="Total paid (PKR)" value={totalPaid} onChangeText={setTotalPaid} keyboardType="decimal-pad" placeholder="780.00" />
      <Text style={[type.label, { color: colors.text }]}>Paid by</Text>
      <MemberSegmentedControl
        members={members}
        activeMemberId={payerId}
        onSelect={(id) => setPayerId(id)}
      />
      <Text style={[type.label, { color: colors.text, marginTop: spacing.sm }]}>Split between</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {members.map((member) => {
          const on = splitMemberIds.includes(member.id);
          return (
            <CustomButton
              key={member.id}
              label={member.name}
              variant={on ? 'primary' : 'secondary'}
              onPress={() => toggleSplitMember(member.id)}
            />
          );
        })}
      </View>
      {splitMembers.length === 0 ? (
        <Text style={[type.caption, { color: colors.danger }]}>Select at least one member for the split.</Text>
      ) : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <CustomButton label="Confirm checkout" onPress={() => void submit()} loading={loading} disabled={loading} />
    </BottomSheet>
  );
}
