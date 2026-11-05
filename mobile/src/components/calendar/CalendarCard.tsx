import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, ReduceMotion } from 'react-native-reanimated';

import { useActivityFeed } from '../../store/activityFeed';
import { useRecurringSchedule } from '../../store/recurringSchedule';
import { useTheme } from '../../theme';
import { formatPkr } from '../../utils/currency';
import { CustomCard } from '../ui';
import {
  addMonths,
  buildMonthData,
  buildMonthGrid,
  dayKey,
  selectedDayLabel,
  startOfMonth,
  WEEKDAY_LABELS,
  type CalendarEntry,
  type CalendarEntryKind,
} from './calendarModel';

interface CalendarCardProps {
  /** Home shows a short day list and an "Open calendar" action; the stack screen shows everything. */
  variant?: 'home' | 'full';
  onOpenFull?: () => void;
}

const CELL_HEIGHT = 48;
const HOME_LIST_LIMIT = 4;

const monthTransition = {
  forward: FadeInRight.duration(220).reduceMotion(ReduceMotion.System),
  back: FadeInLeft.duration(220).reduceMotion(ReduceMotion.System),
};

function iconFor(kind: CalendarEntryKind): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case 'checkout':
      return 'bag-check-outline';
    case 'settle':
      return 'swap-horizontal-outline';
    case 'due':
      return 'alarm-outline';
    default:
      return 'receipt-outline';
  }
}

/**
 * Month grid plus the selected day's payments, built from this phone's activity feed and the
 * recurring templates saved when a bill is marked monthly. Teal marks the selected day; a dot
 * under a date means money moved that day, an amber dot means a bill is due.
 */
export function CalendarCard({ variant = 'home', onOpenFull }: CalendarCardProps) {
  const { colors, spacing, type, radius, minTapTarget } = useTheme();
  const events = useActivityFeed((s) => s.events);
  const templates = useRecurringSchedule((s) => s.templates);

  const todayKey = dayKey(new Date());
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(todayKey);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const data = useMemo(() => buildMonthData(month, events, templates), [month, events, templates]);
  const cells = useMemo(() => buildMonthGrid(month), [month]);
  const monthTitle = month.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
  const entries = data.byDay.get(selected) ?? [];
  const visibleEntries = variant === 'home' ? entries.slice(0, HOME_LIST_LIMIT) : entries;
  const hiddenCount = entries.length - visibleEntries.length;

  function shiftMonth(delta: 1 | -1) {
    setDirection(delta === 1 ? 'forward' : 'back');
    const next = addMonths(month, delta);
    setMonth(next);
    // Keep the selection inside the visible month so the list always matches the grid.
    const sameDay = Math.min(
      Number(selected.slice(-2)) || 1,
      new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(),
    );
    setSelected(dayKey(new Date(next.getFullYear(), next.getMonth(), sameDay)));
  }

  function jumpToToday() {
    const now = new Date();
    setDirection(startOfMonth(now).getTime() >= month.getTime() ? 'forward' : 'back');
    setMonth(startOfMonth(now));
    setSelected(todayKey);
  }

  return (
    <CustomCard flush>
      {/* Month header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.sm,
          paddingTop: spacing.xs,
        }}
      >
        <Pressable
          onPress={() => shiftMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={({ pressed }) => ({
            width: minTapTarget,
            height: minTapTarget,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={jumpToToday}
          accessibilityRole="button"
          accessibilityLabel={`${monthTitle}. Jump to today`}
          style={{
            flex: 1,
            minHeight: minTapTarget,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={[type.heading, { color: colors.text, fontSize: 17 }]}>{monthTitle}</Text>
          <Text style={[type.caption, { color: colors.muted }]}>
            {data.count === 0
              ? 'No payments logged'
              : `${data.count} payment${data.count === 1 ? '' : 's'} · ${formatPkr(data.spent)} spent`}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => shiftMonth(1)}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={({ pressed }) => ({
            width: minTapTarget,
            height: minTapTarget,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Weekday labels */}
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.sm }}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text
            key={`${label}-${index}`}
            style={[
              type.caption,
              { color: colors.muted, flex: 1, textAlign: 'center', paddingVertical: 4 },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Grid */}
      <Animated.View
        key={`${month.getFullYear()}-${month.getMonth()}`}
        entering={monthTransition[direction]}
        style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xs }}
      >
        {Array.from({ length: cells.length / 7 }, (_, row) => (
          <View key={row} style={{ flexDirection: 'row' }}>
            {cells.slice(row * 7, row * 7 + 7).map((cell) => {
              if (!cell.date || cell.dayNumber === null)
                return <View key={cell.key} style={{ flex: 1, height: CELL_HEIGHT }} />;
              const isSelected = cell.key === selected;
              const isToday = cell.key === todayKey;
              const hasPayment = data.paymentDays.has(cell.key);
              const hasDue = data.dueDays.has(cell.key);
              const label = cell.date.toLocaleDateString('en-PK', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              });
              const hint =
                hasPayment && hasDue
                  ? ', payments and a bill due'
                  : hasPayment
                    ? ', has payments'
                    : hasDue
                      ? ', bill due'
                      : '';
              return (
                <Pressable
                  key={cell.key}
                  onPress={() => setSelected(cell.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}${hint}`}
                  accessibilityState={{ selected: isSelected }}
                  style={{
                    flex: 1,
                    height: CELL_HEIGHT,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.full,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      borderWidth: isToday && !isSelected ? 1.5 : 0,
                      borderColor: colors.primary,
                    }}
                  >
                    <Text
                      style={[
                        type.label,
                        {
                          fontSize: 14,
                          color: isSelected
                            ? colors.primaryText
                            : isToday
                              ? colors.primary
                              : colors.text,
                        },
                      ]}
                    >
                      {cell.dayNumber}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 3, height: 5, marginTop: 1 }}>
                    {hasPayment ? (
                      <View
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 3,
                          backgroundColor: isSelected ? colors.primary : colors.success,
                        }}
                      />
                    ) : null}
                    {hasDue ? (
                      <View
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 3,
                          backgroundColor: colors.warning,
                        }}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>

      {/* Selected day */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          padding: spacing.md,
          gap: spacing.sm,
        }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}
        >
          <Text style={[type.label, { color: colors.text, fontSize: 15 }]}>
            {selectedDayLabel(selected)}
          </Text>
          {entries.length > 0 ? (
            <Text style={[type.caption, { color: colors.muted }]}>
              {entries.length} item{entries.length === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>

        {visibleEntries.length === 0 ? (
          <Text style={[type.body, { color: colors.muted, fontSize: 14 }]}>
            Nothing on this day.
          </Text>
        ) : (
          <View>
            {visibleEntries.map((entry, index) => (
              <EntryRow key={entry.id} entry={entry} last={index === visibleEntries.length - 1} />
            ))}
          </View>
        )}

        {hiddenCount > 0 ? (
          <Text style={[type.caption, { color: colors.muted }]}>
            +{hiddenCount} more on this day
          </Text>
        ) : null}

        {variant === 'home' && onOpenFull ? (
          <Pressable
            onPress={onOpenFull}
            accessibilityRole="button"
            accessibilityLabel="Open calendar"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              minHeight: minTapTarget,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.text} />
            <Text style={[type.label, { color: colors.text }]}>Open calendar</Text>
          </Pressable>
        ) : null}
      </View>
    </CustomCard>
  );
}

function EntryRow({ entry, last }: { entry: CalendarEntry; last: boolean }) {
  const { colors, spacing, type } = useTheme();
  const due = entry.kind === 'due';
  const tint = due ? colors.warning : entry.kind === 'settle' ? colors.success : colors.text;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 44,
        paddingVertical: 6,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <Ionicons name={iconFor(entry.kind)} size={16} color={due ? colors.warning : colors.muted} />
      <Text
        style={[type.body, { color: tint, flex: 1, fontSize: 14, lineHeight: 19 }]}
        numberOfLines={2}
      >
        {entry.line}
      </Text>
      <Text style={[type.caption, { color: due ? colors.warning : colors.muted }]}>
        {due ? 'Due' : entry.time}
      </Text>
    </View>
  );
}
