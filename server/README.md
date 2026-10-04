# NeuroAtlas — API (FastAPI)

Backend used as a **server-side proxy** so API keys never ship to the browser, and as the
host for the **lifestyle integrations** (Strava / FatSecret) that feed objective health data
into the My Brain Gemini analysis.

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

## Env

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Runtime AI for `/api/my-brain/analyze` |
| `MONGO_URL` | MongoDB connection (compose default: `mongodb://mongo:27017`) |
| `SERVER_TOKEN_KEY` | Master secret for vault token encryption (AES-256-GCM via HKDF). Random 32+ chars; rotating it invalidates stored provider tokens |
| `CLIENT_BASE_URL` | SPA origin, default `http://localhost:3000` — OAuth redirects route through the Vite proxy so the vault cookie lands on the client origin |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` | Strava API app — create at https://www.strava.com/settings/api |
| `FATSECRET_CLIENT_ID` / `FATSECRET_CLIENT_SECRET` | FatSecret Platform API — register at https://platform.fatsecret.com (free tier) |
| `APP_ENV` | `development` (default) or `production` (sets `Secure` on the vault cookie) |

OAuth redirect URI to register with each provider:

```
{CLIENT_BASE_URL}/api/integrations/{provider}/callback
```

e.g. `http://localhost:3000/api/integrations/strava/callback`.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness |
| POST | `/api/my-brain/analyze` | Gemini analysis of the Daily Log, enriched (when a vault cookie is present) with today's `DailyHealthSummary` + 7-day trend, unioned with deterministic heuristic brain sections |
| GET | `/api/integrations` | Providers + connected status (cookie-scoped) |
| GET | `/api/integrations/{provider}/connect` | 302 → provider authorize page (issues the anonymous `na_vault` cookie, CSRF `state`) |
| GET | `/api/integrations/{provider}/callback` | OAuth callback: validates single-use state, stores the encrypted refresh token, 302 → client |
| POST | `/api/integrations/{provider}/disconnect` | Best-effort revoke + delete vault row |
| POST | `/api/integrations/sync?from=&to=` | Pull-on-open sync for all connected providers (default window: last 7 days) |
| GET | `/api/me/health?from=&to=` | Merged `DailyHealthSummary[]` + trend aggregates for the vault |

## Identity model

There are **no accounts**. A browser is identified by an opaque `na_vault` UUID cookie
(HttpOnly, SameSite=Lax). Provider refresh tokens are encrypted at rest with
AES-256-GCM under a per-vault HKDF-derived key; access tokens are never persisted.
Clearing cookies removes the identity; disconnecting removes the tokens.
See `docs/03_LIFESTYLE_INTEGRATION_PLAN.md` for the full rationale.

## Tests

```bash
cd server
python -m pytest tests -v
```

Tests use `mongomock-motor`; no running MongoDB required.
