// Chesapeake's public calendar feed (an .ics file) -> src/feeds/chesapeake.json, for the year ahead.
// Usage (from the repo root):  node tools/conferences/feed.mjs <path-to-chesapeake.ics>
// Only what the builder reads is kept: each meeting's title, start, end and status, for the months from the
// check date (src/config.json) to the end of the year ahead. Descriptions, places and contacts are never kept.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { windowsOf } from './window.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { readIcs } = require('./ics.cjs');
const ics = process.argv[2];
if (!ics) { console.error('Usage: node tools/conferences/feed.mjs <path-to-chesapeake.ics>'); process.exit(2); }
const W = windowsOf(JSON.parse(readFileSync(join(HERE, 'src', 'config.json'), 'utf8')));
const occ = readIcs(ics, {}).occ.filter(o => o.start >= W.FROM && o.start <= W.TO)
  .map(o => ({ summary: o.summary, start: o.start, end: o.end, status: o.status || null }));
const out = { _about: 'Chesapeake Conference public calendar feed (https://ccosda.org/calendar/), read ' + W.TODAY + ': title, start, end and status of each meeting from ' + W.FROM + ' to ' + W.TO + '. Made by tools/conferences/feed.mjs.', occ };
writeFileSync(join(HERE, 'src', 'feeds', 'chesapeake.json'), JSON.stringify(out, null, 1) + '\n');
console.log('src/feeds/chesapeake.json:', occ.length, 'meetings');
