import re
from typing import Any, List, Literal, Optional, Union
from pydantic import BaseModel, Field, field_validator


class AffectedBrainAreaItem(BaseModel):
    areaId: str = Field(..., description="Unique slug for brain area e.g. frontal_lobe, hippocampus, amygdala")
    name: str = Field(..., description="Human-readable name of brain area e.g. Frontal Lobe")
    effectType: Literal["stimulates", "depresses", "damages", "modulates"] = Field(
        ..., description="Effect on brain area: stimulates, depresses, damages, or modulates"
    )

    @field_validator("effectType", mode="before")
    @classmethod
    def normalize_effect_type(cls, v: Any) -> str:
        if isinstance(v, str):
            val = v.lower().strip()
            if "stimulat" in val or "excit" in val or "activat" in val:
                return "stimulates"
            if "depress" in val or "inhibit" in val or "sedat" in val or "downregulat" in val:
                return "depresses"
            if "damag" in val or "toxic" in val or "neurotoxic" in val:
                return "damages"
            if "modulat" in val or "regulat" in val or "alter" in val:
                return "modulates"
        return "modulates"


class NeurotransmitterItem(BaseModel):
    name: str = Field(..., description="Neurotransmitter or biological messenger name e.g. GABA, Dopamine, Serotonin, Glutamate, Adenosine, BDNF, Acetylcholine")
    mechanism: str = Field(
        ...,
        description="1-2 accessible sentences explaining how this chemical messenger / receptor system is engaged in this phase in plain English",
    )
    description: Optional[str] = Field(default=None, description="Optional alias for mechanism")
    effect: Optional[str] = Field(default=None, description="Optional effect type")

    @field_validator("mechanism", mode="before")
    @classmethod
    def fallback_mechanism(cls, v: Any) -> str:
        if isinstance(v, str) and v.strip():
            return v.strip()
        return "Engaged in neural signaling and synaptic communication during this phase."


class PhaseDetail(BaseModel):
    brainImpact: str = Field(..., description="Detailed description of biological/neurological impact during this phase")
    affectedBrainAreas: List[AffectedBrainAreaItem] = Field(default_factory=list)
    neurotransmitters: List[NeurotransmitterItem] = Field(default_factory=list)


class SubstancePhases(BaseModel):
    acute: PhaseDetail = Field(..., description="Acute phase effects (immediate neurological impact)")
    chronic: PhaseDetail = Field(..., description="Chronic phase effects (long-term adaptations and neuroplastic changes)")
    withdrawal: PhaseDetail = Field(..., description="Withdrawal / cessation phase neurological effects")


class AtlasItem(BaseModel):
    id: str = Field(..., description="Unique lowercase slug ID e.g. mdma, meditation, fear, alzheimers")
    name: str = Field(..., description="Standard English name of substance, practice, emotion, or disease")
    category: Literal["Psychoactive Substances", "Lifestyle", "Emotions", "Diseases"] = Field(
        default="Psychoactive Substances",
        description="One of the 4 canonical categories: Psychoactive Substances, Lifestyle, Emotions, Diseases",
    )
    shortDescription: str = Field(..., description="1-2 sentence summary and primary neural/biological mechanism")
    phases: SubstancePhases

    @field_validator("id", mode="before")
    @classmethod
    def normalize_id(cls, v: Any) -> str:
        if isinstance(v, str):
            clean = re.sub(r"[^a-zA-Z0-9_-]", "_", v.lower().strip())
            return clean.strip("_")
        return str(v)

    @field_validator("category", mode="before")
    @classmethod
    def normalize_category(cls, v: Any) -> str:
        if isinstance(v, str):
            s = v.strip().lower()
            if any(k in s for k in ["lifestyle", "practice", "mind", "body", "habit", "exercise", "wellness", "physical", "sleep", "fasting"]):
                return "Lifestyle"
            if any(k in s for k in ["emotion", "affect", "feeling", "mood", "stress", "anxiety", "fear", "anger", "joy", "grief", "love", "overload"]):
                return "Emotions"
            if any(k in s for k in ["disease", "disorder", "syndrome", "pathology", "illness", "condition", "neurodegenerat", "alzheimer", "parkinson", "adhd", "depression"]):
                return "Diseases"
            if any(k in s for k in ["psychoactive", "substance", "drug", "stimulant", "sedative", "psychedelic", "nootropic", "chemical", "medication"]):
                return "Psychoactive Substances"
        return "Psychoactive Substances"


class ResearchPaperItem(BaseModel):
    id: str = Field(..., description="Slug ID for research paper e.g. author-year-topic")
    title: str = Field(..., description="Full paper title")
    authors: List[str] = Field(default_factory=list)
    year: int = Field(..., description="Publication year")
    journal: str = Field(default="", description="Journal name")
    volume: Optional[str] = Field(default=None, description="Volume and issue e.g. '31(3)'")
    pages: Optional[str] = Field(default=None, description="Page numbers e.g. '209–221'")
    doi: str = Field(default="", description="DOI link e.g. https://doi.org/...")
    abstract: str = Field(..., description="Summary abstract of the research study")
    tags: List[str] = Field(default_factory=list, description="Keywords/tags")
    relatedAtlasItems: List[str] = Field(default_factory=list, description="List of related atlas item IDs e.g. ['mdma']")
    relatedBrainAreas: List[str] = Field(default_factory=list, description="List of affected brain section names matching VALID_BRAIN_SECTIONS")

    @field_validator("year", mode="before")
    @classmethod
    def coerce_year(cls, v: Any) -> int:
        if isinstance(v, (int, float)):
            return int(v)
        if isinstance(v, str):
            # Extract first 4-digit year if present
            match = re.search(r"\b(19\d\d|20\d\d)\b", v)
            if match:
                return int(match.group(1))
            try:
                return int(v.strip())
            except ValueError:
                pass
        return 2024

    @field_validator("doi", mode="before")
    @classmethod
    def normalize_doi(cls, v: Any) -> str:
        if not v:
            return ""
        s = str(v).strip()
        if s.startswith("http://") or s.startswith("https://"):
            return s
        if s.startswith("10."):
            return f"https://doi.org/{s}"
        return s

    @field_validator("id", mode="before")
    @classmethod
    def normalize_paper_id(cls, v: Any) -> str:
        if isinstance(v, str):
            clean = re.sub(r"[^a-zA-Z0-9_-]", "-", v.lower().strip())
            return clean.strip("-")
        return str(v)


class SubstanceResearchResult(BaseModel):
    substance: AtlasItem
    researchPapers: List[ResearchPaperItem] = Field(default_factory=list)