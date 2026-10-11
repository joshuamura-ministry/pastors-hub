// v10.68.0 — Terrain's app icon. The pastor (11 Oct 2026): "Now I need a beautiful app icon for my phone when I wanna add it to my home
// screen and also I need to add it here on my Mac as well as an app icon please embed that in".
//
// Two drawings live here: terrain-icon.svg (the icon: a church lit on a hill, the map's lines below it in the tools' colours) and
// favicon.svg (the same church, simpler, for a browser tab). This script draws every served file from them with Google Chrome, on a Mac:
//
//   node tools/icons/make-icons.mjs
//
// It writes, from the repo's root:
//   apple-touch-icon.png         180 × 180, the whole square (an iPhone or iPad rounds the corners itself)
//   favicon.ico                  16, 32 and 48 (browsers that ask for /favicon.ico)
//   icons/favicon.svg            the tab icon itself (most browsers)
//   icons/favicon-32.png         32 × 32 (Safari's tab)
//   icons/icon-192.png, icon-512.png            rounded corners (an installed app on a computer)
//   icons/icon-maskable-512.png  the whole square (Android cuts its own shape; the church and cross stay inside its safe circle)
// and with --mac <folder>, Terrain.iconset and Terrain.icns there (a Mac app's icon: the rounded square of macOS, with its margin).
// tests/v68-app-icon checks the files' sizes and the page's links to them. Never edit the PNGs by hand: change a drawing, run this again.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..', '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TMP = mkdtempSync(join(tmpdir(), 'terrain-icons-'));
const ICON = readFileSync(join(HERE, 'terrain-icon.svg'), 'utf8'), FAV = readFileSync(join(HERE, 'favicon.svg'), 'utf8');
const uri = s => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');

// One picture: the drawing at `size`, inside a square of `canvas` (a margin when larger), its corners rounded by `radius` (a share of
// `size`), an optional shadow (the Mac's). Transparent outside the drawing.
function draw(out, { svg = ICON, size, canvas = size, radius = 0, shadow = '' }) {
  const html = join(TMP, 'p.html'), off = (canvas - size) / 2;
  writeFileSync(html, `<!doctype html><html><head><style>html,body{margin:0;background:transparent;width:${canvas}px;height:${canvas}px;overflow:hidden}
    img{position:absolute;left:${off}px;top:${off}px;width:${size}px;height:${size}px;border-radius:${radius * 100}%;${shadow ? 'filter:drop-shadow(' + shadow + ');' : ''}}
    </style></head><body><img src="${uri(svg)}"></body></html>`);
  mkdirSync(dirname(out), { recursive: true });
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--default-background-color=00000000',
    `--window-size=${canvas},${canvas}`, `--screenshot=${out}`, 'file://' + html], { stdio: 'ignore' });
  const w = readFileSync(out).readUInt32BE(16), h = readFileSync(out).readUInt32BE(20);
  if (w !== canvas || h !== canvas) throw new Error(`${out}: ${w}×${h}, not ${canvas}×${canvas}`);
}

// A .ico holding PNG pictures (allowed since Windows Vista; every browser reads it).
function ico(out, pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let at = head.length;
  pngs.forEach((p, i) => { const s = p.readUInt32BE(16), e = 6 + 16 * i;
    head[e] = s >= 256 ? 0 : s; head[e + 1] = s >= 256 ? 0 : s; head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(p.length, e + 8); head.writeUInt32LE(at, e + 12); at += p.length; });
  writeFileSync(out, Buffer.concat([head, ...pngs]));
}

const R = 0.225;                                   // the rounded square's corners, as iPhone draws them
draw(join(ROOT, 'apple-touch-icon.png'), { size: 180 });
draw(join(ROOT, 'icons', 'icon-192.png'), { size: 192, radius: R });
draw(join(ROOT, 'icons', 'icon-512.png'), { size: 512, radius: R });
draw(join(ROOT, 'icons', 'icon-maskable-512.png'), { size: 512 });
draw(join(ROOT, 'icons', 'favicon-32.png'), { svg: FAV, size: 32 });
writeFileSync(join(ROOT, 'icons', 'favicon.svg'), FAV);
const small = [16, 32, 48].map(s => { const f = join(TMP, `f${s}.png`); draw(f, { svg: FAV, size: s }); return readFileSync(f); });
ico(join(ROOT, 'favicon.ico'), small);

// A Mac app's icon (only with --mac <folder>): Apple's grid, the rounded square 824 of 1024 with a soft shadow below it.
const mi = process.argv.indexOf('--mac');
if (mi > 0) {
  const dir = resolve(process.argv[mi + 1]), set = join(dir, 'Terrain.iconset'); rmSync(set, { recursive: true, force: true }); mkdirSync(set, { recursive: true });
  for (const s of [16, 32, 128, 256, 512]) for (const k of [1, 2]) {
    const px = s * k, svg = px <= 64 ? FAV : ICON;
    draw(join(set, `icon_${s}x${s}${k === 2 ? '@2x' : ''}.png`), { svg, canvas: px, size: Math.round(px * 824 / 1024), radius: 0.2256,
      shadow: px >= 128 ? `0 ${px * 10 / 1024}px ${px * 10 / 1024}px rgba(0,0,0,.3)` : '' });
  }
  execFileSync('/usr/bin/iconutil', ['-c', 'icns', set, '-o', join(dir, 'Terrain.icns')]);
}
rmSync(TMP, { recursive: true, force: true });
console.log('icons written');
