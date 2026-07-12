#!/usr/bin/env bash
# shellcheck shell=bash
# Append scoped `git diff <base> -- <path>` hunks to DIFF_FILE when the working tree
# has no unstaged/staged changes. Used by scripts/ai-code-review.sh and
# scripts/ai-ollama-review.sh.
#
# Expects: GIT_CMD, DIFF_FILE set in the caller's environment.
# Optional env: SHIM_AI_REVIEW_BASE_REF or AI_REVIEW_BASE_REF (commit-ish, e.g. main, HEAD~1).
#
# Reads one file path per line from stdin (same format as collect_scoped_files output).
#
# Exit status:
#   0 — appended successfully (DIFF_FILE may still be empty if paths match base)
#   1 — no base ref set; nothing to do
#   2 — base ref is invalid (fatal for checks)

ai_review_append_base_ref_diff() {
  local base_raw="${SHIM_AI_REVIEW_BASE_REF:-${AI_REVIEW_BASE_REF:-}}"
  local base
  # shellcheck disable=SC2001
  base="$(echo "$base_raw" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' | tr -d '\r')"
  [[ -z "$base" ]] && return 1

  local git_cmd="${GIT_CMD:-git}"
  local repo_root="${ROOT_DIR:-}"
  if [[ -n "$repo_root" ]] && [[ -d "$repo_root" ]]; then
    cd "$repo_root" || {
      echo "AI review: cannot cd to ROOT_DIR for base-ref diff: ${repo_root}" >&2
      return 2
    }
  fi

  if ! "$git_cmd" rev-parse --verify "$base" >/dev/null 2>&1; then
    echo "AI review: SHIM_AI_REVIEW_BASE_REF is not a valid commit: ${base}" >&2
    return 2
  fi

  echo "AI review: scoped diff vs ${base} (SHIM_AI_REVIEW_BASE_REF)" >&2

  local file_path diff_rc
  while IFS= read -r file_path; do
    [[ -z "$file_path" ]] && continue
    diff_rc=0
    "$git_cmd" diff --no-color "${base}" -- "$file_path" >>"$DIFF_FILE" || diff_rc=$?
    if [[ "$diff_rc" -ne 0 ]]; then
      echo "AI review: git diff vs ${base} failed for ${file_path} (exit ${diff_rc})." >&2
      return 2
    fi
  done
  return 0
}
