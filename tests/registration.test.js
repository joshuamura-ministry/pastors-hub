// v10.38.0 — the first page: find your conference, then register (name, email,
// church, role) instead of entering an access code. Nothing is emailed.
// Runs the page against the real register.mjs with an in-memory store.
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
    peekEmail(e){ for(const v of m.values()){ const r=JSON.parse(v.data); if(r.email===e) return r; } return null; } };
}

(async()=>{ try{
  delete process.env.TERRAIN_ADMIN_KEY;
  const store=makeStore(); globalThis.__terrainRegStore=store;
  const handler=(await import(path.resolve(__dirname,'..','netlify','functions','register.mjs'))).default;
  const allErrs=[], calls=[];
  // check: what census.mjs answers ?check=1 with (or 'offline');
  // reg: 'server' (the real function), 'down' (network error), or an HTTP status.
  function page(url,{check={required:false,ok:true,register:true},reg='server',lang,storage={}}={}){
    const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message)); allErrs.push(errs);
    const mine=[];
    const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
        if(lang) w.localStorage.setItem('terrain-lang',lang);
        for(const [k,v] of Object.entries(storage)) w.localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));
        w.fetch=async(u,o={})=>{
          u=String(u);
          if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})};
          if(/functions\/census\?check=1/.test(u)){
            if(check==='offline') throw new TypeError('Failed to fetch');
            return {ok:true,status:200,json:async()=>check};
          }
          if(/functions\/register/.test(u)){
            const body=o.body?JSON.parse(o.body):{}; calls.push(body); mine.push(body);
            if(reg==='down') throw new TypeError('Failed to fetch');
            if(typeof reg==='number') return {ok:false,status:reg,json:async()=>({ok:false,error:reg===429?'slow-down':'server'})};
            const res=await handler(new Request('https://pastorshub.org'+u,{method:o.method||'GET',headers:o.headers,body:o.body}),{});
            const t=await res.text();
            return {ok:res.ok,status:res.status,json:async()=>JSON.parse(t)};
          }
          return new Promise(()=>{});
        };
      }});
    const w=dom.window, D=w.document;
    return {w,D,E:s=>w.eval(s),errs,mine,
      reg:()=>{ try{ return JSON.parse(w.localStorage.getItem('terrain-reg')||'null'); }catch(e){ return null; } },
      gateUp:()=>!D.getElementById('gate').hidden&&D.getElementById('gate').classList.contains('show'),
      hubUp:()=>!D.getElementById('hub').hidden};
  }
  const pick=(P,conf='Pennsylvania')=>{ const b=[...P.D.querySelectorAll('.crow')].find(x=>x.dataset.c===conf); b.click(); };
  const fill=(P,{name='',email='',church=''}={})=>{ const D=P.D;
    D.getElementById('rname').value=name; D.getElementById('remail').value=email; D.getElementById('rchurch').value=church; };
  const submit=P=>P.D.getElementById('rbtn').click();
  const errText=P=>(P.D.getElementById('gerr')||{}).textContent||'';

  // ======================================================= a first visit
  console.log('-- a first visit --');
  const A=page('https://pastorshub.org/');
  await until(()=>A.gateUp());
  c('the version stamps agree', A.E('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('the first page is "Find your conference"', [A.gateUp(),A.D.querySelector('#gate h2').textContent], [true,'Find your conference']);
  c('the hub and the toolbar stay hidden behind it', [A.hubUp(),!A.D.getElementById('toolbar').hidden], [false,false]);
  c('the map and the list are there', [A.D.querySelectorAll('#usmap button[data-st]').length>40,A.D.querySelectorAll('.crow').length>40], [true,true]);
  c('the sub-line asks for a registration, not a code', [/register with your name, email and church/.test(A.D.getElementById('gsub').textContent),/code/i.test(A.D.getElementById('gsub').textContent)], [true,false]);
  c('the help note says nothing about codes', [/no password/i.test(A.D.getElementById('ghelp').textContent),/code/i.test(A.D.getElementById('ghelp').textContent)], [true,false]);
  c('nothing chosen yet: no form', [A.D.getElementById('chosen').hidden,!!A.D.getElementById('regform')], [true,false]);
  c('gated() says so', A.E('gated()'), true);

  console.log('\n-- choosing a conference --');
  A.D.querySelector('#usmap button[data-st="PA"]').click();
  c('tapping a state lists its conferences', [...A.D.querySelectorAll('.crow')].some(b=>b.dataset.c==='Pennsylvania'), true);
  pick(A);
  const F=A.D.getElementById('regform');
  c('the box under it shows the registration form', [!A.D.getElementById('chosen').hidden,!!F,!!A.D.getElementById('gcode')], [true,true,false]);
  c('headed with the conference and its union', [A.D.querySelector('#chosen b').textContent,A.D.querySelector('#chosen .cu').textContent], ['Pennsylvania Conference','Columbia Union']);
  const em=A.D.getElementById('remail');
  c('name, email, church: all required', ['rname','remail','rchurch'].map(id=>A.D.getElementById(id).required), [true,true,true]);
  c('the email field is type=email with autocomplete=email', [em.type,em.getAttribute('autocomplete'),em.maxLength], ['email','email',254]);
  c('labels, in order', [...F.querySelectorAll('.regf>label,.regf>.reglab')].map(l=>l.textContent), ['Your name','Your email','Your church','Your role']);
  c('role: three one-tap choices, Pastor first and chosen', [[...F.querySelectorAll('#rrole button')].map(b=>b.textContent),[...F.querySelectorAll('#rrole button')].map(b=>b.getAttribute('aria-checked'))],
    [['Pastor','Elder or church leader','Other'],['true','false','false']]);
  c('news: an optional box, unticked', [A.D.getElementById('rnews').checked,/Send me occasional news about Terrain/.test(F.querySelector('.regnews').textContent)], [false,true]);
  // Updated in the v10.38.0 review (P9): the role is stored too, and there is no "account".
  c('the privacy note', F.querySelector('.regpriv').textContent, 'We keep your name, email, church, role and conference so we know who is using Terrain and can reach you about it. We never share or sell them.');
  c('no password field, no code field', F.querySelectorAll('input[type="password"],#gcode').length, 0);
  c('a Register button', A.D.getElementById('rbtn').textContent, 'Register');

  console.log('\n-- validation --');
  submit(A); await wait(20);
  c('empty: "Type your name." and the name field marked', [errText(A),A.D.getElementById('rname').getAttribute('aria-invalid')], ['Type your name.','true']);
  fill(A,{name:'Joshua Mura'}); submit(A); await wait(20);
  c('no email: asks for it', [errText(A),A.D.getElementById('remail').getAttribute('aria-invalid'),A.D.getElementById('rname').getAttribute('aria-invalid')], ['Type your email address.','true',null]);
  for(const bad of ['pastor','pastor@','pastor@example','a@b@example.org','pastor@.org','pastor@example.','pas tor@example.org','<pastor@example.org>','x'.repeat(250)+'@example.org']){
    fill(A,{name:'Joshua Mura',email:bad,church:'Bucks County SDA'}); submit(A); await wait(10);
    c('refused in the page: '+JSON.stringify(bad).slice(0,30), /does not look right/.test(errText(A)), true);
  }
  fill(A,{name:'Joshua Mura',email:'pastor@example.org'}); submit(A); await wait(20);
  c('no church: asks for it', [errText(A),A.D.getElementById('rchurch').getAttribute('aria-invalid')], ['Type the name of your church.','true']);
  c('nothing stored, nothing sent while the form is wrong', [A.reg(),A.mine.length], [null,0]);
  A.D.getElementById('rchurch').dispatchEvent(new A.w.Event('input'));
  c('typing clears the mark', A.D.getElementById('rchurch').getAttribute('aria-invalid'), null);

  console.log('\n-- registering --');
  c('the church profile starts as the placeholder', A.E('uChurch().name'), 'My church');
  A.D.querySelector('#rrole button[data-r="leader"]').click();
  c('one tap changes the role', [...F.querySelectorAll('#rrole button')].map(b=>b.getAttribute('aria-checked')), ['false','true','false']);
  A.D.getElementById('rnews').checked=true;
  fill(A,{name:'  Joshua   Mura ',email:'  Pastor.Josh@Example.ORG ',church:' Bucks County SDA '});
  submit(A);
  c('the button says it is working', A.D.getElementById('rbtn').textContent, 'Registering…');
  await until(()=>!A.gateUp());
  const R=A.reg();
  c('terrain-reg holds exactly the record', R&&Object.keys(R).sort(), ['church','conf','email','id','name','news','role','synced','ts','union']);
  c('trimmed, the email lower-cased', [R.name,R.email,R.church,R.role,R.conf,R.union,R.news,R.synced], ['Joshua Mura','pastor.josh@example.org','Bucks County SDA','leader','Pennsylvania','Columbia Union',true,true]);
  // Updated in the v10.38.0 review (S3): the server answers {ok} and no id; a
  // token (and the id inside it) comes only while TERRAIN_REG_SECRET is set.
  c('a time, and no id or token while the server does not check registrations', [R.id,typeof R.ts,'tok' in R], ['','number',false]);
  c('one request, carrying the whole registration', A.mine.map(b=>[b.op,b.name,b.email,b.church,b.role,b.conf,b.union,b.news,b.lang]),
    [['register','Joshua Mura','pastor.josh@example.org','Bucks County SDA','leader','Pennsylvania','Columbia Union',true,'en']]);
  const srv=store.peekEmail('pastor.josh@example.org');
  c('the server has the record, unverified', [!!srv,srv&&/^[A-Za-z0-9_-]{12}$/.test(srv.id),srv&&srv.verified], [true,true,false]);
  c('the church profile is named from the church field', A.E('uChurch().name'), 'Bucks County SDA');
  c('and saved on the device', JSON.parse(A.w.localStorage.getItem('terrain-churches-v1')||'{}').churches[A.E('uChurch().id')].name, 'Bucks County SDA');
  c('straight to the hub', [A.gateUp(),A.hubUp(),A.E('gated()')], [false,true,false]);
  const who=A.D.getElementById('whoami');
  // v10.57.0 (stale, not a regression): the church's own button comes first in the header now ("they can click a button and say which church"), so Change is found by its id
  c('the header chip: name · conference, and Change', [who&&who.querySelector('.whotxt').textContent,who&&who.querySelector('#regchange').textContent], ['Joshua Mura · Pennsylvania','Change']);
  c('no email was sent: nothing but the registration went out', A.mine.length, 1);

  console.log('\n-- a church that already has a name keeps it --');
  const B=page('https://pastorshub.org/');
  await until(()=>B.gateUp());
  B.E(`uChurch().name='Fairview Village SDA'; uPersist();`);
  pick(B); fill(B,{name:'Ana Lopez',email:'ana@example.org',church:'Bucks County SDA'}); submit(B);
  await until(()=>!B.gateUp());
  c('registered, and the named profile is left alone', [B.reg().church,B.E('uChurch().name')], ['Bucks County SDA','Fairview Village SDA']);
  B.E(`uChurch().name=''; uPersist();`);

  console.log('\n-- a returning visitor --');
  const C=page('https://pastorshub.org/',{storage:{'terrain-reg':R}});
  await until(()=>C.hubUp());
  c('skips the gate and lands on the hub', [C.gateUp(),C.hubUp(),!!C.D.getElementById('regform')], [false,true,false]);
  c('the chip is in the header', C.D.querySelector('#whoami .whotxt').textContent, 'Joshua Mura · Pennsylvania');
  await wait(80);
  c('a record already on the server is not sent again', C.mine.length, 0);
  const C2=page('https://pastorshub.org/',{storage:{'terrain-reg':{...R,email:'Not An Address'}}});
  await until(()=>C2.gateUp());
  c('a stored registration that is not valid does not let anyone past', [C2.gateUp(),C2.hubUp()], [true,false]);

  console.log('\n-- the same email on another device --');
  const G=page('https://pastorshub.org/');
  await until(()=>G.gateUp());
  pick(G,'Allegheny East');
  fill(G,{name:'Joshua Mura',email:'PASTOR.JOSH@example.org',church:'Bucks County SDA'}); submit(G);
  // Updated in the v10.38.0 review (S3): the server no longer says whether an
  // address is known (that told anyone who had registered), so a new device
  // says no "Welcome back"; and nothing proves who typed the address, so the
  // first registration's words stand on the server and this one is a claim.
  await until(()=>!G.gateUp(),3000);
  c('another device: straight to the hub, no "Welcome back"', [G.gateUp(),G.hubUp(),/Welcome back/.test(errText(G)),G.D.querySelector('#whoami .whotxt').textContent], [false,true,false,'Joshua Mura · Allegheny East']);
  const srv2=store.peekEmail('pastor.josh@example.org');
  c('the server keeps the first registration, counts the visit and notes the claim', [srv2.conf,srv2.count,srv2.claims.map(x=>x.conf),[...store.m.keys()].filter(k=>k.startsWith('e/')).length], ['Pennsylvania',2,['Allegheny East'],2]);

  console.log('\n-- Change --');
  A.E(`(()=>{ const ch=uChurch(); ch.members=[{id:'m1',name:'Maria'}]; uPersist(); })()`);
  const churchesBefore=A.w.localStorage.getItem('terrain-churches-v1');
  A.E(`openTool('planner')`);
  A.D.getElementById('regchange').click();
  c('clears the registration and reopens the gate', [A.reg(),A.gateUp(),A.hubUp(),!!A.D.getElementById('whoami')], [null,true,false,false]);
  c('the tool that was open is hidden too', A.D.getElementById('planner').hidden, true);
  c('church data untouched', [A.w.localStorage.getItem('terrain-churches-v1')===churchesBefore,A.E('uChurch().name'),A.E('uChurch().members.length')], [true,'Bucks County SDA',1]);
  c('the form is a fresh start: no conference chosen', [A.D.getElementById('chosen').hidden,A.D.getElementById('csearch').value], [true,'']);
  pick(A,'Chesapeake');
  c('choosing again fills in what they typed last time', ['rname','remail','rchurch'].map(id=>A.D.getElementById(id).value).concat([A.D.querySelector('#rrole button.on').dataset.r,A.D.getElementById('rnews').checked]),
    ['Joshua Mura','pastor.josh@example.org','Bucks County SDA','leader',true]);
  submit(A);
  await until(()=>!A.gateUp(),3000);
  c('and registering again lands on the hub with the new conference', [A.hubUp(),A.D.querySelector('#whoami .whotxt').textContent,A.reg().conf], [true,'Joshua Mura · Chesapeake','Chesapeake']);

  console.log('\n-- the server cannot be reached --');
  for(const mode of ['down',500,429,404]){
    const X=page('https://pastorshub.org/',{reg:mode});
    await until(()=>X.gateUp());
    pick(X); fill(X,{name:'Offline Pastor',email:'offline@example.org',church:'Hill SDA'}); submit(X);
    await until(()=>!X.gateUp());
    const xr=X.reg();
    c(`server ${mode}: let in anyway, registered on this device, marked to send again`, [X.hubUp(),!!xr,xr&&xr.synced,xr&&xr.id,xr&&xr.email], [true,true,false,'','offline@example.org']);
  }
  const Y=page('https://pastorshub.org/',{storage:{'terrain-reg':{id:'',name:'Offline Pastor',email:'offline@example.org',church:'Hill SDA',role:'pastor',conf:'Ohio',union:'Columbia Union',news:false,ts:1,synced:false}}});
  await until(()=>Y.hubUp());
  await until(()=>Y.reg()&&Y.reg().synced===true);
  c('next visit: the record goes to the server quietly', [Y.mine.length,Y.reg().synced,!!store.peekEmail('offline@example.org')], [1,true,true]);
  c('and nothing on screen changed', [Y.gateUp(),Y.hubUp()], [false,true]);
  const Z=page('https://pastorshub.org/',{check:'offline'});
  await until(()=>Z.gateUp());
  c('the access check itself unreachable: still the registration page', [Z.gateUp(),/register/.test(Z.D.getElementById('gsub').textContent)], [true,true]);

  console.log('\n-- the server refuses an address the page let through --');
  const V=page('https://pastorshub.org/');
  await until(()=>V.gateUp());
  pick(V); fill(V,{name:'José',email:'josé@example.org',church:'Iglesia Central'}); submit(V);
  await until(()=>V.mine.length===1&&/does not look right/.test(errText(V)));
  c('the email message, and still on the form', [/does not look right/.test(errText(V)),V.gateUp(),V.reg()], [true,true,null]);

  console.log('\n-- codes switched back on (TERRAIN_REQUIRE_CODE=1) --');
  const K=page('https://pastorshub.org/',{check:{required:true,ok:false,name:'',conf:'',picked:''}});
  await until(()=>K.gateUp());
  c('the sub-line asks for the access code', /enter the access code/.test(K.D.getElementById('gsub').textContent), true);
  pick(K);
  c('choosing a conference shows the code field, not the form', [!!K.D.getElementById('gcode'),!!K.D.getElementById('regform')], [true,false]);
  c('the old help note is back', /Codes are issued per person/.test(K.D.getElementById('ghelp').textContent), true);
  const K2=page('https://pastorshub.org/',{check:{required:true,ok:false},storage:{'terrain-reg':R}});
  await until(()=>K2.gateUp());
  c('a registration alone does not pass a code gate', [K2.gateUp(),K2.hubUp(),K2.E('GATE')], [true,false,'code']);
  // A registered pastor mid-session when the server switches codes on: the
  // next Census call answers 401 nocode, and the code gate replaces the hub.
  const K4=page('https://pastorshub.org/',{storage:{'terrain-reg':R}});
  await until(()=>K4.hubUp());
  K4.E(`(async()=>{ try{ await run(async()=>{ throw new Error('NOCODE'); }); }catch(e){} })()`);
  await until(()=>K4.gateUp());
  c('codes switched on mid-session: the code gate, the reason, and no chip', [K4.gateUp(),K4.E('GATE'),K4.D.getElementById('gmsg').textContent,!!K4.D.getElementById('whoami'),K4.hubUp()],
    [true,'code','Terrain now needs an access code for your conference.',false,false]);
  const K3=page('https://pastorshub.org/',{check:{required:true,ok:true,name:'Joshua Mura',conf:'Pennsylvania'},storage:{'terrain-code':'PA-OK','terrain-conf':'Pennsylvania'}});
  await until(()=>K3.hubUp());
  c('a valid code still passes, with the old chip', [K3.gateUp(),K3.D.querySelector('#whoami .whotxt').textContent,!!K3.D.getElementById('signout')], [false,'Joshua Mura · Pennsylvania',true]);

  console.log('\n-- an old access code on the device is harmless --');
  const O=page('https://pastorshub.org/',{storage:{'terrain-code':'PA-2026-OLD','terrain-conf':'Pennsylvania'}});
  await until(()=>O.gateUp());
  c('no registration yet: the registration page', [O.gateUp(),O.E('GATE')], [true,'register']);
  const O2=page('https://pastorshub.org/',{storage:{'terrain-code':'PA-2026-OLD','terrain-reg':R}});
  await until(()=>O2.hubUp());
  c('registered: straight in', [O2.gateUp(),O2.hubUp()], [false,true]);

  console.log('\n-- member links never see the gate --');
  for(const hash of ['#gifts=AAAAAAAAAAAA','#gifts-confirm=AAAAAAAAAAAA.BBBBBBBBBBBB.CCCCCCCCCCCCCCCCCCCCCCCC','#gifts-report=AAAAAAAAAAAA.BBBBBBBBBBBB.'+'C'.repeat(32)]){
    const M=page('https://pastorshub.org/'+hash);
    await wait(250);
    c(hash.split('=')[0]+': no gate, no form, no registration sent', [M.gateUp(),!!M.D.getElementById('regform'),M.mine.length,M.E('gated()')], [false,false,0,false]);
  }

  console.log('\n-- Spanish --');
  const S=page('https://pastorshub.org/',{lang:'es'});
  await until(()=>S.gateUp());
  c('the heading and sub-line', [S.D.querySelector('#gate h2').textContent,S.D.getElementById('gsub').textContent],
    ['Encuentre su asociación','Toque su estado en el mapa o busque en la lista. Luego regístrese con su nombre, su correo electrónico y su iglesia.']);
  // Updated in the v10.38.0 review (P8, P10): "le recuerda" read as "reminds
  // you"; the longer placeholder was cut off on a phone.
  c('the help note', S.D.getElementById('ghelp').textContent, 'No hay contraseña. En otro teléfono o computadora, toque «¿Ya se registró? Inicie sesión» y escriba el mismo correo electrónico.');
  c('the search box', S.D.getElementById('csearch').placeholder, 'Buscar: Pennsylvania, Texico…');
  pick(S);
  const SF=S.D.getElementById('regform');
  c('the labels', [...SF.querySelectorAll('.regf>label,.regf>.reglab')].map(l=>l.textContent), ['Su nombre','Su correo electrónico','Su iglesia','Su cargo']);
  c('the roles', [...SF.querySelectorAll('#rrole button')].map(b=>b.textContent), ['Pastor','Anciano o líder de iglesia','Otro']);
  c('the news box', SF.querySelector('.regnews').textContent, 'Envíenme noticias ocasionales sobre Terrain');
  c('the privacy note', SF.querySelector('.regpriv').textContent, 'Guardamos su nombre, su correo electrónico, su iglesia, su cargo y su asociación para saber quién usa Terrain y poder comunicarnos con usted al respecto. Nunca los compartimos ni los vendemos.');
  c('the button', S.D.getElementById('rbtn').textContent, 'Registrarse');
  submit(S); await wait(20);
  c('a validation message', errText(S), 'Escriba su nombre.');
  fill(S,{name:'Ana',email:'ana@ejemplo'}); submit(S); await wait(20);
  c('the email message', errText(S), 'Esa dirección de correo no parece correcta. Revise si tiene algún error.');
  fill(S,{name:'Ana López',email:'ana.lopez@example.org',church:'Iglesia Hispana de Filadelfia'}); submit(S);
  await until(()=>!S.gateUp());
  c('registered in Spanish: the record says so', store.peekEmail('ana.lopez@example.org').lang, 'es');
  // v10.57.0 (stale): Change by its id (the church's button comes first)
  c('the chip says Cambiar', S.D.querySelector('#whoami #regchange').textContent, 'Cambiar');
  // Seen in the render after registering in Spanish: the hub's verbs and its
  // fourth title were still English, and "Planificador de evangelismo" wrapped.
  c('the hub it lands on is Spanish too: titles and verbs', [[...S.D.querySelectorAll('.tool b')].map(b=>b.textContent.trim()),[...S.D.querySelectorAll('.tool .tgo')].map(t=>t.textContent.trim())],
    // v56 (B2): the fifth tile, "Learn from other conferences" (his accepted default), in Spanish too
    // v10.57.0: the sixth tile, Compare your churches, in Spanish too
    // v10.57.1 (stale, not a regression): the pastor (7 Oct 2026), "compare your churches on the bottom left … EVANGELISM planner … bottom middle … learn from other conferences … on the right"; and "there are resources available … for your church and find resources"
    // v10.59.2 (stale): Compare your churches last (the pastor, 8 Oct 2026: "put compare your churches to the very bottom right instead because it's the weakest one")
    [['Encuesta comunitaria','Dones espirituales','Presentar el caso','Plan de evangelismo','Aprender de otras asociaciones','Compare sus iglesias'],['Explorar la encuesta','Descubrir los dones','Preparar una propuesta','Comenzar a planificar','Buscar recursos','Comparar iglesias']]);
  // Updated in the v10.38.0 review (S3): "Welcome back" comes from this
  // device (after Change), not from the server.
  S.D.getElementById('regchange').click();
  pick(S); submit(S);
  await until(()=>/bienvenida/.test(errText(S)));
  c('welcome back, in Spanish', errText(S), 'Le damos la bienvenida de nuevo, Ana.');

  console.log('\n-- signing in on another phone or computer (v10.46.0) --');
  // The pastor (5 Oct 2026): "every time I try to sign in it makes me register again. There's no like sign in place."
  const SN=page('https://pastorshub.org/');
  await until(()=>SN.gateUp());
  const sb=SN.D.getElementById('gsignbtn');
  c('the first page offers "Already registered? Sign in", its form folded', [sb&&sb.textContent,SN.D.getElementById('signform').hidden,sb&&sb.getAttribute('aria-expanded')], ['Already registered? Sign in',true,'false']);
  c('the help note says to sign in on another device', /tap “Already registered\? Sign in” and type the same email/.test(SN.D.getElementById('ghelp').textContent), true);
  sb.click();
  c('one tap opens it: one field', [SN.D.getElementById('signform').hidden,sb.getAttribute('aria-expanded'),SN.D.querySelectorAll('#signform input').length], [false,'true',1]);
  SN.D.getElementById('sbtn').click(); await wait(20);
  c('nothing typed: asks for it, sends nothing', [SN.D.getElementById('serr').textContent,SN.D.getElementById('semail').getAttribute('aria-invalid'),SN.mine.length], ['Type your email address.','true',0]);
  SN.D.getElementById('semail').value='pastor@'; SN.D.getElementById('sbtn').click(); await wait(20);
  c('not an address: refused in the page', [/does not look right/.test(SN.D.getElementById('serr').textContent),SN.mine.length], [true,0]);
  SN.D.getElementById('semail').value='nobody@example.org'; SN.D.getElementById('sbtn').click();
  await until(()=>/could not find/.test(SN.D.getElementById('serr').textContent));
  c('an address not on file: says so, and how to register; still on the first page, nothing kept', [SN.D.getElementById('serr').textContent,SN.gateUp(),SN.reg()], ['We could not find that email. Check it for a typo, or register: tap your state below.',true,null]);
  SN.D.getElementById('semail').value='  Pastor.Josh@Example.ORG '; SN.D.getElementById('sbtn').click();
  await until(()=>/Welcome back/.test(SN.D.getElementById('serr').textContent));
  c('the registered address: "Welcome back, Joshua."', SN.D.getElementById('serr').textContent, 'Welcome back, Joshua.');
  c('…the server was sent the address and nothing else', SN.mine.slice(-1)[0], {op:'signin',email:'pastor.josh@example.org'});
  await until(()=>SN.hubUp());
  const nr=SN.reg();
  c('…then in: the hub, with the registration as first given kept on this device', [SN.hubUp(),SN.gateUp(),nr.name,nr.email,nr.church,nr.conf,nr.union,nr.role,nr.news,nr.synced], [true,false,'Joshua Mura','pastor.josh@example.org','Bucks County SDA','Pennsylvania','Columbia Union','leader',false,true]);   // news: a later registration above withdrew it (true to false only)
  c('…the chip says who and where', SN.D.querySelector('#whoami .whotxt').textContent, 'Joshua Mura · Pennsylvania');
  c('…and the church profile is named from it', SN.E('uChurch().name'), 'Bucks County SDA');
  const SO=page('https://pastorshub.org/',{reg:'down'}); await until(()=>SO.gateUp());
  SO.D.getElementById('gsignbtn').click(); SO.D.getElementById('semail').value='pastor.josh@example.org'; SO.D.getElementById('sbtn').click();
  await until(()=>/could not reach/.test(SO.D.getElementById('serr').textContent));
  c('the server out of reach: says so, stays on the first page, keeps nothing', [SO.gateUp(),SO.reg(),SO.D.getElementById('sbtn').disabled], [true,null,false]);
  const SQ=page('https://pastorshub.org/',{reg:429}); await until(()=>SQ.gateUp());
  SQ.D.getElementById('gsignbtn').click(); SQ.D.getElementById('semail').value='pastor.josh@example.org'; SQ.D.getElementById('sbtn').click();
  await until(()=>/Too many tries/.test(SQ.D.getElementById('serr').textContent));
  c('too many tries: says to wait an hour', /wait an hour/.test(SQ.D.getElementById('serr').textContent), true);
  const SE=page('https://pastorshub.org/',{lang:'es'}); await until(()=>SE.gateUp());
  c('in Spanish: "¿Ya se registró? Inicie sesión", "Iniciar sesión", the help note', [SE.D.getElementById('gsignbtn').textContent,SE.D.getElementById('sbtn').textContent,/Ya se registró\? Inicie sesión» y escriba el mismo correo/.test(SE.D.getElementById('ghelp').textContent)], ['¿Ya se registró? Inicie sesión','Iniciar sesión',true]);
  SE.D.getElementById('gsignbtn').click(); SE.D.getElementById('semail').value='pastor.josh@example.org';
  SE.D.getElementById('semail').dispatchEvent(new SE.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));   // Enter in the box signs in too
  await until(()=>/bienvenida/.test(SE.D.getElementById('serr').textContent));
  c('…and welcomed in Spanish (by Enter in the box)', SE.D.getElementById('serr').textContent, 'Le damos la bienvenida de nuevo, Joshua.');
  const SC=page('https://pastorshub.org/',{check:{required:true,ok:false,name:'',conf:'',picked:''}}); await until(()=>SC.gateUp());
  c('with conference codes switched on, no sign-in (a code is its own way in)', SC.D.getElementById('gsignin').hidden, true);

  console.log('\n-- layout rules checked in a real browser (jsdom does no layout) --');
  // Updated in the v10.38.0 review (P4): from 820px, since between 720 and
  // about 800 "Elder or church leader" wrapped in a half-width column.
  c('two by two from 820px, one column below', /\.regform\{display:grid;grid-template-columns:1fr;/.test(html)&&/@media\(min-width:820px\)\{\.regform\{grid-template-columns:1fr 1fr\}\}/.test(html), true);
  c('inputs and the role control share one height', /\.regf input\{[^}]*height:50px/.test(html)&&/\.seg\.regrole\{height:50px/.test(html), true);
  c('role buttons sized by their words (one line at 1280, EN and ES)', /\.seg\.regrole button\{flex:1 1 auto/.test(html), true);
  c('on a phone the three roles stack', /@media\(max-width:520px\)\{\s*\.seg\.regrole\{flex-direction:column;height:auto\}/.test(html), true);
  // Updated in the v10.38.0 review (P5): the hairline layout from 700px, where
  // the chip shrinks (the name ends in an ellipsis) instead of wrapping.
  c('the chip sits after ES from 700px and shrinks rather than wrap', /@media\(min-width:700px\)\{ \.themebtn\+\.whoami\{margin-left:4px;[^}]*flex:1 1 0;min-width:0;max-width:max-content\}/.test(html), true);
  c('narrower, it has its own row, right-aligned', /@media\(max-width:699px\)\{\s*\.top \.in\{gap:10px 12px\}\s*\.whoami\{margin-left:0;flex-basis:100%;justify-content:flex-end;order:9\}/.test(html), true);
  // v10.54.0 (accounts and plans): the Account button beside Change takes the same rule
  c('Change (and Account) as tall as Pastors Hub and ES, and not underlined', /\.whoami #regchange,\.whoami #signout,\.whoami #acctbtn\{min-height:40px;[^}]*text-decoration:none/.test(html), true);

  console.log('\n-- no page errors --');
  await wait(50);
  c('no script errors on any page', allErrs.flat().filter(e=>!/navigation/.test(e)), []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
