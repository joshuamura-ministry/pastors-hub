/* v10.42 — THE AVERAGE CHURCH (Make the Case, part 3, section D). Drop-in suite for tests/, with tests/average-church/
 * (seed-before.json, seed-partial.json, seed-after.json, gifts-after-key.json, rules.json from design/fixture).
 *
 * The pastor (29 Sep 2026): "Test it out: fill it in for an average church, and also the Spiritual Gifts — I don't have
 * anyone who has done the Spiritual Gifts… And check the prayer presentation… What does that have to do with why we want to
 * do a prayer ministry — a prayer calendar? It's detached from what's going on."
 *
 * The fixture is exactly what the app keeps in localStorage for a made-up average church: Sampleton SDA (SAMPLE), 80 members
 * on the books, 55 on a Sabbath (46 adults), a fellowship hall (60) and two classrooms free Tue–Thu evenings and Sabbath
 * afternoon, 12 volunteers with 2–4 free hours a week (160 a month), 3 who can lead, $1,500 to start and $150 a month, the
 * path ministry team › finance committee › church board; an Evangelism Planner series (a Friday about five months out) and
 * the conference ask; Spiritual Gifts: none (before), 18 adults (partial), 40 adults (after: one answered 3–4 to everything,
 * 12 reviewed as willing, 3 of them leaders). The survey is tests/fixtures.json.
 *
 * Part 1 holds the fixture valid in the app (v10.41.1 passes it all). Part 2 is the v10.42 acceptance on the decks of the
 * samples (rules.json: relevance by purpose, the arc, gifts first): with REQUIRE_V42 unset a failing Part 2 check prints
 * PENDING and is not counted; the v10.42 release sets REQUIRE_V42=1 in run-all (then every one counts). The headless samples
 * (design/fixture/samples.mjs) hold the same rules on the real slides and PDFs.
 */
const REQUIRE_V42 = process.env.REQUIRE_V42 === '1';
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const FXD = process.env.AVG_FIXTURE || path.join(__dirname, 'average-church');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const FX = require('./fixtures.json');
const SEED = v => JSON.parse(fs.readFileSync(path.join(FXD, `seed-${v}.json`), 'utf8'));
const KEY = JSON.parse(fs.readFileSync(path.join(FXD, 'gifts-after-key.json'), 'utf8')).members;
const RULES = JSON.parse(fs.readFileSync(path.join(FXD, 'rules.json'), 'utf8'));
const rx = (s, f = 'i') => new RegExp(s, f);
const FAM = Object.fromEntries(Object.entries(RULES.families).map(([k, v]) => [k, rx(v)]));
let pass = 0, fail = 0, pending = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 700)); console.log('    want:', JSON.stringify(e).slice(0, 300)); } ok ? pass++ : fail++; };
const v42 = (n, ok, note) => { if (ok) { console.log('  PASS  [v42] ' + n); pass++; } else if (REQUIRE_V42) { console.log('  FAIL  [v42] ' + n + (note ? '  — ' + note : '')); fail++; } else { console.log('  PENDING  [v42] ' + n + (note ? '  — ' + note : '')); pending++; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(f, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (f()) return true; } catch (e) { } await sleep(25); } return false; }
function page(variant, lang) {
  const errs = []; const vc = new VirtualConsole(); vc.on('jsdomError', e => errs.push(e.message));
  const seed = SEED(variant);
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://pastorshub.org/', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { w.scrollTo = () => { }; w.scrollBy = () => { }; w.Element.prototype.scrollIntoView = function () { };
      for (const [k, v] of Object.entries(seed)) if (!k.startsWith('_')) w.localStorage.setItem(k, JSON.stringify(v));
      if (lang) w.localStorage.setItem('terrain-lang', lang);
      w.fetch = async (u) => { u = String(u);
        const m = /^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if (m) { const f = path.join(ROOT, 'ideas', m[1] + '.json'); if (!fs.existsSync(f)) return { ok: false, status: 404, json: async () => null };
          const t = fs.readFileSync(f, 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(t) }; }
        if (/advise/.test(u)) return { ok: true, status: 200, json: async () => ({ enabled: false }) };
        return new Promise(() => { }); }; } });
  const w = dom.window;
  const P = { w, E: s => w.eval(s), J: s => JSON.parse(w.eval(`JSON.stringify(${s})`)), errs };
  P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; CAP=null; })()`);
  return P;
}
// the samples (design §3): idea, group, purpose (section C's, rules.json)
const SAMPLES = [
  ['prayer-town-prayer-calendar', 'prayer', 'devotion'], ['prayer-every-street-map', 'prayer', 'place'], ['member-care-two-sabbath-card', 'hospitality', 'family'],
  ['food-pantry', 'community', 'food'], ['pathfinders', 'pathfinders', 'youth'], ['@plan', 'conference', 'field'], ['food-pantry', 'finance', 'food'], ['food-pantry', 'board', 'food']];
const NAMES = KEY.map(k => k.name);
(async () => {
  /* ---------------- Part 1: the fixture, read by the app ---------------- */
  for (const variant of ['before', 'partial', 'after']) {
    const P = page(variant);
    const R = P.J(`(()=>{ const c=capMerged(), ch=uChurch(), ppl=uPeople(), all=gfEveryone();
      const labels={}; all.forEach(p=>p.gifts.forEach(g=>{ labels[g.label]=(labels[g.label]||0)+1; }));
      return {name:ch.name, id:ch.id, demo:!!ch.capacity.demo, attendance:c.members, membership:ch.capacity.membership, adults:ch.capacity.adults, hands:c.hands, leaders:c.concurrent, hours:c.hours, startup:c.startup, monthly:c.monthly,
        rooms:Object.keys(c.facilities).sort().map(k=>k+':'+c.facilities[k].capacity+':'+c.facilities[k].slots.join('/')), slots:c.slots, approval:ch.caseApproval,
        roster:uRead(GF_ROSTER,[]).length, decoded:uRead(GF_ROSTER,[]).filter(r=>gfDecode(r.code)).length, belong:gfRoster().length,
        people:ppl.length, minors:ppl.filter(p=>p.minor===true).length, flagged:all.filter(p=>p.flags&&p.flags.allHigh).length,
        reviewed:ppl.filter(p=>p.confirmed&&p.willing).length, leadersReviewed:ppl.filter(p=>p.confirmed&&p.willing&&p.leader).length,
        noDemonstrated:all.filter(p=>!(p.flags&&p.flags.allHigh)&&!p.gifts.some(g=>g.label==='demonstrated')).map(p=>p.name), labels};
    })()`);
    const n = { before: 0, partial: 18, after: 40 }[variant];
    c(`${variant}: the church is the made-up sample (name, id, demo badge)`, [R.name, R.id, R.demo], ['Sampleton SDA (SAMPLE)', 'sample-sampleton-sda', true]);
    c(`${variant}: the profile as capMerged() reads it (55 on a Sabbath, 12 volunteers, 3 leaders, 160 h a month, $1,500 + $150)`, [R.attendance, R.hands, R.leaders, R.hours, R.startup, R.monthly], [55, 12, 3, 160, 1500, 150]);
    c(`${variant}: 80 members on the books and 46 adults in worship (capacity.membership, capacity.adults: GIFTS.md §2.1)`, [R.membership, R.adults], [80, 46]);
    c(`${variant}: one fellowship hall (60) and two classrooms (24), Tue–Thu evenings and Sabbath afternoon`, [R.rooms, R.slots],
      [['classrooms:24:Tue evening/Wed evening/Thu evening/Sat afternoon', 'kitchen:60:Tue evening/Wed evening/Thu evening/Sat afternoon'], ['Tue evening', 'Wed evening', 'Thu evening', 'Sat afternoon']]);
    c(`${variant}: the approval path ministry team › finance committee › church board, motion first (PROPOSAL.md §6.1)`, R.approval, { v: 1, path: ['team', 'finance', 'board'], order: 'motion' });
    c(`${variant}: ${n} gifts results, every one decoded and belonging to this church`, [R.roster, R.decoded, R.belong, R.people], [n, n, n, n]);
    c(`${variant}: adults only`, R.minors, 0);
    if (variant === 'after') {
      c('after: one respondent answered 3–4 to everything (gfFlags allHigh), left out of every count by the app', R.flagged, 1);
      c('after: the 12 profile volunteers are the 12 the pastor reviewed as willing, 3 of them leaders', [R.reviewed, R.leadersReviewed], [12, 3]);
      c('after: every counted member has at least one demonstrated gift', R.noDemonstrated, []);
      c('after: results are varied (demonstrated, emerging, untested and less evident all present)', ['demonstrated', 'emerging', 'untested', 'quiet'].every(k => R.labels[k] > 10), true);
      c('after: 40 of 46 adults is half or more (E: proposals draw on the whole church)', 40 / 46 >= 0.5, true);
    }
    if (variant === 'partial') c('partial: 18 of 46 adults is below half (E: the church-wide initiative comes first)', 18 / 46 < 0.5, true);
    const PL = P.J(`(()=>{ const p=casePlanItem(); if(!p) return null; const d=new Date(p.planRaw.date+'T12:00:00'); return {...p.planRaw, dow:d.getDay(), days:Math.round((d-new Date('2026-09-29T12:00:00'))/864e5), ask:uChurch().confAsk};})()`);
    c(`${variant}: the Evangelism Planner series (a Friday about five months out; 12 nights, 4 a week, 120 seats, $6,000)`,
      PL && [PL.dow, PL.days >= 140 && PL.days <= 160, PL.nights, PL.perweek, PL.workers, PL.seats, PL.budget, PL.kind], [5, true, 12, 4, 12, 120, 6000, 'prophecy']);
    c(`${variant}: the conference ask: counsel, training, half the cost ($3,000 of $6,000)`, PL && [PL.ask.counsel, PL.ask.training, PL.ask.cost, PL.ask.share, PL.ask.total], [true, true, true, 3000, 6000]);
    c(`${variant}: no page errors`, P.errs.filter(e => !/Not implemented/.test(e)), []);
  }
  /* ---------------- Parts 1 and 2: every sample's deck, EN and ES, in all three variants ---------------- */
  for (const variant of ['before', 'partial', 'after']) for (const lang of ['en', 'es']) {
    const P = page(variant, lang);
    for (const [id, group, purpose] of SAMPLES) {
      P.w.__avg = undefined;
      P.E(`(async()=>{ try{ const G=CASE_GROUPS.find(g=>g.id===${JSON.stringify(group)}); let mid=${JSON.stringify(id)};
        if(mid==='@plan') mid=CASE_PLAN_ID;
        else if(!SIGNATURE.some(x=>x.id===mid)){ await libLoadIndex(); const r=LIB.byId.get(mid); await libLoadTheme(r.theme); libSave(libFull(mid)); }
        const m=caseModel(mid,{type:G.type,group:G.id},{lang:${JSON.stringify(lang)}}); if(!m||!m.ok){ window.__avg=JSON.stringify({ok:false,error:m&&m.error}); return; }
        const d=caseDeck(m), x=caseItemOf(mid), nv=JSON.parse(JSON.stringify(d)); nv.slides.forEach(s=>{ delete s.verse; });
        // a built-in's own steps in the deck's language: its Spanish steps were written for v10.42 part 3 (CASE_HOW_BUILTIN, the writer's builtin-how.json)
        let steps=[]; try{ if(x&&x.lib){ const raw=libRawOf(x.id); const T=libLang(raw,${JSON.stringify(lang)})||libLang(raw,'en'); steps=T.how||[]; } else steps=(${JSON.stringify(lang)}==='es'&&typeof CASE_HOW_BUILTIN==='object'&&CASE_HOW_BUILTIN[x.id]&&CASE_HOW_BUILTIN[x.id].es)||(x&&x.how)||[]; }catch(e){}
        window.__avg=JSON.stringify({ok:true,n:d.slides.length,types:d.slides.map(s=>s.type),heads:d.slides.map(s=>s.headline||s.text||''),kick:d.slides.map(s=>s.kicker||''),json:JSON.stringify(d),nv:JSON.stringify(nv),
          motion:JSON.stringify(d.slides.find(s=>s.type==='motion')||{}),gifts:m.gifts,goal:m.goal&&m.goal.text||null,steps,groupType:G.type});
      }catch(e){ window.__avg=JSON.stringify({ok:false,error:String(e&&e.message||e)}); } })();`);
      await until(() => P.w.__avg, 20000);
      const D = typeof P.w.__avg === 'string' ? JSON.parse(P.w.__avg) : { ok: false, error: 'timeout' };
      const tag = `${variant} ${lang} ${id === '@plan' ? 'the Planner series' : id} → ${group}`;
      c(`${tag}: builds`, D.ok ? true : D.error, true);
      if (!D.ok) continue;
      c(`${tag}: 7–11 slides`, D.n >= 7 && D.n <= 11, true);
      c(`${tag}: no member's name, no "AI"`, [NAMES.filter(nm => D.json.includes(nm)), rx(RULES.ai, '').test(D.json)], [[], false]);
      if (variant === 'after' && purpose !== 'field' && purpose !== 'family') c(`${tag}: the gifts results are read (39 counted: 40 less the one flagged)`, [D.gifts.has, D.gifts.respondents], [true, 39]);
      if (purpose === 'youth') c(`${tag}: the children's safeguarding rows`, rx(RULES.safeguarding).test(D.json), true);
      c(`${tag}: never a gifts clause in the motion (E supersedes C)`, rx(RULES.gifts.motionStep).test(D.motion), false);
      // Part 2 — v10.42 (design §5: relevance by purpose; §6: the arc; E: gifts first)
      const PU = RULES.purposes[purpose];
      const found = PU.forbid.map(k => { const m = FAM[k].exec(D.nv); return m ? k + ' "' + m[0] + '"' : null; }).filter(Boolean);
      v42(`${tag}: relevance (${purpose}) — no ${PU.forbid.join('/')} figure`, !found.length, found.join('; '));
      if (!PU.stat) v42(`${tag}: relevance (${purpose}) — no need-figure slide`, !D.types.includes('stat'), D.heads[D.types.indexOf('stat')]);
      if (!PU.hereIn) { const re = rx(RULES.hereIn); const i = D.kick.findIndex(k => re.test(k)); v42(`${tag}: relevance (${purpose}) — no "Here in" slide`, i < 0, i >= 0 ? D.heads[i] : ''); }
      const js = D.nv.toLowerCase(), words = s => String(s).toLowerCase().replace(/[^a-zà-ÿ0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3);
      const hits = (D.steps || []).filter(st => { const w = words(st).slice(0, 6); return w.length && w.filter(x => js.includes(x)).length >= Math.min(4, w.length); }).length;
      if (D.steps && D.steps.length) v42(`${tag}: the arc — how it works, from the idea's own steps`, hits >= Math.min(2, D.steps.length), `${hits} of ${D.steps.length}`);
      v42(`${tag}: the arc — the goal opens and closes the deck`, !!D.goal && D.nv.split(D.goal).length - 1 >= 2, D.goal ? 'goal on fewer than two slides' : 'no model.goal');
      const last = D.heads[D.heads.length - 1] || '', AP = RULES.appeal;
      const are = lang === 'es' ? AP.es : group === 'finance' ? AP.finance : group === 'business' ? AP.business : group === 'conference' ? AP.conference : D.groupType === 'board' ? AP.board : AP.team;
      v42(`${tag}: the arc — ends with an appeal back to the goal`, rx(are).test(last), last);
      if (variant !== 'after' && purpose !== 'field' && purpose !== 'family') v42(`${tag}: gifts first — below half, the church-wide Spiritual Gifts initiative comes first`, rx(RULES.gifts.initiative).test(D.json) && rx(RULES.gifts.churchWide).test(D.json));
      if (variant === 'partial' && purpose === 'family') v42(`${tag}: gifts first — "Our church family" shows 18 of 46 adults`, /of 46 adults|de 46 adultos/.test(D.json));
    }
  }
  console.log(`\n${pass} passed, ${fail} failed` + (pending ? ` (${pending} v10.42 checks pending: REQUIRE_V42=1 counts them)` : ''));
  process.exit(fail ? 1 : 0);
})();
