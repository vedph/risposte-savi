# -*- coding: utf-8 -*-
"""Generate the kb/ knowledge base from data/units.json.
Profile: markdown + YAML front matter, one required key (type), relations as links.
- kb/units/R142_NNNN.md   documentary layer in front matter; body = texts + witnesses
- kb/concepts/<field>--<value>.md   authored scope notes for controlled-vocabulary values
- kb/model/*.md           backbone, layers, evidence hierarchy, uncertainty, reliability
Hypotheses carry rule + status and NEVER replace validated fields."""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KB = ROOT / "kb"
U = json.loads((ROOT / "data/units.json").read_text(encoding="utf-8"))
META, UNITS = U["meta"], U["units"]

def y(v):
    if v is None: return "null"
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return str(v)
    s = str(v)
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'

# ---------------- concepts: authored scope notes ----------------
DOMAINS = {
 "trade_regulation": "Rules of exchange and transit: who may trade what, where, and under which conditions; includes printing/market privileges when framed as trade.",
 "currency_monetary": "Coin and bullion: exchange values, foreign coin circulation, mint and silver/gold matters.",
 "taxation_customs": "Duties and imposts (datii, gravezze, decime, tanse), customs houses, exemptions and enforcement.",
 "citizenship_privilege": "Grants and disputes of cittadinanza and attached trading privileges (de intus / de intus et extra).",
 "shipping_navigation": "Vessels, convoys, freights, wrecks, ports and navigation safety.",
 "consular_affairs": "Consuls and consulates abroad: elections, tariffs (cottimi), jurisdiction over the nation.",
 "manufactures": "Guild production and its regulation: wool, silk, cloth, workshops.",
 "minorities_governance": "Commercial governance of communities under negotiated status (Jews, Ottoman subjects, Greeks, Armenians).",
 "credit_bankruptcy": "Failures, creditors and debtors, banking and credit instruments.",
 "institutional_procedure": "Offices, salaries, elections, record-keeping and internal procedure of magistracies.",
}
ORIENT = {
 "grant": "The opinion supports conceding what is asked (concession, gratia, privilege, admission).",
 "deny": "The opinion argues against granting; includes 'in tutto contraria', 'non doversi'.",
 "prohibit": "The opinion recommends a ban or penal prohibition (prohibir, vietar, sotto pena).",
 "regulate": "The opinion proposes conditions, limits, ordini or termini rather than a yes/no.",
 "recommend": "The opinion advances a positive course of action (essortiamo, ricordiamo, proponemo).",
 "confirm": "The opinion upholds an existing provision or practice.",
 "inform": "The opinion mainly reports or represents facts to the Senate (rappresentar, dicemo, riferimo).",
 "defer": "The opinion suspends, postpones or remits the matter elsewhere.",
 "propose_reform": "Reserved value: structural change proposed beyond the case at hand (not yet assigned by rules).",
 "mixed": "Reserved value: genuinely split orientation within one Risposta (assign only after expert reading).",
}
TRIGGER = {
 "supplica": "A subject's petition (supplica) referred to the Savi for advice.",
 "commission": "A Senate commission/order: the Savi answer 'in essecutione' of a deliberation.",
 "letters": "Incoming correspondence, typically from baili, consuls or rectors.",
 "report": "An internal scrittura or relation prompting the opinion.",
 "dispute": "A controversy between parties referred for advice.",
 "petition": "An instantia; overlaps with supplica — merge pending expert decision.",
}
PARKED = ["debate", "condemn"]  # extraction terms parked pending expert decision

def concept(field, value, text, extra=""):
    p = KB / "concepts" / (field + "--" + value + ".md")
    fm = ["---", "type: Concept", "field: " + y(field), "value: " + y(value),
          "status: analytical_vocabulary", "hyp_semantics: pending_expert_validation", "---"]
    body = "# " + value + "\n\n*" + field + "* — " + text + "\n" + (extra or "") + \
        "\nValues of this field in the dataset are **rule-extracted hypotheses** with cited evidence; the vocabulary itself is an analyst-imposed construct under review.\n"
    p.write_text("\n".join(fm) + "\n\n" + body, encoding="utf-8")

# ---------------- model notes ----------------
MODEL_NOTES = {
"backbone.md": ("Backbone", """Dossier ⊃ Seduta ⊃ **Risposta** ⊃ Atto.

The *Risposta* — one signed deliberative document — is the analysable atom. The *Seduta* (per-date container) is **not** the analytical unit: 17 March 1607 carries both a collegial opinion (R142_0001) and an individual one (R142_0002), and the subscription attaches to the Risposta, not to the sitting. Institutional variants (dissent, continuation, repeated supplication) are explicit `relation_type` links between units, never exceptions."""),
"layers.md": ("Two layers", """**Documentary layer** — source-near markers the register itself supplies: date (with *more veneto* only where marked), folio extent, marginal note, text, subscription block, relations. **Analytical layer** — analyst-imposed vocabularies (policy_domain, decision_orientation, document_trigger, actors, geography): every value is a hypothesis with rule id, evidence span and validation status. The distinction is the method: sources with fields (cadastres, apprenticeship contracts) let extraction read structure off the page; the Risposte have none, so the structure is imposed and must carry its evidence."""),
"evidence.md": ("Evidence hierarchy", """1. Validated manual transcription (I. Cecchini) is ground truth; never reversed by model output.
2. Documentary fields carry uncertainty states; anomalies are flagged (`date_check`, `field_flags`), never silently corrected.
3. The computational witness (Kraken/eScriptorium) is displayed uncollated with measured (per-unit CER/WER) or estimated (corpus) error.
4. Analytical values are rule-extracted hypotheses; dashed marks in the interface always mean hypothesis.
5. Nothing becomes fact without expert validation."""),
"uncertainty_states.md": ("Uncertainty states", """`present` · `absent` · `not_visible` · `not_transcribed` · `not_checked` · `uncertain` · `not_applicable` — seven states govern every field value; unresolved cruces render as ⟨ill.⟩. Absence of information is data, never blank."""),
"reliability_classes.md": ("Reading reliability A–F", """A expert transcription · B partial expert transcription · C regest + HTR output · D regest only · E HTR output only · F none. The class colours the register's Evidence mode and the record badge."""),
"metrics.md": ("Metrics — three numbers, three definitions", """Pipeline segmentation error 3% and pipeline CER ≈15% are line-level figures for the Kraken/eScriptorium workflow (F. Boschetti). Unit-level evaluation vs ground truth: CER 9.8% / WER 28.3% (27 units, normalised u/v · i/j · punctuation, post-correction). Compatible, not competing: they differ by measurement level and normalisation; a diplomatic ground truth is an upper bound for agreement. Full method: ../data/htr_evaluation_report.md."""),
}

def build():
    for d in ["units", "concepts", "model"]:
        (KB / d).mkdir(parents=True, exist_ok=True)
    # units
    for u in UNITS:
        hp, hd, ht = u["hyp"]["policy_domain"], u["hyp"]["decision_orientation"], u["hyp"]["document_trigger"]
        fm = ["---", "type: Risposta", "id: " + u["unit_id"], "title: " + y(u["title_short"]),
              "source_reference: " + y(u["source_reference"]),
              "date_original: " + y(u["date_original"]), "date_iso: " + y(u["date_iso"]),
              "more_veneto: " + y(u["more_veneto"]), "date_check: " + y(u["date_check"] or None),
              "folio: " + y(u["folio_raw"]),
              "transcription_status: " + y(u["transcription_status"]),
              "reliability: " + y(u["reliability"]),
              "signatory_count: " + y(u["signatory_count"]),
              "signatory_status: " + y(u["signatory_status"]),
              "relation_type: " + y(u["relation_type"]),
              "related_unit: " + (("\"[[" + u["related_unit_id"] + "]]\"") if u["related_unit_id"] else "null"),
              "htr_coverage: " + y(u["htr_coverage"]),
              "cer_vs_gt: " + y(u["cer"]), "wer_vs_gt: " + y(u["wer"]),
              "hyp_policy_domain: " + (y(hp["value"]) if hp else "null"),
              "hyp_policy_domain_rule: " + (y(hp["rule"]) if hp else "null"),
              "hyp_decision_orientation: " + (y(hd["value"]) if hd else "null"),
              "hyp_decision_orientation_rule: " + (y(hd["rule"]) if hd else "null"),
              "hyp_document_trigger: " + (y(ht["value"]) if ht else "null"),
              "hyp_status: pending_expert_validation",
              "data_version: " + y(META["version"]), "---"]
        body = ["# " + u["unit_id"] + " — " + (u["title_short"] or ""), ""]
        body += ["## Marginal note / regest", "", u["marginal_note_raw"] or "*(not yet captured)*", ""]
        if hd: body += ["> **Orientation evidence** (`" + hd["rule"] + "`): " + hd["formula"]["ev"].replace("\n", " "), ""]
        if hp: body += ["> **Domain cue** (`" + hp["rule"] + "`): " + str(hp.get("cue")), ""]
        body += ["## Diplomatic transcription — ground truth (I. Cecchini)", "",
                 u["text_diplomatic"] or "*(not transcribed — status: " + u["transcription_status"] + ")*", ""]
        if u["editorial_notes"]:
            body += ["### Editorial notes (I. Cecchini)", ""] + ["- " + n for n in u["editorial_notes"]] + [""]
        if u["regest_note"]:
            body += ["## Regest note", "", u["regest_note"], ""]
        body += ["## HTR output (Kraken/eScriptorium, uncollated)", "",
                 (u["htr_text"][:4000] + (" […]" if len(u["htr_text"]) > 4000 else "")) if u["htr_text"] else "*(none: outside the current HTR batch)*", ""]
        links = []
        if hp: links.append("[[../concepts/policy_domain--" + hp["value"] + "]]")
        if hd: links.append("[[../concepts/decision_orientation--" + hd["value"] + "]]")
        if ht: links.append("[[../concepts/document_trigger--" + ht["value"] + "]]")
        if links: body += ["## Concepts", "", " · ".join(links), ""]
        body += ["> Hypotheses are rule-extracted with cited evidence and pending expert validation; they never replace validated fields."]
        (KB / "units" / (u["unit_id"] + ".md")).write_text("\n".join(fm) + "\n\n" + "\n".join(body) + "\n", encoding="utf-8")
    # concepts
    for k, v in DOMAINS.items(): concept("policy_domain", k, v)
    for k, v in ORIENT.items():
        extra = "\n**Two honest steps:** the performative formula span is solid evidence; mapping it to this label is the fragile step (confidence: low).\n"
        concept("decision_orientation", k, v, extra)
    for k, v in TRIGGER.items(): concept("document_trigger", k, v)
    (KB / "concepts" / "_parked.md").write_text(
        "---\ntype: Note\n---\n\n# Parked terms\n\n" +
        ", ".join("`" + p + "`" for p in PARKED) +
        " — candidate orientation values raised during modelling, parked pending expert decision; not used by the extraction rules.\n", encoding="utf-8")
    # model notes
    for fn, (title, text) in MODEL_NOTES.items():
        (KB / "model" / fn).write_text("---\ntype: ModelNote\ntitle: " + y(title) + "\n---\n\n# " + title + "\n\n" + text + "\n", encoding="utf-8")
    print("kb built:", len(list((KB/'units').glob('*.md'))), "units,",
          len(list((KB/'concepts').glob('*.md'))), "concepts,",
          len(list((KB/'model').glob('*.md'))), "model notes")

if __name__ == "__main__":
    build()
