// v10.45.0 — the curated need → ideas map (DESIGN-SURVEY §6): tools/ideas-src/needs.json (the curation's need-ideas.json, copied as
// is) built into ideas/needs.json by tools/build-ideas.mjs ("build-ideas 2"), its checks (§6.3), and how the page loads it and falls
// back (§6.5, §6.6). The packager runs on a tiny made-up library with a stand-in validator, as idea-library-build does.
// Written failing-first against v10.44.1 (build-ideas 1 never reads needs.json; the page has no nsLoad).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const H = require('./v45-helpers.js');
const T = H.checker(), c = T.c;
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const app = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ruleIds = s => [...s.matchAll(/\{id:'([a-z0-9-]+)'/g)].map(m => m[1]);
const part = (a, b) => { const i = app.indexOf(a); return i < 0 ? '' : app.slice(i, app.indexOf(b, i)); };
const RULE_IDS = ruleIds(part('const RULES=[', '\nfunction suggestions(')), MORE_IDS = ruleIds(part('const RULES_MORE=[', '\n];'));

await T.sec(async () => {
  console.log('\n-- the shipped map --');
  const N = path.join(ROOT, 'ideas', 'needs.json'), I = read(path.join(ROOT, 'ideas', 'index.json'));
  c('ideas/needs.json ships, version 1, with the index\'s hash', [fs.existsSync(N), fs.existsSync(N) && read(N).v, fs.existsSync(N) && read(N).hash === I.hash], [true, 1, true]);
  if (fs.existsSync(N)) {
    const M = read(N), lists = Object.entries(M.needs);
    c('every need has its list: the 38 of RULES and the 9 of RULES_MORE', [Object.keys(M.needs).sort(), MORE_IDS.length], [[...RULE_IDS, ...MORE_IDS].sort(), 9]);
    c('each list 10–24 ideas, none twice', lists.filter(([, v]) => v.length < 10 || v.length > 24 || new Set(v).size !== v.length).map(([k]) => k), []);
    c('the language lists use the twelve language keys', Object.keys(M.lang).filter(k => !['spanish', 'french-creole', 'german', 'slavic', 'indo-european', 'korean', 'chinese', 'vietnamese', 'tagalog', 'asian-pacific', 'arabic', 'other'].includes(k)), []);
    const cols = I.cols, byId = new Map(I.ideas.map(r => [r[0], r])), ids = [...new Set([...Object.values(M.needs).flat(), ...Object.values(M.lang).flat()])];
    const SIG = new Set([...ruleIds(part('const SIGNATURE=[', '\n];')), ...ruleIds(part('const SMALL_GROUPS=[', '\n];'))]);
    c('every id is a library idea that ships or a built-in', ids.filter(id => !byId.has(id) && !SIG.has(id)), []);
    c('no library idea for God\'s people (reach "in") in any list', ids.filter(id => byId.has(id) && byId.get(id)[cols.indexOf('reach')] === 'in'), []);
    c('the first sentence of every mapped library idea, EN and ES (d1)', ids.filter(id => byId.has(id) && !(Array.isArray(M.d1[id]) && M.d1[id][0] && M.d1[id][1])), []);
    c('keys sorted (needs, lang, d1) so the build reproduces it byte for byte', [Object.keys(M.needs).join() === Object.keys(M.needs).sort().join(), Object.keys(M.d1).join() === Object.keys(M.d1).sort().join()], [true, true]);
    const S = fs.existsSync(path.join(ROOT, 'tools', 'ideas-src', 'needs.json')) ? read(path.join(ROOT, 'tools', 'ideas-src', 'needs.json')) : null;
    c('its source is tools/ideas-src/needs.json (the curation\'s need-ideas.json), every list shipped as given', !!S && Object.keys(M.needs).every(k => JSON.stringify(S[k]) === JSON.stringify(M.needs[k]))
      && Object.keys(M.lang).every(k => JSON.stringify((S['@lang'] || {})[k]) === JSON.stringify(M.lang[k])), true);
  }

  console.log('\n-- the packager: needs.json in, ideas/needs.json out, or nothing --');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'terrain-needs-'));
  const out = 'tests/.tmp-needs-' + process.pid, OUT = path.join(ROOT, out);
  try {
    const src = path.join(tmp, 'src');
    fs.mkdirSync(path.join(src, 'themes'), {recursive: true});
    fs.writeFileSync(path.join(src, 'themes.json'), JSON.stringify({version: 1, themes: [
      {id: 'prayer', en: 'Prayer', es: 'Oración', scope: 'x', not: [], syn: {en: ['prayer', 'pray', 'praying', 'prayers', 'intercession'], es: ['oración', 'orar', 'oraciones', 'intercesión', 'rezar']}, tags: ['settled']},
      {id: 'hunger', en: 'Feeding the hungry', es: 'Hambre', scope: 'x', not: [], syn: {en: ['hunger', 'food', 'feed', 'feeding', 'meals'], es: ['hambre', 'comida', 'alimentos', 'comidas', 'alimentar']}, tags: ['poor']}]}));
    const idea = (id, theme, o = {}) => ({id, theme, tier: 1, k: 'serve', ages: 'all', where: 'streets', sabbath: true, minors: false, need: ['settled'], boost: [], ppl: 2, leaders: 0, hrs: 2, cost: 0, costMo: 0, skill: [], partner: null,
      en: {n: 'Idea ' + id, d: 'One sentence here. Another sentence here that is long enough for the limits of the library.', how: ['Step one is written here', 'Step two is written here', 'Step three is written here', 'Step four is written here']},
      es: {n: 'Idea es ' + id, d: 'Una frase aquí. Otra frase aquí que es suficientemente larga para los límites de la biblioteca.', how: ['Paso uno escrito aquí', 'Paso dos escrito aquí', 'Paso tres escrito aquí', 'Paso cuatro escrito aquí']}, ...o});
    const write = ideas => { fs.writeFileSync(path.join(src, 'themes', 'prayer.json'), JSON.stringify({theme: 'prayer', ideas: ideas.filter(x => x.theme === 'prayer')}));
      fs.writeFileSync(path.join(src, 'themes', 'hunger.json'), JSON.stringify({theme: 'hunger', ideas: ideas.filter(x => x.theme === 'hunger')})); };
    const LIBR = [idea('prayer-a', 'prayer'), idea('prayer-b', 'prayer', {tier: 2, ppl: 4}), idea('prayer-c', 'prayer', {reach: 'in'}), idea('hunger-a', 'hunger', {need: ['poor', 'settled']}),
      idea('hunger-b', 'hunger', {en: {n: 'Rent help in Spanish at the library', d: 'One sentence here. Another sentence here that is long enough for the limits of the library.', how: ['Step one is written here', 'Step two is written here', 'Step three is written here', 'Step four is written here']}}),
      idea('hunger-c', 'hunger', {partner: {en: 'the township office', es: 'la oficina municipal'}})];
    write(LIBR);
    fs.writeFileSync(path.join(src, 'validate.mjs'), `console.log("OK"); process.exit(0);`);
    const BI = ['welcome-table', 'interpreter-bank', 'food-pantry', 'pantry-box', 'job-club', 'meal-train', 'lift-rota', 'garden'];   // built-ins
    const needs = o => fs.writeFileSync(path.join(src, 'needs.json'), JSON.stringify(o));
    const run = () => spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build-ideas.mjs'), '--src', src, '--out', out], {cwd: ROOT, encoding: 'utf8'});
    let r = run();
    const h0 = r.status === 0 ? read(path.join(OUT, 'index.json')).hash : null;
    c('no needs.json in the source: no ideas/needs.json (the page then fills every need from the library)', [r.status, fs.existsSync(path.join(OUT, 'needs.json')), /no needs\.json/.test(r.stdout)], [0, false, true]);
    needs({rent50: ['hunger-a', 'prayer-a', 'prayer-b', ...BI], '@lang': {spanish: ['hunger-b']}});
    r = run();
    const M = r.status === 0 ? read(path.join(OUT, 'needs.json')) : {};
    c('needs.json: written, version 1, the index\'s hash (which now covers the map)', [r.status, M.v, M.hash === (r.status === 0 && read(path.join(OUT, 'index.json')).hash), M.hash !== h0], [0, 1, true, true]);
    c('…lists as given, the language lists under "lang"', [M.needs && M.needs.rent50, M.lang], [['hunger-a', 'prayer-a', 'prayer-b', ...BI], {spanish: ['hunger-b']}]);
    c('…d1: the first sentence EN and ES of a library idea; a built-in\'s English only', [M.d1 && M.d1['prayer-a'], M.d1 && M.d1['welcome-table'] && M.d1['welcome-table'][1], M.d1 && /^A simple table/.test(M.d1['welcome-table'][0])], [['One sentence here.', 'Una frase aquí.'], '', true]);
    c('…every theme file carries the same hash', read(path.join(OUT, 'prayer.json')).hash === M.hash, true);
    r = run(); c('built again: byte for byte the same', fs.readFileSync(path.join(OUT, 'needs.json'), 'utf8') === JSON.stringify(M), true);
    const refuse = (label, o, re) => { fs.rmSync(OUT, {recursive: true, force: true}); needs(o); const q = run();
      c(label, [q.status, fs.existsSync(OUT), re.test(q.stdout)], [1, false, true]); if (!re.test(q.stdout)) console.log(q.stdout.slice(-600)); };
    refuse('a key that is not a need of index.html: refused, nothing written', {'not-a-need': ['hunger-a', 'prayer-a', 'prayer-b', ...BI]}, /NEEDS not-a-need: not a need of index\.html/);
    refuse('fewer than 10 ideas: refused', {rent50: ['hunger-a', ...BI]}, /NEEDS rent50: 9 ideas \(10–24\)/);
    refuse('an id twice: refused', {rent50: ['hunger-a', 'hunger-a', 'prayer-a', ...BI]}, /an id is listed twice/);
    refuse('an id that is neither a library idea nor a built-in: refused', {rent50: ['hunger-z', 'prayer-a', 'prayer-b', ...BI]}, /NEEDS rent50 hunger-z: not a library idea/);
    refuse('an idea for God\'s people (reach "in"): refused (the survey is for the community)', {rent50: ['prayer-c', 'prayer-a', 'prayer-b', ...BI]}, /prayer-c: an idea for God's people/);
    refuse('an idea whose name names a language, outside that language\'s list: refused', {rent50: ['hunger-b', 'prayer-a', 'prayer-b', ...BI]}, /hunger-b: its name names a language/);
    refuse('Pennsylvania words, township or borough in a mapped idea: refused (read in every state)', {rent50: ['hunger-c', 'prayer-a', 'prayer-b', ...BI]}, /hunger-c: "township" is read in every state/);
    refuse('a language key that is not one of the twelve: refused', {rent50: ['hunger-a', 'prayer-a', 'prayer-b', ...BI], '@lang': {klingon: ['prayer-a']}}, /NEEDS @lang klingon: not one of/);
    fs.rmSync(OUT, {recursive: true, force: true});
    needs({rent50: ['hunger-a', 'prayer-a', 'welcome-table', 'noticeboard', 'bench', 'seed-swap', 'trash-cans', 'lit-doors', 'kids-books', 'blessing-bags']});
    r = run();
    c('a list with one lift only: written, with a REVIEW line', [r.status, /REVIEW needs rent50: every idea is one lift/.test(r.stdout)], [0, true]);
    fs.rmSync(path.join(src, 'needs.json')); r = run();
    c('needs.json taken away: the stale ideas/needs.json goes too, and the hash is the one without a map', [r.status, fs.existsSync(path.join(OUT, 'needs.json')), read(path.join(OUT, 'index.json')).hash === h0], [0, false, true]);
  } finally { fs.rmSync(tmp, {recursive: true, force: true}); fs.rmSync(OUT, {recursive: true, force: true}); }

  console.log('\n-- the page: loads it once, skips what is missing, falls back --');
  const MAP = {v: 1, hash: H.IDX.hash, needs: {rent50: ['homeless-rent-help-page', 'not-an-idea-anywhere', 'jobs-money-read-before-you-sign-table']}, lang: {}, d1: {}};
  let P = H.page({needs: MAP}); await H.ready(P); H.survey(P); await H.sleep(30);
  c('nothing of the library is fetched until a need opens or the page settles (1.5 s)', P.w.__fetched.filter(u => /^\/ideas\//.test(u)), []);
  await H.openNeed(P, 'rent50', true);
  c('opening a need loads the index and the map, once', [P.w.__fetched.filter(u => /^\/ideas\/index\.json/.test(u)).length, P.w.__fetched.filter(u => /^\/ideas\/needs\.json/.test(u)).length], [1, 1]);
  const ids = P.qa('#ns-i-rent50 .ns-row').map(r => r.dataset.idea);
  c('an id that resolves nowhere is skipped (never an empty row) and said in the log', [ids.includes('not-an-idea-anywhere'), P.J('LOG').some(l => /needs: missing not-an-idea-anywhere/.test(l))], [false, true]);
  c('…the two that resolve keep their place, and the need is topped up to ten from the library', [ids.length, ids.includes('homeless-rent-help-page'), ids.includes('jobs-money-read-before-you-sign-table')], [10, true, true]);
  await H.openNeed(P, 'snap', true);
  c('a need the map does not name: ten from the library, by its tags and themes', [P.qa('#ns-i-snap .ns-row').length, P.J(`nsTagsFor('snap')`).length > 0], [10, true]);
  P = H.page({needs: null}); await H.ready(P); H.survey(P); await H.openNeed(P, 'rent50', true);
  c('needs.json missing (404): every need from the library, no error line', [P.qa('#ns-i-rent50 .ns-row').length, !!P.q('#ns-i-rent50 .ns-fail')], [10, false]);
  P = H.page({needs: MAP, session: {'terrain-lib-idx': {...H.IDX, hash: 'aaaaaaaaaaaa'}}}); await H.ready(P); H.survey(P);
  await H.openNeed(P, 'rent50', true);
  await H.until(() => P.J('LIB.renewed') === true && P.qa('#ns-i-rent50 .ns-row').length >= 10);
  c('an index kept from an earlier deploy (sessionStorage): the map\'s hash differs, the index is renewed once, the ideas still come',
    [P.J('LIB.renewed'), P.J('LIB.idx.hash') === H.IDX.hash, P.w.__fetched.filter(u => /^\/ideas\/index\.json/.test(u)).length, P.qa('#ns-i-rent50 .ns-row').length >= 10], [true, true, 1, true]);
  P = H.page({needs: MAP, idx404: true}); await H.ready(P); H.survey(P); await H.openNeed(P, 'rent50', true);
  c('the index too fails (offline): the detail stays, "The ideas could not load…" and Try again, no partial list',
    [!!P.q('#ns-b-rent50 .ns-detail'), P.txt('#ns-i-rent50 .ns-fail'), P.qa('#ns-i-rent50 .ns-row').length], [true, 'The ideas could not load. Check the connection and try again. Try again', 0]);
  c('…the count says … rather than a number', P.txt('[data-ns-show="snap"] small'), '…');
  P.E(`window.fetch=(f=>async u=>{ if(/index\\.json/.test(String(u))) return {ok:true,status:200,json:async()=>(${JSON.stringify(H.IDX)})}; return f(u); })(window.fetch)`);
  P.q('#ns-i-rent50 [data-ns-retry]').click();
  await H.until(() => P.qa('#ns-i-rent50 .ns-row').length >= 10);
  c('…Try again, with the connection back: the list', P.qa('#ns-i-rent50 .ns-row').length >= 10, true);
});
T.done();
