# Правила сборки сайта «Портъ-Артуръ и Дальнiй» (стиль A «Гавань»)

Сайт — библиотека-визитка исторического Даляня/Порт-Артура на Astro 7 (статический, GitHub Pages, base `/PortArturDalnii`). Посты Telegram-канала **не копируем целиком**: на сайте — аннотация, факты, связи и кнопка «Читать в Telegram».

## Визуальные эталоны
Макеты стиля A (читать как HTML, это эталон вида): `C:/Users/NikitaEN/AppData/Local/Temp/claude/C--Users-NikitaEN-Documents-Claude-PortArturDalniiWS/dec81c1f-8f88-43f8-b142-c8ea2e92cf88/scratchpad/design/project/`
- `Main.dc.html` — главная, десктоп; `A-Mobile.dc.html` — главная, телефон;
- `A-Map.dc.html` — карта с карточкой места и галереей; `A-Search.dc.html` — поиск с фильтрами.
Палитра: navy #0B2238, фон #F4F7F8, белые карточки, один красный акцент #E0452B. Шрифт Onest. Плотные тёмные секции чередуются со светлыми; переход тёмной секции в светлую — компонент `<Coast />`.

## Общие файлы (НЕ редактировать; нужна правка — опиши её в финальном отчёте)
- `src/styles/global.css` — все переменные и классы: `.container .section .section--tight .dark .paper .stack .cluster .grid .split .display .h1 .h2 .h3 .lead .eyebrow .eyebrow--accent .meta .muted .prose .quote .link .text-link .section-head .btn .btn--primary .btn--outline .btn--sm .chip .chip-row .tag .card .card__media .card__img .card__title .bw .row-list .row .row__title .panel .panel--frost .crumbs .reveal`.
- `src/lib/data.ts` — данные, типы, `href.*` (адреса всех страниц), `url()`, `img()`, `entity()`, `articlesOf()`, `LAYERS TYPES COUNTRIES GROUPS BOOK_LEVELS`, `fmtDate`, `plural`, `amapUrl`, `yandexUrl`, `wgsToGcj`, `tgPost`.
- `src/i18n/ru.ts` — строки интерфейса (`t`).
- `src/layouts/Base.astro` — `<Base title description image section>`; внутри уже шапка, подвал, переходы между страницами (ClientRouter) и анимация `.reveal`.
- Компоненты `src/components/`: `PageHero` (шапка внутренней страницы с крошками), `Coast`, `ArticleCard` (variant card|row|feature), `PersonRow`, `BookRow`, `PlaceCard`, `Related` (чипы людей/мест/книг), `TgButton`.
- Свои компоненты раздела клади в `src/components/<раздел>/`.
- Добавлено при выравнивании: `Crumbs` (крошки, последний пункт — текущая страница), `Unsure` (пометка «уточняется», `block` — развёрнутая), классы `.page-top/.page-top__inner` (отступы любой тёмной шапки), `.unsure`, `.empty` (пустое состояние фильтра), переменные `--header-h`, `--accent-on-light`, `--accent-hover`, `--warn/--warn-bg`, `--map-bg`. Адреса карты: `href.mapRoute(slug)`, `href.mapPts([...])`, `href.mapBuild()`. Страница-список: `<Base searchable={false}>` (не попадает в Pagefind). Иллюстрации слоёв: `layerArt(key)` из `components/layers/layers.ts`.
- Проверка ссылок, якорей, имён переходов, h1 и alt: `npm run build && npm run check`.

## Адреса страниц (контракт кросс-ссылок)
Только через `href.*` из `data.ts`, никогда не писать `/PortArturDalnii/...` руками и не использовать голые `/путь`:
`/` · `/istoriya/` и `/istoriya/{do-1898|1898-1905|1905-1945|1945-1955|segodnya}/` · `/lica/` и `/lica/{slug}/` · `/biblioteka/`, `/biblioteka/knigi/{slug}/`, `/biblioteka/istochniki/{slug}/` · `/zametki/`, `/zametki/{slug}/`, `/zametki/serii/{slug}/` · `/karta/` (якорь `#slug` открывает место) · `/mesta/{slug}/` · `/marshruty/`, `/marshruty/{slug}/` · `/sezony/` · `/ukazatel/` · `/poisk/?q=` · `/o-proekte/`.
Каждая страница сущности обязана ссылаться на связанные: заметка → люди, места, книги, серия, слой; человек → заметки, места, книги; место → заметки, люди, маршруты, карта; книга → заметки-рецензии, люди. Сущность без своей страницы (`entity().href === null`) выводится текстом, не ссылкой.

## Данные (`src/data/*.json`, собраны скриптом `scripts/build_data.py`)
- `articles` (60): slug, tg_ids, tg_url, date (дата поста), title, dek, summary, facts[], type, layer[], people[], places[], books[], photos[], cover, read_min, series, series_slug, + обратные связи считаются через data.ts.
- `people` (30): slug, name, short, years, country, role, group, bio, quote, posts, portrait, places[], articles[].
- `places` (31): slug, name, name_zh, name_now, city, layers, kind, lat, lng, coord_confidence, summary, visit, season, posts, photos, verify, articles[].
- `books` (24), `sources` (19), `routes` (5), `seasons`, `series` (10), `photos` (каталог 215 фото), `index_terms` (имена/места без страниц).
- Фото: `img(path_or_id)` → WebP с водяным знаком; `img(x, 640)` — превью. Портрет Виктории: `authorImg('viktoriia')`.
- Поле `verify: true` или `coord_confidence: low` — показывай аккуратную пометку «уточняется», не выдавай за факт.

## Движение и интерактив
- Переходы между страницами уже включены. Для «морфинга» картинки из списка в страницу ставь одинаковый `transition:name`: `person-{slug}`, `book-{slug}`, `place-{slug}`, `note-{slug}` (общие карточки уже ставят их — повтори на детальной странице у главной картинки).
- Появление при скролле: `class="reveal"` (+ `style="--d:120ms"` для лесенки), не больше одного уровня вложенности.
- Клиентские скрипты: `<script>` в .astro, инициализация в `document.addEventListener('astro:page-load', ...)` (иначе сломается после перехода). Никаких тяжёлых библиотек, кроме `maplibre-gl` (карта) и `pagefind` (поиск) — уже установлены.
- Уважать `prefers-reduced-motion` (глобально уже учтено для .reveal и переходов).

## Телефон — обязательно
Всё должно отлично работать на ширине 360–390 px: без горизонтального скролла страницы, кнопки и ссылки ≥ 44 px, ряды чипов прокручиваются вбок (`.chip-row`), длинные таблицы — в `overflow-x:auto`. Сетки — через `.grid` (auto-fit) или flex-wrap.

## Тексты
Пишешь по-русски, как хороший редактор: коротко, конкретно, с датами. Никаких ИИ-штампов: «погрузитесь», «откройте для себя», «уникальный», «удивительный», «настоящая жемчужина», «не просто X, а Y», «давайте разберёмся», «стоит отметить», тройки эпитетов, восклицания, риторические вопросы. Двойные даты по канону канала: «2 (15) декабря 1904». Написание: Маньчжурия, Люйшунь, Дайрен, Электрический утёс. Ничего не выдумывай; нет данных — не пиши.

## Доступность
Семантика: один `h1`, иерархия h2/h3, `<nav aria-label>`, `<button>` для действий, `<a>` для переходов, `alt` у содержательных картинок (`alt=""` у декоративных), контраст ≥ 4.5:1, видимый фокус (глобально).

## Проверка
Собирай в отдельную папку, чтобы не мешать соседям: `npx astro build --outDir ../.builds/<раздел>` из папки `site`. Ошибка сборки из чужого раздела — не чини чужие файлы, сообщи в отчёте. В конце убедись, что твои страницы генерируются и все `href.*` ведут на существующие маршруты.
