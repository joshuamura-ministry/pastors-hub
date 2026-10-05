// v10.45.0 — the review round (5 Oct 2026): review/PASTOR-REVIEW.md (findings 1–28), review/CODE-REVIEW.md (S1–S4, M1–M3, M5, M6)
// and the coordinator's notes and decisions. One check (or a few) per finding, in English and Spanish where the words differ. The PDF's
// (#19, #25a, S5, M4) are in v45-pdf, "Your church" and B1 in v45-profile-move. Written failing-first against the reviewed build
// (build-work/pre-review: base + review/logs/index.diff, byte-identical to it, with its ideas/).
const fs=require('fs'), path=require('path');
const {ROOT,FX,sleep,until,checker,page,ready,survey,openNeed,openSheet}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const BG=require('./scripture-bg.json').passages;
const NB=['our neighbors’ language','el idioma de nuestros vecinos'];
// Atlanta, West End (1040 Ralph David Abernathy Blvd SW), as the pastor review read it: 41 children, every family with children
// headed by one parent, no child poverty
const ATL=`Object.assign(D.M.tract,{kids:41,kidsShare:1.9,singleParent:100,famKidsN:20,childPoverty:0,grandKids:0});`;
// Detroit (7400 Joy Rd): Spanish at home for 13%, about 2,000 people, 18% of them with limited English
const DET=`D.M.tract.langs=[{name:'Spanish',share:13,count:2000,ltvw:360},{name:'Arabic',share:2.2,count:120,ltvw:38}];`;
// Edison NJ (1679 Oak Tree Rd): two Census groups, both Indian languages here
const EDI=`D.M.tract.langs=[{name:'Other European',share:30,count:9000,ltvw:2000},{name:'Other Asian / Pacific',share:15,count:4500,ltvw:900},{name:'Spanish',share:3,count:900,ltvw:200}];
  D.M.tract.origins=[{name:'India',n:5000,share:84},{name:'China',n:300,share:5}];`;
// Immokalee FL: Spanish and French or Haitian Creole, born in Haiti among the commonest; in Florida, at latitude 26.4
const IMM=`D.M.tract.langs=[{name:'Spanish',share:77,count:3072,ltvw:1500},{name:'French / Haitian Creole',share:11,count:426,ltvw:302}];
  D.M.tract.origins=[{name:'Guatemala',n:600,share:40},{name:'Mexico',n:500,share:30},{name:'Haiti',n:300,share:18}];
  D.geo={matched:'417 N 1st St',county:{STATE:'12'},coords:{x:-81.42,y:26.42}};`;
const PA=`D.geo={matched:'118 Bristol Rd',county:{STATE:'42'},coords:{x:-75.1,y:40.2}};`;
const model=(P,mod,lang)=>{ survey(P,{mod}); return P.J(`NSM`); };

(async()=>{ await T.sec(async()=>{
  console.log('\n-- the ranking: greatest first (coordinator 3), language by limited English too (#12) --');
  const P=page({needs:'file'}); await ready(P);
  let S=model(P,'');
  c('the needs read greatest first: every score at most the one above it', S.needs.every((n,i,a)=>i===0||n.score<=a[i-1].score), true);
  S=model(P,DET);
  const lp=S.needs.find(n=>n.id==='lang-primary');
  c('Detroit: Spanish at home with 18% limited English counts as strength 1 (its line), not 13% ÷ 8', [lp&&lp.s,lp&&lp.score], [1,9]);
  c('…and says how many speak English less than "very well," as the second language\'s card does', lp&&lp.evidence, '13% speak Spanish at home, about 2,000 people; 18% of them speak English less than "very well."');
  survey(P,{mod:DET}); const P2=page({needs:'file',lang:'es'}); await ready(P2); survey(P2,{mod:''});
  const S2=P2.J('NSM');
  c('on the Spanish page a Spanish-language need never wears "Mayor necesidad"', [S2.needs[0].id==='lang-primary'?!S2.needs[0].top:true,!S2.needs.some(n=>n.top&&n.lang==='Spanish')], [true,true]);
  c('…and its detail says a church that worships in Spanish has met it (both pages)', [P2.J(`NSM.needs.find(n=>n.id==='lang-primary').steps[0]`),(survey(P,{mod:''}),P.J(`NSM.needs.find(n=>n.id==='lang-primary').steps[0]`))],
    ['Si su iglesia ya adora en español, este paso ya está dado: vea las ideas de inglés para los niños y las de los otros idiomas de aquí.',
     'If your church already worships in Spanish, this one is already met: look at the English-learning ideas and the other languages here.']);

  console.log('\n-- #2: no need on a share of a handful (Atlanta West End) --');
  S=model(P,ATL);
  c('single-parent does not fire where about 20 families have children ("100%" of a handful)', [S.needs.some(n=>n.id==='single-parent'),S.also.some(n=>n.id==='single-parent')], [false,false]);
  c('…nor child-poverty or grandparents on 41 children', ['child-poverty','grandparents'].filter(id=>S.needs.some(n=>n.id===id)), []);
  c('the badge sits on a need built on 50 people or more (or a count the survey cannot read)', S.needs.filter(n=>n.top).every(n=>n.count==null||n.count>=50), true);
  S=model(P,'');
  c('where it fires, the share comes with the number of families', S.needs.find(n=>n.id==='single-parent').evidence, '35% of families with children, about 271 families, are headed by a single parent.');
  c('a gate a survey cannot read (an old saved survey with no counts) does not block', P.J(`NS_GATE['single-parent']({singleParent:40})`), true);

  console.log('\n-- #7: one figure, one row --');
  c('the fixture shows rent burden and SNAP, so "Debt can take hold here" is not a third card on the same figures', [S.needs.some(n=>n.id==='rent50'),S.needs.some(n=>n.id==='snap'),[...S.needs,...S.also].some(n=>n.id==='debt')], [true,true,false]);
  S=model(P,`Object.assign(D.M.tract,{seniorsAlone:14,seniorsAloneN:280,medAge:50});`);
  c('grief joins "seniors living alone" when that is shown: no card of its own, its ideas in that list', [S.needs.some(n=>n.id==='grief'),S.needs.some(n=>n.id==='seniors-alone'),S.merged['seniors-alone']], [false,true,'grief']);
  await openNeed(P,'seniors-alone',true); await until(()=>P.q('#ns-i-seniors-alone .ns-row'));
  const grief4=P.J(`(NS.map.needs.grief||[]).slice(0,4)`), shown=P.qa('#ns-i-seniors-alone .ns-row').map(r=>r.dataset.idea);
  c('…its four strongest ideas are there', grief4.filter(id=>!shown.includes(id)&&P.J(`!!nsView(${JSON.stringify(id)})`)&&P.J(`nsView(${JSON.stringify(id)}).reach!=='in'`)), []);
  c('two rows with the same figure are one ("26% of renters pay…")', P.J(`nsFigKey('26% of renters pay more than half their income in rent — about 1,137 households here.')===nsFigKey('26% of renters pay over half their income in rent — the conditions where debt takes hold.')`), true);

  console.log('\n-- #8, #9: the town, and "Also here" in plain words --');
  S=model(P,`D.levels.cousub={kind:'Town',name:'Immokalee Ccd',short:'Immokalee',ccd:true}; D.M.cousub.past=D.M.tract.past; D.M.cousub.pop=D.M.tract.pop; D.M.tract.past=null;`);
  c('a census county division is "the Immokalee area": the tag and the line', [P.txt('#u-needs [data-also="town"] .ns-tag'),/across the Immokalee area as a whole/.test(P.txt('#u-needs .ns-alsob .note')||'')], ['Across the Immokalee area',true]);
  c('…the growth figure says where it is ("across the Immokalee area")', /^The population across the Immokalee area has grown/.test((S.needs.find(n=>n.id==='growth')||{}).evidence||''), true);
  // v10.47.0: the place line is the church now (the pastor: "we just need to know which church"); the town is on the Town button
  c('…never "Ccd": not on the place line (the church), not on the Town button', [/Ccd|CCD/.test(P.E(`(renderPlace(DATA.levels,DATA.geo),document.getElementById('place').textContent)`)),/Ccd|CCD/.test(P.txt('#scope')||'')], [false,false]);
  const Pes=page({needs:'file',lang:'es'}); await ready(Pes); survey(Pes,{mod:`D.levels.cousub={kind:'Town',name:'Immokalee Ccd',short:'Immokalee',ccd:true};`});
  c('…in Spanish: "En toda la zona de Immokalee"', Pes.txt('#u-needs [data-also="town"] .ns-tag'), 'En toda la zona de Immokalee');
  model(P,'');
  c('"Near the line" is "Almost a need here"', P.txt('#u-needs [data-also="near"] .ns-tag'), 'Almost a need here');
  c('the intro says what the two kinds are', P.txt('#u-needs .ns-alsob .note'), 'Two smaller kinds: figures here that are just under our mark, and needs across Warminster as a whole.');
  S=model(P,`D.M.tract.rent50=12; Object.assign(D.M.cousub,{rent50:30,renters:50,hh:20000});`);
  const tr50=S.also.find(n=>n.id==='rent50'&&n.tag==='town');
  c('a town row says "across Warminster" where its sentence said "here"', tr50&&tr50.evidence, '30% of renters pay more than half their income in rent — about 3,000 households across Warminster.');
  S=model(P,`D.M.tract.gini=0.53;`);
  c('Gini in plain words', (S.needs.find(n=>n.id==='gini')||{}).evidence, 'Incomes here are very uneven: a few households earn far more than most.');

  console.log('\n-- #10, #17: languages named truthfully, never twins, never "their language" --');
  S=model(P,EDI);
  const t=['lang-primary','lang-also'].map(id=>(S.needs.find(n=>n.id===id)||{}).title);
  c('Edison: the two groups named by their members here, two different titles', t, ['Materials and welcome in Hindi, Gujarati, Urdu and related languages','Materials and welcome in Tamil, Telugu and other Asian languages']);
  survey(P2,{mod:EDI});
  c('…in Spanish', ['lang-primary','lang-also'].map(id=>P2.J(`NSM.needs.find(n=>n.id==='${id}').title`)), ['Materiales y bienvenida en hindi, guyaratí, urdu y lenguas afines','Materiales y bienvenida en tamil, telugu y otras lenguas asiáticas']);
  await openSheet(P,'lang-primary','immigrants-welcome-card-in-lang');
  // (the coordinator, after the samples: a group whose members the origins name is said by those members, joined by "or")
  c('a group\'s {lang} is the members its title names, joined by "or" (a printed card can say it)', P.txt('#ns-s-t'), 'A welcome card in Hindi, Gujarati or Urdu and English');
  P.E(`nsSheetClose()`);
  await openSheet(P2,'lang-primary','immigrants-welcome-card-in-lang');
  c('…in Spanish, "hindi, guyaratí o urdu" (never "su idioma", which reads "your language")', P2.txt('#ns-s-t'), 'Una tarjeta de bienvenida en hindi, guyaratí o urdu y en inglés');
  P2.E(`nsSheetClose()`);
  S=model(P,IMM);
  c('Immokalee: "French or Haitian Creole" is Haitian Creole where Haiti is among the origins (title, chip)', [(S.needs.find(n=>n.id==='lang-also')||{}).title,S.langs[1].show], ['Materials and welcome in Haitian Creole','Haitian Creole']);
  S=model(P,IMM.replace("{name:'Haiti',n:300,share:18}","{name:'France',n:300,share:18}"));
  c('…and French where it is not', (S.needs.find(n=>n.id==='lang-also')||{}).title, 'Materials and welcome in French');

  console.log('\n-- #15, #27a, #27b, #21: the words --');
  S=model(P,'');
  const all=JSON.stringify(S.needs.concat(S.also).map(n=>[n.title,n.evidence,n.steps,n.ask]));
  c('US spelling on the English page (no neighbour, programme, enrolment, recognised, diarised, rota)', /neighbour|programme|enrolment|recognised|diarised|\brota\b/i.test(all), false);
  const say=id=>P.J(`(()=>{ const r=RULES.find(z=>z.id==='${id}'); return nsSay(r,DATA.M.tract,DATA.M.county,{tr:null,where:'',whereEs:''}); })()`);
  c('love first: "Comfortable homes, real needs"; "Getting there is the hardest part"', [say('affluent').title,say('seniors-nocar').title], ['Comfortable homes, real needs','Getting there is the hardest part']);
  c('…kids: "what you do for children helps the most families", the gap "is where you can help"', [say('kids').steps[0],/where you can help\.$/.test(say('kids').ask)], ['Here, what you do for children helps the most families.',true]);
  c('…renters, college, foreign: no membership drive, no "reachable", no "before doctrine"', /membership drive|reachable|before doctrine/.test(JSON.stringify([say('renters'),say('college'),say('foreign')])), false);
  c('…growth: "a friend, a map and a meal"', say('growth').steps[0], 'The first months after a move are when people most need a friend, a map and a meal.');
  c('"Many households need help with food"', S.needs.find(n=>n.id==='snap').title, 'Many households need help with food');
  c('categories: work and schedules, income, young adults (never "Hardship & work" for professionals)', P.J(`['professional','commuters','shiftwork','affluent','gini','college','isolationyoung'].map(id=>nsNeedOf(RULES.find(r=>r.id===id),0,DATA.M.tract,DATA.M.county,{tr:null,where:'',whereEs:''},false).catLabel)`),
    ['Work & schedules','Work & schedules','Work & schedules','Income','Income','Young adults','Young adults']);
  c('…on the card, in Spanish too', [P.txt('#u-needs [data-need="shiftwork"] .ns-cat'),(survey(P2,{mod:''}),P2.txt('#u-needs [data-need="shiftwork"] .ns-cat'))], ['Work & schedules','Trabajo y horarios']);

  console.log('\n-- #23, M5, M6: the count, and a new address --');
  model(P,'');
  c('the focus note counts the needs, and "Also here" apart', P.txt('#focusnote'), `Showing everything: ${P.J('NSM.needs.length')} needs here, and ${P.J('NSM.also.length')} more under Also here. Use Focus to narrow it.`);
  await openNeed(P,'rent50',true); P.E(`NS.showAll=true`);
  survey(P,{mod:`D.levels.tract.name='Census Tract 9999';`});
  c('a new address opens with every need closed and the first twelve shown', [P.J('NS.open'),P.J('NS.ideas'),P.J('NS.showAll')], ['',false,false]);
}); await T.sec(async()=>{
  console.log('\n-- the ideas: #13 Spanish list, #14 snow, #11 built-ins in the language, S3 the 4% rule, #27e town rows, M3 --');
  const P=page({needs:'file'}); await ready(P); survey(P,{mod:PA});
  await openNeed(P,'lang-primary',true);
  const rows=P.qa('#ns-i-lang-primary .ns-row').map(r=>r.dataset.idea), per=P.qa('#ns-i-lang-primary .ns-lift').map(g=>g.querySelectorAll('.ns-row').length);
  c('the Spanish need: 15 ideas at most, 5 a lift', [rows.length<=15,per.every(n=>n<=5)], [true,true]);
  c('…never the same idea twice in two wordings (the web page, the interpretation)', rows.filter(id=>['immigrants-spanish-web-whatsapp','immigrants-worship-interpretation'].includes(id)), []);
  c('…its own curated ideas first', rows[0], 'immigrants-welcome-card-in-lang');
  c('the built-ins say the language: "A small group in Spanish"', P.txt('#ns-i-lang-primary .ns-row[data-idea="sg-language"] .ns-in'), 'A small group in Spanish');
  await openSheet(P,'lang-primary','proph-language');
  c('…the prophecy seminar\'s first step finds a presenter who preaches in Spanish', P.txt('#ns-sheet .ns-steps li'), 'Find a presenter who preaches in Spanish, or a church nearby that worships in it.');
  P.E(`nsSheetClose()`);
  await openNeed(P,'child-poverty',true);
  const snowPA=P.qa('#ns-i-child-poverty .ns-row').some(r=>r.dataset.idea==='hunger-snow-day-boxes');
  survey(P,{mod:IMM}); await openNeed(P,'child-poverty',true);
  c('snow-day boxes: in Pennsylvania yes, in Florida never', [snowPA,P.qa('#ns-i-child-poverty .ns-row').some(r=>r.dataset.idea==='hunger-snow-day-boxes')], [true,false]);
  c('…no idea named for snow anywhere on a Florida page', P.J(`NSM.needs.flatMap(n=>nsIdeasFor(n)).filter(v=>/snow/i.test(v.n||v.name)).map(v=>v.id)`), []);
  survey(P,{mod:`D.M.tract.langs=[{name:'German',share:2.5,count:140,ltvw:20}]; D.M.tract.foreign=30; D.M.tract.recentOfForeign=40;`});
  const sayG=P.J(`NSM.needs.filter(n=>!['lang-primary','lang-also','lang-third'].includes(n.id)).flatMap(n=>nsIdeasFor(n)).filter(v=>/German/.test(v.name)).map(v=>v.id)`);
  c('S3: 2.5% German at home: no idea under another need says "German" (the 4% rule)', sayG, []);
  c('…they say "our neighbors’ language"', P.J(`NSM.needs.flatMap(n=>nsIdeasFor(n)).some(v=>v.name.includes(${JSON.stringify(NB[0])}))`), true);
  survey(P,{mod:`D.M.tract.langs=[{name:'Chinese',share:24,count:1400,ltvw:700}]; D.M.cousub.langs=[{name:'Spanish',share:20,count:9000,ltvw:3000}];`});
  c('#27e: a town row speaks the neighborhood\'s own first language (8% or more), not the town\'s', P.J(`nsNeedLang({id:'recent',tag:'town'}).name`), 'Chinese');
  survey(P,{mod:`D.M.tract.langs=[{name:'Chinese',share:5,count:300,ltvw:100}]; D.M.cousub.langs=[{name:'Spanish',share:20,count:9000,ltvw:3000}];`});
  c('…else the town\'s', P.J(`nsNeedLang({id:'recent',tag:'town'}).name`), 'Spanish');
  survey(P,{mod:`D.M.cousub.origins=[{name:'India',n:900,share:60}];`});
  c('M3: the Diwali greeting under an "Across {town}" row reads the town\'s places of birth', [P.J(`nsOriginOk('holidays-diwali-sweets-greeting',{tag:'town'})`),P.J(`nsOriginOk('holidays-diwali-sweets-greeting',{tag:''})`)], [true,false]);
}); await T.sec(async()=>{
  console.log('\n-- #6: money said truly; the sheet\'s words (#27c, #25b, #26) --');
  const P=page({needs:'file'}); await ready(P); survey(P,{mod:PA});
  c('a built-in the needs reach is priced at its source: Pathfinders "About $1,500 to start · About $100 a month"', P.J(`nsRows(nsView('pathfinders')).filter(r=>/^r(Start|Month)/.test(r[0]))`), [['rStart','About $1,500'],['rMonth','About $100']]);
  c('…an event is one sum: VBS "About $1,000 in all" (no month row), its hours "in all"', [P.J(`nsMoney(nsView('vbs'))`),P.J(`nsRows(nsView('vbs')).map(r=>r[0])`).includes('rMonth'),/in all$/.test(P.J(`nsRows(nsView('vbs')).find(r=>r[0]==='rTime')[1]`))], ['About $1,000 in all',false,true]);
  c('…a heavy built-in is never "No cost" unless it is truly free', P.J(`Object.keys(U_LINES_OWN).filter(id=>{ const v=nsView(id); return v&&nsLift(v)==='heavy'&&!v.cost&&!v.costMo; })`), []);
  const unp=P.J(`SIGNATURE.map(x=>x.id).find(id=>!U_LINES_OWN[id]&&!U_FREE_OK.has(id))`);
  c('…one without a real figure yet says "Cost varies: ask your conference" (never the $75 allowance)', P.J(`nsMoney(nsView(${JSON.stringify(unp)}))`), 'Cost varies: ask your conference');
  { const ids=[...new Set(Object.values(JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','needs.json'),'utf8')).needs).flat())];
    c('…every built-in a need reaches is priced or truly free', P.J(`${JSON.stringify(ids)}.filter(id=>SIGNATURE.some(x=>x.id===id)&&!U_LINES_OWN[id]&&!U_FREE_OK.has(id))`), []); }
  c('…and Make the Case reads the same figure (uBase)', P.J(`uBase(SIGNATURE.find(x=>x.id==='pathfinders')).lines.reduce((a,l)=>[a[0]+l.startup,a[1]+l.monthly],[0,0])`), [1500,100]);
  c('#27c: the line under "What it needs" says whom to ask', P.J(`nsU('askFor')`), 'If our church does not have all of this yet, that is fine: this list shows what to ask the church for.');
  c('#25b: a parent\'s or guardian\'s consent', P.J(`LIB_T.kids`), ['With children or teens: only screened adults (background checks), always two adults, and a parent’s or guardian’s consent.','Con niños o adolescentes: solo adultos verificados (verificación de antecedentes), siempre dos adultos y el consentimiento de los padres o tutores.']);
  const vg=P.J(`nsVerse('grief')`), vs=P.J(`nsVerse('single-parent')`);
  c('#26: grief reads Psalm 34:18, single parents Galatians 6:2', [vg.en.ref,vg.es.ref,vs.en.ref,vs.es.ref], ['Psalm 34:18','Salmos 34:18','Galatians 6:2','Gálatas 6:2']);
  c('…word for word as Bible Gateway prints them (KJV, RVA 1909)', [vg.en.text===BG['Psalm 34:18'].KJV.text,vg.es.text===BG['Psalm 34:18'].RVA.text,vs.en.text===BG['Galatians 6:2'].KJV.text,vs.es.text===BG['Galatians 6:2'].RVA.text], [true,true,true,true]);
}); await T.sec(async()=>{
  console.log('\n-- S1, S2: a {lang} idea, one plan entry per language, kept in the language it was chosen in --');
  const P=page({needs:'file'}); await ready(P); survey(P,{mod:PA});
  await openSheet(P,'lang-primary','immigrants-welcome-card-in-lang');
  P.q('#ns-sheet [data-ns-propose]').click(); await until(()=>P.E('TOOL')==='case'); await sleep(120);
  c('proposed from the Spanish need: its own plan entry for Spanish', [P.J('uSelected()'),P.J(`uChurch().lib['immigrants-welcome-card-in-lang--spanish'].en.n`)], [['immigrants-welcome-card-in-lang--spanish'],'A welcome card in Spanish and English']);
  P.E(`openTool('survey')`);
  const kept=P.J(`uChurch().lib`);
  survey(P,{mod:PA+`D.M.tract.langs=[{name:'Chinese',share:24,count:1400,ltvw:700}];`}); P.E(`uChurch().selected=['immigrants-welcome-card-in-lang--spanish']; uChurch().lib=${JSON.stringify(kept)}; uPersist();`);
  await openSheet(P,'lang-primary','immigrants-welcome-card-in-lang');
  c('…the Chinese card is not "In your plan" because the Spanish one is', !!P.q('#ns-sheet [data-ns-remove]'), false);
  P.q('#ns-sheet [data-ns-propose]').click(); await until(()=>P.E('TOOL')==='case'); await sleep(120);
  c('…proposing it adds a second entry, the Spanish one kept', P.J('uSelected()'), ['immigrants-welcome-card-in-lang--spanish','immigrants-welcome-card-in-lang--chinese']);
  survey(P,{mod:PA});
  P.E(`(async()=>{ await libLoadIndex(); await libLoadTheme('immigrants'); })()`); await until(()=>P.J(`!!libFull('immigrants-welcome-card-in-lang')`));
  const x=P.J(`(()=>{ const x=libSave(libFull('immigrants-welcome-card-in-lang')); return x&&{id:x.id,n:uChurch().lib[x.id].en.n,f:uChurch().lib[x.id].langFilled}; })()`);
  c('S2: chosen in Make the Case\'s library, it is saved filled, under its language\'s own id', x, {id:'immigrants-welcome-card-in-lang--spanish',n:'A welcome card in Spanish and English',f:'Spanish'});
  P.E(`DATA.M.tract.langs=[{name:'Chinese',share:24,count:1400,ltvw:700}]; render();`);
  c('…and keeps Spanish when another survey (Chinese) is on screen', P.J(`libRawOf('immigrants-welcome-card-in-lang--spanish').en.n`), 'A welcome card in Spanish and English');
}); await T.sec(async()=>{
  console.log('\n-- S4, M2: a deploy under an open tab; a proposal called back --');
  const P=page({needs:'file'}); await ready(P); survey(P,{mod:PA});
  await openNeed(P,'rent50',true);
  P.E(`libRenew()`);   // a newer deploy's theme renewed the library: the index is gone
  const id=P.q('#ns-i-rent50 .ns-row').dataset.idea; P.q(`#ns-i-rent50 .ns-row[data-idea="${id}"]`).click();
  c('S4: a row still opens its sheet after the library renews (no dead button)', await until(()=>P.q('#ns-sheet[open]')&&P.q('#ns-sheet').dataset.idea===id,6000), true);
  c('…and its steps arrive', await until(()=>P.qa('#ns-sheet .ns-steps li').length>0,6000), true);
  P.E(`nsSheetClose()`);
  survey(P,{mod:PA}); P.E(`uChurch().selected=[]; uPersist();`);
  await openSheet(P,'rent50',id);
  P.q('#ns-sheet [data-ns-propose]').click(); P.E(`nsSheetClose()`);   // he closes it while the words load
  await sleep(400);
  c('M2: closed before the words arrived: nothing added, no jump to Make the Case', [P.E('TOOL'),P.J('uSelected()')], ['survey',[]]);
}); await T.sec(async()=>{
  console.log('\n-- #4, #5, #27d, M1: Make the Case --');
  const P=page({needs:'file'}); await ready(P); survey(P,{mod:IMM});
  await openSheet(P,'lang-also','immigrants-welcome-card-in-lang');
  const ev=P.J(`NSM.needs.find(n=>n.id==='lang-also').evidence`);
  P.q('#ns-sheet [data-ns-propose]').click(); await until(()=>P.E('TOOL')==='case'&&P.q('#cs-s2 .cs-chosen')); await sleep(150);
  c('#4: the Haitian Creole card\'s "Why here" is its need\'s figure, not the Spanish one', [P.J(`libWhyText(caseItemOf(casePrefs().ministry),DATA.M.tract,profile(DATA.M.tract,DATA.M.county,null))`),/Haitian Creole/.test(ev)], [ev,true]);
  c('…on the card in Make the Case', (P.txt('#cs-s2 .cs-chosen')||'').includes(ev), true);
  c('#5: above the chosen card, what comes next and the way back', [P.txt('#cs-s2 .cs-fromnext span'),P.txt('#cs-s2 [data-cs-from2]')], ['Next: choose who it is for (step 1, above). The slides appear below.','← Back to the need']);
  c('…and the top line is still the one way back of its kind', P.qa('#casebody [data-cs-from]').length, 1);
  P.q('#cs-s2 [data-cs-from2]').click(); await until(()=>P.E('TOOL')==='survey'); await sleep(100);
  c('…it goes back to the need', [P.E('TOOL'),P.J('NS.open')], ['survey','lang-also']);
  c('#27d: What\'s next names it the sheet\'s way, "Create the proposal for …"', /^Create the proposal for /.test(P.txt('#u-whatsnext [data-u-next-case]')||''), true);
  P.E(`showHub(); openTool('case'); caseToSurvey();`); await sleep(120);
  c('M1: Make the Case\'s "Open the Community Survey" lands on the needs', (P.w.__scrolled.filter(s=>s.id).pop()||{}).id, 'u-needs');
  c('…its words point to a need', P.J(`caseStepT('planNone')`), 'Open a need in the Community Survey and choose an idea, or pick an idea below.');
}); await T.sec(async()=>{
  console.log('\n-- #1, #27f: the sheet on a computer; the phone preamble --');
  const P=page({needs:'file'}); await ready(P); survey(P,{mod:PA});
  c('#1: the sheet is centred again (margin:auto after the page\'s *{margin:0}; a phone keeps margin:0)', /dialog\.ns-sheet\{[^}]*margin:auto/.test(require('fs').readFileSync(path.join(ROOT,'index.html'),'utf8')), true);
  // v10.45.1 — the pastor (5 Oct 2026) asked for the note and the link to go: "erase that, they will understand".
  c('#27f (v10.45.1): no note, no Spiritual Gifts link, no lift legend above the needs', [P.qa('#u-needs .ns-nofill').length,P.qa('#u-needs [data-gf-church]').length,P.qa('#u-needs .ns-legend').length], [0,0,0]);
}); await T.sec(async()=>{
  console.log('\n-- #3, #15, #16, #20, #24, #28: the ideas\' own words --');
  const P=page({needs:'file'}); await ready(P);
  const S=id=>P.J(`SIGNATURE.find(x=>x.id==='${id}')`);
  c('#3 VBS: never "the name and address of every family"; the sign-in sheet is for the children\'s safety', [/name and address/.test(S('vbs').d),/never used for mailings or visits/.test(S('vbs').d)], [false,true]);
  c('…its teams: screened adults, two in every room; no "games" on a Sabbath idea', [/screen every adult, and keep two adults in every room/.test(S('vbs').how[1]),/games/.test(S('vbs').d)], [true,false]);
  c('#16 the cold-snap check-in: only those who said yes, the weather service\'s warning, at people\'s doors', [S('winter-check').n,/Nobody is visited who has not said yes/.test(S('winter-check').d),/weather service/.test(P.J(`HOW['winter-check'][1]`)),P.J(`nsView('winter-check').where`)],
    ['A cold-snap check-in for older neighbors',true,true,'homes']);
  c('…the court: two screened adults whenever children play', [P.J(`HOW['lot-sport'][3]`),/two screened adults/.test(S('lot-sport').d)], ['Two screened adults are present whenever children are playing, and the court is open only at the posted hours.',true]);
  c('#15 Pathfinders and the sports camp: no "bridge", no "sign up for anything free"', [/bridge/.test(S('pathfinders').d),/anything free/.test(S('sports-camp').d)], [false,false]);
  const N=JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','needs.json'),'utf8')), reached=[...new Set(Object.values(N.needs).flat())].filter(id=>P.J(`SIGNATURE.some(x=>x.id===${JSON.stringify(id)})`));
  const Pes=page({needs:'file',lang:'es'}); await ready(Pes);
  c(`#20 every built-in the needs show (${reached.length}) has its Spanish description`, reached.filter(id=>!Pes.J(`nsView(${JSON.stringify(id)}).d`)), []);
  c('…and its partner in Spanish where it has one', reached.filter(id=>P.J(`nsView(${JSON.stringify(id)}).partner`)&&!Pes.J(`nsView(${JSON.stringify(id)}).partner`)), []);
  const lib=(f,id)=>JSON.parse(fs.readFileSync(path.join(ROOT,'tools','ideas-src','themes',f+'.json'),'utf8')).ideas.find(x=>x.id===id);
  c('#28 the Diwali card: "joy and peace this season" (EN, ES)', [/joy and peace this season/.test(lib('holidays','holidays-diwali-sweets-greeting').en.d),/alegría y paz en esta temporada/.test(lib('holidays','holidays-diwali-sweets-greeting').es.d)], [true,true]);
  c('#11 the Lunar New Year card blesses in the need\'s language ({lang})', [/blessing in \{lang\}/.test(lib('holidays','holidays-lunar-new-year-red-cards').en.d),/bendición en \{lang\}/.test(lib('holidays','holidays-lunar-new-year-red-cards').es.d)], [true,true]);
  c('#24 the bounce house and the game night: not on a Sabbath; the respite room: Bible games and crafts on a Sabbath',
    [/bounce house with its own attendant \(on another day, not on a Sabbath\)/.test(lib('foster-care','foster-care-agency-family-picnic').en.d),/game night \(not on a Sabbath\)/.test(lib('neighbors','neighbors-apartment-welcome-week').en.d),/Bible games and Bible crafts on a Sabbath/.test(lib('families','families-grandfamily-respite-afternoon').en.how[1])], [true,true,true]);
  c('#6 the two low library figures: the family restroom $20,000, the closet on wheels $25,000', [lib('hospitality','hospitality-automatic-door-family-restroom').cost,lib('clothing-practical','clothing-practical-closet-on-wheels').cost], [20000,25000]);
}); await T.sec(async()=>{
  console.log('\n-- the coordinator\'s polish after the samples (5 Oct): group languages, "no leader needed", "Your church", the PDF head --');
  const P=page({needs:'file'}); await ready(P); survey(P,{mod:EDI});
  await openSheet(P,'limeng','immigrants-phone-call-buddy-lang');
  c('Edison\'s phone-call buddy (the samples): "A phone-call buddy who speaks Hindi, Gujarati or Urdu"', P.txt('#ns-s-t'), 'A phone-call buddy who speaks Hindi, Gujarati or Urdu');
  P.E(`nsSheetClose()`);
  await openSheet(P,'lang-also','immigrants-welcome-card-in-lang');
  c('…the second group by its own members: "A welcome card in Tamil or Telugu and English"', P.txt('#ns-s-t'), 'A welcome card in Tamil or Telugu and English');
  P.E(`nsSheetClose()`);
  c('…the first group, the same members as its title: "Hindi, Gujarati or Urdu"', P.J(`nsLangFill(DATA.M.tract.langs[0],'en')`), 'Hindi, Gujarati or Urdu');
  c('…Make the Case and the Idea Library fill it the same way (the first language at home)', [P.J(`libFill('{lang}','en')`),P.J(`libFill('{lang}','es')`)], ['Hindi, Gujarati or Urdu','hindi, guyaratí o urdu']);
  c('…with no member named by the origins, "our neighbors’ language" still', (survey(P,{mod:EDI.replace("{name:'India',n:5000,share:84}","{name:'Mexico',n:5000,share:84}")}),P.J(`nsLangFill(DATA.M.tract.langs[0],'en')`)), NB[0]);
  survey(P,{mod:EDI}); P.E(`uChurch().selected=[]; uPersist();`);
  for(const need of ['lang-primary','lang-also']){ await openSheet(P,need,'immigrants-welcome-card-in-lang'); P.q('#ns-sheet [data-ns-propose]').click(); await until(()=>P.E('TOOL')==='case'); await sleep(150); P.E(`openTool('survey')`); await sleep(80); }
  c('…two plan entries, one per group, each saved in its members\' words', [P.J('uSelected()'),P.J(`uSelected().map(id=>uChurch().lib[id].en.n)`)],
    [['immigrants-welcome-card-in-lang--indo-european','immigrants-welcome-card-in-lang--asian-pacific'],['A welcome card in Hindi, Gujarati or Urdu and English','A welcome card in Tamil or Telugu and English']]);
  const Pes=page({needs:'file',lang:'es'}); await ready(Pes); survey(Pes,{mod:EDI});
  await openSheet(Pes,'lang-also','immigrants-welcome-card-in-lang');
  c('…in Spanish: "Una tarjeta de bienvenida en tamil o telugu y en inglés"', Pes.txt('#ns-s-t'), 'Una tarjeta de bienvenida en tamil o telugu y en inglés');
  { const {jsPDF}=require('jspdf'); const au=[]; const v=P.J(`nsView('immigrants-welcome-card-in-lang',DATA.M.tract.langs[0])`);
    P.w.nsPdfDoc(jsPDF,v,{id:'lang-primary',title:'x',evidence:'y',kind:'language'},{lang:'en',fonts:null,church:'서울 한인 교회',town:'Edison',date:'October 2026',audit:au});
    c('…and the PDF prints it', au.map(a=>a.t).join(' ').includes('Hindi, Gujarati or Urdu'), true);
    c('a church name the page\'s letters cannot print (Korean): the head says "Our church"', au.filter(a=>a.y===57&&a.x===48).map(a=>a.t), ['Our church']);
    const ae=[]; P.w.nsPdfDoc(jsPDF,v,{id:'lang-primary',title:'x',evidence:'y',kind:'language'},{lang:'es',fonts:null,church:'北京教会',town:'Edison',date:'octubre de 2026',audit:ae});
    c('…"Nuestra iglesia" in Spanish', ae.filter(a=>a.y===57&&a.x===48).map(a=>a.t), ['Nuestra iglesia']); }
  c('"2 people, no leader needed" (never "none to lead"), and one person', [P.J(`nsU('pplNone',2)`),P.J(`nsU('pplNone',1)`)], ['2 people, no leader needed','1 person, no leader needed']);
  c('…in Spanish', [Pes.J(`nsU('pplNone',2)`),Pes.J(`nsU('pplNone',1)`)], ['2 personas, no hace falta un líder','1 persona, no hace falta un líder']);
  P.E(`openTool('gifts'); if(GF_VIEW!=='roster'){ GF_VIEW='roster'; gfRender(); }`); await sleep(40);
  const note=P.q('#gf-church > summary .note');
  c('"Your church": "Moved here from the Community Survey." is a small note on its own line under the heading', [note&&note.textContent,note&&P.w.getComputedStyle(note).display], ['Moved here from the Community Survey.','block']);
}); T.done(); })();
