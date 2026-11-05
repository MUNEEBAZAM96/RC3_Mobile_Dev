# Expense payment proof (Cloudinary)

Optional receipt or transfer screenshots on shared expenses. Images upload **through the backend** to Cloudinary; every household client reads the same `proof_url` from `GET /api/expenses`.

## Server setup

1. Create a [Cloudinary](https://cloudinary.com/) account.
2. Copy **Cloud name**, **API Key**, and **API Secret** from the dashboard.
3. Add to `backend/.env.local` (gitignored — never commit secrets):

```env
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

4. Restart `npm run dev` in `backend/`.

Without these variables, expenses still save; `POST /api/expenses/:id/proof` returns **503** with a clear message.

Optional: create a Media Library folder `gharsplit/expenses` for tidy demos (uploads land under `gharsplit/expenses/{expenseId}/` automatically).

## API flow

1. `POST /api/expenses` — create expense (JSON only) → `{ expense: { id, ... } }`
2. `POST /api/expenses/:id/proof` — `{ mime_type, image_base64 }` → Cloudinary → `{ expense: { proof_url, ... } }`
3. `GET /api/expenses` — all expenses, newest first, including `proof_url` when set

Household routes stay unauthenticated (hackathon). Proof URLs are public HTTPS on Cloudinary.

## Mobile flow

1. **Expenses** → **Add shared expense** → optional **Payment proof** (camera or gallery).
2. **Save expense** creates the bill, then uploads proof if selected.
3. If upload fails, a toast says the expense was saved anyway.
4. **Recent expenses** lists shared bills; **View proof** opens the full image when `proof_url` is set.

## Manual checks

```bash
# List expenses (includes proof_url)
curl -s http://127.0.0.1:8080/api/expenses | jq .

# After creating an expense and uploading proof:
curl -s http://127.0.0.1:8080/api/expenses | jq '.expenses[] | select(.proof_url != null)'
```

On a second device (or curl), the same `proof_url` should appear. Expenses without proof show **No proof** and no viewer button.

## Limits

- MIME: `image/jpeg`, `image/png`, `image/webp` only (server-validated).
- Max decoded size: 5 MB.
- v1: no proof on settlements; no Cloudinary delete when ledger is cleared.
