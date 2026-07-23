"""
Filters the Kaggle myScheme dataset (updated_data.csv) into MSME and NGO
relevant subsets, and structures them into the same schema used by
merge_schemes.py — so both data sources plug into Phase 2 the same way.

Usage:
    python filter_kaggle_schemes.py
"""

import json
import re
from pathlib import Path

import pandas as pd

INPUT_CSV = Path("updated_data.csv")
OUT_DIR = Path("data/processed")
OUT_FILE = OUT_DIR / "schemes_structured_kaggle.json"

MSME_TERMS = "MSME|Udyam|Entrepreneur|Business|Startup|Manufacturing|Industry"
NGO_TERMS = "NGO|non-governmental|non profit|nonprofit|CSR|FCRA|trust|society registration|12A|80G"

MSME_CAP_CENTRAL = 30
MSME_CAP_STATE = 15
NGO_CAP = 25


def split_list(value) -> list[str]:
    if pd.isna(value):
        return []
    return [v.strip() for v in str(value).split(",") if v.strip()]


def structure_row(row: pd.Series, persona: str) -> dict:
    return {
        "scheme_id": row["slug"],
        "slug": row["slug"],
        "scheme_name": row["scheme_name"],
        "scheme_short_title": None,
        "ministry": None,
        "level": row["level"],
        "categories": split_list(row.get("schemeCategory")),
        "tags": split_list(row.get("tags")),
        "target_beneficiaries": None,
        "scheme_open_date": None,
        "scheme_close_date": None,
        "description_md": row.get("details") if pd.notna(row.get("details")) else None,
        "benefits_md": row.get("benefits") if pd.notna(row.get("benefits")) else None,
        "eligibility_md": row.get("eligibility") if pd.notna(row.get("eligibility")) else None,
        "application_process": [
            {"mode": None, "url": None, "process_md": row.get("application")}
        ] if pd.notna(row.get("application")) else [],
        "documents_required_md": row.get("documents") if pd.notna(row.get("documents")) else None,
        "source": "kaggle_myscheme_dataset",
        "persona": persona,
    }


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(INPUT_CSV)
    print(f"Loaded {len(df)} total schemes from {INPUT_CSV}")

    msme_mask = (
        df["schemeCategory"].str.contains("Business & Entrepreneurship", na=False)
        | df["tags"].str.contains(MSME_TERMS, case=False, na=False)
    )
    ngo_mask = (
        df["details"].str.contains(NGO_TERMS, case=False, na=False)
        | df["tags"].str.contains("NGO|CSR|Trust|Society|Non-Profit|Voluntary", case=False, na=False)
    )

    msme_central = df[msme_mask & (df["level"] == "Central")].head(MSME_CAP_CENTRAL)
    msme_state = df[msme_mask & (df["level"] == "State")].head(MSME_CAP_STATE)
    ngo_subset = df[ngo_mask].head(NGO_CAP)

    print(f"Selected: {len(msme_central)} central MSME, {len(msme_state)} state MSME, {len(ngo_subset)} NGO")

    structured = []
    for _, row in msme_central.iterrows():
        structured.append(structure_row(row, "MSME"))
    for _, row in msme_state.iterrows():
        structured.append(structure_row(row, "MSME"))
    for _, row in ngo_subset.iterrows():
        structured.append(structure_row(row, "NGO"))

    OUT_FILE.write_text(json.dumps(structured, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nSaved {len(structured)} structured scheme records to {OUT_FILE}")
    print(f"  MSME: {len(msme_central) + len(msme_state)} ({len(msme_central)} central, {len(msme_state)} state)")
    print(f"  NGO: {len(ngo_subset)}")


if __name__ == "__main__":
    main()
