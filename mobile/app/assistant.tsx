import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AssistantHeader,
  ChatComposer,
  ChatMessageList,
  QuickPromptChips,
  VoiceCoachButton,
  type ChatMessage,
} from '../src/components/assistant';
import {
  CustomButton,
  CustomCard,
  EmptyState,
  LoadingScreen,
  StatusPill,
} from '../src/components/ui';
import {
  buildSystemPrompt,
  fetchHouseholdSnapshot,
  QUICK_PROMPTS,
  type HouseholdSnapshot,
} from '../src/features/assistant/context';
import { speak, stopSpeaking } from '../src/features/assistant/voice';
import { useSession } from '../src/features/auth/session';
import { chatWithAI } from '../src/services/ai';
import { ApiError } from '../src/services/api/client';
import { useHouseholdStore } from '../src/store/household';
import { usePreferences } from '../src/store/preferences';
import { showToast } from '../src/store/toast';
import { useTheme } from '../src/theme';
import { formatPkr } from '../src/utils/currency';
import { createId, errorMessage } from '../src/utils/format';

const MAX_TURNS = 6;
const HEADER_HEIGHT_IOS = 64;

function assistantErrorText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403)
      return 'Sign in to use the assistant. The AI route is protected on the server.';
    if (err.status === 0) return `${err.message} Then come back and ask again.`;
    if (err.status === 503) return 'Could not reach AI. Check API keys on the server.';
    return `Could not reach AI. ${err.message}`;
  }
  return `Could not reach AI. ${errorMessage(err, 'Check API keys on the server.')}`;
}

export default function AssistantScreen() {
  const { colors, spacing, type } = useTheme();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useSession();
  const activeMemberId = useHouseholdStore((s) => s.activeMemberId);
  const linkedMemberId = usePreferences((s) => s.linkedMemberId);

  const [snapshot, setSnapshot] = useState<HouseholdSnapshot | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const loadSnapshot = useCallback(async (): Promise<HouseholdSnapshot | null> => {
    setRefreshing(true);
    try {
      const next = await fetchHouseholdSnapshot();
      setSnapshot(next);
      setSnapshotError(null);
      return next;
    } catch (err) {
      setSnapshotError(errorMessage(err, 'Could not load household data.'));
      return null;
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
    return () => stopSpeaking();
  }, [loadSnapshot]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || sending) return;
      setDraft('');
      const userMessage: ChatMessage = {
        id: createId('u'),
        role: 'user',
        text,
        createdAt: new Date().toISOString(),
      };
      const history = [...messages, userMessage];
      setMessages(history);
      setSending(true);
      scrollToEnd();

      try {
        // Fresh data before every send so balances posted a second ago are included.
        const live = (await fetchHouseholdSnapshot().catch(() => snapshot)) ?? snapshot;
        if (live) setSnapshot(live);
        if (!live)
          throw new ApiError(
            'Household data is unavailable. Check the API address in Settings.',
            0,
            null,
          );

        const system = buildSystemPrompt(live, { viewingMemberId: activeMemberId, linkedMemberId });
        const turns = history.filter((m) => !m.error).slice(-MAX_TURNS * 2);
        const reply = await chatWithAI([
          { role: 'system', content: system },
          ...turns.map((m) => ({ role: m.role, content: m.text })),
        ]);
        setDemoMode(reply.demo);
        setMessages((prev) => [
          ...prev,
          {
            id: createId('a'),
            role: 'assistant',
            text: reply.text.trim() || 'I have nothing to add on that.',
            createdAt: new Date().toISOString(),
            demo: reply.demo,
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: createId('e'),
            role: 'assistant',
            text: assistantErrorText(err),
            createdAt: new Date().toISOString(),
            error: true,
          },
        ]);
      } finally {
        setSending(false);
        scrollToEnd();
      }
    },
    [activeMemberId, linkedMemberId, messages, scrollToEnd, sending, snapshot],
  );

  async function listen(message: ChatMessage) {
    setSpeakingId(message.id);
    try {
      await speak(message.text);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503)
        showToast('Speech needs a provider key on the API server.', 'info');
      else showToast(errorMessage(err, 'Could not play audio.'), 'danger');
    } finally {
      setSpeakingId((current) => (current === message.id ? null : current));
    }
  }

  function stopListening() {
    stopSpeaking();
    setSpeakingId(null);
  }

  if (!snapshot && !snapshotError) {
    return <LoadingScreen label="Reading the flat ledger" />;
  }

  const speakingTo =
    snapshot?.members.find((m) => m.id === (linkedMemberId ?? activeMemberId))?.name ?? null;
  const bottomPad = Math.max(insets.bottom, spacing.sm);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? HEADER_HEIGHT_IOS + insets.top : 0}
    >
      <AssistantHeader
        speakingTo={speakingTo}
        fetchedAt={snapshot?.fetchedAt ?? null}
        refreshing={refreshing}
        onRefresh={() => void loadSnapshot()}
        demoMode={demoMode}
      />

      <ChatMessageList
        ref={listRef}
        messages={messages}
        pending={sending}
        speakingId={speakingId}
        onListen={(m) => void listen(m)}
        onStopListening={stopListening}
        bottomInset={0}
        header={
          <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            {snapshotError ? (
              <CustomCard>
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                  <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
                  <Text style={[type.label, { color: colors.danger, flex: 1 }]}>
                    {snapshotError}
                  </Text>
                </View>
                <CustomButton
                  label="Retry"
                  size="sm"
                  variant="secondary"
                  onPress={() => void loadSnapshot()}
                  loading={refreshing}
                  disabled={refreshing}
                />
              </CustomCard>
            ) : null}
            {!isSignedIn ? (
              <CustomCard tone="soft">
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                  <Text style={[type.body, { color: colors.text, flex: 1, fontSize: 14 }]}>
                    The AI route needs an account. Sign in once; the ledger itself stays open to
                    everyone.
                  </Text>
                </View>
                <CustomButton
                  label="Sign in"
                  size="sm"
                  icon="log-in-outline"
                  onPress={() => router.push('/login')}
                />
              </CustomCard>
            ) : null}
            {snapshot ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <StatusPill
                  label={`${formatPkr(snapshot.budget.total_spending)} spent`}
                  tone="neutral"
                  size="sm"
                  icon="wallet-outline"
                />
                <StatusPill
                  label={`${formatPkr(snapshot.budget.remaining)} left`}
                  tone={/near/i.test(snapshot.budget.status) ? 'warning' : 'success'}
                  size="sm"
                />
                <StatusPill
                  label={`${snapshot.pendingItems} pending item${snapshot.pendingItems === 1 ? '' : 's'}`}
                  tone="primary"
                  size="sm"
                  icon="cart-outline"
                />
              </View>
            ) : null}
          </View>
        }
        empty={
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title="Ask about your flat's spending and balances"
              message="Answers come from the live ledger. Try a quick question below, type your own, or hold the mic."
            />
          </View>
        }
      />

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
          paddingTop: spacing.sm,
          paddingBottom: bottomPad,
          gap: spacing.sm,
        }}
      >
        <QuickPromptChips prompts={QUICK_PROMPTS} onPick={(p) => void send(p)} disabled={sending} />
        <ChatComposer
          value={draft}
          onChangeText={setDraft}
          onSend={() => void send(draft)}
          sending={sending}
          leading={
            draft.trim().length === 0 ? (
              <VoiceCoachButton
                size={48}
                disabled={sending}
                onTranscript={(text) => void send(text)}
                onError={(message) => showToast(message, 'info')}
              />
            ) : null
          }
        />
        <Text
          style={[
            type.caption,
            { color: colors.muted, textAlign: 'center', paddingHorizontal: spacing.md },
          ]}
        >
          Suggestions only, not financial advice. Balances always come from the API.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
