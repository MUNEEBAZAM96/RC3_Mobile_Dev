import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '../../theme';
import type { Member } from '../../types/household';
import { formatPkr } from '../../utils/currency';
import { initials } from '../../utils/format';
import type { SplitPreviewShare } from '../../utils/splitPreview';
import { enterFade, layoutSpring } from './motion';

interface SplitPreviewRowProps {
  shares: SplitPreviewShare[];
  members: Member[];
  payerId?: string | null;
}

/**
 * Compact "what each person will owe" strip. Preview only: the server computes the
 * authoritative split when the expense is posted. Mirrors the paisa rule so the numbers match.
 */
export function SplitPreviewRow({ shares, members, payerId }: SplitPreviewRowProps) {
  const { colors, spacing, type, radius } = useTheme();
  const nameFor = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  return (
    <Animated.View
      entering={enterFade}
      layout={layoutSpring}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.sm + 2,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="pie-chart-outline" size={13} color={colors.muted} />
        <Text style={[type.caption, { color: colors.muted }]}>SPLIT PREVIEW · PAISA-EXACT</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {shares.map((share) => {
          const isPayer = share.member_id === payerId;
          return (
            <View
              key={share.member_id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 4,
                paddingLeft: 4,
                paddingRight: 10,
                borderRadius: radius.full,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: isPayer ? colors.primary : colors.border,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: isPayer ? colors.primary : colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={[
                    type.caption,
                    { color: isPayer ? colors.primaryText : colors.primary, fontSize: 10 },
                  ]}
                >
                  {initials(nameFor(share.member_id))}
                </Text>
              </View>
              <Text style={[type.caption, { color: colors.text }]}>
                {nameFor(share.member_id)} {formatPkr(share.amount)}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}
