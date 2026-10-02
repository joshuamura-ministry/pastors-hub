/* v51 — the Sabbath guideline (Terrain-design-notes/SABBATH-GUIDELINE.md, the pastor, 1 Oct 2026): "Some things can still be done on
 * Sabbath; we are not legalistic… We're going to be doing the things that Christ would do: healing ministry, seminars, feeding the
 * homeless — all those things can be done on Sabbath." The question is: is it doing good, the things Christ did on the Sabbath?
 *  1. which built-ins fit (CASE_SAB_BUILTINS, 62 of the 103) and caseSabFits, the one answer every Sabbath question asks;
 *  2. "I already know the dates" never names Friday evening or Saturday afternoon for an idea that does not fit (before, a market
 *     and a film night landed on Saturday afternoon), Saturday evening is said "after sunset", and his own time still wins;
 *  3. "Suggest options" offers Sabbath hours to the built-ins that fit, never to the others;
 *  4. a dated event's Day: "Sabbath afternoon, or a Sunday" when it fits;
 *  5. the Idea Library: a built-in that fits says "Fits the Sabbath"; an idea that does not says "Best on another day".
 */
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,700));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor'};
function page(){
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      w.fetch=async(u)=>{ u=String(u); if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
  const w=dom.window; return {w,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs};
}
const NOW=Date.UTC(2026,8,29,15);
const FITS=["welcome-table","interpreter-bank","newcomer-circle","vbs","food-pantry","clothing-closet","community-dinner","pathfinders","stop-smoking","bp-clinic","health-expo","chip","mental-health","grief","kids-health","walking-club","proph-news","proph-language","questions-night","archaeology","bible-by-post","family-life-series","lit-doors","warming","free-venue","disaster","blood-drive","prayer-box","pantry-box","blessing-bags","lift-rota","conversation-cafe","meal-train","bereavement-visits","kitchen-study","walk-study","supper-study","text-thread","health-to-why","grief-to-hope","parents-study","esl-to-scripture","late-room","mens-breakfast","doorstep-prayer","recovery-study","seniors-scripture","come-and-see","four-nights","open-baptism-class","decision-visit","phone-check","funeral-teas","jar-of-prayer","winter-check","welcome-newcomers","sg-homes","sg-apartments","sg-language","sg-parents","sg-inhome","backpack-giveaway"];
const SAB=/Saturday afternoon|Friday evening|sábado por la tarde|viernes por la noche/;
const church=(P,prof)=>P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; uChurch().overrides={}; capSave(${JSON.stringify(prof)}); uPersist(); })()`);
const deckText=(P,id,o)=>P.J(`JSON.stringify(caseDeck(caseModel(${JSON.stringify(id)},{type:'board',group:'board'},{now:${NOW},...${JSON.stringify(o||{})}})))`);

(async()=>{ try{
  const P=page(); church(P,FX.MEDIUM);
  console.log('\n-- 1. which built-ins fit the Sabbath --');
  c(`${FITS.length} of the 103 built-ins fit (they were 2)`, [P.J('SIGNATURE.length'),P.J('[...CASE_SAB_BUILTINS].sort()')], [103,[...FITS].sort()]);
  c('every one is a real built-in', P.J(`[...CASE_SAB_BUILTINS].filter(id=>!SIGNATURE.some(x=>x.id===id))`), []);
  c('fits: feeding, healing, seminars, visiting, mercy, worship (the guideline’s own examples)',
    P.J(`['food-pantry','community-dinner','bp-clinic','health-expo','proph-news','bereavement-visits','winter-check','come-and-see','pathfinders','sg-parents'].map(id=>caseSabFits(SIGNATURE.find(x=>x.id===id)))`), Array(10).fill(true));
  c('best on another day: a fair, a market, a film, sport, a fee, repairs, gardening, weekday work',
    P.J(`['fall-festival','lot-market','drive-in','sports-camp','cooking-school','repair-cafe','garden','job-club','senior-day','car-care'].map(id=>caseSabFits(SIGNATURE.find(x=>x.id===id)))`), Array(10).fill(false));
  c('a library or fresh idea answers by its own flag; the Planner’s series always fits', P.J(`[caseSabFits({id:'x',sabbath:true}),caseSabFits({id:'x',sabbath:false}),caseSabFits({id:'plan',plan:{}}),caseSabFits(null)]`), [true,false,true,false]);

  console.log('\n-- 2. "I already know the dates" --');
  church(P,FX.SMALL);   // Saturday afternoon and Wednesday evening
  const leakS=P.J(`SIGNATURE.filter(x=>!caseSabFits(x)).map(x=>x.id)`).filter(id=>SAB.test(deckText(P,id)));
  c('a small church free on Sabbath afternoon and Wednesday evening: no built-in that does not fit is put on the Sabbath (101 were)', leakS, []);
  c('…the lot market and the film night say Wednesday evening', ['lot-market','drive-in'].map(id=>/Wednesday evening/.test(deckText(P,id))), [true,true]);
  c('…the Pathfinder club may still meet on Sabbath afternoon', SAB.test(deckText(P,'pathfinders')), true);
  church(P,FX.MEDIUM);
  c('a medium church: the parking-lot market is on Sunday, not Saturday afternoon', [/Sunday daytime/.test(deckText(P,'lot-market')),SAB.test(deckText(P,'lot-market'))], [true,false]);
  P.E(`uChurch().overrides={'lot-market':{slot:'Sat afternoon'}}; uPersist();`);
  c('his own time (Adjust → Time slot) still wins: he chose Saturday afternoon', /Saturday afternoon/.test(deckText(P,'lot-market')), true);
  P.E(`uChurch().overrides={}; uPersist();`);
  const eve={...FX.SMALL,slots:['Fri evening','Sat afternoon','Sat evening'],facilities:Object.fromEntries(Object.entries(FX.SMALL.facilities).map(([k,f])=>[k,{...f,slots:['Fri evening','Sat afternoon','Sat evening']}]))};
  church(P,eve);
  c('Saturday evening is said "after sunset" for an idea that does not fit', /Saturday evening, after sunset/.test(deckText(P,'homework-club')), true);
  c('…and "tras la puesta del sol" in Spanish', /sábado por la noche, tras la puesta del sol/i.test(deckText(P,'homework-club',{lang:'es'})), true);
  const only={...FX.SMALL,slots:['Sat afternoon'],facilities:Object.fromEntries(Object.entries(FX.SMALL.facilities).map(([k,f])=>[k,{...f,slots:['Sat afternoon']}]))};
  church(P,only);
  c('a church free only on Sabbath afternoon: the market’s time is "to be confirmed", never the Sabbath', SAB.test(deckText(P,'lot-market')), false);

  console.log('\n-- 3. "Suggest options" --');
  const sabProfile={...FX.MEDIUM,slots:['Fri evening','Sat afternoon','Sat evening','Sun daytime'],facilities:Object.fromEntries(Object.entries(FX.MEDIUM.facilities).map(([k,f])=>[k,{...f,slots:['Fri evening','Sat afternoon','Sat evening','Sun daytime']}]))};
  church(P,sabProfile);
  const opt=id=>P.J(`caseModel(${JSON.stringify(id)},{type:'board',group:'board'},{timing:'options',now:${NOW}}).timing.options.map(o=>o.slot)`);
  c('the blood-pressure check (fits) is offered Sabbath hours', opt('bp-clinic').some(s=>s==='Sat afternoon'||s==='Fri evening'), true);
  const leakO=P.J(`SIGNATURE.filter(x=>!caseSabFits(x)).map(x=>x.id)`).filter(id=>opt(id).some(s=>s==='Sat afternoon'||s==='Fri evening'));
  c('no built-in that does not fit is offered a Sabbath hour', leakO, []);

  console.log('\n-- 4. a dated event’s Day --');
  church(P,FX.MEDIUM);
  const day=id=>{ const d=P.J(`caseDeck(caseModel(${JSON.stringify(id)},{type:'board',group:'board'},{timing:'options',now:${NOW}}))`); const s=d.slides.find(s=>s.part==='decide'); return s?(s.rows.find(r=>r[0]==='Day')||[])[1]:null; };
  c('the health expo (fits): "Sabbath afternoon, or a Sunday"', day('health-expo'), 'Sabbath afternoon, or a Sunday');
  c('the fall festival (does not): "A Sunday, or a weekday evening"', day('fall-festival'), 'A Sunday, or a weekday evening');

  console.log('\n-- 5. the Idea Library’s words --');
  c('an idea that does not fit: "Best on another day" / "Mejor otro día" (a pointer, not a ban)', P.J(`LIB_T.noSab`), ['Best on another day','Mejor otro día']);
  const sig=id=>P.J(`(()=>{ const d=document.createElement('div'); d.innerHTML=libSigCardHTML('case',SIGNATURE.find(z=>z.id===${JSON.stringify(id)}),libEnv()); const e=d.querySelector('.lib-facts li.sab'); return e?e.textContent:null; })()`);
  c('a built-in that fits says "Fits the Sabbath" on its card; one that does not says nothing', [sig('food-pantry'),sig('lot-market')], ['Fits the Sabbath',null]);
  c('no page errors', P.errs.slice(0,3), []);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
})();
