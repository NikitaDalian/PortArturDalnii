# Ships and armament

`hardware.json` contains two explicit kinds: an individual ship and a weapon model. It is not a places dataset, carries no coordinates and never supplies markers to the map. `/tehnika/` is a secondary thematic entry; `/tehnika/{slug}/` is a canonical record. No duplicate article or renamed existing URL is created. The five primary navigation entries stay intact.

The record owns its dated armament relationships and references. A gun page derives the reverse list of ships from those same relationships. Crew associations distinguish role and period and may link an existing person; a guest is not silently labelled crew. Source refs apply to sections, specification rows, timeline entries and installations. A weapon not covered yet remains described in the ship text; no empty catalogue page is published.

Images preserve full frames and carry dimensions, verified captions, record URL and rights. Original documents and image masters remain in the workspace research library. Only prepared images with established rights enter `public/images/hardware`. No generated image stands in for an archival photograph.

Cross-links are owned once, on hardware records, and rendered in both directions for notes, essays, people, places, sources and periods. Hardware gets existing inline previews, alphabetical index and primary/fallback search. Quoted ship names require exact quoted-name matching and explicit quote eligibility; unrelated quoted prose and book titles keep the existing protection. Ambiguous unquoted names need context, not a guess.

The bare local short names of Pobeda, Poltava and Sevastopol require an exact quoted name or an explicitly preferred entity. Descriptive aliases such as “броненосец «Победа»” still work directly. This avoids linking an ordinary victory or a city to a ship merely because the name appears in the registry. Extend this restriction when adding another ambiguous name; do not resolve ambiguity by registry insertion order.

All prose and local name aliases use the existing RU/EN/ZH review workflow. Structural identities, dates, counts, dimensions, source URLs and relation slugs do not change with translation. Alias sets can differ by language. Reader review is separate from authorship and precedes translation.

Visual design preserves the site's Onest typography and harbour palette: navy #0B2238, ice #F4F7F8, paper #FFFFFF, secondary ink #3B5568, line #D3DEE4, restrained accent #E0452B. Lead with the object and its historical setting; one full-frame archival image anchors the page. Reading width is approximately 70 characters, left-aligned. Technical specifications follow the introduction, alongside an accessible dated service timeline. Catalogues use image-and-text rows, not repeated dashboard tiles. No decorative motion or unrelated new visual identity.

Initial batch: six ships and five gun models described in the workspace `work/hardware/SCHEMA.md`. Then complete the must-have Port Arthur squadron and key Japanese participants, selected from existing articles and verified available evidence. Each batch must be usable and linked before publication. Expansion is not permission to publish sparse placeholder pages.

## Comparing ships

`fleet_overview.json` owns the accepted overview and a measurement row for every represented ship. `/tehnika/v-masshtabe/` compares **overall length**, sorted descending, with historical groups for the Port Arthur squadron, the Second Pacific Squadron, Chemulpo and the Japanese fleet. Lifetime country tags do not determine those groups. Names, categories and preview cards come from the canonical hardware records.

The comparison renders archival figures alongside bars scaled by numeric length in metres, with an accessible table using the same data. Legacy SVG metadata is optional. A ship documented only by a period illustration has a captioned figure and no photographic hotspots. Unknown or disputed comparable lengths remain null and visibly unscaled. Waterline length and length between perpendiculars do not substitute for overall length. The source notes retain displacement evidence, while the comparison focuses on length.

Measurement and editorial reviews are separate, then combined for translation. `shipSlug`, group, profile, numeric values, nulls and URLs are invariant. Translation workflow keys comparison rows by `shipSlug` and installations by `weaponSlug` where unique, so reordering does not create false translation work. Publication checks require complete ship coverage, source provenance and unique routes. Browser verification covers filters, URL persistence, table mode and narrow screens.
