// v10.43.0 — the data behind "three kinds of ministry, everywhere" (DESIGN.md C1.1, §8.1 T-D1 – T-D5).
// The pastor (30 Sep 2026): "separate the things that are weekly or monthly — ongoing ministry — and events, which are one-time,
// one day"; he approved the three-way split. Every library idea's cadence lives in tools/ideas-src/cadence.json (strings, id-keyed,
// reviewed: a series' count is a number of gatherings its own words state, else "series"), its two next steps in next.json, the
// ideas whose own words promise no names in nocard.json; tools/build-ideas.mjs ships them as the index's "cad" column (an integer)
// and the theme records' cad / nx / nocard. The built-ins' kinds are the data design's cadence-builtins.json (30 Sep 2026), their
// next steps nextstep-builtins.json, written into index.html as CASE_CADENCE_BUILTIN and CASE_NEXT_BUILTIN.
//  T-D1 every shipped id has a cadence, no extras, valid forms        T-D2 the index's cad column, its split, the 900 KB limit
//  T-D3 theme records: cad, nx (targets ship, ongoing, not self, names the target's), nocard only on series/events
//  T-D4 the built-ins' kinds and next steps in index.html               T-D5 a broken source stops the build, nothing written
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'tools', 'ideas-src');
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 600)); console.log('    want:', JSON.stringify(e).slice(0, 300)); fail++; } else pass++; };
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const exists = f => fs.existsSync(f);
const FORM = /^(ongoing|event|series(-([3-9]|1\d|2[0-6]))?(-row)?)$/;
const cadInt = v => { if (v === 'ongoing') return 0; if (v === 'event') return 1; const m = /^series(?:-(\d+))?(-row)?$/.exec(v); const n = m && m[1] ? +m[1] : 0; return n ? (m[2] ? 100 + n : n) : 100; };
const kind = v => v === 0 ? 'ongoing' : v === 1 ? 'event' : 'series';

console.log('-- T-D1 the source: every idea has a cadence --');
const themes = read(path.join(SRC, 'themes.json')).themes.map(t => t.id);
const src = {}; for (const t of themes) for (const x of read(path.join(SRC, 'themes', t + '.json')).ideas) src[x.id] = x;
const ids = Object.keys(src);
const CAD = exists(path.join(SRC, 'cadence.json')) ? read(path.join(SRC, 'cadence.json')) : {};
c('tools/ideas-src/cadence.json exists', exists(path.join(SRC, 'cadence.json')), true);
c('it names every idea of the library (3,050), and no other id', [ids.filter(id => !(id in CAD) && !('cad' in src[id])).length, Object.keys(CAD).filter(id => !(id in src))], [0, []]);
c('every value is ongoing, event, series, series-N or series-N-row (N 3–26)', Object.entries(CAD).filter(([, v]) => !FORM.test(v)).map(([k]) => k), []);
const tally = Object.values(CAD).reduce((a, v) => { const k = kind(cadInt(v)); a[k] = (a[k] || 0) + 1; return a; }, {});
// v10.45.0: the curation's 50 new ideas (43 ongoing, 3 one-day events, 4 series)
c('1,980 ongoing · 832 one-day events · 288 series (the data design\'s classification, and the curation\'s)', [tally.ongoing, tally.event, tally.series], [1980, 832, 288]);
// C1's review of design/data/series-review.txt: a count is the number of gatherings the idea's own words state
c('reviewed: "Mission 360° TV episodes for six Friday vespers" is six sessions; "Women of the Bible: four evenings" four, not in a row',
  [CAD['global-mission-mission-360-vespers-series'], CAD['women-women-of-the-bible-library']], ['series-6', 'series-4']);
c('reviewed: "Seven summer evenings in a tent… for one July week" is seven days in a row; a challenge of days states no sessions ("series")',
  [CAD['public-evangelism-summer-tent-on-town-green'], CAD['mental-health-forty-days-check-on-one'], CAD['holidays-advent-kindness-calendar']], ['series-7-row', 'series', 'series']);

console.log('\n-- T-D2 the index: the cad column --');
const D = path.join(ROOT, 'ideas'), I = read(path.join(D, 'index.json')), col = k => I.cols.indexOf(k);
c('"cad" is the last column', I.cols[I.cols.length - 1], 'cad');
const okCad = v => v === 0 || v === 1 || (v >= 3 && v <= 26) || v === 100 || (v >= 103 && v <= 126);
c('every row: 0, 1, 3–26, 100 or 103–126', I.ideas.filter(r => !okCad(r[col('cad')])).map(r => r[0]).slice(0, 5), []);
c('every row is its source\'s cadence', I.ideas.filter(r => r[col('cad')] !== cadInt(src[r[0]].cad || CAD[r[0]])).map(r => r[0]).slice(0, 5), []);
const split = I.ideas.reduce((a, r) => { const k = kind(r[col('cad')]); a[k]++; return a; }, {ongoing: 0, event: 0, series: 0});
c('the split ships: 1,980 / 832 / 288', [split.ongoing, split.event, split.series], [1980, 832, 288]);
const bytes = fs.statSync(path.join(D, 'index.json')).size;
// v10.45.0 (DESIGN-SURVEY §6.4): the limit is 1,000 KB raw and 300 KB gzipped (what a phone downloads); its purpose, a search that loads fast on a phone, is kept
const gz = zlib.gzipSync(fs.readFileSync(path.join(D, 'index.json'))).length;
c(`the index stays under 1,000 KB raw (${bytes} of 1,024,000 bytes) and 300 KB gzipped (${gz} of 307,200)`, [bytes < 1024000, gz < 307200], [true, true]);

console.log('\n-- T-D3 the theme records --');
const NX = exists(path.join(SRC, 'next.json')) ? read(path.join(SRC, 'next.json')) : {}, NC = exists(path.join(SRC, 'nocard.json')) ? read(path.join(SRC, 'nocard.json')) : {};
const recs = {}; for (const t of I.themes.filter(t => t.n > 0)) for (const x of read(path.join(D, t.id + '.json')).ideas) recs[x.id] = x;
c('every record carries its cad, the index\'s', I.ideas.filter(r => recs[r[0]].cad !== r[col('cad')]).map(r => r[0]).slice(0, 5), []);
const evs = I.ideas.filter(r => r[col('cad')] !== 0).map(r => r[0]);
c('every series and event (1,120) has its two next steps (nx)', [evs.length, evs.filter(id => !Array.isArray(recs[id].nx) || recs[id].nx.length !== 2).slice(0, 5)], [1120, []]);
const bad = [];
for (const id of evs) for (const [t, n, ne] of recs[id].nx || []) { const y = recs[t];
  if (!y || t === id || y.cad !== 0 || n !== y.en.n || ne !== y.es.n) bad.push(id + ' → ' + t); }
c('…each target ships, is ongoing, is not the idea itself, and carries the target\'s own names (EN, ES)', bad.slice(0, 5), []);
c('…and they are next.json\'s, in its order', evs.filter(id => JSON.stringify(recs[id].nx.map(z => z[0])) !== JSON.stringify(NX[id])).slice(0, 5), []);
c('no ongoing idea has next steps', I.ideas.filter(r => r[col('cad')] === 0 && recs[r[0]].nx).map(r => r[0]).slice(0, 5), []);
const noc = Object.keys(recs).filter(id => recs[id].nocard === true);
c('"nocard" on exactly nocard.json\'s 68 ideas, each a series or an event', [noc.length, noc.sort().join() === Object.keys(NC).sort().join(), noc.filter(id => recs[id].cad === 0)], [68, true, []]);

console.log('\n-- T-D4 the built-ins (index.html) --');
const app = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const lit = (start) => { const a = app.indexOf(start); if (a < 0) return null; let i = app.indexOf('{', a), d = 0; for (let j = i; j < app.length; j++) { if (app[j] === '{') d++; else if (app[j] === '}') { d--; if (!d) return app.slice(i, j + 1); } } return null; };
let CB = null, NB = null;
try { CB = new Function('return ' + lit('const CASE_CADENCE_BUILTIN='))(); } catch (e) { CB = null; }
try { NB = new Function('return ' + lit('const CASE_NEXT_BUILTIN='))(); } catch (e) { NB = null; }
const EV = ['rights-clinic', 'backpack-giveaway', 'fall-festival', 'car-care', 'christmas-store', 'health-expo', 'kids-health', 'questions-night', 'lit-doors', 'kids-books',
  'blood-drive', 'blessing-bags', 'toy-swap', 'neighbor-table', 'come-and-see', 'thank-you-run', 'school-supplies', 'exam-packs'];
const SER = {vbs: 105, 'sports-camp': 105, 'proph-news': 104, 'proph-language': 104, 'four-nights': 104, 'stop-smoking': 8, chip: 8, 'cooking-school': 6, 'mental-health': 4, grief: 8,
  archaeology: 3, 'family-life-series': 4, 'drive-in': 4, 'money-course': 6, 'health-to-why': 4, 'grief-to-hope': 6, 'parents-study': 6, 'open-baptism-class': 8};
c('CASE_CADENCE_BUILTIN: the 18 one-day events and the 18 series of cadence-builtins.json, with their own counts (FOLLOWUP.md §1.2)',
  CB && [Object.keys(CB).filter(k => CB[k] === 1).sort(), Object.fromEntries(Object.entries(CB).filter(([, v]) => v !== 1).sort())], [EV.slice().sort(), Object.fromEntries(Object.entries(SER).sort())]);
// the built-ins: SIGNATURE and the small groups the page adds to it (SIGNATURE.push(...SMALL_GROUPS))
const idsOf = start => [...app.slice(app.indexOf(start), app.indexOf('\n];', app.indexOf(start))).matchAll(/\{\s*id:'([a-z0-9-]+)'/g)].map(m => m[1]);
const SIG = new Set([...idsOf('const SIGNATURE=['), ...idsOf('const SMALL_GROUPS=[')]);
c('CASE_NEXT_BUILTIN: every built-in event and series (36), two targets each', NB && [Object.keys(NB).sort().join() === [...EV, ...Object.keys(SER)].sort().join(), Object.values(NB).every(v => v.length === 2)], [true, true]);
const nbBad = [];
if (NB) for (const [k, v] of Object.entries(NB)) for (const [t, n, ne] of v) {
  if (t === k) nbBad.push(k + ' self');
  else if (SIG.has(t)) { if (CB && CB[t] !== undefined) nbBad.push(`${k} → ${t} is not ongoing`); if (n || ne) nbBad.push(`${k} → ${t}: a built-in's names come from the app`); }
  else if (!recs[t]) nbBad.push(`${k} → ${t} unknown`);
  else if (recs[t].cad !== 0 || n !== recs[t].en.n || ne !== recs[t].es.n) nbBad.push(`${k} → ${t}: not ongoing, or not its own names`); }
c('…every target ongoing; built-in targets nameless (the app names them), the library\'s carry the source\'s names', nbBad, []);
c('…the SPEC\'s own examples: the back-to-school giveaway → the homework club; the health fair → the blood pressure check (its pick: the cooking school)',
  NB && [NB['backpack-giveaway'][0][0], NB['health-expo'][0][0]], ['homework-club', 'bp-clinic']);

console.log('\n-- T-D5 a broken source stops the build --');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'terrain-v43-'));
try {
  const s2 = path.join(tmp, 'src'); fs.mkdirSync(s2);
  for (const f of ['themes', 'themes.json', 'vocab.json', 'validate.mjs', 'reach.json']) fs.symlinkSync(path.join(SRC, f), path.join(s2, f));
  const out = 'tests/.tmp-v43-' + process.pid, OUT = path.join(ROOT, out);
  const run = (cad, nx, nc) => { fs.writeFileSync(path.join(s2, 'cadence.json'), JSON.stringify(cad)); fs.writeFileSync(path.join(s2, 'next.json'), JSON.stringify(nx)); fs.writeFileSync(path.join(s2, 'nocard.json'), JSON.stringify(nc));
    fs.rmSync(OUT, {recursive: true, force: true});
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build-ideas.mjs'), '--src', s2, '--out', out], {cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20});
    return {status: r.status, wrote: fs.existsSync(OUT), out: r.stdout}; };
  const ev1 = evs[0], on1 = I.ideas.find(r => r[col('cad')] === 0)[0];
  let r = run({...CAD, [on1]: 'weekly'}, NX, NC);
  c('a value that is not a cadence: exit 1, nothing written, and it says which', [r.status, r.wrote, new RegExp(`CADENCE ${on1}: "weekly"`).test(r.out)], [1, false, true]);
  r = run({...CAD, 'no-such-idea': 'event'}, NX, NC);
  c('an id the library does not have: exit 1, nothing written', [r.status, r.wrote, /CADENCE no-such-idea: not an idea/.test(r.out)], [1, false, true]);
  const { [on1]: _drop, ...lessCad } = CAD;
  r = run(lessCad, NX, NC);
  c('an idea with no cadence: exit 1, nothing written', [r.status, r.wrote, new RegExp(`CADENCE ${on1}: no cadence`).test(r.out)], [1, false, true]);
  r = run(CAD, {...NX, [ev1]: [evs[1], NX[ev1][1]]}, NC);
  c('an event as a next step: exit 1, nothing written', [r.status, r.wrote, new RegExp(`NEXT ${ev1}: ${evs[1]} is not ongoing`).test(r.out)], [1, false, true]);
  r = run(CAD, NX, {...NC, [on1]: 'no names'});
  c('"no card" on an ongoing idea: exit 1, nothing written', [r.status, r.wrote, new RegExp(`NOCARD ${on1}: only a series or an event`).test(r.out)], [1, false, true]);
  fs.rmSync(OUT, {recursive: true, force: true});
} finally { fs.rmSync(tmp, {recursive: true, force: true}); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
