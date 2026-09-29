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
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors', errs.length, 0);
  w.eval('DATA='+JSON.stringify(H.DATA)+';SCOPE="tract";');
  w.eval('CAP=null; capSave('+JSON.stringify(H.MEDIUM)+');');
  const SG=w.eval('suggestions(DATA.M,SCOPE)');
  const html2=w.eval('uMinistriesHTML(suggestions(DATA.M,SCOPE))');

  console.log('\n-- the wording --');
  c('no longer claims "fits now"', /Fits now \(/.test(html2), false);
  c('says within reach instead', /Within reach \(/.test(html2));
  c('"needs prep" softened to "not yet"', /Not yet \(/.test(html2));
  c('states they were checked one at a time', /checked <b>on its own<\/b>/.test(html2));
  c('and that committing one costs the others', /takes them out of the count for the rest/.test(html2));
  c('shows the actual remaining capacity', /volunteers, \d+ leaders, \d+ hours a month/.test(html2));

  console.log('\n-- with no profile it says so plainly --');
  w.eval('CAP=null; capSave({});');
  const bare=w.eval('uMinistriesHTML(suggestions(DATA.M,SCOPE))');
  c('no false capacity claim', /checked <b>on its own<\/b>/.test(bare), false);
  c('tells him to fill the profile', /fill in the profile above/.test(bare));

  console.log('\n-- blocked list ordered by how close --');
  w.eval('CAP=null; capSave('+JSON.stringify(H.SMALL)+');');
  const rows=w.eval(`(function(){
    const SG=suggestions(DATA.M,SCOPE);
    return SG.moves.filter(x=>!uCheck(x).ok).map(x=>({n:x.n,g:uCheck(x).gaps.length}));
  })()`);
  const gaps=rows.map(r=>r.g);
  console.log('    obstacle counts, in order:',gaps.slice(0,14).join(' '));
  c('sorted fewest obstacles first', gaps.every((v,i)=>i===0||gaps[i-1]<=v));
  const near=rows.filter(r=>r.g===1);
  console.log('    one thing away:',near.length,'—',near.slice(0,4).map(r=>r.n).join(' · '));
  c('near misses surface at the top', near.length===0 || rows[0].g===1);

  console.log('\n-- the near-miss label --');
  const one=w.eval(`(function(){
    const SG=suggestions(DATA.M,SCOPE);
    const x=SG.moves.find(m=>{const f=uCheck(m);return !f.ok&&f.gaps.length===1;});
    return x?uRow(x):'';
  })()`);
  if(one){
    c('the row says one thing away', /one thing away/.test(one));
    const openRow=w.eval(`(function(){
      const SG=suggestions(DATA.M,SCOPE);
      const x=SG.moves.find(m=>{const f=uCheck(m);return !f.ok&&f.gaps.length===1;});
      U_OPEN=x.id; return uRow(x);
    })()`);
    c('and the opened panel names it', /The one thing standing in the way/.test(openRow));
  } else { console.log('  (no single-obstacle ministry in this fixture)'); }

  const many=w.eval(`(function(){
    const SG=suggestions(DATA.M,SCOPE);
    const x=SG.moves.find(m=>{const f=uCheck(m);return !f.ok&&f.gaps.length>1;});
    U_OPEN=''; return x?uRow(x):'';
  })()`);
  c('a multi-obstacle ministry is not mislabelled', /one thing away/.test(many), false);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},1800);
