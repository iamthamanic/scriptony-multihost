#!/usr/bin/env bash
# Build comma-separated SHIM_CHANGED_FILES from git working tree state.
# Usage: scope-files.sh [path-prefix ...]
# With prefixes: only include files matching at least one prefix.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

collect_changed_files() {
  if [[ -f scripts/_shared/collect-changed-files.sh ]]; then
    # shellcheck disable=SC1091
    source scripts/_shared/collect-changed-files.sh
    collect_changed_files
    return 0
  fi

  {
    git diff --name-only --diff-filter=ACMR 2>/dev/null || true
    git diff --name-only --cached --diff-filter=ACMR 2>/dev/null || true
    git ls-files --others --exclude-standard 2>/dev/null || true
    if git rev-parse --verify origin/main >/dev/null 2>&1; then
      git diff --name-only --diff-filter=ACMR origin/main...HEAD 2>/dev/null || true
    fi
  } | sort -u
}

matches_prefix() {
  local file="$1"
  local prefix
  for prefix in "$@"; do
    if [[ "$file" == "$prefix"* ]]; then
      return 0
    fi
  done
  return 1
}

files=()
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  if [[ $# -gt 0 ]] && ! matches_prefix "$file" "$@"; then
    continue
  fi
  files+=("$file")
done < <(collect_changed_files)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No changed files found." >&2
  exit 1
fi

(IFS=,; printf '%s\n' "${files[*]}")
