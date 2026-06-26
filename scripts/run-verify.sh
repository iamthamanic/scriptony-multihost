#!/usr/bin/env bash
# ECC verify gate — deterministic checks without shimwrappercheck AI review.
# Usage: run-verify.sh [--frontend] [--backend] [--no-readme]
# Default: frontend + backend (same as --frontend --backend).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

run_frontend=false
run_backend=false
run_readme=true

for arg in "$@"; do
  case "$arg" in
    --frontend) run_frontend=true ;;
    --backend) run_backend=true ;;
    --no-readme) run_readme=false ;;
    --no-frontend) run_frontend=false ;;
    --no-backend) run_backend=false ;;
    -h | --help)
      echo "Usage: run-verify.sh [--frontend] [--backend] [--no-readme]"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 2
      ;;
  esac
done

if [[ "$run_frontend" == false && "$run_backend" == false ]]; then
  run_frontend=true
  run_backend=true
fi

step() {
  echo ""
  echo "==> $1"
}

if [[ "$run_frontend" == true ]]; then
  step "Prettier (frontend)"
  npm run format:check:frontend
  step "ESLint (frontend)"
  npm run lint
  step "TypeScript"
  npm run typecheck
  step "Vitest"
  npm run test
  step "Vite build"
  npm run build
fi

if [[ "$run_backend" == true ]]; then
  step "Prettier (functions)"
  npm run format:check:functions
  step "ESLint (functions)"
  npm run lint:functions
  step "Appwrite functions build"
  npm run functions:build:check
fi

if [[ "$run_readme" == true && -f "$ROOT_DIR/scripts/check-readme-scope.sh" ]]; then
  step "README scope"
  bash "$ROOT_DIR/scripts/check-readme-scope.sh"
fi

echo ""
echo "verify: all requested checks passed."
