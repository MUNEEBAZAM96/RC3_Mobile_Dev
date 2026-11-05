import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { StatusPill } from '../ui';
import { useTheme } from '../../theme';
import type { ShoppingItem } from '../../types/household';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  selected?: boolean;
  selectable?: boolean;
  onToggleSelect?: () => void;
}

const UNIT_ICON: Record<ShoppingItem['unit'], keyof typeof Ionicons.glyphMap> = {
  pack: 'cube-outline',
  dozen: 'egg-outline',
  bottle: 'water-outline',
  bag: 'bag-handle-outline',
};

export function ShoppingItemRow({
  item,
  selected,
  selectable,
  onToggleSelect,
}: ShoppingItemRowProps) {
  const { colors, spacing, type, minTapTarget, radius } = useTheme();
  const bought = item.status === 'bought';
  const interactive = Boolean(selectable && onToggleSelect);

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: minTapTarget + 8,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: selected ? colors.primarySoft : 'transparent',
      }}
    >
      {interactive ? (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: radius.full,
            borderWidth: 2,
            borderColor: selected ? colors.primary : colors.muted,
            backgroundColor: selected ? colors.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected ? <Ionicons name="checkmark" size={16} color={colors.primaryText} /> : null}
        </View>
      ) : (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.md,
            backgroundColor: bought ? colors.successSoft : colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={UNIT_ICON[item.unit] ?? 'cube-outline'}
            size={18}
            color={bought ? colors.success : colors.muted}
          />
        </View>
      )}

      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={[
            type.label,
            {
              fontSize: 15,
              color: bought ? colors.muted : colors.text,
              textDecorationLine: bought ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text style={[type.caption, { color: colors.muted }]}>
          {item.requested_qty} × {item.unit}
        </Text>
      </View>

      <StatusPill
        label={bought ? 'Bought' : 'Pending'}
        tone={bought ? 'success' : 'warning'}
        size="sm"
        icon={bought ? 'checkmark-circle' : 'time-outline'}
      />
    </View>
  );

  if (interactive) {
    return (
      <Pressable
        onPress={onToggleSelect}
        accessibilityRole="checkbox"
        accessibilityLabel={`${item.title}, ${item.requested_qty} ${item.unit}`}
        accessibilityState={{ checked: !!selected }}
        style={({ pressed }) => ({
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        })}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
