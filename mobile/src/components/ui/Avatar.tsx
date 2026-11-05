import { StyleSheet, Text, View } from 'react-native';

import { initials } from '../../utils/format';
import { useTheme } from '../../theme';

export function Avatar({ label, size = 40 }: { label: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel={label}
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary },
      ]}
    >
      <Text style={{ color: colors.primaryText, fontWeight: '700', fontSize: size * 0.36 }}>{initials(label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
