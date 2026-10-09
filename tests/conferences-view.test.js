// Learn from other conferences: the hub tile and the page (the conference comparison and the year ahead).
// The pastor approved the sample (Terrain-work/v52/conference-compare-sample.html) and its defaults: a hub tile of its own
// (also reached from the conference proposal in Make the Case); official joining figures per 1,000 members with the caution
// always visible, never ranked; registered pastors only, behind the same gate as the rest of Terrain; never telling a
// conference its calendar is thin. 2 Oct 2026: the data is checked again monthly and sent as a pull request, so the page says
// "Checked <date> · updated monthly" and never claims live reading. "Your conference" defaults to his registration's.
// Covered: the tile (EN, ES), the gate (no registration, member pages), loading (index first, then only what is chosen),
// the defaults and his kept choices, every frame in English and Spanish, escaping of data from the web (titles, links),
// https-only links with rel=noopener, the past-12-months captions, the year ahead (lanes, "not published yet", Start now /
// Start by, Prepare now against the day it is), the stale line, and the door from Make the Case.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,500));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const TOK='r1.AbCdEfGhIjKl.lx2abc.'+'A'.repeat(32);
const REG=conf=>({name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf,role:'pastor',synced:true,tok:TOK});
const served=p=>{ const f=path.join(ROOT,'conferences',p); return fs.existsSync(f)?fs.readFileSync(f,'utf8'):null; };
const resp=(status,body)=>({ok:status>=200&&status<300,status,text:async()=>body,json:async()=>JSON.parse(body)});
/* o.reg: a conference name, or false for no registration; o.lang; o.hash; o.now (the device's date); o.saved (terrain-compare);
   o.tamper(path, json) may change a served file (the escaping checks) */
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const net=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/'+(o.hash||''),pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(o.now){ const RD=w.Date, FIX=+new RD(o.now+'T15:00:00'); class FD extends RD{ constructor(...a){ super(...(a.length?a:[FIX])); } static now(){ return FIX; } } w.Date=FD; }
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      if(o.reg!==false) w.localStorage.setItem('terrain-reg',JSON.stringify(REG(o.reg||'Pennsylvania')));
      if(o.saved) w.localStorage.setItem('terrain-compare',JSON.stringify(o.saved));
      w.fetch=async(u,opt)=>{ u=String(u); net.push(u);
        if(/functions\/census\?check=1/.test(u)) return resp(200,JSON.stringify({required:false,ok:true,register:true,regRequired:true,regOk:true}));
        if(/functions\/register/.test(u)) return resp(503,'{"ok":false}');
        if(/advise/.test(u)) return resp(200,'{"enabled":false}');
        const m=/^\/conferences\/([a-z/.-]+\.json)(\?v=[0-9a-f]+)?$/.exec(u);
        if(m){ let t=served(m[1]); if(t==null) return resp(404,'{}'); if(o.tamper){ const j=o.tamper(m[1],JSON.parse(t)); if(j) t=JSON.stringify(j); } return resp(200,t); }
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,D:w.document,net,errs,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],
    txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
async function ready(P){ await until(()=>P.E('ACCESS_CHECKED')); await sleep(60); }
async function openCmp(P){ await ready(P); P.E("openTool('compare')"); await until(()=>P.q('#cmp-ya .cmp-tl')&&P.q('#cmp-saidg .cmp-box')&&P.q('#cmp-sources li b')); await sleep(30); }
const BAD=/\bAI\b|\bIA\b/;
const readable=el=>{ if(!el) return ''; const b=el.cloneNode(true); b.querySelectorAll('script,style').forEach(e=>e.remove()); const out=[b.textContent];
  b.querySelectorAll('[title],[aria-label]').forEach(e=>['title','aria-label'].forEach(a=>{ const v=e.getAttribute(a); if(v) out.push(v); })); return out.join(' '); };

(async()=>{ try{
  const idx=JSON.parse(served('index.json')||'null');
  console.log('\n-- the hub tile --');
  { const P=page(); await ready(P);
    const t=P.q('.hub .tool[data-tool="compare"]');
    c('a fifth tile, "Learn from other conferences"', t?t.querySelector('b').textContent:null, 'Learn from other conferences');
    // v10.57.1 (stale): the pastor, "underneath … there are resources available … for your church and find resources"
    c('…with one short line and its link', t?[t.querySelector('.td').textContent,t.querySelector('.tgo').textContent.trim()]:null, ['Ideas and resources from other conferences, for your church.','Find resources']);
    c('…its own icon, ink and glow', !!(t&&t.querySelector('svg.tsvg')&&t.querySelector('#ink-compare')&&t.querySelector('#glow-compare')));
    // v10.51.1 — the pastor: "learn from other conferences should be kind of similar to the other icons … the same format as the others
    // … maybe we can add one more later and have six": no full row of its own; three across on a computer (a sixth spot left open)
    c('v10.51.1: a tile like the others (no full row of its own); three across on a computer', [!!t&&t.classList.contains('tool-wide'),!!(t&&t.querySelector('.twt')),/@media \(min-width:760px\)\{ \.hub \.tools\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\} \}/.test(html),/tool-wide/.test(html)], [false,false,true,false]);
    c('it is a standalone tool behind the same entitlement as the others', P.J("[TOOLS.compare&&TOOLS.compare.standalone,TOOLS.compare&&TOOLS.compare.panel,FEATURES.compare&&FEATURES.compare.tier]"), [true,'cmp','full']);
    c('nothing is fetched until it opens', P.net.filter(u=>/conferences\//.test(u)), []);
    c('no boot errors', P.errs, []);
  }
  { const P=page({lang:'es'}); await ready(P);
    const t=P.q('.hub .tool[data-tool="compare"]');
    // v10.57.1 (stale): the pastor, "underneath … there are resources available … for your church and find resources"
    c('Spanish tile', t?[t.querySelector('b').textContent,t.querySelector('.td').textContent,t.querySelector('.tgo').textContent.trim()]:null, ['Aprender de otras asociaciones','Ideas y recursos de otras asociaciones, para su iglesia.','Buscar recursos']);
  }

  console.log('\n-- registered pastors only --');
  { const P=page({reg:false}); await ready(P);
    c('without a registration the first page is shown and the hub is not', [P.E('gated()'),P.q('#hub').hidden], [true,true]);
    P.E("openTool('compare')"); await sleep(200);
    c('opening the tool over the gate shows nothing and fetches nothing', [P.q('#cmp').hidden, P.net.filter(u=>/conferences\//.test(u)).length], [true,0]);
  }
  { const P=page({hash:'#watch'}); await ready(P);
    P.E("try{ cmpOpen(); }catch(e){}"); await sleep(150);
    c('a member\'s page never opens it', [P.q('#cmp').hidden, P.net.filter(u=>/conferences\//.test(u)).length], [true,0]);
  }

  console.log('\n-- loading, defaults, English --');
  const P=page({now:'2026-10-01'}); await openCmp(P);
  const reqs=P.net.filter(u=>/conferences\//.test(u));
  c('index.json first', reqs[0], '/conferences/index.json');
  c('then the year ahead above the conference, the chosen five and (v10.58.0) the resources, each with the data\'s version', reqs.slice(1).map(u=>u.replace(/\?v=.*/,'')).sort(),
    ['/conferences/ahead.json','/conferences/c/arkansas-louisiana.json','/conferences/c/central-california.json','/conferences/c/nevada-utah.json','/conferences/c/ohio.json','/conferences/c/pennsylvania.json','/conferences/resources.json']);
  // v10.58.0 (stale): the pastor, "put all the different resources and grants … into one concentrated area … at the bottom of the compare
  // conferences page": resources.json is asked for too (Resources for your church; Ministries that come to your church)
  c('…and nothing else', reqs.length, 8);
  c('every later file asks for this version', reqs.slice(1).every(u=>u.endsWith('?v='+idx.v)));
  c('the tool bar names it', P.txt('#toolname'), 'Learn from other conferences');
  c('his conference is the one he registered with', P.J('CMP.st.mine'), 'pennsylvania');
  c('compared with the suggested set (the approved sample\'s own, on the past 12 months)', P.J('CMP.st.others'), ['ohio','arkansas-louisiana','nevada-utah','central-california']);
  c('the chips: his first, marked "yours"', P.qa('.cmp-chip').map(x=>x.querySelector('span').textContent), ['Pennsylvania','Ohio','Arkansas-Louisiana','Nevada-Utah','Central California']);
  c('the reasons are said', /Ohio \(same union\)/.test(P.txt('#cmp-why'))&&/Central California \(strong in evangelism & outreach\)/.test(P.txt('#cmp-why')));
  c('checked, updated monthly: never "live"', P.txt('#cmp-checked'), 'Checked 1 Oct 2026 · updated monthly');
  const all=readable(P.q('#cmp'));
  // Terrain's own words (event titles and researchers' notes are shown as published, and one says a calendar is "live")
  const own=P.J("Object.values(CMP_UI).map(v=>v.en+' | '+v.es).join(' || ')");
  c('the page never claims to read calendars live or automatically (its own words, EN and ES)', /\blive\b|automatic|real[- ]time|re-reads|en vivo|autom[aá]tic|tiempo real/i.test(own), false);
  c('no stale line on the check day', !!P.q('.cmp-stale'), false);
  const titles=P.qa('#cmp .cmp-step h3').map(h=>h.textContent);
  // v10.63.0 (stale): the pastor, "there should be like a graph maybe a circular graph … like a brief for the conference … a section where it
  // compares your mission statement and what the calendar is actually saying": the brief and Mission and calendar come second and third
  c('every frame, in order', titles, ['Choose','Your conference in brief','Mission and calendar','At a glance','The year ahead','Where the calendar\'s energy goes','Ministry by ministry','By part of the country','Evangelism and pastoral care','Young people','Size and growth','What we could learn','Strengths and room to grow','What they say, what the calendar shows','Month by month','Resources for your church','Ministries that come to your church','How to read this']);
  // v10.58.0 (stale): 14 Resources for your church, 15 Ministries that come to your church, at the foot of the page
  c('numbered 1 to 17, colour on every frame', [P.qa('#cmp .cmp-num').map(n=>n.textContent).join(','), P.qa('#cmp .cmp-step').every(s=>/--k:var\(--/.test(s.getAttribute('style')||''))], ['1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17', true]);
  c('five cards at a glance, in his order', P.qa('.cmp-card h4').map(h=>h.childNodes[0].textContent.trim()), ['Pennsylvania','Ohio','Arkansas-Louisiana','Nevada-Utah','Central California']);
  const pa=idx.conferences.find(x=>x.slug==='pennsylvania');
  c('the badge counts the past year only', P.txt('.cmp-card.mine .cmp-badge'), `Partial calendar · grade B · ${pa.counts.ministryEvents} events in the past year`);
  c('his character line', P.txt('.cmp-card.mine .char'), 'Leans toward Pathfinders & children and family, women & men');
  c('captions say the past 12 months', /past 12 months/.test(P.txt('#cmp-balance .cmp-sh'))&&/past 12 months/.test(P.txt('#cmp-heat .cmp-sh')));
  c('rows keep his order in every chart, never sorted by value', P.qa('#cmp-ch-e1k svg text[text-anchor="end"]').map(t=>t.textContent.replace(/^● /,'')).slice(0,5), ['Pennsylvania','Ohio','Arkansas-Louisiana','Nevada-Utah','Central California']);
  c('the joining caution is always visible beside the chart', !!P.q('#cmp-size .cmp-warn')&&!P.q('#cmp-size .cmp-warn').closest('details')&&/do not show that one caused the other/.test(P.txt('#cmp-size .cmp-warn')));
  c('no ranks, no "best" or "worst" (its own words)', /\b(rank|ranked|best|worst|top \d|league|mejor|peor|clasificaci)\b/i.test(own), false);
  c('it never calls a calendar weak, failing or behind (its own words)', /\b(weak|failing|behind|débil|atrasad)/i.test(own), false);
  c('the heat table has a typical column', P.qa('#cmp-heatg .col').map(x=>x.textContent).slice(-1)[0], 'Typical');
  c('month by month: 24 months a row, Today after the twelfth', [P.qa('#cmp-monthsg .ml').length, P.qa('#cmp-monthsg .m').length, P.qa('#cmp-monthsg .mh.tdl').length], [5,120,1]);
  c('what we could learn names the stronger calendar and its own events with sources', P.qa('#cmp-learng .cmp-lcard').length>0 && P.qa('#cmp-learng .ev a').every(a=>/^https:\/\//.test(a.getAttribute('href'))));
  c('said vs shown: OneVoice27 is on the calendar', /OneVoice27 in the Pennsylvania Conference/.test(P.txt('#cmp-saidg'))&&/On the calendar/.test(P.txt('#cmp-saidg .cmp-box')));
  c('sources name the statistics and the calendar links', /Annual Statistical Report|ASR/.test(P.txt('#cmp-sources'))&&P.qa('#cmp-sources a').length>5);
  c('footer: checked · updated monthly', /checked 1 Oct 2026 · updated monthly/.test(P.txt('.cmp-foot')));
  c('no "AI" anywhere on the page', BAD.test(all), false);
  // v10.58.0: a ministry's own email and phone ("it will show their contact and how to get a hold of them") are mailto: and tel:, in its
  // contact line only, a checked address and digits only; every other link is https, in a new tab
  const webLinks=P.qa('#cmp a[href]').filter(a=>!a.closest('.cmp-contact'));
  c('every link is https, opens a new tab with rel=noopener', webLinks.every(a=>/^https:\/\//.test(a.getAttribute('href'))&&a.getAttribute('rel')==='noopener'&&a.getAttribute('target')==='_blank'));
  c('…a ministry\'s contact line holds only mailto: (a checked address) and tel: (digits) links', P.qa('#cmp .cmp-contact a').length>0&&P.qa('#cmp .cmp-contact a').every(a=>/^mailto:[^\s@<>"?#&=%\/]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(a.getAttribute('href'))||/^tel:\+?[0-9]{7,15}(,[0-9]{1,6})?$/.test(a.getAttribute('href'))));

  console.log('\n-- the year ahead --');
  c('the sub-line names the year ahead', P.txt('#cmp-ahead .cmp-sh .note'), 'Oct 2026 to Sep 2027: what’s coming, so you can prepare in time.');
  c('his conference first, a button each', P.qa('#cmp-ya .cmp-seg button').map(b=>b.textContent), ['Yours: PA','Ohio','Ark-La','NUC','CCC']);
  c('published to Dec 2026, with the reason', P.txt('.cmp-yasum'), 'Pennsylvania: calendar published to Dec 2026. The 2026 calendar ends in December; 2027 dates come from the camp-meeting and OneVoice27 pages.');
  c('five lanes', P.qa('#cmp-ya .tl-h div').slice(1).map(x=>x.textContent), ['Your conference','Your union','North American Division','World church','Deadlines']);
  c('12 months', P.qa('#cmp-ya .tl-r').length, 12);
  const nyp=P.qa('#cmp-ya .tl-r').map(r=>!!r.querySelector('.tl-c.nyp'));
  c('Jan – Sep 2027 are "not published yet" (hatched)', nyp, [false,false,false,true,true,true,true,true,true,true,true,true]);
  c('…and say so', P.qa('#cmp-ya .nyp-l').map(x=>x.textContent).every(t=>t==='not published yet'));
  // the NAD's "All Things New phase 3" (April 2027) comes first, then the September 2027 series: each "Start now", earliest first
  c('Prepare now opens with what needs a start now', P.qa('#cmp-prep .pi .cmp-hint')[0]&&P.qa('#cmp-prep .pi .cmp-hint')[0].textContent, 'Start now');
  c('…and Pennsylvania\'s OneVoice27 series is among them', P.qa('#cmp-prep .pi').concat(P.qa('#cmp-prep details .pi')).some(x=>/OneVoice27 evangelistic series/.test(x.textContent)&&/Start now/.test(x.textContent)));
  c('a deadline within three months is there (15 Oct)', /Apply by 15 Oct 2026/.test(P.txt('#cmp-prep')));
  c('Start now carries the planner\'s reason', /12 to 18 months/.test(P.q('#cmp-prep .cmp-hint.now').getAttribute('title')));
  c('the note says checked monthly, never live', P.qa('#cmp-ya > .note').map(n=>n.textContent).join(' '), 'Conferences publish their calendars at different times; these are checked again every month.');
  c('hint words: Start by a month ahead, Start now once it has passed', P.J("[cmpHintText({k:'start-by',by:'2026-12'},'2026-10'),cmpHintText({k:'start-by',by:'2026-09'},'2026-10'),cmpHintText({k:'start-now',by:'2026-09'},'2026-10')]"), ['Start by Dec 2026','Start now','Start now']);
  c('registration hints', P.J("[cmpHintText({k:'register',d:'2027-03-01'},'2026-10'),cmpHintText({k:'apply',d:'2026-10',p:'m'},'2026-10'),cmpHintText({k:'opens',d:'2026-10-01',from:'lodging links open'},'2026-10')]"), ['Register by 1 Mar 2027','Apply by Oct 2026','Booking opens 1 Oct 2026']);
  P.E("document.querySelector('#cmp-ya [data-cmp-ahead=\"central-california\"]').click()");
  c('another conference\'s year ahead, one at a time', [P.J('CMP.st.ahead'), /^Central California:/.test(P.txt('.cmp-yasum')), P.qa('#cmp-ya .tl-h div')[1].textContent], ['central-california',true,'Central California']);

  console.log('\n-- his choices --');
  P.E("document.querySelector('[data-cmp-rm=\"nevada-utah\"]').click()"); await sleep(30);
  c('a chip removed', P.J('CMP.st.others'), ['ohio','arkansas-louisiana','central-california']);
  /* v10.51.1 — the pastor (6 Oct 2026): "Can the drop-down look better … the east Midwest South West East Coast, California regional
     conferences … as headings … more across and not just straight down … you can click multiple ones so you don't have to … click one
     and then find it again and open it … up to nine … when you['re] done, it will close everything". "Add conferences" opens a panel:
     the areas across its top, the conferences in rows under each area's heading, tap several (each a tick), Done closes it and the
     comparison follows. (Was: one long <select>, one conference at a time.) */
  c('v10.51.1: no long list; "Add conferences" (closed) and the suggested set', [P.qa('#cmp-add').length,P.txt('#cmp-addbtn'),P.q('#cmp-addbtn').getAttribute('aria-expanded'),P.qa('#cmp-addp').length,!!P.q('#cmp-suggest')], [0,'Add conferences','false',0,true]);
  P.q('#cmp-addbtn').click(); await sleep(20);
  c('…open: the areas across the top, inside the panel', [P.q('#cmp-addbtn').getAttribute('aria-expanded'),P.qa('#cmp-addp [data-cmp-region]').map(b=>b.textContent)], ['true',['All','East','Midwest','South','West','East Coast','California','Regional conferences']]);
  c('…All: a heading for each part of the country, the conferences in rows under it (all 49 but yours)', [P.qa('#cmp-addp .cmp-grp h5').map(h=>h.textContent),P.qa('#cmp-addp [data-cmp-pick]').length,P.qa('#cmp-addp [data-cmp-pick="pennsylvania"]').length], [['East','Midwest','South','West'],49,0]);
  c('…the chosen ones ticked', P.qa('#cmp-addp [data-cmp-pick][aria-pressed="true"]').map(b=>b.dataset.cmpPick).sort(), ['arkansas-louisiana','central-california','ohio']);
  P.q('#cmp-addp [data-cmp-pick="potomac"]').click(); await sleep(10);
  P.q('#cmp-addp [data-cmp-pick="chesapeake"]').click(); await sleep(10);
  c('tap several, one after another: each ticked, the panel stays open, the chips follow', [P.J('CMP.st.others'),!!P.q('#cmp-addp'),P.qa('#cmp-addp [data-cmp-pick][aria-pressed="true"]').length,P.qa('.cmp-chip').length,P.txt('#cmp-addp .cmp-cnt')],
    [['ohio','arkansas-louisiana','central-california','potomac','chesapeake'],true,5,6,'5 of 9 chosen']);
  P.q('#cmp-addp [data-cmp-pick="chesapeake"]').click(); await sleep(10);
  c('…tap a ticked one again: it comes off', P.J('CMP.st.others'), ['ohio','arkansas-louisiana','central-california','potomac']);
  P.q('#cmp-addp [data-cmp-done]').click();
  await until(()=>P.J('!!CMP.det.potomac')); await sleep(30);
  c('Done: the panel closes, and the comparison has them (the file fetched once)', [P.qa('#cmp-addp').length,P.q('#cmp-addbtn').getAttribute('aria-expanded'),P.qa('#cmp-cards .cmp-card h4').some(h=>/Potomac/.test(h.textContent)),P.net.filter(u=>/c\/potomac\.json/.test(u)).length], [0,'false',true,1]);
  c('kept on this device, under his registration', P.J("JSON.parse(localStorage.getItem('terrain-compare'))"), {reg:'pennsylvania',mine:'pennsylvania',others:['ohio','arkansas-louisiana','central-california','potomac']});
  P.q('#cmp-addbtn').click(); await sleep(10);
  P.E("document.querySelector('#cmp-addp [data-cmp-region=\"California\"]').click()");
  c('the area buttons narrow the panel to one heading (California: the four with territory there and Nevada-Utah)', [P.qa('#cmp-addp .cmp-grp h5').map(h=>h.textContent),P.qa('#cmp-addp [data-cmp-pick]').map(b=>b.dataset.cmpPick).sort()],
    [['California'],['central-california','nevada-utah','northern-california','southeastern-california','southern-california']]);
  c('…thin calendars marked ◌, and the mark explained once', [P.qa('#cmp-addp [data-cmp-pick] .thin').length>0,/◌ thin calendar/.test(P.txt('#cmp-addp .cmp-addf'))], [true,true]);
  P.E("(()=>{ CMP.st.others=['alaska','arizona','carolina','dakota','florida','hawaii','idaho','illinois','indiana']; cmpPicker(); })()"); await sleep(30);
  c('up to 9 besides his own: at nine the others cannot be ticked, and it says so', [P.qa('.cmp-chip').length,P.qa('#cmp-addp [data-cmp-pick]:not([aria-pressed="true"])').every(b=>b.disabled),P.txt('#cmp-addp .cmp-cnt')], [10,true,'9 of 9 chosen: the most at once']);
  P.q('#cmp-addp [data-cmp-done]').click(); await sleep(30);
  await until(()=>P.J("['hawaii','alaska'].every(s=>!!CMP.det[s])")); await sleep(50);
  c('a thin calendar is marked ◌ and the note shows', /Hawaii ◌/.test(P.q('#cmp-ch-balance svg').textContent)&&!P.q('.cmp-thin').hidden);
  c('a thin calendar is never the stronger one in what we could learn', P.qa('#cmp-learng .who').every(x=>!/Hawaii/.test(x.textContent)));
  P.E("(()=>{ const s=document.getElementById('cmp-mine'); s.value='ohio'; s.dispatchEvent(new Event('change')); })()"); await sleep(30);
  c('changing his conference puts it first and the year ahead on it', [P.J('CMP.st.mine'),P.J('CMP.st.ahead'),P.qa('.cmp-chip')[0].querySelector('span').textContent], ['ohio','ohio','Ohio']);
  { const Q=page({saved:{reg:'pennsylvania',mine:'potomac',others:['ohio','texico']}}); await openCmp(Q);
    c('his kept choice comes back', [Q.J('CMP.st.mine'),Q.J('CMP.st.others')], ['potomac',['ohio','texico']]); }
  { const Q=page({reg:'Ohio',saved:{reg:'pennsylvania',mine:'potomac',others:['texico']}}); await openCmp(Q);
    c('registered with another conference: that one, with its own suggestions', [Q.J('CMP.st.mine'),Q.J('CMP.st.others').length], ['ohio',4]); }
  { const Q=page({reg:'Bermuda'}); await ready(Q); Q.E("openTool('compare')"); await until(()=>Q.q('#cmp-mine')); await sleep(30);
    c('a conference outside the 50: asked to choose, nothing else drawn', [Q.J('CMP.st.mine'), /Bermuda, which is not in this comparison/.test(Q.txt('#cmp-pick')), Q.qa('#cmp .cmp-step').length], [null,true,3]);   // v10.58.0: and the resources of the NAD and the world church, and the ministries
    Q.E("(()=>{ const s=document.getElementById('cmp-mine'); s.value='florida'; s.dispatchEvent(new Event('change')); })()");
    await until(()=>Q.q('#cmp-ya .cmp-tl')); c('choosing one draws every frame with its suggested set', [Q.qa('#cmp .cmp-step').length, Q.J('CMP.st.others').length], [18,4]); }   // v10.58.0: two frames more; v10.63.0 (stale): two more, the brief and Mission and calendar

  console.log('\n-- Spanish --');
  { const S=page({lang:'es',now:'2026-10-01'}); await openCmp(S);
    c('tool bar in Spanish', S.txt('#toolname'), 'Aprender de otras asociaciones');
    S.q('#cmp-addbtn').click();   // v10.51.1: the panel in Spanish
    c('v10.51.1: "Añadir asociaciones", its headings, the count and Listo', [S.txt('#cmp-addbtn'),S.qa('#cmp-addp .cmp-grp h5').map(h=>h.textContent),S.txt('#cmp-addp .cmp-cnt'),S.txt('#cmp-addp [data-cmp-done]')],
      ['Añadir asociaciones',['Este','Medio Oeste','Sur','Oeste'],'4 de 9 elegidas','Listo']);
    S.q('#cmp-addp [data-cmp-done]').click();
    // v10.63.0 (stale): the brief and Mission and calendar, second and third
    c('every frame in Spanish', S.qa('#cmp .cmp-step h3').map(h=>h.textContent), ['Elija','Su asociación en resumen','Misión y calendario','De un vistazo','El año que viene','Hacia dónde va la energía del calendario','Ministerio por ministerio','Por región del país','Evangelismo y cuidado pastoral','Niños y jóvenes','Tamaño y crecimiento','Lo que podríamos aprender','Fortalezas y espacio para crecer','Lo que dicen y lo que muestra el calendario','Mes a mes','Recursos para su iglesia','Ministerios que visitan su iglesia','Cómo leer esto']);
    c('revisado · se actualiza cada mes', S.txt('#cmp-checked'), 'Revisado el 1 oct 2026 · se actualiza cada mes');
    c('the year ahead in Spanish', [S.txt('#cmp-ahead .cmp-sh .note'), S.qa('#cmp-ya .tl-h div').slice(1).map(x=>x.textContent)], ['De oct 2026 a sep 2027: lo que viene, para prepararse a tiempo.',['Su asociación','Su unión','División Norteamericana','Iglesia mundial','Fechas límite']]);
    c('Empiece ya, and the published-to reason in Spanish', [S.q('#cmp-prep .cmp-hint.now').textContent, S.txt('.cmp-yasum')], ['Empiece ya','Pennsylvania: calendario publicado hasta dic 2026. El calendario de 2026 termina en diciembre; las fechas de 2027 vienen de las páginas del campestre y de OneVoice27.']);
    c('aún no publicado', S.qa('#cmp-ya .nyp-l')[0].textContent, 'aún no publicado');
    c('Spanish hints', S.J("[cmpHintText({k:'start-by',by:'2026-12'},'2026-10'),cmpHintText({k:'register',d:'2027-03-01'},'2026-10')]"), ['Empiece a más tardar en dic 2026','Inscripción: hasta 1 mar 2027']);
    c('the character line and the badge', [S.txt('.cmp-card.mine .char'), S.txt('.cmp-card.mine .cmp-badge')], ['Se inclina hacia: Conquistadores y niños; familia, damas y caballeros',`Calendario parcial · nota B · ${pa.counts.ministryEvents} eventos en el último año`]);
    c('the joining caution in Spanish', /no muestran que uno causó el otro/.test(S.txt('#cmp-size .cmp-warn')));
    c('event titles stay as published', /OneVoice27/.test(S.txt('#cmp-ya')));
    const es=readable(S.q('#cmp'));
    c('no English frame words left on the Spanish page', /\b(Choose|At a glance|The year ahead|Prepare now|Your conference|not published yet|Start now|Typical|How to read this|Sources|events in the past year)\b/.test(es.replace(/<[^>]*>/g,'')), false);
    c('no "IA" or "AI"', BAD.test(es), false);
    c('every word the page writes has English and Spanish', S.J("Object.entries(CMP_UI).filter(([k,v])=>!(v&&typeof v.en==='string'&&typeof v.es==='string'&&(v.es||k==='inEnglish')&&(v.en||k==='inEnglish'))).map(([k])=>k)"), []);
  }

  console.log('\n-- data from the web is escaped; only https links --');
  { const T=page({tamper:(p,j)=>{
      if(p==='c/potomac.json'){ j.examples.pastoral=[{title:'<img src=x onerror="window.__x=1">Leaders',start:'2026-05-01',end:null,place:'<script>window.__x=2</script>',url:'javascript:window.__x=3'}];
        j.initiatives=[{name:'<b onclick="window.__x=4">LEAD</b>',firstDate:null,source:{url:'http://example.org/x',publisher:'<i>p</i>'},status:'on-calendar',matchCount:1,match:{title:'"><svg onload=window.__x=5>',start:'2026-05-01',url:'https://example.org/" onmouseover="window.__x=6'},lenses:['pastoral'],lensCount:5}];
        j.calendarUrls=['javascript:window.__x=7','https://ok.example.org/cal'];
        j.ahead.conf=[{t:'<img src=y onerror="window.__x=8">',s:'2026-11-03',m:'2026-11',u:'data:text/html,<script>x</script>'}]; j.ahead.through='2027-09'; return j; }
      if(p==='index.json'){ const q=j.conferences.find(x=>x.slug==='potomac'); q.name='Potomac <em>x</em>'; q.perMembers.eventsPer1000MembersPerYear='<img src=z onerror="window.__x=9">'; return j; }
      return null; },saved:{reg:'pennsylvania',mine:'pennsylvania',others:['potomac']}});
    await openCmp(T);
    T.E("document.querySelector('#cmp-ya [data-cmp-ahead=\"potomac\"]').click()");
    const cmp=T.q('#cmp');
    c('no element made from the data (img, script, svg onload, b, i, em; the page\'s own <i> dots are empty)', [cmp.querySelectorAll('img,script,b[onclick],i:not(:empty),em').length, [...cmp.querySelectorAll('svg')].some(s=>s.getAttribute('onload'))], [0,false]);
    c('no handler attribute anywhere in the page', [...cmp.querySelectorAll('*')].some(e=>[...e.attributes].some(a=>/^on/i.test(a.name))), false);
    c('nothing ran', T.E('window.__x===undefined'));
    c('the words are shown as words', /<img src=x onerror="window.__x=1">Leaders/.test(cmp.textContent)&&/Potomac <em>x<\/em>/.test(cmp.textContent));
    // v10.58.0: a ministry's mailto: and tel: (its contact line) are checked above; nothing else but https
    c('no javascript:, data: or http: link', [...cmp.querySelectorAll('a[href]')].filter(a=>!a.closest('.cmp-contact')).map(a=>a.getAttribute('href')).filter(h=>!/^https:\/\//.test(h)), []);
    c('a quote cannot leave its attribute', [...cmp.querySelectorAll('a[href]')].every(a=>!a.hasAttribute('onmouseover')));
    c('the https calendar link still shows', [...cmp.querySelectorAll('#cmp-sources a')].some(a=>a.getAttribute('href')==='https://ok.example.org/cal'));
  }

  console.log('\n-- the day it is: Prepare now and the stale line --');
  { const L=page({now:'2026-10-20'}); await openCmp(L);
    c('a deadline already passed leaves Prepare now (15 Oct, seen on 20 Oct)', /Apply by 15 Oct 2026/.test(L.txt('#cmp-prep')), false);
    c('…a later one stays (26 Oct)', /26 Oct 2026/.test(L.txt('#cmp-prep')));
    c('no stale line within the month', !!L.q('.cmp-stale'), false); }
  { const L=page({now:'2026-12-01'}); await openCmp(L);
    c('two months after the check date, a quiet line says calendars may have changed', L.txt('.cmp-stale'), 'Some calendars may have changed since 1 Oct 2026.'); }

  console.log('\n-- v10.44 review: the suggested set\'s words, and no "IA" for Iowa-Missouri --');
  { const X=page({reg:'Texico',lang:'es'}); await openCmp(X);
    c('Texico, ES: Indiana is "otra región del país" (a Midwest-South pick), never "el otro lado del país"', [/Indiana \(otra región del país\)/.test(X.txt('#cmp-why')), /el otro lado del país/.test(X.txt('#cmp-why'))], [true,false]);
    const Y=page({reg:'Texico'}); await openCmp(Y);
    c('…EN: "another part of the country"', /Indiana \(another part of the country\)/.test(Y.txt('#cmp-why')));
    const Z=page({reg:'Pennsylvania'}); await openCmp(Z);
    c('Pennsylvania keeps Nevada-Utah, "other side of the country" (East-West)', /Nevada-Utah \(other side of the country\)/.test(Z.txt('#cmp-why'))); }
  for(const lang of ['en','es']){ const I=page({reg:'Iowa-Missouri',lang}); await openCmp(I);
    c('Iowa-Missouri, '+lang.toUpperCase()+': no "AI" or "IA" anywhere on the page', BAD.test(readable(I.q('#cmp'))), false); }

  console.log('\n-- the door from Make the Case (the conference proposal) --');
  { const M=page(); await ready(M);
    M.E("openTool('case')"); await sleep(50);
    const has=g=>M.E(`(()=>{ caseSetPrefs({group:${JSON.stringify(g)},type:${JSON.stringify(g==='conference'?'conference':'board')},ministry:null});
      let h=document.getElementById('cs-s2'); if(!h){ h=document.createElement('div'); h.id='cs-s2'; document.body.appendChild(h); }
      try{ caseDraw2(); }catch(e){} return !!document.querySelector('#cs-s2 [data-cs-cmp]'); })()`);
    c('conference leaders: "Ideas from other conferences"', has('conference'));
    c('…not for the church board', has('board'), false);
    M.E(`(()=>{ caseSetPrefs({group:'conference',type:'conference',ministry:null}); try{ caseDraw2(); }catch(e){} })()`);
    const b=M.q('#cs-s2 [data-cs-cmp]');
    c('its words, EN', b?b.textContent:null, 'Ideas from other conferences →');
    if(b) b.click(); await until(()=>M.E("TOOL==='compare'"));
    c('it opens Learn from other conferences', [M.E('TOOL'), M.q('#cmp').hidden], ['compare',false]);
  }
}catch(e){ console.log('  FAIL  threw: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
