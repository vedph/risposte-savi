"""Validate canonical inputs and every generated release copy."""
from pipeline import ROOT, check
import sys

if __name__ == "__main__":
    try:
        print(check(ROOT))
    except (ValueError, KeyError, OSError) as exc:
        sys.exit(str(exc))
