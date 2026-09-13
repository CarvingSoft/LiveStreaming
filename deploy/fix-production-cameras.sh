#!/usr/bin/env bash
# Fix production camera create + MediaMTX sync on EC2
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"

echo "==> 1. Swap (needed for npm build on small instances)"
if ! swapon --show | grep -q '/swapfile'; then
  bash "${REPO_ROOT}/deploy/setup-swap.sh"
else
  echo "    Swap already enabled"
fi

echo ""
echo "==> 2. ENCRYPTION_KEY in ${BACKEND_DIR}/.env"
bash "${REPO_ROOT}/deploy/verify-backend-env.sh" "${BACKEND_DIR}"

echo ""
echo "==> 3. Build backend"
cd "${BACKEND_DIR}"
if npm run build:prod 2>/dev/null; then
  echo "    build:prod OK"
elif npm run build; then
  echo "    build OK"
else
  echo "ERROR: build failed. Build dist/ on Windows and copy to ${BACKEND_DIR}/dist/"
  exit 1
fi

echo ""
echo "==> 4. MediaMTX"
bash "${REPO_ROOT}/deploy/restart-mediamtx.sh"

echo ""
echo "==> 5. Restart API (loads .env from backend/)"
pm2 delete cctv-api 2>/dev/null || true
pm2 start "${BACKEND_DIR}/dist/server.js" --name cctv-api --cwd "${BACKEND_DIR}"
pm2 save

sleep 2

echo ""
echo "==> 6. Sync cameras"
npm run sync:mediamtx:prod 2>/dev/null || node dist/scripts/sync-mediamtx.js

echo ""
echo "==> 7. Health"
curl -sf "http://127.0.0.1:5280/api/health" | head -c 400 || true
echo ""
curl -s "http://127.0.0.1:9997/v3/config/paths/list" | grep -o '"itemCount":[0-9]*' || true

echo ""
echo "Done. Add cameras at: https://live.carvingsoft.com/admin"
echo "If an old camera fails decrypt, delete it and create again with RTSP password."
