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

  console.log('\n-- the quote --');
  const q=D.querySelector('.egw q').textContent;
  console.log('    "'+q+'"');
  c('starts on "Much careful thought"', q.startsWith('Much careful thought'));
  c('the first sentence is gone', /In order to lead souls/.test(q), false);
  c('ends where it should', q.trim().endsWith('great subject of truth.'));
  c('still one sentence', (q.match(/\./g)||[]).length, 1);
  c('citation unchanged', /Testimonies for the Church, vol\. 4, p\. 67/.test(D.querySelector('.egw cite').textContent));

  console.log('\n-- blurbs, English --');
  const en=[...D.querySelectorAll('.tool .td')].map(e=>e.textContent);
  en.forEach(t=>console.log('    '+String(t.length).padStart(2)+'  '+t));
  // 60 is the proven ceiling: the gifts blurb is 60 and wraps to two lines in
  // the live screenshot; the survey blurb at 65 was the one that went to three.
  c('every blurb inside the two-line budget', en.every(t=>t.length<=60));
  c('the survey one is no longer the outlier', en[0].length<=Math.max(...en.slice(1).map(t=>t.length)));
  const spread=Math.max(...en.map(t=>t.length))-Math.min(...en.map(t=>t.length));
  console.log('    spread: '+spread+' characters');
  // total length is not the test — line breaks are. The survey blurb's first
  // clause ("Know who lives nearby and", 25) is shorter than every other card's
  // first line, so it cannot wrap to more lines than they do.
  const firstClause=en[0].split(' and ')[0]+' and';
  c('its first line is the shortest first line on the row', firstClause.length<=25);
  c('still starts with a verb, like the others', /^Know /.test(en[0]));

  console.log('\n-- blurbs, Spanish --');
  const keys=en.map(t=>t);
  const es=keys.map(k=>w.eval('ES['+JSON.stringify(k)+']')).filter(Boolean);
  const esAll=['Know who lives nearby and where to reach first.',
    'Help members discover their gifts and find a place to serve.',
    'Proposals for ministries, projects and purchases.',
    'Plan your outreach journey, from preparation to follow-up.',
    'What other conferences’ calendars hold, side by side.'].map(k=>w.eval('ES['+JSON.stringify(k)+']'));   // v56 (B2): the fifth tile's line, held to the same budget
  esAll.forEach(t=>console.log('    '+String((t||'').length).padStart(2)+'  '+t));
  c('all five still translated', esAll.every(Boolean));   // v56 (B2)
  // v10.44 review (finding 5): Make the Case's line names projects and purchases (DESIGN §1.1, Q10's default), EN and ES
  c('Make the Case: "Proposals for ministries, projects and purchases." / "Propuestas para ministerios, proyectos y compras."', [en[2], esAll[2]], ['Proposals for ministries, projects and purchases.', 'Propuestas para ministerios, proyectos y compras.']);
  c('Spanish inside the same budget', esAll.every(t=>t.length<=58));
  c('no Spanish card is now the odd one out', Math.max(...esAll.map(t=>t.length))-Math.min(...esAll.map(t=>t.length))<=18);

  console.log('\n-- nothing else disturbed --');
  const tools=[...D.querySelectorAll('.tool')];
// v56 (B2): five tiles. The pastor accepted the design's default (DESIGN-COMPARE Q1): a new hub tile, "Learn from other conferences".
  c('five icons', tools.filter(t=>t.querySelector('svg.tsvg')).length, 5);
  c('five links', tools.filter(t=>t.querySelector('.tgo')).length, 5);
  c('links still bottom-aligned', /\.tool \.tgo\{margin-top:auto/.test(html));
  c('quote still under the welcome',
    [...D.getElementById('hub').children].map(e=>e.className.split(' ')[0]).join(','), 'hubwelcome,egw,rule,tools,hubabout');   // v10.56.1 (stale, not a regression): the pastor, "I just want this page to be very simple": no Your path, no Gifts first; what Terrain is for under the tools   // v10.42 part 3: the Gifts first card, below the tools (SPEC-FOCUS E); v10.43 (SPEC §5, the pastor: "Let me know where that could go on the first place, so it's accessible and easy to see"): "Your path" above the tools
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},1800);
