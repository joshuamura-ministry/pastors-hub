// v10.52.0 — the pastor (6 Oct 2026): "making the case … it can be a light lift moderate lift heavy lift if you choose light lift then
// of course the investment with the money needed the people needed. It won't be that. If you do moderate lift it'll be middle and if
// you do heavy lift, it's gonna be a much more robust and more demanding thing, but the same outreach … if it comes from the community
// outreach section it already knows if it's a light lift heavy lift or moderate lift". Asked: pick an idea then its size (a), or the
// size first (b): "A". Design: Terrain-work/v67/DESIGN-LIFT.md. Written failing-first on v10.51.3.
const {sleep,until,checker,page,ready,survey,openNeed,openSheet}=require('./v45-helpers.js');
const T=checker(), c=T.c;

(async()=>{ await T.sec(async()=>{
  console.log('\n-- an idea\'s own size --');
  const P=page(); await ready(P); survey(P);
  c('every idea has its own size: the library\'s tier, a built-in\'s load (the survey\'s rule)', P.J(`['grief','food-pantry','meal-train'].map(id=>{ const x=uCatalog().find(z=>z.id===id); return [caseLiftOf(x),NS_LIFTS.indexOf(nsLift(nsView(id)))+1]; })`),
    [[2,2],[3,3],[2,2]]);
  const base=P.J(`uReq(uCatalog().find(z=>z.id==='grief'))`);
  c('with no size chosen, the needs are the idea\'s own (nothing saved)', [base.people,base.leaders,base.startup,base.monthly,base.weeks,P.J(`(uChurch().overrides||{}).grief||null`)], [2,1,300,100,6,null]);

  console.log('\n-- Make the Case: Size, at the top of the slides --');
  P.E(`openTool('case'); caseSetPrefs({ministry:'grief',group:'board',type:'board'}); caseMount();`); await sleep(60);
  const btns=()=>P.qa('#cs-size [data-cs-lift]');
  c('step 3 opens with Size: Light, Moderate, Heavy lift, its own on and marked', [!!P.q('#cs-s3 #cs-size'),btns().map(b=>b.querySelector('.cs-szn').textContent),btns().map(b=>b.getAttribute('aria-pressed')),btns().map(b=>b.classList.contains('own'))],
    [true,['Light lift','Moderate lift','Heavy lift'],['false','true','false'],[false,true,false]]);
  c('…before the goal box', P.q('#cs-size').nextElementSibling&&P.q('#cs-size').nextElementSibling.id, 'cs-goalw');
  c('…each with its own numbers: volunteers · to start', btns().map(b=>b.querySelector('.cs-szv').textContent), ['1 volunteer · $120 to start','2 volunteers · $300 to start','4 volunteers · $750 to start']);
  c('…and its bars', btns().map(b=>b.querySelectorAll('.lift b').length), [3,3,3]);
  const ceil0=P.J('CASE_ST.model.ask.ceiling');

  P.q('#cs-size [data-cs-lift="3"]').click(); await sleep(60);
  const H=P.J(`uReq(uCatalog().find(z=>z.id==='grief'))`);
  c('Heavy lift: saved for this church and idea', P.J(`uChurch().overrides.grief.lift`), 3);
  c('…the same outreach, more demanding: twice the volunteers, one more leader, 250% of the money (a series keeps its 8 sessions)', [H.people,H.leaders,H.startup,H.monthly,H.weeks], [4,2,750,250,6]);
  c('…the slides follow (a larger ceiling)', P.J('CASE_ST.model.ask.ceiling')>ceil0, true);
  c('…the button is on', btns().map(b=>b.getAttribute('aria-pressed')), ['false','false','true']);
  const PzH=P.J('caseProposal(CASE_ST.model,CASE_ST.deck)');
  c('…the Proposal says so once, in WHAT', [PzH.plan.find(p=>p.k==='what').lines[0].includes('The full version: more people, a larger budget and a longer run.')], [true]);
  c('…and the proposal on the page follows', /The full version: more people, a larger budget and a longer run\./.test(P.txt('#cs-pz')), true);

  P.q('#cs-size [data-cs-lift="1"]').click(); await sleep(60);
  const Lt=P.J(`uReq(uCatalog().find(z=>z.id==='grief'))`);
  c('Light lift: half the volunteers (at least one), one leader, 40% of the money', [Lt.people,Lt.leaders,Lt.startup,Lt.monthly,Lt.weeks], [1,1,120,40,6]);
  c('…"A lighter start" in WHAT', P.J('caseProposal(CASE_ST.model,CASE_ST.deck)').plan.find(p=>p.k==='what').lines[0].includes('A lighter start: fewer people, a smaller budget and a shorter trial.'), true);
  c('…the handout too', JSON.stringify(P.J('caseHandout(CASE_ST.model,CASE_ST.deck)')).includes('A lighter start: fewer people, a smaller budget and a shorter trial.'), true);

  P.q('#cs-size [data-cs-lift="2"]').click(); await sleep(60);
  const M=P.J(`uReq(uCatalog().find(z=>z.id==='grief'))`);
  c('its own size again: nothing saved, the idea\'s own needs, no sentence', [P.J(`(uChurch().overrides||{}).grief&&uChurch().overrides.grief.lift||null`),M.people,M.startup,M.weeks,JSON.stringify(P.J('caseProposal(CASE_ST.model,CASE_ST.deck)')).includes('A lighter start')], [null,2,300,6,false]);

  console.log('\n-- an ongoing idea\'s trial: 4 weeks light, 6 moderate, 12 heavy --');
  P.E(`caseSetPrefs({ministry:'meal-train',group:'board',type:'board'}); caseMount();`); await sleep(60);
  const wk=()=>P.J(`uReq(uCatalog().find(z=>z.id==='meal-train')).weeks`), w0=wk();
  P.q('#cs-size [data-cs-lift="3"]').click(); await sleep(40); const w3=wk();
  P.q('#cs-size [data-cs-lift="1"]').click(); await sleep(40); const w1=wk();
  P.q('#cs-size [data-cs-lift="2"]').click(); await sleep(40);
  c('the meal train (ongoing): its own 6 weeks, 12 at Heavy, 4 at Light', [w0,w3,w1,wk()], [6,12,4,6]);
  c('…"no cost to start" where it costs nothing to start', P.qa('#cs-size .cs-szv').map(b=>b.textContent)[1], '5 volunteers · no cost to start');

  console.log('\n-- two steps, and what stays the idea\'s own --');
  P.E(`caseSetPrefs({ministry:'food-pantry',group:'board',type:'board'}); caseMount();`); await sleep(60);
  const F0=P.J(`uReq(uCatalog().find(z=>z.id==='food-pantry'))`);
  P.q('#cs-size [data-cs-lift="1"]').click(); await sleep(60);
  const F1=P.J(`uReq(uCatalog().find(z=>z.id==='food-pantry'))`);
  c('two steps lighter (Heavy → Light): applied twice', [F1.people,F1.startup], [Math.max(1,Math.ceil(Math.ceil(F0.people/2)/2)),Math.round(F0.startup*0.16)]);
  c('…session length, skills and rooms stay its own', [F1.sessionHours,JSON.stringify(F1.skills),JSON.stringify(F1.facilities)], [F0.sessionHours,JSON.stringify(F0.skills),JSON.stringify(F0.facilities)]);
  P.E(`caseSetPrefs({ministry:'health-expo',group:'board',type:'board'}); caseMount();`); await sleep(60);
  const E0=P.J(`uReq(uCatalog().find(z=>z.id==='health-expo'))`);
  P.q('#cs-size [data-cs-lift="2"]').click(); await sleep(60);
  c('an event keeps its own length (no trial weeks)', P.J(`uReq(uCatalog().find(z=>z.id==='health-expo')).weeks`), E0.weeks);
  c('his own Adjust edits still win over the size', P.J(`(()=>{ const o=uChurch().overrides; o['health-expo']={...o['health-expo'],people:30}; return uReq(uCatalog().find(z=>z.id==='health-expo')).people; })()`), 30);
  P.w.close();

  console.log('\n-- from the survey: the size it was chosen at --');
  const R=page({needs:'file'}); await ready(R); survey(R);
  const NEED=R.J(`NSM.needs[0].id`); await openNeed(R,NEED,true);
  const IDEA=R.q(`#ns-i-${NEED} .ns-row`).dataset.idea, LIFT=R.J(`NS_LIFTS.indexOf(nsLift(nsView(${JSON.stringify(R.q(`#ns-i-${NEED} .ns-row`).dataset.idea)})))+1`);
  await openSheet(R,NEED,IDEA);
  R.q('#ns-sheet [data-ns-propose]').click();
  await until(()=>R.E('TOOL')==='case'&&R.q('#cs-prop'));
  R.q('#cs-s1 [data-cs-group="board"]').click(); await sleep(60);
  c('the Proposal page: Size starts at the lift it was chosen at, nothing saved', [R.qa('#cs-size [data-cs-lift][aria-pressed="true"]').map(b=>+b.dataset.csLift),R.J(`(()=>{ const o=uChurch().overrides||{}, k=Object.keys(o).find(k=>o[k]&&o[k].lift); return k||null; })()`)], [[LIFT],null]);
  const other=LIFT===3?1:3;
  R.q(`#cs-size [data-cs-lift="${other}"]`).click(); await sleep(60);
  c('a tap there sizes the proposal card\'s lift line too', R.txt('#cs-prop .ns-liftline > span:not(.lift) > b'), other===3?'Heavy lift':'Light lift');
  R.w.close();

  console.log('\n-- in Spanish --');
  const S=page({lang:'es'}); await ready(S); survey(S);
  S.E(`openTool('case'); caseSetPrefs({ministry:'grief',group:'board',type:'board'}); caseMount();`); await sleep(60);
  c('Tamaño: Esfuerzo ligero, moderado, grande; voluntarios · para empezar', [S.txt('#cs-size .cs-szh'),S.qa('#cs-size .cs-szn').map(b=>b.textContent),S.qa('#cs-size .cs-szv').map(b=>b.textContent)[1]],
    ['Tamaño',['Esfuerzo ligero','Esfuerzo moderado','Esfuerzo grande'],'2 voluntarios · $300 para empezar']);
  S.q('#cs-size [data-cs-lift="3"]').click(); await sleep(60);
  c('…the sentence in Spanish', JSON.stringify(S.J('caseProposal(CASE_ST.model,CASE_ST.deck)')).includes('La versión completa: más personas, un presupuesto mayor y más tiempo.'), true);
  S.w.close();
}); T.done(); })();
