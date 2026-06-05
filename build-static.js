/**
 * Static export build for Cloudflare Pages.
 *
 * All API route handlers use headers()/cookies() which Next.js 14 can't
 * statically render with output:'export'. For a pure UI walkthrough we
 * don't need them in the output at all — temporarily move them out of
 * src/app before the build, then put them back.
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APP_DIR  = path.join(__dirname, 'src', 'app');
const TEMP_DIR = path.join(__dirname, '_static_build_backup');

// Directories inside src/app to exclude from the static export
const EXCLUDE = ['api', path.join('auth', 'callback')];

// Clean temp dir
if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true, force: true });
fs.mkdirSync(TEMP_DIR);

console.log('\nPreparing static build — moving server-only routes out of src/app…');

const moved = [];
for (const rel of EXCLUDE) {
  const src  = path.join(APP_DIR, rel);
  const dest = path.join(TEMP_DIR, rel.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(src)) continue;
  console.log(`  ↳ hiding: src/app/${rel}`);
  fs.cpSync(src, dest, { recursive: true });
  fs.rmSync(src, { recursive: true, force: true });
  moved.push({ src, dest });
}

let buildOk = false;
try {
  console.log('\nRunning: npm run build\n');
  execSync('npm run build', { stdio: 'inherit' });
  buildOk = true;
  console.log('\n✅  Static build succeeded — output is in the "out/" directory.\n');
} catch {
  console.error('\n❌  Build failed.\n');
} finally {
  console.log('Restoring server-only routes…');
  for (const { src, dest } of moved.reverse()) {
    fs.mkdirSync(path.dirname(src), { recursive: true });
    fs.cpSync(dest, src, { recursive: true });
  }
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  console.log('Done.\n');
}

process.exit(buildOk ? 0 : 1);
