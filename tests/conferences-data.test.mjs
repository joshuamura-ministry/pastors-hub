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
// v10.71.0: read from the data (the monthly refresh moves the dates): the approved v52 sample's set was pinned here by name (Ohio,
// Arkansas-Louisiana, Nevada-Utah, Central California) and the November 2026 calendars moved the "strong" pick; each pick is now held
// to the builder's own rule (profiles.mjs, "default comparison set"): same union · similar size (within ×1.6, another union) · the other
// side of the country (East <-> West, a full calendar) · strongest, on a full calendar, in the area where this calendar is thinnest
{ const by = Object.fromEntries(idx.conferences.map(x => [x.slug, x])), P = by.pennsylvania, S = P.suggest, q = k => by[(S.find(s => s.k === k) || {}).slug] || { calendar: {}, lenses: {}, official: {} };
  const core = idx.lenses.filter(l => l.core).map(l => l.id), med = idx.baseline.lens;
  const weakest = core.slice().sort((a, b) => (med[b] - P.lenses[b].share) - (med[a] - P.lenses[a].share))[0];
  const gap = (a, b) => Math.abs(Math.log(a.official.members / b.official.members));
  c('Pennsylvania is there, with a suggested set that follows the builder\'s rules (same union · similar size · the other side · strong where its calendar is thinnest: ' + weakest + ')',
    [S.map(s => s.k), q('union').union === P.union && q('union').calendar.confidence !== 'low', q('size').union !== P.union && gap(q('size'), P) < Math.log(1.6),
      q('side').region === 'West' && q('side').calendar.confidence === 'high', (S.find(s => s.k === 'strong') || {}).lens === weakest && q('strong').calendar.confidence === 'high' && (q('strong').lenses[weakest] || {}).share >= med[weakest]],
    [['union', 'size', 'side', 'strong'], true, true, true, true]); }
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
// v10.71.0: read from the data (the monthly refresh moves the dates): two titles were pinned here by name; now every "IA" string of each
// conference's own source files (src/events, src/ahead) is written out with pack.mjs's word, and the served file must hold none as written
// and at least one of them (across the two) in its written-out form, so a dropped string never passes for a written-out one
{ const WO = { 'iowa-missouri': 'Iowa', indiana: 'Indiana Academy' };
  const srcStrs = sl => { const out = []; for (const d of ['events', 'ahead']) { const f = join(ROOT, 'tools/conferences/src', d, sl + '.json'); if (!existsSync(f)) continue;
    const w = (v, k) => { if (Array.isArray(v)) v.forEach(x => w(x, k)); else if (v && typeof v === 'object') for (const [kk, x] of Object.entries(v)) w(x, kk); else if (typeof v === 'string' && !['u', 'url', 'calendarUrls'].includes(k)) out.push(v); };
    w(JSON.parse(readFileSync(f, 'utf8')), ''); } return out; };
  const ia = Object.entries(WO).map(([sl, to]) => { const pre = 'c/' + sl + '.json: ', served = strs.filter(s => s.startsWith(pre)).map(s => s.slice(pre.length));
    const src = srcStrs(sl).filter(s => /\bIA\b/.test(s)), written = src.map(s => s.replace(/\bIA\b/g, to));
    return { sl, src: src.length, asWritten: served.filter(s => /\bIA\b/.test(s)).length, reached: written.filter(w => served.some(s => s.includes(w))).length }; });
  c('…Iowa-Missouri\'s and Indiana\'s "IA" written out (' + ia.map(x => x.sl + ': ' + x.src + ' in the source, ' + x.reached + ' served as "' + WO[x.sl] + '"').join('; ') + ')',
    [ia.map(x => x.asWritten), ia.reduce((n, x) => n + x.reached, 0) > 0], [[0, 0], true]); }
const through = JSON.parse(readFileSync(join(ROOT, 'tools/conferences/src/through.json'), 'utf8'));
c('every conference says how far its calendar is published, in English and Spanish', slugs.every(s => through[s] && through[s].en && through[s].es && 'through' in through[s]));
const pa = JSON.parse(have['c/pennsylvania.json']);
// v10.71.0: read from the data (the monthly refresh moves the dates): how far Pennsylvania's calendar is published is src/through.json's
c('Pennsylvania: published as far as through.json says (' + through.pennsylvania.through + '), with both notes', [pa.ahead.through, !!pa.ahead.note.en, !!pa.ahead.note.es], [through.pennsylvania.through, true, true]);
c('Pennsylvania: OneVoice27\'s September 2027 series says start now (12 months before)', pa.ahead.conf.filter(x => /OneVoice27/.test(x.t) && x.h).map(x => x.h[0].k), ['start-now']);

console.log('\n-- the past 12 months only; the year ahead is never scored --');
const cfg = JSON.parse(readFileSync(join(ROOT, 'tools/conferences/src/config.json'), 'utf8'));
// v10.71.0: read from the data (the monthly refresh moves the dates): the check date is config.json's, a real day no later than today, and
// index.json and ahead.json carry the same one; the 24 months and both windows follow from its month, never from a date written here
const addM = (m, n) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 7);
const lastDay = m => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).toISOString().slice(0, 10);
const CM = cfg.checked.slice(0, 7), ah = JSON.parse(have['ahead.json']);
c('the check date is config.json\'s (' + cfg.checked + ': a real day, not after today), and index.json and ahead.json carry the same one',
  [/^\d{4}-\d{2}-\d{2}$/.test(cfg.checked) && !isNaN(Date.parse(cfg.checked)) && cfg.checked <= new Date().toISOString().slice(0, 10), idx.checked, ah.today], [true, cfg.checked, cfg.checked]);
c('24 months: the 12 before the check month, then the year ahead from the check month (' + CM + ')', [idx.months.length, idx.months[0], idx.months[11], idx.months[12], idx.months[23], idx.past], [24, addM(CM, -12), addM(CM, -1), CM, addM(CM, 11), 12]);
c('the profiles compare the 12 months before the check month (' + addM(CM, -12) + ' to ' + addM(CM, -1) + '); the year ahead starts with it', [A.profiles.window.compared.from, A.profiles.window.compared.to, ah.window.from, ah.window.to],
  [addM(CM, -12) + '-01', lastDay(addM(CM, -1)), CM + '-01', lastDay(addM(CM, 11))]);
c('every conference\'s areas add up to its ministry events (one share each, past 12 months)', idx.conferences.every(x => Object.values(x.lenses).reduce((s, l) => s + l.n, 0) === x.counts.ministryEvents));
c('…and its shares to 100% (±0.6)', idx.conferences.filter(x => x.counts.ministryEvents).every(x => Math.abs(Object.values(x.lenses).reduce((s, l) => s + l.share, 0) - 100) <= 0.6));
const lastPast = A.profiles.window.compared.to;
const examples = Object.entries(have).filter(([k]) => k.startsWith('c/')).flatMap(([, v]) => Object.values(JSON.parse(v).examples).flat());
c('no example used in a comparison is from the year ahead (' + examples.length + ' examples)', examples.filter(e => e.start && e.start > lastPast).map(e => e.title), []);
// v10.71.0: read from the data (the monthly refresh moves the dates): the usable calendars are the ones not graded thin
const usable = idx.conferences.filter(x => x.calendar.confidence !== 'low').length;
c('"typical" is the median of the usable calendars only (' + usable + ' of 50)', [idx.baseline.basedOn, idx.baseline.total], [usable, 50]);
// v10.71.0: read from the data (the monthly refresh moves the dates): the later check date is the first day of the month after config.json's,
// so these windows are always one month on from the served ones (a date written here fell on the served month itself in November 2026)
const NEXT = addM(CM, 1) + '-01';
const B2 = M.buildAll(undefined, { checked: NEXT, firstPassTo: cfg.firstPassTo });
c('a later check date (' + NEXT + ') moves the compared months with it', [B2.profiles.window.compared.from, B2.profiles.window.compared.to], [addM(CM, -11) + '-01', lastDay(CM)]);
c('…and the same months keep the same counts (' + addM(CM, -11) + ' to ' + addM(CM, -1) + ', every conference)', A.profiles.conferences.every(p => { const q = B2.profiles.conferences.find(x => x.slug === p.slug);
  return JSON.stringify(A.profiles.window.months.slice(1, 12).map(m => p.months[m])) === JSON.stringify(B2.profiles.window.months.slice(0, 11).map(m => q.months[m])); }));
c('…while the year ahead moves on (' + addM(CM, 1) + ' to ' + addM(CM, 12) + ')', [B2.yearAhead.window.from, B2.yearAhead.window.to], [NEXT, lastDay(addM(CM, 12))]);
done();
