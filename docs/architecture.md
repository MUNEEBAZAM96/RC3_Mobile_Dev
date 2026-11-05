# Architecture

The phone owns the demo data. The API owns app user profiles (Postgres or memory) and model calls. **Clerk** owns credentials by default.

```
Expo app (@clerk/clerk-expo)
  |-- SQLite (items, onboarding flag, pending queue)
  |-- Secure Store (Clerk token cache, legacy JWT, API base URL)
  |
  +--> Fastify on :8080
         |-- verify Clerk Bearer token (@clerk/backend)
         |-- upsert users by clerk_user_id (memory or Postgres)
         +--> Gemini, Groq, or OpenAI when a key is set
```

## Request path

1. `Stack.Protected` uses `useSession().isSignedIn` (Clerk or legacy JWT).
2. **Clerk:** sign-in on device via `useSignIn` / `useSignUp`. API calls use `getToken()` as `Authorization: Bearer`.
3. **Legacy JWT:** `POST /api/v1/auth/login` returns an HS256 JWT when `AUTH_MODE=jwt`.
4. `GET /api/v1/me` verifies the token and returns the app user row (upserting Clerk users in the store).
5. Dashboard reads and writes `items` through the repository. That path does not need the API.
6. Explore's AI card calls `POST /api/v1/ai/text`. With no provider key the API returns `{ "demo": true }`.

## Replace a provider

- Auth: legacy JWT (`EXPO_PUBLIC_AUTH_PROVIDER=jwt`), Supabase stub, or keep Clerk.
- Users: set `DATABASE_URL`. The store interface is `UserStore` in `backend/src/users/store.ts`.
- Models: set `AI_PROVIDER` and one key. The mobile helpers do not change.

## Labs

`mobile/app/labs` has camera and QR, location, audio, and a device screen for notifications, haptics, and the file system. They are examples. Delete the ones a hackathon does not need.
