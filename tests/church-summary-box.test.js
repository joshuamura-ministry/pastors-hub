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
  // v10.45.0 (stale setup, the checks kept): the church profile left the Community Survey for the Spiritual Gifts landing ("Your church",
  // #gf-church); the pastor, 3–5 Oct 2026: "no more filling in on community survey". Its buttons are opened there.
  w.eval('DATA='+JSON.stringify(H.DATA)+';SCOPE="tract"; CAP=null; capSave({}); render(); openTool(\'gifts\');');
  console.log('\n-- no profile, no box --');
  c('nothing to summarise yet', D.querySelectorAll('.capsum').length, 0);

  console.log('\n-- press Demo --');
  D.getElementById('u-demo').click();
  const box=D.querySelector('.capsum');
  c('the box appears', !!box);
  // v10.45.0 (stale): the box is in "Your church" on the Spiritual Gifts landing, above the form (it was at the top of Mobilization)
  c('in "Your church" on the Spiritual Gifts landing, above the form', !!box.closest('#gf-church #capsumslot') && !!(box.compareDocumentPosition(D.getElementById('capslot'))&4));
  c('labelled as the sample', /sample church, as filled in/.test(box.querySelector('.capsumk').textContent));
  const groups=[...box.querySelectorAll('.capsumg h4')].map(h=>h.textContent);
  // v10.49.0 — the pastor: "take the money part out of your church section": three groups, matching the three steps
  c('three groups, matching the three steps', groups, ['People','Building','Skills']);
  const txt=box.textContent;
  // v10.42 part 3 (the pastor, 29 Sep 2026, Q3: the demo church is the realistic average church, about 80 members and 55 attending;
  // D-AVERAGE-CHURCH.md): the box says its own numbers, the two new profile fields (members on the books, adults attending) first
  c('people: members on the books, attending, adults, volunteers, leaders, hours', /Members on the books80/.test(txt)&&/Attending55/.test(txt)&&/Adults attending46/.test(txt)&&/Volunteers12/.test(txt)&&/Leaders3/.test(txt)&&/Hours a month160/.test(txt));
  c('and what is left after commitments', /Left to give: 12 volunteers, 3 leaders, 160 hours a month/.test(txt));
  c('no money group (a proposal states what its ministry needs)', /Startup funds|Monthly funds/.test(txt), false);
  c('every room with its capacity', /Kitchen \/ fellowship hall60 people/.test(txt)&&/Classrooms24 people/.test(txt));
  c('skills with counts', /1nurses or health professionals/.test(txt.replace(/\s+/g,''))||/1nurses or health professionals/.test(txt));
  c('languages', /Spanish — one fluent member/.test(txt));
  c('and what they are already carrying', /Already carrying/.test(txt)&&/Wednesday prayer meeting/.test(txt));
  // v10.45.0 (stale): there is no plan "below" it now; the sample says where Clear all is (above, in the form)
  c('it says it is the sample, and where to clear it', /The sample church: press Clear all above when you are done\./.test(txt));
  c('and how to leave the sample', /Clear all/.test(txt));
  c('the three groups carry the three step colours', [...box.querySelectorAll('.capsumg')].map(g=>g.getAttribute('style')), ['--k:var(--acc)','--k:var(--m-housing)','--k:var(--m-children)']);

  console.log('\n-- a real church reads the same, without the demo label --');
  w.eval('capSave({confirmed:true,members:60,volunteers:20,leaders:3,hours:100,busyVolunteers:0,startupBudget:300,monthlyBudget:50,facilities:{kitchen:{available:true,capacity:40,slots:[]}},skillCounts:{cook:3},languages:"",slots:["Sat afternoon"],who:{older:true}}); gfChurchSum();');   // v10.45.0: the landing's box, drawn again
  const b2=D.querySelector('.capsum');
  c('box shown for a real profile', !!b2);
  c('labelled as theirs', /Your church, as you entered it/.test(b2.textContent));
  c('not styled as demo', b2.classList.contains('demo'), false);
  c('shows their smaller numbers', /Attending60/.test(b2.textContent)&&/Kitchen \/ fellowship hall40 people/.test(b2.textContent)&&/3can cook for a crowd/i.test(b2.textContent.replace(/\s+/g,' ').replace(' Can',' can')));
  c('omits what they did not fill', /Languages/.test(b2.textContent), false);
  // v10.45.0 (stale): it says who reads these numbers (the form to change them is right under it)
  c('says who reads these numbers', /Make the Case and the Evangelism Planner read these numbers\./.test(b2.textContent));

  console.log('\n-- Clear all removes it --');
  let b=D.getElementById('u-clear'); b.click(); b=D.getElementById('u-clear'); b.click();
  c('gone again', D.querySelectorAll('.capsum').length, 0);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},2200);
