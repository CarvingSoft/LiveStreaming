#!/usr/bin/env bash
# Diagnose HLS 502 on production (run on EC2)
set -euo pipefail

MEDIAMTX_PATH="${1:-site-kochi-entrance}"

echo "==> MediaMTX config"
grep hlsVariant /opt/mediamtx/mediamtx.yml || echo "  WARN hlsVariant not found"

echo ""
echo "==> Path in MediaMTX config"
curl -sf "http://127.0.0.1:9997/v3/config/paths/get/${MEDIAMTX_PATH}" | head -c 800 || echo "  FAIL path not in MediaMTX config"

echo ""
echo ""
echo "==> Path runtime status"
curl -sf "http://127.0.0.1:9997/v3/paths/get/${MEDIAMTX_PATH}" | head -c 800 || echo "  FAIL path not running (RTSP may not have connected yet)"

echo ""
echo ""
echo "==> Direct HLS (bypass API proxy)"
echo "--- index.m3u8 ---"
curl -si --max-time 30 "http://127.0.0.1:8888/${MEDIAMTX_PATH}/index.m3u8?cookieCheck=1" | head -20
echo ""
echo "--- main_stream.m3u8 ---"
curl -si --max-time 30 "http://127.0.0.1:8888/${MEDIAMTX_PATH}/main_stream.m3u8?cookieCheck=1" | head -20

echo ""
echo "==> MediaMTX logs (RTSP errors appear here)"
sudo journalctl -u mediamtx -n 30 --no-pager | tail -20

echo ""
echo "==> If RTSP host is 192.168.x.x / 10.x.x.x, EC2 cannot reach it unless VPN or public IP is configured."
