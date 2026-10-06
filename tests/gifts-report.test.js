// Spiritual Gifts report (v10.37): one model (gfReportModel) drawn by one
// renderer (gfReportHTML). Model shape in English and Spanish; the
// neighbourhood roles (present / absent / the heart bonus); the no-repeated-
// sentence rule over many varied answer sets; the pastor's block and actions;
// the congregation-against-the-neighbourhood grid; and no NaN / undefined /
// null anywhere in what is drawn.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.print=()=>{};
    w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
const w=dom.window;
const E=s=>w.eval(s);
const J=s=>JSON.parse(E(`JSON.stringify(${s})`));

setTimeout(async()=>{ try{
  c('no boot errors', errs, []);
  // ---- helpers that live in the page -------------------------------------
  E(String.raw`
  window.__T={};
  __T.PROFILES={
    teacher:{teach:[4,4,3,3,4],shep:[4,3,3,3,3],encour:[3,3,3,2,2],hosp:[4,3,2,-1,-1],wisdom:[3,3,2,2,2],mercy:[3,2,2,1,2],inter:[3,2,-1,-1,-1]},
    maker:{creative:[4,4,4,3,4],helps:[3,4,3,3,3],serve:[4,3,3,2,3],evang:[3,2,-1,-1,-1],hosp:[3,3,2,2,-1],teach:[2,3,2,2,2]},
    organiser:{admin:[4,4,4,4,4],leader:[4,4,3,4,3],giving:[3,3,3,3,3],faith:[4,3,3,2,3],wisdom:[3,3,3,3,3],reconcile:[3,3,2,3,2],mission:[3,3,2,2,2]}
  };
  __T.answers=function(kind,seed){
    const a={}; let s=seed||7; const r=()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; };
    GIFTS.forEach((g,gi)=>{
      let v;
      if(kind==='allhigh') v=[4,4,3,4,4].map((x,k)=>(gi+k)%9===0?3:x);
      else if(kind==='flat') v=[2,2,2,2,2].map((x,k)=>(gi+k)%4===0?3:x);
      else if(kind==='untested') v=[3,3,-1,-1,-1].map((x,k)=>(gi%3===0&&k<2)?2:x);
      else if(kind==='low') v=[1,0,1,0,1];
      else if(kind==='random'){ const bias=r(); v=[0,1,2,3,4].map(()=>{ const x=r(); return x<0.08?-1:Math.max(0,Math.min(4,Math.round(bias*4+(r()-0.5)*2))); }); }
      else { const hi=__T.PROFILES[kind]; v=(hi&&hi[g.id])||[1+gi%3,1+(gi*7)%3,gi%2,(gi*5)%3,gi%3]; }
      v.forEach((x,k)=>a[g.id+'.'+k]=x);
    });
    return a;
  };
  __T.RICH={church:'Bucks County SDA',fac:['kitchen','classrooms'],churchId:'cid',
    min:{'Small groups':'s','Greeting and hospitality':'r','Adult Sabbath School teaching':'r','Community services and food distribution':'r','Children’s Sabbath School':'r','Sound, livestream and video':'r','Prayer ministry':'s'},
    needs:[{id:'kids',v:27,x:null},{id:'single-parent',v:35,x:null},{id:'lang-primary',v:19,x:'Spanish'},{id:'rent50',v:24,x:null},
      {id:'seniors-alone',v:9,x:null},{id:'shift-race',v:9,x:'Hispanic / Latino'},{id:'growth',v:470,x:null},{id:'older-area',v:41,x:null},
      {id:'gini',v:48,x:null},{id:'grief',v:9,x:'alone'},{id:'snap',v:17,x:null},{id:'college',v:22,x:null}],
    area:'Census Tract 2041.02',year:2024};
  __T.NEEDS_ONLY={church:'Fairview Village SDA',fac:[],min:{},churchId:'c2',needs:__T.RICH.needs.slice(0,5),area:'Census Tract 1005',year:2023};
  __T.model=function(kind,seed,o){ o=o||{}; const a=__T.answers(kind,seed);
    const S=gfScores(a,o.obs||null);
    return gfReportModel(S,null,{own:o.own!==false,name:o.name||'Maria Lopez',church:o.church,date:'2026-09-28',heart:o.heart||{},
      minor:!!o.minor,observers:o.observers||null,obsCount:o.obsCount,obsInitials:o.obsInitials,flags:gfFlags(a),ctx:o.ctx===undefined?null:o.ctx,
      actions:o.actions}); };
  // Sentences as a reader meets them: paragraphs and table cells, Scripture set aside.
  __T.read=function(M,own){
    const d=document.createElement('div'); d.innerHTML=gfReportHTML(M,own);
    const els=[...d.querySelectorAll('p,li,td,th,dd,dt,figcaption')].filter(e=>!e.closest('.gfverse')&&!(e.tagName==='LI'&&e.querySelector('p')));
    const all=[]; els.forEach(e=>e.textContent.replace(/\s+/g,' ').trim().replace(/([.!?])\s+/g,'$1\u0001').split('\u0001').forEach(x=>{ x=x.trim(); if(x) all.push(x); }));
    const seen=new Set(), dups=[], lows=[];
    all.forEach(x=>{ if(/^[a-záéíóúñü]/.test(x)) lows.push(x.slice(0,70)); if(x.length<25) return; if(seen.has(x)) dups.push(x.slice(0,90)); seen.add(x); });
    const text=d.textContent;
    const bad=(text.match(/[^\n]{0,40}\b(NaN|undefined|null|Infinity|\[object Object\])\b[^\n]{0,20}/g)||[]);
    return {dups,lows,bad,text,count:all.length,html:d.innerHTML};
  };
  `);

  console.log('-- the model, in English --');
  const M=J(`__T.model('teacher',0,{own:true,ctx:__T.RICH,heart:{children:2,families:1,newcomers:1},observers:[{name:'Pat Leader',ratings:{teach:4}},{name:'ana ruiz',ratings:{teach:3}}],obs:{teach:[4,3]}})`);
  c('plain data: no HTML anywhere in the model', /<[a-z/][^>]*>/i.test(JSON.stringify(M)), false);
  c('who, where, when', [M.lang,M.name,M.church,M.date,typeof M.dateText,M.title], ['en','Maria Lopez','Bucks County SDA','2026-09-28','string','Your spiritual gifts']);
  c('core and support gifts, each with four evidence rows', M.top.length>=1&&M.top.every(t=>t.ev.length===4&&typeof t.score==='number'&&typeof t.why==='string'&&t.why.length>10), true);
  c('evidence rows are numbers 0-4 (or -1 / null), with a word', M.top.every(t=>t.ev.every(r=>(r.v===null||r.v===-1||(typeof r.v==='number'&&r.v>=0&&r.v<=4))&&typeof r.pct==='number'&&typeof r.word==='string')), true);
  c('the leading gift is teaching, ranked 1', [M.core[0].id,M.core[0].rank], ['teach',1]);
  c('five family averages, numbers, strongest first', [M.families.length,M.families.every(f=>f.avg===null||typeof f.avg==='number'),M.families[0].avg>=M.families[4].avg], [5,true,true]);
  c('all twenty-one, ranked, on one 0-100 scale', [M.ranked.length,M.ranked.every(r=>r.score===null||(r.score>=0&&r.score<=100)),new Set(M.ranked.map(r=>r.id)).size], [21,true,21]);
  c('the wheel has all 21 in family order', [M.wheel.length,M.wheel[0].fam,M.wheel[20].fam], [21,'word','hands']);
  c('potential gifts sit outside the core, each with a try-it step', M.potential.length>0&&M.potential.every(p=>!M.core.some(x=>x.id===p.id)&&p.step.length>20&&/emerging|untested/.test(p.label)), true);
  c('confirmations: count and first letters only', [M.confirmations.n,M.confirmations.initials], [2,['P','A']]);
  c('no observer name travels in the model', /Pat Leader|ana ruiz/i.test(JSON.stringify(M)), false);
  const N=M.neighbourhood;
  c('neighbourhood: at most three roles, each fit 55 or more', [N.roles.length<=3,N.roles.length>0,N.roles.every(r=>r.fit>=55)], [true,true,true]);
  c('each role: figure sentence ending in a full stop, role, what, why, first step', N.roles.every(r=>/\.$/.test(r.fig)&&r.role&&r.what&&r.why&&r.step&&typeof r.v==='number'), true);
  c('the top role is the children\'s club, with the heart named', [N.roles[0].id,N.roles[0].heartLevel,N.roles[0].heartName,/strongly drawn to children/.test(N.roles[0].why)], ['kids',2,'children',true]);
  c('source line: Community Survey · area · ACS year-4–year', N.source, 'Community Survey · Census Tract 2041.02 · ACS 2020–2024');
  c('church matches from the church\'s own ministries, with pct', M.local.rows.length>0&&M.local.rows.every(r=>typeof r.pct==='number'&&r.pct>=55&&(r.state==='r'||r.state==='s')), true);
  // v10.54.2: the pastor: "the first 90 days, I don't know what that is … just a very simple steps on how to get involved": four steps
  // (pray, talk to your pastor, start serving, look back), the second still built from the top neighbourhood role
  c('how to get involved: four steps, built from the top neighbourhood role', [M.ninety.steps.length,M.ninety.basis.kind,M.ninety.basis.id], [4,'need','kids']);
  c('flags carried as data', [typeof M.flags.minor,typeof M.flags.allHigh,typeof M.flags.untested], ['boolean','boolean','number']);
  c('the member\'s own copy has no pastor block', M.pastor, null);
  c('verse in KJV', M.verse.ver, 'KJV');
  c('no ministry appears in two sections', (()=>{ const k=[...(M.local?M.local.rows:[]),...(M.openings?M.openings.rows:[]),...(M.serve?M.serve.rows:[])].map(r=>r.key); return k.length===new Set(k).size; })(), true);

  console.log('-- the model, in Spanish --');
  E(`LANG='es'`);
  const ME=J(`__T.model('teacher',0,{own:true,ctx:__T.RICH,heart:{children:2,families:1,newcomers:1}})`);
  c('lang es, Spanish title and labels', [ME.lang,ME.title,ME.labels.gifts,ME.labels.pdf,ME.labels.email], ['es','Sus dones espirituales','Sus dones y la evidencia de cada uno','Descargar PDF','Envíenme mi informe por correo']);
  c('gift names from GIFTS_ES', ME.top.map(t=>t.name), J(`__T.model('teacher',0,{ctx:__T.RICH}).top.map(t=>GIFTS_ES[t.id].n)`));
  c('roles and figures from GF_NEEDS in Spanish', ME.neighbourhood.roles.every(r=>r.role===E(`GF_NEEDS[${JSON.stringify(r.id)}].roleEs`)&&/^(El|En|Un|La|Aquí)/.test(r.fig)), true);
  c('source line in Spanish', ME.neighbourhood.source, 'Encuesta Comunitaria · Sección censal 2041.02 · ACS 2020–2024');
  c('church ministries named from GF_MIN_ES', ME.local.rows.every(r=>r.n===E(`GF_MIN_ES[${JSON.stringify(r.key)}].n`)), true);
  c('deep reading verses in RVA', ME.deep.every(d=>d.verse.ver==='RVA')&&ME.verse.ver==='RVA', true);
  c('evidence words in Spanish', ME.top[0].ev.map(r=>r.label), ['Deseo','Capacidad','Fruto','Confirmado']);
  c('badges in Spanish', ME.top.every(t=>['demostrado','en desarrollo','sin probar','menos evidente'].includes(t.badge)), true);
  const esText=J(`__T.read(__T.model('teacher',0,{own:false,ctx:__T.RICH,heart:{children:2}}),false).text`);
  c('no English report words left in Spanish', /Your gifts|Why you|First step|What the work is|Potential gifts|neighborhood|All twenty-one|For the pastor|came back|Download PDF/.test(esText), false);
  E(`LANG='en'`);

  console.log('-- neighbourhood present or absent --');
  c('no context: no neighbourhood section', J(`__T.model('teacher',0,{ctx:null}).neighbourhood`), null);
  c('a context with no needs: no section', J(`__T.model('teacher',0,{ctx:{church:'X',fac:[],min:{},needs:[],area:'',year:null}}).neighbourhood`), null);
  c('and nothing about the neighbourhood is drawn', /Where your gifts meet your neighborhood|Community Survey/.test(J(`__T.read(__T.model('teacher',0,{ctx:null}),true).text`)), false);
  c('needs attached: the section is drawn', /Where your gifts meet your neighborhood/.test(J(`__T.read(__T.model('teacher',0,{ctx:__T.NEEDS_ONLY}),true).text`)), true);
  c('needs but no ministries marked: no church block, no "worth starting"', J(`(()=>{ const m=__T.model('teacher',0,{ctx:__T.NEEDS_ONLY}); return [m.local,m.openings,!!m.serve]; })()`), [null,null,true]);
  const low=J(`__T.model('low',0,{ctx:__T.RICH})`);
  c('nobody fits: an honest sentence, no roles', [low.neighbourhood.roles.length,typeof low.neighbourhood.empty], [0,'string']);

  console.log('-- the heart bonus --');
  E(String.raw`__T.S2=GIFTS.map(g=>({id:g.id,score:({teach:80,shep:70,creative:60,helps:60,mercy:70,encour:60,serve:60})[g.id]||20}));
    __T.CTX2={church:'X',fac:[],min:{},needs:[{id:'kids',v:27,x:null},{id:'seniors-alone',v:9,x:null}],area:'',year:2024};`);
  c('fits without heart: kids 75, seniors-alone 69', J(`gfNeedRoles(__T.S2,__T.CTX2,{}).map(r=>[r.id,r.fit,r.score])`), [['kids',75,75],['seniors-alone',69,69]]);
  c('strongly drawn to older people (+15) moves seniors-alone first', J(`gfNeedRoles(__T.S2,__T.CTX2,{seniors:2}).map(r=>[r.id,r.score])`), [['seniors-alone',84],['kids',75]]);
  c('somewhat drawn (+6) ties, and the better gift fit wins the tie', J(`gfNeedRoles(__T.S2,__T.CTX2,{lonely:1}).map(r=>r.id)`), ['kids','seniors-alone']);
  c('the report follows: the top role changes with the heart', J(`(()=>{ const P=gfProfile(__T.S2.map(s=>({...s,n:s.id,label:'emerging',ev:{desire:3,ability:3,fruit:3,conf:3},unt:0})));
    const a=gfReportModel(__T.S2.map(s=>({...s,n:s.id,label:'emerging',ev:{desire:3,ability:3,fruit:3,conf:3},unt:0})),P,{ctx:__T.CTX2,heart:{}});
    const b=gfReportModel(__T.S2.map(s=>({...s,n:s.id,label:'emerging',ev:{desire:3,ability:3,fruit:3,conf:3},unt:0})),P,{ctx:__T.CTX2,heart:{grieving:2}});
    return [a.neighbourhood.roles[0].id,b.neighbourhood.roles[0].id]; })()`), ['kids','seniors-alone']);
  c('a heart bonus never lifts a need below fit 55 into the report', J(`(()=>{ const S=GIFTS.map(g=>({id:g.id,score:g.id==='teach'?50:30})); return gfNeedRoles(S,__T.CTX2,{children:2}).filter(r=>r.fit>=55).length; })()`), 0);

  console.log('-- no sentence twice, no lowercase sentence start, no NaN --');
  const sets=[['teacher',0],['maker',0],['organiser',0],['allhigh',0],['flat',0],['untested',0],['low',0],
              ['random',11],['random',23],['random',37],['random',53],['random',71],['random',97]];
  const ctxs=['__T.RICH','__T.NEEDS_ONLY','null'];
  const hearts=['{children:2,families:1,newcomers:1,seekers:1}','{}','{seniors:2,lonely:2,grieving:1,poor:1}'];
  let n=0; const problems=[];
  ['en','es'].forEach(lang=>{ E(`LANG='${lang}'`);
    sets.forEach(([k,seed],i)=>[true,false].forEach(own=>{
      const r=J(`(()=>{ const a=__T.answers('${k}',${seed}); const M=__T.model('${k}',${seed},{own:${own},ctx:${ctxs[i%3]},heart:${hearts[i%3]},minor:${i%4===0},
        observers:${own?'null':"[{name:'Pat',ratings:{teach:4,admin:3}},{name:'Lu',ratings:{teach:3,creative:4}}]"},obsCount:${own?2:0},obsInitials:${own?"['P','L']":'null'},
        obs:{teach:[4,3],admin:[3],creative:[4]}}); const x=__T.read(M,${own}); return {dups:x.dups,lows:x.lows,bad:x.bad,count:x.count,
        ninety:(x.text.match(${lang==='es'?"/No espere a que le busquen/g":"/Don’t wait to be asked/g"})||[]).length}; })()`);
      n++;
      if(r.dups.length||r.lows.length||r.bad.length||r.ninety!==1||r.count<20) problems.push({lang,k,seed,own,...r});
    }));
  });
  E(`LANG='en'`);
  // v10.54.2: "Don't wait to be asked" (the steps' first line) said once, where the ninety-day trial used to be
  c(`${n} reports (13 answer sets × own/pastor × EN/ES): no repeated sentence, capitalised starts, no NaN/undefined/null, "Don’t wait to be asked" said once`, problems.slice(0,3), []);
  // gfRec used to give three ministries in a row the same "Why you".
  const serve=J(`__T.model('maker',0,{ctx:null}).serve.rows.map(r=>r.why)`);
  c('"Why you" differs for every ministry, and names it once the plain phrasing is used', [serve.length>=3,new Set(serve).size===serve.length], [true,true]);
  // Updated (review F6): the fixture profiles end in a three-way tie, which no longer
  // names two gifts at random, so this uses a profile with a real bottom pair.
  E(`__T.lowPair=()=>{ const a=__T.answers('teacher'); [0,1,2,3,4].forEach(k=>{ a['evang.'+k]=0; a['healing.'+k]=k?0:1; }); return a; };`);
  c('"What this profile is not" starts with a capital', /^[A-Z]/.test(J(`gfReportModel(gfScores(__T.lowPair()),null,{own:true,ctx:null}).growth.low.text`)), true);
  c('gfWhy: a third gift with the same reading is named, not repeated', J(`(()=>{ const s=new Set(); const S=gfScores(__T.answers('allhigh')); const pr=S.filter(x=>x.label==='demonstrated').slice(0,4); return pr.map(x=>gfWhy(x,s)); })()`).filter((t,i,a)=>a.indexOf(t)===i).length, 4);

  console.log('-- edge cases --');
  c('a member who answered low throughout: gfProfile no longer throws, and has no core', J(`(()=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=0; }); const P=gfProfile(gfScores(a)); return [P.core.length,P.gap]; })()`), [0,0]);
  c('nothing answered at all: a report with no NaN and a plain first step', J(`(()=>{ const M=gfReportModel(gfScores({}),null,{own:true,ctx:__T.RICH}); const x=__T.read(M,true); return [x.bad.length,x.dups.length,M.ninety.basis.kind,M.top.length]; })()`), [0,0,'none',0]);
  // "What this profile is not" names only gifts strictly below the rest: never two
  // names picked by the alphabet from a tie (review F6).
  const LOWS=J(`(()=>{ const P=f=>{ const a={}; GIFTS.forEach((g,gi)=>{ const v=f(g.id,gi); v.forEach((x,k)=>a[g.id+'.'+k]=x); }); return gfProfile(gfScores(a)); };
    return {
      zero:P(()=>[0,0,0,0,0]).low.map(s=>s.id),
      twoUp:P(id=>id==='giving'?[2,2,2,2,1]:id==='faith'?[2,1,2,1,2]:[0,0,0,0,0]).low.map(s=>s.id),
      fiveHigh:P((id,gi)=>gi<5?[4,4,4,4,4]:[1,1,1,1,1]).low.map(s=>s.id),
      oneLow:P((id,gi)=>id==='evang'?[0,0,0,0,0]:gi<3?[4,4,4,4,4]:[2,2,2,2,2]).low.map(s=>s.id),
      twoLow:P((id,gi)=>id==='evang'?[0,0,0,0,0]:id==='mercy'?[1,0,0,0,0]:gi<3?[4,4,4,4,4]:[2,2,2,2,2]).low.map(s=>s.id),
      teacher:gfProfile(gfScores(__T.lowPair())).low.map(s=>s.id) }; })()`);
  c('all answers 0, or 19 tied at the bottom, or 16 tied: nothing named as lowest', [LOWS.zero,LOWS.twoUp,LOWS.fiveHigh], [[],[],[]]);
  c('one gift alone at the bottom is named alone; a clear bottom pair is named', [LOWS.oneLow,LOWS.twoLow], [['evang'],['evang','mercy']]);
  c('a profile with a distinct bottom still gets its note', LOWS.teacher, ['evang','healing']);
  // "One gift stands clearly above everything else … by N points" needs N ≥ 10 (review F7).
  const SH=J(`(()=>{ const P=f=>{ const a={}; GIFTS.forEach((g,gi)=>{ const v=f(g.id,gi); if(v) v.forEach((x,k)=>a[g.id+'.'+k]=x); }); return gfProfile(gfScores(a)); };
    const near=P(id=>id==='giving'?[2,2,2,2,1]:id==='faith'?[2,1,2,1,2]:[0,0,0,0,0]);
    const alone=P(id=>id==='giving'?[3,3,3,3,3]:null);
    const tall=P(id=>id==='giving'?[4,4,4,4,4]:[1,1,1,1,1]);
    return {near:[near.shape,near.gap,gfShapeWords(near)],alone:[alone.shape,gfShapeWords(alone)],tall:[tall.shape,gfShapeWords(tall)]}; })()`);
  c('giving 46 over faith 39: out in front, not "clearly", and no points figure', [SH.near[0],SH.near[1]<10,/clearly|points?\b/.test(SH.near[2]),/^One gift comes out in front/.test(SH.near[2])], ['mixed',true,false,true]);
  c('only one gift answered at all: no "by 0 points"', [SH.alone[0],/points?\b|clearly/.test(SH.alone[1])], ['mixed',false]);
  c('a gift that really towers still says so, with its lead', [SH.tall[0],/^One gift stands clearly above everything else in your answers — by \d{2,3} points\./.test(SH.tall[1])], ['single',true]);
  // A demonstrated gift with one "no opportunity" answer (the second fruit statement)
  // is still demonstrated: nothing in the report may tell the member to go and test it,
  // or count it among the gifts they have not had the chance to find out.
  const DU=J(String.raw`(()=>{ const a={}; GIFTS.forEach((g,gi)=>{ const v=g.id==='teach'?[4,4,4,4,-1]:g.id==='shep'?[3,3,3,3,-1]:[1,2,1,1,gi%2]; v.forEach((x,k)=>a[g.id+'.'+k]=x); });
    const S=gfScores(a), P=gfProfile(S); const out={};
    ['en','es'].forEach(l=>{ LANG=l; const M=gfReportModel(S,P,{own:true,name:'Ana López',date:'2026-09-28',ctx:null,flags:gfFlags(a)});
      out[l]={teach:S.find(s=>s.id==='teach').label,lead:P.core[0]&&P.core[0].id,rows:M.serve?M.serve.rows.length:0,
        train:M.serve?M.serve.rows.map(r=>r.train).filter(t=>/\b(test|probar)\b/.test(t)):[],why:M.serve?M.serve.rows.map(r=>r.why).filter(t=>/not been tested|todavía no se han probado/.test(t)):[],
        overview:M.overview.filter(t=>/not yet had the chance|todavía no ha tenido ocasión/.test(t)),fitUnt:gfFit(S,P.core).some(m=>m.untested.some(u=>u.id==='teach'||u.id==='shep'))}; });
    LANG='en'; return out; })()`);
  c('teaching answered [4,4,4,4,-1] leads and is demonstrated', [DU.en.teach,DU.en.lead,DU.en.rows>0], ['demonstrated','teach',true]);
  c('no ministry asks the member to test a demonstrated gift (EN, ES)', [DU.en.train,DU.es.train], [[],[]]);
  c('no ministry says the gifts behind it have not been tested (EN, ES)', [DU.en.why,DU.es.why], [[],[]]);
  c('the overview does not count a demonstrated gift as not yet known (EN, ES)', [DU.en.overview,DU.es.overview], [[],[]]);
  c('gfFit never lists a demonstrated gift as untested', DU.en.fitUnt, false);
  // One count for "untested" in one report: the overview, the chart note and the
  // pastor's chip and flag all name the gifts the chart stripes.
  const UC=J(String.raw`(()=>{ const a=__T.answers('untested'); const S=gfScores(a); const M=gfReportModel(S,null,{own:false,name:'Lee',date:'2026-09-28',ctx:null,flags:gfFlags(a)});
    const nums=[...M.overview,M.rankedNote,...M.pastor.flags,...M.pastor.chips].join(' ').match(/(?:On |^|\. )(\d+) (?:gifts|untested)|(\d+) untested|(\d+) gifts are marked/g)||[];
    return {labelled:S.filter(s=>s.label==='untested').length,anyMinus:S.filter(s=>s.unt>0).length,said:[...new Set(nums.map(x=>+x.match(/\d+/)[0]))]}; })()`);
  c('a profile where "any -1" and "marked untested" differ gives one number throughout', [UC.anyMinus>UC.labelled,UC.said], [true,[UC.labelled]]);
  E(`localStorage.setItem('terrain-gifts:cid',JSON.stringify({ctx:btoa('3|Bucks County SDA|kitchen|'+'.'.repeat(GF_MIN.length)+'|cid|kids=27|Census Tract 2041.02|2024').replace(/=+$/,'')}))`);
  c('the emailed report finds the church context this phone saved', [J(`gfStoredCtx('cid').needs`),J(`gfStoredCtx('other')`)], [[{id:'kids',v:27,x:null}],null]);

  console.log('-- the pastor\'s view --');
  const MP=J(`__T.model('allhigh',0,{own:false,minor:true,name:'Sam Youth',ctx:__T.RICH,heart:{children:2},observers:[{name:'Pat',ratings:{teach:4}}]})`);
  c('a "For the pastor" block', [MP.pastor.title,Array.isArray(MP.pastor.flags),typeof MP.pastor.question], ['For the pastor',true,'string']);
  c('flags: under 18 and all-high answering', [MP.pastor.chips.includes('Under 18'),MP.pastor.chips.includes('All-high answering'),MP.pastor.flags.some(f=>/^Under 18\./.test(f)),MP.pastor.flags.some(f=>/^\d+% of the answers were/.test(f))], [true,true,true,true]);
  c('observer summary with first letters', /1 person who knows Sam has answered \(P\.\)/.test(MP.pastor.observers), true);
  // Updated (review V2): Sam is under 18, so the pastor is prompted to invite him to
  // a youth version of the role, not to ask what it would take to lead it.
  c('one opening question from the top gift and the top neighbourhood role (a minor is invited)', /^“Sam, your answers point to .+ Would you like to .+\?”$/.test(MP.pastor.question), true);
  c('a minor\'s roles come only from GF_NEEDS_YOUTH, in its words', J(`(()=>{ const m=__T.model('allhigh',0,{own:false,minor:true,name:'Sam Youth',ctx:__T.RICH,heart:{children:2}});
    return m.neighbourhood.roles.length>0&&m.neighbourhood.roles.every(r=>GF_NEEDS_YOUTH[r.id]&&r.youth&&r.role===GF_NEEDS_YOUTH[r.id].roleEn&&r.step===GF_NEEDS_YOUTH[r.id].stepEn); })()`), true);
  c('no adult-only role (single-parent backup, rent, rides) for a minor, in either language', J(`(()=>{ const bad=[]; ['en','es'].forEach(l=>{ LANG=l; [['allhigh',0],['teacher',0],['random',11],['random',37]].forEach(([k,sd])=>{
      const m=__T.model(k,sd,{own:false,minor:true,name:'Sam',ctx:__T.RICH,heart:{children:2,families:2,poor:2}}); if(m.neighbourhood) m.neighbourhood.roles.forEach(r=>{ if(!GF_NEEDS_YOUTH[r.id]) bad.push(r.id); }); }); }); LANG='en'; return bad; })()`), []);
  c('an adult still gets the adult roles', J(`__T.model('allhigh',0,{own:false,minor:false,name:'Ana',ctx:__T.RICH,heart:{children:2}}).neighbourhood.roles.some(r=>!r.youth&&r.role===GF_NEEDS[r.id].roleEn)`), true);
  c('every youth entry names a real need and has all six texts', J(`Object.keys(GF_NEEDS_YOUTH).filter(id=>!GF_NEEDS[id]||['roleEn','roleEs','whatEn','whatEs','stepEn','stepEs'].some(k=>typeof GF_NEEDS_YOUTH[id][k]!=='string'||GF_NEEDS_YOUTH[id][k].length<15))`), []);

  console.log('-- an under-18\'s "Try this" steps (GF_TRY_YOUTH) --');
  // A profile that makes one gift the only potential gift: three others strong
  // and demonstrated, this one emerging (desire 4, ability 3, little fruit),
  // everything else answered low.
  E(String.raw`__T.potFor=function(id,o){ o=o||{}; const a={}; const strong=GIFTS.map(g=>g.id).filter(x=>x!==id).slice(0,3);
    GIFTS.forEach(g=>{ const v=strong.includes(g.id)?[4,4,4,4,4]:g.id===id?[4,3,1,1,1]:[0,0,0,0,0]; v.forEach((x,k)=>a[g.id+'.'+k]=x); });
    return gfReportModel(gfScores(a),null,{own:o.own!==false,name:'Sam Youth',date:'2026-09-28',minor:!!o.minor,heart:{teens:2,children:2},flags:gfFlags(a),ctx:__T.RICH}); };`);
  c('GF_TRY_YOUTH: an entry for every one of the 21 gifts, and nothing else', J(`[Object.keys(GF_TRY_YOUTH).length,GIFTS.filter(g=>!GF_TRY_YOUTH[g.id]).map(g=>g.id),Object.keys(GF_TRY_YOUTH).filter(k=>!GIFTS.some(g=>g.id===k))]`), [21,[],[]]);
  c('each has an English and a Spanish step: one sentence, capitalised, ending in a full stop, and not the adult step',
    J(`GIFTS.map(g=>g.id).filter(id=>{ const Y=GF_TRY_YOUTH[id]; return !Array.isArray(Y)||Y.length!==2||Y.some((t,i)=>typeof t!=='string'||t.length<40||!/^[A-ZÁÉÍÓÚÑ¿]/.test(t)||!/\.$/.test(t)||gfSentences(t).length!==1||t===GF_TRY[id][i]); })`), []);
  c('every youth step puts a parent, a youth leader, a Pathfinder or Adventurer leader or the family beside the young person (EN and ES)',
    J(`GIFTS.map(g=>g.id).filter(id=>!/\\b(parent|leader|family)\\b/i.test(GF_TRY_YOUTH[id][0])||!/(padre|madre|líder|familia|quien dirige)/.test(GF_TRY_YOUTH[id][1]))`), []);
  c('no youth step is word for word any other youth step, adult step or youth neighbourhood step', J(`(()=>{ const all=[...Object.values(GF_TRY_YOUTH).flat(),...Object.values(GF_TRY).flat(),
      ...Object.values(GF_NEEDS_YOUTH).flatMap(y=>[y.stepEn,y.stepEs,y.whatEn,y.whatEs])]; return all.filter((t,i)=>all.indexOf(t)!==i); })()`), []);
  c('none of the adult-shaped tries survives in a youth step (visiting the sick alone, hosting, leading a meeting, sitting in on a dispute)',
    J(`Object.values(GF_TRY_YOUTH).flat().filter(t=>/Visit one person|Host one Sabbath lunch|lead one meeting|quiet listener|Visite este mes a una persona|oyente silencioso/.test(t))`), []);
  for(const lang of ['en','es']){
    E(`LANG='${lang}'`);
    const li=lang==='es'?1:0;
    const rows=J(`GIFTS.map(g=>{ const out=[]; [true,false].forEach(own=>{ const M=__T.potFor(g.id,{minor:true,own}); const x=__T.read(M,own);
        const p=M.potential.find(q=>q.id===g.id);
        out.push({id:g.id,own,found:!!p,youth:!!(p&&p.youth),step:p?p.step:null,want:GF_TRY_YOUTH[g.id][${li}],onScreen:x.text.includes(GF_TRY_YOUTH[g.id][${li}]),
          adult:x.text.includes(GF_TRY[g.id][${li}]),dups:x.dups,lows:x.lows,bad:x.bad}); }); return out; }).flat()`);
    c(`${lang}: all 21 gifts, a minor's own and pastor's copy: the gift is a potential gift and its "Try this" step is the youth one`, rows.filter(r=>!r.found||!r.youth||r.step!==r.want).map(r=>r.id+(r.own?'':'/pastor')), []);
    c(`${lang}: …drawn on screen, and the adult step is nowhere in the report`, rows.filter(r=>!r.onScreen||r.adult).map(r=>r.id+(r.own?'':'/pastor')), []);
    c(`${lang}: …with no sentence twice, no lowercase start and no NaN/undefined/null in any of the 42 reports`, rows.filter(r=>r.dups.length||r.lows.length||r.bad.length).map(r=>({id:r.id,own:r.own,dups:r.dups,lows:r.lows,bad:r.bad})).slice(0,3), []);
    const ad=J(`GIFTS.map(g=>{ const M=__T.potFor(g.id,{minor:false}); const p=M.potential.find(q=>q.id===g.id); return p&&p.step===GF_TRY[g.id][${li}]&&!p.youth?null:g.id; }).filter(Boolean)`);
    c(`${lang}: an adult still gets the adult step for every gift`, ad, []);
  }
  E(`LANG='en'`);
  // The opening question names a gift the top role actually runs on (review F5).
  const QG=J(`(()=>{ const bad=[]; let n=0; ['en','es'].forEach(l=>{ LANG=l; for(let sd=1;sd<=60;sd++){ const m=__T.model('random',sd,{own:false,name:'Ana',ctx:__T.RICH,heart:sd%2?{children:2}:{}});
      const role=m.neighbourhood&&m.neighbourhood.roles[0]; if(!role||!m.core.length) continue; n++;
      const named=Object.keys(GF_NEEDS[role.id].g).filter(id=>m.pastor.question.includes(gfLow(id)));
      if(!named.length) bad.push(l+':'+sd+':'+m.pastor.question.slice(0,90)); } }); LANG='en'; return {n,bad}; })()`);
  c(`the pastor's question names one of the top role's own gifts (${QG.n} copies with a role)`, [QG.n>20,QG.bad.slice(0,3)], [true,[]]);
  const MU=J(`__T.model('untested',0,{own:false,name:'Lee',ctx:null})`);
  c('many untested is flagged', [MU.flags.manyUntested,MU.pastor.chips.some(x=>/untested/.test(x))], [true,true]);
  const MQ=J(`__T.model('teacher',0,{own:false,name:'Ana',ctx:null})`);
  c('no flags: says so plainly', MQ.pastor.flags, ['Nothing unusual in how these answers were given.']);
  c('no observers: says who can ask', /Nobody has confirmed these gifts yet/.test(MQ.pastor.observers), true);

  console.log('-- actions and hooks --');
  // openTool reloads the saved session, so the member's state is set after it.
  E(`openTool('gifts'); GF_SERVER={ok:true,email:true}; GF_PUB_TARGET='AAAAAAAAAAAA'; GF_CTX=__T.RICH;
     GFS={name:'Maria Lopez',a:__T.answers('teacher'),h:{children:2},i:GF_TOTAL,done:true,sent:true,minor:false,email:'m@example.org',emailOk:true,pub:'AAAAAAAAAAAA',rid:'BBBBBBBBBBBB',token:'C'.repeat(32),ov:GF_TOTAL};
     GF_VIEW='take'; gfRender();`);
  const D=w.document, has=id=>!!D.getElementById(id);
  // v10.38.0: the app sends no email for now. With GF_EMAIL_ENABLED false there
  // is no email button even though this server says it can send; PDF stays.
  c('email off in the app: PDF, invite and send, but no email button', ['gfpdf','gfemail','gfinvite','gfsendbox'].map(has), [true,false,true,true]);
  E(`GF_EMAIL_ENABLED=true; gfRender();`);
  c('member, adult, consented, on the server: PDF, email, invite, send, start again', ['gfpdf','gfemail','gfinvite','gfsendbox','gfredo'].map(has), [true,true,true,true,true]);
  c('the model is kept for the PDF', E('GF_REPORT_MODEL&&GF_REPORT_MODEL.name'), 'Maria Lopez');
  // Updated for the PDF step (approved design, spec §8): #gfpdf now builds a
  // PDF; the print sheet is only the fallback when the PDF maker cannot load.
  E(`window.__loadJ=gfLoadJsPDF; gfLoadJsPDF=()=>Promise.reject(new Error('offline'));`);
  let printed=0; w.print=()=>{printed++;}; D.getElementById('gfpdf').click();
  await new Promise(r=>setTimeout(r,20));
  c('#gfpdf falls back to the print sheet when the PDF maker cannot load', printed, 1);
  E(`gfLoadJsPDF=window.__loadJ;`);
  c('the report shows where the gifts meet the neighbourhood and the church', [!!D.querySelector('.gfr-nb'),!!D.querySelector('.gfr-church'),!!D.querySelector('.gfr-wheel svg')], [true,true,true]);
  E(`GFS.minor=true; gfRender();`);
  c('under 18: no email button', has('gfemail'), false);
  E(`GFS.minor=false; GF_SERVER={ok:true,email:false}; gfRender();`);
  c('server without email: no email button', has('gfemail'), false);
  E(`GF_SERVER={ok:false,email:false}; gfRender();`);
  c('no server: no email, no invite; PDF and send still there', ['gfemail','gfinvite','gfpdf','gfsendbox'].map(has), [false,false,true,true]);
  E(`GF_CTX=null; GF_PUB_TARGET=null;`);
  c('wheel: one bar per answered gift, labels only for the leading gifts', J(`(()=>{ const d=document.createElement('div'); d.innerHTML=gfWheelSVG(__T.model('teacher',0,{})); const vb=d.querySelector('svg').getAttribute('viewBox').split(' ').map(Number);
    return [d.querySelectorAll('path.br').length,d.querySelectorAll('text').length<=8,vb.every(Number.isFinite)]; })()`), [21,true,true]);

  console.log('-- the pastor opens a result, and can delete it --');
  E(`(()=>{ const ch=uChurch(); ch.name='Bucks County SDA';
    ch.share={church:'Bucks County SDA',min:__T.RICH.min,needs:{list:__T.RICH.needs,area:__T.RICH.area,year:2024,date:'2026-09-20'}}; uPersist();
    GF_CTX={church:'Bucks County SDA',churchId:ch.id,fac:[],min:{}};
    GFS={name:'Sam Youth',a:__T.answers('allhigh'),h:{teens:2},minor:true,memberId:'m9',i:GF_TOTAL,done:true}; const code=gfEncode(); GF_CTX=null;
    gfRosterAdd(code,{minor:true,observers:[{name:'Pat',ratings:{teach:4}}]});
    GFS={name:'',a:{},h:{},i:0,sect:-1,done:false,sent:false,ov:GF_TOTAL}; GF_VIEW='roster'; gfRender(); })()`);
  D.querySelector('.gfrosterrow .gfopen').click();
  const PT=D.getElementById('giftbody').textContent;
  c('pastor view: For the pastor, Under 18, the neighbourhood from his own survey', [/For the pastor/.test(PT),/Under 18/.test(PT),/Where your gifts meet your neighborhood/.test(PT),/Confirmed by 1 person/.test(PT)], [true,true,true,true]);
  c('pastor view: delete, no send box', [has('gfpdel'),has('gfsendbox'),has('gfpdf')], [true,false,true]);
  D.getElementById('gfpdel').click(); D.getElementById('gfpdel').click();
  c('two taps delete it from this device and return to the roster', [E('gfRoster().length'),!!D.getElementById('gfpull')], [0,true]);

  console.log('-- your congregation against your neighbourhood --');
  E(String.raw`(()=>{ const add=(name,kind,minor,mid,heart)=>{ GF_CTX={church:'Bucks County SDA',churchId:uChurch().id,fac:[],min:{}};
      GFS={name,a:__T.answers(kind),h:heart,minor,memberId:mid,i:GF_TOTAL,done:true}; const c=gfEncode(); GF_CTX=null; gfRosterAdd(c); };
    add('Maria Lopez','teacher',false,'a1',{children:2,families:1});
    add('Ana Ruiz','teacher',false,'a2',{});
    add('Joe Brown','allhigh',false,'a3',{children:1});
    add('Sam Ortiz','maker',true,'a4',{teens:2});
    add('Tom Reyes','organiser',true,'a5',{poor:2});
    GFS={name:'',a:{},h:{},i:0,sect:-1,done:false,sent:false,ov:GF_TOTAL}; })()`);
  const G=J(`(()=>{ const g=gfChurchNeeds(gfEveryone()); return g.rows.map(r=>({id:r.id,d:r.drawn.map(x=>x.n),c:r.could.map(x=>x.n),reading:r.reading,
    dn:r.drawn.filter(x=>!x.minor&&!x.allHigh).length,cn:r.could.filter(x=>!x.minor&&!x.allHigh).length,nD:r.nDrawn,nC:r.nCould})); })()`);
  const kids=G.find(r=>r.id==='kids');
  c('one row per attached need', G.length, 12);
  c('kids: gifted and drawn = fit ≥60 AND heart ≥1 for children/families', kids.d.sort(), ['Joe Brown','Maria Lopez']);
  c('kids: could, if asked = fit ≥60 with no heart for it', kids.c.sort(), ['Ana Ruiz']);
  // Updated (review V2, V16): everyone is listed, but the reading counts only adults
  // who did not answer high almost everywhere (Joe answered high; Sam and Tom are under 18).
  c('readings follow the counts of adults who did not answer high everywhere', G.every(r=>r.nD===r.dn&&r.nC===r.cn&&r.reading===(r.dn>=3?'well':(r.dn+r.cn===0?'gap':(r.dn+r.cn===1?'one':'thin')))), true);
  c('Joe (all-high) never turns a gap into "one person"', G.filter(r=>r.d.concat(r.c).every(n=>n==='Joe Brown'||n==='Sam Ortiz'||n==='Tom Reyes')&&r.d.concat(r.c).length).every(r=>r.reading==='gap'), true);
  E(`GF_VIEW='church'; gfRender();`);
  const CT=D.getElementById('giftbody');
  c('the grid is drawn, in a scroll container', [CT.querySelectorAll('.gfr-cvt tbody tr').length,!!CT.querySelector('.gfscroll .gfr-cvt')], [12,true]);
  c('under-18 and all-high counts', [...CT.querySelectorAll('.gfr-stats b')].map(b=>b.textContent), ['5','2','1']);
  c('the grid marks the all-high member with * and under-18s, and says why they are not counted', [/Joe\*/.test(CT.querySelector('.gfr-cvt').textContent),/\(under 18\)/.test(CT.querySelector('.gfr-cvt').textContent),/not counted in the reading/.test((CT.querySelector('.gfr-cvkey')||{}).textContent||'')], [true,true,true]);
  c('existing sections stay', [/What this church is strong in/.test(CT.textContent),/Who could staff what/.test(CT.textContent)], [true,true]);
  c('no NaN / undefined / null on the church page', /\b(NaN|undefined|null)\b/.test(CT.textContent), false);
  E(`LANG='es'; gfRender();`);
  const CE=D.getElementById('giftbody').textContent;
  c('the church page in Spanish', [/Su congregación frente a su vecindario/.test(CE),/En qué es fuerte esta iglesia/.test(CE),/menores de 18/.test(CE)], [true,true,true]);
  c('no English left on the Spanish church page', /Across the congregation|What this church is strong in|Who could staff what|Gifted and drawn|Well covered|Thin\b|A real gap|members so far|proven\b/.test(CE), false);
  E(`LANG='en'`);
  c('no page errors', errs, []);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},1500);
