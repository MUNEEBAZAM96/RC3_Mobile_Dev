import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { CustomButton, InputField, SectionHeader } from '../ui';
import { expenseSchema } from '../../features/household/schemas';
import { householdApi } from '../../services/api/household';
import { useTheme } from '../../theme';
import type { Member } from '../../types/household';
import { errorMessage } from '../../utils/format';
import { MemberSegmentedControl } from './MemberSegmentedControl';

interface ExpenseFormProps {
  members: Member[];
  onSuccess: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ExpenseForm({ members, onSuccess }: ExpenseFormProps) {
  const { colors, spacing, type } = useTheme();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(todayIso());
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState<string | null>(null);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [equalMemberIds, setEqualMemberIds] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPayerId(members.find((m) => m.id === 'M01')?.id ?? members[0]?.id ?? null);
    setEqualMemberIds(members.map((m) => m.id));
    const next: Record<string, string> = {};
    for (const m of members) next[m.id] = '';
    setCustomAmounts(next);
  }, [members]);

  function toggleEqualMember(id: string) {
    setEqualMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    const custom_splits = members.map((m) => ({
      member_id: m.id,
      amount: Number(customAmounts[m.id] || 0),
    }));
    const parsed = expenseSchema.safeParse({
      title,
      category,
      date,
      amount,
      payer_id: payerId ?? '',
      split_type: splitType,
      equal_member_ids: equalMemberIds,
      custom_splits,
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
        splits: data.split_type === 'custom' ? data.custom_splits : undefined,
      });
      setTitle('');
      setCategory('');
      setAmount('');
      onSuccess();
    } catch (err) {
      setError(errorMessage(err, 'Could not save expense.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title="Log shared expense" />
      <InputField label="Title" value={title} onChangeText={setTitle} placeholder="Internet bill" />
      <InputField label="Category" value={category} onChangeText={setCategory} placeholder="Utilities" />
      <InputField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} autoCapitalize="none" />
      <InputField label="Amount (PKR)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Text style={[type.label, { color: colors.text }]}>Paid by</Text>
      <MemberSegmentedControl members={members} activeMemberId={payerId} onSelect={setPayerId} />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <CustomButton label="Equal split" variant={splitType === 'equal' ? 'primary' : 'secondary'} onPress={() => setSplitType('equal')} />
        <CustomButton label="Custom split" variant={splitType === 'custom' ? 'primary' : 'secondary'} onPress={() => setSplitType('custom')} />
      </View>
      {splitType === 'equal' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {members.map((member) => (
            <CustomButton
              key={member.id}
              label={member.name}
              variant={equalMemberIds.includes(member.id) ? 'primary' : 'secondary'}
              onPress={() => toggleEqualMember(member.id)}
            />
          ))}
        </View>
      ) : (
        members.map((member) => (
          <InputField
            key={member.id}
            label={`${member.name} share (PKR)`}
            value={customAmounts[member.id] ?? ''}
            onChangeText={(v) => setCustomAmounts((prev) => ({ ...prev, [member.id]: v }))}
            keyboardType="decimal-pad"
          />
        ))
      )}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <CustomButton label="Save expense" onPress={() => void submit()} loading={loading} disabled={loading} />
    </View>
  );
}
