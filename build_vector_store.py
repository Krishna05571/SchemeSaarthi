"""
Phase 2, Step 3a — Build the RAG vector store.

Chunks each scheme into separate fields (description, benefits, eligibility,
documents required, application process), embeds each chunk with Gemini,
and stores them in a local persistent ChromaDB collection.

Run once (or re-run any time — it skips chunks already embedded, so it's
safe to re-run after adding new schemes to the dataset).

Setup:
    pip install chromadb google-genai --break-system-packages

Usage:
    python build_vector_store.py
"""

import json
import os
import time
from pathlib import Path

import chromadb
from google import genai

DATA_FILE = Path("data/processed/schemes_with_eligibility.json")
CHROMA_DIR = "chroma_db"
COLLECTION_NAME = "schemes"
EMBED_MODEL = "gemini-embedding-001"
REQUEST_DELAY = 1.5  # seconds between embedding calls


def build_chunks(scheme: dict) -> list[dict]:
    """Split one scheme into labeled text chunks with metadata."""
    name = scheme.get("scheme_name", "Unknown Scheme")
    slug = scheme.get("slug", "unknown")
    persona = scheme.get("persona", "")

    fields = [
        ("description", scheme.get("description_md")),
        ("benefits", scheme.get("benefits_md")),
        ("eligibility", scheme.get("eligibility_md")),
        ("documents_required", scheme.get("documents_required_md")),
    ]

    # application_process is a list of {mode, url, process_md}
    app_steps = scheme.get("application_process") or []
    app_text = "\n\n".join(
        step.get("process_md", "") for step in app_steps if step.get("process_md")
    )
    if app_text:
        fields.append(("application_process", app_text))

    chunks = []
    for field_name, text in fields:
        if not text or not text.strip():
            continue
        chunk_id = f"{slug}::{field_name}"
        label = field_name.replace("_", " ").title()
        full_text = f"Scheme: {name}\nSection: {label}\n\n{text.strip()}"
        chunks.append({
            "id": chunk_id,
            "text": full_text,
            "metadata": {
                "scheme_name": name,
                "slug": slug,
                "persona": persona,
                "field": field_name,
            },
        })
    return chunks


def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY environment variable not set.")
        return

    client = genai.Client(api_key=api_key)
    chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
    collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)

    if not DATA_FILE.exists():
        print(f"ERROR: {DATA_FILE} not found. Run this from your project root.")
        return

    schemes = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    print(f"Loaded {len(schemes)} schemes")

    existing_ids = set(collection.get()["ids"])
    print(f"Vector store already has {len(existing_ids)} chunks embedded")

    all_chunks = []
    for scheme in schemes:
        all_chunks.extend(build_chunks(scheme))

    new_chunks = [c for c in all_chunks if c["id"] not in existing_ids]
    print(f"{len(new_chunks)} new chunks to embed (out of {len(all_chunks)} total)\n")

    done, failed = 0, 0
    for i, chunk in enumerate(new_chunks):
        try:
            result = client.models.embed_content(model=EMBED_MODEL, contents=chunk["text"])
            vector = result.embeddings[0].values
            collection.add(
                ids=[chunk["id"]],
                embeddings=[vector],
                documents=[chunk["text"]],
                metadatas=[chunk["metadata"]],
            )
            done += 1
        except Exception as e:
            print(f"  ERROR on '{chunk['id']}': {e}")
            failed += 1

        if (i + 1) % 10 == 0:
            print(f"Progress: {i + 1}/{len(new_chunks)} (done={done}, failed={failed})")

        time.sleep(REQUEST_DELAY)

    print(f"\nFinished. done={done}, failed={failed}")
    print(f"Total chunks in vector store: {collection.count()}")


if __name__ == "__main__":
    main()
