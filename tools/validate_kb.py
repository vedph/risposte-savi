# -*- coding: utf-8 -*-
"""Validate kb/ front matter against the schema-lite (required keys, enums, id pattern)."""
import sys, re, json
from pathlib import Path
try:
    import yaml
except ImportError:
    import subprocess; subprocess.run([sys.executable,"-m","pip","install","pyyaml","--break-system-packages","-q"]); import yaml
ROOT = Path(__file__).resolve().parents[1]
REL = set("ABCDEF"); TS = {"manual","manual_partial","regest"}
SIG = {"recorded_unverified","not_checked","absent_named","blank_signature_space","unanimous_but_names_omitted","vacant_seats","complete","unknown","not_transcribed"}
ids = {p.stem for p in (ROOT/"kb/units").glob("R142_*.md")}
errs = 0
def err(p,m):
    global errs; errs+=1; print("ERR", p.name, "-", m)
for p in sorted((ROOT/"kb/units").glob("*.md")):
    txt = p.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", txt, re.S)
    if not m: err(p,"no front matter"); continue
    fm = yaml.safe_load(m.group(1))
    if fm.get("type") != "Risposta": err(p,"type != Risposta")
    if not re.match(r"^R142_\d{4}$", str(fm.get("id",""))): err(p,"bad id")
    if fm.get("reliability") not in REL: err(p,"bad reliability: %r"%fm.get("reliability"))
    if fm.get("transcription_status") not in TS: err(p,"bad transcription_status")
    if fm.get("signatory_status") not in SIG: err(p,"bad signatory_status: %r"%fm.get("signatory_status"))
    if fm.get("hyp_status") != "pending_expert_validation": err(p,"hyp_status missing")
    ru = fm.get("related_unit")
    if ru and ru not in (None,"null"):
        rid = re.sub(r"[\[\]]","",str(ru))
        if rid not in ids: err(p,"dangling relation -> "+rid)
for p in sorted((ROOT/"kb/concepts").glob("*.md")) + sorted((ROOT/"kb/model").glob("*.md")):
    txt = p.read_text(encoding="utf-8")
    if not txt.startswith("---\n"): err(p,"no front matter")
    fm = yaml.safe_load(re.match(r"^---\n(.*?)\n---\n", txt, re.S).group(1))
    if "type" not in fm: err(p,"missing type")
print(("VALID: 0 errors" if errs==0 else "INVALID: %d errors"%errs), "| files:",
      len(list((ROOT/'kb/units').glob('*.md')))+len(list((ROOT/'kb/concepts').glob('*.md')))+len(list((ROOT/'kb/model').glob('*.md'))))
sys.exit(1 if errs else 0)
