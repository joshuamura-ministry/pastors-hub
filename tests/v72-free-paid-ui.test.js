// v10.72.0 · the free version and the full version on the page, once payments are on. The pastor (6 Nov 2026), to the audit report's
// split ("the free version shows the problem clearly; the paid version is the only way to answer it"): "Yes". Free: the whole survey
// report and the TITLES of the needs; Spiritual Gifts "Take it yourself" and your own report. Paid: a need opened, the ideas, the
// sheets, the PDFs, the proposal; Spiritual Gifts for the whole church; Make the Case, the Planner, the conferences, Compare your
// churches, the Church Directory. The page sends Terrain's session to every call the server now gates (x-terrain-session), a plan
// opens the Claude features without a tester code (aiOn), a 402 asks for the plan again, a 429 limit-plan says so. account.mjs and
// every function stood in (nothing real is called). Written failing-first on v10.71.0.
const {JSDOM,VirtualConsole}=require('jsdom');
const {HTML,REG,sleep,until,checker}=require('./v45-helpers.js');
const H=require('./fixtures.json');
const T=checker(), c=T.c;
const SESS='s1.dWlkLTE.zzzzzz.'+'A'.repeat(43);
const INFO=o=>Object.assign({fn:'account-1.1',auth:true,fb:{apiKey:'AIzaSyTESTtestTESTtestTESTtest12345',authDomain:'terrain-live.firebaseapp.com',projectId:'terrain-live'},billing:'on',mode:'test',checkout:true,trialDays:14,
  prices:{year:{amount:12000,currency:'usd'},month:{amount:1200,currency:'usd'}},claudeDay:6,trialClaudeDay:3},o||{});
const PLAN=o=>Object.assign({full:true,status:'active',interval:'year',end:Date.now()+300*864e5,trialEnd:null,cancelAtEnd:false,trialUsed:true,billing:true},o||{});
/* a page: billing on; o.plan the plan account.mjs answers (null: none); o.store extra localStorage; o.fns {name: (body, req) => {status, json}} */
function pg(o){
  o=o||{};
  const S={calls:[], hdrs:[], plan:o.plan===undefined?null:o.plan};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(HTML,{runScripts:'dangerously',url:o.url||'https://terrain.church/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(w.HTMLDialogElement){ w.HTMLDialogElement.prototype.showModal=function(){ this.setAttribute('open',''); };
        w.HTMLDialogElement.prototype.close=function(){ this.removeAttribute('open'); this.dispatchEvent(new w.Event('close')); }; }
      w.localStorage.setItem('terrain-reg',JSON.stringify(Object.assign({},REG,{tok:'r1.AbCdEfGhIjKl.zzzz.'+'B'.repeat(32)})));
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      if(S.plan){ w.localStorage.setItem('terrain-session',SESS); w.localStorage.setItem('terrain-plan',JSON.stringify({email:'jm@example.org',plan:S.plan,at:Date.now()})); }
      for(const [k,v] of Object.entries(o.store||{})) w.localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));
      w.fetch=async(u,f)=>{ u=String(u); const m=/\/\.netlify\/functions\/([a-z-]+)/.exec(u); const name=m?m[1]:'';
        const hd=(f&&f.headers)||{}; let body=null; try{ body=f&&f.body?JSON.parse(f.body):null; }catch(e){}
        S.calls.push({name,method:(f&&f.method)||'GET',op:body&&(body.op||body.mode)||'',sess:hd['x-terrain-session']||'',pass:hd['x-terrain-pass'],reg:hd['x-terrain-reg']||''});
        if(name==='account'){
          if(!f||!f.method||f.method==='GET') return {ok:true,status:200,json:async()=>INFO(o.info)};
          if(body&&body.op==='plan'){ const p=typeof S.plan==='function'?S.plan():S.plan; if(!p) return {ok:false,status:401,json:async()=>({ok:false,code:'bad-session'})}; return {ok:true,status:200,json:async()=>({ok:true,email:'jm@example.org',plan:p})}; }
          return {ok:false,status:400,json:async()=>({ok:false,code:'bad-op'})}; }
        if(name==='census'&&/check=1/.test(u)) return {ok:true,status:200,json:async()=>({required:false,ok:true,name:''})};
        if(o.fns&&o.fns[name]){ const r=o.fns[name](body,{u,hd,method:(f&&f.method)||'GET'}); return {ok:r.status<300,status:r.status,json:async()=>r.json,text:async()=>JSON.stringify(r.json)}; }
        if(name==='advise'&&(!f||!f.method||f.method==='GET')) return {ok:true,status:200,json:async()=>({enabled:true,locked:true,needs:true,ideas:true,case:true,prices:true,fn:'advise-2.8'})};
        if(name==='gifts') return {ok:true,status:200,json:async()=>({ok:true,fn:'gifts-1.4',email:false})};
        if(/ideas\/|conferences\//.test(u)) return {ok:false,status:404,json:async()=>null,text:async()=>''};
        return new Promise(()=>{}); };
    }});
  const w=dom.window;
  return {w,S,errs,E:s=>w.eval(s),q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
    txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
const ready=async P=>{ await until(()=>P.E('typeof acctBoot==="function"&&ACCT.booted')); await sleep(250); };
const survey=P=>{ P.E('DATA='+JSON.stringify(H.DATA)+';DATA.geo={matched:"118 Bristol Rd, Warminster, PA 18974"};SCOPE="tract"; CAP=null; capSave('+JSON.stringify(H.MEDIUM)+'); render(); openTool("survey");'); };   // a state in the address: the needs study needs one (nsAiPlace)
const click=async(P,s)=>{ const b=P.q(s); if(!b) throw new Error('no '+s); b.click(); await sleep(60); };

(async()=>{ await T.sec(async()=>{
  console.log('-- payments on, no plan: the free version --');
  { const P=pg(); await ready(P);
    c('the version stamps agree', P.E('VERSION'), (HTML.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
    c('no boot errors', P.errs, []);
    c('the tier is free', P.E('currentTier()'), 'free');
    c('the directory is a feature of the full version; the survey free', [P.E("entitled('directory')"), P.E("entitled('survey')"), P.E("FEATURES.directory.tier")], [false,true,'full']);
    c('every feature has its Spanish name and line', P.E("Object.values(FEATURES).every(f=>f.tier==='free'||(f.es&&f.es.name&&f.es.blurb))"));
    P.E('wireHub()');
    const tags=P.qa('.tool, #hubdir').map(t=>[t.dataset.tool||t.id,!!t.querySelector('.tlock')]);
    c('the hub tags the paid tools and the directory; not the survey, not Spiritual Gifts (its own report is free)', tags, [['survey',false],['gifts',false],['case',true],['planner',true],['compare',true],['churches',true],['hubdir',true]]);
    survey(P);
    const shown=P.qa('#sections section.blk').filter(s=>!s.classList.contains('offtab')).map(s=>s.querySelector('h2').textContent);
    c('the whole report shows (Economy, People, Churches nearby) and ends on the lock', [shown.includes('Economy')&&shown.includes('People')&&shown.includes('Churches nearby'), shown[shown.length-1]], [true,'Beyond the survey']);
    c('the needs: every title, nothing open', [P.qa('#u-needs .ns-need').length>0, P.qa('#u-needs .ns-need.open').length, P.qa('#u-needs .ns-figs').length], [true,0,0]);
    await click(P,'#u-needs .ns-head');
    c('a need tapped opens to the lock: no figures, no Where to begin, no ideas button', [!!P.q('#u-needs .ns-need.open .lock[data-lock="plan"]'), P.qa('#u-needs .ns-need.open .ns-figs').length, P.qa('#u-needs .ns-need.open h5').length, P.qa('#u-needs .ns-need.open .ns-show').length], [true,0,0,0]);
    c('…the lock names the full version and offers the trial', [/is part of the full version/.test(P.txt('#u-needs .ns-need.open .lock')), P.qa('#u-needs .ns-need.open .lock [data-acct-trial]').length], [true,1]);
    c('the lock says what the free version holds: the survey and your own Spiritual Gifts report', /The free version includes the Community Survey and your own Spiritual Gifts report/.test(P.txt('#u-needs .ns-need.open .lock')));
    P.E('openTool("gifts")');
    c('Spiritual Gifts opens (no lock over the whole tool)', [!P.q('#locked')||P.q('#locked').hidden, P.q('#gifts').hidden], [true,false]);
    c('…the two big buttons are there', P.qa('#gifts .gfbigb').map(b=>b.dataset.gv), ['setup','take']);
    c('…the results and Fill the positions are the lock', [!!P.q('#gf-results .lock[data-lock="gifts"]'), P.qa('#gf-positions').length, P.qa('#gfteam').length], [true,0,0]);
    await click(P,'#gifts .gfbigb[data-gv="setup"]');
    c('Send to members: stays on the landing (the lock), no campaign asked of the server', [P.E('GF_VIEW'), P.S.calls.filter(x=>x.name==='gifts'&&x.op==='id').length], ['roster',0]);
    await click(P,'#gifts .gfbigb[data-gv="take"]');
    c('Take it yourself: the assessment opens', [P.E('GF_VIEW'), /Discover Your Spiritual Gifts/.test(P.txt('#gifts'))], ['take',true]);
    P.E('GF_VIEW="roster"; gfRender(); gfInviteChurch()');
    c('gfInviteChurch (from the survey\'s button) lands on the landing, not the setup', P.E('GF_VIEW'), 'roster');
    P.E('dirOpen()');
    c('the directory opens to the lock', [!!P.q('#dir-sheet[open] .lock[data-lock="directory"]'), P.qa('#dir-sheet .dir-list').length], [true,0]);
    c('a plan unlocks nothing here: aiOn is false without a code or a plan', P.E('aiOn()'), false);
    c('no call carried a session (there is none)', P.S.calls.every(x=>!x.sess)); }

  console.log('\n-- Spanish: the lock in Spanish --');
  { const P=pg({lang:'es'}); await ready(P); survey(P);
    await click(P,'#u-needs .ns-head');
    const t=P.txt('#u-needs .ns-need.open .lock');
    c('the lock\'s words are Spanish', [/Versión completa/.test(t), /es parte de la versión completa/.test(t), /La versión gratuita incluye/.test(t), /prueba gratis/.test(t)], [true,true,true,true]);
    P.E('wireHub()');
    c('the hub tags in Spanish', [...new Set(P.qa('.tlock').map(e=>e.textContent))], ['Versión completa']); }

  console.log('\n-- a plan: the full version, the session sent to every gated call, Claude open without a code --');
  { const calls={}; const fns={
      gifts:(b)=>b&&b.op==='id'?{status:200,json:{ok:true,pub:'PubAbCdEfGh1',key:'K'.repeat(32)}}:{status:200,json:{ok:true,fn:'gifts-1.4',email:false}},
      connect:(b)=>({status:200,json:{ok:true,id:'CardIdAbCdEf',key:'C'.repeat(32),v:1}}),
      present:(b)=>({status:200,json:{ok:true,fn:'present-1.5',live:false,fb:'unset',codeRequired:false,regRequired:true,room:'RoomAbCdEf01',key:'R'.repeat(32),code:'ABC123',expires:Date.now()+864e5,v:1,n:1,url:'https://terrain.church/#watch=RoomAbCdEf01',mode:'free',pdf:true}}),
      digital:(b,r)=>({status:200,json:{ok:true,fn:'digital-1.3',conf:'Pennsylvania',supported:true,enabled:true,places:true,search:false,review:true,state:'ready',findings:{conf:'Pennsylvania',at:Date.now(),churches:[]}}}),
      advise:(b)=>b&&b.mode==='needs'?{status:429,json:{ok:false,code:'limit-plan',retryAfter:3600,max:6}}:{status:200,json:{enabled:true,locked:true,needs:true,ideas:true,case:true,prices:true,fn:'advise-2.8'}}};
    const P=pg({plan:PLAN(),fns}); await ready(P);
    c('the tier is full', P.E('currentTier()'), 'full');
    c('aiOn: a plan opens the Claude features on this device, with no code kept', [P.E('aiOn()'), P.E('aiPass()')], [true,'']);
    c('sessHdr carries the session', P.E('JSON.stringify(sessHdr())'), JSON.stringify({'x-terrain-session':SESS}));
    P.E('wireHub()');
    c('no tag on the hub', P.qa('.tlock').length, 0);
    survey(P);
    await click(P,'#u-needs .ns-head');
    c('a need opens whole: its figures, Where to begin, the ideas button', [P.qa('#u-needs .ns-need.open .ns-figs').length>0, P.qa('#u-needs .ns-need.open .ns-show').length], [true,1]);
    await until(()=>P.S.calls.some(x=>x.name==='advise'&&x.op==='needs'),4000);
    const nd=P.S.calls.find(x=>x.name==='advise'&&x.op==='needs');
    c('the needs study was asked with the session and an empty code', [!!nd, nd&&nd.sess, nd&&nd.pass], [true,SESS,'']);
    await until(()=>/used up/.test(P.txt('#ns-aistat')||''),4000);
    c('429 limit-plan: the status line says the day\'s studies on the plan are used up (6)', /Today’s 6 studies on your plan are used up/.test(P.txt('#ns-aistat')||''));
    P.E('openTool("gifts")');
    c('Spiritual Gifts whole: the results card, Fill the positions', [P.qa('#gf-results .lock').length, P.qa('#gf-positions').length], [0,1]);
    await P.E('gfCampaign(null)');
    const id=P.S.calls.find(x=>x.name==='gifts'&&x.op==='id');
    c('op id carries the session and the registration', [id&&id.sess, !!(id&&id.reg)], [SESS,true]);
    await P.E('cnCall("create",{card:{}},true).catch(()=>null)');
    const cr=P.S.calls.find(x=>x.name==='connect'&&x.op==='create');
    c('connect create carries the session', cr&&cr.sess, SESS);
    await P.E('prCall("open",{deck:{}},{pastor:true}).catch(()=>null)');
    const op=P.S.calls.find(x=>x.name==='present'&&x.op==='open');
    c('present open carries the session', op&&op.sess, SESS);
    await P.E('prCall("status",{},{}).catch(()=>null)');
    c('…a member\'s op does not', P.S.calls.find(x=>x.name==='present'&&x.op==='status').sess, '');
    await P.E('dfLoad("Pennsylvania",true)');
    const dg=P.S.calls.find(x=>x.name==='digital'&&x.method==='GET');
    c('the findings are asked with the session', dg&&dg.sess, SESS);
    P.E('dirOpen()');
    c('the directory opens whole', [P.qa('#dir-sheet[open] .lock').length, !!P.q('#dir-sheet .dir-acts')], [0,true]);
    c('no boot errors', P.errs, []); }

  console.log('\n-- the plan ends under the page: a 402 asks account.mjs again and the page locks --');
  { let gone=false; const fns={gifts:(b)=>b&&b.op==='id'?{status:402,json:{ok:false,error:'plan'}}:{status:200,json:{ok:true,fn:'gifts-1.4',email:false}}};
    const P=pg({plan:()=>gone?null:PLAN(),fns}); await ready(P);
    c('full at first (the plan kept on the device)', P.E('currentTier()'), 'full');
    gone=true;
    let err=null; try{ await P.E('gfCampaign(null)'); }catch(e){ err=e; }
    await sleep(300);
    c('the server said 402 plan: the plan was asked again, the session forgotten (401), the tier free', [P.S.calls.filter(x=>x.name==='account'&&x.op==='plan').length>=2, P.E('currentTier()'), P.E('acctSession()')], [true,'free','']);
    c('the error has words', P.E("gfErrText({code:'plan'})"), 'This is part of the full version. Choose a plan under Account.'); }

  console.log('\n-- the plan sheet names what the full version holds, with the new prices --');
  { const P=pg(); await ready(P);
    P.E("acctShow('plans')"); await sleep(50);
    const t=P.txt('#acct-sheet');
    c('$120 a year · 2 months free; $12 a month', [/\$120 a year · 2 months free/.test(t), /\$12 a month/.test(t)], [true,true]);
    c('the line names Compare your churches, the Church Directory and the studies written for your town', [/Compare your churches/.test(t), /Church Directory/.test(t), /written for your town/.test(t)], [true,true,true]); }
}); T.done(); })();
