# Dataset provenance

Canonical inputs: `data/source/units.json` and `data/source/hypotheses.csv`.
Source version: working-2026-09-16T12:50:12+00:00. Build: `python3 scripts/pipeline.py build`.

- Documentary units: 64; explicit gap ranges: 24.
- Legacy working index: 93/192 distinct reference numbers. This is not archival coverage: digitisation labels and manuscript foliation diverge, and the physical total is unknown. Archival coverage fields are null; the reproducible old calculation is retained in `reference_coverage`.
- Manual text: 56 units. Regests and HTR remain separate.
- Transcription QA: 41 units need review (9 high priority); 27 have CER/WER metrics. This is automated triage, not philological certification.
- Unlocalized units: 4. Gap ranges complement the legacy working references; they establish neither missing responses nor missing source material.
- Hypotheses: 433 recorded, 414 active. Rejected and superseded records remain in the source audit table.
- The seven uncertainty states are distinct from editorial review status. A populated field is validated only when all its active hypotheses have been reviewed.
- `data/` holds the dataset files; `docs/data/` holds the same files plus the ones the site loads. `release.json` records source hashes.

## Open editorial questions

- Early digitisation labels differ from manuscript foliation. Inspection of the digitisations received on 2026-09-15 identifies two captures of opening 17v–18r with different filenames, the second matching the observed manuscript foliation. This does not establish a continuous concordance for the entire register. The complete inventory of responses and physical folio total are not established. Existing working references are preserved without an automatic offset.
- The dissent refers to the response of 29 May 1608 on Folo's memorandum (fols 73v-75r), read on the digitisation but not yet edited as a unit; no target unit id is assigned until that response is transcribed.
- R142_0040: unresolved source foliation cc. 86v-89r [ma 88r]. Excluded from computed coverage until expert reconciliation; no folios inferred.
- R142_0041: unresolved source foliation cc. 89v[88r]-90v[89v]. Excluded from computed coverage until expert reconciliation; no folios inferred.
- R142_0042: unresolved source foliation cc. 92r[91r]-94v[93v]. Excluded from computed coverage until expert reconciliation; no folios inferred.
- R142_0049: unresolved source foliation cc. 140v-. Excluded from computed coverage until expert reconciliation; no folios inferred.

The EADH 2026 paper reports 61 units and approximately 51% coverage. This historical claim is retained; reconciliation requires a foliation audit, not a silent data correction.
