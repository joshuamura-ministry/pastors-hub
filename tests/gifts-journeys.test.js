// Spiritual Gifts journeys after the v10.37 review, through the real
// netlify/functions/gifts.mjs against an in-memory store, with Resend stubbed:
//   - a member who sends again (new answers, or new details) replaces the same
//     record: the confirmations stay, and nothing is left on the server that
//     the phone can no longer delete (E2E-2, SEC-3);
//   - "Start again" asks who is taking it: the same person, or someone else on
//     this phone, who starts clean (SEC-4), with a safety net at Begin;
//   - an adult who ticked "Email me my report" is emailed on Send, and the Sent
//     box says so before "You can close this page" (E2E-3); since gifts-1.1
//     that email is the private link, and the PDF copy comes when the member
//     taps "Email me a PDF copy" on the opened link (never on open itself);
//   - confirmations appear while the page is open (E2E-10), and vanish when the
//     result is gone from the server (F8);
//   - the pastor's list drops results the member deleted or that passed their
//     keep date (SEC-2, E2E-1), says "updated" honestly (E2E-2), and a link can
//     be closed and everything from it deleted (SEC-5);
//   - after Generate, the setup keeps the server's copy of the church in step
//     (tests F4), and never prints the "My church" placeholder (E2E-12);
//   - member, observer and emailed-report pages never lead to the hub (E2E-5);
//   - a link's ~es opens in Spanish, and so do refusals (E2E-8, E2E-9, V14);
//   - the observer's note reaches the pastor, as the observer is promised (E2E-4);
//   - the under-18 first screen says who gets the answers once (V15).
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const FX=JSON.parse(fs.readFileSync(path.resolve(__dirname,'fixtures.json'),'utf8'));
const jspdf=require('jspdf');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=6000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(20); } return false; }

function makeStore(){
  const m=new Map();
  return { m,
    async get(k){ const v=m.get(k); return v===undefined?null:JSON.parse(v); },
    async setJSON(k,val,o={}){ if(o.onlyIfNew&&m.has(k)) return {modified:false}; m.set(k,JSON.stringify(val)); return {modified:true}; },
    async delete(k){ m.delete(k); },
    async list({prefix=''}={}){ return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}; },
    peek(k){ const v=m.get(k); return v?JSON.parse(v):null; },
    poke(k,v){ m.set(k,JSON.stringify(v)); } };
}

(async()=>{ try{
  delete process.env.TERRAIN_CODES; delete process.env.SITE_URL;
  process.env.RESEND_API_KEY='re_test'; process.env.GIFTS_FROM='Terrain <reports@example.org>';
  const store=makeStore(); globalThis.__terrainGiftsStore=store;
  const resend=[];
  globalThis.fetch=async(u,o={})=>{ if(/api\.resend\.com/.test(String(u))){ resend.push(JSON.parse(o.body)); return {ok:true,status:200,json:async()=>({id:'em'})}; }
    throw new Error('no network in tests'); };
  const handler=(await import(path.resolve(__dirname,'..','netlify','functions','gifts.mjs'))).default;
  const srv=async body=>{ const r=await handler(new Request('https://pastorshub.org/.netlify/functions/gifts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{}); return {status:r.status,j:JSON.parse(await r.text())}; };
  const calls=[]; const allErrs=[];
  function page(url,{lang,server=true,confirmAnswer=true}={}){
    const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message)); allErrs.push(errs);
    const copied=[];
    const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
        if(w.HTMLDialogElement) w.HTMLDialogElement.prototype.showModal=function(){ this.open=true; };
        if(lang) w.localStorage.setItem('terrain-lang',lang);
        w.jspdf=jspdf; w.confirm=()=>confirmAnswer;
        Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async t=>{ copied.push(t); }},configurable:true});
        w.fetch=async(u,o={})=>{
          if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})};
          if(/functions\/gifts/.test(u)){
            const body=o.body?JSON.parse(o.body):{};
            calls.push({...body,from:url});
            if(!server) return {ok:false,status:404,json:async()=>{ throw new Error('html'); }};
            const res=await handler(new Request('https://pastorshub.org'+u,{method:o.method||'GET',headers:o.headers,body:o.body}),{});
            const t=await res.text();
            return {ok:res.ok,status:res.status,json:async()=>JSON.parse(t)};
          }
          return new Promise(()=>{});
        };
      }});
    // v10.38.0: the app sends no email for now (GF_EMAIL_ENABLED=false, see
    // tests/email-off.test.js). These journeys keep the email paths covered by
    // switching it on, exactly as a later release will.
    dom.window.eval('GF_EMAIL_ENABLED=true');
    return {w:dom.window,D:dom.window.document,E:s=>dom.window.eval(s),copied};
  }
  const recs=pub=>[...store.m.keys()].filter(k=>k.startsWith('r/'+pub+'/')).map(k=>store.peek(k));
  const decodeIn=(P,code)=>JSON.parse(P.E(`JSON.stringify(gfDecode(${JSON.stringify(code)}))`));
  const giftbody=P=>P.D.getElementById('giftbody').textContent;

  // ======================================================= the pastor makes a link
  console.log('-- the pastor --');
  const P=page('https://pastorshub.org/');
  await until(()=>P.E('typeof gfMemberLink==="function"'));
  P.E(`(()=>{ const ch=uChurch(); ch.name='Bucks County SDA'; ch.share={church:'Bucks County SDA',min:{'Small groups':'r'}}; uPersist(); openTool('gifts'); GF_VIEW='setup'; gfRender(); })()`);
  P.D.getElementById('gflink2').click();
  await until(()=>P.D.getElementById('gflinkbox2').value);
  const link=P.D.getElementById('gflinkbox2').value, pub=P.E('uChurch().share.pub'), key=P.E('uChurch().share.key');
  c('a short link for the church', /#gifts=[A-Za-z0-9_-]{12}$/.test(link), true);
  // The pastor is told whether members will be offered "Email me my report".
  c('with the mail service set up, the note says adults can have their report emailed', /Adult members can also have their report emailed to them\./.test(P.D.getElementById('gflinknote2').textContent), true);
  { const keepKey=process.env.RESEND_API_KEY; delete process.env.RESEND_API_KEY;
    const Q=page('https://pastorshub.org/');
    await until(()=>Q.E('typeof gfMemberLink==="function"'));
    Q.E(`(()=>{ const ch=uChurch(); ch.name='Fairview Village SDA'; ch.share={church:'Fairview Village SDA',min:{}}; uPersist(); openTool('gifts'); GF_VIEW='setup'; gfRender(); })()`);
    Q.D.getElementById('gflink2').click();
    await until(()=>Q.D.getElementById('gflinkbox2').value&&/Results come straight back/.test(Q.D.getElementById('gflinknote2').textContent));
    const qn=Q.D.getElementById('gflinknote2').textContent;
    process.env.RESEND_API_KEY=keepKey;
    c('without it, the note says emailed reports are not switched on (not a silent gap)', [/not switched on for this site yet, so members download their PDF instead\./.test(qn),/emailed to them/.test(qn)], [true,false]);
  }

  // take it: intro, answers, the result page
  async function takeIt(M,{name,adult=true,email,answers='(id,k)=>id==="teach"?4:2'}){
    const D=M.D;
    await until(()=>D.getElementById('gfstart')&&M.E('GF_SERVER&&GF_SERVER.ok'));
    D.querySelector(`.gfchip[data-age="${adult?'adult':'minor'}"]`).click();
    if(email){ await until(()=>D.getElementById('gfemail')); D.getElementById('gfemail').value=email; D.getElementById('gfemailok').checked=true; }
    D.getElementById('gfname').value=name;
    D.getElementById('gfstart').click();
    M.E(`GIFTS.forEach(g=>{for(let k=0;k<5;k++) GFS.a[g.id+'.'+k]=(${answers})(g.id,k);}); GF_HEART.forEach(q=>GFS.h[q.k]=1); GFS.i=GF_TOTAL; GFS.done=true; gfSave(); gfRender();`);
    await until(()=>D.getElementById('gfsend'));
  }
  const send=async M=>{ M.D.getElementById('gfsend').click(); await until(()=>M.E('GFS.sent===true')); };

  // ======================================================= E2E-3: the email goes on Send
  console.log('-- an adult who asked for the email gets it on Send (E2E-3) --');
  const A=page(link);
  await takeIt(A,{name:'Maria Lopez',email:'maria@example.org'});
  // Updated for gifts-1.1: the email on Send is the private link. Updated again
  // (one tap): the PDF copy is emailed only when the member taps for it on the
  // opened link, never on open (mail scanners open links in a real browser).
  c('before sending, the page says a link will be emailed', /Once you send it, we will email you a link to your report; open it and you can have a PDF copy emailed as well\./.test(A.D.getElementById('gfsendnote').textContent), true);
  const r0=resend.length;
  // (hold the email call a moment so the waiting state can be seen)
  A.E(`window.__gc=gfCall; gfCall=(op,b,w)=>op==='email'?new Promise(r=>setTimeout(r,400)).then(()=>window.__gc(op,b,w)):window.__gc(op,b,w);`);
  await send(A);
  c('while it is being emailed, "You can close this page" waits', [A.D.getElementById('gfsentclose').hidden,/Emailing a link to your report to m•••@example\.org|Emailing you a link/.test(A.D.getElementById('gfsentemailnote').textContent)], [true,true]);
  await until(()=>resend.length>r0&&/Check your inbox/.test((A.D.getElementById('gfsentemailnote')||{}).textContent||''),10000);
  c('Resend is called once, to the member, with the link and nothing attached, and the Sent box says so', [resend.length-r0,resend.at(-1).to,'attachments' in resend.at(-1),/#gifts-report=[A-Za-z0-9_.-]+/.test(resend.at(-1).text),A.D.getElementById('gfsentemailnote').textContent],
    [1,['maria@example.org'],false,true,'Check your inbox: we sent a link to m•••@example.org. Open it on this phone or any device to see your report; from there you can have a PDF copy emailed to you.']);
  c('then "You can close this page"', A.D.getElementById('gfsentclose').hidden, false);
  A.E(`gfCall=window.__gc;`);
  // She opens the link on another device: her address is confirmed, and the
  // PDF copy comes when she taps "Email me a PDF copy".
  { const url=/https:\/\/pastorshub\.org\/#gifts-report=\S+/.exec(resend.at(-1).text)[0];
    const O=page(url);
    await until(()=>O.D.getElementById('gfmailpdf'),10000); await sleep(300);
    c('opening the emailed link confirms the address and sends nothing', [resend.length-r0,recs(pub).find(x=>x.name==='Maria Lopez').emailVerified,O.D.getElementById('gfmailpdf').textContent], [1,true,'Email me a PDF copy']);
    O.D.getElementById('gfmailpdf').click();
    await until(()=>O.D.getElementById('gfmailnote')&&O.D.getElementById('gfmailnote').dataset.state==='sent',10000);
    c('one tap sends the PDF copy, once', [resend.length-r0,!!(resend.at(-1).attachments&&resend.at(-1).attachments.length),resend.at(-1).to], [2,true,['maria@example.org']]); }
  c('and an "Email me my report" button in the Sent box itself', !!A.D.getElementById('gfsentemail'), true);
  A.E('gfRender()'); await sleep(300);
  c('reopening the page does not email again', resend.length-r0, 2);
  const rid1=A.E('GFS.rid');

  // ======================================================= E2E-10: confirmations while open
  console.log('-- confirmations show while the page is open (E2E-10) --');
  A.D.getElementById('gfaskmake').click();
  await until(()=>A.D.querySelectorAll('.gfaskrow input').length===1);
  const itok=A.D.querySelector('.gfaskrow input').value.split('.').pop();
  let r=await srv({op:'confirm',pub,rid:rid1,itok,name:'John Carter',ratings:{teach:4},note:'She teaches with real <b>patience</b>.'});
  c('an observer confirms', r.status, 200);
  A.D.getElementById('gfaskmake').click();
  await until(()=>/1 person has answered so far/.test((A.D.getElementById('gfaskbox')||{}).textContent||''),5000);
  c('"Make another link" also looks again: 1 person has answered', /1 person has answered so far/.test(A.D.getElementById('gfaskbox').textContent), true);
  c('and the report now says Confirmed by 1 (J.)', /Confirmed by 1 person who knows you \(J\.\)/.test(giftbody(A)), true);

  // ======================================================= E2E-2: new details, sent again
  console.log('-- sending again replaces the same record (E2E-2) --');
  const form=A.D.getElementById('u-member-resource-result');
  form.querySelector('button[type="submit"]').click();
  await until(()=>A.D.getElementById('gfsend'));
  c('after "Save details", the Send box says sending replaces the earlier result', /sending replaces it/.test(A.D.getElementById('gfsendnote').textContent), true);
  c('…with a way to delete the earlier one instead', !!A.D.getElementById('gfdelearlier'), true);
  const nUpd=calls.filter(x=>x.op==='update').length;
  await send(A);
  const mine=recs(pub).filter(x=>x.name==='Maria Lopez');
  c('one record, the same rid, the confirmation kept', [mine.length,A.E('GFS.rid'),mine[0].observers.length,calls.filter(x=>x.op==='update').length-nUpd], [1,rid1,1,1]);
  await sleep(300);
  c('the same answers are not emailed twice', resend.length-r0, 2);

  // ======================================================= SEC-3: me again
  console.log('-- Start again, me again (SEC-3) --');
  A.D.getElementById('gfredo').click();
  c('Start again asks who is taking it now', [!!A.D.getElementById('gfredome'),!!A.D.getElementById('gfredoother'),/stays with your pastor until you send the new one/.test(A.D.getElementById('gfactnote').textContent)], [true,true,true]);
  A.D.getElementById('gfredome').click();
  await until(()=>A.D.getElementById('gfstart'));
  c('me again: the server record is kept, the name is there, email consent asked again', [A.E('GFS.rid'),A.D.getElementById('gfname').value,A.E('GFS.emailOk')], [rid1,'Maria Lopez',false]);
  A.D.getElementById('gfstart').click();
  A.E(`GIFTS.forEach(g=>{for(let k=0;k<5;k++) GFS.a[g.id+'.'+k]=g.id==='shep'?4:1;}); GFS.i=GF_TOTAL; GFS.done=true; gfSave(); gfRender();`);
  await until(()=>A.D.getElementById('gfsend'));
  await send(A);
  const again=recs(pub).filter(x=>x.name==='Maria Lopez');
  c('the new answers replace the old ones in the same record', [again.length,A.E('GFS.rid'),decodeIn(A,again[0].code).a['shep.0']], [1,rid1,4]);
  c('the confirmation is still on it', again[0].observers.length, 1);
  await until(()=>A.D.getElementById('gfdelmine'));
  A.D.getElementById('gfdelmine').click(); A.D.getElementById('gfdelmine').click();
  await until(()=>recs(pub).filter(x=>x.name==='Maria Lopez').length===0);
  c('"Delete my result from the server" leaves nothing of Maria there', recs(pub).filter(x=>x.name==='Maria Lopez').length, 0);
  await until(()=>!/Confirmed by/.test(giftbody(A)));
  c('and the report no longer claims the confirmation', /Confirmed by/.test(giftbody(A)), false);
  c('the member is told the pastor\'s copy goes at the next update', /pastor’s copy is removed the next time/.test(giftbody(A)), true);

  // ======================================================= SEC-4: a shared phone
  console.log('-- a shared phone (SEC-4) --');
  const S=page(link);
  await takeIt(S,{name:'Alice Adams',email:'alice@example.org'});
  await send(S);
  const aliceMid=S.E('GFS.memberId');
  await until(()=>!S.E('GF_EMAIL_BUSY'),10000);
  S.D.getElementById('gfredo').click(); S.D.getElementById('gfredoother').click();
  await until(()=>S.D.getElementById('gfstart'));
  c('someone else: a blank first screen, the age asked again, no ticked consent', [S.D.getElementById('gfname').value,S.E('GFS.email||""'),S.E('GFS.minor===undefined'),S.D.querySelectorAll('.gfchip.on[data-age]').length], ['','',true,0]);
  c('a new member id, and none of Alice\'s server keys', [S.E('GFS.memberId')!==aliceMid,S.E('!GFS.rid&&!GFS.token&&!GFS.pub')], [true,true]);
  await takeIt(S,{name:'Bob Brown'});
  await send(S);
  const two=recs(pub).filter(x=>/Alice|Bob/.test(x.name));
  const mids=two.map(x=>decodeIn(S,x.code).memberId);
  c('both results are on the server, each under its own member id', [two.length,new Set(mids).size], [2,2]);
  c('Alice\'s address is on hers only', two.map(x=>[x.name,x.email]).sort(), [['Alice Adams','alice@example.org'],['Bob Brown',null]]);
  // the safety net: a different first name on a phone that sent a result
  S.D.getElementById('gfredo').click(); S.D.getElementById('gfredome').click();
  await until(()=>S.D.getElementById('gfstart'));
  const bobRid=S.E('GFS.rid');
  S.D.querySelector('.gfchip[data-age="adult"]').click();
  S.D.getElementById('gfname').value='Carol Chen'; S.D.getElementById('gfstart').click();
  c('Begin with a different first name asks, and starts fresh for Carol', [S.E('GFS.name'),S.E('!GFS.rid'),/Starting fresh for Carol Chen/.test(S.D.getElementById('gfintroerr').textContent)], ['Carol Chen',true,true]);
  c('Bob\'s result is untouched', !!store.peek('r/'+pub+'/'+bobRid), true);

  // ======================================================= F8: gone from the server
  console.log('-- a result gone from the server takes its confirmations with it (F8) --');
  const B=page(link);
  await takeIt(B,{name:'Ben Carter'});
  await send(B);
  const bi=await srv({op:'invite',pub,rid:B.E('GFS.rid'),token:B.E('GFS.token'),gifts:['teach']});
  await srv({op:'confirm',pub,rid:B.E('GFS.rid'),itok:bi.j.itok,name:'Pat Leader',ratings:{teach:4}});
  B.E('gfLookAgain()');
  await until(()=>B.E('GFS.obsCount')===1);
  c('Ben\'s page shows the confirmation', /Confirmed by 1/.test(giftbody(B)), true);
  await srv({op:'delete',pub,rid:B.E('GFS.rid'),key});
  B.E('gfLookAgain()');
  await until(()=>!B.E('GFS.rid'));
  c('the pastor deleted it: rid, token and the confirmations all go', [B.E('GFS.observers===undefined&&GFS.obsCount===undefined&&GFS.obsInitials===undefined'),B.E('GFS.sent')], [true,false]);
  await until(()=>!/Confirmed by/.test(giftbody(B)));
  c('and the report stops saying "Confirmed by"', /Confirmed by/.test(giftbody(B)), false);

  // ======================================================= SEC-2 / E2E-1: the pastor's list follows the server
  console.log('-- the pastor\'s list follows the server (SEC-2, E2E-1) --');
  P.E(`GF_VIEW='roster'; gfRender();`);
  P.D.getElementById('gfpull').click();
  await until(()=>P.D.querySelectorAll('.gfrosterrow').length===2);
  const rows=()=>[...P.D.querySelectorAll('.gfrosterrow b')].map(b=>b.textContent).sort();
  c('Alice and Bob arrive', rows(), ['Alice Adams','Bob Brown']);
  c('each row keeps its keep date on this device', P.E(`uRead(GF_ROSTER,[]).every(r=>typeof r.expires==='number')`), true);
  // a pasted code, and a review the pastor wrote on Bob
  const pasted=P.E(`(()=>{ GF_CTX={church:'Bucks County SDA',churchId:uChurch().id,fac:[],min:{}}; GFS={name:'Pasted Paul',a:{'teach.0':3},h:{},memberId:'pp1',i:GF_TOTAL,done:true}; const c=gfEncode(); GF_CTX=null; gfRosterAdd(c); return c; })()`);
  const bobMid=decodeIn(P,store.peek('r/'+pub+'/'+bobRid).code).memberId;
  P.E(`(()=>{ const ch=uChurch(); ch.memberReviews={...(ch.memberReviews||{}),[${JSON.stringify(bobMid)}]:{confirmed:true,willing:true,hours:4}}; uPersist(); })()`);
  // Bob deletes his own result from his phone
  await srv({op:'delete',pub,rid:bobRid,key});   // as if Bob deleted it (his phone has moved on to Carol)
  P.E(`GF_VIEW='roster'; gfRender();`);
  P.D.getElementById('gfpull').click();
  await until(()=>/removed/.test(P.D.getElementById('gflinknote').textContent));
  c('a result the member deleted leaves the list, and says so', [rows().includes('Bob Brown'),/1 removed: deleted by the member or past their keep date/.test(P.D.getElementById('gflinknote').textContent)], [false,true]);
  c('its roster entry and the pastor\'s review of Bob are gone from this device', [P.E(`uRead(GF_ROSTER,[]).some(r=>r.name==='Bob Brown')`),P.E(`!!(uChurch().memberReviews||{})[${JSON.stringify(bobMid)}]`)], [false,false]);
  c('a pasted code (no rid) is left alone', P.E(`gfRoster().some(r=>r.code===${JSON.stringify(pasted)})`), true);
  // past its keep date on the server
  { const k='r/'+pub+'/'+recs(pub).find(x=>x.name==='Alice Adams').rid, rec=store.peek(k); rec.expires=Date.now()-1000; store.poke(k,rec); }
  P.D.getElementById('gfpull').click();
  await until(()=>!rows().includes('Alice Adams'));
  c('a result past its keep date on the server leaves the list', rows().includes('Alice Adams'), false);
  // past its keep date on this device, with no connection at all
  P.E(`(()=>{ GF_CTX={church:'Bucks County SDA',churchId:uChurch().id,fac:[],min:{}}; GFS={name:'Old Olga',a:{'teach.0':2},h:{},memberId:'oo1',i:GF_TOTAL,done:true}; const c=gfEncode(); GF_CTX=null;
    gfRosterAdd(c,{rid:'OOOOOOOOOOOO',pub:${JSON.stringify(pub)},expires:Date.now()-5}); })()`);
  c('an expired entry is not listed, nor counted across the church', [P.E(`gfRoster().some(r=>r.name==='Old Olga')`),P.E(`uPeople().some(p=>p.name==='Old Olga')`)], [false,false]);
  P.E(`GF_VIEW='roster'; gfRender();`);
  c('opening the list drops it from the device for good', P.E(`uRead(GF_ROSTER,[]).some(r=>r.name==='Old Olga')`), false);
  // A server that suddenly lists nothing for a link this device has three or more results from: nothing removed.
  { const held=P.E(`(async()=>{ const ch=uChurch(), keep=uRead(GF_ROSTER,[]);
      ['h1','h2','h3'].forEach((m,i)=>{ GF_CTX={church:'Bucks County SDA',churchId:ch.id,fac:[],min:{}}; GFS={name:'Held '+i,a:{'teach.0':2},h:{},memberId:m,i:GF_TOTAL,done:true}; const c=gfEncode(); GF_CTX=null;
        gfRosterAdd(c,{rid:'HHHHHHHHHHH'+i,pub:'ZZZZZZZZZZZZ',expires:Date.now()+1e9}); });
      const sh=ch.share; sh.old=[...(sh.old||[]),{pub:'ZZZZZZZZZZZZ',key:'Y'.repeat(32),closed:1}]; uPersist();
      const pull=gfPull; gfPull=async(pub,key)=>{ if(pub==='ZZZZZZZZZZZZ'){ const x=[]; x.complete=true; return x; } return pull(pub,key); };
      const x=await gfSync(); gfPull=pull;
      const left=uRead(GF_ROSTER,[]).filter(r=>r.pub==='ZZZZZZZZZZZZ').length;
      uRead(GF_ROSTER,[]).filter(r=>r.pub==='ZZZZZZZZZZZZ').forEach(gfRosterDrop); sh.old=sh.old.filter(o=>o.pub!=='ZZZZZZZZZZZZ'); uPersist();
      return JSON.stringify({held:x.held,left,text:gfSyncText(x)}); })()`);
    const hv=JSON.parse(await held);
    c('an empty list from the server never empties this device (3 kept, and the pastor is told)', [hv.held,hv.left,/lists no results for this link, although 3 are on this device/.test(hv.text)], [3,3,true]); }
  c('the pull note: "N updated." unless confirmations went up', [P.E(`gfSyncText({added:0,updated:1,confirmed:0,removed:0})`),P.E(`gfSyncText({added:0,updated:0,confirmed:1,removed:0})`)], ['1 updated.','1 updated with new confirmations.']);

  // ======================================================= SEC-5: close a link, delete what came through it
  console.log('-- close a link and make a new one; delete everything from it (SEC-5) --');
  const J=page(link); await takeIt(J,{name:'Junk One'}); await send(J);
  const J2=page(link); await takeIt(J2,{name:'Junk Two'}); await send(J2);
  P.E(`GF_VIEW='roster'; gfRender();`); P.D.getElementById('gfpull').click();
  await until(()=>rows().includes('Junk One')&&rows().includes('Junk Two'));
  P.E(`GF_VIEW='setup'; gfRender();`);
  c('the setup offers to close the link', !!P.D.getElementById('gfcloselink'), true);
  P.D.getElementById('gfcloselink').click(); P.D.getElementById('gfcloselink').click();
  await until(()=>P.E('uChurch().share.pub')&&P.E('uChurch().share.pub')!==pub&&P.D.getElementById('gflinkbox2').value);
  const pub2=P.E('uChurch().share.pub'), link2=P.D.getElementById('gflinkbox2').value;
  c('closed on the server, and a new link made straight away', [store.peek('c/'+pub).closed,P.D.getElementById('gflinkbox2').value.endsWith('#gifts='+pub2),P.E('uChurch().share.old.map(x=>x.pub)')], [true,true,[pub]]);
  r=await srv({op:'submit',pub,code:J.E('gfEncode()'),name:'Late'});
  c('the old link takes nothing new', [r.status,r.j.error], [410,'closed']);
  c('a member on it is told plainly', J.E(`gfErrText({code:'closed'})`), 'The church has closed this link. Ask your pastor for the new one; your answers are still on this phone.');
  P.E(`GF_VIEW='roster'; gfRender();`);
  c('what came through the old link is still listed, with a way to delete it all', [rows().includes('Junk One'),!!P.D.querySelector('.gfpurge')], [true,true]);
  { const i2=[...P.D.querySelectorAll('.gfrosterrow')].findIndex(x=>/Junk Two/.test(x.textContent)); const d2=P.D.querySelectorAll('.gfrosterrow .gfdel')[i2];
    d2.click(); d2.click();
    await until(()=>!rows().includes('Junk Two'));
    c('one result from the closed link can still be deleted on its own row', [rows().includes('Junk Two'),recs(pub).some(x=>x.name==='Junk Two')], [false,false]); }
  P.D.querySelector('.gfpurge').click(); P.D.querySelector('.gfpurge').click();
  await until(()=>!rows().includes('Junk One'));
  c('deleted on the server and here, and the closed link forgotten', [recs(pub).length,rows().includes('Junk One'),P.E('(uChurch().share.old||[]).length')], [0,false,0]);

  // ======================================================= tests-F4: the server's copy follows the setup
  console.log('-- after Generate, the server\'s copy of the church follows the setup (tests F4) --');
  P.E(`GF_VIEW='setup'; gfRender();`);
  P.D.getElementById('gflink2').click();
  await until(()=>!P.D.getElementById('gfready').hidden&&P.D.getElementById('gflinkbox2').value);
  await sleep(900);
  const nCtx=calls.filter(x=>x.op==='setctx').length;
  const pr=[...P.D.querySelectorAll('.gfmin')].find(b=>/Prayer ministry/.test(b.textContent));
  pr.click();
  await until(()=>calls.filter(x=>x.op==='setctx').length>nCtx,3000);
  c('a ministry marked after Generate reaches the server (one setctx, after a pause)', [calls.filter(x=>x.op==='setctx').length-nCtx,store.peek('c/'+pub2).ctx.min['Prayer ministry']], [1,'r']);
  const ch=P.D.getElementById('gfchurch'); ch.value='Bucks County SDA Church'; ch.dispatchEvent(new P.w.Event('input'));
  await until(()=>store.peek('c/'+pub2).ctx.church==='Bucks County SDA Church',3000);
  // v10.42 part 3 (the pastor, SPEC-FOCUS E: "ready announcement text EN + ES for the bulletin, text message, WhatsApp and the pulpit"; the approved spec: "about 15 minutes", the design X17): the WhatsApp announcement
  c('a new church name reaches the server, and the ready message follows it', [store.peek('c/'+pub2).ctx.church,/Every member of Bucks County SDA Church is invited/.test(P.D.getElementById('gfmsg').value)], ['Bucks County SDA Church',true]);
  P.D.getElementById('gfmsg').value='My own words'; P.D.getElementById('gfmsg').dispatchEvent(new P.w.Event('input'));
  ch.value='Bucks County SDA'; ch.dispatchEvent(new P.w.Event('input'));
  c('a message the pastor rewrote is left alone', P.D.getElementById('gfmsg').value, 'My own words');
  const nBefore=calls.filter(x=>x.op==='setctx').length;
  ch.value=''; ch.dispatchEvent(new P.w.Event('input')); await sleep(1100);
  c('an empty church name is never sent', calls.filter(x=>x.op==='setctx').length-nBefore>0&&calls.filter(x=>x.op==='setctx').at(-1).ctx.church==='', false);
  ch.value='Bucks County SDA'; ch.dispatchEvent(new P.w.Event('input'));
  // a long link carries the church in itself: an edit makes it stale
  const N=page('https://pastorshub.org/',{server:false});
  await until(()=>N.E('typeof gfMemberLink==="function"'));
  N.E(`(()=>{ const ch=uChurch(); ch.name='Offline SDA'; ch.share={church:'Offline SDA',min:{}}; uPersist(); openTool('gifts'); GF_VIEW='setup'; gfRender(); })()`);
  N.D.getElementById('gflink2').click();
  await until(()=>!N.D.getElementById('gfready').hidden);
  [...N.D.querySelectorAll('.gfmin')][0].click();
  c('a long link goes away on an edit, with "press Generate again"', [N.D.getElementById('gfready').hidden,N.D.getElementById('gflinkbox2').hidden,/press Generate again/.test(N.D.getElementById('gflinknote2').textContent)], [true,true,true]);
  c('the link box is one row until it is measured (V5)', N.E(`(()=>{ const t=document.createElement('textarea'); t.rows=3; document.body.appendChild(t); gfFitBox(t,132); const r=t.rows; t.remove(); return r; })()`), 1);

  // ======================================================= E2E-12: the placeholder name
  console.log('-- the "My church" placeholder is never printed (E2E-12) --');
  N.E(`(()=>{ const ch=uChurch(); ch.name='My church'; ch.share={church:'My church',min:{}}; uPersist(); GF_VIEW='setup'; gfRender(); })()`);
  c('the survey card says "this church"', [/My church/.test(N.D.getElementById('gfsurveycard').textContent),/for this church first/.test(N.D.getElementById('gfsurveycard').textContent)], [false,true]);
  const nc=N.D.getElementById('gfchurch'); nc.value='Fairview Village SDA'; nc.dispatchEvent(new N.w.Event('input'));
  c('and follows the name typed above it, with its button still working', [/for Fairview Village SDA first/.test(N.D.getElementById('gfsurveycard').textContent),typeof N.D.getElementById('gfsurveygo').onclick], [true,'function']);

  // ======================================================= E2E-5: no way out to the hub
  console.log('-- member, observer and report pages never lead to the hub (E2E-5) --');
  const X=page(link);   // the member link again, a fresh phone
  await until(()=>X.D.getElementById('gfstart'));
  const Rt=await srv({op:'submit',pub:pub2,code:X.E('gfEncode()'),name:'Rita Report',lang:'es'});
  const Ri=await srv({op:'invite',pub:pub2,rid:Rt.j.rid,token:Rt.j.token,gifts:['teach']});
  for(const [what,u] of [['#gifts=',link],['#gifts-confirm=',`https://pastorshub.org/#gifts-confirm=${pub2}.${Rt.j.rid}.${Ri.j.itok}`],['#gifts-report=',`https://pastorshub.org/#gifts-report=${pub2}.${Rt.j.rid}.${Rt.j.token}`]]){
    const G=page(u,{lang:'en'});
    await until(()=>G.E('ACCESS_CHECKED')&&G.D.getElementById('giftbody').textContent.length>40);
    const bl=G.D.getElementById('brandlink');
    const nv=bl.closest('nav')||bl, hid=!!nv.hidden&&G.w.getComputedStyle(nv).display==='none';   // hidden on screen, not just flagged
    bl.click(); G.E('showHub(); openTool("survey");');
    c(`${what}: "Pastors Hub" is hidden, and the hub and survey stay shut`, [hid,G.D.getElementById('hub').hidden,G.D.getElementById('gifts').hidden], [true,true,false]);
  }

  // ======================================================= E2E-8, E2E-9, V14: the link's language
  console.log('-- a link\'s language (E2E-8, E2E-9, V14) --');
  const Es=page(link2+'~es');
  await until(()=>Es.D.getElementById('gfstart'));
  c('#gifts=PUB~es opens in Spanish on a phone with no choice made', /Descubra sus dones espirituales/.test(giftbody(Es)), true);
  const En=page(link2+'~es',{lang:'en'});
  await until(()=>En.D.getElementById('gfstart'));
  c('a language the phone already chose wins', /Discover Your Spiritual Gifts/.test(giftbody(En)), true);
  c('the parser keeps the campaign and reads the language', [Es.E('GIFTS_LINK.pub'),Es.E('GIFTS_LINK.lang'),Es.E('uGiftSessionKey()')], [pub2,'es','terrain-gifts:p:'+pub2]);
  // the observer link from a Spanish member, answered, then opened again on a fresh phone
  const Sp=page(link2,{lang:'es'});
  await takeIt(Sp,{name:'Ana Ruiz'});
  await send(Sp);
  Sp.D.getElementById('gfaskmake').click();
  await until(()=>Sp.D.querySelectorAll('.gfaskrow input').length===1);
  const ourl=Sp.D.querySelector('.gfaskrow input').value;
  c('a Spanish member\'s observer link ends ~es', /~es$/.test(ourl), true);
  const oparts=ourl.split('#gifts-confirm=')[1].replace(/~es$/,'').split('.');
  await srv({op:'confirm',pub:oparts[0],rid:oparts[1],itok:oparts[2],name:'Obs',ratings:{teach:3}});
  const O2=page('https://pastorshub.org/#gifts-confirm='+ourl.split('#gifts-confirm=')[1]);
  await until(()=>/Esta invitación ya fue respondida/.test(giftbody(O2)));
  c('opened again after use: answered in Spanish', /Esta invitación ya fue respondida/.test(giftbody(O2)), true);
  const O3=page('https://pastorshub.org/#gifts-confirm='+oparts.join('.'));
  await until(()=>/respondida|answered/.test(giftbody(O3)));
  c('even without ~es, the server\'s refusal carries the member\'s language', /Esta invitación ya fue respondida/.test(giftbody(O3)), true);
  await srv({op:'delete',pub:pub2,rid:Rt.j.rid,token:Rt.j.token});
  const Rd=page(`https://pastorshub.org/#gifts-report=${pub2}.${Rt.j.rid}.${Rt.j.token}~es`);
  await until(()=>/informe|report/i.test(giftbody(Rd))&&!/Abriendo|Opening/.test(giftbody(Rd)));
  c('a Spanish report link after deletion is answered in Spanish', /No se puede abrir este informe/.test(giftbody(Rd)), true);

  // ======================================================= E2E-4: the observer's note
  console.log('-- the observer\'s note reaches the pastor (E2E-4) --');
  const OB=page(`https://pastorshub.org/#gifts-confirm=${pub2}.${Sp.E('GFS.rid')}.${(await srv({op:'invite',pub:pub2,rid:Sp.E('GFS.rid'),token:Sp.E('GFS.token'),gifts:['teach']})).j.itok}`,{lang:'en'});
  await until(()=>OB.D.getElementById('gfobsend'));
  c('the observer is promised only what happens', /Your ratings count toward Ana’s report, where you appear only by your first initial\. Your full name and your note go to their pastor\./.test(giftbody(OB)), true);
  OB.D.querySelectorAll('.gfobq').forEach(q=>q.querySelector('[data-v="4"]').click());
  OB.D.getElementById('gfobname').value='John Carter';
  OB.D.getElementById('gfobnote').value='She teaches with real <b>patience</b>.';
  OB.D.getElementById('gfobsend').click();
  await until(()=>/Thank you/.test(giftbody(OB)));
  P.E(`GF_VIEW='roster'; gfRender();`); P.D.getElementById('gfpull').click();
  await until(()=>rows().includes('Ana Ruiz'));
  const idx=[...P.D.querySelectorAll('.gfrosterrow')].findIndex(x=>/Ana Ruiz/.test(x.textContent));
  P.D.querySelectorAll('.gfrosterrow .gfopen')[idx].click();
  const note=[...P.D.querySelectorAll('.gfr-onote')];
  c('the pastor reads the observer\'s name and note, as text (markup stays text)', [note.some(n=>n.textContent==='— John Carter: “She teaches with real <b>patience</b>.”'),note.some(n=>n.querySelector('b'))], [true,false]);
  c('the member\'s own report shows only the initial', /John|Carter|patience/.test(giftbody(Sp)), false);

  // ======================================================= V15: the under-18 first screen
  console.log('-- the under-18 first screen says it once (V15) --');
  const Y=page(link2);
  await until(()=>Y.D.getElementById('gfstart')&&Y.E('GF_SERVER&&GF_SERVER.ok'));
  Y.D.querySelector('.gfchip[data-age="minor"]').click();
  const cons=Y.D.getElementById('gfconsent').textContent, mn=Y.D.getElementById('gfminornote').textContent;
  c('the parent line says who gets the answers and for how long', [/person who sent you this link/.test(mn),/kept for one year/.test(mn)], [true,true]);
  c('the consent line under it does not say it again', [/person who sent you this link/.test(cons),/kept for/.test(cons),/not shared with anyone else/.test(cons)], [false,false,true]);
  Y.D.querySelector('.gfchip[data-age="adult"]').click();
  c('an adult sees the full consent line again', /person who sent you this link/.test(Y.D.getElementById('gfconsent').textContent), true);

  c('no page errors anywhere', allErrs.flat(), []);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
