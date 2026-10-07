const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g));fail++}else pass++};
const errs=[];const {VirtualConsole}=require('jsdom');const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){w.fetch=()=>new Promise(()=>{});w.scrollTo=()=>{};}});
const w=dom.window;
setTimeout(()=>{
  const D=w.document;
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors', errs.length, 0);
  const tools=[...D.querySelectorAll('.tool')];
  console.log('\n-- the supplied artwork --');
// v56 (B2): five tiles. The pastor accepted the design's default (DESIGN-COMPARE Q1): a new hub tile, "Learn from other conferences".
// v10.57.0 (stale, not a regression): six tiles. The pastor (7 Oct 2026): "maybe we could also have a comparison between churches … kinda like how conferences compare each other"
  c('six icons', tools.length===6 && tools.every(t=>t.querySelector('svg.tsvg')));
  c('all on the 256 grid they were drawn on', tools.every(t=>t.querySelector('svg').getAttribute('viewBox')==='0 0 256 256'));
  c('none of my 64-grid drawings survive', /viewBox="0 0 64 64"/.test(html), false);
  // v10.38: per-tool inks, so the gradient ids are ink-* (were mint-*).
  c('each keeps its gradient stroke', tools.every(t=>/url\(#ink-/.test(t.innerHTML)));
  c('each keeps its own glow filter', tools.every(t=>/url\(#glow-/.test(t.innerHTML)));

  console.log('\n-- ids that would have collided --');
  const ids=[...D.querySelectorAll('.tool [id]')].map(e=>e.id);
  c('twelve ids, all distinct', new Set(ids).size, ids.length);   // v56 (B2): five tiles; v10.57.0: six
  c('namespaced per tool', ids.sort().join(','),
    'glow-case,glow-churches,glow-compare,glow-gifts,glow-planner,glow-survey,ink-case,ink-churches,ink-compare,ink-gifts,ink-planner,ink-survey');   // v56 (B2); v10.57.0: the sixth
  // every url(#x) inside an icon must resolve inside that same icon
  let dangling=0;
  tools.forEach(t=>{
    const refs=[...t.innerHTML.matchAll(/url\(#([^)]+)\)/g)].map(m=>m[1]);
    const defs=[...t.querySelectorAll('[id]')].map(e=>e.id);
    refs.forEach(r=>{ if(!defs.includes(r)) dangling++; });
  });
  c('no icon points at another icon\u2019s gradient', dangling, 0);

  console.log('\n-- glow not doubled --');
  // read the real declarations, not the comment that happens to mention it
  const restCSS=(html.match(/\.tool \.tsvg\{([^}]*)\}/)||[,''])[1].replace(/\/\*[\s\S]*?\*\//g,'');
  c('no CSS drop-shadow at rest', /drop-shadow/.test(restCSS), false);
  c('the rest rule only sizes and positions', /width:clamp/.test(restCSS)&&/overflow:visible/.test(restCSS));
  // v10.38: the hover light takes the tool's own colour (falls back to the theme glow).
  c('CSS only brightens on hover', /\.tool:hover \.tsvg\{filter:drop-shadow\(0 0 20px var\(--tglow,var\(--acc-glow\)\)\) brightness/.test(html));
  c('CSS no longer dictates the stroke', /\.tool \.tsvg\{[^}]*stroke:currentColor/.test(html), false);
  c('glow is allowed outside the box', /\.tool \.tsvg\{[^}]*overflow:visible/.test(html));

  console.log('\n-- accessibility --');
  c('icons hidden from screen readers', tools.every(t=>t.querySelector('svg').getAttribute('aria-hidden')==='true'));
  c('no role="img" on the tool icons', tools.some(t=>t.querySelector('svg').getAttribute('role')), false);
  c('charts and maps keep theirs, correctly', /class="mapsvg"[^>]*role="img"/.test(html));
  c('no title/desc to be read out twice', tools.every(t=>!t.querySelector('svg title')&&!t.querySelector('svg desc')));
  c('the button text still carries the name', tools.map(t=>t.querySelector('b').textContent),
    // v10.57.1 (stale, not a regression): the pastor (7 Oct 2026), "compare your churches on the bottom left … EVANGELISM planner … bottom middle … learn from other conferences … on the right"
    ['Community Survey','Spiritual Gifts','Make the Case','Compare your churches','Evangelism Planner','Learn from other conferences']);   // v56 (B2); v10.57.0: the sixth tile
  // v10.57.1 (stale, not a regression): the pastor (7 Oct 2026), "compare your churches on the bottom left … EVANGELISM planner … bottom middle … learn from other conferences … on the right"
  c('and still routes', tools.map(t=>t.dataset.tool), ['survey','gifts','case','churches','planner','compare']);   // v10.57.0: Compare your churches

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},1800);
