"""Prescription image -> candidate medicine matches.

Reads text from an uploaded prescription photo, then fuzzy-matches each
extracted line against known brand names and salts. This is purely a
search-input shortcut -- it never infers dosage, diagnosis, or what to
take; it just turns a photo into search queries the same salt-pivoted
catalog.search_medicine already knows how to handle.

Reading is tried in this order:
  1. Vision-LLM reader (catalog.vision_ocr) -- far better on handwriting,
     which is most of what a prescription actually is. Requires
     GEMINI_API_KEY (see medway/settings.py); same key already used by
     assistant.ai_match.
  2. Local fine-tuned handwriting model (catalog.finetuned_ocr), once one
     has been trained on real labeled prescriptions -- see
     scripts/finetune_prescription_ocr.py.
  3. EasyOCR fallback -- generic OCR, weakest on handwriting, but fully
     local so the feature still works with zero API keys configured.
Each step only runs if the previous one is unavailable or fails, so this
never hard-fails just because one path isn't set up.
"""

import difflib
import logging
import re

from . import vision_ocr

logger = logging.getLogger(__name__)

_reader = None
_finetuned = None


def get_reader():
    """EasyOCR's Reader loads ~100MB of model weights on first use, so it's
    created once per process and reused, not per-request."""
    global _reader
    if _reader is None:
        import easyocr

        _reader = easyocr.Reader(["en"], gpu=False)
    return _reader


def _get_finetuned():
    """Loads the fine-tuned handwriting model lazily -- returns None if it
    hasn't been trained/saved yet (see scripts/finetune_prescription_ocr.py),
    so this is a safe no-op until training data exists."""
    global _finetuned
    if _finetuned is False:
        return None
    if _finetuned is None:
        try:
            from . import finetuned_ocr

            _finetuned = finetuned_ocr.load_model()
        except Exception as e:  # model dir missing, deps missing, etc.
            logger.info("Fine-tuned prescription model not available: %r", e)
            _finetuned = False
            return None
    return _finetuned


_WORD_RE = re.compile(r"[A-Za-z][A-Za-z\-]{2,}")


def extract_lines(image_bytes):
    lines = vision_ocr.extract_lines_vision(image_bytes)
    if lines is not None:
        return lines

    finetuned = _get_finetuned()
    if finetuned is not None:
        from . import finetuned_ocr

        lines = finetuned_ocr.extract_lines(finetuned, image_bytes)
        if lines is not None:
            return lines

    reader = get_reader()
    results = reader.readtext(image_bytes, detail=1)
    # Keep OCR's own confidence so obviously-wrong reads (handwriting noise)
    # don't get matched at all.
    return [{"text": text, "confidence": round(float(conf), 2)} for (_bbox, text, conf) in results]


def _add_match(matches, matched_ids, candidate, med):
    if med[0] in matched_ids:
        return
    matched_ids.add(med[0])
    matches.append({
        "matched_text": candidate,
        "medicine_id": str(med[0]),
        "brand_name": med[1],
        "salt_name": med[2],
        "is_generic": med[3],
        "strength": med[4],
    })


def match_candidates(lines, salts, medicines, min_ratio=0.72):
    """salts: list of (id, name, category) tuples.
    medicines: list of (id, brand_name, salt_name, is_generic, strength) tuples.
    Returns deduplicated medicine matches, best-line-match first.
    """
    brand_index = {m[1].lower(): m for m in medicines}
    salt_index = {s[1].lower(): s for s in salts}
    brand_names = list(brand_index.keys())
    salt_names = list(salt_index.keys())

    # Prescriptions and packaging routinely run the strength straight into
    # the name with no space ("Dolo650", "Shelcal500mg"), which OCR then
    # reads as one glued token -- often misreading the digits too
    # ("Shelcalsoo"). A close_matches ratio against the FULL brand string
    # fails here since the lengths no longer line up, so first words get
    # their own exact/prefix index.
    first_word_index = {}
    for med in medicines:
        first_word = med[1].split()[0].lower()
        first_word_index.setdefault(first_word, []).append(med)

    matched_medicine_ids = set()
    matches = []

    for line in lines:
        if line["confidence"] < 0.25:
            continue
        words = _WORD_RE.findall(line["text"])
        candidates = words + [" ".join(words[i:i + 2]) for i in range(len(words) - 1)]
        for candidate in candidates:
            candidate_l = candidate.lower()

            brand_hit = difflib.get_close_matches(candidate_l, brand_names, n=1, cutoff=min_ratio)
            if brand_hit:
                _add_match(matches, matched_medicine_ids, candidate, brand_index[brand_hit[0]])
                continue

            if len(candidate_l) >= 4:
                first_word_hit = difflib.get_close_matches(
                    candidate_l, list(first_word_index.keys()), n=1, cutoff=0.8
                )
                if first_word_hit:
                    for med in first_word_index[first_word_hit[0]]:
                        _add_match(matches, matched_medicine_ids, candidate, med)
                    continue

            salt_hit = difflib.get_close_matches(candidate_l, salt_names, n=1, cutoff=min_ratio)
            if salt_hit:
                for med in medicines:
                    if med[2].lower() == salt_hit[0]:
                        _add_match(matches, matched_medicine_ids, candidate, med)

    return matches
