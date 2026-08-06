#!/usr/bin/env python3
"""Step 2 of training the fine-tuned prescription OCR model: fine-tune.

Fine-tunes a pretrained handwriting-OCR model (microsoft/trocr-base-
handwritten) on your reviewed, corrected prescription labels, and saves
the result to backend/prescription_ocr_model/ -- the exact path
backend/catalog/finetuned_ocr.py looks for.

Starting from a pretrained handwriting model (not training from scratch)
matters a lot here: TrOCR was already trained on a huge handwriting
dataset, so fine-tuning on ~100 examples nudges it toward your specific
prescription formats/handwriting styles rather than trying to teach it
handwriting recognition from nothing, which 100 examples can't do.

Expectations: with only ~100 labeled lines this will help on the kinds of
prescriptions/handwriting it saw, but won't generalize broadly. Keep the
vision-LLM reader (catalog/vision_ocr.py) as the primary/fallback path in
production; treat this fine-tuned model as a second opinion, not a
replacement for it. Re-run this as more labeled photos accumulate.

Usage:
    pip install torch transformers datasets pillow --break-system-packages
    python scripts/finetune_prescription_ocr.py --labels labels_reviewed.csv

Requires a GPU for reasonable training time; runs on CPU too, just slowly.
"""

import argparse
import csv
import sys
from pathlib import Path


def load_rows(labels_csv):
    rows = []
    with open(labels_csv, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            text = (row.get("text") or "").strip()
            bbox = (row.get("bbox") or "").strip()
            if not text or not bbox:
                continue  # skip rows with no reviewed text or no crop box
            rows.append(row)
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--labels", required=True, help="Path to labels_reviewed.csv from label_prescriptions.py")
    parser.add_argument("--base-model", default="microsoft/trocr-base-handwritten")
    parser.add_argument("--epochs", type=int, default=15, help="Small dataset needs more passes than usual")
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--lr", type=float, default=5e-5)
    parser.add_argument(
        "--out-dir",
        default=str(Path(__file__).resolve().parent.parent / "backend" / "prescription_ocr_model"),
        help="Must match backend/catalog/finetuned_ocr.py's MODEL_DIR",
    )
    args = parser.parse_args()

    try:
        import torch
        from PIL import Image
        from torch.utils.data import DataLoader, Dataset
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
    except ImportError:
        sys.exit(
            "Missing deps. Run:\n"
            "  pip install torch transformers pillow --break-system-packages"
        )

    rows = load_rows(args.labels)
    if len(rows) < 10:
        sys.exit(
            f"Only {len(rows)} usable labeled rows found in {args.labels} "
            "(need text + bbox filled in). Review more rows before training -- "
            "fine-tuning on too few examples will just overfit to noise."
        )
    print(f"Training on {len(rows)} labeled lines from {args.labels}")

    processor = TrOCRProcessor.from_pretrained(args.base_model)
    model = VisionEncoderDecoderModel.from_pretrained(args.base_model)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cpu":
        print("[!] No GPU detected -- this will be slow. Consider a smaller --epochs for a first pass.")
    model.to(device)

    # TrOCR-specific generation config, required for it to produce sensible
    # output after fine-tuning (these aren't optional defaults).
    model.config.decoder_start_token_id = processor.tokenizer.cls_token_id
    model.config.pad_token_id = processor.tokenizer.pad_token_id
    model.config.vocab_size = model.config.decoder.vocab_size

    class PrescriptionLineDataset(Dataset):
        def __init__(self, rows, processor):
            self.rows = rows
            self.processor = processor
            self._image_cache = {}

        def __len__(self):
            return len(self.rows)

        def _load_image(self, path):
            if path not in self._image_cache:
                self._image_cache[path] = Image.open(path).convert("RGB")
            return self._image_cache[path]

        def __getitem__(self, idx):
            row = self.rows[idx]
            full_image = self._load_image(row["image_path"])
            x1, y1, x2, y2 = (float(v) for v in row["bbox"].split(","))
            crop = full_image.crop((x1, y1, x2, y2))

            pixel_values = self.processor(images=crop, return_tensors="pt").pixel_values.squeeze(0)
            labels = self.processor.tokenizer(
                row["text"], padding="max_length", max_length=32, truncation=True
            ).input_ids
            labels = [l if l != self.processor.tokenizer.pad_token_id else -100 for l in labels]
            return {"pixel_values": pixel_values, "labels": torch.tensor(labels)}

    dataset = PrescriptionLineDataset(rows, processor)
    loader = DataLoader(dataset, batch_size=args.batch_size, shuffle=True)

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr)

    model.train()
    for epoch in range(args.epochs):
        total_loss = 0.0
        for batch in loader:
            pixel_values = batch["pixel_values"].to(device)
            labels = batch["labels"].to(device)

            outputs = model(pixel_values=pixel_values, labels=labels)
            loss = outputs.loss

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        print(f"epoch {epoch + 1}/{args.epochs}  avg loss {total_loss / len(loader):.4f}")

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(out_dir)
    processor.save_pretrained(out_dir)
    print(f"\nSaved fine-tuned model to {out_dir}")
    print("backend/catalog/finetuned_ocr.py will pick it up automatically on next server restart.")


if __name__ == "__main__":
    main()
