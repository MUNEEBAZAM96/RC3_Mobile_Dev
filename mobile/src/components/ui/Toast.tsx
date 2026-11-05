import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast, type ToastTone } from '../../store/toast';
import { cardShadow, useTheme, type ThemeColors } from '../../theme';

function palette(
  colors: ThemeColors,
  tone: ToastTone,
): { background: string; text: string; icon: keyof typeof Ionicons.glyphMap } {
  if (tone === 'danger')
    return { background: colors.dangerSoft, text: colors.danger, icon: 'alert-circle' };
  if (tone === 'info')
    return { background: colors.primarySoft, text: colors.primary, icon: 'information-circle' };
  return { background: colors.successSoft, text: colors.success, icon: 'checkmark-circle' };
}

/**
 * Single transient banner driven by the toast store. Mount once (root shell). Sits just under
 * the status bar / network banner and never blocks touches outside itself.
 */
export function Toast() {
  const { current, hide } = useToast();
  const { colors, spacing, radius, type } = useTheme();
  const insets = useSafeAreaInsets();

  if (!current) return null;
  const tone = palette(colors, current.tone);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { top: insets.top + 36, paddingHorizontal: spacing.md }]}
    >
      <Animated.View
        key={current.id}
        entering={FadeInUp.duration(220).reduceMotion(ReduceMotion.System)}
        exiting={FadeOutUp.duration(160).reduceMotion(ReduceMotion.System)}
        style={[cardShadow(4), { borderRadius: radius.lg, overflow: 'hidden' }]}
      >
        <Pressable
          onPress={hide}
          accessibilityRole="alert"
          accessibilityLabel={current.message}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            minHeight: 48,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            backgroundColor: tone.background,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name={tone.icon} size={20} color={tone.text} />
          <Text style={[type.label, { color: tone.text, flex: 1, fontSize: 14 }]} numberOfLines={2}>
            {current.message}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, zIndex: 50, elevation: 50 },
});
