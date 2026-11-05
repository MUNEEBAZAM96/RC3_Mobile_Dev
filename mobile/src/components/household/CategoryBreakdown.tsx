import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CustomCard, EmptyState, StatusPill } from '../ui';
import { useTheme } from '../../theme';
import type { CategorySpending } from '../../types/household';
import { formatPkr } from '../../utils/currency';
import { enterRise, layoutSpring } from './motion';

interface CategoryBreakdownProps {
  categories: CategorySpending[];
  monthlyBudget: number;
  /** When true the endpoint answered 404/501; the card renders a calm placeholder. */
  unavailable?: boolean;
}

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  groceries: 'basket-outline',
  utilities: 'flash-outline',
  entertainment: 'game-controller-outline',
  cleaning: 'sparkles-outline',
};

/**
 * Hour 3.5 · Option 3 — per-category spending with the 40%-of-budget warning.
 * The `exceeded` flag comes from the API; the bar width is a visual aid only.
 */
export function CategoryBreakdown({
  categories,
  monthlyBudget,
  unavailable,
}: CategoryBreakdownProps) {
  const { colors, spacing, type, radius } = useTheme();
  const flagged = categories.filter((c) => c.exceeded);

  return (
    <CustomCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={[type.heading, { fontSize: 18, color: colors.text }]}>By category</Text>
          <Text style={[type.caption, { color: colors.muted }]}>
            Warning above 40% of the monthly budget
          </Text>
        </View>
        {flagged.length > 0 ? (
          <StatusPill
            label={`${flagged.length} over limit`}
            tone="warning"
            size="sm"
            icon="warning"
          />
        ) : null}
      </View>

      {unavailable ? (
        <EmptyState
          compact
          icon="pie-chart-outline"
          title="Breakdown not live yet"
          message="Category totals appear here once the server exposes them."
        />
      ) : categories.length === 0 ? (
        <EmptyState
          compact
          icon="pie-chart-outline"
          title="Nothing spent yet"
          message="Category totals fill in as expenses are logged."
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {categories.map((c, index) => {
            const share =
              monthlyBudget > 0 ? Math.min(100, Math.max(0, (c.total / monthlyBudget) * 100)) : 0;
            const icon = CATEGORY_ICON[c.category.toLowerCase()] ?? 'pricetag-outline';
            const accent = c.exceeded ? colors.warning : colors.primary;
            return (
              <Animated.View
                key={c.category}
                entering={enterRise(index)}
                layout={layoutSpring}
                style={{ gap: 6 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: radius.md,
                      backgroundColor: c.exceeded ? colors.warningSoft : colors.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={icon} size={15} color={accent} />
                  </View>
                  <Text style={[type.label, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                    {c.category}
                  </Text>
                  <Text style={[type.caption, { color: colors.muted }]}>
                    {Math.round(c.percent_of_budget || share)}%
                  </Text>
                  <Text
                    style={[type.label, { color: colors.text, minWidth: 92, textAlign: 'right' }]}
                  >
                    {formatPkr(c.total)}
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    borderRadius: radius.full,
                    backgroundColor: colors.surface,
                    overflow: 'hidden',
                    marginLeft: 30 + spacing.sm,
                  }}
                >
                  <View
                    style={{
                      width: `${share}%`,
                      height: '100%',
                      backgroundColor: accent,
                      borderRadius: radius.full,
                    }}
                  />
                </View>
                {c.exceeded ? (
                  <View style={{ marginLeft: 30 + spacing.sm }}>
                    <StatusPill
                      label={`${c.category} limit exceeded`}
                      tone="warning"
                      size="sm"
                      icon="alert-circle"
                    />
                  </View>
                ) : null}
              </Animated.View>
            );
          })}
        </View>
      )}
    </CustomCard>
  );
}
