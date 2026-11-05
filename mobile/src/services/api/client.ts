import { getAccessToken } from '../../features/auth/accessToken';
import { getBaseUrl } from '../storage/baseUrl';
import type { AuthSession, AuthUser } from '../../features/auth/types';

export { getBaseUrl, setBaseUrl } from '../storage/baseUrl';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
}

export async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const [baseUrl, token] = await Promise.all([getBaseUrl(), auth ? getAccessToken() : Promise.resolve(null)]);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, headers: { ...headers, ...(init.headers as object) } });
  } catch {
    throw new ApiError(`Cannot reach the server at ${baseUrl}. Check the address in Settings.`, 0, null);
  }

  const body = (await response.json().catch(() => ({}))) as T & ErrorEnvelope;
  if (!response.ok) {
    throw new ApiError(body.error?.message ?? 'Something went wrong. Please try again.', response.status, body.error?.code ?? null);
  }
  return body;
}

export const api = {
  login(email: string, password: string) {
    return request<AuthSession>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false);
  },
  signup(email: string, password: string) {
    return request<AuthSession>('/api/v1/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }, false);
  },
  me() {
    return request<{ user: AuthUser }>('/api/v1/me');
  },
  ping() {
    return request<{ pong: boolean }>('/api/v1/ping', {}, false);
  },
  generateText(prompt: string) {
    return request<AiTextResponse>('/api/v1/ai/text', { method: 'POST', body: JSON.stringify({ prompt }) });
  },
  generateJson(prompt: string, schemaHint?: string) {
    return request<AiJsonResponse>('/api/v1/ai/json', {
      method: 'POST',
      body: JSON.stringify({ prompt, schema_hint: schemaHint }),
    });
  },
  analyzeImage(prompt: string, imageBase64: string, mimeType: string) {
    return request<AiTextResponse>('/api/v1/ai/image', {
      method: 'POST',
      body: JSON.stringify({ prompt, image_base64: imageBase64, mime_type: mimeType }),
    });
  },
  transcribe(audioBase64: string, mimeType: string) {
    return request<AiTextResponse>('/api/v1/ai/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audio_base64: audioBase64, mime_type: mimeType }),
    });
  },
  speak(text: string) {
    return request<AiSpeechResponse>('/api/v1/ai/speech', { method: 'POST', body: JSON.stringify({ text }) });
  },
  chat(messages: { role: 'system' | 'user' | 'assistant'; content: string }[]) {
    return request<AiTextResponse>('/api/v1/ai/chat', { method: 'POST', body: JSON.stringify({ messages }) });
  },
};

export interface AiTextResponse {
  demo: boolean;
  provider: string;
  text: string;
}

export interface AiJsonResponse {
  demo: boolean;
  provider: string;
  data: unknown;
}

export interface AiSpeechResponse {
  demo: boolean;
  provider: string;
  audio_base64: string;
  mime_type: string;
}
