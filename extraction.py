# -*- coding: utf-8 -*-
"""Rule-based extraction of analytical HYPOTHESES from ground-truth transcriptions.
Every extracted value carries: rule_id, evidence snippet, character span, status.
Nothing here overwrites validated data; outputs are hypotheses pending expert review.
Shared by tools/build_units.py.
"""
import re
from functools import lru_cache
from scripts.text_matching import matching_text
from scripts.ner import EntityRecognizer

def norm(s):
    """Matching-only normalisation. Use matching_text() when offsets are needed."""
    return matching_text(s or "").text

def snippet(text, a, b, pad=34):
    lo, hi = max(0, a - pad), min(len(text), b + pad)
    return ("…" if lo else "") + text[lo:hi].replace("\n", " ") + ("…" if hi < len(text) else "")

def find_all(text, patterns, rule_id, flags=re.I):
    """Match normalised text and translate all spans back to the original."""
    view = matching_text(text or "")
    n = view.text
    out = []
    for pat in patterns:
        for m in re.finditer(pat, n, flags):
            start, end = view.span(m.start(), m.end())
            out.append(dict(term=text[start:end], rule=rule_id,
                            span=[start, end], ev=snippet(text, start, end),
                            status="pending_expert_validation"))
    # dedupe overlapping identical spans
    seen, ded = set(), []
    for o in sorted(out, key=lambda o: o["span"]):
        k = tuple(o["span"])
        if k in seen: continue
        seen.add(k); ded.append(o)
    return ded

# ---------------- lexica (normalised v-forms) ----------------
DEONTIC = [r"\bdebba(?:no)?\b", r"\bdebbano\b", r"\bnon\s+poss(?:a|i|ino|ano)\b",
           r"\bposs(?:a|ino|ano)\b", r"\bsotto\s*pena\b", r"\bstim(?:i|a)amo\b",
           r"\bdoversi\b", r"\bnon\s+doversi\b", r"\b(?:sar|s)essimo\s+di\s+parere\b",
           r"\bsiamo\s+di\s+parere\b", r"\bdi\s+parere\b", r"\bgivdichiamo\b",
           r"\blavdiamo\b", r"\bsi\s+potria\b", r"\bsia\s+tenvto\b", r"\bobligat[oi]\b"]
FISCAL = [r"\bdati[ij]\b", r"\bdatt?io\b", r"\bdaci[oj]\b", r"\bdazi[oi]?\b",
          r"\bgravezz[ae]\b", r"\bdecim[ae]\b", r"\btans[ae]\b", r"\bcott?imo\b",
          r"\bdoana\b", r"\bdogana\b", r"\bgabell[ae]\b"]
MONETARY = [r"\b(?:dvcat[oi]|d\.\s*\d)\w*\b", r"\bdvcati\s+[\divxlcm]+\b",
            r"\b\d[\d\.\,]*\s*(?:dvcati|lire|soldi|scvdi|zecchini|cechini|reali)\b",
            r"\b(?:dvcati|lire|soldi|scvdi|zecchini|cechini|reali)\s+\d[\d\.\,]*\b",
            r"\b\d+\s*per\s*cento\b"]
INSTITUTIONS = [r"\bsenato\b", r"\bcollegio\b", r"\bcons(?:e|i)glio\s+d[ei]\s+diec[ei]\b",
                r"\bprovedditor[ei]\b", r"\bproveditor[ei]\b", r"\bavogador[ei]\b",
                r"\bcamera\s+d[ei]\s+imprestidi\b", r"\bzecca\b", r"\bqvarantia\b",
                r"\bgovernator[ei]\s+dell?e\s+intrade\b", r"\bsavii?\b", r"\brason\s+vecchie\b"]

DOMAIN_CUES = {
 "currency_monetary": ["monet", "moneta", "argento", "oro", "zecca", "reali", "cechin", "zecchin", "valvta", "ongari", "tallari"],
 "taxation_customs": ["dati", "dacio", "dazio", "gravezz", "decim", "tans", "doana", "dogana", "gabell"],
 "consular_affairs": ["console", "consoli", "consolato", "cott", "cotimo"],
 "citizenship_privilege": ["cittadin", "civilta", "civilt", "privilegio"],
 "shipping_navigation": ["nave", "navi", "navigat", "nolo", "navfrag", "marcilian", "vassell", "galee", "galea", "porto"],
 "trade_regulation": ["mercant", "mercanti", "trafic", "negoti", "transito", "stamp", "contrabandi"],
 "manufactures": ["arte", "lana", "seta", "panni", "manifatt", "lavorer"],
 "minorities_governance": ["hebre", "ebre", "givde", "tvrch", "armen", "grec", "levantin", "ponentin"],
 "credit_bankruptcy": ["falli", "creditor", "debitor", "banco", "banchier"],
 "institutional_procedure": ["elettion", "elezion", "salario", "provisionat", "officio", "capitano", "ballott", "scontro", "ministri"],
}

PERFORMATIVE = [r"\bstim(?:i|a)(?:re)?mo\b", r"\bstimer(?:a|essimo)\b",
    r"\bsiamo\s+di\s+parere\b", r"\b(?:sar|s)essimo\s+di\s+parere\b", r"\bparer\s+nostro\b",
    r"\bgivdic(?:hi|a)amo\b", r"\blavd(?:i)?amo\b", r"\bconced(?:er|iamo)\b",
    r"\bnon\s+dovers[ei]\b", r"\bdovers[ei]\b", r"\bsi\s+potria\b", r"\bsi\s+potrebbe\b",
    r"\bessort(?:i)?amo\b", r"\bri?c(?:c)?ord(?:i)?amo\b", r"\braccord(?:i)?amo\b",
    r"\bpropon(?:i|e)mo\b", r"\brappresent(?:ar|iamo|ato)\b", r"\bdicemo\b", r"\briferimo\b",
    r"\bin\s+tvtto\s+contraria\b", r"\bnon\s+conven(?:ir|ga)\b",
    r"\bparer[aà]\s+alla\s+s", r"\bconfirm(?:ar|iamo)\b", r"\bconfermar\b"]

TRIGGERS = [("supplica", [r"\bsvpplica", r"\bsvpplicant", r"\bsvpplication"]),
            ("commission", [r"\bin\s+ess?ecvtione\b", r"\bcommission", r"\bcomanda", r"\bcommess"]),
            ("letters", [r"\blettere?\b"]),
            ("report", [r"\bscrittvra\b", r"\brelation"]),
            ("dispute", [r"\bcontroversi", r"\bdifferen"]),
            ("petition", [r"\binstanti", r"\bpetition"])]

def extract(text, subject=""):
    """Return the hypothesis bundle for one unit. text may be '' (regest-only units)."""
    T = text or ""
    S = subject or ""
    both = S + "\n" + T
    out = {}
    out["deontic"] = find_all(T, DEONTIC, "L_deontic")
    out["fiscal"] = find_all(both, FISCAL, "L_fiscal")
    out["monetary"] = find_all(T, MONETARY, "L_monetary")
    out["institutions"] = find_all(T, INSTITUTIONS, "L_institution")

    # --- performative formula -> decision orientation (two honest steps:
    #     the formula span is solid evidence; the label mapping is the fragile step) ---
    dec = None
    hits = find_all(T, PERFORMATIVE, "F_performative")
    if hits:
        h = hits[-1]
        h["ev"] = snippet(T, h["span"][0], h["span"][1], 60)
        ctx = norm(T[max(0, h["span"][0] - 100): h["span"][1] + 200])
        f = norm(h["term"])
        if re.search(r"in\s+tvtto\s+contraria|non\s+conven", f + " " + ctx[:140]) or \
           re.search(r"non\s+dovers|non\s+si\s+debba|non\s+poss(?!essor)|non\s+.{0,12}conced|non\s+esser\s+bene", ctx): o = "deny"
        elif re.search(r"prohibir|vietar|bandir|sotto\s*pena", ctx): o = "prohibit"
        elif re.search(r"conced|gratia\b|privilegio|admett|essavdir|compiacer", ctx): o = "grant"
        elif re.search(r"regolar|ordine|termini|limitar|riformar|provision", ctx): o = "regulate"
        elif re.search(r"confirm|confermar", f + " " + ctx): o = "confirm"
        elif re.search(r"rappresent|dicemo|riferimo|informa", f): o = "inform"
        elif re.search(r"differir|sospend|rimetter\s+ad\s+altro", ctx): o = "defer"
        elif re.search(r"essort|ricord|raccord|propon|riform", f): o = "recommend"
        else: o = "recommend"
        dec = dict(value=o, rule="M_orientation_from_closing", formula=h, confidence="low")
    out["decision_orientation_hyp"] = dec

    # --- domain cues, weighted (subject x3) ---
    nS, nT = norm(S), norm(T)
    scores = {}
    ev = {}
    for dom, pattern in _domain_patterns().items():
        subject_hits, text_hits = list(pattern.finditer(nS)), list(pattern.finditer(nT))
        score = 3 * len(subject_hits) + len(text_hits)
        if score:
            scores[dom] = score
            ev[dom] = (subject_hits or text_hits)[0].group()
    dom_hyp = None
    if scores:
        top = sorted(scores.items(), key=lambda kv: -kv[1])
        dom_hyp = dict(value=top[0][0], score=top[0][1],
                       runner_up=(top[1][0] if len(top) > 1 and top[1][1] >= 0.6 * top[0][1] else None),
                       cue=ev.get(top[0][0]), rule="M_domain_cues", confidence="low")
    out["policy_domain_hyp"] = dom_hyp

    # --- trigger from incipit ---
    trig = None
    head = T[:300] if T else S
    head_view = matching_text(head)
    nh = head_view.text
    for name, pats in TRIGGERS:
        for p in pats:
            m = re.search(p, nh)
            if m:
                trig = dict(value=name, rule="M_trigger_incipit",
                            ev=snippet(head, *head_view.span(m.start(), m.end())), confidence="medium")
                break
        if trig: break
    out["document_trigger_hyp"] = trig

    # One shared NER implementation; fields and exact source spans remain separate.
    recognizer = _recognizer()
    entities = recognizer.extract(T, "text_diplomatic") + recognizer.extract(S, "marginal_note_raw")
    out["entities_hyp"] = entities
    out["persons_hyp"] = [
        dict(name=e["value"], rule=e["rule"], ev=e["evidence"], span=[e["span_start"], e["span_end"]],
             source_field=e["source_field"], status=e["status"])
        for e in entities if e["label"] == "PER"
    ]
    out["places_hyp"] = [
        dict(name=e["value"], rule=e["rule"], ev=e["evidence"], span=[e["span_start"], e["span_end"]],
             src="text" if e["source_field"] == "text_diplomatic" else "subject",
             lat=None, lon=None, approx=True, tgn=None, status=e["status"])
        for e in entities if e["label"] == "LOC"
    ]
    return out


@lru_cache(maxsize=1)
def _recognizer():
    return EntityRecognizer()

@lru_cache(maxsize=1)
def _domain_patterns():
    # Each word counts once per domain. Stems match word starts, never inside loro/parte.
    return {domain: re.compile(r'\b(?:' + '|'.join(
                re.escape(norm(cue)) for cue in sorted(set(cues), key=lambda x: (-len(x), x))
            ) + r')\w*')
            for domain, cues in DOMAIN_CUES.items()}
