import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { ShoppingCheckoutSheet, ShoppingItemRow } from '../../src/components/household';
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
} from '../../src/components/ui';
import { createShoppingItemSchema } from '../../src/features/household/schemas';
import { householdApi } from '../../src/services/api/household';
import { useHouseholdStore } from '../../src/store/household';
import { useTheme } from '../../src/theme';
import { SHOPPING_UNITS, type ShoppingItem, type ShoppingUnit } from '../../src/types/household';
import { errorMessage } from '../../src/utils/format';

export default function ShoppingScreen() {
  const { colors, spacing, type } = useTheme();
  const { members, loadMembers } = useHouseholdStore();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState<ShoppingUnit>('pack');
  const [qty, setQty] = useState('1');
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const pending = useMemo(() => items.filter((i) => i.status === 'pending'), [items]);
  const bought = useMemo(() => items.filter((i) => i.status === 'bought'), [items]);

  const load = useCallback(async () => {
    setError(null);
    try {
      await loadMembers();
      const list = await householdApi.getShopping();
      setItems(list);
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

  async function addItem() {
    const parsed = createShoppingItemSchema.safeParse({ title, unit, requested_qty: qty });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Check the form.');
      return;
    }
    setAdding(true);
    setFormError(null);
    try {
      await householdApi.createShoppingItem(parsed.data);
      setTitle('');
      setQty('1');
      await load();
    } catch (err) {
      setFormError(errorMessage(err, 'Could not add item.'));
    } finally {
      setAdding(false);
    }
  }

  function openCheckout() {
    if (selectedIds.length === 0) return;
    setCheckoutOpen(true);
  }

  if (loading && items.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Screen
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load();
        }}
      >
        <AppHeader title="Shopping" subtitle="List, add items, and checkout" />
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        <CustomCard>
          <SectionHeader title="Add item" />
          <InputField label="Title" value={title} onChangeText={setTitle} placeholder="Milk" />
          <Text style={[type.label, { color: colors.text, marginTop: spacing.sm }]}>Unit</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {SHOPPING_UNITS.map((u) => (
              <CustomButton key={u} label={u} variant={unit === u ? 'primary' : 'secondary'} onPress={() => setUnit(u)} />
            ))}
          </View>
          <InputField label="Requested quantity" value={qty} onChangeText={setQty} keyboardType="number-pad" />
          {formError ? <Text style={{ color: colors.danger }}>{formError}</Text> : null}
          <CustomButton label="Add to list" onPress={() => void addItem()} loading={adding} disabled={adding} />
        </CustomCard>

        <SectionHeader title="Pending" />
        {pending.length === 0 ? (
          <EmptyState title="No pending items" message="Add groceries or supplies above." />
        ) : (
          pending.map((item) => (
            <CustomCard key={item.id}>
              <ShoppingItemRow
                item={item}
                selectable
                selected={selectedIds.includes(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
              />
            </CustomCard>
          ))
        )}

        <CustomButton
          label="Checkout selected"
          onPress={openCheckout}
          disabled={selectedIds.length === 0}
        />

        {bought.length > 0 ? (
          <>
            <SectionHeader title="Bought" />
            {bought.map((item) => (
              <CustomCard key={item.id}>
                <ShoppingItemRow item={item} />
              </CustomCard>
            ))}
          </>
        ) : null}
      </Screen>

      <ShoppingCheckoutSheet
        visible={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        members={members}
        selectedItemIds={selectedIds}
        onSuccess={() => {
          setSelectedIds([]);
          void load();
        }}
      />
    </>
  );
}
