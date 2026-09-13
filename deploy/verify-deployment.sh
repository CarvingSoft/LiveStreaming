#!/usr/bin/env bash
# Phase 6 — Verify production deployment
set -euo pipefail

SITE_SLUG="${1:-}"
API_BASE="${API_BASE:-https://api.live.carvingsoft.com}"
FRONTEND_BASE="${FRONTEND_BASE:-https://live.carvingsoft.com}"

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
check "MediaMTX API (local)" "curl -sf http://127.0.0.1:9997/v3/paths/list"

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
