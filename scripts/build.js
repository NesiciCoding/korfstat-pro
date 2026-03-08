#!/usr/bin/env node
/**
 * KorfStat Pro — Cross-Platform Tauri Build Script
 *
 * Usage:
 *   node scripts/build.js              → build for the current OS (native)
 *   node scripts/build.js --target all → build all bundles (native platform only)
 *   node scripts/build.js --target mac → macOS .dmg + .app (must run on macOS)
 *   node scripts/build.js --target win → Windows .msi + .exe (must run on Windows or use CI)
 *   node scripts/build.js --target linux → Linux .deb + .AppImage (must run on Linux)
 *   node scripts/build.js --debug      → build a debug (unoptimised) build
 *
 * NOTE: Tauri requires you to build on the target operating system.
 *       Cross-compilation is NOT supported by Tauri itself.
 *       To build for all platforms, use the included GitHub Actions workflow:
 *         .github/workflows/build-tauri.yml
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Argument Parsing ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const targetArg = args.find(a => a.startsWith('--target'))?.split('=')[1]
  ?? (args[args.indexOf('--target') + 1] !== undefined && !args[args.indexOf('--target') + 1].startsWith('--')
      ? args[args.indexOf('--target') + 1]
      : null);
const isDebug = args.includes('--debug');
const verbose = args.includes('--verbose');

// ── Target Bundle Maps ───────────────────────────────────────────────────────
const TARGET_BUNDLES = {
  mac:   ['dmg', 'app'],
  win:   ['msi', 'nsis'],
  linux: ['deb', 'appimage', 'rpm'],
};

function getBundles(target) {
  if (!target || target === 'all') return null; // null = let tauri.conf.json decide ("all")
  const key = target.toLowerCase();
  const bundles = TARGET_BUNDLES[key];
  if (!bundles) {
    console.error(`\n❌  Unknown target: "${target}"`);
    console.error(`   Valid values: mac | win | linux | all\n`);
    process.exit(1);
  }
  return bundles;
}

// ── Platform Pre-Flight Checks ───────────────────────────────────────────────
function checkPrerequisites() {
  const checks = [
    { cmd: 'rustc --version',   label: 'Rust' },
    { cmd: 'cargo --version',   label: 'Cargo' },
  ];

  console.log('\n📋  Checking prerequisites...');
  let allGood = true;

  for (const { cmd, label } of checks) {
    try {
      const version = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
      console.log(`   ✅  ${label}: ${version}`);
    } catch {
      console.error(`   ❌  ${label} not found. Please install it first.`);
      if (label === 'Rust') {
        console.error('       → https://rustup.rs/');
      }
      allGood = false;
    }
  }

  if (!allGood) {
    console.error('\nInstall the missing tools and try again.\n');
    process.exit(1);
  }
}

// ── Build ────────────────────────────────────────────────────────────────────
function build() {
  checkPrerequisites();

  const bundles = getBundles(targetArg);
  const tauriCli = path.join(ROOT, 'node_modules', '.bin', 'tauri');

  if (!existsSync(tauriCli)) {
    console.error('\n❌  @tauri-apps/cli not found. Run "npm install" first.\n');
    process.exit(1);
  }

  const bundleArg = bundles ? `--bundles ${bundles.join(',')}` : '';
  const debugFlag = isDebug ? '--debug' : '';
  const verboseFlag = verbose ? '--verbose' : '';

  const cmd = [
    tauriCli,
    'build',
    bundleArg,
    debugFlag,
    verboseFlag,
  ].filter(Boolean).join(' ');

  const targetLabel = targetArg ?? `native (${process.platform})`;
  const modeLabel   = isDebug ? 'DEBUG' : 'RELEASE';

  console.log('\n🚀  KorfStat Pro — Tauri Build');
  console.log(`   Platform : ${targetLabel}`);
  console.log(`   Mode     : ${modeLabel}`);
  console.log(`   Bundles  : ${bundles?.join(', ') ?? 'all (from tauri.conf.json)'}`);
  console.log(`   Command  : ${cmd}\n`);

  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
    console.log('\n✅  Build complete!');
    console.log(`   Output: src-tauri/target/${isDebug ? 'debug' : 'release'}/bundle/\n`);
  } catch {
    console.error('\n❌  Build failed. Check the output above for details.\n');
    process.exit(1);
  }
}

build();
