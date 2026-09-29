// present.mjs, the v10.39 review round (security lens), against an in-memory store with
// latency and ETags, as the reviewers reproduced them:
//  S2  open's day limits: 10 a day per registration, 1000 for all registrations, 200 for
//      anonymous opens (registration off); a site-wide refusal is 429 site-busy. A POST
//      must be application/json and never cross-site (415 / 403), as register.mjs.
//  S3  "I'm in" caps that hold under parallel floods: 150 per address per room, 500 per
//      room, checked after writing; the site-wide per-address counter stays soft.
//  S4  op state: its success may be kept 2 s at Netlify's edge (never in the browser),
//      errors never; it carries the deck's version for phones without a live stream.
delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.SITE_URL; delete process.env.TERRAIN_REG_SECRET;
delete process.env.PRESENT_FB_URL; delete process.env.PRESENT_FB_SECRET;
import { createHmac } from 'node:crypto';
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',String(JSON.stringify(g)).slice(0,400));console.log('    want:',String(JSON.stringify(e)).slice(0,300));fail++}else pass++};

// A Blobs stand-in with ETags and 2–15 ms of latency on every call (the reviewers' store).
function makeStore({slow=false}={}){
  const m=new Map(); let n=0;
  const wait=()=>new Promise(r=>slow?setTimeout(r,2+Math.floor(Math.random()*13)):setImmediate(r));
  const s={ m,
    async get(k){ await wait(); const v=m.get(k); return v===undefined?null:JSON.parse(v.data); },
    async getWithMetadata(k){ await wait(); const v=m.get(k); return v?{data:JSON.parse(v.data),etag:v.etag,metadata:{}}:null; },
    async setJSON(k,val,o={}){ await wait(); const cur=m.get(k);
      if(o.onlyIfNew&&cur) return {modified:false};
      if(o.onlyIfMatch&&(!cur||cur.etag!==o.onlyIfMatch)) return {modified:false};
      const etag='e'+(++n); m.set(k,{data:JSON.stringify(val),etag}); return {modified:true,etag}; },
    async delete(k){ await wait(); m.delete(k); },
    async list({prefix=''}={}){ await wait(); return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key,etag:m.get(key).etag}))}; },
    peek(k){ const v=m.get(k); return v?JSON.parse(v.data):null; },
    poke(k,val){ m.set(k,{data:JSON.stringify(val),etag:'e'+(++n)}); },
    keys(p=''){ return [...m.keys()].filter(k=>k.startsWith(p)); } };
  return s;
}
globalThis.fetch=async()=>{ throw new Error('no network in tests'); };
const fn=(await import(new URL('../netlify/functions/present.mjs', import.meta.url).href)).default;
const URL0='https://x.test/.netlify/functions/present';
async function call(req,ctx={}){ const res=await fn(req,ctx); const text=await res.text(); return {status:res.status,j:JSON.parse(text),h:res.headers}; }
const post=(body,headers={},ctx={})=>call(new Request(URL0,{method:'POST',headers:{'content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)}),ctx);
const get=(q,ctx={})=>call(new Request(URL0+'?'+q,{method:'GET'}),ctx);
const deck=()=>({kind:'tdeck',ver:1,lang:'en',title:'Food pantry',church:'Bucks County SDA',audience:{type:'congregation',group:'congregation'},ministry:{id:'food-pantry',name:'Food pantry'},created:1790000000000,
  slides:[{type:'join',qrUrl:'',code6:'',note:'Scan'},{type:'yes',kicker:'Yes',headline:'Three sizes of yes',options:[{k:'lead',label:'Lead',text:'a'},{k:'help',label:'Help',text:'b'},{k:'pray',label:'Pray',text:'c'}],respond:true},{type:'close',headline:'Thank you',text:'x',quote:null}]});
const SECRET='reg-secret-0123456789-abcdefghijklmnop';
const tok=(id,secret=SECRET)=>{ const t=Math.floor(Date.now()/1000).toString(36); return `r1.${id}.${t}.`+createHmac('sha256',secret).update(`terrain-reg|r1|${id}|${t}`,'utf8').digest('base64url').slice(0,32); };

console.log('-- S2: a POST is JSON and same-site --');
{ const S=makeStore(); globalThis.__terrainPresentStore=S;
  let r=await call(new Request(URL0,{method:'POST',headers:{'content-type':'text/plain'},body:JSON.stringify({op:'open',deck:deck()})}),{ip:'203.0.113.1'});
  c('text/plain (a "simple request", no preflight) → 415, and no room opened', [r.status,r.j.error,S.keys('r/').length], [415,'content-type',0]);
  r=await call(new Request(URL0,{method:'POST',body:JSON.stringify({op:'open',deck:deck()})}),{});
  c('no content type at all → 415', r.status, 415);
  r=await call(new Request(URL0,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'op=open'}),{});
  c('a form post → 415', r.status, 415);
  r=await post({op:'open',deck:deck()},{'sec-fetch-site':'cross-site'},{ip:'203.0.113.1'});
  c('JSON marked Sec-Fetch-Site: cross-site → 403, nothing opened', [r.status,r.j.error,S.keys('r/').length], [403,'cross-site',0]);
  const o=await post({op:'open',deck:deck()},{'sec-fetch-site':'same-origin'},{ip:'203.0.113.1'});
  c('the page’s own call (application/json; charset, same-origin) → 200', [o.status,!!o.j.room], [200,true]);
  r=await call(new Request(URL0,{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({op:'respond',room:o.j.room,k:'pray',name:'Ann'})}),{ip:'203.0.113.2'});
  c('…a charset parameter is fine (a member answers)', r.status, 200);
  r=await call(new Request(URL0,{method:'POST',headers:{'content-type':'text/plain'},body:JSON.stringify({op:'respond',room:o.j.room,k:'pray',name:'Spam'})}),{ip:'203.0.113.3'});
  c('…while a cross-site text/plain answer never reaches the room', [r.status,S.keys(`a/${o.j.room}/`).length], [415,1]);
  r=await post({op:'respond',room:o.j.room,k:'pray',name:'Spam'},{'sec-fetch-site':'cross-site'},{ip:'203.0.113.3'});
  c('…nor a cross-site JSON one', [r.status,S.keys(`a/${o.j.room}/`).length], [403,1]);
  r=await get('op=deck&room='+o.j.room);
  c('GET is unaffected (the slides still open from any link)', r.status, 200); }

console.log('\n-- S2: open’s day limits --');
{ const S=makeStore(); globalThis.__terrainPresentStore=S;
  process.env.TERRAIN_REG_SECRET=SECRET;
  // a stranger registers with a made-up email and opens rooms from ten addresses
  const got=[];
  for(let a=0;a<3;a++) for(let i=0;i<5;i++) got.push((await post({op:'open',deck:deck(),keepDays:1},{'x-terrain-reg':tok('StrangerIdAA')},{ip:'198.51.100.'+a})).status);
  c('one registration: 10 rooms a day, then 429 slow-down (from any address)', [got.filter(s=>s===200).length,got.filter(s=>s===429).length], [10,5]);
  const last=await post({op:'open',deck:deck(),keepDays:1},{'x-terrain-reg':tok('StrangerIdAA')},{ip:'198.51.100.99'});
  c('…the refusal is slow-down, not site-busy', last.j.error, 'slow-down');
  const pastor=await post({op:'open',deck:deck()},{'x-terrain-reg':tok('PastorJoshua')},{ip:'203.0.113.50'});
  c('the pastor’s own registration still opens a room', [pastor.status,!!pastor.j.room], [200,true]);
  const g=S.peek('g/open');
  c('the counter keeps registration ids and counts only (no address, no token)', [g.regs.StrangerIdAA,g.regs.PastorJoshua,g.tn,JSON.stringify(g).includes('198.51.100'),JSON.stringify(g).includes('r1.')], [10,1,11,false,false]);
  S.poke('g/open',{...g,tn:1000});
  let r=await post({op:'open',deck:deck()},{'x-terrain-reg':tok('AnotherPstor')},{ip:'203.0.113.51'});
  c('1000 registered opens in a day: 429 site-busy (not "from here")', [r.status,r.j.error], [429,'site-busy']);
  S.poke('g/open',{...S.peek('g/open'),n:200,tn:5});
  r=await post({op:'open',deck:deck()},{'x-terrain-reg':tok('AnotherPstor')},{ip:'203.0.113.51'});
  c('the anonymous pool used up does not touch registered pastors', r.status, 200);
  delete process.env.TERRAIN_REG_SECRET;
  r=await post({op:'open',deck:deck()},{},{ip:'203.0.113.52'});
  c('registration off (no secret): 200 a day for the whole site, then 429 site-busy', [r.status,r.j.error], [429,'site-busy']);
  process.env.TERRAIN_CODES='PA-2026-K7M2:Pennsylvania';
  r=await post({op:'open',deck:deck()},{'x-terrain-code':'PA-2026-K7M2'},{ip:'203.0.113.53'});
  c('…a listed access code still passes the day limits', r.status, 200);
  delete process.env.TERRAIN_CODES;
  S.poke('g/open',{...S.peek('g/open'),day:'2001-01-01'});
  r=await post({op:'open',deck:deck()},{},{ip:'203.0.113.52'});
  c('a new UTC day starts every pool again', [r.status,S.peek('g/open').n,S.peek('g/open').tn,Object.keys(S.peek('g/open').regs).length], [200,1,0,0]); }

console.log('\n-- S3: "I’m in" caps hold under a parallel flood --');
{ const S=makeStore({slow:true}); globalThis.__terrainPresentStore=S;
  const o=await post({op:'open',deck:deck()},{},{ip:'203.0.113.60'}); const room=o.j.room;
  const res=await Promise.all(Array.from({length:300},(_,i)=>post({op:'respond',room,k:'pray',name:'Spam'},{},{ip:'192.0.2.7'})));
  const ok=res.filter(r=>r.status===200).length, kept=S.keys(`a/${room}/`).length;
  c(`one address, 300 answers at once: at most 150 kept (${kept} kept, ${ok} said ok)`, [kept<=150,ok===kept,res.every(r=>r.status===200||r.status===429)], [true,true,true]);
  const tags=new Set(S.keys(`a/${room}/`).map(k=>k.slice(`a/${room}/`.length,`a/${room}/`.length+6)));
  c('…every answer from that address carries the same 6-character tag, no address in it', [tags.size<=1,[...tags].every(t=>/^[A-Za-z0-9_-]{6}$/.test(t)&&!t.includes('192'))], [true,true]);
  let r=await post({op:'respond',room,k:'lead',name:'Maria'},{},{ip:'192.0.2.8'});
  c('…a member on another address still answers', r.status, 200);
  // 900 at once from six addresses against the room cap (500)
  const o2=await post({op:'open',deck:deck()},{},{ip:'203.0.113.61'}); const room2=o2.j.room;
  const res2=await Promise.all(Array.from({length:900},(_,i)=>post({op:'respond',room:room2,k:'help',name:'Flood'},{},{ip:'198.51.100.'+(i%6)})));
  const kept2=S.keys(`a/${room2}/`).length;
  c(`six addresses, 900 answers at once: never more than 500 kept (${kept2})`, [kept2<=500,res2.filter(r=>r.status===200).length===kept2], [true,true]);
  // sequential from one Wi-Fi: 150 in the room
  const S2=makeStore(); globalThis.__terrainPresentStore=S2;
  const o3=await post({op:'open',deck:deck()},{},{ip:'203.0.113.62'});
  const seq=[]; for(let i=0;i<152;i++) seq.push((await post({op:'respond',room:o3.j.room,k:'pray',name:'Member'},{},{ip:'192.0.2.99'})).status);
  c('a whole church on one Wi-Fi, one after another: 150 answers in the room, then 429', [seq.slice(0,150).every(s=>s===200),seq[150],seq[151],S2.keys(`a/${o3.j.room}/`).length], [true,429,429,150]);
  const o4=await post({op:'open',deck:deck()},{},{ip:'203.0.113.63'});
  r=await post({op:'respond',room:o4.j.room,k:'pray',name:'Member'},{},{ip:'192.0.2.99'});
  c('…the same Wi-Fi answers in another room (150 is per room; the site-wide count is 300 an hour)', r.status, 200);
  const ans=await post({op:'answers',room:o3.j.room,key:o3.j.key});
  c('the presenter lists them all and can delete them in one call (op drop, up to 600)', [ans.j.total,(await post({op:'drop',room:o3.j.room,key:o3.j.key,ids:ans.j.items.map(a=>a.id)})).j.deleted], [150,150]);
  const rec=S2.peek('r/'+o3.j.room);
  c('the room’s salt is its own and never in a response', [typeof rec.salt,JSON.stringify(o3.j).includes(rec.salt),JSON.stringify(ans.j).includes(rec.salt)], ['string',false,false]); }

console.log('\n-- S4: op state at the edge --');
{ const S=makeStore(); globalThis.__terrainPresentStore=S;
  const o=await post({op:'open',deck:deck()},{},{ip:'203.0.113.70'});
  let r=await get('op=state&room='+o.j.room);
  c('op state (GET): Netlify’s edge may keep it 2 s, keyed by op and room; the browser never', [r.status,r.h.get('netlify-cdn-cache-control'),r.h.get('netlify-vary'),r.h.get('cache-control')], [200,'public, s-maxage=2','query=op|room','no-store, max-age=0']);
  c('…it carries the deck’s version (a phone without a stream picks up new words)', [r.j.v,r.j.state,r.j.ended], [1,null,null]);
  const u=await post({op:'update',room:o.j.room,key:o.j.key,deck:deck()});
  c('(an update)', [u.status,u.j.v], [200,2]);
  r=await get('op=state&room='+o.j.room+'&p=zzzzzzzzzzzz');
  c('…after an update, v 2', r.j.v, 2);
  r=await get('op=state&room='+'Q'.repeat(22));
  c('an error (no such room) is never kept at the edge', [r.status,r.h.get('netlify-cdn-cache-control')], [404,null]);
  r=await get('op=deck&room='+o.j.room);
  c('op deck is never kept at the edge (it counts the phones)', r.h.get('netlify-cdn-cache-control'), null);
  r=await post({op:'state',room:o.j.room});
  c('op state by POST: no edge header', [r.status,r.h.get('netlify-cdn-cache-control')], [200,null]); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
