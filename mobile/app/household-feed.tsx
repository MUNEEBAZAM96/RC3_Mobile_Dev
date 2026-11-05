import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityRow } from '../src/components/household';
import { useRefreshOverlayVisible } from '../src/hooks/useRefreshOverlayVisible';
import {
  CustomButton,
  CustomCard,
  EmptyState,
  RefreshSplashOverlay,
  StatusPill,
} from '../src/components/ui';
import { useActivityFeed, type ActivityEvent } from '../src/store/activityFeed';
import { useTheme } from '../src/theme';

export default function HouseholdFeedScreen() {
  const { colors, spacing, type, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const events = useActivityFeed((s) => s.events);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  const overlayVisible = useRefreshOverlayVisible(refreshing);

  const refresh = useCallback(() => {
    setRefreshing(true);
    // The feed is on-device; a refresh re-reads the persisted store and re-renders relative times.
    void useActivityFeed.persist.rehydrate();
    setTimeout(() => {
      setTick((t) => t + 1);
      setRefreshing(false);
    }, 350);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: ActivityEvent; index: number }) => (
      <ActivityRow event={item} connector={index < events.length - 1} />
    ),
    [events.length],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <RefreshSplashOverlay visible={overlayVisible} />
      <FlatList
      data={events}
      extraData={tick}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing.md,
        paddingBottom: spacing.xl + insets.bottom,
        flexGrow: 1,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      ListHeaderComponent={
        <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
          <CustomCard tone="soft">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.md,
                  backgroundColor: colors.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="pulse-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.heading, { color: colors.text, fontSize: 18 }]}>Flat feed</Text>
                <Text style={[type.caption, { color: colors.muted }]}>
                  What this phone logged in the shared ledger
                </Text>
              </View>
              <StatusPill label={`${events.length}`} tone="primary" size="sm" />
            </View>
          </CustomCard>
        </View>
      }
      ListEmptyComponent={
        <CustomCard>
          <EmptyState
            icon="time-outline"
            title="Nothing yet"
            message="Activity appears when you log expenses, check out shopping, or record a settlement."
          />
        </CustomCard>
      }
      ListFooterComponent={
        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <CustomButton
            label="Message the flat (coming soon)"
            icon="chatbubbles-outline"
            variant="secondary"
            onPress={() => undefined}
            disabled
          />
          <Text style={[type.caption, { color: colors.muted, textAlign: 'center' }]}>
            Balances always come from the API. This timeline is a local trail on this device.
          </Text>
        </View>
      }
    />
    </View>
  );
}
