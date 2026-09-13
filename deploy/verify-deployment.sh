#!/usr/bin/env bash
# Phase 6 — Verify production deployment
set -euo pipefail

SITE_SLUG="${1:-}"
API_BASE="${API_BASE:-https://api.live.carvingsoft.com}"
FRONTEND_BASE="${FRONTEND_BASE:-https://live.carvingsoft.com}"
REPO_ROOT="${REPO_ROOT:-/home/ubuntu/LiveServer/LiveStreaming}"

pass=0
fail=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "  OK   $name"
    pass=$((pass + 1))
  else
    echo "  FAIL $name"
    fail=$((fail + 1))
  fi
}

echo "==> Local services"
check "MongoDB running" "systemctl is-active --quiet mongod"
check "MediaMTX running" "systemctl is-active --quiet mediamtx"
check "PM2 cctv-api running" "pm2 describe cctv-api"
check "API health (local)" "curl -sf http://127.0.0.1:5280/api/health"
check "MediaMTX API (local)" "curl -sf http://127.0.0.1:9997/v3/config/paths/list"

echo ""
echo "==> Configuration checks"
check "MediaMTX hlsVariant mpegts" "grep -q 'hlsVariant: mpegts' /opt/mediamtx/mediamtx.yml"
check "API encryptionKeyOk" "curl -sf http://127.0.0.1:5280/api/health | grep -q '\"encryptionKeyOk\":true'"

MEDIAMTX_PATHS="$(curl -sf http://127.0.0.1:9997/v3/config/paths/list 2>/dev/null || echo '{}')"
MEDIAMTX_ITEM_COUNT="$(echo "${MEDIAMTX_PATHS}" | grep -o '"itemCount":[0-9]*' | head -1 | cut -d: -f2 || echo 0)"
CAMERA_COUNT="$(mongosh cctv_platform --quiet --eval 'db.cameras.countDocuments({isActive:true})' 2>/dev/null || echo 0)"

if [[ "${CAMERA_COUNT}" -gt 0 && "${MEDIAMTX_ITEM_COUNT:-0}" -eq 0 ]]; then
  echo "  FAIL MediaMTX paths synced (DB has ${CAMERA_COUNT} active cameras, MediaMTX itemCount=0)"
  echo "       Run: cd ${REPO_ROOT}/backend && npm run sync:mediamtx:prod"
  fail=$((fail + 1))
elif [[ "${CAMERA_COUNT}" -gt 0 ]]; then
  echo "  OK   MediaMTX paths synced (itemCount=${MEDIAMTX_ITEM_COUNT})"
  pass=$((pass + 1))
else
  echo "  SKIP MediaMTX paths (no active cameras in DB yet)"
fi

echo ""
echo "==> Public HTTPS endpoints"
check "Frontend reachable" "curl -sfI ${FRONTEND_BASE}/"
check "API health (public)" "curl -sf ${API_BASE}/api/health"

if [[ -n "${SITE_SLUG}" ]]; then
  check "Public site API" "curl -sf ${API_BASE}/api/public/sites/${SITE_SLUG}"
  echo ""
  echo "Public live URL: ${FRONTEND_BASE}/${SITE_SLUG}"
fi

echo ""
echo "Results: ${pass} passed, ${fail} failed"

if [[ "${fail}" -gt 0 ]]; then
  exit 1
fi
