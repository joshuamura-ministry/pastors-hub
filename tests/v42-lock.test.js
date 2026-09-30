// v10.42.0 part 3 — phones locked while he presents, and his own handout on their phones.
// The pastor (SPEC-FOCUS A): "Maybe just have it where it's locked until the presentation is complete; then they can
// scroll whichever slide they want and download it as well — a really nice PDF." — "No 'members can swipe' choice any
// more: while a presentation is live every phone shows exactly the presenter's slide and nothing a member does moves
// it. The lock lifts when the presenter taps End… 'Share link & QR' (no presenter) stays free browsing." — "The download
// on phones is THE SAME FULL HANDOUT the presenter downloads… the presenter's device builds it and uploads it to the room
// when presenting starts and again whenever it changes… The deck-only PDF stays as a fallback. Never names." His answers
// (29 Sep 2026): Q2 "at the end, phones offer 'Download the handout (PDF)' (the full handout); for decision bodies
// (finance committee, church board, business meeting) ALSO 'Download the proposal to vote on (PDF)'"; Q5 "phones unlock
// after 30 minutes with no word from the presenter. Keep."
// End to end in jsdom with the real present.mjs (present-1.4, in-memory store) and a Firebase stand-in, as v42-phones.
// Checked: no way to choose (no radios), Present = follow, Share = free, a shared link presented is brought to follow;
// Exit while live asks (End / Leave it running, Escape = leave), not for the sample or a control device; the heartbeat;
// the release after 30 minutes of silence and the relock at his next move; his handout sent once per change (the same
// words are not sent again), the line in the Link sheet; phones download the server's bytes, fall back to their own copy,
// say "Updated"; the proposal to vote on for the bodies that vote, never for the whole church; a control device never
// sends; no member's name in anything sent. jsdom does no layout: Chrome checks the look.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const jspdf=require('jspdf');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,500));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=4000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(15); } return false; }
const saved=[];
jspdf.jsPDF.API.save=function(name){ saved.push({name,doc:this}); return this; };

function makeStore(){
  const m=new Map();
  return { m,
    async get(k){ const v=m.get(k); return v===undefined?null:JSON.parse(v); },
    async setJSON(k,val,o={}){ if(o.onlyIfNew&&m.has(k)) return {modified:false}; m.set(k,JSON.stringify(val)); return {modified:true}; },
    async delete(k){ m.delete(k); },
    async list({prefix=''}={}){ return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}; },
    keys(p=''){ return [...m.keys()].filter(k=>k.startsWith(p)); }, peek(k){ const v=m.get(k); return v?JSON.parse(v):null; },
    poke(k,v){ m.set(k,JSON.stringify(v)); } };
}
const FB='https://terrain-live-default-rtdb.firebaseio.com';
const RTDB={}; const STREAMS=new Set();
function relay(room,type,data){ for(const es of STREAMS) if(es.url===`${FB}/live/${room}.json`&&es.readyState===1) es.emit(type,{path:'/',data}); }

(async()=>{ try{
  delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.TERRAIN_REG_SECRET;
  process.env.PRESENT_FB_URL=FB; process.env.PRESENT_FB_SECRET='fb-test-secret';
  process.env.SITE_URL='https://pastorshub.org';
  const store=makeStore(); globalThis.__terrainPresentStore=store;
  globalThis.fetch=async(u,o={})=>{
    u=String(u); const m=/^https:\/\/terrain-live-default-rtdb\.firebaseio\.com\/(?:live\/([A-Za-z0-9_-]{22})|)\.json/.exec(u);
    if(!m) throw new Error('no network in tests: '+u);
    const room=m[1];
    if(!room) return {ok:true,status:200,json:async()=>({live:true})};
    const now=Date.now(), fix=v=>{ const o2={...v}; for(const k in o2) if(o2[k]&&o2[k]['.sv']==='timestamp') o2[k]=now; return o2; };
    if(o.method==='PATCH'){ const b=fix(JSON.parse(o.body)); RTDB[room]={...(RTDB[room]||{}),...b}; setTimeout(()=>relay(room,'patch',b),0); }
    else if(o.method==='DELETE'){ delete RTDB[room]; setTimeout(()=>relay(room,'put',null),0); }
    return {ok:true,status:200,json:async()=>RTDB[room]===undefined?null:RTDB[room]};
  };
  const handler=(await import(path.resolve(__dirname,'..','netlify','functions','present.mjs'))).default;
  const sent=[]; let putFail=0, pdf429=0;
  const serve=async(w,u,o={})=>{
    const url=new URL(u,'https://pastorshub.org/');
    const body=o.body?JSON.parse(o.body):null, op=body?body.op:url.searchParams.get('op');
    sent.push({op,method:o.method||'GET',body,q:Object.fromEntries(url.searchParams)});
    if(op==='putpdf'&&putFail>0){ putFail--; return {ok:false,status:503,headers:{get:()=>'application/json'},json:async()=>({ok:false,error:'busy'})}; }
    // fix after review: a download refused as busy (a whole church on one Wi-Fi reached the server's hourly count)
    if(op==='pdf'&&pdf429>0){ pdf429--; return {ok:false,status:429,headers:{get:()=>'application/json'},json:async()=>({ok:false,error:'slow-down'})}; }
    const r=await handler(new Request(url.href,{method:o.method||'GET',headers:o.headers||{},body:o.body}),{ip:'203.0.113.9'});
    const H={get:k=>r.headers.get(k)};
    if(/application\/pdf/.test(r.headers.get('content-type')||'')){ const buf=Buffer.from(await r.arrayBuffer());
      return {ok:r.ok,status:r.status,headers:H,blob:async()=>new Blob([buf],{type:'application/pdf'}),json:async()=>{ throw new Error('pdf'); }}; }
    const text=await r.text();
    return {ok:r.ok,status:r.status,headers:H,json:async()=>JSON.parse(text)};
  };
  const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Allegheny East',role:'pastor'};
  class FakeES{
    constructor(url){ this.url=String(url); this.readyState=0; this.l={}; this.onerror=null; STREAMS.add(this); FakeES.all.push(this); }
    addEventListener(t,f){ (this.l[t]=this.l[t]||[]).push(f); }
    open(){ this.readyState=1; }
    emit(t,msg){ (this.l[t]||[]).forEach(f=>f({data:msg===undefined?'null':JSON.stringify(msg)})); }
    fail(state){ this.readyState=state; if(this.onerror) this.onerror({}); }
    close(){ this.readyState=2; STREAMS.delete(this); }
  }
  FakeES.all=[];
  function page(url,{lang,fast,reg,objUrl}={}){
    const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
    const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.jspdf=jspdf;
        if(lang) w.localStorage.setItem('terrain-lang',lang);
        if(reg) w.localStorage.setItem('terrain-reg',JSON.stringify(reg));
        w.qrcode=(t,ec)=>{ let data=''; return {addData(s){ data=s; },make(){},getModuleCount:()=>25,isDark:(r,c2)=>((r*7+c2*3+data.length)%5)<2}; };
        w.EventSource=FakeES;
        if(objUrl){ w.__blobs=[]; w.URL.createObjectURL=b=>{ w.__blobs.push(b); return 'blob:https://pastorshub.org/'+w.__blobs.length; }; w.URL.revokeObjectURL=()=>{}; }
        if(fast){ const st=w.setTimeout.bind(w), si=w.setInterval.bind(w); w.setTimeout=(f,ms,...a)=>st(f,(ms||0)>=1000?Math.round(ms/100):ms,...a); w.setInterval=(f,ms,...a)=>si(f,(ms||0)>=1000?Math.round(ms/100):ms,...a); }
        w.fetch=async(u,o={})=>{ u=String(u);
          if(/functions\/present/.test(u)) return serve(w,u,o);
          if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})};
          if(/functions\/register/.test(u)) return {ok:false,status:500,json:async()=>({})};
          return new Promise(()=>{}); }; }});
    const w=dom.window;
    return {w,D:w.document,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,
      q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
      txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
  }
  const click=(P,s)=>{ const e=P.q(s); if(!e) throw new Error('no element '+s); e.click(); };
  // a blob made in the page (jsdom's has no arrayBuffer) or by the server stand-in
  const readBlob=async(X,b)=>!b?Buffer.alloc(0):typeof b.arrayBuffer==='function'?Buffer.from(await b.arrayBuffer()):await new Promise(res=>{ const fr=new X.w.FileReader(); fr.onload=()=>res(Buffer.from(fr.result)); fr.readAsArrayBuffer(b); });
  const shut=X=>{ try{ X.E('watchStopLive()'); }catch(e){} X.w.close(); };
  const key=(X,k)=>{ const e=new X.w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}); X.w.dispatchEvent(e); return e; };
  function setup(P,prefs){
    P.E(`(()=>{ const D=${JSON.stringify(FX.DATA)};
      D.M.tract.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.tract.moe)); D.M.county.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.county.moe));
      DATA=D; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)});
      const mk=b=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=b.includes(g.id)?4:1; }); return gfScores(a); };
      uChurch().members=[{id:'m0',name:'Ana Lopez',gifts:mk(['teach','shep','helps']),heart:{children:2},confirmed:true,willing:true,hours:6,skills:['kids'],source:'manual'}];
      uChurch().proposalPrefs=${JSON.stringify(prefs)};
      uPersist(); openTool('case'); render(); })()`);
  }
  async function joinPhone(room,o={}){
    const M=page('https://pastorshub.org/#watch='+room+(o.es?'~es':''),o);
    await until(()=>M.q('#watchp .td-root')&&(o.noES||FakeES.all.some(e=>e.url===`${FB}/live/${room}.json`&&!e.seen)));
    if(o.noES) return M;
    const es=FakeES.all.filter(e=>e.url===`${FB}/live/${room}.json`&&!e.seen).pop(); es.seen=true; M.es=es; es.open(); es.emit('put',{path:'/',data:RTDB[room]}); await sleep(20);
    return M;
  }
  const ops=o=>sent.filter(x=>x.op===o);

  console.log('\n-- the setup: no way to choose; Present follows, Share browses --');
  const P=page('https://pastorshub.org/',{reg:REG}); await sleep(1200);
  setup(P,{ministry:'food-pantry',type:'board',group:'board'});
  P.E(`uChurch().casePhones={mode:'free',pdf:true}; uPersist()`);      // a v10.42.0 choice of "swipe" left on the device
  // section B's proposal to vote on (the other half of this release) is set aside until its own part below, so the handout is
  // checked alone; below, a tiny stand-in checks the sending (section B's own tests check its document)
  P.E(`['caseProposal','caseProposalDoc','caseProposalName'].forEach(k=>{ window[k]=undefined; })`);
  click(P,'[data-cs-act="present"]');
  c('Present live: no radio buttons, no "Members can swipe", one line and the PDF switch',
    [P.qa('[data-pr-phmode]').length,/swipe/i.test(P.txt('.cp-phones')),P.txt('[data-pr-phline]'),P.qa('.cp-phones .cp-check b').map(b=>b.textContent),P.q('[data-pr-phpdf]').checked],
    [0,false,'Phones follow your slides until you end.',['Offer the PDF on phones'],true]);
  sent.length=0; click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
  let room=P.J(`uChurch().caseRooms['food-pantry|board|board|en']`);
  c('op open: mode follow, whatever an old "swipe" choice said', [ops('open')[0].body.mode,room.mode,store.peek('r/'+room.room).mode], ['follow','follow','follow']);
  c('only the PDF switch is kept per church now', P.J('uChurch().casePhones'), {pdf:true});
  c('the Phones button says so', [P.txt('[data-pr-phones]'),P.q('[data-pr-phones]').getAttribute('aria-label')], ['Phones','Phones: Phones follow your slides until you end.']);
  click(P,'[data-pr-phones]');
  c('the Phones sheet: the line and the PDF switch, never a way to choose', [P.txt('[data-pr-sheet] [data-pr-phline]'),P.qa('[data-pr-sheet] [data-pr-phmode]').length,!!P.q('[data-pr-sheet] [data-pr-phpdf]')], ['Phones follow your slides until you end.',0,true]);
  click(P,'[data-pr-shx]');

  console.log('\n-- the handout, sent by his device when presenting starts --');
  await until(()=>ops('putpdf').length>=1&&store.peek('p/'+room.room),8000);
  const up=ops('putpdf')[0];
  c('op putpdf follows op open, with the key, kind handout, his handout’s file name, its language', [!!up,up&&up.body.key===room.key,up&&(up.body.kind||'handout'),up&&/^Bucks-County-SDA-.*-board-\d{4}-\d{2}-\d{2}\.pdf$/.test(up.body.name),up&&up.body.lang], [true,true,'handout',true,'en']);
  const bytes=Buffer.from(store.peek('p/'+room.room).b64,'base64'), text=bytes.toString('latin1');
  c('…a real PDF, two pages as his own "Download PDF handout" makes it', [text.startsWith('%PDF-'),/\/Count 2\b/.test(text)], [true,true]);
  c('…no member’s name in it, no key', [/Ana Lopez/.test(text),text.includes(room.key)], [false,false]);
  await until(()=>P.J(`uChurch().caseRooms['food-pantry|board|board|en'].pv`)===1);
  room=P.J(`uChurch().caseRooms['food-pantry|board|board|en']`);
  c('the room kept on his device knows it went (its number, a hash of the words)', [room.pv,typeof room.pdfHash], [1,'string']);
  c('(section B\'s proposal to vote on set aside here: only the handout goes)', [ops('putpdf').filter(x=>x.body.kind==='vote').length,store.peek('q/'+room.room)], [0,null]);
  click(P,'[data-pr-link]'); await until(()=>/ready/.test(P.txt('[data-pr-pdfline]')||''));
  c('the Link sheet says the handout is on phones, and its size', /^Handout on phones: ready \(\d+ KB\)\.$/.test(P.txt('[data-pr-pdfline]')), true);
  click(P,'[data-pr-shx]');

  console.log('\n-- a phone at his last slide: his handout, from the server --');
  const N=P.J('PR_ST.P.out.slides.length');
  const M=await joinPhone(room.room,{objUrl:true});
  c('the phone follows, locked', [M.E('WA.pmode'),M.E('WA.ctl.locked()'),M.E('WA.pv')], ['follow',true,1]);
  P.E(`PR_ST.ctl.go(${N-1})`); await until(()=>M.q('#watchp a.wa-bb'),6000);
  const a=M.q('#watchp a.wa-bb'), blob=M.w.__blobs[M.w.__blobs.length-1];
  c('“Download the handout (PDF)”: a ready link with his file name', [a&&a.textContent,a&&/^blob:/.test(a.getAttribute('href')),a&&a.getAttribute('download')], ['Download the handout (PDF)',true,up.body.name]);
  const got=await readBlob(M,blob);
  c('…the very bytes his device sent (not a copy made from the slides)', Buffer.compare(got,bytes), 0);
  c('…fetched from the server once, by GET op=pdf with his number', sent.filter(x=>x.op==='pdf').map(x=>[x.method,x.q.v,x.q.kind||'']), [['GET','1','']]);

  console.log('\n-- a decision after the end: a newer handout, "Updated" --');
  { P.q('#casepres .td-bend').click(); P.q('#casepres .td-bend').click(); await until(()=>M.E('WA.ended'));
    c('End: the lock lifts, the handout stays', [M.E('WA.ctl.locked()'),M.txt('#watchp .wa-bb')], [false,'Download the handout (PDF)']);
    // new words for the handout (as a recorded decision makes them), sent again
    P.E(`PR_ST.P.model={...PR_ST.P.model,church:{...PR_ST.P.model.church}}; PR_ST.P.model.ministry={...PR_ST.P.model.ministry,name:PR_ST.P.model.ministry.name+' (agreed)'}`);
    await P.E('prPdfSync(PR_ST.P)');
    c('changed words: sent again, number 2', [ops('putpdf').length,store.peek('r/'+room.room).pv], [2,2]);
    await P.E('prPdfSync(PR_ST.P)');
    c('the same words again: not sent again', ops('putpdf').length, 2);
    M.E('WA.checkedAt=0'); await M.E('watchCheck()'); await until(()=>/Updated/.test(M.txt('#watchp .wa-bb')||''),6000);
    c('the phone hears it on its next check (after the end, once a minute): “Download the handout (PDF) · Updated”', M.txt('#watchp .wa-bb'), 'Download the handout (PDF) · Updated');
    c('…and it is the new bytes', Buffer.compare(await readBlob(M,M.w.__blobs[M.w.__blobs.length-1]),Buffer.from(store.peek('p/'+room.room).b64,'base64')), 0); }

  console.log('\n-- no copy on the server: the phone makes its own from the slides --');
  { store.m.delete('p/'+room.room);
    const M2=await joinPhone(room.room,{objUrl:true,noES:true});   // (ended: no stream) await until(()=>M2.q('#watchp a.wa-bb'),6000);
    const b2=M2.w.__blobs[M2.w.__blobs.length-1], t2=(await readBlob(M2,b2)).toString('latin1');
    // fix after review: "Never label the slide-made copy as the handout without saying so."
    c('the server has lost it (404): a copy made on the phone, from the slides, and the button says so', [M2.txt('#watchp .wa-bb'),t2.startsWith('%PDF-'),/^Bucks-County-SDA-/.test(M2.q('#watchp a.wa-bb').getAttribute('download'))], ['Download the slides (PDF)',true,true]);
    shut(M2); }

  console.log('\n-- Exit while phones follow --');
  { click(P,'[data-pr-done]');
    click(P,'[data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root')&&P.J('PR_ST.view')==='present');
    const r2=P.J(`uChurch().caseRooms['food-pantry|board|board|en']`);
    c('(a new room: presented again after the end)', [r2.room!==room.room,r2.mode], [true,'follow']);
    const MF=await joinPhone(r2.room);
    P.E('PR_ST.ctl.go(3)'); await until(()=>MF.E('WA.ctl.index()')===3);
    click(P,'[data-pr-exit]');
    c('Exit asks first: the question, End / Leave it running', [P.J('PR_ST.view'),P.txt('.cp-exitask .cp-lead'),P.txt('.cp-exitask .cp-note'),P.txt('[data-pr-exend]'),P.txt('[data-pr-exkeep]')],
      ['present','Phones are still following your slides.','Leave it running to fix a word and come back: phones stay on this slide.','End the presentation','Leave it running']);
    key(P,'Escape'); await sleep(30);
    c('Escape = leave it running: the view closes, the room stays open, phones stay locked on his slide', [P.J('PR_ST.view'),P.q('#casepres').hidden,store.peek('r/'+r2.room).ended,MF.E('WA.ctl.locked()'),MF.E('WA.ctl.index()')], [null,true,null,true,3]);
    c('…and where he was is kept (present again within the hour: the same slide)', P.J(`uChurch().caseRooms['food-pantry|board|board|en'].at`), 3);
    click(P,'[data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.J('PR_ST.view')==='present'&&P.q('#casepres .td-root'));
    click(P,'[data-pr-exit]'); click(P,'[data-pr-exkeep]');
    c('“Leave it running” closes as Exit always did', [P.J('PR_ST.view'),store.peek('r/'+r2.room).ended], [null,null]);
    click(P,'[data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.J('PR_ST.view')==='present'&&P.q('#casepres .td-root'));
    sent.length=0; click(P,'[data-pr-exit]'); click(P,'[data-pr-exend]');
    await until(()=>P.J('PR_ST.view')===null&&MF.E('WA.ended'));
    c('“End the presentation”: op end, then the view closes; the phone is freed', [ops('end').length,typeof store.peek('r/'+r2.room).ended,P.J('PR_ST.view'),MF.E('WA.ctl.locked()')], [1,'number',null,false]);
    shut(MF); }

  console.log('\n-- a link shared first, then presented: brought to follow --');
  { click(P,'[data-cs-act="share"]');
    c('Share link & QR: no way to choose; the line says members browse', [P.qa('[data-pr-phmode]').length,P.txt('[data-pr-phline]')], [0,'Members look through the slides at their own pace.']);
    sent.length=0; click(P,'[data-pr-start]'); await until(()=>P.J('PR_ST.view')==='share'&&ops('open').length);
    const r3=P.J(`uChurch().caseRooms['food-pantry|board|board|en']`);
    c('op open: mode free (members browse a shared link)', [ops('open')[0].body.mode,store.peek('r/'+r3.room).mode], ['free','free']);
    const MS=await joinPhone(r3.room);
    MS.E('WA.ctl.go(2)'); c('a phone on a shared link moves by itself', [MS.E('WA.ctl.locked()'),MS.E('WA.ctl.index()')], [false,2]);
    sent.length=0; click(P,'[data-pr-present]'); await until(()=>P.J('PR_ST.view')==='present'&&P.q('#casepres .td-root'));
    await until(()=>ops('go').length>0);
    const iMode=sent.findIndex(x=>x.op==='mode'), iGo=sent.findIndex(x=>x.op==='go');
    c('its panel’s Present live: op mode follow before the first slide change', [iMode>=0,iMode<iGo,sent[iMode]&&sent[iMode].body.mode,store.peek('r/'+r3.room).mode], [true,true,'follow','follow']);
    await until(()=>MS.E('WA.ctl.locked()'));
    c('…the phone is locked on his slide now', [MS.E('WA.ctl.locked()'),MS.E('WA.ctl.index()')], [true,0]);

    console.log('\n-- the heartbeat, and 30 minutes of silence --');
    sent.length=0;
    P.E(`PR_ST.lastGo=Date.now()-${5*60*1000-2000}; prBeat(PR_ST.P)`);
    c('under five minutes since his last move: nothing sent', ops('go').length, 0);
    P.E(`PR_ST.lastGo=Date.now()-${5*60*1000+1000}; prBeat(PR_ST.P)`); await until(()=>ops('go').length);
    c('five minutes without a slide change: the same slide again, straight to the server', [ops('go').length,ops('go')[0].body.i,ops('go')[0].body.key===r3.key,P.J('Date.now()-PR_ST.lastGo<2000')], [1,0,true,true]);
    P.E('prBeat(PR_ST.P)'); c('…not again right after', ops('go').length, 1);
    c('(the presenter view checks every minute)', P.J('!!PR_ST.ping'), true);
    // a phone that hears nothing from him for 30 minutes (he left it running): freed, and told why
    const MQ=await joinPhone(r3.room,{fast:true});
    c('(a fresh phone, locked)', MQ.E('WA.ctl.locked()'), true);
    MQ.E(`WA.atSeen=Date.now()-${30*60*1000+1000}`); await until(()=>!MQ.E('WA.ctl.locked()'),3000);
    c('30 minutes with no word: unlocked, “The presenter has paused. You may look through the slides.”', [MQ.E('WA.ctl.locked()'),MQ.txt('#watchp .wa-banner')], [false,'The presenter has paused. You may look through the slides.']);
    key(MQ,'ArrowRight'); c('…and the member may look through them', MQ.E('WA.ctl.index()'), 1);
    P.E('PR_ST.ctl.go(4)'); await until(()=>MQ.E('WA.ctl.locked()')&&MQ.E('WA.ctl.index()')===4,3000);
    c('his next move: locked again, on his slide, the line gone', [MQ.E('WA.ctl.locked()'),MQ.E('WA.ctl.index()'),MQ.q('#watchp .wa-banner').hidden], [true,4,true]);
    const MQ2=await joinPhone(r3.room,{fast:true,lang:'es'});
    MQ2.E(`WA.atSeen=Date.now()-${31*60*1000}`); await until(()=>!MQ2.E('WA.ctl.locked()'),3000);
    c('…in Spanish: “El presentador hizo una pausa. Puede mirar las diapositivas.”', MQ2.txt('#watchp .wa-banner'), 'El presentador hizo una pausa. Puede mirar las diapositivas.');
    // Fix after review: "A phone that opens the link later, or reloads, takes the pointer's old time as 'just heard from the
    // presenter', so it is locked for a fresh 30 minutes however long the presenter has been gone." The server says its clock
    // (op deck, op state: now), so the pointer's time counts from when it was written.
    { RTDB[r3.room].at=Date.now()-31*60*1000;
      const ML=await joinPhone(r3.room);
      c('a phone that opens a link whose pointer is 31 minutes old: unlocked at once, and told why', [ML.E('WA.ctl.locked()'),ML.txt('#watchp .wa-banner'),typeof ML.E('WA.skew')], [false,'The presenter has paused. You may look through the slides.','number']);
      { const i0=ML.E('WA.ctl.index()'); key(ML,'ArrowRight'); c('…and may look through the slides', ML.E('WA.ctl.index()'), i0+1); }
      shut(ML);
      const ML2=await joinPhone(r3.room);
      c('…the same phone reloaded: still unlocked', ML2.E('WA.ctl.locked()'), false);
      RTDB[r3.room].at=Date.now()-29*60*1000;
      const ML3=await joinPhone(r3.room);
      c('one whose pointer is 29 minutes old: locked (the presenter may still be talking)', ML3.E('WA.ctl.locked()'), true);
      shut(ML3);
      // new words for the room (an update: a decision recorded in step 3 days later) are not the presenter's move
      const v0=ML2.E('WA.v');
      await P.E(`prCall('update',{room:${JSON.stringify(r3.room)},key:${JSON.stringify(r3.key)},deck:PR_ST.P.out},{pastor:true})`);
      await until(()=>ML2.E('WA.v')>v0,4000); await sleep(50);
      c('new words sent to the room (op update, no pointer time): the freed phone stays free', [ML2.E('WA.v')>v0,ML2.E('WA.ctl.locked()'),'at' in (sent.filter(x=>x.op==='update').pop()||{body:{}}).body], [true,false,false]);
      P.E('PR_ST.ctl.go(2)'); await until(()=>ML2.E('WA.ctl.locked()')&&ML2.E('WA.ctl.index()')===2,3000);
      c('his next move: locked again, on his slide', [ML2.E('WA.ctl.locked()'),ML2.E('WA.ctl.index()')], [true,2]);
      shut(ML2); }
    shut(MQ); shut(MQ2); shut(MS);
    click(P,'[data-pr-exit]'); click(P,'[data-pr-exkeep]'); }

  console.log('\n-- Share on a link left running (fix after review) --');
  // "Share link & QR on the same deck afterwards reuses that room, still set to follow, so members opening the shared link are
  // locked too. SPEC-FOCUS A says Share (no presenter) stays free browsing."
  { const k3=`uChurch().caseRooms['food-pantry|board|board|en']`, r3=P.J(k3);
    c('(the link presented above, left running: it follows)', [store.peek('r/'+r3.room).mode,store.peek('r/'+r3.room).ended], ['follow',null]);
    // his other device still presents (the pointer is fresh) though this one last moved it long ago: Share leaves it following
    RTDB[r3.room].at=Date.now(); P.E(`${k3}.atT=Date.now()-${31*60*1000}; uPersist()`);
    click(P,'[data-cs-act="share"]'); sent.length=0; click(P,'[data-pr-start]'); await until(()=>P.J('PR_ST.view')==='share');
    c('Share while the pointer is fresh (he presents from another device): the link keeps following', [ops('mode').length,store.peek('r/'+r3.room).mode], [0,'follow']);
    click(P,'[data-pr-cancel]');
    // nobody has moved it for 31 minutes (the server's own count)
    RTDB[r3.room].at=Date.now()-31*60*1000;
    const MW=await joinPhone(r3.room);
    click(P,'[data-cs-act="share"]');
    c('Share on a link nobody has moved for 30 minutes: the setup says members browse', P.txt('[data-pr-phline]'), 'Members look through the slides at their own pace.');
    sent.length=0; click(P,'[data-pr-start]'); await until(()=>P.J('PR_ST.view')==='share'&&ops('mode').length);
    c('…op mode free before the panel; the room browses now; the panel says so', [ops('mode')[0].body.mode,store.peek('r/'+r3.room).mode,P.txt('[data-pr-phbody] [data-pr-phline]')], ['free','free','Members look through the slides at their own pace.']);
    await until(()=>MW.E('WA.pmode')==='free');
    MW.E('WA.ctl.go(3)');
    c('…a member on the shared link moves by themself', [MW.E('WA.ctl.locked()'),MW.E('WA.ctl.index()')], [false,3]);
    click(P,'[data-pr-cancel]');
    shut(MW); }

  console.log('\n-- the proposal to vote on, for the bodies that vote --');
  { // section B's document (built by the other half of this release) stood in by a tiny one, to check the sending
    P.E(`window.caseProposal=(m,d,o)=>({lang:m.lang,title:'P '+m.ministry.name,group:d.audience.group});
      window.caseProposalDoc=(Pz,o)=>{ const d=new o.jsPDF({unit:'pt',format:'letter'}); for(let i=0;i<30;i++) d.text('Proposal to vote on: '+Pz.title+' line '+i,50,60+i*18); return d; };
      window.caseProposalName=Pz=>'Bucks-County-SDA-food-pantry-proposal-board-2026-09-29.pdf';`);
    click(P,'[data-cs-act="present"]'); sent.length=0; click(P,'[data-pr-start]'); await until(()=>P.J('PR_ST.view')==='present');
    await until(()=>ops('putpdf').some(x=>x.body.kind==='vote'),8000); await sleep(100);
    const r4=P.J(`uChurch().caseRooms['food-pantry|board|board|en']`);
    // (this link still holds its handout from before: the same words are not sent again)
    c('the church board: the proposal to vote on goes too (kind vote), beside the handout the link holds', [ops('putpdf').filter(x=>x.body.kind==='vote').length,ops('putpdf').filter(x=>x.body.kind==='handout').length,r4.pv>=1,!!store.peek('p/'+r4.room),!!store.peek('q/'+r4.room),r4.qv], [1,0,true,true,true,1]);
    const MV=await joinPhone(r4.room,{objUrl:true});
    P.E(`PR_ST.ctl.go(${N-1})`); await until(()=>MV.qa('#watchp a.wa-bb').length===2,6000);
    c('the phone offers both: the handout, then the proposal to vote on', MV.qa('#watchp .wa-bb').map(x=>[x.textContent,x.getAttribute('download')]),
      [['Download the handout (PDF)',P.J(`uChurch().caseRooms['food-pantry|board|board|en']`)&&MV.q('#watchp a.wa-bb').getAttribute('download')],['Download the proposal to vote on (PDF)','Bucks-County-SDA-food-pantry-proposal-board-2026-09-29.pdf']]);
    const MVes=await joinPhone(r4.room,{objUrl:true,lang:'es'}); await until(()=>MVes.qa('#watchp a.wa-bb').length===2,6000);
    c('…in Spanish', MVes.qa('#watchp .wa-bb').map(x=>x.textContent), ['Descargar el folleto (PDF)','Descargar la propuesta para votar (PDF)']);
    // fix after review: the server's copy is keyed by its number alone ("The handout is fetched twice because its key … changes
    // once for pv and again when the deck's v changes"): new words with the same documents fetch nothing again
    const pdfGets=()=>sent.filter(x=>x.op==='pdf'&&x.q.room===r4.room).length, g0=pdfGets(), v0=MV.E('WA.v');
    await P.E(`prCall('update',{room:${JSON.stringify(r4.room)},key:${JSON.stringify(r4.key)},deck:PR_ST.P.out},{pastor:true})`);
    await until(()=>MV.E('WA.v')>v0&&MVes.E('WA.v')>v0,4000); await sleep(300);
    c('a new deck version with the same handout and proposal: nothing fetched again, both links kept', [MV.E('WA.v')>v0,pdfGets()-g0,MV.qa('#watchp a.wa-bb').length], [true,0,2]);
    // a newer proposal to vote on (a decision recorded after the vote): "· Updated" on its button too
    { const d=new jspdf.jsPDF({unit:'pt',format:'letter'}); for(let i=0;i<40;i++) d.text('The proposal to vote on, with Action taken filled in, line '+i,50,60+i*16);
      const b64=Buffer.from(d.output('arraybuffer')).toString('base64');
      const r=await handler(new Request('https://pastorshub.org/.netlify/functions/present',{method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({op:'putpdf',room:r4.room,key:r4.key,kind:'vote',pdf:b64,name:'Bucks-County-SDA-food-pantry-proposal-board-decided.pdf'})}),{ip:'203.0.113.9'});
      c('(a newer proposal to vote on sent: number 2)', [r.status,(await r.json()).qv], [200,2]); }
    await until(()=>/Updated/.test((MV.qa('#watchp .wa-bb')[1]||{}).textContent||''),6000);
    c('fix after review: the proposal to vote on says “· Updated” when a newer copy arrives', MV.qa('#watchp .wa-bb').map(x=>x.textContent),
      ['Download the handout (PDF)','Download the proposal to vote on (PDF) · Updated']);
    c('…and it is the new file', MV.qa('#watchp a.wa-bb')[1].getAttribute('download'), 'Bucks-County-SDA-food-pantry-proposal-board-decided.pdf');
    // a download refused as busy (429): not given up. It waits and is tried again (quick here), or fetched on a tap.
    pdf429=2; const g1=pdfGets();
    const MR=await joinPhone(r4.room,{objUrl:true,fast:true});
    await until(()=>MR.qa('#watchp a.wa-bb').length===2,8000);
    c('refused twice as busy (429), then tried again a little later: both documents, the server’s own, never the slides’ copy',
      [MR.qa('#watchp .wa-bb').map(x=>x.textContent),pdfGets()-g1,pdf429], [['Download the handout (PDF)','Download the proposal to vote on (PDF)'],4,0]);
    shut(MR);
    pdf429=2;
    const MT=await joinPhone(r4.room,{objUrl:true});
    await until(()=>MT.qa('#watchp button.wa-bb').length===2,6000);
    c('refused as busy on a phone that waits (20 s and more): two buttons that fetch on the tap', MT.qa('#watchp .wa-bb').map(x=>[x.tagName,x.textContent]),
      [['BUTTON','Download the handout (PDF)'],['BUTTON','Download the proposal to vote on (PDF)']]);
    MT.w.HTMLAnchorElement.prototype.click=function(){ (MT.w.__saved=MT.w.__saved||[]).push(this.download); };
    MT.qa('#watchp button.wa-bb')[1].click(); await until(()=>(MT.w.__saved||[]).length===1,4000);
    c('…a tap: the proposal to vote on is fetched and saved there and then, and its button is a link now', [MT.w.__saved,MT.qa('#watchp .wa-bb').map(x=>x.tagName)],
      [['Bucks-County-SDA-food-pantry-proposal-board-decided.pdf'],['BUTTON','A']]);
    pdf429=1; MT.qa('#watchp button.wa-bb')[0].click(); await until(()=>/Busy/.test(MT.txt('#watchp .wa-bb')||''),3000);
    c('…still busy on a tap: “Busy. Try again in a minute.”, never the slides’ copy under the handout’s name', [MT.txt('#watchp .wa-bb'),(MT.w.__saved||[]).length], ['Busy. Try again in a minute.',1]);
    shut(MT);
    shut(MV); shut(MVes);
    click(P,'[data-pr-exit]'); click(P,'[data-pr-exend]'); await until(()=>P.J('PR_ST.view')===null);
    // the whole church is invited, never asked to vote
    P.E(`uChurch().proposalPrefs={ministry:'food-pantry',type:'congregation',group:'congregation'}; uPersist(); caseMount&&caseMount();`);
    await sleep(50);
    P.E(`caseOpenPresenter(caseCurrentDeck(),{model:CASE_ST.model})`); sent.length=0; click(P,'[data-pr-start]'); await until(()=>P.J('PR_ST.view')==='present');
    await until(()=>ops('putpdf').length>=1,8000); await sleep(200);
    c('the whole church: the handout only, never a proposal to vote on', ops('putpdf').map(x=>x.body.kind), ['handout']);
    click(P,'[data-pr-exit]'); click(P,'[data-pr-exend]'); await until(()=>P.J('PR_ST.view')===null); }

  console.log('\n-- the sample, a control device, a failure --');
  { click(P,'[data-cs-act="sample"]'); await sleep(50);
    click(P,'#casep [data-cs-act="present"]'); sent.length=0; click(P,'[data-pr-start]'); await until(()=>P.J('PR_ST.view')==='present');
    await until(()=>ops('putpdf').length,8000);
    const sr=P.J('Object.values(CASE_ST.sampleRooms)[0]');
    c('the sample sends its SAMPLE handout too (its room closes after a day)', [ops('putpdf').length,/^SAMPLE-/.test(ops('putpdf')[0].body.name),!!store.peek('p/'+sr.room)], [1,true,true]);
    const MSa=await joinPhone(sr.room);
    c('(a phone that joined the demo follows, locked)', MSa.E('WA.ctl.locked()'), true);
    click(P,'[data-pr-exit]');
    c('Exit from the sample asks nothing (as before)', [P.J('PR_ST.view'),!!P.q('.cp-exitask')], [null,false]);
    // fix after review (PROPOSAL §2.4: the sample room "ends with its screen"): Present always locks the phones now
    await until(()=>MSa.E('WA.ended'),4000);
    c('…and ends the sample room, so a phone that joined the demo is freed', [typeof store.peek('r/'+sr.room).ended,ops('end').length,MSa.E('WA.ctl.locked()')], ['number',1,false]);
    shut(MSa);
    click(P,'#casep [data-cs-back]');
    click(P,'[data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.J('PR_ST.view')==='present');
    const r5=P.J(`uChurch().caseRooms['food-pantry|congregation|congregation|en']`);
    sent.length=0;
    const CT=page(`https://pastorshub.org/#present=${r5.room}.${r5.key}`); await until(()=>CT.q('#casepres .td-m-present')); await sleep(300);
    c('a control device (his private link) never sends a handout (it has no case model)', ops('putpdf').length, 0);
    click(CT,'[data-pr-exit]');
    c('…and its Exit asks nothing', [CT.J('PR_ST.view'),!!CT.q('.cp-exitask')], [null,false]);
    CT.w.close();
    click(P,'[data-pr-exit]'); click(P,'[data-pr-exkeep]');
    // a failure: tried again after 5 s and 30 s (quick here), then the line says the phones make their own copy
    const F=page('https://pastorshub.org/',{reg:REG,fast:true}); await sleep(900);
    setup(F,{ministry:'food-pantry',type:'team',group:'community'});
    click(F,'[data-cs-act="present"]'); putFail=3; sent.length=0; click(F,'[data-pr-start]'); await until(()=>F.J('PR_ST.view')==='present');
    await until(()=>ops('putpdf').length>=3,8000); await sleep(300);
    click(F,'[data-pr-link]'); await sleep(20);
    c('the upload fails three times: tried three times in all, then “The handout could not be sent…”', [ops('putpdf').length,F.txt('[data-pr-pdfline]')],
      [3,'The handout could not be sent. Phones make their own copy from the slides.']);
    click(F,'[data-pr-shx]'); click(F,'[data-pr-exit]'); click(F,'[data-pr-exkeep]');
    c('no page errors there', F.errs, []);
    F.w.close(); }

  console.log('\n-- Spanish --');
  { const S=page('https://pastorshub.org/',{lang:'es',reg:REG}); await sleep(1200);
    setup(S,{ministry:'food-pantry',type:'board',group:'board'});
    click(S,'[data-cs-act="present"]');
    c('the setup: the line and the switch', [S.txt('.cp-phones > span'),S.txt('[data-pr-phline]'),S.qa('.cp-phones .cp-check b').map(b=>b.textContent)],
      ['En los teléfonos','Los teléfonos siguen sus diapositivas hasta que usted termine.',['Ofrecer el PDF en los teléfonos']]);
    click(S,'[data-pr-start]'); await until(()=>S.J('PR_ST.view')==='present'&&S.q('#casepres .td-root'));
    click(S,'[data-pr-exit]');
    c('the Exit question', [S.txt('.cp-exitask .cp-lead'),S.txt('.cp-exitask .cp-note'),S.txt('[data-pr-exend]'),S.txt('[data-pr-exkeep]')],
      ['Los teléfonos siguen sus diapositivas.','Déjela abierta si va a corregir algo y volver: los teléfonos se quedan en esta diapositiva.','Terminar la presentación','Dejarla abierta']);
    click(S,'[data-pr-exkeep]');
    c('no page errors in Spanish', S.errs, []);
    S.w.close(); }

  c('no page errors on the pastor’s page or the phones', [P.errs,M.errs].flat(), []);
  shut(M);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
