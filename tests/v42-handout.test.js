// v10.42.0 — the proposal a member downloads on their phone (casePdf with only the deck, as a phone holds it).
// The pastor (29 Sep 2026): "at the end, on the phone or whatever device they're doing, they should be able to download
// the proposal right there on their phone." Before v10.42 a member's copy left out the roles, the closing words, the
// church family's and the conference's churches' figures, a conference proposal's aims (its second risks slide), four
// slide headlines, and never said who the proposal was for.
// Checked for six decks (a board, the whole church, a children's team, an in-reach greeters' team, the conference, the
// sample), English and Spanish: two pages (a conference proposal may take three); the church, the ministry and who it
// is for; every slide's kicker, headline and words, every verse's reference and words, every role with its hours,
// every risk, every figure of every place slide; every line inside its box; no "undefined" or "NaN"; SAMPLE (MUESTRA)
// on every page of the sample; never a member's name. The pastor's own handout (built from the case model) gains none
// of these member-copy fields, so it is drawn as before (tests/case-pdf.test.js holds it).
// v10.42.0 fix (the verifier: "the phone's PDF leaves out a few lines the slides show"): the "who is able" slide's
// coordinator line ("Coordinator: one member is ready.") was missing from every copy, and a figure slide's count line
// (the sample's "27 in every 100 are children") and a figure's unit in words ("34.8 years") were dropped. Now each deck
// is also checked against the slides themselves: every text a member's slide shows (rendered, slide by slide) is in the
// PDF, with Spiritual Gifts results (the coordinator line) and without (the church profile's skills).
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const jspdf=require('jspdf');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,600));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania Conference',role:'pastor'};
const NAMES=['Ana Lopez','Ben Carter','Cara Diaz','Dan Evans','Eve Fox','Finn Gray'];
(async()=>{ try{
  for(const lang of ['en','es']) for(const fx of ['skills','gifts']){
    console.log(`\n-- ${lang}, ${fx==='gifts'?'with Spiritual Gifts results (six members)':'the church profile’s skills (two members)'} --`);
    const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
    const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){ w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.jspdf=jspdf;
      w.localStorage.setItem('terrain-lang',lang); w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      w.qrcode=(t,ec)=>{ let d=''; return {addData(s){ d=s; },make(){},getModuleCount:()=>29,isDark:(r,c2)=>((r*13+c2*7+d.length)%3)===0}; };
      w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
    const w=dom.window; await sleep(1300);
    w.eval(`(()=>{ const D=${JSON.stringify(FX.DATA)}; D.M.tract.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.tract.moe)); D.M.county.moe=JSON.parse(JSON.stringify(CASE_SAMPLE.M.county.moe));
      DATA=D; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)});
      const mk=b=>{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=b.includes(g.id)?4:1; }); return gfScores(a); };
      uChurch().members=[{id:'m0',name:'Ana Lopez',gifts:mk(['teach','shep','helps','hosp','serve','mercy']),heart:{children:2},confirmed:true,willing:true,hours:6,skills:['kids'],source:'manual'},
        {id:'m1',name:'Ben Carter',gifts:mk(['admin','leader','helps','mercy']),heart:{},confirmed:true,willing:true,hours:6,skills:[],source:'manual'}];
      if('${fx}'==='gifts') uChurch().members.push(
        {id:'m2',name:'Cara Diaz',gifts:mk(['helps','mercy','hosp','serve']),heart:{hunger:2,children:1},confirmed:true,willing:true,hours:4,skills:[],source:'manual'},
        {id:'m3',name:'Dan Evans',gifts:mk(['leader','admin','evang']),heart:{hunger:1},confirmed:true,willing:true,hours:5,skills:[],source:'manual'},
        {id:'m4',name:'Eve Fox',gifts:mk(['teach','exhort','hosp']),heart:{children:2},confirmed:true,willing:true,hours:3,skills:['kids'],source:'manual'},
        {id:'m5',name:'Finn Gray',gifts:mk(['serve','helps','giving']),heart:{},confirmed:true,willing:true,hours:2,skills:[],source:'manual'});
      uPersist(); })()`);
    const th=JSON.parse(fs.readFileSync(path.resolve(__dirname,'..','ideas','member-care.json'),'utf8'));
    w.eval(`libSave(${JSON.stringify((Array.isArray(th)?th:th.ideas).find(x=>x.id==='member-care-two-sabbath-card'))})`);
    // v10.42 merge (presenter + timing parts): with "Suggest options" (the timing part's default; the sample slideshow shows
    // it) a board's or team's deck has both "Let's decide together" and its dates slide; a member's copy still holds every
    // slide's words (the options on the front, the dates slide's steps on the back), in two pages. The deck is taken as
    // present.mjs stores it (the decide slide's `part` dropped), with the QR code a live deck's join slide gives, so the
    // front is drawn tighter (level 2: the ask slide's headline is then said on the back, above the ask's rows); the
    // member's copy has no write-in line (with it, the Spiritual Gifts fixture's copies reached the tightest level, where
    // the verses lose their words: measured at the merge).
    const LV=[];
    for(const cs of ['food-pantry:board:board','food-pantry:congregation:congregation','vbs:team:childrens','member-care-two-sabbath-card:team:hospitality','come-and-see:conference:conference','sample:congregation:congregation',
                     'food-pantry:board:business:opt','pathfinders:team:pathfinders:opt','sample:board:board:opt','food-pantry:team:community:opt','vbs:team:childrens:opt','homework-club:board:elders:opt']){
      const [mi,type,group,opt]=cs.split(':'), tag=lang+(fx==='gifts'?' (gifts)':'')+' '+(mi==='sample'?'the sample'+(opt?' '+type+'/'+group:''):type+'/'+group)+(opt?' (Suggest options)':'');
      // the phone's own path: casePdfMake(null, {deck}) (the QR code from the join slide; SAMPLE from the deck's title)
      const R=JSON.parse(await w.eval(`(async()=>JSON.stringify(await (async()=>{ let d,m;
        const TO=${opt?"{timing:'options'}":'{}'};
        if('${mi}'==='sample'){ const s=caseSample({ministry:'pathfinders',audience:{type:'${type}',group:'${group}'},...TO}); d=s.deck; m=s.model; }
        else { m=caseModel('${mi}',{type:'${type}',group:'${group}'},TO); d=caseDeck(m); }
        const parts=d.slides.map(s=>s.part||'').filter(Boolean); d=JSON.parse(JSON.stringify(d)); d.slides.forEach(s=>{ delete s.part; });
        const mk=await casePdfMake(null,{deck:d,...(${opt?1:0}?{url:'https://pastorshub.org/#watch=AbCdEfGhIjKlMnOpQrStUv',code:'ABC123'}:{})}), doc=mk.doc;   // (with options: the QR code a live deck's join slide gives)
        const Hp=caseHandout(m,d,{});
        const log=doc.__caseLog, n=doc.getNumberOfPages();
        // what a member's phone shows, slide by slide (the join slide's QR code and code aside): every text on it
        const box=document.createElement('div'); document.body.appendChild(box);
        const ctl=tdeckRender(d,box,{mode:'browse',contained:true,keys:false,uiLang:d.lang}), leaves=[];
        box.querySelectorAll('.td-slide').forEach((sec,i)=>{ if(d.slides[i].type==='join') return;
          const walk=el=>{ for(const x of el.childNodes){ if(x.nodeType===3){ const t=x.textContent.replace(/\\s+/g,' ').trim(); if(t) leaves.push([i,d.slides[i].type,String(el.className||''),t]); } else if(x.nodeType===1) walk(x); } };
          walk(sec.querySelector('.td-main')); });
        ctl.destroy(); box.remove();
        return {d,n,leaves,parts,lv:doc.__caseLevel,name:mk.name,text:log.map(l=>l.t).join(' '),raw:doc.output(),pages:Array.from({length:n},(_,i)=>log.filter(l=>l.p===i+1).map(l=>l.t)),
          outside:log.filter(l=>l.x0<l.bx0-0.6||l.x1>l.bx1+0.6||l.x0<0||l.x1>612||l.y<20||l.y>780).map(l=>l.t).slice(0,5),
          // v10.42 part 3: a team's own handout says its roles too ("Who and what it takes": NARRATIVE.md §9.1)
          pastor:['places',...(Hp.audience==='team'?[]:['roles']),'close','riskMore','stepsHead','risksLine'].filter(k=>Hp[k]!=null).concat(Hp.capacity&&Hp.capacity.headline?['capacity.headline']:[],Hp.gifts&&Hp.gifts.headline?['gifts.headline']:[])}; })()))()`));
      const flat=s=>String(s==null?'':s).replace(/…/g,'...').replace(/\s+/g,' ').trim(), low=flat(R.text).toLowerCase();   // the PDF's font writes “…” as "..." (gfPdfClean)
      const has=s=>{ s=flat(s).replace(/^(SAMPLE|MUESTRA) · /,'').replace(/[.!?:]$/,'').replace(/^…/,'').toLowerCase(); return !s||low.includes(s)||low.replace(/-/g,'').includes(s.replace(/-/g,'')); };
      const d=R.d, words=[], verses=[];
      d.slides.forEach((s,i)=>{ if(s.type==='join') return;
        ['kicker','headline','text','by'].forEach(k=>{ if(typeof s[k]==='string'&&s[k]) words.push([i+':'+s.type+'.'+k,s[k]]); });
        (s.roles||[]).forEach(x=>{ words.push([i+':role',x.title]); if(x.hours!=null) words.push([i+':hours',String(x.hours)]); if(x.text) words.push([i+':role text',x.text]); });
        if(s.type==='risks') (s.items||[]).forEach(t=>words.push([i+':risk',t]));
        (s.facts||[]).forEach(f=>{ words.push([i+':fact value',String(f.value)]); words.push([i+':fact label',f.label]); });
        (s.steps||[]).forEach(x=>{ words.push([i+':step',x.title]); });
        (s.options||[]).forEach(x=>{ words.push([i+':option',x.label]); });
        if(s.verse&&s.verse.text){ verses.push([i+':verse ref',s.verse.ref]); verses.push([i+':verse text',s.verse.text.slice(0,60)]); }
        if(s.type==='verse'){ verses.push([i+':verse slide',s.ref]); } });
      const aud=w.eval(`(()=>{ const G=CASE_GROUPS.find(g=>g.id==='${group}'); const prev=LANG; LANG='${lang}'; try{ return caseGroupFor(G.id,caseT(G)); }finally{ LANG=prev; } })()`);
      // v10.42 part 3 (DESIGN X3, the pastor: "about 8–10 slides", one story): exactly one timing slide; with "Suggest options" that is
      // "Let's decide together", and the dates slide's three steps stay in the handout (the pastor's own), not on a slide
      if(opt){ LV.push(R.lv); c(`${tag}: (the fixture) the deck has "Let's decide together", and no dates slide beside it (one timing slide)`, [R.parts.includes('decide'),R.d.slides.some(s=>s.type==='timeline')], [true,false]);
        c(`${tag}: no line to write the agreed day on (a member's copy); the calendar check is there (the rows: every text below)`,
          // (fix after review, the length: a team's own handout says "Agreed day, start and length:"; a member's copy has none either)
          [/Agreed day and start|Agreed day, start and length|Agreed start and length|D[ií]a e inicio acordados|D[ií]a, inicio y duraci[oó]n acordados|Inicio y duraci[oó]n acordados/i.test(R.text),/Communion Sabbath|Santa Cena/i.test(R.text)], [false,true]); }
      c(`${tag}: ${R.n} pages (two; a conference proposal may take three)`, R.n<=(type==='conference'?3:2)&&R.n>=2, true);
      c(`${tag}: the church, the ministry, and who it is for (“${aud}”)`, [has(d.church.replace(/^(SAMPLE|MUESTRA) · /,'')),has(d.ministry.name),has(aud)||has(w.eval(`caseT(CASE_GROUPS.find(g=>g.id==='${group}'))`))], [true,true,true]);
      c(`${tag}: every slide’s words (kickers, headlines, roles and hours, risks, figures, steps, the close)`, words.filter(([k,s])=>!has(s)).map(([k,s])=>k+': '+flat(s).slice(0,60)), []);
      { // v10.42.0 fix: the lines the verifier found missing, by name
        const want=[];
        d.slides.forEach((s,i)=>{
          if(s.type==='stat'){ if(s.count) want.push([i+':stat count',s.count]);
            if(s.freq&&String(s.headline||'').toLowerCase().indexOf(String(s.freq).toLowerCase())<0) want.push([i+':stat freq',s.freq]);
            if(typeof s.unit==='string'&&s.unit.length>2) want.push([i+':stat value with its unit',String(s.value)+' '+s.unit]); }
          if(s.type==='ability'){ if(s.lead) want.push([i+':ability lead (the coordinator line)',s.lead]); if(s.label) want.push([i+':ability label',s.label]); } });
        c(`${tag}: every figure slide’s count, frequency and unit, and the “who is able” slide’s coordinator line`, want.filter(([k,s])=>!has(s)).map(([k,s])=>k+': '+flat(s).slice(0,60)), []);
        c(`${tag}: the “who is able” line reads as a sentence (never “6 the church profile lists 6…”)`, /\b\d+ (the church profile|el perfil de la iglesia)/i.test(R.text), false);
        if(fx==='gifts'&&d.slides.some(s=>s.type==='ability')) c(`${tag}: (the fixture) the “who is able” slide has a coordinator line`, d.slides.some(s=>s.type==='ability'&&!!s.lead), true);
        // every text a member's slide shows is in the PDF. Said in other words there: the slide's short "±4.1 pts" (the
        // PDF: "±4.1" in the table, "margin of error ±4.1 points" beside the lead figure)
        const miss=R.leaves.filter(([i,type,cls,t])=>{ if(/\btd-moe\b/.test(cls)) return !has((/±[\d.,]+/.exec(t)||[''])[0]); return !has(t); });
        c(`${tag}: every text a member’s slide shows is in the PDF (${R.leaves.length} checked)`, miss.map(([i,type,cls,t])=>i+':'+type+' '+flat(t).slice(0,60)), []); }
      c(`${tag}: every verse, its reference and its words`, verses.filter(([k,s])=>!has(s)).map(([k,s])=>k+': '+flat(s).slice(0,60)), []);
      c(`${tag}: every line inside its box and the page; no undefined, no NaN`, [R.outside,/undefined|NaN/.test(R.text)], [[],false]);
      c(`${tag}: never a member’s name`, NAMES.filter(nm=>R.text.includes(nm)||R.raw.includes(nm)), []);
      if(mi==='sample') c(`${tag}: ${lang==='es'?'MUESTRA':'SAMPLE'} on every page, and first in the file name`, [R.pages.map(p=>p.includes(lang==='es'?'MUESTRA':'SAMPLE')),R.name.startsWith(lang==='es'?'MUESTRA-':'SAMPLE-')], [Array(R.n).fill(true),true]);
      else c(`${tag}: the file is named for the church, the ministry and the audience`, /^Bucks-County-SDA-.+-(board|junta|team|equipo|congregation|congregacion|conference|asociacion)-\d{4}-\d{2}-\d{2}\.pdf$/.test(R.name), true);
      c(`${tag}: the pastor’s own handout gains none of the member-copy parts`, R.pastor, []);
    }
    { // a phone in one language following a presentation in the other: the proposal is all in the presentation's language
      const other=lang==='es'?'en':'es';
      const X=JSON.parse(await w.eval(`(async()=>{ CASE_ST.rank=null; const m=caseModel('food-pantry',{type:'congregation',group:'congregation'},{lang:'${other}'}); const d=caseDeck(m);
        const mk=await casePdfMake(null,{deck:d}); return JSON.stringify({dl:d.lang,page:LANG,text:mk.doc.__caseLog.map(l=>l.t).join(' ')}); })()`));
      const wrong=other==='en'?/Preparado|margen de error|Página|Escritura/:/Prepared \d|margin of error|Page \d|Scripture in this case/i;
      c(`${lang} page, ${other} presentation: the proposal is in ${other} throughout (footer, labels), and the page keeps its own language`,
        [X.dl,wrong.test(X.text),other==='en'?/Prepared \d/.test(X.text):/Preparado/.test(X.text),X.page], [other,false,true,lang]); }
    c(`${lang}${fx==='gifts'?' (gifts)':''}: (the fixture) a member's copy with options is drawn tighter (level 2) at least once, never at the tightest (3)`, [LV.some(l=>l===2),LV.every(l=>l<3)], [true,true]);
    c(`${lang}: no page errors`, errs, []);
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
