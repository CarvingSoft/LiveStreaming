#!/usr/bin/env bash
# Diagnose EC2 ↔ DVR RTSP connectivity (run on EC2)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
PATH_FILTER="${1:-}"

echo "==> EC2 outbound IP (whitelist this on DVR/router if TCP fails)"
curl -sf --max-time 5 ifconfig.me || true
echo ""

echo "==> MediaMTX RTSP errors (last 40 lines)"
sudo journalctl -u mediamtx -n 40 --no-pager 2>/dev/null | tail -25 || true
echo ""

cd "${BACKEND_DIR}"
if [[ ! -f dist/scripts/diagnose-rtsp.js ]]; then
  echo "Building backend..."
  npm run build:prod 2>/dev/null || npm run build
fi

if [[ -n "${PATH_FILTER}" ]]; then
  node dist/scripts/diagnose-rtsp.js "${PATH_FILTER}" --fix
else
  node dist/scripts/diagnose-rtsp.js --fix
fi
