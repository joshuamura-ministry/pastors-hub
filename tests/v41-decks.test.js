// v10.41 — Make the Case: in-reach decks, the Adventist groups and the conference proposal, against the whole app in jsdom.
//
// The pastor (29 Sep 2026): "we can separate ministry ideas by in-reach or outreach for each one, so they can see:
// what can I do for God's people, but also what can I do for the community?"; "worship and music for sure,
// children's Sabbath School, Pathfinders, Adventurers … all the things we would have as a denomination. We also have
// an evangelism team"; "we can appeal to the conference leaders for an EVANGELISM proposal. This has to be done
// differently, because these are the administrators of the conference, who oversee all the pastors".
//
//  1. The verse library: the research file's 53 new verses and 3 Ellen White lines, the in-reach and conference plans
//     (tests/case-quotes.json, byte for byte), no verse over 160, the plans naming library verses only.
//  2. Reach: an idea's own reach, the library's, an inside theme's; built-ins "out" but the Pathfinder Club ("both").
//  3. In-reach decks argue from the church family: no Census slide or word, an "Our church family" slide from the
//     profile and gifts counts only (adults, no names, nothing invented), in-reach Scripture on every content slide,
//     care-list privacy, consent and confidentiality in the risks; the handout to match. "both" keeps the community deck.
//  4. The new groups: every field in English and Spanish, Church Manual pages from the research, their own verses;
//     youth renamed; the youth audiences the same set on the page and on the server.
//  5. The conference proposal: its slides, its churches (counts only), the Evangelism Planner's dates, only the amounts
//     the pastor types, reporting back, only verified aims (Pennsylvania's only for its churches), Scripture on every
//     slide and no Ellen White on one; the edit panel's fields; the handout (at most three pages, every aim sourced).
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const server=fs.readFileSync(path.resolve(__dirname,'..','netlify','functions','present.mjs'),'utf8');
const FX=require('./fixtures.json');
const LIB=require('./case-quotes.json');
const {jsPDF}=require('jspdf');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,700));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',union:'Columbia',role:'pastor',synced:true,tok:'r1.AbCdEfGhIjKl.lx2abc.'+'A'.repeat(32)};
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(o.reg) w.localStorage.setItem('terrain-reg',JSON.stringify({...REG,...o.reg}));
      w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
  const w=dom.window; w.__J=jsPDF;
  return {w,errs,E:s=>w.eval(s),JE:s=>JSON.parse(w.eval('JSON.stringify('+s+')'))};
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(P){ const t0=Date.now(); while(Date.now()-t0<8000){ try{ if(P.E('typeof caseModel==="function"&&typeof uCatalog==="function"')) return; }catch(e){} await sleep(25); } }
const NOW=Date.UTC(2026,8,29,15);
const IDEA={id:'member-care-missed-you-card',theme:'member-care',tier:1,k:'belong',ages:'adults',where:'church',sabbath:false,minors:false,need:[],boost:[],ppl:2,leaders:0,hrs:2,cost:20,costMo:0,skill:[],st:'try',
  en:{n:'A “we missed you” card after two Sabbaths away',d:'Greeters keep a private list with the elders. When a regular is missing twice, someone who knows them sends a warm card.',how:['Agree the list with the elders','Buy cards','Write within a week','Pray for each name']},
  es:{n:'Una tarjeta “le extrañamos” después de dos sábados de ausencia',d:'Los recepcionistas llevan una lista privada con los ancianos.',how:['Acordar la lista','Comprar tarjetas','Escribir en una semana','Orar por cada nombre']}};
function setup(P,o){
  o=o||{};
  const D=JSON.parse(JSON.stringify(FX.DATA));
  D.M.tract.moe=P.JE('CASE_SAMPLE.M.tract.moe'); D.M.county.moe=P.JE('CASE_SAMPLE.M.county.moe');
  Object.assign(D.M.tract,{age5_9:420,age10_14:395,age15_17:236,famKids:862,employed:2610,seniors:540});
  P.E('DATA='+JSON.stringify(D)+';SCOPE="tract"; HELP=null; HELP_STATE="idle"; ZONES=null; ZONES_STATE="idle";');
  P.E('uChurch().name="Bucks County SDA"; uChurch().address="118 Bristol Rd"; CAP=null; capSave('+JSON.stringify({...FX.MEDIUM,...(o.cap||{})})+');');
  P.E(`(()=>{ const mk=b=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=b.includes(g.id)?4:1; }); return gfScores(a); };
    const M=(i,name,b,h,x)=>({id:'m'+i,name,gifts:mk(b),heart:h,confirmed:true,willing:true,hours:6,skills:['kids'],source:'manual',...(x||{})});
    uChurch().members=[M(0,'Ana Lopez',['teach','shep','creative','helps'],{children:2}),M(1,'Ben Carter',['teach','shep','encour'],{}),M(2,'Cara Diaz',['mercy','helps','shep'],{}),
      M(3,'Dan Evans',['admin','leader','giving'],{}),M(4,'Eve Fox',['mercy','helps','serve','hosp'],{}),M(5,'Gus Hill',['evang','mission','hosp'],{}),M(6,'Young Kid',['shep','mercy'],{},{minor:true})];
    uPersist(); })()`);
  P.E(`libSave(${JSON.stringify({...IDEA,...(o.idea||{})})})`);
  if(o.district) P.E(`(()=>{ const s=uStore(); s.churches.c2={id:'c2',name:'Fairview Village SDA',address:'Fairview Village, PA',capacity:{confirmed:true,members:48},members:[],linked:[],drafts:[],selected:[],overrides:{},share:{}}; uPersist(); })()`);
  if(o.plan) P.E(`planSave(${JSON.stringify(o.plan)})`);
}
const PLAN={church:'Bucks County SDA',members:120,leaders:6,workers:30,nights:18,perweek:4,date:'2027-09-11',kind:'both',seats:180,file:null,budget:12000,built:1,v:3};
const NAMES=['Ana Lopez','Ben Carter','Cara Diaz','Dan Evans','Eve Fox','Gus Hill','Young Kid'];
const deckOf=(P,id,g,t,lang,x)=>P.JE(`(()=>{ const m=caseModel(${JSON.stringify(id)},{type:${JSON.stringify(t)},group:${JSON.stringify(g)}},{lang:${JSON.stringify(lang||'en')},now:${NOW},respond:true}); return m.ok?{m,d:caseDeck(m)}:{err:m.error}; })()`);
const VL=Object.fromEntries(LIB.verses.map(v=>[v.id,v]));
const idOf=(lang,ref)=>{ const r=String(ref||'').replace(/^(SAMPLE|MUESTRA) · /,'').replace(/ · (KJV|RVA)$/,''); const v=LIB.verses.find(x=>x[lang].ref===r); return v?v.id:null; };
const verseIds=(d,lang)=>d.slides.map(s=>s.type==='verse'?idOf(lang,s.ref):s.verse?idOf(lang,s.verse.ref):s.type==='close'&&s.quote&&/ · (KJV|RVA)$/.test(s.quote.ref)?idOf(lang,s.quote.ref):null);

(async()=>{ try{
  const P=page({reg:{}}); await ready(P); setup(P,{district:true,plan:PLAN});
  c('no boot errors', P.errs, []);

  console.log('\n-- 1. the verse library --');
  { const V=P.JE('CASE_VERSES'), G=P.JE('CASE_EGW');
    c('113 verses and 11 Ellen White lines, in the research file’s order', [V.length,G.length,V.map(v=>v.id).join()===LIB.verses.map(v=>v.id).join(),G.map(g=>g.id).join()===LIB.egw.map(g=>g.id).join()], [113,11,true,true]);
    c('the in-reach and conference plans are the research file’s', P.JE('CASE_VERSE_PLANS'), LIB.plans);
    c('…naming library verses only', Object.values(LIB.plans).flatMap(p=>Object.values(p).flat()).filter(id=>!VL[id]), []);
    c('the 53 new verses: 160 characters or less in both languages, needs [] (no community deck changes)', V.slice(60).filter(v=>Math.max(v.en.text.length,v.es.text.length)>160||v.needs.length).map(v=>v.id), []);
    c('left out, as the research advised: Ecclesiastes 12:1 (RVA "Y ACUÉRDATE") and Acts 1:8 (RVA "sereís")', ['eccl12_1','acts1_8'].filter(id=>V.some(v=>v.id===id)), []);
    c('the three new Ellen White lines, with their pages', G.slice(8).map(g=>[g.id,g.en.ref,g.es.ref]),
      [['mh470_1','Ellen G. White · The Ministry of Healing, p. 470','Elena G. de White · El Ministerio de Curación, p. 373'],
       ['da678_1','Ellen G. White · The Desire of Ages, p. 678','Elena G. de White · El Deseado de Todas las Gentes, p. 632'],
       ['9t117_1','Ellen G. White · Testimonies for the Church, vol. 9, p. 117','Elena G. de White · Testimonios para la Iglesia, tomo 9, p. 95']]);
    c('9T 116.4 credited to pp. 116–117 (its second sentence is printed on p. 117)', G.find(g=>g.id==='9t116_4').en.ref, 'Ellen G. White · Testimonies for the Church, vol. 9, pp. 116–117');
    c('the conference plan’s two existing verses take its jobs (2 Corinthians 8:21 report, Revelation 14:6 mission)', [V.find(v=>v.id==='2cor8_21').jobs.includes('report'),V.find(v=>v.id==='rev14_6').jobs.includes('mission')], [true,true]); }

  console.log('\n-- 2. reach --');
  c('built-ins are "out", the Pathfinder Club "both"; a library idea’s own reach wins; an inside theme is "in"; the Evangelism Planner series "out"', P.JE(`[
      caseReachOf(SIGNATURE.find(x=>x.id==='food-pantry')),caseReachOf(SIGNATURE.find(x=>x.id==='pathfinders')),
      caseReachOf(uCatalog().find(x=>x.id==='member-care-missed-you-card')),
      caseReachOf({id:'fellowship-x',lib:true,theme:'fellowship'}),caseReachOf({id:'prayer-x',lib:true,theme:'prayer'}),
      caseReachOf({id:'prayer-y',lib:true,theme:'prayer',reach:'both'}),caseReachOf(casePlanItem())]`), ['out','both','in','in','out','both','out']);

  console.log('\n-- 3. in-reach decks argue from the church family --');
  const IN=[];
  for(const [g,t] of [['board','board'],['business','board'],['deacons','board'],['hospitality','team'],['prayer','team'],['worship','team'],['congregation','congregation']])
    for(const lang of ['en','es']){ const r=deckOf(P,'member-care-missed-you-card',g,t,lang); IN.push({g,t,lang,...r}); }
  c(`${IN.length} in-reach decks built, each marked in-reach`, IN.map(b=>!!(b.m&&b.m.ok&&b.m.inreach&&b.m.reach==='in')), IN.map(()=>true));
  c('no Census slide: no need figure, no "why here" cards, no "Here in {town}"', IN.filter(b=>b.d.slides.some(s=>s.type==='stat'||s.type==='trio'||(s.type==='place'&&/Here in|Aquí en/.test(s.kicker)))).map(b=>b.g+'/'+b.lang), []);
  c('…and no Census figure or word anywhere in the deck', IN.filter(b=>/Census|Censo|ACS|margin of error|margen de error|the county|al condado|del condado/i.test(JSON.stringify(b.d.slides))).map(b=>b.g+'/'+b.lang), []);
  c('one "Our church family" slide in every deck', IN.map(b=>b.d.slides.filter(s=>s.type==='place'&&(s.kicker==='Our church family'||s.kicker==='Nuestra familia de la iglesia')).length), IN.map(()=>1));
  // v10.42 part 3 (the pastor: "a focus, a beginning and an appeal at the end"; DESIGN.md §5): the same arc, with the church family
  // where the why was: the opening and the goal, the family, how it works, what it takes, safeguards, one timing slide, the ask, the appeal
  c('slide order: board 9 (no need, place or ability), team 8, congregation 6', [...new Set(IN.map(b=>b.t+':'+b.d.slides.map(s=>s.type).join(',')))].sort(),
    ['board:join,motion,place,how,capacity,risks,timeline,ask,close','congregation:join,motion,verse,place,how,yes,close','team:join,motion,place,how,roles,risks,timeline,yes']);
  { const b=IN.find(x=>x.g==='board'&&x.lang==='en'), f=b.d.slides.find(s=>s.type==='place'), m=b.m;
    c('the family slide: members from the profile, volunteers and hours still free, gifts that fit (counts only)', [f.headline,f.facts.map(x=>[x.value,x.label])],
      // v10.41 review: the profile's figure is average Sabbath attendance (U_FIELDS), so the slide calls it that, not "members"
      // v10.42 part 3 (SPEC-FOCUS E, GIFTS.md §6.3): below half of the adults the third item is the church's coverage, not the fit
      ['135 in worship on an average Sabbath',[['135','In worship on an average Sabbath'],[String(m.capacity.free.volunteers),`Volunteers with time to give: ${Math.round(m.capacity.free.hours)} hours a month still free`],[String(m.gifts.church.n),'of the 135 in worship have discovered their gifts']]]);
    c('…its gifts are adults only (the under-18 is never counted) and its source says so', [m.gifts.respondents,/adults only/.test(f.source),m.gifts.heart], [6,true,false]); }
  c('no member’s name on any in-reach slide', IN.filter(b=>NAMES.some(n=>JSON.stringify(b.d).includes(n))).map(b=>b.g), []);
  { const v=IN.map(b=>({b,ids:verseIds(b.d,b.lang)}));
    c('a verse on every content slide (the congregation’s close carries its Ellen White line)', v.filter(({b,ids})=>b.d.slides.some((s,i)=>s.type!=='join'&&s.type!=='close'&&!ids[i])).map(({b})=>b.g+'/'+b.lang), []);
    c('…never twice in a deck, the same in English and Spanish', [v.filter(({ids})=>{ const x=ids.filter(Boolean); return x.length!==new Set(x).size; }).length,
      IN.filter(b=>b.lang==='en').filter(b=>JSON.stringify(verseIds(b.d,'en'))!==JSON.stringify(verseIds(IN.find(x=>x.g===b.g&&x.lang==='es').d,'es'))).map(b=>b.g)], [0,[]]);
    const SET=new Set(P.JE('[...CASE_VERSES.slice(0,CASE_VERSE_BASE).map(v=>v.id),...CASE_VERSE_SETS.inreach,...Object.values(CASE_LIB_THEME_VERSE).flat(),...CASE_GROUPS.map(g=>g.verse)]'));
    c('…each from the v10.40 library, the in-reach set, the idea’s theme or the group’s own verse', v.flatMap(({ids})=>ids.filter(id=>id&&!SET.has(id))), []);
    const fam=v.filter(({b})=>b.lang==='en').map(({b,ids})=>ids[b.d.slides.findIndex(s=>s.type==='place')]);
    c('…the family slide speaks of love for one another (the theme’s verse, else the in-reach plan)', [...new Set(fam)].every(id=>LIB.plans.inreach.family.includes(id)||P.JE("CASE_LIB_THEME_VERSE['member-care']").includes(id)), true); }
  { const b=IN.find(x=>x.g==='board'&&x.lang==='en'), r=b.d.slides.find(s=>s.type==='risks');
    c('risks: the privacy of care lists and consent come first; confidentiality kept in the model', [r.items.slice(0,2),b.m.risks.items[0].kind,b.m.risks.items.some(i=>i.id==='k-confidential')],
      [['Care lists and contact details kept private: only the people who need them see them','A visit, a call or a name shared only with the member’s consent'],'care',true]);
    c('…and no food-safety rule for a card (a library idea’s rooms are alternatives, not a kitchen it needs)', b.m.risks.kinds.includes('food'), false);
    const t=IN.find(x=>x.g==='hospitality'&&x.lang==='en').d.slides.find(s=>s.type==='risks');
    c('the team’s support list carries the same care', t.items.some(x=>/Care lists/.test(x))&&t.items.some(x=>/consent/.test(x)), true);
    c('the in-reach words: the board’s frame and the congregation’s ask speak of our own church family', [b.m.frame,IN.find(x=>x.g==='congregation'&&x.lang==='en').m.motion.ask],
      ['This is about our own church family: the members we see every week, and the ones we have not seen for a while.','For 6 weeks: pray for our church family, give one evening a month, or lead one part of a “we missed you” card after two Sabbaths away.']);
    c('Ellen White on caring for the church family: the congregation’s close (MH 470 / MC 373), the board’s handout (DA 678)',
      [IN.find(x=>x.g==='congregation'&&x.lang==='en').d.slides.find(s=>s.type==='close').quote.ref,IN.find(x=>x.g==='congregation'&&x.lang==='es').d.slides.find(s=>s.type==='close').quote.ref,b.m.egw.ref],
      ['Ellen G. White · The Ministry of Healing, p. 470','Elena G. de White · El Ministerio de Curación, p. 373','Ellen G. White · The Desire of Ages, p. 678']); }
  { const H=P.JE(`(()=>{ const m=caseModel('member-care-missed-you-card',{type:'board',group:'board'},{lang:'en',now:${NOW}}); const d=caseDeck(m); const H=caseHandout(m,d,{now:${NOW}});
      const doc=casePdfDoc(H,{jsPDF:window.__J}); const L=doc.__caseLog; return {fam:H.family,hero:!!H.hero,place:!!H.place,area:H.area,figs:H.figures.length,pages:doc.getNumberOfPages(),
        text:L.map(z=>z.t).join(' '),out:L.filter(z=>z.x0<z.bx0-0.5||z.x1>z.bx1+0.5).length}; })()`);
    c('the handout: the church family in place of the need and the place, no figures table', [!!H.fam,H.fam&&H.fam.items.length,H.hero,H.place,H.area,H.figs], [true,3,false,false,null,0]);
    c('…"Our church family" on the front, no Census anywhere, every line in its box, two pages', [/OUR CHURCH FAMILY/.test(H.text),/Census/.test(H.text),H.out,H.pages], [true,false,0,2]); }
  { const r=deckOf(P,'member-care-missed-you-card','board','board','en');
    P.E(`libSave(${JSON.stringify({...IDEA,id:'member-care-both-idea',reach:'both'})})`);
    const both=deckOf(P,'member-care-both-idea','board','board','en');
    // v10.42 part 3 (the relevance rule): "both" keeps the community deck (not "Our church family"), but a member-care idea's purpose
    // (family) allows no Census figure and no "Here in {town}"
    c('"both" keeps the community deck (no church family slide; its purpose allows no "Here in {town}")', [r.m.inreach,both.m.inreach,both.d.slides.some(s=>s.type==='place'&&/Here in/.test(s.kicker)),both.d.slides.some(s=>s.type==='place'&&s.kicker==='Our church family')], [true,false,false,false]); }
  { const Q=page({}); await ready(Q); setup(Q,{cap:{confirmed:false}});
    const r=deckOf(Q,'member-care-missed-you-card','board','board','en');
    // v10.42 part 3: the gifts item says the church's coverage below half (GIFTS.md §6.3)
    c('an unconfirmed church profile: its counts are left out, never estimated (gifts alone remain)', r.d.slides.find(s=>s.type==='place').facts.map(f=>f.label.replace(/\d+/g,'N')), ['of the N in worship have discovered their gifts']);
    c('…and the headline makes no count', r.d.slides.find(s=>s.type==='place').headline, 'God has given us one another'); }

  console.log('\n-- 4. the new groups --');
  { const G=P.JE('CASE_GROUPS'), ids=G.map(g=>g.id);
    const NEW={business:'board',worship:'team',childrens:'team',adventurers:'team',pathfinders:'team',evangelism:'team',prison:'team',liberty:'team',possibility:'team',stewardship:'team',conference:'conference'};
    c('the eleven new groups, each of its kind', Object.keys(NEW).map(id=>[id,(G.find(g=>g.id===id)||{}).type]), Object.entries(NEW));
    c('the business meeting sits beside the board', ids.indexOf('business'), ids.indexOf('board')+1);
    const CM={business:'pp. 134, 145',worship:'pp. 101, 124, 127–128',childrens:'pp. 93–95, 103–105',adventurers:'pp. 114, 140',pathfinders:'pp. 113, 140',evangelism:'pp. 91, 106–107, 137–138',
      prison:'p. 107',liberty:'pp. 101–102',possibility:'pp. 92–93',stewardship:'pp. 108–109, 142–143',conference:'pp. 32–35, 120–121, 134'};
    c('Church Manual 2022 pages as the research found them', Object.keys(CM).map(id=>G.find(g=>g.id===id).cm), Object.values(CM));
    const full=g=>['cares','fears'].every(k=>g[k]&&g[k].en.length&&g[k].en.length===g[k].es.length)&&['frame','role','ask','win','close'].every(k=>g[k+'En']&&g[k+'Es'])
      &&g.questions.length>=3&&g.questions.every(q=>q.qEn&&q.aEn&&q.qEs&&q.aEs)&&!!VL[g.verse];
    c('each with its cares, fears, frame, role, ask, win, close, three or more questions and its own verse, in English and Spanish', Object.keys(NEW).filter(id=>!full(G.find(g=>g.id===id))), []);
    const pages=Object.keys(NEW).map(id=>{ const g=G.find(x=>x.id===id); const cited=[...JSON.stringify(g).matchAll(/(?:Church Manual|Manual de la Iglesia),? (pp?\. [\d–, ]+)\)/g)].map(m=>m[1]);
      return [id,cited.filter(p=>!/^pp?\. (1[0-9]{2}|[2-9][0-9]|1[0-9])/.test(p))]; }).filter(x=>x[1].length);
    c('…every Church Manual page they cite is a page (no stray references)', pages, []);
    c('youth renamed: "Youth ministries (AY)" / "Ministerio Juvenil (JA)"', [G.find(g=>g.id==='youth').en,G.find(g=>g.id==='youth').es], ['Youth ministries (AY)','Ministerio Juvenil (JA)']);
    const page=[...P.JE('[...CASE_YOUTH_GROUPS]')].sort(), srv=/const YOUTH_GROUPS = new Set\(\[([^\]]+)\]\)/.exec(server)[1].match(/'([a-z]+)'/g).map(s=>s.slice(1,-1)).sort();
    c('the young people’s audiences are the same set on the page and on the server (no "I’m in" answers)', [page,srv], [['adventurers','pathfinders','school','youth'],['adventurers','pathfinders','school','youth']]);
    const decks=[]; for(const id of Object.keys(NEW).filter(id=>id!=='conference')) for(const lang of ['en','es']){ const r=deckOf(P,'food-pantry',id,NEW[id],lang); decks.push({id,lang,...r}); }
    c('their decks: the group’s own verse on a slide, answers off for Adventurers and Pathfinders', decks.map(b=>[b.id,b.lang,verseIds(b.d,b.lang).includes(G.find(g=>g.id===b.id).verse),b.m.yes.respond]),
      decks.map(b=>[b.id,b.lang,true,!['adventurers','pathfinders'].includes(b.id)]));
    c('…and no unfilled {placeholder}', decks.filter(b=>/\{[A-Za-z]+\}|undefined|NaN/.test(JSON.stringify(b.d))).map(b=>b.id), []); }

  console.log('\n-- 5. the conference proposal --');
  const CF=[]; for(const lang of ['en','es']){ const r=deckOf(P,'plan-series','conference','conference',lang); CF.push({lang,...r}); }
  const E0=CF[0], S0=CF[1];
  c('the Evangelism Planner’s series is a ministry the conference deck can argue', [E0.m.ok,E0.m.type,E0.m.ministry.plan,E0.m.ministry.name,S0.m.ministry.name], [true,'conference',true,'Evangelism series','Serie de evangelismo']);   // v10.41 review: "evangelismo", as the tile, the card and the Planner
  // v10.42 part 3 (NARRATIVE.md §5.4): the proposal and the goal, the mission (moved up), the field (the churches we serve), how it works,
  // what it takes, who is able, the plan and its dates, the ask, reporting back, the appeal; no hardship figure (field purpose)
  c('the slides: proposal, aims, churches, how, capacity, gifts, plan, ask, reporting, close (11 with the join)', E0.d.slides.map(s=>s.type+(s.part?'/'+s.part:'')),
    ['join','motion','risks/mission','place','how','capacity','ability','timeline','ask/after','ask','risks/report','close']);   // v10.43 (the pastor: "separate the things that are weekly or monthly… and events"): his series' "After the series" (12 with the join)
  // v10.42 part 3: beside the goal the opening keeps the rows a phone holds in both languages (measured); the churches are named on
  // their own slide, so their row gives way first
  c('the proposal names the town and the opening night (the churches by name on their own slide)', [E0.d.slides[1].headline,E0.d.slides[1].rows.slice(0,2),!!E0.d.slides[1].goal],
    ['An evangelism series in Warminster, opening 11 Sep 2027',[['Opening night','11 Sep 2027 · 18 nights'],['We ask for','A share of the cost and counsel']],true]);
  c('the churches we serve: counts from confirmed profiles only', [E0.d.slides[3].kicker,E0.d.slides[3].headline,E0.d.slides[3].facts.map(f=>f.value+' '+f.label)],
    ['The churches we serve','2 churches, one district',['135 Bucks County SDA: average Sabbath attendance','48 Fairview Village SDA: average Sabbath attendance']]);   // v10.41 review: attendance, not membership (the clerks hold that)
  // v10.41 review: in Pennsylvania the Evangelistic Report Form goes in as the meetings close (the subsidy policy the deck cites), so the
  // third step is dated then and names the follow-up report three months later (a timeline slide holds three steps; present-1.2)
  c('the plan’s own dates: preparation, opening night, and (Pennsylvania) the report form as the meetings close', E0.d.slides[7].steps.map(s=>s.date+' '+s.title),
    ['29 Sep 2026 Preparation begins','11 Sep 2027 Opening night','15 Oct 2027 Report form to the conference']);
  // v10.41 review: nothing is asked in his name that he did not tick ("The ask shows only what he ticks"): by default counsel, and a share
  // of the cost only when there is a cost to share (his Planner series has a budget); a Bible worker, training and materials only if he ticks them
  c('the ask by default: a share of the series budget from his planner (no share until he types one) and counsel, nothing else', E0.d.slides.find(s=>s.type==='ask'&&!s.part).rows,
    [['A share of the cost','Of $12,000 in all: the share to be agreed'],['Counsel','Your counsel on the plan and its dates']]);
  c('…the model and the handout keep every row, the Pennsylvania policy too', E0.m.conf.ask.rows.map(r=>r[0]), ['A share of the cost','Counsel','Conference policy']);
  c('reporting back and the aims served (Pennsylvania’s own goals for his conference)', [E0.d.slides.find(s=>s.part==='report').items[0],E0.d.slides[2].items],
    ['A written report to the conference after the meetings: attendance, decisions and baptisms',['Our series opens in September 2027, when All Things New plans public events','Pennsylvania Conference faith goal: “Lead 2,800 people to Christ during the quinquennium.”']]);
  c('…the slide shows what fits beside its verse (Matthew 28:19–20); the model and the handout keep every aim', [idOf('en',E0.d.slides[2].verse.ref),E0.m.conf.mission.map(x=>x.id)],
    ['matt28_19',['m-sept27','m-pa2800','m-pa27','m-ov27','m-iwg','m-cm']]);
  c('the close asks, and quotes Scripture (Isaiah 52:7)', [E0.d.slides.slice(-1)[0].headline,E0.d.slides.slice(-1)[0].quote.ref,S0.d.slides.slice(-1)[0].quote.ref], ['Will you partner with us?','Isaiah 52:7 · KJV','Isaías 52:7 · RVA']);
  { const ids=CF.map(b=>verseIds(b.d,b.lang));
    c('Scripture on every slide but the join, from the library, never twice, the same in both languages', [ids[0].filter((x,i)=>i>0&&!x).length,ids[0].filter(Boolean).length===new Set(ids[0].filter(Boolean)).size,JSON.stringify(ids[0])===JSON.stringify(ids[1])], [0,true,true]);
    c('…no Ellen White line on a slide; hers (9T 116, to leaders) is in the handout', [CF.some(b=>/White/.test(JSON.stringify(b.d))),E0.m.egw.ref], [false,'Ellen G. White · Testimonies for the Church, vol. 9, pp. 116–117']);
    c('…the group’s own verse, Romans 10:14–15, on the ask', ids[0][E0.d.slides.findIndex(s=>s.type==='ask'&&!s.part)], 'rom10_14'); }   // (v10.43: the ask follows "After the series")
  // v10.43 (the pastor: "separate the things that are weekly or monthly… and events… after one day there needs to be some kind of follow-up"): his series' "After the series" makes 12 (present.mjs's limit)
  c('the deck is a present-1.2 deck: audience conference, 12 slides, no answers asked', [E0.d.audience,E0.d.slides.length,E0.d.slides.some(s=>s.type==='yes')], [{type:'conference',group:'conference'},12,false]);
  c('no member’s name, no {placeholder}', CF.filter(b=>NAMES.some(n=>JSON.stringify(b.d).includes(n))||/\{[A-Za-z]+\}|undefined|NaN/.test(JSON.stringify(b.d))).length, 0);
  // his amounts, as he types them
  P.E(`uChurch().confAsk={cost:true,worker:true,speaker:true,training:false,materials:false,counsel:false,total:15000,share:7500}; uPersist();`);
  { const r=deckOf(P,'plan-series','conference','conference','en');
    c('when he types amounts and ticks a speaker: exactly his figures, and only what he ticked', r.d.slides.find(s=>s.type==='ask'&&!s.part).rows,
      [['A share of the cost','$7,500 of $15,000'],['A Bible worker','For the series and the follow-up'],['An evangelist or speaker','Approved under the conference’s guidelines']]);
    c('…the proposal lists them in words', r.d.slides[1].rows.find(x=>x[0]==='We ask for'), ['We ask for','A share of the cost, a Bible worker and a speaker']); }
  P.E(`uChurch().confAsk={cost:true,worker:true,speaker:true,training:true,materials:true,counsel:true,total:null,share:null}; uPersist();`);
  { const r=deckOf(P,'plan-series','conference','conference','es');
    c('all six ticked: four by name and one "Also" row on the slide (Spanish), all six in the handout', [r.d.slides.find(s=>s.type==='ask'&&!s.part).rows.length,r.d.slides.find(s=>s.type==='ask'&&!s.part).rows[4],r.m.conf.ask.rows.length],
      [5,['También','Materiales, consejo'],7]); }
  P.E(`delete uChurch().confAsk; uPersist();`);
  { const Q=page({reg:{conf:'Allegheny East'}}); await ready(Q); setup(Q,{plan:{...PLAN,date:'2027-03-06',budget:0}});
    Q.E(`uChurch().confAsk={cost:true}; uPersist();`);   // v10.41 review: with no budget the cost is not ticked for him; here he ticks it
    const r=deckOf(Q,'plan-series','conference','conference','en');
    c('another conference: no Pennsylvania goal, policy or form anywhere; one church, no "churches we serve" slide', [/Pennsylvania|subsidy/i.test(JSON.stringify(r.d)+JSON.stringify(r.m.conf)),r.d.slides.filter(s=>s.type==='place').length,r.m.conf.pa], [false,1,false]);
    c('…no amount at all when he has none', r.d.slides.find(s=>s.type==='ask'&&!s.part).rows[0], ['A share of the cost','The amount to be agreed with you']);
    c('…a series not in September 2027 claims no alignment with it', r.d.slides.find(s=>s.part==='mission').items.some(t=>/Our series opens/.test(t)), false);
    c('…the aims: only the verified ones (OneVoice27, All Things New, I Will Go 4.1, the Church Manual)', r.m.conf.mission.map(x=>x.id), ['m-ov27','m-atn','m-iwg','m-cm']); }
  { const r=P.JE(`(()=>{ const keep=DATA; DATA=null; try{ return caseSample({lang:'en',audience:{type:'conference',group:'conference'},now:${NOW}}); }finally{ DATA=keep; } })()`);
    c('the sample conference deck: the prophecy seminar, made-up churches, SAMPLE on every slide', [r.ok,r.deck.ministry.id,r.deck.slides[3].where,r.deck.slides.slice(1).every(s=>/^SAMPLE/.test(s.kicker||s.text||'')||s.type==='close')],
      [true,'proph-news','Sample Church · Sample Hill Church',true]); }
  { const H=P.JE(`(()=>{ const m=caseModel('plan-series',{type:'conference',group:'conference'},{lang:'en',now:${NOW}}); const d=caseDeck(m); const H=caseHandout(m,d,{now:${NOW}});
      const doc=casePdfDoc(H,{jsPDF:window.__J}); const L=doc.__caseLog; return {H,pages:doc.getNumberOfPages(),front:doc.__caseFront,out:L.filter(z=>z.x0<z.bx0-0.5||z.x1>z.bx1+0.5).length,text:L.map(z=>z.t).join(' '),name:casePdfName(H,${NOW})}; })()`);
    c('the handout: at most three pages, the front on one, every line in its box', [H.pages<=3,H.front,H.out], [true,1,0]);
    // v10.42.0 fix after review ("the money does not add up… The BUDGET block also holds rows that are not money"): a table that adds
    // up (the whole cost, the church's own, the rest), then what else is asked in one row, then the Pennsylvania policy
    c('…what we ask, how we report back, the aims (each with its published source), how the subsidy works', [H.H.labels.budget,H.H.budgetRows.map(r=>r[0]),H.H.labels.risks,H.H.mission.items.every(i=>i.src),!!H.H.apply,/Pennsylvania Conference Evangelism Subsidy Policy/.test(H.text)],
      ['What we ask of the conference',['Total cost','From the church budget','The conference’s share, and meeting offerings','Also asked','Conference policy'],'How we will report back',true,true,true]);   // v10.41 review: cost, counsel and the Pennsylvania policy by default
    c('…the churches on the front, the file named for the conference', [/THE CHURCHES WE SERVE/.test(H.text),H.name], [true,'Bucks-County-SDA-Evangelism-series-conference-2026-09-29.pdf']);
    // v10.42 part 3 (NARRATIVE.md §5.4, DESIGN N8): the field is one slide, the churches we serve (two churches), and the handout follows
    // the deck, so it has the churches and no "Here in" section
    c('…no "Here in" section beside the churches (the handout follows the deck), the series budget in full', [H.H.place,/\$2,500 of the \$12,000 needed/.test(H.text),/\$12k/.test(H.text)], [null,true,false]); }   // v10.41 final review: have first, then need (it read "$12,000 of $2,500")

  console.log('\n-- 5b. the pastor’s own ask, in the edit panel of the ask slide --');
  { P.E(`openTool('case'); render(); caseSetPrefs({ministry:'plan-series',type:'conference',group:'conference'}); caseDraw3();`);
    await sleep(50);
    const n=P.E(`CASE_ST.deck.slides.findIndex(s=>s.type==='ask')`);
    P.E(`document.querySelector('#cs-s3 [data-cs-go="${n}"]').click()`);
    await sleep(30);
    c('the fields appear on the conference ask slide: six kinds of help, the total and the share', [P.E(`document.querySelectorAll('#cs-s3 [data-cs-cask]').length`),P.E(`document.querySelectorAll('#cs-s3 [data-cs-camt]').length`),P.E(`document.querySelector('#cs-s3 .cs-cask h4').textContent`)],
      [6,2,'Your request to the conference']);
    c('…the planner’s budget offered as a note, never typed in for him', [P.E(`document.querySelector('#cs-s3 [data-cs-camt="total"]').value`),/From your Evangelism Planner: \$12,000/.test(P.E(`document.querySelector('#cs-s3 .cs-cask').textContent`))], ['',true]);
    P.E(`(()=>{ const i=document.querySelector('#cs-s3 [data-cs-camt="share"]'); i.value='$6,000'; i.dispatchEvent(new Event('input')); })()`);
    await sleep(400);
    c('typing a share saves it with the church and redraws the ask slide', [P.JE('uChurch().confAsk.share'),P.JE(`CASE_ST.deck.slides.find(s=>s.type==='ask'&&!s.part).rows[0]`)], [6000,['A share of the cost','$6,000 of $12,000']]);
    c('…the panel stays (his cursor is not lost)', !!P.E(`document.querySelector('#cs-s3 [data-cs-camt="share"]')`), true);
    P.E(`caseSetPrefs({ministry:'food-pantry',type:'board',group:'board'}); caseDraw3();`); await sleep(30);
    P.E(`document.querySelector('#cs-s3 [data-cs-go="6"]').click()`); await sleep(20);
    c('…and never on a board’s ask slide', P.E(`document.querySelectorAll('#cs-s3 [data-cs-cask]').length`), 0); }
  c('no errors', P.errs, []);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0); })();
