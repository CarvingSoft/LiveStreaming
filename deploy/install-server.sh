#!/usr/bin/env bash
# Phase 1 — Install server stack on Ubuntu 22.04 EC2
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MEDIAMTX_VERSION="${MEDIAMTX_VERSION:-v1.21.0}"
MEDIAMTX_INSTALL_DIR="/opt/mediamtx"

echo "==> Updating system packages..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx ufw wget

echo "==> Installing Node.js 20..."
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi
node -v
npm -v

echo "==> Installing MongoDB 7..."
if ! command -v mongod >/dev/null 2>&1; then
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
    sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

  sudo apt update
  sudo apt install -y mongodb-org
fi
sudo systemctl enable mongod
sudo systemctl start mongod

echo "==> Installing PM2..."
if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi

echo "==> Installing MediaMTX ${MEDIAMTX_VERSION}..."
sudo mkdir -p "${MEDIAMTX_INSTALL_DIR}"
cd "${MEDIAMTX_INSTALL_DIR}"

ARCHIVE="mediamtx_${MEDIAMTX_VERSION}_linux_amd64.tar.gz"
DOWNLOAD_URL="https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/${ARCHIVE}"

if [[ ! -x "${MEDIAMTX_INSTALL_DIR}/mediamtx" ]]; then
  sudo wget -O mediamtx.tar.gz "${DOWNLOAD_URL}"
  sudo tar -xzf mediamtx.tar.gz
  sudo rm -f mediamtx.tar.gz
fi

sudo cp "/opt/mediamtx/mediamtx-prod.yml" "/opt/mediamtx.yml"
sudo chmod +x /opt/mediamtx"

echo "==> Installing MediaMTX systemd service..."
sudo cp "${REPO_ROOT}/deploy/systemd/mediamtx.service" /etc/systemd/system/mediamtx.service
sudo systemctl daemon-reload
sudo systemctl enable mediamtx
sudo systemctl restart mediamtx

echo "==> Configuring UFW firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
echo "y" | sudo ufw enable || true

echo "==> Server stack installed."
echo "    MediaMTX status: $(systemctl is-active mediamtx)"
echo "    MongoDB status:  $(systemctl is-active mongod)"
