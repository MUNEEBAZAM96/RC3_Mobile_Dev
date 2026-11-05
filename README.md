# Hackathon Starter

Expo + React Native + TypeScript app and a Fastify API you can clone at the start of a mobile hackathon. The phone keeps notes in SQLite. **Clerk** handles sign-in by default; the API verifies Clerk session tokens and mirrors users in memory or Postgres. Model keys stay on the server.

The five sample products (finance, chat, vision, voice, maps) are not in this repo. Explore has small labs you can copy.

## Auth (Clerk — default)

1. Link the Clerk CLI to your account (Dashboard login is separate from CLI login):

   ```bash
   npx -y clerk@latest auth login
   ```

2. From `mobile/`, link this repo to your Clerk application (`app_3KifmUIvMZ5YD4O9vl7C8QOUe7y` or your own):

   ```bash
   cd mobile
   npx -y clerk@latest init --app app_3KifmUIvMZ5YD4O9vl7C8QOUe7y --no-skills
   npx -y clerk@latest env pull
   ```

3. Copy the secret key into `backend/.env` as `CLERK_SECRET_KEY`. Keep `AUTH_MODE=clerk` (default when the secret is set).

4. Optional Postgres: `docker compose up -d` then set `DATABASE_URL=postgres://hackathon:hackathon@localhost:5432/hackathon` in `backend/.env`. The API upserts `users` by `clerk_user_id` when the app calls `GET /api/v1/me`.

Legacy JWT demo (no Clerk): set `EXPO_PUBLIC_AUTH_PROVIDER=jwt` in `mobile/.env` and `AUTH_MODE=jwt` in `backend/.env` without `CLERK_SECRET_KEY`.

- Email: `demo@hackathon.dev`
- Password: `demo1234`

The API seeds that user in memory on boot in JWT mode only.

## Run the API

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Nothing else is required for a quick demo. `GET http://127.0.0.1:8080/health` returns `{ "ok": true, "database": "memory" }`.

Optional models: set `AI_PROVIDER` to `gemini`, `groq`, or `openai` and the matching key. Text, JSON, and chat return a marked demo payload when the key is empty. Image, transcription, and speech respond with 503 until a key is set. Text-to-speech uses OpenAI.

## Run the app

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

The simulator uses `http://127.0.0.1:8080` on iOS and `http://10.0.2.2:8080` on Android. On a physical phone, open Settings and set `http://<your-computer-lan-ip>:8080`.

`EXPO_PUBLIC_AUTH_PROVIDER=supabase` switches to a stub that explains the missing Supabase env vars.

## What is intentionally absent

A live Supabase project, Cloudinary, Firebase messaging, payments, Hugging Face, NativeWind, and production signing credentials. `eas.json` has `development` and `preview` profiles only. The preview profile builds an Android APK. You still need an Expo account to run EAS.

## Layout

- `mobile/app` — Expo Router screens: onboarding, auth, tabs, labs, item detail, modal, settings
- `mobile/src/components/ui` — buttons, inputs, cards, dialogs, empty and error states
- `mobile/src/features/auth` — Clerk provider, session, token cache, legacy JWT client
- `mobile/src/database` — SQLite and the item repository
- `mobile/src/services/ai` — helpers that call the API
- `backend/src` — Fastify app, users, Clerk verification, and the AI proxy

See [docs/architecture.md](docs/architecture.md) and [AGENTS.md](AGENTS.md). Prompts for a hackathon sit in [docs/prompts](docs/prompts).
