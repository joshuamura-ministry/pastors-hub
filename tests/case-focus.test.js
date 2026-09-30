/* v10.42 part 3 — the focus (NARRATIVE.md §12.1, DESIGN.md §11.1). The pastor on v10.41: "What does that have to do with… a prayer
 * calendar? It's detached… everything should tie into that, not random analytics… a focus, a beginning and an appeal at the end…
 * what the leader or the pastor would like to see accomplished."
 *
 *  T1  the complaint: the town prayer calendar says nothing of older neighbours, poverty or living alone, shows no figure, carries no
 *      Psalm 68:6 or James 1:27, has How it works with its own four steps, and opens with the suggested goal
 *  T2  purposes: every built-in's is CASE_PURPOSE_BUILTIN's; every library theme has one
 *  T3  figures: every figure a deck shows is one its purpose allows; no design fact anywhere
 *  T4  where and partners: a view and partner kinds of the purpose only
 *  T5  "Here in" only for need, place and field purposes (and partners); devotional, generic, workers and family decks show no figure
 *  T6  verses: the tags are the theme's, the allowed needs', the group's and general; EN and ES the same verses
 *  T7  the arc: the order of each kind, one How it works (the idea's own steps), one timing slide (none for the whole church), the same
 *      goal on the opening and the appeal, ≤ 12 slides and ≤ 64 KB
 *  T8  the goal: a suggestion for every built-in (≤ 200, a sentence); the store (per language, the suggestion deletes, the key, X5);
 *      a goal he types changes the opening and the appeal and not the verses; Clear all clears it; the sample saves nothing
 *  T10 the handout: the goal, How it works (the deck's steps), the appeal; figures only those the deck shows
 *  T12 edits: the slots of the new parts; the one-time move of the congregation's and the conference's words
 *  and: the goal box is #cs-goal in step 3 (not in step 2); X10 the close after the board's own "Approved"; the finance appeal by
 *  path (N4); X15 the pantry in the average church.
 *  T11 (present-1.4) is B2's (tests/present-pdf.test.mjs); T13 is the relevance audit (probe/audit.cjs, run on the build).
 */
const fs=require('fs'), path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,700));console.log('    want:',JSON.stringify(e).slice(0,400));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=15000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor'};
const NOW=Date.UTC(2026,8,28,15);

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
  return {w,errs,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),q:s=>w.document.querySelector(s)};
}
const strs=v=>typeof v==='string'?[v]:Array.isArray(v)?v.flatMap(strs):v&&typeof v==='object'?Object.values(v).flatMap(strs):[];

(async()=>{
  const P=page(); await until(()=>P.E('typeof caseModel==="function"&&typeof uCatalog==="function"'));
  c('no boot errors', P.errs, []);
  // the fixtures' survey with margins; D's average church (the demo church, the pastor's Q3); who already serves near the church
  const D=JSON.parse(JSON.stringify(FX.DATA)); D.M.tract.moe=P.J('CASE_SAMPLE.M.tract.moe'); D.M.county.moe=P.J('CASE_SAMPLE.M.county.moe');
  P.E(`DATA=${JSON.stringify(D)}; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; capSave(JSON.parse(JSON.stringify(DEMO_CHURCH))); uPersist(); U_PEOPLE_CACHE=null;
    DATA.geo=Object.assign({},DATA.geo,{coords:{x:-75.08812,y:40.20684}});
    HELP=[{cat:'food',name:'Warminster Community Food Bank',lat:40.2101,lon:-75.0852,dist:0.3},{cat:'seniors',name:'Warminster Senior Center',lat:40.205,lon:-75.09,dist:0.4},
      {cat:'library',name:'Warminster Free Library',lat:40.21,lon:-75.08,dist:0.5},{cat:'health',name:'Bucks Community Health Center',lat:40.2,lon:-75.1,dist:0.7},
      {cat:'family',name:'Warminster Community Center',lat:40.2,lon:-75.07,dist:0.6},{cat:'recovery',name:'New Hope Recovery House',lat:40.19,lon:-75.09,dist:0.9},
      {cat:'youth',name:'Warminster Youth Club',lat:40.21,lon:-75.1,dist:0.8},{cat:'language',name:'Newcomers Help Desk',lat:40.22,lon:-75.09,dist:1.1}];
    HELP_STATE='ready'; HELP_AT={lat:40.20684,lon:-75.08812};`);
  P.E(`window.__libDone=false; (async()=>{ await libLoadIndex(); await Promise.all(LIB.idx.themes.map(t=>libLoadTheme(t.id))); window.__libDone=true; })();`);
  await until(()=>P.E('window.__libDone'),60000);

  console.log('\n-- T1: the complaint (the town prayer calendar) --');
  { const ID='prayer-town-prayer-calendar';
    const r=P.J(`(()=>{ const ch=uChurch(), keep=ch.lib; const raw=libFull(${JSON.stringify(ID)}); ch.lib={[raw.id]:raw}; const x=caseItemOf(raw.id); const out=[];
      for(const lang of ['en','es']) for(const [t,g] of [['team','prayer'],['board','board'],['congregation','congregation']]){
        const m=caseModel(raw.id,{type:t,group:g},{lang,now:${NOW}}); const d=caseDeck(m); const H=caseHandout(m,d,{now:${NOW}});
        const how=d.slides.find(s=>s.type==='how');
        out.push({lang,g,ok:m.ok,purpose:m.purpose.id,text:JSON.stringify(d.slides)+JSON.stringify(H),types:d.slides.map(s=>s.type),
          refs:d.slides.map(s=>(s.verse&&s.verse.ref)||(s.quote&&s.quote.ref)||(s.type==='verse'?s.ref:'')).filter(Boolean),
          how:how?how.steps:null,own:(lang==='es'?x.howEs:x.how)||x.how,goal:d.slides[1].goal,sug:caseGoalSuggest(x,lang)}); }
      ch.lib=keep; return out; })()`);
    c('six decks built (EN and ES × the prayer ministry, the church board, the whole church)', r.map(x=>x.ok), r.map(()=>true));
    c('its purpose is devotion (prayer)', [...new Set(r.map(x=>x.purpose))], ['devotion']);
    c('no older neighbours, living alone, poverty, "same person on the same day", "nothing to prove" anywhere in the slides or the handout',
      r.filter(x=>/older neighbours|living alone|poverty|same person on the same day|nothing to prove|mayores que viven solos|pobreza/i.test(x.text)).map(x=>x.lang+'/'+x.g), []);
    c('no place, stat or trio slide', r.filter(x=>x.types.some(t=>['place','stat','trio'].includes(t))).map(x=>x.lang+'/'+x.g), []);
    c('no Psalm 68:6 or James 1:27', r.filter(x=>x.refs.some(v=>/^(Psalm|Salmos) 68:6|^(James|Santiago) 1:27/.test(v))).map(x=>x.lang+'/'+x.g), []);
    c('How it works: the idea’s own four steps, in the deck’s language', r.map(x=>JSON.stringify(x.how)===JSON.stringify((x.own||[]).slice(0,6))&&x.how.length===4), r.map(()=>true));
    c('the opening’s goal is the suggestion (the idea named, then what it is for)', r.map(x=>x.goal===x.sug&&/^A free wall calendar|^Un calendario/.test(x.goal)), r.map(()=>true)); }

  console.log('\n-- T2: purposes --');
  { const r=P.J(`(()=>{ const bad=[]; SIGNATURE.forEach(x=>{ const p=casePurposeOf(x,{type:'board',group:'board',reach:caseReachOf(x)}).id; if(p!==CASE_PURPOSE_BUILTIN[x.id]) bad.push([x.id,p,CASE_PURPOSE_BUILTIN[x.id]]); });
      const keys=Object.keys(CASE_PURPOSE_BUILTIN); return {bad,missing:SIGNATURE.filter(x=>!keys.includes(x.id)).map(x=>x.id),extra:keys.filter(k=>!SIGNATURE.some(x=>x.id===k)),
        themes:LIB.idx.themes.map(t=>t.id).filter(t=>!CASE_THEME_PURPOSE[t]),unknown:LIB.rows.filter(r=>{ const x=caseItemOf(r.id)||libToCatalog(libFull(r.id)); return !CASE_PURPOSES[casePurposeOf(x,{type:'board',group:'board',reach:libReach(r)}).id]; }).map(r=>r.id).slice(0,5)}; })()`);
    c('every built-in’s purpose is CASE_PURPOSE_BUILTIN’s', r.bad.slice(0,5), []);
    c('…each of the 103 listed exactly once, nothing else listed', [r.missing,r.extra], [[],[]]);
    c('every library theme has a purpose (CASE_THEME_PURPOSE)', r.themes, []);
    c('every library idea’s purpose is one of CASE_PURPOSES', r.unknown, []); }

  console.log('\n-- T3–T6: the relevance rule, deck by deck --');
  // every built-in × the board, its team group, the whole church (and the conference for field purposes), EN; ES for every 5th; every 40th library idea
  const R=P.J(`(()=>{ const out=[]; const ch=uChurch(), keep=ch.lib;
    const ids=[...SIGNATURE.map(x=>[x.id,false]),...LIB.rows.filter((r,i)=>i%40===0).map(r=>[r.id,true])];
    ids.forEach(([id,lib],k)=>{ if(lib){ const raw=libFull(id); ch.lib={[raw.id]:raw}; } else ch.lib=keep;
      const x=caseItemOf(id); if(!x) return;
      const groups=[['board','board'],['team','community'],['congregation','congregation']];
      const P0=casePurposeOf(x,{type:'board',group:'board',reach:caseReachOf(x)}); if(P0.id==='field') groups.push(['conference','conference']);
      for(const lang of (k%5===0?['en','es']:['en'])) for(const [t,g] of groups){
        const m=caseModel(id,{type:t,group:g},{lang,now:${NOW}}); if(!m.ok) continue; const d=caseDeck(m); const H=caseHandout(m,d,{now:${NOW}});
        const pl=d.slides.find(s=>s.type==='place'&&!/Our church family|Nuestra familia de la iglesia|churches we serve|iglesias a las que servimos/i.test(s.kicker||''));
        const figs=[]; if(d.slides.some(s=>s.type==='stat'&&!s.part)&&m.need.hero) figs.push(m.need.hero.key);
        if(d.slides.some(s=>s.type==='trio')) m.need.trio.forEach(f=>figs.push(f.key));
        if(pl&&m.place&&m.place.ok) (m.place.facts||[]).forEach(f=>figs.push(f.fig||f.key));
        out.push({id,lib,lang,g,t,purpose:m.purpose.id,place:m.purpose.place,allowed:m.purpose.allowed,views:m.purpose.views,partners:m.purpose.partners,
          figs,design:(m.place&&m.place.facts||[]).some(f=>f.kind==='design'),where:pl&&pl.where?(m.place.where&&m.place.where.view):null,
          cats:pl?(m.place.partners||[]).filter(q=>pl.partners.some(z=>z.name===q.name)).map(q=>q.cat):[],hasPlace:!!pl,
          census:/\\d\\s?%|\\b1 in \\d|\\bcensus\\b|\\bcenso\\b|1 de cada/i.test(strs(d.slides).join(' ')+' '+strs(H.figures||[]).join(' ')),
          anyFig:d.slides.some(s=>['stat','trio'].includes(s.type))||!!pl,
          tags:caseVerseTags(m),theme:m.ministry.libTheme||m.ministry.theme,needs:[m.need&&m.need.lead,...(m.ministry.needs||[])].filter(Boolean),group:g,
          verses:d.slides.map(s=>{ const v=s.type==='verse'?(s.text?{ref:s.ref}:null):(s.verse||(s.type==='close'&&s.quote&&/·\\s*(KJV|RVA)$/.test(s.quote.ref)?s.quote:null)); return v?String(v.ref).replace(/ · (KJV|RVA)$/,''):null; })}); } });
    ch.lib=keep; return out;
    function strs(v){ return typeof v==='string'?[v]:Array.isArray(v)?v.flatMap(strs):v&&typeof v==='object'?Object.values(v).flatMap(strs):[]; } })()`);
  console.log(`    (${R.length} decks)`);
  c('T3: every figure a deck shows is one its purpose allows', R.filter(b=>b.figs.some(k=>!b.allowed.includes(String(k).replace(/^(town|near):/,'')))).map(b=>`${b.lang}/${b.g}/${b.id}: ${b.figs.join(',')}`).slice(0,5), []);
  c('…and no design fact anywhere', R.filter(b=>b.design).map(b=>b.g+'/'+b.id).slice(0,5), []);
  c('T4: a place slide says where to look only for a view its purpose has', R.filter(b=>b.where&&!b.views.includes(b.where)).map(b=>`${b.g}/${b.id}: ${b.where}`).slice(0,5), []);
  c('…and names partners of its purpose’s kinds only', R.filter(b=>b.cats.some(k=>!b.partners.includes(k))).map(b=>`${b.g}/${b.id}: ${b.cats.join(',')}`).slice(0,5), []);
  c('T5: "Here in" only for need, place, field and partner purposes', R.filter(b=>b.hasPlace&&!['need','place','field','partners'].includes(b.place)).map(b=>`${b.g}/${b.id}: ${b.purpose}/${b.place}`).slice(0,5), []);
  // relevance.json (the data the audit checks) lets a workers idea lead with its occupation figure (purposes.workers: occ*, why "stat"), so
  // the quiet purposes are devotion, generic and family (and workers have no "Here in": above)
  const QUIET=['devotion','generic','family'];
  c('…devotional, generic and family decks: no figure slide, and no %, "1 in N" or Census in the slides or the handout’s figures', R.filter(b=>QUIET.includes(b.purpose)&&(b.anyFig||b.census)).map(b=>`${b.lang}/${b.g}/${b.id}`).slice(0,5), []);
  { const bad=P.J(`(()=>{ const bad=[]; ${JSON.stringify(R.map(b=>({id:b.id,lib:b.lib,g:b.g,tags:b.tags,theme:b.theme,needs:b.needs,allowed:b.allowed})))}.forEach(b=>{
      const ok=new Set(['general',...(b.theme?['lib:'+b.theme]:[]),...(CASE_GROUP_TAG[b.g]||[])]);
      (b.needs||[]).forEach(id=>{ if(b.allowed.includes(caseFigKey(id))) (CASE_NEED_TAG[id]||[]).forEach(t=>ok.add(t)); });
      b.tags.forEach(t=>{ if(!ok.has(t)) bad.push(b.g+'/'+b.id+': '+t); }); }); return bad.slice(0,5); })()`);
    c('T6: the verse tags are the theme’s, the allowed needs’, the group’s and general', bad, []); }
  { const bad=[]; R.filter(b=>b.lang==='es').forEach(b=>{ const en=R.find(x=>x.lang==='en'&&x.id===b.id&&x.g===b.g); if(!en) return;
      const ids=v=>P.J(`${JSON.stringify(v)}.map(r=>{ if(!r) return null; const x=CASE_VERSES.find(z=>z.en.ref===r||z.es.ref===r); return x?x.id:r; })`);
      if(JSON.stringify(ids(en.verses))!==JSON.stringify(ids(b.verses))) bad.push(b.g+'/'+b.id); });
    c('…an English and a Spanish deck carry the same verses, slide for slide', bad.slice(0,5), []); }

  console.log('\n-- T7: the arc --');
  { const ARC={board:/^join,motion,(ask,)?(stat,|verse,|place,)?(place,|trio,)?(how,)?capacity,(ability,)?risks,(timeline|ask),(ask,)?close$/,
      team:/^join,motion,(stat,|verse,|place,)?(place,)?(how,)?(ability,)?roles,risks,(timeline|ask),yes$/,
      congregation:/^join,motion,(verse,)?(place,)?(stat,)?(place,)?(how,)?(ability,)?yes,close$/,
      conference:/^join,motion,risks,(place,)?(how,)?capacity,ability,timeline,ask,risks,close$/};
    const D2=P.J(`(()=>{ const out=[]; for(const x of SIGNATURE) for(const [t,g] of [['board','board'],['board','finance'],['team','community'],['congregation','congregation']]) for(const opt of [{},{timing:'options'}]){
      const m=caseModel(x.id,{type:t,group:g},{lang:'en',now:${NOW},...opt}); if(!m.ok) continue; const d=caseDeck(m); const hw=caseHowOf(x,'en');
      out.push({id:x.id,t,g,types:d.slides.map(s=>s.type).join(','),parts:d.slides.map(s=>s.part||s.type),n:d.slides.length,size:JSON.stringify(d).length,
        how:d.slides.filter(s=>s.type==='how').map(s=>s.steps),own:hw?hw.steps:null,
        timing:d.slides.filter(s=>s.type==='timeline'||s.part==='decide'||s.part==='agreed').length,
        goals:d.slides.filter(s=>['motion','yes','close'].includes(s.type)&&s.goal!=null).map(s=>s.goal),goal:m.goal.text}); } return out; })()`);
    c(`every built-in × board, finance, team, the whole church (fixed and options): the order of its kind (${D2.length} decks)`, D2.filter(b=>!ARC[b.t].test(b.types)).map(b=>`${b.g}/${b.id}: ${b.types}`).slice(0,4), []);
    c('…exactly one How it works, its steps the idea’s own (2–6)', D2.filter(b=>b.own?(b.how.length!==1||JSON.stringify(b.how[0])!==JSON.stringify(b.own)):b.how.length!==0).map(b=>b.g+'/'+b.id).slice(0,4), []);
    c('…exactly one timing slide for a board or a team, none for the whole church (X3)', D2.filter(b=>b.timing!==(b.t==='congregation'?0:1)).map(b=>`${b.g}/${b.id}: ${b.timing}`).slice(0,4), []);
    c('…the opening and the appeal carry the same goal, his (or the suggestion)', D2.filter(b=>b.goals.length<2||b.goals.some(g=>g!==b.goal)).map(b=>b.g+'/'+b.id).slice(0,4), []);
    c('…at most 12 slides and 64 KB (present.mjs)', D2.filter(b=>b.n>12||b.size>64*1024).map(b=>b.g+'/'+b.id), []);
    c('…the finance committee hears the cost right after the opening (X12)', D2.filter(b=>b.g==='finance'&&b.parts[2]!=='ask').map(b=>b.id).slice(0,4), []); }

  console.log('\n-- T8: the goal --');
  { const s=P.J(`(()=>{ const out=[]; for(const x of SIGNATURE) for(const l of ['en','es']){ const t=caseGoalSuggest(x,l); if(!t||t.length>200||!/[.!?]$/.test(t)||/[{}]/.test(t)) out.push([x.id,l,t]); } return out; })()`);
    c('every built-in has a suggestion in both languages: one sentence, 200 characters at most, nothing unfilled', s.slice(0,4), []);
    const ES=P.J(`caseGoalSuggest(caseItemOf('food-pantry'),'es')`);
    c('…in Spanish, the idea named, then "para que" and the subjunctive', /, para que .+ (coman|sean|tengan|encuentren|reciban|puedan|conozcan|estén|se sientan|vivan|sepan|lleguen|crezcan|aprendan)\b/.test(ES), true);
    const st=P.J(`(()=>{ const x=caseItemOf('food-pantry'), K={ministry:'food-pantry',type:'board',group:'board'}; const o={};
      o.key=caseGoalKey(K); caseGoalSet(K,'en','Neighbours eat well, with dignity.',x);
      o.en=caseGoalOf(K,x,'en'); o.es=caseGoalOf(K,x,'es');
      o.team=caseGoalOf({ministry:'food-pantry',type:'team',group:'community'},x,'en');   // X5: the same ministry, another group
      caseGoalSet(K,'en',caseGoalSuggest(x,'en'),x); o.after=caseGoalOf(K,x,'en'); o.store=JSON.stringify(uChurch().caseGoals||{});
      return o; })()`);
    c('the key is ministry|type|group', st.key, 'food-pantry|board|board');
    c('saving English leaves Spanish the suggestion', [st.en.text,st.en.from,st.es.from], ['Neighbours eat well, with dignity.','own','suggestion']);
    c('…another group of the same ministry reads his words (X5)', [st.team.text,st.team.from], ['Neighbours eat well, with dignity.','ministry']);
    c('…saving the suggestion deletes his words (and the empty record)', [st.after.from,st.store], ['suggestion','{}']);
    // a goal he types changes the opening and the appeal (and what fits beside it there), never the verses or any other slide
    const diff=P.J(`(()=>{ const out=[]; for(const id of ['food-pantry','pathfinders','grief','welcome-table','sg-homes','bp-clinic','community-dinner','vbs']) for(const [t,g] of [['board','board'],['team','community'],['congregation','congregation']]) for(const lang of ['en','es']){
        const a=caseDeck(caseModel(id,{type:t,group:g},{lang,now:${NOW}})), b=caseDeck(caseModel(id,{type:t,group:g},{lang,now:${NOW},goal:lang==='es'?'Que ningún vecino pase hambre y que cada uno sea tratado con dignidad y cariño en esta iglesia, cada semana del año, con alimentos buenos y una oración sincera.':'That no neighbour goes hungry, and every one is treated with dignity and kindness in this church, every week of the year, with good food and a sincere prayer.'}));
        const v=d=>d.slides.map(s=>(s.verse&&s.verse.ref)||(s.quote&&s.quote.ref)||(s.type==='verse'?s.ref:'')||'');
        const other=a.slides.map((s,i)=>['motion','yes','close'].includes(s.type)?null:JSON.stringify(s)!==JSON.stringify(b.slides[i])?s.type:null).filter(Boolean);
        if(JSON.stringify(v(a))!==JSON.stringify(v(b))||other.length||a.slides.length!==b.slides.length) out.push([id,g,lang,other]); } return out; })()`);
    c('a goal he types changes the opening and the appeal only: every other slide and every verse the same (48 decks)', diff.slice(0,4), []);
    const cl=P.J(`(()=>{ const K={ministry:'food-pantry',type:'board',group:'board'}; caseGoalSet(K,'en','Neighbours eat well.',caseItemOf('food-pantry')); const before=Object.keys(uChurch().caseGoals||{}).length;
      capClearAll(); return [before,Object.keys(uChurch().caseGoals||{}).length]; })()`);
    c('Clear all clears his goals (X16)', cl, [1,0]);
    P.E(`CAP=null; capSave(JSON.parse(JSON.stringify(DEMO_CHURCH))); uPersist(); U_PEOPLE_CACHE=null;`);
    const w=P.J(`(()=>{ let n=0; const ls=Storage.prototype.setItem; Storage.prototype.setItem=function(){ n++; return ls.apply(this,arguments); }; try{ caseSample({now:${NOW}}); caseSample({now:${NOW},lang:'es',audience:{type:'board',group:'board'}}); } finally{ Storage.prototype.setItem=ls; } return n; })()`);
    c('the sample saves nothing (no goal, no record)', w, 0); }

  console.log('\n-- T10: the handout --');
  { const H=P.J(`(()=>{ const out=[]; for(const id of ['food-pantry','pathfinders','grief']) for(const [t,g] of [['board','board'],['team','community'],['congregation','congregation']]){
      const m=caseModel(id,{type:t,group:g},{now:${NOW}}); const d=caseDeck(m); const H=caseHandout(m,d,{now:${NOW}}); const how=d.slides.find(s=>s.type==='how');
      out.push({id,g,goal:H.goal&&(H.goal.text||H.goal),how:H.how&&(H.how.steps||H.how),dhow:how?how.steps:null,appeal:!!H.appeal,place:!!H.place,dplace:d.slides.some(s=>s.type==='place'&&/Here in/.test(s.kicker||'')),
        figs:(H.figures||[]).map(f=>f.key||f.label),goalOK:JSON.stringify(H.goal||'').includes(m.goal.text)}); } return out; })()`);
    c('the goal, How it works (the deck’s steps) and the appeal in every handout', H.filter(h=>!h.goalOK||JSON.stringify(h.how)!==JSON.stringify(h.dhow)||!h.appeal).map(h=>h.g+'/'+h.id), []);
    c('…"Here in" only when the deck has that slide', H.filter(h=>h.place!==h.dplace).map(h=>h.g+'/'+h.id), []); }

  console.log('\n-- T12: edits --');
  { const k=P.J(`(()=>{ const d=caseDeck(caseModel('food-pantry',{type:'board',group:'board'},{now:${NOW}})); return caseSlotKeys(d); })()`);
    c('the slots of the new parts: how:0, the timing', [k.includes('how:0'),k.some(x=>/^(decide|agreed|timeline):0$/.test(x))], [true,true]);
    const kc=P.J(`(()=>{ const d=caseDeck(caseModel('sg-homes',{type:'congregation',group:'congregation'},{now:${NOW}})); return caseSlotKeys(d); })()`);
    c('…the whole church: how:0, and no timeline slot', [kc.includes('how:0'),kc.some(x=>/^timeline/.test(x))], [true,false]);
    const mg=P.J(`(()=>{ const ch=uChurch(); ch.caseEditsV=0; ch.caseEdits={'food-pantry|congregation|congregation|en':{'stat:0':{headline:'Our neighbours'},'stat:1':{headline:'The need'}},
        'plan-series|conference|conference|en':{'risks:0':{headline:'We will report'},'risks:1':{headline:'The mission'}},'food-pantry|board|board|en':{'timeline:0':{headline:'Our first steps'}}};
      const a=caseMigrateEdits42(), b=caseMigrateEdits42(); return {a,b,e:ch.caseEdits,v:ch.caseEditsV}; })()`);
    c('N6: the whole church’s words move once (stat:0 → neighbours:0, stat:1 → stat:0), the conference’s (risks:0 → report:0, risks:1 → mission:0)',
      [mg.a,mg.b,mg.v,mg.e['food-pantry|congregation|congregation|en'],mg.e['plan-series|conference|conference|en']],
      [true,false,42,{'neighbours:0':{headline:'Our neighbours'},'stat:0':{headline:'The need'}},{'report:0':{headline:'We will report'},'mission:0':{headline:'The mission'}}]);
    c('…a board’s old timeline words stay on the timeline slot (never on "Let’s decide together")', mg.e['food-pantry|board|board|en'], {'timeline:0':{headline:'Our first steps'}});
    P.E(`uChurch().caseEdits={}; uPersist();`); }

  console.log('\n-- the goal box, the appeal, the pantry --');
  { P.E(`caseSetPrefs({ministry:'food-pantry',type:'board',group:'board'}); openTool('case'); render();`); await sleep(300);
    const g=P.J(`(()=>{ const b=document.querySelector('#cs-s3 #cs-goal'); return {box:!!b,tag:b&&b.tagName,max:b&&b.getAttribute('maxlength'),val:b&&b.value,s2:!!document.querySelector('#cs-s2 #cs-goal'),n:document.querySelectorAll('#cs-goal').length}; })()`);
    c('the goal box is #cs-goal in step 3 (a textarea of 200 at most, the goal in it), none in step 2 (X4)', [g.box,g.tag,g.max,g.n,g.s2,g.val===P.J(`caseGoalSuggest(caseItemOf('food-pantry'),'en')`)], [true,'TEXTAREA','200',1,false,true]); }
  { const r=P.J(`(()=>{ const K={ministry:'food-pantry',type:'board',group:'board'};
      caseDecSave(K.ministry,{body:'board',outcome:'approved',date:'2026-09-15',vote:{for:9,against:0}});   // a vote already taken
      const d=caseDeck(caseModel('food-pantry',{type:'board',group:'board'},{now:${NOW}})); const cl=d.slides.find(s=>s.type==='close');
      const out={head:cl.headline,text:cl.text,kick:d.slides[1].kicker,goal:!!cl.goal}; caseDecDrop(K.ministry,'board'); return out; })()`);
    c('X10: after the board’s own "Approved", its close says so, and what comes next; the goal stays', [/^Approved on /.test(r.head),/^(Next: |Thank you)/.test(r.text||''),r.goal], [true,true,true]); }
  { const a=P.J(`(()=>{ const m=(p)=>{ caseApprovalSet({path:p}); return caseModel('food-pantry',{type:'board',group:'finance'},{now:${NOW}}).appeal.key; };
      const o=[m(['team','finance','board']),m(['team','finance','business']),m(['finance'])]; caseApprovalSet(CASE_APPROVAL_DEFAULT); return o; })()`);
    c('N4: the finance appeal follows the path (recommend to the board, to the business meeting, or approve)', a, ['financeBoard','financeBusiness','board']); }
  { const x=P.J(`(()=>{ const x=caseItemOf('food-pantry'); const f=uCheck(x); return {room:f.gaps.filter(g=>g.k==='room').length,spaces:f.spaces}; })()`);
    c('X15: the pantry finds its room in the average church (the kitchen / fellowship hall)', [x.room,x.spaces.includes('kitchen')], [0,true]); }

  c('no page errors', P.errs.slice(0,3), []);
  P.w.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); });
