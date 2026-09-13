#!/usr/bin/env bash
# Phase 2–4 — Build and deploy application, seed admin, start PM2
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_WEB_ROOT="/var/www/cctv-frontend"
BACKEND_DIR="${REPO_ROOT}/backend"
FRONTEND_DIR="${REPO_ROOT}/frontend"

echo "==> Checking backend .env..."
if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
  echo "ERROR: ${BACKEND_DIR}/.env not found."
  echo "Copy backend/.env.production.example to backend/.env and fill in secrets first."
  exit 1
fi

echo "==> Building backend..."
cd "${BACKEND_DIR}"
npm ci
npm run build

echo "==> Building frontend..."
cd "${FRONTEND_DIR}"
npm ci
npm run build

echo "==> Deploying frontend static files..."
sudo mkdir -p "${FRONTEND_WEB_ROOT}"
sudo rm -rf "${FRONTEND_WEB_ROOT:?}/"*
sudo cp -r dist/frontend/browser/* "${FRONTEND_WEB_ROOT}/"
sudo chown -R www-data:www-data "${FRONTEND_WEB_ROOT}"

echo "==> Seeding admin user (skips if already exists)..."
cd "${BACKEND_DIR}"
npm run seed:prod

echo "==> Starting backend with PM2..."
if pm2 describe cctv-api >/dev/null 2>&1; then
  pm2 restart cctv-api
else
  pm2 start dist/server.js --name cctv-api
fi
pm2 save

if ! pm2 startup systemd -u "${USER}" --hp "${HOME}" 2>/dev/null | grep -q "already"; then
  echo "Run the sudo command printed below if PM2 startup is not configured:"
  pm2 startup systemd -u "${USER}" --hp "${HOME}" || true
fi

echo "==> Application deployed."
curl -sf "http://127.0.0.1:5280/api/health" | head -c 500 || echo "(health check pending — verify .env and MongoDB)"
