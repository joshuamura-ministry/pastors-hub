// Spiritual Gifts, decisions the pastor made after the v10.37 review:
//   2. an under-18 is offered only the ministries in GF_YOUTH_MIN, each shown
//      "alongside an adult" (two of them "as a helper"): church matches, other
//      ministries, never a ministry worth starting, the pastor's staffing
//      lists (flagged "with an adult") and the PDF;
//   3. the heart lifts a church ministry named in GF_HEART[].min (strongly
//      +15, somewhat +6) in the ranking only, never in the gift-fit %, and the
//      card says "Your heart: …" on screen and on paper, English and Spanish;
//   4. <html lang> follows the language;
//   5. a gift shown under "Close behind" is never also a potential gift to try.
// Built in jsdom with the jspdf devDependency for the paper checks.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const jspdf=require('jspdf');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,400));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const allErrs=[];
function page(url,{lang}={}){
  const errs=[]; allErrs.push(errs); const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:url||'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.print=()=>{}; w.jspdf=jspdf;
      if(lang) w.localStorage.setItem('terrain-lang',lang);
      w.fetch=async(u)=>{ if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,D:w.document,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`))};
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{ try{
  const P=page(); await sleep(300);
  const {E,J,D}=P;
  E(String.raw`
  window.__T={};
  __T.PROFILES={
    teacher:{teach:[4,4,3,3,4],shep:[4,3,3,3,3],encour:[3,3,3,2,2],hosp:[4,3,2,-1,-1],wisdom:[3,3,2,2,2],mercy:[3,2,2,1,2],inter:[3,2,-1,-1,-1]},
    maker:{creative:[4,4,4,3,4],helps:[3,4,3,3,3],serve:[4,3,3,2,3],evang:[3,2,-1,-1,-1],hosp:[3,3,2,2,-1],teach:[2,3,2,2,2]},
    organiser:{admin:[4,4,4,4,4],leader:[4,4,3,4,3],giving:[3,3,3,3,3],faith:[4,3,3,2,3],wisdom:[3,3,3,3,3],reconcile:[3,3,2,3,2],mission:[3,3,2,2,2]},
    carer:{mercy:[4,4,4,4,4],healing:[4,4,3,3,4],inter:[4,3,4,3,3],shep:[3,3,3,3,3],serve:[3,3,3,2,3]}
  };
  __T.answers=function(kind,seed){
    const a={}; let s=seed||7; const r=()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; };
    GIFTS.forEach((g,gi)=>{ let v;
      if(kind==='allhigh') v=[4,4,3,4,4].map((x,k)=>(gi+k)%9===0?3:x);
      else if(kind==='untested') v=[3,3,-1,-1,-1].map((x,k)=>(gi%3===0&&k<2)?2:x);
      else if(kind==='flat') v=[2,2,2,2,2].map((x,k)=>(gi+k)%4===0?3:x);
      else if(kind==='random'){ const bias=r(); v=[0,1,2,3,4].map(()=>{ const x=r(); return x<0.08?-1:Math.max(0,Math.min(4,Math.round(bias*4+(r()-0.5)*2))); }); }
      else { const hi=__T.PROFILES[kind]; v=(hi&&hi[g.id])||[1+gi%3,1+(gi*7)%3,gi%2,(gi*5)%3,gi%3]; }
      v.forEach((x,k)=>a[g.id+'.'+k]=x); });
    return a; };
  // A church that runs every ministry there is, so nothing is filtered out for want of it.
  __T.ALL=(()=>{ const min={}; GF_MIN.forEach((m,i)=>min[m.n]=i%3?'r':'s');
    return {church:'Bucks County SDA',fac:['kitchen','classrooms','gym','stage','av','center','vehicle','grounds'],churchId:'cid',min,needs:[],area:'',year:null}; })();
  __T.FOUR={church:'Bucks County SDA',fac:['classrooms'],churchId:'cid',needs:[],area:'',year:null,
    min:{'Small groups':'r','Youth ministry':'r','Adult Sabbath School teaching':'r','Children\u2019s Sabbath School':'r'}};
  __T.model=function(kind,seed,o){ o=o||{}; const a=__T.answers(kind,seed); const S=gfScores(a);
    return gfReportModel(S,null,{own:o.own!==false,name:o.name||'Sam Youth',date:'2026-09-28',heart:o.heart||{},minor:!!o.minor,
      flags:gfFlags(a),ctx:o.ctx===undefined?null:o.ctx}); };
  __T.pdfText=function(M){ const d=gfReportPDF(M,{compress:false}); const L=d.__gfLog;
    const out=L.filter(l=>l.x0<l.bx0-0.5||l.x1>l.bx1+0.5||l.x0<53.5||l.x1>558.5||(!l.hf&&(l.y<70||l.y>734.5))).map(l=>l.t.slice(0,40)+' @'+l.p);
    const B=L.filter(l=>!l.hf), clash=[];
    for(let i=0;i<B.length;i++) for(let j=i+1;j<B.length;j++){ const a=B[i],b=B[j];
      if(a.p===b.p&&Math.abs(a.y-b.y)<4.5&&Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)>1) clash.push(a.t.slice(0,24)+' / '+b.t.slice(0,24)+' @'+a.p); }
    return {text:L.map(l=>l.t).join('\n'),out,clash,n:d.getNumberOfPages()}; };
  `);
  const MIN=J(`GF_MIN.map(m=>m.n)`);

  // ============================================================ 2. under 18
  console.log('-- the under-18 list --');
  const Y=J(`GF_YOUTH_MIN`), YN=Y.map(y=>y.n);
  c('the pastor’s list, in his order', YN, ['Children’s Sabbath School','Adventurers','Pathfinders','Vacation Bible School','Youth ministry','Greeting and hospitality',
    'Community services and food distribution','Worship and music','Sound, livestream and video','Social media and communication','Prayer ministry',
    'Senior-adult ministry','Health ministry','Small groups','Event coordination','Community outreach','Public evangelism support']);
  c('every one an exact GF_MIN name, none twice', [YN.filter(n=>!MIN.includes(n)),new Set(YN).size], [[],17]);
  c('as a helper: Children’s Sabbath School and Adventurers only', Y.filter(y=>y.helper).map(y=>y.n), ['Children’s Sabbath School','Adventurers']);
  c('each has its Spanish name', YN.filter(n=>!E(`!!(GF_MIN_ES[${JSON.stringify(n)}]&&GF_MIN_ES[${JSON.stringify(n)}].n)`)), []);
  const NONYOUTH=MIN.filter(n=>!YN.includes(n));

  console.log('-- a minor’s report: only the list, alongside an adult, nothing worth starting --');
  const cases=[]; for(const k of ['teacher','maker','organiser','carer','allhigh','flat','untested']) cases.push([k,0]); for(let s=1;s<=8;s++) cases.push(['random',s]);
  for(const lang of ['en','es']){
    E(`LANG='${lang}'`);
    const R=J(`(()=>{ const out=[]; ${JSON.stringify(cases)}.forEach(([k,sd],i)=>{ [true,false].forEach(own=>{
        const M=__T.model(k,sd,{own,minor:true,ctx:__T.ALL,heart:{children:2,poor:2,seniors:1,teens:1}});
        const rows=[...(M.local?M.local.rows:[]),...(M.serve?M.serve.rows:[])];
        out.push({k,sd,own,keys:rows.map(r=>r.key),more:M.local?M.local.more:[],openings:M.openings,adult:rows.map(r=>[r.key,r.adult]),
          ninety:M.ninety.basis,q:M.pastor?M.pastor.question:'',steps:M.ninety.steps.map(s=>s.text).join(' ')}); }); });
      return out; })()`);
    const moreKeys=R.flatMap(r=>r.more);   // display names; in English they are the keys
    c(`${lang}: no ministry outside the list, in church matches or other ministries`, R.flatMap(r=>r.keys.filter(k=>!YN.includes(k)).map(k=>r.k+r.sd+':'+k)), []);
    if(lang==='en') c('en: nor in "Also on offer there"', moreKeys.filter(n=>!YN.includes(n)), []);
    c(`${lang}: never a ministry worth starting`, R.filter(r=>r.openings!==null).length, 0);
    const want=n=>{ const h=Y.find(y=>y.n===n).helper;
      return lang==='es'?(h?'como ayudante, junto a un adulto':'junto a un adulto'):(h?'as a helper, alongside an adult':'alongside an adult'); };
    c(`${lang}: every one says ${lang==='es'?'"junto a un adulto"':'"alongside an adult"'} (as a helper for two)`, R.flatMap(r=>r.adult.filter(([k,t])=>t!==want(k)).map(([k,t])=>k+'='+t)), []);
    c(`${lang}: the reports are not empty of ministries (the check means something)`, [R.filter(r=>r.keys.length).length>=R.length-2, R.some(r=>r.adult.some(([k])=>k==='Children’s Sabbath School'||k==='Adventurers'))], [true,true]);
    if(lang==='en'){
      c('en: the first ninety days and the pastor’s question name only a ministry on the list', R.flatMap(r=>NONYOUTH.filter(n=>(r.steps+' '+r.q).includes(n)).map(n=>r.k+r.sd+':'+n)), []);
    }
  }
  E(`LANG='en'`);
  const A=J(`(()=>{ const out=[]; ${JSON.stringify(cases)}.forEach(([k,sd])=>{ const M=__T.model(k,sd,{own:true,minor:false,ctx:__T.ALL});
      const rows=[...(M.local?M.local.rows:[]),...(M.serve?M.serve.rows:[]),...(M.openings?M.openings.rows:[])];
      out.push({keys:rows.map(r=>r.key),adult:rows.filter(r=>r.adult).length}); }); return out; })()`);
  c('an adult, same church: ministries off the list still offered, and no "alongside an adult"', [A.some(r=>r.keys.some(k=>NONYOUTH.includes(k))),A.reduce((a,r)=>a+r.adult,0)], [true,0]);
  const AO=J(`(()=>{ const M=__T.model('organiser',0,{own:true,minor:false,ctx:{...__T.FOUR,min:{'Small groups':'r'}}}); return M.openings?M.openings.rows.length:0; })()`);
  const MO=J(`(()=>{ const M=__T.model('organiser',0,{own:true,minor:true,ctx:{...__T.FOUR,min:{'Small groups':'r'}}}); return M.openings; })()`);
  c('an adult may be shown ministries worth starting; the same answers under 18 are shown none', [AO>0,MO], [true,null]);
  // on screen
  const H=J(`(()=>{ const d=document.createElement('div'); d.innerHTML=gfReportHTML(__T.model('teacher',0,{own:true,minor:true,ctx:__T.ALL,heart:{children:2}}),true);
    const mins=[...d.querySelectorAll('.gfr-church .gfr-min,.gfr-serve .gfr-min')];
    const a=document.createElement('div'); a.innerHTML=gfReportHTML(__T.model('teacher',0,{own:true,minor:false,ctx:__T.ALL}),true);
    return {n:mins.length,badges:mins.map(m=>[...m.querySelectorAll('.gfb.u18')].map(x=>x.textContent).join(', ')),open:!!d.querySelector('.gfr-open'),
      adultBadges:a.querySelectorAll('.gfr-min .gfb.u18').length}; })()`);
  c('on screen: every ministry card carries the badge, and there is no "Not yet at …" section', [H.n>2,H.badges.every(b=>/alongside an adult$/.test(b)),H.open], [true,true,false]);
  c('an adult’s cards carry none', H.adultBadges, 0);
  const EM=J(`(()=>{ const M=__T.model('teacher',0,{own:true,minor:true,ctx:{...__T.FOUR,min:{'Treasury and stewardship':'r','Member visitation':'s','Adult Sabbath School teaching':'r'}}}); return {rows:M.local.rows.length,empty:M.local.empty,more:M.local.more}; })()`);
  c('a church running nothing on the list: no rows, and a word for a young person', [EM.rows,EM.more,EM.empty], [0,[],'Nothing Bucks County SDA runs that suits someone under 18 lines up strongly with these gifts yet. Ask a youth leader where you could help alongside an adult.']);
  // Product review: the "Also on offer there" line names ministries too, so an under-18 is told there as well.
  const MT=J(`(()=>{ const y=__T.model('teacher',0,{own:true,minor:true,ctx:__T.ALL}), a=__T.model('teacher',0,{own:true,minor:false,ctx:__T.ALL});
    const d=document.createElement('div'); d.innerHTML=gfReportHTML(y,true);
    LANG='es'; const ye=__T.model('teacher',0,{own:true,minor:true,ctx:__T.ALL}); LANG='en';
    return {y:y.local.moreText||'',a:a.local.moreText||'',ye:ye.local.moreText||'',shown:(d.querySelector('.gfr-church .gfmore')||{}).textContent||'',pdf:__T.pdfText(y).text}; })()`);
  c('"Also on offer there": an under-18 is told each is alongside an adult (EN, ES, on screen, on paper); an adult is not',
    [MT.y.startsWith('Also on offer there, further down the match, each alongside an adult: '),MT.ye.startsWith('También se ofrece allí, con menor coincidencia, siempre junto a un adulto: '),
     MT.shown===MT.y,MT.pdf.split('\n').join(' ').includes('each alongside an adult:'),MT.a.startsWith('Also on offer there, further down the match: ')],
    [true,true,true,true,true]);
  // on paper
  for(const lang of ['en','es']){
    E(`LANG='${lang}'`);
    const PD=J(`__T.pdfText(__T.model('teacher',0,{own:false,minor:true,name:'Sam Youth',ctx:__T.ALL,heart:{children:2,teens:2}}))`);
    const names=lang==='en'?NONYOUTH:NONYOUTH.map(n=>E(`gfMinName(${JSON.stringify(n)})`));
    c(`PDF ${lang}: the pills say ${lang==='es'?'JUNTO A UN ADULTO':'ALONGSIDE AN ADULT'}`, (PD.text.match(lang==='es'?/JUNTO A UN ADULTO/g:/ALONGSIDE AN ADULT/g)||[]).length>=3, true);
    c(`PDF ${lang}: no ministry off the list anywhere in it`, names.filter(n=>PD.text.includes(n)), []);
    c(`PDF ${lang}: no "worth starting" section`, /NOT YET AT|TODAVÍA NO EXISTE/.test(PD.text), false);
    c(`PDF ${lang}: every line inside its box, none printed over another`, [PD.out,PD.clash], [[],[]]);
  }
  E(`LANG='en'`);

  console.log('-- the pastor’s staffing lists --');
  const ST=J(`(()=>{ const mk=(name,kind,minor)=>{ const S=gfScores(__T.answers(kind)); return {name,S,P:gfProfile(S),minor,confirmed:true,willing:true,hours:3}; };
    const staff=gfStaffing([mk('Ana Adult','teacher',false),mk('Sam Youth','teacher',true)]);
    const sam=staff.filter(s=>[...s.ready,...s.could].some(x=>x.n==='Sam Youth'));
    const ana=staff.filter(s=>[...s.ready,...s.could].some(x=>x.n==='Ana Adult'));
    return {sam:sam.map(s=>s.n),flag:sam.every(s=>[...s.ready,...s.could].filter(x=>x.n==='Sam Youth').every(x=>x.minor===true)),
      ana:ana.map(s=>s.n),anaFlag:ana.some(s=>[...s.ready,...s.could].some(x=>x.n==='Ana Adult'&&x.minor))}; })()`);
  c('an under-18 is listed only under ministries on the list, and flagged', [ST.sam.length>0,ST.sam.filter(n=>!YN.includes(n)),ST.flag], [true,[],true]);
  c('an adult with the same answers is listed beyond it, unflagged', [ST.ana.some(n=>NONYOUTH.includes(n)),ST.anaFlag], [true,false]);
  E(String.raw`(()=>{ const ch=uChurch(); ch.name='Bucks County SDA'; uPersist();
    const add=(name,kind,minor,mid)=>{ GF_CTX={church:'Bucks County SDA',churchId:ch.id,fac:[],min:{}};
      GFS={name,a:__T.answers(kind),h:{},minor,memberId:mid,i:GF_TOTAL,done:true}; const c=gfEncode(); GF_CTX=null; gfRosterAdd(c,{minor}); };
    add('Ana Adult','teacher',false,'y1'); add('Sam Youth','teacher',true,'y2');
    GFS={name:'',a:{},h:{},i:0,sect:-1,done:false,sent:false,ov:GF_TOTAL}; openTool('gifts'); GF_VIEW='church'; gfRender(); })()`);
  const staffCards=lang=>[...D.querySelectorAll('#giftbody .gfcard')].filter(cd=>/^(Who could staff what|Only untested people available|Quién podría atender qué|Solo hay personas sin probar)$/.test((cd.querySelector('h3')||{}).textContent||''));
  { const blocks=staffCards().flatMap(cd=>[...cd.querySelectorAll('.gfrec,.gfcov')]);
    const withSam=blocks.filter(b=>/Sam Youth/.test(b.textContent));
    c('the church page: Sam appears in the staffing lists, always “with an adult”', [withSam.length>0,withSam.every(b=>/Sam Youth \((\d+%, )?with an adult\)/.test(b.textContent))], [true,true]);
    c('…and only beside a ministry on the list', withSam.map(b=>b.querySelector('b').textContent).filter(n=>!YN.includes(n)), []); }
  E(`LANG='es'; gfRender();`);
  { const withSam=staffCards().flatMap(cd=>[...cd.querySelectorAll('.gfrec,.gfcov')]).filter(b=>/Sam Youth/.test(b.textContent));
    c('…in Spanish: “con un adulto”', [withSam.length>0,withSam.every(b=>/Sam Youth \((\d+%, )?con un adulto\)/.test(b.textContent))], [true,true]); }
  E(`LANG='en'; GF_VIEW='roster';`);
  // The Community Survey's "Possible team members" on a ministry card is a staffing list too.
  const UM=J(`(()=>{ const vbs=SIGNATURE.find(x=>x.n==='Vacation Bible School'), other=SIGNATURE.find(x=>x.n!=='Vacation Bible School'&&(uReq(x).skills||[]).length);
    const ch=uChurch(); const sk=[...new Set([...(uReq(vbs).skills||[]),...(uReq(other).skills||[])])];
    ch.members=[{id:'tm1',name:'Teen Tim',minor:true,skills:sk,gifts:[]},{id:'am1',name:'Adult Ann',skills:sk,gifts:[]}]; uPersist();
    const names=x=>uMatches(x).map(m=>m.p.name).sort();
    return {vbs:names(vbs),other:names(other),otherName:other.n,card:uCard(vbs).includes('Teen Tim</b> (with an adult)')}; })()`);
  c('survey ministry cards: an under-18 is suggested only for one on the list, “with an adult”', [UM.vbs,UM.other,UM.card], [['Adult Ann','Ana Adult','Sam Youth','Teen Tim'],['Adult Ann'],true]);
  // Product review: "Pathfinder & Adventurer club, open to the neighborhood" is Pathfinders and Adventurers under another name.
  const PF=J(`(()=>{ const x=SIGNATURE.find(s=>s.id==='pathfinders'), car=SIGNATURE.find(s=>s.id==='car-care'), ch=uChurch();
    const sk=[...new Set([...(uReq(x).skills||[]),...(uReq(car).skills||[])])];
    ch.members=[{id:'tm1',name:'Teen Tim',minor:true,skills:sk,gifts:[]},{id:'am1',name:'Adult Ann',skills:sk,gifts:[]}]; uPersist();
    const names=s=>uMatches(s).map(m=>m.p.name);
    return {pf:names(x).includes('Teen Tim'),adult:names(x).includes('Adult Ann'),card:uCard(x).includes('Teen Tim</b> (with an adult)'),car:names(car).includes('Teen Tim'),carAdult:names(car).includes('Adult Ann')}; })()`);
  c('…the Pathfinder & Adventurer club card suggests the under-18, “with an adult”; the car care day still does not', PF, {pf:true,adult:true,card:true,car:false,carAdult:true});

  // ============================================================ 3. the heart
  console.log('-- the heart lifts a church ministry, never its % --');
  const HL=J(`(()=>{ const S=gfScores(__T.answers('teacher')), P=gfProfile(S);
    const base=gfLocal(S,P.core,__T.ALL,{}); const pct={}; base.forEach(r=>pct[r.n]=r.pct);
    const res=GF_HEART.map(q=>{ const rows=gfLocal(S,P.core,__T.ALL,{[q.k]:2}), one=gfLocal(S,P.core,__T.ALL,{[q.k]:1});
      const moved=q.min.filter(n=>rows.findIndex(r=>r.n===n)<base.findIndex(r=>r.n===n));
      return {k:q.k,samePct:rows.every(r=>r.pct===pct[r.n])&&one.every(r=>r.pct===pct[r.n]),
        bonus:rows.filter(r=>r.hb).map(r=>r.n).sort().join('|')===q.min.slice().sort().join('|')&&rows.every(r=>r.hb===0||(r.hb===15&&r.heartKey===q.k&&r.heartLevel===2)),
        one:one.filter(r=>r.hb).every(r=>r.hb===6&&r.heartLevel===1)&&one.some(r=>r.hb===6),
        order:rows.every((r,i)=>!i||(rows[i-1].pct+rows[i-1].hb)>=(r.pct+r.hb)),moved:moved.length}; });
    return {res,none:base.every(r=>r.hb===0&&r.heartKey===null)}; })()`);
  c('no heart answered: no bonus, no heart named', HL.none, true);
  c('for every heart: the gift-fit % never changes', HL.res.filter(r=>!r.samePct).map(r=>r.k), []);
  c('strongly drawn: +15 on exactly the ministries GF_HEART names for it', HL.res.filter(r=>!r.bonus).map(r=>r.k), []);
  c('somewhat drawn: +6', HL.res.filter(r=>!r.one).map(r=>r.k), []);
  c('ordered by gift fit plus the heart', HL.res.filter(r=>!r.order).map(r=>r.k), []);
  c('and it does reorder (most hearts move one of their ministries up)', HL.res.filter(r=>r.moved>0).length>=8, true);
  for(const lang of ['en','es']){
    E(`LANG='${lang}'`);
    const RO=J(`(()=>{ const a=__T.model('teacher',0,{own:true,ctx:__T.FOUR}), b=__T.model('teacher',0,{own:true,ctx:__T.FOUR,heart:{children:2}});
      const d=document.createElement('div'); d.innerHTML=gfReportHTML(b,true);
      return {a:a.local.rows.map(r=>[r.key,r.pct,r.heartName]),b:b.local.rows.map(r=>[r.key,r.pct,r.heartName]),
        chips:[...d.querySelectorAll('.gfr-church .gfr-chip.h')].map(x=>x.textContent),pdf:__T.pdfText(b),ia:a.local.intro,ib:b.local.intro}; })()`);
    const heartName=lang==='es'?'niños':'children', lab=lang==='es'?'Su corazón':'Your heart';
    c(`${lang}: without a heart answer, the church matches in gift-fit order`, RO.a.map(r=>r[0]), ['Small groups','Youth ministry','Children’s Sabbath School','Adult Sabbath School teaching']);
    c(`${lang}: drawn to children, Children’s Sabbath School comes first — its % unchanged`, [RO.b.map(r=>r[0]),RO.b[0][1]===RO.a[2][1]],
      [['Children’s Sabbath School','Small groups','Youth ministry','Adult Sabbath School teaching'],true]);
    c(`${lang}: every % is the same as before`, RO.b.map(r=>r[1]).sort(), RO.a.map(r=>r[1]).sort());
    c(`${lang}: the card says "${lab}: ${heartName}", the others nothing`, [RO.b.map(r=>r[2]),RO.chips], [[heartName,'','',''],[`${lab}: ${heartName}`]]);
    c(`${lang}: on paper too`, [RO.pdf.text.includes(`${lab}: ${heartName}`),RO.pdf.out,RO.pdf.clash], [true,[],[]]);
    const says=lang==='es'?' y según las personas hacia las que se inclina su corazón.':', and by the people you said you are drawn to.';
    c(`${lang}: the section says the heart counts in the order only when it moved one`, [RO.ia.endsWith(says),RO.ib.endsWith(says)], [false,true]);
  }
  E(`LANG='en'`);
  const MH=J(`(()=>{ const M=__T.model('teacher',0,{own:false,minor:true,ctx:__T.FOUR,heart:{children:2}}); const d=document.createElement('div'); d.innerHTML=gfReportHTML(M,false);
    const r=[...d.querySelectorAll('.gfr-church .gfr-min')].find(x=>/Children’s Sabbath School/.test(x.textContent));
    return {first:M.local.rows[0].key,adult:M.local.rows[0].adult,keys:M.local.rows.map(x=>x.key),badges:r&&[...r.querySelectorAll('.gfb.u18')].map(x=>x.textContent),chip:r&&r.querySelector('.gfr-chip.h').textContent}; })()`);
  c('a minor drawn to children: first, as a helper alongside an adult (two badges on screen), with the heart named', MH, {first:'Children’s Sabbath School',adult:'as a helper, alongside an adult',
    keys:['Children’s Sabbath School','Small groups','Youth ministry'],badges:['as a helper','alongside an adult'],chip:'Your heart: children'});

  // ============================================================ 4. <html lang>
  console.log('-- <html lang> follows the language --');
  const Les=page('https://pastorshub.org/',{lang:'es'}), Len=page('https://pastorshub.org/',{lang:'en'}), Lno=page('https://pastorshub.org/');
  await sleep(400);
  c('Spanish chosen: lang="es"; English: "en"; nothing chosen: "en"', [Les.D.documentElement.lang,Len.D.documentElement.lang,Lno.D.documentElement.lang], ['es','en','en']);
  Lno.E(`gfLangFrom('es')`);
  c('a member’s Spanish report switches it to "es"', Lno.D.documentElement.lang, 'es');
  const Lk=page('https://pastorshub.org/#gifts~es'); await sleep(400);
  c('a member link ending ~es opens with lang="es"', Lk.D.documentElement.lang, 'es');

  // ============================================================ 5. Close behind ≠ potential
  console.log('-- a "Close behind" gift is never also a potential gift to try --');
  for(const lang of ['en','es']){
    E(`LANG='${lang}'`);
    const CB=J(`(()=>{ const bad=[]; let withSup=0; ${JSON.stringify([...cases,['untested',0],['flat',3]])}.forEach(([k,sd])=>{ const M=__T.model(k,sd,{own:true});
      const sup=M.support.map(s=>s.id), core=M.core.map(s=>s.id); if(sup.length&&M.potential.length) withSup++;
      M.potential.forEach(p=>{ if(sup.includes(p.id)||core.includes(p.id)) bad.push(k+sd+':'+p.id); }); }); return {bad,withSup}; })()`);
    c(`${lang}: no potential gift is a leading or close-behind gift`, CB.bad, []);
    c(`${lang}: reports with both sections were checked`, CB.withSup>=3, true);
  }
  E(`LANG='en'`);
  const SP=J(`(()=>{ const M=__T.model('untested',0,{own:true,name:'Sam Ortiz'}); const d=document.createElement('div'); d.innerHTML=gfReportHTML(M,true);
    const behind=[...d.querySelectorAll('.gfr-card')].filter(x=>/Close behind/.test(x.textContent)).map(x=>x.querySelector('.gfr-cn b').textContent);
    const pot=[...d.querySelectorAll('.gfr-pot li')].map(li=>li.querySelector('b').textContent);
    return {sup:M.support.map(s=>s.label),behind,pot,overlap:behind.filter(n=>pot.some(p=>p.startsWith(n+' ('))).length}; })()`);
  c('the sparse report: two close-behind gifts, three potential gifts, none of them shared', [SP.sup,SP.behind.length,SP.pot.length,SP.overlap], [['emerging','emerging'],2,3,0]);

  c('no page errors', allErrs.flat(), []);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
