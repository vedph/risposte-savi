const { JSDOM } = require("jsdom");
const path = require("path");
const fs = require("fs");
const R = p => "file://" + path.resolve(p);
function load(file, url) {
  return JSDOM.fromFile(file, { runScripts: "dangerously", resources: "usable",
    pretendToBeVisual: true, url: url || R(file) });
}
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? "  ok " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  // A) register
  let d = (await load("register.html")).window.document;
  await wait(1200);
  ok(d.querySelectorAll(".rows .rowwrap").length === 53, "register: 53 rows");
  ok(d.querySelectorAll(".rows svg.glyph").length === 53, "register: 53 glyphs");
  ok(!!d.querySelector("#reg-record .record"), "register: inline record rendered");
  ok(d.querySelector("#reg-record .record .id").textContent.trim() === "R142_0001", "register: first unit selected");
  ok(!!d.querySelector(".toolbar .search"), "register: search input");
  ok(d.querySelectorAll(".toolbar select").length === 5, "register: 5 filters");
  ok(d.querySelectorAll(".keystrip .kk").length === 6, "register: key strip 6 items");
  // language toggle
  const w = d.defaultView;
  const before = d.documentElement.getAttribute("data-lang");
  w.I18N.set(before === "it" ? "en" : "it");
  await wait(300);
  ok(d.documentElement.getAttribute("data-lang") !== before, "i18n: data-lang toggles");
  ok(w.I18N.t("register") === (d.documentElement.getAttribute("data-lang") === "it" ? "Registro" : "Register"), "i18n: dict resolves");
  // row click -> record changes
  const btn = d.querySelectorAll(".rows .row")[5];
  btn.dispatchEvent(new w.Event("click", { bubbles: true }));
  await wait(250);
  ok(d.querySelector("#reg-record .record .id").textContent.trim() === btn.getAttribute("data-uid"), "register: click selects unit " + btn.getAttribute("data-uid"));
  ok(d.querySelector("#reg-record .record").innerHTML.indexOf("[object") < 0, "register: no [object Object]");
  ok(!!d.querySelector("#reg-record .hyptag"), "record: hypothesis tags present");
  fs.writeFileSync("snap_register.html", "<!doctype html>\n" + d.documentElement.outerHTML);

  // B) index
  d = (await load("index.html")).window.document;
  await wait(1500);
  ok(d.querySelectorAll("#read-anatomy .aa-dot").length === 5, "home: anatomy has 5 college dots");
  ok(d.querySelectorAll("#home-stats span").length === 4, "home: 4 stats");
  const leads = d.querySelectorAll(".hero-lead .xen");
  ok(leads.length >= 3 && [...leads].some(x => x.textContent.indexOf("as a structured research dataset") > -1), "home: prototype lead paragraphs in place");
  ok(d.querySelectorAll("#home-keys .kk").length >= 6, "home: keys rendered");
  ok(!!d.querySelector(".pz-svg svg"), "home: loggia drawn");
  ok(d.querySelectorAll(".pz-words img").length > 0, "home: word clippings loaded");
  fs.writeFileSync("snap_index.html", "<!doctype html>\n" + d.documentElement.outerHTML);

  // C) names
  d = (await load("names.html")).window.document;
  await wait(1500);
  ok(d.querySelectorAll("#names .nrow").length > 25, "names: rows > 25 (" + d.querySelectorAll("#names .nrow").length + ")");
  ok(d.querySelectorAll("#names .nrow.val").length >= 5, "names: validated signatories >= 5");
  ok(!!d.getElementById("map"), "names: map container present");
  fs.writeFileSync("snap_names.html", "<!doctype html>\n" + d.documentElement.outerHTML);

  // D) unit permalink
  d = (await load("unit.html", R("unit.html") + "?u=R142_0006")).window.document;
  await wait(900);
  ok(d.querySelector("#unit-record .record .id").textContent.trim() === "R142_0006", "unit: permalink resolves R142_0006");
  ok(d.querySelectorAll("#unit-nav a").length === 3, "unit: prev/next/back nav");
  ok(d.querySelector("#unit-record").textContent.indexOf("in tutto contraria") > -1, "unit 0006: orientation evidence quoted");
  fs.writeFileSync("snap_unit.html", "<!doctype html>\n" + d.documentElement.outerHTML);

  console.log(fails ? "\n" + fails + " FAILURES" : "\nALL TESTS PASS");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("HARNESS ERROR", e); process.exit(2); });
