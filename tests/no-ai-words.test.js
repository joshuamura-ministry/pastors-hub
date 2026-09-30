// No "AI" (or "IA") anywhere a user can see it (v10.41.0). The pastor (29 Sep 2026): "I don't want AI to
// be seen anywhere, because people are scared of it sometimes — maybe 'more ideas engine' or something
// else beside AI." Every tool is rendered here, in English and in Spanish, and everything a person could
// read is scanned for /\bAI\b|\bIA\b/: the text of the page (hidden parts too: they show later), and
// every title (tooltip), aria-label, placeholder, alt and button value. Covered: the registration page,
// the hub, the Community Survey (the report, the action plan with a draft idea and a new idea, the Idea
// Library's search, its themes and "More ideas for {town}" locked, unlocked and failing), Spiritual Gifts
// (the landing, the sample report and its PDF), Make the Case (the three steps, a group, an idea, the
// slides, the sample slideshow, the handout PDF), the Evangelism Planner, and a member's #watch page.
// The server's own error words (which name the service) are never shown; the unlock hint shows ?ideas=,
// and ?ideas= unlocks as ?ai= still does. Last, a static scan of index.html: outside comments, the only
// "IA" is Iowa's postal code on the conference map. Code identifiers may keep "ai" (lower case, or
// inside a longer name such as AI_INFO).
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
const jspdf=require('jspdf');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,700));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor'};
const BAD=/\bAI\b|\bIA\b/;
jspdf.jsPDF.API.save=function(){ return this; };
const TI=JSON.parse(fs.readFileSync(path.join(__dirname,'topic-ideas.json'),'utf8'));
/* o.ai: what advise says — 'off' (no key), 'locked', 'open', 'fail' (every POST refused, in the server's words) */
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/'+(o.search||'')+(o.hash||''),pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.jspdf=jspdf;
      w.qrcode=(t,ec)=>{ let d=''; return {addData(s){ d=s; },make(){},getModuleCount:()=>29,isDark:(r,c2)=>((r*13+c2*7+d.length)%3)===0}; };
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      if(o.reg!==false) w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      if(o.pass) w.localStorage.setItem('terrain-ai-pass',o.pass);
      w.console.warn=()=>{};
      w.fetch=async(u,init)=>{ u=String(u);
        const m=/^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if(m){ const f=path.join(ROOT,'ideas',m[1]+'.json'); if(!fs.existsSync(f)) return {ok:false,status:404,json:async()=>null};
          const t=fs.readFileSync(f,'utf8'); return {ok:true,status:200,json:async()=>JSON.parse(t)}; }
        if(/advise/.test(u)){
          const ai=o.ai||'off';
          if(!init||init.method!=='POST') return {ok:true,status:200,json:async()=>ai==='off'?{enabled:false}:{enabled:true,locked:ai!=='open'}};
          if(ai==='fail') return {ok:false,status:502,json:async()=>({error:'The AI service refused the request: overloaded'})};
          const b=JSON.parse(init.body||'{}');
          if(b.mode==='topic') return {ok:true,status:200,json:async()=>({ideas:TI[b.lang==='es'?'es':'en'].slice(0,6),rejected:0})};
          return {ok:true,status:200,json:async()=>({ideas:[{name:'Porch-light prayer list',why:'Many live alone here.',what:'Members pray for five homes.',first:['Choose five homes','Pray each morning'],ppl:2,cost:0,skills:[]}]})}; }
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,D:w.document,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
/* Everything a person could read: text (not scripts or styles; the state map's "IA" is Iowa), and the
   attributes that are read aloud or shown on hover. */
function readable(P){
  const b=P.D.body.cloneNode(true);
  b.querySelectorAll('script,style,template,[data-st]').forEach(e=>e.remove());
  const out=[b.textContent.replace(/\s+/g,' ')];
  b.querySelectorAll('[title],[aria-label],[placeholder],[alt],input[type="button"],input[type="submit"]').forEach(e=>
    ['title','aria-label','placeholder','alt'].forEach(a=>{ const v=e.getAttribute(a); if(v) out.push(v); }));
  out.push(P.D.title||'');
  return out.join(' \n ');
}
function hits(t){ const r=[]; const re=/\bAI\b|\bIA\b/g; let m; while((m=re.exec(t))&&r.length<6) r.push(t.slice(Math.max(0,m.index-60),m.index+40)); return r; }
const scan=(P,label)=>c(label+': no "AI" or "IA" anywhere a person can read', hits(readable(P)), []);
function survey(P){
  P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null; capSave(${JSON.stringify(FX.MEDIUM)});
    uChurch().drafts=[{id:'draft-x1',generated:true,n:'Porch-light prayer list',why:'Many live alone here.',d:'Members pray for five homes.',how:['Choose five homes'],k:KIND.serve,load:0,st:'trust',ppl:2,cost:0,skill:[],need:[],requirements:{...uBase({id:'draft-x1',ppl:2,cost:0,skill:[]}),facilities:[],reviewed:true}}];
    uPersist(); openTool('survey'); render(); })()`);
}
const type=(P,sel,v)=>{ const e=P.q(sel); e.value=v; e.dispatchEvent(new P.w.Event('input',{bubbles:true})); };

(async()=>{ try{
  for(const lang of ['en','es']){
    console.log(`\n== ${lang} ==`);
    { const R=page({lang,reg:false}); await sleep(1300);
      c('the registration page is up', !!R.q('#usmap button[data-st]')||!!R.q('#regform')||!!R.q('#gate'), true);
      scan(R,'registration page'); }
    const P=page({lang,ai:'locked'}); await sleep(1300);
    scan(P,'hub');

    console.log('-- the Community Survey --');
    survey(P); await sleep(150);
    c('a draft idea is marked, in words that are not "AI"', P.E(`(()=>{ const d=document.createElement('div'); d.innerHTML=uRow(uChurch().drafts[0]); return d.querySelector('.u-ai').textContent; })()`), lang==='es'?'Idea en borrador':'Draft idea');
    P.E(`(()=>{ const x=libToCatalog({id:'fresh-prayer-abc123',theme:'prayer',tier:1,k:'serve',ages:'all',where:'streets',sabbath:true,minors:false,need:['settled'],boost:[],ppl:2,leaders:0,hrs:2,cost:0,costMo:0,skill:[],partner:null,ai:true,en:{n:'A porch prayer list',d:'Members pray for five homes on their street each morning, by name only when invited.',how:['a','b','c','d']}});
      const d=document.createElement('div'); d.id='__fresh'; d.innerHTML=uRow(x); document.body.appendChild(d); })()`);
    c('a new idea is marked "New idea" in the plan', P.txt('#__fresh .u-ai'), lang==='es'?'Idea nueva':'New idea');
    scan(P,'survey report and action plan');
    type(P,'#u-search','prayer'); await until(()=>P.qa('#u-lib .lib-card').length>0); await until(()=>P.q('#survey-lib-ai .lib-aimsg'),3000);
    c('locked: the hint shows ?ideas=, not ?ai=', [/\?ideas=/.test(P.txt('#survey-lib-ai')),/\?ai=/.test(P.txt('#survey-lib-ai'))], [true,false]);
    scan(P,'the Idea Library, "More ideas" locked');
    P.q('#u-lib [data-lib-close]')&&P.q('#u-lib [data-lib-close]').click();
    type(P,'#u-search',''); await sleep(300); P.q('#u-lib [data-lib-browse]').click(); await until(()=>P.qa('#u-lib .lib-tile').length>0);
    scan(P,'the Idea Library\'s themes');

    { const Q=page({lang,ai:'open'}); await sleep(1300); survey(Q); await sleep(100);
      type(Q,'#u-search','prayer'); await until(()=>Q.q('#u-lib [data-lib-ai]'),6000);
      c('unlocked: the button says "More ideas for Warminster"', Q.q('#u-lib [data-lib-ai]').textContent, lang==='es'?'Más ideas para Warminster':'More ideas for Warminster');
      Q.q('#u-lib [data-lib-ai]').click(); await until(()=>Q.q('#u-lib .lib-card .u-ai'),6000);
      c('a new idea is marked "New idea"', Q.txt('#u-lib .lib-card .u-ai'), lang==='es'?'Idea nueva':'New idea');
      scan(Q,'the Idea Library with new ideas');
      await until(()=>Q.J('!!(DATA&&capMerged().ready)'),2000); Q.E('autoIdeas()'); await until(()=>/new ideas were written|nuevas|written/.test(Q.J('U_GEN_NOTICE||""'))||Q.J('U_GEN_NOTICE||""').length>0,6000);
      c('the background ideas\' notice says "drafts", never "AI"', [Q.J('U_GEN_NOTICE').length>0,BAD.test(Q.J('U_GEN_NOTICE'))], [true,false]);
      scan(Q,'the action plan after new ideas'); }

    { const F=page({lang,ai:'fail',pass:'x'}); await sleep(1300); survey(F); await sleep(100);
      type(F,'#u-search','prayer'); await until(()=>F.q('#u-lib [data-lib-ai]'),6000);
      F.q('#u-lib [data-lib-ai]').click(); await until(()=>F.q('#u-lib .lib-aimsg.err'),6000);
      c('a refusal: the page\'s own sentence, never the server\'s words', [F.txt('#u-lib .lib-aimsg.err'),/refused|overloaded/.test(F.txt('#u-lib'))],
        [lang==='es'?'Las ideas nuevas no están disponibles en este momento. La biblioteca no se ve afectada.':'More ideas are not available just now. The library is unaffected.',false]);
      F.E(`uChurch().autoKey=null; uChurch().drafts=[]; uPersist();`); F.E('autoIdeas()'); await until(()=>F.J('U_GEN_NOTICE||""').length>0,6000);
      // v10.41 review: the notice is Spanish on a Spanish page (it was pinned in English)
      c('…and the background ideas\' failure too', [F.J('U_GEN_NOTICE'),/refused|overloaded/.test(F.J('U_GEN_NOTICE'))],
        [lang==='es'?'Las ideas nuevas no están disponibles en este momento. Los ministerios incluidos no se ven afectados.':'More ideas are not available just now. The built-in ministries are unaffected.',false]);
      scan(F,'the survey after a refusal'); }

    console.log('-- Spiritual Gifts --');
    P.E('openTool("gifts")'); await sleep(200);
    scan(P,'Spiritual Gifts landing');
    P.q('#gfsample').click(); await sleep(400);
    scan(P,'the sample report');
    { const t=P.E(`(()=>{ try{ const a={}; GIFTS.forEach(g=>{ for(let k=0;k<5;k++) a[g.id+'.'+k]=['teach','shep','helps'].includes(g.id)?4:2; });
        const M=gfReportModel(gfScores(a),null,{own:true,name:'Sam Ortiz',date:'2026-09-28',heart:{children:2},minor:false,flags:gfFlags(a),ctx:null});
        return gfReportPDF(M).__gfLog.map(l=>l.t).join(' '); }catch(e){ return 'ERR '+e.message; } })()`);
      c('the sample report\'s PDF: no "AI"', [t.length>500,hits(t)], [true,[]]); }

    console.log('-- Make the Case --');
    P.E('openTool("case"); caseMount(true);'); await sleep(100);
    P.q('[data-cs-group="prayer"]').click(); await until(()=>P.qa('#cs-lib .lib-card').length>0); await until(()=>P.q('#case-lib-ai-out .lib-aimsg'),3000);
    c('Make the Case: the lock line in the community section only, with ?ideas=', [/\?ideas=/.test(P.txt('#case-lib-ai-out')),P.txt('#case-lib-ai-in')], [true,'']);
    scan(P,'Make the Case, step 2 for a group');
    P.q('#cs-lib .lib-card [data-lib-case]').click(); await sleep(300);
    c('an idea chosen, its slides built', P.J('!!(CASE_ST.deck&&CASE_ST.deck.slides.length)'), true);
    scan(P,'Make the Case with the slides');
    { const t=P.E(`(()=>{ try{ const d=casePdfDoc(caseHandout(CASE_ST.model,CASE_ST.deck,{}),{jsPDF:window.jspdf.jsPDF,compress:false}); return d.__caseLog.map(l=>l.t).join(' '); }catch(e){ return 'ERR '+e.message; } })()`);
      c('the handout PDF: no "AI"', [t.length>500,hits(t)], [true,[]]); }
    P.E('caseSampleOpen()'); await sleep(300);
    scan(P,'the sample slideshow');
    P.E('caseSampleClose()');
    // v10.41 review: the presenter's setup, the presenter view, the share panel and the conference proposal, scanned too
    P.E(`prSetup(CASE_ST.deck,{model:CASE_ST.model},'present')`); await sleep(60);
    c('the presenter\'s setup is up', !!P.q('#casepres [data-pr-start]'), true);
    scan(P,'the presenter\'s setup');
    const room=`{room:'AbCdEfGhIjKlMnOpQrStUv',key:'${'k'.repeat(43)}',code:'K7M2QX',url:'https://pastorshub.org/#watch=K7M2QX',expires:Date.now()+7*864e5,live:false,fresh:true}`;   // fresh: no live pointer to look up first
    P.E(`prPresent({deck:CASE_ST.deck,model:CASE_ST.model,sample:false,mode:'present',respond:true,keepDays:7,live:false,out:CASE_ST.deck,r:${room}})`);
    await until(()=>P.q('#casepres .td-root'),3000);
    c('the presenter view is up', !!P.q('#casepres .td-root'), true);
    scan(P,'the presenter view');
    P.E(`prSharePanel({deck:CASE_ST.deck,model:CASE_ST.model,sample:false,mode:'share',respond:true,keepDays:7,live:false,out:CASE_ST.deck,r:${room}})`);
    await until(()=>P.q('#casepres .cp-codebig b'),3000);
    c('the share panel is up', !!P.q('#casepres .cp-codebig b'), true);
    scan(P,'the share panel');
    P.E('prClose()');
    P.E(`uChurch().plan={church:'Bucks County SDA',date:'2027-09-11',nights:18,kind:'both',perweek:4,workers:30,budget:12000,v:3}; uPersist(); openTool('case'); caseMount(true);`);
    P.q('[data-cs-group="conference"]').click(); await until(()=>P.q('#cs-plan .cs-plan')&&P.q('#cs-lib .lib-card'));   // v10.42: his series opens "From your plan"
    scan(P,'Make the Case for the conference leaders');
    { const t=P.E(`(()=>{ try{ const m=caseModel('plan-series',{type:'conference',group:'conference'}); const d=caseDeck(m); return JSON.stringify(d)+' '+casePdfDoc(caseHandout(m,d,{}),{jsPDF:window.jspdf.jsPDF,compress:false}).__caseLog.map(l=>l.t).join(' '); }catch(e){ return 'ERR '+e.message; } })()`);
      c('the conference proposal: its slides and its handout PDF, no "AI"', [t.length>2000,hits(t)], [true,[]]); }

    console.log('-- the Evangelism Planner --');
    P.E('openTool("planner")'); await sleep(200);
    scan(P,'Evangelism Planner');

    { const M=page({lang,hash:'#watch'}); await sleep(1300);
      scan(M,'a member\'s #watch page'); }
  }

  console.log('\n-- ?ideas= unlocks, as ?ai= still does --');
  for(const [q,want] of [['?ideas=open-sesame','open-sesame'],['?ai=old-way','old-way']]){
    const U=page({search:q}); await sleep(1300);
    c(`${q.split('=')[0]}: the passphrase kept on this device and taken out of the address`, [U.w.localStorage.getItem('terrain-ai-pass'),U.w.location.search], [want,'']);
  }

  console.log('\n-- the page itself: outside comments, "IA" is only Iowa --');
  { const script=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
    // Comments out, strings kept: a small scanner over the JavaScript (strings, template literals with
    // their ${…} parts, regular expressions and their [classes]).
    let out='', i=0, mode='code', q='', prev='', depth=0; const tpl=[];
    while(i<script.length){ const ch=script[i], nx=script[i+1];
      if(mode==='code'){
        if(ch==='/'&&nx==='/'){ const j=script.indexOf('\n',i); i=j<0?script.length:j; continue; }
        if(ch==='/'&&nx==='*'){ const j=script.indexOf('*/',i+2); i=j<0?script.length:j+2; continue; }
        if(ch==='"'||ch==="'"){ mode='str'; q=ch; out+=ch; i++; continue; }
        if(ch==='`'){ mode='tpl'; out+=ch; i++; continue; }
        if(ch==='/'&&(prev===''||/[(,=:[!&|?{};+\-*%<>~^]/.test(prev)||/(^|[^\w$])(return|typeof|case|void|in|of)\s*$/.test(out.slice(-12)))){ mode='re'; out+=ch; i++; continue; }
        if(ch==='{') depth++;
        if(ch==='}'){ if(tpl.length&&tpl[tpl.length-1]===depth){ tpl.pop(); mode='tpl'; out+=ch; i++; continue; } depth--; }
        out+=ch; if(!/\s/.test(ch)) prev=ch; i++; continue; }
      if(mode==='str'){ out+=ch; if(ch==='\\'){ out+=nx||''; i+=2; continue; } if(ch===q){ mode='code'; prev=q; } i++; continue; }
      if(mode==='tpl'){ out+=ch; if(ch==='\\'){ out+=nx||''; i+=2; continue; } if(ch==='`'){ mode='code'; prev='`'; i++; continue; }
        if(ch==='$'&&nx==='{'){ out+='{'; i+=2; tpl.push(depth); mode='code'; prev='{'; continue; } i++; continue; }
      if(mode==='re'){ out+=ch; if(ch==='\\'){ out+=nx||''; i+=2; continue; } if(ch==='['){ mode='recls'; i++; continue; } if(ch==='/'){ mode='code'; prev=')'; } i++; continue; }
      if(mode==='recls'){ out+=ch; if(ch==='\\'){ out+=nx||''; i+=2; continue; } if(ch===']') mode='re'; i++; continue; } }
    c('the scanner kept the page in step (every template and string closed)', [mode,tpl.length], ['code',0]);
    const found=[]; const re=/\bAI\b|\bIA\b/g; let m;
    while((m=re.exec(out))) found.push(out.slice(Math.max(0,m.index-30),m.index+10).replace(/\s+/g,' '));
    const iowa=s=>/'IA'|IA:'Iowa'/.test(s);
    c('every "AI"/"IA" left in the code is Iowa (the conference map), none in words', found.filter(s=>!iowa(s)), []);
    const bodyHtml=html.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<!--[\s\S]*?-->/g,'');
    c('…and none in the page\'s own HTML', hits(bodyHtml), []); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('CRASH',e&&e.stack); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
