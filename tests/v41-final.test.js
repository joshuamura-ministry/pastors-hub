/* v10.41.0 final review — four things the last critic found would disappoint the pastor, fixed before delivery and held here.
 *
 *  1. Step 2 opens where he looks. The pastor on the greeters: "send a card if they're missing, or if they don't come one
 *     Sabbath… call and say we missed you". Their "For God's people" opened with "A Sunday picnic where every household
 *     brings a neighbor" (reach "both"); his own example came third. Now on every side of all 34 groups: ideas that face
 *     only that way ("in" / "out") before "both" ones, then the group's first-listed theme for that side, and a theme
 *     shared with the other side never outranks it. Where a group's own focus is a community theme (prayer, disability,
 *     personal evangelism, young adults, media, literature), that theme is listed first on its "For God's people" side too.
 *  2. Children only when the idea is about children. The picnic's "families" tag gave its decks "About 1 in 4 people around
 *     us is a child" beside Mark 10:14, which he called weird. Proved over every one of the 3,050 ideas, a board deck and a
 *     congregation deck each, in English. (v10.41.1: the 103 built-ins by the same rule, in v41-1.test.js.)
 *  3. Capacity reads have first, then need ("Leaders: 7 of the 17 needed"), on every deck and the handout; it read
 *     "Leaders 17 of 7" and "Series budget $12,000 of $2,500" to the conference's administrators. The conference deck no
 *     longer tells them "Nobody is ready to coordinate yet: pair and train."
 *  4. Spanish: "Ideas para el Club de Conquistadores" (it read "Ideas para Club de Conquistadores"): every group's article.
 */
const fs=require('fs'), path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
const IDX=JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','index.json'),'utf8'));
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,700));console.log('    want:',JSON.stringify(e).slice(0,500));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=15000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor'};

function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      // a phone (four cards a page) when asked
      if(o.narrow) w.matchMedia=q=>({matches:/max-width/.test(q),media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      w.fetch=async(u)=>{ u=String(u);
        const m=/^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if(m){ const f=path.join(ROOT,'ideas',m[1]+'.json'); if(!fs.existsSync(f)) return {ok:false,status:404,json:async()=>null};
          const t=fs.readFileSync(f,'utf8'); return {ok:true,status:200,json:async()=>JSON.parse(t)}; }
        if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false})};
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
function setup(P){
  P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null;
    capSave(${JSON.stringify(FX.MEDIUM)}); uPersist(); openTool('case'); render(); caseMount(true); })()`);
}
const listed=P=>!P.q('#cs-lib .lib-loading')&&P.qa('#cs-lib .lib-sec').length===2;
const page1=(P,sec)=>P.qa(`#cs-lib .lib-sec[data-lib-sec="${sec}"] .lib-card`).map(e=>e.dataset.libId);
const choose=async(P,g)=>{ P.E(`caseChooseGroup(${JSON.stringify(g)})`); await until(()=>listed(P)&&P.J('casePrefs().group')===g); };
const PICNIC='fellowship-bring-a-neighbor-picnic', CARD='member-care-two-sabbath-card', BOOK='member-care-greeters-door-notebook';

(async()=>{ try{
  console.log('\n-- 1. step 2 opens where he looks --');
  { const P=page({narrow:true}); await sleep(1300); c('no boot errors (phone)', P.errs, []); setup(P);
    await choose(P,'hospitality');
    const a=page1(P,'in');
    // The pastor (29 Sep 2026): "send a card if they're missing, or if they don't come one Sabbath… call and say we missed
    // you". Final review: the card opens the greeters' "For God's people" (it was third, under a picnic for neighbours).
    c('Greeters on a phone: "A handwritten card when a member misses two Sabbaths" first, the greeters\' door notebook next', [a.length,a[0],a[1]], [4,CARD,BOOK]);
    c('…and the Sunday picnic for neighbours (reach "both") is not on that page', a.includes(PICNIC), false);
    P.w.close(); }
  { const P=page(); await sleep(1300); c('no boot errors (desktop)', P.errs, []); setup(P);
    await choose(P,'hospitality');
    c('Greeters on a desktop: the card first, the notebook second, no picnic', [page1(P,'in')[0],page1(P,'in')[1],page1(P,'in').includes(PICNIC)], [CARD,BOOK,false]);
    c('…their community side opens with hospitality itself (their first theme there)', P.J(`(()=>{ const r=LIB.byId.get(${JSON.stringify(page1(P,'out')[0])}); return r?r.theme:null; })()`), 'hospitality');
    // every side of every group, in page order: exact reach, then the first theme (filed under it, then cross-listed to it)
    const G=P.J('CASE_GROUPS.map(g=>g.id)'), bad=[], firstOf={}, rows=[];
    for(const g of G){ await choose(P,g);
      const L=P.J('(()=>{ const G=caseGroupList(); return {in:[...G.focus.in][0]||null,out:[...G.focus.out][0]||null}; })()'); firstOf[g]=L;
      for(const sec of ['in','out']){ const ids=page1(P,sec);
        const keys=ids.map(id=>P.J(`(()=>{ const id=${JSON.stringify(id)}, r=LIB.byId.get(id), x=r?null:SIGNATURE.find(s=>s.id===id);
          const re=r?libReach(r):libReach(x), ts=r?[r.theme,...r.alsoIds]:libBuiltinThemes(x), f=${JSON.stringify(L[sec])};
          return [re===${JSON.stringify(sec)}?0:1, !f?0:ts[0]===f?0:ts.includes(f)?1:2]; })()`));
        for(let i=1;i<keys.length;i++){ const p=keys[i-1], k=keys[i]; if(k[0]<p[0]||(k[0]===p[0]&&k[1]<p[1])) bad.push([g,sec,i,ids[i-1],ids[i]]); }
        rows.push([g,sec,ids.length]); } }
    c('all 34 groups, both sides: ideas that face only that way before "both", then the side\'s first theme (a shared theme never outranks it)', [G.length,bad.slice(0,4)], [34,[]]);
    c('…and every side still has a full first page (6)', rows.filter(r=>r[2]!==6), []);
    // where a group's own focus is a community theme, it now opens "For God's people" too (the pastor: "the prayer ministry focuses on prayer")
    const OWN={prayer:'prayer',possibility:'disability',personal:'personal-evangelism',youngadults:'young-adults',media:'media',literature:'literature'};
    c('Prayer, Possibility, Personal ministries, Young adults, Media and Literature: their own theme listed first for God\'s people', Object.keys(OWN).map(g=>firstOf[g].in), Object.values(OWN));
    const off=[];
    for(const [g,t] of Object.entries(OWN)){ await choose(P,g); const id=page1(P,'in')[0];
      if(!P.J(`(()=>{ const r=LIB.byId.get(${JSON.stringify(id)}); return !!r&&[r.theme,...r.alsoIds].includes(${JSON.stringify(t)}); })()`)) off.push([g,id]); }
    c('…and the first card on that side is one of theirs', off, []);
    await choose(P,'prayer');
    c('Prayer ministry, God\'s people: anointing before surgery and a phone prayer the night before, on the first page', ['spiritual-care-anointing-before-surgery','member-care-prayer-before-surgery'].filter(id=>!page1(P,'in').includes(id)), []);
    await choose(P,'deacons');
    c('Deacons: their own work (the deacons\' theme) opens God\'s people', P.J(`LIB.byId.get(${JSON.stringify(page1(P,'in')[0])}).theme`), 'deacons');
    P.w.close(); }

  console.log('\n-- 2. children only when the idea is about children --');
  { const P=page(); await sleep(1300); setup(P);
    await P.E('libLoadIndex()'); await P.E('Promise.all(LIB.idx.themes.map(t=>libLoadTheme(t.id)))');
    const picnic=P.J(`(()=>{ const x=libToCatalog(libFull(${JSON.stringify(PICNIC)})); return [x.ages,x.minors,x.need.includes('families'),caseChildOk(x),caseChildOk(x,'hospitality'),caseChildOk(x,'pathfinders'),caseChildOk(x,'childrens')]; })()`);
    c('the picnic (ages all, tag "families") is not about children; a children\'s or youth group\'s deck is', picnic, ['all',false,true,false,false,true,true]);
    const CV=P.J(`CASE_CHILD_VERSES.map(id=>CASE_VERSES.find(v=>v.id===id).en.ref)`);
    c('the child verses: Mark 10:14, John 6:9, Proverbs 22:6 among them', ['Mark 10:14','John 6:9','Proverbs 22:6'].every(v=>CV.includes(v)), true);
    const R=P.J(`(()=>{ const out=[]; const ch=uChurch(), keep=ch.lib;
      for(const r of LIB.rows){ const raw=libFull(r.id); if(!raw){ out.push({id:r.id,err:'no text'}); continue; } ch.lib={[raw.id]:raw}; const x=libToCatalog(raw); CASE_ST.rank=null;
        const row={id:x.id,ok:caseChildOk(x),sp:(x.need||[]).includes('single-parents')};
        for(const g of ['board','congregation']){ const m=caseModel(x.id,{type:g,group:g},{lang:'en'}); const d=m&&m.ok?caseDeck(m):null; if(!d){ row[g]={err:1}; continue; }
          const figs=d.slides.filter(s=>['stat','trio','place'].includes(s.type));
          row[g]={hero:m.need&&m.need.hero?m.need.hero.key:null,lead:m.need?m.need.lead:null,min:m.ministry.min,keys:(m.sources||[]).map(z=>z.key),kids:m.neighbours?m.neighbours.kidsOn:null,
            verses:d.slides.map(s=>s.type==='verse'?s.ref:(s.verse&&s.verse.ref)).filter(Boolean).map(v=>String(v).replace(/ · .*/,'')),
            dots:d.slides.some(s=>s.type==='stat'&&/in every 100 are children/.test(s.count||'')),
            words:(JSON.stringify(figs).match(/is a child|are children|children below|under 18/gi)||[]).length}; }
        out.push(row); }
      ch.lib=keep; return out; })()`);
    const not=R.filter(r=>!r.ok), yes=R.filter(r=>r.ok);
    c(`all ${IDX.ideas.length} ideas: a board deck and a congregation deck each, none failing`, [R.length,R.filter(r=>r.err||r.board.err||r.congregation.err).map(r=>r.id).slice(0,5)], [IDX.ideas.length,[]]);
    const CK=['kidsShare','childPoverty','k12Share'];
    const KIDMIN=['Children’s Sabbath School','Adventurers','Pathfinders'];
    const why=(r,g)=>{ const d=r[g], w=[]; if(CK.includes(d.hero)) w.push('leads with '+d.hero); if(['kids','schools','child-poverty'].includes(d.lead)) w.push('lead need '+d.lead);
      const k=d.keys.filter(x=>CK.includes(x)||(x==='singleParent'&&!r.sp)); if(k.length) w.push('figures '+k.join(','));
      if(d.kids!=null||d.dots) w.push('children dots'); const v=d.verses.filter(x=>CV.includes(x)); if(v.length) w.push('verse '+v.join(','));
      if(d.words) w.push('"a child" words'); return w; };
    const off=[]; not.forEach(r=>['board','congregation'].forEach(g=>{ const w=why(r,g); if(w.length) off.push([r.id,g,w.join('; ')]); }));
    c(`…the ${not.length} not about children: no children's figure, no children dots, no child verse (Mark 10:14, John 6:9, Proverbs 22:6…), in either deck`, [not.length>2000,off.slice(0,5)], [true,[]]);
    const pic=R.find(r=>r.id===PICNIC);
    c('…the picnic among them: no "1 in 4 people around us is a child", no Mark 10:14', [pic.ok,why(pic,'board'),why(pic,'congregation')], [false,[],[]]);
    c('…nor is it staffed as children\'s work (no Children\'s Sabbath School, Adventurers or Pathfinders among the gifts that fit)', ['board','congregation'].map(g=>pic[g].min.filter(n=>KIDMIN.includes(n))), [[],[]]);
    c(`…while the ${yes.length} about children keep the children's share on the congregation's neighbours slide`, [yes.length>500,yes.filter(r=>r.congregation.kids==null).map(r=>r.id).slice(0,5)], [true,[]]);
    const kid=R.find(r=>r.ok&&r.congregation.verses.includes('Mark 10:14'));
    c('…and "Suffer the little children" still comes to a children\'s idea', !!kid, true);
    // a families idea for everyone never borrows the children; one for the children's own groups still may
    c('the picnic as the Pathfinder Club\'s deck may speak of children (a youth group\'s deck)', P.J(`(()=>{ const ch=uChurch(), keep=ch.lib; ch.lib={[${JSON.stringify(PICNIC)}]:libFull(${JSON.stringify(PICNIC)})}; CASE_ST.rank=null;
      const m=caseModel(${JSON.stringify(PICNIC)},{type:'team',group:'pathfinders'},{lang:'en'}); ch.lib=keep; return m.ministry.childOk; })()`), true);
    P.w.close(); }

  console.log('\n-- 3. capacity reads have first, then need; the conference is asked, not told --');
  { const P=page(); await sleep(1300);
    const rows=[{label:'Leaders',need:17,have:7,unit:''},{label:'Series budget',need:12000,have:2500,unit:'$'},{label:'Volunteers',need:6,have:30,unit:''},{label:'Hours in the first month',need:50,have:250,unit:'h'}];
    const draw=(lang,rs)=>P.J(`(()=>{ const h=document.createElement('div'); document.body.appendChild(h);
      tdeckRender({lang:${JSON.stringify(lang)},slides:[{type:'capacity',headline:'c',rows:${JSON.stringify(rs)},gaps:[]}]},h,{keys:false});
      const nb=s=>s.replace(/\u00a0/g,' ');   // the renderer keeps "7 of" and "17 needed" together with no-break spaces
      const out=[...h.querySelectorAll('.td-crow')].map(r=>[nb(r.querySelector('.td-clab').textContent),nb(((r.querySelector('.td-cfig').textContent+' '+(r.querySelector('.td-cneed')||{textContent:''}).textContent).trim())),nb(r.querySelector('.td-cfig b').textContent),parseFloat(r.querySelector('.td-meter i').style.width),r.classList.contains('gap')]); h.remove(); return out; })()`);
    const en=draw('en',rows), es=draw('es',[...rows.slice(0,2),{label:'Horas del primer mes',need:50,have:20,unit:'h'},{label:'Voluntarios',need:1,have:0,unit:''}]);
    c('EN: "7 of the 17 needed", "$2,500 of the $12,000 needed" (short, amber); "30 free · 6 needed", "250 h free · 50 h needed" (covered)',
      en.map(r=>r[1]), ['7 of the 17 needed','$2,500 of the $12,000 needed','30 free · 6 needed','250 h free · 50 h needed']);
    c('…the words for what is needed sit beside the meter, under the bold figure (never on the label\'s line)', P.J(`(()=>{ const h=document.createElement('div'); document.body.appendChild(h);
      tdeckRender({lang:'en',slides:[{type:'capacity',headline:'c',rows:[{label:'Leaders',need:17,have:7,unit:''}]}]},h,{keys:false});
      const r=h.querySelector('.td-crow'); const o=[r.querySelector('.td-chead .td-cfig')!==null,r.querySelector('.td-cline .td-meter')!==null,(r.querySelector('.td-cline .td-cneed')||{textContent:''}).textContent.replace(/\\u00a0/g,' ')]; h.remove(); return o; })()`), [true,true,'of the 17 needed']);
    c('…what we have is the bold figure, and the meter fills with what we have against what is needed', [en.map(r=>r[2]),en.map(r=>Math.round(r[3])),en.map(r=>r[4])],
      [['7','$2,500','30','250 h'],[41,21,100,100],[true,true,false,false]]);
    c('ES: "7 de los 17 necesarios", "$2,500 de los $12,000 necesarios", hours feminine, one needed singular',
      es.map(r=>r[1]), ['7 de los 17 necesarios','$2,500 de los $12,000 necesarios','20 h de las 50 h necesarias','0 de 1 necesario']);
    c('…covered in Spanish: "30 disponibles · 6 necesarios", "250 h disponibles · 50 h necesarias"', draw('es',rows.slice(2)).map(r=>r[1]), ['30 disponibles · 6 necesarios','250 h disponibles · 50 h necesarias']);
    // the conference deck, from his Evangelism Planner series
    P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)});
      const mk=b=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=b.includes(g.id)?4:1; }); return gfScores(a); };
      const M=(i,name,b)=>({id:'m'+i,name,gifts:mk(b),heart:{},confirmed:true,willing:true,hours:6,skills:[],source:'manual'});
      uChurch().members=[M(0,'Ana Lopez',['evang','mission','teach']),M(1,'Ben Carter',['evang','hosp','encour']),M(2,'Cara Diaz',['mercy','helps','evang'])]; uPersist();
      planSave({church:'Bucks County SDA',members:120,leaders:6,workers:30,nights:18,perweek:4,date:'2027-09-11',kind:'both',seats:180,file:null,budget:12000,built:1,v:3}); })()`);
    for(const lang of ['en','es']){
      const r=P.J(`(()=>{ const m=caseModel(CASE_PLAN_ID,{type:'conference',group:'conference'},{lang:${JSON.stringify(lang)}}); const d=caseDeck(m);
        const h=document.createElement('div'); document.body.appendChild(h); tdeckRender(d,h,{keys:false});
        const cap=[...h.querySelectorAll('.td-t-capacity .td-crow')].map(e=>(e.querySelector('.td-cfig').textContent+' '+(e.querySelector('.td-cneed')||{textContent:''}).textContent).trim().replace(/\u00a0/g,' ')); h.remove();
        return {rows:m.capacity.rows.map(r=>[r.need,r.have,r.unit]),cap}; })()`);
      const want=r.rows.map(([n,h,u])=>{ const f=v=>u==='$'?'$'+v.toLocaleString('en-US'):u==='h'?v+' h':String(v);
        return n>h?(lang==='es'?`${f(h)} de ${n===1?'':u==='h'?'las ':'los '}${f(n)} ${u==='h'?'necesaria':'necesario'}${n===1?'':'s'}`:`${f(h)} of ${n===1?'':'the '}${f(n)} needed`)
          :(lang==='es'?`${f(h)} ${h===1?'disponible':'disponibles'} · ${f(n)} ${u==='h'?'necesaria':'necesario'}${n===1?'':'s'}`:`${f(h)} free · ${f(n)} needed`); });
      c(`the conference deck (${lang}): every capacity row, what we have first, then what is needed`, [r.cap.length>0,r.cap], [true,want]);
    }
    const lead=(type,group,ready,lang)=>P.J(`(()=>{ const m=caseModel(${type==='conference'?'CASE_PLAN_ID':"'food-pantry'"},{type:${JSON.stringify(type)},group:${JSON.stringify(group)}},{lang:${JSON.stringify(lang)}});
      m.gifts={...m.gifts,has:true,fit:Math.max(3,m.gifts.fit||0),ready:${ready},names:m.gifts.names||[]}; const d=caseDeck(m); const s=d.slides.find(s=>s.type==='ability'); return s?s.lead:null; })()`);
    c('conference, nobody ready to lead: "A coordinator will be named and trained." (EN and ES)', [lead('conference','conference',0,'en'),lead('conference','conference',0,'es')],
      ['A coordinator will be named and trained.','Se nombrará y capacitará a un coordinador.']);
    c('…never "pair and train" to the administrators; said only when nobody is ready (one ready: "Coordinator: one member is ready.")', [/pair and train/.test(JSON.stringify(P.J(`caseDeck((()=>{ const m=caseModel(CASE_PLAN_ID,{type:'conference',group:'conference'},{lang:'en'}); m.gifts={...m.gifts,has:true,fit:3,ready:0,names:[]}; return m; })())`))),lead('conference','conference',1,'en')],
      [false,'Coordinator: one member is ready.']);
    c('…a board deck keeps its own words to the pastor ("pair and train")', lead('board','board',0,'en'), 'Nobody is ready to coordinate yet: pair and train.');
    P.w.close(); }

  console.log('\n-- 4. Spanish: every group\'s article --');
  { const P=page({lang:'es'}); await sleep(1300); setup(P);
    const ids=P.J('CASE_GROUPS.map(g=>g.id)'), FOR=P.J("typeof CASE_GROUP_ES_FOR==='object'?CASE_GROUP_ES_FOR:{}");
    c('all 34 groups have their Spanish words after "para", each with its article (or "toda la iglesia")',
      [ids.length,ids.filter(id=>!FOR[id]),Object.keys(FOR).filter(id=>!ids.includes(id)),ids.filter(id=>FOR[id]&&!/^(el|la|los|las) \S|^toda la iglesia$/.test(FOR[id]))], [34,[],[],[]]);
    const lines=[]; for(const g of ids){ await choose(P,g); lines.push([g,P.txt('#cs-s2 .cs-sh .note')]); }
    c('step 2\'s line for all 34: "Ideas para {el/la/los/las …}. Primero, lo que mejor encaja en Warminster."',
      lines.filter(([g,t])=>t!==`Ideas para ${FOR[g]}. Primero, lo que mejor encaja en Warminster.`), []);
    c('…the Pathfinder Club: "Ideas para el Club de Conquistadores."', lines.find(l=>l[0]==='pathfinders')[1], 'Ideas para el Club de Conquistadores. Primero, lo que mejor encaja en Warminster.');
    c('…no line reads "para" straight into a capitalised name (the old "Ideas para Club de Conquistadores")', lines.filter(([,t])=>/para (?!el |la |los |las |toda )/.test(t.split('.')[0])).map(l=>l[0]), []);
    await choose(P,'pathfinders');
    P.qa('#cs-lib .lib-sec:not([hidden]) .lib-card .lib-acts button')[0].click();
    await until(()=>!!P.q('#cs-s2 .cs-chosen')&&/diapositivas para/.test(P.txt('#cs-s3 .cs-sh .note')||''));
    c('…and once an idea is chosen: "Elegida para el Club de Conquistadores." and "… diapositivas para el Club de Conquistadores."',
      [P.txt('#cs-s2 .cs-sh .note'),/^\d+ diapositivas para el Club de Conquistadores\./.test(P.txt('#cs-s3 .cs-sh .note')||'')], ['Elegida para el Club de Conquistadores.',true]);
    c('no errors in Spanish', P.errs, []);
    P.w.close(); }
  { const P=page(); await sleep(1300); setup(P);
    await choose(P,'pathfinders'); const a=P.txt('#cs-s2 .cs-sh .note');
    await choose(P,'congregation'); const b=P.txt('#cs-s2 .cs-sh .note');
    // v10.41.1: English now takes "the" where it reads naturally, as the Spanish articles above (it read "Ideas for Pathfinder
    // Club"); every group's English words are held in v41-1.test.js
    c('English takes its article too ("Ideas for the Pathfinder Club."), and "the whole church" is lower-cased mid-sentence as step 3 already did',
      [a,b], ['Ideas for the Pathfinder Club. Best fit for Warminster first.','Ideas for the whole church. Best fit for Warminster first.']);
    P.w.close(); }
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0); })();
