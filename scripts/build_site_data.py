"""Compatibility entry point. Build all outputs from data/source/."""
from pipeline import ROOT, derive, publish

if __name__ == "__main__":
    files, manifest = derive(ROOT)
    publish(ROOT, files)
    print(manifest)
