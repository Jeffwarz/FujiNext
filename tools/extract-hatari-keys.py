#!/usr/bin/env python3
"""Extract Hatari's config keys (name, type, section) from its source tree.

Usage:  python3 -I tools/extract-hatari-keys.py /path/to/hatari > src/hatari/hatariKeys.json

FujiNext's tests check every key the config generator writes against this
snapshot, so a typo or a value of the wrong type fails in CI instead of being
silently ignored by Hatari. Re-run it when you move to a newer Hatari.
"""
import json, re, subprocess, sys
from pathlib import Path

root = Path(sys.argv[1])
src = (root / "src" / "configuration.c").read_text(encoding="utf-8", errors="replace")

# configs_Xxx[] tables -> {key: type}
tables = {}
for m in re.finditer(r"static const struct Config_Tag (configs_\w+)\[\]\s*=\s*\{(.*?)\n\};", src, re.S):
    tables[m.group(1)] = dict(
        (k, t) for k, t in re.findall(r'\{\s*"(\w+)"\s*,\s*(\w+)_Tag', m.group(2))
    )

# table -> "[Section]" as used by Configuration_LoadSection / SaveSection
section_of = {}
for m in re.finditer(r'Configuration_(?:Load|Save)Section\([^;]*?(configs_\w+)\s*,\s*"\[(\w+)\]"', src):
    section_of.setdefault(m.group(1), m.group(2))

legacy = {"configs_System_Old", "configs_HardDisk_Old", "configs_keyboard_old"}
sections = {}
for table, keys in tables.items():
    if table in legacy:            # accepted when loading old files only
        continue
    name = section_of.get(table)
    if name:
        sections.setdefault(name, {}).update(keys)

try:
    commit = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
except Exception:
    commit = "unknown"

json.dump({"hatariCommit": commit,
           "sections": {s: dict(sorted(k.items())) for s, k in sorted(sections.items())}},
          sys.stdout, indent=1)
print()
