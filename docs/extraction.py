# -*- coding: utf-8 -*-
"""Rule-based extraction of analytical HYPOTHESES from ground-truth transcriptions.
Every extracted value carries: rule_id, evidence snippet, character span, status.
Nothing here overwrites validated data; outputs are hypotheses pending expert review.
Shared by tools/build_units.py.
"""
import re, unicodedata

def norm(s):
    """matching-normalisation: lowercase, strip diacritics, u->v, j->i (17th-c. orthography)."""
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return s.replace("u", "v").replace("j", "i")

def snippet(text, a, b, pad=34):
    lo, hi = max(0, a - pad), min(len(text), b + pad)
    return ("…" if lo else "") + text[lo:hi].replace("\n", " ") + ("…" if hi < len(text) else "")

def find_all(text, patterns, rule_id, flags=re.I):
    """patterns matched on the NORMALISED text; spans mapped 1:1 (norm preserves length)."""
    n = norm(text)
    out = []
    for pat in patterns:
        for m in re.finditer(pat, n, flags):
            out.append(dict(term=text[m.start():m.end()], rule=rule_id,
                            span=[m.start(), m.end()], ev=snippet(text, m.start(), m.end())))
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

GAZETTEER = {  # canonical: (variants..., lat, lon, approx_region, tgn_id or None)
# tgn_id: Getty TGN identifier of the normalised place; None = not yet aligned (shown explicitly).
 "Venezia": (["venetia", "venezia", "vinegia"], 45.4375, 12.3358, False, "7018159"),
 "Costantinopoli": (["costantinopoli", "constantinopoli"], 41.0082, 28.9784, False, "7002473"),
 "Alessandria": (["alessandria"], 31.2001, 29.9187, False, None),
 "Rodi": (["rodi"], 36.4341, 28.2176, False, None),
 "Saragozza": (["saragoza", "saragozza", "zaragoza"], 41.6488, -0.8891, False, None),
 "Lisbona": (["lisbona"], 38.7223, -9.1393, False, None),
 "Padova": (["padova", "padoa"], 45.4064, 11.8768, False, None),
 "Rovigo": (["rovigo"], 45.0705, 11.7904, False, None),
 "Udine": (["vdine"], 46.0711, 13.2346, False, None),
 "Cologna": (["cologna"], 45.3097, 11.3849, False, None),
 "Narenta": (["narenta"], 43.0578, 17.6444, True, None),
 "Cipro": (["cipro"], 35.1264, 33.4299, True, None),
 "Spalato": (["spalato"], 43.5081, 16.4402, False, None),
 "Zante": (["zante"], 37.7870, 20.8999, False, None),
 "Corfù": (["corfv", "corfu"], 39.6243, 19.9217, False, None),
 "Candia": (["candia"], 35.3387, 25.1442, False, None),
 "Bergamo": (["bergamo"], 45.6983, 9.6773, False, None),
 "Milano": (["milano", "milan"], 45.4642, 9.1900, False, None),
 "Firenze": (["fiorenza", "firenze", "fiorentin"], 43.7696, 11.2558, False, "7000457"),
 "Ancona": (["ancona"], 43.6158, 13.5189, False, None),
 "Ferrara": (["ferrara"], 44.8381, 11.6198, False, None),
 "Bologna": (["bologna"], 44.4949, 11.3426, False, "7004847"),
 "Verona": (["verona"], 45.4384, 10.9916, False, None),
 "Brescia": (["brescia"], 45.5416, 10.2118, False, None),
 "Treviso": (["treviso"], 45.6669, 12.2430, False, None),
 "Ragusa": (["ragvsa", "ragusi"], 42.6507, 18.0944, False, None),
 "Dalmazia": (["dalmatia", "dalmazia"], 44.1194, 15.2314, True, None),
 "Bosnia": (["bossina", "bosna"], 43.8563, 18.4131, True, None),
 "Genova": (["genova", "genoa"], 44.4056, 8.9463, False, None),
 "Napoli": (["napoli"], 40.8518, 14.2681, False, None),
 "Roma": (["roma"], 41.9028, 12.4964, False, None),
 "Segna": (["segna"], 44.9894, 14.9058, False, None),
 "Cattaro": (["cattaro"], 42.4247, 18.7712, False, None),
 "Aleppo (Soria)": (["soria", "aleppo"], 36.2021, 37.1343, True, None),
 "Levante": (["levante"], None, None, True, None),
 "Ponente": (["ponente"], None, None, True, None),
}

PERSON_PATTERNS = [
 (r"svpplica(?:tion[ei])?\s+d(?:i|el|ella|e)\s+((?:[a-z]+\s+){0,1}[A-Z][\w']+(?:\s+[A-Z][\w']+){0,2})", "P_supplica_di"),
 (r"\bnome\s+d[ei]\s+([A-Z][\w']+(?:\s+[A-Z][\w']+){0,2})", "P_nome_di"),
 (r"\bq\.?\s*(?:m\.?)?\s*([A-Z][\w']+(?:\s+[A-Z][\w']+){0,1})", "P_quondam"),
]
PERSON_STOP = set("Venetia Venezia Serenità Signoria Senato Savi Savii Collegio Illustrissimi Clarissimi Eccellentissimo Dio Republica Repubblica Levante Ponente Alessandria Costantinopoli".split())

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
    for dom, cues in DOMAIN_CUES.items():
        sc = 0
        for c in cues:
            sc += 3 * nS.count(c) + nT.count(c)
            if c in nS or c in nT:
                ev.setdefault(dom, c)
        if sc: scores[dom] = sc
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
    nh = norm(head)
    for name, pats in TRIGGERS:
        for p in pats:
            m = re.search(p, nh)
            if m:
                trig = dict(value=name, rule="M_trigger_incipit",
                            ev=snippet(head, m.start(), m.end()), confidence="medium")
                break
        if trig: break
    out["document_trigger_hyp"] = trig

    # --- persons (hypotheses; signatories handled upstream as validated) ---
    persons = []
    for pat, rid in PERSON_PATTERNS:
        for m in re.finditer(pat, T):
            name = re.sub(r"\s+", " ", m.group(1)).strip(" ,.;")
            if name.split()[0] in PERSON_STOP or len(name) < 3: continue
            persons.append(dict(name=name, rule=rid, ev=snippet(T, m.start(), m.end())))
    # from the subject line: leading proper-name pair (petitioner) — conservative
    m = re.match(r"^(?:supplica\s+d\w+\s+)?([A-Z][\w']+\s+[A-Z][\w']+)", S)
    if m and m.group(1).split()[0] not in PERSON_STOP:
        persons.append(dict(name=m.group(1), rule="P_subject_head", ev=S[:60]))
    seen, ded = set(), []
    for p in persons:
        k = norm(p["name"])
        if k in seen: continue
        seen.add(k); ded.append(p)
    out["persons_hyp"] = ded

    # --- places via gazetteer ---
    places = []
    for canon, (vars_, lat, lon, approx, tgn) in GAZETTEER.items():
        for v in vars_:
            i = nS.find(v)
            src = None
            if i >= 0: src, base, ii = "subject", S, i
            else:
                i = nT.find(v)
                if i >= 0: src, base, ii = "text", T, i
            if src:
                places.append(dict(name=canon, lat=lat, lon=lon, approx=approx, tgn=tgn, src=src,
                                   rule="G_gazetteer", ev=snippet(base, ii, ii + len(v))))
                break
    out["places_hyp"] = places
    return out
