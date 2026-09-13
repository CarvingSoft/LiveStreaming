#!/usr/bin/env bash
# Phase 5.2 — Obtain Let's Encrypt SSL certificates
set -euo pipefail

CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@carvingsoft.com}"

echo "==> Requesting SSL certificates..."
echo "    Ensure DNS for live.carvingsoft.com and api.live.carvingsoft.com points to this server."

sudo certbot --nginx \
  -d live.carvingsoft.com \
  -d api.live.carvingsoft.com \
  --non-interactive \
  --agree-tos \
  -m "${CERTBOT_EMAIL}" \
  --redirect

echo "==> SSL configured."
sudo certbot renew --dry-run
