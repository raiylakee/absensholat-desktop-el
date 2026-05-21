#!/bin/bash
# Generate icon.ico dan icon.png dari PNG untuk Windows dan Linux installer
# Requires: imagemagick (convert command)
# Jalankan dari root proyek: ./build/generate-icon.sh

set -e

convert "src/assets/applogo/Logo Sholat-01.png" \
  -define icon:auto-resize=256,128,64,48,32,16 \
  build/icon.ico

convert "src/assets/applogo/Logo Sholat-01.png" \
  -resize 512x512 \
  build/icon.png

echo "Icons generated: build/icon.ico, build/icon.png"
