# Design: Third-Party Fitness & Nutrition Integration (My Brain)

> **Status:** Approved 2026-10-04
> **Related:** [03_LIFESTYLE_INTEGRATION_PLAN.md](../../03_LIFESTYLE_INTEGRATION_PLAN.md)

Implements Phases A–C of `docs/03_LIFESTYLE_INTEGRATION_PLAN.md` for **Strava** (exercise) and **FatSecret** (nutrition), so the runtime Gemini AI in My Brain analyzes real objective data — not just the 3 sliders. The `agent/` pipeline stays untouched (constraint from the doc).

## User decisions

| Decision | Choice |
| --- | --- |
| Exercise provider | Strava (OAuth2, `activity:read_all`) |
| Nutrition provider | FatSecret Platform API (OAuth2) |
| Identity/infra | Full anonymous encrypted vault model + MongoDB (per 03 doc) |
| Scope | Phases A + B + C (plumbing, insight, UI source labels); extra providers deferred |

## 1. Infrastructure — MongoDB + anonymous vault (server)

- `docker-compose.yml`: add `mongo` service (named volume), link to `server` via `MONGO_URL`.
- `server/requirements.txt`: add `motor`, `cryptography`, `pytest` (+`pytest-asyncio`) as dev deps.
- `server/app/settings.py`: add `mongo_url`, `server_token_key`, `app_base_url`, `strava_client_id/secret`, `fatsecret_client_id/secret`; update root `.env.example` and `server/.env.example`.
- New `server/app/db.py`: Motor client; collections `oauth_vaults`, `daily_health_summaries`.
- New `server/app/services/vault.py`:
  - Vault = opaque UUID in an **HttpOnly, SameSite=Lax cookie** (`na_vault`), issued on first connect. No accounts.
  - Token encryption: `AES-256-GCM`, key = `HKDF(SERVER_TOKEN_KEY, vault_id)`; store `{vault_id, provider, ciphertext, iv, expiry, scopes}` in `oauth_vaults`. Access tokens never persisted or sent to client.
- `server/app/schemas.py`: add `DailyHealthSummary` pydantic model (exactly the canonical interface from the doc: `date, sources, sleep?, activity?, nutrition?, vitals?, mood?`).

## 2. OAuth + integrations API (server)

New `server/app/routers/integrations.py` (mounted in `main.py`), all cookie-scoped:

- `GET /api/integrations` — providers + connected status + last sync.
- `GET /api/integrations/{provider}/connect` — builds authorize URL with random `state` (CSRF), stored in Mongo keyed to vault; sets vault cookie if missing.
- `GET /api/integrations/{provider}/callback?code=&state=` — validates state, exchanges code server-side (httpx; both providers are confidential clients), encrypts + stores refresh token, redirects back to My Brain.
- `POST /api/integrations/{provider}/disconnect` — calls provider revoke endpoint (Strava deauthorize / FatSecret token delete), deletes vault row.
- `POST /api/integrations/sync?from=&to=` — pull-on-open sync for all connected providers.
- `GET /api/me/health?from=&to=` — merged `DailyHealthSummary[]` + 7-day trend aggregates.
- Dev redirect URIs go through the Vite proxy (`http://localhost:3000/api/integrations/{provider}/callback`) so the vault cookie lands on the client origin; verify proxy in `client/vite.config.ts` forwards cookies.

## 3. Connectors (server, pluggable)

`server/app/services/connectors/` with a shared `Connector` interface: `build_authorize_url`, `exchange_token`, `refresh_token`, `fetch_fragments(vault, from, to) -> list[DailyHealthSummary]`.

- **`strava.py`**: OAuth2 + `activity:read_all`; `GET /athlete/activities` → `activity.workouts[{type, durationMin, calories, avgHr}]`, `activeMinutes`, `caloriesBurned`.
- **`fatsecret.py`**: OAuth2; Platform API `foods/entries` per day → `nutrition.{calories, proteinG, carbsG, fatG, waterMl}` (caffeine/alcohol optional — only if present in entries).
- Upsert into `daily_health_summaries`, one doc per `(vault_id, date)`, merging fragments from multiple sources; dedupe on `(source, external_id, date)`; sanity checks (sleep ≤ 24h, calories ≥ 0, etc.).

## 4. AI integration (server — Phase B)

- New `server/app/services/insights.py`: deterministic heuristic layer mapping signals → `affectedSections` per the doc's table (sleep < 6h → Frontal `depresses`/Amygdala `stimulates`; cardio → Hippocampus + Nucleus Accumbens `stimulates`; caffeine > 200mg → Thalamus `stimulates`; …). Before shipping, cross-check each rule against `client/src/data/research.json` citations and drop/soften unsupported ones.
- `server/app/services/gemini.py`: extend `build_user_message(log, summary, trend)` with the minimized format from the doc (today's summary + 7-day averages, never raw provider payloads); system instruction tells the model to cite the numbers. `/api/my-brain/analyze` reads the vault cookie, loads today + 7 days from Mongo, and merges heuristic `affectedSections` with Gemini's output (union, deduped).

## 5. Client — My Brain UI

- New `client/src/features/integrations/`:
  - `api/integrations.ts` — fetch wrappers with `credentials: 'include'`.
  - `hooks/useIntegrations.ts` — provider list, connect (window redirect), disconnect, sync.
  - `components/ConnectedAppsPanel.tsx` — Strava/FatSecret cards with Connect/Disconnect, last-sync time, and a short privacy note ("what is pulled, why; revoke anytime"). Rendered as a collapsible section at the bottom of `MyBrainSidebar.tsx`.
- Sync-on-open: when My Brain mounts, fire non-blocking `POST /api/integrations/sync` for today.
- `MyBrainDetail.tsx`: add a "Today's data" snapshot above the AI Overview — workout/meals metrics with **source labels** (Strava/FatSecret/Daily Log) used in the analysis; keep existing loading/error states.
- `analyzeDailyLog.ts`: unchanged request shape (server enriches via cookie); surface a hint in the response panel when no apps are connected.

## 6. Docs

- Update `docs/03_LIFESTYLE_INTEGRATION_PLAN.md` status (Phases A–C: Strava + FatSecret done; Oura/Garmin/Open Food Facts deferred — connector interface ready for them).

## Verification

- **Server unit tests** (`server/tests/`): vault crypto round-trip + HKDF key isolation per vault; connector payload→`DailyHealthSummary` normalization from recorded fixture JSON; dedupe/upsert logic against mongomock; insights heuristics table; `build_user_message` snapshot test.
- **Build/lint**: `docker compose build server`, client `npm run lint && npm run build`.
- **Manual E2E** (requires registering a Strava API app and FatSecret developer key — credentials go in `.env`): connect both apps → sync → confirm `/api/me/health` returns merged summaries → press Generate in My Brain → AI Overview cites real steps/workout/calorie numbers and source chips render → disconnect wipes vault rows.

## Prerequisites the user must provide

- Strava API application (client id/secret) — approval is usually instant for personal/dev use.
- FatSecret developer account (client id/secret) — free tier.
- `SERVER_TOKEN_KEY` (random 32+ chars) in `.env`.

## Out of scope (deferred)

Oura/Garmin/Fitbit/Google Fit connectors, Open Food Facts barcode scan, webhooks, Health Connect/HealthKit, recovery files, multi-device sync.
