import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / "media"
OUTPUT = ROOT / "data" / "media.json"

EXTENSIONS = {
    "images": {".jpg", ".jpeg", ".png", ".webp", ".gif"},
    "videos": {".mp4", ".webm", ".mov"}
}

items = []

for category, extensions in EXTENSIONS.items():
    for safety in ("sfw", "nsfw"):
        folder = MEDIA / category / safety

        if not folder.exists():
            continue

        for file in folder.iterdir():
            if file.is_file() and file.suffix.lower() in extensions:
                items.append({
                    "src": file.relative_to(ROOT).as_posix(),
                    "name": file.name,
                    "type": "image" if category == "images" else "video",
                    "safety": safety
                })

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(items, indent=2), encoding="utf-8")

print(f"Generated {len(items)} media entries.")

# python scripts/generate_media.py