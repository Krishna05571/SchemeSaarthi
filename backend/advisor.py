"""
Phase 3b — Advisor orchestrator.

Combines the three "brains" into one pipeline:
  1. Rule engine narrows down to schemes the user is actually eligible for
  2. RAG retrieval searches ONLY within those eligible schemes' text
     (not the whole 348-chunk store) — sharper, faster, more relevant
  3. Gemini synthesizes one coherent, grounded recommendation or answer

main.py stays thin (routing only) — this module holds the actual logic,
so it's independently testable and reusable.
"""

from google.genai import types

EMBED_MODEL = "gemini-embedding-001"
CHAT_MODEL = "gemini-3.1-flash-lite"
TOP_K = 6

ADVISOR_SYSTEM_INSTRUCTION = """You are an advisor helping an Indian MSME or NGO understand \
which government schemes they qualify for and what to do next.

STRICT RULES:
- Only discuss the ELIGIBLE SCHEMES and CONTEXT provided below — do not mention \
or invent any other scheme.
- If the user asked a specific question, answer it directly using only the context.
- If no question was asked, give a short, prioritized recommendation: which 1-3 \
schemes to look at first and why, in plain language.
- If the context doesn't fully answer something, say so honestly rather than guessing.
- Mention scheme names explicitly when referring to them.
"""


def get_eligible_matches(profile: dict, schemes: list[dict], check_match_fn) -> list[dict]:
    """Run the rule engine (reuses check_match from main.py) and return sorted matches."""
    results = []
    for scheme in schemes:
        is_eligible, reasons, unverified = check_match_fn(profile, scheme)
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


def retrieve_filtered(genai_client, chroma_collection, query_text: str, eligible_slugs: list[str]) -> list[dict]:
    """Embed the query and retrieve chunks ONLY from the eligible schemes' slugs."""
    if not eligible_slugs:
        return []

    embed_result = genai_client.models.embed_content(model=EMBED_MODEL, contents=query_text)
    query_vector = embed_result.embeddings[0].values

    where_filter = {"slug": {"$in": eligible_slugs}}
    results = chroma_collection.query(
        query_embeddings=[query_vector],
        n_results=TOP_K,
        where=where_filter,
    )
    if not results["documents"] or not results["documents"][0]:
        return []
    return [
        {"text": doc, "metadata": meta}
        for doc, meta in zip(results["documents"][0], results["metadatas"][0])
    ]


def synthesize_recommendation(
    genai_client, question: str | None, eligible_matches: list[dict], retrieved_chunks: list[dict]
) -> str:
    """Ask Gemini to produce one unified, grounded recommendation or answer."""
    if not eligible_matches:
        return ("Based on your profile, no schemes in our current database matched. "
                 "Try adjusting your profile details, or check back as more schemes are added.")

    scheme_summary = "\n".join(
        f"- {m['scheme_name']}: {', '.join(m['reasons']) or 'broadly eligible'}"
        for m in eligible_matches
    )
    context = ("\n\n---\n\n".join(c["text"] for c in retrieved_chunks)
               if retrieved_chunks else "No additional scheme text retrieved.")
    user_question = question or "Give me a prioritized recommendation of which scheme(s) to pursue first and why."

    prompt = (
        f"{ADVISOR_SYSTEM_INSTRUCTION}\n\n"
        f"ELIGIBLE SCHEMES:\n{scheme_summary}\n\n"
        f"CONTEXT:\n{context}\n\n"
        f"USER QUESTION: {user_question}\n\nANSWER:"
    )

    response = genai_client.models.generate_content(
        model=CHAT_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.2),
    )
    return response.text


def get_advisor_response(
    profile: dict,
    question: str | None,
    schemes: list[dict],
    genai_client,
    chroma_collection,
    check_match_fn,
) -> dict:
    """Main orchestration entrypoint: rule engine -> filtered retrieval -> Gemini synthesis."""
    eligible_matches = get_eligible_matches(profile, schemes, check_match_fn)
    eligible_slugs = [m["slug"] for m in eligible_matches]

    retrieval_query = question or "General overview of eligibility, benefits, and application steps."
    retrieved_chunks = retrieve_filtered(genai_client, chroma_collection, retrieval_query, eligible_slugs)

    recommendation = synthesize_recommendation(genai_client, question, eligible_matches, retrieved_chunks)

    return {
        "eligible_schemes": eligible_matches,
        "recommendation": recommendation,
        "sources": list({c["metadata"]["scheme_name"] for c in retrieved_chunks}),
    }
