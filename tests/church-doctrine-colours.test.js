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

  // render a real tradition row, the way Churches nearby does it
  const row=w.eval('doctrineRow("baptist",4,40,"Baptist","")');
  const d=D.createElement('div'); d.innerHTML=row; D.body.appendChild(d);
  console.log('\n-- one expanded church --');
  const blocks=[...d.querySelectorAll('.dsec')].map(b=>b.className.replace('dsec ','')+' : '+b.querySelector('b').textContent);
  blocks.forEach(b=>console.log('   ',b));
  c('three blocks, three classes', blocks, ['d-teach : What they teach','d-diff : Where it differs','d-common : Common ground']);
  c('teach is pink',   /\.dsec\.d-teach\{--dk:var\(--m-people\)\}/.test(html));
  c('differs is amber', /\.dsec\.d-diff\{--dk:var\(--m-hardship\)\}/.test(html));
  c('common ground is mint', /\.dsec\.d-common\{--dk:var\(--acc\)\}/.test(html));
  c('each block has a coloured edge', /\.dsec\{[^}]*border-left:2px solid var\(--dk/.test(html));
  c('the label takes the colour', /\.dsec>b\{[^}]*color:var\(--dk/.test(html));
  c('bullets take it too', /\.dsec ul\.plain li::before\{background:var\(--dk/.test(html));
  c('the difference headings go amber', /\.dsec\.d-diff \.diff span\{color:var\(--dk\)\}/.test(html));
  c('"Where to start" and "Do not" keep their own colours', /\.dopen b\{color:var\(--acc\)\}/.test(html) && /\.dcaution b\{color:#C2603A\}/.test(html));
  c('print falls back to greys', /@media print\{\.dsec\{border-left-color:#999\}/.test(html));

  console.log('\n-- every tradition renders --');
  const keys=w.eval('Object.keys(DOCTRINE)');
  let bad=0; keys.forEach(k=>{ const h=w.eval('doctrineRow('+JSON.stringify(k)+',1,10,"x","")'); if(!/d-teach/.test(h)) bad++; });
  c('all '+keys.length+' traditions carry the tagged blocks', bad, 0);
  c('the legacy card renderer matches', /d-teach/.test(w.eval('doctrineCard("catholic",2)')));
  c('a tradition with nothing recorded draws no empty coloured block', (w.eval('doctrineRow("christian-other",1,10,"x","")').match(/d-diff|d-common/g)||[]).length, 0);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},1700);
