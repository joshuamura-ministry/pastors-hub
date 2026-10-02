// "Learn from other conferences": rebuild the served data in conferences/ from tools/conferences/src.
// Usage (from the repo root):
//   node tools/conferences/build.mjs           rebuild conferences/ and tools/conferences/MATCH-REVIEW.txt
//   node tools/conferences/build.mjs --check   rebuild in memory only; exit 1 if conferences/ is not what src/ makes
// Order: the year ahead (year-ahead.mjs), then the profiles (profiles.mjs), then the served files (pack.mjs).
// Nothing is written if any step fails (a missing published-to line, a link that is not https, an unknown status…).
// See README.md in this folder for the monthly refresh.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildYearAhead } from './year-ahead.mjs';
import { buildProfiles } from './profiles.mjs';
import { packServed } from './pack.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const SRC = join(HERE, 'src');
export const OUT = resolve(HERE, '..', '..', 'conferences');

// Everything, in memory: { files: {relative path: text}, review: [lines], lines: [report lines], profiles, yearAhead }.
// cfg: src/config.json unless given (the tests move the check date to see the windows move with it).
export function buildAll(src = SRC, cfg) {
  const ya = buildYearAhead(src, cfg);
  const pr = buildProfiles(src, ya.out, cfg);
  const files = packServed(pr.out, ya.out);
  return { files, review: pr.review, lines: ya.lines.concat(pr.lines), profiles: pr.out, yearAhead: ya.out };
}

// The files in conferences/ now, as {relative path: text}.
export function readServed(out = OUT) {
  const got = {};
  if (!existsSync(out)) return got;
  for (const f of readdirSync(out, { recursive: true })) {
    const p = join(out, f);
    if (/\.json$/.test(f)) got[f.split('\\').join('/')] = readFileSync(p, 'utf8');
  }
  return got;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const check = process.argv.includes('--check');
  const { files, review, lines } = buildAll();
  const warn = lines.filter(l => /^CHECK/.test(l));
  if (check) {
    const have = readServed();
    const keys = new Set(Object.keys(files).concat(Object.keys(have)));
    const diff = [...keys].filter(k => files[k] !== have[k]).sort();
    console.log(diff.length ? `conferences/ is NOT up to date: ${diff.length} file(s) differ (${diff.slice(0, 6).join(', ')}${diff.length > 6 ? ', …' : ''})` : 'conferences/ is up to date');
    process.exit(diff.length ? 1 : 0);
  }
  // write: the new files, and remove any old file the new build does not make
  mkdirSync(join(OUT, 'c'), { recursive: true });
  const have = readServed();
  for (const k of Object.keys(have)) if (!(k in files)) rmSync(join(OUT, k));
  let bytes = 0;
  for (const [k, text] of Object.entries(files)) { writeFileSync(join(OUT, k), text); bytes += Buffer.byteLength(text); }
  writeFileSync(join(HERE, 'MATCH-REVIEW.txt'), review.join('\n') + '\n');
  const idx = JSON.parse(files['index.json']);
  console.log(`conferences/: ${Object.keys(files).length} files, ${Math.round(bytes / 1024)} KB (index.json ${Math.round(Buffer.byteLength(files['index.json']) / 1024)} KB); checked ${idx.checked}; version ${idx.v}`);
  console.log('tools/conferences/MATCH-REVIEW.txt: ' + review.length + ' initiatives checked against the calendars (read it before the pull request)');
  for (const w of warn) console.log(w);
  if (process.argv.includes('--verbose')) for (const l of lines) console.log(l);
}
