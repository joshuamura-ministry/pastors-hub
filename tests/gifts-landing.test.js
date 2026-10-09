const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,200));fail++}else pass++};
const errs=[];const {VirtualConsole}=require('jsdom');const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){w.scrollTo=()=>{};w.scrollBy=()=>{};w.Element.prototype.scrollIntoView=function(){};
    w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); };}});
const w=dom.window;
setTimeout(()=>{
  const D=w.document;
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors', errs.length, 0);

  console.log('\n-- the toolbar bug --');
  const tb=D.getElementById('toolbar'), gifts=D.getElementById('gifts'), planner=D.getElementById('planner');
  c('toolbar now comes BEFORE the Gifts panel', !!(tb.compareDocumentPosition(gifts)&4));
  c('and before the Planner', !!(tb.compareDocumentPosition(planner)&4));
  c('secnav moved with it', !!(D.getElementById('secnav').compareDocumentPosition(gifts)&4));
  c('exactly one toolbar', D.querySelectorAll('#toolbar').length, 1);

  console.log('\n-- the landing --');
  w.eval('openTool("gifts")');
  const h=D.getElementById('giftbody');
  const first=h.firstElementChild;
  c('the first thing is the heading, not the volunteer card', first.classList.contains('gfhead'));
  c('the heading is plain', h.querySelector('.gfhead h2').textContent, 'Spiritual Gifts');
  const doors=[...h.querySelectorAll('.gfbigb')].map(d=>d.querySelector('b').textContent);
  // v10.57.1 (stale, not a regression): the pastor (7 Oct 2026), "you don't need … check for new results that should just populate whenever someone finishes … instead of having Open And delete … that circular graph … we don't need the sample report anymore … take it myself doesn't need to be there … we need to clear out the clutter"
  // v10.63.2 (stale, not a regression): the pastor (9 Oct 2026), "I don't need it to be buttons clickable it's just shows that you invite your members you can see the results and then you fill the positions … What I want is a beautiful two big buttons … Send spiritual gifts to your members and then take it yourself": the steps are a picture, then two big buttons
  c('two big buttons: send it to your members, take it yourself', doors, ['Send Spiritual Gifts to your members','Take it yourself']);
  c('…pink and violet', [...h.querySelectorAll('.gfbigb')].map(d=>d.getAttribute('style')), ['--k:var(--m-people)','--k:var(--gfv,var(--m-children))']);
  c('…through the existing navigation', [...h.querySelectorAll('.gfbigb')].map(d=>d.dataset.gv), ['setup','take']);
  c('results sit beneath the buttons', !!(h.querySelector('.gfpair').compareDocumentPosition(h.querySelector('.gfresults'))&4));
  // v10.50.0 — the pastor (6 Oct 2026): "why would a member send me a code? Don't need that": the code box left the landing.
  c('no code box on the landing', h.querySelectorAll('#gfpaste,#gfadd').length, 0);
  c('the volunteer roster is folded away, not first', h.querySelector('#u-team').closest('details')!==null);
  c('the four-tab strip is gone from the landing', h.querySelectorAll('.gftabs').length, 0);
  c('"Across the church" hides until there are results', h.querySelectorAll('[data-gv="church"]').length, 0);

  console.log('\n-- the doors work --');
  h.querySelector('[data-gv="setup"]').click();
  c('share door opens the link setup', w.eval('GF_VIEW'), 'setup');
  c('setup screen renders', /Which church is this link for/.test(D.getElementById('giftbody').textContent));
  w.eval('GF_VIEW="roster"; gfRender();');
  // v10.57.1 had no "Take it yourself" door; v10.63.2 (stale): the pastor wants it back, as the second big button
  c('the take door is on the landing again', !!D.getElementById('giftbody').querySelector('[data-gv="take"]'), true);
  w.eval("GF_VIEW='take'; GFS.self=true; gfSave(); gfRender();");
  c('the assessment still opens', w.eval('GF_VIEW'), 'take');
  c('the intro renders', /Discover Your Spiritual Gifts/.test(D.getElementById('giftbody').textContent));

  console.log('\n-- back office still reachable --');
  w.eval('GF_VIEW="roster"; gfRender();');
  c('no paste-a-code (v10.50.0)', !!D.getElementById('gfpaste') || !!D.getElementById('gfadd'), false);
  c('no "Check for new results": results come in by themselves (v10.57.1)', !!D.getElementById('gfpull'), false);
  c('add a volunteer still there', !!D.getElementById('u-addmember'));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},2000);
