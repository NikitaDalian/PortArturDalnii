# Портъ-Артуръ и Дальнiй

Сайт об историческом Даляне и Порт-Артуре для тех, кто читает по-русски. Каталог заметок Telegram-канала [t.me/portartur_dalnii](https://t.me/portartur_dalnii), лица, библиотека, карта и маршруты.

Прототип: https://nikitadalian.github.io/PortArturDalnii/

## Как устроено

- Astro 7, статический сайт. Публикация на GitHub Pages идёт автоматически при пуше в `main` (`.github/workflows/deploy.yml`).
- Поиск — Pagefind: индекс строится после сборки.
- Карта — MapLibre GL с подложкой OpenStreetMap.
- Данные лежат в `src/data/*.json`, адреса и общие функции — в `src/lib/data.ts`, стиль — в `src/styles/global.css`, правила для разработки — в `STYLE.md`.

## Обновление материалов

1. Выгрузить канал из Telegram в JSON и положить рядом с папкой сайта (`../TGArchive`).
2. Обновить карточки в `../work/*.json`.
3. `python scripts/build_data.py` — сводит данные в `src/data/` с едиными слагами.
4. `python scripts/build_images.py` — готовит фото: WebP и водяной знак со ссылкой на канал.
5. `npm run dev` — посмотреть локально; `npm run build` — собрать.

## Переезд на свой домен

В `astro.config.mjs` заменить `site` на новый адрес и удалить `base`. Все ссылки строятся через `url()` и `href.*`, поэтому больше ничего менять не нужно.
