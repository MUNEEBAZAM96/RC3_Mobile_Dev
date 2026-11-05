import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNetwork } from '../../store/network';
import { useTheme } from '../../theme';

export function NetworkBanner() {
  const { status, pending, notice, syncNow } = useNetwork();
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const color = status === 'offline' ? '#B91C1C' : status === 'syncing' ? '#B45309' : '#047857';
  const label = status === 'offline' ? 'Offline' : status === 'syncing' ? 'Syncing' : 'Online';
  const text = pending > 0 ? `${label} · ${pending} pending` : label;

  return (
    <View style={[styles.banner, { paddingTop: insets.top, backgroundColor: color, paddingHorizontal: spacing.md }]}>
      <Text style={styles.text} accessibilityRole="summary" accessibilityLabel={`Connection status: ${text}`}>
        {text}
      </Text>
      {pending > 0 ? (
        <Pressable onPress={() => void syncNow()} accessibilityRole="button" accessibilityLabel="Sync pending actions">
          <Text style={styles.sync}>Sync</Text>
        </Pressable>
      ) : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { paddingBottom: 4, alignItems: 'center' },
  text: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  sync: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline', marginTop: 2 },
  notice: { color: '#FFFFFF', fontSize: 12, textAlign: 'center', marginTop: 2 },
});
