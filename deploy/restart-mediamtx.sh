#!/usr/bin/env bash
# Fix and restart MediaMTX on EC2 (port conflicts, config sync)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="/opt/mediamtx"
MEDIAMTX_PORTS=(8554 8888 8889 9997)

echo "==> Stopping MediaMTX service and stray processes..."
sudo systemctl stop mediamtx 2>/dev/null || true
sudo systemctl reset-failed mediamtx 2>/dev/null || true

if pgrep -x mediamtx >/dev/null 2>&1; then
  echo "    Killing mediamtx processes..."
  sudo pkill -x mediamtx || true
  sleep 2
fi

for port in "${MEDIAMTX_PORTS[@]}"; do
  if sudo ss -tlnp | grep -q ":${port} "; then
    echo "    Freeing port ${port}..."
    sudo fuser -k "${port}/tcp" 2>/dev/null || true
  fi
done
sleep 1

if sudo ss -tlnp | grep -E ':8554|:8888|:8889|:9997' >/dev/null 2>&1; then
  echo "ERROR: MediaMTX ports still in use:"
  sudo ss -tlnp | grep -E ':8554|:8888|:8889|:9997' || true
  echo "Run: sudo fuser -k 8554/tcp 8888/tcp 8889/tcp 9997/tcp"
  exit 1
fi

echo "==> Installing systemd unit and production config..."
sudo cp "${REPO_ROOT}/deploy/systemd/mediamtx.service" /etc/systemd/system/mediamtx.service
sudo cp "${REPO_ROOT}/mediamtx/mediamtx-prod.yml" "${INSTALL_DIR}/mediamtx.yml"

if ! grep -q 'hlsVariant: fmp4' "${INSTALL_DIR}/mediamtx.yml"; then
  echo "ERROR: ${INSTALL_DIR}/mediamtx.yml is missing hlsVariant: fmp4 (required for H265 DVR streams)"
  echo "       Run git pull in ${REPO_ROOT} and retry."
  exit 1
fi

if grep -q 'Global settings' "${INSTALL_DIR}/mediamtx.yml"; then
  echo "ERROR: ${INSTALL_DIR}/mediamtx.yml looks like the full dev template, not mediamtx-prod.yml"
  exit 1
fi

echo "==> Starting MediaMTX via systemd..."
sudo systemctl daemon-reload
sudo systemctl enable mediamtx
sudo systemctl start mediamtx
sleep 2

if ! sudo systemctl is-active --quiet mediamtx; then
  echo "ERROR: mediamtx failed to start"
  sudo journalctl -u mediamtx -n 20 --no-pager
  exit 1
fi

echo "==> Status:"
sudo systemctl status mediamtx --no-pager

echo ""
echo "Recent logs:"
sudo journalctl -u mediamtx -n 10 --no-pager

echo ""
echo "Config check (expect hlsVariant fmp4):"
curl -sf http://127.0.0.1:9997/v3/config/global/get | grep -o '"hlsVariant":"[^"]*"' || echo "API not reachable"

echo ""
echo "Re-sync cameras after restart:"
echo "  pm2 restart cctv-api"
echo "  # or: cd ${REPO_ROOT}/backend && npm run sync:mediamtx"
