// Spiritual Gifts sample report (v10.38.0): "See a sample report" on the
// pastor's landing draws the full member report for Alex Rivera, who is not a
// real person, so the pastor can show people what they will receive before
// they take it. Checked here: the button (English and Spanish) sits under the
// two doors without becoming a third door; the sample is drawn through the same
// path as a member's own report and every major section appears; the banner
// says it is a sample; nothing is written to localStorage or sessionStorage,
// nothing is fetched, and GFS, the roster and the church store are untouched
// (rendering it and downloading its PDF); Invite / Send / Email / Delete are
// not offered; Back returns to the landing; the PDF, made through Download PDF
// exactly as for a member, carries SAMPLE (MUESTRA) in the head of every page
// and is named Sample-Spiritual-Gifts-Report.pdf, while a real report still
// never says Sample; the made-up church and neighbourhood are used until the
// pastor's own church has a survey snapshot or marked ministries, and the
// banner says which is shown; Spanish throughout; no NaN / undefined and no
// sentence said twice (the report suite's checker).
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const jspdf=require('jspdf');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,500));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=6000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(20); } return false; }

// Every jsPDF save is caught here rather than written: name, bytes, and the
// drawn-line log the report keeps on the document.
let saved=null;
const realSave=jspdf.jsPDF.API.save;
jspdf.jsPDF.API.save=function(name){ const n=this.getNumberOfPages(), streams=[];
  for(let i=1;i<=n;i++) streams.push(this.internal.pages[i].join('\n'));
  const raw=this.output();
  saved={name,n,log:this.__gfLog||[],start:raw.slice(0,5),streams:streams.join('\n'),title:(raw.match(/\/Title \(([^)]*)\)/)||[])[1]||''};
  return this; };

function page({lang,store}={}){
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const fetches=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){}; w.print=()=>{ w.__printed=(w.__printed||0)+1; };
      if(lang) w.localStorage.setItem('terrain-lang',lang);
      if(store) w.localStorage.setItem('terrain-churches-v1',JSON.stringify(store));
      w.jspdf=jspdf;
      w.fetch=async(u)=>{ fetches.push(String(u)); if(/advise/.test(u)) return {ok:true,json:async()=>({enabled:false})}; return new Promise(()=>{}); }; }});
  const w=dom.window;
  // Writes to either storage, whoever makes them.
  const writes=[];
  const P=w.Storage.prototype;
  ['setItem','removeItem','clear'].forEach(k=>{ const f=P[k]; P[k]=function(...a){ writes.push(k+':'+(a[0]===undefined?'':a[0])); return f.apply(this,a); }; });
  return {w,D:w.document,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,fetches,writes};
}
// The report suite's reader: sentences as a reader meets them (paragraphs and
// table cells, Scripture set aside), with repeats, lower-case starts and any
// NaN / undefined / null / [object Object] in what is drawn.
const READ=String.raw`window.__read=function(root){
  const els=[...root.querySelectorAll('p,li,td,th,dd,dt,figcaption')].filter(e=>!e.closest('.gfverse')&&!(e.tagName==='LI'&&e.querySelector('p')));
  const all=[]; els.forEach(e=>e.textContent.replace(/\s+/g,' ').trim().replace(/([.!?])\s+/g,'$1\u0001').split('\u0001').forEach(x=>{ x=x.trim(); if(x) all.push(x); }));
  const seen=new Set(), dups=[], lows=[];
  all.forEach(x=>{ if(/^[a-záéíóúñü]/.test(x)) lows.push(x.slice(0,70)); if(x.length<25) return; if(seen.has(x)) dups.push(x.slice(0,90)); seen.add(x); });
  const text=root.textContent;
  const bad=(text.match(/[^\n]{0,40}\b(NaN|undefined|null|Infinity|\[object Object\])\b[^\n]{0,20}/g)||[]);
  return {dups,lows,bad,count:all.length};
};`;
const HEADS_EN=['Your gifts, and the evidence behind each','Your shape across the five families','Potential gifts to try','Where your gifts meet your neighborhood',
  'Where you could serve at Sample Church','Not yet at Sample Church — and you could be why it starts','Other ministries that fit your gifts',
  'Your leading gifts, read closely','Areas to grow','All twenty-one, strongest first','How to get involved','Keep this report'];
// v10.54.2: "Your first ninety days" is "How to get involved" (four steps), and a member's own report has no "What happens next"
// (the pastor: "Don't wait for a ministry [leader] to follow up … you go … and make the connection")
const HEADS_ES=['Sus dones y la evidencia de cada uno','Su perfil en las cinco familias','Dones por probar','Donde sus dones se encuentran con su vecindario',
  'Dónde podría servir en Iglesia de ejemplo','Todavía no existe en Iglesia de ejemplo, y usted podría ser la razón de que empiece','Otros ministerios que encajan con sus dones',
  'Sus dones principales, de cerca','Áreas para crecer','Los veintiún dones, del más fuerte al más débil','Cómo involucrarse','Guarde este informe'];

(async()=>{ try{
  // ================================================================ English
  const A=page();
  const {w,D,E,J}=A;
  await until(()=>E('typeof gfRenderSample==="function"&&typeof GIFTS_ES==="object"'));
  await sleep(300);
  c('no boot errors', A.errs, []);

  console.log('-- the sample member --');
  const G=J(`(()=>{ const a=GF_SAMPLE.answers, keys=Object.keys(a);
    const want=[]; GIFTS.forEach(g=>{ for(let k=0;k<GF_KINDS;k++) want.push(g.id+'.'+k); });
    return {n:keys.length,all:want.every(k=>Object.prototype.hasOwnProperty.call(a,k)),extra:keys.filter(k=>!want.includes(k)),
      valid:keys.every(k=>Number.isInteger(a[k])&&a[k]>=-1&&a[k]<=4),
      heart:Object.keys(GF_SAMPLE.heart).sort(),heartKeys:GF_HEART.map(h=>h.k).sort(),heartOk:Object.values(GF_SAMPLE.heart).every(v=>v===0||v===1||v===2),
      drawn:Object.values(GF_SAMPLE.heart).filter(v=>v>0).length,
      obs:GF_SAMPLE.observers.length,obsNamed:GF_SAMPLE.observers.every(o=>o.name&&o.ratings&&Object.keys(o.ratings).length),
      minor:GF_SAMPLE.minor,name:GF_SAMPLE.name,frozen:Object.isFrozen(GF_SAMPLE)&&Object.isFrozen(GF_SAMPLE.answers)&&Object.isFrozen(GF_SAMPLE.heart)&&Object.isFrozen(GF_SAMPLE.observers)}; })()`);
  c('Alex Rivera, an adult: all 105 answers, each 0-4 or -1', [G.name,G.minor,G.n,G.all,G.extra,G.valid], ['Alex Rivera',false,105,true,[],true]);
  c('all twelve heart questions, several of them drawn', [G.heart,G.heartOk,G.drawn>=4], [G.heartKeys,true,true]);
  c('two fictional people who confirmed, by name and rating', [G.obs,G.obsNamed], [2,true]);
  c('frozen: nothing can change the sample in place', G.frozen, true);
  const Mx=J(`(()=>{ const G=GF_SAMPLE, S=gfScores(G.answers,gfObsFrom(G.observers)), P=gfProfile(S);
    const M=gfReportModel(S,P,{own:true,name:G.name,sample:true,ctx:gfSampleCtx().ctx,heart:G.heart,observers:G.observers,flags:gfFlags(G.answers)});
    return {core:M.core.map(x=>[x.id,x.label]),support:M.support.map(x=>x.id),pot:M.potential.map(p=>p.label),untested:M.flags.untested,
      low:!!(M.growth&&M.growth.low),conf:M.confirmations.n,heartRoles:M.neighbourhood.roles.filter(r=>r.heartLevel>0).length,
      allHigh:M.flags.allHigh,shape:P.shape,sample:M.sample}; })()`);
  c('two demonstrated leading gifts that belong together: teaching and shepherding', Mx.core, [['teach','demonstrated'],['shep','demonstrated']]);
  c('one close behind, and gifts to try that are emerging and untested', [Mx.support.length,Mx.pot.includes('emerging'),Mx.pot.includes('untested')], [1,true,true]);
  c('some gifts untested, two clearly lowest, confirmed by two, not all-high', [Mx.untested>=2,Mx.low,Mx.conf,Mx.allHigh], [true,true,2,false]);
  c('the heart answers lift neighbourhood roles', Mx.heartRoles>=2, true);

  console.log('-- the landing --');
  E('openTool("gifts")');
  let h=D.getElementById('giftbody');
  // v10.56.2 (stale, not a regression): the pastor, "the sample report shouldn't just be there … if you click complete a demo … then the
  // sample report will show": none before the demo; "Fill in demo results" brings it (its member is one of the demo members)
  c('no sample report before the demo', !!h.querySelector('#gfsample'), false);
  h.querySelector('[data-gf-demo="fill"]').click();
  h=D.getElementById('giftbody');
  c('…the demo filled: its first member is the sample report\'s', [E('gfRoster().length'),E('gfRoster().some(r=>gfDecode(r.code).name==="Alex Rivera (sample)")')], [24,true]);
  // v10.57.1 (stale, not a regression): the pastor (7 Oct 2026), "you don't need … check for new results that should just populate whenever someone finishes … instead of having Open And delete … that circular graph … we don't need the sample report anymore … take it myself doesn't need to be there … we need to clear out the clutter"
  c('no "See a sample report" on the landing, even with the demo (every result opens as a report)', !!h.querySelector('#gfsample'), false);
  // v10.63.2 (stale): the doors are now two big buttons (.gfpair)
  c('the results still sit beneath the buttons', !!(h.querySelector('.gfpair').compareDocumentPosition(h.querySelector('.gfresults'))&4), true);

  console.log('-- opening it touches nothing --');
  // The pastor part-way through taking it himself, and one result on his list:
  // neither may move.
  E(`GFS.name='Pastor Test'; GFS.a={'teach.0':3,'shep.1':2}; GFS.i=2; gfSave();
     gfRosterAdd(gfEncode()); gfRender();`);
  h=D.getElementById('giftbody');
  const snap=()=>J(`({gfs:JSON.stringify(GFS),roster:JSON.stringify(gfRoster()),store:JSON.stringify(uStore()),
    ls:JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),ss:JSON.stringify(Object.keys(sessionStorage).sort().map(k=>[k,sessionStorage.getItem(k)])),
    model:GF_REPORT_MODEL?JSON.stringify(GF_REPORT_MODEL):null})`);
  const before=snap(), rosterN=J('gfRoster().length');
  // The spies are live: a write is seen, and the page did fetch while it booted.
  A.writes.length=0; E(`sessionStorage.setItem('spy-check','1'); sessionStorage.removeItem('spy-check')`);
  c('the storage spy sees writes, and the fetch spy saw the boot', [A.writes,A.fetches.length>0], [['setItem:spy-check','removeItem:spy-check'],true]);
  A.writes.length=0; const f0=A.fetches.length;
  E("GF_VIEW='sample'; gfRender();");   // v10.57.1: the sample report's own view, its button gone
  c('the sample view is open', E('GF_VIEW'), 'sample');
  h=D.getElementById('giftbody');
  c('no storage writes and no fetches while it renders', [A.writes,A.fetches.slice(f0)], [[],[]]);
  E(READ);
  const rep=h.querySelector('.gfrep');
  c('the member report is drawn (gfReportHTML), in English', [!!rep,rep&&rep.getAttribute('lang')], [true,'en']);
  const heads=[...h.querySelectorAll('h3.gfr-h')].map(x=>x.textContent);
  c('every major section is there', HEADS_EN.filter(t=>!heads.includes(t)), []);
  c('the wheel, the evidence bars, the family bars and all twenty-one', [!!h.querySelector('.gfr-wheel svg'),h.querySelectorAll('.gfr-card .gfr-evr').length,h.querySelectorAll('.gfr-br').length,h.querySelectorAll('.gfr-ar:not(.gfr-axis)').length], [true,12,5,21]);
  c('neighbourhood roles, church rows, openings, deep readings and "what this profile is not"', [h.querySelectorAll('.gfr-need').length,h.querySelectorAll('.gfr-church .gfr-min').length,h.querySelectorAll('.gfr-open .gfr-min').length,
    h.querySelectorAll('.gfr-deep article').length,!!h.querySelector('.gfr-low')], [3,4,3,2,true]);
  c('striped untested bars and their key', [h.querySelectorAll('.gfr-at i.unt').length>=2,!!h.querySelector('.gfr-key')], [true,true]);
  c('confirmed by two people who know them', /Confirmed by 2 people who know you \(G\., D\.\)\./.test(h.textContent), true);
  const bar=h.querySelector('#gfsampbar');
  c('the banner comes first in the report', !!bar&&rep.firstElementChild===bar, true);
  c('the banner says it is a sample, and whose it is not', bar&&bar.querySelector('.gfsampt').textContent, 'Sample report — Alex Rivera is not a real person. This is what a member receives when they finish.');
  c('…with a Back button, and the made-up context named', [!!bar.querySelector('[data-sampback]'),/made up as well/.test(bar.textContent),/Community Survey for your church/.test(bar.textContent)], [true,true,true]);
  c('the cover says Sample too', h.querySelector('.gfr-kick').textContent, 'Sample · Spiritual gifts report');
  c('the member\'s own copy: "Your spiritual gifts", no pastor block', [h.querySelector('.gfr-name').textContent,!!h.querySelector('.gfr-pastor')], ['Your spiritual gifts',false]);
  c('the meta line names Alex Rivera and Sample Church', /^Alex Rivera · Sample Church · /.test(h.querySelector('.gfr-meta').textContent), true);
  c('Download PDF, and nothing that sends, invites, emails or deletes', [!!h.querySelector('#gfpdf'),['gfemail','gfinvite','gfredo','gfsendbox','gfaskbox','gfdelmine','gfpdel','gfsend','gfcopy'].filter(id=>h.querySelector('#'+id))], [true,[]]);
  c('a way back at the foot as well', !!h.querySelector('#gfactions [data-sampback="foot"]'), true);
  const rd=J('__read(document.getElementById("giftbody"))');
  c('no NaN / undefined / null drawn, no sentence said twice, none starting in lower case', [rd.bad,rd.dups,rd.lows,rd.count>60], [[],[],[],true]);

  console.log('-- Download PDF, exactly as for a member --');
  saved=null;
  h.querySelector('#gfpdf').click();
  await until(()=>saved);
  c('a PDF was made and saved', !!saved&&saved.start, '%PDF-');
  c('named Sample-Spiritual-Gifts-Report.pdf', saved&&saved.name, 'Sample-Spiritual-Gifts-Report.pdf');
  const pages=[]; for(let i=1;i<=saved.n;i++) pages.push(saved.log.filter(l=>l.p===i&&l.hf).map(l=>l.t));
  c('three to six pages', saved.n>=3&&saved.n<=6, true);
  c('SAMPLE in the head of every page, beside the name', pages.map((p,i)=>p.includes('SAMPLE')&&p.includes('Spiritual Gifts Report · Alex Rivera')&&p.includes(`Page ${i+1} of ${saved.n}`)), pages.map(()=>true));
  c('the made-up church in the foot', pages.every(p=>p.includes('Sample Church')), true);
  c('the cover says Sample as well', saved.log.some(l=>!l.hf&&/^SAMPLE · SPIRITUAL GIFTS REPORT$/.test(l.t)), true);
  c('the document title says Sample', /Sample/.test(saved.title||''), true);
  const pdfText=saved.log.map(l=>l.t).join('\n');
  c('no undefined / NaN / null / [object in the PDF', [/\b(undefined|NaN|null)\b|\[object/.test(pdfText),/\b(undefined|NaN)\b|\[object/.test(saved.streams)], [false,false]);
  const outside=saved.log.filter(l=>l.x0<l.bx0-0.5||l.x1>l.bx1+0.5||l.x0<53.5||l.x1>558.5||(!l.hf&&(l.y<70||l.y>734.5))).map(l=>l.t.slice(0,40)+' @'+l.p);
  c('every line inside its box, the margins and the page (the SAMPLE pill included)', outside, []);
  c('every section is on paper', ['YOUR GIFTS, AND THE EVIDENCE BEHIND EACH','POTENTIAL GIFTS TO TRY','WHERE YOUR GIFTS MEET YOUR NEIGHBORHOOD','WHERE YOU COULD SERVE AT SAMPLE CHURCH',
    'HOW TO GET INVOLVED','ALL TWENTY-ONE, STRONGEST FIRST','YOUR LEADING GIFTS, READ CLOSELY','AREAS TO GROW'].filter(t=>!pdfText.includes(t)), []);   // v10.54.2: as above
  c('still nothing written and nothing fetched, after the PDF too', [A.writes,A.fetches.slice(f0)], [[],[]]);
  const after=snap();
  c('GFS, the roster, the church store, both storages and the last real report are as they were', Object.keys(before).filter(k=>before[k]!==after[k]), []);
  c('the roster did not gain the sample', J('gfRoster().length'), rosterN);

  console.log('-- a real report never says Sample --');
  const real=J(String.raw`(()=>{ const a=GF_SAMPLE.answers; const M=gfReportModel(gfScores(a),null,{own:true,name:'Maria Lopez',date:'2026-09-28',ctx:null,flags:gfFlags(a)});
    const d=gfReportPDF(M); const t=d.__gfLog.map(l=>l.t).join('\n'); const x=document.createElement('div'); x.innerHTML=gfReportHTML(M,true);
    return {file:gfPdfName(M),pdf:/\bSample\b|\bMuestra\b|\bSAMPLE\b/i.test(t),banner:!!x.querySelector('.gfsampbar'),kick:x.querySelector('.gfr-kick').textContent,back:!!x.querySelector('[data-sampback]'),sample:M.sample}; })()`);
  c('its own file name, no SAMPLE mark, no banner, no Back', [real.file,real.pdf,real.banner,real.back,real.sample], ['Maria-Lopez-Spiritual-Gifts-2026-09-28.pdf',false,false,false,false]);
  c('its cover kicker is the ordinary one', real.kick, 'Spiritual gifts report');

  console.log('-- Back --');
  h.querySelector('[data-sampback="top"]').click();
  h=D.getElementById('giftbody');
  // v10.63.2 (stale): the landing's doors are the two big buttons (.gfpair)
  c('Back at the top returns to the landing', [E('GF_VIEW'),!!h.querySelector('.gfpair'),!!h.querySelector('.gfrep')], ['roster',true,false]);
  E("GF_VIEW='sample'; gfRender();"); h=D.getElementById('giftbody');
  h.querySelector('[data-sampback="foot"]').click(); h=D.getElementById('giftbody');
  c('…and so does the one at the foot', [E('GF_VIEW'),!!h.querySelector('#gf-results')], ['roster',true]);
  // A redraw while it is open (gfRender from anywhere) keeps the sample on screen.
  E("GF_VIEW='sample'; gfRender();"); E('gfRender()'); h=D.getElementById('giftbody');
  c('a redraw keeps the sample open', !!h.querySelector('#gfsampbar'), true);

  console.log('-- the pastor\'s own church, when it has one --');
  E(`(()=>{ const ch=uChurch(); ch.name='Bucks County SDA';
    ch.share={...(ch.share||{}),church:'Bucks County SDA',min:{'Small groups':'r','Adult Sabbath School teaching':'r','Prayer ministry':'s'},
      needs:{list:[{id:'kids',v:22,x:null},{id:'shiftwork',v:31,x:null},{id:'seniors-alone',v:12,x:null},{id:'debt',v:21,x:'rent'}],area:'Census Tract 1006.01',year:2024}}; })()`);
  const own=J(`(()=>{ const X=gfSampleCtx(); return {own:X.own,church:X.ctx.church,needs:X.ctx.needs.map(n=>n.id),min:Object.keys(X.ctx.min).length,area:X.ctx.area,note:X.note,same:JSON.stringify({...gfCtxObj(),church:X.ctx.church})===JSON.stringify(X.ctx)}; })()`);
  c('his own church, neighbourhood and ministries: exactly what his members\' link carries', [own.own,own.church,own.needs,own.min,own.area,own.same], [true,'Bucks County SDA',['kids','shiftwork','seniors-alone','debt'],3,'Census Tract 1006.01',true]);
  c('and the banner says so', own.note, 'Shown with Bucks County SDA’s own neighborhood and ministries, just as your members will see them.');
  A.writes.length=0; const f1=A.fetches.length;
  E('GF_VIEW="sample"; gfRender();'); h=D.getElementById('giftbody');
  const ownHeads=[...h.querySelectorAll('h3.gfr-h')].map(x=>x.textContent);
  c('the sample reads his neighbourhood and his church', [ownHeads.includes('Where you could serve at Bucks County SDA'),/Census Tract 1006\.01/.test(h.querySelector('.gfr-nb .gfr-src').textContent),/Shown with Bucks County SDA/.test(h.querySelector('#gfsampbar').textContent)], [true,true,true]);
  c('still nothing written, nothing fetched', [A.writes,A.fetches.slice(f1)], [[],[]]);
  E(`uChurch().share.min={}`);
  c('a survey but no ministries marked: says how to add the church sections', J('gfSampleCtx().note'), 'Shown with Bucks County SDA’s own neighborhood, as your members will see it. Mark the ministries Bucks County SDA runs (under Share it with your members) and the church sections appear as well.');
  E(`uChurch().share.min={'Small groups':'r'}; uChurch().share.needs=null;`);
  c('ministries but no survey: says how to add the neighbourhood', J('gfSampleCtx().note'), 'Shown with the ministries you marked for Bucks County SDA. Run the Community Survey for Bucks County SDA and the neighborhood section appears as well.');
  E(`uChurch().share.min={}; uChurch().name='My church';`);
  c('neither: the made-up church and neighbourhood', J('(()=>{ const X=gfSampleCtx(); return [X.own,X.ctx.church,X.ctx.area,X.ctx.needs.length>=10,Object.keys(X.ctx.min).length>=6]; })()'), [false,'Sample Church','Sample neighborhood',true,true]);
  E(`uChurch().share.min={'Small groups':'r'};`);
  c('the placeholder "My church" is never printed as a name', J('(()=>{ const X=gfSampleCtx(); return [X.ctx.church,/My church/i.test(X.note)]; })()'), ['',false]);

  // ======================================= real reports, beside the sample
  // Drawn through the screens themselves, not a model built by hand: the
  // pastor's copy of a member's result (roster → open), and his own finished
  // report. Neither may carry any sample mark on screen or on paper, the
  // sample may not take the place of his report as the one the email paths
  // read, and his own answers — finished or part-way — come back as they were.
  console.log('-- real reports beside the sample --');
  const C=page();
  await until(()=>C.E('typeof gfRenderSample==="function"'));
  await sleep(300);
  C.E('openTool("gifts")');
  C.E(`(()=>{ const a={}; GIFTS.forEach((g,gi)=>{ for(let k=0;k<GF_KINDS;k++) a[g.id+'.'+k]=(gi*3+k)%5; });
    GFS.name='Maria Lopez'; GFS.a={...a}; GFS.done=true; const code=gfEncode();
    gfRosterAdd(code);
    const b={}; GIFTS.forEach((g,gi)=>{ for(let k=0;k<GF_KINDS;k++) b[g.id+'.'+k]=(gi+k*2)%5; });
    GFS.name='Joshua Mura'; GFS.a=b; GFS.i=GF_TOTAL; GFS.done=true; GFS.self=true; gfSave(); })()`);
  const marks=hh=>({bar:!!hh.querySelector('#gfsampbar'),back:!!hh.querySelector('[data-sampback]'),
    kick:(hh.querySelector('.gfr-kick')||{}).textContent,sample:/\bSample\b|\bMuestra\b/.test(hh.textContent)});
  const pdfHeads=()=>{ const p=[]; for(let i=1;i<=saved.n;i++) p.push(saved.log.filter(l=>l.p===i&&l.hf).map(l=>l.t)); return p; };
  C.E('GF_VIEW="roster"; gfRender();');
  let hc=C.D.getElementById('giftbody');
  hc.querySelector('.gfrosterrow[data-gf-open]').click(); hc=C.D.getElementById('giftbody');   // v10.57.1: results come in by themselves; a row opens its report (no "Check for new results", no Open)
  c('the pastor\'s copy of a member\'s result: no banner, no Back to the sample, the ordinary kicker, no "Sample" anywhere',
    marks(hc), {bar:false,back:false,kick:'Spiritual gifts report',sample:false});
  saved=null; hc.querySelector('#gfpdf').click(); await until(()=>saved);
  c('…and its PDF: named for her, no SAMPLE in any head, a title without Sample',
    [!!saved&&/^Maria-Lopez-Spiritual-Gifts-\d{4}-\d{2}-\d{2}\.pdf$/.test(saved.name),!!saved&&pdfHeads().every(p=>p.length&&!p.includes('SAMPLE')),!!saved&&/Sample/.test(saved.title)], [true,true,false]);
  C.E('GF_VIEW="take"; gfRender();'); hc=C.D.getElementById('giftbody');
  c('his own finished report: no sample marks either', marks(hc), {bar:false,back:false,kick:'Spiritual gifts report',sample:false});
  c('…and it is the report the email paths read', C.J('[GF_REPORT_MODEL&&GF_REPORT_MODEL.name,GF_REPORT_MODEL&&GF_REPORT_MODEL.sample]'), ['Joshua Mura',false]);
  saved=null; hc.querySelector('#gfpdf').click(); await until(()=>saved);
  c('…its PDF named for him, SAMPLE in no head', [!!saved&&/^Joshua-Mura-Spiritual-Gifts-\d{4}-\d{2}-\d{2}\.pdf$/.test(saved.name),!!saved&&pdfHeads().every(p=>p.length&&!p.includes('SAMPLE'))], [true,true]);
  const mine0=C.E('JSON.stringify(GFS)');
  C.E('GF_VIEW="roster"; gfRender();'); hc=C.D.getElementById('giftbody');
  C.E('gfDemoFill({quiet:true}); gfRender();'); hc=C.D.getElementById('giftbody');   // v10.56.2: the sample report shows with the demo
  C.writes.length=0;
  C.E("GF_VIEW='sample'; gfRender();"); hc=C.D.getElementById('giftbody');
  c('the sample opens beside it…', [C.E('GF_VIEW'),!!hc.querySelector('#gfsampbar')], ['sample',true]);
  c('…without taking the place of his report as the one the email paths read', C.J('[GF_REPORT_MODEL&&GF_REPORT_MODEL.name,GF_REPORT_MODEL&&GF_REPORT_MODEL.sample]'), ['Joshua Mura',false]);
  hc.querySelector('[data-sampback="top"]').click();
  C.E('GF_VIEW="take"; gfRender();'); hc=C.D.getElementById('giftbody');
  c('back to his own report: the same answers, still finished, still no sample marks', [C.E('JSON.stringify(GFS)')===mine0,marks(hc)],
    [true,{bar:false,back:false,kick:'Spiritual gifts report',sample:false}]);
  c('nothing written while the sample was open', C.writes, []);
  // Part-way through his own: the sample in between, and "Take it yourself"
  // still offers to carry on from where he stopped.
  C.E(`GFS={name:'Joshua Mura',a:{},i:40,sect:-1,done:false,sent:false,h:{},ov:GF_TOTAL,self:false};
    GF_ORDER.slice(0,40).forEach((p,j)=>{ GFS.a[gfKeyOf(p[0],p[1])]=j%5; }); gfSave(); GF_RESUMED=false; GF_VIEW='roster'; gfRender();`);
  hc=C.D.getElementById('giftbody');
  const part0=C.E('JSON.stringify(GFS)');
  C.writes.length=0;
  C.E("GF_VIEW='sample'; gfRender();"); hc=C.D.getElementById('giftbody');
  hc.querySelector('[data-sampback="foot"]').click(); hc=C.D.getElementById('giftbody');
  c('part-way: opening and leaving the sample writes nothing and leaves his answers as they were', [C.writes,C.E('JSON.stringify(GFS)')===part0], [[],true]);
  C.E("GF_VIEW='take'; GFS.self=true; gfSave(); gfRender();"); hc=C.D.getElementById('giftbody');   // v10.57.1: no take door; the way itself still works
  c('…and Take it yourself offers to carry on from statement 41', [/Welcome back, Joshua/.test(hc.textContent),/40 of 105 answered/.test(hc.textContent),/Carry on from statement 41/.test(hc.textContent)], [true,true,true]);
  c('no errors on the real-report page', C.errs, []);

  // ================================================================ Spanish
  console.log('-- en español --');
  const B=page({lang:'es'});
  await until(()=>B.E('typeof gfRenderSample==="function"&&typeof GIFTS_ES==="object"'));
  await sleep(300);
  c('no boot errors (es)', B.errs, []);
  B.E('openTool("gifts")');
  let hb=B.D.getElementById('giftbody');
  hb.querySelector('[data-gf-demo="fill"]').click(); hb=B.D.getElementById('giftbody');   // v10.56.2: the sample report shows with the demo
  c('no sample report button (es)', !!hb.querySelector('#gfsample'), false);   // v10.57.1
  B.writes.length=0; const g0=B.fetches.length;
  B.E("GF_VIEW='sample'; gfRender();"); hb=B.D.getElementById('giftbody');
  c('nothing written, nothing fetched (es)', [B.writes,B.fetches.slice(g0)], [[],[]]);
  const hs=[...hb.querySelectorAll('h3.gfr-h')].map(x=>x.textContent);
  c('every section, in Spanish', HEADS_ES.filter(t=>!hs.includes(t)), []);
  c('the report is marked Spanish', hb.querySelector('.gfrep').getAttribute('lang'), 'es');
  c('the banner in Spanish', hb.querySelector('#gfsampbar .gfsampt').textContent, 'Informe de ejemplo: Alex Rivera no es una persona real. Esto es lo que recibe un miembro al terminar.');
  c('…with Volver and the made-up context named', [hb.querySelector('#gfsampbar [data-sampback]').textContent.trim(),/también son inventados/.test(hb.querySelector('#gfsampbar').textContent)], ['← Volver',true]);
  c('the cover says Muestra', hb.querySelector('.gfr-kick').textContent, 'Muestra · Informe de dones espirituales');
  c('no English headings or labels left', /Your gifts|Why you|First step|What the work is|Potential gifts|neighborhood|All twenty-one|Sample report|Back to|Download PDF|Sample Church/i.test(hb.textContent), false);
  B.E(READ);
  const rde=B.J('__read(document.getElementById("giftbody"))');
  c('no NaN / undefined, no sentence twice, none in lower case (es)', [rde.bad,rde.dups,rde.lows], [[],[],[]]);
  saved=null;
  hb.querySelector('#gfpdf').click();
  await until(()=>saved);
  const pe=[]; for(let i=1;i<=saved.n;i++) pe.push(saved.log.filter(l=>l.p===i&&l.hf).map(l=>l.t));
  c('the Spanish PDF: same file name, MUESTRA on every page, Página n de N', [saved.name,pe.map((p,i)=>p.includes('MUESTRA')&&p.includes('Informe de dones espirituales · Alex Rivera')&&p.includes(`Página ${i+1} de ${saved.n}`))],
    ['Sample-Spiritual-Gifts-Report.pdf',pe.map(()=>true)]);
  const te=saved.log.map(l=>l.t).join('\n');
  c('no English report headings left in the Spanish PDF', /Your gifts|Why you|First step|What the work is|Potential gifts|NEIGHBORHOOD|All twenty-one|For the pastor|Page \d|SAMPLE\b|Sample Church/i.test(te), false);
  c('nothing written, nothing fetched, after the Spanish PDF', [B.writes,B.fetches.slice(g0)], [[],[]]);

  c('no errors in either page', [...A.errs,...B.errs], []);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
  jspdf.jsPDF.API.save=realSave;
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
