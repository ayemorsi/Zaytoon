#!/usr/bin/env bash
# test-roundups.sh — Seed fake round-up transactions via the dev-seed Edge Function.
#
# Usage:
#   ./scripts/test-roundups.sh [--email EMAIL] [--password PASSWORD] [--count N] [--trigger]
#
# Run `chmod +x scripts/test-roundups.sh` once to make this executable.

set -euo pipefail

# ── Defaults ────────────────────────────────────────────────────────────────
EMAIL=""
PASSWORD=""
COUNT=10
TRIGGER="false"

# ── Help ────────────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Seed fake round-up transactions for a Zaytoon user (dev/staging only).

Options:
  --email EMAIL       Supabase auth email (prompted if omitted)
  --password PASSWORD Supabase auth password (prompted if omitted)
  --count N           Number of transactions to seed (default: 10)
  --trigger           Pass trigger_donation=true to the function
  --help              Show this help message and exit

Environment:
  Reads EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY from .env
  in the current directory (or the repo root when run from scripts/).

Examples:
  ./scripts/test-roundups.sh
  ./scripts/test-roundups.sh --email dev@example.com --password secret --count 5 --trigger
EOF
  exit 0
}

# ── Argument parsing ─────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      usage
      ;;
    --email)
      EMAIL="$2"
      shift 2
      ;;
    --password)
      PASSWORD="$2"
      shift 2
      ;;
    --count)
      COUNT="$2"
      shift 2
      ;;
    --trigger)
      TRIGGER="true"
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Run with --help for usage." >&2
      exit 1
      ;;
  esac
done

# ── Load .env ────────────────────────────────────────────────────────────────
# Look for .env relative to the script's repo root (one level up from scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [[ ! -f "$ENV_FILE" ]]; then
  # Fallback: look in cwd
  ENV_FILE=".env"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: .env file not found. Expected at $SCRIPT_DIR/../.env or ./.env" >&2
  exit 1
fi

# Export only the two vars we need (avoid leaking other secrets)
SUPABASE_URL=""
SUPABASE_ANON_KEY=""

while IFS='=' read -r key value || [[ -n "$key" ]]; do
  # Strip leading/trailing whitespace and skip comments/empty lines
  key="${key#"${key%%[![:space:]]*}"}"
  key="${key%"${key##*[![:space:]]}"}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"

  [[ -z "$key" || "$key" == \#* ]] && continue

  case "$key" in
    EXPO_PUBLIC_SUPABASE_URL)
      SUPABASE_URL="$value"
      ;;
    EXPO_PUBLIC_SUPABASE_ANON_KEY)
      SUPABASE_ANON_KEY="$value"
      ;;
  esac
done < "$ENV_FILE"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
  echo "Error: EXPO_PUBLIC_SUPABASE_URL and/or EXPO_PUBLIC_SUPABASE_ANON_KEY not set in .env" >&2
  exit 1
fi

# ── Prompt for credentials if not provided ────────────────────────────────────
if [[ -z "$EMAIL" ]]; then
  read -r -p "Supabase email: " EMAIL
fi

if [[ -z "$PASSWORD" ]]; then
  read -r -s -p "Supabase password: " PASSWORD
  echo ""
fi

# ── Sign in ──────────────────────────────────────────────────────────────────
echo "Signing in as $EMAIL …"

AUTH_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\": \"${EMAIL}\", \"password\": \"${PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c \
  "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null || true)

if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "Error: Failed to obtain access_token. Auth response:" >&2
  echo "$AUTH_RESPONSE" >&2
  exit 1
fi

echo "Authenticated. Calling dev-seed (count=$COUNT, trigger_donation=$TRIGGER) …"
echo ""

# ── Call dev-seed ─────────────────────────────────────────────────────────────
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/dev-seed" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"count\": ${COUNT}, \"trigger_donation\": ${TRIGGER}}")

# ── Pretty-print response ─────────────────────────────────────────────────────
echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(json.dumps(data, indent=2))
except json.JSONDecodeError:
    sys.stdout.write(sys.stdin.read())
" 2>/dev/null || echo "$RESPONSE"
