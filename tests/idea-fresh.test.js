// "More ideas for {town}" beside the Idea Library (v10.40.0; never labelled AI since v10.41): after a search or inside a
// theme, a button asks advise.mjs (mode 'topic') for six fresh ideas on that topic for this
// neighborhood and church, in the library's shape and the page's language. Saved once per church
// and topic, as autoIdeas() does: a second tap while one is running asks nothing (the guard is set
// before any await), a reload shows the saved ones and asks nothing, a new tap asks for six that
// are not already on the screen, at most thirty per topic. Marked "New idea" (v10.41). Locked on
// this device: one line on how it is unlocked. No key on the server: no button. The advise
// function is stubbed here; tests/advise-topic.test.mjs checks the function itself.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
const TI=require('./topic-ideas.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,500));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor'};

function page(o){
  o=Object.assign({enabled:true,locked:false,delay:150,extra:[]},o||{});
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const posts=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      if(o.pass) w.localStorage.setItem('terrain-ai-pass',o.pass);
      if(o.store) w.localStorage.setItem('terrain-churches-v1',o.store);
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      w.fetch=async(u,opt)=>{ u=String(u);
        const m=/^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if(m){ const t=fs.readFileSync(path.join(ROOT,'ideas',m[1]+'.json'),'utf8'); return {ok:true,status:200,json:async()=>JSON.parse(t)}; }
        if(/functions\/advise/.test(u)){
          if(!opt||opt.method!=='POST') return {ok:true,status:200,json:async()=>({enabled:o.enabled,locked:o.locked,fn:'advise-2.2'})};
          const b=JSON.parse(opt.body); posts.push({b,h:opt.headers}); await sleep(o.delay);
          if(o.locked&&opt.headers['x-terrain-pass']!=='right') return {ok:false,status:401,json:async()=>({error:'This ministry planner is private to the pastor who set it up.',code:'locked'})};
          if(o.fail) return {ok:false,status:502,json:async()=>({error:'The AI service took too long.'})};
          const lang=b.lang==='es'?'es':'en';
          return {ok:true,status:200,json:async()=>({ideas:[...TI[lang],...o.extra].slice(0,b.count+o.extra.length),rejected:1,fn:'advise-2.2'})};
        }
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,o,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,posts,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
function setup(P,tool){ P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)}); uPersist(); openTool('${tool||'survey'}'); render(); ${tool==='case'?'caseMount(true);':''} })()`); }
const type=(P,sel,v)=>{ const e=P.q(sel); e.value=v; e.dispatchEvent(new P.w.Event('input',{bubbles:true})); };
const fresh=(P,host='#u-lib')=>P.qa(host+' .lib-card').filter(e=>e.querySelector('.u-ai'));

(async()=>{ try{
  console.log('-- the button: after a search, for this town --');
  const P=page(); await sleep(1300); setup(P,'survey');
  type(P,'#u-search','prayer'); await until(()=>P.q('#u-lib [data-lib-ai]'));
  // Updated v10.41 (the pastor: "I don't want AI to be seen anywhere, because people are scared of it sometimes"): the button no longer says (AI).
  c('"More ideas for Warminster" after the search', P.txt('#u-lib [data-lib-ai]'), 'More ideas for Warminster');
  c('…with one line saying what it does', /Six at a time.*checked by the library’s rules/.test(P.txt('#u-lib .lib-aibar .note')), true);
  c('nothing asked yet', P.posts.length, 0);

  console.log('\n-- a tap: six fresh ideas, saved with the church --');
  P.q('#u-lib [data-lib-ai]').click(); P.q('#u-lib [data-lib-ai]')&&P.q('#u-lib [data-lib-ai]').click();
  c('a second tap while it runs asks nothing (the guard is set before any await)', P.posts.length<=1, true);
  P.E(`libAiMore('survey')`);
  c('…and neither does a third, from code', await until(()=>P.posts.length===1,1000)&&P.posts.length, 1);
  c('the button says it is working', /Asking for six new ideas for Warminster/.test(P.txt('#u-lib .lib-ai')), true);
  await until(()=>fresh(P).length===6);
  // Updated v10.41 (the pastor: "I don't want AI to be seen anywhere, because people are scared of it sometimes"): marked "New idea".
  // v10.41 integration: the list has two sections now (the 57 themes put cross-listed in-reach ideas under "For God's
  // people"); prayer's new ideas are for the community, so they lead that section
  c('six fresh ideas at the top of their section, marked "New idea"', [fresh(P).length,P.qa('#u-lib .lib-sec[data-lib-sec="out"] .lib-card').slice(0,6).every(e=>e.querySelector('.u-ai')),P.txt('#u-lib .lib-card .u-ai')], [6,true,'New idea']);
  c('in the library\'s card: name, text, steps, facts', fresh(P).map(e=>e.querySelector('h4').textContent), TI.en.map(x=>x.en.n));
  const B=P.posts[0].b;
  c('the request: topic mode, the topic and theme, English, six', [B.mode,B.topic,B.theme,B.lang,B.count], ['topic','Prayer & intercession','prayer','en',6]);
  c('…this neighborhood and church (the survey and the capacity), and its census tags', [/LOCAL FIGURES/.test(B.summary),/CONFIRMED CHURCH CAPACITY/.test(B.summary),/TOWN: Warminster/.test(B.summary),B.tags.includes('poor')], [true,true,true,true]);
  c('…and the library\'s own ideas on the topic, not to be repeated', B.avoid.length>=50&&B.avoid.includes(P.E(`LIB.rows.find(r=>r.theme==='prayer').n`)), true);
  c('…with the device\'s passphrase header', 'x-terrain-pass' in P.posts[0].h, true);
  c('the message counts them, and those left out', /6 fresh ideas for Warminster, saved with the church \(1 did not pass the library’s checks/.test(P.txt('#u-lib .lib-aimsg')), true);
  const ch=P.J('uChurch()');
  c('saved once for this church and topic', [Object.keys(ch.fresh),ch.fresh['theme:prayer'].ideas.length,ch.fresh['theme:prayer'].asks], [['theme:prayer'],6,1]);
  c('each saved in the library\'s shape, with its own id', ch.fresh['theme:prayer'].ideas.every(x=>/^fresh-prayer-[0-9a-f]{10}$/.test(x.id)&&x.ai===true&&x.en&&x.en.how.length===4&&x.theme==='prayer'), true);
  c('the same filters apply to them (Fits the Sabbath)', await (async()=>{ P.q('#u-lib [data-lib-tog="sab"]').click(); await sleep(60); const n=fresh(P).length; P.q('#u-lib [data-lib-tog="sab"]').click(); await sleep(60); return n; })(), TI.en.filter(x=>x.sabbath).length);

  console.log('\n-- a fresh idea works like a library idea --');
  const f0=P.J(`uChurch().fresh['theme:prayer'].ideas.find(x=>x.en.n===${JSON.stringify(TI.en[0].en.n)})`);
  const x0=P.J(`(()=>{ const x=libToCatalog(uChurch().fresh['theme:prayer'].ideas.find(x=>x.id===${JSON.stringify(f0.id)})); return {lib:x.lib,ai:x.ai,people:uReq(x).people,why:libWhyText(x,DATA.M[SCOPE],libEnv().tags),ok:uCheck(x).ok}; })()`);
  c('checked against the church like everything else (uReq, uCheck), why here from the census', [x0.lib,x0.ai,x0.people,/\d/.test(x0.why)], [true,true,2,true]);
  const addBtn=P.q(`#u-lib [data-lib-id="${f0.id}"] [data-lib-add]`);
  c('"Add to our plan" is on when it fits', addBtn.disabled, !x0.ok);
  if(!addBtn.disabled){ addBtn.click(); await sleep(150); c('added: in the plan and in the catalogue', [P.J('uSelected()').includes(f0.id),P.E(`uCatalog().some(x=>x.id===${JSON.stringify(f0.id)}&&x.ai)`)], [true,true]); }
  P.q(`#u-lib [data-lib-id="${f0.id}"] [data-lib-case]`).click(); await sleep(250);
  P.E(`caseSetPrefs({type:'board',group:'board'}); caseDraw2(); caseDraw3();`); await sleep(300);
  c('"Make the case for this" builds its deck', [P.J('casePrefs()').ministry,P.J('caseCurrentDeck()').title], [f0.id,TI.en[0].en.n]);
  c('the survey\'s list marks it too', P.E(`uRow(uCatalog().find(x=>x.id===${JSON.stringify(f0.id)}))`).includes('New idea'), true);

  console.log('\n-- a reload: the saved ideas, nothing asked --');
  const store=P.w.localStorage.getItem('terrain-churches-v1');
  const Q=page({store}); await sleep(1300); setup(Q,'survey');
  type(Q,'#u-search','pray'); await until(()=>fresh(Q).length===6);
  c('"pray" is the same topic: the six saved ideas, and no request', [fresh(Q).length,Q.posts.length], [6,0]);
  Q.q('#u-lib [data-lib-ai]').click(); await until(()=>Q.posts.length===1&&fresh(Q).length>6);
  c('another tap asks for six more, telling it what is already there', [Q.posts.length,TI.en.every(x=>Q.posts[0].b.avoid.includes(x.en.n))], [1,true]);
  c('the same six again are not saved twice', Q.J(`uChurch().fresh['theme:prayer'].ideas.length`), 6);
  c('…and it says so, not that the service failed', /each one was already on the screen/.test(Q.txt('#u-lib .lib-aimsg')), true);

  Q.E('capClearAll()');
  c('"Clear all" (profile, plan and drafts) clears the saved library ideas and the fresh ones too', [Q.J('uChurch().lib'),Q.J('uChurch().fresh')], [{},{}]);

  console.log('\n-- in Make the Case, inside a theme --');
  { const R=page(); await sleep(1300); setup(R,'case');
    // v10.41: the themes open from step 2's "All themes" button, beside the search
    R.q('#cs-s2 [data-cs-browse]').click(); await until(()=>R.q('#cs-lib [data-lib-theme="hunger"]'));
    R.q('#cs-lib [data-lib-theme="hunger"]').click(); await until(()=>R.q('#cs-lib [data-lib-ai]'));
    c('inside a theme the button is there too', R.txt('#cs-lib [data-lib-ai]'), 'More ideas for Warminster');
    R.q('#cs-lib [data-lib-ai]').click(); await until(()=>fresh(R,'#cs-lib').length===6);
    c('the topic is the theme', [R.posts[0].b.theme,Object.keys(R.J('uChurch().fresh'))], ['hunger',['theme:hunger']]); }

  console.log('\n-- locked, off, failing --');
  { const L=page({locked:true}); await sleep(1300); setup(L,'survey');
    type(L,'#u-search','prayer'); await until(()=>L.q('#u-lib .lib-ai .note'));
    c('locked on this device: no button, one line on how it is unlocked', [!!L.q('#u-lib [data-lib-ai]'),L.txt('#u-lib .lib-ai')],
      [false,'More ideas are locked on this device. To unlock them, open this site once on this device with ?ideas= and your passphrase at the end of the address.']);   // v10.41: ?ideas= (?ai= still works), no "AI"
    c('…and nothing is asked', L.posts.length, 0); }
  { const L=page({locked:true,pass:'wrong'}); await sleep(1300); setup(L,'survey');
    type(L,'#u-search','prayer'); await until(()=>L.q('#u-lib [data-lib-ai]'));
    L.q('#u-lib [data-lib-ai]').click(); await until(()=>L.q('#u-lib .lib-aimsg.err'));
    c('a passphrase the server refuses: said plainly, nothing saved', [/was not accepted/.test(L.txt('#u-lib .lib-aimsg')),L.J('uChurch().fresh||null')], [true,null]); }
  { const L=page({enabled:false}); await sleep(1300); setup(L,'survey');
    type(L,'#u-search','prayer'); await until(()=>L.qa('#u-lib .lib-sec[data-lib-sec="out"] .lib-card').length===12); await sleep(80);   // v10.41: the community section
    c('no key on the server: no button at all (as elsewhere)', [!!L.q('#u-lib [data-lib-ai]'),L.txt('#u-lib .lib-ai')||''], [false,'']); }
  { const L=page({fail:true}); await sleep(1300); setup(L,'survey');
    type(L,'#u-search','prayer'); await until(()=>L.q('#u-lib [data-lib-ai]'));
    L.q('#u-lib [data-lib-ai]').click(); await until(()=>L.q('#u-lib .lib-aimsg.err'));
    // Updated v10.41 (the pastor: "I don't want AI to be seen anywhere, because people are scared of it sometimes"): the server's own words name the service, so the page says it in its own sentence.
    c('a failure: the page\'s sentence (never the server\'s) and the library untouched', [L.txt('#u-lib .lib-aimsg'),/took too long/.test(L.txt('#u-lib')),L.qa('#u-lib .lib-sec[data-lib-sec="out"] .lib-card').length], ['More ideas are not available just now. The library is unaffected.',false,12]); }
  { const bad=[{tier:9,k:'serve',en:{n:'x'}},{tier:1,k:'serve',ages:'all',where:'streets',need:['nonsense'],en:TI.en[0].en},'nope',null];
    const L=page({extra:bad}); await sleep(1300); setup(L,'survey');
    type(L,'#u-search','prayer'); await until(()=>L.q('#u-lib [data-lib-ai]'));
    L.q('#u-lib [data-lib-ai]').click(); await until(()=>fresh(L).length>0);
    c('shapes the page cannot use are dropped here too', fresh(L).length, 6); }
  { const store=JSON.parse(P.w.localStorage.getItem('terrain-churches-v1')); const ch=store.churches[store.active];
    ch.fresh={'theme:prayer':{topic:'Prayer',asks:5,ideas:Array.from({length:30},(_,i)=>({...TI.en[i%6],id:'fresh-prayer-'+String(i).padStart(10,'0'),theme:'prayer',ai:true,en:{...TI.en[i%6].en,n:TI.en[i%6].en.n+' '+i}}))}};
    const L=page({store:JSON.stringify(store)}); await sleep(1300); setup(L,'survey');
    type(L,'#u-search','prayer'); await until(()=>L.q('#u-lib .lib-ai .note'));
    c('thirty saved for a topic: no more asked, and it says why', [!!L.q('#u-lib [data-lib-ai]'),/30 fresh ideas are saved for this topic/.test(L.txt('#u-lib .lib-ai'))], [false,true]); }

  console.log('\n-- Spanish --');
  { const S=page({lang:'es'}); await sleep(1300); setup(S,'survey');
    type(S,'#u-search','oración'); await until(()=>S.q('#u-lib [data-lib-ai]'));
    // Updated v10.41 (the pastor: "I don't want AI to be seen anywhere"): no "(IA)" in Spanish either.
    c('the button in Spanish', S.txt('#u-lib [data-lib-ai]'), 'Más ideas para Warminster');
    S.q('#u-lib [data-lib-ai]').click(); await until(()=>fresh(S).length===6);
    c('asked in Spanish, written in Spanish, marked in Spanish', [S.posts[0].b.lang,fresh(S).map(e=>e.querySelector('h4').textContent),S.txt('#u-lib .lib-card .u-ai')], ['es',TI.es.map(x=>x.es.n),'Idea nueva']);
    c('the message in Spanish', /^6 ideas nuevas para Warminster, guardadas con la iglesia/.test(S.txt('#u-lib .lib-aimsg')), true);
    c('no errors', [P.errs,Q.errs,S.errs], [[],[],[]]); }
} catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
