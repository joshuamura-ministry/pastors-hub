// v10.42.0 part 3 — Gifts first, church-wide: the card, the invitation, the announcements, the Sabbath presentation.
// The pastor (SPEC-FOCUS E): "Before, the Spiritual Gifts initiative has to be done for the whole church membership; every
// member needs to do it… Easy to understand, easy to work through, and very effective for getting people engaged in the areas
// of ministry they're called into." — "ONE 'Gifts first' card… with ONE number and ONE button: '{n} of {adults} have discovered
// their gifts'… and 'Invite the whole church'. The button opens the existing gifts campaign share panel (short link, QR, ready
// announcement text EN + ES for the bulletin, text message, WhatsApp and the pulpit), creating the church-wide campaign if none
// exists." — "A ready Sabbath presentation, 'Discover your gifts' / 'Descubra sus dones'… (the congregation kind, locked
// phones, QR on the join slide so members take the assessment right there): why (1 Peter 4:10, Romans 12:6, 1 Corinthians 12 —
// verified table only), how (about 15 minutes on your phone), what happens next… privacy…"
// The design (GIFTS.md §12.1 B–D and 39, 41, 42, as amended: no "Ask by" date, X12; 15 minutes, X17): the made-up average church
// of section D (tests/average-church: none, 18 and 40 of 46 adults with results), the real gifts.mjs and present.mjs against
// in-memory stores, no network. present.mjs's side of the gifts deck (items 30–33) is in present-pdf.test.mjs.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const FX=require('./fixtures.json');
const BG=require('./scripture-bg.json').passages;
const FXD=path.join(__dirname,'average-church');
const SEED=v=>JSON.parse(fs.readFileSync(path.join(FXD,`seed-${v}.json`),'utf8'));
const NAMES=JSON.parse(fs.readFileSync(path.join(FXD,'gifts-after-key.json'),'utf8')).members.map(k=>k.name);
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,600));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=5000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(20); } return false; }
function makeStore(){ const m=new Map(); return { m,
  async get(k){ const v=m.get(k); return v===undefined?null:JSON.parse(v); },
  async setJSON(k,val,o={}){ if(o.onlyIfNew&&m.has(k)) return {modified:false}; m.set(k,JSON.stringify(val)); return {modified:true}; },
  async delete(k){ m.delete(k); }, async list({prefix=''}={}){ return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}; },
  peek(k){ const v=m.get(k); return v?JSON.parse(v):null; } }; }
(async()=>{ try{
  for(const k of ['TERRAIN_CODES','TERRAIN_REQUIRE_CODE','TERRAIN_REG_SECRET','RESEND_API_KEY','GIFTS_FROM','PRESENT_FB_URL','PRESENT_FB_SECRET']) delete process.env[k];
  process.env.SITE_URL='https://pastorshub.org';
  globalThis.__terrainGiftsStore=makeStore(); globalThis.__terrainPresentStore=makeStore();
  const gifts=(await import(path.resolve(__dirname,'..','netlify','functions','gifts.mjs'))).default;
  const present=(await import(path.resolve(__dirname,'..','netlify','functions','present.mjs'))).default;
  const calls=[];
  function page(url,{seed,lang,reg=true,tier}={}){
    const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
    const dom=new JSDOM(html,{runScripts:'dangerously',url:url+(tier?'?tier='+tier:''),pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.__scrolled=[]; w.Element.prototype.scrollIntoView=function(){ w.__scrolled.push(this.id||this.className); };
        if(seed) for(const [k,v] of Object.entries(SEED(seed))) if(!k.startsWith('_')&&(reg||k!=='terrain-reg')) w.localStorage.setItem(k,JSON.stringify(v));
        if(lang) w.localStorage.setItem('terrain-lang',lang);
        Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async()=>{}},configurable:true});
        w.qrcode=(t,ec)=>{ let data=''; return {addData(s){ data=s; },make(){},getModuleCount:()=>25,isDark:(r,c2)=>((r*7+c2*3+data.length)%5)<2}; };
        w.fetch=async(u,o={})=>{ u=String(u);
          const fn=/functions\/(gifts|present)/.exec(u);
          if(fn){ const body=o.body?JSON.parse(o.body):null; calls.push({fn:fn[1],op:body?body.op:new URL(u,'https://pastorshub.org').searchParams.get('op'),from:url});
            const r=await (fn[1]==='gifts'?gifts:present)(new Request(new URL(u,'https://pastorshub.org').href,{method:o.method||'GET',headers:o.headers||{},body:o.body}),{ip:'203.0.113.4',site:{url:'https://pastorshub.org'}});
            const t=await r.text(); return {ok:r.ok,status:r.status,headers:{get:k=>r.headers.get(k)},json:async()=>JSON.parse(t)}; }
          if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})};
          if(/functions\/register/.test(u)) return {ok:false,status:500,json:async()=>({})};
          return new Promise(()=>{}); }; }});
    const w=dom.window;
    return {w,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
      txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
  }
  const ready=async P=>{ await until(()=>P.E('typeof gfFirstCardHTML==="function"&&typeof uChurch==="function"')); await sleep(300); };
  const AI=/\b(AI|IA|A\.I\.|artificial intelligence|inteligencia artificial)\b/;

  console.log('\n-- B. the card: one number, one button, in three places --');
  const P=page('https://pastorshub.org/',{seed:'partial'}); await ready(P);
  P.E('showHub()');
  c('(the partial church: 18 of 46 adults, from D’s seed)', P.J('(({n,den,state,pct})=>({n,den,state,pct}))(gfReadiness())'), {n:18,den:{d:46,kind:'adults'},state:'low',pct:39});
  c('the hub: the card below the four tools (kicker, church, number line, bar, source, one button)',
    [P.q('#hubgifts').hidden,P.txt('#hubgifts .gff-k'),P.txt('#hubgifts .gff-n'),P.q('#hubgifts .gff-bar').getAttribute('aria-label'),P.txt('#hubgifts .gff-src'),P.qa('#hubgifts button').map(b=>b.textContent)],
    [false,'Gifts first · Sampleton SDA (SAMPLE)','18 of 46 adults have discovered their gifts','39%','Adults in worship on an average Sabbath, from your church profile (demo profile).',['Invite the whole church']]);   // (D's seed is a demo profile, and says so)
  c('…the number in bold, nothing else (no names, no counts of gifts)', [P.txt('#hubgifts .gff-n b'),NAMES.some(n=>P.txt('#hubgifts').includes(n))], ['18 of 46 adults',false]);
  P.E(`openTool('gifts'); GF_VIEW='roster'; gfRender();`);
  c('the Spiritual Gifts landing: the same card between the heading and the two doors', [P.qa('#gifts [data-gf-first]').length,P.txt('#gifts [data-gf-first] .gff-n'),P.q('.gfhead').nextElementSibling.matches('[data-gf-first]'),P.q('[data-gf-first="landing"]').nextElementSibling.classList.contains('gfdoors')],
    [1,'18 of 46 adults have discovered their gifts',true,true]);
  c('…“about 15 minutes” on the landing', /about 15 minutes/.test(P.txt('.gfhead .sub')), true);
  // (the profile's own host, as the survey's Mobilization section holds it; the seed church has no survey of its own here)
  P.E(`(()=>{ const d=document.createElement('div'); d.id='capslot'; document.body.appendChild(d); capRender(); })()`);
  c('the church profile: the card first, above the form (outside it)', [P.qa('#capslot [data-gf-first]').length,P.q('#capslot').firstElementChild.matches('[data-gf-first="profile"]'),!!P.q('#capslot [data-gf-first] + #u-cap-form'),P.txt('#capslot [data-gf-first] .gff-n')],
    [1,true,true,'18 of 46 adults have discovered their gifts']);
  c('one card in each place, one button each', ['hub','landing','profile'].map(w=>[P.qa(`[data-gf-first="${w}"]`).length,P.qa(`[data-gf-first="${w}"] button`).length]), [[1,1],[1,1],[1,1]]);   // (the landing stays drawn behind the other tools)
  c('(the demo badge the seed carries is said on the source line)', /\(demo profile\)\.$/.test(P.txt('#capslot .gff-src')), true);

  console.log('\n-- B. when the card shows, and its words --');
  { const M=page('https://pastorshub.org/#gifts=QLvn7p0Tqzd5',{seed:'partial'}); await ready(M); M.E('showHub()');
    c('never on a member’s page (#gifts=)', [M.q('#hubgifts').hidden,M.qa('[data-gf-first] .gff-n').length], [true,0]); M.w.close();
    const W=page('https://pastorshub.org/#watch=AAAAAAAAAAAAAAAAAAAAAA',{seed:'partial'}); await ready(W); W.E('showHub()');
    c('…nor a phone following slides (#watch=)', W.qa('#hubgifts .gff').length, 0); W.w.close();
    const G=page('https://pastorshub.org/',{seed:'partial',reg:false}); await ready(G); G.E('GATE=GATE||{}; showHub()');   // (the first page's registration gate up)
    c('…nor before registration (gated)', [G.E('gated()'),G.qa('#hubgifts .gff').length], [true,0]); G.w.close();
    const T=page('https://pastorshub.org/',{seed:'partial',tier:'free'}); await ready(T); T.E('showHub()');
    c('…nor without the gifts tool (?tier=free)', T.qa('#hubgifts .gff').length, 0); T.w.close();
    const N=page('https://pastorshub.org/',{}); await ready(N); N.E(`localStorage.setItem('terrain-reg',JSON.stringify(${JSON.stringify(SEED('partial')['terrain-reg'])})); uChurch(); showHub();`);
    c('…nor for the “My church” placeholder with no profile and no results', [N.J('gfReadiness().church'),N.qa('#hubgifts .gff').length], ['',0]); N.w.close(); }
  { const L=(seed,lang,fn)=>{ const X=page('https://pastorshub.org/',{seed,lang}); return ready(X).then(()=>{ if(fn) X.E(fn); X.E('showHub()'); const t=X.txt('#hubgifts .gff-n'), s=X.txt('#hubgifts .gff-src'); X.w.close(); return [t,s]; }); };
    c('before: “0 of 46 adults have discovered their gifts”', (await L('before'))[0], '0 of 46 adults have discovered their gifts');
    c('…in Spanish', await L('before','es'), ['0 de 46 adultos han descubierto sus dones','Adultos que asisten un sábado promedio, según el perfil de su iglesia (perfil de demostración).']);
    c('after: 40 of 46 (the one who answered 3–4 to everything took it: counted)', (await L('after'))[0], '40 of 46 adults have discovered their gifts');
    c('one result: singular', (await L('partial',null,`(()=>{ const r=uRead(GF_ROSTER,[]); localStorage.setItem(GF_ROSTER,JSON.stringify(r.slice(0,1))); })()`))[0], '1 of 46 adults has discovered their gifts');
    c('…in Spanish', (await L('partial','es',`(()=>{ const r=uRead(GF_ROSTER,[]); localStorage.setItem(GF_ROSTER,JSON.stringify(r.slice(0,1))); })()`))[0], '1 de 46 adultos ha descubierto sus dones');
    c('no adults in the profile: the attendance, and it says so', await L('partial',null,`(()=>{ const c=uChurch().capacity; delete c.adults; uPersist(); CAP=null; })()`),
      ['18 of the 55 in worship have discovered their gifts','Average Sabbath attendance from your church profile, children included. Add the number of adults there for a truer count (demo profile).']);
    c('…nor attendance: the members on the books', (await L('partial',null,`(()=>{ const c=uChurch().capacity; delete c.adults; delete c.members; uPersist(); CAP=null; })()`))[0], '18 of 80 members have discovered their gifts');
    c('…nothing at all, and nobody yet: “Nobody has taken it yet”', await L('before',null,`(()=>{ const c=uChurch().capacity; delete c.adults; delete c.members; delete c.membership; uPersist(); CAP=null; })()`),
      ['Nobody has taken it yet','Add your average Sabbath attendance in the church profile to see how far the church has come (demo profile).']);
    c('more results than the profile says: capped at 100%, and “update the number there”', await L('after',null,`(()=>{ uChurch().capacity.adults=20; uPersist(); CAP=null; })()`),
      ['40 of 20 adults have discovered their gifts','More than the 20 in your church profile: update the number there (demo profile).']); }

  console.log('\n-- B. "Invite the whole church" --');
  { const X=page('https://pastorshub.org/',{seed:'partial'}); await ready(X); X.E('showHub()'); calls.length=0;
    X.q('#hubgifts [data-gf-invite]').click();
    await until(()=>X.q('#gfready')&&!X.q('#gfready').hidden&&X.w.__scrolled.includes('gfready'),8000);
    const ids=calls.filter(k=>k.fn==='gifts'&&k.op==='id').length;
    c('no campaign yet: the setup’s share panel, exactly one campaign made (op id), the ready block shown and scrolled to', [X.J('TOOL'),X.J('GF_VIEW'),ids,!X.q('#gfready').hidden,X.w.__scrolled.includes('gfready')], ['gifts','setup',1,true,true]);
    const pub=X.J('uChurch().share.pub');
    c('…the short link, the church’s own', [/^[A-Za-z0-9_-]{12}$/.test(pub),X.q('#gflinkbox2').value.endsWith('#gifts='+pub)], [true,true]);
    X.E('showHub()'); calls.length=0; X.q('#hubgifts [data-gf-invite]').click();
    await until(()=>X.q('#gfready')&&!X.q('#gfready').hidden,8000);
    c('a campaign already: no new one (results already in keep counting), the same pub', [calls.filter(k=>k.fn==='gifts'&&k.op==='id').length,X.J('uChurch().share.pub')], [0,pub]);
    // quiet sync: at most once every ten minutes per church
    X.E('GF_LAST_SYNC={}'); calls.length=0; X.E('showHub()'); await sleep(200); X.E('showHub()'); await sleep(200);
    c('the card, drawn, brings results in quietly: one op list, not two within ten minutes', calls.filter(k=>k.op==='list').length, 1);
    X.E(`GF_LAST_SYNC[uChurch().id]=Date.now()-11*60*1000`); calls.length=0; X.E('showHub()'); await sleep(200);
    c('…and again after ten minutes', calls.filter(k=>k.op==='list').length, 1);
    X.w.close();
    const Y=page('https://pastorshub.org/',{seed:'partial'}); await ready(Y);
    Y.E(`uChurch().name='My church'; uChurch().share={}; uPersist(); showHub();`); calls.length=0;
    Y.E('gfInviteChurch()'); await sleep(100);
    c('a church without a name: nothing made, the name box focused, "Name the church first"', [calls.filter(k=>k.op==='id').length,Y.w.document.activeElement&&Y.w.document.activeElement.id,/^Name the church first/.test(Y.txt('#gflinknote2'))], [0,'gfchurch',true]);
    Y.w.close();
    const Z=page('https://pastorshub.org/#gifts=QLvn7p0Tqzd5',{seed:'partial'}); await ready(Z); calls.length=0; Z.E('GF_LAST_SYNC={}; gfFirstQuietSync()'); await sleep(100);
    c('never a quiet sync on a member’s page', calls.filter(k=>k.op==='list').length, 0); Z.w.close(); }

  console.log('\n-- C. the ready announcements --');
  { const X=page('https://pastorshub.org/',{seed:'partial'}); await ready(X);
    const V=X.J(`CASE_VERSES.find(v=>v.id==='1pet4_10')`);
    const bad=[], L='https://pastorshub.org/#gifts=QLvn7p0Tqzd5';
    for(const kind of ['bulletin','text','whatsapp','pulpit']) for(const lang of ['en','es']) for(const back of [true,false]){
      const t=X.E(`gfAnnounce(${JSON.stringify(kind)},${JSON.stringify(lang)},{church:'Sampleton SDA',url:${JSON.stringify(L+(lang==='es'?'~es':''))},back:${back}})`);
      if(!t||!t.includes('Sampleton SDA')||!/\b15\b/.test(t)||(kind!=='pulpit'&&!t.includes(L))||(kind==='pulpit'&&t.includes(L))||AI.test(t)) bad.push([kind,lang,back]); }
    c('4 kinds × 2 languages × back or code: each names the church and the 15 minutes; the link (never in the pulpit’s); no "AI"', bad, []);
    const pe=X.E(`gfAnnounce('pulpit','en',{church:'Sampleton SDA'})`), ps=X.E(`gfAnnounce('pulpit','es',{church:'Sampleton SDA'})`);
    c('the pulpit quotes 1 Peter 4:10 from the verified table, word for word, with its reference', [pe.includes(`“${V.en.text}” (${V.en.ref})`),ps.includes(`«${V.es.text}» (${V.es.ref})`)], [true,true]);
    c('…and that text is Bible Gateway’s (KJV / RVA 1909)', [BG['1 Peter 4:10'].KJV.text===V.en.text,BG['1 Peter 4:10'].RVA.text===V.es.text], [true,true]);
    const es=['bulletin','text','whatsapp','pulpit'].flatMap(k=>[true,false].map(b=>X.E(`gfAnnounce('${k}','es',{church:'Sampleton SDA',url:'u',back:${b}})`))).join('\n');
    c('Spanish: usted throughout (no tú forms)', /\b(tú|tu|tus|puedes|tienes|haz)\b/i.test(es), false);
    X.E(`localStorage.setItem('terrain-reg',JSON.stringify({...JSON.parse(localStorage.getItem('terrain-reg')),role:'pastor',name:'Ana Ruiz'}))`);
    c('…with a pastor’s name: “al pastor Ana Ruiz”, never “a el”', [X.E(`gfAnnounce('whatsapp','es',{church:'X',url:'u',back:true})`).includes('le llegarán también al pastor Ana Ruiz'),/\ba el\b/.test(X.E(`gfAnnounce('whatsapp','es',{church:'X',url:'u',back:false})`))], [true,false]);
    c('…in English “Pastor Ana Ruiz”', X.E(`gfAnnounce('bulletin','en',{church:'X',url:'u'})`).includes('Then Pastor Ana Ruiz would love to talk with you'), true);
    c('a text message without a church name drops the lead-in', [X.E(`gfAnnounce('text','en',{church:'',url:'u'})`).startsWith('Every member is invited'),X.E(`gfAnnounce('text','es',{church:'My church',url:'u'})`).startsWith('Se invita a cada miembro')], [true,true]);
    c('gfInviteMsg is the WhatsApp announcement; plain text (markup passes through untouched)', [X.E(`gfInviteMsg('en','Sampleton SDA','u',true)===gfAnnounce('whatsapp','en',{church:'Sampleton SDA',url:'u',back:true})`),X.E(`gfInviteMsg('en','<b>St John</b>','u',true).includes('<b>St John</b>')`)], [true,true]);
    // the share panel: the four kinds, the language, the kind kept per church
    X.E(`openTool('gifts'); GF_VIEW='setup'; gfRender();`); X.q('#gflink2').click(); await until(()=>!X.q('#gfready').hidden,8000);
    c('the panel: “Ready-made announcements”, the four kinds (WhatsApp chosen), its help line', [X.txt('label[for="gfmsg"]'),X.qa('[data-mk]').map(b=>[b.textContent,b.getAttribute('aria-checked')]),X.txt('#gfmsghelp')],
      ['Ready-made announcements',[['Bulletin','false'],['Text message','false'],['WhatsApp','true'],['Pulpit','false']],'For WhatsApp: words between *stars* show in bold.']);
    X.q('[data-mk="bulletin"]').click();
    c('Bulletin: the message and the help line change', [X.q('#gfmsg').value.startsWith('Discover your spiritual gifts\nEvery member of Sampleton SDA (SAMPLE)'),X.txt('#gfmsghelp')], [true,'For the printed bulletin or the church screen. Print the QR code beside it (Download QR code, above).']);
    X.q('[data-ml="es"]').click();
    c('…Español: the Spanish bulletin', X.q('#gfmsg').value.startsWith('Descubra sus dones espirituales\nSe invita a cada miembro de Sampleton SDA (SAMPLE)'), true);
    c('the kind is kept for the church', X.J('uChurch().giftsFirst.kind'), 'bulletin');
    X.E('GF_VIEW="setup"; gfRender();'); X.q('#gflink2').click(); await until(()=>!X.q('#gfready').hidden,8000);
    c('…and chosen when the panel opens again', X.q('[data-mk].on').dataset.mk, 'bulletin');
    c('the row to present it on Sabbath', X.txt('[data-gf-sabbath]'), 'Present it on Sabbath: Discover your gifts (9 slides)');
    X.q('[data-gf-sabbath]').click();
    c('…opens the Sabbath presentation', [X.J('GF_VIEW'),X.txt('#gifts .gfhead h2')], ['sabbath','Discover your gifts · a Sabbath presentation']);
    X.w.close(); }

  console.log('\n-- D. the "Discover your gifts" deck --');
  { const X=page('https://pastorshub.org/',{seed:'partial'}); await ready(X);
    const PUB='QLvn7p0Tqzd5';
    const d=X.J(`gfdDeck('en',{pub:'${PUB}'})`), d8=X.J(`gfdDeck('en',{})`), des=X.J(`gfdDeck('es',{pub:'${PUB}'})`);
    c('nine slides: join, the plan, 1 Peter 4:10, why every member, how it works, what happens next, privacy, Take it now, the appeal', d.slides.map(s=>s.type+(s.gifts?'+gifts':'')),
      ['join','motion','verse','risks','trio','timeline','risks','join+gifts','close']);
    c('…eight without the church’s campaign (no Take it now)', d8.slides.length, 8);
    c('the whole church, its own ministry id and room key', [d.audience,d.ministry,d.gifts,X.E(`prRoomKey(gfdDeck('en',{pub:'${PUB}'}))`)], [{type:'congregation',group:'congregation'},{id:'gifts-first',name:'Discover your gifts'},{pub:PUB},'gifts-first|congregation|congregation|en']);
    c('the plan’s rows: what, how long (15 minutes), when (today, or this week: no date), why', d.slides[1].rows.slice(0,4), [['What','The Spiritual Gifts assessment'],['How long','About 15 minutes, on your phone'],['When','Today, or this week'],['Why','So each of us serves where God has gifted us']]);
    c('…in Spanish', des.slides[1].rows.slice(0,4), [['Qué','La evaluación de dones espirituales'],['Cuánto','Unos 15 minutos, en su teléfono'],['Cuándo','Hoy, o durante esta semana'],['Para qué','Para que cada uno sirva donde Dios le ha dado dones']]);
    c('“So far” only with the adults known and enough results to share (18 of 46: shown)', X.J(`gfdDeck('en',{}).slides[1].rows.slice(4)`), [['So far','18 of 46 adults']]);
    c('…not with fewer than five results', X.J(`gfdDeck('en',{R:{...gfReadiness(),shareOk:false}}).slides[1].rows.length`), 4);
    c('…not without the adults', X.J(`gfdDeck('en',{R:{...gfReadiness(),den:{d:null,kind:'none'}}}).slides[1].rows.length`), 4);
    c('the numbers of how it works are the assessment’s own (105 statements, 12 questions, 21 gifts)', d.slides[4].items.map(i=>i.value), [X.J('GF_TOTAL'),X.J('GF_HEART.length'),X.J('GIFTS.length')]);
    c('no slide says "answers" to "I’m in" (no yes slide)', d.slides.some(s=>s.type==='yes'), false);
    // every verse, from the verified tables, word for word
    const want={1:['case','1cor12_27'],3:['gf','1 Corinthians 12:18'],4:['quote','rom12_6'],5:['case','1pet5_2'],6:['case','prov11_13']};
    const vbad=[];
    for(const [dk,lang] of [[d,'en'],[des,'es']]){
      for(const [i,[t,id]] of Object.entries(want)){ const v=dk.slides[i].verse, want2=X.J(`gfdVerse('${t}:${id}','${lang}')`); if(!v||!want2||v.text!==want2.text||v.ref!==want2.ref) vbad.push([lang,i]); }
      const vv=dk.slides[2], t2=X.J(`CASE_VERSES.find(v=>v.id==='1pet4_10')`)[lang];
      if(vv.text!==t2.text||vv.ref!==t2.ref||vv.version!==(lang==='es'?'RVA':'KJV')) vbad.push([lang,'verse slide']);
      const q=dk.slides[8].quote, e=X.J(`CASE_EGW.find(v=>v.id==='mh148_4')`)[lang];
      if(!q||q.text!==e.text||q.ref!==e.ref) vbad.push([lang,'close']); }
    c('every verse and the Ellen White line come from their verified tables (by id or reference), EN and ES', vbad, []);
    c('1 Corinthians 12:18 is found by its reference, in both languages', [d.slides[3].verse.ref,des.slides[3].verse.ref], ['1 Corinthians 12:18 · KJV','1 Corintios 12:18 · RVA']);
    const kjv=[['1 Corinthians 12:27',d.slides[1].verse.text],['1 Peter 4:10',d.slides[2].text],['1 Corinthians 12:18',d.slides[3].verse.text],['1 Peter 5:2',d.slides[5].verse.text],['Proverbs 11:13',d.slides[6].verse.text]];
    const norm=s=>String(s).replace(/[…“”‘’,;:.!?()]/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
    c('…and the KJV words are Bible Gateway’s', kjv.filter(([r,t])=>!(BG[r]&&norm(BG[r].KJV.text).includes(norm(t)))).map(x=>x[0]), []);
    c('a key that is not in the tables gives nothing (never an invented verse)', [X.J(`gfdVerse('case:nope','en')`),X.J(`gfdVerse('gf:John 3:16','en')`),X.J(`gfdVerse('x','en')`)], [null,null,null]);
    c('no verse text is typed in the Sabbath deck’s own code', (()=>{ const i=html.indexOf('const GFD={'), j=html.indexOf('const GFD_MIN_WORD'); const src=html.slice(i,j); return ['hath','ye','thereof','manifold'].filter(w=>new RegExp('\\b'+w+'\\b').test(src)); })(), []);
    // names, markup, lengths
    const Xa=page('https://pastorshub.org/',{seed:'after'}); await ready(Xa);
    const da=Xa.J(`gfdDeck('en',{pub:'${PUB}'})`), js=JSON.stringify(da);
    c('the after church: “So far · 40 of 46 adults”, no member’s name anywhere', [da.slides[1].rows[4],NAMES.filter(n=>js.includes(n))], [['So far','40 of 46 adults'],[]]);
    const strs=[]; const walk=o=>{ if(typeof o==='string') strs.push(o); else if(o&&typeof o==='object') Object.values(o).forEach(walk); }; walk(da); walk(des);
    c('every string within 400 characters, no markup', strs.filter(s=>s.length>400||/<[A-Za-z!/?]/.test(s)), []);
    Xa.w.close();
    // present.mjs keeps it (the release with gifts: present-1.4)
    const op=await present(new Request('https://pastorshub.org/.netlify/functions/present',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'open',deck:d,mode:'follow'})}),{ip:'198.51.100.3',site:{url:'https://pastorshub.org'}});
    const oj=JSON.parse(await op.text()), stored=globalThis.__terrainPresentStore.peek('d/'+oj.room).deck;
    c('present.mjs takes it: slide 1 the room’s link and code, slide 8 the assessment (built there), no code', [op.status,stored.slides[0].qrUrl,stored.slides[7].qrUrl,stored.slides[7].code6,stored.gifts],
      [200,'https://pastorshub.org/#watch='+oj.room,'https://pastorshub.org/#gifts='+PUB,'',{pub:PUB}]);
    const ope=await present(new Request('https://pastorshub.org/.netlify/functions/present',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'open',deck:des,mode:'follow'})}),{ip:'198.51.100.3',site:{url:'https://pastorshub.org'}});
    const oje=JSON.parse(await ope.text());
    c('…in Spanish the assessment opens in Spanish (~es)', globalThis.__terrainPresentStore.peek('d/'+oje.room).deck.slides[7].qrUrl, 'https://pastorshub.org/#gifts='+PUB+'~es');
    c('prDeckOut with no case model returns it as it is', X.J(`JSON.stringify(prDeckOut(gfdDeck('en',{pub:'${PUB}'}),null,true,false).slides)===JSON.stringify(gfdDeck('en',{pub:'${PUB}'}).slides)`), true);
    const loc=X.J(`prDeckWithJoin(gfdDeck('en',{pub:'${PUB}'}),{url:'https://pastorshub.org/#watch=ROOM',code:'K7M2QX'}).slides.filter(s=>s.type==='join').map(s=>[s.qrUrl,s.code6])`);
    c('the presenter’s own screen (prDeckWithJoin): the gifts join gets the assessment link, the first join the room’s', loc, [['https://pastorshub.org/#watch=ROOM','K7M2QX'],['https://pastorshub.org/#gifts='+PUB,'']]);
    // the renderer: "Take it now"
    const r=X.J(`(()=>{ const out={}; for(const [mode,url] of [['follow','https://pastorshub.org/#gifts=${PUB}'],['follow','https://evil.example/#gifts=${PUB}'],['follow','https://pastorshub.org/#watch=AAAAAAAAAAAAAAAAAAAAAA'],['present','https://pastorshub.org/#gifts=${PUB}']]){
        const box=document.createElement('div'); document.body.appendChild(box);
        const ctl=tdeckRender({lang:'en',title:'Discover your gifts',church:'X',slides:[{type:'join',gifts:true,note:'Already following on your phone? Tap Begin there.',qrUrl:url,code6:''}]},box,{mode,contained:true,keys:false,qrGifts:null});
        const a=box.querySelector('a.td-begin'), nb=t=>t.replace(/\u00a0/g,' '); (out[mode+'|'+url]={k:nb(box.querySelector('.td-kick').textContent),scan:nb(box.querySelector('.td-scan').textContent),begin:a?[nb(a.textContent),a.getAttribute('href'),a.target,a.rel]:null,code:!!box.querySelector('.td-code')}); ctl.destroy(); box.remove(); } return out; })()`);
    c('on a phone: “Take it now”, “Tap Begin…”, and Begin (a link, a new tab) to this site’s own assessment',
      r['follow|https://pastorshub.org/#gifts='+PUB], {k:'Take it now',scan:'Tap Begin. These slides stay open for you.',begin:['Begin · about 15 minutes','https://pastorshub.org/#gifts='+PUB,'_blank','noopener'],code:false});
    c('…a link to another site, or to slides, gives no Begin', [r['follow|https://evil.example/#gifts='+PUB].begin,r['follow|https://pastorshub.org/#watch=AAAAAAAAAAAAAAAAAAAAAA'].begin], [null,null]);
    c('on the big screen: “Take it now”, “Point your phone’s camera here to begin”, no code to type', [r['present|https://pastorshub.org/#gifts='+PUB].k,r['present|https://pastorshub.org/#gifts='+PUB].scan,r['present|https://pastorshub.org/#gifts='+PUB].code], ['Take it now','Point your phone’s camera here to begin',false]);
    X.w.close(); }

  console.log('\n-- D. presenting it: the Sabbath view, locked phones, Begin at the end --');
  { const X=page('https://pastorshub.org/',{seed:'partial'}); await ready(X);
    X.E(`gfOpenSabbath()`);
    c('the Sabbath view: heading, the one line, the preview, Present live and Share link & QR', [X.txt('#gifts .gfhead h2'),X.txt('#gifts .gfhead .sub'),!!X.q('#gfd-pv .td-root'),X.qa('[data-gfd-present],[data-gfd-share]').map(b=>b.textContent)],
      ['Discover your gifts · a Sabbath presentation','Nine slides for the whole church. Members follow on their phones and take the assessment on the spot.',true,['Present live','Share link & QR']]);
    calls.length=0; X.q('[data-gfd-present]').click();
    await until(()=>X.q('#casepres [data-pr-start]'),8000);
    c('Present live: the church’s campaign is made first (op id), the setup is for the nine slides', [calls.filter(k=>k.op==='id').length,X.txt('#casepres .cp-note')], [1,'9 slides · The whole church']);
    X.q('[data-pr-start]').click(); await until(()=>X.J('PR_ST.view')==='present'&&X.q('#casepres .td-root'),8000); await sleep(300);
    c('presenting: follow (locked phones), no Decision button, no handout sent', [calls.find(k=>k.op==='open')&&X.J('PR_ST.P.r.mode'),!!X.q('[data-pr-decide]'),calls.filter(k=>k.op==='putpdf').length], ['follow',false,0]);
    const room=X.J('PR_ST.P.r');
    const M=page(`https://pastorshub.org/#watch=${room.room}`); await until(()=>M.q('#watchp .td-root'),8000);
    const n=X.J('PR_ST.P.out.slides.length');
    c('(a phone joins: nine slides)', M.J('WA.deck.slides.length'), n);
    X.q('#casepres .td-bend').click(); X.q('#casepres .td-bend').click(); await until(()=>X.q('.cp-endcard'),5000);
    c('the end card: no "Record what we decided" for this deck', !!X.q('.cp-endcard [data-pr-record]'), false);
    M.E('WA.checkedAt=0'); await M.E('watchCheck()'); await until(()=>M.q('#watchp .wa-bb'),5000);
    const bb=M.q('#watchp .wa-bb');
    c('the phone after the end: Begin · about 15 minutes (the assessment, a new tab), never a PDF', bb&&[bb.textContent,bb.getAttribute('href'),bb.getAttribute('target'),bb.hasAttribute('download')],
      ['Begin · about 15 minutes','https://pastorshub.org/#gifts='+X.J('uChurch().share.pub'),'_blank',false]);
    c('no page errors (pastor, phone)', [X.errs,M.errs], [[],[]]);
    M.w.close(); X.w.close(); }

  console.log('\n-- 39. Make the Case: the one-line reminder --');
  { const B=async(seed,lang)=>{ const X=page('https://pastorshub.org/',{seed,lang}); await ready(X);
      // (the seed church at the survey's address, so the survey opens on it)
      X.E(`DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().address=DATA.geo.matched; uPersist(); openTool('case'); render(); caseMount(true);`); await sleep(50); return X; };
    let X=await B('before');
    c('before: “Gifts first: 0 of 46 adults have discovered their gifts so far.” · Invite the whole church · Sabbath slides · ×', [X.q('#cs-gff').hidden,X.txt('#cs-gff p'),X.q('#cs-gff').nextElementSibling.id,X.q('[data-gff-hide]').getAttribute('aria-label')],
      [false,'Gifts first: 0 of 46 adults have discovered their gifts so far. Invite the whole church · Sabbath slides','cs-bar','Hide for two weeks']);
    X.q('[data-gff-hide]').click();
    c('× hides it for two weeks (kept for the church)', [X.q('#cs-gff').hidden,Math.round((X.J('uChurch().giftsFirst.hideUntil')-Date.now())/864e5)], [true,14]);
    X.E('caseMount()'); c('…still hidden when Make the Case is drawn again', X.q('#cs-gff').hidden, true);
    X.E('window.__n=Date.now; Date.now=()=>window.__n()+15*864e5; caseMount();'); c('…and back after two weeks', X.q('#cs-gff').hidden, false); X.E('Date.now=window.__n'); X.w.close();
    X=await B('partial','es');
    c('partial, in Spanish', X.txt('#cs-gff p'), 'Primero, los dones: 18 de 46 adultos han descubierto sus dones hasta ahora. Invitar a toda la iglesia · Diapositivas para el sábado'); X.w.close();
    X=await B('after');
    c('after (40 of 46, at half or more): no reminder', [X.q('#cs-gff').hidden,X.txt('#cs-gff')], [true,'']); X.w.close();
    X=await B('partial'); X.E(`(()=>{ const c=uChurch().capacity; delete c.adults; delete c.members; delete c.membership; uPersist(); CAP=null; caseMount(); })()`);
    c('unknown size: it asks for the attendance', X.txt('#cs-gff p'), 'Gifts first: 18 adults have discovered their gifts so far. Add your attendance in the church profile. Invite the whole church · Sabbath slides');
    c('it never blocks: every step and action is there', [!!X.q('#cs-s1'),!!X.q('#cs-s2'),!!X.q('#cs-s3')], [true,true,true]); X.w.close(); }

  console.log('\n-- 41. step 3: "Your church, ready to serve" --');
  { const X=page('https://pastorshub.org/',{seed:'after'}); await ready(X);
    X.E(`(()=>{ const d=document.createElement('details'); d.id='cs-ready'; d.className='cs-qs cs-ready'; d.hidden=true; document.body.appendChild(d); gfReadyPanelMount(d); })()`);
    const rows=X.qa('#cs-ready .gfr-row').map(r=>[r.querySelector('dt').textContent,r.querySelector('dd').textContent]);
    const R=X.J('gfReadiness()');
    c('the panel (folded): its title, and one row each: people, volunteers, leaders, gifts, strongest gifts', [X.q('#cs-ready').hidden,X.txt('#cs-ready summary'),rows.map(r=>r[0])],
      [false,'Your church, ready to serve',['People','Volunteers','Leaders','Gifts','Strongest gifts']]);
    c('…the numbers, from gfReadiness()', rows.map(r=>r[1]).slice(0,4), ['80 members · 55 in worship · 46 adults',`${R.profile.hands} with ${R.profile.hours} hours a month still free`,`${R.profile.leaders} free to lead`,'40 of 46 adults have discovered their gifts']);
    c('…the strongest gifts as counts, never names', [rows[4][1],rows[4][1]===R.strongest.map(g=>g.name+' '+g.n).join(' · '),NAMES.some(n=>X.txt('#cs-ready').includes(n))], [rows[4][1],true,false]);
    c('…and the quiet link to the Sabbath slides', X.txt('[data-gfr-sabbath]'), 'Discover your gifts · Sabbath slides');
    X.E(`uChurch().capacity.confirmed=false; uPersist(); CAP=null; gfReadyPanelMount(document.getElementById('cs-ready'))`);
    c('a profile not saved: the gifts row only, and “Save your church profile…”', [X.qa('#cs-ready .gfr-row dt').map(d=>d.textContent),/^Save your church profile to see the whole picture\./.test(X.txt('#cs-ready .note'))], [['Gifts'],true]);
    X.E(`localStorage.setItem('terrain-lang','es'); LANG='es'; uChurch().capacity.confirmed=true; uPersist(); CAP=null; gfReadyPanelMount(document.getElementById('cs-ready'))`);
    c('in Spanish', [X.txt('#cs-ready summary'),X.qa('#cs-ready .gfr-row dt').map(d=>d.textContent)], ['Su iglesia, lista para servir',['Personas','Voluntarios','Líderes','Dones','Dones más fuertes']]);
    X.w.close(); }

  console.log('\n-- 42. no "AI" anywhere a person reads, EN and ES --');
  { const texts=[];
    for(const lang of ['en','es']){ const X=page('https://pastorshub.org/',{seed:'partial',lang}); await ready(X);
      X.E('showHub()'); texts.push(X.txt('#hubgifts'));
      X.E(`DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().address=DATA.geo.matched; uPersist(); openTool('case'); render(); caseMount(true);`); texts.push(X.txt('#cs-gff'));
      X.E(`(()=>{ const d=document.createElement('details'); d.id='cs-ready'; document.body.appendChild(d); gfReadyPanelMount(d); })()`); texts.push(X.txt('#cs-ready'));
      X.E(`openTool('gifts'); GF_VIEW='setup'; gfRender();`); X.q('#gflink2').click(); await until(()=>!X.q('#gfready').hidden,8000);
      for(const k of ['bulletin','text','whatsapp','pulpit']){ X.q(`[data-mk="${k}"]`).click(); texts.push(X.q('#gfmsg').value, X.txt('#gfready')); }
      X.E('gfOpenSabbath()'); texts.push(X.txt('#gifts'), X.E(`JSON.stringify(gfdDeck('${lang}',{pub:'QLvn7p0Tqzd5'}))`));
      X.w.close(); }
    c('the card, the reminder, the panel, the four announcements, the share panel, the Sabbath view and deck', texts.filter(t=>AI.test(t||'')).map(t=>t.slice(0,80)), []); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
