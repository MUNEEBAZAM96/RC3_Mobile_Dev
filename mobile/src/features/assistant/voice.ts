import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

import { fetchApiHealth, householdCoachSpeak, householdCoachVoiceIn } from '../../services/api/coach';
import { ApiError } from '../../services/api/client';
import { textToSpeech, transcribeAudio } from '../../services/ai';

/** MIME type for the m4a/AAC file produced by `RecordingPresets.HIGH_QUALITY`. */
export const RECORDING_MIME = 'audio/m4a';

let activePlayer: AudioPlayer | null = null;

export function stopSpeaking(): void {
  if (!activePlayer) return;
  try {
    activePlayer.pause();
    activePlayer.remove();
  } catch {
    // Player may already be released.
  }
  activePlayer = null;
}

/** Play MP3 (or other) returned from Uplift / coach voice endpoints. */
export async function playBase64Audio(audioBase64: string, mimeType: string): Promise<void> {
  const extension = mimeType.includes('wav') ? 'wav' : mimeType.includes('ogg') ? 'ogg' : 'mp3';
  const file = new File(Paths.cache, `gharsplit-tts-${Date.now()}.${extension}`);
  await file.write(audioBase64, { encoding: 'base64' });

  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
  const player = createAudioPlayer(file.uri);
  activePlayer = player;

  await new Promise<void>((resolve) => {
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        subscription.remove();
        resolve();
      }
    });
    player.play();
  });

  if (activePlayer === player) {
    player.remove();
    activePlayer = null;
  }
  try {
    file.delete();
  } catch {
    // Best effort.
  }
}

/** Transcribe via public household-coach voice-in (Groq); falls back to authenticated /api/v1/ai/transcribe. */
export async function transcribeRecording(uri: string): Promise<string> {
  const file = new File(uri);
  const base64 = await file.base64();
  try {
    file.delete();
  } catch {
    // Cache cleanup is best effort.
  }

  const coach = await householdCoachVoiceIn(base64, RECORDING_MIME);
  if (!coach.demo && coach.transcript.trim().length > 0) {
    return coach.transcript.trim();
  }

  const result = await transcribeAudio(base64, RECORDING_MIME);
  return result.text.trim();
}

/**
 * Speaks assistant text via Uplift (POST /api/v1/ai/household-coach/speak) when configured.
 * Does not silently fall back to signed-in /api/v1/ai/speech on Uplift errors.
 */
export async function speak(text: string): Promise<void> {
  stopSpeaking();
  const trimmed = text.slice(0, 4000);
  if (!trimmed) return;

  const health = await fetchApiHealth();
  if (health.ai?.uplift) {
    const uplift = await householdCoachSpeak(trimmed);
    await playBase64Audio(uplift.audio_base64, uplift.mime_type);
    return;
  }

  try {
    const legacy = await textToSpeech(trimmed);
    await playBase64Audio(legacy.audio_base64, legacy.mime_type);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      throw new ApiError(
        'Voice playback needs UPLIFT_API_KEY on the server, or sign in for legacy speech.',
        503,
        'AI_NOT_CONFIGURED',
      );
    }
    throw err;
  }
}
