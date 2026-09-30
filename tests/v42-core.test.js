/* v10.42 part 3 — THE RECORDS (DESIGN.md §6, §8.1 row 1, §11.1): what each body decided, the approval path, the goal, the
 * church's Spiritual Gifts readiness, the two new profile fields, the demo church, Clear all.
 *
 * The pastor (SPEC-FOCUS A): "Will they be able to decide dates and times and have it in the download as well?"
 * (B): "the motion first and then the explanation… in some churches it has to be presented to the finance committee first,
 * and then to the board." (C): "everything has to line up with what was chosen and what the leader or the pastor would like
 * to see accomplished." (E): "the Spiritual Gifts initiative has to be done for the whole church membership."
 * (29 Sep 2026, the answers): the suggested goal "names the idea and its outcome: {Idea name}, so that {outcome}"; "Fill in a
 * demo church uses the realistic average church (about 80 members, 55 attending)".
 */
const fs=require('fs'), path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
const AVG=path.join(__dirname,'average-church');
const SEED=v=>JSON.parse(fs.readFileSync(path.join(AVG,`seed-${v}.json`),'utf8'));
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,700));console.log('    want:',JSON.stringify(e).slice(0,500));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor'};
async function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(o.seed) for(const [k,v] of Object.entries(o.seed)) if(!k.startsWith('_')) w.localStorage.setItem(k,JSON.stringify(v));
      if(!o.seed) w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      w.fetch=async()=>new Promise(()=>{}); }});
  const w=dom.window, E=s=>w.eval(s), J=s=>JSON.parse(w.eval(`JSON.stringify(${s})`));
  const t=Date.now(); while(Date.now()-t<10000){ try{ if(E('typeof caseDecClean==="function"')) break; }catch(e){} await sleep(25); }
  E(`DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; CAP=null;`);
  if(!o.seed) E(`uChurch().name='Bucks County SDA'; capSave(${JSON.stringify(o.profile||FX.MEDIUM)}); uPersist();`);
  return {w,E,J,errs};
}
const TODAY=new Date(); const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const dayOff=n=>{ const d=new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate()+n,12); return iso(d); };

(async()=>{ try{
  const P=await page();
  const {E,J}=P;
  c('no boot errors', P.errs, []);

  console.log('\n-- the bodies (PROPOSAL.md §4.1) --');
  { const G=J('CASE_GROUPS.map(g=>[g.id,caseBodyOf(g.id)])');
    c('34 groups', G.length, 34);
    const want={board:'board',business:'business',finance:'finance',conference:'conference',congregation:null};
    c('caseBodyOf: board, business, finance, conference by name; the whole church none; every other group (26 teams, elders, deacons, nominating) the ministry team',
      G.filter(([g,b])=>b!==(Object.prototype.hasOwnProperty.call(want,g)?want[g]:'team')), []);
    c('…an unknown group is no body', J('[caseBodyOf("nobody"),caseBodyOf(null)]'), [null,null]);
    c('CASE_BODIES is the approval order', J('CASE_BODIES'), ['team','finance','board','business']); }

  console.log('\n-- the outcomes (X9: one word for "amended") --');
  c('team chips', J('caseDecOutcomes("team",["team","board"]).map(o=>o.en+"|"+o.es)'), ['Agreed|Acordado','Amended|Con enmiendas','Referred|Remitido','Declined|No acordado']);
  c('finance chips', J('caseDecOutcomes("finance",["team","finance","board"]).map(o=>o.en+"|"+o.es)'), ['Recommended|Recomendado','Amended|Con enmiendas','Referred|Remitido','Not recommended|No recomendado']);
  c('board chips without the business meeting in the path', J('caseDecOutcomes("board",["team","board"]).map(o=>o.k)'), ['approved','amended','referred','declined']);
  c('board chips with the business meeting: "Recommended to the business meeting"', J('caseDecOutcomes("board",["board","business"]).map(o=>o.k+"|"+o.en)'),
    ['approved|Approved','recommended|Recommended to the business meeting','amended|Amended','referred|Referred','declined|Declined']);
  c('business and conference chips', J('[caseDecOutcomes("business",["business"]).map(o=>o.k),caseDecOutcomes("conference",["team"]).map(o=>o.k)]'),
    [['approved','amended','referred','declined'],['approved','amended','referred','declined']]);

  console.log('\n-- caseDecClean: every rule, both ways (PROPOSAL.md §4.3, without the note: X8) --');
  const base={v:1,body:'board',date:dayOff(-7),outcome:'approved',vote:{for:9,against:0,abstain:1,consensus:false},
    timing:{option:null,slot:'Thu evening',time:'18:00',start:dayOff(7),len:'trial',weeks:6,room:'kitchen'},note:'x',at:5};
  const cl=(patch,body)=>J(`caseDecClean(${JSON.stringify({...base,...patch})},${JSON.stringify(body||'board')})`);
  { const r=cl({});
    c('a full record is kept, field by field', r, {v:1,body:'board',date:dayOff(-7),outcome:'approved',vote:{for:9,against:0,abstain:1,consensus:false},
      timing:{option:null,slot:'Thu evening',time:'18:00',start:dayOff(7),len:'trial',weeks:6,room:'kitchen'},at:5});
    c('…no note (X8), no unknown field', [Object.prototype.hasOwnProperty.call(r,'note'),Object.prototype.hasOwnProperty.call(cl({extra:1}),'extra')], [false,false]); }
  c('date: tomorrow is kept (one day of slack), the day after refused', [!!cl({date:dayOff(1)}),cl({date:dayOff(2)})], [true,null]);
  c('date: not a real day, the wrong shape, before 2020: refused', [cl({date:'2026-02-30'}),cl({date:'5 Oct 2026'}),cl({date:'2019-12-31'})], [null,null,null]);
  c('the body must be its key', [cl({},'finance'),cl({body:'nobody'},'nobody')], [null,null]);
  c('an outcome the body cannot record is refused (finance "approved")', J(`caseDecClean(${JSON.stringify({...base,body:'finance'})},'finance')`), null);
  c('the board\'s "recommended" is kept on read even when the business meeting has left the path', !!cl({outcome:'recommended'}), true);
  c('a negative outcome keeps no timing', [cl({outcome:'declined'}).timing,cl({outcome:'referred'}).timing], [null,null]);
  c('slot: not one of the profile\'s times is dropped', cl({timing:{...base.timing,slot:'Moonday'}}).timing.slot, null);
  c('time: 24:00 dropped, 23:59 kept', [cl({timing:{...base.timing,time:'24:00'}}).timing.time,cl({timing:{...base.timing,time:'23:59'}}).timing.time], [null,'23:59']);
  c('start: three years out dropped, two years kept, 61 days before the vote dropped', [
    cl({timing:{...base.timing,start:(+dayOff(0).slice(0,4)+3)+dayOff(0).slice(4)}}).timing.start,
    !!cl({timing:{...base.timing,start:(+dayOff(-7).slice(0,4)+2)+dayOff(-7).slice(4)}}).timing.start,
    cl({timing:{...base.timing,start:dayOff(-68)}}).timing.start], [null,true,null]);
  c('weeks 0 and 53 dropped; pilot is 4 weeks, a season 13', [cl({timing:{...base.timing,len:'weeks',weeks:0}}).timing.weeks,cl({timing:{...base.timing,len:'weeks',weeks:53}}).timing.weeks,
    cl({timing:{...base.timing,len:'pilot',weeks:9}}).timing.weeks,cl({timing:{...base.timing,len:'season',weeks:2}}).timing.weeks], [null,null,4,13]);
  c('room: a key of the building\'s list, else dropped; option 1–3', [cl({timing:{...base.timing,room:'moon'}}).timing.room,cl({timing:{...base.timing,option:4}}).timing.option,cl({timing:{...base.timing,option:2}}).timing.option], [null,null,2]);
  c('a timing with no day, no time and no start is none', cl({timing:{len:'trial',weeks:6}}).timing, null);
  c('vote: numbers 0–9999 only; all empty is none', [cl({vote:{for:-1,against:'2',abstain:10000,consensus:false}}).vote,cl({vote:{for:0,against:null,abstain:null,consensus:false}}).vote,cl({vote:{consensus:true}}).vote],
    [null,{for:0,against:null,abstain:null,consensus:false},{for:null,against:null,abstain:null,consensus:true}]);
  c('team: the group is kept only when it is a team group', [J(`caseDecClean(${JSON.stringify({...base,body:'team',outcome:'agreed',group:'prayer'})},'team').group`),
    J(`caseDecClean(${JSON.stringify({...base,body:'team',outcome:'agreed',group:'board'})},'team').group===undefined`)], ['prayer',true]);

  console.log('\n-- the store: save, read, drop --');
  { E(`uChurch().caseDecisions=undefined;`);
    c('caseDecAll never creates the store', [J('caseDecAll("food-pantry")'),J('uChurch().caseDecisions===undefined')], [{},true]);
    const r=J(`caseDecSave('food-pantry',${JSON.stringify({...base,body:'finance',outcome:'recommended',vote:{for:5,against:0,abstain:null,consensus:false},timing:null})})`);
    c('caseDecSave: the cleaned record, with the time it was saved', [r&&r.outcome,r&&typeof r.at==='number'&&r.at>1e12], ['recommended',true]);
    c('…and a refused record saves nothing', [J(`caseDecSave('food-pantry',${JSON.stringify({...base,date:dayOff(9)})})`),Object.keys(J('caseDecAll("food-pantry")'))], [null,['finance']]);
    c('…never for the Discover-your-gifts deck', J(`caseDecSave(CASE_GIFTS_ID,${JSON.stringify(base)})`), null);
    E(`uChurch().caseDecisions['food-pantry'].board=${JSON.stringify({...base,date:'2026-02-30'})}; uChurch().caseDecisions['food-pantry'].team={body:'finance'};`);
    c('a hand-edited record is cleaned on read (a bad date, a body that is not its key: left out)', Object.keys(J('caseDecAll("food-pantry")')), ['finance']);
    c('caseDecDrop removes one, then the ministry\'s key when empty', [J('caseDecDrop("food-pantry","finance")'),J('caseDecDrop("food-pantry","finance")')], [true,false]);
    E(`delete uChurch().caseDecisions['food-pantry'].board; delete uChurch().caseDecisions['food-pantry'].team; caseDecDrop('food-pantry','x');`); }

  console.log('\n-- trail, agreed timing and status: 16 paths × 5 audiences (PROPOSAL.md §4.6) --');
  { const bodies=['team','finance','board','business'];
    const recs={team:{v:1,body:'team',group:'community',date:dayOff(-21),outcome:'agreed',vote:{for:6,against:0,abstain:null,consensus:false},timing:{option:null,slot:'Tue evening',time:null,start:dayOff(14),len:'trial',weeks:6,room:null},at:1},
      finance:{v:1,body:'finance',date:dayOff(-14),outcome:'recommended',vote:{for:5,against:0,abstain:null,consensus:false},timing:null,at:2},
      board:{v:1,body:'board',date:dayOff(-7),outcome:'approved',vote:null,timing:{option:null,slot:'Thu evening',time:'18:00',start:dayOff(14),len:'trial',weeks:6,room:'kitchen'},at:3}};
    const bad=[];
    for(let mask=0;mask<16;mask++){ const path=bodies.filter((b,i)=>mask&(1<<i));
      for(const aud of ['team','finance','board','business',null,'conference']){
        for(const sub of [{},{team:recs.team},{team:recs.team,finance:recs.finance},recs]){
          const R=J(`(()=>{ const R=${JSON.stringify(sub)}, P=${JSON.stringify(path)};
            return {trail:caseDecTrail(R,P,${JSON.stringify(aud)}).map(t=>t.body+(t.rec?'*':'')+(t.here?'!':'')),agreed:caseDecAgreed(R,P),status:caseDecStatusFor(${JSON.stringify(aud)},R,P,{vote:true})}; })()`);
          const P0=path.length?path:[];
          const wantTrail=[...P0,...['team','finance','board','business','conference'].filter(b=>!P0.includes(b)&&sub[b])];
          if(JSON.stringify(R.trail.map(t=>t.replace(/[*!]/g,'')))!==JSON.stringify(wantTrail)) bad.push(['trail',mask,aud,R.trail]);
          if(R.trail.filter(t=>t.endsWith('!')).length!==(aud&&wantTrail.includes(aud)?1:0)) bad.push(['here',mask,aud,R.trail]);
          // the agreed timing: the latest positive record, in path order, that has one
          const wantAg=sub.board?'Thu evening':sub.team?'Tue evening':null;
          if(((R.agreed||{}).slot||null)!==wantAg) bad.push(['agreed',mask,aud,R.agreed]);
          if(R.status&&!/^(Agreed|Recommended|Approved|Supported|Declined|Referred|Not)/.test(R.status)) bad.push(['status words',R.status]);
          if(!Object.keys(sub).length&&R.status) bad.push(['no records, a status',mask,aud,R.status]);
          if(aud&&aud!=='conference'&&sub[aud]&&!R.status.startsWith(aud==='team'?'Agreed':aud==='finance'?'Recommended':'Approved')) bad.push(['own record first',mask,aud,R.status]);
        } } }
    c('every path and audience: the trail lists the path, then other recorded bodies; one "these slides" row; the agreed timing is the latest positive one; no status without a record', bad.slice(0,6), []);
    const S=(aud,sub,path,o)=>J(`caseDecStatusFor(${JSON.stringify(aud)},${JSON.stringify(sub)},${JSON.stringify(path)},${JSON.stringify(o||{})})`);
    const Y=d=>J(`caseDate(caseDecDay(${JSON.stringify(d)}),true)`);
    c('board deck after the finance committee: its record, with the vote on a PDF', S('board',{team:recs.team,finance:recs.finance},['team','finance','board'],{vote:true}), `Recommended by the finance committee on ${Y(recs.finance.date)} (5 for · 0 against)`);
    c('finance deck: the ministry team\'s record, by its group\'s own name', S('finance',{team:recs.team},['team','finance','board']), `Agreed by Community Services (Dorcas) on ${Y(recs.team.date)}`);
    c('…short (a slide): "the ministry team"', S('finance',{team:recs.team},['team','finance','board'],{short:true}), `Agreed by the ministry team on ${Y(recs.team.date)}`);
    c('the whole church: the latest positive record in path order', S(null,recs,['team','finance','board']), `Approved by the church board on ${Y(recs.board.date)}`);
    c('the conference: "Supported by the church board on …"', S('conference',{board:recs.board},['team','board']), `Supported by the church board on ${Y(recs.board.date)}`);
    c('…a declined board record is said as it is', S('conference',{board:{...recs.board,outcome:'declined',timing:null}},['team','board']), `Declined by the church board on ${Y(recs.board.date)}`);
    c('amended: "Approved as amended by…" (X9)', S('board',{board:{...recs.board,outcome:'amended'}},['board']), `Approved as amended by the church board on ${Y(recs.board.date)}`);
    c('the board recommending to the business meeting', S('business',{board:{...recs.board,outcome:'recommended'}},['board','business']), `Recommended by the church board to the business meeting on ${Y(recs.board.date)}`);
    c('a body outside the path is not read by the next deck', S('board',{finance:recs.finance},['team','board']), '');
    c('the vote: "by consensus", "1 abstained", "2 abstained"; ES "1 abstención", "2 abstenciones"', J(`[caseDecVoteText({for:null,against:null,abstain:null,consensus:true}),caseDecVoteText({for:3,against:0,abstain:1,consensus:false}),caseDecVoteText({for:3,against:null,abstain:2,consensus:false}),
      caseInLang('es',()=>caseDecVoteText({for:3,against:0,abstain:1,consensus:false})),caseInLang('es',()=>caseDecVoteText({for:null,against:null,abstain:2,consensus:true}))]`),
      ['by consensus','3 for · 0 against · 1 abstained','3 for · 2 abstained','3 a favor · 0 en contra · 1 abstención','2 abstenciones · por consenso']);
    c('the agreed timing in words: headline, rows and one line (EN)', J(`caseDecTimingText(caseDecAgreed(${JSON.stringify(recs)},['team','finance','board']))`),
      {head:`Agreed: Thursday evening, from ${J(`caseDate(caseDecDay(${JSON.stringify(dayOff(14))}))`)}`,
       rows:[['Day','Thursday evening'],['Time','6:00 pm'],['Starts',Y(dayOff(14))],['Length','6-week trial'],['Room','Fellowship hall'],['Agreed by','Church board · '+Y(recs.board.date)]],
       line:`Agreed: Thursday evening · 6:00 pm · ${Y(dayOff(14))} · 6-week trial · Fellowship hall`});
    c('…in Spanish ("Acordado: jueves por la noche, desde el …", "6:00 p. m.", "Prueba de 6 semanas")', J(`caseInLang('es',()=>{ const t=caseDecTimingText(caseDecAgreed(${JSON.stringify(recs)},['board'])); return [t.head.startsWith('Acordado: jueves por la noche, desde el '),t.rows[1][1],t.rows[3][1],t.rows[4][1]]; })`),
      [true,'6:00 p. m.','Prueba de 6 semanas','Salón social']);
    c('…a season and a pilot', J(`[caseDecTimingText({slot:'Sat afternoon',len:'season',weeks:13}).rows[1][1],caseInLang('es',()=>caseDecTimingText({start:${JSON.stringify(dayOff(3))},len:'pilot',weeks:4}).rows[1][1])]`),
      ['A full season (13 weeks)','Piloto de 4 semanas']);
    // Spanish: every status sentence for every group reads "al"/"del", never "a el"/"de el"
    const es=J(`caseInLang('es',()=>CASE_GROUPS.flatMap(g=>{ const b=caseBodyOf(g.id)||'team'; return caseDecOutcomes(b==='conference'?'business':b,['team','finance','board','business']).map(o=>caseDecStatus({body:b,group:g.id,date:${JSON.stringify(dayOff(-3))},outcome:o.k,vote:{for:1,against:0,abstain:2,consensus:true}},{vote:true})); }))`);
    c('Spanish status sentences for all 34 groups: no "a el" / "de el"', es.filter(s=>/(^|\s)(a|de) el\s/.test(s)), []);
    c('caseEsPrep: "a el" → "al", "de el" → "del"', J('[caseEsPrep("a","el Ministerio de Oración"),caseEsPrep("de","el equipo"),caseEsPrep("a","la junta directiva")]'), ['al Ministerio de Oración','del equipo','a la junta directiva']); }

  console.log('\n-- the approval path (PROPOSAL.md §6.1) --');
  c('default: ministry team › church board, motion first', J('caseApproval()'), {v:1,path:['team','board'],order:'motion'});
  c('cleaning: always in CASE_BODIES order, no repeats, unknown bodies dropped; the order kept', J('caseApprovalSet({path:["board","team","board","conference","finance"],order:"explain"})'), {v:1,path:['team','finance','board'],order:'explain'});
  c('…read back the same', J('caseApproval()'), {v:1,path:['team','finance','board'],order:'explain'});
  c('at least one body, else the default; an unknown order is motion first', J('caseApprovalSet({path:[],order:"sideways"})'), {v:1,path:['team','board'],order:'motion'});

  console.log('\n-- the goal (NARRATIVE.md §4, the pastor\'s answer to Q1, X5) --');
  { const x=`SIGNATURE.find(s=>s.id==='food-pantry')`;
    c('the suggestion names the idea and its outcome (EN)', J(`caseGoalSuggest(${x},'en')`), 'A real food pantry, on a schedule, so that neighbours who struggle to afford food eat well, and are treated with dignity.');
    c('…and in Spanish, the subjunctive after "para que"', J(`caseGoalSuggest(${x},'es')`), 'Una despensa de alimentos de verdad, con horario fijo, para que los vecinos a quienes les cuesta comprar alimentos coman bien y sean tratados con dignidad.');
    const all=J(`(()=>{ const out=[]; SIGNATURE.forEach(s=>['en','es'].forEach(l=>out.push(caseGoalSuggest(s,l)))); out.push(caseGoalSuggest(casePlanItem({date:'2027-02-26',nights:12,perweek:4,kind:'prophecy'}),'en')); return out; })()`);
    c('every built-in and his Planner series, EN and ES: ≤ 200 characters, ends in ".", no placeholder', all.filter(s=>!(s.length<=200&&s.endsWith('.')&&!/[{}]/.test(s))), []);
    c('the Planner series: the good news for our town', all[all.length-1].includes('so that our town hears the good news clearly'), true);
    const Pf={ministry:'food-pantry',type:'board',group:'board'}, Pt={ministry:'food-pantry',type:'team',group:'community'}, Pc={ministry:'food-pantry',type:'board',group:'finance'};
    const G=(p,l)=>J(`caseGoalOf(${JSON.stringify(p)},${x},${JSON.stringify(l||'en')})`);
    c('no words saved: the suggestion', G(Pf), {text:J(`caseGoalSuggest(${x},'en')`),suggested:true,from:'suggestion'});
    c('the key is ministry|type|group', J(`caseGoalKey(${JSON.stringify(Pf)})`), 'food-pantry|board|board');
    J(`caseGoalSet(${JSON.stringify(Pt)},'en','Every family that comes is fed, and nobody is embarrassed.',${x})`);
    c('his words for the team', G(Pt), {text:'Every family that comes is fed, and nobody is embarrassed.',suggested:false,from:'own'});
    c('…Spanish is still the suggestion', G(Pt,'es').from, 'suggestion');
    c('…the board and the finance committee read the same goal (X5: the same ministry, another group)', [G(Pf).text,G(Pf).from,G(Pc).text], ['Every family that comes is fed, and nobody is embarrassed.','ministry','Every family that comes is fed, and nobody is embarrassed.']);
    J(`caseGoalSet(${JSON.stringify(Pf)},'en','Neighbours eat well, with dignity, every other Thursday.',${x})`);
    c('the words saved most recently win for a third group', G(Pc).text, 'Neighbours eat well, with dignity, every other Thursday.');
    c('the record keeps only his words, per language', J(`uChurch().caseGoals[caseGoalKey(${JSON.stringify(Pt)})].en`), 'Every family that comes is fed, and nobody is embarrassed.');
    J(`caseGoalSet(${JSON.stringify(Pt)},'en','',${x})`);
    c('an empty box deletes that language (the record goes when empty)', J(`uChurch().caseGoals[caseGoalKey(${JSON.stringify(Pt)})]===undefined`), true);
    J(`caseGoalSet(${JSON.stringify(Pf)},'en',caseGoalSuggest(${x},'en'),${x})`);
    c('saving the suggestion itself deletes that language', J(`uChurch().caseGoals[caseGoalKey(${JSON.stringify(Pf)})]===undefined`), true);
    J(`caseGoalSet(${JSON.stringify(Pt)},'es','  Que cada familia coma bien.<b>  ',${x})`);
    c('words are cleaned (one line, no markup, 200 at most)', G(Pt,'es').text, 'Que cada familia coma bien.‹b>');
    c('200 characters at most', J(`caseGoalSet(${JSON.stringify(Pt)},'en','x'.repeat(260),${x}).text.length`), 200);
    J(`(()=>{ caseGoalSet(${JSON.stringify(Pt)},'en','Our words for the team.',${x}); caseGoalSet(${JSON.stringify(Pf)},'en',caseGoalSuggest(${x},'en'),${x}); return 1; })()`);
    c('"Use the suggestion" while another group has words: the suggestion is kept as his choice', G(Pf), {text:J(`caseGoalSuggest(${x},'en')`),suggested:false,from:'own'}); }

  console.log('\n-- the profile: members on the books, adults (GIFTS.md §2.1) --');
  { E(`capSave({...capGet(),membership:190,adults:105}); U_PEOPLE_CACHE=null;`);
    c('capMerged reads both, a blank as null', [J('capMerged().membership'),J('capMerged().adults'),J('(capSave({...capGet(),membership:"",adults:null}),[capMerged().membership,capMerged().adults])')], [190,105,[null,null]]);
    E(`openTool('survey'); render(); capRender();`);
    const f=P.w.document.getElementById('u-cap-form');
    c('the form asks both on step 1 (members on the books before the attendance, adults after it)', f?[...f.querySelectorAll('[data-panel="0"] input[type=number]')].map(i=>i.name).slice(0,3):null, ['membership','members','adults']);
    if(f){ f.querySelector('[name=members]').value='55'; f.querySelector('[name=adults]').value='60'; f.querySelector('[name=volunteers]').value='12'; f.querySelector('[name=leaders]').value='3';
      f.querySelector('[name=startupBudget]').value='1500'; f.querySelector('[name=monthlyBudget]').value='150';
      f.dispatchEvent(new P.w.Event('submit',{cancelable:true}));
      c('adults more than the attendance: not saved, and said', [P.w.document.getElementById('u-cap-status').textContent,J('capGet().adults')], ['Adults cannot be more than the attendance. Correct one of the two.',null]); } }

  console.log('\n-- the demo church is the average church (the pastor: "Yes" to Q3) --');
  { E(`capFillDemo();`);
    c('80 on the books, 55 attending, 46 adults, 12 volunteers, 3 leaders, 160 hours, $1,500 + $150', J('(()=>{ const c=capMerged(); return [c.membership,c.members,c.adults,c.hands,c.concurrent,c.hours,c.startup,c.monthly,!!capGet().demo]; })()'), [80,55,46,12,3,160,1500,150,true]);
    c('a fellowship hall of 60 and classrooms, Tuesday to Thursday evenings and Sabbath afternoon', J('(()=>{ const c=capMerged(); return [Object.keys(c.facilities).sort(),c.facilities.kitchen.capacity,c.slots]; })()'),
      [['classrooms','kitchen'],60,['Tue evening','Wed evening','Thu evening','Sat afternoon']]);
    c('the food pantry fits it (X15: the fellowship hall)', J(`uCheck(SIGNATURE.find(s=>s.id==='food-pantry'),false).gaps.filter(g=>g.k==='room').length`), 0);
    c('the sample slideshow keeps its own made-up church', J('caseSampleCtx().church.cap.members'), 135); }

  console.log('\n-- Clear all (X16) --');
  { E(`caseGoalSet({ministry:'food-pantry',type:'board',group:'board'},'en','Our own goal.'); caseDecSave('food-pantry',${JSON.stringify({...base,note:undefined})}); caseApprovalSet({path:['team','finance','board'],order:'motion'}); uChurch().giftsFirst={kind:'text',hideUntil:0};`);
    E('capClearAll()');
    c('clears the goals, the decisions and the approval path; keeps giftsFirst', J('[uChurch().caseGoals,uChurch().caseDecisions,uChurch().caseApproval===undefined,!!uChurch().giftsFirst,caseApproval().path]'), [{},{},true,true,['team','board']]); }

  console.log('\n-- the sample reads none of his records --');
  { E(`capSave(${JSON.stringify(FX.MEDIUM)}); U_PEOPLE_CACHE=null; caseApprovalSet({path:['team','finance','board','business'],order:'explain'});
       caseDecSave('food-pantry',${JSON.stringify({...base,note:undefined})}); caseGoalSet({ministry:'food-pantry',type:'board',group:'board'},'en','His own words.');`);
    const before=J('JSON.stringify([uChurch().caseGoals,uChurch().caseDecisions,uChurch().caseApproval])');
    const s=J(`(()=>{ const r=caseSample({ministry:'food-pantry',type:'board',group:'board',lang:'en'}); const m=r&&r.model||r; return {ok:!!m, ctx:(()=>{ const x=caseSampleCtx(); return [x.decisions('food-pantry'),x.approval,x.goal,x.readiness.state]; })()}; })()`);
    c('the made-up church: no decisions, no path, no goals; the whole-church column', s.ctx, [{},null,null,'half']);
    c('…and nothing was written', J('JSON.stringify([uChurch().caseGoals,uChurch().caseDecisions,uChurch().caseApproval])'), before); }
  P.w.close();

  console.log('\n-- gfReadiness (GIFTS.md §12.1 A 1–9), the average church\'s three seeds --');
  const R=async(v,fn)=>{ const Q=await page({seed:SEED(v)}); const out=fn(Q); Q.w.close(); return out; };
  c('1. before: nobody yet, 0 of 46 adults', await R('before',Q=>Q.J('(()=>{ const r=gfReadiness(); return [r.n,r.state,r.den,r.pct,r.shareOk]; })()')), [0,'none',{d:46,kind:'adults'},0,false]);
  c('2. partial: 18 of 46 (39%), below half, counts may be shared', await R('partial',Q=>Q.J('(()=>{ const r=gfReadiness(); return [r.n,r.pct,r.state,r.shareOk]; })()')), [18,39,'low',true]);
  { const a=await R('after',Q=>Q.J('gfReadiness()'));
    c('3. after: 40 took it, 39 counted (one answered 3–4 to everything), half or more', [a.n,a.counted,a.state,a.pct], [40,39,'half',87]);
    c('…the strongest three gifts, most demonstrated first', [a.strongest.length,a.strongest.every(g=>g.n>=1&&g.name),a.strongest.every((g,i,s)=>!i||s[i-1].n>=g.n)], [3,true,true]);
    c('…the profile\'s numbers', a.profile, {ready:true,membership:80,attendance:55,adults:46,hands:12,hours:160,leaders:3});
    c('…the church, by name; no link without a campaign', [a.church,a.link], ['Sampleton SDA (SAMPLE)',null]); }
  c('4. the denominator: adults, then the attendance, then the members on the books, then none', await R('partial',Q=>Q.J(`(()=>{ const out=[]; const c=capGet();
      out.push(gfReadiness().den.kind); capSave({...c,adults:null}); out.push(gfReadiness().den); capSave({...c,adults:null,members:null}); out.push(gfReadiness().den);
      capSave({...c,adults:null,members:null,membership:null}); const r=gfReadiness(); out.push([r.den,r.state,r.pct]); return out; })()`)),
    ['adults',{d:55,kind:'attendance'},{d:80,kind:'membership'},[{d:null,kind:'none'},'unknown',null]]);
  c('5. exactly half is half (40 of 80); 40 of 81 is below', await R('after',Q=>Q.J(`(()=>{ const c=capGet(); capSave({...c,adults:80}); const a=gfReadiness().state; capSave({...c,adults:81}); return [a,gfReadiness().state]; })()`)), ['half','low']);
  c('6. more results than the profile\'s adults: 100%, and "over" (said on his device only)', await R('after',Q=>Q.J(`(()=>{ capSave({...capGet(),adults:30}); const r=gfReadiness(); return [r.pct,r.over,r.state]; })()`)), [100,true,'half']);
  c('7. an under-18\'s result is never counted', await R('after',Q=>Q.J(`(()=>{ const p=uPeople().find(p=>p.gifts&&p.gifts.length); uChurch().members=[{...p,id:'kid-1',name:'A child (sample)',minor:true}]; U_PEOPLE_CACHE=null;
      const r=gfReadiness(); return [r.n,r.counted,uPeople().length]; })()`)), [40,39,41]);
  { const other=await R('partial',Q=>Q.J(`(()=>{ const rows=uRead(GF_ROSTER,[]); const enc=o=>'TG1-'+btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
      const dec=c=>JSON.parse(decodeURIComponent(escape(atob(c.slice(4).replace(/-/g,'+').replace(/_/g,'/')))));
      const a=dec(rows[0].code), b=dec(rows[1].code);
      rows.push({...rows[0],code:enc({...a,churchId:'another-church',church:'Another SDA',memberId:'x-1'})});
      rows.push({...rows[1],code:enc({...b,memberId:'x-2'}),expires:Date.now()-864e5});
      localStorage.setItem(GF_ROSTER,JSON.stringify(rows)); U_PEOPLE_CACHE=null; return gfReadiness().n; })()`));
    c('8. another church\'s result and an expired one: not counted', other, 18); }
  c('9. a church of 8 with 4 results: half, but too few to share counts', await R('after',Q=>Q.J(`(()=>{ localStorage.setItem(GF_ROSTER,JSON.stringify(uRead(GF_ROSTER,[]).slice(0,4))); U_PEOPLE_CACHE=null; capSave({...capGet(),adults:8}); const r=gfReadiness(); return [r.n,r.state,r.shareOk]; })()`)), [4,'half',false]);
  c('the short link for a slide: host, #gifts= and the campaign (+ ~es)', await R('partial',Q=>Q.J(`(()=>{ uChurch().share={church:'x',pub:'QLvn7p0Tqzd5',key:'k'}; return [gfShortLink('en'),gfShortLink('es'),gfReadiness().link]; })()`)),
    ['pastorshub.org/#gifts=QLvn7p0Tqzd5','pastorshub.org/#gifts=QLvn7p0Tqzd5~es','https://pastorshub.org/#gifts=QLvn7p0Tqzd5']);
  c('caseCtx carries the records and the readiness', await R('partial',Q=>Q.J(`(()=>{ const x=caseCtx(); return [typeof x.decisions,typeof x.approval,typeof x.goal,x.readiness.state]; })()`)), ['function','function','function','low']);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
