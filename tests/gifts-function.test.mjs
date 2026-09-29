// Exercise gifts.mjs 1.1 against an in-memory store and a stubbed Resend API.
// No real storage, no real email, no network.
import { createHash, createHmac, randomBytes } from 'node:crypto';
delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.RESEND_API_KEY; delete process.env.GIFTS_FROM; delete process.env.SITE_URL; delete process.env.TERRAIN_REG_SECRET;
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,200));fail++}else pass++};

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
    poke(k,val){ m.set(k,{data:JSON.stringify(val),etag:'e'+(++n)}); }
  };
  if(etags) s.getWithMetadata=async(k)=>{ s.gets++; await tick(); const v=m.get(k); return v?{data:JSON.parse(v.data),etag:v.etag,metadata:{}}:null; };
  return s;
}
let S=makeStore(); globalThis.__terrainGiftsStore=S;

// ---- a stubbed Resend ------------------------------------------------------
let sent=[], resendOk=true;
globalThis.fetch=async(url,opts)=>{ sent.push({url,headers:opts.headers,body:JSON.parse(opts.body)});
  return {ok:resendOk,status:resendOk?200:500,json:async()=>resendOk?{id:'em_1'}:{message:'boom'}}; };

const mod=await import(new URL('../netlify/functions/gifts.mjs', import.meta.url).href);
const fn=mod.default;

// Every call goes through here: logs are captured (and must never carry a
// secret), every response must be JSON and no-store, every body is kept so the
// leak checks at the end can read all of them.
const logs=[], bodies=[]; let badHeaders=0, depth=0;
const REAL={log:console.log,error:console.error,warn:console.warn,info:console.info};
const cap=(...a)=>logs.push(a.map(String).join(' '));
async function call(req,ctx={}){
  // A depth count, not a saved copy, so overlapping calls restore correctly.
  if(depth++===0) console.log=console.error=console.warn=console.info=cap;
  let res; try{ res=await fn(req,ctx); } finally{ if(--depth===0) Object.assign(console,REAL); }
  if(res.headers.get('cache-control')!=='no-store, max-age=0'||!/json/.test(res.headers.get('content-type')||'')) badHeaders++;
  const text=await res.text(); bodies.push(text);
  return {status:res.status,j:JSON.parse(text)};
}
const URL0='https://x/.netlify/functions/gifts';
const post=(body,headers={},ctx={},url=URL0)=>call(new Request(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)}),ctx);
const utcDay=t=>new Date(t).toISOString().slice(0,10);
const mark=(p,rid,exp)=>`x/${utcDay(exp)}/${p}/${rid}`;
const code=(n=1)=>'TG1-'+Buffer.from(JSON.stringify({v:4,name:'Member '+n,chars:'4'.repeat(105)})).toString('base64url');
const EMAIL='ana.lopez@example.org';
const plainTag=x=>createHash('sha256').update(x).digest('base64url').slice(0,22);

console.log('-- status --');
let r=await call(new Request(URL0,{method:'GET'}));
c('GET answers status', [r.status,r.j.ok,r.j.fn], [200,true,'gifts-1.2']);
c('email off when Resend is not configured', r.j.email, false);
r=await post({op:'status'});
c('POST op:status too', [r.j.ok,r.j.fn,r.j.email], [true,'gifts-1.2',false]);
r=await post({op:'nonsense'});
c('unknown op → 400', [r.status,r.j.error], [400,'unknown-op']);
r=await post({});
c('missing op → 400', r.status, 400);
r=await post('{not json');
c('bad JSON → 400', [r.status,r.j.error], [400,'bad-json']);
r=await post('[1,2]');
c('a JSON array is not a request → 400', r.status, 400);
r=await call(new Request(URL0,{method:'PUT',body:'{}'}));
c('other methods → 405', r.status, 405);
r=await post({op:'submit',pad:'x'.repeat(5*1024*1024+10)});
c('body over 5 MB → 413', [r.status,r.j.error], [413,'too-large']);

console.log('\n-- id: create a campaign --');
r=await post({op:'id',church:'  Bucks County SDA  '});
c('open when TERRAIN_CODES is unset', r.status, 200);
const PUB=r.j.pub, KEY=r.j.key;
c('pub is 12 url-safe characters', /^[A-Za-z0-9_-]{12}$/.test(PUB));
c('key is 32 url-safe characters', /^[A-Za-z0-9_-]{32}$/.test(KEY));
let camp=S.peek('c/'+PUB);
c('campaign stored with a SHA-256 of the key, never the key', [/^[0-9a-f]{64}$/.test(camp.keyHash), JSON.stringify(camp).includes(KEY)], [true,false]);
c('church trimmed and kept', camp.church, 'Bucks County SDA');
c('send counter starts empty', camp.sends.n, 0);
process.env.TERRAIN_CODES='PA-2026-K7M2:Pennsylvania Conference@Pennsylvania, OH-2026-M5RK';
// Updated for v10.38.0: pastors register on the first page instead of using a
// code, so codes are enforced only while TERRAIN_REQUIRE_CODE is '1'. The live
// site still has TERRAIN_CODES set, and must open anyway.
r=await post({op:'id'});
c('codes set but not required: open (pastors register instead)', [r.status,!!r.j.pub,!!r.j.key], [200,true,true]);
r=await post({op:'id'},{'x-terrain-code':'PA-2026-WRONG'});
c('codes set but not required: a wrong code is simply ignored', r.status, 200);
process.env.TERRAIN_REQUIRE_CODE='1';
r=await post({op:'id'});
c('codes set: no code → 401 nocode', [r.status,r.j.error], [401,'nocode']);
r=await post({op:'id'},{'x-terrain-code':'PA-2026-WRONG'});
c('codes set: wrong code → 401', r.status, 401);
r=await post({op:'id'},{'x-terrain-code':'pa-2026-k7m2'});
c('codes set: a valid code (any case) works', [r.status, !!r.j.pub, !!r.j.key], [200,true,true]);
r=await post({op:'id'},{'x-terrain-code':' OH-2026-M5RK '});
c('codes set: a code with no @Conference works', r.status, 200);
r=await post({op:'status'});
c('status needs no code', r.status, 200);
process.env.TERRAIN_REQUIRE_CODE='0';
r=await post({op:'id'});
c('"0" leaves codes off', r.status, 200);
// Updated in the v10.38.0 review (S8): "true", "yes" and "on" mean on too.
for(const v of ['true','Yes','ON']){ process.env.TERRAIN_REQUIRE_CODE=v; const x=await post({op:'id'}); c(`TERRAIN_REQUIRE_CODE=${v}: no code → 401`, [x.status,x.j.error], [401,'nocode']); }
process.env.TERRAIN_REQUIRE_CODE='maybe';
r=await post({op:'id'});
c('an unrecognised value leaves codes off, and the log says so', [r.status,logs.some(l=>/gifts: TERRAIN_REQUIRE_CODE is set, but not to 1, true, yes or on/.test(l))], [200,true]);
delete process.env.TERRAIN_REQUIRE_CODE;
delete process.env.TERRAIN_CODES;
r=await post({op:'id'});
c('unset again: open again', r.status, 200);
const PUB2=r.j.pub, KEY2=r.j.key;

console.log('\n-- submit --');
r=await post({op:'submit',pub:PUB2,code:code(),name:'Early Bird',email:'early@example.org',emailOk:true});
c('email not configured: consent alone stores no address', [r.status,r.j.hasEmail,S.peek(`r/${PUB2}/${r.j.rid}`).email,S.peek(`r/${PUB2}/${r.j.rid}`).emailOk], [200,false,null,false]);
await post({op:'delete',pub:PUB2,rid:r.j.rid,key:KEY2});
// From here to "email: off" sending is configured, so consenting adults' addresses are kept.
process.env.RESEND_API_KEY='re_test_0000000000000000'; process.env.GIFTS_FROM='Terrain <reports@pastorshub.org>';
r=await post({op:'submit',pub:PUB,code:code(1),name:'  Ana  López  ',email:EMAIL,emailOk:true,lang:'es'});
c('adult with consent → ok, rid, token', [r.status,r.j.ok,/^[A-Za-z0-9_-]{12}$/.test(r.j.rid),/^[A-Za-z0-9_-]{32}$/.test(r.j.token)], [200,true,true,true]);
c('says the address was kept', r.j.hasEmail, true);
const A={rid:r.j.rid,token:r.j.token};
let rec=S.peek(`r/${PUB}/${A.rid}`);
c('token stored only as a hash', [/^[0-9a-f]{64}$/.test(rec.tokenHash), JSON.stringify(rec).includes(A.token)], [true,false]);
// Updated for gifts-1.1: an address starts unconfirmed (vtoks, emailVerified, pdfs).
c('record shape', Object.keys(rec).sort(), ['code','email','emailOk','emailVerified','emails','expires','invites','lang','minor','name','observers','pdfs','rid','tokenHash','ts','vtoks']);
c('an address starts unconfirmed', [rec.emailVerified,rec.vtoks,rec.pdfs], [false,[],0]);
c('name tidied', rec.name, 'Ana López');
c('lang kept', rec.lang, 'es');
{ const d=new Date(rec.ts); d.setUTCFullYear(d.getUTCFullYear()+2); c('adult kept two years', rec.expires, d.getTime()); }
c('retention marker written on the day it expires', S.peek(mark(PUB,A.rid,rec.expires)), {});
r=await post({op:'submit',pub:PUB,code:code(2),name:'Ben Carter',email:'ben@example.org'});
c('an address without consent is dropped', [r.j.ok,r.j.hasEmail,S.peek(`r/${PUB}/${r.j.rid}`).email], [true,false,null]);
const B={rid:r.j.rid,token:r.j.token};
r=await post({op:'submit',pub:PUB,code:code(3),name:'Cara Diaz',email:'not an email',emailOk:true});
c('an implausible address is dropped', [r.j.ok,r.j.hasEmail], [true,false]);
r=await post({op:'submit',pub:PUB,code:code(4),name:'Dani Young',email:'dani@example.org',emailOk:true,minor:true});
c('a minor is accepted', r.j.ok, true);
c('a minor never has an address stored, even with consent', [r.j.hasEmail, S.peek(`r/${PUB}/${r.j.rid}`).email, S.peek(`r/${PUB}/${r.j.rid}`).emailOk], [false,null,false]);
const M={rid:r.j.rid,token:r.j.token};
rec=S.peek(`r/${PUB}/${M.rid}`);
{ const d=new Date(rec.ts); d.setUTCFullYear(d.getUTCFullYear()+1); c('a minor kept one year', [rec.minor,rec.expires], [true,d.getTime()]); }
c('a minor’s marker is one year out', S.peek(mark(PUB,M.rid,rec.expires)), {});
for(const bad of ['true',1,'yes',{},[true]]){
  r=await post({op:'submit',pub:PUB,code:code(),name:'Kid',minor:bad,email:'kid@example.org',emailOk:true});
  c('type confusion: minor '+JSON.stringify(bad)+' is refused, not read as adult', [r.status,r.j.error], [400,'bad-minor']);
}
c('…and no record holds the child’s address', [...S.m.values()].some(v=>v.data.includes('kid@example.org')), false);
r=await post({op:'submit',pub:PUB,code:code(),name:'Arr',email:['arr@example.org'],emailOk:true});
c('an address sent as an array is dropped', [r.j.hasEmail, S.peek(`r/${PUB}/${r.j.rid}`).email], [false,null]);
await post({op:'delete',pub:PUB,rid:r.j.rid,token:r.j.token});
r=await post({op:'submit',pub:'AAAAAAAAAAAA',code:code(),name:'X'});
c('unknown campaign → 404', [r.status,r.j.error], [404,'no-campaign']);
r=await post({op:'submit',pub:'../etc',code:code(),name:'X'});
c('malformed pub → 400', r.status, 400);
r=await post({op:'submit',pub:PUB,code:'hello',name:'X'});
c('a code that is not TG1- → 400', [r.status,r.j.error], [400,'bad-code']);
r=await post({op:'submit',pub:PUB,code:'TG1-'+'A'.repeat(30000),name:'X'});
c('a code over 30000 characters → 413', r.status, 413);
r=await post({op:'submit',pub:PUB,code:'TG1-'+'A'.repeat(29996),name:'X'});
c('exactly 30000 is fine', r.status, 200);
const EDGE=r.j.rid;
r=await post({op:'submit',pub:PUB,code:code(),name:'N'.repeat(201)});
c('a name over 200 → 400', [r.status,r.j.error], [400,'bad-name']);
r=await post({op:'submit',pub:PUB,code:code(),name:{x:1}});
c('a name that is not text → 400', r.status, 400);
r=await post({op:'submit',pub:PUB,code:code()});
c('the old client (no name field) still works', r.status, 200);
const OLD=r.j.rid;
{ // a full campaign: 3000 results
  const s=makeStore(); globalThis.__terrainGiftsStore=s;
  const q=await post({op:'id'}); const p=q.j.pub;
  const far=Date.now()+1e10;
  for(let i=0;i<3000;i++) s.poke(`r/${p}/fill${String(i).padStart(8,'0')}`,{rid:'x',ts:1,expires:far});
  r=await post({op:'submit',pub:p,code:code(),name:'Late'});
  c('3000 results per campaign → 429', [r.status,r.j.error], [429,'campaign-full']);
  for(let i=0;i<10;i++) s.poke(`r/${p}/fill${String(i).padStart(8,'0')}`,{rid:'x',ts:1,expires:Date.now()-1000});
  let g0=s.gets; r=await post({op:'submit',pub:p,code:code(),name:'Late'});
  c('amplification: a full campaign is not re-read on every submission', [r.status, s.gets-g0<10], [429,true]);
  // An hour later it is scanned again, and the expired ones make room.
  { const cp=s.peek('c/'+p); cp.fullAt=Date.now()-61*60*1000; s.poke('c/'+p,cp); }
  r=await post({op:'submit',pub:p,code:code(),name:'Late'});
  c('expired results are purged to make room', [r.status,s.peek(`r/${p}/fill00000000`)], [200,null]);
  globalThis.__terrainGiftsStore=S;
}

console.log('\n-- list --');
r=await post({op:'list',pub:PUB,key:KEY});
c('owner lists every result', [r.status,r.j.items.length], [200,6]);
let it=r.j.items.find(x=>x.rid===A.rid);
c('item fields', ['rid','code','name','ts','minor','hasEmail','observers'].every(k=>k in it));
c('hasEmail but never the address', [it.hasEmail, 'email' in it], [true,false]);
c('under-18 flagged', r.j.items.find(x=>x.rid===M.rid).minor, true);
c('sorted oldest first', r.j.items.map(x=>x.ts).every((t,i,a)=>!i||a[i-1]<=t));
r=await post({op:'list',pub:PUB,key:KEY2});
c('another campaign’s key → 403', [r.status,r.j.error], [403,'bad-key']);
r=await post({op:'list',pub:PUB,key:'short'});
c('a malformed key → 403', r.status, 403);
r=await post({op:'list',pub:PUB});
c('no key → 403', r.status, 403);
r=await post({op:'list',pub:'BBBBBBBBBBBB',key:KEY});
c('unknown campaign → 404', r.status, 404);
r=await post({op:'list',pub:PUB2,key:KEY2});
c('an empty campaign lists nothing', r.j.items, []);
rec=S.peek(`r/${PUB}/${OLD}`); rec.expires=Date.now()-1; S.poke(`r/${PUB}/${OLD}`,rec);
r=await post({op:'list',pub:PUB,key:KEY});
c('retention: an expired result is left out of list', [r.j.items.length, r.j.items.some(x=>x.rid===OLD)], [5,false]);
c('retention: and deleted from the store', S.peek(`r/${PUB}/${OLD}`), null);

console.log('\n-- get --');
r=await post({op:'get',pub:PUB,rid:A.rid,token:A.token});
c('member reads their own result', [r.status,r.j.name,r.j.minor,r.j.observers], [200,'Ana López',false,[]]);
c('get returns the code', r.j.code, code(1));
c('get never returns the address', 'email' in r.j, false);
r=await post({op:'get',pub:PUB,rid:A.rid,token:B.token});
c('someone else’s token → 403', [r.status,r.j.error], [403,'bad-token']);
r=await post({op:'get',pub:PUB,rid:A.rid,token:'x'});
c('a malformed token → 403', r.status, 403);
r=await post({op:'get',pub:PUB,rid:'ZZZZZZZZZZZZ',token:A.token});
c('unknown result → 404', r.status, 404);
rec=S.peek(`r/${PUB}/${EDGE}`); rec.expires=Date.now()-1; S.poke(`r/${PUB}/${EDGE}`,rec);
r=await post({op:'get',pub:PUB,rid:EDGE,token:A.token});
c('retention: get on an expired result → 404', r.status, 404);
c('retention: and it is gone', S.peek(`r/${PUB}/${EDGE}`), null);

console.log('\n-- invite / peek / confirm --');
r=await post({op:'invite',pub:PUB,rid:A.rid,token:A.token,gifts:['teach','mercy','teach']});
c('invite → itok', [r.status,/^[A-Za-z0-9_-]{24}$/.test(r.j.itok)], [200,true]);
const I1=r.j.itok;
rec=S.peek(`r/${PUB}/${A.rid}`);
c('invite stored as a hash with its gifts (deduped)', [rec.invites.length, /^[0-9a-f]{64}$/.test(rec.invites[0].h), rec.invites[0].gifts, JSON.stringify(rec).includes(I1)], [1,true,['teach','mercy'],false]);
r=await post({op:'invite',pub:PUB,rid:A.rid,token:B.token,gifts:['teach']});
c('invite with the wrong token → 403', r.status, 403);
r=await post({op:'invite',pub:PUB,rid:A.rid,token:A.token,gifts:['teach','flying']});
c('an unknown gift id → 400', [r.status,r.j.error], [400,'bad-gifts']);
r=await post({op:'invite',pub:PUB,rid:A.rid,token:A.token,gifts:[]});
c('no gifts → 400', r.status, 400);
r=await post({op:'invite',pub:PUB,rid:A.rid,token:A.token,gifts:['admin','leader','teach','knowl','wisdom','discern','encour','shep','mercy']});
c('more than 8 gifts → 400', r.status, 400);
r=await post({op:'peek',pub:PUB,rid:A.rid,itok:I1});
c('peek → first name, gifts, church', [r.status,r.j.first,r.j.gifts,r.j.church], [200,'Ana',['teach','mercy'],'Bucks County SDA']);
c('peek shows none of the member’s answers', ['code','name','observers','ts'].some(k=>k in r.j), false);
r=await post({op:'peek',pub:PUB,rid:A.rid,itok:'A'.repeat(24)});
c('peek with a wrong invite → 403', [r.status,r.j.error], [403,'bad-invite']);
r=await post({op:'peek',pub:'CCCCCCCCCCCC',rid:A.rid,itok:I1});
c('peek on an unknown campaign → 404', r.status, 404);
r=await post({op:'confirm',pub:PUB,rid:A.rid,itok:I1,name:'Ruth Moss',ratings:{teach:4,mercy:-1,evang:4},note:'Line one\nline two'});
c('confirm → ok', [r.status,r.j.ok], [200,true]);
rec=S.peek(`r/${PUB}/${A.rid}`);
c('only the invite’s gifts are kept', rec.observers[0].ratings, {teach:4,mercy:-1});
c('observer name and note kept', [rec.observers[0].name, rec.observers[0].note], ['Ruth Moss','Line one\nline two']);
r=await post({op:'confirm',pub:PUB,rid:A.rid,itok:I1,name:'Ruth Moss',ratings:{teach:3}});
c('one confirm per invite → 410', [r.status,r.j.error], [410,'used']);
r=await post({op:'peek',pub:PUB,rid:A.rid,itok:I1});
c('peek on a used invite → 410', r.status, 410);
r=await post({op:'get',pub:PUB,rid:A.rid,token:A.token});
c('get shows the observer', [r.j.observers.length, r.j.observers[0].name, r.j.observers[0].ratings.teach], [1,'Ruth Moss',4]);
r=await post({op:'list',pub:PUB,key:KEY});
c('list shows the observer to the pastor', r.j.items.find(x=>x.rid===A.rid).observers.length, 1);
// validation
r=await post({op:'invite',pub:PUB,rid:A.rid,token:A.token,gifts:['teach']}); const I2=r.j.itok;
r=await post({op:'confirm',pub:PUB,rid:A.rid,itok:I2,name:'',ratings:{teach:3}});
c('confirm needs a name', [r.status,r.j.error], [400,'bad-name']);
r=await post({op:'confirm',pub:PUB,rid:A.rid,itok:I2,name:'N'.repeat(81),ratings:{teach:3}});
c('observer name over 80 → 400', r.status, 400);
r=await post({op:'confirm',pub:PUB,rid:A.rid,itok:I2,name:'Sam',ratings:{teach:3},note:'n'.repeat(501)});
c('note over 500 → 400', [r.status,r.j.error], [400,'bad-note']);
r=await post({op:'confirm',pub:PUB,rid:A.rid,itok:I2,name:'Sam',ratings:{teach:5}});
c('a rating out of range → 400', [r.status,r.j.error], [400,'bad-ratings']);
r=await post({op:'confirm',pub:PUB,rid:A.rid,itok:I2,name:'Sam',ratings:{teach:2.5}});
c('a fractional rating → 400', r.status, 400);
r=await post({op:'confirm',pub:PUB,rid:A.rid,itok:I2,name:'Sam',ratings:{mercy:3}});
c('ratings only for other gifts → 400', r.status, 400);
r=await post({op:'confirm',pub:PUB,rid:A.rid,itok:'B'.repeat(24),name:'Sam',ratings:{teach:3}});
c('confirm with a wrong invite → 403', r.status, 403);
c('a rejected confirm leaves the invite open', S.peek(`r/${PUB}/${A.rid}`).invites.filter(i=>!i.used).length, 1);
// limits: at most 5 open invites, at most 5 observers
const more=[];
for(let i=0;i<4;i++){ r=await post({op:'invite',pub:PUB,rid:A.rid,token:A.token,gifts:['serve']}); more.push(r.j.itok); }
c('five open invites allowed', more.every(Boolean));
r=await post({op:'invite',pub:PUB,rid:A.rid,token:A.token,gifts:['serve']});
c('a sixth open invite → 429', [r.status,r.j.error], [429,'too-many-invites']);
for(const t of [I2,more[0],more[1]]){ r=await post({op:'confirm',pub:PUB,rid:A.rid,itok:t,name:'Obs',ratings:{teach:3,serve:2}}); }
c('four observers now', S.peek(`r/${PUB}/${A.rid}`).observers.length, 4);
r=await post({op:'invite',pub:PUB,rid:A.rid,token:A.token,gifts:['serve']});
c('a confirmed invite frees a slot', r.status, 200);
r=await post({op:'confirm',pub:PUB,rid:A.rid,itok:more[2],name:'Fifth',ratings:{serve:4}});
c('the fifth observer is accepted', [r.status,S.peek(`r/${PUB}/${A.rid}`).observers.length], [200,5]);
r=await post({op:'confirm',pub:PUB,rid:A.rid,itok:more[3],name:'Sixth',ratings:{serve:4}});
c('a sixth observer → 409', [r.status,r.j.error], [409,'full']);
r=await post({op:'peek',pub:PUB,rid:A.rid,itok:more[3]});
c('peek says full too', r.status, 409);
r=await post({op:'invite',pub:PUB,rid:A.rid,token:A.token,gifts:['serve']});
c('no new invites once five have answered', r.status, 409);
{ // with ETags, two observers answering at the same moment both land
  const s=makeStore({etags:true}); globalThis.__terrainGiftsStore=s;
  const q=await post({op:'id'}); const p=q.j.pub;
  const m=await post({op:'submit',pub:p,code:code(),name:'Eve Stone'});
  const a=await post({op:'invite',pub:p,rid:m.j.rid,token:m.j.token,gifts:['hosp']});
  const b=await post({op:'invite',pub:p,rid:m.j.rid,token:m.j.token,gifts:['hosp']});
  const both=await Promise.all([
    post({op:'confirm',pub:p,rid:m.j.rid,itok:a.j.itok,name:'One',ratings:{hosp:4}}),
    post({op:'confirm',pub:p,rid:m.j.rid,itok:b.j.itok,name:'Two',ratings:{hosp:3}})]);
  c('concurrent confirms both succeed', both.map(x=>x.status), [200,200]);
  c('and neither overwrites the other', s.peek(`r/${p}/${m.j.rid}`).observers.map(o=>o.name).sort(), ['One','Two']);
  globalThis.__terrainGiftsStore=S;
}

console.log('\n-- email: off --');
delete process.env.RESEND_API_KEY; delete process.env.GIFTS_FROM;
const PDF=Buffer.from('%PDF-1.4\n% Terrain test\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF').toString('base64');
r=await post({op:'email',pub:PUB,rid:A.rid,token:A.token,lang:'en'});
c('not configured → 501 email-off', [r.status,r.j.ok,r.j.error], [501,false,'email-off']);
r=await post({op:'emailpdf',pub:PUB,rid:A.rid,token:A.token,pdf:PDF,lang:'en'});
c('the PDF copy too → 501 email-off', [r.status,r.j.error], [501,'email-off']);
process.env.RESEND_API_KEY='re_test_0000000000000000';
r=await post({op:'email',pub:PUB,rid:A.rid,token:A.token});
c('only one of the two variables → still 501', r.status, 501);
c('nothing was sent', sent.length, 0);

// Updated for gifts-1.1 (security review SEC-1 part 3, the pastor's decision):
// the first email carries only the private link, with a verification token;
// the PDF is attached only after that link has been opened (op verify).
console.log('\n-- email: on — the link first, the PDF only once the address is confirmed --');
process.env.GIFTS_FROM='Terrain <reports@pastorshub.org>';
r=await post({op:'status'});
c('status reports email on', r.j.email, true);
// a church name and member name that need cleaning
{ const cp=S.peek('c/'+PUB); cp.church='St. Mark’s <Main> & Co'; S.poke('c/'+PUB,cp);
  const ra=S.peek(`r/${PUB}/${A.rid}`); ra.name='Ana<i> López'; S.poke(`r/${PUB}/${A.rid}`,ra); }
const recA=()=>S.peek(`r/${PUB}/${A.rid}`);
// A pdf sent with op email is ignored: the link email never carries an attachment.
r=await post({op:'email',pub:PUB,rid:A.rid,token:A.token,pdf:PDF,lang:'en'});
c('email → ok, and a PDF copy will follow the first open', [r.status,r.j], [200,{ok:true,pdfFollows:true}]);
let s0=sent[0];
c('posts to Resend', s0 && s0.url, 'https://api.resend.com/emails');
c('with the API key as a bearer token', s0.headers.authorization, 'Bearer re_test_0000000000000000');
c('from GIFTS_FROM', s0.body.from, 'Terrain <reports@pastorshub.org>');
c('to the member only', s0.body.to, [EMAIL]);
c('English subject', s0.body.subject, 'Your spiritual gifts report');
c('the link email has no attachment, even when a PDF was sent with it', [Object.keys(s0.body).sort(),'attachments' in s0.body], [['from','html','subject','text','to'],false]);
const vtokIn=(t,base,rid,tok)=>{ const m=new RegExp(base.replace(/[.]/g,'\\.')+'/#gifts-report='+PUB+'\\.'+rid+'\\.'+tok+'\\.([A-Za-z0-9_-]{32})(~es)?(\\s|$)').exec(t); return m?m[1]:null; };
const V1=vtokIn(s0.body.text,'https://x',A.rid,A.token);
c('private link: pub.rid.token.vtok, from the request origin', /^[A-Za-z0-9_-]{32}$/.test(V1||''), true);
c('the link is in the HTML too', s0.body.html.includes(`href="https://x/#gifts-report=${PUB}.${A.rid}.${A.token}.${V1}"`));
c('only a hash of the verification token is kept', [recA().vtoks.length,/^[0-9a-f]{64}$/.test(recA().vtoks[0]),JSON.stringify(recA()).includes(V1)], [1,true,false]);
// Updated in the security review: the greeting keeps letters only, so markup
// is stripped before it is escaped (was "Hello Ana&lt;i&gt;,").
c('greeting keeps letters only: no markup reaches the HTML', [s0.body.html.includes('Hello Anai,'), s0.body.html.includes('<i>'), s0.body.html.includes('&lt;i')], [true,false,false]);
// Updated for gifts-1.1: the church is cleaned as well as escaped (no dots,
// no markup), so it cannot carry a web address into the link email.
c('church: letters kept, markup and dots gone, & escaped in the HTML', [s0.body.html.includes('at St Mark’s Main &amp; Co.'),s0.body.text.includes('at St Mark’s Main & Co.'),/&lt;|St\. Mark/.test(s0.body.html+s0.body.text)], [true,true,false]);
// Updated (one tap): opening the link sends nothing by itself; the email says a
// PDF copy can be asked for there (mail scanners open links in a browser).
c('says a PDF copy can be asked for from the opened link (not that it comes on open)', [/you can also ask for a PDF copy of the report to be emailed to you/.test(s0.body.text),/we will also send you a PDF copy/.test(s0.body.text)], [true,false]);
c('and that nothing more is sent unless someone opens the link and asks for it', /nothing more is sent unless someone opens the link and asks for it/.test(s0.body.text));
c('says how to delete', /Delete my result/.test(s0.body.text) && /two years/.test(s0.body.text));
c('tells someone who did not take it that nothing more comes unless the link is opened', /If you did not take this assessment, you can ignore this email/.test(s0.body.text));
c('response carries no address, token or verification token', [JSON.stringify(r.j).includes(EMAIL),JSON.stringify(r.j).includes(A.token),JSON.stringify(r.j).includes(V1)], [false,false,false]);
c('counters moved', [recA().emails, S.peek('c/'+PUB).sends.n, recA().pdfs, recA().emailVerified], [1,1,0,false]);

// the PDF copy before the link is opened
// Updated in the security review of gifts-1.1: emailpdf needs the emailed VTOK
// as well as the member token (whoever submitted the result has the token), so
// the token alone is refused first, and not-verified is reached only with a VTOK.
r=await post({op:'emailpdf',pub:PUB,rid:A.rid,token:A.token,pdf:PDF,lang:'en'});
c('the PDF copy with the member token alone → 403 bad-vtok', [r.status,r.j.error], [403,'bad-vtok']);
r=await post({op:'emailpdf',pub:PUB,rid:A.rid,token:A.token,vtok:V1,pdf:PDF,lang:'en'});
c('the PDF copy before the address is confirmed → 403 not-verified', [r.status,r.j.error], [403,'not-verified']);
c('…nothing sent or counted', [sent.length, recA().pdfs, S.peek('c/'+PUB).sends.n], [1,0,1]);
r=await post({op:'verify',pub:PUB,rid:A.rid,token:A.token,vtok:'W'.repeat(32)});
c('verify with a wrong verification token → 403 bad-vtok', [r.status,r.j.error,recA().emailVerified], [403,'bad-vtok',false]);
r=await post({op:'verify',pub:PUB,rid:A.rid,token:A.token,vtok:'short'});
c('a malformed one → 403 bad-vtok', [r.status,r.j.error], [403,'bad-vtok']);
r=await post({op:'verify',pub:PUB,rid:A.rid,token:A.token});
c('none at all → 403', r.status, 403);
r=await post({op:'verify',pub:PUB,rid:A.rid,token:B.token,vtok:V1});
c('the right verification token with the wrong member token → 403 bad-token', [r.status,r.j.error], [403,'bad-token']);
r=await post({op:'verify',pub:PUB,rid:B.rid,token:B.token,vtok:V1});
c('…or on another member’s result → 403', r.status, 403);
r=await post({op:'emailpdf',pub:PUB,rid:A.rid,token:A.token,vtok:V1,pdf:PDF,lang:'en'});
c('wrong tries confirm nothing: still 403 not-verified', [r.status,r.j.error,sent.length], [403,'not-verified',1]);
r=await post({op:'verify',pub:PUB,rid:A.rid,token:A.token,vtok:V1});
c('verify with the emailed token → ok, verified, no PDF sent yet', [r.status,r.j], [200,{ok:true,verified:true,pdfSent:false}]);
c('the record is marked verified', recA().emailVerified, true);
r=await post({op:'verify',pub:PUB,rid:A.rid,token:A.token,vtok:V1});
c('verify again is idempotent', [r.status,r.j,recA().emailVerified], [200,{ok:true,verified:true,pdfSent:false},true]);
r=await post({op:'emailpdf',pub:PUB,rid:A.rid,token:A.token,vtok:V1,pdf:PDF,lang:'en'});
c('after verify the PDF copy → ok', [r.status,r.j], [200,{ok:true}]);
s0=sent[1];
c('the PDF copy goes to the member, attached', [s0.body.to,s0.body.attachments.length,Buffer.from(s0.body.attachments[0].content,'base64').subarray(0,5).toString()], [[EMAIL],1,'%PDF-']);
c('attachment filename', /^Anai-Lopez-Spiritual-Gifts-\d{4}-\d{2}-\d{2}\.pdf$/.test(s0.body.attachments[0].filename));
c('its subject says PDF, and it carries no link', [s0.body.subject,/gifts-report=|href=/.test(s0.body.text+s0.body.html)], ['Your spiritual gifts report (PDF)',false]);
c('the plain text is not HTML-escaped, the HTML is', [s0.body.text.includes('from St Mark’s Main & Co.'),s0.body.html.includes('from St Mark’s Main &amp; Co.'),s0.body.html.includes('Hello Anai,')], [true,true,true]);
c('counters: one link email, one PDF copy, two sends today', [recA().emails,recA().pdfs,S.peek('c/'+PUB).sends.n], [1,1,2]);
r=await post({op:'emailpdf',pub:PUB,rid:A.rid,token:A.token,pdf:PDF,lang:'en'});
c('even once confirmed, the member token alone sends no PDF → 403 bad-vtok, nothing sent or counted', [r.status,r.j.error,sent.length,recA().pdfs], [403,'bad-vtok',2,1]);
r=await post({op:'verify',pub:PUB,rid:A.rid,token:A.token,vtok:V1});
c('verify now says the PDF has gone (the page then offers another copy, on a tap)', r.j.pdfSent, true);
// more link emails
process.env.SITE_URL='https://pastorshub.org/';
r=await post({op:'email',pub:PUB,rid:A.rid,token:A.token,lang:'es'});
s0=sent[2];
c('a second link email → ok; this time no PDF follows', [r.status,r.j], [200,{ok:true,pdfFollows:false}]);
c('Spanish subject', s0.body.subject, 'Su informe de dones espirituales');
c('Spanish body, usted', /Su informe está listo/.test(s0.body.text) && /Hola, Anai:/.test(s0.body.text) && /Ábralo con este enlace privado/.test(s0.body.text));
c('no "a PDF copy follows" once one has gone', /copia del informe en PDF|PDF copy/.test(s0.body.text), false);
const V2=vtokIn(s0.body.text,'https://pastorshub.org',A.rid,A.token);
c('SITE_URL used for the link (no double slash), ~es, a new verification token', [!!V2,V2!==V1,s0.body.text.includes(`https://pastorshub.org/#gifts-report=${PUB}.${A.rid}.${A.token}.${V2}~es`)], [true,true,true]);
r=await post({op:'email',pub:PUB,rid:A.rid,token:A.token});
c('no lang → the member’s own language', [r.status, sent[3].body.subject], [200,'Su informe de dones espirituales']);
r=await post({op:'email',pub:PUB,rid:A.rid,token:A.token});
c('a fourth link email → 429', [r.status,r.j.error], [429,'email-limit']);
c('and nothing was sent for it', sent.length, 4);
c('the record keeps the hashes of the three links sent, never more', recA().vtoks.length, 3);
r=await post({op:'verify',pub:PUB,rid:A.rid,token:A.token,vtok:V2});
c('any link that was sent still opens', [r.status,r.j.verified], [200,true]);
// A new day for this one address (five a day to one inbox is tested below).
{ const g=S.peek('g/sends'); g.to={}; S.poke('g/sends',g); }
r=await post({op:'emailpdf',pub:PUB,rid:A.rid,token:A.token,vtok:V2,pdf:'data:application/pdf;filename=generated.pdf;base64,'+PDF,lang:'es'});
c('a data: URI is accepted', r.status, 200);
c('a Spanish PDF copy', [sent[4].body.subject,/Aquí tiene la copia en PDF/.test(sent[4].body.text),/Hola, Anai:/.test(sent[4].body.text)], ['Su informe de dones espirituales (PDF)',true,true]);
r=await post({op:'emailpdf',pub:PUB,rid:A.rid,token:A.token,vtok:V2,pdf:PDF});
c('a third PDF copy → ok', r.status, 200);
r=await post({op:'emailpdf',pub:PUB,rid:A.rid,token:A.token,vtok:V2,pdf:PDF});
c('a fourth PDF copy → 429 email-limit', [r.status,r.j.error], [429,'email-limit']);
c('three PDF copies, never more', [recA().pdfs,sent.length], [3,6]);
// eligibility
r=await post({op:'email',pub:PUB,rid:M.rid,token:M.token});
c('a minor is never emailed → 403', [r.status,r.j.error], [403,'no-email']);
{ const rm=S.peek(`r/${PUB}/${M.rid}`); rm.email='dani@example.org'; rm.emailOk=true; rm.emailVerified=true; S.poke(`r/${PUB}/${M.rid}`,rm); }
r=await post({op:'email',pub:PUB,rid:M.rid,token:M.token});
c('…even if an address somehow got into the record', r.status, 403);
r=await post({op:'emailpdf',pub:PUB,rid:M.rid,token:M.token,pdf:PDF});
c('…or it were somehow marked confirmed: no PDF either', [r.status,r.j.error], [403,'no-email']);
r=await post({op:'email',pub:PUB,rid:B.rid,token:B.token});
c('no consent → 403', r.status, 403);
r=await post({op:'verify',pub:PUB,rid:B.rid,token:B.token,vtok:V1});
c('no address, nothing to verify → 403', [r.status,r.j.error], [403,'no-email']);
c('still only six sent', sent.length, 6);
// a fresh adult to test the rest
r=await post({op:'submit',pub:PUB,code:code(9),name:'Gus Hale',email:'gus@example.org',emailOk:true}); const G={rid:r.j.rid,token:r.j.token};
r=await post({op:'email',pub:PUB,rid:G.rid,token:B.token});
c('wrong token → 403', r.status, 403);
r=await post({op:'emailpdf',pub:PUB,rid:G.rid,token:G.token,pdf:Buffer.from('<html>not a pdf</html>').toString('base64')});
c('not a PDF → 400', [r.status,r.j.error], [400,'bad-pdf']);
r=await post({op:'emailpdf',pub:PUB,rid:G.rid,token:G.token,pdf:'%%%not base64%%%'});
c('not base64 → 400', r.status, 400);
r=await post({op:'emailpdf',pub:PUB,rid:G.rid,token:G.token});
c('no PDF → 400', r.status, 400);
r=await post({op:'emailpdf',pub:PUB,rid:G.rid,token:G.token,pdf:Buffer.concat([Buffer.from('%PDF-1.4\n'),Buffer.alloc(3*1024*1024)]).toString('base64')});
c('a PDF over 3 MB → 413', [r.status,r.j.error], [413,'too-large']);
const nPub=S.peek('c/'+PUB).sends.n;
resendOk=false;
r=await post({op:'email',pub:PUB,rid:G.rid,token:G.token});
c('Resend failing → 502', [r.status,r.j.error], [502,'send-failed']);
c('a failed send does not use up the member’s allowance, and its link is forgotten', [S.peek(`r/${PUB}/${G.rid}`).emails,S.peek(`r/${PUB}/${G.rid}`).vtoks], [0,[]]);
c('…nor the campaign’s', S.peek('c/'+PUB).sends.n, nPub);
resendOk=true;
// Updated (security review SEC-1): a campaign's own cap is 100 a day, well below
// the 500 shared by every church, so one campaign cannot drain the rest.
{ const cp=S.peek('c/'+PUB); cp.sends={date:new Date().toISOString().slice(0,10),n:100}; S.poke('c/'+PUB,cp); }
r=await post({op:'email',pub:PUB,rid:G.rid,token:G.token});
c('100 a day per campaign → 429', [r.status,r.j.error], [429,'daily-limit']);
c('the daily refusal does not touch the member’s count', S.peek(`r/${PUB}/${G.rid}`).emails, 0);
const GV='G'.repeat(32);   // as if a link email had carried it (the PDF copy needs one)
{ const rg=S.peek(`r/${PUB}/${G.rid}`); rg.emailVerified=true; rg.vtoks=[createHash('sha256').update(GV).digest('hex')]; S.poke(`r/${PUB}/${G.rid}`,rg); }
r=await post({op:'emailpdf',pub:PUB,rid:G.rid,token:G.token,vtok:GV,pdf:PDF});
c('the PDF copy counts against the same daily limit', [r.status,r.j.error,S.peek(`r/${PUB}/${G.rid}`).pdfs], [429,'daily-limit',0]);
{ const cp=S.peek('c/'+PUB); cp.sends={date:'2000-01-01',n:100}; S.poke('c/'+PUB,cp); }
r=await post({op:'email',pub:PUB,rid:G.rid,token:G.token});
c('a new UTC day resets the campaign count', [r.status, S.peek('c/'+PUB).sends.n], [200,1]);

console.log('\n-- delete --');
r=await post({op:'delete',pub:PUB,rid:B.rid,token:A.token});
c('member delete with the wrong token → 403', r.status, 403);
r=await post({op:'delete',pub:PUB,rid:B.rid,token:B.token});
c('member deletes their own result', [r.status,r.j], [200,{ok:true}]);
c('…and its retention marker', [...S.m.keys()].some(k=>k.startsWith('x/')&&k.endsWith('/'+PUB+'/'+B.rid)), false);
r=await post({op:'get',pub:PUB,rid:B.rid,token:B.token});
c('and it is gone', r.status, 404);
r=await post({op:'delete',pub:PUB,rid:M.rid,key:KEY2});
c('owner delete with the wrong key → 403', r.status, 403);
c('the result is still there', !!S.peek(`r/${PUB}/${M.rid}`));
r=await post({op:'delete',pub:PUB,rid:M.rid,key:KEY});
c('owner deletes any result', [r.status, S.peek(`r/${PUB}/${M.rid}`)], [200,null]);
c('…and its retention marker', [...S.m.keys()].some(k=>k.startsWith('x/')&&k.endsWith('/'+PUB+'/'+M.rid)), false);
r=await post({op:'delete',pub:PUB,rid:M.rid,key:KEY});
c('deleting it again → 404', r.status, 404);
r=await post({op:'delete',pub:PUB,rid:G.rid});
c('no token and no key → 400', r.status, 400);
r=await post({op:'delete',pub:'DDDDDDDDDDDD',rid:G.rid,key:KEY});
c('owner delete in an unknown campaign → 404', r.status, 404);

console.log('\n-- attacks (security review) --');
// Prototype keys and path tricks never reach an op or a blob key.
for(const op of ['__proto__','constructor','toString','hasOwnProperty']){ r=await post({op}); c('op '+op+' → 400 unknown-op', [r.status,r.j.error], [400,'unknown-op']); }
r=await post({op:'submit',pub:'__proto__AAA',code:code(),name:'x'});
c('pub "__proto__AAA" is just an unknown campaign', [r.status,r.j.error], [404,'no-campaign']);
for(const rid of ['../../c/AAAAA','AAAA/AAAAAAA','AAAAAAAAAAA\n','AAAAAAAAAAAA/x','ÀAAAAAAAAAAA']){
  r=await post({op:'get',pub:PUB,rid,token:'A'.repeat(32)}); c('rid '+JSON.stringify(rid)+' → 400', [r.status,r.j.error], [400,'bad-rid']); }
r=await post({op:'list',pub:[PUB],key:KEY}); c('pub as an array → 400', r.status, 400);
r=await post({op:'list',pub:PUB,key:[KEY]}); c('key as an array → 403', r.status, 403);
r=await post({op:'list',pub:PUB,key:''}); c('an empty key → 403', r.status, 403);
r=await post({op:'list',pub:PUB,key:null}); c('a null key → 403', r.status, 403);
r=await post({op:'get',pub:PUB,rid:G.rid,token:{length:32}}); c('token as an object → 403', r.status, 403);
{ // an observer sending a huge ratings object with prototype keys
  const m=await post({op:'submit',pub:PUB,code:code(),name:'Rae Quinn'});
  const i=await post({op:'invite',pub:PUB,rid:m.j.rid,token:m.j.token,gifts:['teach']});
  const rt=JSON.parse('{"__proto__":{"polluted":1},"constructor":4,"teach":2}'); for(let k=0;k<50000;k++) rt['k'+k]=1;
  r=await post({op:'confirm',pub:PUB,rid:m.j.rid,itok:i.j.itok,name:'Obs',ratings:rt});
  c('huge ratings with __proto__: only the invite’s gift is kept', [r.status, S.peek('r/'+PUB+'/'+m.j.rid).observers[0].ratings, ({}).polluted===undefined], [200,{teach:2},true]);
  await post({op:'delete',pub:PUB,rid:m.j.rid,token:m.j.token});
}
{ // the same invite answered twice at the same moment: exactly one lands
  const st=makeStore({etags:true}); globalThis.__terrainGiftsStore=st;
  const q=await post({op:'id'}); const p=q.j.pub;
  const m=await post({op:'submit',pub:p,code:code(),name:'Ivy Park'});
  const a=await post({op:'invite',pub:p,rid:m.j.rid,token:m.j.token,gifts:['hosp']});
  const both=await Promise.all([1,2].map(n=>post({op:'confirm',pub:p,rid:m.j.rid,itok:a.j.itok,name:'Twice '+n,ratings:{hosp:4}})));
  c('double confirm: one 200, one 410', both.map(x=>x.status).sort(), [200,410]);
  c('double confirm: one observer stored', st.peek('r/'+p+'/'+m.j.rid).observers.length, 1);
  globalThis.__terrainGiftsStore=S;
}

// Email relay. Anyone with a member link can submit a result with any address.
// Updated (security review SEC-1): Terrain's own reports carry no links, so the
// fixture is what gfReportPDF actually writes: an /OpenAction page view and a
// binary stream. A /URI link annotation is now refused (below).
const JSPDF_LIKE=(()=>{ // what jsPDF writes for a report: an /OpenAction destination, a binary stream
  let x=0x9e3779b9; const bin=Buffer.alloc(1024*1024); for(let i=0;i<bin.length;i++){ x^=x<<13; x^=x>>>17; x^=x<<5; bin[i]=x&255; }
  const head='%PDF-1.3\n%\xba\xdf\xac\xe0\n3 0 obj\n<</Type /Page\n/Parent 1 0 R\n/MediaBox [0 0 612 792]\n'
    +'/Resources <</ProcSet [/PDF /Text /ImageB /ImageC /ImageI]>>\n'
    +'/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<</Length '+bin.length+' /Filter /FlateDecode>>\nstream\n';
  const tail='\nendstream\nendobj\n5 0 obj\n<</Type /Catalog /Pages 1 0 R /OpenAction [3 0 R /FitH null] /PageLayout /OneColumn>>\nendobj\n'
    +"6 0 obj\n<</Producer (jsPDF 2.5.1) /CreationDate (D:20260928000000+00'00')>>\nendobj\ntrailer\n<</Size 7 /Root 5 0 R /Info 6 0 R>>\n%%EOF";
  return Buffer.concat([Buffer.from(head,'latin1'), bin, Buffer.from(tail,'latin1')]).toString('base64'); })();
const evil=body=>Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R'+body+'>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF','latin1').toString('base64');
const q=await post({op:'id',church:'Grace Chapel'}); const RP=q.j.pub;
const adult=async(email,name='Pat Lee')=>{ const x=await post({op:'submit',pub:RP,code:code(),name,email,emailOk:true}); return {rid:x.j.rid,token:x.j.token}; };
// An adult whose address is confirmed, for the PDF checks below. A shortcut:
// the record is marked as op verify marks it (verify itself is tested above).
// Updated in the security review of gifts-1.1: the PDF copy needs the emailed
// VTOK too, so the shortcut keeps the hash of one and hands it back as t.vtok.
const confirmed=async(email,name)=>{ const t=await adult(email,name); const k='r/'+RP+'/'+t.rid, x=S.peek(k);
  t.vtok=randomBytes(24).toString('base64url'); x.vtoks=[createHash('sha256').update(t.vtok).digest('hex')]; x.emailVerified=true; S.poke(k,x); return t; };
let n0=sent.length;
{ const t=await confirmed('pat@example.org');
  r=await post({op:'emailpdf',pub:RP,rid:t.rid,token:t.token,vtok:t.vtok,pdf:JSPDF_LIKE});
  c('a jsPDF-shaped PDF (OpenAction page view, ProcSet, 1 MB of binary stream) is accepted', r.status, 200);
  const cases=[['a /JavaScript action','/OpenAction 3 0 R>>endobj 3 0 obj<</S/JavaScript/JS(app.alert(1))'],
    ['a #-escaped /Java#53cript','/OpenAction<</S/Java#53cript/JS(x)>>'],
    ['/Launch','/OpenAction<</S/Launch/F(cmd.exe)>>'],
    ['/EmbeddedFiles','/Names<</EmbeddedFiles 4 0 R>>'],
    ['/ObjStm (hidden objects)','>>endobj 9 0 obj<</Type/ObjStm/N 1/First 4'],
    ['an /XFA form','/AcroForm<</XFA 7 0 R>>'],
    ['/SubmitForm','/OpenAction<</S/SubmitForm/F(https://evil.example/)>>'],
    ['/GoToR','/OpenAction<</S/GoToR/F(evil.pdf)>>'],
    // a clickable phishing page under Terrain's name (security review SEC-1)
    ['a full-page /Link annotation with a /URI','/Annots [<</Type /Annot /Subtype /Link /Rect [0 0 612 792] /A <</S /URI /URI (https://evil.example/login)>>>>]'],
    ['a dictionary /OpenAction that opens a URI',' /OpenAction << /S /URI /URI (https://evil.example/login) >>'],
    ['an /OpenAction by reference',' /OpenAction 7 0 R'],
    ['a #-escaped /U#52I','/A <</S /U#52I /U#52I (https://evil.example/)>>'],
    ['an /AA additional action','/AA <</O 8 0 R>>'],
    ['a form /Widget','>>endobj 8 0 obj<</Type /Annot /Subtype /Widget /FT /Btn'],
    ['an /AcroForm','/AcroForm <</Fields []>>'],
    ['a /Named action','/OpenAction [3 0 R /Fit] >>endobj 9 0 obj<</S /Named /N /Print'],
    ['an image XObject','>>endobj 10 0 obj<</Type /XObject /Subtype /Image /Width 800 /Height 600'],
    ['a #-escaped /Im#61ge','>>endobj 10 0 obj<</Type /XObject /Subtype /Im#61ge'],
    ['a /Rendition','/OpenAction [3 0 R /Fit] >>endobj 11 0 obj<</S /Rendition']];
  for(const [what,body] of cases){
    r=await post({op:'emailpdf',pub:RP,rid:t.rid,token:t.token,vtok:t.vtok,pdf:evil(body)});
    c('PDF with '+what+' → 400 bad-pdf', [r.status,r.j.error], [400,'bad-pdf']);
  }
  c('…and none of them was sent or counted', [sent.length-n0, S.peek('r/'+RP+'/'+t.rid).pdfs], [1,1]);
}
{ let jsPDF=null; try{ ({jsPDF}=await import('jspdf')); }catch{}
  if(jsPDF){ for(const compress of [false,true]){ const t=await confirmed('real'+compress+'@example.org');
    const d=new jsPDF({unit:'pt',format:'letter',compress}); d.setFontSize(18); d.text('Spiritual gifts',72,72); d.setDrawColor(14,143,110); d.circle(200,200,60);
    d.text('pastorshub.org',72,120); d.setFillColor(190,62,104); d.roundedRect(72,300,200,8,4,4,'F'); d.addPage(); d.text('Page two',72,72);
    r=await post({op:'emailpdf',pub:RP,rid:t.rid,token:t.token,vtok:t.vtok,pdf:Buffer.from(d.output('arraybuffer')).toString('base64')});
    c('a real jsPDF document (compress '+compress+') is accepted', r.status, 200);
    // Updated (security review SEC-1): Terrain's reports never draw a link, so a
    // jsPDF document with one is not a Terrain report and is refused.
    const d2=new jsPDF({unit:'pt',format:'letter',compress}); d2.text('Click here',72,72); d2.textWithLink('pastorshub.org',72,120,{url:'https://evil.example/'});
    r=await post({op:'emailpdf',pub:RP,rid:t.rid,token:t.token,vtok:t.vtok,pdf:Buffer.from(d2.output('arraybuffer')).toString('base64')});
    c('a real jsPDF document with a link (compress '+compress+') → 400 bad-pdf', [r.status,r.j.error], [400,'bad-pdf']); } }
  else console.log('  (jspdf not installed: real-jsPDF acceptance checks skipped)');
}
{ // one inbox cannot be flooded by submitting it to many results
  const before=sent.length, res=[];
  for(const e of ['victim@example.org','Victim@Example.org','VICTIM@example.org','victim@example.org','victim@EXAMPLE.org','victim@example.org']){
    const t=await adult(e,'Vic Tim'); r=await post({op:'email',pub:RP,rid:t.rid,token:t.token}); res.push(r.status);
    if(r.status!==200) c('the sixth to one address in a day → 429 daily-limit, uncounted', [r.status,r.j.error,S.peek('r/'+RP+'/'+t.rid).emails], [429,'daily-limit',0]);
  }
  c('per recipient: five a day, whatever the case of the address', [res, sent.length-before], [[200,200,200,200,200,429],5]);
  const g=JSON.stringify(S.peek('g/sends'));
  c('the per-address count holds no address and no plain hash of it', [g.includes('@'), g.includes(plainTag('victim@example.org'))], [false,false]);
}
{ // a ceiling across every campaign
  const g=S.peek('g/sends'); const keep=JSON.parse(JSON.stringify(g));
  S.poke('g/sends',{...g,n:500});
  const t=await adult('late@example.org'); const cN=S.peek('c/'+RP).sends.n, before=sent.length;
  r=await post({op:'email',pub:RP,rid:t.rid,token:t.token});
  c('500 a day across all campaigns → 429 daily-limit', [r.status,r.j.error,sent.length-before], [429,'daily-limit',0]);
  c('…and the campaign’s and member’s counts are given back', [S.peek('c/'+RP).sends.n, S.peek('r/'+RP+'/'+t.rid).emails], [cN,0]);
  S.poke('g/sends',{...keep,date:'2000-01-01'});
  r=await post({op:'email',pub:RP,rid:t.rid,token:t.token});
  c('a new UTC day resets the ceiling', [r.status, S.peek('g/sends').n, Object.keys(S.peek('g/sends').to).length], [200,1,1]);
  resendOk=false; const t2=await adult('fail@example.org');
  r=await post({op:'email',pub:RP,rid:t2.rid,token:t2.token});
  c('a failed send gives the ceiling and the address count back', [r.status, S.peek('g/sends').n, Object.keys(S.peek('g/sends').to).length], [502,1,1]);
  resendOk=true;
}
{ // what the member's name can carry into the email
  const t=await adult('name@example.org','www.evil-example.com/claim Smith');
  await post({op:'email',pub:RP,rid:t.rid,token:t.token});
  const m=sent.at(-1).body, hello=m.text.split('\n')[0];
  c('a name cannot carry a web address into the greeting', [/[./:@]/.test(hello), m.text.includes('evil-example.com'), m.html.includes('evil-example.com')], [false,false,false]);
  const t2=await adult('jm@example.org','José-María O’Neil'); await post({op:'email',pub:RP,rid:t2.rid,token:t2.token});
  c('real names keep their letters, accents and hyphens', sent.at(-1).body.text.split('\n')[0], 'Hello José-María,');
  const t3=await confirmed('long@example.org','A'.repeat(150)+'<script>x</script> B'); await post({op:'email',pub:RP,rid:t3.rid,token:t3.token});
  const h3=sent.at(-1).body.text.split('\n')[0];
  c('a greeting name is at most 40 letters and never markup', [h3, /script|&lt;/.test(sent.at(-1).body.html)], ['Hello '+'A'.repeat(40)+',',false]);
  c('subject is fixed whatever the name', sent.at(-1).body.subject, 'Your spiritual gifts report');
  await post({op:'emailpdf',pub:RP,rid:t3.rid,token:t3.token,vtok:t3.vtok,pdf:JSPDF_LIKE});
  c('in the PDF copy too: the greeting capped, never markup', [sent.at(-1).body.text.split('\n')[0], /script|&lt;/.test(sent.at(-1).body.html)], ['Hello '+'A'.repeat(40)+',',false]);
  c('attachment filename words are capped too', sent.at(-1).body.attachments[0].filename.split('-')[0].length<=40);
  c('the PDF copy’s subject is fixed whatever the name', sent.at(-1).body.subject, 'Your spiritual gifts report (PDF)');
}
{ // the link's host: never the one the caller chose
  delete process.env.SITE_URL;
  const t=await adult('host@example.org');
  await post({op:'email',pub:RP,rid:t.rid,token:t.token},{},{site:{url:'https://pastorshub.org'}},'https://evil-host.example/.netlify/functions/gifts');
  c('on Netlify the link uses the site’s own address, not the request host', [sent.at(-1).body.text.includes('https://pastorshub.org/#gifts-report='+RP+'.'+t.rid+'.'+t.token), sent.at(-1).body.html.includes('evil-host')], [true,false]);
}

// list stays under Netlify's 6 MB response cap however large the campaign
{ const st=makeStore(); globalThis.__terrainGiftsStore=st;
  const q2=await post({op:'id'}); const p=q2.j.pub, k=q2.j.key, big='TG1-'+'A'.repeat(29996), far=Date.now()+1e10;
  for(let i=0;i<400;i++){ const rid='p'+String(i).padStart(11,'0'); st.poke('r/'+p+'/'+rid,{rid,code:big,name:'Big '+i,ts:i,minor:false,email:null,observers:[],expires:far}); }
  const seen=new Set(); let pages=0, after, maxBytes=0, dup=0;
  do { r=await post({op:'list',pub:p,key:k,...(after?{after}:{})}); pages++;
       maxBytes=Math.max(maxBytes, Buffer.byteLength(JSON.stringify(r.j)));
       for(const it of r.j.items){ if(seen.has(it.rid)) dup++; seen.add(it.rid); }
       after=r.j.next; } while(after && pages<20);
  c('list pages a campaign of 400 max-size codes', [pages>1, seen.size, dup], [true,400,0]);
  c('every page is under 4.5 MB', maxBytes < 4.5*1024*1024);
  r=await post({op:'list',pub:p,key:k,after:'../x'}); c('a malformed cursor → 400', [r.status,r.j.error], [400,'bad-after']);
  globalThis.__terrainGiftsStore=S;
  r=await post({op:'list',pub:PUB,key:KEY}); c('an everyday campaign fits one page: no next', 'next' in r.j, false);
}

// Retention: results are deleted when due even if nobody touches them.
{ const sweepMod=await import(new URL('../netlify/functions/gifts-sweep.mjs', import.meta.url).href);
  c('the sweep is scheduled daily', sweepMod.config && sweepMod.config.schedule, '@daily');
  const st=makeStore(); globalThis.__terrainGiftsStore=st; globalThis.__terrainRegStore=makeStore();
  const q3=await post({op:'id'}); const p=q3.j.pub;
  const mk=async(name,minor=false)=>{ const x=await post({op:'submit',pub:p,code:code(),name,minor}); return x.j.rid; };
  const setExp=(rid,exp,markDay)=>{ const k='r/'+p+'/'+rid, rec=st.peek(k); st.m.delete(mark(p,rid,rec.expires)); rec.expires=exp; st.poke(k,rec); st.poke('x/'+(markDay||utcDay(exp))+'/'+p+'/'+rid,{}); };
  const now=Date.now(), today=utcDay(now);
  const gone=await mk('Past Adult'); setExp(gone, now-2*864e5);
  const kid=await mk('Past Kid',true); setExp(kid, now-400*864e5);
  const live=await mk('Live Adult');
  const later=await mk('Later Today'); setExp(later, now+60*60*1000, today);
  const done=await mk('Done Today'); setExp(done, now-1000, today);
  st.poke('x/2001-01-01/'+p+'/AAAAAAAAAAAA',{}); st.poke('x/garbage',{});
  const has=rid=>[...st.m.keys()].some(x=>x.endsWith('/'+rid));
  const out=await (await sweepMod.default(new Request('https://x/',{method:'POST',body:JSON.stringify({next_run:new Date(now+864e5).toISOString()})}))).json();
  c('sweep: reports what it deleted', [out.ok,out.deleted,out.left], [true,4,0]);
  c('sweep: an adult result past two years is deleted with its marker', [st.peek('r/'+p+'/'+gone), has(gone)], [null,false]);
  c('sweep: a minor’s result past one year is deleted with its marker', [st.peek('r/'+p+'/'+kid), has(kid)], [null,false]);
  c('sweep: a live result and its marker are kept', [!!st.peek('r/'+p+'/'+live), !!st.peek(mark(p,live,st.peek('r/'+p+'/'+live).expires))], [true,true]);
  c('sweep: due later today is kept until its moment', [!!st.peek('r/'+p+'/'+later), !!st.peek('x/'+today+'/'+p+'/'+later)], [true,true]);
  c('sweep: due earlier today is deleted', [st.peek('r/'+p+'/'+done), has(done)], [null,false]);
  c('sweep: a stray marker is tidied, a malformed key left alone', [st.peek('x/2001-01-01/'+p+'/AAAAAAAAAAAA'), !!st.peek('x/garbage')], [null,true]);
  // touching an expired result removes its marker as well
  const touched=await mk('Touched'); setExp(touched, now-5000);
  r=await post({op:'list',pub:p,key:q3.j.key});
  c('purge on touch removes the marker too', [r.j.items.some(x=>x.rid===touched), has(touched)], [false,false]);
  globalThis.__terrainGiftsStore=S;
}

console.log('\n-- update: sending again replaces the same record --');
{ const st=makeStore(); globalThis.__terrainGiftsStore=st;
  const q=await post({op:'id',church:'Grace'}); const p=q.j.pub, k=q.j.key;
  const m=await post({op:'submit',pub:p,code:code(1),name:'Maria Lopez',email:'maria@example.org',emailOk:true,lang:'en'});
  const rid=m.j.rid, tok=m.j.token, key='r/'+p+'/'+rid;
  const inv=await post({op:'invite',pub:p,rid,token:tok,gifts:['teach']});
  await post({op:'confirm',pub:p,rid,itok:inv.j.itok,name:'John Carter',ratings:{teach:4},note:'Patient.'});
  // her address confirmed through a link email, as the page does it
  await post({op:'email',pub:p,rid,token:tok});
  const mv=/#gifts-report=[^.\s]+\.[^.\s]+\.[^.\s]+\.([A-Za-z0-9_-]{32})/.exec(sent.at(-1).body.text)[1];
  r=await post({op:'verify',pub:p,rid,token:tok,vtok:mv});
  c('Maria confirms her address', [r.status,st.peek(key).emailVerified], [200,true]);
  const before=st.peek(key);
  r=await post({op:'update',pub:p,rid,token:'Z'.repeat(32),code:code(2),name:'Maria Lopez'});
  c('update with the wrong token → 403', [r.status,r.j.error], [403,'bad-token']);
  r=await post({op:'update',pub:p,rid,token:tok,code:'nope',name:'Maria Lopez'});
  c('update checks the code like submit → 400', [r.status,r.j.error], [400,'bad-code']);
  r=await post({op:'update',pub:p,rid,token:tok,code:code(2),name:'Maria  Lopez ',email:'maria@example.org',emailOk:true,lang:'es'});
  const after=st.peek(key);
  c('update → ok, same rid, no new token', [r.status,r.j.ok,r.j.rid,'token' in r.j,r.j.hasEmail], [200,true,rid,false,true]);
  c('one record, code, name and lang replaced', [(await post({op:'list',pub:p,key:k})).j.items.length,after.code,after.name,after.lang], [1,code(2),'Maria Lopez','es']);
  c('observers, invites and the email count kept', [after.observers.length,after.observers[0].name,after.invites.length,after.emails], [1,'John Carter',1,before.emails]);
  c('the first send is remembered; the retention date does not move', [after.ts0,after.expires,after.ts>=before.ts], [before.ts,before.expires,true]);
  c('the same address stays confirmed', [after.emailVerified,after.vtoks.length], [true,1]);
  r=await post({op:'update',pub:p,rid,token:tok,code:code(2),name:'Maria Lopez',email:'MARIA@example.org',emailOk:true,lang:'es'});
  c('…whatever its case', st.peek(key).emailVerified, true);
  r=await post({op:'update',pub:p,rid,token:tok,code:code(2),name:'Maria Lopez',email:'someone.else@example.org',emailOk:true,lang:'es'});
  c('a different address is unconfirmed again, its old links forgotten', [r.status,st.peek(key).emailVerified,st.peek(key).vtoks], [200,false,[]]);
  // Updated in the security review of gifts-1.1: emailpdf needs a VTOK that was
  // emailed to the current address, and the change forgot the old ones.
  r=await post({op:'emailpdf',pub:p,rid,token:tok,vtok:mv,pdf:Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF').toString('base64')});
  c('…so no PDF goes to it, not even with the old link’s VTOK → 403 bad-vtok', [r.status,r.j.error], [403,'bad-vtok']);
  r=await post({op:'verify',pub:p,rid,token:tok,vtok:mv});
  c('…and the old link cannot confirm it → 403 bad-vtok', [r.status,r.j.error], [403,'bad-vtok']);
  r=await post({op:'update',pub:p,rid,token:tok,code:code(3),name:'Maria Lopez',minor:true,email:'maria@example.org',emailOk:true});
  const kid=st.peek(key); const one=new Date(before.ts); one.setUTCFullYear(one.getUTCFullYear()+1);
  c('now under 18: one year from the first send, no address kept', [kid.minor,kid.expires,kid.email,kid.emailOk], [true,one.getTime(),null,false]);
  c('the retention marker moved with it', [!!st.peek(mark(p,rid,one.getTime())),!!st.peek(mark(p,rid,before.expires))], [true,false]);
  r=await post({op:'update',pub:p,rid,token:tok,code:code(4),name:'Maria Lopez',minor:false});
  c('back to adult never extends it', [st.peek(key).minor,st.peek(key).expires], [false,one.getTime()]);
  await post({op:'delete',pub:p,rid,token:tok});
  r=await post({op:'update',pub:p,rid,token:tok,code:code(5),name:'Maria Lopez'});
  c('update on a deleted result → 404 not-found (the page then submits afresh)', [r.status,r.j.error], [404,'not-found']);
  globalThis.__terrainGiftsStore=S;
}

console.log('\n-- close, purge and rate limits (security review SEC-5) --');
{ const st=makeStore(); globalThis.__terrainGiftsStore=st;
  const q=await post({op:'id',church:'Grace'}); const p=q.j.pub, k=q.j.key;
  const ids=[]; for(let i=0;i<4;i++){ const x=await post({op:'submit',pub:p,code:code(i),name:'M '+i}); ids.push(x.j); }
  r=await post({op:'close',pub:p,key:'W'.repeat(32)}); c('close with the wrong key → 403', [r.status,r.j.error], [403,'bad-key']);
  r=await post({op:'close',pub:p,key:k}); c('close → ok', [r.status,r.j.ok], [200,true]);
  r=await post({op:'submit',pub:p,code:code(9),name:'Late'}); c('a closed link takes no new results → 410 closed', [r.status,r.j.error], [410,'closed']);
  r=await post({op:'ctx',pub:p}); c('the member page can tell it is closed', [r.status,r.j.closed], [200,true]);
  r=await post({op:'list',pub:p,key:k}); c('what came in can still be listed', r.j.items.length, 4);
  r=await post({op:'update',pub:p,rid:ids[0].rid,token:ids[0].token,code:code(8),name:'M 0'}); c('…and a member can still update their own', r.status, 200);
  r=await post({op:'purge',pub:p,key:'W'.repeat(32),rids:[ids[1].rid]}); c('purge with the wrong key → 403', r.status, 403);
  r=await post({op:'purge',pub:p,key:k,rids:[]}); c('purge with no rids → 400', [r.status,r.j.error], [400,'bad-rids']);
  r=await post({op:'purge',pub:p,key:k,rids:['../x']}); c('purge with a malformed rid → 400', r.status, 400);
  r=await post({op:'purge',pub:p,key:k,rids:Array.from({length:501},(_,i)=>'r'+String(i).padStart(11,'0'))}); c('more than 500 at once → 400', r.status, 400);
  r=await post({op:'purge',pub:p,key:k,rids:[ids[1].rid,ids[2].rid,ids[1].rid,'ZZZZZZZZZZZZ']});
  c('purge deletes the listed results, with their markers', [r.status,r.j.deleted,!!st.peek('r/'+p+'/'+ids[1].rid),[...st.m.keys()].some(x=>x.startsWith('x/')&&x.endsWith(ids[2].rid))], [200,2,false,false]);
  c('…and leaves the rest', [!!st.peek('r/'+p+'/'+ids[0].rid),!!st.peek('r/'+p+'/'+ids[3].rid)], [true,true]);
  // per client address: 60 new results an hour
  const q2=await post({op:'id'}); const p2=q2.j.pub;
  const ctx={ip:'203.0.113.9'}; const got=[];
  for(let i=0;i<61;i++){ const x=await post({op:'submit',pub:p2,code:code(i),name:'Flood '+i},{},ctx); got.push(x.status); }
  c('one client address: 60 an hour, then 429 slow-down', [got.slice(0,60).every(x=>x===200),got[60]], [true,429]);
  r=await post({op:'submit',pub:p2,code:code(),name:'Someone else'},{},{ip:'198.51.100.7'});
  c('another address is not held back, and the refusals used none of the campaign’s allowance', [r.status,st.peek('c/'+p2).subs.h], [200,61]);
  c('the address is kept only as a salted hash', [JSON.stringify(st.peek('g/ip')).includes('203.0.113.9'),Object.keys(st.peek('g/ip').to).length], [false,2]);
  // per campaign: 200 an hour, 1000 a day
  { const cp=st.peek('c/'+p2); cp.subs={...cp.subs,h:200}; st.poke('c/'+p2,cp); }
  r=await post({op:'submit',pub:p2,code:code(),name:'Hour'}); c('200 an hour per campaign → 429 slow-down', [r.status,r.j.error], [429,'slow-down']);
  { const cp=st.peek('c/'+p2); cp.subs={...cp.subs,hour:'2000-01-01T00',h:200,d:1000}; st.poke('c/'+p2,cp); }
  r=await post({op:'submit',pub:p2,code:code(),name:'Day'}); c('1000 a day per campaign → 429', [r.status,r.j.error], [429,'slow-down']);
  { const cp=st.peek('c/'+p2); cp.subs={hour:'2000-01-01T00',h:200,day:'2000-01-01',d:1000}; st.poke('c/'+p2,cp); }
  r=await post({op:'submit',pub:p2,code:code(),name:'Tomorrow'}); c('a new hour and day reset them', r.status, 200);
  globalThis.__terrainGiftsStore=S;
}

console.log('\n-- one client address cannot drain email for every church (security review SEC-1) --');
{ const st=makeStore(); globalThis.__terrainGiftsStore=st;
  const campaigns=[]; for(let i=0;i<2;i++){ const q=await post({op:'id'}); campaigns.push(q.j.pub); }
  const ctx={ip:'192.0.2.44'}; const res=[]; const before=sent.length;
  for(let i=0;i<31;i++){ const p=campaigns[i%2]; const x=await post({op:'submit',pub:p,code:code(i),name:'Pat Lee',email:'v'+i+'@example.org',emailOk:true},{},{ip:'10.0.0.'+i});
    r=await post({op:'email',pub:p,rid:x.j.rid,token:x.j.token},{},ctx); res.push(r.status); }
  c('30 emails a day from one client address, across campaigns, then 429', [res.slice(0,30).every(x=>x===200),res[30],sent.length-before], [true,429,30]);
  const q=await post({op:'id'}); const x=await post({op:'submit',pub:q.j.pub,code:code(),name:'Real Member',email:'real@example.org',emailOk:true});
  r=await post({op:'email',pub:q.j.pub,rid:x.j.rid,token:x.j.token},{},{ip:'198.51.100.200'});
  c('another church’s member can still email their report', r.status, 200);
  c('no client address is stored in the clear', JSON.stringify(st.peek('g/sends')).includes('192.0.2.44'), false);
  globalThis.__terrainGiftsStore=S;
}

console.log('\n-- creating campaigns: a limit per client, the registration token (v10.38.0 review S1, S2) --');
{ const st=makeStore(); globalThis.__terrainGiftsStore=st;
  const ctx0={church:'Pastors Hub account notice: re-verify at evil.example',min:{},needs:[]};
  const got=[];
  for(let i=0;i<11;i++){ const x=await post({op:'id',ctx:ctx0},{},{ip:'192.0.2.66'}); got.push(x.status); }
  c('one client: ten campaigns a day, then 429 slow-down', [got.slice(0,10).every(x=>x===200),got[10]], [true,429]);
  c('the eleventh stored nothing', [...st.m.keys()].filter(k=>k.startsWith('c/')).length, 10);
  r=await post({op:'id'},{},{ip:'192.0.2.67'});
  c('another client is not held back', r.status, 200);
  const six=[]; for(let i=1;i<=11;i++){ const x=await post({op:'id'},{},{ip:'2001:db8:aaaa:bbbb::'+i}); six.push(x.status); }
  c('IPv6: counted by /64, so rotating the host bits does not escape it', six[10], 429);
  const day=new Date().toISOString().slice(0,10);
  c('the count is one small blob per client and day, holding a number', [...st.m.keys()].filter(k=>k.startsWith('g/cid/')).every(k=>new RegExp('^g/cid/'+day+'/[A-Za-z0-9_-]{22}$').test(k)&&Object.keys(st.peek(k)).join()==='n'), true);
  c('no raw client address is stored', /192\.0\.2\.66|2001:db8/.test(JSON.stringify([...st.m.entries()])), false);
  r=await post({op:'id',ctx:{church:'x',fac:'not-a-list'}},{},{ip:'192.0.2.68'});
  c('a refused context is not counted', [r.status,[...st.m.keys()].filter(k=>k.startsWith('g/cid/')).length], [400,3]);
  r=await post({op:'id'});
  c('outside Netlify (no client address): no limit', r.status, 200);
  // The registration token, while TERRAIN_REG_SECRET is set.
  const SECRET='gifts-test-secret-0123456789-abcdefghij';
  const tokOf=(id,t=Date.now())=>{ const iat=Math.floor(t/1000).toString(36); return `r1.${id}.${iat}.`+createHmac('sha256',SECRET).update(`terrain-reg|r1|${id}|${iat}`,'utf8').digest('base64url').slice(0,32); };
  process.env.TERRAIN_REG_SECRET=SECRET;
  r=await post({op:'id'},{},{ip:'192.0.2.69'});
  c('secret set: no token → 401 noreg', [r.status,r.j.error], [401,'noreg']);
  r=await post({op:'id'},{'x-terrain-reg':tokOf('AbCdEfGhIjKl',Date.now()-200*864e5)},{ip:'192.0.2.69'});
  c('an expired token → 401', r.status, 401);
  r=await post({op:'id'},{'x-terrain-reg':tokOf('AbCdEfGhIjKl')},{ip:'192.0.2.69'});
  c('a current token → a campaign', [r.status,!!r.j.pub], [200,true]);
  r=await post({op:'submit',pub:r.j.pub,code:code(),name:'Member'});
  c('members never need a token', r.status, 200);
  process.env.TERRAIN_CODES='PA-2026-K7M2'; process.env.TERRAIN_REQUIRE_CODE='1';
  r=await post({op:'id'},{'x-terrain-code':'PA-2026-K7M2'},{ip:'192.0.2.70'});
  c('codes switched back on: the code is the gate, no token asked for', r.status, 200);
  delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.TERRAIN_REG_SECRET;
  globalThis.__terrainGiftsStore=S; }

console.log('\n-- the sweep: unused campaigns and old counters (v10.38.0 review S1, S4) --');
{ const sweepMod=await import(new URL('../netlify/functions/gifts-sweep.mjs', import.meta.url).href);
  const st=makeStore(); globalThis.__terrainGiftsStore=st;
  const rs=makeStore(); globalThis.__terrainRegStore=rs;
  const DAY=864e5, now=Date.now(), day=t=>new Date(t).toISOString().slice(0,10);
  const mk=async()=>(await post({op:'id'})).j;
  const old=await mk(), used=await mk(), opened=await mk(), fresh=await mk(), listed=await mk();
  const age=(pub,ms,extra={})=>{ const cp=st.peek('c/'+pub); cp.created=now-ms; Object.assign(cp,extra); st.poke('c/'+pub,cp); };
  age(old.pub,31*DAY); age(used.pub,400*DAY); age(opened.pub,90*DAY,{seen:day(now-3*DAY)}); age(fresh.pub,5*DAY); age(listed.pub,60*DAY);
  await post({op:'submit',pub:used.pub,code:code(),name:'Someone'});
  // A member opening the link, or the pastor listing it, marks it seen today.
  r=await post({op:'list',pub:listed.pub,key:listed.key});
  c('the pastor listing an empty campaign marks it seen today', st.peek('c/'+listed.pub).seen, day(now));
  const gone=await mk(); age(gone.pub,45*DAY,{seen:day(now-40*DAY)});
  await post({op:'ctx',pub:gone.pub}); c('a member opening it marks it seen today too', st.peek('c/'+gone.pub).seen, day(now)); age(gone.pub,45*DAY,{seen:day(now-40*DAY)});
  r=await post({op:'ctx',pub:used.pub});
  c('a campaign that has had a result is not written to on open', 'seen' in st.peek('c/'+used.pub), false);
  // old counters in both stores; g/ip and g/sends are not by-day keys and stay
  const Y=day(now-DAY), T=day(now);
  for(const k of ['g/cid/'+Y+'/AAAAAAAAAAAAAAAAAAAAAA','g/salt/'+Y,'g/cid/'+T+'/BBBBBBBBBBBBBBBBBBBBBB','g/salt/'+T]) st.poke(k,{n:1,salt:'s'});
  st.poke('g/ip',{hour:'x',to:{}}); st.poke('g/sends',{date:'2000-01-01',n:1});
  for(const k of ['g/reg/'+Y+'T05/CCCCCCCCCCCCCCCCCCCCCC','g/adm/'+Y+'T23/DDDDDDDDDDDDDDDDDDDDDD','g/salt/'+Y,'g/reg/'+T+'T00/EEEEEEEEEEEEEEEEEEEEEE']) rs.poke(k,{n:1});
  rs.poke('e/'+'a'.repeat(64),{id:'x'});
  const out=await (await sweepMod.default(new Request('https://x/',{method:'POST',body:'{}'}))).json();
  c('sweep: reports what it did', [out.ok,out.campaigns,out.counters,out.left], [true,2,5,0]);
  c('a campaign with no result and not opened for 31 days is deleted', st.peek('c/'+old.pub), null);
  c('one last opened 40 days ago is deleted too', st.peek('c/'+gone.pub), null);
  c('one that has had a result is kept, however old', !!st.peek('c/'+used.pub), true);
  c('one opened three days ago is kept', !!st.peek('c/'+opened.pub), true);
  c('one five days old is kept', !!st.peek('c/'+fresh.pub), true);
  c('one its pastor listed today is kept', !!st.peek('c/'+listed.pub), true);
  c('earlier days’ counters and day keys go, in both stores', [st.peek('g/cid/'+Y+'/AAAAAAAAAAAAAAAAAAAAAA'),st.peek('g/salt/'+Y),rs.peek('g/reg/'+Y+'T05/CCCCCCCCCCCCCCCCCCCCCC'),rs.peek('g/adm/'+Y+'T23/DDDDDDDDDDDDDDDDDDDDDD'),rs.peek('g/salt/'+Y)], [null,null,null,null,null]);
  c('today’s stay', [!!st.peek('g/cid/'+T+'/BBBBBBBBBBBBBBBBBBBBBB'),!!st.peek('g/salt/'+T),!!rs.peek('g/reg/'+T+'T00/EEEEEEEEEEEEEEEEEEEEEE')], [true,true,true]);
  c('g/ip, g/sends and the registrations themselves are never touched', [!!st.peek('g/ip'),!!st.peek('g/sends'),!!rs.peek('e/'+'a'.repeat(64))], [true,true,true]);
  delete globalThis.__terrainRegStore;
  globalThis.__terrainGiftsStore=S; }

console.log('\n-- the member\'s language travels (review E2E-8) --');
{ const st=makeStore(); globalThis.__terrainGiftsStore=st;
  const q=await post({op:'id'}); const p=q.j.pub;
  const m=await post({op:'submit',pub:p,code:code(),name:'Ana Ruiz',email:'ana.r@example.org',emailOk:true,lang:'es'});
  const i=await post({op:'invite',pub:p,rid:m.j.rid,token:m.j.token,gifts:['teach']});
  await post({op:'confirm',pub:p,rid:m.j.rid,itok:i.j.itok,name:'Obs',ratings:{teach:3}});
  r=await post({op:'peek',pub:p,rid:m.j.rid,itok:i.j.itok});
  c('a used invite answers 410 with the member’s language', [r.status,r.j.error,r.j.lang], [410,'used','es']);
  delete process.env.SITE_URL;
  await post({op:'email',pub:p,rid:m.j.rid,token:m.j.token,lang:'es'},{},{site:{url:'https://pastorshub.org'}});
  c('a Spanish report’s private link says ~es', new RegExp(`https://pastorshub\\.org/#gifts-report=${p}\\.${m.j.rid}\\.${m.j.token}\\.[A-Za-z0-9_-]{32}~es`).test(sent.at(-1).body.text), true);
  globalThis.__terrainGiftsStore=S;
}

console.log('\n-- the verified-address flow under attack (security review of gifts-1.1) --');
{ const st=makeStore({etags:true}); globalThis.__terrainGiftsStore=st;
  process.env.RESEND_API_KEY='re_test_0000000000000000'; process.env.GIFTS_FROM='Terrain <reports@pastorshub.org>';
  const vt=m=>(/#gifts-report=[^.\s]+\.[^.\s]+\.[^.\s]+\.([A-Za-z0-9_-]{32})/.exec(m.body.text)||[])[1];
  const q=await post({op:'id',church:'Grace'}); const p=q.j.pub;
  const EVIL=Buffer.from('%PDF-1.4\n% Your account is locked. Call 1-800-555-0100.\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF').toString('base64');
  // Someone submits a result with a stranger's address, then the stranger opens the link.
  const m=await post({op:'submit',pub:p,code:code(),name:'Mallory',email:'stranger@example.org',emailOk:true});
  const rid=m.j.rid, tok=m.j.token, key='r/'+p+'/'+rid;
  await post({op:'email',pub:p,rid,token:tok}); const v=vt(sent.at(-1));
  r=await post({op:'emailpdf',pub:p,rid,token:tok,pdf:EVIL});
  c('the submitter cannot poll to learn whether the link was opened: 403 bad-vtok, not not-verified', [r.status,r.j.error], [403,'bad-vtok']);
  r=await post({op:'verify',pub:p,rid,token:tok,vtok:v}); c('the stranger opens the link', [r.status,r.j.verified], [200,true]);
  const n0=sent.length;
  r=await post({op:'emailpdf',pub:p,rid,token:tok,pdf:EVIL});
  c('then the submitter (token only) still cannot attach a PDF of their own → 403 bad-vtok, nothing sent or counted', [r.status,r.j.error,sent.length-n0,st.peek(key).pdfs], [403,'bad-vtok',0,0]);
  r=await post({op:'emailpdf',pub:p,rid,token:tok,vtok:tok,pdf:EVIL});
  c('…nor with the token given as the VTOK', [r.status,r.j.error], [403,'bad-vtok']);
  r=await post({op:'emailpdf',pub:p,rid,token:tok,vtok:st.peek(key).vtoks[0],pdf:EVIL});
  c('…nor with the stored hash given as the VTOK', [r.status,r.j.error], [403,'bad-vtok']);
  const o=await post({op:'submit',pub:p,code:code(),name:'Oscar',email:'oscar@example.org',emailOk:true});
  await post({op:'email',pub:p,rid:o.j.rid,token:o.j.token}); const ov=vt(sent.at(-1));
  await post({op:'verify',pub:p,rid:o.j.rid,token:o.j.token,vtok:ov});
  r=await post({op:'emailpdf',pub:p,rid,token:tok,vtok:ov,pdf:EVIL});
  c('…nor with another result’s VTOK', [r.status,r.j.error,sent.length-n0], [403,'bad-vtok',1]);
  r=await post({op:'emailpdf',pub:p,rid,token:tok,vtok:v,pdf:EVIL});
  c('whoever holds the emailed VTOK (the inbox itself) can → 200, to that inbox', [r.status,sent.at(-1).body.to], [200,['stranger@example.org']]);

  // The daily five is per inbox: a +tag, dots or googlemail.com make no new one.
  const res=[], b5=sent.length;
  for(const e of ['victim@gmail.com','victim+1@gmail.com','Victim+two@gmail.com','v.ictim@gmail.com','vic.tim+3@googlemail.com','victim+4@gmail.com']){
    const x=await post({op:'submit',pub:p,code:code(),name:'Vic',email:e,emailOk:true});
    r=await post({op:'email',pub:p,rid:x.j.rid,token:x.j.token}); res.push(r.status); }
  c('+tags, dots and googlemail.com share one inbox’s five a day', [res,sent.length-b5], [[200,200,200,200,200,429],5]);
  r=await post({op:'submit',pub:p,code:code(),name:'Other',email:'victimx@gmail.com',emailOk:true});
  r=await post({op:'email',pub:p,rid:r.j.rid,token:r.j.token});
  c('…a different inbox is not held back', r.status, 200);
  { const tagOf=e=>createHmac('sha256','re_test_0000000000000000').update(e).digest('base64url').slice(0,22);
    const g=st.peek('g/sends'); c('the count is under the inbox’s keyed tag', [g.to[tagOf('victim@gmail.com')],g.to[tagOf('victim+1@gmail.com')]], [5,undefined]); }

  // An address changed while a link email is on its way: the address counted
  // must be the address mailed, or one inbox could get more than five a day.
  { let hook=null; const set0=st.setJSON;
    st.setJSON=async(k,val,opt)=>{ const w=await set0(k,val,opt); if(k==='g/sends'&&hook){ const h=hook; hook=null; await h(); } return w; };
    const x=await post({op:'submit',pub:p,code:code(),name:'Mal',email:'mal@example.org',emailOk:true});
    const rk='r/'+p+'/'+x.j.rid, camp0=st.peek('c/'+p).sends.n, b7=sent.length;
    hook=()=>post({op:'update',pub:p,rid:x.j.rid,token:x.j.token,code:code(),name:'Mal',email:'target@example.org',emailOk:true});
    r=await post({op:'email',pub:p,rid:x.j.rid,token:x.j.token});
    c('email racing an address change → 503 busy, nothing sent', [r.status,r.j.error,sent.length-b7], [503,'busy',0]);
    c('…and nothing kept: no count, no link, the campaign’s send given back', [st.peek(rk).emails,st.peek(rk).vtoks,st.peek('c/'+p).sends.n], [0,[],camp0]);
    r=await post({op:'email',pub:p,rid:x.j.rid,token:x.j.token});
    c('sent again, it goes to the new address and is counted there', [r.status,sent.at(-1).body.to,st.peek('g/sends').to[createHmac('sha256','re_test_0000000000000000').update('target@example.org').digest('base64url').slice(0,22)]], [200,['target@example.org'],1]);
    st.setJSON=set0; }

  // A confirmed address swapped for a look-alike that toLowerCase() folds to it.
  { const x=await post({op:'submit',pub:p,code:code(),name:'Kim',email:'kim@example.org',emailOk:true});
    const rk='r/'+p+'/'+x.j.rid;
    await post({op:'email',pub:p,rid:x.j.rid,token:x.j.token}); await post({op:'verify',pub:p,rid:x.j.rid,token:x.j.token,vtok:vt(sent.at(-1))});
    await post({op:'update',pub:p,rid:x.j.rid,token:x.j.token,code:code(),name:'Kim',email:'KIM@example.org',emailOk:true});
    c('an A–Z case change keeps the address confirmed', st.peek(rk).emailVerified, true);
    await post({op:'update',pub:p,rid:x.j.rid,token:x.j.token,code:code(),name:'Kim',email:'Kim@example.org',emailOk:true});
    c('the Kelvin sign (K, folds to k) is a different address: unconfirmed, its links forgotten', [st.peek(rk).emailVerified,st.peek(rk).vtoks], [false,[]]); }
  globalThis.__terrainGiftsStore=S;
}

console.log('\n-- failures and leaks --');
globalThis.__terrainGiftsStore={ async get(){ throw new Error('store down for '+EMAIL+' '+A.token+' '+KEY); } };
r=await post({op:'list',pub:PUB,key:KEY});
c('a store failure → 500 server', [r.status,r.j.error], [500,'server']);
c('and it was logged', logs.some(l=>/gifts: unexpected failure in op list/.test(l)));
globalThis.__terrainGiftsStore=S;
const all=bodies.join('\n');
// One character before the @ is enough to detect an address, and keeps the scan
// linear over the multi-megabyte list pages (a leading [...]+ backtracks badly).
c('no response ever contains an email address', /[A-Za-z0-9._%+-]@[A-Za-z0-9.-]+\.[a-z]{2,}/i.test(all), false);
c('no response ever contains a hash', [/[0-9a-f]{64}/.test(all), /Hash"/.test(all), /"h":/.test(all)], [false,false,false]);
// (status carries email:true|false — whether sending is configured — never an address)
c('no response ever contains a stored secret field', /"email":"|"(emailOk|invites|tokenHash|keyHash|vtoks|emailVerified)":/.test(all), false);
// Every verification token that went out in a link email, and none comes back
// in any response (gifts-1.1).
{ const vt=[...new Set(sent.flatMap(x=>[...String(x.body.text||'').matchAll(/#gifts-report=[^.\s]+\.[^.\s]+\.[^.\s]+\.([A-Za-z0-9_-]{32})/g)].map(m=>m[1])))];
  c('verification tokens were emailed', vt.length>10, true);
  c('no response ever contains a verification token', vt.filter(v=>all.includes(v)).length, 0);
  c('no link email ever carried an attachment; every PDF copy did', sent.every(x=>/\(PDF\)$/.test(x.body.subject)===Array.isArray(x.body.attachments)), true); }
const logText=logs.join('\n');
const secrets=[EMAIL,'gus@example.org',A.token,B.token,G.token,KEY,KEY2,I1,V1,V2,code(1),'re_test_0000000000000000'];
c('logs never contain an email, token, key or code', secrets.filter(x=>logText.includes(x)).length, 0);
c('every response is JSON with cache-control: no-store', badHeaders, 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
