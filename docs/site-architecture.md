# Reader navigation and content relationships

## Reader entry points

The five primary entries are Articles & notes (`/zametki/`), Periods
(`/istoriya/`), Places & routes (`/mesta/`), People (`/lica/`) and Library
(`/biblioteka/`). `src/lib/navigation.ts` owns their labels, URLs and active
section mapping. About, seasons, series, alphabetical index and search are
secondary navigation. The full-screen map and route catalogue stay at their
existing URLs and share navigation with the places catalogue.

The reading catalogue distinguishes complete on-site articles from summaries of
Telegram posts. `ReadingShelf` selects existing place essays and document
readings from their canonical records. It never copies their text to another
URL. Add future standalone essays to a dedicated content collection and the
reading index rather than forcing them into a place record. Existing links and
canonical URLs must continue to work.

## Period, publication date, source and perspective

`Article.date` is the channel publication date. Public `Article.layer` is the
historical subject used consistently by period pages, filters and related
reading. Imported labels in `articles.json` are preserved; reviewed corrections
in `editorial_periods.json` are applied once in `lib/data.ts`, for all locales.
The ten initial corrections concern modern reviews or explanations of the
1904–1905 war, not modern city history. Do not infer a subject period from the
date of a book, review or web publication. Selected methodological pieces also
have an entry in the Library. Contemporary visits, physical preservation and later
commemoration can legitimately belong to the post-1955 period.

Periods are not national ownership categories. A Chinese witness can illuminate
Russian-administered Dalny or Japanese-administered Dairen; an account's language
does not establish its perspective. Preserve source author, date, genre and
provenance separately. Source dates remain in book/source bibliographies and
document reading citations, and are not derived from channel publication dates.

## Library and editorial research

Public Library entry points are introductory books, the book catalogue, source
records, and practical guidance on reading documents. Links from essays to
their assessed sources and from source pages back to essays provide context.
The local 94-file research collection is editorial storage, not automatically
published content. Before adding a researched source to the public library,
check provenance, rights, citation locator and relationship to existing posts.
Do not expose private local file paths as download links on the public site.

## Future changes

Keep translated content aligned through `docs/translation-workflow.md`.
Period-specific introduction headings are data (`layers.json: introTitle`),
not generic template labels. Adding an essay, person, place or source should
extend these relationships rather than add a new top-level menu item.
