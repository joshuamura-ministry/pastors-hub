// v10.43.0 · connection cards, the tailoring: theme, kind of event and next step decide the card's choices (CONNECT §4,
// moved here from the design's cn-tailor.test.mjs, 48 checks) + DESIGN C2.2 (the new words, the thank-you order, cnNextAbout)
// and C2.3 (every card carries its look). Reads the code out of index.html (tests/connect-blocks.js), the library from
// tools/ideas-src, and sends every card it makes through the real connect.mjs op create (in-memory store).
// The pastor: "yes. it should host the connection cards tailored to the situations." (30 Sep 2026)
const fs=require('fs'), path=require('path');
const {load,lit,signature}=require('./connect-blocks.js');
const T=load({page:false});
const ROOT=path.resolve(__dirname,'..');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));fail++}else pass++};
(async()=>{ try{
  const BT=lit('LIB_BUILTIN_THEMES'), MIN_ES=lit('CASE_MIN_ES'), KIDS=lit('CASE_CHILD_BUILTINS');
  const SIG=signature(), sigById=new Map(SIG.map(s=>[s.id,s]));
  const env={builtinThemes:x=>(BT[x.id]||'').split(' ').filter(Boolean),builtinKids:x=>KIDS.includes(x.id),nameEs:x=>MIN_ES[x.id]||x.n};
  const B=id=>T.cnIdea({id,n:(sigById.get(id)||{}).n||id,d:(sigById.get(id)||{}).d||''},env);
  const themes=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/ideas-src/themes.json'),'utf8')).themes;
  const LIB=[]; for(const t of themes) LIB.push(...JSON.parse(fs.readFileSync(path.join(ROOT,`tools/ideas-src/themes/${t.id}.json`),'utf8')).ideas);
  c('the built-ins read from SIGNATURE (103)', SIG.length, 103);

  console.log('-- the table covers everything --');
  c('57 themes, each with a kind', [themes.length, themes.filter(t=>!T.CN_THEME_KIND[t.id]).map(t=>t.id)], [57,[]]);
  c('every kind is a known kind', Object.values(T.CN_THEME_KIND).every(k=>T.CN_KIND_IDS.includes(k)));
  c('no theme in the table that the library does not have', Object.keys(T.CN_THEME_KIND).filter(k=>!themes.some(t=>t.id===k)), []);
  c('every built-in override names a built-in', Object.keys(T.CN_BUILTIN_KIND).filter(id=>!BT[id]), []);

  console.log('\n-- the average church (tests/average-church): three events --');
  const COOK={name:{en:(sigById.get('cooking-school')||{n:'Plant-based cooking school'}).n,es:MIN_ES['cooking-school']}};
  let k=T.cnTailor(B('health-expo'),{cadence:'event',next:COOK,church:'Sampleton SDA (SAMPLE)',day:'2026-10-18',lang:'both'});
  c('health fair: a health card, the health look', [k.kind,k.look,k.parent,k.cadence], ['health','health',false,'event']);
  c('health fair: its choices, in order', k.opts.map(o=>o.k+(o.off?'(off)':'')), ['next','recipes','results','prayer','visit','nothing','news(off)']);
  c('health fair: the next step, EN', k.opts[0].en, 'Tell me about the plant-based cooking school');
  c('health fair: the next step, ES', k.opts[0].es, 'Quiero saber más de la escuela de cocina a base de plantas');
  // v10.43 (review, 1 Oct 2026): the Spanish is cut where the English is (was 'Feria de salud completa, con pruebas y una ruta de
  // derivación': planning words on the neighbour's card, the phone form, the sheet and "Lo que sigue")
  c('health fair: the title is the name without its subtitle, in both languages', k.title, {en:'Full health expo',es:'Feria de salud completa'});
  c('C2.1: a new card says nothing yet about when the next step starts', k.nextWhen, {en:'',es:''});
  const HW={name:{en:'Weekly homework club',es:MIN_ES['homework-club']}};
  k=T.cnTailor(B('backpack-giveaway'),{cadence:'event',next:HW,church:'Sampleton SDA (SAMPLE)',day:'2026-08-22',lang:'en'});
  c('back-to-school: a card for parents, the family look', [k.kind,k.look,k.parent], ['family','family',true]);
  c('back-to-school: its choices', k.opts.map(o=>o.k+(o.off?'(off)':'')), ['next','events','prayer','visit','nothing','news(off)']);
  c('back-to-school: "Tell me about the homework club"', [k.opts[0].en,k.opts[0].es], ['Tell me about the weekly homework club','Quiero saber más del club semanal de tareas escolares']);
  c('back-to-school: the phone says "For parents and guardians" and "please don\'t write children\'s names"',
    [T.cnWords(k,'en').sub,T.cnWords(k,'en').kidsHint,T.cnWords(k,'es').kidsHint], ['For parents and guardians.','Please don’t write children’s names.','Por favor, no escriba nombres de niños.']);
  const STUDY={name:{en:'One study, at one kitchen table',es:MIN_ES['kitchen-study']}};
  k=T.cnTailor(B('four-nights'),{cadence:'series',next:STUDY,church:'Sampleton SDA (SAMPLE)',day:'2026-11-01',lang:'en'});
  c('4-night series: a Bible card, the prayer look', [k.kind,k.look,k.parent,k.cadence], ['bible','prayer',false,'series']);
  c('4-night series: its choices (a reminder before each night; no "next series" on a series)', k.opts.map(o=>o.k+(o.off?'(off)':'')), ['next','study','remind','prayer','visit','nothing','series(off)','news(off)']);
  c('4-night series: a name with a comma is quoted', [k.opts[0].en,k.opts[0].es], ['Tell me about “One study, at one kitchen table”','Quiero saber más sobre «Un estudio, en la mesa de una cocina»']);
  c('4-night series: heading', T.cnWords(k,'es').head, 'Gracias por acompañarnos');
  c('names that start with a verb or a question are quoted, never "the host…"', [T.cnNextLabel('Host a Friday supper for neighbors','en'),T.cnNextLabel('What AI can and can\'t do','en')],
    ['Tell me about “Host a Friday supper for neighbors”','Tell me about “What AI can and can\'t do”']);
  c('"la Escuela Sabática" keeps its capitals, "la escuela de cocina" does not', [T.cnNextLabel('Escuela Sabática para visitas','es'),T.cnNextLabel('Escuela de cocina','es')],
    ['Quiero saber más de la Escuela Sabática para visitas','Quiero saber más de la escuela de cocina']);
  // v10.43 (integration): the samples showed "Tell me more about the sunday-morning grief walk"; days, months and book names keep capitals
  c('a day, a month or a book of the Bible keeps its capital (also before a hyphen or an apostrophe)', [T.cnNextLabel('Sunday-morning grief walk on the park trail','en'),T.cnNextLabel('Monday lunch for new moms','en'),T.cnNextLabel('Mark\'s Gospel in six evenings','en'),T.cnNextLabel('Weekly coffee and questions','en'),T.cnNextLabel('Salmos para la semana','es')],
    ['Tell me about the Sunday-morning grief walk on the park trail','Tell me about the Monday lunch for new moms','Tell me about “Mark\'s Gospel in six evenings”','Tell me about the weekly coffee and questions','Quiero saber más de los Salmos para la semana']);

  console.log('\n-- the pastor\'s examples --');
  const lib=id=>T.cnIdea(LIB.find(x=>x.id===id));
  k=T.cnTailor(lib('neighbors-block-party-kit'),{cadence:'event',next:{name:{en:'A monthly family night',es:'Una noche familiar mensual'}},church:'X SDA',lang:'en'});
  c('block party → "Invite me to the monthly family night"', [k.kind,k.opts[0].en,k.opts[0].es], ['neighbors','Invite me to the monthly family night','Invítenme a la noche familiar mensual']);
  k=T.cnTailor(lib('prayer-dawn-park-walk'),{cadence:'event',next:null,church:'X SDA',lang:'en'});
  c('a prayer event: someone to pray with, and the note asks what to pray about', [k.opts.map(o=>o.k+(o.off?'(off)':'')),T.cnWords(k,'en').noteLabel,k.look], [['praywith','news','prayer','visit','nothing'],'What can we pray about? (optional)','prayer']);
  const gi=LIB.find(x=>x.theme==='grief'&&!x.minors);
  k=T.cnTailor(T.cnIdea(gi),{cadence:'event',next:{name:{en:'Grief recovery group',es:'Grupo de recuperación del duelo'}},church:'X SDA',lang:'en'});
  c('grief: gentle, a call or a visit, no "other events", the calm look', [k.kind,k.opts.map(o=>o.k+(o.off?'(off)':'')),k.opts.find(o=>o.k==='visit').en,k.look], ['grief',['next','prayer','visit','nothing'],'I’d like a call or a visit','calm']);
  c('grief, in Spanish: the 988 line by its official Spanish name (988lifeline.org/es, checked 1 Oct 2026)', T.cnWords(k,'es').lines, ['Alguien con quien hablar, a cualquier hora: llame o envíe un texto al 988 (Línea 988 de Prevención del Suicidio y Crisis).']);
  c('grief: the 988 line and a softer heading', [T.cnWords(k,'en').lines,T.cnWords(k,'en').head,T.cnWords(k,'en').kidsHint], [['Someone to talk to, any time: call or text 988 (Suicide & Crisis Lifeline).'],'We’re glad you came','']);
  const ai=LIB.find(x=>x.theme==='addiction'&&!x.minors);
  k=T.cnTailor(T.cnIdea(ai),{cadence:'event',next:null,church:'X SDA',lang:'en'});
  c('recovery: the visit starts off, SAMHSA\'s line', [k.kind,k.opts.map(o=>o.k+(o.off?'(off)':'')),T.cnWords(k,'en').lines.length], ['recovery',['prayer','nothing','visit(off)'],1]);
  const bi=LIB.find(x=>x.theme==='abuse-survivors');
  k=T.cnTailor(T.cnIdea(bi),{cadence:'series',next:{name:{en:'A support circle with the agency',es:'Un círculo de apoyo con la agencia'}},church:'X SDA',lang:'en'});
  c('abuse: talk, prayer, nothing; the next step starts off; never a visit, never a reminder', k.opts.map(o=>o.k+(o.off?'(off)':'')), ['talk','prayer','nothing','next(off)']);
  c('abuse: no event name on the card, the name may be an initial, a way to leave quickly, the calm look (it never names a purpose)',
    [k.title,T.cnWords(k,'en').title,T.cnWords(k,'en').nameLabel,T.cnWords(k,'en').quickExit,k.look], [{en:'',es:''},'A card from X SDA','A first name, or just an initial',true,'calm']);
  k.partner={name:'Bucks County Women’s Center',line:'215-555-0101'};
  c('abuse: the partner\'s line, then the national one', T.cnWords(k,'es').lines, ['Para hablar con alguien: Bucks County Women’s Center, 215-555-0101','Si está en peligro, llame al 911. Para hablar con alguien ahora: Línea Nacional sobre Violencia Doméstica, 1-800-799-7233.']);
  k=T.cnTailor(B('kids-health'),{cadence:'event',next:null,church:'X SDA',lang:'en'});
  c('sports physicals for children: a health card for parents, and never "send me my screening results"', [k.kind,k.parent,k.opts.some(o=>o.k==='results'),k.look], ['health',true,false,'health']);
  k=T.cnTailor(B('stop-smoking'),{cadence:'series',next:null,church:'X SDA',lang:'en'});
  c('Breathe-Free is a health series, not a recovery card; no recipes; the health look', [k.kind,k.opts.map(o=>o.k+(o.off?'(off)':'')),k.look], ['health',['remind','news','prayer','visit','nothing','recipes(off)','results(off)'],'health']);
  const fx=LIB.find(x=>x.theme==='families'&&(x.also||[]).includes('abuse-survivors'));
  if(fx){ k=T.cnTailor(T.cnIdea(fx),{cadence:'event'}); c('an idea that touches abuse anywhere gets the abuse card, and the calm look', [k.kind,k.look], ['abuse','calm']); }
  else c('an idea that touches abuse anywhere gets the abuse card (none in the library today)', true);

  console.log('\n-- the next step\'s words --');
  const L=T.cnNextLabel;
  c('a/an → the, first letter lowered', L('A weekly homework club','en'), 'Tell me about the weekly homework club');
  c('capitals that are names stay', [L('Bible study at the kitchen table','en'),L('CHIP course for the town','en'),L('The Sabbath School class','en')],
    ['Tell me about the Bible study at the kitchen table','Tell me about the CHIP course for the town','Tell me about the Sabbath School class']);
  c('a subtitle is left off', L('Job club — CVs, applications, practice interviews','en'), 'Tell me about the job club');
  c('de + el → del; a + el → al', [L('El club de lectura','es'),L('El club de lectura','es','invite')], ['Quiero saber más del club de lectura','Invítenme al club de lectura']);
  c('un / una → el / la', [L('Una clase de cocina','es'),L('Un grupo de caminata','es')], ['Quiero saber más de la clase de cocina','Quiero saber más del grupo de caminata']);
  c('no article: from the gender table', [L('Clase de cocina los martes','es'),L('Noches de cine familiar','es','invite')], ['Quiero saber más de la clase de cocina los martes','Invítenme a las noches de cine familiar']);
  c('no article and not in the table: quoted', L('Pintura en el parque','es'), 'Quiero saber más sobre «Pintura en el parque»');
  c('too long for a card: "what comes next"', [L('A '+'very '.repeat(20)+'long name','en'),L('Una '+'muy '.repeat(25)+'larga','es')], ['Tell me what comes next','Cuénteme qué sigue']);
  // DESIGN §3.2: cnNextAbout, the phrase after "tell you more" / "le contaremos más" (the thank-you, and section 2)
  c('cnNextAbout EN: "about the weekly homework club"', T.cnNextAbout('Weekly homework club','en'), 'about the weekly homework club');
  c('cnNextAbout ES: de + el → del', T.cnNextAbout('Club semanal de tareas escolares','es'), 'del club semanal de tareas escolares');
  c('cnNextAbout ES: de la …', T.cnNextAbout('Escuela de cocina a base de plantas','es'), 'de la escuela de cocina a base de plantas');
  c('cnNextAbout ES: quoted → sobre «…»; EN quoted → about “…”', [T.cnNextAbout('Un estudio, en la mesa de una cocina','es'),T.cnNextAbout('One study, at one kitchen table','en')], ['sobre «Un estudio, en la mesa de una cocina»','about “One study, at one kitchen table”']);
  c('cnNextAbout with no name: "what comes next" / "lo que sigue"', [T.cnNextAbout('','en'),T.cnNextAbout('','es')], ['about what comes next','de lo que sigue']);

  console.log('\n-- DESIGN C2.2: the new words, both languages --');
  c('"Scan to stay in touch" under the framed QR (D13)', T.CN_TEXT.scan, {en:'Scan to stay in touch',es:'Escanee para seguir en contacto'});
  c('"It starts: {when}" (D12)', T.CN_TEXT.startsLine, {en:'It starts: {when}',es:'Comienza: {when}'});
  c('thanksNext names the next step', [T.CN_TEXT.thanksNext.en,T.CN_TEXT.thanksNext.es], ['Thank you, {first}. Within two weeks we’ll tell you more {aboutNext}.','Gracias, {first}. En las próximas dos semanas le contaremos más {aboutNext}.']);
  c('D11: nothing need be ticked — "pickOne" is gone, the hint says "or none"', ['pickOne' in T.CN_TEXT,T.CN_TEXT.chooseHint.en,T.CN_TEXT.chooseHint.es], [false,'Tick any, or none.','Marque las que quiera, o ninguna.']);
  c('every CN_TEXT, CN_OPT and CN_LINES key has both languages', [T.CN_TEXT,T.CN_OPT,T.CN_LINES].flatMap(o=>Object.entries(o).filter(([,v])=>!v.en||!v.es).map(([kk])=>kk)), []);
  c('cnPromise, the one line for shared things (CONNECT §7.1)', [T.cnPromise('en'),T.cnPromise('es')], [T.CN_PROMISE.en,T.CN_PROMISE.es]);
  { const hf=T.cnTailor(B('health-expo'),{cadence:'event',next:COOK,church:'Sampleton SDA (SAMPLE)',lang:'en'}); hf.nextWhen={en:'Tuesday evenings from November 3',es:'Los martes por la noche, desde el 3 de noviembre'};
    const th=(p,l)=>T.cnThanks(hf,new Set(p),'Ana',l||'en');
    c('the thank-you order (C2.2): the next step › contact › prayer › only', [th(['next','prayer']).key,th(['recipes']).key,th(['prayer']).key,th([]).key,th(['nothing']).key], ['thanksNext','thanksReach','thanksPray','thanksOnly','thanksOnly']);
    c('the next step named, and when it starts (D12)', [th(['next']).head,th(['next']).body,th(['next']).starts], ['Thank you, Ana','Within two weeks we’ll tell you more about the plant-based cooking school.','It starts: Tuesday evenings from November 3']);
    c('…in Spanish', [th(['next'],'es').head,th(['next'],'es').body,th(['next'],'es').starts], ['Gracias, Ana','En las próximas dos semanas le contaremos más de la escuela de cocina a base de plantas.','Comienza: Los martes por la noche, desde el 3 de noviembre']);
    c('"It starts" only after the next step', th(['recipes']).starts, ''); }

  console.log('\n-- DESIGN C2.3: every card carries its look --');
  c('the nine looks', T.CN_LOOK_IDS, ['health','food','family','youth','music','prayer','seasons','calm','general']);
  c('every built-in look override names a built-in', Object.keys(T.CN_BUILTIN_LOOK).filter(id=>!BT[id]), []);
  c('every theme in CN_THEME_LOOK is a library theme', Object.keys(T.CN_THEME_LOOK).filter(t=>!themes.some(x=>x.id===t)), []);
  c('built-ins as DESIGN lists them', ['cooking-school','community-dinner','neighbor-table','food-pantry','fall-festival','christmas-store','kids-health','health-expo','stop-smoking','chip','blood-drive','bp-clinic','music-academy','sports-camp'].map(id=>T.cnLook(B(id))),
    ['food','food','food','food','seasons','seasons','health','health','health','health','health','health','music','youth']);
  c('gentle kinds (grief, care, recovery, abuse) are always calm', ['grief','mental-health','addiction','abuse-survivors'].map(t=>T.cnLook({id:'x',builtin:false,themes:[t],ages:'all',minors:false,kids:false,name:{en:'',es:''},text:''})), ['calm','calm','calm','calm']);
  c('a theme with no look of its own is general (Terrain\'s contour lines)', [T.cnLook({id:'x',builtin:false,themes:['media'],name:{en:'',es:''},text:''}),T.cnLook({id:'x',builtin:false,themes:[],name:{en:'',es:''},text:''})], ['general','general']);

  console.log('\n-- every library idea and every built-in, both cadences --');
  const cards=[]; const counts={}, looks={}; let quoted=0, fallback=0;
  const next0={name:{en:'Weekly homework club',es:'Club semanal de tareas escolares'}};
  for(const x of LIB){ const I=T.cnIdea(x);
    for(const cad of ['event','series']){ const nx=(LIB[(LIB.indexOf(x)*7)%LIB.length]);
      const card=T.cnTailor(I,{cadence:cad,next:{name:{en:nx.en.n,es:nx.es.n}},church:'Sampleton SDA (SAMPLE)',day:null,lang:'both'});
      cards.push({id:x.id,card,I}); counts[card.kind]=(counts[card.kind]||0)+1; looks[card.look]=(looks[card.look]||0)+1;
      const n=card.opts.find(o=>o.k==='next'); if(n&&/[“«]/.test(n.en+n.es)) quoted++; if(n&&/what comes next|qué sigue/.test(n.en+n.es)) fallback++; } }
  for(const id of Object.keys(BT)) for(const cad of ['event','series']) cards.push({id,card:T.cnTailor(B(id),{cadence:cad,next:next0,church:'Sampleton SDA (SAMPLE)',lang:'en'}),I:B(id)});
  console.log('    kinds (library, x2):',JSON.stringify(counts),' looks:',JSON.stringify(looks),' next quoted:',quoted,' next fallback:',fallback);
  const on=cd=>cd.opts.filter(o=>!o.off);
  c('every card: "I\'d like prayer" and "Nothing more" on, "Nothing more" last', cards.filter(({card})=>{ const o=on(card); return !o.some(x=>x.k==='prayer')||o[o.length-1].k!=='nothing'; }).map(x=>x.id), []);
  c('every card: at most 8 choices on, 12 in all', cards.filter(({card})=>on(card).length>8||card.opts.length>12).length, 0);
  c('every card: no visit on an abuse card', cards.filter(({card})=>card.kind==='abuse'&&card.opts.some(o=>o.k==='visit')).length, 0);
  c('every card: no screening results on a card for parents', cards.filter(({card})=>card.parent&&card.opts.some(o=>o.k==='results')).length, 0);
  c('every card: every choice in both languages, 90 characters at most', cards.filter(({card})=>card.opts.some(o=>!o.en||!o.es||o.en.length>90||o.es.length>90)).map(x=>x.id).slice(0,5), []);
  c('every card: a title in both languages (80 at most), none on an abuse card', cards.filter(({card})=>card.kind==='abuse'?(card.title.en||card.title.es):(!card.title.en||!card.title.es||card.title.en.length>80||card.title.es.length>80)).map(x=>x.id).slice(0,5), []);
  c('C2.3: every card has one of the nine looks, by the rule (gentle → calm, a built-in\'s own, its first theme, else general)',
    cards.filter(({card,I})=>!T.CN_LOOK_IDS.includes(card.look)||card.look!==T.cnLook(I)||(T.CN_GENTLE.has(card.kind)&&card.look!=='calm')).map(x=>x.id).slice(0,5), []);
  c('C2.3: every one of the nine looks is used by some card', T.CN_LOOK_IDS.filter(l=>!cards.some(({card})=>card.look===l)), []);
  const ALLTEXT=JSON.stringify([T.CN_TEXT,T.CN_OPT,T.CN_LINES,T.CN_PROMISE])+cards.map(x=>JSON.stringify(x.card.opts.filter(o=>o.k!=='next'))).join('');
  c('no "AI" or "IA" anywhere', /\b(AI|IA)\b|artificial/.test(ALLTEXT), false);
  c('Spanish says usted, never tú', /\b(tú|tienes|quieres|puedes|tu nombre|te gustaría)\b/i.test(JSON.stringify([T.CN_TEXT,T.CN_OPT,T.CN_LINES].map(o=>Object.values(o).map(v=>v.es)))), false);
  c('no raffle, prize or "enter to win"', /raffle|prize|win\b|sorteo|premio|rifa/i.test(ALLTEXT), false);

  console.log('\n-- every card goes through the real server --');
  { const m=new Map(); let n=0;
    globalThis.__terrainConnectStore={ async get(kk){ const v=m.get(kk); return v===undefined?null:JSON.parse(v); },
      async setJSON(kk,v,o={}){ if(o.onlyIfNew&&m.has(kk)) return {modified:false}; m.set(kk,JSON.stringify(v)); return {modified:true,etag:'e'+(++n)}; },
      async delete(kk){ m.delete(kk); }, async list({prefix=''}={}){ return {blobs:[...m.keys()].filter(kk=>kk.startsWith(prefix)).map(key=>({key}))}; } };
    for(const kk of ['TERRAIN_CODES','TERRAIN_REQUIRE_CODE','TERRAIN_REG_SECRET']) delete process.env[kk];
    process.env.TERRAIN_CODES='TEST-CODE';
    const fn=(await import(path.join(ROOT,'netlify/functions/connect.mjs'))).default;
    const bad=[];
    for(const {id,card} of cards){
      const res=await fn(new Request('https://x/.netlify/functions/connect',{method:'POST',headers:{'content-type':'application/json','x-terrain-code':'TEST-CODE'},body:JSON.stringify({op:'create',card})}),{});
      if(res.status!==200) bad.push(id+' '+(await res.text()));
    }
    c(`all ${cards.length} cards accepted by connect.mjs`, bad.slice(0,5), []);
    c('6,306 cards (3,050 library ideas and 103 built-ins, each as an event and as a series)', cards.length, 6306);
    delete process.env.TERRAIN_CODES; }
  console.log('\n-- v10.43 (review, 1 Oct 2026): the title is cut alike in both languages --');
  // The review: the English name was cut at its subtitle and the Spanish was not, so the health fair's Spanish card read "Feria de salud
  // completa, con pruebas y una ruta de derivación" (planning words) on the card, the phone form, the sheet and "Lo que sigue".
  { const he=T.cnTailor(B('health-expo'),{cadence:'event',church:'Sampleton SDA (SAMPLE)',lang:'both'});
    c('the health fair: "Full health expo" / "Feria de salud completa"', he.title, {en:'Full health expo',es:'Feria de salud completa'});
    c('cnNextNoun cuts the Spanish where the English is cut (given the English name)', T.cnNextNoun(MIN_ES['health-expo'],'es',sigById.get('health-expo').n).np, 'la feria de salud completa');
    c('…and the pair cut keeps the English whole when the Spanish has no place to cut', JSON.parse(JSON.stringify(T.cnCutPair('Music Maker award: families sing at a care home','Las familias del club cantan en un hogar de ancianos'))),
      {en:'Music Maker award: families sing at a care home',es:'Las familias del club cantan en un hogar de ancianos'});
    const CAD=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/ideas-src/cadence.json'),'utf8')), CB=lit('CASE_CADENCE_BUILTIN');
    const rows=[], bad=[], full=s=>String(s||'').trim().replace(/[.!]+$/,'');
    // [id, titles, English shortened, Spanish shortened, a built-in]
    for(const s of SIG){ if(!CB[s.id]) continue; const I=B(s.id), t=T.cnTitles(I); rows.push([s.id,t,t.en!==full(I.name.en),t.es!==full(I.name.es),true]); }
    for(const x of LIB){ const k=(CAD.cadence||CAD)[x.id]; if(!k||k==='ongoing') continue; const I={id:x.id,builtin:false,themes:[x.theme],name:{en:x.en.n,es:(x.es&&x.es.n)||x.en.n}};
      const t=T.cnTitles(I); rows.push([x.id,t,t.en!==full(I.name.en),t.es!==full(I.name.es),false]); }
    const long=t=>t.es.length>t.en.length*1.6&&t.es.length-t.en.length>15;
    // (every built-in; a library idea where one language was shortened and the other not, the review's mismatch. Two names each cut at
    // their own subtitle, or both whole, are the writers' own: "Global Youth Day" / "Día Mundial del Joven Adventista")
    for(const [id,t,ec,sc,bi] of rows) if(long(t)&&(bi||ec!==sc)) bad.push(id+': '+t.en+' | '+t.es);
    c(`${rows.length} event and series titles: the Spanish within 1.6× the English (every built-in, and every title shortened in one language only)`, bad, []);
    c('…and no Spanish title keeps a subtitle its English lost', rows.filter(([id,t,ec,sc])=>ec&&!sc).map(([id,t])=>id+': '+t.en+' | '+t.es).slice(0,5), []); }
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
