import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '../../theme';
import type { Member } from '../../types/household';
import { initials } from '../../utils/format';
import { layoutSpring } from './motion';

interface MemberChipProps {
  member: Member;
  active: boolean;
  onPress: () => void;
  multi?: boolean;
  compact?: boolean;
}

function MemberChip({ member, active, onPress, multi, compact }: MemberChipProps) {
  const { colors, spacing, type, minTapTarget, radius } = useTheme();
  const avatarSize = compact ? 24 : 28;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityLabel={member.name}
      accessibilityState={multi ? { checked: active } : { selected: active }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: compact ? 40 : minTapTarget,
        paddingLeft: compact ? 6 : spacing.sm,
        paddingRight: spacing.md,
        borderRadius: radius.full,
        backgroundColor: active ? colors.primary : colors.card,
        borderWidth: 1.5,
        borderColor: active ? colors.primary : colors.border,
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? colors.primaryText : colors.primarySoft,
        }}
      >
        {multi && active ? (
          <Ionicons name="checkmark" size={16} color={colors.primary} />
        ) : (
          <Text style={[type.caption, { color: colors.primary }]}>{initials(member.name)}</Text>
        )}
      </View>
      <Text style={[type.label, { color: active ? colors.primaryText : colors.text }]}>
        {member.name}
      </Text>
    </Pressable>
  );
}

interface MemberSegmentedControlProps {
  members: Member[];
  activeMemberId: string | null;
  onSelect: (memberId: string) => void;
  compact?: boolean;
}

/** Single-select member picker. Used for "viewing as", payer, sender, recipient. */
export function MemberSegmentedControl({
  members,
  activeMemberId,
  onSelect,
  compact,
}: MemberSegmentedControlProps) {
  const { spacing } = useTheme();
  return (
    <Animated.View
      layout={layoutSpring}
      accessibilityRole="radiogroup"
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
    >
      {members.map((member) => (
        <MemberChip
          key={member.id}
          member={member}
          active={member.id === activeMemberId}
          onPress={() => onSelect(member.id)}
          compact={compact}
        />
      ))}
    </Animated.View>
  );
}

interface MemberToggleChipsProps {
  members: Member[];
  selectedIds: string[];
  onToggle: (memberId: string) => void;
  compact?: boolean;
}

/** Multi-select member picker. Used for "split between". */
export function MemberToggleChips({
  members,
  selectedIds,
  onToggle,
  compact,
}: MemberToggleChipsProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {members.map((member) => (
        <MemberChip
          key={member.id}
          member={member}
          multi
          active={selectedIds.includes(member.id)}
          onPress={() => onToggle(member.id)}
          compact={compact}
        />
      ))}
    </View>
  );
}
