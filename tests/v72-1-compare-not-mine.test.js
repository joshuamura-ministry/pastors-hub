// v10.72.1 — a church added from the conference list is one to compare, never one of his. The pastor (6 Nov 2026, on his phone, of
// Lansdale's Digital footprint card saying "We did not find Josh Mura's name where a visitor looks for the pastor"): "I put Lansdale, which
// is not my church cause I want to compare it and it said this on it it has my name and stuff … the app doesn't know that if it's not my
// church I just wanted to choose Lansdale so that I could see … it in comparison with mine". Since v10.71.0 the picker keeps a tapped church
// on the device (chAddDir, dir:{org}), and dfMine counted every church on the device as his by its name: so Lansdale was judged against his
// registration (its pastor "not named"), drawn under "Your churches", and reviewed in depth by itself. Here: dfMine leaves out a church
// added from the list (unless the listing names him, or he has filled in "Your church" there); such a church is "To compare": a column in
// Side by side (its name a link to its row in Every church), a tag on its row, judged as the other churches are (its listing's pastor is the
// pastor of record). A church mapped by its address still counts as his, as before. Written failing-first on v10.72.0.
const {sleep,until,checker,page,ready,survey,FX}=require('./v45-helpers.js');
const {FIND62,dfFetch62}=require('./v62-digital-helpers.js');
const T=checker(), c=T.c;
const BAD=/\bAI\b|\bIA\b/;
const FIND=()=>{ const F=FIND62();
  const addr={ANBZ01:'10 Main St Sampleton PA 19000',ANBZ02:'22 Brook Rd Brookfield PA 19001',ANBZ03:'3 Fall Ave Allfail PA 19002',ANBZ04:'4 Old Ln Olden PA 19003',ANBZ05:'5 Nowhere St Nosite PA 19004'};
  F.churches.forEach(x=>{ x.address=addr[x.org]; x.aka=null; });
  return F; };
const owns=P=>P.qa('#chc-df .df-own h3').map(h=>h.textContent);
const rowTag=(P,org)=>{ const r=P.q(`#df-row-${org} .df-you`); return r?r.textContent:''; };
const rowOrder=P=>P.qa('#chc-df .df-all tbody tr.df-row').map(r=>r.id.replace('df-row-',''));
const sideHeads=P=>P.qa('#chc-df .df-side thead th').slice(1).map(th=>th.textContent.replace(/\s+/g,' ').trim());
const mine=P=>P.J('dfMine(DF.data,dfContext(DF.data)).map(c=>c.org)');

(async()=>{ await T.sec(async()=>{
  console.log('\n-- his two churches, then Olden added from the conference list --');
  const P=page(); await ready(P); dfFetch62(P,{findings:FIND()});
  survey(P); await sleep(60); P.E(`capSave(${JSON.stringify(FX.MEDIUM)})`);
  P.E(`openTool('churches')`); await until(()=>P.q('#chc-df .df-own')); await sleep(40);
  c('before: his two churches (the listing names him), nothing to compare', [owns(P),P.qa('#chc-df .df-side').length], [['Brookfield','Sampleton'],1]);
  c('…the pastor of record on each card is his registration', P.qa('#chc-df .df-own header b').map(b=>b.textContent), ['Joshua Mura','Joshua Mura']);
  const added=P.J(`(()=>{ const ch=chAddDir({org:'ANBZ04',name:'Olden SDA Church',address:'4 Old Ln Olden PA 19003'}); return ch?{dir:ch.dir,name:ch.name}:null; })()`);
  await sleep(80);
  c('Olden is kept on the device as a church of the list (dir)', added, {dir:{org:'ANBZ04',conf:'Pennsylvania'},name:'Olden SDA Church'});
  c('Olden is NOT one of his: "Your churches" still holds his two', owns(P), ['Brookfield','Sampleton']);
  c('…dfMine says so', mine(P), ['ANBZ01','ANBZ02']);
  const O=P.J(`(()=>{ const r=DF.rows.find(r=>r.c.org==='ANBZ04'); return {own:r.own,cmp:!!r.cmp,s:r.J.areas.pastor.s,lines:r.J.areas.pastor.lines}; })()`);
  c('…judged as another church: its listing\'s pastor is the pastor of record (Carl Day, named on its site: fine), never his name', [O.own,O.cmp,O.s,/Mura/.test(O.lines.join(' '))], [false,true,'ok',false]);
  c('…its row in Every church is tagged "To compare", not "Yours"', [rowTag(P,'ANBZ04'),rowTag(P,'ANBZ01')], ['To compare','Yours']);
  c('…and sits right after his own, before the rest', rowOrder(P).slice(0,3), ['ANBZ02','ANBZ01','ANBZ04']);
  c('Side by side: his two and Olden, Olden marked "To compare"', sideHeads(P), ['Brookfield','Sampleton','Olden To compare']);
  const link=P.q('#chc-df .df-side thead a[data-df-open="ANBZ04"]');
  c('…Olden\'s name in the header is a link to its row', !!link, true);
  if(link){ P.w.CSS=P.w.CSS||{escape:x=>String(x).replace(/[^\w-]/g,ch=>'\\'+ch)}; link.click(); await sleep(30); }   // jsdom has no CSS.escape (the handler is the page's own, v10.60.0)
  c('…which opens the row', P.q('#df-row-ANBZ04')&&P.q('#df-row-ANBZ04').getAttribute('aria-expanded'), 'true');
  c('the in-depth review by itself is for his own churches only (never a church to compare)', /filter\(r=>r\.own\)/.test(P.E('dfDeepAuto.toString()')), true);
  console.log('\n-- the rules kept --');
  c('a church of the list where he has filled in "Your church" counts as his', P.J(`(()=>{ const ch=Object.values(uStore().churches).find(x=>x.dir&&x.dir.org==='ANBZ04'); ch.capacity={confirmed:true,members:50}; uPersist();
    const m=dfMine(DF.data,dfContext(DF.data)).map(c=>c.org); ch.capacity={}; uPersist(); return m; })()`), ['ANBZ01','ANBZ02','ANBZ04']);
  c('a church mapped by its address (no dir) counts as his by its name, as before', P.J(`(()=>{ const s=uStore(), id=uId(); s.churches[id]={id,name:'Nosite SDA Company',address:'5 Nowhere St Nosite PA 19004',capacity:{},members:[],linked:[],drafts:[],selected:[],overrides:{},share:{}}; uPersist();
    const m=dfMine(DF.data,dfContext(DF.data)).map(c=>c.org); delete s.churches[id]; uPersist(); return m; })()`), ['ANBZ01','ANBZ02','ANBZ05']);
  c('Spanish tag', P.J('DF_T.cmp'), {en:'To compare',es:'Para comparar'});
  c('no "AI" in Digital footprint', BAD.test(P.txt('#chc-df')||''), false);
  c('no page errors', P.errs, []);
}); T.done(); })();
