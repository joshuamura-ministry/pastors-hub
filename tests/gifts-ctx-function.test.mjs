// gifts.mjs: the campaign context behind the short member link (#gifts=<pub>).
// op 'id' can store it, op 'setctx' (campaign key) replaces it, op 'ctx' reads
// it back publicly. Types and sizes are checked, prototype keys refused.
// In-memory store, no network.
delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.RESEND_API_KEY; delete process.env.GIFTS_FROM;
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,300));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};

function makeStore({etags=false}={}){
  const m=new Map(); let n=0;
  const s={ m,
    async get(k){ const v=m.get(k); return v===undefined?null:JSON.parse(v.data); },
    async setJSON(k,val,o={}){ const cur=m.get(k);
      if(o.onlyIfNew&&cur) return {modified:false};
      if(o.onlyIfMatch&&(!cur||cur.etag!==o.onlyIfMatch)) return {modified:false};
      const etag='e'+(++n); m.set(k,{data:JSON.stringify(val),etag}); return {modified:true,etag}; },
    async delete(k){ m.delete(k); },
    async list({prefix=''}={}){ return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}; },
    peek(k){ const v=m.get(k); return v?JSON.parse(v.data):null; } };
  if(etags) s.getWithMetadata=async k=>{ const v=m.get(k); return v?{data:JSON.parse(v.data),etag:v.etag}:null; };
  return s;
}
const S=makeStore({etags:true}); globalThis.__terrainGiftsStore=S;
globalThis.fetch=async()=>{ throw new Error('no network in this test'); };
const fn=(await import(new URL('../netlify/functions/gifts.mjs', import.meta.url).href)).default;
const bodies=[];
async function post(body,headers={}){
  const res=await fn(new Request('https://x/.netlify/functions/gifts',{method:'POST',headers:{'content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)}),{});
  const t=await res.text(); bodies.push(t);
  return {status:res.status,j:JSON.parse(t),cc:res.headers.get('cache-control')};
}

const CTX={church:'Bucks County SDA',fac:['kitchen','classrooms'],min:{'Small groups':'r','Adventurers':'s'},
  churchId:'5f1c2a9e-7d1b-4c1e-9d3a-2b6f0e4a1c77',
  needs:[{id:'kids',v:27,x:null},{id:'lang-primary',v:19,x:'Spanish'},{id:'growth',v:470}],
  area:'Census Tract 2041.02',year:2024};
const WANT={church:'Bucks County SDA',fac:['kitchen','classrooms'],min:{'Small groups':'r','Adventurers':'s'},
  churchId:'5f1c2a9e-7d1b-4c1e-9d3a-2b6f0e4a1c77',
  needs:[{id:'kids',v:27,x:null},{id:'lang-primary',v:19,x:'Spanish'},{id:'growth',v:470,x:null}],
  area:'Census Tract 2041.02',year:2024};

console.log('-- id can store the context with the campaign --');
let r=await post({op:'id',church:'Bucks County SDA',ctx:CTX});
c('id with ctx → pub, key and ctx:true', [r.status,/^[A-Za-z0-9_-]{12}$/.test(r.j.pub),/^[A-Za-z0-9_-]{32}$/.test(r.j.key),r.j.ctx], [200,true,true,true]);
const PUB=r.j.pub, KEY=r.j.key;
c('stored on the campaign record, field by field', S.peek('c/'+PUB).ctx, WANT);
c('with the time it was set', typeof S.peek('c/'+PUB).ctxAt, 'number');
r=await post({op:'id',church:'Fairview Village SDA'});
c('id without ctx still works, and does not claim one', [r.status,'ctx' in r.j,'ctx' in S.peek('c/'+r.j.pub)], [200,false,false]);
const PUB2=r.j.pub, KEY2=r.j.key;
r=await post({op:'id',ctx:{church:'Only In Ctx'}});
c('the church name falls back to the context when id has none', S.peek('c/'+r.j.pub).church, 'Only In Ctx');
r=await post({op:'id',church:'X',ctx:{church:5}});
c('id with a bad ctx is refused and creates nothing', [r.status,r.j.error], [400,'bad-ctx']);
process.env.TERRAIN_CODES='PA-2026-K7M2';
// Updated for v10.38.0: codes gate id only while TERRAIN_REQUIRE_CODE is '1'.
r=await post({op:'id',ctx:CTX});
c('codes set but not required: id with ctx is open', [r.status,r.j.ctx], [200,true]);
process.env.TERRAIN_REQUIRE_CODE='1';
r=await post({op:'id',ctx:CTX});
c('access codes still gate id when required (with ctx too)', [r.status,r.j.error], [401,'nocode']);
r=await post({op:'id',ctx:CTX},{'x-terrain-code':'PA-2026-K7M2'});
c('a valid code creates it', [r.status,r.j.ctx], [200,true]);
delete process.env.TERRAIN_REQUIRE_CODE;
delete process.env.TERRAIN_CODES;

console.log('-- ctx: public read --');
r=await post({op:'ctx',pub:PUB});
c('ctx {pub} → the stored context', [r.status,r.j.ok,r.j.ctx], [200,true,WANT]);
c('no-store', r.cc, 'no-store, max-age=0');
c('nothing but the context comes back (no key, no hash, no sends)', Object.keys(r.j).sort(), ['ctx','ok']);
r=await post({op:'ctx',pub:PUB2});
c('a campaign with no context → ctx:null', [r.status,r.j.ctx], [200,null]);
r=await post({op:'ctx',pub:'AAAAAAAAAAAA'});
c('unknown campaign → 404', [r.status,r.j.error], [404,'no-campaign']);
r=await post({op:'ctx',pub:'../c/x'});
c('malformed pub → 400', [r.status,r.j.error], [400,'bad-pub']);
r=await post({op:'ctx'});
c('missing pub → 400', r.status, 400);
r=await post({op:'ctx',pub:PUB,key:'nonsense'});
c('ctx needs no key and ignores one', r.status, 200);

console.log('-- setctx: the campaign key replaces it --');
const NEXT={...CTX,min:{'Prayer ministry':'r'},needs:[{id:'kids',v:30}]};
r=await post({op:'setctx',pub:PUB2,key:KEY2,ctx:NEXT});
c('setctx with the key → ok', [r.status,r.j], [200,{ok:true}]);
r=await post({op:'ctx',pub:PUB2});
c('and ctx now answers it', [r.j.ctx.min,r.j.ctx.needs], [{'Prayer ministry':'r'},[{id:'kids',v:30,x:null}]]);
c('the campaign church follows the context (peek and email name it)', S.peek('c/'+PUB2).church, 'Bucks County SDA');
r=await post({op:'setctx',pub:PUB2,key:KEY,ctx:CTX});
c('another campaign\'s key → 403', [r.status,r.j.error], [403,'bad-key']);
r=await post({op:'setctx',pub:PUB2,ctx:CTX});
c('no key → 403', [r.status,r.j.error], [403,'bad-key']);
r=await post({op:'setctx',pub:PUB2,key:'x'.repeat(32),ctx:CTX});
c('a well-formed wrong key → 403', [r.status,r.j.error], [403,'bad-key']);
r=await post({op:'setctx',pub:PUB2,key:12345,ctx:CTX});
c('a key that is not a string → 403', r.status, 403);
r=await post({op:'setctx',pub:'AAAAAAAAAAAA',key:KEY2,ctx:CTX});
c('unknown campaign → 404', [r.status,r.j.error], [404,'no-campaign']);
r=await post({op:'setctx',pub:PUB2,key:KEY2});
c('ctx is required', [r.status,r.j.error], [400,'bad-ctx']);
r=await post({op:'ctx',pub:PUB2});
c('failed attempts left the context as it was', r.j.ctx.min, {'Prayer ministry':'r'});

console.log('-- types and sizes --');
const bad=async(label,ctx,status=400,error='bad-ctx')=>{ const q=await post({op:'setctx',pub:PUB2,key:KEY2,ctx}); c(label,[q.status,q.j.error],[status,error]); };
await bad('ctx as an array', [CTX]);
await bad('ctx as a string', 'kids=27');
await bad('ctx as null', null);
await bad('church not a string', {church:['x']});
await bad('church over 200 characters', {church:'a'.repeat(201)});
await bad('area over 120 characters', {area:'a'.repeat(121)});
await bad('churchId over 80 characters', {churchId:'a'.repeat(81)});
await bad('fac not an array', {fac:'kitchen'});
await bad('a facility id with odd characters', {fac:['kitchen<script>']});
await bad('more than 40 facilities', {fac:Array.from({length:41},(_,i)=>'f'+i)});
await bad('min as an array', {min:[['Small groups','r']]});
await bad('a ministry state other than r or s', {min:{'Small groups':'yes'}});
await bad('a ministry state that is an object', {min:{'Small groups':{r:1}}});
await bad('a ministry name over 120 characters', {min:{['m'.repeat(121)]:'r'}});
await bad('a ministry name with a line break', {min:{'Small\ngroups':'r'}});
await bad('more than 80 ministries', {min:Object.fromEntries(Array.from({length:81},(_,i)=>['M'+i,'r']))});
await bad('needs not an array', {needs:{kids:27}});
await bad('more than 40 needs', {needs:Array.from({length:41},(_,i)=>({id:'n'+i,v:1}))});
await bad('a need id with capitals or dots', {needs:[{id:'Kids.x',v:1}]});
await bad('a need value that is not an integer', {needs:[{id:'kids',v:27.5}]});
await bad('a need value given as text', {needs:[{id:'kids',v:'27'}]});
await bad('a need value out of range', {needs:[{id:'kids',v:1e12}]});
await bad('the same need twice', {needs:[{id:'kids',v:1},{id:'kids',v:2}]});
await bad('a need extra over 80 characters', {needs:[{id:'lang-primary',v:19,x:'x'.repeat(81)}]});
await bad('a need extra that is not text', {needs:[{id:'lang-primary',v:19,x:{a:1}}]});
await bad('a year before the ACS', {year:1999});
await bad('a year as text', {year:'2024'});
await bad('more than 16 KB of JSON', {church:'Bucks',junk:'x'.repeat(16*1024)}, 413, 'too-large');
r=await post({op:'id',ctx:{junk:'x'.repeat(17000)}});
c('id refuses an oversized ctx too', [r.status,r.j.error], [413,'too-large']);
r=await post({op:'setctx',pub:PUB2,key:KEY2,ctx:{church:'  Bucks\u0000  County  ',extra:'dropped',needs:[{id:'kids',v:-3,x:'',also:'dropped'}]}});
c('a minimal context is accepted', r.status, 200);
c('unknown fields are dropped, text tidied, defaults filled', S.peek('c/'+PUB2).ctx,
  {church:'Bucks County',fac:[],min:{},churchId:'',needs:[{id:'kids',v:-3,x:null}],area:'',year:null});
r=await post({op:'setctx',pub:PUB2,key:KEY2,ctx:{fac:['kitchen','kitchen','gym']}});
c('a facility named twice is kept once', S.peek('c/'+PUB2).ctx.fac, ['kitchen','gym']);

console.log('-- prototype pollution --');
const before=JSON.stringify(Object.getOwnPropertyNames(Object.prototype).sort());
const raw=k=>`{"op":"setctx","pub":"${PUB2}","key":"${KEY2}","ctx":{"church":"P","min":{"${k}":"r"}}}`;
for(const k of ['__proto__','constructor','prototype']){
  r=await post(raw(k));
  c(`a ministry named "${k}" is refused`, [r.status,r.j.error], [400,'bad-ctx']);
}
r=await post(`{"op":"setctx","pub":"${PUB2}","key":"${KEY2}","ctx":{"church":"P","min":{"__proto__":{"polluted":"r"}}}}`);
c('a __proto__ object under min is refused', [r.status,r.j.error], [400,'bad-ctx']);
r=await post(`{"op":"setctx","pub":"${PUB2}","key":"${KEY2}","ctx":{"__proto__":{"church":"Evil","polluted":1},"church":"Safe"}}`);
c('a __proto__ at the top of ctx is ignored, not merged', [r.status,S.peek('c/'+PUB2).ctx.church,'polluted' in S.peek('c/'+PUB2).ctx], [200,'Safe',false]);
r=await post(`{"op":"setctx","pub":"${PUB2}","key":"${KEY2}","ctx":{"church":"P","needs":[{"__proto__":{"id":"kids","v":1}}]}}`);
c('a need hiding its fields behind __proto__ is refused', [r.status,r.j.error], [400,'bad-ctx']);
r=await post(`{"op":"id","ctx":{"church":"P","min":{"__proto__":"r"}}}`);
c('id refuses the same keys', [r.status,r.j.error], [400,'bad-ctx']);
c('Object.prototype untouched', [JSON.stringify(Object.getOwnPropertyNames(Object.prototype).sort())===before,({}).polluted,({}).church], [true,undefined,undefined]);
r=await post({op:'ctx',pub:PUB2});
c('what is read back is a plain context', [Object.keys(r.j.ctx).sort(),Object.getPrototypeOf(r.j.ctx)===Object.prototype], [['area','church','churchId','fac','min','needs','year'],true]);

console.log('-- the other ops are unaffected --');
r=await post({op:'submit',pub:PUB,code:'TG1-'+Buffer.from('{"v":4}').toString('base64url'),name:'Ana'});
c('members still submit to a campaign that has a context', [r.status,r.j.ok], [200,true]);
r=await post({op:'list',pub:PUB,key:KEY});
c('and the pastor still lists them', [r.status,r.j.items.length], [200,1]);
c('no response ever carries a key hash', /keyHash|tokenHash|[0-9a-f]{64}/.test(bodies.join('\n')), false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
