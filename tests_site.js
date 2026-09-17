/* DOM regression tests; external resources are blocked for deterministic offline runs. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = __dirname;
const data = JSON.parse(fs.readFileSync(path.join(root, 'docs/data/units.json')));

async function load(file, query = '', override, language = 'en', prepare) {
  const errors = [];
  class LocalResources extends ResourceLoader {
    fetch(url, options) {
      if (!url.startsWith('file:')) return null;
      if (override && url.endsWith('/data/units.js')) {
        return Promise.resolve(Buffer.from('window.RISPOSTE=' + JSON.stringify(override)));
      }
      return super.fetch(url, options);
    }
  }
  const console = new VirtualConsole();
  console.on('jsdomError', e => errors.push(e.message));
  const filename = path.join(root, file);
  const storage = new Map([['r142-lang', language]]);
  const dom = await JSDOM.fromFile(filename, {
    url: pathToFileURL(filename).href + query,
    runScripts: 'dangerously', resources: new LocalResources(), virtualConsole: console,
    pretendToBeVisual: true,
    beforeParse(w) {
      w.HTMLElement.prototype.scrollIntoView = function() {};
      Object.defineProperty(w.crypto, 'subtle', {value:require('node:crypto').webcrypto.subtle});
      w.TextEncoder = TextEncoder;
      Object.defineProperty(w, 'localStorage', { value: { getItem: k => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k), clear: () => storage.clear() } });
      if (prepare) prepare(w);
    }
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Page load timed out: ' + file)), 5000);
    if (dom.window.document.readyState === 'complete') { clearTimeout(timer); resolve(); }
    else dom.window.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
  });
  return { dom, d: dom.window.document, w: dom.window, errors };
}

for (const base of ['docs/']) {
  test(base + 'register renders every released unit; search and selection work', async t => {
    const { dom, d, w, errors } = await load(base + 'register.html');
    t.after(() => dom.window.close());
    assert.equal(d.querySelectorAll('.rows .rowwrap').length, data.units.length);
    assert.equal(d.querySelectorAll('.rows svg.glyph').length, data.units.length);
    const rows = d.querySelectorAll('.rows .row');
    rows[5].click();
    assert.equal(d.querySelector('#reg-record .record .id').textContent.trim(), rows[5].dataset.uid);
    const input = d.querySelector('.toolbar .search');
    input.value = 'THIS_CANNOT_MATCH_ANY_UNIT';
    input.dispatchEvent(new w.Event('input', { bubbles: true }));
    assert.equal(d.querySelectorAll('.rows .row:not(.dim)').length, 0);
    assert.deepEqual(errors, []);
  });
}

test('permalinks render all current records without exceptions', async t => {
  for (const unit of data.units) {
    const { dom, d, errors } = await load('docs/unit.html', '?u=' + unit.unit_id);
    try {
      assert.equal(d.querySelector('#unit-record .record .id').textContent.trim(), unit.unit_id);
      const position = data.units.indexOf(unit);
      assert.equal(d.querySelectorAll('#unit-nav a').length, 1 + (position > 0 ? 1 : 0) + (position < data.units.length - 1 ? 1 : 0));
      const prev = d.querySelector('#unit-nav [rel="prev"]'), next = d.querySelector('#unit-nav [rel="next"]');
      if (prev) assert.equal(new URL(prev.href).searchParams.get('u'), data.units[position - 1].unit_id);
      if (next) assert.equal(new URL(next.href).searchParams.get('u'), data.units[position + 1].unit_id);
      for (const link of d.querySelectorAll('.reader-toc a')) assert.ok(d.getElementById(link.hash.slice(1)), unit.unit_id + link.hash);
      for (const link of d.querySelectorAll('[data-public-source]')) {
        const field = /^#source-(.+)-\d+-\d+-[a-f0-9]{64}$/.exec(link.hash)[1];
        assert.equal(d.querySelector('[data-reading-source="' + field + '"]')?.textContent, unit[field], unit.unit_id + ' ' + field);
      }
      assert.deepEqual(errors, [], unit.unit_id);
    } finally { dom.window.close(); }
  }
});

test('unknown permalink reports missing record safely', async () => {
  const { dom, d, errors } = await load('docs/unit.html', '?u=%22%3E%3Cscript%3E');
  try { assert.equal(d.querySelectorAll('#unit-record script').length, 0); assert.deepEqual(errors, []); }
  finally { dom.window.close(); }
});

test('connected opinions expose documentary and editorial cross-references', async t => {
  const linked = await load('docs/unit.html', '?u=R142_0064', undefined, 'en');
  t.after(() => linked.dom.window.close());
  const block = linked.d.querySelector('.related-opinions');
  assert.ok(block);
  assert.match(block.textContent, /R142_0061/);
  assert.equal(block.querySelector('a[href="unit.html?u=R142_0061"]')?.textContent.includes('R142_0061'), true);
  const note = await load('docs/unit.html', '?u=R142_0037', undefined, 'it');
  t.after(() => note.dom.window.close());
  assert.match(note.d.querySelector('.related-opinions')?.textContent || '', /R142_0051/);
});

test('graphs cover every nucleus and qualification without inventing relations', async t => {
  const { dom, w, errors } = await load('docs/unit.html', '?u=R142_0012');
  t.after(() => dom.window.close());
  let covered = 0;
  for (const doc of w.QUALIFIED_OPINIONS.documents) {
    const overview = w.OpinionGraph.model(doc, '');
    assert.equal(overview.nodes.filter(n => n.kind === 'nucleus').length, doc.nuclei.length);
    assert.equal(overview.edges.filter(e => e.kind === 'contains').length, doc.nuclei.length);
    assert.equal(overview.edges.filter(e => e.kind !== 'contains').length, doc.relations.length);
    for (const r of doc.relations) assert.ok(overview.edges.some(e => e.from === r.from && e.to === r.to && e.kind === r.kind && e.text === r.text));
    for (const n of doc.nuclei) {
      covered++;
      const g = w.OpinionGraph.model(doc, n.id), ids = new Set(g.nodes.map(x => x.id));
      assert.equal(ids.size, g.nodes.length);
      assert.ok(g.edges.every(e => ids.has(e.from) && ids.has(e.to)));
      const core = g.nodes.find(x => x.id === n.id);
      assert.equal(core.force, n.force);
      assert.equal(core.conditional, !!n.qualifications.condition);
      assert.equal(core.proposition, n.proposition);
      for (const kind of ['grounds', 'references', 'scope', 'exceptions']) {
        assert.equal(g.nodes.filter(x => x.kind === kind).length, (n.qualifications[kind] || []).length);
        assert.equal(g.edges.filter(e => e.kind === kind && e.to === n.id).length, (n.qualifications[kind] || []).length);
      }
      if (n.qualifications.condition) {
        const c = n.qualifications.condition;
        const e = g.edges.find(e => e.kind === c.relation);
        assert.equal(e.to, n.id);
        assert.equal(g.nodes.find(x => x.id === e.from).op, c.expression.op);
      }
      const placed = w.OpinionGraph.layout(g, n.id);
      for (const box of placed.nodes) {
        assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.w <= placed.width && box.y + box.h <= placed.height);
        const expected = box.kind === 'nucleus' ? box.proposition : box.text;
        assert.equal(box.bodyLines.join('').replace(/\s/g, ''), expected.replace(/\s/g, ''), box.id + ': complete text');
        assert.ok(box.bodyY + (box.bodyLines.length - 1) * 21 + 5 < box.h, box.id + ': text fits vertically');
        for (const other of placed.nodes.filter(other => other.id !== box.id)) {
          assert.ok(box.x + box.w <= other.x || other.x + other.w <= box.x ||
            box.y + box.h <= other.y || other.y + other.h <= box.y, box.id + ': no overlapping boxes');
        }
      }
    }
    assert.equal(w.OpinionGraph.model({...doc, source_status:'stale'}, '').nodes.length, 0);
  }
  assert.equal(covered, w.QUALIFIED_OPINIONS.summary.nuclei);
  assert.equal(w.QUALIFIED_OPINIONS.documents.length, data.units.length);
  assert.deepEqual(errors, []);
});

test('public glyphs count nuclei without replacing them with a single stance', async t => {
  const {dom,d,w,errors} = await load('docs/register.html');
  t.after(() => dom.window.close());
  w.I18N.set('it');
  for (const doc of w.QUALIFIED_OPINIONS.documents) {
    const glyph = d.querySelector('.row[data-uid="' + doc.unit_id + '"] svg.glyph');
    assert.equal(Number(glyph.querySelector('[data-nuclei-count]').dataset.nucleiCount), doc.nuclei.length);
    assert.match(glyph.getAttribute('aria-label'), /nucle(?:us|i)/);
    assert.doesNotMatch(glyph.getAttribute('aria-label'), /decision hypothesis/);
  }
  d.querySelector('.row[data-uid="R142_0011"]').click();
  assert.equal(d.querySelectorAll('.public-nucleus').length, 4);
  const predicted = d.querySelector('[data-public-nucleus="R142_0011-N3"]');
  assert.match(predicted.querySelector('summary').textContent, /Previsione/);
  assert.match(predicted.querySelector('svg').getAttribute('aria-label'), /condizionato/);
  predicted.querySelector('[data-public-graph-focus]').click();
  assert.equal(d.querySelector('.public-graph').open, true);
  assert.equal(d.querySelector('.opinion-graph').dataset.graphFocusValue, 'R142_0011-N3');
  d.querySelector('.graph-edge.if_then').dispatchEvent(new w.MouseEvent('click', {bubbles:true}));
  assert.match(d.querySelector('.graph-inspector').textContent, /Previsione|previsione/);
  assert.ok(d.querySelector('.graph-inspector blockquote'));
  assert.equal(d.querySelector('.graph-inspector [data-opinion-source]'), null);
  assert.ok(d.querySelector('.graph-inspector [data-public-source]'));
  assert.deepEqual(errors, []);
});

async function until(predicate) {
  const deadline = Date.now() + 2500;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Reader did not reach expected state');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

test('public reader follows source links, preserves the text, and returns keyboard focus', async t => {
  const {dom,d,w,errors} = await load('docs/unit.html', '?u=R142_0011');
  t.after(() => dom.window.close());
  w.I18N.set('it');
  const unit = data.units.find(u => u.unit_id === 'R142_0011');
  const card = d.getElementById('R142_0011-N2'); card.open = true;
  const link = card.querySelector('[data-public-source]');
  d.querySelector('[data-v="e"]').click();
  assert.equal(d.querySelector('[data-v="e"]').getAttribute('aria-pressed'), 'true');
  link.click();
  await until(() => d.querySelector('.source-highlight') && d.activeElement === d.querySelector('.source-highlight'));
  const block = d.querySelector('[data-reading-source="text_diplomatic"]');
  assert.equal(block.textContent, unit.text_diplomatic);
  assert.equal(d.querySelector('.source-highlight').textContent, card.querySelector('blockquote').textContent);
  assert.equal(d.activeElement, d.querySelector('.source-highlight'));
  assert.equal(d.querySelector('[data-v="d"]').getAttribute('aria-pressed'), 'true');
  assert.equal(d.querySelector('.bq-e').style.display, 'none');
  d.querySelector('.source-return').click();
  assert.equal(d.activeElement, link);
  // A repeat navigation unwraps the earlier mark without duplicating or losing source text.
  d.querySelector('[data-public-nucleus="R142_0011-N3"] [data-public-source]').click();
  await until(() => d.querySelector('.source-highlight')?.textContent.includes('mi rendo sicuro'));
  assert.equal(block.textContent, unit.text_diplomatic);
  assert.equal(d.querySelectorAll('.source-highlight').length, 1);
  w.I18N.set('en');
  await until(() => d.querySelector('.source-highlight'));
  assert.match(d.querySelector('.public-nucleus small').textContent, /Recommendation/);
  assert.equal(d.querySelector('[data-reading-source="text_diplomatic"]').textContent, unit.text_diplomatic);
  assert.deepEqual(errors, []);
});

test('public source permalinks open regests and annexes in their own text layer', async t => {
  for (const [uid, field] of [['R142_0001','regest_note'], ['R142_0035','text_annex']]) {
    const {dom,d,w,errors} = await load('docs/unit.html', '?u=' + uid);
    try {
      const link = d.querySelector('[data-public-source][href*="source-' + field + '-"]');
      assert.ok(link);
      w.location.hash = new URL(link.href).hash;
      await until(() => d.querySelector('.source-highlight'));
      const block = d.querySelector('[data-reading-source="' + field + '"]');
      assert.equal(block.textContent, data.units.find(u => u.unit_id === uid)[field]);
      assert.ok(block.contains(d.querySelector('.source-highlight')));
      if (field === 'text_annex') assert.equal(block.closest('details').open, true);
      assert.deepEqual(errors, []);
    } finally { dom.window.close(); }
  }
});

test('public reader rejects a changed source even if the cited passage still matches', async t => {
  const fixture = structuredClone(data);
  fixture.units.find(u => u.unit_id === 'R142_0011').text_diplomatic += ' altered ending';
  const {dom,d,w,errors} = await load('docs/unit.html', '?u=R142_0011', fixture);
  t.after(() => dom.window.close());
  d.querySelector('[data-public-source]').click();
  await until(() => /does not match/.test(d.querySelector('.reader-status').textContent));
  assert.equal(d.querySelector('.source-highlight'), null);
  assert.equal(d.querySelector('.source-return'), null);
  assert.deepEqual(errors, []);
});

test('public reader honors code-point offsets across Unicode and editorial markup', async t => {
  const fixture = structuredClone(data);
  const source = '𐀀 «testo» La S[ereni]tà V[ostra] decide. altra fine';
  fixture.units.find(u => u.unit_id === 'R142_0011').text_diplomatic = source;
  const {dom,d,w,errors} = await load('docs/unit.html', '?u=R142_0011', fixture);
  t.after(() => dom.window.close());
  const q = w.QUALIFIED_OPINIONS.documents.find(doc => doc.unit_id === 'R142_0011').nuclei[0].evidence[0];
  const quote = 'S[ereni]tà V[ostra] decide';
  Object.assign(q, {quote, source_sha256:require('node:crypto').createHash('sha256').update(source).digest('hex'),
    span_start:Array.from(source.slice(0, source.indexOf(quote))).length});
  q.span_end = q.span_start + Array.from(quote).length;
  w.location.hash = '#source-text_diplomatic-' + q.span_start + '-' + q.span_end + '-' + q.source_sha256;
  await until(() => d.querySelector('.source-highlight'));
  assert.equal(d.querySelector('.source-highlight').textContent, quote);
  assert.equal(d.querySelector('[data-reading-source]').textContent, source);
  assert.ok(d.querySelector('.source-highlight .ednote'));
  // A bookmarked earlier revision cannot silently resolve against a newer one.
  w.location.hash = '#source-text_diplomatic-' + q.span_start + '-' + q.span_end + '-' + '0'.repeat(64);
  await until(() => /does not match/.test(d.querySelector('.reader-status').textContent));
  assert.equal(d.querySelector('.source-highlight'), null);
  assert.equal(d.querySelector('[data-reading-source]').textContent, source);
  assert.deepEqual(errors, []);
});

test('public reading uses editorial language while provenance and uncertainty survive', async t => {
  const {dom,d,w,errors} = await load('docs/unit.html', '?u=R142_0011');
  t.after(() => dom.window.close());
  w.I18N.set('it');
  const record = d.querySelector('.record');
  assert.doesNotMatch(record.textContent, /prassi stretta|in attesa di|in validazione|ground truth/i);
  assert.match(record.textContent, /Scioglimenti delle abbreviazioni/);
  assert.match(record.textContent, /Isabella Cecchini/);
  assert.ok(record.querySelector('a[href="method.html#editorial"]'));
  assert.match(record.querySelector('.diplo-main').textContent, /\(\?\)/);
  assert.ok(w.QUALIFIED_OPINIONS.documents.every(doc => doc.status === 'proposed'));
  assert.deepEqual(errors, []);
});

test('reviewed analytical value receives an explicit validated label', async () => {
  const fixture = structuredClone(data);
  const unit = fixture.units.find(u => u.hyp.decision_orientation);
  unit.hyp.decision_orientation.status = 'validated';
  const { dom, d, errors } = await load('docs/unit.html', '?u=' + unit.unit_id, fixture);
  try {
    assert.match(d.querySelector('.validated-value').textContent, /validated|validato/);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('corpus preserves documentary text without retired carry repairs', async () => {
  const unit = data.units.find(u => u.unit_id === 'R142_0008');
  const { dom, d, w, errors } = await load('docs/corpus.html', '#' + unit.unit_id);
  try {
    assert.equal(d.querySelector('.cx-detail .cx-diplo').textContent, unit.text_diplomatic);
    assert.equal(d.querySelectorAll('tr.cx-u').length, data.units.length);
    assert.equal(d.querySelectorAll('tr.cx-g').length, 0);
    d.querySelector('#cxg').checked = true;
    d.querySelector('#cxg').dispatchEvent(new w.Event('change'));
    assert.equal(d.querySelectorAll('tr.cx-g').length, data.meta.n_gap_rows);
    assert.match(d.querySelector('#cxsum').textContent, new RegExp(String(data.meta.reference_coverage.covered_numbers)));
    assert.doesNotMatch(d.querySelector('#cxsum').textContent, /%|copertura minima|minimum coverage/);
    assert.match(d.querySelector('#foliation-context').textContent, /digitalizzazioni|digitisations/);
    assert.match(d.querySelector('tr[data-uid="R142_0040"]').textContent, /86v-89r/);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('public coverage distinguishes a selected corpus from the physical register', async t => {
  for (const page of ['index.html', 'data.html', 'unit.html?u=R142_0001']) {
    const [file, query] = page.split('?');
    const {dom, d, errors} = await load('docs/' + file, query ? '?' + query : '');
    t.after(() => dom.window.close());
    assert.deepEqual(errors, []);
    if (file === 'index.html') {
      assert.doesNotMatch(d.querySelector('#figures').textContent, /coverage|copertura|gap rows|lacune/);
      assert.match(d.querySelector('#figures').textContent, new RegExp(String(data.units.length)));
    } else if (file === 'data.html') {
      assert.doesNotMatch(d.querySelector('main').textContent, /%|89\/192|97\/192|revisione assistita|Istantanea|Snapshot/);
      assert.match(d.querySelector('main').textContent, /documentary\.csv/);
    } else {
      assert.equal(d.querySelector('.foliation-note'), null);
      assert.doesNotMatch(d.querySelector('.record').textContent, /repertorio di lavoro|working index/);
    }
  }
});

for (const page of ['index.html', 'names.html', 'data.html', 'model.html', 'decision.html', 'dataset-journal.html', 'method.html']) {
  test(page + ' loads without script errors', async () => {
    const { dom, d, errors } = await load('docs/' + page);
    try {
      assert.deepEqual(errors, []);
      assert.ok(d.querySelector('main'));
      if (page === 'model.html') assert.match(d.querySelector('[data-release-summary]').textContent, /selezione del registro/);
    } finally { dom.window.close(); }
  });
}

test('transcription filter uses current states and search exposes count/clear', async () => {
  const { dom, d, w, errors } = await load('docs/register.html');
  try {
    let filter = d.querySelector('[data-filter="transcription"]');
    filter.value = 'manual_full';
    filter.dispatchEvent(new w.Event('change', {bubbles:true}));
    assert.equal(d.querySelectorAll('.row:not(.dim)').length, data.units.filter(u=>u.transcription_status==='manual_full').length);
    d.querySelector('.clear').click();
    const input = d.querySelector('.search');
    input.value = 'R142_0015'; input.dispatchEvent(new w.Event('input'));
    assert.equal(d.querySelectorAll('.row:not(.dim)').length, 1);
    assert.equal(d.querySelector('.count').textContent, '1/' + data.units.length);
    assert.equal(d.querySelector('.clear').hidden, false);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('new unanalysed unit does not break the register', async () => {
  const fixture = structuredClone(data);
  fixture.units.push({unit_id:'R142_9999',title_short:'New unit',transcription_status:'manual_partial',
    hyp:{},terms:{deontic:[],fiscal:[],monetary:[],institutions:[]},places:[],persons_hyp:[],signatories:[],reliability:'F',folio_sides:['100v']});
  const { dom, d, errors } = await load('docs/register.html', '?u=R142_9999', fixture);
  try {
    assert.equal(d.querySelectorAll('.row').length, fixture.units.length);
    assert.equal(d.querySelector('#reg-record .record .id').textContent.trim(), 'R142_9999');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('English covers every interpretative field without modifying source evidence or the canonical model', async t => {
  const {dom,d,w,errors}=await load('docs/unit.html','?u=R142_0011');t.after(()=>dom.window.close());
  const before=JSON.stringify(w.QUALIFIED_OPINIONS), keys=new Set(['title','object','proposition','text','note','label','coverage_note']);
  let fields=0;
  function compare(original,translated,key){
    if(key==='evidence'){assert.equal(JSON.stringify(translated),JSON.stringify(original));return;}
    if(key==='simple')return;
    if(Array.isArray(original)){original.forEach((v,i)=>compare(v,translated[i]));return;}
    if(original && typeof original==='object'){Object.keys(original).forEach(k=>compare(original[k],translated[k],k));return;}
    if(keys.has(key)&&typeof original==='string'){
      assert.ok(Object.hasOwn(w.SITE_EN,original),'Missing English: '+original);
      assert.equal(translated,w.SITE_EN[original]);fields++;
    }else assert.equal(translated,original);
  }
  for(const doc of w.QUALIFIED_OPINIONS.documents){
    const translated=w.SiteLocale.opinion(doc);compare(doc,translated);
    for(const n of translated.nuclei){
      const summary=translated.simple.nuclei.find(s=>s.id===n.id).summary;
      if(n.qualifications.condition)assert.match(summary,/IF|SUBJECT TO/);
      const graph=w.OpinionGraph.layout(w.OpinionGraph.model(translated,n.id),n.id);
      for(const box of graph.nodes){assert.ok(box.y+box.h<=graph.height);assert.ok(box.bodyY+(box.bodyLines.length-1)*21+5<box.h);}
    }
  }
  assert.ok(fields>1000);assert.equal(JSON.stringify(w.QUALIFIED_OPINIONS),before);
  assert.match(d.querySelector('.public-nuclei').textContent,/Soranzo predicts/);
  assert.equal(d.querySelector('[data-reading-source="text_diplomatic"]').textContent,data.units.find(u=>u.unit_id==='R142_0011').text_diplomatic);
  w.I18N.set('it');await new Promise(r=>setImmediate(r));
  assert.match(d.querySelector('.public-nuclei').textContent,/Soranzo prevede/);
  w.I18N.set('en');await new Promise(r=>setImmediate(r));
  assert.match(d.querySelector('.public-nuclei').textContent,/Soranzo predicts/);
  assert.deepEqual(errors,[]);
});

test('names map renders local land and source-linked markers',async t=>{
  const {dom,d,w,errors}=await load('docs/names.html','',undefined,'en',w=>{w.SVGSVGElement.prototype.createSVGRect=function(){return {};};});
  t.after(()=>dom.window.close());
  assert.ok(w.RISPOSTE_ATLAS.land.features.length>100);
  assert.ok(w.RISPOSTE_ATLAS.lakes.features.length>0);
  assert.ok(!d.querySelector('#map').classList.contains('off'));
  assert.equal(d.querySelectorAll('#map [role="button"]').length,25);
  assert.ok(d.querySelectorAll('#map img.leaflet-tile').length>=0);
  assert.equal(d.querySelector('.atlas-count').textContent,'23 mapped places');
  assert.equal(d.querySelector('[data-map-view]'),null);
  const marker=d.querySelector('#map [aria-label^="Narenta:"]');
  marker.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  assert.match(d.querySelector('.leaflet-popup-content').textContent,/Narenta/);
  assert.equal(new URL(d.querySelector('.leaflet-popup-content a').href).searchParams.get('u'),'R142_0011');
  w.I18N.set('it');
  assert.equal(d.querySelectorAll('#map [role="button"]').length,25);
  assert.equal(d.querySelectorAll('.leaflet-container').length,1);
  assert.equal(d.querySelector('.atlas-count').textContent,'23 luoghi sulla mappa');
  assert.deepEqual(errors,[]);
});

test('corpus record buttons open and close their source reader accessibly',async t=>{
  const {dom,d,w,errors}=await load('docs/corpus.html');t.after(()=>dom.window.close());
  let button=d.querySelector('.cx-unit-link');
  assert.equal(button.tagName,'BUTTON');assert.equal(button.getAttribute('aria-expanded'),'false');
  const changed=new Promise(resolve=>w.addEventListener('hashchange',resolve,{once:true}));
  button.click();await changed;assert.ok(d.querySelector('.cx-detail'));assert.equal(button.getAttribute('aria-expanded'),'true');
  w.I18N.set('it');button=d.querySelector('.cx-unit-link');
  assert.ok(d.querySelector('.cx-detail'));assert.equal(button.getAttribute('aria-expanded'),'true');
  button.click();assert.equal(d.querySelector('.cx-detail'),null);assert.equal(button.getAttribute('aria-expanded'),'false');
  assert.deepEqual(errors,[]);
});

test('story links select English over a saved Italian preference and preserve record anchors',async t=>{
  const {dom,d,w,errors}=await load('docs/unit.html','?u=R142_0011&lang=en#opinion-nuclei',undefined,'it');
  t.after(()=>dom.window.close());
  assert.equal(w.I18N.lang(),'en');assert.equal(w.localStorage.getItem('r142-lang'),'en');
  w.I18N.set('it');
  assert.equal(new URL(w.location.href).searchParams.get('u'),'R142_0011');
  assert.equal(w.location.hash,'#opinion-nuclei');
  w.I18N.set('invalid');assert.equal(w.I18N.lang(),'it');
  assert.deepEqual(errors,[]);
});

test('language toggle updates an explicit web language link without losing its record or anchor',t=>{
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.org/unit.html?u=R142_0011&lang=en#opinion-nuclei',runScripts:'outside-only'});
  t.after(()=>dom.window.close());
  dom.window.eval(fs.readFileSync(path.join(root,'docs/assets/i18n.js'),'utf8'));
  dom.window.I18N.set('it');
  assert.equal(dom.window.location.href,'https://example.org/unit.html?u=R142_0011&lang=it#opinion-nuclei');
});

for(const page of ['index','register','unit','names','model','about','method','corpus','decision','data','dataset-journal']){
  test(page+' English/Italian toggle loads both languages without changing source blocks',async t=>{
    const {dom,d,w,errors}=await load('docs/'+page+'.html','?u=R142_0011');t.after(()=>dom.window.close());
    assert.equal(w.I18N.lang(),'en');
    const sources=()=>Array.from(d.querySelectorAll('[data-reading-source]')).map(n=>n.textContent);
    const before=sources();
    w.I18N.set('it');await new Promise(r=>setImmediate(r));assert.equal(d.documentElement.lang,'it');
    w.I18N.set('en');await new Promise(r=>setImmediate(r));assert.equal(d.documentElement.lang,'en');
    assert.deepEqual(sources(),before);assert.deepEqual(errors,[]);
  });
}

test('revision notes and corrections stay in the data and are not rendered on the record', async () => {
  const { dom, d, errors } = await load('docs/unit.html', '?u=R142_0048', undefined, 'it');
  try {
    assert.equal(d.querySelector('.llmnotes'), null);
    assert.doesNotMatch(d.body.textContent, /LLM|in validazione|ipotesi da validare|Revisione sulle digitalizzazioni|lettura precedente/);
    const ed = d.querySelector('.ednotes');
    if (ed) assert.doesNotMatch(ed.textContent, /LLM/);
    assert.match(d.querySelector('.spine').textContent, /1609-05-25/);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
