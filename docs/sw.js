/* Risposte reg. 142 — offline cache. Network-first: deploys propagate on reload; cache is the offline fallback. */
const VERSION = "r142-release-2026-09-16-v4";
const CORE = ["./","index.html","register.html","unit.html","names.html","model.html","about.html","method.html","corpus.html","decision.html","data.html","dataset-journal.html",
 "assets/english.js?v=20260916-editorial1","assets/site-locale.js?v=20260916-release3","assets/style.css?v=20260916-mobile","assets/app.js?v=20260916-release3","assets/i18n.js?v=20260916-release3",
 "assets/opinion-glyphs.js?v=20260916-release3","assets/opinion-graph.js?v=20260916-release3","assets/reading.js?v=20260916-release3","assets/release-info.js",
 "data/units.js","data/qualified_opinions.js","data/abbreviations.js","data/gaps.js","data/hypo.js","data/names_authority.js","data/journal.js","assets/script/words.js",
 "assets/maps/mediterranean.js?v=20260916-atlas","assets/places-map.js?v=20260916-release3b","assets/places-map.css?v=20260916-atlas","assets/leaflet/leaflet.css","assets/leaflet/leaflet.js","assets/fonts/EBGaramond[wght].ttf","assets/fonts/EBGaramond-Italic[wght].ttf",
 "assets/fonts/IBMPlexMono-Regular.ttf","assets/fonts/IBMPlexMono-Medium.ttf","assets/fonts/IBMPlexMono-SemiBold.ttf"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("r142-")&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET"||new URL(e.request.url).origin!==self.location.origin)return;
 e.respondWith(fetch(e.request).then(res=>{
  if(res.ok){const cp=res.clone();e.waitUntil(caches.open(VERSION).then(c=>c.put(e.request,cp)));}return res;
 }).catch(()=>caches.match(e.request)))});
