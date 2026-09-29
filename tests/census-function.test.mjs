// census.mjs: access codes are switched off unless TERRAIN_REQUIRE_CODE is '1'
// (v10.38.0: pastors register on the first page instead). With the switch on,
// every old rule applies. The Census itself is stubbed; no network.
delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.TERRAIN_REG_SECRET;
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,240));fail++}else pass++};
let upstream=0;
globalThis.fetch=async()=>{ upstream++; return {ok:true,status:200,text:async()=>'[["NAME"],["Tract 1"]]'}; };
const fn=(await import(new URL('../netlify/functions/census.mjs', import.meta.url).href)).default;
const logs=[]; const REAL_ERR=console.error;
const call=async(url,headers={})=>{ console.error=(...a)=>logs.push(a.join(' ')); let r; try{ r=await fn(new Request(url,{headers})); }finally{ console.error=REAL_ERR; } const t=await r.text(); let j=null; try{ j=JSON.parse(t); }catch(e){} return {status:r.status,j,cc:r.headers.get('cache-control')}; };
const CHECK='https://x/.netlify/functions/census?check=1&conf=Pennsylvania';
const DATA='https://x/.netlify/functions/census?cv=2&u='+encodeURIComponent('https://api.census.gov/data/2024/acs/acs5?get=NAME');

console.log('-- codes unset, switch unset: open, and the page registers --');
let r=await call(CHECK);
c('check → {required:false, ok:true, register:true}', r.j, {required:false,ok:true,register:true});
c('never cached', r.cc, 'no-store, max-age=0');
r=await call(DATA);
c('Census data flows', [r.status,upstream], [200,1]);
c('with no gate a success may be cached publicly, as before', r.cc, 'public, max-age=86400');

console.log('\n-- TERRAIN_CODES still set on the live site, switch unset --');
process.env.TERRAIN_CODES='PA-2026-K7M2:Pennsylvania Conference@Pennsylvania, NAD-2026-R8QM:National@*';
r=await call(CHECK);
c('check still says register, not code', r.j, {required:false,ok:true,register:true});
r=await call(CHECK,{'x-terrain-code':'PA-2026-K7M2'});
c('a code sent anyway changes nothing', r.j, {required:false,ok:true,register:true});
r=await call(DATA);
c('Census data flows with no code', [r.status,upstream], [200,2]);
process.env.TERRAIN_REQUIRE_CODE='0';
r=await call(DATA);
c('0 leaves codes off, and says nothing in the log', [r.status,logs.length], [200,0]);
// Updated in the v10.38.0 review (S8): "true", "yes" and "on" mean on too; a
// value that is none of those nor 0/false/no/off is off, and said once.
for(const v of ['true','TRUE',' yes ','On']){
  process.env.TERRAIN_REQUIRE_CODE=v;
  const x=await call(DATA);
  c(`TERRAIN_REQUIRE_CODE=${JSON.stringify(v)} switches codes on: no code, no data`, [x.status,x.j.code], [401,'nocode']);
}
for(const v of ['false','no','OFF']){
  process.env.TERRAIN_REQUIRE_CODE=v;
  const x=await call(DATA);
  c(`TERRAIN_REQUIRE_CODE=${JSON.stringify(v)} leaves codes off, quietly`, [x.status,logs.length], [200,0]);
}
process.env.TERRAIN_REQUIRE_CODE='enabled';
r=await call(DATA); await call(DATA);
c('an unrecognised value leaves codes off, and the log says so once', [r.status,logs.length,/TERRAIN_REQUIRE_CODE is set, but not to 1, true, yes or on/.test(logs[0]||'')], [200,1,true]);
process.env.TERRAIN_REQUIRE_CODE='0';

console.log('\n-- TERRAIN_REQUIRE_CODE=1: the old rules, unchanged --');
process.env.TERRAIN_REQUIRE_CODE='1';
r=await call(CHECK);
c('no code: required, not ok', [r.j.required,r.j.ok,r.j.name,r.j.conf,'register' in r.j], [true,false,'','',false]);
r=await call(CHECK,{'x-terrain-code':'pa-2026-k7m2'});
c('a valid code (any case): ok, with its name and conference', [r.j.required,r.j.ok,r.j.name,r.j.conf,r.j.picked], [true,true,'Pennsylvania Conference','Pennsylvania','Pennsylvania']);
r=await call(CHECK,{'x-terrain-code':'NAD-2026-R8QM'});
c('a national code works anywhere', [r.j.ok,r.j.conf], [true,'*']);
r=await call(CHECK,{'x-terrain-code':'WRONG'});
c('a wrong code is not ok', r.j.ok, false);
const before=upstream;
r=await call(DATA);
c('no code: no Census data (401 nocode)', [r.status,r.j.code,upstream], [401,'nocode',before]);
r=await call(DATA,{'x-terrain-code':'PA-2026-K7M2'});
c('with a code: data', [r.status,upstream], [200,before+1]);
c('a success behind the code gate is cached by the browser only', r.cc, 'private, max-age=86400');
delete process.env.TERRAIN_CODES;
r=await call(CHECK);
c('switch on but no codes configured: open', [r.j.required,r.j.ok], [false,true]);
r=await call(DATA);
c('and data flows', r.status, 200);
delete process.env.TERRAIN_REQUIRE_CODE;

console.log('\n-- registration checked on the server (TERRAIN_REG_SECRET, v10.38.0 review S2) --');
const {createHmac}=await import('node:crypto');
const SECRET='census-test-secret-0123456789-abcdefgh';
const tokOf=(id,t=Date.now(),secret=SECRET)=>{ const iat=Math.floor(t/1000).toString(36);
  return `r1.${id}.${iat}.`+createHmac('sha256',secret).update(`terrain-reg|r1|${id}|${iat}`,'utf8').digest('base64url').slice(0,32); };
const TOK=tokOf('AbCdEfGhIjKl');
r=await call(CHECK,{'x-terrain-reg':TOK});
c('no secret: the check is exactly as before, token or not', r.j, {required:false,ok:true,register:true});
process.env.TERRAIN_REG_SECRET='too-short';
r=await call(DATA);
c('a secret under 32 characters is ignored: data flows, and the log says so once', [r.status,logs.filter(l=>/TERRAIN_REG_SECRET is shorter/.test(l)).length], [200,1]);
process.env.TERRAIN_REG_SECRET=SECRET;
r=await call(CHECK);
c('secret set: the check says registration is required, and no token is not ok', r.j, {required:false,ok:true,register:true,regRequired:true,regOk:false});
r=await call(CHECK,{'x-terrain-reg':TOK});
c('with a good token: regOk', r.j.regOk, true);
let up0=upstream;
r=await call(DATA);
c('no token: no Census data (401 noreg), nothing fetched', [r.status,r.j.code,upstream], [401,'noreg',up0]);
r=await call(DATA,{'x-terrain-reg':TOK});
c('a good token: data, cached by the browser only', [r.status,upstream,r.cc], [200,up0+1,'private, max-age=86400']);
up0=upstream;
for(const [name,t] of [['signed with another secret',tokOf('AbCdEfGhIjKl',Date.now(),'another-secret-0123456789-abcdefghij')],
  ['another id under the same signature',TOK.replace('AbCdEfGhIjKl','AbCdEfGhIjKm')],
  ['issued 181 days ago',tokOf('AbCdEfGhIjKl',Date.now()-181*864e5)],
  ['issued in the future',tokOf('AbCdEfGhIjKl',Date.now()+3600e3)],
  ['not a token at all','r1.x.y.z'],['empty','']]){
  const x=await call(DATA,{'x-terrain-reg':t});
  c('refused: '+name, [x.status,x.j&&x.j.code], [401,'noreg']);
}
c('none of them reached the Census', upstream, up0);
r=await call(DATA,{'x-terrain-reg':tokOf('AbCdEfGhIjKl',Date.now()-179*864e5)});
c('179 days old is still good', r.status, 200);
process.env.TERRAIN_CODES='PA-2026-K7M2'; process.env.TERRAIN_REQUIRE_CODE='1';
r=await call(DATA,{'x-terrain-code':'PA-2026-K7M2'});
c('codes switched back on: the code is the gate, no token asked for', r.status, 200);
r=await call(CHECK,{'x-terrain-code':'PA-2026-K7M2'});
c('and the check is the code check', [r.j.required,r.j.ok,'regRequired' in r.j], [true,true,false]);
delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.TERRAIN_REG_SECRET;

console.log('\n-- never an open proxy --');
r=await call('https://x/.netlify/functions/census?u='+encodeURIComponent('https://evil.example.com/x'));
c('a host that is not the Census → 403', r.status, 403);
r=await call('https://x/.netlify/functions/census?u='+encodeURIComponent('http://api.census.gov/data'));
c('plain http → 403', r.status, 403);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
