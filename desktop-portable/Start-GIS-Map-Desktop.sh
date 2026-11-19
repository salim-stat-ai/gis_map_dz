#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
APP_FILE="$DIR/GIS-Map-Algeria-2030-Portable.html"
if command -v google-chrome >/dev/null 2>&1; then
  google-chrome --app="file://$APP_FILE" >/dev/null 2>&1 &
elif command -v microsoft-edge >/dev/null 2>&1; then
  microsoft-edge --app="file://$APP_FILE" >/dev/null 2>&1 &
elif command -v chromium >/dev/null 2>&1; then
  chromium --app="file://$APP_FILE" >/dev/null 2>&1 &
else
  xdg-open "$APP_FILE"
fi
