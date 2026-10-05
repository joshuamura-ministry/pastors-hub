// Make the Case screens (v10.39.0): the ranked ministry picker and its filter,
// who you are asking (three kinds, then the group), the slide preview (every
// slide type renders), headline and label edits (saved per church + ministry +
// group + language, and reaching the deck that is presented), the private ask
// list (names for the pastor only, never in the deck), the sample slideshow
// (marked SAMPLE, saves nothing, keepDays 1), Make the Case before a survey,
// and Spanish. jsdom does no layout: the fit of each slide is checked in Chrome.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,500));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Allegheny East',role:'pastor'};
function page(lang,store){
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(lang) w.localStorage.setItem('terrain-lang',lang);
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      if(store) Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,v));
      // v10.41: step 2 is the Idea Library's list, so the shipped ideas/ files are served
      w.fetch=async(u)=>{ u=String(u); const m=/^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if(m){ const f=path.resolve(__dirname,'..','ideas',m[1]+'.json'); if(!fs.existsSync(f)) return {ok:false,status:404,json:async()=>null}; const t=fs.readFileSync(f,'utf8'); return {ok:true,status:200,json:async()=>JSON.parse(t)}; }
        if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,D:w.document,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
// The survey with margins of error (the fixture has none), the MEDIUM church and
// eight members: one of them under 18, one who answered high almost everywhere.
function setup(P,o){
  o=o||{};
  P.E(`(()=>{ const D=${JSON.stringify(FX.DATA)};
    D.M.tract.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.tract.moe)); D.M.county.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.county.moe));
    Object.assign(D.M.tract,{age5_9:420,age10_14:395,age15_17:236});
    DATA=D; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)});
    ${o.members===false?'uChurch().members=[];':`
    const mk=b=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=b.includes(g.id)?4:1; }); return gfScores(a); };
    const P=(i,name,b,h,x)=>({id:'m'+i,name,gifts:mk(b),heart:h,confirmed:true,willing:true,hours:6,skills:['kids'],source:'manual',...(x||{})});
    uChurch().members=[P(0,'Ana Lopez',['teach','shep','creative','helps'],{children:2,families:2}),P(1,'Ben Carter',['teach','shep','encour'],{children:1}),
      P(2,'Cara Diaz',['teach','creative','helps','mercy'],{}),P(3,'Dan Evans',['admin','leader','giving'],{poor:2}),P(4,'Eve Fox',['mercy','helps','serve','hosp'],{poor:2,families:1}),
      P(5,'Gus Hill',['evang','mission','hosp'],{newcomers:2}),P(6,'Ivy Young',['teach','shep','creative','helps'],{children:2},{minor:true}),
      P(7,'Hal Moss',['teach','shep','helps','mercy','encour'],{children:2},{flags:{allHigh:true}})];`}
    uPersist(); openTool('case'); render(); })()`);
}
const NAMES=['Ana Lopez','Ben Carter','Cara Diaz','Dan Evans','Eve Fox','Gus Hill','Ivy Young','Hal Moss'];
const click=(P,s)=>{ const e=P.q(s); if(!e) throw new Error('no element '+s); e.click(); };
const type=(P,s,v)=>{ const e=P.q(s); if(!e) throw new Error('no element '+s); e.value=v; e.dispatchEvent(new P.w.Event('input',{bubbles:true})); };

(async()=>{
  const P=page(); await sleep(1500);
  c('no boot errors', P.errs, []);

  console.log('\n-- the old proposal is gone --');
  c('buildProposal, uProposalControls, uDrawProposal, AUD, TAILOR, OPENERS, proposalCharts, U_ROLE: all removed',
    P.J(`[typeof buildProposal,typeof uProposalControls,typeof uDrawProposal,typeof wireProposals,typeof AUD,typeof AUD_EMPH,typeof TAILOR,typeof OPENERS,typeof tailorFor,typeof proposalCharts,typeof U_ROLE]`),
    Array(11).fill('undefined'));
  c('…while the survey’s donut, the ministry cards’ money table and the chart download stay', P.J(`[typeof donut,typeof donutOf,typeof uMoneyTable,typeof downloadChart]`), ['function','function','function','function']);
  setup(P);
  c('no emoji audience buttons, no #propslot', P.qa('.audbtn,.audgrid,#propslot').length, 0);

  // Updated v10.41 (the pastor: "'Who are you making the case to?' should be first. The three steps must be
  // definable… Why do I type Prayer under 'What are you proposing?' and get four things, then 84 things
  // underneath? Out of order."): step 1 is who it is for (the groups), step 2 ONE list of ideas tailored to the
  // group, built-ins as cards in it (tests/case-steps.test.js covers both in full). The ranked built-in cards with
  // their figures, the "Can staff now" filter and the link down to the departments are gone.
  console.log('\n-- step 1: who is it for? --');
  const boards=P.J(`CASE_GROUPS.filter(g=>g.type==='board').map(g=>g.id)`), teams=P.J(`CASE_GROUPS.filter(g=>g.type==='team').map(g=>g.id)`);
  // v10.41 integration: builder D's eleven groups are real now (the pastor: "all the things we would have as a
  // denomination … We also have an evangelism team" and "we can appeal to the conference leaders for an EVANGELISM
  // proposal"): 34 groups, and the conference in its own section.
  c('all 34 groups at once, none chosen yet', [P.qa('#cs-s1 [data-cs-group]').length,P.qa('#cs-s1 [data-cs-group][aria-pressed="true"]').length], [34,0]);
  // v10.47.0 — the pastor (5 Oct 2026): "decide … should be leadership … then Ministry departments"; board, finance, business meeting, elders, deacons; "not the nominating committee" (now under Ministry departments › Other committees)
  c('…in coloured sections', P.qa('#cs-s1 .cs-aud h4').map(h=>h.textContent), ['Leadership','Ministry departments','On Sabbath','The conference']);
  c('…the board groups under Decide, the teams under Ministry teams, the whole church and the conference on their own', P.qa('#cs-s1 .cs-aud').map(s=>[...s.querySelectorAll('[data-cs-group]')].map(b=>b.dataset.csGroup).sort()), [boards.filter(x=>x!=='nominating').sort(),teams.concat(boards.includes('nominating')?['nominating']:[]).sort(),['congregation'],['conference']]);
  c('…no kind cards and no chips any more', P.qa('[data-cs-type],.cs-type,.cs-chip').length, 0);
  c('no ranked ministry cards, no "Can staff now", no department link', [!!P.q('#cs-grid'),!!P.q('[data-cs-filter]'),!!P.q('[data-cs-deptjump]')], [false,false,false]);
  click(P,'[data-cs-group="youth"]');
  c('one tap on the youth staff chooses the group and its kind, saved', [P.J('casePrefs()'),P.q('[data-cs-group="youth"]').getAttribute('aria-pressed')], [{ministry:null,type:'team',group:'youth',plan:false},'true']);

  console.log('\n-- step 2: what will you propose? --');
  await until(()=>P.qa('#cs-lib .lib-card').length>0);
  c('one list, in the Idea Library\'s card style', [P.qa('#cs-lib .lib-card').length>0,!!P.q('#cs-lib .lib-sec[data-lib-sec="out"]')], [true,true]);
  type(P,'#cs-q','pantry'); await until(()=>P.q('#cs-lib .lib-head h3'),8000); await until(()=>P.q('#cs-lib .lib-sig'),8000);
  c('search finds built-ins by name ("pantry"), as cards', P.qa('#cs-lib .lib-sig').map(e=>e.dataset.libId).filter(id=>/pantry/.test(id)).sort(), ['food-pantry','pantry-box']);
  type(P,'#cs-q','zzqq'); await until(()=>/zzqq/.test(P.txt('#cs-lib')||''),8000);
  c('…and says so when nothing matches', /No library ideas match “zzqq”/.test(P.txt('#cs-lib')), true);
  type(P,'#cs-q','Pathfinder'); await until(()=>P.q('#cs-lib .lib-sig[data-lib-id="pathfinders"]'),8000);
  click(P,'#cs-lib .lib-sig[data-lib-id="pathfinders"] [data-lib-case]');
  c('choosing one saves it for this church', P.J(`uChurch().proposalPrefs.ministry`), 'pathfinders');
  c('…the list folds to the chosen card, with Change', [P.qa('#cs-s2 .lib-card').length,P.q('#cs-s2 .lib-card').dataset.libId,!!P.q('[data-cs-change]')], [1,'pathfinders',true]);
  c('…and the slides are there for the youth staff', [P.q('#cs-s3').hidden,P.J(`caseCurrentDeck().audience`)], [false,{type:'team',group:'youth'}]);
  c('nothing in Make the Case is contenteditable', P.qa('#casebody [contenteditable]').length, 0);
  click(P,'[data-cs-group="health"]');
  c('a tile chooses the group, saved', [P.J(`casePrefs()`),P.J(`uChurch().proposalPrefs.group`),P.q('[data-cs-group="health"]').getAttribute('aria-pressed')], [{ministry:'pathfinders',type:'team',group:'health',plan:false},'health','true']);
  c('…and the slides are built for it', P.J(`caseCurrentDeck().audience`), {type:'team',group:'health'});
  c('…while step 2 opens the health list, keeping the idea until another is chosen', [!!P.q('#cs-s2 [data-cs-keep]'),P.J('casePrefs().ministry')], [true,'pathfinders']);
  click(P,'#cs-s2 [data-cs-keep]');
  click(P,'[data-cs-group="board"]');
  c('board: the church board tile gives the board kind', [P.J('casePrefs().type'),P.J('casePrefs().group'),P.qa('#cs-s1 [aria-pressed="true"]').length], ['board','board',1]);
  click(P,'[data-cs-group="congregation"]');
  c('congregation: the whole church', [P.J('casePrefs().type'),P.J('casePrefs().group')], ['congregation','congregation']);
  P.E('CASE_ST.pick=false; caseDraw2();');

  console.log('\n-- step 3: the slides --');
  const types=new Set();
  for(const [t,g] of [['board','board'],['team','youth'],['congregation','congregation']]){
    click(P,`[data-cs-group="${g}"]`);   // v10.40.0: one tap, group and kind
    const deck=P.J('caseCurrentDeck()'), secs=P.qa('#cs-pv .td-slide');
    c(`${t}: one slide on screen per slide in the deck (${deck.slides.length})`, secs.length, deck.slides.length);
    // Built with "I'm in" as the presenter's setup starts it (on), so the preview is the deck presented (v10.39 review E2E-12).
    // v10.42: and with the timing setting, "Suggest options" by default (the pastor, 29 Sep 2026: "a proposal should give them
    // options… instead of dictating dates"), so the board and team decks carry "Let's decide together" (10 slides, not 9)
    c(`${t}: the deck is caseDeck(caseModel(…,{respond:true,timing:'options'})) exactly (no edits yet)`, JSON.stringify(deck), JSON.stringify(P.J(`caseDeck(caseModel('pathfinders',{type:'${t}',group:'${g}'},{respond:true,timing:'options'}))`)));
    c(`${t}: each slide is drawn as its type`, secs.map(s=>[...s.classList].find(k=>/^td-t-/.test(k))), deck.slides.map(s=>'td-t-'+s.type));
    secs.forEach(s=>types.add([...s.classList].find(k=>/^td-t-/.test(k)).slice(5)));
    c(`${t}: nothing reads "undefined", "NaN" or "null"`, /undefined|NaN|\bnull\b/.test(P.txt('#cs-pv')), false);
  }
  // v10.40 (the pastor asked for it): "Here in {town}" (place) in every deck; the "why here" trio
  // is drawn only when a deck has no place data at all
  // v10.42 part 3: How it works in every deck; one timing slide ("Let's decide together", an ask, with the screens' Suggest options)
  c('the three kinds together draw every slide type', [...types].sort(), ['ability','ask','capacity','close','how','join','motion','place','risks','roles','stat','verse','yes']);
  click(P,'[data-cs-group="board"]');
  // v10.42: ten slides on the board's deck ("Let's decide together" before the ask); the moves are the same
  // v10.42 part 3: eleven (How it works, and the appeal back to the goal at the end: DESIGN.md §5)
  c('the position reads "1 / 11"; Previous is off', [P.txt('.cs-pos'),P.q('[data-cs-prev]').disabled], ['1 / 11',true]);
  click(P,'[data-cs-next]');
  c('Next moves one slide', [P.txt('.cs-pos'),P.E('CASE_ST.pv.index()'),P.q('.cs-outline [aria-current="true"]').dataset.csGo], ['2 / 11',1,'1']);
  P.q('[data-cs-phone]').dispatchEvent(new P.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  c('the arrow keys move it too', P.txt('.cs-pos'), '3 / 11');
  // v10.40.0: the slides move sideways; inside the slides the keys, the swipe and a mouse drag are the
  // renderer's own. One key press = one slide (the preview's frame must not move it a second time).
  { const sc=P.q('#cs-pv .td-scroller'), k=(key,o={})=>sc.dispatchEvent(new P.w.KeyboardEvent('keydown',Object.assign({key,bubbles:true,cancelable:true},o)));
    k('ArrowRight'); c('v10.40: → with focus in the slides moves exactly one slide, and the position, list and buttons follow', [P.txt('.cs-pos'),P.E('CASE_ST.pv.index()'),P.q('.cs-outline [aria-current="true"]').dataset.csGo], ['4 / 11',3,'3']);
    k('PageUp'); k(' ',{shiftKey:true}); c('v10.40: PageUp and Shift+Space (a clicker) move back one each', P.txt('.cs-pos'), '2 / 11');
    const pd=(t,x)=>{ const e=new P.w.MouseEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:200,button:0}); Object.defineProperty(e,'pointerType',{value:'mouse'}); sc.dispatchEvent(e); };
    pd('pointerdown',300); pd('pointerup',150);
    c('v10.40: a mouse drag to the left in the preview = next, once', [P.txt('.cs-pos'),P.E('CASE_ST.pv.index()')], ['3 / 11',2]);
    c('v10.40: the preview’s dots follow', [...P.qa('#cs-pv .td-pager i')].map((d,i)=>d.classList.contains('on')?i:-1).filter(i=>i>=0), [2]); }
  click(P,'.cs-outline [data-cs-go="10"]');
  c('the list of slides jumps to one; Next is off at the last', [P.txt('.cs-pos'),P.q('[data-cs-next]').disabled], ['11 / 11',true]);
  click(P,'.cs-outline [data-cs-go="0"]');
  c('the join slide: nothing to reword, and it says why', [P.qa('.cs-edit [data-cs-f]').length,/QR code and the six-letter code/.test(P.txt('.cs-edit'))], [0,true]);
  c('…with the QR code’s place kept in the preview', [!!P.q('#cs-pv .td-t-join .cs-qrph'),P.qa('#cs-pv .cs-qrph span').map(s=>s.textContent)], [true,['QR code','when you present live']]);

  console.log('\n-- the pastor’s own words --');
  click(P,'.cs-outline [data-cs-go="1"]');
  const key=P.E('caseEditKey()');
  c('the motion slide: a label and a headline, as plain inputs', [P.q('#cs-e-kicker').tagName,P.q('#cs-e-headline').tagName,P.q('#cs-e-kicker').maxLength,P.q('#cs-e-headline').maxLength], ['INPUT','TEXTAREA',34,140]);
  c('…filled with the slide’s words', P.q('#cs-e-headline').value, P.J('caseCurrentDeck().slides[1].headline'));
  const H='Approve six weeks of a Pathfinder club for the neighborhood', K='Our motion';
  type(P,'#cs-e-headline',H); type(P,'#cs-e-kicker',K);
  c('typing saves at once for this church, ministry, group and language', [key,P.J(`uChurch().caseEdits['${key}']['motion:0'].headline`),P.J(`uChurch().caseEdits['${key}']['motion:0'].kicker`)], ['pathfinders|board|board|en',H,K]);
  await sleep(450);
  c('…and reaches the deck', [P.J('caseCurrentDeck().slides[1].headline'),P.J('caseCurrentDeck().slides[1].kicker')], [H,K]);
  c('…the slide on screen', [P.txt('#cs-pv .td-slide[data-i="1"] .td-head'),P.txt('#cs-pv .td-slide[data-i="1"] .td-kick')], [H,K]);
  c('…the list marks it Edited', /Edited/.test(P.q('.cs-outline [data-cs-go="1"]').textContent), true);
  c('…and it is on the device', (P.w.localStorage.getItem('terrain-churches-v1')||'').includes(H), true);
  c('the other slides are untouched', P.J('caseCurrentDeck().slides.filter((s,i)=>i!==1)'), P.J(`caseDeck(caseModel('pathfinders',{type:'board',group:'board'},{timing:'options'})).slides.filter((s,i)=>i!==1)`));   // v10.42: the default timing
  // v10.39.0, the presenting step: the stub that said "not switched on" is replaced by
  // the real setup (tests/present-client.test.js covers it); here, only that it opens.
  click(P,'[data-cs-act="present"]');
  c('Present live opens its setup over the page (Start presenting, Cancel)', [P.q('#casepres').hidden,P.txt('#casepres [data-pr-start]'),P.txt('#casepres [data-pr-cancel]')], [false,'Start presenting','Cancel']);
  click(P,'#casepres [data-pr-cancel]');
  c('…and Cancel closes it', [P.q('#casepres').hidden,P.qa('#casepres *').length], [true,0]);
  { const got=[]; P.w.caseOpenPresenter=(d,o)=>{ got.push([d,o]); return true; };
    click(P,'[data-cs-act="present"]');
    c('Present live hands over the deck with the pastor’s words', [got.length,got[0]&&got[0][0].slides[1].headline,JSON.stringify(got[0]&&got[0][0])===JSON.stringify(P.J('caseCurrentDeck()')),!!(got[0]&&got[0][1].model&&got[0][1].model.ok)], [1,H,true,true]); }
  { const got=[]; P.w.caseShare=(d,o)=>{ got.push(d); return true; }; P.w.casePdf=(m,o)=>{ got.push([m.ok,o.deck.slides[1].headline]); return true; };
    click(P,'[data-cs-act="share"]'); click(P,'[data-cs-act="pdf"]');
    c('Share link & QR and the PDF handout get the same deck', [got[0].slides[1].headline,got[1]], [H,[true,H]]); }
  P.E('render()');
  c('after the survey is drawn again, the words are still there', [P.J('caseCurrentDeck().slides[1].headline'),P.txt('#cs-pv .td-slide[data-i="1"] .td-head')], [H,H]);
  { const R=page(null,{'terrain-churches-v1':P.w.localStorage.getItem('terrain-churches-v1')}); await sleep(1500);
    R.E(`DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; openTool('case'); render();`);
    c('…and after a reload', R.J('caseCurrentDeck().slides[1].headline'), H);
    c('…no errors there', R.errs, []); }
  click(P,'[data-cs-group="elders"]');
  c('another group has its own words (the elders see the original)', P.J('caseCurrentDeck().slides[1].headline')!==H, true);
  click(P,'[data-cs-group="board"]');
  c('…and back at the board, the edit is there again', P.J('caseCurrentDeck().slides[1].headline'), H);
  c('Spanish slides keep their own words (nothing saved under ES)', P.J(`(()=>{ const p=LANG; LANG='es'; const e=caseEdits(); LANG=p; return e; })()`), {});
  click(P,'.cs-outline [data-cs-go="1"]');
  type(P,'#cs-e-kicker','');
  c('an emptied label means the original, never a blank', [P.J(`uChurch().caseEdits['${key}']['motion:0'].kicker===undefined`),P.J(`uChurch().caseEdits['${key}']['motion:0'].headline`)], [true,H]);
  await sleep(450);
  click(P,'[data-cs-restore]');
  c('Restore the original removes the edit', [P.J(`uChurch().caseEdits['${key}']||null`),P.J('caseCurrentDeck().slides[1].headline')===H,P.q('[data-cs-restore]').disabled], [null,false,true]);
  P.E(`uChurch().caseEdits={'${key}':{'motion:0':{headline:'Our words',was:{headline:'Words from before the scope changed'}}}}; caseMount(); CASE_ST.pv.go(1);`);
  c('an edit made before the figures changed is flagged', P.q('[data-cs-stale]').hidden, false);
  c('…still shown as he wrote it', P.J('caseCurrentDeck().slides[1].headline'), 'Our words');
  P.E(`capClearAll(); caseMount(true);`);
  c('Clear all clears the edits with the rest of the church’s working data', P.J('uChurch().caseEdits'), {});

  console.log('\n-- the private ask list --');
  setup(P); P.E(`uChurch().proposalPrefs={ministry:'pathfinders',type:'board',group:'board'}; caseMount(true);`);
  c('closed at first: the names are not in the page', [P.q('#cs-ask').hidden,P.q('#cs-ask').innerHTML,P.q('[data-cs-act="ask"]').getAttribute('aria-expanded')], [true,'','false']);
  click(P,'[data-cs-act="ask"]');
  const listed=P.qa('#cs-ask .cs-an b').map(b=>b.textContent);
  c('open: the adults whose gifts fit, by name, for the pastor', [listed.length>=3,listed.every(n=>NAMES.includes(n)),P.q('[data-cs-act="ask"]').getAttribute('aria-expanded')], [true,true,'true']);
  c('…never an under-18', listed.includes('Ivy Young'), false);
  c('…someone who answered high almost everywhere is marked', (()=>{ const row=P.qa('#cs-ask .cs-arow').find(r=>/Hal Moss/.test(r.textContent)); return row?/Answered high almost everywhere/.test(row.textContent):'not listed'; })(), true);
  c('…with a status and a role each', P.qa('#cs-ask .cs-arow').every(r=>r.querySelector('.gfb')&&r.querySelector('.cs-an .note').textContent.length>3), true);
  c('…and the rule said plainly: this device only, never on a slide', /This device only/.test(P.txt('#cs-ask'))&&/Names never appear on a shared slide or handout/.test(P.txt('#cs-ask')), true);
  { const deck=JSON.stringify(P.J('caseCurrentDeck()')), pv=P.txt('#cs-pv'), model=JSON.stringify(P.J('(()=>{ const m=JSON.parse(JSON.stringify(CASE_ST.model)); delete m.askList; return m; })()'));
    c('no member’s name anywhere in the deck', NAMES.filter(n=>deck.includes(n)), []);
    c('…or on the slides in the preview', NAMES.filter(n=>pv.includes(n)), []);
    c('…or in what the handout reads, outside the private list', NAMES.filter(n=>model.includes(n)), []); }
  click(P,'[data-cs-act="ask"]');
  c('closed again: gone from the page', [P.q('#cs-ask').hidden,P.q('#cs-ask').innerHTML], [true,'']);
  setup(P,{members:false}); P.E(`uChurch().proposalPrefs={ministry:'pathfinders',type:'board',group:'board'}; caseMount(true);`);
  click(P,'[data-cs-act="ask"]');
  c('no gifts results yet: it says so, and opens Spiritual Gifts', [/No Spiritual Gifts results yet for Bucks County SDA/.test(P.txt('#cs-ask')),!!P.q('#cs-ask [data-cs-gifts]')], [true,true]);
  c('…and the page says the ability slide counts the profile instead', /counts the skills under Your church/.test(P.txt('#cs-s3')), true);

  console.log('\n-- the sample slideshow --');
  setup(P); P.E(`uChurch().proposalPrefs={ministry:'pathfinders',type:'board',group:'board'}; caseMount(true);`);
  const before=JSON.stringify(Object.entries(P.w.localStorage));
  click(P,'[data-cs-act="sample"]');
  c('opens beside the survey: the report steps aside', [P.q('#casep').hidden,P.q('#report').classList.contains('show'),P.E('CASE_ST.view')], [false,false,'sample']);
  c('the banner says SAMPLE, what it is, and that nothing is saved', [P.txt('#casep .gfsamptag'),/A sample slideshow/.test(P.txt('#casep .gfsampbar')),/Nothing is saved/.test(P.txt('#casep .gfsampbar')),/closes after one day/.test(P.txt('#casep .gfsampbar'))], ['SAMPLE',true,true,true]);
  c('built from his own survey, church and members', /Built from your own Community Survey\./.test(P.txt('#casep .gfsampbar')), true);
  { const secs=P.qa('#cs-spv .td-slide');
    c('every slide on screen says SAMPLE', [secs.length>=7,secs.every(s=>/SAMPLE/.test(s.textContent))], [true,true]);
    c('…and so do the deck’s title and church', [P.J('CASE_ST.sample.deck.title').startsWith('SAMPLE · '),P.J('CASE_ST.sample.deck.church').startsWith('SAMPLE · ')], [true,true]); }
  // v10.41 integration: the sample offers the conference slideshow too, now that the group exists
  c('four kinds to show, the one he chose first', [P.qa('[data-cs-stype]').map(b=>b.textContent),P.q('[data-cs-stype][aria-pressed="true"]').dataset.csStype], [['Board','Team','Sabbath','Conference'],'board']);
  click(P,'[data-cs-stype="team"]');
  c('Team switches the sample to the ministry-team invitation', [P.J('CASE_ST.sample.deck.audience.type'),P.qa('#cs-spv .td-slide').every(s=>/SAMPLE/.test(s.textContent))], ['team',true]);
  c('no edit panel and no ask list in the sample', P.qa('#casep [data-cs-edit],#casep [data-cs-act="ask"]').length, 0);
  { const got=[]; P.w.caseOpenPresenter=(d,o)=>{ got.push([d,o]); return true; };
    click(P,'#casep [data-cs-act="present"]');
    c('Present live: the SAMPLE deck, marked as a sample, kept one day', [got.length,got[0][0].title.startsWith('SAMPLE · '),got[0][1].sample,got[0][1].keepDays], [1,true,true,1]); }
  { const got=[]; P.w.casePdf=(m,o)=>{ got.push([m.sample,o.sample,o.deck.title.startsWith('SAMPLE')]); return true; };
    click(P,'#casep [data-cs-act="pdf"]');
    c('the PDF handout of the sample is marked too', got, [[true,true,true]]); }
  c('the sample wrote nothing to the device', JSON.stringify(Object.entries(P.w.localStorage)), before);
  click(P,'#casep [data-cs-back]');
  c('Back returns to the builder, where he was', [P.q('#casep').hidden,P.q('#report').classList.contains('show'),P.E('CASE_ST.view'),P.J('casePrefs()')], [true,true,'build',{ministry:'pathfinders',type:'board',group:'board',plan:false}]);

  console.log('\n-- Make the Case before a survey --');
  { const N=page(); await sleep(1500);
    N.E(`openTool('case');`);
    // Updated in v10.40.0 ("why would there be two places to put your address?"): no address
    // box inside Make the Case; a church never mapped gets one card to the Community Survey.
    c('no address box: the first-time card, and the sample below it', [N.q('.ask').style.display,N.q('#casep').hidden,!!N.q('#casep [data-cs-sample]'),/First, map your church’s neighbourhood/.test(N.txt('#casep'))], ['none',false,true,true]);
    const before=JSON.stringify(Object.entries(N.w.localStorage));
    click(N,'#casep [data-cs-sample]');
    c('the sample: a made-up church and neighbourhood, and it says so', [/every figure are made up/.test(N.txt('#casep .gfsampbar')),N.q('.ask').style.display], [true,'none']);
    const d=JSON.stringify(N.J('CASE_ST.sample.deck'));
    c('…made-up figures never cite the Census', /U\.S\. Census|Censo de EE/.test(d), false);
    c('…SAMPLE on every slide', N.qa('#cs-spv .td-slide').every(s=>/SAMPLE/.test(s.textContent)), true);
    c('…nothing written', JSON.stringify(Object.entries(N.w.localStorage)), before);
    click(N,'#casep [data-cs-back]');
    c('Back: the first-time card and the door again, still no address box', [N.q('.ask').style.display,!!N.q('#casep [data-cs-sample]'),!!N.q('#casep .home-first')], ['none',true,true]);
    N.E('showHub()');
    c('leaving for the hub hides it', N.q('#casep').hidden, true);
    N.E(`openTool('gifts')`);
    c('…and it never shows in another tool', N.q('#casep').hidden, true);
    c('no errors', N.errs, []); }

  console.log('\n-- from the survey’s ministry cards --');
  setup(P); P.E(`openTool('survey'); render(); uOpenProposal('food-pantry');`);
  c('"Make the case for this" (was "Build proposal", renamed v10.43) opens Make the Case with that ministry, at step 2', [P.E('TOOL'),P.J('casePrefs().ministry'),P.q('#cs-s2').hidden], ['case','food-pantry',false]);

  console.log('\n-- Spanish --');
  { const S=page('es'); await sleep(1500); setup(S);
    const body=()=>S.txt('#casebody').split('Bucks County SDA').join('');   // the church's own name is not English UI
    // Updated v10.41 (the three steps: who it is for, then what, then the slides; the ranked cards are gone).
    c('the steps in Spanish', S.qa('.cs-step .cs-sh h3').map(h=>h.lastChild.textContent), ['¿Para quién es?','¿Qué va a proponer?','Sus diapositivas']);
    // v10.41 integration: the conference section, and "Worship & learning" opens with the new Worship & music and children's tiles
    c('who it is for: the sections', S.qa('#cs-s1 .cs-aud h4').map(b=>b.textContent), ['Liderazgo','Departamentos de ministerio','En sábado','La asociación']);   // v10.47.0
    c('…the groups', S.qa('[data-cs-sec="teams"] [data-cs-group] b').slice(0,3).map(b=>b.textContent), ['Adoración y música','Consejo de Escuela Sabática','Escuela Sabática de Niños y Ministerios Infantiles']);
    click(S,'[data-cs-group="community"]'); await until(()=>S.q('#cs-lib .lib-card'),8000);
    type(S,'#cs-q','despensa'); await until(()=>S.qa('#cs-lib .lib-sig h4').some(b=>/despensa/i.test(b.textContent)),8000);
    c('search in Spanish names', S.qa('#cs-lib .lib-sig h4').some(b=>/despensa/i.test(b.textContent)), true);
    type(S,'#cs-q','Cocina'); await until(()=>S.qa('#cs-lib .lib-sig h4').some(b=>/cocina/i.test(b.textContent)),8000);
    c('…without case or accents mattering', S.qa('#cs-lib .lib-sig h4').some(b=>/cocina/i.test(b.textContent)), true);
    type(S,'#cs-q',''); await sleep(300);
    S.E(`uChurch().proposalPrefs={ministry:'pathfinders',type:'team',group:'youth'}; CASE_ST.pick=false; caseMount(true);`);
    c('the slides are Spanish', [S.J('caseCurrentDeck().lang'),S.q('#cs-s3 h3').lastChild.textContent], ['es','Sus diapositivas']);
    S.E('CASE_ST.pv.go(1)');
    c('the edit panel', S.qa('.cs-edit label').map(l=>l.firstChild.textContent.trim()), ['Etiqueta sobre el titular','Titular']);
    // v10.42 part 3 (the pastor: a proposal to vote on, PROPOSAL.md): the board's actions add "The Proposal to vote on (PDF)"
    c('the actions', S.qa('[data-cs-act]').map(b=>b.textContent), ['Presentar en vivo','Compartir enlace y QR','Descargar folleto en PDF','Propuesta para votar (PDF)','Su lista privada para invitar','Ver una presentación de ejemplo']);
    c('the navigation', [S.q('[data-cs-prev]').textContent,S.q('[data-cs-next]').textContent], ['‹ Anterior','Siguiente ›']);
    click(S,'[data-cs-act="ask"]');
    c('the ask list', [/Su lista privada para invitar/.test(S.txt('#cs-ask')),/Solo en este dispositivo/.test(S.txt('#cs-ask'))], [true,true]);
    const en=['Step ','What are you proposing','What will you propose','Who is it for','Who are you asking','Who are you making','Board & officers','Ministry teams','The whole church','Tap the group','For God','For our community','Choose this','Your slides','Search every','Show all','Change','Need','Staffing','Gifts','Present live','Share link','Download PDF','private ask list','See a sample','Previous','Next','Edit slide','Headline','Restore the original','Questions you may hear','County ','Clearly higher','can staff','gifted and drawn','This device only','Ready to lead','Label above'];
    c('no English left in the Spanish builder', en.filter(t=>body().includes(t)), []);
    click(S,'[data-cs-act="sample"]');
    c('the sample: MUESTRA on the banner and every slide', [S.txt('#casep .gfsamptag'),S.qa('#cs-spv .td-slide').every(s=>/MUESTRA/.test(s.textContent)),/Una presentación de ejemplo/.test(S.txt('#casep'))], ['MUESTRA',true,true]);
    c('…its kinds and buttons in Spanish', [S.qa('[data-cs-stype]').map(b=>b.textContent),S.qa('#casep [data-cs-act]').map(b=>b.textContent)], [['Junta','Equipo','Sábado','Asociación'],['Presentar en vivo','Compartir enlace y QR','Descargar folleto en PDF','Propuesta para votar (PDF)']]);   // v10.41: the conference kind too; v10.42 part 3: the Proposal to vote on
    // v10.39.0, the presenting step: Share opens its setup (it was a "not switched on" stub).
    c('…Share opens its setup in Spanish, marked MUESTRA', (()=>{ click(S,'#casep [data-cs-act="share"]'); return [S.txt('#casepres [data-pr-start]'),S.txt('#casepres .cp-k .gfsamptag'),/un día/.test(S.txt('#casepres'))]; })(), ['Crear el enlace','MUESTRA',true]);
    click(S,'#casepres [data-pr-cancel]');
    c('no errors in Spanish', S.errs, []); }

  c('no errors', P.errs, []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); });
