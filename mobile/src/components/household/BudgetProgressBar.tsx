import { useEffect, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { StatusPill, type PillTone } from '../ui';
import { useTheme } from '../../theme';
import type { BudgetSummary } from '../../types/household';
import { formatPkr } from '../../utils/currency';
import { timingSmooth } from './motion';

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

export function BudgetProgressBar({ budget, periodLabel }: BudgetProgressBarProps) {
  const { colors, spacing, type, radius } = useTheme();
  const rawPercent = Number.isFinite(budget.percent_used) ? budget.percent_used : 0;
  const clamped = Math.min(100, Math.max(0, rawPercent));
  const { tone, label } = toneFor(rawPercent, budget.status);
  const fillColor =
    tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.primary;

  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(clamped / 100, timingSmooth);
  }, [clamped, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: trackWidth * progress.value,
  }));

  function onTrackLayout(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: spacing.sm,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[type.caption, { color: colors.muted }]}>
            {(periodLabel ?? 'This month').toUpperCase()} · BUDGET
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[type.heading, { color: colors.text }]}>
              {formatPkr(budget.total_spending)}
            </Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              of {formatPkr(budget.monthly_budget)}
            </Text>
          </View>
        </View>
        <StatusPill label={label} tone={tone} size="sm" />
      </View>

      <View
        onLayout={onTrackLayout}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(clamped),
          text: `${Math.round(rawPercent)}% of budget used`,
        }}
        style={{
          height: 12,
          borderRadius: radius.full,
          backgroundColor: colors.surface,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            fillStyle,
            { height: '100%', borderRadius: radius.full, backgroundColor: fillColor },
          ]}
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
