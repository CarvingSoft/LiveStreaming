#!/usr/bin/env bash
# Full production install — run on Ubuntu 22.04 EC2 after aws-prereqs.md
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Carvingsoft Live Streaming — Production Install"
echo "================================================"
echo ""
echo "Prerequisites: see deploy/aws-prereqs.md"
echo "Required: backend/.env configured from backend/.env.production.example"
echo ""

if [[ ! -f "${REPO_ROOT}/backend/.env" ]]; then
  echo "ERROR: Create ${REPO_ROOT}/backend/.env before running this script."
  echo "  cp backend/.env.production.example backend/.env"
  echo "  nano backend/.env"
  exit 1
fi

bash "${REPO_ROOT}/deploy/setup-swap.sh"
bash "${REPO_ROOT}/deploy/install-server.sh"
bash "${REPO_ROOT}/deploy/deploy-app.sh"
bash "${REPO_ROOT}/deploy/setup-nginx.sh"

echo ""
echo "==> Next steps:"
echo "  1. Ensure DNS A records point to this server's Elastic IP"
echo "  2. Run: bash deploy/setup-ssl.sh"
echo "  3. Log in at https://live.carvingsoft.com/login"
echo "  4. Create a site and camera in admin"
echo "  5. Run: bash deploy/verify-deployment.sh <site-slug>"
