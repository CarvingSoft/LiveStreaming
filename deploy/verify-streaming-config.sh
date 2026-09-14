#!/usr/bin/env bash
# Verify EC2 streaming config matches local-dev fixes (run on EC2)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEDIAMTX_PATH="${1:-}"

# shellcheck source=env-utils.sh
source "${SCRIPT_DIR}/env-utils.sh"

pass=0
fail=0

ok() {
  echo "  OK   $1"
  pass=$((pass + 1))
}

bad() {
  echo "  FAIL $1"
  fail=$((fail + 1))
}

warn() {
  echo "  WARN $1"
}

echo "==> Parity with local dev fixes"
echo "    (mpegts HLS, always-on RTSP, valid ENCRYPTION_KEY, synced paths, API on :5280)"
echo ""

echo "==> MediaMTX service"
if systemctl is-active --quiet mediamtx 2>/dev/null; then
  ok "mediamtx systemd active"
else
  bad "mediamtx not running — bash deploy/restart-mediamtx.sh"
fi

if grep -q 'hlsVariant: mpegts' /opt/mediamtx/mediamtx.yml 2>/dev/null; then
  ok "mediamtx.yml has hlsVariant: mpegts"
else
  bad "mediamtx.yml missing hlsVariant: mpegts — bash deploy/restart-mediamtx.sh"
fi

if grep -q 'hlsAlwaysRemux: true' /opt/mediamtx/mediamtx.yml 2>/dev/null; then
  ok "mediamtx.yml has hlsAlwaysRemux: true"
else
  bad "mediamtx.yml missing hlsAlwaysRemux: true — bash deploy/restart-mediamtx.sh"
fi

RUNNING_VARIANT="$(curl -sf http://127.0.0.1:9997/v3/config/global/get 2>/dev/null | grep -o '"hlsVariant":"[^"]*"' | head -1 || true)"
if [[ "${RUNNING_VARIANT}" == '"hlsVariant":"mpegts"' ]]; then
  ok "running MediaMTX hlsVariant is mpegts"
else
  bad "running hlsVariant is ${RUNNING_VARIANT:-unknown} — restart mediamtx"
fi

if grep -q 'sourceOnDemand: false' /opt/mediamtx/mediamtx.yml 2>/dev/null; then
  ok "mediamtx.yml has sourceOnDemand: false"
else
  bad "mediamtx.yml still uses sourceOnDemand: true — git pull && bash deploy/restart-mediamtx.sh"
fi

echo ""
echo "==> Backend .env"
if [[ -f "${BACKEND_DIR}/.env" ]]; then
  ok "backend/.env exists"
else
  bad "backend/.env missing"
fi

for key in MEDIAMTX_API_URL MEDIAMTX_HLS_URL MEDIAMTX_WEBRTC_URL; do
  value="$(read_env_var "${BACKEND_DIR}/.env" "${key}" 2>/dev/null || true)"
  case "${key}" in
    MEDIAMTX_API_URL) expected="http://127.0.0.1:9997" ;;
    MEDIAMTX_HLS_URL) expected="http://127.0.0.1:8888" ;;
    MEDIAMTX_WEBRTC_URL) expected="http://127.0.0.1:8889" ;;
  esac
  if [[ "${value}" == "${expected}" ]]; then
    ok "${key}=${value}"
  else
    bad "${key}='${value:-missing}' (expected ${expected})"
  fi
done

KEY_BYTES="$(encryption_key_byte_length "$(read_env_var "${BACKEND_DIR}/.env" ENCRYPTION_KEY 2>/dev/null || true)")"
if [[ "${KEY_BYTES}" == "32" ]]; then
  ok "ENCRYPTION_KEY is 32 bytes"
else
  bad "ENCRYPTION_KEY decodes to ${KEY_BYTES} bytes"
fi

echo ""
echo "==> API process (no orphan on :5280)"
PM2_PID="$(cat /root/.pm2/pids/cctv-api*.pid 2>/dev/null | head -1 || true)"
PORT_PID="$(ss -tlnp 2>/dev/null | grep ':5280' | grep -oP 'pid=\K[0-9]+' | head -1 || true)"
if [[ -n "${PM2_PID}" && -n "${PORT_PID}" && "${PM2_PID}" == "${PORT_PID}" ]]; then
  ok "PM2 cctv-api (pid ${PM2_PID}) owns port 5280"
elif [[ -n "${PORT_PID}" ]]; then
  bad "orphan pid ${PORT_PID} on :5280 (PM2 pid ${PM2_PID:-none}) — sudo fuser -k 5280/tcp && pm2 restart"
else
  bad "nothing listening on :5280"
fi

HEALTH="$(curl -sf http://127.0.0.1:5280/api/health 2>/dev/null || true)"
if echo "${HEALTH}" | grep -q '"encryptionKeyOk":true'; then
  ok "API health encryptionKeyOk"
else
  bad "API health missing encryptionKeyOk — rebuild and restart PM2 with --cwd backend"
fi

if grep -q hasConfigPath "${BACKEND_DIR}/dist/services/mediamtx.service.js" 2>/dev/null; then
  ok "backend build includes config-path sync fix"
else
  bad "stale backend build — git pull && npm run build:prod"
fi

echo ""
echo "==> Camera paths"
PATH_LIST="$(curl -sf http://127.0.0.1:9997/v3/config/paths/list 2>/dev/null || echo '{}')"
ITEM_COUNT="$(echo "${PATH_LIST}" | grep -o '"itemCount":[0-9]*' | head -1 | cut -d: -f2 || echo 0)"
CAMERA_COUNT="$(mongosh cctv_platform --quiet --eval 'db.cameras.countDocuments({isActive:true})' 2>/dev/null || echo 0)"

if [[ "${CAMERA_COUNT}" -gt 0 && "${ITEM_COUNT:-0}" -eq 0 ]]; then
  bad "no MediaMTX paths (DB has ${CAMERA_COUNT} cameras) — npm run sync:mediamtx:prod"
elif [[ "${CAMERA_COUNT}" -gt 0 ]]; then
  ok "MediaMTX itemCount=${ITEM_COUNT} (active cameras=${CAMERA_COUNT})"
else
  warn "no active cameras in DB"
fi

CHECK_PATH="${MEDIAMTX_PATH}"
if [[ -z "${CHECK_PATH}" && "${ITEM_COUNT:-0}" -gt 0 ]]; then
  CHECK_PATH="$(curl -sf http://127.0.0.1:9997/v3/config/paths/list 2>/dev/null | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4 || true)"
fi

if [[ -n "${CHECK_PATH}" ]]; then
  echo ""
  echo "==> Path probe: ${CHECK_PATH}"
  PATH_CFG="$(curl -sf "http://127.0.0.1:9997/v3/config/paths/get/${CHECK_PATH}" 2>/dev/null || true)"
  if echo "${PATH_CFG}" | grep -q '"sourceOnDemand":false'; then
    ok "${CHECK_PATH} sourceOnDemand=false"
  else
    bad "${CHECK_PATH} not always-on — npm run sync:mediamtx:prod"
  fi

  HLS_HEAD="$(curl -sf "http://127.0.0.1:8888/${CHECK_PATH}/index.m3u8?cookieCheck=1" 2>/dev/null | head -1 || true)"
  if [[ "${HLS_HEAD}" == "#EXTM3U" ]]; then
    ok "direct HLS index.m3u8 returns #EXTM3U"
  elif echo "${HLS_HEAD}" | grep -qi 'authentication error'; then
    bad "HLS authentication error — hlsVariant must be mpegts"
  else
    bad "direct HLS failed (got: ${HLS_HEAD:-empty})"
  fi
fi

echo ""
echo "Results: ${pass} passed, ${fail} failed"
if [[ "${fail}" -gt 0 ]]; then
  echo ""
  echo "Fix all failures, then run:"
  echo "  bash ${REPO_ROOT}/deploy/update-from-git.sh"
  exit 1
fi
