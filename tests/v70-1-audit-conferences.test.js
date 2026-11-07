// v10.70.1 · the audit of 26 Oct 2026, Learn from other conferences. The pastor (26 Oct 2026): "can you do a thourogh audit of the app,
// from the operation making sure everything works and functions properly. everything is synmetrical and looks amazing". The reviewers who
// read the screenshots (~/Ministry Work/Terrain-work/v85/audit) found, in this tool: (1) the year ahead's "Last year:" dates broke across
// lines ("(16–17 / Jan)", "(11– / 13 Sep)", "(24 / Jan)", Spanish "(16– / 17 ene)"); (2) a deadline's pill split its date ("Applications
// open 26 Oct / 2026"); (3) a "·" left alone at the end of a line (the suggested set, a card's union line, the badge, the Evangelism card,
// the mission's "En su sitio web ·"); (4) the badge broke into "grade / B+", "· 76 events" and "year" alone; (5) "at the centre" (British);
// (6) "About as most" (not English); (7) the typical line of Size and growth ran through a number ("Typical 2.54" through Ohio's 2.23,
// "Typical 27.6" through 24.1): the halo covers only the strokes of the figures, so the line still showed between them; (8) a hatched
// "not published yet" month held published dates (Camp Meeting 2027, the OneVoice27 series: dates the conference gave on other pages
// before its calendar); (9) "tentative" beside "to be confirmed" for the same thing. jsdom has no layout, so the line breaks are checked by
// what prevents them (no-break spaces, a word joiner after a dash, "·" joined to the words after it), and the typical line by where the
// numbers are drawn. Written failing-first on v10.70.0.
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
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://terrain.church/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(o.now){ const RD=w.Date, FIX=+new RD(o.now+'T15:00:00'); class FD extends RD{ constructor(...a){ super(...(a.length?a:[FIX])); } static now(){ return FIX; } } w.Date=FD; }
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG(o.reg||'Pennsylvania')));
      if(o.saved) w.localStorage.setItem('terrain-compare',JSON.stringify(o.saved));
      w.fetch=async(u)=>{ u=String(u);
        if(/functions\/census\?check=1/.test(u)) return resp(200,JSON.stringify({required:false,ok:true,register:true,regRequired:true,regOk:true}));
        if(/functions\/register/.test(u)) return resp(503,'{"ok":false}');
        if(/advise/.test(u)) return resp(200,'{"enabled":false}');
        const m=/^\/conferences\/([a-z/.-]+\.json)(\?v=[0-9a-f]+)?$/.exec(u);
        if(m){ const t=served(m[1]); return t==null?resp(404,'{}'):resp(200,t); }
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,errs,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)]};
}
async function openCmp(P){ await until(()=>P.E('ACCESS_CHECKED')); await sleep(60); P.E("openTool('compare')");
  await until(()=>P.q('#cmp-ya .cmp-tl')&&P.q('#cmp-saidg .cmp-box')&&P.q('#cmp-sources li b')&&P.q('#cmp-learng .cmp-lcard')); await sleep(30); }
// The words Terrain writes around a title: the element's text without its links (event titles are links, shown as published)
const own=el=>{ if(!el) return ''; const b=el.cloneNode(true); b.querySelectorAll('a').forEach(a=>a.remove()); return b.textContent; };
// A date or a range that could break: an ordinary space inside "24 Jan", "Jan 2027" or around a range's dash, or a dash a line may break after
const MON='Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic';
const BREAK=new RegExp(`\\d[ \\t\\n]+(?:${MON})\\b|\\b(?:${MON})[ \\t\\n]+\\d{4}\\b|(?:\\d|\\b(?:${MON}))–(?!\\u2060)|(?:\\d|\\b(?:${MON}))[ \\t\\n]+–|–\\u2060?[ \\t\\n]+\\d`,'g');
const breaks=t=>(String(t).match(BREAK)||[]);
const NB='\u00A0', WJ='\u2060';
/* v10.71.0: read from the data (the monthly refresh moves the dates). The check date from the builders' config.json, the year ahead from
   its month, Pennsylvania's suggested set, the learn cards, the badges, the hatched months and their known-date labels, the deadlines and
   the tentative items from the served files; nothing below names a conference, a date or a count by hand any more. */
const cfg=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/conferences/src/config.json'),'utf8')), CHECKED=cfg.checked, CM=CHECKED.slice(0,7);
const idx=JSON.parse(served('index.json')), paD=JSON.parse(served('c/pennsylvania.json')), AH=JSON.parse(served('ahead.json')), THR=paD.ahead.through;
const MONS={en:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],es:['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']};
const fMY=(m,l)=>MONS[l||'en'][+m.slice(5,7)-1]+NB+m.slice(0,4), fDMY=(s,l)=>(+s.slice(8,10))+NB+fMY(s,l);
const addM=(m,n)=>new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7)-1+n,1)).toISOString().slice(0,7);
const AHEAD=Array.from({length:12},(_,i)=>addM(CM,i)), HATCHED=AHEAD.filter(m=>!(THR&&m<=THR));
const pa=idx.conferences.find(x=>x.slug==='pennsylvania'), by=Object.fromEntries(idx.conferences.map(x=>[x.slug,x]));
const SUG=pa.suggest.map(s=>s.slug), SIDE=(pa.suggest.find(s=>s.k==='side')||{}).slug, SEL=['pennsylvania'].concat(SUG), nameOf=s=>by[s].name;
const pc=n=>(Math.round(n)===n?n:Number(n).toFixed(1))+'%';
const CAL={high:['Full calendar','Calendario completo'],medium:['Partial calendar','Calendario parcial'],low:['Thin calendar','Calendario escaso']};
const badgeOf=(s,l)=>{ const q=by[s], L=CAL[q.calendar.confidence][l==='es'?1:0], g=q.calendar.grade||'\u2013', n=q.counts.ministryEvents;
  return l==='es'?`${L} ·${NB}nota${NB}${g} ·${NB}${n}${NB}eventos en el último${NB}año`:`${L} ·${NB}grade${NB}${g} ·${NB}${n}${NB}events in the past${NB}year`; };
const known=m=>paD.ahead.conf.filter(it=>it.m===m&&!/r/.test(it.f||'')).length;
const knownL=(m,l)=>{ const n=known(m); return l==='es'?(n?(n===1?'1 fecha conocida':n+' fechas conocidas')+'; '+(THR?'calendario aún no publicado':'sin calendario de la asociación'):(THR?'aún no publicado':'sin calendario'))
  :(n?(n===1?'1 date known':n+' dates known')+'; '+(THR?'calendar not published yet':'no conference calendar'):(THR?'not published yet':'no calendar')); };
const HINT={en:{early:'Early price to',register:'Register by',transfer:'Transfers end',apply:'Apply by',pay:'Pay by',due:'Due'},
  es:{early:'Precio reducido: hasta',register:'Inscripción: hasta',transfer:'Traslados: hasta',apply:'Solicitud: hasta',pay:'Pago: hasta',due:'Vence:'}};
const hintOf=(d,l)=>(HINT[l||'en'][d.k]||(l==='es'?'Hasta':'By'))+' '+(d.p==='m'?fMY(d.s.slice(0,7),l):fDMY(d.s,l));
const D1=paD.ahead.dl.filter(d=>d.s>CHECKED&&AHEAD.includes(d.s.slice(0,7))).sort((a,b)=>a.s.localeCompare(b.s))[0];
// the learn cards by the page's own rule: another chosen calendar, not thin, 3+ events in the area and 5 points more of its calendar than his
const CORE=['evangelism','pastoral','discipleship','family','youth','clubs','health','education'];
const CARDS=CORE.map(lid=>({lid,ahead:SUG.map(s=>by[s]).filter(q=>q.calendar.confidence!=='low'&&q.lenses[lid].n>=3&&q.lenses[lid].share>=pa.lenses[lid].share+5).sort((a,b)=>b.lenses[lid].share-a.lenses[lid].share).slice(0,2)})).filter(c=>c.ahead.length);
// every tentative or unconfirmed date Pennsylvania's year ahead draws (its own, its union's, the NAD's, the world church's, the deadlines)
const FLAGGED=[].concat(paD.ahead.conf,AH.unions[pa.union]||[],AH.nad,AH.world,paD.ahead.dl).filter(it=>/[tu]/.test(it.f||'')&&AHEAD.includes(it.m||String(it.s).slice(0,7)));
const needle=t=>String(t).split('(')[0].trim().slice(0,30);
// a year range ("2026\u20132029") and a year before a spaced dash ("2026 \u2013 “KNOWN”") as the page must keep them: a word joiner after the dash, no-break spaces round a spaced one
const RANGE=/\d{4}[\u2013-]\d{4}|\d{4} [\u2013-] \S/, keep=t=>t.replace(/(\d{4})([\u2013-])(?=\d{4}\b)/g,'$1$2'+WJ).replace(/(\d{4}) ([\u2013-]) (?=\S)/g,'$1'+NB+'$2'+WJ+NB);

(async()=>{ try{
  const P=page({now:CHECKED}); await openCmp(P);   // v10.71.0: read from the data (the monthly refresh moves the dates): the device's day is the check day
  const S=page({now:CHECKED,lang:'es'}); await openCmp(S);

  console.log('\n-- (1) a date or a range never breaks: "Last year:" and every date this tool writes --');
  c('the date words themselves: no-break spaces, a word joiner after a range\'s dash',
    P.J("[cmpDM('2027-01-24'),cmpDMY('2026-10-26'),cmpMY('2026-12'),cmpWhen({s:'2026-01-16',e:'2026-01-17'}),cmpWhen({s:'2026-09-11',e:'2026-09-13'}),cmpWhen({s:'2026-06-30',e:'2026-07-02'}),cmpFdate('2026-01-16','2026-01-17'),cmpFdate('2026-06-30','2026-07-02'),cmpFdate('2026-10')]"),
    ['24'+NB+'Jan','26'+NB+'Oct'+NB+'2026','Dec'+NB+'2026','16–'+WJ+'17'+NB+'Jan','11–'+WJ+'13'+NB+'Sep','30'+NB+'Jun'+NB+'–'+WJ+NB+'2'+NB+'Jul','16–'+WJ+'17'+NB+'Jan'+NB+'2026','30'+NB+'Jun'+NB+'2026'+NB+'–'+WJ+NB+'2'+NB+'Jul','Oct'+NB+'2026']);
  c('…in Spanish too ("16–17 ene")', S.J("[cmpWhen({s:'2026-01-16',e:'2026-01-17'}),cmpDMY('2026-10-09')]"), ['16–'+WJ+'17'+NB+'ene','9'+NB+'oct'+NB+'2026']);
  const ly=P.qa('#cmp-ya .tl-c.nyp .ly');
  c('the hatched months say what was there last year', ly.length>0, true);
  c('…and none of their dates can break ("(16–17 Jan)", "(11–13 Sep)", "(24 Jan)")', ly.flatMap(x=>breaks(own(x))), []);
  c('…in Spanish', S.qa('#cmp-ya .tl-c.nyp .ly').flatMap(x=>breaks(own(x))), []);
  const spots=Q=>['#cmp-checked','#cmp-ahead .cmp-sh .note','#cmp-prep','.cmp-yasum','#cmp-ya .cmp-tl','#cmp-ya .cmp-yax','#cmp-learng','#cmp-misg','#cmp-saidg','#cmp-caveats','.cmp-foot','#cmp-size .note']
    .flatMap(s=>Q.qa(s)).flatMap(e=>breaks(own(e)));
  c('nowhere in the tool\'s own words (the year ahead, Prepare now, the checked line, what we could learn, the missions, the caveats)', spots(P), []);
  c('…in Spanish', spots(S), []);

  console.log('\n-- (1b) v10.71.0: a published name with a year range stays whole --');
  // v10.71.0: read from the data (the monthly refresh moves the dates): the November 2026 refresh brought South Central's "3-Year Strategic
  // Plan (2026\u20132029)" and the Southern Union's "… Conference (EC3) 2026 \u2013 “KNOWN”" into What they say, and the sweep above caught their
  // dashes breaking. Every initiative name on the page (a chosen conference's own, or its union's) that holds a year range or a year before
  // a spaced dash is drawn on one line, its words unchanged; the function itself is held to the rule on a made-up name, whatever the data holds
  const RANGED=[...new Set(SEL.flatMap(s=>JSON.parse(served('c/'+s+'.json')).initiatives.map(i=>i.name)).concat(SEL.flatMap(s=>(idx.unions[by[s].union]||[]).map(u=>u.name))).filter(n=>RANGE.test(n)))];
  const SAMPLE='Strategic Plan (2026\u20132029) · Evangelism Conference 2026 \u2013 “KNOWN” · Plan 2025-2027 (Phase 2)', kept=P.E('cmpKeepDates('+JSON.stringify(SAMPLE)+')');
  c('cmpKeepDates keeps a year range and a year before a spaced dash whole, the words unchanged', [kept,kept.replace(/\u2060/g,'').replace(/\u00A0/g,' ')], [keep(SAMPLE),SAMPLE]);
  const saidg=P.q('#cmp-saidg').textContent;
  c('…and every such name in What they say ('+RANGED.length+' on the page: '+RANGED.map(n=>n.slice(0,44)).join(' | ')+') is drawn so, never as published with a breakable dash', RANGED.map(n=>[saidg.includes(keep(n)),saidg.includes(n)]), RANGED.map(()=>[true,false]));

  console.log('\n-- (2) a deadline\'s pill keeps its date whole --');
  // v10.71.0: read from the data (the monthly refresh moves the dates): the first deadline of Pennsylvania's Deadlines lane in the year ahead,
  // its pill read as drawn, EN and ES (a made-up one through cmpDlHTML when the lane holds none this month)
  const hints=P.qa('#cmp-ya .cmp-tl .cmp-hint').map(h=>h.textContent), hintsEs=S.qa('#cmp-ya .cmp-tl .cmp-hint').map(h=>h.textContent);
  if(D1){ c('"'+hintOf(D1)+'" may wrap before the date, never inside it', hints.includes(hintOf(D1)), true);
    c('…in Spanish ("'+hintOf(D1,'es')+'")', hintsEs.includes(hintOf(D1,'es')), true); }
  else { const mk={t:'Made-up application window',s:AHEAD[3]+'-26',u:'https://example.org/apply',k:'apply'}, dl=l=>(l==='es'?S:P).E('cmpDlHTML('+JSON.stringify(mk)+',{name:"x"},"'+CM+'")');
    c('a made-up deadline\'s pill (the lane holds none this month): "'+hintOf(mk)+'" may wrap before the date, never inside it', [dl().includes('>'+hintOf(mk)+'<'),dl('es').includes('>'+hintOf(mk,'es')+'<')], [true,true]); }
  c('…every pill in the year ahead and in Prepare now', [P.qa('#cmp-ya .cmp-hint').flatMap(h=>breaks(h.textContent)),S.qa('#cmp-ya .cmp-hint').flatMap(h=>breaks(h.textContent))], [[],[]]);

  console.log('\n-- (3) a "·" travels with the words after it, never left at the end of a line --');
  const dots=t=>({alone:/·[ \t\n]/.test(t)||/·$/.test(t.trim()), glued:/\u00A0·/.test(t)});
  const why=P.q('#cmp-why').textContent, whyEs=S.q('#cmp-why').textContent;
  // v10.71.0: read from the data (the monthly refresh moves the dates): the name after the "other side" pick is whichever the set holds
  const NEXT=SUG[SUG.indexOf(SIDE)+1];
  c('Suggested: "… (other side of the country) · '+(NEXT?nameOf(NEXT):'')+' …": a line may break before the dot, not after it',
    [NEXT?why.includes('(other side of the country) ·'+NB+nameOf(NEXT)):/\(other side of the country\)\s*$/.test(why),dots(why)], [true,{alone:false,glued:false}]);
  c('…in Spanish ("(el otro lado del país) ·")', [NEXT?whyEs.includes('(el otro lado del país) ·'+NB+nameOf(NEXT)):/\(el otro lado del país\)\s*$/.test(whyEs),dots(whyEs)], [true,{alone:false,glued:false}]);
  c('At a glance: "Southwestern Union · South" (each card\'s union line)', P.qa('.cmp-card .u').map(u=>dots(u.textContent)).filter(d=>d.alone||d.glued), []);
  c('…the badge ("Partial calendar · grade B")', P.qa('.cmp-badge').map(b=>dots(b.textContent)).filter(d=>d.alone||d.glued), []);
  // v10.71.0: read from the data (the monthly refresh moves the dates): the first learn card by the page's own rule, its whole line
  const C0=CARDS[0], lineOf=c=>c.ahead.map(q=>q.name+' '+pc(q.lenses[c.lid].share)).join(' ·'+NB)+' ·'+NB+'ours '+pc(pa.lenses[c.lid].share);
  c('…the first learn card ("'+(C0?lineOf(C0).replace(/\u00A0/g,' '):'none this month')+'")', [C0?P.qa('#cmp-learng .cmp').map(x=>x.textContent).includes(lineOf(C0)):P.qa('#cmp-learng .cmp-lcard').length===0,P.qa('#cmp-learng .cmp').map(x=>dots(x.textContent)).filter(d=>d.alone||d.glued)], [true,[]]);
  // v10.71.0: read from the data (the monthly refresh moves the dates): the missions' check date is index.json's (re-checked yearly)
  c('…the mission\'s source line in Spanish ("En su sitio web · revisado el '+fDMY(idx.missionChecked,'es').replace(/\u00A0/g,' ')+'")', S.qa('#cmp-misg .s').some(s=>s.textContent.includes('En su sitio web ·'+NB+'revisado el '+fDMY(idx.missionChecked,'es'))), true);
  c('…and no "·" anywhere on the page with a breakable space after it, or held to the words before it (English, Spanish)', [dots(P.q('#cmp').textContent),dots(S.q('#cmp').textContent)], [{alone:false,glued:false},{alone:false,glued:false}]);

  console.log('\n-- (4) At a glance: the status pill breaks only between its parts --');
  // v10.71.0: read from the data (the monthly refresh moves the dates): the second card is the suggested set's first; its badge built from index.json
  const badge=P.qa('.cmp-badge').map(b=>b.textContent), second=P.q('.cmp-card:nth-child(2) .cmp-badge').textContent;
  c('"grade" with its letter, "· N events" whole, "past year" together ('+nameOf(SUG[0])+': "'+badgeOf(SUG[0]).replace(/\u00A0/g,' ')+'")',
    [second===badgeOf(SUG[0]), badge.every(t=>/grade\u00A0\S+ ·\u00A0\d+\u00A0events? in the past\u00A0year$/.test(t))], [true,true]);
  c('…in Spanish ("'+badgeOf(SUG[0],'es').replace(/\u00A0/g,' ')+'")', [S.q('.cmp-card:nth-child(2) .cmp-badge').textContent===badgeOf(SUG[0],'es'), S.qa('.cmp-badge').map(b=>b.textContent).every(t=>/nota\u00A0\S+ ·\u00A0\d+\u00A0eventos? en el último\u00A0año$/.test(t))], [true,true]);

  console.log('\n-- (5) American spelling in the tool\'s own English --');
  const en=P.J("Object.values(CMP_UI).map(v=>v.en)");
  c('no "centre", "judgement", "cancelled" or other British spellings', en.filter(t=>/\b(centre|colour|neighbour|judgement|cancell|favour|behaviour|programme|organis|recognis)/i.test(t)), []);
  c('the circle chart: "at the center, none"', /at the center, none\./.test(P.q('#cmp-brief .cmp-rhow').textContent), true);

  console.log('\n-- (6) "About the same as most", never "About as most" --');
  c('the key, the mission rows and the words under the chart', [P.qa('#cmp-brief .cmp-rk').map(k=>k.textContent)[1],P.qa('#cmp-misg .cmp-rst').map(r=>r.textContent).filter(t=>/as most/.test(t)).every(t=>t==='About the same as most'),
      /on the dashed ring, about the same as most;/.test(P.q('#cmp-brief .cmp-rhow').textContent),en.filter(t=>/\babout as most\b|, as most;/i.test(t))],
    ['About the same as most',true,true,[]]);
  c('…the Spanish stays "Como la mayoría"', S.qa('#cmp-brief .cmp-rk').map(k=>k.textContent)[1], 'Como la mayoría');

  console.log('\n-- (7) Size and growth: the typical line never runs through a number --');
  // the chart is drawn at its frame's width: every width from a phone's to a computer's half frame
  const cross=Q=>Q.J(`(()=>{ const out=[], keep=cmpW;
    try{ for(const W of [280,300,320,340,360,380,400,420,440,460,480,520,560,600,680,760]){ cmpW=()=>W;
      for(const id of ['cmp-ch-e1k','cmp-ch-join']){ cmpCharts(); const sv=document.querySelector('#'+id+' svg');
        const ln=[...sv.querySelectorAll('line')].find(l=>l.getAttribute('stroke')===CMP_C.ref); if(!ln){ out.push(id+' '+W+': no typical line'); continue; }
        const x=+ln.getAttribute('x1');
        [...sv.querySelectorAll('text')].filter(t=>/paint-order/.test(t.getAttribute('style')||'')).forEach(t=>{ const a=+t.getAttribute('x'), b=a+t.textContent.length*6.6;
          if(x>a-3&&x<b+3) out.push(id+' '+W+': '+t.textContent+' over the line at '+x.toFixed(1)); }); } } }
    finally{ cmpW=keep; cmpCharts(); }
    return out; })()`);
  // v10.71.0: read from the data (the monthly refresh moves the dates): whatever the five values are this month, each clear of the typical line
  c('events per 1,000 and joining per 1,000: each number clear of the typical line, at every width', cross(P), []);
  c('…every number still drawn, with its halo', P.qa('#cmp-ch-e1k svg text,#cmp-ch-join svg text').filter(t=>/paint-order:stroke/.test(t.getAttribute('style')||'')).length, 10);

  console.log('\n-- (8) a hatched month never says "not published yet" over a date that is published --');
  const box=Q=>Q.qa('#cmp-ya .tl-c.nyp').map(b=>[b.querySelector('.nyp-l').textContent,b.querySelectorAll('.cc > .it, .cc > details .it').length]);
  // v10.71.0: read from the data (the monthly refresh moves the dates): the hatched months are those after the published-to month; each
  // label counts that month's own dates in Pennsylvania's file, and the cell holds exactly those dates
  const pa8=box(P);
  c('Pennsylvania\'s calendar is published to '+(THR||'nothing')+': the '+HATCHED.length+' months after it are hatched', pa8.length, HATCHED.length);
  c('a hatched month with the conference\'s own dates from other pages says how many it knows ('+HATCHED.filter(m=>known(m)).length+' such months)', pa8.filter(b=>b[1]>0), HATCHED.filter(m=>known(m)).map(m=>[knownL(m),known(m)]));
  c('…a month with none still says "not published yet"', pa8.filter(b=>!b[1]).map(b=>b[0]), HATCHED.filter(m=>!known(m)).map(m=>knownL(m)));
  c('…in Spanish', box(S), HATCHED.map(m=>[knownL(m,'es'),known(m)]));
  c('the same words as Month by month\'s hatched squares', P.J("[cU('m_known1')+'; '+cU('m_nyp')]")[0], '1 date known; calendar not published yet');

  console.log('\n-- (9) one name for one thing: "to be confirmed" --');
  c('a date its calendar marks tentative is "to be confirmed"', [P.E("cmpTagsHTML({f:'t'})"),P.E("cmpTagsHTML({f:'u'})"),P.E("cmpTagsHTML({f:'tu'})")],
    ['<span class="tag">to be confirmed</span>','<span class="tag">to be confirmed</span>','<span class="tag">to be confirmed</span>']);
  // v10.71.0: read from the data (the monthly refresh moves the dates): every tentative or unconfirmed date Pennsylvania's year ahead draws
  // this month wears "to be confirmed" / "por confirmar" (a made-up one through cmpItemHTML when the data holds none)
  const tagsOf=(Q,it)=>{ const el=Q.qa('#cmp-ya .it').find(x=>x.textContent.includes(needle(it.t))&&!!x.querySelector('a[href="'+it.u+'"]')); return el?[...el.querySelectorAll('.tag')].map(t=>t.textContent):null; };
  const MK={t:'Made-up camporee',s:AHEAD[4]+'-13',m:AHEAD[4],u:'https://example.org/camporee',f:'u'}, mkItem=Q=>Q.E('cmpItemHTML('+JSON.stringify(MK)+',"'+CM+'")');
  if(FLAGGED.length) c(FLAGGED.length+' tentative or unconfirmed date(s) in the data ('+FLAGGED.map(it=>needle(it.t)).join(' | ')+'): each "to be confirmed"', FLAGGED.map(it=>tagsOf(P,it)), FLAGGED.map(()=>['to be confirmed']));
  else c('a made-up unconfirmed date (the data holds none this month): "to be confirmed"', mkItem(P).includes('<span class="tag">to be confirmed</span>'), true);
  c('"tentative" nowhere in the tool\'s words or on the page', [en.filter(t=>/tentative/i.test(t)),/tentative/i.test(P.q('#cmp').textContent)], [[],false]);
  c('…Spanish: "por confirmar", never "provisional"', [S.J("Object.values(CMP_UI).map(v=>v.es)").filter(t=>/provisional/i.test(t)),FLAGGED.length?FLAGGED.map(it=>tagsOf(S,it)):mkItem(S).includes('<span class="tag">por confirmar</span>')], [[],FLAGGED.length?FLAGGED.map(()=>['por confirmar']):true]);
  c('How to read this: "Dates marked “to be confirmed” may change"', /Dates marked “to be confirmed” may change;/.test(P.q('#cmp-caveats').textContent), true);

  c('no page errors', [P.errs,S.errs], [[],[]]);
}catch(e){ console.log('  FAIL  threw: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
