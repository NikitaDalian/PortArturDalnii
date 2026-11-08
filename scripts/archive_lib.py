"""Общее для build_images.py, build_crops.py и build_focus.py: снимки из открытых архивов (id >= 300).
Источники лежат в ../work/archive_finds, настройки каждого снимка (файл, рамка обрезки, фокус) — в scripts/archive_src.json.
Недоверенные файлы открываются только как изображения (PIL)."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ARCH_DIR = ROOT.parent / 'work' / 'archive_finds'
CFG = json.loads((ROOT / 'scripts' / 'archive_src.json').read_text(encoding='utf-8'))
Image.MAX_IMAGE_PIXELS = 120_000_000


def is_archive(pid) -> bool:
    return str(pid) in CFG


def built(pid) -> bool:
    """Есть ли у снимка WebP на сайте (unused: запись в каталоге есть, на сайте не показывается)."""
    return is_archive(pid) and not CFG[str(pid)].get('unused')


def load(pid) -> Image.Image:
    """Источник с рамкой обрезки (доли листа: стереопара — левый кадр, лист альбома — снимок без полей)."""
    c = CFG[str(pid)]
    im = Image.open(ARCH_DIR / c['src']).convert('RGB')
    if c.get('crop'):
        w, h = im.size
        l, t, r, b = c['crop']
        im = im.crop((round(l * w), round(t * h), round(r * w), round(b * h)))
    return im


def cap(pid, kind) -> int:
    """Длинная сторона полного WebP: карты и планы крупнее, чтобы читались подписи."""
    return CFG[str(pid)].get('cap') or (2400 if kind in ('map', 'plan') else 2000)
