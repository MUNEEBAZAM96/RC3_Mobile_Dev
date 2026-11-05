import { api, type AiJsonResponse, type AiSpeechResponse, type AiTextResponse } from '../api/client';
import {
  fetchApiHealth,
  householdCoachChat,
  householdCoachSpeak,
  householdCoachVoiceIn,
  householdCoachVoice,
  type CoachChatResponse,
  type CoachVoiceResponse,
} from '../api/coach';

export {
  fetchApiHealth,
  householdCoachChat,
  householdCoachSpeak,
  householdCoachVoiceIn,
  householdCoachVoice,
};
export type { CoachChatResponse, CoachVoiceResponse };

/** Ledger-grounded expense/balance Q&A (POST /api/v1/ai/household-coach, no sign-in required). */
export function chatAboutHousehold(input: {
  message: string;
  member_id?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}): Promise<CoachChatResponse> {
  return householdCoachChat(input);
}

export function generateText(prompt: string): Promise<AiTextResponse> {
  return api.generateText(prompt);
}

export function generateStructuredJSON(prompt: string, schemaHint?: string): Promise<AiJsonResponse> {
  return api.generateJson(prompt, schemaHint);
}

export function analyzeImage(prompt: string, imageBase64: string, mimeType: string): Promise<AiTextResponse> {
  return api.analyzeImage(prompt, imageBase64, mimeType);
}

export function transcribeAudio(audioBase64: string, mimeType: string): Promise<AiTextResponse> {
  return api.transcribe(audioBase64, mimeType);
}

export function textToSpeech(text: string): Promise<AiSpeechResponse> {
  return api.speak(text);
}

/** Protected generic chat (requires sign-in). Prefer `chatAboutHousehold` for flat ledger questions. */
export function chatWithAI(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
): Promise<AiTextResponse> {
  return api.chat(messages);
}
