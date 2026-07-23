"""
Phase 5 (stretch) — OCR-based document verification and info extraction.

Instead of a separate OCR engine (Tesseract, etc.), we send the document
image/PDF directly to Gemini, which reads it natively and extracts
structured fields in one call. This becomes part of the eligibility
pipeline: Upload Document -> Extract Info -> Auto-fill Profile -> Eligibility Check.
"""

from google.genai import types

CHAT_MODEL = "gemini-3.1-flash-lite"

DOCUMENT_EXTRACTION_PROMPT = """You are reading an official Indian business/NGO registration \
document (e.g. Udyam Registration Certificate, GST Certificate, PAN Card, Society/Trust \
Registration, 12A/80G Certificate, or similar). Extract what you can find and output ONLY a \
JSON object (no markdown fences, no explanation) with exactly this shape:

{
  "document_readable": true | false,
  "document_type": "<your best guess, e.g. 'Udyam Registration Certificate', 'GST Certificate', \
'PAN Card', 'Society Registration Certificate', 'Unknown'>",
  "entity_name": "<business or organization name, or null>",
  "registration_number": "<the main registration/certificate number, or null>",
  "entity_type": "MSME" | "NGO" | "Trust" | "Society" | "Individual" | null,
  "state": "<state mentioned on the document, or null>",
  "sector": "<business sector/activity if mentioned, or null>",
  "issue_date": "<date issued, in any format shown, or null>",
  "notes": "<anything else relevant in one short sentence, or null>"
}

If the image is blurry, cropped, not a real document, or you genuinely cannot read it, \
set "document_readable": false and leave other fields null — do NOT guess or invent values.
"""


def extract_document_info(genai_client, file_bytes: bytes, mime_type: str) -> dict:
    """Send a document image/PDF to Gemini and extract structured fields."""
    import json
    import re

    response = genai_client.models.generate_content(
        model=CHAT_MODEL,
        contents=[
            types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
            DOCUMENT_EXTRACTION_PROMPT,
        ],
        config=types.GenerateContentConfig(temperature=0),
    )

    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", response.text.strip(), flags=re.MULTILINE)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {
            "document_readable": False,
            "document_type": "Unknown",
            "entity_name": None,
            "registration_number": None,
            "entity_type": None,
            "state": None,
            "sector": None,
            "issue_date": None,
            "notes": "Could not parse a structured response for this document.",
        }
