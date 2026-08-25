"""
Phase 3 — FastAPI backend.

Wraps the rule engine (Phase 2) and RAG chatbot (Phase 2) into HTTP
endpoints for the frontend to call.

Setup:
    pip install fastapi uvicorn chromadb google-genai --break-system-packages

Usage (run from the backend/ folder, with data/ and chroma_db/ one level up
in the project root — adjust paths below if your layout differs):
    uvicorn main:app --reload

Then open http://127.0.0.1:8000/docs for interactive API docs.
"""

import json
import os
from pathlib import Path
from typing import Optional

import chromadb
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel

import advisor
import document_processor

# --- paths (adjust if your project layout differs) ---
DATA_FILE = Path("../data/processed/schemes_with_eligibility.json")
CHROMA_DIR = "../chroma_db"
COLLECTION_NAME = "schemes"
EMBED_MODEL = "gemini-embedding-001"
CHAT_MODEL = "gemini-3.1-flash-lite"
TOP_K = 5

SYSTEM_INSTRUCTION = """You are a helpful assistant for an Indian government scheme navigator, \
helping MSMEs and NGOs understand scheme eligibility, benefits, documents, and application steps.

STRICT RULES:
- Answer ONLY using the information in the provided context below.
- If the context does not contain the answer, say clearly that you don't have \
that information in the available scheme data — do NOT guess or make up details.
- When you state a fact, mention which scheme it's from.
- Keep answers concise and in plain language, avoiding legal jargon where possible.
"""

app = FastAPI(title="AI Government Scheme Navigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://schemesaarthi.vercel.app/"],  # or your Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- globals, populated on startup ---
schemes: list[dict] = []
genai_client: Optional[genai.Client] = None
chroma_collection = None


@app.on_event("startup")
def startup():
    global schemes, genai_client, chroma_collection

    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        genai_client = genai.Client(api_key=api_key)
    else:
        print("WARNING: GEMINI_API_KEY environment variable not set. Rule-based matching will work; Gemini AI features require setting GEMINI_API_KEY.")

    if not DATA_FILE.exists():
        raise RuntimeError(f"{DATA_FILE} not found.")
    schemes = json.loads(DATA_FILE.read_text(encoding="utf-8"))

    chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
    chroma_collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)

    print(f"Startup complete: {len(schemes)} schemes, {chroma_collection.count()} vector chunks.")


# ============================================================
# Rule engine matching (imported logic from Phase 2)
# ============================================================

class Profile(BaseModel):
    entity_type: Optional[str] = None       # "MSME" | "NGO" | "Individual" | "Trust" | "Society" | ...
    gender: Optional[str] = None            # "male" | "female" | "other" | "any"
    age: Optional[int] = None
    annual_income_inr: Optional[float] = None
    state: Optional[str] = None
    business_stage: Optional[str] = None    # "new" | "existing"
    sector: Optional[str] = None


def check_match(profile: dict, scheme: dict) -> tuple[bool, list[str], list[str]]:
    elig = scheme.get("eligibility_structured")
    if not elig:
        return False, [], ["No structured eligibility data available for this scheme."]

    reasons, unverified = [], []

    scheme_entities = elig.get("entity_type") or []
    if scheme_entities and profile.get("entity_type") not in scheme_entities:
        return False, [], [f"Requires entity type {scheme_entities}, profile is '{profile.get('entity_type')}'."]
    if scheme_entities:
        reasons.append(f"Matches entity type: {profile.get('entity_type')}")

    scheme_gender = elig.get("gender", "any")
    if scheme_gender not in (None, "any"):
        if profile.get("gender") is None:
            unverified.append(f"Requires gender '{scheme_gender}' — not provided in profile.")
        elif profile.get("gender") != scheme_gender:
            return False, [], [f"Requires gender '{scheme_gender}', profile is '{profile.get('gender')}'."]
        else:
            reasons.append(f"Matches gender requirement: {scheme_gender}")

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

    income = profile.get("annual_income_inr")
    income_cap = elig.get("income_cap_inr")
    if income_cap is not None:
        if income is None:
            unverified.append(f"Requires income under ₹{income_cap:,} — not provided in profile.")
        elif income > income_cap:
            return False, [], [f"Income cap is ₹{income_cap:,}, profile income is ₹{income:,}."]
        else:
            reasons.append(f"Within income cap: ₹{income_cap:,}")

    location_scope = elig.get("location_scope")
    if location_scope and location_scope != "All India":
        allowed_states = location_scope if isinstance(location_scope, list) else [location_scope]
        if profile.get("state") is None:
            unverified.append(f"Restricted to {allowed_states} — state not provided in profile.")
        elif profile.get("state") not in allowed_states:
            return False, [], [f"Restricted to {allowed_states}, profile state is '{profile.get('state')}'."]
        else:
            reasons.append(f"Matches location: {profile.get('state')}")

    stage = elig.get("business_stage")
    if stage and stage != "any":
        if not profile.get("business_stage"):
            unverified.append(f"Requires business stage '{stage}' — not provided in profile.")
        elif profile.get("business_stage") != stage:
            return False, [], [f"Requires business stage '{stage}', profile is '{profile.get('business_stage')}'."]
        else:
            reasons.append(f"Matches business stage: {stage}")

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


@app.post("/api/match")
def match_endpoint(profile: Profile):
    profile_dict = profile.model_dump()
    results = []
    for scheme in schemes:
        is_eligible, reasons, unverified = check_match(profile_dict, scheme)
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
    return {"count": len(results), "matches": results}


# ============================================================
# RAG chatbot (imported logic from Phase 2)
# ============================================================

class ChatRequest(BaseModel):
    question: str
    persona: Optional[str] = None  # "MSME" | "NGO" — optional filter
    slug: Optional[str] = None     # optional: restrict retrieval to one specific scheme
    language: Optional[str] = "en" # "en" | "hi"


@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if not genai_client:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not set. Please set the GEMINI_API_KEY environment variable to use AI chat."
        )

    embed_result = genai_client.models.embed_content(model=EMBED_MODEL, contents=req.question)
    query_vector = embed_result.embeddings[0].values

    filters = []
    if req.persona:
        filters.append({"persona": req.persona})
    if req.slug:
        filters.append({"slug": req.slug})

    if not filters:
        where_filter = None
    elif len(filters) == 1:
        where_filter = filters[0]
    else:
        where_filter = {"$and": filters}

    query_results = chroma_collection.query(
        query_embeddings=[query_vector], n_results=TOP_K, where=where_filter,
    )

    retrieved = [
        {"text": doc, "metadata": meta}
        for doc, meta in zip(query_results["documents"][0], query_results["metadatas"][0])
    ]

    context = "\n\n---\n\n".join(c["text"] for c in retrieved)
    lang_instruction = ""
    if req.language == "hi":
        lang_instruction = "\n- Answer in clear, polite Hindi (Devanagari script). Scheme names may be kept in English or transliterated with English in parentheses."

    prompt = f"{SYSTEM_INSTRUCTION}{lang_instruction}\n\nCONTEXT:\n{context}\n\nQUESTION: {req.question}\n\nANSWER:"

    response = genai_client.models.generate_content(
        model=CHAT_MODEL, contents=prompt, config=types.GenerateContentConfig(temperature=0.2),
    )

    return {
        "answer": response.text,
        "sources": [c["metadata"]["scheme_name"] for c in retrieved],
    }


@app.get("/api/schemes/{slug}")
def get_scheme(slug: str):
    for scheme in schemes:
        if scheme.get("slug") == slug:
            return scheme
    raise HTTPException(status_code=404, detail="Scheme not found.")


# ============================================================
# Advisor — orchestrates rule engine + filtered RAG + Gemini
# ============================================================

class AdvisorRequest(BaseModel):
    profile: Profile
    question: Optional[str] = None  # if omitted, advisor gives a general prioritized recommendation
    language: Optional[str] = "en" # "en" | "hi"


@app.post("/api/advisor")
def advisor_endpoint(req: AdvisorRequest):
    result = advisor.get_advisor_response(
        profile=req.profile.model_dump(),
        question=req.question,
        schemes=schemes,
        genai_client=genai_client,
        chroma_collection=chroma_collection,
        check_match_fn=check_match,
        language=req.language or "en",
    )
    return result


# ============================================================
# Document upload — OCR-based extraction (Phase 5, stretch)
# ============================================================

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}


@app.post("/api/document")
async def document_endpoint(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Upload a JPEG, PNG, WEBP, or PDF.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large — max 10MB.")

    result = document_processor.extract_document_info(
        genai_client=genai_client, file_bytes=file_bytes, mime_type=file.content_type,
    )
    return result


@app.get("/api/health")
def health():
    return {"status": "ok", "schemes_loaded": len(schemes)}

@app.get("/")
def root():
    return {"message": "Backend is running 🚀"}