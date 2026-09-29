const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,w=true)=>{const ok=JSON.stringify(g)===JSON.stringify(w);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('        got :',JSON.stringify(g));fail++}else pass++};
const errs=[];const {VirtualConsole}=require('jsdom');const vc=new VirtualConsole();
vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){w.fetch=()=>new Promise(()=>{});w.scrollTo=()=>{};w.scrollBy=()=>{};}});
const w=dom.window;
setTimeout(()=>{
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors', errs.length, 0);

  console.log('\n-- the focus line --');
  const secs=w.document.getElementById('sections');
  secs.innerHTML='<section class="blk" data-theme="hardship"><h2>Economy</h2>'+
    '<div class="role sug" data-cat="Hardship & work">a</div>'+
    '<div class="role sug" data-cat="Housing pressure">b</div>'+
    '<div class="role sug" data-cat="Seniors & isolation">c</div></section>';
  w.eval('FOCUS=new Set(); applyFocus();');
  const note=()=>w.document.getElementById('focusnote').textContent.trim();
  c('no longer says zero prompts', /0 prompt/.test(note()), false);
  c('counts the real needs', /3 needs found/.test(note()));
  w.eval('FOCUS=new Set(["housing"]); applyFocus();');
  c('filtering by category now works', w.document.querySelectorAll('[data-cat].hidden').length, 2);
  c('and says what it kept', /showing 1 of 3/.test(note()));
  w.eval('FOCUS=new Set(); applyFocus();');
  c('clearing restores all', w.document.querySelectorAll('[data-cat].hidden').length, 0);

  console.log('\n-- rings --');
  const me={renters:40,kidsShare:24,poverty:11,limEng:3,singleParent:21,seniorsAlone:13,foreign:9,noCar:6};
  const cty={renters:33,kidsShare:21,poverty:8,limEng:2,singleParent:18,seniorsAlone:11,foreign:7,noCar:4};
  const town={renters:36,kidsShare:22,poverty:9,limEng:2,singleParent:19,seniorsAlone:12,foreign:8,noCar:5};
  w.eval('window.__me='+JSON.stringify(me)+';window.__cty='+JSON.stringify(cty)+';window.__town='+JSON.stringify(town));
  const out=w.eval('ringsHTML(window.__me,window.__cty,window.__town)');
  const d=w.document.createElement('div'); d.innerHTML=out; w.document.body.appendChild(d);
  c('eight rings drawn', d.querySelectorAll('svg.ring').length, 8);
  c('each ring has a track and an arc', [...d.querySelectorAll('svg.ring')].every(s=>s.querySelector('.trk')&&s.querySelector('.arc')));
  c('county notch drawn on every ring', d.querySelectorAll('svg.ring .cmp').length, 8);
  c('no linear stat bars left', d.querySelectorAll('.statbar').length, 0);
  c('comparison is in words too', /\+7% vs county/.test(out));
  c('a near-equal figure reads plainly', w.eval('ringsHTML({renters:33},{renters:33},null)').includes('about the county'));
  c('missing county leaves no notch', w.eval('ringsHTML({renters:40},null,null)').includes('class="cmp"'), false);
  c('key explains the notch', /notch on it is the county/.test(out));

  console.log('\n-- donuts --');
  const race=[['White',61],['Hispanic / Latino',18],['Black',12],['Asian',5],['Two or more',3],['Other',1]];
  w.eval('window.__race='+JSON.stringify(race));
  const dn=w.eval('donutOf("Who lives here",window.__race,6555,"people")');
  const d2=w.document.createElement('div'); d2.innerHTML=dn; w.document.body.appendChild(d2);
  c('a donut renders', d2.querySelectorAll('.donutbox').length, 1);
  c('slices drawn', d2.querySelectorAll('.donutsvg circle').length>=5);
  c('legend matches slices', d2.querySelectorAll('.dlg').length, d2.querySelectorAll('.donutsvg circle').length);
  c('centre shows the real count, not 100', /6,555/.test(dn));
  c('tiny slices folded into one', /Everything else/.test(dn));
  c('one row is not a donut', w.eval('donutOf("x",[["Only",100]],10,"people")'), '');
  c('rubbish rows are dropped', w.eval('donutOf("x",[["A",null],["B",undefined],["C",0]],10,"p")'), '');
  c('donut no longer hard-codes blue', /#1F6FEB/.test(dn), false);
  c('it uses the section hue', /color-mix/.test(dn));

  console.log('\n-- nothing wrong stayed circular --');
  c('ten-year chart still a slope chart', /function chartSlope/.test(html));
  c('comparison still a dot plot', /function chartLollipop/.test(html));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},1800);
