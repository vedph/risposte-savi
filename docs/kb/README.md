# kb/ - the project knowledge base

A plain-files knowledge layer: **markdown + YAML front matter**, one note per object,
relations as links. Generated - never hand-edited - by `tools/build_kb.py` from
`data/units.json` (itself built from the canonical CSV by `tools/build_units.py`).

## Profile (1 page)

- **One required key:** `type` (`Risposta`, `Concept`, `ModelNote`, `Note`).
- **Units** (`kb/units/R142_NNNN.md`): front matter = the documentary layer
  (date with `more_veneto` only where the source marks it, folio, transcription
  status, reliability A-F, subscription state, relation) **plus** analytical
  hypotheses under `hyp_*` keys, each with its rule id and
  `hyp_status: pending_expert_validation`. Body: marginal note, ground-truth
  transcription (I. Cecchini), editorial notes split out, regest, uncollated
  HTR transcription (uncollated), links to concept notes.
- **Concepts** (`kb/concepts/<field>--<value>.md`): authored scope notes for every
  controlled-vocabulary value; the vocabulary itself is an analyst-imposed
  construct under review. Parked candidates live in `_parked.md`.
- **Model notes** (`kb/model/`): backbone (Dossier ⊃ Seduta ⊃ Risposta ⊃ Atto),
  the two layers, evidence hierarchy, seven uncertainty states, reliability
  classes, and the error metrics with their definitions.
- **Relations:** wiki-style links `[[...]]`; `related_unit` in front matter for
  dissent/continuation. Obsidian-friendly; degrades to plain markdown anywhere.
- **Validation:** `python tools/validate_kb.py` checks required keys, enums,
  id patterns and dangling relations (CI-ready, exit code ≠ 0 on error).

## Evidence discipline

Validated fields are never replaced by hypotheses; dashed marks and `hyp_*`
keys always mean *pending expert validation*. LLM readings never enter these
files; transcription, date and signatory fields contain no LLM output.
