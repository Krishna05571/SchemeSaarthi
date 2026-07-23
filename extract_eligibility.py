"""
Phase 2, Step 1 — One-time LLM extraction of structured eligibility fields.

Reads data/processed/schemes_structured_kaggle.json, sends each scheme's
eligibility_md text to Gemini, and asks it to extract structured fields
(age range, gender, entity type, registration requirements, sector, etc.)
Results are cached back into the scheme records so this only needs to run
once — the rule engine then does pure Python comparison at query time,
no LLM call per user.

Setup:
    pip install google-genai --break-system-packages
    Set GEMINI_API_KEY as an environment variable (see previous instructions)

Usage:
    python extract_eligibility.py
"""

import json
import os
import re
import time
from pathlib import Path

from google import genai
from google.genai import types

INPUT_FILE = Path("data/processed/schemes_structured_kaggle.json")
OUTPUT_FILE = Path("data/processed/schemes_with_eligibility.json")
MODEL_NAME = "gemini-3.1-flash-lite"
REQUEST_DELAY = 7  # seconds between calls — stays safely under free-tier RPM limits

PROMPT_TEMPLATE = """You are extracting structured eligibility fields from an Indian government scheme's eligibility text. Read the text and output ONLY a JSON object (no markdown fences, no explanation) with exactly this shape:

{{
  "min_age": <int or null>,
  "max_age": <int or null>,
  "gender": "any" | "male" | "female" | "other",
  "entity_type": [<list of strings, e.g. "Individual", "MSME", "NGO", "Trust", "Society", "Company", "Startup">],
  "registration_required": [<list of strings, e.g. "Udyam Registration", "GST", "12A", "80G", "FCRA", "Society Registration">],
  "sector": [<list of strings if sector-specific, e.g. "Manufacturing", "Services", "Agriculture"> or null if not sector-specific],
  "income_cap_inr": <number or null, the maximum income/turnover limit mentioned in INR if any>,
  "location_scope": "All India" | [<list of specific states if restricted>],
  "business_stage": "new" | "existing" | "any" | null,
  "other_conditions": "<short plain-English summary of any other hard requirement not captured above, or null>"
}}

Only extract what is explicitly stated or clearly implied. Use null/"any" when something isn't mentioned — do not guess or invent values.

Scheme name: {scheme_name}
Categories: {categories}
Eligibility text:
{eligibility_text}
"""


def extract_json(text: str) -> dict | None:
    """Strip markdown fences if present and parse JSON."""
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None


def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY environment variable not set.")
        return

    client = genai.Client(api_key=api_key)

    if not INPUT_FILE.exists():
        print(f"ERROR: {INPUT_FILE} not found. Run this from your project root.")
        return

    schemes = json.loads(INPUT_FILE.read_text(encoding="utf-8"))
    print(f"Loaded {len(schemes)} schemes from {INPUT_FILE}")

    # Resume support: load existing progress if present
    if OUTPUT_FILE.exists():
        schemes = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        print("Resuming from existing partial output.")

    done, failed = 0, 0
    for i, scheme in enumerate(schemes):
        if scheme.get("eligibility_structured") is not None:
            continue  # already processed

        eligibility_text = scheme.get("eligibility_md") or "No eligibility text provided."
        prompt = PROMPT_TEMPLATE.format(
            scheme_name=scheme.get("scheme_name", ""),
            categories=", ".join(scheme.get("categories", [])),
            eligibility_text=eligibility_text,
        )

        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0),
            )
            parsed = extract_json(response.text)
            if parsed is None:
                print(f"  FAILED to parse JSON for '{scheme.get('scheme_name')}'")
                scheme["eligibility_structured"] = None
                failed += 1
            else:
                scheme["eligibility_structured"] = parsed
                done += 1
        except Exception as e:
            print(f"  ERROR on '{scheme.get('scheme_name')}': {e}")
            scheme["eligibility_structured"] = None
            failed += 1

        # Save progress after every scheme so a crash doesn't lose work
        OUTPUT_FILE.write_text(json.dumps(schemes, ensure_ascii=False, indent=2), encoding="utf-8")

        if (i + 1) % 5 == 0:
            print(f"Progress: {i + 1}/{len(schemes)} (done={done}, failed={failed})")

        time.sleep(REQUEST_DELAY)

    print(f"\nFinished. done={done}, failed={failed}")
    print(f"Saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()