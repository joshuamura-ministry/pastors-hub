// The Idea Library in the app (v10.40.0). The pastor: "There aren't enough ministry ideas… I put
// Prayer and only three came up… if I say Prayer there should be 50 different things for prayer a
// church can do… feeding the homeless, so many amazing, unique and new ideas."
// Checked here, against the shipped ideas/ files and the fixture survey (a high-need tract, the
// medium church): nothing loads until the pastor searches or browses (members' #gifts= and
// #watch= links never fetch it); search finds every idea of a theme by name or synonym, EN and ES,
// accents and filler words aside, and the built-ins with it; ranking by the neighborhood, then the
// church, then size, with the sizes and kinds taking turns; pages of 12; the filters; the theme
// tiles; each card (the four steps, "why here" only from real figures, the children's line); "Add
// to our plan" under the capacity check; "Make the case for this" (the deck, Spanish names, the
// handout, the risk table); offline and missing files; the session cache; Spanish.
// jsdom does no layout: equal heights and wrapping are checked in Chrome.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
const jspdf=require('jspdf');
const IDX=JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','index.json'),'utf8'));
const THEME=id=>JSON.parse(fs.readFileSync(path.join(ROOT,'ideas',id+'.json'),'utf8'));
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,500));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor'};
jspdf.jsPDF.API.save=function(){ return this; };

function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const net=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/'+(o.hash||''),pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.jspdf=jspdf;
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      if(o.session) Object.entries(o.session).forEach(([k,v])=>w.sessionStorage.setItem(k,v));
      w.fetch=async(u)=>{ u=String(u); net.push(u);
        const m=/^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if(m){
          if(o.offline) throw new TypeError('Failed to fetch');
          if(o.noThemes&&m[1]!=='index'&&m[1]!=='words') return {ok:false,status:404,json:async()=>null};
          const f=path.join(ROOT,'ideas',m[1]+'.json'); if(!fs.existsSync(f)) return {ok:false,status:404,json:async()=>null};
          const t=fs.readFileSync(f,'utf8'); return {ok:true,status:200,json:async()=>JSON.parse(t)}; }
        if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false})};
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,D:w.document,o,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,net,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; },
    ideasFetched:()=>net.filter(u=>/\/ideas\//.test(u))};
}
function setup(P,tool,cap){
  P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null;
    capSave(${JSON.stringify(cap===undefined?FX.MEDIUM:cap)}); uPersist(); openTool('${tool||'survey'}'); render(); ${tool==='case'?'caseMount(true);':''} })()`);
}
const type=(P,sel,v)=>{ const e=P.q(sel); e.value=v; e.dispatchEvent(new P.w.Event('input',{bubbles:true})); };
const choose=(P,sel,v)=>{ const e=P.q(sel); e.value=v; e.dispatchEvent(new P.w.Event('change',{bubbles:true})); };
const cards=(P,host='#u-lib')=>P.qa(host+' .lib-card');
// what the index says a theme search must return: the theme's own ideas, then those cross-listed to it
const TI=Object.fromEntries(IDX.themes.map((t,i)=>[t.id,i]));
const col=k=>IDX.cols.indexOf(k);
const homeOf=id=>IDX.ideas.filter(r=>r[col('t')]===TI[id]).length;
const crossOf=id=>IDX.ideas.filter(r=>r[col('t')]!==TI[id]&&r[col('also')].includes(TI[id])).length;
const expectOf=ids=>{ const T=new Set(ids.map(i=>TI[i])); return IDX.ideas.filter(r=>T.has(r[col('t')])||r[col('also')].some(a=>T.has(a))).length; };

(async()=>{ try{
  console.log('-- nothing of the library loads until the pastor searches or browses --');
  for(const hash of ['#gifts=AbCdEfGh23','#watch=K7M2QX','']){
    const P=page({hash}); await sleep(1300);
    c(`${hash||'the hub'}: no idea file fetched`, P.ideasFetched(), []);
    if(!hash){
      setup(P,'survey'); await sleep(200);
      c('the survey\'s ministries: an "Idea library" invitation, still nothing fetched', [!!P.q('#u-lib .lib-invite [data-lib-browse]'),!!P.q('#u-ministry-list [data-lib-open]'),P.ideasFetched()], [true,true,[]]);
      c('no boot errors', P.errs, []);
    }
  }

  console.log('\n-- search finds everything (SCHEMA.md "Search") --');
  const P=page(); await sleep(1300); setup(P,'survey');
  await P.E('libLoadIndex()'); await sleep(20);
  const S=q=>P.J(`(()=>{ const s=libSearch(${JSON.stringify(q)}); return s&&{mode:s.mode,themes:s.themes,n:s.rows.length,need:s.needWords,home:s.rows.filter(r=>s.themes.includes(r.theme)).length,
    homeFirst:s.rows.findIndex(r=>!s.themes.includes(r.theme))===-1||s.rows.slice(s.rows.findIndex(r=>!s.themes.includes(r.theme))).every(r=>!s.themes.includes(r.theme))}; })()`);
  for(const q of ['prayer','Prayer ministry','pray','praying','PRAYER  ministries','oración','oracion','Oración','ministerio de oración','ideas para la oración','prayer walking']){
    const s=S(q);
    c(`"${q}" → every prayer idea (${homeOf('prayer')}) and every one cross-listed to prayer (${crossOf('prayer')})`, [s.themes,s.n,s.home>=50,s.homeFirst], [['prayer'],expectOf(['prayer']),true,true]);
  }
  for(const [q,th] of [['homeless',['homeless']],['homelessness ministry',['homeless']],['comida',['hunger']],['food pantry',['hunger']],['kids',['children']],['niños',['children']],['veterans',['veterans']],['grief',['grief']]]){
    const s=S(q); c(`"${q}" → ${th} (${expectOf(th)}), 50+ of its own`, [s.themes,s.n,s.home>=50], [th,expectOf(th),true]);
  }
  { const s=S('feeding the homeless'); c('"feeding the homeless" → feeding the hungry and homelessness together', [s.mode,s.themes.sort(),s.n], ['words',['homeless','hunger'],expectOf(['hunger','homeless'])]); }
  { const s=S('comida para personas sin hogar'); c('"comida para personas sin hogar" → the same two themes, in Spanish', [s.themes.sort(),s.n], [['homeless','hunger'],expectOf(['hunger','homeless'])]); }
  { const s=S('garden'); c('a word that is no theme needs the description words first', [s.mode,s.need], ['text',true]);
    await P.E('libLoadWords()'); const s2=S('garden');
    const ok=P.E(`libSearch('garden').rows.every(r=>(' '+r.fn+' '+LIB.words[r.i]+' ').includes(' garden'))`);
    c('…then every idea whose name or description says it', [s2.mode,s2.n>10,ok], ['text',true,true]); }
  c('nonsense: nothing, and no error', S('xyzzy qwv').n, 0);
  c('the index is fetched once', P.ideasFetched().filter(u=>u==='/ideas/index.json').length, 1);

  console.log('\n-- the survey\'s ministries: search, rank, pages, filters --');
  type(P,'#u-search','prayer');
  c('typing "prayer" shows twelve library ideas under the built-ins', await until(()=>cards(P).length===12), true);
  const N=expectOf(['prayer']);
  c('the heading counts them all', P.txt('#u-lib .lib-head h3'), `${N} ideas from the library for “prayer”`);
  c('the built-ins that are about prayer are there too', P.qa('#u-cards .u-rowname').map(e=>e.textContent).filter(t=>/pray/i.test(t)).length>=2, true);
  c('only the prayer theme\'s file was fetched for the first page', P.ideasFetched().filter(u=>!/index|words/.test(u)), ['/ideas/prayer.json']);
  const shown=()=>cards(P).map(e=>e.dataset.libId);
  const R=P.J(`(()=>{ const S=libSearch('prayer'); return libRank(S.rows,S).map(o=>({id:o.r.id,score:o.score,cross:o.cross,tier:o.r.tier,k:o.r.k,nh:o.nh,ok:o.ok,base:o.base})); })()`);
  c('the cards are the ranking\'s first twelve, in order', shown(), R.slice(0,12).map(o=>o.id));
  c('the theme\'s own ideas first, then the cross-listed', R.findIndex(o=>o.cross)>=homeOf('prayer')&&R.slice(homeOf('prayer')).every(o=>o.cross), true);
  c('in each, never a lower score above a higher one', R.every((o,i)=>i===0||o.cross!==R[i-1].cross||o.score<=R[i-1].score), true);
  const tags=P.J('[...profile(DATA.M[SCOPE],DATA.M.county,trendOf(DATA.M,SCOPE))]');
  const byId=Object.fromEntries(IDX.ideas.map(r=>[r[0],r]));
  c('score = 2·need + boost + {1:2,2:1,3:0}[size] + 10 when the church can take it on (uCheck)', R.every(o=>{ const r=byId[o.id];
    const nh=r[col('need')].filter(t=>tags.includes(t)).length, bh=r[col('boost')].filter(t=>tags.includes(t)).length;
    return o.score===2*nh+bh+({1:2,2:1,3:0})[r[col('tier')]]+(o.ok?10:0); }), true);
  c('uCheck decides "fits": the same answer as the capacity check itself', P.E(`(()=>{ const S=libSearch('prayer'); return libRank(S.rows,S).slice(0,40).every(o=>o.ok===uCheck(libLite(o.r)).ok); })()`), true);
  // v10.40 final: a library idea no longer needs a census figure to fit (the pastor must be able to add a prayer
  // idea he likes), so every prayer idea can fit this well-staffed fixture church; the capacity check is still real,
  // shown on a theme with costly programmes (the homeless theme's tiny home, rent bridge…).
  c('some fit this church (the prayer ideas)', R.some(o=>o.ok), true);
  c('an idea with no figure behind it here can still fit and be added', R.some(o=>o.nh===0&&o.ok), true);
  c('some do not fit (the check is real: costly homeless-theme programmes)', P.E(`(()=>{ const S=libSearch('homeless'); const X=libRank(S.rows,S); return X.some(o=>o.ok)&&X.some(o=>!o.ok); })()`), true);
  { const top=R.slice(0,12); c('a page is not twelve of one kind or one size', [new Set(top.map(o=>o.k)).size>=2,new Set(top.map(o=>o.tier)).size>=2], [true,true]); }
  P.q('#u-lib [data-lib-more]').click(); await until(()=>cards(P).length===24);
  c('"Show 12 more" adds twelve', shown(), R.slice(0,24).map(o=>o.id));
  choose(P,'#u-lib select[data-lib-f="size"]','1'); await until(()=>cards(P).length===12);
  c('size "This week": every card is a size-1 idea and says so', cards(P).every(e=>byId[e.dataset.libId][col('tier')]===1&&e.querySelector('.lib-facts li').textContent==='This week'), true);
  choose(P,'#u-lib select[data-lib-f="kind"]','invite'); await sleep(60);
  c('kind "Invite" as well: only invite ideas', cards(P).length>0&&cards(P).every(e=>byId[e.dataset.libId][col('k')]==='invite'&&/invite/i.test(e.querySelector('.lib-kind').textContent)), true);
  choose(P,'#u-lib select[data-lib-f="size"]',''); choose(P,'#u-lib select[data-lib-f="kind"]',''); await sleep(60);
  P.q('#u-lib [data-lib-tog="sab"]').click(); await until(()=>P.q('#u-lib [data-lib-tog="sab"]').getAttribute('aria-pressed')==='true'&&cards(P).length>0);
  c('"Fits the Sabbath": every card fits it, and says so', cards(P).every(e=>byId[e.dataset.libId][col('sab')]===1&&e.querySelector('.lib-facts .sab')), true);
  P.q('#u-lib [data-lib-tog="sab"]').click(); await sleep(40); P.q('#u-lib [data-lib-tog="online"]').click(); await until(()=>cards(P).length>0);
  c('"Online or social media": every card has a digital part', cards(P).every(e=>byId[e.dataset.libId][col('dig')]===1||byId[e.dataset.libId][col('where')]==='online'), true);
  choose(P,'#u-lib select[data-lib-f="ages"]','children'); await sleep(80);
  const kidsCards=cards(P);
  c('ages "Children" (and online): children\'s ideas only', kidsCards.every(e=>byId[e.dataset.libId][col('ages')]==='children'), true);
  P.q('#u-lib [data-lib-tog="online"]').click(); await sleep(60);
  choose(P,'#u-lib select[data-lib-f="ages"]',''); await sleep(60);

  console.log('\n-- one card --');
  await until(()=>cards(P).length===12);
  const card=cards(P)[0], raw=THEME('prayer').ideas.find(x=>x.id===card.dataset.libId);
  c('name, the 2–3 sentence description, from the library', [card.querySelector('h4').textContent,card.querySelector('.lib-d').textContent], [raw.en.n,raw.en.d]);
  c('size · people · cost · where · Sabbath', card.querySelectorAll('.lib-facts li').length, 5);
  c('the four steps, folded until opened', [card.querySelector('details.lib-how').open,[...card.querySelectorAll('.lib-how li')].map(e=>e.textContent)], [false,raw.en.how]);
  c('two actions: Add to our plan · Make the case for this', [...card.querySelectorAll('.lib-acts button')].map(b=>b.textContent), ['Add to our plan','Make the case for this']);
  const whyOk=P.E(`(()=>{ const env=libEnv(); return [...document.querySelectorAll('#u-lib .lib-card')].every(e=>{ const x=libToCatalog(libFull(e.dataset.libId)), w=e.querySelector('.lib-why');
    const fired=x.need.some(t=>env.tags.has(t)); return w?(fired&&/\\d/.test(w.textContent)&&w.textContent.endsWith(libWhyText(x,env.m,env.tags))):!libWhyText(x,env.m,env.tags); }); })()`);
  c('"Why here" only when a need tag fired, always with a figure', whyOk, true);
  c('…the survey\'s own words for that need (poverty: the report\'s sentence)', P.E(`(()=>{ const x=libToCatalog({...libFull(${JSON.stringify(raw.id)}),need:['poor']}); const h=suggestions(DATA.M,SCOPE).hits.find(h=>h.id==='poverty'); return !!h&&libWhyText(x,DATA.M[SCOPE],libEnv().tags)===h.evidence; })()`), true);
  c('…and nothing at all when no need tag fires here (never invented)', P.E(`(()=>{ const env=libEnv(); const off=LIB.rows.find(r=>r.need.every(t=>!env.tags.has(t))); if(!off) return 'none'; return libWhyText(libLite(off),env.m,env.tags); })()`), '');
  { const kid=IDX.ideas.find(r=>r[col('min')]===1&&IDX.themes[r[col('t')]].id==='children');
    type(P,'#u-search','children'); await until(()=>cards(P).length===12&&P.txt('#u-lib .lib-head h3').includes('children'));
    const has=P.E(`(()=>{ const r=LIB.byId.get(${JSON.stringify(kid[0])}); return new Promise(res=>libLoadTheme(r.theme).then(()=>{ const x=libToCatalog(libFull(r.id)); res(libCardHTML('survey',libFull(r.id),x,libEnv(),null)); })); })()`);
    const h=await has;
    c('an idea with children keeps the safeguarding line in view', /lib-kids/.test(h)&&/screened adults/.test(h), true);
    c('…on every children\'s card on the page', cards(P).filter(e=>byId[e.dataset.libId][col('min')]===1).every(e=>e.querySelector('.lib-kids')), true); }

  console.log('\n-- "Add to our plan": joins the plan like a built-in --');
  type(P,'#u-search','prayer'); await until(()=>cards(P).length===12&&/prayer/.test(P.txt('#u-lib .lib-head h3')));
  const addable=cards(P).find(e=>!e.querySelector('[data-lib-add]').disabled), blocked=P.E(`(()=>{ const S=libSearch('prayer'); return libRank(S.rows,S).filter(o=>!o.ok).length; })()`);
  c('a card that fits can be added; one that does not stays off (as built-ins)', [!!addable,cards(P).filter(e=>e.querySelector('[data-lib-add]').disabled).every(e=>!/Fits what/.test(e.querySelector('.lib-fit').textContent))], [true,true]);
  const aid=addable.dataset.libId, before=P.J('uUsage()'), req=P.J(`uReq(libToCatalog(libFull(${JSON.stringify(aid)})))`);
  addable.querySelector('[data-lib-add]').click(); await sleep(150);
  const store=JSON.parse(P.w.localStorage.getItem('terrain-churches-v1')), ch=store.churches[store.active];
  c('saved with the church: selected, and its record kept (works offline and after library updates)', [ch.selected.includes(aid),ch.lib[aid]&&ch.lib[aid].en.n], [true,THEME('prayer').ideas.find(x=>x.id===aid).en.n]);
  c('in the catalogue as a library idea on the "creative extras" shelf', P.J(`(()=>{ const x=uCatalog().find(x=>x.id===${JSON.stringify(aid)}); return x&&[x.lib,x.tier,x.size>0,x.requirements.reviewed]; })()`), [true,2,true,true]);
  c('the plan reserves its people, hours and money', P.J('uUsage()').people-before.people, req.people);
  c('it is listed in "Your selected plan"', P.txt('.u-portfolio').includes(THEME('prayer').ideas.find(x=>x.id===aid).en.n), true);
  c('its card now offers to remove it', P.q(`#u-lib [data-lib-id="${aid}"] [data-lib-add]`).textContent, 'Remove from our plan');
  c('uReq follows the library\'s numbers (SCHEMA.md mapping)', P.J(`(()=>{ const L=libFull(${JSON.stringify(aid)}), r=uReq(libToCatalog(L)); return [r.people===L.ppl, r.leaders===L.leaders, r.startup===L.cost, r.monthly===L.costMo]; })()`), [true,true,true,true]);
  P.q(`#u-lib [data-lib-id="${aid}"] [data-lib-add]`).click(); await sleep(120);
  c('…and remove it again', P.J('uSelected()').includes(aid), false);

  console.log('\n-- the catalogue item (libToCatalog) --');
  c('a built-in\'s id or a reserved prefix is refused', P.J(`[libToCatalog({...libFull(${JSON.stringify(aid)}),id:'food-pantry'}),libToCatalog({...libFull(${JSON.stringify(aid)}),id:'draft-x1'})]`), [null,null]);
  c('kind, stage, weight and lift from the size', P.J(`(()=>{ const x=libToCatalog({...libFull(${JSON.stringify(aid)}),id:'t-one',tier:3,k:'invite'}); return [x.k,x.st,x.w,x.load,x.size,x.tier]; })()`), ['Invite','deeper',6,2,3,2]);
  c('the library\'s Spanish joins the dictionary (the plan and the list say it in Spanish)', P.J(`(()=>{ const L=libFull(${JSON.stringify(aid)}); libToCatalog(L); return [ES[L.en.n]===L.es.n, ES[L.en.how[0]]===L.es.how[0]]; })()`), [true,true]);
  c('a prayer flyer is not "food" work in Make the Case (its theme, not its words)', P.E(`caseBridgeOf(libToCatalog(libFull('prayer-tear-off-flyers')||libFull(${JSON.stringify(aid)}))).kind`), 'general');

  console.log('\n-- "Make the case for this" --');
  const cid=cards(P)[1].dataset.libId, craw=THEME('prayer').ideas.find(x=>x.id===cid);
  cards(P)[1].querySelector('[data-lib-case]').click(); await sleep(300);
  c('Make the Case opens with the idea chosen, step 2 next', [P.E('TOOL'),P.J('casePrefs()').ministry,P.q('#cs-s2')&&!P.q('#cs-s2').hidden], ['case',cid,true]);
  P.E(`caseSetPrefs({type:'board',group:'board'}); caseDraw2(); caseDraw3();`); await sleep(400);
  const deck=P.J('caseCurrentDeck()');
  c('the board deck is built for it: nine slides with the place', deck&&deck.slides.map(s=>s.type), ['join','motion','stat','place','capacity','ability','ask','risks','timeline']);
  c('its name is the deck\'s title (the join slide)', deck.title, craw.en.n);
  const m=P.J(`caseModel(${JSON.stringify(cid)},{type:'board',group:'board'})`);
  c('the model: the library idea\'s name, needs from its census tags', [m.ok,m.ministry.name===craw.en.n,m.ministry.needs.length>0,m.ministry.draft], [true,true,true,false]);
  const F=P.J(`(()=>{ const d=casePdfDoc(caseHandout(caseModel(${JSON.stringify(cid)},{type:'board',group:'board'}),null,{}),{jsPDF:window.jspdf.jsPDF,compress:false}); const raw=d.output(); return [raw.startsWith('%PDF-'),d.getNumberOfPages(),/undefined|NaN/.test(d.__caseLog.map(l=>l.t).join(' ')),d.__caseLog.map(l=>l.t).join(' ').toLowerCase().includes(${JSON.stringify(craw.en.n.split(' ').slice(0,3).join(' ').toLowerCase())})]; })()`);   // ("a Spanish…" inside a sentence)
  c('the handout is built for it (two pages, its name, no undefined)', F, [true,2,false,true]);
  { const kid=IDX.ideas.find(r=>r[col('min')]===1&&r[col('ages')]==='children');
    const kinds=await P.E(`(()=>{ const r=LIB.byId.get(${JSON.stringify(kid[0])}); return libLoadTheme(r.theme).then(()=>{ libSave(libFull(r.id)); const m=caseModel(r.id,{type:'board',group:'board'}); return JSON.stringify(m.risks); }); })()`);
    c('an idea with children brings the children\'s risk table (screening, two adults)', /"children"/.test(kinds), true); }

  console.log('\n-- Make the Case step 1: the same library --');
  P.E(`CASE_ST.pick=true; caseDraw1();`); await sleep(50);
  c('an invitation under the ranked ministries', !!P.q('#cs-lib .lib-invite'), true);
  type(P,'#cs-q','oración'); await until(()=>cards(P,'#cs-lib').length===12);
  c('"oración" in the English page: every prayer idea', P.txt('#cs-lib .lib-head h3'), `${N} ideas from the library for “oración”`);
  c('…and the built-in prayer ministries by their names', P.qa('#cs-grid .cs-min b').map(e=>e.textContent).filter(t=>/pray/i.test(t)).length>=2, true);
  c('here the first action is "Make the case for this"', cards(P,'#cs-lib')[0].querySelector('.lib-acts button').textContent, 'Make the case for this');
  const pid=cards(P,'#cs-lib')[2].dataset.libId;
  cards(P,'#cs-lib')[2].querySelector('[data-lib-case]').click(); await sleep(200);
  c('choosing one closes the picker and shows it chosen', [P.J('casePrefs()').ministry,!P.q('#cs-lib'),P.txt('#cs-s1 .cs-min .cs-mh b')], [pid,true,THEME('prayer').ideas.find(x=>x.id===pid).en.n]);

  console.log('\n-- browse: the themes as tiles --');
  P.E(`CASE_ST.pick=true; CASE_ST.q=''; caseDraw1();`); await sleep(40);
  P.q('#cs-lib [data-lib-browse]').click(); await until(()=>P.qa('#cs-lib .lib-tile').length>0);
  const tiles=P.qa('#cs-lib .lib-tile');
  c('one tile per theme with ideas', tiles.length, IDX.themes.filter(t=>t.n>0).length);
  c('each says how many ideas it opens ("Prayer & intercession · N ideas")', tiles.every(t=>{ const id=t.dataset.libTheme; return t.querySelector('span').textContent===`${expectOf([id])} ideas`&&t.querySelector('b').textContent===IDX.themes[TI[id]].en; }), true);
  c('each tile coloured by its kind of figure', tiles.every(t=>/--k:var\(--m-(hardship|housing|children|people|language)\)/.test(t.getAttribute('style'))), true);
  P.q('#cs-lib [data-lib-theme="hunger"]').click(); await until(()=>cards(P,'#cs-lib').length===12);
  c('a theme opens its ideas, ranked', P.txt('#cs-lib .lib-head h3'), `Feeding the hungry · ${expectOf(['hunger'])} ideas`);
  P.q('#cs-lib [data-lib-alltheme]').click(); await until(()=>P.qa('#cs-lib .lib-tile').length>0);
  c('"All themes" goes back to the tiles', P.qa('#cs-lib .lib-tile').length, tiles.length);
  P.q('#cs-lib [data-lib-close]').click(); await sleep(30);
  c('"Close the library" leaves the invitation', !!P.q('#cs-lib .lib-invite'), true);
  c('no errors on this page', P.errs, []);

  console.log('\n-- offline, a missing file, the session cache --');
  { const Q=page({offline:true}); await sleep(1300); setup(Q,'survey');
    type(Q,'#u-search','prayer'); await until(()=>Q.q('#u-lib .lib-fail'));
    c('offline: one plain sentence and "Try again", never a blank', [Q.txt('#u-lib .lib-fail p'),!!Q.q('#u-lib [data-lib-retry]')], ['The idea library could not be opened just now. The ministries built into Terrain are still here.',true]);
    c('…the built-in list is untouched', Q.qa('#u-cards .u-row').length>0, true);
    Q.o.offline=false; Q.q('#u-lib [data-lib-retry]').click(); await until(()=>cards(Q).length===12);
    c('back online, "Try again" shows the ideas', cards(Q).length, 12); }
  { const Q=page({noThemes:true}); await sleep(1300); setup(Q,'survey');
    type(Q,'#u-search','prayer'); await until(()=>Q.q('#u-lib .lib-fail'));
    c('a theme file that does not come: the heading, then one sentence and "Try again"', [!!Q.q('#u-lib .lib-head h3'),Q.txt('#u-lib .lib-fail p')], [true,'These ideas could not be loaded just now (the connection may have dropped).']); }
  { const kept=P.w.sessionStorage.getItem('terrain-lib-idx');
    c('the index is kept for the session', !!kept&&JSON.parse(kept).hash===IDX.hash, true);
    const Q=page({session:{'terrain-lib-idx':kept}}); await sleep(1300); setup(Q,'survey');
    type(Q,'#u-search','prayer'); await until(()=>cards(Q).length===12);
    c('a reload in the same session searches without fetching the index again', Q.ideasFetched(), ['/ideas/prayer.json']); }
  { const old=JSON.parse(P.w.sessionStorage.getItem('terrain-lib-idx')); old.hash='000000000000';
    const Q=page({session:{'terrain-lib-idx':JSON.stringify(old)}}); await sleep(1300); setup(Q,'survey');
    type(Q,'#u-search','prayer'); await until(()=>cards(Q).length===12);
    c('an index kept from an earlier deploy is replaced once the files disagree', [Q.E('LIB.idx.hash'),Q.ideasFetched().filter(u=>u==='/ideas/index.json').length,cards(Q).length], [IDX.hash,1,12]); }

  console.log('\n-- Spanish --');
  { const Q=page({lang:'es'}); await sleep(1300); setup(Q,'survey');
    c('the invitation in Spanish', Q.txt('#u-lib .lib-invite button'), 'Biblioteca de ideas');
    type(Q,'#u-search','oración'); await until(()=>cards(Q).length===12);
    c('the heading in Spanish', Q.txt('#u-lib .lib-head h3'), `${N} ideas de la biblioteca para «oración»`);
    const k=cards(Q)[0], r2=THEME('prayer').ideas.find(x=>x.id===k.dataset.libId);
    c('the card in the library\'s Spanish: name, description, steps', [k.querySelector('h4').textContent,k.querySelector('.lib-d').textContent,[...k.querySelectorAll('.lib-how li')].map(e=>e.textContent)], [r2.es.n,r2.es.d,r2.es.how]);
    c('labels in Spanish', [...k.querySelectorAll('.lib-acts button')].map(b=>b.textContent), ['Añadir a nuestro plan','Presentar el caso de esta idea']);
    c('"why here" in Spanish, from the Spanish rules', !k.querySelector('.lib-why')||/^Por qué aquí:/.test(k.querySelector('.lib-why').textContent), true);
    c('capacity gaps said in Spanish', cards(Q).map(e=>e.querySelector('.lib-fit')).filter(Boolean).every(f=>!/needed|remain|Confirm /.test(f.textContent)), true);
    k.querySelector('[data-lib-case]').click(); await sleep(250);
    Q.E(`caseSetPrefs({type:'board',group:'board'}); caseDraw2(); caseDraw3();`); await sleep(400);
    c('a Spanish deck says the library\'s Spanish name (caseMinName)', [Q.E(`caseMinName(uCatalog().find(x=>x.id===${JSON.stringify(r2.id)}))`),Q.J('caseCurrentDeck()').title], [r2.es.n,r2.es.n]);
    c('no errors in Spanish', Q.errs, []); }
} catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
