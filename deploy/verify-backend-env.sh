#!/usr/bin/env bash
# Verify backend/.env on EC2 (ENCRYPTION_KEY, API health)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=env-utils.sh
source "${SCRIPT_DIR}/env-utils.sh"

BACKEND_DIR="${1:-/home/ubuntu/LiveServer/LiveStreaming/backend}"
ENV_FILE="${BACKEND_DIR}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} not found"
  exit 1
fi

echo "==> ENCRYPTION_KEY check"
ENCRYPTION_KEY="$(read_env_var "${ENV_FILE}" ENCRYPTION_KEY || true)"
KEY_BYTES="$(encryption_key_byte_length "${ENCRYPTION_KEY:-}")"

KEY_OK=false
if [[ "${KEY_BYTES}" == "missing" ]]; then
  echo "  FAIL ENCRYPTION_KEY is not set"
elif [[ "${KEY_BYTES}" == "invalid" ]]; then
  echo "  FAIL ENCRYPTION_KEY is not valid base64"
  echo "       Fix: openssl rand -base64 32"
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
