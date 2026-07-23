# AI-Powered Government Scheme & Compliance Navigator

Helping MSMEs and NGOs discover, understand, and apply for government
schemes — without the paperwork maze.

4,000+ government schemes exist across Indian ministries. Most MSMEs and
NGOs never find the ones they qualify for. This platform matches a business
or NGO's profile against real eligibility criteria, explains *why* they
qualify in plain language, and answers follow-up questions grounded in the
official scheme text — not a generic chatbot guessing.

## How it works

1. **Rule-based eligibility matching** — a user's profile is checked
   against structured eligibility criteria extracted from real scheme data.
2. **Filtered RAG retrieval** — instead of searching all scheme text, we
   only search within schemes the user is actually eligible for.
3. **Grounded AI synthesis** — Gemini turns the matched schemes and
   retrieved text into one clear, personalized recommendation.

Every match shows exactly which criteria were confirmed (✓) and which
couldn't be verified from the info provided (?) — no silent assumptions.

## Tech stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** FastAPI
- **Vector store:** ChromaDB
- **AI:** Google Gemini (`gemini-3.1-flash-lite` for generation,
  `gemini-embedding-001` for embeddings)
- **Data:** 70 curated schemes (45 MSME, 25 NGO), sourced from
  myScheme.gov.in

## Project structure

```
scheme_navigator/
├── data/
│   └── processed/
│       └── schemes_with_eligibility.json   # canonical dataset
├── chroma_db/                                # vector store (regenerable)
├── backend/
│   ├── main.py                               # FastAPI app + routes
│   └── advisor.py                            # orchestrator: rule engine + filtered RAG + Gemini
├── frontend/
│   └── src/                                  # React app
├── extract_eligibility.py                    # one-time LLM extraction (Phase 2 prep)
├── build_vector_store.py                     # one-time embedding pipeline (Phase 2 prep)
├── rule_engine.py                            # standalone rule engine (for testing)
├── rag_chatbot.py                            # standalone CLI chatbot (for testing)
└── filter_kaggle_schemes.py                  # Phase 1 data filtering
```

## Setup

### 1. Backend

```bash
cd backend
pip install fastapi uvicorn chromadb google-genai --break-system-packages
```

Set your Gemini API key (get one free at aistudio.google.com → "Get API key"):

```powershell
$env:GEMINI_API_KEY = "your-key-here"
```

Run the server:

```bash
uvicorn main:app --reload
```

API docs available at `http://127.0.0.1:8000/docs`.

### 2. Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The backend must be running for the
frontend to work.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Sanity check |
| POST | `/api/match` | Profile → eligible schemes (rule engine only) |
| POST | `/api/chat` | Question → grounded answer (optionally scoped to one scheme or persona) |
| POST | `/api/advisor` | Profile + optional question → eligible schemes + one synthesized recommendation |
| GET | `/api/schemes/{slug}` | Full detail for one scheme |

## Known limitations

- Dataset does not include scheme application deadlines (not present in
  the source data), so closed schemes aren't filtered out.
- Sector, age, income, and other optional profile fields are only enforced
  as filters when the user provides them — if left blank, the scheme is
  shown with an honest "unverified" flag rather than excluded.
- NGO scheme coverage (25 schemes) is thinner than MSME (45), since
  myScheme.gov.in itself has less NGO-specific content.

## Future scope

- OCR-based document verification
- AI-drafted application generation
- Deadline tracking and renewal reminders
- Multi-language support
- Broader state-level scheme coverage
