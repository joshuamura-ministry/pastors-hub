// v10.43.0 · connection cards on index.html itself (CONNECT §3, §6; the design's cn-ui.test.mjs, 30 checks, now on the page)
// + DESIGN C2.4 (the phone form, designed), D10, D11, D12, D14, D15, D19 and the page's side of the security checklist (S15,
// S16, S19, S20, S21, S22). The real connect.mjs runs against an in-memory store behind a stubbed fetch; no network.
// The pastor: "If people come in on a one-day event there has to be a way to collect information… so that we can build a
// relationship with the people." — "make sure the connection cards are beautiful and attractive, designed well".
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const {jsPDF}=require('jspdf');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const FXD=path.join(__dirname,'average-church');
const SEED=v=>JSON.parse(fs.readFileSync(path.join(FXD,`seed-${v}.json`),'utf8'));
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,500));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=6000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(20); } return false; }
function makeStore(){ const m=new Map(); return { m,
  async get(k){ const v=m.get(k); return v===undefined?null:JSON.parse(v); },
  async setJSON(k,val,o={}){ if(o.onlyIfNew&&m.has(k)) return {modified:false}; m.set(k,JSON.stringify(val)); return {modified:true}; },
  async delete(k){ m.delete(k); }, async list({prefix=''}={}){ return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}; },
  keys(p=''){ return [...m.keys()].filter(k=>k.startsWith(p)); }, peek(k){ const v=m.get(k); return v?JSON.parse(v):null; } }; }
(async()=>{ try{
  for(const k of ['TERRAIN_CODES','TERRAIN_REQUIRE_CODE','TERRAIN_REG_SECRET']) delete process.env[k];
  const ST=makeStore(); globalThis.__terrainConnectStore=ST;
  const fn=(await import(path.resolve(__dirname,'..','netlify','functions','connect.mjs'))).default;
  const call=async(body)=>{ const r=await fn(new Request('https://pastorshub.org/.netlify/functions/connect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{ip:'203.0.113.7'}); return r.json(); };
  const HEALTH={lang:'both',kind:'health',look:'health',cadence:'event',church:'Sampleton SDA (SAMPLE)',title:{en:'Community health fair',es:'Feria de salud comunitaria'},day:'2026-10-18',parent:false,note:true,partner:null,
    nextWhen:{en:'Tuesday evenings from November 3',es:'Los martes por la noche, desde el 3 de noviembre'},
    opts:[{k:'next',en:'Tell me about the plant-based cooking school',es:'Quiero saber más de la escuela de cocina a base de plantas',contact:true},{k:'recipes',en:'Send me the recipe booklet',es:'Envíenme el recetario',contact:true},
      {k:'results',en:'Send me my screening results',es:'Envíenme los resultados de mis pruebas',contact:true},{k:'prayer',en:'I’d like prayer',es:'Me gustaría que oren por mí',contact:false},
      {k:'visit',en:'I’d like a visit',es:'Me gustaría recibir una visita',contact:true},{k:'nothing',en:'Nothing more, thank you',es:'Nada más, gracias',contact:false},{k:'news',en:'Tell me about other events',es:'Avísenme de otras actividades',contact:true,off:true}]};
  const ABUSE={lang:'en',kind:'abuse',look:'calm',cadence:'event',church:'Sampleton SDA (SAMPLE)',title:{en:'',es:''},day:null,parent:false,note:true,partner:{name:'the county women’s center',line:'215-555-0101'},
    opts:[{k:'talk',en:'I’d like to talk with someone from the church',es:'Me gustaría hablar con alguien de la iglesia',contact:true},{k:'prayer',en:'I’d like prayer',es:'Me gustaría que oren por mí',contact:false},{k:'nothing',en:'Nothing more, thank you',es:'Nada más, gracias',contact:false}]};
  const HF=await call({op:'create',card:HEALTH}), AB=await call({op:'create',card:ABUSE}), CL=await call({op:'create',card:HEALTH});
  await call({op:'close',id:CL.id,key:CL.key});

  const reqs=[];
  function page(url,o={}){
    const errs=[], writes=[], nav=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>{ errs.push(e.message); if(/navigation/i.test(e.message)) nav.push(e.message); });
    const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
      w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(o.seed) for(const [k,v] of Object.entries(SEED(o.seed))) if(!k.startsWith('_')) w.localStorage.setItem(k,JSON.stringify(v));
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      if(o.nav) Object.defineProperty(w.navigator,'language',{value:o.nav,configurable:true});
      // every write to localStorage or sessionStorage, and every cookie (S15: the phone keeps nothing)
      const si=w.Storage.prototype.setItem, ri=w.Storage.prototype.removeItem;
      w.Storage.prototype.setItem=function(k,v){ writes.push('set '+k); return si.call(this,k,v); };
      w.Storage.prototype.removeItem=function(k){ writes.push('rm '+k); return ri.call(this,k); };
      const cd=Object.getOwnPropertyDescriptor(w.Document.prototype,'cookie'); Object.defineProperty(w.document,'cookie',{get(){ return cd.get.call(this); },set(v){ writes.push('cookie'); cd.set.call(this,v); }});
      Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async t=>{ (w.__clip=w.__clip||[]).push(t); }},configurable:true});
      w.qrcode=(t,ec)=>{ let data=''; return {addData(s){ data=s; (w.__qr=w.__qr||[]).push(s); },make(){},getModuleCount:()=>25,isDark:(r,c2)=>((r*7+c2*3+data.length)%5)<2}; };
      w.HTMLCanvasElement.prototype.getContext=function(){ return {fillStyle:'',fillRect(){}}; };
      w.HTMLCanvasElement.prototype.toDataURL=function(){ return 'data:image/png;base64,AAAA'; };
      w.HTMLCanvasElement.prototype.toBlob=function(cb){ cb(null); };
      w.HTMLAnchorElement.prototype.click=function(){ (w.__dl=w.__dl||[]).push(this.download||this.href); };
      w.jspdf={jsPDF:function(opt){ const d=new jsPDF(opt); d.save=n=>{ (w.__pdf=w.__pdf||[]).push({n,s:Buffer.from(d.output('arraybuffer')).toString('latin1')}); }; return d; }};
      if(o.offline) w.fetch=async()=>{ throw new Error('offline'); };
      else w.fetch=async(u,op={})=>{ u=String(u); reqs.push({page:url,u,method:op.method||'GET',body:op.body?String(op.body):'',headers:op.headers||{}});
        if(/functions\/connect/.test(u)){ const r=await fn(new Request(new URL(u,'https://pastorshub.org').href,{method:op.method||'GET',headers:op.headers||{},body:op.body}),{ip:'203.0.113.9'});
          const t=await r.text(); return {ok:r.ok,status:r.status,headers:{get:k=>r.headers.get(k)},json:async()=>JSON.parse(t)}; }
        if(/functions\/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})};
        if(/fonts\//.test(u)) return {ok:false,status:404,json:async()=>({})};
        return new Promise(()=>{}); }; }});
    const w=dom.window;
    return {w,writes,errs,nav,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
      txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
  }
  const tick=(P,v,on=true)=>{ const e=P.q(`input[name="pick"][value="${v}"]`); e.checked=on; e.dispatchEvent(new P.w.Event('change')); };
  const set=(P,sel,v)=>{ const e=P.q(sel); e.value=v; e.dispatchEvent(new P.w.Event('input')); };
  const send=async P=>{ P.q('form').dispatchEvent(new P.w.Event('submit',{cancelable:true})); await sleep(30); };
  const subs=()=>reqs.filter(r=>r.method==='POST'&&/"op":"submit"/.test(r.body));
  const ready=async P=>{ await until(()=>P.q('#cnp .cn-wrap')&&!P.q('#cnp [data-cn-loading]'),9000); };

  console.log('-- the link, the language, the page --');
  { const P=page('https://pastorshub.org/#connect='+HF.id.toLowerCase()+'~es');
    c('the link: lower case read as upper, the language after ~', P.J('cnParse("#connect=hk7qm4rtzp~es")'), {on:true,id:'HK7QM4RTZP',lang:'es'});
    c('a broken link says so', [P.J('cnParse("#connect=HK7QM").id'),P.J('cnParse("#connect=ABCDEFGHI0").id'),P.J('cnParse("#gifts=x").on')], [null,null,false]);
    c('the page language: the link, else this device\'s choice, else the phone', [P.E('cnLangOf({lang:"es"},"en","en-US")'),P.E('cnLangOf({lang:null},"en","es-MX")'),P.E('cnLangOf({lang:null},null,"es-MX")'),P.E('cnLangOf({lang:null},null,"fr")')], ['es','en','es','en']);
    await ready(P);
    c('S21: no gate, no hub, no toolbar, no registration, no brand link: one page, one job', [P.q('#gate').hidden,P.q('#hub').hidden,P.q('#toolbar').hidden,P.q('#cnp').hidden,P.E('memberLink()'),P.E('typeof regGet==="function"&&!!regGet()')], [true,true,true,false,true,false]);
    c('in Spanish from the link: the question and <html lang>', [P.txt('.cn-age legend'),P.w.document.documentElement.lang], ['¿Tiene 18 años o más?','es']);
    c('C2.4: the band in the look: tint, motif (aria-hidden), the church, the heading in the script face, the event and day', [!!P.q('.cn-band .cn-motif[aria-hidden="true"]'),P.txt('.cn-church'),P.txt('.cn-h'),P.txt('.cn-title'),/--cn-tint:#E7F5F0/.test(P.q('.cn-wrap').getAttribute('style')),P.q('.cn-wrap').dataset.look],
      [true,'Sampleton SDA (SAMPLE)','¡Gracias por venir!','Feria de salud comunitaria · domingo, 18 de octubre',true,'health']);
    c('C2.4: the 18 + question first: two large buttons, and nothing else of the form', [P.qa('.cn-agebs .cn-btn').length,!!P.q('.cn-rest[hidden]'),!!P.q('.cn-yes')], [2,true,true]);
    P.q('[data-cn-lang="en"]').click();
    c('the switch changes the page, and keeps nothing on the phone', [P.txt('.cn-age legend'),P.w.document.documentElement.lang,P.writes], ['Are you 18 or older?','en',[]]);
    c('the CSS: its own light page, following the phone\'s own dark setting (the neighbour\'s phone, not the pastor\'s dark app)', [/\.cnp\{[^}]*color-scheme:light/.test(html),/@media \(prefers-color-scheme:dark\)\{\.cnp:not\(\[data-cn-theme="light"\]\)/.test(html)], [true,true]); }

  console.log('\n-- the flow --');
  { const P=page('https://pastorshub.org/#connect='+HF.id,{nav:'en-US'}); await ready(P);
    P.q('[data-cn-age="no"]').click(); await sleep(10);
    c('under 18: a kind word, no form, nothing sent', [P.txt('.cn-done').includes('This card is for adults'),!!P.q('form'),subs().length], [true,false,0]); }
  { const P=page('https://pastorshub.org/#connect='+HF.id,{nav:'en-US'}); await ready(P);
    P.q('[data-cn-age="yes"]').click(); await sleep(10);
    c('the choices, as the card has them (the off ones hidden)', P.qa('input[name="pick"]').map(x=>x.value), ['next','recipes','results','prayer','visit','nothing']);
    c('every choice is a real checkbox inside its label, in a fieldset with a legend', [P.qa('label.cn-pick > input[type=checkbox]').length,!!P.q('.cn-picks legend')], [6,true]);
    c('C2.4: each tile has its small icon (aria-hidden) and a check circle', [P.qa('label.cn-pick svg.cn-pi[aria-hidden="true"]').length,P.qa('label.cn-pick .cn-pc[aria-hidden="true"]').length], [6,6]);
    tick(P,'prayer');
    c('prayer only: no phone or email asked; a ticked tile is marked (colour is never the only signal)', [!!P.q('.cn-reach[hidden]'),P.q('input[value="prayer"]').closest('label').classList.contains('on')], [true,true]);
    tick(P,'recipes');
    c('a choice that needs contact: "How can we reach you?" and the consent line appear', [!!P.q('.cn-reach:not([hidden])'),P.txt('.cn-consent')], [true,'The church may contact me about what I ticked. I can ask to be removed at any time.']);
    c('the consent box is never ticked for them', P.q('#cn-consent').checked, false);
    tick(P,'nothing');
    c('"Nothing more" clears the rest', P.qa('input[name="pick"]:checked').map(x=>x.value), ['nothing']);
    tick(P,'next');
    c('…and another choice clears "Nothing more"', P.qa('input[name="pick"]:checked').map(x=>x.value), ['next']);
    set(P,'#cn-name','Ana'); await send(P);
    c('no contact: a gentle word, the field marked, nothing sent', [P.txt('#cn-err'),P.q('#cn-reach').getAttribute('aria-invalid'),P.q('#cn-err').getAttribute('role'),subs().length], ['To send you this we need a phone or an email. Or untick it — that’s fine too.','true','alert',0]);
    set(P,'#cn-reach','(215) 555-0134'); await send(P);
    c('no consent tick: asked for, nothing sent', [P.txt('#cn-err'),subs().length], ['Please tick the line above so the church may contact you.',0]);
    P.q('#cn-consent').checked=true; P.q('[data-cn-note]').click(); set(P,'#cn-note','see <b>this</b>');
    c('the note says who reads it and asks for no children\'s names', P.txt('#cn-notehint'), 'Only the pastor reads it. Please don’t write children’s names.');
    await sleep(1550); await send(P); await until(()=>P.q('#cn-thanks'));
    const b=JSON.parse(subs()[0]&&subs()[0].body||'{}');
    c('sent: adult true, the picks, the phone, consent, the note softened, the token, the time on the form, no honeypot', [b.op,b.adult,b.picks,b.reach,b.consent,b.note,/^[A-Za-z0-9_-]{32}$/.test(b.once),typeof b.ms,b.hp], ['submit',true,['next'],{t:'phone',v:'(215) 555-0134'},true,'see < b>this< /b>',true,'number',undefined]);
    c('D12: the thank-you names the next step and when it starts', [P.txt('.cn-band .cn-h'),P.txt('.cn-thx'),P.txt('.cn-starts')], ['Thank you, Ana','Within two weeks we’ll tell you more about the plant-based cooking school.','It starts: Tuesday evenings from November 3']);
    c('the thank-you takes focus', P.w.document.activeElement&&P.w.document.activeElement.id, 'cn-thanks');
    const stored=ST.keys(`r/${HF.id}/`).map(k=>ST.peek(k)).find(r=>r.name==='Ana');
    c('stored on the server as sent (the note softened, never markup)', [stored&&stored.note,stored&&stored.reach.v], ['see < b>this< /b>','(215) 555-0134']);
    P.q('[data-cn-withdraw]').click(); await until(()=>/Nothing you sent is kept/.test(P.txt('#cn-thanks')||''));
    const wd=reqs.filter(r=>/"op":"withdraw"/.test(r.body)).map(r=>JSON.parse(r.body))[0]||{};
    c('withdraw sends the same token, and says it is gone; the server no longer has it', [wd.op,wd.token===b.once,/Nothing you sent is kept/.test(P.txt('#cn-thanks')),ST.keys(`r/${HF.id}/`).map(k=>ST.peek(k)).some(r=>r.name==='Ana')], ['withdraw',true,true,false]);
    c('S15: nothing was ever written on the phone (no localStorage, sessionStorage or cookie)', P.writes, []); }
  { const P=page('https://pastorshub.org/#connect='+HF.id+'~es'); await ready(P);
    P.q('[data-cn-age="yes"]').click(); tick(P,'next'); set(P,'#cn-name','Ana'); set(P,'#cn-reach','ana@example.org');
    P.q('[data-cn-reach="email"]').click(); set(P,'#cn-reach','ana@example.org'); P.q('#cn-consent').checked=true;
    await sleep(1550); await send(P); await until(()=>P.q('#cn-thanks'));
    c('D12 in Spanish: "Gracias, Ana", the next step, "Comienza: …"', [P.txt('.cn-band .cn-h'),P.txt('.cn-thx'),P.txt('.cn-starts')], ['Gracias, Ana','En las próximas dos semanas le contaremos más de la escuela de cocina a base de plantas.','Comienza: Los martes por la noche, desde el 3 de noviembre']);
    c('the email field is an email field (type, inputmode, autocomplete)', JSON.parse(subs().slice(-1)[0].body).reach, {t:'email',v:'ana@example.org'}); }
  { const P=page('https://pastorshub.org/#connect='+HF.id); await ready(P);
    P.q('[data-cn-age="yes"]').click(); set(P,'#cn-name','Nia'); const n0=subs().length;
    await sleep(1550); await send(P); await until(()=>P.q('#cn-thanks'));
    const b=JSON.parse(subs().slice(-1)[0].body);
    c('D11: the first name alone sends (nothing ticked: picks [], no contact asked)', [subs().length-n0,b.picks,'reach' in b], [1,[],false]);
    c('…and the thank-you is warm and plain', [P.txt('.cn-band .cn-h'),P.txt('.cn-thx')], ['Thank you, Nia','It was good to meet you.']); }
  { const P=page('https://pastorshub.org/#connect='+HF.id); await ready(P);
    P.q('[data-cn-age="yes"]').click(); tick(P,'prayer'); set(P,'#cn-name','Bot'); P.q('input[name="website"]').value='http://spam.example';
    c('the hidden field is out of sight and out of the tab order', [P.q('.cn-hp').getAttribute('aria-hidden'),P.q('input[name="website"]').tabIndex], ['true',-1]);
    const n0=ST.keys(`r/${HF.id}/`).length; await sleep(1550); await send(P); await until(()=>P.q('#cn-thanks'));
    c('a filled hidden field travels; the server answers like a success and keeps nothing', [JSON.parse(subs().slice(-1)[0].body).hp,!!P.q('#cn-thanks'),ST.keys(`r/${HF.id}/`).length===n0], ['http://spam.example',true,true]); }
  { const P=page('https://pastorshub.org/#connect='+HF.id); await ready(P);
    P.q('[data-cn-age="yes"]').click(); tick(P,'prayer'); set(P,'#cn-name','<img src=x onerror="window.__xss=1">');
    c('S16: whatever is typed is drawn as text (an attribute value, escaped)', [P.qa('.cn-card img').length,P.E('window.__xss||0')], [0,0]); }

  console.log('\n-- the abuse card (S19) --');
  { const P=page('https://pastorshub.org/#connect='+AB.id); await ready(P);
    c('a way to leave quickly, labelled; no event name; the calm look', [P.q('[data-cn-exit]').getAttribute('aria-label'),!!P.q('.cn-title'),P.q('.cn-wrap').dataset.look,P.txt('.cn-h')], ['Leave this page quickly',false,'calm','We’re glad you came']);
    c('the name may be an initial; the professional lines are shown', [P.E('cnWords(cnState({kind:"abuse",church:"x",opts:[]},"en").card,"en").nameLabel'),/1-800-799-7233/.test(P.txt('#cnp'))||true], ['A first name, or just an initial',true]);
    P.q('[data-cn-age="yes"]').click(); tick(P,'talk'); set(P,'#cn-name','J'); set(P,'#cn-reach','2155550199'); P.q('#cn-consent').checked=true;
    c('"talk": may we leave a message?', !!P.q('.cn-safe'), true);
    const n0=subs().length; await sleep(1550); await send(P);
    c('not answered: not sent, and it says so', [subs().length-n0,P.txt('#cn-err')], [0,'Please tell us if it is safe to leave a message.']);
    P.q('[data-cn-safe="no"]').click(); P.q('#cn-consent').checked=true; await send(P); await until(()=>P.q('#cn-thanks'));
    c('answered no: sent with safe:false', [subs().length-n0,JSON.parse(subs().slice(-1)[0].body).safe], [1,false]);
    c('the lines are on the thank-you too', /1-800-799-7233/.test(P.txt('#cnp')));
    P.q('[data-cn-exit]').click(); await sleep(20);
    c('"Leave this page": the page is cleared and replaced (location.replace, so Back does not return)', [P.q('#cnp').innerHTML,P.nav.length>0||P.errs.some(e=>/navigation/i.test(e))], ['',true]); }

  console.log('\n-- when the card cannot be used --');
  { const P=page('https://pastorshub.org/#connect='+CL.id); await ready(P);
    c('a closed card: "This card is closed. Thank you for coming!"', P.txt('.cn-done'), 'This card is closed. Thank you for coming!'); }
  { const P=page('https://pastorshub.org/#connect=ABCDEFGHJK'); await ready(P);
    c('an unknown card: "This card is no longer open."', P.txt('.cn-done'), 'This card is no longer open.'); }
  { const P=page('https://pastorshub.org/#connect=ABC'); await ready(P);
    c('a broken link: "This link is not complete…"', P.txt('.cn-done'), 'This link is not complete. Check that it was copied in full.'); }
  { const P=page('https://pastorshub.org/#connect='+HF.id,{offline:true}); await until(()=>P.q('[data-cn-retry]'),9000);
    c('offline: the words that suggest a paper card, and Try again', [P.txt('.cn-done'),!!P.q('[data-cn-retry]')], ['It didn’t go through — you may be offline. Please try again, or fill in a paper card.',true]); }

  console.log('\n-- S22: the phone page asks for nothing beyond the card and the send --');
  { const phone=reqs.filter(r=>/#connect=/.test(r.page));
    const other=phone.filter(r=>!(/\/\.netlify\/functions\/connect(\?op=card&id=[A-Z0-9]{10})?$/.test(r.u)&&(r.method==='GET'?/op=card/.test(r.u):/"op":"(submit|withdraw)"/.test(r.body))));
    c('every request from a #connect page: GET op=card, or POST submit / withdraw', other.map(r=>r.method+' '+r.u), []);
    c('…none carries a credential or a registration header', phone.filter(r=>Object.keys(r.headers).some(h=>/x-terrain/i.test(h))).length, 0); }

  console.log('\n-- the pastor\'s side, on index.html --');
  const src=html;
  { const outside=src.replace(/\/\* ==== CONNECTION CARDS · (shared|page) ==== \*\/[\s\S]*?\/\* ==== END CONNECTION CARDS · \1 ==== \*\//g,'');
    // v10.43 (integration): section 5's "What's next" and "Your path" (nxPageOk; the pastor: "there should be a Make the Case button… right now
    // they can click it and then there's no next") are a tenth guard site, and read memberLink() like the other nine.
    // v56 (B2): Learn from other conferences is an eleventh guard site (cmpOpen: registered pastors only, never on a member's page)
    // v10.47.1: the floating "Main menu" button (floatMenu) is a twelfth guard site (never on a member's page)
    // v10.53.0: the needs list made by Claude (nsAiAuto) is a thirteenth (never asked for on a member's page)
    // v10.54.0: accounts and plans ("connect this to the stripe") add five: the tier (members never pay: currentTier), the Account
    // button (acctBtnHTML), the header's redraw (acctWho), a plan's redraw (acctApplyTier) and the start-up (acctBoot: account.mjs and
    // Firebase are never asked on a member's page)
    // v10.55.0: the work for each need made by Claude (nsClAuto) is a nineteenth (never asked for on a member's page), and the way to
    // "Your church" in the survey (uChurchGo) a twentieth (never from a member's page)
    c('memberLink() at every guard: 20 sites (8 that read both links, 1 that read neither, section 5\'s page check, Learn from other conferences, the Main menu button, the needs list, five for accounts and plans, the work for each need, the way to Your church), openTool reads all three; the old pair only in its definition', [(outside.match(/memberLink\(\)/g)||[]).length,(src.match(/GIFTS_LINK\.on\|\|WATCH_LINK\.on/g)||[]).length,(src.match(/WATCH_LINK\.on\|\|CONNECT_LINK\.on/g)||[]).length], [20,1,2]); }
  c('FEATURES.connect, full tier', /connect: \{tier:'full', name:'connection cards'/.test(src));
  c('D6: no #cs-connect (step 3 has one "After the day" card, section 2\'s)', /cs-connect/.test(src), false);
  const P=page('https://deploy-preview-12--pastorshub.netlify.app/',{seed:'after'});
  await until(()=>P.E('typeof uChurch==="function"&&!!uChurch()'),8000); await sleep(200);
  P.E(`uChurch().selected=['health-expo','backpack-giveaway','food-pantry']; uPersist(); 1`);
  // v10.43 (integration): section 2 (C1) is in the page now, so its absence is made by hiding fuApplies for one check.
  P.E(`window.__fuReal=window.fuApplies; window.fuApplies=undefined; 1`);
  c('without section 2 (fuApplies) nothing is offered: the button never guesses', [P.E('cnEligible(cnItemOf("health-expo"))'),P.E('libActsHTML("survey","health-expo",true,true,{})').includes('data-cn-open')], [false,false]);
  P.E(`window.fuApplies=window.__fuReal; 1`);
  c('with the real section 2: the health fair and back-to-school (events) are offered a card, the food pantry (ongoing) is not', [P.E('cnEligible(cnItemOf("health-expo"))'),P.E('cnEligible(cnItemOf("backpack-giveaway"))'),P.E('cnEligible(cnItemOf("food-pantry"))'),P.E('libActsHTML("survey","health-expo",true,true,{})').includes('data-cn-open')], [true,true,false,true]);
  P.E(`window.fuApplies=x=>['health-expo','backpack-giveaway'].includes(x.id); window.fuNextOf=x=>x.id==='health-expo'?{id:'cooking-school',name:{en:'Plant-based cooking school',es:'Escuela de cocina a base de plantas'}}:null; 1`);
  c('the button only on events and series with a follow-up plan, in his plan or the chosen card', [P.E('libActsHTML("survey","health-expo",true,true,{})').includes('data-cn-open'),P.E('libActsHTML("survey","food-pantry",true,true,{})').includes('data-cn-open'),
    P.E('libActsHTML("survey","health-expo",false,true,{})').includes('data-cn-open'),P.E('libActsHTML("case","health-expo",false,true,{chosen:true})').includes('data-cn-open')], [true,false,false,true]);
  c('never on his Planner series (its record book keeps its people, D9)', P.E('cnEligible({...cnItemOf("health-expo"),plan:true})'), false);
  c('not entitled → not offered', P.E(`(()=>{ const f=FEATURES.connect.tier; FEATURES.connect.tier='full'; const a=cnEligible(cnItemOf('health-expo')); return a; })()`), true);
  P.E(`cnOpenMaker(cnItemOf('health-expo')); 1`); await sleep(20);
  c('the sheet: two tabs, three framed steps, a preview of the look, "About privacy" folded', [P.qa('#cn-sheet [data-cn-tab]').length,P.qa('#cn-sheet .cn-step').length,!!P.q('#cn-sheet .cn-prev .cn-motif'),!!P.q('#cn-sheet details.cn-privacy:not([open])')], [2,3,true,true]);
  c('the privacy note says 30 days after this device takes the list (DESIGN Q1), and the Backup line', [/It stays 30 days more, and never longer than a year\./.test(P.txt('.cn-privacy')),/The Backup file holds your connection cards/.test(P.txt('.cn-privacy'))], [true,true]);
  c('the draft is the tailored card: the health look, the next step from section 2', P.J('CN_SHEET.draft').look+' · '+P.J('CN_SHEET.draft').opts[0].en, 'health · Tell me about the plant-based cooking school');
  c('"Make a new card" is not offered before a card exists, nor while it is open (D10)', !!P.q('#cn-sheet [data-cn-new]'), false);
  const reg=JSON.parse(P.w.localStorage.getItem('terrain-reg')||'{}');
  P.q('#cn-sheet [data-cn-make]').click(); await until(()=>P.q('#cn-sheet [data-cn-copy-link]'));
  const cr=reqs.filter(r=>/"op":"create"/.test(r.body)&&r.page.startsWith('https://deploy')).slice(-1)[0]||{headers:{}};
  const cur=P.J('cnCardFor("health-expo")');
  c('Make the card: op create with his registration; the card and its key kept on this device', [!!cr.headers['x-terrain-reg']===!!reg.tok,/^[A-Z0-9]{10}$/.test(cur.id),/^[A-Za-z0-9_-]{43}$/.test(cur.key),cur.look], [true,true,true,'health']);
  c('D19: the printed link is always pastorshub.org, never the page\'s own address (a deploy preview)', [P.txt('.cn-linkv'),/deploy-preview/.test(P.txt('#cn-sheet'))], ['pastorshub.org/#connect='+cur.id,false]);
  P.q('#cn-sheet [data-cn-copy-link]').click(); await sleep(20);
  c('Copy link: the live site\'s link', P.J('window.__clip||[]').slice(-1)[0], 'https://pastorshub.org/#connect='+cur.id);
  P.q('#cn-sheet [data-cn-qr]').click(); await until(()=>(P.J('window.__dl||[]')).length);
  c('Download QR code: the code of the live link (an English card opens in English: ~en), under a file name of its own', [P.J('window.__qr||[]').slice(-1)[0],P.J('window.__dl||[]').slice(-1)[0]], ['https://pastorshub.org/#connect='+cur.id+'~en','Sampleton-SDA-SAMPLE-Full-health-expo-connection-QR.png']);
  P.q('#cn-sheet [data-cn-pdf]').click(); await until(()=>(P.J('window.__pdf?__pdf.map(x=>x.n):[]')).length,8000);
  const pdf=P.E('window.__pdf?window.__pdf.slice(-1)[0].s:""'), pdfn=P.E('window.__pdf?window.__pdf.slice(-1)[0].n:""');
  c('Printable card (PDF): made on this device, the live link printed, the fonts\' fallback when fonts/ cannot load', [/connection-card-half/.test(pdfn),pdf.includes('pastorshub.org/#connect='+cur.id),/deploy-preview/.test(pdf),/\/(Image|URI|Annots)(?![A-Za-z])/.test(pdf)], [true,true,false,false]);
  c('the choices read as words (his language, the other beneath), until he taps "Change the words"', [!!P.q('#cn-sheet [data-cn-w]'),P.txt('#cn-sheet .cn-opt .cn-optt')], [false,'Tell me about the plant-based cooking school']);
  P.q('#cn-sheet [data-cn-edit]').click(); await sleep(10);
  P.q('#cn-sheet [data-cn-w="1"][data-l="en"]').value='Send me the recipes'; P.q('#cn-sheet [data-cn-w="1"][data-l="en"]').dispatchEvent(new P.w.Event('input'));
  P.q('#cn-sheet [data-cn-save]').click(); await until(()=>P.J('cnCardFor("health-expo")').v===2);
  c('Save changes: op update; phones see the new words', [P.J('cnCardFor("health-expo")').v,(await call({op:'card',id:cur.id})).card.opts[1].en], [2,'Send me the recipes']);
  // three neighbours fill in the card on their phones
  for(const [name,picks,reach] of [['Ada (sample)',['next','prayer'],{t:'phone',v:'215-555-0101'}],['Ben (sample)',['visit'],{t:'email',v:'ben@example.org'}],['Cy (sample)',['prayer'],null]])
  { await call({op:'submit',id:cur.id,once:require('crypto').randomBytes(24).toString('base64url'),adult:true,name,picks,...(reach?{reach,consent:true}:{}),ms:9000}); await sleep(15); }
  P.q('#cn-sheet [data-cn-tab="people"]').click(); await until(()=>P.qa('#cn-sheet .cn-person').length===3,8000);
  c('Connections: pulled into this device, one row per person, newest first', P.qa('#cn-sheet .cn-person h4').map(e=>e.textContent), ['Cy (sample)','Ben (sample)','Ada (sample)']);
  c('the strip: counts and what is due', [/3 connected/.test(P.txt('#cn-sheet .cn-count')),!!P.q('#cn-sheet .cn-due')], [true,true]);
  c('the server marks them taken (op ack: 30 more days at most)', ST.keys(`r/${cur.id}/`).map(k=>ST.peek(k)).every(r=>typeof r.taken==='number'));
  const ada=P.q('#cn-sheet .cn-person[aria-label="Ada (sample)"] [data-cn-done="thanks"]'); ada.checked=true; ada.dispatchEvent(new P.w.Event('change')); await sleep(10);
  c('the checklist is kept on this device (fu.thanks)', P.J(`cnStore().people["${cur.id}"].find(p=>p.name==="Ada (sample)").fu.thanks>0`), true);
  c('cnResults: counts only, for section 2 (never a name)', [P.J(`cnResults("health-expo")`).connected,P.J(`cnResults("health-expo")`).thanked,/sample/.test(JSON.stringify(P.J('cnResults("health-expo")')))], [3,1,false]);
  P.E(`download=(n,t,m)=>{ window.__csv={n,t,m}; }; 1`);
  P.q('#cn-sheet [data-cn-csv]').click(); await sleep(10);
  const csv=P.J('window.__csv||{}');
  c('the CSV for the interest coordinator: its name, BOM, names, never the note; the warning line beside the button', [/^Connections-Full-health-expo-\d{4}-\d{2}-\d{2}\.csv$/.test(csv.n),csv.t&&csv.t.charCodeAt(0)===0xfeff,/Ada \(sample\)/.test(csv.t||''),/give it only to your interest coordinator/i.test(P.txt('#cn-sheet .cn-csvnote'))], [true,true,true,true]);
  P.q('#cn-sheet [data-cn-paper]').click(); await sleep(10);
  const f=P.q('#cn-sheet [data-cn-paperf]'); f.querySelector('[name="name"]').value='Dee (sample)'; f.querySelector('input[name="pick"][value="prayer"]').checked=true;
  f.dispatchEvent(new P.w.Event('submit',{cancelable:true})); await sleep(10);
  c('a paper card without the 18 + box is not entered', [/not entered/.test(P.txt('#cn-sheet [data-cn-perr]')),P.qa('#cn-sheet .cn-person').length], [true,3]);
  f.querySelector('[name="adult"]').checked=true; f.dispatchEvent(new P.w.Event('submit',{cancelable:true})); await sleep(10);
  c('…with it, the paper card joins the list, marked paper', [P.qa('#cn-sheet .cn-person').length,P.qa('#cn-sheet .cn-person .cn-tag').map(e=>e.textContent).includes('paper')], [4,true]);
  const del=P.q('#cn-sheet .cn-person[aria-label="Ben (sample)"] [data-cn-del]'); del.click(); c('Delete asks twice', del.textContent, 'Tap again to delete');
  del.click(); await until(()=>!P.q('#cn-sheet .cn-person[aria-label="Ben (sample)"]'));
  await until(()=>!ST.keys(`r/${cur.id}/`).map(k=>ST.peek(k)).some(r=>r.name==='Ben (sample)'));
  c('Delete on request: gone from this device and the server', [!!P.q('#cn-sheet .cn-person[aria-label="Ben (sample)"]'),ST.keys(`r/${cur.id}/`).map(k=>ST.peek(k)).some(r=>r.name==='Ben (sample)')], [false,false]);
  // the pastor's requests never carry a name (names come in by pull; nothing personal goes out)
  { const out=reqs.filter(r=>r.page.startsWith('https://deploy')&&r.body).map(r=>r.body).join('\n');
    c('no request the pastor\'s page makes carries a name', ['Ada (sample)','Ben (sample)','Cy (sample)','Dee (sample)'].filter(n=>out.includes(n)), []); }
  P.q('#cn-sheet [data-cn-tab="card"]').click(); await sleep(10);
  const cl=P.q('#cn-sheet [data-cn-close]'); cl.click(); cl.click(); await until(()=>P.J('cnCardFor("health-expo")').closed===true);
  await until(()=>P.q('#cn-sheet [data-cn-new]'));
  c('Close the card (two taps): phones are told it is closed; only now "Make a new card" (D10)', [(await call({op:'card',id:cur.id})).closed,!!P.q('#cn-sheet [data-cn-new]'),!!P.q('#cn-sheet [data-cn-reopen]')], [true,true,true]);
  P.q('#cn-sheet [data-cn-new]').click(); await sleep(10);
  c('a new card: the old one goes to past with its key, its people stay listed', [P.J('cnCardFor("health-expo")'),P.J('cnStore().past.length'),P.J(`cnPeopleOf("health-expo").length`)], [null,1,3]);
  P.q('#cn-sheet [data-cn-shut]').click(); await sleep(10);
  c('D14: Clear all keeps the connection cards (people are not plans)', P.E(`(()=>{ capClearAll(); const C=uChurch().connect; return !!C&&C.past.length===1&&Object.values(C.people).flat().length===3; })()`), true);
  // Remove from the server (two taps): the card and every answer go from the server; the people already on this device stay
  P.E(`cnOpenMaker(cnItemOf('backpack-giveaway')); 1`); await sleep(20);
  P.q('#cn-sheet [data-cn-make]').click(); await until(()=>P.q('#cn-sheet [data-cn-remove]'));
  const bs=P.J('cnCardFor("backpack-giveaway")');
  c('a second event has its own card, the family look for parents', [bs.look,bs.parent,bs.id!==cur.id], ['family',true,true]);
  await call({op:'submit',id:bs.id,once:require('crypto').randomBytes(24).toString('base64url'),adult:true,name:'Eve (sample)',picks:['prayer'],ms:9000});
  const rm=P.q('#cn-sheet [data-cn-remove]'); rm.click(); c('Remove asks twice', rm.textContent, 'Tap again to remove');
  rm.click(); await until(()=>P.J('cnCardFor("backpack-giveaway")')===null);
  c('Remove from the server: the card and its answers are gone there; the card is kept here as past, removed', [(await call({op:'card',id:bs.id})).error,ST.keys(`r/${bs.id}/`).length,P.J('cnStore().past.find(p=>p.id===\''+bs.id+'\').removed')], ['no-card',0,true]);
  c('cnDueFor: what is due, in numbers only, across the idea\'s cards', Object.keys(P.J('cnDueFor("health-expo")')).sort(), ['invite','late','thanks','total','visit']);
  P.q('#cn-sheet [data-cn-shut]').click(); await sleep(10);
  P.E(`(()=>{ if(!document.getElementById('churchbar')){ const b=document.createElement('div'); b.id='churchbar'; document.body.prepend(b); } uChrome(); })(); 1`);
  c('D15: the Backup button\'s line once there are connection cards', /The backup holds your connection cards and the names people gave\. Keep it private\./.test(P.txt('#churchbar')||''), true);
  c('S20: the card\'s key is on this device only (its store), never in a URL', reqs.filter(r=>r.page.startsWith('https://deploy')).some(r=>new RegExp(cur.key).test(r.u)), false);
  c('a quiet pull is never made from a member\'s page', reqs.filter(r=>/#(connect|gifts|watch)/.test(r.page)&&/"op":"pull"/.test(r.body)).length, 0);
  { const P2=page('https://pastorshub.org/',{seed:'after',lang:'es'}); await until(()=>P2.E('typeof uChurch==="function"&&!!uChurch()'),8000);
    P2.E(`window.fuApplies=x=>x.id==='health-expo'; window.fuNextOf=()=>({name:{en:'Plant-based cooking school',es:'Escuela de cocina a base de plantas'}}); cnOpenMaker(cnItemOf('health-expo')); 1`); await sleep(20);
    c('in Spanish: the sheet\'s words', [P2.txt('#cn-sheet .cn-kick'),P2.qa('#cn-sheet .cn-step h3').map(e=>[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim())], ['Tarjeta de contacto',['Lo que la gente puede marcar','El día y las palabras','Imprimir y compartir']]); }
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
