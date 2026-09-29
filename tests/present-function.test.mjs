// Exercise present.mjs 1.0 and present-sweep.mjs against an in-memory store
// and a stubbed Firebase REST API. No real storage, no network.
// v10.39 integration (updated in the repo): TERRAIN_REQUIRE_CODE reads 1, true,
// yes or on as census and gifts do (it was '1' only); op open asks for the
// registration token while TERRAIN_REG_SECRET is set; status checks the key
// with Firebase (fb: ok | bad-key | unreachable | unset) and says regRequired;
// a service-account key file works in place of the database secret; and a
// church-school deck, like the youth ones, never takes answers.
delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.SITE_URL; delete process.env.TERRAIN_REG_SECRET;
delete process.env.PRESENT_FB_URL; delete process.env.PRESENT_FB_SECRET;
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',String(JSON.stringify(g)).slice(0,300));fail++}else pass++};

// ---- a fake Netlify Blobs store (the subset the function uses) -------------
const tick=()=>new Promise(r=>setImmediate(r));
function makeStore({etags=false}={}){
  const m=new Map(); let n=0;
  const s={ m, gets:0,
    async get(k){ s.gets++; await tick(); const v=m.get(k); return v===undefined?null:JSON.parse(v.data); },
    async setJSON(k,val,o={}){ await tick(); const cur=m.get(k);
      if(o.onlyIfNew&&cur) return {modified:false};
      if(o.onlyIfMatch&&(!cur||cur.etag!==o.onlyIfMatch)) return {modified:false};
      const etag='e'+(++n); m.set(k,{data:JSON.stringify(val),etag}); return {modified:true,etag}; },
    async delete(k){ await tick(); m.delete(k); },
    async list({prefix=''}={}){ await tick(); return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key,etag:m.get(key).etag}))}; },
    peek(k){ const v=m.get(k); return v?JSON.parse(v.data):null; },
    poke(k,val){ m.set(k,{data:JSON.stringify(val),etag:'e'+(++n)}); },
    keys(prefix=''){ return [...m.keys()].filter(k=>k.startsWith(prefix)); }
  };
  if(etags) s.getWithMetadata=async(k)=>{ s.gets++; await tick(); const v=m.get(k); return v?{data:JSON.parse(v.data),etag:v.etag,metadata:{}}:null; };
  return s;
}
let S=makeStore(); globalThis.__terrainPresentStore=S;

// ---- a stubbed Firebase REST API --------------------------------------------
const FB='https://terrain-live-default-rtdb.firebaseio.com';
const FBS='fb-secret/TEST+0123456789abcdefXYZ';
const fbOn=()=>{ process.env.PRESENT_FB_URL=FB; process.env.PRESENT_FB_SECRET=FBS; };
const fbOff=()=>{ delete process.env.PRESENT_FB_URL; delete process.env.PRESENT_FB_SECRET; };
let calls=[], allCalls=[], fbOk=true, fbData=null, fbFailOnce=false, fbCode=null, google=null;
globalThis.fetch=async(url,opts={})=>{
  if(google&&String(url)==='https://oauth2.googleapis.com/token') return google(String(url),opts);
  const one={url:String(url),method:opts.method||'GET',redirect:opts.redirect,body:opts.body===undefined?undefined:JSON.parse(opts.body)}; calls.push(one); allCalls.push(one);
  if(fbCode) return {ok:false,status:fbCode,json:async()=>({error:'Permission denied'})};
  let ok=fbOk; if(fbFailOnce){ ok=false; fbFailOnce=false; }
  return {ok,status:ok?200:500,json:async()=>fbData};
};
const fbUrl=(room,quiet=true)=>`${FB}/live/${room}.json?auth=${encodeURIComponent(FBS)}${quiet?'&print=silent':''}`;
const last=()=>calls[calls.length-1];

const mod=await import(new URL('../netlify/functions/present.mjs', import.meta.url).href);
const fn=mod.default;

// Every call goes through here: logs are captured (and must never carry a
// secret), every response must be JSON and no-store, every body is kept so the
// leak checks at the end can read all of them.
const logs=[], bodies=[], answerBodies=[]; let badHeaders=0, depth=0;
const REAL={log:console.log,error:console.error,warn:console.warn,info:console.info};
const cap=(...a)=>logs.push(a.map(String).join(' '));
async function call(req,ctx={},isAnswers=false){
  if(depth++===0) console.log=console.error=console.warn=console.info=cap;
  let res; try{ res=await fn(req,ctx); } finally{ if(--depth===0) Object.assign(console,REAL); }
  if(res.headers.get('cache-control')!=='no-store, max-age=0'||!/json/.test(res.headers.get('content-type')||'')||res.headers.get('x-content-type-options')!=='nosniff') badHeaders++;
  const text=await res.text(); (isAnswers?answerBodies:bodies).push(text);
  return {status:res.status,j:JSON.parse(text)};
}
const URL0='https://x.test/.netlify/functions/present';
const post=(body,headers={},ctx={},url=URL0)=>call(new Request(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)}),ctx,typeof body==='object'&&body&&body.op==='answers');
const get=(q,ctx={})=>call(new Request(URL0+(q?'?'+q:''),{method:'GET'}),ctx);
const utcDay=t=>new Date(t).toISOString().slice(0,10);
const clone=v=>JSON.parse(JSON.stringify(v));
const sortKeys=v=>Array.isArray(v)?v.map(sortKeys):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sortKeys(v[k])])):v);
const canon=v=>JSON.stringify(sortKeys(v));
const CODE_RE=/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
const otherKey='B'.repeat(43), noRoom='Q'.repeat(22);

// ---- decks -----------------------------------------------------------------
const SL={
  join:{type:'join',qrUrl:'https://evil.example/phish',code6:'ZZZZZZ',note:'Scan to follow these slides on your phone'},
  motion:{type:'motion',kicker:'The motion',headline:'Approve a six-week trial of a Pathfinder & Adventurer club, open to the neighborhood',rows:[['Runs','7 Oct – 18 Nov'],['Places',16]],by:'To the church board'},
  stat:{type:'stat',kicker:'Our neighbours',headline:'About 1 in 4 children here live in poverty',value:27,unit:'%',hue:'children',freq:'about 1 in 4',count:'about 1,490 children',dots:{n:100,on:27,hue:'children'},compare:{here:27.1,county:18.2,label:'Bucks County',sig:true,moe:3.4},source:'ACS 2023 5-year, B17020'},
  trio:{type:'trio',kicker:'Around us',headline:'Three things we learned',items:[{value:12,label:'Rent-burdened',hue:'housing'},{value:'1 in 3',label:'Born outside the U.S.',hue:'people'},{value:0.5,label:'Limited-English households',hue:'language'}],source:'ACS 2023'},
  capacity:{type:'capacity',kicker:'Can we?',headline:'What we can field against what it needs',rows:[{label:'Volunteers',need:5,have:7,unit:'people'},{label:'Hours',need:50,have:null,unit:'hours'}],gaps:['A second driver'],source:'Church profile'},
  ability:{type:'ability',kicker:'Ability',headline:'What God has already put in this room',value:9,label:'members show Teaching',gifts:['Teaching','Helps'],lead:'one member is ready',source:'Spiritual Gifts results from 23 members · counts only, no names'},
  ask:{type:'ask',kicker:'The ask',headline:'Exactly what we are asking the board for',rows:[['People','1 coordinator · 4 helpers'],['Snacks, 6 weeks',40]],verse:{text:'For which of you, intending to build a tower, sitteth not down first, and counteth the cost…',ref:'Luke 14:28'}},
  risks:{type:'risks',kicker:'Risks',headline:'The questions you would ask, already answered',items:['Two adults in every room, door open','Every adult volunteer screened'],source:'Church Manual 2022'},
  timeline:{type:'timeline',kicker:'First step',headline:'Six weeks, then an honest review',steps:[{date:'7 Oct',title:'Start',text:'First club night.'},{date:'28 Oct',title:'Midpoint',text:'Attendance against plan.'},{date:'18 Nov',title:'Board review',text:'Continue, change or stop.'}],quote:{text:'Nehemiah asked the people directly…',ref:'Prophets and Kings, p. 638'}},
  roles:{type:'roles',kicker:'Roles',headline:'What each role asks',roles:[{title:'Coordinator',hours:'2 a week',text:'Runs the evening.'},{title:'Helper',hours:1.5,text:'Leads one table.'}]},
  yes:{type:'yes',kicker:'Decision',headline:'Three sizes of yes',options:[{k:'lead',label:'Lead',text:'Take a piece.'},{k:'help',label:'Help',text:'Give an evening.'},{k:'pray',label:'Pray',text:'Pray by name.'}],respond:true},
  verse:{type:'verse',text:'Let no man despise thy youth; but be thou an example of the believers…',ref:'1 Timothy 4:12',version:'KJV'},
  close:{type:'close',headline:'We will report back on 18 November',text:'Thank you.',quote:null}
};
const TWELVE=['join','motion','stat','trio','capacity','ability','ask','risks','timeline','roles','yes','close'];
const deck=(over={},names=TWELVE)=>clone({kind:'tdeck',ver:1,lang:'en',title:'Pathfinder & Adventurer club',church:'Bucks County SDA',
  audience:{type:'board',group:'board'},ministry:{id:'pathfinders',name:'Pathfinder & Adventurer club'},created:1790000000000,
  slides:names.map(n=>SL[n]),...over});
const open=(d=deck(),extra={},headers={},ctx={})=>post({op:'open',deck:d,...extra},headers,ctx);

console.log('-- status and the envelope --');
let r=await get('');
c('GET answers status', [r.status,r.j.ok,r.j.fn,r.j.live,r.j.fb,r.j.codeRequired,r.j.regRequired], [200,true,'present-1.0',false,'unset',false,false]);
r=await post({op:'status'});
c('POST op:status too', [r.status,r.j.fn], [200,'present-1.0']);
fbOn(); r=await get('');
c('live:true once both Firebase variables are set', r.j.live, true);
for(const [u,want] of [[FB+'/',true],['https://terrain-live-default-rtdb.europe-west1.firebasedatabase.app',true],
  ['http://terrain-live-default-rtdb.firebaseio.com',false],['https://evil.example.com',false],
  ['https://terrain-live-default-rtdb.firebaseio.com.evil.com',false],[FB+'/live',false],[FB+'?x=1',false],
  ['https://user:pw@terrain-live-default-rtdb.firebaseio.com',false],[FB+':8443',false],['not a url',false]]){
  process.env.PRESENT_FB_URL=u; r=await get('');
  c('Firebase address '+JSON.stringify(u)+' → live:'+want, r.j.live, want);
}
fbOn(); delete process.env.PRESENT_FB_SECRET; r=await get('');
c('no secret → live:false', r.j.live, false);
{ // status checks the key with Firebase: a shallow read of the root, cached a minute
  process.env.PRESENT_FB_URL=FB; process.env.PRESENT_FB_SECRET='probe-secret-1'; calls=[];
  r=await get('');
  c('status: Firebase took the key → live:true, fb ok', [r.j.live,r.j.fb], [true,'ok']);
  c('…by one shallow GET of the root, with the key, never following a redirect', [calls.length,calls[0].method,calls[0].url,calls[0].redirect],
    [1,'GET',FB+'/.json?shallow=true&auth=probe-secret-1','error']);
  r=await get(''); c('…remembered for a minute (no second read)', [r.j.live,calls.length], [true,1]);
  process.env.PRESENT_FB_SECRET='probe-secret-2'; fbCode=401; r=await get('');
  c('a key Firebase refuses (401) → live:false, fb bad-key', [r.j.live,r.j.fb], [false,'bad-key']);
  process.env.PRESENT_FB_SECRET='probe-secret-3'; fbCode=403; r=await get('');
  c('…403 too', r.j.fb, 'bad-key');
  process.env.PRESENT_FB_SECRET='probe-secret-4'; fbCode=null; fbOk=false; r=await get('');
  c('Firebase down → live:false, fb unreachable', [r.j.live,r.j.fb], [false,'unreachable']);
  fbOk=true; fbCode=null;
  r=await post({op:'status'}); c('POST op:status says the same', [r.j.fb,r.j.live], ['unreachable',false]);
  c('the key never reaches a response', JSON.stringify(r.j).includes('probe-secret'), false); }
fbOff();
r=await post({op:'nonsense'});           c('unknown op → 400', [r.status,r.j.error], [400,'unknown-op']);
r=await post({});                        c('missing op → 400', r.status, 400);
r=await post('{not json');               c('bad JSON → 400', [r.status,r.j.error], [400,'bad-json']);
r=await post('[1,2]');                   c('a JSON array is not a request → 400', r.status, 400);
r=await post('null');                    c('null is not a request → 400', r.status, 400);
r=await call(new Request(URL0,{method:'PUT',body:'{}'}));  c('other methods → 405', r.status, 405);
r=await get('op=open');                  c('GET cannot open a room → 405', [r.status,r.j.error], [405,'method']);
r=await get('op=answers&room='+noRoom);  c('GET cannot read answers → 405', r.status, 405);
r=await get('op=bogus');                 c('GET unknown op → 400', r.status, 400);
r=await post({op:'open',pad:'x'.repeat(128*1024+10)});
c('body over 128 KB → 413', [r.status,r.j.error], [413,'too-large']);
r=await post({op:'toString'});           c('an inherited name is not an op', [r.status,r.j.error], [400,'unknown-op']);

console.log('\n-- open --');
fbOn(); calls=[];
r=await open();
c('open → 200', [r.status,r.j.ok], [200,true]);
const ROOM=r.j.room, KEY=r.j.key, CODE=r.j.code;
c('room is 22 url-safe characters', /^[A-Za-z0-9_-]{22}$/.test(ROOM));
c('key is 43 url-safe characters', /^[A-Za-z0-9_-]{43}$/.test(KEY));
c('code is six characters with no 0/O/1/I/L', CODE_RE.test(CODE));
c('expires in seven days by default', Math.abs(r.j.expires-(Date.now()+7*864e5))<5000);
c('v 1, n 12, live true', [r.j.v,r.j.n,r.j.live], [1,12,true]);
c('the watch link uses the request origin outside Netlify', r.j.url, 'https://x.test/#watch='+ROOM);
let rec=S.peek('r/'+ROOM);
c('room record fields', Object.keys(rec).sort(), ['church','code','created','ended','expires','keyHash','lang','n','opts','respond','room','salt','title','upd','v']);
c('…the salt (for the answers’ address tags) is random, never a key', [/^[A-Za-z0-9_-]{16}$/.test(rec.salt),rec.salt!==rec.keyHash], [true,true]);
c('the key is stored only as a SHA-256', [/^[0-9a-f]{64}$/.test(rec.keyHash), [...S.m.values()].some(v=>v.data.includes(KEY))], [true,false]);
c('respond and its options come from the yes slide', [rec.respond,rec.opts], [true,['lead','help','pray']]);
c('typed code → room', S.peek('k/'+CODE), {room:ROOM,expires:rec.expires});
c('expiry marker on the day it expires', S.peek(`x/${utcDay(rec.expires)}/${ROOM}`), {});
let dk=S.peek('d/'+ROOM);
c('deck stored as v1', dk.v, 1);
c('Firebase pointer created: one PATCH to live/<room> with the secret', [calls.length,calls[0].method,calls[0].url], [1,'PATCH',fbUrl(ROOM)]);
c('…holding only the pointer', calls[0].body, {i:0,v:1,on:false,end:false,at:{'.sv':'timestamp'}});
// A clean deck comes back exactly as sent, except the join slide.
{ const sent=deck(); const got=dk.deck;
  c('a clean deck is kept exactly (top level)', canon({...got,slides:null}), canon({...sent,slides:null}));
  c('every slide but join is kept exactly', got.slides.slice(1).map(canon), sent.slides.slice(1).map(canon));
  c('join: the link and code are the room’s own, never the page’s', got.slides[0], {type:'join',note:SL.join.note,qrUrl:'https://x.test/#watch='+ROOM,code6:CODE});
  c('no URL the page chose is stored anywhere', [...S.m.values()].some(v=>v.data.includes('evil.example')), false); }
for(const d of [1,30]){ r=await open(deck(),{keepDays:d}); c('keepDays '+d, [r.status, Math.abs(r.j.expires-(Date.now()+d*864e5))<5000], [200,true]); }
for(const d of [3,'7',0,false]){ r=await open(deck(),{keepDays:d}); c('keepDays '+JSON.stringify(d)+' → 400', [r.status,r.j.error], [400,'bad-days']); }
process.env.SITE_URL='https://pastorshub.org/'; r=await open(deck({lang:'es'}));
c('SITE_URL is the link’s base; Spanish adds ~es', [r.j.url, S.peek('d/'+r.j.room).deck.slides[0].qrUrl], ['https://pastorshub.org/#watch='+r.j.room+'~es','https://pastorshub.org/#watch='+r.j.room+'~es']);
delete process.env.SITE_URL;
r=await open(deck(),{},{},{site:{url:'https://deploy-preview.netlify.app'}});
c('else Netlify’s own site address', r.j.url, 'https://deploy-preview.netlify.app/#watch='+r.j.room);
calls=[]; fbFailOnce=true; r=await open();
c('a failed first pointer write is tried once more; the room opens anyway', [r.status,calls.length,calls.every(x=>x.method==='PATCH')], [200,2,true]);
calls=[]; fbOk=false; r=await open(); fbOk=true;
c('Firebase down: the room still opens (phones swipe freely)', [r.status,r.j.ok], [200,true]);
fbOff(); calls=[]; r=await open();
c('no Firebase: opens with live:false and no network call', [r.status,r.j.live,calls.length], [200,false,0]);
fbOn();

console.log('\n-- access codes (TERRAIN_REQUIRE_CODE) --');
process.env.TERRAIN_CODES='PA-2026-K7M2:Pennsylvania Conference@Pennsylvania, OH-2026-M5RK';
r=await open();
c('codes listed but not required: open needs no code', r.status, 200);
r=await get(''); c('status: codeRequired false', r.j.codeRequired, false);
process.env.TERRAIN_REQUIRE_CODE='1';
r=await get(''); c('required: status says so', r.j.codeRequired, true);
r=await open();                                        c('required: no code → 401 nocode', [r.status,r.j.error], [401,'nocode']);
r=await open(deck(),{},{'x-terrain-code':'PA-2026-WRONG'}); c('required: wrong code → 401', r.status, 401);
r=await open(deck(),{},{'x-terrain-code':'pa-2026-k7m2'});  c('required: a valid code (any case) works', [r.status,!!r.j.room], [200,true]);
r=await open(deck(),{},{'x-terrain-code':' OH-2026-M5RK '}); c('required: a code with no @Conference works', r.status, 200);
r=await open(deck(),{code:'PA-2026-K7M2'});             c('required: a code in the body is not enough', r.status, 401);
r=await post({op:'status'});                           c('status needs no code', r.status, 200);
r=await get('op=deck&room='+ROOM);                     c('members never need a code', r.status, 200);
// v10.39 integration: the switch reads as census.mjs and gifts.mjs read it (it was "1" only).
for(const v of ['true','yes','on','ON',' True ']){ process.env.TERRAIN_REQUIRE_CODE=v;
  r=await open(); c('TERRAIN_REQUIRE_CODE='+JSON.stringify(v)+' switches codes on too (as census and gifts)', [r.status,r.j.error], [401,'nocode']); }
{ const l0=logs.length;
  for(const v of ['0','false','no','off','','2','maybe','maybe']){ process.env.TERRAIN_REQUIRE_CODE=v;
    r=await open(); c('TERRAIN_REQUIRE_CODE='+JSON.stringify(v)+' leaves codes off', r.status, 200); }
  const errs=logs.slice(l0);
  c('an unknown value is logged once, by name only', [errs.filter(x=>/TERRAIN_REQUIRE_CODE/.test(x)).length,errs.some(x=>/maybe|"2"/.test(x))], [1,false]); }
process.env.TERRAIN_REQUIRE_CODE='1'; delete process.env.TERRAIN_CODES;
r=await open();                                        c('"1" with no codes listed stays open (as census and gifts)', r.status, 200);
delete process.env.TERRAIN_REQUIRE_CODE;

console.log('\n-- registration (TERRAIN_REG_SECRET) --');
{ const { createHmac } = await import('node:crypto');
  const SECRET='reg-secret-0123456789-abcdefghijklmnop';     // 38 characters
  const tok=(secret=SECRET,iat=Date.now(),id='AbCdEfGhIjKl')=>{ const t=Math.floor(iat/1000).toString(36);
    return `r1.${id}.${t}.`+createHmac('sha256',secret).update(`terrain-reg|r1|${id}|${t}`,'utf8').digest('base64url').slice(0,32); };
  process.env.TERRAIN_REG_SECRET=SECRET;
  r=await get(''); c('status says registration is required', r.j.regRequired, true);
  r=await open(); c('open without the registration token → 401 noreg', [r.status,r.j.error], [401,'noreg']);
  r=await open(deck(),{},{'x-terrain-reg':tok()}); c('open with a current token → 200', [r.status,!!r.j.room], [200,true]);
  const REGROOM=r.j;
  r=await open(deck(),{},{'x-terrain-reg':tok('another-secret-0123456789-abcdefghij')}); c('a token signed with another secret → 401', [r.status,r.j.error], [401,'noreg']);
  r=await open(deck(),{},{'x-terrain-reg':tok(SECRET,Date.now()-181*864e5)}); c('a token over 180 days old → 401', r.status, 401);
  r=await open(deck(),{},{'x-terrain-reg':tok().slice(0,-1)+'A'}); c('a tampered token → 401', r.status, 401);
  r=await open(deck(),{token:tok()}); c('a token in the body is not enough', r.status, 401);
  r=await get('op=deck&room='+REGROOM.room); c('members need none: deck', r.status, 200);
  r=await get('op=state&room='+REGROOM.room); c('…state', r.status, 200);
  r=await post({op:'join',code:REGROOM.code}); c('…join', [r.status,r.j.room], [200,REGROOM.room]);
  r=await post({op:'respond',room:REGROOM.room,k:'help',name:'Ana'}); c('…respond', r.status, 200);
  r=await post({op:'go',room:REGROOM.room,key:REGROOM.key,i:1}); c('the presenter’s key alone moves slides (no token)', r.status, 200);
  process.env.TERRAIN_REQUIRE_CODE='1'; process.env.TERRAIN_CODES='PA-2026-K7M2';
  r=await get(''); c('codes switched on: registration is not asked for (as census and gifts)', [r.j.regRequired,r.j.codeRequired], [false,true]);
  r=await open(deck(),{},{'x-terrain-code':'PA-2026-K7M2'}); c('…a code alone opens', r.status, 200);
  delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.TERRAIN_CODES;
  const l0=logs.length;
  process.env.TERRAIN_REG_SECRET='too-short-secret';
  r=await open(); c('a secret under 32 characters is ignored (fail-open, as census and gifts)', r.status, 200);
  r=await get(''); c('…and status says so', r.j.regRequired, false);
  const errs=logs.slice(l0);
  c('…logged once, without the secret', [errs.filter(x=>/TERRAIN_REG_SECRET/.test(x)).length,errs.some(x=>x.includes('too-short-secret'))], [1,false]);
  delete process.env.TERRAIN_REG_SECRET; }

console.log('\n-- the deck is rebuilt field by field --');
const badDeck=async(name,mut,where,status=400)=>{ const d=deck(); mut(d); const x=await open(d);
  c('refused: '+name, [x.status,x.j.error,x.j.where], status===400?[400,'bad-deck',where]:[status,'too-large',undefined]); };
await badDeck('kind', d=>{d.kind='deck';}, 'kind');
await badDeck('ver 2', d=>{d.ver=2;}, 'ver');
await badDeck('lang fr', d=>{d.lang='fr';}, 'lang');
await badDeck('audience type', d=>{d.audience.type='elders';}, 'audience.type');
await badDeck('audience missing', d=>{delete d.audience;}, 'audience');
await badDeck('audience group not a slug', d=>{d.audience.group='Board <b>';}, 'audience.group');
await badDeck('ministry id not a slug', d=>{d.ministry.id='../x';}, 'ministry.id');
await badDeck('title not text', d=>{d.title={x:1};}, 'title');
await badDeck('no slides', d=>{d.slides=[];}, 'slides');
await badDeck('13 slides', d=>{d.slides.push(clone(SL.verse));}, 'slides');
await badDeck('slides not a list', d=>{d.slides={0:SL.join};}, 'slides');
await badDeck('an unknown slide type', d=>{d.slides[1]={type:'html',html:'<script>alert(1)</script>'};}, 'slides[1].type');
await badDeck('a slide with no type', d=>{delete d.slides[1].type;}, 'slides[1].type');
await badDeck('an inherited name as a type', d=>{d.slides[1].type='constructor';}, 'slides[1].type');
await badDeck('__proto__ as a type', d=>{d.slides[1].type='__proto__';}, 'slides[1].type');
await badDeck('a slide that is text', d=>{d.slides[1]='motion';}, 'slides[1]');
await badDeck('text over 400', d=>{d.slides[1].headline='x'.repeat(401);}, 'slides[1].headline');
await badDeck('text that is an object', d=>{d.slides[1].kicker={toString:'x'};}, 'slides[1].kicker');
await badDeck('text that is a list', d=>{d.slides[7].items=[['a']];}, 'slides[7].items[0]');
await badDeck('motion: six rows', d=>{d.slides[1].rows=Array(6).fill(['a','b']);}, 'slides[1].rows');
await badDeck('motion: a row of three', d=>{d.slides[1].rows=[['a','b','c']];}, 'slides[1].rows[0]');
await badDeck('motion: a value that is an object', d=>{d.slides[1].rows=[['a',{v:1}]];}, 'slides[1].rows[0][1]');
await badDeck('stat: a colour that is not a kind', d=>{d.slides[2].hue='red';}, 'slides[2].hue');
await badDeck('stat: more dots on than dots', d=>{d.slides[2].dots.on=101;}, 'slides[2].dots.on');
await badDeck('stat: a fraction of a dot', d=>{d.slides[2].dots.n=99.5;}, 'slides[2].dots.n');
await badDeck('stat: sig as text', d=>{d.slides[2].compare.sig='true';}, 'slides[2].compare.sig');
await badDeck('stat: a number past 1e12', d=>{d.slides[2].value=2e12;}, 'slides[2].value');
await badDeck('trio: two items', d=>{d.slides[3].items.pop();}, 'slides[3].items');
await badDeck('trio: an item colour', d=>{d.slides[3].items[1].hue='var(--x)';}, 'slides[3].items[1].hue');
await badDeck('capacity: five rows', d=>{d.slides[4].rows=Array(5).fill(SL.capacity.rows[0]);}, 'slides[4].rows');
await badDeck('capacity: need as text', d=>{d.slides[4].rows[0].need='5';}, 'slides[4].rows[0].need');
await badDeck('capacity: seven gaps', d=>{d.slides[4].gaps=Array(7).fill('g');}, 'slides[4].gaps');
await badDeck('ability: thirteen gifts', d=>{d.slides[5].gifts=Array(13).fill('Helps');}, 'slides[5].gifts');
await badDeck('ask: eight rows', d=>{d.slides[6].rows=Array(8).fill(['a','b']);}, 'slides[6].rows');
await badDeck('ask: a verse that is text', d=>{d.slides[6].verse='Luke 14:28';}, 'slides[6].verse');
await badDeck('risks: seven items', d=>{d.slides[7].items=Array(7).fill('r');}, 'slides[7].items');
await badDeck('timeline: two steps', d=>{d.slides[8].steps.pop();}, 'slides[8].steps');
await badDeck('roles: five roles', d=>{d.slides[9].roles=Array(5).fill(SL.roles.roles[0]);}, 'slides[9].roles');
await badDeck('yes: an unknown answer', d=>{d.slides[10].options[0].k='maybe';}, 'slides[10].options[0].k');
await badDeck('yes: the same answer twice', d=>{d.slides[10].options[1].k='lead';}, 'slides[10].options[1].k');
await badDeck('yes: two options', d=>{d.slides[10].options.pop();}, 'slides[10].options');
await badDeck('yes: respond as text', d=>{d.slides[10].respond='yes';}, 'slides[10].respond');
await badDeck('verse: a version other than KJV or RVA', d=>{d.slides[11]={...clone(SL.verse),version:'NIV'};}, 'slides[11].version');
await badDeck('close: a quote that is a list', d=>{d.slides[11].quote=['a'];}, 'slides[11].quote');
await badDeck('created as an object', d=>{d.created={t:1};}, 'created');
await badDeck('over 64 KB of JSON', d=>{d.junk='x'.repeat(66*1024);}, null, 413);
await badDeck('markup: a tag in a headline', d=>{d.slides[1].headline='Hi <img src=x onerror=alert(1)>';}, 'slides[1].headline');
await badDeck('markup: a closing tag in the title', d=>{d.title='</title><script>alert(1)</script>';}, 'title');
await badDeck('markup: a comment opener in a list item', d=>{d.slides[7].items[0]='<!-- x';}, 'slides[7].items[0]');
await badDeck('markup: <? in the ministry name', d=>{d.ministry.name='<?xml x?>';}, 'ministry.name');
await badDeck('markup: a tag in a figure given as text', d=>{d.slides[3].items[1].value='<svg onload=alert(1)>';}, 'slides[3].items[1].value');
await badDeck('markup: a tag in a quote', d=>{d.slides[8].quote.ref='<a href="javascript:alert(1)">PK</a>';}, 'slides[8].quote.ref');
await badDeck('markup: checked after cleaning (a control character before the tag)', d=>{d.slides[1].kicker='\u0000\u202e<script>';}, 'slides[1].kicker');
{ const d=deck(); d.slides[1].kicker='<\u0000script>'; r=await open(d);
  c('a control character inside "<script>" leaves "< script>", which no page reads as a tag', [r.status,S.peek('d/'+r.j.room).deck.slides[1].kicker], [200,'< script>']); }
{ const d=deck(); d.slides[1].headline='Children <5 and adults < 18, a <-> b, 3<4'; r=await open(d);
  c('a "<" that starts no tag is fine', [r.status,S.peek('d/'+r.j.room).deck.slides[1].headline], [200,'Children <5 and adults < 18, a <-> b, 3<4']); }
{ const d=deck(); d.slides[1].headline='javascript:alert(1)'; r=await open(d);
  c('a javascript: text is only text: no field of a deck is ever a link', [r.status,S.peek('d/'+r.j.room).deck.slides.filter(x=>'qrUrl' in x).map(x=>x.qrUrl.startsWith('https://x.test/#watch='))], [200,[true]]); }
r=await post({op:'open',deck:[deck()]});          c('refused: a deck that is a list', [r.status,r.j.where], [400,'deck']);
r=await post({op:'open'});                        c('refused: no deck', [r.status,r.j.where], [400,'deck']);
{ const raw=JSON.stringify({op:'open',deck:deck()}).replace('"value":27,','"value":1e400,');
  r=await post(raw); c('refused: a number too large to be finite (1e400)', [r.status,r.j.where], [400,'slides[2].value']); }
{ const d=deck(); d.slides[1].headline='x'.repeat(400); r=await open(d); c('exactly 400 characters is fine', r.status, 200); }
{ const d=deck({script:'<script>',onload:'x'});
  Object.assign(d.slides[2],{html:'<img src=x onerror=alert(1)>',style:'x'}); d.slides[2].compare.extra='x'; d.slides[2].dots.extra=1;
  d.slides[10].options[0].href='javascript:alert(1)'; d.audience.extra=1; d.ministry.url='https://evil.example';
  r=await open(d); const got=S.peek('d/'+r.j.room).deck;
  c('unknown fields are dropped, not refused', [r.status, /script|onload|onerror|javascript|extra|evil|style/.test(JSON.stringify(got))], [200,false]); }
{ const raw=JSON.stringify({op:'open',deck:deck()}).replace('"kind":"tdeck"','"__proto__":{"polluted":1},"kind":"tdeck"');
  r=await post(raw); c('a __proto__ key is ignored', [r.status, ({}).polluted, 'polluted' in S.peek('d/'+r.j.room).deck], [200,undefined,false]); }
{ const d=deck(); d.slides[1].headline='a‮b\nc\u0000d e\u0085\u009b  f'; r=await open(d);
  c('control characters (C0 and C1) and direction overrides become spaces', S.peek('d/'+r.j.room).deck.slides[1].headline, 'a b c d e f'); }
{ const d=deck({ministry:null,created:'2026-09-28'}); delete d.slides[2].hue; delete d.slides[3].items[0].hue; d.slides[2].dots=null; d.slides[2].compare=null;
  r=await open(d); const got=S.peek('d/'+r.j.room).deck;
  c('ministry may be null, created may be a date; a missing colour is acc', [r.status,got.ministry,got.created,got.slides[2].hue,got.slides[3].items[0].hue,got.slides[2].dots,got.slides[2].compare], [200,null,'2026-09-28','acc','acc',null,null]); }
{ const d=deck({lang:'es'},['join','stat','verse','close']); d.slides[2].version='RVA';
  r=await open(d); c('Spanish with RVA', [r.status,S.peek('r/'+r.j.room).lang,S.peek('d/'+r.j.room).deck.slides[2].version], [200,'es','RVA']); }
{ const d=deck(); d.slides[10].respond=false; r=await open(d); const rr=S.peek('r/'+r.j.room);
  c('respond:false → the room takes no answers', [rr.respond,rr.opts,r.j.respond], [false,[],false]); }
r=await open(); c('open says whether the room takes answers', r.j.respond, true);
for(const g of ['youth','pathfinders','adventurers']){
  const d=deck({audience:{type:'team',group:g}}); r=await open(d); const rr=S.peek('r/'+r.j.room);
  c('youth audience ('+g+'): yes slides are stored with respond:false, the room takes no answers',
    [r.status,r.j.respond,S.peek('d/'+r.j.room).deck.slides[10].respond,rr.respond,rr.opts], [200,false,false,false,[]]);
  const x=await post({op:'respond',room:r.j.room,k:'help',name:'Timmy'});
  c('…and a child’s name sent anyway is refused, nothing kept', [x.status,x.j.error,S.keys(`a/${r.j.room}/`).length], [403,'respond-off',0]); }
{ r=await open(deck({audience:{type:'congregation',group:'sabbath'}})); c('a congregation deck may take answers', r.j.respond, true);
  const u=await post({op:'update',room:r.j.room,key:r.j.key,deck:deck({audience:{type:'team',group:'youth'}})});
  c('update to a youth audience turns answers off', [u.status,u.j.respond,S.peek('r/'+r.j.room).respond,S.peek('d/'+r.j.room).deck.slides[10].respond], [200,false,false,false]); }

console.log('\n-- deck (what phones fetch) --');
const R1=await open(); const Q=R1.j.room, QK=R1.j.key, QC=R1.j.code;
r=await get('op=deck&room='+Q);
c('GET op=deck → the slides', [r.status,r.j.ok,r.j.v,r.j.deck.slides.length,r.j.ended], [200,true,1,12,null]);
c('the stream address, with no secret', [r.j.live, r.j.live.includes('auth'), r.j.live.includes(FBS)], [`${FB}/live/${Q}.json`,false,false]);
c('when it expires', r.j.expires, S.peek('r/'+Q).expires);
c('the served deck is the stored deck', canon(r.j.deck), canon(S.peek('d/'+Q).deck));
c('nothing private in it', /keyHash|"key"|"code":"|"opts"|"upd"/.test(JSON.stringify(r.j)), false);
c('one opened marker', S.keys(`o/${Q}/`).length, 1);
r=await post({op:'deck',room:Q,p:'phone-aaaa-1111'}); r=await get('op=deck&room='+Q+'&p=phone-aaaa-1111');
c('POST works too; a phone with its own id is counted once', [r.status,S.keys(`o/${Q}/`).length], [200,2]);
await get('op=deck&room='+Q+'&p=phone-bbbb-2222');
c('another phone, another marker', S.keys(`o/${Q}/`).length, 3);
c('the marker never holds the phone’s id', S.keys(`o/${Q}/`).some(k=>k.includes('phone-')), false);
r=await get('op=deck&room='+noRoom);   c('unknown room → 404', [r.status,r.j.error], [404,'not-found']);
r=await get('op=deck&room=../../etc'); c('malformed room → 400', [r.status,r.j.error], [400,'bad-room']);
r=await get('op=deck');                c('no room → 400', r.status, 400);
fbOff(); r=await get('op=deck&room='+Q+'&p=phone-aaaa-1111'); c('no Firebase: live null', [r.status,r.j.live], [200,null]); fbOn();

console.log('\n-- go (the presenter moves a slide) --');
calls=[];
r=await post({op:'go',room:Q,key:QK,i:3});
c('go → ok, and how many phones opened the slides', [r.status,r.j.ok,r.j.i,r.j.opened,r.j.live], [200,true,3,3,true]);
c('one PATCH of the pointer, with the secret', [calls.length,last().method,last().url], [1,'PATCH',fbUrl(Q)]);
c('…carrying only i, on and the server time', last().body, {i:3,on:true,at:{'.sv':'timestamp'}});
r=await post({op:'go',room:Q,key:QK,i:11}); c('the last slide', r.status, 200);
r=await post({op:'go',room:Q,key:QK,i:12}); c('past the last slide → 400', [r.status,r.j.error], [400,'bad-i']);
for(const i of [-1,'3',2.5,null,1e9]){ r=await post({op:'go',room:Q,key:QK,i}); c('i '+JSON.stringify(i)+' → 400', r.status, 400); }
r=await post({op:'go',room:Q,key:otherKey,i:1}); c('another key → 403', [r.status,r.j.error], [403,'bad-key']);
r=await post({op:'go',room:Q,key:KEY,i:1});      c('another room’s key → 403', r.status, 403);
r=await post({op:'go',room:Q,i:1});              c('no key → 403', r.status, 403);
r=await post({op:'go',room:Q,key:QK.slice(1),i:1}); c('a malformed key → 403', r.status, 403);
r=await post({op:'go',room:noRoom,key:QK,i:1});  c('unknown room → 404', r.status, 404);
r=await post({op:'go',room:'x',key:QK,i:1});     c('malformed room → 400', r.status, 400);
calls=[]; fbOk=false; r=await post({op:'go',room:Q,key:QK,i:2}); fbOk=true;
c('Firebase refuses → 502 live-failed (the page sends again)', [r.status,r.j.error], [502,'live-failed']);
fbOff(); calls=[]; r=await post({op:'go',room:Q,key:QK,i:2});
c('no Firebase: go still checks and answers, with no network call', [r.status,r.j.live,calls.length], [200,false,0]); fbOn();
{ // ten a second per room, best effort
  const q=await open(); const room=q.j.room, key=q.j.key;
  await new Promise(res=>{ const w=()=>Date.now()%1000<150?res():setTimeout(w,5); w(); });
  const got=[]; for(let i=0;i<11;i++) got.push((await post({op:'go',room,key,i:i%12})).status);
  c('go: ten a second, then 429', [got.slice(0,10).every(s=>s===200),got[10]], [true,429]);
  await new Promise(res=>setTimeout(res,1100));
  r=await post({op:'go',room,key,i:1}); c('…and the next second is fine', r.status, 200); }
{ // a copy made before an update on another instance is checked again before refusing
  const q=await open(deck({},['join','stat','yes','close'])); const room=q.j.room, key=q.j.key;
  r=await post({op:'go',room,key,i:3}); c('four slides: 3 is the last', r.status, 200);
  const rr=S.peek('r/'+room); rr.n=6; S.poke('r/'+room,rr);
  r=await post({op:'go',room,key,i:5}); c('slides added elsewhere: the room is read again, not refused', r.status, 200); }

console.log('\n-- update --');
calls=[];
r=await post({op:'update',room:Q,key:QK,deck:deck({title:'Pathfinder club, revised'},['join','stat','ask','yes','close'])});
c('update → v2, n5', [r.status,r.j.v,r.j.n,r.j.pointer], [200,2,5,true]);
c('the new deck is stored as v2', [S.peek('d/'+Q).v, S.peek('d/'+Q).deck.title, S.peek('r/'+Q).v, S.peek('r/'+Q).n], [2,'Pathfinder club, revised',2,5]);
c('PATCH {v} so phones fetch again', [last().method,last().url,last().body], ['PATCH',fbUrl(Q),{v:2,at:{'.sv':'timestamp'}}]);
c('the join slide keeps the room’s code and link', [S.peek('d/'+Q).deck.slides[0].code6, S.peek('d/'+Q).deck.slides[0].qrUrl], [QC,'https://x.test/#watch='+Q]);
r=await post({op:'go',room:Q,key:QK,i:5});  c('go checks the new slide count at once', [r.status,r.j.error], [400,'bad-i']);
r=await post({op:'go',room:Q,key:QK,i:4});  c('…and allows its last slide', r.status, 200);
r=await get('op=deck&room='+Q);             c('phones get v2', [r.j.v,r.j.deck.slides.length], [2,5]);
r=await post({op:'update',room:Q,key:otherKey,deck:deck()}); c('update: another key → 403', r.status, 403);
r=await post({op:'update',room:Q,key:QK,deck:{kind:'tdeck'}}); c('update: a bad deck → 400, nothing changed', [r.status,r.j.error,S.peek('d/'+Q).v], [400,'bad-deck',2]);
r=await post({op:'update',room:Q,key:QK,deck:deck({lang:'es'})});
c('update to Spanish: the link says ~es', [r.j.v,S.peek('r/'+Q).lang,S.peek('d/'+Q).deck.slides[0].qrUrl], [3,'es','https://x.test/#watch='+Q+'~es']);
{ const rr=S.peek('r/'+Q); rr.upd={hour:new Date().toISOString().slice(0,13),n:60}; S.poke('r/'+Q,rr);
  r=await post({op:'update',room:Q,key:QK,deck:deck()}); c('update: sixty an hour, then 429', [r.status,r.j.error,S.peek('r/'+Q).v], [429,'slow-down',3]);
  rr.upd={hour:'2001-01-01T00',n:60}; S.poke('r/'+Q,{...S.peek('r/'+Q),upd:rr.upd});
  r=await post({op:'update',room:Q,key:QK,deck:deck()}); c('…and a new hour is fine', [r.status,r.j.v], [200,4]); }
{ S.poke('d/'+Q,{v:9,deck:S.peek('d/'+Q).deck});
  r=await post({op:'update',room:Q,key:QK,deck:deck({title:'late'})});
  c('an update never replaces a newer deck', [r.status,S.peek('d/'+Q).v,S.peek('d/'+Q).deck.title==='late'], [200,9,false]); }

console.log('\n-- join (a typed code) --');
const J1=await open(deck({lang:'es'})); const JR=J1.j.room, JC=J1.j.code;
r=await post({op:'join',code:JC},{},{ip:'198.51.100.1'});
c('join → the room and its language', [r.status,r.j.room,r.j.lang], [200,JR,'es']);
r=await post({op:'join',code:' '+JC.slice(0,3).toLowerCase()+'-'+JC.slice(3).toLowerCase()+' '},{},{ip:'198.51.100.1'});
c('lower case, spaces and a hyphen are fine', [r.status,r.j.room], [200,JR]);
r=await post({op:'join',code:'AAAAAA'===JC?'BBBBBB':'AAAAAA'},{},{ip:'198.51.100.1'});
c('an unknown code → 404', [r.status,r.j.error], [404,'not-found']);
{ const ip={ip:'203.0.113.50'}; const got=[];
  for(let i=0;i<19;i++) got.push((await post({op:'join',code:JC==='HHHHHH'?'JJJJJJ':'HHHHHH'},{},ip)).status);
  for(let i=0;i<10;i++) got.push((await post({op:'join',code:JC},{},ip)).status);
  got.push((await post({op:'join',code:'hello'},{},ip)).status);
  got.push((await post({op:'join',code:JC},{},ip)).status);
  c('only failures count: 19 fails, 10 joins, the 20th fail, then 429 even for a right code',
    [got.slice(0,19).every(s=>s===404),got.slice(19,29).every(s=>s===200),got[29],got[30]], [true,true,404,429]);
  r=await post({op:'join',code:JC},{},{ip:'203.0.113.51'}); c('another address is not affected', r.status, 200); }
{ // IPv6: whoever has one address has the whole /64, so the /64 is what counts
  const forms=i=>['2001:db8:aa:1::'+(i+1).toString(16),'2001:DB8:AA:1:'+(i+7).toString(16)+'::9','[2001:0db8:00aa:0001:ffff:0:0:'+i.toString(16)+']','2001:db8:aa:1:0:0:1.2.3.'+i][i%4];
  const got=[]; for(let i=0;i<20;i++) got.push((await post({op:'join',code:'HHHHHH'===JC?'JJJJJJ':'HHHHHH'},{},{ip:forms(i)})).status);
  r=await post({op:'join',code:JC},{},{ip:'2001:db8:aa:1:dead:beef:0:1'});
  c('IPv6: 20 failures from 20 addresses in one /64 (written four ways), then 429', [got.every(s=>s===404),r.status], [true,429]);
  r=await post({op:'join',code:JC},{},{ip:'2001:db8:aa:2::1'}); c('…the next /64 is its own client', r.status, 200);
  const got4=[]; for(let i=0;i<20;i++) got4.push((await post({op:'join',code:'HHHHHH'===JC?'JJJJJJ':'HHHHHH'},{},{ip:'::ffff:198.51.100.200'})).status);
  r=await post({op:'join',code:JC},{},{ip:'198.51.100.200'}); c('an IPv4 address written as ::ffff:… is the same client', [got4.every(s=>s===404),r.status], [true,429]); }
c('no client address is ever stored', [...S.m.values()].some(v=>/203\.0\.113|198\.51\.100|2001:db8|2001:DB8/i.test(v.data)), false);
{ const q=await open(); const k=S.peek('k/'+q.j.code); k.expires=Date.now()-1; S.poke('k/'+q.j.code,k);
  r=await post({op:'join',code:q.j.code}); c('an expired code → 404, and it is deleted', [r.status,S.peek('k/'+q.j.code)], [404,null]); }

console.log('\n-- state (the pointer, for networks that block Firebase) --');
calls=[]; fbData={i:3,v:2,on:true,end:false,at:1790000000000,evil:'<script>',keyHash:'x'};
r=await get('op=state&room='+Q);
c('state → only i, v, on, end, at', [r.status,r.j.state], [200,{i:3,v:2,on:true,end:false,at:1790000000000}]);
c('read with the secret, from the server', [last().method,last().url], ['GET',fbUrl(Q,false)]);
fbData={i:'3',v:-1,on:'yes',end:1,at:'now'}; r=await post({op:'state',room:Q});
c('odd values are made safe', r.j.state, {i:0,v:1,on:false,end:false,at:null});
fbData=null; r=await get('op=state&room='+Q); c('no pointer yet → null', r.j.state, null);
fbOk=false; r=await get('op=state&room='+Q); fbOk=true; c('Firebase down → 502', [r.status,r.j.error], [502,'live-failed']);
fbOff(); calls=[]; r=await get('op=state&room='+Q); c('no Firebase → null, no network call', [r.status,r.j.state,calls.length], [200,null,0]); fbOn();
r=await get('op=state&room='+noRoom); c('unknown room → 404', r.status, 404);

console.log('\n-- respond ("I\'m in") and answers --');
const A1=await open(); const AR=A1.j.room, AK=A1.j.key;
r=await post({op:'respond',room:AR,k:'help',name:'  Zebulon  ',note:'Tuesdays\r\nonly'});
c('respond → {ok:true} and nothing else', [r.status,r.j], [200,{ok:true}]);
{ const ks=S.keys(`a/${AR}/`); c('one answer stored', ks.length, 1);
  c('stored as k, name, note, ts', Object.keys(S.peek(ks[0])).sort(), ['k','name','note','ts']);
  c('name tidied, note keeps its line break', [S.peek(ks[0]).name,S.peek(ks[0]).note], ['Zebulon','Tuesdays\nonly']); }
r=await post({op:'respond',room:AR,k:'lead',name:'Xiomara'}); c('no note is fine', r.status, 200);
r=await post({op:'respond',room:AR,k:'pray',name:'Quillon',minor:false}); c('minor:false is fine', r.status, 200);
r=await post({op:'respond',room:AR,k:'pray',name:'Kiddo',minor:true});
c('an under-18 is refused and nothing is kept', [r.status,r.j.error,S.keys(`a/${AR}/`).length], [403,'minor',3]);
for(const bad of ['true',1,'yes',{},[true]]){
  r=await post({op:'respond',room:AR,k:'pray',name:'Kiddo',minor:bad});
  c('type confusion: minor '+JSON.stringify(bad)+' is refused, not read as adult', [r.status,r.j.error], [400,'bad-minor']); }
c('…and no answer holds the child’s name', [...S.m.values()].some(v=>v.data.includes('Kiddo')), false);
for(const [what,body,err] of [
  ['an unknown answer',{k:'maybe',name:'Ana'},'bad-k'],['no answer',{name:'Ana'},'bad-k'],
  ['no name',{k:'help'},'bad-name'],['an empty name',{k:'help',name:'   '},'bad-name'],
  ['a name over 40',{k:'help',name:'A'.repeat(41)},'bad-name'],['a name with no letters',{k:'help',name:'12345'},'bad-name'],
  ['a name that is not text',{k:'help',name:['Ana']},'bad-name'],['a note over 200',{k:'help',name:'Ana',note:'n'.repeat(201)},'bad-note'],
  ['a note that is not text',{k:'help',name:'Ana',note:5},'bad-note']]){
  r=await post({op:'respond',room:AR,...body}); c('respond: '+what+' → 400', [r.status,r.j.error], [400,err]); }
for(const [what,body,err] of [
  ['a name that is a tag',{k:'help',name:'<img src=x onerror=alert(1)>'},'bad-name'],
  ['a name with a closing tag',{k:'help',name:'Ana</b>'},'bad-name'],
  ['a note with a script tag',{k:'help',name:'Ana',note:'<script>steal()</script>'},'bad-note'],
  ['a note with a tag on its second line',{k:'help',name:'Ana',note:'Tuesdays\n<iframe src=//x>'},'bad-note']]){
  r=await post({op:'respond',room:AR,...body}); c('respond: '+what+' → 400', [r.status,r.j.error], [400,err]); }
c('…and no markup was stored', [...S.m.values()].some(v=>/onerror|<script|<iframe|<\/b>/.test(v.data)), false);
r=await post({op:'respond',room:AR,k:'help',name:'A'.repeat(40),note:'I <3 this, 2<3'}); c('a name of exactly 40 is fine, and "<3" in a note', r.status, 200);
r=await post({op:'respond',room:noRoom,k:'help',name:'Ana'}); c('unknown room → 404', r.status, 404);
{ const d=deck(); d.slides[10].respond=false; const q=await open(d);
  r=await post({op:'respond',room:q.j.room,k:'help',name:'Ana'}); c('respond off on the yes slide → 403 respond-off', [r.status,r.j.error], [403,'respond-off']);
  const q2=await open(deck({},['join','stat','close']));
  r=await post({op:'respond',room:q2.j.room,k:'help',name:'Ana'}); c('no yes slide → 403', r.status, 403);
  for(const g of ['youth','pathfinders','adventurers','school']){ const q3=await open(deck({audience:{type:'team',group:g}}));
    const kept=S.peek('d/'+q3.j.room).deck.slides.find(x=>x.type==='yes');
    r=await post({op:'respond',room:q3.j.room,k:'help',name:'Ana'});
    c('a '+g+' deck is stored with respond:false and takes no answers', [q3.j.respond,kept.respond,r.status,r.j.error], [false,false,403,'respond-off']); } }
r=await post({op:'answers',room:AR,key:AK});
c('answers → the presenter’s list, oldest first', [r.status,r.j.items.map(x=>[x.k,x.name]),r.j.total], [200,[['help','Zebulon'],['lead','Xiomara'],['pray','Quillon'],['help','A'.repeat(40)]],4]);
c('each item is id, k, name, note, ts', Object.keys(r.j.items[0]).sort(), ['id','k','name','note','ts']);
c('…the id is the answer’s own blob name, nothing more', r.j.items.every(x=>/^[A-Za-z0-9_-]{12}$/.test(x.id)&&!!S.peek(`a/${AR}/${x.id}`)), true);
c('counts by answer', r.j.counts, {lead:1,help:2,pray:1});
r=await post({op:'answers',room:AR,key:otherKey}); c('answers: another key → 403', r.status, 403);
r=await post({op:'answers',room:AR});              c('answers: no key → 403', r.status, 403);
r=await post({op:'answers',room:AR,key:KEY});      c('answers: another room’s key → 403', r.status, 403);
r=await get('op=deck&room='+AR);
c('answers never reach the deck', /Zebulon|Xiomara|Quillon/.test(JSON.stringify(r.j)), false);
{ // drop: the presenter deletes answers (a flood of junk, or someone who asked)
  const q=await open(); const room=q.j.room, key=q.j.key;
  for(const n of ['Keep','Junk1','Junk2']) await post({op:'respond',room,k:'pray',name:n});
  const other=await open(); await post({op:'respond',room:other.j.room,k:'pray',name:'Elsewhere'});
  let a=await post({op:'answers',room,key}); const junk=a.j.items.filter(x=>/^Junk/.test(x.name)).map(x=>x.id);
  r=await post({op:'drop',room,key,ids:[...junk,junk[0],'nosuchanswer']});
  c('drop → deletes those answers and says how many', [r.status,r.j], [200,{ok:true,deleted:2}]);
  a=await post({op:'answers',room,key}); c('…the rest stay', [a.j.total,a.j.items.map(x=>x.name)], [1,['Keep']]);
  c('…another room’s answers are untouched', S.keys(`a/${other.j.room}/`).length, 1);
  for(const [what,ids] of [['no list',undefined],['an empty list',[]],['text',['a','b'].join()],['a number',[5]],['a path',['../'+other.j.room+'/x']],['a slash',['a/b']],['601 ids',Array(601).fill(0).map((_,i)=>'i'+i)]]){
    r=await post({op:'drop',room,key,ids}); c('drop: '+what+' → 400 bad-ids', [r.status,r.j.error], [400,'bad-ids']); }
  r=await post({op:'drop',room,key:otherKey,ids:['x']}); c('drop: another key → 403, nothing deleted', [r.status,S.keys(`a/${room}/`).length], [403,1]);
  r=await post({op:'drop',room,ids:['x']});           c('drop: no key → 403', r.status, 403);
  r=await post({op:'drop',room:other.j.room,key,ids:['x']}); c('drop: this key on another room → 403', r.status, 403);
  r=await get('op=drop&room='+room);                   c('drop: never by GET', r.status, 405);
  // a room filled by a flood is freed by the presenter
  for(let i=0;i<499;i++) S.poke(`a/${room}/fl${String(i).padStart(10,'0')}`,{k:'pray',name:'Spam',note:'',ts:2});
  r=await post({op:'respond',room,k:'lead',name:'Maria'}); c('a flood fills the room: 409 full', [r.status,r.j.error], [409,'full']);
  a=await post({op:'answers',room,key}); const flood=a.j.items.filter(x=>x.name==='Spam').map(x=>x.id);
  r=await post({op:'drop',room,key,ids:flood}); c('the presenter deletes the flood in one call', [r.status,r.j.deleted], [200,499]);
  r=await post({op:'respond',room,k:'lead',name:'Maria'}); c('…and members can answer again', r.status, 200); }
// v10.39 review S3: 150 answers from one address per room (a church on one Wi-Fi), 500 a room.
{ const q=await open(); const ip={ip:'192.0.2.77'}; const got=[];
  for(let i=0;i<151;i++) got.push((await post({op:'respond',room:q.j.room,k:'pray',name:'Member'},{},ip)).status);
  c('one client address: 150 answers in a room, then 429', [got.slice(0,150).every(s=>s===200),got[150],S.keys(`a/${q.j.room}/`).length], [true,429,150]);
  r=await post({op:'respond',room:q.j.room,k:'pray',name:'Member'},{},{ip:'192.0.2.78'}); c('another address is fine', r.status, 200);
  for(let i=0;i<349;i++) S.poke(`a/${q.j.room}/fill${String(i).padStart(8,'0')}`,{k:'pray',name:'x',note:'',ts:1});
  c('(the room now holds 500)', S.keys(`a/${q.j.room}/`).length, 500);
  r=await post({op:'respond',room:q.j.room,k:'pray',name:'Late'},{},{ip:'192.0.2.79'});
  c('500 answers per room, then 409 full, and nothing more is kept', [r.status,r.j.error,S.keys(`a/${q.j.room}/`).length], [409,'full',500]); }

console.log('\n-- end --');
calls=[];
r=await post({op:'end',room:AR,key:AK});
c('end → ended, expires', [r.status,typeof r.j.ended,r.j.expires,r.j.pointer], [200,'number',S.peek('r/'+AR).expires,true]);
c('PATCH on:false, end:true', [last().method,last().url,last().body], ['PATCH',fbUrl(AR),{on:false,end:true,at:{'.sv':'timestamp'}}]);
const ENDED=r.j.ended;
r=await post({op:'end',room:AR,key:AK}); c('end again changes nothing', [r.status,r.j.ended], [200,ENDED]);
r=await post({op:'go',room:AR,key:AK,i:1}); c('go after end → 409 ended', [r.status,r.j.error], [409,'ended']);
r=await get('op=deck&room='+AR); c('the slides stay readable, marked ended', [r.status,r.j.ended], [200,ENDED]);
r=await post({op:'respond',room:AR,k:'lead',name:'Afterward'}); c('a member can still answer until the room expires', r.status, 200);
r=await post({op:'end',room:AR,key:otherKey}); c('end: another key → 403', r.status, 403);
fbOk=false; r=await post({op:'end',room:AR,key:AK}); fbOk=true; c('Firebase down: end answers pointer:false, to send again', [r.status,r.j.pointer], [200,false]);

console.log('\n-- remove --');
await get('op=deck&room='+AR+'&p=phone-cccc-3333');
c('(the room has markers and answers)', [S.keys(`o/${AR}/`).length>0, S.keys(`a/${AR}/`).length>0], [true,true]);
const ARC=S.peek('r/'+AR).code, ARX=`x/${utcDay(S.peek('r/'+AR).expires)}/${AR}`;
r=await post({op:'remove',room:AR,key:otherKey}); c('remove: another key → 403, nothing deleted', [r.status,!!S.peek('r/'+AR)], [403,true]);
calls=[];
r=await post({op:'remove',room:AR,key:AK});
c('remove → ok, pointer cleared', [r.status,r.j.liveCleared], [200,true]);
c('Firebase DELETE of live/<room>', [last().method,last().url], ['DELETE',fbUrl(AR)]);
c('everything the room held is gone', [S.peek('r/'+AR),S.peek('d/'+AR),S.peek('k/'+ARC),S.keys(`o/${AR}/`).length,S.keys(`a/${AR}/`).length], [null,null,null,0,0]);
c('the expiry marker stays, so the sweep clears the pointer once more', S.peek(ARX), {});
r=await get('op=deck&room='+AR);                 c('deck → 404', r.status, 404);
r=await post({op:'go',room:AR,key:AK,i:0});      c('go → 404 at once on this instance', r.status, 404);
r=await post({op:'join',code:ARC});              c('its code → 404', r.status, 404);
r=await post({op:'answers',room:AR,key:AK});     c('answers → 404', r.status, 404);
fbOff(); { const q=await open(); r=await post({op:'remove',room:q.j.room,key:q.j.key}); c('no Firebase: removed, liveCleared false', [r.status,r.j.liveCleared,S.peek('r/'+q.j.room)], [200,false,null]); } fbOn();

console.log('\n-- expiry on sight --');
{ const q=await open(); const room=q.j.room;
  await post({op:'respond',room,k:'help',name:'Ana'}); await get('op=deck&room='+room);
  // (a room's expiry never changes after open, so its marker moves with it here)
  const rr=S.peek('r/'+room); S.m.delete(`x/${utcDay(rr.expires)}/${room}`); rr.expires=Date.now()-1; S.poke('r/'+room,rr);
  const x=`x/${utcDay(rr.expires)}/${room}`; S.poke(x,{});
  calls=[]; r=await get('op=deck&room='+room);
  c('an expired room → 404', [r.status,r.j.error], [404,'not-found']);
  c('…and everything it held is deleted; the marker stays for the sweep’s last pass', [S.peek('r/'+room),S.peek('d/'+room),S.peek('k/'+q.j.code),S.keys(`o/${room}/`).length,S.keys(`a/${room}/`).length,S.peek(x)], [null,null,null,0,0,{}]);
  c('…and the pointer', [last().method,last().url], ['DELETE',fbUrl(room)]); }
{ const q=await open(); const rr=S.peek('r/'+q.j.room); rr.expires=Date.now()-1; S.poke('r/'+q.j.room,rr);
  r=await post({op:'update',room:q.j.room,key:q.j.key,deck:deck()}); c('update on an expired room → 404', [r.status,S.peek('d/'+q.j.room)], [404,null]); }
{ // the last minute: still readable, never written to, so no write can outlive the sweep
  const q=await open(); const room=q.j.room, key=q.j.key; const rr=S.peek('r/'+room); rr.expires=Date.now()+30000; S.poke('r/'+room,rr);
  const o0=S.keys(`o/${room}/`).length;
  r=await get('op=deck&room='+room+'&p=phone-late-0001'); c('last minute: the slides are still served', r.status, 200);
  c('…but no opened marker is written', S.keys(`o/${room}/`).length, o0);
  calls=[];
  r=await post({op:'respond',room,k:'help',name:'Late'}); c('…an answer → 404, nothing kept', [r.status,S.keys(`a/${room}/`).length], [404,0]);
  r=await post({op:'go',room,key,i:1});        c('…a slide change → 404, the pointer untouched', [r.status,calls.filter(x=>x.method==='PATCH').length], [404,0]);
  r=await post({op:'update',room,key,deck:deck()}); c('…an update → 404', [r.status,S.peek('d/'+room).v], [404,1]);
  r=await post({op:'end',room,key});           c('…end → 404', r.status, 404);
  r=await post({op:'answers',room,key});       c('…the presenter can still read answers', r.status, 200);
  rr.expires=Date.now()+120000; S.poke('r/'+room,rr); await get('op=deck&room='+room);
  r=await post({op:'respond',room,k:'help',name:'Early'}); c('two minutes before: answers are taken', r.status, 200); }

console.log('\n-- open: limits --');
{ const st=makeStore(); globalThis.__terrainPresentStore=st;
  const ip={ip:'203.0.113.9'}; const got=[];
  for(let i=0;i<21;i++) got.push((await open(deck(),{},{},ip)).status);
  c('one client address: 20 rooms an hour, then 429', [got.slice(0,20).every(s=>s===200),got[20]], [true,429]);
  r=await open(deck(),{},{},{ip:'198.51.100.9'}); c('another address is fine', r.status, 200);
  const g=st.peek('g/open'); g.n=200; st.poke('g/open',g);
  r=await open(deck(),{},{},{ip:'198.51.100.10'}); c('200 rooms a day for the whole site, then 429 site-busy (not "from here")', [r.status,r.j.error], [429,'site-busy']);
  g.day='2001-01-01'; st.poke('g/open',g);
  r=await open(deck(),{},{},{ip:'198.51.100.10'}); c('…and a new day is fine', r.status, 200);
  process.env.TERRAIN_CODES='PA-2026-K7M2:Pennsylvania Conference@Pennsylvania';
  g.day=new Date().toISOString().slice(0,10); g.n=200; st.poke('g/open',{...st.peek('g/open'),day:g.day,n:200});
  r=await open(deck(),{},{},{ip:'198.51.100.11'}); c('strangers used up the day: no code → 429', r.status, 429);
  r=await open(deck(),{},{'x-terrain-code':'PA-2026-WRONG'},{ip:'198.51.100.11'}); c('…a wrong code does not help', r.status, 429);
  r=await open(deck(),{},{'x-terrain-code':'pa-2026-k7m2'},{ip:'198.51.100.11'}); c('…a pastor with a listed code still opens a room (codes not required)', r.status, 200);
  process.env.TERRAIN_REQUIRE_CODE='1';
  r=await open(deck(),{},{'x-terrain-code':'PA-2026-K7M2'},{ip:'198.51.100.12'}); c('…and when codes are required', r.status, 200);
  { const got=[]; for(let i=0;i<21;i++) got.push((await open(deck(),{},{'x-terrain-code':'PA-2026-K7M2'},{ip:'198.51.100.13'})).status);
    c('a code never lifts the per-address limit: 20, then 429', [got.slice(0,20).every(s=>s===200),got[20]], [true,429]); }
  delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.TERRAIN_CODES;
  const d=deck(); d.kind='x'; const before=st.peek('g/open').n;
  r=await open(d,{},{},{ip:'198.51.100.10'}); c('a bad deck uses up nothing', [r.status,st.peek('g/open').n], [400,before]);
  c('no client address is stored, only a keyed hash', JSON.stringify(st.peek('g/open')).includes('203.0.113'), false);
  globalThis.__terrainPresentStore=S; }

console.log('\n-- with ETags (the real store) --');
{ const st=makeStore({etags:true}); globalThis.__terrainPresentStore=st;
  const q=await open(); c('open', q.status, 200);
  r=await post({op:'update',room:q.j.room,key:q.j.key,deck:deck()}); c('update', [r.status,r.j.v], [200,2]);
  const got=await Promise.all(['lead','help','pray','help','lead'].map((k,i)=>post({op:'respond',room:q.j.room,k,name:'Person'+i},{},{ip:'192.0.2.'+i})));
  c('five answers at once, all kept', [got.every(x=>x.status===200), st.keys(`a/${q.j.room}/`).length], [true,5]);
  const two=await Promise.all([post({op:'end',room:q.j.room,key:q.j.key}),post({op:'end',room:q.j.room,key:q.j.key})]);
  c('two ends at once agree', [two[0].status,two[1].status,two[0].j.ended===two[1].j.ended], [200,200,true]);
  r=await post({op:'answers',room:q.j.room,key:q.j.key}); c('answers', r.j.total, 5);
  globalThis.__terrainPresentStore=S; }

console.log('\n-- present-sweep --');
{ const sweepMod=await import(new URL('../netlify/functions/present-sweep.mjs', import.meta.url).href);
  c('the sweep is scheduled daily', sweepMod.config && sweepMod.config.schedule, '@daily');
  const st=makeStore(); globalThis.__terrainPresentStore=st;
  const now=Date.now(), today=utcDay(now);
  const mk=async()=>{ const q=await open(); await post({op:'respond',room:q.j.room,k:'help',name:'Ana'}); await get('op=deck&room='+q.j.room); return q.j; };
  const setExp=(room,exp,day)=>{ const rr=st.peek('r/'+room); st.m.delete(`x/${utcDay(rr.expires)}/${room}`); rr.expires=exp; st.poke('r/'+room,rr);
    const k=st.peek('k/'+rr.code); k.expires=exp; st.poke('k/'+rr.code,k); st.poke(`x/${day||utcDay(exp)}/${room}`,{}); };
  const gone=await mk(); setExp(gone.room, now-2*864e5);
  const live=await mk();
  const later=await mk(); setExp(later.room, now+60*60*1000, today);
  const done=await mk(); setExp(done.room, now-1000, today);
  const removed=await mk(); await post({op:'remove',room:removed.room,key:removed.key});
  const rx=st.keys('x/').find(k=>k.endsWith('/'+removed.room)); st.m.delete(rx); st.poke(`x/${utcDay(now-864e5)}/${removed.room}`,{});
  st.poke('x/garbage',{}); st.poke('k/ZZZZZZ',{room:'R'.repeat(22),expires:now-5}); st.poke('k/YYYYYY',{room:'R'.repeat(22),expires:now+864e5});
  const has=room=>st.keys().some(k=>k.includes(room));
  calls=[];
  let out=await (await sweepMod.default(new Request('https://x/',{method:'POST',body:'{}'}))).json();
  c('sweep: reports what it deleted', [out.ok,out.deleted,out.left,out.codes], [true,3,0,1]);
  c('sweep: an expired room is deleted entirely (slides, code, markers, answers)', [has(gone.room),st.peek('k/'+gone.code)], [false,null]);
  c('sweep: due earlier today is deleted', has(done.room), false);
  c('sweep: a live room is kept whole', [!!st.peek('r/'+live.room),!!st.peek('d/'+live.room),st.keys(`a/${live.room}/`).length,!!st.peek('k/'+live.code)], [true,true,1,true]);
  c('sweep: due later today is kept until its moment', [!!st.peek('r/'+later.room),st.keys('x/'+today+'/').some(k=>k.endsWith(later.room))], [true,true]);
  c('sweep: a removed room’s marker clears the pointer once more, then goes', [has(removed.room), calls.some(x=>x.method==='DELETE'&&x.url===fbUrl(removed.room))], [false,true]);
  c('sweep: the pointer of every deleted room is deleted, with the secret', [gone.room,done.room].every(rm=>calls.some(x=>x.method==='DELETE'&&x.url===fbUrl(rm))), true);
  c('sweep: an expired code is tidied, a live one kept, a malformed marker left', [st.peek('k/ZZZZZZ'),!!st.peek('k/YYYYYY'),!!st.peek('x/garbage')], [null,true,true]);
  { // an answer still in flight when its room expires on sight is caught by the sweep
    const q=await open(); const room=q.j.room; let release; const gate=new Promise(res=>release=res); const orig=st.setJSON;
    st.setJSON=async(k,v,o)=>{ if(k.startsWith(`a/${room}/`)) await gate; return orig.call(st,k,v,o); };
    const p=post({op:'respond',room,k:'help',name:'InFlight'});
    await new Promise(res=>setTimeout(res,30));
    setExp(room, now-2*864e5);
    r=await get('op=deck&room='+room); c('(the room expires on sight while the answer is in flight)', [r.status,st.peek('r/'+room)], [404,null]);
    release(); await p; st.setJSON=orig;
    c('(the late answer landed)', st.keys(`a/${room}/`).length, 1);
    await sweepMod.default(new Request('https://x/',{method:'POST',body:'{}'}));
    c('sweep: the late answer is deleted, then the marker', [st.keys(`a/${room}/`).length,st.keys('x/').some(k=>k.endsWith(room)),[...st.m.values()].some(v=>v.data.includes('InFlight'))], [0,false,false]); }
  { // a big room: the members' answers go first, many deletes at once
    const q=await open(); const room=q.j.room;
    for(let i=0;i<60;i++) st.poke(`o/${room}/m${i}`,{}); for(let i=0;i<5;i++) st.poke(`a/${room}/n${i}`,{k:'help',name:'N'+i,note:'',ts:1});
    setExp(room, now-2*864e5);
    const del0=st.delete, order=[]; let inflight=0, most=0;
    st.delete=async k=>{ inflight++; most=Math.max(most,inflight); await new Promise(res=>setTimeout(res,2)); await del0.call(st,k); order.push(k); inflight--; };
    await sweepMod.default(new Request('https://x/',{method:'POST',body:'{}'})); st.delete=del0;
    const mine=order.filter(k=>k.includes(room));
    c('sweep: a room’s answers are deleted before anything else it holds', mine.slice(0,5).every(k=>k.startsWith('a/')), true);
    c('sweep: deletes run many at a time', most>=8, true);
    c('sweep: the big room is gone', st.keys().some(k=>k.includes(room)), false); }
  // Firebase unreachable: the room goes, the marker stays for tomorrow.
  const f=await mk(); setExp(f.room, now-864e5); fbOk=false;
  out=await (await sweepMod.default(new Request('https://x/',{method:'POST',body:'{}'}))).json(); fbOk=true;
  c('sweep: Firebase down → blobs deleted, marker kept, counted as left', [out.left,!!st.peek('r/'+f.room),st.keys('x/').some(k=>k.endsWith(f.room))], [1,false,true]);
  out=await (await sweepMod.default(new Request('https://x/',{method:'POST',body:'{}'}))).json();
  c('sweep: …and tomorrow it finishes', [out.deleted,has(f.room)], [1,false]);
  // No Firebase set up: markers go without any network call.
  fbOff(); const n=await mk(); setExp(n.room, now-864e5); calls=[];
  out=await (await sweepMod.default(new Request('https://x/',{method:'POST',body:'{}'}))).json();
  c('sweep: no Firebase → deleted with no network call', [out.deleted,has(n.room),calls.length], [1,false,0]); fbOn();
  globalThis.__terrainPresentStore={ async list(){ throw new Error('down '+FBS); } };
  const lg=logs.length; const errs=[]; const e0=console.error; console.error=(...a)=>errs.push(a.join(' '));
  out=await sweepMod.default(new Request('https://x/'));
  console.error=e0;
  c('sweep: a store failure → 500, logged without detail', [out.status,errs.join(' '),errs.join(' ').includes(FBS)], [500,'present-sweep: failed',false]);
  globalThis.__terrainPresentStore=S; }

console.log('\n-- a service-account key file in place of the database secret --');
{ const { generateKeyPairSync, createVerify } = await import('node:crypto');
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type:'pkcs8', format:'pem' });
  const EMAIL='firebase-adminsdk-x@terrain-live.iam.gserviceaccount.com';
  const SA = JSON.stringify({ type:'service_account', project_id:'terrain-live', private_key_id:'k1', private_key:pem, client_email:EMAIL, token_uri:'https://evil.example/token' });
  const trades=[]; let gOk=true;
  google=async(url,opts)=>{ const q=new URLSearchParams(opts.body); const [h,cl,sig]=String(q.get('assertion')).split('.');
    trades.push({url,method:opts.method,redirect:opts.redirect,type:opts.headers&&opts.headers['content-type'],grant:q.get('grant_type'),
      head:JSON.parse(Buffer.from(h,'base64url')),claims:JSON.parse(Buffer.from(cl,'base64url')),
      signed:createVerify('RSA-SHA256').update(h+'.'+cl).verify(publicKey,Buffer.from(sig,'base64url'))});
    return gOk?{ok:true,status:200,json:async()=>({access_token:'ya29.TEST-token',expires_in:3599,token_type:'Bearer'})}
      :{ok:false,status:400,json:async()=>({error:'invalid_grant'})}; };
  const b0=bodies.length, l0=logs.length;
  process.env.PRESENT_FB_URL=FB; process.env.PRESENT_FB_SECRET=SA; calls=[];
  r=await get('');
  c('status: live with a key file', [r.j.live,r.j.fb], [true,'ok']);
  const t=trades[0]||{};
  c('the token request goes to Google’s token address only (never the file’s token_uri), by POST, never following a redirect',
    [trades.length,t.url,t.method,t.redirect,t.type], [1,'https://oauth2.googleapis.com/token','POST','error','application/x-www-form-urlencoded']);
  c('…a JWT-bearer grant signed RS256 with the file’s private key', [t.grant,t.head,t.signed], ['urn:ietf:params:oauth:grant-type:jwt-bearer',{alg:'RS256',typ:'JWT'},true]);
  c('…for the service account, with the two Firebase scopes, for one hour', [t.claims.iss,t.claims.aud,t.claims.scope,t.claims.exp-t.claims.iat],
    [EMAIL,'https://oauth2.googleapis.com/token','https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database',3600]);
  c('Firebase is then read with access_token=, never auth=', calls.map(x=>x.url), [FB+'/.json?shallow=true&access_token=ya29.TEST-token']);
  const q=await open();
  c('open writes the pointer with the token', last().url, `${FB}/live/${q.j.room}.json?access_token=ya29.TEST-token&print=silent`);
  r=await post({op:'go',room:q.j.room,key:q.j.key,i:2});
  c('go too, and the token is reused: one trade in all', [r.status,last().url,trades.length], [200,`${FB}/live/${q.j.room}.json?access_token=ya29.TEST-token&print=silent`,1]);
  r=await get('op=deck&room='+q.j.room);
  c('the stream address phones get carries no key at all', r.j.live, `${FB}/live/${q.j.room}.json`);
  { const sweepMod=await import(new URL('../netlify/functions/present-sweep.mjs', import.meta.url).href);
    const rr=S.peek('r/'+q.j.room); S.m.delete(`x/${utcDay(rr.expires)}/${q.j.room}`); rr.expires=Date.now()-2*864e5; S.poke('r/'+q.j.room,rr);
    S.poke(`x/${utcDay(rr.expires)}/${q.j.room}`,{}); calls=[];
    await sweepMod.default(new Request('https://x/'));
    c('the sweep trades the key the same way and deletes the pointer with the token',
      [calls.some(x=>x.method==='DELETE'&&x.url===`${FB}/live/${q.j.room}.json?access_token=ya29.TEST-token&print=silent`),trades.length,trades[1]&&trades[1].signed], [true,2,true]); }
  // Google refuses the key (revoked, or the wrong file)
  process.env.PRESENT_FB_SECRET=SA.replace(EMAIL,'other@terrain-live.iam.gserviceaccount.com'); gOk=false;
  r=await get(''); c('Google refuses the key → live:false, fb bad-key', [r.j.live,r.j.fb], [false,'bad-key']);
  const q2=await open(); r=await post({op:'go',room:q2.j.room,key:q2.j.key,i:1});
  c('…go then answers 502 live-failed (the page shows Not live)', [r.status,r.j.error], [502,'live-failed']);
  gOk=true;
  for(const [what,v] of [['no private key',JSON.stringify({client_email:EMAIL})],['not JSON','{not json'],
    ['a private key that is not a key',JSON.stringify({client_email:EMAIL,private_key:'-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n'})],
    ['no email',JSON.stringify({private_key:pem})]]){
    process.env.PRESENT_FB_SECRET=v; r=await get('');
    c('a key file with '+what+' → not set up (live:false, fb unset), and no request made', [r.j.live,r.j.fb], [false,'unset']); }
  const seen=bodies.slice(b0).join('\n')+logs.slice(l0).join('\n');
  c('no response or log carries the private key, the token or the email', [seen.includes('PRIVATE KEY'),seen.includes('ya29.'),seen.includes(EMAIL)], [false,false,false]);
  google=null; fbOn(); }

console.log('\n-- failures and leaks --');
globalThis.__terrainPresentStore={ async get(){ throw new Error('store down for '+KEY+' '+FBS+' Zebulon'); }, async list(){ throw new Error('x'); } };
r=await get('op=deck&room='+Q);
c('a store failure → 500 server', [r.status,r.j.error], [500,'server']);
c('and only the op was logged', logs.some(l=>/^present: unexpected failure in op deck$/.test(l)));
globalThis.__terrainPresentStore=S;
// The status check reads the root shallowly (the key check, also on the
// europe-west1 address the status test configures); every other call is live/<room>.
c('every network call went to the configured database only', [allCalls.length>30, allCalls.every(x=>x.url.startsWith(FB+'/live/')||
  /^https:\/\/terrain-live-default-rtdb\.(firebaseio\.com|europe-west1\.firebasedatabase\.app)\/\.json\?shallow=true&(auth|access_token)=/.test(x.url))], [true,true]);
c('no call carrying the secret ever follows a redirect', allCalls.every(x=>x.redirect==='error'), true);
const all=bodies.join('\n');
c('no response ever contains a hash', [/[0-9a-f]{64}/.test(all), /Hash"/.test(all)], [false,false]);
c('no response ever contains the Firebase secret', [all.includes(FBS), all.includes(encodeURIComponent(FBS)), /auth=/.test(all)], [false,false,false]);
c('no response but answers ever contains a member’s answer', /Zebulon|Xiomara|Quillon|Afterward/.test(all), false);
c('no response ever contains a client address', /203\.0\.113|198\.51\.100|192\.0\.2\.|2001:db8/i.test(all+answerBodies.join('')), false);
c('no response ever contains the upd, opts or respond bookkeeping', /"upd"|"opts"|"keyHash"/.test(all), false);
const logText=logs.join('\n');
c('logs never contain a key, the secret, a code or a name', [KEY,QK,AK,FBS,CODE,QC,'Zebulon','Xiomara'].filter(x=>logText.includes(x)).length, 0);
c('every response is JSON with cache-control: no-store and nosniff', badHeaders, 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
