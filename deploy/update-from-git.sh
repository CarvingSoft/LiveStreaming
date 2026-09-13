#!/usr/bin/env bash
# Pull latest code and redeploy (run on EC2 after git is configured)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${REPO_ROOT}"

if [[ ! -d .git ]]; then
  echo "ERROR: ${REPO_ROOT} is not a git repository."
  echo "See docs/GIT-DEPLOY.md for setup."
  exit 1
fi

echo "==> Pulling latest code (discards local changes to tracked files such as backend/dist/)..."
git fetch origin
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git reset --hard "origin/${BRANCH}"

echo "==> Building and deploying app (includes MediaMTX restart + camera sync)..."
bash "${REPO_ROOT}/deploy/deploy-app.sh"

echo ""
echo "==> Done. Verify:"
echo "  curl -sf http://127.0.0.1:5280/api/health"
echo "  bash deploy/verify-deployment.sh <site-slug>"
