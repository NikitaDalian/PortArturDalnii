"""Нарезает фото под реальные пропорции сайта: public/img/p/{id}-{ratio}.webp.
Порядок: исходник -> срез полей скана (чёрные и белые рамки) -> тон (tone.json) -> кадр или вписывание -> водяной знак на готовом кадре.
Кадр: портреты — детектор лиц (Haar, scripts/haarcascade_*.xml), лицо в верхней трети, макушка не режется;
виды — точка фокуса из focus.json; карты, планы, документы, обложки, групповые и всё с fit=contain — вписываются на размытый фон.
Ручные правки в focus.json: "crop":[l,t,r,b] (доли, рамка до подгонки), "face":[cx,cy,h] (доли, если детектор промахнулся),
"mode":"cover"|"fit" (принудительный режим), "ty": доля высоты окна для центра лица (по умолчанию .36).
Снимки из открытых архивов (id >= 300) берутся из work/archive_finds с рамкой обрезки из scripts/archive_src.json (scripts/archive_lib.py); для них всегда делаются все четыре пропорции.
Запуск из папки site:  python scripts/build_crops.py [id id ...] [--all]  (без аргументов — все фото, но только нужные сайту варианты; --all — все четыре пропорции)
"""
import json, re, sys
import numpy as np
import cv2
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import archive_lib as AL
SRC = ROOT.parent / 'TGArchive' / 'photos'
OUT = ROOT / 'public' / 'img' / 'p'
FONT = 'C:/Windows/Fonts/segoeuisl.ttf'
MARK = 'Портъ-Артуръ и Дальнiй · t.me/portartur_dalnii'
NO_MARK_KINDS = {'book-cover', 'other'}
RATIOS = {'3x2': (960, 640), '4x5': (640, 800), '16x9': (1280, 720), '1x1': (640, 640)}
FIT_KINDS = {'book-cover', 'map', 'plan', 'document', 'poster', 'comic', 'other', 'drawing'}

TONE = json.loads((ROOT / 'scripts' / 'tone.json').read_text(encoding='utf-8'))
FOCUS = json.loads((ROOT / 'src' / 'data' / 'focus.json').read_text(encoding='utf-8'))
PH = json.loads((ROOT / 'src' / 'data' / 'photos.json').read_text(encoding='utf-8'))
FACE = cv2.CascadeClassifier(str(ROOT / 'scripts' / 'haarcascade_frontalface_default.xml'))
PROF = cv2.CascadeClassifier(str(ROOT / 'scripts' / 'haarcascade_profileface.xml'))


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


def tone(im, cfg):
    a = np.asarray(im).astype(np.float32)
    luma = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    if cfg.get('levels'):
        lo, hi = np.percentile(luma, [0.5, 99.5])
        if hi - lo > 40:
            a = np.clip((a - lo) / (hi - lo) * 255, 0, 255)
            luma = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    if 'desat' in cfg:
        a = luma[..., None] + (a - luma[..., None]) * cfg['desat']
    if cfg.get('cool'):
        a[..., 0] *= 0.985
        a[..., 2] *= 1.025
    if 'gamma' in cfg:
        a = 255 * (np.clip(a, 0, 255) / 255) ** cfg['gamma']
    if 'contrast' in cfg:
        m = float(luma.mean())
        a = (a - m) * cfg['contrast'] + m
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def trim_margins(im, cap=0.14):
    """Срезает однотонные чёрные или белые поля по краям (рамки сканов). Не больше cap с каждой стороны."""
    g = np.asarray(im.convert('L')).astype(np.float32)
    h, w = g.shape

    def uniform(line):
        m, s = line.mean(), line.std()
        return s < 14 and (m < 28 or m > 238)

    t = 0
    while t < h * cap and uniform(g[t]):
        t += 1
    b = 0
    while b < h * cap and uniform(g[h - 1 - b]):
        b += 1
    l = 0
    while l < w * cap and uniform(g[:, l]):
        l += 1
    r = 0
    while r < w * cap and uniform(g[:, w - 1 - r]):
        r += 1
    # небольшой запас внутрь, чтобы не осталась тонкая линия
    pad = lambda v: v + 2 if v else 0
    t, b, l, r = pad(t), pad(b), pad(l), pad(r)
    if t + b + l + r == 0:
        return im
    return im.crop((l, t, w - r, h - b))


def find_face(im):
    """Самое крупное лицо: (cx, cy, h) в долях кадра или None."""
    g = np.asarray(im.convert('L'))
    h, w = g.shape
    sc = 640 / max(w, h) if max(w, h) > 640 else 1
    if sc != 1:
        g = cv2.resize(g, (int(w * sc), int(h * sc)))
    g = cv2.equalizeHist(g)
    gh, gw = g.shape
    ms = max(24, int(gw * 0.07))
    best, bw = None, 0
    for casc, flip in ((FACE, False), (PROF, False), (PROF, True)):
        src = cv2.flip(g, 1) if flip else g
        rs, _, ws = casc.detectMultiScale3(src, scaleFactor=1.08, minNeighbors=5 if casc is FACE else 6, minSize=(ms, ms), outputRejectLevels=True)
        for (x, y, fw, fh), wt in zip(rs, ws):
            if flip:
                x = gw - x - fw
            if (y + fh / 2) / gh > 0.62:  # лицо в нижней трети кадра — почти наверняка ложное срабатывание
                continue
            score = float(wt) * (fw * fh) ** 0.5
            if best is None or score > bw:
                best, bw = (x, y, fw, fh), score
        if best is not None and casc is FACE:
            break
    if best is None:
        return None
    x, y, fw, fh = best
    return ((x + fw / 2) / gw, (y + fh / 2) / gh, fh / gh)


def fit_blur(im, tw, th):
    w, h = im.size
    s = max(tw / w, th / h)
    bg = im.resize((max(tw, round(w * s)), max(th, round(h * s))), Image.LANCZOS)
    bx, by = (bg.width - tw) // 2, (bg.height - th) // 2
    bg = bg.crop((bx, by, bx + tw, by + th)).filter(ImageFilter.GaussianBlur(max(tw, th) / 28))
    bg = Image.eval(bg, lambda v: int(v * 0.5 + 8))
    s = min(tw / w, th / h)
    fg = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    bg.paste(fg, ((tw - fg.width) // 2, (th - fg.height) // 2))
    return bg


def window(w, h, tw, th, cx, cy, face=None, ty=0.36):
    """Самое большое окно пропорции tw:th внутри w×h; центр по (cx,cy) в долях, либо лицо на высоте ty окна."""
    ar = tw / th
    ww, wh = (w, w / ar) if w / h <= ar else (h * ar, h)
    if face:
        fcx, fcy, fh = face
        x0 = fcx * w - ww / 2
        y0 = fcy * h - ty * wh
        y0 = min(y0, (fcy - fh * 0.85) * h)  # макушка с запасом остаётся в кадре
    else:
        x0 = cx * w - ww / 2
        y0 = cy * h - wh / 2
        # object-position: доля свободного поля, как в CSS
        x0 = (w - ww) * cx
        y0 = (h - wh) * cy
    x0 = min(max(0, x0), w - ww)
    y0 = min(max(0, y0), h - wh)
    return (round(x0), round(y0), round(x0 + ww), round(y0 + wh))


def render(pid, meta, src_im):
    f = FOCUS.get(pid, {'x': 50, 'y': 50, 'fit': 'cover'})
    kind = meta['kind']
    im = src_im
    tc = TONE.get(pid, {})
    if 'crop' in tc:  # вырезка страницы альбома (как в build_images.py)
        w, h = im.size
        l, t, r, b = tc['crop']
        im = im.crop((int(l * w), int(t * h), int(r * w), int(b * h)))
    if kind not in ('book-cover', 'portrait') or pid in ('87',):
        im = trim_margins(im)
    if 'crop' in f:
        w, h = im.size
        l, t, r, b = f['crop']
        im = im.crop((int(l * w), int(t * h), int(r * w), int(b * h)))
    if pid in TONE:
        im = tone(im, TONE[pid])
    fit_mode = f.get('mode') == 'fit' or (f.get('mode') != 'cover' and (f['fit'] == 'contain' or kind in FIT_KINDS))
    face = None
    if not fit_mode and 'face' in f:
        face = tuple(f['face'])
    elif not fit_mode and kind == 'portrait':
        face = find_face(im)
    res = {}
    w, h = im.size
    for name, (tw, th) in RATIOS.items():
        ar_src, ar_t = w / h, tw / th
        # узкий кадр лица в широкую рамку: подбородок всё равно срежется, поэтому вписываем целиком
        tight = bool(face) and ar_t > 1.2 and ar_src < ar_t * 0.7 and face[2] * h / (w / ar_t) > 0.5
        if tight or (fit_mode and abs(ar_src - ar_t) / ar_t > 0.1):
            out = fit_blur(im, tw, th)
        else:
            box = window(w, h, tw, th, f['x'] / 100, f['y'] / 100, face, f.get('ty', 0.36))
            out = im.crop(box).resize((tw, th), Image.LANCZOS)
        if kind not in NO_MARK_KINDS:
            out = watermark(out)
        res[name] = out
    return res, (face is not None, fit_mode)


def used_variants():
    """(id, ratio), которые реально запрашивает сайт; остальные варианты не сохраняем (экономия места)."""
    D = lambda n: json.loads((ROOT / 'src' / 'data' / n).read_text(encoding='utf-8'))
    pid = lambda f: re.search(r'photo_(\d+)@', f).group(1) if f and re.search(r'photo_(\d+)@', f) else None
    arts, people, places, books, sources, routes = D('articles.json'), D('people.json'), D('places.json'), D('books.json'), D('sources.json'), D('routes.json')
    u = set()
    for a in arts:
        for f in a['photos']:
            u.add((pid(f), '3x2'))
        u.add((pid(a['cover']), '3x2'))
        u.add((pid(a['cover']), '16x9'))
    for x in people:
        u.add((pid(x.get('portrait')), '4x5'))
    for x in books:
        u.add((pid(x.get('cover')), '4x5'))
    for x in sources:
        u.add((pid(x.get('image')), '3x2'))
    for x in places:
        for i, f in enumerate(x.get('photos') or []):
            u.add((pid(f), '3x2'))
            if i == 0:
                u |= {(pid(f), '16x9'), (pid(f), '1x1')}
    for x in routes:
        for f in (x.get('photos') or []) + [x.get('cover')]:
            if isinstance(f, str):
                u |= {(pid(f), '3x2'), (pid(f), '16x9')}
    u |= {('68', '3x2'), ('68', '1x1')}
    for p in PH:  # снимки из архивов: все четыре пропорции
        m = re.search(r'photo_(\d+)@archive', p['file'])
        if m and AL.built(m.group(1)):
            u |= {(m.group(1), r) for r in RATIOS}
    return {t for t in u if t[0]}


def main():
    only = set(a for a in sys.argv[1:] if a != '--all')
    keep = None if '--all' in sys.argv else used_variants()
    stats = {'face': 0, 'fit': 0, 'cover': 0, 'noface_portrait': []}
    for p in PH:
        m = re.search(r'photo_(\d+)@', p['file'])
        pid = m.group(1)
        if only and pid not in only:
            continue
        if '@archive' in p['file']:
            if not AL.built(pid):
                continue
            im = AL.load(pid)
        else:
            srcs = list(SRC.glob(f'photo_{pid}@*.jpg'))
            srcs = [s for s in srcs if not s.name.endswith('_thumb.jpg')]
            if not srcs:
                continue
            im = Image.open(srcs[0]).convert('RGB')
        res, (has_face, fit_mode) = render(pid, p, im)
        for name, out in res.items():
            if keep is not None and (pid, name) not in keep:
                (OUT / f'{pid}-{name}.webp').unlink(missing_ok=True)
                continue
            out.save(OUT / f'{pid}-{name}.webp', 'WEBP', quality=80, method=5)
        if fit_mode:
            stats['fit'] += 1
        elif has_face:
            stats['face'] += 1
        else:
            stats['cover'] += 1
            if p['kind'] == 'portrait':
                stats['noface_portrait'].append(pid)
    print(stats)


if __name__ == '__main__':
    main()
