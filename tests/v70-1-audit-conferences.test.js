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

(async()=>{ try{
  const P=page({now:'2026-10-01'}); await openCmp(P);
  const S=page({now:'2026-10-01',lang:'es'}); await openCmp(S);

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

  console.log('\n-- (2) a deadline\'s pill keeps its date whole --');
  const hints=P.qa('#cmp-ya .cmp-tl .cmp-hint').map(h=>h.textContent);
  c('"Applications open 26 Oct 2026" may wrap before the date, never inside it', hints.includes('Applications open 26'+NB+'Oct'+NB+'2026'), true);
  c('…every pill in the year ahead and in Prepare now', P.qa('#cmp-ya .cmp-hint').flatMap(h=>breaks(h.textContent)), []);
  c('…in Spanish ("Solicitudes: desde 26 oct 2026")', [S.qa('#cmp-ya .cmp-tl .cmp-hint').map(h=>h.textContent).includes('Solicitudes: desde 26'+NB+'oct'+NB+'2026'),S.qa('#cmp-ya .cmp-hint').flatMap(h=>breaks(h.textContent))], [true,[]]);

  console.log('\n-- (3) a "·" travels with the words after it, never left at the end of a line --');
  const dots=t=>({alone:/·[ \t\n]/.test(t)||/·$/.test(t.trim()), glued:/\u00A0·/.test(t)});
  const why=P.q('#cmp-why').textContent, whyEs=S.q('#cmp-why').textContent;
  c('Suggested: "… (other side of the country) · Central California …": a line may break before the dot, not after it',
    [/\(other side of the country\) ·\u00A0Central California/.test(why),dots(why)], [true,{alone:false,glued:false}]);
  c('…in Spanish ("(el otro lado del país) ·")', [/\(el otro lado del país\) ·\u00A0/.test(whyEs),dots(whyEs)], [true,{alone:false,glued:false}]);
  c('At a glance: "Southwestern Union · South" (each card\'s union line)', P.qa('.cmp-card .u').map(u=>dots(u.textContent)).filter(d=>d.alone||d.glued), []);
  c('…the badge ("Partial calendar · grade B")', P.qa('.cmp-badge').map(b=>dots(b.textContent)).filter(d=>d.alone||d.glued), []);
  c('…the Evangelism card ("Central California 17.1% · ours 2.1%")', [/Central California 17\.1% ·\u00A0ours 2\.1%/.test(P.q('#cmp-learng').textContent),P.qa('#cmp-learng .cmp').map(x=>dots(x.textContent)).filter(d=>d.alone||d.glued)], [true,[]]);
  c('…the mission\'s source line in Spanish ("En su sitio web · revisado el 9 oct 2026")', S.qa('#cmp-misg .s').some(s=>/En su sitio web ·\u00A0revisado el 9\u00A0oct\u00A02026/.test(s.textContent)), true);
  c('…and no "·" anywhere on the page with a breakable space after it, or held to the words before it (English, Spanish)', [dots(P.q('#cmp').textContent),dots(S.q('#cmp').textContent)], [{alone:false,glued:false},{alone:false,glued:false}]);

  console.log('\n-- (4) At a glance: the status pill breaks only between its parts --');
  const badge=P.qa('.cmp-badge').map(b=>b.textContent), ohio=P.q('.cmp-card:nth-child(2) .cmp-badge').textContent;
  c('"grade B+" together, "· 76 events" whole, "past year" together (Ohio: "Partial calendar · grade B+ · 76 events in the past year")',
    [/·\u00A0grade\u00A0B\+ ·\u00A0\d+\u00A0events in the past\u00A0year$/.test(ohio), badge.every(t=>/grade\u00A0\S+ ·\u00A0\d+\u00A0events? in the past\u00A0year$/.test(t))], [true,true]);
  c('…in Spanish ("nota B+", "76 eventos", "último año")', S.qa('.cmp-badge').map(b=>b.textContent).every(t=>/nota\u00A0\S+ ·\u00A0\d+\u00A0eventos? en el último\u00A0año$/.test(t)), true);

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
  c('events per 1,000 (Ohio 2.23 against "Typical 2.54") and joining (Nevada-Utah 24.1 against "Typical 27.6"): each number clear of the line', cross(P), []);
  c('…every number still drawn, with its halo', P.qa('#cmp-ch-e1k svg text,#cmp-ch-join svg text').filter(t=>/paint-order:stroke/.test(t.getAttribute('style')||'')).length, 10);

  console.log('\n-- (8) a hatched month never says "not published yet" over a date that is published --');
  const box=Q=>Q.qa('#cmp-ya .tl-c.nyp').map(b=>[b.querySelector('.nyp-l').textContent,b.querySelectorAll('.cc > .it, .cc > details .it').length]);
  const pa=box(P);
  c('Pennsylvania\'s calendar ends in December: its 2027 months are hatched', pa.length, 9);
  c('a month with the conference\'s own dates from other pages (camp meeting, OneVoice27) says so', pa.filter(b=>b[1]>0).map(b=>b[0]), ['1 date known; calendar not published yet','1 date known; calendar not published yet']);
  c('…a month with none still says "not published yet"', pa.filter(b=>!b[1]).every(b=>b[0]==='not published yet'), true);
  c('…in Spanish', [box(S).filter(b=>b[1]>0).map(b=>b[0]),box(S).filter(b=>!b[1]).every(b=>b[0]==='aún no publicado')], [['1 fecha conocida; calendario aún no publicado','1 fecha conocida; calendario aún no publicado'],true]);
  c('the same words as Month by month\'s hatched squares', P.J("[cU('m_known1')+'; '+cU('m_nyp')]")[0], '1 date known; calendar not published yet');

  console.log('\n-- (9) one name for one thing: "to be confirmed" --');
  c('a date its calendar marks tentative is "to be confirmed"', [P.E("cmpTagsHTML({f:'t'})"),P.E("cmpTagsHTML({f:'u'})"),P.E("cmpTagsHTML({f:'tu'})")],
    ['<span class="tag">to be confirmed</span>','<span class="tag">to be confirmed</span>','<span class="tag">to be confirmed</span>']);
  const pbe=Q=>{ const it=Q.qa('#cmp-ya .tl-r .it').find(x=>/Pathfinder Union Level PBE/.test(x.textContent)); return it?[...it.querySelectorAll('.tag')].map(t=>t.textContent):null; };
  c('the Columbia Union\'s "Pathfinder Union Level PBE" (March 2027): "to be confirmed"', pbe(P), ['to be confirmed']);
  c('"tentative" nowhere in the tool\'s words or on the page', [en.filter(t=>/tentative/i.test(t)),/tentative/i.test(P.q('#cmp').textContent)], [[],false]);
  c('…Spanish: "por confirmar", never "provisional"', [S.J("Object.values(CMP_UI).map(v=>v.es)").filter(t=>/provisional/i.test(t)),pbe(S)], [[],['por confirmar']]);
  c('How to read this: "Dates marked “to be confirmed” may change"', /Dates marked “to be confirmed” may change;/.test(P.q('#cmp-caveats').textContent), true);

  c('no page errors', [P.errs,S.errs], [[],[]]);
}catch(e){ console.log('  FAIL  threw: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
