// Spiritual Gifts PDF, page 1. When the side-by-side "Potential gifts to try"
// block would not fit under the evidence cards, the whole block used to move
// to page 2 and leave 120–150pt empty at the foot of page 1. Now:
//   - potential gifts go one to a row ("Try this" beside its step) and carry
//     on over the page break, when the side-by-side block does not fit;
//   - a pair of evidence cards too tall for what is left goes wide, one card
//     to a row, when a wide card does fit;
//   - a block that fits is drawn exactly as before (side by side).
// Built in node with the jspdf devDependency, English and Spanish.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const jspdf=require('jspdf');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.fetch=()=>new Promise(()=>{}); w.jspdf=jspdf; }});
const w=dom.window, E=s=>w.eval(s), J=s=>JSON.parse(E(`JSON.stringify(${s})`));
setTimeout(()=>{ try{
  E(String.raw`
  window.__T={};
  __T.PROFILES={
    teacher:{teach:[4,4,3,3,4],shep:[4,3,3,3,3],encour:[3,3,3,2,2],hosp:[4,3,2,-1,-1],wisdom:[3,3,2,2,2],mercy:[3,2,2,1,2],inter:[3,2,-1,-1,-1]},
    organiser:{admin:[4,4,4,4,4],leader:[4,4,3,4,3],giving:[3,3,3,3,3],faith:[4,3,3,2,3],wisdom:[3,3,3,3,3],reconcile:[3,3,2,3,2],mission:[3,3,2,2,2]}};
  __T.answers=function(kind){ const a={};
    GIFTS.forEach((g,gi)=>{ let v;
      if(kind==='untested') v=[3,3,-1,-1,-1].map((x,k)=>(gi%3===0&&k<2)?2:x);
      else { const hi=__T.PROFILES[kind]; v=(hi&&hi[g.id])||[1+gi%3,1+(gi*7)%3,gi%2,(gi*5)%3,gi%3]; }
      v.forEach((x,k)=>a[g.id+'.'+k]=x); });
    return a; };
  __T.RICH={church:'Bucks County SDA',fac:['kitchen','classrooms'],churchId:'cid',
    min:{'Small groups':'s','Greeting and hospitality':'r','Adult Sabbath School teaching':'r','Community services and food distribution':'r','Children’s Sabbath School':'r','Sound, livestream and video':'r','Prayer ministry':'s'},
    needs:[{id:'kids',v:27,x:null},{id:'single-parent',v:35,x:null},{id:'lang-primary',v:19,x:'Spanish'},{id:'rent50',v:24,x:null},
      {id:'seniors-alone',v:9,x:null},{id:'shift-race',v:9,x:'Hispanic / Latino'},{id:'growth',v:470,x:null},{id:'older-area',v:41,x:null},
      {id:'gini',v:48,x:null},{id:'grief',v:9,x:'alone'},{id:'snap',v:17,x:null},{id:'college',v:22,x:null}],
    area:'Census Tract 2041.02',year:2024};
  __T.model=function(kind,o){ o=o||{}; const a=__T.answers(kind); const S=gfScores(a,o.obs||null);
    return gfReportModel(S,null,{own:o.own!==false,name:o.name||'María José López-Hernández',date:'2026-09-28',heart:o.heart||{},
      minor:!!o.minor,observers:o.observers||null,flags:gfFlags(a),ctx:o.ctx===undefined?null:o.ctx}); };
  __T.SC={
    rich:()=>__T.model('teacher',{ctx:__T.RICH,heart:{children:2,families:1,newcomers:1},observers:[{name:'Pat Leader',ratings:{teach:4,shep:3}},{name:'Ana Ruiz',ratings:{teach:3,shep:4}}],obs:{teach:[4,3],shep:[3,4]}}),
    pastor:()=>__T.model('organiser',{own:false,ctx:__T.RICH,heart:{poor:2,families:1},observers:[{name:'Pat Leader',ratings:{admin:4}}],obs:{admin:[4]}}),
    sparse:()=>__T.model('untested',{ctx:null,name:'Sam Ortiz'})
  };
  __T.build=function(sc,lang){ LANG=lang; const M=__T.SC[sc](); const d=gfReportPDF(M,{compress:false});
    return {n:d.getNumberOfPages(),log:d.__gfLog,potential:M.potential.map(p=>p.name+' · '+p.score),top:M.top.map(t=>t.name),try:M.labels.tryThis,potHead:M.labels.potential}; };`);
  const BOT=792-58, MX=54, CW=612-108;
  const run=(sc,lang)=>{
    const r=J(`__T.build('${sc}','${lang}')`);
    const body=r.log.filter(l=>!l.hf);
    const on=(p,t)=>body.filter(l=>l.p===p&&l.t===t);
    const p1=body.filter(l=>l.p===1);
    return {...r,body,on,free:Math.round(BOT-Math.max(...p1.map(l=>l.y))),
      over:r.log.filter(l=>l.x0<l.bx0-0.5||l.x1>l.bx1+0.5||l.x0<53.5||l.x1>558.5||(!l.hf&&(l.y>734.5||l.y<70))).length};
  };

  for(const lang of ['en','es']){
    console.log(`-- a member's own report, ${lang} --`);
    const R=run('rich',lang);
    const head=R.potHead.toUpperCase();
    c(`${lang}: three to six pages, every line inside its box`, [R.n>=3&&R.n<=6,R.over], [true,0]);
    c(`${lang}: the potential-gifts heading stays on page 1`, R.on(1,head).length, 1);
    const first=R.on(1,R.potential[0]);
    c(`${lang}: with the first potential gift under it`, first.length, 1);
    c(`${lang}: page 1 no longer ends with a third of it empty (under 90pt free, was ~150)`, R.free<90, true);
    const names=R.potential.map(n=>R.body.find(l=>l.t===n)).filter(Boolean);
    // Updated (review V3): the potential-gift texts now take turns between shorter
    // phrasings, so in Spanish the side-by-side block fits on page 1 and is drawn
    // as before. Whichever layout is chosen, it must be the right one; English
    // still exercises the one-to-a-row path over the page break.
    const side=names.length===3&&new Set(names.map(l=>Math.round(l.y))).size===1&&names.every(l=>l.p===1);
    if(lang==='en') c('en: this report still takes the one-to-a-row path', side, false);
    if(side){
      c(`${lang}: the block fits on page 1, side by side, three columns`, new Set(names.map(l=>Math.round(l.x0))).size, 3);
    } else {
      c(`${lang}: the rest carry on at the top of page 2`, R.potential.slice(1).every(n=>R.on(2,n).length===1||R.on(1,n).length===1)&&R.potential.slice(1).some(n=>R.on(2,n).length===1), true);
      // one to a row: the name starts at the same x on every row, "Try this" sits beside the step
      c(`${lang}: one gift to a row, all from the same left edge`, [names.length,new Set(names.map(l=>Math.round(l.x0))).size], [3,1]);
      const tries=R.body.filter(l=>l.t===R.try.toUpperCase());
      c(`${lang}: "${R.try}" beside its step, on the same line`, tries.every(t=>R.body.some(l=>l.p===t.p&&Math.abs(l.y-t.y)<3&&l.x0>t.x0+80&&l.t!==t.t)), true);
    }
  }

  console.log('-- the pastor\'s copy: a pair of cards that will not fit goes wide --');
  const P=run('pastor','en');
  c('three to six pages, every line inside its box', [P.n>=3&&P.n<=6,P.over], [true,0]);
  // (the wheel on the cover names it too, far to the right; the card's name is at the left margin)
  const lead=P.on(1,P.top[0]).filter(l=>l.x0<MX+60);
  c('the first leading gift\'s card is on page 1', lead.length, 1);
  const desire=P.body.filter(l=>l.t==='Desire');
  c('drawn wide: its evidence sits to the right of the text, not under it', desire.length>=2&&desire[0].p===1&&desire[0].x0>MX+CW*0.5, true);
  c('the second card follows on page 2, also wide', [P.on(2,P.top[1]).filter(l=>l.x0<MX+60).length,desire[1].p,desire[1].x0>MX+CW*0.5], [1,2,true]);
  c('page 1 is not left a third empty (under 90pt free, was ~150)', P.free<90, true);

  console.log('-- a report where everything fits is drawn as before --');
  const S=run('sparse','en');
  // Updated (v10.37 decisions): a "Close behind" gift no longer repeats under
  // Potential gifts, so this report's third potential gift is now "Mission and
  // pioneering ministry", which wraps in its column. Each name's first line is
  // found after the section heading (the wheel on the cover names them too).
  const ph=S.body.findIndex(l=>l.t===S.potHead.toUpperCase()), afterHead=S.body.slice(ph+1);
  const sn=S.potential.map(n=>afterHead.find(l=>l.t===n||n.startsWith(l.t+' '))).filter(Boolean);
  c('three to six pages, every line inside its box', [S.n>=3&&S.n<=6,S.over], [true,0]);
  c('potential gifts side by side: one baseline, three columns', [sn.length,new Set(sn.map(l=>Math.round(l.y))).size,new Set(sn.map(l=>l.p)).size], [3,1,1]);
  c('"Try this" stays above its step in each column', S.body.filter(l=>l.t===S.try.toUpperCase()).length, 3);

  c('no page errors', errs, []);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},1500);
