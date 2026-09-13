#!/usr/bin/env bash
# Quick production diagnostics (run on EC2)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=env-utils.sh
source "${SCRIPT_DIR}/env-utils.sh"

echo "==> Git commit"
git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || echo "  (not a git repo)"

echo ""
echo "==> Built backend includes encryptionKeyOk health check?"
if grep -q encryptionKeyOk "${BACKEND_DIR}/dist/routes/health.routes.js" 2>/dev/null; then
  echo "  OK   backend/dist is recent"
else
  echo "  FAIL backend/dist is stale — run: bash deploy/update-from-git.sh"
fi

echo ""
echo "==> PM2 process"
if command -v pm2 >/dev/null 2>&1; then
  pm2 show cctv-api 2>/dev/null | grep -E "status|script path|exec cwd" || echo "  FAIL cctv-api not running"
else
  echo "  WARN pm2 not installed"
fi

echo ""
echo "==> ENCRYPTION_KEY in ${BACKEND_DIR}/.env"
ENCRYPTION_KEY="$(read_env_var "${BACKEND_DIR}/.env" ENCRYPTION_KEY || true)"
KEY_BYTES="$(encryption_key_byte_length "${ENCRYPTION_KEY:-}")"
echo "  decodes to ${KEY_BYTES} bytes (need 32)"

echo ""
echo "==> API health"
HEALTH="$(curl -sf "http://127.0.0.1:5280/api/health" 2>/dev/null || true)"
if [[ -z "${HEALTH}" ]]; then
  echo "  FAIL API not reachable on :5280"
else
  echo "  ${HEALTH}"
  if echo "${HEALTH}" | grep -q '"encryptionKeyOk":true'; then
    echo "  OK   running API loaded a valid ENCRYPTION_KEY"
  elif echo "${HEALTH}" | grep -q '"encryptionKeyOk":false'; then
    echo "  FAIL API ENCRYPTION_KEY invalid — fix backend/.env and restart PM2 with --cwd backend"
  else
    echo "  FAIL stale API build (no encryptionKeyOk) — run: bash deploy/update-from-git.sh"
  fi
fi

echo ""
echo "==> MediaMTX paths"
curl -sf "http://127.0.0.1:9997/v3/config/paths/list" 2>/dev/null | grep -o '"itemCount":[0-9]*' || echo "  FAIL MediaMTX API not reachable"

echo ""
echo "==> Recent API errors (pm2)"
pm2 logs cctv-api --nostream --lines 20 2>/dev/null | tail -10 || true
