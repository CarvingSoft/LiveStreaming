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

echo "==> Ensuring swap (small EC2 instances need this for tsc)..."
bash "${REPO_ROOT}/deploy/setup-swap.sh" || true

echo "==> Verifying backend .env..."
bash "${REPO_ROOT}/deploy/verify-backend-env.sh" "${BACKEND_DIR}" || {
  echo "ERROR: Fix backend/.env (ENCRYPTION_KEY must decode to 32 bytes) before deploying."
  exit 1
}

echo "==> Building backend..."
cd "${BACKEND_DIR}"
npm ci
npm run build:prod

echo "==> Syncing MediaMTX production config..."
bash "${REPO_ROOT}/deploy/restart-mediamtx.sh"

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

echo "==> Starting backend with PM2 (cwd=${BACKEND_DIR} loads .env)..."
pm2 delete cctv-api 2>/dev/null || true
pm2 start "${BACKEND_DIR}/dist/server.js" --name cctv-api --cwd "${BACKEND_DIR}"
pm2 save

echo "==> Syncing cameras to MediaMTX..."
cd "${BACKEND_DIR}"
npm run sync:mediamtx:prod

if ! pm2 startup systemd -u "${USER}" --hp "${HOME}" 2>/dev/null | grep -q "already"; then
  echo "Run the sudo command printed below if PM2 startup is not configured:"
  pm2 startup systemd -u "${USER}" --hp "${HOME}" || true
fi

echo "==> Application deployed."
HEALTH_JSON="$(curl -sf "http://127.0.0.1:5280/api/health" || true)"
if [[ -z "${HEALTH_JSON}" ]]; then
  echo "ERROR: API health check failed — is MongoDB running?"
  exit 1
fi

echo "${HEALTH_JSON}"

if ! grep -q '"encryptionKeyOk":true' <<< "${HEALTH_JSON}"; then
  echo ""
  echo "ERROR: Deploy finished but API reports invalid or stale build."
  echo "  - Stale build: grep encryptionKeyOk backend/dist/routes/health.routes.js"
  echo "  - Invalid key:  bash deploy/verify-backend-env.sh ${BACKEND_DIR}"
  echo "  - Restart:      pm2 delete cctv-api && pm2 start ${BACKEND_DIR}/dist/server.js --name cctv-api --cwd ${BACKEND_DIR}"
  bash "${REPO_ROOT}/deploy/diagnose-production.sh" || true
  exit 1
fi
