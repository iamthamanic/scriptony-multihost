#!/usr/bin/env bash
# Deploy any Scriptony Appwrite Function.
# Replaces the 28 individual deploy-appwrite-function-<name>.sh scripts.
# Bash 3.2-compatible (macOS default). No associative arrays.
#
# Usage:
#   scripts/deploy-appwrite-function.sh <function-name>     # deploy single
#   scripts/deploy-appwrite-function.sh --all                  # deploy all known
#   scripts/deploy-appwrite-function.sh --list                 # list known functions
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FUN="$ROOT/functions"
STAGE_BASE="$FUN/.deploy-staging"

# Default `npx` package for Appwrite CLI. Override if your server needs an older CLI, e.g. APPWRITE_NPX_CLI=appwrite-cli@17.3.1
APPWRITE_NPX_CLI="${APPWRITE_NPX_CLI:-appwrite-cli}"
# Ensures Appwrite CLI reads endpoint/project/key once per invocation (avoid stale ~/.appwrite).
APPWRITE_CLI_CLIENT_SYNCED="${APPWRITE_CLI_CLIENT_SYNCED:-}"

# Bash 3.2-compatible: use a function with case instead of declare -A.
# Returns one of: npm | appwrite | index | custom:<path>
get_entry_type() {
	case "$1" in
	scriptony-ai) echo "npm" ;;
	scriptony-assets) echo "appwrite" ;;
	scriptony-assistant) echo "index" ;;
	scriptony-audio-story) echo "appwrite" ;;
	scriptony-audio) echo "index" ;;
	scriptony-auth) echo "appwrite" ;;
	scriptony-beats) echo "index" ;;
	scriptony-characters) echo "appwrite" ;;
	scriptony-clips) echo "index" ;;
	scriptony-editor-readmodel) echo "index" ;;
	scriptony-gym) echo "index" ;;
	scriptony-image) echo "index" ;;
	scriptony-jobs) echo "index" ;;
	scriptony-mcp-appwrite) echo "index" ;;
	scriptony-media-worker) echo "index" ;;
	scriptony-project-nodes) echo "appwrite" ;;
	scriptony-projects) echo "appwrite" ;;
	scriptony-script) echo "appwrite" ;;
	scriptony-shots) echo "appwrite" ;;
	scriptony-stage) echo "index" ;;
	scriptony-stage2d) echo "index" ;;
	scriptony-stage3d) echo "index" ;;
	scriptony-style-guide) echo "index" ;;
	scriptony-style) echo "index" ;;
	scriptony-sync) echo "index" ;;
	scriptony-video) echo "index" ;;
	scriptony-worldbuilding) echo "appwrite" ;;
	*) echo "" ;;
	esac
}

# Loads project .env.local (optional) and maps VITE_* → APPWRITE_* for deploy.
load_project_env_for_deploy() {
	local env_file="$ROOT/.env.local"
	if [[ -f "$env_file" ]]; then
		set +u
		set -a
		# shellcheck disable=SC1090
		. "$env_file"
		load_rc=$?
		set +a
		set -u
		if [[ "$load_rc" -ne 0 ]]; then
			echo "Deploy: Warning: sourcing $env_file returned $load_rc" >&2
		fi
	fi
	if [[ -z "${APPWRITE_ENDPOINT:-}" && -n "${VITE_APPWRITE_ENDPOINT:-}" ]]; then
		export APPWRITE_ENDPOINT="$VITE_APPWRITE_ENDPOINT"
	fi
	if [[ -z "${APPWRITE_PROJECT_ID:-}" && -n "${VITE_APPWRITE_PROJECT_ID:-}" ]]; then
		export APPWRITE_PROJECT_ID="$VITE_APPWRITE_PROJECT_ID"
	fi
	if [[ -z "${APPWRITE_API_KEY:-}" && -n "${APPWRITE_APIKEY:-}" ]]; then
		export APPWRITE_API_KEY="$APPWRITE_APIKEY"
	fi
}

# Apply env to stored CLI config once (Appwrite CLI does not auto-read .env.local).
sync_appwrite_cli_from_env_once() {
	if [[ -n "$APPWRITE_CLI_CLIENT_SYNCED" ]]; then
		return 0
	fi
	load_project_env_for_deploy
	if [[ -z "${APPWRITE_ENDPOINT:-}" || -z "${APPWRITE_PROJECT_ID:-}" || -z "${APPWRITE_API_KEY:-}" ]]; then
		echo "" >&2
		echo "Deploy: Using existing Appwrite CLI client (~/.appwrite). To sync from repo root:" >&2
		echo "  Set APPWRITE_API_KEY (+ optional APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID in .env.local," >&2
		echo "  or rely on VITE_APPWRITE_ENDPOINT + VITE_APPWRITE_PROJECT_ID). See .env.local.example." >&2
		echo "" >&2
		APPWRITE_CLI_CLIENT_SYNCED="skip"
		return 0
	fi
	echo "Deploy: Updating Appwrite CLI client from environment (endpoint + project-id + key)." >&2
	if [[ "${APPWRITE_SELF_SIGNED_CERT:-}" == "1" || "${APPWRITE_SELF_SIGNED_CERT:-}" == "true" ]]; then
		npx --yes "$APPWRITE_NPX_CLI" client \
			--self-signed true \
			--endpoint "$APPWRITE_ENDPOINT" \
			--project-id "$APPWRITE_PROJECT_ID" \
			--key "$APPWRITE_API_KEY"
	else
		npx --yes "$APPWRITE_NPX_CLI" client \
			--endpoint "$APPWRITE_ENDPOINT" \
			--project-id "$APPWRITE_PROJECT_ID" \
			--key "$APPWRITE_API_KEY"
	fi
	APPWRITE_CLI_CLIENT_SYNCED="1"
}

# Ordered list for --all (must match get_entry_type cases).
KNOWN_FUNCTIONS="
scriptony-auth
scriptony-projects
scriptony-project-nodes
scriptony-characters
scriptony-ai
scriptony-assistant
scriptony-script
scriptony-shots
scriptony-style
scriptony-stage
scriptony-audio
scriptony-image
scriptony-mcp-appwrite
scriptony-clips
scriptony-gym
scriptony-worldbuilding
scriptony-stage2d
scriptony-stage3d
scriptony-sync
scriptony-jobs
scriptony-editor-readmodel
scriptony-media-worker
scriptony-beats
scriptony-assets
scriptony-audio-story
scriptony-style-guide
scriptony-video
"

usage() {
	cat <<'EOF'
Usage: scripts/deploy-appwrite-function.sh [OPTIONS] <function-name>
       scripts/deploy-appwrite-function.sh --all
       scripts/deploy-appwrite-function.sh --list

Deploy a single Scriptony Appwrite Function, or all known functions.

Options:
  --all      Deploy every known function (use with caution)
  --list     List all known functions and their entry patterns
  --help     Show this help

Examples:
  scripts/deploy-appwrite-function.sh scriptony-auth
  scripts/deploy-appwrite-function.sh scriptony-ai
  CHECK_MODE=snippet npm run checks && scripts/deploy-appwrite-function.sh scriptony-projects

Env (.env.local in repo root):
  APPWRITE_API_KEY recommended for deploy (scope: functions.write). When set with endpoint + project-id
  (or VITE_APPWRITE_ENDPOINT + VITE_APPWRITE_PROJECT_ID), this script runs 'appwrite client' before upload.
EOF
}

list_functions() {
	echo "Known functions and entry patterns:"
	echo ""
	printf "  %-30s %s\n" "FUNCTION" "ENTRY"
	for key in $KNOWN_FUNCTIONS; do
		printf "  %-30s %s\n" "$key" "$(get_entry_type "$key")"
	done
	echo ""
	echo "Total: $(echo "$KNOWN_FUNCTIONS" | wc -w | tr -d ' ') functions"
}

deploy_one() {
	local name="$1"
	local entry_type
	entry_type="$(get_entry_type "$name")"

	if [[ -z "$entry_type" ]]; then
		echo "Error: Unknown function '$name'. Run --list to see known functions." >&2
		exit 1
	fi

	local stage_dir="$STAGE_BASE/$name"
	rm -rf "$stage_dir"
	mkdir -p "$stage_dir"

	echo ""
	echo "=== Deploying $name ==="

	case "$entry_type" in
	npm)
		echo "Bundling $name (npm run build:$name)..."
		cd "$FUN"
		npm run "build:$name"
		if [[ ! -s "$FUN/$name/index.js" ]]; then
			echo "error: bundle missing or empty: $FUN/$name/index.js" >&2
			exit 1
		fi
		cp "$FUN/$name/index.js" "$stage_dir/index.js"
		;;
	appwrite)
		echo "Bundling $name (esbuild appwrite-entry.ts)..."
		npx --yes esbuild "$FUN/$name/appwrite-entry.ts" \
			--bundle \
			--platform=node \
			--target=node16 \
			--format=cjs \
			--outfile="$stage_dir/index.js" \
			--legal-comments=none \
			--external:node:*
		if [[ ! -s "$stage_dir/index.js" ]]; then
			echo "error: bundle missing or empty: $stage_dir/index.js" >&2
			exit 1
		fi
		;;
	index)
		echo "Bundling $name (esbuild index.ts)..."
		npx --yes esbuild "$FUN/$name/index.ts" \
			--bundle \
			--platform=node \
			--target=node16 \
			--format=cjs \
			--outfile="$stage_dir/index.js" \
			--legal-comments=none \
			--external:node:*
		if [[ ! -s "$stage_dir/index.js" ]]; then
			echo "error: bundle missing or empty: $stage_dir/index.js" >&2
			exit 1
		fi
		;;
	custom:*)
		local custom_path="${entry_type#custom:}"
		echo "Bundling $name (esbuild $custom_path)..."
		npx --yes esbuild "$FUN/$name/$custom_path" \
			--bundle \
			--platform=node \
			--target=node16 \
			--format=cjs \
			--outfile="$stage_dir/index.js" \
			--legal-comments=none \
			--external:node:*
		if [[ ! -s "$stage_dir/index.js" ]]; then
			echo "error: bundle missing or empty: $stage_dir/index.js" >&2
			exit 1
		fi
		;;
	*)
		echo "Error: Unknown entry type '$entry_type' for function '$name'" >&2
		exit 1
		;;
	esac

	sync_appwrite_cli_from_env_once

	echo "Deploying $name..."
	npx --yes "$APPWRITE_NPX_CLI" functions create-deployment \
		--function-id "$name" \
		--code "$stage_dir" \
		--activate true \
		--entrypoint "index.js" \
		--commands ""

	echo "Done: $name"
}

main() {
	if [[ $# -eq 0 ]]; then
		usage
		exit 1
	fi

	case "${1:-}" in
	--help | -h)
		usage
		exit 0
		;;
	--list | -l)
		list_functions
		exit 0
		;;
	--all)
		for key in $KNOWN_FUNCTIONS; do
			deploy_one "$key"
		done
		echo ""
		echo "All $(echo "$KNOWN_FUNCTIONS" | wc -w | tr -d ' ') functions deployed."
		exit 0
		;;
	esac

	deploy_one "$1"
}

main "$@"
