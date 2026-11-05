import { Text, View } from 'react-native';

import { useTheme } from '../../theme';
import type { BudgetSummary } from '../../types/household';
import { formatPkr } from '../../utils/currency';

interface BudgetProgressBarProps {
  budget: BudgetSummary;
}

export function BudgetProgressBar({ budget }: BudgetProgressBarProps) {
  const { colors, spacing, type, radius } = useTheme();
  const percent = Math.min(100, Math.max(0, budget.percent_used));

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[type.label, { color: colors.text }]}>Monthly budget</Text>
        <Text style={[type.caption, { color: colors.muted }]}>{budget.status}</Text>
      </View>
      <View style={{ height: 10, borderRadius: radius.full, backgroundColor: colors.surface, overflow: 'hidden' }}>
        <View
          style={{
            width: `${percent}%`,
            height: '100%',
            backgroundColor: percent >= 80 ? colors.warning : colors.primary,
          }}
        />
      </View>
      <Text style={[type.body, { color: colors.muted }]}>
        Spent {formatPkr(budget.total_spending)} of {formatPkr(budget.monthly_budget)} · {formatPkr(budget.remaining)} left (
        {percent.toFixed(0)}% used)
      </Text>
    </View>
  );
}
