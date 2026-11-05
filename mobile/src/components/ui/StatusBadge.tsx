import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type ThemeColors } from '../../theme';

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { colors } = useTheme();
  const palette = toneColor(colors, tone);
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function toneColor(colors: ThemeColors, tone: Tone): { background: string; text: string } {
  if (tone === 'success') return { background: colors.surface, text: colors.success };
  if (tone === 'warning') return { background: colors.surface, text: colors.warning };
  if (tone === 'danger') return { background: colors.surface, text: colors.danger };
  return { background: colors.surface, text: colors.muted };
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: 13, fontWeight: '700' },
});
