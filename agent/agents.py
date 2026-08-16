"""
Advanced Multi-Agent Reasoning Workflow for NeuroAtlas powered by OpenRouter & LangChain.

Architecture:
1. TopicClassifier & QueryPlannerAgent: Identifies topic domain (Psychoactive Substances, Lifestyle, Emotions, Diseases)
   and formulates category-tailored scientific search queries.
2. ResearcherAgent: Gathers pharmacological metadata (for substances) & executes multi-query academic search across Europe PMC & PubMed.
3. PaperEvaluatorAgent: Ranks & filters candidate papers to prioritize core mechanistic studies and neuroimaging over tangential reports.
4. DeepReasoningSynthesizerAgent: Uses Chain-of-Thought reasoning to craft scientifically accurate, accessible, and balanced NeuroAtlas records with nuanced neurotransmitter mechanisms across the 4 canonical categories.
5. ValidatorAgent: Sanitizes brain sections, DOIs, category tags, and integrates records into atlas.json and research.json.
6. NeuroAtlasPipeline: Orchestrates the end-to-end runnable multi-agent workflow.
"""

import json
import re
from typing import Any, Dict, List, Literal, Optional, Tuple, cast

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

import tools
from config import (
    API_KEY,
    BASE_URL,
    MAX_RETRIES,
    MODEL,
    OPENROUTER_HEADERS,
    REQUEST_TIMEOUT,
    TEMPERATURE,
    VALID_BRAIN_SECTIONS,
    VALID_CATEGORIES,
)
from schemas import AtlasItem, ResearchPaperItem, SubstanceResearchResult


# ---------------------------------------------------------------------------
# OpenRouter LLM Factory
# ---------------------------------------------------------------------------

def get_openrouter_llm(
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
) -> ChatOpenAI:
    """Initializes a LangChain ChatOpenAI client configured for OpenRouter."""
    effective_api_key = api_key or API_KEY
    if not effective_api_key:
        raise ValueError(
            "Missing OpenRouter API Key. Please set OPENROUTER_API_KEY or API_KEY in your agent/.env file."
        )

    return ChatOpenAI(
        model=model or MODEL,
        api_key=SecretStr(effective_api_key),
        base_url=base_url or BASE_URL,
        temperature=temperature if temperature is not None else TEMPERATURE,
        timeout=REQUEST_TIMEOUT,
        max_retries=MAX_RETRIES,
        default_headers=OPENROUTER_HEADERS,
    )


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def _extract_json_from_text(text: str) -> str:
    """Extracts raw JSON from markdown code blocks or surrounding text."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    # Check for array
    start_arr = text.find("[")
    end_arr = text.rfind("]")
    if start_arr != -1 and end_arr != -1 and end_arr > start_arr:
        return text[start_arr : end_arr + 1]
    return text


# ---------------------------------------------------------------------------
# Agent 1: Query Planner & Domain Classifier Agent
# ---------------------------------------------------------------------------

CLASSIFIER_AND_PLANNER_PROMPT = """You are an expert scientific search strategist and neuroscientist for NeuroAtlas.
Analyze the given topic: "{topic_name}".

STEP 1: Classify this topic into exactly ONE of the 4 canonical NeuroAtlas categories:
- "Psychoactive Substances" (drugs, nootropics, medications, stimulants, sedatives, psychedelics, e.g. Caffeine, Alcohol, Psilocybin, MDMA, Nicotine)
- "Lifestyle" (habits, physical states, mind-body interventions, behaviors, e.g. Meditation, Aerobic Exercise, Sleep Deprivation, Cold Exposure, Intermittent Fasting)
- "Emotions" (affective states, psychological processes, e.g. Fear, Anxiety, Joy, Anger, Grief, Chronic Stress, Cognitive Overload, Flow State)
- "Diseases" (neurological disorders, psychiatric conditions, neurodegenerative pathologies, e.g. Alzheimer's Disease, Parkinson's Disease, Major Depressive Disorder, ADHD, Schizophrenia)

STEP 2: Generate 3 to 4 targeted academic search queries for PubMed/Europe PMC tailored to this category:
- For Psychoactive Substances: focus on receptor pharmacology, functional connectivity / fMRI, and neuroadaptation.
- For Lifestyle: focus on neural networks (e.g. DMN, executive control), neuroplasticity, BDNF, and autonomic / stress resilience.
- For Emotions: focus on limbic circuitry (amygdala, insula, mPFC), affective neurochemistry (dopamine, serotonin, cortisol, oxytocin), and neural connectivity.
- For Diseases: focus on pathophysiology, affected brain regions, structural MRI/PET biomarkers, and neurotransmitter dysregulation.

Return ONLY a JSON object with this exact structure:
{{
  "category": "Psychoactive Substances | Lifestyle | Emotions | Diseases",
  "is_chemical_substance": true | false,
  "queries": [
    "query 1",
    "query 2",
    "query 3"
  ]
}}
"""


class QueryPlannerAgent:
    """Classifies topic category and generates targeted scientific queries."""

    def __init__(self, llm: Optional[ChatOpenAI] = None) -> None:
        self.llm = llm or get_openrouter_llm(temperature=0.1)

    def plan(self, topic_name: str) -> Dict[str, Any]:
        print(f"🎯 [QueryPlannerAgent] Classifying topic and formulating search strategy for '{topic_name}'...")
        prompt = CLASSIFIER_AND_PLANNER_PROMPT.format(topic_name=topic_name)
        try:
            response = self.llm.invoke(prompt)
            raw_text = response.content if hasattr(response, "content") else str(response)
            clean_json = _extract_json_from_text(raw_text)
            parsed = json.loads(clean_json)

            category = parsed.get("category", "Psychoactive Substances")
            if category not in VALID_CATEGORIES:
                # normalize
                s = category.lower()
                if "life" in s or "practice" in s or "habit" in s:
                    category = "Lifestyle"
                elif "emotion" in s or "affect" in s or "stress" in s:
                    category = "Emotions"
                elif "disease" in s or "disorder" in s or "path" in s:
                    category = "Diseases"
                else:
                    category = "Psychoactive Substances"

            queries = parsed.get("queries", [])
            if not isinstance(queries, list) or len(queries) == 0:
                queries = [
                    f"{topic_name} neural mechanism fMRI brain",
                    f"{topic_name} neurotransmitter neurobiology",
                    f"{topic_name} neuroplasticity functional connectivity",
                ]

            is_chemical = parsed.get("is_chemical_substance", category == "Psychoactive Substances")

            print(f"   ✓ Domain Category: '{category}' (Chemical Search: {is_chemical})")
            print(f"   ✓ Planned Queries: {', '.join(f'\"{q}\"' for q in queries[:3])}")

            return {
                "category": category,
                "is_chemical_substance": is_chemical,
                "queries": queries,
            }
        except Exception as e:
            print(f"   ℹ️ Query planner note ({e}); using heuristic classification.")

        # Heuristic fallback
        s = topic_name.lower()
        if any(k in s for k in ["meditation", "exercise", "sleep", "cold", "fasting", "yoga", "breathwork"]):
            cat = "Lifestyle"
            is_chem = False
        elif any(k in s for k in ["fear", "anxiety", "joy", "anger", "stress", "grief", "love", "overload"]):
            cat = "Emotions"
            is_chem = False
        elif any(k in s for k in ["alzheimer", "parkinson", "adhd", "depression", "epilepsy", "schizophrenia", "dementia", "disease", "syndrome"]):
            cat = "Diseases"
            is_chem = False
        else:
            cat = "Psychoactive Substances"
            is_chem = True

        return {
            "category": cat,
            "is_chemical_substance": is_chem,
            "queries": [
                f"{topic_name} brain neural mechanism fMRI",
                f"{topic_name} neurochemistry neurotransmitters",
                f"{topic_name} neuroplasticity connectivity",
            ],
        }


# ---------------------------------------------------------------------------
# Agent 2: Targeted Researcher Agent
# ---------------------------------------------------------------------------

class ResearcherAgent:
    """Gathers data across Europe PMC, PubMed, and chemical databases (when applicable)."""

    def __init__(self, planner: Optional[QueryPlannerAgent] = None) -> None:
        self.planner = planner or QueryPlannerAgent()

    def fetch_raw_data(
        self,
        topic_name: str,
        target_papers: int = 6,
    ) -> Dict[str, Any]:
        # 1. Plan and classify domain
        plan = self.planner.plan(topic_name)
        category = plan["category"]
        is_chemical = plan["is_chemical_substance"]
        targeted_queries = plan["queries"]

        # 2. Chemical metadata (only if chemical substance)
        metadata = {}
        if is_chemical:
            print(f"🔍 [ResearcherAgent] Querying chemical databases for '{topic_name}'...")
            metadata = tools.fetch_substance_chemical_metadata(topic_name)
        else:
            print(f"🔍 [ResearcherAgent] Non-chemical domain ('{category}'); skipping chemical API lookup...")

        # 3. Search academic literature across planned queries
        print(f"   · Searching PubMed & Europe PMC across planned queries (target: {target_papers} papers)...")
        collected_papers: List[Dict[str, Any]] = []
        seen_keys = set()

        for q in targeted_queries:
            if len(collected_papers) >= target_papers * 2:
                break
            papers = tools.search_research_papers_iterative(
                query=q,
                target_count=max(2, target_papers // 2),
                alternate_names=[topic_name],
            )
            for p in papers:
                key = p.get("doi") or p.get("title", "").strip().lower()[:60]
                if key and key not in seen_keys:
                    seen_keys.add(key)
                    collected_papers.append(p)

        # Fallback broad search if needed
        if len(collected_papers) < target_papers:
            fallback_papers = tools.search_research_papers_iterative(
                query=topic_name,
                target_count=target_papers,
            )
            for p in fallback_papers:
                key = p.get("doi") or p.get("title", "").strip().lower()[:60]
                if key and key not in seen_keys:
                    seen_keys.add(key)
                    collected_papers.append(p)

        print(f"   ✓ Gathered {len(collected_papers)} candidate peer-reviewed papers.")
        return {
            "topic_name": topic_name,
            "category": category,
            "is_chemical": is_chemical,
            "target_papers": target_papers,
            "papers": collected_papers,
            "metadata": metadata,
        }


# ---------------------------------------------------------------------------
# Agent 3: Paper Evaluator Agent
# ---------------------------------------------------------------------------

PAPER_EVALUATOR_PROMPT = """You are a scientific literature editor for NeuroAtlas.
Review the following candidate research papers for the topic: "{topic_name}" (Category: {category}).

Select the TOP {target_papers} papers that BEST explain:
- Direct neuroscience, neuroimaging, pharmacological/neural mechanisms, brain connectivity, or cognitive/behavioral impact.
- Avoid peripheral, unrelated topics (e.g. plant chemistry, packaging, unrelated skin penetration, off-topic case reports).

CANDIDATE PAPERS:
{papers_json}

Return ONLY a JSON array containing the indices (0-indexed) of the top {target_papers} best papers, sorted from most relevant to least. Example:
[0, 2, 3, 5]
"""


class PaperEvaluatorAgent:
    """Filters candidate papers to keep only core neuroscience and mechanistic research."""

    def __init__(self, llm: Optional[ChatOpenAI] = None) -> None:
        self.llm = llm or get_openrouter_llm(temperature=0.1)

    def select_best_papers(
        self,
        topic_name: str,
        category: str,
        papers: List[Dict[str, Any]],
        target_count: int = 5,
    ) -> List[Dict[str, Any]]:
        if len(papers) <= target_count:
            return papers

        print(f"⚖️ [PaperEvaluatorAgent] Evaluating and selecting top {target_count} neuroscience papers...")
        prompt = PAPER_EVALUATOR_PROMPT.format(
            topic_name=topic_name,
            category=category,
            target_papers=target_count,
            papers_json=json.dumps(
                [{"index": i, "title": p.get("title"), "journal": p.get("journal"), "abstract": p.get("abstract")[:180]} for i, p in enumerate(papers)],
                indent=2,
            ),
        )

        try:
            response = self.llm.invoke(prompt)
            raw_text = response.content if hasattr(response, "content") else str(response)
            clean_json = _extract_json_from_text(raw_text)
            indices = json.loads(clean_json)
            if isinstance(indices, list):
                selected = [papers[i] for i in indices if isinstance(i, int) and 0 <= i < len(papers)]
                if len(selected) >= min(2, target_count):
                    print(f"   ✓ Selected top {len(selected)} most relevant neuroscience studies.")
                    return selected[:target_count]
        except Exception as e:
            print(f"   ℹ️ Paper evaluation note ({e}); using heuristic quality ranking.")

        return papers[:target_count]


# ---------------------------------------------------------------------------
# Agent 4: Deep Reasoning Synthesizer Agent
# ---------------------------------------------------------------------------

SYNTHESIS_SYSTEM_PROMPT = """You are an expert science communicator and neuroscientist for NeuroAtlas.
Your mission is to make neuroscience, pharmacology, behavioral biology, and brain health accessible, intuitive, and fascinating for general audiences while maintaining rigorous scientific accuracy.

CANONICAL CATEGORIES (MUST BE EXACTLY ONE OF THESE 4):
1. "Psychoactive Substances" (drugs, medications, supplements, nootropics)
2. "Lifestyle" (practices, exercise, sleep, meditation, fasting, habits)
3. "Emotions" (affective states, fear, joy, chronic stress, cognitive overload, anger)
4. "Diseases" (neurological, psychiatric, neurodegenerative disorders like Alzheimer's, ADHD, Depression)

TEMPORAL PHASES INTERPRETATION GUIDELINE:
- For Psychoactive Substances:
  * acute: Immediate intoxication / pharmacological effect.
  * chronic: Long-term adaptations, receptor up/downregulation, tolerance.
  * withdrawal: Cessation rebound, neurotransmitter imbalance after stopping.
- For Lifestyle practices / habits (e.g. Meditation, Exercise):
  * acute: Immediate state during / directly after the practice (e.g. mental calm, transient endorphin release).
  * chronic: Long-term neuroplasticity, baseline brain network adaptations, structural changes.
  * withdrawal: Cessation of practice, gradual fading of neuroplastic benefits, return toward pre-practice baseline.
- For Emotions / mental states (e.g. Fear, Cognitive Overload, Joy):
  * acute: Immediate onset and physiological peak of the emotion/state.
  * chronic: Sustained / prolonged exposure (e.g. chronic stress, prolonged overload burnout).
  * withdrawal: Post-state resolution, recovery phase, emotional cooldown and nervous system rebalancing.
- For Diseases / conditions (e.g. Alzheimer's, Depression, ADHD):
  * acute: Onset / acute symptomatic episode / flare-up.
  * chronic: Disease progression, progressive circuit alteration, long-term neuropathology.
  * withdrawal: Remission phase, treatment-induced management, or relapse upon stopping management.

COMMUNICATION & NEUROTRANSMITTER PRINCIPLES:
1. ACCESSIBLE & CLEAR LANGUAGE:
   - Write in plain, engaging English. Connect biological changes to how humans feel (focus, calm, memory, fatigue, mood).
2. NUANCED NEUROTRANSMITTER MECHANISMS:
   - Explain the EXACT biological role / receptor action in 1-2 accessible sentences for the `mechanism` field.
   - Do NOT make naive claims like "Increases GABA" for meditation; explain it as enhanced GABAergic tone through mindful focus.
3. OBJECTIVE & NEUTRAL TONE:
   - Maintain a balanced, non-judgmental stance.
4. QUALITY RULES:
   - ONLY include real peer-reviewed scientific research papers with authors and journal or DOI.
   - Use ONLY valid brain sections from the provided list for `relatedBrainAreas`:
{valid_brain_sections}
"""

SYNTHESIS_HUMAN_PROMPT = """Create an accessible, educational NeuroAtlas entry and research paper catalog for: {topic_name}

TOPIC NAME: {topic_name}
ASSIGNED CATEGORY: {category}

METADATA:
{metadata_json}

EVALUATED ACADEMIC RESEARCH PAPERS ({paper_count} papers):
{papers_json}

SCHEMA SPECIFICATION:
Return a JSON object conforming to this exact structure:
{{
  "substance": {{
    "id": "{topic_slug}",
    "name": "{topic_name_display}",
    "category": "{category}",
    "shortDescription": "Clear, accessible 1-2 sentence overview and its primary effect on the brain.",
    "phases": {{
      "acute": {{
        "brainImpact": "Accessible 2-3 sentence explanation of immediate effects on brain activity...",
        "affectedBrainAreas": [
          {{"areaId": "frontal_lobe", "name": "Frontal Lobe", "effectType": "stimulates"}},
          {{"areaId": "amygdala", "name": "Amygdala", "effectType": "modulates"}}
        ],
        "neurotransmitters": [
          {{
            "name": "Dopamine",
            "mechanism": "Clear 1-2 sentence explanation of how this messenger system is engaged in this phase."
          }}
        ]
      }},
      "chronic": {{
        "brainImpact": "Accessible explanation of long-term adaptations, neuroplasticity, or structural changes...",
        "affectedBrainAreas": [
          {{"areaId": "hippocampus", "name": "Hippocampus", "effectType": "modulates"}}
        ],
        "neurotransmitters": [
          {{
            "name": "BDNF",
            "mechanism": "Clear explanation of chronic adaptations or growth factor changes."
          }}
        ]
      }},
      "withdrawal": {{
        "brainImpact": "Accessible explanation of cessation, recovery, resolution, or unmanaged phase...",
        "affectedBrainAreas": [
          {{"areaId": "amygdala", "name": "Amygdala", "effectType": "stimulates"}}
        ],
        "neurotransmitters": [
          {{
            "name": "Cortisol",
            "mechanism": "Clear explanation of how regulatory signals rebalance."
          }}
        ]
      }}
    }}
  }},
  "researchPapers": [
    {{
      "id": "author-year-topic",
      "title": "Exact Title of Paper",
      "authors": ["Author 1", "Author 2"],
      "year": 2024,
      "journal": "Journal Name",
      "volume": null,
      "pages": null,
      "doi": "https://doi.org/10.xxxx/...",
      "abstract": "Concise 2-3 sentence summary in accessible language.",
      "tags": ["neuroplasticity", "connectivity"],
      "relatedAtlasItems": ["{topic_slug}"],
      "relatedBrainAreas": ["Frontal Lobe", "Amygdala"]
    }}
  ]
}}

Generate the complete, valid JSON output now:"""


class SynthesizerAgent:
    """Deep Reasoning Synthesizer powered by OpenRouter LLM."""

    def __init__(self, model_name: Optional[str] = None) -> None:
        self.llm = get_openrouter_llm(model=model_name)
        self.prompt_template = ChatPromptTemplate.from_messages(
            [
                ("system", SYNTHESIS_SYSTEM_PROMPT),
                ("human", SYNTHESIS_HUMAN_PROMPT),
            ]
        )

    def synthesize(self, raw_data: Dict[str, Any]) -> SubstanceResearchResult:
        topic_name = raw_data["topic_name"]
        category = raw_data["category"]
        papers = raw_data["papers"]
        metadata = raw_data["metadata"]

        topic_slug = re.sub(r"[^a-zA-Z0-9_-]", "_", topic_name.lower()).strip("_")
        topic_display = topic_name.strip().title()

        print(f"🧠 [SynthesizerAgent] Synthesizing NeuroAtlas entry ({category}) with OpenRouter ({self.llm.model_name})...")

        formatted_inputs = {
            "topic_name": topic_name,
            "category": category,
            "topic_slug": topic_slug,
            "topic_name_display": topic_display,
            "paper_count": len(papers),
            "valid_brain_sections": json.dumps(VALID_BRAIN_SECTIONS, indent=2),
            "metadata_json": json.dumps(metadata, indent=2, ensure_ascii=False),
            "papers_json": json.dumps(papers, indent=2, ensure_ascii=False),
        }

        # Strategy 1: structured output via json_mode
        try:
            structured_chain = self.prompt_template | self.llm.with_structured_output(
                SubstanceResearchResult, method="json_mode"
            )
            result = structured_chain.invoke(formatted_inputs)
            if isinstance(result, SubstanceResearchResult):
                print("   ✓ LLM structured output parsed successfully (json_mode).")
                return result
            if isinstance(result, dict):
                return SubstanceResearchResult.model_validate(result)
        except Exception as e:
            print(f"   ℹ️ json_mode structured call note ({e}); using direct JSON parser...")

        # Strategy 2: Direct prompt completion + robust JSON & Pydantic parsing
        try:
            chain = self.prompt_template | self.llm
            response = chain.invoke(formatted_inputs)
            raw_text = response.content if hasattr(response, "content") else str(response)
            clean_json_str = _extract_json_from_text(raw_text)
            parsed_data = json.loads(clean_json_str)
            validated_result = SubstanceResearchResult.model_validate(parsed_data)
            print("   ✓ LLM synthesis completed and validated.")
            return validated_result
        except Exception as exc:
            raise RuntimeError(
                f"LLM synthesis failed to produce a valid schema: {exc}\n"
                f"Please check your OpenRouter API key, model selection, or network connection."
            ) from exc


# ---------------------------------------------------------------------------
# Agent 5: Validator Agent
# ---------------------------------------------------------------------------

class ValidatorAgent:
    """Performs schema validation, category grouping, and integrates into atlas & research JSON."""

    def __init__(self) -> None:
        self.chain = RunnableLambda(self._runnable_entry)

    def _runnable_entry(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        return self.validate_and_merge(
            inputs["result"],
            inputs["existing_atlas"],
            inputs["existing_research"],
        )

    def _is_valid_research_paper(self, paper: Any, topic_name: str) -> bool:
        title = (paper.title or "").strip()
        abstract = (paper.abstract or "").strip()
        journal = (paper.journal or "").strip()
        doi = (paper.doi or "").strip()
        authors = paper.authors or []
        year = int(paper.year or 0)
        paper_id = (paper.id or "").strip().lower()

        if len(title) < 15 or len(abstract) < 40:
            return False

        # Reject bare titles
        title_lower = title.lower()
        sub_lower = topic_name.lower().strip()
        if title_lower == sub_lower or title_lower in [
            "alcohol", "caffeine", "mdma", "nicotine", "cannabis", "cocaine",
            "psilocybin", "ketamine", "lsd", "meditation", "exercise", "fear",
            "anxiety", "depression", "alzheimer's disease", "adhd",
        ]:
            return False

        if len(authors) == 0:
            return False

        if not journal and not doi:
            return False

        if year < 1950 or year > 2035:
            return False

        if paper_id.startswith("unknown-") and not doi:
            return False

        return True

    def validate_and_merge(
        self,
        result: SubstanceResearchResult,
        existing_atlas: List[Dict[str, Any]],
        existing_research: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        print("🛡️ [ValidatorAgent] Validating data integrity and merging datasets across categories...")

        # 1. Sanitize & validate related brain areas in research papers
        valid_sections_set = set(VALID_BRAIN_SECTIONS)
        validated_papers = []

        for paper in result.researchPapers:
            if not self._is_valid_research_paper(paper, result.substance.name):
                print(f"   ⚠️ Dropped invalid/stub paper record: '{paper.title}'")
                continue

            valid_areas = []
            for area in paper.relatedBrainAreas:
                if area in valid_sections_set:
                    valid_areas.append(area)
                else:
                    matched = next((s for s in VALID_BRAIN_SECTIONS if s.lower() == area.lower()), None)
                    if matched:
                        valid_areas.append(matched)

            if not valid_areas:
                valid_areas = ["Other"]
            paper.relatedBrainAreas = list(dict.fromkeys(valid_areas))

            if result.substance.id not in paper.relatedAtlasItems:
                paper.relatedAtlasItems.append(result.substance.id)

            validated_papers.append(paper)

        result.researchPapers = validated_papers

        # 2. Sanitize affected brain areas in phases and enforce canonical category
        new_atlas_dict = result.substance.model_dump()
        for phase_name in ["acute", "chronic", "withdrawal"]:
            phase = new_atlas_dict.get("phases", {}).get(phase_name, {})
            for area in phase.get("affectedBrainAreas", []):
                curr_name = area.get("name", "").strip()
                matched = next((s for s in VALID_BRAIN_SECTIONS if s.lower() == curr_name.lower()), None)
                if matched:
                    area["name"] = matched
                elif "amygd" in curr_name.lower():
                    area["name"] = "Amygdala"
                elif "front" in curr_name.lower():
                    area["name"] = "Frontal Lobe"
                elif "hippo" in curr_name.lower():
                    area["name"] = "Hippocampus"

        category_title = new_atlas_dict.get("category", "Psychoactive Substances")
        if category_title not in VALID_CATEGORIES:
            category_title = "Psychoactive Substances"
            new_atlas_dict["category"] = category_title

        atlas_data = list(existing_atlas)

        # Remove item from any other category group first to avoid duplicates
        for section in atlas_data:
            section["items"] = [i for i in section.get("items", []) if i.get("id") != new_atlas_dict["id"]]

        # Find or create target category group
        category_group = next(
            (c for c in atlas_data if c.get("title") == category_title),
            None,
        )

        if not category_group:
            category_group = {"title": category_title, "items": []}
            atlas_data.append(category_group)

        category_group.setdefault("items", []).append(new_atlas_dict)
        print(f"   ✓ Saved entry '{new_atlas_dict['id']}' into category '{category_title}'.")

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

        print(f"   ✓ Research papers merged: {added_count} added, {updated_count} updated.")

        return {
            "atlas": atlas_data,
            "research": research_data,
            "added_substance": new_atlas_dict,
            "added_papers": [p.model_dump() for p in result.researchPapers],
        }


# ---------------------------------------------------------------------------
# NeuroAtlas End-to-End Pipeline
# ---------------------------------------------------------------------------

class NeuroAtlasPipeline:
    """
    End-to-end multi-agent workflow:
    QueryPlanner (with domain classification) -> Researcher -> PaperEvaluator -> DeepReasoningSynthesizer -> Validator
    """

    def __init__(self, model_name: Optional[str] = None) -> None:
        llm = get_openrouter_llm(model=model_name)
        self.planner = QueryPlannerAgent(llm=llm)
        self.researcher = ResearcherAgent(planner=self.planner)
        self.evaluator = PaperEvaluatorAgent(llm=llm)
        self.synthesizer = SynthesizerAgent(model_name=model_name)
        self.validator = ValidatorAgent()

    def run(
        self,
        substance_name: str,
        target_papers: int = 5,
        existing_atlas: Optional[List[Dict[str, Any]]] = None,
        existing_research: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        # 1. Research phase (Category planning + multi-query literature search)
        raw_data = self.researcher.fetch_raw_data(
            topic_name=substance_name,
            target_papers=target_papers,
        )

        # 2. Paper Evaluation phase
        evaluated_papers = self.evaluator.select_best_papers(
            topic_name=substance_name,
            category=raw_data["category"],
            papers=raw_data["papers"],
            target_count=target_papers,
        )
        raw_data["papers"] = evaluated_papers

        # 3. Deep Reasoning Synthesis phase
        synthesized_result = self.synthesizer.synthesize(raw_data)

        # 4. Validation & Merge phase
        merged_output = self.validator.validate_and_merge(
            result=synthesized_result,
            existing_atlas=existing_atlas or [],
            existing_research=existing_research or [],
        )

        return merged_output
