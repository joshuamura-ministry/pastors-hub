// v10.70.0 · tester codes made in Terrain (the page). The pastor (14 Oct 2026): "Why is this so difficult … does it have to be tied to their
// email?", then "yes build those codes". On his own device (unlocked with his passphrase) the header's key button is "Tester codes": make a
// code with a note of who it is for, copy it or a ready message, see who used each one, turn one off, delete one that is off. A code kept on
// a device is checked once a day against the server (guest-pass, stubbed here): one that unlocks nothing is dropped, so the "Tester code"
// button comes back, and a code from a link that did not work opens the box and says so (it used to be kept silently, and the button hid).
// The box takes a code typed with spaces or capitals, and says why a code did not work (taken by someone else, or turned off). Made-up
// names and codes only. Written failing-first on v10.69.1.
const {sleep,until,checker,page,ready}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const TOK='r1.AbCdEfGhIjKl.lx2abc.'+'A'.repeat(32);
const REGT={name:'Sample Pastor',email:'pastor.sample@example.org',church:'Sample Church',conf:'Pennsylvania',role:'pastor',synced:true,tok:TOK};
const OWNER='owner-pass-sample';
const NOW=Date.now();
function server(P,answer){ const calls=[]; const f0=P.w.fetch;
  P.w.fetch=async(u,o)=>{ u=String(u); if(/functions\/guest-pass/.test(u)){ const h=(o&&o.headers)||{}; const body=JSON.parse(o.body); calls.push({body,pass:h['x-terrain-pass']||'',reg:h['x-terrain-reg']||''});
      const a=answer(body,h); return {ok:(a.status||200)===200,status:a.status||200,json:async()=>JSON.parse(JSON.stringify(a.body))}; }
    return f0(u,o); };
  return calls; }
const ITEMS=[{id:'a'.repeat(64),code:'cedar-river-4821',note:'Elder Sample',made:NOW-864e5,on:true,used:null,who:null},
  {id:'b'.repeat(64),code:'olive-harbor-1234',note:'Deacon Sample',made:NOW-2*864e5,on:true,used:NOW-36e5,who:{name:'Sample Tester',church:'Sample Valley Church'}},
  {id:'c'.repeat(64),code:'maple-dawn-5678',note:'An old one',made:NOW-3*864e5,on:false,used:null,who:null}];
const owner=(items=ITEMS)=>(b,h)=>{
  if(!b.op) return {body:{ok:true,unlocked:true,open:false,kind:'pass'}};
  if(h['x-terrain-pass']!==OWNER) return {status:401,body:{ok:false,code:'locked'}};
  if(b.op==='list') return {body:{ok:true,items,max:50}};
  if(b.op==='make'){ const it={id:'d'.repeat(64),code:'quill-meadow-2468',note:b.note,made:NOW,on:true,used:null,who:null}; items=[it,...items]; return {body:{ok:true,item:it}}; }
  if(b.op==='off'||b.op==='on'){ items=items.map(x=>x.id===b.id?{...x,on:b.op==='on'}:x); return {body:{ok:true,item:items.find(x=>x.id===b.id)}}; }
  if(b.op==='delete'){ items=items.filter(x=>x.id!==b.id); return {body:{ok:true}}; }
  return {status:400,body:{ok:false,code:'bad'}}; };
const submit=(P,sel)=>P.q(sel).dispatchEvent(new P.w.Event('submit',{cancelable:true}));
(async()=>{ await T.sec(async()=>{
  console.log('\n-- his own device: checked once, then "Tester codes" in the header --');
  const P=page({store:{'terrain-reg':REGT,'terrain-ai-pass':OWNER}}); const calls=server(P,owner()); P.w.__codeNoReload=true;
  await ready(P); await until(()=>P.q('#codebtn'));
  c('the page asked once, with the code it keeps and this registration', [calls.filter(x=>!x.body.op).length,calls[0]&&calls[0].body.code,calls[0]&&calls[0].reg], [1,OWNER,TOK]);
  const b=P.q('#codebtn');
  c('his device: the key button says "Tester codes" (and names what it does)', b?[b.textContent.trim(),b.getAttribute('aria-label'),!!b.querySelector('svg.cb-i')]:null, ['Tester codes','Make tester codes',true]);
  b.click(); await until(()=>P.qa('#code-sheet .cds-row').length===3);
  c('the sheet: its title, one line, who it is for, Make a code', [P.txt('#code-t'),/first person who uses it/.test(P.txt('#code-sheet .note')||''),!!P.q('#code-sheet input[name=note]'),P.txt('#code-sheet .cds-new button[type=submit]')],
    ['Tester codes',true,true,'Make a code']);
  const rows=P.qa('#code-sheet .cds-row').map(r=>[r.querySelector('.cds-code').textContent,r.querySelector('.cds-note').textContent,r.querySelector('.cds-st').textContent.replace(/\s+/g,' ').trim(),[...r.querySelectorAll('button')].map(x=>x.textContent.trim())]);
  c('his codes: each with its note, whether it is used and by whom, and only the buttons it needs', [rows[0].slice(0,2),/^Not used yet/.test(rows[0][2]),rows[0][3],rows[1][1],/^Used by Sample Tester · Sample Valley Church/.test(rows[1][2]),rows[1][3],/^Off/.test(rows[2][2]),rows[2][3]],
    [['cedar-river-4821','Elder Sample'],true,['Copy','Turn off'],'Deacon Sample',true,['Turn off'],true,['Turn on','Delete']]);
  c('the list was asked with his passphrase', calls.filter(x=>x.body.op==='list').every(x=>x.pass===OWNER), true);
  P.q('#code-sheet input[name=note]').value='  Elder New  '; submit(P,'#code-sheet .cds-new'); await until(()=>P.q('#code-sheet .cds-made')&&!P.q('#code-sheet .cds-made').hidden);
  const made=P.txt('#code-sheet .cds-made');
  c('Make a code: the new code shown large, with Copy the code and a ready message to send', [P.txt('#code-sheet .cds-big'),/Copy the code/.test(made),/Copy a message to send/.test(made),calls.find(x=>x.body.op==='make').body.note],
    ['quill-meadow-2468',true,true,'Elder New']);
  c('the ready message: the code, terrain.church, the button to tap, "for you only"', P.E('cdsMessage("quill-meadow-2468")'),
    'Your Terrain tester code is quill-meadow-2468. Open terrain.church and register, then tap "Tester code" at the top and type the code. It works for you only.');
  await until(()=>P.qa('#code-sheet .cds-row').length===4);
  c('…and the list shows it first', P.txt('#code-sheet .cds-row .cds-code'), 'quill-meadow-2468');
  [...P.q('#code-sheet .cds-row[data-id="'+'a'.repeat(64)+'"]').querySelectorAll('button')].find(x=>x.textContent.trim()==='Turn off').click();
  await until(()=>calls.some(x=>x.body.op==='off'));
  c('Turn off: one tap, sent by its id (never the code)', calls.filter(x=>x.body.op==='off').map(x=>[x.body.id,x.body.code,x.pass]), [['a'.repeat(64),undefined,OWNER]]);
  await until(()=>/^Off/.test(P.txt('#code-sheet .cds-row[data-id="'+'a'.repeat(64)+'"] .cds-st')||''));
  c('…the row says Off and offers Turn on and Delete', [...P.q('#code-sheet .cds-row[data-id="'+'a'.repeat(64)+'"]').querySelectorAll('button')].map(x=>x.textContent.trim()), ['Turn on','Delete']);
  const del=()=>[...P.q('#code-sheet .cds-row[data-id="'+'c'.repeat(64)+'"]').querySelectorAll('button')].find(x=>/Delete|Tap again/.test(x.textContent));
  del().click(); await sleep(30);
  c('Delete takes two taps: the first asks', [del().textContent.trim(),calls.some(x=>x.body.op==='delete')], ['Tap again to delete',false]);
  del().click(); await until(()=>!P.q('#code-sheet .cds-row[data-id="'+'c'.repeat(64)+'"]'));
  c('…the second deletes it', calls.filter(x=>x.body.op==='delete').map(x=>x.body.id), ['c'.repeat(64)]);
  c('no page errors', P.errs, []);

  console.log('\n-- a code kept on a device: checked once a day --');
  { const kept=P.E("localStorage.getItem('terrain-ai-kind')");
    const Q=page({store:{'terrain-reg':REGT,'terrain-ai-pass':OWNER,'terrain-ai-kind':kept}}); const qc=server(Q,owner()); await ready(Q); await sleep(500); Q.E('showWho()');   // the header, as the registration check draws it
    c('checked within the day: not asked again, and the button is there at once', [qc.filter(x=>!x.body.op).length,Q.txt('#codebtn')], [0,'Tester codes']); }
  { const Q=page({store:{'terrain-reg':REGT,'terrain-ai-pass':'Cedar River 4821'}}); const qc=server(Q,()=>({body:{ok:true,unlocked:true,open:false,kind:'guest',keep:'cedar-river-4821'}})); await ready(Q);
    await until(()=>Q.E("localStorage.getItem('terrain-ai-pass')")==='cedar-river-4821');
    c('a tester\'s code: kept as the server writes it; no key button on a tester\'s device', [Q.E("localStorage.getItem('terrain-ai-pass')"),qc.length,!!Q.q('#codebtn')], ['cedar-river-4821',1,false]); }
  { const Q=page({store:{'terrain-reg':REGT,'terrain-ai-pass':'wrong-link-code-1'}}); Q.E('AI_FROM_LINK=true'); server(Q,()=>({body:{ok:true,unlocked:false,open:false,kind:''}})); Q.w.__codeNoReload=true; await ready(Q);
    await until(()=>Q.q('#code-sheet[open]'));
    c('a code from a link that unlocks nothing: dropped, the box opens and says so, the button is back',
      [Q.E("localStorage.getItem('terrain-ai-pass')"),Q.txt('#code-sheet .code-st'),Q.txt('#codebtn')], [null,'The code in your link did not work. Type the code here to try again.','Tester code']); }
  { const Q=page({store:{'terrain-reg':REGT,'terrain-ai-pass':'an-old-wrong-code'}}); server(Q,()=>({body:{ok:true,unlocked:false,open:false,kind:''}})); await ready(Q);
    await until(()=>Q.q('#codebtn')); await sleep(100);
    c('an old code kept from before that unlocks nothing: dropped quietly, the Tester code button is back, no box pops up', [Q.E("localStorage.getItem('terrain-ai-pass')"),Q.txt('#codebtn'),!!Q.q('#code-sheet[open]')], [null,'Tester code',false]); }
  { const Q=page({store:{'terrain-reg':REGT,'terrain-ai-pass':'kept-through-a-fault'}}); server(Q,()=>({status:500,body:{ok:false}})); await ready(Q); await sleep(500);
    c('the server could not answer: the code is kept (tried again on the next visit)', Q.E("localStorage.getItem('terrain-ai-pass')"), 'kept-through-a-fault'); }
  { const NOTOK={...REGT}; delete NOTOK.tok; const Q=page({store:{'terrain-reg':NOTOK,'terrain-ai-pass':'kept-before-registration'}}); const qc=server(Q,()=>({body:{ok:true,unlocked:false}})); await ready(Q); await sleep(500);
    c('no registration token yet: not asked, and the code kept (a tester\'s code needs the registration)', [qc.length,Q.E("localStorage.getItem('terrain-ai-pass')")], [0,'kept-before-registration']); }

  console.log('\n-- the Tester code box --');
  { const Q=page({store:{'terrain-reg':REGT}}); Q.w.__codeNoReload=true; await ready(Q); Q.E('showWho()'); await sleep(30); Q.q('#codebtn').click(); await sleep(20);
    let qc=server(Q,()=>({body:{ok:true,unlocked:true,open:false,kind:'guest',keep:'cedar-river-4821'}}));
    Q.q('#code-sheet input[name=code]').value='  Cedar River 4821 '; submit(Q,'#code-sheet form'); await until(()=>/Unlocked/.test(Q.txt('#code-sheet .code-st')||''));
    c('a code typed as words with capitals is sent (trimmed), with this registration\'s name and church; kept as the server writes it',
      [qc[0].body.code,qc[0].body.who,qc[0].reg,Q.E("localStorage.getItem('terrain-ai-pass')"),JSON.parse(Q.E("localStorage.getItem('terrain-ai-kind')")).k],
      ['Cedar River 4821',{name:'Sample Pastor',church:'Sample Church'},TOK,'cedar-river-4821','guest']);
    const tryIt=async(answer,code)=>{ Q.E("localStorage.removeItem('terrain-ai-pass')"); server(Q,()=>answer); Q.q('#code-sheet input[name=code]').value=code; submit(Q,'#code-sheet form');
      await until(()=>!/Checking/.test(Q.txt('#code-sheet .code-st')||'')&&Q.txt('#code-sheet .code-st')); await sleep(20); return Q.txt('#code-sheet .code-st'); };
    c('taken by someone else: said so', await tryIt({body:{ok:true,unlocked:false,why:'taken'}},'olive-harbor-1234'), 'This code is already in use by someone else. Each code is for one person: ask for a new one.');
    c('turned off: said so', await tryIt({body:{ok:true,unlocked:false,why:'off'}},'maple-dawn-5678'), 'This code has been turned off. Ask the person who gave it to you.');
    // v10.70.0 (stale): the old words sent everyone back to check the email in Netlify; codes made in Terrain need no email
    c('any other code: check it with the person who gave it', await tryIt({body:{ok:true,unlocked:false}},'no-such-code-1'), 'That code did not work. Check it with the person who gave it to you.');
    c('nothing kept after a code that did not work', Q.E("localStorage.getItem('terrain-ai-pass')"), null); }

  console.log('\n-- in Spanish --');
  { const S=page({lang:'es',store:{'terrain-reg':REGT,'terrain-ai-pass':OWNER}}); server(S,owner()); await ready(S); await until(()=>S.q('#codebtn'));
    c('"Códigos de prueba" on his device, and in the sheet', [S.txt('#codebtn'),S.q('#codebtn').getAttribute('aria-label')], ['Códigos de prueba','Crear códigos de prueba']);
    S.q('#codebtn').click(); await until(()=>S.qa('#code-sheet .cds-row').length===3);
    c('the sheet in Spanish', [S.txt('#code-t'),S.txt('#code-sheet .cds-new button[type=submit]'),/^Sin usar todavía/.test(S.txt('#code-sheet .cds-row .cds-st'))], ['Códigos de prueba','Crear un código',true]);
    c('the ready message in Spanish', S.E('cdsMessage("cedar-river-4821")'), 'Su código de prueba de Terrain es cedar-river-4821. Abra terrain.church y regístrese; luego toque «Código de prueba» arriba y escriba el código. Sirve solo para usted.');
    c('no page errors (Spanish)', S.errs, []); }
}); T.done(); })();
