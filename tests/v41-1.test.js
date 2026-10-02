/* v10.41.1 — three follow-ups to v10.41.0, held here.
 *
 *  1. Children only when the idea is about children, for the 103 built-in ministries too. The pastor (29 Sep 2026): children
 *     framing on ideas that are not about children "sounds a little bit weird". v10.41.0 held the library to that rule, but a
 *     built-in still counted as about children whatever it was, so every built-in's congregation deck showed "27 in every 100
 *     are children" dots (a grief recovery group, a blood drive, a senior day program), and built-ins whose only children's
 *     need was the child share (small groups in homes, lending the sanctuary as a recital hall, a come-and-see Sabbath, an
 *     outdoor film night, a meal schedule, a parking-lot market) opened with "About 1 in 4 people around us is a child" beside
 *     Mark 10:14 or John 6:9. Now a built-in is about children only when its own need tags are children's (two or more of
 *     many-kids, family-heavy, child-poverty, k12, schools-near; "families" never counts), its skills or kind involve
 *     children (the kids skill, CASE_BRIDGE kind "children"), it is a children's or youth ministry by id, or the deck is for a
 *     children's or youth group. Proved over all 103 × board / team / congregation decks, English.
 *  2. A capacity row whose need is zero read "$2,500 free · $0 needed": such a row is left out, and a deck made before this
 *     that still carries one says only what is free ("$2,500 free" / "$2,500 disponibles").
 *  3. English step-2 line: "Ideas for the Pathfinder Club" (it read "Ideas for Pathfinder Club"), "for the elders", "for the
 *     church board"… for all 34 groups, as the Spanish articles already do.
 *  4. (fix 4, found by the independent check) Dropping the children's figure let a longer one in: 20 of the Nominating
 *     committee's Spanish "Aquí en Warminster" slides (the garden, the car care day, the meal schedule…) showed "1 de cada 9
 *     hogares … tiene un dominio limitado del inglés. Condado: 1 de cada 32." (five lines) beside two food-bank partners,
 *     Jeremiah 29:7 and the sources, and ran 10 px past the 360 × 640 frame at the smallest type (the meal schedule's already
 *     did on v10.41.0). Beside a figure a partner's name wraps after about 28 characters at every type size, so there a longer
 *     name counts as two rows (CASE_PLACE_MAX.nameLineFact): two partners only when both names fit on one line; the first
 *     still shows when its name is 40 or less, as before. Every slide re-measured in Chrome: 0 overflow.
 */
const fs=require('fs'), path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,900));console.log('    want:',JSON.stringify(e).slice(0,500));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=15000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor'};
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      w.fetch=async(u)=>{ u=String(u);
        const m=/^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if(m){ const f=path.join(ROOT,'ideas',m[1]+'.json'); if(!fs.existsSync(f)) return {ok:false,status:404,json:async()=>null};
          const t=fs.readFileSync(f,'utf8'); return {ok:true,status:200,json:async()=>JSON.parse(t)}; }
        if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false})};
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
function setup(P){
  P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null;
    capSave(${JSON.stringify(FX.MEDIUM)}); uPersist(); openTool('case'); render(); caseMount(true); })()`);
}
const listed=P=>!P.q('#cs-lib .lib-loading')&&P.qa('#cs-lib .lib-sec').length===2;
const choose=async(P,g)=>{ P.E(`caseChooseGroup(${JSON.stringify(g)})`); await until(()=>listed(P)&&P.J('casePrefs().group')===g); };

/* The 19 built-ins about children, decided one by one (table in the v10.41.1 notes): the children's and youth ministries
   (VBS, Pathfinders & Adventurers, backpacks, homework club, story corner, sports camp…), the ones staffed or run as
   children's work (a moms' group and a young-parent group with childcare, the music academy, the lot turned into a court),
   and those whose own needs are children's (a fall festival, a toy swap, a Christmas toy store, a parenting series). */
const CHILD=['vbs','backpack-giveaway','fall-festival','pathfinders','moms-group','sports-camp','christmas-store','kids-health','family-life-series',
  'kids-books','lot-sport','music-academy','homework-club','toy-swap','parents-study','school-supplies','exam-packs','story-corner','sg-parents'];
// the pastor's own examples of children framing on ideas that are not about children (v10.41.0's decks)
const NAMED=['sg-homes','sanctuary-music','come-and-see','drive-in','meal-train','lot-market','grief','blood-drive','senior-day'];
const EN_FOR={board:'the church board',business:'the business meeting',elders:'the elders',deacons:'the deacons and deaconesses',
  finance:'the treasurer and finance committee',nominating:'the nominating committee',youth:'the youth ministries (AY)',health:'the health ministries',
  community:'Community Services (Dorcas)',personal:'the personal ministries council',sabbathschool:'the Sabbath School council',
  womens:'the women’s ministries',mens:'the men’s ministries',family:'the family ministries',prayer:'the prayer ministry',
  media:'the media and communication team',hospitality:'the greeters and hospitality team',bibleworkers:'the Bible workers',
  literature:'the literature ministry',seniors:'the senior members',youngadults:'the young adults',school:'the church school and education team',
  smallgroups:'the small group leaders',worship:'the worship and music team',childrens:'the Children’s Sabbath School and children’s ministries',
  adventurers:'the Adventurer Club',pathfinders:'the Pathfinder Club',evangelism:'the evangelism team',prison:'the prison ministry',
  liberty:'the religious liberty team',possibility:'Possibility Ministries',stewardship:'the stewardship ministries',congregation:'the whole church',
  conference:'the conference leaders'};

const sec=async(f)=>{ try{ await f(); }catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e).toString().split('\n').slice(0,3).join(' | ')); fail++; } };
(async()=>{ try{
  console.log('\n-- 1. built-ins: children only when the idea is about children --');
  await sec(async()=>{ const P=page(); await sleep(1300); c('no boot errors', P.errs, []); setup(P);
    const ids=P.J('SIGNATURE.map(s=>s.id)');
    c('103 built-ins', ids.length, 103);
    c('the 19 about children, and only they (the rest are not)', ids.filter(id=>P.J(`caseChildOk(SIGNATURE.find(s=>s.id===${JSON.stringify(id)}))`)), ids.filter(id=>CHILD.includes(id)));
    // the rule itself: "families" alone never counts; two children's tags do; the kids skill or a children's kind does
    c('the rule: "families" alone, or one children\'s tag beside it, is not about children; two children\'s tags, the kids skill or kind "children" are',
      P.J(`[{id:'t1',need:['families']},{id:'t2',need:['families','many-kids','settled']},{id:'t3',need:['many-kids','k12']},{id:'t4',need:['families'],skill:['kids']},{id:'drive-in',need:['families']},{id:'vbs',need:[]}].map(x=>typeof caseBuiltinKids==='function'?caseBuiltinKids(x):null)`),
      [false,false,true,true,false,true]);
    const R=P.J(`(()=>{ const CV=CASE_CHILD_VERSES.map(id=>CASE_VERSES.find(v=>v.id===id).en.ref), KM=['Children’s Sabbath School','Adventurers','Pathfinders','Vacation Bible School'], out=[];
      for(const x of SIGNATURE){ const row={id:x.id,sp:(x.need||[]).includes('single-parents')};
        for(const [t,g] of [['board','board'],['team','community'],['congregation','congregation']]){ CASE_ST.rank=null;
          const m=caseModel(x.id,{type:t,group:g},{lang:'en'}); const d=m&&m.ok?caseDeck(m):null; if(!d){ row[t]={err:1}; continue; }
          const figs=d.slides.filter(s=>['stat','trio','place'].includes(s.type));
          const verses=d.slides.map(s=>s.type==='verse'?s.ref:(s.verse&&s.verse.ref)).filter(Boolean).map(v=>String(v).replace(/ · .*/,''));
          row[t]={childOk:m.ministry.childOk,hero:m.need&&m.need.hero?m.need.hero.key:null,heroHead:m.need&&m.need.hero?m.need.hero.head||'':'',lead:m.need?m.need.lead:null,
            needs:m.ministry.needs,min:m.ministry.min.filter(n=>KM.includes(n)),keys:(m.sources||[]).map(z=>z.key),kids:m.neighbours?m.neighbours.kidsOn:null,ages:!!(m.need&&m.need.ages),
            cv:verses.filter(v=>CV.includes(v)),dots:d.slides.some(s=>s.type==='stat'&&/in every 100 are children/.test(s.count||'')),
            words:(JSON.stringify(figs).match(/is a child|are children|children below|under 18/gi)||[]).length}; }
        out.push(row); } return out; })()`);
    c('all 103 × board, team (Community Services) and congregation decks build', R.filter(r=>r.board.err||r.team.err||r.congregation.err).map(r=>r.id), []);
    const CK=['kidsShare','childPoverty','k12Share'];
    const why=(r,t)=>{ const d=r[t], w=[]; if(d.childOk!==false) w.push('childOk '+d.childOk); if(CK.includes(d.hero)) w.push('leads with '+d.hero);
      if(['kids','schools','child-poverty'].includes(d.lead)) w.push('lead need '+d.lead); const n=d.needs.filter(x=>['kids','schools','child-poverty'].includes(x)); if(n.length) w.push('needs '+n);
      const k=d.keys.filter(x=>CK.includes(x)||(x==='singleParent'&&!r.sp)); if(k.length) w.push('figures '+k); if(d.kids!=null||d.dots) w.push('children dots');
      if(d.cv.length) w.push('verse '+d.cv); if(d.words) w.push('"a child" words'); if(d.min.length) w.push('staffed by '+d.min); if(d.ages) w.push('club ages'); return w; };
    const not=R.filter(r=>!CHILD.includes(r.id)), yes=R.filter(r=>CHILD.includes(r.id));
    const off=[]; not.forEach(r=>['board','team','congregation'].forEach(t=>{ const w=why(r,t); if(w.length) off.push([r.id,t,w.join('; ')]); }));
    c(`the ${not.length} not about children: no children's figure, no children dots, no child verse, no children's lead need or staffing, in any of the three decks`, [not.length,off.length,off.slice(0,6)], [84,0,[]]);
    const nm=NAMED.map(id=>R.find(r=>r.id===id));
    c('…his examples among them (small groups in homes, the recital hall, come-and-see, the film night, the meal schedule, the lot market, grief, the blood drive, the senior day): no "is a child", no Mark 10:14, no John 6:9',
      nm.map(r=>[r.id,['board','team','congregation'].some(t=>/is a child/.test(r[t].heroHead)||r[t].cv.length||r[t].kids!=null)]), NAMED.map(id=>[id,false]));
    c(`the ${yes.length} about children keep the children's share on the congregation's neighbours slide`, yes.filter(r=>r.congregation.kids==null||r.congregation.childOk!==true).map(r=>r.id), []);
    c('…VBS still opens with the children and "Suffer the little children"', [R.find(r=>r.id==='vbs').board.hero,R.find(r=>r.id==='vbs').board.cv.includes('Mark 10:14')], ['kidsShare',true]);
    c('…the Pathfinder club is still staffed from Pathfinders and Adventurers', R.find(r=>r.id==='pathfinders').board.min, ['Pathfinders','Adventurers']);
    // a children's or youth group's own deck may still speak of children, whatever the built-in
    // v10.42 part 3 (the relevance rule; the pastor: "not random analytics… everything should tie into that"): the group may still speak
    // of children (childOk), but a figure appears only when the idea's own purpose allows it, and the film night's allows no children's share
    c('the outdoor film night as the Pathfinder Club\'s, the children\'s ministries\' and the church school\'s deck may speak of children (no children\'s figure: its purpose allows none)',
      ['pathfinders','childrens','school'].map(g=>P.J(`(()=>{ CASE_ST.rank=null; const m=caseModel('drive-in',{type:'team',group:${JSON.stringify(g)}},{lang:'en'}); return [m.ministry.childOk,m.neighbours.kidsOn!=null]; })()`)), [[true,false],[true,false],[true,false]]);
    c('AI drafts and the Planner\'s series are judged as before (not built-ins)', P.J(`[caseChildOk({id:'draft-x',generated:true,need:[]}),caseChildOk({id:CASE_PLAN_ID,plan:true})]`), [true,true]);
    c('no errors', P.errs, []);
    P.w.close(); });

  console.log('\n-- 2. a capacity row with nothing needed --');
  await sec(async()=>{ const P=page(); await sleep(1300); setup(P);
    const Z=P.J(`(()=>{ const out=[]; for(const x of SIGNATURE) for(const lang of ['en','es']){ CASE_ST.rank=null; const m=caseModel(x.id,{type:'board',group:'board'},{lang}); if(!m||!m.ok) continue;
        const d=caseDeck(m), H=caseHandout(m,d), s=d.slides.find(s=>s.type==='capacity');
        out.push({id:x.id,lang,free:m.capacity.req.startup===0&&m.capacity.req.monthly===0,
          model:m.capacity.rows.filter(r=>r.need===0).map(r=>r.key),deck:s?s.rows.filter(r=>r.need===0).length:0,hand:H.capacity?H.capacity.rows.filter(r=>r.need===0).length:0,
          money:m.capacity.rows.some(r=>r.key==='startup'||r.key==='monthly')}); } return out; })()`);
    const free=Z.filter(z=>z.free);
    c('some built-ins cost nothing (the check is not empty)', free.length>=20, true);
    c('no capacity row whose need is zero, on any built-in\'s board deck, EN and ES: not in the model, the slide or the handout', Z.filter(z=>z.model.length||z.deck||z.hand).map(z=>[z.id,z.lang,z.model]).slice(0,6), []);
    c('…so a ministry that costs nothing shows no budget row at all ("$2,500 free · $0 needed" was the row)', free.filter(z=>z.money).map(z=>z.id).slice(0,6), []);
    const draw=(lang,rows)=>P.J(`(()=>{ const h=document.createElement('div'); document.body.appendChild(h);
      tdeckRender({lang:${JSON.stringify(lang)},slides:[{type:'capacity',headline:'c',rows:${JSON.stringify(rows)},gaps:[]}]},h,{keys:false});
      const o=[...h.querySelectorAll('.td-crow')].map(r=>(r.querySelector('.td-cfig').textContent+' '+(r.querySelector('.td-cneed')||{textContent:''}).textContent).trim().replace(/\\u00a0/g,' ')); h.remove(); return o; })()`);
    const rows=[{label:'Start-up budget',need:0,have:2500,unit:'$'},{label:'Volunteers',need:6,have:30,unit:''},{label:'Hours',need:0,have:1,unit:'h'}];
    c('a deck made before this that still carries such a row says only what is free (EN)', draw('en',rows), ['$2,500 free','30 free · 6 needed','1 h free']);
    c('…and in Spanish', draw('es',rows), ['$2,500 disponibles','30 disponibles · 6 necesarios','1 h disponible']);
    c('…the handout\'s words the same', P.J(`[tdCapWords(2500,0,'$',TD_STR.en),tdCapWords(2500,0,'$',TD_STR.es)].map(w=>w.have+w.rest)`), ['$2,500 free','$2,500 disponibles']);
    P.w.close(); });

  console.log('\n-- 3. English step 2: "Ideas for the Pathfinder Club" --');
  await sec(async()=>{ const P=page(); await sleep(1300); setup(P);
    const ids=P.J('CASE_GROUPS.map(g=>g.id)'), FOR=P.J("typeof CASE_GROUP_EN_FOR==='object'?CASE_GROUP_EN_FOR:{}");
    c('all 34 groups have their English words after "for"', [ids.length,ids.filter(id=>FOR[id]!==EN_FOR[id])], [34,[]]);
    // v10.42: the pastor (29 Sep 2026, section F, approved): "Why is there another section in Make the Case giving us another option for more ministries to do? Is this redundant or necessary?" The group, with its article, now heads "More ideas for {group}" (its line keeps "Best fit for Warminster
    // first."); the step's own line says where support is won (tests/v42-plan-first.test.js holds both for all 34)
    const lines=[]; for(const g of ids){ await choose(P,g); lines.push([g,P.txt('#cs-more h4')+'. '+P.txt('#cs-more .cs-parth .note')]); }
    c('step 2\'s "More ideas" for all 34: "More ideas for {the …}. Best fit for Warminster first."', lines.filter(([g,t])=>t!==`More ideas for ${EN_FOR[g]}. Best fit for Warminster first.`), []);
    c('…the Pathfinder Club, the elders, the church board', ['pathfinders','elders','board'].map(g=>lines.find(l=>l[0]===g)[1]),
      ['More ideas for the Pathfinder Club. Best fit for Warminster first.','More ideas for the elders. Best fit for Warminster first.','More ideas for the church board. Best fit for Warminster first.']);
    await choose(P,'pathfinders');
    P.qa('#cs-lib .lib-sec:not([hidden]) .lib-card .lib-acts button')[0].click();
    await until(()=>!!P.q('#cs-s2 .cs-chosen')&&/slides for/.test(P.txt('#cs-s3 .cs-sh .note')||''));
    c('…once an idea is chosen: "Chosen for the Pathfinder Club." and "… slides for the Pathfinder Club."',
      [P.txt('#cs-s2 .cs-sh .note'),/^\d+ slides for the Pathfinder Club\./.test(P.txt('#cs-s3 .cs-sh .note')||'')], ['Chosen for the Pathfinder Club.',true]);
    c('no errors', P.errs, []);
    P.w.close(); });
  { const P=page({lang:'es'}); await sleep(1300); setup(P);
    await choose(P,'pathfinders');
    // v10.42: the group now heads "Más ideas para {group}" (section F)
    c('Spanish: "Más ideas para el Club de Conquistadores."', P.txt('#cs-more h4')+'. '+P.txt('#cs-more .cs-parth .note'), 'Más ideas para el Club de Conquistadores. Primero, lo que mejor encaja en Warminster.');
    P.w.close(); }

  console.log('\n-- 4. the place slide beside a figure: two partners only when both names fit on one line (fix 4) --');
  await sec(async()=>{ const P=page(); await sleep(1300); setup(P);
    // who already serves near the church, as the survey's map finds them (the two food banks of the Chrome check)
    P.E(`DATA.geo=Object.assign({},DATA.geo,{coords:{x:-75.08812,y:40.20684}});
      HELP=[{cat:'food',name:'Warminster Community Food Bank',lat:40.2101,lon:-75.0852,dist:0.3,addr:'',phone:''},
        {cat:'food',name:'Bucks County Opportunity Council Pantry',lat:40.199,lon:-75.099,dist:0.8,addr:'',phone:''}];
      HELP_STATE='ready'; HELP_AT={lat:40.20684,lon:-75.08812}; ZONES=null; ZONES_STATE='idle';`);
    const place=(id,g,lang)=>P.J(`(()=>{ const m=caseModel(${JSON.stringify(id)},{type:'board',group:${JSON.stringify(g)}},{lang:'${lang}'});
      const s=caseDeck(m).slides.find(x=>x.type==='place');
      return s?{facts:s.facts.map(f=>f.value),partners:s.partners.map(p=>p.name),verse:s.verse&&s.verse.ref,nearby:m.place.partners.map(p=>p.name)}:null; })()`);
    c('the Nominating committee\'s garden deck in Spanish: the figure, the nearest partner only, Jeremiah 29:7 (it drew both partners and ran 10 px past the frame)',
      place('garden','nominating','es'), {facts:['1 de cada 6'],   // v10.42 part 3: the figure the garden's purpose allows (relevance.json)
        partners:['Warminster Community Food Bank'],verse:'Jeremías 29:7 · RVA',
        nearby:['Warminster Community Food Bank','Bucks County Opportunity Council Pantry']});
    c('…the English deck names the same partner (the choice is alike in both languages)', place('garden','nominating','en').partners, ['Warminster Community Food Bank']);
    // v10.42 part 3 (the relevance rule): the meal schedule serves the church family, so it has no "Here in" slide at all now
    c('…and so does the church board\'s garden deck (the meal schedule, for the church family, has no place slide)',
      [place('meal-train','nominating','es'),place('garden','board','es').partners], [null,['Warminster Community Food Bank']]);
    // the rule itself, on the same deck with its partners (and figure, headline) set by hand
    const pick=(names,o)=>P.J(`(()=>{ const o=${JSON.stringify(o||{})}, m=caseModel('garden',{type:'board',group:'board'},{lang:'en'});
      m.place=Object.assign({},m.place,{where:null,bring:[],nearBring:null,partners:${JSON.stringify(names)}.map((n,i)=>({name:n,kind:'Food bank or pantry',distText:(i+3)/10+' mi'}))},
        o.noFact?{facts:[]}:{},o.head?{headline:Object.assign({},m.place.headline,{max:o.head})}:{});
      const s=caseDeck(m).slides.find(x=>x.type==='place'); return s?[s.facts.length,s.partners.map(p=>p.name.length)]:null; })()`);
    c('the budget: a name wraps beside a figure after 28 characters (40 elsewhere)', P.J('[CASE_PLACE_MAX.nameLineFact,CASE_PLACE_MAX.nameLine]'), [28,40]);
    c('beside a figure, two names of 28 characters or less: both', pick(['Warminster Community Center','Hatboro Food Cupboard']), [1,[27,21]]);
    c('…exactly 28 is one line: both', pick(['Warminster Senior Food Shelf','Hatboro Food Cupboard']), [1,[28,21]]);
    c('…a first name of 29 or more takes two rows: that partner alone', [pick(['Warminster Seniors Food Shelf','Hatboro Food Cupboard']),pick(['Warminster Community Food Bank','Hatboro Food Cupboard'])], [[1,[29]],[1,[30]]]);
    c('…a one-line name, a wrapped one, a one-line one: the two one-line names', pick(['Warminster Community Center','Bucks County Opportunity Council Pantry','Hatboro Food Cupboard']), [1,[27,21]]);
    c('…a headline over three lines leaves one row: the first partner still shows with a name of 40 or less, as before; over 40 it gives way, as before',
      [pick(['Bucks County Opportunity Council Pantry','Hatboro Food Cupboard'],{head:75}),pick(['Bucks County Opportunity Council Food Pantry North','Hatboro Food Cupboard'],{head:75})], [[1,[39]],[1,[21]]]);
    c('no figure beside them (partners only): names up to 40 still take one row each, three partners', pick(['Warminster Community Food Bank','Bucks County Opportunity Council Pantry','Family Service Association Shelter'],{noFact:true}), [0,[30,39,34]]);
    c('no errors', P.errs, []);
    P.w.close(); });

  console.log('\n-- 5. the version --');
  // v10.44.0 (the pastor, 2 Oct 2026: "we need to do the projects and purchases and the conference comparison the year ahead
  // first"): the release moved on (stale, not a regression); the six stamps move together
  c('the six stamps say v10.44.0', [/TERRAIN {2}v10\.44\.0\b/.test(html.slice(0,400)),/data-version="v10\.44\.0"/.test(html),/<meta name="terrain-version" content="v10\.44\.0">/.test(html),
    /<title>Community Map — Terrain v10\.44\.0<\/title>/.test(html),/<span id="ver">v10\.44\.0<\/span>/.test(html),/const VERSION = 'v10\.44\.0';/.test(html)], [true,true,true,true,true,true]);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0); })();
