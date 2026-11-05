import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { InputField } from '../ui/InputField';
import { QuickChipRow } from '../ui/QuickChipRow';
import { todayIso } from '../../utils/time';

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayIso(d);
}

function firstOfMonthIso(): string {
  const d = new Date();
  return todayIso(new Date(d.getFullYear(), d.getMonth(), 1));
}

function resolveQuickId(value: string): 'today' | 'yesterday' | 'first' | 'other' {
  if (value === todayIso()) return 'today';
  if (value === yesterdayIso()) return 'yesterday';
  if (value === firstOfMonthIso()) return 'first';
  return 'other';
}

interface DateQuickPickProps {
  value: string;
  onChange: (iso: string) => void;
}

export function DateQuickPick({ value, onChange }: DateQuickPickProps) {
  const quick = useMemo(() => resolveQuickId(value), [value]);
  const [otherOpen, setOtherOpen] = useState(quick === 'other');

  const selectedId = otherOpen || quick === 'other' ? (quick === 'other' ? 'other' : quick) : quick;

  return (
    <View style={{ gap: 8 }}>
      <QuickChipRow
        label="When"
        options={[
          { id: 'today', label: 'Today', icon: 'today-outline' },
          { id: 'yesterday', label: 'Yesterday', icon: 'arrow-back-outline' },
          { id: 'first', label: '1st of month', icon: 'calendar-outline' },
          { id: 'other', label: 'Other date', icon: 'create-outline' },
        ]}
        selectedId={otherOpen ? 'other' : quick}
        onSelect={(id) => {
          if (id === 'today') {
            setOtherOpen(false);
            onChange(todayIso());
          } else if (id === 'yesterday') {
            setOtherOpen(false);
            onChange(yesterdayIso());
          } else if (id === 'first') {
            setOtherOpen(false);
            onChange(firstOfMonthIso());
          } else {
            setOtherOpen(true);
          }
        }}
      />
      {otherOpen || quick === 'other' ? (
        <InputField
          label="Date (YYYY-MM-DD)"
          value={value}
          onChangeText={onChange}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          placeholder="2026-03-15"
        />
      ) : null}
    </View>
  );
}
