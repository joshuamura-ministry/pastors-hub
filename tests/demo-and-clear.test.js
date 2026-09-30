const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
const H=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,200));fail++}else pass++};
const errs=[];const {VirtualConsole}=require('jsdom');const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){w.scrollTo=()=>{};w.scrollBy=()=>{};w.Element.prototype.scrollIntoView=function(){};
    w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); };}});
const w=dom.window;
setTimeout(async()=>{
  const D=w.document;
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors', errs.length, 0);
  w.eval('DATA='+JSON.stringify(H.DATA)+';SCOPE="tract"; CAP=null; capSave({}); render();');
  const fits=()=>w.eval('suggestions(DATA.M,SCOPE).moves.filter(x=>uCheck(x).ok).length');

  console.log('\n-- an empty profile --');
  c('both buttons present', !!D.getElementById('u-demo') && !!D.getElementById('u-clear'));
  c('badge says review needed', D.querySelector('.u-badge').textContent, 'Review needed');
  c('nothing fits yet', fits(), 0);

  console.log('\n-- Demo church: one tap on an empty profile --');
  D.getElementById('u-demo').click();
  c('profile is confirmed and marked demo', w.eval('capGet().confirmed && capGet().demo===true'));
  // v10.42 part 3 (the pastor, 29 Sep 2026, Q3: "Fill in a demo church" uses the realistic average church, about 80 members and 55
  // attending, D-AVERAGE-CHURCH.md): 55 in worship, 46 adults, 12 volunteers, 3 leaders, a kitchen and classrooms, one Spanish speaker
  c('the numbers are plausible (the average church)', w.eval('capGet().membership===80 && capGet().members===55 && capGet().adults===46 && capGet().volunteers===12 && capGet().leaders===3'));
  c('rooms, skills, languages all filled', w.eval('Object.keys(capGet().facilities).length>=2 && capGet().skillCounts.lang===1 && /Spanish/.test(capGet().languages)'));
  c('the badge says so', D.querySelector('.u-badge').textContent, 'Demo data — clear when done');
  c('and is coloured as a warning, not a tick', D.querySelector('.u-badge').classList.contains('u-badge-demo'));
  const n=fits(); console.log('    ministries within reach with the demo:',n);
  c('ministries light up immediately', n>40);
  c('but not all of them — the tool is visibly sorting', n<w.eval('suggestions(DATA.M,SCOPE).moves.length'));
  c('the button now offers to refill', D.getElementById('u-demo').textContent, 'Refill the demo church');
  c('the form shows the demo values on step one', D.querySelector('[name="members"]').value, '55');

  console.log('\n-- Clear all: two taps, and it disarms --');
  let b=D.getElementById('u-clear');
  b.click();
  c('first tap arms it and says what it will do', /Tap again to clear/.test(b.textContent) && b.classList.contains('u-danger'));
  c('nothing cleared yet', w.eval('capGet().members'), 55);
  await new Promise(r=>setTimeout(r,5100));
  c('it disarms after five seconds', b.textContent==='Clear all' && !b.classList.contains('u-danger'));
  c('still nothing cleared', w.eval('capGet().members'), 55);
  w.eval('uChurch().selected=[suggestions(DATA.M,SCOPE).moves.find(x=>uCheck(x).ok).id]; uChurch().drafts=[{id:"d1",generated:true,n:"x",why:"y"}]; uPersist();');
  b.click(); b=D.getElementById('u-clear'); b.click();
  c('second tap clears the profile', w.eval('Object.keys(capGet()).length'), 0);
  c('and the plan and drafts', w.eval('uChurch().selected.length+uChurch().drafts.length'), 0);
  c('but keeps the church name', w.eval('uChurch().name').length>0);
  c('badge back to review needed', D.querySelector('.u-badge').textContent, 'Review needed');
  c('nothing fits again', fits(), 0);

  console.log('\n-- Demo over real data asks first --');
  w.eval('capSave({confirmed:true,members:60,volunteers:20,leaders:3,hours:100,startupBudget:300,monthlyBudget:50,facilities:{},skillCounts:{}}); capRender();');
  let d=D.getElementById('u-demo');
  d.click();
  c('first tap on real data only warns', /Tap again to replace/.test(d.textContent) && w.eval('capGet().members'), 60);
  d.click();
  c('second tap replaces it', w.eval('capGet().members'), 55);

  console.log('\n-- members\u2019 own results survive Clear all --');
  w.eval('uChurch().members=[{id:"m1",name:"Ana",skills:["lang"],confirmed:true,willing:true,hours:10}]; uPersist();');
  b=D.getElementById('u-clear'); b.click(); b=D.getElementById('u-clear'); b.click();
  c('a member record is untouched', w.eval('uChurch().members.length'), 1);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},2200);
