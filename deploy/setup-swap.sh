#!/usr/bin/env bash
# Add 2GB swap on small EC2 instances (fixes tsc SIGKILL / OOM during npm run build)
set -euo pipefail

if swapon --show | grep -q '/swapfile'; then
  echo "Swap already enabled:"
  swapon --show
  free -h
  exit 0
fi

echo "==> Creating 2GB swap file..."
sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

if ! grep -q '/swapfile' /etc/fstab; then
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "==> Swap enabled:"
swapon --show
free -h
