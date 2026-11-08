"""Сводит данные из ../work/*.json в src/data/*.json с едиными слагами.

Запуск из папки site:  python scripts/build_data.py
"""
import json, difflib, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent / 'work'
OUT = ROOT / 'src' / 'data'
OUT.mkdir(parents=True, exist_ok=True)

L = lambda n: json.loads((WORK / n).read_text(encoding='utf-8'))
articles, people, places, books, sources = L('articles.json'), L('people.json'), L('places.json'), L('books.json'), L('sources.json')
routes, seasons, photos, tax = L('routes.json'), L('seasons.json'), L('photos.json'), L('taxonomy.json')

# ---------- люди ----------
PEOPLE_MAP = {
    'artur-uilyam': 'artur', 'myulberg-mihail': 'myulberg', 'prokudin-gorskii': 'prokudin-gorsky',
    'saharov-vv': 'saharov', 'skolimovskii': 'skolimovsky', 'tolstoi': 'tolstoy',
}
people_slugs = {p['slug'] for p in people}
# прочие имена (без своей страницы) — для указателя
other_people = {}
for e in tax['people']:
    s = PEOPLE_MAP.get(e['slug'], e['slug'])
    if s not in people_slugs:
        other_people[s] = re.sub(r'\s*\((историк|инженер[^)]*)\)', '', e['name']).strip()

# ---------- места ----------
PLACE_MAP = {
    'elektricheskii-utes': 'elektricheskiy-utes', 'gora-vysokaya': 'vysokaya-gora', 'nagasaki': 'nagasaki-goshinji',
    'port-arthur': 'port-artur', 'dalny': 'dalnii', 'kwantung': 'kvantun',
}
place_slugs = {p['slug'] for p in places}
geo_terms = {}  # регионы и города без точки на карте
for e in tax['places']:
    s = PLACE_MAP.get(e['slug'], e['slug'])
    if s not in place_slugs:
        geo_terms[s] = e['name']
for extra, name in {'dalnii': 'Дальний (Дайрен, Далянь)', 'port-artur': 'Порт-Артур (Люйшунь, Рёдзюн)', 'kvantun': 'Квантунская область',
                    'lyaoyan': 'Ляоян', 'mukden': 'Мукден (Шэньян)', 'shahe': 'Река Шахэ', 'vafangou': 'Вафангоу (Вафандянь)',
                    'vladivostok': 'Владивосток', 'yalu': 'Река Ялу'}.items():
    geo_terms.setdefault(extra, name)

def norm_place(s):
    return PLACE_MAP.get(s, s)

# ---------- книги и источники ----------
lib = {b['slug']: 'book' for b in books}
lib.update({s['slug']: 'source' for s in sources})
BOOK_MANUAL = {
    'albom-shtaba-1905': 'albom-russko-yaponskaya-voyna-shtab-1905', 'albom-17-korpusa': 'albom-boevoy-zhizni-xvii-korpusa',
    'nitiro-senyeki-syasintyo': 'nitiro-senyeki-syasincho', 'tolstoi-odumaites': 'tolstoy-odumaytes',
    'nikolaev-chistyakov-port-artur': 'nikolaev-chistyakov-port-artur-arhivnyy-poisk', 'balmont-pesni-mstitelya': 'balmont-nash-tsar',
    'kotvich-lyaodun': 'kotvich-borodovskiy-lyao-dun-i-ego-porty',
    'lilie-dnevnik': 'lilye-dnevnik-osady-port-artura', 'menshikov-pisma': 'menshikov-pisma-k-blizhnim-1902-1904',
    'panishchev-krizis': 'panishchev-krizis-nravstvennogo-soznaniya',
    'shevchenko-anekdoty': 'shevchenko-anekdoty-rossiyskoy-imperii-russko-yaponskaya-voyna',
}
BOOK_NONE = {'lenin-padenie-port-artura', 'egorev-operatsii', 'hodyakov-zheltorossiya'}
book_map, unmatched_books = {}, {}
book_titles = {e['slug']: e['name'] for e in tax['books']}
for e in tax['books']:
    s = e['slug']
    if s in lib:
        book_map[s] = s; continue
    if s in BOOK_NONE:
        unmatched_books[s] = e['name']; continue
    if s in BOOK_MANUAL:
        book_map[s] = BOOK_MANUAL[s]; continue
    cand = difflib.get_close_matches(s, list(lib), n=1, cutoff=0.6)
    if cand:
        book_map[s] = cand[0]
    else:
        unmatched_books[s] = e['name']

# ---------- статьи ----------
TYPE_RU = {'event': 'События', 'person': 'Лица', 'book': 'Книги', 'place': 'Места', 'source': 'Источники',
           'explainer': 'Пояснения', 'culture': 'Культура', 'memory': 'Память'}
for a in articles:
    a['people'] = [PEOPLE_MAP.get(s, s) for s in a['people']]
    a['places'] = [norm_place(s) for s in a['places']]
    a['books'] = [book_map.get(s, s) for s in a['books']]
    a['layer'] = a['layer'] if isinstance(a['layer'], list) else [a['layer']]
    a['tg_url'] = f"https://t.me/portartur_dalnii/{a['tg_ids'][0]}"
for p in people:
    p['places'] = [norm_place(s) for s in p['places']]

# обратные связи: какие статьи ссылаются на сущность
def backrefs(field):
    m = {}
    for a in articles:
        for s in a[field]:
            m.setdefault(s, []).append(a['slug'])
    return m
art_by_person, art_by_place, art_by_book = backrefs('people'), backrefs('places'), backrefs('books')
# посты → статьи (для people.posts / books.review_post / places.posts, где хранятся tg id)
tg2art = {i: a['slug'] for a in articles for i in a['tg_ids']}
for coll, key in ((people, 'posts'), (places, 'posts'), (books, 'review_post'), (sources, 'posts')):
    for x in coll:
        arts = {tg2art[i] for i in (x.get(key) or []) if i in tg2art}
        arts |= set((art_by_person if coll is people else art_by_place if coll is places else art_by_book).get(x['slug'], []))
        x['articles'] = sorted(arts, key=lambda s: next(a['date'] for a in articles if a['slug'] == s))

# серии
series = {}
for a in articles:
    if a.get('series'):
        series.setdefault(a['series'], []).append(a['slug'])
def slugify(s):
    tr = dict(zip('абвгдеёжзийклмнопрстуфхцчшщъыьэюя', ['a','b','v','g','d','e','e','zh','z','i','y','k','l','m','n','o','p','r','s','t','u','f','h','ts','ch','sh','sch','','y','','e','yu','ya']))
    s = ''.join(tr.get(c, c) for c in s.lower())
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:60]
series_list = [{'slug': slugify(k), 'title': k, 'articles': v} for k, v in series.items()]
for a in articles:
    a['series_slug'] = slugify(a['series']) if a.get('series') else None

def dump(name, obj):
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding='utf-8')

dump('articles.json', sorted(articles, key=lambda a: a['date'], reverse=True))
dump('people.json', people)
dump('places.json', places)
dump('books.json', books)
dump('sources.json', sources)
dump('routes.json', routes)
dump('seasons.json', seasons)
dump('series.json', series_list)
dump('photos.json', photos)
dump('index_terms.json', {'people': other_people, 'geo': geo_terms, 'books_unmatched': unmatched_books})

print('articles', len(articles), 'series', len(series_list))
print('book map:', {k: v for k, v in book_map.items() if k != v})
print('unmatched books:', unmatched_books)
print('articles with place slugs not on map:', sorted({s for a in articles for s in a['places'] if s not in place_slugs}))
