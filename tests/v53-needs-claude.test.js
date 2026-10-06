// v10.53.0 — the Community Survey's needs list made by Claude (DESIGN-NEEDS.md, v68). The pastor (6 Oct 2026): "it should actually do
// that for the first list because I want the best list ever … I really want Claude to generate the best list based on the community
// survey and wherever else … drawing from the Internet too … We need to do our best", and "Generate new community needs … it can
// validate certain things that other churches have done … how to meet the needs or plant the seed". Agreed: the survey's own list at
// once, Claude's list replacing it; every figure checked; sources linked; kept per neighborhood; never "AI". The server's own checks
// are in needs-function.test.mjs; this suite is the page. Written failing-first on v10.52.0.
const {sleep,until,checker,page,ready,survey}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const PASSV='open-sesame-needs';
const ADDR="D.geo={...D.geo,matched:'118 Bristol Rd, Warminster, PA, 18974'}";
// the server's answer, as advise-needs.mjs keeps it (already checked there; the page checks the numbers again)
const LIST=[
  {id:'snap',title:'Hunger close to home',cat:'Hardship & work',why:'Around the church 16.8% of households receive SNAP, against 6.2% in the county.',figures:[{key:'snap',place:'tract'}],
   plant:'A monthly grocery table where neighbors choose what they need.',
   local:[{text:'The county food bank added a Saturday pantry in Warminster this fall.',url:'https://www.buckscounty.gov/news/food',host:'buckscounty.gov'}],
   churches:[{text:'A church in Ohio runs a free grocery table every month with its neighbors.',url:'https://www.example-sda.org/table',host:'example-sda.org'},
     {text:'A link that is not https never shows.',url:'http://insecure.example.org/x',host:'insecure.example.org'}],themes:[]},
  {id:'lang-primary',title:'A welcome in Spanish',cat:'Language & newcomers',why:'About 1,063 people around the church speak Spanish at home.',figures:[{key:'limEng',place:'tract'}],plant:null,local:[],churches:[],themes:[]},
  {id:'new',title:'Rides to the doctor',cat:'Hardship & work',why:'Around the church 13.5% of households have no vehicle, against 4.9% in the county.',figures:[{key:'noCar',place:'tract'}],plant:'Pair drivers with neighbors who need a ride to an appointment.',local:[],churches:[],themes:['transport','seniors']},
  {id:'kids',title:'A neighborhood of children',cat:'Families with children',why:'Around the church 38.6% of residents are children.',figures:[{key:'kidsShare',place:'tract'}],plant:null,local:[],churches:[],themes:[]},
  {id:'new',title:'A need with a made-up number',cat:'Hardship & work',why:'Around the church 61.3% of adults work nights.',figures:[{key:'pop',place:'tract'}],plant:null,local:[],churches:[],themes:['jobs-money']},
  {id:'seniors-alone',title:'Seniors on their own',cat:'Seniors & isolation',why:'9.4% of households are a senior living alone.',figures:[{key:'seniorsAlone',place:'tract'}],plant:null,local:[],churches:[],themes:[]},
  {id:'poverty',title:'Families stretched thin',cat:'Hardship & work',why:'19.4% of people live below the poverty line, against 7.1% in the county.',figures:[{key:'poverty',place:'tract'}],plant:null,local:[],churches:[],themes:[]}];
function fake(P,plan){
  const orig=P.w.fetch; P.calls=[];
  P.w.fetch=async(u,o)=>{ u=String(u);
    if(/\/\.netlify\/functions\/advise$/.test(u)){
      if(!o||!o.method||o.method==='GET') return {ok:true,status:200,json:async()=>plan.info};
      const b=JSON.parse(o.body); P.calls.push({body:b,headers:o.headers||{}});
      const r=b.mode==='needs'?plan.needs(b):plan.status(b);
      return {ok:r.status<300,status:r.status,json:async()=>r.json}; }
    return orig(u,o); };
}
const open=async(P,id)=>{ await until(()=>P.q(`#u-needs [data-need="${id}"] .ns-head`)); const h=P.q(`#u-needs [data-need="${id}"] .ns-head`); if(h.getAttribute('aria-expanded')!=='true') h.click(); await sleep(30); };

(async()=>{ await T.sec(async()=>{
  console.log('\n-- a device that is not unlocked: the survey\'s own list, nothing asked --');
  { const P=page({needs:'file'}); await ready(P);
    fake(P,{info:{enabled:true,needs:true},needs:()=>({status:500,json:{}}),status:()=>({status:500,json:{}})});
    survey(P,{mod:ADDR}); await sleep(150);
    c('no request for the list; no status line; the survey\'s own first need', [P.calls.length,!!P.q('#ns-aistat'),P.q('#u-needs .ns-need').dataset.need], [0,false,'lang-primary']);
    P.w.close(); }

  console.log('\n-- unlocked: the request carries place names and figures only --');
  const P=page({needs:'file',store:{'terrain-ai-pass':PASSV}}); await ready(P);
  let jobs=0, polls=0, hold=true;
  fake(P,{info:{enabled:true,needs:true},
    needs:b=>{ jobs++; return {status:202,json:{ok:true,job:'J'.repeat(22),key:'K'.repeat(43),poll:4000}}; },
    status:b=>{ polls++; return hold?{status:200,json:{ok:true,status:'running'}}:{status:200,json:{ok:true,status:'done',made:'2026-10-06',needs:LIST}}; }});
  P.E('NS_AI.poll=25');
  survey(P,{mod:ADDR});
  await until(()=>P.calls.length>=1,3000);
  const B=P.calls[0].body, H=P.calls[0].headers;
  c('one request, mode needs, the device unlocked (its pass sent), not fresh', [P.calls.length,B.mode,H['x-terrain-pass'],B.fresh,/^[A-Za-z0-9_-]{22}$/.test(B.device)], [1,'needs',PASSV,false,true]);
  c('the place: the tract, the town, the county, the state', B.place, {tract:'Census Tract 2041.02',town:'Warminster Township',county:'Bucks County',state:'PA'});
  c('the figures: the report\'s own, around the church, the town and the county', [B.figs.length>=20,B.figs.find(f=>f.k==='snap'),B.figs.every(f=>['n','p','$','d1','d2'].includes(f.unit))],
    [true,{k:'snap',label:'Households receiving SNAP',unit:'p',t:16.8,w:P.J('DATA.M.cousub.snap'),c:6.2},true]);
  c('the survey\'s own list as the starting point (ids, categories, titles, evidence), every category listed, the library\'s themes', [B.cands.length,B.cands[0].id,B.cands.every(x=>B.cats.includes(x.cat)),B.themes.length>=50,B.themes.includes('transport')], [25,'lang-primary',true,true,true]);
  const raw=JSON.stringify(B);
  c('…never the church\'s name, its street address, the pastor or his email', ['Bucks County SDA','118 Bristol Rd','Joshua Mura','jm@example.org'].map(w=>raw.includes(w)), [false,false,false,false]);
  c('while it works: one line under the heading, the town named, no "AI"', [P.txt('#ns-aistat'),/\bAI\b/.test(P.txt('#ns-aistat'))], ['Studying Warminster’s needs and what churches have done… about a minute.',false]);
  c('…the survey\'s own list meanwhile', P.q('#u-needs .ns-need').dataset.need, 'lang-primary');

  console.log('\n-- done: Claude\'s list replaces it, checked again here --');
  hold=false; await until(()=>P.J('NS_AI.status')==='done',4000); await sleep(40);
  const order=P.qa('#u-needs .ns-list > .ns-need').slice(0,6).map(a=>a.dataset.need);
  c('its order, the new need numbered in it; the need with a made-up number left out', [order,P.qa('#u-needs .ns-need h3').slice(0,6).map(h=>h.textContent)],
    [['snap','lang-primary','ai-3','kids','seniors-alone','poverty'],['Hunger close to home','A welcome in Spanish','Rides to the doctor','A neighborhood of children','Seniors on their own','Families stretched thin']]);
  c('a why whose number is not the survey\'s keeps the survey\'s own line ("38.6%" is not a Census figure here)', P.txt('#u-needs [data-need="kids"] .ns-ev'), '27% of residents are under 18 — about 1,490 children.');
  c('a figure written to many decimals is not shown (the page checks it too)', P.J(`nsAiNumsOk('13.499999999% have no car',nsAiPool(nsAiInput()))`), false);
  c('…the others read as Claude wrote them', P.txt('#u-needs [data-need="snap"] .ns-ev'), 'Around the church 16.8% of households receive SNAP, against 6.2% in the county.');
  c('"Also here" keeps what the list left out (the survey\'s also, less what it took)', P.qa('#u-needs .ns-alsorow').map(a=>a.dataset.need), ['seniors-nocar']);
  c('the line: when, and Generate new community needs', [P.txt('#ns-aistat .ns-aiwhen'),P.txt('#ns-aistat [data-ns-aigen]')], ['Studied 6 Oct 2026','Generate new community needs']);
  await open(P,'snap');
  const S=P.q('#u-needs [data-need="snap"]');
  c('opened: Plant the seed', S.querySelector('.ns-plant')&&S.querySelector('.ns-plant').textContent.replace(/\s+/g,' ').trim(), 'Plant the seed A monthly grocery table where neighbors choose what they need.');
  const heads=[...S.querySelectorAll('.ns-aih')].map(h=>h.textContent);
  c('…"In Warminster" and "What other churches have done"', heads, ['In Warminster','What other churches have done']);
  const links=[...S.querySelectorAll('.ns-ailist a')].map(a=>[a.textContent,a.getAttribute('href'),a.target,a.rel]);
  c('…each line with its source, the site\'s name as the link, https only, opened apart', links,
    [['buckscounty.gov','https://www.buckscounty.gov/news/food','_blank','noopener noreferrer'],['example-sda.org','https://www.example-sda.org/table','_blank','noopener noreferrer']]);
  c('…then the survey\'s own help and steps, as before', [!!S.querySelector('.ns-help'),!!S.querySelector('.ns-detail h5')], [true,true]);
  await open(P,'ai-3');
  const NW=P.q('#u-needs [data-need="ai-3"]');
  c('a new need: its category\'s colour, its figure as a ring, its plant line', [NW.dataset.cat,NW.getAttribute('style'),NW.querySelectorAll('.ns-figs .stat').length,!!NW.querySelector('.ns-plant')], ['Hardship & work','--k:var(--m-hardship)',1,true]);
  NW.querySelector('[data-ns-show]').click();
  await until(()=>NW.querySelector('.ns-ideas .ns-row'),4000);
  const ideaThemes=P.J(`[...document.querySelectorAll('#ns-i-ai-3 .ns-row')].map(r=>(LIB.byId.get(r.dataset.idea)||{}).theme)`);
  c('…its ideas from the library\'s themes it names', [ideaThemes.length>=3,ideaThemes.every(t=>['transport','seniors'].includes(t))], [true,true]);
  c('the list is kept with the church, by place and language', P.J(`(()=>{ const k=Object.keys(uChurch().needsList||{}); return [k.length,/\\|en$/.test(k[0]),uChurch().needsList[k[0]].made]; })()`), [1,true,'2026-10-06']);
  c('nothing on screen says "AI"', /\bAI\b|\bIA\b/.test(P.txt('#u-needs')), false);

  console.log('\n-- drawn again: the kept list at once, nothing asked --');
  const n0=P.calls.length;
  P.E('render()'); await sleep(80);
  c('the same list, no new request', [P.q('#u-needs .ns-need').dataset.need,P.calls.length], ['snap',n0]);

  console.log('\n-- Generate new community needs --');
  hold=true; P.q('#ns-aistat [data-ns-aigen]').click(); await until(()=>P.calls.length>n0,2000);
  c('a fresh study', P.calls[n0].body.fresh, true);
  c('…the line says it is working, the list stays meanwhile', [/^Studying/.test(P.txt('#ns-aistat')),P.q('#u-needs .ns-need').dataset.need], [true,'snap']);
  hold=false; await until(()=>P.J('NS_AI.status')==='done',4000);
  P.w.close();

  console.log('\n-- a study that fails, and a kept list from the server --');
  { const F=page({needs:'file',store:{'terrain-ai-pass':PASSV}}); await ready(F);
    fake(F,{info:{enabled:true,needs:true},needs:()=>({status:202,json:{ok:true,job:'J'.repeat(22),key:'K'.repeat(43),poll:4000}}),status:()=>({status:200,json:{ok:true,status:'failed',code:'no-result'}})});
    F.E('NS_AI.poll=25'); survey(F,{mod:ADDR});
    await until(()=>F.J('NS_AI.status')==='failed',4000); await sleep(30);
    c('failed: the survey\'s own list stays, one quiet line and the button', [F.q('#u-needs .ns-need').dataset.need,F.txt('#ns-aistat .ns-aiwhen'),!!F.q('#ns-aistat [data-ns-aigen]')], ['lang-primary','The list could not be updated just now.',true]);
    F.w.close(); }
  { const K=page({needs:'file',store:{'terrain-ai-pass':PASSV}}); await ready(K);
    fake(K,{info:{enabled:true,needs:true},needs:()=>({status:200,json:{ok:true,cached:true,made:'2026-09-30',needs:LIST}}),status:()=>({status:500,json:{}})});
    survey(K,{mod:ADDR});
    await until(()=>K.J('NS_AI.status')==='done',4000); await sleep(30);
    c('the server\'s kept list for this place: shown at once, no study', [K.q('#u-needs .ns-need').dataset.need,K.calls.filter(x=>x.body.mode==='needs-status').length,K.txt('#ns-aistat .ns-aiwhen')], ['snap',0,'Studied 30 Sep 2026']);
    K.w.close(); }

  console.log('\n-- in Spanish --');
  { const E=page({needs:'file',lang:'es',store:{'terrain-ai-pass':PASSV}}); await ready(E);
    fake(E,{info:{enabled:true,needs:true},needs:()=>({status:202,json:{ok:true,job:'J'.repeat(22),key:'K'.repeat(43),poll:4000}}),status:()=>({status:200,json:{ok:true,status:'running'}})});
    E.E('NS_AI.poll=25'); survey(E,{mod:ADDR});
    await until(()=>E.calls.length>=1,3000); await sleep(30);
    c('the request in Spanish; the line in Spanish', [E.calls[0].body.lang,E.txt('#ns-aistat')], ['es','Estudiando las necesidades de Warminster y lo que han hecho otras iglesias… cerca de un minuto.']);
    E.w.close(); }
}); T.done(); })();
