# Household members (add / rename)

Manage roommates beyond the default M01–M03 seed. Benchmark NASCON presets are unchanged.

## Mobile (Profile-first)

1. **Home → Manage flat members** (or **Profile** from the header).
2. Scroll to **Manage household**.
3. Turn on **Household admin mode** (or set `EXPO_PUBLIC_HOUSEHOLD_ADMIN=true` in `mobile/.env.local` and restart Expo).
4. Tap **Add roommate** — new member appears on Home, Expenses, and Shopping after the list refreshes.
5. Use **Roommate identity** (above on Profile) to link chat/AI to a member.

Settings shows a **Manage household members** row that opens Profile (no duplicate form).

If `POST /api/members` returns 404, restart `cd backend && npm run dev`.

## API (no auth)

```bash
curl -s -X POST http://127.0.0.1:8080/api/members \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sara"}' | jq .

curl -s -X PATCH http://127.0.0.1:8080/api/members/M04 \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sara Khan","phone":"03001234567"}' | jq .

curl -s http://127.0.0.1:8080/api/members | jq .
```

- Omit `id` on create to auto-assign **M04**, **M05**, …
- Duplicate **id** or **name** (case-insensitive) → **409**
- No DELETE in v1 (expenses/settlements reference members)

## Local SQLite

If migration errors appear after upgrading, delete `backend/data/household.sqlite` and restart the API (re-seeds M01–M03).

## Future (not implemented)

- Remove/deactivate members, invites, per-household Clerk orgs
