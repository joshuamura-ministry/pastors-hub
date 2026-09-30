// present-1.3 (v10.42.0): how members' phones move, and the PDF on their phones, on the server.
// The pastor, after presenting v10.41.1 live: "I'm able to change the slides on my phone and I don't want that. I want
// only the presenter to have the ability to control the slides… the presenter can choose… and at the end, on the
// phone… they should be able to download the proposal right there."
// Checked against an in-memory store (with ETags, as Netlify's) and a stubbed Firebase REST API, no network:
// op open takes mode ('follow' | 'free') and pdf (a boolean), refuses anything else before counting, keeps them on the
// room and puts them in the pointer; absent (an older page) is 'free' with the PDF on; op deck and op state give them;
// op mode (the presenter, with the key) changes them, pushes them to the pointer, is refused without the key, with a
// wrong key, by GET, with bad values, 60 times an hour at most, on an expired room or in a room's last minute, and is
// allowed after the end (the PDF offer still matters); a room kept before present-1.3 reads as free with the PDF on;
// op update keeps them; no op a phone sends (deck, state, join, respond) can change them; no answer carries a key.
delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.SITE_URL; delete process.env.TERRAIN_REG_SECRET;
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',String(JSON.stringify(g)).slice(0,400));console.log('    want:',String(JSON.stringify(e)).slice(0,300));fail++}else pass++};
const tick=()=>new Promise(r=>setImmediate(r));
function makeStore(){
  const m=new Map(); let n=0;
  return { m,
    async get(k){ await tick(); const v=m.get(k); return v===undefined?null:JSON.parse(v.data); },
    async getWithMetadata(k){ await tick(); const v=m.get(k); return v?{data:JSON.parse(v.data),etag:v.etag,metadata:{}}:null; },
    async setJSON(k,val,o={}){ await tick(); const cur=m.get(k);
      if(o.onlyIfNew&&cur) return {modified:false};
      if(o.onlyIfMatch&&(!cur||cur.etag!==o.onlyIfMatch)) return {modified:false};
      const etag='e'+(++n); m.set(k,{data:JSON.stringify(val),etag}); return {modified:true,etag}; },
    async delete(k){ await tick(); m.delete(k); },
    async list({prefix=''}={}){ await tick(); return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key,etag:m.get(key).etag}))}; },
    peek(k){ const v=m.get(k); return v?JSON.parse(v.data):null; },
    poke(k,val){ m.set(k,{data:JSON.stringify(val),etag:'e'+(++n)}); },
    keys(p=''){ return [...m.keys()].filter(k=>k.startsWith(p)); } };
}
const S=makeStore(); globalThis.__terrainPresentStore=S;
const FB='https://terrain-live-default-rtdb.firebaseio.com', FBS='fb-secret/TEST+phones';
process.env.PRESENT_FB_URL=FB; process.env.PRESENT_FB_SECRET=FBS;
let calls=[], fbOk=true; const RT={};
globalThis.fetch=async(url,o={})=>{
  const u=String(url), body=o.body===undefined?undefined:JSON.parse(o.body); calls.push({u,method:o.method||'GET',body});
  if(!fbOk) return {ok:false,status:500,json:async()=>null};
  const m=/\/live\/([A-Za-z0-9_-]{22})\.json/.exec(u);
  if(m&&o.method==='PATCH') RT[m[1]]={...(RT[m[1]]||{}),...body};
  return {ok:true,status:200,json:async()=>m?(RT[m[1]]??null):{}};
};
const fn=(await import(new URL('../netlify/functions/present.mjs', import.meta.url).href)).default;
const bodies=[];
const URL0='https://x.test/.netlify/functions/present';
async function call(req){ const r=await fn(req,{ip:'198.51.100.7'}); const t=await r.text(); bodies.push(t); return {status:r.status,j:JSON.parse(t)}; }
const post=b=>call(new Request(URL0,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}));
const get=q=>call(new Request(URL0+'?'+q,{method:'GET'}));
const deck=(o={})=>({kind:'tdeck',ver:1,lang:'en',title:'A food pantry',church:'Bucks County SDA',audience:{type:'congregation',group:'congregation'},ministry:{id:'food-pantry',name:'A food pantry'},
  slides:[{type:'join',note:'Scan to follow'},{type:'motion',kicker:'The plan',headline:'A trial of six weeks',rows:[['Runs','17 Oct – 28 Nov']],by:''},
    {type:'yes',kicker:'Three sizes of yes',headline:'Will you?',options:[{k:'pray',label:'Pray',text:'Pray'},{k:'help',label:'Help',text:'Help'},{k:'lead',label:'Lead',text:'Lead'}],respond:true},
    {type:'close',headline:'Thank you',text:'Speak to the pastor.',quote:null}],...o});
const pfx=()=>calls.filter(x=>x.method==='PATCH');

console.log('-- the version --');
// v10.42 part 3: present-1.4 keeps every present-1.3 behaviour checked here, and adds the phones' PDF (tests/present-pdf.test.mjs)
{ const r=await get(''); c('status says present-1.4', [r.status,r.j.fn], [200,'present-1.4']); }

console.log('\n-- op open: the way phones move, and the PDF --');
let A, B, O;
{ const g0=JSON.stringify(S.peek('g/open'));
  for(const [mode,pdf,err] of [['lock',undefined,'bad-mode'],[5,undefined,'bad-mode'],[true,undefined,'bad-mode'],['',undefined,'bad-mode'],['FOLLOW',undefined,'bad-mode'],[{},undefined,'bad-mode'],
      ['follow','yes','bad-pdf'],['follow',1,'bad-pdf'],['follow',0,'bad-pdf'],['free',{},'bad-pdf'],['free','false','bad-pdf']]){
    const r=await post({op:'open',deck:deck(),mode,pdf});
    c(`open refuses mode ${JSON.stringify(mode)}, pdf ${JSON.stringify(pdf)} (${err})`, [r.status,r.j.error], [400,err]); }
  c('…before anything is counted, and no room is made', [JSON.stringify(S.peek('g/open')),S.keys('r/').length], [g0,0]);
  calls=[];
  const r=await post({op:'open',deck:deck(),mode:'follow',pdf:false}); A=r.j;
  c('open with follow and no PDF: the answer says so', [r.status,A.mode,A.pdf], [200,'follow',false]);
  c('…the room keeps it', [S.peek('r/'+A.room).mode,S.peek('r/'+A.room).pdf], ['follow',false]);
  c('…and the first pointer carries it', pfx()[0]&&pfx()[0].body, {i:0,v:1,on:false,end:false,mode:'follow',pdf:false,at:{'.sv':'timestamp'}});
  const r2=await post({op:'open',deck:deck()}); B=r2.j;
  c('open with neither (an older page): free, the PDF on — the behaviour before v10.42', [B.mode,B.pdf,S.peek('r/'+B.room).mode,S.peek('r/'+B.room).pdf,RT[B.room].mode,RT[B.room].pdf], ['free',true,'free',true,'free',true]);
  const r3=await post({op:'open',deck:deck(),mode:null,pdf:null});
  c('null is absent (free, PDF on)', [r3.status,r3.j.mode,r3.j.pdf], [200,'free',true]);
  const r4=await post({op:'open',deck:deck(),mode:'free',pdf:true});
  c('free with the PDF', [r4.j.mode,r4.j.pdf], ['free',true]); }

console.log('\n-- op deck and op state give them --');
{ const d=await get('op=deck&room='+A.room);
  c('op deck: mode and pdf beside the deck', [d.status,d.j.mode,d.j.pdf,!!d.j.deck], [200,'follow',false,true]);
  const s=await get('op=state&room='+A.room);
  c('op state: the room’s own at the top, the pointer’s copy inside', [s.status,s.j.mode,s.j.pdf,s.j.state.mode,s.j.state.pdf], [200,'follow',false,'follow',false]);
  delete process.env.PRESENT_FB_URL;
  const s2=await get('op=state&room='+A.room);
  c('…and without live follow set up (no pointer), still the room’s own', [s2.status,s2.j.state,s2.j.mode,s2.j.pdf], [200,null,'follow',false]);
  process.env.PRESENT_FB_URL=FB; }

console.log('\n-- op mode: the presenter changes it, with the key --');
{ calls=[];
  let r=await post({op:'mode',room:A.room,mode:'free'});
  c('no key: refused (a phone never holds one)', [r.status,r.j.error,S.peek('r/'+A.room).mode], [403,'bad-key','follow']);
  r=await post({op:'mode',room:A.room,key:'Z'.repeat(43),mode:'free'});
  c('a wrong key: refused', [r.status,r.j.error,S.peek('r/'+A.room).mode], [403,'bad-key','follow']);
  r=await post({op:'mode',room:A.room,key:B.key,mode:'free'});
  c('another room’s key: refused', [r.status,r.j.error], [403,'bad-key']);
  r=await post({op:'mode',room:'Q'.repeat(22),key:A.key,mode:'free'});
  c('no such room: 404', [r.status,r.j.error], [404,'not-found']);
  r=await post({op:'mode',room:A.room,key:A.key});
  c('nothing to change: 400', [r.status,r.j.error], [400,'bad-mode']);
  r=await post({op:'mode',room:A.room,key:A.key,mode:'swipe'});
  c('a word that is not a way: 400', [r.status,r.j.error,S.peek('r/'+A.room).mode], [400,'bad-mode','follow']);
  r=await post({op:'mode',room:A.room,key:A.key,pdf:'on'});
  c('a PDF switch that is not true or false: 400', [r.status,r.j.error,S.peek('r/'+A.room).pdf], [400,'bad-pdf',false]);
  r=await get('op=mode&room='+A.room+'&mode=free');
  c('GET op mode: 405 (only POST changes anything)', [r.status,r.j.error], [405,'method']);
  c('(Firebase was never touched by any of those)', pfx().length, 0);
  r=await post({op:'mode',room:A.room,key:A.key,mode:'free'});
  c('with the key: free; the PDF left as it was', [r.status,r.j.mode,r.j.pdf,r.j.pointer], [200,'free',false,true]);
  c('…the room, and the pointer (mode, pdf, a time: nothing else)', [S.peek('r/'+A.room).mode,pfx().length,Object.keys(pfx()[0].body).sort()], ['free',1,['at','mode','pdf']]);
  const s=await get('op=state&room='+A.room);
  c('…op state says so at once on this instance', [s.j.mode,s.j.pdf], ['free',false]);
  r=await post({op:'mode',room:A.room,key:A.key,pdf:true});
  c('the PDF alone: on; the way left free', [r.j.mode,r.j.pdf,RT[A.room].mode,RT[A.room].pdf], ['free',true,'free',true]);
  r=await post({op:'mode',room:A.room,key:A.key,mode:'follow',pdf:false});
  c('both at once', [r.j.mode,r.j.pdf,(await get('op=deck&room='+A.room)).j.mode], ['follow',false,'follow']);
  fbOk=false; r=await post({op:'mode',room:A.room,key:A.key,mode:'free'}); fbOk=true;
  c('Firebase down: the room still changes (polling phones hear it); pointer:false says the stream did not', [r.status,r.j.mode,r.j.pointer,S.peek('r/'+A.room).mode], [200,'free',false,'free']);
  c('no answer ever carries the key, its hash or the Firebase secret', bodies.some(t=>t.includes(A.key)&&!t.includes('"key":"'+A.key+'"')||t.includes(S.peek('r/'+A.room).keyHash)||t.includes(FBS)), false); }

console.log('\n-- no op a phone sends can change it --');
{ const before=[S.peek('r/'+A.room).mode,S.peek('r/'+A.room).pdf];
  await get('op=deck&room='+A.room+'&mode=follow&pdf=true');
  await get('op=state&room='+A.room+'&mode=follow');
  await post({op:'respond',room:A.room,k:'help',name:'Ruth',note:'',minor:false,mode:'follow',pdf:true});
  await post({op:'join',code:A.code,mode:'follow'});
  await post({op:'deck',room:A.room,mode:'follow'});
  c('deck, state, join and respond carrying mode / pdf change nothing', [S.peek('r/'+A.room).mode,S.peek('r/'+A.room).pdf], before);
  c('(the answer itself went through)', S.keys('a/'+A.room+'/').length, 1); }

console.log('\n-- op update keeps it; the end; limits --');
{ let r=await post({op:'update',room:A.room,key:A.key,deck:deck({title:'New words'})});
  c('op update (new words) keeps the way and the PDF', [r.status,S.peek('r/'+A.room).mode,S.peek('r/'+A.room).pdf], [200,'free',false]);
  r=await post({op:'end',room:A.room,key:A.key});
  c('(ended)', r.j.ok, true);
  r=await post({op:'mode',room:A.room,key:A.key,pdf:true});
  c('after the end the PDF switch still works (it is what phones offer then)', [r.status,r.j.pdf,(await get('op=deck&room='+A.room)).j.pdf], [200,true,true]);
  // 60 an hour per room
  const Z=(await post({op:'open',deck:deck(),mode:'follow'})).j; let n=0, last=null;
  for(let i=0;i<61;i++){ last=await post({op:'mode',room:Z.room,key:Z.key,mode:i%2?'follow':'free'}); if(last.status===200) n++; }
  c('op mode: 60 an hour per room, then 429 slow-down', [n,last.status,last.j.error], [60,429,'slow-down']);
  const Y=(await post({op:'open',deck:deck(),mode:'follow'})).j;
  const rec=S.peek('r/'+Y.room); rec.expires=Date.now()+30*1000; S.poke('r/'+Y.room,rec);
  r=await post({op:'mode',room:Y.room,key:Y.key,mode:'free'});
  c('a room in its last minute takes no change (the sweep could miss it)', [r.status,r.j.error,S.peek('r/'+Y.room).mode], [404,'not-found','follow']);
  rec.expires=Date.now()-1000; S.poke('r/'+Y.room,rec);
  r=await post({op:'mode',room:Y.room,key:Y.key,mode:'free'});
  c('an expired room: 404, and it is deleted on sight', [r.status,S.peek('r/'+Y.room)], [404,null]); }

console.log('\n-- a room kept before present-1.3 --');
{ const X=(await post({op:'open',deck:deck(),mode:'follow',pdf:false})).j;
  const rec=S.peek('r/'+X.room); delete rec.mode; delete rec.pdf; delete rec.mupd; S.poke('r/'+X.room,rec);
  delete RT[X.room].mode; delete RT[X.room].pdf;
  await new Promise(r=>setTimeout(r,10));
  const d=(await get('op=deck&room='+X.room)).j;
  c('op deck: free, the PDF on (today’s behaviour)', [d.mode,d.pdf], ['free',true]);
  // a warm instance's copy is at most 10 s old; a fresh room read shows the same
  const s=(await get('op=state&room='+X.room)).j;
  c('op state: the pointer has no way of its own (null), the room’s reads free, PDF on', [s.state.mode,s.state.pdf,s.mode,s.pdf], [null,null,'free',true]);
  const r=await post({op:'mode',room:X.room,key:X.key,mode:'follow'});
  c('op mode on such a room works (the presenter chooses now)', [r.status,r.j.mode,r.j.pdf,S.peek('r/'+X.room).mode], [200,'follow',true,'follow']); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
