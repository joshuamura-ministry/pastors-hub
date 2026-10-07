// v10.45.0 — the idea sheet's one-page PDF (DESIGN-SURVEY §4). The pastor (3–5 Oct 2026): "you can print the PDF… a clean and
// beautiful one-page PDF". nsPdfDoc(jsPDF, idea, need, o) is pure (no page, no DOM): one US Letter page always (nsPdfFit's levels),
// the last line above the footer's rule (y ≤ 736), every curated idea under every need it is listed for, in English and Spanish, at
// level 3 or less; the stress case at level 4 or less; the two faces embedded with every character they draw; the verse word for
// word from the verified library; the file names; the Spanish labels; the church's name only when it is one. jsPDF 2.5.1 in node.
// Written failing-first against v10.44.1 (no nsPdfDoc there).
const fs=require('fs'), path=require('path');
const {jsPDF}=require('jspdf');
const {ROOT,FX,checker,page,ready,survey,openSheet,until,sleep}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const FONTS={script:fs.readFileSync(path.join(ROOT,'fonts','CormorantGaramond-SemiBoldItalic.ttf')).toString('base64'),disp:fs.readFileSync(path.join(ROOT,'fonts','SpaceGrotesk-SemiBold.ttf')).toString('base64')};
// The Unicode cmap of a TrueType face (formats 4 and 12), as v43-fonts reads it
function cmapOf(file){ const b=fs.readFileSync(file), dv=new DataView(b.buffer,b.byteOffset,b.byteLength), u16=o=>dv.getUint16(o), i16=o=>dv.getInt16(o), u32=o=>dv.getUint32(o), Tb={};
  for(let i=0,n=u16(4);i<n;i++){ const o=12+i*16; Tb[b.toString('latin1',o,o+4)]={off:u32(o+8)}; }
  const cm=new Set(), o=Tb.cmap.off;
  for(let i=0,n=u16(o+2);i<n;i++){ const pid=u16(o+4+i*8), eid=u16(o+6+i*8), so=o+u32(o+8+i*8), fmt=u16(so);
    if(!(pid===0||(pid===3&&(eid===1||eid===10)))) continue;
    if(fmt===4){ const seg=u16(so+6)/2, ends=so+14, starts=ends+seg*2+2, deltas=starts+seg*2, ros=deltas+seg*2;
      for(let s=0;s<seg;s++){ const e=u16(ends+s*2), st=u16(starts+s*2), d=i16(deltas+s*2), ro=u16(ros+s*2);
        for(let ch=st;ch<=e&&ch!==0xFFFF;ch++){ let g=ro===0?(ch+d)&0xFFFF:u16(ros+s*2+ro+(ch-st)*2); if(ro&&g) g=(g+d)&0xFFFF; if(g) cm.add(ch); } } }
    if(fmt===12) for(let k=0,n2=u32(so+12);k<n2;k++){ const st=u32(so+16+k*12), e=u32(so+20+k*12); for(let ch=st;ch<=e;ch++) cm.add(ch); } }
  return cm; }
const CMAP={CnScript:cmapOf(path.join(ROOT,'fonts','CormorantGaramond-SemiBoldItalic.ttf')),CnDisplay:cmapOf(path.join(ROOT,'fonts','SpaceGrotesk-SemiBold.ttf'))};
const PDF_BLOCK=new Set(['JavaScript','Launch','EmbeddedFile','URI','Annots','AA','Link','AcroForm','Widget','GoTo','SubmitForm','Image']);
const active=d=>{ const s=Buffer.from(d.output('arraybuffer')).toString('latin1'); return [...s.matchAll(/\/([A-Za-z]{2,24})/g)].some(m=>PDF_BLOCK.has(m[1])); };
const O=(lang,o)=>({lang,fonts:FONTS,church:'Bucks County Seventh-day Adventist Church',town:'Warminster',date:lang==='es'?'octubre de 2026':'October 2026',
  tract:'Census Tract 1016.11',county:'Bucks County',years:'2020–2024',...(o||{})});
const EV_LONG='9% speak another Indo-European language at home, about 500 people; 20% of them speak English less than "very well." The Census counts Hindi, Urdu, Gujarati, Punjabi, Bengali, Persian, Portuguese and others together.';

(async()=>{ await T.sec(async()=>{
  const lv={}, worst={lv:-1};
  for(const lang of ['en','es']){
    const P=page({lang,needs:'file'}); await ready(P); survey(P); await sleep(30);
    c(`(${lang}) nsPdfDoc is there, pure`, P.E(`typeof nsPdfDoc==='function'&&typeof nsPdfFit==='function'&&typeof nsPdfName==='function'&&typeof nsVerse==='function'`), true);
    const M=JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','needs.json'),'utf8'));
    await P.E(`(async()=>{ await libLoadIndex(); await Promise.all([...new Set(${JSON.stringify([...Object.values(M.needs).flat(),...Object.values(M.lang).flat()])}.map(id=>LIB.byId.get(id)).filter(Boolean).map(r=>r.theme))].map(t=>libLoadTheme(t))); })()`);
    // every need's list (and a language need's own language list), every idea in it; {lang} as its longest, French or Haitian Creole
    const LANG_OF={'lang-primary':1,'lang-also':1,'lang-third':1};
    const jobs=Object.entries(M.needs).flatMap(([need,ids])=>[...ids,...(LANG_OF[need]?Object.values(M.lang).flat():[])].map(id=>[need,id]));
    const rows=P.J(`${JSON.stringify(jobs)}.map(([need,id])=>{ const L={name:'French / Haitian Creole',share:30,count:900,ltvw:500}; const v=nsView(id,L);
      let r=RULES.find(x=>x.id===need)||RULES_MORE.find(x=>x.id===need), w={}; try{ w=nsSay(r,DATA.M.tract,DATA.M.county,{tr:DATA.M.cousub,where:'',whereEs:''}); }catch(e){ w={}; }
      const kind=GF_NEED_KIND[need]||NS_KIND_MORE[need]||'language';
      return [need,id,v,{id:need,title:w.title||nsTopic(need),evidence:${JSON.stringify(EV_LONG)},kind}]; })`);
    const fails=[], missing=rows.filter(r=>!r[2]||!r[2].full||!(r[2].how||[]).length).map(r=>r[1]);
    c(`(${lang}) every curated idea has its full words to print (${rows.length} placements)`, missing, []);
    for(const [need,id,v,n] of rows){ if(!v) continue;
      const d=P.w.nsPdfDoc(jsPDF,v,n,O(lang)); const L=d.__nsLevel; lv[L]=(lv[L]||0)+1; if(L>worst.lv) Object.assign(worst,{lv:L,id,need,lang});
      if(d.getNumberOfPages()!==1||d.__nsEnd>736||L>3) fails.push(`${lang} ${need} ${id}: ${d.getNumberOfPages()} pages, ends ${Math.round(d.__nsEnd)}, level ${L}`); }
    c(`(${lang}) every one: one page, the last line above the footer (≤ 736), level 3 or less`, fails.slice(0,10), []);
  }
  console.log(`    levels used: ${JSON.stringify(lv)}; the tightest: level ${worst.lv} (${worst.lang} ${worst.need} ${worst.id})`);

  const P=page({needs:'file'}); await ready(P); survey(P); await sleep(30); await P.E('libLoadIndex()');
  const W=P.w;
  console.log('\n-- the page, the words, the faces --');
  const v=P.J(`(()=>{ const x=nsView('pantry-box'); return x; })()`), need={id:'snap',title:'Food insecurity is measurable here',evidence:'17% of households received SNAP food assistance in the past year.',kind:'hardship'};
  let audit=[]; let d=W.nsPdfDoc(jsPDF,v,need,O('en',{audit}));
  c('US Letter portrait, one page', [d.getNumberOfPages(),Math.round(d.internal.pageSize.getWidth()),Math.round(d.internal.pageSize.getHeight())], [1,612,792]);
  const said=audit.map(a=>a.t);
  // v10.59.0 (stale): the foot names terrain.church ("apps name and url to terrain.church")
  c('the kicker, the name, the need, how to get started, what it needs, the foot', ['MINISTRY IDEA','For the need: Food insecurity is measurable here','HOW TO GET STARTED','WHAT IT NEEDS FROM OUR CHURCH','Made with Terrain · terrain.church'].map(t=>said.some(s=>s.startsWith(t))), [true,true,true,true,true]);
  c('the head: the church, the town and the month', [said[0],said[1]], ['Warminster · October 2026','Bucks County Seventh-day Adventist Church']);
  // the review round (#19): the source on one line, the tract and county on the next beside "Made with Terrain" (never wrapped)
  const foot=audit.filter(a=>a.y>=750&&!/^Made with/.test(a.t)).map(a=>[a.t,a.y]);
  c('the source and the tract at the foot (under the rule at 744), one line each', foot, [['Figures: U.S. Census Bureau, American Community Survey 2020–2024',755],['Census Tract 1016.11, Bucks County',765]]);
  c('the write-in lines (the review round, #25a): our next step, who will lead, a start date', ['Our next step:','Who will lead:','Start date:'].map(t=>said.includes(t)), [true,true,true]);
  { const ref=audit.filter(a=>/, KJV$/.test(a.t)).pop();
    c('…the verse set just above the foot, not in the middle of the page', ref&&ref.y>=715&&ref.y<=744, true); }
  c('a built-in\'s money says "About" (a planning allowance)', said.some(s=>/^About \$/.test(s)), true);
  c('the name and the heads in Space Grotesk, the verse in Cormorant (both embedded)', [audit.filter(a=>a.t==='MINISTRY IDEA')[0].font,audit.filter(a=>/^“/.test(a.t))[0].font,/CnDisplay/.test(Buffer.from(d.output('arraybuffer')).toString('latin1'))||/SpaceGrotesk/.test(Buffer.from(d.output('arraybuffer')).toString('latin1'))], ['CnDisplay','CnScript',true]);
  c('no links, annotations, forms, scripts or images', active(d), false);
  const V=P.J(`nsVerse('snap')`), Q=JSON.parse(fs.readFileSync(path.join(ROOT,'tests','case-quotes.json'),'utf8'));
  const qv=(Q.verses||Q).find?(Q.verses||Q).find(x=>x.id===V.id):null;
  c('the verse: word for word from the verified library (case-quotes.json), with its reference', [V.id,qv&&qv.en&&qv.en.text===V.en.text,audit.filter(a=>a.font==='CnScript').map(a=>a.t).join(' ')===`“${V.en.text}”`,said.includes(`${V.en.ref}, KJV`)], ['deut15_11',true,true,true]);
  c('the verse for a language need: Acts 2:8; for the nine new needs, by their tag (teens → youth, seniors-many → seniors)', P.J(`['lang-primary','lang-also','teens','seniors-many','near-poor'].map(id=>nsVerse(id).id)`), ['acts2_8','acts2_8','1tim4_12','lev19_32','deut15_11']);
  c('every verse a need can choose is 160 characters or fewer in both languages', P.J(`[...RULES,...RULES_MORE].map(r=>nsVerse(r.id)).filter(v=>v.en.text.length>160||v.es.text.length>160).map(v=>v.id)`), []);
  // every character the two faces draw: the verses a need can choose, every curated idea's name EN + ES (with {lang} filled), the heads
  const chars={CnDisplay:new Set(),CnScript:new Set()};
  P.J(`[...RULES,...RULES_MORE].map(r=>nsVerse(r.id)).flatMap(v=>['“'+v.en.text+'”','“'+v.es.text+'”'])`).forEach(t=>[...t].forEach(ch=>chars.CnScript.add(ch)));
  const M=JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','needs.json'),'utf8'));
  P.J(`(()=>{ const out=[]; for(const id of ${JSON.stringify([...new Set([...Object.values(M.needs).flat(),...Object.values(M.lang).flat()])])}){ const r=LIB.byId.get(id); const x=SIGNATURE.find(s=>s.id===id);
      for(const L of [null,{name:'French / Haitian Creole'},{name:'Vietnamese'}]){ if(r){ out.push(gfCap(libFill(r.n,'en',L)),gfCap(libFill(r.ne,'es',L))); } } if(x){ out.push(gfCap(x.n),gfCap(caseInLang('es',()=>caseMinName(x)))); } }
    return out.concat(Object.values(NS_PDF).flatMap(p=>[p.kicker,p.how,p.needs])); })()`).forEach(t=>[...t].forEach(ch=>chars.CnDisplay.add(ch)));
  c('…every character is in its face (no letter left out of a printed name, a head or a verse)', Object.fromEntries(Object.entries(chars).map(([f,s])=>[f,[...s].filter(ch=>ch!==' '&&!CMAP[f].has(ch.codePointAt(0)))])), {CnDisplay:[],CnScript:[]});

  console.log('\n-- Spanish --');
  const PE=page({needs:'file',lang:'es'}); await ready(PE); survey(PE); await sleep(30);
  await PE.E(`(async()=>{ await libLoadIndex(); await libLoadTheme('immigrants'); })()`);
  const ve=PE.J(`nsView('immigrants-welcome-card-in-lang',{name:'Chinese',share:24})`);
  audit=[]; d=PE.w.nsPdfDoc(jsPDF,ve,{id:'lang-primary',title:'Materiales y bienvenida en chino',evidence:'El 24% habla chino en casa — unas 1,396 personas.',kind:'language'},O('es',{audit}));
  const saidEs=audit.map(a=>a.t);
  c('every label in Spanish', ['IDEA DE MINISTERIO','Para la necesidad: Materiales y bienvenida en chino','CÓMO EMPEZAR','LO QUE NECESITA DE NUESTRA IGLESIA','PERSONAS','PARA EMPEZAR','CADA MES','Hecho con Terrain · terrain.church'].map(t=>saidEs.some(s=>s.startsWith(t))), Array(8).fill(true));
  c('…the ask-for line, the month, the source', [saidEs.some(s=>/^Si nuestra iglesia todavía no tiene todo esto/.test(s)),saidEs[0],saidEs.some(s=>/^Cifras: Oficina del Censo de EE\. UU\., Encuesta sobre la Comunidad Estadounidense 2020–2024/.test(s))], [true,'Warminster · octubre de 2026',true]);
  // the review round (#19): the foot in Spanish; the labels never run into their values ("PARA EMPEZAR$375")
  c('…the tract and the county in Spanish', saidEs.includes('Sección censal 1016.11, condado de Bucks'), true);
  c('…the write-in lines in Spanish', ['Nuestro próximo paso:','Quién lo dirige:','Fecha de inicio:'].map(t=>saidEs.includes(t)), [true,true,true]);
  { const m=new jsPDF({unit:'pt'}); m.setFont('helvetica','normal'); m.setFontSize(8.5);
    const tight=audit.map((a,i)=>[a,audit[i+1]]).filter(([a,b])=>a.role==='label'&&b).filter(([a,b])=>b.x-a.x<m.getTextWidth(a.t)+0.4*a.t.length+8).map(([a,b])=>a.t+'→'+b.t);
    c('…every label leaves room before its value (PARA EMPEZAR, COLABORADOR, HABILIDADES)', tight, []); }
  c('…the idea\'s own Spanish, {lang} filled ("chino")', saidEs.some(s=>/^Una tarjeta de bienvenida en chino y en inglés/.test(s)), true);
  c('…the verse in the RVA 1909, its reference so marked', saidEs.includes('Hechos 2:8, RVA 1909'), true);
  c('the file names: the idea\'s name and the town, in the PDF\'s language', [W.nsPdfName({n:'A welcome card in Chinese and English',name:'x'},'San José','en'),W.nsPdfName({ne:'Una tarjeta de bienvenida en chino e inglés',name:'x'},'San José','es')],
    ['a-welcome-card-in-chinese-and-english-san-jose.pdf','una-tarjeta-de-bienvenida-en-chino-e-ingles-san-jose.pdf']);
  audit=[]; W.nsPdfDoc(jsPDF,v,need,O('en',{audit,church:'My church'}));
  c('"My church" (the placeholder) is never printed', audit.some(a=>/my church/i.test(a.t)), false);

  console.log('\n-- the stress case: one page at level 4 or less --');
  const S={id:'stress',lib:true,tier:3,name:'X'.repeat(8)+' a long name for a ministry idea that runs to sixty',d:('A long description that keeps going with many words. ').repeat(8).slice(0,420),
    how:[1,2,3,4].map(i=>(`Paso ${i}: un paso largo que explica exactamente qué hacer, con quién hablar, cuánto cuesta y cuándo se hace, sin dejar nada fuera de la cuenta.`).slice(0,160)),
    ppl:12,leaders:3,hrs:40,cost:5000,costMo:400,about:false,where:'community',skills:['lead','kids','admin','lang'],partner:'P'.repeat(10)+' a partner organization named in full with its county and its office, to the limit',sab:false,kids:true};
  const SN={id:'grandparents',title:'Grandparents are raising children here',evidence:EV_LONG,kind:'children'};
  for(const lang of ['en','es']){ const ds=W.nsPdfDoc(jsPDF,S,SN,O(lang)); c(`(${lang}) the longest of everything: one page, ends ≤ 736, level ${ds.__nsLevel} ≤ 4`, [ds.getNumberOfPages(),ds.__nsEnd<=736,ds.__nsLevel<=4], [1,true,true]); }
  // the review round (S5: the old check read compressed bytes and could not fail). One floor: 9 pt or more for every word that is read;
  // 8 to 8.5 pt only for the small capital labels (PEOPLE, TIME…), the numbers in the step circles and the foot. Read twice: every
  // string the page draws (its audit, with its size and role), and the uncompressed page itself (every Tf the content sets).
  for(const lang of ['en','es']){ const au=[]; const dz=W.nsPdfDoc(jsPDF,S,SN,O(lang,{audit:au,compress:false}));
    const small=au.filter(a=>a.size<9&&!['label','num','foot'].includes(a.role)).map(a=>a.size+' '+a.t.slice(0,30));
    const raw=Buffer.from(dz.output('arraybuffer')).toString('latin1'), sizes=[...raw.matchAll(/\/F\d+ ([\d.]+) Tf/g)].map(m=>+m[1]);
    c(`(${lang}) …no word read under 9 pt (labels, step numbers and the foot at 8 to 8.5); the page sets nothing under 8`, [small,sizes.length>20,Math.min(...sizes)>=8,au.filter(a=>a.size<8).length], [[],true,true,0]); }
  console.log('\n-- the church in the head (review M4, the coordinator\'s note 4) --');
  { const au=[]; W.nsPdfDoc(jsPDF,v,need,O('es',{audit:au,church:'Iglesia Adventista del Séptimo Día de Kraków–Łódź, Comunidad Hispana de las Montañas Pocono y del Valle'}));
    const head=au.find(a=>a.y===57&&a.x===48);
    c('a long name steps down to 9 pt and ends with "…" (never cut mid-name)', [head&&head.size,head&&/…$/.test(head.t)], [9,true]);
    c('…its accents print (é, ñ), letters outside the font fall back to their base letter', [/Séptimo Día/.test(head.t),/Montañas|Hispana/.test(head.t)], [true,true]); }
  { const au=[]; W.nsPdfDoc(jsPDF,v,need,O('es',{audit:au,church:'Iglesia de San José'}));
    c('a short name with accents prints whole', au.some(a=>a.t==='Iglesia de San José'), true); }
  { const au=[]; let ok=true; try{ W.nsPdfDoc(jsPDF,v,need,O('en',{audit:au,church:'서울 한인 교회'})); }catch(e){ ok=false; }
    c('a name the page\'s letters cannot print says "Our church" (polish #4), never a broken page', [ok,au.filter(a=>a.y===57&&a.x===48).map(a=>a.t)], [true,['Our church']]); }
  { const au=[]; W.nsPdfDoc(jsPDF,v,need,O('es',{audit:au,church:'北京华人教会'}));
    c('…"Nuestra iglesia" on a Spanish page', au.filter(a=>a.y===57&&a.x===48).map(a=>a.t), ['Nuestra iglesia']); }

  console.log('\n-- the sheet\'s button --');
  const PB=page({needs:'file',fonts:true}); await ready(PB); survey(PB); await sleep(30);
  PB.w.__saved=[]; PB.w.jspdf={jsPDF:class extends jsPDF{ constructor(...a){ super(...a); this.save=n=>{ PB.w.__saved.push([n,this.getNumberOfPages()]); return this; }; } }};
  await openSheet(PB,'snap','pantry-box');
  PB.q('#ns-sheet [data-ns-pdf]').click();
  await until(()=>PB.w.__saved.length>0,15000);
  c('"One-page PDF" saves one page named for the idea and the town, and says so', [PB.w.__saved[0],PB.txt('#ns-sheet .ns-status')],
    [[PB.E(`nsPdfName(nsView('pantry-box'),'Warminster','en')`),1],'Saved: '+PB.E(`nsPdfName(nsView('pantry-box'),'Warminster','en')`)]);
}); T.done(); })();
