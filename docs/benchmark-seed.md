# GharSplit benchmark household seed

Repeatable NASCON demo data for members **M01 Ali**, **M02 Ayesha**, **M03 Bilal**, monthly budget **5000 PKR**.

## Reset Postgres (Docker)

```bash
docker compose down -v && docker compose up -d
cd backend && npm run dev
```

## CLI

```bash
cd backend
npm run seed:benchmark -- pre_settlement
npm run seed:benchmark -- post_settlement
npm run seed:benchmark -- shopping_demo
npm run seed:benchmark -- paisa_test
npm run seed:benchmark -- empty
```

Exit code **1** if built-in assertions fail (report printed as JSON).

## HTTP (dev only)

Registered when `NODE_ENV !== 'production'` or `ALLOW_DEV_SEED=true`. No auth (household rubric).

```bash
curl -s -X POST http://127.0.0.1:8080/api/dev/seed-benchmark \
  -H 'Content-Type: application/json' \
  -d '{"preset":"pre_settlement"}' | jq .

curl -s -X POST http://127.0.0.1:8080/api/dev/reset-household | jq .

curl -s http://127.0.0.1:8080/api/dashboard | jq .
```

## Verify math

```bash
curl -s http://127.0.0.1:8080/api/budget/summary | jq .
curl -s http://127.0.0.1:8080/api/balances | jq .
```

### `pre_settlement`

| Check | Expected |
|-------|----------|
| Total spending | 4200 |
| Budget used | 84% |
| Status | contains “Near Limit” |
| M01 / M02 / M03 nets | +250 / −450 / +200 |

### `post_settlement`

Same spending **4200**; settlements **M02→M01 250**, **M02→M03 200**; all nets **0**.

### Manual settlement (Path A — expenses only)

After `pre_settlement`:

```bash
curl -s -X POST http://127.0.0.1:8080/api/settle \
  -H 'Content-Type: application/json' \
  -d '{"sender_id":"M02","recipient_id":"M01","amount":250}'

curl -s -X POST http://127.0.0.1:8080/api/settle \
  -H 'Content-Type: application/json' \
  -d '{"sender_id":"M02","recipient_id":"M03","amount":200}'
```

## Path A vs Path B (avoid double 780)

- **Path A:** Seed `pre_settlement` — grocery **780** is already an expense. Do not also checkout shopping for 780.
- **Path B (live checkout demo):** Seed `shopping_demo` (Milk + Rice pending only), then checkout in the app/API. Do **not** use `pre_settlement` grocery if you want to show checkout creating the 780 spend.

## Presets

| Preset | Contents |
|--------|----------|
| `empty` | Clears ledger; members + budget unchanged |
| `pre_settlement` | Four rubric expenses, no settlements |
| `post_settlement` | Same + two settlements |
| `shopping_demo` | Pending Milk/Rice only |
| `paisa_test` | One 1000 PKR equal split (333.34 / 333.33 / 333.33) |

See also [integration-test.md](./integration-test.md).
