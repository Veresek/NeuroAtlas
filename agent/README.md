# NeuroAtlas AI Agent — OpenRouter & LangChain Data Collector

An automated multi-agent system designed to collect, synthesize, and validate scientific data on psychoactive substances and academic research papers for **NeuroAtlas**, powered by **OpenRouter** and **LangChain**.

---

## Features

- **OpenRouter LLM Integration**: Connects to any OpenRouter model (`deepseek/deepseek-chat`, `openai/gpt-4o-mini`, `anthropic/claude-3.5-haiku`, `meta-llama/llama-3.3-70b-instruct`, etc.) with app attribution headers and resilient structured output extraction.
- **LangChain Multi-Agent Architecture**:
  1. **Researcher Agent (`ResearcherAgent`)**: Fetches verified papers from **Europe PMC REST API** and **NCBI PubMed API**, plus chemical & pharmacological mechanisms from **PubChem PUG REST** and **PsychonautWiki GraphQL**.
  2. **Synthesizer Agent (`SynthesizerAgent`)**: Uses LangChain prompt templates and OpenRouter LLMs to synthesize raw research into structured NeuroAtlas schema with acute, chronic, and withdrawal neurodynamics.
  3. **Validator Agent (`ValidatorAgent`)**: Reconciles brain sections against `VALID_BRAIN_SECTIONS`, cleans DOIs and tags, and merges records into `client/src/data/atlas.json` and `client/src/data/research.json`.

---

## Quickstart

### 1. Setup Virtual Environment & Install Dependencies

```bash
cd agent
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure OpenRouter API Key

Create `.env` inside `agent/` (or copy `.env.example` to `.env`):

```bash
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-api-key
BASE_URL=https://openrouter.ai/api/v1
MODEL=deepseek/deepseek-chat
```

Get an API key at [https://openrouter.ai/settings/keys](https://openrouter.ai/settings/keys).

### 3. Run the Agent Pipeline

```bash
# Research a substance and collect 5 papers (saves to atlas.json and research.json)
python main.py -s "Psilocybin" -m 5

# Dry run mode (preview generated data without writing to disk)
python main.py -s "MDMA" -m 4 --dry-run

# Override the model from CLI
python main.py -s "Ketamine" --model openai/gpt-4o-mini
```

---

## CLI Options

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--substance` | `-s` | Name of substance to research (e.g. `MDMA`, `Caffeine`, `Psilocybin`) | *Required* |
| `--target-papers` | `-m` | Target number of relevant peer-reviewed papers | `5` |
| `--dry-run` | | Run research and print generated data preview without modifying JSON files | `False` |
| `--model` | | OpenRouter model ID override | Value from `.env` |

---

## Output Datasets

The pipeline merges structured entries directly into:
- `client/src/data/atlas.json`: Substance metadata, descriptions, acute/chronic/withdrawal brain impacts, affected brain areas, and neurotransmitter shifts.
- `client/src/data/research.json`: Academic paper titles, authors, publication years, journals, DOIs, concise abstracts, tags, and linked brain regions.
