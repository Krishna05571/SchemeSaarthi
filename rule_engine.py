"""
Phase 2, Step 2 — Rule-based eligibility matching engine.

Takes a user profile and matches it against the structured eligibility
fields extracted in Step 1. Pure Python comparison — no LLM calls, fully
deterministic and explainable.

Usage:
    python rule_engine.py
    (runs a demo match against a sample profile — see bottom of file)
"""

import json
from pathlib import Path

DATA_FILE = Path("data/processed/schemes_with_eligibility.json")


def load_schemes() -> list[dict]:
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def check_match(profile: dict, scheme: dict) -> tuple[bool, list[str], list[str]]:
    """
    Returns (is_eligible, matched_reasons, unverified_criteria).

    matched_reasons: criteria we actively confirmed the profile satisfies.
    unverified_criteria: criteria the scheme specifies but we couldn't check
    because the profile didn't provide that info — these are NOT treated as
    failures, but should be shown to the user honestly rather than silently
    assumed to be fine.
    """
    elig = scheme.get("eligibility_structured")
    if not elig:
        return False, [], ["No structured eligibility data available for this scheme."]

    reasons = []
    unverified = []

    # --- entity_type (always required, core to the product) ---
    scheme_entities = elig.get("entity_type") or []
    if scheme_entities and profile.get("entity_type") not in scheme_entities:
        return False, [], [f"Requires entity type {scheme_entities}, profile is '{profile.get('entity_type')}'."]
    if scheme_entities:
        reasons.append(f"Matches entity type: {profile.get('entity_type')}")

    # --- gender ---
    scheme_gender = elig.get("gender", "any")
    if scheme_gender not in (None, "any"):
        if profile.get("gender") is None:
            unverified.append(f"Requires gender '{scheme_gender}' — not provided in profile.")
        elif profile.get("gender") != scheme_gender:
            return False, [], [f"Requires gender '{scheme_gender}', profile is '{profile.get('gender')}'."]
        else:
            reasons.append(f"Matches gender requirement: {scheme_gender}")

    # --- age range ---
    age = profile.get("age")
    min_age, max_age = elig.get("min_age"), elig.get("max_age")
    if min_age is not None or max_age is not None:
        if age is None:
            unverified.append(f"Requires age {min_age or 'any'}-{max_age or 'any'} — not provided in profile.")
        else:
            if min_age is not None and age < min_age:
                return False, [], [f"Requires minimum age {min_age}, profile age is {age}."]
            if max_age is not None and age > max_age:
                return False, [], [f"Requires maximum age {max_age}, profile age is {age}."]
            reasons.append(f"Matches age requirement ({min_age or 'any'}-{max_age or 'any'})")

    # --- income cap ---
    income = profile.get("annual_income_inr")
    income_cap = elig.get("income_cap_inr")
    if income_cap is not None:
        if income is None:
            unverified.append(f"Requires income under ₹{income_cap:,} — not provided in profile.")
        elif income > income_cap:
            return False, [], [f"Income cap is ₹{income_cap:,}, profile income is ₹{income:,}."]
        else:
            reasons.append(f"Within income cap: ₹{income_cap:,}")

    # --- location ---
    location_scope = elig.get("location_scope")
    if location_scope and location_scope != "All India":
        allowed_states = location_scope if isinstance(location_scope, list) else [location_scope]
        if profile.get("state") is None:
            unverified.append(f"Restricted to {allowed_states} — state not provided in profile.")
        elif profile.get("state") not in allowed_states:
            return False, [], [f"Restricted to {allowed_states}, profile state is '{profile.get('state')}'."]
        else:
            reasons.append(f"Matches location: {profile.get('state')}")

    # --- business stage ---
    stage = elig.get("business_stage")
    if stage and stage != "any":
        if not profile.get("business_stage"):
            unverified.append(f"Requires business stage '{stage}' — not provided in profile.")
        elif profile.get("business_stage") != stage:
            return False, [], [f"Requires business stage '{stage}', profile is '{profile.get('business_stage')}'."]
        else:
            reasons.append(f"Matches business stage: {stage}")

    # --- sector ---
    scheme_sectors = elig.get("sector")
    profile_sector = profile.get("sector")
    if scheme_sectors:
        if not profile_sector:
            unverified.append(f"Restricted to sectors {scheme_sectors} — sector not provided in profile.")
        elif profile_sector not in scheme_sectors:
            return False, [], [f"Restricted to sectors {scheme_sectors}, profile sector is '{profile_sector}'."]
        else:
            reasons.append(f"Matches sector: {profile_sector}")

    if not reasons and not unverified:
        reasons.append("No restrictive criteria found — broadly eligible.")

    return True, reasons, unverified


def match_schemes(profile: dict, schemes: list[dict]) -> list[dict]:
    """Returns list of eligible-scheme dicts, sorted by match strength
    (schemes with more positively-confirmed criteria appear first)."""
    results = []
    for scheme in schemes:
        is_eligible, reasons, unverified = check_match(profile, scheme)
        if is_eligible:
            elig = scheme.get("eligibility_structured", {})
            results.append({
                "scheme_name": scheme.get("scheme_name"),
                "slug": scheme.get("slug"),
                "persona": scheme.get("persona"),
                "reasons": reasons,
                "unverified_criteria": unverified,
                "registration_required": elig.get("registration_required", []),
                "other_conditions": elig.get("other_conditions"),
                "benefits_md": scheme.get("benefits_md"),
                "match_strength": len(reasons),
            })
    results.sort(key=lambda r: r["match_strength"], reverse=True)
    return results


if __name__ == "__main__":
    schemes = load_schemes()
    print(f"Loaded {len(schemes)} schemes\n")

    # --- demo profile: edit this to test different scenarios ---
    sample_profile = {
        "entity_type": "MSME",
        "gender": "any",
        "age": 30,
        "annual_income_inr": None,
        "state": "Uttar Pradesh",
        "business_stage": "existing",
        "sector": None,
    }

    matches = match_schemes(sample_profile, schemes)
    print(f"Found {len(matches)} eligible schemes for sample profile:\n")
    for m in matches[:10]:
        print(f"- {m['scheme_name']} ({m['persona']}) [strength: {m['match_strength']}]")
        for r in m["reasons"]:
            print(f"    ✓ {r}")
        for u in m["unverified_criteria"]:
            print(f"    ? {u}")
        if m["registration_required"]:
            print(f"    Registration needed: {', '.join(m['registration_required'])}")
        print()