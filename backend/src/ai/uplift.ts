import { loadConfig } from '../config';
import { AppError } from '../http/errors';

const UPLIFT_TTS_URL = 'https://api.upliftai.org/v1/synthesis/text-to-speech';
const MAX_TTS_CHARS = 800;

export function hasUpliftKey(): boolean {
  return Boolean(loadConfig().upliftApiKey);
}

function requireUpliftKey(): string {
  const key = loadConfig().upliftApiKey;
  if (!key) {
    throw new AppError(503, 'AI_NOT_CONFIGURED', 'Set UPLIFT_API_KEY on the server.');
  }
  return key;
}

export async function upliftTextToSpeech(text: string): Promise<{
  audioBase64: string;
  mimeType: string;
  durationMs?: number;
}> {
  const config = loadConfig();
  const apiKey = requireUpliftKey();
  const trimmed = text.trim().slice(0, MAX_TTS_CHARS);
  if (trimmed.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Text for speech cannot be empty.');
  }

  const body: Record<string, string> = {
    voiceId: config.upliftVoiceId,
    text: trimmed,
    outputFormat: config.upliftTtsFormat,
  };
  if (config.upliftPhraseReplacementConfigId) {
    body.phraseReplacementConfigId = config.upliftPhraseReplacementConfigId;
  }

  const response = await fetch(UPLIFT_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const retryAfter = response.headers.get('Retry-After');
    let message = 'Uplift text-to-speech failed.';
    try {
      const errBody = (await response.json()) as { message?: string };
      if (errBody.message) message = errBody.message;
    } catch {
      // ignore
    }
    if (response.status === 401) {
      throw new AppError(502, 'AI_UPSTREAM', 'Invalid Uplift API key.', { status: 401 });
    }
    if (response.status === 429) {
      throw new AppError(429, 'RATE_LIMITED', 'Uplift rate limit exceeded. Try again shortly.', {
        retry_after: retryAfter ? Number(retryAfter) : 30,
      });
    }
    throw new AppError(502, 'AI_UPSTREAM', message, { status: response.status });
  }

  const durationHeader = response.headers.get('x-uplift-ai-audio-duration');
  const durationMs = durationHeader ? Number(durationHeader) : undefined;
  const audioBase64 = Buffer.from(await response.arrayBuffer()).toString('base64');

  return {
    audioBase64,
    mimeType: 'audio/mpeg',
    durationMs: Number.isFinite(durationMs) ? durationMs : undefined,
  };
}
