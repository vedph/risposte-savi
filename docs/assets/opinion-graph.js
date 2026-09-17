/* Graphs derive exclusively from the qualified model; no new relations inferred. */
(function () {
  'use strict';
  const docs = (window.QUALIFIED_OPINIONS || { documents: [] }).documents;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const force = { recommendation: 'Raccomandazione', assessment: 'Valutazione', prediction: 'Previsione', preference: 'Preferenza', withheld_judgement: 'Giudizio sospeso', referral: 'Rimessione alla decisione', request: 'Richiesta', topic: 'Questione attestata', report: 'Informazione riferita' };
  const stance = { favourable: 'favorevole', opposed: 'contrario', mixed: 'articolato', neutral: 'neutro', undetermined: 'non determinato' };
  const edgeLabels = { contains: 'contiene', grounds: 'sostiene', references: 'è richiamato in', scope: 'precisa', exceptions: 'limita',
    if_then: 'se… allora', subject_to: 'condiziona', operand: 'componente', alternative_to: 'alternativa a', complements: 'completa', qualifies: 'qualifica', supports: 'sostiene', contradicts: 'contraddice' };
  const kinds = { document: 'Documento', nucleus: 'Nucleo', grounds: 'Motivazione', references: 'Precedente / fonte', scope: 'Precisazione', exceptions: 'Eccezione', atom: 'Condizione', gate: 'Operatore' };
  const tr = value => window.SiteLocale ? SiteLocale.text(value) : value;
  const short = id => id.split('-').pop();

  function model(doc, focus) {
    if (!doc || doc.source_status !== 'current' || !doc.simple) return { nodes: [], edges: [] };
    const nodes = [], edges = [];
    const add = n => { nodes.push(n); return n; };
    const edge = (from, to, kind, text, evidence = []) => {
      edges.push({ id: 'e' + edges.length, from, to, kind, text, evidence });
    };
    const core = n => ({ id: n.id, kind: 'nucleus', heading: short(n.id) + ' · ' + force[n.force],
      text: doc.simple.nuclei.find(s => s.id === n.id).summary, object: n.object,
      proposition: n.proposition, conditional: !!n.qualifications.condition,
      stance: stance[n.stance], force: n.force, evidence: n.evidence, nucleus: n.id,
      voice: (n.voice || doc.voice).label, distinctVoice: !!n.voice,
      note: 'Voce: ' + (n.voice || doc.voice).label + '. Il parere non attesta l’esecuzione della decisione.' });
    if (!focus) {
      add({ id: doc.unit_id, kind: 'document', heading: doc.unit_id, text: doc.voice.label, evidence: doc.voice.evidence });
      doc.nuclei.forEach(n => {
        add(core(n));
        edge(doc.unit_id, n.id, 'contains', 'Il documento contiene il nucleo ' + short(n.id) + '.', n.evidence);
      });
      doc.relations.forEach(r => edge(r.from, r.to, r.kind, r.text, r.evidence));
      return { nodes, edges };
    }
    const n = doc.nuclei.find(x => x.id === focus);
    if (!n) return { nodes, edges };
    const q = n.qualifications, inputs = [];
    let leaf = 0;
    function expr(e, path) {
      const id = focus + '-condition-' + path;
      if (e.op === 'atom') return add({ id, kind: 'atom', op: 'atom', heading: 'Condizione', text: e.text,
        evidence: e.evidence, layer: 0, leaf: leaf++ });
      const children = (e.op === 'not' ? [e.operand] : e.operands).map((item, i) => expr(item, path + '-' + i));
      const text = e.op === 'not' ? 'Negazione' : e.op === 'all_of' ? 'Tutte le condizioni' : 'Almeno un’alternativa';
      const gate = add({ id, kind: 'gate', op: e.op, heading: { not: '¬ · NON', all_of: '∧ · E', any_of: '∨ · O' }[e.op],
        text, evidence: q.condition.evidence, layer: Math.max(...children.map(c => c.layer)) + 1, children: children.map(c => c.id) });
      children.forEach(c => edge(c.id, id, 'operand', text, q.condition.evidence));
      return gate;
    }
    if (q.condition) {
      const input = expr(q.condition.expression, 'root');
      inputs.push(input);
      edge(input.id, focus, q.condition.relation, q.condition.note, q.condition.evidence);
    }
    ['grounds', 'references', 'scope', 'exceptions'].forEach(kind => (q[kind] || []).forEach((s, i) => {
      const input = add({ id: focus + '-' + kind + '-' + i, kind, heading: kinds[kind], text: s.text,
        evidence: s.evidence, layer: 0, leaf: leaf++ });
      inputs.push(input);
      edge(input.id, focus, kind, kinds[kind] + ' del nucleo ' + short(focus) + ': ' + s.text, s.evidence);
    }));
    if (!inputs.length) {
      inputs.push(add({ id: doc.unit_id, kind: 'document', heading: doc.unit_id, text: doc.voice.label,
        evidence: doc.voice.evidence, layer: 0, leaf: leaf++ }));
      edge(doc.unit_id, focus, 'contains', 'Nucleo senza ulteriori qualificazioni registrate. Questo non dimostra che la fonte ne sia priva.', n.evidence);
    }
    add({ ...core(n), layer: Math.max(...inputs.map(x => x.layer)) + 1 });
    return { nodes, edges };
  }

  // Measure the same fonts used in the standalone SVG. A conservative fallback
  // keeps server-side rendering possible without a canvas implementation.
  let measuringContext;
  function textWidth(text, font) {
    if (measuringContext === undefined) measuringContext = window.CanvasRenderingContext2D
      ? document.createElement('canvas').getContext('2d') : null;
    if (measuringContext) { measuringContext.font = font; return measuringContext.measureText(text).width; }
    const size = Number(font.match(/(\d+)px/)[1]);
    return Array.from(text).reduce((sum, c) => sum + size * (/[MW@%]/.test(c) ? 1 : /[il.,;:'’ ]/.test(c) ? .32 : .65), 0);
  }

  function wrap(text, width, font) {
    const lines = [];
    let line = '';
    for (const word of String(text || '').trim().split(/\s+/)) {
      if (line && textWidth(line + ' ' + word, font) > width) { lines.push(line); line = ''; }
      // Break unusually long tokens as well; never drop characters or add ellipses.
      for (const c of (line ? ' ' : '') + word) {
        if (line && textWidth(line + c, font) > width) { lines.push(line); line = ''; }
        line += c;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function sizeNode(n, focus) {
    const available = n.w - 32;
    n.headingLines = wrap(n.heading, available, 'bold 13px Arial');
    n.bodyLines = wrap(n.kind === 'nucleus' ? (focus ? n.proposition : n.object) : n.text, available, '17px Georgia');
    n.voiceLines = n.distinctVoice ? wrap(tr('Voce:') + ' ' + n.voice, available, '12px Arial') : [];
    n.stanceLines = n.stance ? wrap(n.stance + (n.conditional ? ' · ' + tr('condizionato') : ''), available, '12px Arial') : [];
    n.bodyY = 25 + (n.headingLines.length - 1) * 17 + 24;
    n.metaY = n.bodyY + n.bodyLines.length * 21 + 7;
    n.h = Math.max(n.kind === 'gate' ? 112 : 128,
      n.metaY + (n.voiceLines.length + n.stanceLines.length) * 17 + 12);
  }

  function layout(graph, focus) {
    const nodes = graph.nodes.map(n => {
      const copy = {...n};
      ['heading','text','object','proposition','voice','stance'].forEach(k => { copy[k] = tr(copy[k]); });
      return copy;
    }), byId = new Map(nodes.map(n => [n.id, n]));
    if (!nodes.length) return { nodes, edges: [], width: 0, height: 0 };
    nodes.forEach(n => {
      n.w = n.kind === 'nucleus' ? (focus ? 330 : 355) : n.kind === 'gate' ? 160 : 255;
      sizeNode(n, focus);
    });
    let width, height;
    if (!focus) {
      let y = 65;
      nodes.filter(n => n.kind === 'nucleus').forEach(n => {
        Object.assign(n, { x: 430, y }); y += n.h + 40;
      });
      height = Math.max(380, y + 24, nodes[0].h + 130); width = 1120;
      Object.assign(nodes[0], { x: 24, y: Math.max(65, (height - nodes[0].h) / 2) });
    } else {
      let y = 65;
      nodes.filter(n => n.leaf != null).sort((a, b) => a.leaf - b.leaf).forEach(n => {
        Object.assign(n, { x: 24, y }); y += n.h + 48;
      });
      const layerBottom = {};
      nodes.filter(n => n.kind === 'gate').sort((a, b) => a.layer - b.layer).forEach(n => {
        const children = n.children.map(id => byId.get(id));
        const center = children.reduce((s, c) => s + c.y + c.h / 2, 0) / children.length;
        Object.assign(n, { x: 24 + n.layer * 400 + 48,
          y: Math.max(65, center - n.h / 2, layerBottom[n.layer] || 0) });
        layerBottom[n.layer] = n.y + n.h + 48;
      });
      const core = nodes.find(n => n.kind === 'nucleus');
      height = Math.max(350, y + 24, core.h + 130,
        ...nodes.filter(n => n !== core).map(n => n.y + n.h + 65));
      Object.assign(core, { x: 24 + core.layer * 400, y: (height - core.h) / 2 });
      width = core.x + core.w + 24;
    }
    // Reuse a lane only for disjoint intervals; distribute ports at shared targets.
    const lanes = [], portCounts = {}, portUsed = {};
    graph.edges.filter(e => e.kind !== 'contains').forEach(e => {
      [e.from, e.to].forEach(id => { portCounts[id] = (portCounts[id] || 0) + 1; });
    });
    const port = n => {
      const i = portUsed[n.id] || 0; portUsed[n.id] = i + 1;
      return n.y + n.h / 2 + (i - (portCounts[n.id] - 1) / 2) * Math.min(12, 100 / portCounts[n.id]);
    };
    const edges = graph.edges.map(e => {
      const a = byId.get(e.from), b = byId.get(e.to);
      const ay = a.y + a.h / 2, by = b.y + b.h / 2;
      if (!focus && e.kind !== 'contains') {
        const fromY = port(a), toY = port(b), lo = Math.min(fromY, toY) - 20, hi = Math.max(fromY, toY) + 20;
        let index = lanes.findIndex(intervals => intervals.every(p => hi < p[0] || lo > p[1]));
        if (index < 0) { index = lanes.length; lanes.push([]); }
        lanes[index].push([lo, hi]);
        const lane = 875 + index * 60; width = Math.max(width, lane + 55);
        return { ...e, d: `M ${a.x + a.w} ${fromY} H ${lane} V ${toY} H ${b.x + b.w + 5}`, lx: lane, ly: (fromY + toY) / 2, vertical: true, lane: index, interval: [lo, hi] };
      }
      const ax = a.x + a.w, bx = b.x - 5, bend = Math.max(40, (bx - ax) / 2);
      return { ...e, d: `M ${ax} ${ay} C ${ax + bend} ${ay}, ${bx - bend} ${by}, ${bx} ${by}`,
        lx: !focus ? bx - 72 : ax + 10, ly: !focus ? by - 13 : ay - (e.kind === 'references' ? 28 : 13), vertical: false };
    });
    return { nodes, edges, width, height };
  }

  function svg(graph, focus, uid) {
    const g = layout(graph, focus), marker = 'opinion-arrow-' + uid;
    const nodeName = id => {
      const n = g.nodes.find(node => node.id === id);
      return n.kind === 'atom' ? n.heading + ': ' + n.text : n.heading;
    };
    // Embedded styles keep the downloaded SVG readable without the website CSS.
    const style = 'text{font-family:Georgia,serif;fill:#242424}.graph-node rect{fill:#fff;stroke:#a6a39c;stroke-width:1.5}.graph-node.nucleus rect{stroke:#b01e28;stroke-width:2}.graph-node.gate rect{fill:#f5efdc;stroke:#967b36}.graph-node.document rect{fill:#f5f4ef}.graph-node.selected rect,.graph-node:focus rect{stroke:#225e78;stroke-width:3}.graph-node{cursor:pointer}.graph-edge{cursor:pointer}.graph-edge path.line{fill:none;stroke:#817d73;stroke-width:1.6}.graph-edge.contains path.line{stroke-dasharray:5 4}.graph-edge.if_then path.line,.graph-edge.subject_to path.line{stroke:#9d2933;stroke-width:2}.graph-edge.selected path.line,.graph-edge:focus path.line{stroke:#225e78;stroke-width:3}.edge-label{font-family:Arial,sans-serif;font-size:13px;paint-order:stroke;stroke:#fff;stroke-width:6px;stroke-linejoin:round}.node-heading{font-family:Arial,sans-serif;font-size:13px;font-weight:bold;fill:#8d2028}.node-body{font-size:17px}.node-meta{font-family:Arial,sans-serif;font-size:12px;fill:#666}.graph-caption{font-family:Arial,sans-serif;font-size:13px;fill:#666}';
    let out = '<svg xmlns="http://www.w3.org/2000/svg" class="opinion-svg" viewBox="0 0 ' + g.width + ' ' + g.height +
      '" style="--graph-width:' + g.width + 'px" data-natural-width="' + g.width + '" role="group" aria-label="Grafo del parere ' + esc(uid) +
      '"><title>' + esc(tr(uid + (focus ? ' · ' + short(focus) : ' · tutti i nuclei'))) + '</title>' +
      '<desc>Lettura interpretativa del parere. Le frecce hanno significati distinti; non attestano decisioni eseguite. Seleziona nodi e frecce per leggere i passi della trascrizione.</desc>' +
      '<style>' + style + '</style><defs><marker id="' + marker + '" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M 0 0 L 8 4 L 0 8 z" fill="#817d73"/></marker></defs>' +
      '<text x="24" y="28" class="graph-caption">' + esc(tr(uid + ' · ' + (focus ? short(focus) + ' e le sue qualificazioni' : 'tutti i nuclei') + ' · struttura del parere')) + '</text>';
    g.edges.forEach(e => {
      const label = tr(edgeLabels[e.kind]);
      out += '<g class="graph-edge ' + esc(e.kind) + '" tabindex="0" role="button" data-graph-edge="' + e.id + '" aria-label="' +
        esc(nodeName(e.from) + ' → ' + label + ' → ' + nodeName(e.to)) + '"><title>' + esc(tr(e.text)) + '</title>' +
        '<path d="' + e.d + '" fill="none" stroke="transparent" stroke-width="18"/><path class="line" d="' + e.d + '" marker-end="url(#' + marker + ')"/>' +
        (e.kind === 'operand' ? '' : '<text class="edge-label" x="' + e.lx + '" y="' + e.ly + '"' +
          (e.vertical ? ' text-anchor="middle" transform="rotate(-90 ' + e.lx + ' ' + e.ly + ')"' : '') + '>' +
          (e.kind === 'references' ? esc(tr('è richiamato')) + '<tspan x="' + e.lx + '" dy="15">in</tspan>' : esc(label)) + '</text>') + '</g>';
    });
    g.nodes.forEach(n => {
      const textLines = (lines, cls, y, step) => lines.map((line, i) =>
        '<text class="' + cls + '" x="' + (n.x + 14) + '" y="' + (n.y + y + i * step) + '">' + esc(line) + '</text>').join('');
      out += '<g class="graph-node ' + n.kind + '" tabindex="0" role="button" data-graph-node="' + esc(n.id) + '" aria-label="' +
        esc(n.heading + ': ' + n.text + (n.voice ? ' · Voce: ' + n.voice : '')) + '"><title>' + esc(n.text) + '</title><rect x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h +
        '" rx="' + (n.kind === 'gate' ? 24 : 6) + '"/>' +
        textLines(n.headingLines, 'node-heading', 25, 17) +
        textLines(n.bodyLines, 'node-body', n.bodyY, 21) +
        textLines(n.voiceLines, 'node-meta', n.metaY, 17) +
        textLines(n.stanceLines, 'node-meta', n.metaY + n.voiceLines.length * 17, 17) + '</g>';
    });
    return out.replace('<desc>Lettura interpretativa del parere. Le frecce hanno significati distinti; non attestano decisioni eseguite. Seleziona nodi e frecce per leggere i passi della trascrizione.</desc>', '<desc>' + esc(tr('Lettura interpretativa del parere. Le frecce hanno significati distinti; non attestano decisioni eseguite. Seleziona nodi e frecce per leggere i passi della trascrizione.')) + '</desc>') + '</svg>';
  }

  function evidence(quotes, uid) {
    return (quotes || []).map(q => '<p class="field-help">' + (q.source_field === 'regest_note' ? 'Regesto editoriale' : q.source_field === 'text_annex' ? 'Trascrizione dell’allegato' : 'Trascrizione') + '</p><blockquote>' + esc(q.quote) + '</blockquote>' +
      (document.querySelector('#unit-editor') ? '<button type="button" class="opinion-source" data-source-field="' + esc(q.source_field) + '" data-opinion-source="' +
      q.span_start + '" data-source-end="' + q.span_end + '" data-source-quote="' + esc(q.quote) + '">Individua nel testo ↓</button>' : window.OpinionGlyphs ? OpinionGlyphs.sourceLink(uid, q) : '')).join('');
  }

  function render(doc, focus = '') {
    doc = SiteLocale.opinion(doc);
    const graph = model(doc, focus);
    if (!graph.nodes.length) return '';
    return SiteLocale.html('<section class="opinion-graph" data-graph-document="' + esc(doc.unit_id) + '" data-graph-focus-value="' + esc(focus) + '">' +
      '<p class="field-help">La panoramica mostra tutti i nuclei. Scegli un nucleo per aprire le qualificazioni; seleziona un nodo o una freccia per leggere il testo completo e le evidenze.</p>' +
      '<nav class="graph-focus-controls" aria-label="Nuclei nel grafo"><button type="button" class="btn" data-graph-focus="" aria-pressed="' + !focus + '">Tutti i nuclei</button>' +
      doc.nuclei.map(n => '<button type="button" class="btn" data-graph-focus="' + esc(n.id) + '" aria-pressed="' + (focus === n.id) + '" title="' + esc(n.object) + '">' + esc(short(n.id)) + '</button>').join('') + '</nav>' +
      '<div class="graph-tools"><button type="button" class="btn" data-graph-zoom="fit">Adatta</button><button type="button" class="btn" data-graph-zoom="1">Ingrandisci</button>' +
      '<button type="button" class="btn" data-graph-download>Scarica SVG</button></div>' +
      '<div class="graph-viewport" tabindex="0" aria-label="Diagramma scorrevole">' + svg(graph, focus, doc.unit_id) + '</div>' +
      '<p class="graph-legend">Nel grafo, tratteggio: appartenenza al documento. Frecce etichettate: relazioni del modello. ∧ E: tutte le condizioni; ∨ O: almeno una; ¬ NON: negazione. Le implicazioni sono unidirezionali. Il grafo rappresenta la lettura del parere. <a href="method.html#editorial">Criteri e provenienza</a>.</p>' +
      (focus ? '<div class="graph-related">' + doc.relations.filter(r => r.from === focus || r.to === focus).map(r =>
        '<p><button type="button" data-graph-inspect-relation="' + esc(doc.relations.indexOf(r)) + '">' + esc(short(r.from) + ' → ' + edgeLabels[r.kind] + ' → ' + short(r.to)) + '</button></p>').join('') + '</div>' : '') +
      '<div class="graph-inspector" role="region" aria-label="Dettaglio del grafo" aria-live="polite"><p>Seleziona un elemento del grafo per leggerne il dettaglio.</p></div></section>');
  }

  function inspect(panel, item, graph, isEdge) {
    panel.querySelectorAll('.graph-node,.graph-edge').forEach(e => e.classList.remove('selected'));
    const selected = Array.from(panel.querySelectorAll(isEdge ? '[data-graph-edge]' : '[data-graph-node]')).find(e => e.dataset[isEdge ? 'graphEdge' : 'graphNode'] === item.id);
    if (selected) selected.classList.add('selected');
    const title = isEdge ? edgeLabels[item.kind] : item.heading;
    const source = isEdge ? graph.nodes.find(n => n.id === item.from) : null;
    const target = isEdge ? graph.nodes.find(n => n.id === item.to) : null;
    panel.querySelector('.graph-inspector').innerHTML = SiteLocale.html('<h4>' + esc(title) + '</h4>' +
      (isEdge && source && target ? '<p class="field-help">' + esc(source.heading + ' → ' + target.heading) + '</p>' : '') +
      (item.object ? '<p><b>' + esc(item.object) + '</b></p>' : '') + '<p>' + esc(item.text) + '</p>' +
      (item.note ? '<p class="field-help">' + esc(item.note) + '</p>' : '') +
      (!isEdge && item.nucleus && !panel.dataset.graphFocusValue ? '<button type="button" class="btn" data-graph-focus="' + esc(item.nucleus) + '">Apri le qualificazioni di ' + esc(short(item.nucleus)) + '</button>' : '') +
      '<div class="opinion-evidence">' + evidence(item.evidence, panel.dataset.graphDocument) + '</div>');
  }

  document.addEventListener('click', event => {
    const panel = event.target.closest('.opinion-graph');
    if (!panel) return;
    const doc = SiteLocale.opinion(docs.find(d => d.unit_id === panel.dataset.graphDocument));
    if (!doc || doc.source_status !== 'current') return;
    const focus = event.target.closest('[data-graph-focus]');
    if (focus) { panel.outerHTML = render(doc, focus.dataset.graphFocus); return; }
    const graph = model(doc, panel.dataset.graphFocusValue);
    const node = event.target.closest('[data-graph-node]'), edge = event.target.closest('[data-graph-edge]');
    if (node) inspect(panel, graph.nodes.find(n => n.id === node.dataset.graphNode), graph, false);
    if (edge) inspect(panel, graph.edges.find(e => e.id === edge.dataset.graphEdge), graph, true);
    const related = event.target.closest('[data-graph-inspect-relation]');
    if (related) {
      const r = doc.relations[Number(related.dataset.graphInspectRelation)];
      inspect(panel, { ...r, id: '', evidence: r.evidence }, graph, true);
    }
    const zoom = event.target.closest('[data-graph-zoom]');
    if (zoom) {
      const chart = panel.querySelector('svg');
      chart.style.width = zoom.dataset.graphZoom === 'fit' ? '100%' : chart.dataset.naturalWidth + 'px';
      chart.style.maxWidth = zoom.dataset.graphZoom === 'fit' ? '100%' : 'none';
    }
    if (event.target.closest('[data-graph-download]')) {
      const chart = panel.querySelector('svg').cloneNode(true);
      chart.removeAttribute('style');
      chart.querySelectorAll('.selected').forEach(n => n.classList.remove('selected'));
      const content = new XMLSerializer().serializeToString(chart);
      const url = URL.createObjectURL(new Blob([content], {type: 'image/svg+xml;charset=utf-8'}));
      const link = document.createElement('a'); link.href = url;
      link.download = doc.unit_id + (panel.dataset.graphFocusValue ? '-' + short(panel.dataset.graphFocusValue) : '-nuclei') + '.svg';
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    }
  });
  document.addEventListener('keydown', e => {
    const target = e.target.closest('.graph-node,.graph-edge');
    if (target && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault(); target.dispatchEvent(new MouseEvent('click', {bubbles:true}));
    }
  });
  window.OpinionGraph = { model, render, layout };
})();
