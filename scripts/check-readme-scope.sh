#!/usr/bin/env bash
# README scope gate: user-facing code changes must include README.md or docs/.
# Location: scripts/check-readme-scope.sh
# Used by: scripts/update-readme.js, shim updateReadme step in run-checks.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${SKIP_README_SCOPE_CHECK:-}" == "1" ]]; then
  echo "README scope check skipped (SKIP_README_SCOPE_CHECK=1)."
  exit 0
fi

if [[ -f "$ROOT_DIR/scripts/_shared/collect-changed-files.sh" ]]; then
  # shellcheck source=scripts/_shared/collect-changed-files.sh
  source "$ROOT_DIR/scripts/_shared/collect-changed-files.sh"
else
  collect_changed_files() {
    git diff --name-only --diff-filter=ACMR 2>/dev/null || true
    git diff --name-only --cached --diff-filter=ACMR 2>/dev/null || true
    git ls-files --others --exclude-standard 2>/dev/null || true
  }
fi

is_user_facing_path() {
  local file="$1"
  [[ "$file" =~ ^(src/|functions/|src-tauri/) ]] || return 1
  [[ "$file" =~ __tests__ ]] && return 1
  [[ "$file" =~ \.(test|spec)\.(ts|tsx|js|mjs|cjs)$ ]] && return 1
  return 0
}

is_doc_path() {
  local file="$1"
  [[ "$file" == "README.md" ]] && return 0
  [[ "$file" == "AGENTS.md" ]] && return 0
  [[ "$file" =~ ^docs/ ]] && return 0
  [[ "$file" == ".cursor/readme-contract.md" ]] && return 0
  return 1
}

needs_readme=false
has_doc=false

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  if is_user_facing_path "$file"; then
    needs_readme=true
  fi
  if is_doc_path "$file"; then
    has_doc=true
  fi
done < <(collect_changed_files | sort -u)

if [[ "$needs_readme" != "true" ]]; then
  echo "README scope check: ok (no user-facing code in change set)."
  exit 0
fi

if [[ "$has_doc" == "true" ]]; then
  echo "README scope check: ok (docs/README in change set)."
  exit 0
fi

echo "README scope check FAILED." >&2
echo "User-facing paths changed (src/, functions/, src-tauri/) without README.md or docs/." >&2
echo "Update living sections per .cursor/readme-contract.md, then stage README or docs." >&2
echo "Bypass only with SKIP_README_SCOPE_CHECK=1 and documented reason." >&2
exit 1
