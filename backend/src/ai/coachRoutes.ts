import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { loadConfig } from '../config';
import type { HouseholdStore } from '../household/types';
import { AppError } from '../http/errors';
import { parseBody } from '../http/validate';
import { buildHouseholdCoachSystemPrompt, loadHouseholdCoachContext } from './householdContext';
import { chatWithModel, hasAiKey, transcribeAudio, type ChatMessage } from './providers';
import { hasUpliftKey, upliftTextToSpeech } from './uplift';

const DEMO_COACH_TEXT =
  'Demo coach response. Set AI_PROVIDER=groq and GROQ_API_KEY on the API server for live answers grounded in your flat ledger.';

const CoachBody = z.object({
  member_id: z.string().optional(),
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .max(8)
    .optional(),
});

const SpeakBody = z.object({
  text: z.string().min(1).max(4000),
});

const VoiceBody = z.object({
  member_id: z.string().optional(),
  audio_base64: z.string().min(1),
  mime_type: z.string().min(1).max(100),
});

const VoiceInBody = z.object({
  audio_base64: z.string().min(1),
  mime_type: z.string().min(1).max(100),
});

function hasGroqCoachKey(): boolean {
  const config = loadConfig();
  return config.aiProvider === 'groq' && Boolean(config.groqApiKey);
}

async function validateMemberId(household: HouseholdStore, memberId: string): Promise<void> {
  const members = await household.getMembers();
  if (!members.some((m) => m.id === memberId)) {
    throw new AppError(400, 'VALIDATION_ERROR', `Unknown member: ${memberId}`);
  }
}

async function runCoachReply(input: {
  household: HouseholdStore;
  member_id?: string;
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}): Promise<{ demo: boolean; provider: string; text: string; context_as_of: string }> {
  if (input.member_id) {
    await validateMemberId(input.household, input.member_id);
  }

  const ctx = await loadHouseholdCoachContext(input.household);
  const system = buildHouseholdCoachSystemPrompt(ctx, input.member_id);
  const history = (input.history ?? []).slice(-8);

  if (!hasGroqCoachKey() || !hasAiKey()) {
    return {
      demo: true,
      provider: 'demo',
      text: DEMO_COACH_TEXT,
      context_as_of: ctx.asOf,
    };
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    ...history.map((row) => ({ role: row.role, content: row.content })),
    { role: 'user', content: input.message },
  ];

  const text = await chatWithModel(messages);
  return {
    demo: false,
    provider: loadConfig().aiProvider,
    text,
    context_as_of: ctx.asOf,
  };
}

export function registerHouseholdCoach(app: FastifyInstance, household: HouseholdStore): void {
  app.post('/api/v1/ai/household-coach', async (request) => {
    const body = parseBody(CoachBody, request.body);
    return runCoachReply({
      household,
      member_id: body.member_id,
      message: body.message,
      history: body.history,
    });
  });

  app.post('/api/v1/ai/household-coach/speak', async (request) => {
    const body = parseBody(SpeakBody, request.body);
    const audio = await upliftTextToSpeech(body.text);
    return {
      provider: 'uplift',
      audio_base64: audio.audioBase64,
      mime_type: audio.mimeType,
      duration_ms: audio.durationMs,
    };
  });

  app.post('/api/v1/ai/household-coach/voice-in', async (request) => {
    const body = parseBody(VoiceInBody, request.body);
    if (!hasGroqCoachKey()) {
      return { demo: true, transcript: 'Configure GROQ_API_KEY and AI_PROVIDER=groq for voice input.' };
    }
    const transcript = await transcribeAudio(body.audio_base64, body.mime_type);
    return { demo: false, transcript };
  });

  app.post('/api/v1/ai/household-coach/voice', async (request) => {
    const body = parseBody(VoiceBody, request.body);

    if (!hasGroqCoachKey()) {
      const coach = await runCoachReply({
        household,
        member_id: body.member_id,
        message: '(voice not transcribed — Groq not configured)',
        history: [],
      });
      return {
        demo: true,
        transcript: '',
        text: coach.text,
        provider: coach.provider,
        context_as_of: coach.context_as_of,
      };
    }

    const transcript = await transcribeAudio(body.audio_base64, body.mime_type);
    const coach = await runCoachReply({
      household,
      member_id: body.member_id,
      message: transcript,
      history: [],
    });

    let audio_base64: string | undefined;
    let mime_type: string | undefined;
    let duration_ms: number | undefined;

    if (hasUpliftKey() && coach.text.trim().length > 0) {
      const audio = await upliftTextToSpeech(coach.text);
      audio_base64 = audio.audioBase64;
      mime_type = audio.mimeType;
      duration_ms = audio.durationMs;
    }

    return {
      demo: coach.demo,
      transcript,
      text: coach.text,
      provider: coach.provider,
      context_as_of: coach.context_as_of,
      audio_base64,
      mime_type,
      duration_ms,
    };
  });
}
