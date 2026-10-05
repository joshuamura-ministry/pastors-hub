// v10.40.0 review pass (29 Sep 2026): the code findings of three independent reviewers, and the
// protections they showed no test pinned (they removed each and every suite stayed green).
//  A. Where to look first: a zones load for church A never blocks church B's, and A's late answer is
//     dropped (it drew A's blocks under B); a load that never answers gives up.
//  B. A reload on the hub with #a=, then the Community Survey tapped while the quiet lookup runs: the
//     report appears (the address the page itself put in the box is not "typing another address").
//  C. An idea index kept in sessionStorage from an earlier deploy: a word search renews it, once, and
//     shows cards (it failed for good in that tab, and every Try again downloaded words.json again).
//  D. Library and "Fresh idea (AI)" cards print AI text as text (markup never becomes elements).
//  E. A member's #gifts= or #watch= link on a device that remembers a church makes no Census call.
//  F. HELP for another church's coordinates never reaches the place slide, and an older loadHelp that
//     finishes last does not overwrite the newer one.
//  G. Small ones: "1 teléfono"; the Planner's church is the church's name; one spelling of
//     "neighborhood" on the Make the Case screen; the department tiles share one height.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
const IDX=JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','index.json'),'utf8'));
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,600));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=6000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(20); } return false; }

const TOK='r1.AbCdEfGhIjKl.lx2abc.'+'A'.repeat(32);
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor',synced:true,tok:TOK};
const ADDR='10 GREENE RD, WARMINSTER, PA, 18974';
const store=(addr,extra)=>{ const id='church-1';
  return JSON.stringify({active:id,churches:{[id]:{id,name:'Bucks County SDA',address:addr||'',capacity:{},selected:[],overrides:{},members:[],linked:[],drafts:[],share:{},...(extra||{})}}}); };
const geo=(matched,x,y)=>({result:{addressMatches:[{matchedAddress:matched,coordinates:{x,y},geographies:{
  'Census Tracts':[{NAME:'Census Tract 1012.02',TRACT:'101202',STATE:'42',COUNTY:'017'}],
  'Counties':[{NAME:'Bucks County',STATE:'42',COUNTY:'017'}],
  'County Subdivisions':[{NAME:'Warminster township',COUSUB:'81296',STATE:'42',COUNTY:'017'}],
  'States':[{NAME:'Pennsylvania',STATE:'42'}]}}]}});
const GEO_A=geo(ADDR,-75.09,40.2), GEO_B=geo('200 MAIN ST, NORRISTOWN, PA, 19401',-75.34,40.12);
function acs(url){
  const u=new URL(url), get=u.searchParams.get('get')||'';
  const vars=get.startsWith('group(')?['NAME','B05006_001E','B05006_002E']:get.split(',');
  const val=v=>v==='NAME'?'Census Tract 1012.02; Bucks County; Pennsylvania':v==='B01002_001E'?'41.2':v==='B19013_001E'?'72000':v==='B19083_001E'?'0.42':/_001E$/.test(v)?'5000':/M$/.test(v)?'40':'100';
  return [vars,vars.map(val)];
}
const resp=(status,body)=>({ok:status>=200&&status<300,status,text:async()=>body,json:async()=>JSON.parse(body)});

function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const net={mode:o.mode||'ok',census:[],ideas:[],held:[],scrolls:0,advise:[]};
  const dom=new JSDOM(html,{runScripts:'dangerously',url:o.url||'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){ net.scrolls++; };
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      if(o.store) w.localStorage.setItem('terrain-churches-v1',o.store);
      if(o.session!=null) w.sessionStorage.setItem('terrain-tool',o.session);
      if(o.kept) w.sessionStorage.setItem('terrain-lib-idx',o.kept);
      if(o.pass) w.localStorage.setItem('terrain-ai-pass',o.pass);
      w.fetch=async(u,opt={})=>{ u=String(u);
        const im=/^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if(im){ net.ideas.push(im[1]); const t=fs.readFileSync(path.join(ROOT,'ideas',im[1]+'.json'),'utf8'); return {ok:true,status:200,json:async()=>JSON.parse(t)}; }
        if(/advise/.test(u)){ if(!opt||opt.method!=='POST') return {ok:true,status:200,json:async()=>(o.ai?{enabled:true,locked:false,fn:'advise-2.2'}:{enabled:false})};
          const b=JSON.parse(opt.body); net.advise.push(b); return {ok:true,status:200,json:async()=>({ideas:o.ai(b),rejected:0,fn:'advise-2.2'})}; }
        if(/functions\/census\?check=1/.test(u)) return resp(200,JSON.stringify({required:false,ok:true,register:true,regRequired:true,regOk:true}));
        if(/functions\/(register|gifts|present)/.test(u)) return new Promise(()=>{});
        const m=/functions\/census\?cv=2&u=(.*)$/.exec(u);
        if(m){
          const inner=decodeURIComponent(m[1]), h=(opt&&opt.headers)||{};
          net.census.push({u:inner});
          const answer=()=>{
            if(!h['x-terrain-reg']) return resp(401,'{"error":"noreg"}');
            if(/geocoding\.geo\.census\.gov/.test(inner)) return resp(200,JSON.stringify(/norristown/i.test(inner)?GEO_B:GEO_A));
            if(/api\.census\.gov\/data\/\d+\/acs\/acs5\?get=/.test(inner)) return resp(200,JSON.stringify(acs(inner)));
            return new Promise(()=>{});
          };
          if(net.mode==='hold') return new Promise((res,rej)=>net.held.push(()=>{ try{ Promise.resolve(answer()).then(res,rej); }catch(e){ rej(e); } }));
          return answer();
        }
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,net,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
    txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; },
    release:()=>{ net.mode='ok'; const h=net.held.splice(0); h.forEach(f=>f()); }};
}
const type=(P,sel,v)=>{ const e=P.q(sel); e.value=v; e.dispatchEvent(new P.w.Event('input',{bubbles:true})); };
function setup(P,tool){ P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)}); uPersist(); openTool('${tool||'survey'}'); render(); ${tool==='case'?'caseMount(true);':''} })()`); }

(async()=>{ try{
  console.log('-- A. where to look first: church B is never blocked by church A\'s load, and A\'s late answer is dropped --');
  { const A=page({store:store(ADDR),session:'case'});
    A.E(`window.__z=[]; fetchNearbyShapes=function(c,R){ return new Promise(res=>window.__z.push({c,R,res})); }; fetchCountyTracts=async function(){ return {}; };`);
    await until(()=>A.E('!!DATA')&&A.E('window.__z.length')>0,6000);
    c('church A reloaded quietly; its blocks asked for', A.J('window.__z.map(z=>z.c)'), [{lat:40.2,lon:-75.09}]);
    A.E(`homeChange()`); A.q('#addr').value='200 Main St, Norristown, PA'; A.q('#go').click();
    await until(()=>A.E('DATA&&DATA.geo&&DATA.geo.coords&&+DATA.geo.coords.x')===-75.34,6000); await sleep(100);
    c('church B on screen: its own blocks are asked for while A\'s are still out', A.J('window.__z.map(z=>z.c)'), [{lat:40.2,lon:-75.09},{lat:40.12,lon:-75.34}]);
    A.E(`window.__z[0].res([{geoid:'42017101202',lat:40.2,lon:-75.09,rings:[]}])`); await sleep(150);
    c('A\'s blocks arriving late are dropped: nothing of A\'s is kept or drawn', [A.J('ZONES&&ZONES.church'),A.E('ZONES_STATE')], [null,'loading']);
    A.E(`window.__z[1].res([{geoid:'42017101202',lat:40.12,lon:-75.34,rings:[]}])`); await sleep(150);
    c('B\'s blocks are B\'s', [A.J('ZONES&&ZONES.church'),A.E('ZONES_STATE')], [{lat:40.12,lon:-75.34},'ready']);
    c('the place slide sees them (the same coordinates)', A.E('!!casePlaceSnap().zones'), true);
    // a load that never answers gives up, so the "Here in" slide stops waiting for it
    A.E(`ZONES_TIMEOUT=150; window.__z=[]; ZONES=null; loadZones(DATA.geo,DATA.M,2.5)`); await sleep(400);
    c('a block service that never answers: the load gives up and says so (never "loading" for the session)', [A.E('ZONES_STATE'),/did not answer/.test(A.E('ZONES_ERR'))], ['failed',true]);
    c('no page errors', A.errs, []);
    A.w.close(); }

  console.log('\n-- B. a reload on the hub with #a=, then the Community Survey tapped while it loads --');
  { const B=page({store:store(ADDR),session:'',mode:'hold',url:'https://pastorshub.org/#a='+encodeURIComponent('10 Greene Rd, Warminster, PA')});
    await until(()=>B.net.held.length>0,4000);
    c('the quiet lookup started, the page put the address in the box', [B.E('!!RUN_ON'),B.E('RUN_QUIET'),B.q('#addr').value], [true,true,'10 Greene Rd, Warminster, PA']);
    B.E(`openTool('survey')`);
    for(let i=0;i<12;i++){ B.release(); await sleep(60); } await sleep(300);
    c('the lookup ends in the report, not in an idle address box', [B.E('!!DATA'),B.q('#report').classList.contains('show'),B.q('.ask').style.display], [true,true,'none']);
    c('…one lookup only', B.net.census.filter(x=>/geocoding/.test(x.u)).length, 1);
    B.w.close(); }
  { const B=page({store:store(ADDR),session:'',mode:'hold',url:'https://pastorshub.org/#a='+encodeURIComponent('10 Greene Rd, Warminster, PA')});
    await until(()=>B.net.held.length>0,4000);
    B.E(`openTool('survey')`); B.q('#addr').value='200 Main St, Norristown, PA';
    for(let i=0;i<12;i++){ B.release(); await sleep(60); } await sleep(300);
    c('…but when he has typed another address, the quiet one is still dropped', [B.E('!!DATA'),B.q('#addr').value], [false,'200 Main St, Norristown, PA']);
    B.w.close(); }

  console.log('\n-- C. an idea index kept from an earlier deploy, and a word search --');
  { const kept=JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','index.json'),'utf8')); kept.hash='000000000000';
    // v10.45.0 (ported): the survey's ministries list, where the Idea Library lived, is gone (DESIGN-SURVEY §1.1); the same library code serves
    // Make the Case's step 2 (no group chosen), where a pastor looks beyond a need's own ideas: the checks run there.
    const C=page({kept:JSON.stringify(kept)}); await sleep(1300); setup(C,'case');
    type(C,'#cs-q','coffee');
    await until(()=>C.qa('#cs-lib .lib-card').length>0||C.q('#cs-lib .lib-fail'),8000); await sleep(200);
    c('the old index is renewed once, and the search shows cards', [C.qa('#cs-lib .lib-card').length>0,!!C.q('#cs-lib .lib-fail'),C.E('LIB.idx.hash')], [true,false,IDX.hash]);
    c('…words.json fetched twice at most, the index once', [C.net.ideas.filter(x=>x==='words').length<=2,C.net.ideas.filter(x=>x==='index').length], [true,1]);
    c('…and the session keeps the current index now', JSON.parse(C.w.sessionStorage.getItem('terrain-lib-idx')).hash, IDX.hash);
    C.w.close(); }
  { const T=page(); await sleep(1300);
    c('the build hash stands for the index and the search words too (a synonym change alone replaces a kept index)', fs.readFileSync(path.join(ROOT,'tools','build-ideas.mjs'),'utf8').includes("update('\\n' + JSON.stringify({cols: COLS, themes: idxThemes, ideas: rows}))"), true);
    T.w.close(); }

  console.log('\n-- D. AI text on the cards is text, never markup --');
  { const bad='<img src=x onerror="window.__x=1">';
    const idea=l=>({tier:1,k:'serve',ages:'adults',where:'community',sabbath:false,minors:false,need:['poor'],boost:[],ppl:2,leaders:0,hrs:2,cost:0,costMo:0,skill:[],
      partner:{[l]:'The laundromat '+bad},[l]:{n:'Cards at the laundromat '+bad,d:'A stand of cards at the laundromat folding table. '+bad+' Two members answer every text within a day.',how:['Ask the owner for a spot '+bad,'Print 250 cards with a text number.','Answer each text within a day, privately.','Restock the stand every Monday morning.']}});
    // v10.45.0 (ported): "More ideas" is asked for in Make the Case's library now (the survey's list is gone)
    const D=page({ai:b=>[idea(b.lang==='es'?'es':'en')],pass:'x'}); await sleep(1300); setup(D,'case');
    type(D,'#cs-q','prayer'); await until(()=>D.q('#cs-lib [data-lib-ai]'),8000);
    D.q('#cs-lib [data-lib-ai]').click(); await until(()=>D.qa('#cs-lib .lib-card .u-ai').length>0,8000); await sleep(100);
    const card=D.qa('#cs-lib .lib-card').find(e=>e.querySelector('.u-ai'));
    c('Make the Case: the fresh card shows the markup as text, with no element made from it', [!!card,card&&card.querySelectorAll('img').length,card&&card.textContent.includes('<img src=x'),D.E('window.__x||0')], [true,0,true,0]);
    setup(D,'case'); type(D,'#cs-q','prayer'); await until(()=>D.qa('#cs-lib .lib-card .u-ai').length>0,8000); await sleep(100);
    const card2=D.qa('#cs-lib .lib-card').find(e=>e.querySelector('.u-ai'));
    c('…drawn again: the same', [!!card2,card2&&card2.querySelectorAll('img').length,D.E('window.__x||0')], [true,0,0]);
    c('…and nowhere on the page', D.qa('img[src="x"]').length, 0);
    D.w.close(); }

  console.log('\n-- E. a member\'s link on a device that remembers a church --');
  for(const hash of ['#gifts=AbCdEfGh23','#watch=K7M2QX']){
    const E=page({store:store(ADDR),session:'case',url:'https://pastorshub.org/'+hash}); await sleep(1500);
    c(`${hash.split('=')[0]}: no Census call, no survey reloaded`, [E.net.census.length,E.E('!!DATA')], [0,false]);
    // the guard itself (homeEnsure), whatever path may call it later: a member's link never loads the pastor's church
    E.E(`TOOL='case'`); const r=E.E('homeEnsure()'); await sleep(300);
    c(`${hash.split('=')[0]}: homeEnsure refuses on a member's link`, [r,E.net.census.length], [false,0]);
    E.w.close(); }

  console.log('\n-- F. who already serves nearby: only this church\'s, and only the newest load --');
  { const F=page(); await sleep(1300); setup(F,'case');
    F.E(`DATA.geo=DATA.geo||{}; DATA.geo.coords={x:-75.09,y:40.2}; HELP=[{name:'Far Pantry',cat:'food',dist:0.5,lat:40.1,lon:-75.3}]; HELP_AT={lat:40.12,lon:-75.34}; HELP_STATE='ready';`);
    c('HELP fetched for another church\'s point never reaches the place slide', F.E('casePlaceSnap().help'), null);
    F.E(`HELP_AT={lat:40.2,lon:-75.09};`);
    c('…while HELP for this church\'s own point does', F.E('!!casePlaceSnap().help'), true);
    F.E(`window.__h=[]; fetchHelp=function(c){ return new Promise(res=>window.__h.push({c,res})); };
      HELP=null; HELP_AT=null; loadHelp({coords:{x:-75.09,y:40.2}}); loadHelp({coords:{x:-75.34,y:40.12}});`);
    F.E(`window.__h[1].res([{name:'B pantry',cat:'food',dist:0.4}])`); await sleep(50);
    F.E(`window.__h[0].res([{name:'A pantry',cat:'food',dist:0.4}])`); await sleep(50);
    c('an older load that finishes last does not overwrite the newer one', [F.J('HELP_AT'),F.J('HELP.map(h=>h.name)')], [{lat:40.12,lon:-75.34},['B pantry']]);
    c('no page errors', F.errs, []);
    F.w.close(); }

  console.log('\n-- G. small ones --');
  { const G=page(); await sleep(1300); setup(G,'case');
    c('the Spanish presenter\'s bar: "1 teléfono", "3 teléfonos"', [G.E(`TD_STR.es.opened(1)`),G.E(`TD_STR.es.opened(3)`),G.E(`TD_STR.en.opened(1)`)], ['1 teléfono','3 teléfonos','1 opened']);
    G.E(`DATA.geo={...(DATA.geo||{}),matched:'118 BRISTOL RD, WARMINSTER, PA, 18974'}; uChurch().address='118 BRISTOL RD, WARMINSTER, PA, 18974';`);
    c('the Planner\'s "Church or district" is the church he named', G.E('planChurchName()'), 'Bucks County SDA');
    G.E(`uChurch().name='My church';`);
    c('…or, with no name yet, the address in plain case', G.E('planChurchName()'), '118 Bristol Rd, Warminster, PA 18974');
    G.w.close(); }
  { const G2=page({store:store(ADDR),session:'',mode:'hold'}); await sleep(1300);
    G2.E(`openTool('planner')`); await sleep(100);
    c('…also when the Planner opens before the survey has reloaded (it took the Recent address in capitals)', G2.q('#pl-church').value, 'Bucks County SDA');
    G2.w.close(); }
  { const G=page(); await sleep(1300); setup(G,'case');
    // Updated v10.41: the long note under step 1 is gone ("titles and descriptions should be short"); the new steps'
    // words keep the one spelling of the library ("neighbors"), never "neighbour".
    c('one spelling on the Make the Case screen: "neighborhood" beside the library\'s "neighborhood"', [/neighbour/i.test(G.E(`JSON.stringify([CASE_STEP_UI,CASE_AUD_SECTIONS,CASE_AUD_SUBS,CASE_AUD_NOTE])`)),/neighbors/.test(G.E(`libT('secOutSub')`))], [false,true]);
    // Updated v10.41 (the approved mockup: a dot and the name, 54 px tiles, the same on a phone): one floor, still measured.
    c('the department tiles share one height across the three groups (measured, set on the step)', [/\.cs-atile\{[^}]*min-height:var\(--atile-h,54px\)/.test(html),/min-height:var\(--atile-h,78px\)/.test(html),G.E('typeof caseAudEqual')], [true,false,'function']);
    G.w.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('CRASH',e&&e.stack||e); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
