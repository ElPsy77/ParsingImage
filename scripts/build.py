#!/usr/bin/env python3
"""Extract questions from матан база.docx into public/images and questions.json."""

import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "матан база.docx"
EXTRACTED = ROOT / "extracted"
OUT_IMAGES = ROOT / "public" / "images"
OUT_JSON = ROOT / "public" / "data" / "questions.json"


def main() -> int:
    if not DOCX.exists():
        print(f"File not found: {DOCX}", file=sys.stderr)
        return 1

    import zipfile

    EXTRACTED.mkdir(exist_ok=True)
    with zipfile.ZipFile(DOCX, "r") as zf:
        zf.extractall(EXTRACTED)

    doc_xml = (EXTRACTED / "word/document.xml").read_text(encoding="utf-8")
    rels_xml = (EXTRACTED / "word/_rels/document.xml.rels").read_text(encoding="utf-8")

    rid_to_target = {}
    for m in re.finditer(r'Id="(rId\d+)"[^>]*Target="([^"]+)"', rels_xml):
        rid_to_target[m.group(1)] = m.group(2)

    embeds = re.findall(r'r:embed="(rId\d+)"', doc_xml)
    images = []
    for rid in embeds:
        target = rid_to_target.get(rid, "")
        if "media/" in target:
            images.append(target.split("/")[-1])

    OUT_IMAGES.mkdir(parents=True, exist_ok=True)
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)

    media_dir = EXTRACTED / "word/media"
    questions = []
    for i, img_name in enumerate(images, start=1):
        src = media_dir / img_name
        dest_name = f"q{i:03d}.png"
        shutil.copy2(src, OUT_IMAGES / dest_name)
        questions.append({"id": i, "image": f"images/{dest_name}", "source": img_name})

    OUT_JSON.write_text(
        json.dumps({"total": len(questions), "questions": questions}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Built {len(questions)} questions → {OUT_JSON}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
