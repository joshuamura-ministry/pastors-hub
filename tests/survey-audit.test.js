// v10.36.0 — the Community Survey audit. Each block is one finding that was
// fixed; the test fails if the fault comes back.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const FX=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures.json'),'utf8'));
let pass=0,fail=0;
const c=(n,g,w=true)=>{const ok=JSON.stringify(g)===JSON.stringify(w);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('        got :',JSON.stringify(g));fail++}else pass++};
const boot=(lang)=>{
  const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){w.fetch=()=>new Promise(()=>{});w.scrollTo=()=>{};w.scrollBy=()=>{};
      if(lang) w.localStorage.setItem('terrain-lang',lang);}});
  return {w:dom.window,errs};
};
// The fixture predates the new figures; give it plausible ones, and a tract
// with no ten-year data, which is what the live site actually fetches.
const data=()=>{ const D=JSON.parse(JSON.stringify(FX.DATA));
  Object.assign(D.M.tract,{seniors:620,employed:2610,veterans:9.1,grandKids:5.2,collegeShare:3.8,k12Share:17.5,homeowners:52,past:null});
  Object.assign(D.M.cousub,{seniors:6400,employed:21000,pop:32000,veterans:7,grandKids:2,collegeShare:5,k12Share:15});
  D.M.cousub.past.pop=29000;   // +10% in ten years
  D.M.cousub.foreign=21;       // up six points on 15.1
  Object.assign(D.M.county,{seniors:120000,employed:330000,veterans:6.5,grandKids:1.8,collegeShare:5.5,k12Share:15.5});
  return D; };

const {w,errs}=boot();
setTimeout(()=>{
  c('no boot errors', errs.length, 0);

  console.log('\n-- Census figures --');
  const names=Object.values(w.eval('COUNTRIES'));
  c('origins list has no regional totals', ['Caribbean','Central America','South America'].filter(n=>names.includes(n)), []);
  c('Fiji, Marshall Islands, Micronesia added', ['Fiji','Marshall Islands','Micronesia'].every(n=>names.includes(n)));
  const sup=w.eval('metrics({NAME:"x",B01003_001E:"1000",B17001_001E:"-666666666"},null,null)');
  c('a sum of suppressed cells is null, not 0%', [sup.k12,sup.seniors,sup.singleParent], [null,null,null]);
  const raw={NAME:'x',B01003_001E:'1000',B09001_001E:'250',B25003_001E:'400',B25003_003E:'100',C24010_001E:'480',
    B01001_020E:'10',B01001_044E:'15',B21001_001E:'700',B21001_002E:'70',B10002_002E:'10'};
  const m=w.eval('metrics('+JSON.stringify(raw)+',null,null)');
  c('seniors 65+ computed from B01001', m.seniors, 25);
  c('veterans share of adults', m.veterans, 10);
  c('grandparent-raised share of children', m.grandKids, 4);
  c('homeowners = 100 − renters', m.homeowners, 75);
  c('employed count for the occupation donut', m.employed, 480);

  console.log('\n-- tags and needs --');
  const D=data(); w.eval('DATA='+JSON.stringify(D)+';SCOPE="tract";');
  const SG=w.eval('suggestions(DATA.M,"tract")');
  const ids=SG.hits.map(h=>h.id);
  c('ten-year needs fire at neighborhood scope (from the town)', ['shift-race','growth','foreign-shift'].every(i=>ids.includes(i)));
  c('…and say where the trend was measured', /across Warminster/.test(SG.hits.find(h=>h.id==='shift-race').evidence));
  c('a tract with a town trend is not called "settled" by default', SG.tags.has? !SG.tags.has('settled') : !SG.tags.includes('settled'));
  c('formerly dormant needs now fire', ['grandparents','veterans','debt','newborn','foodaccess'].every(i=>ids.includes(i)));
  c('night-shift and disability duplicates are gone', w.eval("RULES.some(r=>r.id==='night-shift'||r.id==='disability')"), false);
  c('every rule uses the on/ev/t/do/ask shape', w.eval("RULES.every(r=>['on','ev','t','do','ask'].every(k=>typeof r[k]==='function')&&r.cat&&r.w)"));
  c('every rule category is one the Focus filter knows', w.eval("RULES.every(r=>FOCUS_DEFS.some(f=>f.cats.includes(r.cat)))"));
  const county=w.eval('profile(DATA.M.county,DATA.M.county,null)');
  c('head-count tags no longer fire for a whole county', ['students','schools-near','dense'].filter(t=>county.has(t)), []);
  c('homeowners tag needs a real renters figure', w.eval('profile({renters:null},null,null).has("homeowners")'), false);
  c('race shifts ignore groups the 2020 recoding moved', w.eval('raceShifts(DATA.M.cousub).map(d=>d[0]).includes("White")'), false);

  console.log('\n-- the brief --');
  const nul={...D.M.tract,poverty:null,pop:null,hh:null,renters:null};
  w.eval('window.__nul='+JSON.stringify(nul));
  const b=w.eval('brief({tract:__nul,cousub:DATA.M.cousub,county:DATA.M.county},DATA.levels,"tract")');
  c('no dangling "and N% of children do" without poverty', /, and <b>\d+%<\/b> of children do/.test(b) && !/live below the poverty line, and/.test(b), false);
  c('no em-dash stand-ins for missing figures', /about <b>—|<b>— renters|<b>—<\/b>/.test(b), false);

  console.log('\n-- the report --');
  w.eval('CAP=null; capSave('+JSON.stringify(FX.MEDIUM)+'); render();');
  const doc=w.document, secs=doc.getElementById('sections');
  c('occupation donut centre is employed residents', /2,610/.test(secs.innerHTML));
  c('lollipop caption no longer claims blue dots', /Blue dot =/.test(secs.innerHTML), false);
  c('slope caption no longer claims blue marks shifts', /blue marks a shift/.test(secs.innerHTML), false);
  c('link counts are plural', /\d+ link\b(?!s)/.test(doc.body.innerHTML.replace(/1 link/g,'')), false);
  c('placeholder church name is not "My church" mid-sentence', /What My church/.test(secs.innerHTML), false);
  const bal=[...secs.querySelectorAll('.grid.bal')];
  c('survey card grids are balanced', bal.length>=5);
  const spans=g=>[...g.children].filter(e=>!e.classList.contains('wide')).map(e=>e.style.getPropertyValue('--sd'));
  const housing=bal.map(spans).find(x=>x.length===9);   // wealth: 4 cards, then 5 housing cards
  c('five housing cards split 3 + 2', housing&&housing.slice(4).join(','), '4,4,4,6,6');
  c('the orphaned .tick flex rule is gone', /\.tick\{display:flex/.test(html), false);
  c('ring key is small print even inside the brief', /\.brief p\.statkey/.test(html));
  c('eight rings are laid out four across', /\.stats\{grid-template-columns:repeat\(4,1fr\)\}/.test(html));
  const rings=w.eval('ringsHTML(DATA.M.county,null,null,"county")');
  c('county scope: no county notch, and the key says why', !/class="cmp"/.test(rings) && /county as a whole/.test(rings));
  c('ring colours match the cards', w.eval("U_STATS.every(([k,l,h])=>!KIND_OF[l]||KIND_OF[l]===h||(l==='Limited English'))"));

  /* v10.39.0: the proposal's donuts (proposalCharts) were never shown after
     Terrain 10 and were removed with the old proposal when the Make the Case
     screens replaced it. The v10.36 fix they pinned (seniors from B01001 65+,
     never 16% of the population) lives on in metrics(); these two checks now
     pin that instead. */
  console.log('\n-- seniors, from B01001 (the old proposal chart is gone) --');
  c('the old proposal chart is gone', w.eval('typeof proposalCharts'), 'undefined');
  c('seniors are the B01001 65+ count, not 16% of the population', w.eval('DATA.M.tract.seniors!=null&&DATA.M.tract.seniors!==Math.round(DATA.M.tract.pop*0.16)'), true);

  // ---- Spanish ----
  const E=boot('es'); const v=E.w;
  setTimeout(()=>{
    console.log('\n-- Spanish --');
    c('every rule has Spanish wording', v.eval('RULES.every(r=>RULES_ES[r.id])'));
    v.eval('DATA='+JSON.stringify(data())+';SCOPE="tract";');
    const H=v.eval('suggestions(DATA.M,"tract")').hits;
    c('need titles come out in Spanish', H.every(h=>!/\b(the|and|of|is)\b/.test(h.title)));
    c('Spanish change evidence names the town', /en Warminster/.test(H.find(h=>h.id==='shift-race').evidence));
    const bes=v.eval('briefES(DATA.M,DATA.levels,"tract")');
    c('Spanish brief names where people were born', /nació en el extranjero, sobre todo en México/.test(bes));
    c('Spanish brief carries the ten-year sentence', /En diez años el municipio ha cambiado/.test(bes));
    const nul2={...JSON.parse(JSON.stringify(FX.DATA.M.tract)),langs:[],englishOnly:null,poverty:null};
    v.eval('window.__n='+JSON.stringify(nul2));
    const b2=v.eval('briefES({tract:__n,cousub:DATA.M.cousub,county:DATA.M.county},DATA.levels,"tract")');
    c('no language data is not reported as "English only"', /solo inglés/.test(b2), false);
    c('no "el — vive" for a missing poverty figure', /el <b>—<\/b>/.test(b2), false);
    c('section verses in Reina-Valera', /RVA/.test(v.eval('verseHTML("economy")')) && /Jehová/.test(v.eval('verseHTML("economy")')));
    c('Community resources in Spanish', v.eval("HELP_CATS.every(c=>HELP_ES[c.id]&&HELP_ES[c.id].links({county:'x',short:'y',state:'',stateSlug:''}).length===c.links({county:'x',short:'y',state:'',stateSlug:''}).length)"));
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail?1:0);
  },400);
},400);
