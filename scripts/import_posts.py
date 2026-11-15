"""Import a reviewed Telegram batch without reusing its local photo numbers.

Usage: python scripts/import_posts.py ../08.11-15.11_posts scripts/imports/2026-11-15.json
The manifest contains editorial metadata; the export remains outside the repository.
Originals are copied into ../TGArchive/photos for the existing image pipeline.
Requires Pillow (already used by the project); no face detection dependency.
"""
import argparse
import hashlib
import json
import math
import re
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent / 'work'
DATA = ROOT / 'src/data'
OUT = ROOT / 'public/img/p'
RATIOS = {'3x2': (960, 640), '4x5': (640, 800), '16x9': (1280, 720), '1x1': (640, 640)}


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=1), encoding='utf-8')


def text(message):
    value = message.get('text', '')
    return value if isinstance(value, str) else ''.join(x if isinstance(x, str) else x['text'] for x in value)


def watermark(im, font_path):
    size = max(11, int(im.width * .016))
    font = ImageFont.truetype(str(font_path), size)
    label = 'Портъ-Артуръ и Дальнiй · t.me/portartur_dalnii' if im.width >= 520 else 't.me/portartur_dalnii'
    layer = Image.new('RGBA', im.size)
    draw = ImageDraw.Draw(layer)
    box = draw.textbbox((0, 0), label, font=font)
    x = im.width - (box[2] - box[0]) - int(size * 1.2)
    y = im.height - (box[3] - box[1]) - int(size * 1.2)
    draw.text((x + 1, y + 1), label, font=font, fill=(0, 0, 0, 110))
    draw.text((x, y), label, font=font, fill=(255, 255, 255, 190))
    return Image.alpha_composite(im.convert('RGBA'), layer).convert('RGB')


def fit_frame(im, size):
    # Keep captions, book covers, maps, paintings and faces intact.
    bg = ImageOps.fit(im, size).filter(ImageFilter.GaussianBlur(24))
    fg = ImageOps.contain(im, size, Image.Resampling.LANCZOS)
    bg.paste(fg, ((size[0] - fg.width) // 2, (size[1] - fg.height) // 2))
    return bg


def used_variants():
    used = set()
    def add(file, *ratios):
        if file:
            match = re.search(r'photo_(\d+)@', file)
            if match:
                used.update((match[1], ratio) for ratio in ratios)
    for a in read(DATA / 'articles.json'):
        for file in a['photos']:
            add(file, '3x2')
        add(a['cover'], '3x2', '16x9')
    for name, field in [('people', 'portrait'), ('books', 'cover')]:
        for item in read(DATA / f'{name}.json'):
            add(item.get(field), '4x5')
    for item in read(DATA / 'sources.json'):
        add(item.get('image'), '3x2')
    for item in read(DATA / 'places.json'):
        for i, file in enumerate(item.get('photos') or []):
            add(file, '3x2')
            if i == 0:
                add(file, '16x9', '1x1')
    return used


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('--font', type=Path, default=Path('C:/Windows/Fonts/segoeuisl.ttf'))
    args = parser.parse_args()
    export, manifest = read(args.archive / 'result.json'), read(args.manifest)
    if export['id'] != manifest['channel_id']:
        raise ValueError('Unexpected Telegram channel')
    if not args.font.is_file():
        raise FileNotFoundError('Pass an installed Cyrillic font with --font')

    groups, head = {}, None
    for message in export['messages']:
        if message.get('type') != 'message':
            continue
        if text(message).strip():
            head = message['id']
            groups[head] = {'message': message, 'photos': []}
        if message.get('photo'):
            if head is None:
                raise ValueError('Photo album has no caption')
            groups[head]['photos'].append(message)

    expected = set(manifest['existing_posts']) | {a['post_id'] for a in manifest['articles']}
    if expected != set(groups):
        raise ValueError(f'Unreviewed/missing captions: {expected ^ set(groups)}')
    photos = read(WORK / 'photos.json')
    by_pid = {int(re.search(r'photo_(\d+)@', p['file'])[1]): p['file'] for p in photos}
    descriptors = {p['source_number']: p for p in manifest['photos']}
    photo_messages = {int(re.search(r'photo_(\d+)@', m['photo'])[1]): (pid, m)
                      for pid, group in groups.items() if pid not in manifest['existing_posts']
                      for m in group['photos']}
    if set(descriptors) != set(photo_messages):
        raise ValueError('Every new photo needs reviewed metadata')
    paths, prepared = {}, []
    for number, meta in descriptors.items():
        post_id, message = photo_messages[number]
        source = (args.archive / message['photo']).resolve()
        if not source.is_relative_to(args.archive.resolve()):
            raise ValueError('Photo escapes archive directory')
        file = re.sub(r'photo_\d+@', f"photo_{meta['id']}@", message['photo'])
        if meta['id'] in by_pid and by_pid[meta['id']] != file:
            raise ValueError(f"Photo id collision: {meta['id']}")
        target = ROOT.parent / 'TGArchive' / file
        if target.exists() and hashlib.sha256(target.read_bytes()).digest() != hashlib.sha256(source.read_bytes()).digest():
            raise ValueError(f'Original already exists with different bytes: {target}')
        with Image.open(source) as im:
            w, h = im.size
        paths[number] = file
        prepared.append((source, target, meta, {
            'file': file, 'post_id': post_id, 'w': w, 'h': h,
            'kind': meta['kind'], 'era': meta.get('era', 'russian'),
            'subject': meta['subject'], 'place': meta.get('place'),
            'people': meta.get('people', []), 'quality': meta.get('quality', 4),
            'hero': False, 'crop': 'landscape' if w > h else 'portrait',
            'notes': meta.get('notes', '')
        }))

    def resolve_photos(value):
        if isinstance(value, dict):
            return {k: ([paths[f] if isinstance(f, int) else f for f in v] if k == 'photos'
                        else paths[v] if k in ('cover', 'portrait', 'image') and isinstance(v, int)
                        else resolve_photos(v)) for k, v in value.items()}
        if isinstance(value, list):
            return [resolve_photos(v) for v in value]
        return value

    articles = read(WORK / 'articles.json')
    article_map = {a['slug']: a for a in articles}
    post_map = {i: a['slug'] for a in articles for i in a['tg_ids']}
    for item in manifest['articles']:
        a = resolve_photos(dict(item))
        post_id = a.pop('post_id')
        if post_id in post_map and post_map[post_id] != a['slug']:
            raise ValueError(f'Duplicate post: {post_id}')
        message = groups[post_id]['message']
        a.update(tg_ids=[post_id], date=message['date'][:10],
                 photos=[paths[int(re.search(r'photo_(\d+)@', m['photo'])[1])]
                         for m in groups[post_id]['photos']],
                 read_min=max(1, math.ceil(len(text(message).split()) / 180)))
        if a['slug'] in article_map:
            article_map[a['slug']].update(a)
        else:
            articles.append(a)
    # Editorial series can include existing notes; no URL changes.
    for slug, series in manifest.get('series_assignments', {}).items():
        next(a for a in articles if a['slug'] == slug)['series'] = series

    collections = {'articles': articles}
    for name in ('people', 'places', 'books', 'sources'):
        items = read(WORK / f'{name}.json')
        lookup = {x['slug']: x for x in items}
        for patch in manifest.get(name, []):
            patch = resolve_photos(patch)
            slug = patch['slug']
            if slug in lookup:
                lookup[slug].update(patch)
            else:
                items.append(patch)
                lookup[slug] = patch
        collections[name] = items
    taxonomy = read(WORK / 'taxonomy.json')
    for name, entries in manifest['terms'].items():
        existing = {x['slug']: x for x in taxonomy[name]}
        for slug, label in entries.items():
            if slug in existing:
                existing[slug]['name'] = label
            else:
                taxonomy[name].append({'slug': slug, 'name': label})

    photo_lookup = {p['file']: p for p in photos}
    for _, _, _, photo in prepared:
        if photo['file'] in photo_lookup:
            photo_lookup[photo['file']].update(photo)
        else:
            photos.append(photo)
    collections['photos'] = photos
    # Validate all editorial data and source images before writing the batch.
    for name, items in collections.items():
        write(WORK / f'{name}.json', items)
    write(WORK / 'taxonomy.json', taxonomy)
    for source, target, _, _ in prepared:
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            shutil.copyfile(source, target)
    subprocess.run([sys.executable, str(ROOT / 'scripts/build_data.py')], check=True)

    focus = read(DATA / 'focus.json')
    variants = used_variants()
    OUT.mkdir(parents=True, exist_ok=True)
    for source, _, meta, photo in prepared:
        pid = str(meta['id'])
        focus[pid] = {'x': 50, 'y': 50, 'fit': 'contain', 'note': 'Показывать целиком: импорт ' + manifest['batch']}
        with Image.open(source) as opened:
            im = ImageOps.exif_transpose(opened).convert('RGB')
        mark = photo['kind'] not in ('book-cover', 'other')
        full = im.copy()
        full.thumbnail((2400, 2400) if photo['kind'] in ('map', 'plan') else (2000, 2000))
        if mark:
            full = watermark(full, args.font)
        full.save(OUT / f'{pid}.webp', 'WEBP', quality=82, method=6)
        small = full.copy()
        small.thumbnail((640, 640))
        small.save(OUT / f'{pid}-640.webp', 'WEBP', quality=80, method=6)
        for ratio, size in RATIOS.items():
            if (pid, ratio) not in variants:
                continue
            frame = fit_frame(im, size)
            if mark:
                frame = watermark(frame, args.font)
            frame.save(OUT / f'{pid}-{ratio}.webp', 'WEBP', quality=80, method=5)
    write(DATA / 'focus.json', focus)
    print(f"Imported {len(manifest['articles'])} notes and {len(prepared)} photos ({manifest['batch']})")


if __name__ == '__main__':
    main()
