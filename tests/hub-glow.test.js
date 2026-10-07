const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g));fail++}else pass++};
const errs=[];const {VirtualConsole}=require('jsdom');const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){w.fetch=()=>new Promise(()=>{});w.scrollTo=()=>{};}});
const w=dom.window;
setTimeout(()=>{
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors', errs.length, 0);
  const D=w.document;
  console.log('\n-- the icons --');
  const tools=[...D.querySelectorAll('.tool')];
// v56 (B2): five tiles. The pastor accepted the design's default (DESIGN-COMPARE Q1): a new hub tile, "Learn from other conferences".
// v10.57.0 (stale, not a regression): six tiles. The pastor (7 Oct 2026): "maybe we could also have a comparison between churches … kinda like how conferences compare each other"
  c('six tool cards', tools.length, 6);
  c('every one has a drawn icon', tools.every(t=>t.querySelector('.tico svg.tsvg')));
  c('no emoji left in any icon', tools.every(t=>!/[\u{1F300}-\u{1FAFF}]/u.test(t.querySelector('.tico').textContent)));
  // v10.38: the pastor asked for each tool in its own colour. The gradients
  // are now per-tool inks (mint, violet, amber, rose) instead of all mint.
  c('icons are stroked, not filled', [...w.document.querySelectorAll('.tool svg')].every(s=>s.getAttribute('fill')==='none'&&/stroke="url\(#ink-/.test(s.innerHTML)));
  c('each icon carries its own ink', [...w.document.querySelectorAll('.tool svg')].map(s=>(s.innerHTML.match(/offset="0\.48" stop-color="(#[0-9A-F]{6})"/)||[])[1]),
    ['#86E3CC','#B9A2FB','#FBC27C','#F29CBC','#8CC4FF','#A8E28A']);   // v56 (B2): the fifth tile's ink, blue; v10.57.0: the sixth, green
  c('each tool names its colour for the halo and link', tools.every(t=>/--tc:#[0-9A-F]{6}/.test(t.getAttribute('style')||'')&&/--tglow:rgba\(/.test(t.getAttribute('style')||'')));
  c('the six colours are all different', new Set(tools.map(t=>(t.getAttribute('style').match(/--tc:(#[0-9A-F]{6})/)||[])[1])).size, 6);   // v56 (B2); v10.57.0: six
  c('icons glow', [...w.document.querySelectorAll('.tool svg')].every(s=>/feGaussianBlur/.test(s.innerHTML)));
  c('icons hidden from screen readers (the label carries it)', tools.every(t=>t.querySelector('svg').getAttribute('aria-hidden')==='true'));
  c('every card still names its tool', tools.map(t=>t.querySelector('b').textContent),
    ['Community Survey','Spiritual Gifts','Make the Case','Evangelism Planner','Learn from other conferences','Compare your churches']);   // v56 (B2); v10.57.0: the sixth tile
  c('every card still routes somewhere', tools.map(t=>t.dataset.tool), ['survey','gifts','case','planner','compare','churches']);   // v10.57.0: Compare your churches

  console.log('\n-- inviting --');
  c('a halo sits behind each card', /\.tool::before\{[^}]*radial-gradient/.test(html));
  c('hover lifts and brightens', /\.tool:hover\{transform:translateY\(-4px\)/.test(html) && /\.tool:hover \.tsvg\{filter:drop-shadow/.test(html));
  c('press gives feedback', /\.tool:active\{[^}]*scale\(\.985\)/.test(html));
  c('keyboard focus is visible', /\.tool:focus-visible/.test(html));
  c('an explicit Explore affordance', D.querySelectorAll('.tool .tgo').length, 6);   // v56 (B2): five tiles; v10.57.0: six
  // v10.38: the pastor asked for the tiles to glow and pulse a little. The
  // old rule (nothing on the hub moves) is retired for the hub halos only.
  // v10.45.1 — the pastor changed his mind (5 Oct 2026): "nothing stays highlighted … it will highlight wherever I hover my mouse
  // pointer". Was (v10.38): the halos breathe slowly, a beat apart; reduced motion stops it; hovering holds the glow still.
  c('the halos rest, all the same quiet glow (no breathing in turn)', [/animation:toolBreathe/.test(html),/\.tool::before\{[^}]*opacity:\.22/.test(html)], [false,true]);
  c('hovering a tile lights its halo fully', /\.tool:hover::before\{opacity:1/.test(html));
  c('the breathe signal is still reserved for the profile button', /\.btn\.breathe\{animation:needsYou/.test(html));
  c('print drops the glow', /@media print\{[\s\S]{0,200}\.tool \.tsvg\{filter:none/.test(html));

  console.log('\n-- the quote --');
  const q=D.querySelector('.egw q').textContent, cite=D.querySelector('.egw cite').textContent;
  console.log('    '+q.slice(0,88)+'…');
  console.log('    '+cite);
  // the first sentence was dropped in v10.21 at his request; what remains must
  // still carry the reason it was chosen — thought, prayer, and how to approach
  c('speaks of careful thought', /Much careful thought/.test(q));
  c('and of prayer', /fervent prayer/.test(q));
  c('and of how to approach people', /how to approach men and women/.test(q));
  c('and of bringing them the truth', /great subject of truth/.test(q));
  c('cited to the source the White Estate gives', /Testimonies for the Church, vol\. 4, p\. 67/.test(cite));
  c('not mis-attributed to Christ\u2019s Object Lessons', /Object Lessons/.test(cite), false);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},1800);
