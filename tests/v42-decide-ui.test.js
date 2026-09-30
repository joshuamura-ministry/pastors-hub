// v10.42.0 part 3 — "Record what we decided", and how the proposal is being decided.
// The pastor (SPEC-FOCUS A): "Will they be able to decide dates and times and have it in the download as well?" — "'Record
// what we decided' in the presenter view (and in step 3 afterwards): which body (team / finance committee / board /
// business meeting), the date, the outcome (agreed · recommended · approved · amended · referred · declined), the agreed
// timing (one of the options or typed: day, time, start date, length)… every PDF (handout, proposal, the phones' copy)
// carries the decision." (SPEC-FOCUS B): "in some churches it has to be presented to the finance committee first, and then
// to the board" — "Approval path: in step 3 the pastor ticks which bodies his church uses… saved per church."
// The design: no note field (X8); "Amended" / "Con enmiendas" (X9); one hint and at most one button on the step-3 card (X11,
// P4); "The Proposal to vote on opens with" (P6); the Amended line under the chips (P8); the gifts deck never takes one (P10).
// End to end in jsdom with the real present.mjs (present-1.4, in-memory store) and a Firebase stand-in, as v42-lock.
// Checked: the presenter's Decision button (never for the sample or a control device), the ended card's first row; the form
// (the bodies of the path, today's date, the outcomes of the body chosen, the vote, the day and start agreed for a yes only,
// the timing builder's options, no note, 44 px targets, the errors); saving in the presenter view sends op update then op
// putpdf, on the slide he is on, and step 3 is drawn again when he closes; the step-3 card (rows, the two hints and their one
// button, a recorded row opens its record, removing it); the path editor (at least one, the order saved); caseDecPush (only
// this ministry's links, never the sample's, at most six, a link gone forgotten); Spanish (no "a el" / "de el").
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const jspdf=require('jspdf');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,600));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=4000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(15); } return false; }
jspdf.jsPDF.API.save=function(){ return this; };
function makeStore(){
  const m=new Map();
  return { m,
    async get(k){ const v=m.get(k); return v===undefined?null:JSON.parse(v); },
    async setJSON(k,val,o={}){ if(o.onlyIfNew&&m.has(k)) return {modified:false}; m.set(k,JSON.stringify(val)); return {modified:true}; },
    async delete(k){ m.delete(k); },
    async list({prefix=''}={}){ return {blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}; },
    keys(p=''){ return [...m.keys()].filter(k=>k.startsWith(p)); }, peek(k){ const v=m.get(k); return v?JSON.parse(v):null; } };
}
const FB='https://terrain-live-default-rtdb.firebaseio.com';
const RTDB={}; const STREAMS=new Set();
function relay(room,type,data){ for(const es of STREAMS) if(es.url===`${FB}/live/${room}.json`&&es.readyState===1) es.emit(type,{path:'/',data}); }
(async()=>{ try{
  delete process.env.TERRAIN_CODES; delete process.env.TERRAIN_REQUIRE_CODE; delete process.env.TERRAIN_REG_SECRET;
  process.env.PRESENT_FB_URL=FB; process.env.PRESENT_FB_SECRET='fb-test-secret'; process.env.SITE_URL='https://pastorshub.org';
  const store=makeStore(); globalThis.__terrainPresentStore=store;
  globalThis.fetch=async(u,o={})=>{
    u=String(u); const m=/^https:\/\/terrain-live-default-rtdb\.firebaseio\.com\/(?:live\/([A-Za-z0-9_-]{22})|)\.json/.exec(u);
    if(!m) throw new Error('no network in tests: '+u);
    const room=m[1]; if(!room) return {ok:true,status:200,json:async()=>({live:true})};
    const now=Date.now(), fix=v=>{ const o2={...v}; for(const k in o2) if(o2[k]&&o2[k]['.sv']==='timestamp') o2[k]=now; return o2; };
    if(o.method==='PATCH'){ const b=fix(JSON.parse(o.body)); RTDB[room]={...(RTDB[room]||{}),...b}; setTimeout(()=>relay(room,'patch',b),0); }
    else if(o.method==='DELETE'){ delete RTDB[room]; setTimeout(()=>relay(room,'put',null),0); }
    return {ok:true,status:200,json:async()=>RTDB[room]===undefined?null:RTDB[room]};
  };
  const handler=(await import(path.resolve(__dirname,'..','netlify','functions','present.mjs'))).default;
  const sent=[]; let failUpdate=0;
  const serve=async(u,o={})=>{
    const url=new URL(u,'https://pastorshub.org/');
    const body=o.body?JSON.parse(o.body):null, op=body?body.op:url.searchParams.get('op');
    sent.push({op,body});
    if(op==='update'&&failUpdate>0){ failUpdate--; return {ok:false,status:404,headers:{get:()=>'application/json'},json:async()=>({ok:false,error:'not-found'})}; }
    const r=await handler(new Request(url.href,{method:o.method||'GET',headers:o.headers||{},body:o.body}),{ip:'203.0.113.9'});
    const t=await r.text(); return {ok:r.ok,status:r.status,headers:{get:k=>r.headers.get(k)},json:async()=>JSON.parse(t)};
  };
  const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Allegheny East',role:'pastor'};
  class FakeES{ constructor(url){ this.url=String(url); this.readyState=0; this.l={}; STREAMS.add(this); } addEventListener(t,f){ (this.l[t]=this.l[t]||[]).push(f); }
    emit(t,msg){ (this.l[t]||[]).forEach(f=>f({data:JSON.stringify(msg)})); } close(){ this.readyState=2; STREAMS.delete(this); } }
  function page(url,{lang,reg}={}){
    const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
    const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.jspdf=jspdf;
        if(lang) w.localStorage.setItem('terrain-lang',lang);
        if(reg) w.localStorage.setItem('terrain-reg',JSON.stringify(reg));
        w.qrcode=(t,ec)=>{ let data=''; return {addData(s){ data=s; },make(){},getModuleCount:()=>25,isDark:(r,c2)=>((r*7+c2*3+data.length)%5)<2}; };
        w.EventSource=FakeES;
        w.fetch=async(u,o={})=>{ u=String(u);
          if(/functions\/present/.test(u)) return serve(u,o);
          if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})};
          return new Promise(()=>{}); }; }});
    const w=dom.window;
    return {w,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
      txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
  }
  const click=(P,s)=>{ const e=P.q(s); if(!e) throw new Error('no element '+s); e.click(); };
  const setv=(P,s,v)=>{ const e=P.q(s); if(!e) throw new Error('no element '+s); e.value=v; e.dispatchEvent(new P.w.Event('input',{bubbles:true})); e.dispatchEvent(new P.w.Event('change',{bubbles:true})); };
  const submit=(P,host)=>{ const f=P.q(host+' [data-cd-form]'); f.dispatchEvent(new P.w.Event('submit',{bubbles:true,cancelable:true})); };
  const ops=o=>sent.filter(x=>x.op===o);
  function setup(P,prefs){
    P.E(`(()=>{ const D=${JSON.stringify(FX.DATA)};
      D.M.tract.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.tract.moe)); D.M.county.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.county.moe));
      DATA=D; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)});
      uChurch().proposalPrefs=${JSON.stringify(prefs)};
      uPersist(); openTool('case'); render(); })()`);
    // step 3's host for the card, as section C's caseDraw3 draws it (#cs-dec after the live link's line), and the call
    // (once section C's caseDraw3 draws #cs-dec and mounts the card itself, this stand-in does nothing: mounting twice would
    // draw the card's one-time message and then clear it)
    P.E(`(()=>{ const d3=caseDraw3; caseDraw3=function(){ d3(); const room=document.getElementById('cs-room'), had=document.getElementById('cs-dec');
      if(had&&!had.dataset.standIn) return;
      if(room&&!had){ const x=document.createElement('section'); x.id='cs-dec'; x.hidden=true; x.dataset.standIn='1'; room.after(x); }
      if(typeof caseDecCardMount==='function') caseDecCardMount(document.getElementById('cs-dec'),CASE_ST.model); }; caseDraw3(); })()`);
  }
  const today=P0=>P0.E('cdToday()');
  const daysAgo=(P0,n)=>P0.E(`(()=>{ const d=new Date(Date.now()-(${n})*864e5), p=x=>String(x).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); })()`);

  console.log('\n-- the step-3 card: the path, the rows, one hint --');
  const P=page('https://pastorshub.org/',{reg:REG}); await sleep(1200);
  setup(P,{ministry:'food-pantry',type:'board',group:'board'});
  c('(the records of section A are in the page)', P.E('cdReady()'), true);
  c('the card: “How it is being decided”, the church’s path (the default: ministry team › church board), Change',
    [P.txt('#cs-dec .cd-k'),P.txt('#cs-dec .cd-path span'),P.txt('[data-cd-path]')], ['How it is being decided','In Bucks County SDA: Ministry team › Church board','Change']);
  c('…a row per body: the ministry team still to come; the board, these slides (bold)', P.qa('#cs-dec .cd-row').map(li=>[li.textContent.replace(/\s+/g,' ').trim(),li.classList.contains('cd-here')]),
    [['Ministry team · still to come',false],['Church board · these slides',true]]);
  const teamName=P.E(`caseT(CASE_GROUPS.find(g=>g.id===caseDefaultGroup('team','food-pantry')))`);
  const teamIn=P.E(`caseDecBodyName('team',caseDefaultGroup('team','food-pantry'),false)`);
  c('…the one hint: the ministry team sees it first, and one button to make it for them', [P.txt('#cs-dec .cd-hint p'),P.qa('#cs-dec .cd-hint button').length,P.txt('[data-cd-make]'),P.q('[data-cd-make]').dataset.cdMake],
    [`In Bucks County SDA, ${teamIn} sees it first.`,1,`Make it for ${teamIn}`,P.E(`caseDefaultGroup('team','food-pantry')`)]);
  c('…and “Record what we decided”', P.txt('[data-cd-record]'), 'Record what we decided');

  console.log('\n-- the form --');
  click(P,'[data-cd-record]');
  c('the form opens under the card: who (the path’s bodies, the board chosen), today’s date, what was decided, the vote',
    [P.qa('#cs-dec [data-cd-body]').map(b=>[b.dataset.cdBody,b.classList.contains('on')]),P.q('#cs-dec [data-cd-date]').value,P.q('#cs-dec [data-cd-date]').max,P.qa('#cs-dec [data-cd-out]').map(b=>b.textContent),!!P.q('#cs-dec [data-cd-v="for"]')],
    [[['team',false],['board',true]],today(P),today(P),['Approved','Amended','Referred','Declined'],true]);
  c('…no note field anywhere (the design, X8: nothing typed here can carry a name onto a phone)', [P.qa('#cs-dec [data-cd-form] textarea').length,P.qa('#cs-dec [data-cd-form] input[type="text"]').map(x=>x.dataset.cdV||x.dataset.cdWeeks!==undefined&&'weeks')],
    [0,['for','against','abstain','weeks']]);
  c('…the day and start agreed: only once a yes is chosen', P.q('#cs-dec [data-cd-timing]').hidden, true);
  submit(P,'#cs-dec');
  c('Save with nothing chosen: “Choose what was decided.”', P.txt('#cs-dec [data-cd-msg]'), 'Choose what was decided.');
  click(P,'#cs-dec [data-cd-out="amended"]');
  c('Amended: the line under the chips says the amount is changed with Adjust', [P.q('#cs-dec [data-cd-amend]').hidden,P.txt('#cs-dec [data-cd-amend]')], [false,`If the amount changed, change it with “${P.E("caseU('adjust')")}”.`]);
  c('…and the day and start agreed show: Not settled yet (chosen), the timing builder’s options, Something else',
    [P.q('#cs-dec [data-cd-timing]').hidden,P.qa('#cs-dec [data-cd-tc]').map(x=>[x.value,x.checked]).slice(0,1),P.qa('#cs-dec [data-cd-tc]').map(x=>x.value).pop(),P.q('#cs-dec [data-cd-tfields]').hidden],
    [false,[['none',true]],'other',true]);
  const nOpt=P.qa('#cs-dec [data-cd-tc]').length-2;
  c('(the options are the model’s: Option 1… as the decide slide says them)', [nOpt===P.J('CASE_ST.model.timing&&CASE_ST.model.timing.options?CASE_ST.model.timing.options.length:0'),nOpt>0?/^Option 1: /.test(P.qa('#cs-dec .cd-radio span')[1].textContent):true], [true,true]);
  setv(P,'#cs-dec [data-cd-date]',P.E(`(()=>{ const d=new Date(Date.now()+3*864e5), p=x=>String(x).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); })()`));
  submit(P,'#cs-dec');
  c('a date still to come: “That date is still to come. Record it after the meeting.”', P.txt('#cs-dec [data-cd-msg]'), 'That date is still to come. Record it after the meeting.');
  setv(P,'#cs-dec [data-cd-date]',daysAgo(P,7)); setv(P,'#cs-dec [data-cd-v="for"]','1x'); submit(P,'#cs-dec');
  c('a vote that is not a number: “Numbers only, please.”', P.txt('#cs-dec [data-cd-msg]'), 'Numbers only, please.');
  setv(P,'#cs-dec [data-cd-v="for"]','9'); setv(P,'#cs-dec [data-cd-v="against"]','2');
  { const o=P.q('#cs-dec [data-cd-tc][value="other"]'); o.checked=true; o.dispatchEvent(new P.w.Event('change')); }
  c('Something else: the day, a time (optional), the start and the length', [P.q('#cs-dec [data-cd-tfields]').hidden,P.q('#cs-dec [data-cd-dayrow]').hidden,P.qa('#cs-dec [data-cd-len] option').map(o=>o.textContent)],
    [false,false,['4-week pilot',P.E(`caseF(CASE_DEC.timing.len.trial,{n:cdWeeks(CASE_ST.model)})`),'A full season (13 weeks)','Other']]);
  submit(P,'#cs-dec');
  c('…with neither a day nor a start: “Choose the start date, or “Not settled yet”.”', P.txt('#cs-dec [data-cd-msg]'), 'Choose the start date, or “Not settled yet”.');
  setv(P,'#cs-dec [data-cd-slot]','Thu evening'); setv(P,'#cs-dec [data-cd-time]','19:00'); setv(P,'#cs-dec [data-cd-start]',daysAgo(P,-10)); setv(P,'#cs-dec [data-cd-len]','season');
  submit(P,'#cs-dec'); await sleep(50);
  const rec=P.J(`caseDecAll('food-pantry').board`);
  c('Save: the board’s record, as typed (no note; the vote; the agreed day, time, start and a full season)',
    [rec&&rec.outcome,rec&&rec.date===daysAgo(P,7),rec&&rec.vote,rec&&rec.timing&&[rec.timing.slot,rec.timing.time,rec.timing.len,rec.timing.weeks,rec.timing.option],rec&&'note' in rec],
    ['amended',true,{for:9,against:2,abstain:null,consensus:false},['Thu evening','19:00','season',13,null],false]);
  c('…step 3 is drawn again: the row “Church board · Amended · {date} · 9 for · 2 against · these slides”, a check', [P.qa('#cs-dec .cd-row')[1].textContent.replace(/\s+/g,' ').trim(),P.qa('#cs-dec .cd-row')[1].classList.contains('cd-yes')],
    [`Church board · Amended · ${P.E(`caseDate(cdDay('${daysAgo(P,7)}'),true)`)} · 9 for · 2 against · these slides`,true]);
  c('…and the message says what the slides and every PDF now say', P.txt('#cs-dec [data-cd-cardmsg]'), `Saved. The slides and every PDF now say: ${P.E(`caseDecStatus(caseDecAll('food-pantry').board,{})`)}.`);
  c('…the hint is still the team (it has not decided): one hint, one button', [P.qa('#cs-dec .cd-hint').length,P.qa('#cs-dec .cd-hint button').length], [1,1]);
  // tapping a recorded row opens its record
  click(P,'#cs-dec [data-cd-edit="board"]');
  c('tapping the board’s row opens the form on its record (the outcome, the vote, the day agreed), with “Remove this record”',
    [P.q('#cs-dec [data-cd-out].on').dataset.cdOut,P.q('#cs-dec [data-cd-v="for"]').value,P.q('#cs-dec [data-cd-slot]').value,P.txt('#cs-dec [data-cd-remove]')], ['amended','9','Thu evening','Remove this record']);
  click(P,'#cs-dec [data-cd-remove]');
  c('Remove asks twice', [P.txt('#cs-dec [data-cd-remove]'),!!P.J(`caseDecAll('food-pantry').board`)], ['Tap again to remove',true]);
  click(P,'#cs-dec [data-cd-remove]'); await sleep(30);
  c('…then it is gone, and the card says so', [P.J(`caseDecAll('food-pantry').board||null`),P.txt('#cs-dec [data-cd-cardmsg]')], [null,'Removed. The slides and every PDF no longer say it.']);

  console.log('\n-- the path editor --');
  click(P,'[data-cd-path]');
  c('Change: “Who decides in Bucks County SDA?”, the four bodies (two ticked), “The Proposal to vote on opens with”, Motion first chosen',
    [P.txt('#cs-dec .cd-ph'),P.qa('#cs-dec [data-cd-pb]').map(x=>[x.dataset.cdPb,x.checked]),P.txt('#cs-dec .cd-ol'),P.q('#cs-dec [data-cd-order="motion"]').classList.contains('on'),P.txt('#cs-dec [data-cd-onote]')],
    ['Who decides in Bucks County SDA?',[['team',true],['finance',false],['board',true],['business',false]],'The Proposal to vote on opens with',true,'Motion first: they read exactly what they vote on, then why. It is repeated at the end beside “Action taken”.']);
  P.qa('#cs-dec [data-cd-pb]').forEach(x=>{ x.checked=false; });
  click(P,'[data-cd-psave]');
  c('nothing ticked: “Tick at least one.”, nothing saved', [P.txt('#cs-dec [data-cd-pmsg]'),P.J('uChurch().caseApproval||null')], ['Tick at least one.',null]);
  ['team','finance','board'].forEach(b=>{ P.q(`#cs-dec [data-cd-pb="${b}"]`).checked=true; });
  click(P,'#cs-dec [data-cd-order="explain"]');
  c('Explanation first: its note', P.txt('#cs-dec [data-cd-onote]'), 'Explanation first: why, then the motion to vote on, at the end.');
  click(P,'[data-cd-psave]'); await sleep(30);
  c('Save: the path (always in order) and the order, for the church; the card shows the new path', [P.J('uChurch().caseApproval'),P.txt('#cs-dec .cd-path span'),P.txt('#cs-dec [data-cd-cardmsg]')],
    [{v:1,path:['team','finance','board'],order:'explain'},'In Bucks County SDA: Ministry team › Finance committee › Church board','Saved for Bucks County SDA.']);
  click(P,'[data-cd-record]');
  c('…and the “Saved” line goes once he opens the form (Chrome check: it sat under Save, looking like the form was saved)', P.txt('#cs-dec [data-cd-cardmsg]'), '');
  click(P,'#cs-dec [data-cd-cancel]');
  // the team agrees (recorded straight into the records): the finance committee is next to see it first
  P.E(`caseDecSave('food-pantry',{v:1,body:'team',group:caseDefaultGroup('team','food-pantry'),date:'${daysAgo(P,21)}',outcome:'agreed',vote:null,timing:null}); caseDraw3();`);
  c('the team agreed: the hint moves on to the finance committee', [P.txt('#cs-dec .cd-hint p'),P.q('[data-cd-make]').dataset.cdMake], ['In Bucks County SDA, the finance committee sees it first.','finance']);
  c('…the team’s row by its own name: “{team} · Agreed · {date}”', P.qa('#cs-dec .cd-row')[0].textContent.replace(/\s+/g,' ').trim(), `${teamName} · Agreed · ${P.E(`caseDate(cdDay('${daysAgo(P,21)}'),true)`)}`);
  click(P,'[data-cd-make]'); await sleep(30);
  c('“Make it for the finance committee”: step 3 is the finance committee’s now', [P.J('casePrefs().group'),P.txt('#cs-dec .cd-here')], ['finance','Finance committee · these slides']);
  P.E(`caseDecSave('food-pantry',{v:1,body:'finance',date:'${daysAgo(P,14)}',outcome:'recommended',vote:{for:5,against:0,abstain:null,consensus:false},timing:null}); caseDraw3();`);
  c('the finance committee recommended: “{status}. Next: the church board.” and one button for the board', [P.txt('#cs-dec .cd-hint p'),P.q('[data-cd-make]').dataset.cdMake,P.qa('#cs-dec .cd-hint button').length],
    [`${P.E(`caseDecStatus(caseDecAll('food-pantry').finance,{})`)}. Next: the church board.`,'board',1]);
  c('the whole church (no body of its own): no hint', (P.E(`caseChooseGroup('congregation')`),[P.qa('#cs-dec .cd-hint').length,!!P.q('#cs-dec [data-cd-record]')]), [0,true]);
  P.E(`caseChooseGroup('board')`);

  console.log('\n-- the presenter view: Decision, and saving there --');
  click(P,'[data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.J('PR_ST.view')==='present'&&P.q('#casepres .td-root'));
  await until(()=>ops('putpdf').length>=1,8000);
  c('the strip has Decision (a check icon, the word; its name for a screen reader)', [!!P.q('[data-pr-decide] svg'),P.txt('[data-pr-decide]'),P.q('[data-pr-decide]').getAttribute('aria-label')], [true,'Decision','Record what we decided']);
  P.E('PR_ST.ctl.go(3)'); await until(()=>RTDB[P.J('PR_ST.P.r.room')]&&RTDB[P.J('PR_ST.P.r.room')].i===3);
  click(P,'[data-pr-decide]');
  c('Decision opens the form over the slides, the board chosen', [P.txt('[data-pr-sheet] h3'),P.q('[data-pr-sheet] .cd-tile.on').dataset.cdBody,!!P.q('#casepres .td-root')], ['Record what we decided','board',true]);
  sent.length=0;
  click(P,'[data-pr-sheet] [data-cd-out="approved"]'); setv(P,'[data-pr-sheet] [data-cd-date]',daysAgo(P,1));
  { const o=P.q('[data-pr-sheet] [data-cd-tc][value="o1"]')||P.q('[data-pr-sheet] [data-cd-tc][value="other"]'); o.checked=true; o.dispatchEvent(new P.w.Event('change')); }
  if(!P.q('[data-pr-sheet] [data-cd-tc][value="o1"]')) setv(P,'[data-pr-sheet] [data-cd-slot]','Tue evening');
  setv(P,'[data-pr-sheet] [data-cd-start]',daysAgo(P,-14));
  // (the words a decision puts on the slides and in the handout are section C's, merged with this part; here the link's last
  // copies are marked out of date, so the order of what is sent is checked whatever the slides say)
  P.E("PR_ST.P.r.hash='out-of-date'; PR_ST.P.r.pdfHash='out-of-date'");
  submit(P,'[data-pr-sheet]');
  await until(()=>/Phones have the new slides/.test(P.txt('[data-pr-sheet] [data-cd-msg]')||''),8000);
  const order=sent.map(x=>x.op).filter(o=>o==='update'||o==='putpdf');
  c('saving there: op update (the new words) then op putpdf (the new handout), with the key', [order[0],order.includes('putpdf'),order.indexOf('update')<order.indexOf('putpdf'),ops('update')[0]&&ops('update')[0].body.key===P.J('PR_ST.P.r.key')], ['update',true,true,true]);
  c('…the message: saved, what the slides now say, and that phones have them', /^Saved\. The slides and every PDF now say: Approved by the church board on .+\. Phones have the new slides and the updated handout\.$/.test(P.txt('[data-pr-sheet] [data-cd-msg]')), true);
  c('…the slides are redrawn on the slide he is on', P.J('PR_ST.ctl.index()'), 3);
  c('…the record: the board approved, with the agreed start', [P.J(`caseDecAll('food-pantry').board.outcome`),P.J(`caseDecAll('food-pantry').board.timing.start`)], ['approved',daysAgo(P,-14)]);
  click(P,'[data-pr-shx]');
  P.q('#casepres .td-bend').click(); P.q('#casepres .td-bend').click(); await until(()=>P.q('.cp-endcard'));
  c('the ended card: “Record what we decided” first (the main button), “Back to Make the Case” beside Remove now', [P.txt('.cp-endcard [data-pr-record]'),P.q('.cp-endcard [data-pr-record]').className,P.q('.cp-endcard [data-pr-done]').className],
    ['Record what we decided','cp-go','cp-b']);
  click(P,'.cp-endcard [data-pr-record]');
  c('…it opens the same form', !!P.q('[data-pr-sheet] [data-cd-form]'), true);
  click(P,'[data-pr-sheet] [data-cd-cancel]');
  c('Cancel after the end brings the end card back', !!P.q('.cp-endcard'), true);
  P.E('caseDraw3=(()=>{ const f=caseDraw3; return function(){ window.__d3=(window.__d3||0)+1; return f(); }; })()');
  click(P,'[data-pr-done]');
  c('closing the presenter view draws step 3 again (the card shows the board’s approval)', [P.E('window.__d3||0')>=1,/Church board · Approved/.test(P.txt('#cs-dec .cd-rows')||'')], [true,true]);

  console.log('\n-- caseDecPush: every open link of this ministry, and only those --');
  { const rooms=P.J('uChurch().caseRooms');
    // links of this ministry for other audiences (the team, the whole church in Spanish), one of another ministry, one gone
    const mk=async(deck)=>{ const r=await (await serve('/.netlify/functions/present',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'open',deck,mode:'follow'})})).json(); return r; };
    const baseDeck=P.J('CASE_ST.deck');
    const d2={...baseDeck,audience:{type:'team',group:P.E(`caseDefaultGroup('team','food-pantry')`)}}, d3={...baseDeck,lang:'es',audience:{type:'congregation',group:'congregation'}}, d4={...baseDeck,ministry:{id:'prayer-calendar',name:'x'}};
    const r2=await mk(d2), r3=await mk(d3), r4=await mk(d4), r5=await mk(d2);
    const put=(k,r)=>P.E(`(()=>{ uChurch().caseRooms[${JSON.stringify(k)}]={room:'${r.room}',key:'${r.key}',code:'${r.code}',url:'${r.url}',expires:${r.expires},respond:false,ended:null,hash:'x',v:1,live:true,mode:'follow',pdf:true}; uPersist(); })()`);
    put(`food-pantry|team|${d2.audience.group}|en`,r2); put('food-pantry|congregation|congregation|es',r3); put('prayer-calendar|board|board|en',r4); put(`food-pantry|team|${d2.audience.group}|en~${r5.room}`,r5);
    await serve('/.netlify/functions/present',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'remove',room:r5.room,key:r5.key})});
    P.E(`CASE_ST.sampleRooms={'food-pantry|board|board|en':{room:'SAMPLEroomSAMPLEroomSA',key:'${'s'.repeat(43)}',expires:Date.now()+864e5}}`);
    sent.length=0;
    const res=P.J(`(window.__pu=null,caseDecPush('food-pantry').then(x=>window.__pu=x),0)`); await until(()=>P.J('window.__pu'),15000);
    const upd=ops('update').map(x=>x.body.room);
    c('op update for this ministry’s other links (the team’s, the Spanish whole church’s), none for another ministry or the sample', [upd.includes(r2.room),upd.includes(r3.room),upd.includes(r4.room),upd.includes('SAMPLEroomSAMPLEroomSA')], [true,true,false,false]);
    c('…each built for its own audience and language', [ops('update').find(x=>x.body.room===r2.room).body.deck.audience.group,ops('update').find(x=>x.body.room===r3.room).body.deck.lang], [d2.audience.group,'es']);
    c('…and its handout sent too', [ops('putpdf').some(x=>x.body.room===r2.room),ops('putpdf').some(x=>x.body.room===r3.room)], [true,true]);
    c('…a link gone (removed) is forgotten, the rest go on', [P.J('window.__pu').failed>=1,P.J(`Object.keys(uChurch().caseRooms).some(k=>k.includes('~${r5.room}'))`)], [true,false]);
    const cnt=P.J(`(()=>{ const all=uChurch().caseRooms, base=all['food-pantry|team|${d2.audience.group}|en']; for(let i=0;i<9;i++) all['food-pantry|team|x'+i+'|en']={...base}; uPersist(); return Object.keys(all).length; })()`);
    sent.length=0; P.E('window.__pu=null; caseDecPush("food-pantry").then(x=>window.__pu=x)'); await until(()=>P.J('window.__pu'),20000);
    c('never more than six links at a time', ops('update').length+P.J('window.__pu').failed<=6, true);
    c('the gifts deck never takes a decision (no push, no record)', [P.J(`caseDecSave('gifts-first',{v:1,body:'team',date:'${daysAgo(P,1)}',outcome:'agreed'})`),P.J(`(window.__pg=null,caseDecPush('gifts-first').then(x=>window.__pg=x),0)`)===0], [null,true]); }

  console.log('\n-- the sample and a control device: no Decision --');
  { click(P,'[data-cs-act="sample"]'); await sleep(50);
    click(P,'#casep [data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.J('PR_ST.view')==='present');
    c('the sample’s presenter view: no Decision button', !!P.q('[data-pr-decide]'), false);
    P.q('#casepres .td-bend').click(); P.q('#casepres .td-bend').click(); await until(()=>P.q('.cp-endcard'));
    c('…its ended card: no Record row', !!P.q('.cp-endcard [data-pr-record]'), false);
    click(P,'[data-pr-done]'); click(P,'#casep [data-cs-back]');
    click(P,'[data-cs-act="present"]'); click(P,'[data-pr-start]'); await until(()=>P.J('PR_ST.view')==='present');
    const r=P.J('PR_ST.P.r');
    const CT=page(`https://pastorshub.org/#present=${r.room}.${r.key}`); await until(()=>CT.q('#casepres .td-m-present'));
    c('a control device (his private link): no Decision button (no case model there)', !!CT.q('[data-pr-decide]'), false);
    CT.w.close();
    click(P,'[data-pr-exit]'); click(P,'[data-pr-exkeep]'); }

  console.log('\n-- 44 px targets; Clear all --');
  { const css=html.slice(0,html.indexOf('</style>'));
    const rule=sel=>{ const m=new RegExp('(^|\\n)'+sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{([^}]*)\\}').exec(css); return m?m[2]:''; };
    c('the chips, the tiles, the fields, the ticks and the card’s buttons are at least 44 px high', [/min-height:44px/.test(rule('.cd-tile,.cd-chip')),/min-height:44px/.test(rule('.cd-lab input,.cd-lab select,.cd-vote input')),/min-height:44px/.test(rule('.cd-tick')),/min-height:44px/.test(rule('.cd-rowb')),/min-height:44px/.test(rule('.cd-path .btn,.cd-hint .btn,.cd-act .btn')),/min-height:44px/.test(rule('.cd-btns .btn'))],
      [true,true,true,true,true,true]);
    P.E(`capClearAll()`);
    c('Clear all empties the decisions and the approval path (the design, X16)', [P.J(`caseDecAll('food-pantry')`),P.J('uChurch().caseApproval||null')], [{},null]); }

  console.log('\n-- Spanish --');
  { const S=page('https://pastorshub.org/',{lang:'es',reg:REG}); await sleep(1200);
    setup(S,{ministry:'food-pantry',type:'board',group:'board'});
    c('the card in Spanish', [S.txt('#cs-dec .cd-k'),S.txt('#cs-dec .cd-path span'),S.txt('[data-cd-record]')], ['Cómo se está decidiendo','En Bucks County SDA: Equipo del ministerio › Junta directiva','Registrar lo que se decidió']);
    click(S,'[data-cd-record]'); click(S,'#cs-dec [data-cd-out="amended"]');
    c('the form in Spanish (the chips, the Amended line)', [S.qa('#cs-dec [data-cd-out]').map(b=>b.textContent),S.txt('#cs-dec [data-cd-amend]'),S.qa('#cs-dec .cd-f>legend').map(l=>l.textContent)],
      [['Aprobado','Con enmiendas','Remitido','No aprobado'],`Si cambió el monto, cámbielo con «${S.E("caseU('adjust')")}».`,['¿Quién decidió?','¿Qué se decidió?','La votación (opcional)','El día y el inicio acordados']]);
    // every hint and status the card can say, for every group: never "a el" or "de el"
    const bad=S.J(`(()=>{ const out=[]; const t=[]; for(const g of CASE_GROUPS){ const b=caseBodyOf(g.id); if(!b||b==='conference') continue;
        for(const body of CASE_BODIES){ const bi=cdBodyIn(body,body==='team'?g.id:null);
          t.push(cdU('prevFirst',{church:'X',body:bi}),cdU('makeFor',{body:bi}),cdU('nextBody',{status:'S',body:bi})); } }
      t.push(...Object.keys(CASE_DEC_UI).map(k=>caseT(CASE_DEC_UI[k])));
      return t.filter(s=>/\\b(a el|de el) /.test(s)); })()`);
    c('no “a el” or “de el” in any Spanish sentence of the card or the form, for every group', bad, []);
    c('no page errors in Spanish', S.errs, []);
    S.w.close(); }

  c('no page errors', P.errs, []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
