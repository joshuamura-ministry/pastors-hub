// Exercise register.mjs (register-1.2: + signin, v10.46.0) against an in-memory store.
// No real storage, no email, no network.
// Updated for register-1.1 (v10.38.0 review, findings S2–S11): the first
// registration's words stand and later ones are kept as claims; every answer
// is {ok} (plus a token when TERRAIN_REG_SECRET is set), never an id or
// "returning"; one counter blob per client and hour; IPv6 by /64; JSON only;
// invisible format characters stripped; admin keys of 32+ characters with
// failed attempts counted.
delete process.env.TERRAIN_ADMIN_KEY; delete process.env.TERRAIN_REG_SECRET;
delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE;
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,240));fail++}else pass++};

// ---- a fake Netlify Blobs store (the subset the function uses), with ETags --
const tick=()=>new Promise(r=>setImmediate(r));
function makeStore(lat=0){
  const m=new Map(); let n=0;
  // lat: a random delay per call, up to lat ms, like the real store's network.
  const wait=()=>lat?new Promise(r=>setTimeout(r,5+Math.random()*lat)):tick();
  const s={ m,
    async get(k){ await wait(); const v=m.get(k); return v===undefined?null:JSON.parse(v.data); },
    async getWithMetadata(k){ await wait(); const v=m.get(k); return v?{data:JSON.parse(v.data),etag:v.etag,metadata:{}}:null; },
    async setJSON(k,val,o={}){ await wait(); const cur=m.get(k);
      if(o.onlyIfNew&&cur) return {modified:false};
      if(o.onlyIfMatch&&(!cur||cur.etag!==o.onlyIfMatch)) return {modified:false};
      const etag='e'+(++n); m.set(k,{data:JSON.stringify(val),etag}); return {modified:true,etag}; },
    async delete(k){ await wait(); m.delete(k); },
    async list({prefix=''}={}){ await wait(); return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).sort().map(key=>({key,etag:m.get(key).etag}))}; },
    peek(k){ const v=m.get(k); return v?JSON.parse(v.data):null; },
    raw(){ return [...m.entries()].map(([k,v])=>k+' '+v.data).join('\n'); }
  };
  return s;
}
let S=makeStore(); globalThis.__terrainRegStore=S;
globalThis.fetch=async()=>{ throw new Error('no network in tests'); };

const mod=await import(new URL('../netlify/functions/register.mjs', import.meta.url).href);
const fn=mod.default;
const {createHash}=await import('node:crypto');
const hex=s=>createHash('sha256').update(s,'utf8').digest('hex');

// Every call goes through here: logs are captured, every response must be
// JSON and no-store, and every body is kept for the leak checks at the end.
const logs=[], bodies=[]; let badHeaders=0;
const REAL={log:console.log,error:console.error,warn:console.warn,info:console.info};
async function call(req,ctx={}){
  console.error=console.warn=console.info=(...a)=>logs.push(a.map(String).join(' '));
  let res; try{ res=await fn(req,ctx); } finally{ Object.assign(console,{error:REAL.error,warn:REAL.warn,info:REAL.info}); }
  if(res.headers.get('cache-control')!=='no-store, max-age=0'||!/json/.test(res.headers.get('content-type')||'')) badHeaders++;
  const text=await res.text(); bodies.push({text,admin:!!(req.headers.get('x-terrain-admin'))});
  return {status:res.status,j:JSON.parse(text)};
}
const URL0='https://x/.netlify/functions/register';
const post=(body,headers={},ctx={})=>call(new Request(URL0,{method:'POST',headers:{'content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)}),ctx);
const base={op:'register',name:'Joshua Mura',email:'Pastor.Josh@Example.org',church:'Bucks County SDA',role:'pastor',conf:'Pennsylvania',union:'Columbia Union',news:false,lang:'en'};
const reg=(over={},headers={},ctx={})=>post({...base,...over},headers,ctx);
const recs=()=>[...S.m.keys()].filter(k=>k.startsWith('e/'));

console.log('-- status --');
let r=await call(new Request(URL0,{method:'GET'}));
// v10.60.1: register-1.3 (the pastor's conference read for Digital footprint at sign-up: "yes as soon as they sign up for sure";
// its own checks are in v60-1-signup-read.test.mjs). Everything this suite checks is unchanged.
c('GET answers status', [r.status,r.j], [200,{ok:true,fn:'register-1.3'}]);
r=await post({op:'status'});
c('POST op:status too', r.j, {ok:true,fn:'register-1.3'});
r=await call(new Request(URL0,{method:'PUT',body:'{}'}));
c('other methods → 405', r.status, 405);
r=await post('{nope');
c('bad JSON → 400', [r.status,r.j.error], [400,'bad-json']);
r=await post('[1,2]');
c('an array is not a request → 400', r.status, 400);
r=await post({op:'nonsense'});
c('unknown op → 404', [r.status,r.j.error], [404,'unknown-op']);
r=await post({...base,pad:'x'.repeat(9000)});
c('a body over 8 KB → 413', [r.status,r.j.error], [413,'too-large']);

console.log('\n-- only JSON, only from this site (S6) --');
for(const [ct,name] of [['text/plain;charset=UTF-8','text/plain'],['application/x-www-form-urlencoded','a form'],['multipart/form-data; boundary=x','multipart'],['','no content-type']]){
  const h=ct?{'content-type':ct}:{};
  const x=await call(new Request(URL0,{method:'POST',headers:h,body:JSON.stringify({...base,email:'csrf@example.org'})}));
  c(name+' → 415, nothing stored', [x.status,x.j.error,S.peek('e/'+hex('csrf@example.org'))], [415,'content-type',null]);
}
r=await call(new Request(URL0,{method:'POST',body:JSON.stringify({...base,email:'csrf@example.org'})}));
c('a body with no type given (fetch makes it text/plain) → 415', r.status, 415);
r=await reg({email:'csrf@example.org'},{'sec-fetch-site':'cross-site',origin:'https://evil.example'});
c('Sec-Fetch-Site: cross-site → 403, nothing stored', [r.status,r.j.error,S.peek('e/'+hex('csrf@example.org'))], [403,'cross-site',null]);
r=await reg({email:'csrf@example.org'},{'content-type':'Application/JSON; charset=utf-8','sec-fetch-site':'same-origin'});
c('application/json (any case, with a charset) from this site is read', r.status, 200);
S=makeStore(); globalThis.__terrainRegStore=S;

console.log('\n-- a new registration --');
r=await reg();
c('ok, and nothing else (no id, no "returning")', [r.status,r.j], [200,{ok:true}]);
const KEY='e/'+hex('pastor.josh@example.org');
let rec=S.peek(KEY);
const ID=rec&&rec.id;
c('one record, keyed by the SHA-256 of the lower-cased address', !!rec);
c('the address is kept in full, trimmed and lower-cased', rec.email, 'pastor.josh@example.org');
c('record shape', Object.keys(rec), ['id','name','email','church','role','conf','union','news','lang','verified','created','updated','count','claims']);
c('fields as sent; unverified; counted once; no claims', [/^[A-Za-z0-9_-]{12}$/.test(rec.id),rec.name,rec.church,rec.role,rec.conf,rec.union,rec.news,rec.lang,rec.verified,rec.count,rec.claims], [true,'Joshua Mura','Bucks County SDA','pastor','Pennsylvania','Columbia Union',false,'en',false,1,[]]);
c('created and updated set together', [typeof rec.created,rec.created===rec.updated], ['number',true]);

console.log('\n-- the same address again: the first word stands (S3) --');
await new Promise(r=>setTimeout(r,5));
r=await reg({email:'  PASTOR.JOSH@example.ORG ',name:'Mallory',church:'Fake Church',role:'other',news:true,lang:'es',conf:'Texico'},{},{ip:'198.51.100.66'});
c('the same answer as a new address: {ok}', [r.status,r.j], [200,{ok:true}]);
rec=S.peek(KEY);
c('still one record for that address', recs().length, 1);
c('nothing the first registration said is replaced', [rec.name,rec.church,rec.role,rec.conf,rec.lang], ['Joshua Mura','Bucks County SDA','pastor','Pennsylvania','en']);
c('news cannot be switched on by a later registration', rec.news, false);
c('id and created kept; updated moves on; count bumped', [rec.id,rec.created<rec.updated,rec.count], [ID,true,2]);
c('what the later visit said is kept beside it, as a claim', rec.claims.map(x=>[x.name,x.church,x.role,x.conf,x.news,x.lang,typeof x.at]), [['Mallory','Fake Church','other','Texico',true,'es','number']]);
r=await reg();
c('the same words again add no claim', [S.peek(KEY).claims.length,S.peek(KEY).count], [1,3]);
for(let i=0;i<7;i++) await reg({church:'Church '+i});
c('at most five claims, the latest kept', S.peek(KEY).claims.map(x=>x.church), ['Church 2','Church 3','Church 4','Church 5','Church 6']);
// news: withdrawing consent is honoured; switching it on is not
const NEWS='e/'+hex('newsy@example.org');
await reg({email:'newsy@example.org',news:true});
c('a first registration may ask for news', S.peek(NEWS).news, true);
await reg({email:'newsy@example.org',news:false});
c('a later one may withdraw it', S.peek(NEWS).news, false);
await reg({email:'newsy@example.org',news:true});
c('but not switch it on again', S.peek(NEWS).news, false);
r=await reg({email:'someone.else@example.org'});
c('a different address is a different person', [r.j,S.peek('e/'+hex('someone.else@example.org')).id!==ID], [{ok:true},true]);

console.log('\n-- validation --');
const bad=async(over,err,name)=>{ const x=await reg(over); c(name, [x.status,x.j.error], [400,err]); };
await bad({name:''},'bad-name','name required');
await bad({name:'   '},'bad-name','a name of spaces is no name');
await bad({name:'x'.repeat(81)},'bad-name','name at most 80');
await bad({name:42},'bad-name','name must be text');
await bad({church:''},'bad-church','church required');
await bad({church:'c'.repeat(121)},'bad-church','church at most 120');
await bad({conf:''},'bad-conf','conference required');
await bad({conf:'c'.repeat(81)},'bad-conf','conference at most 80');
await bad({union:'u'.repeat(81)},'bad-union','union at most 80');
await bad({role:'bishop'},'bad-role','role is pastor, leader or other');
await bad({role:undefined},'bad-role','role required');
await bad({news:'yes'},'bad-news','news must be a real boolean');
await bad({email:undefined},'bad-email','email required');
await bad({email:''},'bad-email','email not empty');
for(const e of ['plainaddress','two@@example.org','a@b@example.org','@example.org','ana@','ana@example','ana@.example.org','ana@example..org',
  'ana..lopez@example.org','.ana@example.org','ana.@example.org','ana lopez@example.org','ana@exam ple.org','<ana@example.org>',
  'ana@example.org>','"ana"@example.org','ana,bob@example.org','ana;bob@example.org','ana@example.c','ana@-example.org',
  'a'.repeat(65)+'@example.org','ana@'+'x'.repeat(250)+'.org','josé@example.org','a@b.c1','a@b-.org'])
  await bad({email:e},'bad-email','refused: '+JSON.stringify(e).slice(0,40));
console.log('   header injection');
for(const e of ['ana@example.org\r\nBcc: victim@example.com','ana@example.org\nBcc: victim@example.com','ana@example.org\r',
  'ana@example.org\n','ana@example.org%0d%0aBcc:x@example.com','ana@example.org\u2028Bcc: x@example.com','ana@example.org\u0000','ana@example.org\tx'])
  await bad({email:e},'bad-email','refused: '+JSON.stringify(e).slice(0,44));
const before=recs().length;
for(const e of ['ana@example.org','o\'brien@example.ie','ana+terrain@mail.example.co.uk','a_b-c%d@sub-domain.example.org','ana@xn--bcher-kva.example'])
  { const x=await reg({email:e}); c('accepted: '+e, [x.status,x.j.ok], [200,true]); }
c('nothing refused was stored', recs().length, before+5);
r=await reg({email:'tidy@example.org',name:'  Ana \u0007 López \n ',church:' St.\tJohn’s  SDA '});
c('names and churches become one tidy line', [S.peek('e/'+hex('tidy@example.org')).name,S.peek('e/'+hex('tidy@example.org')).church], ['Ana López','St. John’s SDA']);
r=await reg({email:'forged@example.org',extra:'kept?',verified:true,id:'AAAAAAAAAAAA',count:99,created:1,claims:[{name:'x'}]});
rec=S.peek('e/'+hex('forged@example.org'));
c('unknown fields are dropped; id, verified, count, created and claims cannot be set', [('extra' in rec),rec.verified,rec.id!=='AAAAAAAAAAAA',rec.count,rec.created!==1,rec.claims], [false,false,true,1,true,[]]);

console.log('\n-- invisible characters (S11) --');
await bad({name:'\u200b\u200b\u200b'},'bad-name','a name of zero-width spaces is no name');
await bad({name:'\u202e\u200d\ufeff'},'bad-name','nor one of direction and joiner marks');
await bad({name:'1234'},'bad-name','a name needs a letter');
await bad({church:'\u200b'},'bad-church','a church of zero-width spaces is no church');
await bad({church:'!!!'},'bad-church','a church needs a letter');
r=await reg({email:'rlo@example.org',name:'Evil\u202egnp.exe',church:'Gr\u200bace\u2066 SDA'});
rec=S.peek('e/'+hex('rlo@example.org'));
c('a direction override and zero-width spaces are stripped, the rest kept', [r.status,rec.name,rec.church], [200,'Evilgnp.exe','Grace SDA']);
r=await reg({email:'zw@example.org\u200b'});
c('a zero-width space pasted after an address is dropped, not refused', [r.status,!!S.peek('e/'+hex('zw@example.org'))], [200,true]);
r=await reg({email:'josh-zh@example.org',name:'王小明',church:'華人教會'});
c('letters are letters in any script', r.status, 200);

console.log('\n-- prototype keys --');
for(const k of ['__proto__','constructor','prototype']){
  const x=await post(`{"op":"register","name":"A","email":"p${k.length}@example.org","church":"C","role":"pastor","conf":"P","${k}":{"polluted":true}}`);
  c('a top-level '+k+' key is refused', [x.status,x.j.error], [400,'bad-request']);
}
c('nothing polluted', [({}).polluted,Object.prototype.polluted], [undefined,undefined]);
r=await post('{"op":"__proto__"}');
c('an op named __proto__ is unknown', [r.status,r.j.error], [404,'unknown-op']);
r=await post('{"op":"constructor"}');
c('an op named constructor is unknown', [r.status,r.j.error], [404,'unknown-op']);
r=await post('{"op":"toString"}');
c('an op inherited from Object is unknown', [r.status,r.j.error], [404,'unknown-op']);

console.log('\n-- the hourly limit per client address (S4, S5, S9) --');
const hour=new Date().toISOString().slice(0,13), day=hour.slice(0,10);
const ctx={ip:'203.0.113.7'};
let codes=[];
for(let i=0;i<20;i++) codes.push((await reg({email:`flood${i}@example.org`},{},ctx)).status);
c('twenty from one address in an hour are fine', codes.every(x=>x===200), true);
r=await reg({email:'flood20@example.org'},{},ctx);
c('the twenty-first → 429 slow-down', [r.status,r.j.error], [429,'slow-down']);
c('and nothing was stored for it', S.peek('e/'+hex('flood20@example.org')), null);
r=await reg({email:'flood0@example.org'},{},ctx);
c('a returning address from the same client is counted too', r.status, 429);
r=await reg({email:'other@example.org'},{},{ip:'198.51.100.4'});
c('another address is not affected', r.status, 200);
r=await reg({email:'header@example.org'},{'x-nf-client-connection-ip':'203.0.113.7'});
c('the Netlify client-address header counts as the same client', r.status, 429);
const ctrs=[...S.m.keys()].filter(k=>k.startsWith('g/reg/'));
c('one small blob per client and hour: g/reg/<hour>/<tag>, holding only a count', ctrs.every(k=>new RegExp('^g/reg/'+hour+'/[A-Za-z0-9_-]{22}$').test(k))&&ctrs.every(k=>Object.keys(S.peek(k)).join()==='n'), true);
c('the 203.0.113.7 counter reads 20, the other client 1 or 2', ctrs.map(k=>S.peek(k).n).sort((a,b)=>a-b).pop(), 20);
c('no raw client address is stored anywhere', /203\.0\.113\.7|198\.51\.100\.4/.test(S.raw()), false);
c('without TERRAIN_REG_SECRET the day’s key is kept at g/salt/<day> (pseudonymous tags)', !!(S.peek('g/salt/'+day)&&S.peek('g/salt/'+day).salt), true);
// A new hour starts a new count.
for(const k of ctrs) { const v=S.m.get(k); S.m.delete(k); S.m.set(k.replace(hour,'2000-01-01T00'),v); }
r=await reg({email:'nexthour@example.org'},{},ctx);
c('next hour: counts start again', r.status, 200);
r=await reg({email:'noip@example.org'});
c('outside Netlify (no client address): no limit applied', r.status, 200);
// IPv6: counted by /64, so rotating the host bits does not escape the limit.
codes=[];
for(let i=1;i<=21;i++) codes.push((await reg({email:`six${i}@example.org`},{},{ip:'2001:db8:1234:5678::'+i.toString(16)})).status);
c('IPv6: twenty from one /64, then 429 (host bits rotated every time)', [codes.slice(0,20).every(x=>x===200),codes[20]], [true,429]);
r=await reg({email:'six-long@example.org'},{},{ip:'2001:0db8:1234:5678:ffff:ffff:ffff:ffff'});
c('the same /64 written out in full is the same client', r.status, 429);
r=await reg({email:'six-other@example.org'},{},{ip:'2001:db8:1234:5679::1'});
c('the next /64 is another client', r.status, 200);
codes=[];
for(let i=1;i<=21;i++) codes.push((await reg({email:`mapped${i}@example.org`},{},{ip:i%2?'::ffff:192.0.2.55':'192.0.2.55'})).status);
c('an IPv4-mapped address counts as its IPv4', codes[20], 429);

console.log('\n-- registrations from different people at the same moment (S4) --');
{ const keep=S; const L=makeStore(40); globalThis.__terrainRegStore=L;
  const res=await Promise.all(Array.from({length:30},(_,i)=>reg({email:`busy${i}@example.org`},{},{ip:'198.18.0.'+(i+1)})));
  c('30 at once from 30 addresses, store latency 5–45 ms: all 30 kept, none busy', [res.filter(x=>x.status===200).length,[...L.m.keys()].filter(k=>k.startsWith('e/')).length], [30,30]);
  const same=await Promise.all(Array.from({length:6},(_,i)=>reg({email:`same${i}@example.org`},{},{ip:'198.18.1.1'})));
  c('six at once from one address: all counted, none lost', [same.every(x=>x.status===200),[...L.m.keys()].filter(k=>k.startsWith('g/reg/')).map(k=>L.peek(k).n).sort((a,b)=>a-b).pop()], [true,6]);
  globalThis.__terrainRegStore=keep; }

console.log('\n-- with TERRAIN_REG_SECRET (S2, S9) --');
{ const keep=S; const T=makeStore(); globalThis.__terrainRegStore=T;
  process.env.TERRAIN_REG_SECRET='short';
  r=await reg({email:'tok0@example.org'},{},{ip:'192.0.2.9'});
  c('a secret under 32 characters is ignored (no token), and said once in the log', [r.j,logs.filter(l=>/TERRAIN_REG_SECRET is shorter/.test(l)).length], [{ok:true},1]);
  T.m.clear();
  process.env.TERRAIN_REG_SECRET='test-secret-for-registration-0123456789';
  r=await reg({email:'tok1@example.org'},{},{ip:'192.0.2.9'});
  const id1=T.peek('e/'+hex('tok1@example.org')).id;
  c('a registration is answered with a token: r1.<id>.<issued>.<signature>', [r.status,Object.keys(r.j).sort(),new RegExp('^r1\\.'+id1.replace(/[-]/g,'\\-')+'\\.[0-9a-z]{1,9}\\.[A-Za-z0-9_-]{32}$').test(r.j.tok)], [200,['ok','tok'],true]);
  const r2=await reg({email:'tok1@example.org'},{},{ip:'192.0.2.9'});
  c('a known address gets the same shape of answer, for the same record', [Object.keys(r2.j).sort(),r2.j.tok.split('.')[1]], [['ok','tok'],id1]);
  c('the day’s key is derived from the secret and never stored', [T.peek('g/salt/'+day),/g\/salt/.test(T.raw())], [null,false]);
  c('no raw client address stored', /192\.0\.2\.9/.test(T.raw()), false);
  // The token opens census.mjs and gifts.mjs, which carry their own copies of the check.
  const up=[]; const keepFetch=globalThis.fetch; globalThis.fetch=async u=>{ up.push(String(u)); return {ok:true,status:200,text:async()=>'[["NAME"],["x"]]'}; };
  const census=(await import(new URL('../netlify/functions/census.mjs', import.meta.url).href)).default;
  const DATA='https://x/.netlify/functions/census?cv=2&u='+encodeURIComponent('https://api.census.gov/data/2024/acs/acs5?get=NAME');
  let x=await census(new Request(DATA,{headers:{'x-terrain-reg':r.j.tok}}));
  c('census.mjs takes the token register.mjs issued', [x.status,up.length,x.headers.get('cache-control')], [200,1,'private, max-age=86400']);
  const forged=r.j.tok.slice(0,-4)+(r.j.tok.slice(-4)==='AAAA'?'BBBB':'AAAA');
  x=await census(new Request(DATA,{headers:{'x-terrain-reg':forged}}));
  c('and refuses one with a changed signature', [x.status,(await x.json()).code,up.length], [401,'noreg',1]);
  globalThis.fetch=keepFetch;
  const gifts=(await import(new URL('../netlify/functions/gifts.mjs', import.meta.url).href)).default;
  globalThis.__terrainGiftsStore=makeStore();
  x=await gifts(new Request('https://x/.netlify/functions/gifts',{method:'POST',headers:{'content-type':'application/json','x-terrain-reg':r2.j.tok},body:JSON.stringify({op:'id'})}),{});
  c('gifts.mjs creates a campaign with it', [x.status,!!(await x.json()).pub], [200,true]);
  x=await gifts(new Request('https://x/.netlify/functions/gifts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'id'})}),{});
  c('and not without it', [x.status,(await x.json()).error], [401,'noreg']);
  delete process.env.TERRAIN_REG_SECRET;
  globalThis.__terrainRegStore=keep; }

console.log('\n-- two registrations with one new address at the same moment --');
const [p1,p2]=await Promise.all([reg({email:'race@example.org',name:'One'}),reg({email:'race@example.org',name:'Two'})]);
const race=S.peek('e/'+hex('race@example.org'));
c('one record, counted twice, one name kept and the other a claim', [p1.status,p2.status,race.count,race.claims.length,[race.name,race.claims[0].name].sort()], [200,200,2,1,['One','Two']]);

console.log('\n-- the admin list (S10) --');
r=await post({op:'list'});
c('no TERRAIN_ADMIN_KEY: list does not exist (404, like an unknown op)', [r.status,r.j.error], [404,'unknown-op']);
r=await post({op:'list'},{'x-terrain-admin':''});
c('an empty header does not open it either', r.status, 404);
process.env.TERRAIN_ADMIN_KEY='a';
r=await post({op:'list'},{'x-terrain-admin':'a'});
c('a one-character key counts as no key: 404 even when the header matches', r.status, 404);
process.env.TERRAIN_ADMIN_KEY='x'.repeat(31);
r=await post({op:'list'},{'x-terrain-admin':'x'.repeat(31)});
c('31 characters: still no key', r.status, 404);
process.env.TERRAIN_ADMIN_KEY='admin-key-for-tests-only-0123456789';
r=await post({op:'list'});
c('key set, no header → 404', r.status, 404);
r=await post({op:'list'},{'x-terrain-admin':'admin-key-for-tests-only-012345678'});
c('key set, wrong header → 404', r.status, 404);
r=await post({op:'list'},{'x-terrain-admin':'admin-key-for-tests-only-0123456789'});
const total=recs().length;
c('the right header → the records', [r.status,r.j.ok,r.j.total,r.j.items.length], [200,true,total,Math.min(100,total)]);
c('each item is a whole record, address and claims included', Object.keys(r.j.items[0]), ['id','name','email','church','role','conf','union','news','lang','verified','created','updated','count','claims']);
c('the admin list is where the addresses are', r.j.items.some(x=>x.email==='pastor.josh@example.org'), true);
let seen=[], after, pages=0;
do{ const x=await post({op:'list',limit:7,...(after?{after}:{})},{'x-terrain-admin':'admin-key-for-tests-only-0123456789'});
  seen.push(...x.j.items.map(i=>i.id)); after=x.j.next; pages++; }while(after&&pages<50);
c('paged: every record exactly once', [seen.length,new Set(seen).size], [total,total]);
c('pages of 7', pages, Math.ceil(total/7));
r=await post({op:'list',limit:5000},{'x-terrain-admin':'admin-key-for-tests-only-0123456789'});
c('a page is at most 500', r.j.items.length<=500, true);
// Wrong guesses are counted per client: ten in an hour, then 404 without looking at the key.
const guesser={ip:'192.0.2.200'}; const tries=[];
for(let i=0;i<10;i++) tries.push((await post({op:'list'},{'x-terrain-admin':'guess-'+i},guesser)).status);
c('ten wrong keys from one client: all 404', tries.every(x=>x===404), true);
r=await post({op:'list'},{'x-terrain-admin':'admin-key-for-tests-only-0123456789'},guesser);
c('then even the right key gets 404 from that client for the rest of the hour', [r.status,r.j.error], [404,'unknown-op']);
r=await post({op:'list'},{'x-terrain-admin':'admin-key-for-tests-only-0123456789'},{ip:'192.0.2.201'});
c('another client is not affected', r.status, 200);
r=await post({op:'list'},{'x-terrain-admin':'admin-key-for-tests-only-0123456789'},{ip:'192.0.2.201'});
c('and a right key is never counted against it', r.status, 200);
delete process.env.TERRAIN_ADMIN_KEY;
r=await post({op:'list'},{'x-terrain-admin':'admin-key-for-tests-only-0123456789'});
c('key removed again: gone again', r.status, 404);

console.log('\n-- signing in on another device (register-1.2, v10.46.0) --');
// The pastor (5 Oct 2026): "every time I try to sign in it makes me register again. There's no like sign in place."
{ const keep=S; const T=makeStore(); globalThis.__terrainRegStore=T;
  const SIN={ip:'198.51.100.7'};
  const signin=(email,ctx=SIN,over={})=>post({op:'signin',email,...over},{},ctx);
  r=await signin('nobody@example.org');
  c('an address that is not on file: 404 not-found, nothing else', [r.status,r.j], [404,{ok:false,error:'not-found'}]);
  c('…and no record is made', [...T.m.keys()].filter(k=>k.startsWith('e/')).length, 0);
  await reg({},{},{ip:'198.51.100.8'});
  const before=JSON.stringify(T.peek('e/'+hex('pastor.josh@example.org')));
  r=await signin('  Pastor.Josh@EXAMPLE.org ');
  c('the same address, any case or spaces: what the registration said, nothing more',
    [r.status,r.j], [200,{ok:true,name:'Joshua Mura',church:'Bucks County SDA',role:'pastor',conf:'Pennsylvania',union:'Columbia Union',news:false,lang:'en'}]);
  c('no token without TERRAIN_REG_SECRET', 'tok' in r.j, false);
  c('signing in writes nothing to the record', JSON.stringify(T.peek('e/'+hex('pastor.josh@example.org'))), before);
  await reg({name:'Someone Else',church:'Another Church',conf:'Ohio',news:true},{},{ip:'198.51.100.8'});
  r=await signin('pastor.josh@example.org');
  c('a later, different registration does not change what signing in returns (the first word stands)', [r.j.name,r.j.church,r.j.conf,r.j.news], ['Joshua Mura','Bucks County SDA','Pennsylvania',false]);
  await reg({email:'news@example.org',news:true,lang:'es',role:'leader'},{},{ip:'198.51.100.8'});
  r=await signin('news@example.org');
  c('the news choice, the role and the language come back as given (a later re-registration from that device keeps them)', [r.j.news,r.j.role,r.j.lang], [true,'leader','es']);
  r=await signin('not an address');
  c('not an address: 400 bad-email', [r.status,r.j.error], [400,'bad-email']);
  r=await post({op:'signin'},{},SIN);
  c('no address: 400 bad-email', [r.status,r.j.error], [400,'bad-email']);
  process.env.TERRAIN_REG_SECRET='test-secret-for-registration-0123456789';
  r=await signin('pastor.josh@example.org');
  const id0=T.peek('e/'+hex('pastor.josh@example.org')).id;
  c('with TERRAIN_REG_SECRET: a token for the same record, r1.<id>.<issued>.<signature>', [r.status,typeof r.j.tok==='string'&&r.j.tok.split('.')[1]===id0,/^r1\.[A-Za-z0-9_-]{12}\.[0-9a-z]{1,9}\.[A-Za-z0-9_-]{32}$/.test(r.j.tok||'')], [200,true,true]);
  const census=(await import(new URL('../netlify/functions/census.mjs', import.meta.url).href)).default;
  const keepFetch=globalThis.fetch; globalThis.fetch=async()=>({ok:true,status:200,text:async()=>'[["NAME"],["x"]]'});
  const x=await census(new Request('https://x/.netlify/functions/census?cv=2&u='+encodeURIComponent('https://api.census.gov/data/2024/acs/acs5?get=NAME'),{headers:{'x-terrain-reg':r.j.tok}}));
  globalThis.fetch=keepFetch;
  c('…which census.mjs takes', x.status, 200);
  delete process.env.TERRAIN_REG_SECRET;
  // Every try counts, found or not: twenty an hour from one client, then 429.
  const L={ip:'198.51.100.50'}; const st=[];
  for(let i=0;i<20;i++) st.push((await signin(i%2?'pastor.josh@example.org':'nobody'+i+'@example.org',L)).status);
  c('twenty tries in an hour from one client are answered', st.every(s=>s===200||s===404), true);
  r=await signin('pastor.josh@example.org',L);
  c('the twenty-first: 429 slow-down, even for an address on file', [r.status,r.j.error], [429,'slow-down']);
  r=await signin('pastor.josh@example.org',{ip:'198.51.100.51'});
  c('another client is not affected', r.status, 200);
  c('the counter is a g/sin/<hour>/<tag> blob, no raw address kept', [[...T.m.keys()].some(k=>/^g\/sin\/\d{4}-\d{2}-\d{2}T\d{2}\/[A-Za-z0-9_-]{22}$/.test(k)),/198\.51\.100/.test(T.raw())], [true,false]);
  c('signing in does not use up registrations (its own counter)', [...T.m.keys()].filter(k=>k.startsWith('g/reg/')).length, 1);
  globalThis.__terrainRegStore=keep; }

console.log('\n-- the store failing --');
const keep=globalThis.__terrainRegStore;
globalThis.__terrainRegStore={ async get(){ throw new Error('blob down pastor.josh@example.org'); }, async getWithMetadata(){ throw new Error('blob down pastor.josh@example.org'); }, async setJSON(){ throw new Error('x'); }, async list(){ throw new Error('x'); } };
r=await reg();
c('a storage failure → 500 server, nothing more', [r.status,r.j], [500,{ok:false,error:'server'}]);
globalThis.__terrainRegStore=keep;

console.log('\n-- what never leaves --');
const leaks=bodies.filter(b=>!b.admin&&/@/.test(b.text));
c('no response except the admin list ever carries an address', leaks.map(b=>b.text.slice(0,80)), []);
c('no response carries a store key or a hash', bodies.some(b=>/e\/[0-9a-f]{64}/.test(b.text)&&!b.admin), false);
c('no response but the admin list carries a record id outside a token', bodies.filter(b=>!b.admin&&/"id"/.test(b.text)).length, 0);
c('nothing typed is ever logged', logs.filter(l=>/@|Mura|Bucks/.test(l)), []);
c('every response JSON and no-store', badHeaders, 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
