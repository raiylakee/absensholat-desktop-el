#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const electronDir = path.join(__dirname, '..', 'node_modules', 'electron');
const installScript = path.join(electronDir, 'install.js');
const distDir = path.join(electronDir, 'dist');
const frameworkPath = path.join(
  distDir,
  'Electron.app',
  'Contents',
  'Frameworks',
  'Electron Framework.framework',
  'Versions',
  'A',
  'Electron Framework'
);

// Run the standard electron install
try {
  execSync(`node "${installScript}"`, { stdio: 'inherit' });
} catch {
  // install.js may exit non-zero if extraction fails, continue to fix
}

// Check if the framework binary was properly extracted (should be >100MB)
if (fs.existsSync(frameworkPath)) {
  const stats = fs.statSync(frameworkPath);
  if (stats.size > 1_000_000) {
    // Framework is OK, ensure path.txt exists
    writePathTxt();
    process.exit(0);
  }
}

// Framework missing or too small - extract-zip failed, use system unzip
console.log('Re-extracting Electron with system unzip...');

// Find the cached zip
const cacheDir = path.join(
  process.env.HOME || '',
  'Library',
  'Caches',
  'electron'
);

const pkg = JSON.parse(fs.readFileSync(path.join(electronDir, 'package.json'), 'utf-8'));
const version = pkg.version;
const zipName = `electron-v${version}-darwin-x64.zip`;

// Try to find cached zip in any hash subdirectory
let zipPath = null;
if (fs.existsSync(cacheDir)) {
  for (const entry of fs.readdirSync(cacheDir)) {
    const candidate = path.join(cacheDir, entry, zipName);
    if (fs.existsSync(candidate)) {
      zipPath = candidate;
      break;
    }
  }
}

if (!zipPath) {
  console.error('Could not find cached Electron zip. Run: node node_modules/electron/install.js');
  process.exit(1);
}

// Clean and re-extract
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
execSync(`unzip -o -q "${zipPath}"`, { cwd: distDir, stdio: 'inherit' });

// Verify
if (!fs.existsSync(frameworkPath)) {
  console.error('Extraction failed. Try: npm cache clean --force && npm install');
  process.exit(1);
}

writePathTxt();
console.log('Electron binary installed successfully.');

function writePathTxt() {
  const platformPath = 'Electron.app/Contents/MacOS/Electron';
  fs.writeFileSync(path.join(electronDir, 'path.txt'), platformPath);
}
