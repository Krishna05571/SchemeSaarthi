"""
Phase 2, Step 3b — RAG chatbot: retrieval + grounded answers.

Embeds the user's question, retrieves the most relevant scheme chunks from
ChromaDB, and asks Gemini to answer USING ONLY those retrieved chunks —
so answers are grounded in real scheme text, not hallucinated.

Setup:
    pip install chromadb google-genai --break-system-packages
    Run build_vector_store.py first to populate the vector store.

Usage:
    python rag_chatbot.py
    (interactive — type questions, type 'exit' to quit)
"""

import os

import chromadb
from google import genai
from google.genai import types

CHROMA_DIR = "chroma_db"
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


def retrieve(client: genai.Client, collection, question: str, persona: str | None = None) -> list[dict]:
    embed_result = client.models.embed_content(model=EMBED_MODEL, contents=question)
    query_vector = embed_result.embeddings[0].values

    where_filter = {"persona": persona} if persona else None
    results = collection.query(
        query_embeddings=[query_vector],
        n_results=TOP_K,
        where=where_filter,
    )

    chunks = []
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        chunks.append({"text": doc, "metadata": meta})
    return chunks


def answer_question(client: genai.Client, question: str, retrieved_chunks: list[dict]) -> str:
    context = "\n\n---\n\n".join(c["text"] for c in retrieved_chunks)
    prompt = f"{SYSTEM_INSTRUCTION}\n\nCONTEXT:\n{context}\n\nQUESTION: {question}\n\nANSWER:"

    response = client.models.generate_content(
        model=CHAT_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.2),
    )
    return response.text


def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY environment variable not set.")
        return

    client = genai.Client(api_key=api_key)
    chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
    collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)

    count = collection.count()
    if count == 0:
        print("ERROR: Vector store is empty. Run build_vector_store.py first.")
        return
    print(f"Loaded vector store with {count} chunks.\n")
    print("Ask a question about MSME/NGO government schemes (type 'exit' to quit).\n")

    while True:
        question = input("You: ").strip()
        if question.lower() in ("exit", "quit"):
            break
        if not question:
            continue

        chunks = retrieve(client, collection, question)
        print(f"\n  [retrieved {len(chunks)} chunks: "
              f"{', '.join(c['metadata']['scheme_name'] for c in chunks)}]\n")

        answer = answer_question(client, question, chunks)
        print(f"Assistant: {answer}\n")


if __name__ == "__main__":
    main()
