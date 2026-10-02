// v10.43.0 · connection cards, the printed card (CONNECT §5, moved here from the design's cn-card-pdf.test.mjs, 18 checks) +
// DESIGN C2.5: the tinted band with the motif, the framed QR with "Scan to stay in touch", the motif drawn as vector paths,
// still no links, annotations, forms or images (S18), the worst card a pastor can make still fits. jsPDF 2.5.1 in node.
// The pastor: "make sure the connection cards are beautiful and attractive, designed well, not just plain text."
const {load}=require('./connect-blocks.js');
const {jsPDF}=require('jspdf');
const T=load(), P=T;
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,300));fail++}else pass++};
// gifts.mjs / present.mjs's rule for a PDF that may be shared: no scripts, launch actions, embedded files, object streams,
// links, annotations, forms, images, or opening action but jsPDF's own page view (copied).
const PDF_BLOCK=new Set(['JavaScript','Launch','EmbeddedFile','EmbeddedFiles','RichMedia','XFA','ObjStm','GoToR','GoToE','SubmitForm','ImportData','URI','Annots','AA','Link','AcroForm','Widget','GoTo','Named','Rendition','Sound','Movie','Image']);
function pdfActive(bytes){ const s=bytes.toString('latin1'); const re=/\/([^\x00\x09\x0a\x0c\x0d\x20/[\]()<>{}%]{2,48})/g; let m;
  while((m=re.exec(s))){ let n=m[1]; if(n.includes('#')) n=n.replace(/#([0-9A-Fa-f]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));
    if(PDF_BLOCK.has(n)) return true; if(n==='OpenAction'&&!/^[\x00\x09\x0a\x0c\x0d\x20]*\[/.test(s.slice(re.lastIndex,re.lastIndex+256))) return true; } return false; }
try{
const qr=n=>Array.from({length:n},(_,r)=>Array.from({length:n},(_,k)=>((r*7+k*3)%5)<2?'1':'0').join(''));
const I=(id,n,es,themes,kids)=>({id,builtin:true,themes,ages:'all',minors:false,kids:!!kids,name:{en:n,es},text:n});
const HF=JSON.parse(JSON.stringify(T.cnTailor(I('health-expo','Community health fair','Feria de salud comunitaria',['health']),{cadence:'event',next:{name:{en:'Plant-based cooking school',es:'Escuela de cocina a base de plantas'}},church:'Sampleton SDA (SAMPLE)',day:'2026-10-18',lang:'both'})));
const AB=JSON.parse(JSON.stringify(Object.assign(T.cnTailor({id:'abuse-x',builtin:false,themes:['abuse-survivors'],ages:'adults',minors:false,kids:false,name:{en:'Support evening',es:'Noche de apoyo'},text:''},{cadence:'event',church:'Sampleton SDA (SAMPLE)'}),{partner:{name:'County women’s center',line:'215-555-0101'}})));
const url='https://pastorshub.org/#connect=HK7QM4RTZP';
const raw=d=>Buffer.from(d.output('arraybuffer'));
const txt=d=>raw(d).toString('latin1');
// the words as a reader sees them: every shown string, in order, lines joined by a space
const words=d=>[...txt(d).matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map(m=>m[1].replace(/\\([()\\])/g,'$1')).join(' ').replace(/\xa0/g,' ');   // (a heading's no-break spaces read as spaces)
const rgbOp=(h,op)=>{ const v=[0,2,4].map(i=>parseInt(h.slice(1+i,3+i),16)/255); return v.map(x=>(Math.round(x*1000)/1000).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')).join(' ')+' '+op; };
// a colour operator in the content (jsPDF rounds each operand to 2–3 places)
const has=(s,h,op)=>{ const v=[0,2,4].map(i=>parseInt(h.slice(1+i,3+i),16)/255);
  return [...s.matchAll(new RegExp('([\\d.]+) ([\\d.]+) ([\\d.]+) '+op+'\\b','g'))].some(m=>[1,2,3].every(i=>Math.abs(parseFloat(m[i])-v[i-1])<0.006)); };

let d=P.cnPdfDoc(jsPDF,HF,{format:'half',lang:'en',url,qrRows:qr(29)});
c('half: one US Letter page, landscape', [d.getNumberOfPages(),Math.round(d.internal.pageSize.getWidth()),Math.round(d.internal.pageSize.getHeight())], [1,792,612]);
c('half: two cards (the heading twice)', (words(d).match(/Thank you for/g)||[]).length, 2);
c('half: the link without https://', txt(d).includes('pastorshub.org/#connect=HK7QM4RTZP')&&!txt(d).includes('https://'), true);
// v10.43 (review, 1 Oct 2026): two columns of choices: a long one wraps, so it is read as the words a reader sees
c('half: every choice on the card, none that is off', [words(d).includes('Tell me about the plant-based cooking school'),words(d).includes('Tell me about other events')], [true,false]);
c('half: the consent line, word for word', words(d).includes('The church may contact me about what I ticked. I can ask to be removed at any time.'));
c('half: the adults line, the kids line, the promise', ['I am 18 or older','Please don','Never shared or sold'].every(w=>txt(d).includes(w)));
c('no active content, no image, no link', pdfActive(raw(d)), false);
// DESIGN C2.5: the look on paper
{ const s=txt(d);
  c('C2.5: the band in the look\'s tint (health #E7F5F0), its frame and rules in the look\'s line (#0E8F6E)', [has(s,'#E7F5F0','rg'),has(s,'#0E8F6E','RG')], [true,true]);
  c('C2.5: the heading and "Scan to stay in touch" in the look\'s ink (#0B6E55)', [has(s,'#0B6E55','rg'),(words(d).match(/Scan to stay in touch/g)||[]).length], [true,2]);
  c('C2.5: the church in small capitals, spaced', /SAMPLETON SDA \(SAMPLE\)/.test(words(d))&&/\d(\.\d+)? Tc/.test(s));
  c('C2.5: the motif drawn as vector curves (no image): many Bézier segments', (s.match(/ c\n/g)||[]).length>60);
  c('C2.5: "Or fill this in and hand it back" after a dotted rule', words(d).includes('Or fill this in and hand it back')&&/\[0\.01 [\d.]+\] 0\.? d/.test(s));
  c('C2.5: the QR in a white frame: a rounded rectangle filled white and edged in the look\'s line', /(^|\n)1\.? g\b/.test(s)&&has(s,'#0E8F6E','RG')); }
{ const audit=[]; P.cnPdfDoc(jsPDF,HF,{format:'half',lang:'en',url,qrRows:qr(29),audit});
  c('C2.3: the heading in the script face (or its fallback), the event and "Scan…" in the display face (or its fallback)', [audit.some(a=>a.t.replace(/\u00a0/g,' ').startsWith('Thank you')&&a.color===T.CN_LOOK.health.ink),audit.some(a=>/^Community health fair · Sunday, October 18$/.test(a.t))], [true,true]); }
d=P.cnPdfDoc(jsPDF,HF,{format:'post',lang:'both',url,qrRows:qr(29)});
// v10.43 (review, 1 Oct 2026): a postcard is two-sided: the band and the QR on the front, the write-in form on the back; both languages = an English card
// and a Spanish card (was: English front, Spanish back, each with everything at 4.4 pt)
c('postcard, both languages: four 4 × 6 pages (an English card and a Spanish card, each front and back)', [d.getNumberOfPages(),Math.round(d.internal.pageSize.getWidth()),Math.round(d.internal.pageSize.getHeight())], [4,288,432]);
c('postcard: no active content', pdfActive(raw(d)), false);
c('postcard in Spanish: "Escanee para seguir en contacto"; the front says the form is on the back', [words(d).includes('Escanee para seguir en contacto'),words(d).includes('No phone? Fill in the back and hand it in.'),words(d).includes('¿Sin teléfono? Llene el reverso y entréguela.')], [true,true,true]);
d=P.cnPdfDoc(jsPDF,HF,{format:'half',lang:'both',url,qrRows:null});
c('no QR (the code could not load): the link alone, bigger', [txt(d).includes('pastorshub.org/#connect=HK7QM4RTZP'),pdfActive(raw(d)),words(d).includes('Scan to stay in touch')], [true,false,false]);
d=P.cnPdfDoc(jsPDF,HF,{format:'half',lang:'both',url,qrRows:qr(29)});
c('bilingual: every line in English and in Spanish (heading, choices, consent)', ['¡Gracias por venir!','Quiero saber más de la escuela de cocina a base de plantas','La iglesia puede comunicarse conmigo sobre lo que marqué.'].every(w=>words(d).includes(w)));
// v10.43 (review, 1 Oct 2026): "a bilingual layout option that stays balanced": one language a side, the same type and ink (it set the Spanish under the English,
// smaller, grey and italic, down to 4.99 pt): page 1 English, page 2 Spanish, each saying where the other is
{ const audit=[]; const dd=P.cnPdfDoc(jsPDF,HF,{format:'half',lang:'both',url,qrRows:qr(29),audit});
  const en=audit.find(a=>a.t==='Send me the recipe booklet'), es=audit.find(a=>a.t==='Envíenme el recetario');
  c('bilingual half card: two pages, English then Spanish, each saying where the other language is', [dd.getNumberOfPages(),words(dd).includes('En español al reverso'),words(dd).includes('In English on the back')], [2,true,true]);
  c('…the Spanish in the same ink and size as the English (never grey, never smaller)', [!!en&&!!es&&en.color===es.color&&en.size===es.size,es&&es.color], [true,'#0E1726']); }
d=P.cnPdfDoc(jsPDF,AB,{format:'half',lang:'en',url,qrRows:qr(29)});
c('abuse card: no event name anywhere, not even in the file\'s title', [txt(d).includes('Support evening'),P.cnPdfName(AB,'half','en'),/\/Title \(Connection card\)/.test(txt(d))], [false,'Sampleton-SDA-SAMPLE-connection-card-half.pdf',true]);
c('abuse card: the partner and the national line; no visit; the calm look', [txt(d).includes('215-555-0101'),txt(d).includes('1-800-799-7233'),txt(d).includes('a visit'),AB.look], [true,true,false,'calm']);
c('file names', [P.cnPdfName(HF,'half','both'),P.cnPdfName(HF,'post','es')], ['Sampleton-SDA-SAMPLE-Community-health-fair-connection-card-half-en-es.pdf','Sampleton-SDA-SAMPLE-Feria-de-salud-comunitaria-connection-card-postcard-es.pdf']);
// v10.43 (integration): a hyphenated title keeps its words apart (the samples showed "Backtoschool")
c('…a hyphen parts words in the file names', [P.cnPdfName({...HF,title:{en:'Back-to-school backpack giveaway',es:'Entrega de mochilas'}},'post','en'),P.cnCsvName({...HF,title:{en:'Back-to-school backpack giveaway',es:''}},'2026-08-23')],
  ['Sampleton-SDA-SAMPLE-Back-to-school-backpack-giveaway-connection-card-postcard.pdf','Connections-Back-to-school-backpack-giveaway-2026-08-23.csv']);
c('no names, ever: the card is blank (nothing from a person is drawn)', P.cnPdfCard.length>0&&!/Ana|Bill/.test(words(P.cnPdfDoc(jsPDF,HF,{format:'half',lang:'both',url,qrRows:qr(29)}))));
// every look prints, both formats, with no active content
{ const bad=[]; for(const l of T.CN_LOOK_IDS) for(const f of ['half','post']){ const x=P.cnPdfDoc(jsPDF,{...HF,look:l},{format:f,lang:'both',url,qrRows:qr(33)}); if(pdfActive(raw(x))) bad.push(l+' '+f); }
  c('every one of the nine looks prints, half and postcard, with no active content or image', bad, []); }
// the worst a pastor can make: eight choices on, each 90 characters, both languages, a partner, a gentle line
const W=JSON.parse(JSON.stringify(HF)); W.kind='grief'; W.look='calm'; W.partner={name:'x'.repeat(80),line:'215-555-0101'};
W.opts=[...Array(6)].map((_,i)=>({k:['next','recipes','results','remind','help','c1'][i],en:('Word '.repeat(18)).trim(),es:('Palabra '.repeat(11)).trim(),contact:true})).concat([{k:'prayer',en:'I’d like prayer',es:'Me gustaría que oren por mí',contact:false},{k:'nothing',en:'Nothing more, thank you',es:'Nada más, gracias',contact:false}]);
// v10.43 (review, 1 Oct 2026): with the type floors (7.5 / 9 pt) the worst card fits the half card two-sided; a 4 × 6 postcard cannot hold eight choices of
// 90 characters at 9 pt, and the sheet says "Too much for one card" (every card the app makes fits it: the sweep below)
for(const [format,lang] of [['half','en'],['half','both']])
  c(`the worst card still fits: ${format}, ${lang} (two-sided)`, P.cnPdfFits(jsPDF,W,{format,lang,url,qrRows:qr(33)}), true);
c('…the worst postcard is refused, never printed small', P.cnPdfFits(jsPDF,W,{format:'post',lang:'en',url,qrRows:qr(33)}), false);
const W2=JSON.parse(JSON.stringify(W)); W2.opts.forEach(o=>{ o.en=('Wordy '.repeat(15)).trim(); o.es=('Palabrita '.repeat(9)).trim(); });
c('…and the sheet can tell when a card is too much', typeof P.cnPdfFits(jsPDF,W2,{format:'post',lang:'both',url,qrRows:qr(33)}), 'boolean');
{ // fitting: one side in each language, at a readable size
  const doc=new jsPDF({unit:'pt',format:'letter'});
  const sEn=P.cnPdfSides(doc,HF,{format:'half',lang:'en',url,qrRows:qr(29)}), sBoth=P.cnPdfSides(doc,HF,{format:'half',lang:'both',url,qrRows:qr(29)});
  c('the health fair: one side in English at ≥ 0.9; bilingual, one side a language at ≥ 0.9', [sEn.map(x=>x.f.part).join(),sEn[0].f.s>=0.9,sBoth.map(x=>x.L+':'+x.f.part).join(),sBoth.every(x=>x.f.s>=0.9&&!x.f.over)], ['full',true,'en:full,es:full',true]); }
console.log('\n-- v10.43 (review): the floors, the icons, the QR, the link --');
{ // every built-in event or series card, half and postcard, English, Spanish and both: nothing under 7.5 pt, choices and labels 9 pt
  const lit=require('./connect-blocks.js').lit, sig=require('./connect-blocks.js').signature(), CB=lit('CASE_CADENCE_BUILTIN'), MIN_ES=lit('CASE_MIN_ES'), BT=lit('LIB_BUILTIN_THEMES');
  const env={builtinThemes:x=>(BT[x.id]||'').split(' ').filter(Boolean),builtinKids:()=>false,nameEs:x=>MIN_ES[x.id]||x.n};
  const bad=[], small=[], over=[]; let n=0;
  for(const s of sig){ if(!CB[s.id]) continue; const card=JSON.parse(JSON.stringify(T.cnTailor(T.cnIdea({id:s.id,n:s.n,d:s.d},env),{cadence:'event',next:{name:{en:'Weekly homework club',es:'Club semanal de tareas escolares'}},church:'Fairview Village Seventh-day Adventist Church',day:'2026-10-18'})));
    for(const format of ['half','post']) for(const lang of ['en','es','both']){ const audit=[]; n++;
      if(!P.cnPdfFits(jsPDF,card,{format,lang,url,qrRows:qr(33)})) over.push(s.id+':'+format+':'+lang);
      P.cnPdfDoc(jsPDF,card,{format,lang,url,qrRows:qr(33),audit});
      audit.forEach(a=>{ if(a.size<7.5-1e-6) bad.push(s.id+':'+format+':'+lang+' '+a.size.toFixed(2)+' '+a.t.slice(0,30)); });
      card.opts.filter(o=>!o.off).forEach(o=>{ const t=lang==='es'?o.es:o.en; const a=audit.find(z=>t.startsWith(z.t)); if(a&&a.size<9-1e-6) small.push(s.id+' '+a.size.toFixed(2)); }); } }
  c(`${n} built-in cards (half, postcard × English, Spanish, both) all fit, with the church's longest name`, over, []);
  c('…no line under 7.5 pt', bad.slice(0,5), []);
  c('…every choice at 9 pt or more', small.slice(0,5), []); }
{ // the icons: the phone's own drawings, on paper as vector paths (arcs become curves); every choice's icon parses inside its 24 box
  const keys=Object.keys(T.CN_ICON), out=[];
  for(const k of keys){ const ps=T.cnSvgPath(T.CN_ICON[k]); if(!ps.length) out.push(k+' empty');
    for(const p of ps) for(const g of [[p.x,p.y],...p.segs]) for(let i=0;i<g.length;i+=2) if(!(g[i]>=-1&&g[i]<=25&&g[i+1]>=-1&&g[i+1]<=25)) out.push(k+' '+g.slice(i,i+2)); }
  c(`every icon (${keys.length}) parses into paths inside its 24-unit box`, [...new Set(out)].slice(0,5), []);
  const calls=[]; function Spy(o){ const dd=new jsPDF(o), l=dd.lines.bind(dd), rr=dd.roundedRect.bind(dd); dd.lines=(...a)=>{ calls.push(['lines',a[4]]); return l(...a); }; dd.roundedRect=(...a)=>{ calls.push(['rr',a[2],a[3],a[6]]); return rr(...a); }; return dd; }
  P.cnPdfDoc(Spy,HF,{format:'half',lang:'en',url:url+'~en',qrRows:qr(29)});
  c('the choices carry their icons (stroked paths beside each box) on a tinted panel', [calls.filter(x=>x[0]==='lines'&&x[1]==='S').length>=12,calls.some(x=>x[0]==='rr'&&x[1]>300&&x[3]==='F')], [true,true]);
  c('the QR framed at about 2 in (≥ 120 pt), the focal point', calls.some(x=>x[0]==='rr'&&x[1]>=120&&Math.abs(x[1]-x[2])<0.01&&x[3]==='FD'), true);
  const dd=P.cnPdfDoc(jsPDF,HF,{format:'half',lang:'en',url:url+'~en',qrRows:qr(29)});
  c('the printed link has no ~en (the QR keeps the language)', [txt(dd).includes('#connect=HK7QM4RTZP'),txt(dd).includes('~en')], [true,false]); }
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
