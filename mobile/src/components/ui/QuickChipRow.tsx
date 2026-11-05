import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useTheme } from '../../theme';

export interface QuickChipOption {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Secondary line under label (e.g. unit · qty). */
  sublabel?: string;
}

interface QuickChipRowProps {
  label?: string;
  options: QuickChipOption[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
  /** Highlight multiple selections (e.g. tax presets as toggles). */
  selectedIds?: string[];
}

export function QuickChipRow({ label, options, onSelect, selectedId, selectedIds }: QuickChipRowProps) {
  const { colors, spacing, type, radius, minTapTarget } = useTheme();

  const isSelected = (id: string) =>
    selectedId === id || (selectedIds !== undefined && selectedIds.includes(id));

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text style={[type.label, { color: colors.text }]}>{label}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}
        keyboardShouldPersistTaps="handled"
      >
        {options.map((opt) => {
          const active = isSelected(opt.id);
          return (
            <Pressable
              key={opt.id}
              onPress={() => onSelect(opt.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt.sublabel ? `${opt.label}, ${opt.sublabel}` : opt.label}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                minHeight: minTapTarget,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.full,
                borderWidth: 1.5,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primarySoft : colors.card,
                opacity: pressed ? 0.88 : 1,
                shadowColor: active ? colors.primary : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: active ? 0.12 : 0,
                shadowRadius: 4,
                elevation: active ? 2 : 0,
              })}
            >
              {opt.icon ? (
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: active ? colors.card : colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={opt.icon} size={16} color={active ? colors.primary : colors.muted} />
                </View>
              ) : null}
              <View>
                <Text
                  style={[
                    type.label,
                    { color: active ? colors.primary : colors.text, fontSize: 14 },
                  ]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
                {opt.sublabel ? (
                  <Text style={[type.caption, { color: colors.muted }]} numberOfLines={1}>
                    {opt.sublabel}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface AmountChipRowProps {
  label?: string;
  amounts: readonly number[];
  onSelect: (amount: number) => void;
  selectedAmount?: number | null;
  format?: (n: number) => string;
}

export function AmountChipRow({
  label = 'Quick amounts',
  amounts,
  onSelect,
  selectedAmount,
  format = (n) => String(n),
}: AmountChipRowProps) {
  const options: QuickChipOption[] = amounts.map((a) => ({
    id: String(a),
    label: format(a),
    icon: 'cash-outline',
  }));
  return (
    <QuickChipRow
      label={label}
      options={options}
      selectedId={selectedAmount != null ? String(selectedAmount) : null}
      onSelect={(id) => onSelect(Number(id))}
    />
  );
}
