import { api, type AiJsonResponse, type AiSpeechResponse, type AiTextResponse } from '../api/client';

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

export function chatWithAI(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
): Promise<AiTextResponse> {
  return api.chat(messages);
}
