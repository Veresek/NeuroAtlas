# Design: Atlas-Grounded My Brain Accuracy (no third-party devices)

> **Date:** 2026-10-09 · **Branch:** `feature/lifestyle-integrations` · **Status:** approved design, awaiting implementation plan
> **Supersedes nothing:** `2026-10-04-lifestyle-integrations-strava-fatsecret-design.md` stays valid; this design changes what My Brain does with its input, not the vault plumbing.

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
- Strava/FatSecret plumbing: **keep**, hide unconfigured providers from the UI.

## Goals

1. Every `affectedSections` entry is derivable from `atlas.json`, with provenance. Zero invented brain areas.
2. Objective-ish structure (`DailySignals`) exists per day, is user-correctable, and is auditable against the note.
3. History produces a personal baseline; `acute` vs `chronic` is decided by data, not by the model's mood.
4. Missing signals become an explicit "not provided" or a question — never an invented number.
5. Accuracy is measurable: a golden set with named metrics runs in CI.

## Non-goals

No device/provider APIs, no webhooks, no accounts, no Apple Health/Health Connect, no embeddings/vector store, no slider inputs, no changes to `agent/` logic (atlas *content* expansion is explicitly out of scope here).

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

**Producers of `DailySignals`.** Three, in strict precedence order, each recorded per field in `provenance`: **`confirmed`** (user tapped a chip) > **`fragment`** (objective provider data) > **`extracted`** (prose). The middle tier is what keeps the connector plumbing we decided to keep actually feeding the analysis instead of being orphaned by this rewrite — today `insights.py` reads fragments, and after §3 it reads signals:

| Existing fragment field | Signal | Conversion |
| --- | --- | --- |
| `activity.active_minutes` | `exercise_minutes` | identity |
| `activity.workouts[0].type` | `exercise_type` | identity |
| `activity.steps` | `steps` | identity |
| `nutrition.caffeine_mg` | `caffeine_units` | `/ CAFFEINE_MG_PER_UNIT = 100` |
| `nutrition.alcohol_g` | `alcohol_units` | `/ ALCOHOL_G_PER_UNIT = 10` |
| `nutrition.water_ml` | `water_ml` | identity |
| `nutrition.calories`, macros, `calories_burned` | — | narrative context only, never a match |

A `null` fragment field never overwrites a lower-tier value. `filter_disabled` keeps masking disabled providers before this step, so a paused app contributes nothing — semantics unchanged from the Connected Apps design.

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

`message` is constrained by prompt rule + eval check: it may only cite numbers present in `signals`/`baseline`, and must state "nie podano" for anything absent. Context block given to the model, per matched item: `brainImpact` for the chosen phase, `neurotransmitters[].mechanism`, and up to 3 `research.json` abstracts. Never a raw provider payload, never the whole atlas.

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

`TodayDataPanel` is repurposed as the signal surface; provider chips remain but only for configured providers (§8).

## 6. Track D — history, baseline, phase promotion

New collection `daily_logs`, one doc per `(vault_id, date)`, written by `POST /api/my-brain/analyze` when a vault cookie is present (no cookie ⇒ stateless analysis, still allowed — same no-account rule as today).

```
{vault_id, date, note, signals, provenance: {field: "confirmed"|"fragment"|"extracted"},
 matches, sections, message, prompt_version, created_at, updated_at}
```

Collection constants and accessors follow `db.py`'s existing shape: `DAILY_LOGS_COLLECTION = "daily_logs"` + `get_daily_logs()`, unique index on `(vault_id, date)` created in `lifespan` alongside the `oauth_states` TTL index.

`prompt_version` is stamped so baseline maths can ignore pre-grounded rows instead of mixing two semantics.

`baseline.py`: over the last 30 days — per-field mean/stdev, bedtime regularity, streak length, and `deviation(field, value) -> "6.1h vs Twoja 30-dniowa średnia 7.4h"`. That deviation string is what goes into the prompt: personal, verifiable, and the difference between "sleep deprivation impairs the frontal lobe" and "you slept 1.3h below your own norm".

Phase promotion (`chronic`) is §3's ≥N-days rule reading `daily_logs` — history is not a nice-to-have, it is the only way `chronic` becomes defensible.

Identity and encryption model are reused untouched: HttpOnly `na_vault` cookie, no email, no accounts, `remove_source`/`delete_vault_summaries` already exist in `summary_store.py`.

New endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/my-brain/log?date=` | reload persistence (note vanishes today) |
| `GET /api/my-brain/history?days=30` | history list + baseline |
| `DELETE /api/me/data` | wipes `daily_logs` + `daily_health_summaries` + `oauth_vaults` for the vault |

`DELETE /api/me/data` is required, not optional: Track D creates the first durable sensitive history, and `docs/03_LIFESTYLE_INTEGRATION_PLAN.md` already promises "Clear my data". It reuses `delete_vault_summaries()` plus `daily_logs`/`oauth_vaults` deletes, and the response **expires the `na_vault` cookie**, so a wiped vault cannot be re-populated from stale browser state. UI gets a confirm step in Settings/My Brain footer.

## 7. Track C — clarification instead of guessing

`ATLAS_REQUIRES: dict[item, list[signal]]` over the §5 fields, aligned with the §3 thresholds; `depression/alzheimer_s/parkinson_s/psilocybin → []`, so they can never generate a question. When a matched item's required signal is `null`, analyze returns:

```json
{"clarifications": [{"field": "sleep_hours", "question": "Ile godzin spałeś?", "options": ["<5","5–6","6–7","7–8","8+"]}]}
```

Max 3, ordered by `MAX_AFFECTED_SECTIONS` impact; "pomijam" leaves the analysis as-is. Answering a clarification is a chip confirmation, which re-runs analyze. Built last because it is meaningless until A and B exist.

## 8. Integrations: stop advertising what cannot work

`GET /api/integrations` gains `configured: bool` per provider (from `Connector.is_configured`); `ConnectedAppsPanel`'s `+ Connect app` lists only configured providers. No connector deletion, no schema change. Providers stay a valid extension point, so a future band feeds §3 for free.

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
| client | chip edit → `confirmedSignals`; history view; clarifications ≤3; panel hides unconfigured |

## Rollout

1. Data plumbing (§1) + `atlas_index`/`section_resolver` + fake-client seam + golden skeleton (§9) → **A** switched on behind `GROUND_ATLAS=1` so the old prompt stays comparable.
2. `insights` matcher + `DailySignals` + chips (**B**).
3. `daily_logs`, baseline, phase promotion, history UI, `DELETE /api/me/data` (**D**) → then remove the flag.
4. Clarifications (**C**). §8 goes in whenever convenient, it is independent.

Each branch ends green with server tests + client lint/build, one commit per numbered step. **Decomposition:** steps 1–2 are one implementation plan; steps 3–4 get a second plan written after step 2 ships, because the baseline and clarification designs should be revised against what the golden set actually measured, not guessed now.

## Risks

1. **Model classification is the ceiling.** If it cannot map prose to 14 items reliably, grounding just changes which mistakes are consistent. Mitigation: deterministic matches form a floor independent of the model, evidence-quoting caps the damage, golden set measures it. If match precision is under ~70% on the real-model run, the response is more atlas descriptions in the prompt, not a different architecture.
2. **One combined call couples extraction to narrative** — a malformed `message` currently 502s the whole response, taking good `signals` with it. Mitigation: parse-validate per field, drop what fails, keep the rest. Documented escape hatch: split into two calls (rejected for now by user decision).
3. **Atlas coverage is 14 items.** Diet, hydration, sunlight, temperature have no item, so they cannot produce sections. Stated explicitly rather than faked; expanding atlas content is a follow-up through `agent/`.
4. `modulates` is 54 of 86 area claims in the atlas, so sections may read as mush. Precedence rule + eval on section precision will show it; if so, the atlas language is the problem, not the resolver.
5. **New durable sensitive data** (`daily_logs`) in Mongo for an anonymous vault. Mitigation: `DELETE /api/me/data`, no `prompt_version`-mixed baselines, cookie expiry already 2 years (unchanged), and history copy in UI states what is stored and where.
6. **Stale baked atlas** if someone regenerates `atlas.json` and deploys without rebuilding — mitigated by `--force-recreate` in `deploy.yml`; startup logs the atlas `item_count` so a drift is visible.

## Rejected alternatives

| Alternative | Why not |
| --- | --- |
| Restore sliders for sleep/coffee/mood | Forces invented values on every day and produces the least auditable input possible; chips are opt-in and quote-backed. |
| Device OAuth now (Whoop/Oura/Withings) | Needs hardware + approved developer apps that do not exist; would deliver empty panels, not accuracy. |
| Embedding/vector RAG over research literature | 89 studies and 14 items is a lookup table, not a retrieval problem. |
| `shared/data/` canonical move | Costs three build/import paths to remove a build-time wart; revisit with a second consumer. |
| Client-side section resolution from `atlas.json` | Sections drive persistence, baselines and the prompt; trusting the browser for them makes history forgeable and the eval unmeasurable. |
| Asking Gemini for `affectedSections` with a bigger enum | Keeps the failure mode (invented regions) and only widens the alphabet. |
