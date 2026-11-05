import { Text, View } from 'react-native';

import { StatusPill, type PillTone } from '../ui';
import { useTheme } from '../../theme';
import type { BudgetSummary } from '../../types/household';
import { formatPkr } from '../../utils/currency';

interface BudgetProgressBarProps {
  budget: BudgetSummary;
  /** e.g. "November 2026" */
  periodLabel?: string;
}

function toneFor(percent: number, status: string): { tone: PillTone; label: string } {
  if (percent > 100) return { tone: 'danger', label: 'Over budget' };
  if (percent >= 80 || /near/i.test(status))
    return { tone: 'warning', label: status || 'Near Limit' };
  return { tone: 'success', label: status && !/^ok$/i.test(status) ? status : 'On track' };
}

/** Budget as a thin rule: spent of budget, a hairline track, remaining. Values come from the API. */
export function BudgetProgressBar({ budget, periodLabel }: BudgetProgressBarProps) {
  const { colors, spacing, type, radius } = useTheme();
  const rawPercent = Number.isFinite(budget.percent_used) ? budget.percent_used : 0;
  const clamped = Math.min(100, Math.max(0, rawPercent));
  const { tone, label } = toneFor(rawPercent, budget.status);
  const fillColor =
    tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.primary;

  return (
    <View style={{ gap: spacing.xs + 2 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <Text style={[type.caption, { color: colors.muted }]}>
          {(periodLabel ?? 'This month').toUpperCase()} · BUDGET
        </Text>
        <StatusPill label={label} tone={tone} size="sm" />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <Text style={[type.heading, { color: colors.text }]}>
          {formatPkr(budget.total_spending)}
        </Text>
        <Text style={[type.caption, { color: colors.muted }]}>
          of {formatPkr(budget.monthly_budget)}
        </Text>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(clamped),
          text: `${Math.round(rawPercent)}% of budget used`,
        }}
        style={{
          height: 6,
          borderRadius: radius.full,
          backgroundColor: colors.surface,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${clamped}%`,
            height: '100%',
            borderRadius: radius.full,
            backgroundColor: fillColor,
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[type.caption, { color: colors.muted }]}>{Math.round(rawPercent)}% used</Text>
        <Text style={[type.caption, { color: budget.remaining < 0 ? colors.danger : colors.text }]}>
          {budget.remaining < 0
            ? `${formatPkr(Math.abs(budget.remaining))} over`
            : `${formatPkr(budget.remaining)} left`}
        </Text>
      </View>
    </View>
  );
}
