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
  const doors=[...h.querySelectorAll('.gfdoor')].map(d=>d.querySelector('b').textContent);
  c('two doors', doors, ['Share it with your members','Take it yourself']);
  c('members door is pink, pastor door is purple', [...h.querySelectorAll('.gfdoor')].map(d=>d.getAttribute('style')), ['--k:var(--m-people)','--k:var(--m-children)']);
  c('doors route through the existing navigation', [...h.querySelectorAll('.gfdoor')].map(d=>d.dataset.gv), ['setup','take']);
  c('results sit beneath the doors', !!(h.querySelector('.gfdoors').compareDocumentPosition(h.querySelector('.gfresults'))&4));
  c('the code box is folded away', h.querySelector('#gfpaste').closest('details')!==null);
  c('the volunteer roster is folded away, not first', h.querySelector('#u-team').closest('details')!==null);
  c('the four-tab strip is gone from the landing', h.querySelectorAll('.gftabs').length, 0);
  c('"Across the church" hides until there are results', h.querySelectorAll('[data-gv="church"]').length, 0);

  console.log('\n-- the doors work --');
  h.querySelector('[data-gv="setup"]').click();
  c('share door opens the link setup', w.eval('GF_VIEW'), 'setup');
  c('setup screen renders', /Which church is this link for/.test(D.getElementById('giftbody').textContent));
  w.eval('GF_VIEW="roster"; gfRender();');
  D.getElementById('giftbody').querySelector('[data-gv="take"]').click();
  c('take door opens the assessment', w.eval('GF_VIEW'), 'take');
  c('the intro renders', /Discover Your Spiritual Gifts/.test(D.getElementById('giftbody').textContent));

  console.log('\n-- back office still reachable --');
  w.eval('GF_VIEW="roster"; gfRender();');
  c('paste-a-code still there', !!D.getElementById('gfpaste') && !!D.getElementById('gfadd'));
  c('check for new results still there', !!D.getElementById('gfpull'));
  c('add a volunteer still there', !!D.getElementById('u-addmember'));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},2000);
