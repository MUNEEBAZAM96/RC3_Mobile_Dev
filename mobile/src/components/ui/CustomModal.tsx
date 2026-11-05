import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../../theme';

interface CustomModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function CustomModal({ visible, title, onClose, children }: CustomModalProps) {
  const { colors, spacing } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close dialog">
        <Pressable
          style={[styles.card, { backgroundColor: colors.card, padding: spacing.lg, gap: spacing.md }]}
          onPress={() => undefined}
        >
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>
            {title}
          </Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 16 },
});
