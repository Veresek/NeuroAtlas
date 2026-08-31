# Lifestyle integrations (sleep, activity, nutrition)

> **Status:** Plan / Phase 2+
> **Related:** [01_MVP_SCOPE.md](01_MVP_SCOPE.md), [02_AI_AND_FUTURE.md](02_AI_AND_FUTURE.md)

Pull objective lifestyle data from third-party APIs so Digital Twin and Gemini analysis are not limited to the three-field Daily Log (`sleep`, `coffee`, `mood`).

---

## Constraints

| Rule | Detail |
| --- | --- |
| **No NeuroAtlas accounts** | No email/password, no social login to this app. |
| **`agent/` is atlas ingestion only** | CLI pipeline that writes `client/src/data/atlas.json` and `research.json`. Runtime AI (`server/app/services/gemini.py`, `/api/my-brain/analyze`, any future chat) must not import, call, or reuse `agent/` code, prompts, or LangChain. Shared vocabulary (section names, `stimulates/depresses/damages/modulates`) lives in the server copy (`ALLOWED_SECTION_NAMES`), not in `agent/schemas.py`. |
| Education, not medical advice | Same as the current Gemini system prompt. |

---

## Current baseline

| Piece | Today |
| --- | --- |
| User input | `MyBrainLog` = `{ sleep: 0–24h, coffee: 0–50, mood: 0–4 }` |
| Runtime AI | `POST /api/my-brain/analyze` → Gemini via `build_user_message` |
| Output | `message` + `affectedSections[]` |
| Persistence | MongoDB planned; Daily Log is currently client-side |
| Atlas data | Produced offline by `agent/`; consumed as static JSON |

---

## Data we actually need

Map to neuro-relevant signals (dopamine, cortisol, serotonin, melatonin, adenosine, BDNF, GABA/glutamate, glucose). Keep Daily Log as the subjective overlay.

| Group | Fields | Why |
| --- | --- | --- |
| Sleep | bedtime/wake, duration, REM/deep/light, efficiency, night HRV | melatonin, adenosine, hippocampus, mood |
| Activity | steps, workouts (type, min, HR zones), calories, resting HR, HRV, readiness | BDNF, dopamine, cortisol |
| Nutrition | calories, macros, caffeine mg, water ml, alcohol g | glucose, serotonin, adenosine |
| Stress / vitals | stress score, HRV trend, skin temp if present | cortisol, amygdala vs prefrontal |

Canonical day record (merge all connectors + Daily Log):

```ts
interface DailyHealthSummary {
  date: string; // YYYY-MM-DD
  sources: string[];
  sleep?: { durationH: number; deepH: number; remH: number; efficiency: number };
  activity?: {
    steps: number;
    activeMinutes: number;
    caloriesBurned: number;
    workouts: { type: string; durationMin: number; calories: number; avgHr?: number }[];
  };
  nutrition?: {
    calories: number; proteinG: number; carbsG: number; fatG: number;
    caffeineMg: number; waterMl: number; alcoholG: number;
  };
  vitals?: { restingHr: number; hrvMs: number; stressLevel?: number; bodyBattery?: number };
  mood?: number; // 0–4 from Daily Log
}
```

Deduplicate on `(source, external_id, date)`. Sanity-check (sleep ≤ 24h, etc.). Store one doc per vault per day.

---

## Connectors

Start with **web OAuth** providers. Skip Apple HealthKit and Android Health Connect until a native shell exists (neither is reachable from a browser).

| Prio | Provider | Data | Auth | Notes |
| --- | --- | --- | --- | --- |
| 1 | Strava | workouts | OAuth2 + PKCE | Easiest web win |
| 1 | Google Fit REST | sleep, activity, HR | OAuth2 | Being replaced by Health Connect; use while the REST API still works |
| 2 | Oura | sleep, HRV, readiness | OAuth2, webhooks | Best sleep quality |
| 2 | Garmin | training, sleep, HRV, body battery | OAuth | Strong athlete coverage |
| 3 | Whoop / Fitbit | HRV, strain, sleep | OAuth2 / webhooks | Fitbit Web API access is restricted for new apps — verify before building |
| 3 | Cronometer / Yazio / MFP | meals, macros | OAuth or export | Nutrition; APIs vary |
| — | Open Food Facts | barcode → nutrients | none | Enrich manual food entries |

Each provider is a separate connector that emits `DailyHealthSummary` fragments. Sync on demand when the user opens Digital Twin (polling every 6–12h is optional later). Prefer pull-on-open over webhooks in a no-account app (webhooks need a stable server-side subscriber).

---

## Identity and OAuth without accounts

Third-party OAuth still produces **per-user refresh tokens**. NeuroAtlas does not have users. Those two facts are compatible if identity is a **browser vault**, not a person.

**Are accounts required?** No. They become useful only for multi-device sync, durable webhooks, or GDPR requests that must follow a person across browsers. None of that is in scope.

**Do not store tokens in `localStorage`.** XSS can read them. Most health APIs are **confidential clients** (`client_secret` cannot ship in the SPA), so the OAuth code exchange must happen on the server.

### Recommended model: anonymous encrypted vault

1. **App credentials** (`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, …) live in server env only.
2. **Vault cookie.** On first “Connect Strava”, the server sets an HttpOnly, Secure, SameSite cookie: opaque `vault_id` (UUID). No email, no password, no login UI. This is a device session, not an account.
3. **Token storage.** After the OAuth callback, encrypt `refresh_token` with AES-256-GCM. Key = `HKDF(SERVER_TOKEN_KEY, vault_id)`. Store `{ vault_id, provider, ciphertext, iv, expiry, scopes }` in MongoDB (`oauth_vaults`). Access tokens are short-lived and never sent to the client.
4. **API use.** Connectors run on the server, keyed by the cookie. The client never sees provider tokens. Gemini receives only a minimized `DailyHealthSummary` + 7-day trend, same as today’s Daily Log path.
5. **Revoke / wipe.** Disconnect calls the provider revoke endpoint, deletes the vault row. “Clear my data” deletes all `DailyHealthSummary` docs for that `vault_id` and the cookie.
6. **New browser / cleared cookies.** Connections are gone. Optional later (still not an account): download a recovery file = encrypted export of vault records, unlockable with a locally generated passphrase stored only on the device.

### Rejected alternatives

| Approach | Why not |
| --- | --- |
| Tokens only in IndexedDB | Confidential-client OAuth cannot complete in the browser; refresh tokens are XSS-visible; no server sync |
| Email/password “just for OAuth” | Contradicts the no-login product |
| Encrypt tokens with a key that never leaves the device | Server cannot refresh in the background; still need a confidential-client callback, so complexity without much gain for pull-on-open |

Webhooks (Oura, Whoop): defer. They need a stable `vault_id` that outlives cookie rotation. Poll-on-open is enough for Phase A–B.

---

## Runtime AI (not `agent/`)

Extend `build_user_message` in `server/app/services/gemini.py`. Input is Daily Log + today’s summary + 7-day averages. Require the model to cite the numbers. Do not pass raw provider payloads.

```
sleep_hours=6.2 (deep=1.1h, rem=1.4h, efficiency=0.72)
coffee_cups=2  mood_label=Neutral
steps=8200  workout=[running 35min avgHr=148]
nutrition={calories:2100, protein:120g, caffeine:180mg, water:1800ml}
vitals={restingHr:58, hrv:38ms, stress:42}
trend_7d={sleep_avg:6.8, hrv_avg:45, stress_avg:55}
```

Deterministic insight layer (server, not `agent/`) can pre-map signals → `affectedSections` so Gemini stays consistent with the atlas language:

| Signal | Likely effect |
| --- | --- |
| Sleep &lt; 6h / low efficiency | Frontal `depresses`, Amygdala `stimulates` (cortisol ↑) |
| High REM (trend) | Hippocampus `stimulates` |
| Cardio 30–60 min | Hippocampus + Nucleus Accumbens `stimulates` (BDNF / dopamine) |
| High HRV / high body battery | Amygdala `depresses` |
| Low HRV / high stress | Amygdala `stimulates`; chronic → Prefrontal `damages` |
| Caffeine &gt; 200 mg | Thalamus `stimulates` (adenosine block) |
| Alcohol | Brainstem `depresses` |
| High-GI / sugar spike | Hypothalamus `modulates` |
| Water &lt; ~1.5 L | Prefrontal `depresses` |

Heuristics need a literature pass against `research.json` before shipping. They must be implemented in `server/`, not by invoking `agent/`.

---

## Privacy

- Explicit connect screen: what is pulled, why, retention. Revoke anytime.
- Fetch only fields listed above.
- Tokens encrypted at rest; Gemini gets minimized current + 7-day aggregates only.
- GDPR for a vault: export and delete by `vault_id` (cookie / recovery file). No person-level identity unless accounts are added later.

---

## Phases

**A — Plumbing:** `DailyHealthSummary` + `oauth_vaults`; Strava connector; connect/disconnect UI; `GET /api/me/health?from=&to=` (cookie-scoped).

**B — Insight:** heuristic map; richer Gemini prompt; show data source next to each metric on the Twin.

**C — More connectors:** Oura, Garmin, one nutrition source, Open Food Facts scan. Chat (`02_AI_AND_FUTURE.md` §A) using the same summary, still via server Gemini, never `agent/`.

**D — Optional:** Health Connect / HealthKit via a native wrapper; accounts only if multi-device demand appears.

First build: vault + Strava + canonical schema, then fold the summary into `/api/my-brain/analyze`.
