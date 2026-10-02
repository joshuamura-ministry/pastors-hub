/* v10.43 fix — "there's a detach somewhere" (the pastor, 2 Oct 2026, live v10.43.0, his church in Worcester PA).
 *
 * The pastor: "Do you notice that in the PDF it says six week trial but I chose a one day event so there's a detach somewhere."
 * In Make the Case → Church board → step 2 he set the filter to "One-day events". Under "From your plan" the only card was a draft
 * idea from the idea helper, "Saturday afternoon board games" ("After Sabbath lunch, one member opens a classroom with board games
 * for families to drop into…"), chips "Ongoing · This week · 2 people · No cost", already his chosen ministry ("Keep this one" at the
 * top right). He took it, and the board's Proposal said "Approve a trial of 6 weeks: Saturday afternoon board games", WHEN "3 options
 * · from October", TIMING OPTIONS "Tuesday evening · Wednesday evening · Thursday evening".
 *
 * Two causes, each pinned here (each check failing on v10.43.0 first):
 *  1. the filter: step 2 kept the chosen idea in "From your plan" under ANY filter ("the idea already chosen is never hidden"), with
 *     nothing saying it was not a one-day event, so the filter looked broken and he believed he had chosen a one-day event. Now a
 *     chosen idea that does not match the filter is never in the filtered grid: one short line above it says what he has chosen and
 *     how it runs ("Your choice now: … · Ongoing (a 6-week trial) · Show it"); its kind chip comes first and is coloured wherever
 *     the chosen card is shown; picking a one-day event replaces it as usual. The survey's own filter never had an exception.
 *  2. the timing: an idea not marked "Fits the Sabbath" lost every Sabbath hour silently, so an idea whose own name says "Saturday
 *     afternoon" was offered three weekday evenings. Now a day and time the idea names itself (its name, then its description; EN
 *     and ES) is offered first when it may be; when it names Sabbath hours and is not marked as fitting the Sabbath, step 3 and the
 *     documents say so plainly, and he may choose Saturday afternoon himself (his decision for his church: it is recorded as the
 *     idea's time, Adjust → Time slot), after which every document offers it first. The Sabbath guideline
 *     (Terrain-design-notes/SABBATH-GUIDELINE.md): "Terrain offers Sabbath hours only for ideas that fit, and always lets the
 *     pastor decide for his church."
 * The made-up average church (tests/average-church/seed-after.json): its times are Tuesday, Wednesday and Thursday evening and
 * Saturday afternoon, as his. The clock is frozen at 1 October 2026 (v43-helpers).
 */
const fs = require('fs'), path = require('path');
const H = require('./v43-helpers.js');
const { c, sleep, until, page, ready, build, slide, FX } = H;
const A = JSON.parse(fs.readFileSync(path.join(__dirname, 'average-church', 'seed-after.json'), 'utf8'));
const CID = 'sample-sampleton-sda';
const DATA = { ...FX.DATA, geo: { ...FX.DATA.geo, matched: A['terrain-churches-v1'].churches[CID].address } };
const DID = 'draft-board-games';
/* His draft idea as the idea helper writes one (draftFrom): no "sabbath" field, no Spanish. */
const addDraft = P => P.E(`(()=>{ const metric=SPEC.map(([k])=>k).find(k=>Number.isFinite(DATA.M[SCOPE][k]));
  const d={id:${JSON.stringify(DID)},generated:true,n:'Saturday afternoon board games',
    why:'Families with children live all around the church, and many have no easy place to spend an afternoon together.',
    d:'After Sabbath lunch, one member opens a classroom with board games for families to drop into. Parents and children play together at the same tables, and neighbours who come meet church families over a game.',
    how:['Ask one member to open a classroom after Sabbath lunch.','Set out board games for every age.','Invite the Pathfinder and Adventurer families and the neighbours they know.'],
    unlike:'',k:KIND.belong,evidenceArea:DATA.levels[SCOPE].name,metric,reviewedEvidence:true,load:0,st:'trust',ppl:2,cost:0,skill:[],need:[]};
  d.requirements={...uBase(d),facilities:roomReq('classrooms'),reviewed:true};
  uChurch().drafts=[d]; uPersist(); })()`);
/* a tap on what is there (on the page before the fix some of it is not: the checks after it then fail, not crash) */
const tap = (P, sel) => { const e = P.q(sel); if (e) e.click(); return !!e; };
const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
const joined = lines => norm((lines || []).join(' '));
const NOTE_EN = 'This idea names Saturday afternoon, but it is not marked “Fits the Sabbath”, so these times are on other days.';
const NOTE_ES = 'Esta idea menciona el sábado por la tarde, pero no está marcada «Apto para el sábado», así que se ofrecen otros días.';

(async () => {
  const P = await ready(page('after', 'en', { data: DATA })), Pes = await ready(page('after', 'es', { data: DATA }));
  addDraft(P); addDraft(Pes);
  const has = P.E('typeof caseNamedTime==="function"');

  console.log('\n-- 1. step 2: the filter never shows the chosen idea as a match --');
  P.E(`uChurch().selected=[${JSON.stringify(DID)}]; uPersist(); openTool('case'); render(); caseMount(true); caseChooseGroup('board'); caseChoose(${JSON.stringify(DID)}); CASE_ST.pick=true; caseDraw2();`);
  await until(() => P.q('#cs-cad .cad-seg') && P.q('#cs-plan .lib-card')); await sleep(60);
  const gridIds = () => P.qa('#cs-plan .lib-grid:not([data-cs-nowcard]) .lib-card').map(e => e.dataset.libId);
  c('his state: the board, the draft chosen ("Keep this one" at the top right), in "From your plan"', [P.J('casePrefs().group'), P.J('casePrefs().ministry'), P.txt('#cs-s2 [data-cs-keep]'), gridIds()],
    ['board', DID, 'Keep this one', [DID]]);
  c('its card says Ongoing first: the kind chip leads the facts', P.txt(`#cs-plan [data-lib-id="${DID}"] .lib-facts li`), 'Ongoing');
  tap(P, '#cs-cad [data-cad="event"]'); await sleep(80);
  c('"One-day events": the ongoing draft is NOT in the filtered grid (it was: "the idea already chosen is never hidden")', gridIds(), []);
  c('…one short line above it says what he has chosen and how it runs, with "Show it"', norm(P.txt('#cs-plan [data-cs-now]')),
    'Your choice now: Saturday afternoon board games · Ongoing (a 6-week trial) · Show it');
  c('…the line sits above the grid, before the note of an empty filter', (() => { const l = P.q('#cs-plan [data-cs-now]'); return !!l && !l.closest('.lib-grid'); })(), true);
  c('…its kind chip is coloured (lib-cad now)', (() => { const e = P.q('#cs-plan [data-cs-now] .lib-cad'); return e ? [e.classList.contains('now'), e.dataset.cad, e.textContent] : null; })(), [true, 'ongoing', 'Ongoing']);
  tap(P, '#cs-plan [data-cs-nowshow]'); await sleep(40);
  c('"Show it" shows the card under the line, outside the grid, its chip first and coloured; the button says "Hide it"', (() => {
    const card = P.q(`#cs-plan [data-cs-nowcard] [data-lib-id="${DID}"]`), li = card && card.querySelector('.lib-facts li');
    return [!!card, !!(card && card.closest('.lib-grid:not([data-cs-nowcard])')), li ? [li.textContent, li.classList.contains('now')] : null, gridIds(), norm(P.txt('#cs-plan [data-cs-nowshow]'))]; })(),
    [true, false, ['Ongoing', true], [], 'Hide it']);
  tap(P, '#cs-plan [data-cs-nowshow]'); await sleep(40);
  c('…and "Hide it" folds it again', [!!P.q(`#cs-plan [data-cs-nowcard] [data-lib-id="${DID}"]`), norm(P.txt('#cs-plan [data-cs-nowshow]'))], [false, 'Show it']);
  tap(P, '#cs-cad [data-cad="ongoing"]'); await sleep(80);
  c('"Ongoing": the draft matches, so it is in the grid and there is no line; its chip coloured', [gridIds(), !!P.q('#cs-plan [data-cs-now]'),
    (e => e ? e.classList.contains('now') : null)(P.q(`#cs-plan [data-lib-id="${DID}"] .lib-facts li.lib-cad`))], [[DID], false, true]);
  tap(P, '#cs-cad [data-cad=""]'); await sleep(80);
  c('"All": in the grid, no line', [gridIds(), !!P.q('#cs-plan [data-cs-now]')], [[DID], false]);
  tap(P, '#cs-s2 [data-cs-keep]'); await sleep(40);
  c('the chosen view (Keep this one): the card\'s first chip is its kind, coloured', (e => e ? [e.textContent, e.classList.contains('lib-cad'), e.classList.contains('now')] : null)(P.q('#cs-s2 .cs-chosen .lib-facts li')), ['Ongoing', true, true]);
  // a plan with two one-day events: the filter keeps them and leaves the draft out; picking one replaces the draft as usual
  P.E(`uChurch().selected=['health-expo','backpack-giveaway',${JSON.stringify(DID)}]; uPersist(); CASE_ST.pick=true; caseDraw2();`); await until(() => P.q('#cs-cad .cad-seg')); await sleep(60);
  tap(P, '#cs-cad [data-cad="event"]'); await sleep(80);
  c('a plan with two one-day events: those two in the grid, the draft only in the line', [gridIds().sort(), !!P.q('#cs-plan [data-cs-now]')], [['backpack-giveaway', 'health-expo'], true]);
  tap(P, '#cs-plan [data-lib-case="health-expo"]'); await sleep(80);
  c('choosing the health fair (a one-day event) replaces the draft as usual', [P.J('casePrefs().ministry'), P.J('caseCadenceOf(caseItemOf(casePrefs().ministry)).c')], ['health-expo', 'event']);
  P.E(`CASE_ST.pick=true; caseDraw2();`); await sleep(60); P.E(`caseCadSet('event')`); await sleep(60);
  c('…then it matches: in the grid, no line', [gridIds().includes('health-expo'), !!P.q('#cs-plan [data-cs-now]')], [true, false]);
  P.E(`caseCadSet(''); caseChoose(${JSON.stringify(DID)}); uChurch().selected=[${JSON.stringify(DID)}]; uPersist(); CASE_ST.pick=true; caseDraw2(); caseCadSet('event');`); await sleep(80);
  c('Spanish words for the line (Pes)', (() => { Pes.E(`uChurch().selected=[${JSON.stringify(DID)}]; uPersist(); openTool('case'); render(); caseMount(true); caseChooseGroup('board'); caseChoose(${JSON.stringify(DID)}); CASE_ST.pick=true; caseDraw2(); caseCadSet('event');`);
    return norm(Pes.txt('#cs-plan [data-cs-now]')); })(), 'Su elección ahora: Saturday afternoon board games · Continuo (una prueba de 6 semanas) · Mostrarla');
  c('a series chosen under "One-day events": its own label, no trial words', P.E(`(()=>{ caseChoose('cooking-school'); CASE_ST.pick=true; caseDraw2(); caseCadSet('event'); const t=(document.querySelector('#cs-plan [data-cs-now]')||{}).textContent||''; caseChoose(${JSON.stringify(DID)}); CASE_ST.pick=true; caseDraw2(); return t.replace(/\\s+/g,' ').trim(); })()`),
    'Your choice now: Plant-based cooking school · Series · 6 sessions · Show it');
  /* (verifier, 2 Oct 2026) a ministry team and the whole church choose the length together with "Suggest options" (their documents say
     "a trial of the length we choose together"), so the line names no length there; with "I already know the dates" it does */
  c('a team or the whole church with "Suggest options": the line names no length (their documents: "the length we choose together"); with fixed dates it does',
    P.E(`(()=>{ const t=()=>((document.querySelector('#cs-plan [data-cs-now]')||{}).textContent||'').replace(/\\s+/g,' ').trim(); const out=[];
      for(const g of ['family','congregation']){ caseChooseGroup(g); caseChoose(${JSON.stringify(DID)}); CASE_ST.pick=true; caseDraw2(); caseCadSet('event'); out.push(t()); }
      caseTimingSet(casePrefs(),'fixed'); CASE_ST.pick=true; caseDraw2(); caseCadSet('event'); out.push(t()); caseTimingSet(casePrefs(),'options');
      caseChooseGroup('board'); caseChoose(${JSON.stringify(DID)}); CASE_ST.pick=true; caseDraw2(); caseCadSet('event'); out.push(t()); return out; })()`),
    ['Your choice now: Saturday afternoon board games · Ongoing · Show it', 'Your choice now: Saturday afternoon board games · Ongoing · Show it',
      'Your choice now: Saturday afternoon board games · Ongoing (a 6-week trial) · Show it', 'Your choice now: Saturday afternoon board games · Ongoing (a 6-week trial) · Show it']);
  P.E(`caseCadSet('')`);

  console.log('\n-- 1b. the survey\'s own filter has no such exception --');
  c('the survey\'s list: the ongoing draft shows under All and Ongoing, never under "One-day events" (it never kept one)', P.J(`(()=>{ const was=[U_CAD,U_FILTER]; try{ const x=caseItemOf(${JSON.stringify(DID)}); U_FILTER=uCheck(x).ok?'fit':'needs';
      const show=cad=>{ U_CAD=cad; const d=document.createElement('div'); d.innerHTML=uCardsHTML([x]); return d.textContent.includes('Saturday afternoon board games'); }; return [show(''),show('ongoing'),show('event')]; }finally{ U_CAD=was[0]; U_FILTER=was[1]; } })()`), [true, true, false]);
  c('…and the Idea Library\'s filter (libFilter) keeps none that do not match', P.J(`libFilter([{sig:true,x:caseItemOf(${JSON.stringify(DID)}),r:{}},{sig:true,x:SIGNATURE.find(z=>z.id==='health-expo'),r:{}}],{...LIB_UI_BLANK().f,cad:'event'}).map(o=>o.x.id)`), ['health-expo']);

  console.log('\n-- 2. the idea\'s own day and time (caseNamedTime) --');
  const NT = (o) => has ? P.J(`(n=>n&&n.slot)(caseNamedTime(${JSON.stringify(o)}))`) : 'no caseNamedTime';
  c('his draft: "Saturday afternoon" in its name → Saturday afternoon', NT({ id: 'x', n: 'Saturday afternoon board games', d: 'After Sabbath lunch, one member opens a classroom.' }), 'Sat afternoon');
  c('"After Sabbath lunch" alone (its description) → Saturday afternoon', NT({ id: 'x', n: 'Board games for families', d: 'After Sabbath lunch, one member opens a classroom with board games.' }), 'Sat afternoon');
  c('EN: Sabbath afternoons · Sabbath lunch · Sunday morning · Tuesday evenings · Friday-night supper · Saturday-night (after sunset) · Thursday afternoon',
    ['Nature walks on Sabbath afternoons', 'Sabbath lunch for students', 'Sunday-morning run club', 'Tuesday evenings with the Psalms', 'A Friday-night supper', 'Saturday-night teen game night', 'Thursday afternoon knitting'].map(n => NT({ id: 'x', n, d: '' })),
    ['Sat afternoon', 'Sat afternoon', 'Sun daytime', 'Tue evening', 'Fri evening', 'Sat evening', 'Thu daytime']);
  c('ES: sábado por la tarde · después del almuerzo del sábado · domingo por la mañana · martes por la noche · la cena del viernes · las tardes del domingo',
    ['Juegos de mesa el sábado por la tarde', 'Después del almuerzo del sábado, un miembro abre un aula', 'Club de corredores el domingo por la mañana', 'Los martes por la noche, en casa', 'Una invitación a la cena del viernes', 'Paseos en las tardes del domingo'].map(t => NT({ id: 'x', n: 'Idea', d: '', nEs: t, dEs: '' })),
    ['Sat afternoon', 'Sat afternoon', 'Sun daytime', 'Tue evening', 'Fri evening', 'Sun daytime']);
  c('none: no day named, a day with no time, Sabbath morning (worship, no time to offer), a negated mention',
    [{ n: 'Food pantry', d: 'Open every week for neighbours.' }, { n: 'Help on Saturday', d: 'When an election falls on a Saturday.' }, { n: 'A Sabbath morning welcome', d: '' }, { n: 'Plan worship ahead', d: 'Musicians get weeks to prepare, not a Friday-night message.' }].map(o => NT({ id: 'x', ...o })),
    [null, null, null, null]);
  c('the name wins over the description', NT({ id: 'x', n: 'Tuesday evening club', d: 'In summer it meets on Sunday afternoons.' }), 'Tue evening');
  // a description's mention counts only as the idea's own schedule (measured on the 3,050 library ideas; these are their words)
  c('a description: its own schedule counts ("Once a month on a Monday night", "On a winter Saturday night", "Every Wednesday evening", "on Thursday mornings", "six Tuesday evenings")',
    ['Once a month on a Monday night, when many kitchens close early, the church pays for breakfast.', 'Members share. On a winter Saturday night, anyone can share three minutes.', 'Every Wednesday evening, teens 13 to 17 meet.', 'Two men drop a tailgate on Thursday mornings at 6:15.', 'The church hires a chaplain for six Tuesday evenings: listening, praying.'].map(d => NT({ id: 'x', n: 'Idea', d })),
    ['Mon evening', 'Sat evening', 'Wed evening', 'Thu daytime', 'Tue evening']);
  c('…a passing mention does not ("prepare alone on Friday night", "Afterward, a Sabbath lunch…", "two evenings a week and Sunday afternoons", "the first time on Friday night")',
    ["Children's teachers often prepare alone on Friday night. Once a month, teachers meet on a weeknight, and Friday evenings are free for the Sabbath.", 'Two members go as guardians. Afterward, a Sabbath lunch lets the veterans share the day.', 'Wifi, power, quiet, tea, two evenings a week and Sunday afternoons.', 'Volunteer teachers often open the lesson for the first time on Friday night.'].map(d => NT({ id: 'x', n: 'Idea', d })),
    [null, null, null, null]);
  c('…the English decides when it mentions a time (the Spanish is its translation: "Sabbath-afternoon activity ideas" / "las tardes de sábado")',
    NT({ id: 'x', n: 'Idea', d: 'A member builds boards of recipes, devotions and Sabbath-afternoon activity ideas.', dEs: 'Un miembro arma tableros con recetas, devocionales e ideas de actividades para las tardes de sábado.' }), null);

  console.log('\n-- 3. his case: the board, "Suggest options" (EN) --');
  const R = await build(P, DID, 'board', { pdf: true });
  c('the times stay those the church may use for it: Tuesday, Wednesday, Thursday evening', R.m.timing.options.map(o => o.slot), ['Tue evening', 'Wed evening', 'Thu evening']);
  c('the model says why: the idea names Saturday afternoon and is not marked "Fits the Sabbath"', R.m.timing.named ? [R.m.timing.named.slot, R.m.timing.named.state, R.m.timing.named.avail] : null, ['Sat afternoon', 'sab', true]);
  c('the Proposal\'s WHEN says it plainly (it was silent)', R.Pz.plan.find(p => p.k === 'when').lines.includes(NOTE_EN), true);
  c('…drawn in the Proposal PDF', joined(R.pl).includes(NOTE_EN), true);
  c('the handout\'s Timing options say it, in the PDF', [R.H.timing && R.H.timing.note, joined(R.hl).includes(NOTE_EN)], [NOTE_EN, true]);
  const dz = slide(R, 'decide');
  c('the "Let\'s decide together" slide says it in one row', (dz && dz.rows.find(r => r[0] === 'The idea says')) || null, ['The idea says', 'Saturday afternoon (not marked “Fits the Sabbath”)']);
  c('the trial words are unchanged (an ongoing idea: a 6-week trial, as his PDF said)', [R.Pz.memo.find(r => r[0] === 'Subject')[1].startsWith('Saturday afternoon board games: a trial of 6 weeks'), R.m.vals.weeks, ((R.d.slides.find(s => s.type === 'motion') || {}).headline || '')], [true, '6 weeks', 'Approve a trial of 6 weeks: Saturday afternoon board games']);
  const Res = await build(Pes, DID, 'board', { pdf: true });
  c('ES: the Proposal, the handout and the slide say it in Spanish', [Res.Pz.plan.find(p => p.k === 'when').lines.includes(NOTE_ES), joined(Res.hl).includes(NOTE_ES), (slide(Res, 'decide').rows.find(r => r[0] === 'La idea dice') || [])[1]],
    [true, true, 'Sábado por la tarde (no «Apto para el sábado»)']);
  const Rf = await build(P, DID, 'board', { timing: 'fixed', pdf: true });
  c('"I already know the dates": Tuesday evening, and the same plain words, said for a fixed day', [/Tuesday evening/.test(R2s(Rf)), joined(Rf.pl).includes('This idea names Saturday afternoon, but it is not marked “Fits the Sabbath”, so it is set on another day.')], [true, true]);

  console.log('\n-- 4. step 3: he may choose Saturday afternoon himself --');
  P.E(`caseChoose(${JSON.stringify(DID)}); caseChooseGroup('board');`); await until(() => P.E('!!(CASE_ST.model&&CASE_ST.model.ok)')); await sleep(40);
  c('step 3 says it, with one button', [norm(P.txt('#cs-s3 [data-cs-named]')), !!P.q('#cs-s3 [data-cs-named-pick]')],
    ['This idea names Saturday afternoon, but it is not marked “Fits the Sabbath”, so other days are offered. Choose Saturday afternoon anyway', true]);
  tap(P, '#cs-s3 [data-cs-named-pick]'); await sleep(60);
  c('one tap records his choice as the idea\'s time (Adjust → Time slot) for this church', P.J(`uChurch().overrides[${JSON.stringify(DID)}]||null`), { slot: 'Sat afternoon' });
  c('…step 3 then says it is his choice, with Undo', [norm(P.txt('#cs-s3 [data-cs-named]')), !!P.q('#cs-s3 [data-cs-named-undo]')], ['Saturday afternoon: your choice for ' + P.E('churchNameInSentence()') + '. Undo', true]);
  const R2 = await build(P, DID, 'board', { pdf: true });
  c('…the times offered start with Saturday afternoon', R2.m.timing.options.map(o => o.slot), ['Sat afternoon', 'Tue evening', 'Wed evening']);
  c('…the Proposal\'s WHEN, the handout\'s first box and the slide\'s Option 1 agree; no note left', [R2.Pz.plan.find(p => p.k === 'when').lines[0].startsWith('One of: Saturday afternoon'), R2.H.timing.boxes[0].title, slide(R2, 'decide').rows[0][1].startsWith('Saturday afternoon'),
    joined(R2.pl).includes('not marked “Fits the Sabbath”'), !!(R2.H.timing.note), !!slide(R2, 'decide').rows.find(r => r[0] === 'The idea says')], [true, 'Saturday afternoon', true, false, false, false]);
  const R2f = await build(P, DID, 'board', { timing: 'fixed', pdf: true });
  c('…"I already know the dates" sets it on Saturday afternoon', [/Saturday afternoon/.test(R2s(R2f)), /Tuesday evening/.test(R2s(R2f))], [true, false]);
  tap(P, '#cs-s3 [data-cs-named-undo]'); await sleep(60);
  c('Undo takes his choice back (nothing else of Adjust was set)', [P.J(`uChurch().overrides[${JSON.stringify(DID)}]||null`), !!P.q('#cs-s3 [data-cs-named-pick]')], [null, true]);
  P.E(`uChurch().overrides[${JSON.stringify(DID)}]={weeks:8,slot:'Sat afternoon'}; uPersist(); caseDraw3();`); await sleep(40);
  tap(P, '#cs-s3 [data-cs-named-undo]'); await sleep(60);
  c('…and keeps what else he set under Adjust', P.J(`uChurch().overrides[${JSON.stringify(DID)}]||null`), { weeks: 8 });
  P.E(`delete uChurch().overrides[${JSON.stringify(DID)}]; uPersist();`);

  console.log('\n-- 5. library ideas that name their own time --');
  const opt = async (Q, id, g) => (await build(Q, id, g || 'board')).m.timing;
  let t = await opt(P, 'health-sabbath-nature-walk');
  c('"Sabbath afternoon nature walk" (fits the Sabbath): Saturday afternoon first (it was not offered at all)', [t.options[0] && t.options[0].slot, t.named && t.named.state], ['Sat afternoon', 'first']);
  t = await opt(P, 'education-teen-coding-club');
  c('"Every Wednesday evening, teens…": Wednesday evening first (it was Tuesday)', [t.options[0] && t.options[0].slot, t.named && t.named.state], ['Wed evening', 'first']);
  t = await opt(P, 'workplaces-restaurant-late-breakfast');
  const NOTE_P = 'This idea names Monday evening, but the church profile has no room or team free then, so these times are on other days.';
  const Rp = await build(P, 'workplaces-restaurant-late-breakfast', 'board', { pdf: true });
  c('"Once a month on a Monday night": the church has no Monday evening, and the Proposal says so', [t.named && t.named.state, Rp.Pz.plan.find(p => p.k === 'when').lines.includes(NOTE_P)], ['profile', true]);
  const Rt = await build(P, 'workplaces-restaurant-late-breakfast', 'personal', { pdf: true });
  c('a team\'s Proposal stays one page with the sentence (it went to two before the extra levels; measured on 34 teams)', [Rt.Pz.namedNote, Rt.pp], [NOTE_P, 1]);
  /* (verifier, 2 Oct 2026) the whole church's Proposal lists the times too ("One of: Tuesday evening, Wednesday evening or Thursday
     evening … chosen together"), and step 3 already says the sentence for it, so its Proposal says it as well ("said where the
     options are"); its slides only announce the day (no decide slide: no row) and its handout has no timing section */
  const Rc = await build(P, DID, 'congregation', { pdf: true });
  c('the whole church: the Proposal that lists the times says it, as step 3 does; the slides and the handout carry nothing; one page',
    [Rc.Pz.plan.find(p => p.k === 'when').lines[0].startsWith('One of: Tuesday evening'), Rc.Pz.plan.find(p => p.k === 'when').lines.includes(NOTE_EN), joined(Rc.pl).includes(NOTE_EN),
      JSON.stringify(Rc.d).includes('The idea says'), JSON.stringify(Rc.H).includes('This idea names'), Rc.pp], [true, true, true, false, false, 1]);
  const Rces = await build(Pes, DID, 'congregation', { pdf: true });
  c('…in Spanish too', [Rces.Pz.plan.find(p => p.k === 'when').lines.includes(NOTE_ES), joined(Rces.pl).includes(NOTE_ES), JSON.stringify(Rces.d).includes('La idea dice'), Rces.pp], [true, true, false, 1]);
  const Rcj = await build(P, 'music-arts-park-bluegrass-jam', 'congregation');
  c('…and a library idea the church profile has no time for (the bluegrass jam: "On summer Sunday afternoons")', [Rcj.m.timing.named && Rcj.m.timing.named.state,
    Rcj.Pz.plan.find(p => p.k === 'when').lines.includes('This idea names Sunday daytime, but the church profile has no room or team free then, so these times are on other days.')], ['profile', true]);
  t = await opt(P, 'food-pantry');
  c('an idea naming no time: nothing named, the times as before', [t.named, t.options.map(o => o.slot)], [null, ['Tue evening', 'Wed evening', 'Thu evening']]);

  c('no page errors', [P.errs.slice(0, 3), Pes.errs.slice(0, 3)], [[], []]);
  H.done();
})().catch(e => { console.log('  FAIL  crashed: ' + (e && e.stack || e)); H.T.fail++; H.done(); });
/* the words a fixed-dates build says about its day: the motion rows, the Proposal's WHEN, the deck's text */
function R2s(R) { return JSON.stringify([R.m && R.m.motion && R.m.motion.rows, R.Pz && R.Pz.plan, R.d && R.d.slides.filter(s => s.type === 'motion' || s.type === 'timeline' || s.part === 'decide')]); }
