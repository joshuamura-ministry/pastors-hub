const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g));fail++}else pass++};
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,
  beforeParse(w){w.fetch=()=>new Promise(()=>{});w.scrollTo=()=>{};}});
const w=dom.window;
setTimeout(()=>{
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  const mint=w.eval("cssVar('--acc')"), dim=w.eval("cssVar('--ink3')");
  const pink=w.eval("cssVar('--m-people')"), amber=w.eval("cssVar('--m-hardship')"),
        purple=w.eval("cssVar('--m-children')"), blue=w.eval("cssVar('--m-housing')");
  const run=items=>{
    w.eval('window.__it='+JSON.stringify(items));
    const svg=w.eval('chartSlope(window.__it,"2010-2014","2020-2024")');
    // the data lines are the ones with a stroke-width of 2.8 or 1.9
    return [...svg.matchAll(/<line [^>]*stroke="([^"]+)" stroke-width="(2\.8|1\.9)" opacity="([^"]+)"/g)]
      .map(m=>({col:m[1],w:m[2],op:m[3]}));
  };
  console.log('\n-- a typical tract: white majority, several movers, two flat --');
  const L=run([{name:'White',then:86,now:82},{name:'Hispanic',then:4,now:7},{name:'Black',then:2,now:2},
               {name:'Asian',then:1,now:4},{name:'Two or more',then:1,now:1},{name:'Born abroad',then:9,now:10}]);
  L.forEach((l,i)=>console.log('   ',['White','Hispanic','Black','Asian','2+','Born abroad'][i].padEnd(12),l.col,'w'+l.w,'op'+l.op));
  c('six lines drawn', L.length, 6);
  c('the largest population leads in mint', L[0].col, mint);
  c('every other line has its own colour', new Set(L.slice(1,5).map(l=>l.col)).size, 4);
  c('only one line is grey, and it is the smallest', L.filter(l=>l.col===dim).length, 1);
  // by size: Born abroad 10 > Hispanic 7 > Asian 4 > Black 2 > Two-or-more 1
  c('colours go by size: Born abroad, Hispanic, Asian, Black', [L[5].col,L[1].col,L[3].col,L[2].col], [pink,amber,purple,blue]);
  c('flat lines keep their colour, only quieter', L[2].col!==dim && L[2].op==='0.62');
  c('movers are heavier', L[1].w==='2.8' && L[0].w==='2.8');
  c('flat lines are lighter', L[2].w==='1.9' && L[4].w==='1.9');
  c('the 1% slice is the one that goes grey, not Born abroad', L[4].col===dim && L[5].col!==dim);

  console.log('\n-- a Hispanic-majority tract: the lead moves --');
  const M=run([{name:'White',then:40,now:30},{name:'Hispanic',then:45,now:58},{name:'Black',then:10,now:8}]);
  c('mint goes to the largest, not to the first', M[1].col===mint && M[0].col!==mint);
  c('the others get colours by size', M[0].col===pink && M[2].col===amber);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},1700);
