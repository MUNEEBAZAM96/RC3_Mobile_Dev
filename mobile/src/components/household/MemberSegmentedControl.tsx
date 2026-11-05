import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../../theme';
import type { Member } from '../../types/household';

interface MemberSegmentedControlProps {
  members: Member[];
  activeMemberId: string | null;
  onSelect: (memberId: string) => void;
}

export function MemberSegmentedControl({ members, activeMemberId, onSelect }: MemberSegmentedControlProps) {
  const { colors, spacing, type, minTapTarget, radius } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {members.map((member) => {
        const active = member.id === activeMemberId;
        return (
          <Pressable
            key={member.id}
            onPress={() => onSelect(member.id)}
            accessibilityRole="button"
            accessibilityLabel={`Active member ${member.name}`}
            accessibilityState={{ selected: active }}
            style={{
              minHeight: minTapTarget,
              paddingHorizontal: spacing.md,
              justifyContent: 'center',
              borderRadius: radius.md,
              backgroundColor: active ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
            }}
          >
            <Text style={[type.label, { color: active ? colors.primaryText : colors.text }]}>{member.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
