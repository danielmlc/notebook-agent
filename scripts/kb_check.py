#!/usr/bin/env python3
"""知识库健康检查 / KB integrity check (lint & test equivalent).

This repo is a pure Markdown + Git knowledge base — it has no build, no package
manager and no test runner. The meaningful "lint/test" for it is verifying the
integrity of the wiki graph, which the maintenance SOP requires (see CLAUDE.md /
AGENTS.md §3.3 "每周 ... 检查悬挂链接").

Checks performed:
  1. Every [[wikilink]] resolves to an existing page (matched by basename).
  2. Every non-template / non-doc page carries YAML frontmatter.

Usage:
  python3 scripts/kb_check.py [repo_root]   # defaults to current directory

Exit code is non-zero when broken wikilinks are found, so it can be wired into
CI or a pre-commit hook.
"""
import os
import re
import sys

# Schema/doc pages intentionally contain placeholder example wikilinks
# (e.g. [[页1]], [[<新 summary>]]); they are valid link *targets* but must not
# be scanned as link *sources*.
DOC_PAGES = {
    "SCHEMA.md", "INGEST.md", "CLAUDE.md", "AGENTS.md", "README.md",
    "AI知识库建设方案.md",
}
EXCLUDE_DIRS = {".git", "TEMPLATES", ".claude"}
WIKILINK = re.compile(r"\[\[([^\]]+)\]\]")
FENCED_CODE = re.compile(r"```.*?```", re.DOTALL)
INLINE_CODE = re.compile(r"`[^`]*`")


def strip_md(name: str) -> str:
    return name[:-3] if name.endswith(".md") else name


def strip_code(text: str) -> str:
    """Drop fenced and inline code so [[links]] shown as examples are ignored."""
    text = FENCED_CODE.sub("", text)
    return INLINE_CODE.sub("", text)


def main(root: str) -> int:
    root = os.path.abspath(root)

    md_files = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for f in filenames:
            if f.endswith(".md"):
                md_files.append(os.path.join(dirpath, f))

    basenames = {strip_md(os.path.basename(p)) for p in md_files}

    broken = []
    total_links = 0
    missing_frontmatter = []

    for path in md_files:
        rel = os.path.relpath(path, root)
        # Skip placeholder-rich schema/doc pages (e.g. README has no frontmatter
        # and SCHEMA/INGEST contain example wikilinks).
        if os.path.basename(path) in DOC_PAGES:
            continue
        with open(path, encoding="utf-8") as fh:
            text = fh.read()
        if not text.startswith("---"):
            missing_frontmatter.append(rel)
        for m in WIKILINK.finditer(strip_code(text)):
            target = m.group(1).split("|")[0].split("#")[0].strip()
            base = strip_md(os.path.basename(target))
            if not base:
                continue
            total_links += 1
            if base not in basenames:
                broken.append((rel, target))

    print(f"Scanned {len(md_files)} markdown pages")
    print(f"Resolvable page basenames: {len(basenames)}")
    print(f"Total wikilinks checked: {total_links}")
    print(f"Pages missing frontmatter: {len(missing_frontmatter)}")
    for r in missing_frontmatter:
        print(f"   - {r}")
    print(f"Broken wikilinks: {len(broken)}")
    for src, tgt in broken:
        print(f"   - [{src}] -> [[{tgt}]]")

    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "."))
