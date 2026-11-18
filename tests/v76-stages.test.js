// v10.76.0 — Proposal, a project or a purchase: the kinds in two taps (a group, then the kind); Who decides is three stages, the
// finance committee, the church board and the business meeting, all on by default, a tick to leave one out, no amount boxes; step 5
// offers one set (slides, handout, Proposal to vote on) for each stage. The pastor (17 Nov 2026): "it says sound livestream lighting
// now these are all one categories so they should be under categories … if it's audiovisual then that's one thing … Most proposals
// will go to the finance committee first then the board … we don't want the finance committee to prepare the proposal. We want them to
// present the proposal, if it goes through and then a proposal to the Church body so those are the three proposals." Design:
// ~/Ministry Work/Terrain-work/v91/DESIGN-STAGES.md. Written failing-first against v10.75.0.
const fs=require('fs'), path=require('path');
const H=require('./v43-helpers.js');
const {c,page,ready,done,until,sleep,FX,SEED}=H;
const HTML=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const ADDR=SEED('purchase')['terrain-churches-v1'].churches['sample-sampleton-sda'].address;
const DATA={...FX.DATA,geo:{...FX.DATA.geo,matched:ADDR}};
const ID='buy-avs001';
const tx=(P,s)=>{ const e=typeof P.q==='function'?P.q(s):P.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; };
async function open(L,prefs){
  const P=await ready(page('purchase',L,{data:DATA}));
  P.E(`(()=>{ const ch=uChurch(); ch.proposalPrefs={...(ch.proposalPrefs||{}),...${JSON.stringify(prefs||{path:'buy',buy:ID})}}; uPersist(); openTool('case'); render(); return 1; })()`);
  await until(()=>P.q('#bx-s1'),8000);
  return P;
}
(async()=>{
  const P=await open('en');
  c('no page errors', P.errs, []);

  console.log('\n-- step 1: the kinds in two taps --');
  c('the seed project (a livestream camera): its group lit, its kind lit in the second row', [P.qa('#bx-s1 [data-bx-grp]').map(b=>[b.dataset.bxGrp,b.textContent.trim(),b.getAttribute('aria-pressed')]),P.qa('#bx-s1 [data-bx-cat]').map(b=>[b.dataset.bxCat,b.getAttribute('aria-pressed')])],
    [[['av','Sound, video & music','true'],['grounds','Building & grounds','false'],['vehicle','Vehicle','false'],['other','Something else','false']],[['sound','false'],['stream','true'],['light','false'],['computer','false'],['music','false']]]);
  c('the two questions', [tx(P,'#bx-catq'),tx(P,'#bx-subq')], ['What kind of need?','Which one?']);
  P.q('[data-bx-item=""]').click(); await sleep(60);
  c('"+ New": the four groups, no kinds yet, no project made', [P.qa('#bx-s1 [data-bx-grp]').length,P.qa('#bx-s1 [data-bx-cat]').length,P.J('BUY_ST.id')], [4,0,null]);
  P.q('#bx-s1 [data-bx-grp="av"]').click(); await sleep(60);
  c('a tap on Sound, video & music: the five kinds appear; still no project', [P.qa('#bx-s1 [data-bx-cat]').map(b=>b.textContent.trim()),P.J('BUY_ST.id'),P.q('#bx-s1 [data-bx-grp="av"]').getAttribute('aria-pressed')],
    [['Sound','Livestream & video','Lighting','Computer & projector','Music instruments'],null,'true']);
  P.q('#bx-s1 [data-bx-cat="light"]').click(); await sleep(60);
  const nid=P.E('BUY_ST.id');
  c('a tap on Lighting makes the project: Lighting, the media team, the name box', [/^buy-[a-z0-9]{6}$/.test(nid),P.J(`(()=>{ const it=buyGet(BUY_ST.id); return [it.cat,it.kind,it.team]; })()`),!!P.q('#bx-s1 [data-bx-f="need"]')], [true,['light','buy','media'],true]);
  P.q('#bx-s1 [data-bx-grp="grounds"]').click(); await sleep(60);
  c('a purchase: Building & grounds has one kind (the kitchen), so the tap picks it at once', P.J(`(()=>{ const it=buyGet(BUY_ST.id); return [it.cat,it.team]; })()`), ['kitchen','deacons']);
  c('…and the second row is not drawn for one kind', P.qa('#bx-s1 [data-bx-cat]').length, 0);
  P.q('#bx-s1 [data-bx-grp="vehicle"]').click(); await sleep(60);
  c('Vehicle: one kind, picked at once', P.J(`buyGet(BUY_ST.id).cat`), 'vehicle');
  P.E(`(()=>{ buyDrop(BUY_ST.id); BUY_ST.id=null; caseSetPrefs({buy:'new'}); return 1; })()`);
  // a project
  const R=await open('en',{path:'project',buy:'new'});
  R.q('#bx-s1 [data-bx-grp="grounds"]').click(); await sleep(60);
  c('a project: Building & grounds offers Building repair and Kitchen', [R.qa('#bx-s1 [data-bx-cat]').map(b=>b.textContent.trim()),R.J('BUY_ST.id')], [['Building repair','Kitchen'],null]);
  R.q('#bx-s1 [data-bx-cat="building"]').click(); await sleep(60);
  c('…Building repair tapped: a project, repair, the deacons', R.J(`(()=>{ const it=buyGet(BUY_ST.id); return [it.cat,it.kind,it.team]; })()`), ['building','repair','deacons']);
  c('the groups are read from one table (every kind in exactly one group)', R.J(`(()=>{ const all=BUY_GROUP_ORDER.flatMap(g=>BUY_GROUPS[g].cats); return [all.slice().sort().join(','),BUY_CAT_ORDER.slice().sort().join(','),BUY_CAT_ORDER.every(k=>buyGroupOf(k))]; })()`),
    [BUY_SORTED(),BUY_SORTED(),true]);

  console.log('\n-- step 4: who decides, three stages --');
  c('a new project: the finance committee, the church board and the business meeting, in order; no amount rule adds or removes one', R.J(`(()=>{ const it=buyGet(BUY_ST.id); buyRulesSet({businessAt:100}); const a=buyPathOf(it); buyRulesSet({businessAt:null}); return a; })()`),
    {path:['finance','board','business'],conf:false,bizAuto:false});
  c('…its audiences: the three stages, nothing else', R.J(`buyAudiences(buyGet(BUY_ST.id))`), ['finance','board','business']);
  c('the seed project keeps its own path (finance › board), and its audiences follow it', [P.J(`buyPathOf(buyGet('${ID}')).path`),P.J(`buyAudiences(buyGet('${ID}'))`)], [['finance','board'],['finance','board']]);
  // the seed project's step 4
  P.E(`(()=>{ buySelect('${ID}'); return 1; })()`); await sleep(60);
  c('the three stage cards, their names, their lines; the seed\'s ticks: finance and board on, the business meeting off', P.qa('#bx-s4 .bx-stage').map(e=>[e.dataset.bxStage,tx(e,'b'),tx(e,'small'),e.querySelector('input')?e.querySelector('input').checked:null]),
    [['finance','Finance committee','Looks at the money first and recommends it to the board.',true],['board','Church board','Votes to approve it, or sends it on to the church.',true],['business','Business meeting','The whole church votes.',false]]);
  c('the note, and the step\'s line', [tx(P,'#bx-s4 .bx-stnote'),tx(P,'#bx-s4 .cs-sh .note')], ['Untick a stage your church does not need. At least one stays.','Who has to say yes, in order. Untick a stage your church does not need.']);
  c('gone from step 4: the church line and Change, the tick editor, the business-meeting amount, the three-quotes amount, "Make slides for" and the audience tiles', [!!P.q('#bx-s4 .cd-path'),!!P.q('#bx-s4 [data-bx-path]'),!!P.q('[data-bx-rule="businessAt"]'),!!P.q('[data-bx-rule="quotesAt"]'),!!P.q('#bx-s4 .bx-sfor'),P.qa('#bx-s4 [data-bx-aud]').length], [false,false,false,false,false,0]);
  c('the trail and Record what we decided stay', [!!P.q('#bx-dec [data-bx-record]'),P.qa('#bx-dec .cd-row').length], [true,2]);
  P.q('#bx-s4 .bx-stage[data-bx-stage="business"] input').click(); await sleep(60);
  c('the business meeting ticked: the path saved on the project, step 3 asks for its date, the bar says the three', [P.J(`buyGet('${ID}').path`),P.qa('#bx-s3 [data-bx-date]').map(i=>i.dataset.bxDate).slice(0,3),tx(P,'#bx-bar [data-bx-jump="4"] small')],
    [['finance','board','business'],['finance','board','business'],'Finance committee › Church board › Business meeting']);
  P.q('#bx-s4 .bx-stage[data-bx-stage="finance"] input').click(); await sleep(60);
  P.q('#bx-s4 .bx-stage[data-bx-stage="board"] input').click(); await sleep(60);
  c('finance and board unticked: the business meeting alone', P.J(`buyGet('${ID}').path`), ['business']);
  P.q('#bx-s4 .bx-stage[data-bx-stage="business"] input').click(); await sleep(60);
  c('the last one cannot be unticked: refused in words, still ticked, the path unchanged', [tx(P,'#bx-s4 [data-bx-pmsg]'),P.q('#bx-s4 .bx-stage[data-bx-stage="business"] input').checked,P.J(`buyGet('${ID}').path`)], ['Tick at least one.',true,['business']]);
  P.E(`(()=>{ const it=buyGet('${ID}'); it.path=['finance','board']; buySave(it); buyDrawAll(); return 1; })()`);
  P.E(`(()=>{ const it=buyGet('${ID}'); it.kind='build'; it.cat='building'; buySave(it); buyDrawAll(); return 1; })()`);
  c('Build or add on: the conference is a fourth card with no tick, its line the Church Manual\'s words (.bx-conf kept)', [P.qa('#bx-s4 .bx-stage').map(e=>e.dataset.bxStage),!!P.q('#bx-s4 .bx-stage.bx-stconf input'),P.qa('#bx-s4 .bx-conf').map(e=>e.textContent)],
    [['finance','board','business','conference'],false,['Conference and union approval before any commitment (Church Manual)']]);
  c('…and the conference among the audiences', P.J(`buyAudiences(buyGet('${ID}'))`), ['finance','board','conference']);
  P.E(`(()=>{ const it=buyGet('${ID}'); it.kind='repair'; it.cat='building'; buySave(it); buyDrawAll(); return 1; })()`);
  c('a building repair: the conference\'s review amount is still asked (his conference\'s rule), the only box', P.qa('#bx-s4 [data-bx-rule]').map(i=>i.dataset.bxRule), ['confAt']);
  P.E(`(()=>{ const it=buyGet('${ID}'); it.kind='buy'; it.cat='stream'; buySave(it); buyDrawAll(); return 1; })()`);
  c('a purchase: no box at all', P.qa('#bx-s4 [data-bx-rule]').length, 0);
  c('the steps\' state: step 4 is done once the money is planned (the path always stands)', P.J(`(()=>{ const s=buyStepState(); return [s.done[2],s.done[3]]; })()`), [true,true]);

  console.log('\n-- step 5: one set for each stage --');
  c('the stages as tabs, the first open: finance, board (the seed\'s path)', [tx(P,'#bx-s5 .bx-stabl'),P.qa('#bx-s5 [data-bx-aud]').map(b=>[b.dataset.bxAud,tx(b,'b'),b.getAttribute('aria-pressed')])],
    ['Present to:',[['finance','Finance committee','true'],['board','Church board','false']]]);
  c('the finance committee\'s set: the slides, Present live, Share, the handout and the Proposal to vote on', [P.qa('#bx-s5 [data-bx-act]').map(b=>b.textContent),!!P.q('#bx-pv [data-cs-phone]'),P.J('BUY_ST.model.aud')],
    [['Present live','Share link & QR','Handout (PDF)','Proposal to vote on (PDF)'],true,'finance']);
  c('…its motion recommends to the church board; its ask slide says so', P.J(`(()=>{ const m=BUY_ST.model, d=BUY_ST.deck; return [m.nextBody,d.slides.some(s=>s.type==='ask'&&s.headline==='Recommend the purchase to the church board')]; })()`), ['board',true]);
  P.q('#bx-s5 [data-bx-aud="board"]').click(); await sleep(60);
  c('the board tapped: its set, saved as the stage he is on', [P.J(`buyGet('${ID}').aud`),P.J('BUY_ST.model.aud'),P.q('#bx-s5 [data-bx-aud="board"]').getAttribute('aria-pressed')], ['board','board','true']);
  P.E(`(()=>{ caseDecSave('${ID}',{v:1,body:'finance',date:'2026-10-01',outcome:'recommended',vote:{for:5,against:0}}); buyDraw4(); buyDraw5(); return 1; })()`);
  c('a decision recorded: the finance tab says so under its name', tx(P,'#bx-s5 [data-bx-aud="finance"] small'), 'Recommended 1 Oct 2026');
  P.E(`(()=>{ caseDecDrop('${ID}','finance'); const it=buyGet('${ID}'); it.path=['finance','board','business']; buySave(it); buyDrawAll(); return 1; })()`);
  c('the three stages as tabs; the board\'s outcomes gain "Recommended to the business meeting"', [P.qa('#bx-s5 [data-bx-aud]').map(b=>b.dataset.bxAud),P.J(`caseDecOutcomes('board',buyPathOf(buyGet('${ID}')).path).map(o=>o.k)`)],
    [['finance','board','business'],['approved','recommended','amended','referred','declined']]);
  c('the step\'s line', tx(P,'#bx-s5 .cs-sh .note'), 'Each stage has its own slides, handout and Proposal to vote on. Check them, then present.');

  console.log('\n-- Spanish --');
  const S=await open('es');
  c('the groups, the kinds, the questions', [S.qa('#bx-s1 [data-bx-grp]').map(b=>b.textContent.trim()),S.qa('#bx-s1 [data-bx-cat]').map(b=>b.textContent.trim()),tx(S,'#bx-catq'),tx(S,'#bx-subq')],
    [['Sonido, video y música','Edificio y terreno','Vehículo','Otra cosa'],['Sonido','Transmisión y video','Iluminación','Computadora y proyector','Instrumentos musicales'],'¿Qué tipo de necesidad?','¿Cuál?']);
  c('the stages', S.qa('#bx-s4 .bx-stage').map(e=>[tx(e,'b'),tx(e,'small')]), [['Comisión de finanzas','Revisa primero el dinero y lo recomienda a la junta.'],['Junta directiva','Vota para aprobarlo, o lo pasa a la iglesia.'],['Reunión administrativa','Vota toda la iglesia.']]);
  c('the note, the lines, the tabs', [tx(S,'#bx-s4 .bx-stnote'),tx(S,'#bx-s4 .cs-sh .note'),tx(S,'#bx-s5 .cs-sh .note'),tx(S,'#bx-s5 .bx-stabl')],
    ['Desmarque una etapa que su iglesia no necesite. Al menos una se queda.','Quién tiene que dar el sí, en orden. Desmarque una etapa que su iglesia no necesite.','Cada etapa tiene sus propias diapositivas, folleto y propuesta para votar. Revíselos y presente.','Presentar a:']);
  c('no page errors (EN, project, ES)', [P.errs,R.errs,S.errs], [[],[],[]]);

  console.log('\n-- the stamps --');
  c('the six stamps say v10.76.0', [(HTML.match(/v10\.76\.0/g)||[]).length>=6,/const VERSION = 'v10\.76\.0'/.test(HTML)], [true,true]);
  done();
})();
function BUY_SORTED(){ return ['building','computer','kitchen','light','music','other','sound','stream','vehicle'].join(','); }
