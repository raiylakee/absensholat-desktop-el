#!/bin/bash
# Generate icon.ico dari PNG untuk Windows NSIS installer
# Requires: imagemagick (convert command)
# Jalankan dari root proyek: ./build/generate-icon.sh

set -e

convert "src/assets/applogo/Logo Sholat-01.png" \
  -define icon:auto-resize=256,128,64,48,32,16 \
  build/icon.ico

echo "Icon generated: build/icon.ico"
