// v10.38.0 review — the first page and registration, after independent
// security and product reviews. Runs the page against the real register.mjs,
// census.mjs and gifts.mjs with in-memory stores; the Census itself is stubbed.
//   S2  registration checked on the server (TERRAIN_REG_SECRET): a token,
//       sent with Census calls and gifts links, renewed quietly
//   S3  "Welcome back" from this device, not from the server
//   S7  the page checks addresses exactly as the server does; a stored one
//       the server refuses reopens the form
//   S11 invisible format characters stripped; names and churches need a letter
//   P2  a field's message sits under the field; P3 the chosen box's heading
//       in view, instantly; P7 ES/EN keeps a half-typed registration;
//   P8  Spanish wording; P9 what Terrain is, and the privacy note; P10 the
//       swipe note only when the map is wider than its frame
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,300));fail++}else pass++};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=4000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await wait(15); } return false; }

function makeStore(){
  const m=new Map(); let n=0;
  return { m,
    async get(k){ const v=m.get(k); return v===undefined?null:JSON.parse(v.data); },
    async getWithMetadata(k){ const v=m.get(k); return v?{data:JSON.parse(v.data),etag:v.etag,metadata:{}}:null; },
    async setJSON(k,val,o={}){ const cur=m.get(k);
      if(o.onlyIfNew&&cur) return {modified:false};
      if(o.onlyIfMatch&&(!cur||cur.etag!==o.onlyIfMatch)) return {modified:false};
      m.set(k,{data:JSON.stringify(val),etag:'e'+(++n)}); return {modified:true}; },
    async delete(k){ m.delete(k); },
    async list({prefix=''}={}){ return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}; },
    peekEmail(e){ for(const v of m.values()){ const r=JSON.parse(v.data); if(r&&r.email===e) return r; } return null; } };
}
const SECRET='page-test-secret-0123456789-abcdefghijk';
const RE_TOK=/^r1\.[A-Za-z0-9_-]{12}\.[0-9a-z]{1,9}\.[A-Za-z0-9_-]{32}$/;

(async()=>{ try{
  for(const k of ['TERRAIN_ADMIN_KEY','TERRAIN_CODES','TERRAIN_REQUIRE_CODE','TERRAIN_REG_SECRET','RESEND_API_KEY','GIFTS_FROM']) delete process.env[k];
  const regStore=makeStore(), giftsStore=makeStore();
  globalThis.__terrainRegStore=regStore; globalThis.__terrainGiftsStore=giftsStore;
  // census.mjs fetches the Census from Node: stubbed, counted.
  const upstream=[];
  globalThis.fetch=async u=>{ upstream.push(String(u)); return {ok:true,status:200,text:async()=>'[["NAME","B01003_001E"],["Tract 1","1234"]]'}; };
  const fnDir=path.resolve(__dirname,'..','netlify','functions');
  const register=(await import(path.join(fnDir,'register.mjs'))).default;
  const census=(await import(path.join(fnDir,'census.mjs'))).default;
  const gifts=(await import(path.join(fnDir,'gifts.mjs'))).default;
  const allErrs=[];
  // reg: 'server' (the real function) or an HTTP status / 'down'.
  function page(url,{reg='server',lang,storage={},session={}}={}){
    const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message)); allErrs.push(errs);
    const net={register:[],census:[],gifts:[],scrolls:[]};
    const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{};
        w.Element.prototype.scrollIntoView=function(o){ net.scrolls.push({id:this.id||'',cls:this.className||'',o:o||null}); };
        if(lang) w.localStorage.setItem('terrain-lang',lang);
        for(const [k,v] of Object.entries(storage)) w.localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));
        for(const [k,v] of Object.entries(session)) w.sessionStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));
        Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async()=>{}},configurable:true});
        w.fetch=async(u,o={})=>{
          u=String(u); const hdr=o.headers||{};
          if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})};
          const to=async(fn,list)=>{ list.push({u,headers:{...hdr},body:o.body?JSON.parse(o.body):null});
            const res=await fn(new Request('https://pastorshub.org'+u,{method:o.method||'GET',headers:hdr,body:o.body}),{ip:'198.51.100.20'});
            const t=await res.text(); return {ok:res.ok,status:res.status,json:async()=>JSON.parse(t),text:async()=>t}; };
          if(/functions\/register/.test(u)){
            if(reg!=='server'){ net.register.push({u,body:JSON.parse(o.body||'{}')}); if(reg==='down') throw new TypeError('Failed to fetch');
              return {ok:false,status:reg,json:async()=>({ok:false,error:'server'})}; }
            return to(register,net.register);
          }
          if(/functions\/census/.test(u)) return to(census,net.census);
          if(/functions\/gifts/.test(u)) return to(gifts,net.gifts);
          return new Promise(()=>{});
        };
      }});
    const w=dom.window, D=w.document;
    return {w,D,E:s=>w.eval(s),errs,net,
      reg:()=>{ try{ return JSON.parse(w.localStorage.getItem('terrain-reg')||'null'); }catch(e){ return null; } },
      gateUp:()=>!D.getElementById('gate').hidden&&D.getElementById('gate').classList.contains('show'),
      hubUp:()=>!D.getElementById('hub').hidden};
  }
  const pick=(P,conf='Pennsylvania')=>{ const b=[...P.D.querySelectorAll('.crow')].find(x=>x.dataset.c===conf); b.click(); };
  const fill=(P,{name='',email='',church=''}={})=>{ const D=P.D;
    D.getElementById('rname').value=name; D.getElementById('remail').value=email; D.getElementById('rchurch').value=church; };
  const submit=P=>P.D.getElementById('rbtn').click();
  const errText=P=>(P.D.getElementById('gerr')||{}).textContent||'';
  const errHome=P=>{ const e=P.D.getElementById('gerr'); if(!e) return ''; const f=e.closest('.regf'); return f?(f.querySelector('input')||{}).id||'regf':(e.closest('.regfoot')?'foot':'?'); };
  const ACS='https://api.census.gov/data/2024/acs/acs5?get=NAME,B01003_001E&for=tract:000100&in=state:42%20county:017&key=x';

  // ================================================== S2 — registration checked on the server
  console.log('-- S2: registration checked on the server (TERRAIN_REG_SECRET) --');
  process.env.TERRAIN_REG_SECRET=SECRET;
  const A=page('https://pastorshub.org/');
  await until(()=>A.gateUp());
  c('the access check says registration is checked', [A.E('ACCESS.regRequired'),A.E('ACCESS.regOk')], [true,false]);
  pick(A); fill(A,{name:'Joshua Mura',email:'pastor.josh@example.org',church:'Bucks County SDA'}); submit(A);
  await until(()=>A.hubUp());
  const RA=A.reg();
  c('registering keeps the server’s token, and the id inside it', [RE_TOK.test(RA.tok),RA.id===RA.tok.split('.')[1],RA.synced], [true,true,true]);
  c('the register answer carried no id or "returning"', A.net.register.length, 1);
  const n0=upstream.length;
  const got=await A.E(`getJSON(${JSON.stringify(ACS)},'Test')`);
  const call0=A.net.census.filter(x=>/cv=2&u=/.test(x.u)).pop();
  c('a Census call goes through the site’s proxy, never direct, with the token', [!!call0,call0&&call0.headers['x-terrain-reg']===RA.tok,upstream.length-n0], [true,true,1]);
  c('and the data comes back', got[1][0], 'Tract 1');

  console.log('\n-- S2: a registration that cannot reach the server lets nobody in --');
  for(const mode of ['down',500,429]){
    const X=page('https://pastorshub.org/',{reg:mode});
    await until(()=>X.gateUp());
    pick(X); fill(X,{name:'Offline Pastor',email:'offline@example.org',church:'Hill SDA'}); submit(X);
    await until(()=>/could not reach its server/.test(errText(X)));
    c(`register ${mode}: still on the form, the reason beside the button, nothing kept`, [X.gateUp(),X.hubUp(),errText(X),errHome(X),X.reg()],
      [true,false,'Terrain could not reach its server to register you. Please try again in a few minutes.','foot',null]);
    c(`register ${mode}: what was typed is still there`, X.D.getElementById('remail').value, 'offline@example.org');
  }

  console.log('\n-- S2: a hand-written registration, or an old token, is registered for real --');
  const fake={name:'Nobody',email:'never@registered.example',church:'None',role:'pastor',conf:'Ohio',union:'Columbia Union',synced:true};
  const H=page('https://pastorshub.org/',{storage:{'terrain-reg':fake}});
  await until(()=>H.hubUp());
  await until(()=>H.reg()&&H.reg().tok);
  c('the hub opens, and the page registers it in the background (the check said regOk:false)', [H.hubUp(),H.net.register.length,RE_TOK.test(H.reg().tok)], [true,1,true]);
  c('so the server has a record for that address after all', !!regStore.peekEmail('never@registered.example'), true);
  const old={...RA,tok:RA.tok.slice(0,-3)+'AAA'};
  const O=page('https://pastorshub.org/',{storage:{'terrain-reg':old}});
  await until(()=>O.hubUp());
  await until(()=>O.reg().tok!==old.tok);
  c('a token the server does not accept is renewed on the next visit', [O.net.register.length,RE_TOK.test(O.reg().tok),O.reg().tok!==old.tok], [1,true,true]);
  const K=page('https://pastorshub.org/',{storage:{'terrain-reg':RA}});
  await until(()=>K.hubUp()); await wait(60);
  c('a good token: nothing sent again', K.net.register.length, 0);

  console.log('\n-- S2: a token refused mid-survey is renewed once, for every call waiting --');
  const M=page('https://pastorshub.org/',{storage:{'terrain-reg':RA}});
  await until(()=>M.hubUp()); await wait(60);
  M.E(`(()=>{ const r=JSON.parse(localStorage.getItem('terrain-reg')); r.tok=r.tok.slice(0,-3)+'BBB'; localStorage.setItem('terrain-reg',JSON.stringify(r)); })()`);
  const many=await M.E(`Promise.all([1,2,3,4,5,6].map(i=>getJSON(${JSON.stringify(ACS)}+'&n='+i,'Part '+i)))`);
  c('six calls refused together: one registration sent, all six answered', [M.net.register.length,many.length,many.every(x=>x[1][0]==='Tract 1')], [1,6,true]);
  c('the new token is kept', [RE_TOK.test(M.reg().tok),!/BBB$/.test(M.reg().tok)], [true,true]);

  console.log('\n-- S2: when it cannot be renewed, the survey says so --');
  const N=page('https://pastorshub.org/',{reg:500,storage:{'terrain-reg':{...RA,tok:RA.tok.slice(0,-3)+'CCC'}}});
  await until(()=>N.hubUp()); await wait(60);
  await N.E(`run(async()=>{ await getJSON(GEOCODER+'/onelineaddress?address=x','Geocoder'); })`);
  c('the survey’s status line: could not confirm your registration', N.D.getElementById('status').textContent, 'Terrain could not confirm your registration just now. Please try again in a few minutes.');
  c('and the pastor stays where he is (no gate)', [N.gateUp(),!!N.reg()], [false,true]);

  console.log('\n-- S2: making a Spiritual Gifts link carries the token, renewed if refused --');
  const G=page('https://pastorshub.org/',{storage:{'terrain-reg':RA}});
  await until(()=>G.hubUp()); await wait(60);
  // The token goes stale after the page has checked it (e.g. the secret was changed).
  G.E(`(()=>{ const r=JSON.parse(localStorage.getItem('terrain-reg')); r.tok=r.tok.slice(0,-3)+'DDD'; localStorage.setItem('terrain-reg',JSON.stringify(r)); })()`);
  const regsBefore=G.net.register.length;
  const camp=await G.E(`gfCampaign().then(x=>x.pub)`);
  const ids=G.net.gifts.filter(x=>x.body&&x.body.op==='id');
  c('the first try is refused (noreg), the registration renewed, the second makes the link', [ids.length,ids.every(x=>RE_TOK.test(x.headers['x-terrain-reg']||'')),G.net.register.length-regsBefore,/^[A-Za-z0-9_-]{12}$/.test(camp)], [2,true,1,true]);
  c('a refused link says why, in words', G.E(`gfErrText({code:'noreg'})`), 'Terrain could not confirm your registration just now. Please try again in a few minutes.');
  c('too many links from one connection says so too', G.E(`gfErrText({code:'slow-down',op:'id'})`), 'Too many links have been made from this connection today. Please try again tomorrow.');
  c('members sending results keep their own message', G.E(`gfErrText({code:'slow-down',op:'submit'})`), 'Too many results are arriving at once. Please wait a few minutes and send again.');

  console.log('\n-- S1: a link the sweep removed (no results, unopened for 30 days) --');
  { const pub=G.E(`uChurch().share.pub`);
    G.E(`(()=>{ const sh=uChurch().share; sh.old=[{pub:'OldOldOldOld',key:'${'K'.repeat(32)}',closed:1}]; uPersist(); })()`);
    giftsStore.m.delete('c/'+pub);
    const e=await G.E(`gfSync().then(x=>({gone:x.gone,text:gfSyncText(x)}),e=>({error:e.code}))`);
    c('checking for results: the pastor is told, in words', e, {gone:true,text:'This church’s link had no results and was not opened for 30 days, so the server removed it. Set up the link again to make a new one.'});
    c('the link is forgotten on this device, and so is the closed one that went too', G.E(`JSON.stringify([uChurch().share.pub||null,uChurch().share.key||null,uChurch().share.old])`), JSON.stringify([null,null,[]]));
    const again=await G.E(`gfCampaign().then(x=>x.pub)`);
    c('setting up the link again makes a new one', [/^[A-Za-z0-9_-]{12}$/.test(again),again!==pub], [true,true]); }

  console.log('\n-- S7: a stored registration the server refuses reopens the form --');
  // resync gets bad-name for a name with no letter (kept while the server was down)
  const Bn=page('https://pastorshub.org/',{storage:{'terrain-reg':{id:'',name:'1234',email:'numbers@example.org',church:'Hill SDA',role:'leader',conf:'Pennsylvania',union:'Columbia Union',news:true,ts:1,synced:false}}});
  await until(()=>Bn.gateUp()&&Bn.D.getElementById('regform'));
  c('the gate reopens under the stored conference, everything filled in', [Bn.D.querySelector('#chosen b').textContent,['rname','remail','rchurch'].map(id=>Bn.D.getElementById(id).value),Bn.D.querySelector('#rrole button.on').dataset.r,Bn.D.getElementById('rnews').checked],
    ['Pennsylvania Conference',['1234','numbers@example.org','Hill SDA'],'leader',true]);
  c('the reason under the name field, the field marked', [errText(Bn),errHome(Bn),Bn.D.getElementById('rname').getAttribute('aria-invalid')], ['Check your name and try again.','rname','true']);
  c('the bad registration is off the device', Bn.reg(), null);
  // an address kept before the page checked the way the server does
  delete process.env.TERRAIN_REG_SECRET;
  const Be=page('https://pastorshub.org/',{storage:{'terrain-reg':{id:'local-x',name:'Ann Lee',email:'ann..lee@gmail.com',church:'Grace SDA',role:'pastor',conf:'Ohio',union:'Columbia Union',news:false,ts:1,synced:false}}});
  await until(()=>Be.gateUp()&&Be.D.getElementById('regform'));
  c('an address the server refuses: the form under Ohio, filled in, the reason under the email', [Be.D.querySelector('#chosen b').textContent,Be.D.getElementById('remail').value,errText(Be),errHome(Be)],
    ['Ohio Conference','ann..lee@gmail.com','That email address does not look right. Check it for a typo.','remail']);
  c('nothing was sent for it, and it is off the device', [Be.net.register.length,Be.reg()], [0,null]);
  fill(Be,{name:'Ann Lee',email:'ann.lee@gmail.com',church:'Grace SDA'}); submit(Be);
  await until(()=>Be.hubUp());
  c('corrected, it registers and opens the hub', [Be.hubUp(),Be.reg().email,!!regStore.peekEmail('ann.lee@gmail.com')], [true,'ann.lee@gmail.com',true]);

  console.log('\n-- S7: the page and the server agree on every address --');
  const P=page('https://pastorshub.org/');
  await until(()=>P.gateUp());
  const addrs=['a@b.c','a@b.c1','josé@example.org','a..b@example.org','.a@example.org','a@-b.org','a@b-.org','a@b..org','x@[1.2.3.4]','a@b.org.',
    'a@b.co\u200b','ana@example.org','o\'brien@example.ie','ana+terrain@mail.example.co.uk','A@EXAMPLE.ORG','a@xn--p1ai.xn--p1ai','a_b-c%d@sub-domain.example.org'];
  const agree=[];
  for(const [i,e] of addrs.entries()){
    const page_=P.E(`regEmail(${JSON.stringify(e)})`)!=='';
    const res=await register(new Request('https://x/r',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'register',name:'N',email:e,church:'C',role:'pastor',conf:'P'})}),{ip:'198.51.100.'+(100+i)});
    agree.push([e,page_,res.status===200]);
  }
  c('regEmail accepts exactly what register.mjs accepts', agree.filter(([,a,b])=>a!==b).map(x=>x[0]), []);
  c('a zero-width space pasted after an address is dropped, not refused', P.E(`regEmail('a@b.co\\u200b')`), 'a@b.co');

  console.log('\n-- S11: invisible characters in the form --');
  pick(P);
  fill(P,{name:'\u200b\u200b\u200b',email:'zw@example.org',church:'Grace'}); submit(P); await wait(20);
  c('a name of zero-width spaces is no name', [errText(P),errHome(P)], ['Type your name.','rname']);
  fill(P,{name:'1234',email:'zw@example.org',church:'Grace'}); submit(P); await wait(20);
  c('a name needs a letter', errText(P), 'Check your name and try again.');
  fill(P,{name:'Ana',email:'zw@example.org',church:'\u202e\u200d'}); submit(P); await wait(20);
  c('a church of direction marks is no church', [errText(P),errHome(P)], ['Type the name of your church.','rchurch']);
  fill(P,{name:'Evil\u202egnp.exe',email:'zw@example.org',church:'Gr\u200bace SDA'}); submit(P);
  await until(()=>P.hubUp());
  c('what is kept is stripped of them, on the device and on the server', [P.reg().name,P.reg().church,regStore.peekEmail('zw@example.org').name], ['Evilgnp.exe','Grace SDA','Evilgnp.exe']);

  console.log('\n-- S3: "Welcome back" comes from this device --');
  P.D.getElementById('regchange').click(); pick(P);
  P.D.getElementById('remail').value='someone.new@example.org'; submit(P);
  await until(()=>P.hubUp());
  c('after Change with another address: no "Welcome back"', /Welcome back/.test(errText(P)), false);
  P.D.getElementById('regchange').click(); pick(P); submit(P);
  await until(()=>/Welcome back/.test(errText(P)));
  c('after Change with the same address: "Welcome back", beside the button', [errText(P),errHome(P),P.D.getElementById('gerr').className], ['Welcome back, Evilgnp.exe.','foot','status ok']);

  console.log('\n-- P2: a message about a field sits under that field --');
  const Q=page('https://pastorshub.org/');
  await until(()=>Q.gateUp());
  pick(Q);
  Q.net.scrolls.length=0;
  fill(Q,{name:'Joshua Mura',email:'pastor@example'}); submit(Q); await wait(20);
  const em=Q.D.getElementById('remail'), ge=Q.D.getElementById('gerr');
  c('the email message is under the email box, which points to it', [errHome(Q),ge.previousElementSibling===em,em.getAttribute('aria-describedby'),Q.D.activeElement===em], ['remail',true,'gerr',true]);
  c('the field is brought into view (instantly, its label with it)', Q.net.scrolls.some(s=>/regf/.test(s.cls)&&s.o&&s.o.block==='start'&&s.o.behavior==='auto'), true);
  fill(Q,{name:'Joshua Mura',email:'pastor@example.org'}); submit(Q); await wait(20);
  c('the next message moves to the church field, and the email field is clear', [errHome(Q),em.hasAttribute('aria-describedby'),em.hasAttribute('aria-invalid')], ['rchurch',false,false]);
  c('there is only ever one message', Q.D.querySelectorAll('#gerr').length, 1);

  console.log('\n-- P3: choosing a conference brings its box into view, instantly --');
  Q.D.querySelector('#usmap button[data-st="OH"]').click();
  Q.net.scrolls.length=0; pick(Q,'Ohio');
  const sc=Q.net.scrolls.find(s=>s.id==='chosen');
  c('scrolled to the box’s top (its heading), not smoothly', sc&&sc.o, {block:'start',behavior:'auto'});
  c('with room for the sticky header above it', /\.chosen\{[^}]*scroll-margin-top:calc\(var\(--topH,65px\) \+ 12px\)/.test(html), true);

  console.log('\n-- P7: the ES button halfway through registering --');
  const E1=page('https://pastorshub.org/');
  await until(()=>E1.gateUp());
  pick(E1,'Chesapeake'); fill(E1,{name:'María López',email:'maria@example.org',church:'Iglesia Central'});
  E1.D.querySelector('#rrole button[data-r="leader"]').click(); E1.D.getElementById('rnews').checked=true;
  E1.D.getElementById('langbtn').click();   // stashes, then reloads (jsdom cannot navigate)
  const draft=E1.w.sessionStorage.getItem('terrain-reg-draft');
  c('the draft is kept for this tab, with the conference', !!draft&&JSON.parse(draft).conf, 'Chesapeake');
  const E2=page('https://pastorshub.org/',{lang:'es',session:{'terrain-reg-draft':draft}});
  await until(()=>E2.gateUp()&&E2.D.getElementById('regform'));
  c('after the reload, in Spanish: the same conference, the form filled in', [E2.D.querySelector('#chosen b').textContent,['rname','remail','rchurch'].map(id=>E2.D.getElementById(id).value),E2.D.querySelector('#rrole button.on').dataset.r,E2.D.getElementById('rnews').checked,E2.D.getElementById('rbtn').textContent],
    ['Chesapeake Conference',['María López','maria@example.org','Iglesia Central'],'leader',true,'Registrarse']);
  c('the draft is used once and gone', E2.w.sessionStorage.getItem('terrain-reg-draft'), null);
  submit(E2); await until(()=>E2.hubUp());
  c('and registering from there works', [E2.hubUp(),E2.reg().conf,regStore.peekEmail('maria@example.org').lang], [true,'Chesapeake','es']);
  const E3=page('https://pastorshub.org/',{storage:{'terrain-reg':RA}});
  await until(()=>E3.hubUp());
  E3.D.getElementById('langbtn').click();
  c('a pastor already in keeps no draft', E3.w.sessionStorage.getItem('terrain-reg-draft'), null);

  console.log('\n-- P8, P9, P10: the words on the first page --');
  const F=page('https://pastorshub.org/');
  await until(()=>F.gateUp());
  c('what Terrain is, under the heading', F.D.getElementById('gintro').textContent, 'Terrain reads the U.S. Census around your church and turns it into a plan for ministry that fits the people who live there.');
  c('the search box, short enough for a phone', F.D.getElementById('csearch').placeholder, 'Search: Pennsylvania, Texico…');
  c('the swipe note is hidden while the whole map fits', F.D.getElementById('mapswipe').hidden, true);
  F.E(`(()=>{ const w=document.querySelector('.usmapwrap'); Object.defineProperty(w,'scrollWidth',{value:500,configurable:true}); Object.defineProperty(w,'clientWidth',{value:350,configurable:true}); mapSwipeNote(); })()`);
  c('and shown when the map is wider than its frame', F.D.getElementById('mapswipe').hidden, false);
  const FS=page('https://pastorshub.org/',{lang:'es'});
  await until(()=>FS.gateUp());
  c('in Spanish', [FS.D.getElementById('gintro').textContent,FS.D.getElementById('csearch').placeholder],
    ['Terrain lee el censo de EE. UU. alrededor de su iglesia y lo convierte en un plan de ministerio a la medida de quienes viven allí.','Buscar: Pennsylvania, Texico…']);
  FS.D.querySelector('#usmap button[data-st="PA"]').click();
  c('the state note: "elija aquella para la que trabaja"', /comparten el mismo territorio: elija aquella para la que trabaja\./.test(FS.D.getElementById('clist').textContent), true);
  c('no "le emplea" or "le recuerda" left anywhere', /le emplea|le recuerda en este/.test(html), false);

  console.log('\n-- no page errors --');
  await wait(50);
  c('no script errors on any page', allErrs.flat().filter(e=>!/navigation/.test(e)), []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
