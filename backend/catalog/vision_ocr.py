"""Prescription image -> raw text lines, read by a vision-capable LLM
instead of a generic OCR engine.

Doctor handwriting is one of the hardest handwriting-recognition problems
there is -- generic OCR (EasyOCR) reads printed text well but does poorly
on handwriting, which is why the old pipeline kept producing "Couldn't
read that prescription" errors. A vision-capable LLM (same Gemini model
already used in assistant/ai_match.py) reads handwriting far more
reliably because it has broad visual-language understanding rather than
character-shape matching alone.

This module is a DRUM-TIGHT reader, not a diagnoser: the prompt explicitly
asks only for the literal text on the page, one candidate word/phrase per
line, same shape as the old EasyOCR output ({"text", "confidence"}) --
so it plugs into the existing catalog.ocr.match_candidates fuzzy-matching
unchanged. It is never asked to name what the medicine treats, suggest a
dose, or fill in anything not literally visible on the image.

If GEMINI_API_KEY isn't set, or the call fails for any reason, this
returns None so callers can fall back to local EasyOCR -- AI is an
enhancement, never a hard dependency.
"""

import base64
import json
import logging
import re
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-flash-latest:generateContent"
)

_JSON_ARRAY_RE = re.compile(r"\[.*\]", re.DOTALL)

_PROMPT = (
    "You are transcribing text off a photo of a handwritten or printed "
    "doctor's prescription for a pharmacy search tool. Read every distinct "
    "word or short phrase that could be a medicine/brand name, salt name, "
    "or dosage/strength written on the page (e.g. 'Dolo 650', 'Amoxicillin "
    "500mg', 'Shelcal'). Do NOT interpret handwriting you can't confidently "
    "read -- skip it rather than guessing. Do NOT diagnose, suggest a "
    "medicine, or explain what anything treats -- transcription only. If "
    "the image isn't a legible prescription at all, return an empty array.\n\n"
    "Respond with ONLY a JSON array of objects, nothing else, each shaped "
    'like {"text": "<the literal text>", "confidence": <0.0-1.0, your best '
    'guess of how certain you are>}. Example: '
    '[{"text": "Dolo 650", "confidence": 0.9}, {"text": "Pantop 40", '
    '"confidence": 0.6}]'
)


def _guess_mime_type(image_bytes):
    if image_bytes[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if image_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"  # reasonable default; Gemini is tolerant of this


def _call_gemini_vision(image_bytes, api_key):
    payload = json.dumps({
        "contents": [{
            "parts": [
                {"text": _PROMPT},
                {
                    "inline_data": {
                        "mime_type": _guess_mime_type(image_bytes),
                        "data": base64.b64encode(image_bytes).decode("ascii"),
                    }
                },
            ]
        }],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 800,
        },
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{GEMINI_URL}?key={api_key}",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.load(resp)
    return data["candidates"][0]["content"]["parts"][0]["text"]


def extract_lines_vision(image_bytes):
    """Returns a list of {"text", "confidence"} dicts, same shape as
    catalog.ocr.extract_lines, or None if the vision path isn't available
    (no API key, or the call failed) so the caller can fall back."""
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        return None

    try:
        raw = _call_gemini_vision(image_bytes, api_key)
    except urllib.error.HTTPError as e:
        logger.warning("Gemini vision API error %s: %s", e.code, e.read().decode(errors="replace")[:500])
        return None
    except (urllib.error.URLError, TimeoutError, KeyError, IndexError, json.JSONDecodeError) as e:
        logger.warning("Gemini vision API call failed: %r", e)
        return None

    match = _JSON_ARRAY_RE.search(raw)
    if not match:
        logger.warning("Gemini vision response had no usable JSON array: %r", raw[:300])
        return None

    try:
        items = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None

    if not isinstance(items, list):
        return None

    lines = []
    for item in items:
        if not isinstance(item, dict):
            continue
        text = item.get("text")
        conf = item.get("confidence")
        if not isinstance(text, str) or not text.strip():
            continue
        try:
            conf = float(conf)
        except (TypeError, ValueError):
            conf = 0.5
        lines.append({"text": text.strip(), "confidence": round(max(0.0, min(1.0, conf)), 2)})

    return lines
