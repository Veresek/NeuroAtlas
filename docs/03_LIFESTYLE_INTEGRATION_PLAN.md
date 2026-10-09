# Lifestyle data (sleep, activity, nutrition) — deferred providers backlog

> **Status:** **Nothing is integrated.** A Strava + FatSecret implementation was built in 2026-10 (phases A–B) and **removed on 2026-10-09** as rollout step 0 of [the atlas-grounded accuracy design](superpowers/specs/2026-10-09-my-brain-atlas-grounded-accuracy-design.md). Its connectors, OAuth router, encrypted token vault, `daily_health_summaries` store and the Connected Apps panel no longer exist in the codebase. This document is a backlog of provider candidates plus the constraints any of them must respect.
> **Related:** [01_MVP_SCOPE.md](01_MVP_SCOPE.md), [02_AI_AND_FUTURE.md](02_AI_AND_FUTURE.md), and §8 of the design above for the exact seam a provider plugs into.

---

## Why the first attempt was removed

| Finding | Consequence |
| --- | --- |
| No provider credentials ever existed in any environment — `server/.env` absent, root `.env` holds `GEMINI_API_KEY` only. | The connect flow worked in dev with fakes and could never work in production. A UI that advertises it is worse than no UI. |
| Strava requires owning the device/account; FatSecret requires a developer key. Neither is something a visitor of `neuroatlas.info` will register to try the app. | Objective data could not be the foundation of the analysis. |
| The heuristics fired only from provider fragments, so with no credentials they were dead code. | The accuracy work moved to grounding the analysis in the atlas the app already ships (`atlas.json`, `research.json`), where the input is the user's own note. |

The product question that removed it: **accuracy came from grounding, not from more inputs.** Adding a provider later is still welcome — it must arrive with credentials and a test, not with a panel.

---

## Constraints that survive the removal

| Rule | Detail |
| --- | --- |
| **No NeuroAtlas accounts** | No email/password, no social login. Identity is the anonymous HttpOnly `na_vault` cookie (UUID), minted by `POST /api/my-brain/analyze`. |
| **`agent/` is atlas ingestion only** | CLI pipeline that writes `client/src/data/atlas.json` and `research.json`. Runtime AI (`server/app/services/gemini.py`, `/api/my-brain/analyze`, any future chat) must not import, call, or reuse `agent/` code, prompts, or LangChain. |
| Education, not medical advice | Same as the current Gemini system prompt. |
| No claims the code cannot keep | UI copy must not promise sync, encryption or coverage that is not implemented. The removed panel said "encrypted on the server"; the notes in `daily_logs` are not encrypted, so copy must say what is stored and where instead. |

---

## Current baseline

| Piece | Today |
| --- | --- |
| User input | `MyBrainLog` = `{ note }` — one free-text field, plus confirm chips planned in Track B |
| Signals | `DailySignals` (Track B), produced from prose or a tap, with per-field provenance `confirmed > extracted` |
| Runtime AI | `POST /api/my-brain/analyze` → one grounded Gemini call |
| Output | `message` + `affectedSections[]` resolved in code from `atlas.json`, never invented by the model |
| Persistence | MongoDB (`daily_logs` from Track D); no provider collections |
| Atlas data | Produced offline by `agent/`; consumed as static JSON, baked into the server image at build time |

---

## Provider candidates

Start with **web OAuth** providers. Skip Apple HealthKit and Android Health Connect until a native shell exists (neither is reachable from a browser).

| Prio | Provider | Data | Auth | Notes |
| --- | --- | --- | --- | --- |
| 1 | Strava | workouts | OAuth2 + PKCE | Easiest web win — the connector is already designed, see git history up to 2026-10-09 |
| 1 | Google Fit REST | sleep, activity, HR | OAuth2 | Being replaced by Health Connect; use while the REST API still works |
| 2 | Oura | sleep, HRV, readiness | OAuth2, webhooks | Best sleep quality; needs an approved developer app |
| 2 | Garmin | training, sleep, HRV, body battery | OAuth | Strong athlete coverage |
| 3 | Whoop / Fitbit | HRV, strain, sleep | OAuth2 / webhooks | Fitbit Web API access is restricted for new apps — verify before building |
| 3 | Cronometer / Yazio / MFP | meals, macros | OAuth or export | Nutrition; APIs vary |
| — | Open Food Facts | barcode → nutrients | none | Enrich manual food entries |

Webhooks: still deferred. They need a stable `vault_id` that outlives cookie rotation, which an anonymous cookie does not give us.

---

## Data worth having

Signal groups worth mapping to neuro-relevant mechanisms (dopamine, cortisol, serotonin, melatonin, adenosine, BDNF, GABA/glutamate, glucose):

| Group | Fields | Why |
| --- | --- | --- |
| Sleep | bedtime/wake, duration, REM/deep/light, efficiency, night HRV | melatonin, adenosine, hippocampus, mood |
| Activity | steps, workouts (type, min, HR zones), calories, resting HR, HRV, readiness | BDNF, dopamine, cortisol |
| Nutrition | caffeine mg, alcohol g, water ml, macros | glucose, serotonin, adenosine |
| Stress / vitals | stress score, HRV trend, skin temp if present | cortisol, amygdala vs prefrontal |

A provider does **not** get to define the schema: it maps its payload onto `DailySignals` (§5 of the design) and becomes a third provenance tier (`confirmed > fragment > extracted`). The old `DailyHealthSummary` shape is gone; `agent/`-side atlas coverage decides what is even usable — sleep architecture and HRV currently have no atlas item, so they cannot light a region yet.

---

## Identity and OAuth without accounts

Third-party OAuth produces per-user refresh tokens while NeuroAtlas has no users. Compatible if identity is a **browser vault**, not a person — this part of the 2026-10 design still holds:

1. App credentials live in server env only.
2. The opaque `vault_id` cookie is a device session, not an account.
3. Refresh tokens must be encrypted at rest (AES-256-GCM with `HKDF(SERVER_TOKEN_KEY, vault_id)`) and never sent to the client. **Note:** none of that machinery exists now — it was deleted with the connectors, and only a real provider justifies bringing it back.
4. Never store provider tokens in `localStorage` (XSS-visible) and never attempt confidential-client OAuth in the browser.

Rejected then, still rejected: email/password "just for OAuth"; device-only keys that prevent server-side refresh.

---

## Phases

**A — Plumbing:** ❌ Removed (built 2026-10, deleted 2026-10-09).
**B — Insight:** ❌ Removed with A; replaced by atlas grounding in the design above.
**C — Providers:** ⏸ Blocked on the user registering a provider app and shipping credentials. Not blocked on code.
**D — Optional:** Health Connect / HealthKit via a native wrapper; accounts only if multi-device demand appears.
