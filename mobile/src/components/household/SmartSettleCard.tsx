import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CustomButton, CustomCard, EmptyState, StatusPill } from '../ui';
import { householdApi, isUnavailable } from '../../services/api/household';
import { useTheme } from '../../theme';
import type { Member, SettlementSuggestion } from '../../types/household';
import { formatPkr } from '../../utils/currency';
import { errorMessage, initials } from '../../utils/format';
import { enterRise, layoutSpring } from './motion';

interface SmartSettleCardProps {
  members: Member[];
  /** Called after any one-tap settlement succeeds so the parent can refresh balances. */
  onSettled: () => void;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; transfers: SettlementSuggestion[] }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string };

/**
 * Hour 3.5 · Option 1 — Minimal Debt Settlement Optimizer.
 * Fetches GET /api/balances/simplify and lets the user execute each transfer
 * through the existing POST /api/settle endpoint.
 */
export function SmartSettleCard({ members, onSettled }: SmartSettleCardProps) {
  const { colors, spacing, type, radius } = useTheme();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [settlingKey, setSettlingKey] = useState<string | null>(null);
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());
  const [rowError, setRowError] = useState<string | null>(null);

  const nameFor = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const keyOf = (t: SettlementSuggestion) => `${t.sender_id}->${t.recipient_id}:${t.amount}`;

  const fetchSuggestions = useCallback(async () => {
    setState({ kind: 'loading' });
    setRowError(null);
    setDoneKeys(new Set());
    try {
      const transfers = await householdApi.getSimplifiedSettlements();
      setState({ kind: 'ready', transfers });
    } catch (err) {
      if (isUnavailable(err)) setState({ kind: 'unavailable' });
      else setState({ kind: 'error', message: errorMessage(err, 'Could not fetch suggestions.') });
    }
  }, []);

  async function settle(transfer: SettlementSuggestion) {
    const key = keyOf(transfer);
    if (settlingKey) return;
    setSettlingKey(key);
    setRowError(null);
    try {
      await householdApi.settle({
        sender_id: transfer.sender_id,
        recipient_id: transfer.recipient_id,
        amount: transfer.amount,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDoneKeys((prev) => new Set(prev).add(key));
      onSettled();
    } catch (err) {
      setRowError(errorMessage(err, 'Settlement failed.'));
    } finally {
      setSettlingKey(null);
    }
  }

  return (
    <CustomCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.md,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="sparkles" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.heading, { fontSize: 18, color: colors.text }]}>Smart Settle</Text>
          <Text style={[type.caption, { color: colors.muted }]}>
            Fewest payments to clear every debt
          </Text>
        </View>
        {state.kind === 'ready' ? (
          <StatusPill
            label={`${state.transfers.length} transfer${state.transfers.length === 1 ? '' : 's'}`}
            tone="primary"
            size="sm"
          />
        ) : null}
      </View>

      {state.kind === 'idle' || state.kind === 'loading' ? (
        <CustomButton
          label="Smart Settle suggestions"
          icon="git-compare-outline"
          variant="secondary"
          onPress={() => void fetchSuggestions()}
          loading={state.kind === 'loading'}
          disabled={state.kind === 'loading'}
        />
      ) : null}

      {state.kind === 'unavailable' ? (
        <EmptyState
          compact
          icon="time-outline"
          title="Not switched on yet"
          message="The optimizer endpoint is not live on the server. Try again after it ships."
          actionLabel="Retry"
          onAction={() => void fetchSuggestions()}
        />
      ) : null}

      {state.kind === 'error' ? (
        <View style={{ gap: spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              alignItems: 'center',
              backgroundColor: colors.dangerSoft,
              borderRadius: radius.md,
              padding: spacing.sm + 2,
            }}
          >
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={[type.label, { color: colors.danger, flex: 1 }]}>{state.message}</Text>
          </View>
          <CustomButton
            label="Try again"
            variant="secondary"
            size="sm"
            onPress={() => void fetchSuggestions()}
          />
        </View>
      ) : null}

      {state.kind === 'ready' ? (
        <View style={{ gap: spacing.sm }}>
          {state.transfers.length === 0 ? (
            <EmptyState
              compact
              icon="checkmark-done-circle-outline"
              title="Everyone is square"
              message="No transfers needed. All household balances are PKR 0.00."
            />
          ) : (
            state.transfers.map((t, index) => {
              const key = keyOf(t);
              const busy = settlingKey === key;
              const done = doneKeys.has(key);
              return (
                <Animated.View
                  key={key}
                  entering={enterRise(index)}
                  layout={layoutSpring}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    padding: spacing.sm + 4,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: done ? colors.success : colors.border,
                    backgroundColor: done ? colors.successSoft : colors.surface,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Bubble label={initials(nameFor(t.sender_id))} tone="danger" />
                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color={colors.muted}
                      style={{ marginHorizontal: 2 }}
                    />
                    <Bubble label={initials(nameFor(t.recipient_id))} tone="success" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.label, { color: colors.text }]} numberOfLines={2}>
                      {nameFor(t.sender_id)} pays {nameFor(t.recipient_id)} {formatPkr(t.amount)}
                    </Text>
                    {done ? (
                      <Text style={[type.caption, { color: colors.success }]}>Recorded</Text>
                    ) : null}
                  </View>
                  {done ? (
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  ) : (
                    <CustomButton
                      label="One-tap settle"
                      size="sm"
                      onPress={() => void settle(t)}
                      loading={busy}
                      disabled={settlingKey !== null}
                    />
                  )}
                </Animated.View>
              );
            })
          )}
          {rowError ? (
            <Text style={[type.caption, { color: colors.danger }]}>{rowError}</Text>
          ) : null}
          <CustomButton
            label="Refresh suggestions"
            variant="ghost"
            size="sm"
            icon="refresh"
            onPress={() => void fetchSuggestions()}
            disabled={settlingKey !== null}
          />
        </View>
      ) : null}
    </CustomCard>
  );
}

function Bubble({ label, tone }: { label: string; tone: 'danger' | 'success' }) {
  const { colors, type, radius } = useTheme();
  const bg = tone === 'danger' ? colors.dangerSoft : colors.successSoft;
  const fg = tone === 'danger' ? colors.danger : colors.success;
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: radius.full,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={[type.caption, { color: fg }]}>{label}</Text>
    </View>
  );
}
