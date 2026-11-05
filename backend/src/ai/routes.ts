import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { resolvePrincipal } from '../auth/authenticate';
import { loadConfig } from '../config';
import { AppError } from '../http/errors';
import { parseBody } from '../http/validate';
import {
  analyzeImage,
  chatWithModel,
  generateStructuredJSON,
  generateText,
  hasAiKey,
  textToSpeech,
  transcribeAudio,
  type ChatMessage,
} from './providers';
import { hasUpliftKey, upliftTextToSpeech } from './uplift';

const DEMO_TEXT =
  'Demo response. Add GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY on the API server to call a real model. The key stays on the server.';

const TextBody = z.object({ prompt: z.string().min(1).max(8000) });
const JsonBody = z.object({
  prompt: z.string().min(1).max(8000),
  schema_hint: z.string().max(2000).optional(),
});
const ImageBody = z.object({
  prompt: z.string().min(1).max(4000),
  image_base64: z.string().min(1),
  mime_type: z.string().min(1).max(100),
});
const AudioBody = z.object({
  audio_base64: z.string().min(1),
  mime_type: z.string().min(1).max(100),
});
const SpeechBody = z.object({ text: z.string().min(1).max(4000) });
const ChatBody = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(40),
});

async function requireUser(request: import('fastify').FastifyRequest): Promise<void> {
  await resolvePrincipal(request);
}

function mediaUnavailable(): never {
  throw new AppError(
    503,
    'AI_NOT_CONFIGURED',
    'Image, transcription, and speech need a provider key on the API. Text routes return a demo payload until then.',
  );
}

export function registerAi(app: FastifyInstance): void {
  app.post('/api/v1/ai/text', async (request) => {
    await requireUser(request);
    const body = parseBody(TextBody, request.body);
    if (!hasAiKey()) return { demo: true, provider: 'demo', text: DEMO_TEXT };
    const text = await generateText(body.prompt);
    return { demo: false, provider: loadConfig().aiProvider, text };
  });

  app.post('/api/v1/ai/json', async (request) => {
    await requireUser(request);
    const body = parseBody(JsonBody, request.body);
    if (!hasAiKey()) {
      return {
        demo: true,
        provider: 'demo',
        data: { summary: 'Demo structured result', items: ['replace', 'with', 'model output'] },
      };
    }
    const data = await generateStructuredJSON(body.prompt, body.schema_hint);
    return { demo: false, provider: loadConfig().aiProvider, data };
  });

  app.post('/api/v1/ai/chat', async (request) => {
    await requireUser(request);
    const body = parseBody(ChatBody, request.body);
    if (!hasAiKey()) return { demo: true, provider: 'demo', text: DEMO_TEXT };
    const text = await chatWithModel(body.messages as ChatMessage[]);
    return { demo: false, provider: loadConfig().aiProvider, text };
  });

  app.post('/api/v1/ai/image', async (request) => {
    await requireUser(request);
    const body = parseBody(ImageBody, request.body);
    if (!hasAiKey()) mediaUnavailable();
    const text = await analyzeImage(body.prompt, body.image_base64, body.mime_type);
    return { demo: false, provider: loadConfig().aiProvider, text };
  });

  app.post('/api/v1/ai/transcribe', async (request) => {
    await requireUser(request);
    const body = parseBody(AudioBody, request.body);
    if (!hasAiKey()) mediaUnavailable();
    const text = await transcribeAudio(body.audio_base64, body.mime_type);
    return { demo: false, provider: loadConfig().aiProvider, text };
  });

  app.post('/api/v1/ai/speech', async (request) => {
    await requireUser(request);
    const body = parseBody(SpeechBody, request.body);
    if (hasUpliftKey()) {
      const audio = await upliftTextToSpeech(body.text);
      return {
        demo: false,
        provider: 'uplift',
        audio_base64: audio.audioBase64,
        mime_type: audio.mimeType,
      };
    }
    if (!hasAiKey()) mediaUnavailable();
    const audio = await textToSpeech(body.text);
    return { demo: false, provider: loadConfig().aiProvider, audio_base64: audio.audioBase64, mime_type: audio.mimeType };
  });
}
