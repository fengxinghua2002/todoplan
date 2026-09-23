#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
ARCHITECTURE="${1:-universal}"

case "${ARCHITECTURE}" in
  x64|arm64|universal) ;;
  *)
    echo "Usage: $0 [x64|arm64|universal]" >&2
    exit 2
    ;;
esac

cd "${PROJECT_ROOT}"
echo "Building TodoPlan for macOS (${ARCHITECTURE})"

if [[ "${SKIP_INSTALL:-0}" != "1" ]]; then
  echo "==> Installing locked dependencies"
  npm ci
fi

if [[ "${SKIP_TESTS:-0}" != "1" ]]; then
  echo "==> Running tests"
  npm test
fi

echo "==> Building application"
npm run build

echo "==> Creating macOS packages"
npm exec electron-builder -- --mac "--${ARCHITECTURE}" --publish never --config.directories.output=out/macos --config.electronDist=node_modules/electron/dist

echo "Done. macOS packages are in: ${PROJECT_ROOT}/out/macos"
