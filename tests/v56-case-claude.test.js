// v10.56.0 — Claude in Make the Case, the page (DESIGN-CASE-CLAUDE.md, Terrain-work/v73). The pastor (6 Oct 2026), after the needs and the
// work for each need became Claude's: "And this also carries into make the case right and the proposal creation because [it] shouldn't be
// Claude. Also work on that as well." Part A: step 2's ideas for a group come from the deep study. Part B: Claude writes the proposal's
// words (headlines, what to say, the questions); his own words stay on top; every number one the slides say; no real names sent.
// The servers' own checks are in case-claude-function.test.mjs. Written failing-first on v10.55.1.
const {sleep,until,checker,page,ready,survey,openNeed,FX}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const PASSV='open-sesame-case';
const ADDR="D.geo={...D.geo,matched:'118 Bristol Rd, Warminster, PA, 18974'}";
const NUMS={1:{ppl:2,leaders:0,hrs:3,cost:40,costMo:0},2:{ppl:6,leaders:1,hrs:12,cost:400,costMo:60},3:{ppl:12,leaders:2,hrs:30,cost:2000,costMo:300}};
const GN={1:['A welcome card in the pew rack','A text after a missed Sabbath','A greeter at the side door','A name tag table for regulars'],
  2:['A monthly newcomers lunch','A ride team for members','A birthday card team','A shut-in visit rota'],
  3:['A welcome ministry training day','A hospitality team for funerals','A members care directory','A quarterly family supper']};
const GWHY='Greeters see every member each Sabbath and notice first when someone is missing.';
const GIDEA=(t,i,o={})=>{ const n=GN[t][i];
  return {id:'cl-'+('9'+t+i+'00000000000').slice(0,14),theme:'member-care',tier:t,k:['serve','belong','equip','invite'][i%4],ages:'adults',where:'church',sabbath:true,minors:false,
    need:['settled','changing','growing'],boost:[],...NUMS[t],skill:[],partner:t===3?{en:'the conference ministries office'}:null,dig:0,cad:0,reach:'in',ai:true,why:GWHY,seen:[],
    en:{n,d:`${n} gives the greeters one simple way to care for every member by name. Two greeters keep it going and the pastor hears what they learn each month.`,
      how:[`Ask the elders to bless the start of ${n.toLowerCase()} this quarter.`,'Choose two greeters who will keep it going for three months.',
        'Keep any list private, only with the consent of those on it.','Review together each month what worked and what to change.']},...o}; };
const GSET=()=>({ideas:[GIDEA(1,0,{seen:[{text:'A church in Ohio sends a card after two missed Sabbaths.',url:'https://www.example-sda.org/care-cards',host:'example-sda.org'}]}),GIDEA(1,1),GIDEA(1,2),GIDEA(1,3),
  GIDEA(2,0),GIDEA(2,1,{why:'About 16.8% of households here receive SNAP.'}),GIDEA(2,2),GIDEA(2,3),GIDEA(3,0),GIDEA(3,1),GIDEA(3,2),GIDEA(3,3)],keep:[],made:'2026-10-06',set:'b'.repeat(32)+'/en'});
function fake(P,plan){
  const orig=P.w.fetch; P.calls=[];
  P.w.fetch=async(u,o)=>{ u=String(u);
    if(/\/\.netlify\/functions\/advise$/.test(u)){
      if(!o||!o.method||o.method==='GET') return {ok:true,status:200,json:async()=>plan.info};
      const b=JSON.parse(o.body); P.calls.push({body:b,headers:o.headers||{}});
      const r=plan[b.mode]?plan[b.mode](b):b.mode==='ideas-pick'?{status:200,json:{ok:true,counted:true}}:{status:500,json:{}};
      return {ok:r.status<300,status:r.status,json:async()=>r.json}; }
    return orig(u,o); };
}
const JOB={status:202,json:{ok:true,job:'J'.repeat(22),key:'K'.repeat(43),poll:4000}};
const calls=(P,m)=>P.calls.filter(x=>x.body.mode===m);

(async()=>{ await T.sec(async()=>{
  // ======================================================== PART A
  console.log('\n-- Part A · a locked device: step 2 keeps the quick "More ideas" button, nothing studied --');
  { const P=page({needs:'file'}); await ready(P);
    fake(P,{info:{enabled:true,locked:true,needs:false,ideas:true,case:true}});
    survey(P,{mod:ADDR}); await sleep(150); P.E(`capSave(${JSON.stringify(FX.MEDIUM)})`);
    P.E(`openTool('case')`); await sleep(150); P.E(`caseChooseGroup('hospitality')`);
    await until(()=>P.q('#cs-lib .lib-sec'),8000); await sleep(300);
    c('no study asked, no study line, no words asked', [calls(P,'ideas').length,!!P.q('#case-lib-ai-in[data-cgi="1"]'),calls(P,'case').length], [0,false,0]);
    P.w.close(); }

  console.log('\n-- unlocked: choosing a group studies the section on screen; place, figures, the group and its listed ideas only --');
  const P=page({needs:'file',store:{'terrain-ai-pass':PASSV}}); await ready(P);
  let hold=true;
  fake(P,{info:{enabled:true,locked:true,needs:false,ideas:true,case:false},ideas:()=>JOB,
    'ideas-status':()=>hold?{status:200,json:{ok:true,status:'running'}}:{status:200,json:{ok:true,status:'done',...GSET()}}});
  P.E('CASE_GI.poll=25');
  survey(P,{mod:ADDR}); await sleep(150); P.E(`capSave(${JSON.stringify(FX.MEDIUM)})`);
  P.E(`openTool('case')`); await sleep(150); P.E(`caseChooseGroup('hospitality')`);
  await until(()=>calls(P,'ideas').length,8000);
  const B=calls(P,'ideas')[0].body;
  c('one study, for God\'s people (the greeters\' section on screen), the pass sent', [calls(P,'ideas').length,calls(P,'ideas')[0].headers['x-terrain-pass'],B.fresh], [1,PASSV,false]);
  c('the group: its id, its name, the side, its first themes; no need', [B.group.id,B.group.name,B.group.reach,B.group.themes[0],B.group.themes.length<=3,'need' in B], ['hospitality','Greeters & hospitality','in','member-care',true,false]);
  c('the place and the figures, the tags, the group\'s ideas already listed (by id, name and size)', [B.place.state,B.figs.length>=20,Array.isArray(B.tags),B.have.length>=6,B.have.every(h=>typeof h.id==='string'&&[1,2,3].includes(h.lift))], ['PA',true,true,true,true]);
  c('…never the church, its street, the pastor or his email', ['Bucks County SDA','118 Bristol Rd','Joshua Mura','jm@example.org'].map(w=>JSON.stringify(B).includes(w)), [false,false,false,false]);
  await until(()=>P.q('#case-lib-ai-in .cs-gistat .ns-aiwhen'),3000);
  c('while it works: one line in the section\'s head, no "AI"', [P.txt('#case-lib-ai-in .cs-gistat'),/\bAI\b/.test(P.txt('#case-lib-ai-in'))], ['Studying what works for Greeters & hospitality… a minute or two.',false]);
  c('…the library\'s list meanwhile', P.qa('#cs-sec-in .lib-card').length>=4, true);
  hold=false;
  await until(()=>P.q('#cs-sec-in .lib-card[data-lib-id^="cl-"]'),6000); await sleep(100);
  const ids=P.qa('#cs-sec-in .lib-card').map(a=>a.dataset.libId);
  c('done: Claude\'s ideas first in the section', [ids[0],/^cl-/.test(ids[1])], [GIDEA(1,0).id,true]);
  const kept=P.J(`uChurch().fresh['group:hospitality:in']`);
  c('…twelve kept with the church where "More ideas" kept its own, for God\'s people, with the set (for a pick)', [kept.ideas.length,kept.ideas.every(x=>x.reach==='in'&&x.clSet==='b'.repeat(32)+'/en'),kept.study.made], [12,true,'2026-10-06']);
  c('…an in-reach idea whose "why" said a Census number keeps no "why"', [kept.ideas.find(x=>x.en.n===GN[2][1]).why,kept.ideas.find(x=>x.en.n===GN[1][1]).why], [undefined,GWHY]);
  const card=P.q(`#cs-sec-in .lib-card[data-lib-id="${GIDEA(1,0).id}"]`);
  c('the card: "New idea", its own "why", where it is seen working (https, opened apart)', [!!card.querySelector('.u-ai'),/Greeters see every member/.test(card.querySelector('.lib-why').textContent),
    card.querySelector('.lib-seen a').getAttribute('href'),card.querySelector('.lib-seen a').getAttribute('rel')], [true,true,'https://www.example-sda.org/care-cards','noopener noreferrer']);
  c('the line: written, the date, Generate new ideas', [P.txt('#case-lib-ai-in .cs-gistat .ns-aiwhen'),P.txt('#case-lib-ai-in [data-cgi-gen]')], ['Written for Greeters & hospitality on 6 Oct 2026','Generate new ideas']);
  c('the other section was not studied (only the one on screen)', calls(P,'ideas').length, 1);
  P.q('#cs-tab-out').click(); await until(()=>calls(P,'ideas').length===2,3000);
  c('switching to "For our community" studies it, for the community', [calls(P,'ideas')[1].body.group.reach,calls(P,'ideas')[1].body.group.themes[0]], ['out','hospitality']);
  P.q('#cs-tab-in').click(); await sleep(80);
  P.q('#case-lib-ai-in [data-cgi-gen]').click(); await until(()=>calls(P,'ideas').length===3,3000);
  c('Generate new ideas: a fresh study', calls(P,'ideas')[2].body.fresh, true);
  await sleep(200);

  console.log('\n-- choosing one of Claude\'s ideas: a pick; step 3 has slides --');
  P.q(`#cs-sec-in .lib-card[data-lib-id="${GIDEA(1,0).id}"] [data-lib-case]`).click(); await sleep(250);
  c('chosen, saved with the church, and picked from its set', [P.J('casePrefs().ministry'),!!P.J(`uChurch().lib['${GIDEA(1,0).id}']`),calls(P,'ideas-pick').map(x=>[x.body.set,x.body.id])],
    [GIDEA(1,0).id,true,[['b'.repeat(32)+'/en',GIDEA(1,0).id]]]);
  c('the slides are built for it (no words asked: the server has them off)', [P.J('CASE_ST.deck.slides.length')>=6,calls(P,'case').length,P.txt('#cs-wstat')], [true,0,'']);
  P.w.close();

  // ======================================================== PART B
  console.log('\n-- Part B · the proposal\'s words: asked once, by themselves, when step 3 has slides --');
  const Q=page({needs:'file',store:{'terrain-ai-pass':PASSV}}); await ready(Q);
  let wait=true, words=null;
  fake(Q,{info:{enabled:true,locked:true,needs:false,ideas:false,case:true},case:()=>JOB,
    'case-status':()=>wait?{status:200,json:{ok:true,status:'running'}}:{status:200,json:{ok:true,status:'done',made:'2026-10-06',words}}});
  Q.E('CASE_WD.poll=25');
  survey(Q,{mod:ADDR}); await sleep(150); Q.E(`capSave(${JSON.stringify({...FX.MEDIUM,name:'Bucks County SDA'})})`); Q.E(`(()=>{ uChurch().name='Bucks County SDA'; uPersist(); })()`);
  await openNeed(Q,'snap',true);
  Q.q('#ns-i-snap .ns-row').click(); await until(()=>Q.q('#ns-sheet[open]'),4000);
  Q.q('#ns-sheet [data-ns-propose]').click(); await until(()=>Q.E('TOOL')==='case'&&Q.E('casePropMode()'),6000); await sleep(150);
  Q.q('#cs-s1 [data-cs-group="board"]').click();
  await until(()=>calls(Q,'case').length,6000);
  const W=calls(Q,'case')[0].body, WS=JSON.stringify(W);
  c('one request, mode case, the pass sent, not fresh', [calls(Q,'case').length,calls(Q,'case')[0].headers['x-terrain-pass'],W.fresh], [1,PASSV,false]);
  c('the group, the idea, the place; the slides by slot with their words', [W.group,typeof W.idea.name,W.place,W.slides.length>=6,W.slides.some(s=>s.slot==='motion:0'&&s.head.length>10),W.slides.every(s=>Array.isArray(s.lines))],
    [{id:'board',name:'Church board',type:'board'},'string',{town:'Warminster',state:'PA'},true,true,true]);
  c('…names as placeholders only: never the church, the pastor, the street or his email', [['Bucks County SDA','Joshua Mura','118 Bristol Rd','jm@example.org'].map(w=>WS.includes(w)),WS.includes('{pastor}')], [[false,false,false,false],true]);
  c('…no verse\'s words, only its reference', [WS.includes('Commit thy works'),W.slides.some(s=>/· KJV$/.test(s.verse))], [false,true]);
  await until(()=>Q.q('#cs-wstat .ns-aiwhen'),3000);
  c('while it writes: one line under step 3\'s heading, no "AI"', [Q.txt('#cs-wstat'),/\bAI\b/.test(Q.txt('#cs-wstat'))], ['Writing the words for the church board… about a minute.',false]);
  const appHeads=Q.J('CASE_ST.deck.slides.map(s=>s.headline||"")'), keys=Q.J('caseSlotKeys(CASE_ST.deck)'), at=k=>keys.indexOf(k);
  words={heads:{'how:0':'Four steps put our pantry where neighbors look','risks:0':'Safe, simple, approved by this board','capacity:0':'{church} has the people this needs',
      'stat:0':'About 42% of homes here go hungry','close:0':'Will the board approve this trial of our pantry listing tonight, with every safeguard in place?'},
    say:{'motion:0':'We are asking for a short trial that costs nothing and helps neighbors find food.','stat:0':'That is about 330 households, close to our doors.','ask:0':'The figure 77 is invented.'},
    qa:[{q:'What will it cost?',a:'Nothing to start: $0, from the local budget, never tithe.'},{q:'Who will do it?',a:'One volunteer, about 5 hours in the first month.'},
      {q:'How will we know it worked?',a:'At the review we will look at how neighbors found the pantry.'},{q:'Is it safe?',a:'Yes: the board approves first and {pastor} reports back.'}]};
  wait=false;
  await until(()=>Q.J(`uChurch().caseWords&&Object.keys(uChurch().caseWords).length`),6000); await sleep(200);
  const heads=Q.J('CASE_ST.deck.slides.map(s=>s.headline||"")');
  c('Claude\'s headlines on their slides', [heads[at('how:0')],heads[at('risks:0')]], ['Four steps put our pantry where neighbors look','Safe, simple, approved by this board']);
  c('…{church} put back as the church\'s own name', heads[at('capacity:0')], 'Bucks County SDA has the people this needs');
  c('…a headline with a number the slides never say keeps the app\'s', heads[at('stat:0')], appHeads[at('stat:0')]);
  c('…a headline longer than the app\'s (more lines on the slide) keeps the app\'s', heads[at('close:0')], appHeads[at('close:0')]);
  c('…a slide Claude left alone keeps the app\'s', heads[at('motion:0')], appHeads[at('motion:0')]);
  c('the line: written, the date, Write them again', [Q.txt('#cs-wstat .ns-aiwhen'),Q.txt('#cs-wstat [data-cw-gen]')], ['Words written for the church board on 6 Oct 2026','Write them again']);
  const say=Q.txt('#cs-s3 .cs-say');
  c('What to say: slide by slide, under the app\'s own lines; a note with an invented number left out', [/Slide by slide/.test(say),/We are asking for a short trial/.test(say),/about 330 households/.test(say),/77/.test(say)], [true,true,true,false]);
  const qs=Q.qa('#cs-s3 .cs-qs:not(.cs-say) dt').map(x=>x.textContent);
  c('Questions: Claude\'s for this ministry, {pastor} put back', [qs,Q.qa('#cs-s3 .cs-qs:not(.cs-say) dd').map(x=>x.textContent)[3]], [['What will it cost?','Who will do it?','How will we know it worked?','Is it safe?'],'Yes: the board approves first and Joshua Mura reports back.']);
  c('kept with the church for this ministry, group and language, with a fingerprint of every slide', [!!Q.J(`uChurch().caseWords[caseEditKey()]`),Object.keys(Q.J(`uChurch().caseWords[caseEditKey()].sig`)).length], [true,keys.length]);
  c('the slides he presents carry them (the deck that goes to the phones)', Q.J(`CASE_ST.deck.slides[${at('how:0')}].headline`), 'Four steps put our pantry where neighbors look');

  console.log('\n-- his own words stay on top; Undo goes back to Claude\'s --');
  Q.E(`(()=>{ caseEditSet('how:0','headline','My own words for this slide','Four steps put our pantry where neighbors look'); uPersist(); caseRedeck(null); })()`);
  c('his headline on the slide', Q.J(`CASE_ST.deck.slides[${at('how:0')}].headline`), 'My own words for this slide');
  Q.E(`(()=>{ caseEditSet('how:0','headline','','Four steps put our pantry where neighbors look'); uPersist(); caseRedeck(null); })()`);
  c('…undone: Claude\'s again', Q.J(`CASE_ST.deck.slides[${at('how:0')}].headline`), 'Four steps put our pantry where neighbors look');

  console.log('\n-- a slide that changed since: its headline goes back to the app\'s, and the line says so --');
  Q.E(`(()=>{ const e=uChurch().caseWords[caseEditKey()]; e.sig['risks:0']='changed'; uPersist(); caseDraw3(); })()`); await sleep(100);
  c('the changed slide: the app\'s words; the others: Claude\'s', [Q.J(`CASE_ST.deck.slides[${at('risks:0')}].headline`),Q.J(`CASE_ST.deck.slides[${at('how:0')}].headline`)], [appHeads[at('risks:0')],'Four steps put our pantry where neighbors look']);
  c('…"Some slides changed since the words were written." and Write them again', [Q.txt('#cs-wstat .ns-aiwhen'),!!Q.q('#cs-wstat [data-cw-gen]')], ['Some slides changed since the words were written.',true]);
  c('…nothing asked by itself', calls(Q,'case').length, 1);
  Q.q('#cs-wstat [data-cw-gen]').click(); await until(()=>calls(Q,'case').length===2,3000);
  c('Write them again: a fresh request', calls(Q,'case')[1].body.fresh, true);
  await until(()=>Q.txt('#cs-wstat .ns-aiwhen').startsWith('Words written'),4000);

  console.log('\n-- the sample slideshow never asks, and never takes them --');
  const before=calls(Q,'case').length;
  Q.E('caseSampleOpen()'); await sleep(300);
  c('no request for the sample; its slides the app\'s own, no words line', [calls(Q,'case').length===before,Q.E('CASE_ST.view'),/Four steps put our pantry/.test(Q.txt('#casep')),!!Q.q('#casep #cs-wstat')], [true,'sample',false,false]);
  c('no page errors', [P.errs,Q.errs], [[],[]]);
}); T.done(); })();
