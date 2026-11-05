import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

import { householdApi } from '../../services/api/household';
import { useTheme } from '../../theme';
import type { HouseholdExpense, Member } from '../../types/household';
import { formatPkr } from '../../utils/currency';
import { errorMessage } from '../../utils/format';
import { CustomButton, CustomCard, EmptyState, ListRow, StatusPill } from '../ui';

interface ExpenseProofListProps {
  members: Member[];
  /** Increment to refetch (e.g. after parent pull-to-refresh). */
  refreshNonce?: number;
}

interface ProofModalState {
  title: string;
  url: string;
}

export function ExpenseProofList({ members, refreshNonce = 0 }: ExpenseProofListProps) {
  const { colors, spacing, type, radius, minTapTarget } = useTheme();
  const [expenses, setExpenses] = useState<HouseholdExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proofModal, setProofModal] = useState<ProofModalState | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const memberName = useCallback(
    (id: string) => members.find((m) => m.id === id)?.name ?? id,
    [members],
  );

  const loadExpenses = useCallback(async () => {
    setError(null);
    try {
      setExpenses(await householdApi.getExpenses());
    } catch (err) {
      setError(errorMessage(err, 'Could not load expenses.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses, refreshNonce]);

  function openProof(expense: HouseholdExpense) {
    if (!expense.proof_url) {
      return;
    }
    setImageError(false);
    setImageLoading(true);
    setProofModal({ title: expense.title, url: expense.proof_url });
  }

  if (loading && expenses.length === 0) {
    return (
      <CustomCard>
        <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </CustomCard>
    );
  }

  if (error && expenses.length === 0) {
    return (
      <CustomCard>
        <Text style={[type.body, { color: colors.danger, padding: spacing.md }]}>{error}</Text>
        <CustomButton label="Retry" variant="secondary" onPress={() => void loadExpenses()} />
      </CustomCard>
    );
  }

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon="receipt-outline"
        title="No expenses yet"
        message="Log a shared bill above. Payment proof is optional."
      />
    );
  }

  return (
    <>
      <CustomCard flush>
        {expenses.map((expense, index) => (
          <View
            key={expense.id}
            style={{
              borderBottomWidth: index < expenses.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
              paddingHorizontal: spacing.md,
            }}
          >
            <ListRow
              title={expense.title}
              subtitle={`${formatPkr(expense.amount)} · ${expense.expense_date} · ${memberName(expense.payer_id)} · ${expense.category}`}
              leading={
                <Ionicons name="receipt-outline" size={22} color={colors.muted} />
              }
              trailing={
                expense.proof_url ? (
                  <Pressable
                    onPress={() => openProof(expense)}
                    accessibilityRole="button"
                    accessibilityLabel={`View payment proof for ${expense.title}`}
                    style={{
                      minHeight: minTapTarget,
                      minWidth: minTapTarget,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <StatusPill label="View proof" tone="primary" icon="camera-outline" />
                  </Pressable>
                ) : (
                  <Text style={[type.caption, { color: colors.muted }]}>No proof</Text>
                )
              }
            />
          </View>
        ))}
      </CustomCard>

      <Modal
        visible={proofModal != null}
        animationType="fade"
        transparent
        onRequestClose={() => setProofModal(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.85)',
            justifyContent: 'center',
            padding: spacing.md,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close payment proof"
            onPress={() => setProofModal(null)}
            style={{
              position: 'absolute',
              top: spacing.xl,
              right: spacing.md,
              minHeight: minTapTarget,
              minWidth: minTapTarget,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 2,
            }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {proofModal ? (
            <View style={{ gap: spacing.sm }}>
              <Text
                style={[type.heading, { color: '#fff', textAlign: 'center' }]}
                accessibilityLabel={`Payment proof for ${proofModal.title}`}
              >
                {proofModal.title}
              </Text>
              {imageError ? (
                <Text style={[type.body, { color: colors.danger, textAlign: 'center' }]}>
                  Could not load image.
                </Text>
              ) : (
                <View
                  style={{
                    borderRadius: radius.md,
                    overflow: 'hidden',
                    minHeight: 240,
                    justifyContent: 'center',
                  }}
                >
                  {imageLoading ? (
                    <ActivityIndicator color="#fff" style={{ marginVertical: spacing.lg }} />
                  ) : null}
                  <Image
                    source={{ uri: proofModal.url }}
                    style={{ width: '100%', height: 420, resizeMode: 'contain' }}
                    onLoadEnd={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                  />
                </View>
              )}
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}
