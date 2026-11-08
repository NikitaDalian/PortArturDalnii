"""Забирает готовые иллюстрации из ../work/generation/*/ и кладёт WebP в public/img/gen/.

Имя результата берётся из файла (hero-home.png → hero-home.webp, hero-home-1280.webp).
Запуск из папки site:  python scripts/build_gen.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parent / 'work' / 'generation'
OUT = ROOT / 'public' / 'img' / 'gen'
OUT.mkdir(parents=True, exist_ok=True)

done = []
for f in sorted(SRC.glob('*/*')):
    if f.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp'} or f.name.startswith('reference_'):
        continue
    if f.stem.startswith('coast-'):   # разделитель с прозрачностью делает build_coast.py
        continue
    im = Image.open(f).convert('RGB')
    w = im.width
    full = im.copy()
    full.thumbnail((2560, 2560))
    full.save(OUT / f'{f.stem}.webp', 'WEBP', quality=84, method=6)
    for size in (1280, 720):
        if w > size:
            s = im.copy()
            s.thumbnail((size, size * 2))
            s.save(OUT / f'{f.stem}-{size}.webp', 'WEBP', quality=82, method=6)
    done.append(f.stem)
print('illustrations:', done)
