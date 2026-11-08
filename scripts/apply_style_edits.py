"""Применяет патчи редактуры из ../work/style_edits/*.json к исходным данным.

Формат патча: { "<slug или ключ>": { "<поле>": "новый текст", ... } }
Для routes поле stops — список {"note": ...} по порядку остановок.
После применения запускается scripts/build_data.py (кроме layers, который лежит прямо в src/data).

Запуск из папки site:  python scripts/apply_style_edits.py [тип ...]
Без аргументов применяет всё, что есть. Безопасно повторять.
"""
import json, sys, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent / 'work'
EDITS = WORK / 'style_edits'

# тип патча → (файл с данными, ключ записи)
TARGETS = {
    'articles': (WORK / 'articles.json', 'slug'),
    'people': (WORK / 'people.json', 'slug'),
    'books': (WORK / 'books.json', 'slug'),
    'sources': (WORK / 'sources.json', 'slug'),
    'routes': (WORK / 'routes.json', 'slug'),
    'places': (WORK / 'places.json', 'slug'),
}
LAYERS = ROOT / 'src' / 'data' / 'layers.json'


def load(p):
    return json.loads(p.read_text(encoding='utf-8'))


def save(p, data):
    p.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')


def apply_list(kind, data, patch, key):
    changed = 0
    by = {x[key]: x for x in data}
    for slug, fields in patch.items():
        rec = by.get(slug)
        if rec is None:
            print(f'  ! {kind}: нет записи {slug}')
            continue
        for f, v in fields.items():
            if f == 'stops' and isinstance(v, list):
                for i, st in enumerate(v):
                    if i < len(rec.get('stops', [])) and isinstance(st, dict) and 'note' in st and rec['stops'][i].get('note') != st['note']:
                        rec['stops'][i]['note'] = st['note']; changed += 1
            elif rec.get(f) != v:
                rec[f] = v; changed += 1
    return changed


def main(kinds):
    total = 0
    needs_build = False
    for kind in kinds:
        p = EDITS / f'{kind}.json'
        if not p.exists():
            print(f'- {kind}: патча нет'); continue
        try:
            patch = load(p)
        except Exception as e:
            print(f'- {kind}: патч не читается ({e})'); continue
        if kind == 'layers':
            data = load(LAYERS); n = 0
            for k, fields in patch.items():
                for f, v in fields.items():
                    if k in data and data[k].get(f) != v:
                        data[k][f] = v; n += 1
            save(LAYERS, data)
        else:
            path, key = TARGETS[kind]
            data = load(path)
            n = apply_list(kind, data, patch, key)
            save(path, data); needs_build = True
        print(f'- {kind}: изменено полей {n}'); total += n
    if needs_build:
        subprocess.run([sys.executable, str(ROOT / 'scripts' / 'build_data.py')], check=True, stdout=subprocess.DEVNULL)
    print('готово, всего изменений:', total)


if __name__ == '__main__':
    main(sys.argv[1:] or ['articles', 'people', 'books', 'sources', 'routes', 'places', 'layers'])
