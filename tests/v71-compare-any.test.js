// v10.71.0 — Compare any church of the conference. The pastor (6 Nov 2026, the conference has decided to use Terrain): "when I go to
// compare churches, it doesn't let me put any other CHURCH in there. I was thinking that I can sign on my account and change any CHURCH,
// but it keeps my two churches actually, and I can't change it that probably we want to be able to change to any church at least within
// the conference." Here: a church picker (#chp-sheet, chpOpen) that lists the conference's churches from the official directory
// (DF.data.churches: name, town, official members; sorted by name; searched by name, other name or town, accents and case folded), opened
// from Compare your churches and from the church switcher; a tapped church is kept as a church of its own (chAddDir: the directory's name
// and address, never switching the open church) and marked Added; the comparison's first row "Members on the official list" (chFacts
// official, chDirEntry: by the listing, else by dfMine's name rule, now chKey); Remove for a church with nothing filled in (chEmpty, two
// taps); the address way kept at the foot; the list drawn when the findings arrive; Spanish. The churches are the v62 helpers' made-up
// findings (the repository is public). Written failing-first on v10.70.1.
const {sleep,until,checker,page,ready,survey,FX}=require('./v45-helpers.js');
const {FIND62,dfFetch62}=require('./v62-digital-helpers.js');
const T=checker(), c=T.c;
const BAD=/\bAI\b|\bIA\b/;
/* the made-up conference: each church its own address, one with another name (accented) */
const FIND=()=>{ const F=FIND62();
  const addr={ANBZ01:'10 Main St Sampleton PA 19000',ANBZ02:'22 Brook Rd Brookfield PA 19001',ANBZ03:'3 Fall Ave Allfail PA 19002',ANBZ04:'4 Old Ln Olden PA 19003',ANBZ05:'5 Nowhere St Nosite PA 19004'};
  F.churches.forEach(x=>{ x.address=addr[x.org]; x.aka=null; });
  F.churches.find(x=>x.org==='ANBZ05').aka='Iglesia Adventista de Nosite';
  return F; };
/* the digital function answering only when released (the list arrives after the page drew) */
function deferDigital(P,findings){ const f0=P.w.fetch; let release; const gate=new Promise(r=>{ release=r; }); let n=0;
  P.w.fetch=async(u,o)=>{ u=String(u); if(!/\/\.netlify\/functions\/digital/.test(u)) return f0(u,o); n++; await gate;
    return {ok:true,status:200,json:async()=>({ok:true,fn:'digital-1.2',conf:'Pennsylvania',supported:true,enabled:true,places:true,search:true,review:false,state:'ready',findings:JSON.parse(JSON.stringify(findings)),reading:null})}; };
  return {release:()=>release(),count:()=>n}; }
const names=P=>P.qa('#chp-list .ch-go b').map(b=>b.textContent);
const heads=P=>P.qa('#chc section[aria-labelledby="chc-church"] thead th b').map(b=>b.textContent);
const row=(P,sec,lab)=>{ const tr=P.qa(`#chc section[aria-labelledby="chc-${sec}"] tbody tr`).find(r=>r.querySelector('th').textContent===lab); return tr?[...tr.querySelectorAll('td')].map(td=>td.querySelector('.chc-v')?td.querySelector('.chc-v').textContent:td.textContent.replace(/\s+/g,' ').trim()):null; };
const bars=(P,sec,lab)=>{ const tr=P.qa(`#chc section[aria-labelledby="chc-${sec}"] tbody tr`).find(r=>r.querySelector('th').textContent===lab); return tr?[...tr.querySelectorAll('td')].map(td=>!!td.querySelector('.chc-bar')):null; };
const F=(name,o)=>Object.assign({id:name,name,town:'',snap:null,ready:true,official:null,membership:null,members:null,adults:null,volunteers:null,leaders:null,hours:null,rooms:0,skills:[],slots:[],gifts:{n:0,pct:null,d:null,strongest:[]},plan:0,dec:0},o);
const type=(P,v)=>{ const q=P.q('#chp-sheet [data-chp-q]'); q.value=v; q.dispatchEvent(new P.w.Event('input',{bubbles:true})); };

(async()=>{ await T.sec(async()=>{
  console.log('\n-- from Compare your churches, with one church: the picker --');
  const P=page(); await ready(P); dfFetch62(P,{findings:FIND()});
  survey(P); await sleep(60); P.E(`capSave(${JSON.stringify(FX.MEDIUM)})`);
  P.E(`openTool('churches')`); await sleep(80);
  c('one church: "Add a church to compare.", the picker\'s button, the address way as the second line', [P.txt('#chc .chc-one > p'),P.txt('#chc .chc-one [data-chp-open]'),P.txt('#chc .chc-one .note'),P.txt('#chc .chc-one [data-ch-add]')],
    ['Add a church to compare.','+ Add a church from your conference','Not in the list? Map its address in the Community Survey.','Map its address']);
  P.q('#chc [data-chp-open]').click(); await sleep(30);
  c('the picker opens: its title, the search box, the address way at its foot', [!!P.q('#chp-sheet[open]'),P.txt('#chp-t'),P.txt('#chp-sheet .chp-q span'),P.txt('#chp-sheet .chp-foot .note'),P.txt('#chp-sheet [data-chp-map]')],
    [true,'Add a church from your conference','Church or town','Not in the list? Map its address in the Community Survey.','Map its address']);
  await until(()=>P.q('#chp-list .ch-go'));
  c('the conference\'s churches by name, each with its town and its official count (none for a church without one)', P.qa('#chp-list .ch-go').map(b=>[b.querySelector('b').textContent,b.querySelector('span').textContent]),
    [['Allfail SDA Church','Allfail · 80 members'],['Brookfield SDA Church','Brookfield · 120 members'],['Nosite SDA Company','Nosite'],['Olden SDA Church','Olden · 60 members'],['Sampleton SDA Church','Sampleton · 120 members']]);
  type(P,'ALLF'); c('typed "ALLF": Allfail alone (case folded)', names(P), ['Allfail SDA Church']);
  type(P,'olden'); c('typed a town', names(P), ['Olden SDA Church']);
  type(P,'adventísta'); c('typed its other name, accents folded', names(P), ['Nosite SDA Company']);
  type(P,'zzz'); c('nothing matches: said', [names(P),P.txt('#chp-list')], [[],'No church matches.']);
  type(P,'');
  c('the shared name rule (chKey), and dfMine reads it', [P.E(`chKey('York Seventh-day Adventist Church')`),P.E(`chKey('York SDA Church')`),P.E(`chKey('Iglesia Adventista Hispana de York')`),/chKey/.test(P.E('dfMine.toString()'))], ['york','york','adventista hispana de york',true]);
  c('chDirEntry: by the listing first, else by the name rule, else nothing', P.J(`[(chDirEntry({id:'x',name:'Olden Seventh-day Adventist Church',address:''})||{}).org,(chDirEntry({id:'x',name:'Olden SDA',address:'',dir:{org:'ANBZ05',conf:'Pennsylvania'}})||{}).org,chDirEntry({id:'x',name:'Nowhere SDA',address:''})]`), ['ANBZ04','ANBZ05',null]);

  console.log('\n-- a church tapped: a church of its own, the comparison follows --');
  const act0=P.E('uStore().active');
  P.q('#chp-list [data-chp-add="ANBZ02"]').click(); await sleep(60);
  const added=P.J(`Object.values(uStore().churches).find(x=>x.dir&&x.dir.org==='ANBZ02')||null`);
  c('Brookfield: a church of its own with the directory\'s name, address and listing, empty otherwise; the open church unchanged',
    [added&&added.name,added&&added.address,added&&added.dir,added&&[added.capacity,added.members,added.linked,added.drafts,added.selected,added.overrides,added.share],P.E('uStore().active')===act0],
    ['Brookfield SDA Church','22 Brook Rd Brookfield PA 19001',{org:'ANBZ02',conf:'Pennsylvania'},[{},[],[],[],[],{},{}],true]);
  c('…the picker closes; two columns, the town from the directory; said in one line', [!!P.q('#chp-sheet[open]'),heads(P),P.qa('#chc section[aria-labelledby="chc-church"] thead th span').map(s=>s.textContent),P.txt('#chc .ch-said')],
    [false,['Bucks County SDA','Brookfield SDA Church'],['Warminster','Brookfield'],'Brookfield SDA Church added.']);
  c('…the first row of The churches: Members on the official list, "—" for a church not in the list', [P.q('#chc section[aria-labelledby="chc-church"] tbody tr th').textContent,row(P,'church','Members on the official list')], ['Members on the official list',['—','120']]);
  c('…the button under the title (two or more churches)', P.txt('#chc .chc-top [data-chp-open]'), '+ Add a church from your conference');
  P.q('#chc .chc-top [data-chp-open]').click(); await sleep(30);
  c('Brookfield is marked Added and cannot be tapped again; the rest can', [P.q('#chp-list li.on em')&&P.q('#chp-list li.on em').textContent,P.q('#chp-list li.on b').textContent,!!P.q('#chp-list [data-chp-add="ANBZ02"]'),P.qa('#chp-list [data-chp-add]').length], ['Added','Brookfield SDA Church',false,4]);
  P.q('#chp-list [data-chp-add="ANBZ03"]').click(); await sleep(60);
  c('Allfail added: three columns; the official row with bars (two or more with the figure)', [heads(P),row(P,'church','Members on the official list'),bars(P,'church','Members on the official list')], [['Bucks County SDA','Brookfield SDA Church','Allfail SDA Church'],['—','120','80'],[false,true,true]]);
  const trs=P.qa('#chc section[aria-labelledby="chc-church"] tbody tr'), cell=(tr,i)=>{ const td=tr.querySelectorAll('td')[i]; return td.querySelector('.chc-v')?td.querySelector('.chc-v').textContent:td.textContent.replace(/\s+/g,' ').trim(); };
  c('a church not filled in: its count on the official row, "Not filled in yet" once on the next, then "—"', [cell(trs[0],1),cell(trs[1],1),cell(trs[2],1),trs.slice(1).map(tr=>cell(tr,1)).filter(t=>t==='Not filled in yet').length], ['120','Not filled in yet','—',1]);
  c('chFacts: official from the directory, null without a match', P.J(`Object.values(uStore().churches).map(x=>chFacts(x).official)`), [null,120,80]);
  const so2=fs=>P.J(`chStandOut(${JSON.stringify(fs)})`);
  c('what stands out may say it, like the other counts: twice another\'s and three more', [so2([F('A',{official:200}),F('B',{official:60})])[0],so2([F('A',{official:120}),F('B',{official:80})]).some(t=>/official/.test(t))], ['Members on the official list: A 200, B 60.',false]);
  c('no page errors', P.errs, []);

  console.log('\n-- the switcher: + Add a church opens the picker; Remove for an empty church, two taps --');
  P.E('showWho()'); await sleep(20); P.q('#chbtn').click(); await sleep(20);
  const byId=P.J(`Object.fromEntries(Object.values(uStore().churches).map(x=>[x.id,x.name]))`);
  c('three churches, "+ Add a church" and its note', [P.qa('#ch-sheet .ch-go b').map(b=>b.textContent),P.txt('#ch-sheet [data-ch-add]'),P.txt('#ch-sheet .ch-addn')], [['Bucks County SDA','Brookfield SDA Church','Allfail SDA Church'],'+ Add a church','From your conference’s list, or by its address.']);
  c('Remove only for a church with nothing filled in (never the open church)', P.qa('#ch-sheet [data-ch-rm]').map(b=>b.textContent+' | '+byId[b.dataset.chRm]), ['Remove | Brookfield SDA Church','Remove | Allfail SDA Church']);
  P.q('#ch-sheet [data-ch-add]').click(); await sleep(20);
  c('"+ Add a church" opens the picker over the switcher', [!!P.q('#chp-sheet[open]'),!!P.q('#ch-sheet[open]')], [true,true]);
  P.q('#chp-sheet [data-chp-x]').click(); await sleep(20);
  c('✕ closes the picker; the switcher stays', [!!P.q('#chp-sheet[open]'),!!P.q('#ch-sheet[open]')], [false,true]);
  const allId=Object.keys(byId).find(k=>byId[k]==='Allfail SDA Church');
  P.q(`#ch-sheet [data-ch-rm="${allId}"]`).click(); await sleep(20);
  c('first tap: "Remove?", nothing removed', [P.q(`#ch-sheet [data-ch-rm="${allId}"]`).textContent,P.q(`#ch-sheet [data-ch-rm="${allId}"]`).classList.contains('u-danger'),P.E(`!!uStore().churches[${JSON.stringify(allId)}]`)], ['Remove?',true,true]);
  P.q(`#ch-sheet [data-ch-rm="${allId}"]`).click(); await sleep(60);
  c('second tap: removed; the sheet, the chip and the comparison follow', [P.E(`!!uStore().churches[${JSON.stringify(allId)}]`),P.qa('#ch-sheet .ch-go b').map(b=>b.textContent),P.txt('#chbtn .chb-c'),heads(P)], [false,['Bucks County SDA','Brookfield SDA Church'],'2',['Bucks County SDA','Brookfield SDA Church']]);
  P.E(`(()=>{ const x=Object.values(uStore().churches).find(y=>y.dir&&y.dir.org==='ANBZ02'); x.selected=['food-pantry']; uPersist(); chSheetDraw(); })()`); await sleep(20);
  c('a ministry chosen at Brookfield: no Remove for it', P.qa('#ch-sheet [data-ch-rm]').length, 0);
  P.E(`(()=>{ const x=Object.values(uStore().churches).find(y=>y.dir&&y.dir.org==='ANBZ02'); x.selected=[]; uPersist(); chSheetDraw(); })()`); await sleep(20);
  c('chEmpty: nothing filled in; "Your church" confirmed, a member, a directory family, a plan, a connection card, a draft, a linked member, a decision: not empty',
    P.J(`(()=>{ const mk=o=>Object.assign({id:'t',name:'T',address:'1 St',capacity:{},members:[],linked:[],drafts:[],selected:[],overrides:{},share:{}},o);
      return [chEmpty(mk({})),chEmpty(mk({capacity:{confirmed:true}})),chEmpty(mk({members:[{id:'p',name:'P'}]})),chEmpty(mk({directory:{v:1,title:'',year:'',note:'',families:[{id:'f'}],officers:[]}})),chEmpty(mk({plan:{night:'2027-03-06'}})),
        chEmpty(mk({connect:{cards:{a:{id:'a'}},past:[],people:{},gone:{}}})),chEmpty(mk({drafts:[{id:'d'}]})),chEmpty(mk({linked:['l']})),chEmpty(mk({caseDecisions:{idea:{when:'2026-11-01'}}}))]; })()`),
    [true,false,false,false,false,false,false,false,false]);
  c('…never the open church', P.E('chEmpty(uChurch())'), false);
  c('the address way from the picker: the Community Survey\'s address box, both sheets closed', (()=>{ P.q('#ch-sheet [data-ch-add]').click(); P.q('#chp-sheet [data-chp-map]').click(); return [!!P.q('#chp-sheet[open]'),!!P.q('#ch-sheet[open]'),P.E('TOOL'),P.q('.ask')&&P.q('.ask').style.display!=='none']; })(), [false,false,'survey',true]);
  P.E('showHub()'); await sleep(30);
  c('the main menu\'s tile keeps its words', P.txt('#hub .tool[data-tool="churches"] .td'), 'Your churches side by side: people, gifts and plans.');
  c('no page errors', P.errs, []);
}); await T.sec(async()=>{
  console.log('\n-- the list cannot be read --');
  const Q=page(); await ready(Q); dfFetch62(Q,{status:401});
  survey(Q); await sleep(60); Q.E(`openTool('churches')`); await sleep(60);
  Q.q('#chc [data-chp-open]').click(); await sleep(40);
  c('not registered with the server: one line, no list, the address way', [Q.txt('#chp-sheet .chp-msg'),!!Q.q('#chp-list'),Q.txt('#chp-sheet [data-chp-map]')], ['Your conference’s church list is not available yet.',false,'Map its address']);
  c('no page errors', Q.errs, []);
}); await T.sec(async()=>{
  console.log('\n-- the list arrives after the picker opened --');
  const R=page(); await ready(R); const D=deferDigital(R,FIND());
  survey(R); await sleep(60); R.E(`openTool('churches')`); await sleep(40);
  R.q('#chc [data-chp-open]').click(); await sleep(20);
  c('while the list loads: said, as a status', [R.txt('#chp-sheet .chp-msg'),R.q('#chp-sheet .chp-msg').getAttribute('role'),!!R.q('#chp-list')], ['Loading your conference’s churches…','status',false]);
  D.release(); await until(()=>R.q('#chp-list .ch-go'));
  c('…then the list, as it arrives', [names(R).length,!!R.q('#chp-sheet .chp-msg')], [5,false]);
  c('no page errors', R.errs, []);
}); await T.sec(async()=>{
  console.log('\n-- the comparison drawn before the findings: redrawn once when they arrive --');
  const V=page(); await ready(V); const D=deferDigital(V,FIND());
  survey(V); await sleep(60); V.E(`capSave(${JSON.stringify(FX.MEDIUM)})`);
  V.E(`(()=>{ const s=uStore(); s.churches['ch-b']={id:'ch-b',name:'Brookfield Seventh-day Adventist Church',address:'22 Brook Rd, Brookfield, PA 19001',capacity:{},members:[],linked:[],drafts:[],selected:[],overrides:{},share:{}}; uPersist(); })()`);
  V.E(`openTool('churches')`); await sleep(60);
  c('drawn without the list: no official row, one call to the server', [heads(V).length,row(V,'church','Members on the official list'),D.count()], [2,null,1]);
  D.release(); await until(()=>row(V,'church','Members on the official list')); await sleep(120);
  c('…the findings arrive: the row, Brookfield matched by its name; drawn once more, no second call', [row(V,'church','Members on the official list'),D.count(),V.qa('#chc section[aria-labelledby="chc-church"]').length], [['—','120'],1,1]);
  c('no page errors', V.errs, []);
}); await T.sec(async()=>{
  console.log('\n-- in Spanish --');
  const S=page({lang:'es'}); await ready(S); dfFetch62(S,{findings:FIND()});
  survey(S); await sleep(60); S.E(`openTool('churches')`); await sleep(80);
  c('one church', [S.txt('#chc .chc-one > p'),S.txt('#chc .chc-one [data-chp-open]'),S.txt('#chc .chc-one .note'),S.txt('#chc .chc-one [data-ch-add]')],
    ['Añada una iglesia para comparar.','+ Añadir una iglesia de su asociación','¿No está en la lista? Ubique su dirección en la Encuesta Comunitaria.','Ubicar su dirección']);
  S.q('#chc [data-chp-open]').click(); await until(()=>S.q('#chp-list .ch-go'));
  c('the picker', [S.txt('#chp-t'),S.txt('#chp-sheet .chp-q span'),S.q('#chp-list .ch-go span').textContent,S.txt('#chp-sheet .chp-foot .note'),S.txt('#chp-sheet [data-chp-map]')],
    ['Añadir una iglesia de su asociación','Iglesia o ciudad','Allfail · 80 miembros','¿No está en la lista? Ubique su dirección en la Encuesta Comunitaria.','Ubicar su dirección']);
  type(S,'zzz'); c('nothing matches', S.txt('#chp-list'), 'Ninguna iglesia coincide.'); type(S,'');
  S.q('#chp-list [data-chp-add="ANBZ03"]').click(); await sleep(60);
  c('added, said; the official row', [S.txt('#chc .ch-said'),S.q('#chc section[aria-labelledby="chc-church"] tbody tr th').textContent,row(S,'church','Miembros en la lista oficial')], ['Allfail SDA Church añadida.','Miembros en la lista oficial',['—','80']]);
  c('no church with "Your church" filled in: the official row, then the one row that says so (as before)', [S.qa('#chc section[aria-labelledby="chc-church"] tbody tr th').map(t=>t.textContent),row(S,'church','Las iglesias')], [['Miembros en la lista oficial','Las iglesias'],['Todavía sin llenar','Todavía sin llenar']]);
  S.q('#chc .chc-top [data-chp-open]').click(); await sleep(20);
  c('"Añadida"', S.q('#chp-list li.on em').textContent, 'Añadida');
  S.q('#chp-sheet [data-chp-x]').click(); await sleep(20);
  S.E('showWho()'); await sleep(20); S.q('#chbtn').click(); await sleep(20);
  c('the switcher: its note, Quitar', [S.txt('#ch-sheet .ch-addn'),S.qa('#ch-sheet [data-ch-rm]').map(b=>b.textContent)], ['De la lista de su asociación, o por su dirección.',['Quitar']]);
  S.q('#ch-sheet [data-ch-rm]').click(); await sleep(20);
  c('…¿Quitar?', S.q('#ch-sheet [data-ch-rm]').textContent, '¿Quitar?');
  c('the two lines of the list that cannot be read, or not yet', [S.E(`chT('loading')`),S.E(`chT('noList')`)], ['Cargando las iglesias de su asociación…','La lista de iglesias de su asociación todavía no está disponible.']);
  c('what stands out', S.J(`chStandOut(${JSON.stringify([F('A',{official:200}),F('B',{official:60})])})`)[0], 'Miembros en la lista oficial: A 200, B 60.');
  c('no "AI" anywhere in the picker, the switcher or the comparison', BAD.test([S.txt('#chp-sheet'),S.txt('#ch-sheet'),S.txt('#chc')].join(' ')), false);
  c('no page errors', S.errs, []);
}); T.done(); })();
