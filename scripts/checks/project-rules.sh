#!/usr/bin/env bash
#
# Project Rules Check — File Size & Complexity Guard
# Enforces AGENTS.md: max 300 lines per file (soft), hard limit 500.
#
# Usage: bash scripts/checks/project-rules.sh
# Environment:
#   CHECK_MODE=snippet | full  (defaults to snippet if unset)
#   ROOT_DIR                 (defaults to pwd)
#
# Exit codes:
#   0 = all files within limits (or snippet mode with warnings only)
#   1 = one or more files exceed hard limit (>500 lines)

set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(pwd)}"
CHECK_MODE="${CHECK_MODE:-snippet}"
mode="$(echo "$CHECK_MODE" | tr '[:upper:]' '[:lower:]')"

SOFT_LIMIT=300
HARD_LIMIT=500

# Exclusion patterns — generated / third-party code we do not maintain
EXCLUDE_PATTERNS="^src/imports/|^src/components/ui/(chart|sidebar)\.tsx$|^src/components/ui/(accordion|alert-dialog|aspect-ratio|avatar|badge|breadcrumb|button|calendar|card|carousel|checkbox|collapsible|command|context-menu|dialog|drawer|dropdown-menu|form|hover-card|input|input-otp|label|menubar|navigation-menu|pagination|popover|progress|radio-group|resizable|scroll-area|select|separator|sheet|skeleton|slider|sonner|switch|table|tabs|textarea|toast|toggle-group|toggle|tooltip)\.tsx$"

collect_changed_files() {
  local base_branch=""
  base_branch="$(${GIT_CMD:-git} merge-base HEAD origin/main 2>/dev/null || ${GIT_CMD:-git} merge-base HEAD main 2>/dev/null || true)"
  if [[ -z "$base_branch" ]]; then
    base_branch="$(${GIT_CMD:-git} log --oneline --all | tail -1 | awk '{print $1}' 2>/dev/null || true)"
  fi
  if [[ -n "$base_branch" ]]; then
    ${GIT_CMD:-git} diff --name-only --diff-filter=d "${base_branch}...HEAD" 2>/dev/null || ${GIT_CMD:-git} diff --name-only --diff-filter=d HEAD~1 HEAD 2>/dev/null || true
  else
    ${GIT_CMD:-git} diff --name-only --diff-filter=d HEAD~1 HEAD 2>/dev/null || true
  fi
}

count_lines() {
  local file="$1"
  wc -l < "$file" | tr -d ' '
}

is_target_file() {
  local file="$1"
  if [[ -n "$EXCLUDE_PATTERNS" ]] && echo "$file" | grep -qE "$EXCLUDE_PATTERNS"; then
    return 1
  fi
  [[ "$file" =~ ^src/.*\.(ts|tsx)$ ]] && return 0
  [[ "$file" =~ ^functions/.*\.ts$ ]] && [[ ! "$file" =~ /node_modules/ ]] && [[ ! "$file" =~ /index\.js$ ]] && return 0
  return 1
}

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  Project Rules Check  —  File Size Guard"
echo "  Mode: $mode  |  Soft limit: $SOFT_LIMIT  |  Hard limit: $HARD_LIMIT"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

soft_violations=()
hard_violations=()

check_all_files() {
  local files=()
  while IFS= read -r -d '' file; do
    local rel="$file"
    if [[ "$rel" == "$ROOT_DIR"/* ]]; then
      rel="${rel#$ROOT_DIR/}"
    fi
    is_target_file "$rel" || continue
    files+=("$rel")
  done < <(find "$ROOT_DIR/src" "$ROOT_DIR/functions" -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -name "index.js" -print0 2>/dev/null)

  if [[ "${#files[@]}" -eq 0 ]]; then
    echo "No target files found."
    return 0
  fi

  local f lines any=0
  for f in "${files[@]}"; do
    lines="$(count_lines "$ROOT_DIR/$f")"
    if [[ "$lines" -gt "$HARD_LIMIT" ]]; then
      printf "  \033[0;31mFAIL\033[0m  %s — %d lines (hard limit %d)\n" "$f" "$lines" "$HARD_LIMIT"
      hard_violations+=("$f:$lines")
      any=1
    elif [[ "$lines" -gt "$SOFT_LIMIT" ]]; then
      printf "  \033[1;33mWARN\033[0m %s — %d lines (soft limit %d)\n" "$f" "$lines" "$SOFT_LIMIT"
      soft_violations+=("$f:$lines")
      any=1
    fi
  done

  if [[ "$any" -eq 0 ]]; then
    printf "  ✅ All files within soft limit (%d lines).\n" "$SOFT_LIMIT"
  fi
}

check_changed_files() {
  local files=() file
  while IFS= read -r file; do
    [[ -n "$file" ]] || continue
    is_target_file "$file" || continue
    files+=("$file")
  done < <(collect_changed_files 2>/dev/null || true)

  if [[ "${#files[@]}" -eq 0 ]]; then
    echo "  No changed target files."
    return 0
  fi

  echo "  Checking ${#files[@]} changed file(s)..."
  echo ""

  local f lines any=0
  for f in "${files[@]}"; do
    lines="$(count_lines "$ROOT_DIR/$f")"
    if [[ "$lines" -gt "$HARD_LIMIT" ]]; then
      printf "  \033[0;31mFAIL\033[0m  %s — %d lines (hard limit %d)\n" "$f" "$lines" "$HARD_LIMIT"
      hard_violations+=("$f:$lines")
      any=1
    elif [[ "$lines" -gt "$SOFT_LIMIT" ]]; then
      printf "  \033[1;33mWARN\033[0m %s — %d lines (soft limit %d)\n" "$f" "$lines" "$SOFT_LIMIT"
      soft_violations+=("$f:$lines")
      any=1
    fi
  done

  if [[ "$any" -eq 0 ]]; then
    printf "  ✅ All changed files within soft limit (%d lines).\n" "$SOFT_LIMIT"
  fi
}

if [[ "$mode" == "full" ]] || [[ "$mode" == "refactor" ]]; then
  echo "  Running FULL scan on all target files..."
  echo ""
  check_all_files
else
  echo "  Running SNIPPET scan on changed files..."
  echo ""
  check_changed_files
fi

echo ""

# Summary
if [[ "${#hard_violations[@]}" -gt 0 ]]; then
  echo "───────────────────────────────────────────────────────────────────"
  printf "  \033[0;31mHARD VIOLATIONS: %d file(s) > %d lines\033[0m\n" "${#hard_violations[@]}" "$HARD_LIMIT"
  echo ""
  echo "  These files MUST be split before merge/deploy."
  echo "  AGENTS.md rule: Max 300 lines per file, hard limit 500."
  echo ""
  echo "  Suggested split strategies:"
  echo "    - Extract sub-components into separate files"
  echo "    - Extract custom hooks into src/hooks/"
  echo "    - Extract service logic into src/services/ or functions/_shared/"
  echo "    - Extract UI helpers into src/components/ui/"
  echo ""
  exit 1
fi

if [[ "${#soft_violations[@]}" -gt 0 ]]; then
  echo "───────────────────────────────────────────────────────────────────"
  printf "  \033[1;33mSOFT VIOLATIONS: %d file(s) > %d lines\033[0m\n" "${#soft_violations[@]}" "$SOFT_LIMIT"
  echo ""
  if [[ "$mode" == "full" ]] || [[ "$mode" == "refactor" ]]; then
    echo "  In FULL mode these are treated as FAIL."
    echo ""
    exit 1
  fi
  echo "  In SNIPPET mode these are warnings only. Consider splitting soon."
  echo ""
fi

echo "  ✅ Project Rules Check passed."
exit 0
