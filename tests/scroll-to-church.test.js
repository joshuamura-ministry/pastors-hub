// v10.45.0 — renamed from scroll-to-mobilization (stale, updated to the new intent). The pastor, 3–5 Oct 2026: "no more filling in on
// community survey": the church profile lives on the Spiritual Gifts landing ("Your church", #gf-church), so Demo and Save land
// there now, still instantly (never smooth: a smooth scroll from wherever the redraw left the page "starts at the bottom"). The
// #u-cards ordering blocks of the old suite are retired with the survey's ministries list (DESIGN-SURVEY §1.5): their order is no
// longer a survey rule (near-miss-ordering keeps uCardsHTML's own). Demo and Save no longer start the background ideas (Q3).
const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
const H=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,240));fail++}else pass++};
const errs=[];const {VirtualConsole}=require('jsdom');const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
const calls=[]; let scrolledTo=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){
    w.scrollTo=()=>{};w.scrollBy=()=>{};
    w.Element.prototype.scrollIntoView=function(o){ scrolledTo.push([this.id||this.className,(o||{}).behavior]); };
    w.fetch=async(url,opts)=>{
      if(/advise/.test(url)&&opts&&opts.method==='POST'){ calls.push(JSON.parse(opts.body)); return {ok:true,status:200,json:async()=>({ideas:[]})}; }
      if(/advise/.test(url)) return {ok:true,json:async()=>({enabled:true,locked:false})};
      return new Promise(()=>{});
    };
  }});
const w=dom.window; const wait=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const D=w.document;
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors', errs.length, 0);
  w.eval('DATA='+JSON.stringify(H.DATA)+';SCOPE="tract"; CAP=null; capSave({}); render(); openTool(\'gifts\');');
  c('the profile is on the Spiritual Gifts landing, in "Your church"', [!!D.querySelector('#gf-church #u-cap-form'),w.eval('TOOL')], [true,'gifts']);

  console.log('\n-- Demo: the page goes to "Your church" --');
  scrolledTo=[]; D.getElementById('u-demo').click(); await wait(80);
  c('the page was taken to "Your church"', scrolledTo.some(t=>t[0]==='gf-church'));
  c('instantly, never animated', scrolledTo.filter(t=>t[0]==='gf-church').every(t=>t[1]==='auto')&&scrolledTo.every(t=>t[1]!=='smooth'));
  c('the fold is open on the sample church', [D.getElementById('gf-church').open,w.eval('capGet().demo')], [true,true]);
  await wait(300);
  c('no background ideas were asked for (Q3)', [calls.length,w.eval('(uChurch().drafts||[]).length')], [0,0]);
  c('and the form was drawn again, the sample in it', D.querySelector('[name="members"]').value, '55');

  console.log('\n-- Save finishes at "Your church" --');
  scrolledTo=[]; D.querySelector('[name="churchName"]').value='Test';   // v10.49.0: no money boxes in "Your church" any more
  w.HTMLFormElement.prototype.reportValidity=()=>true;
  D.getElementById('cap-done').click(); await wait(80);
  c('Save took the page to "Your church"', scrolledTo.some(t=>t[0]==='gf-church'));
  c('also instantly', scrolledTo.filter(t=>t[0]==='gf-church').every(t=>t[1]==='auto'));
  c('nothing asked of the server on Save either', calls.length, 0);
  c('the old name still makes the same jump (goToMobilization → capShowSaved)', (scrolledTo=[],w.eval('goToMobilization()'),scrolledTo.some(t=>t[0]==='gf-church'&&t[1]==='auto')), true);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},2200);
