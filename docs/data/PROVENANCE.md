# Provenance — datasets derived from the canonical site data

Derived on 2026-07-02 from `docs/data/units.json` (site build snapshot dataset-2026-07-02, generated
2026-07-02) and `docs/data/hypotheses.csv` (741 rule-extracted hypotheses with
rule id, confidence and cited evidence). An earlier reconstruction from
the worklist headers has been superseded by this canonical source.

- Units: 53 (44 with diplomatic text; regesti carried in `regest_note`)
- Gap rows computed from `folio_sides` at folio granularity: 23
- Folios touched by units: 78 of 192 — register coverage ≈41%
  (this supersedes both the ≈53% early estimate of the submitted version and
  the ≈46% of the earlier reconstruction)
- Analytical layer: pivot of the hypotheses; every populated field carries
  status `pending_hypothesis`; nothing validated is claimed
- One documentary relation in the canon: R142_0025 repeated_supplication → R142_0002
- No value invented; unknown = empty + `not_checked`

## Public release mapping

The internal working versions preceding this release are technical lineage of the
source data and build. The public release corresponding to this state is:
**First public prototype — 2026-07-02** (dataset snapshot `dataset-2026-07-02`).
