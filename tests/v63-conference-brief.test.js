// v10.63.0 · Learn from other conferences: the brief (a circle chart beside a few sentences) and Mission and calendar.
// The pastor (9 Oct 2026): "when you put in your conference where it says Pennsylvania right there should be like a graph maybe a circular
// graph if possible to show you know where the conference is strong where it needs help … like a brief for the conference … mission
// statements also need to be seen and collected from each conference because then you can come also come have a section where it compares
// your mission statement and what the calendar is actually saying to see if either the mission statement needs to or the calendar needs
// to change". The page reads conferences/index.json as served; the missions here are put in by the test (made-up words), so the checks
// hold whatever the research found. Written failing-first on v10.62.2.
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


const MIS_PA={t:'To make disciples of Jesus and to share the everlasting gospel with every community.',u:'https://paconference.example/about',
  a:[{l:'evangelism',w:'share the everlasting gospel'},{l:'discipleship',w:'make disciples'}]};
const withMissions=(f,j,extra)=>{ if(f!=='index.json') return null; j.missionChecked='2026-10-09';
  j.conferences.forEach(c=>{ c.mission=c.slug==='pennsylvania'?MIS_PA:null; }); if(extra) extra(j); return j; };
(async()=>{ try{
  const idx=JSON.parse(served('index.json')||'null'), PA=idx.conferences.find(c=>c.slug==='pennsylvania'), base=idx.baseline.lens;
  console.log('\n-- the frames: the brief second, Mission and calendar third, the rest after --');
  { const P=page({tamper:withMissions,saved:{reg:'pennsylvania',mine:'pennsylvania',others:['ohio','nevada-utah']}}); await openCmp(P);
    c('numbered 1 to 17 with no gap; the brief is 2, Mission and calendar 3, At a glance 4, the resources 16 and 17',
      [P.qa('#cmp .cmp-num').map(n=>n.textContent).join(','),P.txt('#cmp-brief .cmp-num'),P.txt('#cmp-mission .cmp-num'),P.txt('#cmp-glance .cmp-num'),P.txt('#cmp-res .cmp-num'),P.txt('#cmp-min .cmp-num')],
      ['1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17','2','3','4','16','17']);
    c('their titles', [P.txt('#cmp-brief h3'),P.txt('#cmp-mission h3')], ['Your conference in brief','Mission and calendar']);

    console.log('\n-- the circle chart: eight areas, each as far out as its share against the typical conference --');
    const dots=P.qa('#cmp-brief .cmp-radar-svg circle.cmp-rd'), st=dots.map(d=>d.getAttribute('class').replace('cmp-rd cmp-rd-',''));
    c('eight areas round the ring, in the comparison\'s own order, each named', [dots.length,P.qa('#cmp-brief .cmp-rl').map(t=>t.textContent).join(',')],
      [8,'Evangelism,Pastors,Discipleship,Family,Youth,Pathfinders,Health,Schools']);
    c('Pennsylvania: evangelism less than most, health none published, family and Pathfinders more than most, the rest as most', st.join(','), 'less,typ,typ,more,typ,more,none,typ');
    c('the typical conference as a dashed ring; a key; how to read it', [!!P.q('#cmp-brief .cmp-rtyp'),P.qa('#cmp-brief .cmp-rk').map(k=>k.textContent).join(' | '),/twice as much or more/.test(P.txt('#cmp-brief .cmp-rhow'))],
      [true,'More than most | About as most | Less than most | None published | Dashed ring: the typical conference',true]);
    const lab=P.q('#cmp-brief .cmp-radar-svg').getAttribute('aria-label');
    c('a screen reader hears what it shows', [/More than most: Family, women & men, Pathfinders & children/.test(lab),/Less than most: Evangelism & outreach/.test(lab),/None published: Health & community service/.test(lab)], [true,true,true]);
    c('an area\'s place: Pathfinders (34% against 20.6%) beyond the dashed ring; health at the centre', P.E(`(()=>{ const sv=document.querySelector('#cmp-brief .cmp-radar-svg'), d=[...sv.querySelectorAll('circle.cmp-rd')], dist=e=>Math.hypot(+e.getAttribute('cx')-175,+e.getAttribute('cy')-131); return [dist(d[5])>43,dist(d[6])<0.5,Math.abs(dist(d[1])-43*${PA.lenses.pastoral.share}/${base.pastoral})<0.2]; })()`), [true,true,true]);

    console.log('\n-- the brief: a few sentences, from the data --');
    const lines=P.qa('#cmp-brief .cmp-btext p').map(p=>p.textContent);
    c('who: under its name, its members and congregations, its union (the name said once)', [P.txt('#cmp-brief .cmp-btext h4'),lines[0]], ['The Pennsylvania Conference',`${PA.official.members.toLocaleString('en-US')} members in ${PA.official.congregations} congregations (${idx.stats.year}), in the Columbia Union.`]);
    c('its calendar: how many ministry events, and how full the picture is', lines[1], `Over the past 12 months its published calendar lists ${PA.counts.ministryEvents} ministry events (partial calendar: ${PA.calendar.monthsCovered} of 12 months).`);
    c('more than most, the largest first, with the typical share beside it', lines[2], 'It gives more room than most conferences to Pathfinders & children (34%; most: 20.6%) and family, women & men (17%; most: 11.7%).');
    c('less than most, the widest gap first; an area with none says so', lines[3], 'Less than most: evangelism & outreach (1 event, 2.1%; most: 6.3%) and health & community service (none published).');
    c('the mission: the areas it names, and how many the calendar makes room for', lines[4], 'Its mission names evangelism & outreach and prayer & discipleship; the calendar gives as much room as most conferences, or more, to 1 of them.');
    c('the year ahead', lines[5], `${PA.datesAhead} dates are published for the year ahead.`);
    c('a way down to Mission and calendar', !!P.q('#cmp-brief [data-cmp-misgo]'), true);

    console.log('\n-- Mission and calendar: each chosen conference, its mission word for word beside its calendar --');
    const boxes=P.qa('#cmp-misg .cmp-box');
    c('one box a conference, his first, marked his', [boxes.length,boxes[0].querySelector('h4').textContent.replace(/\s+/g,' ').trim()], [3,'Pennsylvania yours']);
    const q=boxes[0].querySelector('blockquote.cmp-mq');
    c('the mission quoted as published (English), with a link to its own page (a new tab)', [q.textContent,q.getAttribute('lang'),boxes[0].querySelector('a').getAttribute('href'),boxes[0].querySelector('a').getAttribute('rel')],
      ['“'+MIS_PA.t+'”','en',MIS_PA.u,'noopener']);
    const rows=[...boxes[0].querySelectorAll('.cmp-mrow')].map(r=>[r.querySelector('.cmp-mlens').textContent,r.querySelector('.cmp-rst').textContent,r.querySelector('.cmp-mw').textContent,r.querySelector('.s').textContent]);
    c('each area the mission names: its words, where the calendar stands, the count against the typical share', rows,
      [['Evangelism & outreach','Less than most','“share the everlasting gospel”','1 event, 2.1% of the calendar (most: 6.3%)'],
       ['Prayer & discipleship','About as most','“make disciples”',`4 events, 8.5% of the calendar (most: ${base.discipleship}%)`]]);
    c('a bar for each, the typical share marked on it', [boxes[0].querySelectorAll('.cmp-mbar').length,boxes[0].querySelectorAll('.cmp-mtyp').length], [2,2]);
    c('how many it makes room for, and his question when they part', [boxes[0].querySelector('.cmp-msum').textContent,boxes[0].querySelector('.cmp-mask').textContent],
      ['The calendar gives as much room as most conferences, or more, to 1 of the 2 areas its mission names.','Where they part, it is worth asking: should the calendar change, or the statement?']);
    c('what the calendar gives more room to that the mission does not name', /More than most on the calendar, though the mission does not name it: family, women & men and Pathfinders & children\./.test(boxes[0].textContent), true);
    c('a conference with none found: said plainly, never "has none"', [boxes[1].querySelector('h4').textContent,boxes[1].querySelector('.note').textContent], ['Ohio','We could not find a mission statement on Ohio’s website (checked 9 Oct 2026).']);
    c('the sources name where the missions come from', /Mission statements: each conference’s own website/.test(P.txt('#cmp-sources')), true);
    c('no "AI" anywhere in the two frames', BAD.test(readable(P.q('#cmp-brief'))+readable(P.q('#cmp-mission'))), false);
    c('no page errors', P.errs, []);
  }

  console.log('\n-- one rule for where an area stands: the chart and frame 13 agree, for all 50 conferences --');
  { const P=page({tamper:withMissions}); await openCmp(P);
    c('every "Gives more room than most to" is "More than most"; every "Room to grow" is "Less than most" or "None published"', P.J(`CMP.idx.conferences.flatMap(p=>p.strengths.filter(x=>cmpLensState(p,x.lens)!=='more').map(x=>p.slug+':'+x.lens).concat(p.roomToGrow.filter(x=>['less','none'].indexOf(cmpLensState(p,x.lens))<0).map(x=>p.slug+':'+x.lens)))`), []); }

  console.log('\n-- the words a mission names come only from the data, escaped; a link only when https --');
  { const P=page({tamper:(f,j)=>withMissions(f,j,J=>{ const p=J.conferences.find(c=>c.slug==='pennsylvania'); p.mission={t:'To <b>reach</b> every home & "town".',u:'http://plain.example/',a:[{l:'evangelism',w:'<b>reach</b>'}]}; })}); await openCmp(P);
    const b=P.q('#cmp-misg .cmp-box');
    c('markup shows as text, never as markup; a plain http link is not a link', [b.querySelector('blockquote b'),b.querySelector('blockquote').textContent,b.querySelector('a')], [null,'“To <b>reach</b> every home & "town".”',null]); }
  { const P=page({tamper:(f,j)=>withMissions(f,j,J=>{ J.conferences.find(c=>c.slug==='pennsylvania').mission={t:'To glorify God in all that we do as a family of believers.',u:MIS_PA.u,a:[]}; })}); await openCmp(P);
    c('a mission that names none of the areas: said so, nothing set beside the calendar', [P.txt('#cmp-misg .cmp-box .note'),P.qa('#cmp-brief .cmp-btext p')[4].textContent],
      ['The statement names none of these ministry areas by name, so there is nothing to set beside the calendar.','Its mission statement names none of these ministry areas by name.']); }
  { const P=page({tamper:(f,j)=>withMissions(f,j,J=>{ J.conferences.find(c=>c.slug==='pennsylvania').mission={...MIS_PA,a:[{l:'clubs',w:'every community'}]}; })}); await openCmp(P);
    const b=P.q('#cmp-misg .cmp-box');
    c('one area, given room: one sentence, no question', [b.querySelector('.cmp-msum').textContent,!!b.querySelector('.cmp-mask'),P.qa('#cmp-brief .cmp-btext p')[4].textContent],
      ['The calendar gives the one area its mission names as much room as most conferences, or more.',false,'Its mission names Pathfinders & children, and the calendar gives it as much room as most conferences, or more.']); }
  { const P=page({tamper:(f,j)=>withMissions(f,j,J=>{ J.conferences.find(c=>c.slug==='pennsylvania').mission={...MIS_PA,a:[{l:'evangelism',w:'share the everlasting gospel'},{l:'health',w:'every community'}]}; })}); await openCmp(P);
    const b=P.q('#cmp-misg .cmp-box');
    c('none of the areas given room: said plainly (never "0 of them"); an area with none published says so', [P.qa('#cmp-brief .cmp-btext p')[4].textContent,b.querySelectorAll('.cmp-mrow .s')[1].textContent],
      ['Its mission names evangelism & outreach and health & community service; the calendar gives each of them less room than most conferences.','None on the published calendar (most: 3.6%)']); }

  console.log('\n-- a thin calendar, no missions in the data, Spanish --');
  { const P=page({tamper:withMissions,saved:{reg:'pennsylvania',mine:'washington',others:[]}}); await openCmp(P);
    c('his own calendar thin: the brief says to read it as a picture of the website', /Thin calendar: read these as a picture of the website/.test(P.txt('#cmp-brief')), true); }
  { const P=page({saved:{reg:'pennsylvania',mine:'pennsylvania',others:['ohio']}, tamper:(f,j)=>{ if(f!=='index.json') return null; delete j.missionChecked; j.conferences.forEach(c=>{ delete c.mission; }); return j; }}); await openCmp(P);
    c('data without missions: no Mission and calendar frame, no mission line, still numbered with no gap', [!!P.q('#cmp-mission'),P.qa('#cmp-brief .cmp-btext p').some(p=>/mission/i.test(p.textContent)),P.qa('#cmp .cmp-num').map(n=>n.textContent).join(',')],
      [false,false,'1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16']); }
  { const P=page({lang:'es',tamper:withMissions,saved:{reg:'pennsylvania',mine:'pennsylvania',others:['ohio']}}); await openCmp(P);
    const lines=P.qa('#cmp-brief .cmp-btext p').map(p=>p.textContent);
    c('in Spanish: the titles, the brief, the chart\'s words', [P.txt('#cmp-brief h3'),P.txt('#cmp-mission h3'),P.txt('#cmp-brief .cmp-btext h4'),lines[2],P.qa('#cmp-brief .cmp-rl').map(t=>t.textContent)[5],P.qa('#cmp-brief .cmp-rk')[0].textContent],
      ['Su asociación en resumen','Misión y calendario','La Asociación Pennsylvania','Da más espacio que la mayoría de las asociaciones a Conquistadores y niños (34%; la mayoría: 20.6%) y familia, damas y caballeros (17%; la mayoría: 11.7%).','Conquistadores','Más que la mayoría']);
    c('the mission stays as published, said once to be in English', /\(en inglés, como se registró\) /.test(P.txt('#cmp-misg .cmp-box .s')), true);
    c('Ohio, none found, in Spanish', /No encontramos una declaración de misión en el sitio web de Ohio \(revisado el/.test(P.txt('#cmp-misg')), true); }
} catch(e){ console.log('  FAIL  threw: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0); })();
