// v10.59.0 — Terrain lives at terrain.church. The pastor (7 Oct 2026): "So I have terrain.church url option … I'm thinking of changing the
// name", "apps name and url to terrain.church", "i bought it". A browser keeps saved work under the address it was made at, so the first
// time a device opens pastorshub.org the page carries that work over to terrain.church (in the address after #tr-move=, never sent to a
// server) and goes on there with the same link; old links and printed QR codes keep working the same way.
// Covered: pastorshub.org (only once terrain.church shows Terrain's 3×2 picture; the work and the link carried; once, then only the link;
// #tr-again; nothing saved; terrain.church not ready, or a parking page; too much to carry), terrain.church (taken in before the app reads
// it; the link given back; what it already has kept, an empty value filled, a store of blank churches replaced, else churches added;
// only from pastorshub.org, else it asks; nothing but "terrain-" text keys; a broken address), the test runner left alone, the new name
// and address in the page, and the picture in the published site. Written failing-first on v10.58.0.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path'), zlib=require('zlib');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,600));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const b64=s=>Buffer.from(s,'utf8').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=s=>Buffer.from(s.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8');
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor',synced:true};
const CH=(id,o)=>Object.assign({id,name:'Church '+id,address:'',capacity:{},selected:[],overrides:{},members:[],linked:[],drafts:[],share:{}},o||{});
const STORE=(active,churches)=>JSON.stringify({active,churches:Object.fromEntries(churches.map(x=>[x.id,x]))});
const SAVED={'terrain-reg':JSON.stringify(REG),'terrain-lang':'es','terrain-churches-v1':STORE('a1',[CH('a1',{name:'Bucks County SDA',address:'118 Bristol Rd, Warminster, PA'}),CH('a2',{name:'Fairview Village SDA',address:'Fairview Village, PA'})]),
  'terrain-gifts-roster':JSON.stringify([{name:'Alex Rivera',code:'TG1-x'}]),'terrain-compare':'{"mine":"pennsylvania"}'};
/* o.url; o.store (localStorage before the page); o.image: 'ok' (3×2) | 'wrong' (another picture) | 'error' | 'none' (never answers);
   o.referrer; o.test (false: the runner's own default, no __trTest) */
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>{ if(!/navigation/i.test(e.message)) errs.push(e.message); });
  const dom=new JSDOM(html,{runScripts:'dangerously',url:o.url||'https://pastorshub.org/',referrer:o.referrer,pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(o.test!==false) w.__trTest=true;
      w.__went=[]; w.__imgs=[]; w.__reloads=0; w.__trGo=u=>w.__went.push(u); w.__trReload=()=>{ w.__reloads++; };
      for(const [k,v] of Object.entries(o.store||{})) w.localStorage.setItem(k,v);
      w.Image=class{ constructor(){ this.naturalWidth=0; this.naturalHeight=0; this.onload=null; this.onerror=null; }
        set src(v){ this._s=v; w.__imgs.push(v); const im=this;
          setTimeout(()=>{ if(o.image==='ok'){ im.naturalWidth=3; im.naturalHeight=2; im.onload&&im.onload(); }
            else if(o.image==='wrong'){ im.naturalWidth=300; im.naturalHeight=250; im.onload&&im.onload(); }
            else if(o.image==='error') im.onerror&&im.onerror(); },15); }
        get src(){ return this._s; } };
      w.fetch=async u=>{ u=String(u);
        if(/functions\/census\?check=1/.test(u)) return {ok:true,status:200,json:async()=>({required:false,ok:true,register:true,regRequired:true,regOk:true})};
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,D:w.document,errs,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),q:s=>w.document.querySelector(s),
    ls:k=>w.localStorage.getItem(k), cls:()=>w.document.documentElement.className};
}
const payloadOf=u=>{ const m=/#tr-move=([A-Za-z0-9_-]+)/.exec(u||''); return m?JSON.parse(unb64(m[1])):null; };

(async()=>{ try{
  console.log('\n-- pastorshub.org: carry the work over, once terrain.church shows it is Terrain --');
  { const P=page({url:'https://pastorshub.org/?x=1#gifts=QLvn7p0Tqzd5~es',store:{...SAVED,'other-app':'keep me here'},image:'ok'});
    c('the page waits unseen while it looks', /\btr-wait\b/.test(P.cls()));
    c('…for terrain.church\'s own picture', /^https:\/\/terrain\.church\/tr-here\.png\?\d+$/.test(P.J('__imgs')[0]||''));
    await until(()=>P.J('__went').length);
    const u=P.J('__went')[0], d=payloadOf(u);
    c('then it goes to terrain.church, same path and question', u.startsWith('https://terrain.church/?x=1#tr-move='));
    c('…with the link it was opened with after it', /&then=%23gifts%3DQLvn7p0Tqzd5~es$/.test(u));
    c('…carrying every "terrain-" key, as it was, and nothing else', d&&[d.v,Object.keys(d.d).sort(),d.d['terrain-churches-v1']===SAVED['terrain-churches-v1']], [1,Object.keys(SAVED).sort(),true]);
    c('…once: pastorshub.org notes it moved, and keeps its own copy', [!!P.ls('terrain-moved'), P.ls('terrain-reg')===SAVED['terrain-reg']], [true,true]);
  }
  { const P=page({url:'https://pastorshub.org/#connect=HK7QM4RTZP',store:{...SAVED,'terrain-moved':'2026-10-08T12:00:00Z'},image:'ok'});
    await until(()=>P.J('__went').length);
    c('moved before: only the link goes (a neighbour\'s card, a member\'s link…)', P.J('__went'), ['https://terrain.church/#connect=HK7QM4RTZP']);
  }
  { const P=page({url:'https://pastorshub.org/?ideas=open-sesame',image:'ok'});
    await until(()=>P.J('__went').length); const d=payloadOf(P.J('__went')[0]);
    c('a device unlocked with ?ideas= on the way: the page keeps the pass (and drops it from the address), and the pass goes over', [P.J('__went')[0].startsWith('https://terrain.church/#tr-move='), !!(d&&d.d['terrain-ai-pass'])], [true,true]);
  }
  { const P=page({url:'https://pastorshub.org/#tr-again',store:{...SAVED,'terrain-moved':'2026-10-08T12:00:00Z'},image:'ok'});
    await until(()=>P.J('__went').length); const u=P.J('__went')[0];
    c('#tr-again sends the work once more (and no link after it)', [!!payloadOf(u), /&then=/.test(u), Object.keys(payloadOf(u).d).includes('terrain-moved')], [true,false,false]);
  }
  { const P=page({url:'https://pastorshub.org/#watch=AAAA',image:'ok'});
    await until(()=>P.J('__went').length);
    c('nothing saved on this device: just the link', P.J('__went'), ['https://terrain.church/#watch=AAAA']);
  }
  { const P=page({store:SAVED,image:'error'});
    await until(()=>!/tr-wait/.test(P.cls())); await sleep(200);
    c('terrain.church not answering: the page stays, shown, and works as before', [P.J('__went').length, /tr-wait/.test(P.cls()), !!P.ls('terrain-moved'), P.E('typeof openTool')], [0,false,false,'function']);
  }
  { const P=page({store:SAVED,image:'wrong'});
    await until(()=>!/tr-wait/.test(P.cls())); await sleep(100);
    c('another site\'s picture there (a parking page): the page stays', [P.J('__went').length, !!P.ls('terrain-moved')], [0,false]);
  }
  { const P=page({store:SAVED,image:'none'});
    await sleep(5300);
    c('no answer in 5 seconds: the page shows and stays', [P.J('__went').length, /tr-wait/.test(P.cls())], [0,false]);
  }
  { const P=page({store:{...SAVED,'terrain-big':'x'.repeat(1500000)},image:'ok'});
    await until(()=>P.q('#tr-big')); await sleep(50);
    c('too much to carry in an address: stays, says so (in his language), and is not marked moved', [P.J('__went').length, /demasiado trabajo para llevarlo solo/.test(P.q('#tr-big')&&P.q('#tr-big').textContent||''), !!P.ls('terrain-moved')], [0,true,false]);
  }
  { const P=page({store:SAVED,image:'ok',test:false});
    await sleep(300);
    c('the test runner\'s other suites: nothing happens (no __trTest)', [P.J('__went').length, P.J('__imgs').length, /tr-wait/.test(P.cls())], [0,0,false]);
  }

  console.log('\n-- terrain.church: take the work in before the app reads it --');
  const P0=b64(JSON.stringify({v:1,at:'2026-10-08T12:00:00Z',d:SAVED}));
  { const P=page({url:'https://terrain.church/#tr-move='+P0+'&then='+encodeURIComponent('#gifts=QLvn7p0Tqzd5~es'),referrer:'https://pastorshub.org/'});
    c('the address is given back its link at once (before the app routes it)', P.E('location.hash'), '#gifts=QLvn7p0Tqzd5~es');
    c('every key taken in', Object.keys(SAVED).map(k=>P.ls(k)===SAVED[k]), Object.keys(SAVED).map(()=>true));
    c('…and noted', !!P.ls('terrain-moved-in'));
    c('…before the app read it: a member\'s link opens (the registration was there in time)', P.E("typeof GIFTS_LINK==='object'&&!!GIFTS_LINK.on||/gifts/.test(location.hash)"), true);
  }
  { const P=page({url:'https://terrain.church/#tr-move='+P0,referrer:'https://pastorshub.org/'});
    await until(()=>P.E('typeof ACCESS_CHECKED!=="undefined"&&ACCESS_CHECKED')); await sleep(100);
    c('no link after it: an empty hash, and the pastor\'s main menu (registered, his churches)', [P.E('location.hash'), P.E('!!regGet()&&regGet().name'), P.J('Object.keys(uStore().churches).sort()'), P.E('uStore().active')], ['','Joshua Mura',['a1','a2'],'a1']);
  }
  { const P=page({url:'https://terrain.church/#tr-move='+P0,referrer:'https://pastorshub.org/',store:{'terrain-lang':'en','terrain-gifts-roster':'[]','terrain-churches-v1':STORE('z9',[CH('z9')])}});
    c('a key terrain.church already has is kept; an empty one is filled', [P.ls('terrain-lang'), P.ls('terrain-gifts-roster')===SAVED['terrain-gifts-roster']], ['en',true]);
    c('a church store of blank churches only (a first look at terrain.church) is replaced', [Object.keys(JSON.parse(P.ls('terrain-churches-v1')).churches).sort(), JSON.parse(P.ls('terrain-churches-v1')).active], [['a1','a2'],'a1']);
  }
  { const P=page({url:'https://terrain.church/#tr-move='+P0,referrer:'https://pastorshub.org/',store:{'terrain-churches-v1':STORE('z9',[CH('z9',{name:'New Hope',address:'1 Main St'})])}});
    const s=JSON.parse(P.ls('terrain-churches-v1'));
    c('a store with real work: the churches it lacks are added; the open one stays', [Object.keys(s.churches).sort(), s.active, s.churches.z9.name], [['a1','a2','z9'],'z9','New Hope']);
  }
  { const bad=b64(JSON.stringify({v:1,d:{'terrain-reg':JSON.stringify(REG),'evil-key':'x','terrain-num':42,'terrain-obj':{a:1},'__proto__':'x'}}));
    const P=page({url:'https://terrain.church/#tr-move='+bad,referrer:'https://pastorshub.org/'});
    c('only "terrain-" keys with text values', [P.ls('terrain-reg')!==null, P.ls('evil-key'), P.ls('terrain-num'), P.ls('terrain-obj')], [true,null,null,null]);
  }
  { const P=page({url:'https://terrain.church/#tr-move='+P0+'&then='+encodeURIComponent('#gifts=X')});
    c('from anywhere but pastorshub.org: nothing taken in yet', [P.ls('terrain-reg'), P.E('location.hash')], [null,'#gifts=X']);
    await until(()=>P.q('#tr-ask'));
    c('…it asks first', /Bring this device’s saved Terrain work over from pastorshub\.org\?/.test(P.q('#tr-ask').textContent));
    P.q('#tr-ask button').click();
    c('…"Bring it": taken in, and the page reloads', [P.ls('terrain-reg')===SAVED['terrain-reg'], P.E('__reloads'), !!P.q('#tr-ask')], [true,1,false]);
  }
  { const P=page({url:'https://terrain.church/#tr-move='+P0,referrer:'https://evil.example/'});
    await until(()=>P.q('#tr-ask')); P.q('#tr-ask button:last-child').click();
    c('…"No, thank you": nothing taken in', [P.ls('terrain-reg'), P.E('__reloads'), !!P.q('#tr-ask')], [null,0,false]);
  }
  { const P=page({url:'https://terrain.church/#tr-move=@@@notbase64&then=javascript:alert(1)',referrer:'https://pastorshub.org/'});
    c('a broken address: nothing taken in, no error, the hash cleared', [P.ls('terrain-reg'), P.E('location.hash'), P.errs], [null,'',[]]);
  }

  console.log('\n-- the name and the address in the page --');
  { const P=page({url:'https://terrain.church/',store:{'terrain-reg':JSON.stringify(REG)}}); await until(()=>P.E('typeof VERSION==="string"'));
    c('the six stamps agree', [P.q('meta[name="terrain-version"]').content, P.q('html').dataset.version, P.q('#ver').textContent], [P.E('VERSION'),P.E('VERSION'),P.E('VERSION')]);
    c('the button at the top: Main menu (not "Pastors Hub")', P.q('#brandlink').textContent, 'Main menu');
    c('the main menu\'s small heading and the foot say terrain.church', [P.q('.hubk').textContent, /TERRAIN · terrain\.church ·/.test(P.q('footer').textContent)], ['terrain.church',true]);
    c('new connection cards carry terrain.church', P.E('CN_SITE'), 'https://terrain.church');
    const shown=(()=>{ const b=P.D.body.cloneNode(true); b.querySelectorAll('script,style').forEach(e=>e.remove()); return b.textContent; })();
    c('nothing the page shows says "Pastors Hub" or pastorshub.org', [/Pastors Hub/.test(shown), /pastorshub\.org/.test(shown)], [false,false]);
  }
  { const P=page({url:'https://terrain.church/',store:{'terrain-reg':JSON.stringify(REG),'terrain-lang':'es'}}); await until(()=>P.E('typeof VERSION==="string"')); await sleep(300);
    c('…in Spanish: Menú principal', P.q('#brandlink').textContent, 'Menú principal');
  }

  console.log('\n-- the picture in the published site --');
  { const png=fs.readFileSync(path.join(ROOT,'tr-here.png'));
    c('tr-here.png is a PNG of 3 × 2', [png.slice(1,4).toString(), png.readUInt32BE(16), png.readUInt32BE(20)], ['PNG',3,2]);
    c('netlify.toml copies it into the site', /command\s*=\s*"[^"\n]*\bcp tr-here\.png site\//.test(fs.readFileSync(path.join(ROOT,'netlify.toml'),'utf8')));
  }
}catch(e){ console.log('  FAIL  crashed: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ')); fail++; }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0); })();
