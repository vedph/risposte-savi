---
type: ModelNote
title: "Evidence hierarchy"
---

# Evidence hierarchy

1. Validated manual transcription (I. Cecchini) is ground truth; never reversed by model output.
2. Documentary fields carry uncertainty states; anomalies are flagged (`date_check`, `field_flags`), never silently corrected.
3. The computational witness (Kraken/eScriptorium) is displayed uncollated with measured (per-unit CER/WER) or estimated (corpus) error.
4. Analytical values are rule-extracted hypotheses; dashed marks in the interface always mean hypothesis.
5. Nothing becomes fact without expert validation.
