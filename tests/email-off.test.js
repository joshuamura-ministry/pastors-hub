// v10.38.0 — email is off for now. GF_EMAIL_ENABLED=false (next to GF_FN)
// makes the gifts tool behave as if the server had no mail service, even when
// the server says it can send (email:true): no address or consent on the
// first screen, no "Email me my report", no email wording in the Send box, the
// invitation, the setup screen or the report's "what happens next", and no
// address sent to the server. Download PDF stays. Runs the real gifts.mjs
// with Resend configured and stubbed, so the server really does say email:true.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=6000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(20); } return false; }
function makeStore(){
  const m=new Map();
  return { m,
    async get(k){ const v=m.get(k); return v===undefined?null:JSON.parse(v); },
    async setJSON(k,val,o={}){ if(o.onlyIfNew&&m.has(k)) return {modified:false}; m.set(k,JSON.stringify(val)); return {modified:true}; },
    async delete(k){ m.delete(k); },
    async list({prefix=''}={}){ return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}; },
    peek(k){ const v=m.get(k); return v?JSON.parse(v):null; } };
}
const EMAILY=/e-?mail|correo/i;

(async()=>{ try{
  delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.SITE_URL;
  process.env.RESEND_API_KEY='re_test'; process.env.GIFTS_FROM='Terrain <reports@example.org>';
  const store=makeStore(); globalThis.__terrainGiftsStore=store;
  const resend=[];
  globalThis.fetch=async(u,o={})=>{ if(/api\.resend\.com/.test(String(u))){ resend.push(JSON.parse(o.body)); return {ok:true,status:200,json:async()=>({id:'em'})}; }
    throw new Error('no network in tests'); };
  const handler=(await import(path.resolve(__dirname,'..','netlify','functions','gifts.mjs'))).default;
  const calls=[], allErrs=[];
  function page(url,{lang,failSubmit=false}={}){
    const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message)); allErrs.push(errs);
    const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
        if(lang) w.localStorage.setItem('terrain-lang',lang);
        Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async()=>{}},configurable:true});
        w.fetch=async(u,o={})=>{
          if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})};
          if(/functions\/gifts/.test(u)){
            const body=o.body?JSON.parse(o.body):{}; calls.push(body);
            if(failSubmit&&body.op==='submit') throw new TypeError('Failed to fetch');
            const res=await handler(new Request('https://pastorshub.org'+u,{method:o.method||'GET',headers:o.headers,body:o.body}),{});
            const t=await res.text();
            return {ok:res.ok,status:res.status,json:async()=>JSON.parse(t)};
          }
          return new Promise(()=>{});
        };
      }});
    return {w:dom.window,D:dom.window.document,E:s=>dom.window.eval(s)};
  }

  console.log('-- the switch --');
  const P=page('https://pastorshub.org/');
  await until(()=>P.E('typeof gfMemberLink==="function"'));
  c('GF_EMAIL_ENABLED is false', P.E('GF_EMAIL_ENABLED'), false);
  c('declared once, right beside GF_FN', /const GF_FN='\/\.netlify\/functions\/gifts';\n(?:\/\*[\s\S]*?\*\/\n)?let GF_EMAIL_ENABLED=false;/.test(html), true);
  c('every email check goes through gfEmailOn(), which asks the switch first', [(html.match(/GF_SERVER\.email/g)||[]).length,/const gfEmailOn=\(\)=>GF_EMAIL_ENABLED===true&&/.test(html)], [1,true]);
  const st=await (await handler(new Request('https://pastorshub.org/.netlify/functions/gifts',{method:'GET'}),{})).json();
  c('the server in this test really can send (email:true)', st.email, true);

  console.log('\n-- the setup screen and the invitation --');
  P.E(`(()=>{ const ch=uChurch(); ch.name='Bucks County SDA'; ch.share={church:'Bucks County SDA',min:{}}; uPersist(); openTool('gifts'); GF_VIEW='setup'; gfRender(); })()`);
  P.D.getElementById('gflink2').click();
  await until(()=>P.D.getElementById('gflinkbox2').value&&/Results come straight back/.test(P.D.getElementById('gflinknote2').textContent));
  const note=P.D.getElementById('gflinknote2').textContent;
  c('the note under the link says members download a PDF, and nothing about email', [/Members can download their report as a PDF\./.test(note),EMAILY.test(note)], [true,false]);
  await until(()=>P.D.getElementById('gfmsg')&&P.D.getElementById('gfmsg').value);
  c('the invitation message says nothing about email', EMAILY.test(P.D.getElementById('gfmsg').value), false);
  // Added in the v10.38.0 review (P6): the help above the message named "a church email".
  // v10.42 part 3 (SPEC-FOCUS E: "ready announcement text EN + ES for the bulletin, text message, WhatsApp and the pulpit"): the
  // help line follows the kind chosen (WhatsApp first); none of the four speaks of email
  c('the help above the message says nothing about email either', [P.D.querySelector('.gfmsghelp').textContent,EMAILY.test(P.D.querySelector('.gfmsghelp').textContent)],
    ['For WhatsApp: words between *stars* show in bold.',false]);
  c('…nor any of the four announcements or their help lines', ['bulletin','text','whatsapp','pulpit'].some(k=>{ P.D.querySelector(`[data-mk="${k}"]`).click(); return EMAILY.test(P.D.getElementById('gfmsg').value+' '+P.D.querySelector('.gfmsghelp').textContent); }), false);
  P.D.querySelector('[data-mk="whatsapp"]').click();
  c('nothing on the whole setup screen mentions email', EMAILY.test(P.D.getElementById('gifts').textContent.replace(/\S+@\S+/g,'')), false);
  const link=P.D.getElementById('gflinkbox2').value, pub=P.E('uChurch().share.pub');

  console.log('\n-- the member --');
  const M=page(link);
  const D=M.D;
  await until(()=>D.getElementById('gfstart')&&M.E('GF_SERVER&&GF_SERVER.ok&&GF_SERVER.email'));
  D.querySelector('.gfchip[data-age="adult"]').click();
  await sleep(60);
  c('an adult is not offered an email field or consent, though the server can send', [!!D.getElementById('gfemail'),!!D.getElementById('gfemailok'),D.getElementById('gfemailslot').innerHTML], [false,false,'']);
  c('the first screen says nothing about email', EMAILY.test(D.getElementById('giftbody')?D.getElementById('giftbody').textContent:D.body.textContent), false);
  // An address left on this phone from before (when email was on) is dropped at Begin.
  M.E(`GFS.email='old@example.org'; GFS.emailOk=true; gfSave();`);
  D.getElementById('gfname').value='Maria Lopez';
  D.getElementById('gfstart').click();
  c('an address left from before is dropped at Begin', [M.E('GFS.email'),M.E('GFS.emailOk')], ['',false]);
  M.E(`GIFTS.forEach(g=>{for(let k=0;k<5;k++) GFS.a[g.id+'.'+k]=g.id==="teach"?4:2;}); GF_HEART.forEach(q=>GFS.h[q.k]=1); GFS.i=GF_TOTAL; GFS.done=true; gfSave(); gfRender();`);
  await until(()=>D.getElementById('gfsend'));
  c('the report: Download PDF, no "Email me my report"', [!!D.getElementById('gfpdf'),!!D.getElementById('gfemail')], [true,false]);
  c('the Send box says nothing about email', EMAILY.test(D.getElementById('gfsendnote').textContent), false);
  // Even with an address and consent on the device, nothing goes to the server.
  M.E(`GFS.email='maria@example.org'; GFS.emailOk=true; gfSave();`);
  D.getElementById('gfsend').click();
  await until(()=>M.E('GFS.sent===true'));
  await sleep(200);
  const sub=calls.filter(x=>x.op==='submit').pop();
  c('the result goes to the pastor with no address', [!!sub,'email' in sub,'emailOk' in sub], [true,false,false]);
  const rec=[...store.m.keys()].filter(k=>k.startsWith('r/'+pub+'/')).map(k=>store.peek(k))[0];
  c('the server holds no address for it', [rec.email,rec.emailOk], [null,false]);
  c('the Sent box: no email button, no email note', [!!D.getElementById('gfsentemail'),!!D.getElementById('gfsentemailnote'),EMAILY.test(D.getElementById('gfsendbox').textContent)], [false,false,false]);
  c('and "You can close this page" straight away', D.getElementById('gfsentclose').hidden, false);
  c('no email op was ever called, and Resend never', [calls.filter(x=>/^email/.test(x.op||'')).length,resend.length], [0,0]);
  const own=JSON.parse(M.E(`JSON.stringify(GF_REPORT_MODEL.next)`));
  c('the report’s "what happens next" says nothing about email', own.some(t=>EMAILY.test(t)), false);
  // Added in the v10.38.0 review (P6): when sending fails, the fallback said
  // "text or email that code to your pastor".
  { const MF=page(link,{failSubmit:true});
    await until(()=>MF.D.getElementById('gfstart')&&MF.E('GF_SERVER&&GF_SERVER.ok'));
    MF.D.querySelector('.gfchip[data-age="adult"]').click(); await sleep(40);
    MF.D.getElementById('gfname').value='Rosa Diaz'; MF.D.getElementById('gfstart').click();
    MF.E(`GIFTS.forEach(g=>{for(let k=0;k<5;k++) GFS.a[g.id+'.'+k]=3;}); GF_HEART.forEach(q=>GFS.h[q.k]=1); GFS.i=GF_TOTAL; GFS.done=true; gfSave(); gfRender();`);
    await until(()=>MF.D.getElementById('gfsend'));
    MF.D.getElementById('gfsend').click();
    await until(()=>/Nothing is lost/.test(MF.D.getElementById('gfsendnote').textContent));
    const t=MF.D.getElementById('gfsendnote').textContent;
    c('sending failed: "send that code to your pastor in a message", no email', [/send that code to your pastor in a message\./.test(t),EMAILY.test(t)], [true,false]);
    MF.E('GF_EMAIL_ENABLED=true'); MF.D.getElementById('gfsend').click();
    await until(()=>/text or email that code/.test(MF.D.getElementById('gfsendnote').textContent));
    c('(with email on it says "text or email", as before)', /text or email that code to your pastor/.test(MF.D.getElementById('gfsendnote').textContent), true); }

  console.log('\n-- the pastor’s results --');
  const statNote=E=>E(`(()=>{ const a={}; GIFTS.forEach(g=>{for(let k=0;k<5;k++) a[g.id+'.'+k]=g.id==='teach'?4:2;});
    const mk=(n,minor)=>{ const S=gfScores(a); return {id:n,name:n,n,gifts:S,S,P:gfProfile(S),heart:{},minor,flags:gfFlags(a),source:'survey'}; };
    const keep=gfEveryone; gfEveryone=()=>[mk('Young One',true),mk('Grown Up',false)];
    const d=document.createElement('div'); try{ gfRenderChurch(d); } finally{ gfEveryone=keep; }
    const x=d.querySelector('.gfr-statnote'); return x?x.textContent:''; })()`);
  const sn0=statNote(P.E);
  c('the under-18 note says how long, and nothing about email', [/from under-18s: kept for one year\./.test(sn0),EMAILY.test(sn0)], [true,false]);
  P.E('GF_EMAIL_ENABLED=true');
  c('(with email on it says "never emailed", as before)', /kept for one year and never emailed\./.test(statNote(P.E)), true);
  P.E('GF_EMAIL_ENABLED=false');
  // Added in the v10.38.0 review (P1): the pastor's copy of an under-18's
  // report, on screen and in the PDF, said "no email address was collected".
  { const jspdf=require('jspdf');
    for(const lang of ['en','es']){
      const vc=new VirtualConsole(); const errs=[]; vc.on('jsdomError',e=>errs.push(e.message)); allErrs.push(errs);
      const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
        beforeParse(w){ w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.fetch=()=>new Promise(()=>{}); w.jspdf=jspdf;
          if(lang==='es') w.localStorage.setItem('terrain-lang','es'); }});
      const E=x=>dom.window.eval(x);
      await until(()=>E('typeof gfReportModel==="function"'));
      const build=()=>JSON.parse(E(`(()=>{ const a={}; GIFTS.forEach(g=>{for(let k=0;k<5;k++) a[g.id+'.'+k]=g.id==='teach'?4:2;});
        const M=gfReportModel(gfScores(a),null,{own:false,name:'Sam Young',date:'2026-09-28',heart:{},minor:true,flags:gfFlags(a),ctx:null});
        const d=gfReportPDF(M,{compress:false}); const box=document.createElement('div'); box.innerHTML=gfReportHTML(M,false);
        return JSON.stringify({flags:M.pastor.flags,pdf:(d.__gfLog||[]).map(l=>l.t).join(' '),screen:box.textContent}); })()`));
      const off=build();
      c(`${lang}: the pastor’s copy of an under-18’s report: the parent line and one year, nothing about email`, off.flags[0],
        lang==='es'?'Menor de 18 años. Sam vio el aviso para padres o tutores y este resultado se guarda durante un año.':'Under 18. Sam saw the parent-or-guardian line, and this result is kept for one year.');
      c(`${lang}: nothing about email on the screen copy or in the PDF`, [EMAILY.test(off.screen),EMAILY.test(off.pdf),off.pdf.length>1000], [false,false,true]);
      E('GF_EMAIL_ENABLED=true');
      c(`${lang}: (with email on, "no email address was collected", as before)`, /no email address was collected|no se pidió ningún correo electrónico/.test(build().flags[0]), true);
    } }

  console.log('\n-- in Spanish --');
  const S=page('https://pastorshub.org/',{lang:'es'});
  await until(()=>S.E('typeof gfMemberLink==="function"'));
  S.E(`(()=>{ const ch=uChurch(); ch.name='Iglesia Central'; ch.share={church:'Iglesia Central',min:{}}; uPersist(); openTool('gifts'); GF_VIEW='setup'; gfRender(); })()`);
  S.D.getElementById('gflink2').click();
  await until(()=>S.D.getElementById('gflinkbox2').value&&/Los resultados le llegan/.test(S.D.getElementById('gflinknote2').textContent));
  const sn=S.D.getElementById('gflinknote2').textContent;
  c('the setup note in Spanish: PDF, no correo', [/Los miembros pueden descargar su informe en PDF\./.test(sn),/correo/i.test(sn)], [true,false]);
  const SM=page(S.D.getElementById('gflinkbox2').value,{lang:'es'});
  await until(()=>SM.D.getElementById('gfstart')&&SM.E('GF_SERVER&&GF_SERVER.ok'));
  SM.D.querySelector('.gfchip[data-age="adult"]').click();
  await sleep(60);
  c('no email field for a Spanish-speaking adult either', !!SM.D.getElementById('gfemail'), false);

  console.log('\n-- switched on (as a later release will), the email paths return --');
  const Q=page(link);
  Q.E('GF_EMAIL_ENABLED=true');
  await until(()=>Q.D.getElementById('gfstart')&&Q.E('GF_SERVER&&GF_SERVER.ok'));
  Q.D.querySelector('.gfchip[data-age="adult"]').click();
  await until(()=>Q.D.getElementById('gfemail'));
  c('with the switch on and a server that can send: the email field and consent', [!!Q.D.getElementById('gfemail'),!!Q.D.getElementById('gfemailok')], [true,true]);

  await sleep(50);
  c('no page errors', allErrs.flat(), []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
