import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { useTheme } from '../../theme';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  subtitle,
  icon = 'chevron-down',
  expanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const { colors, spacing, type, radius, minTapTarget } = useTheme();

  return (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={title}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: minTapTarget + 4,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
          backgroundColor: expanded ? colors.primarySoft : colors.card,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        {icon ? (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              backgroundColor: expanded ? colors.card : colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={expanded ? 'create-outline' : icon}
              size={20}
              color={colors.primary}
            />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={[type.label, { color: colors.text, fontSize: 16 }]}>{title}</Text>
          {subtitle ? (
            <Text style={[type.caption, { color: colors.muted }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.muted}
        />
      </Pressable>
      {expanded ? (
        <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutUp.duration(160)}>
          <View style={{ padding: spacing.md, paddingTop: spacing.sm, gap: spacing.md }}>
            {children}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
