/* v10.49.0 — EVERY golden key re-written on purpose (535 of 535): money is stated, not checked against what the church has (the
 * pastor, 5 Oct 2026: "the proposal … mention how much money they will need not versus available funds"): capMerged() and caseCapFrom()
 * read no money, caseCheckWith() makes no money gaps, the cost answers have a version with no budget beside it (aEn3/aEs3), and Luke
 * 14:28 is homed on the ask first. Proof: Terrain-work/v64/golden/golden-money.js check, on a copy of the page with exactly those five
 * changes put back (index-money-back.html), reproduces all 535 hashes of v10.48.0's golden file; v45-survey makes the same proof for
 * its 32 keys (MONEY_BACK). The list of re-written keys: Terrain-work/v64/golden/keys.txt.
 *
 * v10.45.0 — the golden keys re-written on purpose (248 of 535; every other key is v10.44.1's, byte for byte):
 * the Pennsylvania words (DESIGN-SURVEY §3.6) of garden, skills-center, lot-market, noticeboard, bench; and (the review round, 5 Oct 2026)
 * the built-ins the needs show, priced at their source (U_LINES_OWN), with their Spanish and the review's words (build-work/src/builtins-review.json):
 * welcome-table, interpreter-bank, newcomer-circle, food-pantry, clothing-closet, community-dinner, pathfinders, moms-group, bp-clinic, lit-multilingual, lot-market, lot-sport, study-hall, garden, esl-center, skills-center, senior-day, pantry-box, wifi-porch, noticeboard, lift-rota, homework-club, repair-cafe, job-club, conversation-cafe, meal-train, bereavement-visits, supper-study, late-room, bench, funeral-teas, winter-check, noticeboard-jobs, lending-shelf, welcome-newcomers, sg-apartments, sg-language, sg-work.
 * The keys:
 *   welcome-table|board|options|en
 *   welcome-table|finance|options|en
 *   welcome-table|community|options|en
 *   welcome-table|congregation|options|en
 *   welcome-table|board|fixed|en
 *   welcome-table|congregation|fixed|en
 *   interpreter-bank|board|options|en
 *   interpreter-bank|finance|options|en
 *   interpreter-bank|community|options|en
 *   interpreter-bank|congregation|options|en
 *   interpreter-bank|board|fixed|en
 *   interpreter-bank|congregation|fixed|en
 *   newcomer-circle|board|options|en
 *   newcomer-circle|finance|options|en
 *   newcomer-circle|community|options|en
 *   newcomer-circle|congregation|options|en
 *   newcomer-circle|board|fixed|en
 *   newcomer-circle|congregation|fixed|en
 *   food-pantry|board|options|en
 *   food-pantry|finance|options|en
 *   food-pantry|community|options|en
 *   food-pantry|congregation|options|en
 *   food-pantry|board|fixed|en
 *   food-pantry|congregation|fixed|en
 *   clothing-closet|board|options|en
 *   clothing-closet|finance|options|en
 *   clothing-closet|community|options|en
 *   clothing-closet|congregation|options|en
 *   clothing-closet|board|fixed|en
 *   clothing-closet|congregation|fixed|en
 *   community-dinner|board|options|en
 *   community-dinner|finance|options|en
 *   community-dinner|community|options|en
 *   community-dinner|congregation|options|en
 *   community-dinner|board|fixed|en
 *   community-dinner|congregation|fixed|en
 *   pathfinders|board|options|en
 *   pathfinders|finance|options|en
 *   pathfinders|community|options|en
 *   pathfinders|congregation|options|en
 *   pathfinders|board|fixed|en
 *   pathfinders|congregation|fixed|en
 *   moms-group|board|options|en
 *   moms-group|finance|options|en
 *   moms-group|community|options|en
 *   moms-group|congregation|options|en
 *   moms-group|board|fixed|en
 *   moms-group|congregation|fixed|en
 *   bp-clinic|board|options|en
 *   bp-clinic|finance|options|en
 *   bp-clinic|community|options|en
 *   bp-clinic|congregation|options|en
 *   bp-clinic|board|fixed|en
 *   bp-clinic|congregation|fixed|en
 *   lit-multilingual|board|options|en
 *   lit-multilingual|finance|options|en
 *   lit-multilingual|community|options|en
 *   lit-multilingual|congregation|options|en
 *   lit-multilingual|board|fixed|en
 *   lit-multilingual|congregation|fixed|en
 *   lot-market|board|options|en
 *   lot-market|finance|options|en
 *   lot-market|community|options|en
 *   lot-market|congregation|options|en
 *   lot-market|board|fixed|en
 *   lot-market|congregation|fixed|en
 *   lot-sport|board|options|en
 *   lot-sport|finance|options|en
 *   lot-sport|community|options|en
 *   lot-sport|congregation|options|en
 *   lot-sport|board|fixed|en
 *   lot-sport|congregation|fixed|en
 *   study-hall|board|options|en
 *   study-hall|finance|options|en
 *   study-hall|community|options|en
 *   study-hall|congregation|options|en
 *   study-hall|board|fixed|en
 *   study-hall|congregation|fixed|en
 *   garden|board|options|en
 *   garden|finance|options|en
 *   garden|community|options|en
 *   garden|congregation|options|en
 *   garden|board|fixed|en
 *   garden|congregation|fixed|en
 *   esl-center|board|options|en
 *   esl-center|finance|options|en
 *   esl-center|community|options|en
 *   esl-center|congregation|options|en
 *   esl-center|board|fixed|en
 *   esl-center|congregation|fixed|en
 *   skills-center|board|options|en
 *   skills-center|finance|options|en
 *   skills-center|community|options|en
 *   skills-center|congregation|options|en
 *   skills-center|board|fixed|en
 *   skills-center|congregation|fixed|en
 *   senior-day|board|options|en
 *   senior-day|finance|options|en
 *   senior-day|community|options|en
 *   senior-day|congregation|options|en
 *   senior-day|board|fixed|en
 *   senior-day|congregation|fixed|en
 *   pantry-box|board|options|en
 *   pantry-box|finance|options|en
 *   pantry-box|community|options|en
 *   pantry-box|congregation|options|en
 *   pantry-box|board|fixed|en
 *   pantry-box|congregation|fixed|en
 *   wifi-porch|board|options|en
 *   wifi-porch|finance|options|en
 *   wifi-porch|community|options|en
 *   wifi-porch|congregation|options|en
 *   wifi-porch|board|fixed|en
 *   wifi-porch|congregation|fixed|en
 *   noticeboard|board|options|en
 *   noticeboard|finance|options|en
 *   noticeboard|community|options|en
 *   noticeboard|congregation|options|en
 *   noticeboard|board|fixed|en
 *   noticeboard|congregation|fixed|en
 *   lift-rota|board|options|en
 *   lift-rota|finance|options|en
 *   lift-rota|community|options|en
 *   lift-rota|congregation|options|en
 *   lift-rota|board|fixed|en
 *   lift-rota|congregation|fixed|en
 *   homework-club|board|options|en
 *   homework-club|finance|options|en
 *   homework-club|community|options|en
 *   homework-club|congregation|options|en
 *   homework-club|board|fixed|en
 *   homework-club|congregation|fixed|en
 *   repair-cafe|board|options|en
 *   repair-cafe|finance|options|en
 *   repair-cafe|community|options|en
 *   repair-cafe|congregation|options|en
 *   repair-cafe|board|fixed|en
 *   repair-cafe|congregation|fixed|en
 *   job-club|board|options|en
 *   job-club|finance|options|en
 *   job-club|community|options|en
 *   job-club|congregation|options|en
 *   job-club|board|fixed|en
 *   job-club|congregation|fixed|en
 *   conversation-cafe|board|options|en
 *   conversation-cafe|finance|options|en
 *   conversation-cafe|community|options|en
 *   conversation-cafe|congregation|options|en
 *   conversation-cafe|board|fixed|en
 *   conversation-cafe|congregation|fixed|en
 *   meal-train|board|options|en
 *   meal-train|finance|options|en
 *   meal-train|community|options|en
 *   meal-train|congregation|options|en
 *   meal-train|board|fixed|en
 *   meal-train|congregation|fixed|en
 *   bereavement-visits|board|options|en
 *   bereavement-visits|finance|options|en
 *   bereavement-visits|community|options|en
 *   bereavement-visits|congregation|options|en
 *   bereavement-visits|board|fixed|en
 *   bereavement-visits|congregation|fixed|en
 *   supper-study|board|options|en
 *   supper-study|finance|options|en
 *   supper-study|community|options|en
 *   supper-study|congregation|options|en
 *   supper-study|board|fixed|en
 *   supper-study|congregation|fixed|en
 *   late-room|board|options|en
 *   late-room|finance|options|en
 *   late-room|community|options|en
 *   late-room|congregation|options|en
 *   late-room|board|fixed|en
 *   late-room|congregation|fixed|en
 *   bench|board|options|en
 *   bench|finance|options|en
 *   bench|community|options|en
 *   bench|congregation|options|en
 *   bench|board|fixed|en
 *   bench|congregation|fixed|en
 *   funeral-teas|board|options|en
 *   funeral-teas|finance|options|en
 *   funeral-teas|community|options|en
 *   funeral-teas|congregation|options|en
 *   funeral-teas|board|fixed|en
 *   funeral-teas|congregation|fixed|en
 *   winter-check|board|options|en
 *   winter-check|finance|options|en
 *   winter-check|community|options|en
 *   winter-check|congregation|options|en
 *   winter-check|board|fixed|en
 *   winter-check|congregation|fixed|en
 *   noticeboard-jobs|board|options|en
 *   noticeboard-jobs|finance|options|en
 *   noticeboard-jobs|community|options|en
 *   noticeboard-jobs|congregation|options|en
 *   noticeboard-jobs|board|fixed|en
 *   noticeboard-jobs|congregation|fixed|en
 *   lending-shelf|board|options|en
 *   lending-shelf|finance|options|en
 *   lending-shelf|community|options|en
 *   lending-shelf|congregation|options|en
 *   lending-shelf|board|fixed|en
 *   lending-shelf|congregation|fixed|en
 *   welcome-newcomers|board|options|en
 *   welcome-newcomers|finance|options|en
 *   welcome-newcomers|community|options|en
 *   welcome-newcomers|congregation|options|en
 *   welcome-newcomers|board|fixed|en
 *   welcome-newcomers|congregation|fixed|en
 *   sg-apartments|board|options|en
 *   sg-apartments|finance|options|en
 *   sg-apartments|community|options|en
 *   sg-apartments|congregation|options|en
 *   sg-apartments|board|fixed|en
 *   sg-apartments|congregation|fixed|en
 *   sg-language|board|options|en
 *   sg-language|finance|options|en
 *   sg-language|community|options|en
 *   sg-language|congregation|options|en
 *   sg-language|board|fixed|en
 *   sg-language|congregation|fixed|en
 *   sg-work|board|options|en
 *   sg-work|finance|options|en
 *   sg-work|community|options|en
 *   sg-work|congregation|options|en
 *   sg-work|board|fixed|en
 *   sg-work|congregation|fixed|en
 *   welcome-table|board|options|es
 *   welcome-table|community|options|es
 *   clothing-closet|board|options|es
 *   clothing-closet|community|options|es
 *   bp-clinic|board|options|es
 *   bp-clinic|community|options|es
 *   lit-multilingual|board|options|es
 *   lit-multilingual|community|options|es
 *   study-hall|board|options|es
 *   study-hall|community|options|es
 *   esl-center|board|options|es
 *   esl-center|community|options|es
 *   job-club|board|options|es
 *   job-club|community|options|es
 *   bereavement-visits|board|options|es
 *   bereavement-visits|community|options|es
 *   funeral-teas|board|options|es
 *   funeral-teas|community|options|es
 *   noticeboard-jobs|board|options|es
 *   noticeboard-jobs|community|options|es
 */
/* v10.43.0 — T-T1: an ongoing ministry's deck, handout and Proposal are byte-for-byte what v10.42.1 made.
 * The pastor (30 Sep 2026): "separate the things that are weekly or monthly — ongoing ministry — and events, which are one-time,
 * one day". SPEC §1: "ongoing keeps today's options"; SPEC §2: "Ongoing ministries don't get it" (the follow-up plan). So nothing an
 * ongoing idea's slides, handout or Proposal say may change. tests/v43-ongoing-golden.json holds a hash of each output, made from the
 * v10.42.1 base BEFORE any v10.43 edit (DESIGN.md §2):
 *     node tests/v43-ongoing-golden.test.js --write <path to the v10.42.1 copy>
 * The set: every ongoing built-in (67) × the board, the finance committee, a ministry team (Community Services) and the whole church
 * with "Suggest options", the board and the whole church with "I already know the dates"; a quarter of them in Spanish; and every
 * 60th ongoing library idea × the board, Community Services and the congregation. The clock is frozen (1 Oct 2026), the church is
 * the average church after its gifts results (tests/average-church/seed-after.json). The full sweep (all 34 groups × both timings)
 * is the builder's Chrome-free check in NOTES.md, not this suite (it takes ten minutes).
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ARGV = process.argv.slice(2), W = ARGV.indexOf('--write');
const ROOT = W >= 0 ? path.resolve(ARGV[W + 1]) : path.resolve(__dirname, '..');
const HERE = path.resolve(__dirname, '..');
const { JSDOM, VirtualConsole } = require(path.join(HERE, 'node_modules', 'jsdom'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const FX = require(path.join(HERE, 'tests', 'fixtures.json'));
const SEED = JSON.parse(fs.readFileSync(path.join(HERE, 'tests', 'average-church', 'seed-after.json'), 'utf8'));
const GOLD = path.join(HERE, 'tests', 'v43-ongoing-golden.json');
const NOW = '2026-10-01T15:00:00';
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 900)); console.log('    want:', JSON.stringify(e).slice(0, 400)); fail++; } else pass++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function page(lang) {
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://pastorshub.org/', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      const RD = w.Date, FIX = +new RD(NOW); class FD extends RD { constructor(...a) { super(...(a.length ? a : [FIX])); } static now() { return FIX; } } w.Date = FD;
      w.scrollTo = () => { }; w.scrollBy = () => { }; w.Element.prototype.scrollIntoView = function () { };
      for (const [k, v] of Object.entries(SEED)) if (!k.startsWith('_')) w.localStorage.setItem(k, JSON.stringify(v));
      if (lang) w.localStorage.setItem('terrain-lang', lang);
      w.fetch = async (u) => { u = String(u); const m = /^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if (m) { const f = path.join(ROOT, 'ideas', m[1] + '.json'); if (!fs.existsSync(f)) return { ok: false, status: 404, json: async () => null }; const t = fs.readFileSync(f, 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(t) }; }
        if (/advise/.test(u)) return { ok: true, status: 200, json: async () => ({ enabled: false }) };
        return new Promise(() => { }); }; } });
  const w = dom.window; w.eval(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; CAP=null; })()`);
  return w;
}
const ONGOING_BUILTINS = ['welcome-table', 'interpreter-bank', 'newcomer-circle', 'food-pantry', 'clothing-closet', 'community-dinner', 'pathfinders', 'moms-group',
  'bp-clinic', 'walking-club', 'bible-by-post', 'glow-racks', 'lit-multilingual', 'lot-market', 'lot-sport', 'sanctuary-music', 'study-hall', 'warming', 'free-venue',
  'garden', 'esl-center', 'skills-center', 'disaster', 'senior-day', 'music-academy', 'prayer-box', 'pantry-box', 'wifi-porch', 'noticeboard', 'lift-rota',
  'homework-club', 'repair-cafe', 'job-club'];   // (the rest are read from the golden file's own keys: every key is checked)
async function build(w, id, group, timing) {
  return w.eval(`(async()=>{ const G=CASE_GROUPS.find(z=>z.id===${JSON.stringify(group)}); const id=${JSON.stringify(id)};
    if(!SIGNATURE.some(x=>x.id===id)&&!uCatalog().some(x=>x.id===id)){ await libLoadIndex(); const r=LIB.byId.get(id); await libLoadTheme(r.theme); libSave(libFull(id)); }
    const m=caseModel(id,{type:G.type,group:G.id},{timing:${JSON.stringify(timing)}}); const d=caseDeck(m);
    return JSON.stringify({d,H:caseHandout(m,d,{}),Pz:caseProposal(m,d,{})}); })()`);
}
const sha = s => crypto.createHash('sha1').update(s).digest('hex');
(async () => {
  if (W >= 0) {
    // write mode: the key set from the v10.43 data (the built-ins' and the library's ongoing ideas), the hashes from ROOT
    const bcad = JSON.parse(fs.readFileSync(ARGV[ARGV.indexOf('--builtins') + 1], 'utf8'));
    const lcad = JSON.parse(fs.readFileSync(ARGV.includes('--lib') ? ARGV[ARGV.indexOf('--lib') + 1] : path.join(HERE, 'tools', 'ideas-src', 'cadence.json'), 'utf8'));
    const bi = Object.keys(bcad).filter(k => bcad[k] === 'ongoing'), lib = Object.keys(lcad).filter(k => lcad[k] === 'ongoing').filter((k, i) => i % 60 === 0);
    const keys = [];
    for (const id of bi) { for (const g of ['board', 'finance', 'community', 'congregation']) keys.push([id, g, 'options', 'en']); for (const g of ['board', 'congregation']) keys.push([id, g, 'fixed', 'en']); }
    bi.filter((k, i) => i % 4 === 0).forEach(id => ['board', 'community'].forEach(g => keys.push([id, g, 'options', 'es'])));
    for (const id of lib) for (const g of ['board', 'community', 'congregation']) keys.push([id, g, 'options', 'en']);
    const out = { about: 'v10.43 T-T1: hashes of {deck, handout, Proposal} made by the v10.42.1 base, clock ' + NOW + ', seed-after. Written by --write; never by hand.', now: NOW, hash: {} };
    const pages = { en: page('en'), es: page('es') }; await sleep(400);
    for (const [id, g, t, l] of keys) out.hash[[id, g, t, l].join('|')] = sha(await build(pages[l], id, g, t));
    fs.writeFileSync(GOLD, JSON.stringify(out, null, 0).replace(/","/g, '",\n"') + '\n');
    console.log('wrote', Object.keys(out.hash).length, 'hashes'); process.exit(0);
  }
  const G = JSON.parse(fs.readFileSync(GOLD, 'utf8'));
  const pages = { en: page('en'), es: page('es') }; await sleep(400);
  const keys = Object.keys(G.hash);
  c('the golden set is the size it was written with (67 built-ins × 6 EN, 17 × 2 ES, 33 library × 3)', keys.length, 67 * 6 + 17 * 2 + 33 * 3);
  // the set is ongoing by the v10.43 reader (fails on v10.42.1: no caseCadenceOf there)
  const ids = [...new Set(keys.map(k => k.split('|')[0]))];
  await pages.en.eval(`libLoadIndex()`); await sleep(50);
  const notOngoing = pages.en.eval(`(()=>{ if(typeof caseCadenceOf!=='function') return ['no caseCadenceOf']; const ids=${JSON.stringify(ids)};
    return ids.filter(id=>{ let x=SIGNATURE.find(z=>z.id===id); if(!x){ const r=LIB.byId.get(id); x=r?libLite(r):null; } return !x||caseCadenceOf(x).c!=='ongoing'; }); })()`);
  c('every idea in the golden set reads ongoing (caseCadenceOf)', notOngoing, []);
  c('the 33 ongoing built-ins named here are among them', ONGOING_BUILTINS.filter(id => !ids.includes(id)), []);
  // v10.43.0 (integration): the handout and the Proposal carry the app's own version ("version":"v10.43.0"), which moved with the six
  // stamps; it is said back as the base's before hashing, so every word an ongoing idea's slides, handout and Proposal say still counts.
  const VER = pages.en.eval('VERSION'), BASE_VER = 'v10.42.1';
  const asBase = s => s.split(`"version":"${VER}"`).join(`"version":"${BASE_VER}"`);
  c('the version is the only thing said back (one field, in the handout and the Proposal)', [VER !== BASE_VER, (asBase(await build(pages.en, 'food-pantry', 'board', 'options')).match(/v10\.4\d\.\d/g) || []).length], [true, 2]);
  const diff = [];
  for (const k of keys) { const [id, g, t, l] = k.split('|'); const s = asBase(await build(pages[l], id, g, t)); if (sha(s) !== G.hash[k]) diff.push(k); }
  c(`every ongoing deck, handout and Proposal is byte-identical to v10.42.1 (${keys.length} outputs)`, diff.slice(0, 20), []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
