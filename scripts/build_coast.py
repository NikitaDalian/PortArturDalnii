"""Готовит разделитель-сопки из сгенерированной полосы (папка 27_razdelitel_sopki).

Что делает:
  1. находит в картинке полосу сопок (всё ниже плоского тёмно-синего неба) и обрезает лишнее небо;
  2. ближний ряд (ледяно-белый, связанный с нижним краем) делает прозрачным — сайт подкладывает под него
     цвет следующего блока, поэтому стык всегда чистый;
  3. сохраняет public/img/gen/coast-hills.webp и coast-hills-1280.webp (с прозрачностью).

Запуск из папки site:  python scripts/build_coast.py [путь/к/картинке.png]
По умолчанию берёт первый coast-hills*.png из ../work/generation/27_razdelitel_sopki/
"""
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT.parent / 'work' / 'generation' / '27_razdelitel_sopki'
OUT = ROOT / 'public' / 'img' / 'gen'
NAVY = (11, 34, 56)
ICE = (244, 247, 248)


def closeness(img, color):
    """Максимальное отклонение по каналам от заданного цвета (0 — совпало)."""
    out = None
    for ch, c in zip(img.split(), color):
        d = ImageChops.difference(ch, Image.new('L', img.size, c))
        out = d if out is None else ImageChops.lighter(out, d)
    return out


def main(path: Path):
    im = Image.open(path).convert('RGB')
    w, h = im.size

    # 1. полоса сопок: первая строка, где есть не-«небо»
    not_sky = closeness(im, NAVY).point(lambda v: 255 if v > 26 else 0)
    box = not_sky.getbbox()
    if not box:
        raise SystemExit('Не нашёл сопок: картинка целиком тёмно-синяя')
    top = max(0, box[1] - int(h * 0.04))
    im = im.crop((0, top, w, h))
    w, h = im.size

    # 2. ближний ряд → прозрачность
    cand = closeness(im, ICE).point(lambda v: 255 if v < 30 else 0)
    for x in range(0, w, 40):
        if cand.getpixel((x, h - 1)) == 255:
            ImageDraw.floodfill(cand, (x, h - 1), 128)
    front = cand.point(lambda v: 255 if v == 128 else 0)
    front = front.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    alpha = ImageChops.invert(front)
    rgba = im.convert('RGBA')
    rgba.putalpha(alpha)

    # 3. сохранить
    OUT.mkdir(parents=True, exist_ok=True)
    big = rgba.copy()
    if big.width > 2560:
        big = big.resize((2560, round(big.height * 2560 / big.width)), Image.LANCZOS)
    big.save(OUT / 'coast-hills.webp', 'WEBP', quality=90, method=6)
    small = rgba.resize((1280, round(rgba.height * 1280 / rgba.width)), Image.LANCZOS)
    small.save(OUT / 'coast-hills-1280.webp', 'WEBP', quality=88, method=6)
    print(f'coast-hills: {big.size}, полоса {box[1]}–{h + top}px, прозрачность {front.getbbox() is not None}')


if __name__ == '__main__':
    if len(sys.argv) > 1:
        p = Path(sys.argv[1])
    else:
        found = sorted(SRC_DIR.glob('coast-hills*.png'))
        if not found:
            raise SystemExit('Нет файла coast-hills*.png в ' + str(SRC_DIR))
        p = found[0]
    main(p)
