"""Resize + WebP-encode the AI-generated held-item photos. No cropping tricks, no compositing.

Input : public/images/held-ai-20261120/raw/<id>.png (or .jpg/.jpeg/.webp)
Output: public/images/held-ai-20261120/<id>.webp  (1200x1200, < 200 KB)
Usage : python scripts/encode-held-ai-images.py [id ...]   (default: every raw file)
"""
import os
import sys
from PIL import Image

ROOT = os.path.join("public", "images", "held-ai-20261120")
RAW = os.path.join(ROOT, "raw")
LIMIT = 200 * 1024 - 2048


def encode(path: str) -> None:
    pid = os.path.splitext(os.path.basename(path))[0]
    img = Image.open(path).convert("RGB")
    w, h = img.size
    side = min(w, h)  # square centre crop only if the model returned a non-square frame
    left, top = (w - side) // 2, (h - side) // 2
    img = img.crop((left, top, left + side, top + side)).resize((1200, 1200), Image.LANCZOS)
    out = os.path.join(ROOT, pid + ".webp")
    for q in range(84, 40, -4):
        img.save(out, "WEBP", quality=q, method=6)
        if os.path.getsize(out) <= LIMIT:
            break
    print(f"{pid}: {os.path.getsize(out) // 1024} KB (q={q}, source {w}x{h})")


def main() -> None:
    ids = sys.argv[1:]
    files = sorted(os.listdir(RAW))
    for f in files:
        pid, ext = os.path.splitext(f)
        if ext.lower() in (".png", ".jpg", ".jpeg", ".webp") and (not ids or pid in ids):
            encode(os.path.join(RAW, f))


main()
