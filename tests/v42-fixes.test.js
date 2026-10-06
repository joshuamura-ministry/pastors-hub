/* v10.42.0 — the fixes after the review of the samples (30 Sep 2026), on the made-up average church (tests/average-church/).
 * The pastor, of v10.41.1's prayer deck: "What does that have to do with why we want to do a prayer ministry — a prayer calendar?
 * It's detached from what's going on… everything has to line up with what was chosen." The review found the v10.42.0 samples still
 * carried detached template words, three schedules on one deck, a length the board was asked to choose against its own motion, a
 * recorded motion rewritten after the vote, counts that disagreed, and a conference budget that did not add up. Each check below
 * quotes what it holds.
 *  1. an idea made and handed out (the prayer calendar): its own milestones, its own ask, no places, no session, no host
 *  2. a group supporting another ministry keeps its own ask
 *  3. the finance committee, the board and the business meeting choose the day, never the length
 *  4. the food pantry: its steps name no day, groceries not a kitchen, where its food money comes from
 *  5. a club that runs by term (the Pathfinder club): the first term
 *  6. after the vote: the motion as moved, the timing agreed on its own line, the run from its first to its last session
 *  7. the finance committee's handout, the one status line, the trail on paper
 *  8. the conference: the amount in the motion, a budget that adds up, the trail
 *  9. after the gifts results: one denominator, "can lead", the profile's leaders said with the gifts'
 * 10. the Pathfinder handout's lead figure is the deck's; the "Here in" slide never repeats the why figure
 * 11. smaller words: the safeguards, the Proposal's heading and WHEN, Spanish, the sources, the conference's How
 * 12. (final check) an outreach idea nobody sits at (prayer walking every street): no session, no host
 */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const jspdf = require('jspdf');
const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const FX = require('./fixtures.json');
const FXD = path.join(__dirname, 'average-church');
const SEED = v => JSON.parse(fs.readFileSync(path.join(FXD, `seed-${v}.json`), 'utf8'));
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 700)); console.log('    want:', JSON.stringify(e).slice(0, 400)); fail++; } else pass++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(f, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (f()) return true; } catch (e) { } await sleep(25); } return false; }
function page(variant, lang, data) {
  const errs = []; const vc = new VirtualConsole(); vc.on('jsdomError', e => errs.push(e.message));
  const seed = SEED(variant);
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://pastorshub.org/', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { w.scrollTo = () => { }; w.scrollBy = () => { }; w.Element.prototype.scrollIntoView = function () { }; w.jspdf = jspdf;
      for (const [k, v] of Object.entries(seed)) if (!k.startsWith('_')) w.localStorage.setItem(k, JSON.stringify(v));
      if (lang) w.localStorage.setItem('terrain-lang', lang);
      w.fetch = async (u) => { u = String(u); const m = /^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if (m) { const f = path.join(ROOT, 'ideas', m[1] + '.json'); if (!fs.existsSync(f)) return { ok: false, status: 404, json: async () => null }; const t = fs.readFileSync(f, 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(t) }; }
        if (/advise/.test(u)) return { ok: true, status: 200, json: async () => ({ enabled: false }) };
        return new Promise(() => { }); }; } });
  const w = dom.window;
  const P = { w, errs, E: s => w.eval(s), J: s => JSON.parse(w.eval(`JSON.stringify(${s})`)) };
  P.E(`(()=>{ DATA=${JSON.stringify(data || FX.DATA)}; SCOPE='tract'; CAP=null; })()`);
  return P;
}
const localISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ago = n => localISO(new Date(Date.now() - n * 864e5));
// one sample: the model, its deck, the handout (object and every drawn line) and the Proposal (object and every drawn line)
const run = async (P, id, group, o = {}) => {
  P.w.__r = undefined;
  P.E(`(async()=>{ try{ const G=CASE_GROUPS.find(g=>g.id===${JSON.stringify(group)}); let mid=${JSON.stringify(id)};
    if(mid==='@plan') mid=CASE_PLAN_ID;
    else if(!SIGNATURE.some(x=>x.id===mid)){ await libLoadIndex(); const r=LIB.byId.get(mid); await libLoadTheme(r.theme); libSave(libFull(mid)); }
    uChurch().caseDecisions={}; ${o.recs ? `uChurch().caseDecisions[mid]=${JSON.stringify(o.recs)};` : ''} uPersist();
    const m=caseModel(mid,{type:G.type,group:G.id},{timing:${JSON.stringify(o.timing || 'options')}}); const d=caseDeck(m);
    const H=caseHandout(m,d,{}), hd=casePdfDoc(H,{jsPDF:window.jspdf.jsPDF}); const Pz=caseProposal(m,d,{}), pd=caseProposalDoc(Pz,{jsPDF:window.jspdf.jsPDF});
    const lines=doc=>(doc.__caseLog||[]).map(l=>l.t);
    window.__r=JSON.stringify({m:{timing:m.timing,motion:m.motion,roles:m.roles,support:m.support,risks:m.risks,yes:m.yes,ask:{text:m.ask.text,rows:m.ask.rows,lines:m.ask.lines},gifts:m.gifts,capacity:{free:m.capacity.free},
      place:m.place?{facts:m.place.facts,headline:m.place.headline,partners:m.place.partners}:null,dates:m.dates,family:m.family,how:m.how},d,H,Pz,hl:lines(hd),pl:lines(pd),hpages:hd.getNumberOfPages(),ppages:pd.getNumberOfPages()});
  }catch(e){ window.__r=JSON.stringify({err:String(e&&e.stack||e)}); } })()`);
  await until(() => P.w.__r, 30000);
  const R = JSON.parse(P.w.__r || '{"err":"timeout"}'); if (R.err) console.log('    ERROR', R.err.slice(0, 400));
  return R;
};
const all = R => JSON.stringify(R.d.slides);
const text = arr => arr.join(' ').replace(/\s+/g, ' ');
const S = (R, t, part) => R.d.slides.find(s => s.type === t && (part === undefined || s.part === part));

(async () => {
  const P = page('before', 'en'); await until(() => P.E('typeof caseModel==="function"'));
  const Pes = page('before', 'es'); await until(() => Pes.E('typeof caseModel==="function"'));

  console.log('\n-- 1. the prayer calendar: an idea made and handed out --');
  { const R = await run(P, 'prayer-town-prayer-calendar', 'prayer'), E = await run(Pes, 'prayer-town-prayer-calendar', 'prayer');
    // (2 Oct 2026: once October has passed, the app rightly says the NEXT October with its year — "starting in October 2027";
    //  the expected words follow the clock, so this suite does not turn red every 1 Nov – 31 Dec)
    const late = new Date().getMonth() > 9, OCT = late ? 'October ' + (new Date().getFullYear() + 1) : 'October', OCTES = late ? 'octubre de ' + (new Date().getFullYear() + 1) : 'octubre';
    c('it is "made" (a calendar), so nobody is seated at it', [R.m.timing.made, R.m.timing.options.length], [true, 0]);
    c('its own milestones time it: October, December, each Monday (from its own description and steps)', S(R, 'ask', 'decide').rows,
      [['October', 'Write the 365 lines with members'], ['December', 'The church prints 500 wall calendars'], ['Each Monday', 'Send the email on a free Mailchimp plan'],
        ['Check first', 'Communion Sabbath, Week of Prayer, camp meeting, holidays, school breaks']]);
    c('…the same months in Spanish', S(E, 'ask', 'decide').rows.slice(0, 3).map(r => r[0]), ['Octubre', 'Diciembre', 'Cada lunes']);
    c('…under "When each step happens"', [S(R, 'ask', 'decide').headline, S(E, 'ask', 'decide').headline], ['When each step happens', 'Cuándo se hace cada paso']);
    c('the opening: when it starts and when it is reviewed; no Length, no Places', S(R, 'motion').rows, [['Starts', OCT + ', after a calendar check'], ['Review', 'First team meeting after the first round']]);
    // the review: "carry in prayer the team of a free wall calendar of prayers for our town, each session…"
    c('its own ask: the prayer ministry runs it (not "carry in prayer the team of" it)', R.m.ask.text,
      'Run a free wall calendar of prayers for our town as a team: 5 volunteers, each taking a share of its steps, a coordinator who keeps it on track, and a short report at the review. We’ll choose the start together tonight.');
    c('…Spanish', /^Llevar adelante un calendario de pared gratis con oraciones por la ciudad como equipo: 5 voluntarios/.test(E.m.ask.text), true);
    c('roles: no "serves at each session", no Host', [R.m.roles.map(r => r.title.replace(/ × \d+/, '')), R.m.roles.find(r => /Team member/.test(r.title)).text], [['Coordinator', 'Team member', 'Prayer partner'], 'Takes one of the steps and sees it through.']);
    c('support: training before it starts (no "first session")', S(R, 'risks').items[0], 'Training before it starts');
    // "Give 2 hours on the days it runs" (a calendar has no days it runs): its help is a share of its steps, EN and ES
    c('the appeal\'s Help: a few hours on one of its steps, EN and ES', [R.m.yes.options.find(o => o.k === 'help').text, E.m.yes.options.find(o => o.k === 'help').text],
      ['Give a few hours to one of its steps.', 'Dar unas horas a uno de sus pasos.']);
    const words = all(R) + text(R.hl) + text(R.pl);
    c('nowhere a session, a trial of weeks, a pilot, places or a host', ['each session', 'first session', '6-week', '4-week', 'pilot', 'Places', 'PLACES', '16 places', 'Host', 'arrives alone', 'Tuesday evening'].filter(w => words.includes(w)), []);
    // "Help never depends on attending church, and nobody is pressed" (close to the exact phrase he objected to)
    c('no "Help never depends on attending church" (it gives no material help), no conference counsel on $900', [/Help never depends/.test(words), /conference/.test(text(R.hl.filter(t => /counsel/i.test(t))))], [false, false]);
    c('the handout: its milestones in the timing section, "Agreed start:"', [R.H.timing.title, R.H.timing.boxes.map(b => b.label), R.H.timing.length, R.H.timing.agreed], ['When each step happens', ['October', 'December', 'Each Monday'], '', 'Agreed start:']);
    c('the Proposal: "starting in October", no trial of weeks, no places, the milestones as WHEN', [R.Pz.memo.find(r => r[0] === 'Subject')[1], R.Pz.motion, R.Pz.plan.find(p => p.k === 'where').lines, R.Pz.plan.find(p => p.k === 'when').lines],
      ['A free wall calendar of prayers for our town, starting in ' + OCT, 'To agree to run a free wall calendar of prayers for our town, starting in ' + OCT + ', with a named coordinator, and to bring it to the finance committee.',
        ['No room needed'], ['October: Write the 365 lines with members', 'December: The church prints 500 wall calendars', 'Each Monday: Send the email on a free Mailchimp plan', 'Before we choose, check the church calendar: communion Sabbath, Week of Prayer, camp meeting, holidays, school breaks.']]);
    c('…in Spanish', [E.Pz.memo.find(r => r[0] === 'Asunto')[1], new RegExp('^Acordar llevar adelante un calendario de pared gratis con oraciones por la ciudad, a partir de ' + OCTES + ',').test(E.Pz.motion)], ['Un calendario de pared gratis con oraciones por la ciudad, a partir de ' + OCTES, true]);
    c('the handout, one page each side; the Proposal one page', [R.hpages, R.ppages], [2, 1]);
    const B = await run(P, 'prayer-town-prayer-calendar', 'board');
    c('to the board: "Choose the start together", and the team sets the start date (not the day)', [S(B, 'ask', 'decide').headline, /The team sets the start date with the church calendar within two weeks and reports it to the board\./.test(B.m.ask.text), B.Pz.motion],
      ['When each step happens', true, 'To approve a free wall calendar of prayers for our town, starting in ' + OCT + ', with a named coordinator and a spending ceiling of $900 ($900 to start), paid from the local church budget, not tithe; the team sets the start date with the church calendar within two weeks and reports it to the board; with a written report at the review.']);
    c('a made library idea is found by its name (cards, flyers, a newsletter), never an event with a card', P.J(`['Tear-off prayer flyers on community boards','A handwritten note in the mail within two days','A New Year consecration Sabbath with a card you keep','A legacy-letter morning: a letter the family will keep','A free wall calendar of prayers for our town'].map(libMadeName)`), [true, true, false, false, true]); }

  console.log('\n-- 2. a group supporting another ministry keeps its own ask --');
  { const R = await run(P, 'food-pantry', 'prayer');
    // v10.42.0 fix after review (the length): a team chooses the length together, so its ask says "Throughout the trial" (was "For 6 weeks")
    c('the prayer ministry, of the food pantry: "carry in prayer the team of…" (its ask was written for this)', /^Throughout the trial, carry in prayer the team of a real food pantry, on a schedule, each session/.test(R.m.ask.text), true);
    c('caseOwnIdea: the group\'s own first theme only', P.J(`[caseOwnIdea({lib:true,theme:'prayer'},'prayer'),caseOwnIdea({lib:true,theme:'hunger'},'prayer'),caseOwnIdea({lib:true,theme:'literature'},'literature'),caseOwnIdea({id:'food-pantry'},'prayer')]`), [true, false, true, false]); }

  console.log('\n-- 3. the finance committee, the board and the business meeting choose the day, never the length --');
  // "Choose the day and the length together … Length 4-week pilot · 6-week trial · a full season" beside a motion for 6 weeks and $125
  for (const g of ['finance', 'board', 'business']) {
    const R = await run(P, 'food-pantry', g);
    c(`${g}: "Choose the day together", three days, no Length row`, [S(R, 'ask', 'decide').headline, S(R, 'ask', 'decide').rows.map(r => r[0])], ['Choose the day together', ['Option 1', 'Option 2', 'Option 3', 'Check first']]);
    c(`${g}: the opening's Length is the motion's own ("A 6-week trial"), the handout's too`, [R.m.motion.rows.find(r => r[0] === 'Length')[1], R.H.timing.length], ['A 6-week trial', 'Length: 6-week trial.']);
  }
  { const E = await run(Pes, 'food-pantry', 'finance');
    c('…Spanish: "Elijamos juntos el día"', S(E, 'ask', 'decide').headline, 'Elijamos juntos el día'); }

  console.log('\n-- 4. the food pantry --');
  { const R = await run(P, 'food-pantry', 'community'), F = await run(P, 'food-pantry', 'finance'), E = await run(Pes, 'food-pantry', 'community');
    // "Set fixed hours, say the first and third Sunday morning" against "Tuesday · Wednesday · Thursday evening"; "every other week"
    c('its steps name no day, EN and ES', [R.m.how.steps[1], E.m.how.steps[1]], ['Set fixed hours and never miss them.', 'Fije un horario y no falle nunca.']);
    c('its description names no fortnight', /every other week/.test(text(R.pl) + JSON.stringify(R.Pz.plan)), false);
    // "A volunteer with food-handler training leads the kitchen", "Ingredients and allergens labelled" (a pantry hands out groceries)
    const sg = [...F.m.risks.items.map(r => r.text), ...R.m.support.items].join(' | ');
    c('safeguards: the food bank\'s rules, dates, dignity at sign-in; never a kitchen', [/partner-agency rules/.test(sg), /Dates checked/.test(sg), /food-handler|allergens|prepared and served/.test(F.m.risks.items.map(r => r.text).join(' '))], [true, true, false]);
    c('…and the board\'s slide leads with them', S(F, 'risks').items.slice(0, 2).map(t => t.slice(0, 30)), ['Paid from the local church bud', 'A spending ceiling of $2,100; ']);
    c('the budget says where the food comes from (the coordinator costs it; nothing invented)', F.m.ask.lines.map(l => [l.name, l.startup, l.monthly]),
      /* v10.45.0 review round (stale, the new intent): the built-ins the needs show are priced at their source (U_LINES_OWN, review #6): the pantry's start-up and running costs, and its food still costed by the coordinator */
      [['Start-up: equipment and materials (2026 estimate)', 1500, 0], ['Each month: supplies and running costs (2026 estimate)', 0, 300], ['Food: from the food bank at partner prices; the coordinator costs it before the finance meeting', 0, 0]]);
    c('…the same $2,100 ceiling', F.m.ask.rows.find(r => r[0] === 'Ceiling')[1], '$2,100'); }

  console.log('\n-- 5. the Pathfinder club runs by term --');
  { const R = await run(P, 'pathfinders', 'pathfinders');
    // "The Pathfinder club, which must 'Register the club with the conference youth department', is framed as 'A 6-week trial'"
    c('the first term, not a 6-week trial or a 4-week pilot', [S(R, 'motion').rows.find(r => r[0] === 'Length')[1], S(R, 'ask', 'decide').rows.find(r => r[0] === 'Length')[1], R.m.timing.review], ['The first term', 'The first term', 'First team meeting after the first term']);
    c('the Proposal: "To agree to the first term"', /^To agree to the first term, on a day and start we agree together: /.test(R.Pz.motion), true);
    c('its steps name no meeting day', R.m.how.steps[1], 'Set the club\'s meeting times with the church calendar, and publish the year\'s calendar up front.');
    P.E(`uChurch().overrides={pathfinders:{weeks:8}}; uPersist();`);
    const A = await run(P, 'pathfinders', 'pathfinders');
    // v10.42.0 fix after review (the length): then his trial is one of the lengths the team chooses from (was "An 8-week trial or a 4-week pilot")
    c('…unless he set the weeks himself (Adjust): then his trial, among the lengths to choose', [A.m.motion.rows.find(r => r[0] === 'Length')[1], A.Pz.motion.startsWith('To agree to a trial of the length we choose together (a 4-week pilot, an 8-week trial or a full season), on a day and start we agree together: ')],
      ['4-week pilot · 8-week trial · a full season', true]);
    P.E(`uChurch().overrides={}; uPersist();`); }

  console.log('\n-- 6. after the vote --');
  { const recs = { team: { v: 1, body: 'team', group: 'community', date: ago(21), outcome: 'agreed', vote: { for: 6, against: 0, abstain: null, consensus: false }, timing: null, at: 1 },
      finance: { v: 1, body: 'finance', date: ago(14), outcome: 'recommended', vote: { for: 5, against: 0, abstain: null, consensus: false }, timing: null, at: 2 } };
    const before = await run(P, 'food-pantry', 'board', { recs });
    const s = new Date(Date.now() + 14 * 864e5); while (s.getDay() !== 4) s.setDate(s.getDate() + 1);
    // (v55 verify, 2 Oct 2026: a run with no holiday on a session, so the timing line has no holiday note: run from 2 Oct to
    // 12 Nov, the 6 Thursdays from s took in Thanksgiving and these two checks failed on the date alone)
    while (P.J(`caseRunHolidays(new Date('${localISO(s)}T12:00:00'),6).length`)) s.setDate(s.getDate() + 7);
    const board = { v: 1, body: 'board', date: ago(7), outcome: 'approved', vote: { for: 9, against: 0, abstain: 1, consensus: false }, timing: { option: null, slot: 'Thu evening', time: '18:00', start: localISO(s), len: 'trial', weeks: 6, room: 'kitchen' }, at: 3 };
    const after = await run(P, 'food-pantry', 'board', { recs: { ...recs, board } });
    // "Before the vote: '…the team sets the day and the start date…' After: 'To approve a trial of 6 weeks, from 15 Oct to 26 Nov…'"
    c('the motion as moved, word for word, beside the ticked "Approved"', [after.Pz.motion === before.Pz.motion, after.Pz.action.boxes.filter(b => b.checked).map(b => b.label)], [true, ['Approved']]);
    c('…the timing agreed on its own line under Action taken', after.Pz.action.timing, { label: 'Timing agreed:', text: `Thursday evening · 6:00 pm · ${P.J(`caseDate(new Date('${localISO(s)}T12:00:00'),true)`)} · 6-week trial · Fellowship hall` });
    c('…and THE PLAN as moved: WHERE names no agreed day beside WHEN\'s options', [after.Pz.plan.find(p => p.k === 'where').lines, before.Pz.plan.find(p => p.k === 'where').lines], [['Fellowship hall · 16 places'], ['Fellowship hall · 16 places']]);
    c('…and drawn there, the motion printed twice the same', [after.pl.some(t => /^Timing agreed: Thursday evening/.test(t)), text(after.pl).split('the team sets the day and the start date').length - 1], [true, 2]);
    const last = new Date(s); last.setDate(last.getDate() + 35);   // (calendar days: 35 × 24 h across the end of summer time fell a day short after midnight)
    c('the run from its first to its last session, reviewed at the next board meeting after it', [S(after, 'motion').rows[0][1], S(after, 'motion').rows[2][1]],
      [P.J(`caseDate(new Date('${localISO(s)}T12:00:00'))`) + ' – ' + P.J(`caseDate(new Date('${localISO(last)}T12:00:00'))`), 'First board meeting after ' + P.J(`caseDate(new Date('${localISO(last)}T12:00:00'))`)]);
    // "26 Nov 2026 is the fourth Thursday of November (Thanksgiving)"
    c('holidays a church seldom meets on: Thanksgiving 2026 is 26 Nov, Christmas, Independence Day', P.J(`caseHolidays(2026).map(h=>h.k+':'+caseISO(h.d))`),
      ['newYear:2026-01-01', 'memorial:2026-05-25', 'independence:2026-07-04', 'labor:2026-09-07', 'thanksgiving:2026-11-26', 'christmas:2026-12-25']);
    c('an agreed run with a session on Thanksgiving says so', P.J(`caseDecTimingText({slot:'Thu evening',start:'2026-10-22',len:'trial',weeks:6}).rows.find(r=>r[0]==='Note')`), ['Note', 'A session falls on Thanksgiving Day (26 Nov)']);
    c('…and an option that meets on one says so, the slide without a date', P.J(`(()=>{ const o=caseTimingOptions({cap:capMerged(),r:uReq(caseItemOf('food-pantry')),use:CASE_NO_USE,sabOk:false,start:new Date('2026-10-20T12:00:00'),weeks:6}); return o.map(x=>x.slot+':'+x.clashes.map(c=>c.kind+'/'+c.k).join(','));})()`),
      ['Tue evening:', 'Wed evening:', 'Thu evening:holiday/thanksgiving']); }

  console.log('\n-- 7. the finance committee\'s handout, one status line, the trail on paper --');
  { const recs = { team: { v: 1, body: 'team', group: 'community', date: ago(21), outcome: 'agreed', vote: { for: 6, against: 0, abstain: null, consensus: false }, timing: null, at: 1 } };
    const F = await run(P, 'food-pantry', 'finance', { recs }), E = await run(Pes, 'food-pantry', 'finance', { recs });
    // "BOARD DECISION · TO: TREASURER & FINANCE COMMITTEE"
    c('headed as the finance committee\'s own recommendation, EN and ES', [F.H.kicker, E.H.kicker], ['Finance committee recommendation · To: Treasurer & finance committee', 'Recomendación de la comisión de finanzas · Para: Tesorería y comisión de finanzas']);
    c('one status line: "To … · Agreed by Community Services (Dorcas) on … (6 for · 0 against)"', [F.H.by, F.H.status], [`To: Treasurer & finance committee · Agreed by Community Services (Dorcas) on ${P.J(`caseDate(new Date('${ago(21)}T12:00:00'),true)`)} (6 for · 0 against)`, '']);
    c('the trail says "this meeting" on paper, never "these slides"; nothing pending before a decision', [F.H.trail.here, F.H.trail.rows.map(r => r.label + (r.pending ? ' (pending)' : ''))], ['this meeting', ['Community Services (Dorcas)', 'Finance committee (pending)', 'Church board (pending)']]);
    c('…the body deciding now reads "this meeting", not "still to come · this meeting"', F.hl.some(t => /^· this meeting$/.test(t)) && !F.hl.some(t => /still to come · this meeting/.test(t)), true);
    c('…Spanish "esta reunión"', E.H.trail.here, 'esta reunión'); }

  console.log('\n-- 8. the conference --');
  { const recs = { board: { v: 1, body: 'board', date: ago(10), outcome: 'approved', vote: { for: 9, against: 0, abstain: 1, consensus: false }, timing: null, at: 1 } };
    const R = await run(P, '@plan', 'conference', { recs });
    // "The conference motion does not say how much is being asked, and the money does not add up"
    // v10.43 (the pastor, 30 Sep 2026: "separate the things that are weekly or monthly — ongoing ministry — and events, which are one-time, one day… after one day there needs to be some kind of follow-up"): his series' motion carries its follow-up plan after the amount
    c('the motion names the amount', /by granting up to \$3,000 \(half of the \$6,000 cost\), with training and counsel, with the follow-up plan \(an invitation to [^;]+ within two weeks, for those who ask\);/.test(R.Pz.motion), true);
    const B = R.Pz.budget.rows, num = v => +String(v).replace(/[$,]/g, '');
    // v10.49.0: no "From the church budget" row (the church's funds are no longer read; the Evangelism Planner will hold them):
    // the total, the conference's share and the rest still add up
    c('the budget is a table that adds up, and what is not money is one "Also asked" row', [B.slice(0, 3).map(r => r[0]), num(B[1][1]) + num(B[2][1]) === num(B[0][1]), B[3][0]],
      [['Total cost', 'Asked of the conference', 'Meeting offerings, or still to raise'], true, 'Also asked']);
    c('"still to settle" is not a reason why', R.Pz.why.some(w => /Still to settle/.test(w.text)), false);
    // "○ Ministry team · still to come / ○ Finance committee · still to come / ✓ Church board · Approved"
    c('the trail: the board ("Supported"), then the conference, this proposal', R.H.trail.rows.map(r => [r.label, r.outcome, r.pending, r.here]), [['Church board', 'Supported', false, false], ['Conference', '', false, true]]);
    c('…"this proposal"', R.H.trail.here, 'this proposal');
    c('the How slide says the date in the sentence\'s own case', R.m.how.steps[3], 'Opening night, proposed for 26 Feb 2027: 12 nights, then every new believer is followed up.'.replace('26 Feb 2027', P.J(`caseDate(new Date(casePlanItem().planRaw.date+'T12:00:00'),true)`))); }

  console.log('\n-- 9. after the gifts results --');
  { const A = page('after', 'en'); await until(() => A.E('typeof caseModel==="function"'));
    const R = await run(A, 'food-pantry', 'board'), G = await run(A, 'member-care-two-sabbath-card', 'hospitality');
    // "8 Members whose gifts fit this work, of 40 who have taken the assessment" beside "results from 39 members"
    c('one denominator: the 39 results counted, on the slide and in its source', [/of 39 results counted/.test(S(R, 'ability').label), /from 39 members/.test(S(R, 'ability').source)], [true, true]);
    // "Leaders 3 free · 1 needed … Every need is covered", then "Nobody is ready to coordinate yet"
    c('none who fit can lead yet: said with the profile\'s leaders', S(R, 'ability').lead, '3 leaders in the church; none yet among those whose gifts fit: pair and train.');
    // "15 | Members whose gifts fit this work; 3 ready to lead" beside "8 have time to give; 1 can lead"
    const fam = S(G, 'place').facts.find(f => /gifts fit/.test(f.label));
    c('the church family\'s item says "can lead", as the handout box does', [fam.label, /1 can lead/.test(G.H.gifts.text)], ['Members whose gifts fit this work; 1 can lead', true]);
    c('…and the box counts the same 39', /of 39 adults’ results \(87% of 46 adults have taken it\)/.test(G.H.gifts.text), true); }

  console.log('\n-- 10. the lead figure and the "Here in" slide --');
  { const D2 = JSON.parse(JSON.stringify(FX.DATA)); D2.M.tract.age5_9 = 410; D2.M.tract.age10_14 = 405;
    const Q = page('before', 'en', D2); await until(() => Q.E('typeof caseModel==="function"'));
    const R = await run(Q, 'pathfinders', 'pathfinders');
    // "Handout WHY: '27% About 1 in 4 people around us is a child'… Slide 3: 'About 815 children aged 5 to 14 live around us'"
    c('the club\'s team deck leads with its ages, and so does its handout', [S(R, 'stat').value, R.H.hero.value, /815 children aged 5 to 14/.test(R.H.hero.head)], ['815', '815', true]);
    c('…in the table of figures', R.H.figures.some(f => /aged 5 to 14/.test(f.label)), true);
    c('the Proposal says it once, without "(815)"', R.Pz.why.find(w => w.k === 'ev1').text, 'About 815 children aged 5 to 14 live around us.');
    // "the 'where' slide repeats the why figure with a different rounding"; "Sampleton Township Free Library · Public library"
    const F = await run(P, 'food-pantry', 'board');
    c('the pantry\'s "Here in" never repeats its lead figure at the town\'s level', (F.m.place && F.m.place.facts || []).filter(f => f.kind === 'town').length, 0);
    c('a club\'s partners are youth organisations only', P.J(`casePurposeOf(caseItemOf('pathfinders'),{type:'team',group:'pathfinders'}).partners`), ['youth']);
    const Gb = await run(P, 'member-care-two-sabbath-card', 'hospitality');
    c('before any result, the church family\'s slide says the gifts initiative: 0 of 46 adults', S(Gb, 'place').facts.some(f => f.value === '0' && /of 46 adults have discovered their gifts/.test(f.label)), true); }

  console.log('\n-- 11. smaller words --');
  { const R = await run(P, 'food-pantry', 'community'), E = await run(Pes, 'food-pantry', 'board');
    // "the three evenings read as meeting three nights a week"
    c('WHEN reads as one choice', R.Pz.plan.find(p => p.k === 'when').lines[0].startsWith('One of: Tuesday evening, Wednesday evening or Thursday evening'), true);
    c('the one-page Proposal keeps CHURCH and the path', [R.Pz.memo[0][0], R.pl.some(t => /^Path: /.test(t)), R.pl.includes('Sampleton SDA (SAMPLE)')], ['Church', true, true]);
    c('the conference\'s counsel only on a major matter, said as what we will do', [/conference/.test(R.m.risks.items.map(r => r.text).join(' ')), P.J(`CASE_RISKS.general.find(r=>r.id==='g-conference').en`)], [false, 'We will seek the conference’s counsel, as the Church Manual asks on major matters']);
    c('Spanish: "o un piloto de 4 semanas", "en un plazo de dos semanas", never "busque"', [Pes.J(`caseT(CASE_TIMING.orPilot)`), /en un plazo de dos semanas/.test(E.m.ask.text), Pes.J(`CASE_PLACE.whereHome.es`)], [' o un piloto de 4 semanas', true, '{who}: buscar primero justo alrededor de la iglesia']);
    // "Horario acordado: Jueves por la noche · … · Prueba de 6 semanas": in running Spanish a weekday and the length are lower case
    c('Spanish: the agreed timing in running text is lower case (the table keeps its capitals)', [Pes.J(`caseDecTimingText({slot:'Thu evening',time:'18:00',start:'2026-10-15',len:'trial',weeks:6,room:'kitchen'}).line`),
      Pes.J(`caseDecTimingText({slot:'Thu evening',len:'trial',weeks:6}).rows.map(r=>r[1])`)],
      ['Acordado: jueves por la noche · 6:00 p. m. · 15 oct 2026 · prueba de 6 semanas · Salón social', ['Jueves por la noche', 'Prueba de 6 semanas']]);
    c('a Spanish time is never broken across lines', Pes.J(`(()=>{ const d=new window.jspdf.jsPDF({unit:'pt',format:'letter'}); const Pz=caseProposal(caseModel('food-pantry',{type:'board',group:'board'},{timing:'options'})); Pz.motion='Aprobar una prueba de seis semanas del 15 de octubre al 19 de noviembre (jueves por la noche, 6:00 p. m.) con todo lo demás'; return caseProposalDoc(Pz,{jsPDF:window.jspdf.jsPDF}).__caseLog.map(l=>l.t).filter(t=>/p\\.$/.test(t)||/^m\\.\\)/.test(t)).length; })()`), 0);
    // "one claims something that has not been done": the calendar check, while the day is still to be chosen
    c('the calendar safeguard says what we do, not that it is done, EN and ES', [P.J(`CASE_RISKS.general.find(r=>r.id==='g-calendar').en`), P.J(`CASE_RISKS.general.find(r=>r.id==='g-calendar').es`)],
      ['Checked against the church calendar before a date is set', 'Revisado con el calendario de la iglesia antes de fijar fecha']);
    c('the sources say what each gives', [P.J(`caseT(CASE_PLACE.source.zonesShort)`), P.J(`caseT(CASE_PLACE.source.partners)`)], ['Census blocks: U.S. Census', 'Map: OpenStreetMap']);
    c('"Short by 13 leaders" (never "13 more leaders" after "Short by")', P.J(`caseF(CASE_COPY.capacity.short,{short:caseF(CASE_X.gap.leaders,{n:13})})`), 'Short by 13 leaders'); }

  // v10.42.0 final check: the samples' prayer walking deck ("Pray every street in the township this year": members claim streets and
  // walk them in pairs) still read "Team member × 9: Serves at each session and welcomes people by name", "Host: Sits with anyone who
  // arrives alone" and "Training before the first session": the detached template words he objected to ("everything has to line up
  // with what was chosen"). An outreach idea nobody sits at (x.seats false: the streets, online) gets the made idea's words.
  console.log('\n-- 12. an outreach idea nobody sits at: prayer walking every street --');
  { const R = await run(P, 'prayer-every-street-map', 'prayer'), E = await run(Pes, 'prayer-every-street-map', 'prayer');
    c('nobody is seated at it (it is walked, street by street): no Places on the Proposal', [P.J(`libToCatalog(libFull('prayer-every-street-map')).seats`), R.Pz.plan.find(p => p.k === 'where').lines], [false, ['No room needed']]);
    c('roles: no "serves at each session", no Host', [R.m.roles.map(r => r.key), R.m.roles.find(r => r.key === 'member').text], [['coordinator', 'member', 'prayer'], 'Takes one of the steps and sees it through.']);
    c('…Spanish', [E.m.roles.map(r => r.key), E.m.roles.find(r => r.key === 'member').text], [['coordinator', 'member', 'prayer'], 'Asume uno de los pasos y lo lleva a término.']);
    c('support: training before it starts (no "first session"), EN and ES', [S(R, 'risks').items[0], S(E, 'risks').items[0]], ['Training before it starts', 'Capacitación antes de empezar']);
    const words = all(R) + text(R.hl) + text(R.pl), palabras = all(E) + text(E.hl) + text(E.pl);
    c('nowhere a session or a host, on the slides, the handout or the Proposal', ['each session', 'first session', 'Host', 'arrives alone'].filter(w => words.includes(w)), []);
    c('…nor in Spanish', ['cada sesión', 'primera sesión', 'Recepción', 'llega sin compañía'].filter(w => palabras.includes(w)), []);
    c('a walk still happens on days: the team still chooses one of three', R.m.timing.options.length, 3);
    // an idea people sit at keeps its Host and its sessions (the food pantry, the group's own words)
    const Q = await run(P, 'food-pantry', 'community');
    c('an idea people come to keeps its Host and "serves at each session"', [Q.m.roles.map(r => r.key).includes('host'), /each session/.test(Q.m.roles.find(r => r.key === 'member').text)], [true, true]); }

  // v10.42.0 fix after review (the length, 30 Sep 2026): the samples' ministry-team motion still said "To agree to a trial of 6 weeks"
  // while its slide offered "4-week pilot · 6-week trial · a full season". The pastor: "yes, they should be able to choose length." A
  // ministry team chooses the length together, as it chooses the day; the Sabbath deck announces both. The finance committee, the board
  // and the business meeting keep the length in their motion (§3); a made idea (§1) and a club that runs by term (§5) keep their own.
  console.log('\n-- 13. a ministry team chooses the length together --');
  { const R = await run(P, 'food-pantry', 'community'), E = await run(Pes, 'food-pantry', 'community');
    c('the opening\'s Length: the three lengths to choose from, as the decide slide has them', [S(R, 'motion').rows.find(r => r[0] === 'Length')[1], S(R, 'ask', 'decide').rows.find(r => r[0] === 'Length')[1], R.m.motion.rows.find(r => r[0] === 'Length')[1]],
      ['4-week pilot · 6-week trial · a full season', '4-week pilot · 6-week trial · a full season', '4-week pilot · 6-week trial · a full season']);
    c('…Spanish', [S(E, 'motion').rows.find(r => r[0] === 'Duración')[1], S(E, 'ask', 'decide').rows.find(r => r[0] === 'Duración')[1]],
      ['Piloto de 4 semanas · prueba de 6 semanas · una temporada', 'Piloto de 4 semanas · prueba de 6 semanas · una temporada']);
    // (the headline sits under the kicker "Let's decide together": in English "together" once, measured at 360 × 640 with clashes)
    c('the decide slide: "We’ll choose the day and the length tonight", EN and ES', [S(R, 'ask', 'decide').headline, S(R, 'ask', 'decide').kicker, S(E, 'ask', 'decide').headline],
      ['We’ll choose the day and the length tonight', 'Let’s decide together', 'Elegiremos juntos el día y la duración esta noche']);
    c('the ask names no length ("Throughout the trial"), and says the length is chosen tonight', R.m.ask.text,
      'Throughout the trial, run a real food pantry, on a schedule, 4 sessions a month, for 16 places, and, with people’s permission, a way to stay in touch so nobody is met once and forgotten. We’ll choose the day and the length together tonight.');
    c('…Spanish', E.m.ask.text,
      'Durante la prueba, llevar a cabo la iniciativa «una despensa de alimentos de verdad, con horario fijo», 4 sesiones al mes, para 16 lugares, y, con el permiso de cada persona, una manera de mantener el contacto para que nadie sea atendido una vez y olvidado. Elegiremos juntos el día y la duración esta noche.');
    c('the Proposal\'s motion: a trial of the length we choose together, the three named', R.Pz.motion,
      'To agree to a trial of the length we choose together (a 4-week pilot, a 6-week trial or a full season), on a day and start we agree together: a real food pantry, on a schedule, with a named coordinator, and to bring it to the finance committee.');
    c('…Spanish', E.Pz.motion,
      'Acordar una prueba de la duración que elijamos juntos (un piloto de 4 semanas, una prueba de 6 semanas o una temporada), en el día y con la fecha de inicio que acordemos juntos: una despensa de alimentos de verdad, con horario fijo, con una persona coordinadora designada, y presentarla a la comisión de finanzas.');
    // (WHEN keeps its Length line; on a page drawn tight it is left to the motion, which names the lengths: measured, it took many team
    // Proposals onto a second page)
    c('…its subject says the same; WHEN the days, the lengths and the calendar check, EN and ES', [R.Pz.memo.find(r => r[0] === 'Subject')[1], R.Pz.plan.find(p => p.k === 'when').lines.slice(1), E.Pz.memo.find(r => r[0] === 'Asunto')[1], E.Pz.plan.find(p => p.k === 'when').lines[1], R.Pz.plan.find(p => p.k === 'when').lenInMotion],
      ['A real food pantry, on a schedule: a trial of the length we choose together', ['Length: 4-week pilot · 6-week trial · a full season', 'Before we choose, check the church calendar: communion Sabbath, Week of Prayer, camp meeting, holidays, school breaks.'],
        'Una despensa de alimentos de verdad, con horario fijo: una prueba de la duración que elijamos juntos', 'Duración: piloto de 4 semanas · prueba de 6 semanas · una temporada', true]);
    c('the handout: the lengths as options, a line to write the agreed day, start and length in, EN and ES', [R.H.timing.length, R.H.timing.agreed, E.H.timing.length, E.H.timing.agreed],
      ['Length: 4-week pilot · 6-week trial · a full season.', 'Agreed day, start and length:', 'Duración: piloto de 4 semanas · prueba de 6 semanas · una temporada.', 'Día, inicio y duración acordados:']);
    c('…drawn: the motion twice on the Proposal', text(R.pl).split('a trial of the length we choose together (a 4-week pilot, a 6-week trial or a full season)').length - 1, 2);
    const words = all(R) + text(R.hl) + text(R.pl), palabras = all(E) + text(E.hl) + text(E.pl);
    c('nowhere a length stated as settled: slides, handout, Proposal', ['a trial of 6 weeks', 'For 6 weeks', 'A 6-week trial or a 4-week pilot', 'choose the day together'].filter(w => words.includes(w)), []);
    c('…nor in Spanish', ['una prueba de 6 semanas,', 'Durante 6 semanas', 'o un piloto de 4 semanas', 'Elegiremos el día juntos'].filter(w => palabras.includes(w)), []);
    c('the handout two pages, the Proposal one (EN)', [R.hpages, R.ppages], [2, 1]); }
  { const R = await run(P, 'member-care-two-sabbath-card', 'hospitality'), E = await run(Pes, 'member-care-two-sabbath-card', 'hospitality');
    // the greeters' card has no day to choose (a card, the week someone is missed): its start and its length
    c('greeters (the missed-member card): the start and the length, EN and ES', [S(R, 'ask', 'decide').headline, S(E, 'ask', 'decide').headline, R.H.timing.agreed, E.H.timing.agreed],
      ['We’ll choose the start and the length tonight', 'Elegiremos juntos el inicio y la duración esta noche', 'Agreed start and length:', 'Inicio y duración acordados:']);
    c('…its ask', R.m.ask.text, 'Throughout the trial, carry a handwritten card when a member misses two Sabbaths as greeters: two or three named people, any list of members kept private and only with their consent, and a warm word within the week for anyone we have missed. We’ll choose the start and the length together tonight.');
    c('…its motion: a start, not a day, to agree', [R.Pz.motion, /^Acordar una prueba de la duración que elijamos juntos \(un piloto de 4 semanas, una prueba de 6 semanas o una temporada\), con la fecha de inicio que acordemos juntos: una tarjeta a mano/.test(E.Pz.motion)],
      ['To agree to a trial of the length we choose together (a 4-week pilot, a 6-week trial or a full season), starting on a date we agree together: a handwritten card when a member misses two Sabbaths, with a named coordinator, and to bring it to the finance committee.', true]);
    c('…the Proposal still one page (EN); the handout draws the line to write the start and the length in', [R.ppages, R.hl.includes('Agreed start and length:')], [1, true]); }
  { // prayer walking every street (no room): its WHEN has no days' line (as before), so on a page drawn tight its Length line stays
    // there (a tight page leaves the lengths to the motion only when WHEN has something else to say)
    const R = await run(P, 'prayer-every-street-map', 'prayer'), F = await run(P, 'food-pantry', 'community');
    const at = (X, i = X.pl.indexOf('WHEN')) => X.pl.slice(i + 1, i + 3).join(' ');
    c('prayer walking: WHEN is never empty (its lengths); the food pantry\'s WHEN its days, the lengths in its motion; both one page', [/^Length: 4-week pilot · 6-week trial · a full season/.test(at(R)), /^One of: Tuesday evening/.test(at(F)), /Length:/.test(at(F)), R.ppages, F.ppages], [true, true, false, 1, 1]); }
  { // every ministry team asks for no number of weeks (the groups' own asks: "For {weeks}, …", "Adopt a trial of {weeks} under this council")
    // (v10.43: grief recovery is a series: its eight sessions are its length, below; the two ongoing ideas choose theirs tonight)
    const bad = l => P.J(`(()=>{ const out=[]; for(const g of CASE_GROUPS.filter(g=>g.type==='team')) for(const id of ['food-pantry','prayer-walk']){ const m=caseModel(id,{type:'team',group:g.id},{timing:'options',lang:'${l}'});
      if(m.ok&&(/\\b\\d+ (weeks|semanas)\\b/.test(m.ask.text)||!/(the day and the length|the start and the length|el día y la duración|el inicio y la duración) (together )?(tonight|esta noche)\\.$/.test(m.ask.text))) out.push(g.id+'/'+id+': '+m.ask.text.slice(0,90)); } return out; })()`);
    c('every team group\'s ask, EN and ES: no number of weeks, the length chosen tonight', [bad('en'), bad('es')], [[], []]);
    c('…Personal Ministries\' council', P.J(`caseModel('food-pantry',{type:'team',group:'personal'},{timing:'options'}).ask.text`).startsWith('Adopt a trial of the length we choose together under this council: '), true);
    // v10.43 (the pastor, 30 Sep 2026: "separate the things that are weekly or monthly — ongoing ministry — and events, which are one-time, one day… after one day there needs to be some kind of follow-up"): a series' length is its sessions
    c('…a series (grief recovery, eight sessions): "For the 8 sessions", "Adopt a series of 8 sessions", the day chosen tonight', [P.E(`caseModel('grief',{type:'team',group:'community'},{timing:'options'}).ask.text`).startsWith('For the 8 sessions, '),P.E(`caseModel('grief',{type:'team',group:'personal'},{timing:'options'}).ask.text`).startsWith('Adopt a series of 8 sessions under this council: '),/We’ll choose the day together tonight\.$/.test(P.E(`caseModel('grief',{type:'team',group:'community'},{timing:'options'}).ask.text`))], [true,true,true]); }
  { // the Sabbath deck: the whole church is told the day and the length, as the day was ("we'll announce the day")
    const R = await run(P, 'food-pantry', 'congregation'), E = await run(Pes, 'food-pantry', 'congregation');
    c('the Sabbath deck: "A trial", the day and the length to be announced, EN and ES', [S(R, 'motion').headline, R.m.motion.rows, S(E, 'motion').headline, E.m.motion.rows],
      ['A trial: a real food pantry, on a schedule', [['When', 'Starting soon; we’ll announce the day and the length'], ['Places', '16']],
        'Una prueba: una despensa de alimentos de verdad, con horario fijo', [['Cuándo', 'Empieza pronto; anunciaremos el día y la duración'], ['Cupos', '16']]]);
    c('…its ask and its first steps name no length', [R.m.ask.text, E.m.ask.text, R.H.steps.map(s => s.date), E.H.steps.map(s => s.date)],
      ['Throughout the trial: pray for the people around us, give one evening a month, or lead one part of a real food pantry, on a schedule.',
        'Durante la prueba: orar por las personas de nuestro entorno, dar una tarde al mes, o dirigir una parte de la iniciativa «una despensa de alimentos de verdad, con horario fijo».',
        ['Week 1 · start', 'Halfway through', 'After the trial · review'], ['Semana 1 · inicio', 'A mitad de la prueba', 'Tras la prueba · revisión']]);
    const words = all(R) + text(R.hl);
    c('…nowhere 6 weeks', ['6 weeks', '6-week', 'WEEK 6', 'WEEK 3'].filter(w => words.includes(w)), []); }
  { // when a decision is recorded, the length agreed fills in everywhere
    const s = new Date(Date.now() + 14 * 864e5); while (s.getDay() !== 4) s.setDate(s.getDate() + 1);
    const team = { v: 1, body: 'team', group: 'community', date: ago(3), outcome: 'agreed', vote: { for: 6, against: 0, abstain: null, consensus: false }, timing: { option: null, slot: 'Thu evening', time: '18:00', start: localISO(s), len: 'pilot', weeks: 4, room: 'kitchen' }, at: 1 };
    const O = await run(P, 'food-pantry', 'community'), T = await run(P, 'food-pantry', 'community', { recs: { team } }), B = await run(P, 'food-pantry', 'board', { recs: { team } });
    const member = P.J(`caseHandout(null,${JSON.stringify(T.d)},{}).agreed.rows`);
    c('the team agreed a 4-week pilot: its slides, the handout and a phone\'s copy say so', [S(T, 'ask', 'agreed').rows.find(r => r[0] === 'Length')[1], T.H.agreed.rows.find(r => r[0] === 'Length')[1], member.find(r => r[0] === 'Length')[1], T.m.ask.text.startsWith('For 4 weeks, run a real food pantry')],
      ['4-week pilot', '4-week pilot', '4-week pilot', true]);
    c('…its Proposal: the motion as moved (the lengths it chose from), the pilot under Action taken', [T.Pz.motion === O.Pz.motion, T.Pz.action.timing.text.includes('4-week pilot'), T.Pz.memo.find(r => r[0] === 'Subject')[1]],
      [true, true, 'A real food pantry, on a schedule: a trial of 4 weeks']);
    c('…the board is asked to approve the 4 weeks agreed', [B.Pz.motion.startsWith('To approve a trial of 4 weeks, from '), S(B, 'ask', 'agreed').rows.find(r => r[0] === 'Length')[1]], [true, '4-week pilot']);
    const F = await run(P, 'food-pantry', 'board', { recs: { team: { ...team, timing: { ...team.timing, len: 'season', weeks: 13 } } } });
    c('…a full season: 13 weeks', F.Pz.motion.startsWith('To approve a trial of 13 weeks, from '), true); }
  { // "I already know the dates" stays exactly as it was
    const R = await run(P, 'food-pantry', 'community', { timing: 'fixed' });
    c('"I already know the dates": the team\'s dates and weeks as before', [R.Pz.motion.startsWith('To agree to a trial of 6 weeks, from '), R.m.ask.text.startsWith('For 6 weeks, run a real food pantry'), R.m.motion.rows.map(r => r[0])], [true, true, ['When', 'Runs', 'Places', 'Review']]); }

  c('no page errors', [P.errs, Pes.errs].flat().filter(e => !/Not implemented/.test(e)), []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('  FAIL  crashed: ' + (e && e.stack || e)); console.log(`\n${pass} passed, ${fail + 1} failed`); process.exit(1); });
