/* v10.41.0 — the two builders' halves and the idea writers' library, joined (integration).
 *
 * The pastor (29 Sep 2026): "When I choose, say, Prayer Ministry or another ministry, the answer should be tailored
 * to that ministry's focus … Why do I type Prayer under 'What are you proposing?' and get four things, then 84
 * things underneath?" Then: "we can separate ministry ideas by in-reach or outreach for each one, so they can see:
 * what can I do for God's people, but also what can I do for the community?", "think about Adventists … all the
 * things we would have as a denomination. We also have an evangelism team", and "we can appeal to the conference
 * leaders for an EVANGELISM proposal".
 *
 * This suite holds, against the REAL packaged library (ideas/, 57 themes) and the real 34 groups:
 *   1. every idea ships a reach (in, out or both), and it is the idea's own, else reach.json's, else its theme's;
 *   2. every group's step 2 has ideas on both sides the SPEC's map gives it, a full first page each, every card
 *      facing its section's way; a side next to an "every theme" side keeps to the group's own themes;
 *   3. the page's two reach readers agree (libReach for the lists, caseReachOf for the decks);
 *   4. a real in-reach idea's deck argues from the church family ("Our church family", no Census slide);
 *   5. the conference: evangelism only, his Evangelism Planner series first, chosen as its own ministry
 *      (plan-series) so the deck takes the planner's dates; "Adjust" opens the Planner.
 */
const fs=require('fs'), path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
const IDX=JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','index.json'),'utf8'));
const SRC=path.join(ROOT,'tools','ideas-src');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,700));console.log('    want:',JSON.stringify(e).slice(0,500));fail++}else pass++};
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
function setup(P,o){
  o=o||{};
  P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null;
    capSave(${JSON.stringify(FX.MEDIUM)}); ${o.pre||''} uPersist(); openTool('case'); render(); caseMount(true); })()`);
}
const secN=(P,sec)=>{ const e=P.q(`#cs-lib .lib-sec[data-lib-sec="${sec}"] .lib-secn`); return e?+e.textContent.replace(/\D/g,''):0; };
const secCards=(P,sec)=>P.qa(`#cs-lib .lib-sec[data-lib-sec="${sec}"] .lib-card`);
const listed=P=>!P.q('#cs-lib .lib-loading')&&P.qa('#cs-lib .lib-sec').length===2;

/* SPEC section 1, "Group → themes", in the page's group ids ('*' = every theme, best fit first). */
const SPEC_MAP={
  board:['*','*'], business:['*','*'],
  elders:['spiritual-care member-care sabbath-school','prayer personal-evangelism grief small-groups'],
  deacons:['deacons member-care fellowship','hunger clothing-practical seniors disaster-relief transport'],
  finance:['stewardship involvement','jobs-money'],
  nominating:['involvement spiritual-care member-care','*'],
  youth:['ay-youth fellowship','youth'],
  health:['member-care','health mental-health addiction'],
  community:['member-care deacons','hunger clothing-practical homeless disaster-relief'],
  // v10.41 final review: a side's first theme now leads its list outright, so a group whose own focus is a community theme lists
  // it first for God's people too (the pastor: "the prayer ministry focuses on prayer"); every SPEC theme is kept
  personal:['personal-evangelism involvement spiritual-care interests','personal-evangelism public-evangelism literature neighbors'],
  sabbathschool:['sabbath-school member-care fellowship global-mission','small-groups personal-evangelism'],
  womens:['member-care fellowship','women single-parents abuse-survivors'], mens:['fellowship involvement','men veterans workplaces'],
  family:['fellowship member-care','families marriage single-parents foster-care'],
  prayer:['prayer member-care spiritual-care','prayer'], media:['media fellowship member-care','media'],
  hospitality:['member-care fellowship','hospitality neighbors'],
  bibleworkers:['spiritual-care','personal-evangelism public-evangelism'], literature:['literature involvement','literature'],
  seniors:['member-care fellowship','seniors grief'], youngadults:['young-adults fellowship involvement','young-adults'],
  school:['sabbath-school','education schools children'], smallgroups:['fellowship spiritual-care','small-groups neighbors'],
  congregation:['member-care fellowship involvement','*'],
  worship:['worship-music fellowship','music-arts'], childrens:['childrens-ministries sabbath-school','children families'],
  adventurers:['adventurers','children families'], pathfinders:['pathfinders','youth sports-outdoors creation-care'],
  evangelism:['interests spiritual-care','public-evangelism personal-evangelism media'], prison:['member-care','prison'],
  liberty:['religious-liberty','religious-liberty'], possibility:['disability member-care worship-music','disability'],
  stewardship:['stewardship','jobs-money'],
  conference:['interests involvement','public-evangelism personal-evangelism health media']};

(async()=>{
  console.log('\n-- 1. every idea ships a reach --');
  const col=k=>IDX.cols.indexOf(k), themeIds=IDX.themes.map(t=>t.id);
  const NEW15=['member-care','spiritual-care','deacons','stewardship','involvement','sabbath-school','fellowship','worship-music','childrens-ministries','pathfinders','adventurers','ay-youth','interests','religious-liberty','global-mission'];
  c('57 themes ship, the fifteen new ones among them', [IDX.themes.length,NEW15.filter(t=>!themeIds.includes(t))], [57,[]]);
  c('…each of the fifteen with 50 ideas or more', NEW15.filter(t=>(IDX.themes.find(x=>x.id===t)||{}).n<50), []);
  c('every idea has a reach: in, out or both', IDX.ideas.filter(r=>!['in','out','both'].includes(r[col('reach')])).map(r=>r[0]), []);
  const TH=JSON.parse(fs.readFileSync(path.join(SRC,'themes.json'),'utf8')).themes;
  const RJ=JSON.parse(fs.readFileSync(path.join(SRC,'reach.json'),'utf8')), RF=RJ.reach&&typeof RJ.reach==='object'?RJ.reach:RJ;
  const own=new Map(); TH.forEach(t=>{ const f=path.join(SRC,'themes',t.id+'.json'); if(fs.existsSync(f)) JSON.parse(fs.readFileSync(f,'utf8')).ideas.forEach(x=>own.set(x.id,{x,t})); });
  const want=id=>{ const o=own.get(id); if(!o) return null; if(['in','out','both'].includes(o.x.reach)) return o.x.reach; if(RF[id]) return RF[id];
    return ['in','out','both'].includes(o.t.reach)?o.t.reach:o.t.inside===true?'in':'out'; };
  c('…and it is the idea\'s own, else reach.json\'s, else its theme\'s (inside → in, else out)', IDX.ideas.filter(r=>r[col('reach')]!==want(r[0])).map(r=>r[0]).slice(0,10), []);
  const OLD42=TH.filter(t=>!NEW15.includes(t.id)).map(t=>t.id);
  c('reach.json classifies every idea of the 42 older themes (none left to a default)', [...own.values()].filter(o=>OLD42.includes(o.t.id)&&!o.x.reach&&!RF[o.x.id]).map(o=>o.x.id), []);
  c('…and names no idea that does not ship', Object.keys(RF).filter(id=>!own.has(id)), []);
  // an inside-the-church theme's ideas are for God's people unless the writer says otherwise in the idea itself
  // (e.g. a Sabbath School class's quarterly service project with a local agency is outreach)
  c('the inside-the-church themes default to God\'s people: an "out" idea there says so itself', IDX.ideas.filter(r=>TH.find(t=>t.id===IDX.themes[r[col('t')]].id).inside===true&&r[col('reach')]==='out'&&!(own.get(r[0])&&own.get(r[0]).x.reach==='out')).map(r=>r[0]), []);

  const P=page(); await sleep(1300);
  c('no boot errors', P.errs, []);
  setup(P);

  console.log('\n-- 2. every group\'s step 2: both sides, as the SPEC\'s map gives them --');
  const G=P.J('CASE_GROUPS.map(g=>g.id)');
  c('34 groups, every one in the map (none falls back by its kind)', [G.length,G.filter(id=>!P.J(`!!CASE_GROUP_THEMES[${JSON.stringify(id)}]`))], [34,[]]);
  c('the page\'s map is the SPEC\'s (six groups with their own theme first: final review)', G.filter(id=>JSON.stringify(P.J(`CASE_GROUP_THEMES[${JSON.stringify(id)}]`))!==JSON.stringify(SPEC_MAP[id])), []);
  const rows=[], wrongWay=[];
  for(const id of G){
    P.E(`caseChooseGroup(${JSON.stringify(id)})`); await until(()=>listed(P));
    const n={in:secN(P,'in'),out:secN(P,'out')}, first={in:secCards(P,'in').length,out:secCards(P,'out').length};
    rows.push([id,n.in>0,n.out>0,first.in,first.out]);
    ['in','out'].forEach(sec=>secCards(P,sec).forEach(e=>{ const r=P.J(`(()=>{ const id=${JSON.stringify(e.dataset.libId)}; const row=LIB.byId.get(id); if(row) return libReach(row);
      const x=SIGNATURE.find(s=>s.id===id); return x?libReach(x):null; })()`); if(!(sec==='in'?['in','both']:['out','both']).includes(r)) wrongWay.push([id,sec,e.dataset.libId,r]); }));
  }
  c('every group has ideas for God\'s people and for the community, a full first page (6) of each', rows.filter(r=>!(r[1]&&r[2]&&r[3]===6&&r[4]===6)), []);
  c('…every card faces its section\'s way (in or both / out or both)', wrongWay.slice(0,10), []);
  // a side next to an "every theme" side keeps to the group's own themes (not every in-reach idea in the library)
  for(const id of ['nominating','congregation']){
    P.E(`caseChooseGroup(${JSON.stringify(id)})`); await until(()=>listed(P));
    const own=SPEC_MAP[id][0].split(' ');
    const ok=P.J(`(()=>{ const G=caseGroupList(), lim=G.limit.in; return !!lim&&[...lim].sort().join(' ')===${JSON.stringify(own.slice().sort().join(' '))}; })()`);
    const n=P.J(`(()=>{ const own=${JSON.stringify(own)}; return LIB.rows.filter(r=>libIn(libReach(r))&&(own.includes(r.theme)||r.alsoIds.some(t=>own.includes(t)))).length
      +SIGNATURE.filter(x=>libBuiltinThemes(x).some(t=>own.includes(t))&&libIn(libReach(x))).length; })()`);
    c(`${id}: God's people keeps to ${own.join(', ')} (every theme for the community)`, [ok,secN(P,'in'),secN(P,'out')>secN(P,'in')], [true,n,true]);
  }
  c('the board and the business meeting: every theme on both sides, best fit first', ['board','business'].map(id=>P.J(`(()=>{ caseSetPrefs({group:${JSON.stringify(id)},type:'board'}); const G=caseGroupList(); return [G.every,G.limit.in,G.limit.out]; })()`)), [[true,null,null],[true,null,null]]);

  console.log('\n-- 3. the lists and the decks read reach the same way --');
  c('caseReachOf (the decks) agrees with libReach (the lists) for every idea in the library', P.J(`LIB.rows.filter(r=>caseReachOf({id:r.id,lib:true,theme:r.theme})!==libReach(r)).map(r=>r.id).slice(0,10)`), []);
  c('…and for every built-in', P.J(`SIGNATURE.filter(x=>caseReachOf(x)!==libReach(x)).map(x=>x.id)`), []);

  console.log('\n-- 4. a real in-reach idea\'s deck: the church family, not the Census --');
  { const pick=P.J(`LIB.rows.filter(r=>r.theme==='member-care'&&r.reach==='in').map(r=>r.id)[0]`);
    P.E(`caseChooseGroup('deacons')`); await until(()=>listed(P));
    await P.E(`libLoadTheme('member-care')`);
    P.E(`(()=>{ const raw=libFull(${JSON.stringify(pick)}); libSave(raw); caseChoose(${JSON.stringify(pick)}); })()`); await sleep(150);
    const m=P.J('({ok:CASE_ST.model&&CASE_ST.model.ok,inreach:CASE_ST.model&&CASE_ST.model.inreach,reach:CASE_ST.model&&CASE_ST.model.reach})');
    // v10.42 part 3: a close that asks carries its verse as a quote (the appeal's verse); How it works carries one only where its steps
    // leave room (NARRATIVE.md §6.1, N7: a verse that does not fit is passed over, never cut)
    const S=P.J('CASE_ST.deck.slides.map(s=>({type:s.type,kicker:s.kicker||"",verse:!!((s.verse&&s.verse.text)||(s.type==="close"&&s.quote&&s.quote.text))}))');
    c(`${pick} for the deacons: an in-reach deck`, [P.J('casePrefs().ministry'),m], [pick,{ok:true,inreach:true,reach:'in'}]);
    c('…"Our church family" once, no Census figure slide, no "Here in {town}"', [S.filter(s=>s.type==='place'&&s.kicker==='Our church family').length,S.filter(s=>s.type==='stat').length,S.some(s=>/^Here in/.test(s.kicker))], [1,0,false]);
    c('…Scripture on every content slide (How it works where its steps leave room)', S.filter(s=>!['join','how'].includes(s.type)&&!s.verse).map(s=>s.type), []);
    c('…the risks open with the privacy of care lists', /private|privacy|consent|confiden/i.test(P.J(`JSON.stringify(CASE_ST.deck.slides.find(s=>s.type==='risks')||CASE_ST.deck.slides.find(s=>s.type==='roles')||{})`)), true);
    c('…and step 2 shows it chosen, as its library card', [!!P.q('#cs-s2 .cs-chosen .lib-card'),P.q('#cs-s2 .cs-chosen .lib-card')&&P.q('#cs-s2 .cs-chosen .lib-card').dataset.libId], [true,pick]); }

  console.log('\n-- 5. the conference: evangelism only, his series first --');
  { P.E(`caseSetPrefs({ministry:null}); uChurch().plan={church:'Bucks County SDA',date:'2027-09-11',nights:16,kind:'prophecy',perweek:4,workers:18,budget:12000,v:3}; uPersist(); CASE_ST.pick=true; caseMount(true);`);
    // v10.42: the pastor (29 Sep 2026, section F, approved): "Why is there another section in Make the Case giving us another option for more ministries to do? Is this redundant or necessary?" His series is his plan: it opens "From your plan", above the list
    P.E(`caseChooseGroup('conference')`); await until(()=>listed(P)&&P.q('#cs-plan .cs-plan'));
    c('his series is the first card, opening "From your plan" above both sections', [P.q('#cs-s2 .lib-card').classList.contains('cs-plan'),P.txt('#cs-plan .cs-plan h4')], [true,'Your evangelism series: opening night September 11, 2027']);
    const EV=SPEC_MAP.conference.join(' ').split(' ');
    c('every idea listed is evangelism (its themes, cross-listed, or built-ins filed under them)', P.J(`caseGroupList().rows().filter(r=>!(${JSON.stringify(EV)}.includes(r.theme)||r.alsoIds.some(t=>${JSON.stringify(EV)}.includes(t)))).length`), 0);
    P.q('#cs-plan [data-cs-plan]').click(); await sleep(200);
    c('choosing it: the plan-series ministry itself', P.J('casePrefs()'), {ministry:'plan-series',type:'conference',group:'conference',plan:true});
    c('…step 2 shows it chosen; the step bar names it', [P.txt('#cs-s2 .cs-chosen h4'),P.qa('#cs-bar .cs-st')[1].className.includes('done')], ['Your evangelism series: opening night September 11, 2027',true]);
    const D=P.J('CASE_ST.deck.slides.map(s=>s.type)');
    c('…the conference proposal is built from it (up to 12 slides, the plan\'s timeline, the ask)', [P.J('CASE_ST.model.type'),D.length>=8&&D.length<=12,D.includes('timeline'),D.includes('ask')], ['conference',true,true,true]);
    c('…its timeline carries the opening night from the Planner', /11 Sep|September 11|11 de septiembre|Sep 11/i.test(P.J(`JSON.stringify(CASE_ST.deck.slides.find(s=>s.type==='timeline'))`)), true);
    P.q('#cs-s3 [data-cs-adjust]').click(); await sleep(150);
    c('"Adjust" opens the Evangelism Planner, where the series\' numbers live', [P.E('TOOL'),P.q('#planner')&&P.q('#planner').hidden], ['planner',false]); }

  c('no page errors', P.errs, []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{ console.log('CRASH',e&&e.stack); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); });
