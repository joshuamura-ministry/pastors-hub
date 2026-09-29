// Make the Case, presenting and following (v10.39.0): the page's side of
// netlify/functions/present.mjs, end to end in jsdom. Two pages share the real
// function (an in-memory Blobs store) and a stand-in for Firebase: every PATCH
// the function sends reaches the phones' EventSource stubs as a stream event,
// exactly as Firebase's REST stream would relay it.
// Checked: the #watch / #present addresses; a member page skips the gate and
// writes no church; the presenter's setup (warm-up, keep days, "I'm in"),
// op open with the registration token, the presenter view with the join slide's
// QR code and code; the send queue (only the latest slide, one at a time); the
// follow / browse state machine on a phone (late joiner, Back to live, a newer
// deck); the fallback to op state polling (10 s without a stream, a closed
// stream; 3 s then 6 s); the deck cached for offline; "I'm in" with the age
// question (under 18 sends nothing; adults send minor:false; the server's
// refusal in words); the answers panel (private, delete, add to ask list);
// End (phones hear it, the member's ended banner) and Remove now; the sample
// (one day, nothing written); Spanish. jsdom does no layout: Chrome checks the look.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const {createHmac}=require('crypto');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,500));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=4000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(15); } return false; }

// ---- the function, with an in-memory store and a stand-in Firebase ----------------------
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
const RTDB={};                       // live/<room> as Firebase would hold it
const STREAMS=new Set();             // every EventSource stub on every page
let fbDown=false;
const fbCalls=[];
function relay(room,type,data){ for(const es of STREAMS) if(es.url===`${FB}/live/${room}.json`&&es.readyState===1) es.emit(type,{path:'/',data}); }

(async()=>{ try{
  delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.TERRAIN_REG_SECRET;
  process.env.PRESENT_FB_URL=FB; process.env.PRESENT_FB_SECRET='fb-test-secret';
  process.env.SITE_URL='https://pastorshub.org';
  const store=makeStore(); globalThis.__terrainPresentStore=store;
  globalThis.fetch=async(u,o={})=>{
    u=String(u); const m=/^https:\/\/terrain-live-default-rtdb\.firebaseio\.com\/(?:live\/([A-Za-z0-9_-]{22})|)\.json/.exec(u);
    if(!m) throw new Error('no network in tests: '+u);
    fbCalls.push({u,method:o.method||'GET',body:o.body?JSON.parse(o.body):undefined});
    if(fbDown) return {ok:false,status:500,json:async()=>null};
    const room=m[1];
    if(!room) return {ok:true,status:200,json:async()=>({live:true})};         // status: the key check
    const now=Date.now(), fix=v=>{ const o2={...v}; for(const k in o2) if(o2[k]&&o2[k]['.sv']==='timestamp') o2[k]=now; return o2; };
    if(o.method==='PATCH'){ const b=fix(JSON.parse(o.body)); RTDB[room]={...(RTDB[room]||{}),...b}; setTimeout(()=>relay(room,'patch',b),0); }
    else if(o.method==='DELETE'){ delete RTDB[room]; setTimeout(()=>relay(room,'put',null),0); }
    return {ok:true,status:200,json:async()=>RTDB[room]===undefined?null:RTDB[room]};
  };
  const handler=(await import(path.resolve(__dirname,'..','netlify','functions','present.mjs'))).default;
  const sent=[];     // every request any page made to the function
  const serve=async(u,o={})=>{
    const url=new URL(u,'https://pastorshub.org/');
    const body=o.body?JSON.parse(o.body):null;
    sent.push({op:body?body.op:url.searchParams.get('op'),method:o.method||'GET',body,headers:o.headers||{},q:Object.fromEntries(url.searchParams)});
    const r=await handler(new Request(url.href,{method:o.method||'GET',headers:o.headers||{},body:o.body}),{ip:'203.0.113.5'});
    const text=await r.text();
    return {ok:r.ok,status:r.status,json:async()=>JSON.parse(text)};
  };

  // ---- pages ---------------------------------------------------------------------------------
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
  function page(url,{lang,store:ls,fast,noES,reg}={}){
    const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
    const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
        if(lang) w.localStorage.setItem('terrain-lang',lang);
        if(reg) w.localStorage.setItem('terrain-reg',JSON.stringify(reg));
        if(ls) Object.entries(ls).forEach(([k,v])=>w.localStorage.setItem(k,v));
        // qrcode-generator stands in for the SRI-pinned script (no network here)
        w.qrcode=(t,ec)=>{ let data=''; return {addData(s){ data=s; },make(){},getModuleCount:()=>25,isDark:(r,c2)=>((r*7+c2*3+data.length)%5)<2}; };
        if(!noES) w.EventSource=FakeES;
        if(fast){ const st=w.setTimeout.bind(w); w.setTimeout=(f,ms,...a)=>st(f,(ms||0)>=1000?Math.round(ms/100):ms,...a); }
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
  function setup(P,prefs){
    P.E(`(()=>{ const D=${JSON.stringify(FX.DATA)};
      D.M.tract.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.tract.moe)); D.M.county.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.county.moe));
      DATA=D; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)});
      const mk=b=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=b.includes(g.id)?4:1; }); return gfScores(a); };
      uChurch().members=[{id:'m0',name:'Ana Lopez',gifts:mk(['teach','shep','helps']),heart:{children:2},confirmed:true,willing:true,hours:6,skills:['kids'],source:'manual'}];
      uChurch().proposalPrefs=${JSON.stringify(prefs)};
      uPersist(); openTool('case'); render(); })()`);
  }

  console.log('-- the addresses --');
  { const P=page('https://pastorshub.org/'); await sleep(900);
    const ROOM='AbCdEfGhIjKlMnOpQrStUv', KEY='k'.repeat(43);
    const cases=[['',{on:false}],['#watch',{on:true,mode:'join'}],['#watch~es',{on:true,mode:'join',lang:'es'}],
      ['#watch=K7M2QX',{on:true,mode:'code',code:'K7M2QX'}],['#watch=k7m2qx~es',{on:true,mode:'code',code:'K7M2QX',lang:'es'}],
      ['#watch='+ROOM,{on:true,mode:'room',room:ROOM}],['#watch='+ROOM+'~en',{on:true,mode:'room',room:ROOM,lang:'en'}],
      ['#watch=K0M2QX',{on:true,mode:'join'}],['#watch=abc',{on:false}],['#watch='+ROOM+'x',{on:false}],
      ['#present='+ROOM+'.'+KEY,{on:true,mode:'control',room:ROOM,key:KEY}],['#present='+ROOM,{on:false}],['#gifts=abc',{on:false}],['#a=10%20Greene',{on:false}]];
    for(const [h,want] of cases){ const got=P.J(`watchParse(${JSON.stringify(h)})`);
      c('watchParse '+JSON.stringify(h), Object.keys(want).every(k=>got[k]===want[k]), true); }
    c('a code with 0, O, 1, I or L is not a code (the server never makes one)', P.J(`watchParse('#watch=ABCDE1').mode`), 'join');
    c('no boot errors on the pastor’s page', P.errs, []);
  }

  console.log('\n-- the pastor presents --');
  const P=page('https://pastorshub.org/',{reg:REG}); await sleep(1200);
  setup(P,{ministry:'pathfinders',type:'congregation',group:'congregation'});
  const base=P.J('caseCurrentDeck()');
  // The builder's preview is built as the setup starts it: answers on (v10.39 review E2E-12).
  c('(the congregation deck has a yes slide, answers on in the builder’s preview, as presented)', base.slides.filter(s=>s.type==='yes').map(s=>s.respond), [true]);
  sent.length=0;
  click(P,'[data-cs-act="present"]');
  c('Present live opens the setup, over the page', [P.q('#casepres').hidden,P.D.documentElement.classList.contains('cp-lock')], [false,true]);
  await until(()=>sent.some(x=>x.op==='status'));
  c('…and warms the function with op status (GET)', sent.filter(x=>x.op==='status').map(x=>x.method), ['GET']);
  c('keep the slides for 1, 7 or 30 days; 7 chosen', [P.qa('[data-pr-days]').map(b=>b.textContent),P.q('[data-pr-days][aria-pressed="true"]').dataset.prDays], [['1 day','7 days','30 days'],'7']);
  c('“I’m in” offered for the congregation, on, adults only', [P.q('[data-pr-respond]').checked,/18 or older/.test(P.txt('.cp-check'))], [true,true]);
  c('who can see it, until when, and that no name is on them', /Anyone with this link can see these slides until \d+ \w+ \d{4}\. Names never appear on the slides\./.test(P.txt('[data-pr-warn]')), true);
  click(P,'[data-pr-days="30"]');
  c('30 days changes the date said', P.txt('[data-pr-warn]').includes(P.E(`caseDate(new Date(Date.now()+30*864e5),true)`)), true);
  click(P,'[data-pr-days="7"]');
  click(P,'[data-pr-start]');
  await until(()=>P.q('#casepres .td-root'));
  const open=sent.find(x=>x.op==='open');
  c('op open: keepDays 7, the pastor’s deck with answers switched on (yes slide and closing line)', [open.body.keepDays,open.body.deck.slides.find(s=>s.type==='yes').respond,
    open.body.deck.slides.find(s=>s.type==='close').text], [7,true,P.E(`caseF(CASE_COPY.respond.text,caseModel('pathfinders',{type:'congregation',group:'congregation'}).vals)`)]);
  c('…with the access code header, as the gifts tool sends it', 'x-terrain-code' in open.headers, true);
  const room=P.J(`uChurch().caseRooms['pathfinders|congregation|congregation|en']`);
  c('the room is kept per church on this device: room, key, code, link, expiry', [/^[A-Za-z0-9_-]{22}$/.test(room.room),/^[A-Za-z0-9_-]{43}$/.test(room.key),/^[A-Z2-9]{6}$/.test(room.code),room.url,room.keepDays,room.respond],
    [true,true,true,'https://pastorshub.org/#watch='+room.room,7,true]);
  c('…and never in the address', [P.w.location.hash.includes(room.room),P.w.location.hash.includes(room.key)], [false,false]);
  c('the presenter view: slides in present mode, the join slide first', [P.qa('#casepres .td-m-present').length,P.q('#casepres .td-slide').classList.contains('td-t-join')], [1,true]);
  c('…with a large QR code, the six-letter code and the short link', [!!P.q('#casepres .td-t-join .td-qrtile svg rect'),P.txt('#casepres .td-t-join .td-code'),/pastorshub\.org/.test(P.txt('#casepres .td-t-join .td-codelab'))], [true,room.code,true]);
  c('…the bar: Live · 1 of 8 · End', [P.txt('#casepres .td-blive'),P.txt('#casepres .td-bpos'),P.txt('#casepres .td-bend')], ['Live','1 of '+base.slides.length,'End']);
  c('…the strip above: Exit, the code, Answers, Link', [P.txt('[data-pr-exit]'),P.txt('.cp-code b'),!!P.q('[data-pr-answers]'),P.txt('[data-pr-link]')], ['← Exit',room.code,true,'Link']);
  await until(()=>sent.some(x=>x.op==='go'));
  c('slide 0 goes out at once: the pointer says on, at 0', [sent.filter(x=>x.op==='go').map(x=>x.body.i),RTDB[room.room].on,RTDB[room.room].i], [[0],true,0]);
  c('op go carries the key but never the registration token', sent.filter(x=>x.op==='go').every(x=>x.body.key===room.key&&!('x-terrain-reg' in x.headers)), true);
  await until(()=>P.txt('#casepres .td-bopen'));
  c('the bar counts the phones that opened the slides', P.txt('#casepres .td-bopen'), '0 opened');

  console.log('\n-- the send queue --');
  { const got=[]; let release=[];
    P.w.__post=i=>new Promise(r=>{ got.push(i); release.push(r); });
    P.E(`window.__q=prSender(i=>window.__post(i))`);
    P.E('__q.send(0)'); for(const i of [1,2,3,4]) P.E(`__q.send(${i})`);
    c('six quick changes: 0 goes, the rest wait for it', got, [0]);
    release.shift()(); await sleep(5);
    c('…then only the latest (4)', got, [0,4]);
    P.E('__q.send(5)'); release.shift()(); await sleep(5);
    c('…then 5: [0, 4, 5], one request at a time (R-sync)', got, [0,4,5]);
    release.shift()(); await sleep(5);
    P.E('__q.send(5)'); await sleep(5);
    c('the slide already sent is not sent again', got, [0,4,5]);
    const errs=[]; P.w.__post2=i=>Promise.reject(Object.assign(new Error('ended'),{code:'ended'}));
    P.E(`window.__q2=prSender(i=>window.__post2(i),{onError:e=>window.__e2=(window.__e2||0)+1})`); P.E('__q2.send(1)'); await sleep(5); P.E('__q2.send(2)'); await sleep(5);
    c('an ended room stops the queue (no retry, no more sends)', [P.E('window.__e2'),P.E('__q2.dead')], [1,true]);
    const lf=[]; P.w.__post3=i=>{ lf.push(i); return Promise.reject(Object.assign(new Error('live-failed'),{code:'live-failed'})); };
    P.E(`window.__q3=prSender(i=>window.__post3(i))`); P.E('__q3.send(2)'); await sleep(30);
    c('Firebase failing (live-failed) is not asked again and again; the next slide tries it', [lf,P.E('__q3.dead')], [[2],false]);
    P.E('__q3.send(3)'); await sleep(10);
    c('…the next slide goes', lf, [2,3]); }

  console.log('\n-- a member follows --');
  // real timers here: the stream's first put arrives well inside its 10 s
  const M=page('https://pastorshub.org/#watch='+room.room);
  await until(()=>M.q('#watchp .td-root')&&FakeES.all.some(e=>e.url===`${FB}/live/${room.room}.json`));
  c('the member page: no gate, no hub, no registration; the slides cover the page', [M.q('#watchp').hidden,M.q('#gate').hidden,M.q('#hub').hidden,!!M.q('#watchp .td-m-follow')], [false,true,true,true]);
  c('op deck with the phone’s own id, counted once', [sent.filter(x=>x.op==='deck'&&x.q.room===room.room).length>=1,/^[A-Za-z0-9_-]{16}$/.test(sent.filter(x=>x.op==='deck').pop().q.p)], [true,true]);
  const es=FakeES.all.find(e=>e.url===`${FB}/live/${room.room}.json`);
  c('the phone listens to the address the server gave (no key in it)', [!!es,es&&es.url], [true,`${FB}/live/${room.room}.json`]);
  es.open(); es.emit('put',{path:'/',data:RTDB[room.room]});
  await sleep(20);
  c('late joiner: the first put lands on the presenter’s slide, by the stream', [M.J('WA.ctl.index()'),M.E('WA.mode')], [0,'stream']);
  // the pastor moves on: go → the function → Firebase → the stream → the phone
  P.E(`PR_ST.ctl.go(3)`); await until(()=>M.E('WA.ctl.index()')===3);
  c('the pastor moves to slide 4 and the phone follows', [M.J('WA.ctl.index()'),M.J('WA.ctl.following()'),RTDB[room.room].i], [3,true,3]);
  c('…the Live mark shows on the phone', M.q('#watchp .td-root').classList.contains('td-on'), true);
  await until(()=>P.txt('#casepres .td-bopen')==='1 opened');
  c('…and the presenter’s bar counts the phone', P.txt('#casepres .td-bopen'), '1 opened');
  M.E('WA.ctl.go(1)'); await sleep(5);
  c('the member swipes back: browsing, with the pill "You: 2 · Presenter: 4"', [M.J('WA.ctl.following()'),M.q('#watchp .td-pill').hidden,M.txt('#watchp .td-ptx')], [false,false,'You: 2 · Presenter: 4']);
  P.E(`PR_ST.ctl.go(4)`); await until(()=>M.E('WA.ctl.presenter()')===4);
  c('…the presenter moves on, the member stays where they are', [M.J('WA.ctl.index()'),M.txt('#watchp .td-ptx')], [1,'You: 2 · Presenter: 5']);
  click(M,'#watchp .td-pback');
  c('Back to live: on the presenter’s slide, following again', [M.J('WA.ctl.index()'),M.J('WA.ctl.following()'),M.q('#watchp .td-pill').hidden], [4,true,true]);
  es.emit('keep-alive',null); es.emit('patch',{path:'/',data:{at:Date.now()}});
  c('keep-alive and a patch without i change nothing', M.J('WA.ctl.index()'), 4);
  es.emit('put',{path:'/i',data:2});
  c('a put on /i sets the slide', M.J('WA.ctl.index()'), 2);
  c('the deck is cached for offline, with its expiry', (()=>{ const j=JSON.parse(M.w.localStorage.getItem('terrain-watch-'+room.room)); return [j.v,j.deck.slides.length,j.expires===room.expires]; })(), [1,base.slides.length,true]);
  c('a member’s phone writes no church, no registration, only the slides and its own id',
    Object.keys(M.w.localStorage).filter(k=>!/^terrain-watch-/.test(k)).sort(), []);
  c('no boot errors on the member’s page', M.errs, []);

  console.log('\n-- the words change while live --');
  { P.E(`(()=>{ const d=caseCurrentDeck(); })()`);
    // the pastor edits a headline and presents again: op update, v 2, phones fetch the deck again
    click(P,'[data-pr-exit]');
    c('Exit leaves the room open, and the builder says so', [P.q('#casepres').hidden,/Live link open until .* code [A-Z2-9]{6}/.test(P.txt('#cs-room'))], [true,true]);
    P.E(`caseEditSet('motion:0','headline','A new headline for the plan','x'); uPersist(); caseRedeck(CASE_ST.pv)`);
    sent.length=0; click(P,'[data-cs-act="present"]');
    c('presenting again reuses the link (the setup says which)', /already have a live link, code [A-Z2-9]{6}/.test(P.txt('#casepres .cp-box')), true);
    click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
    await until(()=>M.E('WA.ctl.index()')===4);
    c('presenting again within the hour carries on from the slide he left, and the phone is there', [P.J('PR_ST.ctl.index()'),M.J('WA.ctl.index()')], [4,4]);
    c('…op update with the new words, not a new room', [sent.filter(x=>x.op==='open').length,sent.filter(x=>x.op==='update').length,
      sent.find(x=>x.op==='update').body.deck.slides.find(s=>s.type==='motion').headline], [0,1,'A new headline for the plan']);
    es.emit('patch',{path:'/',data:{v:2}});
    await until(()=>M.E('WA.v')===2);
    c('the phone hears v 2, fetches the deck again, and stays on its slide', [M.E('WA.v'),M.txt('#watchp .td-t-motion .td-head'),M.J('WA.ctl.index()'),M.E('WA.mode')], [2,'A new headline for the plan',4,'stream']); }

  console.log('\n-- "I\'m in" on a phone --');
  { const yi=base.slides.findIndex(s=>s.type==='yes');
    P.E(`PR_ST.ctl.go(${yi})`); await until(()=>M.E('WA.ctl.index()')===yi);
    const sec=M.qa('#watchp section')[yi];
    c('the yes slide is a form on the phone (answers on)', [sec.querySelectorAll('button.td-opt').length,!!sec.querySelector('.td-age')], [3,true]);
    c('…and not on the presenter’s screen', [P.qa('#casepres section')[yi].querySelectorAll('button.td-opt').length,/answer on their own phones/.test(P.qa('#casepres section')[yi].textContent)], [0,true]);
    sec.querySelector('button.td-opt[data-k="help"]').click(); sec.querySelector('.td-agebtn:last-child').click();
    await sleep(20);
    c('under 18: a kind word, and nothing is sent', [/for adults/.test(sec.textContent),sent.filter(x=>x.op==='respond').length,store.keys(`a/${room.room}/`).length], [true,0,0]); }
  { // a second phone, an adult
    const M2=page('https://pastorshub.org/#watch='+room.room,{fast:true}); await until(()=>M2.q('#watchp .td-root'));
    const yi=base.slides.findIndex(s=>s.type==='yes'); const sec=M2.qa('#watchp section')[yi];
    sec.querySelector('button.td-opt[data-k="lead"]').click(); sec.querySelector('.td-agebtn').click();
    const nm=sec.querySelector('.td-frow .td-name'); nm.value='12'; nm.dispatchEvent(new M2.w.Event('input')); sec.querySelector('.td-send').click();
    await until(()=>/first name, in letters/.test(sec.textContent));
    c('a name the server refuses: it says why', /Please write just your first name, in letters\./.test(sec.textContent), true);
    nm.value='Ruth'; nm.dispatchEvent(new M2.w.Event('input'));
    sec.querySelector('.td-addnote').click(); const note=sec.querySelector('.td-note'); note.value='Tuesdays work best';
    sec.querySelector('.td-send').click(); await until(()=>sec.querySelector('.td-yesdone'));
    const r=sent.filter(x=>x.op==='respond').pop();
    c('an adult: op respond with lead, the first name, the note and minor:false', [r.body.k,r.body.name,r.body.note,r.body.minor], ['lead','Ruth','Tuesdays work best',false]);
    c('…thanked, privately', /Thank you, Ruth\. Only the pastor sees this\./.test(sec.textContent), true);
    c('…kept only on the server, for the presenter', store.keys(`a/${room.room}/`).length, 1);
    c('no name ever reaches the deck', JSON.stringify(store.peek('d/'+room.room)).includes('Ruth'), false);
    M2.w.close(); }

  console.log('\n-- the answers, for the pastor alone --');
  { click(P,'[data-pr-answers]'); await until(()=>P.q('[data-pr-ashow]'));
    // The presenter's screen may be projected (v10.39 review S1/V2): counts first, names on a tap.
    c('on the presenter’s screen the answers sheet shows the counts and the projector warning, no name', [P.txt('.cp-counts'),/may be on the projector/.test(P.txt('[data-pr-sheet]')),/Ruth|Tuesdays/.test(P.txt('#casepres'))], ['1 lead · 0 help · 0 pray',true,false]);
    click(P,'[data-pr-ashow]'); await until(()=>P.q('.cp-alist li'));
    c('the sheet lists each answer: kind, first name, note', [P.qa('.cp-alist li').length,P.txt('.cp-alist .cp-ak'),P.txt('.cp-alist .cp-an b'),P.txt('.cp-alist .cp-an small')], [1,'Lead','Ruth','Tuesdays work best']);
    c('…with counts, "Private", and how long the server keeps them', [P.txt('.cp-counts'),P.txt('.cp-ah .cp-priv'),/Kept with the slides until \d+ \w+ \d{4}, then deleted\./.test(P.txt('[data-pr-sheet]'))], ['1 lead · 0 help · 0 pray','Private',true]);
    await until(()=>P.txt('[data-pr-n]')==='1');
    c('the Answers button carries the count', P.txt('[data-pr-n]'), '1');
    click(P,'[data-pr-add]');
    c('Add to ask list keeps the name on this device, for this ministry', [P.J(`caseYesList('pathfinders').map(a=>[a.k,a.name,a.note])`),P.txt('.cp-alist .cp-added')], [[['lead','Ruth','Tuesdays work best']],'On your ask list']);
    click(P,'[data-pr-shx]');
    click(P,'[data-pr-exit]');
    click(P,'[data-cs-act="ask"]');
    c('the private ask list shows them ("Said “I’m in” on their phones")', [/Said “I’m in” on their phones/.test(P.txt('#cs-ask')),/Ruth/.test(P.txt('#cs-ask'))], [true,true]);
    click(P,'#cs-ask [data-pr-ydel]');
    c('…and Remove takes one off', [P.J(`caseYesList('pathfinders')`),/Ruth/.test(P.txt('#cs-ask'))], [[],false]);
    click(P,'[data-cs-act="ask"]');
    c('closing the ask list takes the names off the page', /Ruth/.test(P.D.body.textContent), false);
    click(P,'[data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
    click(P,'[data-pr-answers]'); await until(()=>P.q('[data-pr-ashow]')); click(P,'[data-pr-ashow]'); await until(()=>P.q('.cp-alist li [data-pr-del]'));
    click(P,'.cp-alist [data-pr-del]'); await until(()=>/No answers yet/.test(P.txt('[data-pr-alist]')||''));
    c('Delete removes the answer from the server (op drop)', [sent.some(x=>x.op==='drop'),store.keys(`a/${room.room}/`).length], [true,0]);
    click(P,'[data-pr-shx]'); }

  console.log('\n-- the link --');
  { click(P,'[data-pr-link]'); await until(()=>P.q('.cp-qr svg'));
    c('the link sheet: QR code, code, link, open until', [!!P.q('.cp-qr svg'),P.txt('.cp-codebig b'),P.txt('.cp-url'),/Open until/.test(P.txt('.cp-lk'))], [true,room.code,'pastorshub.org/#watch='+room.room,true]);
    c('control from another device: folded, with the warning, the link held back', [P.q('.cp-control').open,/Anyone with this private link can move your slides/.test(P.txt('.cp-control'))], [false,true]);
    let copied=null; P.w.navigator.clipboard={writeText:async t=>{ copied=t; }};
    click(P,'[data-pr-ccopy]'); await sleep(5);
    c('…Copy private link: #present=<room>.<key> on the room’s own site', copied, `https://pastorshub.org/#present=${room.room}.${room.key}`);
    click(P,'[data-pr-copy]'); await sleep(5);
    c('Copy link: the members’ link', copied, room.url);
    click(P,'[data-pr-shx]');
    // the private link, opened on his other device
    const CT=page(`https://pastorshub.org/#present=${room.room}.${room.key}`); await until(()=>CT.q('#casepres .td-m-present'));
    c('#present=<room>.<key> opens the presenter view on another device, with no gate', [!!CT.q('#casepres .td-m-present'),CT.q('#gate').hidden,CT.txt('.cp-code b')], [true,true,room.code]);
    c('…and the key leaves the address bar at once', [CT.w.location.hash,CT.w.location.href.includes(room.key)], ['#present',false]);
    const n0=sent.filter(x=>x.op==='go').length; CT.E('PR_ST.ctl.go(2)'); await until(()=>sent.filter(x=>x.op==='go').length>n0);
    c('…it moves the slides with the key it was given', (({op,room:rm,key,i})=>({op,room:rm,key,i}))(sent.filter(x=>x.op==='go').pop().body), {op:'go',room:room.room,key:room.key,i:2});
    c('…and writes nothing to that device: no church, no key', Object.keys(CT.w.localStorage).filter(k=>!/^terrain-watch-p$/.test(k)).sort(), []);
    click(CT,'[data-pr-exit]');
    c('Exit there says the control is closed and the link stays open', /Presenter control is closed on this device/.test(CT.txt('#watchp')), true);
    CT.w.close();
    P.E(`PR_ST.ctl.go(4)`); await sleep(20); }

  console.log('\n-- falling back to asking the server --');
  { const n0=sent.filter(x=>x.op==='state').length;
    const M3=page('https://pastorshub.org/#watch='+room.room,{fast:true}); await until(()=>M3.q('#watchp .td-root'));
    c('(the first phone is still on its stream, asking nothing)', [M.E('WA.mode'),sent.filter(x=>x.op==='state').length], ['stream',n0]);
    // the stream never opens: after 10 s (0.1 s here) the phone asks op state
    await until(()=>sent.filter(x=>x.op==='state').length>n0+1,3000);
    c('no stream event within 10 s → op state, again and again', [M3.E('WA.mode'),sent.filter(x=>x.op==='state').length-n0>=2], ['poll',true]);
    await until(()=>M3.E('WA.ctl.index()')===P.E('PR_ST.ctl.index()'));
    c('…and follows the presenter that way', M3.J('WA.ctl.index()'), P.J('PR_ST.ctl.index()'));
    c('3 s, then 6 s after ten minutes', [M3.E('watchPollDelay(0)'),M3.E('watchPollDelay(9*60*1000)'),M3.E('watchPollDelay(10*60*1000+1)')], [3000,3000,6000]);
    M3.w.close();
    const M4=page('https://pastorshub.org/#watch='+room.room,{fast:true}); await until(()=>M4.q('#watchp .td-root'));
    const e4=FakeES.all.filter(e=>e.url.includes(room.room)).pop(); e4.fail(2);
    c('a stream Firebase closes (readyState 2) → op state at once', M4.E('WA.mode'), 'poll');
    M4.w.close();
    const M5=page('https://pastorshub.org/#watch='+room.room,{fast:true,noES:true}); await until(()=>M5.q('#watchp .td-root'));
    await sleep(20);
    c('a browser without EventSource asks op state', M5.E('WA.mode'), 'poll');
    M5.w.close(); }

  console.log('\n-- End --');
  { P.q('#casepres .td-bend').click();
    c('End asks twice', P.txt('#casepres .td-bend'), 'Tap again to end');
    P.q('#casepres .td-bend').click();
    await until(()=>P.q('.cp-endcard'));
    c('op end; the presenter sees "Presentation ended" and until when', [sent.some(x=>x.op==='end'),/Presentation ended/.test(P.txt('.cp-endcard')),/until \d+ \w+ \d{4}/.test(P.txt('.cp-endcard'))], [true,true,true]);
    c('…the pointer says end', [RTDB[room.room].end,RTDB[room.room].on], [true,false]);
    await until(()=>M.q('#watchp .wa-banner:not([hidden])'));
    c('the member: "The presentation has ended. The slides stay here until …" and the PDF', [/The presentation has ended\. The slides stay here until \d+ \w+ \d{4}\./.test(M.txt('#watchp .wa-banner')),M.txt('#watchp .wa-bb')],
      [true,'Download the handout (PDF)']);
    c('…the slides stay, no longer following', [!!M.q('#watchp .td-ended'),M.J('WA.ctl.following()')], [true,false]);
    c('…and the ended state is cached with them', !!JSON.parse(M.w.localStorage.getItem('terrain-watch-'+room.room)).ended, true);
    c('the stored room remembers it ended', !!P.J(`uChurch().caseRooms['pathfinders|congregation|congregation|en'].ended`), true);
    const rm=P.q('.cp-endcard [data-pr-remove]'); rm.click();
    c('Remove now asks twice, saying what it does', P.txt('.cp-endcard [data-pr-remove]'), 'Tap again: remove from every phone');
    // After End the phones no longer listen, so the promise is the later one (v10.39 review E2E-3/S8).
    rm.click(); await until(()=>/removed from Terrain/.test(P.txt('#casepres')||''));
    c('Remove now after End says phones clear the slides on their next check', /A phone that still has them open clears them within a minute/.test(P.txt('#casepres')), true);
    c('op remove: everything the room held is gone, the room forgotten here', [store.keys().filter(k=>k.includes(room.room)&&!k.startsWith('x/')).length,P.J(`uChurch().caseRooms['pathfinders|congregation|congregation|en']||null`)], [0,null]);
    click(P,'[data-pr-done]');
    c('Back to Make the Case: the overlay closes, the live line goes', [P.q('#casepres').hidden,P.q('#cs-room').hidden], [true,true]);
    const M6=page('https://pastorshub.org/#watch='+room.room,{fast:true}); await until(()=>/no longer active/.test(M6.txt('#watchp')||''));
    c('a phone opening a removed room: "This link is no longer active." and a way to another code', [M6.txt('#watchp h1'),!!M6.q('[data-wa-again]')], ['This link is no longer active.',true]);
    c('…and its cached slides are removed', M6.w.localStorage.getItem('terrain-watch-'+room.room), null);
    M6.w.close(); }

  console.log('\n-- joining with a code --');
  { click(P,'[data-cs-act="share"]');
    c('Share link & QR: the same setup, "Make the link"', P.txt('[data-pr-start]'), 'Make the link');
    click(P,'[data-pr-start]'); await until(()=>P.q('.cp-sharecard .cp-codebig b'));
    const r2=P.J(`uChurch().caseRooms['pathfinders|congregation|congregation|en']`);
    c('…a new room (the old one was removed), shown with its QR code and code', [r2.room!==room.room,P.txt('.cp-codebig b')], [true,r2.code]);
    const J=page('https://pastorshub.org/#watch',{fast:true}); await until(()=>J.q('[data-wa-code]'));
    c('#watch alone: "Join a presentation", one box for the code', [J.txt('#watchp h1'),!!J.q('[data-wa-code]')], ['Join a presentation',true]);
    J.q('[data-wa-code]').value='zz'; J.q('[data-wa-form]').dispatchEvent(new J.w.Event('submit',{cancelable:true}));
    c('a code that cannot be one is caught on the phone', J.txt('[data-wa-msg]'), 'A code has six letters and numbers, like the one on the screen.');
    J.q('[data-wa-code]').value='ABCDEF'; J.q('[data-wa-form]').dispatchEvent(new J.w.Event('submit',{cancelable:true}));
    await until(()=>/No presentation found/.test(J.txt('[data-wa-msg]')||''));
    c('a code nobody holds: "No presentation found with that code."', J.txt('[data-wa-msg]'), 'No presentation found with that code.');
    J.q('[data-wa-code]').value=r2.code.slice(0,3).toLowerCase()+'-'+r2.code.slice(3); J.q('[data-wa-form]').dispatchEvent(new J.w.Event('submit',{cancelable:true}));
    await until(()=>J.q('#watchp .td-root'));
    c('the right code (any case, a dash is fine) opens the slides, and the address becomes the room', [!!J.q('#watchp .td-m-follow'),J.w.location.hash], [true,'#watch='+r2.room]);
    J.w.close();
    const F=page('https://pastorshub.org/'); await sleep(900);
    c('the page footer offers "Join a presentation" (#watch)', [F.txt('#joinlink'),F.q('#joinlink').getAttribute('href')], ['Join a presentation','#watch']);
    F.E(`openGate('register')`);       // (the access check never answers in this harness)
    c('…and so does the first page a member lands on at pastorshub.org (before any registration)', [F.q('#gate').hidden,F.txt('#gatejoin'),F.q('#gatejoin').getAttribute('href')], [false,'Here to follow a presentation? Enter its code','#watch']);
    F.w.close();
    click(P,'[data-pr-cancel]'); }

  console.log('\n-- the sample: one day, nothing written --');
  { const before=JSON.stringify(Object.entries(P.w.localStorage).sort());
    click(P,'[data-cs-act="sample"]'); await sleep(50);
    sent.length=0;
    click(P,'#casep [data-cs-act="present"]');
    c('the setup is marked SAMPLE and says the link closes after a day; no days to choose', [P.txt('#casepres .cp-k .gfsamptag'),/closes after one day/.test(P.txt('#casepres')),P.qa('[data-pr-days]').length], ['SAMPLE',true,0]);
    click(P,'[data-pr-start]'); await until(()=>P.q('#casepres .td-root'));
    const o=sent.find(x=>x.op==='open');
    c('op open for the sample: keepDays 1, every slide marked SAMPLE', [o.body.keepDays,o.body.deck.title.startsWith('SAMPLE · ')], [1,true]);
    c('the presenter strip says SAMPLE too', P.txt('.cp-code .gfsamptag'), 'SAMPLE');
    c('the sample wrote nothing to the device (its room is in memory only)', JSON.stringify(Object.entries(P.w.localStorage).sort()), before);
    c('…and it can be followed like any deck', (await (async()=>{ const S=page('https://pastorshub.org/#watch='+P.J('Object.values(CASE_ST.sampleRooms)[0].room'),{fast:true}); await until(()=>S.q('#watchp .td-root')); const t=S.qa('#watchp .td-slide').every(x=>/SAMPLE/.test(x.textContent)); S.w.close(); return t; })()), true);
    click(P,'[data-pr-exit]'); click(P,'#casep [data-cs-back]'); }

  console.log('\n-- registration, as the gifts tool sends it --');
  { const SECRET='reg-secret-0123456789-abcdefghijklmnop';
    const t=Math.floor(Date.now()/1000).toString(36), id='AbCdEfGhIjKl';
    const tok=`r1.${id}.${t}.`+createHmac('sha256',SECRET).update(`terrain-reg|r1|${id}|${t}`,'utf8').digest('base64url').slice(0,32);
    process.env.TERRAIN_REG_SECRET=SECRET;
    const R=page('https://pastorshub.org/',{reg:{...REG,tok,id,synced:true}}); await sleep(1200);
    setup(R,{ministry:'food-pantry',type:'board',group:'board'});
    sent.length=0; click(R,'[data-cs-act="share"]'); click(R,'[data-pr-start]'); await until(()=>R.q('.cp-codebig b'));
    const o=sent.find(x=>x.op==='open');
    c('with registration required, op open sends the device’s token (x-terrain-reg) and gets a room', [o.headers['x-terrain-reg'],!!R.txt('.cp-codebig b')], [tok,true]);
    c('a board deck has no yes slide: no “I’m in” switch was offered', o.body.deck.slides.some(s=>s.type==='yes'), false);
    const N=page('https://pastorshub.org/',{reg:REG}); await sleep(1200);
    setup(N,{ministry:'food-pantry',type:'board',group:'board'});
    click(N,'[data-cs-act="present"]'); click(N,'[data-pr-start]'); await until(()=>N.txt('[data-pr-msg]'));
    c('no token: the setup says so plainly and stays open', [N.txt('[data-pr-msg]'),N.txt('[data-pr-start]')], ['Terrain could not confirm your registration just now. Please try again in a few minutes.','Start presenting']);
    delete process.env.TERRAIN_REG_SECRET; R.w.close(); N.w.close(); }

  console.log('\n-- in Spanish --');
  { const S=page('https://pastorshub.org/',{lang:'es',reg:REG}); await sleep(1200);
    setup(S,{ministry:'pathfinders',type:'team',group:'youth'});
    click(S,'[data-cs-act="present"]');
    c('the setup in Spanish; a youth team takes no answers', [S.txt('#casepres .cp-k'),S.txt('[data-pr-start]'),/quedan desactivadas para los grupos de jóvenes/.test(S.txt('#casepres')),!!S.q('[data-pr-respond]'),S.qa('[data-pr-days]').map(b=>b.textContent)],
      ['Presentar en vivo','Empezar a presentar',true,false,['1 día','7 días','30 días']]);
    c('…and who can see it', /Cualquier persona con este enlace podrá ver estas diapositivas hasta el \d+ \w+ \d{4}\. Los nombres nunca aparecen/.test(S.txt('[data-pr-warn]')), true);
    click(S,'[data-pr-start]'); await until(()=>S.q('#casepres .td-root'));
    const sp=S.J(`uChurch().caseRooms['pathfinders|team|youth|es']`);
    c('the presenter view in Spanish: En vivo, Terminar, Salir, Enlace; the link opens in Spanish', [S.txt('#casepres .td-blive'),S.txt('#casepres .td-bend'),S.txt('[data-pr-exit]'),S.txt('[data-pr-link]'),sp.url.endsWith('~es'),sp.respond],
      ['En vivo','Terminar','← Salir','Enlace',true,false]);
    const SM=page(sp.url,{fast:true}); await until(()=>SM.q('#watchp .td-root'));
    c('a phone with no language chosen opens the Spanish link in Spanish', [SM.E('LANG'),SM.q('#watchp .td-root').lang], ['es','es']);
    SM.w.close();
    const J=page('https://pastorshub.org/#watch~es',{fast:true}); await until(()=>J.q('[data-wa-code]'));
    c('“Join a presentation” in Spanish', [J.txt('#watchp h1'),J.txt('.wa-sub'),J.txt('.wa-go')], ['Unirse a una presentación','Escriba el código de seis letras que aparece en la pantalla.','Abrir']);
    J.w.close();
    const F=page('https://pastorshub.org/',{lang:'es'}); await sleep(900); F.E(`openGate('register')`);
    c('the footer link in Spanish, and the first page’s', [F.txt('#joinlink'),F.txt('#gatejoin')], ['Unirse a una presentación','¿Viene a seguir una presentación? Escriba su código']);
    F.w.close(); S.w.close(); }

  { // Clear all clears the "I'm in" names kept for the ask list
    P.E(`caseYesAdd('pathfinders',{id:'x.1',k:'help',name:'Zed',note:'',ts:1})`);
    c('(a name kept for the ask list)', P.J(`caseYesList('pathfinders').length`), 1);
    P.E(`(()=>{ const ch=uChurch(); ch.capacity={}; })()`);
    const src=P.E(`capClearAll.toString()`);
    c('Clear all empties caseYes with the rest of the church’s Make the Case words', /ch\.caseYes=\{\}/.test(src), true); }
  c('no errors on the pastor’s page', P.errs, []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
