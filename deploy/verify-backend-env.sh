#!/usr/bin/env bash
# Verify backend/.env on EC2 (ENCRYPTION_KEY, API health)
set -euo pipefail

BACKEND_DIR="${1:-/home/ubuntu/LiveServer/LiveStreaming/backend}"

if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
  echo "ERROR: ${BACKEND_DIR}/.env not found"
  exit 1
fi

echo "==> ENCRYPTION_KEY check"
KEY_BYTES="$(node -e "
  require('dotenv').config({ path: '${BACKEND_DIR}/.env' });
  const key = process.env.ENCRYPTION_KEY || '';
  if (!key) { console.log('missing'); process.exit(0); }
  console.log(Buffer.from(key, 'base64').length);
")"

KEY_OK=false
if [[ "${KEY_BYTES}" == "missing" ]]; then
  echo "  FAIL ENCRYPTION_KEY is not set"
elif [[ "${KEY_BYTES}" == "32" ]]; then
  echo "  OK   ENCRYPTION_KEY decodes to 32 bytes"
  KEY_OK=true
else
  echo "  FAIL ENCRYPTION_KEY decodes to ${KEY_BYTES} bytes (need 32)"
  echo "       Fix: openssl rand -base64 32"
fi

echo ""
echo "==> API health (local)"
if curl -sf "http://127.0.0.1:5280/api/health" | tee /tmp/cctv-health.json; then
  echo ""
  if grep -q '"encryptionKeyOk":true' /tmp/cctv-health.json 2>/dev/null; then
    echo "  OK   encryptionKeyOk: true"
  else
    echo "  WARN encryptionKeyOk is false — restart PM2 from backend/ after fixing .env"
  fi
else
  echo "  FAIL API not reachable on :5280"
fi

if [[ "${KEY_OK}" != "true" ]]; then
  exit 1
fi
