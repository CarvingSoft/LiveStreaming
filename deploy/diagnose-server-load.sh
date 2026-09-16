#!/usr/bin/env bash
# Diagnose EC2 load, bandwidth, and streaming traffic (run on EC2 via SSH)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=env-utils.sh
source "${SCRIPT_DIR}/env-utils.sh"

warn() { echo "  WARN $*"; }
bad() { echo "  FAIL $*"; }
ok() { echo "  OK   $*"; }

echo "=============================================="
echo "  Server load & bandwidth diagnostics"
echo "  $(date -Is 2>/dev/null || date)"
echo "=============================================="

echo ""
echo "==> System (CPU / RAM / disk)"
if command -v free >/dev/null 2>&1; then
  free -h
fi
echo ""
uptime
echo ""
df -h / /var 2>/dev/null || df -h

SWAP_USED="$(free -m 2>/dev/null | awk '/Swap:/ {print $3}' || echo 0)"
if [[ "${SWAP_USED:-0}" -gt 500 ]]; then
  bad "Swap in heavy use (${SWAP_USED} MB) — instance may be too small or leaking memory"
else
  ok "Swap usage acceptable (${SWAP_USED:-0} MB used)"
fi

echo ""
echo "==> Top processes (CPU)"
ps aux --sort=-%cpu 2>/dev/null | head -8 || ps -eo pid,pcpu,pmem,comm --sort=-pcpu 2>/dev/null | head -8

echo ""
echo "==> Top processes (memory)"
ps aux --sort=-%mem 2>/dev/null | head -8 || ps -eo pid,pcpu,pmem,comm --sort=-%mem 2>/dev/null | head -8

echo ""
echo "==> Network (last snapshot — run twice 60s apart to see rate)"
if command -v ss >/dev/null 2>&1; then
  echo "  Established TCP connections: $(ss -tan state established 2>/dev/null | wc -l)"
  echo "  :443 (nginx):  $(ss -tan sport = :443 2>/dev/null | wc -l) sockets"
  echo "  :5280 (API):   $(ss -tan sport = :5280 2>/dev/null | wc -l) sockets"
  echo "  :8888 (HLS):   $(ss -tan sport = :8888 2>/dev/null | wc -l) sockets"
fi

if [[ -r /proc/net/dev ]]; then
  echo ""
  echo "  Interface bytes (cumulative since boot):"
  awk 'NR>2 {printf "    %-8s  rx=%s tx=%s\n", $1, $2, $10}' /proc/net/dev | head -5
  echo "  Tip: run 'cat /proc/net/dev' now and again in 60s — (tx2-tx1)/60 ≈ upload Mbps"
fi

echo ""
echo "==> PM2 API process"
if command -v pm2 >/dev/null 2>&1; then
  pm2 show cctv-api 2>/dev/null | grep -E "status|restarts|uptime|memory|cpu" || bad "cctv-api not in PM2"
  echo ""
  echo "  Recent API log lines:"
  pm2 logs cctv-api --nostream --lines 15 2>/dev/null | tail -12 || true
else
  warn "pm2 not installed"
fi

echo ""
echo "==> On-demand streaming config"
if [[ -f "${BACKEND_DIR}/.env" ]]; then
  STREAM_OD="$(read_env_var "${BACKEND_DIR}/.env" STREAM_ON_DEMAND 2>/dev/null || echo true)"
  IDLE_MS="$(read_env_var "${BACKEND_DIR}/.env" SITE_STREAM_IDLE_MS 2>/dev/null || echo 900000)"
  echo "  STREAM_ON_DEMAND=${STREAM_OD:-true (default)}"
  echo "  SITE_STREAM_IDLE_MS=${IDLE_MS:-900000} ($(( ${IDLE_MS:-900000} / 60000 )) min idle teardown)"
else
  warn "backend/.env not found"
fi

if [[ -f /opt/mediamtx/mediamtx.yml ]]; then
  grep -E 'sourceOnDemand|hlsAlwaysRemux' /opt/mediamtx/mediamtx.yml | sed 's/^/  /' || true
fi

echo ""
echo "==> MediaMTX paths & active RTSP pulls"
PATH_LIST="$(curl -sf http://127.0.0.1:9997/v3/config/paths/list 2>/dev/null || echo '{}')"
ITEM_COUNT="$(echo "${PATH_LIST}" | grep -o '"itemCount":[0-9]*' | head -1 | cut -d: -f2 || echo 0)"
CAMERA_COUNT="$(mongosh cctv_platform --quiet --eval 'db.cameras.countDocuments({isActive:true})' 2>/dev/null || echo '?')"
echo "  Config paths: ${ITEM_COUNT:-0}  |  Active cameras in DB: ${CAMERA_COUNT}"

if [[ "${ITEM_COUNT:-0}" -gt 0 ]]; then
  echo ""
  echo "  Per-path runtime (bytesReceived > 0 means RTSP is pulling now):"
  PATH_NAMES="$(curl -sf http://127.0.0.1:9997/v3/config/paths/list 2>/dev/null | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || true)"
  ACTIVE_PULLS=0
  ALWAYS_ON=0
  for P in ${PATH_NAMES}; do
    RUNTIME="$(curl -sf "http://127.0.0.1:9997/v3/paths/get/${P}" 2>/dev/null || echo '{}')"
    BYTES="$(echo "${RUNTIME}" | grep -o '"bytesReceived":[0-9]*' | head -1 | cut -d: -f2 || echo 0)"
    READY="$(echo "${RUNTIME}" | grep -o '"ready":[^,}]*' | head -1 || echo 'ready:?')"
    READERS="$(echo "${RUNTIME}" | grep -o '"readers":\[[^]]*\]' | head -1 || echo '')"
    CFG="$(curl -sf "http://127.0.0.1:9997/v3/config/paths/get/${P}" 2>/dev/null || echo '{}')"
    ON_DEMAND="$(echo "${CFG}" | grep -o '"sourceOnDemand":[^,}]*' | head -1 || echo '?')"
    if [[ "${ON_DEMAND}" == *false* ]]; then
      ALWAYS_ON=$((ALWAYS_ON + 1))
    fi
    if [[ "${BYTES:-0}" -gt 0 ]]; then
      ACTIVE_PULLS=$((ACTIVE_PULLS + 1))
      echo "    ACTIVE  ${P}  bytes=${BYTES}  ${READY}"
    fi
  done
  echo ""
  echo "  RTSP pulls active now: ${ACTIVE_PULLS}"
  if [[ "${ALWAYS_ON}" -gt 0 ]]; then
    bad "${ALWAYS_ON} path(s) still have sourceOnDemand=false — re-save cameras or git pull + restart"
  elif [[ "${ACTIVE_PULLS}" -eq 0 && "${ITEM_COUNT:-0}" -gt 0 ]]; then
    ok "Paths registered but no RTSP pull (on-demand idle — good when nobody is watching)"
  fi
  if [[ "${ACTIVE_PULLS}" -gt 5 ]]; then
    warn "Many simultaneous RTSP pulls (${ACTIVE_PULLS}) — each ~1–4 Mbps from DVR + HLS egress to viewers"
  fi
fi

echo ""
echo "==> MediaMTX recent logs"
sudo journalctl -u mediamtx -n 20 --no-pager 2>/dev/null | tail -15 || warn "cannot read mediamtx journal"

echo ""
echo "==> MongoDB + Nginx"
systemctl is-active mongod 2>/dev/null && ok "mongod active" || bad "mongod not active"
systemctl is-active nginx 2>/dev/null && ok "nginx active" || bad "nginx not active"

echo ""
echo "==> API health"
HEALTH="$(curl -sf --max-time 10 http://127.0.0.1:5280/api/health 2>/dev/null || true)"
if [[ -n "${HEALTH}" ]]; then
  ok "API responded: ${HEALTH}"
else
  bad "API not responding on :5280 — likely cause of disconnects"
fi

echo ""
echo "=============================================="
echo "  AWS Console checks (browser)"
echo "=============================================="
echo "  1. EC2 → Instances → select instance → Monitoring tab"
echo "     - CPUUtilization (sustained >80% = undersized)"
echo "     - NetworkIn / NetworkOut (spikes = streaming traffic)"
echo "     - StatusCheckFailed (system/instance = unhealthy)"
echo ""
echo "  2. CloudWatch → Metrics → EC2 → Per-Instance Metrics"
echo "     - NetworkPacketsOut, NetworkOut (bytes/sec)"
echo ""
echo "  3. Billing → Cost Explorer → filter Service: EC2-Other / Data Transfer"
echo "     - 'Data Transfer OUT' is the main streaming cost"
echo ""
echo "  4. If instance type is t3.micro/small with 30 cameras:"
echo "     - Upgrade to t3.medium+ or reduce concurrent viewers"
echo "     - Ensure on-demand: bash deploy/verify-streaming-config.sh"
echo ""
echo "  Quick bandwidth estimate:"
echo "    viewers × visible_cameras × ~1 Mbps HLS ≈ egress Mbps"
echo "    Example: 40 users × 3 visible tiles × 1 Mbps ≈ 120 Mbps OUT"
echo "=============================================="
