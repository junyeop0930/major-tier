// 티어 막대 로고로 앱 아이콘 PNG를 만든다 (외부 라이브러리 없이)
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const out = path.join(__dirname, '..', 'icons');
fs.mkdirSync(out, { recursive: true });

const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

function png(size, pad, bg) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b]) => { const i = (y * size + x) * 4; px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, hex(bg));
  // 52x52 마크를 pad 안쪽에 그림 (둥근 끝 막대 5개)
  const inner = size - pad * 2, s = inner / 52;
  const bars = [[0, 52, '#ff5a5f'], [10.9, 44, '#ff9f1c'], [21.8, 36, '#ffd23f'], [32.7, 28, '#7bd389'], [43.6, 20, '#5aa9e6']];
  for (const [by, w, col] of bars) {
    const x0 = pad, y0 = pad + by * s, x1 = pad + w * s, y1 = y0 + 8.4 * s, r = 3 * s, c = hex(col);
    for (let y = Math.floor(y0); y < Math.ceil(y1); y++) for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      const cx = Math.min(Math.max(x + .5, x0 + r), x1 - r), cy = Math.min(Math.max(y + .5, y0 + r), y1 - r);
      if ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r) set(x, y, c);
    }
  }
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

fs.writeFileSync(path.join(out, 'icon-192.png'), png(192, 34, '#ffffff'));
fs.writeFileSync(path.join(out, 'icon-512.png'), png(512, 92, '#ffffff'));
fs.writeFileSync(path.join(out, 'maskable-512.png'), png(512, 128, '#ffffff'));
fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), png(180, 32, '#ffffff'));
console.log('icons written');
