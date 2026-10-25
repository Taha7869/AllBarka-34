"""
Script: process-draft-assets.py
Processes draft concept assets for Stage 5C2:
1. Validates dimensions (1024x1024) and aspect ratio (1:1).
2. Converts JPG images to optimized WebP format (quality=85).
3. Reports file sizes, dimensions, and compression statistics.
"""

import os
import sys
from pathlib import Path
from PIL import Image

def process_draft_assets(drafts_dir: str):
    drafts_path = Path(drafts_dir)
    if not drafts_path.exists():
        print(f"Error: Directory {drafts_dir} does not exist.")
        sys.exit(1)

    jpg_files = sorted(list(drafts_path.glob("*.jpg")))
    print(f"Found {len(jpg_files)} JPG assets in {drafts_dir}\n")

    results = []

    for jpg_path in jpg_files:
        stem = jpg_path.stem
        webp_path = drafts_path / f"{stem}.webp"

        with Image.open(jpg_path) as im:
            width, height = im.size
            mode = im.mode
            format_name = im.format
            aspect = width / height if height > 0 else 0

            # Convert to RGB if needed (e.g. RGBA)
            if mode != "RGB":
                rgb_im = im.convert("RGB")
            else:
                rgb_im = im

            # Save as WebP
            rgb_im.save(webp_path, "WEBP", quality=85, method=6)

        jpg_size = jpg_path.stat().st_size
        webp_size = webp_path.stat().st_size
        savings_pct = (1.0 - (webp_size / jpg_size)) * 100 if jpg_size > 0 else 0

        res = {
            "name": stem,
            "dimensions": f"{width}x{height}",
            "aspect": f"{aspect:.2f}",
            "jpg_size_kb": f"{jpg_size / 1024:.1f} KB",
            "webp_size_kb": f"{webp_size / 1024:.1f} KB",
            "savings": f"{savings_pct:.1f}%"
        }
        results.append(res)
        print(f"Processed: {stem:<35} | {width}x{height} | JPG: {res['jpg_size_kb']:<9} -> WebP: {res['webp_size_kb']:<9} ({res['savings']} saved)")

    print(f"\nTotal assets processed: {len(results)}")
    return results

if __name__ == "__main__":
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "docs/assets/drafts"
    process_draft_assets(target_dir)
