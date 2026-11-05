import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { CalendarCard } from '../src/components/calendar/CalendarCard';
import { Screen } from '../src/components/layout/Screen';
import { useActivityFeed } from '../src/store/activityFeed';
import { useRecurringSchedule } from '../src/store/recurringSchedule';
import { useTheme } from '../src/theme';
import { formatPkr } from '../src/utils/currency';

export default function CalendarScreen() {
  const { colors, spacing, type } = useTheme();
  const templates = useRecurringSchedule((s) => s.templates);
  const eventCount = useActivityFeed((s) => s.events.length);

  const dues = useMemo(
    () => [...templates].sort((a, b) => a.dayOfMonth - b.dayOfMonth),
    [templates],
  );

  return (
    <Screen>
      <CalendarCard variant="full" />

      {/* Monthly bills on record */}
      <View style={{ gap: spacing.xs }}>
        <Text style={[type.label, { color: colors.text, fontSize: 15 }]}>Monthly bills</Text>
        {dues.length === 0 ? (
          <Text style={[type.body, { color: colors.muted, fontSize: 14 }]}>
            Tick “Mark as monthly recurring bill” when logging an expense and its due day appears
            here every month.
          </Text>
        ) : (
          dues.map((t, index) => (
            <View
              key={t.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                minHeight: 44,
                paddingVertical: 6,
                borderBottomWidth: index === dues.length - 1 ? 0 : 1,
                borderBottomColor: colors.border,
              }}
            >
              <Ionicons name="repeat" size={16} color={colors.muted} />
              <Text
                style={[type.body, { color: colors.text, flex: 1, fontSize: 14 }]}
                numberOfLines={1}
              >
                {t.title} · {formatPkr(t.amount)} · {t.payerName}
              </Text>
              <Text style={[type.caption, { color: colors.muted }]}>day {t.dayOfMonth}</Text>
            </View>
          ))
        )}
      </View>

      <Text style={[type.caption, { color: colors.muted }]}>
        {eventCount === 0
          ? 'Payments appear here as you check out shopping, log bills, and settle up on this phone.'
          : 'This calendar is this phone’s ledger. Balances always come from the API.'}
      </Text>
    </Screen>
  );
}
