import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

import { textToSpeech, transcribeAudio } from '../../services/ai';

/** MIME type for the m4a/AAC file produced by `RecordingPresets.HIGH_QUALITY`. */
export const RECORDING_MIME = 'audio/m4a';

/** Reads a recorded file and sends it to POST /api/v1/ai/transcribe. Returns the spoken words. */
export async function transcribeRecording(uri: string): Promise<string> {
  const file = new File(uri);
  const base64 = await file.base64();
  const result = await transcribeAudio(base64, RECORDING_MIME);
  try {
    file.delete();
  } catch {
    // Cache cleanup is best effort.
  }
  return result.text.trim();
}

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

/**
 * Speaks assistant text through POST /api/v1/ai/speech. Writes the returned MP3 to the cache
 * directory and plays it. Resolves when playback finishes; rejects on API or playback errors.
 */
export async function speak(text: string): Promise<void> {
  stopSpeaking();
  const { audio_base64, mime_type } = await textToSpeech(text.slice(0, 4000));
  const extension = mime_type.includes('wav') ? 'wav' : mime_type.includes('ogg') ? 'ogg' : 'mp3';
  const file = new File(Paths.cache, `gharsplit-tts-${Date.now()}.${extension}`);
  await file.write(audio_base64, { encoding: 'base64' });

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
