const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g));fail++}else pass++};
const errs=[];const {VirtualConsole}=require('jsdom');const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){w.fetch=()=>new Promise(()=>{});w.scrollTo=()=>{};}});
const w=dom.window;const D=()=>w.document;
setTimeout(()=>{
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors', errs.length, 0);
  console.log('\n-- the welcome, as drawn --');
  // v10.59.0 (stale): the pastor, "apps name and url to terrain.church" (Pastors Hub was another address he bought)
  c('eyebrow reads terrain.church', D().querySelector('.hubk').textContent, 'terrain.church');
  c('headline is "Welcome to Terrain"', D().querySelector('.hubwelcome h2').textContent, 'Welcome to Terrain');
  // v10.56.1 (stale, not a regression): the pastor, "under welcome to terrain just something that says your journey begins"
  c('sub is the short instruction', D().querySelector('.hubwelcome .sub').textContent, 'Your journey begins here. Choose a tool to begin.');
  c('headline is lit', /\.hubwelcome h2\{[^}]*text-shadow:0 0 46px/.test(html));

  console.log('\n-- the cards --');
  const tools=[...D().querySelectorAll('.tool')];
// v56 (B2): five tiles. The pastor accepted the design's default (DESIGN-COMPARE Q1): a new hub tile, "Learn from other conferences".
// v10.57.0 (stale, not a regression): six tiles. The pastor (7 Oct 2026): "maybe we could also have a comparison between churches … kinda like how conferences compare each other"
  c('six of them', tools.length, 6);
  c('each has its own verb', tools.map(t=>t.querySelector('.tgo').textContent.trim()),
    // v10.57.1 (stale, not a regression): the pastor (7 Oct 2026), "compare your churches on the bottom left … EVANGELISM planner … bottom middle … learn from other conferences … on the right"
    ['Explore survey','Discover gifts','Build a proposal','Start planning','Find resources','Compare churches']);   // v10.59.2: Compare your churches last (the pastor: "the weakest one")
  c('copy is short now', tools.every(t=>t.querySelector('.td').textContent.length<=70));
  c('no panel background', /\.tool\{[^}]*background:none/.test(html));
  c('no border', /\.tool\{[^}]*border:0/.test(html));
  c('centred', /\.tool\{[^}]*text-align:center/.test(html));
  c('icons at mockup scale', /\.tool \.tsvg\{width:clamp\(9\dpx,1\d(?:\.\d)?vw,12\dpx\)/.test(html));
  // the glow now lives in the artwork's own filter rather than in my CSS
  c('and strongly lit', tools.every(t=>/<filter id="glow-/.test(t.innerHTML)&&/filter="url\(#glow-/.test(t.innerHTML)));
  // v10.57.1 (stale, not a regression): the pastor (7 Oct 2026), "compare your churches on the bottom left … EVANGELISM planner … bottom middle … learn from other conferences … on the right"
  c('still routes correctly', tools.map(t=>t.dataset.tool), ['survey','gifts','case','planner','compare','churches']);   // v10.59.2: Compare your churches last (the pastor: "put compare your churches to the very bottom right instead because it's the weakest one")
  // v10.38: the focus ring takes the tool's own colour.
  c('keyboard focus survives losing the border', /\.tool:focus-visible\{outline:2px solid var\(--tc,var\(--acc\)\)/.test(html));

  console.log('\n-- the quote kept, and moved --');
  const hub=D().getElementById('hub');
  const kids=[...hub.children].map(e=>e.className.split(' ')[0]);
  console.log('    hub order:', kids.join(' -> '));
  // reversed at his request in v10.20: the quote reads under the welcome
  c('quote sits under the welcome, above the tools', kids.indexOf('egw')>kids.indexOf('hubwelcome') && kids.indexOf('egw')<kids.indexOf('tools'));
  c('the quote is the sentence he asked for', /^Much careful thought/.test(D().querySelector('.egw q').textContent));
  c('citation still correct', /Testimonies for the Church, vol\. 4, p\. 67/.test(D().querySelector('.egw cite').textContent));

  console.log('\n-- the background --');
  c('contour lines behind everything', /body::before\{[^}]*repeating-radial-gradient/.test(html));
  c('sits behind content', /body::before\{[^}]*z-index:-1/.test(html));
  c('a token for each theme', (html.match(/--contour:/g)||[]).length, 2);
  c('print drops it', /@media print\{body::before\{display:none\}\}/.test(html));

  console.log('\n-- Spanish --');
  c('new headline translated', w.eval("ES['Welcome to Terrain']"), 'Bienvenido a Terrain');
  c('new sub translated', w.eval("ES['Your journey begins here. Choose a tool to begin.']"), 'Su camino comienza aquí. Elija una herramienta para comenzar.');   // v10.56.1
  // v10.65.0 (stale, not a regression): the pastor (9 Oct 2026), "two options one for EVANGELISM and one for in reach … We can put revival meetings": the Planner's tile names both
  c('all four blurbs translated', [ 'Know who lives nearby and where to reach first.',
    'Help members discover their gifts and find a place to serve.',
    'Proposals for ministries, projects and purchases.',
    'Evangelism or revival meetings, from planning to follow-up.'].every(k=>!!w.eval('ES['+JSON.stringify(k)+']')));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},1800);
