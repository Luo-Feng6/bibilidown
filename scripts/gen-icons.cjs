/**
 * Icon generation script for BilibiliDown.
 * Converts build/icon.svg to PNG at multiple sizes using sharp.
 *
 * Usage: node scripts/gen-icons.cjs
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const tasks = [
  { size: 1024, out: 'build/icon.png', desc: 'App icon (source for electron-builder)' },
  { size: 256,  out: 'build/icon-256.png', desc: 'App icon 256px' },
  { size: 64,   out: 'public/favicon.png', desc: 'Browser tab favicon' },
  { size: 32,   out: 'electron/tray-icon.png', desc: 'System tray icon' },
];

const svgPath = path.join(ROOT, 'build', 'icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

(async () => {
  let generated = 0;

  for (const task of tasks) {
    const outPath = path.join(ROOT, task.out);
    // Ensure the parent directory exists
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      await sharp(svgBuffer)
        .resize(task.size, task.size)
        .png()
        .toFile(outPath);

      const stat = fs.statSync(outPath);
      console.log(`  [${task.size}x${task.size}] ${task.out}  (${(stat.size / 1024).toFixed(1)} KB)  — ${task.desc}`);
      generated++;
    } catch (err) {
      console.error(`  FAILED [${task.size}x${task.size}] ${task.out}: ${err.message}`);
    }
  }

  console.log(`\nDone — ${generated}/${tasks.length} icons generated.`);
})().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
