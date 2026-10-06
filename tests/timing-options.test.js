/* v10.42 — FIRM ON THE WHAT, FLEXIBLE ON THE WHEN.
 *
 * The pastor (29 Sep 2026), of slides that said "Runs 6 Oct – 18 Nov" and "Review 18 Nov · board meeting": "it's mandating the dates,
 * which we still have to figure out… a proposal should give them options; we'll have some discussion about when… they'll come back
 * with 'I don't know if Tuesday evening is good, we have this going on'… I don't know how long we want to run it, but there has to be
 * a level of authority and a solid plan… instead of dictating dates which might be conflicting with other things the church does."
 * No church calendar in Terrain ("I don't want it to get too complicated"). Held here, one section per point of the approved design:
 *  1. step 3's edit panel: "Suggest options" (the default) or "I already know the dates", saved per church, ministry and group;
 *  2. with options the motion (the plan) slide names no date: When "3 options · to agree together", Length (a 4-week pilot too when
 *     the trial is longer), Starts "{month}, after a calendar check", Review "First board meeting after the trial"; places, ceiling
 *     and funds stay; five rows at most (present.mjs);
 *  3. "Let's decide together" (board, business meeting, the officers, every team; never the Sabbath deck or the conference), an ask
 *     slide before the ask (a team's: before "Will you try it?"): up to three days and times from the church profile's rooms and times
 *     (never Sabbath hours for an idea that does not fit the Sabbath; Sabbath afternoon for one that does), each with any clash
 *     Terrain knows (a ministry of the plan at that time, his Planner series' evenings) and none invented; the lengths; the calendar
 *     check; a verified verse; present.mjs takes it as it is;
 *  4. the ask: a two-part motion that still decides; a team's "We'll choose the day and the length together tonight"; the Sabbath
 *     deck "Starting soon; we'll announce the day and the length" (fix after review, the length);
 *  5. the handout: "Timing options" (on the front, in the first steps' place) and "Agreed day and start:" to write in (a team's:
 *     "Agreed day, start and length:");
 *  6. the conference keeps the Evangelism Planner's dates, labelled proposed;
 *  7. "I already know the dates" is exactly the deck, the handout and the model of before (the model API's default too);
 *  8. with options no slide of any deck names a day of the month, but the conference's proposed dates (and eight library ideas whose
 *     own names are an observance, "…on August 31").
 * jsdom does no layout: every slide was measured in Chrome at 360 × 640 (NOTES of the build).
 */
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
const QUOTES=require('./case-quotes.json');
const {jsPDF}=require('jspdf');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,900));console.log('    want:',JSON.stringify(e).slice(0,500));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=15000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor'};
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      w.fetch=async(u)=>{ u=String(u);
        const m=/^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if(m){ const f=path.join(ROOT,'ideas',m[1]+'.json'); if(!fs.existsSync(f)) return {ok:false,status:404,json:async()=>null};
          const t=fs.readFileSync(f,'utf8'); return {ok:true,status:200,json:async()=>JSON.parse(t)}; }
        if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false})};
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
const PLAN={church:'Bucks County SDA',members:120,leaders:6,workers:30,nights:18,perweek:4,date:'2027-09-11',kind:'both',seats:180,file:null,budget:12000,built:1,v:3};
function setup(P,prefs){
  P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null;
    capSave(${JSON.stringify(FX.MEDIUM)}); ${prefs?`uChurch().proposalPrefs=${JSON.stringify(prefs)};`:''}
    uChurch().overrides={...(uChurch().overrides||{}),pathfinders:{weeks:6}}; uPersist(); })()`);
  // v10.42.0 fix after review: "For clubs that run by term (Pathfinder, Adventurer), offer 'the first term' instead of a 6-week or
  // 4-week trial" (tests/v42-fixes.test.js). This suite tests the trial machinery on the Pathfinder club, so it sets the club's
  // weeks with Adjust (6), which keeps a trial of 6 weeks.
}
const NOW=Date.UTC(2026,8,29,15);   // 29 Sep 2026: a trial two weeks out starts in October
const M=(P,id,t,g,o)=>P.J(`(()=>{ const m=caseModel(${JSON.stringify(id)},{type:'${t}',group:'${g}'},{now:${NOW},...${JSON.stringify(o||{})}}); return m; })()`);
const D=(P,id,t,g,o)=>P.J(`(()=>{ const m=caseModel(${JSON.stringify(id)},{type:'${t}',group:'${g}'},{now:${NOW},...${JSON.stringify(o||{})}}); return caseDeck(m); })()`);
// a day of the month, as the app writes one ("6 Oct", "18 nov 2026", "11 de septiembre", "October 6", "2026-10-06")
const MON='Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December|ene|abr|ago|dic|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre';
const DAY_RX=new RegExp(`\\b\\d{1,2}(?:\\s+de)?\\s+(?:${MON})\\b|\\b(?:${MON})\\.?\\s+\\d{1,2}\\b(?![:\\d])|\\b\\d{4}-\\d{2}-\\d{2}\\b`,'i');
const strs=v=>typeof v==='string'?[v]:Array.isArray(v)?v.flatMap(strs):v&&typeof v==='object'?Object.values(v).flatMap(strs):[];
const sec=async(f)=>{ try{ await f(); }catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e).toString().split('\n').slice(0,3).join(' | ')); fail++; } };

(async()=>{ try{
  const P=page(); setup(P);

  await sec(async()=>{
  console.log('\n-- 1. the setting: step 3\'s edit panel, per church, ministry and group --');
  const S=page(); setup(S,{ministry:'pathfinders',type:'board',group:'board'});
  // v10.51.0 — the pastor (6 Oct 2026): "Dates … suggest options … I already know the dates what does this actually change? … we wanna
  // just clean up as much as possible": the switch is no longer drawn in the slide panel (a choice saved before still counts). Its
  // setting and its slides are still the app's, so the switch is mounted here, in step 3, to test them.
  S.E(`openTool('case'); render(); caseMount(true);`); await until(()=>S.q('#cs-s3 .cs-acts'));
  const mount=()=>S.E(`(()=>{ const s3=document.getElementById('cs-s3'); let z=document.getElementById('zz-timing'); if(!z){ z=document.createElement('div'); z.id='zz-timing'; s3.append(z); } z.innerHTML=caseTimingHTML(); caseTimingWire(z); })()`);
  mount();
  c('v10.51.0: the slide panel itself draws no Dates switch', S.qa('#cs-s3 .cs-edit [data-cs-timing]').length, 0);
  const btn=k=>(mount(),S.q(`#cs-s3 [data-cs-timing="${k}"]`));
  c('the edit panel starts with "Dates": Suggest options (on, the default) | I already know the dates',
    [S.txt('#cs-s3 .cs-timing .cs-tlab'),S.txt(`#cs-s3 [data-cs-timing="options"]`),btn('options').getAttribute('aria-pressed'),S.txt(`#cs-s3 [data-cs-timing="fixed"]`),btn('fixed').getAttribute('aria-pressed')],
    ['Dates','Suggest options','true','I already know the dates','false']);
  c('…with one short line under it', /three days and the length to agree together, with no dates/.test(S.txt('#cs-s3 .cs-timing .note')), true);
  c('nothing is saved while it is the default', S.J('uChurch().caseTiming||{}'), {});
  c('the slides are the options deck: caseDeck(caseModel(…,{respond:true,timing:\'options\'}))', JSON.stringify(S.J('caseCurrentDeck()')),
    JSON.stringify(S.J(`caseDeck(caseModel('pathfinders',{type:'board',group:'board'},{respond:true,timing:'options'}))`)));
  c('…with "Let’s decide together" in them', S.J('caseCurrentDeck().slides.filter(s=>s.part==="decide").length'), 1);
  // the pastor's words on the ask slide stay on the ask slide (the decide slide is keyed apart: "decide:0")
  c('the decide slide has its own key for his words ("decide:0"), the ask keeps "ask:0"', S.J('caseSlotKeys(caseCurrentDeck()).filter(k=>/^(decide|ask):/.test(k))'), ['decide:0','ask:0']);
  S.E(`caseEditSet('ask:0','headline','Our ask to the board, itemised','x'); uPersist(); caseDraw3();`);
  c('…so an edit to the ask lands on the ask, not on the decide slide', S.J('caseCurrentDeck().slides.filter(s=>s.type==="ask").map(s=>(s.part||"ask")+":"+s.headline)'),
    // v10.42.0 fix after review: a board is asked the day, never the length ("the length is set by the motion")
    ['decide:Choose the day together','ask:Our ask to the board, itemised']);
  btn('fixed').click(); await sleep(50);
  c('"I already know the dates" is saved for this church, ministry and group (not per language)', S.J('uChurch().caseTiming'), {'pathfinders|board|board':'fixed'});
  c('…on the device', /"caseTiming":\{"pathfinders\|board\|board":"fixed"\}/.test(S.w.localStorage.getItem('terrain-churches-v1')||''), true);
  c('…the slides are today’s: caseDeck(caseModel(…,{respond:true})) (+ his edit)', JSON.stringify(S.J('caseCurrentDeck()')),
    JSON.stringify(S.J(`caseApplyEdits(caseDeck(caseModel('pathfinders',{type:'board',group:'board'},{respond:true})),caseEdits())`)));
  c('…no decide slide, and the motion says Runs with its dates', [S.J('caseCurrentDeck().slides.some(s=>s.part==="decide")'),S.J('caseCurrentDeck().slides[1].rows[0][0]'),DAY_RX.test(S.J('caseCurrentDeck().slides[1].rows[0][1]'))], [false,'Runs',true]);
  c('…his edit on the ask is still there', S.J('caseCurrentDeck().slides.filter(s=>s.type==="ask").map(s=>s.headline)'), ['Our ask to the board, itemised']);
  mount();
  c('…and the switch shows it, with its line', [S.q('#cs-s3 [data-cs-timing="fixed"]').getAttribute('aria-pressed'),/Change them with “Adjust scope and budget”/.test(S.txt('#cs-s3 .cs-timing .note'))], ['true',true]);
  c('another group keeps its own (the default)', [S.J(`caseTimingOf({ministry:'pathfinders',type:'team',group:'youth'})`),S.J(`caseTimingOf({ministry:'grief',type:'board',group:'board'})`)], ['options','options']);
  S.E(`LANG='es';`);
  c('the same in Spanish (one setting for both languages)', S.J(`caseTimingOf(casePrefs())`), 'fixed');
  S.E(`caseDraw3();`); mount();
  c('Spanish: "Fechas": Sugerir opciones | Ya sé las fechas', [S.txt('#cs-s3 .cs-timing .cs-tlab'),S.txt(`#cs-s3 [data-cs-timing="options"]`),S.txt(`#cs-s3 [data-cs-timing="fixed"]`)], ['Fechas','Sugerir opciones','Ya sé las fechas']);
  S.q('#cs-s3 [data-cs-timing="options"]').click(); await sleep(50);
  c('back to Suggest options: nothing stored, the decide slide is back', [S.J('uChurch().caseTiming'),S.J('caseCurrentDeck().slides.some(s=>s.part==="decide")')], [{},true]);
  c('no page errors', S.errs.slice(0,3), []);
  });

  await sec(async()=>{
  console.log('\n-- 2. the motion (the plan) slide: firm on the what, flexible on the when --');
  /* v10.42 part 3 (NARRATIVE.md §5.1): beside the goal the opening keeps four rows at most (When with Starts, Length, the ceiling with
     its funds, Review; Places moves to the ask), and a phone shows the ones that fit beside the goal and a verse in the longer language
     (caseFitDeck, measured in Chrome), in that order: the model keeps them all for the handout and the Proposal */
  const rowsOf=(id,t,g,lang)=>M(P,id,t,g,{timing:'options',lang}).motion.rows;
  const shown=(id,t,g,lang)=>{ const all=rowsOf(id,t,g,lang).map(r=>r[0]), d=D(P,id,t,g,{timing:'options',lang}).slides.find(s=>s.type==='motion').rows.map(r=>r[0]); let k=0; return d.length>=1&&d.every(l=>{ const j=all.indexOf(l,k); if(j<0) return false; k=j+1; return true; }); };
  // v10.42.0 fix after review: the finance committee, the board and the business meeting are asked the day (and start), never the
  // length: "the length is set by the motion" (a board once read "Length 4-week pilot · 6-week trial · a full season" beside a motion for 6 weeks)
  // v10.45.0 review round (stale, the new intent): the built-ins the needs show are priced at their source (U_LINES_OWN, review #6): Pathfinders' 6-week trial is $1,500 + 2 × $100
  c('board (pathfinders, 16 places, 6 weeks): four rows; When and Starts share one; Places in the ask', rowsOf('pathfinders','board','board','en'),
    [['When','3 options · from October, after a calendar check'],['Length','A 6-week trial'],['Spending ceiling','$1,700 · local budget, not tithe'],['Review','First board meeting after the trial']]);
  c('…Spanish', rowsOf('pathfinders','board','board','es'),
    [['Cuándo','3 opciones · desde octubre, tras revisar el calendario'],['Duración','Una prueba de 6 semanas'],['Tope de gasto','$1,700 · presupuesto local, no el diezmo'],['Revisión','Primera reunión de la junta tras la prueba']]);
  c('…the slide shows the rows that fit, in their order (EN, ES, board and team)', [shown('pathfinders','board','board','en'),shown('pathfinders','board','board','es'),shown('pathfinders','team','youth','en'),shown('pathfinders','team','youth','es')], [true,true,true,true]);
  const sm=rowsOf('sg-homes','board','board','en');
  c('a board deck with fewer options says how many (small groups in homes: two times a host home and the kitchen are free)', sm[0], ['When','2 options · from October, after a calendar check']);
  c('the business meeting reviews at its own next meeting', rowsOf('pathfinders','board','business','en').pop(), ['Review','First business meeting after the trial']);
  c('the officers (the elders) review at the board', rowsOf('pathfinders','board','elders','en').pop(), ['Review','First board meeting after the trial']);
  // v10.42.0 fix after review (the length): the pastor, of a team's motion that said "a trial of 6 weeks" beside a slide offering three
  // lengths: "yes, they should be able to choose length." A ministry team chooses the length together as it chooses the day; the Sabbath
  // deck announces both.
  c('a team (pathfinders, youth): When (with Starts) · Length (the three to choose from) · Places · Review', rowsOf('pathfinders','team','youth','en'),
    [['When','3 options · from October, after a calendar check'],['Length','4-week pilot · 6-week trial · a full season'],['Places','16'],['Review','First team meeting after the trial']]);
  // v10.42.0 fix after review: "DURACIÓN Una prueba de 6 semanas o un piloto de 4" ("semanas" was missing)
  c('…Spanish', rowsOf('pathfinders','team','youth','es'),
    [['Cuándo','3 opciones · desde octubre, tras revisar el calendario'],['Duración','Piloto de 4 semanas · prueba de 6 semanas · una temporada'],['Cupos','16'],['Revisión','Primera reunión del equipo tras la prueba']]);   // (the length)
  c('the Sabbath deck: no date, "Starting soon; we’ll announce the day and the length" (the length, as the day)', rowsOf('pathfinders','congregation','congregation','en'),
    [['When','Starting soon; we’ll announce the day and the length'],['Places','16']]);
  c('…Spanish', rowsOf('pathfinders','congregation','congregation','es')[0], ['Cuándo','Empieza pronto; anunciaremos el día y la duración']);
  // v10.43 (the pastor, 30 Sep 2026: "separate the things that are weekly or monthly — ongoing ministry — and events, which are one-time, one day… after one day there needs to be some kind of follow-up"): the health expo is a one-day event now
  // (no length at all), so a short trial is an ongoing idea the pastor set to two weeks (Adjust)
  const ov0=P.J('uChurch().overrides||{}'); P.E(`uChurch().overrides={...uChurch().overrides,'food-pantry':{weeks:2}}; uPersist();`); const hx=M(P,'food-pantry','board','board',{timing:'options'}); P.E(`uChurch().overrides=${JSON.stringify(ov0)}; uPersist();`);
  // v10.42.0 fix after review: the finance committee, the board and the business meeting are asked the day (and start), never the
  // length: "the length is set by the motion" (a board once read "Length 4-week pilot · 6-week trial · a full season" beside a motion for 6 weeks)
  c('a trial of four weeks or less offers no 4-week pilot (the food pantry, set to 2 weeks)', [hx.capacity.req.weeks,hx.motion.rows.find(r=>r[0]==='Length'||r[0]==='When')[1].includes('pilot'),hx.timing.lengths], [2,false,['2-week trial']]);
  c('a start in another year says its year ("January 2027")', P.J(`caseModel('pathfinders',{type:'team',group:'youth'},{timing:'options',now:${Date.UTC(2026,11,20,15)}}).timing.starts`), 'January 2027, after a calendar check');
  c('the preparation line keeps its month, not its day ("September 2026")', D(P,'pathfinders','board','board',{timing:'options'}).slides[1].by, 'To: Church board · Prepared by Pastor Joshua Mura · September 2026');
  // v10.42 part 3 (X3): one timing slide, "Let's decide together" here; the first steps stay in the model and the handout
  c('the first steps count weeks', M(P,'pathfinders','board','board',{timing:'options'}).timeline.steps.map(s=>s.date), ['Week 1 · start','Week 3 · midpoint','After week 6 · review']);
  // v10.42.0 fix after review (the length): a team chooses the length, so its steps name no week number (a board's keep them, above)
  c('…Spanish (30 characters at most on a step)', M(P,'pathfinders','team','youth',{timing:'options',lang:'es'}).timeline.steps.map(s=>s.date), ['Semana 1 · inicio','A mitad de la prueba','Tras la prueba · revisión']);
  c('…the board\'s in Spanish count weeks', M(P,'pathfinders','board','board',{timing:'options',lang:'es'}).timeline.steps.map(s=>s.date), ['Semana 1 · inicio','Semana 3 · mitad del camino','Tras la semana 6 · revisión']);
  c('the ask slide’s room names no day', D(P,'pathfinders','board','board',{timing:'options'}).slides.filter(s=>s.type==='ask').pop().rows.find(r=>r[0]==='Room'), ['Room','Classrooms · day to be agreed']);
  // every board / business / officer / team deck of every built-in: at most five rows (present.mjs keeps five), places, ceiling and funds kept
  const bad=P.J(`(()=>{ const out=[]; for(const x of SIGNATURE) for(const g of CASE_GROUPS.filter(g=>g.type==='board'||g.type==='team')) for(const lang of ['en','es']){
      const m=caseModel(x.id,{type:g.type,group:g.id},{timing:'options',lang,now:${NOW}}); const r=m.motion.rows, L=r.map(z=>z[0]);
      const seats=x.seats!==false, pl=CASE_COPY.motion.places[lang], ceil=CASE_COPY.motion.ceiling[lang];
      // v10.42 part 3: a board's places are in its ask (NARRATIVE.md §5.1)
      const inAsk=m.ask.rows.map(z=>z[0]).includes(pl);
      if(r.length>5||(seats&&!(g.type==='board'?inAsk:L.includes(pl)))||(g.type==='board'&&!L.includes(ceil))||!L.includes(CASE_COPY.motion.review[lang])) out.push([x.id,g.id,lang,L]); } return out; })()`);
  c('every built-in × every board and team group, EN and ES: five rows at most, with places (a board: in the ask), the ceiling (and funds) and the review', bad.slice(0,3), []);
  });

  await sec(async()=>{
  console.log('\n-- 3. "Let’s decide together" --');
  const d=D(P,'pathfinders','board','board',{timing:'options'}), i=d.slides.findIndex(s=>s.part==='decide');
  // v10.42 part 3 (DESIGN.md §5, X3): the arc (how it works, safeguards before the one timing slide, the appeal at the end)
  c('the board’s deck: before the ask', d.slides.map(s=>s.type+(s.part?'/'+s.part:'')), ['join','motion','stat','how','capacity','ability','risks','ask/decide','ask','close']);
  // v10.42.0 fix after review: the finance committee, the board and the business meeting are asked the day (and start), never the
  // length: "the length is set by the motion" (a board once read "Length 4-week pilot · 6-week trial · a full season" beside a motion for 6 weeks)
  c('an ask slide (present.mjs has the type): kicker, headline, rows', [d.slides[i].kicker,d.slides[i].headline], ['Let’s decide together','Choose the day together']);
  c('three times from the church profile, the lengths and the calendar check', d.slides[i].rows,
    [['Option 1','Tuesday evening'],['Option 2','Wednesday evening'],['Option 3','Thursday evening'],
     ['Check first','Communion Sabbath, Week of Prayer, camp meeting, holidays, school breaks']]);
  const es=D(P,'pathfinders','board','board',{timing:'options',lang:'es'}), ie=es.slides.findIndex(s=>s.part==='decide');
  c('…Spanish', [es.slides[ie].kicker,es.slides[ie].headline,es.slides[ie].rows], ['Decidamos juntos','Elijamos juntos el día',
    [['Opción 1','Martes por la noche'],['Opción 2','Miércoles por la noche'],['Opción 3','Jueves por la noche'],
     ['Revisar antes','Santa Cena, Semana de Oración, campestre, feriados, vacaciones escolares']]]);
  const V=new Map(QUOTES.verses.map(v=>[v.id,v]));
  // v10.42 part 3: the safeguards now come before it and take Proverbs 15:22 (counsel); "Let's decide together" takes the next of its own
  // (CASE_VERSE_DECIDE, whichever the slides before it leave), the same verse in both languages
  { const idOf=(l,r)=>{ const x=QUOTES.verses.find(v=>(v[l].ref||v.ref&&v.ref[l])===String(r).replace(/ · (KJV|RVA)$/,'')); return x?x.id:null; };
    const dv=idOf('en',d.slides[i].verse.ref);
    c('a verse from the verified library at its foot, one of its own (the safeguards before it have Proverbs 15:22)', [P.J('CASE_VERSE_DECIDE').includes(dv),d.slides[i].verse.text===(V.get(dv)&&V.get(dv).en.text),idOf('es',es.slides[ie].verse.ref)===dv,d.slides.find(s=>s.type==='risks').verse.ref],
      [true,true,true,'Proverbs 15:22 · KJV']); }
  c('its verses are all in the verified library', P.J('CASE_VERSE_DECIDE').every(id=>V.has(id)), true);
  const t=D(P,'pathfinders','team','youth',{timing:'options'});
  // v10.42.0 fix after review (the length): "yes, they should be able to choose length"
  c('a team’s deck: before "Will you try it?", and "We’ll choose the day and the length tonight"', [t.slides.map(s=>s.type+(s.part?'/'+s.part:'')).slice(-3),t.slides.find(s=>s.part==='decide').headline],
    [['risks','ask/decide','yes'],'We’ll choose the day and the length tonight']);   // v10.42 part 3 (X3): one timing slide
  const where=P.J(`(()=>{ const o={}; for(const g of CASE_GROUPS){ const d=caseDeck(caseModel('pathfinders',{type:g.type,group:g.id},{timing:'options',now:${NOW}}));
      o[g.id]=d.slides.filter(s=>s.part==='decide').length; } return o; })()`);
  c('in every board, business, officer and team deck; never the Sabbath deck or the conference', [Object.entries(where).filter(([g,n])=>n!==1).map(([g])=>g).sort()], [['conference','congregation']]);
  c('present.mjs limits: seven rows at most, every text under 400 characters', P.J(`(()=>{ let bad=0; for(const x of SIGNATURE) for(const t of [['board','board'],['team','community']]) for(const lang of ['en','es']){
      const d=caseDeck(caseModel(x.id,{type:t[0],group:t[1]},{timing:'options',lang,now:${NOW}})); const s=d.slides.find(s=>s.part==='decide');
      if(!s||s.rows.length>7||!s.verse||JSON.stringify(s).length>2000||s.rows.some(r=>r[1].length>120)) bad++; } return bad; })()`), 0);
  // the rules of the times
  const opt=(id,o)=>P.J(`caseModel(${JSON.stringify(id)},{type:'board',group:'board'},{timing:'options',now:${NOW},...${JSON.stringify(o||{})}}).timing.options.map(o=>o.slot)`);
  const sabProfile={...FX.MEDIUM,slots:['Fri evening','Sat afternoon','Sat evening','Sun daytime'],facilities:Object.fromEntries(Object.entries(FX.MEDIUM.facilities).map(([k,f])=>[k,{...f,slots:['Fri evening','Sat afternoon','Sat evening','Sun daytime']}]))};
  P.E(`CAP=null; capSave(${JSON.stringify(sabProfile)});`);
  c('Sabbath hours (Friday evening, Saturday afternoon) for an idea that fits the Sabbath (the Pathfinder club; a different weekday each)', opt('pathfinders'), ['Fri evening','Sat afternoon','Sun daytime']);
  c('…never for one that does not (the homework club): Saturday evening and Sunday only', opt('homework-club'), ['Sat evening','Sun daytime']);
  c('…and Saturday evening is said "after sunset" for it', P.J(`caseModel('homework-club',{type:'board',group:'board'},{timing:'options',now:${NOW}}).timing.options[0].text`), 'Saturday evening, after sunset');
  const sabLeak=P.J(`(()=>{ const out=[]; for(const x of SIGNATURE){ if(CASE_SAB_BUILTINS.has(x.id)) continue; const m=caseModel(x.id,{type:'board',group:'board'},{timing:'options',now:${NOW}});
      m.timing.options.forEach(o=>{ if(CASE_SAB_SLOTS.has(o.slot)) out.push(x.id); }); } return out; })()`);
  c('…for every built-in that does not fit the Sabbath, with a profile open only then: no Sabbath hour offered', sabLeak, []);
  P.E(`CAP=null; capSave(${JSON.stringify(FX.MEDIUM)});`);
  // clashes: only what Terrain knows
  const noClash=P.J(`(()=>{ let n=0; for(const x of SIGNATURE) for(const lang of ['en','es']){ const m=caseModel(x.id,{type:'board',group:'board'},{timing:'options',lang,now:${NOW}});
      // v10.43: a weekly series runs its own sessions (eight for stop smoking), so a holiday one of them meets is said: known, never invented
      m.timing.options.forEach(o=>{ if(o.clashes.some(c=>c.kind!=='holiday')||/clash|choca|coincide/i.test(o.text)) n++; }); } return n; })()`);
  c('with nothing in the plan at a time and no series near, no clash is ever shown (every built-in, EN and ES)', noClash, 0);
  P.E(`uChurch().selected=['grief']; uChurch().overrides={grief:{slot:'Tue evening'},pathfinders:{weeks:6}}; uPersist();`);
  // the homework club (classrooms, not a Sabbath idea): Tuesday, Wednesday and Thursday evenings are its times
  const cm=M(P,'homework-club','board','board',{timing:'options'});
  c('a ministry of the plan set to Tuesday evening: that time comes after the free ones, and says so', cm.timing.options.map(o=>[o.slot,o.text]),
    [['Wed evening','Wednesday evening'],['Thu evening','Thursday evening'],['Tue evening','Tuesday evening · clashes with Grief recovery group']]);
  c('…Spanish', M(P,'homework-club','board','board',{timing:'options',lang:'es'}).timing.options[2].text, 'Martes por la noche · choca con Grupo de recuperación del duelo');
  c('…the handout names it in full', P.J(`caseHandout(caseModel('homework-club',{type:'board',group:'board'},{timing:'options',now:${NOW}}),null,{now:${NOW}}).timing.boxes[2]`), {label:'Option 3',title:'Tuesday evening',text:'Classrooms · clashes with Grief recovery group, already in our plan at that time'});
  P.E(`uChurch().selected=['grief','food-pantry']; uChurch().overrides={grief:{slot:'Tue evening'},'food-pantry':{slot:'Wed evening'},pathfinders:{weeks:6}}; uPersist();`);
  const two=M(P,'homework-club','board','board',{timing:'options'}).timing.options;
  c('two clashes with long names: the first is named, the second says "another ministry" (the rows share one budget, measured)', two.map(o=>o.text),
    ['Thursday evening','Tuesday evening · clashes with Grief recovery group','Wednesday evening · clashes with another ministry']);
  c('…the handout names both', P.J(`caseHandout(caseModel('homework-club',{type:'board',group:'board'},{timing:'options',now:${NOW}}),null,{now:${NOW}}).timing.boxes.map(b=>b.text)`), ['Classrooms · no known clash','Classrooms · clashes with Grief recovery group, already in our plan at that time','Classrooms · clashes with a real food pantry, on a schedule, already in our plan at that time']);
  c('…every option row within its limits in both languages (80 each, 150 together)', ['en','es'].map(l=>{ const o=M(P,'homework-club','board','board',{timing:'options',lang:l}).timing.options.map(z=>z.text.length); return Math.max(...o)<=80&&o.reduce((a,b)=>a+b,0)<=150; }), [true,true]);
  P.E(`uChurch().selected=['grief']; uChurch().overrides={pathfinders:{weeks:6}}; uPersist();`);
  c('a ministry of the plan with no time of its own is not a clash (Terrain does not know its day)', M(P,'homework-club','board','board',{timing:'options'}).timing.options.map(o=>o.clashes.length), [0,0,0]);
  P.E(`uChurch().selected=[]; planSave(${JSON.stringify({...PLAN,date:'2026-10-20',nights:12,perweek:2})}); uPersist();`);   // Tuesday 20 Oct: Tue and Wed evenings
  const sm=M(P,'homework-club','board','board',{timing:'options'});
  c('his Planner series in the weeks it could run (Tuesday and Wednesday evenings from 20 Oct): those evenings say so, after the free one', sm.timing.options.map(o=>[o.slot,o.text]),
    [['Thu evening','Thursday evening'],['Tue evening','Tuesday evening · clashes with our evangelism series'],['Wed evening','Wednesday evening · clashes with our evangelism series']]);
  c('…the handout gives its nights and opening', P.J(`caseHandout(caseModel('homework-club',{type:'board',group:'board'},{timing:'options',now:${NOW}}),null,{now:${NOW}}).timing.boxes[1].text`), 'Classrooms · clashes with our evangelism series (12 nights from 20 Oct 2026)');
  P.E(`planSave(${JSON.stringify(PLAN)}); uPersist();`);
  c('a series a year away is no clash', M(P,'homework-club','board','board',{timing:'options'}).timing.options.map(o=>o.clashes.length), [0,0,0]);
  P.E(`uChurch().plan=null; uPersist();`);
  // present.mjs takes the deck as it is (no new slide type; the unknown "part" is dropped)
  delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.TERRAIN_REG_SECRET; delete process.env.PRESENT_FB_URL;
  const mem=new Map(); globalThis.__terrainPresentStore={async get(k){ const v=mem.get(k); return v===undefined?null:JSON.parse(v); },async getWithMetadata(k){ const v=mem.get(k); return v===undefined?null:{data:JSON.parse(v),etag:'e',metadata:{}}; },
    async setJSON(k,v,o={}){ if(o.onlyIfNew&&mem.has(k)) return {modified:false}; mem.set(k,JSON.stringify(v)); return {modified:true,etag:'e'}; },async delete(k){ mem.delete(k); },async list({prefix=''}={}){ return {blobs:[...mem.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}; }};
  const handler=(await import(path.join(ROOT,'netlify','functions','present.mjs'))).default;
  for(const [tt,g] of [['board','board'],['team','youth']]){
    const deck=D(P,'pathfinders',tt,g,{timing:'options',respond:true});
    const r=await handler(new Request('https://pastorshub.org/.netlify/functions/present',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'open',deck})}),{ip:'203.0.113.9'});
    const j=await r.json(); const st=j.room?JSON.parse(mem.get('d/'+j.room)).deck:null, sd=st&&st.slides.find(s=>s.kicker==='Let’s decide together'), dd=deck.slides.find(s=>s.part==='decide');
    c(`present.mjs opens the ${tt} deck as it is: the decide slide’s rows and verse kept, "part" dropped`, [r.status,!!sd&&JSON.stringify(sd.rows)===JSON.stringify(dd.rows),!!sd&&JSON.stringify(sd.verse)===JSON.stringify(dd.verse),!!sd&&!('part' in sd)], [200,true,true,true]);
  }
  });

  await sec(async()=>{
  console.log('\n-- 4. the ask: a two-part motion that still decides --');
  c('the board', M(P,'pathfinders','board','board',{timing:'options'}).ask.text,
    'Tonight we approve the plan, a named coordinator and a ceiling of $1,700. The team sets the day and start date with the church calendar within two weeks and reports them to the board.');
  // v10.42.0 fix after review: Spanish "en dos semanas" means "after two weeks"; "within" is "en un plazo de"
  c('…Spanish', M(P,'pathfinders','board','board',{timing:'options',lang:'es'}).ask.text,
    'Esta noche aprobamos el plan, una persona coordinadora designada y un tope de $1,700. El equipo fija el día y la fecha de inicio con el calendario de la iglesia en un plazo de dos semanas y los informa a la junta.');
  P.E(`uChurch().overrides={pathfinders:{owner:'Maria Lopez',weeks:6}}; uPersist();`);
  c('the coordinator he proposed (Adjust) is named', M(P,'pathfinders','board','board',{timing:'options'}).ask.text.startsWith('Tonight we approve the plan, Maria Lopez as coordinator and a ceiling of $1,700.'), true);
  P.E(`uChurch().overrides={pathfinders:{weeks:6}}; uPersist();`);
  c('the business meeting: the church votes', M(P,'pathfinders','board','business',{timing:'options'}).ask.text,
    'Today the church votes on the plan, a named coordinator and a ceiling of $1,700. The team sets the day and start date with the church calendar within two weeks and reports them to the church board.');
  const el=M(P,'pathfinders','board','elders',{timing:'options'}).ask.text;
  c('the officers keep their own ask, then who sets the day', [el.startsWith(M(P,'pathfinders','board','elders').ask.text),/The team sets the day and start date with the church calendar within two weeks and reports them to the board\.$/.test(el)], [true,true]);
  c('the treasurer’s ask names no date (its account at the review after the trial)', /itemised account at the review after the trial\. The team sets the day/.test(M(P,'pathfinders','board','finance',{timing:'options'}).ask.text), true);
  // v10.42.0 fix after review (the length): a team chooses the day and the length ("yes, they should be able to choose length")
  c('a team: "We’ll choose the day and the length together tonight."', /We’ll choose the day and the length together tonight\.$/.test(M(P,'pathfinders','team','youth',{timing:'options'}).ask.text), true);
  c('…Spanish', /Elegiremos juntos el día y la duración esta noche\.$/.test(M(P,'pathfinders','team','youth',{timing:'options',lang:'es'}).ask.text), true);
  const cg=D(P,'pathfinders','congregation','congregation',{timing:'options'});
  // v10.42 part 3 (the pastor: "an appeal at the end"; NARRATIVE.md §5.3): the whole church's close appeals back to the goal, no date
  c('the Sabbath deck: the appeal back to the goal, no date', cg.slides.find(s=>s.type==='close').headline, 'Will you join us to grow our Pathfinder Club?');
  c('…Spanish', D(P,'pathfinders','congregation','congregation',{timing:'options',lang:'es'}).slides.find(s=>s.type==='close').headline, '¿Se unirán a nosotros para hacer crecer nuestro Club de Conquistadores?');
  c('the words about the review and the win name no date either (the group’s close, "What to say")', [M(P,'grief','congregation','congregation',{timing:'options'}).close,/a named coordinator, a day agreed together, a spending ceiling and a review after the trial\./.test(M(P,'pathfinders','board','board',{timing:'options'}).questions.find(q=>q.id==='board.tried').a)],
    ['We will tell you after the series what God did with it.',true]);   // v10.43 (the pastor: "separate the things that are weekly or monthly… and events"): grief recovery is a series of eight sessions
  });

  await sec(async()=>{
  console.log('\n-- 5. the handout: "Timing options" and a line to write in --');
  const m=M(P,'pathfinders','board','board',{timing:'options'}), d=P.J(`caseDeck(caseModel('pathfinders',{type:'board',group:'board'},{timing:'options',now:${NOW}}))`);
  const H=P.J(`(()=>{ const m=caseModel('pathfinders',{type:'board',group:'board'},{timing:'options',now:${NOW}}); return caseHandout(m,caseDeck(m),{now:${NOW}}); })()`);
  // v10.42.0 fix after review: the finance committee, the board and the business meeting are asked the day (and start), never the
  // length: "the length is set by the motion" (a board once read "Length 4-week pilot · 6-week trial · a full season" beside a motion for 6 weeks)
  c('the section: three options (room and any clash), the lengths, the calendar check, the line to write in', [H.timing.title,H.timing.boxes,H.timing.length,H.timing.calendar,H.timing.agreed],
    ['Timing options',[{label:'Option 1',title:'Tuesday evening',text:'Classrooms · no known clash'},{label:'Option 2',title:'Wednesday evening',text:'Classrooms · no known clash'},{label:'Option 3',title:'Thursday evening',text:'Classrooms · no known clash'}],
     'Length: 6-week trial.','Before we choose, check the church calendar: communion Sabbath, Week of Prayer, camp meeting, holidays, school breaks.','Agreed day and start:']);
  c('…the review, and the facts of the ask, name no date', [H.review,H.facts.some(f=>DAY_RX.test(f[1])),H.steps.map(s=>s.date)],
    ['Review at the first board meeting after the trial: continue, change or stop.',false,['Week 1 · start','Week 3 · midpoint','After week 6 · review']]);
  const doc=P.E(`(()=>{ const m=caseModel('pathfinders',{type:'board',group:'board'},{timing:'options',now:${NOW}}); window.__D=casePdfDoc(caseHandout(m,caseDeck(m),{now:${NOW}}),{jsPDF:window.__J}); return 1; })()`, P.w.__J=jsPDF);
  const log=P.J('__D.__caseLog'), pages=P.E('__D.getNumberOfPages()');
  const at=t=>log.find(l=>l.t===t);
  // v10.42 part 3 (NARRATIVE.md §9 as DESIGN N8 amends it): the handout tells the slides' story in their order, so the timing comes after
  // the safeguards, on the back, in the first steps' place (every built-in's handout measured: two pages)
  const tp0=at('TIMING OPTIONS')&&at('TIMING OPTIONS').p;
  c('the PDF draws it in the story’s order, in the first steps’ place, with the line to write the day and start in', [pages,tp0,at('Agreed day and start:')&&at('Agreed day and start:').p,log.some(l=>/check the church calendar: communion Sabbath/.test(l.t)),!!at('FIRST STEP AND REVIEW')], [2,2,2,true,false]);
  c('…the review line after it', log.some(l=>l.p===tp0&&/^Review at the first board meeting after the trial/.test(l.t)&&l.y>at('TIMING OPTIONS').y), true);
  c('…every line inside its box', log.filter(l=>l.x0<l.bx0-0.5||l.x1>l.bx1+0.5).map(l=>l.t).slice(0,3), []);
  const Pe=P.J(`(()=>{ const m=caseModel('pathfinders',{type:'team',group:'youth'},{timing:'options',lang:'es',now:${NOW}}); const H=caseHandout(m,caseDeck(m),{now:${NOW}}); const D=casePdfDoc(H,{jsPDF:window.__J}); return {t:H.timing.title,a:H.timing.agreed,n:D.getNumberOfPages(),out:D.__caseLog.filter(l=>l.x0<l.bx0-0.5||l.x1>l.bx1+0.5).length}; })()`);
  // v10.42.0 fix after review (the length): a team writes in the length it agreed too
  c('…Spanish, a team’s handout too', Pe, {t:'Opciones de horario',a:'Día, inicio y duración acordados:',n:2,out:0});
  c('the Sabbath deck’s handout has no timing section (nothing to decide there)', P.J(`(()=>{ const m=caseModel('pathfinders',{type:'congregation',group:'congregation'},{timing:'options',now:${NOW}}); return caseHandout(m,caseDeck(m),{now:${NOW}}).timing||null; })()`), null);
  // a member's phone builds the handout from the deck alone (the server's copy has no "part"): the ask is the last ask slide
  const phone=JSON.parse(JSON.stringify(d)); phone.slides.forEach(s=>delete s.part);
  const Hp=P.J(`caseHandout(null,${JSON.stringify(phone)},{})`);
  // v10.42 merge (with the presenter part): a member's copy has no "Agreed day and start: ____" line to write on (it is on no
  // slide; with it and the phone's QR code, copies with Spiritual Gifts results reached the tightest level, where the verses
  // lose their words: tests/v42-handout.test.js); the pastor's own handout keeps it (above)
  // v10.42.0 fix after review: the finance committee, the board and the business meeting are asked the day (and start), never the
  // length: "the length is set by the motion" (a board once read "Length 4-week pilot · 6-week trial · a full season" beside a motion for 6 weeks)
  c('a phone’s handout: the itemised ask from the ask slide, the timing from "Let’s decide together", no write-in line', [Hp.budgetRows,Hp.timing.boxes[0],Hp.timing.length,Hp.timing.calendar,Hp.timing.agreed],
    [d.slides.filter(s=>s.type==='ask').pop().rows,{label:'Option 1',title:'Tuesday evening',text:''},'','Check first: Communion Sabbath, Week of Prayer, camp meeting, holidays, school breaks.','']);
  const tp=D(P,'pathfinders','team','youth',{timing:'options'}); tp.slides.forEach(s=>delete s.part);
  c('…a team’s (it has no ask slide): no budget rows from the decide slide', [P.J(`caseHandout(null,${JSON.stringify(tp)},{}).budgetRows||null`),P.J(`caseHandout(null,${JSON.stringify(tp)},{}).timing.boxes.length`)], [null,3]);
  });

  await sec(async()=>{
  console.log('\n-- 6. the conference: the Planner’s dates, proposed --');
  P.E(`planSave(${JSON.stringify(PLAN)}); uPersist();`);
  const cd=D(P,'plan-series','conference','conference',{timing:'options'}), mo=cd.slides.find(s=>s.type==='motion'), tl=cd.slides.find(s=>s.type==='timeline');
  c('the proposal: "proposed opening night", "open to adjustment"', [mo.headline,mo.rows.find(r=>r[0]==='Opening night')], ['An evangelism series in Warminster: proposed opening night 11 Sep 2027',['Opening night','Proposed 11 Sep 2027, open to adjustment · 18 nights']]);
  c('the plan and its dates: every date proposed, preparation "Now"', [tl.headline,tl.steps.map(s=>s.date)], ['Proposed opening night 11 Sep 2027: 11 months to prepare',['Now','Proposed 11 Sep 2027','Proposed 15 Oct 2027']]);
  const ce=D(P,'plan-series','conference','conference',{timing:'options',lang:'es'});
  // v10.42 part 3: beside the goal a phone shows the proposal's rows that fit (caseFitDeck); the model keeps them all
  c('…Spanish', [M(P,'plan-series','conference','conference',{timing:'options',lang:'es'}).motion.rows[1][1],ce.slides.find(s=>s.type==='timeline').steps.map(s=>s.date)], ['Propuesta: 11 sep 2027, abierta a ajustes · 18 noches',['Ahora','Propuesta: 11 sep 2027','Propuesta: 15 oct 2027']]);
  c('I already know the dates: as before', M(P,'plan-series','conference','conference',{timing:'fixed'}).motion.rows[1], ['Opening night','11 Sep 2027 · 18 nights']);
  c('an idea for the conference (no series): no date, when it starts and how long', M(P,'food-pantry','conference','conference',{timing:'options'}).motion.rows.map(r=>r[0]), ['Church','Starts','Length','We ask for','Report']);
  c('…and no decide slide there', cd.slides.some(s=>s.part==='decide'), false);
  P.E(`uChurch().plan=null; uPersist();`);
  });

  await sec(async()=>{
  console.log('\n-- 7. "I already know the dates" is today’s behaviour exactly --');
  const diff=P.J(`(()=>{ const out=[]; for(const x of SIGNATURE) for(const [t,g] of [['board','board'],['board','business'],['team','youth'],['congregation','congregation'],['conference','conference']]) for(const lang of ['en','es']){
      const a=caseModel(x.id,{type:t,group:g},{lang,now:${NOW}}), b=caseModel(x.id,{type:t,group:g},{lang,now:${NOW},timing:'fixed'});
      const A={...a}, B={...b}; delete A.timing; delete B.timing;
      if(JSON.stringify(A)!==JSON.stringify(B)||JSON.stringify(caseDeck(a))!==JSON.stringify(caseDeck(b))||JSON.stringify(caseHandout(a,caseDeck(a),{now:${NOW}}))!==JSON.stringify(caseHandout(b,caseDeck(b),{now:${NOW}}))) out.push([x.id,g,lang]); } return out; })()`);
  c('every built-in × board, business meeting, team, Sabbath and conference, EN and ES: the model, the deck and the handout of "fixed" are the default’s', diff.slice(0,3), []);
  c('the model API keeps today’s dates when no timing is asked for', [M(P,'pathfinders','board','board').timing.mode,D(P,'pathfinders','board','board').slides[1].rows[0][0],D(P,'pathfinders','board','board').slides.some(s=>s.part)], ['fixed','Runs',false]);
  c('…"Runs 13 Oct – 24 Nov", "Review 24 Nov · board meeting"', [D(P,'pathfinders','board','board').slides[1].rows[0][1],M(P,'pathfinders','board','board').motion.rows.find(r=>r[0]==='Review')[1]], ['13 Oct – 24 Nov','24 Nov · board meeting']);   // v10.42 part 3: the model keeps every row
  });

  await sec(async()=>{
  console.log('\n-- 8. with options, no slide names a day of the month --');
  const scan=`(()=>{ const RX=new RegExp(${JSON.stringify(DAY_RX.source)},'i'); const strs=v=>typeof v==='string'?[v]:Array.isArray(v)?v.flatMap(strs):v&&typeof v==='object'?Object.values(v).flatMap(strs):[];
    return (m,d)=>{ const own=[m.ministry.name,m.ministry.mid].filter(Boolean); const hits=[];
      // v10.42 part 3: How it works quotes the idea's own steps verbatim (NARRATIVE.md §6), a date in them its own, as its name
      d.slides.forEach((s,i)=>{ if(s.type==='how') return; strs(s).forEach(t=>{ let u=t; own.forEach(n=>{ u=u.split(n).join(''); }); if(RX.test(u)) hits.push([i,s.type,t]); }); }); return hits; }; })()`;
  P.E(`window.__scan=${scan};`);
  const b=P.J(`(()=>{ const out={n:0,dated:[],proposed:0}; for(const x of SIGNATURE) for(const g of CASE_GROUPS) for(const lang of ['en','es']){ out.n++;
      const m=caseModel(x.id,{type:g.type,group:g.id},{timing:'options',lang,now:${NOW}}); __scan(m,caseDeck(m)).forEach(h=>out.dated.push([x.id,g.id,lang,h])); } return out; })()`);
  c(`every slide of all ${b.n} decks (103 built-ins × 34 groups, each its own kind, EN and ES): no day of the month`, b.dated.slice(0,3), []);
  P.E(`planSave(${JSON.stringify(PLAN)}); uPersist();`);
  const p=P.J(`(()=>{ const out=[]; for(const lang of ['en','es']){ const m=caseModel(CASE_PLAN_ID,{type:'conference',group:'conference'},{timing:'options',lang,now:${NOW}}); __scan(m,caseDeck(m)).forEach(h=>out.push(h[2])); } return out; })()`);
  c('the conference’s series: its dates, each one said proposed', [p.length>=8,p.every(t=>/propos|propuest/i.test(t))], [true,true]);
  P.E(`uChurch().plan=null; uPersist();`);
  // every library idea's board deck, EN and ES
  P.E(`window.__libDone=false; (async()=>{ await libLoadIndex(); await Promise.all([...new Set(LIB.rows.map(r=>r.theme))].map(libLoadTheme)); window.__libDone=true; })();`);
  await until(()=>P.E('window.__libDone'),60000);
  const l=P.J(`(()=>{ const out={n:0,dated:[],named:[]}; const ch=uChurch(); for(const r of LIB.rows){ ch.lib={}; const f=libFull(r.id); if(!f) continue; ch.lib[r.id]=f;
      for(const lang of ['en','es']){ out.n++; const m=caseModel(r.id,{type:'board',group:'board'},{timing:'options',lang,now:${NOW}}); if(!m.ok) continue;
        __scan(m,caseDeck(m)).forEach(h=>out.dated.push([r.id,lang,h]));
        if(new RegExp(${JSON.stringify(DAY_RX.source)},'i').test(m.ministry.name)) out.named.push(r.id); } } ch.lib={}; return out; })()`);
  c(`every library idea’s board deck (${l.n}, EN and ES): no day of the month but the idea’s own name`, l.dated.slice(0,3), []);
  c('…the eight named for an observance ("…on August 31", "el 4 de julio", "October 15 candle evening…")', [...new Set(l.named)].sort(),
    ['addiction-overdose-vigil-park','first-responders-first-responders-sabbath','first-responders-september-11-remembrance','grief-wave-of-light-infant-loss',
     'holidays-bill-of-rights-reading','holidays-october-driveway-cocoa','holidays-parade-ice-water','stewardship-statements-with-thanks']);
  });

  c('no page errors', P.errs.slice(0,3), []);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
})();
