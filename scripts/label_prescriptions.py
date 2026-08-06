#!/usr/bin/env python3
"""Step 1 of training the fine-tuned prescription OCR model: draft labels.

Takes a folder of raw prescription photos and, for each one, asks the
vision LLM to draft a transcription of every line of text on the page.
Writes everything to a single CSV so a human (you, or a pharmacist) can
open it in a spreadsheet and correct each line -- much faster than
transcribing 100 photos from scratch by hand.

This is a DRAFT step only. Nothing here is used for training until a
person has reviewed and corrected the `text` column.

Usage:
    export GEMINI_API_KEY=...          # same key as backend/.env
    python scripts/label_prescriptions.py \
        --images-dir /path/to/100_photos \
        --out labels_draft.csv

Then open labels_draft.csv, fix the `text` column line by line against
the actual photo (`image_path` + `line_index` tell you which crop it is),
and save it as labels_reviewed.csv. That reviewed file is what
finetune_prescription_ocr.py reads.

CSV columns:
    image_path   - path to the source photo
    line_index   - which line on that photo this row is (0-based)
    text         - the model's draft transcription (EDIT THIS)
    confidence   - the model's own confidence, for sorting review priority
    bbox         - pixel box on the image, "x1,y1,x2,y2" (for reference)
"""

import argparse
import base64
import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-flash-latest:generateContent"
)

_JSON_ARRAY_RE = re.compile(r"\[.*\]", re.DOTALL)

# Asks for bounding boxes too (unlike vision_ocr.py's runtime prompt) since
# labeling needs a crop per line to train a line-level recognition model --
# the runtime path only needs the text itself.
_PROMPT = (
    "You are transcribing a photo of a handwritten or printed doctor's "
    "prescription, to build training data for a handwriting-recognition "
    "model. For every distinct line of handwriting or print on the page "
    "(medicine names, strengths, dosage instructions, doctor's notes -- "
    "everything, not just medicine names), report the literal text and its "
    "approximate bounding box in pixel coordinates for THIS image. Do not "
    "interpret, diagnose, or add anything not literally visible.\n\n"
    "Respond with ONLY a JSON array, nothing else, shaped like: "
    '[{"text": "Dolo 650mg", "confidence": 0.85, "bbox": [120, 340, 310, 380]}]\n'
    "bbox is [x1, y1, x2, y2] in pixels, top-left origin."
)


def guess_mime_type(image_bytes):
    if image_bytes[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if image_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    return "image/jpeg"


def call_gemini_vision(image_bytes, api_key):
    payload = json.dumps({
        "contents": [{
            "parts": [
                {"text": _PROMPT},
                {"inline_data": {"mime_type": guess_mime_type(image_bytes), "data": base64.b64encode(image_bytes).decode("ascii")}},
            ]
        }],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 1200},
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{GEMINI_URL}?key={api_key}",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    return data["candidates"][0]["content"]["parts"][0]["text"]


def label_one(image_path, api_key):
    image_bytes = image_path.read_bytes()
    raw = call_gemini_vision(image_bytes, api_key)
    match = _JSON_ARRAY_RE.search(raw)
    if not match:
        print(f"  [!] no usable JSON for {image_path.name}: {raw[:200]!r}", file=sys.stderr)
        return []
    try:
        items = json.loads(match.group(0))
    except json.JSONDecodeError:
        print(f"  [!] bad JSON for {image_path.name}", file=sys.stderr)
        return []
    return items if isinstance(items, list) else []


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--images-dir", required=True, help="Folder of raw prescription photos (jpg/png)")
    parser.add_argument("--out", default="labels_draft.csv", help="Output CSV path")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        sys.exit("Set GEMINI_API_KEY in your environment first (same key as backend/.env).")

    images_dir = Path(args.images_dir)
    image_paths = sorted(
        p for p in images_dir.iterdir()
        if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    if not image_paths:
        sys.exit(f"No .jpg/.jpeg/.png files found in {images_dir}")

    print(f"Found {len(image_paths)} photos. Drafting transcriptions...")
    rows = []
    for i, image_path in enumerate(image_paths, 1):
        print(f"[{i}/{len(image_paths)}] {image_path.name}")
        try:
            items = label_one(image_path, api_key)
        except urllib.error.HTTPError as e:
            print(f"  [!] API error {e.code}, skipping this image", file=sys.stderr)
            continue
        except (urllib.error.URLError, TimeoutError) as e:
            print(f"  [!] network error ({e!r}), skipping this image", file=sys.stderr)
            continue

        for j, item in enumerate(items):
            if not isinstance(item, dict):
                continue
            rows.append({
                "image_path": str(image_path),
                "line_index": j,
                "text": item.get("text", ""),
                "confidence": item.get("confidence", ""),
                "bbox": ",".join(str(v) for v in item.get("bbox", [])) if item.get("bbox") else "",
            })

        time.sleep(0.3)  # be polite to the free-tier rate limit

    with open(args.out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["image_path", "line_index", "text", "confidence", "bbox"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {len(rows)} draft lines from {len(image_paths)} photos to {args.out}")
    print("Next: open it, correct the 'text' column against each photo, save as labels_reviewed.csv,")
    print("then run scripts/finetune_prescription_ocr.py --labels labels_reviewed.csv")


if __name__ == "__main__":
    main()
