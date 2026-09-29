const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
const H=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g));fail++}else pass++};
const errs=[];const {VirtualConsole}=require('jsdom');const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){w.fetch=()=>new Promise(()=>{});w.scrollTo=()=>{};w.scrollBy=()=>{};}});
const w=dom.window;
setTimeout(()=>{
  const D=w.document;
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors', errs.length, 0);

  console.log('\n-- one rule: colour by kind of figure --');
  const kh=l=>w.eval('kindHue('+JSON.stringify(l)+')');
  c('income is money',           kh('Median household income'),'var(--m-hardship)');
  c('poverty is money',          kh('Below the poverty line'),'var(--m-hardship)');
  c('renters is housing',        kh('Renters'),'var(--m-housing)');
  c('no vehicle is housing',     kh('No vehicle'),'var(--m-housing)');
  c('children is families',      kh('Children'),'var(--m-children)');
  c('seniors alone is families', kh('Seniors living alone'),'var(--m-children)');
  c('households is people',      kh('Households'),'var(--m-people)');
  c('born abroad is people',     kh('Born outside the U.S.'),'var(--m-people)');
  c('limited English is language', kh('Limited-English households'),'var(--m-language)');
  c('an unknown label falls back to the theme', kh('Something new'),'var(--acc)');
  c('every card label in the report is in the table',
    [...html.matchAll(/\$\{card\('([^']+)'/g)].map(m=>m[1]).filter(l=>!/response|step I want|Prayer request|would help me/.test(l))
      .every(l=>w.eval('KIND_OF['+JSON.stringify(l)+']')!==undefined));

  console.log('\n-- the full report, rendered --');
  w.eval('DATA='+JSON.stringify(H.DATA)+';SCOPE="tract"; CAP=null; capSave('+JSON.stringify(H.MEDIUM)+'); render();');
  const cards=[...D.querySelectorAll('#sections .card[style*="--hue"]')];
  const hues={}; cards.forEach(cd=>{const h=cd.getAttribute('style').match(/--hue:([^;"]+)/)[1];hues[h]=(hues[h]||0)+1;});
  console.log('    card hues:',JSON.stringify(hues));
  c('cards carry five different kinds', Object.keys(hues).length>=4);
  const econ=[...D.querySelectorAll('#sections section.blk')].find(sec=>/Economy/.test(sec.querySelector('h2').textContent));
  const econHues=[...econ.querySelectorAll('.card[style*="--hue"]')].map(cd=>cd.getAttribute('style').match(/--hue:([^;"]+)/)[1]);
  console.log('    Economy cards:',econHues.join(' '));
  c('Economy is amber with the one pink Households card', econHues.filter(h=>/hardship/.test(h)).length>=6 && econHues.some(h=>/people/.test(h)));
  const fam=[...D.querySelectorAll('#sections section.blk')].find(sec=>/Families/.test(sec.querySelector('h2').textContent));
  c('Families & age is all purple', [...fam.querySelectorAll('.card[style*="--hue"]')].every(cd=>/children/.test(cd.getAttribute('style'))));
  const bars=[...D.querySelectorAll('#sections .bars[style*="--hue"]')].map(b=>b.getAttribute('style'));
  c('bar groups tagged too', bars.length>=3);
  c('headings stay mint, the theme runs through', /\.blk h2::before\{background:var\(--sec\)/.test(html) && !/\.blk\[data-theme~="people"\][^{]*\{--sec/.test(html));

  console.log('\n-- the comparison chart --');
  const lol=D.querySelector('#sections .chart svg');
  const amber=w.eval("cssVar('--m-hardship')"), blue=w.eval("cssVar('--m-housing')");
  const svg=lol.outerHTML;
  c('hardship dots are amber', (svg.match(new RegExp(amber,'g'))||[]).length>=5);
  c('housing dots are blue',   (svg.match(new RegExp(blue,'g'))||[]).length>=2);
  c('the key explains it', /amber = money/.test(D.querySelector('#sections .ckey').textContent));

  console.log('\n-- the rings --');
  const rings=[...D.querySelectorAll('.stat')];
  const ringHues=new Set(rings.map(r=>r.getAttribute('style').match(/--hue:([^;"]+)/)[1]));
  console.log('    ring hues:',[...ringHues].join(' '));
  c('rings are coloured by kind, not all one colour', ringHues.size>=4);
  c('and the outliers still glow', D.querySelectorAll('.stat.out').length>=1 && /\.stat\.out \.ring \.arc\{filter:drop-shadow/.test(html));
  c('the key names the colours', /amber money and hardship, blue housing, purple children/.test(D.querySelector('.statkey').textContent));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},2200);
