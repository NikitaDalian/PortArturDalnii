"""Готовит фото для сайта: водяной знак + WebP в двух размерах.

Источник: ../TGArchive/photos/*.jpg и ../Authors/*.jpg
Результат: public/img/p/{id}.webp (до 1280 px) и public/img/p/{id}-640.webp
Запуск из папки site:  python scripts/build_images.py
"""
import json, re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parent / 'TGArchive' / 'photos'
OUT = ROOT / 'public' / 'img' / 'p'
OUT.mkdir(parents=True, exist_ok=True)
FONT = 'C:/Windows/Fonts/segoeuisl.ttf'
MARK = 'Портъ-Артуръ и Дальнiй · t.me/portartur_dalnii'
NO_MARK_KINDS = {'book-cover', 'other'}

kinds = {Path(p['file']).name: p['kind'] for p in json.loads((ROOT / 'src' / 'data' / 'photos.json').read_text(encoding='utf-8'))}

def watermark(im):
    w, h = im.size
    size = max(11, int(w * 0.016))
    font = ImageFont.truetype(FONT, size)
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    text = MARK if w >= 520 else 't.me/portartur_dalnii'
    bb = d.textbbox((0, 0), text, font=font)
    x, y = w - (bb[2] - bb[0]) - int(size * 1.2), h - (bb[3] - bb[1]) - int(size * 1.2)
    d.text((x + 1, y + 1), text, font=font, fill=(0, 0, 0, 110))
    d.text((x, y), text, font=font, fill=(255, 255, 255, 190))
    return Image.alpha_composite(im.convert('RGBA'), layer).convert('RGB')

count = 0
for f in sorted(SRC.glob('photo_*.jpg')):
    if f.name.endswith('_thumb.jpg'):
        continue
    pid = re.match(r'photo_(\d+)@', f.name).group(1)
    im = Image.open(f).convert('RGB')
    if kinds.get(f.name) not in NO_MARK_KINDS:
        im = watermark(im)
    im.save(OUT / f'{pid}.webp', 'WEBP', quality=82, method=6)
    small = im.copy()
    small.thumbnail((640, 640))
    small.save(OUT / f'{pid}-640.webp', 'WEBP', quality=80, method=6)
    count += 1

authors = ROOT / 'public' / 'img' / 'authors'
authors.mkdir(parents=True, exist_ok=True)
for f in (ROOT.parent / 'Authors').glob('*.jpg'):
    Image.open(f).convert('RGB').save(authors / (f.stem.lower() + '.webp'), 'WEBP', quality=85)

print('photos:', count)
