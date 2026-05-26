# NeuroAtlas — API (FastAPI)

Minimal backend used as a **server-side proxy** so API keys never ship to the browser.

## Run locally

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Health check: `GET /health`

MyBrain analysis: `POST /api/my-brain/analyze`

## Env

Create `server/.env`:

```bash
GEMINI_API_KEY=...
```

