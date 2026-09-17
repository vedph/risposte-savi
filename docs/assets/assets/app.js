/* Risposte register - rendering and interaction. Vanilla, no build step.
   Canonical data: window.RISPOSTE (data/units.js). Bilingual via assets/i18n.js.
   Routing by target element:
     #register    -> register (glyph rows + inline record)      register.html
     #unit-record -> citable per-unit page                       unit.html?u=ID
     #names       -> persons & places index (+ optional map)     names.html
     #model       -> Model Lab                                   model.html
     #home-keys   -> home (wordfield, stats, animated anatomy)   index.html
   Evidence discipline: documentary fields and rule-extracted fields are never restyled as one another;
   dashed marks always mean "rule-extracted, not reviewed". */

(function () {
  "use strict";
  var DATA = window.RISPOSTE || {}, UNITS = DATA.units || [], META = DATA.meta || {};
  var t = function (k) { return window.I18N ? I18N.t(k) : k; };
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function byId(id) { for (var i = 0; i < UNITS.length; i++) if (UNITS[i].unit_id === id) return UNITS[i]; return null; }
  function idxOf(id) { for (var i = 0; i < UNITS.length; i++) if (UNITS[i].unit_id === id) return i; return -1; }
  function pct(x, d) { return (x == null || x === "") ? " - " : (100 * x).toFixed(d == null ? 1 : d) + "%"; }
  function pages(u) { return Math.max(1, (u.folio_sides || []).length) / 2; }
  function extLen(u) { return 62 + 30 * Math.sqrt(Math.min(pages(u), 8)); }
  function line(x1, y1, x2, y2, c, w, d) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="' + w + '"' + (d ? ' stroke-dasharray="' + d + '"' : "") + ' stroke-linecap="round"/>'; }
  function circ(cx, cy, r, st, fl, w, d) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" stroke="' + st + '" fill="' + fl + '" stroke-width="' + w + '"' + (d ? ' stroke-dasharray="' + d + '"' : "") + '/>'; }
  var RELC = { A: "var(--accent)", B: "var(--accent-soft)", C: "#3d5a66", D: "var(--grey)", E: "#6e8894", F: "var(--faint)" };
  var DOMWORD = { citizenship_privilege: { en: "citizenship", it: "cittadinanza" }, consular_affairs: { en: "consular", it: "consolati" }, currency_monetary: { en: "currency", it: "moneta" }, taxation_customs: { en: "taxation", it: "fisco/dazi" }, shipping_navigation: { en: "shipping", it: "navigazione" }, trade_regulation: { en: "trade", it: "commercio" }, manufactures: { en: "manufactures", it: "manifatture" }, minorities_governance: { en: "minorities", it: "minoranze" }, credit_bankruptcy: { en: "credit", it: "credito" }, institutional_procedure: { en: "procedure", it: "procedura" } };
  function domWord(d) { var e = DOMWORD[d]; return e ? (e[I18N.lang()] || e.en) : d; }
  function fam(dec) { if (dec === "grant") return "grant"; if (dec === "deny" || dec === "prohibit") return "block"; if (dec === "regulate") return "step"; if (dec === "recommend" || dec === "propose_reform") return "rise"; if (!dec) return "missing"; return "neutral"; }

  /* ---------- terminal decision mark; hyp=true -> dashed (hypothesis) ---------- */
  function termMark(x, yb, dec, hyp, sc) {
    sc = sc || 1;
    var tc = "var(--accent)", d = hyp ? "4 3" : "", f = fam(dec), s = "";
    function pl(pts) { return '<polyline points="' + pts + '" fill="none" stroke="' + tc + '" stroke-width="' + 2.4 * sc + '"' + (hyp ? ' stroke-dasharray="4 3"' : "") + ' stroke-linejoin="round" stroke-linecap="round"/>'; }
    if (f === "grant") s = pl(x + "," + (yb - 6 * sc) + " " + (x + 11 * sc) + "," + yb + " " + x + "," + (yb + 6 * sc));
    else if (f === "block") s = line(x + 4 * sc, yb - 8 * sc, x + 4 * sc, yb + 8 * sc, tc, 3 * sc, d);
    else if (f === "step") s = pl(x + "," + yb + " " + (x + 6 * sc) + "," + yb + " " + (x + 6 * sc) + "," + (yb - 7 * sc) + " " + (x + 13 * sc) + "," + (yb - 7 * sc));
    else if (f === "rise") s = line(x, yb + 6 * sc, x + 11 * sc, yb - 6 * sc, tc, 2.6 * sc, d);
    else if (f === "missing") s = circ(x + 5 * sc, yb, 4.5 * sc, "var(--grey)", "none", 1.6, "2 2");
    else s = circ(x + 5 * sc, yb, 5 * sc, tc, "none", 2.2 * sc, d);
    return s;
  }

  /* ---------- documentary glyph · proposed nucleus count · year ---------- */
  function glyphSVG(u, mode, scale) {
    scale = scale || 1.25;
    var Ln = extLen(u) * scale, x0 = 46, yb = 20, termX = x0 + Ln, w = x0 + Ln + 86;
    var qualified = window.OpinionGlyphs && OpinionGlyphs.get(u.unit_id), dateX = termX + (qualified ? 64 : 26);
    if (qualified) w += 38;
    var rel = u.reliability || "F", relc = RELC[rel] || "var(--grey)";
    var manual = u.transcription_status.indexOf("manual") === 0;
    var hyp = u.hyp && u.hyp.decision_orientation;
    var dec = hyp ? hyp.value : null;
    var yr = u.date_iso ? u.date_iso.slice(2, 4) : null;
    var s = '<svg class="glyph" viewBox="0 0 ' + w + ' 42" width="' + w + '" height="42" role="img" aria-label="' + esc(u.unit_id) + " reliability " + rel + (qualified ? ' · ' + qualified.nuclei.length + (qualified.nuclei.length === 1 ? ' nucleus' : ' nuclei') : dec ? " decision orientation (extracted) " + dec : "") + '">';
    s += '<rect x="8" y="' + (yb - 11) + '" width="24" height="22" rx="2" fill="none" stroke="' + relc + '" stroke-width="1.6"' + (rel === "F" ? ' stroke-dasharray="3 3"' : "") + "/>";
    s += '<text x="20" y="' + (yb + 5) + '" class="mono mg" text-anchor="middle" fill="' + relc + '">' + rel + "</text>";
    if (mode === "evidence") s += line(x0, yb, termX, yb, relc, 2.4, manual ? "" : "5 4");
    else s += line(x0, yb, termX, yb, "var(--ink)", 2.4, manual ? "" : "5 4");
    if (u.transcription_status === "manual_partial") s += line(x0, yb, x0 + Ln * 0.45, yb, "var(--ink)", 2.4, "");
    if (u.htr_coverage === "full") s += line(x0, yb + 8, termX, yb + 8, "#3d5a66", 1.6, "");
    else if (u.htr_coverage === "partial") s += line(x0, yb + 8, x0 + Ln * 0.55, yb + 8, "#3d5a66", 1.6, "1 4");
    s += qualified ? OpinionGlyphs.terminal(qualified, termX, yb) : termMark(termX, yb, dec, !!hyp && hyp.status !== "validated", 1);
    s += '<text x="' + dateX + '" y="' + (yb + 5) + '" class="mono yr" fill="' + (yr ? "var(--soft)" : "var(--grey)") + '">' + (yr || "n.d.") + "</text>";
    if (u.more_veneto) s += '<text x="' + (dateX + 20) + '" y="' + yb + '" class="mv">mv</text>';
    if (mode === "evidence") {
      if (u.cer != null) s += '<text x="' + dateX + '" y="' + (yb + 17) + '" class="mono" font-size="8.5" fill="#3d5a66">CER ' + pct(u.cer, 1) + "</text>";
      var nf = (u.field_flags || []).length + (u.date_check ? 1 : 0);
      if (nf) s += '<text x="' + (dateX + 22) + '" y="' + (yb - 6) + '" class="flagn" fill="var(--accent)">' + nf + "</text>";
      if (u.signatory_status === "blank_signature_space" || u.signatory_status === "not_transcribed") s += '<text x="' + (x0 + 8) + '" y="' + (yb + 17) + '" class="mono ghost" fill="var(--accent)">⌐⌐</text>';
    }
    return s + "</svg>";
  }

  /* ---------- the college of five (subscription state) ---------- */
  function collegeSVG(u) {
    var R = 32, cx = 46, cy = 48, angs = [210, 240, 270, 300, 330];
    var st = u.signatory_status || "unknown", n = u.signatory_count || 0;
    function pt(rr, a) { var rad = a * Math.PI / 180; return [cx + rr * Math.cos(rad), cy + rr * Math.sin(rad)]; }
    var p1 = pt(R, 210), p2 = pt(R, 330);
    var s = '<svg viewBox="0 0 92 96" width="92" height="96" role="img" aria-label="signatory college: ' + esc(st) + '">';
    s += '<path d="M ' + p1[0].toFixed(1) + " " + p1[1].toFixed(1) + " A " + R + " " + R + ' 0 0 1 ' + p2[0].toFixed(1) + " " + p2[1].toFixed(1) + '" fill="none" stroke="var(--hair)" stroke-width="1.2"/>';
    s += '<text x="' + cx + '" y="' + (cy + 4) + '" class="mono" text-anchor="middle" font-size="10" font-weight="600" fill="var(--ink)">' + (n || "·") + "/5</text>";
    for (var i = 0; i < 5; i++) {
      var p = pt(R, angs[i]), x = p[0], y = p[1];
      if ((st === "unknown" || st === "not_transcribed" || st === "not_checked") && !n) s += circ(x, y, 3.8, "var(--grey)", "none", 1.2, "2 2");
      else if (st === "blank_signature_space") s += circ(x, y, 3.8, "var(--soft)", "none", 1.4, "");
      else if (st === "unanimous_but_names_omitted") s += circ(x, y, 3.8, "var(--ink)", "none", 1.6, "");
      else if (i < n) s += circ(x, y, 3.8, "none", "var(--ink)", 0, "");
      else if (st === "absent_named") { s += circ(x, y, 3.8, "var(--accent)", "none", 1.5, ""); s += line(x - 3, y - 3, x + 3, y + 3, "var(--accent)", 1.5, ""); }
      else if (st === "vacant_seats") { s += circ(x, y, 3.8, "var(--grey)", "none", 1.4, ""); s += line(x - 3, y - 3, x + 3, y + 3, "var(--grey)", 1.4, ""); }
      else s += circ(x, y, 3.8, "var(--grey)", "none", 1.2, "");
    }
    return s + "</svg>";
  }

  /* ---------- exports ---------- */
  function unitToJSON(u) { return JSON.stringify(u, null, 2); }
  function unitToCSV(u) {
    var flat = {}; Object.keys(u).forEach(function (k) { var v = u[k]; flat[k] = (v && typeof v === "object") ? JSON.stringify(v) : v; });
    var ks = Object.keys(flat), c = function (v) { if (v == null) return ""; v = String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return ks.join(",") + "\n" + ks.map(function (k) { return c(flat[k]); }).join(",") + "\n";
  }
  function unitToMD(u) {
    var q = function (s) { return '"' + String(s == null ? "" : s).replace(/"/g, '\\"') + '"'; };
    var fm = ["type: Risposta", "id: " + u.unit_id, "title: " + q(u.title_short),
      "source_reference: " + q(u.source_reference), "date_iso: " + q(u.date_iso),
      "more_veneto: " + u.more_veneto, "folio: " + q(u.folio_raw),
      "reliability: " + q(u.reliability), "transcription_status: " + q(u.transcription_status),
      "signatory_count: " + (u.signatory_count == null ? "null" : u.signatory_count),
      "signatory_status: " + q(u.signatory_status),
      "relation: " + q(u.relation_type + (u.related_unit_id ? " -> " + u.related_unit_id : "")),
      "hyp_policy_domain: " + q(u.hyp.policy_domain ? u.hyp.policy_domain.value : ""),
      "hyp_decision_orientation: " + q(u.hyp.decision_orientation ? u.hyp.decision_orientation.value : ""),
      "hyp_status: " + q(Object.values(u.hyp).every(function(h){return h.status === "validated";}) && Object.keys(u.hyp).length ? "validated" : "rule_extracted"), "data_version: " + q(META.version)].join("\n");
    var body = "# " + u.unit_id + " - " + (u.title_short || "") +
      "\n\n## Marginal note / regest\n\n" + (u.marginal_note_raw || "[not captured]") +
      "\n\n## Diplomatic transcription\n\n" + (u.text_diplomatic || "[not transcribed]") +
      (u.regest_note ? "\n\n## Regest note\n\n" + u.regest_note : "") +
      "\n\n## HTR output (uncollated)\n\n" + (u.htr_text ? u.htr_text.slice(0, 4000) : "[none]") +
      "\n\n> Analytical fields are rule-extracted with cited evidence; they are derived data, distinct from the documentary record.\n";
    return "---\n" + fm + "\n---\n\n" + body;
  }
  function download(name, text, mime) { var b = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" }); var url = URL.createObjectURL(b); var a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-export]"); if (!el) return;
    var u = byId(el.getAttribute("data-uid")); if (!u) return;
    var k = el.getAttribute("data-export");
    if (k === "csv") download(u.unit_id + ".csv", unitToCSV(u), "text/csv");
    else if (k === "json") download(u.unit_id + ".json", unitToJSON(u), "application/json");
    else download(u.unit_id + ".md", unitToMD(u), "text/markdown");
  });

  /* ---------- record ---------- */
  function field(l, v) { return '<div class="f"><span class="fl">' + esc(l) + '</span><span class="fv">' + v + "</span></div>"; }
  function edMark(text) {
    return esc(text).replace(/\[([^\[\]]{3,400})\]/g, '<span class="ednote" title="' + esc(t("ed_note")) + '">[$1]</span>');
  }
  function hypRow(label, h, extra) {
    if (!h) return field(label, '<span class="mut">' + t("none_rec") + "</span>");
    var ev = h.formula ? h.formula.ev : (h.ev || (h.cue ? t("cue") + ": " + h.cue : ""));
    return field(label, '<span class="' + (h.status === 'validated' ? 'validated-value' : 'hypv') + '" title="' + esc((h.rule || "") + " - " + (ev || "")) + '">' + esc(h.value) +
      ' <span class="hyptag">' + (h.status === 'validated' ? (I18N.lang() === 'it' ? 'validato' : 'validated') : t("hyp")) + "</span></span>" +
      (ev ? '<span class="prov">' + esc(ev) + "</span>" : "") + (extra || ""));
  }
  function chips(label, arr) {
    if (!arr || !arr.length) return "";
    var seen = {}, out = [];
    arr.forEach(function (x) { var k = x.t.toLowerCase(); if (seen[k]) { seen[k]++; return; } seen[k] = 1; out.push(x); });
    return '<div class="f"><span class="fl">' + esc(label) + '</span><span class="chips">' +
      out.slice(0, 10).map(function (x) { return '<span class="chip" title="' + esc(x.ev) + '">' + esc(x.t) + (seen[x.t.toLowerCase()] > 1 ? " ×" + seen[x.t.toLowerCase()] : "") + "</span>"; }).join(" ") + "</span></div>";
  }
  /* In the current data export, long marginal notes were truncated at a fixed
     width and the overflow flowed into the next field (regest_note or
     text_diplomatic). The units affected were audited one by one; CARRY records,
     per unit, the join separator ("" = the cut fell inside a word, " " = the cut
     fell on a word boundary). Display recomposes the continuum without altering
     the data; the field boundary itself is restored in Isabella's offline
     transcription review (see EDITORIAL_INTERFACE_PLAN.md). */
  /* CARRY retired 2026-07-15: the column-slip repairs are now fixed at source
     (revision R142_0001-0062); kept as an empty map so the code path stays inert. */
  var CARRY = {};
  var FW = { di:1, del:1, della:1, dello:1, dei:1, degli:1, delle:1, per:1, a:1, al:1,
    alla:1, ai:1, agli:1, alle:1, e:1, et:1, che:1, in:1, con:1, su:1, da:1, dal:1,
    dalla:1, il:1, la:1, lo:1, le:1, un:1, una:1, sopra:1, circa:1, o:1, li:1, de:1 };
  function carry(u) {
    var mn = (u.marginal_note_raw || "").replace(/\s+/g, " ").trim();
    if (!(u.unit_id in CARRY)) return { title: mn, joined: null };
    var sep = CARRY[u.unit_id];
    var cont = (u.regest_note && u.regest_note.trim()) ? "regest" : "text";
    /* presentational title: cut at the last sentence end when the tail is short,
       otherwise drop the dangling fragment / trailing function words */
    var title = mn, m = mn.match(/^(.*[.\u201d])\s+(\S+(?:\s+\S+){0,3})$/);
    if (m) title = m[1];
    else {
      var toks = mn.split(" ");
      if (sep === "") toks.pop();                       /* mid-word fragment */
      while (toks.length > 3 && FW[toks[toks.length - 1].toLowerCase()]) toks.pop();
      title = toks.join(" ");
    }
    title = title.replace(/[\s,.:;\u201c]+$/, "") + "\u2026";
    return { title: title, joined: mn + sep, cont: cont };
  }
  function mnParts(u) { var c = carry(u); return { title: SiteLocale.title(u, c.title) }; }
  /* ---------- expanded ("sciolta") rendering: expansions resolved, never silently.
     Supplied letters keep a visible status (italic); folio changes become pills;
     uncertainty marks stay first-class. Emendations are applied only here, tagged,
     with the source reading in the tooltip - the diplomatic view keeps the source. */
  function expandTxt(s, u) {
    var x = esc(s);
    (window.ABBREV || []).forEach(function (r) {
      var re = new RegExp("(^|[^\\w.])" + r.s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\w])", "g");
      x = x.replace(re, '$1<span class="suppl" title="' + r.s + '">' + r.e + "</span>");
    });
    x = x.replace(/\*\*(?:\u2026|\.\.\.)\*\*/g, '<span class="lac" title="' + t("illegible") + '">···</span>');
    x = x.replace(/\[a lato:([^\]]*)\]/g, '<span class="alato">a lato:$1</span>');
    x = x.replace(/\[(?:c\.\s*)?(\d{1,3}(?:[rv]|t°?)?)(?:\s*scritto)?\]/g, '<span class="fpill">$1</span>');
    x = x.replace(/\[sic\]/g, '<span class="sicm">[sic]</span>');
    x = x.replace(/\[([^\[\]]{1,26})\]/g, '<span class="suppl">$1</span>');
    x = x.replace(/\(\?\)/g, '<span class="uncm" title="' + t("unc_reading") + '">(?)</span>');
    (u.emendations || []).forEach(function (e) {
      var from = esc(e.source), to = esc(e.emended);
      x = x.split(from).join('<span class="emend" title="' + t("emend_note") + ' \u00ab' + from + '\u00bb">' + to + '</span>');
    });
    return x;
  }
  function regestBlock(u) {
    var L = (window.I18N && I18N.lang) ? I18N.lang() : "en";
    var rg = (L === "it" ? u.regest_it : u.regest_en) || u.regest_en || u.regest_it || "";
    if (!rg) return "";
    var tag = ' <a class="mut sm" href="method.html#editorial">' + (L === 'it' ? 'Criteri editoriali' : 'Editorial method') + '</a>';
    return '<div class="regestbox"><h4 class="sp">' + t("regest") + tag + '</h4><p class="rg">' + esc(rg) + "</p></div>";
  }
  /* Curated cross-references are displayed with the text.  The source data
     keeps a single documentary relation for compatibility; this view also
     adds reciprocal links and explicit R142_NNNN references found in editorial
     notes, without treating analytical graph edges as documentary facts. */
  function relatedOpinions(u, opt) {
    var by = {}, links = {}, self = u.unit_id;
    UNITS.forEach(function (x) { by[x.unit_id] = x; });
    function label(kind) {
      var map = {
        has_copy: ["copy in", "copia in"], has_continuation: ["continued in", "prosegue in"], has_response: ["response in", "risposta in"], has_dissent: ["dissent in", "dissenso in"], copy_of: ["copy of", "copia di"], dissent_to: ["dissenting response to", "parere dissenziente rispetto a"],
        continuation_of: ["continuation of", "continuazione di"], continuation: ["continuation", "continuazione"],
        repeated_supplication: ["repeated supplication", "supplica ripetuta"], same_dossier_as: ["same dossier", "stesso fascicolo"],
        response_to: ["response to", "risposta a"], correction_of: ["corrects", "corregge"], corrected_by: ["corrected by", "corretto da"]
      };
      var p = map[kind] || [kind || "linked opinion", kind || "parere collegato"];
      return p[I18N.lang() === "it" ? 1 : 0];
    }
    function add(id, kind, source, explicitLabel) {
      if (!id || id === self || !by[id]) return;
      var key = id;
      if (!links[key]) links[key] = { id: id, kind: kind || "note", source: source || "", label: explicitLabel || "" };
    }
    (u.editorial_links || []).forEach(function (r) { add(r.unit_id, "editorial", "notes", I18N.lang() === "it" ? r.label_it : r.label_en); });
    if (u.relation_type && u.relation_type !== "none" && u.related_unit_id) add(u.related_unit_id, u.relation_type, "metadata");
    UNITS.forEach(function (x) {
      if (x.related_unit_id === self && x.relation_type && x.relation_type !== "none") add(x.unit_id, ({copy_of:"has_copy",continuation_of:"has_continuation",continuation:"continuation_of",correction_of:"corrected_by",corrected_by:"correction_of",response_to:"has_response",dissent_to:"has_dissent"})[x.relation_type] || x.relation_type, "metadata");
    });
    var noteText = (u.editorial_notes || []).join(" ") + " " + (u.regest_note || "") + " " + (u.regest_it || "") + " " + (u.regest_en || "");
    var m, re = /R142[_\\]?([0-9]{4})/g;
    while ((m = re.exec(noteText))) add("R142_" + m[1], "note", "notes");
    var rows = Object.keys(links).map(function (k) { return links[k]; }).sort(function (a, b) { return a.id.localeCompare(b.id); });
    if (!rows.length) return "";
    var items = rows.map(function (r) {
      var target = by[r.id], title = SiteLocale.title(target) || target.title_short || r.id;
      var href = opt && opt.noLinks ? "#" : "unit.html?u=" + encodeURIComponent(r.id);
      var text = r.label || (r.kind === "note" ? t("linked_from_note") : label(r.kind));
      return '<li><a href="' + href + '"' + (opt && opt.noLinks ? ' aria-disabled="true"' : '') + '><b class="mono">' + esc(r.id) + '</b> <span>' + esc(title) + '</span></a><small>' + esc(text) + '</small></li>';
    }).join("");
    return '<aside class="related-opinions" aria-labelledby="connected-opinions-title"><h4 id="connected-opinions-title">' + t("connected_opinions") + '</h4><p class="mut sm">' + t("connected_opinions_note") + '</p><ul>' + items + '</ul></aside>';
  }
  window.__vt = function (btn) {
    var sec = btn.closest(".unit-text"); if (!sec) return;
    var v = btn.getAttribute("data-v");
    sec.querySelectorAll(".vt").forEach(function (b) { b.classList.toggle("on", b === btn); b.setAttribute("aria-pressed", String(b === btn)); });
    sec.classList.toggle("side", v === "s");
    var article = sec.closest('.reader-record');
    if (article) article.classList.toggle('reading-comparison', v === 's');
    sec.querySelector(".bq-d").style.display = (v === "d" || v === "s") ? "" : "none";
    sec.querySelector(".bq-e").style.display = (v === "e" || v === "s") ? "" : "none";
  };
  function recordHTML(u, opt) {
    opt = opt || {};
    var rel = u.reliability, relc = RELC[rel];
    var perma = opt.permalink ? '<a class="permalink" href="unit.html?u=' + encodeURIComponent(u.unit_id) + '">' + t("permalink") + " ↗</a>" : "";
    var dateline = esc(u.date_original || "") + " → " + esc(u.date_iso || "n.d.") + (u.more_veneto ? " (more veneto)" : "");
    if (u.date_check) dateline += ' <span class="flags" title="date anomaly recorded in the source">⚑ ' + esc(u.date_check) + "</span>";
    var workingReferences = (window.RISPOSTE.meta || {}).coverage_status === 'unreconciled_foliation';
    var doc = field(t("archref"), esc(u.source_reference)) + field(t("date"), dateline) +
      field(t("folio"), esc(u.folio_raw) + (u.foliation_status === "uncertain" ? ' <span class="hyptag">' + (I18N.lang() === "it" ? "riferimento da verificare" : "reference to review") + "</span>" : "")) +
      field(t("marginal"), u.marginal_note_raw ? '<span translate="no" lang="it">' + edMark(u.marginal_note_raw) + '</span>' : '<span class="mut">' + t("not_captured") + "</span>");
    var ana = hypRow(t("trigger"), u.hyp.document_trigger) +
      hypRow(t("orientation"), u.hyp.decision_orientation) +
      hypRow(t("domain"), u.hyp.policy_domain) +
      (u.places.length ? field(t("geography"), u.places.map(function (p) { return (opt.noLinks ? esc(p.name) : '<a href="names.html#pl-' + esc(p.name) + '">' + esc(p.name) + "</a>") + (p.approx ? "≈" : ""); }).join(", ")) : "") +
      (u.persons_hyp.length ? field(t("actors"), u.persons_hyp.map(function (p) { return esc(p.name); }).join(", ") + ' <span class="hyptag">' + t("hyp") + "</span>") : "");
    var roster = u.signatories_raw ? edMark(u.signatories_raw) : '<span class="mut">' + t("signatories_nt") + "</span>";
    /* primary documentary text: the manual diplomatic transcription (or the regest) */
    var cy = carry(u), txt = "";
    var prline = "";
    if (u.transcription_practice === "strict") prline = t("practice_strict");
    else if (u.transcription_practice === "loose") prline = t("practice_loose");
    var srcl = (u.text_source === "facsimile_2026" ? t("src_fac") : u.text_source === "carte_contigue" ? t("src_contig") : t("src_wd")) +
      (u.double_attestation ? " · " + t("dbl_att") : "");
    if (u.text_diplomatic) {
      var body = u.text_diplomatic;
      txt = '<section id="document-text" class="unit-text">' + regestBlock(u) +
        '<h3 class="sp wm">' + (u.text_source === "facsimile_2026" ? t("gt_fac") : t("gt")) +
        ' <span class="vtog" role="group" aria-label="' + esc(t("text_view")) + '"><button type="button" class="vt on" aria-pressed="true" data-v="d" onclick="__vt(this)">' + t("view_diplo") +
        '</button><button type="button" class="vt" aria-pressed="false" data-v="e" onclick="__vt(this)">' + t("view_expanded") + '</button><button type="button" class="vt" aria-pressed="false" data-v="s" onclick="__vt(this)">' + t("view_side") + "</button></span></h3>" +
        '<p class="mut sm mono">' + esc(prline) + " · " + srcl + "</p>" +
        '<blockquote class="diplo-main bq-d" lang="it" data-reading-source="text_diplomatic">' + edMark(body) + "</blockquote>" +
        '<blockquote lang="it" class="diplo-main bq-e" style="display:none">' + expandTxt(body, u) + "</blockquote>" +
        (u.editorial_notes && u.editorial_notes.length ? '<aside class="ednotes"><h4>' + t("ednotes_lab") + "</h4>" + u.editorial_notes.map(function(n){return '<p class="edn">' + esc(SiteLocale.text(n)) + "</p>";}).join("") + "</aside>" : "") +
        (u.text_annex ? '<details class="annexbox"><summary>' + t("annex") + '</summary><blockquote class="diplo-main" lang="it" data-reading-source="text_annex">' + edMark(u.text_annex) + "</blockquote></details>" : "") +
        relatedOpinions(u, opt) +
        "</section>";
    } else if (u.transcription_status === "regest") {
      txt = '<section id="document-text" class="unit-text">' + regestBlock(u) +
        '<p class="mut sm">' + t("regest_pending") + '</p>' +
        (u.regest_note ? '<h3>' + t("regest_source") + '</h3><blockquote class="diplo-main" lang="it" data-reading-source="regest_note">' + edMark(u.regest_note) + '</blockquote>' : '') + relatedOpinions(u, opt) + '</section>';
    }
    /* HTR output: secondary technical layer, collapsed by default */
    var htr = "";
    if (u.htr_text) {
      var note = (u.cer != null)
        ? t("htr_measured") + " CER " + pct(u.cer) + " · WER " + pct(u.wer)
        : t("htr_estimate");
      htr = '<details class="htrbox"><summary><span class="hsum">' + t("htr_panel") + '</span><span class="hnote">' + esc(note) + "</span></summary>" +
        '<p class="mut sm" style="margin:8px 0 6px">' + t("htr") + "</p>" +
        '<blockquote class="htrq">' + esc(u.htr_text) + "</blockquote></details>";
    } else {
      htr = '<p class="mut sm">' + t("no_htr") + "</p>";
    }
    var relrow = (u.relation_type && u.relation_type !== "none")
      ? field(t("relation"), '<code>' + esc(u.relation_type) + "</code> → " + (opt.noLinks ? "<b class=\"mono\">" + esc(u.related_unit_id) + "</b>" : '<a href="unit.html?u=' + esc(u.related_unit_id) + '">' + esc(u.related_unit_id) + "</a>")) : "";
    var opinions = window.OpinionGlyphs ? OpinionGlyphs.render(OpinionGlyphs.get(u.unit_id)) : '';
    var toc = !opt.noHtr ? '<nav class="reader-toc" aria-label="' + esc(t("record_sections")) + '">' +
      (txt ? '<a href="#document-text">' + (u.text_diplomatic ? t("text_primary") : t("regest")) + '</a>' : '') +
      (opinions ? '<a href="#opinion-nuclei">' + t("opinion_nuclei") + '</a>' : '') +
      '<a href="#documentary-details">' + t("record_details") + '</a><a href="#linguistic-analysis">' + t("analytical") + '</a></nav>' : '';
    return '<article class="record' + (opt.noHtr ? '' : ' reader-record') + '" data-reading-unit="' + esc(u.unit_id) + '"><header><h2 class="h2"><span class="id">' + u.unit_id + '</span> <span class="title">' + esc(mnParts(u).title || u.title_short) + "</span>" + perma + "</h2>" +
      '<p class="spine">' + esc(u.date_iso || "n.d.") + " · " + esc(u.folio_raw) + ' · <span class="relbadge" style="color:' + relc + ';border-color:' + relc + '">' + rel + "</span> " +
      (u.cer != null ? '<span class="mono sm" style="color:#3d5a66">CER ' + pct(u.cer) + "</span>" : "") + "</p></header>" +
      '<div class="echo">' + glyphSVG(u, "evidence", 1.6) + "</div>" +
      toc + (I18N.lang() === 'en' ? '<p class="mut sm translation-note">Titles and interpretations are in English. Transcriptions and quoted evidence retain the original language.</p>' : '') + '<p class="reader-status" role="status" aria-live="polite"></p>' +
      (opt.noHtr ? opinions : '<div class="reading-columns">' + txt + opinions + '</div>') +
      '<div id="documentary-details" class="cols"><div class="col"><h3>' + t("documentary") + "</h3>" + doc + relrow + "</div>" +
      '<div class="col"><h3>' + t("college") + '</h3><div class="college">' + collegeSVG(u) + '<p class="roster">' + roster +
      '</p></div></div></div>' +
      '<section id="linguistic-analysis" class="unit-ana"><h3 class="sp">' + t("analytical") + '</h3><p class="mut sm hypnote">' + t("hyp_note") + ' <a href="method.html">' + (I18N.lang() === "it" ? "Metodo" : "Method") + "</a></p>" +
      '<div class="cols"><div class="col">' + ana + '</div><div class="col">' +
      chips(t("deontic"), u.terms.deontic) + chips(t("fiscal"), u.terms.fiscal) + chips(t("monetary"), u.terms.monetary) + "</div></div></section>" +
      (opt.noHtr ? "" : htr) +
      '<div class="exports"><span class="mut sm">' + t("exports") + '</span><button data-export="csv" data-uid="' + u.unit_id + '">CSV</button><button data-export="json" data-uid="' + u.unit_id + '">JSON</button><button data-export="md" data-uid="' + u.unit_id + '">MD</button></div></article>';
  }

  /* ---------- legend key strip (always visible) ---------- */
  function miniGlyph(kind) {
    var yb = 12, s = "";
    if (kind === "extent") s = line(4, yb, 34, yb, "var(--ink)", 2.2, "");
    else if (kind === "solid") s = line(4, yb, 30, yb, "var(--ink)", 2.2, "");
    else if (kind === "dash") s = line(4, yb, 30, yb, "var(--ink)", 2.2, "5 4");
    else if (kind === "teal") s = line(4, yb, 30, yb, "var(--ink)", 2.2, "") + line(4, yb + 6, 30, yb + 6, "#3d5a66", 1.6, "");
    else if (kind === "badge") s = '<rect x="6" y="2" width="20" height="19" rx="2" fill="none" stroke="var(--accent)" stroke-width="1.5"/><text x="16" y="16" class="mono" font-size="11" font-weight="600" text-anchor="middle" fill="var(--accent)">A</text>';
    else if (kind === "term") s = window.OpinionGlyphs ? OpinionGlyphs.terminal({nuclei:[1,2,3]}, 4, yb) : line(4, yb, 22, yb, "var(--ink)", 2.2, "") + termMark(22, yb, "grant", true, 0.9);
    return '<svg viewBox="0 0 40 26" width="40" height="26">' + s + "</svg>";
  }
  function keyStrip() {
    var K = [["extent", "key_extent"], ["solid", "key_solidline"], ["dash", "key_dashline"], ["teal", "key_teal"], ["badge", "key_badge"], ["term", window.OpinionGlyphs ? "key_nuclei" : "key_term"]];
    return '<div class="keystrip">' + K.map(function (p) { return '<span class="kk">' + miniGlyph(p[0]) + "<span>" + t(p[1]) + "</span></span>"; }).join("") +
      '<a class="howread" href="model.html#lettura">' + t("how_read") + "</a></div>" +
      '<details class="reglegend"><summary>' + t("leg_title") + "</summary><dl>" +
      "<dt>" + t("leg_rel_t") + "</dt><dd>" + t("leg_rel_d") + "</dd>" +
      "<dt>" + t("leg_status_t") + "</dt><dd>" + t("leg_status_d") + "</dd>" +
      "<dt>" + t("leg_cer_t") + "</dt><dd>" + t("leg_cer_d") + "</dd>" +
      "<dt>" + t("leg_hyp_t") + "</dt><dd>" + t("leg_hyp_d") + "</dd>" +
      "</dl></details>";
  }
  function decisionKeyHTML() {
    var f = [["grant", "grant"], ["deny", "deny"], ["regulate", "regulate"], ["recommend", "recommend"], ["confirm", "confirm_k"], ["", "none_k"]];
    return f.map(function (p) {
      return '<span class="kk">' + '<svg viewBox="0 0 40 24" width="40" height="24">' + line(2, 12, 10, 12, "var(--ink)", 2.2, "") + termMark(10, 12, p[0] || null, p[0] !== "", 0.9) + "</svg><span>" + t(p[1]) + "</span></span>";
    }).join("");
  }

  /* ---------- REGISTER ---------- */
  function initRegister() {
    var host = document.getElementById("register"), rec = document.getElementById("reg-record");
    var state = { mode: "reading", selectedId: (new URLSearchParams(location.search).get("u")) || (UNITS[0] && UNITS[0].unit_id), q: "", filters: { domain: "", decision: "", reliability: "", transcription: "", place: "" } };
    var domains = {}, decisions = {}, placesAll = {}, statuses = {}, reliabilities = {};
    UNITS.forEach(function (u) {
      statuses[u.transcription_status] = 1; reliabilities[u.reliability || "F"] = 1;
      if (u.hyp.policy_domain) domains[u.hyp.policy_domain.value] = 1;
      if (u.hyp.decision_orientation) decisions[u.hyp.decision_orientation.value] = 1;
      u.places.forEach(function (p) { placesAll[p.name] = (placesAll[p.name] || 0) + 1; });
    });
    function matches(u, f, q) {
      if (f.domain && !(u.hyp.policy_domain && u.hyp.policy_domain.value === f.domain)) return false;
      if (f.decision && !(u.hyp.decision_orientation && u.hyp.decision_orientation.value === f.decision)) return false;
      if (f.reliability && u.reliability !== f.reliability) return false;
      if (f.transcription && u.transcription_status !== f.transcription) return false;
      if (f.place && !u.places.some(function (p) { return p.name === f.place; })) return false;
      if (q) {
        var hay = (SiteLocale.title(u) + " " + (u.regest_en || "") + " " + u.unit_id + " " + u.title_short + " " + u.marginal_note_raw + " " + u.signatories_raw + " " + (u.text_diplomatic || "") + " " + (u.regest_note || "")).toLowerCase();
        if (hay.indexOf(q.toLowerCase()) < 0) return false;
      }
      return true;
    }
    function anyF() { return state.q || Object.keys(state.filters).some(function (k) { return state.filters[k]; }); }
    function opts(label, vals, sel, wordFn) {
      var o = '<option value="">' + esc(label) + "</option>";
      Object.keys(vals).sort().forEach(function (v) { o += '<option value="' + esc(v) + '"' + (v === sel ? " selected" : "") + ">" + esc(wordFn ? wordFn(v) : v) + "</option>"; });
      return o;
    }
    function toolbar() {
      var f = state.filters, mc = UNITS.filter(function (u) { return matches(u, f, state.q); }).length;
      return '<div class="toolbar"><div class="modes">' +
        '<button data-mode="reading" class="' + (state.mode === "reading" ? "active" : "") + '">' + t("reading") + "</button>" +
        '<button data-mode="evidence" class="' + (state.mode === "evidence" ? "active" : "") + '">' + t("evidence") + "</button></div>" +
        '<input class="search" type="search" aria-label="' + esc(t("search")) + '" placeholder="' + esc(t("search")) + '" value="' + esc(state.q) + '">' +
        '<div class="filters">' +
        '<select aria-label="' + esc(t("domain")) + '" data-filter="domain">' + opts(t("domain"), domains, f.domain, domWord) + "</select>" +
        '<select aria-label="' + esc(t("decision")) + '" data-filter="decision">' + opts(t("decision"), decisions, f.decision) + "</select>" +
        '<select aria-label="' + esc(t("reliability")) + '" data-filter="reliability">' + opts(t("reliability"), reliabilities, f.reliability) + "</select>" +
        '<select aria-label="' + esc(t("transcription")) + '" data-filter="transcription">' + opts(t("transcription"), statuses, f.transcription, function(v){var labels={manual_full:["full manual transcription","trascrizione manuale integrale"],manual_partial:["partial manual transcription","trascrizione manuale parziale"],regest:["regest","regesto"],not_transcribed:["not transcribed","non trascritto"]};return labels[v]?labels[v][I18N.lang()==="it"?1:0]:v;}) + "</select>" +
        '<select aria-label="' + esc(t("place")) + '" data-filter="place">' + opts(t("place"), placesAll, f.place) + "</select>" +
        '<button class="clear" data-action="clear"' + (anyF() ? '' : ' hidden') + '>' + t("clear") + ' ×</button><span class="count" aria-live="polite">' + mc + "/" + UNITS.length + "</span>" +
        "</div></div>";
    }
    function rows() {
      var prev = null, out = "";
      UNITS.forEach(function (u) {
        var yr = u.date_iso ? u.date_iso.slice(0, 4) : null, sy = yr && yr !== prev; if (yr) prev = yr;
        var dim = anyF() && !matches(u, state.filters, state.q), sel = u.unit_id === state.selectedId;
        var meta = [];
        if (u.hyp.policy_domain) meta.push(domWord(u.hyp.policy_domain.value));
        var qdoc = window.OpinionGlyphs && OpinionGlyphs.get(u.unit_id);
        if (qdoc) meta.push(qdoc.nuclei.length + (qdoc.nuclei.length === 1 ? (I18N.lang() === 'it' ? ' nucleo' : ' nucleus') : ' nuclei'));
        else if (u.hyp.decision_orientation) meta.push(u.hyp.decision_orientation.value + (u.hyp.decision_orientation.status === "validated" ? "" : "?"));
        if (u.cer != null) meta.push("CER " + pct(u.cer, 0));
        out += '<li class="rowwrap"><span class="gutter">' + (sy ? yr : "") + '</span><button class="row' + (dim ? " dim" : "") + (sel ? " sel" : "") + '" data-uid="' + u.unit_id + '"><span class="g">' + glyphSVG(u, state.mode === "evidence" ? "evidence" : "default") + '</span><span class="rl"><span class="rt">' + esc(SiteLocale.title(u)) + '</span><span class="rm">' + esc(meta.join(" · ") || " - ") + "</span></span></button></li>";
      });
      return out;
    }
    function render() {
      host.innerHTML = toolbar() + keyStrip() +
        '<p class="reg-head"><b>' + t("register").toUpperCase() + '</b> <span class="n">' + UNITS.length + " " + t("units") + " · " + t("register_order") + "</span></p><ol class=\"rows\">" + rows() + "</ol>";
      var u = byId(state.selectedId);
      rec.innerHTML = u ? recordHTML(u, { permalink: true, noHtr: true, compactHTR: true }) : '<p class="muted">' + t("select_unit") + "</p>";
      var inp = host.querySelector(".search");
      inp.addEventListener("input", function () { state.q = inp.value; renderSoft(); });
    }
    function renderSoft() {
      var list = host.querySelector(".rows"); list.innerHTML = rows();
      var c = host.querySelector(".count"), f = state.filters;
      var mc = UNITS.filter(function (u) { return matches(u, f, state.q); }).length;
      if (c) c.textContent = mc + "/" + UNITS.length;
      host.querySelector(".clear").hidden = !anyF();
    }
    host.addEventListener("click", function (e) {
      var el = e.target.closest("[data-mode],[data-action],.row"); if (!el) return;
      if (el.classList.contains("row")) { state.selectedId = el.getAttribute("data-uid"); render(); if (rec.scrollIntoView) rec.scrollIntoView({ behavior: "smooth", block: "start" }); }
      else if (el.getAttribute("data-mode")) { state.mode = el.getAttribute("data-mode"); render(); }
      else if (el.getAttribute("data-action") === "clear") { state.q = ""; state.filters = { domain: "", decision: "", reliability: "", transcription: "", place: "" }; render(); }
    });
    host.addEventListener("change", function (e) { var el = e.target.closest("[data-filter]"); if (!el) return; state.filters[el.getAttribute("data-filter")] = el.value; render(); });
    document.addEventListener("langchange", render);
    render();
  }

  /* ---------- UNIT PAGE ---------- */
  function initUnit() {
    var host = document.getElementById("unit-record");
    function render() {
      var id = new URLSearchParams(location.search).get("u");
      var i = id ? idxOf(id) : 0;
      if (id && i < 0) { host.innerHTML = '<p class="muted">' + esc(id) + " - " + t("unit_notfound") + ' <a href="register.html">' + t("register") + "</a>.</p>"; return; }
      if (i < 0) i = 0; var u = UNITS[i];
      if (!u) { host.innerHTML = "<p class=\"muted\">" + (I18N.lang() === "it" ? "Nessuna unit\u00e0 trovata." : "No unit found.") + "</p>"; return; }
      document.title = u.unit_id + " · " + SiteLocale.title(u) + " · Risposte reg. 142";
      var nav = document.getElementById("unit-nav");
      function adjacent(item, direction) {
        return item ? '<a rel="' + direction + '" href="unit.html?u=' + encodeURIComponent(item.unit_id) + '"><span>' + t(direction) + ' · ' + esc(item.folio_raw || item.unit_id) + '</span><b>' + esc(SiteLocale.title(item)) + '</b></a>' :
          '<span class="reader-boundary">' + t(direction === 'prev' ? 'register_start' : 'register_end') + '</span>';
      }
      var sequence = '<div class="reader-sequence">' + adjacent(UNITS[i - 1], 'prev') + adjacent(UNITS[i + 1], 'next') + '</div>';
      if (nav) {
        nav.setAttribute('aria-label', t('register_order'));
        nav.innerHTML = '<div class="reader-position"><a href="register.html?u=' + encodeURIComponent(u.unit_id) + '">' + t("back_reg") + '</a><span class="pos">' + (i + 1) + ' / ' + UNITS.length + ' · ' + t('register_order') + '</span></div>' + sequence;
      }
      host.innerHTML = recordHTML(u, { permalink: false }) + '<nav class="reader-bottom" aria-label="' + esc(t('continue_reading')) + '"><p>' + t('continue_reading') + '</p>' + sequence + '</nav>';
      document.dispatchEvent(new CustomEvent('reader:render'));
    }
    document.addEventListener("langchange", render);
    render();
  }

  /* ---------- NAMES & PLACES ---------- */
  function initNames() {
    var host = document.getElementById("names");
    var persons = {}, places = {};
    function auth(x){var A=window.NAMES_AUTH||{};if(A[x])return A[x];var lx=x.toLowerCase();for(var k in A){if(k.toLowerCase()===lx)return A[k];}return null;}
    /* Authority statuses (data/names_authority.csv): confirmed / proposed -> group under the
       normalised form, tagged accordingly; uncertain -> the raw form stays the headword
       (an uncertain expansion is never presented as a normalised name); exclude -> dropped. */
    function addPerson(raw, uid, validated){
      var k = raw.replace(/\s+/g, " ").trim(); if(!k) return;
      // These are subscription notes, not personal names; raw records retain them.
      if (/^vacantibus\s+aliis$/i.test(k) || /^a lato:\s*Tutti\./i.test(k)) return;
      var q = auth(k), norm = null, prop = null;
      if(q){ if(q.s === "exclude") return;
        if(q.s === "uncertain"){ norm = "uncertain"; prop = q.n; }
        else { k = q.n || k; norm = q.s; } }
      var p = (persons[k] = persons[k] || { name: k, validated: false, norm: norm, prop: prop, units: [], variants: [] });
      if (validated) p.validated = true;
      if (norm && !p.norm) { p.norm = norm; p.prop = prop; }
      if (raw.trim() !== k && p.variants.indexOf(raw.trim()) < 0) p.variants.push(raw.trim());
      p.units.push(uid);
    }
    UNITS.forEach(function (u) {
      (u.signatories || []).forEach(function (n) { addPerson(n, u.unit_id, true); });
      (u.persons_hyp || []).forEach(function (p) { addPerson(p.name, u.unit_id, p.status === "validated"); });
      (u.places || []).forEach(function (p) {
        (places[p.name] = places[p.name] || { name: p.name, lat: p.lat, lon: p.lon, approx: p.approx, tgn: p.tgn || null, units: [] }).units.push(u.unit_id);
      });
    });
    function ulinks(ids) {
      var seen = {}, out = [];
      ids.forEach(function (id) { if (!seen[id]) { seen[id] = 1; out.push('<a href="unit.html?u=' + id + '">' + id.replace("R142_0", "") + "</a>"); } });
      return out.join(" ");
    }
    var namesMap = null;
    function render() {
      if (namesMap) { namesMap.remove(); namesMap = null; }
      var P = Object.values(persons).sort(function (a, b) { return b.units.length - a.units.length || a.name.localeCompare(b.name); });
      var L2 = Object.values(places).sort(function (a, b) { return b.units.length - a.units.length; });
      function bdg(s) { return '<span class="bdg">' + s + "</span>"; }
      var ph = P.map(function (p) {
        var tags = p.validated ? [bdg(t("b_subscription"))] : [bdg(t("b_automatic"))];
        if (p.norm === "confirmed") tags.push(bdg(t("b_normconf")));
        else if (p.norm === "proposed") tags.push(bdg(t("b_normprop")));
        else if (p.norm === "uncertain") tags.push(bdg(t("p_uncertain") + (p.prop ? " (" + esc(p.prop) + "?)" : "")));
        return '<li class="nrow' + (p.validated ? " val" : "") + '"><span class="nname">' + esc(p.name) + (p.variants && p.variants.length ? ' <span class="mono sm mut">[' + p.variants.map(esc).join("; ") + ']</span>' : "") + "</span>" +
          '<span class="ntags">' + tags.join("") + "</span>" +
          '<span class="nunits">' + ulinks(p.units) + "</span></li>";
      }).join("");
      var lh = L2.map(function (p) {
        var tags = [];
        tags.push('<span class="bdg">' + p.units.length + " " + t("occurrences") + "</span>");
        if (p.approx) tags.push('<span class="bdg">' + t("b_approx") + "</span>");

        return '<li class="nrow" id="pl-' + esc(p.name) + '"><span class="nname">' + esc(p.name) + "</span>" +
          '<span class="ntags">' + tags.join("") + "</span>" +
          '<span class="nunits">' + ulinks(p.units) + "</span></li>";
      }).join("");
      host.innerHTML = '<section class="atlas"><div class="atlas-toolbar"></div><div id="map" class="mapbox"></div><div class="atlas-legend"></div></section><div class="names-grid">' +
        '<section><h3 class="colh">' + t("persons") + ' <small>' + P.length + '</small></h3><ul class="nlist">' + ph + "</ul></section>" +
        '<section><h3 class="colh">' + t("places") + ' <small>' + L2.length + '</small></h3>' +
        '<p class="mut sm">' + t("map_note") + '</p><ul class="nlist">' + lh + "</ul></section></div>";
      if (window.RisposteMap) {
        try { namesMap = RisposteMap.create('map', Object.values(places), {lang: I18N.lang(), links: ulinks}); }
        catch (e) { host.querySelector('.atlas').hidden = true; }
      } else { host.querySelector('.atlas').hidden = true; }
    }
    document.addEventListener("langchange", render);
    render();
  }

  /* ---------- MODEL LAB ---------- */
  function countBy(fn) { var m = {}; UNITS.forEach(function (u) { var k = fn(u); if (k == null) return; m[k] = (m[k] || 0) + 1; }); return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; }); }
  function bars(rows) {
    var max = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1]));
    var h = 18, o = '<svg class="bars" viewBox="0 0 430 ' + (rows.length * h + 4) + '" width="430" height="' + (rows.length * h + 4) + '">';
    rows.forEach(function (r, i) {
      var y = i * h + 4, w = Math.round(150 * r[1] / max);
      o += '<text x="0" y="' + (y + 10) + '" class="blab">' + esc(String(r[0]).slice(0, 24)) + '</text><rect x="240" y="' + (y + 1) + '" width="' + w + '" height="10" fill="var(--accent)" opacity="0.85"/><text x="' + (240 + w + 6) + '" y="' + (y + 10) + '" class="bval">' + r[1] + "</text>";
    });
    return o + "</svg>";
  }
  function stageBlock(n, tt, d, b) { return '<section class="stage"><div class="snum mono">' + n + '</div><div class="sbody"><h3>' + tt + '</h3><p class="sdesc">' + d + "</p>" + b + "</div></section>"; }
  function initModel() {
    var host = document.getElementById("model");
    function render() {
      var u = byId("R142_0007") || UNITS[0];
      var it = I18N.lang() === "it";
      host.innerHTML = '<div class="lab"><p class="labintro">' +
        (it ? "Struttura di una scheda: fonte, dati documentari, testo, nuclei del parere, campi analitici." :
          "Structure of a record: source, documentary data, text, nuclei of the opinion, analytical fields.") + "</p>" +
        stageBlock("01", it ? "Fonte" : "Source", it ? "Segnatura archivistica della fonte. Le immagini non sono pubblicate." : "Archival reference of the source. Images are not published.", '<p class="ex mono">' + esc(u.source_reference) + "</p>") +
        stageBlock("02", it ? "Dati documentari" : "Documentary data", it ? "Data, nota marginale, sottoscrizioni, carte." : "Date, marginal note, signatures, folios.", '<p class="ex"><b>' + t("date") + "</b> " + esc(u.date_original || " - ") + " &nbsp; <b>" + t("folio") + "</b> " + esc(u.folio_raw) + " &nbsp; <b>" + t("college") + "</b> " + esc(u.signatories_raw || " - ") + "</p>") +
        stageBlock("03", it ? "Documento e nuclei" : "Document and nuclei", it ? "Il glifo riassume i dati documentari; il terminale ramificato indica il numero dei nuclei del parere. Nella scheda ogni nucleo ha un segno proprio." : "The glyph summarises the documentary data; its branched terminal gives the number of nuclei of the opinion. In the record each nucleus has its own sign.", '<div class="ex">' + glyphSVG(u, "evidence", 1.6) + '</div><div class="keyrow" style="margin-top:10px">' + t('key_nuclei') + "</div>") +
        stageBlock("04", it ? "Campi estratti con regole" : "Rule-extracted fields", it ? "Distribuzione dei valori:" : "Distribution of values:",
          '<div class="vrow"><div><h4>' + (it ? "dominio di intervento" : "policy domain") + '</h4>' + bars(countBy(function (x) { return x.hyp.policy_domain && x.hyp.policy_domain.value; })) + "</div>" +
          '<div><h4>' + (it ? "orientamento della decisione" : "decision orientation") + '</h4>' + bars(countBy(function (x) { return x.hyp.decision_orientation && x.hyp.decision_orientation.value; })) + "</div></div>") +
        stageBlock("05", it ? "Testi disponibili" : "Available texts", it ? "Affidabilit\u00e0 di lettura e stato di trascrizione:" : "Reading reliability and transcription status:",
          '<div class="vrow"><div><h4>' + t("reliability") + " A-F</h4>" + bars(countBy(function (x) { return x.reliability; })) + "</div>" +
          '<div><h4>' + t("transcription") + "</h4>" + bars(countBy(function (x) { return x.transcription_status; })) + "</div></div>" +
          '<p class="ex mono sm">' + (it ? "CER circa 15% (prova di venti pagine) · CER 9,8% / WER 28,2% (27 unità, rispetto alla trascrizione manuale)" : "CER about 15% (twenty-page experiment) · CER 9.8% / WER 28.2% (27 units, against the manual transcription)") + '</p>') +
        "</div>";
    }
    document.addEventListener("langchange", render);
    render();
  }

  /* ---------- HOME ---------- */
  function initHome() {
    var field = document.getElementById("home-wordfield");
    if (field) buildWordfield(field);
    var st = document.getElementById("home-stats");
    function paintStats() {
      if (!st) return;
      st.innerHTML = "<span><b>" + UNITS.length + "</b> " + t("stats_units") + "</span>" +
        "<span><b>" + META.n_manual + "</b> " + t("stats_gt") + "</span>" +
        "<span><b>" + META.n_sides_htr + "</b> " + t("stats_htr") + "</span>" +
        "<span><b>" + pct(META.corpus_cer) + "</b> " + t("stats_cer") + "</span>";
    }
    paintStats();
    var an = document.getElementById("read-anatomy");
    if (an) { an.innerHTML = anatomyAnimSVG(); initAnatomy(an); }
    var k = document.getElementById("home-keys");
    function paintKeys() { if (k) k.innerHTML = keyStrip() + '<div class="keyrow" style="margin-top:10px">' + decisionKeyHTML() + "</div>"; }
    paintKeys();
    document.addEventListener("langchange", function () { paintStats(); paintKeys(); });
  }

  /* the loggia wordfield (arcade drawn procedurally; real word clippings drift like water traffic) */
  function buildWordfield(field) {
    var SW = (window.SCRIPT_WORDS || []).slice(), WM = window.SCRIPT_META || {};
    var cap = document.getElementById("home-wordcap");
    if (cap && WM.source) cap.textContent = (WM.caption ? WM.caption + " - " : "") + WM.source;
    field.innerHTML = '<div class="pz-words"></div><div class="pz-svg"></div>';
    var wlayer = field.querySelector(".pz-words"), slayer = field.querySelector(".pz-svg");
    var seed = 20260701; function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    var bag = SW.slice(); for (var s0 = bag.length - 1; s0 > 0; s0--) { var q0 = Math.floor(rnd() * (s0 + 1)), tm = bag[s0]; bag[s0] = bag[q0]; bag[q0] = tm; }
    var items = [], built = false, fW = 1000, fH = 300, capY = 0, apexY = 0, floorY = 0;
    var damp = (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ? 0 : 1;
    function qf(cx, cy, R, sw) { var rl = R * 0.40, dd = R * 0.58, Lo = [[0, -1], [1, 0], [0, 1], [-1, 0]], s = '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + R.toFixed(1) + '" fill="none" stroke="#1b1b1b" stroke-width="' + sw + '"/>'; for (var i = 0; i < 4; i++) s += '<circle cx="' + (cx + Lo[i][0] * dd).toFixed(1) + '" cy="' + (cy + Lo[i][1] * dd).toFixed(1) + '" r="' + rl.toFixed(1) + '" fill="none" stroke="#1b1b1b" stroke-width="' + sw + '"/>'; return s; }
    function curve(xL, xR, cp, ap) { var xc = (xL + xR) / 2, b = xR - xL, ah = cp - ap; return "C " + xL.toFixed(1) + " " + (cp - ah * 0.55).toFixed(1) + " " + (xc - b * 0.16).toFixed(1) + " " + (ap + ah * 0.1).toFixed(1) + " " + xc.toFixed(1) + " " + ap.toFixed(1) + " C " + (xc + b * 0.16).toFixed(1) + " " + (ap + ah * 0.1).toFixed(1) + " " + xR.toFixed(1) + " " + (cp - ah * 0.55).toFixed(1) + " " + xR.toFixed(1) + " " + cp.toFixed(1); }
    function build() {
      fW = field.clientWidth || 1000; fH = field.clientHeight || 300;
      if (fW < 60) { setTimeout(build, 60); return; }
      var bays = Math.max(3, Math.round(fW / 120));
      var padX = fW * 0.022, sw = 1.15, qCy = fH * 0.10, bw = (fW - 2 * padX) / bays;
      apexY = fH * 0.26; capY = fH * 0.55; floorY = fH * 0.86;
      var cols = []; for (var i = 0; i <= bays; i++) cols.push(padX + i * bw);
      var inset = bw * 0.07, wall = "M0 0 H " + fW.toFixed(1) + " V " + floorY.toFixed(1) + " H 0 Z ", ink = "";
      for (var i = 0; i < bays; i++) {
        var xLi = cols[i] + inset, xRi = cols[i + 1] - inset;
        wall += "M " + xLi.toFixed(1) + " " + floorY.toFixed(1) + " L " + xLi.toFixed(1) + " " + capY.toFixed(1) + " " + curve(xLi, xRi, capY, apexY) + " L " + xRi.toFixed(1) + " " + floorY.toFixed(1) + " Z ";
        ink += '<path d="M ' + xLi.toFixed(1) + " " + floorY.toFixed(1) + " L " + xLi.toFixed(1) + " " + capY.toFixed(1) + " " + curve(xLi, xRi, capY, apexY) + " L " + xRi.toFixed(1) + " " + floorY.toFixed(1) + '" fill="none" stroke="#1b1b1b" stroke-width="' + sw + '"/>';
        ink += qf(cols[i] + bw / 2, qCy, bw * 0.15, sw * 0.85);
      }
      for (var i = 0; i < cols.length; i++) ink += '<line x1="' + cols[i].toFixed(1) + '" y1="' + capY.toFixed(1) + '" x2="' + cols[i].toFixed(1) + '" y2="' + floorY.toFixed(1) + '" stroke="#1b1b1b" stroke-width="' + (sw * 1.3) + '"/>';
      var water = '<line x1="0" y1="' + floorY.toFixed(1) + '" x2="' + fW.toFixed(1) + '" y2="' + floorY.toFixed(1) + '" stroke="#1b1b1b" stroke-width="' + (sw * 1.05) + '"/>';
      var refl = '<g transform="matrix(1,0,0,-1,0,' + (2 * floorY).toFixed(1) + ')" opacity="0.1">' + ink + "</g>";
      slayer.innerHTML = '<svg viewBox="0 0 ' + fW.toFixed(0) + " " + fH.toFixed(0) + '" preserveAspectRatio="none"><path d="' + wall + '" fill="#ffffff" fill-rule="evenodd"/>' + ink + water + refl + "</svg>";
      if (SW.length) {
        if (!built) { var N = Math.min(18, Math.max(6, bays * 2)); for (var n = 0; n < N; n++) { var wd = bag[n % bag.length], im = document.createElement("img"); im.className = "pzw"; im.src = wd.src; im.alt = ""; wlayer.appendChild(im); items.push({ el: im, ar: (wd.w / wd.h) || 4 }); } built = true; }
        for (var n = 0; n < items.length; n++) {
          var it = items[n], h = 13 + rnd() * 7, w = h * it.ar, top = capY * 0.7;
          it.w = w; it.h = h; it.x = rnd() * fW; it.y = top + rnd() * Math.max(8, floorY - top - h);
          it.vx = -(6 + rnd() * 9) * (damp || 0.0001);
          it.el.style.height = h.toFixed(1) + "px"; it.el.style.opacity = (0.4 + rnd() * 0.3).toFixed(2); it.ready = true;
          if (!damp) it.el.style.transform = "translate(" + it.x.toFixed(1) + "px," + it.y.toFixed(1) + "px)";
        }
      }
    }
    build();
    if (SW.length && damp) {
      var last = 0;
      function frame(now) {
        var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
        for (var n = 0; n < items.length; n++) {
          var it = items[n]; if (!it.ready) continue; it.x += it.vx * dt; var top = capY * 0.7;
          if (it.x < -it.w - 40) { it.x = fW + 30; it.y = top + rnd() * Math.max(8, floorY - top - it.h); }
          it.el.style.transform = "translate(" + it.x.toFixed(1) + "px," + it.y.toFixed(1) + "px)";
        }
        requestAnimationFrame(frame);
      }
      if (typeof requestAnimationFrame !== "undefined") requestAnimationFrame(frame);
    }
    var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(build, 200); });
  }

  /* ---------- animated anatomy: the glyph assembles itself (documented facts only) ---------- */
  function anatomyAnimSVG() {
    var x0 = 150, yb = 150, Ln = 240, termX = x0 + Ln;
    function lab(x, y, k, anchor) { return '<text x="' + x + '" y="' + y + '" class="alab aa" text-anchor="' + (anchor || "middle") + '" data-k="' + k + '"></text>'; }
    var s = '<svg class="anatomy" viewBox="0 0 640 250" width="100%" role="img" aria-label="how a Risposta becomes one glyph">';
    var cx = x0 + Ln / 2, cy = 66, R = 46, angs = [210, 240, 270, 300, 330];
    for (var i = 0; i < 5; i++) {
      var a = angs[i] * Math.PI / 180, px = cx + R * Math.cos(a), py = cy + R * Math.sin(a) + 40;
      s += '<circle class="aa-dot aa-dot' + (i + 1) + '" cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="5"' + (i === 4 ? ' data-abs="1"' : "") + ' fill="var(--ink)"/>';
      if (i === 4) s += '<g class="aa-abs"><line x1="' + (px - 4) + '" y1="' + (py - 4) + '" x2="' + (px + 4) + '" y2="' + (py + 4) + '" stroke="var(--accent)" stroke-width="1.8"/><circle cx="' + px + '" cy="' + py + '" r="6" fill="none" stroke="var(--accent)" stroke-width="1.5"/></g>';
    }
    s += lab(cx, 34, "aa1");
    s += '<line class="aa-line" x1="' + x0 + '" y1="' + yb + '" x2="' + termX + '" y2="' + yb + '" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" stroke-dasharray="' + Ln + '" stroke-dashoffset="' + Ln + '"/>';
    s += '<g class="aa-ext">' + line(x0, yb + 26, termX, yb + 26, "var(--faint)", 1, "") + line(x0, yb + 21, x0, yb + 31, "var(--faint)", 1, "") + line(termX, yb + 21, termX, yb + 31, "var(--faint)", 1, "") + lab(x0 + Ln / 2, yb + 44, "aa2") + "</g>";
    s += '<g class="aa-sig">'; for (var j = 0; j < 4; j++) s += line(x0 + 10 + j * 12, yb - 14, x0 + 16 + j * 12, yb - 22, "var(--ink)", 2, "");
    s += lab(x0 + 34, yb - 32, "aa3") + "</g>";
    s += '<g class="aa-badge"><rect x="' + (x0 - 44) + '" y="' + (yb - 13) + '" width="26" height="26" rx="2" fill="none" stroke="var(--accent)" stroke-width="1.8"/><text x="' + (x0 - 31) + '" y="' + (yb + 6) + '" class="mono" font-size="14" font-weight="600" text-anchor="middle" fill="var(--accent)">A</text>' + lab(x0 - 31, yb + 34, "aa4") + "</g>";
    s += '<g class="aa-term">' + (window.OpinionGlyphs ? OpinionGlyphs.terminal({nuclei:[1,2,3]}, termX, yb) : termMark(termX, yb, "grant", true, 1.3)) + '<text x="' + (termX + 60) + '" y="' + (yb + 5) + '" class="mono yr" fill="var(--soft)">07</text>' + lab(termX + 8, yb - 26, "aa5") + "</g>";
    return s + "</svg>";
  }
  var AA = {
    aa1: { en: "the five Savi convene and deliberate - one absence is recorded, not smoothed away", it: "i cinque Savi si riuniscono e deliberano - un'assenza è registrata, non levigata" },
    aa2: { en: "the opinion is entered in the register: line length = folio extent", it: "il parere è messo a registro: lunghezza = estensione in carte" },
    aa3: { en: "four subscribe", it: "quattro sottoscrivono" },
    aa4: { en: "the manual transcription sets the reliability class", it: "la trascrizione manuale fissa la classe di affidabilità" },
    aa5: { en: "the branched terminal counts nuclei; each has its own interpretation", it: "il terminale ramificato conta i nuclei; ciascuno ha la propria interpretazione" }
  };
  function initAnatomy(root) {
    function paint() { var els = root.querySelectorAll(".aa"); for (var i = 0; i < els.length; i++) { var k = els[i].getAttribute("data-k"); els[i].textContent = (AA[k] || {})[I18N.lang()] || ""; } }
    paint(); document.addEventListener("langchange", paint);
    var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
    if (mq.matches) { root.classList.add("static"); return; }
    /* runs on its own as soon as it is visible and keeps cycling; pauses off-screen */
    var timer = null, PERIOD = 11000;
    function play() { root.classList.remove("play"); void root.offsetWidth; root.classList.add("play"); }
    function start() { if (timer) return; play(); timer = setInterval(play, PERIOD); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); }); }, { threshold: 0.35 }).observe(root);
    } else start();
    var btn = document.getElementById("anatomy-replay");
    if (btn) btn.addEventListener("click", play);
  }

  /* ---------- routing ---------- */
  if (document.getElementById("register")) initRegister();
  else if (document.getElementById("unit-record")) initUnit();
  else if (document.getElementById("names")) initNames();
  else if (document.getElementById("model")) initModel();
  else if (document.getElementById("home-keys")) initHome();


  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
