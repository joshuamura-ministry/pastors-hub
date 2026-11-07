// v10.70.1 · the audit's second round, 26 Oct 2026: the reviewers' pictures of Digital footprint, the Spanish Community Survey and the
// church directory builder, each checked in code first. (D1) wrong town names ("Ext Clearfield", "Dr Watsontown", "Rd Hanover", "Ext York",
// "Ave Chester", "Rd Waynesboro"): Pennsylvania's directory writes an address without commas ("… Park Avenue Ext Clearfield PA 16830") and
// the reader took the two words before the state as the town; (D2) line breaks: "Idle since September / 2024", "Last video 3 / days ago",
// "hace 1 / día", "Lancaster · 37 members · / company", "Huntingdon Valley · 39 / members", "… on 7 Oct 2026 · updated / monthly";
// (D3) Spanish: "que nombra a Pastor …", "Nombra al Pastor …", "la ficha oficial está desactualizado"; (D4) "What this can and cannot
// see": "when a search result shows them, its followers", "is said so, never counted against the church"; (D5) the Spanish survey:
// "No congregation data yet." and the county adherence card in English, "sector censal" beside "sección censal", "Ingreso medio" and
// "Edad media" for the Census's median; (D6) the directory's buttons ragged on a phone, and "3 families  · 0 with photos".
// jsdom has no layout: here the markup and the rules that keep the lines whole. Churches, streets and people are MADE UP (the towns are
// real places). Written failing-first on v10.70.1 before this round.
const fs=require('fs'), path=require('path');
const {sleep,until,checker,page,ready,survey}=require('./v45-helpers.js');
const {site62,yt62,ch62,FIND62,dfFetch62}=require('./v62-digital-helpers.js');
const T=checker(), c=T.c;
const H=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const css=H.slice(H.indexOf('<style'),H.indexOf('</style>'));
// a church of the made-up findings: not his (another pastor), a town as the reader gave it
const other=(org,town,o={})=>ch62({org,name:`${org} SDA Church`,town,pastor:'Ann Lee',members:60,website:'www.'+org.toLowerCase()+'.test',
  site:site62({listed:'www.'+org.toLowerCase()+'.test',url:'https://www.'+org.toLowerCase()+'.test/'}),...o});
const FIND=()=>{ const F=FIND62(); F.churches.push(
  other('ANBT01','Ext Clearfield',{address:'10 Sample Avenue Ext Clearfield PA 16830',youtube:yt62({latest:{t:'Sermon',d:'2024-09-14',v:5}})}),
  other('ANBT02','Ave Chester',{address:'20 W Sample Parkway Ave Chester PA 19013',youtube:yt62({latest:{t:'Sermon',d:'2026-07-01',v:5}})}),
  other('ANBT03','Rd Hanover',{address:'30 Sample Run Rd Hanover PA 17331',youtube:yt62({latest:{t:'Sermon',d:'2026-10-05',v:5}})}),
  other('ANBT04','Dr Watsontown',{address:'40 8th Street Dr Watsontown PA 17777',youtube:yt62({latest:{t:'Sermon',d:'2026-10-07',v:5}})}),
  other('ANBT05','Rd Waynesboro',{address:'50 Sample Hill Rd Waynesboro PA 17268'}),
  other('ANBT06','Ext York',{address:'60 Sample Road Ext York PA 17406'}),
  other('ANBT07','State College',{address:'70 Sample St State College PA 16801'}),
  other('ANBT08','Huntingdon Valley',{address:'80 Sample Rd Huntingdon Valley PA 19006',members:39}),
  other('ANBT09','Fairview Village',{address:'90 Sample Rd Fairview Village PA 19409'}),
  other('ANBT10','St Marys',{address:'100 Sample St St Marys PA 15857'}),
  other('ANBT11','Mount Pocono',{address:'110 Sample Ave Mount Pocono PA 18344'}),
  other('ANBT12','Lancaster',{address:'120 Sample St Lancaster PA 17601',members:37,kind:'company'})); return F; };
const TOWNS={ANBT01:'Clearfield',ANBT02:'Chester',ANBT03:'Hanover',ANBT04:'Watsontown',ANBT05:'Waynesboro',ANBT06:'York',ANBT07:'State College',
  ANBT08:'Huntingdon Valley',ANBT09:'Fairview Village',ANBT10:'St Marys',ANBT11:'Mount Pocono',ANBT12:'Lancaster'};
async function openDf(P){ dfFetch62(P,{findings:FIND()}); P.E('openTool("churches")'); await until(()=>P.q('#chc-df .df-all')); await sleep(40); }
const rowOf=(P,org)=>P.q(`#chc-df tr.df-row[data-df-row="${org}"]`);
const chipOf=(P,org,th)=>{ const r=rowOf(P,org); return r?[...r.querySelectorAll('td')].find(td=>td.dataset.th===th).querySelector('.df-st'):null; };
// every "·" in a piece of the page opens a span that never breaks; the number and its word inside one too
const dotsWhole=(P,el)=>{ const out=[]; const w=P.w.document.createTreeWalker(el,P.w.NodeFilter.SHOW_TEXT); let n; while((n=w.nextNode())) if(/·/.test(n.nodeValue)) out.push(!!n.parentElement.closest('.df-tw')&&n.nodeValue.trimStart().startsWith('·')); return out.length>0&&out.every(Boolean); };
const keeps=el=>el?[...el.querySelectorAll('.df-tw')].map(s=>s.textContent):[];
(async()=>{ await T.sec(async()=>{
  console.log('\n-- (D1) the town, never a street word before it --');
  const P=page(); await ready(P); await openDf(P);
  c('the six towns the reader cut wrong are whole; two-word towns stay whole (St Marys is a saint\'s town, not a street)',
    Object.fromEntries(P.J('DF.data.churches').filter(x=>/^ANBT/.test(x.org)).map(x=>[x.org,x.town])), TOWNS);
  c('…the rows say the town', [rowOf(P,'ANBT01').querySelector('.df-faint').textContent.split(' · ')[0],rowOf(P,'ANBT06').querySelector('.df-faint').textContent.split(' · ')[0]], ['Clearfield','York']);
  c('…a church is found by its town ("clearfield")', (()=>{ const q=P.q('#df-q'); q.value='clearfield'; q.dispatchEvent(new P.w.Event('input',{bubbles:true})); return P.qa('#chc-df tr.df-row:not([hidden])').map(r=>r.dataset.dfRow); })(), ['ANBT01']);
  P.q('#df-q').value=''; P.q('#df-q').dispatchEvent(new P.w.Event('input',{bubbles:true}));
  const RD=await import(path.join(__dirname,'..','netlify','functions','digital-read.mjs'));
  const entry=a=>RD.parseEntry(`<p>Menu login</p><p>Address: ${a} Google Maps</p><p>Phone: 215-555-0100</p><p>Parent: Pennsylvania Conference</p>`,'ANBT99');
  // the reader (digital-read.mjs) still cuts these six towns this way; the page cleans each town where the findings arrive (above), which is
  // everything a pastor sees. The reader's own fix waits for its next versioned release (a function changed under the same "fn" cannot be checked live).
  c('the reader, unchanged for now: the page is what cleans the town', RD.parseEntry ? entry('30 Sample Run Rd Hanover PA 17331').town : null, 'Rd Hanover');
  c('…and two-word towns whole', ['70 Sample St State College PA 16801','80 Sample Rd Huntingdon Valley PA 19006','100 Sample St St Marys PA 15857','5645 Sr 309 Harveys Lake PA 18618','10 Sample Rd Warminster PA 18974-4422'].map(a=>entry(a).town),
    ['State College','Huntingdon Valley','St Marys','Harveys Lake','Warminster']);

  console.log('\n-- (D2) a month and its year, a number and its word, every "·" with the words after it --');
  const YT='YouTube & live stream';
  const idle=chipOf(P,'ANBT01',YT), idle2=chipOf(P,'ANBT02',YT), ago=chipOf(P,'ANBT03',YT), ago1=chipOf(P,'ANBT04',YT);
  c('the chips read as before', [idle.textContent,idle2.textContent,ago.textContent,ago1.textContent], ['Idle since September 2024','Idle since July 2026','Last video 3 days ago','Last video 1 day ago']);
  c('…"September 2024", "July 2026", "3 days ago", "1 day ago" each in one piece that never breaks', [keeps(idle),keeps(idle2),keeps(ago),keeps(ago1),/\.df-tw\{white-space:nowrap\}/.test(css)],
    [['September 2024'],['July 2026'],['3 days ago'],['1 day ago'],true]);
  c('…the chip\'s words one piece beside its dot (never loose pieces of a flex row)', [...idle.childNodes].map(n=>n.nodeType===3?'#text':n.tagName.toLowerCase()), ['i','span']);
  P.E(`DF.open['ANBT01']=true; dfPaint();`); await sleep(20);
  const det=P.q('#df-row-ANBT01').nextElementSibling;
  const ytArea=[...det.querySelectorAll('.df-area')].find(a=>a.querySelector('b').textContent===YT);
  c('…the area\'s heading too', [ytArea.querySelector('.df-ahead').textContent,keeps(ytArea.querySelector('.df-ahead'))], ['Idle since September 2024',['September 2024']]);
  const ln=rowOf(P,'ANBT12').querySelector('.df-faint'), hv=rowOf(P,'ANBT08').querySelector('.df-faint');
  c('the town line reads as before', [ln.textContent,hv.textContent], ['Lancaster · 37 members · company','Huntingdon Valley · 39 members']);
  c('…"· 37 members" and "· company" each whole; "· 39 members" whole', [keeps(ln),keeps(hv),dotsWhole(P,ln),dotsWhole(P,hv)], [['· 37 members','· company'],['· 39 members'],true,true]);
  const own=P.q('#chc-df .df-own header .df-faint');
  c('…his own card\'s line too ("· 120 members", "· pastor of record:")', [own.textContent.replace(/\s+/g,' '),dotsWhole(P,own)], ['Brookfield · 120 members · pastor of record: Joshua Mura',true]);
  const pill=P.qa('#chc-df .df-pills>span')[2];
  c('the pill: the date whole, "· updated monthly" whole', [pill.textContent,keeps(pill)], ['Read from public pages on 8 Oct 2026 · updated monthly',['8 Oct 2026','· updated monthly']]);
  c('…a piece inside a pill is never drawn as a pill of its own', [/\.df-pills>span\{border:1px solid/.test(css),/\.df-pills span\{border/.test(css)], [true,false]);
  const S=page({lang:'es'}); await ready(S); await openDf(S);
  const YS='YouTube y transmisión';
  const sIdle=chipOf(S,'ANBT02',YS), sAgo=chipOf(S,'ANBT03',YS), sAgo1=chipOf(S,'ANBT04',YS);
  c('Spanish: "julio de 2026", "hace 3 días", "hace 1 día" each whole', [sIdle.textContent,keeps(sIdle),sAgo.textContent,keeps(sAgo),sAgo1.textContent,keeps(sAgo1)],
    ['Inactivo desde julio de 2026',['julio de 2026'],'Último video hace 3 días',['hace 3 días'],'Último video hace 1 día',['hace 1 día']]);
  const sPill=S.qa('#chc-df .df-pills>span')[2], sLn=rowOf(S,'ANBT12').querySelector('.df-faint');
  c('…the pill and the town line', [sPill.textContent,keeps(sPill),sLn.textContent,keeps(sLn)],
    ['Leído de páginas públicas el 8 oct 2026 · se actualiza cada mes',['8 oct 2026','· se actualiza cada mes'],'Lancaster · 37 miembros · compañía',['· 37 miembros','· compañía']]);

  console.log('\n-- (D3) Spanish: "al pastor", the title in lower case; the sentence agrees --');
  const F3=FIND62(); F3.churches.push(ch62({org:'ANBZ06',name:'Otherton SDA Church',town:'Otherton',pastor:'Ann Lee',dirPastors:[{name:'Carl Benson',where:'Adventist Church Finder',url:'https://x.test/'}],
    site:site62({pastors:[{name:'Ed Olsen',former:false,pages:['/about']},{name:'Ann Lee',former:false,pages:['/']}],pastorNamed:['/']}),
    otherSite:{url:'https://otherton.seventhdayadventist.church/',title:'Otherton Seventh-day Adventist Church',phones:['215-555-0100'],opens:true,pastors:[{name:'Matt Sample',pages:['/']}]}}));
  const judge=Q=>Q.J(`(()=>{ const F=${JSON.stringify(F3)}; const X=dfContext(F); const c=F.churches.find(x=>x.org==='ANBZ06'); const j=dfJudge(c,X,'2026-10-08',false,'Joshua Mura');
    return [j.areas.pastor.lines.slice(1),j.areas.website.lines.filter(l=>/que nombra|, naming/.test(l))]; })()`);
  c('Spanish', judge(S), [['Nombra al pastor Ed Olsen (página de quiénes somos): el sitio o la ficha oficial está desactualizada.',
    'El sitio antiguo nombra al pastor Matt Sample (otherton.seventhdayadventist.church): el sitio o la ficha oficial está desactualizada.',
    'Adventist Church Finder todavía nombra al pastor Carl Benson.'],
    ['Hay otra página de la iglesia en la plataforma adventista de sitios web: otherton.seventhdayadventist.church, que nombra al pastor Matt Sample. Enlácela al sitio de la iglesia, o elija uno.']]);
  c('…English unchanged ("Pastor" a title before the name)', judge(P), [['It names Pastor Ed Olsen (about page): either the site or the official listing is out of date.',
    'The older site names Pastor Matt Sample (otherton.seventhdayadventist.church): either the site or the official listing is out of date.',
    'Adventist Church Finder still names Pastor Carl Benson.'],
    ['Another page for the church is also online, on the Adventist church-website platform: otherton.seventhdayadventist.church, naming Pastor Matt Sample. Link it to the church’s site, or choose one.']]);

  console.log('\n-- (D4) "What this can and cannot see": plain sentences --');
  c('English', [P.E(`dfT('lim2')`),P.E(`dfT('lim3')`)], ['Not read: Facebook and Instagram (only each page’s link, and its follower count when a search result shows it); Google’s own search order (no program may read it); YouTube comments.',
    'A site that asks programs not to read it, or does not let our reader in, is marked as such and never counted against the church.']);
  c('Spanish', [S.E(`dfT('lim2')`),S.E(`dfT('lim3')`)], ['No se lee: Facebook ni Instagram (solo el enlace de cada página, y su número de seguidores cuando una búsqueda lo muestra); el orden de búsqueda de Google (ningún programa puede leerlo); los comentarios de YouTube.',
    'Un sitio que pide no ser leído por programas, o no deja entrar a nuestro lector, se señala como tal y nunca cuenta en contra de la iglesia.']);
  c('…on the page', [P.txt('#chc-df .df-limits'),S.txt('#chc-df .df-limits')].map(t=>/shows them, its followers|is said so|se dice así/.test(t)), [false,false]);
  c('no page errors', [P.errs,S.errs], [[],[]]);

  console.log('\n-- (D5) the Spanish survey: "Iglesias cercanas" in Spanish, one name for the tract, the median --');
  const E=page(); await ready(E); survey(E); await sleep(300);
  const ES=page({lang:'es'}); await ready(ES); survey(ES); await sleep(300);
  const congs=(Q,state)=>{ Q.E(`CONGS=${state==='none'?'[]':'null'}; CONGS_STATE=${JSON.stringify(state==='none'?'ready':state)}; drawCongregations()`); return Q.txt('#congslot'); };
  const esIdle=congs(ES,'idle');
  c('no data yet: Spanish, and the county card in Spanish (its link the same)', [esIdle,ES.q('#congslot a').getAttribute('href')],
    ['Aún no hay datos de congregaciones. Adherencia por condado · Censo Religioso de EE. UU. 2020Adherentes por cada 1,000 personas, por denominación, en Bucks: los únicos datos religiosos por condado del país. Se publican por condado, no por manzana, así que van junto a esta lista y no en el mapa.',
     'https://www.thearda.com/us-religion/census/congregational-membership']);
  c('…the other states of the slot in Spanish too (looking, did not load, none nearby)', ['loading','failed','none'].map(s=>/[A-Za-z]+ (for|of|the|is|did|lists) /.test(congs(ES,s).replace(/OpenStreetMap|Censo Religioso de EE\. UU\./g,''))), [false,false,false]);
  c('…English unchanged', congs(E,'idle'), 'No congregation data yet. County adherence · US Religion Census 2020Adherents per 1,000 people by denomination for Bucks — the only county-level religious data in the country. Published by county, not by block, so it sits alongside this list rather than on the map.');
  c('"sección censal" everywhere, never "sector censal"', [/sectores? censal/i.test(H),/sectores grandes/.test(H),ES.E(`tr('People per square mile, measured from each block’s own boundary — not raw counts, which flatter big empty tracts.')`)],
    [false,false,'Habitantes por milla cuadrada, calculado desde el propio límite de cada manzana — no conteos brutos, que favorecen a las secciones censales grandes y vacías.']);
  const labs=ES.qa('#report .stat .l, #report .card .l').map(x=>x.textContent).filter(t=>/Ingreso|Edad/.test(t));
  c('the cards: "Ingreso mediano del hogar", "Edad mediana"', labs, ['Ingreso mediano del hogar','Edad mediana']);
  c('…the brief: "una edad mediana de", "El ingreso mediano del hogar"', [/edad mediana de/.test(ES.txt('#brief')),/El ingreso mediano del hogar es/.test(ES.txt('#brief'))], [true,true]);
  c('…no "edad media" or "ingreso medio" anywhere (the English says median)', (H.match(/\b[Ee]dad media\b|\b[Ii]ngreso medio\b/g)||[]).length, 0);
  c('no page errors', [E.errs,ES.errs], [[],[]]);

  console.log('\n-- (D6) the directory builder: even buttons, one space --');
  const D=page(); await ready(D); survey(D); await sleep(100);
  D.E(`(()=>{ const d=dirGet(); ['Sample-A','Sample-B','Sample-C'].forEach((f,i)=>d.families.push({id:'f'+i,family:f,people:'',kids:'',phone:'',email:''})); uPersist(); dirOpen(); })()`); await sleep(40);
  const cnt=D.q('#dir-sheet .dir-count');
  c('"3 families · 0 with photos": one piece of the row, one space before the dot (never a flex gap and a space)', [cnt.firstElementChild&&cnt.firstElementChild.tagName,cnt.firstElementChild&&cnt.firstElementChild.textContent,
    [...cnt.childNodes].filter(n=>n.nodeType===3&&n.nodeValue.trim()).length], ['SPAN','3 families · 0 with photos',0]);
  c('…the dot with its words, the count as before', [keeps(cnt).length?keeps(cnt):[...cnt.querySelectorAll('span')].filter(s=>D.w.getComputedStyle(s).whiteSpace==='nowrap'||/dir-tw/.test(s.className)).map(s=>s.textContent),D.txt('#dir-sheet .dir-count b')], [['· 0 with photos'],'3 families']);
  c('the four buttons: two by two of equal width where four do not fit across, each the full width on a phone',
    [/@media \(max-width:800px\)\{ \.dir-acts\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/.test(css),/@media \(max-width:520px\)\{ \.dir-acts\{grid-template-columns:minmax\(0,1fr\)\}/.test(css),D.qa('#dir-sheet .dir-acts>.btn').length], [true,true,4]);
  c('…a computer keeps its one row', /\.dir-acts\{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0\}/.test(css), true);
  c('no page errors', D.errs, []);
}); T.done(); })();
