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
