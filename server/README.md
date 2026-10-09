# NeuroAtlas — API (FastAPI)

Backend used as a **server-side proxy** so API keys never ship to the browser: it holds the
Gemini key and runs the My Brain analysis. `POST /api/my-brain/analyze` takes the free-text
Daily Log note and returns a summary plus the brain regions it affects. Nothing is stored —
the request is stateless and the app has no accounts and no database.

## Run locally

```bash
cd server
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env        # fill in the values
uvicorn app.main:app --reload --port 8000
```

With Docker:

```bash
docker compose up --build
```

Health check: `GET /health`

## Tests

From `server/`, using the project venv (system Python lacks the pinned dependencies):

```bash
.venv\Scripts\python -m pytest -q      # Windows
```

## Env

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Gemini key, never sent to the client |
| `GEMINI_MODEL` | Model id used by `/api/my-brain/analyze` |

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness |
| POST | `/api/my-brain/analyze` | `{ note }` → `{ message, affectedSections[] }` via one Gemini call |

Errors are explicit for the client: `503` when Gemini is overloaded or rate-limited (the
client retries), `502` when the upstream call fails or its answer cannot be parsed.
