#!/usr/bin/env node
/* Terrain · the Idea Library packager.                                      build-ideas 1
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
  return e;
}

/* ---------------------------------------------------------------- 3. read, filter, pack */
const THEMES = JSON.parse(fs.readFileSync(path.join(SRC, 'themes.json'), 'utf8')).themes;
const TIDX = new Map(THEMES.map((t, i) => [t.id, i]));
/* The colour of a theme's tile follows the app's colour by kind of figure (CLAUDE.md):
   amber money & hardship, blue housing, purple children & families (and age), pink people,
   mint language and the theme itself (prayer, Scripture, worship, media). */
const HUE = {
  hardship: 'hunger jobs-money clothing-practical health disaster-relief addiction prison abuse-survivors',
  housing: 'homeless transport neighbors creation-care',
  children: 'children youth young-adults seniors families marriage single-parents grief education schools foster-care',
  people: 'mental-health veterans disability women men hospitality music-arts sports-outdoors first-responders holidays workplaces',
  language: 'prayer immigrants personal-evangelism public-evangelism media literature small-groups sabbath-rest'
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
const appBad = skipped.filter(([, id]) => !bad.has(id));
if (appBad.length && !SKIP) {
  appBad.forEach(([t, id, w]) => console.log(`APP ${t} ${id}: ${w}`));
  console.log('\nSome ideas do not fit this version of the app: nothing written. Add --skip-invalid to leave them out.');
  process.exit(1);
}

/* index row: the column order is ideas/index.json's "cols"; the page reads it by name */
const COLS = ['id', 't', 'also', 'tier', 'k', 'ages', 'where', 'sab', 'min', 'need', 'boost', 'ppl', 'leaders', 'hrs', 'cost', 'costMo', 'skill', 'fac', 'st', 'partner', 'dig', 'n', 'ne'];
const rows = [], kws = [], counts = {};
for (const t of THEMES) {
  for (const x of byTheme.get(t.id)) {
    const nameWords = new Set([...words(x.en.n), ...words(x.es.n)]);
    const kw = [...new Set([...words(x.en.d), ...words(x.es.d), ...words(x.partner ? x.partner.en + ' ' + x.partner.es : '')])].filter(w => !nameWords.has(w)).join(' ');
    const en = fold([x.en.n, x.en.d, ...x.en.how].join(' \n '));
    rows.push([x.id, TIDX.get(x.theme), (x.also || []).map(a => TIDX.get(a)).filter(v => v != null), x.tier, x.k, x.ages, x.where,
      x.sabbath ? 1 : 0, x.minors ? 1 : 0, x.need, x.boost, x.ppl, x.leaders, x.hrs, x.cost, x.costMo, x.skill, x.fac || 0, x.st || 0,
      x.partner ? 1 : 0, DIGITAL.test(en) ? 1 : 0, x.en.n, x.es.n]);
    kws.push(kw);
    counts[t.id] = (counts[t.id] || 0) + 1;
  }
}
const themeFiles = THEMES.filter(t => counts[t.id]).map(t => [t.id, JSON.stringify({theme: t.id, ideas: byTheme.get(t.id)})]);
// The hash stands for everything the page loads (v10.40 fix): the theme files, and the index and the
// search words too, so a change to themes.json alone (a synonym, a theme's name) also replaces an index
// a browser kept from an earlier deploy.
const idxThemes = THEMES.map(t => ({id: t.id, en: t.en, es: t.es, hue: hueOf(t.id), n: counts[t.id] || 0, syn: t.syn, tags: t.tags}));
const hash = crypto.createHash('sha256').update(themeFiles.map(([, s]) => s).join('\n'))
  .update('\n' + JSON.stringify({cols: COLS, themes: idxThemes, ideas: rows})).update('\n' + kws.join('\n')).digest('hex').slice(0, 12);
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

const kb = n => (n / 1024).toFixed(0) + ' KB';
const total = themeFiles.reduce((a, [, s]) => a + s.length, 0);
console.log(`validator: ${val.status === 0 ? 'passed' : 'FAILED (—skip-invalid)'}`);
for (const t of THEMES) console.log(`${t.id.padEnd(22)} ${String(counts[t.id] || 0).padStart(4)} ideas${counts[t.id] ? '' : '   (not shipped)'}`);
if (skipped.length) { console.log(`\nleft out: ${skipped.length} ideas`); skipped.slice(0, 40).forEach(([t, id, w]) => console.log(`  ${t} ${id}: ${String(w).slice(0, 140)}`)); if (skipped.length > 40) console.log('  …'); }
if (themeProblems.length) { console.log('\ntheme problems (the theme ships its valid ideas):'); themeProblems.forEach(l => console.log('  ' + l)); }
console.log(`\nwrote ${path.relative(ROOT, OUT)}/index.json (${kb(idxText.length)}, ${rows.length} ideas in ${themeFiles.length} themes, hash ${hash}), words.json (${kb(wordsText.length)}) and ${themeFiles.length} theme files (${kb(total)})`);
