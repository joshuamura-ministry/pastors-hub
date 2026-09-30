// Make the Case handout (v10.39.0): casePdf / caseHandout / casePdfDoc build a US
// Letter PDF with jsPDF's own primitives (the jspdf devDependency is injected as
// window.jspdf; the page loads the same 2.5.1 build from cdnjs with SRI on first
// use). Checked for the three kinds of slideshow in English and Spanish, the
// sample, and a member's copy built from the deck alone: %PDF-, two pages (the
// case on the front, every figure on the back), every line inside its box and the
// page, no undefined / NaN, no member's name anywhere, SAMPLE (MUESTRA) on every
// page and in the file name, the QR code only when the slides have a live link,
// every figure with its tract and county values, margin of error, years and table,
// the itemised budget (never tithe), the risks with their sources, the verse, the
// prepared date and the version, Spanish accents and Spanish cost lines, no active
// content, and the file name (church, ministry, date; ASCII).
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const jspdf=require('jspdf');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,500));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const NAMES=['Ana Lopez','Ben Carter','Cara Diaz','Dan Evans','Eve Fox','Ivy Young','Hal Moss'];
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Allegheny East',role:'pastor'};
const saved=[];
jspdf.jsPDF.API.save=function(name){ saved.push({name,bytes:Buffer.from(this.output('arraybuffer')),doc:this}); return this; };

function page(lang,{survey=true}={}){
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.jspdf=jspdf;
      w.localStorage.setItem('terrain-lang',lang); w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      w.qrcode=(t,ec)=>{ let d=''; return {addData(s){ d=s; },make(){},getModuleCount:()=>29,isDark:(r,c2)=>((r*13+c2*7+d.length)%3)===0}; };
      w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,q:s=>w.document.querySelector(s),
    setup(){ w.eval(`(()=>{ const D=${JSON.stringify(FX.DATA)};
      D.M.tract.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.tract.moe)); D.M.county.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.county.moe));
      Object.assign(D.M.tract,{age5_9:420,age10_14:395,age15_17:236});
      DATA=D; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)});
      const mk=b=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=b.includes(g.id)?4:1; }); return gfScores(a); };
      const P=(i,name,b,h,x)=>({id:'m'+i,name,gifts:mk(b),heart:h,confirmed:true,willing:true,hours:6,skills:['kids'],source:'manual',...(x||{})});
      uChurch().members=[P(0,'Ana Lopez',['teach','shep','creative','helps'],{children:2,families:2}),P(1,'Ben Carter',['teach','shep','encour'],{children:1}),
        P(2,'Cara Diaz',['teach','creative','helps','mercy'],{}),P(3,'Dan Evans',['admin','leader','giving'],{poor:2}),P(4,'Eve Fox',['mercy','helps','serve','hosp'],{poor:2,families:1}),
        P(6,'Ivy Young',['teach','shep','creative','helps'],{children:2},{minor:true}),P(7,'Hal Moss',['teach','shep','helps','mercy','encour'],{children:2},{flags:{allHigh:true}})];
      uPersist(); })()`); } };
}
// Everything a PDF says, from the log of lines drawn and from the uncompressed file.
function facts(P,doc){
  const log=doc.__caseLog, n=doc.getNumberOfPages();
  const raw=Buffer.from(doc.output('arraybuffer')).toString('latin1');
  const text=log.map(l=>l.t).join('\n');
  const outside=log.filter(l=>l.x0<l.bx0-0.6||l.x1>l.bx1+0.6||l.x0<0||l.x1>612||l.y<20||l.y>780);
  const perPage=Array.from({length:n},(_,i)=>log.filter(l=>l.p===i+1).map(l=>l.t));
  return {n,raw,text,outside,perPage,log};
}
const docFor=(P,js)=>P.E(`(()=>{ const r=(${js}); window.__doc=casePdfDoc(r.H,{jsPDF:window.jspdf.jsPDF,compress:false}); return true; })()`)&&P.w.__doc;

(async()=>{ try{
  for(const lang of ['en','es']){
    console.log(`\n-- ${lang}: the three kinds --`);
    const P=page(lang); await sleep(1300); P.setup();
    for(const [type,group,mid] of [['board','board','pathfinders'],['team','youth','pathfinders'],['congregation','congregation','food-pantry'],['board','finance','bp-clinic']]){
      const tag=`${lang} ${type}/${group}/${mid}`;
      const m=P.J(`caseModel('${mid}',{type:'${type}',group:'${group}'})`);
      const doc=docFor(P,`{H:caseHandout(caseModel('${mid}',{type:'${type}',group:'${group}'}),null,{qrRows:gfQRRows(window.qrcode,'https://pastorshub.org/#watch=${'A'.repeat(22)}'),url:'https://pastorshub.org/#watch=${'A'.repeat(22)}',code:'K7M2QX'})}`);
      const F=facts(P,doc);
      c(`${tag}: a PDF, two pages (the case, then every figure)`, [F.raw.startsWith('%PDF-'),F.n], [true,2]);
      c(`${tag}: every line inside its box and the page`, F.outside.map(l=>l.t).slice(0,3), []);
      c(`${tag}: nothing reads undefined, NaN or null`, /undefined|NaN|\bnull\b|\[object/.test(F.text), false);
      c(`${tag}: no member’s name anywhere in the file`, NAMES.filter(nm=>F.raw.includes(nm)||F.text.includes(nm)), []);
      c(`${tag}: the running head on every page`, F.perPage.every(p=>p.includes(lang==='es'?'PRESENTAR EL CASO':'MAKE THE CASE')&&p.includes('Bucks County SDA')), true);
      c(`${tag}: prepared date, Terrain version and page n of 2 on every page`, F.perPage.every((p,i)=>p.some(t=>t.includes(P.E('VERSION'))&&t.includes(P.E('caseDate(new Date(),true)')))&&p.includes((lang==='es'?'Página ':'Page ')+(i+1)+(lang==='es'?' de 2':' of 2'))), true);
      c(`${tag}: the title and the QR code’s code on the front`, [F.perPage[0].some(t=>m.type==='board'?m.motion.headline.startsWith(t.split(' ')[0]):true),F.perPage[0].includes('K7M2QX')], [true,true]);
      const front=F.perPage[0].join(' '), back=F.perPage[1].join(' ');
      // The county as the stat slide writes it: one decimal below 10 (8.4%), as the member's handout (v10.39 review E2E-5).
      const cty=m.need.hero.kind==='pct'?P.E(`tdFmt(caseRound(${m.need.hero.county},1),'%')`):m.need.hero.countyDisplay;
      c(`${tag}: the lead figure large, with the county beside it (${cty})`, [front.includes(m.need.hero.display),front.includes(cty),front.includes(m.area.countyLabel)], [true,true,true]);
      /* v10.42 part 3: the handout tells the slides' story in their order (the pastor, SPEC-FOCUS C: "From the beginning to the end it
         has to have a focus, a beginning and an appeal at the end"): the goal, why and how it works on the front; who and what it
         takes, the budget, safeguards, timing and the appeal after it (NARRATIVE.md §9.1 as DESIGN N8 amends it). The five members
         with results are below half of the 135 in worship, so the gifts box is "Gifts first" (SPEC-FOCUS E). And the figures are only
         those the deck shows (the relevance rule), each with its table and years. */
      const all=F.perPage.join(' ');
      { const iHow=F.log.findIndex(l=>/^(HOW IT WORKS|CÓMO FUNCIONA)$/.test(l.t)), iCap=F.log.findIndex(l=>/\d+ (free|disponibles?) · /.test(l.t));
        c(`${tag}: who and what it takes (the capacity counts) after how it works, then "Gifts first" with the church's coverage`, [iHow>=0&&iCap>iHow,/\d+ (of the|de los) 135 (in worship|que asisten)/.test(all.replace(/\s+/g,' '))], [true,true]); }
      c(`${tag}: the first step and the review`, m.timeline.steps.every(s=>all.includes(s.title)), true);
      const HF=P.J(`caseHandout(caseModel('${mid}',{type:'${type}',group:'${group}'}),null,{}).figures`);
      c(`${tag}: every figure the deck shows (${HF.length}), with its table and years; none it does not`, [HF.length>=1,HF.every(s=>all.includes(s.table)&&all.includes(s.years)),HF.every(f=>m.sources.some(s=>s.table===f.table&&s.label===f.label))], [true,true,true]);
      c(`${tag}: margins of error beside them (ours · county)`, HF.filter(s=>s.moe).every(s=>all.includes(s.moe.replace(/\s*(points|puntos)$/,'')+' · '+s.countyMoe)), true);
      // v10.42 part 3: the handout follows the slides' story (NARRATIVE.md §9, DESIGN N8); at its tightest (a Spanish board handout,
      // level 3 drawn in order) the budget can close the front, so it is looked for in the whole handout
      c(`${tag}: the itemised budget, paid from the local budget, never tithe`, [m.ask.lines.length>0,lang==='es'?/no el diezmo/.test(F.perPage.join(' ')):/not tithe/.test(F.perPage.join(' '))], [true,true]);
      c(`${tag}: every risk, with its source`, m.risks.items.every(r=>back.includes(r.text.split(' ').slice(0,4).join(' '))), true);
      // v10.40: "Scripture in this case": every verse the slides carry, with its reference and
      // version (the words in full, except at the tightest level, where the references stand alone)
      { const vs=P.J(`caseHandoutVerses(caseDeck(caseModel('${mid}',{type:'${type}',group:'${group}'}))).map(v=>({ref:gfPdfClean(v.ref),text:gfPdfClean(v.text)}))`), B=back.replace(/\s+/g,' ').toUpperCase();   // as the PDF's fonts print them (… as ...)
        // v10.42 part 3: a longer story; when the back's blocks follow straight on after the front's (flowing), the references alone, as at the tightest level
        c(`${tag}: every slide's verse and its version on the back (${vs.length}; the reference in small capitals)`, [vs.length>=7,vs.every(v=>B.includes(v.ref.toUpperCase())),doc.__caseLevel>=3||(doc.__caseFlow&&doc.__caseLevel>=2)||vs.every(v=>B.includes(v.text.split(' ').slice(0,3).join(' ').toUpperCase()))], [true,true,true]); }
      // v10.40: "Here in {town}" on the front; the deck's Ellen White line (verified, with its credit) after the verses
      { const eg=P.J(`caseModel('${mid}',{type:'${type}',group:'${group}'}).egw`);
        // v10.42 part 3 (the relevance rule): "Here in {town}" only when the deck has that slide (a team's deck of the club carries
        // no place figure the idea's purpose does not allow, so, with no partner or direction mapped, it has none)
        const hasHere=P.J(`caseDeck(caseModel('${mid}',{type:'${type}',group:'${group}'})).slides.some(s=>s.type==='place')`);
        c(`${tag}: "${lang==='es'?'Aquí en':'Here in'} Warminster" on the front, "${lang==='es'?'La Escritura en este caso':'Scripture in this case'}" and the Ellen White line on the back`,
          [F.perPage[0].includes(lang==='es'?'AQUÍ EN WARMINSTER':'HERE IN WARMINSTER')===hasHere,F.perPage[1].includes(lang==='es'?'LA ESCRITURA EN ESTE CASO':'SCRIPTURE IN THIS CASE'),back.replace(/\s+/g,' ').toUpperCase().includes(P.E(`gfPdfClean(${JSON.stringify(eg.ref)})`).toUpperCase())], [true,true,true]); }
      c(`${tag}: counts only, and the under-18 note`, [back.includes(P.E('caseT(CASE_COPY.notes.counts)').split(' ')[0]),back.includes(P.E('caseT(CASE_COPY.notes.minors)').slice(0,20))], [true,true]);
      if(lang==='es'){
        c(`${tag}: accents kept, cost lines in Spanish, no English budget words`, [/Revisi[óo]n|Petici[óo]n|Página/.test(F.text),/Materials and preparation|Replacement supplies|allowance/.test(F.text)], [true,false]);
      }
      c(`${tag}: no active content (scripts, launch, links, forms, files)`, /\/JavaScript|\/JS\b|\/Launch|\/URI|\/AcroForm|\/EmbeddedFile|\/OpenAction\s*<<\s*\/S/.test(F.raw), false);
    }
    console.log(`\n-- ${lang}: the sample --`);
    { const S=P.J(`(()=>{ const s=caseSample({ministry:'pathfinders',audience:{type:'congregation',group:'congregation'}}); return {ok:s.ok,title:s.deck.title,own:s.own}; })()`);
      const doc=docFor(P,`(()=>{ const s=caseSample({ministry:'pathfinders',audience:{type:'congregation',group:'congregation'}}); return {H:caseHandout(s.model,s.deck,{sample:true})}; })()`);
      const F=facts(P,doc), mark=lang==='es'?'MUESTRA':'SAMPLE';
      c(`${lang} sample: ${mark} on every page (head and foot)`, F.perPage.map(p=>p.filter(t=>t===mark||t.startsWith(mark+' ·')).length>=2), Array(F.n).fill(true));
      c(`${lang} sample: two pages, every line in place, no names`, [F.n,F.outside.length,NAMES.filter(nm=>F.raw.includes(nm)).length], [2,0,0]);
      const mu=P.E('caseT(CASE_X.sampleFigures)');
      // (v10.40: the words are matched across line breaks; the handout's density level can wrap them anywhere)
      c(`${lang} sample: from his own survey the figures are real, so never called made up`, [S.own,F.perPage[1].includes(mu),F.perPage.some(p=>p.some(t=>t.includes(mark+' · '+mu))),/American Community Survey|Encuesta sobre la Comunidad/.test(F.text.replace(/\s+/g,' '))], [true,false,false,true]);
      c(`${lang} sample: the file name starts ${mark}`, P.E(`casePdfName(caseHandout(caseSample({ministry:'pathfinders'}).model,null,{sample:true}))`).startsWith(mark+'-Bucks-County-SDA-'), true); }
    P.w.close();
  }

  console.log('\n-- the sample with no survey: made up, and said so --');
  { const P=page('en'); await sleep(1300);
    const doc=docFor(P,`(()=>{ const s=caseSample({ministry:'pathfinders',audience:{type:'board',group:'board'}}); return {H:caseHandout(s.model,s.deck,{sample:true})}; })()`);
    const F=facts(P,doc);
    c('SAMPLE on every page; "Made-up sample figures" on the back and in the foot; the Census not named as their source',
      [F.perPage.every(p=>p.includes('SAMPLE')),F.perPage[1].includes('Made-up sample figures'),F.perPage.every(p=>p.some(t=>t.startsWith('SAMPLE · Made-up sample figures'))),/American Community Survey/.test(F.text)], [true,true,true,false]);
    c('…two pages, every line in place', [F.n,F.outside.length], [2,0]);
    P.w.close(); }

  console.log('\n-- from the button, and on a member’s phone --');
  { const P=page('en'); await sleep(1300); P.setup();
    P.E(`uChurch().proposalPrefs={ministry:'pathfinders',type:'board',group:'board'}; uPersist(); openTool('case'); render();`);
    saved.length=0; P.q('[data-cs-act="pdf"]').click();
    for(let i=0;i<100&&!saved.length;i++) await sleep(20);
    // Updated (v10.40 review): the audience is in the name, so the board's and the congregation's handouts no longer overwrite each other.
    c('Download PDF handout saves Bucks-County-SDA-Pathfinder-Adventurer-club-board-<date>.pdf', [saved.length,saved[0]&&saved[0].name], [1,'Bucks-County-SDA-Pathfinder-Adventurer-club-board-'+P.E(`caseISO(new Date())`)+'.pdf']);
    await sleep(20);
    c('…with no live link yet, no QR code, and the status says how to add one', [/no QR code yet: use Share link & QR first/.test(P.q('#cs-status').textContent),saved[0]&&saved[0].bytes.toString('latin1').startsWith('%PDF-')], [true,true]);
    c('the handout reads the model, never its private ask list', /Ana Lopez|Ben Carter/.test(saved[0].bytes.toString('latin1')), false);
    // with a live link, the QR code goes back to the slides
    P.E(`uChurch().caseRooms={}; uChurch().caseRooms[prRoomKey(caseCurrentDeck())]={room:'${'C'.repeat(22)}',key:'${'k'.repeat(43)}',code:'P3XN7M',url:'https://pastorshub.org/#watch=${'C'.repeat(22)}',expires:Date.now()+7*864e5}; uPersist();`);
    saved.length=0; P.q('[data-cs-act="pdf"]').click();
    for(let i=0;i<100&&!saved.length;i++) await sleep(20);
    const log=saved[0].doc.__caseLog;
    c('with a live link: the QR code, "Scan to open the slides" and the code on the front', [log.some(l=>l.p===1&&l.t==='P3XN7M'),log.some(l=>l.p===1&&l.t==='Scan to open the slides')], [true,true]);
    await sleep(20);
    c('…and the status names the file', /^Saved: Bucks-County-SDA-/.test(P.q('#cs-status').textContent), true);
    // a member's copy: the deck alone (what a phone holds), with the join slide's link
    const d=P.J(`(()=>{ const d=caseDeck(caseModel('pathfinders',{type:'congregation',group:'congregation'})); d.slides[0].qrUrl='https://pastorshub.org/#watch=${'D'.repeat(22)}'; d.slides[0].code6='H4TW9Q'; return d; })()`);
    const doc=docFor(P,`{H:caseHandout(null,${JSON.stringify(d)},{qrRows:gfQRRows(window.qrcode,'x')})}`);
    const F=facts(P,doc);
    c('a member’s copy from the deck alone: two pages, the code, the lead figure, every line in place, no names',
      [F.n,F.perPage[0].includes('H4TW9Q'),F.text.includes(d.slides.find(s=>s.type==='stat').headline.split(' ').slice(0,3).join(' ')),F.outside.length,NAMES.filter(nm=>F.raw.includes(nm)).length], [2,true,true,0,0]);
    c('…with the three sizes of yes, and the verse', [/THREE SIZES OF YES/.test(F.text),F.text.toUpperCase().includes(d.slides.find(s=>s.type==='verse').ref.toUpperCase())], [true,true]);
    saved.length=0; await P.E(`casePdf(null,{deck:${JSON.stringify({...d,title:'SAMPLE · '+d.title})}})`);
    c('a member’s copy of the sample is marked SAMPLE too', [saved[0]&&saved[0].name.startsWith('SAMPLE-'),saved[0]&&saved[0].doc.__caseLog.filter(l=>l.t==='SAMPLE').length>=2], [true,true]);
    c('no errors', P.errs, []);
    P.w.close(); }

  console.log('\n-- the file name --');
  { const P=page('es'); await sleep(1300); P.setup();
    const nm=P.E(`casePdfName(caseHandout(caseModel('food-pantry',{type:'board',group:'board'}),null,{}),new Date(2026,8,28))`);
    // Updated (v10.40 review): the audience ("junta") before the date.
    c('Spanish: church, the ministry’s name up to its comma without its article, the audience, the date; ASCII only', [nm,/^[A-Za-z0-9-]+\.pdf$/.test(nm)], ['Bucks-County-SDA-despensa-de-alimentos-de-verdad-junta-2026-09-28.pdf',true]);
    c('accented names lose only their accents', P.E(`casePdfName({church:'Iglesia Adventista de Peñuelas',ministry:'Clínica de presión arterial',labels:{sample:'MUESTRA'},sample:true},new Date(2026,0,5))`), 'MUESTRA-Iglesia-Adventista-de-Penuelas-Clinica-de-presion-arterial-2026-01-05.pdf');
    P.w.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
