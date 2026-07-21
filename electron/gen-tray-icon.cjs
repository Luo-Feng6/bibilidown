/**
 * Generate a 32x32 PNG tray icon for BilibiliDown.
 *
 * Primary: uses sharp to convert build/icon.svg (high quality, no pixel art artifacts).
 * Fallback: hand-coded 32x32 PNG using only Node.js built-ins (zlib, fs).
 *
 * Usage: node electron/gen-tray-icon.cjs
 * Output: electron/tray-icon.png
 */

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, 'tray-icon.png');
const SVG_SRC = path.join(__dirname, '..', 'build', 'icon.svg');

// ── Primary: sharp conversion ──
async function generateWithSharp() {
  try {
    const sharp = require('sharp');
    const svgBuffer = fs.readFileSync(SVG_SRC);

    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(OUT_PATH);

    const stat = fs.statSync(OUT_PATH);
    console.log(`Tray icon (sharp): ${OUT_PATH} (${(stat.size / 1024).toFixed(1)} KB)`);
    return true;
  } catch (_err) {
    return false;
  }
}

// ── Fallback: hand-coded PNG ──
function generateFallback() {
  const zlib = require('zlib');

  const W = 32;
  const H = 32;

  const rawRows = [];
  for (let y = 0; y < H; y++) {
    const row = Buffer.alloc(1 + W * 4, 0);
    for (let x = 0; x < W; x++) {
      const cx = 15.5, cy = 15.5, r = 14;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offset = 1 + x * 4;

      if (dist <= r) {
        row[offset]     = 0xFB;
        row[offset + 1] = 0x72;
        row[offset + 2] = 0x99;
        row[offset + 3] = 0xFF;

        if (dist > r - 0.8) {
          const alpha = Math.round(255 * (r - dist) / 0.8);
          row[offset + 3] = Math.max(0, Math.min(255, alpha));
        }

        // White download arrow (simplified pixel art)
        const inShaft  = x >= 14 && x <= 17 && y >= 7 && y <= 17;
        const inHeadLeft  = x >= 5 && x <= 13 && y >= 17 && y <= 18 && (y - 17 >= Math.abs(x - 9) * 0.5);
        const inHeadRight = x >= 18 && x <= 26 && y >= 17 && y <= 18 && (y - 17 >= Math.abs(x - 22) * 0.5);
        const inPoint = x >= 14 && x <= 17 && y >= 19 && y <= 20;
        const inBase = x >= 6 && x <= 25 && y >= 24 && y <= 25;

        if (inShaft || inHeadLeft || inHeadRight || inPoint || inBase) {
          row[offset]     = 0xFF;
          row[offset + 1] = 0xFF;
          row[offset + 2] = 0xFF;
          row[offset + 3] = 0xFF;
        }
      }
    }
    rawRows.push(row);
  }
  const rawData = Buffer.concat(rawRows);

  function crc32(buf) {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c;
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function pngChunk(type, data) {
    const typeBuffer = Buffer.from(type, 'ascii');
    const header = Buffer.alloc(8);
    const combined = Buffer.concat([typeBuffer, data]);
    const crc = crc32(combined);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    header.writeUInt32BE(data.length, 0);
    return Buffer.concat([header.subarray(0, 4), typeBuffer, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(rawData);
  if (!compressed) throw new Error('zlib deflate returned empty');

  const png = Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);

  fs.writeFileSync(OUT_PATH, png);
  console.log(`Tray icon (fallback): ${OUT_PATH} (${png.length} bytes)`);
  return true;
}

// ── Main ──
(async () => {
  const ok = await generateWithSharp();
  if (!ok) {
    console.log('sharp unavailable, using fallback PNG generator...');
    generateFallback();
  }
})().catch((err) => {
  console.error('Failed to generate tray icon:', err);
  process.exit(1);
});
