// v10.40.0 integration: the three parts built side by side meet here.
// The pastor: "Shouldn't it already have it [the address]…?", "I would prefer having the slides
// swipe left", and "the slides need to be more persuasive by using scripture as well as making
// sure it's really giving us the unique application to the community that the church is in."
//
// One page, end to end: a reload inside Make the Case restores the remembered church quietly
// (remembers the church), the builder draws its deck, "who already serves nearby" arrives after
// the survey and the slides are built again with it (Here in {town}), every content slide carries
// its verse at the foot, and the preview moves sideways with its position dots (swipe sideways).
// The Census is stubbed through census.mjs's proxy path with the registration token required;
// Overpass answers with one food bank 0.35 mi from the church and no congregations.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,500));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(20); } return false; }

const TOK='r1.AbCdEfGhIjKl.lx2abc.'+'A'.repeat(32);
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor',synced:true,tok:TOK};
const ADDR='10 GREENE RD, WARMINSTER, PA, 18974';
const store=prefs=>{ const id='church-1';
  return JSON.stringify({active:id,churches:{[id]:{id,name:'Bucks County SDA',address:ADDR,capacity:{},selected:[],overrides:{},members:[],linked:[],drafts:[],share:{},proposalPrefs:prefs}}}); };
const GEO={result:{addressMatches:[{matchedAddress:ADDR,coordinates:{x:-75.09,y:40.2},geographies:{
  'Census Tracts':[{NAME:'Census Tract 1012.02',TRACT:'101202',STATE:'42',COUNTY:'017'}],
  'Counties':[{NAME:'Bucks County',STATE:'42',COUNTY:'017'}],
  'County Subdivisions':[{NAME:'Warminster township',COUSUB:'81296',STATE:'42',COUNTY:'017'}],
  'States':[{NAME:'Pennsylvania',STATE:'42'}]}}]}};
function acs(url){
  const u=new URL(url), get=u.searchParams.get('get')||'';
  const vars=get.startsWith('group(')?['NAME','B05006_001E','B05006_002E']:get.split(',');
  const val=v=>v==='NAME'?'Census Tract 1012.02; Bucks County; Pennsylvania':v==='B01002_001E'?'41.2':v==='B19013_001E'?'72000':v==='B19083_001E'?'0.42':/_001E$/.test(v)?'5000':/M$/.test(v)?'40':'100';
  return [vars,vars.map(val)];
}
const resp=(status,body)=>({ok:status>=200&&status<300,status,text:async()=>body,json:async()=>JSON.parse(body)});
const PANTRY={type:'node',id:1,lat:40.205,lon:-75.09,tags:{amenity:'food_bank',name:'Warminster Community Food Bank'}};

function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const net={census:[],help:0,scrolls:0};
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){ net.scrolls++; };
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      w.localStorage.setItem('terrain-churches-v1',o.store);
      w.sessionStorage.setItem('terrain-tool','case');
      w.fetch=async(u,opt={})=>{ u=String(u);
        if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false}),text:async()=>'{"enabled":false}'};
        if(/functions\/census\?check=1/.test(u)) return resp(200,JSON.stringify({required:false,ok:true,register:true,regRequired:true,regOk:true}));
        if(/functions\/register/.test(u)) return resp(503,'{"ok":false,"error":"server"}');
        if(/overpass|interpreter/.test(u)){
          const q=decodeURIComponent(u.split('data=')[1]||'');
          if(/food_bank/.test(q)){ net.help++; await sleep(o.helpDelay||0); return resp(200,JSON.stringify({elements:[PANTRY]})); }
          return resp(200,'{"elements":[]}');
        }
        const m=/functions\/census\?cv=2&u=(.*)$/.exec(u);
        if(m){
          const inner=decodeURIComponent(m[1]), h=(opt&&opt.headers)||{};
          net.census.push({u:inner,reg:h['x-terrain-reg']||null});
          if(!h['x-terrain-reg']) return resp(401,'{"error":"noreg"}');
          if(/geocoding\.geo\.census\.gov/.test(inner)) return resp(200,JSON.stringify(GEO));
          if(/api\.census\.gov\/data\/\d+\/acs\/acs5\?get=/.test(inner)) return resp(200,JSON.stringify(acs(inner)));
          return new Promise(()=>{});                 // blocks (where to look): never answer here
        }
        return new Promise(()=>{});
      }; }});
  const w=dom.window;
  return {w,D:w.document,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,net,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
    txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
const NOFOOT=['join','verse','close'];

(async()=>{
  console.log('-- a reload in Make the Case: the church remembered, the place, the verses, sideways --');
  for(const lang of ['en','es']){
    const P=page({store:store({ministry:'food-pantry',type:'board',group:'board'}),lang,helpDelay:400});
    c(`${lang}: the page reopens Make the Case and loads the church without anything typed`, await until(()=>P.E('TOOL')==='case'&&P.E('!!DATA')&&!!P.q('#cs-s3')&&!P.q('#cs-s3').hidden), true);
    c(`${lang}: …every Census call carried the registration token`, [P.net.census.length>5,P.net.census.every(x=>x.reg===TOK)], [true,true]);
    c(`${lang}: …the address box never shows; the church line does`, [P.q('.ask').style.display,P.q('#homeline').hidden], ['none',false]);
    c(`${lang}: the quiet reload also asks who already serves nearby (as a survey does)`, await until(()=>P.net.help>0), true);
    c(`${lang}: …and when they arrive the slides are built again with them`,
      await until(()=>{ const d=P.J('caseCurrentDeck()'), s=d&&d.slides.find(x=>x.type==='place'); return !!s&&(s.partners||[]).some(p=>p.name==='Warminster Community Food Bank'); }), true);
    const deck=P.J('caseCurrentDeck()');
    // v10.42: "Suggest options" (the default) adds "Let's decide together", an ask slide, before the ask
    // v10.42 part 3 (the pastor: "a focus, a beginning and an appeal at the end"; DESIGN.md §5): how it works after the place, the
    // safeguards before the one timing slide, and the appeal back to the goal at the end
    c(`${lang}: the board deck: join · motion · need · place · how · capacity · ability · risks · decide · ask · appeal`, deck.slides.map(s=>s.type+(s.part?'/'+s.part:'')), ['join','motion','stat','place','how','capacity','ability','risks','ask/decide','ask','close']);
    const place=deck.slides.find(s=>s.type==='place');
    c(`${lang}: the place slide names the town`, /Warminster/.test(place.kicker+' '+place.headline), true);
    c(`${lang}: …and the pantry beside our church, with its distance`, place.partners.map(p=>[p.name,/mi$/.test(p.dist)]), [['Warminster Community Food Bank',true]]);
    c(`${lang}: every content slide carries a verse (never twice)`, [deck.slides.filter(s=>!NOFOOT.includes(s.type)).every(s=>s.verse&&s.verse.text&&s.verse.ref),new Set(deck.slides.filter(s=>s.verse).map(s=>s.verse.ref)).size===deck.slides.filter(s=>s.verse).length], [true,true]);
    c(`${lang}: …in the reader's own Bible (KJV / RVA)`, deck.slides.filter(s=>s.verse).every(s=>(lang==='es'?/RVA/:/KJV/).test(s.verse.ref)), true);
    // the preview on screen is the deck just rebuilt, in the sideways row
    const secs=P.qa('#cs-pv .td-slide');
    c(`${lang}: the preview shows the rebuilt deck, slide for slide`, secs.map(s=>[...s.classList].find(k=>/^td-t-/.test(k)).slice(5)), deck.slides.map(s=>s.type));
    c(`${lang}: …the verse at the foot of every content slide, after the body and before the source`,
      secs.map(s=>{ const t=[...s.classList].find(k=>/^td-t-/.test(k)).slice(5); const f=s.querySelector('.td-main>.td-vfoot'); return NOFOOT.includes(t)?!f:!!f&&f.previousElementSibling&&f.previousElementSibling.classList.contains('td-body'); }), secs.map(()=>true));
    c(`${lang}: …the place slide draws who already serves`, P.qa('#cs-pv .td-t-place .td-prow').map(r=>r.textContent.includes('Warminster Community Food Bank')), [true]);
    c(`${lang}: …with Jeremiah 29:7 at its foot`, P.txt('#cs-pv .td-t-place .td-vfr'), lang==='es'?'Jeremías 29:7 · RVA':'Jeremiah 29:7 · KJV');
    c(`${lang}: …one position dot per slide, outside the slides`, [P.qa('#cs-pv .td-pager i').length,!P.q('#cs-pv .td-slide .td-pager')], [deck.slides.length,true]);
    // one key inside the slides moves exactly one slide, sideways (scrollLeft, never scrollTop)
    const sc=P.q('#cs-pv .td-scroller'); const top0=sc.scrollTop;
    const i0=P.E('CASE_ST.pv.index()');
    sc.dispatchEvent(new P.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
    c(`${lang}: → in the slides moves one slide, and the page does not move up or down`, [P.E('CASE_ST.pv.index()')-i0,sc.scrollTop===top0], [1,true]);
    c(`${lang}: nothing was generated or scrolled by the reload`, P.net.scrolls, 0);
    c(`${lang}: no errors`, P.errs, []);
    P.w.close();
  }

  console.log('\n-- the place slide in present and follow mode: dots at the top, the verse at the foot --');
  { const P=page({store:store({ministry:'food-pantry',type:'board',group:'board'})});
    await until(()=>{ const d=P.J('caseCurrentDeck()'); return !!d&&(d.slides.find(x=>x.type==='place').partners||[]).length>0; });
    const r=P.J(`(()=>{ const deck=caseCurrentDeck(), out={};
      for(const mode of ['present','follow']){ const h=document.createElement('div'); h.style.cssText='position:fixed;inset:0'; document.body.appendChild(h);
        const ctl=tdeckRender(deck,h,{mode,keys:false,presenter:0}); const pi=deck.slides.findIndex(s=>s.type==='place'); ctl.go(pi);
        const sec=h.querySelectorAll('.td-slide')[pi];
        out[mode]={i:ctl.index(),dots:h.querySelectorAll('.td-pager i').length,on:[...h.querySelectorAll('.td-pager i')].findIndex(d=>d.classList.contains('on')),
          foot:!!sec.querySelector('.td-vfoot'),ref:(sec.querySelector('.td-vfr')||{}).textContent||'',pager:h.querySelector('.td-root>.td-pager')!==null};
        ctl.destroy(); h.remove(); }
      return out; })()`);
    const pi=P.J(`caseCurrentDeck().slides.findIndex(s=>s.type==='place')`), n=P.J('caseCurrentDeck().slides.length');
    for(const mode of ['present','follow'])
      c(`${mode}: on the place slide, its dot is lit, its verse is at the foot, the dots sit on the stage (not in a slide)`,
        [r[mode].i,r[mode].dots,r[mode].on,r[mode].foot,/^Jeremiah 29:7/.test(r[mode].ref),r[mode].pager], [pi,n,pi,true,true,true]);
    c('no errors', P.errs, []);
    P.w.close(); }

  console.log('\n-- the place arrives while he is typing a headline: his box stays, the slides follow when he leaves it --');
  { const P=page({store:store({ministry:'food-pantry',type:'board',group:'board'}),helpDelay:1500});
    await until(()=>!!P.q('#cs-s3')&&!P.q('#cs-s3').hidden);
    P.E('CASE_ST.pv.go(1)'); await sleep(50);
    const ta=P.q('#cs-s3 [data-cs-edit] textarea[data-cs-f="headline"]');
    c('the edit panel shows the motion slide\'s headline box', !!ta, true);
    ta.focus();
    c('…HELP still loading, no partners on the slides yet', [P.E('HELP_STATE'),P.J('caseCurrentDeck()').slides.some(s=>s.type==='place'&&(s.partners||[]).length)], ['loading',false]);
    await until(()=>P.E('HELP_STATE')==='ready'); await sleep(400);
    c('who already serves arrives: the box he is typing in is not pulled away', [P.D.activeElement===ta,P.q('#cs-s3').contains(ta)], [true,true]);
    c('…the slides are marked to be built again', P.E('CASE_PLACE_STALE'), true);
    ta.blur(); await sleep(400);
    c('when he leaves the box, the slides are built with them', (P.J('caseCurrentDeck()').slides.find(s=>s.type==='place').partners||[]).map(p=>p.name), ['Warminster Community Food Bank']);
    c('…the edit panel is on the same slide', P.E('CASE_ST.pv.index()'), 1);
    c('no errors', P.errs, []);
    P.w.close(); }
  { const P=page({store:store({ministry:'food-pantry',type:'board',group:'board'}),helpDelay:1500});
    await until(()=>!!P.q('#cs-s3')&&!P.q('#cs-s3').hidden);
    P.E('CASE_ST.pv.go(1)'); await sleep(50);
    P.q('#cs-s3 [data-cs-edit] textarea[data-cs-f="headline"]').focus();
    await until(()=>P.E('HELP_STATE')==='ready'); await sleep(400);
    P.E(`window.__deck=null; caseOpenPresenter=function(d){ window.__deck=d; };`);
    await P.E(`caseAct('present')`);
    c('Present straight from the box: the deck presented carries who already serves', (P.J('window.__deck').slides.find(s=>s.type==='place').partners||[]).map(p=>p.name), ['Warminster Community Food Bank']);
    c('no errors', P.errs, []);
    P.w.close(); }

  console.log('\n-- the densest place slide (where to look + two figures + a verse) keeps a short source line --');
  // Measured in Chrome at integration (all 506 decks with realistic places): Spanish board decks for the
  // interpreter bank and the welcome table ran 7 px past the frame at the smallest type, with a
  // three-line source. With "where" and two figures on the slide, the where-to-look source is now
  // named in its short form ("Census blocks"), and every deck fits (0 overflow, re-measured).
  { const FX=require('./fixtures.json');
    const vc=new VirtualConsole(); const errs=[]; vc.on('jsdomError',e=>errs.push(e.message));
    const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){ w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.fetch=async()=>new Promise(()=>{}); }});
    const w=dom.window, E=s=>w.eval(s), JE=s=>JSON.parse(E('JSON.stringify('+s+')'));
    await until(()=>E('typeof caseModel==="function"'));
    const D=JSON.parse(JSON.stringify(FX.DATA)); D.M.tract.moe=JE('CASE_SAMPLE.M.tract.moe'); D.M.county.moe=JE('CASE_SAMPLE.M.county.moe');
    E('DATA='+JSON.stringify(D)+';SCOPE="tract"; uChurch().name="Bucks County SDA"; CAP=null; capSave('+JSON.stringify(FX.MEDIUM)+');');
    E(`DATA.geo=Object.assign({},DATA.geo,{coords:{x:-75.1,y:40.2}});
      HELP=[{cat:'food',name:'Warminster Community Food Bank',lat:40.21,lon:-75.1,dist:0.9}]; HELP_STATE='ready'; HELP_AT={lat:40.2,lon:-75.1};
      ZONES={church:{lat:40.2,lon:-75.1},radius:1.8,scored:[{geoid:'1',home:true,lat:40.2,lon:-75.1,dist:0,m:{poverty:19,kidsShare:27,seniorsAlone:9,limEng:11,foreign:21},need:30,density:5000},
        {geoid:'2',home:false,lat:40.21,lon:-75.088,dist:0.9,m:{poverty:34,kidsShare:34,seniorsAlone:18,limEng:4,foreign:9},need:60,density:4000},
        {geoid:'3',home:false,lat:40.185,lon:-75.12,dist:1.3,m:{poverty:14,kidsShare:22,seniorsAlone:25,limEng:19,foreign:30},need:40,density:9000}]}; ZONES_STATE='ready';`);
    for(const lang of ['es','en']){
      const r=JE(`(()=>{ const m=caseModel('interpreter-bank',{type:'board',group:'board'},{lang:'${lang}',now:Date.UTC(2026,8,28,15)}); const d=caseDeck(m), p=d.slides.find(s=>s.type==='place');
        return {where:!!p.where,facts:p.facts.length,src:p.source}; })()`);
      c(`${lang}: interpreter bank, board: where to look and two figures on the place slide`, [r.where,r.facts], [true,2]);
      c(`${lang}: …its source line names the Census blocks in the short form (two lines, not three)`,
        // v10.42.0 fix after review: each source by what it gives ("who already serves: OpenStreetMap" read as if the map served the poor)
        [r.src.length<=95,/TIGERweb/.test(r.src),(lang==='es'?/Cuadras del Censo: Censo de EE\. UU\.$/:/Census blocks: U\.S\. Census$/).test(r.src)], [true,false,true]);
    }
    c('no errors', errs, []);
    w.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); });
