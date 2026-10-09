// v10.63.1 · a tester code box. The pastor (9 Oct 2026): "Can you just put a tester code box on the top somewhere and he can click it and then
// he'll put the code in and then it will unlock everything for him". The page: "Tester code" beside Change (a key on a phone) while this
// device is not unlocked; a box; Unlock asks guest-pass.mjs (stubbed here) with the registration token; a code that works is kept as
// ?ideas= keeps it. The server: guest-pass-1.1 answers POST {code} with {ok, unlocked}, 12 tries an hour from one connection. Made-up codes
// and emails only. Written failing-first on v10.63.0.
const {sleep,until,checker,page,ready}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const TOK='r1.AbCdEfGhIjKl.lx2abc.'+'A'.repeat(32);
const REGT={name:'Sample Director',email:'director.sample@example.org',church:'Sample Church',conf:'Pennsylvania',role:'pastor',synced:true,tok:TOK};
function withServer(P,answer){ const calls=[]; const f0=P.w.fetch;
  P.w.fetch=async(u,o)=>{ u=String(u); if(/functions\/guest-pass/.test(u)){ calls.push({body:JSON.parse(o.body),reg:(o.headers||{})['x-terrain-reg']||''}); const a=typeof answer==='function'?answer(JSON.parse(o.body)):answer; return {ok:a.status===200,status:a.status||200,json:async()=>a.body}; } return f0(u,o); };
  return calls; }
(async()=>{ await T.sec(async()=>{
  console.log('\n-- the button: beside Change, until this device is unlocked --');
  const P=page({store:{'terrain-reg':REGT}}); await ready(P); P.w.__codeNoReload=true; P.E('showWho()'); await sleep(60);
  const b=P.q('#codebtn');
  c('"Tester code" in the header, beside Change, with its name for a screen reader and a key for a phone', b?[b.textContent.trim(),b.getAttribute('aria-label'),!!b.querySelector('svg.cb-i'),b.previousElementSibling&&b.previousElementSibling.id]:null, ['Tester code','Enter a tester code',true,'regchange']);
  b.click(); await sleep(30);
  const d=P.q('#code-sheet');
  c('a tap opens the box: the title, one line, the field, Unlock', [d.hasAttribute('open'),P.txt('#code-t'),!!d.querySelector('input[name=code]'),P.txt('#code-sheet button[type=submit]')], [true,'Tester code',true,'Unlock']);
  let calls=withServer(P,{status:200,body:{ok:true,unlocked:false,open:false}});
  d.querySelector('input').value='Wrong-Code-Sample-1'; d.querySelector('form').dispatchEvent(new P.w.Event('submit',{cancelable:true})); await until(()=>/did not work/.test(P.txt('#code-sheet .code-st')||''));
  c('a code that does not work: said plainly, nothing kept; the check sent the code and this registration', [P.txt('#code-sheet .code-st'),P.E("localStorage.getItem('terrain-ai-pass')"),calls[0].body.code,calls[0].reg],
    ['That code did not work. Check the code, and that you registered with the email address it was set up for.',null,'Wrong-Code-Sample-1',TOK]);
  calls=withServer(P,{status:200,body:{ok:true,unlocked:true,open:false}});
  d.querySelector('input').value='  Sample-Guest-Code-2026  '; d.querySelector('form').dispatchEvent(new P.w.Event('submit',{cancelable:true})); await until(()=>/Unlocked/.test(P.txt('#code-sheet .code-st')||''));
  c('a code that works: "Unlocked on this device", kept where the ?ideas= link keeps it (spaces trimmed)', [P.txt('#code-sheet .code-st'),P.E("localStorage.getItem('terrain-ai-pass')")], ['Unlocked on this device.','Sample-Guest-Code-2026']);
  P.E('showWho()'); await sleep(20);
  c('…and the button is gone once the device is unlocked', !!P.q('#codebtn'), false);
  { const Q=page({store:{'terrain-reg':REGT}}); await ready(Q); Q.w.__codeNoReload=true; Q.E('showWho()'); Q.q('#codebtn').click(); await sleep(20); const D=Q.q('#code-sheet');
    withServer(Q,{status:429,body:{ok:false,code:'limit'}}); D.querySelector('input').value='Another-Try-Code-1'; D.querySelector('form').dispatchEvent(new Q.w.Event('submit',{cancelable:true})); await until(()=>/Too many/.test(Q.txt('#code-sheet .code-st')||''));
    c('too many tries: wait an hour', Q.txt('#code-sheet .code-st'), 'Too many tries. Please wait an hour and try again.');
    D.querySelector('input').value='has a space'; D.querySelector('form').dispatchEvent(new Q.w.Event('submit',{cancelable:true})); await sleep(20);
    c('a code with a space is not sent', Q.txt('#code-sheet .code-st'), 'Please type the code exactly as you received it, without spaces.'); }
  { const S=page({lang:'es',store:{'terrain-reg':REGT}}); await ready(S); S.E('showWho()'); await sleep(60);
    c('in Spanish: "Código de prueba"', S.q('#codebtn')?S.q('#codebtn').textContent.trim():null, 'Código de prueba'); }
  { const U=page({store:{'terrain-reg':REGT,'terrain-ai-pass':'already-unlocked'}}); await ready(U); U.E('showWho()'); await sleep(60);
    c('a device already unlocked shows no button', !!U.q('#codebtn'), false); }
  { const N=page({store:{}}); await ready(N); N.E("localStorage.removeItem('terrain-reg'); showWho()"); await sleep(60);
    c('before registering there is no header, so no button', !!N.q('#codebtn'), false); }
  c('no page errors', P.errs, []);

  console.log('\n-- the server: guest-pass-1.1 --');
  const {createHmac}=require('crypto');
  const store=new Map(), mk={async get(k){ const v=store.get(k); return v===undefined?null:JSON.parse(v); },async setJSON(k,v){ store.set(k,JSON.stringify(v)); }};
  globalThis.__terrainRegStore=mk;
  const SECRET='q'.repeat(44); const now=Date.now(); globalThis.__terrainGuestNow=()=>now;
  const tok=id=>{ const iat=Math.floor(now/1000).toString(36); return `r1.${id}.${iat}.`+createHmac('sha256',SECRET).update(`terrain-reg|r1|${id}|${iat}`,'utf8').digest('base64url').slice(0,32); };
  const sha=s=>require('crypto').createHash('sha256').update(s,'utf8').digest('hex');
  store.set('e/'+sha('director.sample@example.org'),JSON.stringify({id:'DirectorId01'}));
  Object.assign(process.env,{TERRAIN_AI_PASS:'open-sesame-guest',TERRAIN_REG_SECRET:SECRET,TERRAIN_AI_GUESTS:'director.sample@example.org=Sample-Guest-Code-2026'});
  const G=await import('../netlify/functions/guest-pass.mjs');
  const post=async(code,t,ip='198.51.100.7')=>{ const r=await G.default(new Request('https://terrain.church/.netlify/functions/guest-pass',{method:'POST',headers:{'content-type':'application/json',...(t?{'x-terrain-reg':t}:{})},body:JSON.stringify({code})}),{ip}); return [r.status,await r.json()]; };
  c('GET: its version only', await (await G.default(new Request('https://terrain.church/.netlify/functions/guest-pass'))).json(), {ok:true,fn:'guest-pass-1.1'});
  c('the guest code on his registration: unlocked; on another: not; the passphrase: unlocked', [(await post('Sample-Guest-Code-2026',tok('DirectorId01')))[1].unlocked,(await post('Sample-Guest-Code-2026',tok('StrangerId99')))[1].unlocked,(await post('open-sesame-guest',''))[1].unlocked], [true,false,true]);
  c('a code with a space, or none: refused before any check', [(await post('a b',''))[0],(await post('',''))[0]], [400,400]);
  for(let i=0;i<9;i++) await post('Wrong-Code-'+i,'');
  c('12 tries an hour from one connection (counted right or wrong); another connection is not held back', [(await post('Sample-Guest-Code-2026',tok('DirectorId01')))[0],(await post('Sample-Guest-Code-2026',tok('DirectorId01'),'203.0.113.5'))[1].unlocked], [429,true]);
  c('the tries are kept as hourly counters the daily sweep removes (g/code/<hour>/…)', [...store.keys()].filter(k=>/^g\/code\/\d{4}-\d{2}-\d{2}T\d{2}\/[A-Za-z0-9_-]{22}$/.test(k)).length, 2);
  const SW=require('fs').readFileSync(require('path').join(__dirname,'..','netlify','functions','gifts-sweep.mjs'),'utf8');
  c('…gifts-sweep knows them', /\(\?:cid\|reg\|adm\|sin\|salt\|code\)/.test(SW), true);
}); T.done(); })();
