# Incremental translation maintenance

Russian is canonical. This workflow prepares editorial work; it never generates translations or changes translated prose. English and Chinese have independent reviewed baselines. A review of one locale does not approve the other.

## Files and coverage

- `scripts/translation_sources.mjs` supplies the current `translatedFiles` list dynamically. New datasets enter the workflow without a second hardcoded list.
- `src/i18n/{en,zh}/source-baseline.json` stores the last reviewed Russian JSON values, raw `dossiers.ts`, the reviewed translations, and hashes of UI source files. These are tracked editorial history, not generated copies of the current working tree.
- `source-manifest.json` remains the CI/build freshness check for reader JSON and `dossiers.ts`. It does **not** prove that changed UI literals have been translated.
- `.translation-work/en.json` and `zh.json` are ignored, temporary review packets. Keep the tracked baseline; do not replace it to silence a warning.

Initial baselines were bootstrapped from reviewed release `66e30cc`. Bootstrap reads git HEAD and verifies every entry of that locale’s **committed** source manifest against HEAD source bytes (normalizing CRLF). It also rejects a tracked HEAD dataset missing from that manifest. Files newly added to `translatedFiles` but absent at HEAD are treated as new current data. Bootstrap never approves the current working tree and refuses to overwrite an existing baseline. Recovery is an editorial operation, not a normal build step:

```sh
node scripts/translation_workflow.mjs bootstrap en
```

## Prepare and translate

```sh
npm run translations:status
npm run translations:prepare -- en
npm run translations:prepare -- zh
```

Status is read-only. Prepare writes a packet and resets its decisions: preserve completed decisions separately before preparing again. Each packet records a source revision and baseline revision, the old Russian, new Russian, previous translation and current translation. Entity arrays use `slug`, then `id`, then `place`, then the invariant photo asset `file`, provided the chosen field is present and unique throughout the array; reordering them creates no prose tasks. Ordinary paragraph arrays use positions. Additions and deletions are explicit. Unknown or duplicate identity arrays fall back to positions rather than guessing.

Review prose and structural metadata separately. Coordinates, links, assets, identifiers, `navigationName`/`navigationAddress` and dates must retain their meaning and required invariant values. New entities include their whole object for context; translate every reader-visible field. Array reordering may still require matching the target’s physical order for the existing schema validator even when no prose changed. Run the normal checks after aligning it.

`dossiers.ts` changes produce an honest file-level item, including both raw versions and `guides.json`. Compare affected guide prose and any related dossier articles; the tool does not pretend to safely extract TypeScript prose. UI edits produce a separate file-hash review item. Use its file list and `git diff <baseline.commit> -- src` to inspect new and changed literals, including uncommitted edits; distinguish UI from data and inspect deleted files. Update exact literal/fragments in `ui.json`, including text around interpolations. The packet hashes cover source files, not a semantic UI extractor. Review translated output in a browser and check for residual Russian, broken links and overflow in both locales.

Assign separate English and Simplified Chinese agents using GPT-6.1 Sol at medium reasoning. Give each its own packet and locale ownership; no third-party bulk translation or LLM API is involved in this tooling. Agents author enjoyable native prose rather than literal Russian syntax. Follow the locale glossary, established historical names and distinctions between Dalny/Dalian and Port Arthur/Lüshun. Preserve qualifiers, uncertainty, quotations, source links and citations; do not add facts. Compare the final translation editorially with the changed Russian and its surrounding context. An existing translation may remain unchanged when it already conveys the corrected meaning, but record why.

## Explicit editorial completion

After translating and comparing, fill the packet’s `decisions` array with one entry per item:

```json
{"id":"copy-item-id", "action":"translated", "note":"Compared the revised title and context with the Russian original."}
```

Actions are `translated`, `unchanged`, `metadata`, or `deleted`. Every decision needs a substantive explanation. Use `unchanged` with a reason when a changed original deliberately requires no translation edit. `metadata` is accepted only for metadata items; `deleted` only for source deletions. A `translated` decision is rejected if the current target value still equals the reviewed baseline. A packet is an editorial checklist, not a substitute for human review or the schema checks.

```sh
npm run translations:review -- --reviewed en
npm run translations:review -- --reviewed zh
# Optional explicit packet path:
node scripts/mark_translation_reviewed.mjs --reviewed en --packet .translation-work/en.json
npm run check
npm run translations:test
```

The compatibility script no longer accepts the old bare `en`/`zh` argument. Builds must never invoke it as automatic hash acknowledgement. Review validates the packet against the current source and baseline before updating both the manifest and baseline. A source edit after prepare makes the packet stale; prepare and review again. Translation edits are allowed after prepare and are captured only at explicit review. The packet remains for inspection but cannot be reused after its baseline advances. The baseline also retains compact `reviewedItems` entries (`id`, `file`, `path`, `action`, `note`) so deliberate unchanged decisions and their reasons survive preparation of the next packet. Changes to translations alone still require normal editorial and rendered QA even when no Russian-source task is generated.

CI enforces both reviewed baseline/UI-source hashes and the existing current source-manifest plus structural/invariant checks. Focused workflow tests run first in `npm run check`. This workflow adds review history; it does not turn hash equality into evidence of translation quality. No review command edits translated data or UI. Each tracked review file is written by atomic rename; the two-file baseline/manifest update is not a filesystem transaction, so if interrupted, inspect both files and rerun from the saved packet after resolving the mismatch. No network, dependencies or model API are required.

On the restricted Windows runner, use the existing Node options `--preserve-symlinks --preserve-symlinks-main` (or the established `NODE_OPTIONS`) if direct Node startup reports an `EPERM` realpath error. Do not install a second runtime.

## CI integration API

Import `reviewedBaselineStatus(locale)` from `scripts/translation_workflow.mjs`. It returns `{ok, errors, sourceRevision?}` without writes, git calls or CLI side effects. Add its `errors` to the existing validator for each enabled locale. This enforces reviewed baseline JSON/dossier changes and UI-source hashes in addition to the existing raw source-manifest checks. A UI-only code change can be reviewed with `unchanged` and an explicit explanation; the reviewed UI hashes then advance and status returns zero.
