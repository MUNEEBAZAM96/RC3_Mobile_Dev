# Agent guide

This repo is a hackathon starter, not a product. Keep new features inside the patterns below.

## Architecture

- `mobile/` is Expo SDK 58, React Native, TypeScript, and Expo Router.
- `backend/` is Fastify 5. It boots with no Docker. Users live in memory unless `DATABASE_URL` is set.
- The phone is the default database. Use `ItemRepository` in `mobile/src/database/repositories/items.ts` as the pattern: `list`, `get`, `create`, `update`, `remove`.
- The phone calls the API with `request()` in `mobile/src/services/api/client.ts`. It sends `Authorization: Bearer` from `getAccessToken()` (Clerk session or legacy JWT).
- AI helpers in `mobile/src/services/ai` only call `/api/v1/ai/*`. Never import a provider SDK and never read `GEMINI_API_KEY`, `GROQ_API_KEY`, or `OPENAI_API_KEY` in `mobile/`.

## TypeScript

- `strict` is on in both packages. Do not add `any` to get past the compiler.
- Validate API bodies with Zod in `backend/src/http/validate.ts`.
- Validate forms with Zod before calling the API. Follow `mobile/src/components/forms/AuthForm.tsx` or `ClerkAuthForm.tsx`.
- Throw `AppError` on the server. The client reads `error.message` from `ApiError`.

## UI

- Build screens from `mobile/src/components/ui`. Add a component there when a second screen needs the same control.
- Colors, type, and spacing come from `useTheme()`. Support light and dark. Do not hardcode a new palette in a screen.
- Minimum tap target is 48. Set `accessibilityLabel` on icon-only controls.
- Navigation is Expo Router. Protected stacks use `Stack.Protected` in `mobile/app/_layout.tsx`. Guards use `useSession().isSignedIn`.

## Auth and data

- Default auth is **Clerk** (`EXPO_PUBLIC_AUTH_PROVIDER=clerk`). `ClerkProviderGate` wraps the app; sign-in UI uses `useSignIn` / `useSignUp` in `ClerkAuthForm.tsx`.
- Legacy JWT: set `EXPO_PUBLIC_AUTH_PROVIDER=jwt` on mobile and `AUTH_MODE=jwt` on the API (omit `CLERK_SECRET_KEY`). Demo user `demo@hackathon.dev` / `demo1234` works via `/api/v1/auth/login`.
- `getAuthClient()` is JWT-only for the legacy path. Supabase remains a stub in `supabaseAuth.ts`.
- API auth: `resolvePrincipal()` in `backend/src/auth/authenticate.ts` verifies Clerk tokens or legacy JWT. Postgres users are upserted by `clerk_user_id` on `GET /api/v1/me`.
- Onboarding is a flag in SQLite (`local_meta.onboarded`).
- Pending actions in `mobile/src/database/pending.ts` are a local queue. Do not revive the old sports sync protocol.

## API

- Routes live under `/api/v1/` except `GET /health`.
- Require `resolvePrincipal()` on anything that spends money or calls a model.
- In Clerk mode, `/api/v1/auth/login` and `/api/v1/auth/signup` are not registered.
- Keep CORS open for local development. Do not add provider keys to responses.
- Rate limit stays in memory in `backend/src/http/rateLimit.ts`.

## Security

- Clerk: `CLERK_SECRET_KEY` on the server only. Publishable key in `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- Legacy JWT: hash passwords with `backend/src/auth/password.ts`. JWT algorithm is HS256 only.
- `.env` is gitignored. Update `.env.example` when you add a variable.
- `EXPO_PUBLIC_*` values are bundled into the app. Only put public values there.

## Checks

- `npm run typecheck` in `mobile/` and `backend/` before you call the work done.
- Do not add a test runner framework in a hackathon slice unless the team asks. Prefer a focused typecheck and a manual pass of the screen you touched.
