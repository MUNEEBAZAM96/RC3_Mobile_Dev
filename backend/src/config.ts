export type AiProviderName = 'gemini' | 'groq' | 'openai';
export type AuthMode = 'clerk' | 'jwt';

export interface Config {
  port: number;
  authMode: AuthMode;
  jwtSecret: string;
  clerkSecretKey: string | undefined;
  databaseUrl: string | undefined;
  /** Local SQLite file for household data when DATABASE_URL is unset */
  householdSqlitePath: string;
  aiProvider: AiProviderName;
  geminiApiKey: string | undefined;
  groqApiKey: string | undefined;
  openaiApiKey: string | undefined;
  upliftApiKey: string | undefined;
  upliftVoiceId: string;
  upliftTtsFormat: string;
  upliftPhraseReplacementConfigId: string | undefined;
  logLevel: string;
}

export function hasGroqKey(): boolean {
  const config = loadConfig();
  return Boolean(config.groqApiKey);
}

export function hasUpliftKeyConfigured(): boolean {
  return Boolean(loadConfig().upliftApiKey);
}

let cached: Config | null = null;

export function resetConfigCache(): void {
  cached = null;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  return value;
}

function providerName(value: string | undefined): AiProviderName {
  if (value === 'groq' || value === 'openai' || value === 'gemini') return value;
  return 'gemini';
}

function authModeFromEnv(env: NodeJS.ProcessEnv, clerkSecret: string | undefined): AuthMode {
  const raw = emptyToUndefined(env.AUTH_MODE);
  if (raw === 'jwt' || raw === 'clerk') return raw;
  return clerkSecret ? 'clerk' : 'jwt';
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  if (cached) return cached;

  const clerkSecretKey = emptyToUndefined(env.CLERK_SECRET_KEY);

  cached = {
    port: Number(env.PORT ?? 8080),
    authMode: authModeFromEnv(env, clerkSecretKey),
    jwtSecret: env.JWT_SECRET || 'dev-jwt-secret',
    clerkSecretKey,
    databaseUrl: emptyToUndefined(env.DATABASE_URL),
    householdSqlitePath:
      emptyToUndefined(env.HOUSEHOLD_SQLITE_PATH) ??
      `${process.cwd()}/data/household.sqlite`,
    aiProvider: providerName(emptyToUndefined(env.AI_PROVIDER)),
    geminiApiKey: emptyToUndefined(env.GEMINI_API_KEY),
    groqApiKey: emptyToUndefined(env.GROQ_API_KEY),
    openaiApiKey: emptyToUndefined(env.OPENAI_API_KEY),
    upliftApiKey: emptyToUndefined(env.UPLIFT_API_KEY),
    upliftVoiceId: emptyToUndefined(env.UPLIFT_VOICE_ID) ?? 'v_8eelc901',
    upliftTtsFormat: emptyToUndefined(env.UPLIFT_TTS_FORMAT) ?? 'MP3_22050_128',
    upliftPhraseReplacementConfigId: emptyToUndefined(env.UPLIFT_PHRASE_REPLACEMENT_CONFIG_ID),
    logLevel: env.LOG_LEVEL || 'warn',
  };
  return cached;
}
