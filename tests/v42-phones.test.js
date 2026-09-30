// v10.42.0 — who moves the slides on members' phones, and the proposal on their phones.
// The pastor, after presenting v10.41.1 live (voice-to-text, 29 Sep 2026): "It's pretty good, but I'm able to change
// the slides on my phone and I don't want that. I want only the presenter to have the ability to control the slides.
// We could do both: the presenter can choose — do I want them to be able to do the slides whenever they want, or do
// they have to follow my slides. And at the end, on the phone or whatever device, they should be able to download the
// proposal right there."
// v10.42 part 3 (the pastor, SPEC-FOCUS A: "No 'members can swipe' choice any more"): the choice between the two ways
// and its mid-presentation switch are gone (Present live follows, Share link & QR browses: tests/v42-lock.test.js); the
// phones' button reads "Download the handout (PDF)" (his answer, Q2). The checks of the choice were updated, each with a comment.
// End to end in jsdom with the real netlify/functions/present.mjs (present-1.3, an in-memory store) and a stand-in for
// Firebase that relays every pointer PATCH to the phones' EventSource stubs, as in present-client.test.js.
// Checked: the setup's choice (follow first and chosen, the PDF on; saved per church; the sample never saves it); op
// open carries it; a following phone lands on the presenter's slide and cannot be moved by a real touch swipe, keys,
// the wheel, a mouse drag, ctl.go or the dots; the quiet footer line in English and Spanish; "Waiting for the
// presenter" before he starts; an "I'm in" answer being written holds the phone on the yes slide until it is sent (v10.42.0
// fix, the verifier: a member who tapped an answer and left it was stuck there for the rest of the talk, still labelled
// "Following the presenter": now a held phone shows "You: 8 · Presenter: 9 | Back to live", and a hold with nothing
// touched for a minute lets go by itself; after "Back to live" an old, untouched answer never holds the phone again); the
// presenter switches the way mid-presentation (stream and polling phones switch; switching back snaps them to his
// slide); a failed stream falls back to polling and stays in step; a silent stream is dropped for polling; lost contact
// lets the member swipe and says why; the proposal button at the last slide and after End, in both ways, a ready link
// where the browser can make one, off when he unticks it (after End too); End lifts the lock; an old room is free; a
// phone can never set the way; a control device's Phones sheet. jsdom does no layout: Chrome checks the look.
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
jspdf.jsPDF.API.save=function(name){ saved.push({name,doc:this,raw:Buffer.from(this.output('arraybuffer')).toString('latin1')}); return this; };

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
  const sent=[]; let stateFail=false;
  const serve=async(u,o={})=>{
    const url=new URL(u,'https://pastorshub.org/');
    const body=o.body?JSON.parse(o.body):null, op=body?body.op:url.searchParams.get('op');
    sent.push({op,method:o.method||'GET',body,headers:o.headers||{},q:Object.fromEntries(url.searchParams)});
    if(stateFail&&op==='state') return {ok:false,status:502,json:async()=>({ok:false,error:'live-failed'})};
    const r=await handler(new Request(url.href,{method:o.method||'GET',headers:o.headers||{},body:o.body}),{ip:'203.0.113.9'});
    const text=await r.text();
    return {ok:r.ok,status:r.status,json:async()=>JSON.parse(text)};
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
  function page(url,{lang,fast,noES,reg,objUrl}={}){
    const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
    const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.jspdf=jspdf;
        if(lang) w.localStorage.setItem('terrain-lang',lang);
        if(reg) w.localStorage.setItem('terrain-reg',JSON.stringify(reg));
        w.qrcode=(t,ec)=>{ let data=''; return {addData(s){ data=s; },make(){},getModuleCount:()=>25,isDark:(r,c2)=>((r*7+c2*3+data.length)%5)<2}; };
        if(!noES) w.EventSource=FakeES;
        if(objUrl){ w.__blobs=[]; w.URL.createObjectURL=b=>{ w.__blobs.push(b); return 'blob:https://pastorshub.org/'+w.__blobs.length; }; w.URL.revokeObjectURL=()=>{}; }
        if(fast){ const st=w.setTimeout.bind(w), si=w.setInterval.bind(w); w.setTimeout=(f,ms,...a)=>st(f,(ms||0)>=1000?Math.round(ms/100):ms,...a); w.setInterval=(f,ms,...a)=>si(f,(ms||0)>=1000?Math.round(ms/100):ms,...a); }
        w.fetch=async(u,o={})=>{ u=String(u);
          if(/functions\/present/.test(u)) return serve(u,o);
          if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})};
          if(/functions\/register/.test(u)) return {ok:false,status:500,json:async()=>({})};
          return new Promise(()=>{}); }; }});
    const w=dom.window;
    return {w,D:w.document,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,
      q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
      txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
  }
  const click=(P,s)=>{ const e=P.q(s); if(!e) throw new Error('no element '+s); e.click(); };
  // a phone put away: its stream closed first (a closed jsdom window has no document for the next event)
  const shut=X=>{ try{ X.E('watchStopLive()'); }catch(e){} X.w.close(); };
  const pick=(P,sel)=>{ const x=P.q(sel); if(!x) throw new Error('no element '+sel); x.checked=!x.checked||x.type==='radio'; if(x.type==='radio') x.checked=true; x.dispatchEvent(new P.w.Event('change')); };
  function setup(P,prefs){
    P.E(`(()=>{ const D=${JSON.stringify(FX.DATA)};
      D.M.tract.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.tract.moe)); D.M.county.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.county.moe));
      DATA=D; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)});
      const mk=b=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=b.includes(g.id)?4:1; }); return gfScores(a); };
      uChurch().members=[{id:'m0',name:'Ana Lopez',gifts:mk(['teach','shep','helps']),heart:{children:2},confirmed:true,willing:true,hours:6,skills:['kids'],source:'manual'}];
      uChurch().proposalPrefs=${JSON.stringify(prefs)};
      uPersist(); openTool('case'); render(); })()`);
  }
  // A phone's slides given a width (jsdom has no layout), as present-client.test.js does
  const widen=M=>{ const sc=M.q('#watchp .td-scroller'); Object.defineProperty(sc,'clientWidth',{value:390,configurable:true});
    M.qa('#watchp .td-slide').forEach((s,i)=>Object.defineProperty(s,'offsetLeft',{value:i*390,configurable:true})); return sc; };
  const streamOf=room=>FakeES.all.filter(e=>e.url===`${FB}/live/${room}.json`).pop();
  async function joinPhone(room,o={}){
    const M=page('https://pastorshub.org/#watch='+room+(o.es?'~es':''),o);
    await until(()=>M.q('#watchp .td-root')&&(o.noES||FakeES.all.some(e=>e.url===`${FB}/live/${room}.json`&&!e.seen)));
    if(!o.noES){ const es=FakeES.all.filter(e=>e.url===`${FB}/live/${room}.json`&&!e.seen).pop(); es.seen=true; M.es=es; es.open(); es.emit('put',{path:'/',data:RTDB[room]}); await sleep(20); }
    return M;
  }
  // One real attempt of each kind to move a phone's slides by hand; returns [index after each, prevented?]
  async function tryMove(M){
    const sc=widen(M), out={};
    const i0=M.E('WA.ctl.index()');
    // a finger: down on the right, the row dragged a slide along (the browser would have), up on the left
    const tev=(type,x)=>{ const e=new M.w.Event(type,{bubbles:true,cancelable:true}); Object.defineProperty(e,'touches',{value:type==='touchend'?[]:[{clientX:x,clientY:400}]});
      Object.defineProperty(e,'changedTouches',{value:[{clientX:x,clientY:400}]}); sc.dispatchEvent(e); };
    tev('touchstart',320); sc.scrollLeft=(i0+1)*390; sc.dispatchEvent(new M.w.Event('scroll')); tev('touchend',40);
    sc.dispatchEvent(new M.w.Event('scrollend')); await sleep(200);
    out.touch=[M.E('WA.ctl.index()'),sc.scrollLeft];
    const keys=[]; for(const k of ['ArrowRight','ArrowLeft','PageDown','PageUp',' ','End','Home','ArrowDown']){
      const e=new M.w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}); M.w.dispatchEvent(e); keys.push([M.E('WA.ctl.index()'),e.defaultPrevented]); }
    out.keys=keys;
    const wh=[]; for(const d of [{deltaX:160},{deltaY:160},{deltaX:-160}]){ const e=new M.w.WheelEvent('wheel',{...d,bubbles:true,cancelable:true}); sc.dispatchEvent(e); await sleep(250); wh.push([M.E('WA.ctl.index()'),e.defaultPrevented]); }
    out.wheel=wh;
    const pev=(type,x)=>{ const e=new M.w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:300,button:0}); Object.defineProperty(e,'pointerType',{value:'mouse'}); sc.dispatchEvent(e); };
    pev('pointerdown',330); pev('pointerup',40); out.drag=M.E('WA.ctl.index()');
    M.E('WA.ctl.go(0)'); M.E('WA.ctl.next()'); M.E('WA.ctl.prev()'); out.ctl=M.E('WA.ctl.index()');
    const pip=M.q('#watchp .td-pager i'); if(pip) pip.dispatchEvent(new M.w.MouseEvent('click',{bubbles:true})); out.dots=M.E('WA.ctl.index()');
    return out;
  }

  console.log('\n-- the setup: phones follow by default, the PDF on --');
  const P=page('https://pastorshub.org/',{reg:REG}); await sleep(1200);
  setup(P,{ministry:'food-pantry',type:'congregation',group:'congregation'});
  const base=P.J('caseCurrentDeck()'), N=base.slides.length, yi=base.slides.findIndex(s=>s.type==='yes');
  click(P,'[data-cs-act="present"]');
  // v10.42 part 3 (the pastor, SPEC-FOCUS A: "No 'members can swipe' choice any more… 'Share link & QR' (no presenter) stays free browsing"):
  // the setup no longer offers two ways: Present live follows, Share link & QR browses (tests/v42-lock.test.js)
  c('“On phones”: no way to choose; the line says phones follow; the PDF on phones, ticked',
    [P.txt('.cp-phones > span'),P.qa('[data-pr-phmode]').length,P.txt('[data-pr-phline]'),P.q('[data-pr-phpdf]').checked],
    ['On phones',0,'Phones follow your slides until you end.',true]);
  c('…in short words', P.qa('.cp-phones .cp-check b').map(b=>b.textContent), ['Offer the PDF on phones']);
  c('…Share link & QR: the same setup, no way to choose there either', (()=>{ click(P,'[data-pr-cancel]'); click(P,'[data-cs-act="share"]'); const v=[P.txt('[data-pr-start]'),P.qa('[data-pr-phmode]').length,!!P.q('[data-pr-phpdf]')]; click(P,'[data-pr-cancel]'); click(P,'[data-cs-act="present"]'); return v; })(), ['Make the link',0,true]);
  sent.length=0; click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
  const open=sent.find(x=>x.op==='open');
  const room=P.J(`uChurch().caseRooms['food-pantry|congregation|congregation|en']`);
  c('op open: mode follow, pdf true; the room kept on the device says so', [open.body.mode,open.body.pdf,room.mode,room.pdf], ['follow',true,'follow',true]);
  c('the server keeps it, and the pointer carries it', [store.peek('r/'+room.room).mode,store.peek('r/'+room.room).pdf,RTDB[room.room].mode,RTDB[room.room].pdf], ['follow',true,'follow',true]);
  c('his PDF choice is remembered for this church (v10.42 part 3: the way is no longer his to keep)', P.J('uChurch().casePhones'), {pdf:true});
  c('the presenter view has a Phones button that says the way', [!!P.q('[data-pr-phones] svg'),P.txt('[data-pr-phones]'),P.q('[data-pr-phones]').getAttribute('aria-label')], [true,'Phones','Phones: Phones follow your slides until you end.']);

  console.log('\n-- a phone follows, and cannot be moved by hand --');
  P.E('PR_ST.ctl.go(3)'); await until(()=>RTDB[room.room].i===3);
  const M=await joinPhone(room.room);
  c('op deck says follow and the PDF on', [(sent.filter(x=>x.op==='deck').pop()||{}).op,M.E('WA.pmode'),M.E('WA.pdf')], ['deck','follow',true]);
  c('a late joiner lands on the presenter’s slide, locked, the footer saying so quietly',
    [M.E('WA.ctl.index()'),M.E('WA.ctl.locked()'),M.q('#watchp .td-root').classList.contains('td-locked'),M.txt('#watchp .td-slide[data-i="3"] .td-flk'),M.q('#watchp .td-pill').hidden],
    [3,true,true,'Following the presenter',true]);
  c('…the church’s name is still in the footer, set aside while locked (the stylesheet hides one or the other)', [M.txt('#watchp .td-slide[data-i="3"] .td-fch'),/\.td-locked \.td-fch\{display:none\}/.test(html),/\.td-locked \.td-scroller\{overflow-x:hidden/.test(html)], ['Bucks County SDA',true,true]);
  { const t=await tryMove(M);
    c('a real touch swipe (the row carried a slide along): it springs back to the presenter’s slide', t.touch, [3,3*390]);
    c('keys (→ ← PageDown PageUp Space End Home ↓): nothing moves, each key is taken', t.keys, Array(8).fill([3,true]));
    c('the wheel, sideways and down: nothing moves, taken', t.wheel, Array(3).fill([3,true]));
    c('a mouse drag: nothing moves', t.drag, 3);
    c('the member’s own ctl.go / next / prev: nothing moves', t.ctl, 3);
    c('the dots: nothing moves (they take no taps)', [t.dots,/\.td-pager\{[^}]*pointer-events:none/.test(html)], [3,true]);
    c('…and never the pill or "Back to live"', [M.q('#watchp .td-pill').hidden,M.J('WA.ctl.following()')], [true,true]); }
  P.E('PR_ST.ctl.go(4)'); await until(()=>M.E('WA.ctl.index()')===4);
  c('the presenter moves on: the phone goes with him', [M.E('WA.ctl.index()'),M.E('WA.ctl.locked()')], [4,true]);
  const MS=await joinPhone(room.room,{lang:'es'});
  c('a Spanish phone: “Siguiendo al presentador”, on his slide', [MS.E('WA.ctl.index()'),MS.txt('#watchp .td-slide[data-i="4"] .td-flk')], [4,'Siguiendo al presentador']);
  { const t=await tryMove(MS);
    c('…and it cannot be moved by hand either', [t.touch[0],t.keys.every(k=>k[0]===4),t.wheel.every(k=>k[0]===4),t.drag,t.ctl], [4,true,true,4,4]); }
  { // before he starts (a link shared ahead): the first slide, "Waiting for the presenter"
    M.E(`(()=>{ const box=document.createElement('div'); box.id='__w'; document.body.appendChild(box); window.__wc=tdeckRender(WA.deck,box,{mode:'follow',contained:true,keys:false,lock:true,live:false}); })()`);
    c('before the presenter starts: slide 1, locked, “Waiting for the presenter”', [M.E('__wc.index()'),M.E('__wc.locked()'),M.txt('#__w .td-slide[data-i="0"] .td-flk')], [0,true,'Waiting for the presenter']);
    M.E('__wc.go(2)'); c('…and a member’s move does nothing there too', M.E('__wc.index()'), 0);
    M.E(`__wc.destroy(); document.getElementById('__w').remove()`); }

  console.log('\n-- "I\'m in" on a following phone --');
  { P.E(`PR_ST.ctl.go(${yi})`); await until(()=>M.E('WA.ctl.index()')===yi);
    const sec=M.qa('#watchp section')[yi];
    sec.querySelector('button.td-opt[data-k="help"]').click(); sec.querySelector('.td-agebtn').click();
    const nm=sec.querySelector('.td-frow .td-name'); nm.value='Ruth'; nm.dispatchEvent(new M.w.Event('input'));
    P.E(`PR_ST.ctl.go(${yi+1})`); await until(()=>M.E('WA.ctl.presenter()')===yi+1); await sleep(450);
    const flk=(X,i)=>X.txt(`#watchp .td-slide[data-i="${i}"] .td-flk`);
    c('the presenter moves on while a member writes an answer: the phone stays with the answer, locked',
      [M.E('WA.ctl.index()'),M.E('WA.ctl.locked()')], [yi,true]);
    c('…the pill says where he is and offers “Back to live”; the footer no longer says “Following the presenter”',
      [M.q('#watchp .td-pill').hidden,M.txt('#watchp .td-ptx'),M.txt('#watchp .td-pback'),flk(M,yi),M.E('WA.ctl.following()'),M.q('#watchp .td-root').classList.contains('td-away')],
      [false,`You: ${yi+1} · Presenter: ${yi+2}`,'Back to live','',false,true]);
    { const t=await tryMove(M); c('…and still cannot be moved by hand', [t.keys.every(k=>k[0]===yi),t.drag,t.ctl], [true,yi,yi]); }
    M.E('WA.ctl.relayout()'); { const sc=widen(M); sc.dispatchEvent(new M.w.Event('scrollend')); }
    c('…a relayout or a settled row meanwhile (a phone keyboard closing) keeps it there, the pill still up', [M.E('WA.ctl.index()'),M.q('#watchp .td-pill').hidden,M.E('WA.ctl.following()')], [yi,false,false]);
    sec.querySelector('.td-send').click(); await until(()=>sec.querySelector('.td-yesdone'));
    c('the answer goes, privately', [store.keys(`a/${room.room}/`).length,/Thank you, Ruth/.test(sec.textContent)], [1,true]);
    await until(()=>M.E('WA.ctl.index()')===yi+1,2000);
    c('…then the phone goes to the presenter’s slide, following again (no pill, “Following the presenter”)', [M.E('WA.ctl.index()'),M.q('#watchp .td-pill').hidden,flk(M,yi+1),M.E('WA.ctl.following()')], [yi+1,true,'Following the presenter',true]);

    // v10.42.0 fix (the verifier's case): a member taps "Pray" and does not go on (the age question left unanswered)
    const MY=await joinPhone(room.room);
    P.E(`PR_ST.ctl.go(${yi})`); await until(()=>MY.E('WA.ctl.index()')===yi);
    const sy=MY.qa('#watchp section')[yi];
    sy.querySelector('button.td-opt[data-k="pray"]').click();
    c('(a member taps “Pray”: “Are you 18 or older?” shows, and they leave it there)', [sy.querySelector('button.td-opt[data-k="pray"]').getAttribute('aria-pressed'),!sy.querySelector('.td-age').hidden], ['true',true]);
    P.E(`PR_ST.ctl.go(${yi+1})`); await until(()=>MY.E('WA.ctl.presenter()')===yi+1); await sleep(450);
    c('the presenter moves on: the phone waits on the answer, with “Back to live” (never stuck, never “Following the presenter” there)',
      [MY.E('WA.ctl.index()'),MY.E('WA.ctl.locked()'),MY.q('#watchp .td-pill').hidden,MY.txt('#watchp .td-ptx'),flk(MY,yi)], [yi,true,false,`You: ${yi+1} · Presenter: ${yi+2}`,'']);
    { const t=await tryMove(MY); c('…swipes, keys, the wheel and a drag still do nothing', [t.touch[0],t.keys.every(k=>k[0]===yi),t.wheel.every(k=>k[0]===yi),t.drag,t.ctl], [yi,true,true,yi,yi]); }
    P.E('PR_ST.ctl.go(2)'); await until(()=>MY.E('WA.ctl.presenter()')===2); await sleep(100);
    c('he steps back to slide 3: the pill says so', [MY.E('WA.ctl.index()'),MY.txt('#watchp .td-ptx')], [yi,`You: ${yi+1} · Presenter: 3`]);
    click(MY,'#watchp .td-pback');
    c('“Back to live”: on his slide, locked, following, the footer line back', [MY.E('WA.ctl.index()'),MY.E('WA.ctl.locked()'),MY.q('#watchp .td-pill').hidden,flk(MY,2),MY.E('WA.ctl.following()')], [2,true,true,'Following the presenter',true]);
    P.E(`PR_ST.ctl.go(${yi})`); await until(()=>MY.E('WA.ctl.index()')===yi);
    P.E(`PR_ST.ctl.go(${yi+1})`); await until(()=>MY.E('WA.ctl.presenter()')===yi+1); await sleep(450);
    c('…he comes back to “I’m in” and moves on: the answer left untouched no longer holds the phone', [MY.E('WA.ctl.index()'),MY.q('#watchp .td-pill').hidden], [yi+1,true]);
    // a hold that nobody touches lets go by itself after a minute
    P.E(`PR_ST.ctl.go(${yi})`); await until(()=>MY.E('WA.ctl.index()')===yi);
    sy.querySelector('button.td-opt[data-k="help"]').click(); sy.querySelector('.td-agebtn').click();
    P.E(`PR_ST.ctl.go(${yi+1})`); await until(()=>MY.E('WA.ctl.presenter()')===yi+1); await sleep(450);
    c('(touched again — “Help”, “Yes, 18 or older” — the answer holds the phone again)', [MY.E('WA.ctl.index()'),MY.q('#watchp .td-pill').hidden], [yi,false]);
    await sleep(900);
    c('…for as long as the member is at it (under a minute since the last touch)', MY.E('WA.ctl.index()'), yi);
    MY.E('window.__now0=Date.now; Date.now=()=>window.__now0()+61000');
    await until(()=>MY.E('WA.ctl.index()')===yi+1,2000);
    c('…nothing touched for a minute: the phone goes to his slide by itself, following', [MY.E('WA.ctl.index()'),MY.E('WA.ctl.locked()'),MY.q('#watchp .td-pill').hidden,flk(MY,yi+1)], [yi+1,true,true,'Following the presenter']);
    MY.E('Date.now=window.__now0');
    c('(no page errors on that phone)', MY.errs, []);
    shut(MY); }

  console.log('\n-- the Phones sheet; polling, a failed stream, lost contact --');
  { P.E('PR_ST.ctl.go(2)'); await until(()=>M.E('WA.ctl.index()')===2);
    const MP=await joinPhone(room.room,{noES:true,fast:true}); await until(()=>MP.E('WA.mode')==='poll'&&MP.E('WA.ctl.index()')===2);
    c('a phone with no live stream asks the server, follows and is locked', [MP.E('WA.mode'),MP.E('WA.ctl.index()'),MP.E('WA.ctl.locked()')], ['poll',2,true]);
    click(P,'[data-pr-phones]');
    // v10.42 part 3 (the pastor, SPEC-FOCUS A: "No 'members can swipe' choice any more… 'Share link & QR' (no presenter) stays free browsing"): the sheet no
    // longer switches the way mid-presentation (the free way stays tested through a shared link, present-client.test.js)
    c('Phones: the sheet says phones follow, and keeps the PDF switch; no way to choose', [P.txt('[data-pr-sheet] h3'),P.txt('[data-pr-sheet] [data-pr-phline]'),P.qa('[data-pr-sheet] [data-pr-phmode]').length,P.q('[data-pr-sheet] [data-pr-phpdf]').checked], ['On phones','Phones follow your slides until you end.',0,true]);
    c('…and every phone stays locked on his slide', [M.E('WA.ctl.locked()'),MS.E('WA.ctl.locked()'),MP.E('WA.ctl.locked()'),M.E('WA.ctl.index()')], [true,true,true,2]);
    click(P,'[data-pr-shx]');
    // the stream fails: polling keeps the phone in step (and locked)
    const MF=await joinPhone(room.room,{fast:true}); MF.es.fail(2);
    c('a stream Firebase closes → polling, still locked', [MF.E('WA.mode'),MF.E('WA.ctl.locked()')], ['poll',true]);
    P.E('PR_ST.ctl.go(5)'); await until(()=>MF.E('WA.ctl.index()')===5&&MP.E('WA.ctl.index()')===5,3000);
    c('…and in step with the presenter', [MF.E('WA.ctl.index()'),MP.E('WA.ctl.index()'),M.E('WA.ctl.index()')], [5,5,5]);
    // a stream that goes silent (no event, not even a keep-alive, for 75 s) is left for polling
    const MQ=await joinPhone(room.room,{fast:true});
    c('(a fresh phone on the stream)', MQ.E('WA.mode'), 'stream');
    MQ.E('WA.lastEv=Date.now()-80000'); await until(()=>MQ.E('WA.mode')==='poll',2000);
    c('a silent stream (75 s) is dropped for polling while following', [MQ.E('WA.mode'),MQ.E('WA.ctl.locked()'),MQ.E('WA.ctl.index()')], ['poll',true,5]);
    // contact lost: after 20 s with no answer, the member may swipe, and is told why
    stateFail=true; MP.E('WA.failSince=Date.now()-21000'); await until(()=>MP.E('WA.lost'),3000);
    c('no answer for 20 s: unlocked, “No connection. Swipe to move through the slides.”', [MP.E('WA.lost'),MP.E('WA.ctl.locked()'),MP.txt('#watchp .wa-banner')], [true,false,'No connection. Swipe to move through the slides.']);
    stateFail=false; await until(()=>!MP.E('WA.lost'),3000);
    c('…in touch again: locked, on his slide, the line gone', [MP.E('WA.ctl.locked()'),MP.E('WA.ctl.index()'),MP.q('#watchp .wa-banner').hidden], [true,5,true]);
    shut(MQ); shut(MF); shut(MP); }

  console.log('\n-- the last slide: the proposal on phones --');
  { const MO=await joinPhone(room.room,{objUrl:true});
    c('(a phone that has not seen the last slide has no proposal button)', [MO.q('#watchp .wa-banner').hidden,!!MO.q('#watchp .wa-bb')], [true,false]);
    // v10.42 part 3, his answer (Q2): "phones offer 'Download the handout (PDF)' (the full handout)"
    c('(one that saw it, at the close of the “I’m in” part, keeps it)', M.txt('#watchp .wa-bb'), 'Download the handout (PDF)');
    P.E(`PR_ST.ctl.go(${N-1})`); await until(()=>M.q('#watchp .wa-bb'));
    c('the presenter reaches the last slide: “Download the handout (PDF)” on the phone, a clear button', [M.txt('#watchp .wa-bb'),M.q('#watchp .wa-bb').tagName,M.q('#watchp .wa-banner').classList.contains('wa-pdf')], ['Download the handout (PDF)','BUTTON',true]);
    await until(()=>MS.q('#watchp .wa-bb'));
    c('…in Spanish: “Descargar el folleto (PDF)”', MS.txt('#watchp .wa-bb'), 'Descargar el folleto (PDF)');
    await until(()=>MO.q('#watchp a.wa-bb'),6000);
    const a=MO.q('#watchp a.wa-bb');
    c('where the browser can make one, the proposal is made ready: a link to tap (iPhone Safari, Android Chrome, a desktop)',
      // fix after review (v10.42.0 part 3): no handout of his on the server here, so the copy is made on the phone from the
      // slides, and the button says so ("Never label the slide-made copy as the handout without saying so")
      [a&&a.textContent,a&&/^blob:/.test(a.getAttribute('href')),a&&/^Bucks-County-SDA-.*congregation-\d{4}-\d{2}-\d{2}\.pdf$/.test(a.getAttribute('download')),MO.w.__blobs.length,MO.w.__blobs[0]&&MO.w.__blobs[0].type], ['Download the slides (PDF)',true,true,1,'application/pdf']);
    saved.length=0; click(M,'#watchp .wa-bb'); await until(()=>saved.length,6000);
    const f=saved[0]||{doc:{__caseLog:[],getNumberOfPages:()=>0},raw:'',name:''};
    const text=f.doc.__caseLog.map(l=>l.t).join(' ').replace(/\s+/g,' '), low=text.toLowerCase();
    const heads=base.slides.filter(s=>s.type!=='join').map(s=>String(s.headline||s.text||'').replace(/\s+/g,' ').replace(/[.!?:]$/,'').toLowerCase()).filter(Boolean);
    c('a tap where it is not made ahead (jsdom has no object URLs): the proposal is saved all the same', [/\.pdf$/.test(f.name),f.raw.startsWith('%PDF-'),f.doc.getNumberOfPages()], [true,true,2]);
    c('…a proper proposal: the church, the ministry, who it is for, every slide’s headline',
      [text.includes('Bucks County SDA'),low.includes('a real food pantry, on a schedule'),low.includes('for the whole church'),heads.filter(h=>!low.includes(h))], [true,true,true,[]]);
    c('…every verse on the slides, word for word', base.slides.filter(s=>s.verse&&s.verse.text).map(s=>s.verse.ref).filter(r=>!low.includes(r.toLowerCase())), []);
    c('…the QR code back to the slides, and the code', [f.doc.__caseLog.some(l=>l.t===room.code),f.doc.__caseLog.some(l=>/Scan to open the slides/.test(l.t))], [true,true]);
    c('…and nothing from the presenter’s private side: no answer, no member’s name, no key, no control link',
      [/Ruth/.test(text+f.raw),/Ana Lopez/.test(text+f.raw),(text+f.raw).includes(room.key),/#present/.test(text+f.raw)], [false,false,false,false]);
    click(M,'#watchp .td-pback'); // (no pill: a no-op if hidden)
    // his switch for the PDF
    click(P,'[data-pr-phones]'); pick(P,'[data-pr-sheet] [data-pr-phpdf]');
    await until(()=>!M.q('#watchp .wa-bb')&&!MO.q('#watchp .wa-bb'));
    c('“Offer the PDF on phones” unticked: the proposal goes from every phone', [store.peek('r/'+room.room).pdf,RTDB[room.room].pdf,!!M.q('#watchp .wa-bb'),!!MO.q('#watchp .wa-bb'),M.q('#watchp .wa-banner').hidden], [false,false,false,false,true]);
    pick(P,'[data-pr-sheet] [data-pr-phpdf]'); await until(()=>M.q('#watchp .wa-bb')&&MO.q('#watchp a.wa-bb'));
    c('…ticked again: back', [M.txt('#watchp .wa-bb'),!!MO.q('#watchp a.wa-bb')], ['Download the handout (PDF)',true]);
    click(P,'[data-pr-shx]'); shut(MO); }

  console.log('\n-- End: the lock lifts, the proposal stays --');
  { P.q('#casepres .td-bend').click(); P.q('#casepres .td-bend').click();
    await until(()=>M.E('WA.ended')&&MS.E('WA.ended'));
    c('the phones hear the end: unlocked, “The presentation has ended…” with the proposal', [M.E('WA.ctl.locked()'),M.q('#watchp .td-root').classList.contains('td-locked'),/The presentation has ended/.test(M.txt('#watchp .wa-banner')),M.txt('#watchp .wa-bb')],
      [false,false,true,'Download the handout (PDF)']);
    M.w.dispatchEvent(new M.w.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));
    c('members may look back through the slides now (keys move them)', M.E('WA.ctl.index()'), 0);
    M.E('WA.ctl.go(3)'); c('…and so does their own swipe', M.E('WA.ctl.index()'), 3);
    // after the end the Phones sheet keeps the PDF switch only (nothing moves phones any more)
    click(P,'[data-pr-phones]');
    c('after End, the Phones sheet has the PDF switch alone', [P.qa('[data-pr-sheet] [data-pr-phmode]').length,!!P.q('[data-pr-sheet] [data-pr-phpdf]')], [0,true]);
    pick(P,'[data-pr-sheet] [data-pr-phpdf]'); await until(()=>store.peek('r/'+room.room).pdf===false);
    M.E('WA.checkedAt=0'); await M.E('watchCheck()');
    c('…unticked after the end: a phone learns it on its next check (once a minute), the end words stay, the button goes', [/The presentation has ended/.test(M.txt('#watchp .wa-banner')),!!M.q('#watchp .wa-bb')], [true,false]);
    click(P,'[data-pr-shx]');
    c('closing that sheet brings the end card back', [!!P.q('.cp-endcard'),!!P.q('[data-pr-done]')], [true,true]); }

  console.log('\n-- swipe mode, an old room, and phones cannot set the way --');
  { // an old room: opened as an older page opens it (no mode, no pdf): free, the PDF on
    const d=JSON.parse(JSON.stringify(base)); d.slides.forEach(s=>{ if(s.type==='yes') s.respond=false; });
    const o=await (await serve('/.netlify/functions/present',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'open',deck:d})})).json();
    c('(an older page opens a room: no mode sent → free, the PDF on)', [o.ok,o.mode,o.pdf,RTDB[o.room].mode], [true,'free',true,'free']);
    const rec=store.peek('r/'+o.room); delete rec.mode; delete rec.pdf; store.poke('r/'+o.room,rec); delete RTDB[o.room].mode; delete RTDB[o.room].pdf;
    const MO=await joinPhone(o.room);
    c('a room from before v10.42 (no mode kept at all): the phone swipes freely, as before', [MO.E('WA.pmode'),MO.E('WA.ctl.locked()'),MO.E('WA.pdf')], ['free',false,true]);
    MO.E('WA.ctl.go(2)'); c('…its own move works', MO.E('WA.ctl.index()'), 2);
    // a phone tries to set the way: it holds no key
    const bad=await MO.E(`prCall('mode',{room:${JSON.stringify(o.room)},mode:'follow'}).then(()=>'set',e=>e.code)`);
    const bad2=await MO.E(`prCall('mode',{room:${JSON.stringify(o.room)},key:'x'.repeat(43),mode:'follow'}).then(()=>'set',e=>e.code)`);
    c('a phone cannot set the way: no key, or a wrong one, is refused; the room stays free', [bad,bad2,store.peek('r/'+o.room).mode||'free'], ['bad-key','bad-key','free']);
    shut(MO); }

  console.log('\n-- remembered per church; the sample never writes it --');
  { click(P,'[data-pr-done]');
    P.E(`uChurch().casePhones={mode:'free',pdf:false}; uPersist()`);
    click(P,'[data-cs-act="share"]');
    // v10.42 part 3 (the pastor, SPEC-FOCUS A: "No 'members can swipe' choice any more… 'Share link & QR' (no presenter) stays free browsing"): an old "swipe" choice is not read; the PDF off is
    c('a new link starts from his last PDF choice (off); no way to choose', [P.qa('[data-pr-phmode]').length,P.q('[data-pr-phpdf]').checked], [0,false]);
    click(P,'[data-pr-cancel]');
    click(P,'[data-cs-act="sample"]'); await sleep(50);
    click(P,'#casep [data-cs-act="present"]');
    pick(P,'[data-pr-phpdf]');
    sent.length=0; click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
    const so=sent.find(x=>x.op==='open');
    c('the sample presents following, with the PDF chosen for it (on), and writes nothing', [so.body.mode,so.body.pdf,P.J('uChurch().casePhones')], ['follow',true,{mode:'free',pdf:false}]);
    const sr=P.J('Object.values(CASE_ST.sampleRooms)[0]');
    const SM=await joinPhone(sr.room);
    P.E(`PR_ST.ctl.go(${P.J('PR_ST.P.out.slides.length')-1})`); await until(()=>SM.q('#watchp .wa-bb'));
    saved.length=0; click(SM,'#watchp .wa-bb'); await until(()=>saved.length,6000);
    const sf=saved[0]||{name:'',doc:{__caseLog:[]}};
    c('the sample’s proposal on a phone is marked SAMPLE (file name and every page)', [sf.name.startsWith('SAMPLE-'),sf.doc.__caseLog.filter(l=>l.t==='SAMPLE').length>=2], [true,true]);
    shut(SM); click(P,'[data-pr-exit]'); click(P,'#casep [data-cs-back]'); }

  console.log('\n-- a control device, and Spanish --');
  { click(P,'[data-cs-act="present"]');
    c('(the church’s last PDF choice: off)', [P.qa('[data-pr-phmode]').length,P.q('[data-pr-phpdf]').checked], [0,false]);
    pick(P,'[data-pr-phpdf]');
    click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
    const r2=P.J(`uChurch().caseRooms['food-pantry|congregation|congregation|en']`);
    c('a new room after the end: follow, the PDF on, as chosen now', [r2.room!==room.room,r2.mode,r2.pdf,store.peek('r/'+r2.room).mode], [true,'follow',true,'follow']);
    const CT=page(`https://pastorshub.org/#present=${r2.room}.${r2.key}`); await until(()=>CT.q('#casepres .td-m-present'));
    click(CT,'[data-pr-phones]');
    c('the private control link’s Phones sheet says the room’s way and its PDF switch', [CT.txt('[data-pr-sheet] [data-pr-phline]'),CT.q('[data-pr-sheet] [data-pr-phpdf]').checked], ['Phones follow your slides until you end.',true]);
    pick(CT,'[data-pr-sheet] [data-pr-phpdf]'); await until(()=>store.peek('r/'+r2.room).pdf===false);
    c('…changes the PDF switch with the key, and writes nothing to that device', [store.peek('r/'+r2.room).pdf,store.peek('r/'+r2.room).mode,Object.keys(CT.w.localStorage).filter(k=>!/^terrain-watch-p$/.test(k))], [false,'follow',[]]);
    CT.w.close();
    const S=page('https://pastorshub.org/',{lang:'es',reg:REG}); await sleep(1200);
    setup(S,{ministry:'food-pantry',type:'congregation',group:'congregation'});
    click(S,'[data-cs-act="present"]');
    c('the setup in Spanish', [S.txt('.cp-phones > span'),S.qa('.cp-phones .cp-check b').map(b=>b.textContent),S.txt('[data-pr-phline]')],
      ['En los teléfonos',['Ofrecer el PDF en los teléfonos'],'Los teléfonos siguen sus diapositivas hasta que usted termine.']);
    click(S,'[data-pr-start]'); await until(()=>S.q('#casepres .td-root'));
    c('…and the Phones button', [S.txt('[data-pr-phones]'),S.q('[data-pr-phones]').getAttribute('aria-label')], ['Teléfonos','Teléfonos: Los teléfonos siguen sus diapositivas hasta que usted termine.']);
    click(S,'[data-pr-phones]');
    c('…its sheet', [S.txt('[data-pr-sheet] h3'),S.qa('[data-pr-sheet] .cp-check b').map(b=>b.textContent).length], ['En los teléfonos',1]);
    S.w.close(); }

  c('no page errors on the pastor’s page or the phones', [P.errs,M.errs,MS.errs].flat(), []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
