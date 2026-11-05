import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { transcribeRecording } from '../../features/assistant/voice';
import { ApiError } from '../../services/api/client';
import { useTheme } from '../../theme';
import { errorMessage } from '../../utils/format';
import { enterFade, exitFade } from '../household/motion';

interface VoiceCoachButtonProps {
  /** Receives the transcript. The parent decides whether to auto-send or prefill. */
  onTranscript: (text: string) => void;
  /** Surface problems (permission denied, AI not configured) without crashing. */
  onError: (message: string) => void;
  disabled?: boolean;
  size?: number;
}

type Phase = 'idle' | 'recording' | 'transcribing';

/**
 * Tap to record, tap again to stop. Audio is transcribed through the existing
 * POST /api/v1/ai/transcribe route; no provider SDK runs on the phone.
 */
export function VoiceCoachButton({
  onTranscript,
  onError,
  disabled,
  size = 56,
}: VoiceCoachButtonProps) {
  const { colors, radius, type, spacing } = useTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [phase, setPhase] = useState<Phase>('idle');

  const recording = phase === 'recording';
  const busy = phase === 'transcribing';

  async function start() {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        onError(
          'Microphone permission was denied. Allow it in system settings to talk to the assistant.',
        );
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
    } catch (err) {
      setPhase('idle');
      onError(errorMessage(err, 'Could not start recording.'));
    }
  }

  async function stop() {
    setPhase('transcribing');
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri) {
        onError('No audio was captured. Try again and speak for a second or two.');
        return;
      }
      const text = await transcribeRecording(uri);
      if (!text) {
        onError('I could not make out any words. Try again a little closer to the mic.');
        return;
      }
      onTranscript(text);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        onError('Voice needs a provider key on the API server. Text chat still works.');
      } else if (err instanceof ApiError && err.status === 401) {
        onError('Sign in to use voice. The AI routes are protected on the server.');
      } else {
        onError(errorMessage(err, 'Transcription failed.'));
      }
    } finally {
      setPhase('idle');
    }
  }

  const seconds = Math.floor((recorderState.durationMillis ?? 0) / 1000);

  return (
    <View style={{ alignItems: 'center', gap: spacing.xs }}>
      {recording ? (
        <Animated.View
          entering={enterFade}
          exiting={exitFade}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: colors.dangerSoft,
            borderRadius: radius.full,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }} />
          <Text style={[type.caption, { color: colors.danger }]}>
            Listening · {String(Math.floor(seconds / 60)).padStart(2, '0')}:
            {String(seconds % 60).padStart(2, '0')}
          </Text>
        </Animated.View>
      ) : null}
      <Pressable
        onPress={() => void (recording ? stop() : start())}
        disabled={disabled || busy}
        accessibilityRole="button"
        accessibilityLabel={recording ? 'Stop recording and transcribe' : 'Record a voice question'}
        accessibilityState={{ disabled: disabled || busy, busy }}
        style={({ pressed }) => ({
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: recording ? colors.danger : colors.primary,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.96 : recording ? 1.05 : 1 }],
        })}
      >
        {busy ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Ionicons
            name={recording ? 'stop' : 'mic'}
            size={size * 0.42}
            color={colors.primaryText}
          />
        )}
      </Pressable>
    </View>
  );
}
