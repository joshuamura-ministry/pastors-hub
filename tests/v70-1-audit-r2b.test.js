// v10.70.1 · the audit's second round (26 Oct 2026): what the second look at the pictures found in the Evangelism Planner, Learn from other
// conferences and the headings app-wide. The pastor (26 Oct 2026): "can you do a thourogh audit of the app, from the operation making sure
// everything works and functions properly. everything is synmetrical and looks amazing". (E1) the demo series, 18 months out: the first
// phase "Find the leaders and set the date" (to Jan 27, 2027) said "Book the evangelist by Apr 28, 2027", a date after it ends; the rule
// (his v10.66 choice, v66-speaker) is to book a year ahead, and the work begins now, so the line says so (each speaker choice; revival
// checked too). (E2) on a phone a number left its word ("· 9 / nights", "25 / leaders") and a phase's dates broke inside a date ("May 27, /
// 2027"). (E3) Resources for your church drew its published words with dates that broke ("next date 26 October / 2026", "support by 30 /
// September", "portal 1 / July…"), "past 12 / months" under section 2's title and "115 / congregations" in At a glance. (E4) headings left
// one word alone on their last line ("Where the calendar's energy / goes", "Every church in the Pennsylvania / Conference", Spanish "Hacia
// dónde va la energía del / calendario"), and the resources tabs' labels too. jsdom has no layout, so the line breaks are checked by what
// prevents them: no-break spaces, a word joiner after a range's dash, the CSS rule that balances a heading's lines. Written failing-first.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const H=require('./v45-helpers.js');
const {sleep,until,checker}=H;
const T=checker(), c=T.c;
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const txt=e=>e?e.textContent.replace(/\s+/g,' ').trim():'';
const MONS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DATE=/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d+), (\d{4})/g;
const dates=s=>{ const out=[]; let m; DATE.lastIndex=0; while((m=DATE.exec(s))) out.push(new Date(+m[3],MONS.indexOf(m[1]),+m[2],12)); return out; };
const dayN=d=>{ const x=new Date(d); x.setHours(12,0,0,0); return Math.round(x.getTime()/864e5); };
const NB=' ', WJ='⁠';

// --- the conferences page (as v70-1-audit-conferences: the data files served, a registration) ---
const TOK='r1.AbCdEfGhIjKl.lx2abc.'+'A'.repeat(32);
const REG=conf=>({name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf,role:'pastor',synced:true,tok:TOK});
const served=p=>{ const f=path.join(ROOT,'conferences',p); return fs.existsSync(f)?fs.readFileSync(f,'utf8'):null; };
const resp=(status,body)=>({ok:status>=200&&status<300,status,text:async()=>body,json:async()=>JSON.parse(body)});
function cpage(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://terrain.church/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(o.now){ const RD=w.Date, FIX=+new RD(o.now+'T15:00:00'); class FD extends RD{ constructor(...a){ super(...(a.length?a:[FIX])); } static now(){ return FIX; } } w.Date=FD; }
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG('Pennsylvania')));
      w.fetch=async(u)=>{ u=String(u);
        if(/functions\/census\?check=1/.test(u)) return resp(200,JSON.stringify({required:false,ok:true,register:true,regRequired:true,regOk:true}));
        if(/functions\/register/.test(u)) return resp(503,'{"ok":false}');
        if(/advise/.test(u)) return resp(200,'{"enabled":false}');
        const m=/^\/conferences\/([a-z/.-]+\.json)(\?v=[0-9a-f]+)?$/.exec(u);
        if(m){ const t=served(m[1]); return t==null?resp(404,'{}'):resp(200,t); }
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,errs,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)]};
}
async function openCmp(P){ await until(()=>P.E('ACCESS_CHECKED')); await sleep(60); P.E("openTool('compare')");
  await until(()=>P.q('#cmp-ya .cmp-tl')&&P.q('#cmp-saidg .cmp-box')&&P.q('#cmp-resg .cmp-rcard')&&P.q('#cmp-ming .cmp-mitem')); await sleep(40); }

// A published date that could break: an ordinary space inside "26 October", "October 2026", "August 28" or "December 18, 2025",
// or a range's en dash a line may break after ("6–16 January")
const MONTH='January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec';
const DBREAK=new RegExp(`\\b\\d{1,2}[ \\t\\n]+(?:${MONTH})\\b|\\b(?:${MONTH})[ \\t\\n]+\\d{1,4}\\b|\\b(?:${MONTH})${NB}\\d{1,2},[ \\t\\n]+\\d{4}\\b|\\d–(?!${WJ})\\d{1,2}${NB}(?:${MONTH})\\b`,'g');
const dbreaks=t=>(String(t).match(DBREAK)||[]);
// a number that could leave its word: a figure followed by an ordinary space or a line break
const NUMBREAK=/[\d½%][ \t\n]+\S/;

// --- the CSS: the page's own style block, its rules at the top level and inside @media ---
const CSS=(()=>{ const a=html.indexOf('<style>'), b=html.indexOf('</style>',a); return html.slice(a+7,b).replace(/\/\*[\s\S]*?\*\//g,''); })();
function rules(css){
  const out=[]; let i=0;
  const walk=(media)=>{ while(i<css.length){ const o=css.indexOf('{',i), cl=css.indexOf('}',i);
      if(cl>=0&&(o<0||cl<o)){ i=cl+1; return; }
      if(o<0) { i=css.length; return; }
      const sel=css.slice(i,o).trim(); i=o+1;
      if(sel.startsWith('@')){ walk(sel); continue; }
      const e=css.indexOf('}',i); out.push({media,sel,decl:css.slice(i,e)}); i=e+1; } };
  while(i<css.length) walk(null);
  return out;
}
const RULES=rules(CSS);
const sels=r=>r.sel.split(',').map(s=>s.trim());

(async()=>{ await T.sec(async()=>{
  const P=H.page({}); await H.ready(P); P.E("openTool('planner')"); await sleep(120);
  P.q('#pl-demo').click(); await sleep(250);
  const plan=P.J('uChurch().plan'), D=new Date(plan.date+'T12:00:00');
  const ph0=()=>{ const b=P.qa('#pout .rail .pb')[0]; return {end:dates(txt(b.querySelector('.pt .dates')))[1],items:[...b.querySelectorAll(':scope > ul > li')].map(txt)}; };
  const SPEAK=/^(Begin booking|Book the|Ask the conference for|Decide who will speak|Our pastor preaches)/;
  const mo=s=>{ const m=s.match(/by (\w+ \d+, \d{4})/); return m?Math.round((D-new Date(m[1]+' 12:00'))/864e5/30.44):null; };
  // the rule: a date after the phase ends is a deadline, and the line says the work begins now, before it
  const nowFirst=(t,end)=>{ DATE.lastIndex=0; let m; while((m=DATE.exec(t))){ const x=new Date(+m[3],MONS.indexOf(m[1]),+m[2],12); if(dayN(x)>dayN(end)) return /\bnow\b/.test(t.slice(0,m.index)); } return true; };

  console.log('\n-- (E1) the speaker, 18 months out: the booking begins now, its deadline a year ahead --');
  { const p=ph0(), L=p.items.find(t=>SPEAK.test(t))||'';
    c('the demo series (a paid evangelist): the first phase ends three months in', [plan.speaker,Math.round((dayN(p.end)-dayN(new Date()))/30.44)], ['guest',3]);
    c('"Begin booking the evangelist now: confirm by …, a year before opening night" (it said "Book the evangelist by Apr 28, 2027", after the phase ends)',
      [/^Begin booking the evangelist now: confirm by \w+ \d+, \d{4}, a year before opening night\. /.test(L),mo(L)], [true,12]);
    c('…its references and its written agreement kept (v66-speaker)', [/whether attendance held to the last night and the new members stayed/.test(L),/a written agreement: the honorarium, travel, housing and meals, who keeps the names, and the follow-up/.test(L)], [true,true]);
    c('…no date past the phase without "now" before it', nowFirst(L,p.end), true); }
  const set=sp=>{ P.E(`PLAN.speaker=${JSON.stringify(sp)}; planSave(PLAN); plannerRender(PLAN);`); };
  set('conference'); await sleep(40);
  { const p=ph0(), L=p.items.find(t=>SPEAK.test(t))||'';
    c('a conference leader or evangelist: "Ask the conference for an evangelist now: … books a year or more ahead, so confirm by …"',
      [/^Ask the conference for an evangelist now: the ministerial department books a year or more ahead, so confirm by \w+ \d+, \d{4}\. Ask what it covers/.test(L),mo(L),nowFirst(L,p.end)], [true,12,true]); }
  set('pastor'); await sleep(40);
  { const p=ph0(), L=p.items.find(t=>SPEAK.test(t))||'';
    c('our pastor: "begin planning the series now (…), ready by …, a year before opening night"',
      [/^Our pastor preaches: begin planning the series now \(the titles, the order, the appeal each night\), ready by \w+ \d+, \d{4}, a year before opening night; a seasoned evangelist asked to coach/.test(L),mo(L),nowFirst(L,p.end)], [true,12,true]); }
  set(''); await sleep(40);
  { const p=ph0(), L=p.items.find(t=>SPEAK.test(t))||'';
    c('not decided: "Decide who will speak now: our pastor, … or a paid evangelist, booked by …, a year before opening night"',
      [/^Decide who will speak now: our pastor, a conference leader or evangelist, or a paid evangelist, booked by \w+ \d+, \d{4}, a year before opening night\. Everything rides on/.test(L),mo(L),nowFirst(L,p.end)], [true,12,true]); }
  // every tier, both plans, every speaker choice: from 15 days to 82 weeks out
  const scan=P.J(`(()=>{
    const MONS=${JSON.stringify(MONS)}, strip=h=>String(h||'').replace(/<[^>]+>/g,''), dk=d=>{ const x=new Date(d); x.setHours(12,0,0,0); return Math.round(x.getTime()/864e5); };
    const SPEAK=${SPEAK.toString()}, iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const base={church:'X',members:150,leaders:25,workers:50,nights:15,perweek:5,seats:200,file:150,budget:25000,bw:2,kind:'both',books:220};
    const days=[]; for(let w=1; w<=82; w++) days.push(w*7+(w%7)); for(let d=15; d<=40; d++) days.push(d);
    const bad=[], tiers={}, kept=[];
    for(const type of ['evangelism','revival']) for(const sp of ['guest','conference','pastor','']) for(const n of days){
      const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+n);
      const p={...base,type,speaker:sp,date:iso(d)}; if(type==='revival'){ p.nights=9; p.perweek=7; }
      const tier=(type==='revival'?revSchedule(p):planSchedule(p)).tier; tiers[type+' '+tier]=1;
      const ph=(type==='revival'?revPhases(p,null):planPhases(p,null)).phases[0]; if(dk(ph.end)<dk(ph.start)) continue;
      const it=ph.items.find(i=>!i.plain&&SPEAK.test(strip(i.t))); if(!it){ bad.push(type+' '+tier+' '+sp+' '+p.date+': no speaker line'); continue; }
      const t=strip(it.t), re=/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\\d+), (\\d{4})/g; let m;
      while((m=re.exec(t))){ const x=new Date(+m[3],MONS.indexOf(m[1]),+m[2],12);
        if(dk(x)>dk(ph.end)){ if(!/\\bnow\\b/.test(t.slice(0,m.index))) bad.push(type+' '+tier+' '+(sp||'undecided')+' '+p.date+' · ends '+iso(ph.end)+' · '+t.slice(0,70)); break; } }
      if(type==='evangelism'&&tier==='short'&&sp==='guest') kept.push(/^Book the evangelist by \\w+ \\d+, \\d{4}: ask churches/.test(t)); }
    return {bad,tiers:Object.keys(tiers).sort(),kept:kept.length>0&&kept.every(Boolean)}; })()`);
  c('every tier was tried: evangelism (18 months, a year, 2–8 months, under 2) and revival (6 months, 6 weeks–6 months, under 6 weeks)', ['evangelism full','evangelism quick','evangelism short','evangelism year','revival full','revival quick','revival short'].every(k=>scan.tiers.includes(k)), true);
  c('…in every one, for every speaker choice, the first phase names no date past its end without "now" before it (revival already did)', [scan.bad.length,scan.bad.slice(0,4)], [0,[]]);
  c('…a deadline inside the first phase keeps its words ("Book the evangelist by …", three months out)', scan.kept, true);

  console.log('\n-- (E2) on a phone: a number keeps its word; a date never breaks; a range breaks only after its dash --');
  const checkPlan=(label,headRe)=>{
    const rng=P.qa('#pout .rail .pt .dates').map(e=>e.textContent);
    c(label+': every phase\'s dates break only after the dash, each date whole', rng.filter(t=>{ const ch=t.split(/[ \t\n]+/); return !(ch.length===2&&/–$/.test(ch[0])); }), []);
    c('…and read as before ("Oct 28, 2026 – Jan 27, 2027")', P.qa('#pout .rail .pt .dates').every(e=>/^\w{3} \d+, \d{4} – \w{3} \d+, \d{4}$/.test(txt(e))), true);
    const subs=P.qa('#pout .pbench .card .sub').map(e=>e.textContent);
    c('…the stat cards: no number left alone at a line\'s end ("25 / leaders", "150 / members")', subs.filter(t=>NUMBREAK.test(t)||/\d–(?!⁠)\d/.test(t)), []);
    const hd=P.q('#pout > .phead .hint'), hint=hd?hd.textContent:'';
    c('…the plan\'s line under its title: each number with its word, each "·" with the words after it ("· 9 / nights")', [NUMBREAK.test(hint),/·[ \t\n]/.test(hint),headRe.test(txt(hd))], [false,false,true]);
    const cd=P.qa('#pout > .phead').find(x=>txt(x.querySelector('h2'))==='The countdown'), cdh=cd?cd.querySelector('.hint').textContent:'';
    c('…the countdown\'s date whole', [/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[ \t\n]\d|\d,[ \t\n]\d{4}/.test(cdh),dates(txt(cd&&cd.querySelector('.hint'))).length], [false,1]);
  };
  set('guest'); await sleep(40);
  checkPlan('the demo series',/^150 members · 25 leaders · 50 workers · 15 nights · 200 seats$/);
  P.E('window.confirm=()=>true'); P.q('#pl-clear').click(); await sleep(60); P.q('#pl-type [data-pt="revival"]').click(); P.q('#pl-demo').click(); await sleep(250);
  checkPlan('the demo revival',/^150 active · 220 on the books · 25 leaders · 50 workers · 9 nights$/);
  { const p=ph0(), L=p.items.find(t=>SPEAK.test(t))||'';
    c('the revival\'s speaker line sits inside its first phase, as it did ("Book the speaker by …")', [/^Book the speaker by \w+ \d+, \d{4}:/.test(L),dates(L).every(d=>dayN(d)<=dayN(p.end))], [true,true]); }
  c('no page errors', P.errs, []);

  console.log('\n-- (E3) Learn from other conferences: published dates whole; a number with its word --');
  const C=cpage({now:'2026-10-01'}); await openCmp(C);
  const S=cpage({now:'2026-10-01',lang:'es'}); await openCmp(S);
  const allRes=async Q=>{ const out=[];
    for(const t of Q.qa('[data-cmp-rtab]').map(b=>b.getAttribute('data-cmp-rtab'))){ Q.q(`[data-cmp-rtab="${t}"]`).click(); await sleep(15); const m=Q.q('[data-cmp-rall]'); if(m){ m.click(); await sleep(15); }
      out.push(...Q.qa('#cmp-resg .cmp-rcard').map(e=>e.textContent)); }
    Q.q('[data-cmp-rtab="money"]').click(); await sleep(15); return out; };
  const res=await allRes(C);
  c('every card of the four tabs drawn', res.length>=40, true);
  c('"next date 26 October 2026 (opens …)", "support by 30 September", "portal 1 July…": each date whole',
    [res.some(t=>t.includes('next date 26'+NB+'October'+NB+'2026')),res.some(t=>t.includes('support by 30'+NB+'September')),res.some(t=>t.includes('portal 1'+NB+'July…'))], [true,true,true]);
  c('…the evangelism help\'s deadline ("Deadline: 30 September")', [...C.q('#cmp-resg .cmp-help').querySelectorAll('.cmp-facts span')].map(s=>s.textContent), ['Share: up to 50%','Deadline: 30'+NB+'September']);
  c('…no date in any card can break (a day and its month, a month and its year, a range\'s dash)', [...new Set(res.flatMap(dbreaks))].slice(0,12), []);
  C.qa('[data-cmp-mg]').forEach(b=>b.click()); await sleep(15); C.qa('[data-cmp-mi]').forEach(b=>b.click()); await sleep(15);
  c('…nor in any ministry\'s details (every kind opened, every ministry)', [C.qa('.cmp-mibody:not([hidden])').length>60,[...new Set(C.qa('#cmp-ming .cmp-mitem').flatMap(e=>dbreaks(e.textContent)))]], [true,[]]);
  { const R=JSON.parse(served('resources.json'));
    c('the data stays as published (conferences/resources.json: ordinary spaces)', [JSON.stringify(R).includes('next date 26 October 2026'),JSON.stringify(R).includes(NB)], [true,false]); }
  const notes=Q=>['#cmp-brief','#cmp-mission','#cmp-balance','#cmp-heat','#cmp-months'].map(id=>Q.q(id+' > .cmp-sh .note')).filter(Boolean).map(e=>e.textContent);
  c('section 2\'s line: "over the past 12 months" (and every section line with its 12 months)', [notes(C).length,notes(C).filter(t=>/\d[ \t\n]+\p{L}/u.test(t))], [5,[]]);
  c('…in Spanish ("los últimos 12 meses")', [notes(S).length,notes(S).filter(t=>/\d[ \t\n]+\p{L}/u.test(t))], [5,[]]);
  c('…as before when read ("over the past 12 months.")', txt(C.q('#cmp-brief > .cmp-sh .note')), 'Where its calendar gives more room than most conferences, and where less, over the past 12 months.');
  const big=Q=>Q.qa('#cmp-cards .big').map(e=>e.textContent);
  c('At a glance: "14,283 members · 115 congregations (2024)": each number with its word', [big(C).length>=4,big(C).filter(t=>/\d[ \t\n]+\p{L}/u.test(t)),big(C).every(t=>/^[\d,]+ members · \d+ congregations \(\d{4}\)$/.test(t.replace(/\s+/g,' ')))], [true,[],true]);
  c('…in Spanish ("115 congregaciones")', [big(S).filter(t=>/\d[ \t\n]+\p{L}/u.test(t)),big(S).every(t=>/^[\d,]+ miembros · \d+ congregaciones \(\d{4}\)$/.test(t.replace(/\s+/g,' ')))], [[],true]);
  const resS=await allRes(S);
  c('…the cards on the Spanish page (the published words are English)', [...new Set(resS.flatMap(dbreaks))], []);
  c('no page errors', [C.errs,S.errs], [[],[]]);

  console.log('\n-- (E4) a heading\'s lines are even: never one word alone on its last line --');
  const top=RULES.filter(r=>!r.media);
  c('a rule for every heading, at every width: h1, h2, h3 and h4 balance their lines', top.some(r=>['h1','h2','h3','h4'].every(h=>sels(r).includes(h))&&/text-wrap\s*:\s*balance/.test(r.decl)), true);
  c('…no heading rule asks for another text-wrap', RULES.filter(r=>sels(r).some(s=>/(^|[\s>+~])h[1-4](\.[\w-]+)*$|\.df-h$/.test(s))&&/text-wrap\s*:\s*(?!balance)\w/.test(r.decl)).map(r=>r.sel), []);
  const head=(Q,t)=>{ const e=Q.qa('#cmp h3').find(h=>h.textContent===t); return e?e.tagName:null; };
  c('the headings in the pictures are headings: "Where the calendar\'s energy goes", "What they say, what the calendar shows", "Ministries that come to your church"',
    [head(C,"Where the calendar's energy goes"),head(C,'What they say, what the calendar shows'),head(C,'Ministries that come to your church')], ['H3','H3','H3']);
  c('…in Spanish ("Hacia dónde va la energía del calendario")', head(S,'Hacia dónde va la energía del calendario'), 'H3');
  c('…Digital footprint\'s ("Every church in the Pennsylvania Conference", "No website, or one that does not open"): an h3 and an h4',
    [/<h3 class="df-h"><span>\$\{P\(4\)\}<\/span>\$\{esc\(dfT\('s4',\{conf\}\)\)\}<\/h3>/.test(html),/<article><h4>\$\{dfIco\(k\)\}\$\{esc\(h\)\}<\/h4>/.test(html)], [true,true]);
  console.log('\n-- (E4) the resources tabs: their words balanced at every width; the four keep one height --');
  c('"Money you can ask for", "What the church is doing now": balanced on a computer and a tablet too (it was only on a phone)', top.some(r=>sels(r).includes('.cmp-rtab .lb')&&/text-wrap\s*:\s*balance/.test(r.decl)), true);
  c('…the tabs are a grid whose items stretch to the row (one height): nothing aligns them otherwise', [top.some(r=>sels(r).includes('.cmp-rtabs')&&/display\s*:\s*grid/.test(r.decl)),
      RULES.filter(r=>(sels(r).includes('.cmp-rtabs')&&/align-items\s*:\s*(?!stretch|normal)\w/.test(r.decl))||(sels(r).some(s=>/^\.cmp-rtab(\[[^\]]*\])?$/.test(s))&&/align-self\s*:\s*(?!stretch|normal|auto)\w/.test(r.decl))).map(r=>r.sel)], [true,[]]);
  c('…four across on a computer, two by two on a phone (as before)', [top.some(r=>sels(r).includes('.cmp-rtabs')&&/grid-template-columns\s*:\s*repeat\(4,/.test(r.decl)),RULES.some(r=>/max-width:720px/.test(r.media||'')&&sels(r).includes('.cmp-rtabs')&&/repeat\(2,/.test(r.decl))], [true,true]);
  c('…the four labels', C.qa('[data-cmp-rtab] .lb').map(e=>e.textContent), ['Money you can ask for','Free materials','Training','What the church is doing now']);
}); T.done(); })();
