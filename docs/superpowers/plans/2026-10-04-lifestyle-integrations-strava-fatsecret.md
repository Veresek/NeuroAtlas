# Lifestyle Integrations (Strava + FatSecret) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pull objective exercise (Strava) and nutrition (FatSecret) data into the My Brain section via an anonymous encrypted vault, so the runtime Gemini analysis uses real daily health data alongside the sleep/coffee/mood sliders.

**Architecture:** Server-side OAuth2 (confidential clients) with per-browser anonymous vault identity (HttpOnly cookie, AES-256-GCM-encrypted refresh tokens in MongoDB). Pluggable connectors normalize provider payloads into a canonical `DailyHealthSummary` document per (vault, date). `/api/my-brain/analyze` enriches the Gemini prompt with today's minimized summary + 7-day trend and unions a deterministic heuristic insight layer into `affectedSections`. Client adds a Connected Apps panel and a "Today's data" snapshot in My Brain.

**Tech Stack:** FastAPI + Motor (async MongoDB) + cryptography (HKDF/AES-GCM) + httpx; MongoDB 7 in docker-compose; React 19 + TypeScript + Vite (proxy `/api` → server).

**Spec:** `docs/superpowers/specs/2026-10-04-lifestyle-integrations-strava-fatsecret-design.md`

## Global Constraints

- `agent/` is atlas ingestion only: no task may import, modify, or reuse `agent/` code, prompts, or LangChain. Runtime AI lives in `server/` only.
- Shared vocabulary (section names, `stimulates/depresses/damages/modulates`) stays in the server copy `ALLOWED_SECTION_NAMES` (`server/app/services/gemini.py`), never imported from `agent/schemas.py`.
- Education, not medical advice: keep the existing Gemini system-instruction stance.
- No user accounts. Identity = opaque `na_vault` UUID cookie (HttpOnly, SameSite=Lax; Secure only when `APP_ENV=production`).
- Provider tokens: refresh tokens encrypted at rest (AES-256-GCM, key = HKDF(SERVER_TOKEN_KEY, vault_id)); access tokens used in-memory only, never persisted, never sent to the client.
- Gemini receives only the minimized summary + 7-day aggregates — never raw provider payloads.
- Existing enums unchanged: `BrainSectionEffectType` and `ALLOWED_SECTION_NAMES`.
- Server code style: tabs for indentation (matches existing `server/app/*`). Client style: tabs, feature-folder layout (`client/src/features/<name>/{api,hooks,components}`).
- Server runtime is Python 3.13 (Docker `python:3.13-slim`); local dev Python is 3.14 — avoid version-pinned syntax either lacks.
- Client has no test framework (project convention); client tasks verify with `npm run lint && npm run build` from `client/`.

## Review Focus

1. **Graceful degradation:** Mongo down or no vault cookie → `/api/my-brain/analyze` must still return a slider-only analysis (enrichment wrapped in try/except, failure logged, never 5xx). Pinned by `test_analyze_enrichment_failure_degrades` (Task 8).
2. **Token secrecy:** refresh tokens encrypted at rest with per-vault key isolation; access tokens never written to Mongo or returned by any endpoint. Pinned by `test_decrypt_roundtrip`, `test_key_isolation_between_vaults`, `test_stored_token_is_not_plaintext` (Task 2).
3. **OAuth CSRF:** callback with missing/replayed/foreign `state` must be rejected with 400 and must not store a token. Pinned by `test_callback_rejects_bad_state` (Task 6).
4. **Multi-source merge:** Strava (activity) + FatSecret (nutrition) fragments for the same date coexist in one doc; re-syncing the same external activities/entries does not duplicate or clobber. Pinned by `test_merge_two_sources_same_date`, `test_resync_is_idempotent` (Task 3).
5. **Data minimization:** `build_user_message` emits only the canonical minimized lines (today + `trend_7d`), no provider IDs, names, or raw JSON. Pinned by `test_build_user_message_with_summary` (Task 8).

---

### Task 1: Server foundation — deps, settings, Mongo module, health schemas, compose

**Files:**
- Modify: `server/requirements.txt`, `server/app/settings.py`, `server/app/schemas.py`, `docker-compose.yml`, `.env.example`
- Create: `server/app/db.py`, `server/pytest.ini`, `server/tests/test_schemas.py`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `settings.mongo_url: str` (default `"mongodb://localhost:27017"`), `settings.server_token_key: str` (default `""`), `settings.client_base_url: str` (default `"http://localhost:3000"`), `settings.strava_client_id/strava_client_secret/fatsecret_client_id/fatsecret_client_secret: str` (defaults `""`).
  - `server/app/db.py`: `def get_db() -> AsyncIOMotorDatabase` (lazy singleton `AsyncIOMotorClient(settings.mongo_url)`, db name `neuroatlas`), `VAULTS_COLLECTION = "oauth_vaults"`, `SUMMARIES_COLLECTION = "daily_health_summaries"`, `def get_vaults() -> AsyncIOMotorCollection`, `def get_summaries() -> AsyncIOMotorCollection`, `def set_db_client(client) -> None` (test seam for mongomock-motor).
  - `schemas.py` models (all fields optional unless noted, all `BaseModel`):
    - `Workout { type: str; duration_min: float; calories: float | None; avg_hr: int | None }`
    - `ActivitySummary { steps: int | None; active_minutes: float | None; calories_burned: float | None; workouts: list[Workout] = [] }`
    - `NutritionSummary { calories: float | None; protein_g: float | None; carbs_g: float | None; fat_g: float | None; caffeine_mg: float | None; water_ml: float | None; alcohol_g: float | None }`
    - `DailyHealthSummary { date: str (YYYY-MM-DD, required); sources: list[str] = []; activity: ActivitySummary | None; nutrition: NutritionSummary | None }` (sleep/vitals/mood omitted for now — no provider in scope supplies them; Daily Log mood stays client-side per spec §4.)

- [ ] **Step 1: Write failing schema tests** in `server/tests/test_schemas.py`: `test_daily_health_summary_minimal` (only `date` required; defaults `sources == []`, `activity is None`, `nutrition is None`), `test_workout_requires_type_and_duration` (ValidationError when missing), `test_summary_rejects_negative_calories` (add `ge=0` on calorie/macro/water fields; assert ValidationError for `calories=-1`).

- [ ] **Step 2: Run to verify failure.** Run: `cd server && python -m pytest tests/test_schemas.py -v`. Expected: FAIL — import/model errors.

- [ ] **Step 3: Implement.** Add models to `server/app/schemas.py` with the exact shapes above (pydantic `Field(default=None, ge=0)` where noted). Add settings fields. Add deps to `server/requirements.txt`: `motor>=3.6.0`, `cryptography>=43.0.0`, `pytest>=8.0`, `pytest-asyncio>=0.24`, `mongomock-motor>=0.0.30`. Create `server/pytest.ini` with `[pytest]\nasyncio_mode = auto\ntestpaths = tests`. Create `server/app/db.py` per Produces. Add `mongo` service to `docker-compose.yml` (`image: mongo:7`, named volume `mongo_data:/data/db`, no published ports — server reaches it on the compose network), add `MONGO_URL=mongodb://mongo:27017` to server `environment:` via the root `.env`; extend `.env.example` with `MONGO_URL=`, `SERVER_TOKEN_KEY=`, `CLIENT_BASE_URL=http://localhost:3000`, `STRAVA_CLIENT_ID=`, `STRAVA_CLIENT_SECRET=`, `FATSECRET_CLIENT_ID=`, `FATSECRET_CLIENT_SECRET=`.

- [ ] **Step 4: Run tests.** Run: `cd server && python -m pytest tests/test_schemas.py -v`. Expected: PASS 3/3.

- [ ] **Step 5: Verify compose config.** Run: `docker compose config --quiet`. Expected: exit 0.

- [ ] **Step 6: Commit.** `git add server/ docker-compose.yml .env.example && git commit -m "feat(server): add mongo foundation, health summary schemas, settings for integrations"`

### Task 2: Vault service — cookie, HKDF/AES-GCM crypto, token persistence

**Files:**
- Create: `server/app/services/vault.py`, `server/tests/test_vault.py`

**Interfaces:**
- Consumes: `db.get_vaults()`, `db.set_db_client()`, `settings.server_token_key` (Task 1).
- Produces (all in `server/app/services/vault.py`):
  - `VAULT_COOKIE = "na_vault"`
  - `def encrypt_token(plaintext: str, vault_id: str) -> tuple[str, str]` — returns `(ciphertext_b64, nonce_b64)`; AES-256-GCM, key = HKDF-SHA256(`settings.server_token_key`, salt=None, info=`b"vault:" + vault_id.encode()`).
  - `def decrypt_token(ciphertext_b64: str, nonce_b64: str, vault_id: str) -> str`
  - `def get_vault_id(request: Request) -> str | None` — reads cookie, validates UUID format.
  - `def issue_vault_cookie(response: Response) -> str` — new UUID4, sets cookie `httponly=True, samesite="lax", secure=(settings.app_env == "production")`, max_age 2 years; returns vault_id. (Adds `settings.app_env: str = "development"` in Task 1's settings file — implement here.)
  - `async def save_provider_token(vault_id: str, provider: str, refresh_token: str, expires_at: datetime | None, scopes: list[str]) -> None` — upsert doc `{vault_id, provider, ciphertext, nonce, expires_at, scopes, connected_at}` keyed `(vault_id, provider)`.
  - `async def load_provider_token(vault_id: str, provider: str) -> str | None` — returns decrypted refresh token or None.
  - `async def load_vault_record(vault_id: str, provider: str) -> dict | None` (raw doc, for status/expiry display).
  - `async def delete_provider_token(vault_id: str, provider: str) -> None`
  - `async def list_connected_providers(vault_id: str) -> list[str]`
  - Raises `ValueError("SERVER_TOKEN_KEY is not configured")` from encrypt/decrypt when key empty.

- [ ] **Step 1: Write failing tests** in `server/tests/test_vault.py` (use `mongomock_motor.AsyncMongoMockClient` via `set_db_client` in a fixture; set `settings.server_token_key = "test-key-32-chars-minimum-length!!"` per test): `test_decrypt_roundtrip` (encrypt→decrypt returns original), `test_key_isolation_between_vaults` (decrypt with a different vault_id raises), `test_stored_token_is_not_plaintext` (after `save_provider_token`, raw doc's `ciphertext` != plaintext and plaintext not found in doc dump), `test_load_returns_decrypted` , `test_delete_removes_record`, `test_list_connected_providers`.

- [ ] **Step 2: Run to verify failure.** Run: `cd server && python -m pytest tests/test_vault.py -v`. Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `vault.py` per Produces (cryptography lib: `HKDF`, `AESGCM`; base64-encode bytes for Mongo storage).

- [ ] **Step 4: Run tests.** Run: `cd server && python -m pytest tests/test_vault.py -v`. Expected: PASS 6/6.

- [ ] **Step 5: Commit.** `git add server/app/services/vault.py server/tests/test_vault.py server/app/settings.py && git commit -m "feat(server): anonymous vault cookie + AES-256-GCM token storage"`

### Task 3: Summary store — fragment merge, upsert, dedupe

**Files:**
- Create: `server/app/services/summary_store.py`, `server/tests/test_summary_store.py`

**Interfaces:**
- Consumes: `db.get_summaries()`, `DailyHealthSummary`/`ActivitySummary`/`NutritionSummary` (Task 1).
- Produces:
  - `class HealthFragment(BaseModel)` in `summary_store.py`: `{ source: str; date: str; external_ids: list[str] = []; activity: ActivitySummary | None = None; nutrition: NutritionSummary | None = None }`
  - `async def merge_fragments(vault_id: str, fragments: list[HealthFragment]) -> int` — upserts one doc per `(vault_id, date)` in `daily_health_summaries`; merges field-wise (non-None fragment fields overwrite same-source values; other source's fields preserved); appends `source` to `sources` list (unique); stores `external_ids` per source as `{external_ids: {source: [...]}}` and skips fragments whose ids are all already present (dedupe); returns count of docs modified. Sanity checks: drop workouts with `duration_min <= 0` or `> 24*60`, clamp negative calories to None.
  - `async def load_summaries(vault_id: str, date_from: str, date_to: str) -> list[DailyHealthSummary]` — inclusive range, sorted by date asc.
  - `async def delete_vault_summaries(vault_id: str) -> None`
  - `def compute_trend(summaries: list[DailyHealthSummary]) -> dict` — 7-day averages over the most recent ≤7 docs with data: `{days: int, active_minutes_avg: float | None, calories_burned_avg: float | None, workouts_count: int, calories_intake_avg: float | None, protein_g_avg: float | None}` (None when no data).

- [ ] **Step 1: Write failing tests** in `server/tests/test_summary_store.py`: `test_merge_two_sources_same_date` (Strava activity fragment + FatSecret nutrition fragment, same date → one doc with both, `sources == ["strava", "fatsecret"]`), `test_resync_is_idempotent` (same fragment with same external_ids merged twice → workouts not duplicated, second merge modifies 0 docs), `test_merge_preserves_other_source_fields` (re-sync of strava fragment doesn't wipe nutrition), `test_sanity_drops_absurd_workout` (duration_min=5000 dropped), `test_load_summaries_range_sorted`, `test_compute_trend_averages`.

- [ ] **Step 2: Run to verify failure.** Run: `cd server && python -m pytest tests/test_summary_store.py -v`. Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `summary_store.py`. Merge strategy: read existing doc; for each fragment, if source already in `external_ids[source]` covers all `fragment.external_ids` → skip; else set `doc[source_group]` fields from fragment (group = `activity`/`nutrition`), union external ids.

- [ ] **Step 4: Run tests.** Run: `cd server && python -m pytest tests/test_summary_store.py -v`. Expected: PASS 6/6.

- [ ] **Step 5: Commit.** `git add server/app/services/summary_store.py server/tests/test_summary_store.py && git commit -m "feat(server): daily health summary store with per-source merge and dedupe"`

### Task 4: Connector framework + Strava connector

**Files:**
- Create: `server/app/services/connectors/__init__.py`, `server/app/services/connectors/base.py`, `server/app/services/connectors/strava.py`, `server/tests/fixtures/strava_activities.json`, `server/tests/test_strava.py`

**Interfaces:**
- Consumes: `HealthFragment`, `ActivitySummary`, `Workout` (Tasks 1, 3); `settings.strava_client_id/secret`, `settings.client_base_url`.
- Produces:
  - `base.py`: `class ProviderToken(BaseModel) { access_token: str; refresh_token: str | None; expires_at: datetime | None }`; `class Connector(ABC)` with `provider: str`, `def build_authorize_url(self, state: str) -> str`, `async def exchange_code(self, code: str) -> ProviderToken`, `async def refresh(self, refresh_token: str) -> ProviderToken`, `async def fetch_fragments(self, access_token: str, date_from: date, date_to: date) -> list[HealthFragment]`, `async def revoke(self, access_token: str) -> None`; module fn `def redirect_uri(provider: str) -> str` = `f"{settings.client_base_url}/api/integrations/{provider}/callback"`.
  - `__init__.py`: `CONNECTORS: dict[str, Connector]` registry (`{"strava": StravaConnector(), "fatsecret": ...}` — fatsecret added in Task 5; registry starts with strava only).
  - `strava.py`: `class StravaConnector(Connector)`, `provider = "strava"`. Authorize: `https://www.strava.com/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=activity:read_all&state=...`. Token: POST `https://www.strava.com/oauth/token` (grant_type authorization_code/refresh_token). Revoke: POST `https://www.strava.com/oauth/deauthorize` with access token. Activities: GET `https://www.strava.com/api/v3/athlete/activities` with `after`/`before` epoch seconds, `per_page=200`, header `Authorization: Bearer`. Normalization (`def activities_to_fragments(activities: list[dict]) -> list[HealthFragment]`, pure module-level fn): group by `start_date_local[:10]`; per day one fragment `source="strava"`, `external_ids=[str(a["id"])]`, `activity=ActivitySummary(active_minutes=sum(moving_time)/60, calories_burned=sum(calories), workouts=[Workout(type=sport_type.lower(), duration_min=moving_time/60, calories=calories, avg_hr=average_heartrate or None)])`.

- [ ] **Step 1: Record fixture** `server/tests/fixtures/strava_activities.json`: 3 activities — two runs on 2026-10-03 (with `id`, `name`, `sport_type: "Run"`, `moving_time: 2100`, `calories: 320.5`, `average_heartrate: 148.2`, `start_date_local: "2026-10-03T07:15:00Z"`), one ride on 2026-10-04 (`sport_type: "Ride"`, `moving_time: 3600`, no `average_heartrate` key), plus one absurd activity (`moving_time: -5`) for the sanity path.

- [ ] **Step 2: Write failing tests** in `server/tests/test_strava.py`: `test_build_authorize_url_contains_state_scope_redirect` (parse query: client_id, response_type=code, scope=activity:read_all, state, redirect_uri == `{client_base_url}/api/integrations/strava/callback`), `test_activities_to_fragments_groups_by_day` (fixture → 2 fragments; 2026-10-03 has 2 workouts, active_minutes == 70.0, calories_burned == pytest.approx(641.0), external_ids length 2; ride fragment avg_hr None), `test_activities_to_fragments_drops_invalid` (moving_time -5 excluded), `test_fetch_fragments_calls_api_with_epoch_window` (monkeypatch `httpx.AsyncClient.get` → assert URL, `after`/`before` epoch seconds for the date window, Bearer header).

- [ ] **Step 3: Run to verify failure.** Run: `cd server && python -m pytest tests/test_strava.py -v`. Expected: FAIL — module not found.

- [ ] **Step 4: Implement** `base.py`, `__init__.py`, `strava.py` per Produces.

- [ ] **Step 5: Run tests.** Run: `cd server && python -m pytest tests/test_strava.py -v`. Expected: PASS 4/4.

- [ ] **Step 6: Commit.** `git add server/app/services/connectors server/tests && git commit -m "feat(server): connector framework + Strava activity connector"`

### Task 5: FatSecret connector

**Files:**
- Create: `server/app/services/connectors/fatsecret.py`, `server/tests/fixtures/fatsecret_entries.json`, `server/tests/test_fatsecret.py`
- Modify: `server/app/services/connectors/__init__.py` (register `"fatsecret"`)

**Interfaces:**
- Consumes: `Connector`, `ProviderToken`, `redirect_uri` (Task 4); `HealthFragment`, `NutritionSummary` (Tasks 1, 3); `settings.fatsecret_client_id/secret`.
- Produces: `class FatSecretConnector(Connector)`, `provider = "fatsecret"`.
  - Authorize: `https://oauth.fatsecret.com/connect/authorize?client_id=...&response_type=code&scope=basic&state=...&redirect_uri=...`.
  - Token: POST `https://oauth.fatsecret.com/connect/token` with HTTP Basic auth (client_id:client_secret), form `grant_type=authorization_code|refresh_token`, `redirect_uri`.
  - Data: GET `https://platform.fatsecret.com/rest/server.api` params `method=food-entries.get.v2`, `format=json`, `date=YYYYMMDD`, Bearer token — one request per day in range (cap range at 14 days).
  - Normalization (`def entries_to_fragment(day_entries: dict, day: str) -> HealthFragment | None`, pure fn): sums `food_entries[].nutritional_contents` (`calories`, `carbohydrate`, `protein`, `fat`) across meals; `external_ids = [e["food_entry_id"]]`; water from entries whose `food_entry_name`/description indicates water is out of scope — `water_ml` stays None (FatSecret generic entries don't reliably encode it; Daily Log/coffee slider remains the subjective overlay). Returns None when no entries for the day.
  - Revoke: FatSecret has no public revoke endpoint — `revoke()` is a no-op that logs; vault row deletion is the effective disconnect (note in module docstring).

- [ ] **Step 1: Record fixture** `server/tests/fixtures/fatsecret_entries.json`: realistic `food-entries.get.v2` shape — `{"food_entries": {"food_entry": [{"food_entry_id": "123", "meal": "Breakfast", "nutritional_contents": {"calories": 520.0, "carbohydrate": 61.2, "protein": 28.4, "fat": 17.1}}, {"food_entry_id": "124", "meal": "Lunch", "nutritional_contents": {"calories": 710.5, "carbohydrate": 80.0, "protein": 35.0, "fat": 22.0}}]}}`.

- [ ] **Step 2: Write failing tests** in `server/tests/test_fatsecret.py`: `test_entries_to_fragment_sums_macros` (calories == 1230.5, protein_g == 63.4, carbs_g == 141.2, fat_g == 39.1, external_ids == ["123","124"], source == "fatsecret"), `test_entries_to_fragment_empty_day_returns_none`, `test_build_authorize_url` (scope=basic, correct endpoints/redirect), `test_fetch_fragments_one_request_per_day` (monkeypatch httpx; 2-day window → 2 GETs with `date=20261003`, `date=20261004`).

- [ ] **Step 3: Run to verify failure.** Run: `cd server && python -m pytest tests/test_fatsecret.py -v`. Expected: FAIL — module not found.

- [ ] **Step 4: Implement** `fatsecret.py`; register in `CONNECTORS`.

- [ ] **Step 5: Run tests.** Run: `cd server && python -m pytest tests/test_fatsecret.py -v`. Expected: PASS 4/4. Also run full suite `python -m pytest tests -v`. Expected: all pass.

- [ ] **Step 6: Commit.** `git add server/app/services/connectors/fatsecret.py server/app/services/connectors/__init__.py server/tests && git commit -m "feat(server): FatSecret nutrition connector"`

### Task 6: Integrations router — connect, callback, disconnect, sync, health

**Files:**
- Create: `server/app/routers/__init__.py`, `server/app/routers/integrations.py`, `server/tests/test_integrations_router.py`
- Modify: `server/app/main.py` (mount router), `server/app/db.py` (add `OAuth_STATES_COLLECTION = "oauth_states"`, `def get_states()`)

**Interfaces:**
- Consumes: vault service (Task 2), `CONNECTORS` registry + `Connector` + `ProviderToken` (Tasks 4–5), `merge_fragments`, `load_summaries`, `compute_trend` (Task 3).
- Produces (`APIRouter` at prefix `/api`):
  - `GET /integrations` → `{"providers": [{"provider": "strava", "connected": bool, "connected_at": str | None}, ...]}` (401-free: no vault cookie → all `connected: false`).
  - `GET /integrations/{provider}/connect` → 302 to authorize URL; issues vault cookie if absent; stores `{vault_id, provider, state, created_at}` in `oauth_states` (TTL 10 min via `expireAfterSeconds` index on `created_at`); unknown provider → 404.
  - `GET /integrations/{provider}/callback` (params `code`, `state`) → validates state doc exists for vault+provider and deletes it (single use), exchanges code, `save_provider_token`, 302 to `settings.client_base_url`; bad state → 400.
  - `POST /integrations/{provider}/disconnect` → `load_provider_token`, best-effort connector `refresh`+`revoke` (swallow errors), `delete_provider_token`; no vault/row → 404.
  - `POST /integrations/sync` (optional query `from`,`to` YYYY-MM-DD, default: last 7 days incl. today) → for each connected provider: refresh access token if expired, `fetch_fragments`, `merge_fragments`; per-provider failures collected, response `{"synced": ["strava"], "failed": [{"provider": "fatsecret", "error": "..."}]}`; no vault cookie → 200 with empty lists (client fires this on open, must not error).
  - `GET /me/health` (query `from`,`to`, default today−6..today) → `{"summaries": [DailyHealthSummary...], "trend": compute_trend(...)}`; no vault → `{"summaries": [], "trend": compute_trend([])}`.

- [ ] **Step 1: Write failing tests** in `server/tests/test_integrations_router.py` using `fastapi.testclient.TestClient(app)` + `mongomock_motor` (via `set_db_client`) + `unittest.mock.patch` on `CONNECTORS` entries with a `FakeConnector(Connector)` (in-memory token store, canned fragments): `test_connect_redirects_and_sets_cookie` (302, Location contains state, `na_vault` cookie set HttpOnly), `test_callback_stores_token_and_redirects` (valid state → 302 to client_base_url, vault doc exists), `test_callback_rejects_bad_state` (unknown state → 400, no vault doc), `test_callback_state_single_use` (second call with same state → 400), `test_disconnect_removes_vault_row`, `test_sync_merges_fragments_from_connected_providers`, `test_sync_without_cookie_returns_empty` (200, `{"synced": [], "failed": []}`), `test_sync_reports_provider_failure` (FakeConnector raises → listed in `failed`, other provider still synced), `test_me_health_returns_summaries_and_trend`, `test_unknown_provider_404`.

- [ ] **Step 2: Run to verify failure.** Run: `cd server && python -m pytest tests/test_integrations_router.py -v`. Expected: FAIL — router not found.

- [ ] **Step 3: Implement** router + mount in `main.py`; add states collection helper in `db.py`. Cookie parse/issue via vault service. Token refresh logic: if `expires_at` passed → `connector.refresh(refresh_token)` and re-save.

- [ ] **Step 4: Run tests.** Run: `cd server && python -m pytest tests/test_integrations_router.py -v`. Expected: PASS 10/10.

- [ ] **Step 5: Commit.** `git add server/app/routers server/app/main.py server/app/db.py server/tests && git commit -m "feat(server): integrations API — OAuth connect/callback/disconnect, sync, health"`

### Task 7: Heuristic insight layer

**Files:**
- Create: `server/app/services/insights.py`, `server/tests/test_insights.py`

**Interfaces:**
- Consumes: `DailyHealthSummary`, `MyBrainLog`, `AffectedBrainSection` (Task 1/existing schemas).
- Produces: `def heuristic_sections(log: MyBrainLog, summary: DailyHealthSummary | None, trend: dict | None) -> list[AffectedBrainSection]` — deterministic, order-stable, deduped by `(section, effectType)`. Rules (spec §4 table, restricted to signals the in-scope providers + Daily Log actually supply):
  - `log.sleep < 6` → Frontal Lobe `depresses`, Amygdala `stimulates`
  - cardio workout today (any workout with `type` in {run, ride, swim, walk, hike, row, elliptical} and `duration_min >= 30`) → Hippocampus `stimulates`, Nucleus Accumbens `stimulates`
  - `nutrition.caffeine_mg > 200` OR (`caffeine_mg` None and `log.coffee >= 3` — ~95mg/cup estimate) → Thalamus `stimulates`
  - `nutrition.alcohol_g >= 20` → Brainstem `depresses`
  - `log.mood <= 1` → Amygdala `stimulates`
  - `trend` with `active_minutes_avg >= 30` over `days >= 3` → Hippocampus `stimulates` (chronic signal; dedupe merges with acute)
  - Section names MUST come from `ALLOWED_SECTION_NAMES` (import from `services.gemini`).

- [ ] **Step 1: Literature cross-check.** Grep `client/src/data/research.json` for evidence backing each rule (search terms: "sleep deprivation", "exercise"/"aerobic", "caffeine"/"adenosine", "alcohol", "BDNF", "amygdala"). For any rule with zero support in `research.json`, soften (drop the rule) and note it in the commit message. Record findings as comments in `insights.py` (one line per rule: `# research.json: <id or "general consensus">`).

- [ ] **Step 2: Write failing tests** in `server/tests/test_insights.py`: `test_short_sleep_maps_frontal_and_amygdala`, `test_cardio_30min_maps_hippocampus_nacc`, `test_short_workout_below_30min_no_cardio_rule`, `test_high_caffeine_mg_maps_thalamus`, `test_coffee_cups_fallback_when_no_nutrition` (log.coffee=3 → Thalamus; log.coffee=2 → not), `test_alcohol_maps_brainstem`, `test_low_mood_maps_amygdala`, `test_no_summary_no_crash` (summary None, default log → only mood/sleep/coffee rules), `test_dedupe_stable_order` (rules producing Amygdala `stimulates` twice → single entry), `test_all_sections_in_allowed_names`.

- [ ] **Step 3: Run to verify failure.** Run: `cd server && python -m pytest tests/test_insights.py -v`. Expected: FAIL — module not found.

- [ ] **Step 4: Implement** `insights.py` per Produces (plain if-chain building a list; no config machinery).

- [ ] **Step 5: Run tests.** Run: `cd server && python -m pytest tests/test_insights.py -v`. Expected: PASS 10/10.

- [ ] **Step 6: Commit.** `git add server/app/services/insights.py server/tests/test_insights.py && git commit -m "feat(server): deterministic signal→brain-section heuristics for My Brain"`

### Task 8: Gemini enrichment + analyze merge

**Files:**
- Modify: `server/app/services/gemini.py` (`build_user_message`, `generate_daily_log_analysis`), `server/app/main.py` (`/api/my-brain/analyze`), `server/tests/test_gemini.py` (new)

**Interfaces:**
- Consumes: `get_vault_id`, `load_summaries`, `compute_trend`, `heuristic_sections`, `AffectedBrainSection`.
- Produces:
  - `build_user_message(log: MyBrainLog, summary: DailyHealthSummary | None = None, trend: dict | None = None) -> str` — existing 3 lines unchanged, then when summary present append canonical minimized block (spec §Runtime AI):
    ```
    steps=...  workout=[run 35min avgHr=148]
    nutrition={calories:2100, protein:120g, carbs:250g, fat:70g, water:1800ml}
    trend_7d={active_minutes_avg:35, calories_intake_avg:2050, workouts_count:4}
    ```
    (only non-None fields rendered; no provider names, ids, or raw JSON). System instruction gains: "When objective app data lines are present, cite the specific numbers in the message."
  - `generate_daily_log_analysis(log, summary=None, trend=None)` — passes both through to `build_user_message`.
  - `def merge_sections(heuristic: list[AffectedBrainSection], gemini: list[AffectedBrainSection]) -> list[AffectedBrainSection]` — heuristic first, then Gemini entries whose `(section, effectType)` is new; cap 6 (existing UI convention from system prompt "1–6 entries"): if union > 6, keep all heuristic (max 6) then fill.
  - `/api/my-brain/analyze`: reads vault cookie; if present and enrichment works, loads today's summary + trend from Mongo and calls `heuristic_sections`; wraps ALL enrichment in try/except → on any failure proceeds slider-only (log a warning). Response unchanged shape (`DailyLogAnalysis`).

- [ ] **Step 1: Write failing tests** in `server/tests/test_gemini.py`: `test_build_user_message_without_summary_unchanged` (exact current 3-line output for sleep=6.5, coffee=2, mood=2), `test_build_user_message_with_summary` (contains `steps=8200`-style rendered lines for a fixture summary; asserts NO occurrence of "strava", "fatsecret", "external", "_id"), `test_build_user_message_omits_none_fields` (no `water:` when water_ml None), `test_merge_sections_dedupe_and_order`, `test_merge_sections_cap_six`, `test_analyze_enrichment_failure_degrades` (TestClient; patch `load_summaries` to raise; mock Gemini HTTP via monkeypatched `httpx.AsyncClient.post` returning a valid canned analysis → response 200, message == canned).

- [ ] **Step 2: Run to verify failure.** Run: `cd server && python -m pytest tests/test_gemini.py -v`. Expected: FAIL — signature errors / missing merge_sections.

- [ ] **Step 3: Implement** per Produces.

- [ ] **Step 4: Run tests + full suite.** Run: `cd server && python -m pytest tests -v`. Expected: all PASS.

- [ ] **Step 5: Commit.** `git add server/app/services/gemini.py server/app/main.py server/tests/test_gemini.py && git commit -m "feat(server): analyze endpoint enriches Gemini prompt with vault health data"`

### Task 9: Client — integrations API layer + hook

**Files:**
- Create: `client/src/features/integrations/api/integrations.ts`, `client/src/features/integrations/hooks/useIntegrations.ts`

**Interfaces:**
- Consumes: Task 6 endpoints (same-origin via existing Vite `/api` proxy; proxy forwards cookies by default — verified in `client/vite.config.ts`).
- Produces:
  - `integrations.ts`: `export interface ProviderStatus { provider: 'strava' | 'fatsecret'; connected: boolean; connected_at: string | null }`; `listProviders(): Promise<ProviderStatus[]>`; `connectPath(provider: string): string` — plain path builder returning `/api/integrations/{provider}/connect` (the hook navigates with `window.location.href`, NOT fetch: the endpoint 302s cross-origin to the provider's authorize page, which fetch cannot follow); `disconnect(provider: string): Promise<void>`; `syncNow(from?: string, to?: string): Promise<{ synced: string[]; failed: { provider: string; error: string }[] }>`; `fetchHealth(from: string, to: string): Promise<{ summaries: DailyHealthSummary[]; trend: Trend }>` with mirrored TS types (`DailyHealthSummary`, `Workout`, `ActivitySummary`, `NutritionSummary`, `Trend`) in `integrations.ts` matching Task 1/3 JSON (pydantic default snake_case → TS snake_case fields).
  - All fetches: `credentials: 'include'`.
  - `useIntegrations.ts`: `export function useIntegrations(): { providers: ProviderStatus[]; loading: boolean; syncResult: SyncResult | null; connect: (p: string) => void; disconnect: (p: string) => Promise<void>; refresh: () => Promise<void>; syncToday: () => Promise<void> }` — loads list on mount; `connect` does `window.location.href = connectPath(p)`; `syncToday` fires `syncNow()` then `refresh()`.

- [ ] **Step 1: Implement** both files (no client test framework per Global Constraints).

- [ ] **Step 2: Verify.** Run: `cd client && npm run lint && npm run build`. Expected: both exit 0.

- [ ] **Step 3: Commit.** `git add client/src/features/integrations && git commit -m "feat(client): integrations API layer and useIntegrations hook"`

### Task 10: Client — Connected Apps panel + sync-on-open

**Files:**
- Create: `client/src/features/integrations/components/ConnectedAppsPanel.tsx`
- Modify: `client/src/features/my-brain/components/MyBrainSidebar.tsx`

**Interfaces:**
- Consumes: `useIntegrations` (Task 9); existing `Button` (`client/src/components/ui/Button.tsx`), sidebar section styling patterns from `MyBrainSidebar.tsx`.
- Produces: `ConnectedAppsPanel` — collapsible section (details/summary or state toggle, matching existing chevron usage): per provider a card with name (Strava / FatSecret), what it pulls ("Workouts, active minutes, calories" / "Meals, calories, macros"), Connect or Disconnect button, `connectedAt` date when connected; footer privacy note: "Data is pulled to your browser session only, encrypted on the server, and never shared. Revoke anytime."; on mount fires `syncToday()` non-blocking (sync-on-open) and shows last sync status line ("Synced just now" / "Sync failed for FatSecret" when `syncResult.failed` non-empty).

- [ ] **Step 1: Implement** panel; render `<ConnectedAppsPanel />` at the bottom of `MyBrainSidebar` (after the Generate button block, inside the scrollable div).

- [ ] **Step 2: Verify.** Run: `cd client && npm run lint && npm run build`. Expected: exit 0.

- [ ] **Step 3: Manual smoke (dev servers).** Start server (`docker compose up mongo server` or `uvicorn`) + `npm run dev`; open My Brain → panel renders with two disconnected cards, `POST /api/integrations/sync` fires and returns 200 empty. (Without Strava/FatSecret credentials the connect flow can't complete — note for E2E.)

- [ ] **Step 4: Commit.** `git add client/src/features/integrations client/src/features/my-brain/components/MyBrainSidebar.tsx && git commit -m "feat(client): Connected Apps panel in My Brain with sync-on-open"`

### Task 11: Client — Today's data snapshot + no-connection hint

**Files:**
- Create: `client/src/features/integrations/components/TodayDataPanel.tsx`
- Modify: `client/src/features/my-brain/components/MyBrainDetail.tsx`

**Interfaces:**
- Consumes: `fetchHealth` + types (Task 9); `useIntegrations` providers list; existing `BrainSectionList` untouched.
- Produces: `TodayDataPanel` — renders today's `DailyHealthSummary` as metric chips grouped by source: activity metrics labeled `Strava` (workouts as `run 35min · 320 kcal · HR 148`, active minutes, calories burned), nutrition labeled `FatSecret` (calories, protein/carbs/fat), and `Daily Log` chip row (sleep, coffee, mood from `useMyBrain().log`). Empty state when no summaries and nothing connected: hint "Connect Strava or FatSecret in the sidebar to enrich your analysis with real workout and meal data."

- [ ] **Step 1: Implement** `TodayDataPanel` (fetches `fetchHealth(today, today)` on mount); insert in `MyBrainDetail.tsx` above the AI Overview block, rendered in all states (generating/error/analysis) except it stays hidden while `isGenerating` is false AND no data AND no providers connected → show the hint variant.

- [ ] **Step 2: Verify.** Run: `cd client && npm run lint && npm run build`. Expected: exit 0.

- [ ] **Step 3: Commit.** `git add client/src/features/integrations client/src/features/my-brain/components/MyBrainDetail.tsx && git commit -m "feat(client): Today's data snapshot with source labels in My Brain detail"`

### Task 12: Docs, env examples, final verification

**Files:**
- Modify: `docs/03_LIFESTYLE_INTEGRATION_PLAN.md` (status header), `server/README.md` (new endpoints + env vars), root `.env.example` (verify complete from Task 1)

**Interfaces:**
- Consumes: everything above.
- Produces: doc updates only.

- [ ] **Step 1: Update `docs/03_LIFESTYLE_INTEGRATION_PLAN.md`**: status → "Phase A–C implemented for Strava + FatSecret (2026-10); Oura/Garmin/Fitbit, Open Food Facts, webhooks deferred — add via `server/app/services/connectors/`"; adjust connector table prio column notes for FatSecret (chosen nutrition provider).

- [ ] **Step 2: Update `server/README.md`**: document `/api/integrations/*`, `/api/me/health`, required env vars (`MONGO_URL`, `SERVER_TOKEN_KEY`, `CLIENT_BASE_URL`, `STRAVA_CLIENT_ID/SECRET`, `FATSECRET_CLIENT_ID/SECRET`), how to register a Strava API app and FatSecret developer key, redirect URI format `{CLIENT_BASE_URL}/api/integrations/{provider}/callback`.

- [ ] **Step 3: Full verification.** Run: `cd server && python -m pytest tests -v` (all PASS); `cd client && npm run lint && npm run build` (exit 0); `docker compose config --quiet` (exit 0); `docker compose build server` (succeeds with new deps).

- [ ] **Step 4: Commit.** `git add docs server/README.md .env.example && git commit -m "docs: mark lifestyle integration phases A-C done for Strava/FatSecret"`
