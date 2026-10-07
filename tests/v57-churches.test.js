// v10.57.0 — your churches: switch between them, and compare them. The pastor (7 Oct 2026): "some pastors have multiple churches where
// they can they need to have them saved so they can click a button and say which church so they click one church. It'll show them
// everything for that CHURCH … Also, maybe we could also have a comparison between churches … kinda like how conferences compare each
// other but when they put the information for all the churches say three churches, they can compare it and see … the differences."
// Design: Terrain-work/v74/DESIGN-CHURCHES.md. Written failing-first on v10.56.2.
const {sleep,until,checker,page,ready,survey,FX}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const safe=(P,s,d=null)=>{ try{ return P.E(s); }catch(e){ return d===null?'ERR '+String(e.message||e).slice(0,60):d; } };
const B_ADDR='3 Ridge Pike, Fairview Village, PA 19409';

async function twoChurches(P){
  survey(P); await sleep(60);
  P.E(`(()=>{ capSave(${JSON.stringify(FX.MEDIUM)}); uChurch().selected=['food-pantry']; uPersist(); })()`);
  P.E(`(()=>{ const s=uStore(); s.churches['ch-b']={id:'ch-b',name:${JSON.stringify(B_ADDR)},address:${JSON.stringify(B_ADDR)},capacity:{},members:[],linked:[],drafts:[],selected:[],overrides:{},share:{}}; uPersist(); uSwitch('ch-b'); })()`);
  await sleep(40);
  // its survey's matched address is its own, so the survey keeps it as this church (uEnsureChurch)
  survey(P,{church:'Fairview Village SDA',mod:`D.geo={matched:${JSON.stringify(B_ADDR)}}; D.M.tract.poverty=31.4; D.M.tract.noCar=4.2; D.levels.cousub={kind:'Town',name:'Lower Providence Township',short:'Lower Providence'};`});
  await sleep(60);
  P.E(`capSave(${JSON.stringify(FX.SMALL)})`);
  P.E(`uSwitch(Object.keys(uStore().churches).find(k=>k!=='ch-b'))`); await sleep(40);
  P.E('showWho()'); await sleep(20);
}

(async()=>{ await T.sec(async()=>{
  const P=page(); await ready(P);
  c('the six stamps say v10.57.0', [P.E('VERSION'),P.q('meta[name="terrain-version"]').content,P.q('html').dataset.version,P.txt('#ver')], ['v10.57.0','v10.57.0','v10.57.0','v10.57.0']);

  console.log('\n-- one church: the chip in the header, no count --');
  survey(P); await sleep(60); P.E('showWho()'); await sleep(20);
  c('the chip beside his name: the church\'s name, an arrow, no count', [!!P.q('#whoami #chbtn'),P.txt('#chbtn .chb-n'),!!P.q('#chbtn .chb-c'),P.q('#whoami').firstElementChild.id], [true,'Bucks County SDA',false,'chbtn']);

  console.log('\n-- the snapshot: the figures kept with the church --');
  const snap=P.J('uChurch().snap||null');
  c('kept each time the survey draws: v1, the town, the tract, today', [snap&&snap.v,snap&&snap.town,snap&&snap.tract,snap&&/^\d{4}-\d\d-\d\d$/.test(snap.at)], [1,'Warminster','Census Tract 2041.02',true]);
  c('…the figures as tract · town · county (rounded to one place)', [snap&&snap.figs.poverty,snap&&snap.figs.pop,snap&&snap.figs.medInc], [[19.4,11,7.1],[5480,646000,646000],[52000,76000,98000]]);
  c('…the top needs\' titles, five at most', [snap&&Array.isArray(snap.needs),snap&&snap.needs.length>0&&snap.needs.length<=5,snap&&snap.needs.every(t=>typeof t==='string'&&t.length>3)], [true,true,true]);
  c('…no address in it', JSON.stringify(snap||{}).includes('Bristol'), false);
  c('a figure missing from the survey is not kept', snap&&('seniorsShare' in snap.figs), false);

  console.log('\n-- two churches --');
  await twoChurches(P);
  c('two churches on the device, Bucks County open', [safe(P,'chList().length'),P.txt('#chbtn .chb-n'),P.txt('#chbtn .chb-c')], [2,'Bucks County SDA','2']);
  c('each church its own snapshot', P.J(`Object.values(uStore().churches).filter(c=>c.snap).map(c=>[c.snap.town,c.snap.figs.poverty[0]])`), [['Warminster',19.4],['Lower Providence',31.4]]);

  console.log('\n-- the sheet: tap a church to see everything for it --');
  P.q('#chbtn').click(); await sleep(30);
  c('the sheet opens: both churches, the one open now marked', [!!P.q('#ch-sheet[open]'),P.qa('#ch-sheet .ch-go b').map(b=>b.textContent),P.q('#ch-sheet .ch-go[aria-current="true"] b')&&P.q('#ch-sheet .ch-go[aria-current="true"] b').textContent], [true,['Bucks County SDA','Fairview Village SDA'],'Bucks County SDA']);
  c('…each row says its town', P.qa('#ch-sheet .ch-go span').map(s=>s.textContent), ['Warminster','Lower Providence']);
  c('…Add a church, and Compare your churches (two or more)', [!!P.q('#ch-sheet [data-ch-add]'),P.txt('#ch-sheet [data-ch-cmp]')], [true,'Compare your churches']);
  P.q('#ch-sheet [data-ch-go="ch-b"]').click(); await sleep(40);
  c('tapping Fairview: the sheet closes, Fairview is open, its survey', [!!P.q('#ch-sheet[open]'),P.E('uStore().active'),P.E('TOOL'),P.txt('#chbtn .chb-n')], [false,'ch-b','survey','Fairview Village SDA']);
  c('…its own "Your church" (14 volunteers, not 46)', P.E('capMerged().volunteers'), 14);

  console.log('\n-- rename --');
  P.q('#chbtn').click(); await sleep(20);
  P.q('#ch-sheet [data-ch-ren="ch-b"]').click(); await sleep(20);
  const inp=P.q('#ch-sheet [data-ch-renform="ch-b"] input');
  c('Rename: a box with the name', inp&&inp.value, 'Fairview Village SDA');
  inp.value='Fairview <b>Village</b>'; P.q('#ch-sheet [data-ch-renform="ch-b"]').dispatchEvent(new P.w.Event('submit',{bubbles:true,cancelable:true})); await sleep(30);
  c('…saved, shown as text (never markup), the chip follows', [P.E(`uStore().churches['ch-b'].name`),!!P.q('#ch-sheet .ch-go b b'),P.txt('#chbtn .chb-n')], ['Fairview <b>Village</b>',false,'Fairview <b>Village</b>']);
  P.E(`(()=>{ uStore().churches['ch-b'].name='Fairview Village SDA'; uPersist(); uChrome(); })()`);
  P.q('#ch-sheet [data-ch-x]').click(); await sleep(20);
  c('✕ closes the sheet', !!P.q('#ch-sheet[open]'), false);

  console.log('\n-- add a church --');
  P.q('#chbtn').click(); await sleep(20);
  P.q('#ch-sheet [data-ch-add]').click(); await sleep(40);
  c('Add a church: the survey with its address box', [!!P.q('#ch-sheet[open]'),P.E('TOOL'),P.q('.ask')&&P.q('.ask').style.display!=='none'], [false,'survey',true]);

  console.log('\n-- Compare your churches --');
  P.E(`uSwitch(Object.keys(uStore().churches).find(k=>k!=='ch-b'))`); await sleep(30);
  P.E(`gfDemoFill({quiet:true})`); await sleep(30);
  const act0=P.E('uStore().active'), vol0=P.E('capMerged().volunteers');
  const f0=P.w.__fetched.length;
  P.q('#chbtn').click(); await sleep(20);
  P.q('#ch-sheet [data-ch-cmp]').click(); await sleep(60);
  c('the tool opens: its own page, the sheet closed', [P.E('TOOL'),P.q('#chc')&&P.q('#chc').hidden,!!P.q('#ch-sheet[open]'),P.txt('#toolname')], ['churches',false,false,'Compare your churches']);
  c('…the two churches as columns, in his order, with their towns', P.qa('#chc-hood').length?P.qa('#chc section[aria-labelledby="chc-hood"] thead th b').map(b=>b.textContent):[], ['Bucks County SDA','Fairview Village SDA']);
  c('five parts, each its own colour: what stands out, the neighborhoods, the churches, Spiritual Gifts, the plans',
    P.qa('#chc .chc-sec h2').map(h=>h.textContent), ['What stands out','The neighborhoods','The churches','Spiritual Gifts','The plans']);
  c('…each part coloured', P.qa('#chc .chc-sec').map(s=>/--k:var\(--/.test(s.getAttribute('style')||'')), [true,true,true,true,true]);
  const row=(sec,lab)=>{ const tr=P.qa(`#chc section[aria-labelledby="chc-${sec}"] tbody tr`).find(r=>r.querySelector('th').textContent===lab); return tr?[...tr.querySelectorAll('td')].map(td=>td.querySelector('.chc-v')?td.querySelector('.chc-v').textContent:td.textContent.replace(/\s+/g,' ').trim()):null; };
  c('the neighborhoods: each church\'s own figures', [row('hood','Below the poverty line'),row('hood','Homes without a car'),row('hood','Median household income')], [['19.4%','31.4%'],['13.5%','4.2%'],['$52,000','$52,000']]);
  c('…its top needs', P.qa('#chc .chc-needs').length, 2);
  c('the churches: Your church, each its own', [row('church','Volunteers'),row('church','Leaders'),row('church','Attending')], [['46','14'],['9','2'],['135','55']]);
  c('Spiritual Gifts: results in, of the church\'s count (the demo at Bucks County only)', row('gifts','Results in'), ['24 of 135','0 of 55']);
  c('a row no church has a figure for is left out (no "Age 65 and over" in this survey; no members on the books)', [row('hood','Age 65 and over'),row('church','Members on the books')], [null,null]);
  c('the plans: ministries in the plan, proposals decided', [row('plan','Ministries in the plan'),row('plan','Proposals decided')], [['1','0'],['0','0']]);
  const so=P.qa('#chc .chc-so li').map(l=>l.textContent);
  c('what stands out: the larger differences, in plain sentences', [so.includes('Below the poverty line: Fairview Village SDA 31.4%, Bucks County SDA 19.4%.'),so.includes('Homes without a car: Bucks County SDA 13.5%, Fairview Village SDA 4.2%.'),
    so.includes('Volunteers: Bucks County SDA 46, Fairview Village SDA 14.'),so.includes('Spiritual Gifts results so far only at Bucks County SDA.')], [true,true,true,true]);
  c('…never a figure that is much the same (limited English is 11.2% at both)', so.some(t=>/Limited-English/.test(t)), false);
  c('…never a ranking or a score', /\b(rank|ranked|score|best church|worst|winner|#1)\b/i.test(P.txt('#chc')), false);
  c('counts only: no member\'s name', [/Alex Rivera|\(sample\)/.test(P.txt('#chc'))], [false]);
  c('comparing changed nothing: the open church and its numbers', [P.E('uStore().active'),P.E('capMerged().volunteers')], [act0,vol0]);
  c('…and asked the Census nothing', P.w.__fetched.slice(f0).filter(u=>/census|tigerweb|overpass/i.test(u)), []);

  P.E('showHub()'); await sleep(20); P.q('#chbtn').click(); await sleep(20);
  P.q(`#ch-sheet [data-ch-go="${P.E('uStore().active')}"]`).click(); await sleep(40);
  c('the church open now, tapped from the main menu: its survey', [P.E('TOOL'),!!P.q('#ch-sheet[open]')], ['survey',false]);
  P.E(`openTool('churches')`); await sleep(40);

  console.log('\n-- a church with no snapshot --');
  P.E(`(()=>{ const s=uStore(); s.churches['ch-c']={id:'ch-c',name:'Pottstown SDA',address:'1 High St, Pottstown, PA 19464',capacity:{},members:[],linked:[],drafts:[],selected:[],overrides:{},share:{}}; uPersist(); chcRender(); })()`); await sleep(20);
  c('three columns; Pottstown: "Open its survey once…" and a button', [P.qa('#chc section[aria-labelledby="chc-hood"] thead th b').length,/Open its survey once to include its neighborhood\./.test(P.txt('#chc section[aria-labelledby="chc-hood"]')),!!P.q('#chc [data-chc-open="ch-c"]')], [3,true,true]);
  c('…its church figures say "Not filled in yet"', row('church','Volunteers')[2], 'Not filled in yet');
  P.q('#chc [data-chc-open="ch-c"]').click(); await sleep(40);
  c('…the button opens that church\'s survey', [P.E('uStore().active'),P.E('TOOL'),!!P.q('#chc')&&P.q('#chc').hidden], ['ch-c','survey',true]);

  console.log('\n-- the main menu: a sixth tool, 3 + 3 --');
  P.E('showHub()'); await sleep(30);
  c('six tools, the sixth Compare your churches', P.qa('#hub .tools .tool').map(b=>b.dataset.tool), ['survey','gifts','case','planner','compare','churches']);
  c('…its name, line and button', [P.txt('#hub .tool[data-tool="churches"] b'),P.txt('#hub .tool[data-tool="churches"] .td'),P.txt('#hub .tool[data-tool="churches"] .tgo')], ['Compare your churches','Your churches side by side: needs, people and gifts.','Compare churches']);
  P.q('#hub .tool[data-tool="churches"]').click(); await sleep(40);
  c('…opens the comparison', [P.E('TOOL'),P.q('#chc').hidden,P.qa('#chc .chc-sec').length], ['churches',false,5]);
  P.E('showHub()'); await sleep(20);
  c('the main menu closes it', [P.q('#chc').hidden,P.q('#chc').innerHTML], [true,'']);
  P.E(`openTool('survey')`); await sleep(20);
  c('another tool closes it', P.q('#chc').hidden, true);
  c('no page errors', P.errs, []);
});

await T.sec(async()=>{
  console.log('\n-- one church: the comparison asks for a second --');
  const P=page(); await ready(P);
  survey(P); await sleep(60);
  P.E(`openTool('churches')`); await sleep(40);
  c('"Add a second church to compare" and Add a church', [/Add a second church to compare/.test(P.txt('#chc')),!!P.q('#chc [data-ch-add]')], [true,true]);
  P.E('showWho()'); P.q('#chbtn').click(); await sleep(20);
  c('…the sheet has no Compare with one church', !!P.q('#ch-sheet [data-ch-cmp]'), false);
  c('a brand-new device (no church mapped): no chip', (()=>{ P.E(`(()=>{ const s=uStore(); Object.values(s.churches).forEach(c=>{ c.name='My church'; c.address=''; c.capacity={}; }); uPersist(); uChrome(); })()`); return !!P.q('#chbtn'); })(), false);
  c('a member\'s page: no chip, no snapshot', [safe(P,`(()=>{ GIFTS_LINK.on=true; const h=chChipHTML(); const ch=uChurch(); delete ch.snap; chSnapSave(); const r=[h,!!uChurch().snap]; GIFTS_LINK.on=false; return JSON.stringify(r); })()`)], ['["",false]']);
  c('no page errors', P.errs, []);
});

await T.sec(async()=>{
  console.log('\n-- the free version: the tool is locked --');
  const P=page({tier:'free'}); await ready(P);
  P.E(`openTool('churches')`); await sleep(30);
  c('locked like the other full tools', [!!P.q('#locked:not([hidden])'),P.q('#chc').hidden], [true,true]);
});

await T.sec(async()=>{
  console.log('\n-- Spanish --');
  const P=page({lang:'es'}); await ready(P);
  await twoChurches(P);
  c('the chip\'s title, the sheet', [P.q('#chbtn')&&P.q('#chbtn').title,(P.q('#chbtn').click(),P.txt('#ch-t')),P.txt('#ch-sheet [data-ch-cmp]'),P.txt('#ch-sheet [data-ch-add]')], ['Sus iglesias','Sus iglesias','Compare sus iglesias','+ Añadir una iglesia']);
  P.q('#ch-sheet [data-ch-cmp]').click(); await sleep(60);
  c('the comparison in Spanish', [P.txt('#chc h1'),P.qa('#chc .chc-sec h2').map(h=>h.textContent)], ['Compare sus iglesias',['Lo que se destaca','Los vecindarios','Las iglesias','Dones espirituales','Los planes']]);
  c('…its rows and a sentence', [!!P.qa('#chc tbody th').find(t=>t.textContent==='Bajo la línea de pobreza'),P.qa('#chc .chc-so li').map(l=>l.textContent).includes('Ninguna iglesia tiene todavía resultados de Dones espirituales.')], [true,true]);
  P.E('showHub()'); await sleep(30);
  c('the main menu\'s tile', [P.txt('#hub .tool[data-tool="churches"] b'),P.txt('#hub .tool[data-tool="churches"] .td'),P.txt('#hub .tool[data-tool="churches"] .tgo')], ['Compare sus iglesias','Sus iglesias lado a lado: necesidades, gente y dones.','Comparar iglesias']);
  c('no page errors', P.errs, []);
}); T.done(); })();
