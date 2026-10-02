/* v10.43.0 — timing wording follows the cadence (DESIGN.md C1.6, FOLLOWUP.md §2; §8.1 T-T2 – T-T9; T-T1 is v43-ongoing-golden).
 * SPEC §1: "Timing wording follows the cadence (an event has a date to choose, not a weekday rhythm; a series has a number of
 * sessions; ongoing keeps today's options)." The clock is frozen at 1 Oct 2026 (the month rule depends on today).
 *  T-T2 an event: the decide slide, the motion, the ask, the handout, the Proposal       T-T3 a series in a row, a weekly series
 *  T-T4 the month an event is offered in      T-T5 weeks and the ceiling      T-T6 the scan: no "trial", "pilot", "season"
 *  T-T7 precedence: agreed › Planner › made › term › cadence      T-T8 Record what we decided for an event
 *  T-T9 a series whose idea states no count (cad 100): "the series", "Series", the sessions from {month}
 */
const H = require('./v43-helpers.js');
const { c, sleep, until, page, ready, build, slide, BUILTIN_EVENTS, BUILTIN_SERIES } = H;
const rowsOf = s => s ? s.rows.map(r => r.join(' · ')) : null;
(async () => {
  const P = await ready(page('after', 'en')), Pes = await ready(page('after', 'es'));
  const has = P.E('typeof caseCadenceOf==="function"&&typeof caseCadLeaf==="function"');
  c('the page times by cadence (v10.43)', has, true);
  if (!has) return H.done();

  console.log('\n-- T-T2 an event (the health expo; no month of its own: eight weeks out, November) --');
  // v51 (the Sabbath guideline, 1 Oct 2026): a health screening fits the Sabbath, so its Day is "Sabbath afternoon, or a Sunday"
  const E = await build(P, 'health-expo', 'board'), Ees = await build(Pes, 'health-expo', 'board');
  c('the decide slide: "Choose the date together", When · Day · Check first (with the town\'s events), no Option',
    [slide(E, 'decide').headline, rowsOf(slide(E, 'decide'))], ['Choose the date together', ['When · One day in November', 'Day · Sabbath afternoon, or a Sunday', 'Check first · Communion Sabbath, Week of Prayer, camp meeting, holidays, school breaks, the town’s own events']]);
  c('…in Spanish', [slide(Ees, 'decide').headline, rowsOf(slide(Ees, 'decide'))], ['Elijamos juntos la fecha', ['Cuándo · Un día de noviembre', 'Día · Sábado por la tarde, o un domingo', 'Revisar antes · Santa Cena, Semana de Oración, campestre, feriados, vacaciones escolares, eventos del pueblo']]);
  const mo = E.d.slides.find(s => s.type === 'motion');
  // (the motion as built; the slide keeps what fits beside his goal: caseFitDeck lets Review give way first)
  c('the motion: "Approve a one-day event: …"; When · the ceiling with its funds · Review "after the event" (no Length row)',
    [/^Approve a one-day event: /.test(mo.headline), E.m.motion.rows.map(r => r.join(' · ')), mo.rows.some(r => r[0] === 'Length')], [true, ['When · One day in November, after a calendar check', 'Spending ceiling · $800 · local budget, not tithe', 'Review · First board meeting after the event'], false]);
  c('the ask: "The team sets the date … and reports it to the board."', / The team sets the date with the church calendar within two weeks and reports it to the board\.$/.test(E.m.ask.text), true);
  c('the handout: "The date" (When, Day), "Agreed date:", the review "hold it again"',
    [E.H.timing.title, E.H.timing.boxes.map(b => b.label + ': ' + b.title), E.H.timing.agreed, E.H.review], ['The date', ['When: One day in November', 'Day: Sabbath afternoon, or a Sunday'], 'Agreed date:', 'Review at the first board meeting after the event: hold it again, change it or stop.']);
  c('the Proposal: subject "…: a one-day event", the motion "To approve a one-day event: …; the team sets the date … reports it to the board"',
    [/: a one-day event$/.test(E.Pz.memo.find(r => r[0] === 'Subject')[1]), /^To approve a one-day event: .*; the team sets the date with the church calendar within two weeks and reports it to the board;/.test(E.Pz.motion)], [true, true]);
  c('…THE PLAN\'s When: the month, the day, the calendar with the town\'s', E.Pz.plan.find(p => p.k === 'when').lines,
    ['One day in November, chosen together with the church calendar', 'Day: Sabbath afternoon, or a Sunday', 'Before we choose, check the church calendar and the town’s: communion Sabbath, Week of Prayer, camp meeting, holidays, school breaks, local events.']);
  c('…REVIEW: "First board meeting after the event: hold it again, change it or stop."', E.Pz.review[0][1], 'First board meeting after the event: hold it again, change it or stop.');
  c('Spanish Proposal: "Aprobar un evento de un día: …", "el equipo fija la fecha … y la informa a la junta"', [/^Aprobar un evento de un día: /.test(Ees.Pz.motion), /el equipo fija la fecha con el calendario de la iglesia en un plazo de dos semanas y la informa a la junta/.test(Ees.Pz.motion)], [true, true]);
  const Et = await build(P, 'backpack-giveaway', 'community');
  c('a team: "We\'ll choose the date together tonight", the motion "To agree to a one-day event, on a date we agree together: …"',
    [slide(Et, 'decide').headline, /^To agree to a one-day event, on a date we agree together: /.test(Et.Pz.motion), / We’ll choose the date together tonight\.$/.test(Et.m.ask.text)], ['We’ll choose the date together tonight', true, true]);
  const Ec = await build(P, 'health-expo', 'congregation');
  c('the whole church: "Coming soon; we\'ll announce the date"', Ec.d.slides.find(s => s.type === 'motion').rows[0], ['When', 'Coming soon; we’ll announce the date']);
  const Ef = await build(P, 'health-expo', 'board', { timing: 'fixed' });
  c('"I already know the dates": Runs "On {date}", the first steps six weeks before · the day · two weeks after',
    [/^On \d/.test(Ef.d.slides.find(s => s.type === 'motion').rows[0][1]), Ef.m.timeline.steps.map(s => s.title), Ef.m.timeline.steps.map(s => s.date.replace(/^.* · /, ''))], [true, ['Get ready', 'The day', 'Follow up'], ['get ready', 'the day', 'follow-up']]);
  c('…the Proposal: "…a one-day event, on {date}: …"', /^To approve a one-day event, on \d+ [A-Z][a-z]{2}( \d{4})?: /.test(Ef.Pz.motion), true);

  console.log('\n-- T-T3 a series in a row (VBS, four nights) and a weekly series (the cooking school) --');
  const R4 = await build(P, 'four-nights', 'board'), R4es = await build(Pes, 'four-nights', 'board'), V = await build(P, 'vbs', 'community');
  c('in a row: "Choose the dates together", When "4 days in a row, in {month}", Day "Evenings, or mornings in the summer"',
    [slide(R4, 'decide').headline, rowsOf(slide(R4, 'decide')).slice(0, 2)], ['Choose the dates together', [`When · 4 days in a row, in ${R4.m.timing.month}`, 'Day · Evenings, or mornings in the summer']]);
  c('…Spanish: "Elijamos juntos las fechas", "4 días seguidos, en …"', [slide(R4es, 'decide').headline, /^Cuándo · 4 días seguidos, en /.test(rowsOf(slide(R4es, 'decide'))[0])], ['Elijamos juntos las fechas', true]);
  c('…the motion: "Approve a series of 4 sessions: …", When "4 days in a row in {month}, after a calendar check", review "after the series"',
    [/^Approve a series of 4 sessions: /.test(R4.d.slides.find(s => s.type === 'motion').headline), R4.m.motion.rows.map(r => r.join(' · '))[0], R4.m.motion.rows.slice(-1)[0][1]],
    [true, `When · 4 days in a row in ${R4.m.timing.month}, after a calendar check`, 'First board meeting after the series']);
  c('…the ask: "The team sets the dates … and reports them to the board."; the handout "The dates", "Agreed dates:", "run it again"',
    [/ The team sets the dates with the church calendar within two weeks and reports them to the board\.$/.test(R4.m.ask.text), R4.H.timing.title, R4.H.timing.agreed, R4.H.review],
    [true, 'The dates', 'Agreed dates:', 'Review at the first board meeting after the series: run it again, change it or stop.']);
  c('…the Proposal: "a series of 4 sessions", the team sets the dates, "run it again"', [/: a series of 4 sessions$/.test(R4.Pz.memo.find(r => r[0] === 'Subject')[1]), /; the team sets the dates with the church calendar within two weeks and reports them to the board;/.test(R4.Pz.motion), R4.Pz.review[0][1]],
    [true, true, 'First board meeting after the series: run it again, change it or stop.']);
  c('VBS to a team: "We\'ll choose the dates together tonight", 5 days in a row, "Days 1–5" in the first steps', [slide(V, 'decide').headline, /^When · 5 days in a row, in /.test(rowsOf(slide(V, 'decide'))[0]), V.m.timeline.steps[1].date], ['We’ll choose the dates together tonight', true, 'Days 1–5']);
  const W = await build(P, 'cooking-school', 'community'), Wb = await build(P, 'cooking-school', 'board'), Wes = await build(Pes, 'cooking-school', 'community');
  c('a weekly series: the day options as today, its length "6 sessions, one a week" (a team), no pilot or season',
    [slide(W, 'decide').headline, slide(W, 'decide').rows.some(r => /^Option 1$/.test(r[0])), slide(W, 'decide').rows.find(r => r[0] === 'Length')], ['We’ll choose the day together tonight', true, ['Length', '6 sessions, one a week']]);
  c('…the board\'s motion: Length "6 sessions, one a week"; its decide slide has no length row (the motion\'s)', [Wb.m.motion.rows.find(r => r[0] === 'Length'), slide(Wb, 'decide').rows.some(r => r[0] === 'Length')], [['Length', '6 sessions, one a week'], false]);
  c('…first steps "Session 1 · start", "Session 3 · midpoint", "After session 6 · review"', W.m.timeline.steps.map(s => s.date), ['Session 1 · start', 'Session 3 · midpoint', 'After session 6 · review']);
  c('…Spanish: "6 sesiones, una por semana", "Sesión 1 · inicio"', [slide(Wes, 'decide').rows.find(r => r[0] === 'Duración'), Wes.m.timeline.steps[0].date], [['Duración', '6 sesiones, una por semana'], 'Sesión 1 · inicio']);
  c('…the Proposal: "a series of 6 sessions", WHEN\'s length line', [/: a series of 6 sessions$/.test(Wb.Pz.memo.find(r => r[0] === 'Subject')[1]), Wb.Pz.plan.find(p => p.k === 'when').lines.includes('Length: 6 sessions, one a week')], [true, true]);

  console.log('\n-- T-T4 the month an event is offered in --');
  const mon = (Q, id) => Q.E(`caseMonth(caseCadMonth(SIGNATURE.find(z=>z.id===${JSON.stringify(id)}),new Date()),new Date())`);
  c('the fall festival names October: too close this year (42 days), so October 2027', mon(P, 'fall-festival'), 'October 2027');
  c('the back-to-school giveaway names August: August 2027', mon(P, 'backpack-giveaway'), 'August 2027');
  c('the health expo names no month: eight weeks from today, November', mon(P, 'health-expo'), 'November');
  c('Spanish: "octubre de 2027"', mon(Pes, 'fall-festival'), 'octubre de 2027');
  c('a month 42 days or more away stays this year (from 1 Aug: October)', P.E(`caseMonth(caseCadMonth(SIGNATURE.find(z=>z.id==='fall-festival'),new Date(2026,7,1,12)),new Date(2026,7,1,12))`), 'October');

  console.log('\n-- T-T5 weeks and the ceiling (FOLLOWUP.md §2.2) --');
  const ceil = async id => (await build(P, id, 'board')).m.vals.ceiling;
  c('an event\'s ceiling is its start-up and one month: the backpack giveaway $600, the fall festival $100, the health expo $800', [await ceil('backpack-giveaway'), await ceil('fall-festival'), await ceil('health-expo')], ['$600', '$100', '$800']);
  c('V.weeks: "one day" (an event), "6 sessions" (a weekly series), "4 sessions" (in a row)', [E.m.vals.weeks, Wb.m.vals.weeks, R4.m.vals.weeks], ['one day', '6 sessions', '4 sessions']);

  console.log('\n-- T-T6 the scan: no "trial", "pilot" or "season" on an event or a series --');
  const leak = await P.E(`(async()=>{ const EN=/\\btrial\\b|\\bpilot\\b|\\bseason\\b/i, ES=/\\bprueba\\b|\\bpiloto\\b|\\btemporada\\b/i, BAD=/\\bde el |\\ba el |trial of one day|prueba de un día/;
    const strs=(o,a)=>{ if(typeof o==='string') a.push(o); else if(Array.isArray(o)) o.forEach(v=>strs(v,a)); else if(o&&typeof o==='object') Object.values(o).forEach(v=>strs(v,a)); return a; };
    const out=[]; const ids=Object.keys(CASE_CADENCE_BUILTIN);
    for(const lang of ['en','es']) for(const id of ids) for(const g of ['board','finance','business','community','congregation','conference']) for(const tm of (g==='board'||g==='community'?['options','fixed']:['options'])){
      const G=CASE_GROUPS.find(z=>z.id===g), m=caseModel(id,{type:G.type,group:G.id},{timing:tm,lang}); if(!m.ok) continue; const d=caseDeck(m);
      const strip=JSON.parse(JSON.stringify(d)); strip.slides.forEach(s=>delete s.part);
      const x=SIGNATURE.find(z=>z.id===id), own=[x.n,x.d,...(x.how||[]),caseInLang(lang,()=>caseMinName(x))].filter(Boolean).map(String), verses=new Set(CASE_VERSES.map(v=>v[lang].text));
      const all=strs([d,caseHandout(m,d,{}),caseProposal(m,d,{}),caseHandout(null,strip,{})],[]).filter(s=>!verses.has(s)&&!own.some(o=>o===s||(o.length>20&&s.includes(o))));
      all.forEach(s=>{ if((lang==='es'?ES:EN).test(s)||BAD.test(s)) out.push(id+'/'+g+'/'+tm+'/'+lang+': '+s.slice(0,90)); }); }
    return JSON.stringify([...new Set(out)].slice(0,8)); })()`);
  c('36 event and series built-ins × six bodies × both timings (board, a team) × EN/ES: deck, handout, Proposal, a member\'s copy', JSON.parse(leak), []);
  const lib = await P.E(`(async()=>{ const ids=[]; const ev=LIB.rows.filter(r=>r.cad!==0&&libReach(r)!=='in'); for(let i=0;i<ev.length;i+=97) ids.push(ev[i].id); return JSON.stringify(ids); })()`).then(JSON.parse);
  const libLeak = [];
  for (const id of lib) for (const [Q, lang] of [[P, 'en'], [Pes, 'es']]) { const R = await build(Q, id, 'board'); const re = lang === 'es' ? /\bprueba\b|\bpiloto\b|\btemporada\b/i : /\btrial\b|\bpilot\b|\bseason\b/i;
    const own = Q.J(`(()=>{ const x=uCatalog().find(z=>z.id===${JSON.stringify(id)}); return [x.n,x.d,...(x.how||[]),x.nEs,x.dEs,...(x.howEs||[])].filter(Boolean); })()`), verses = new Set(Q.J(`CASE_VERSES.map(v=>v[${JSON.stringify(lang)}].text)`));
    const strs = (o, a) => { if (typeof o === 'string') a.push(o); else if (Array.isArray(o)) o.forEach(v => strs(v, a)); else if (o && typeof o === 'object') Object.values(o).forEach(v => strs(v, a)); return a; };
    strs([R.d, R.H, R.Pz], []).filter(s => !verses.has(s) && !own.some(o => o === s || (o.length > 20 && s.includes(o)))).forEach(s => { if (re.test(s)) libLeak.push(id + '/' + lang + ': ' + s.slice(0, 90)); }); }
  c(`every 97th outreach library event and series (${lib.length}) to the board, EN and ES`, [...new Set(libLeak)].slice(0, 6), []);

  console.log('\n-- T-T7 precedence: agreed › his Planner series › made › a club by term › the cadence --');
  const club = await build(P, 'pathfinders', 'board');
  c('the Pathfinder club is ongoing: "the first term", as v10.42', [club.m.timing.term, club.m.vals.weeks], [true, 'the first term']);
  const made = P.E(`(()=>{ const r=LIB.rows.find(r=>r.cad===1&&libMadeName(r.n)&&libReach(r)!=='in'); return r&&r.id; })()`);
  const Md = await build(P, made, 'board');
  c('an event made and handed out keeps its milestones (no "One day in …"), no follow-up plan', [Md.m.timing.made, !!Md.m.timing.dated, !!Md.m.followup], [true, false, false]);
  const PL = await build(P, '@plan', 'conference', { pre: `uChurch().plan={date:'2027-04-03',nights:12,perweek:4,kind:'both',workers:20,leaders:6,seats:120,budget:6000};` });
  c('his Planner series keeps the Planner\'s proposed dates (no cadence words)', [PL.m.timing.proposed, !!PL.m.timing.cad], [true, false]);
  P.E(`uChurch().cadence={'pathfinders':{cad:6}}`);
  const club2 = await build(P, 'pathfinders', 'board');
  c('"Runs as" a series turns the club\'s term off: "6 sessions"', [club2.m.timing.term, club2.m.vals.weeks], [false, '6 sessions']);
  P.E(`delete uChurch().cadence`);
  const today = P.E(`caseISO(new Date())`);
  const Ag = await build(P, 'health-expo', 'board', { pre: `uChurch().caseDecisions={'health-expo':{team:{v:1,body:'team',group:'health',date:'${today}',outcome:'agreed',vote:null,timing:{option:null,slot:null,time:'10:00',start:'2026-11-15',len:null,weeks:null,room:null,kind:'day'}}}};` });
  c('an agreed date wins: "Decided together", "Agreed: 15 Nov 2026", Date · Time, no length', [slide(Ag, 'agreed') && /^Agreed: 15 Nov( 2026)?$/.test(slide(Ag, 'agreed').headline), slide(Ag, 'agreed') && slide(Ag, 'agreed').rows.map(r => r[0])], [true, ['Date', 'Time', 'Agreed by']]);
  c('…the motion as it runs: "On 15 Nov"', /^On 15 Nov/.test(Ag.d.slides.find(s => s.type === 'motion').rows[0][1]), true);
  P.E(`uChurch().caseDecisions={}`);

  console.log('\n-- T-T8 Record what we decided, for an event --');
  P.E(`openTool('survey'); render(); openTool('case'); caseMount(true); caseChooseGroup('board'); caseChoose('health-expo');`);
  await until(() => P.E('!!(CASE_ST.model&&CASE_ST.model.ok)')); await sleep(30);
  P.E(`(()=>{ const el=document.createElement('div'); el.id='zz-dec'; document.body.append(el); el.innerHTML=caseDecFormHTML({mid:'health-expo',gid:'board',type:'board',model:CASE_ST.model,where:'build'}); caseDecFormWire(el,{mid:'health-expo',gid:'board',type:'board',model:CASE_ST.model,onSaved:r=>{ window.__saved=r; }}); })()`);
  P.q('#zz-dec [data-cd-out="approved"]').click(); await sleep(20);
  const radios = P.qa('#zz-dec [data-cd-tc]').map(r => r.value);
  c('no day options for an event: "Not settled yet" or "Something else"', radios, ['none', 'other']);
  P.q('#zz-dec [data-cd-tc][value="other"]').checked = true; P.q('#zz-dec [data-cd-tc][value="other"]').dispatchEvent(new P.w.Event('change')); await sleep(20);
  c('"Something else": Date and Time only (no day, no length)', [P.q('#zz-dec [data-cd-dayrow]').hidden, P.q('#zz-dec [data-cd-lenrow]').hidden, P.q('#zz-dec [data-cd-wrow]').hidden, P.txt('#zz-dec [data-cd-startlab]')], [true, true, true, 'Date']);
  P.q('#zz-dec [data-cd-start]').value = '2026-11-15'; P.q('#zz-dec [data-cd-time]').value = '10:00'; P.q('#zz-dec [data-cd-save]').click(); await sleep(30);
  c('saved: the date and the time, no slot, no length, kind "day"', P.J(`(()=>{ const t=window.__saved&&window.__saved.timing; return t&&[t.start,t.time,t.slot,t.len,t.weeks,t.kind]; })()`), ['2026-11-15', '10:00', null, null, null, 'day']);
  P.E(`uChurch().caseDecisions={}; document.getElementById('zz-dec').remove();`);

  console.log('\n-- T-T9 a series whose idea states no count (cad 100) --');
  const nc = P.E(`(()=>{ const r=LIB.rows.find(r=>r.cad===100&&libReach(r)==='out'&&!libMadeName(r.n)); return r.id; })()`);
  const N = await build(P, nc, 'board'), Nes = await build(Pes, nc, 'board'), Nt = await build(P, nc, 'community');
  c('"Series" on its card; V.weeks "the series"; the board\'s motion "Approve a series: …"', [P.E(`caseCadLabel(LIB.byId.get(${JSON.stringify(nc)}))`), N.m.vals.weeks, /^Approve a series: /.test(N.d.slides.find(s => s.type === 'motion').headline)], ['Series', 'the series', true]);
  c('timed by dates: "Choose the dates together", When "The sessions, from {month}", Day "As the idea sets out"',
    [slide(N, 'decide').headline, rowsOf(slide(N, 'decide')).slice(0, 2)], ['Choose the dates together', [`When · The sessions, from ${N.m.timing.month}`, 'Day · As the idea sets out']]);
  c('…the motion\'s When "The sessions from {month}, after a calendar check", no Length row, review "after the series"',
    [N.m.motion.rows.map(r => r.join(' · '))[0], N.m.motion.rows.some(r => r[0] === 'Length'), N.m.motion.rows.slice(-1)[0][1]],
    [`When · The sessions from ${N.m.timing.month}, after a calendar check`, false, 'First board meeting after the series']);
  c('…the Proposal: subject "…: a series", the motion "To approve a series: …", WHEN "The sessions from {month}, chosen together…", the first steps "The series"',
    [/: a series$/.test(N.Pz.memo.find(r => r[0] === 'Subject')[1]), /^To approve a series: /.test(N.Pz.motion), N.Pz.plan.find(p => p.k === 'when').lines[0], N.m.timeline.steps[1].date],
    [true, true, `The sessions from ${N.m.timing.month}, chosen together with the church calendar`, 'The series']);
  c('…Spanish: "la serie", "Aprobar una serie: …", "Las sesiones, desde …", "Como indica la idea"',
    [Nes.m.vals.weeks, /^Aprobar una serie: /.test(Nes.Pz.motion), /^Cuándo · Las sesiones, desde /.test(rowsOf(slide(Nes, 'decide'))[0]), rowsOf(slide(Nes, 'decide'))[1]], ['la serie', true, true, 'Día · Como indica la idea']);
  c('…a team: "We\'ll choose the dates together tonight", "on dates we agree together"', [slide(Nt, 'decide').headline, /^To agree to a series, on dates we agree together: /.test(Nt.Pz.motion)], ['We’ll choose the dates together tonight', true]);
  c('no page errors', [...P.errs, ...Pes.errs].filter(e => !/Not implemented/.test(e)).slice(0, 3), []);
  H.done();
})();
