#!/usr/bin/env bash
# List file-size violations (AGENTS.md: soft 300, hard 500).
# Usage:
#   bash scripts/checks/list-file-size-violations.sh           # hard only
#   bash scripts/checks/list-file-size-violations.sh --all     # hard + soft
#   bash scripts/checks/list-file-size-violations.sh --markdown  # table for tickets
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(pwd)}"
MODE="${1:---hard}"

export CHECK_MODE=full
export ROOT_DIR

tmp="$(mktemp)"
bash "$ROOT_DIR/scripts/checks/project-rules.sh" >"$tmp" 2>&1 || true

filter_hard() {
  grep 'FAIL' "$tmp" | sed -E 's/.*FAIL[^ ]*  ([^ ]+) — ([0-9]+) lines.*/|\1|\2|hard|/'
}

filter_soft() {
  grep 'WARN' "$tmp" | sed -E 's/.*WARN[^ ]* ([^ ]+) — ([0-9]+) lines.*/|\1|\2|soft|/'
}

case "$MODE" in
  --all)
    { filter_hard; filter_soft; } | sort -t'|' -k2 -nr
    ;;
  --markdown)
    echo "| Datei | Zeilen | Stufe |"
    echo "|-------|--------|-------|"
    { filter_hard; filter_soft; } | sort -t'|' -k2 -nr | while IFS='|' read -r _ path lines level _; do
      echo "| \`$path\` | $lines | $level |"
    done
    ;;
  --hard | *)
    filter_hard | sort -t'|' -k2 -nr
    ;;
esac

hard_count="$(filter_hard | wc -l | tr -d ' ')"
soft_count="$(filter_soft | wc -l | tr -d ' ')"
echo "" >&2
echo "Summary: $hard_count hard (>500), $soft_count soft (>300)" >&2

rm -f "$tmp"
