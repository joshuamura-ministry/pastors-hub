// v10.77.0 — the papers of a project or a purchase, raised to his bar: a cover band, the figures as tiles, the options as bars, the
// funding plan as a meter, flowing pages, larger type; the Proposal to vote on with the band, slim bars and the meter, its memo two
// across at the tight levels. The pastor (17 Nov 2026): "I haven't seen the results if it's going to be a very high-quality PDF"; (9 Nov)
// "the most compelling, most polished most convincing and based on evidence … a beautiful PDF". Design:
// ~/Ministry Work/Terrain-work/v91/DESIGN-PAPERS.md. Written failing-first against v10.76.0.
const fs=require('fs'), path=require('path');
const H=require('./v43-helpers.js');
const {c,page,ready,done,FX,SEED}=H;
const HTML=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const ADDR=SEED('purchase')['terrain-churches-v1'].churches['sample-sampleton-sda'].address;
const DATA={...FX.DATA,geo:{...FX.DATA.geo,matched:ADDR}};
const ID='buy-avs001';
const ROOF=`it.cat='building'; it.kind='repair'; it.team='deacons'; it.why=[{k:'safety'}]; it.name={en:'New roof',es:'Techo nuevo'}; it.need={en:'A new shingle roof',es:'Un techo nuevo de tejas'}; it.goal={};
  it.options=[{id:'a',tier:'good',src:'quote',company:'Roofer A',checked:'2026-09-20',name:{en:'Patch and repair of the north slope with matching architectural shingles',es:'Parche y reparación de la vertiente norte con tejas arquitectónicas iguales'},store:'Roofer A',price:9000,extra:0,features:{},install:{how:'pro',cost:0}},
    {id:'b',tier:'better',src:'quote',company:'Roofer B',checked:'2026-09-21',name:{en:'New shingle roof',es:'Techo nuevo de tejas'},store:'Roofer B',price:28000,extra:0,features:{},install:{how:'pro',cost:0}},
    {id:'c',tier:'best',src:'quote',company:'Roofer C',checked:'2026-09-22',name:{en:'Standing-seam metal roof with new gutters and downspouts',es:'Techo de metal de junta alzada con canaletas y bajantes nuevas'},store:'Roofer C',price:41000,extra:0,features:{},install:{how:'pro',cost:0}}];
  it.pick='b'; it.fund={lines:[{k:'budget',amount:20000},{k:'offering',amount:8000,date:'2026-11-14'}],phases:null}; it.dates={}; it.path=['finance','board','business']; delete it.sample;`;
const SEVEN=`it.fund={lines:[{k:'budget',amount:600},{k:'offering',amount:700,date:'2026-11-07'},{k:'designated',amount:400},{k:'match',amount:300},{k:'sell',amount:200},{k:'grant',amount:400},{k:'other',amount:300,note:{en:'A gift from a sister church',es:'Un donativo de una iglesia hermana'}}],phases:{amount:500,by:'2027-03',what:{en:'The second camera',es:'La segunda cámara'}}};`;
(async()=>{
  const pages={en:await ready(page('purchase','en',{data:DATA})),es:await ready(page('purchase','es',{data:DATA}))};
  const build=(L,a,pre,o)=>pages[L].J(`(()=>{ const it=buyGet('${ID}'); ${pre||''} const m=buyModel(it,'${a}'); const H=buyHandout(m); const d=buyPdfDoc(H,{jsPDF:window.jspdf.jsPDF}); const log=d.__caseLog||[];
    const box=l=>l.x0<l.bx0-0.5||l.x1>l.bx1+0.5; const ys={}; log.forEach(l=>{ ys[l.p]=Math.max(ys[l.p]||0,l.y); });
    const out={pages:d.getNumberOfPages(),lv:d.__caseLevel,lines:log.map(l=>l.t),out:log.filter(box).map(l=>l.t),ys,log:log.map(l=>({p:l.p,x0:Math.round(l.x0),y:Math.round(l.y),t:l.t})),facts:H.facts,fund:{parts:H.fund.parts,totalN:H.fund.totalN,phase2N:H.fund.phase2N},chart:H.chart.cols.map(x=>x.n)};
    const Pz=buyProposal(m); if(Pz){ const pd=buyProposalDoc(Pz,{jsPDF:window.jspdf.jsPDF}); const pl=pd.__caseLog||[]; out.p={pages:pd.getNumberOfPages(),lv:pd.__caseLevel,lines:pl.map(l=>l.t),out:pl.filter(box).map(l=>l.t),log:pl.map(l=>({p:l.p,x0:Math.round(l.x0),y:Math.round(l.y),t:l.t}))};
      const p1=buyProposalDocAt(Pz,{jsPDF:window.jspdf.jsPDF},1); out.p1={pages:p1.getNumberOfPages(),log:(p1.__caseLog||[]).map(l=>({p:l.p,x0:Math.round(l.x0),y:Math.round(l.y),t:l.t}))}; }
    return out; })()`);
  const B=build('en','board'), F=build('en','finance'), BS=build('es','board');

  console.log('\n-- the handout: the band --');
  c('the first lines: SAMPLE, the body it is for, the name, then the church and who prepared it (one line)', [B.lines.slice(0,3),/^Sampleton SDA \(SAMPLE\) · Prepared by /.test(B.lines[3])], [['SAMPLE','PROPOSAL TO THE CHURCH BOARD','Sound board and camera'],true]);
  c('…the finance committee\'s keeps its own kicker', F.lines[1], 'FINANCE COMMITTEE RECOMMENDATION · TO: TREASURER & FINANCE COMMITTEE');
  c('…in Spanish', [BS.lines[1],BS.lines[2]], ['PROPUESTA A LA JUNTA DIRECTIVA','Consola de sonido y cámara']);

  console.log('\n-- the figures as tiles --');
  c('the facts carry a hue for their family', B.facts.map(f=>[f.value,f.hue]), [['9','people'],['2','housing'],['1','children']]);
  c('each number stands on its own line, its words under it (no sentence)', [['9','2','1'].every(v=>B.lines.includes(v)),B.lines.includes('members who watch from home'),B.lines.includes('9 members who watch from home.')], [true,true,false]);

  console.log('\n-- the options as bars --');
  c('the chart knows each total as a number', B.chart, [1180,3400,8850]);
  c('the totals at the right of their bars, on the front, before the table', (()=>{ const tot=B.log.filter(l=>['$1,180','$3,400','$8,850'].includes(l.t)); const first=B.log.findIndex(l=>l.t==='PRICE'); return [tot.length>=3,tot.slice(0,3).every(l=>l.p===1&&l.x0>420),B.log.findIndex(l=>l.t==='$8,850')<first]; })(), [true,true,true]);
  c('no TOTAL row in the comparison (the bars carry it); PRICE, WHERE TO BUY, KEY FEATURES, WARRANTY, INSTALLATION, RUNNING COSTS, CHECKED stay', [B.lines.includes('TOTAL'),['PRICE','WHERE TO BUY','KEY FEATURES','WARRANTY','INSTALLATION','RUNNING COSTS','CHECKED'].filter(w=>!B.lines.includes(w))], [false,[]]);

  console.log('\n-- the funding plan as a meter --');
  c('the plan as numbers: the parts, the total, phase 2', [B.fund.parts.map(p=>[p.k,p.n]),B.fund.totalN,B.fund.phase2N], [[['budget',1000],['offering',1200],['designated',600],['match',400],['sell',200]],3400,0]);
  c('the legend: each source with its amount, short labels', ['Church budget $1,000','Special offering in Sabbath worship $1,200','Designated gifts $600','A matching gift $400','The old mixer, sold on a weekday $200'].filter(t=>!B.lines.includes(t)), []);
  c('…the table and "Never from tithe" still follow', [B.lines.includes('Source'),B.lines.some(t=>/^Never from tithe\./.test(t))], [true,true]);

  console.log('\n-- the pages flow, the type is larger --');
  c('the board\'s handout: two pages at the roomiest level, the front used to its foot (no half-empty front)', [B.pages,B.lv,B.ys[1]>=640], [2,0,true]);   // the front ends after the meter's legend; the funding table goes whole to the back
  c('…Spanish: two pages within the first two levels', [BS.pages,BS.lv<=1], [2,true]);
  c('HOW WE’LL PAY begins on the front', B.log.find(l=>l.t==='HOW WE’LL PAY').p, 1);
  c('no line outside its box (the handout and the Proposal, EN and ES)', [...B.out,...F.out,...BS.out,...B.p.out,...BS.p.out], []);

  console.log('\n-- the Census figure, when the survey is loaded --');
  const CZ=build('en','board',"DATA.M[SCOPE].seniorsAlone=14; it.why=[...it.why,{k:'neighbours'}];");
  c('a reason with a Census figure: a tile with the share and its source', (()=>{ const f=CZ.facts.find(x=>x.value==='14%'); return [!!f,f&&f.hue,f&&/^U\.S\. Census ACS /.test(f.source),CZ.lines.includes('14%'),CZ.lines.some(t=>/^U\.S\. Census ACS /.test(t))]; })(), [true,'children',true,true,true]);
  c('…still two pages', CZ.pages, 2);

  console.log('\n-- stress: the roof, a seven-source plan --');
  const RF={en:['finance','board','business'].map(a=>build('en',a,ROOF)),es:['finance','board','business'].map(a=>build('es',a,ROOF))};
  c('the roof (long names, three quotes): every handout two pages at most, every Proposal two at most, nothing outside its box', [...RF.en,...RF.es].map(r=>[r.pages<=2,r.p.pages<=2,r.out.length+r.p.out.length]), Array(6).fill([true,true,0]));
  const SV=build('en','board',SEVEN);
  c('seven sources and a phase 2: the meter\'s legend wraps to a second row, phase 2 in it; two pages', (()=>{ const leg=SV.log.filter(l=>/^(Church budget|Special offering|Designated gifts|A matching gift|The old (mixer|equipment)|A community grant|A gift from|Phase 2)/.test(l.t)&&l.p===SV.log.find(x=>x.t==='HOW WE’LL PAY').p); const ys=[...new Set(leg.map(l=>l.y))]; return [leg.length>=8,ys.length>=2,SV.lines.some(t=>/^Phase 2, later \$500/.test(t)),SV.pages<=2]; })(), [true,true,true,true]);

  console.log('\n-- the Proposal to vote on --');
  c('the band: SAMPLE, the kicker, the title first; the memo under it', [B.p.lines.slice(0,3),B.p.lines.slice(3,5)], [['SAMPLE','PROPOSAL TO VOTE ON · CHURCH BOARD','Sound board and camera'],['CHURCH','Sampleton SDA (SAMPLE)']]);
  c('one page for the sample\'s finance committee and board, EN and ES', [B.p.pages,F.p.pages,BS.p.pages,build('es','finance').p.pages], [1,1,1,1]);
  c('at level 1 the memo sits two across (DATE at the right half)', (()=>{ const d=B.p1.log.find(l=>l.t==='DATE'), ch=B.p1.log.find(l=>l.t==='CHURCH'); return [!!d,!!ch,d&&ch&&d.x0>ch.x0+200&&Math.abs(d.y-ch.y)<1]; })(), [true,true,true]);
  c('the roomiest level draws the bars and the meter: the totals right of their bars; the legend', (()=>{ const p0=pages.en.J(`(()=>{ const it=buyGet('${ID}'); const Pz=buyProposal(buyModel(it,'board')); const d=buyProposalDocAt(Pz,{jsPDF:window.jspdf.jsPDF},0); return (d.__caseLog||[]).map(l=>({x0:Math.round(l.x0),t:l.t})); })()`);
    return [p0.some(l=>l.t==='$8,850'&&l.x0>420),p0.some(l=>l.t==='Church budget $1,000')]; })(), [true,true]);

  console.log('\n-- the stamps --');
  c('the six stamps say v10.77.0', [(HTML.match(/v10\.77\.0/g)||[]).length>=6,/const VERSION = 'v10\.77\.0'/.test(HTML)], [true,true]);
  c('no page errors', [pages.en.errs,pages.es.errs], [[],[]]);
  done();
})();
