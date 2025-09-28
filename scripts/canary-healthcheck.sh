#!/usr/bin/env bash
set -euo pipefail

if [ -z "${1-}" ]; then
  echo "Usage: $0 <url>"
  exit 2
fi

URL="$1"

# Basic HTTP health check
status=$(curl -s -o /dev/null -w '%{http_code}' "$URL")
if [ "$status" -ne 200 ]; then
  echo "Healthcheck failed: HTTP status $status"
  exit 3
fi

# Lightweight DOM check for a known string (Overview heading)
html=$(curl -s "$URL")
if ! echo "$html" | grep -q "Overview"; then
  echo "Healthcheck failed: Overview text not found in HTML"
  exit 4
fi

echo "Healthcheck OK"
exit 0
