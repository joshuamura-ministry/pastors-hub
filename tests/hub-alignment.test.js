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

  console.log('\n-- the quote is back under the welcome --');
  const order=[...D.getElementById('hub').children].map(e=>e.className.split(' ')[0]);
  console.log('    hub order:', order.join(' -> '));
  // v10.42 part 3 (the pastor, SPEC-FOCUS E: "ONE 'Gifts first' card (hub tile area…) with ONE number and ONE button"): the card's
  // place is last, below the four tools (the design, X13); the quote stays under the welcome
  // v10.43 (SPEC §5, the pastor: "Let me know where that could go on the first place, so it's accessible and easy to see and understand
  // that this should be the next step"): the "Your path" strip sits above the tools, below the rule; the quote stays under the welcome
  c('sits between the welcome and the tools', order.join(','), 'hubwelcome,egw,rule,tools,hubabout');   // v10.56.1 (stale, not a regression): "very simple": no Your path, no Gifts first; what Terrain is for under the tools
  c('exactly one quote on the page', D.querySelectorAll('#hub .egw').length, 1);
  c('text intact', /Much careful thought and fervent prayer/.test(D.querySelector('.egw q').textContent));
  c('citation intact', /Testimonies for the Church, vol\. 4, p\. 67/.test(D.querySelector('.egw cite').textContent));

  console.log('\n-- symmetry --');
  c('cards stretch to the full row height', /\.tool\{[^}]*height:100%/.test(html));
  c('the link is pushed to the bottom, not spaced by a fixed gap', /\.tool \.tgo\{margin-top:auto/.test(html));
  c('no fixed margin left to drop one card', /\.tool \.tgo\{margin-top:18px/.test(html), false);
  const tools=[...D.querySelectorAll('.tool')];
// v56 (B2): five tiles. The pastor accepted the design's default (DESIGN-COMPARE Q1): a new hub tile, "Learn from other conferences".
// v10.57.0 (stale, not a regression): six tiles. The pastor (7 Oct 2026): "maybe we could also have a comparison between churches … kinda like how conferences compare each other"
  c('all six still have a link', tools.filter(t=>t.querySelector('.tgo')).length, 6);
  const lines=tools.map(t=>t.querySelector('.td').textContent.length);
  console.log('    blurb lengths:', lines.join(', '), '\u2014 uneven on purpose, alignment no longer depends on them');
  // inverted in v10.21: the survey blurb was the longest and wrapped to three
  // lines, which is precisely what was shortened. It must no longer be the max.
  c('the survey blurb is no longer the longest', lines.indexOf(Math.max(...lines))!==0);

  console.log('\n-- and it holds in Spanish, where every string is longer --');
  // v10.65.0 (stale, not a regression): the pastor (9 Oct 2026), "two options one for EVANGELISM and one for in reach … We can put revival meetings": the Planner's tile names both
  const es=['Know who lives nearby and where to reach first.',
            'Help members discover their gifts and find a place to serve.',
            'Proposals for ministries, projects and purchases.',
            'Evangelism or revival meetings, from planning to follow-up.']
    .map(k=>w.eval('ES['+JSON.stringify(k)+']'));
  c('all four translated', es.every(Boolean));
  console.log('    es lengths:', es.map(x=>x.length).join(', '));

  console.log('\n-- nothing else moved --');
  c('six icons there', tools.filter(t=>t.querySelector('svg.tsvg')).length, 6);   // v56 (B2): five tiles; v10.57.0: six
  // v10.57.1 (stale, not a regression): the pastor (7 Oct 2026), "compare your churches on the bottom left … EVANGELISM planner … bottom middle … learn from other conferences … on the right"
  c('still routing', tools.map(t=>t.dataset.tool), ['survey','gifts','case','planner','compare','churches']);   // v10.59.2: Compare your churches last (the pastor: "put compare your churches to the very bottom right instead because it's the weakest one")
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},1800);
