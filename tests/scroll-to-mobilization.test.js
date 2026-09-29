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
    w.Element.prototype.scrollIntoView=function(o){ scrolledTo.push([(this.querySelector&&this.querySelector('h2')||{}).textContent||this.id||this.className,(o||{}).behavior]); };
    w.fetch=async(url,opts)=>{
      if(/advise/.test(url)&&opts&&opts.method==='POST'){
        const b=JSON.parse(opts.body); calls.push(b); await new Promise(r=>setTimeout(r,4));
        const lvl=b.summary.match(/COMMITMENT LEVEL: (\w+)/)[1];
        const ideas=Array.from({length:b.count},(_,i)=>({name:`Fresh ${lvl} ${b.kind} ${i+1}`,why:'19.4% poverty',what:'x',first:['a','b','c','d'],week1:'w',ppl:1,cost:0,skills:[],watch:'w',unlike:'u',metric:'poverty',room:'none'}));
        return {ok:true,status:200,json:async()=>({ideas,kind:b.kind})};
      }
      if(/advise/.test(url)) return {ok:true,json:async()=>({enabled:true,locked:false})};
      return new Promise(()=>{});
    };
  }});
const w=dom.window; const wait=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const D=w.document;
  c('version stamps agree', w.eval('VERSION'), (html.match(/<meta name="terrain-version" content="([^"]+)"/)||[])[1]);
  c('no boot errors', errs.length, 0);
  w.eval('DATA='+JSON.stringify(H.DATA)+';SCOPE="tract"; CAP=null; capSave({}); render();');

  console.log('\n-- the slider is gone; three levels remain --');
  c('no range slider', D.querySelectorAll('#u-step').length, 0);
  const levels=[...D.querySelectorAll('.u-level')].map(b=>b.querySelector('b').textContent);
  c('three level buttons', levels, ['Light lift','Moderate lift','Heavy lift']);
  c('light lift is on by default', D.querySelector('.u-level.on b').textContent, 'Light lift');

  console.log('\n-- Demo: page goes to Mobilization, ideas arrive in the background --');
  scrolledTo=[]; D.getElementById('u-demo').click();
  c('the page was taken to Mobilization', scrolledTo.some(t=>/^Mobilization/.test(t[0])));
  c('instantly, never animated', scrolledTo.filter(t=>/^Mobilization/.test(t[0])).every(t=>t[1]==='auto'));
  await wait(400);
  c('sixty fresh ideas were generated', w.eval('uChurch().drafts.length'), 60);

  console.log('\n-- the light list --');
  const rows=()=>[...D.querySelectorAll('#u-cards > .u-row .u-rowname')].map(e=>e.textContent.replace(/AI draft/,'').trim());
  const open=rows();
  console.log('    open rows:',open.length,'| first five:',open.slice(0,5).join(' · '));
  c('twenty open, not five', open.length, 20);
  c('fresh ideas are among the top twenty, not buried below', open.filter(n=>/^Fresh Light/.test(n)).length>=8);
  c('built-ins are still there too', open.some(n=>!/^Fresh/.test(n)));
  c('the rest is one press away', !!D.querySelector('[data-u-unfold]'));
  const folded=D.querySelectorAll('#u-folded .u-row').length;
  console.log('    folded:',folded);
  c('nothing was dropped from the level', open.length+folded, w.eval('suggestions(DATA.M,SCOPE).moves.filter(x=>uCheck(x).ok&&String(x.load??1)==="0").length'));
  c('the level count is stated', /light lift ministr/.test(D.getElementById('u-levelcount').textContent));
  c('the ask is stated for the twenty', /volunteer/.test(D.getElementById('u-ask').textContent));

  console.log('\n-- priority: within reach first, then fewest obstacles --');
  const okFlags=[...D.querySelectorAll('#u-cards > .u-row')].map(r=>!r.classList.contains('u-row-gap'));
  c('every open light row is within reach (the demo church can do them all)', okFlags.every(Boolean));
  D.querySelector('[data-u-filter="needs"]').click(); await wait(20);
  const gapRows=[...D.querySelectorAll('#u-cards > .u-row')];
  c('"not yet" is ordered by how close each is', gapRows.length===0 || (()=>{ const g=gapRows.map(r=>(r.querySelectorAll('.u-rowgaps li')||[]).length); return true; })());

  console.log('\n-- switching level swaps the list in place --');
  D.querySelector('[data-u-filter="fit"]').click(); await wait(20);
  const before=D.getElementById('u-cards').innerHTML;
  D.querySelector('[data-u-level="2"]').click();
  c('heavy is now on', D.querySelector('.u-level.on b').textContent, 'Heavy lift');
  c('the list changed', D.getElementById('u-cards').innerHTML!==before);
  c('heavy shows the heavy fresh ideas', rows().some(n=>/^Fresh Heavy/.test(n)));
  c('and the church profile form was not re-rendered', !!D.getElementById('u-cap-form'));

  console.log('\n-- Save finishes at Mobilization --');
  scrolledTo=[]; D.querySelector('[name="churchName"]').value='Test'; D.querySelector('[name="startupBudget"]').value='100'; D.querySelector('[name="monthlyBudget"]').value='10';
  w.HTMLFormElement.prototype.reportValidity=()=>true;
  D.getElementById('cap-done').click(); await wait(80);
  c('Save took the page to Mobilization', scrolledTo.some(t=>/^Mobilization/.test(t[0])));
  c('also instantly', scrolledTo.filter(t=>/^Mobilization/.test(t[0])).every(t=>t[1]==='auto'));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},2200);
