// Make the Case, the v10.39 review round (logic, security, e2e, visual, tests lenses):
// the fixes that live in the case model, the deck, the builder, the handout and the
// member's slides, each held here with the reviewer's own reproduction.
//  F2   a count never compared with the county; the group's emphasis leads only with a share;
//       no need slide when no share is reliable; Population listed once on the handout.
//  F3   "why here": "1 in N" only when it is "about 1 in N" and the county's N differs.
//  F4   money: one shortfall on the capacity and ask slides, an earlier overdraft on its own
//       line, the treasurer's answer never "$0 remains" when the plan is short, no "Short by $0".
//  F7   no ". ." and no ": …:" on shared slides.   F8  the ability slide's words by count.
//  F10  the pastor's to-dos never on the board's capacity slide; blockers first.
//  F11  the team invitation names the ministry without a church name.
//  F12  an AI draft's Spanish name.   S6  gifts counts from five adult respondents.
//  E2E-5  the pastor's PDF says his edited words, and the county as the slide does.
//  E2E-7  "ready to coordinate" counted among those whose gifts fit; "1 says".
//  E2E-10 a member's join slide.   E2E-12  the preview is the deck presented.
//  E2E-2  a member writing "I'm in" is not pulled away.
//  V5 V8 V10 V11 V12 V15 V17 V19, V13 (EN and ES choose the same rows), F1 (the Spanish
//  "why here" budget), tests F2 (the landing goes when a survey loads), S8 (expired slides
//  pruned on any page load). jsdom does no layout: Chrome checks the look (V1 V3 V4 V6).
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,600));console.log('    want:',JSON.stringify(e).slice(0,400));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const NOW=Date.UTC(2026,8,28,15);
function page(o={}){
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:o.url||'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      if(o.ls) Object.entries(o.ls).forEach(([k,v])=>w.localStorage.setItem(k,v));
      w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,D:w.document,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
    txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
// A sample neighbourhood with some figures changed (as the reviewers' repro.js).
const ctx=set=>`(()=>{ const ctx=caseSampleCtx(); const m=ctx.M.tract,k=ctx.M.county; (${set})(m,k); ctx.hits=caseHits(ctx.M,'tract'); return ctx; })()`;
const ALL_CV_OVER_40=`(m,k)=>{ Object.keys(m.moe).forEach(x=>{ if(typeof m[x]==='number') m.moe[x]=m[x]*0.9; }); }`;
const mkGifts=`const mk=b=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=b.includes(g.id)?4:1; }); return gfScores(a); };
  const Pm=(i,name,b,h,x)=>({id:'m'+i,name,gifts:mk(b),heart:h,confirmed:true,willing:true,hours:6,skills:['kids'],source:'manual',...(x||{})});`;

(async()=>{ try{
  const P=page(); await sleep(1300);
  c('no boot errors', P.errs, []);
  const D=JSON.parse(JSON.stringify(FX.DATA));
  D.M.tract.moe=P.J('CASE_SAMPLE.M.tract.moe'); D.M.county.moe=P.J('CASE_SAMPLE.M.county.moe');
  const own=(prof,sel)=>P.E(`DATA=${JSON.stringify(D)};SCOPE="tract"; uChurch().name="Bucks County SDA"; CAP=null; capSave(${JSON.stringify(prof)}); uChurch().selected=${JSON.stringify(sel||[])}; uPersist(); U_PEOPLE_CACHE=null;`);

  console.log('\n-- F2: counts, the group’s emphasis, the fallback --');
  { const r=P.J(`(()=>{ const M=caseModel('food-pantry',{type:'congregation',group:'congregation'},{ctx:${ctx(ALL_CV_OVER_40)},now:${NOW}}); const d=caseDeck(M);
      return {hero:M.need.hero&&M.need.hero.key,stats:d.slides.filter(s=>s.type==='stat').map(s=>s.headline),pops:caseHandout(M,d,{}).figures.filter(f=>f.label==='Population').length,
        verdicts:caseHandout(M,d,{}).figures.filter(f=>f.label==='Population').map(f=>f.compare)}; })()`);
    c('every figure too unreliable (CV > 40): no hero, so no "One thing we learned: About 5,480 people live around us"', [r.hero,r.stats.length,r.stats.some(h=>/people live around us/.test(h))], [null,1,false]);
    c('…the handout lists Population once, with no verdict against the county', [r.pops,r.verdicts], [1,[null]]); }
  { const r=P.J(`(()=>{ const f=caseFig('pop',{m:CASE_SAMPLE.M.tract,c:CASE_SAMPLE.M.county,area:'A',acs:'ACS',hits:new Set()}); return [f.kind,f.cmp,f.compareWords,f.sig]; })()`);
    c('a count (Population) is never tested against the county’s count', r, ['count',null,null,null]); }
  { const r=P.J(`(()=>{ const M=caseModel('food-pantry',{type:'board',group:'finance'},{ctx:${ctx(ALL_CV_OVER_40)},now:${NOW}}); const s=caseDeck(M).slides.find(s=>s.type==='stat'); return [M.need.hero&&M.need.hero.key,s?s.headline:null]; })()`);
    c('the treasurer’s food-pantry deck never leads "The need" with median household income', r, [null,null]); }
  { const r=P.J(`(()=>{ const M=caseModel('food-pantry',{type:'board',group:'finance'},{ctx:${ctx(`(m,k)=>{ ['snap','noCar','poverty','childPoverty','foodInsecure'].forEach(x=>{ if(typeof m[x]==='number') m.moe[x]=m[x]*0.9; }); }`)},now:${NOW}}); return M.need.hero&&[M.need.hero.key,M.need.hero.kind]; })()`);
    c('…when a share is reliable it leads instead (a share, never money or a count)', r&&r[1], 'pct'); }
  { const r=P.J(`(()=>{ const M=caseModel('pathfinders',{type:'board',group:'board'},{ctx:caseSampleCtx(),now:${NOW}}); return [M.need.hero.key,M.need.hero.kind]; })()`);
    c('the ordinary case is unchanged: a share leads', r[1], 'pct'); }

  console.log('\n-- F3: "why here" cards never drop the qualifier --');
  { const r=P.J(`(()=>{ const M=caseModel('food-pantry',{type:'board',group:'board'},{ctx:${ctx(`(m,k)=>{ m.kidsShare=28; m.moe.kidsShare=1.5; k.kidsShare=26; k.moe.kidsShare=0.3; }`)},now:${NOW}});
      const f=M.need.trio.find(f=>f.key==='kidsShare'); const t=caseDeck(M).slides.find(s=>s.type==='trio'); return {cmp:f&&f.cmp.dir,card:t&&t.items[M.need.trio.indexOf(f)]}; })()`);
    c('28% (significantly higher) against 26%: percentages both sides, never "1 in 4 … County: more than 1 in 4"', [r.cmp,r.card&&r.card.value,r.card&&/County: 26%\./.test(r.card.label),r.card&&/1 in 4/.test(r.card.label)], ['higher','28%',true,false]); }
  { const r=P.J(`(()=>{ const M=caseModel('pathfinders',{type:'board',group:'elders'},{ctx:${ctx(`(m,k)=>{ m.singleParent=62; m.moe.singleParent=8; }`)},now:${NOW}}); const t=caseDeck(M).slides.find(s=>s.type==='trio'); return t?t.items.filter(i=>/single parent|Single/.test(i.label)):[]; })()`);
    c('62% single-parent families read 62%, never a bare "1 in 2"', r.map(i=>i.value), ['62%']); }
  { const r=P.J(`(()=>{ const M=caseModel('prayer-box',{type:'board',group:'deacons'},{ctx:${ctx(`(m,k)=>{ m.renters=65; m.moe.renters=4; }`)},now:${NOW},lang:'es'}); const t=caseDeck(M).slides.find(s=>s.type==='trio'); return t?t.items.filter(i=>/alquil|Inquilin|Hogares que alquilan/i.test(i.label)).map(i=>i.value):[]; })()`);
    c('ES: 65% renters read 65%, never "1 de cada 2"', r.every(v=>v==='65%')&&r.length>0, true); }
  { const r=P.J(`(()=>{ const M=caseModel('pathfinders',{type:'board',group:'board'},{ctx:caseSampleCtx(),now:${NOW}}); const t=caseDeck(M).slides.find(s=>s.type==='trio');
      return M.need.trio.map((f,i)=>({w:f.freqWord,d:f.den,cd:f.countyDen,v:t.items[i].value})); })()`);
    c('"1 in N" stays exactly where it is "about 1 in N" here and a different N in the county', r.every(x=>/ in /.test(x.v)===(x.w==='about'&&x.d!==x.cd)), true); }

  console.log('\n-- F4: money, one shortfall --');
  own(FX.SMALL,['health-expo','proph-language','backpack-giveaway']);
  { const r=P.J(`(()=>{ const m=caseModel('food-pantry',{type:'board',group:'board'},{now:${NOW}}); const d=caseDeck(m);
      return {free:[m.capacity.free.startup,m.capacity.free.monthly],gaps:m.capacity.gaps.filter(g=>/\\$/.test(g)),ask:d.slides.find(s=>s.type==='ask').rows.filter(r=>/\\$/.test(r[1])&&/Left|over/.test(r[0])),cost:m.questions.find(q=>q.id==='board.cost').a}; })()`);
    c('(the SMALL church, three costly ministries chosen: start-up and monthly already overdrawn)', r.free.map(v=>v<0), [true,true]);
    c('capacity: this ministry’s own shortfall, in one money line', r.gaps, ['Short by $75 of the start-up budget · $25 a month']);
    c('ask: the same shortfall (the slide’s short form), and the earlier overdraft on a line of its own', r.ask, [['Left after this','Short by $75 to start · $25 a month'],['Already over budget',`$${(-r.free[0]).toLocaleString('en-US')} to start · $${-r.free[1]} a month`]]);
    c('an earlier overdraft takes the verse’s place on the ask slide (seven rows fit a phone; measured in Chrome)', P.J(`caseDeck(caseModel('food-pantry',{type:'board',group:'board'},{now:${NOW}})).slides.find(s=>s.type==='ask').verse`), null);
    c('the treasurer hears the shortfall, never "$0 … remains"', [/\$0 of the start-up budget/.test(r.cost),/the budget is short by \$1,875 of the start-up budget and \$65 a month/.test(r.cost)], [false,true]); }
  { const r=P.J(`caseDeck(caseModel('vbs',{type:'board',group:'board'},{now:${NOW}})).slides.find(s=>s.type==='capacity').gaps`);
    c('a ministry that needs nothing a month is never "Short by $0 a month"', r.some(g=>/\$0\b/.test(g)), false); }
  own(FX.SMALL,[]);
  { const r=P.J(`(()=>{ const m=caseModel('vbs',{type:'board',group:'board'},{now:${NOW}}); const d=caseDeck(m); return {cap:d.slides.find(s=>s.type==='capacity').gaps.filter(g=>/\\$/.test(g)),left:d.slides.find(s=>s.type==='ask').rows.find(r=>/Left/.test(r[0])),over:d.slides.find(s=>s.type==='ask').rows.find(r=>/over/.test(r[0]))||null,cost:m.questions.find(q=>q.id==='board.cost').a,
      es:caseModel('vbs',{type:'board',group:'board'},{now:${NOW},lang:'es'}).questions.find(q=>q.id==='board.cost').a}; })()`);
    c('VBS ($375 against $300): capacity, ask and answer agree on $75', [r.cap,r.left[1],r.over,/short by \$75 of the start-up budget, so the board would need to find that sum/.test(r.cost)], [['Short by $75 of the start-up budget'],'Short by $75 to start',null,true]);
    c('…in Spanish too: "Después faltan $75 del presupuesto inicial"', /Después faltan \$75 del presupuesto inicial/.test(r.es), true); }
  own(FX.MEDIUM,[]);
  { const r=P.J(`caseModel('food-pantry',{type:'board',group:'board'},{now:${NOW}}).questions.find(q=>q.id==='board.cost').a`);
    c('with money to spare the answer still says what remains', /After it, \$[\d,]+ of the start-up budget and \$[\d,]+ a month remains in the budget\./.test(r), true);
    c('…and the ask slide keeps Luke 14:28', P.J(`caseDeck(caseModel('food-pantry',{type:'board',group:'board'},{now:${NOW}})).slides.find(s=>s.type==='ask').verse.ref`), 'Luke 14:28 · KJV'); }

  console.log('\n-- F7: punctuation on shared slides --');
  { const r=P.J(`caseDeck(caseModel('interpreter-bank',{type:'board',group:'elders'},{now:${NOW},lang:'es'})).slides.find(s=>s.type==='trio').items.map(i=>i.label)`);
    c('ES: "Nacidos fuera de EE. UU." takes no second full stop', r.some(l=>/\.\./.test(l)), false); }
  own(FX.SMALL,[]);
  { const r=P.J(`caseModel('food-pantry',{type:'board',group:'board'},{now:${NOW}}).capacity`);
    c('a skill gap has one colon at most ("Someone free for this (…)")', [...r.gaps,...r.todo].filter(g=>/Someone free/.test(g)).every(g=>(g.match(/:/g)||[]).length<=1), true); }
  own(FX.MEDIUM,[]);

  console.log('\n-- F10: the board sees shortfalls, the pastor his to-dos --');
  { const r=P.J(`(()=>{ const m=caseModel('food-pantry',{type:'board',group:'board'},{now:${NOW}}); const d=caseDeck(m); const s=d.slides.find(s=>s.type==='capacity'); return {gaps:s.gaps,todo:m.capacity.todo,head:s.headline,ok:m.capacity.ok}; })()`);
    const pastor=['Confirm the link to a published local figure','Review and save the church profile','Review this idea’s requirements','Record the languages members speak','Record the approved budget, even if it is zero'];
    c('no pastor’s to-do on the shared capacity slide', r.gaps.filter(g=>pastor.includes(g)), []);
    c('…they are in the model’s own list for the builder', r.todo.every(t=>pastor.includes(t)||/ministry that is no longer available/.test(t)), true); }
  { own(FX.SMALL,['health-expo','proph-language','backpack-giveaway']);
    const r=P.J(`(()=>{ const m=caseModel('vbs',{type:'board',group:'board'},{now:${NOW}}); return {gaps:caseDeck(m).slides.find(s=>s.type==='capacity').gaps,all:m.capacity.gaps}; })()`);
    c('an overloaded plan keeps its blockers on the slide: room and time before shared rooms and skills', [r.gaps.length<=6,r.all.findIndex(g=>/^A room for/.test(g))<r.all.findIndex(g=>/Someone free|different time/.test(g))||r.all.findIndex(g=>/Someone free|different time/.test(g))<0], [true,true]);
    const order=['Short by \\d+ more volunteer','Short by \\d+ more leader','volunteer hours','budget|a month','^A room for','^A time when','^A different time','^Someone free'].map(x=>new RegExp(x));
    const pos=r.all.map(g=>order.findIndex(re=>re.test(g)));
    c('…in the order people, leaders, hours, money, room, time, shared room, skill', pos.every((p,i)=>i===0||p>=pos[i-1]), true);
    const sl=P.J(`(()=>{ const m=caseModel('vbs',{type:'board',group:'board'},{now:${NOW}}); return {slide:caseDeck(m).slides.find(s=>s.type==='capacity').gaps,rows:m.capacity.rows.filter(x=>x.need>x.have).length}; })()`);
    c('…the slide’s few lines lead with what no meter shows (a room, a time), the metered shortfalls after', [sl.rows>0,/^A room for|^A time when|^A different time|^Someone free/.test(sl.slide[0])], [true,true]);
    P.E(`uChurch().proposalPrefs={ministry:'vbs',type:'board',group:'board'}; openTool('case'); render();`);
    c('the builder shows him the shortfalls (and any to-dos) before he presents', [/Still to settle before you present/.test(P.txt('#casebody .cs-warn')||''),/A room for/.test(P.txt('#casebody .cs-warn')||'')], [true,true]);
    own(FX.MEDIUM,[]); }
  { own(FX.MEDIUM,[]);
    const r=P.J(`(()=>{ const m=caseModel('food-pantry',{type:'board',group:'board'},{ctx:caseSampleCtx(),now:${NOW}}); return [m.capacity.rows.every(x=>x.need<=x.have),caseDeck(m).slides.find(s=>s.type==='capacity').headline,m.capacity.gaps]; })()`);
    c('every row covered and no shared gap: "We can staff it" headline', [r[0],r[2].length===0?r[1]===P.E(`caseT(CASE_COPY.head.capacityOk)`):true], [true,true]); }

  console.log('\n-- F11: the team invitation without a church name --');
  { const r=P.J(`(()=>{ const n=uChurch().name; uChurch().name='My church'; const a=caseModel('food-pantry',{type:'team',group:'community'},{now:${NOW}}).motion.by, b=caseModel('food-pantry',{type:'team',group:'community'},{now:${NOW},lang:'es'}).motion.by; uChurch().name=n; return [a,b]; })()`);
    c('"My church" (unnamed): the line still names the ministry and the date', [/^A real food pantry.* · 28 Sep 2026$/i.test(r[0]||''),/ · 28 sep 2026$/.test(r[1]||'')], [true,true]); }

  console.log('\n-- F12: an AI draft’s Spanish name --');
  { P.E(`uChurch().drafts=[{id:'draft-homework',n:'Saturday homework table for kids',generated:true,need:['kids'],metric:'kidsShare',why:()=> 'x 1',evidenceArea:DATA.levels[SCOPE].name,reviewedEvidence:true,reviewed:true}]; uPersist();`);
    const a=P.J(`(()=>{ const m=caseModel('draft-homework',{type:'board',group:'board'},{now:${NOW},lang:'es'}); return m.ok?[m.ministry.draftNameEn,caseDeck(m).title]:[m.error]; })()`);
    c('a draft in a Spanish deck without a Spanish name: flagged for the builder', a[0], true);
    P.E(`uChurch().drafts[0].nEs='Mesa de tareas del sábado para niños'; uPersist();`);
    const b=P.J(`(()=>{ const m=caseModel('draft-homework',{type:'board',group:'board'},{now:${NOW},lang:'es'}); return [m.ministry.draftNameEn,caseDeck(m).title,m.motion.headline]; })()`);
    c('…with one, the Spanish decks use it', [b[0],b[1],/Mesa de tareas del sábado para niños/.test(b[2])], [false,'Mesa de tareas del sábado para niños',true]);
    c('…the English deck keeps the English name', P.J(`caseDeck(caseModel('draft-homework',{type:'board',group:'board'},{now:${NOW}})).title`), 'Saturday homework table for kids');
    c('the Adjust form has the field for a draft', P.E(`uEditMinistry.toString()`).includes('name="nEs"'), true);
    P.E(`uChurch().drafts=[]; uPersist();`); }

  console.log('\n-- S6 + E2E-7 + F8: gifts counts --');
  const members=n=>P.E(`(()=>{ ${mkGifts}
    const all=[Pm(0,'Ana Lopez',['teach','shep','creative','helps'],{children:2,families:2}),Pm(1,'Ben Carter',['teach','shep','encour'],{children:1}),
      Pm(2,'Cara Diaz',['teach','creative','helps','mercy'],{}),Pm(3,'Dan Evans',['admin','leader','giving'],{poor:2}),Pm(4,'Eve Fox',['mercy','helps','serve','hosp'],{poor:2,families:1}),Pm(5,'Gus Hill',['evang','mission','hosp'],{newcomers:2})];
    uChurch().members=all.slice(0,${n}); uPersist(); U_PEOPLE_CACHE=null; })()`);
  for(const n of [1,4]){ members(n);
    const r=P.J(`(()=>{ const m=caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW}}); const d=caseDeck(m); const a=d.slides.find(s=>s.type==='ability'); const H=caseHandout(m,d,{});
      return {has:m.gifts.has,few:m.gifts.few,label:a.label,src:a.source,lead:a.lead,h:H.gifts.text,hs:H.gifts.source,hn:[H.gifts.fit,H.gifts.respondents]}; })()`);
    c(`${n} adult respondent${n>1?'s':''}: no gifts counts on the slide (the profile’s skills instead)`, [r.has,r.few,/gifts that fit|Member/.test(r.label),/Spiritual Gifts results/.test(r.src),r.lead], [false,true,false,false,'']);
    c(`…nor in the handout, which never says "not taken yet"`, [/\d+ of \d+ members/.test(r.h),/No Spiritual Gifts results yet/.test(r.h),r.hs,r.hn], [false,false,'',[0,0]]); }
  members(1); P.E(`uChurch().proposalPrefs={ministry:'pathfinders',type:'board',group:'board'}; openTool('case'); render();`);
  c('…the builder tells the pastor why (five or more adults)', /once 5 or more adults have taken/.test(P.txt('#casebody')||''), true);
  members(6);
  { const r=P.J(`(()=>{ const m=caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW}}); const a=caseDeck(m).slides.find(s=>s.type==='ability'); return {g:m.gifts,value:a.value,src:a.source}; })()`);
    c('six respondents: the counts show', [r.g.has,r.value===String(r.g.fit),/from 6 members/.test(r.src)], [true,true,true]);
    c('E2E-7: "ready to coordinate" never more than "fit this work"', [r.g.ready<=r.g.fit,r.g.couldLead<=r.g.fit], [true,true]); }
  { const bad=P.J(`(()=>{ const out=[]; SIGNATURE.forEach(x=>['board','team','congregation'].forEach(t=>{ const m=caseModel(x.id,{type:t},{now:${NOW}}); if(m.ok&&m.gifts.has&&(m.gifts.ready>m.gifts.fit||m.gifts.ready+m.gifts.couldLead>Math.max(m.gifts.fit,0)+m.gifts.couldLead)) out.push(x.id+'/'+t); })); return out; })()`);
    c('…across every ministry and kind', bad, []);
    const s=P.J(`(()=>{ const out=[]; SIGNATURE.slice(0,40).forEach(x=>{ const m=caseModel(x.id,{type:'board'},{ctx:caseSampleCtx(),now:${NOW}}); if(m.ok&&m.gifts.ready>m.gifts.fit) out.push(x.id); }); return out; })()`);
    c('…and in the sample’s made-up counts', s, []); }
  { const H=P.J(`(()=>{ const m=caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW}}); m.gifts={...m.gifts,fit:1,drawn:1,ready:1}; const e=caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW},lang:'es'}); e.gifts={...e.gifts,fit:1,drawn:1,ready:1};
      return [caseHandout(m,null,{}).gifts.text,caseHandout(e,null,{}).gifts.text]; })()`);
    c('the handout agrees with its count: "1 of 6 members … fits this work; 1 says …"', /1 of 6 members who took the Spiritual Gifts assessment fits this work; 1 says they are drawn to it, and 1 could lead it\./.test(H[0]), true);
    c('…ES: "1 … encaja …; 1 dice que le atrae y 1 podría dirigirla"', /1 de los 6 miembros .* encaja con esta obra; 1 dice que le atrae y 1 podría dirigirla\./.test(H[1]), true); }
  { const r=P.J(`(()=>{ const f=(fit,drawn,lang)=>{ const m=caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW},lang}); m.gifts={...m.gifts,has:true,fit,drawn,could:fit-drawn}; m.vals={...m.vals,fit:caseNoun(CASE_X.members,fit),drawn:String(drawn)}; return caseDeck(m).slides.find(s=>s.type==='ability'); };
      return [[1,1,'en'],[1,0,'en'],[2,0,'en'],[3,2,'en'],[1,1,'es'],[1,0,'es'],[2,0,'es']].map(([a,b,l])=>{ const s=f(a,b,l); return [s.value,s.label]; }); })()`);
    c('F8: one member, drawn', r[0], ['1','Member whose gifts fit this work, and who said they are drawn to it.']);
    c('F8: one member, not drawn', r[1], ['1','Member whose gifts fit this work.']);
    c('F8: several, none drawn yet', r[2], ['2','Members with gifts that fit this work; none has said yet that they are drawn to it.']);
    c('F8: several, some drawn (unchanged)', r[3], ['3','Members with gifts that fit this work; 2 of them said they are drawn to it.']);
    c('F8 ES', [r[4][1],r[5][1],r[6][1]], ['Miembro con dones adecuados para esta obra y con especial interés en ella.','Miembro con dones adecuados para esta obra.','Miembros con dones adecuados para esta obra; ninguno ha expresado aún un interés especial en ella.']); }

  console.log('\n-- E2E-5: the pastor’s PDF says what he presents --');
  { P.E(`uChurch().proposalPrefs={ministry:'pathfinders',type:'board',group:'board'}; openTool('case'); render();`);
    P.E(`(()=>{ const k=caseSlotKeys(CASE_ST.base)[CASE_ST.base.slides.findIndex(s=>s.type==='motion')]; caseEditSet(k,'headline','Approve a six-week trial that opens our doors to the families on our street',CASE_ST.base.slides.find(s=>s.type==='motion').headline); caseMount(); })()`);
    const r=P.J(`(()=>{ const d=CASE_ST.deck, H=caseHandout(CASE_ST.model,d,{}), M=caseHandout(null,d,{}); return {deck:d.slides.find(s=>s.type==='motion').headline,title:H.title,county:[H.hero.county,M.hero.county],here:[H.hero.here,M.hero.here]}; })()`);
    c('(the edit is on the deck the phones get)', r.deck, 'Approve a six-week trial that opens our doors to the families on our street');
    c('the pastor’s handout title is his edited motion', r.title, r.deck);
    c('the pastor’s and the member’s handouts write the county alike', r.county[0], r.county[1]);
    c('…and the local figure alike', r.here[0], r.here[1]);
    c('casePdf passes the deck he sees (CASE_ST.deck)', P.E(`caseAct.toString()`).includes(`casePdf(CASE_ST.model,{deck:CASE_ST.deck})`), true);
    P.E(`uChurch().caseEdits={}; uPersist();`); }

  console.log('\n-- E2E-12: the preview is the deck presented --');
  { P.E(`uChurch().proposalPrefs={ministry:'pathfinders',type:'congregation',group:'congregation'}; uChurch().caseRooms={}; openTool('case'); render();`);
    const a=P.J(`[CASE_ST.model.yes.respond,CASE_ST.deck.slides.find(s=>s.type==='close').text]`);
    c('no link yet: "I’m in" on, as the setup starts it; the close slide says so', [a[0],/Tap “I’m in” on your phone/.test(a[1])], [true,true]);
    P.E(`uChurch().caseRooms={'pathfinders|congregation|congregation|en':{room:'A'.repeat(22),key:'k'.repeat(43),code:'K7M2QX',url:'https://pastorshub.org/#watch=${'A'.repeat(22)}',expires:Date.now()+864e5,respond:false,ended:null}}; caseMount(true);`);
    c('an open link with answers off: the preview has them off too', P.J(`CASE_ST.model.yes.respond`), false);
    P.E(`uChurch().caseRooms={}; uPersist();`);
    P.E(`uChurch().proposalPrefs={ministry:'pathfinders',type:'team',group:'youth'}; caseMount(true);`);
    c('a young people’s group: off, whatever the default', P.J(`CASE_ST.model.yes.respond`), false); }

  console.log('\n-- V13: English and Spanish choose the same rows --');
  { const r=P.J(`(()=>{ const out=[]; let n=0; const ctx0=()=>caseSampleCtx();
      CASE_GROUPS.forEach(G=>SIGNATURE.forEach(x=>{ const a=caseModel(x.id,{type:G.type,group:G.id},{ctx:ctx0(),lang:'en',now:${NOW}}), b=caseModel(x.id,{type:G.type,group:G.id},{ctx:ctx0(),lang:'es',now:${NOW}}); if(!a.ok||!b.ok) return; n++;
        const k=m=>[m.risks.items.map(i=>i.id).join(','),m.need.design.map(f=>f.key).join(','),m.support.items.length,m.need.trio.map(f=>f.key).join(',')].join(' | ');
        if(k(a)!==k(b)) out.push(G.id+'/'+x.id+': '+k(a)+' ≠ '+k(b)); })); return {n,out:out.slice(0,5),bad:out.length}; })()`);
    c(`every ministry × group (${r.n} pairs): the same risk rows, design cards, support rows and trio figures in EN and ES`, [r.n>=2000,r.bad,r.out], [true,0,[]]); }
  { const r=P.J(`[caseModel('pathfinders',{type:'board',group:'board'},{ctx:caseSampleCtx(),now:${NOW}}).risks.items.map(i=>i.id),caseModel('pathfinders',{type:'board',group:'board'},{ctx:caseSampleCtx(),now:${NOW},lang:'es'}).risks.items.map(i=>i.id)]`);
    c('the Pathfinders board keeps its five safeguards in Spanish, the open door included', [r[1].length,r[1].includes('c-door'),r[0].join()===r[1].join()], [5,true,true]); }

  console.log('\n-- F1: the Spanish "why here" cards fit --');
  { const r=P.J(`(()=>{ const out=[]; let n=0; CASE_GROUPS.filter(g=>g.type==='board').forEach(G=>SIGNATURE.forEach(x=>{ const m=caseModel(x.id,{type:'board',group:G.id},{ctx:caseSampleCtx(),lang:'es',now:${NOW}}); if(!m.ok) return; const t=caseDeck(m).slides.find(s=>s.type==='trio'); if(!t) return; n++;
      const sum=t.items.reduce((a,i)=>a+i.label.length,0); if(sum>CASE_TRIO_BUDGET.es&&t.items.some(i=>/de nuestro entorno/.test(i.label))) out.push(G.id+'/'+x.id+' '+sum); })); return {n,out}; })()`);
    c(`ES: no "why here" slide keeps its long sentences above ${P.E('CASE_TRIO_BUDGET.es')} characters (${r.n} decks)`, r.out, []);
    c('the budgets: 250 in English, 225 in Spanish', P.J('CASE_TRIO_BUDGET'), {en:250,es:225}); }

  console.log('\n-- the slides: V15, E2E-10, E2E-2 --');
  { const r=P.J(`(()=>{ const h=document.createElement('div'); document.body.appendChild(h);
      const ctl=tdeckRender({kind:'tdeck',ver:1,lang:'en',slides:[{type:'stat',kicker:'The need',headline:'About 1 in 4 people around us is a child',value:'27',unit:'%',hue:'children',freq:'about 1 in 4',count:'about 1,490 children',dots:null,compare:null,source:'s'},
        {type:'stat',kicker:'The need',headline:'The families around us',value:'27',unit:'%',hue:'children',freq:'about 1 in 4',count:'about 1,490 children',dots:null,compare:null,source:'s'}]},h,{mode:'browse',keys:false});
      const T=e=>e?e.textContent.replace(/\u00a0/g,' '):null;
      const s=[...h.querySelectorAll('.td-slide')].map(x=>[T(x.querySelector('.td-freq')),T(x.querySelector('.td-count'))]); ctl.destroy(); h.remove(); return s; })()`);
    c('V15: a headline that says "about 1 in 4" keeps only the count below the number', r[0], [null,'about 1,490 children']);
    c('…one that does not still shows it', r[1], ['About 1 in 4','about 1,490 children']); }
  { const r=P.J(`(()=>{ const d={kind:'tdeck',ver:1,lang:'en',title:'Food pantry',slides:[{type:'join',qrUrl:'https://pastorshub.org/#watch=${'A'.repeat(22)}',code6:'GSC7DQ',note:''},{type:'verse',text:'x',ref:'y'}]};
      const T=e=>e?e.textContent.replace(/\u00a0/g,' '):null;
      const out={}; for(const mode of ['follow','present']){ const h=document.createElement('div'); document.body.appendChild(h); const ctl=tdeckRender(d,h,{mode,keys:false,presenter:0,qrSvg:'<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>'});
        const j=h.querySelector('.td-t-join'); out[mode]=[T(j.querySelector('.td-scan')),!!j.querySelector('.td-qrtile'),T(j.querySelector('.td-codeshare')),!!j.querySelector('.td-code')]; ctl.destroy(); h.remove(); }
      const es=document.createElement('div'); document.body.appendChild(es); const c2=tdeckRender({...d,lang:'es'},es,{mode:'follow',keys:false}); out.es=[T(es.querySelector('.td-scan')),T(es.querySelector('.td-codeshare'))]; c2.destroy(); es.remove(); return out; })()`);
    c('E2E-10: on a member’s phone the join slide welcomes and passes the code on (no scan prompt, no empty QR)', r.follow, ['You’re following along',false,'Code GSC7DQ · share it with a neighbour',false]);
    c('…the presenter’s screen keeps the QR code and the big code', r.present, ['Scan to follow on your phone',true,null,true]);
    c('…in Spanish', r.es, ['Está siguiendo la presentación','Código GSC7DQ · compártalo con quien tenga al lado']); }
  { const r=JSON.parse(JSON.stringify(await P.E(`(()=>{ const d={kind:'tdeck',ver:1,lang:'en',slides:[{type:'verse',text:'a',ref:'b'},{type:'yes',kicker:'Yes',headline:'Three sizes of yes',respond:true,options:[{k:'pray',label:'Pray',text:'t'},{k:'help',label:'Help',text:'t'},{k:'lead',label:'Lead',text:'t'}]},{type:'close',headline:'Close',text:'x'},{type:'verse',text:'c',ref:'d'}]};
      const h=document.createElement('div'); document.body.appendChild(h);
      let sent=null; const ctl=tdeckRender(d,h,{mode:'follow',keys:false,presenter:1,onRespond:x=>{ sent=x; return Promise.resolve(); }});
      const out=[]; const yes=h.querySelectorAll('.td-slide')[1];
      ctl.setIndex(1); out.push(['on yes',ctl.index(),ctl.following()]);
      yes.querySelector('.td-opt[data-k="lead"]').click(); yes.querySelectorAll('.td-agebtn')[0].click();
      const nm=yes.querySelector('.td-name'); nm.focus(); nm.value='Mar'; nm.dispatchEvent(new Event('input'));
      ctl.setIndex(2); out.push(['presenter moves on while she types',ctl.index(),ctl.following(),!h.querySelector('.td-pill').hidden,h.querySelector('.td-ptx').textContent.replace(/\u00a0/g,' '),document.activeElement===nm]);
      ctl.setIndex(3); out.push(['and on again',ctl.index(),ctl.following()]);
      nm.value='Maria'; nm.dispatchEvent(new Event('input')); yes.querySelector('.td-send').click();
      return new Promise(res=>setTimeout(()=>{ out.push(['sent: the thank-you stays',ctl.index(),!!yes.querySelector('.td-yesdone'),sent&&sent.name]);
        h.querySelector('.td-pback').click(); out.push(['Back to live',ctl.index(),ctl.following()]);
        // a member who only looks at the yes slide still follows
        const h2=document.createElement('div'); document.body.appendChild(h2); const c2=tdeckRender(d,h2,{mode:'follow',keys:false,presenter:1,onRespond:()=>Promise.resolve()});
        c2.setIndex(2); out.push(['nothing picked: follows',c2.index(),c2.following()]);
        const h3=document.createElement('div'); document.body.appendChild(h3); const c3=tdeckRender(d,h3,{mode:'follow',keys:false,presenter:1,onRespond:()=>Promise.resolve()});
        const y3=h3.querySelectorAll('.td-slide')[1]; y3.querySelector('.td-opt').click(); y3.querySelectorAll('.td-agebtn')[1].click();
        c3.setIndex(2); out.push(['under 18 (nothing to send): follows',c3.index(),c3.following()]);
        ctl.destroy(); c2.destroy(); c3.destroy(); res(out); },20)); })()`)));
    c('E2E-2: on the yes slide, following', r[0], ['on yes',1,true]);
    c('…picked "Lead", typing her name: the presenter moves on and she stays, with the pill', r[1], ['presenter moves on while she types',1,false,true,'You: 2 · Presenter: 3',true]);
    c('…and stays as he moves again', r[2], ['and on again',1,false]);
    c('…sent: the thank-you stays on her screen', r[3], ['sent: the thank-you stays',1,true,'Maria']);
    c('…"Back to live" takes her on', r[4], ['Back to live',3,true]);
    c('a member who has not picked follows as before', r[5], ['nothing picked: follows',2,true]);
    c('…and one who said under 18 (nothing to send)', r[6], ['under 18 (nothing to send): follows',2,true]); }

  console.log('\n-- the PDF: V5, V10, V19, V15, F4 --');
  { own(FX.SMALL,['health-expo','proph-language','backpack-giveaway']);
    const H=P.J(`(()=>{ const m=caseModel('food-pantry',{type:'board',group:'board'},{now:${NOW}}); return caseHandout(m,caseDeck(m),{}); })()`);
    c('the handout’s capacity heading follows its gaps ("What we have · what is missing")', [H.capacity.gaps.length>0,H.labels.staffGaps], [true,'What we have · what is missing']);
    c('…the budget’s "Left after this" and the earlier overdraft, as on the ask slide', [H.budget.leftText,/ to start · \$40 a month$/.test(H.budget.overText||'')], ['Short by $75 to start · $25 a month',true]);
    own(FX.MEDIUM,[]);
    const src=P.E('casePdfDocAt.toString()');
    c('the capacity heading switches with the gaps', src.includes('sub(c.gaps&&c.gaps.length&&Lb.staffGaps?Lb.staffGaps:Lb.staff,MX)'), true);
    c('V10: the SAMPLE pill is mint, as every other SAMPLE mark', /fill\(C\.acc\); rrect\(X1-w,27/.test(src)&&!/fill\(AMB\); rrect\(X1-w,27/.test(src), true);
    c('V19: mint and amber text take darker inks (≥ 4.5:1 on white)', P.J(`(()=>{ const L=h=>{ const v=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(c=>c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4); return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]; };
      return Object.entries(GF_PDF_INK).map(([a,b])=>[a,Math.round(1.05/(L(b)+0.05)*100)/100>=4.5]); })()`), [['#0E8F6E',true],['#C2760B',true]]);
    c('…through the handout’s one text-colour call', src.includes('GF_PDF_INK[String(c).toUpperCase()]'), true);
    c('V15: the handout’s lead figure does not repeat "about 1 in 4" under a headline that says it', src.includes("[said?'':h0.freq,h0.count]"), true); }

  console.log('\n-- copy: V8, V11, V12, V17 --');
  { const e=page({lang:'es'}); await sleep(1100);
    e.E(`DATA=${JSON.stringify(D)};SCOPE="tract"; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)});`);
    c('(the Spanish page builds)', e.J(`(()=>{ const m=caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW}}); return [m.ok,m.error||null]; })()`), [true,null]);
    const r=e.J(`(()=>{ const d=caseDeck(caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW}})); return {places:d.slides.find(s=>s.type==='motion').rows.find(r=>r[1]==='16'||/^\\d+$/.test(r[1]))[0],back:TD_STR.es.back,opened:TD_STR.es.opened(23),around:TD_STR.es.around,q:caseT(CASE_COPY.builder.questions),drivers:caseT(CASE_COPY.fig.noCar.design)}; })()`);
    c('V8: "Cupos 16", never "Lugares 16" (sixteen locations)', r.places, 'Cupos');
    c('V11: "Seguir en vivo", "23 teléfonos"', [r.back,r.opened], ['Seguir en vivo','23 teléfonos']);
    c('V17: "Nuestro entorno", as the headlines say', r.around, 'Nuestro entorno');
    c('V12: "Preguntas que le pueden hacer"; volunteer drivers, not "conductores designados"', [r.q,/conductores voluntarios/.test(r.drivers),/designados/.test(e.E(`JSON.stringify(CASE_RISKS)`)+r.drivers)], ['Preguntas que le pueden hacer',true,false]);
    const H=e.J(`(()=>{ const m=caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW}}); return caseHandout(m,caseDeck(m),{}).review; })()`);
    c('V17: the handout’s review says "parar", as the timeline', /continuar, cambiar o parar\.$/.test(H), true);
    e.w.close(); }

  console.log('\n-- the builder: tests F2, V4 --');
  { const L=page(); await sleep(1100);
    L.E(`openTool('case');`);
    c('(before a survey: the landing and its sample card show)', [L.q('#casep').hidden,/Type the church address above to begin/.test(L.txt('#casep')||'')], [false,true]);
    L.E(`DATA=${JSON.stringify(D)};SCOPE="tract"; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)}); document.querySelector('.ask').style.display='none'; render();`);
    c('the survey loads: the landing goes, one sample card, the builder shows', [L.q('#casep').hidden,L.txt('#casep'),L.qa('[data-cs-sample]').length,!!L.q('#cs-s1')], [true,'',1,true]);
    c('V4: an empty live-link line is hidden (display:none beats the author rule)', /\.cs-room\[hidden\]\{display:none\}/.test(html), true);
    c('V1: the ask list’s name never collapses (8rem at least; one column on a phone)', [/\.cs-arow\{display:grid;grid-template-columns:minmax\(8rem,1fr\) minmax\(0,auto\)/.test(html),/\.cs-arow\{grid-template-columns:minmax\(0,1fr\)\}/.test(html)], [true,true]);
    c('V6: a ministry’s whole name on a phone card', /@media\(max-width:700px\)\{\n  \.cs-grid,\.cs-types\{[^\n]*\n  \.cs-grid\{grid-auto-rows:auto\}\n[^\n]*\n  \.cs-mh b\{-webkit-line-clamp:unset;display:block\}/.test(html), true);
    c('V3: the room code never shrinks; Exit keeps its arrow only below 400 px', [/\.cp-code\{flex:none;/.test(html),/@media \(max-width:400px\)\{[^\n]*\.cp-xw\{display:none\}/.test(html)], [true,true]);
    L.w.close(); }

  console.log('\n-- S8: expired slides go on any page load --');
  { const R='B'.repeat(22), K='C'.repeat(22);
    const L=page({ls:{['terrain-watch-'+R]:JSON.stringify({v:1,deck:{slides:[]},expires:Date.now()-1000}),['terrain-watch-'+K]:JSON.stringify({v:1,deck:{slides:[]},expires:Date.now()+864e5})}}); await sleep(900);
    c('an expired copy of a member’s slides is removed by the ordinary page, the current one kept', [L.w.localStorage.getItem('terrain-watch-'+R),!!L.w.localStorage.getItem('terrain-watch-'+K)], [null,true]);
    L.w.close(); }

  c('no errors on the page', P.errs, []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
