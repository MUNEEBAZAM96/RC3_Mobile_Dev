# GharSplit — full-stack integration test

Manual checklist after backend + mobile env are configured.

## Prerequisites

- [ ] Postgres: from repo root, `docker compose up -d` (host port **5433**)
- [ ] Backend: `cd backend && npm run dev` → log shows `users=postgres`, `household=postgres`, `auth=clerk`
- [ ] Backend env: single `backend/.env.local` (or `.env`) with `CLERK_SECRET_KEY`, `DATABASE_URL`, `AI_PROVIDER=groq`, `GROQ_API_KEY`, `UPLIFT_API_KEY`
- [ ] Mobile env: `mobile/.env.local` with `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_AUTH_PROVIDER=clerk`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (no secret key on mobile)
- [ ] Restart Expo after env changes

### Physical device

Set **Settings → API base URL** to `http://<your-mac-lan-ip>:8080` (not `127.0.0.1`). Phone and Mac must be on the same Wi‑Fi.

## Backend smoke (curl)

```bash
curl -s http://127.0.0.1:8080/health
curl -s http://127.0.0.1:8080/api/members
curl -s -X POST http://127.0.0.1:8080/api/v1/ai/household-coach \
  -H 'Content-Type: application/json' \
  -d '{"message":"Who owes the most?"}'
```

Expect `health.ai.groq` and `health.ai.uplift` true when keys are set.

## App tests

1. **Health** — Settings → Save and test → success notice (`/health` or members).
2. **Members** — Home tab loads Ali / Ayesha / Bilal balances.
3. **Shopping** — Add item → checkout → balances update.
4. **Expense** — Add bill → budget and balances update.
5. **Settle** — Record payment → net balances move.
6. **Flat feed** — Activity appears after checkout, expense, or settle.
7. **Clerk** — Sign in → Profile shows account; “Synced with GET /api/v1/me” (or clear error if server misconfigured).
8. **Assistant text** — Ask “Who owes whom?” → live Groq answer (not demo text) when `GROQ_API_KEY` is set.
9. **Assistant mic** — Tap mic → speak → tap stop → transcript sent; Uplift auto-plays reply when configured.
10. **Assistant listen** — Play on a reply → Uplift audio (no OpenAI speech error).
11. **Voice assistant screen** — Home → Voice assistant → full turn via `POST /household-coach/voice` + auto-play.
12. **Offline API** — Wrong URL in Settings → readable error, no crash.

## Integration map (reference)

| Mobile | Backend | Auth |
|--------|---------|------|
| `householdApi.*` | `/api/members`, shopping, expenses, balances, settle, budget | none |
| `householdCoachChat` | `POST /api/v1/ai/household-coach` | none |
| `householdCoachSpeak` / `speak()` | `POST /api/v1/ai/household-coach/speak` | none |
| `householdCoachVoiceIn` | `POST /api/v1/ai/household-coach/voice-in` | none |
| `householdCoachVoice` | `POST /api/v1/ai/household-coach/voice` | none |
| `api.me()` | `GET /api/v1/me` | Bearer (Clerk) |
| Smart Settle | `GET /api/balances/simplify` | 501 → empty UI |
| Categories / recurring | `/api/budget/categories`, `/api/expenses/recurring/apply` | stubs return empty / zero |
