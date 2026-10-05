// v10.43.0 · connection cards: netlify/functions/connect.mjs (connect-1.0) and connect-sweep.mjs (connect-sweep-1.0)
// against an injected in-memory store. No real storage, no network.
// The pastor (30 Sep 2026): "If people come in on a one-day event there has to be a way to collect information, connect with
// the community, get their information somehow, so that we can build a relationship with the people." — approved: "yes. it
// should host the connection cards tailored to the situations." CONNECT.md §2 (171 checks, moved here) + DESIGN.md C2.1 (the
// card's `look` and `nextWhen`, picks 0–8, TAKEN_KEEP_DAYS) + DESIGN.md §9, the security checklist S1–S23 (each marked).
import { createHmac, randomBytes } from 'node:crypto';
import fs from 'node:fs';
delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.TERRAIN_REG_SECRET;
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,300));fail++}else pass++};

// ---- a fake Netlify Blobs store (the subset the function uses) -------------
const tick=()=>new Promise(r=>setImmediate(r));
function makeStore({etags=true}={}){
  const m=new Map(); let n=0;
  // seen: every key the function asked for (S4: none may hold "..", "//" or a leading "/"); writes: every set or delete, in order
  const s={ m, gets:0, seen:[], writes:[],
    async get(k){ s.gets++; s.seen.push(k); await tick(); const v=m.get(k); return v===undefined?null:JSON.parse(v.data); },
    async setJSON(k,val,o={}){ s.seen.push(k); await tick(); const cur=m.get(k);
      if(o.onlyIfNew&&cur) return {modified:false};
      if(o.onlyIfMatch&&(!cur||cur.etag!==o.onlyIfMatch)) return {modified:false};
      s.writes.push('set '+k); const etag='e'+(++n); m.set(k,{data:JSON.stringify(val),etag}); return {modified:true,etag}; },
    async delete(k){ s.seen.push(k); s.writes.push('del '+k); await tick(); m.delete(k); },
    async list({prefix=''}={}){ s.seen.push(prefix); await tick(); return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key,etag:m.get(key).etag}))}; },
    peek(k){ const v=m.get(k); return v?JSON.parse(v.data):null; },
    poke(k,val){ m.set(k,{data:JSON.stringify(val),etag:'e'+(++n)}); },
    keys(p=''){ return [...m.keys()].filter(k=>k.startsWith(p)).sort(); }
  };
  if(etags) s.getWithMetadata=async(k)=>{ s.gets++; s.seen.push(k); await tick(); const v=m.get(k); return v?{data:JSON.parse(v.data),etag:v.etag,metadata:{}}:null; };
  return s;
}
let S=makeStore(); globalThis.__terrainConnectStore=S;
const PATH='../netlify/functions/connect.mjs', SWEEP='../netlify/functions/connect-sweep.mjs';
const fn=(await import(new URL(PATH, import.meta.url).href)).default;
const SRC=fs.readFileSync(new URL(PATH, import.meta.url),'utf8'), SWSRC=fs.readFileSync(new URL(SWEEP, import.meta.url),'utf8');

const logs=[], bodies=[]; let badHeaders=0, cors=0, depth=0;
const REAL={log:console.log,error:console.error,warn:console.warn,info:console.info};
const cap=(...a)=>logs.push(a.map(String).join(' '));
async function call(req,ctx={}){
  if(depth++===0) console.log=console.error=console.warn=console.info=cap;
  let res; try{ res=await fn(req,ctx); } finally{ if(--depth===0) Object.assign(console,REAL); }
  if(res.headers.get('cache-control')!=='no-store, max-age=0'||!/json/.test(res.headers.get('content-type')||'')||res.headers.get('x-content-type-options')!=='nosniff') badHeaders++;
  if([...res.headers.keys()].some(k=>/^access-control-/i.test(k))) cors++;   // S2: no CORS header, so another site's scripts cannot read an answer
  const text=await res.text(); bodies.push({text,op:req.__op||''});
  return {status:res.status,j:JSON.parse(text)};
}
const URL0='https://pastorshub.org/.netlify/functions/connect';
const post=(body,headers={},ctx={})=>{ const req=new Request(URL0,{method:'POST',headers:{'content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)}); try{ req.__op=JSON.parse(typeof body==='string'?body:JSON.stringify(body)).op||''; }catch(e){} return call(req,ctx); };
const get=(q,ctx={})=>{ const req=new Request(URL0+q,{method:'GET'}); req.__op='get'; return call(req,ctx); };
const ip=a=>({ip:a});
const utcDay=t=>new Date(t).toISOString().slice(0,10);
const once=()=>randomBytes(24).toString('base64url');
const day=(n=0)=>utcDay(Date.now()+n*864e5);

// A health fair card as cnTailor makes it (connect/cn-tailor.js), with its next step.
const HEALTH={lang:'both',kind:'health',look:'health',cadence:'event',church:'Sampleton SDA (SAMPLE)',
  title:{en:'Community health fair',es:'Feria de salud comunitaria'},day:day(10),parent:false,note:true,partner:null,
  nextWhen:{en:'Tuesday evenings from November 3',es:'Los martes por la noche, desde el 3 de noviembre'},
  opts:[{k:'next',en:'Tell me about the plant-based cooking school',es:'Quiero saber más de la escuela de cocina vegetariana',contact:true},
        {k:'recipes',en:'Send me the recipe booklet',es:'Envíenme el recetario',contact:true},
        {k:'results',en:'Send me my screening results',es:'Envíenme los resultados de mis pruebas',contact:true},
        {k:'prayer',en:"I'd like prayer",es:'Me gustaría que oren por mí',contact:false},
        {k:'visit',en:"I'd like a visit",es:'Me gustaría recibir una visita',contact:true},
        {k:'nothing',en:'Nothing more, thank you',es:'Nada más, gracias',contact:false},
        {k:'news',en:'Tell me about other events',es:'Avísenme de otras actividades',contact:true,off:true}]};
const ABUSE={lang:'en',kind:'abuse',look:'calm',cadence:'event',church:'Sampleton SDA (SAMPLE)',title:{en:'',es:''},day:null,parent:false,note:true,
  partner:{name:'Bucks County Women’s Center',line:'215-555-0101'},
  opts:[{k:'talk',en:"I'd like to talk with someone from the church",es:'Me gustaría hablar con alguien de la iglesia',contact:true},
        {k:'prayer',en:"I'd like prayer",es:'Me gustaría que oren por mí',contact:false},
        {k:'nothing',en:'Nothing more, thank you',es:'Nada más, gracias',contact:false}]};
const clone=o=>JSON.parse(JSON.stringify(o));

console.log('-- status and request hygiene --');
let r=await get('');
c('GET answers status', [r.status,r.j.ok,r.j.fn,r.j.codeRequired,r.j.regRequired], [200,true,'connect-1.0',false,false]);
r=await post({op:'status'});
c('POST op:status too', [r.j.ok,r.j.fn], [true,'connect-1.0']);
r=await post({op:'nonsense'}); c('unknown op → 400', [r.status,r.j.error], [400,'unknown-op']);
r=await post('{not json'); c('bad JSON → 400', [r.status,r.j.error], [400,'bad-json']);
r=await post('[1]'); c('an array is not a request → 400', r.status, 400);
r=await call(new Request(URL0,{method:'PUT',body:'{}'})); c('other methods → 405', r.status, 405);
r=await call(new Request(URL0,{method:'POST',headers:{'content-type':'text/plain'},body:'{"op":"status"}'}));
c('a POST that is not JSON → 415', [r.status,r.j.error], [415,'content-type']);
r=await post({op:'status'},{'sec-fetch-site':'cross-site'}); c('a cross-site POST → 403', [r.status,r.j.error], [403,'cross-site']);
r=await post({op:'submit',pad:'x'.repeat(17*1024)}); c('a body over 16 KB → 413', [r.status,r.j.error], [413,'too-large']);
r=await post({op:'status'},{'content-length':String(20*1024)}); c('S1: a declared length over 16 KB → 413 before anything is read', [r.status,r.j.error], [413,'too-large']);
r=await post({op:'submit',name:'é'.repeat(8300)}); c('S1: 16 KB counted in bytes, not characters (é is two) → 413', [r.status,r.j.error], [413,'too-large']);
r=await get('?op=pull&id=ABCDEFGHJK'); c('pull is never a GET → 405', r.status, 405);

console.log('\n-- create --');
r=await post({op:'create',card:HEALTH},{},ip('10.0.0.1'));
c('a card is made', [r.status,r.j.ok,r.j.v], [200,true,1]);
const ID=r.j.id, KEY=r.j.key;
c('its id is 10 characters with no 0/O/1/I/L', /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/.test(ID));
c('its key is 43 url-safe characters', /^[A-Za-z0-9_-]{43}$/.test(KEY));
let cd=S.peek('c/'+ID);
c('stored with a SHA-256 of the key, never the key', [/^[0-9a-f]{64}$/.test(cd.keyHash), JSON.stringify(cd).includes(KEY)], [true,false]);
c('the card keeps its words, choices and day', [cd.kind,cd.cadence,cd.opts.length,cd.opts[6].off,cd.day], ['health','event',7,true,HEALTH.day]);
// every rule of a card
const bad=async(mut,where,label)=>{ const k=clone(HEALTH); mut(k); const x=await post({op:'create',card:k},{},ip('10.0.0.9')); c('bad card: '+label, [x.status,x.j.error,x.j.where], [400,'bad-card',where]); };
await bad(k=>{ k.lang='fr'; },'lang','language');
await bad(k=>{ k.kind='party'; },'kind','kind');
await bad(k=>{ k.cadence='ongoing'; },'cadence','an ongoing ministry gets no card');
await bad(k=>{ k.church='1234'; },'church','a church with no letter');
await bad(k=>{ k.church='<b>SDA</b>'; },'church','markup in the church');
await bad(k=>{ k.church='Visit www.example.com'; },'church','a web address in the church');
await bad(k=>{ k.title={en:'',es:''}; },'title','no event name (not an abuse card)');
await bad(k=>{ k.title={en:'x'.repeat(81),es:''}; },'title','a title over 80');
await bad(k=>{ k.day='2026-13-40'; },'day','an impossible day');
await bad(k=>{ k.day=utcDay(Date.now()+500*864e5); },'day','a day over 400 days away');
await bad(k=>{ k.parent='yes'; },'parent','parent must be a boolean');
await bad(k=>{ k.note=1; },'note','note must be a boolean');
await bad(k=>{ k.opts=k.opts.slice(0,2); },'opts','fewer than 3 choices');
await bad(k=>{ k.opts.push({k:'prayer',en:'x',es:'x',contact:false}); },'opts','a choice twice');
await bad(k=>{ k.opts.push({k:'raffle',en:'Enter to win',es:'x',contact:true}); },'opts','an unknown choice (no raffles)');
await bad(k=>{ k.opts.push({k:'c3',en:'Mine',es:'Mío',contact:false}); },'opts','a third choice of his own');
await bad(k=>{ k.opts=k.opts.filter(o=>o.k!=='prayer'); },'always','"I\'d like prayer" is always there');
await bad(k=>{ k.opts.find(o=>o.k==='nothing').off=true; },'always','"Nothing more" is always there');
await bad(k=>{ k.opts.find(o=>o.k==='prayer').contact=true; },'contact','prayer never needs contact');
await bad(k=>{ k.opts.find(o=>o.k==='visit').contact=false; },'contact','a visit always needs contact');
await bad(k=>{ k.opts.find(o=>o.k==='recipes').en='<script>x'; },'label','markup in a choice');
await bad(k=>{ k.opts.find(o=>o.k==='recipes').en='x'.repeat(91); },'label','a choice over 90 characters');
await bad(k=>{ k.opts.find(o=>o.k==='recipes').en=''; k.opts.find(o=>o.k==='recipes').es=''; },'label','a choice with no words');
await bad(k=>{ k.opts.find(o=>o.k==='news').off=false; k.opts.push({k:'c1',en:'Mine',es:'Mío',contact:false}); k.opts.push({k:'help',en:'Help',es:'Ayudar',contact:true}); },'opts','more than 8 choices on');
await bad(k=>{ k.opts.push({k:'talk',en:'Talk',es:'Hablar',contact:true}); },'talk','"talk" is only for an abuse card');
await bad(k=>{ k.partner={name:'Agency',line:'see https://x.org'}; },'partner','a web address as the partner line');
{ const k=clone(ABUSE); k.opts.push({k:'visit',en:"I'd like a visit",es:'Una visita',contact:true});
  const x=await post({op:'create',card:k}); c('an abuse card never offers a visit', [x.status,x.j.where], [400,'visit']); }
{ const x=await post({op:'create',card:ABUSE},{},ip('10.0.0.2')); c('an abuse card may carry no event name', [x.status,x.j.ok], [200,true]); }
{ const k=clone(HEALTH); k.pad='y'.repeat(13*1024); const x=await post({op:'create',card:k}); c('a card over 12 KB → 413', [x.status,x.j.error], [413,'too-large']); }
// DESIGN C2.1: the card's look (one of nine, required) and when the next step starts (optional, both languages, 60 at most)
{ const LOOKS=['health','food','family','youth','music','prayer','seasons','calm','general'], ok=[];
  for(const [i,lk] of LOOKS.entries()){ const k=clone(HEALTH); k.look=lk; const x=await post({op:'create',card:k},{},ip('10.0.7.'+i)); ok.push(x.status===200&&S.peek('c/'+x.j.id).look===lk); }
  c('C2.1: every one of the nine looks is accepted and kept', ok.every(Boolean)); }
await bad(k=>{ k.look='party'; },'look','a look that is not one of the nine');
await bad(k=>{ delete k.look; },'look','no look (required)');
await bad(k=>{ k.look=['health']; },'look','a look that is not a word');
await bad(k=>{ k.nextWhen={en:'x'.repeat(61),es:''}; },'nextWhen','"It starts" over 60 characters');
await bad(k=>{ k.nextWhen={en:'',es:'<b>martes</b>'}; },'nextWhen','markup in "It starts"');
await bad(k=>{ k.nextWhen={en:'see www.example.com',es:''}; },'nextWhen','a web address in "It starts"');
await bad(k=>{ k.nextWhen='Tuesdays'; },'nextWhen','"It starts" that is not {en, es}');
{ const k=clone(HEALTH); delete k.nextWhen; const x=await post({op:'create',card:k},{},ip('10.0.8.1'));
  c('C2.1: "It starts" may be left out: kept as empty words', [x.status,S.peek('c/'+x.j.id).nextWhen], [200,{en:'',es:''}]); }
// S7: the card is rebuilt field by field
{ const k=clone(HEALTH); k.evil='<script>'; k.keyHash='0'.repeat(64); k.church='Sample‮ton​ SDA\u0007'; const x=await post({op:'create',card:k},{},ip('10.0.8.2'));
  const st=S.peek('c/'+x.j.id);
  c('S7: unknown fields dropped, a sent keyHash never kept, control / bidi / invisible characters stripped', [x.status,'evil' in st,st.keyHash==='0'.repeat(64),st.church], [200,false,false,'Sample ton SDA']); }
await bad(k=>{ k.opts.push({k:'constructor',en:'x',es:'x',contact:true}); },'opts','S7: a choice called "constructor"');
await bad(k=>{ k.opts.push({k:'__proto__',en:'x',es:'x',contact:true}); },'opts','S7: a choice called "__proto__"');
// ten an hour from one address
{ let last; for(let i=0;i<10;i++) last=await post({op:'create',card:HEALTH},{},ip('10.0.0.3'));
  c('ten cards an hour from one address', last.status, 200);
  last=await post({op:'create',card:HEALTH},{},ip('10.0.0.3')); c('the eleventh → 429 slow-down', [last.status,last.j.error], [429,'slow-down']);
  last=await post({op:'create',card:HEALTH},{},ip('10.0.0.4')); c('another address is not held up', last.status, 200); }
// S8: an IPv6 address counts as its /64 network
{ let last; for(let i=0;i<10;i++) last=await post({op:'create',card:HEALTH},{},ip('2001:db8:1:2::'+(i+1)));
  last=await post({op:'create',card:HEALTH},{},ip('2001:db8:1:2:ffff:ffff:ffff:9'));
  c('S8: a second address in the same IPv6 /64 shares the limit → 429', [last.status,last.j.error], [429,'slow-down']);
  last=await post({op:'create',card:HEALTH},{},ip('2001:db8:1:3::1')); c('S8: the next /64 is not held up', last.status, 200); }
// S8: the day limits for cards (poked counters: the same day, at the limit)
{ const g=S.peek('g/new');
  S.poke('g/new',{...g,n:200}); const x=await post({op:'create',card:HEALTH},{},ip('10.0.9.1'));
  c('S8: 200 cards a day without registration, for the whole site → 429 site-busy', [x.status,x.j.error], [429,'site-busy']);
  S.poke('g/new',{...g,n:0}); }
// codes and registration, as present.mjs
process.env.TERRAIN_CODES='PA-2026-K7M2:Pennsylvania Conference@Pennsylvania'; process.env.TERRAIN_REQUIRE_CODE='1';
r=await post({op:'create',card:HEALTH},{},ip('10.0.1.1')); c('codes required: none → 401 nocode', [r.status,r.j.error], [401,'nocode']);
r=await post({op:'create',card:HEALTH},{'x-terrain-code':'pa-2026-k7m2'},ip('10.0.1.1')); c('codes required: a listed code works', r.status, 200);
delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.TERRAIN_CODES;
const SECRET='s'.repeat(40); process.env.TERRAIN_REG_SECRET=SECRET;
const regTok=(id='AbCdEfGhIjKl',t=Date.now())=>{ const iat=Math.floor(t/1000).toString(36); return `r1.${id}.${iat}.`+createHmac('sha256',SECRET).update(`terrain-reg|r1|${id}|${iat}`,'utf8').digest('base64url').slice(0,32); };
r=await post({op:'status'}); c('status says registration is required', r.j.regRequired, true);
r=await post({op:'create',card:HEALTH},{},ip('10.0.2.1')); c('registration on: no token → 401 noreg', [r.status,r.j.error], [401,'noreg']);
r=await post({op:'create',card:HEALTH},{'x-terrain-reg':(t=>t.slice(0,-1)+(t.endsWith('A')?'B':'A'))(regTok())},ip('10.0.2.1')); c('a forged token → 401', r.status, 401);   // v10.46.0: the forged last letter always differs (it was 'A', which failed 1 run in 64)
r=await post({op:'create',card:HEALTH},{'x-terrain-reg':regTok('AbCdEfGhIjKl',Date.now()-181*864e5)},ip('10.0.2.1')); c('a token over 180 days old → 401', r.status, 401);
{ let last; for(let i=0;i<20;i++) last=await post({op:'create',card:HEALTH},{'x-terrain-reg':regTok('RegOne123456')},ip('10.0.3.'+(i%2)));
  c('twenty cards a day for one registration', last.status, 200);
  last=await post({op:'create',card:HEALTH},{'x-terrain-reg':regTok('RegOne123456')},ip('10.0.3.9')); c('the twenty-first → 429', [last.status,last.j.error], [429,'slow-down']);
  last=await post({op:'create',card:HEALTH},{'x-terrain-reg':regTok('RegTwo123456')},ip('10.0.3.9')); c('another registration is not held up', last.status, 200);
  const g=S.peek('g/new'); S.poke('g/new',{...g,tn:1000});
  last=await post({op:'create',card:HEALTH},{'x-terrain-reg':regTok('RegThree1234')},ip('10.0.3.8'));
  c('S8: 1,000 cards a day for all registrations together → 429 site-busy', [last.status,last.j.error], [429,'site-busy']);
  S.poke('g/new',{...S.peek('g/new'),tn:0}); }
delete process.env.TERRAIN_REG_SECRET;
r=await post({op:'submit',id:ID,once:once(),adult:true,name:'Ana',picks:['prayer'],lang:'en',ms:9000},{'sec-fetch-site':'same-origin'},ip('10.1.0.1'));
c('people filling in a card never need a code or a token', [r.status,r.j.ok], [200,true]);

console.log('\n-- the public card --');
r=await get('?op=card&id='+ID);
c('GET op=card answers the words and the choices that are on', [r.status,r.j.closed,r.j.card.opts.map(o=>o.k)], [200,false,['next','recipes','results','prayer','visit','nothing']]);
c('nothing private in it', /keyHash|subs|upd|"last"|"seen"|past|off/.test(JSON.stringify(r.j)), false);
c('C2.1: the phone gets the look and "It starts", so it draws the card from the card alone', [r.j.card.look,r.j.card.nextWhen], ['health',HEALTH.nextWhen]);
r=await get('?op=card&id='+ID.toLowerCase()); c('the id may be typed in lower case', [r.status,r.j.id], [200,ID]);
r=await get('?op=card&id=ABCDEFGHI0'); c('a 0 is never in an id → 400 bad-id', [r.status,r.j.error], [400,'bad-id']);
r=await get('?op=card&id=ABCDEFGHJK'); c('an unknown card → 404 no-card', [r.status,r.j.error], [404,'no-card']);

console.log('\n-- submit --');
const T1=once();
const ANA={op:'submit',id:ID,once:T1,adult:true,name:'  Ana  María ',picks:['next','recipes'],reach:{t:'phone',v:' (215) 555-0134 '},consent:true,note:'Line one\r\nLine two',lang:'es',ms:12000};
r=await post(ANA,{},ip('10.1.0.2'));
c('a response is taken', [r.status,r.j.ok,/^[A-Za-z0-9_-]{12}$/.test(r.j.rid)], [200,true,true]);
const RID1=r.j.rid;
c('the answer carries nothing but ok and the id', Object.keys(r.j).sort(), ['ok','rid']);
let rec=S.peek(`r/${ID}/${RID1}`);
c('stored: the name tidied, the phone as typed (tidied), the picks, the note with its line break, the language',
  [rec.name,rec.reach,rec.picks,rec.note,rec.lang,typeof rec.consent,rec.safe,rec.taken], ['Ana María',{t:'phone',v:'(215) 555-0134'},['next','recipes'],'Line one\nLine two','es','number',null,null]);
c('only the token\'s hash is kept', [/^[0-9a-f]{64}$/.test(rec.tokenHash), JSON.stringify(rec).includes(T1)], [true,false]);
c('kept a year at most', Math.round((rec.expires-rec.ts)/864e5)>=365&&Math.round((rec.expires-rec.ts)/864e5)<=366);
c('its marker is there', !!S.peek(`x/${utcDay(rec.expires)}/r/${ID}/${RID1}`));
r=await post(ANA,{},ip('10.1.0.2'));
c('the same send again (a lost answer) → the same id, one record', [r.status,r.j.rid,S.keys(`r/${ID}/`).length], [200,RID1,2]);
// only what is needed
r=await post({op:'submit',id:ID,once:once(),adult:true,name:'Bo',picks:['prayer'],reach:{t:'email',v:'bo@example.org'},consent:true,ms:5000},{},ip('10.1.0.3'));
rec=S.peek(`r/${ID}/${r.j.rid}`);
c('prayer only: the address sent anyway is dropped, never stored', [rec.reach,rec.consent,JSON.stringify(rec).includes('bo@example.org')], [null,null,false]);
// under 18 (S6)
{ const before=S.keys('').join('|'), w0=S.writes.length, sub0=JSON.stringify(S.peek('g/sub'));
  r=await post({op:'submit',id:ID,once:once(),adult:false,name:'Kid',picks:['prayer'],ms:5000},{},ip('10.1.0.4'));
  c('under 18 → 403 minor', [r.status,r.j.error], [403,'minor']);
  c('and nothing at all was written or counted', S.keys('').join('|'), before);
  c('S6: not one store write (spied), the hourly counter untouched', [S.writes.length-w0,JSON.stringify(S.peek('g/sub'))], [0,sub0]); }
// D11: nothing required beyond the first name — no tick means "nothing more", kept as []
{ r=await post({op:'submit',id:ID,once:once(),adult:true,name:'Nia',picks:[],reach:{t:'phone',v:'2155550100'},consent:true,ms:5000},{},ip('10.1.0.6'));
  const rec2=S.peek(`r/${ID}/${r.j.rid}`);
  c('D11: a first name alone is taken; picks [] kept as []; a phone sent anyway is dropped', [r.status,rec2.picks,rec2.reach,rec2.consent], [200,[],null,null]); }
{ const x=await post({op:'submit',id:ID,once:once(),adult:true,name:'Ola',picks:['next','recipes','results','prayer','visit','nothing','news','c1','c2'],ms:5000},{},ip('10.1.0.7'));
  c('nine picks → 400 bad-picks', [x.status,x.j.error], [400,'bad-picks']); }
{ const x=await post({op:'submit',id:ID,once:once(),adult:true,name:'Ola',picks:'prayer',ms:5000},{},ip('10.1.0.7'));
  c('picks that are not a list → 400 bad-picks', [x.status,x.j.error], [400,'bad-picks']); }
{ const x=await post({op:'submit',id:ID,once:once(),adult:true,name:'‮Ola​',picks:['prayer'],ms:5000},{},ip('10.1.0.7'));
  c('S7: a name with bidi and invisible characters is kept without them', S.peek(`r/${ID}/${x.j.rid}`).name, 'Ola'); }
// S12: the marker is written before the record, so a response is never stored without one
{ const w0=S.writes.length; const x=await post({op:'submit',id:ID,once:once(),adult:true,name:'Pia',picks:['prayer'],ms:5000},{},ip('10.1.0.8'));
  const ws=S.writes.slice(w0).filter(w=>w.includes(x.j.rid));
  c('S12: the expiry marker first, then the response', [ws.length,/^set x\//.test(ws[0]||''),/^set r\//.test(ws[1]||'')], [2,true,true]); }
// S4: ids are checked before any blob key is built
{ const n0=S.seen.length;
  const xs=[await post({op:'submit',id:'../../c/ABCDEFGHJK',once:once(),adult:true,name:'Al',picks:['prayer'],ms:5000}),
    await get('?op=card&id=..%2Fc%2FABCDEFGHJK'),
    await post({op:'withdraw',id:ID,rid:'../../c/'+ID,token:once()}),
    await post({op:'delete',id:ID,key:KEY,rids:['a/../../../x']}),
    await post({op:'pull',id:ID,key:KEY,after:'../t/x'})];
  c('S4: a card id, a response id or a page mark with "/" or ".." is refused → 400', xs.map(x=>[x.status,x.j.error]), [[400,'bad-id'],[400,'bad-id'],[400,'bad-rid'],[400,'bad-rids'],[400,'bad-after']]);
  c('S4: …and no blob key was ever built from them', S.seen.slice(n0).filter(k=>/\.\.|\/\//.test(k)), []); }
for(const v of [undefined,'true',1,null,'yes']){ const x=await post({op:'submit',id:ID,once:once(),adult:v,name:'Al',picks:['prayer'],ms:5000});
  c('adult '+JSON.stringify(v)+' → 400 bad-adult', [x.status,x.j.error], [400,'bad-adult']); }
// the honeypot and the too-fast form
{ const n0=S.keys(`r/${ID}/`).length;
  r=await post({op:'submit',id:ID,once:once(),adult:true,name:'Bot',picks:['prayer'],hp:'http://spam.example',ms:9000},{},ip('10.1.0.5'));
  c('the hidden field filled: a quiet ok…', [r.status,r.j.ok], [200,true]);
  r=await post({op:'submit',id:ID,once:once(),adult:true,name:'Bot',picks:['prayer'],ms:400},{},ip('10.1.0.5'));
  c('sent 0.4 s after it was shown: a quiet ok…', [r.status,r.j.ok], [200,true]);
  c('…and nothing kept', S.keys(`r/${ID}/`).length, n0); }
// every refusal
const sub=(o,a='10.1.1.1')=>post({op:'submit',id:ID,once:once(),adult:true,name:'Cy',picks:['prayer'],ms:5000,...o},{},ip(a));
const refuse=async(o,err,label)=>{ const x=await sub(o); c(label+' → '+err, [x.status,x.j.error], [400,err]); };
// (v10.43 D11, the pastor's "nothing required beyond the first name": no choice is now taken, above)
await refuse({picks:['raffle']},'bad-picks','a choice not on the card');
await refuse({picks:['news']},'bad-picks','a choice that is off');
await refuse({picks:['nothing','prayer']},'bad-picks','"Nothing more" with something else');
await refuse({picks:['recipes']},'need-reach','a choice that needs contact, with no contact');
await refuse({picks:['recipes'],reach:{t:'phone',v:'215-555-0134'}},'need-consent','contact without the consent tick');
await refuse({picks:['recipes'],reach:{t:'phone',v:'215-555-0134'},consent:'yes'},'bad-consent','consent that is not a boolean');
await refuse({picks:['recipes'],reach:{t:'phone',v:'call me'},consent:true},'bad-phone','a phone with letters');
await refuse({picks:['recipes'],reach:{t:'phone',v:'12345'},consent:true},'bad-phone','a phone of five digits');
await refuse({picks:['recipes'],reach:{t:'phone',v:'1234567890123456'},consent:true},'bad-phone','a phone of sixteen digits');
await refuse({picks:['recipes'],reach:{t:'email',v:'ana@'},consent:true},'bad-email','a broken email');
// v10.43 (review, 1 Oct 2026): an "email" that carries a query, a fragment or a path would bend a mailto: link on his list
// (a hidden Bcc, a body someone else wrote): refused. Only letters, digits, dots and hyphens after the @.
for(const v of ['a@b.co?bcc=x%40evil.example&body=hi','a@b.co#frag','a@b.co/x','a%40b@b.co','a&b=c@b.co','a@b_c.co','a@b.co&x=1'])
  await refuse({picks:['recipes'],reach:{t:'email',v},consent:true},'bad-email','an email shaped like a link ('+v+')');
{ const x=await sub({picks:['recipes'],reach:{t:'email',v:'ana.maria+fair@correo-ejemplo.org'},consent:true});
  c('…an ordinary address with a dot, a plus and a hyphen is kept', x.status, 200); }
await refuse({picks:['recipes'],reach:{t:'fax',v:'1'},consent:true},'bad-reach','a way of reach that is neither');
await refuse({name:''},'bad-name','no name');
await refuse({name:'12345'},'bad-name','a name with no letter');
await refuse({name:'<img src=x>'},'bad-name','markup as a name');
await refuse({name:'Ana www.example.com'},'bad-name','a web address as a name');
await refuse({name:'ana@example.org'},'bad-name','an email as a name');
await refuse({name:'A'.repeat(41)},'bad-name','a name over 40');
await refuse({note:'x'.repeat(501)},'bad-note','a note over 500');
await refuse({note:'see <a href=x>'},'bad-note','markup in a note');
await refuse({note:'buy at cheap-pills.com'},'bad-note','a web address in a note');
await refuse({once:'short'},'bad-once','no proper token');
{ const x=await sub({note:'I <3 this church'}); c('"<3" is not markup', [x.status,S.peek(`r/${ID}/${x.j.rid}`).note], [200,'I <3 this church']); }
// notes off
{ const k=clone(HEALTH); k.note=false; const m=await post({op:'create',card:k},{},ip('10.0.5.1'));
  const x=await post({op:'submit',id:m.j.id,once:once(),adult:true,name:'Di',picks:['prayer'],note:'a note',ms:5000},{},ip('10.1.2.1'));
  c('a card with notes off: a note sent anyway is dropped', S.peek(`r/${m.j.id}/${x.j.rid}`).note, ''); }
// the abuse card's question
const AB=(await post({op:'create',card:ABUSE},{},ip('10.0.6.1'))).j;
{ let x=await post({op:'submit',id:AB.id,once:once(),adult:true,name:'J',picks:['talk'],reach:{t:'phone',v:'2155550199'},consent:true,ms:5000},{},ip('10.1.3.1'));
  c('abuse card, "talk": "may we leave a message" must be answered', [x.status,x.j.error], [400,'bad-safe']);
  x=await post({op:'submit',id:AB.id,once:once(),adult:true,name:'J',picks:['talk'],reach:{t:'phone',v:'2155550199'},consent:true,safe:false,ms:5000},{},ip('10.1.3.1'));
  c('…and kept (an initial is a name)', [x.status,S.peek(`r/${AB.id}/${x.j.rid}`).safe,S.peek(`r/${AB.id}/${x.j.rid}`).name], [200,false,'J']);
  x=await sub({picks:['recipes'],reach:{t:'phone',v:'2155550134'},consent:true,safe:true});
  c('any other card: "safe" is not kept', S.peek(`r/${ID}/${x.j.rid}`).safe, null); }

console.log('\n-- limits --');
{ const st=makeStore(); globalThis.__terrainConnectStore=st;
  const m=(await post({op:'create',card:HEALTH},{},ip('10.2.0.1'))).j;
  let last; for(let i=0;i<200;i++) last=await post({op:'submit',id:m.id,once:once(),adult:true,name:'P'+'a'.repeat(i%5),picks:['prayer'],ms:5000},{},ip('10.2.0.2'));
  c('200 an hour from one address (a whole hall on one Wi-Fi)', last.status, 200);
  last=await post({op:'submit',id:m.id,once:once(),adult:true,name:'Pat',picks:['prayer'],ms:5000},{},ip('10.2.0.2'));
  c('the 201st → 429 slow-down', [last.status,last.j.error], [429,'slow-down']);
  c('the hourly counter holds no address, only keyed tags', /10\.2\.0\.2/.test(JSON.stringify(st.peek('g/sub'))), false);
  for(let i=0;i<100;i++) last=await post({op:'submit',id:m.id,once:once(),adult:true,name:'Q',picks:['prayer'],ms:5000},{},ip('10.2.1.'+i));
  c('300 an hour for one card', last.status, 200);
  last=await post({op:'submit',id:m.id,once:once(),adult:true,name:'Q',picks:['prayer'],ms:5000},{},ip('10.2.2.1'));
  c('the 301st → 429 slow-down', [last.status,last.j.error], [429,'slow-down']);
  const g=st.peek('g/sub'); st.poke('g/sub',{...g,n:5000});
  const m2=(await post({op:'create',card:HEALTH},{},ip('10.2.0.9'))).j;
  last=await post({op:'submit',id:m2.id,once:once(),adult:true,name:'Z',picks:['prayer'],ms:5000},{},ip('10.2.3.1'));
  c('5,000 an hour on the whole site → 429 site-busy', [last.status,last.j.error], [429,'site-busy']);
  st.poke('g/sub',{...g,n:0});
  const cc=st.peek('c/'+m2.id); for(let i=0;i<3000;i++) st.poke(`r/${m2.id}/${String(i).padStart(12,'A')}`,{rid:'x',ts:Date.now(),expires:Date.now()+864e5});
  last=await post({op:'submit',id:m2.id,once:once(),adult:true,name:'Z',picks:['prayer'],ms:5000},{},ip('10.2.3.2'));
  c('3,000 on file → 409 card-full (S23: the phone is told to use the paper card)', [last.status,last.j.error], [409,'card-full']);
  const m3=(await post({op:'create',card:HEALTH},{},ip('10.2.0.8'))).j; const c3=st.peek('c/'+m3.id), today=utcDay(Date.now());
  st.poke('c/'+m3.id,{...c3,subs:{hour:'',h:0,day:today,d:1000}});
  last=await post({op:'submit',id:m3.id,once:once(),adult:true,name:'Z',picks:['prayer'],ms:5000},{},ip('10.2.3.3'));
  c('S8: 1,000 a day for one card → 429 slow-down', [last.status,last.j.error], [429,'slow-down']);
  globalThis.__terrainConnectStore=S; }
// S11: compare-and-swap; a store that never lets the write land answers 503 busy (and writes nothing half-way)
{ const st=makeStore(); globalThis.__terrainConnectStore=st;
  const m=(await post({op:'create',card:HEALTH},{},ip('10.2.4.1'))).j;
  const real=st.setJSON; st.setJSON=async(k,v,o={})=>o.onlyIfMatch?{modified:false}:real(k,v,o);
  const x=await post({op:'update',id:m.id,key:m.key,card:HEALTH});
  c('S11: a write that keeps losing the race → 503 busy, the card unchanged', [x.status,x.j.error,st.peek('c/'+m.id).v], [503,'busy',1]);
  globalThis.__terrainConnectStore=S; }

console.log('\n-- pull, ack, delete, withdraw --');
r=await post({op:'pull',id:ID,key:'x'.repeat(43)}); c('pull with a wrong key → 403', [r.status,r.j.error], [403,'bad-key']);
r=await post({op:'pull',id:ID}); c('pull with no key → 403', r.status, 403);
r=await post({op:'pull',id:ID,key:KEY});
const items=r.j.items;
c('pull lists every response, oldest first', [r.status,items.length>=5,items.every((x,i)=>i===0||items[i-1].ts<=x.ts)], [200,true,true]);
const ana=items.find(x=>x.rid===RID1);
c('each with its words', [ana.name,ana.picks,ana.reach.v,ana.note,ana.lang,ana.taken], ['Ana María',['next','recipes'],'(215) 555-0134','Line one\nLine two','es',null]);
c('the card comes with every choice, off ones marked', r.j.card.opts.find(o=>o.k==='news').off, true);
c('C2.1: pull returns the look and "It starts" too', [r.j.card.look,r.j.card.nextWhen.en], ['health','Tuesday evenings from November 3']);
c('D11: the first name alone comes back with picks []', items.filter(x=>x.name==='Nia').map(x=>x.picks), [[]]);
c('no hash in it', /tokenHash|keyHash|[0-9a-f]{64}/.test(JSON.stringify(r.j)), false);
r=await post({op:'ack',id:ID,key:KEY,rids:[RID1]});
rec=S.peek(`r/${ID}/${RID1}`);
c('ack: taken, and kept 30 days more at most', [r.j.taken,typeof rec.taken,Math.round((rec.expires-Date.now())/864e5)], [1,'number',30]);
c('its marker moved to the new day', [!!S.peek(`x/${utcDay(rec.expires)}/r/${ID}/${RID1}`), S.keys(`x/`).filter(k=>k.endsWith(`/r/${ID}/${RID1}`)).length], [true,1]);
r=await post({op:'ack',id:ID,key:KEY,rids:[RID1]}); c('ack again changes nothing', r.j.taken, 0);
r=await post({op:'ack',id:ID,key:KEY,rids:['bad']}); c('ack with a bad id → 400', [r.status,r.j.error], [400,'bad-rids']);
// withdraw by the person (token = once)
r=await post({op:'withdraw',id:ID,rid:RID1,token:once()}); c('withdraw with another token → 403', [r.status,r.j.error], [403,'bad-token']);
r=await post({op:'withdraw',id:ID,rid:RID1,token:T1});
c('withdraw with the phone\'s own token: gone, marker too', [r.j.ok,S.peek(`r/${ID}/${RID1}`),S.keys('x/').filter(k=>k.includes(RID1)&&k.includes('/r/')).length], [true,null,0]);
c('taken before: a tombstone tells the pastor\'s device', !!S.peek(`t/${ID}/${RID1}`));
r=await post({op:'pull',id:ID,key:KEY}); c('pull lists it under gone', r.j.gone.includes(RID1));
r=await post({op:'withdraw',id:ID,rid:RID1,token:T1}); c('withdraw again: ok (nothing is kept either way)', r.j.ok, true);
{ const T2=once(); const x=await post({op:'submit',id:ID,once:T2,adult:true,name:'Eve',picks:['prayer'],ms:5000},{},ip('10.1.4.1'));
  await post({op:'withdraw',id:ID,rid:x.j.rid,token:T2});
  // v10.43 (review, 1 Oct 2026): a withdrawal always leaves a tombstone ({ts, expires} only, 30 days). His device may have pulled
  // the answer and not yet said "taken" (the ack can fail on a weak signal); without it the person stayed on his device for a year
  // while their phone said "Removed. Nothing you sent is kept." (was: 'not taken yet: no tombstone needed').
  c('not taken yet: a tombstone all the same (holds no name)', [!!S.peek(`t/${ID}/${x.j.rid}`),Object.keys(S.peek(`t/${ID}/${x.j.rid}`)||{}).sort()], [true,['expires','ts']]); }
// pulled, then withdrawn before the ack landed: the next pull says gone
{ const T3=once(); const x=await post({op:'submit',id:ID,once:T3,adult:true,name:'Gia',picks:['prayer'],ms:5000},{},ip('10.1.4.2'));
  const p1=await post({op:'pull',id:ID,key:KEY});
  const w=await post({op:'withdraw',id:ID,rid:x.j.rid,token:T3});
  const p2=await post({op:'pull',id:ID,key:KEY});
  c('pull → withdraw (no ack yet) → pull: the second pull lists it under gone, and not as an answer', [p1.j.items.some(i=>i.rid===x.j.rid),w.j.ok,p2.j.items.some(i=>i.rid===x.j.rid),p2.j.gone.includes(x.j.rid)], [true,true,false,true]);
  c('…its tombstone has an expiry marker (the sweep removes it in 30 days)', S.keys('x/').filter(k=>k.endsWith(`/t/${ID}/${x.j.rid}`)).length, 1); }
// the pastor deletes
{ const x=await sub({name:'Fay'}); r=await post({op:'delete',id:ID,key:KEY,rids:[x.j.rid,'AAAAAAAAAAAA']});
  c('delete: gone, the unknown one ignored', [r.j.deleted,S.peek(`r/${ID}/${x.j.rid}`)], [1,null]);
  r=await post({op:'delete',id:ID,key:KEY,rids:Array(501).fill(0).map((_,i)=>String(i).padStart(12,'B'))}); c('more than 500 at once → 400', r.status, 400); }
// paging
{ const st=makeStore(); globalThis.__terrainConnectStore=st;
  const m=(await post({op:'create',card:HEALTH},{},ip('10.3.0.1'))).j;
  for(let i=0;i<1200;i++) st.poke(`r/${m.id}/${String(i).padStart(12,'C')}`,{rid:String(i).padStart(12,'C'),ts:i,expires:Date.now()+864e5,name:'N'+i,picks:['prayer'],lang:'en'});
  let got=0, after=null, pages=0; do{ const x=await post(after?{op:'pull',id:m.id,key:m.key,after}:{op:'pull',id:m.id,key:m.key}); got+=x.j.items.length; after=x.j.next||null; pages++; }while(after&&pages<10);
  c('1,200 come in three pages', [got,pages], [1200,3]);
  st.poke(`r/${m.id}/AAAAAAAAAAAA`,{rid:'AAAAAAAAAAAA',ts:1,expires:Date.now()-1000,name:'Old',picks:['prayer']}); st.poke(`x/${utcDay(Date.now()-1000)}/r/${m.id}/AAAAAAAAAAAA`,{});
  const x=await post({op:'pull',id:m.id,key:m.key});
  c('an expired response is deleted on sight, marker too', [x.j.items.some(i=>i.rid==='AAAAAAAAAAAA'),st.peek(`r/${m.id}/AAAAAAAAAAAA`),st.keys('x/').filter(k=>k.includes('AAAAAAAAAAAA')).length], [false,null,0]);
  globalThis.__terrainConnectStore=S; }

console.log('\n-- update, close, remove --');
{ const k=clone(HEALTH); k.opts=k.opts.filter(o=>o.k!=='results'); k.opts.find(o=>o.k==='recipes').en='Send me the recipes';
  r=await post({op:'update',id:ID,key:KEY,card:k});
  c('update: a new version', [r.status,r.j.v], [200,2]);
  r=await post({op:'pull',id:ID,key:KEY});
  c('the words of a removed choice are kept to label older answers', r.j.card.past.results, {en:'Send me my screening results',es:'Envíenme los resultados de mis pruebas'});
  c('new words shown to phones', (await get('?op=card&id='+ID)).j.card.opts.find(o=>o.k==='recipes').en, 'Send me the recipes');
  r=await post({op:'update',id:ID,key:'y'.repeat(43),card:k}); c('update with a wrong key → 403', r.status, 403);
  const a=clone(ABUSE); a.opts.push({k:'visit',en:'Visit',es:'Visita',contact:true});
  r=await post({op:'update',id:AB.id,key:AB.key,card:a}); c('an abuse card cannot be given a visit later', [r.status,r.j.where], [400,'visit']);
  let last; for(let i=0;i<59;i++) last=await post({op:'update',id:ID,key:KEY,card:k});
  c('60 updates an hour', last.status, 200);
  last=await post({op:'update',id:ID,key:KEY,card:k}); c('the 61st → 429', [last.status,last.j.error], [429,'slow-down']); }
r=await post({op:'close',id:ID,key:KEY}); c('close', [r.j.ok,r.j.closed], [true,true]);
r=await sub({}); c('a closed card takes nothing → 410', [r.status,r.j.error], [410,'closed']);
c('the phone is told it is closed', (await get('?op=card&id='+ID)).j.closed, true);
r=await post({op:'close',id:ID,key:KEY,open:true}); c('reopen', r.j.closed, false);
r=await sub({}); c('open again: taken', r.status, 200);
{ const T3=once(); const x=await post({op:'submit',id:ID,once:T3,adult:true,name:'Gus',picks:['prayer'],ms:5000},{},ip('10.1.5.1'));
  await post({op:'ack',id:ID,key:KEY,rids:[x.j.rid]}); await post({op:'withdraw',id:ID,rid:x.j.rid,token:T3});
  r=await post({op:'remove',id:ID,key:KEY});
  c('remove: the card and every response and tombstone, now', [r.j.ok,S.peek('c/'+ID),S.keys(`r/${ID}/`).length,S.keys(`t/${ID}/`).length,S.keys('x/').filter(k=>k.includes(`/r/${ID}/`)).length], [true,null,0,0,0]);
  r=await get('?op=card&id='+ID); c('its link now says no-card', [r.status,r.j.error], [404,'no-card']); }
{ const st=makeStore(); globalThis.__terrainConnectStore=st;
  const m=(await post({op:'create',card:HEALTH},{},ip('10.4.0.1'))).j;
  for(let i=0;i<1100;i++){ const rid=String(i).padStart(12,'E'); st.poke(`r/${m.id}/${rid}`,{rid,expires:Date.now()+864e5}); st.poke(`x/${utcDay(Date.now()+864e5)}/r/${m.id}/${rid}`,{}); }
  let x=await post({op:'remove',id:m.id,key:m.key});
  c('remove, 1,100 responses: 500 a call, the card closed meanwhile', [x.j.deleted,x.j.more,st.peek('c/'+m.id).closed], [500,true,true]);
  x=await post({op:'remove',id:m.id,key:m.key}); c('…again', [x.j.deleted,x.j.more], [500,true]);
  x=await post({op:'remove',id:m.id,key:m.key}); c('…and the last: everything gone', [x.j.deleted,x.j.more,st.peek('c/'+m.id),st.keys('r/').length,st.keys('x/').length], [100,false,null,0,0]);
  globalThis.__terrainConnectStore=S; }

console.log('\n-- the sweep --');
{ const sw=await import(new URL(SWEEP, import.meta.url).href);
  const st=makeStore(); globalThis.__terrainConnectStore=st;
  const now=Date.now(), today=utcDay(now), yday=utcDay(now-864e5), tmr=utcDay(now+864e5);
  st.poke('c/AAAAAAAAAA',{cid:'AAAAAAAAAA',created:now-400*864e5,seen:today});
  const rr=(rid,exp)=>{ st.poke(`r/AAAAAAAAAA/${rid}`,{rid,expires:exp}); st.poke(`x/${utcDay(exp)}/r/AAAAAAAAAA/${rid}`,{}); };
  rr('R1xxxxxxxxxx',now-864e5); rr('R2xxxxxxxxxx',now+3600e3); rr('R3xxxxxxxxxx',now-1000); rr('R4xxxxxxxxxx',now+30*864e5);
  if(utcDay(now-1000)!==today) st.poke(`x/${today}/r/AAAAAAAAAA/R3xxxxxxxxxx`,{});
  st.poke('t/AAAAAAAAAA/T1xxxxxxxxxx',{expires:now-864e5}); st.poke(`x/${yday}/t/AAAAAAAAAA/T1xxxxxxxxxx`,{});
  st.poke('r/BBBBBBBBBB/O1xxxxxxxxxx',{expires:now+300*864e5}); st.poke(`x/${utcDay(now+300*864e5)}/r/BBBBBBBBBB/O1xxxxxxxxxx`,{});
  const out=await sw.sweep(st,now,now);
  c('due yesterday: deleted, marker too', [st.peek('r/AAAAAAAAAA/R1xxxxxxxxxx'),st.keys('x/').filter(k=>k.includes('R1x')).length], [null,0]);
  c('due within the hour (today or tomorrow): kept', !!st.peek('r/AAAAAAAAAA/R2xxxxxxxxxx'));
  c('due today and passed: deleted', st.peek('r/AAAAAAAAAA/R3xxxxxxxxxx'), null);
  c('a month away: kept', !!st.peek('r/AAAAAAAAAA/R4xxxxxxxxxx'));
  c('a tombstone past its day: deleted', st.peek('t/AAAAAAAAAA/T1xxxxxxxxxx'), null);
  c('a response whose card was removed: deleted at once', [st.peek('r/BBBBBBBBBB/O1xxxxxxxxxx'),out.orphans], [null,1]);
  // cards
  const old=utcDay(now-31*864e5);
  st.poke('c/CCCCCCCCCC',{cid:'CCCCCCCCCC',created:now-60*864e5,seen:old,last:0,day:null});
  st.poke('c/DDDDDDDDDD',{cid:'DDDDDDDDDD',created:now-60*864e5,seen:old,last:0,day:utcDay(now+20*864e5)});
  st.poke('c/EEEEEEEEEE',{cid:'EEEEEEEEEE',created:now-60*864e5,seen:old,last:0,day:null}); st.poke('r/EEEEEEEEEE/E1xxxxxxxxxx',{expires:now+864e5});
  st.poke('c/FFFFFFFFFF',{cid:'FFFFFFFFFF',created:now-60*864e5,seen:yday,last:0,day:null});
  st.poke('c/GGGGGGGGGG',{cid:'GGGGGGGGGG',created:now-90*864e5,seen:old,last:now-10*864e5,day:null});
  const cs=await sw.sweepCards(st,now,now);
  c('an unused card (no responses, not opened for 31 days): deleted', st.peek('c/CCCCCCCCCC'), null);
  c('a card printed for an event still to come: kept', !!st.peek('c/DDDDDDDDDD'));
  c('a card with a response on file: kept', !!st.peek('c/EEEEEEEEEE'));
  c('a card opened yesterday: kept', !!st.peek('c/FFFFFFFFFF'));
  c('a card whose last response was 10 days ago: kept', !!st.peek('c/GGGGGGGGGG'));
  c('one card removed', cs.removed, 1);
  const res=await sw.default(); c('the scheduled run answers ok', res.status, 200);
  globalThis.__terrainConnectStore=S; }

console.log('\n-- failures and leaks --');
globalThis.__terrainConnectStore={ async get(){ throw new Error('store down for Ana María (215) 555-0134 '+KEY+' '+T1); } };
r=await post({op:'pull',id:'ABCDEFGHJK',key:KEY}); c('a store failure → 500 server', [r.status,r.j.error], [500,'server']);
c('and only the op name was logged', logs.some(l=>/^connect: unexpected failure in op pull$/.test(l)));
globalThis.__terrainConnectStore=S;
const notPull=bodies.filter(b=>b.op!=='pull').map(b=>b.text).join('\n');
const PERSONAL=['Ana María','555-0134','bo@example.org','Line one','I <3 this church','Eve','Fay','Gus'];
// v10.43 (integration): matched as whole words. The short made-up names (Eve, Fay, Gus) can turn up by chance inside a random
// base64url key or id in a create answer (seen once in about forty runs: "Fay" inside a fresh key), which is not a leak.
const wordIn=(t,x)=>/^[A-Za-z]{1,4}$/.test(x)?new RegExp('(?<![A-Za-z0-9_-])'+x+'(?![A-Za-z0-9_-])').test(t):t.includes(x);
c('no answer but pull ever carries a name, a phone, an email or a note', PERSONAL.filter(x=>wordIn(notPull,x)), []);
const all=bodies.map(b=>b.text).join('\n');
c('no answer ever carries a hash or a stored secret field', /[0-9a-f]{64}|tokenHash|keyHash/.test(all), false);
c('no answer ever carries a phone\'s token', [T1].filter(x=>all.includes(x)).length, 0);
const logText=logs.join('\n');
c('logs never carry a name, a phone, a note, a key or a token', [...PERSONAL,KEY,T1].filter(x=>logText.includes(x)), []);
c('every answer is JSON, no-store, nosniff', badHeaders, 0);
c('S2: no answer carries a CORS header', cors, 0);
c('S4: no blob key the function built ever held ".." or "//"', S.seen.filter(k=>/\.\.|\/\//.test(k)), []);

console.log('\n-- the source (S10, S12, S14) --');
c('S10: no new environment variables (codes and registration only, as gifts and present)', [...new Set([...SRC.matchAll(/process\.env(?:\.([A-Z_]+)|\[)/g)].map(m=>m[1]||'['))].sort(), ['TERRAIN_CODES','TERRAIN_REG_SECRET','['].sort());
c('S10: the dynamic env read is only envOn(name) for TERRAIN_REQUIRE_CODE', [...SRC.matchAll(/envOn\('([A-Z_]+)'\)/g)].map(m=>m[1]), ['TERRAIN_REQUIRE_CODE']);
c('S14: the function sends nothing anywhere (no fetch, no email service)', /\bfetch\s*\(|resend|smtp|sendgrid|mailgun/i.test(SRC+SWSRC), false);
c('C2.1 / Q1: TAKEN_KEEP_DAYS is one named constant, 30 days (the recommendation; he did not answer)', SRC.match(/const TAKEN_KEEP_DAYS = (\d+);/g), ['const TAKEN_KEEP_DAYS = 30;']);
c('connect-1.0 and connect-sweep-1.0', [/const FN_VERSION = 'connect-1\.0';/.test(SRC),/connect-sweep-1\.0/.test(SWSRC)], [true,true]);
c('S12: the sweep runs daily, inside a 20-second budget', [/export const config = \{ schedule: '@daily' \};/.test(SWSRC),/const BUDGET_MS = 20000;/.test(SWSRC)], [true,true]);
c('S13: one log line only, the op name', (SRC.match(/console\.(log|error|warn|info)\(/g)||[]).length===3&&/console\.error\('connect: unexpected failure in op ' \+/.test(SRC));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
