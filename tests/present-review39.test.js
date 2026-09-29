// Presenting and following, the v10.39 review round, end to end in jsdom with the real
// netlify/functions/present.mjs (an in-memory store) and a stand-in for Firebase, as in
// present-client.test.js:
//  S1/E2E-1/V2  after End, and in the Answers sheet, the presenter's screen (which may be
//               projected) shows counts only until "Show names"; a phone opened with the
//               private control link is the pastor's own and shows them at once.
//  S3           Delete all (one op drop) and Stop answers (op update, respond off).
//  S5           the sample's answers are deleted when its screen closes; the words say so.
//  E2E-3 / S8   Remove now after End reaches a phone that saw the end (it checks when the
//               member comes back, and once a minute while on screen); the words promise that.
//  E2E-6        live follow not set up: a phone still learns the end (and gets the PDF button).
//  E2E-4        a second start (a reload, the control link) opens on the live slide, sends no go(0).
//  E2E-9        the setup says what is wrong with live follow (a refused key, no answer).
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,500));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=4000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(15); } return false; }

function makeStore(){
  const m=new Map();
  return { m,
    async get(k){ const v=m.get(k); return v===undefined?null:JSON.parse(v); },
    async setJSON(k,val,o={}){ if(o.onlyIfNew&&m.has(k)) return {modified:false}; m.set(k,JSON.stringify(val)); return {modified:true}; },
    async delete(k){ m.delete(k); },
    async list({prefix=''}={}){ return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}; },
    keys(p=''){ return [...m.keys()].filter(k=>k.startsWith(p)); }, peek(k){ const v=m.get(k); return v?JSON.parse(v):null; } };
}
const FB='https://terrain-live-default-rtdb.firebaseio.com';
const RTDB={}; const STREAMS=new Set(); let fbStatus=200;
function relay(room,type,data){ for(const es of STREAMS) if(es.url===`${FB}/live/${room}.json`&&es.readyState===1) es.emit(type,{path:'/',data}); }
const fbOn=()=>{ process.env.PRESENT_FB_URL=FB; process.env.PRESENT_FB_SECRET='fb-test-secret'; };
const fbOff=()=>{ delete process.env.PRESENT_FB_URL; delete process.env.PRESENT_FB_SECRET; };

(async()=>{ try{
  delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.TERRAIN_REG_SECRET;
  process.env.SITE_URL='https://pastorshub.org'; fbOn();
  const store=makeStore(); globalThis.__terrainPresentStore=store;
  globalThis.fetch=async(u,o={})=>{
    u=String(u); const m=/^https:\/\/terrain-live-default-rtdb\.firebaseio\.com\/(?:live\/([A-Za-z0-9_-]{22})|)\.json/.exec(u);
    if(!m) throw new Error('no network in tests: '+u);
    const room=m[1];
    if(fbStatus!==200) return {ok:false,status:fbStatus,json:async()=>null};      // Firebase refusing or down: every call
    if(!room) return {ok:true,status:200,json:async()=>({live:true})};
    const now=Date.now(), fix=v=>{ const o2={...v}; for(const k in o2) if(o2[k]&&o2[k]['.sv']==='timestamp') o2[k]=now; return o2; };
    if(o.method==='PATCH'){ const b=fix(JSON.parse(o.body)); RTDB[room]={...(RTDB[room]||{}),...b}; setTimeout(()=>relay(room,'patch',b),0); }
    else if(o.method==='DELETE'){ delete RTDB[room]; setTimeout(()=>relay(room,'put',null),0); }
    return {ok:true,status:200,json:async()=>RTDB[room]===undefined?null:RTDB[room]};
  };
  const handler=(await import(path.resolve(__dirname,'..','netlify','functions','present.mjs'))).default;
  const sent=[];
  let PAGE_N=0;
  const serve=async(u,o={},who)=>{
    const url=new URL(u,'https://pastorshub.org/');
    const body=o.body?JSON.parse(o.body):null;
    sent.push({who,op:body?body.op:url.searchParams.get('op'),method:o.method||'GET',body,q:Object.fromEntries(url.searchParams),cache:o.cache});
    const r=await handler(new Request(url.href,{method:o.method||'GET',headers:o.headers||{},body:o.body}),{ip:'203.0.113.5'});
    const text=await r.text();
    return {ok:r.ok,status:r.status,json:async()=>JSON.parse(text)};
  };
  class FakeES{
    constructor(url){ this.url=String(url); this.readyState=0; this.l={}; this.onerror=null; STREAMS.add(this); FakeES.all.push(this); setTimeout(()=>{ if(this.readyState===0){ this.readyState=1; this.emit('put',{path:'/',data:RTDB[this.url.match(/live\/(.+)\.json/)[1]]||null}); } },5); }
    addEventListener(t,f){ (this.l[t]=this.l[t]||[]).push(f); }
    emit(t,msg){ (this.l[t]||[]).forEach(f=>{ try{ f({data:msg===undefined?'null':JSON.stringify(msg)}); }catch(e){ /* a closed page */ } }); }
    close(){ this.readyState=2; STREAMS.delete(this); }
  }
  FakeES.all=[];
  const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Allegheny East',role:'pastor'};
  function page(url,{lang,fast,ls,reg}={}){
    const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
    const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
        if(lang) w.localStorage.setItem('terrain-lang',lang);
        if(reg) w.localStorage.setItem('terrain-reg',JSON.stringify(reg));
        if(ls) Object.entries(ls).forEach(([k,v])=>w.localStorage.setItem(k,v));
        w.qrcode=(t,ec)=>{ let data=''; return {addData(s){ data=s; },make(){},getModuleCount:()=>25,isDark:(r,c2)=>((r*7+c2*3+data.length)%5)<2}; };
        w.EventSource=FakeES;
        if(fast){ const st=w.setTimeout.bind(w), si=w.setInterval.bind(w);
          w.setTimeout=(f,ms,...a)=>st(f,(ms||0)>=1000?Math.round(ms/100):ms,...a);
          w.setInterval=(f,ms,...a)=>si(f,(ms||0)>=1000?Math.round(ms/100):ms,...a); }
        w.fetch=async(u,o={})=>{ u=String(u);
          if(/functions\/present/.test(u)) return serve(u,o,w.__who);
          if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})};
          if(/functions\/register/.test(u)) return {ok:false,status:500,json:async()=>({})};
          return new Promise(()=>{}); }; }});
    const w=dom.window; w.__who=(++PAGE_N)+':'+url.slice(22,40);
    return {w,D:w.document,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,
      q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
      txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
  }
  const click=(P,s)=>{ const e=P.q(s); if(!e) throw new Error('no element '+s); e.click(); };
  const visible=(M,hidden)=>{ Object.defineProperty(M.D,'hidden',{configurable:true,get:()=>!!hidden}); M.D.dispatchEvent(new M.w.Event('visibilitychange')); };
  function setup(P,prefs){
    P.E(`(()=>{ const D=${JSON.stringify(FX.DATA)};
      D.M.tract.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.tract.moe)); D.M.county.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.county.moe));
      DATA=D; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)});
      uChurch().proposalPrefs=${JSON.stringify(prefs)}; uPersist(); openTool('case'); render(); })()`);
  }
  const answer=async(room,k,name,note)=>{ const M=page('https://pastorshub.org/#watch='+room); await until(()=>M.q('#watchp .td-root'));
    await M.E(`watchRespond({k:'${k}',name:'${name}',note:${JSON.stringify(note||'')}})`); M.E('watchStopLive()'); M.w.close(); };

  console.log('-- S1: after End, names wait for a deliberate tap --');
  const P=page('https://pastorshub.org/',{reg:REG}); await sleep(1200);
  setup(P,{ministry:'pathfinders',type:'congregation',group:'congregation'});
  click(P,'[data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
  const room=P.J(`uChurch().caseRooms['pathfinders|congregation|congregation|en']`);
  await answer(room.room,'help','Maria','I can help, but please keep it quiet: my husband lost his job');
  await answer(room.room,'pray','Esther','Please pray; my son is in rehab');
  c('(two answers on the server)', store.keys(`a/${room.room}/`).length, 2);
  P.q('#casepres .td-bend').click(); P.q('#casepres .td-bend').click();
  await until(()=>P.q('.cp-endcard .cp-counts'));
  const endTxt=P.txt('#casepres');
  c('the ended card on the presenter’s screen: counts and the projector line, no name, no note', [/0 lead · 1 help · 1 pray/.test(endTxt),/may be on the projector/.test(endTxt),/Maria|Esther|husband|rehab/.test(endTxt),!!P.q('[data-pr-ashow]')], [true,true,false,true]);
  c('…no Delete all and no per-answer buttons before the reveal', [P.q('[data-pr-adelall]').hidden,P.qa('[data-pr-del]').length], [true,0]);
  click(P,'[data-pr-ashow]'); await until(()=>P.q('.cp-alist li'));
  c('"Show names", tapped on purpose: the list, with notes', [P.qa('.cp-alist li').length,/Maria/.test(P.txt('#casepres')),/my son is in rehab/.test(P.txt('#casepres'))], [2,true,true]);
  { const CT=page(`https://pastorshub.org/#present=${room.room}.${room.key}`); await until(()=>CT.q('#casepres .cp-card, #casepres .td-root'));
    await until(()=>CT.q('[data-pr-ansbody] .cp-alist li, [data-pr-ansbody] [data-pr-ashow]'));
    c('the private control link (his own phone) shows the names at once', [!!CT.q('[data-pr-ansbody] .cp-alist li'),!!CT.q('[data-pr-ansbody] [data-pr-ashow]')], [true,false]);
    CT.w.close(); }

  console.log('\n-- S3: Delete all, Stop answers --');
  { const da=P.q('[data-pr-adelall]');
    c('Delete all is offered once the names are shown', da.hidden, false);
    da.click(); c('…asks twice', P.txt('[data-pr-adelall]'), 'Tap again: delete every answer');
    const n0=sent.filter(x=>x.op==='drop').length; da.click();
    await until(()=>/No answers yet/.test(P.txt('[data-pr-alist]')||''));
    const drops=sent.filter(x=>x.op==='drop').slice(n0);
    c('…one op drop with every id; the server holds none', [drops.length,drops[0]&&drops[0].body.ids.length,store.keys(`a/${room.room}/`).length], [1,2,0]); }
  { const st=P.q('[data-pr-astop]');
    c('Stop answers is offered while answers are on', st.hidden, false);
    st.click(); st.click();
    await until(()=>/Answers are off for these slides/.test(P.txt('[data-pr-amsg]')||''));
    const up=sent.filter(x=>x.op==='update').pop();
    c('…op update with the yes slide off; the room takes no more', [up.body.deck.slides.find(s=>s.type==='yes').respond,store.peek('r/'+room.room).respond,P.J(`uChurch().caseRooms['pathfinders|congregation|congregation|en'].respond`)], [false,false,false]);
    const M=page('https://pastorshub.org/#watch='+room.room); await until(()=>M.q('#watchp .td-root'));
    let err=null; try{ await M.E(`watchRespond({k:'pray',name:'Late'})`); }catch(e){ err=e.message; }
    c('…a member who answers now is told plainly (respond-off), nothing kept', [err,store.keys(`a/${room.room}/`).length], ['respond-off',0]);
    c('…and the phone’s yes slide offers no form', M.qa('#watchp .td-t-yes .td-form').length, 0);
    M.w.close(); }
  click(P,'[data-pr-done]');

  console.log('\n-- E2E-3 / S8: Remove now after End reaches a phone that saw the end --');
  { store.m.clear(); P.E('uChurch().caseRooms={}; uPersist();');
    setup(P,{ministry:'food-pantry',type:'congregation',group:'congregation'});
    click(P,'[data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
    const r=P.J(`uChurch().caseRooms['food-pantry|congregation|congregation|en']`);
    const M=page('https://pastorshub.org/#watch='+r.room,{fast:true}); await until(()=>M.q('#watchp .td-root')&&M.E('WA.mode')==='stream');
    P.q('#casepres .td-bend').click(); P.q('#casepres .td-bend').click();
    await until(()=>M.q('#watchp .wa-banner:not([hidden])'));
    c('(the phone saw the end, and closed its stream)', [!!M.E('WA.ended'),M.E('WA.mode'),!!M.w.localStorage.getItem('terrain-watch-'+r.room)], [true,'idle',true]);
    const rm=P.q('.cp-endcard [data-pr-remove]'); rm.click(); rm.click();
    await until(()=>/removed from Terrain/.test(P.txt('#casepres')||''));
    c('the pastor is told the truth: gone from Terrain, and phones clear on their next check', /A phone that still has them open clears them within a minute, or when it is next opened\./.test(P.txt('#casepres')), true);
    visible(M,true); await sleep(30); visible(M,false);
    await until(()=>/no longer active/.test(M.txt('#watchp')||''),3000);
    c('the member comes back to the page: op state, 404, the slides and the saved copy go', [/This link is no longer active/.test(M.txt('#watchp')),M.w.localStorage.getItem('terrain-watch-'+r.room)], [true,null]);
    M.w.close(); click(P,'[data-pr-done]'); }
  { // …and without coming back: the minute's check while the page is on screen
    setup(P,{ministry:'food-pantry',type:'board',group:'board'});
    click(P,'[data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
    const r=P.J(`uChurch().caseRooms['food-pantry|board|board|en']`);
    const M=page('https://pastorshub.org/#watch='+r.room,{fast:true}); await until(()=>M.q('#watchp .td-root')&&M.E('WA.mode')==='stream');
    P.q('#casepres .td-bend').click(); P.q('#casepres .td-bend').click(); await until(()=>M.E('!!WA.ended'));
    const n0=sent.filter(x=>x.op==='state'&&x.q.room===r.room).length;
    const rm=P.q('.cp-endcard [data-pr-remove]'); rm.click(); rm.click(); await until(()=>/removed from Terrain/.test(P.txt('#casepres')||''));
    await until(()=>/no longer active/.test(M.txt('#watchp')||''),3000);
    c('a phone left open on the ended slides clears them within the minute (one op state, here 0.6 s)', [/This link is no longer active/.test(M.txt('#watchp')||''),sent.filter(x=>x.op==='state'&&x.q.room===r.room).length-n0>=1], [true,true]);
    c('…asked with the browser’s ordinary cache (Netlify’s edge may answer it)', sent.filter(x=>x.op==='state').every(x=>x.cache==='default'), true);
    M.w.close(); click(P,'[data-pr-done]'); }

  console.log('\n-- E2E-6: live follow not set up --');
  { fbOff(); store.m.clear(); P.E('uChurch().caseRooms={}; uPersist();');
    setup(P,{ministry:'pathfinders',type:'board',group:'board'});
    click(P,'[data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
    const r=P.J(`uChurch().caseRooms['pathfinders|board|board|en']`);
    const M=page('https://pastorshub.org/#watch='+r.room,{fast:true}); await until(()=>M.q('#watchp .td-root'));
    c('(no Firebase: the phone has no stream)', [M.E('WA.live'),M.E('WA.mode')], [null,'idle']);
    P.q('#casepres .td-bend').click(); P.q('#casepres .td-bend').click(); await until(()=>P.q('.cp-endcard'));
    await until(()=>M.q('#watchp .wa-banner:not([hidden])'),3000);
    c('the phone learns the end on its own within the minute, with the handout button', [/The presentation has ended/.test(M.txt('#watchp .wa-banner')||''),M.txt('#watchp .wa-bb')], [true,'Download the handout (PDF)']);
    const rm=P.q('.cp-endcard [data-pr-remove]'); rm.click(); rm.click();
    await until(()=>/removed from Terrain/.test(P.txt('#casepres')||''));
    c('Remove now without live follow: the honest words', /removed from Terrain/.test(P.txt('#casepres')), true);
    await until(()=>/no longer active/.test(M.txt('#watchp')||''),3000);
    c('…and the phone clears the slides on its next check', /This link is no longer active/.test(M.txt('#watchp')||''), true);
    M.w.close(); click(P,'[data-pr-done]'); fbOn(); }
  { // a phone hidden the whole time asks nothing until it is looked at
    store.m.clear(); P.E('uChurch().caseRooms={}; uPersist();'); fbOff();
    setup(P,{ministry:'pathfinders',type:'board',group:'board'});
    click(P,'[data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
    const r=P.J(`uChurch().caseRooms['pathfinders|board|board|en']`);
    const M=page('https://pastorshub.org/#watch='+r.room,{fast:true}); await until(()=>M.q('#watchp .td-root'));
    visible(M,true); const n0=sent.filter(x=>x.op==='state').length; await sleep(1500);
    c('a phone in a pocket (page hidden) asks nothing', sent.filter(x=>x.op==='state').length, n0);
    M.w.close(); click(P,'[data-pr-exit]'); fbOn(); }

  console.log('\n-- E2E-4: a second start opens where the phones are --');
  { store.m.clear(); P.E('uChurch().caseRooms={}; uPersist();');
    setup(P,{ministry:'pathfinders',type:'board',group:'board'});
    click(P,'[data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
    const r=P.J(`uChurch().caseRooms['pathfinders|board|board|en']`);
    P.E('PR_ST.ctl.go(5)'); await until(()=>RTDB[r.room]&&RTDB[r.room].i===5);
    // the laptop page crashes: nothing saved but what the go already kept
    P.E(`prStop(); $('casepres').hidden=true; $('casepres').replaceChildren(); PR_ST.P=null; PR_ST.view=null; const x=uChurch().caseRooms['pathfinders|board|board|en']; delete x.at; delete x.atT; uPersist();`);
    const g0=sent.length;
    click(P,'[data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
    await sleep(120);
    c('Present live again: the presenter opens on slide 6 (the live pointer), never back to 1', [P.E('PR_ST.ctl.index()'),sent.slice(g0).filter(x=>x.op==='go').map(x=>x.body.i).includes(0),RTDB[r.room].i], [5,false,5]);
    P.E('PR_ST.ctl.go(3)'); await until(()=>RTDB[r.room].i===3); await sleep(20);
    const g1=sent.length;
    const CT=page(`https://pastorshub.org/#present=${r.room}.${r.key}`); await until(()=>CT.q('#casepres .td-root')); await sleep(120);
    c('the private control link on a tablet opens on the live slide too, and moves no phone', [CT.E('PR_ST.ctl.index()'),sent.slice(g1).filter(x=>x.op==='go').map(x=>x.body.i).every(i=>i===3),RTDB[r.room].i], [3,true,3]);
    CT.w.close();
    c('each slide change is kept on the room for a reload (at, atT)', P.J(`(()=>{ const x=uChurch().caseRooms['pathfinders|board|board|en']; return [x.at,typeof x.atT]; })()`), [3,'number']);
    click(P,'[data-pr-exit]'); }

  console.log('\n-- S5: the sample’s answers go when its screen closes --');
  { store.m.clear(); P.E('uChurch().caseRooms={}; uPersist();');
    P.E(`CASE_ST.sampleType='congregation'; CASE_ST.sampleTypeSet=true;`);   // the Sabbath deck: it has the yes slide
    click(P,'[data-cs-act="sample"]'); await sleep(50);
    click(P,'#casep [data-cs-act="present"]');
    c('the setup’s words: never on the ask list, deleted on close, within two days in any case', /Answers to the sample never go on your ask list\. They are deleted when you close this screen, and in any case within two days\./.test(P.txt('#casepres')), true);
    click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
    const sr=P.J('Object.values(CASE_ST.sampleRooms)[0]');
    await answer(sr.room,'lead','Visitor','my phone is 555-0100');
    c('(a visitor answered the sample)', store.keys(`a/${sr.room}/`).length, 1);
    click(P,'[data-pr-exit]');
    await until(()=>store.keys(`a/${sr.room}/`).length===0);
    c('Exit: the sample’s answers are deleted from the server', store.keys(`a/${sr.room}/`).length, 0);
    click(P,'#casep [data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
    await answer(sr.room,'pray','Guest','');
    click(P,'[data-pr-exit]'); click(P,'#casep [data-cs-back]');
    await until(()=>store.keys(`a/${sr.room}/`).length===0);
    c('…and closing the sample deletes any that came after', store.keys(`a/${sr.room}/`).length, 0); }

  console.log('\n-- E2E-9: the setup says what is wrong with live follow --');
  { process.env.PRESENT_FB_SECRET='fb-refused-secret'; fbStatus=401;
    const Q=page('https://pastorshub.org/',{reg:REG}); await sleep(1200);
    setup(Q,{ministry:'pathfinders',type:'board',group:'board'});
    click(Q,'[data-cs-act="present"]'); await until(()=>Q.q('[data-pr-live]:not([hidden])'));
    c('a key Firebase refuses: "Firebase refused the key…", not "not set up yet"', [/Firebase refused the key/.test(Q.txt('[data-pr-live]')),/not set up yet/.test(Q.txt('[data-pr-live]'))], [true,false]);
    Q.w.close();
    process.env.PRESENT_FB_SECRET='fb-down-secret'; fbStatus=503;
    const Q2=page('https://pastorshub.org/',{lang:'es',reg:REG}); await sleep(1200);
    setup(Q2,{ministry:'pathfinders',type:'board',group:'board'});
    click(Q2,'[data-cs-act="present"]'); await until(()=>Q2.q('[data-pr-live]:not([hidden])'));
    c('Firebase not answering (ES): "no respondió en este momento"', /El seguimiento en vivo no respondió en este momento/.test(Q2.txt('[data-pr-live]')), true);
    click(Q2,'[data-pr-start]'); await until(()=>Q2.q('#casepres .td-root'));
    c('…and the bar starts at "No en vivo" rather than claiming "En vivo"', Q2.txt('#casepres .td-blive'), 'No en vivo');
    Q2.w.close(); fbStatus=200; fbOn(); }

  c('no errors on the pastor’s page', P.errs, []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
