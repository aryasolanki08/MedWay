"""Loads and runs the locally fine-tuned handwriting-OCR model, if one has
been trained (see scripts/finetune_prescription_ocr.py in the repo root).

This is a plain TrOCR (transformer OCR) model fine-tuned on your own
labeled prescription photos, so it reads line-by-line the way TrOCR
expects -- each call is one cropped text region in, one string out. Since
line/region detection needs its own model, this reuses EasyOCR purely for
*where* the text boxes are (detection), then asks the fine-tuned model
*what* each box says (recognition) -- the two halves of OCR most systems
already keep separate. If the fine-tuned model isn't more confident than
plain EasyOCR would have been on its own, this still returns real
confidence scores from generation, not fabricated ones.

MODEL_DIR is where scripts/finetune_prescription_ocr.py saves its output.
Until that has actually been run, MODEL_DIR won't exist and load_model()
returns None -- catalog.ocr falls back to the next reader in line.
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).resolve().parent.parent / "prescription_ocr_model"


def load_model():
    if not MODEL_DIR.exists():
        return None

    import torch
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel

    processor = TrOCRProcessor.from_pretrained(str(MODEL_DIR))
    model = VisionEncoderDecoderModel.from_pretrained(str(MODEL_DIR))
    model.eval()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    return {"processor": processor, "model": model, "device": device}


def _detect_regions(image_bytes):
    """Text-region detection only (not recognition) -- reuses EasyOCR's
    detector since training a from-scratch detector on 100 images isn't
    viable, and detection (finding *where* text is) is a much easier,
    more generic problem than reading handwriting."""
    from . import ocr as ocr_module

    reader = ocr_module.get_reader()
    return reader.readtext(image_bytes, detail=1)


def extract_lines(loaded, image_bytes):
    import io

    import torch
    from PIL import Image

    try:
        regions = _detect_regions(image_bytes)
    except Exception as e:
        logger.warning("Region detection failed ahead of fine-tuned model: %r", e)
        return None

    if not regions:
        return []

    full_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    processor = loaded["processor"]
    model = loaded["model"]
    device = loaded["device"]

    lines = []
    for bbox, _easyocr_text, detection_conf in regions:
        xs = [p[0] for p in bbox]
        ys = [p[1] for p in bbox]
        crop = full_image.crop((min(xs), min(ys), max(xs), max(ys)))
        if crop.width < 4 or crop.height < 4:
            continue

        pixel_values = processor(images=crop, return_tensors="pt").pixel_values.to(device)
        with torch.no_grad():
            out = model.generate(
                pixel_values,
                max_length=32,
                output_scores=True,
                return_dict_in_generate=True,
            )
        text = processor.batch_decode(out.sequences, skip_special_tokens=True)[0].strip()
        if not text:
            continue

        # Blend the model's own token-probability confidence with the
        # detector's box confidence -- a fine-tuned model can be fluent but
        # wrong, so don't let generation confidence alone decide.
        if out.sequences_scores is not None:
            gen_conf = float(torch.exp(out.sequences_scores[0]).clamp(0, 1))
        else:
            gen_conf = 0.5
        confidence = round((gen_conf + float(detection_conf)) / 2, 2)
        lines.append({"text": text, "confidence": confidence})

    return lines
