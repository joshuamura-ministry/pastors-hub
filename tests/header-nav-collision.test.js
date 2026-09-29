const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g));fail++}else pass++};
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,
  beforeParse(w){w.fetch=()=>new Promise(()=>{});w.scrollTo=()=>{};}});
const w=dom.window;
setTimeout(()=>{
  const D=w.document;
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  console.log('\n-- the collision --');
  c('no bare .tools rule can reach the header any more', /(^|\n)\.tools\{/.test(html), false);
  c('the hub grid is scoped to the hub', /\.hub \.tools\{display:grid/.test(html));
  const nav=D.querySelector('nav.tools'), grid=D.querySelector('.hub .tools');
  c('the header nav and the hub grid really do share a class', nav.classList.contains('tools') && grid.classList.contains('tools'));
  const cs=w.getComputedStyle(nav);
  c('the nav is flex, not grid', cs.display, 'flex');
  c('the nav has no top margin', cs.marginTop==='0px'||cs.marginTop==='0');
  const gs=w.getComputedStyle(grid);
  c('the hub grid is still a grid', gs.display, 'grid');
  console.log('\n-- the row --');
  c('Pastors Hub and ES are the same height', /nav\.tools a\{height:40px/.test(html) && /\.themebtn\{[^}]*height:40px/.test(html));
  c('the row centres its items', /\.top \.in\{[^}]*align-items:center/.test(html));
  c('the hub still has four tiles', D.querySelectorAll('.hub .tools .tool').length, 4);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},1700);
