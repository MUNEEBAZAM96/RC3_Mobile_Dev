import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme';

export function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]} accessibilityLabel={label}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ color: colors.muted, marginTop: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
