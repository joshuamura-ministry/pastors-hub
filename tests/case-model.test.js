// Make the Case (v10.39): caseModel → caseDeck → caseSample, against the whole app in jsdom.
//
//  1. The structured twins: caseReqPlain() = uReq() with no scope edits, caseCheckWith()
//     = uCheck() test for test, caseCapFrom() = capMerged() for a profile.
//  2. Every deck, EN and ES, all three kinds and several groups, passes the server's deck
//     rules (netlify/functions/present.mjs cleanDeck, reimplemented below; the real
//     function is used as well whenever it is in netlify/functions/), loses nothing on
//     the way through them, and follows the slide order of each kind.
//  3. No member name in any deck; under-18s never counted and never on the ask list.
//  4. The hero figure: ministry relevance first, then significance; never a figure
//     with a tract CV over 40%; compare.sig from compareResult().dir !== 'similar'.
//  5. Money in real amounts, the local budget and never tithe; the group's questions
//     answered with real figures; "I'm in" off for young people.
//  6. The sample slideshow: SAMPLE on every slide, made up or the pastor's own, and it
//     writes nothing.
//  7. Real Census rows (tests/moe-real-bucks.json) through metrics() and the model.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,500));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const J=x=>JSON.parse(JSON.stringify(x));

/* ---- the server's deck rules: present.mjs cleanDeck(), field by field ----------------
   Kept in step with netlify/functions/present.mjs (present-1.0). A deck that passes here
   is stored by the server exactly as built (the join slide's link and code excepted). */
const RULES=(()=>{
  const MAX_DECK=64*1024, MAX_SLIDES=12, MAX_STR=400, MAX_NUM=1e12;
  const HUES=new Set(['hardship','housing','children','people','language','acc']);
  // The young people's groups are the page's own CASE_YOUTH_GROUPS (set once the page is up),
  // so this copy cannot drift from it (it once missed 'school').
  const ANSWER_KEYS=['lead','help','pray'], YOUTH_GROUPS=new Set();
  const RE_TAG=/<[A-Za-z!/?]/, RE_SLUG=/^[a-z0-9][a-z0-9_-]{0,59}$/;
  class Bad extends Error{ constructor(w){ super('bad-deck '+w); this.where=w; } }
  const bad=w=>new Bad(w);
  const own=(o,k)=>(o&&Object.prototype.hasOwnProperty.call(o,k)?o[k]:undefined);
  const isPlain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const line=s=>String(s==null?'':s).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029‪-‮⁦-⁩]+/g,' ').replace(/\s+/g,' ').trim();
  function dText(v,where,{max=MAX_STR}={}){ if(v==null) return ''; if(typeof v!=='string') throw bad(where); const s=line(v); if(s.length>max||RE_TAG.test(s)) throw bad(where); return s; }
  function dNum(v,where,{int=false,min=-MAX_NUM,max=MAX_NUM}={}){ if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(int&&!Number.isInteger(v))) throw bad(where); return v; }
  function dVal(v,where){ if(v==null) return ''; if(typeof v==='number') return dNum(v,where); return dText(v,where); }
  const dNumOrNull=(v,where)=>v==null?null:dNum(v,where);
  function dHue(v,where){ if(v==null) return 'acc'; if(typeof v!=='string'||!HUES.has(v)) throw bad(where); return v; }
  function dBool(v,where){ if(v==null) return false; if(typeof v!=='boolean') throw bad(where); return v; }
  function dObj(v,where){ if(!isPlain(v)) throw bad(where); return v; }
  function dList(v,where,{min=0,max}){ if(v==null&&min===0) return []; if(!Array.isArray(v)||v.length<min||v.length>max) throw bad(where); return v; }
  function dQuote(v,where){ if(v==null) return null; const q=dObj(v,where); return {text:dText(own(q,'text'),where+'.text'),ref:dText(own(q,'ref'),where+'.ref')}; }
  function dRows(v,where,max){ return dList(v,where,{max}).map((row,i)=>{ const w=`${where}[${i}]`; if(!Array.isArray(row)||row.length!==2) throw bad(w); return [dText(row[0],w+'[0]'),dVal(row[1],w+'[1]')]; }); }
  const heads=(s,w)=>({kicker:dText(own(s,'kicker'),w+'.kicker'),headline:dText(own(s,'headline'),w+'.headline')});
  const SLIDES={
    join:(s,w)=>({note:dText(own(s,'note'),w+'.note')}),
    motion:(s,w)=>({...heads(s,w),rows:dRows(own(s,'rows'),w+'.rows',5),by:dText(own(s,'by'),w+'.by')}),
    stat:(s,w)=>{ const dots=own(s,'dots'); let d=null;
      if(dots!=null){ const o=dObj(dots,w+'.dots'); const n=dNum(own(o,'n'),w+'.dots.n',{int:true,min:1,max:1000}); d={n,on:dNum(own(o,'on'),w+'.dots.on',{int:true,min:0,max:n}),hue:dHue(own(o,'hue'),w+'.dots.hue')}; }
      const cmp=own(s,'compare'); let cc=null;
      if(cmp!=null){ const o=dObj(cmp,w+'.compare'); const moe=own(o,'moe');
        cc={here:dVal(own(o,'here'),w+'.compare.here'),county:dVal(own(o,'county'),w+'.compare.county'),label:dText(own(o,'label'),w+'.compare.label'),sig:dBool(own(o,'sig'),w+'.compare.sig'),moe:moe==null?null:dVal(moe,w+'.compare.moe')}; }
      return {...heads(s,w),value:dVal(own(s,'value'),w+'.value'),unit:dText(own(s,'unit'),w+'.unit'),hue:dHue(own(s,'hue'),w+'.hue'),freq:dText(own(s,'freq'),w+'.freq'),
        count:dText(own(s,'count'),w+'.count'),dots:d,compare:cc,source:dText(own(s,'source'),w+'.source')}; },
    trio:(s,w)=>({...heads(s,w),items:dList(own(s,'items'),w+'.items',{min:3,max:3}).map((it,i)=>{ const x=`${w}.items[${i}]`, o=dObj(it,x);
      return {value:dVal(own(o,'value'),x+'.value'),label:dText(own(o,'label'),x+'.label'),hue:dHue(own(o,'hue'),x+'.hue')}; }),source:dText(own(s,'source'),w+'.source')}),
    capacity:(s,w)=>({...heads(s,w),rows:dList(own(s,'rows'),w+'.rows',{max:4}).map((it,i)=>{ const x=`${w}.rows[${i}]`, o=dObj(it,x);
      return {label:dText(own(o,'label'),x+'.label'),need:dNumOrNull(own(o,'need'),x+'.need'),have:dNumOrNull(own(o,'have'),x+'.have'),unit:dText(own(o,'unit'),x+'.unit')}; }),
      gaps:dList(own(s,'gaps'),w+'.gaps',{max:6}).map((g,i)=>dText(g,`${w}.gaps[${i}]`)),source:dText(own(s,'source'),w+'.source')}),
    ability:(s,w)=>({...heads(s,w),value:dVal(own(s,'value'),w+'.value'),label:dText(own(s,'label'),w+'.label'),
      gifts:dList(own(s,'gifts'),w+'.gifts',{max:12}).map((g,i)=>dText(g,`${w}.gifts[${i}]`)),lead:dText(own(s,'lead'),w+'.lead'),source:dText(own(s,'source'),w+'.source')}),
    ask:(s,w)=>({...heads(s,w),rows:dRows(own(s,'rows'),w+'.rows',7),verse:dQuote(own(s,'verse'),w+'.verse')}),
    risks:(s,w)=>({...heads(s,w),items:dList(own(s,'items'),w+'.items',{max:6}).map((t,i)=>dText(t,`${w}.items[${i}]`)),source:dText(own(s,'source'),w+'.source')}),
    timeline:(s,w)=>({...heads(s,w),steps:dList(own(s,'steps'),w+'.steps',{min:3,max:3}).map((it,i)=>{ const x=`${w}.steps[${i}]`, o=dObj(it,x);
      return {date:dText(own(o,'date'),x+'.date'),title:dText(own(o,'title'),x+'.title'),text:dText(own(o,'text'),x+'.text')}; }),quote:dQuote(own(s,'quote'),w+'.quote')}),
    roles:(s,w)=>({...heads(s,w),roles:dList(own(s,'roles'),w+'.roles',{max:4}).map((it,i)=>{ const x=`${w}.roles[${i}]`, o=dObj(it,x);
      return {title:dText(own(o,'title'),x+'.title'),hours:dVal(own(o,'hours'),x+'.hours'),text:dText(own(o,'text'),x+'.text')}; })}),
    yes:(s,w)=>{ const seen=new Set();
      const options=dList(own(s,'options'),w+'.options',{min:3,max:3}).map((it,i)=>{ const x=`${w}.options[${i}]`, o=dObj(it,x), k=own(o,'k');
        if(typeof k!=='string'||!ANSWER_KEYS.includes(k)||seen.has(k)) throw bad(x+'.k'); seen.add(k);
        return {k,label:dText(own(o,'label'),x+'.label'),text:dText(own(o,'text'),x+'.text')}; });
      return {...heads(s,w),options,respond:dBool(own(s,'respond'),w+'.respond')}; },
    verse:(s,w)=>{ const version=own(s,'version'); if(version!=='KJV'&&version!=='RVA') throw bad(w+'.version');
      return {text:dText(own(s,'text'),w+'.text'),ref:dText(own(s,'ref'),w+'.ref'),version}; },
    close:(s,w)=>({headline:dText(own(s,'headline'),w+'.headline'),text:dText(own(s,'text'),w+'.text'),quote:dQuote(own(s,'quote'),w+'.quote')})
  };
  function cleanDeck(raw){
    if(!isPlain(raw)) throw bad('deck');
    if(Buffer.byteLength(JSON.stringify(raw),'utf8')>MAX_DECK) throw bad('too-large');
    if(own(raw,'kind')!=='tdeck') throw bad('kind'); if(own(raw,'ver')!==1) throw bad('ver');
    const lang=own(raw,'lang'); if(lang!=='en'&&lang!=='es') throw bad('lang');
    const au=dObj(own(raw,'audience'),'audience'), type=own(au,'type');
    if(type!=='board'&&type!=='team'&&type!=='congregation') throw bad('audience.type');
    const group=own(au,'group'); if(typeof group!=='string'||!RE_SLUG.test(group)) throw bad('audience.group');
    let ministry=null; const mi=own(raw,'ministry');
    if(mi!=null){ const o=dObj(mi,'ministry'), id=own(o,'id'); if(typeof id!=='string'||!RE_SLUG.test(id)) throw bad('ministry.id'); ministry={id,name:dText(own(o,'name'),'ministry.name')}; }
    const cr=own(raw,'created'); const created=cr==null?null:(typeof cr==='number'?dNum(cr,'created',{min:0,max:1e14}):dText(cr,'created',{max:40}));
    const slides=dList(own(raw,'slides'),'slides',{min:1,max:MAX_SLIDES}).map((s,i)=>{ const w=`slides[${i}]`; const o=dObj(s,w), t=own(o,'type');
      if(typeof t!=='string'||!Object.prototype.hasOwnProperty.call(SLIDES,t)) throw bad(w+'.type');
      const out={type:t,...SLIDES[t](o,w)};
      if(t==='join'){ out.qrUrl='https://pastorshub.org/#watch=AAAAAAAAAAAAAAAAAAAAAA'; out.code6='AAAAAA'; }
      if(t==='yes'&&YOUTH_GROUPS.has(group)) out.respond=false;
      return out; });
    return {kind:'tdeck',ver:1,lang,title:dText(own(raw,'title'),'title'),church:dText(own(raw,'church'),'church'),audience:{type,group},ministry,created,slides};
  }
  return {cleanDeck,youth:list=>{ YOUTH_GROUPS.clear(); list.forEach(g=>YOUTH_GROUPS.add(g)); }};
})();
const serverCheck=d=>{ try{ return {ok:true,deck:RULES.cleanDeck(d)}; }catch(e){ return {ok:false,where:e.where||e.message}; } };
/* Every string anywhere in a value, with its path. */
function strings(v,p='',out=[]){ if(typeof v==='string') out.push([p,v]); else if(Array.isArray(v)) v.forEach((x,i)=>strings(x,p+'['+i+']',out)); else if(v&&typeof v==='object') Object.keys(v).forEach(k=>strings(v[k],p+'.'+k,out)); return out; }
/* The deck as the server stores it, minus the join slide's own link and code: must equal what was built. */
const sansJoin=d=>{ const x=J(d); x.slides.forEach(s=>{ if(s.type==='join'){ delete s.qrUrl; delete s.code6; } }); return x; };

const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
    w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
const w=dom.window; const E=s=>w.eval(s); const JE=s=>JSON.parse(E('JSON.stringify('+s+')'));

(async()=>{
  const t0=Date.now(); while(Date.now()-t0<8000){ try{ if(E('typeof caseModel==="function"&&typeof uCatalog==="function"')) break; }catch(e){} await new Promise(r=>setTimeout(r,25)); }
  c('no boot errors', errs, []);
  RULES.youth(JE('[...CASE_YOUTH_GROUPS]'));
  c('the young people’s groups, as the page and present.mjs name them', JE('[...CASE_YOUTH_GROUPS].sort()'), ['adventurers','pathfinders','school','youth']);
  const NOW=Date.UTC(2026,8,28,15);   // 28 Sep 2026

  /* ---- the pastor's own church: the fixture survey with margins and club ages, MEDIUM, members ---- */
  const D=J(FX.DATA);
  D.M.tract.moe=JE('CASE_SAMPLE.M.tract.moe'); D.M.county.moe=JE('CASE_SAMPLE.M.county.moe');
  Object.assign(D.M.tract,{age5_9:420,age10_14:395,age15_17:236,famKids:862,employed:2610,seniors:540});
  E('DATA='+JSON.stringify(D)+';SCOPE="tract";');
  E('uChurch().name="Bucks County SDA"; CAP=null; capSave('+JSON.stringify(FX.MEDIUM)+');');
  const NAMES=['Ana Lopez','Ben Carter','Cara Diaz','Dan Evans','Eve Fox','Gus Hill','Young Kid','High Everywhere'];
  E(`(()=>{ const mk=b=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=b.includes(g.id)?4:1; }); return gfScores(a); };
    const P=(i,name,b,h,x)=>({id:'m'+i,name,gifts:mk(b),heart:h,confirmed:true,willing:true,hours:6,skills:['kids'],source:'manual',...(x||{})});
    uChurch().members=[P(0,'Ana Lopez',['teach','shep','creative','helps'],{children:2,families:2}),
      P(1,'Ben Carter',['teach','shep','encour'],{children:1}),
      P(2,'Cara Diaz',['teach','creative','helps','mercy'],{}),
      P(3,'Dan Evans',['admin','leader','giving'],{poor:2}),
      P(4,'Eve Fox',['mercy','helps','serve','hosp'],{poor:2,families:1}),
      P(5,'Gus Hill',['evang','mission','hosp'],{newcomers:2})];
    uPersist(); })()`);
  const everyone=()=>E('gfEveryone().length');
  c('six adult members with gifts results', everyone(), 6);

  console.log('\n-- 1. the structured twins stay in step with the app --');
  { const bad=JE(`SIGNATURE.filter(x=>JSON.stringify(caseReqPlain(x))!==JSON.stringify(uReq(x))).map(x=>x.id)`);
    c('caseReqPlain(x) = uReq(x) for all '+E('SIGNATURE.length')+' catalogue ministries when there are no scope edits', bad, []); }
  for(const [nm,prof,sel] of [['MEDIUM',FX.MEDIUM,[]],['MEDIUM with two ministries chosen',FX.MEDIUM,['food-pantry','pathfinders']],['SMALL',FX.SMALL,[]],['SMALL with one chosen',FX.SMALL,['community-dinner']],['no profile saved',{},[]]]){
    E('CAP=null; capSave('+JSON.stringify(prof)+'); uChurch().selected='+JSON.stringify(sel)+'; uPersist(); U_PEOPLE_CACHE=null;');
    const diff=JE(`uCatalog().map(x=>{ const a=uCheck(x), b=caseCheckWith(capMerged(),uReq(x),uUsage(x.id),uEvidence(x).valid);
      return (a.ok!==b.ok||a.gaps.length!==b.gaps.length||JSON.stringify(a.spaces)!==JSON.stringify(b.spaces)||JSON.stringify(a.slots)!==JSON.stringify(b.slots))?x.id:null; }).filter(Boolean)`);
    c(`caseCheckWith = uCheck (ok, number of gaps, rooms, times) on every ministry: ${nm}`, diff, []);
  }
  E('CAP=null; capSave('+JSON.stringify(FX.MEDIUM)+'); uChurch().selected=[]; uPersist(); U_PEOPLE_CACHE=null;');
  { const f=['hands','concurrent','hours','startup','monthly','slots','skills','ready','languages'];
    E('CAP=null; capSave(JSON.parse(JSON.stringify(DEMO_CHURCH))); U_PEOPLE_CACHE=null;');
    const a=JE(`(()=>{ const m=capMerged(); return ${JSON.stringify(f)}.map(k=>m[k]); })()`), b=JE(`(()=>{ const m=caseCapFrom(DEMO_CHURCH); return ${JSON.stringify(f)}.map(k=>m[k]); })()`);
    c('caseCapFrom(DEMO_CHURCH) = capMerged() for the demo church', b, a);
    E('CAP=null; capSave('+JSON.stringify(FX.MEDIUM)+'); U_PEOPLE_CACHE=null;'); }

  console.log('\n-- 2. every deck passes the server, both languages, all three kinds --');
  const ORDER={board:['join','motion','stat','trio','capacity','ability','ask','risks','timeline'],
    team:['join','motion','stat','trio','ability','roles','risks','timeline','yes'],
    congregation:['join','verse','stat','stat','ability','motion','yes','close']};
  // Every group the pastor can name (v10.39 review: 14 of 23 were never built by a test).
  const GROUPS=JE('CASE_GROUPS.map(g=>[g.id,g.type])');
  const MINS=['pathfinders','food-pantry','bp-clinic','interpreter-bank','lift-rota'];
  const built=[]; const probs=[];
  for(const lang of ['en','es']) for(const [g,t] of GROUPS) for(const id of MINS){
    const out=JE(`(()=>{ const m=caseModel(${JSON.stringify(id)},{type:${JSON.stringify(t)},group:${JSON.stringify(g)}},{lang:${JSON.stringify(lang)},now:${NOW},respond:true}); return {m,d:caseDeck(m)}; })()`);
    built.push({lang,g,t,id,...out});
  }
  const allOk=built.every(b=>b.m.ok);
  c(`${built.length} models built (EN/ES × ${GROUPS.length} groups × ${MINS.length} ministries)`, [allOk,built.length,GROUPS.length], [true,2*GROUPS.length*MINS.length,23]);
  const svr=built.map(b=>({b,r:serverCheck(b.d)}));
  c('every deck passes the server’s deck rules', svr.filter(x=>!x.r.ok).map(x=>`${x.b.lang}/${x.b.g}/${x.b.id}: ${x.r.where}`), []);
  c('…and loses nothing on the way through (the server stores exactly what was built)', svr.filter(x=>x.r.ok&&JSON.stringify(sansJoin(x.r.deck))!==JSON.stringify(sansJoin(x.b.d))).map(x=>`${x.b.lang}/${x.b.g}/${x.b.id}`), []);
  c('every slide has `type`, 12 at most, under 64 KB', built.filter(b=>!b.d.slides.every(s=>typeof s.type==='string')||b.d.slides.length>12||Buffer.byteLength(JSON.stringify(b.d))>64*1024).map(b=>b.id), []);
  c('slide order per kind: board 8 + join, team 8 + join, congregation 7 + join',
    built.filter(b=>JSON.stringify(b.d.slides.map(s=>s.type))!==JSON.stringify(ORDER[b.t])).map(b=>`${b.lang}/${b.g}/${b.id}: ${b.d.slides.map(s=>s.type).join(',')}`), []);
  c('audience and ministry carried on the deck', built.every(b=>b.d.audience.type===b.t&&b.d.audience.group===b.g&&b.d.ministry.id===b.id&&b.d.lang===b.lang&&b.d.church==='Bucks County SDA'), true);
  { const bad=[];
    built.forEach(b=>strings(b.d).forEach(([p,s])=>{ if(/\{[A-Za-z]+\}|undefined|NaN|\bnull\b|\[object/.test(s)) bad.push(`${b.lang}/${b.g}/${b.id}${p}: ${s}`); if(s.length>400) bad.push('long '+p); }));
    c('no unfilled {placeholder}, "undefined", "NaN" or "null" in any string; none over 400 characters', bad.slice(0,6), []); }
  { const bad=[];
    built.forEach(b=>b.d.slides.forEach((s,i)=>{ if(s.type==='join') return; const h=s.headline!=null?s.headline:s.text; if(!h) bad.push(`${b.lang}/${b.g}/${b.id} slide ${i} ${s.type}: empty`); }));
    c('every slide says something (a headline, or the verse)', bad, []); }
  { const bad=[];
    built.forEach(b=>strings(b.d).forEach(([p,s])=>{ if(NAMES.some(n=>s.includes(n))||/\b(Ana|Lopez|Carter|Diaz|Evans|Gus)\b/.test(s)) bad.push(`${b.lang}/${b.g}/${b.id}${p}`); }));
    c('no member’s name anywhere in any deck', bad, []); }
  { const m=built.find(b=>b.lang==='en'&&b.g==='board'&&b.id==='pathfinders').m;
    c('…while the private ask list does carry names (the pastor’s eyes only)', m.askList.length>0&&m.askList.every(a=>typeof a.name==='string'&&a.name&&a.role&&['ready','drawn','could'].includes(a.status)), true);
    c('…and caseDeck() never reads it: a deck built with the list emptied is the same deck', JSON.stringify(E(`JSON.stringify(caseDeck(Object.assign(caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW}}),{askList:[]})))`))===JSON.stringify(JSON.stringify(built.find(b=>b.lang==='en'&&b.g==='board'&&b.id==='pathfinders').d)), true); }

  console.log('\n-- the board deck, English (pathfinders) --');
  const BE=built.find(b=>b.lang==='en'&&b.g==='board'&&b.id==='pathfinders'), BD=BE.d, BM=BE.m;
  const S=t=>BD.slides.find(s=>s.type===t);
  c('the motion first: approve a trial, the ministry named', S('motion').headline, 'Approve a trial of 6 weeks: Pathfinder & Adventurer club, open to the neighborhood');
  c('motion rows: runs, places, ceiling, funds (not tithe), review', S('motion').rows.map(r=>r[0]), ['Runs','Places','Spending ceiling','Funds','Review']);
  c('…funds: the local church budget, not tithe', S('motion').rows[3][1], 'The local church budget, not tithe');
  c('…the review is a board meeting on the review date', /^\d{1,2} [A-Z][a-z]{2} · board meeting$/.test(S('motion').rows[4][1]), true);
  c('…to whom and the date (no one registered on this device: no "Prepared by")', S('motion').by, 'To: Church board · 28 Sep 2026');
  c('…and with the pastor registered: "Prepared by Pastor …", in Spanish "el pastor …"', [
    JE(`(()=>{ localStorage.setItem('terrain-reg',JSON.stringify({name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Allegheny East',role:'pastor'})); const b=caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW}}).motion.by; return b; })()`),
    JE(`caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW},lang:'es'}).motion.by`),
    JE(`caseDeck(caseModel('pathfinders',{type:'congregation',group:'congregation'},{now:${NOW},respond:true})).slides[7].text`),
    JE(`(()=>{ localStorage.removeItem('terrain-reg'); return caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW},presenter:'Elder Ruth Park'}).motion.by; })()`)],
    ['To: Church board · Prepared by Pastor Joshua Mura · 28 Sep 2026','Para: Junta directiva de la iglesia · Preparado por el pastor Joshua Mura · 28 sep 2026',
     'Tap “I’m in” on your phone, or speak to Pastor Joshua Mura afterwards.','To: Church board · Prepared by Elder Ruth Park · 28 Sep 2026']);
  c('the need: children, the share of residents', [S('stat').headline,S('stat').value,S('stat').unit,S('stat').hue], ['About 1 in 4 people around us is a child','27','%','children']);
  c('…with the count, the 100-dot picture and the county beside it', [S('stat').count,S('stat').dots,S('stat').compare], ['about 1,490 children',{n:100,on:27,hue:'children'},{here:27.2,county:20.4,label:'Bucks County',sig:true,moe:3.1}]);
  c('…and the source says the margin and the verdict', S('stat').source, 'U.S. Census ACS 2020–2024 · Census Tract 2041.02 · margin of error ±3.1 points · higher than the county');
  c('why here: three figures, significant ones first, each against the county', S('trio').items.map(i=>i.value), ['1 in 5','1 in 4','1 in 3']);
  c('…the board’s emphasis leads the supports (poverty, then child poverty)', BM.need.supports.map(f=>f.key), ['poverty','childPoverty']);
  c('…each says what the county is, in the same words (about / nearly / more than 1 in N)', S('trio').items.map(i=>i.label.replace(/^.*\. County: /,'')), ['1 in 14.','1 in 12.','nearly 1 in 5.']);
  c('capacity: volunteers, leaders, hours, start-up budget', S('capacity').rows.map(r=>[r.label,r.need,r.have,r.unit]),
    [['Volunteers',5,35,''],['Leaders',1,7,''],['Hours in the first month',50,250,'h'],['Start-up budget',75,2500,'$']]);
  c('…nothing missing, so no gaps and the headline says so', [S('capacity').gaps,S('capacity').headline], [[],'We have the people and hours to staff it']);
  c('who is able: a count, the gifts it needs, and no names', [S('ability').value,S('ability').label,S('ability').gifts], ['3','Members with gifts that fit this work; 2 of them said they are drawn to it.',['Teaching','Shepherding and pastoral care','Creative communication and craftsmanship','Helps']]);
  c('…the source counts adults only', S('ability').source, 'Spiritual Gifts results from 6 members · adults only · counts only, no names');
  c('the ask, itemised, in real dollars', S('ask').rows, [['People','1 leader · 5 volunteers'],['Room','Classrooms · Tuesday evening'],['To start · each month','$75 · $25'],['Ceiling','$125'],['Source','Local budget, not tithe'],['Left after this','$2,425 · $425 a month']]);
  c('…with Luke 14:28, KJV', S('ask').verse, {text:'For which of you, intending to build a tower, sitteth not down first, and counteth the cost, whether he have sufficient to finish it?',ref:'Luke 14:28 · KJV'});
  c('risks: the two most serious for children, then never tithe, then the conference, then the open door', S('risks').items.map(t=>t.slice(0,32)), ['Every adult screened through Adv','Two adults in every room and act','Paid from the local church budge','Counsel sought from the conferen','Open door, and no private one-to']);
  c('…as many as fit the slide (five at most)', built.every(b=>{ const r=b.d.slides.find(s=>s.type==='risks'); return !r||(r.items.length<=5||b.t==='team')&&r.items.length<=6; }), true);
  c('…and the source names the Church Manual pages and ASV', S('risks').source, 'Church Manual 2022, pp. 181, 142, 134 · NAD Adventist Screening Verification');
  c('the three "why here" cards are alike in every deck: all in the sentence form, or all naming the figure', built.filter(b=>{ const t=b.d.slides.find(s=>s.type==='trio'&&b.t==='board'); if(!t) return false;
    const up=t.items.map(i=>/^[A-ZÁÉÍÓÚÑ]/.test(i.label)); return !(up.every(x=>x)||up.every(x=>!x)); }).map(b=>b.lang+'/'+b.g+'/'+b.id), []);
  c('every board deck, both languages, says never tithe among its risks when the trial costs anything', built.filter(b=>b.t==='board'&&b.m.ask.ceiling>0&&!b.d.slides.find(s=>s.type==='risks').items.some(t=>/never tithe|nunca con el diezmo/.test(t))).map(b=>b.lang+'/'+b.g+'/'+b.id), []);
  c('the timeline: start, midpoint, board review, three weeks apart', S('timeline').steps.map(s=>s.date.replace(/^\d+ \w+ · /,'')), ['start','midpoint','review']);
  c('…the dates follow the church’s Tuesday evening slot, two weeks out', [BM.dates.start,BM.dates.mid,BM.dates.review], ['2026-10-13','2026-11-03','2026-11-24']);
  c('…and closes on PK 638.1', S('timeline').quote, {text:'Nehemiah asked the people directly whether they would take advantage of this opportunity and arise and build the wall.',ref:'Ellen G. White · Prophets and Kings, p. 638'});

  console.log('\n-- the same deck in Spanish --');
  const BS=built.find(b=>b.lang==='es'&&b.g==='board'&&b.id==='pathfinders').d;
  const SS=t=>BS.slides.find(s=>s.type===t);
  c('usted and the Spanish catalogue name after a colon', SS('motion').headline, 'Aprobar una prueba de 6 semanas: Club de Conquistadores y Aventureros, abierto al vecindario');
  c('the need in Spanish, with its county said in Spanish', [SS('stat').headline,SS('stat').count,SS('stat').compare.label,SS('trio').source], ['Alrededor de 1 de cada 4 personas de nuestro entorno es menor de 18 años','unos 1,490 menores de 18 años','Condado de Bucks','ACS 2020–2024 · Sección censal 2041.02 comparado con el condado de Bucks']);
  c('…the source in Spanish', SS('stat').source, 'Censo de EE. UU. ACS 2020–2024 · Sección censal 2041.02 · margen de error ±3.1 puntos · por encima del condado');
  c('the ask in Spanish, and the verse from the RVA 1909', [SS('ask').rows[0][0],SS('ask').rows.find(r=>r[0]==='Fondos')[1],SS('ask').verse.ref], ['Personas','Presupuesto local, no el diezmo','Lucas 14:28 · RVA']);
  c('the dates in Spanish', SS('timeline').steps[0].date, '13 oct · inicio');
  c('Ellen White in the official Spanish (PR 471.2)', SS('timeline').quote, {text:'Nehemías preguntó directamente al pueblo si quería aprovechar esta oportunidad y levantarse para edificar la muralla.',ref:'Elena G. de White · Profetas y Reyes, p. 471'});
  { // Every sentence-length string differs between the two languages, except names and references.
    const en=new Map(strings(BD)), same=[];
    strings(BS).forEach(([p,s])=>{ const e=en.get(p); if(e===s&&/[a-z]{3,}.*\s.*[a-z]{3,}/i.test(s)&&!/Bucks County SDA|Census Tract|Bucks County|^[A-Z][A-Za-z ]+ · /.test(s)) same.push(p+': '+s); });
    c('nothing left in English in the Spanish deck', same, []); }
  c('every catalogue ministry has a Spanish name for the Spanish decks', JE(`(()=>{ const p=LANG; LANG='es'; const r=SIGNATURE.filter(x=>caseMinName(x)===x.n).map(x=>x.id); LANG=p; return r; })()`), []);
  c('…with no leading article clash: none starts with «, and none is empty', JE(`(()=>{ const p=LANG; LANG='es'; const r=SIGNATURE.map(x=>caseMinName(x)).filter(n=>!n||/^[«"]/.test(n)); LANG=p; return r; })()`), []);
  { const long=[]; built.forEach(b=>b.d.slides.filter(s=>s.type==='trio').forEach(s=>s.items.forEach(i=>{ if(i.label.length>140||String(i.value).length>12) long.push(b.lang+'/'+b.g+'/'+b.id+': '+i.label); })));
    c('trio cards stay short enough for a phone: labels ≤ 140 characters, values ≤ 12', long.slice(0,4), []); }
  for(const t of ['team','congregation']){
    const en=built.find(b=>b.lang==='en'&&b.t===t&&b.id==='food-pantry').d, es=built.find(b=>b.lang==='es'&&b.t===t&&b.id==='food-pantry').d;
    const E1=new Map(strings(en)), same=[];
    strings(es).forEach(([p,s])=>{ if(E1.get(p)===s&&/[a-z]{3,}.*\s.*[a-z]{3,}/i.test(s)&&!/Bucks County SDA|Census Tract|Bucks County/.test(s)) same.push(p+': '+s); });
    c(`nothing left in English in the Spanish ${t} deck`, same, []);
  }

  console.log('\n-- the team deck and the congregation deck --');
  const TY=built.find(b=>b.lang==='en'&&b.g==='youth'&&b.id==='pathfinders'), TD=TY.d;
  const T=t=>TD.slides.find(s=>s.type===t);
  c('the invitation: “You are the people this needs”, with when and where', [T('motion').headline,T('motion').rows.map(r=>r[0])], ['You are the people this needs',['When','Runs','Places','Review']]);
  c('the people we would serve: children of club age, from the Census age bands', [T('stat').headline,T('stat').value,T('stat').unit], ['About 815 children aged 5 to 14 live around us','815','children aged 5 to 14']);
  c('why the plan looks this way: three figures that shape it', [T('trio').items.length,T('trio').items.every(i=>i.label.length>30)], [3,true]);
  c('roles with hours a month, and a youth lead for the youth team', T('roles').roles.map(r=>[r.title,r.hours]), [['Coordinator','9 h a month'],['Team member × 4','8 h a month'],['Youth lead','8 h a month'],['Prayer partner','A few minutes a day']]);
  c('support, youth team: the child-safety rows and the young people’s own part come first in the choosing', T('risks').items.map(t=>t.slice(0,30)),
    ['Training before the first sessi','One part planned and run by th','Every adult screened through A','Two adults in every room and a'].map(t=>t.slice(0,30)));
  c('“I’m in” is off for the youth team, even when asked for', T('yes').respond, false);
  const TH=built.find(b=>b.lang==='en'&&b.g==='health'&&b.id==='bp-clinic');
  c('…and on for the health team when asked for', TH.d.slides.find(s=>s.type==='yes').respond, true);
  c('the health team’s support includes the health rules: no diagnosis, licensed people only', TH.d.slides.find(s=>s.type==='risks').items.filter(t=>/diagnosis|licensed/.test(t)).length, 2);
  const CG=built.find(b=>b.lang==='en'&&b.g==='congregation'&&b.id==='pathfinders').d;
  const cs=CG.slides;
  c('congregation: one verse (Nehemiah 2:18, KJV) first', [cs[1].type,cs[1].ref,cs[1].version], ['verse','Nehemiah 2:18','KJV']);
  c('…our neighbours, as a number, in homes, with the children shown as dots', [cs[2].headline,cs[2].value,cs[2].unit,cs[2].freq,cs[2].count,cs[2].dots], ['About 5,480 neighbours live in 1,980 homes around us','5,480','neighbours','in 1,980 homes','27 in every 100 are children',{n:100,on:27,hue:'children'}]);
  c('…one thing we learned, then what God has put in this room', [cs[3].kicker,cs[4].kicker,cs[4].headline], ['One thing we learned','What God has put in this room','Look what God has already put in this room']);
  c('…and the thing learned is not the children again (just shown as dots): single parents instead', [cs[3].headline,cs[3].compare.sig], ['About 1 in 3 families with children around us is led by a single parent',true]);
  c('…while a ministry led by another figure keeps it (the pantry: SNAP)', built.find(b=>b.lang==='en'&&b.g==='congregation'&&b.id==='food-pantry').d.slides[3].headline, 'About 1 in 6 households around us receives SNAP food assistance');
  c('…the plan, three sizes of yes smallest first, and the promise to report back', [cs[5].headline,cs[6].options.map(o=>o.k),/^We will report back on \d+ \w{3}$/.test(cs[7].headline)], ['A trial of 6 weeks: Pathfinder & Adventurer club, open to the neighborhood',['pray','help','lead'],true]);
  c('…leading work with children says screening is required', cs[6].options[2].text, 'Lead or teach (screening required).');
  c('…and the close carries PK 638.3', cs[7].quote.ref, 'Ellen G. White · Prophets and Kings, p. 638');
  c('the board-approved line appears only when it was approved', [JE(`caseModel('pathfinders',{type:'congregation',group:'congregation'},{now:${NOW}}).motion.by`),JE(`caseModel('pathfinders',{type:'congregation',group:'congregation'},{now:${NOW},approved:'2026-10-06'}).motion.by`)], ['','Approved by the church board on 6 Oct']);

  c('with no language given, the model follows the page (LANG), and puts it back', JE(`(()=>{ const p=LANG; LANG='es'; const m=caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW}}); const after=LANG; LANG=p; return [m.lang,m.motion.headline.slice(0,7),after]; })()`), ['es','Aprobar','es']);
  c('…and an explicit language leaves the page’s as it was', JE(`(()=>{ caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW},lang:'es'}); return LANG; })()`), 'en');
  { // The survey read at county scope: nothing to compare with, so no comparison is made or claimed.
    const out=JE(`(()=>{ SCOPE='county'; const r=['board','team','congregation'].map(t=>caseDeck(caseModel('food-pantry',{type:t,group:t==='team'?'community':t},{now:${NOW}}))); SCOPE='tract'; return r; })()`);
    c('county scope: every kind still builds and passes the server', out.map(d=>serverCheck(d).ok), [true,true,true]);
    c('…with no county bars, no "higher than the county", no "why here" cards against itself', [out.some(d=>d.slides.some(s=>s.compare)),out.some(d=>strings(d).some(([p,x])=>/than the county|County:/.test(x))),out[0].slides.some(s=>s.type==='trio')], [false,false,false]); }
  console.log('\n-- the group changes the case --');
  const one=(g,t,id,lang='en')=>built.find(b=>b.g===g&&b.t===t&&b.id===id&&b.lang===lang);
  c('elders: their own role in the motion, their verse, their question set', [one('elders','board','food-pantry').d.slides[1].headline,one('elders','board','food-pantry').d.slides.find(s=>s.type==='ask').verse.ref,one('elders','board','food-pantry').m.questions.map(q=>q.id)],
    ['Support the coordinator: a real food pantry, on a schedule',"1 Peter 5:2 · KJV",['elders.gospel','elders.load','elders.trained','elders.fruit']]);
  c('finance and board decks differ, from the same figures', JSON.stringify(one('finance','board','food-pantry').d)!==JSON.stringify(one('board','board','food-pantry').d), true);
  { const qs=built.flatMap(b=>b.m.questions.map(q=>[b.lang,b.g,b.id,q]));
    c('every question answered with real figures: no placeholder left, none empty', qs.filter(([l,g,id,q])=>/\{/.test(q.q+q.a)||!q.q||!q.a).length, 0);
    c('“Which ages is it for?” only for the Pathfinder club', [...new Set(qs.filter(([l,g,id,q])=>q.id==='youth.ages').map(x=>x[2]))], ['pathfinders']);
    const bq=one('board','board','pathfinders').m.questions.find(q=>q.id==='board.cost');
    c('the board’s cost question, answered in dollars from the local budget', bq.a, 'The trial costs at most $125, from the local church budget, never tithe (Church Manual p. 142). After it, $2,425 of the start-up budget and $425 a month remains in the budget. Receipts go to the treasurer and an itemised account comes back at the review.');
    const why=one('board','board','pathfinders').m.questions.find(q=>q.id==='board.why');
    c('…and “why here” with the margin of error', why.a, 'Because of the Census figures for Census Tract 2041.02. About 1 in 4 people around us is a child: higher than the county, with a margin of error of ±3.1 points. Where a difference is too small to be sure of, the slides say “similar to the county”.'); }

  console.log('\n-- 3. under-18s and uncertain answers --');
  E(`(()=>{ const a=uChurch().members[0]; uChurch().members.push({...a,id:'m7',name:'Young Kid',minor:true},{...a,id:'m8',name:'High Everywhere',flags:{allHigh:true}}); uPersist(); U_PEOPLE_CACHE=null; })()`);
  { const m2=JE(`caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW}})`);
    c('an under-18 and an all-high answerer, with the strongest gifts and heart, change no count', [m2.gifts.respondents,m2.gifts.fit,m2.gifts.drawn,m2.gifts.ready], [BM.gifts.respondents,BM.gifts.fit,BM.gifts.drawn,BM.gifts.ready]);
    c('the under-18 is never on the ask list', m2.askList.some(a=>a.name==='Young Kid'), false);
    c('the all-high answerer is listed privately, marked uncertain', m2.askList.filter(a=>a.name==='High Everywhere').map(a=>a.uncertain), [true]);
    const d2=JE(`caseDeck(caseModel('pathfinders',{type:'congregation',group:'congregation'},{now:${NOW}}))`);
    c('…and neither name reaches a deck', strings(d2).some(([p,s])=>/Young Kid|High Everywhere/.test(s)), false); }
  E(`uChurch().members=uChurch().members.filter(p=>!['m7','m8'].includes(p.id)); uPersist(); U_PEOPLE_CACHE=null;`);

  console.log('\n-- 4. the hero: relevance first, then significance --');
  // A made-up neighbourhood whose figures the test sets (caseSampleCtx() is a fresh copy each time).
  const hero=(id,set,g='board',t='board')=>JE(`(()=>{ const ctx=caseSampleCtx(); const m=ctx.M.tract, k=ctx.M.county; (${set})(m,k); ctx.hits=caseHits(ctx.M,'tract');
    const M=caseModel(${JSON.stringify(id)},{type:'${t}',group:'${g}'},{ctx,now:${NOW}}); const d=caseDeck(M);
    return {key:M.need.hero.key,dir:M.need.hero.cmp&&M.need.hero.cmp.dir,sig:M.need.hero.sig,supports:M.need.supports.map(f=>f.key),stat:d.slides.find(s=>s.type==='stat'),trio:(d.slides.find(s=>s.type==='trio')||{}).items}; })()`);
  let h=hero('pathfinders','(m,k)=>{ m.uninsured=40; m.moe.uninsured=2; }');
  c('a huge, significant figure the ministry does not answer (uninsured, 40%) never leads a Pathfinder case', h.key, 'kidsShare');
  h=hero('pathfinders','(m,k)=>{ m.kidsShare=21; m.moe.kidsShare=6; m.k12Share=24; m.moe.k12Share=2; k.k12Share=15.5; k.moe.k12Share=0.2; }');
  c('its first need similar to the county, its second clearly higher: the second leads', [h.key,h.dir], ['k12Share','higher']);
  h=hero('pathfinders','(m,k)=>{ m.k12Share=24; m.moe.k12Share=2; k.k12Share=15.5; k.moe.k12Share=0.2; }');
  c('both clearly higher: the most relevant (the first need) leads', h.key, 'kidsShare');
  h=hero('pathfinders','(m,k)=>{ m.kidsShare=27.2; m.moe.kidsShare=18; m.k12Share=24; m.moe.k12Share=2; k.k12Share=15.5; k.moe.k12Share=0.2; }');
  c('a figure whose tract CV is over 40% is never featured (children ±18 points: CV 40.2%)', h.key, 'k12Share');
  h=hero('food-pantry','(m,k)=>{}');
  c('the food pantry leads with SNAP (its first need), clearly higher', [h.key,h.dir,h.stat.compare.sig], ['snap','higher',true]);
  h=hero('food-pantry','(m,k)=>{ m.snap=6.4; m.moe.snap=4; }');
  c('SNAP no different from the county: the pantry leads with its next need that is (food access, read as homes without a car)', [h.key,h.dir], ['noCar','higher']);
  h=hero('food-pantry','(m,k)=>{ m.snap=6.4; m.moe.snap=4; m.noCar=5.1; m.moe.noCar=3; }');
  c('…and with that similar too, the one after it (poverty)', [h.key,h.dir], ['poverty','higher']);
  h=hero('pathfinders','(m,k)=>{ m.kidsShare=20.4; m.moe.kidsShare=0.1; k.kidsShare=19.6; k.moe.kidsShare=0.1; m.k12Share=null; }');
  c('significant by the test but printed the same (20% and 20%): the slide says similar, compare.sig false', [h.key,h.dir,h.sig,h.stat.compare.sig], ['kidsShare','similar',false,false]);
  h=hero('pathfinders','(m,k)=>{ delete m.moe; delete k.moe; }');
  c('a survey without margins: no verdict, compare.moe null, no margin words in the source', [h.stat.compare.sig,h.stat.compare.moe,/margin|similar|higher/.test(h.stat.source)], [false,null,false]);
  h=hero('pathfinders','(m,k)=>{ m.poverty=7.3; m.moe.poverty=4; m.childPoverty=9; m.moe.childPoverty=9; }');
  c('supports are significant ones only: similar poverty figures are not supports', h.supports.includes('poverty')||h.supports.includes('childPoverty'), false);
  c('…and the trio fills with figures that do differ before any that are the same', [(h.trio||[]).length,(h.trio||[]).every(i=>!/About the same/.test(i.label))], [3,true]);
  h=hero('pathfinders','(m,k)=>{}','congregation','congregation');
  c('the congregation’s supports follow its own emphasis (single parents before poverty)', h.supports, ['singleParent','poverty']);

  console.log('\n-- 5. money in real amounts; never tithe --');
  c('fmtMoney: $0, $75, $450, $2,500, $9,999, then thousands', JE(`[0,75,450,2500,9999,10000,12400,52000,-40].map(fmtMoney)`), ['$0','$75','$450','$2,500','$9,999','$10k','$12k','$52k','-$40']);
  c('no deck anywhere says "$0k" or rounds a small sum to thousands', built.filter(b=>strings(b.d).some(([p,s])=>/\$\d+k/.test(s)&&!/\$\d{2,}k/.test(s))).map(b=>b.id), []);
  c('no deck asks for tithe: tithe appears only as "not tithe" / "no el diezmo" / "never tithe"', built.filter(b=>strings(b.d).some(([p,s])=>/tithe|diezmo/i.test(s)&&!/not tithe|never tithe|no el diezmo|nunca con el diezmo/i.test(s))).map(b=>b.id), []);
  { E('CAP=null; capSave('+JSON.stringify(FX.SMALL)+'); U_PEOPLE_CACHE=null;');
    const m=JE(`caseModel('community-dinner',{type:'board',group:'board'},{now:${NOW}})`), d=JE(`caseDeck(caseModel('community-dinner',{type:'board',group:'board'},{now:${NOW}}))`);
    const cap=d.slides.find(s=>s.type==='capacity');
    c('a small church short of money: the gap is said in dollars, not "$0k"', [m.capacity.ok,cap.headline,cap.gaps.filter(g=>/\$/.test(g))], [false,'What we have, and what is still missing',['Short by $45 a month']]);
    c('…and the ask says what is short, not a negative balance', d.slides.find(s=>s.type==='ask').rows.find(r=>r[0]==='Left after this')[1], 'Short by $45 a month');
    const es=JE(`caseDeck(caseModel('community-dinner',{type:'board',group:'board'},{now:${NOW},lang:'es'}))`).slides.find(s=>s.type==='capacity');
    c('…in Spanish too', es.gaps.filter(g=>/\$/.test(g)), ['Por cubrir: $45 al mes']);
    E('CAP=null; capSave('+JSON.stringify(FX.MEDIUM)+'); U_PEOPLE_CACHE=null;'); }

  console.log('\n-- no Spiritual Gifts results yet --');
  { E(`window.__keep=uChurch().members; uChurch().members=[]; uPersist(); U_PEOPLE_CACHE=null;`);
    const m=JE(`caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW}})`), d=JE(`caseDeck(caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW}}))`);
    const ab=d.slides.find(s=>s.type==='ability');
    c('the ability slide says what is known, and claims nobody', [ab.headline,ab.value,ab.label,ab.lead], ['Who could do this: what we know so far','6','The Spiritual Gifts assessment has not been run yet. The church profile lists 6 members with the skills this needs.','']);
    c('questions that need gifts results are left out', m.questions.filter(q=>/gifts/i.test(q.a)).length, 0);
    E(`uChurch().members=window.__keep; uPersist(); U_PEOPLE_CACHE=null;`); }

  console.log('\n-- 6. the sample slideshow --');
  { // The pastor's own survey is on screen: the sample uses it.
    E(`window.__writes=0; window.__ls=Storage.prototype.setItem; Storage.prototype.setItem=function(){ window.__writes++; return window.__ls.apply(this,arguments); };`);
    const own=JE(`caseSample({now:${NOW}})`);
    JE(`caseDeck(caseModel('food-pantry',{type:'team',group:'community'},{now:${NOW}}))`); JE(`caseRankAll(uCatalog(),caseRankCtx()).length`);
    c('with a survey on screen, the sample is built from it, and his church’s name carries SAMPLE on every slide’s footer', [own.ok,own.own,own.deck.church,own.keepDays], [true,true,'SAMPLE · Bucks County SDA',1]);
    c('…the figures are his survey’s, so they cite the Census', /^U\.S\. Census ACS 2020–2024/.test(own.deck.slides[2].source), true);
    c('…and names nobody: no ask list', own.model.askList, []);
    const dd=JE(`(()=>{ DATA=null; return caseSample({now:${NOW}}); })()`);
    c('without one, a made-up church and neighbourhood', [dd.ok,dd.own,dd.deck.church,dd.model.area.name,dd.model.area.county], [true,false,'Sample Church','Sample neighborhood','Sample County']);
    c('…the Pathfinder club, to the whole congregation', [dd.deck.ministry.id,dd.deck.audience.type], ['pathfinders','congregation']);
    const marked=dd.deck.slides.map(s=>s.type==='join'?s.note:s.type==='verse'?s.ref:s.type==='close'?s.text:s.kicker);
    c('SAMPLE on every slide (the join note, the verse reference, the close text, every kicker)', marked.every(t=>/^SAMPLE( · |$)/.test(t)), true);
    c('…a kicker that would not fit one line with the mark keeps the mark alone', [marked.filter(t=>t==='SAMPLE').length>0,dd.deck.slides.every(s=>!s.kicker||s.kicker.length<=34)], [true,true]);
    c('made-up figures never cite the Census, and the made-up gifts and profile say so', [strings(dd.deck).some(([p,s])=>/Census|Censo/.test(s)),dd.deck.slides.find(s=>s.type==='ability').source,
      JE(`caseSample({now:${NOW},audience:{type:'board',group:'board'}}).deck`).slides.find(s=>s.type==='capacity').source],
      [false,'Made-up sample Spiritual Gifts counts · counts only, no names','Made-up sample church profile']);
    c('…and in the title', dd.deck.title, 'SAMPLE · Pathfinder & Adventurer club, open to the neighborhood');
    c('the sample deck passes the server and loses nothing', [serverCheck(dd.deck).ok,JSON.stringify(sansJoin(serverCheck(dd.deck).deck))===JSON.stringify(sansJoin(dd.deck))], [true,true]);
    c('the made-up figures still show the county test', dd.deck.slides.find((s,i)=>s.type==='stat'&&i>2).compare, {here:34.5,county:19,label:'Sample County',sig:true,moe:9.8});
    const es=JE(`caseSample({now:${NOW},lang:'es'})`);
    c('in Spanish: MUESTRA on every slide, the made-up names in Spanish', [es.deck.slides.every(s=>/^MUESTRA( · |$)/.test(s.type==='join'?s.note:s.type==='verse'?s.ref:s.type==='close'?s.text:s.kicker)),es.deck.church,es.model.area.name,es.deck.slides[2].source], [true,'Iglesia de ejemplo','Vecindario de ejemplo','Cifras de ejemplo inventadas · Vecindario de ejemplo']);
    const bd=JE(`caseSample({now:${NOW},audience:{type:'board',group:'board'},ministry:'food-pantry'})`);
    c('any kind and ministry can be sampled', [bd.deck.audience.type,bd.deck.slides.map(s=>s.type).join(','),serverCheck(bd.deck).ok], ['board',ORDER.board.join(','),true]);
    c('nothing was written to the device while building samples and models', E('window.__writes'), 0);
    E(`Storage.prototype.setItem=window.__ls;`);
    E('DATA='+JSON.stringify(D)+';SCOPE="tract";');
    c('no DATA, no model: it says so rather than guessing', JE(`(()=>{ const d=DATA; DATA=null; const r=caseModel('pathfinders',{type:'board',group:'board'}); DATA=d; return r; })()`), {ok:false,error:'no-survey',lang:'en'});
    c('an unknown ministry: it says so', JE(`caseModel('nope',{type:'board',group:'board'})`).error, 'no-ministry'); }

  console.log('\n-- 7. real Census rows (Bucks County, 2020–2024) through metrics() and the model --');
  { const f=path.join(__dirname,'moe-real-bucks.json');
    if(!fs.existsSync(f)) console.log('  skip  moe-real-bucks.json not beside the test');
    else{
      const R=JSON.parse(fs.readFileSync(f,'utf8'));
      const tract=JE(`metrics(${JSON.stringify(R.tractHigh)},null,null)`), county=JE(`metrics(${JSON.stringify(R.county)},null,null)`);
      c('metrics() keeps every margin of error beside the figures (m.moe)', [typeof tract.moe,Object.keys(tract.moe).length>20,tract.moe.poverty>0], ['object',true,true]);
      c('…and the club ages are there, when the row carries them (older rows: null, not 0)', [tract.age10_14===null||typeof tract.age10_14==='number'], [true]);
      const RD={M:{tract,county},levels:{tract:{name:tract.name,short:'Tract'},county:{name:'Bucks County',short:'Bucks'}},geo:{matched:'x'}};
      E('DATA='+JSON.stringify(RD)+';SCOPE="tract";');
      const m=JE(`caseModel('food-pantry',{type:'board',group:'board'},{now:${NOW}})`);
      const exp=JE(`compareResult(DATA.M.tract[${JSON.stringify(m.need.hero.key)}],DATA.M.tract.moe[${JSON.stringify(m.need.hero.key)}],DATA.M.county[${JSON.stringify(m.need.hero.key)}],DATA.M.county.moe[${JSON.stringify(m.need.hero.key)}])`);
      c('the hero’s verdict is the Census test’s own', [m.need.hero.cmp&&m.need.hero.cmp.dir,m.need.hero.sig], [exp&&exp.dir,exp?exp.dir!=='similar':null]);
      const d=JE(`caseDeck(caseModel('food-pantry',{type:'board',group:'board'},{now:${NOW}}))`);
      c('the deck from real rows passes the server', serverCheck(d).ok, true);
      c('every featured figure has a tract CV of 40% or less', [m.need.hero,...m.need.trio].every(f=>f.cv==null||f.cv<=40), true);
      E('DATA='+JSON.stringify(D)+';SCOPE="tract";');
    } }

  console.log('\n-- the real server, when it is in netlify/functions --');
  { const pf=path.resolve(__dirname,'..','netlify','functions','present.mjs');
    if(!fs.existsSync(pf)) console.log('  skip  present.mjs not in netlify/functions yet (the reimplemented rules above were used)');
    else{
      const m=new Map(); let n=0; const tick=()=>new Promise(r=>setImmediate(r));
      globalThis.__terrainPresentStore={
        async get(k){ await tick(); const v=m.get(k); return v===undefined?null:JSON.parse(v.data); },
        async setJSON(k,val,o={}){ await tick(); const cur=m.get(k); if(o.onlyIfNew&&cur) return {modified:false}; if(o.onlyIfMatch&&(!cur||cur.etag!==o.onlyIfMatch)) return {modified:false}; const etag='e'+(++n); m.set(k,{data:JSON.stringify(val),etag}); return {modified:true,etag}; },
        async delete(k){ await tick(); m.delete(k); },
        async list({prefix=''}={}){ await tick(); return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key,etag:m.get(key).etag}))}; }};
      for(const k of ['TERRAIN_CODES','TERRAIN_REQUIRE_CODE','PRESENT_FB_URL','PRESENT_FB_SECRET']) delete process.env[k];
      const fn=(await import(require('url').pathToFileURL(pf).href)).default;
      const post=async b=>{ const r=await fn(new Request('https://x.test/.netlify/functions/present',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}),{}); return {status:r.status,j:await r.json()}; };
      const bad=[];
      // Every deck built above (all groups, both languages), each into a fresh store.
      for(const b of built){
        m.clear();
        const o=await post({op:'open',deck:b.d,keepDays:1});
        if(o.status!==200){ bad.push(`${b.lang}/${b.g}/${b.id}: ${o.status} ${o.j.error} ${o.j.where||''}`); continue; }
        const r=await fn(new Request('https://x.test/.netlify/functions/present?op=deck&room='+o.j.room,{method:'GET'}),{}); const g=await r.json();
        if(JSON.stringify(sansJoin(g.deck))!==JSON.stringify(sansJoin(b.d))) bad.push(`${b.lang}/${b.g}/${b.id}: stored differently`);
      }
      c(`present.mjs stores every deck exactly as built (${built.length} decks)`, bad, []);
    } }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); });
