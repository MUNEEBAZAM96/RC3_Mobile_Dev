import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { StatusBadge } from '../ui';
import { useTheme } from '../../theme';
import type { ShoppingItem } from '../../types/household';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  selected?: boolean;
  selectable?: boolean;
  onToggleSelect?: () => void;
}

export function ShoppingItemRow({ item, selected, selectable, onToggleSelect }: ShoppingItemRowProps) {
  const { colors, spacing, type, minTapTarget } = useTheme();
  const tone = item.status === 'pending' ? 'warning' : 'success';
  const statusLabel = item.status === 'pending' ? 'Pending' : 'Bought';

  const row = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: minTapTarget,
        paddingVertical: spacing.sm,
      }}
    >
      {selectable ? (
        <Ionicons
          name={selected ? 'checkbox' : 'square-outline'}
          size={24}
          color={selected ? colors.primary : colors.muted}
        />
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.label, { color: colors.text }]}>{item.title}</Text>
        <Text style={[type.caption, { color: colors.muted }]}>
          {item.requested_qty} {item.unit}
        </Text>
      </View>
      <StatusBadge label={statusLabel} tone={tone} />
    </View>
  );

  if (selectable && onToggleSelect) {
    return (
      <Pressable onPress={onToggleSelect} accessibilityRole="checkbox" accessibilityState={{ checked: !!selected }}>
        {row}
      </Pressable>
    );
  }

  return row;
}
