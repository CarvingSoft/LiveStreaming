#!/usr/bin/env bash
# Generate production secrets for backend/.env
set -euo pipefail

echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "PLAYBACK_JWT_SECRET=$(openssl rand -base64 48)"
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
