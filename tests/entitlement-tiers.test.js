const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
const H=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,200));fail++}else pass++};
function boot(url){
  const errs=[];const {VirtualConsole}=require('jsdom');const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){w.scrollTo=()=>{};w.scrollBy=()=>{};w.Element.prototype.scrollIntoView=function(){};
      w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:true,locked:false})}; return new Promise(()=>{}); };}});
  return {w:dom.window,errs};
}
const full=boot('https://pastorshub.org/'), free=boot('https://pastorshub.org/?tier=free');
setTimeout(async()=>{
  c('version stamps agree', full.w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors, either tier', full.errs.length+free.errs.length, 0);

  console.log('\n-- today: everyone is full, nothing is locked --');
  const F=full.w;
  c('tier is full', F.eval('currentTier()'),'full');
  c('every feature entitled', F.eval("Object.keys(FEATURES).every(entitled)"));
  F.eval('DATA='+JSON.stringify(H.DATA)+';SCOPE="tract"; CAP=null; capSave('+JSON.stringify(H.MEDIUM)+'); render(); openTool("survey");');
  // v10.45.0: Mobilization, Your church and the ministries left the survey (DESIGN-SURVEY §1.1); the needs lead it (#u-needs, outside #sections)
  c('the survey shows its sections: the needs, then the report and the plan\'s where-to-look, resources and what\'s next', [!F.document.getElementById('u-needs').classList.contains('offtab'),F.eval("[...document.querySelectorAll('#sections section.blk')].filter(s=>!s.classList.contains('offtab')).length")>=9], [true,true]);
  c('no lock anywhere on the page', F.document.querySelectorAll('.lock').length, 0);
  c('no "Full version" tags on the hub', F.document.querySelectorAll('.tool .tlock').length, 0);
  F.eval('openTool("case")');
  c('Make the Case opens normally', F.document.getElementById('locked')===null || F.document.getElementById('locked').hidden);

  console.log('\n-- ?tier=free: the preview of the free experience --');
  const G=free.w;
  c('tier reads free from the address', G.eval('currentTier()'),'free');
  c('the survey stays entitled', G.eval("entitled('survey')"));
  c('everything else is not', G.eval("['plan','case','planner','gifts','ideas'].every(f=>!entitled(f))"));
  G.eval('wireHub()');
  const tags=[...G.document.querySelectorAll('.tool')].map(t=>[t.dataset.tool,!!t.querySelector('.tlock')]);
  // v56 (B2): the fifth tile, Learn from other conferences, is a full-version tool like the other three
// v10.57.0 (stale, not a regression): the pastor (7 Oct 2026), "maybe we could also have a comparison between churches": the sixth tile is paid like the others
  // v10.57.1 (stale, not a regression): the pastor (7 Oct 2026), "compare your churches on the bottom left … EVANGELISM planner … bottom middle … learn from other conferences … on the right"
  c('hub tags the paid tools, not the survey', tags, [['survey',false],['gifts',true],['case',true],['planner',true],['compare',true],['churches',true]]);   // v10.59.2: Compare your churches last (the pastor: "the weakest one")
  G.eval('DATA='+JSON.stringify(H.DATA)+';SCOPE="tract"; CAP=null; capSave('+JSON.stringify(H.MEDIUM)+'); render(); openTool("survey");');
  const shown=[...G.document.querySelectorAll('#sections section.blk')].filter(s=>!s.classList.contains('offtab')).map(s=>s.querySelector('h2').textContent);
  console.log('    free survey shows:',shown.join(' · '));
  c('the analytics sections all render', shown.includes('Economy')&&shown.includes('People')&&shown.includes('Churches nearby'));
  c('the action plan does not', !shown.includes('Mobilization')&&!shown.includes('Your church')&&!shown.includes('Ministries your church could offer'));
  c('the survey ends on a lock, not a cliff', shown[shown.length-1], 'Beyond the survey');
  c('the lock names what is beyond', /action plan is part of the full version/i.test(G.document.querySelector('#sections .lock').textContent));
  // v10.45.0 (§2.11): the needs and their detail are the survey (free); their ideas, the sheet, the PDF and the proposal are the plan
  c('the free survey: the needs, first, and each need\'s detail', [!G.document.getElementById('u-needs').classList.contains('offtab'),G.document.querySelectorAll('#u-needs .ns-need').length>0,!!G.document.querySelector('#u-needs .ns-detail')], [true,true,true]);
  G.document.querySelector('#u-needs .ns-head').click(); G.document.querySelector('#u-needs .ns-need.open [data-ns-show]').click();
  c('…its ideas show the lock (what it opens: ministry ideas for every need), no row, no sheet', [!!G.document.querySelector('#u-needs .ns-need.open .lock[data-lock="plan"]'),/Ministry ideas for every need/.test(G.document.querySelector('#u-needs .ns-need.open .lock').textContent),G.document.querySelectorAll('#u-needs .ns-row').length,!!G.document.querySelector('#ns-sheet[open]')], [true,true,0,false]);
  G.eval('openTool("planner")');
  c('opening a paid tool shows the lock', !G.document.getElementById('locked').hidden && /Evangelism Planner is part of the full version/.test(G.document.getElementById('locked').textContent));
  c('the tool itself stays hidden', G.document.getElementById('planner').hidden);
  G.eval('showHub()');
  c('back to the hub clears the lock', G.document.getElementById('locked').hidden);
  G.eval(`(()=>{ const g=document.createElement('div'); g.id='u-generate'; document.body.appendChild(g); })()`);   // v10.45.0: its host left with the ministries list
  await G.eval('uGenerateMount()');
  await new Promise(r=>setTimeout(r,50));
  c('fresh ideas are locked too', /fresh ministry ideas is part of the full version/i.test((G.document.getElementById('u-generate')||{}).textContent||''));
  c('a lock has no dead button', G.document.querySelectorAll('.lock button').length, 0);

  console.log('\n-- the one line that changes later --');
  c('currentTier is the single source', (html.match(/function currentTier\(\)/g)||[]).length, 1);
  c('every gate goes through entitled()', (html.match(/entitled\(/g)||[]).length>=6);
  const code=html.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
  // v10.54.0 (accounts and plans, "connect this to the stripe"): the tier is read by entitled() and by acctTierCheck(), which
  // redraws the page when the plan changes under it (signed in, back from Stripe, signed out). Still one definition.
  c('nothing else reads the tier (one definition, two callers: entitled and acctTierCheck)', (code.match(/currentTier\(\)/g)||[]).length, 3);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},2400);
