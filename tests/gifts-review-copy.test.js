// Spiritual Gifts report after the v10.37 review: wording, layout and the PDF.
//   - three potential gifts never read as one sentence frame (V3);
//   - an EMERGING card never says "untested" (V4);
//   - "other people have confirmed" only when people who know the member did (E2E-6);
//   - the low-answers report points at what is there (V9);
//   - English and Spanish copy fixes (V6, V7);
//   - the delete buttons' danger state is readable on the dark panel (V10);
//   - symmetry on screen and on paper (V11), the family caption beside its bars (V12);
//   - a disarmed delete takes its warning with it (V13);
//   - the report's print rules only while the gifts panel is shown (tests F5).
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const jspdf=require('jspdf');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.print=()=>{}; w.jspdf=jspdf;
    w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
const w=dom.window, E=s=>w.eval(s), J=s=>JSON.parse(E(`JSON.stringify(${s})`));

setTimeout(async()=>{ try{
  E(String.raw`
  window.__T={};
  __T.PROFILES={
    teacher:{teach:[4,4,3,3,4],shep:[4,3,3,3,3],encour:[3,3,3,2,2],hosp:[4,3,2,-1,-1],wisdom:[3,3,2,2,2],mercy:[3,2,2,1,2],inter:[3,2,-1,-1,-1]},
    organiser:{admin:[4,4,4,4,4],leader:[4,4,3,4,3],giving:[3,3,3,3,3],faith:[4,3,3,2,3],wisdom:[3,3,3,3,3],reconcile:[3,3,2,3,2],mission:[3,3,2,2,2]}};
  __T.answers=function(kind){ const a={};
    GIFTS.forEach((g,gi)=>{ let v;
      if(kind==='allhigh') v=[4,4,4,4,4];
      else if(kind==='untested') v=[3,3,-1,-1,-1].map((x,k)=>(gi%3===0&&k<2)?2:x);
      else if(kind==='low') v=[1,0,1,0,1];
      else if(kind==='pot') v=({mission:[3,3,2,2,2],encour:[3,3,2,2,2],creative:[3,3,2,2,2],teach:[4,4,4,4,4]})[g.id]||[1,1,1,1,1];
      else { const hi=__T.PROFILES[kind]; v=(hi&&hi[g.id])||[1+gi%3,1+(gi*7)%3,gi%2,(gi*5)%3,gi%3]; }
      v.forEach((x,k)=>a[g.id+'.'+k]=x); });
    return a; };
  __T.model=function(kind,o){ o=o||{}; const a=__T.answers(kind); const S=gfScores(a,o.obs||null);
    return gfReportModel(S,null,{own:o.own!==false,name:o.name||'Maria Lopez',date:'2026-09-28',heart:{},minor:!!o.minor,
      observers:o.observers||null,flags:gfFlags(a),ctx:o.ctx===undefined?null:o.ctx}); };
  __T.text=function(M,own){ const d=document.createElement('div'); d.innerHTML=gfReportHTML(M,own); return d.textContent.replace(/\s+/g,' '); };`);

  console.log('-- potential gifts: three readings, three frames (V3) --');
  for(const lang of ['en','es']){ E(`LANG='${lang}'`);
    for(const kind of ['organiser','untested']){
      const P=J(`__T.model('${kind}',{own:false}).potential.map(p=>({t:p.text,n:gfLow(p.id)}))`);
      const frames=P.map(p=>p.t.split(p.n).join('#'));
      c(`${lang} ${kind}: ${P.length} potential gifts, ${P.length} different sentences once the gift's name is taken out`, [P.length>=2,new Set(frames).size], [true,P.length]);
    } }
  E(`LANG='en'`);
  c('the first two phrasings leave the name to the card title; the third names it', J(`(()=>{ const s=new Set(), S=gfScores(__T.answers('untested')).filter(x=>x.label==='emerging').slice(0,3);
    return S.map(x=>gfTryText(x,s).includes(gfLow(x.id))); })()`), [false,false,true]);

  console.log('-- an EMERGING card never says "untested" (V4) --');
  for(const lang of ['en','es']){ E(`LANG='${lang}'`);
    const bad=J(`__T.model('untested',{}).top.filter(t=>t.label==='emerging'&&/untested|sin probar/i.test(t.why)).map(t=>t.why)`);
    c(`${lang}: no emerging card's reading uses the word`, bad, []); }
  E(`LANG='en'`);

  console.log('-- "other people have confirmed" only when they have (E2E-6) --');
  const NOOBS=/other people have said so independently|other people naming it|Other people have already confirmed|other people have already confirmed|others have named it|producing something other people have noticed/;
  for(const own of [true,false]){
    const t=J(`__T.text(__T.model('allhigh',{own:${own}}),${own})`);
    c(`nobody has confirmed (${own?'member':'pastor'}): no claim that others did`, NOOBS.test(t), false);
    c(`…and the reading says it is the member's own account`, /by your own account|you say others already/.test(t), true);
  }
  { const S=J(`(()=>{ const s=gfScores(__T.answers('allhigh'),{teach:[4,4],shep:[4]}); return s.filter(x=>x.id==='teach'||x.id==='shep').map(x=>gfWhy(x,new Set())); })()`);
    c('with people who know the member behind a gift, its reading may say they confirmed it', S.every(t=>/Proven: it has produced something real, and other people have said so independently\./.test(t)), true); }
  c('Spanish: no "otras personas ya han confirmado" without observers', /otras personas ya han confirmado|lo han dicho por su cuenta/.test((E(`LANG='es'`),J(`__T.text(__T.model('allhigh',{own:false}),false)`))), false);
  E(`LANG='en'`);

  console.log('-- the low-answers report points at what is there (V9) --');
  const low=J(`(()=>{ const M=__T.model('low',{}); return {pot:M.potential.length,top:M.top.length,label:M.labels.gifts,ov:M.overview.join(' ')}; })()`);
  c('no gift cards, no potential gifts: the heading says so, the overview points at the chart', [low.top,low.pot,low.label,/start from the top of the chart of all twenty-one/.test(low.ov),/potential gifts/.test(low.ov)], [0,0,'Where your answers stand',true,false]);
  E(`LANG='es'`);
  c('en español también', [J(`__T.model('low',{}).labels.gifts`),/empiece por los primeros dones de la lista/.test(J(`__T.model('low',{}).overview.join(' ')`))], ['Dónde están sus respuestas',true]);
  E(`LANG='en'`);

  console.log('-- English copy (V7) --');
  const ctx={church:'Bucks County SDA',fac:[],min:{'Small groups':'r','Adult Sabbath School teaching':'r'},churchId:'x',needs:[],area:'',year:null};
  const cm=J(`__T.text(__T.model('teacher',{ctx:${JSON.stringify(ctx)}}),true)`);
  // v10.54.2: step 2 of "How to get involved" names the ministry ("or with whoever leads “…” at …", "Ask to serve in “…”"), still quoted
  c('ministry names are quoted mid-sentence, never a stray capital (b)', [/whoever leads “[^”]+” at Bucks County SDA/.test(cm)&&/Ask to serve in “[^”]+”/.test(cm),/(Serve in|serve in|leads|about|experienced in) (Small groups|Adult Sabbath)/.test(cm)], [true,false]);
  c('all twenty-one demonstrated: "All twenty-one", not "21 of the twenty-one" (c)', [/All twenty-one came back demonstrated/.test(J(`__T.model('allhigh',{}).overview.join(' ')`)),/21 of the twenty-one/.test(J(`__T.model('allhigh',{}).overview.join(' ')`))], [true,false]);
  c('"From the report page, Lee can ask…" (d)', /Nobody has confirmed these gifts yet\. From the report page, Lee can ask two or three people who know them\./.test(J(`__T.model('teacher',{own:false,name:'Lee Park'}).pastor.observers`)), true);

  console.log('-- Spanish copy (V6) --');
  E(`LANG='es'`);
  c('one observer: "Lo que vio", not "vieron" (b)', /Respondió una persona que conoce a Lee \(P\.\)\. Lo que vio con más claridad/.test(J(`__T.model('teacher',{own:false,name:'Lee Park',observers:[{name:'Pat',ratings:{teach:4}}],obs:{teach:[4]}}).pastor.observers`)), true);
  c('answer 4 is "de manera constante" everywhere (d)', [J(`gfEvRows({ev:{desire:4,ability:4,fruit:4,conf:4}})[0].word`),J(`GF_OBS_SCALE.find(o=>o.v===4).es`)], ['de manera constante','De manera constante']);
  E(`openTool('gifts'); GFS={name:'María López',a:{'teach.0':3},h:{},i:5,sect:0,done:false,sent:false,ov:GF_TOTAL}; GF_VIEW='take'; GF_RESUMED=false; gfRenderResume(gfHost());`);
  c('the welcome back is an exclamation, ¡…! (c)', w.document.querySelector('#giftbody h2').textContent, '¡Qué bueno verle de nuevo, María!');
  E(`GF_OBS={first:'María',church:'',gifts:['teach'],r:{}}; gfRenderConfirmForm(gfHost());`);
  const ob=w.document.getElementById('giftbody').textContent;
  c('the observer page says whose life and whose answers (e)', [/María le pide que diga con sinceridad lo que usted ha visto en la vida de María/.test(ob),/Aquí no se muestran las respuestas de María/.test(ob),/sus propias respuestas/.test(ob)], [true,true,false]);
  // the church page tiles agree with their counts
  E(String.raw`(()=>{ const ch=uChurch(); ch.name='Iglesia'; uPersist();
    const add=(name,kind,minor,mid)=>{ GF_CTX={church:'Iglesia',churchId:ch.id,fac:[],min:{}}; GFS={name,a:__T.answers(kind),h:{},minor,memberId:mid,i:GF_TOTAL,done:true}; const c=gfEncode(); GF_CTX=null; gfRosterAdd(c); };
    add('Uno','allhigh',true,'m1'); add('Dos','teacher',false,'m2'); GF_VIEW='church'; gfRender(); })()`);
  const tiles=[...w.document.querySelectorAll('.gfr-stats > div')].map(d=>d.textContent.replace(/\s+/g,' ').trim());
  c('one under 18, one all-high: singular words on the tiles (a)', tiles.slice(1), ['1menor de 18','1respondió alto en casi todo']);
  E(`LANG='en'; GF_VIEW='church'; gfRender();`);
  c('the under-18 note no longer says "first names only to anyone they ask" (V7e)', /first names only/.test(w.document.getElementById('giftbody').textContent), false);

  console.log('-- the danger state is readable on the dark panel (V10) --');
  const lum=h=>{ const n=parseInt(h.slice(1),16), ch=[n>>16&255,n>>8&255,n&255].map(v=>{ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*ch[0]+0.7152*ch[1]+0.0722*ch[2]; };
  const ratio=(a,b)=>{ const x=lum(a), y=lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
  const darkRule=/:root\[data-theme="dark"\] \.gfdanger\{border-color:(#[0-9a-f]{6})!important;color:(#[0-9a-f]{6})!important\}/i.exec(html);
  c('a lighter red for the dark theme, at least 4.5:1 on the panel; the light theme keeps #c0392b', [!!darkRule,darkRule&&ratio(darkRule[2],'#0D1117')>=4.5,ratio('#c0392b','#FFFFFF')>=4.5,/\.gfdanger\{border-color:#c0392b!important;color:#c0392b!important/.test(html)], [true,true,true,true]);
  c('the armed label fits one line in Spanish', /Toque otra vez para eliminar'\);/.test(html)&&!/eliminarlo definitivamente/.test(html), true);

  console.log('-- symmetry (V11) --');
  c('the doors\' links sit at the foot of each door, level with each other (b)', /\.gfgo\{margin-top:auto;/.test(html), true);
  c('the ask-link box is as tall as its buttons (c)', /\.gfaskrow input\{min-width:0;height:44px;/.test(html), true);
  const rep=document=>0;
  { const d=w.document.createElement('div'); d.innerHTML=E(`gfReportHTML(__T.model('teacher',{}),true)`);
    c('the family chart sits beside the overview, the potential gifts across the width (a)', [!!d.querySelector('.gfr-lead2 .gfr-sumtext'),!!d.querySelector('.gfr-lead2 > .gfr-fams'),!!d.querySelector('.gfr-two'),!!d.querySelector('.gfr-sec + .gfr-pot, .gfr-pot')], [true,true,false,true]); }
  { const d=w.document.createElement('div'); d.innerHTML=E(`gfReportHTML(__T.model('low',{}),true)`);
    c('no gifts section: the family chart still shows', !!d.querySelector('.gfr-fams'), true); }

  console.log('-- the PDF (V11e, V12a) --');
  { const r=J(`(()=>{ LANG='en'; const M=__T.model('pot',{}); const d=gfReportPDF(M); const L=d.__gfLog.filter(l=>!l.hf);
      const M2=__T.model('low',{}), L2=gfReportPDF(M2).__gfLog.filter(l=>!l.hf);
      const cap=L2.find(l=>/^Each bar is the average/.test(l.t)), bar=cap&&L2.filter(l=>M2.families.some(f=>f.name===l.t)&&l.p===cap.p&&l.y<cap.y).pop();   // the last bar label above it (the cover legend names the families too)
      return {pot:M.potential.map(p=>p.name),cap:cap?{x0:cap.x0,p:cap.p,y:cap.y}:null,bar:bar?{x0:bar.x0,p:bar.p,y:bar.y}:null,
        lone:L.filter(l=>/^·? ?\d{1,3}$/.test(l.t.trim())).map(l=>l.t),cap2:M2.familyCaption}; })()`);
    c('the profile has a long-named potential gift', r.pot.some(n=>/Mission and pioneering ministry|Encouragement and exhortation/.test(n)), true);
    c('a potential gift\'s score never sits alone on a line (e)', r.lone, []);
    c('"Each bar is the average…" prints under the bars, in their column (a)', [r.cap2,!!r.cap,r.cap&&r.bar&&r.cap.p===r.bar.p,r.cap&&r.bar&&Math.abs(r.cap.x0-r.bar.x0)<2,r.cap&&r.bar&&r.cap.y>r.bar.y], [true,true,true,true,true]); }

  console.log('-- a disarmed delete takes its warning with it (V13) --');
  // v10.57.1 (stale, not a regression): the pastor (7 Oct 2026), "you don't need … check for new results that should just populate whenever someone finishes … instead of having Open And delete … that circular graph … we don't need the sample report anymore … take it myself doesn't need to be there … we need to clear out the clutter" (Delete is in the report itself)
  E(String.raw`(()=>{ LANG='en'; GF_VIEW='roster'; gfRender(); })()`);
  w.document.querySelector('.gfrosterrow[data-gf-open]').click();
  const del=w.document.getElementById('gfpdel'), label=del.textContent;
  del.click();
  c('armed: the warning is shown', /from this device/.test(w.document.getElementById('giftbody').textContent), true);
  await sleep(5200);
  c('five seconds later: the button and the warning both reset', [del.textContent,/from this device/.test(w.document.getElementById('giftbody').textContent)], [label,false]);

  console.log('-- the report\'s print rules, only while the gifts panel is shown (tests F5) --');
  const print=(html.match(/@media print\{[\s\S]*?\n\}/g)||[]).join('\n');
  c('every print rule that hides the page chrome for a report asks for a shown #gifts', [/body:has\(\.gfrep\)/.test(print),/html:has\(\.gfrep\)/.test(print),/body:has\(#gifts:not\(\[hidden\]\) \.gfrep\) footer\{display:none\}/.test(print)], [false,false,true]);

  c('no page errors', errs, []);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},1500);
