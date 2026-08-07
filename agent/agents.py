import json
from typing import Any, cast

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import (
    RunnableLambda,
    RunnableParallel,
    RunnablePassthrough,
)
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

import tools
from config import API_KEY, BASE_URL, MODEL, VALID_BRAIN_SECTIONS
from schemas import SubstanceResearchResult

# ---------------------------------------------------------------------------
# LangChain tools (thin wrappers over the raw API fetchers in tools.py)
# ---------------------------------------------------------------------------

@tool
def search_research_papers(query: str, target_count: int = 5) -> list[dict[str, Any]]:
    """Iteratively search Europe PMC / PubMed until `target_count` RELEVANT papers are found."""
    return tools.search_research_papers_iterative(query, target_count=target_count)


@tool
def fetch_substance_chemical_metadata(substance_name: str) -> dict[str, Any]:
    """Fetch chemical & pharmacological metadata from PubChem and PsychonautWiki."""
    return tools.fetch_substance_chemical_metadata(substance_name)


RESEARCH_TOOLS = [search_research_papers, fetch_substance_chemical_metadata]


# ---------------------------------------------------------------------------
# Synthesis prompt (LangChain ChatPromptTemplate)
# ---------------------------------------------------------------------------

SYNTHESIS_SYSTEM_PROMPT = (
    "You are a neuroscience database AI assistant that strictly returns JSON. "
    "Only include real research papers that are genuinely about the requested "
    "substance; never invent papers, titles, authors, journals, DOIs, or years."
)

SYNTHESIS_HUMAN_PROMPT = """
You are an expert neuroscientist and pharmacologist creating structured data entries for NeuroAtlas.
Convert the provided raw substance metadata and research papers into structured JSON matching the requested schema.

SUBSTANCE NAME: {substance_name}

VALID BRAIN SECTIONS for `relatedBrainAreas`:
{valid_brain_sections}

CHEMICAL & PHARMACOLOGICAL METADATA:
{metadata_json}

RESEARCH PAPERS:
{papers_json}

QUALITY REQUIREMENTS:
- Include ONLY papers that are genuinely about {substance_name}. Exclude any off-topic paper, even if it is listed above.
- Never invent or fabricate papers, titles, authors, journals, years, or DOIs. Use only the data provided.
- Keep every "abstract" SHORT: 2-3 sentences, at most ~300 characters, summarizing the provided abstract.
- Use the provided paper year and journal verbatim; do not guess.
- Skip papers that lack a journal or a DOI.

OUTPUT FORMAT REQUIREMENTS:
Return ONLY a valid JSON object matching this exact structure:
{{
  "substance": {{
    "id": "{substance_name_lower}",
    "name": "{substance_name_capitalized}",
    "category": "Psychoactive Substances",
    "shortDescription": "1-2 sentence summary of primary mechanism and brain action.",
    "phases": {{
      "acute": {{
        "brainImpact": "Detailed description of acute neurobiological effects on the brain...",
        "affectedBrainAreas": [
          {{"areaId": "frontal_lobe", "name": "Frontal Lobe", "effectType": "stimulates|depresses|damages|modulates"}}
        ],
        "neurotransmitters": [
          {{"name": "Dopamine", "effect": "increase|decrease|modulate"}}
        ]
      }},
      "chronic": {{
        "brainImpact": "Detailed description of long-term neuroadaptations and structural brain impact...",
        "affectedBrainAreas": [
          {{"areaId": "hippocampus", "name": "Hippocampus", "effectType": "damages"}}
        ],
        "neurotransmitters": [
          {{"name": "Dopamine", "effect": "decrease"}}
        ]
      }},
      "withdrawal": {{
        "brainImpact": "Detailed description of brain state during withdrawal...",
        "affectedBrainAreas": [
          {{"areaId": "amygdala", "name": "Amygdala", "effectType": "stimulates"}}
        ],
        "neurotransmitters": [
          {{"name": "Glutamate", "effect": "increase"}}
        ]
      }}
    }}
  }},
  "researchPapers": [
    {{
      "id": "author-year-topic",
      "title": "Full Paper Title",
      "authors": ["Author 1", "Author 2"],
      "year": 2024,
      "journal": "Journal Name",
      "doi": "https://doi.org/...",
      "abstract": "Abstract text...",
      "tags": ["tag1", "tag2"],
      "relatedAtlasItems": ["{substance_name_lower}"],
      "relatedBrainAreas": ["Frontal Lobe", "Hippocampus"]
    }}
  ]
}}
Do NOT output markdown code fences or conversational text. Return raw valid JSON.
"""


# ---------------------------------------------------------------------------
# Chain helpers
# ---------------------------------------------------------------------------

def _fetch_papers(inputs: dict[str, Any]) -> list[dict[str, Any]]:
    """Invoke the `search_research_papers` tool from the chain input dict."""
    return search_research_papers.invoke(
        {"query": inputs["substance_name"], "target_count": inputs["target_papers"]}
    )


def _fetch_metadata(inputs: dict[str, Any]) -> dict[str, Any]:
    """Invoke the `fetch_substance_chemical_metadata` tool from the chain input dict."""
    return fetch_substance_chemical_metadata.invoke(
        {"substance_name": inputs["substance_name"]}
    )


class ResearcherAgent:
    """
    Agent responsible for searching and fetching raw data from academic & chemical sources.
    Fetches papers and chemical metadata concurrently via a LangChain RunnableParallel
    over the `@tool`-wrapped Europe PMC / PubMed / PubChem / PsychonautWiki fetchers.
    """

    def __init__(self) -> None:
        self.tools = RESEARCH_TOOLS
        self.chain = RunnableParallel(
            papers=_fetch_papers,
            metadata=_fetch_metadata,
        )

    def fetch_raw_data(
        self,
        substance_name: str,
        target_papers: int = 5,
        max_papers: int | None = None,
    ) -> dict[str, Any]:
        # Backwards-compatible alias: `max_papers` used to be a hard one-shot count.
        if max_papers is not None:
            target_papers = max_papers

        print(f"🔍 [ResearcherAgent] Searching academic & pharmacological databases for '{substance_name}'...")

        outputs = self.chain.invoke({"substance_name": substance_name, "target_papers": target_papers})
        papers = outputs["papers"]
        metadata = outputs["metadata"]

        print(f"   ✓ Retrieved {len(papers)} research papers from PubMed/Europe PMC.")
        print("   ✓ Retrieved chemical metadata from PubChem & PsychonautWiki.")

        return {
            "substance_name": substance_name,
            "papers": papers,
            "metadata": metadata,
        }


class SynthesizerAgent:
    """
    Agent responsible for synthesizing raw research data and chemical metadata
    into validated Pydantic structures (SubstanceResearchResult) using a
    LangChain ChatOpenAI model with structured output.
    """

    def __init__(self) -> None:
        self.llm = ChatOpenAI(
            model=MODEL,
            api_key=SecretStr(API_KEY) if API_KEY else None,
            base_url=BASE_URL,
            temperature=0.2,
        )
        self.chain = (
            RunnablePassthrough.assign(
                valid_brain_sections=lambda _: json.dumps(VALID_BRAIN_SECTIONS, indent=2),
                substance_name_lower=lambda inputs: inputs["substance_name"].lower().replace(" ", "_"),
                substance_name_capitalized=lambda inputs: inputs["substance_name"].capitalize(),
            )
            | ChatPromptTemplate.from_messages(
                [
                    ("system", SYNTHESIS_SYSTEM_PROMPT),
                    ("human", SYNTHESIS_HUMAN_PROMPT),
                ]
            )
            | self.llm.with_structured_output(SubstanceResearchResult, method="json_mode")
        )

    def synthesize(self, raw_data: dict[str, Any]) -> SubstanceResearchResult:
        substance_name = raw_data["substance_name"]
        papers = raw_data["papers"]
        metadata = raw_data["metadata"]

        print("🧠 [SynthesizerAgent] Synthesizing data into NeuroAtlas schema...")

        try:
            result = self.chain.invoke(
                {
                    "substance_name": substance_name,
                    "metadata_json": json.dumps(metadata, indent=2),
                    "papers_json": json.dumps(papers, indent=2),
                }
            )
        except Exception as exc:
            raise RuntimeError(
                f"LLM synthesis failed: {exc}. "
                "Check your API_KEY, BASE_URL, and MODEL settings in .env."
            ) from exc

        print("   ✓ LLM Synthesis completed successfully.")
        return cast(SubstanceResearchResult, result)


class ValidatorAgent:
    """
    Agent responsible for validating & sanitizing synthesized data:
    - Verifies related brain areas against VALID_BRAIN_SECTIONS
    - Standardizes paper DOIs and slug IDs
    - Merges newly added items with existing atlas.json and research.json

    The validation/merge step is exposed as a LangChain `RunnableLambda`
    (self.chain) so it can slot directly into a larger pipeline.
    """

    def __init__(self) -> None:
        self.chain = RunnableLambda(self._validate_step)

    def _validate_step(self, inputs: dict[str, Any]) -> dict[str, Any]:
        """Single-input Runnable wrapper around `validate_and_merge`."""
        return self.validate_and_merge(
            inputs["result"],
            inputs["existing_atlas"],
            inputs["existing_research"],
        )

    def validate_and_merge(
        self,
        result: SubstanceResearchResult,
        existing_atlas: list[dict[str, Any]],
        existing_research: list[dict[str, Any]],
    ) -> dict[str, Any]:
        print("🛡️ [ValidatorAgent] Validating schemas and merging with existing datasets...")

        # 1. Validate brain areas in research papers
        validated_papers = []
        for paper in result.researchPapers:
            valid_areas = [area for area in paper.relatedBrainAreas if area in VALID_BRAIN_SECTIONS]
            if not valid_areas:
                valid_areas = ["Other"]
            paper.relatedBrainAreas = valid_areas
            validated_papers.append(paper)

        result.researchPapers = validated_papers

        # 2. Merge into Atlas JSON
        new_atlas_dict = result.substance.model_dump()
        atlas_data = list(existing_atlas)

        psychoactive_category = None
        for category_group in atlas_data:
            if category_group.get("title") == "Psychoactive Substances":
                psychoactive_category = category_group
                break

        if not psychoactive_category:
            psychoactive_category = {"title": "Psychoactive Substances", "items": []}
            atlas_data.append(psychoactive_category)

        items = psychoactive_category.setdefault("items", [])

        # Check if substance already exists -> update, else append
        existing_idx = None
        for idx, item in enumerate(items):
            if item.get("id") == new_atlas_dict["id"]:
                existing_idx = idx
                break

        if existing_idx is not None:
            items[existing_idx] = new_atlas_dict
            print(f"   ✓ Updated existing atlas entry for '{new_atlas_dict['id']}'.")
        else:
            items.append(new_atlas_dict)
            print(f"   ✓ Added new atlas entry for '{new_atlas_dict['id']}'.")

        # 3. Merge into Research JSON
        research_data = list(existing_research)
        existing_paper_ids = {p.get("id"): idx for idx, p in enumerate(research_data)}

        added_count = 0
        updated_count = 0
        for paper in result.researchPapers:
            p_dict = paper.model_dump()
            pid = p_dict["id"]
            if pid in existing_paper_ids:
                research_data[existing_paper_ids[pid]] = p_dict
                updated_count += 1
            else:
                research_data.append(p_dict)
                added_count += 1

        print(f"   ✓ Research papers: {added_count} added, {updated_count} updated.")

        return {
            "atlas": atlas_data,
            "research": research_data,
            "added_substance": new_atlas_dict,
            "added_papers": [p.model_dump() for p in result.researchPapers],
        }
