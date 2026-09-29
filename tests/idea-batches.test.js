const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
const H=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,240));fail++}else pass++};
const errs=[];const {VirtualConsole}=require('jsdom');const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
// stub the function: record every request, answer each batch with `count` ideas of its kind
const calls=[]; let failKinds=new Set();
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){
    w.scrollTo=()=>{};w.scrollBy=()=>{};w.Element.prototype.scrollIntoView=function(){};
    w.fetch=async(url,opts)=>{
      if(/advise/.test(url)&&opts&&opts.method==='POST'){
        const b=JSON.parse(opts.body); calls.push(b);
        if(failKinds.has(b.kind)) return {ok:false,status:502,json:async()=>({error:'The AI service took too long.'})};
        const ideas=Array.from({length:b.count},(_,i)=>({name:`${b.kind} idea ${i+1}`,why:'19.4% poverty here',what:'Plainly what happens.',
          first:['Phone the school','Buy a box','Say this at the door','Write the names down'],week1:'Try one street',ppl:1+i%3,cost:i%3,skills:i%2?['lang']:[],watch:'It fizzles after week two',unlike:'Nothing on the list does this'}));
        return {ok:true,status:200,json:async()=>({ideas,kind:b.kind})};
      }
      if(/advise/.test(url)) return {ok:true,json:async()=>({enabled:true,locked:false})};
      return new Promise(()=>{});
    };
  }});
const w=dom.window;
setTimeout(async()=>{
  const D=w.document;
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors', errs.length, 0);
  w.eval('DATA='+JSON.stringify(H.DATA)+';SCOPE="tract"; CAP=null; capSave('+JSON.stringify(H.MEDIUM)+'); render();');
  const gen=async bi=>{ calls.length=0; await w.eval(`generateMoves(${bi},BANDS[${bi}],suggestions(DATA.M,SCOPE),DATA.M,DATA.levels,SCOPE)`); };

  console.log('\n-- light lift --');
  w.eval('uChurch().drafts=[]; uPersist();');
  await gen(0);
  c('four batches fired in parallel, one per kind', calls.map(b=>b.kind), ['Serve','Equip','Belong','Invite']);
  c('five ideas each', calls.map(b=>b.count), [5,5,5,5]);
  c('every batch carries the do-not-repeat list', calls.every(b=>Array.isArray(b.avoid)&&b.avoid.length>80));
  c('and the commitment level with its description', calls.every(b=>/COMMITMENT LEVEL: Light lift/.test(b.summary)));
  c('and the church\u2019s rooms and languages', calls.every(b=>/facilities/.test(b.summary)&&/languages/.test(b.summary)));
  let drafts=w.eval('uChurch().drafts');
  c('twenty drafts added', drafts.length, 20);
  c('each is tagged with its kind', [...new Set(drafts.map(d=>d.k))].sort(), ['Belong','Equip','Invite','Serve']);
  c('each carries the steps', drafts.every(d=>d.how.length>=4));
  c('the week-one test rides with the steps', drafts.every(d=>d.how.some(s=>/^This week, to find out/.test(s))));
  c('and what kills it', drafts.every(d=>d.how.some(s=>/^Watch for:/.test(s))));
  c('people and cost come from the model, not a placeholder', drafts.some(d=>d.ppl===1)&&drafts.some(d=>d.cost===0)&&drafts.some(d=>d.ppl===3));
  c('skills come through', drafts.some(d=>d.skill.includes('lang')));
  c('the "why it is fresh" line is kept', drafts.every(d=>/Nothing on the list/.test(d.unlike)));
  c('load recorded as light', drafts.every(d=>d.load===0));
  c('the notice says twenty, a different set', /20 fresh light lift ideas/.test(w.eval('U_GEN_NOTICE')));

  console.log('\n-- moderate and heavy scale down --');
  w.eval('uChurch().drafts=[]; uPersist();');
  // v10.31: twenty at every level, by decision
  await gen(1); c('moderate: four batches of five = 20', calls.map(b=>b.count), [5,5,5,5]); c('twenty drafts', w.eval('uChurch().drafts.length'), 20);
  w.eval('uChurch().drafts=[]; uPersist();');
  await gen(2); c('heavy: four batches of five = 20', calls.map(b=>b.count), [5,5,5,5]); c('twenty drafts', w.eval('uChurch().drafts.length'), 20);

  console.log('\n-- resilience --');
  w.eval('uChurch().drafts=[]; uPersist();');
  failKinds=new Set(['Equip']);
  await gen(0);
  c('one direction timing out does not lose the other three', w.eval('uChurch().drafts.length'), 15);
  c('and the notice says so', /1 of 4 directions did not come back/.test(w.eval('U_GEN_NOTICE')));
  failKinds=new Set(['Serve','Equip','Belong','Invite']);
  await gen(0);
  c('all failing falls back to the built-in list with the real reason', /took too long|couldn\u2019t provide/.test(w.eval('U_GEN_NOTICE')));
  failKinds=new Set();
  await gen(0);
  c('pressing again fills the missing direction and dedupes the rest (15 + 5)', w.eval('uChurch().drafts.length'), 20);
  c('so only the Equip ideas were new', w.eval('uChurch().drafts.filter(d=>d.k==="Equip").length'), 5);

  console.log('\n-- drafts render in the list --');
  w.eval('uChurch().drafts=[]; uPersist();'); await gen(0);
  const row=w.eval(`(function(){ const x=uCatalog().find(d=>d.generated); U_OPEN=x.id; return uRow(x); })()`);
  c('an opened draft shows its steps', /How to start it/.test(row) && /Phone the school/.test(row));
  c('and says why it is not on the standard list', /Why it is not on the standard list/.test(row));
  c('a draft is honestly marked as needing review', /Confirm the connection to a published local statistic|Review this draft/.test(row));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},2200);
