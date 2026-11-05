import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { File } from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomButton, CustomCard, EmptyState, StatusPill } from '../src/components/ui';
import { RECORDING_MIME, playBase64Audio, speak, stopSpeaking } from '../src/features/assistant/voice';
import { householdCoachVoice } from '../src/services/api/coach';
import { ApiError } from '../src/services/api/client';
import { useHouseholdStore } from '../src/store/household';
import { usePreferences } from '../src/store/preferences';
import { showToast } from '../src/store/toast';
import { useTheme } from '../src/theme';
import { createId, errorMessage } from '../src/utils/format';

type Phase = 'idle' | 'recording' | 'processing' | 'speaking';

interface VoiceTurn {
  id: string;
  transcript: string;
  answer: string;
  demo: boolean;
  createdAt: string;
}

export default function VoiceCoachScreen() {
  const { colors, spacing, type, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const activeMemberId = useHouseholdStore((s) => s.activeMemberId);
  const members = useHouseholdStore((s) => s.members);
  const loadMembers = useHouseholdStore((s) => s.loadMembers);
  const linkedMemberId = usePreferences((s) => s.linkedMemberId);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [phase, setPhase] = useState<Phase>('idle');
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<VoiceTurn>>(null);

  useEffect(() => {
    void loadMembers();
    return () => stopSpeaking();
  }, [loadMembers]);

  const memberId =
    linkedMemberId && members.some((m) => m.id === linkedMemberId)
      ? linkedMemberId
      : activeMemberId && members.some((m) => m.id === activeMemberId)
        ? activeMemberId
        : undefined;

  const memberName = members.find((m) => m.id === memberId)?.name ?? null;

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Allow microphone access in Settings to talk to GharSplit AI.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
    } catch (err) {
      setError(errorMessage(err, 'Could not start recording.'));
      setPhase('idle');
    }
  }, [recorder]);

  const stopAndAsk = useCallback(async () => {
    setPhase('processing');
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri) {
        setError('No audio captured. Tap the mic, speak, then tap again.');
        setPhase('idle');
        return;
      }

      const file = new File(uri);
      const audioBase64 = await file.base64();
      try {
        file.delete();
      } catch {
        // ignore
      }

      const result = await householdCoachVoice({
        audio_base64: audioBase64,
        mime_type: RECORDING_MIME,
        member_id: memberId,
      });

      const turn: VoiceTurn = {
        id: createId('v'),
        transcript: result.transcript.trim() || '(Could not transcribe — try speaking again.)',
        answer: result.text.trim() || 'No answer returned.',
        demo: result.demo,
        createdAt: new Date().toISOString(),
      };
      setTurns((prev) => [...prev, turn]);
      setError(null);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));

      if (result.audio_base64 && result.mime_type) {
        setPhase('speaking');
        await playBase64Audio(result.audio_base64, result.mime_type);
      } else if (result.text.trim()) {
        setPhase('speaking');
        await speak(result.text);
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : errorMessage(err, 'Voice request failed. Check API URL and Groq/Uplift keys.');
      setError(msg);
      showToast(msg, 'danger');
    } finally {
      setPhase('idle');
    }
  }, [memberId, recorder]);

  const toggleMic = useCallback(() => {
    if (phase === 'processing' || phase === 'speaking') return;
    if (phase === 'recording') void stopAndAsk();
    else void startRecording();
  }, [phase, startRecording, stopAndAsk]);

  const recording = phase === 'recording';
  const busy = phase === 'processing' || phase === 'speaking';
  const seconds = Math.floor((recorderState.durationMillis ?? 0) / 1000);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: insets.bottom + spacing.sm,
      }}
    >
      <View style={{ flex: 1 }}>
        <CustomCard tone="soft" style={{ marginBottom: spacing.md }}>
          <Text style={[type.body, { color: colors.muted, fontSize: 14 }]}>
            Tap the mic to start, speak your question about expenses or balances, then tap again.
            Answers use live ledger data and play through Uplift when configured.
          </Text>
          {memberName ? (
            <StatusPill label={`As ${memberName}`} tone="primary" size="sm" icon="person-outline" />
          ) : null}
        </CustomCard>

        {error ? (
          <Text style={[type.caption, { color: colors.danger, marginBottom: spacing.sm }]}>{error}</Text>
        ) : null}

        <FlatList
          ref={listRef}
          data={turns}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, gap: spacing.md, paddingBottom: spacing.md }}
          ListEmptyComponent={
            <EmptyState
              icon="mic-outline"
              title="Ask out loud"
              message='Try: "Who owes the most?" or "How much did we spend this month?"'
            />
          }
          renderItem={({ item }) => (
            <View style={{ gap: spacing.sm }}>
              <View
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '90%',
                  backgroundColor: colors.primarySoft,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                }}
              >
                <Text style={[type.caption, { color: colors.muted }]}>You said</Text>
                <Text style={[type.body, { color: colors.text }]}>{item.transcript}</Text>
              </View>
              <View
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '95%',
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                  gap: spacing.xs,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Text style={[type.caption, { color: colors.muted }]}>GharSplit AI</Text>
                  {item.demo ? <StatusPill label="Demo" tone="warning" size="sm" /> : null}
                </View>
                <Text style={[type.body, { color: colors.text }]} selectable>
                  {item.answer}
                </Text>
                <CustomButton
                  label="Listen again"
                  size="sm"
                  variant="ghost"
                  icon="volume-medium-outline"
                  onPress={() =>
                    void speak(item.answer).catch((e) =>
                      showToast(errorMessage(e, 'Could not play audio.'), 'info'),
                    )
                  }
                />
              </View>
            </View>
          )}
        />

        <View style={{ alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm }}>
          {recording ? (
            <Text style={[type.caption, { color: colors.danger }]}>
              Recording · {String(Math.floor(seconds / 60)).padStart(2, '0')}:
              {String(seconds % 60).padStart(2, '0')}
            </Text>
          ) : null}
          {phase === 'processing' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[type.label, { color: colors.muted }]}>Reading the ledger…</Text>
            </View>
          ) : null}
          {phase === 'speaking' ? (
            <Text style={[type.caption, { color: colors.primary }]}>Speaking…</Text>
          ) : null}

          <Pressable
            onPress={() => toggleMic()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={recording ? 'Stop and send question' : 'Start recording a question'}
            accessibilityState={{ disabled: busy, busy }}
            style={({ pressed }) => ({
              width: 88,
              height: 88,
              borderRadius: 44,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: recording ? colors.danger : colors.primary,
              opacity: busy ? 0.5 : pressed ? 0.88 : 1,
            })}
          >
            {busy && phase === 'processing' ? (
              <ActivityIndicator color={colors.primaryText} size="large" />
            ) : (
              <Ionicons
                name={recording ? 'stop' : 'mic'}
                size={36}
                color={colors.primaryText}
              />
            )}
          </Pressable>

          <CustomButton
            label="Text chat instead"
            variant="ghost"
            size="sm"
            icon="chatbubble-outline"
            onPress={() => router.push('/assistant')}
          />
        </View>
      </View>
    </View>
  );
}
