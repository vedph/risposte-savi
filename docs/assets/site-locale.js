/* English presentation layer. Canonical texts, evidence, identifiers and exports
   are never translated or mutated. Translations are versioned in data/i18n/en.json. */
(function () {
  'use strict';
  const dictionary = window.SITE_EN || {};
  const language = () => window.I18N ? I18N.lang() : 'en';
  const escapeRE = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keys = Object.keys(dictionary).filter(k => k !== dictionary[k]).sort((a,b) => b.length-a.length);
  const phrases = new RegExp('(?<![\\p{L}\\p{N}_])(?:' + keys.map(escapeRE).join('|') + ')(?![\\p{L}\\p{N}_])', 'gu');
  function text(value) {
    if (typeof value !== 'string' || language() !== 'en') return value;
    if (Object.hasOwn(dictionary, value)) return dictionary[value];
    return value.replace(phrases, match => dictionary[match]);
  }
  function expression(e) {
    if (e.op === 'atom') return e.text;
    if (e.op === 'not') return 'NOT (' + expression(e.operand) + ')';
    return '(' + e.operands.map(expression).join(e.op === 'all_of' ? ' AND ' : ' OR ') + ')';
  }
  const displayFields = new Set(['title','object','proposition','text','note','label','coverage_note']);
  function opinion(source) {
    if (!source || language() !== 'en') return source;
    function copy(value, key) {
      // Evidence is verbatim: keep quotations, Unicode offsets and hashes together.
      if (key === 'evidence' || key === 'simple') return value;
      if (Array.isArray(value)) return value.map(v => copy(v));
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,copy(v,k)]));
      return displayFields.has(key) ? text(value) : value;
    }
    const doc = copy(source);
    if (source.simple) doc.simple = {...source.simple, voice:doc.voice.label,
      nuclei:doc.nuclei.map(n=>{
        const q=n.qualifications, c=q.condition;
        let summary=n.proposition;
        if(c) summary=c.relation==='if_then' ? 'IF '+expression(c.expression)+' → THEN: '+summary : summary+' SUBJECT TO: '+expression(c.expression)+'.';
        for(const [key,label] of [['exceptions','Exceptions'],['scope','Scope clarifications']])
          if(q[key] && q[key].length) summary+=' '+label+': '+q[key].map(s=>s.text).join(' ');
        return {...source.simple.nuclei.find(s=>s.id===n.id),object:n.object,voice:(n.voice||doc.voice).label,summary};
      }), relations:doc.relations.map(({from,to,kind,text})=>({from,to,kind,text}))};
    return doc;
  }
  function title(unit, fallback) {
    const doc=(window.QUALIFIED_OPINIONS || {documents:[]}).documents.find(d=>d.unit_id===unit.unit_id);
    // Editorial titles are shown in square brackets, in both languages; the marginal note stays in the record.
    return doc ? '[' + text(doc.title) + ']' : (fallback || unit.title_short || unit.unit_id);
  }
  // Legacy templates have both bilingual spans and unmarked interface strings.
  // Translate only presentation text. User inputs and documentary layers are excluded.
  const protectedSelector='script,style,textarea,input,code,pre,blockquote,[translate="no"],[data-reading-source],.cx-diplo,.htrq,.prov,.chip,.roster,.xit,.li,.ex';
  const textState=new WeakMap(), attrState=new WeakMap();
  function translateNode(node) {
    const parent=node.parentElement;
    if(!parent || parent.closest(protectedSelector) || parent.closest('svg.opinion-svg')) return;
    let state=textState.get(node);
    if(!state || node.data!==state.painted) state={original:node.data};
    state.painted=text(state.original);textState.set(node,state);
    if(node.data!==state.painted) node.data=state.painted;
  }
  function translateDOM(root) {
    if(!root) return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) translateNode(walker.currentNode);
    const elements=[...(root.nodeType===1?[root]:[]),...root.querySelectorAll('[title],[aria-label],[placeholder]')];
    for(const el of elements){
      if(el.id==='langbtn'||el.closest('script,style,[translate="no"],.xit,.li')) continue;
      let state=attrState.get(el)||{};
      for(const name of ['title','aria-label','placeholder']){
        if(!el.hasAttribute(name))continue;
        const value=el.getAttribute(name), old=state[name];
        const original=old && old.painted===value ? old.original : value;
        const painted=text(original);state[name]={original,painted};
        if(value!==painted)el.setAttribute(name,painted);
      }
      attrState.set(el,state);
    }
  }
  function html(markup) {
    const template=document.createElement('template');template.innerHTML=markup;
    translateDOM(template.content);return template.innerHTML;
  }
  window.SiteLocale={text,opinion,title,html,translateDOM};
  let pending=false;
  function schedule(){if(pending)return;pending=true;queueMicrotask(()=>{pending=false;if(typeof document!=='undefined' && document && document.body) translateDOM(document.body);});}
  document.addEventListener('DOMContentLoaded',()=>{
    translateDOM(document.body);
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});
  });
  document.addEventListener('langchange',schedule);
})();
