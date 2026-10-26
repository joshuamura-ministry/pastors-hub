// v10.70.1 · the audit of 26 Oct 2026 (the pastor: "can you do a thourogh audit of the app … everything is synmetrical and looks amazing"):
// the Community Survey report, the footer, Compare your churches, Digital footprint and the church directory sheet, as reviewers read them
// from pictures, each checked in code first. (B1) a church whose "Your church" was never filled in showed 0 with bars for Leaders, Rooms,
// "Results in" and "Ministries in the plan", and "What stands out" compared those zeros; (B2) "Strongest skills" listed "Free in the daytime"
// (a time, not a skill) and capitalized every item; (B3) "Last video 0 days ago"; (B4) a "Who needs help most" card ended a line with "·";
// (B5) "None of your churches was found … They are in the list below." read as a contradiction; (B6) Spanish named the pages in English
// ("página livestream"); (B7) British spelling ("Coloured dot … grey dot", "which office to ring, and how to honour", and the same words
// across the app); (B8) "· stands out" broke from its dot; (B9) the footer's dots ended lines; (B10) the footer's data line stayed English
// in Spanish; (B11) Spanish said "Tract" and "Barrio" beside "Vecindario"; (B12) the directory's line read like notes; (B13) "Miembros en
// los libros"; (B14) the Economy donut's middle read "100 employed" with no count, and "Churches nearby" promised a link it did not show.
// jsdom has no layout: here the rules and words that make them right. Churches and people are MADE UP. Written failing-first on v10.70.0.
const fs=require('fs'), path=require('path');
const {sleep,until,checker,page,ready,survey,FX}=require('./v45-helpers.js');
const {ch62,yt62,FIND62,dfFetch62}=require('./v62-digital-helpers.js');
const T=checker(), c=T.c;
const H=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const css=H.slice(H.indexOf('<style'),H.indexOf('</style>'));
const BRIT=/colour|\bgrey\b|honour|centre|neighbour|organis|programme|favour|behaviour|\bmetre/i;
const textOf=(P,sel)=>{ const out=[]; P.qa(sel).forEach(root=>{ const w=P.w.document.createTreeWalker(root,P.w.NodeFilter.SHOW_TEXT); let n; while((n=w.nextNode())){ if(!n.parentElement.closest('script,style')) out.push(n.nodeValue); } }); return out.join(' ').replace(/\s+/g,' '); };
const row=(P,sec,lab)=>{ const tr=P.qa(`#chc section[aria-labelledby="chc-${sec}"] tbody tr`).find(r=>r.querySelector('th').textContent===lab); return tr?[...tr.querySelectorAll('td')].map(td=>td.querySelector('.chc-v')?td.querySelector('.chc-v').textContent:td.textContent.replace(/\s+/g,' ').trim()):null; };
const bars=(P,sec,lab)=>{ const tr=P.qa(`#chc section[aria-labelledby="chc-${sec}"] tbody tr`).find(r=>r.querySelector('th').textContent===lab); return tr?[...tr.querySelectorAll('td')].map(td=>!!td.querySelector('.chc-bar')):null; };
async function twoChurches(P,capA){
  survey(P); await sleep(60);
  P.E(`(()=>{ capSave(${JSON.stringify(capA||FX.MEDIUM)}); uChurch().selected=['food-pantry']; uPersist(); })()`);
  P.E(`(()=>{ const s=uStore(); s.churches['ch-b']={id:'ch-b',name:'Pottstown SDA',address:'1 High St, Pottstown, PA 19464',capacity:{},members:[],linked:[],drafts:[],selected:[],overrides:{},share:{}}; uPersist(); })()`);
  P.E(`openTool('churches')`); await sleep(80);
}
(async()=>{ await T.sec(async()=>{
  console.log('\n-- (B1) a figure the church never gave is "—", and never compared --');
  const P=page(); await ready(P); await twoChurches(P);
  c('Leaders and Rooms: Bucks County its own, Pottstown (never filled in) "—"', [row(P,'church','Leaders'),row(P,'church','Rooms')], [['9','—'],['10','—']]);
  c('…no bar where only one church has the figure', [bars(P,'church','Leaders'),bars(P,'church','Rooms')], [[false,false],[false,false]]);
  c('Spiritual Gifts, "Results in": Pottstown has no results, no count and no link: "—"', row(P,'gifts','Results in'), ['0 of 135','—']);
  c('the plans: Pottstown "—"', [row(P,'plan','Ministries in the plan'),row(P,'plan','Proposals decided')], [['1','—'],['0','—']]);
  const so=P.qa('#chc .chc-so li').map(l=>l.textContent);
  c('"What stands out" never names a church for a figure it never gave', so.filter(t=>/Pottstown/.test(t)), []);
  const fb=P.J(`chFacts(uStore().churches['ch-b'])`);
  c('its facts: leaders, rooms, the plan and decisions null; no results, no link', [fb.leaders,fb.rooms,fb.plan,fb.dec,fb.gifts.n,fb.gifts.sent], [null,null,null,null,0,false]);
  P.E(`(()=>{ const s=uStore(); s.churches['ch-c']={id:'ch-c',name:'Olney SDA',address:'5 Oak St, Olney, PA 19000',capacity:${JSON.stringify(FX.SMALL)},members:[],linked:[],drafts:[],selected:[],overrides:{},share:{}}; uPersist(); })()`);
  const fc=P.J(`chFacts(uStore().churches['ch-c'])`);
  c('a church filled in, nothing chosen yet: an honest 0 in the plan, its rooms counted', [fc.plan,fc.dec,fc.rooms,fc.leaders], [0,0,2,2]);
  c('a zero draws no sliver of a bar', [/width:0%/.test(P.E(`chcBar(0,10,'n')`)),/width:3%/.test(P.E(`chcBar(0,10,'n')`))], [true,false]);
  c('no page errors', P.errs, []);

  console.log('\n-- (B2) "Strongest skills": skills only, one sentence --');
  const P2=page(); await ready(P2); await twoChurches(P2,{...FX.MEDIUM,skillCounts:{...FX.MEDIUM.skillCounts,weekday:12}});
  c('"Free in the daytime" (a time) is never a skill; the items after the first in lower case', row(P2,'church','Strongest skills')[0], 'Can cook for a crowd, can lead a group or give a study, good with children');
  const S2=page({lang:'es'}); await ready(S2); await twoChurches(S2,{...FX.MEDIUM,skillCounts:{...FX.MEDIUM.skillCounts,weekday:12}});
  c('…in Spanish too', row(S2,'church','Habilidades principales')[0], 'Puede cocinar para muchas personas, puede dirigir un grupo o dar un estudio, buen trato con los niños');
  c('no page errors', [P2.errs,S2.errs], [[],[]]);

  console.log('\n-- (B3) the last video: "today", "1 day ago" --');
  const head=(Q,d)=>Q.J(`(()=>{ const F=${JSON.stringify(FIND62())}; const c=${JSON.stringify(ch62({org:'ANBV01',youtube:yt62({latest:{t:'Sermon',d:'D',v:5}})}))}; c.youtube.latest.d=${JSON.stringify(d)}; return dfJudge(c,dfContext(F),'2026-10-08',false,'Joshua Mura').areas.youtube.head; })()`);
  c('English', [head(P,'2026-10-08'),head(P,'2026-10-07'),head(P,'2026-10-05')], ['Last video today','Last video 1 day ago','Last video 3 days ago']);
  c('Spanish', [head(S2,'2026-10-08'),head(S2,'2026-10-07'),head(S2,'2026-10-05')], ['Último video hoy','Último video hace 1 día','Último video hace 3 días']);

  console.log('\n-- (B4) "Who needs help most": the dot travels with the town --');
  const D=page(); await ready(D); dfFetch62(D); D.E('openTool("churches")'); await until(()=>D.q('#chc-df .df-needs li'));
  const li=D.qa('#chc-df .df-needs li').find(l=>/Allfail/.test(l.textContent));
  c('the town and its dot in one piece that never breaks', [li&&li.querySelector('.df-tw')&&li.querySelector('.df-tw').textContent,/\.df-tw\{white-space:nowrap\}/.test(css)], ['· Allfail',true]);
  c('…the line reads as before', li&&li.querySelector('.df-faint').textContent, ' · Allfail');

  console.log('\n-- (B5) none of his churches matched: plain words --');
  c('English', D.E(`dfT('noOwn')`), 'We could not match your churches in the official list by your name or theirs. Look for them in “Every church” below.');
  c('Spanish', S2.E(`dfT('noOwn')`), 'No pudimos encontrar sus iglesias en la lista oficial por su nombre ni por el de ellas. Búsquelas en “Cada iglesia” abajo.');

  console.log('\n-- (B6) Spanish names the pages in Spanish --');
  c('the live stream, contact, about, the pastor, an unknown page quoted', ['/livestream','/contact-us','/about','/our-pastor','/home','/fall-rally','/'].map(p=>S2.E(`dfPagesWord([${JSON.stringify(p)}])`)),
    ['página de transmisión en vivo','página de contacto','página de quiénes somos','página del pastor','página principal','página “fall rally”','página principal']);
  c('English unchanged', ['/livestream','/contact-us','/'].map(p=>P.E(`dfPagesWord([${JSON.stringify(p)}])`)), ['livestream page','contact us page','home page']);

  console.log('\n-- (B7) US spelling --');
  const E=page(); await ready(E); survey(E); await sleep(300);
  c('"How this area compares": "Colored dot … gray dot"', E.qa('#report .chart .cs').map(x=>x.textContent).find(t=>/dot =/.test(t)), 'Colored dot = Tract 2041.02, gray dot = Bucks County');
  c('Community resources: "which office to call, and how to honor"', /which office to call, and how to honor the people/.test(textOf(E,'#report')), true);
  c('…its notes: "call one", "Call the clerk", a parking-lot event, aging offices, honestly labeled', [/: ring one, ask|Ring the clerk|to a car-park event|ageing offices|honestly labelled/.test(H),/call one, ask the pastor/.test(H),/Call the clerk before you plan/.test(H)], [false,true,true]);
  c('the survey, every word on the page: none of the ten British spellings', (textOf(E,'#report,footer').match(new RegExp(BRIT.source,'gi'))||[]), []);
  const S=page({lang:'es'}); await ready(S); survey(S); await sleep(300);
  c('…the Spanish intro still found (its key spelled the same way)', /La libreta de contactos del pastor para este lugar/.test(textOf(S,'#report')), true);
  // (the Evangelism Planner and Learn from other conferences have their own fixes in this audit, their spelling with them; Make the
  // Case's slides, handout and Proposal keep their words until its own pass re-writes the golden file v43-ongoing-golden holds)
  c('across the app: the Spiritual Gifts statements and sections, the skills, the needs\' words, what other traditions teach',
    [/'I can organize the people, money and details that a project needs\.'/.test(H),/Leading and organizing/.test(H),/An organizer — forms, lists, a computer/.test(H),/Ask three neighbors what hours they work/.test(H),/Jesus \(Isa\) is honored as a great prophet/.test(H),
     /I can organise|Leading and organising|An organiser — forms|Ask three neighbours|is honoured as a great prophet/.test(H)], [true,true,true,true,true,false]);
  c('…Make the Case kept as it is for now (its golden outputs)', [/The gospel at the centre/.test(H),/Neighbours are neighbours, never targets\./.test(H)], [true,true]);
  c('…Scripture and Spanish kept as written (KJV "in favour with God and man", "la grey de Dios")', [/in favour with God and man/.test(H),/Apacentad la grey de Dios/.test(H)], [true,true]);
  c('…the needs\' fixes still find their words ("Cook, do not run a program.")', E.E(`nsFixWords('Cook, do not program.','isolationyoung',false)`), 'Cook, do not run a program.');

  console.log('\n-- (B8) the ring cards: "· stands out" in one piece --');
  const rings=E.E(`ringsHTML({poverty:31,renters:40,kidsShare:20},{poverty:8,renters:33,kidsShare:21},null,'tract')`);
  c('the dot and the words together', [/<span class="statso">· stands out<\/span>/.test(rings),/\.statso\{white-space:nowrap\}/.test(css)], [true,true]);

  console.log('\n-- (B9) the footer: every dot travels with what follows --');
  const dots=[]; { const w=E.w.document.createTreeWalker(E.q('footer'),E.w.NodeFilter.SHOW_TEXT); let n; while((n=w.nextNode())) if(/·/.test(n.nodeValue)) dots.push([n.parentElement.className,n.nodeValue.trimStart().startsWith('·'),n.parentElement.firstChild===n]); }
  c('each "·" opens a piece that never breaks, with the words after it', [dots.length>=6,dots.every(d=>/\b(fkeep|dcdot)\b/.test(d[0])&&d[1]&&d[2]),/\.fkeep\{white-space:nowrap\}/.test(css)], [true,true,true]);
  c('…the footer reads as before', /TERRAIN · terrain\.church · Created by Joshua Mura · Join a presentation · Terms · Privacy/.test(textOf(E,'footer')), true);
  c('…the data line\'s dot hides with it', /#datacred\[hidden\]\+\.fkeep \.dcdot\{display:none\}/.test(css), true);

  console.log('\n-- (B10) the footer\'s data line in Spanish --');
  c('"Datos: Oficina del Censo de EE. UU., ACS de 5 años"', S.q('#datacred').textContent.trim(), 'Datos: Oficina del Censo de EE. UU., ACS de 5 años');
  c('…English unchanged', E.q('#datacred').textContent.trim(), 'Data: U.S. Census Bureau, ACS 5-year');

  console.log('\n-- (B11) Spanish: "Sección censal", one word for the neighborhood --');
  c('no "Tract" anywhere on the Spanish survey (its diagnostics, shown only when debugging, aside)', (textOf(S,'#report').replace(textOf(S,'#diag'),'').match(/Tract\b/g)||[]).length, 0);
  c('the scope toggle and the brief', [S.q('#scope button small').textContent,S.q('#brief p b').textContent], ['Sección censal 2041.02','Sección censal 2041.02']);
  c('the legend under each card: "Vecind.", never "Barrio"', [S.qa('.lg span').some(x=>/Vecind\./.test(x.textContent)),S.qa('.lg span').some(x=>/Barrio/.test(x.textContent))], [true,false]);
  c('English unchanged: "Tract 2041.02", "Nbhd"', [E.q('#scope button small').textContent,E.qa('.lg span').some(x=>/Nbhd/.test(x.textContent))], ['Tract 2041.02',true]);
  c('…and the downloads keep the Census\'s own names', E.E(`buildCSV(DATA.M,DATA.levels,DATA.geo)`).includes('Tract 2041.02'), true);

  console.log('\n-- (B12) the directory\'s line: a sentence --');
  P.E(`dirOpen ? dirOpen() : null`); await sleep(40);
  if(!P.q('#dir-sheet[open]')){ P.E('showHub()'); await sleep(30); const t=P.q('#hub #hubdir'); if(t) t.click(); await sleep(60); }
  c('two churches or more', P.txt('#dir-sheet .dir-for'), 'For Bucks County SDA. For another church, use the church button at the top.');
  S2.E('showHub()'); await sleep(30); S2.q('#hub #hubdir').click(); await sleep(60);
  c('…in Spanish', S2.txt('#dir-sheet .dir-for'), 'Para Bucks County SDA. Para otra iglesia, use el botón de la iglesia arriba.');

  console.log('\n-- (B13) "Miembros registrados" --');
  c('never "en los libros"', [/en los libros/.test(H),S.E(`chT('members')`),S.E(`tr('Members on the books')`)], [false,'Miembros registrados','Miembros registrados']);

  console.log('\n-- (B14) the Economy donut and "Churches nearby" --');
  const dn=E.E(`donutOf('Employed residents',[['A',60],['B',40]],null,'employed','hardship')`);
  c('no count from the Census: no figure in the middle (never the shares\' 100)', [/class="dctr"/.test(dn),/>100</.test(dn),/employed/.test(dn)], [false,false,false]);
  c('…with the count, as before', /class="dctr">2,610</.test(E.E(`donutOf('Employed residents',[['A',60],['B',40]],2610,'employed','hardship')`)), true);
  E.E(`CONGS=null; CONGS_STATE='idle'; drawCongregations()`);
  c('"Churches nearby" with nothing on the map: the county link it promises is there', /thearda\.com\/us-religion\/census\/congregational-membership/.test(E.q('#congslot').innerHTML), true);
  c('no page errors', [E.errs,S.errs,D.errs], [[],[],[]]);
}); T.done(); })();
