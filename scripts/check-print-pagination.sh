#!/usr/bin/env bash
set -euo pipefail

# Native WebKit printing needs macOS and the Xcode command-line tools.
if [[ "$(uname -s)" != Darwin ]]; then
  echo "This check requires macOS and the Xcode command-line tools." >&2
  exit 1
fi
cd "$(dirname "$0")/.."
scratch=$(mktemp -d "${TMPDIR:-/tmp}/bingo-print.XXXXXX")
trap 'rm -rf "$scratch"' EXIT
xcrun swiftc scripts/check-print-pagination.swift -o "$scratch/check-print"

check() {
  "$scratch/check-print" "${PRINT_TEST_URL:-http://localhost:3000/en}" \
    "$1" "$2" "$scratch/output.pdf" "$PWD/app/test.bingoCards"
}

if [[ $# -gt 0 ]]; then
  check "$1" "$2"
else
  # Complete sheets, a partial final sheet, and the default large deck.
  for per_page in 1 2 3 4; do
    check "$per_page" "$per_page"
    check "$per_page" 9
  done
  check 4 200
  # Maximum-density sheets with every new print option enabled.
  PRINT_CUSTOM_OPTIONS=1 check 4 9
fi
