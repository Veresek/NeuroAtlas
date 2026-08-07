import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("API_KEY")
BASE_URL = os.getenv("BASE_URL", "https://api.deepseek.com")
MODEL = os.getenv("MODEL", "DeepSeek-V4-Flash-0731")

BASE_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = BASE_DIR.parent

ATLAS_FILE = PROJECT_ROOT / "client" / "src" / "data" / "atlas.json"
RESEARCH_FILE = PROJECT_ROOT / "client" / "src" / "data" / "research.json"

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
