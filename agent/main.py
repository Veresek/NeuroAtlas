import argparse
import json
import sys

# Ensure UTF-8 output encoding for consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from pathlib import Path
from typing import Any, Dict, List

from config import API_KEY, ATLAS_FILE, BASE_URL, MODEL, RESEARCH_FILE
from agents import NeuroAtlasPipeline, ResearcherAgent, SynthesizerAgent, ValidatorAgent


def check_api_key() -> None:
    if not API_KEY:
        print("\n" + "=" * 60)
        print("❌ [ERROR] No OpenRouter API Key detected.")
        print("=" * 60)
        print("To configure your OpenRouter API key:")
        print("1. Get a key at https://openrouter.ai/settings/keys")
        print("2. Create or edit 'agent/.env' and add:")
        print("     OPENROUTER_API_KEY=sk-or-v1-your-key-here")
        print("     MODEL=deepseek/deepseek-chat   # (or openai/gpt-4o-mini, etc.)")
        print("=" * 60 + "\n")
        sys.exit(1)


def load_json_file(file_path: Path) -> List[Dict[str, Any]]:
    if not file_path.exists():
        return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"⚠️ Warning: Could not load JSON file '{file_path}': {e}")
        return []


def save_json_file(file_path: Path, data: Any) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved updated dataset to '{file_path}'")


def print_summary(merged_output: Dict[str, Any], dry_run: bool = False) -> None:
    substance = merged_output["added_substance"]
    papers = merged_output["added_papers"]

    print("\n" + "=" * 60)
    print("📊 NEUROATLAS DATA GENERATION SUMMARY")
    print("=" * 60)
    print(f"Substance ID       : {substance.get('id')}")
    print(f"Substance Name     : {substance.get('name')}")
    print(f"Category           : {substance.get('category')}")
    print(f"Short Description  : {substance.get('shortDescription')}")
    print("-" * 60)
    print("Phases Overview:")
    phases = substance.get("phases", {})
    for phase_name in ["acute", "chronic", "withdrawal"]:
        phase_data = phases.get(phase_name, {})
        impact = phase_data.get("brainImpact", "")
        areas = [a.get("name") for a in phase_data.get("affectedBrainAreas", [])]
        nts = [nt.get('name') for nt in phase_data.get("neurotransmitters", [])]
        print(f"  • {phase_name.capitalize()}:")
        print(f"    Impact           : {impact[:90]}..." if len(impact) > 90 else f"    Impact           : {impact}")
        print(f"    Brain Areas      : {', '.join(areas) if areas else 'None specified'}")
        print(f"    Neurotransmitters: {', '.join(nts) if nts else 'None specified'}")

    print("-" * 60)
    print(f"Research Papers Count: {len(papers)}")
    for i, paper in enumerate(papers, 1):
        print(f"  {i}. [{paper.get('year')}] {paper.get('title')}")
        print(f"     Journal: {paper.get('journal') or 'N/A'} | DOI: {paper.get('doi') or 'N/A'}")
        print(f"     Brain Areas: {', '.join(paper.get('relatedBrainAreas', []))}")
    print("=" * 60)

    if dry_run:
        print("\n🧪 [DRY RUN MODE] Changes were NOT written to disk.")
        print("\nGenerated Substance Record Preview:")
        print(json.dumps(substance, indent=2, ensure_ascii=False))


def run_pipeline(
    substance_name: str,
    target_papers: int = 5,
    dry_run: bool = False,
    model_override: str = None,
) -> None:
    check_api_key()

    print("=" * 60)
    print(f"🚀 Starting NeuroAtlas LangChain Pipeline for: '{substance_name}'")
    print(f"Provider : OpenRouter ({BASE_URL})")
    print(f"Model    : {model_override or MODEL}")
    print("=" * 60)

    # 1. Load existing data
    existing_atlas = load_json_file(ATLAS_FILE)
    existing_research = load_json_file(RESEARCH_FILE)

    # 2. Stage 1: Researcher Agent
    researcher = ResearcherAgent()
    raw_data = researcher.fetch_raw_data(substance_name, target_papers=target_papers)

    # 3. Stage 2: Synthesizer Agent (OpenRouter LLM + LangChain)
    synthesizer = SynthesizerAgent(model_name=model_override)
    synthesized_result = synthesizer.synthesize(raw_data)

    # 4. Stage 3: Validator Agent
    validator = ValidatorAgent()
    merged_output = validator.validate_and_merge(
        result=synthesized_result,
        existing_atlas=existing_atlas,
        existing_research=existing_research,
    )

    # 5. Output Summary & Save
    print_summary(merged_output, dry_run=dry_run)

    if not dry_run:
        save_json_file(ATLAS_FILE, merged_output["atlas"])
        save_json_file(RESEARCH_FILE, merged_output["research"])
        print("\n✅ Successfully updated atlas.json and research.json!")


def main():
    parser = argparse.ArgumentParser(
        description="NeuroAtlas AI Multi-Agent Data Collector powered by OpenRouter & LangChain"
    )
    parser.add_argument(
        "-s",
        "--substance",
        type=str,
        required=True,
        help="Name of the psychoactive substance to research (e.g. 'MDMA', 'Psilocybin', 'Caffeine', 'Ketamine')",
    )
    parser.add_argument(
        "-m",
        "--target-papers",
        type=int,
        default=5,
        help="Target number of RELEVANT research papers to collect (default: 5)",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help=f"OpenRouter model override (default from .env: {MODEL})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run the complete pipeline and output generated data without modifying atlas.json and research.json",
    )

    args = parser.parse_args()
    run_pipeline(
        substance_name=args.substance,
        target_papers=args.target_papers,
        dry_run=args.dry_run,
        model_override=args.model,
    )


if __name__ == "__main__":
    main()
