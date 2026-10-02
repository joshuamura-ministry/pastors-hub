/* v10.43 — shared by the v43-*.test.js suites (not a suite itself: run-all.js runs *.test.js only).
 * page(seed, lang, o): the app in jsdom on the made-up average church (tests/average-church/seed-<seed>.json), the fixture tract,
 * the Idea Library served from ideas/, the clock frozen at o.now (default 1 Oct 2026, 3 pm) so dates and months are stable.
 * build(P, id, group, o): the model, its deck, the handout and the Proposal (objects, and every line each PDF draws).
 */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const jspdf = require('jspdf');
const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const FX = require('./fixtures.json');
const SEED = v => JSON.parse(fs.readFileSync(path.join(__dirname, 'average-church', `seed-${v}.json`), 'utf8'));
const T = { pass: 0, fail: 0 };
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 900)); console.log('    want:', JSON.stringify(e).slice(0, 500)); T.fail++; } else T.pass++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(f, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (f()) return true; } catch (e) { } await sleep(25); } return false; }
function page(seed, lang, o) {
  o = o || {};
  const errs = []; const vc = new VirtualConsole(); vc.on('jsdomError', e => errs.push(e.message));
  const S = seed ? SEED(seed) : {};
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://pastorshub.org/' + (o.search || ''), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      if (o.now !== false) { const RD = w.Date, FIX = +new RD(o.now || '2026-10-01T15:00:00'); class FD extends RD { constructor(...a) { super(...(a.length ? a : [FIX])); } static now() { return FIX; } } w.Date = FD; }
      w.scrollTo = () => { }; w.scrollBy = () => { }; w.Element.prototype.scrollIntoView = function () { }; w.jspdf = jspdf;
      for (const [k, v] of Object.entries(S)) if (!k.startsWith('_')) w.localStorage.setItem(k, JSON.stringify(v));
      if (lang) w.localStorage.setItem('terrain-lang', lang);
      w.fetch = async (u) => { u = String(u); const m = /^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if (m) { const f = path.join(ROOT, 'ideas', m[1] + '.json'); if (!fs.existsSync(f)) return { ok: false, status: 404, json: async () => null }; const t = fs.readFileSync(f, 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(t) }; }
        if (/advise/.test(u)) return { ok: true, status: 200, json: async () => ({ enabled: false }) };
        return new Promise(() => { }); }; } });
  const w = dom.window;
  const P = { w, errs, E: s => w.eval(s), J: s => JSON.parse(w.eval(`JSON.stringify(${s})`)),
    q: s => w.document.querySelector(s), qa: s => [...w.document.querySelectorAll(s)], txt: s => { const e = w.document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; } };
  P.E(`(()=>{ DATA=${JSON.stringify(o.data || FX.DATA)}; SCOPE='tract'; CAP=null; })()`);
  return P;
}
async function ready(P) { await until(() => P.E('typeof caseModel==="function"')); await P.E('libLoadIndex()'); await sleep(20); return P; }
/* The model, deck, handout and Proposal for one idea and group ({pdf:true}: the PDFs too, and every line each one draws). */
async function build(P, id, group, o = {}) {
  P.w.__r = undefined;
  P.E(`(async()=>{ try{ const G=CASE_GROUPS.find(g=>g.id===${JSON.stringify(group)}); let mid=${JSON.stringify(id)};
    if(mid==='@plan') mid=CASE_PLAN_ID;
    else if(!SIGNATURE.some(x=>x.id===mid)&&!uCatalog().some(x=>x.id===mid)){ await libLoadIndex(); const r=LIB.byId.get(mid); await libLoadTheme(r.theme); libSave(libFull(mid)); }
    ${o.pre || ''}
    const m=caseModel(mid,{type:G.type,group:G.id},{timing:${JSON.stringify(o.timing || 'options')}${o.sample ? ',ctx:caseSampleCtx(),sample:true' : ''}}); const d=caseDeck(m);
    const H=caseHandout(m,d,{}), Pz=caseProposal(m,d,{});
    let hl=null, pl=null, hp=0, pp=0;
    if(${!!o.pdf}){ const hd=casePdfDoc(H,{jsPDF:window.jspdf.jsPDF}), pd=caseProposalDoc(Pz,{jsPDF:window.jspdf.jsPDF}); const lines=doc=>(doc.__caseLog||[]).map(l=>l.t); hl=lines(hd); pl=lines(pd); hp=hd.getNumberOfPages(); pp=pd.getNumberOfPages(); }
    window.__r=JSON.stringify({m:{ok:m.ok,timing:m.timing,motion:m.motion,ask:{text:m.ask&&m.ask.text},followup:m.followup||null,dates:m.dates,timeline:m.timeline,vals:{weeks:m.vals&&m.vals.weeks,ceiling:m.vals&&m.vals.ceiling},
      capacity:{req:m.capacity&&m.capacity.req},reach:m.reach,inreach:m.inreach},d,H,Pz,hl,pl,hp,pp});
  }catch(e){ window.__r=JSON.stringify({err:String(e&&e.stack||e)}); } })()`);
  await until(() => P.w.__r, 30000);
  const R = JSON.parse(P.w.__r || '{"err":"timeout"}'); if (R.err) console.log('    ERROR', id, group, R.err.slice(0, 600));
  return R;
}
const slide = (R, part) => R.d && R.d.slides.find(s => s.part === part);
const done = () => { console.log(`\n${T.pass} passed, ${T.fail} failed`); process.exit(T.fail ? 1 : 0); };
/* The built-ins' kinds (the data design's cadence-builtins.json, 30 Sep 2026) and the session counts each built-in's own words give
   (FOLLOWUP.md §1.2): not listed = ongoing. */
const BUILTIN_EVENTS = ['rights-clinic', 'backpack-giveaway', 'fall-festival', 'car-care', 'christmas-store', 'health-expo', 'kids-health', 'questions-night', 'lit-doors', 'kids-books',
  'blood-drive', 'blessing-bags', 'toy-swap', 'neighbor-table', 'come-and-see', 'thank-you-run', 'school-supplies', 'exam-packs'];
const BUILTIN_SERIES = { vbs: 105, 'sports-camp': 105, 'proph-news': 104, 'proph-language': 104, 'four-nights': 104, 'stop-smoking': 8, chip: 8, 'cooking-school': 6, 'mental-health': 4, grief: 8,
  archaeology: 3, 'family-life-series': 4, 'drive-in': 4, 'money-course': 6, 'health-to-why': 4, 'grief-to-hope': 6, 'parents-study': 6, 'open-baptism-class': 8 };
const NOCARD_BUILTIN = ['thank-you-run', 'blessing-bags', 'school-supplies', 'exam-packs', 'kids-books', 'lit-doors'];
module.exports = { ROOT, html, FX, SEED, T, c, sleep, until, page, ready, build, slide, done, BUILTIN_EVENTS, BUILTIN_SERIES, NOCARD_BUILTIN };
