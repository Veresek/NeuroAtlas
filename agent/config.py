import os
from pathlib import Path
from typing import Dict, List
from dotenv import load_dotenv

load_dotenv()

# OpenRouter / LLM Configuration
# Checks OPENROUTER_API_KEY first, then falls back to API_KEY
API_KEY = os.getenv("OPENROUTER_API_KEY") or os.getenv("API_KEY")
BASE_URL = os.getenv("BASE_URL") or os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
MODEL = os.getenv("MODEL") or os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-chat")

# OpenRouter attribution headers (helps with rate limits and ranking on OpenRouter)
OPENROUTER_HEADERS: Dict[str, str] = {
    "HTTP-Referer": os.getenv("OPENROUTER_HTTP_REFERER", "https://github.com/NeuroAtlas"),
    "X-Title": os.getenv("OPENROUTER_APP_TITLE", "NeuroAtlas Data Collector"),
}

# LLM Generation parameters
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.2"))
REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "90.0"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))

# Paths
BASE_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = BASE_DIR.parent

ATLAS_FILE = PROJECT_ROOT / "client" / "src" / "data" / "atlas.json"
RESEARCH_FILE = PROJECT_ROOT / "client" / "src" / "data" / "research.json"

# 4 Canonical NeuroAtlas categories
VALID_CATEGORIES: List[str] = [
    "Psychoactive Substances",
    "Lifestyle",
    "Emotions",
    "Diseases",
]

# Brain sections valid in the NeuroAtlas UI
VALID_BRAIN_SECTIONS: List[str] = [
    "Frontal Lobe",
    "Parietal Lobe",
    "Occipital Lobe",
    "Temporal Lobe",
    "Insular Cortex",
    "Hippocampus",
    "Nucleus Accumbens",
    "Amygdala",
    "Ventral Tegmental Area",
    "Limbic System",
    "Basal Ganglia",
    "Thalamus",
    "Hypothalamus",
    "Cerebellum",
    "Brainstem",
    "White Matter",
    "Ventricular System",
    "Other",
]
