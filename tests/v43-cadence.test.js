/* v10.43.0 — three kinds of ministry, everywhere (DESIGN.md C1.2 – C1.5, FOLLOWUP.md §1; §8.1 T-C1 – T-C6).
 * The pastor (30 Sep 2026): "For 'ministries our church could offer', we should separate the things that are weekly or monthly —
 * ongoing ministry — and events, which are one-time, one day." He approved the three-way split: ongoing · a series · a one-day event.
 *  T-C1 caseCadenceOf: his "Runs as" › his Planner series › the library's data › the built-ins › the guess; every built-in its kind;
 *       every index row a cadence; a series whose idea states no count (cad 100) reads {series, n null, dated} and says "Series"
 *  T-C2 the label on every card: the library's, a built-in's, the survey's row, his Planner series; EN and ES
 *  T-C3 the survey's filter: four buttons, counts that add up to All, U_CAD filters the rows and the library below, resets
 *  T-C4 the library's filter (libFilter cad) in a theme's list and a search
 *  T-C5 step 2: #cs-cad filters "More ideas" (the tab counts follow) and "From your plan" (the chosen idea: v10.43 fix, the line)
 *  T-C6 "Runs as": per church + idea, read everywhere, "As the idea says" deletes it, Clear all clears it, the sample reads none
 */
const H = require('./v43-helpers.js');
const { c, sleep, until, page, ready, BUILTIN_EVENTS, BUILTIN_SERIES } = H;
(async () => {
  const P = await ready(page('after', 'en')), Pes = await ready(page('after', 'es'));
  const has = P.E('typeof caseCadenceOf==="function"');
  c('the page has caseCadenceOf (v10.43)', has, true);
  if (!has) return H.done();

  console.log('\n-- T-C1 the one reader --');
  const kinds = P.J(`SIGNATURE.filter(x=>!x.generated).map(x=>[x.id,caseCadenceOf(x).c,caseCadenceOf(x).n,caseCadenceOf(x).row,caseCadenceOf(x).src])`);
  const want = id => BUILTIN_EVENTS.includes(id) ? 'event' : BUILTIN_SERIES[id] ? 'series' : 'ongoing';
  c('every built-in reads its kind from the built-ins table (not listed = ongoing)', kinds.filter(([id, k, , , s]) => k !== want(id) || s !== 'builtin').map(z => z[0]), []);
  c('the series\' sessions, from each one\'s own words (FOLLOWUP.md §1.2): VBS 5 in a row, four nights 4 in a row, the cooking school 6, stop smoking 8',
    ['vbs', 'four-nights', 'cooking-school', 'stop-smoking'].map(id => kinds.find(k => k[0] === id).slice(1, 4)), [['series', 5, true], ['series', 4, true], ['series', 6, false], ['series', 8, false]]);
  c('every index row has a cadence the reader can read (0, 1, a series)', P.E(`LIB.rows.filter(r=>!caseCadDecode(r.cad)).length`), 0);
  c('the library reads its data: an index row, the light idea built from it', P.J(`(()=>{ const r=LIB.rows.find(r=>r.cad===104)||LIB.rows.find(r=>r.cad>=103); return [caseCadenceOf(r).c,caseCadenceOf(r).row,caseCadenceOf(libLite(r)).src]; })()`), ['series', true, 'data']);
  c('cad 100 (a series whose idea states no count): {series, n null, dated} — "Series" / "Serie", never a number',
    [P.J(`(()=>{ const r=LIB.rows.find(r=>r.cad===100); const k=caseCadenceOf(r); return [k.c,k.n,k.dated,caseCadLabel(r)]; })()`), Pes.E(`caseCadLabel(LIB.rows.find(r=>r.cad===100))`)], [['series', null, true, 'Series'], 'Serie']);
  c('his "Runs as" comes first (own), {base:true} skips it', P.J(`(()=>{ uChurch().cadence={'food-pantry':{cad:1}}; const x=SIGNATURE.find(z=>z.id==='food-pantry'); const a=caseCadenceOf(x), b=caseCadenceOf(x,{base:true}); delete uChurch().cadence; return [a.c,a.src,b.c,b.src]; })()`), ['event', 'own', 'ongoing', 'builtin']);
  c('his Planner series: a series of its nights, in a row at three or more a week, "Series · 12 nights"',
    P.J(`(()=>{ const x={id:CASE_PLAN_ID,plan:true,planRaw:{nights:12,perweek:4}}; const k=caseCadenceOf(x); return [k.c,k.n,k.row,k.src,caseCadLabel(x)]; })()`), ['series', 12, true, 'plan', 'Series · 12 nights']);
  c('the guess, last (a draft): a fair is a one-day event, "a six-week cooking course" six sessions, a club ongoing',
    P.J(`[{id:'draft-1',generated:true,n:'Fall health fair',d:''},{id:'draft-2',generated:true,n:'Six-week cooking course',d:''},{id:'draft-3',generated:true,n:'Monday knitting club',d:''}].map(x=>{ const k=caseCadenceOf(x); return [k.c,k.n,k.src]; })`),
    [['event', null, 'guess'], ['series', 6, 'guess'], ['ongoing', null, 'guess']]);

  console.log('\n-- T-C2 the label on every card --');
  await P.E(`libLoadTheme('health')`); await Pes.E(`libLoadTheme('health')`);
  const libId = P.E(`LIB.rows.find(r=>r.theme==='health'&&r.cad===6).id`);
  const card = (Q, id) => Q.E(`(()=>{ const raw=libFull(${JSON.stringify(id)}), x=libToCatalog(raw), d=document.createElement('div'); d.innerHTML=libCardHTML('survey',raw,x,libEnv(),null); const li=d.querySelector('.lib-facts li'); return li?li.outerHTML:''; })()`);
  c('a library card: the first fact is how it runs ("Series · 6 sessions")', card(P, libId), '<li class="lib-cad" data-cad="series">Series · 6 sessions</li>');
  c('…in Spanish "Serie · 6 sesiones"', card(Pes, libId), '<li class="lib-cad" data-cad="series">Serie · 6 sesiones</li>');
  const sig = (Q, id) => Q.E(`(()=>{ const d=document.createElement('div'); d.innerHTML=libSigCardHTML('case',SIGNATURE.find(z=>z.id===${JSON.stringify(id)}),libEnv()); return d.querySelector('.lib-facts li').textContent; })()`);
  c('a built-in as a card: "One-day event" / "Evento de un día", "Series · 4 days in a row", "Ongoing" / "Continuo"',
    [sig(P, 'health-expo'), sig(Pes, 'health-expo'), sig(P, 'four-nights'), sig(Pes, 'four-nights'), sig(P, 'food-pantry'), sig(Pes, 'food-pantry')],
    ['One-day event', 'Evento de un día', 'Series · 4 days in a row', 'Serie · 4 días seguidos', 'Ongoing', 'Continuo']);
  const row = (Q, id) => Q.E(`(()=>{ const d=document.createElement('div'); d.innerHTML=uRow(uCatalog().find(z=>z.id===${JSON.stringify(id)})); return d.querySelector('.u-rowmeta').textContent.replace(/\\s+/g,' ').trim(); })()`);
  c('a survey row begins with it: "One-day event · 12 vol · …"', /^One-day event · \d+ vol · /.test(row(P, 'health-expo')), true);
  c('…in Spanish the label is Spanish ("Evento de un día · …")', /^Evento de un día · /.test(row(Pes, 'health-expo')), true);
  c('his Planner series\' card says "Series · {n} nights"', P.E(`(()=>{ const x={id:CASE_PLAN_ID,plan:true,planRaw:{nights:12,perweek:4,date:'2027-03-06'}}; return casePlanCardHTML({item:x,date:new Date('2027-03-06T12:00:00'),nights:12,kind:'both',ministry:CASE_PLAN_ID}).includes('<li class="lib-cad" data-cad="series">Series · 12 nights</li>'); })()`), true);

  console.log('\n-- T-C3 the survey\'s filter --');
  // v10.45.0 (stale, retired): the survey's filter (#u-cadseg) and its rows (#u-cards) went with the ministries list (DESIGN-SURVEY §1.1); the
  // filter stays in Make the Case and the Idea Library (T-C4, T-C5 below). U_CAD's resets are still checked here.
  P.E(`openTool('survey'); render();`);
  c('the survey has no ministries list, so no filter of its own (the needs carry the ideas)', [!!P.q('#u-cadseg'), !!P.q('#u-cards'), !!P.q('#u-needs')], [false, false, true]);
  P.E(`U_BAND='';`); P.q('[data-u-reset]') ? P.q('[data-u-reset]').click() : P.E(`U_FILTER='auto';U_QUERY='';U_BAND='';U_CAD='';U_SHOW=6;uRefresh();`);
  c('it resets where the level does ("Show available ideas")', P.E('U_CAD'), '');
  P.E(`U_CAD='series'; capClearAll();`); c('…on Clear all', P.E('U_CAD'), '');
  // (a church switch sets every survey filter back where it sets the level: the same line of index.html)
  c('…and on a church switch (reset with the level)', /U_COMPARE=\[\];U_BAND='';U_CAD='';/.test(H.html), true);

  console.log('\n-- T-C4 the library\'s filter --');
  const lf = (cad) => P.J(`(()=>{ const rows=LIB.rows.filter(r=>r.theme==='hunger'); return libFilter(rows.map(r=>({r})),{...LIB_UI_BLANK().f,cad:${JSON.stringify(cad)}}).map(o=>o.r.cad); })()`);
  c('a theme\'s list: "A series" keeps only series, "Ongoing" only ongoing', [lf('series').every(v => v >= 2), lf('ongoing').every(v => v === 0), lf('').length === lf('ongoing').length + lf('series').length + lf('event').length], [true, true, true]);
  const sr = P.J(`(()=>{ const S=libSearch('food'); return [S.rows.length, libFilter(S.rows.map(r=>({r})),{...LIB_UI_BLANK().f,cad:'event'}).every(o=>o.r.cad===1)]; })()`);
  c('a search ("food"): the events among its results', [sr[0] > 0, sr[1]], [true, true]);
  c('a built-in in a list ({sig, x}) by its own cadence', P.J(`libFilter([{sig:true,x:SIGNATURE.find(z=>z.id==='vbs'),r:{}},{sig:true,x:SIGNATURE.find(z=>z.id==='food-pantry'),r:{}}],{...LIB_UI_BLANK().f,cad:'series'}).map(o=>o.x.id)`), ['vbs']);

  console.log('\n-- T-C5 step 2 --');
  P.E(`uChurch().selected=['health-expo','food-pantry','cooking-school']; uPersist(); openTool('case'); caseMount(true); caseChooseGroup('board');`);   // the board takes the whole plan
  await until(() => P.q('#cs-cad .cad-seg') && P.q('#cs-plan .lib-card') && P.q('#cs-lib .lib-card')); await sleep(60);
  c('a filter between the step head and "From your plan", no counts', [!!P.q('#cs-cad'), P.q('#cs-cad').nextElementSibling && P.q('#cs-cad').nextElementSibling.id, P.qa('#cs-cad .cad-n').length], [true, 'cs-plan', 0]);
  const planIds = () => P.qa('#cs-plan .lib-card').map(e => e.dataset.libId);
  const before = planIds();
  P.q('#cs-cad [data-cad="event"]').click(); await until(() => P.qa('#cs-plan .lib-card').length <= before.length); await sleep(60);
  c('"One-day events": "From your plan" keeps the health expo only', planIds(), ['health-expo']);
  const tabN = () => P.qa('#cs-lib [data-lib-tab] .cs-tabn').map(e => +e.textContent.replace(/\D/g, ''));
  const libIds = () => P.qa('#cs-lib .lib-sec:not([hidden]) .lib-card').map(e => e.dataset.libId);
  c('…"More ideas" shows events only, and the tab counts follow', [libIds().length > 0, libIds().every(id => P.E(`caseCadenceOf(LIB.byId.get(${JSON.stringify(id)})||SIGNATURE.find(z=>z.id===${JSON.stringify(id)})).c`) === 'event')], [true, true]);
  const nEv = tabN(); P.q('#cs-cad [data-cad=""]').click(); await sleep(80); const nAll = tabN();
  c('…(fewer than All)', nEv.every((v, i) => v <= nAll[i]) && nEv.some((v, i) => v < nAll[i]), true);
  P.E(`caseChoose('food-pantry')`); await sleep(30); P.E(`CASE_ST.pick=true; caseDraw2();`); await until(() => P.q('#cs-cad')); await sleep(60);
  P.q('#cs-cad [data-cad="event"]').click(); await sleep(80);
  /* v10.43 fix (2 Oct 2026): the pastor changed this. He set "One-day events", the one card left was his chosen ongoing idea, and he
     took it: "Do you notice that in the PDF it says six week trial but I chose a one day event so there's a detach somewhere." The
     chosen idea that runs another way is no longer in the filtered grid; one line above it says what it is (v43-detach holds it). */
  c('the chosen idea (the food pantry, ongoing) is not in the "One-day events" grid; the line above it names it', [planIds().includes('food-pantry'), !!P.q('#cs-plan [data-cs-now]')], [false, true]);
  P.q('#cs-cad [data-cad="series"]').click(); await sleep(80);
  c('"A series" keeps the cooking school only (the chosen food pantry is in the line, not the grid)', [planIds().sort(), !!P.q('#cs-plan [data-cs-now]')], [['cooking-school'], true]);
  P.E(`uChurch().selected=['food-pantry']; caseChoose('food-pantry'); CASE_ST.pick=true; caseDraw2();`); await sleep(60);
  P.E(`LIB_UI.case.f.cad='event'; casePlanDraw();`); await sleep(30);
  c('with only the chosen idea in the plan: no card, the line, and "Nothing in your plan runs this way."', [planIds(), !!P.q('#cs-plan [data-cs-now]'), P.txt('#cs-plan .cs-parth .note')], [[], true, 'Nothing in your plan runs this way.']);
  P.E(`uChurch().selected=['food-pantry','walking-club']; casePrefs().ministry&&caseSetPrefs({ministry:null}); CASE_ST.pick=true; caseDraw2(); LIB_UI.case.f.cad='event'; casePlanDraw();`); await sleep(60);
  c('nothing in the plan runs this way: the line says so, with All beside it', [P.txt('#cs-plan .note'), !!P.q('#cs-plan [data-cs-cadall]')], ['Nothing in your plan runs this way.', true]);
  P.q('#cs-plan [data-cs-cadall]').click(); await sleep(60);
  c('…All brings them back', [P.E('LIB_UI.case.f.cad'), planIds().length], ['', 2]);
  P.E(`LIB_UI.case.f.cad=''`);

  console.log('\n-- T-C6 "Runs as" --');
  P.E(`caseChoose('food-pantry'); caseChooseGroup('board');`); await until(() => P.E('!!(CASE_ST.model&&CASE_ST.model.ok)')); await sleep(30);
  P.E(`caseRunsSet('food-pantry',{c:'event'})`);
  c('saved per church + idea (uChurch().cadence) as an integer, only when it differs', P.J(`uChurch().cadence`), { 'food-pantry': { cad: 1 } });
  c('read everywhere: the label, the survey row, the timing (the decide slide asks for a date)', P.J(`(()=>{ const x=SIGNATURE.find(z=>z.id==='food-pantry'); const m=caseModel('food-pantry',{type:'board',group:'board'},{timing:'options'}); return [caseCadLabel(x),m.timing.head,!!m.followup]; })()`),
    ['One-day event', 'Choose the date together', true]);
  P.E(`caseRunsSet('food-pantry',{c:'ongoing'})`);
  c('the idea\'s own cadence again: nothing stored', P.J(`uChurch().cadence`), {});
  P.E(`caseRunsSet('cooking-school',{c:'series',n:8,row:false})`);
  c('a series of 8 sessions for the cooking school (6 in its words)', P.J(`(()=>{ const k=caseCadenceOf(SIGNATURE.find(z=>z.id==='cooking-school')); return [k.n,k.src,uChurch().cadence['cooking-school'].cad]; })()`), [8, 'own', 8]);
  P.E(`caseRunsSet('cooking-school',null)`);
  c('"As the idea says" deletes it', P.J(`uChurch().cadence`), {});
  P.E(`caseRunsSet('cooking-school',{c:'event'}); capClearAll();`);
  c('Clear all clears it', P.J(`uChurch().cadence===undefined||Object.keys(uChurch().cadence).length===0`), true);
  P.E(`uChurch().cadence={'health-expo':{cad:0}}`);
  c('the sample (the made-up church) reads none: the health expo is still a one-day event there', P.J(`(()=>{ const m=caseModel('health-expo',{type:'board',group:'board'},{timing:'options',ctx:caseSampleCtx(),sample:true}); return m.ok?m.timing.head:m.error; })()`), 'Choose the date together');
  P.E(`delete uChurch().cadence`);
  // the panel: three choices, the note "For {church} only", "As the idea says" once he changed it
  P.E(`caseChoose('health-expo'); caseChooseGroup('board');`); await until(() => P.E('!!(CASE_ST.model&&CASE_ST.model.ok)')); await sleep(40);
  P.E(`(()=>{ const el=document.createElement('div'); el.id='zz-edit'; document.body.append(el); el.innerHTML=caseRunsHTML(); caseRunsWire(el); })()`);
  c('the edit panel: Runs as: Ongoing | A series | One day, "One day" pressed, the note, no reset yet',
    [P.qa('#zz-edit [data-cs-runs]').map(b => [b.textContent, b.getAttribute('aria-pressed')]), /For .* only\. The slides follow it\./.test(P.txt('#zz-edit .note')), !!P.q('#zz-edit [data-cs-runsreset]')],
    [[['Ongoing', 'false'], ['A series', 'false'], ['One day', 'true']], true, false]);
  P.q('#zz-edit [data-cs-runs="series"]').click(); await sleep(30);
  c('a tap on "A series" saves a series whose count is not stated (cad 100: "Series")', [P.J(`uChurch().cadence`), P.E(`caseCadLabel(SIGNATURE.find(z=>z.id==='health-expo'))`)], [{ 'health-expo': { cad: 100 } }, 'Series']);
  P.E(`document.getElementById('zz-edit').innerHTML=caseRunsHTML(); caseRunsWire(document.getElementById('zz-edit'));`);
  c('…then Sessions [ ] (blank: as the idea says), "On days in a row", and "As the idea says"', [!!P.q('#zz-edit [data-cs-runsn]'), P.q('#zz-edit [data-cs-runsn]').value, !!P.q('#zz-edit [data-cs-runsrow]'), !!P.q('#zz-edit [data-cs-runsreset]')], [true, '', true, true]);
  P.E(`(()=>{ const n=document.querySelector('#zz-edit [data-cs-runsn]'); n.value='3'; n.dispatchEvent(new Event('change')); })()`); await sleep(30);
  c('Sessions 3: a series of three', P.J(`uChurch().cadence`), { 'health-expo': { cad: 3 } });
  P.E(`document.getElementById('zz-edit').innerHTML=caseRunsHTML(); caseRunsWire(document.getElementById('zz-edit')); document.querySelector('#zz-edit [data-cs-runsreset]').click();`); await sleep(30);
  c('"As the idea says" again: nothing stored', P.J(`uChurch().cadence`), {});
  c('Spanish: Se realiza como: Continuo | Una serie | Un día', Pes.J(`(()=>{ caseSetPrefs({ministry:'health-expo',type:'board',group:'board'}); const d=document.createElement('div'); d.innerHTML=caseRunsHTML(); return [...d.querySelectorAll('[data-cs-runs]')].map(b=>b.textContent).concat(d.querySelector('.cs-tlab').textContent); })()`),
    ['Continuo', 'Una serie', 'Un día', 'Se realiza como']);
  c('no page errors', [...P.errs, ...Pes.errs].filter(e => !/Not implemented/.test(e)).slice(0, 3), []);
  H.done();
})();
