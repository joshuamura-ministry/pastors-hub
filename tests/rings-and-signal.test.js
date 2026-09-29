const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,w=true)=>{const ok=JSON.stringify(g)===JSON.stringify(w);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('        got :',JSON.stringify(g));fail++}else pass++};
const errs=[];const {VirtualConsole}=require('jsdom');const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){w.fetch=()=>new Promise(()=>{});w.scrollTo=()=>{};w.scrollBy=()=>{};}});
const w=dom.window;
setTimeout(()=>{
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors', errs.length, 0);

  console.log('\n-- mint is the theme again --');
  c('no per-section hue rules left', /\.blk\[data-theme~="people"\],\.blk\[data-theme~="change"\]\{--sec/.test(html), false);
  c('sections no longer get a hue in JS', /setProperty\('--sec', secHue/.test(html), false);
  c('charts are no longer handed a section hue', /secHue\('hardship'\)/.test(html), false);
  const lol=w.eval('chartLollipop([{label:"Poverty",me:11,cty:8}],"Tract","County")');
  const acc=w.eval("cssVar('--acc')");
  c('dot plot draws in the accent', lol.includes(acc));
  c('donut ramps the accent, not a second palette', w.eval('donutOf("x",[["A",60],["B",30],["C",10]],100,"p")').includes(acc));

  console.log('\n-- amber means one thing --');
  const so=(v,cty)=>w.eval(`standsOut(${v},${cty})`);
  c('eight points above county stands out', so(20,12));
  c('seven points on a county of 12 does too (half again the rate)', so(19,12));
  c('but a modest gap on a large figure does not', so(38,33), false);
  c('nor a big figure that simply matches', so(41,40), false);
  c('half again on a small figure does', so(6,3));
  c('a small gap on a small figure does not', so(4,3), false);
  c('below county never stands out', so(4,12), false);
  c('missing county is never a signal', so(20,null), false);

  console.log('\n-- the rings --');
  const me={renters:40,kidsShare:24,poverty:22,limEng:3,singleParent:21,seniorsAlone:13,foreign:9,noCar:6};
  const cty={renters:33,kidsShare:21,poverty:8,limEng:2,singleParent:18,seniorsAlone:11,foreign:7,noCar:4};
  w.eval('window.__me='+JSON.stringify(me)+';window.__cty='+JSON.stringify(cty));
  const out=w.eval('ringsHTML(window.__me,window.__cty,null)');
  const d=w.document.createElement('div');d.innerHTML=out;w.document.body.appendChild(d);
  c('eight rings still drawn', d.querySelectorAll('svg.ring').length, 8);
  const lit=[...d.querySelectorAll('.stat.out')].length;
  console.log('    rings lit amber:',lit,'of 8');
  c('only the outliers light up, never more than three', lit>=1 && lit<=3);
  c('poverty at 22 vs 8 is one of them', /Below poverty/.test([...d.querySelectorAll('.stat.out')].map(e=>e.textContent).join(' ')));
  c('the rest stay mint', d.querySelectorAll('.stat:not(.out)').length, 8-lit);
  c('colour is never the only signal', /stands out/.test(out));
  // amber is now a KIND (money & hardship); standing out is shown by a glow
  c('the key explains the glow', /glowing ring/.test(out) && /amber money and hardship/.test(out));
  const calm=w.eval('ringsHTML({renters:33,poverty:8},{renters:33,poverty:8},null)');
  c('a average neighborhood lights nothing', /class="stat out"/.test(calm), false);
  c('and says so instead', /Nothing here is far from the county/.test(calm));

  console.log('\n-- ten years of change: colour marks movement --');
  const items=[{name:'White',then:86,now:82},{name:'Born abroad',then:9,now:10},{name:'Hispanic',then:4,now:7},
               {name:'2+ races',then:1,now:4},{name:'Black',then:2,now:2},{name:'Asian',then:1,now:1}];
  w.eval('window.__it='+JSON.stringify(items));
  const slope=w.eval('chartSlope(window.__it,"2010-2014","2020-2024")');
  const dim=w.eval("cssVar('--ink3')");
  const strokes=[...slope.matchAll(/<line [^>]*stroke="([^"]+)"/g)].map(m=>m[1]);
  const greys=strokes.filter(x=>x===dim).length;
  console.log('    movers coloured:',strokes.filter(x=>x!==dim&&!/#28313D/.test(x)).length,'· flat lines grey:',greys);
  // reversed in v10.24: flat lines KEEP their colour. Only data lines count,
  // identified by their stroke widths; axis and leader lines are excluded.
  const dataLines=[...slope.matchAll(/<line [^>]*stroke="([^"]+)" stroke-width="(2\.8|1\.9)"/g)].map(m=>m[1]);
  c('at most one data line is grey (the smallest slice)', dataLines.filter(x=>x===dim).length<=1);
  c('the largest population leads in mint', dataLines.filter(x=>x===acc).length, 1);
  c('the rest are distinct colours', new Set(dataLines.filter(x=>x!==dim)).size, dataLines.filter(x=>x!==dim).length);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},1800);
