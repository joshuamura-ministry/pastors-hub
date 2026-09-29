// Make the Case, completeness round (v10.39.0), against the approved blueprint:
//  · "the emphasis, the ask and the questions answered change with the group": each group's
//    own opening words, closing words and Ellen White line (CASE_GROUPS frame / close /
//    quote), with how many the trial reaches against how many need it and what counts as
//    success at the review, were computed by caseBuild and shown nowhere. The builder now
//    shows them to the pastor ("What to say · <group>"), never on a slide;
//  · a board member's two remaining questions (how many it reaches against how many need
//    it, and what counts as success) are on the board's handout, room allowing, without
//    ever pushing the front onto a second page;
//  · the ask slide shown to elders, deacons, the finance or the nominating committee no
//    longer says "what we are asking the board for": it lists what the trial needs.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const jspdf=require('jspdf');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,500));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Allegheny East',role:'pastor'};
const NOW=Date.UTC(2026,8,28,15);
const NAMES=['Ana Lopez','Ben Carter','Cara Diaz','Dan Evans','Eve Fox'];
function page(lang){
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.jspdf=jspdf;
      w.localStorage.setItem('terrain-lang',lang); w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      w.qrcode=(t,ec)=>{ let d=''; return {addData(s){ d=s; },make(){},getModuleCount:()=>29,isDark:(r,c2)=>((r*13+c2*7+d.length)%3)===0}; };
      w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,D:w.document,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)]};
}
function setup(P,o){
  o=o||{};
  P.E(`(()=>{ const D=${JSON.stringify(FX.DATA)};
    D.M.tract.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.tract.moe)); D.M.county.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.county.moe));
    Object.assign(D.M.tract,{age5_9:420,age10_14:395,age15_17:236});
    DATA=D; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)});
    const mk=b=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=b.includes(g.id)?4:1; }); return gfScores(a); };
    const P=(i,name,b,h,x)=>({id:'m'+i,name,gifts:mk(b),heart:h,confirmed:true,willing:true,hours:6,skills:['kids'],source:'manual',...(x||{})});
    uChurch().members=[P(0,'Ana Lopez',['teach','shep','creative','helps'],{children:2,families:2}),P(1,'Ben Carter',['teach','shep','encour'],{children:1}),
      P(2,'Cara Diaz',['teach','creative','helps','mercy'],{}),P(3,'Dan Evans',['admin','leader','giving'],{poor:2}),P(4,'Eve Fox',['mercy','helps','serve','hosp'],{poor:2,families:1})];
    ${o.prefs?`uChurch().proposalPrefs=${JSON.stringify(o.prefs)};`:''}
    U_PEOPLE_CACHE=null; uPersist(); openTool('case'); render(); })()`);
}
const sayOf=(P,sel)=>{ const d=P.q(sel||'#cs-s3 .cs-say'); if(!d) return null;
  return {sum:d.querySelector('summary').textContent, rows:[...d.querySelectorAll('dt')].map((t,i)=>[t.textContent,d.querySelectorAll('dd')[i].textContent.replace(/\s+/g,' ').trim()])}; };

(async()=>{ try{
  console.log('\n-- the builder: what to say to this group (EN) --');
  const P=page('en'); await sleep(1300);
  setup(P,{prefs:{ministry:'pathfinders',type:'board',group:'elders'}});
  await sleep(50);
  const s=sayOf(P);
  c('a "What to say · Elders" block sits in step 3, closed, beside "Questions you may hear"', [!!s,s&&s.sum,P.q('#cs-s3 .cs-say').open,!!P.q('#cs-s3 .cs-say + .cs-qs')], [true,'What to say · Elders',false,true]);
  c('…with the five things, in order', s.rows.map(r=>r[0]), ['To open','A line from Ellen White','How many it reaches','What counts as success','To close']);
  c('the elders’ own opening words (their frame)', s.rows[0][1], 'The people around us need the gospel as much as we do. Those who lead this church can go first, and show the rest of us the way.');
  c('their Ellen White line (9T 116.4), with its reference', [/^“?The work of God in this earth can never be finished until the men and women comprising our church membership rally to the work/.test(s.rows[1][1]),/Ellen G\. White · Testimonies for the Church, vol\. 9, p\. 117$/.test(s.rows[1][1])], [true,true]);   // v10.41: p. 117, the page this sentence is printed on (research VERSES.md: the page break falls inside 9T 116.4)
  c('how many it reaches against how many need it', s.rows[2][1], '16 places would be about 1 in 93 of the children around us: a first step.');
  c('what counts as success for the elders', s.rows[3][1], 'Every request for prayer or study that came freely was answered within a week, by a named person.');
  c('their closing words', s.rows[4][1], 'A congregation goes more readily where its elders have already been.');
  c('it says it is for him, not on the slides', /For you, not on the slides/.test(P.q('#cs-s3 .cs-say').textContent), true);
  { const r=P.J(`(()=>{ const m=caseModel('pathfinders',{type:'board',group:'elders'},{now:${NOW}}); const d=JSON.stringify(caseDeck(m)); return [m.frame,m.close,m.quote.text,m.timeline.win].map(t=>d.includes(t)); })()`);
    c('none of the four is on a slide (the deck the phones get)', r, [false,false,false,false]); }
  { const r=P.J(`(()=>{ const m=caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW}}); const d=document.createElement('div'); d.innerHTML=caseSayHTML(m); return [...d.querySelectorAll('dd')].map(x=>x.textContent); })()`);
    c('the board gets its own words: PK 637.2 (not on a slide), and "approve, approve it smaller, or set a date"', [/accuracy and a minuteness that astonished his hearers/.test(r[1]),/approve it smaller, or set a date to decide/.test(r[4])], [true,true]); }
  { const r=P.J(`(()=>{ const m=caseModel('pathfinders',{type:'congregation',group:'congregation'},{now:${NOW}}); const d=document.createElement('div'); d.innerHTML=caseSayHTML(m);
      return {dts:[...d.querySelectorAll('dt')].map(x=>x.textContent),closeQ:m.closeQuote.text,quote:m.quote.text,html:d.innerHTML}; })()`);
    c('an Ellen White line a slide already carries is not repeated (the congregation’s close quote)', [r.dts.includes('A line from Ellen White')===(r.quote!==r.closeQ),r.html.includes(r.closeQ)&&r.quote!==r.closeQ], [true,false]); }
  { const r=P.J(`(()=>{ const bad=[]; let n=0, reach=0; const ids=['pathfinders','food-pantry','bp-clinic','vbs','welcome-table','interpreter-bank','community-dinner'];
      for(const lang of ['en','es']) for(const id of ids) for(const g of CASE_GROUPS){ const m=caseModel(id,{type:g.type,group:g.id},{now:${NOW},lang}); if(!m.ok) continue; n++;
        const prev=LANG; LANG=lang; let h; try{ h=caseSayHTML(m); }finally{ LANG=prev; }
        const d=document.createElement('div'); d.innerHTML=h; const dt=d.querySelectorAll('dt').length;
        if(/undefined|\\bnull\\b|NaN|\\{[a-zA-Z]/.test(d.textContent)||dt<3||!d.querySelector('summary')) bad.push(lang+'/'+id+'/'+g.id);
        if(/reaches|alcanza/.test(d.textContent)) reach++; }
      return {n,bad,reach}; })()`);
    c(`every group, seven ministries, both languages (${r.n} models): three to five rows, no placeholder left`, [r.n>300,r.bad], [true,[]]);
    c('…and "how many it reaches" wherever the lead figure counts people', r.reach>r.n/2, true); }
  c('no member’s name in the block', NAMES.filter(n=>P.q('#cs-s3 .cs-say').textContent.includes(n)), []);
  c('the block’s CSS: the quote in italics, its reference below', [/\.cs-say dd q\{font-style:italic\}/.test(html),/\.cs-say dd cite\{display:block;/.test(html)], [true,true]);

  console.log('\n-- the ask slide of a board-type deck --');
  { const r=P.J(`['board','elders','deacons','finance','nominating'].map(g=>caseDeck(caseModel('pathfinders',{type:'board',group:g},{now:${NOW}})).slides.find(s=>s.type==='ask').headline)`);
    c('the board: "what we are asking the board for"; elders, deacons, finance, nominating: "what the trial needs"', r,
      ['Exactly what we are asking the board for','Exactly what the trial needs','Exactly what the trial needs','Exactly what the trial needs','Exactly what the trial needs']); }
  { const r=P.J(`['board','nominating'].map(g=>caseDeck(caseModel('pathfinders',{type:'board',group:g},{now:${NOW},lang:'es'})).slides.find(s=>s.type==='ask').headline)`);
    c('ES: "lo que pedimos a la junta" / "lo que necesita la prueba"', r, ['Exactamente lo que pedimos a la junta','Exactamente lo que necesita la prueba']); }
  { const r=P.J(`(()=>{ const m=caseModel('pathfinders',{type:'board',group:'nominating'},{now:${NOW}}); return [m.motion.headline,caseDeck(m).slides.find(s=>s.type==='motion').headline]; })()`);
    c('…while the group’s own part stays on the motion slide ("Name a coordinator: …")', r.map(t=>/^Name a coordinator: /.test(t)), [true,true]); }

  console.log('\n-- the board’s handout: success and reach, room allowing --');
  const docFor=js=>P.E(`(()=>{ window.__doc=casePdfDoc(${js},{jsPDF:window.jspdf.jsPDF,compress:false}); return true; })()`)&&P.w.__doc;
  const URL='https://pastorshub.org/#watch='+'A'.repeat(22);
  const H=(mid,g,t)=>`caseHandout(caseModel('${mid}',{type:'${t||'board'}',group:'${g}'},{now:${NOW}}),null,{qrRows:gfQRRows(window.qrcode,'${URL}'),url:'${URL}',code:'K7M2QX'})`;
  { const h=P.J(H('pathfinders','deacons'));
    c('H.win is the group’s measure; H.reach the reach line', [h.win,h.reach], ['The room ready every time, the rota kept, and returning visitors greeted by name.','16 places would be about 1 in 93 of the children around us: a first step.']);
    const doc=docFor(H('pathfinders','deacons')), log=doc.__caseLog, p1=log.filter(l=>l.p===1).map(l=>l.t);
    // v10.40: "Here in {town}" joined the front (the pastor asked for the place in the handout), so
    // at the level the handout is drawn there is no room left for these two; they are still "room
    // allowing": drawn one level tighter, where room is left, after the review line.
    c('deacons: "Here in Warminster" is on the front', p1.includes('HERE IN WARMINSTER'), true);
    { const lvOf=l=>P.E(`(()=>{ window.__d1=casePdfDocAt(${H('pathfinders','deacons')},{jsPDF:window.jspdf.jsPDF,compress:false},${l}); return true; })()`)&&P.w.__d1;
      const d1=[1,2,3].map(lvOf).find(d=>d.__caseLog.some(l=>l.p===1&&/a first step\.$/.test(l.t)))||lvOf(3), q1=d1.__caseLog.filter(l=>l.p===1).map(l=>l.t);
      c('deacons (room left): both on the front, after the review line', [q1.includes('WHAT COUNTS AS SUCCESS'),q1.some(t=>/returning visitors greeted by name/.test(t)),q1.some(t=>/1 in 93 of the children around us: a first step\./.test(t)),
        q1.findIndex(t=>/^Review on /.test(t))<q1.indexOf('WHAT COUNTS AS SUCCESS'),d1.__caseFront], [true,true,true,true,1]); }
    c('…two pages, the front one page, every line in its box and above the footer', [doc.getNumberOfPages(),doc.__caseFront,log.filter(l=>l.x0<l.bx0-0.6||l.x1>l.bx1+0.6||l.y>780).length], [2,1,0]); }
  { const r=P.E(`(()=>{ const out=[]; for(const id of ['pathfinders','food-pantry','vbs','bp-clinic','community-dinner','welcome-table']) for(const g of ['board','elders','deacons','finance','nominating']){
      const h=caseHandout(caseModel(id,{type:'board',group:g},{now:${NOW}}),null,{qrRows:gfQRRows(window.qrcode,'${URL}'),url:'${URL}',code:'K7M2QX'});
      const a=casePdfDoc(h,{jsPDF:window.jspdf.jsPDF,compress:false}), b=casePdfDoc({...h,win:'',reach:''},{jsPDF:window.jspdf.jsPDF,compress:false});
      out.push([a.__caseLevel===b.__caseLevel,a.getNumberOfPages()===b.getNumberOfPages(),a.__caseFront===1,a.__caseLog.filter(l=>l.p===1).every(l=>l.y<=780)]); }
      return JSON.stringify(out); })()`);
    const o=JSON.parse(r);
    c(`30 board handouts: the new lines never change the level chosen, the pages, or push the front over`, [o.length,o.filter(x=>!x.every(Boolean)).length], [30,0]); }
  // v10.40: the front carries "Here in {town}" too and is drawn one level tighter, which leaves more
  // room at the foot: the line that cannot fit is longer now (the intent is unchanged)
  { const r=P.J(`(()=>{ const h=caseHandout(caseModel('pathfinders',{type:'board',group:'board'},{now:${NOW}}),null,{}); h.win='x '.repeat(3000); const d=casePdfDoc(h,{jsPDF:window.jspdf.jsPDF,compress:false});
      return [d.getNumberOfPages(),d.__caseFront,d.__caseLog.some(l=>l.t==='WHAT COUNTS AS SUCCESS')]; })()`);
    c('a success line too long for the room left is left out, never drawn onto a new page', r, [2,1,false]); }
  { const r=P.J(`['team','congregation'].map(t=>{ const h=caseHandout(caseModel('pathfinders',{type:t,group:t==='team'?'youth':'congregation'},{now:${NOW}}),null,{}); return [h.win||'',h.reach||'']; })`);
    c('team and congregation handouts: unchanged (their front ends with three sizes of yes)', r, [['',''],['','']]); }
  { const P2=page('es'); await sleep(1300); setup(P2,{prefs:{ministry:'food-pantry',type:'board',group:'nominating'}}); await sleep(50);
    const s2=sayOf(P2);
    c('ES builder: "Qué decir · Comisión de nombramientos" with its five labels', [s2&&s2.sum,s2&&s2.rows.map(r=>r[0])], ['Qué decir · Comisión de nombramientos',['Para empezar','Una cita de Elena G. de White','A cuántos alcanza','Qué se considerará un éxito','Para cerrar']]);
    c('ES: the note says it is for him', /Para usted, no para las diapositivas/.test(P2.q('#cs-s3 .cs-say').textContent), true);
    const doc=P2.E(`(()=>{ const U='${URL}'; window.__d=casePdfDoc(caseHandout(caseModel('food-pantry',{type:'board',group:'nominating'},{now:${NOW}}),null,{qrRows:gfQRRows(window.qrcode,U),url:U,code:'K7M2QX'}),{jsPDF:window.jspdf.jsPDF,compress:false}); return true; })()`)&&P2.w.__d;
    // v10.40: the lines are room allowing (the front carries "Aquí en {town}" now): the first level
    // with room left for them draws them, in Spanish
    const lvs=[0,1,2,3].map(l=>P2.E(`(()=>{ const U='${URL}'; const d=casePdfDocAt(caseHandout(caseModel('food-pantry',{type:'board',group:'nominating'},{now:${NOW}}),null,{qrRows:gfQRRows(window.qrcode,U),url:U,code:'K7M2QX'}),{jsPDF:window.jspdf.jsPDF,compress:false},${l});
      return JSON.stringify({front:d.__caseFront,p1:d.__caseLog.filter(l=>l.p===1).map(l=>l.t)}); })()`)).map(x=>JSON.parse(x)).filter(x=>x.front===1&&x.p1.includes('QUÉ SE CONSIDERARÁ UN ÉXITO'));
    c('ES handout: "QUÉ SE CONSIDERARÁ UN ÉXITO" and "…un primer paso." (where there is room), two pages', [lvs.length>0,lvs.length>0&&lvs[0].p1.some(t=>/un primer paso\.$/.test(t)),doc.getNumberOfPages(),doc.__caseLog.some(l=>l.p===1&&/^AQUÍ EN /.test(l.t))], [true,true,2,true]);
    c('ES: no errors', P2.errs, []);
    P2.w.close(); }

  c('no errors on the page', P.errs, []);
  P.w.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
