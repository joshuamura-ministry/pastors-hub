#!/usr/bin/env node
/* Terrain · the Idea Library packager.                                      build-ideas 2
 *
 *   node tools/build-ideas.mjs --src <library folder> [--skip-invalid] [--out ideas]
 *
 * <library folder> holds the writers' source: themes.json, vocab.json, validate.mjs and
 * themes/<theme>.json (see SCHEMA.md there). This script
 *   1. runs `node validate.mjs --all --no-review` in that folder (the writers' own validator);
 *   2. checks every idea again against THIS app (index.html beside this folder): an id must
 *      never be a built-in (SIGNATURE) id or start with draft-/sg-, tags must be profile() tags,
 *      skills U_SKILLS keys and facilities U_FAC keys, because the page keys tables by them;
 *   3. writes what the page loads, lazily, from the site root (publish dir = repo root):
 *        ideas/index.json      every idea's id, theme, names EN/ES, search words and the
 *                              numbers the ranking and the capacity check need (no long text)
 *        ideas/<theme>.json    one theme's ideas in full (EN + ES text, steps), fetched when a
 *                              theme or a search result from it is shown
 *        ideas/words.json      the words of every description (EN + ES, folded), in index order,
 *                              fetched only when a search names no theme (the full-text fallback)
 *   4. (v10.41) ships each idea's reach in the index: "in" (for God's people: members, the church
 *      family, its officers and services), "out" (for the community, guests who visit included) or
 *      "both". An idea's own "reach" field comes first, then <library folder>/reach.json
 *      ({id: "in"|"out"|"both"}, the classifier's file for ideas written before reach existed);
 *      an idea with neither ships its theme's default (the theme's "reach", else "in" for an
 *      "inside": true theme, else "out"), so every row carries in, out or both. The index's themes
 *      carry "inside" and "reach" too. A reach that is not one of the three stops the build like
 *      any other error.
 *   5. (v10.43) ships each idea's cadence (the pastor, 30 Sep 2026: "separate the things that are
 *      weekly or monthly — ongoing ministry — and events, which are one-time, one day"): the index's
 *      last column "cad" and the theme record's "cad", an integer: 0 ongoing, 1 a one-day event,
 *      3–26 a series of that many sessions one a week, 103–126 that many on days in a row, 100 a
 *      series whose idea states no count. The idea's own "cad" field ("ongoing" | "event" |
 *      "series-N" | "series-N-row" | "series" | "series-row") comes first, then
 *      <library folder>/cadence.json ({id: the same strings}); with cadence.json present every idea
 *      must have one. <library folder>/next.json ({id: [ongoing id, ongoing id]}) gives each series
 *      and event the two ongoing ideas it feeds (theme record "nx": [[id, name, nombre], …]);
 *      <library folder>/nocard.json ({id: "reason"}) marks the events and series whose own words
 *      promise no names (theme record "nocard": true; or the idea's own "nocard": true): no
 *      connection card and no follow-up plan. Any fault in the three files stops the build like a
 *      bad reach (--skip-invalid leaves the faulty entries out instead).
 *   6. (v10.45, DESIGN-SURVEY §6.3) the Community Survey's curated map: <library folder>/needs.json
 *      ({"<rule id>": [idea id, …], "@lang": {"<language key>": [idea id, …]}}, the curation's need-ideas.json
 *      copied as is) becomes ideas/needs.json ({v:1, hash, needs, lang, d1}: keys sorted, lists as given, d1 the first
 *      sentence of every mapped idea's description, EN and ES; built-ins English only). Every key is a RULES or RULES_MORE
 *      id of index.html beside this folder (or @lang with the twelve language keys); every list 10–24 unique ids (an @lang
 *      list 1–24), each a built library id or a built-in; no library idea for God's people (reach "in": the survey is for
 *      the community); an idea whose name names a language only under that language's @lang key; no Pennsylvania-only
 *      word, township or borough in a mapped idea (they are read in every state). A list with one lift only is a REVIEW
 *      line. Any fault writes nothing (--skip-invalid does not change that). No needs.json: no ideas/needs.json, and
 *      the page tops every need up from the library. The hash covers the map, so a page holding an older one renews it.
 *
 * By default nothing is written unless the validator passes: a half-valid library never
 * ships. --skip-invalid (for a library still being written) leaves out each idea the
 * validator or the app check rejects, and a theme file that is missing, and says so.
 * Generated files are never edited by hand; change the source and run this again.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const SRC = path.resolve(opt('--src', process.env.TERRAIN_IDEAS_SRC || ''));
const OUT = path.resolve(ROOT, opt('--out', 'ideas'));
const SKIP = argv.includes('--skip-invalid');
if (!opt('--src', process.env.TERRAIN_IDEAS_SRC || '')) {
  console.log('usage: node tools/build-ideas.mjs --src <library folder with themes.json, validate.mjs, themes/> [--skip-invalid]');
  process.exit(2);
}
for (const f of ['themes.json', 'validate.mjs', 'themes']) if (!fs.existsSync(path.join(SRC, f))) { console.log(`missing ${path.join(SRC, f)}`); process.exit(2); }

/* ---------------------------------------------------------------- 1. the writers' validator */
const val = spawnSync(process.execPath, [path.join(SRC, 'validate.mjs'), '--all', '--no-review'], {cwd: SRC, encoding: 'utf8', maxBuffer: 64 << 20});
const vOut = (val.stdout || '') + (val.stderr || '');
const bad = new Map();                 // idea id -> reasons (left out with --skip-invalid)
const themeProblems = [];              // quotas, missing files: the theme still ships what is valid
const fatal = [];                      // themes.json itself
const note = (id, why) => { if (!bad.has(id)) bad.set(id, []); bad.get(id).push(why); };
for (const line of vOut.split('\n')) {
  let m;
  if ((m = /^ERROR themes\.json(.*)$/.exec(line))) { fatal.push(line); continue; }
  if ((m = /^MISSING themes\/([a-z-]+)\.json/.exec(line))) { themeProblems.push(line); continue; }
  if ((m = /^ERROR cross-theme near-duplicate \([a-z]+, Jaccard [\d.]+\): ([a-z0-9-]+) ".*" ~ ([a-z0-9-]+) "/.exec(line))) { note(m[2], line.slice(6)); continue; }
  if ((m = /^ERROR duplicate id ([a-z0-9-]+) in [a-z-]+ and ([a-z-]+)/.exec(line))) { note(m[1] + '@' + m[2], line.slice(6)); continue; }
  if ((m = /^ERROR themes\/([a-z-]+)\.json ([a-z0-9-]+) \/ ([a-z0-9-]+): names too close/.exec(line))) { note(m[3], line.slice(6)); continue; }
  if ((m = /^ERROR themes\/([a-z-]+)\.json ([a-z0-9#-]+): (.*)$/.exec(line))) { note(m[2], m[3]); continue; }
  if ((m = /^ERROR themes\/([a-z-]+)\.json (.*)$/.exec(line))) { themeProblems.push(line); continue; }
  if (/^ERROR /.test(line)) fatal.push(line);
}
if (fatal.length) { console.log(fatal.join('\n')); console.log('themes.json is not valid: nothing written.'); process.exit(1); }
if (val.status !== 0 && !SKIP) {
  console.log(vOut.split('\n').filter(l => /^(ERROR|MISSING|FAIL)/.test(l)).join('\n'));
  console.log(`\nThe validator failed (${bad.size} ideas, ${themeProblems.length} theme problems): nothing written.`);
  console.log('Fix the source and run again, or add --skip-invalid to ship only the ideas that pass.');
  process.exit(1);
}

/* ---------------------------------------------------------------- 2. the app's own vocabulary */
const app = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const slice = (a, b) => { const i = app.indexOf(a); if (i < 0) throw Error('not in index.html: ' + a); return app.slice(i, app.indexOf(b, i)); };
const SIG_IDS = new Set([...slice('const SIGNATURE=[', '\n];').matchAll(/\{id:'([a-z0-9-]+)'/g)].map(m => m[1]));
const pBody = slice('function profile(m,c,trend){', '\n}\n');
const TAGS = new Set([...pBody.matchAll(/'([a-z0-9-]+)'\)/g)].map(m => m[1]));
const SKILLS = new Set([...slice('const CAP_SKILLS=[', '\n];').matchAll(/\{k:'([a-z]+)'/g), ...slice('const U_SKILLS=', '\n').matchAll(/k:'([a-z]+)'/g)].map(m => m[1]));
const FACS = new Set([...slice('const FACILITIES=[', '\n];').matchAll(/\{k:'([a-z]+)'/g), ...slice('const U_FAC=', '\n').matchAll(/k:'([a-z]+)'/g)].map(m => m[1]));
if (SIG_IDS.size < 50 || TAGS.size < 30 || SKILLS.size < 10 || FACS.size < 10) { console.log('Could not read the app vocabulary from index.html.'); process.exit(1); }
function appCheck(x) {
  const e = [];
  if (SIG_IDS.has(x.id)) e.push('id is a built-in ministry id');
  if (/^(draft|sg|fresh)-/.test(x.id)) e.push('reserved id prefix');
  for (const t of [...(x.need || []), ...(x.boost || [])]) if (!TAGS.has(t)) e.push('unknown tag ' + t);
  for (const s of x.skill || []) if (!SKILLS.has(s)) e.push('unknown skill ' + s);
  for (const g of x.fac || []) for (const k of String(g).split('|')) if (!FACS.has(k)) e.push('unknown facility ' + k);
  if (!Array.isArray(x.need) || !x.need.length) e.push('no need tag');
  if ('reach' in x && !REACH_OK.has(x.reach)) e.push('reach must be in, out or both');
  return e;
}

/* ---------------------------------------------------------------- 3. read, filter, pack */
const THEMES = JSON.parse(fs.readFileSync(path.join(SRC, 'themes.json'), 'utf8')).themes;
const TIDX = new Map(THEMES.map((t, i) => [t.id, i]));
/* In-reach and outreach (v10.41): reach.json beside themes.json, if the classifier has written it. */
const REACH_OK = new Set(['in', 'out', 'both']);
const reachFile = path.join(SRC, 'reach.json');
let REACH = {};
if (fs.existsSync(reachFile)) {
  let j = null; try { j = JSON.parse(fs.readFileSync(reachFile, 'utf8')); } catch (e) { console.log('reach.json is not valid JSON: nothing written.'); process.exit(1); }
  const o = j && typeof j === 'object' && j.reach && typeof j.reach === 'object' && !Array.isArray(j.reach) ? j.reach : j;
  if (!o || typeof o !== 'object' || Array.isArray(o)) { console.log('reach.json must be {"<idea id>": "in" | "out" | "both"}: nothing written.'); process.exit(1); }
  const wrong = Object.entries(o).filter(([, v]) => !REACH_OK.has(v));
  if (wrong.length && !SKIP) { wrong.slice(0, 20).forEach(([k, v]) => console.log(`REACH ${k}: "${v}" is not in, out or both`)); console.log('reach.json has values that are not in, out or both: nothing written. Add --skip-invalid to leave them out.'); process.exit(1); }
  REACH = Object.fromEntries(Object.entries(o).filter(([, v]) => REACH_OK.has(v)));
}
const themeReach = t => REACH_OK.has(t.reach) ? t.reach : t.inside === true ? 'in' : 'out';
/* v10.43: cadence, next steps and no-card ideas (header, step 5). Each file is optional, as reach.json is; present, it is
   checked in full. */
const CAD_RE = /^(ongoing|event|series(-([3-9]|1\d|2[0-6]))?(-row)?)$/;
const cadInt = v => { if (v === 'ongoing') return 0; if (v === 'event') return 1; const m = /^series(?:-(\d+))?(-row)?$/.exec(v); const n = m && m[1] ? +m[1] : 0; return n ? (m[2] ? 100 + n : n) : 100; };
const readSide = name => { const f = path.join(SRC, name); if (!fs.existsSync(f)) return null;
  let j = null; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.log(name + ' is not valid JSON: nothing written.'); process.exit(1); }
  if (!j || typeof j !== 'object' || Array.isArray(j)) { console.log(name + ' must be an object keyed by idea id: nothing written.'); process.exit(1); }
  return j; };
const CADENCE = readSide('cadence.json'), NEXT = readSide('next.json'), NOCARD = readSide('nocard.json');
/* The colour of a theme's tile follows the app's colour by kind of figure (CLAUDE.md):
   amber money & hardship, blue housing, purple children & families (and age), pink people,
   mint language and the theme itself (prayer, Scripture, worship, media). */
const HUE = {
  hardship: 'hunger jobs-money clothing-practical health disaster-relief addiction prison abuse-survivors stewardship deacons',
  housing: 'homeless transport neighbors creation-care',
  children: 'children youth young-adults seniors families marriage single-parents grief education schools foster-care childrens-ministries pathfinders adventurers ay-youth',
  people: 'mental-health veterans disability women men hospitality music-arts sports-outdoors first-responders holidays workplaces member-care fellowship involvement worship-music religious-liberty',
  language: 'prayer immigrants personal-evangelism public-evangelism media literature small-groups sabbath-rest spiritual-care sabbath-school interests global-mission'
};
const hueOf = id => Object.keys(HUE).find(k => HUE[k].split(' ').includes(id)) || 'language';
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'");
const STOP = new Set(('the and for with from your our their this that these those into onto over under about after before than then when what which who whom whose where while each every other some such only also just more most very much many any all both few own same can will would could should may might must one two three four five six seven eight nine ten first once week weeks month months year years day days time times way ways they them she his her its are was were been being have has had does did doing make makes made get gets got use uses used people person members member church neighbors neighbor ' +
  'los las del para por con una unos unas que como mas pero sus sin sobre entre cada otro otra otros otras este esta estos estas ese esa esos esas cuando donde quien quienes cual cuales todo toda todos todas muy mucho mucha muchos muchas tambien solo son fue ser han hay puede pueden hace hacen tiene tienen dos tres cuatro cinco seis siete ocho nueve diez primera primero semana semanas mes meses ano anos dia dias vez veces miembros iglesia vecinos personas').split(' '));
const words = s => fold(s).split(/[^a-z0-9ñ]+/).filter(w => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w));
const DIGITAL = /\b(facebook|instagram|social media|online|websites?|text messages?|texting|text line|text us|whatsapp|nextdoor|youtube|tiktok|reels?|livestream\w*|live ?stream\w*|qr|ads?|videos?|podcasts?|e-?mails?|google|zoom|canva|messenger)\b/;

const files = fs.readdirSync(path.join(SRC, 'themes')).filter(f => f.endsWith('.json'));
const byTheme = new Map(), seen = new Set(), skipped = [];
for (const t of THEMES) {
  const f = path.join(SRC, 'themes', t.id + '.json');
  if (!files.includes(t.id + '.json')) { byTheme.set(t.id, []); continue; }
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const keep = [];
  for (const x of j.ideas || []) {
    const why = [...(bad.get(x.id) || []), ...(bad.get(x.id + '@' + t.id) || []), ...appCheck(x)];
    if (seen.has(x.id)) why.push('duplicate id');
    if (why.length) { skipped.push([t.id, x.id, why[0]]); continue; }
    seen.add(x.id); keep.push(x);
  }
  byTheme.set(t.id, keep);
}
/* v10.43: the cadence of every idea that ships (its own, else cadence.json's), the next steps and the no-card ideas */
const sideBad = [];
const allSrcIds = new Set();
for (const t of THEMES) { const f = path.join(SRC, 'themes', t.id + '.json'); if (fs.existsSync(f)) for (const x of JSON.parse(fs.readFileSync(f, 'utf8')).ideas || []) if (x && typeof x.id === 'string') allSrcIds.add(x.id); }
const SHIPPED = new Map(); for (const t of THEMES) for (const x of byTheme.get(t.id)) SHIPPED.set(x.id, x);
const CAD = new Map();
if (CADENCE) for (const [id, v] of Object.entries(CADENCE)) {
  if (!allSrcIds.has(id)) sideBad.push(`CADENCE ${id}: not an idea of this library`);
  else if (typeof v !== 'string' || !CAD_RE.test(v)) sideBad.push(`CADENCE ${id}: "${v}" is not ongoing, event, series, series-N or series-N-row (N 3–26)`); }
for (const [id, x] of SHIPPED) {
  if ('cad' in x) { if (typeof x.cad === 'string' && CAD_RE.test(x.cad)) CAD.set(id, cadInt(x.cad)); else sideBad.push(`CADENCE ${id}: its own cad "${x.cad}" is not valid`); continue; }
  const v = CADENCE ? CADENCE[id] : 'ongoing';
  if (typeof v === 'string' && CAD_RE.test(v)) CAD.set(id, cadInt(v)); else if (CADENCE && v === undefined) sideBad.push(`CADENCE ${id}: no cadence (add it to cadence.json or give the idea a cad)`); }
const NX = new Map();
if (NEXT) for (const [id, v] of Object.entries(NEXT)) {
  if (!allSrcIds.has(id)) { sideBad.push(`NEXT ${id}: not an idea of this library`); continue; }
  if (!SHIPPED.has(id)) continue;   // left out (--skip-invalid): its next steps with it
  const c = CAD.get(id);
  if (c === 0) { sideBad.push(`NEXT ${id}: an ongoing idea has no next step (only a series or an event)`); continue; }
  if (!Array.isArray(v) || v.length !== 2 || v[0] === v[1]) { sideBad.push(`NEXT ${id}: needs two different ids`); continue; }
  const why = v.map(t => t === id ? `${t} is the idea itself` : !SHIPPED.has(t) ? `${t} is not an idea that ships` : CAD.get(t) !== 0 ? `${t} is not ongoing` : '').filter(Boolean);
  if (why.length) { sideBad.push(`NEXT ${id}: ${why.join('; ')}`); continue; }
  NX.set(id, v.map(t => { const y = SHIPPED.get(t); return [t, y.en.n, y.es.n]; })); }
const NOC = new Set();
for (const [id, x] of SHIPPED) if (x.nocard === true) NOC.add(id);
if (NOCARD) for (const [id, v] of Object.entries(NOCARD)) {
  if (!allSrcIds.has(id)) { sideBad.push(`NOCARD ${id}: not an idea of this library`); continue; }
  if (typeof v !== 'string' || !v.trim() || v.length > 60) { sideBad.push(`NOCARD ${id}: the reason must be a short line (1–60 characters)`); continue; }
  if (SHIPPED.has(id)) NOC.add(id); }
for (const id of NOC) if (CAD.get(id) === 0) { sideBad.push(`NOCARD ${id}: only a series or an event can be marked "no card"`); NOC.delete(id); }
if (sideBad.length && !SKIP) {
  sideBad.slice(0, 40).forEach(l => console.log(l));
  console.log(`\ncadence.json, next.json or nocard.json has ${sideBad.length} fault${sideBad.length === 1 ? '' : 's'}: nothing written. Fix the source, or add --skip-invalid to leave them out.`);
  process.exit(1);
}
for (const [id] of SHIPPED) if (!CAD.has(id)) CAD.set(id, 0);   // --skip-invalid: a faulty cadence ships as ongoing
const appBad = skipped.filter(([, id]) => !bad.has(id));
if (appBad.length && !SKIP) {
  appBad.forEach(([t, id, w]) => console.log(`APP ${t} ${id}: ${w}`));
  console.log('\nSome ideas do not fit this version of the app: nothing written. Add --skip-invalid to leave them out.');
  process.exit(1);
}

/* index row: the column order is ideas/index.json's "cols"; the page reads it by name */
const COLS = ['id', 't', 'also', 'tier', 'k', 'ages', 'where', 'sab', 'min', 'need', 'boost', 'ppl', 'leaders', 'hrs', 'cost', 'costMo', 'skill', 'fac', 'st', 'partner', 'dig', 'n', 'ne', 'reach', 'cad'];
const reachStats = {in: 0, out: 0, both: 0, theme: 0};
const rows = [], kws = [], counts = {};
for (const t of THEMES) {
  for (const x of byTheme.get(t.id)) {
    const nameWords = new Set([...words(x.en.n), ...words(x.es.n)]);
    const kw = [...new Set([...words(x.en.d), ...words(x.es.d), ...words(x.partner ? x.partner.en + ' ' + x.partner.es : '')])].filter(w => !nameWords.has(w)).join(' ');
    const en = fold([x.en.n, x.en.d, ...x.en.how].join(' \n '));
    rows.push([x.id, TIDX.get(x.theme), (x.also || []).map(a => TIDX.get(a)).filter(v => v != null), x.tier, x.k, x.ages, x.where,
      x.sabbath ? 1 : 0, x.minors ? 1 : 0, x.need, x.boost, x.ppl, x.leaders, x.hrs, x.cost, x.costMo, x.skill, x.fac || 0, x.st || 0,
      x.partner ? 1 : 0, DIGITAL.test(en) ? 1 : 0, x.en.n, x.es.n, (() => {
        // the idea's own reach, else the classifier's, else its theme's default: every row says in, out or both
        const own = REACH_OK.has(x.reach) ? x.reach : REACH_OK.has(REACH[x.id]) ? REACH[x.id] : null;
        const r = own || themeReach(t);
        reachStats[r]++; if (!own) reachStats.theme++; return r; })(), CAD.get(x.id)]);
    kws.push(kw);
    counts[t.id] = (counts[t.id] || 0) + 1;
  }
}
// v10.43: each record carries its cadence (the integer), its two next steps (names embedded, so a saved idea still names them)
// and "nocard": true; an idea's own string "cad" is replaced by the integer
const shipRec = x => { const o = {...x, cad: CAD.get(x.id)}; if (NX.has(x.id)) o.nx = NX.get(x.id); if (NOC.has(x.id)) o.nocard = true; else delete o.nocard; return o; };
const themeFiles = THEMES.filter(t => counts[t.id]).map(t => [t.id, JSON.stringify({theme: t.id, ideas: byTheme.get(t.id).map(shipRec)})]);
// The hash stands for everything the page loads (v10.40 fix): the theme files, and the index and the
// search words too, so a change to themes.json alone (a synonym, a theme's name) also replaces an index
// a browser kept from an earlier deploy.
const idxThemes = THEMES.map(t => ({id: t.id, en: t.en, es: t.es, hue: hueOf(t.id), n: counts[t.id] || 0, syn: t.syn, tags: t.tags,
  ...(t.inside === true ? {inside: true} : {}), ...(REACH_OK.has(t.reach) ? {reach: t.reach} : {})}));
const unknownReach = Object.keys(REACH).filter(id => !seen.has(id));
/* v10.45 (step 6): the curated need → ideas map */
const NEEDS = (() => {
  const f = path.join(SRC, 'needs.json'); if (!fs.existsSync(f)) return null;
  let j = null; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.log('needs.json is not valid JSON: nothing written.'); process.exit(1); }
  if (!j || typeof j !== 'object' || Array.isArray(j)) { console.log('needs.json must be {"<rule id>": [idea ids], "@lang": {…}}: nothing written.'); process.exit(1); }
  const ruleIds = s => [...s.matchAll(/\{id:'([a-z0-9-]+)'/g)].map(m => m[1]);
  const part = (a, b) => app.includes(a) ? slice(a, b) : '';
  const RULE_IDS = new Set([...ruleIds(part('const RULES=[', '\nfunction suggestions(')), ...ruleIds(part('const RULES_MORE=[', '\n];'))]);
  const LANG_KEYS = new Set(['spanish', 'french-creole', 'german', 'slavic', 'indo-european', 'korean', 'chinese', 'vietnamese', 'tagalog', 'asian-pacific', 'arabic', 'other']);
  // the built-ins (SIGNATURE and its small groups), read as the page reads them; their words for d1 and the checks
  const BUILT = new Map();
  for (const [a, b] of [['const SIGNATURE=[', '\n];'], ['const SMALL_GROUPS=[', '\n];']]) {
    const t = part(a, b); if (!t) continue;
    let arr = null; try { const P = new Proxy({}, {get: (o, k) => String(k)}); arr = new Function('KIND', 'EFFORT', 'return ' + t.slice(t.indexOf('[')) + '\n]')(P, P); } catch (e) { arr = null; }
    if (arr) arr.forEach(x => { if (x && typeof x.id === 'string') BUILT.set(x.id, x); });
    else ruleIds(t).forEach(id => BUILT.set(id, {id}));
  }
  const LIBREC = new Map(); for (const [id, x] of SHIPPED) LIBREC.set(id, x);
  const reachOf = new Map(rows.map(r => [r[0], r[COLS.indexOf('reach')]]));
  // a language, people or culture named in an idea's own name (the page's NS_LANG_WORDS, read folded); in its description, a REVIEW line.
  // Each word lists the language keys (@lang) it belongs to.
  const LANGW = [[/\b(spanish|espanol|hispanohablantes?|hispanic|latino|latina|latinos|latinas|dia de reyes)\b/, ['spanish']],
    [/\b(chinese|chino|mandarin|cantonese|cantones)\b/, ['chinese']], [/\b(lunar new year|ano nuevo lunar|tet|seollal|mid-autumn|medio otono)\b/, ['chinese', 'vietnamese', 'korean']],
    [/\b(vietnamese|vietnamita)\b/, ['vietnamese']], [/\b(tagalog|tagalo|filipino|filipina|filipinos|filipinas|parol)\b/, ['tagalog']], [/\b(korean|coreano|coreana)\b/, ['korean']],
    [/\b(hindi|gujarati|guyarati|punjabi|panyabi|urdu|bengali|portuguese|portugues|persian|persa|indian|diwali)\b/, ['indo-european']], [/\b(arabic|arabe)\b/, ['arabic']],
    [/\b(haitian|haitiano|haitiana|creole|criollo|kreyol|french|frances)\b/, ['french-creole']], [/\b(russian|ruso|polish|polaco|ukrainian|ucraniano)\b/, ['slavic']],
    [/\b(german|aleman)\b/, ['german']], [/\b(japanese|japones|tamil|telugu|khmer|jemer|hmong|thai|tailandes|nepali)\b/, ['asian-pacific']],
    [/\b(swahili|suajili|somali|afghan|afgano|congolese|congoleno)\b/, ['other']]];
  const foldT = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const named = t => LANGW.filter(([re]) => re.test(foldT(t))).map(([, k]) => k);
  const nameOf = keys => keys.join('/');
  const PA_CS = /\b(PA|COMPASS)\b/, PA_I = /\b(pennsylvania|pensilvania|careerlink|penn state|pa 211|townships?|boroughs?)\b/i;
  const words = id => { const x = LIBREC.get(id); if (x) return {name: [x.en.n, x.es.n].join(' \n '), all: [x.en.n, x.en.d, ...x.en.how, x.es.n, x.es.d, ...x.es.how, x.partner ? x.partner.en + ' \n ' + x.partner.es : ''].join(' \n ')};
    const b = BUILT.get(id) || {}; return {name: b.n || '', all: [b.n, b.d, b.p].filter(s => typeof s === 'string').join(' \n ')}; };
  // a built-in's lift is its band, as the page reads it: MOVE_LOAD first, then its own load (at most 2), else heavy
  const MOVE_LOAD = new Map([...part('const MOVE_LOAD={', '\n};').matchAll(/'([a-z0-9-]+)':([0-2])/g)].map(m => [m[1], +m[2]]));
  const lift = id => { const x = LIBREC.get(id); if (x) return x.tier; const b = BUILT.get(id); if (!b) return 0;
    const ml = MOVE_LOAD.get(id); return (ml != null ? ml : Number.isInteger(b.load) ? Math.min(2, b.load) : 2) + 1; };
  const E = [], R = [], needs = {}, lang = {}, mapped = new Set();
  const list = (key, ids, own, lo) => {
    if (!Array.isArray(ids)) { E.push(`NEEDS ${key}: must be a list of idea ids`); return null; }
    if (ids.length < lo || ids.length > 24) E.push(`NEEDS ${key}: ${ids.length} ideas (${lo}–24)`);
    if (new Set(ids).size !== ids.length) E.push(`NEEDS ${key}: an id is listed twice`);
    for (const id of ids) {
      if (typeof id !== 'string') { E.push(`NEEDS ${key}: ${JSON.stringify(id)} is not an id`); continue; }
      if (!LIBREC.has(id) && !BUILT.has(id)) { E.push(`NEEDS ${key} ${id}: not a library idea that ships, nor a built-in`); continue; }
      if (LIBREC.has(id) && reachOf.get(id) === 'in') E.push(`NEEDS ${key} ${id}: an idea for God's people (reach "in"); the survey's lists are for the community`);
      const w = words(id), n = named(w.name).filter(k => !k.includes(own));
      if (n.length) E.push(`NEEDS ${key} ${id}: its name names a language or a people (${n.map(nameOf).join(', ')}); it belongs only under that language's @lang list`);
      else if (!own) { const d = named(w.all); if (d.length) R.push(`REVIEW needs ${key} ${id}: its words mention a language or a people (${d.map(nameOf).join(', ')})`); }
      const pa = w.all.match(PA_CS) || w.all.match(PA_I); if (pa) E.push(`NEEDS ${key} ${id}: "${pa[0]}" is read in every state (Pennsylvania-only word, township or borough)`);
      mapped.add(id);
    }
    const lifts = new Set(ids.map(lift).filter(Boolean)); if (!own && ids.length && lifts.size === 1) R.push(`REVIEW needs ${key}: every idea is one lift`);
    return ids.slice();
  };
  for (const k of Object.keys(j)) {
    if (k === '@lang') { const L = j[k]; if (!L || typeof L !== 'object' || Array.isArray(L)) { E.push('NEEDS @lang: must be {"<language key>": [idea ids]}'); continue; }
      for (const lk of Object.keys(L)) { if (!LANG_KEYS.has(lk)) { E.push(`NEEDS @lang ${lk}: not one of ${[...LANG_KEYS].join(', ')}`); continue; } const v = list('@lang.' + lk, L[lk], lk, 1); if (v) lang[lk] = v; }
      continue; }
    if (!RULE_IDS.has(k)) { E.push(`NEEDS ${k}: not a need of index.html (RULES or RULES_MORE)`); continue; }
    const v = list(k, j[k], '', 10); if (v) needs[k] = v;
  }
  if (E.length) { E.slice(0, 40).forEach(l => console.log(l)); console.log(`\nneeds.json has ${E.length} fault${E.length === 1 ? '' : 's'}: nothing written.`); process.exit(1); }
  const first = s => { s = String(s || '').replace(/\s+/g, ' ').trim(); const m = /^.*?[.!?](?=\s|$)/.exec(s); return m ? m[0] : s; };
  const d1 = {};
  for (const id of [...mapped].sort()) { const x = LIBREC.get(id); if (x) d1[id] = [first(x.en.d), first(x.es.d)]; else { const b = BUILT.get(id); if (b && b.d) d1[id] = [first(b.d), '']; } }
  const sortK = o => Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]]));
  const body = {needs: sortK(needs), lang: sortK(lang), d1};
  return {body, core: JSON.stringify(body), review: R, n: Object.keys(needs).length, nl: Object.keys(lang).length, ideas: mapped.size};
})();
const hash = crypto.createHash('sha256').update(themeFiles.map(([, s]) => s).join('\n'))
  .update('\n' + JSON.stringify({cols: COLS, themes: idxThemes, ideas: rows})).update('\n' + kws.join('\n')).update(NEEDS ? '\n' + NEEDS.core : '').digest('hex').slice(0, 12);
const index = {
  v: 1, hash, count: rows.length, cols: COLS,
  themes: idxThemes,
  ideas: rows
};

/* ---------------------------------------------------------------- 4. write */
fs.mkdirSync(OUT, {recursive: true});
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.json')) fs.rmSync(path.join(OUT, f));
for (const [id, s] of themeFiles) fs.writeFileSync(path.join(OUT, id + '.json'), s.replace(/^\{/, `{"hash":"${hash}",`));
const idxText = JSON.stringify(index), wordsText = JSON.stringify({hash, kw: kws});
fs.writeFileSync(path.join(OUT, 'index.json'), idxText);
fs.writeFileSync(path.join(OUT, 'words.json'), wordsText);
const needsText = NEEDS ? JSON.stringify({v: 1, hash, ...NEEDS.body}) : '';
if (NEEDS) fs.writeFileSync(path.join(OUT, 'needs.json'), needsText);

const kb = n => (n / 1024).toFixed(0) + ' KB';
const total = themeFiles.reduce((a, [, s]) => a + s.length, 0);
console.log(`validator: ${val.status === 0 ? 'passed' : 'FAILED (—skip-invalid)'}`);
for (const t of THEMES) console.log(`${t.id.padEnd(22)} ${String(counts[t.id] || 0).padStart(4)} ideas${counts[t.id] ? '' : '   (not shipped)'}`);
if (skipped.length) { console.log(`\nleft out: ${skipped.length} ideas`); skipped.slice(0, 40).forEach(([t, id, w]) => console.log(`  ${t} ${id}: ${String(w).slice(0, 140)}`)); if (skipped.length > 40) console.log('  …'); }
if (themeProblems.length) { console.log('\ntheme problems (the theme ships its valid ideas):'); themeProblems.forEach(l => console.log('  ' + l)); }
console.log(`\nreach: ${reachStats.in} in, ${reachStats.out} out, ${reachStats.both} both (${reachStats.theme} of them their theme's default) (${fs.existsSync(reachFile) ? 'reach.json read' : 'no reach.json'})${unknownReach.length ? `; reach.json names ${unknownReach.length} ideas not shipped (${unknownReach.slice(0, 5).join(', ')}${unknownReach.length > 5 ? '…' : ''})` : ''}`);
{ const k = {ongoing: 0, event: 0, series: 0, row: 0, nocount: 0}; for (const v of CAD.values()) { if (v === 0) k.ongoing++; else if (v === 1) k.event++; else if (v === 100) k.nocount++; else if (v > 100) k.row++; else k.series++; }
  console.log(`\ncadence: ${k.ongoing} ongoing, ${k.event} one-day events, ${k.series + k.row + k.nocount} series (${k.series} weekly, ${k.row} on days in a row, ${k.nocount} without a count) (${CADENCE ? 'cadence.json read' : 'no cadence.json: ideas without their own cad ship as ongoing'}); next steps for ${NX.size} series and events (${NEXT ? 'next.json read' : 'no next.json'}); ${NOC.size} with no card${sideBad.length ? `; ${sideBad.length} faults left out (--skip-invalid)` : ''}`); }
if (NEEDS) { if (NEEDS.review.length) { console.log(''); NEEDS.review.slice(0, 40).forEach(l => console.log(l)); }
  console.log(`\nneeds: ${NEEDS.n} needs and ${NEEDS.nl} languages, ${NEEDS.ideas} ideas mapped (needs.json read; ideas/needs.json ${kb(needsText.length)})`); }
else console.log('\nneeds: no needs.json (the page tops every need up from the library)');
console.log(`\nwrote ${path.relative(ROOT, OUT)}/index.json (${kb(idxText.length)}, ${rows.length} ideas in ${themeFiles.length} themes, hash ${hash}), words.json (${kb(wordsText.length)}) and ${themeFiles.length} theme files (${kb(total)})`);
