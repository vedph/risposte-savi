# English presentation dictionary

`en.json` maps exact Italian editorial strings to English. It includes all
interpretative fields in the current qualified model and the site's remaining
Italian interface text. Institutional names and bibliographic titles can remain
in their attested form. Manual English summaries already live in `regest_en`.

The browser uses translations for presentation only. `SiteLocale.opinion`
creates a copy and regenerates simple summaries with English AND / OR / NOT
operators. It never changes evidence quotations, Unicode offsets, source hashes,
canonical datasets, reviewer decisions or downloadable source-model JSON.
Documentary blocks, quoted evidence, form contents and Italian-language spans
are excluded from interface translation. Search includes English editorial titles
as well as the original forms. Changing language preserves local review drafts.

Run `python3 scripts/build_translations.py` after editing the dictionary. The
release pipeline also generates `assets/english.js` for both site roots and
checks that every interpretative string has an English entry. Missing translations
stop a build; they are not silently presented as English. All translation assets
are local and included in the offline cache; there is no external translation API.

Translations are editorial renderings, not additional source evidence or
independent historical validation. New or revised interpretations require a
corresponding dictionary update.
