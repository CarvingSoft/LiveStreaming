#!/usr/bin/env bash
# Remove MediaMTX paths that no longer exist in MongoDB (run on EC2)
set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "==> Dry run — no paths will be deleted"
fi

echo "==> Cameras in MongoDB"
VALID_PATHS="$(mktemp)"
mongosh cctv_platform --quiet --eval '
  db.cameras.find({}, { mediamtxPath: 1, name: 1, isActive: 1 }).forEach(c => {
    print(c.mediamtxPath + "\t" + (c.isActive ? "active" : "inactive") + "\t" + c.name);
  });
' | tee /dev/stderr | awk '{print $1}' > "${VALID_PATHS}"

VALID_COUNT="$(wc -l < "${VALID_PATHS}" | tr -d ' ')"
echo ""
echo "==> MediaMTX config paths"
MTX_PATHS="$(curl -sf http://127.0.0.1:9997/v3/config/paths/list | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || true)"

if [[ -z "${MTX_PATHS}" ]]; then
  echo "  (none)"
  rm -f "${VALID_PATHS}"
  exit 0
fi

ORPHANS=0
KEPT=0

while IFS= read -r path; do
  [[ -z "${path}" ]] && continue
  if grep -qx "${path}" "${VALID_PATHS}"; then
    echo "  KEEP   ${path}"
    KEPT=$((KEPT + 1))
  else
    echo "  ORPHAN ${path}"
    ORPHANS=$((ORPHANS + 1))
    if [[ "${DRY_RUN}" == false ]]; then
      encoded="$(python3 -c "import urllib.parse; print(urllib.parse.quote('${path}', safe=''))" 2>/dev/null || echo "${path}")"
      curl -sf -X DELETE "http://127.0.0.1:9997/v3/config/paths/delete/${encoded}" >/dev/null \
        && echo "         deleted" \
        || echo "         FAIL delete"
    fi
  fi
done <<< "${MTX_PATHS}"

rm -f "${VALID_PATHS}"

echo ""
echo "==> Summary: ${KEPT} kept, ${ORPHANS} orphan(s), ${VALID_COUNT} camera(s) in DB"
if [[ "${DRY_RUN}" == true && "${ORPHANS}" -gt 0 ]]; then
  echo "Run without --dry-run to delete orphans:"
  echo "  bash deploy/prune-orphan-mediamtx-paths.sh"
fi
