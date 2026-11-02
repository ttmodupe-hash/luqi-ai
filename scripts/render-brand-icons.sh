#!/usr/bin/env bash
set -euo pipefail
# Operator asset preparation only; Inkscape is not a runtime/build dependency.
cd "$(dirname "$0")/.."
for size in 192 512; do
  inkscape public/icon.svg --export-type=png --export-width="$size" --export-height="$size" --export-filename="public/icon-${size}.png"
done
inkscape public/icon-maskable.svg --export-type=png --export-width=512 --export-height=512 --export-filename=public/icon-maskable-512.png
for asset in luqi-mark.svg icon.svg icon-maskable.svg icon-192.png icon-512.png icon-maskable-512.png; do
  cp "public/$asset" "app/public/$asset"
done
