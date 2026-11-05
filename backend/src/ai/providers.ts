import { loadConfig, type AiProviderName, type Config } from '../config';
import { AppError } from '../http/errors';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SpeechAudio {
  audioBase64: string;
  mimeType: string;
}

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const TEXT_MODELS: Record<AiProviderName, string> = {
  gemini: 'gemini-2.5-flash',
  groq: 'openai/gpt-oss-120b',
  openai: 'gpt-4o-mini',
};

function textModelForProvider(config: Config): string {
  if (config.aiProvider === 'groq') return config.groqChatModel;
  return TEXT_MODELS[config.aiProvider];
}

export function providerKey(config: Config = loadConfig()): string | undefined {
  if (config.aiProvider === 'groq') return config.groqApiKey;
  if (config.aiProvider === 'openai') return config.openaiApiKey;
  return config.geminiApiKey;
}

export function hasAiKey(): boolean {
  return Boolean(providerKey());
}

function requireKey(): { config: Config; apiKey: string } {
  const config = loadConfig();
  const apiKey = providerKey(config);
  if (!apiKey) {
    throw new AppError(
      503,
      'AI_NOT_CONFIGURED',
      'Set GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY on the API. Do not put provider keys in the mobile app.',
    );
  }
  return { config, apiKey };
}

async function readError(response: Response): Promise<never> {
  const body = await response.text();
  let message = 'The AI provider returned an error.';
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    const upstream = parsed.error?.message;
    if (upstream) {
      message =
        upstream.includes('model') && upstream.includes('not exist')
          ? `${upstream} Set GROQ_CHAT_MODEL in backend env to an id from GET https://api.groq.com/openai/v1/models.`
          : upstream;
    }
  } catch {
    // keep default message
  }
  throw new AppError(502, 'AI_UPSTREAM', message, {
    status: response.status,
    body: body.slice(0, 400),
  });
}

async function openAiCompatibleChat(
  url: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: unknown }[],
  json: boolean,
): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2048,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!response.ok) await readError(response);
  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new AppError(502, 'AI_UPSTREAM', 'The AI provider returned an empty response.');
  return text;
}

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

async function gemini(apiKey: string, parts: GeminiPart[], json: boolean, system?: string): Promise<string> {
  const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      ...(json ? { generationConfig: { responseMimeType: 'application/json' } } : {}),
    }),
  });
  if (!response.ok) await readError(response);
  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
  if (!text) throw new AppError(502, 'AI_UPSTREAM', 'The AI provider returned an empty response.');
  return text;
}

function parseModelJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as unknown;
    }
    throw new AppError(502, 'AI_UPSTREAM', 'The model did not return JSON.');
  }
}

function fileNameFor(mimeType: string): string {
  if (mimeType.includes('wav')) return 'audio.wav';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'audio.mp3';
  if (mimeType.includes('mp4')) return 'audio.mp4';
  return 'audio.m4a';
}

async function whisper(
  url: string,
  apiKey: string,
  model: string,
  audioBase64: string,
  mimeType: string,
): Promise<string> {
  const bytes = Buffer.from(audioBase64, 'base64');
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mimeType }), fileNameFor(mimeType));
  form.append('model', model);
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) await readError(response);
  const payload = (await response.json()) as { text?: string };
  return payload.text?.trim() ?? '';
}

export async function generateText(prompt: string): Promise<string> {
  const { config, apiKey } = requireKey();
  if (config.aiProvider === 'gemini') return gemini(apiKey, [{ text: prompt }], false);
  const url = config.aiProvider === 'groq' ? GROQ_CHAT_URL : OPENAI_CHAT_URL;
  return openAiCompatibleChat(
    url,
    apiKey,
    textModelForProvider(config),
    [{ role: 'user', content: prompt }],
    false,
  );
}

export async function generateStructuredJSON(prompt: string, schemaHint: string | undefined): Promise<unknown> {
  const instruction = schemaHint
    ? `${prompt}\n\nReturn only JSON matching this shape: ${schemaHint}`
    : `${prompt}\n\nReturn only a JSON object.`;
  const { config, apiKey } = requireKey();
  if (config.aiProvider === 'gemini') {
    return parseModelJson(await gemini(apiKey, [{ text: instruction }], true));
  }
  const url = config.aiProvider === 'groq' ? GROQ_CHAT_URL : OPENAI_CHAT_URL;
  const text = await openAiCompatibleChat(
    url,
    apiKey,
    textModelForProvider(config),
    [
      { role: 'system', content: 'Return only valid JSON.' },
      { role: 'user', content: instruction },
    ],
    true,
  );
  return parseModelJson(text);
}

export async function analyzeImage(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
  const { config, apiKey } = requireKey();
  if (config.aiProvider === 'gemini') {
    return gemini(apiKey, [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }], false);
  }
  const model = config.aiProvider === 'groq' ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'gpt-4o-mini';
  const url = config.aiProvider === 'groq' ? GROQ_CHAT_URL : OPENAI_CHAT_URL;
  return openAiCompatibleChat(
    url,
    apiKey,
    model,
    [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      },
    ],
    false,
  );
}

export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
  const { config, apiKey } = requireKey();
  if (config.aiProvider === 'gemini') {
    return gemini(
      apiKey,
      [
        { text: 'Transcribe this audio. Return only the spoken words.' },
        { inline_data: { mime_type: mimeType, data: audioBase64 } },
      ],
      false,
    );
  }
  if (config.aiProvider === 'groq') {
    return whisper(GROQ_TRANSCRIBE_URL, apiKey, 'whisper-large-v3-turbo', audioBase64, mimeType);
  }
  return whisper(OPENAI_TRANSCRIBE_URL, apiKey, 'whisper-1', audioBase64, mimeType);
}

export async function textToSpeech(text: string): Promise<SpeechAudio> {
  const { config, apiKey } = requireKey();
  if (config.aiProvider !== 'openai') {
    throw new AppError(
      503,
      'AI_NOT_CONFIGURED',
      'Text-to-speech in this kit uses OpenAI. Set AI_PROVIDER=openai and OPENAI_API_KEY.',
    );
  }
  const response = await fetch(OPENAI_SPEECH_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({ model: 'tts-1', voice: 'alloy', input: text }),
  });
  if (!response.ok) await readError(response);
  const audioBase64 = Buffer.from(await response.arrayBuffer()).toString('base64');
  return { audioBase64, mimeType: 'audio/mpeg' };
}

export async function chatWithModel(messages: ChatMessage[]): Promise<string> {
  const { config, apiKey } = requireKey();
  if (config.aiProvider === 'gemini') {
    const system = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n');
    const transcript = messages
      .filter((message) => message.role !== 'system')
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');
    return gemini(apiKey, [{ text: transcript || 'Hello' }], false, system || undefined);
  }
  const url = config.aiProvider === 'groq' ? GROQ_CHAT_URL : OPENAI_CHAT_URL;
  return openAiCompatibleChat(url, apiKey, textModelForProvider(config), messages, false);
}
