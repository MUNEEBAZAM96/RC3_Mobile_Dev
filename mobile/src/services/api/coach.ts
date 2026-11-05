import { request } from './client';

export interface CoachChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CoachChatResponse {
  demo: boolean;
  provider: string;
  text: string;
  context_as_of: string;
}

export interface CoachSpeakResponse {
  provider: string;
  audio_base64: string;
  mime_type: string;
  duration_ms?: number;
}

export interface CoachVoiceInResponse {
  demo: boolean;
  transcript: string;
}

/** Full voice turn: transcribe → ledger coach → optional Uplift audio. */
export interface CoachVoiceResponse {
  demo: boolean;
  transcript: string;
  text: string;
  provider: string;
  context_as_of: string;
  audio_base64?: string;
  mime_type?: string;
  duration_ms?: number;
}

export interface ApiHealthResponse {
  ok: boolean;
  ai?: {
    provider?: string;
    groq?: boolean;
    uplift?: boolean;
  };
}

/** GET /health — household + AI capability flags (no auth). */
export function fetchApiHealth(): Promise<ApiHealthResponse> {
  return request<ApiHealthResponse>('/health', {}, false);
}

/** POST /api/v1/ai/household-coach — ledger-grounded chat (no auth). */
export function householdCoachChat(input: {
  message: string;
  member_id?: string;
  history?: CoachChatMessage[];
}): Promise<CoachChatResponse> {
  return request<CoachChatResponse>(
    '/api/v1/ai/household-coach',
    { method: 'POST', body: JSON.stringify(input) },
    false,
  );
}

/** POST /api/v1/ai/household-coach/speak — Uplift TTS (no auth). */
export function householdCoachSpeak(text: string): Promise<CoachSpeakResponse> {
  return request<CoachSpeakResponse>(
    '/api/v1/ai/household-coach/speak',
    { method: 'POST', body: JSON.stringify({ text: text.slice(0, 4000) }) },
    false,
  );
}

/** POST /api/v1/ai/household-coach/voice-in — Groq transcription (no auth). */
export function householdCoachVoiceIn(
  audioBase64: string,
  mimeType: string,
): Promise<CoachVoiceInResponse> {
  return request<CoachVoiceInResponse>(
    '/api/v1/ai/household-coach/voice-in',
    { method: 'POST', body: JSON.stringify({ audio_base64: audioBase64, mime_type: mimeType }) },
    false,
  );
}

/** POST /api/v1/ai/household-coach/voice — one-shot expense Q&A with optional spoken reply. */
export function householdCoachVoice(input: {
  audio_base64: string;
  mime_type: string;
  member_id?: string;
}): Promise<CoachVoiceResponse> {
  return request<CoachVoiceResponse>(
    '/api/v1/ai/household-coach/voice',
    { method: 'POST', body: JSON.stringify(input) },
    false,
  );
}
