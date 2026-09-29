const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
const H=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,240));fail++}else pass++};
const errs=[];const {VirtualConsole}=require('jsdom');const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){w.scrollTo=()=>{};w.scrollBy=()=>{};w.Element.prototype.scrollIntoView=function(){};
    w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); };}});
const w=dom.window;
setTimeout(()=>{
  const D=w.document;
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors', errs.length, 0);
  w.eval('DATA='+JSON.stringify(H.DATA)+';SCOPE="tract"; CAP=null; capSave({}); render();');
  console.log('\n-- no profile, no box --');
  c('nothing to summarise yet', D.querySelectorAll('.capsum').length, 0);

  console.log('\n-- press Demo --');
  D.getElementById('u-demo').click();
  const box=D.querySelector('.capsum');
  c('the box appears', !!box);
  c('at the top of the action plan, before the ask', box.closest('section.blk').querySelector('h2').textContent==='Mobilization' && !!(box.compareDocumentPosition(box.closest('section').querySelector('.askpanel'))&4));
  c('labelled as the sample', /sample church, as filled in/.test(box.querySelector('.capsumk').textContent));
  const groups=[...box.querySelectorAll('.capsumg h4')].map(h=>h.textContent);
  c('four groups, matching the four steps', groups, ['People','Money','Building','Skills']);
  const txt=box.textContent;
  c('people: attending, volunteers, leaders, hours', /Attending135/.test(txt)&&/Volunteers46 \(11 already committed\)/.test(txt)&&/Leaders9/.test(txt)&&/Hours a month320/.test(txt));
  c('and what is left after commitments', /Left to give: 35 volunteers, 7 leaders, 250 hours a month/.test(txt));
  c('money, both lines', /Startup funds\$2,500/.test(txt)&&/Monthly funds\$450/.test(txt));
  c('every room with its capacity', /Kitchen \/ fellowship hall90 people/.test(txt)&&/Church van \/ bus14 people/.test(txt)&&/Confirmed host home12 people/.test(txt));
  c('skills with counts', /3Nurses or health professionals/i.test(txt.replace(/\s+/g,''))||/3nurses or health professionals/.test(txt));
  c('languages', /Spanish — two fluent, one conversational/.test(txt));
  c('and what they are already carrying', /Already carrying/.test(txt)&&/Pathfinders/.test(txt));
  c('it tells the reader the plan rests on these', /Everything below is measured against these numbers/.test(txt));
  c('and how to leave the sample', /Clear all/.test(txt));
  c('the four groups carry the four step colours', [...box.querySelectorAll('.capsumg')].map(g=>g.getAttribute('style')), ['--k:var(--acc)','--k:var(--m-hardship)','--k:var(--m-housing)','--k:var(--m-children)']);

  console.log('\n-- a real church reads the same, without the demo label --');
  w.eval('capSave({confirmed:true,members:60,volunteers:20,leaders:3,hours:100,busyVolunteers:0,startupBudget:300,monthlyBudget:50,facilities:{kitchen:{available:true,capacity:40,slots:[]}},skillCounts:{cook:3},languages:"",slots:["Sat afternoon"],who:{older:true}}); render();');
  const b2=D.querySelector('.capsum');
  c('box shown for a real profile', !!b2);
  c('labelled as theirs', /Your church, as you entered it/.test(b2.textContent));
  c('not styled as demo', b2.classList.contains('demo'), false);
  c('shows their smaller numbers', /Attending60/.test(b2.textContent)&&/Kitchen \/ fellowship hall40 people/.test(b2.textContent)&&/3can cook for a crowd/i.test(b2.textContent.replace(/\s+/g,' ').replace(' Can',' can')));
  c('omits what they did not fill', /Languages/.test(b2.textContent), false);
  c('tells them where to change it', /Change them under Your church/.test(b2.textContent));

  console.log('\n-- Clear all removes it --');
  let b=D.getElementById('u-clear'); b.click(); b=D.getElementById('u-clear'); b.click();
  c('gone again', D.querySelectorAll('.capsum').length, 0);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},2200);
