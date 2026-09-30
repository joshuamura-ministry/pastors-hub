// v10.40.0 — Terrain remembers the church, and Make the Case shows every department.
// The pastor: "It's even asking for the address. Shouldn't it already have it…? Why would
// there be two places to put your address?" and "before it had all the different
// departments and now I don't see any departments here".
//
// The Census is stubbed at fetch, through census.mjs's own proxy path (?cv=2&u=…), and it
// refuses a call without the registration token (401 noreg), as the live function does
// with TERRAIN_REG_SECRET set. Covered: a reload inside Make the Case reopens it and loads
// the remembered church without typing (quietly: no ideas generated, no scroll, no focus
// moved, the Map it button never locked); the never-mapped card; the failure sentence with
// Try again (and a refused registration); Change church; a quiet load dropped when he
// starts another address; the Planner, Spiritual Gifts and the hub; the flat page and
// ?tier=free untouched; the survey itself unchanged; the 23 groups as tiles, one tap each.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,500));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=6000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(20); } return false; }

const TOK='r1.AbCdEfGhIjKl.lx2abc.'+'A'.repeat(32);
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor',synced:true,tok:TOK};
const ADDR='10 GREENE RD, WARMINSTER, PA, 18974';
const store=(addr,extra)=>{ const id='church-1';
  return JSON.stringify({active:id,churches:{[id]:{id,name:'Bucks County SDA',address:addr||'',capacity:{},selected:[],overrides:{},members:[],linked:[],drafts:[],share:{},...(extra||{})}}}); };
const GEO={result:{addressMatches:[{matchedAddress:ADDR,coordinates:{x:-75.09,y:40.2},geographies:{
  'Census Tracts':[{NAME:'Census Tract 1012.02',TRACT:'101202',STATE:'42',COUNTY:'017'}],
  'Counties':[{NAME:'Bucks County',STATE:'42',COUNTY:'017'}],
  'County Subdivisions':[{NAME:'Warminster township',COUSUB:'81296',STATE:'42',COUNTY:'017'}],
  'States':[{NAME:'Pennsylvania',STATE:'42'}]}}]}};
// An ACS answer for whatever was asked: totals (…_001E) 5,000, medians plausible, cells 100.
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
  const net={mode:o.mode||'ok',census:[],register:0,held:[],scrolls:0};
  const dom=new JSDOM(html,{runScripts:'dangerously',url:o.url||'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){ net.scrolls++; };
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      if(o.store) w.localStorage.setItem('terrain-churches-v1',o.store);
      if(o.recent) w.localStorage.setItem('terrain-recent',JSON.stringify(o.recent));
      if(o.session!=null) w.sessionStorage.setItem('terrain-tool',o.session);
      w.fetch=async(u,opt={})=>{ u=String(u);
        if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false}),text:async()=>'{"enabled":false}'};
        if(/functions\/census\?check=1/.test(u)) return resp(200,JSON.stringify({required:false,ok:true,register:true,regRequired:true,regOk:true}));
        if(/functions\/register/.test(u)){ net.register++; return resp(503,'{"ok":false,"error":"server"}'); }
        const m=/functions\/census\?cv=2&u=(.*)$/.exec(u);
        if(m){
          const inner=decodeURIComponent(m[1]), h=(opt&&opt.headers)||{};
          net.census.push({u:inner,reg:h['x-terrain-reg']||null});
          const answer=()=>{
            if(net.mode==='down') throw new TypeError('Failed to fetch');
            if(net.mode==='noreg'||!h['x-terrain-reg']) return resp(401,'{"error":"noreg"}');
            if(/geocoding\.geo\.census\.gov/.test(inner)) return resp(200,JSON.stringify(GEO));
            if(/api\.census\.gov\/data\/\d+\/acs\/acs5\?get=/.test(inner)) return resp(200,JSON.stringify(acs(inner)));
            return new Promise(()=>{});                 // blocks, zones: never answer here
          };
          if(net.mode==='hold') return new Promise((res,rej)=>net.held.push(()=>{ try{ Promise.resolve(answer()).then(res,rej); }catch(e){ rej(e); } }));
          return answer();
        }
        return new Promise(()=>{});                     // churches and help nearby: never answer
      }; }});
  const w=dom.window;
  const P={w,D:w.document,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,net,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
    txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; },
    release:()=>{ net.mode='ok'; const h=net.held.splice(0); h.forEach(f=>f()); }};
  return P;
}
const click=(P,s)=>{ const e=P.q(s); if(!e) throw new Error('no element '+s); e.click(); };
const shown=(P,s)=>{ const e=P.q(s); return !!e&&!e.hidden&&e.style.display!=='none'; };
const geoCalls=P=>P.net.census.filter(x=>/geocoding/.test(x.u));

(async()=>{
  console.log('-- a reload inside Make the Case --');
  { const A=page({store:store(ADDR),session:'case'});
    c('the page reopens Make the Case by itself', await until(()=>A.E('TOOL')==='case'), true);
    c('…and loads the church’s survey without anything typed', await until(()=>A.E('!!DATA')&&!!A.q('#cs-s1')), true);
    c('…looked up from the address remembered on this device', geoCalls(A).map(x=>decodeURIComponent(new URL(x.u).searchParams.get('address'))), [ADDR]);
    c('…every Census call carried the registration token', [A.net.census.length>5,A.net.census.every(x=>x.reg===TOK)], [true,true]);
    c('the survey’s address box never shows inside Make the Case', [A.q('.ask').style.display,A.q('#addr').value], ['none','']);
    c('one slim line: church · address · Change church', A.txt('#homeline'), 'Bucks County SDA · 10 Greene Rd, Warminster, PA 18974 · Change church');
    c('…the tool bar’s own Change church and the report’s address line step aside for it', [A.q('#changech').hidden,A.q('#place').classList.contains('offtab')], [true,true]);
    c('the builder, and the sample below', [!!A.q('#cs-s1'),A.q('#casep').hidden,!!A.q('#cs-s3 [data-cs-sample]')], [true,true,true]);   // v10.41: the sample door sits in step 3 until an idea is chosen
    c('nothing scrolled the page to the report', A.net.scrolls, 0);
    c('the Community Survey still knows the church (Recent)', A.J(`recentGet()[0]`), ADDR);
    c('no errors', A.errs, []);
    A.w.close(); }

  console.log('\n-- quiet: no ideas, no scroll, no focus, Map it never locked --');
  { const B=page({store:store(ADDR),mode:'hold'});
    await until(()=>!B.q('#hub').hidden);
    B.E(`window.__ai=0; autoIdeas=function(){ window.__ai++; };`);
    B.E(`openTool('case')`); B.net.scrolls=0;
    await until(()=>B.net.held.length>0);
    c('while it loads: a calm line naming the church, and the sample', [B.txt('#casep .home-load'),!!B.q('#casep [data-cs-sample]')], ['Loading the Community Survey for Bucks County SDA…',true]);
    c('…the dot beside it is still (nothing moves on its own)', /\.home-dot\{[^}]*animation/.test(html), false);
    c('…the church’s line already shows', B.txt('#homeline'), 'Bucks County SDA · 10 Greene Rd, Warminster, PA 18974 · Change church');
    c('…no address box, and Map it is not locked by a quiet load', [B.q('.ask').style.display,B.q('#go').disabled,B.q('#loc').disabled], ['none',false,false]);
    const focus0=B.D.activeElement;
    B.release();
    c('then the builder', await until(()=>!!B.q('#cs-s1')), true);
    await sleep(120);
    c('…no fresh ideas were started (nothing generated or billed by a reload)', B.E('window.__ai'), 0);
    c('…no scroll, and the focus did not move', [B.net.scrolls,B.D.activeElement===focus0], [0,true]);
    // the same spy counts a survey he runs himself: the difference is the quiet flag alone
    B.E(`showHub(); openTool('survey'); showAddressForm();`); B.q('#addr').value='10 Greene Rd, Warminster, PA'; click(B,'#go');
    await until(()=>B.E('window.__ai')>0,3000);
    c('(a survey he runs himself still starts them, as before)', B.E('window.__ai'), 1);
    c('no errors', B.errs, []);
    B.w.close(); }

  console.log('\n-- a church never mapped on this device --');
  { const N=page({store:store(''),recent:['10 Greene Rd, Warminster, PA','200 Main St, Norristown, PA']});
    await until(()=>!N.q('#hub').hidden);
    N.E(`openTool('case')`); await sleep(60);
    c('one short card instead of the survey’s address box', [N.q('.ask').style.display,N.txt('#casep .home-first h3')], ['none','First, map your church’s neighbourhood']);
    c('…one button, to the Community Survey', N.qa('#casep .home-first .home-acts button').map(b=>b.textContent), ['Open the Community Survey']);
    c('…with the Recent addresses', N.qa('#casep .home-first [data-home-act="recent"]').map(b=>b.textContent), ['10 Greene Rd, Warminster, PA','200 Main St, Norristown, PA']);
    c('…the sample stays', !!N.q('#casep [data-cs-sample]'), true);
    c('…no church line, and nothing was looked up', [N.q('#homeline').hidden,N.net.census.length], [true,0]);
    click(N,'#casep [data-home-act="recent"]');
    c('a Recent address loads right here, quietly', await until(()=>!!N.q('#cs-s1')), true);
    c('…the church now remembers it', [N.J('uChurch().address'),N.txt('#homeline')], [ADDR,'Bucks County SDA · 10 Greene Rd, Warminster, PA 18974 · Change church']);
    c('no errors', N.errs, []);
    N.w.close(); }
  { const N=page({store:store('')});
    await until(()=>!N.q('#hub').hidden);
    N.E(`openTool('case')`); await sleep(60);
    c('no Recent addresses: the card without them', [!!N.q('#casep .home-first'),N.qa('#casep [data-home-act="recent"]').length], [true,0]);
    click(N,'#casep [data-home-act="survey"]');
    c('"Open the Community Survey" opens its address box, ready to type', [N.E('TOOL'),N.q('.ask').style.display,N.D.activeElement===N.q('#addr')], ['survey','',true]);
    N.w.close(); }

  console.log('\n-- when the survey cannot be loaded --');
  { const F=page({store:store(ADDR),mode:'down'});
    await until(()=>!F.q('#hub').hidden);
    F.E(`openTool('case')`);
    c('one plain sentence, never a blank tool', await until(()=>!!F.q('#casep .home-fail')), true);
    c('…it says what happened', F.txt('#casep .home-fail p'), 'Terrain could not load the Community Survey for Bucks County SDA just now: the connection or the Census may be down.');
    c('…Try again and Change church', F.qa('#casep .home-fail button').map(b=>b.textContent), ['Try again','Change church']);
    c('…the sample still there; no address box; the church line gives way to the card', [!!F.q('#casep [data-cs-sample]'),F.q('.ask').style.display,F.q('#homeline').hidden], [true,'none',true]);
    F.net.mode='ok';
    click(F,'#casep [data-home-act="retry"]');
    c('Try again loads it', await until(()=>!!F.q('#cs-s1')), true);
    c('…and the line is back', F.txt('#homeline'), 'Bucks County SDA · 10 Greene Rd, Warminster, PA 18974 · Change church');
    c('no errors', F.errs, []);
    F.w.close(); }
  { const G=page({store:store(ADDR),mode:'noreg'});
    await until(()=>!G.q('#hub').hidden);
    G.E(`openTool('case')`);
    await until(()=>!!G.q('#casep .home-fail'));
    c('a refused registration (401 noreg, renewal failed) is named', G.txt('#casep .home-fail p'), 'Terrain could not confirm your registration just now, so the Community Survey for Bucks County SDA did not load.');
    c('…after one quiet attempt to renew it', G.net.register>=1, true);
    c('…and the first page does not reopen over a registered pastor', [G.E('gated()'),G.q('#gate').hidden], [false,true]);
    G.w.close(); }
  { const S=page({store:store(ADDR),mode:'down',lang:'es'});
    await until(()=>!S.q('#hub').hidden);
    S.E(`openTool('case')`);
    await until(()=>!!S.q('#casep .home-fail'));
    c('in Spanish: the sentence and its buttons', [S.txt('#casep .home-fail p'),S.qa('#casep .home-fail button').map(b=>b.textContent)],
      ['Terrain no pudo cargar la Encuesta Comunitaria de Bucks County SDA en este momento: puede que falle la conexión o el Censo.',['Intentar de nuevo','Cambiar de iglesia']]);
    S.w.close(); }

  console.log('\n-- Change church --');
  { const C=page({store:store(ADDR),mode:'hold'});
    await until(()=>!C.q('#hub').hidden);
    C.E(`openTool('case')`);
    await until(()=>C.net.held.length>0);
    click(C,'#homeline [data-home-act="change"]');
    c('"Change church" opens the Community Survey’s address box, empty and ready', [C.E('TOOL'),C.q('.ask').style.display,C.q('#addr').value,C.D.activeElement===C.q('#addr')], ['survey','','',true]);
    C.release(); await sleep(250);
    c('…the load he left behind is dropped: nothing appears under the box', [C.E('!!DATA'),C.q('#report').classList.contains('show'),C.q('.ask').style.display], [false,false,'']);
    C.w.close(); }
  { const C=page({store:store(ADDR)});
    await until(()=>!C.q('#hub').hidden);
    C.E(`openTool('case')`); await until(()=>!!C.q('#cs-s1'));
    click(C,'#homeline [data-home-act="change"]');
    c('with the survey on screen: the survey, its report, and the address box above it', [C.E('TOOL'),C.q('.ask').style.display,C.q('#report').classList.contains('show'),C.q('#homeline').hidden], ['survey','',true,true]);
    C.w.close(); }
  { const T=page({store:store(ADDR),mode:'hold'});
    await until(()=>!T.q('#hub').hidden);
    T.E(`openTool('case')`);
    await until(()=>T.net.held.length>0);
    T.E(`showHub(); openTool('survey');`);
    T.q('#addr').value='200 Main St'; T.q('#addr').focus();
    T.release(); await sleep(250);
    c('a quiet load never takes the address box from under his typing', [T.E('!!DATA'),T.q('.ask').style.display,T.q('#addr').value], [false,'','200 Main St']);
    T.w.close(); }

  console.log('\n-- the Planner, Spiritual Gifts, the hub --');
  { const L=page({store:store(ADDR),mode:'hold'});
    await until(()=>!L.q('#hub').hidden);
    L.E(`openTool('planner')`);
    await until(()=>L.net.held.length>0);
    c('the Planner’s place loads the remembered church too', L.txt('#pplace .home-load'), 'Loading the Community Survey for Bucks County SDA…');
    L.release();
    c('…then the place, from the survey', await until(()=>/The place · from the survey/.test(L.txt('#pplace')||'')), true);
    c('…and the report stays out of sight behind the Planner', [L.q('#report').classList.contains('show'),L.q('#secnav').hidden,L.q('#changech').hidden,L.q('#homeline').hidden], [false,true,true,true]);
    L.w.close(); }
  { const G=page({store:store(ADDR)});
    await until(()=>!G.q('#hub').hidden);
    G.E(`openTool('gifts')`);
    c('Spiritual Gifts with no neighbourhood kept yet loads it', await until(()=>G.E('!!DATA')), true);
    await sleep(100);
    c('…keeps the needs for its links, and keeps the report out of sight', [G.J(`Array.isArray((uChurch().share.needs||{}).list)`),G.q('#report').classList.contains('show')], [true,false]);
    G.w.close(); }
  { const G=page({store:store(ADDR,{share:{needs:{list:[{id:'child-poverty',v:20}],area:'Census Tract 1012.02',year:2024,date:'2026-09-01'}}})});
    await until(()=>!G.q('#hub').hidden);
    G.E(`openTool('gifts')`); await sleep(200);
    c('…but with its own copy it asks the Census for nothing', G.net.census.length, 0);
    G.w.close(); }
  { const H=page({store:store(ADDR),session:'',url:'https://pastorshub.org/#a='+encodeURIComponent('10 Greene Rd, Warminster, PA')});
    c('a reload on the hub loads the figures quietly', await until(()=>H.E('!!DATA')), true);
    await sleep(100);
    c('…and stays on the hub, the report out of sight', [H.q('#hub').hidden,H.q('#report').classList.contains('show'),H.E('TOOL')], [false,false,null]);
    H.E(`openTool('case')`);
    c('…Make the Case then opens at once, nothing to load', [!!H.q('#cs-s1'),H.q('#casep').hidden,H.txt('#homeline')], [true,true,'Bucks County SDA · 10 Greene Rd, Warminster, PA 18974 · Change church']);
    H.w.close(); }

  console.log('\n-- what stays as it was --');
  { const S=page({store:store(ADDR)});
    await until(()=>!S.q('#hub').hidden);
    S.E(`openTool('survey')`); await sleep(100);
    c('the Community Survey itself: its address box, and it waits for an address', [S.q('.ask').style.display,S.net.census.length,S.q('#homeline').hidden], ['',0,true]);
    S.w.close(); }
  { const Fl=page({store:store(ADDR),url:'https://pastorshub.org/?flat=1'});
    await sleep(1500);
    c('the flat one-page view: the address box on top, no church line, nothing loaded by itself', [Fl.q('.ask').style.display,Fl.q('#homeline').hidden,Fl.net.census.length,Fl.q('#casep').hidden], ['',true,0,true]);
    c('…and no errors', Fl.errs, []);
    Fl.w.close(); }
  { const Fr=page({store:store(ADDR),url:'https://pastorshub.org/?tier=free'});
    await until(()=>!Fr.q('#hub').hidden);
    Fr.E(`openTool('case')`); await sleep(150);
    c('?tier=free: Make the Case shows its lock, loads nothing, no church line', [!!Fr.q('#locked [data-lock="case"]'),Fr.net.census.length,Fr.q('#homeline').hidden], [true,0,true]);
    Fr.w.close(); }

  console.log('\n-- who you are making the case to: every department --');
  // Updated v10.41 (the pastor: "'Who are you making the case to?' should be first… The sections are meshed
  // together — Board & officers should be a different colour"): the groups are step 1, in coloured sections with
  // a dot and the name (the approved mockup), one short line under the title; tests/case-steps.test.js covers the
  // sections, sub-headings and the groups builder D adds.
  const P=page({store:store(ADDR),session:'case'});
  await until(()=>!!P.q('#cs-s1 .cs-atile'));
  const G=P.J(`CASE_GROUPS.map(g=>({id:g.id,type:g.type,en:g.en}))`);
  // v10.41 integration: builder D's eleven groups are real now (the pastor: "all the things we would have as a
  // denomination … We also have an evangelism team" and "we can appeal to the conference leaders for an EVANGELISM
  // proposal"): 34 groups, and the conference in its own section.
  c('34 groups in CASE_GROUPS: 6 board, 26 team, 1 congregation, 1 conference', [G.length,G.filter(g=>g.type==='board').length,G.filter(g=>g.type==='team').length,G.filter(g=>g.type==='congregation').length,G.filter(g=>g.type==='conference').length], [34,6,26,1,1]);
  c('step 1 shows before anything is chosen: no department behind another choice', [P.J('casePrefs().ministry'),P.q('#cs-s1').hidden], [null,false]);
  c('…“Who is it for?”', P.q('#cs-s1 h3').lastChild.textContent, 'Who is it for?');
  c('…all 23 as tiles', P.qa('#cs-s1 .cs-atile').map(b=>b.dataset.csGroup).sort(), G.map(g=>g.id).sort());
  c('…each a coloured dot and the group’s name', P.qa('#cs-s1 .cs-atile').map(b=>[!!b.querySelector('.cs-adot'),b.querySelector('b').textContent]).sort(), G.map(g=>[true,g.en]).sort());
  c('…in sections, each in its own colour', P.qa('#cs-s1 .cs-aud').map(s=>[s.querySelector('h4').textContent,s.getAttribute('style'),s.querySelectorAll('.cs-atile').length]),
    [['Decide','--g:var(--m-hardship)',6],['Ministry teams','--g:var(--m-children)',26],['On Sabbath','--g:var(--m-language)',1],['The conference','--g:var(--m-housing)',1]]);   // v10.41 integration, see above
  c('…buttons, none chosen yet, and no emoji', [P.qa('#cs-s1 .cs-atile').every(b=>b.tagName==='BUTTON'&&b.type==='button'&&b.getAttribute('aria-pressed')==='false'),/[\u{1F300}-\u{1FAFF}⚖]/u.test(P.txt('#cs-s1'))], [true,false]);
  // the floor is the tallest tile of all (--atile-h, set by caseAudEqual), 54px before it is measured
  c('…tiles share one height rule (a floor for the shortest, measured)', [/\.cs-atile\{[^}]*min-height:var\(--atile-h,54px\)/.test(html),P.E('typeof caseAudEqual')], [true,'function']);
  click(P,'[data-cs-group="deacons"]');
  c('one tap on Deacons & deaconesses chooses the group and its kind', P.J('casePrefs()'), {ministry:null,type:'board',group:'deacons',plan:false});
  c('…one tile pressed', P.qa('#cs-s1 [aria-pressed="true"]').map(b=>b.dataset.csGroup), ['deacons']);
  // v10.42: the pastor (29 Sep 2026, section F, approved): "Why is there another section in Make the Case giving us another option for more ministries to do? Is this redundant or necessary?" The group is named by "More ideas for {group}" now (the step's line says where support is won)
  c('…step 2 names them, and the step bar moves on', [P.txt('#cs-more h4'),P.qa('#cs-bar .cs-st').map(b=>b.className.replace('cs-st ',''))], ['More ideas for the deacons and deaconesses',['done','now','next']]);   // v10.41.1: English articles, as the Spanish
  c('…saved for this church', JSON.parse(P.w.localStorage.getItem('terrain-churches-v1')).churches['church-1'].proposalPrefs, {type:'board',group:'deacons'});
  click(P,'[data-cs-group="smallgroups"]');
  c('another tap moves it across sections: small group leaders, a ministry team', [P.J('casePrefs().type'),P.J('casePrefs().group'),P.qa('#cs-s1 [aria-pressed="true"]').length], ['team','smallgroups',1]);
  P.E(`caseChoose('food-pantry')`);
  c('choosing a ministry then shows the slides for that group', [P.q('#cs-s3').hidden,P.J('caseCurrentDeck().audience'),!!P.q('#cs-s3 [data-cs-act="sample"]')], [false,{type:'team',group:'smallgroups'},true]);
  { const R=page({store:P.w.localStorage.getItem('terrain-churches-v1'),session:'case'});
    await until(()=>!!R.q('#cs-s3 .cs-pv'));
    c('after a reload the same tile is pressed and the slides are back', [R.qa('#cs-s1 [aria-pressed="true"]').map(b=>b.dataset.csGroup),R.J('caseCurrentDeck().audience')], [['smallgroups'],{type:'team',group:'smallgroups'}]);
    R.w.close(); }
  c('no errors', P.errs, []);
  P.w.close();

  console.log('\n-- in Spanish --');
  { const S=page({store:store(ADDR),session:'case',lang:'es'});
    await until(()=>!!S.q('#cs-s1 .cs-atile'));
    const es=S.J(`CASE_GROUPS.map(g=>g.es)`);
    c('the heading, the sections and every tile', [S.q('#cs-s1 h3').lastChild.textContent,S.qa('#cs-s1 .cs-aud h4').map(h=>h.textContent),S.qa('#cs-s1 .cs-atile b').map(b=>b.textContent).sort()],
      ['¿Para quién es?',['Quienes deciden','Equipos de ministerio','En sábado','La asociación'],es.slice().sort()]);   // v10.41 integration: the conference section
    c('…the church line', S.txt('#homeline'), 'Bucks County SDA · 10 Greene Rd, Warminster, PA 18974 · Cambiar de iglesia');
    const txt=S.txt('#cs-s1')+' '+S.txt('#homeline');
    c('…no English left in step 1 or the line', ['Who ','Board &','Ministry teams','The whole church','Tap the group','A decision','An invitation','On Sabbath','Change church','Decide'].filter(t=>txt.includes(t)), []);
    click(S,'[data-cs-group="community"]');
    // v10.41 final review: after "para" a Spanish group name takes its article ("Ideas para Club de Conquistadores" read wrong)
    // v10.42: the pastor (29 Sep 2026, section F, approved): "Why is there another section in Make the Case giving us another option for more ministries to do? Is this redundant or necessary?" "Más ideas para {group}" carries the group and its article now
    c('…one tap there too', [S.J('casePrefs().group'),S.txt('#cs-more h4')], ['community','Más ideas para los Servicios Comunitarios Adventistas (Dorcas)']);
    c('no errors in Spanish', S.errs, []);
    S.w.close(); }
  { const S=page({store:store(''),lang:'es',recent:['10 Greene Rd, Warminster, PA']});
    await until(()=>!S.q('#hub').hidden);
    S.E(`openTool('case')`); await sleep(60);
    c('the first-time card in Spanish', [S.txt('#casep .home-first h3'),S.qa('#casep .home-first .home-acts button').map(b=>b.textContent),S.txt('#casep .home-first .rlab')],
      ['Primero, trace el mapa del vecindario de su iglesia',['Abrir la Encuesta Comunitaria'],'O una que ya mapeó:']);
    S.w.close(); }
  { const S=page({store:store(ADDR),lang:'es',mode:'hold'});
    await until(()=>!S.q('#hub').hidden);
    S.E(`openTool('case')`); await until(()=>S.net.held.length>0);
    c('the loading line in Spanish', S.txt('#casep .home-load'), 'Cargando la Encuesta Comunitaria de Bucks County SDA…');
    S.w.close(); }

  console.log('\n-- every new string has its Spanish --');
  { const S=page(); await sleep(900);
    // v10.41: CASE_AUD_UI gave way to the step tables (CASE_STEP_UI, CASE_AUD_SECTIONS, CASE_AUD_SUBS, CASE_AUD_NOTE)
    const miss=S.J(`[...Object.entries(HOME_UI),...Object.entries(CASE_STEP_UI),...CASE_AUD_SECTIONS.map(v=>[v.id,v]),...Object.entries(CASE_AUD_SUBS),...Object.entries(CASE_AUD_NOTE)].filter(([k,v])=>!v.en||!v.es||v.en===v.es&&!/^Toda/.test(v.es)).map(([k])=>k)`);
    c('HOME_UI and the step tables: English and Spanish for each', miss, []);
    c('Census addresses read as words', S.J(`[homeAddr('10 GREENE RD, WARMINSTER, PA, 18974'),homeAddr('1250 N MAIN ST NE, NORRISTOWN, PA, 19401-1234'),homeAddr('10 Greene Rd, Warminster, PA'),homeAddr('Coordinates -75.1,40.2')]`),
      ['10 Greene Rd, Warminster, PA 18974','1250 N Main St NE, Norristown, PA 19401-1234','10 Greene Rd, Warminster, PA','the place you mapped']);
    S.w.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); });
