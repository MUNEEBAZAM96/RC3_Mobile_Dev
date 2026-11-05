export type AiProviderName = 'gemini' | 'groq' | 'openai';
export type AuthMode = 'clerk' | 'jwt';

export interface Config {
  port: number;
  authMode: AuthMode;
  jwtSecret: string;
  clerkSecretKey: string | undefined;
  databaseUrl: string | undefined;
  aiProvider: AiProviderName;
  geminiApiKey: string | undefined;
  groqApiKey: string | undefined;
  openaiApiKey: string | undefined;
  logLevel: string;
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
    aiProvider: providerName(emptyToUndefined(env.AI_PROVIDER)),
    geminiApiKey: emptyToUndefined(env.GEMINI_API_KEY),
    groqApiKey: emptyToUndefined(env.GROQ_API_KEY),
    openaiApiKey: emptyToUndefined(env.OPENAI_API_KEY),
    logLevel: env.LOG_LEVEL || 'warn',
  };
  return cached;
}
