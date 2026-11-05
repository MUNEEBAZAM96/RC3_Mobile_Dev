import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShoppingCheckoutSheet, ShoppingItemRow } from '../../src/components/household';
import {
  enterFade,
  enterRise,
  exitFade,
  layoutSpring,
} from '../../src/components/household/motion';
import { Screen } from '../../src/components/layout/Screen';
import {
  AppHeader,
  CustomButton,
  CustomCard,
  EmptyState,
  ErrorState,
  InputField,
  LoadingScreen,
  SectionHeader,
  StatusPill,
} from '../../src/components/ui';
import { createShoppingItemSchema } from '../../src/features/household/schemas';
import { householdApi } from '../../src/services/api/household';
import { useHouseholdStore } from '../../src/store/household';
import { useTheme } from '../../src/theme';
import { SHOPPING_UNITS, type ShoppingItem, type ShoppingUnit } from '../../src/types/household';
import { pushEvent } from '../../src/store/activityFeed';
import { showToast } from '../../src/store/toast';
import { errorMessage } from '../../src/utils/format';

const UNIT_ICON: Record<ShoppingUnit, keyof typeof Ionicons.glyphMap> = {
  pack: 'cube-outline',
  dozen: 'egg-outline',
  bottle: 'water-outline',
  bag: 'bag-handle-outline',
};

const FOOTER_HEIGHT = 84;

export default function ShoppingScreen() {
  const { colors, spacing, type, radius, minTapTarget } = useTheme();
  const insets = useSafeAreaInsets();
  const { members, loadMembers } = useHouseholdStore();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [showBought, setShowBought] = useState(false);

  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState<ShoppingUnit>('pack');
  const [qty, setQty] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const pending = useMemo(() => items.filter((i) => i.status === 'pending'), [items]);
  const bought = useMemo(() => items.filter((i) => i.status === 'bought'), [items]);
  const allSelected = pending.length > 0 && selectedIds.length === pending.length;

  const load = useCallback(async () => {
    setError(null);
    try {
      await loadMembers();
      const list = await householdApi.getShopping();
      setItems(list);
      // Drop selections for items that are no longer pending.
      setSelectedIds((prev) =>
        prev.filter((id) => list.some((i) => i.id === id && i.status === 'pending')),
      );
    } catch (err) {
      setError(errorMessage(err, 'Could not load shopping list.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadMembers]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : pending.map((i) => i.id));
  }

  async function addItem() {
    if (adding) return;
    const parsed = createShoppingItemSchema.safeParse({ title, unit, requested_qty: qty });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Check the form.');
      return;
    }
    setAdding(true);
    setFormError(null);
    try {
      const created = await householdApi.createShoppingItem(parsed.data);
      pushEvent({
        type: 'shopping_added',
        title: `${created.title || parsed.data.title} added · ${parsed.data.requested_qty} ${parsed.data.unit}`,
      });
      showToast(`${created.title || parsed.data.title} added to the list.`, 'info');
      setTitle('');
      setQty(1);
      await load();
    } catch (err) {
      setFormError(errorMessage(err, 'Could not add item.'));
    } finally {
      setAdding(false);
    }
  }

  if (loading && items.length === 0) {
    return <LoadingScreen label="Loading shopping list" />;
  }

  const footerVisible = pending.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load();
        }}
        bottomInset={footerVisible ? FOOTER_HEIGHT : 0}
      >
        <AppHeader
          title="Shopping"
          subtitle={`${pending.length} pending · ${bought.length} bought`}
          right={
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.full,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="cart" size={22} color={colors.primary} />
            </View>
          }
        />
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {/* Add item */}
        <Animated.View entering={enterRise(0)}>
          <CustomCard>
            <SectionHeader title="Add to list" />
            <InputField
              label="Item"
              value={title}
              onChangeText={setTitle}
              placeholder="Milk, rice, dish soap…"
              returnKeyType="done"
              onSubmitEditing={() => void addItem()}
            />
            <View style={{ gap: spacing.xs }}>
              <Text style={[type.label, { color: colors.text }]}>Unit</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {SHOPPING_UNITS.map((u) => {
                  const active = unit === u;
                  return (
                    <Pressable
                      key={u}
                      onPress={() => setUnit(u)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Unit ${u}`}
                      style={({ pressed }) => ({
                        flex: 1,
                        minHeight: minTapTarget,
                        borderRadius: radius.md,
                        borderWidth: 1.5,
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primarySoft : colors.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Ionicons
                        name={UNIT_ICON[u]}
                        size={16}
                        color={active ? colors.primary : colors.muted}
                      />
                      <Text
                        style={[type.caption, { color: active ? colors.primary : colors.text }]}
                      >
                        {u}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
              <View style={{ gap: spacing.xs }}>
                <Text style={[type.label, { color: colors.text }]}>Quantity</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    backgroundColor: colors.card,
                  }}
                >
                  <Stepper
                    icon="remove"
                    label="Decrease quantity"
                    disabled={qty <= 1}
                    onPress={() => setQty((q) => Math.max(1, q - 1))}
                  />
                  <Text
                    style={[
                      type.heading,
                      { color: colors.text, minWidth: 36, textAlign: 'center', fontSize: 18 },
                    ]}
                  >
                    {qty}
                  </Text>
                  <Stepper
                    icon="add"
                    label="Increase quantity"
                    onPress={() => setQty((q) => Math.min(99, q + 1))}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <CustomButton
                  label="Add to list"
                  icon="add"
                  onPress={() => void addItem()}
                  loading={adding}
                  disabled={adding}
                />
              </View>
            </View>
            {formError ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                  alignItems: 'center',
                  backgroundColor: colors.dangerSoft,
                  borderRadius: radius.md,
                  padding: spacing.sm + 2,
                }}
              >
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={[type.label, { color: colors.danger, flex: 1 }]}>{formError}</Text>
              </View>
            ) : null}
          </CustomCard>
        </Animated.View>

        {/* Pending */}
        <View>
          <SectionHeader
            title={`Pending${pending.length ? ` · ${pending.length}` : ''}`}
            actionLabel={pending.length > 1 ? (allSelected ? 'Clear' : 'Select all') : undefined}
            onAction={pending.length > 1 ? toggleAll : undefined}
          />
          {pending.length === 0 ? (
            <CustomCard>
              <EmptyState
                icon="basket-outline"
                title="The list is clear"
                message="Add milk, rice or anything the flat needs. Select items when someone buys them to post a shared expense."
              />
            </CustomCard>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {pending.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={enterRise(index)}
                  exiting={exitFade}
                  layout={layoutSpring}
                >
                  <ShoppingItemRow
                    item={item}
                    selectable
                    selected={selectedIds.includes(item.id)}
                    onToggleSelect={() => toggleSelect(item.id)}
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </View>

        {/* Bought */}
        {bought.length > 0 ? (
          <View>
            <Pressable
              onPress={() => setShowBought((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showBought }}
              accessibilityLabel={`Bought items, ${bought.length}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: minTapTarget,
                gap: spacing.sm,
              }}
            >
              <Text style={[type.heading, { color: colors.text, fontSize: 18, flex: 1 }]}>
                Bought
              </Text>
              <StatusPill label={String(bought.length)} tone="success" size="sm" />
              <Ionicons
                name={showBought ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.muted}
              />
            </Pressable>
            {showBought ? (
              <Animated.View entering={enterFade} style={{ gap: spacing.sm }}>
                {bought.map((item) => (
                  <ShoppingItemRow key={item.id} item={item} />
                ))}
              </Animated.View>
            ) : null}
          </View>
        ) : null}
      </Screen>

      {/* Sticky checkout footer */}
      {footerVisible ? (
        <Animated.View
          entering={enterFade}
          exiting={exitFade}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.sm),
            backgroundColor: colors.card,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[type.caption, { color: colors.muted }]}>SELECTED</Text>
            <Text style={[type.label, { color: colors.text, fontSize: 15 }]}>
              {selectedIds.length === 0
                ? 'Tap items to select'
                : `${selectedIds.length} of ${pending.length} item${pending.length === 1 ? '' : 's'}`}
            </Text>
          </View>
          <CustomButton
            label={selectedIds.length > 0 ? `Checkout ${selectedIds.length}` : 'Checkout'}
            icon="bag-check-outline"
            onPress={() => setCheckoutOpen(true)}
            disabled={selectedIds.length === 0}
            style={{ minWidth: 150 }}
          />
        </Animated.View>
      ) : null}

      <ShoppingCheckoutSheet
        visible={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        members={members}
        items={items}
        selectedItemIds={selectedIds}
        onSuccess={() => {
          setSelectedIds([]);
          void load();
        }}
      />
    </View>
  );
}

function Stepper({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'add' | 'remove';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors, minTapTarget } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        width: minTapTarget,
        height: minTapTarget - 2,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
    </Pressable>
  );
}
