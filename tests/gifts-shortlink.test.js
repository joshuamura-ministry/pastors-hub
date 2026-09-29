// Spiritual Gifts: the short member link, its QR code and ready message, and
// the Spanish that was still missing. Through the real
// netlify/functions/gifts.mjs against an in-memory store:
//   - with the server, the pastor hands out #gifts=<pub>; the church context
//     (building, ministries, the survey's needs) lives on the campaign, and the
//     member page fetches it (op 'ctx');
//   - without the server, or a server that cannot hold the context, the long
//     self-contained #gifts=<pub>.<ctx> / #gifts=.<ctx> link is handed out;
//   - a member whose page cannot reach the server still takes the assessment,
//     and the church is asked for again when they send;
//   - QR code (library stubbed here; the real one is pinned by SRI), the
//     invitation message in English and Spanish, copy and download;
//   - the volunteer panel, its dialog and the setup survey card in Spanish.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const FX=JSON.parse(fs.readFileSync(path.resolve(__dirname,'fixtures.json'),'utf8'));
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=5000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(20); } return false; }

function makeStore(){
  const m=new Map();
  return { m,
    async get(k){ const v=m.get(k); return v===undefined?null:JSON.parse(v); },
    async setJSON(k,val,o={}){ if(o.onlyIfNew&&m.has(k)) return {modified:false}; m.set(k,JSON.stringify(val)); return {modified:true}; },
    async delete(k){ m.delete(k); },
    async list({prefix=''}={}){ return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}; },
    peek(k){ const v=m.get(k); return v?JSON.parse(v):null; } };
}
// A stand-in for qrcode-generator: the same API, a deterministic pattern.
const FAKE_QR=`window.qrcode=function(t,ec){ return {s:'',addData(x){this.s=String(x);},
  make(){ if(this.s.length>2500) throw new Error('code length overflow'); window.__qrMade=(window.__qrMade||[]).concat([{text:this.s,ec}]); },
  getModuleCount(){ return 25; }, isDark(r,c){ return ((r*7+c*3+this.s.length)%3===0)||(r<7&&c<7); } }; };`;

(async()=>{ try{
  delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.RESEND_API_KEY; delete process.env.GIFTS_FROM;
  const store=makeStore(); globalThis.__terrainGiftsStore=store;
  const handler=(await import(path.resolve(__dirname,'..','netlify','functions','gifts.mjs'))).default;
  const calls=[]; let override=null;
  function page(url,{lang,server=true,share}={}){
    const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
    const copied=[], clicks=[];
    const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
        if(w.HTMLDialogElement) w.HTMLDialogElement.prototype.showModal=function(){ this.open=true; };
        if(lang) w.localStorage.setItem('terrain-lang',lang);
        Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async t=>{ copied.push(t); }},configurable:true});
        w.HTMLAnchorElement.prototype.click=function(){ clicks.push({download:this.download,href:this.href}); };
        w.fetch=async(u,o={})=>{
          if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})};
          if(/functions\/gifts/.test(u)){
            const body=o.body?JSON.parse(o.body):{};
            calls.push({...body,from:url});
            if(!server) return {ok:false,status:404,json:async()=>{ throw new Error('html'); }};
            if(override){ const r=await override(body); if(r) return r; }
            const res=await handler(new Request('https://pastorshub.org'+u,{method:o.method||'GET',headers:o.headers,body:o.body}),{});
            const t=await res.text();
            return {ok:res.ok,status:res.status,json:async()=>JSON.parse(t)};
          }
          return new Promise(()=>{});
        };
      }});
    return {w:dom.window,errs,copied,clicks};
  }
  const pastor=(P,{min={'Small groups':'r','Adventurers':'s'},name='Bucks County SDA'}={})=>P.w.eval(`(()=>{
    const ch=uChurch(); ch.name=${JSON.stringify(name)}; ch.address=${JSON.stringify(FX.DATA.geo.matched)};
    DATA=${JSON.stringify(FX.DATA)}; ch.share={...(ch.share||{}),church:${JSON.stringify(name)},min:${JSON.stringify(min)}}; uPersist();
    openTool('gifts'); GF_VIEW='setup'; gfRender(); })()`);
  const generate=async P=>{ const D=P.w.document; D.getElementById('gflink2').click();
    await until(()=>!D.getElementById('gfready').hidden&&D.getElementById('gflinkbox2').value);
    return D.getElementById('gflinkbox2').value; };
  const opsFrom=u=>calls.filter(x=>x.from===u).map(x=>x.op);
  const allErrs=[];

  // ================================================== the short link
  console.log('-- the pastor: a short link when the server holds the context --');
  const P=page('https://pastorshub.org/'); allErrs.push(P.errs);
  await until(()=>P.w.eval('typeof gfMemberLink==="function"'));
  P.w.eval(FAKE_QR);
  pastor(P);
  const link1=await generate(P);
  const pub=P.w.eval('uChurch().share.pub');
  c('the link is #gifts=<pub>, nothing after it', [/^https:\/\/pastorshub\.org\/#gifts=[A-Za-z0-9_-]{12}$/.test(link1),link1.endsWith('#gifts='+pub)], [true,true]);
  const idCall=calls.filter(x=>x.op==='id').pop();
  c('the campaign was created with the context in one call (no setctx)', [!!idCall.ctx,calls.filter(x=>x.op==='setctx').length], [true,0]);
  const own=JSON.parse(P.w.eval('JSON.stringify(gfCtxObj())'));
  c('what the server holds is this church\'s context', store.peek('c/'+pub).ctx, own);
  c('with its ministries, building and the survey\'s needs', [own.church,Object.entries(own.min).sort(),own.needs.length>5,own.needs.every(n=>Number.isInteger(n.v)),own.area,own.year],
    ['Bucks County SDA',[['Adventurers','s'],['Small groups','r']],true,true,FX.DATA.levels.tract.name,P.w.eval('ACS_YEAR')]);
  c('every need the client sends is one the server accepts', own.needs.every(n=>/^[a-z0-9-]{1,40}$/.test(n.id)), true);
  // the pastor changes what the church runs, and generates again
  P.w.eval(`(()=>{ const ch=uChurch(); ch.share.min={'Prayer ministry':'r'}; uPersist(); GF_VIEW='setup'; gfRender(); })()`);
  const link2=await generate(P);
  c('generating again keeps the same short link', link2, link1);
  c('and replaces the context on the server with setctx (the campaign key)', [calls.filter(x=>x.op==='setctx').length,calls.filter(x=>x.op==='setctx').pop().key===P.w.eval('uChurch().share.key'),store.peek('c/'+pub).ctx.min], [1,true,{'Prayer ministry':'r'}]);
  const LONGish=P.w.eval('gfCtxEncode()').length;
  c('the short link is a fraction of the long one', link1.length<60&&LONGish>200, true);

  console.log('-- the member on the short link --');
  const M=page(link1); allErrs.push(M.errs);
  await until(()=>M.w.document.getElementById('gfstart'));
  const MD=M.w.document;
  c('the member page asked the server for the church (op ctx), then opened the intro', [opsFrom(link1)[0],!!MD.getElementById('gfstart')], ['ctx',true]);
  c('the church is named on the first screen', (MD.querySelector('.gfforchurch')||{}).textContent, 'For members of Bucks County SDA');
  const mctx=JSON.parse(M.w.eval('JSON.stringify(GF_CTX)'));
  c('GF_CTX carries the church, its id, its ministries and the needs', [mctx.church,mctx.churchId===own.churchId,mctx.min,mctx.needs.length===own.needs.length], ['Bucks County SDA',true,{'Prayer ministry':'r'},true]);
  c('answers are kept under the campaign, not the church the server named', M.w.eval('uGiftSessionKey()'), 'terrain-gifts:p:'+pub);
  c('a copy of the context is kept on the phone', !!M.w.localStorage.getItem('terrain-gifts-ctx:'+pub), true);
  M.w.eval(`GFS.name='Ana Ruiz'; GFS.minor=false; GIFTS.forEach(g=>{for(let k=0;k<5;k++) GFS.a[g.id+'.'+k]=(g.id==='teach'||g.id==='shep')?4:1;}); GF_HEART.forEach(q=>GFS.h[q.k]=q.k==='children'?2:0); GFS.i=GF_TOTAL; GFS.done=true; gfSave(); gfRender();`);
  await until(()=>MD.getElementById('gfsend'));
  c('the report shows where the gifts meet the neighbourhood', /Where your gifts meet your neighbo/.test(MD.getElementById('giftbody').textContent), true);
  MD.getElementById('gfsend').click();
  await until(()=>M.w.eval('GFS.sent===true'));
  const sub=calls.filter(x=>x.op==='submit').pop();
  const dec=JSON.parse(M.w.eval(`JSON.stringify(gfDecode(${JSON.stringify(sub.code)}))`));
  c('the result carries the church and its id', [dec.church,dec.churchId===own.churchId], ['Bucks County SDA',true]);
  P.w.eval('GF_VIEW="roster"; gfRender();');
  P.w.document.getElementById('gfpull').click();
  await until(()=>P.w.document.querySelectorAll('.gfrosterrow').length===1);
  c('it reaches the pastor\'s roster', /Ana Ruiz/.test(P.w.document.querySelector('.gfrosterrow').textContent), true);

  console.log('-- the emailed report link on another device --');
  const R=page(`https://pastorshub.org/#gifts-report=${pub}.${M.w.eval('GFS.rid')}.${M.w.eval('GFS.token')}`); allErrs.push(R.errs);
  await until(()=>R.w.document.getElementById('gfdelmine'));
  c('with nothing stored there, it asks the campaign for the church', calls.some(x=>x.op==='ctx'&&/gifts-report/.test(x.from)), true);
  c('and the report has its neighbourhood and church again', [/Where your gifts meet your neighbo/.test(R.w.document.getElementById('giftbody').textContent),/Bucks County SDA/.test(R.w.document.getElementById('giftbody').textContent)], [true,true]);

  console.log('-- the member page cannot reach the server --');
  override=b=>b.op==='ctx'?{ok:false,status:500,json:async()=>({ok:false,error:'server'})}:null;
  const O=page(link1); allErrs.push(O.errs);
  await until(()=>O.w.document.getElementById('gfstart'));
  c('the assessment still opens, without the church', [!!O.w.document.getElementById('gfstart'),O.w.eval('GF_CTX'),O.w.document.querySelector('.gfforchurch')], [true,null,null]);
  c('answers still go under the campaign', O.w.eval('uGiftSessionKey()'), 'terrain-gifts:p:'+pub);
  O.w.eval(`GFS.name='Ben Offline'; GFS.minor=false; GIFTS.forEach(g=>{for(let k=0;k<5;k++) GFS.a[g.id+'.'+k]=2;}); GFS.i=GF_TOTAL; GFS.done=true; gfSave(); gfRender();`);
  await until(()=>O.w.document.getElementById('gfsend'));
  override=null;   // the connection is back when they send
  O.w.document.getElementById('gfsend').click();
  await until(()=>O.w.eval('GFS.sent===true'));
  const sub2=calls.filter(x=>x.op==='submit').pop();
  const dec2=JSON.parse(O.w.eval(`JSON.stringify(gfDecode(${JSON.stringify(sub2.code)}))`));
  c('sending asks for the church once more, so the result still carries it', [dec2.name,dec2.church,dec2.churchId===own.churchId,O.w.eval('GF_CTX&&GF_CTX.church')], ['Ben Offline','Bucks County SDA',true,'Bucks County SDA']);
  // a later visit with no connection uses the copy kept on the phone
  override=b=>b.op==='ctx'?{ok:false,status:0,json:async()=>{ throw new Error('offline'); }}:null;
  const O2=page(link1); allErrs.push(O2.errs);
  await until(()=>O2.w.document.getElementById('gfstart'));
  O2.w.localStorage.setItem('terrain-gifts-ctx:'+pub,O.w.localStorage.getItem('terrain-gifts-ctx:'+pub));
  // (localStorage is per page in jsdom: seed it, then reload the member flow)
  O2.w.eval('initAccess()');
  await until(()=>O2.w.eval('!!(GF_CTX&&GF_CTX.church)'));
  c('offline later: the church comes from the copy on the phone', O2.w.eval('GF_CTX.church'), 'Bucks County SDA');
  override=b=>b.op==='ctx'?{ok:false,status:500,json:async()=>({ok:false,error:'server'})}:null;
  const junk=page(link1); allErrs.push(junk.errs);
  await until(()=>junk.w.document.getElementById('gfstart'));
  junk.w.localStorage.setItem('terrain-gifts-ctx:'+pub,'{"church":5,"min":{"__proto__":"r"},"needs":"x"}');
  junk.w.eval('initAccess()');
  await sleep(300);
  c('a damaged copy on the phone is read safely', [junk.w.eval('GF_CTX&&GF_CTX.church'),junk.w.eval('({}).polluted')===undefined], ['',true]);
  override=null;

  console.log('-- the long link, when the server cannot hold the context --');
  const N=page('https://pastorshub.org/',{server:false}); allErrs.push(N.errs);
  await until(()=>N.w.eval('typeof gfMemberLink==="function"'));
  N.w.eval(FAKE_QR); pastor(N);
  const nolink=await generate(N);
  c('no server: the self-contained #gifts=.<ctx>', /#gifts=\.[A-Za-z0-9_-]{100,}$/.test(nolink), true);
  const nctx=JSON.parse(N.w.eval(`JSON.stringify(gfCtxDecode(${JSON.stringify(nolink.split('#gifts=.')[1])}))`));
  c('which still carries the church and the needs', [nctx.church,nctx.needs.length>5], ['Bucks County SDA',true]);
  c('the message says a code comes back instead', /short code to send back to your pastor/.test(N.w.document.getElementById('gfmsg').value), true);
  // an older function: no 'ctx:true' from id, no setctx op
  override=b=>{ if(b.op==='setctx') return {ok:false,status:400,json:async()=>({ok:false,error:'unknown-op'})};
    if(b.op==='id'){ const {ctx,...rest}=b; return handler(new Request('https://pastorshub.org/.netlify/functions/gifts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(rest)}))
      .then(async r=>{ const t=await r.text(); return {ok:r.ok,status:r.status,json:async()=>JSON.parse(t)}; }); }
    return null; };
  const Q=page('https://pastorshub.org/'); allErrs.push(Q.errs);
  await until(()=>Q.w.eval('typeof gfMemberLink==="function"'));
  Q.w.eval(FAKE_QR); pastor(Q,{name:'Fairview Village SDA'});
  const qlink=await generate(Q);
  const qpub=Q.w.eval('uChurch().share.pub');
  c('a server that cannot keep the context: #gifts=<pub>.<ctx>', new RegExp('#gifts='+qpub+'\\.[A-Za-z0-9_-]{100,}$').test(qlink), true);
  c('and the message still says results come back by themselves', /results come back to your pastor/.test(Q.w.document.getElementById('gfmsg').value), true);
  override=null;
  // a context the server refuses never costs the campaign: id is asked again without it
  override=b=>(b.op==='id'&&b.ctx)||b.op==='setctx'?{ok:false,status:400,json:async()=>({ok:false,error:'bad-ctx'})}:null;
  const B=page('https://pastorshub.org/'); allErrs.push(B.errs);
  await until(()=>B.w.eval('typeof gfMemberLink==="function"'));
  B.w.eval(FAKE_QR); pastor(B,{name:'Refused Context SDA'});
  const blink=await generate(B);
  const bpub=B.w.eval('uChurch().share&&uChurch().share.pub');
  c('context refused: the campaign is still made, and the long link carries the church', [/^[A-Za-z0-9_-]{12}$/.test(bpub||''),new RegExp('#gifts='+bpub+'\\.[A-Za-z0-9_-]{100,}$').test(blink),calls.filter(x=>x.op==='id'&&/pastorshub\.org\/$/.test(x.from)).slice(-2).map(x=>!!x.ctx)], [true,true,[true,false]]);
  override=null;
  // Updated for v10.38.0: codes refuse a campaign only while TERRAIN_REQUIRE_CODE is '1'.
  process.env.TERRAIN_CODES='PA-2026-K7M2'; process.env.TERRAIN_REQUIRE_CODE='1';
  const Z=page('https://pastorshub.org/'); allErrs.push(Z.errs);
  await until(()=>Z.w.eval('typeof gfMemberLink==="function"'));
  Z.w.eval(FAKE_QR); pastor(Z,{name:'Third SDA'});
  const zlink=await generate(Z);
  c('a campaign refused (no access code): the long link, and why', [/#gifts=\.[A-Za-z0-9_-]+$/.test(zlink),/access code/.test(Z.w.document.getElementById('gflinknote2').textContent)], [true,true]);
  delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE;

  console.log('-- the QR code and the message --');
  const D=P.w.document;
  P.w.eval(`GF_VIEW='setup'; gfRender();`); P.w.__qrMade=[];
  await generate(P);
  await until(()=>!D.getElementById('gfqrbox').hidden);
  c('the QR block shows once the library has drawn it', !D.getElementById('gfqrbox').hidden, true);
  c('it encodes exactly the link, at medium correction', P.w.__qrMade.pop(), {text:link1,ec:'M'});
  const svg=D.querySelector('#gfqrimg svg');
  c('as an SVG, black on white with a quiet zone of four modules', [svg.getAttribute('viewBox'),svg.querySelector('rect').getAttribute('fill'),svg.querySelector('path').getAttribute('fill'),svg.getAttribute('role')], ['0 0 33 33','#ffffff','#000000','img']);
  // redraw the modules from the path and compare with the library, cell by cell
  const grid=Array.from({length:25},()=>Array(25).fill(0));
  for(const m of svg.querySelector('path').getAttribute('d').matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)){ const x=+m[1]-4, yv=+m[2]-4; for(let k=0;k<+m[3];k++) grid[yv][x+k]++; }
  const want=JSON.parse(P.w.eval(`JSON.stringify((()=>{ const q=qrcode(0,'M'); q.addData(${JSON.stringify(link1)}); q.make(); return Array.from({length:25},(_,r)=>Array.from({length:25},(_,c)=>q.isDark(r,c)?1:0)); })())`));
  c('every dark module drawn once, every light one left white', JSON.stringify(grid)===JSON.stringify(want), true);
  c('the link is short, so no "print it large" note', D.getElementById('gfqrlong').hidden, true);
  // Download QR code: a PNG from a canvas, named for the church
  const fills=[];
  P.w.HTMLCanvasElement.prototype.getContext=function(){ return {set fillStyle(v){ this._f=v; }, get fillStyle(){ return this._f; }, fillRect:(x,y2,w2,h2)=>fills.push([x,y2,w2,h2])}; };
  P.w.HTMLCanvasElement.prototype.toBlob=function(cb){ cb(new P.w.Blob(['png'],{type:'image/png'})); };
  P.w.URL.createObjectURL=()=>'blob:qr'; P.w.URL.revokeObjectURL=()=>{};
  D.getElementById('gfqrdl').click();
  const dl=P.clicks.pop();
  c('Download QR code saves <Church>-Spiritual-Gifts-QR.png', dl, {download:'Bucks-County-SDA-Spiritual-Gifts-QR.png',href:'blob:qr'});
  const darkN=want.flat().filter(Boolean).length;
  c('the PNG paints the white ground and every dark module', fills.length, darkN+1);
  c('large enough to print (about 1200 px)', fills[0][2]>=1100&&fills[0][2]<=1250, true);
  // the message
  const msgEn=D.getElementById('gfmsg').value;
  c('the message names the church, the time, and where results go', [/Bucks County SDA/.test(msgEn),/about twelve minutes/.test(msgEn),/your report opens straight away/.test(msgEn),/come back to your pastor/.test(msgEn),msgEn.endsWith('Start here: '+link1)], [true,true,true,true,true]);
  c('two to four sentences before the link', msgEn.split('\n\n')[0].split(/(?<=[.!?])\s+/).length, 3);
  D.querySelector('[data-ml="es"]').click();
  const msgEs=D.getElementById('gfmsg').value;
  // Updated (review V14/E2E-9): the Spanish message's link ends ~es, so it opens in
  // Spanish on a phone that has not chosen a language.
  c('Español: the same message in Spanish, usted form, its link opening in Spanish', [/Una invitación de Bucks County SDA/.test(msgEs),/unos doce minutos/.test(msgEs),/verá su informe de inmediato/.test(msgEs),/le llegarán también a su pastor/.test(msgEs),msgEs.endsWith('Comience aquí: '+link1+'~es')], [true,true,true,true,true]);
  c('the language switch shows which is chosen', [...D.querySelectorAll('[data-ml]')].map(b=>b.getAttribute('aria-checked')), ['false','true']);
  D.getElementById('gfmsgcopy').click(); await sleep(10);
  c('Copy message copies what is in the box', P.copied.pop(), msgEs);
  D.getElementById('gflinkcopy').click(); await sleep(10);
  c('Copy link only copies the link (in Spanish while Español is chosen)', P.copied.pop(), link1+'~es');
  D.querySelector('[data-ml="en"]').click(); D.getElementById('gflinkcopy').click(); await sleep(10);
  c('…and the plain link in English', P.copied.pop(), link1);
  c('the QR code stays on the plain link', P.w.__qrMade.length?P.w.__qrMade[P.w.__qrMade.length-1].text:link1, link1);
  c('both messages escape nothing into HTML (they are plain text)', P.w.eval(`gfInviteMsg('en','<b>St John</b>','u',true).includes('<b>St John</b>')`), true);
  c('the church name typed with markup stays text on the setup screen', (()=>{ P.w.eval(`uChurch().name='<img src=x onerror=alert(1)>'; GF_VIEW='setup'; gfRender();`);
    return D.querySelectorAll('#giftbody img').length; })(), 0);
  P.w.eval(`uChurch().name='Bucks County SDA'; uPersist();`);

  console.log('-- offline: no QR, the link and message still there --');
  const F=page('https://pastorshub.org/'); allErrs.push(F.errs);
  await until(()=>F.w.eval('typeof gfMemberLink==="function"'));
  pastor(F,{name:'Offline SDA'});
  F.w.document.getElementById('gflink2').click();
  await until(()=>!F.w.document.getElementById('gfready').hidden);
  const s=[...F.w.document.head.querySelectorAll('script')].find(x=>/qrcode-generator/.test(x.src));
  c('the library is asked for once, pinned: cdnjs 1.4.4, SRI, anonymous CORS', s&&[s.src,s.getAttribute('integrity'),s.getAttribute('crossorigin'),s.getAttribute('referrerpolicy')],
    ['https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js','sha512-ZDSPMa/JM1D+7kdg2x3BsruQ6T/JpJo3jWDWkCZsP+5yVyp1KfESqLI+7RqB5k24F7p2cV7i2YHh/890y6P6Sw==','anonymous','no-referrer']);
  s.dispatchEvent(new F.w.Event('error'));
  await sleep(30);
  c('when it cannot load, the QR block stays hidden and the script is removed', [F.w.document.getElementById('gfqrbox').hidden,!!s.parentNode], [true,false]);
  c('the link and the message are there all the same', [!!F.w.document.getElementById('gflinkbox2').value,/Offline SDA/.test(F.w.document.getElementById('gfmsg').value)], [true,true]);
  c('a later link may try the library again', F.w.eval('GF_QR_P'), null);
  c('.gfqr[hidden] really hides (its display:flex would otherwise win)', /\.gfqr\[hidden\][^{]*\{display:none\}/.test(html), true);
  c('a link too long for any QR code: no code, no error', F.w.eval(`(()=>{ ${FAKE_QR} return gfQRRows(window.qrcode,'x'.repeat(3000)); })()`), null);

  console.log('-- the context, as the page reads it --');
  const X=JSON.parse(P.w.eval(`JSON.stringify(gfCtxSane(JSON.parse('{"church":"  St  John\\\\u0000 ","churchId":"c1","fac":["kitchen","<b>","kitchen"],"min":{"__proto__":"r","Small groups":"r","Not a ministry":"s","Adventurers":"x"},"needs":[{"id":"kids","v":27.4},{"id":"__proto__","v":1},{"id":"kids","v":3},{"id":"nope","v":1},{"id":"lang-primary","v":19,"x":"Spanish"}],"area":"Tract 1","year":1990,"extra":1}')))`));
  c('gfCtxSane keeps only known ministries and needs, tidies text, drops the rest', X,
    {church:'St John',fac:['kitchen'],min:{'Small groups':'r'},churchId:'c1',needs:[{id:'kids',v:27,x:null},{id:'lang-primary',v:19,x:'Spanish'}],area:'Tract 1',year:null});
  c('and nothing reached Object.prototype', P.w.eval('({}).polluted===undefined&&Object.keys(Object.prototype).length===0'), true);
  c('not an object → null', [P.w.eval('gfCtxSane(null)'),P.w.eval('gfCtxSane([1])'),P.w.eval('gfCtxSane("x")')], [null,null,null]);

  console.log('-- the roster: a result from this church\'s own campaign belongs here --');
  // a code from a member page that never learnt its church: no church, no church id
  const nochurch='TG1-'+Buffer.from(JSON.stringify({v:4,date:'2026-09-28',chars:'3'+'.'.repeat(104),heart:'.'.repeat(12),minor:false,church:'',churchId:'',name:'No Church Yet',memberId:'mx',resources:{}})).toString('base64url');
  P.w.eval(`gfRosterAdd(${JSON.stringify(nochurch)},{rid:'R9R9R9R9R9R9',pub:${JSON.stringify(pub)}})`);
  c('a code without a church id that came in through this campaign is listed', P.w.eval('gfRoster().some(r=>r.name==="No Church Yet")'), true);
  P.w.eval(`gfRosterRemove(${JSON.stringify(nochurch)}); gfRosterAdd(${JSON.stringify(nochurch)},{rid:'R9R9R9R9R9R9',pub:'ZZZZZZZZZZZZ'})`);
  c('one from another campaign is not', P.w.eval('gfRoster().some(r=>r.name==="No Church Yet")'), false);
  c('nor is it counted in uPeople or gfEveryone', [P.w.eval('uPeople().some(p=>p.name==="No Church Yet")'),P.w.eval('gfEveryone().some(p=>p.name==="No Church Yet")')], [false,false]);
  // One membership rule: what the Results list shows, "Across the church" counts.
  P.w.eval(`gfRosterRemove(${JSON.stringify(nochurch)}); gfRosterAdd(${JSON.stringify(nochurch)},{rid:'R9R9R9R9R9R9',pub:${JSON.stringify(pub)}})`);
  c('this campaign\'s church-less result is in gfRoster, uPeople and gfEveryone alike', [P.w.eval('gfRoster().some(r=>r.name==="No Church Yet")'),P.w.eval('uPeople().some(p=>p.name==="No Church Yet")'),P.w.eval('gfEveryone().some(p=>p.name==="No Church Yet")')], [true,true,true]);
  c('and the counts agree', P.w.eval('gfRoster().length===gfEveryone().filter(p=>p.source==="survey").length'), true);
  P.w.eval(`GF_VIEW='church'; gfRender();`);
  { const m=P.w.document.getElementById('giftbody').textContent.match(/(\d+) members? so far/);
    c('the church view counts every result on the list', m&&+m[1], P.w.eval('gfRoster().length')); }
  P.w.eval(`gfRosterRemove(${JSON.stringify(nochurch)})`);
  // A pasted code with no church at all (the member's offline fallback): filed
  // under this church, and the pastor is told so.
  const pasted='TG1-'+Buffer.from(JSON.stringify({v:4,date:'2026-09-28',chars:'2'+'.'.repeat(104),heart:'.'.repeat(12),minor:false,church:'',churchId:'',name:'Pasted Paula',memberId:'mp1',resources:{}})).toString('base64url');
  P.w.eval(`GF_VIEW='roster'; gfRender();`);
  P.w.document.getElementById('gfpaste').value=pasted; P.w.document.getElementById('gfadd').click();
  c('a pasted church-less code appears on the list and in uPeople', [P.w.eval('gfRoster().some(r=>r.name==="Pasted Paula")'),P.w.eval('uPeople().some(p=>p.name==="Pasted Paula")')], [true,true]);
  c('with a note saying where it was filed', /This code named no church, so it was filed under/.test(P.w.document.getElementById('gfaddnote').textContent), true);
  // A code made with another church's link: not silently swallowed.
  const otherc='TG1-'+Buffer.from(JSON.stringify({v:4,date:'2026-09-28',chars:'2'+'.'.repeat(104),heart:'.'.repeat(12),minor:false,church:'Elsewhere SDA',churchId:'not-a-church-here',name:'Other Olga',memberId:'mo1',resources:{}})).toString('base64url');
  P.w.document.getElementById('gfpaste').value=otherc; P.w.document.getElementById('gfadd').click();
  c('another church\'s code says why it is not listed', [P.w.eval('gfRoster().some(r=>r.name==="Other Olga")'),/another church/.test(P.w.document.getElementById('gfaddnote').textContent)], [false,true]);
  P.w.eval(`gfRosterRemove(${JSON.stringify(pasted)}); gfRosterRemove(${JSON.stringify(otherc)});`);

  console.log('-- Spanish --');
  const S=page('https://pastorshub.org/',{lang:'es'}); allErrs.push(S.errs);
  await until(()=>S.w.eval('typeof gfMemberLink==="function"'));
  S.w.eval(FAKE_QR); pastor(S);
  const card=S.w.document.getElementById('gfsurveycard').textContent;
  c('the setup survey card says "Sección censal", not "Census Tract"', [/Sección censal 2041\.02/.test(card),/Census Tract/.test(card)], [true,false]);
  await generate(S);
  const ready=S.w.document.getElementById('gfready').textContent;
  c('the QR and message block is Spanish', [/Código QR/.test(ready),/Descargar el código QR/.test(ready),/Un mensaje listo para enviar/.test(ready),/Copiar el mensaje/.test(ready),/Copiar solo el enlace/.test(ready),/QR code|Copy message|Download/.test(ready)], [true,true,true,true,true,false]);
  c('and the message starts in Spanish', /^Una invitación de Bucks County SDA/.test(S.w.document.getElementById('gfmsg').value), true);
  S.w.eval(`(()=>{ const ch=uChurch(); ch.members=[{id:'v1',name:'Rosa Díaz',hours:8,skills:['cook','kids'],slots:['Sat afternoon'],willing:true,confirmed:true},{id:'v2',name:'Luis',skills:[]}]; uPersist(); GF_VIEW='roster'; gfRender(); })()`);
  const team=S.w.document.getElementById('u-team').textContent;
  c('the volunteer panel is Spanish', [/Habilidades prácticas y disponibilidad · Bucks County SDA/.test(team),/1 miembro confirmado y dispuesto\./.test(team),/Agregar un voluntario/.test(team),/Recursos de la iglesia/.test(team),/Confirmado y dispuesto · 8 horas al mes · Puede cocinar para muchas personas, Buen trato con los niños/.test(team),/Falta revisar · Horas al mes sin indicar · Habilidades sin registrar/.test(team),/Revisar los datos/.test(team)], [true,true,true,true,true,true,true]);
  c('with no English left in it', /confirmed|willing|Add a volunteer|Review|hours\/month|Skills not|Church resources/.test(team), false);
  S.w.document.querySelector('[data-u-member="v1"]').click();
  const dlg=S.w.document.getElementById('u-dialog').textContent;
  c('the volunteer dialog is Spanish, Close included', [/Recursos del voluntario/.test(dlg),/Cerrar/.test(dlg),/Al confirmarlas, estas habilidades/.test(dlg),/Guardar miembro/.test(dlg),/Volunteer resources|Close|Save member|Confirmation makes/.test(dlg)], [true,true,true,true,false]);
  // English is unchanged
  P.w.eval(`(()=>{ const ch=uChurch(); ch.members=[{id:'v1',name:'Rosa',hours:8,skills:['cook'],willing:true,confirmed:true}]; uPersist(); GF_VIEW='roster'; gfRender(); })()`);
  const teamEn=P.w.document.getElementById('u-team').textContent;
  // Updated (review V7a): the English line now agrees with its count, as the Spanish already did.
  c('English still reads as before, singular for one', [/Practical skills & availability/.test(teamEn),/1 confirmed, willing member\. Skills support/.test(teamEn),/Confirmed and willing · 8 hours\/month · Can cook for a crowd/.test(teamEn)||/Confirmed and willing · 8 hours\/month · /.test(teamEn)], [true,true,true]);

  c('no page errors anywhere', allErrs.flat(), []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
