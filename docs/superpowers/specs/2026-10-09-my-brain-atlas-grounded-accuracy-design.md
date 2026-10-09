# Design: Atlas-Grounded My Brain Accuracy (no third-party apps)

> **Date:** 2026-10-09 · **Branch:** `feature/lifestyle-integrations` · **Status:** approved design, awaiting implementation plan
> **Supersedes:** the Strava/FatSecret design. `2026-10-04-lifestyle-integrations-strava-fatsecret-design.md` and its plan are deleted by **rollout step 0 (§0)**, and `docs/03_LIFESTYLE_INTEGRATION_PLAN.md` is rewritten from "implemented" to a deferred-providers backlog. This design changes both what My Brain does with its input *and* where the input comes from: no third-party app is a source any more.

## Problem

My Brain today cannot be more accurate than its single prose field, and the reason is not the input — it is that the app already owns a knowledge base the analysis never reads.

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | `atlas.json` already contains, per item **and per phase** (`acute`/`chronic`/`withdrawal`), `affectedBrainAreas[{areaId, name, effectType}]`, `neurotransmitters[{name, mechanism}]` and `brainImpact` prose. 14 items across 4 categories. | `client/src/data/atlas.json` |
| 2 | `research.json` holds 89 studies, each with `relatedAtlasItems` × `relatedBrainAreas` — an existing signal→region evidence graph. | `client/src/data/research.json` |
| 3 | None of it reaches the model. `SYSTEM_INSTRUCTION` asks Gemini to *be* a neurobiologist, so `affectedSections` is free association, not the atlas. | `server/app/services/gemini.py` |
| 4 | `insights.py` heuristics are dead code: they fire only from `summary.activity` / `summary.nutrition`, i.e. Strava/FatSecret fragments. No provider credentials exist (`server/.env` absent; root `.env` has `GEMINI_API_KEY` only). | `server/app/services/insights.py`, `.env` |
| 5 | Nothing is persisted. `useMyBrainLog` keeps the note in React state; no `localStorage`, no server write. There is no history, so no baseline and no defensible `chronic` claim. | `client/src/features/my-brain/hooks/useMyBrainLog.ts` |
| 6 | The server's section vocabulary is a hardcoded mirror of `BrainSectionName` (18 names) and is **missing `Substantia Nigra`**, which `atlas.json` emits — the only atlas area the client taxonomy cannot express. Mesh keys `substantia_nigra_L`/`_R` do exist. | `server/app/services/gemini.py`, `client/src/data/brainSections.ts`, `client/src/data/meshMapping.ts:657,1461` |
| 7 | `CI` runs client lint+build only. Server tests never run in CI. | `.github/workflows/ci.yml` |

## User decisions

- Swap Strava/FatSecret → Whoop/Oura/Withings: **dropped** — it requires owning the devices and registering developer apps; no credentials exist.
- Scope: **full sequence A+E+B+D+C**.
- Model calls: **one combined call** (classification + extraction + narrative together).
- UI: **full** for B (confirm chips), C (clarifications), D (history + clear-my-data).
- Strava/FatSecret plumbing: **remove** (2026-10-09, reversing the earlier "keep, hide unconfigured" decision) — connectors, OAuth router, encrypted token vault, provider schemas, the Connected Apps panel and their env keys are deleted in **step 0, before §1**, so no later step builds on code that has no producer. Only the anonymous `na_vault` cookie survives, now as identity for `daily_logs` (§6). See §0.
- The `fragment` provenance tier is **not** kept as an empty extension point: with no provider, nothing can produce it, and a tier no test can reach is a liability rather than a hook (§0.1, §8).

## Goals

1. Every `affectedSections` entry is derivable from `atlas.json`, with provenance. Zero invented brain areas.
2. Objective-ish structure (`DailySignals`) exists per day, is user-correctable, and is auditable against the note.
3. History produces a personal baseline; `acute` vs `chronic` is decided by data, not by the model's mood.
4. Missing signals become an explicit "not provided" or a question — never an invented number.
5. Accuracy is measurable: a golden set with named metrics runs in CI.

## Non-goals

No device/provider APIs, no webhooks, no accounts, no Apple Health/Health Connect, no embeddings/vector store, no slider inputs, no changes to `agent/` logic (atlas *content* expansion is explicitly out of scope here). After step 0, third-party apps are not a source of signals at all: the only producers are the user's prose and the user's taps (§3).

---

## 0. Rollout step 0 — remove the third-party integrations

Strava and FatSecret are code-complete, have no credentials, no users, and after §3 no consumer either: every number that reaches the analysis comes from prose the user wrote or a chip the user tapped. The plumbing is deleted **before §1** so that steps 1–2 do not implement a `fragment` tier, provider chips, or `/api/integrations`-shaped UI that would die in the same branch.

One thing survives and is load-bearing for Track D: the anonymous `na_vault` cookie as identity. Everything else about the integration stack goes.

*(§10 later cut the cookie and the database too — nothing on this branch had a consumer for them.)*

### 0.1 Removal inventory

| Layer | Delete | Kept instead |
| --- | --- | --- |
| Connectors | `server/app/services/connectors/` — `__init__.py` (`CONNECTORS`), `base.py` (`Connector` ABC, `ProviderToken`, `redirect_uri`), `strava.py`, `fatsecret.py` (~331 lines) | nothing; §8 defines the seam a future provider must re-implement |
| HTTP | `server/app/routers/integrations.py` (228 lines: list, toggle, connect, callback, disconnect, sync, `/me/health`) and the now-empty `routers/` package | `GET /health`, `POST /api/my-brain/analyze` |
| `main.py` | the enrichment block (`load_summaries` / `filter_disabled` / `list_disabled_providers` / `compute_trend` / `heuristic_sections` + `merge_sections` call, ~30 lines), the `oauth_states` TTL index in `lifespan`, `include_router` | analyze becomes: note → (grounded) model → sections |
| Store | `server/app/services/summary_store.py` entirely (184 lines: `HealthFragment`, `_sanitize`, `merge_fragments`, `load_summaries`, `remove_source`, `delete_vault_summaries`, `filter_disabled`, `compute_trend`, `SOURCE_FIELD_BY_PROVIDER`) | `daily_logs` accessors built in §6 follow `db.py`'s shape, not this file |
| Heuristics | `server/app/services/insights.py` (96 lines) — every rule reads `summary.activity` / `summary.nutrition`, so none of them has an input | §3 re-creates `insights.py` against `DailySignals` |
| Prompt | `gemini.py`: `_render_activity`, `_render_nutrition`, `_render_trend`, `_num`, the `summary`/`trend` parameters of `build_user_message` and `generate_daily_log_analysis`, and the `SYSTEM_INSTRUCTION` bullet telling the model to cite `activity=` / `nutrition=` / `trend_7d=` (~55 lines) | `merge_sections` stays as the cap/ordering seam until §2 replaces it |
| Schemas | `schemas.py`: `ProviderToggle`, `Workout`, `ActivitySummary`, `NutritionSummary`, `DailyHealthSummary` (~25 lines) | `MyBrainLog`, `AffectedBrainSection`, `DailyLogAnalysis`; `DailySignals` arrives in §5 |
| Crypto vault | `vault.py`: `_derive_key`, `encrypt_token`, `decrypt_token`, `save_provider_token`, `load_vault_record`, `load_provider_token`, `delete_provider_token`, `list_connected_providers`, `set_provider_enabled`, `list_enabled_providers`, `list_disabled_providers` (~86 of 116 lines) | `VAULT_COOKIE`, `VAULT_COOKIE_MAX_AGE`, `get_vault_id`, `set_vault_cookie`, `issue_vault_cookie` (see §0.2) |
| DB | `db.py`: `VAULTS_COLLECTION`/`get_vaults()`, `STATES_COLLECTION`/`get_states()`, `SUMMARIES_COLLECTION`/`get_summaries()` | `set_db_client()` injection seam, `DB_NAME`, `get_db()` |
| Settings / deps | `settings.py`: `server_token_key`, `client_base_url`, `strava_client_id/secret`, `fatsecret_client_id/secret`; `requirements.txt`: `cryptography>=43.0.0` | `gemini_api_key`, `gemini_model`, `mongo_url`, `app_env` |
| Env examples | `STRAVA_*`, `FATSECRET_*`, `SERVER_TOKEN_KEY`, `CLIENT_BASE_URL` from `.env.example` and `server/.env.example` | `GEMINI_API_KEY`, `GEMINI_MODEL`, `MONGO_URL`, `APP_ENV` |
| Client | `client/src/features/integrations/` (4 files, ~490 lines: `api/integrations.ts`, `hooks/useIntegrations.ts`, `components/ConnectedAppsPanel.tsx`, `components/TodayDataPanel.tsx`), `client/src/assets/plus.svg` (its only importer is `ConnectedAppsPanel.tsx:3`), the `<ConnectedAppsPanel />` block in `MyBrainSidebar.tsx:3,56`, the `<TodayDataPanel log={log} />` block in `MyBrainDetail.tsx:5,58` | the note textarea and Generate button stay as they are today |
| Tests | `test_strava.py` (4), `test_fatsecret.py` (5), `test_vault.py` (7), `test_summary_store.py` (7), `test_integrations_router.py` (26), `test_schemas.py` (3, all three target provider schemas), `test_insights.py` (11), and the 5 provider-shaped cases in `test_gemini.py` (`…_with_summary`, `…_omits_none_fields`, `test_analyze_enrichment_failure_degrades`, `test_analyze_merges_heuristic_sections`, `test_analyze_hides_disabled_provider_from_prompt`), plus `tests/fixtures/strava_activities.json` and `tests/fixtures/fatsecret_entries.json` | 5 tests survive (`test_analyze_rejects_blank_note`, `test_analyze_rejects_overlong_note`, `build_user_message`, both `merge_sections` cases) and §0.2 adds 3: the canned-model output plus cookie minted/cookie kept. **The server suite drops from 73 collected tests to 8** — §9's golden set is what grows it back, so step 0 must not be merged without step 1 landing in the same branch |
| Docs | `docs/superpowers/specs/2026-10-04-lifestyle-integrations-strava-fatsecret-design.md` and `docs/superpowers/plans/2026-10-04-lifestyle-integrations-strava-fatsecret.md` (already deleted in the worktree — commit the deletions here); the integration sections of `server/README.md` (line 4, the `SERVER_TOKEN_KEY`/`CLIENT_BASE_URL`/`STRAVA_*`/`FATSECRET_*` rows, the redirect-URI block, the `/api/integrations` endpoint table, the `docs/03` pointer at line 66) | `docs/02_AI_AND_FUTURE.md` §B keeps the wearable vision — it is future intent, not a description of shipped code |

Total: roughly 1.1k lines of server code, ~490 lines of client code, ~890 lines of tests.

### 0.2 The replacement that must land in the same commit

> **Reversed later the same day by §10.** The reasoning below is kept because Track D has to answer the same question again; the conclusion ("mint it in analyze") was wrong for a branch that ships no storage — nothing read the `vault_id` that was being minted.

The vault cookie is currently minted in exactly one place: `integrations.py:122`, inside `GET /api/integrations/{provider}/connect`. `issue_vault_cookie()` (`vault.py:70`) exists but has **no caller in application code** — it was written for the OAuth path and never used. Deleting the router therefore deletes the only identity mechanism §6 depends on.

Decision: `POST /api/my-brain/analyze` mints the cookie when the request carries none — `vault_id = get_vault_id(request) or issue_vault_cookie(response)`. The handler must return through a `Response` (it currently returns the model directly) so the header is set on the analysis response itself; no extra round trip, no boot-time call, and identity is created by the act of writing data rather than by loading a page.

Consequences that §6 must be read with:

- "no cookie ⇒ stateless analysis" survives only for clients that never analyze (curl, a browser blocking cookies). For the SPA, the first Generate creates the vault.
- `GET /api/my-brain/log` and `history` with no cookie return empty results, not `401` — there is no account to be unauthenticated against.
- After `DELETE /api/me/data` expires the cookie, the next analyze mints a **new, empty** vault. That is intended: the wipe removed the old one, and a fresh UUID cannot read it.
- The `secure=` flag still keys off `app_env`; `CLIENT_BASE_URL` is gone because its only consumers were `redirect_uri()` and the callback's `RedirectResponse`.

Rejected: a `POST /api/me/vault` endpoint the SPA calls on mount — creates a vault for visitors who never write anything, and adds a request before every first analysis.

### 0.3 Encryption goes away, and the UI copy has to follow

`SERVER_TOKEN_KEY` and the AES-256-GCM/HKDF path existed to protect **provider refresh tokens** from a Mongo read. `daily_logs` stores the user's own prose plus numbers they confirmed, keyed by an opaque random UUID: there is no secret to protect from the server's own database, and encrypting it with a key the server holds adds a key-rotation failure mode (lose `SERVER_TOKEN_KEY`, lose every user's history) without adding a boundary. §6's "identity and encryption model reused untouched" therefore means **identity only**.

Two copy consequences, both required by the accuracy of the claim rather than taste:

- The Connected Apps panel's footer — "encrypted on the server" — is deleted with the panel, not reworded.
- The Track D history/footer copy states *what* is stored and *where* (`daily_logs`, this vault, wiped by "Clear my data") and must never say the note is encrypted.

### 0.4 Data teardown

`oauth_vaults`, `oauth_states` and `daily_health_summaries` lose every writer. On the VPS, drop them in the step-0 deploy — after `count_documents({})` on each: with no credentials ever configured they should be empty, and a non-zero count means someone did connect an app, which makes the drop a user-facing deletion that needs a separate decision rather than a silent side effect of a refactor.

Browsers holding an `na_vault` cookie keep it; it now identifies a `daily_logs` vault instead of a token vault.

### 0.5 What survives, and why it is not collateral

| Keep | Reason |
| --- | --- |
| `mongo` service, `depends_on`, `MONGO_URL` in `docker-compose.yml`; `motor` / `mongomock-motor` in `requirements.txt` | §6 `daily_logs` and §9's CI need them. Mongo was introduced for the vault, but it outlives it |
| `server/pytest.ini` | it is the only reason the server suite is runnable at all |
| `client/vite.config.ts` `API_PROXY_TARGET` + the compose `environment:` entry | its original purpose was routing the OAuth callback through the client origin, but `/api/my-brain/analyze` now depends on the same proxy inside compose |
| compose volumes mounting `atlas.json` / `research.json` into `client` | §1's authored-data hot reload |
| `db.py`'s `set_db_client()` pattern | §4 names it the established injection seam the new store copies |

### 0.6 Done when

1. `rg -i "strava|fatsecret|oauth|connector|integrations" server/app client/src` returns nothing.
2. `server/.venv/Scripts/python.exe -m pytest server/tests` → **8 passed** at step 0 (13 after §10.2), no collection errors, no import of `cryptography`.
3. `npm run lint && npm run build` in `client` clean — proves no dangling `@/features/integrations` import survived.
4. `curl -i -X POST http://localhost:8000/api/my-brain/analyze -H 'Content-Type: application/json' -d '{"note":"test"}'` returns an analysis and sets **no** cookie (§10 — nothing on this branch stores anything yet).
5. In `docker compose`, My Brain generates an analysis and the browser network tab shows no request to `/api/integrations*`.
6. `docs/03_LIFESTYLE_INTEGRATION_PLAN.md` reads as a deferred backlog (status line, provider table, the "Phases A–C ✅ Done" claims all corrected) and `README.md:28`'s description no longer implies shipped integrations.

One commit, before step 1: `refactor: remove Strava/FatSecret integrations, keep anonymous vault identity`.

**Precondition:** the free-text daily-log rework and the Connected Apps panel redesign are currently **uncommitted** (`ConnectedAppsPanel.tsx`, `TodayDataPanel.tsx`, `useIntegrations.ts`, `api/integrations.ts` all modified; `plus.svg` untracked). Step 0 deletes four of those files, so landing it first would destroy the panel redesign without ever recording it. Commit the note rework (and either commit or deliberately discard the panel work) before starting.

---

## 1. Data layer: baked snapshot, no new canonical location

`atlas.json`/`research.json` stay authored by `agent/` exactly where they are written today (`client/src/data/`). The server gets a **build-time copy**, not a runtime dependency on the client directory:

- `docker-compose.yml`: server service changes to `context: .` + `dockerfile: server/Dockerfile`.
- `server/Dockerfile`: `COPY client/src/data/atlas.json ./app/data/atlas.json` and the same for `research.json`.
- `deploy.yml`: `sudo docker compose up -d --build --force-recreate server` — the existing `--build` without `--force-recreate` has previously left the container on the old image, which would also silently serve a stale atlas.

Rejected: moving both files to `shared/data/`. It is cleaner layering, but costs a `agent/` output-path change, a Vite alias change, and a `publicDir`/`fs.allow` decision, to remove a wart that only exists at build time. Revisit if a second non-client consumer appears.

## 2. `atlas_index.py` + `section_resolver.py` (server, new)

Two small modules with one job each, no HTTP, no model.

**`atlas_index.py`** loads `app/data/atlas.json` (overridable via `ATLAS_DATA_DIR`, used by tests) once at lifespan startup and exposes:

- `items() -> dict[str, AtlasItem]` keyed by atlas `id` (14 entries).
- `phase(item_id, phase) -> {areas: [(area_id, name, effect_type)], transmitters: [(name, mechanism)], brain_impact: str}`.
- `research_for(item_id, limit=3) -> [{title, year, doi, abstract, areas}]` from `research.json` filtered by `relatedAtlasItems`.
- `section_names() -> set[str]` — **derived** from `atlas.json` area names after aliasing. This replaces the hardcoded `ALLOWED_SECTION_NAMES`, so the enum can no longer drift from the data it is supposed to describe.

Startup validation (and a test): every `area_id` in the atlas resolves through the alias table to a name in `BrainSectionName`. Today exactly one alias is required: `substantia_nigra → "Basal Ganglia"` (anatomically defensible; keeps `BrainSectionName` untouched). `prefrontal_cortex → Frontal Lobe` and `default_mode_network → Other` are already emitted as those names by the atlas and need no entry, but the resolver asserts it never outputs an unknown name.

**`section_resolver.py`** turns matches into sections — deterministically:

```python
resolve(matches: list[Match]) -> list[ResolvedSection]   # Match = (atlas_item, phase)
```

1. Collect `areas` for every (item, phase).
2. Collapse by area name; if effect types conflict, precedence **`damages > depresses > stimulates > modulates`** (the strongest claim wins), and every contributing item is recorded.
3. Order by `len(from_items)` desc, then name asc — stable, so the same input always yields the same output.
4. Cap at `MAX_AFFECTED_SECTIONS = 6`.

Each section carries `fromItems: [{item, phase}]`, which is what makes the UI able to answer "why is this lit up".

## 3. The single currency: `(atlas_item, phase)`

This is the core of the design. Both the model and the threshold rules emit the *same* type, and only that type produces sections.

**Deterministic matcher** (`insights.py`, rewritten): `DailySignals → list[Match]` using atlas item ids only.

| Rule | Match |
| --- | --- |
| `sleep_hours < 6`, or `sleep_quality <= 2` | `sleep_deprivation/acute` |
| `sleep_hours < 6.5` on ≥3 of last 7 days | `sleep_deprivation/chronic` (replaces acute) |
| `caffeine_units >= 3`, or `caffeine_last_hour >= 15` | `caffeine/acute` |
| `alcohol_units >= 2` | `alcohol/acute` |
| `nicotine_units >= 5` | `nicotine/acute` |
| `exercise_minutes >= 30` | `physical_activity/acute` |
| `exercise_minutes >= 30` on ≥3 of last 7 days | `physical_activity/chronic` |
| `meditation_minutes >= 10` | `meditation/acute` |
| `cognitive_load_hours >= 8` | `cognitive_overload/acute` |
| `mood_sadness >= 4` | `sadness/acute`; `>= 4` on ≥7 of last 14 days → `depression/chronic` |
| `mood_fear >= 4` | `fear/acute` |
| `mood_joy >= 4` | `joy/acute` |

Thresholds are module constants, one place, tested individually. `psilocybin`, `alzheimer_s`, `parkinson_s` have no daily threshold — they can only be matched from explicit text. `caffeine_last_hour` is the local hour (0–23) of the last caffeine, so `>= 15` means "after ~15:00" (adenosine/sleep-onset relevance, not dose).

**The `chronic` rules need history.** Every "on ≥N of last M days" row reads `daily_logs`, which lands in rollout step 3. Step 2 therefore ships acute-only: the chronic rows exist in the table and their unit tests pass against a stubbed repository returning no rows, so `promote_chronic()` is a no-op until `daily_logs` is wired. No placeholder in the other direction — `insights.py` never guesses `chronic` from a single day.

**Producers of `DailySignals`.** Two, in strict precedence order, each recorded per field in `provenance`: **`confirmed`** (user tapped a chip) > **`extracted`** (prose). A `null` extracted value never overwrites a confirmed one. There is no objective tier: step 0 deleted the fragments (`activity.*` / `nutrition.*`) that this section originally mapped onto signals, so `exercise_type`, `steps`, `water_ml` and the macro/nutrition narrative values are no longer machine-supplied — they exist only if the user writes them or taps them. §8 states what a future provider has to re-add.

**Model matcher**: the same type, from prose. `union(deterministic, model)` deduped by `(item, phase)`; deterministic wins on phase conflicts, because it is computed from numbers the user confirmed.

`merge_sections` stays as the cap/ordering seam but no longer has two vocabularies to reconcile.

## 4. Track A — grounded analysis contract

One combined call. `build_user_message` becomes a two-part prompt: retrieval context supplied by the server, then the user's day.

Model output (`responseSchema`, closed enums, no free text beyond `message`):

```json
{
  "matches":  [{"atlasItem": "sleep_deprivation", "phase": "acute", "evidence": "ledla mnie 5h"}],
  "signals":  {"sleep_hours": 5, "caffeine_units": 2, "mood_sadness": null},
  "signalEvidence": {"sleep_hours": "5h", "caffeine_units": "2 kawy"},
  "message": "..."
}
```

Server-side enforcement, in code, not in the prompt:

- A `match` without a non-empty `evidence` **quoted from the note** (substring check, whitespace/case-insensitive) is dropped.
- A `signals[k]` without `signalEvidence[k]` quoted from the note is set to `null`. This is the anti-hallucination rule: the model cannot introduce a number that is not in the text, and cannot light a region without pointing at the words.
- Model never emits `effectType` or section names at all — the resolver owns them, so finding #6 becomes structurally impossible.
- Retries/error handling in `generate_daily_log_analysis` (`503` retryable / `502` upstream) unchanged.

`message` is constrained by prompt rule + eval check: it may only cite numbers present in `signals`/`baseline`, and must state "nie podano" for anything absent. Context block given to the model, per matched item: `brainImpact` for the chosen phase, `neurotransmitters[].mechanism`, and up to 3 `research.json` abstracts. Never the whole atlas — and after step 0 there is no provider payload that could be dumped by accident (§0).

**Injectable model client.** `main.py` calls `generate_daily_log_analysis` directly, which makes every test a monkeypatch. New `ModelClient` protocol + FastAPI dependency `get_model_client()`; tests substitute a fake. This is the seam Track E needs. `set_db_client()` in `db.py` is already the established injection pattern and the new store follows it.

**Rollout flag.** `settings.ground_atlas: bool = False` (env `GROUND_ATLAS`), read only in `main.py`: `False` runs the current prompt path untouched, `True` runs the grounded one. It exists so step 1 is deployable and comparable, and it is deleted in step 3 — it is not a permanent feature toggle and no other section branches on it. While it is `True` but `daily_logs` does not yet exist (steps 1–2), the `baseline` block is simply absent from the prompt; nothing is stubbed with zeroes.

## 5. Track B — signals with zero typing cost

`DailySignals` (pydantic, `schemas.py`; all fields optional, validated at the boundary):

```
sleep_hours 0–24 · sleep_quality 1–5 · caffeine_units 0–30 · caffeine_last_hour 0–23
alcohol_units 0–40 · nicotine_units 0–60 · exercise_minutes 0–600 · exercise_type str
steps 0–100000 · meditation_minutes 0–180 · cognitive_load_hours 0–24 · water_ml 0–8000
stress 0–5 · mood_joy 0–5 · mood_fear 0–5 · mood_sadness 0–5
```

Field set is derived from atlas items, not invented — every field either feeds a §3 threshold or supplies the narrative (`water_ml`, `stress` and `steps` are context only, and the spec says so rather than pretending they map).

UI: chips under the note, each showing value + unit, `—` when null. Tapping a chip opens a stepper / preset list; the edit is sent back as `confirmedSignals` on the next analyze call and is **authoritative** (no evidence required, provenance recorded as `confirmed`). The note remains the only field the user writes; this is deliberately not the old 3-slider form — nothing is mandatory, nothing has a default, and every value is traceable to either a quote or a tap.

The chips live in `client/src/features/my-brain/` — `TodayDataPanel` is deleted with the rest of `features/integrations/` in step 0 (§0.1), so §5 builds a new surface rather than repurposing a component that was built to display provider payloads. No provider affordance anywhere in the UI.

## 6. Track D — history, baseline, phase promotion

New collection `daily_logs`, one doc per `(vault_id, date)`, written by `POST /api/my-brain/analyze`. The `na_vault` cookie no longer exists on this branch (§10), so Track D lands identity in the same step as the collection that needs it — minted by analyze when the request carries none.

```
{vault_id, date, note, signals, provenance: {field: "confirmed"|"extracted"},
 matches, sections, message, prompt_version, created_at, updated_at}
```

Collection constants and accessors follow `db.py`'s existing shape: `DAILY_LOGS_COLLECTION = "daily_logs"` + `get_daily_logs()`, unique index on `(vault_id, date)` created in `lifespan` — step 0 removed the `oauth_states` TTL index that is there today, so this becomes the only index the app creates.

`prompt_version` is stamped so baseline maths can ignore pre-grounded rows instead of mixing two semantics.

`baseline.py`: over the last 30 days — per-field mean/stdev, bedtime regularity, streak length, and `deviation(field, value) -> "6.1h vs Twoja 30-dniowa średnia 7.4h"`. That deviation string is what goes into the prompt: personal, verifiable, and the difference between "sleep deprivation impairs the frontal lobe" and "you slept 1.3h below your own norm".

Phase promotion (`chronic`) is §3's ≥N-days rule reading `daily_logs` — history is not a nice-to-have, it is the only way `chronic` becomes defensible.

Identity model reused: HttpOnly `na_vault` cookie, no email, no accounts. **Encryption is not** — step 0 deleted the AES-GCM token vault along with `remove_source`/`delete_vault_summaries` (§0.3), so the wipe in the table below is written directly against `daily_logs`, and the stored note is plaintext at rest like every other Mongo document in this app.

New endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/my-brain/log?date=` | reload persistence (note vanishes today) |
| `GET /api/my-brain/history?days=30` | history list + baseline |
| `DELETE /api/me/data` | wipes `daily_logs` for the vault (plus any leftover `oauth_vaults`/`daily_health_summaries` docs on a deployment where §0.4's teardown was skipped) |

`DELETE /api/me/data` is required, not optional: Track D creates the first durable sensitive history, and once step 0 rewrites `docs/03_LIFESTYLE_INTEGRATION_PLAN.md` into a backlog, this spec is the only place that promise lives. It deletes the vault's `daily_logs` documents directly (`delete_vault_summaries()` was provider-side plumbing and is gone), and the response **expires the `na_vault` cookie**, so the browser is not left holding an identity that still maps to rows that just vanished. UI gets a confirm step in Settings/My Brain footer, with copy that follows §0.3 — states what is stored, never claims encryption.

## 7. Track C — clarification instead of guessing

`ATLAS_REQUIRES: dict[item, list[signal]]` over the §5 fields, aligned with the §3 thresholds; `depression/alzheimer_s/parkinson_s/psilocybin → []`, so they can never generate a question. When a matched item's required signal is `null`, analyze returns:

```json
{"clarifications": [{"field": "sleep_hours", "question": "Ile godzin spałeś?", "options": ["<5","5–6","6–7","7–8","8+"]}]}
```

Max 3, ordered by `MAX_AFFECTED_SECTIONS` impact; "pomijam" leaves the analysis as-is. Answering a clarification is a chip confirmation, which re-runs analyze. Built last because it is meaningless until A and B exist.

## 8. Providers after step 0 — the seam, not the code

There is no `/api/integrations`, no connector registry, no Connected Apps panel (§0). The design does not need any of them, and nothing in §1–§7 blocks them either. A future band (or a manual CSV import, or a native Health Connect bridge) re-adds exactly five things and no section above changes:

1. A `Connector`-shaped fetcher producing normalized per-day data.
2. A third provenance tier in `schemas.py` and in §3's precedence list (`confirmed > fragment > extracted`) plus the unit conversions (`caffeine_mg → caffeine_units`, `alcohol_g → alcohol_units`).
3. One writer calling `merge` into `daily_logs`-adjacent storage — §6's doc shape already keys on `(vault_id, date)`.
4. A UI affordance listing only providers where `is_configured` is true, so the failure mode that ended this one — advertising a connect button that cannot work — does not return.
5. A test for the tier. Not optional this time: the tier ships with its test, because a producer-less tier in the schema is what this section replaced.

## 9. Track E — measurement

- `server/tests/eval/golden.jsonl`: ~25 notes, hand-labelled with expected `signals`, expected `(item, phase)` matches, expected sections, and forbidden sections. Must include traps: a note with no sleep mentioned, a note whose prose contradicts a confirmed chip (prose "8h", chip "5h" — the chip must win), a multi-cause note, a note naming a non-atlas substance.
- **CI-runnable layer** (`pytest`, default): fake `ModelClient` returns recorded JSON. Covers the resolver, alias coverage, quote-enforcement (dropped un-evidenced matches/signals), threshold table, phase promotion, baseline maths, chip-override precedence.
- **Real-model layer** (`@pytest.mark.eval`, opt-in `workflow_dispatch` with `GEMINI_API_KEY`): metrics — section precision (share of sections that appear in golden), match recall, signal extraction F1, un-evidenced-match rate, hallucinated-number rate. Reported as a table in the run log; prompt variants compared against the same set.
- New `server` job in `ci.yml`: `actions/setup-python@v5` 3.13, `pip install -r server/requirements.txt`, `pytest server/tests`. Same triggers as the existing job (`main`, `develop`, PRs to them), which does **not** cover `feature/lifestyle-integrations` — so this branch keeps relying on local runs until it merges. Local runs use `server/.venv` (system python lacks `motor`/`mongomock_motor`).

## Testing strategy

| Unit | Method |
| --- | --- |
| `atlas_index` | real `app/data/atlas.json`: 14 items, alias coverage assertion, research join |
| `section_resolver` | conflicts→precedence, alias coverage (`substantia_nigra` → Basal Ganglia), ordering determinism, cap 6 |
| `insights` matcher | each threshold row of §3 in isolation; chronic rows against a stub returning no `daily_logs` rows (must yield acute only) |
| extraction enforcement | un-evidenced match dropped; un-evidenced signal nulled |
| analyze router | fake client, cookie present/absent, upsert semantics |
| `daily_logs`/baseline | mongomock_motor; deviation strings; `prompt_version` filtering |
| analyze mints identity (§0) | request without cookie → response carries `Set-Cookie: na_vault`; request with cookie → same `vault_id`, no new cookie |
| client | chip edit → `confirmedSignals`; history view; clarifications ≤3 |

## Rollout

0. **§0 in full**: delete the integration stack, drop the three Mongo collections, rewrite `docs/03`, delete the 2026-10-04 spec and plan. Green with the 8-test residue (§10 later cut identity and Mongo too, and §10.2 grew the suite to 13).
1. Data plumbing (§1) + `atlas_index`/`section_resolver` + fake-client seam + golden skeleton (§9) → **A** switched on behind `GROUND_ATLAS=1` so the old prompt stays comparable.
2. `insights` matcher + `DailySignals` + chips (**B**).
3. `daily_logs`, baseline, phase promotion, history UI, `DELETE /api/me/data` (**D**) → then remove the flag.
4. Clarifications (**C**).

Each branch ends green with server tests + client lint/build, one commit per numbered step. Step 0 comes first deliberately: it removes the `fragment` tier, the provider chips and the `/api/integrations` client layer that steps 1–2 would otherwise have had to build around and then delete. Steps 0–2 are one implementation plan; steps 3–4 get a second plan written after step 2 ships, because the baseline and clarification designs should be revised against what the golden set actually measured, not guessed now.

## Risks

1. **Model classification is the ceiling.** If it cannot map prose to 14 items reliably, grounding just changes which mistakes are consistent. Mitigation: deterministic matches form a floor independent of the model, evidence-quoting caps the damage, golden set measures it. If match precision is under ~70% on the real-model run, the response is more atlas descriptions in the prompt, not a different architecture.
2. **One combined call couples extraction to narrative** — a malformed `message` currently 502s the whole response, taking good `signals` with it. Mitigation: parse-validate per field, drop what fails, keep the rest. Documented escape hatch: split into two calls (rejected for now by user decision).
3. **Atlas coverage is 14 items.** Diet, hydration, sunlight, temperature have no item, so they cannot produce sections. Stated explicitly rather than faked; expanding atlas content is a follow-up through `agent/`.
4. `modulates` is 54 of 86 area claims in the atlas, so sections may read as mush. Precedence rule + eval on section precision will show it; if so, the atlas language is the problem, not the resolver.
5. **New durable sensitive data** (`daily_logs`) in Mongo for an anonymous vault, and now **without** the encryption layer that used to guard the vault. Mitigation: `DELETE /api/me/data`, no `prompt_version`-mixed baselines, cookie expiry already 2 years (unchanged), history copy states what is stored and where and never claims encryption (§0.3), and the payload is the user's own note rather than a credential.
6. **Stale baked atlas** if someone regenerates `atlas.json` and deploys without rebuilding — mitigated by `--force-recreate` in `deploy.yml`; startup logs the atlas `item_count` so a drift is visible.
7. **Step 0 is a one-way door for a modest cost.** It deletes the only path to objective data, and if a band ever appears, §8's five items are re-implemented against a schema that changed underneath (`DailySignals` exists, `DailyHealthSummary` does not). Accepted: the deleted code never had credentials, so the re-implementation would be written for a provider that exists instead of for a shape inferred from Strava's JSON. Related hazard, not risk — the suite collapses to 5 tests until step 1 lands (§0.1), so step 0 must never sit merged on its own across a release.

## Rejected alternatives

| Alternative | Why not |
| --- | --- |
| Restore sliders for sleep/coffee/mood | Forces invented values on every day and produces the least auditable input possible; chips are opt-in and quote-backed. |
| Device OAuth now (Whoop/Oura/Withings) | Needs hardware + approved developer apps that do not exist; would deliver empty panels, not accuracy. |
| Embedding/vector RAG over research literature | 89 studies and 14 items is a lookup table, not a retrieval problem. |
| `shared/data/` canonical move | Costs three build/import paths to remove a build-time wart; revisit with a second consumer. |
| Client-side section resolution from `atlas.json` | Sections drive persistence, baselines and the prompt; trusting the browser for them makes history forgeable and the eval unmeasurable. |
| Asking Gemini for `affectedSections` with a bigger enum | Keeps the failure mode (invented regions) and only widens the alphabet. |
| Keep the Strava/FatSecret plumbing, just hide unconfigured providers (the decision this spec originally recorded) | Reversed on 2026-10-09. Hiding is not deferring: it keeps 1.1k lines of server code, 490 of client code and a Mongo collection whose only user-facing state is "connect works in dev, can never work in prod". Step 0 also removes the temptation to keep building the `fragment` tier for data that cannot arrive. |
| Keep `fragment` in the provenance enum as a free extension point | A tier with no producer has no test, and an untested precedence level in the code that decides what the model is told is exactly the kind of code that rots silently. §8 re-adds it together with its test. |
| Encrypt `daily_logs` with `SERVER_TOKEN_KEY` anyway | No credential is stored any more; per-vault HKDF derivation would add a key-rotation path that can destroy every user's history while protecting nothing that a Mongo read does not already expose. |
| Keep `cryptography` "in case we need it" | It is one line in `requirements.txt` and an import in a file that no longer has any crypto in it; leaving it means the next reader has to work out whether it is load-bearing. |

---

## 10. Same-day corrections after step 0

Two things step 0 got wrong, both surfaced by running the app rather than by reading the code.

### 10.1 Identity and the database were cut as well (overrides §0.2 and the Mongo rows of §0.5)

Step 0 kept `vault.py`, `na_vault`, `db.py`, `mongo_url`, `motor`, `mongomock-motor` and a `mongo` compose service **for a consumer that only arrives in Track D** — and had `analyze` mint a two-year HttpOnly cookie that no line of code reads. That is speculative infrastructure with a privacy side effect, so it went: the API is now `note → Gemini → sections`, stateless, no database, no identity.

Rule this leaves for Track D: `daily_logs`, its accessors, the driver, the compose service, the cookie and its issuance point land **together, in the step that first reads a `vault_id`** — never before. §0.2 stays as the option analysis to re-read when that step is planned; §6's doc shape and endpoints are unchanged. The old `mongo_data` volume on the VPS is deliberately left in place (deleting it is a separate, destructive decision).

### 10.2 `Invalid JSON returned by Gemini` — root cause

Symptom: every Generate ended in `Could not generate analysis.`.

Reproduced against the live endpoint, twice:

| Call | Evidence |
| --- | --- |
| 1 | `200`, `finishReason: STOP`, **one** part, 1193 chars: a complete JSON object followed by three stray characters. `json.loads` over the whole string raises `Extra data: line 30 column 1 (char 1190)` → the `except Exception` blanket turned it into `502 Invalid JSON returned by Gemini.` |
| 2 | `503` from upstream (`This model is currently experiencing high demand`) — the same status that filled the container log, and unrelated to our parsing |
| 3 | `httpx.ReadTimeout` after 40 s escaped `gemini.py` entirely, hit `main.py`'s blanket handler, and became a `502` whose `detail` was **empty** (`str(ReadTimeout())` is `""`), so the UI could only say `API error (502)` |

Fix at the boundary, in `gemini.py::parse_analysis(data)`: join **every** text part instead of trusting `parts[0]`, take the first JSON object with `json.JSONDecoder().raw_decode()` (trailing fences/tokens and leading prose both survive), keep **one entry per region** (the model repeats a region with a contradicting effect type — observed live: `Frontal Lobe` twice, `Amygdala` twice in one six-entry answer), then apply `MAX_AFFECTED_SECTIONS = 6`. Cap and dedupe now live here, which is why `merge_sections` — without a caller since step 0 — is deleted rather than re-plumbed. The three failure modes get three distinct messages instead of one blanket `Invalid JSON`.

Transport is separated too: `httpx.TransportError` becomes a retryable `503 "Gemini did not respond in time."` and the request timeout moved 40 s → 60 s, because this model's latency under load is the dominant term.

Deliberately unchanged: `responseMimeType` + `responseSchema` (the endpoint does honor them — the object came back well-shaped; the trailing token is sampler noise, cheaper to ignore than to fight), `temperature: 0.7`, and the client's retry-on-`502`, which is right precisely because the sampler is nondeterministic: a second attempt can return clean JSON.

Coverage: 15 tests, including the observed `…}\n``` ` shape, fences with leading prose, a response split across parts, the dedupe case, the cap, the timeout mapping, and each rejection branch. The dedupe and timeout cases were written against the pre-fix code, which returned the duplicates and the `502`-with-empty-`detail` respectively.

**Still open at the time of writing:** upstream returned `503 high demand` for every attempt in the last few minutes, so the dedupe path has one live confirmation (the successful call above, before dedupe shipped) and no live call since. The behavior is covered by tests; re-check in the UI once the provider recovers.
