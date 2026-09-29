const {JSDOM}=require('jsdom');const fs=require('fs');
const dom=new JSDOM(fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8'),{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,
  beforeParse(w){w.fetch=()=>new Promise(()=>{});w.scrollTo=()=>{};}});
const w=dom.window;let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g));fail++}else pass++};
setTimeout(()=>{
  const count=(me,cty)=>{const d=w.document.createElement('div');
    d.innerHTML=w.eval('ringsHTML('+JSON.stringify(me)+','+JSON.stringify(cty)+',null)');
    return d.querySelectorAll('.stat.out').length;};
  const hard={renters:48,kidsShare:27,poverty:19,limEng:11,singleParent:35,seniorsAlone:9,foreign:22,noCar:14};
  const cty={renters:26,kidsShare:20,poverty:7,limEng:3,singleParent:19,seniorsAlone:12,foreign:10,noCar:5};
  c('a hard neighborhood lights three, not six', count(hard,cty), 3);
  c('a comfortable one lights none', count({renters:26,poverty:7,limEng:3},cty), 0);
  c('one outlier lights one', count({renters:26,poverty:22,limEng:3},cty), 1);
  c('two outliers light two', count({renters:26,poverty:22,limEng:14},cty), 2);
  c('never more than three', count({renters:60,kidsShare:40,poverty:35,limEng:30,singleParent:60,seniorsAlone:30,foreign:45,noCar:35},cty)<=3);
  console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
},1700);
