#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
APP_FILE="$DIR/GIS-Map-Algeria-2030-Portable.html"
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="file://$APP_FILE"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -na "Microsoft Edge" --args --app="file://$APP_FILE"
else
  open "$APP_FILE"
fi
