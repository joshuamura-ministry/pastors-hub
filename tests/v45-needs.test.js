// v10.45.0 — the Community Survey's needs: the model (DESIGN-SURVEY §2.2–§2.3, §2.8, §3). The pastor (3–5 Oct 2026): "It's gonna
// give the things the community needs, the top priorities and the greatest opportunities… prioritized from top to bottom and also
// the most effective ones from top to bottom." nsModel(M,scope): RULES (unchanged, so Make the Case reads what it read) plus nine
// more needs (RULES_MORE), the survey's own words (RULES_SAY), one survey gate (debt), the ranking (NS_RANK), "Also here" (near the
// line, across the town) and the language strip (NS_LANG: the Census groups named truthfully).
// Written failing-first against v10.44.1 (no nsModel there).
const crypto=require('crypto');
const {FX,checker,page,ready,survey,sleep}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const sha=s=>crypto.createHash('sha1').update(s).digest('hex');
// What v10.44.1 said (captured from its index.html): RULES' ids, categories, weights and the source of on/ev/t; suggestions() on
// the fixture tract in English and Spanish (ids, evidence and titles). The survey layer adds; it never edits.
const RULES_SHA_1044='92c1fad7f49886f34b86cb011cfdb5c9159e8e12';
const SUG_1044={en:'1028de0137f48a56e2a52e10243e465ecd93bf34',es:'fae308530a65bf77cfd79feff65ebb012280e001'};
const HITS_1044=['lang-primary','kids','poverty','child-poverty','rent50','limeng','single-parent','foreign','snap','shiftwork','nocar','shift-race','recent','unemp','uninsured','renters','overcrowd','foreign-shift','debt','foodaccess','growth','newborn','grief'];
const MORE=['lang-also','lang-third','teens','near-poor','working-poor','pubassist','family-english','aging-owners','seniors-many'];
const model=(P,mod,scope)=>P.J(`(()=>{ const D=${JSON.stringify(FX.DATA)}; ${mod||''}; const prev=DATA; DATA=D; const S=nsModel(D.M,${JSON.stringify(scope||'tract')}); DATA=prev; return S; })()`);
const need=(S,id)=>S.needs.find(n=>n.id===id)||null;

(async()=>{ await T.sec(async()=>{
  const P=await (async()=>{ const P=page(); await ready(P); return P; })();
  const S0=await (async()=>{ const S=page({lang:'es'}); await ready(S); return S; })();
  console.log('\n-- RULES and suggestions() are as v10.44.1 left them --');
  c('the model exists (nsModel, RULES_MORE, RULES_SAY, NS_RANK)', P.E(`typeof nsModel==='function'&&Array.isArray(typeof RULES_MORE!=='undefined'?RULES_MORE:null)&&typeof RULES_SAY==='object'&&typeof NS_RANK==='object'`), true);
  c('RULES: the same 38 ids, categories, weights and tests (the source of on, ev and t, word for word)',
    sha(P.E(`JSON.stringify(RULES.map(r=>[r.id,r.cat,r.w,r.on.toString(),r.ev.toString(),r.t.toString()]))`)), RULES_SHA_1044);
  for(const [lang,W] of [['en',P],['es',S0]])
    c(`suggestions() on the fixture says what it said (${lang.toUpperCase()}: ids, evidence, titles)`,
      sha(W.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; return JSON.stringify(suggestions(DATA.M,'tract').hits.map(h=>[h.id,h.evidence,h.title])); })()`)), SUG_1044[lang]);
  c('no RULES_MORE id ever entered RULES or GF_NEEDS (Make the Case and the gifts reports read only the 38)',
    P.J(`${JSON.stringify(MORE)}.filter(id=>RULES.some(r=>r.id===id)||Object.prototype.hasOwnProperty.call(GF_NEEDS,id))`), []);

  console.log('\n-- nine more needs, each complete --');
  c('RULES_MORE: the nine, in order', P.J('RULES_MORE.map(r=>r.id)'), MORE);
  c('each has Spanish words (ev, t, do, ask), a kind, a topic in both languages, a strength, an effectiveness, fallback tags and themes',
    P.J(`RULES_MORE.filter(r=>{ const es=RULES_MORE_ES[r.id]||{}; return !(['ev','t','do','ask'].every(k=>typeof es[k]==='function')
      &&['language','children','hardship','housing','people'].includes(NS_KIND_MORE[r.id])&&NS_TOPIC[r.id]&&NS_TOPIC[r.id].length===2
      &&typeof NS_RANK.s[r.id]==='function'&&NS_RANK.eff[r.id]>=1&&(nsTagsFor(r.id).length>0)&&(NS_FALLBACK[r.id].themes||[]).length>0); }).map(r=>r.id)`), []);
  c('every one of the 38 has a topic, a strength, an effectiveness and fallback tags (grandparents: families, many-kids)',
    P.J(`RULES.filter(r=>!(NS_TOPIC[r.id]&&typeof NS_RANK.s[r.id]==='function'&&NS_RANK.eff[r.id]>=1&&nsTagsFor(r.id).length&&(NS_FALLBACK[r.id]||{}).themes)).map(r=>r.id)`), []);
  c('…grandparents\' fallback tags', P.J(`nsTagsFor('grandparents')`), ['families','many-kids']);

  console.log('\n-- the fixture tract --');
  const S=model(P);
  // the review round (5 Oct, #7): one figure, one row: debt's figures are rent burden's and SNAP's, both shown here, so its ideas join
  // the rent burden's list; grief joins "seniors living alone" (near the line here)
  c('every RULES need that fires, but debt and grief (one figure, one row), and two of the nine (working-poor, family-english): 23 needs',
    [S.needs.length,S.needs.filter(n=>!n.more).map(n=>n.id).sort(),S.needs.filter(n=>n.more).map(n=>n.id).sort(),S.merged],[23,[...HITS_1044].filter(id=>id!=='debt'&&id!=='grief').sort(),['family-english','working-poor'],{rent50:'debt','seniors-alone':'grief'}]);
  // the review round (the coordinator's note 3): greatest first as the score is; a tie goes to the larger figure, then effectiveness
  c('greatest first: the ranked order (the score, then the figure before its cap, then effectiveness, weight, RULES order)', S.needs.map(n=>n.id),
    ['lang-primary','child-poverty','limeng','rent50','kids','foreign','snap','poverty','nocar','single-parent','shiftwork','renters','working-poor','recent','family-english',
     'uninsured','overcrowd','foodaccess','unemp','shift-race','growth','foreign-shift','newborn']);
  c('…every score at most the one above it', S.needs.every((n,i,a)=>i===0||n.score<=a[i-1].score), true);
  { const t=FX.DATA.M.tract, cp=9*Math.min(2,Math.max(1,(t.childPoverty-t.poverty)/5)), L=t.langs[0], lt=L.ltvw/L.count*100, ls=Math.min(2,Math.max(1,Math.min(L.share/8,lt/25)));
    // the review round (#12): a language is a need by its speakers and by how many of them speak English less than "very well"
    c(`a score is weight × strength (1–2): Spanish at 19%, 40% of them with limited English, is 9 × ${ls.toFixed(2)}; child poverty (${Math.round(t.childPoverty)}% against ${Math.round(t.poverty)}%) 9 × ${((t.childPoverty-t.poverty)/5).toFixed(2)}`, [+need(S,'lang-primary').score.toFixed(2),+need(S,'child-poverty').score.toFixed(2)], [+(9*ls).toFixed(2),+cp.toFixed(2)]); }
  c('a lens counts three quarters (the ten-year shift: 7 × 1.13 × 0.75)', [need(S,'shift-race').lens,+need(S,'shift-race').score.toFixed(2)], [true,+(7*Math.min(2,9/8)*0.75).toFixed(2)]);
  c('greatest first, even against effectiveness: foreign (e2) at 10.03 before snap (e3) at 9.92', [S.needs.findIndex(n=>n.id==='foreign')<S.needs.findIndex(n=>n.id==='snap'),need(S,'snap').eff,need(S,'foreign').eff], [true,3,2]);
  c('one badge, "Greatest need", on the first need that is not a lens', [S.needs.filter(n=>n.top).map(n=>n.id),S.needs[0].lens], [['lang-primary'],false]);
  const L1=model(P,`D.M.tract.langs=[{name:'Other European',share:9,count:500,ltvw:100},{name:'Spanish',share:3,count:150,ltvw:20}]`);
  c('a lens is never the greatest need: with only lenses on top the badge goes to the first need', model(P,`D.M.tract.langs=[];D.M.tract.foreign=2;D.M.tract.origins=[]`).needs.filter(n=>n.top).length, 1);

  console.log('\n-- each new need fires on its own figure, with its words (EN + ES) --');
  const L2=`D.M.tract.langs=[{name:'Spanish',share:20,count:1100,ltvw:400},{name:'Vietnamese',share:12,count:650,ltvw:143},{name:'Tagalog',share:9,count:490,ltvw:176}]`;
  let s=model(P,L2);
  c('lang-also (the second language at 8% or more): its title and evidence', [need(s,'lang-also')&&need(s,'lang-also').title,need(s,'lang-also')&&need(s,'lang-also').evidence],
    ['Materials and welcome in Vietnamese','12% speak Vietnamese at home, about 650 people; 22% of them speak English less than "very well."']);
  c('lang-third (the third at 8% or more)', need(s,'lang-third')&&need(s,'lang-third').title, 'Materials and welcome in Tagalog');
  c('…their kind is language (mint), their steps name the language', [need(s,'lang-also').kind,need(s,'lang-also').steps[0]], ['language','Translate the essentials into Vietnamese: service times, the address, a contact name and what happens on a first visit.']);
  let e=model(S0,L2);
  c('…in Spanish: "Materiales y bienvenida en vietnamita", "El 12% habla vietnamita en casa…"', [need(e,'lang-also').title,need(e,'lang-also').evidence],
    ['Materiales y bienvenida en vietnamita','El 12% habla vietnamita en casa, unas 650 personas; el 22% de ellas habla inglés menos que "muy bien".']);
  s=model(P,`D.M.tract.langs=[{name:'Spanish',share:20,count:1100,ltvw:400},{name:'Other European',share:9,count:500,ltvw:100}]`);
  // the review round (#10): a group's title is never another's; with no origin that names its members here, it is the group, plainly
  c('a Census group is named for what it is: "other Indo-European languages", "another Indo-European language", its members',
    [need(s,'lang-also').title,need(s,'lang-also').evidence,need(s,'lang-also').steps[0]],
    ['Materials and welcome in other Indo-European languages','9% speak another Indo-European language at home, about 500 people; 20% of them speak English less than "very well." The Census counts Hindi, Urdu, Gujarati, Punjabi, Bengali, Persian, Portuguese and others together.',
     'Translate the essentials into these languages: service times, the address, a contact name and what happens on a first visit.']);
  const teen=`D.M.tract.pop=5000;D.M.tract.age10_14=400;D.M.tract.age15_17=300;D.M.county.pop=100000;D.M.county.age10_14=6000;D.M.county.age15_17=4000`;
  s=model(P,teen);
  c('teens (10 to 17 at 13% or more): "Many young teenagers live here", the county beside it', [need(s,'teens')&&need(s,'teens').title,need(s,'teens')&&need(s,'teens').evidence],
    ['Many young teenagers live here','About 700 young people aged 10 to 17 live here, 14% of residents (county: 10%).']);
  c('…or 11.5% and 3 points over the county', !!need(model(P,`${teen};D.M.tract.age10_14=350;D.M.tract.age15_17=250;D.M.county.age10_14=4000;D.M.county.age15_17=3000`),'teens'), true);
  c('…not at 12% when the county is 10%', !!need(model(P,`${teen};D.M.tract.age10_14=350;D.M.tract.age15_17=250`),'teens'), false);
  c('…in Spanish', need(model(S0,teen),'teens').evidence, 'Aquí viven unos 700 jóvenes de 10 a 17 años, el 14% de los residentes (condado: 10%).');
  c('…its steps keep children safe: screened adults, two in the room, never a name or a photo', need(s,'teens').steps[1], 'Screened adults only, always two adults in the room, and never collect a young person\'s name or photo.');
  s=model(P,`D.M.tract.incLow=33;D.M.tract.poverty=12`);
  c('near-poor (a third under $35,000, under the poverty line\'s 18%)', need(s,'near-poor')&&need(s,'near-poor').evidence,
    '33% of households earn under $35,000 a year, but 12% are below the poverty line: many are just above it (county: 17% under $35,000).');
  c('…the county clause is left out at the county scope', need(model(P,`D.M.county.incLow=33;D.M.county.poverty=12`,'county'),'near-poor').evidence,
    '33% of households earn under $35,000 a year, but 12% are below the poverty line: many are just above it.');
  c('working-poor (service jobs 22%+ and a quarter under $35,000) fires on the fixture', need(S,'working-poor').evidence, '28% of working residents are in service jobs, and 31% of households earn under $35,000 a year.');
  s=model(P,`D.M.tract.pubAssist=7`);
  c('pubassist (6% or more)', need(s,'pubassist')&&need(s,'pubassist').evidence, '7% of households received cash public assistance in the past year (county: 3%).');
  c('…or 4% and twice the county', !!need(model(P,`D.M.tract.pubAssist=5;D.M.county.pubAssist=2`),'pubassist'), true);
  c('family-english (limited English 10%+ and children 22%+) fires on the fixture', need(S,'family-english').title, 'Families learning English together');
  s=model(P,`D.M.tract.renters=20;D.M.tract.homeowners=80;D.M.tract.medAge=50`);
  c('aging-owners (three in four own, an older neighborhood): the median age', need(s,'aging-owners')&&need(s,'aging-owners').evidence, '80% of households own their home, and the median age is 50.0.');
  s=model(P,`D.M.tract.renters=20;D.M.tract.homeowners=80;D.M.tract.medAge=40;D.M.tract.seniorsShare=25;D.M.tract.seniors=1400;D.M.county.seniorsShare=17`);
  c('…or the share 65 and over', need(s,'aging-owners')&&need(s,'aging-owners').evidence, '80% of households own their home, and 25% of residents are 65 or older.');
  c('seniors-many (22%+ over 65, the median under 45)', need(s,'seniors-many')&&need(s,'seniors-many').evidence, '25% of residents are 65 or older, about 1,400 people (county: 17%).');
  c('…its kind is children and families (violet), aging-owners housing (blue)', [need(s,'seniors-many').kind,need(s,'aging-owners').kind], ['children','housing']);
  e=model(S0,`D.M.tract.renters=20;D.M.tract.homeowners=80;D.M.tract.medAge=40;D.M.tract.seniorsShare=25;D.M.tract.seniors=1400;D.M.county.seniorsShare=17`);
  c('…in Spanish', [need(e,'aging-owners').title,need(e,'seniors-many').evidence], ['Casas que mantener, manos que envejecen','El 25% de los residentes tiene 65 años o más, unas 1,400 personas (condado: 17%).']);

  console.log('\n-- the survey\'s own words (RULES_SAY), RULES\' kept for Make the Case --');
  // (grief has its own card only where "seniors living alone" is not shown: the median age, here, and few living alone)
  { const g=model(P,`D.M.tract.medAge=46;D.M.tract.seniorsAlone=8.5`);
    c('grief: "Be there for people in grief", and only what the data says', [need(g,'grief').title,need(g,'grief').evidence], ['Be there for people in grief','The median age here is 46.0.']); }
  c('…RULES still says it its way (suggestions(), Make the Case)', P.J(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; const h=suggestions(DATA.M,'tract').hits.find(h=>h.id==='grief'); return [h.title,/widowed/.test(h.evidence)]; })()`), ['Grief is unattended here',true]);
  c('debt: "Debt can take hold here" (the survey\'s words; its card shows only where its figures are not shown already)', P.J(`nsSay(RULES.find(r=>r.id==='debt'),${JSON.stringify(FX.DATA.M.tract)},${JSON.stringify(FX.DATA.M.county)},{tr:null,where:'',whereEs:''}).title`), 'Debt can take hold here');
  s=model(P,`D.M.tract.renters=9;D.M.tract.rent50=34;D.M.tract.snap=5`);
  c('debt\'s survey gate: 34% of renters pay over half, but only 9% rent (Warminster): no debt need here; suggestions() still has it',
    [!!need(s,'debt'),P.J(`(()=>{ const D=${JSON.stringify(FX.DATA)}; D.M.tract.renters=9;D.M.tract.rent50=34;D.M.tract.snap=5; return suggestions(D.M,'tract').hits.some(h=>h.id==='debt'); })()`)], [false,true]);
  c('…and with SNAP at 12% its words name SNAP alone, without the rent clause (its card then gives way to SNAP\'s, its ideas in that list)',
    [P.J(`(()=>{ const m={...${JSON.stringify(FX.DATA.M.tract)},renters:9,rent50:34,snap:13}; return nsSay(RULES.find(r=>r.id==='debt'),m,${JSON.stringify(FX.DATA.M.county)},{tr:null,where:'',whereEs:''}).evidence; })()`),
     model(P,`D.M.tract.renters=9;D.M.tract.rent50=34;D.M.tract.snap=13`).merged.snap],
    ['13% of households receive SNAP — the conditions where debt takes hold.','debt']);
  s=model(P,`D.M.tract.seniorsAlone=12;D.M.tract.noCar=9`);
  c('seniors-nocar: "of households", as the figure is', need(s,'seniors-nocar').evidence, '12% of households are a senior living alone, and 9% have no vehicle.');
  s=model(P,`D.M.tract.medAge=30;D.M.tract.renters=50`);
  c('isolationyoung: "often means", not "usually"', /often means/.test(need(s,'isolationyoung').evidence), true);
  c('the group language as the first language: its title, its evidence names the members, its steps say "these languages"',
    [need(L1,'lang-primary').title,/another Indo-European language at home/.test(need(L1,'lang-primary').evidence),/The Census counts Hindi/.test(need(L1,'lang-primary').evidence),need(L1,'lang-primary').steps[1]],
    ['Materials and welcome in other Indo-European languages',true,true,'Ask whether anyone already in the congregation speaks these languages — a person is worth more than a printed sheet.']);
  // the review round (#12): the first language says how many speak English less than "very well," as the second's does
  c('a named first language: "Materials and welcome in Spanish", and how many of them speak English less than "very well"', [need(S,'lang-primary').title,need(S,'lang-primary').evidence], ['Materials and welcome in Spanish','19% speak Spanish at home, about 1,063 people; 40% of them speak English less than "very well."']);
  e=model(S0);
  c('…in Spanish (grief, debt: the survey\'s words)', [S0.J(`nsSay(RULES.find(r=>r.id==='grief'),${JSON.stringify(FX.DATA.M.tract)},${JSON.stringify(FX.DATA.M.county)},{tr:null,where:'',whereEs:''}).title`),S0.J(`nsSay(RULES.find(r=>r.id==='debt'),${JSON.stringify(FX.DATA.M.tract)},${JSON.stringify(FX.DATA.M.county)},{tr:null,where:'',whereEs:''}).title`),need(e,'lang-primary').title], ['Acompañe a quienes están de duelo','Aquí la deuda puede echar raíces','Materiales y bienvenida en español']);

  console.log('\n-- Also here --');
  c('near the line at this scope: seniors living alone at 9% (the line is 12%)', S.also.filter(n=>n.tag==='near').map(n=>[n.id,n.topic]), [['seniors-alone','Seniors living alone']]);
  c('across the town: a need that fires on Warminster, not on the tract, said with the town\'s own figures',
    S.also.filter(n=>n.tag==='town').map(n=>[n.id,n.evidence]),
    [['seniors-nocar',`${Math.round(FX.DATA.M.cousub.seniorsAlone)}% of households are a senior living alone, and ${Math.round(FX.DATA.M.cousub.noCar)}% have no vehicle.`]]);
  s=model(P,`Object.assign(D.M.tract,{kidsShare:22,singleParent:25,k12Share:16,unemp:6,overcrowd:4});
    Object.assign(D.M.cousub,{medAge:47,pubAssist:8,homeowners:80,veterans:10,grandKids:6,noCar:15});`);   // (the review round, #7: no two rows on one figure, so none here share one)
  c('at most 8: four near the line (closest to it first), four across the town', [s.also.length,s.also.filter(n=>n.tag==='near').length,s.also.filter(n=>n.tag==='town').length], [8,4,4]);
  c('…a need is never in both lists, nor among the needs', new Set([...s.also.map(n=>n.id),...s.needs.map(n=>n.id)]).size, s.also.length+s.needs.length);
  c('the town rows only in the neighborhood view', model(P,'','cousub').also.filter(n=>n.tag==='town').length, 0);

  console.log('\n-- v10.45.1: no language strip above the needs; where people were born sits inside the needs it explains --');
  // The pastor (5 Oct 2026): "English only at home, born abroad, India, Bosnia, Trinidad and Tobago, Germany don't need to be there
  // either" (and the note and the Spiritual Gifts link). Was: one chip per language, the born-abroad chip, the group notes.
  survey(P); await sleep(60);
  c('nothing above the needs but the heading and the verse: no strip, no group note, no "nothing to fill in", no link',
    [P.qa('#u-needs .ns-strip').length,P.qa('#u-needs > .ns-gnote').length,P.qa('#u-needs .ns-nofill').length,P.qa('#u-needs [data-gf-church]').length], [0,0,0,0]);
  P.q('#u-needs [data-need="lang-primary"] .ns-head').click(); await sleep(30);
  c('the language need opens on its figures (the language; how many of its speakers have limited English) and where neighbors born abroad come from',
    [P.qa('#u-needs [data-need="lang-primary"] .ns-figs .statlab').map(x=>x.textContent).slice(0,2),P.txt('#u-needs [data-need="lang-primary"] .ns-born')],
    [['Speak Spanish at home','Of them, limited English'],'Where neighbors born abroad come from: Mexico, Dominican Republic, Guatemala, Vietnam']);
  survey(P,{mod:`D.M.tract.langs=[{name:'Other European',share:6,count:300,ltvw:50},{name:'Chinese',share:3,count:150,ltvw:60}]`}); await sleep(60);
  c('"Other Indo-European", never "Other European", in the Language section\'s bars', [/Other Indo-European/.test(P.txt('#sections')),/Other European/.test(P.txt('#sections'))], [true,false]);
  c('the Language section\'s "Materials in …" note says what the group is', /Materials in another Indo-European language would reach about 300 people here/.test(P.txt('#sections')), true);
  survey(S0); await sleep(60);
  S0.q('#u-needs [data-need="lang-primary"] .ns-head').click(); await sleep(30);
  c('…in Spanish: the ring\'s words and where people were born', [S0.qa('#u-needs [data-need="lang-primary"] .ns-figs .statlab').map(x=>x.textContent)[0],/^De dónde vienen los vecinos nacidos en el extranjero: /.test(S0.txt('#u-needs [data-need="lang-primary"] .ns-born'))], ['Hablan español en casa',true]);
  survey(P,{mod:`for(const k of Object.keys(D.M.tract)) if(typeof D.M.tract[k]==='number'&&!['pop','hh','medAge','medInc','englishOnly'].includes(k)) D.M.tract[k]=0;
    D.M.tract.langs=[];D.M.tract.origins=[];D.M.tract.occ=D.M.tract.occ.map(o=>[o[0],0]);D.M.tract.medAge=40;D.M.tract.past=null;D.M.cousub=null;delete D.levels.cousub;`}); await sleep(60);
  c('nothing fired and nothing near: the "none" line', P.txt('#u-needs .ns-none'), 'Nothing crossed a line here at this level. Try the town or the county view above.');
  c('no page error along the way', P.errs, []);
}); T.done(); })();
