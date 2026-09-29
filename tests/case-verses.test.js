// Make the Case v10.40: a verse on every slide, and "Here in {town}" — against the whole app in jsdom.
//
//  1. The library: CASE_VERSES, CASE_EGW and CASE_VERSE_PLAN are tests/case-quotes.json (the
//     verified research file, 28–29 Sep 2026) byte for byte: KJV / RVA 1909 from Bible Gateway,
//     Ellen White and her published Spanish from egwwritings.org.
//  2. Every deck (23 groups × several ministries × EN / ES × the pastor's own survey and the
//     made-up sample): a verse on every content slide, each exactly a library text with its
//     version, never the same verse twice, the same verses in English and Spanish, at most one
//     Ellen White line on a slide, the place slide in every deck naming the town.
//  3. The place is honest: the town against the county says "clearly" only when the difference
//     is significant; missing ZONES / HELP leave "where" and "who already serves" out; a HELP
//     or ZONES load for another church is never taken (the stale guard); with no place data at
//     all the "why here" cards come back.
//  4. The renderer: the place slide's groups, the verse foot between the body and the source,
//     a v10.39 deck's ask verse drawn in the foot, shorter lists beside a verse, the foot giving
//     way to the "I'm in" form.
//  5. The sample: made-up places named Sample / de ejemplo, SAMPLE on the place slide too.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const FX=require('./fixtures.json');
const LIB=require('./case-quotes.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,600));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
    w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
const w=dom.window; const E=s=>w.eval(s); const JE=s=>JSON.parse(E('JSON.stringify('+s+')'));

(async()=>{ try{
  const t0=Date.now(); while(Date.now()-t0<8000){ try{ if(E('typeof caseModel==="function"&&typeof uCatalog==="function"')) break; }catch(e){} await new Promise(r=>setTimeout(r,25)); }
  c('no boot errors', errs, []);
  const NOW=Date.UTC(2026,8,28,15);
  const D=JSON.parse(JSON.stringify(FX.DATA));
  D.M.tract.moe=JE('CASE_SAMPLE.M.tract.moe'); D.M.county.moe=JE('CASE_SAMPLE.M.county.moe');
  Object.assign(D.M.tract,{age5_9:420,age10_14:395,age15_17:236,famKids:862,employed:2610,seniors:540});
  const own=()=>E('DATA='+JSON.stringify(D)+';SCOPE="tract"; HELP=null; HELP_STATE="idle"; ZONES=null; ZONES_STATE="idle";');
  own();
  E('uChurch().name="Bucks County SDA"; CAP=null; capSave('+JSON.stringify(FX.MEDIUM)+');');
  E(`(()=>{ const mk=b=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=b.includes(g.id)?4:1; }); return gfScores(a); };
    const P=(i,name,b,h,x)=>({id:'m'+i,name,gifts:mk(b),heart:h,confirmed:true,willing:true,hours:6,skills:['kids'],source:'manual',...(x||{})});
    uChurch().members=[P(0,'Ana Lopez',['teach','shep','creative','helps'],{children:2,families:2}),P(1,'Ben Carter',['teach','shep','encour'],{children:1}),
      P(2,'Cara Diaz',['teach','creative','helps','mercy'],{}),P(3,'Dan Evans',['admin','leader','giving'],{poor:2}),P(4,'Eve Fox',['mercy','helps','serve','hosp'],{poor:2,families:1}),
      P(5,'Gus Hill',['evang','mission','hosp'],{newcomers:2}),P(6,'Young Kid',['teach','shep','helps'],{children:2},{minor:true})];
    uPersist(); })()`);

  console.log('\n-- 1. the library is the verified research file, byte for byte --');
  { const V=JE('CASE_VERSES'), G=JE('CASE_EGW'), P=JE('CASE_VERSE_PLAN');
    c(`${LIB.verses.length} verses, in the same order`, V.map(v=>v.id), LIB.verses.map(v=>v.id));
    c('every verse: English and Spanish text and reference identical, its jobs and needs', V.filter((v,i)=>{ const L=LIB.verses[i];
      return !(v.en.text===L.en.text&&v.en.ref===L.en.ref&&v.es.text===L.es.text&&v.es.ref===L.es.ref&&JSON.stringify(v.jobs)===JSON.stringify(L.jobs)&&JSON.stringify(v.needs)===JSON.stringify(L.needs)); }).map(v=>v.id), []);
    c(`${LIB.egw.length} Ellen White lines, identical in both languages, with their credits`, G.map(g=>[g.id,g.en.text===LIB.egw.find(x=>x.id===g.id).en.text,g.es.text===LIB.egw.find(x=>x.id===g.id).es.text,g.en.ref,g.es.ref]),
      LIB.egw.map(g=>[g.id,true,true,g.en.ref,g.es.ref]));
    c('the plan (candidates by slide job and by need) is the research plan', P, LIB.plan);
    c('the plan names only verses in the library', [...Object.values(P.byJob),...Object.values(P.byNeed)].flat().filter(id=>!V.some(v=>v.id===id)), []);
    c('every English verse is the KJV and every Spanish one the RVA: no verse over 160 characters but Luke 4:18 (the verse slide only)',
      V.filter(v=>Math.max(v.en.text.length,v.es.text.length)>160).map(v=>[v.id,v.jobs]), [['luke4_18',['verse']]]);
    c('every need id the Census rules fire maps to need tags the plan knows', JE(`Object.keys(CASE_NEED_CMP).filter(id=>!(CASE_NEED_TAG[id]||[]).length||(CASE_NEED_TAG[id]||[]).some(t=>!CASE_VERSE_PLAN.byNeed[t]))`), []); }

  console.log('\n-- 2. every deck: a verse on every content slide, never twice, the same in both languages --');
  const MINS=['pathfinders','food-pantry','bp-clinic','interpreter-bank','lift-rota','homework-club','community-dinner','welcome-table','vbs','sg-homes'];
  const GROUPS=JE('CASE_GROUPS.map(g=>[g.id,g.type])');
  const decks=JE(`(()=>{ const out=[]; const keep=DATA;
    for(const src of ['own','sample']) for(const lang of ['en','es']) for(const [g,t] of ${JSON.stringify(GROUPS)}) for(const id of ${JSON.stringify(MINS)}){
      let d=null;
      try{ if(src==='sample'){ DATA=null; const s=caseSample({lang,ministry:id,audience:{type:t,group:g},now:${NOW}}); d=s.ok?s.deck:null; }
           else { const m=caseModel(id,{type:t,group:g},{lang,now:${NOW},respond:true}); d=m.ok?caseDeck(m):null; } }
      finally{ DATA=keep; }
      if(d) out.push({src,lang,g,t,id,d}); }
    return out; })()`);
  c(`${decks.length} decks built (own survey and the made-up sample × EN/ES × ${GROUPS.length} groups × ${MINS.length} ministries)`, decks.length, 2*2*GROUPS.length*MINS.length);
  const VL=Object.fromEntries(LIB.verses.map(v=>[v.id,v]));
  const idOf=(lang,ref)=>{ const r=String(ref||'').replace(/^(SAMPLE|MUESTRA) · /,'').replace(/ · (KJV|RVA)$/,''); const v=LIB.verses.find(x=>x[lang].ref===r); return v?v.id:null; };
  const content=s=>s.type!=='join'&&s.type!=='close';
  const verseOf=(s,lang)=>s.type==='verse'?(s.text?{text:s.text,ref:s.ref,version:s.version}:null):s.verse||null;
  { const missing=[], notLib=[], twice=[], long=[];
    decks.forEach(b=>{ const ids=[];
      b.d.slides.forEach((s,i)=>{ if(!content(s)) return; const v=verseOf(s,b.lang); if(!v){ missing.push(`${b.src}/${b.lang}/${b.g}/${b.id} ${i}:${s.type}`); return; }
        const id=idOf(b.lang,v.ref), L=id&&VL[id][b.lang];
        const ver=b.lang==='es'?'RVA':'KJV';
        const okRef=s.type==='verse'?(s.version===ver&&v.ref.replace(/^(SAMPLE|MUESTRA) · /,'')===L.ref):v.ref===(L&&L.ref)+' · '+ver;
        if(!L||v.text!==L.text||!okRef) notLib.push(`${b.src}/${b.lang}/${b.g}/${b.id} ${i}:${s.type} ${v.ref}`);
        if(id){ if(ids.includes(id)) twice.push(`${b.src}/${b.lang}/${b.g}/${b.id} ${id}`); ids.push(id);
          const n=Math.max(VL[id].en.text.length,VL[id].es.text.length); if(n>(s.type==='verse'?300:160)) long.push(`${b.g}/${b.id} ${s.type} ${id} ${n}`); } }); });
    c('every content slide of every deck carries a verse (join and close excepted; the verse slide is one)', missing.slice(0,6), []);
    c('…each exactly a library text, in the deck’s language, with its reference and version (KJV / RVA)', notLib.slice(0,6), []);
    c('…never the same verse twice in one deck', twice.slice(0,6), []);
    c('…none longer than a slide’s foot holds (160 characters in either language; 300 on the verse slide)', long.slice(0,6), []); }
  { const bad=[];
    decks.filter(b=>b.lang==='en').forEach(b=>{ const es=decks.find(x=>x.src===b.src&&x.lang==='es'&&x.g===b.g&&x.id===b.id); if(!es){ bad.push('no es '+b.g+'/'+b.id); return; }
      const a=b.d.slides.map(s=>{ const v=verseOf(s,'en'); return v?idOf('en',v.ref):null; }), z=es.d.slides.map(s=>{ const v=verseOf(s,'es'); return v?idOf('es',v.ref):null; });
      if(JSON.stringify(a)!==JSON.stringify(z)) bad.push(`${b.src}/${b.g}/${b.id}: ${a.join(',')} | ${z.join(',')}`); });
    c('an English and a Spanish deck carry the same verses, slide for slide', bad.slice(0,4), []); }
  { const bad=[], counts={};
    // v10.41 (the pastor: "we can appeal to the conference leaders for an EVANGELISM proposal"): the conference
    // proposal's close quotes Scripture (a library verse, with its version), never Ellen White
    const isVerse=x=>/ · (KJV|RVA)$/.test(String(x.ref||''));
    decks.forEach(b=>{ b.d.slides.forEach(s=>{ if(s.type==='close'&&s.quote&&isVerse(s.quote)){ const id=idOf(b.lang,s.quote.ref); if(!id||VL[id][b.lang].text!==s.quote.text) bad.push(`${b.src}/${b.lang}/${b.g}/${b.id}: close verse ${s.quote.ref}`); } }); });
    decks.forEach(b=>{ const q=b.d.slides.map(s=>s.type==='close'||s.type==='timeline'?s.quote:null).filter(x=>x&&x.text&&!isVerse(x));
      counts[b.t]=Math.max(counts[b.t]||0,q.length);
      q.forEach(x=>{ const L=LIB.egw.find(e=>e[b.lang].text===x.text&&e[b.lang].ref===x.ref); if(!L) bad.push(`${b.src}/${b.lang}/${b.g}/${b.id}: ${x.ref}`); });
      if(q.length>1) bad.push('two lines: '+b.g+'/'+b.id); });
    c('at most one Ellen White line on the slides, and only a verified one (with its credit)', bad.slice(0,4), []);
    c('…the congregation closes on "Christ’s method alone…" (MH 143 / MC 102); boards, teams and the conference hear theirs in the handout', [counts.congregation,counts.board||0,counts.team||0,counts.conference||0], [1,0,0,0]);
    const cl=decks.find(b=>b.src==='own'&&b.lang==='es'&&b.g==='congregation').d.slides.find(s=>s.type==='close').quote;
    c('…in the published Spanish, with its Spanish credit', [cl.text.startsWith('Sólo el método de Cristo'),cl.ref], [true,'Elena G. de White · El Ministerio de Curación, p. 102']); }
  const placeOf=b=>{ const ps=b.d.slides.filter(s=>s.type==='place'); return b.t==='conference'?ps[ps.length-1]:ps[0]; };
  { const bad=[];
    // v10.41: a conference proposal may show its churches first (a place slide too); its "Here in" is the last place slide
    decks.forEach(b=>{ const p=placeOf(b);
      const town=b.src==='own'?'Warminster':(b.lang==='es'?'Municipio de ejemplo':'Sample town');
      if(!p){ bad.push(`${b.src}/${b.lang}/${b.g}/${b.id}: no place slide`); return; }
      if(!p.headline.startsWith((b.lang==='es'?'En ':'In ')+town+',')) bad.push(`${b.src}/${b.lang}/${b.g}/${b.id}: ${p.headline}`);
      if(b.src==='own'&&p.kicker!==(b.lang==='es'?'Aquí en ':'Here in ')+town) bad.push(`${b.g}/${b.id}: kicker ${p.kicker}`);
      if(b.d.slides.length>12) bad.push('over 12'); });
    c('"Here in {town}" in every deck, its headline naming the place ("In Warminster, …" / "En Warminster, …")', bad.slice(0,6), []); }
  { const n={board:new Set(),team:new Set(),congregation:new Set(),conference:new Set()};
    decks.forEach(b=>n[b.t].add(b.d.slides.map(s=>s.type).join(',')));
    // v10.41: the conference proposal (the pastor: "It would definitely be a different proposal"): 11 slides and the join, or
    // 12 with "the churches we serve" when Terrain holds two or more (the sample's two made-up churches)
    c('about eight content slides: board and team 8 + join, the congregation 8 + join (the verse slide among them); the conference 10–11 + join', Object.fromEntries(Object.entries(n).map(([k,v])=>[k,[...v].sort()])),
      {board:['join,motion,stat,place,capacity,ability,ask,risks,timeline'],team:['join,motion,stat,place,ability,roles,risks,timeline,yes'],congregation:['join,verse,stat,stat,place,ability,motion,yes,close'],
       conference:['join,motion,place,stat,place,capacity,ability,timeline,ask,risks,risks,close','join,motion,stat,place,capacity,ability,timeline,ask,risks,risks,close']}); }
  { const bad=[];
    decks.forEach(b=>{ const p=placeOf(b); if(!p) return;
      if(p.facts.length>2||p.partners.length>3||p.bring.length>3) bad.push('too many: '+b.g+'/'+b.id);
      if(p.facts.some(f=>String(f.label).length>105)||p.bring.some(t=>t.length>50)||p.headline.length>90||(p.where||'').length>80||p.source.length>110) bad.push(`${b.lang}/${b.g}/${b.id}: long`); });
    c('the place slide holds what one phone slide can (two figures, three names, three lines; the headline ≤ 90)', bad.slice(0,4), []); }
  { const NAMES=['Ana Lopez','Ben Carter','Cara Diaz','Dan Evans','Eve Fox','Gus Hill','Young Kid'];
    c('no member’s name on any place slide or verse', decks.filter(b=>NAMES.some(nm=>JSON.stringify(b.d).includes(nm))).map(b=>b.g+'/'+b.id).slice(0,3), []); }
  { const mono=decks.find(b=>b.src==='own'&&b.lang==='en'&&b.g==='board'&&b.id==='pathfinders').d;
    c('the board’s own verse keeps a home: Luke 14:28 counts the cost on the capacity slide', mono.slides.find(s=>s.type==='capacity').verse.ref, 'Luke 14:28 · KJV');
    c('the place slide opens with "seek the peace of the city" (Jeremiah 29:7)', mono.slides.find(s=>s.type==='place').verse.ref, 'Jeremiah 29:7 · KJV');
    c('the need slide’s verse speaks to its own figure (children: Mark 10:14)', mono.slides.find(s=>s.type==='stat').verse.ref, 'Mark 10:14 · KJV');
    const cg=decks.find(b=>b.src==='own'&&b.lang==='en'&&b.g==='congregation'&&b.id==='food-pantry').d;
    c('the congregation’s verse slide carries the lead need’s own verse (the pantry: poverty, Proverbs 31:9)', [cg.slides[1].type,cg.slides[1].ref], ['verse','Proverbs 31:9']); }

  console.log('\n-- 3. the place is honest --');
  const sampleM=(fn)=>`(()=>{ const x=caseSampleCtx(); (${fn})(x.M.tract,x.M.cousub,x.M.county,x); return x; })()`;
  { const r=JE(`(()=>{ const m=caseModel('pathfinders',{type:'board',group:'board'},{ctx:${sampleM('(t,w,k)=>{}')},now:${NOW},sample:true}); return {h:m.place.headline,facts:m.place.facts}; })()`);
    c('sample town 23% ±1.1 against the county’s 20.4% ±0.1 (significant): the headline is the town’s figure', [r.h.key,r.h.text], ['town','In Sample town, nearly 1 in 4 people is a child']); }
  { const r=JE(`(()=>{ const m=caseModel('pathfinders',{type:'board',group:'board'},{ctx:${sampleM('(t,w,k)=>{ w.kidsShare=20.6; w.moe.kidsShare=1.1; }')},now:${NOW},sample:true}); return {h:m.place.headline,s:JSON.stringify(m.place)}; })()`);
    c('the town about the same as the county (20.6% ±1.1 against 20.4%): never the town headline, never "clearly"', [r.h.key!=='town',/clearly|claramente/.test(r.s)], [true,false]); }
  { const r=JE(`(()=>{ const m=caseModel('pathfinders',{type:'congregation',group:'congregation'},{ctx:${sampleM('(t,w,k)=>{ t.moe.kidsShare=9; w.kidsShare=20.6; w.moe.kidsShare=1.1; }')},now:${NOW},sample:true}); return m.place.facts.filter(f=>f.kind==='town').map(f=>f.label); })()`);
    c('…and its town figure says so: "about the same as the county" (the tract too wide to tell from the town)', r, ['Children, share of residents in Sample town: about the same as the county.']); }
  { const r=JE(`(()=>{ const m=caseModel('pathfinders',{type:'congregation',group:'congregation'},{ctx:${sampleM('(t,w,k)=>{ w.kidsShare=20.6; w.moe.kidsShare=1.1; }')},now:${NOW},sample:true}); return {h:m.place.headline,f:m.place.facts.filter(f=>f.kind==='town').map(f=>f.label)}; })()`);
    // Updated (v10.40 review): the sample's where-to-look is 0.6 mi away, not the church's own blocks, so the headline no
    // longer says "right around our church" (it contradicted the where line and overstated a two-way test as "greatest").
    c('…while the church’s own tract clearly above its town (27.2% ±3.1 against 20.6% ±1.1) is said, and only that', [r.h.text,r.f], ['In Sample town, the need is less than a mile from our door',['Children, share of residents in Sample town. Around our church: 27%, clearly higher.']]); }
  { const r=JE(`(()=>{ const x=${sampleM('(t,w,k)=>{ w.kidsShare=20.6; w.moe.kidsShare=1.1; }')}; const zs=JSON.parse(JSON.stringify(x.place.zoneSummary)); zs.children={...zs.children,home:true,dist:0,dir:null}; x.place={...x.place,zoneSummary:zs};
      const m=caseModel('pathfinders',{type:'congregation',group:'congregation'},{ctx:x,now:${NOW},sample:true}); const e=caseModel('pathfinders',{type:'congregation',group:'congregation'},{ctx:x,now:${NOW},sample:true,lang:'es'});
      return {k:m.place.headline.key,t:m.place.headline.text,es:e.place.headline.text,w:m.place.where&&m.place.where.text}; })()`);
    c('…and when where-to-look is the church’s own blocks, the comparative headline (never "greatest")', [r.k,r.t,r.es,r.w], ['conc','In Sample town, the need runs higher right around our church','En Sample town, la necesidad es más alta justo alrededor de nuestra iglesia','Families with children: look first right around our church']); }
  { const r=JE(`(()=>{ const x=${sampleM('(t,w,k)=>{ w.kidsShare=20.6; w.moe.kidsShare=1.1; }')}; const out=[];
      for(const lang of ['en','es']) for(const g of [['board','board'],['team','youth'],['congregation','congregation']]){ const m=caseModel('pathfinders',{type:g[0],group:g[1]},{ctx:x,now:${NOW},sample:true,lang});
        out.push([m.place.headline.key,!!(m.place.where&&!m.place.where.home)]); }
      return out; })()`);
    c('a significant tract-over-town test with where-to-look elsewhere: the headline is never "conc" (every audience, EN and ES)', r.every(([k,away])=>!(k==='conc'&&away)), true); }
  { const r=JE(`(()=>{ const m=caseModel('pathfinders',{type:'congregation',group:'congregation'},{ctx:${sampleM('(t,w,k)=>{ w.kidsShare=22; w.moe.kidsShare=0.5; k.kidsShare=18; }')},now:${NOW},sample:true}); return {h:m.place.headline.key,f:m.place.facts.filter(f=>f.kind==='town').map(f=>f.label)}; })()`);
    c('the church’s own tract clearly above its town (27.2% ±3.1 against 22% ±0.5): "Around our church: 27%, clearly higher"', r.h==='town'||r.f.some(l=>/Around our church: 27%, clearly higher\./.test(l)), true); }
  { const r=JE(`(()=>{ const m=caseModel('pathfinders',{type:'congregation',group:'congregation'},{ctx:${sampleM('(t,w,k)=>{ t.moe.kidsShare=9; w.kidsShare=20.6; w.moe.kidsShare=1.1; }')},now:${NOW},sample:true}); return JSON.stringify(m.place); })()`);
    c('…never when the tract’s margin is too wide to tell (±9)', /Around our church: [\d.]+%, clearly higher/.test(r), false); }
  { const r=JE(`(()=>{ const x=${sampleM('(t,w,k)=>{}')}; x.place={...x.place,help:[],zoneSummary:{}}; const m=caseModel('food-pantry',{type:'board',group:'board'},{ctx:x,now:${NOW},sample:true}); const d=caseDeck(m); return {w:m.place.where,p:m.place.partners,h:m.place.headline.key,s:d.slides.find(s=>s.type==='place')}; })()`);
    c('no ZONES and no HELP: no "where", nobody named as serving, no headline that needs them', [r.w,r.p,['door','near','along'].includes(r.h),r.s&&r.s.where,r.s&&r.s.partners], [null,[],false,'',[]]); }
  { const r=JE(`(()=>{ const x=${sampleM('(t,w,k)=>{}')}; const m=caseModel('food-pantry',{type:'board',group:'board'},{ctx:x,now:${NOW},sample:true}); const d=caseDeck(m); const p=d.slides.find(s=>s.type==='place');
      return {partners:m.place.partners.map(q=>[q.name,q.distText]),where:m.place.where&&m.place.where.text,slide:p}; })()`);
    c('the food pantry’s sample: the made-up pantry and soup kitchen already serving nearby, with distances', r.partners, [['Sample Community Food Pantry','0.8 mi'],['Sample Soup Kitchen','2.7 mi']]);
    c('…where to look first, as a direction and a distance only (never a figure)', [r.where,/\d+%/.test(r.where||'')], ['Neighbours facing hardship: look first 0.4 mi west of our church',false]);
    c('…"we come alongside": partners on the slide are never called ours', /our partners|nuestros socios/i.test(JSON.stringify(r.slide)), false); }
  // the pastor's own survey: HELP and ZONES loaded for his church's coordinates, and a stale load
  { own();
    E(`DATA.geo=Object.assign({},DATA.geo,{coords:{x:-75.1,y:40.2}});
      HELP=[{cat:'food',name:'Warminster Community Food Bank',lat:40.205,lon:-75.09,dist:0.6,addr:'',phone:''},{cat:'recovery',name:'Hope Recovery House',lat:40.21,lon:-75.1,dist:0.7,addr:'',phone:''}];
      HELP_STATE='ready'; HELP_AT={lat:40.2,lon:-75.1};
      ZONES={church:{lat:40.2,lon:-75.1},radius:1.8,scored:[{geoid:'1',name:'2041.02',home:true,lat:40.2,lon:-75.1,dist:0,m:{poverty:19,kidsShare:27,seniorsAlone:9,limEng:11,foreign:21},need:30,density:5000},
        {geoid:'2',name:'2042.01',home:false,lat:40.21,lon:-75.088,dist:0.9,m:{poverty:34,kidsShare:24,seniorsAlone:8,limEng:4,foreign:9},need:60,density:4000},
        {geoid:'3',name:'2050',home:false,lat:40.1,lon:-75.3,dist:9,m:{poverty:60,kidsShare:40,seniorsAlone:30,limEng:30,foreign:40},need:99,density:9000}]}; ZONES_STATE='ready';`);
    const r=JE(`(()=>{ const m=caseModel('food-pantry',{type:'board',group:'board'},{now:${NOW}}); const d=caseDeck(m); return {snap:!!casePlaceSnap().help,where:m.place.where&&m.place.where.text,partners:m.place.partners.map(p=>p.name),head:m.place.headline.text,slide:d.slides.find(s=>s.type==='place')}; })()`);
    c('his own survey with HELP and ZONES for his church: where to look first (a block within 2 mi, never the one 9 mi away)', r.where, 'Neighbours facing hardship: look first 0.9 mi north-east of our church');
    c('…a food pantry is told who already serves food nearby (not the recovery house)', r.partners, ['Warminster Community Food Bank']);
    c('…the headline names the place and what is near', r.head, 'In Warminster, the need is less than a mile from our door');
    c('…the board sees the partners beside a figure', [r.slide.partners.map(p=>[p.name,p.kind,p.dist]),r.slide.facts.length], [[['Warminster Community Food Bank','Food bank or pantry','0.6 mi']],1]);
    E(`HELP_AT={lat:39.9,lon:-75.2}; ZONES.church={lat:39.9,lon:-75.2};`);
    const s=JE(`(()=>{ const x=casePlaceSnap(); const m=caseModel('food-pantry',{type:'board',group:'board'},{now:${NOW}}); return {help:x.help,zones:x.zones,where:m.place.where,partners:m.place.partners}; })()`);
    c('stale guard: HELP and ZONES fetched for another church’s coordinates are never taken', [s.help,s.zones,s.where,s.partners], [null,null,null,[]]);
    E(`HELP_AT={lat:40.2,lon:-75.1}; ZONES.church={lat:40.2,lon:-75.1}; HELP_STATE='loading';`);
    c('…nor HELP still loading', JE('casePlaceSnap().help'), null);
    E(`HELP=null; HELP_STATE='idle'; HELP_AT=null; ZONES=null; ZONES_STATE='idle';`); own(); }
  { const r=JE(`(()=>{ const out={}; for(const [t,g] of [['board','board'],['team','youth']]){ const m=caseModel('pathfinders',{type:t,group:g},{now:${NOW}}); m.place={ok:false}; const d=caseDeck(m); const s=d.slides[3];
      out[t]={type:s.type,n:(s.items||[]).length,v:s.verse?s.verse.ref:null}; } return out; })()`);
    c('no place data at all: the "why here" cards come back (board), the design cards (team), each with a short verse', [r.board.type,r.board.n,!!r.board.v,r.team.type,r.team.n,!!r.team.v], ['trio',3,true,'trio',3,true]); }

  { const r=await E(`(async()=>{ HELP_STATE='idle'; ZONES_STATE='idle'; const a=await casePlaceWait(300);
      HELP_STATE='loading'; setTimeout(()=>{ HELP_STATE='ready'; },120); const t0=Date.now(); const b=await casePlaceWait(2000); const tb=Date.now()-t0;
      HELP_STATE='loading'; const t1=Date.now(); const c2=await casePlaceWait(300); const tc=Date.now()-t1; HELP_STATE='idle';
      return JSON.stringify([a,b,tb<1000,c2,tc>=250&&tc<1000]); })()`);
    c('Present / Share / the handout wait for the places at most a few seconds: at once when nothing loads, until they arrive, never longer than asked', JSON.parse(r), [false,true,true,false,true]); }

  console.log('\n-- 4. the renderer --');
  const host=()=>{ const h=w.document.createElement('div'); w.document.body.appendChild(h); return h; };
  const txt=el=>el?el.textContent.replace(/ /g,' '):null;
  { const d=JE(`caseDeck(caseModel('food-pantry',{type:'board',group:'board'},{ctx:caseSampleCtx(),now:${NOW},sample:true}))`);
    const h=host(); const ctl=w.tdeckRender(d,h,{mode:'browse',keys:false});
    const secs=[...h.querySelectorAll('section.td-slide')], p=secs[d.slides.findIndex(s=>s.type==='place')];
    c('the place slide is drawn as its type', !!p&&p.classList.contains('td-t-place'), true);
    c('…with the figure, and who already serves nearby (name, kind, distance) under "Already serving here"', [p.querySelectorAll('.td-pfacts .td-tcard').length,txt(p.querySelector('.td-plh')),[...p.querySelectorAll('.td-prow')].map(r=>txt(r.querySelector('.td-pn'))+' | '+txt(r.querySelector('.td-pd')))],
      [1,'Already serving here · we come alongside',['Sample Community Food Pantry | 0.8 mi']]);
    const mains=secs.filter((s,i)=>d.slides[i].type!=='join'&&d.slides[i].type!=='close');
    c('every content slide has one verse foot, between the body and the source', mains.every(s=>{ const m=s.querySelector('.td-main'), k=[...m.children].map(e=>e.className.split(' ')[0]); const f=k.indexOf('td-vfoot'); return f===k.indexOf('td-body')+1&&(k.indexOf('td-src')<0||k.indexOf('td-src')===f+1)&&s.querySelectorAll('.td-vfoot').length===1; }), true);
    c('…its words and its reference ("Jeremiah 29:7 · KJV")', [txt(p.querySelector('.td-vft')).startsWith('And seek the peace of the city'),txt(p.querySelector('.td-vfr'))], [true,'Jeremiah 29:7 · KJV']);
    c('join and close never carry a foot', secs.filter((s,i)=>['join','close'].includes(d.slides[i].type)&&s.querySelector('.td-vfoot')).length, 0);
    ctl.destroy(); }
  { const old={lang:'en',slides:[{type:'ask',kicker:'The ask',headline:'Exactly what we are asking the board for',rows:[['People','5 volunteers']],verse:{text:'For which of you, intending to build a tower, sitteth not down first, and counteth the cost, whether he have sufficient to finish it?',ref:'Luke 14:28 · KJV'}},
      {type:'timeline',kicker:'First step',headline:'6 weeks',steps:[{date:'a',title:'b',text:'c'},{date:'a',title:'b',text:'c'},{date:'a',title:'b',text:'c'}],quote:{text:'Nehemiah asked the people directly…',ref:'Ellen G. White · Prophets and Kings, p. 638'}},
      {type:'place',kicker:'Here in Warminster',headline:'In Warminster, God has placed us among these neighbours',where:'Families with children: look first 0.6 mi north-east of our church',bring:['9 members whose gifts fit this work']}]};
    const h=host(); w.tdeckRender(old,h,{keys:false}); const S=[...h.querySelectorAll('section')];
    c('a v10.39 deck on a phone: the ask’s verse drawn in the foot (not in the body), the timeline’s Ellen White line as before', [!!S[0].querySelector('.td-vfoot'),!!S[0].querySelector('.td-body .td-quote'),txt(S[0].querySelector('.td-vfr')),!!S[1].querySelector('.td-body .td-egw'),!!S[1].querySelector('.td-vfoot')], [true,false,'Luke 14:28 · KJV',true,false]);
    c('a place slide with only "where" and what we bring: those two, nothing padded', [txt(S[2].querySelector('.td-where')),S[2].querySelectorAll('.td-tcard').length,S[2].querySelectorAll('.td-prow').length,[...S[2].querySelectorAll('.td-brow')].map(txt)], ['Families with children: look first 0.6 mi north-east of our church',0,0,['9 members whose gifts fit this work']]); }
  { const V={text:'Prove all things; hold fast that which is good.',ref:'1 Thessalonians 5:21 · KJV'};
    const cap={type:'capacity',headline:'c',rows:[],gaps:['a','b','c','d']}, ab={type:'ability',value:'9',gifts:['Teaching','Helps','Mercy','Service']}, ro={type:'roles',headline:'r',roles:Array(4).fill({title:'t',hours:'1 h',text:'x'})};
    const h=host(); w.tdeckRender({slides:[cap,{...cap,verse:V},ab,{...ab,verse:V},ro,{...ro,verse:V}]},h,{keys:false}); const S=[...h.querySelectorAll('section')];
    c('beside a verse a slide lists less (the deck keeps all for the handout): gaps 3 → 2, gift names 8 → 2, roles 4 → 3',
      [S[0].querySelectorAll('.td-note.warn span').length,S[1].querySelectorAll('.td-note.warn span').length,S[2].querySelectorAll('.td-chip').length,S[3].querySelectorAll('.td-chip').length,S[4].querySelectorAll('.td-role').length,S[5].querySelectorAll('.td-role').length], [3,2,4,2,4,3]); }
  { const d=JE(`caseDeck(caseModel('food-pantry',{type:'congregation',group:'congregation'},{now:${NOW},respond:true}))`), yi=d.slides.findIndex(s=>s.type==='yes');
    const h=host(); w.tdeckRender(d,h,{mode:'follow',presenter:yi,keys:false,onRespond:()=>new Promise(()=>{})}); const sec=h.querySelectorAll('section')[yi];
    const before=!!sec.querySelector('.td-vfoot')&&!sec.querySelector('.td-answering'); sec.querySelector('button.td-opt').click();
    c('a member answering "I’m in": the form takes the verse’s place at the foot', [before,sec.querySelector('.td-main').classList.contains('td-answering')], [true,true]); }

  console.log('\n-- 5. the sample, made up and marked --');
  for(const lang of ['en','es']){
    const s=JE(`(()=>{ const keep=DATA; DATA=null; try{ return caseSample({lang:'${lang}',ministry:'food-pantry',audience:{type:'board',group:'board'},now:${NOW}}).deck; }finally{ DATA=keep; } })()`);
    const p=s.slides.find(x=>x.type==='place');
    c(`${lang} sample: SAMPLE on the place slide, made-up names, a source that says the places are made up`,
      [/^(SAMPLE|MUESTRA)( · |$)/.test(p.kicker),p.partners.every(q=>lang==='es'?/de ejemplo/.test(q.name):/^Sample /.test(q.name)),p.source],
      [true,true,lang==='es'?'Cifras y lugares de ejemplo inventados':'Made-up sample figures and places']);
    c(`${lang} sample: every slide still marked`, s.slides.every(x=>/^(SAMPLE|MUESTRA)( · |$)/.test(x.type==='join'?x.note:x.type==='verse'?x.ref:x.type==='close'?x.text:x.kicker)), true);
  }
  c('no errors', errs, []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
