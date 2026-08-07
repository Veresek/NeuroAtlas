import argparse
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path
from typing import Any, Dict, List

from config import API_KEY, ATLAS_FILE, RESEARCH_FILE
from agents import ResearcherAgent, SynthesizerAgent, ValidatorAgent

if not API_KEY:
    print("[ERROR] No API_KEY found in environment.")
    print("Create a .env file in the agent/ directory with:")
    print("  API_KEY=your_api_key_here")
    print("  BASE_URL=https://api.deepseek.com   # optional")
    print("  MODEL=deepseek-chat                 # optional")
    print("\nSee .env.example for all available options.")
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
    print(f"💾 Saved updated data to '{file_path}'")


def run_pipeline(substance_name: str, target_papers: int = 5, dry_run: bool = False) -> None:
    print(f"==================================================")
    print(f"🚀 Starting NeuroAtlas Agent Pipeline for: {substance_name}")
    print(f"==================================================")

    # 1. Load existing data
    existing_atlas = load_json_file(ATLAS_FILE)
    existing_research = load_json_file(RESEARCH_FILE)

    # 2. Stage 1: Researcher Agent
    researcher = ResearcherAgent()
    raw_data = researcher.fetch_raw_data(substance_name, target_papers=target_papers)

    # 3. Stage 2: Synthesizer Agent
    synthesizer = SynthesizerAgent()
    synthesized_result = synthesizer.synthesize(raw_data)

    # 4. Stage 3: Validator Agent
    validator = ValidatorAgent()
    merged_output = validator.validate_and_merge(
        synthesized_result, existing_atlas, existing_research
    )

    print(f"\n==================================================")
    print(f"📊 SUMMARY OF GENERATED DATA")
    print(f"==================================================")
    print(f"Substance ID: {merged_output['added_substance']['id']}")
    print(f"Name: {merged_output['added_substance']['name']}")
    print(f"Category: {merged_output['added_substance']['category']}")
    print(f"Short Description: {merged_output['added_substance']['shortDescription']}")
    print(f"Research Papers Count: {len(merged_output['added_papers'])}")

    if dry_run:
        print("\n🧪 [DRY RUN MODE] Changes were NOT written to disk.")
        print("\nGenerated Substance JSON Preview:")
        print(json.dumps(merged_output["added_substance"], indent=2, ensure_ascii=False))
        print("\nGenerated Research Papers Preview:")
        print(json.dumps(merged_output["added_papers"], indent=2, ensure_ascii=False))
    else:
        # Save files
        save_json_file(ATLAS_FILE, merged_output["atlas"])
        save_json_file(RESEARCH_FILE, merged_output["research"])
        print("\n✅ Successfully updated atlas.json and research.json!")


def main():
    parser = argparse.ArgumentParser(
        description="NeuroAtlas AI Multi-Agent Data Collector for Substances and Research"
    )
    parser.add_argument(
        "-s",
        "--substance",
        type=str,
        required=True,
        help="Name of the psychoactive substance to research (e.g. 'MDMA', 'Psilocybin', 'Nicotine', 'Caffeine')",
    )
    parser.add_argument(
        "-m",
        "--target-papers",
        type=int,
        default=5,
        help="Target number of RELEVANT research papers to gather; the agent keeps searching until it reaches this (default: 5)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run pipeline and print results without modifying JSON files",
    )

    args = parser.parse_args()
    run_pipeline(args.substance, target_papers=args.target_papers, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
