# NeuroAtlas AI Agent — Data Collector for Substances & Research

An automated multi-agent system designed to collect, synthesize, and validate scientific data on psychoactive substances and research papers for **NeuroAtlas**.

## Architecture

The system uses a 3-stage multi-agent pipeline:

1. **Researcher Agent (`ResearcherAgent`)**:
   - Queries **Europe PMC REST API** and **PubMed E-utilities API** for open-access research papers, DOIs, authors, and abstracts.
   - Queries **PubChem PUG REST API** and **PsychonautWiki GraphQL API** for chemical properties, pharmacology, mechanisms of action, and reported effects.

2. **Synthesizer Agent (`SynthesizerAgent`)**:
   - Synthesizes raw data into structured Pydantic schemas (`AtlasItem` & `ResearchPaperItem`).
   - Calls an **OpenAI-compatible LLM API** to generate scientifically accurate structured data. **API key is required.**

3. **Validator Agent (`ValidatorAgent`)**:
   - Validates brain area names against `VALID_BRAIN_SECTIONS` defined in NeuroAtlas.
   - Sanitizes DOIs, tags, and slug IDs.
   - Merges newly fetched items into `client/src/data/atlas.json` and `client/src/data/research.json`.

---

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure API Key (Required)

Copy `.env.example` to `.env` and fill in your API credentials:

```bash
cp .env.example .env
```

```env
# Required
API_KEY=your_api_key_here

# Optional — defaults shown below
BASE_URL=https://api.deepseek.com
MODEL=DeepSeek-V4-Flash-0731
```

> **The agent will not start without a valid `API_KEY` set in `.env`.**

---

## Compatible API Providers

The agent uses the **OpenAI-compatible Chat Completions API** (`POST /chat/completions`).
Any provider supporting this interface works by setting `BASE_URL` and `MODEL` accordingly.

| Provider | `BASE_URL` | Recommended `MODEL` | Notes |
|---|---|---|---|
| **DeepSeek** *(default)* | `https://api.deepseek.com` | `DeepSeek-V4-Flash-0731` | Best price/performance ratio |
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o-mini` | Industry standard |
| **OpenRouter** | `https://openrouter.ai/api/v1` | `deepseek/deepseek-chat` | Access to many models via one key |
| **Groq** | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` | Very fast inference |
| **Together AI** | `https://api.together.xyz/v1` | `meta-llama/Llama-3-70b-chat-hf` | Open models |
| **Mistral AI** | `https://api.mistral.ai/v1` | `mistral-large-latest` | European-hosted |
| **Ollama** *(local)* | `http://localhost:11434/v1` | `llama3.1` | No API key needed locally |

> For **Ollama** (local models) set `API_KEY=ollama` (any non-empty value) and `BASE_URL=http://localhost:11434/v1`.

---

## Usage

#### Dry-run (preview output, no files written):
```bash
python main.py --substance "MDMA" --dry-run
```

#### Fetch & update atlas.json and research.json:
```bash
python main.py --substance "Psilocybin"
```

#### Fetch a specific number of papers:
```bash
python main.py --substance "Nicotine" --max-papers 5
```
