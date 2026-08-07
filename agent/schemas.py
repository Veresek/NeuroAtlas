from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class AffectedBrainAreaItem(BaseModel):
    areaId: str = Field(..., description="Unique slug for brain area e.g. frontal_lobe, hippocampus, amygdala")
    name: str = Field(..., description="Human-readable name of brain area e.g. Frontal Lobe")
    effectType: Literal["stimulates", "depresses", "damages", "modulates"] = Field(
        ..., description="Effect on brain area"
    )


class NeurotransmitterItem(BaseModel):
    name: str = Field(..., description="Neurotransmitter name e.g. GABA, Dopamine, Serotonin, Glutamate")
    effect: Literal["increase", "decrease", "modulate"] = Field(..., description="Effect on neurotransmitter levels/signaling")


class PhaseDetail(BaseModel):
    brainImpact: str = Field(..., description="Detailed description of biological/neurological impact during this phase")
    affectedBrainAreas: List[AffectedBrainAreaItem] = Field(default_factory=list)
    neurotransmitters: List[NeurotransmitterItem] = Field(default_factory=list)


class SubstancePhases(BaseModel):
    acute: PhaseDetail
    chronic: PhaseDetail
    withdrawal: PhaseDetail


class AtlasItem(BaseModel):
    id: str = Field(..., description="Unique lowercase ID e.g. mdma, caffeine, psilocybin, alcohol")
    name: str = Field(..., description="Standard English name of substance")
    category: str = Field(default="Psychoactive Substances", description="Category in NeuroAtlas")
    shortDescription: str = Field(..., description="1-2 sentence summary of substance and primary mechanism")
    phases: SubstancePhases


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


class SubstanceResearchResult(BaseModel):
    substance: AtlasItem
    researchPapers: List[ResearchPaperItem]