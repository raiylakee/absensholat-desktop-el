# Build Resources

Direktori ini digunakan oleh electron-builder untuk resource build.

## icon.ico

File `icon.ico` diperlukan oleh electron-builder untuk Windows NSIS installer.

Untuk generate dari PNG yang sudah ada, jalankan:

```bash
./build/generate-icon.sh
```

Atau manual dengan ImageMagick:

```bash
convert "src/assets/applogo/Logo Sholat-01.png" \
  -define icon:auto-resize=256,128,64,48,32,16 \
  build/icon.ico
```

File `icon.ico` harus ada sebelum menjalankan `npm run build` untuk target Windows.
