/* v10.42 part 3 — the Proposal to vote on (PROPOSAL.md §5, §9.1 "v43-proposal" 1–9; DESIGN.md P1–P3). The pastor asked for the
 * document a board votes on: the motion first (or the explanation first), why, the plan, the budget, the safeguards, the review, and an
 * "Action taken" block the clerk fills in. jsPDF injected, as tests/case-pdf.test.js.
 *  1. every audience (board, finance, business, a ministry team, the Pathfinder club, the conference), EN and ES, motion-first and
 *     explanation-first: a PDF of at most two pages, every line in its box, nothing unfilled, no member's name, no "AI", the running head
 *     and the church on every page, the foot with the date, the version and "Page n of N"
 *  2. the order of the sections; motion-first prints the motion twice, the same words; explanation-first once, at the end, with the action
 *  3. the motion's words (fixed dates, options, finance, business, team), EN and ES
 *  4. the heading: the status line from a record (with its vote) and as a line to fill in; the path; "From" with the team
 *  5. the action block: the boxes of the body, the recorded outcome ticked with its date and vote, the clerk's line never filled
 *  6. WHY reads the deck: a devotional idea prints no Census figure; the Scripture point is the opening's verse, word for word
 *  7. no active content (gifts.mjs pdfActive)
 *  8. the file name; SAMPLE on a sample
 *  9. one language in each document, whatever the page's
 */
const fs=require('fs'), path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const jspdf=require('jspdf');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,700));console.log('    want:',JSON.stringify(e).slice(0,400));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=15000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor'};
const NOW=Date.UTC(2026,8,28,15);
const NAMES=['Ana Lopez','Ben Carter','Cara Diaz','Dan Evans','Eve Fox'];
// netlify/functions/gifts.mjs pdfActive (copied): a name that makes a PDF act (script, launch, forms, links, embedded files)
const PDF_BLOCK=new Set(['JavaScript','Launch','EmbeddedFile','EmbeddedFiles','RichMedia','XFA','ObjStm','GoToR','GoToE','SubmitForm','ImportData','URI','Annots','AA','Link','AcroForm','Widget','GoTo','Named','Rendition','Sound','Movie','Image']);
function pdfActive(bytes){ const s=bytes.toString('latin1'); const re=/\/([^\x00\x09\x0a\x0c\x0d\x20/[\]()<>{}%]{2,48})/g; let m;
  while((m=re.exec(s))){ let n=m[1]; if(n.includes('#')) n=n.replace(/#([0-9A-Fa-f]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));
    if(PDF_BLOCK.has(n)) return true; if(n==='OpenAction'&&!/^[\x00\x09\x0a\x0c\x0d\x20]*\[/.test(s.slice(re.lastIndex,re.lastIndex+256))) return true; } return false; }

function page(lang){
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.jspdf=jspdf;
      w.localStorage.setItem('terrain-lang',lang||'en'); w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      w.fetch=async(u)=>{ u=String(u); const m=/^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if(m){ const f=path.join(ROOT,'ideas',m[1]+'.json'); if(!fs.existsSync(f)) return {ok:false,status:404,json:async()=>null}; const t=fs.readFileSync(f,'utf8'); return {ok:true,status:200,json:async()=>JSON.parse(t)}; }
        if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,errs,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`))};
}
function setup(P){
  const D=JSON.parse(JSON.stringify(FX.DATA));
  P.E(`(()=>{ const D=${JSON.stringify(D)}; D.M.tract.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.tract.moe)); D.M.county.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.county.moe));
    DATA=D; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)});
    const mk=b=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=b.includes(g.id)?4:1; }); return gfScores(a); };
    const M=(i,name,b)=>({id:'m'+i,name,gifts:mk(b),heart:{},confirmed:true,willing:true,hours:6,skills:[],source:'manual'});
    uChurch().members=[M(0,'Ana Lopez',['mercy','helps']),M(1,'Ben Carter',['serve','hosp']),M(2,'Cara Diaz',['mercy','giving']),M(3,'Dan Evans',['admin','leader']),M(4,'Eve Fox',['helps','serve'])];
    uPersist(); U_PEOPLE_CACHE=null; })()`);
}
// one proposal: its object, and its PDF with every drawn line (page, y, box) and the uncompressed file
const make=(P,id,t,g,o)=>P.J(`(()=>{ const o=${JSON.stringify(o||{})}; const m=caseModel(${JSON.stringify(id)},{type:${JSON.stringify(t)},group:${JSON.stringify(g)}},{now:${NOW},timing:o.timing||'options',lang:o.lang});
  const Pz=caseProposal(m,caseDeck(m),{order:o.order||'motion'}); const doc=caseProposalDoc(Pz,{jsPDF:window.jspdf.jsPDF,compress:false});
  const raw=doc.output(); const L=doc.__caseLog;
  return {Pz,pages:doc.getNumberOfPages(),raw:raw.slice(0,5),active:null,rawText:raw,log:L.map(l=>({p:l.p,y:Math.round(l.y),t:l.t,out:l.x0<l.bx0-0.6||l.x1>l.bx1+0.6||l.y>780}))}; })()`);

(async()=>{
  const P=page('en'); await until(()=>P.E('typeof caseModel==="function"&&typeof caseProposalDoc==="function"'));
  c('no boot errors', P.errs, []); setup(P);
  const VERSION=P.E('VERSION');

  console.log('\n-- 1. every audience, both languages, both orders --');
  const CASES=[['food-pantry','board','board'],['food-pantry','board','finance'],['food-pantry','board','business'],['food-pantry','team','community'],['pathfinders','team','pathfinders']];
  const all=[];
  for(const [id,t,g] of CASES) for(const lang of ['en','es']) for(const order of ['motion','explain']){ const r=make(P,id,t,g,{lang,order}); r.key=`${lang} ${g}/${id} ${order}`; r.lang=lang; r.g=g; r.t=t; r.order=order; all.push(r); }
  P.E(`planSave({church:'Bucks County SDA',members:120,leaders:6,workers:30,nights:18,perweek:4,date:'2027-09-11',kind:'both',seats:180,file:null,budget:12000,built:1,v:3}); uPersist();`);
  for(const lang of ['en','es']) for(const order of ['motion','explain']){ const r=make(P,'plan-series','conference','conference',{lang,order}); r.key=`${lang} conference ${order}`; r.lang=lang; r.g='conference'; r.t='conference'; r.order=order; all.push(r); }
  console.log('    pages: '+all.map(r=>r.key.replace(/ (motion|explain)$/,m=>m===' motion'?'':' (e)')+' '+r.pages).join(' · '));
  c(`${all.length} proposals: a PDF of one or two pages`, all.filter(r=>r.raw!=='%PDF-'||r.pages<1||r.pages>2).map(r=>r.key), []);
  c('…every line inside its box and the page', all.filter(r=>r.log.some(l=>l.out)).map(r=>r.key+': '+r.log.find(l=>l.out).t).slice(0,3), []);
  c('…nothing reads undefined, NaN, null or [object', all.filter(r=>/undefined|NaN|\bnull\b|\[object/.test(r.log.map(l=>l.t).join(' '))).map(r=>r.key), []);
  c('…no member’s name anywhere in the file', all.filter(r=>NAMES.some(n=>r.rawText.includes(n)||r.log.some(l=>l.t.includes(n)))).map(r=>r.key), []);
  c('…never "AI" or "IA"', all.filter(r=>/\b(AI|IA)\b/.test(r.log.map(l=>l.t).join(' '))).map(r=>r.key), []);
  c('…the running head (PROPOSAL / PROPUESTA, the church) on every page', all.filter(r=>{ for(let p=1;p<=r.pages;p++){ const top=r.log.filter(l=>l.p===p&&l.y<50).map(l=>l.t); if(!top.includes(r.lang==='es'?'PROPUESTA':'PROPOSAL')||!top.includes('Bucks County SDA')) return true; } return false; }).map(r=>r.key), []);
  c('…the foot: the date, the version and "Page n of N" on every page', all.filter(r=>{ for(let p=1;p<=r.pages;p++){ const f=r.log.filter(l=>l.p===p&&l.y>750).map(l=>l.t);
      if(!f.some(t=>t.includes(VERSION))||!f.includes((r.lang==='es'?'Página ':'Page ')+p+(r.lang==='es'?' de ':' of ')+r.pages)) return true; } return false; }).map(r=>r.key), []);
  c('…no active content in any of them (pdfActive)', all.filter(r=>pdfActive(Buffer.from(r.rawText,'latin1'))).map(r=>r.key), []);
  c('…the ministry team’s fits one page where the fixtures allow (the food pantry, English)', all.filter(r=>r.t==='team'&&r.lang==='en'&&r.g==='community').map(r=>r.pages), [1,1]);

  console.log('\n-- 2. the order --');
  const heads=r=>r.log.filter(l=>/^[A-ZÁÉÍÓÚÑ ,]{3,}$/.test(l.t)&&l.y>50&&l.y<750).sort((a,b)=>(a.p-b.p)||(a.y-b.y)).map(l=>l.t);   // in reading order
  { const b=all.find(r=>r.key==='en board/food-pantry motion'), e=all.find(r=>r.key==='en board/food-pantry explain');
    const H=heads(b), at=k=>H.indexOf(k);
    c('motion first: the motion, why, the plan, the budget, the safeguards, the review, then the motion again and the action taken', [at('MOTION')<at('WHY'),at('WHY')<at('THE PLAN'),at('THE PLAN')<at('BUDGET'),at('BUDGET')<at('SAFEGUARDS'),at('SAFEGUARDS')<at('REVIEW AND REPORTING'),at('REVIEW AND REPORTING')<at('THE MOTION, AS ABOVE'),at('ACTION TAKEN')>0], [true,true,true,true,true,true,true]);
    const txt=r=>r.log.map(l=>l.t).join(' ').replace(/\s+/g,' ');
    const n=s=>txt(b).split(b.Pz.motion.split(' ').slice(0,8).join(' ')).length-1;
    c('…the motion printed twice, the same words', [n(),txt(b).includes(b.Pz.motion.replace(/\s+/g,' '))], [2,true]);
    const He=heads(e);
    c('explanation first: why and the plan first, the motion once, at the end with the action taken', [He.indexOf('THE PLAN')<He.indexOf('MOTION'),He.includes('THE MOTION, AS ABOVE'),He.indexOf('MOTION')>He.indexOf('REVIEW AND REPORTING'),txt(e).split(e.Pz.motion.split(' ').slice(0,8).join(' ')).length-1], [true,false,true,1]);
    const fin=r=>{ const m=r.log.find(l=>/^(THE MOTION, AS ABOVE|MOTION|LA MOCIÓN, COMO ARRIBA|MOCIÓN)$/.test(l.t)&&l.p===r.pages), a=r.log.find(l=>/^(ACTION TAKEN|ACUERDO TOMADO|FINANCE COMMITTEE RECOMMENDATION|RECOMENDACIÓN DE LA COMISIÓN DE FINANZAS)$/.test(l.t)); return !!(m&&a&&a.p===m.p); };
    c('…the final band (the motion and the action taken) on one page, in every proposal', all.filter(r=>!fin(r)).map(r=>r.key), []); }

  console.log('\n-- 3. the motion --');
  // v10.45.0 review round (stale, the new intent): the built-ins the needs show are priced at their source (U_LINES_OWN, review #6): the food pantry $1,500 and $300 a month (a 6-week trial $2,100)
  { const m=(t,g,o)=>make(P,'food-pantry',t,g,o).Pz.motion;
    c('fixed dates (the board)', m('board','board',{timing:'fixed'}), 'To approve a trial of 6 weeks, from 13 Oct to 24 Nov: a real food pantry, on a schedule, with a named coordinator and a spending ceiling of $2,100 ($1,500 to start and $300 a month), paid from the local church budget, not tithe; with a written report at the review.');
    c('options (the board): the day and the start set with the calendar within two weeks', m('board','board',{}), 'To approve a trial of 6 weeks: a real food pantry, on a schedule, with a named coordinator and a spending ceiling of $2,100 ($1,500 to start and $300 a month), paid from the local church budget, not tithe; the team sets the day and the start date with the church calendar within two weeks and reports them to the board; with a written report at the review.');
    // v10.42.0 fix after review: "en dos semanas" means "after two weeks"; "within" is "en un plazo de"
    c('…Spanish', m('board','board',{lang:'es'}), 'Aprobar una prueba de 6 semanas: una despensa de alimentos de verdad, con horario fijo, con una persona coordinadora designada y un tope de gasto de $2,100 ($1,500 para empezar y $300 al mes), pagado con el presupuesto local, no con el diezmo; el equipo fija el día y la fecha de inicio con el calendario de la iglesia en un plazo de dos semanas y los informa a la junta; con un informe escrito en la revisión.');
    // v10.42.0 fix after review: plain words ("a ring-fenced line" is jargon): "a separate budget line" / "una partida aparte"
    c('the finance committee recommends a separate budget line', m('board','finance',{}), 'To recommend to the church board a separate budget line of $2,100, paid from the local church budget, not tithe, for a trial of 6 weeks ($1,500 to start and $300 a month): a real food pantry, on a schedule, with receipts to the treasurer and an itemised account at the review.');
    c('the business meeting adopts it into the year’s plan', m('board','business',{}), 'To adopt a trial of 6 weeks as part of this year’s plan: a real food pantry, on a schedule, with a named coordinator and a spending ceiling of $2,100 ($1,500 to start and $300 a month), paid from the local church budget, not tithe; the team sets the day and the start date with the church calendar within two weeks and reports them to the church board; with a report at the next business meeting.');
    // v10.42.0 fix after review (the length): "yes, they should be able to choose length": a team agrees a trial of the length it chooses
    c('a ministry team agrees, and brings it to the board', m('team','community',{}), 'To agree to a trial of the length we choose together (a 4-week pilot, a 6-week trial or a full season), on a day and start we agree together: a real food pantry, on a schedule, with a named coordinator, and to bring it to the church board for approval.'); }

  console.log('\n-- 4. the heading --');
  { const a=make(P,'food-pantry','board','board',{}).Pz;
    c('no record yet: the status is a line to fill in; the path; "From" the pastor with the team', [a.status.blank,a.status.text,a.path,/^Pastor Joshua Mura · Community Services/.test(a.memo&&a.memo.find?(a.memo.find(r=>r[0]==='FROM'||r.k==='from')||[])[1]||'':JSON.stringify(a))||/Pastor Joshua Mura · Community Services/.test(JSON.stringify(a))],
      [true,'Agreed by Community Services (Dorcas) on','Path: Ministry team › Church board (this proposal)',true]);
    P.E(`caseDecSave('food-pantry',{body:'team',group:'community',outcome:'agreed',date:'2026-09-20',vote:{for:5,against:0}});`);
    const b=make(P,'food-pantry','board','board',{}).Pz;
    c('…with the team’s record: its date and vote, and the path says so', [b.status.blank,b.status.text,b.path], [false,'Agreed by Community Services (Dorcas) on 20 Sep 2026 (5 for · 0 against)','Path: Ministry team (agreed 20 Sep 2026) › Church board (this proposal)']);
    const bs=make(P,'food-pantry','board','board',{lang:'es'}).Pz;
    c('…Spanish', [bs.status.text,bs.path], ['Acordado por los Servicios Comunitarios Adventistas (Dorcas) el 20 sep 2026 (5 a favor · 0 en contra)','Camino: Equipo del ministerio (acordado 20 sep 2026) › Junta directiva (esta propuesta)']);
    P.E(`caseDecDrop('food-pantry','team');`); }

  console.log('\n-- 5. the action taken --');
  { const a=make(P,'food-pantry','board','board',{}).Pz.action;
    c('the board’s boxes: Approved, Amended, Referred, Declined; none ticked; the clerk’s line', [a.boxes.map(b=>b.label),a.boxes.some(b=>b.checked),a.sig,a.date,a.vote], [['Approved','Amended','Referred','Declined'],false,'Clerk','',null]);
    P.E(`caseDecSave('food-pantry',{body:'board',outcome:'approved',date:'2026-09-22',vote:{for:9,against:1}});`);
    const r=make(P,'food-pantry','board','board',{}); const b=r.Pz.action;
    c('a recorded "Approved": its box ticked, its date and vote filled', [b.boxes.filter(x=>x.checked).map(x=>x.k),!!b.date,!!b.vote], [['approved'],true,true]);
    const i=r.log.findIndex(l=>l.t==='Clerk'||l.t==='Secretario(a) de la iglesia');
    c('…the clerk’s line is never filled (nothing is drawn on it)', [i>=0,r.log.slice(i+1).some(l=>l.p===r.log[i].p&&Math.abs(l.y-r.log[i].y)<3&&l.t!=='Clerk')], [true,false]);
    const f=make(P,'food-pantry','board','finance',{}).Pz.action;
    c('the finance committee’s boxes', f.boxes.map(b=>b.label), ['Recommended','Amended','Referred','Not recommended']);
    P.E(`caseDecDrop('food-pantry','board');`); }

  console.log('\n-- 6. why reads the deck --');
  { P.E(`window.__lib=false; (async()=>{ await libLoadIndex(); await libLoadTheme('prayer'); const raw=libFull('prayer-town-prayer-calendar'); uChurch().lib={[raw.id]:raw}; window.__lib=true; })();`);
    await until(()=>P.E('window.__lib'),30000);
    const r=P.J(`(()=>{ const m=caseModel('prayer-town-prayer-calendar',{type:'board',group:'board'},{now:${NOW},timing:'options'}); const d=caseDeck(m); const Pz=caseProposal(m,d,{});
      const doc=caseProposalDoc(Pz,{jsPDF:window.jspdf.jsPDF}); const t=doc.__caseLog.map(l=>l.t).join(' '); const v=d.slides[1].verse; return {census:/Census|Censo|\\d+%/.test(t),verse:Pz.why.find(w=>w.verse),dv:v}; })()`);
    c('a devotional idea (the town prayer calendar): no Census figure in its WHY', r.census, false);
    c('…its Scripture point is the opening’s verse, word for word', [r.verse&&r.verse.text.replace(/^“|”$/g,''),r.verse&&r.verse.ref], [r.dv.text,r.dv.ref]);
    P.E(`uChurch().lib={}; uPersist();`); }

  console.log('\n-- 8. the file name, the sample --');
  { const n=P.J(`(()=>{ const m=caseModel('food-pantry',{type:'board',group:'board'},{now:${NOW},timing:'options'}); return caseProposalName(caseProposal(m,caseDeck(m),{}),${NOW}); })()`);
    c('the file is named for the church, the idea, "proposal" and the body', n, 'Bucks-County-SDA-real-food-pantry-proposal-board-2026-09-28.pdf');
    const s=P.J(`(()=>{ const r=caseSample({now:${NOW},audience:{type:'board',group:'board'}}); const Pz=caseProposal(r.model,r.deck,{}); const doc=caseProposalDoc(Pz,{jsPDF:window.jspdf.jsPDF}); return {sample:Pz.sample,name:caseProposalName(Pz,${NOW}),marked:doc.__caseLog.some(l=>l.t==='SAMPLE')}; })()`);
    c('…a sample is marked SAMPLE on its pages and in its name', [s.sample,/SAMPLE/i.test(s.name),s.marked], [true,true,true]); }

  console.log('\n-- 9. one language in each --');
  { const r=P.J(`(()=>{ const out=[]; for(const [page,lang] of [['es','en'],['en','es']]){ LANG=page; const m=caseModel('food-pantry',{type:'board',group:'board'},{now:${NOW},timing:'options',lang}); const doc=caseProposalDoc(caseProposal(m,caseDeck(m),{}),{jsPDF:window.jspdf.jsPDF}); LANG='en';
      out.push(doc.__caseLog.map(l=>l.t).join(' ')); } return out; })()`);
    c('an English proposal made on a Spanish page has no Spanish, and the reverse', [/Preparado|Página|margen|Propuesta para votar/.test(r[0]),/Prepared|Page \d|margin of error|Proposal to vote on/.test(r[1])], [false,false]); }

  c('no page errors', P.errs.slice(0,3), []);
  P.w.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); });
