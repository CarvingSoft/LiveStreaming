#!/usr/bin/env bash
# Phase 5.1 — Configure Nginx reverse proxy
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Installing Nginx site configs..."
sudo cp "${REPO_ROOT}/deploy/nginx/live.carvingsoft.com.conf" \
  /etc/nginx/sites-available/live.carvingsoft.com
sudo cp "${REPO_ROOT}/deploy/nginx/api.live.carvingsoft.com.conf" \
  /etc/nginx/sites-available/api.live.carvingsoft.com

sudo ln -sf /etc/nginx/sites-available/live.carvingsoft.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/api.live.carvingsoft.com /etc/nginx/sites-enabled/

if [[ -f /etc/nginx/sites-enabled/default ]]; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi

sudo nginx -t
sudo systemctl reload nginx

echo "==> Nginx configured for live.carvingsoft.com and api.live.carvingsoft.com (HTTP)."
echo "    Run deploy/setup-ssl.sh after DNS has propagated."
