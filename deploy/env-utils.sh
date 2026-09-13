#!/usr/bin/env bash
# Shell helpers for reading backend/.env without Node dependencies.

# Read one variable from a .env file (no dotenv required).
read_env_var() {
  local env_file="$1"
  local var_name="$2"
  local line value

  [[ -f "${env_file}" ]] || return 1

  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line%%#*}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "${line}" ]] && continue
    if [[ "${line}" == "${var_name}="* ]]; then
      value="${line#${var_name}=}"
      value="${value%$'\r'}"
      if [[ "${value}" =~ ^\"(.*)\"$ ]]; then
        value="${BASH_REMATCH[1]}"
      elif [[ "${value}" =~ ^\'(.*)\'$ ]]; then
        value="${BASH_REMATCH[1]}"
      fi
      printf '%s' "${value}"
      return 0
    fi
  done < "${env_file}"

  return 1
}

# Print base64-decoded byte length, or: missing | invalid
encryption_key_byte_length() {
  local key="$1"

  if [[ -z "${key}" ]]; then
    echo "missing"
    return 0
  fi

  node -e "
    const key = process.argv[1] || '';
    if (!key) { console.log('missing'); process.exit(0); }
    try {
      const len = Buffer.from(key, 'base64').length;
      console.log(Number.isFinite(len) ? len : 'invalid');
    } catch {
      console.log('invalid');
    }
  " "${key}"
}
