// The Idea Library's shipped files (ideas/, made by tools/build-ideas.mjs, never edited by hand) and
// the packager itself. The shipped files: one index whose every row has its full record in its
// theme's file, the same hash everywhere, no built-in id, only the app's own tags, skills and
// facilities, Spanish and English for every idea, four steps, and words.json in index order.
// The packager, on a tiny made-up library with a stand-in validator: it writes nothing when the
// validator fails, leaves out exactly the ideas the validator names with --skip-invalid, and
// refuses an idea that would collide with this app (a built-in id, a tag profile() never emits).
// It also rebuilds from the writers' source and compares every shipped file byte for byte: the folder named by
// TERRAIN_IDEAS_SRC, else the repo's own copy in tools/ideas-src (integration, v10.40.0: the source ships with the
// repo so the library can be edited and rebuilt, and the shipped files can never drift from it).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 400)); console.log('    want:', JSON.stringify(e).slice(0, 200)); fail++; } else pass++; };
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const app = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const slice = (a, b) => { const i = app.indexOf(a); return app.slice(i, app.indexOf(b, i)); };
const SIG = new Set([...slice('const SIGNATURE=[', '\n];').matchAll(/\{id:'([a-z0-9-]+)'/g)].map(m => m[1]));
const TAGS = new Set([...slice('function profile(m,c,trend){', '\n}\n').matchAll(/'([a-z0-9-]+)'\)/g)].map(m => m[1]));
const SKILLS = new Set([...slice('const CAP_SKILLS=[', '\n];').matchAll(/\{k:'([a-z]+)'/g), ...slice('const U_SKILLS=', '\n').matchAll(/k:'([a-z]+)'/g)].map(m => m[1]));
const FACS = new Set([...slice('const FACILITIES=[', '\n];').matchAll(/\{k:'([a-z]+)'/g), ...slice('const U_FAC=', '\n').matchAll(/k:'([a-z]+)'/g)].map(m => m[1]));

console.log('-- the shipped files --');
const D = path.join(ROOT, 'ideas'), I = read(path.join(D, 'index.json')), W = read(path.join(D, 'words.json'));
const col = k => I.cols.indexOf(k);
c('index: version 1, the columns the page reads', [I.v, ['id', 't', 'also', 'tier', 'k', 'ages', 'where', 'sab', 'min', 'need', 'boost', 'ppl', 'leaders', 'hrs', 'cost', 'costMo', 'skill', 'fac', 'st', 'partner', 'dig', 'n', 'ne', 'reach'].every(k => I.cols.includes(k))], [1, true]);
// v10.41: the seven inside-the-church themes and the eight Adventist departments' themes joined the 42 (57)
c('57 themes, each with names in both languages, synonyms and a colour of the app', [I.themes.length, I.themes.every(t => t.en && t.es && t.syn.en.length >= 5 && t.syn.es.length >= 5 && ['hardship', 'housing', 'children', 'people', 'language'].includes(t.hue))], [57, true]);
// v10.41 integration: every idea ships its reach (its own, else reach.json's, else its theme's default), never 0
c('every idea has a reach: in, out or both', I.ideas.every(r => ['in', 'out', 'both'].includes(r[col('reach')])), true);
c('the count is the rows, and each theme\'s count its rows', [I.count === I.ideas.length, I.themes.every((t, i) => t.n === I.ideas.filter(r => r[col('t')] === i).length)], [true, true]);
const shipped = I.themes.filter(t => t.n > 0);
c('every shipped theme has at least 50 ideas (the pastor: "50 different things for prayer")', shipped.filter(t => t.n < 50).map(t => t.id + ':' + t.n), []);
c('about 2,100 ideas or more', I.count >= 2100, true);
const ids = I.ideas.map(r => r[0]);
c('ids unique, lowercase, prefixed by their theme', [new Set(ids).size === ids.length, I.ideas.every(r => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(r[0]) && r[0].startsWith(I.themes[r[col('t')]].id + '-'))], [true, true]);
c('never a built-in (SIGNATURE) id, never draft-/sg-/fresh-', ids.filter(id => SIG.has(id) || /^(draft|sg|fresh)-/.test(id)), []);
c('tags only from profile(), skills and facilities only from the capacity check', I.ideas.filter(r => [...r[col('need')], ...r[col('boost')]].some(t => !TAGS.has(t)) || r[col('skill')].some(s => !SKILLS.has(s)) || (r[col('fac')] || []).some(g => g.split('|').some(k => !FACS.has(k)))).map(r => r[0]), []);
c('every idea rests on at least one census tag', I.ideas.every(r => r[col('need')].length >= 1), true);
c('sizes 1–3, the four kinds, a place, ages, Sabbath and children flags', I.ideas.every(r => [1, 2, 3].includes(r[col('tier')]) && ['serve', 'equip', 'belong', 'invite'].includes(r[col('k')])
  && ['church', 'streets', 'homes', 'online', 'schools', 'parks', 'community', 'workplaces'].includes(r[col('where')]) && [0, 1].includes(r[col('sab')]) && [0, 1].includes(r[col('min')])), true);
c('children or teens ⇒ the children flag and the kids skill', I.ideas.filter(r => (['children', 'youth'].includes(r[col('ages')]) && r[col('min')] !== 1) || (r[col('min')] === 1 && !r[col('skill')].includes('kids'))).map(r => r[0]), []);
let missing = [], bad = [], hashes = new Set();
for (const t of shipped) {
  const f = path.join(D, t.id + '.json'); if (!fs.existsSync(f)) { missing.push(t.id); continue; }
  const j = read(f); hashes.add(j.hash);
  const byId = new Map(j.ideas.map(x => [x.id, x]));
  I.ideas.filter(r => I.themes[r[col('t')]].id === t.id).forEach(r => { const x = byId.get(r[0]);
    if (!x || x.en.n !== r[col('n')] || x.es.n !== r[col('ne')] || x.tier !== r[col('tier')] || x.ppl !== r[col('ppl')] || x.cost !== r[col('cost')]
      || !x.en.d || !x.es.d || x.en.how.length !== 4 || x.es.how.length !== 4 || x.en.n === x.es.n) bad.push(r[0]); });
  if (j.ideas.length !== t.n) bad.push(t.id + ' count');
}
c('every shipped theme has its file', missing, []);
c('every index row has its full record (EN + ES, four steps each) and the same numbers', bad.slice(0, 5), []);
c('one hash for the index, the theme files and words.json', [...hashes, W.hash].every(h => h === I.hash) && /^[0-9a-f]{12}$/.test(I.hash), true);
c('words.json: one entry per idea, in index order', [W.kw.length === I.count, W.kw.every(s => typeof s === 'string' && !/[A-Z]/.test(s))], [true, true]);
c('no stray files in ideas/', fs.readdirSync(D).filter(f => !(f === 'index.json' || f === 'words.json' || shipped.some(t => t.id + '.json' === f))), []);
const kb = f => fs.statSync(path.join(D, f)).size / 1024;
c('the index stays small enough to load on a search (< 900 KB raw; served compressed)', kb('index.json') < 900, true);

console.log('\n-- the packager on a made-up library --');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'terrain-ideas-'));
try {
  const src = path.join(tmp, 'src'), out = 'tests/.tmp-ideas-' + process.pid;
  fs.mkdirSync(path.join(src, 'themes'), {recursive: true});
  const themes = {version: 1, themes: [
    {id: 'prayer', en: 'Prayer', es: 'Oración', scope: 'x', not: [], syn: {en: ['prayer', 'pray', 'praying', 'prayers', 'intercession'], es: ['oración', 'orar', 'oraciones', 'intercesión', 'rezar']}, tags: ['settled']},
    {id: 'hunger', en: 'Feeding the hungry', es: 'Hambre', scope: 'x', not: [], syn: {en: ['hunger', 'food', 'feed', 'feeding', 'meals'], es: ['hambre', 'comida', 'alimentos', 'comidas', 'alimentar']}, tags: ['poor']}]};
  fs.writeFileSync(path.join(src, 'themes.json'), JSON.stringify(themes));
  const idea = (id, theme, o = {}) => ({id, theme, tier: 1, k: 'serve', ages: 'all', where: 'streets', sabbath: true, minors: false, need: ['settled'], boost: [], ppl: 2, leaders: 0, hrs: 2, cost: 0, costMo: 0, skill: [], partner: null,
    en: {n: 'Idea ' + id, d: 'One sentence here. Another sentence here that is long enough for the limits of the library.', how: ['Step one is written here', 'Step two is written here', 'Step three is written here', 'Step four is written here']},
    es: {n: 'Idea es ' + id, d: 'Una frase aquí. Otra frase aquí que es suficientemente larga para los límites de la biblioteca.', how: ['Paso uno escrito aquí', 'Paso dos escrito aquí', 'Paso tres escrito aquí', 'Paso cuatro escrito aquí']}, ...o});
  fs.writeFileSync(path.join(src, 'themes', 'prayer.json'), JSON.stringify({theme: 'prayer', ideas: [idea('prayer-a', 'prayer', {also: ['hunger']}), idea('prayer-b', 'prayer'), idea('prayer-c', 'prayer')]}));
  fs.writeFileSync(path.join(src, 'themes', 'hunger.json'), JSON.stringify({theme: 'hunger', ideas: [idea('hunger-a', 'hunger', {need: ['poor', 'settled']}), idea('hunger-b', 'hunger')]}));
  // a stand-in validator that reports what the real one would, in its own words
  const fake = lines => fs.writeFileSync(path.join(src, 'validate.mjs'), `console.log(${JSON.stringify(lines.join('\n'))}); process.exit(${lines.some(l => /^ERROR|^MISSING/.test(l)) ? 1 : 0});`);
  const run = (...a) => spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build-ideas.mjs'), '--src', src, '--out', out, ...a], {cwd: ROOT, encoding: 'utf8'});
  const OUT = path.join(ROOT, out);
  fake(['ERROR themes/prayer.json prayer-b: es.d must be 100-420 characters (is 444)', 'FAIL themes/prayer.json 3 ideas, 1 error',
    'ERROR cross-theme near-duplicate (en, Jaccard 0.67): prayer-c "Idea prayer-c" ~ hunger-b "Idea hunger-b"']);
  let r = run();
  c('the validator fails: exit 1 and nothing written', [r.status, fs.existsSync(OUT), /nothing written/.test(r.stdout)], [1, false, true]);
  r = run('--skip-invalid');
  const i2 = read(path.join(OUT, 'index.json'));
  c('--skip-invalid: exactly the named ideas left out (the later of a near-duplicate pair)', [r.status, i2.ideas.map(x => x[0]).sort()], [0, ['hunger-a', 'prayer-a', 'prayer-c']]);
  c('…and it says which and why', [/prayer-b: es\.d must be/.test(r.stdout), /hunger-b: cross-theme near-duplicate/.test(r.stdout)], [true, true]);
  c('the cross-listing becomes theme indexes; counts per theme', [i2.ideas.find(x => x[0] === 'prayer-a')[i2.cols.indexOf('also')], i2.themes.map(t => t.n)], [[1], [2, 1]]);
  c('theme files hold the full records, with the index\'s hash', [read(path.join(OUT, 'prayer.json')).ideas.map(x => x.id), read(path.join(OUT, 'hunger.json')).hash === i2.hash], [['prayer-a', 'prayer-c'], true]);
  fake(['OK themes.json 2 themes', 'OK themes/prayer.json 3 ideas', 'OK themes/hunger.json 2 ideas']);
  fs.writeFileSync(path.join(src, 'themes', 'hunger.json'), JSON.stringify({theme: 'hunger', ideas: [idea('food-pantry', 'hunger'), idea('hunger-b', 'hunger', {need: ['not-a-tag']})]}));
  r = run();
  c('an id that is a built-in, or a tag profile() never emits: refused even when the validator passes', [r.status, /APP hunger food-pantry: id is a built-in/.test(r.stdout), /APP hunger hunger-b: unknown tag not-a-tag/.test(r.stdout)], [1, true, true]);
  r = run('--skip-invalid');
  c('…and left out with --skip-invalid; stale theme files removed', [r.status, read(path.join(OUT, 'index.json')).ideas.map(x => x[0]), fs.existsSync(path.join(OUT, 'hunger.json'))], [0, ['prayer-a', 'prayer-b', 'prayer-c'], false]);
  // v10.41: in-reach and outreach. The pastor: "we can separate ministry ideas by in-reach or outreach for each
  // one, so they can see: what can I do for God's people, but also what can I do for the community?"
  fs.writeFileSync(path.join(src, 'themes', 'hunger.json'), JSON.stringify({theme: 'hunger', ideas: [idea('hunger-a', 'hunger', {need: ['poor', 'settled']}), idea('hunger-b', 'hunger', {reach: 'both'})]}));
  themes.themes[1].inside = true; themes.themes[0].reach = 'out';
  fs.writeFileSync(path.join(src, 'themes.json'), JSON.stringify(themes));
  fs.writeFileSync(path.join(src, 'reach.json'), JSON.stringify({'prayer-a': 'in', 'hunger-b': 'out', 'gone-idea': 'in'}));
  r = run();
  const i3 = read(path.join(OUT, 'index.json')), rc = i3.cols.indexOf('reach'), reachOf = id => i3.ideas.find(x => x[0] === id)[rc];
  // v10.41 integration: an idea with no reach of its own or in reach.json ships its theme's default, so every row says one
  c('reach ships in the index: the idea\'s own first, then reach.json\'s, else the theme\'s (its reach; inside → in)', [r.status, reachOf('prayer-a'), reachOf('prayer-b'), reachOf('hunger-a'), reachOf('hunger-b')], [0, 'in', 'out', 'in', 'both']);
  c('…the themes carry "inside" and their own reach for that default', i3.themes.map(t => [t.id, t.inside || false, t.reach || null]), [['prayer', false, 'out'], ['hunger', true, null]]);
  c('…and it says what it did, and names reach.json ids that did not ship', [/reach: 2 in, 2 out, 1 both \(3 of them their theme's default\) \(reach\.json read\)/.test(r.stdout), /names 1 ideas not shipped \(gone-idea\)/.test(r.stdout)], [true, true]);
  fs.writeFileSync(path.join(src, 'reach.json'), JSON.stringify({'prayer-a': 'inside'}));
  fs.rmSync(OUT, {recursive: true, force: true}); r = run();
  c('a reach that is not in, out or both: nothing written', [r.status, fs.existsSync(OUT), /REACH prayer-a: "inside" is not in, out or both/.test(r.stdout)], [1, false, true]);
  r = run('--skip-invalid');
  c('…or left out with --skip-invalid (the theme\'s default then)', [r.status, read(path.join(OUT, 'index.json')).ideas.find(x => x[0] === 'prayer-a')[rc]], [0, 'out']);
  fs.writeFileSync(path.join(src, 'reach.json'), '{}');
  fs.writeFileSync(path.join(src, 'themes', 'hunger.json'), JSON.stringify({theme: 'hunger', ideas: [idea('hunger-a', 'hunger', {reach: 'sideways'})]}));
  r = run();
  c('an idea\'s own reach must be in, out or both too', [r.status, /APP hunger hunger-a: reach must be in, out or both/.test(r.stdout)], [1, true]);
  r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build-ideas.mjs')], {cwd: ROOT, encoding: 'utf8', env: {...process.env, TERRAIN_IDEAS_SRC: ''}});
  c('no source given: usage, exit 2', [r.status, /usage/.test(r.stdout)], [2, true]);
  fs.rmSync(OUT, {recursive: true, force: true});
} finally { fs.rmSync(tmp, {recursive: true, force: true}); }

const IDEAS_SRC = process.env.TERRAIN_IDEAS_SRC || (fs.existsSync(path.join(ROOT, 'tools', 'ideas-src', 'themes.json')) ? path.join(ROOT, 'tools', 'ideas-src') : '');
if (IDEAS_SRC) {
  console.log('\n-- rebuilt from the writers\' source (' + (process.env.TERRAIN_IDEAS_SRC ? 'TERRAIN_IDEAS_SRC' : 'tools/ideas-src') + ') --');
  const out = 'tests/.tmp-rebuild-' + process.pid;
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build-ideas.mjs'), '--src', IDEAS_SRC, '--out', out], {cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20});
  const h = r.status === 0 ? read(path.join(ROOT, out, 'index.json')).hash : null;
  const list = d => fs.existsSync(d) ? fs.readdirSync(d).filter(x => x.endsWith('.json')).sort() : [];
  const fresh = list(path.join(ROOT, out)), shipped = list(path.join(ROOT, 'ideas'));
  const differ = fresh.filter(x => !fs.existsSync(path.join(ROOT, 'ideas', x)) || !fs.readFileSync(path.join(ROOT, out, x)).equals(fs.readFileSync(path.join(ROOT, 'ideas', x))));
  fs.rmSync(path.join(ROOT, out), {recursive: true, force: true});
  c('the source validates and rebuilds to exactly the shipped files (same hash)', [r.status, h], [0, I.hash]);
  c('…the same files, byte for byte (themes.json\'s names and synonyms included)', [fresh.length > 40, fresh.join() === shipped.join(), differ], [true, true, []]);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
