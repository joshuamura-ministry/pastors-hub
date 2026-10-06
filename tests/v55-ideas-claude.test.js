// v10.55.0 — the work for each need, written by Claude (DESIGN-IDEAS.md, v72). The pastor (6 Oct 2026): "a lot of the ideas are gonna
// all be the same … because it's coming from the library … bring in some even better ideas … current fresh ideas things that are actually
// working … in line with our denomination seventh day Adventists, but we could still go out of the box … we need a deeper thinker because if
// Claude is generating the community needs then it also needs to generate the work to meet those needs", and "the great ideas … selected
// … put them in the library … that way it doesn't have to generate them all the time". The server's own checks are in
// ideas-function.test.mjs; this suite is the page. Written failing-first on v10.54.2.
const {sleep,until,checker,page,ready,survey}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const PASSV='open-sesame-ideas';
const ADDR="D.geo={...D.geo,matched:'118 Bristol Rd, Warminster, PA, 18974'}";
const hex=i=>('0123456789abcd'+i).slice(-14).replace(/[^0-9a-f]/g,'a');
const WHY='Around the church 16.8% of households receive SNAP, against 6.2% in the county.';
const NUMS={1:{ppl:2,leaders:0,hrs:3,cost:40,costMo:0},2:{ppl:6,leaders:1,hrs:12,cost:400,costMo:60},3:{ppl:12,leaders:2,hrs:30,cost:2000,costMo:300}};
const NAMES={1:['Grocery list cards at the laundromat','A text line for a ride to the store','Recipe cards for the food bank line','A shelf swap at the library'],
  2:['Saturday night soup supper','A cooking class on a SNAP budget','Market vouchers matched by members','Rides to the county food bank'],
  3:['A mobile pantry stop with the food bank','A community garden with the township','A teaching kitchen night each month','Summer lunches with the library']};
// an idea as the server keeps it: the library's shape, one language, an id of its own, its why and where it is seen working
const IDEA=(t,i,o={})=>{ const n=NAMES[t][i];
  return {id:'cl-'+(t+''+i+'000000000000').slice(0,14).replace(/[^0-9a-f]/g,'a'),theme:'hunger',tier:t,k:['serve','equip','belong','invite'][i%4],ages:'adults',where:'community',sabbath:false,minors:false,
    need:['snap','poor'],boost:[],...NUMS[t],skill:[],partner:t===3?{en:'the county food bank'}:null,dig:0,cad:t===3&&i===0?1:0,reach:'out',ai:true,why:WHY,seen:[],
    en:{n,d:`${n} meets neighbors where they already shop and wait for the bus. Two members keep it going each week and answer every text within a day, with no strings attached.`,
      how:[`Ask the manager for permission to start ${n.toLowerCase()} near the door.`,'Print 200 cards with the church text line and a note that every reply stays private.',
        'Choose two members who answer every text within a day, by first name only.','Review what worked each month and share the counts with the church board.']},...o}; };
const SET=()=>({ideas:[IDEA(1,0),IDEA(1,1),IDEA(1,2,{why:'About 37% of households here go hungry each month.'}),
  IDEA(2,0,{seen:[{text:'A church in Ohio runs a Saturday night soup supper with a short class after it.',url:'https://www.example-sda.org/soup-supper',host:'example-sda.org'},
    {text:'A page that is not https.',url:'http://insecure.example.org/x',host:'insecure.example.org'}]}),IDEA(2,1),IDEA(2,2),IDEA(2,3),
  IDEA(3,0),IDEA(3,1),IDEA(3,2),IDEA(3,3),IDEA(1,3,{en:{...IDEA(1,3).en,n:'AI grocery helper'}})],keep:[],made:'2026-10-06',set:'a'.repeat(32)+'/en'});
function fake(P,plan){
  const orig=P.w.fetch; P.calls=[];
  P.w.fetch=async(u,o)=>{ u=String(u);
    if(/\/\.netlify\/functions\/advise$/.test(u)){
      if(!o||!o.method||o.method==='GET') return {ok:true,status:200,json:async()=>plan.info};
      const b=JSON.parse(o.body); P.calls.push({body:b,headers:o.headers||{}});
      const r=b.mode==='ideas'?plan.ideas(b):b.mode==='ideas-status'?plan.status(b):b.mode==='ideas-pick'?{status:200,json:{ok:true,counted:true}}:{status:500,json:{}};
      return {ok:r.status<300,status:r.status,json:async()=>r.json}; }
    return orig(u,o); };
}
const openNeed=async(P,id,ideas)=>{ await until(()=>P.q(`#u-needs [data-need="${id}"] .ns-head`)); const h=P.q(`#u-needs [data-need="${id}"] .ns-head`);
  if(h.getAttribute('aria-expanded')!=='true') h.click(); await sleep(30);
  if(ideas){ const s=P.q(`[data-ns-show="${id}"]`); if(s&&s.getAttribute('aria-expanded')!=='true') s.click(); await until(()=>P.q(`#ns-i-${id} .ns-row`),6000); } };
const cols=(P,id)=>P.qa(`#ns-i-${id} .ns-lcol`).map(col=>[col.dataset.lift,[...col.querySelectorAll('.ns-row .ns-in')].map(x=>x.textContent)]);

(async()=>{ await T.sec(async()=>{
  console.log('\n-- a device that is not unlocked: the library\'s ideas, nothing asked --');
  { const P=page({needs:'file'}); await ready(P);
    fake(P,{info:{enabled:true,needs:false,ideas:true},ideas:()=>({status:500,json:{}}),status:()=>({status:500,json:{}})});
    survey(P,{mod:ADDR}); await sleep(150); await openNeed(P,'snap',true); await sleep(150);
    c('no request; no line; the library\'s columns', [P.calls.length,!!P.q('#ns-i-snap .ns-clstat'),P.qa('#ns-i-snap .ns-row').length>=6], [0,false,true]);
    P.w.close(); }
  { const P=page({needs:'file',store:{'terrain-ai-pass':PASSV}}); await ready(P);
    fake(P,{info:{enabled:true,needs:false,ideas:false},ideas:()=>({status:500,json:{}}),status:()=>({status:500,json:{}})});
    survey(P,{mod:ADDR}); await sleep(150); await openNeed(P,'snap',true); await sleep(200);
    c('unlocked, but the server has the ideas off: nothing asked, the library\'s columns', [P.calls.filter(x=>x.body.mode==='ideas').length,P.qa('#ns-i-snap .ns-row').length>=6], [0,true]);
    P.w.close(); }

  console.log('\n-- unlocked: opening a need asks for its work; place names, figures, the need and the library\'s names only --');
  const P=page({needs:'file',store:{'terrain-ai-pass':PASSV}}); await ready(P);
  let hold=true, polls=0;
  fake(P,{info:{enabled:true,needs:false,ideas:true},ideas:()=>({status:202,json:{ok:true,job:'J'.repeat(22),key:'K'.repeat(43),poll:4000}}),
    status:()=>{ polls++; return hold?{status:200,json:{ok:true,status:'running'}}:{status:200,json:{ok:true,status:'done',...SET()}}; }});
  P.E('NS_CL.poll=25');
  survey(P,{mod:ADDR}); await sleep(150);
  await openNeed(P,'snap',true);
  await until(()=>P.calls.some(x=>x.body.mode==='ideas'),4000);
  const call=P.calls.find(x=>x.body.mode==='ideas'), B=call.body;
  c('one request, mode ideas, the pass sent, not fresh', [P.calls.filter(x=>x.body.mode==='ideas').length,call.headers['x-terrain-pass'],B.fresh,/^[A-Za-z0-9_-]{22}$/.test(B.device)], [1,PASSV,false,true]);
  c('the place and the report\'s figures (as the needs list sends them)', [B.place,B.figs.length>=20,B.figs.some(f=>f.k==='snap')], [{tract:'Census Tract 2041.02',town:'Warminster Township',county:'Bucks County',state:'PA'},true,true]);
  c('the need: its id, title, category, the survey\'s line, the library\'s themes for it', [B.need.id,typeof B.need.title,B.need.cat.length>1,/17% of households/.test(B.need.why),B.need.themes.length>=1&&B.need.themes.length<=3], ['snap','string',true,true,true]);
  c('the census tags that fire here', Array.isArray(B.tags)&&B.tags.includes('snap'), true);
  c('the library\'s ideas for the need, by id, name and lift (so they are never written again)', [B.have.length>=6,B.have.every(h=>typeof h.id==='string'&&typeof h.name==='string'&&[1,2,3].includes(h.lift))], [true,true]);
  const raw=JSON.stringify(B);
  c('…never the church\'s name, its street address, the pastor or his email', ['Bucks County SDA','118 Bristol Rd','Joshua Mura','jm@example.org'].map(w=>raw.includes(w)), [false,false,false,false]);
  await until(()=>P.q('#ns-i-snap .ns-clstat .ns-aiwhen'),3000);
  c('while it works: one line above the columns, the town named, no "AI"', [P.txt('#ns-i-snap .ns-clstat'),/\bAI\b/.test(P.txt('#ns-i-snap .ns-clstat'))],
    ['Studying what works for this need in Warminster… about a minute.',false]);
  const libFirst=cols(P,'snap');
  c('…the library\'s columns meanwhile', libFirst.length>=2&&libFirst.every(([,names])=>names.length>=1), true);

  console.log('\n-- done: Claude\'s columns, four a lift, checked again here --');
  hold=false; await until(()=>P.J(`!!nsClKept(nsClKey(nsNeedById('snap')))`),5000); await sleep(60);
  c('three columns of Claude\'s ideas; the one that says "AI" left out here', cols(P,'snap'),
    [['light',[NAMES[1][0],NAMES[1][1],NAMES[1][2]]],['moderate',NAMES[2]],['heavy',NAMES[3]]]);
  c('each row: its first sentence, its people and money', [P.txt(`#ns-i-snap .ns-row[data-idea="${IDEA(2,0).id}"] .ns-id`),P.txt(`#ns-i-snap .ns-row[data-idea="${IDEA(2,0).id}"] .ns-if`)],
    [`${NAMES[2][0]} meets neighbors where they already shop and wait for the bus.`,'6 people$400 to start · $60 a month']);
  c('an event says "in all"', /in all/.test(P.txt(`#ns-i-snap .ns-row[data-idea="${IDEA(3,0).id}"] .ns-if`)), true);
  c('the line: when, and Generate new ideas', [P.txt('#ns-i-snap .ns-clstat .ns-aiwhen'),P.txt('#ns-i-snap .ns-clstat [data-ns-clgen]')], ['Written for Warminster on 6 Oct 2026','Generate new ideas']);
  c('kept with the church, by place, need and language', P.J(`(()=>{ const k=Object.keys(uChurch().needIdeas||{}); return [k.length,/\\|en\\|snap$/.test(k[0]),uChurch().needIdeas[k[0]].ideas.length]; })()`), [1,true,11]);
  c('nothing on screen says "AI"', /\bAI\b|\bIA\b/.test(P.txt('#u-needs')), false);

  console.log('\n-- the sheet: the idea\'s own why, its steps, where it is seen working --');
  P.q(`#ns-i-snap .ns-row[data-idea="${IDEA(2,0).id}"]`).click(); await until(()=>P.q('#ns-sheet[open]'),3000);
  const sh=P.q('#ns-sheet');
  c('the title, the lift, four steps', [P.txt('#ns-s-t'),/Moderate lift/.test(P.txt('#ns-sheet .ns-liftline')),sh.querySelectorAll('.ns-steps li').length], [NAMES[2][0],true,4]);
  c('"Why here": the idea\'s own why', P.txt('#ns-sheet .ns-why'), WHY);
  const seen=[...sh.querySelectorAll('.ns-block')].find(b=>/Seen working/.test(b.textContent));
  c('"Seen working": the https line only, its site\'s name as the link, opened apart', seen?[...seen.querySelectorAll('a')].map(a=>[a.textContent,a.getAttribute('href'),a.target,a.rel]):null,
    [['example-sda.org','https://www.example-sda.org/soup-supper','_blank','noopener noreferrer']]);
  P.q('#ns-sheet [data-ns-close]').click(); await sleep(40);
  P.q(`#ns-i-snap .ns-row[data-idea="${IDEA(1,2).id}"]`).click(); await until(()=>P.q('#ns-sheet[open]'),3000);
  c('a why whose number is not a Census figure: the need\'s own line instead', /17% of households/.test(P.txt('#ns-sheet .ns-why'))&&!/37%/.test(P.txt('#ns-sheet .ns-why')), true);
  P.q('#ns-sheet [data-ns-close]').click(); await sleep(40);

  console.log('\n-- "Create a proposal for this ministry": saved like a library idea, the pick sent --');
  P.q(`#ns-i-snap .ns-row[data-idea="${IDEA(3,1).id}"]`).click(); await until(()=>P.q('#ns-sheet[open]'),3000);
  P.q('#ns-sheet [data-ns-propose]').click(); await until(()=>P.J('TOOL')==='case',4000); await sleep(150);
  const id31=IDEA(3,1).id;
  c('saved with the church and in its plan; Make the Case on it', [P.J(`!!uChurch().lib['${id31}']`),P.J(`uSelected().includes('${id31}')`),P.J('casePrefs().ministry')], [true,true,id31]);
  c('…Make the Case reads it as a ministry (its size, its people, its partner)', P.J(`(()=>{ const x=caseItemOf('${id31}'); return x?[x.n,x.size,x.requirements.people>0,!!x.p]:null; })()`), [NAMES[3][1],3,true,true]);
  const pick=P.calls.find(x=>x.body.mode==='ideas-pick');
  c('the pick goes to the server: the set and the id only, the pass sent', pick?[Object.keys(pick.body).sort(),pick.body.set,pick.body.id,pick.headers['x-terrain-pass']]:null, [['device','id','mode','set'],'a'.repeat(32)+'/en',id31,PASSV]);

  console.log('\n-- drawn again: the kept work at once, nothing asked; Generate new ideas --');
  P.E(`openTool('survey'); render();`); await sleep(120);
  const n0=P.calls.filter(x=>x.body.mode==='ideas').length;
  await openNeed(P,'snap',true); await sleep(150);
  c('the same columns, no new request', [cols(P,'snap')[1][1],P.calls.filter(x=>x.body.mode==='ideas').length], [NAMES[2],n0]);
  hold=true; P.q('#ns-i-snap .ns-clstat [data-ns-clgen]').click(); await until(()=>P.calls.filter(x=>x.body.mode==='ideas').length>n0,3000);
  c('Generate new ideas: a fresh study; the kept columns stay meanwhile', [P.calls.filter(x=>x.body.mode==='ideas').pop().body.fresh,cols(P,'snap')[1][1]], [true,NAMES[2]]);
  hold=false; await sleep(200);
  P.w.close();

  console.log('\n-- a study that fails; a kept set from the server; kept library ideas --');
  { const F=page({needs:'file',store:{'terrain-ai-pass':PASSV}}); await ready(F);
    fake(F,{info:{enabled:true,needs:false,ideas:true},ideas:()=>({status:202,json:{ok:true,job:'J'.repeat(22),key:'K'.repeat(43),poll:4000}}),status:()=>({status:200,json:{ok:true,status:'failed',code:'no-result'}})});
    F.E('NS_CL.poll=25'); survey(F,{mod:ADDR}); await sleep(150); await openNeed(F,'snap',true);
    await until(()=>/could not/.test(F.txt('#ns-i-snap .ns-clstat')||''),4000);
    c('failed: the library\'s columns stay, one quiet line and Try again', [F.qa('#ns-i-snap .ns-row').length>=6,F.txt('#ns-i-snap .ns-clstat .ns-aiwhen'),F.txt('#ns-i-snap .ns-clstat [data-ns-clgen]')],
      [true,'New ideas could not be made just now.','Try again']);
    F.w.close(); }
  { const K=page({needs:'file',store:{'terrain-ai-pass':PASSV}}); await ready(K);
    let have=null;
    fake(K,{info:{enabled:true,needs:false,ideas:true},ideas:b=>{ have=b.have; const s=SET(); s.ideas=s.ideas.filter(x=>x.id!==IDEA(1,0).id);
        return {status:200,json:{ok:true,cached:true,...s,keep:[b.have.find(h=>h.lift===1).id,'not-in-the-list']}}; },status:()=>({status:500,json:{}})});
    survey(K,{mod:ADDR}); await sleep(150); await openNeed(K,'snap',true);
    await until(()=>K.J(`!!nsClKept(nsClKey(nsNeedById('snap')))`),4000); await sleep(60);
    const light=cols(K,'snap')[0][1];
    c('the server\'s kept set: shown at once, no study; a library idea it kept leads its lift (an id not sent is ignored)',
      [K.calls.filter(x=>x.body.mode==='ideas-status').length,light[0],light.length], [0,have.find(h=>h.lift===1).name,3]);
    K.w.close(); }

  console.log('\n-- in Spanish --');
  { const E=page({needs:'file',lang:'es',store:{'terrain-ai-pass':PASSV}}); await ready(E);
    fake(E,{info:{enabled:true,needs:false,ideas:true},ideas:()=>({status:202,json:{ok:true,job:'J'.repeat(22),key:'K'.repeat(43),poll:4000}}),status:()=>({status:200,json:{ok:true,status:'running'}})});
    E.E('NS_CL.poll=25'); survey(E,{mod:ADDR}); await sleep(150); await openNeed(E,'snap',true);
    await until(()=>E.calls.some(x=>x.body.mode==='ideas')&&E.q('#ns-i-snap .ns-clstat .ns-aiwhen'),4000);
    c('the request in Spanish; the line in Spanish', [E.calls.find(x=>x.body.mode==='ideas').body.lang,E.txt('#ns-i-snap .ns-clstat')],
      ['es','Estudiando lo que funciona para esta necesidad en Warminster… cerca de un minuto.']);
    E.w.close(); }

  c('an id that is not one of Claude\'s kept ideas draws nothing', (()=>{ const X=page({needs:'file'}); const r=X.E(`typeof nsView==='function'?nsView('cl-0000000000abcd'):'none'`); X.w.close(); return r; })(), null);
}); T.done(); })();
