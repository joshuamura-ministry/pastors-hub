const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
const H=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,240));fail++}else pass++};
const errs=[];const {VirtualConsole}=require('jsdom');const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
const calls=[]; let enabled=true, failKinds=new Set(), typedMidway='';
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){
    w.scrollTo=()=>{};w.scrollBy=()=>{};w.Element.prototype.scrollIntoView=function(){};
    w.fetch=async(url,opts)=>{
      if(/advise/.test(url)&&opts&&opts.method==='POST'){
        const b=JSON.parse(opts.body); calls.push(b);
        await new Promise(r=>setTimeout(r,5));
        if(failKinds.has(b.kind)) return {ok:false,status:502,json:async()=>({error:'The AI service took too long.'})};
        const metrics=['poverty','bogusMetric','limEng','kidsShare','seniorsAlone'];
        const rooms=['none','kitchen','any','outdoor','nursery'];
        const ideas=Array.from({length:b.count},(_,i)=>({name:`${b.kind} ${b.summary.match(/COMMITMENT LEVEL: (\w+)/)[1]} idea ${i+1}`,why:'19.4% poverty here',what:'Plainly.',
          first:['Phone','Buy','Say','Write'],week1:'Try one street',ppl:1+i%3,cost:i%3,skills:i%2?['lang']:[],watch:'It fizzles',unlike:'Not on the list',
          metric:metrics[i%metrics.length],room:rooms[i%rooms.length]}));
        return {ok:true,status:200,json:async()=>({ideas,kind:b.kind})};
      }
      if(/advise/.test(url)) return {ok:true,json:async()=>({enabled,locked:false})};
      return new Promise(()=>{});
    };
  }});
const w=dom.window;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const D=w.document;
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors', errs.length, 0);
  w.eval('DATA='+JSON.stringify(H.DATA)+';SCOPE="tract"; CAP=null; capSave({}); render();');

  console.log('\n-- nothing runs without a profile --');
  await w.eval('autoIdeas()'); await wait(60);
  c('no calls before the profile is saved', calls.length, 0);

  console.log('\n-- press Demo: the background generator starts on its own --');
  D.getElementById('u-demo').click();
  // type into the form while it runs, to prove nothing wipes it
  await wait(30); D.querySelector('[name="commitments"]').value='typing while it runs';
  await wait(400);
  c('twelve calls: three levels × four directions', calls.length, 12);
  c('the levels ran in order, one at a time', calls.map(b=>b.summary.match(/COMMITMENT LEVEL: (\w+)/)[1]), ['Light','Light','Light','Light','Moderate','Moderate','Moderate','Moderate','Heavy','Heavy','Heavy','Heavy']);
  c('twenty per level', calls.every(b=>b.count===5));
  c('the summary names the metric keys for the model', /poverty \| People below poverty line/.test(calls[0].summary));
  const drafts=w.eval('uChurch().drafts');
  c('sixty drafts saved with the church', drafts.length, 60);
  c('twenty per load', [0,1,2].map(l=>drafts.filter(d=>d.load===l).length), [20,20,20]);
  c('what was typed mid-run survived', D.querySelector('[name="commitments"]').value, 'typing while it runs');
  c('a verified metric is accepted', drafts.some(d=>d.metric==='poverty'&&d.reviewedEvidence===true));
  c('a made-up metric is not', drafts.filter(d=>d.metric==='bogusMetric').length===0 && drafts.some(d=>d.reviewedEvidence===false));
  c('room "none" needs no facility', drafts.some(d=>d.requirements.facilities.length===0));
  c('room "kitchen" needs a kitchen', drafts.some(d=>JSON.stringify(d.requirements.facilities)==='[["kitchen"]]'));
  c('requirements are marked reviewed, so drafts get a real check', drafts.every(d=>d.requirements.reviewed===true));
  c('the once-only key is set', w.eval('uChurch().autoKey').length>10);
  c('the notice says sixty', /60 fresh ideas were generated/.test(w.eval('U_GEN_NOTICE')));

  console.log('\n-- the race: two triggers at once generate once --');
  { let bb=D.getElementById('u-clear'); bb.click(); bb=D.getElementById('u-clear'); bb.click();
    w.eval('capSave(JSON.parse(JSON.stringify(DEMO_CHURCH)));');
    const n0=calls.length; w.eval('autoIdeas(); autoIdeas(); autoIdeas();'); await wait(400);
    c('three simultaneous triggers made one set of twelve calls, not thirty-six', calls.length-n0, 12);
    c('and the guard is released afterwards', w.eval('AUTO_RUNNING'), false); }

  console.log('\n-- drafts are checked like built-ins, and labelled --');
  const verified=w.eval(`(function(){const x=uCatalog().find(d=>d.generated&&d.reviewedEvidence&&d.requirements.facilities.length===0&&d.ppl===1&&d.cost===0);return x?uCheck(x):null;})()`);
  c('a cheap, verified, roomless draft fits the demo church', verified&&verified.ok, true);
  const row=w.eval(`(function(){const x=uCatalog().find(d=>d.generated);return uRow(x);})()`);
  c('the row carries the AI draft label', /class="u-ai">AI draft</.test(row));

  console.log('\n-- saving the same profile again does nothing --');
  const before=calls.length;
  w.eval('capSave(capGet()); autoIdeas();'); await wait(80);
  c('no new calls for an unchanged profile', calls.length, before);

  console.log('\n-- "different set" replaces a level, keeps the plan --');
  const keep=w.eval(`(function(){const x=uCatalog().find(d=>d.generated&&d.load===0);uChurch().selected=[x.id];uPersist();return x.id;})()`);
  await w.eval('generateMoves(0,BANDS[0],suggestions(DATA.M,SCOPE),DATA.M,DATA.levels,SCOPE)'); await wait(80);
  const after=w.eval('uChurch().drafts');
  c('still twenty light drafts', after.filter(d=>d.load===0).length, 20);
  c('the one in the plan was kept', after.some(d=>d.id===keep));
  c('the other levels untouched', [1,2].map(l=>after.filter(d=>d.load===l).length), [20,20]);

  console.log('\n-- Clear all lets it run again --');
  let b=D.getElementById('u-clear'); b.click(); b=D.getElementById('u-clear'); b.click();
  c('key cleared', w.eval('uChurch().autoKey'), '');
  const n2=calls.length; D.getElementById('u-demo').click(); await wait(400);
  c('demo regenerates after a clear', calls.length-n2, 12);

  console.log('\n-- no key on the server: silent --');
  enabled=false; w.eval('AI_INFO=null;'); b=D.getElementById('u-clear'); b.click(); b=D.getElementById('u-clear'); b.click();
  const n3=calls.length; D.getElementById('u-demo').click(); await wait(120);
  c('no calls when the function reports disabled', calls.length, n3);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},2200);
