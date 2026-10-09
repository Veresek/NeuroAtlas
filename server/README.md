# NeuroAtlas — API (FastAPI)

Backend used as a **server-side proxy** so API keys never ship to the browser: it holds the
Gemini key and runs the My Brain analysis. It also owns the anonymous per-browser identity
(`na_vault` cookie) that future per-vault history will be keyed by. There are **no
third-party integrations** — see `docs/03_LIFESTYLE_INTEGRATION_PLAN.md` for why the first
attempt was removed and what a future provider must satisfy.

## Run locally

```bash
cd server
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env        # fill in the values
uvicorn app.main:app --reload --port 8000
```

With Docker (recommended — includes MongoDB):

```bash
docker compose up --build
```

Health check: `GET /health`

## Tests

From `server/`, using the project venv (system Python lacks `motor`/`mongomock_motor`):

```bash
.venv\Scripts\python -m pytest -q      # Windows
```

## Env

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Runtime AI for `/api/my-brain/analyze` |
| `MONGO_URL` | MongoDB connection (compose default: `mongodb://mongo:27017`) |
| `APP_ENV` | `development` (default) or `production` (sets `Secure` on the vault cookie) |

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness |
| POST | `/api/my-brain/analyze` | Gemini analysis of the free-text Daily Log (`{ note }`), returning `message` + `affectedSections[]`. Sets the `na_vault` cookie when the request has none |

## Identity

No accounts. `POST /api/my-brain/analyze` mints an opaque UUID in an HttpOnly, SameSite=Lax
`na_vault` cookie (2-year expiry, `Secure` in production). Nothing reads it yet; it is the
key `daily_logs` will be stored under. Deleting it (or clearing browser data) orphans the
vault — a future `DELETE /api/me/data` is what will wipe the rows behind it.
