// Learn from other conferences: the data (tools/conferences → conferences/) and the site's copy of it.
// The pastor's answer (2 Oct 2026): the calendars are checked again every month and sent to him as a pull request, so
// the build lives in the repo (tools/conferences, one command) and the served folder conferences/ is made from
// tools/conferences/src only; this suite rebuilds it in memory and fails if conferences/ differs by one byte.
// Also: the site's build copies conferences/ (netlify.toml), every file the page fetches exists, every link is https,
// comparisons use the past 12 months only (the windows move with the check date), and the year ahead is never scored.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 400)); console.log('    want:', JSON.stringify(e).slice(0, 200)); fail++; } else pass++; };
const done = () => { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); };

console.log('\n-- the site copies conferences/ (netlify.toml) --');
const toml = readFileSync(join(ROOT, 'netlify.toml'), 'utf8');
const cmd = (toml.match(/^\s*command\s*=\s*"([^"]*)"/m) || [])[1] || '';
c('the build command copies conferences/ into the site', /(^|&&)\s*cp -R conferences site\/\s*(&&|$)/.test(cmd));
c('…and still copies the page, the ideas and the fonts', ['cp index.html site/', 'cp -R ideas site/', 'cp -R fonts site/'].every(x => cmd.includes(x)));
c('the source data is never copied (tools/ stays out of the site)', /tools/.test(cmd), false);
c('the site is still the site/ folder', /^\s*publish\s*=\s*"site"/m.test(toml));

console.log('\n-- the build lives in the repo: one command, src/ in, conferences/ out --');
const B = join(ROOT, 'tools', 'conferences', 'build.mjs');
c('tools/conferences/build.mjs exists', existsSync(B));
c('tools/conferences/README.md explains the monthly refresh', existsSync(join(ROOT, 'tools/conferences/README.md')) && /re-gather/i.test(readFileSync(join(ROOT, 'tools/conferences/README.md'), 'utf8')) && /pull request/i.test(readFileSync(join(ROOT, 'tools/conferences/README.md'), 'utf8')));
for (const f of ['config.json', 'through.json', 'stats.json', 'initiatives.json', 'feeds/chesapeake.json']) c('src/' + f + ' is in the repo', existsSync(join(ROOT, 'tools/conferences/src', f)));
c('src/events, src/ahead and src/registry hold the gathered files', existsSync(join(ROOT, 'tools/conferences/src/events')) && readdirSync(join(ROOT, 'tools/conferences/src/events')).filter(f => f.endsWith('.json')).length === 50
  && existsSync(join(ROOT, 'tools/conferences/src/ahead/above.json')) && readdirSync(join(ROOT, 'tools/conferences/src/registry')).length >= 8);
if (!existsSync(B) || !existsSync(join(ROOT, 'conferences', 'index.json'))) { c('conferences/index.json exists', false); done(); }
const M = await import(pathToFileURL(B).href);
const t0 = Date.now();
const A = M.buildAll();
console.log('    built in ' + (Date.now() - t0) + ' ms');
const have = M.readServed(join(ROOT, 'conferences'));
const keys = [...new Set(Object.keys(A.files).concat(Object.keys(have)))].sort();
const differ = keys.filter(k => A.files[k] !== have[k]);
c('conferences/ is exactly what tools/conferences/src makes (run node tools/conferences/build.mjs)', differ, []);
c('MATCH-REVIEW.txt is the build\'s own', readFileSync(join(ROOT, 'tools/conferences/MATCH-REVIEW.txt'), 'utf8'), A.review.join('\n') + '\n');
c('the source paths are the repo\'s, never a working folder on one computer', /\/Users\/|Terrain-work|Terrain-design-notes|v52\//.test(readFileSync(join(ROOT, 'tools/conferences/year-ahead.mjs'), 'utf8') + readFileSync(join(ROOT, 'tools/conferences/profiles.mjs'), 'utf8') + readFileSync(B, 'utf8')), false);

console.log('\n-- the files the page fetches --');
const idx = JSON.parse(have['index.json']);
const slugs = idx.conferences.map(x => x.slug);
c('50 US conferences in the index', slugs.length, 50);
c('every slug is plain (letters and hyphens)', slugs.every(s => /^[a-z]+(?:-[a-z]+)*$/.test(s)));
c('a file per conference, and nothing else in c/', Object.keys(have).filter(k => k.startsWith('c/')).sort(), slugs.map(s => `c/${s}.json`).sort());
c('ahead.json is there', !!have['ahead.json']);
c('the version names this data', /^[0-9a-f]{12}$/.test(idx.v));
c('the index is small enough for a first view (under 120 KB)', Buffer.byteLength(have['index.json']) < 120000);
c('every conference file under 40 KB', Object.entries(have).filter(([k]) => k.startsWith('c/')).every(([, v]) => Buffer.byteLength(v) < 40000));
c('every suggested conference exists', idx.conferences.every(x => x.suggest.length >= 3 && x.suggest.every(s => slugs.includes(s.slug) && ['union', 'size', 'side', 'other', 'strong'].includes(s.k))));
// the approved v52 sample's own suggestions on the past 12 months (v50's set, on 18 months, was Allegheny East … South Central)
c('Pennsylvania is there, with the sample\'s suggested set', idx.conferences.find(x => x.slug === 'pennsylvania').suggest.map(s => s.slug + ':' + s.k), ['ohio:union', 'arkansas-louisiana:size', 'nevada-utah:side', 'central-california:strong']);
c('every lens and group has English and Spanish', idx.lenses.every(l => l.en && l.es && l.en !== l.es) && idx.groups.every(g => g.en && g.es && g.en !== g.es));
c('no "AI" or "IA" in any label', /\bAI\b|\bIA\b/.test(JSON.stringify(idx.lenses) + JSON.stringify(idx.groups)), false);
const urls = []; const walk = (v, k) => { if (Array.isArray(v)) v.forEach(x => walk(x, k)); else if (v && typeof v === 'object') for (const [kk, x] of Object.entries(v)) walk(x, kk); else if (typeof v === 'string' && (k === 'u' || k === 'url' || k === 'calendarUrls')) urls.push(v); };
for (const v of Object.values(have)) walk(JSON.parse(v), '');
c('every link is https (' + urls.length + ' links)', urls.filter(u => !/^https:\/\/[^\s"'<>]+$/i.test(u)), []);
// v10.44 review (2 Oct 2026). Finding 8: "the other side of the country" only between the East and the West; a Midwest <-> South
// pick (Arkansas-Louisiana -> Iowa-Missouri, Texico -> Indiana) is "another part of the country" (k 'other').
const regionOf = Object.fromEntries(idx.conferences.map(x => [x.slug, x.region]));
c('no Midwest <-> South suggestion is "the other side of the country"', idx.conferences.flatMap(x => x.suggest.filter(s => s.k === 'side' && !(['East', 'West'].includes(x.region) && ['East', 'West'].includes(regionOf[s.slug]))).map(s => x.slug + '->' + s.slug)), []);
c('…they are "another part of the country" (Texico -> Indiana, Arkansas-Louisiana -> Iowa-Missouri)', ['texico', 'arkansas-louisiana'].map(sl => idx.conferences.find(x => x.slug === sl).suggest.filter(s => s.k === 'other').map(s => s.slug).join()), ['indiana', 'iowa-missouri']);
// Finding 7: a board, a school board or a constituency meeting is not a ministry event to learn from (DESIGN §4.1)
const exTitles = Object.entries(have).filter(([k]) => k.startsWith('c/')).flatMap(([k, v]) => Object.values(JSON.parse(v).examples).flat().map(e => k + ': ' + e.title));
c('no example is a board of education, a school board or a constituency meeting', exTitles.filter(t => /board of education|school board|constituency (meeting|session)/i.test(t)), []);
c('Ohio\'s Schools examples are its schools\' own events', JSON.parse(have['c/ohio.json']).examples.education.map(e => e.title).some(t => /board/i.test(t)), false);
// Finding 18: never "AI" (Spanish "IA") in anything a person reads: every string of every served file but its links
const strs = []; const walk2 = (v, k, f) => { if (Array.isArray(v)) v.forEach(x => walk2(x, k, f)); else if (v && typeof v === 'object') for (const [kk, x] of Object.entries(v)) walk2(x, kk, f); else if (typeof v === 'string' && !['u', 'url', 'calendarUrls'].includes(k) && !/^https?:/.test(v)) strs.push(f + ': ' + v); };
for (const [f, v] of Object.entries(have)) walk2(JSON.parse(v), '', f);
c('no "AI" or "IA" in any served word (' + strs.length + ' strings)', strs.filter(s => /\bAI\b|\bIA\b|artificial intelligence|inteligencia artificial/i.test(s.replace(/^[^:]+: /, ''))), []);
c('…Iowa-Missouri\'s and Indiana\'s "IA" written out', [/MO and Iowa Pathfinder Fall Camporees/.test(have['c/iowa-missouri.json']), /Graduation Weekend - Indiana Academy/.test(have['c/indiana.json'])], [true, true]);
const through = JSON.parse(readFileSync(join(ROOT, 'tools/conferences/src/through.json'), 'utf8'));
c('every conference says how far its calendar is published, in English and Spanish', slugs.every(s => through[s] && through[s].en && through[s].es && 'through' in through[s]));
const pa = JSON.parse(have['c/pennsylvania.json']);
c('Pennsylvania: published to Dec 2026, with both notes', [pa.ahead.through, !!pa.ahead.note.en, !!pa.ahead.note.es], ['2026-12', true, true]);
c('Pennsylvania: OneVoice27\'s September 2027 series says start now (12 months before)', pa.ahead.conf.filter(x => /OneVoice27/.test(x.t) && x.h).map(x => x.h[0].k), ['start-now']);

console.log('\n-- the past 12 months only; the year ahead is never scored --');
const cfg = JSON.parse(readFileSync(join(ROOT, 'tools/conferences/src/config.json'), 'utf8'));
c('the check date is 1 Oct 2026', [cfg.checked, idx.checked], ['2026-10-01', '2026-10-01']);
c('24 months: the 12 before the check month, then the year ahead', [idx.months[0], idx.months[11], idx.months[12], idx.months[23], idx.past], ['2025-10', '2026-09', '2026-10', '2027-09', 12]);
c('the profiles compare Oct 2025 – Sep 2026', [A.profiles.window.compared.from, A.profiles.window.compared.to], ['2025-10-01', '2026-09-30']);
c('every conference\'s areas add up to its ministry events (one share each, past 12 months)', idx.conferences.every(x => Object.values(x.lenses).reduce((s, l) => s + l.n, 0) === x.counts.ministryEvents));
c('…and its shares to 100% (±0.6)', idx.conferences.filter(x => x.counts.ministryEvents).every(x => Math.abs(Object.values(x.lenses).reduce((s, l) => s + l.share, 0) - 100) <= 0.6));
const lastPast = A.profiles.window.compared.to;
const examples = Object.entries(have).filter(([k]) => k.startsWith('c/')).flatMap(([, v]) => Object.values(JSON.parse(v).examples).flat());
c('no example used in a comparison is from the year ahead (' + examples.length + ' examples)', examples.filter(e => e.start && e.start > lastPast).map(e => e.title), []);
c('"typical" is the median of the usable calendars only (40 of 50)', [idx.baseline.basedOn, idx.baseline.total], [40, 50]);
const B2 = M.buildAll(undefined, { checked: '2026-11-01', firstPassTo: cfg.firstPassTo });
c('a later check date moves the compared months with it', [B2.profiles.window.compared.from, B2.profiles.window.compared.to], ['2025-11-01', '2026-10-31']);
c('…and the same months keep the same counts (Nov 2025 – Sep 2026, every conference)', A.profiles.conferences.every(p => { const q = B2.profiles.conferences.find(x => x.slug === p.slug);
  return JSON.stringify(A.profiles.window.months.slice(1, 12).map(m => p.months[m])) === JSON.stringify(B2.profiles.window.months.slice(0, 11).map(m => q.months[m])); }));
c('…while the year ahead moves on (Nov 2026 – Oct 2027)', [B2.yearAhead.window.from, B2.yearAhead.window.to], ['2026-11-01', '2027-10-31']);
done();
