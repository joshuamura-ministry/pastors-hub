// Make the Case in three framed steps (v10.41.0). The pastor (29 Sep 2026): "'Who are you making the
// case to?' should be first. The three steps must be definable. The sections are meshed together —
// Board & officers should be a different colour… titles and descriptions should be short… Why do I
// type Prayer under 'What are you proposing?' and get four things, then 84 things underneath? Out of
// order." Then: "we can separate ministry ideas by in-reach or outreach for each one, so they can see:
// what can I do for God's people, but also what can I do for the community?", the Adventist
// departments, and "we can appeal to the conference leaders for an EVANGELISM proposal".
// Checked: the step bar (done / now / next) and the order Who → What → Slides, one short line under each
// title and no lead paragraph; step 1 drawn from CASE_GROUPS and the one display table (the groups
// builder D adds are stubbed here: each lands in its section, sub-heading and order, an unknown one by
// its kind, a listed one that does not exist yet is left out), coloured sections, the tile notes;
// step 2 as ONE list tailored to the group (CASE_GROUP_THEMES), in the library's card style with the
// built-ins as cards of the same kind, split into "For God's people" / "For our community" by each
// idea's reach (index reach, else the theme's default), theme chips, a search that reaches every idea,
// Show more, the conference's evangelism-only list with the Evangelism Planner series first; the church
// line's name; a saved "youth" Pathfinder choice moved to the Pathfinder Club; Spanish.
// jsdom does no layout: equal tiles, 4 / 2 columns and wrapping are checked in Chrome.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
const IDX=JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','index.json'),'utf8'));
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,600));console.log('    want:',JSON.stringify(e).slice(0,400));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor'};
/* The shipped index with a known reach for the prayer ideas, so the sections can be counted: 12 prayer ideas
   for God's people, 3 for both, every other idea that touches prayer (own or cross-listed) for the community.
   v10.41 integration: the real library now ships every idea's reach and the inside-the-church themes
   (member-care, spiritual-care…), so the stub no longer pretends small groups is one; member-care is. */
const col=k=>IDX.cols.indexOf(k), TI=id=>IDX.themes.findIndex(t=>t.id===id);
const prayerRows=IDX.ideas.filter(r=>r[col('t')]===TI('prayer'));
const IN_IDS=prayerRows.slice(0,12).map(r=>r[0]), BOTH_IDS=prayerRows.slice(12,15).map(r=>r[0]);
const touches=(r,ts)=>ts.includes(r[col('t')])||r[col('also')].some(t=>ts.includes(t));
function stubIndex(){
  const j=JSON.parse(JSON.stringify(IDX));
  j.ideas.forEach(r=>{ if(touches(r,[TI('prayer')])) r[col('reach')]='out'; if(IN_IDS.includes(r[0])) r[col('reach')]='in'; if(BOTH_IDS.includes(r[0])) r[col('reach')]='both'; });
  return j;
}
const STUB=stubIndex(), reachOf=id=>{ const r=STUB.ideas.find(x=>x[0]===id); return r?r[col('reach')]:null; };
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      w.fetch=async(u)=>{ u=String(u);
        const m=/^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if(m){ if(m[1]==='index') { const j=stubIndex(); return {ok:true,status:200,json:async()=>j}; }
          const f=path.join(ROOT,'ideas',m[1]+'.json'); if(!fs.existsSync(f)) return {ok:false,status:404,json:async()=>null};
          const t=fs.readFileSync(f,'utf8'); return {ok:true,status:200,json:async()=>JSON.parse(t)}; }
        if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false})};
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
/* Builder D's new groups, as CASE_GROUPS will carry them (copies of an existing group's words). */
const NEW=[['business','board','Business meeting'],['worship','team','Worship & music'],['childrens','team','Children’s Sabbath School & children’s ministries'],
  ['adventurers','team','Adventurer Club'],['pathfinders','team','Pathfinder Club'],['evangelism','team','Evangelism team'],['prison','team','Prison ministry'],
  ['liberty','team','Religious liberty'],['possibility','team','Possibility ministries'],['stewardship','team','Stewardship ministries'],
  ['conference','conference','Conference leaders'],['zzz','team','A team nobody listed']];
const addGroups=P=>P.E(`(()=>{ ${JSON.stringify(NEW)}.forEach(([id,type,en])=>{ if(CASE_GROUPS.some(g=>g.id===id)) return;
  const base=CASE_GROUPS.find(g=>g.type===(type==='conference'?'board':type)); CASE_GROUPS.push({...base,id,type,en,es:en+' (es)'}); }); })()`);
function setup(P,o){
  o=o||{};
  P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().name=${JSON.stringify(o.name===undefined?'Bucks County SDA':o.name)}; CAP=null;
    capSave(${JSON.stringify(FX.MEDIUM)}); ${o.prefs?`uChurch().proposalPrefs=${JSON.stringify(o.prefs)};`:''} ${o.pre||''} uPersist(); openTool('case'); render(); caseMount(true); })()`);
}
const type=(P,sel,v)=>{ const e=P.q(sel); e.value=v; e.dispatchEvent(new P.w.Event('input',{bubbles:true})); };
const cards=(P,sec)=>P.qa(`#cs-lib .lib-sec[data-lib-sec="${sec}"] .lib-card`);
const secN=(P,sec)=>{ const e=P.q(`#cs-lib .lib-sec[data-lib-sec="${sec}"] .lib-secn`); return e?+e.textContent.replace(/\D/g,''):0; };

(async()=>{
  const P=page(); await sleep(1300);
  c('no boot errors', P.errs, []);

  // v10.41 integration: builder D's eleven groups are real now (they were stubs while the two builders worked apart)
  console.log('\n-- the 34 groups, builder D\'s included --');
  setup(P);
  const secs=()=>P.qa('#cs-s1 .cs-aud').map(s=>[s.dataset.csSec,s.querySelectorAll('[data-cs-group]').length]);
  c('Decide 6, Ministry teams 26, On Sabbath 1, The conference 1', secs(), [['decide',6],['teams',26],['sabbath',1],['conference',1]]);
  c('every group once', P.qa('#cs-s1 [data-cs-group]').map(b=>b.dataset.csGroup).sort(), P.J('CASE_GROUPS.map(g=>g.id)').sort());

  console.log('\n-- three framed steps, in order, with the step bar --');
  c('no lead paragraph any more ("a lot of words, almost overwhelming")', [!!P.q('.cs-intro'),!!P.q('.cs-lead')], [false,false]);
  // v10.42 part 3 (the pastor, SPEC-FOCUS E: "Make the Case shows a gentle one-line banner suggesting it — but never blocks"): the
  // Gifts first line may sit above the step bar; the steps are as they were
  c('the step bar, then steps 1, 2, 3 in the page', P.qa('#casebody > *').map(e=>e.id||e.className).filter(id=>id!=='cs-gff').slice(0,4), ['cs-bar','cs-s1','cs-s2','cs-s3']);
  c('titles: Who is it for? · What will you propose? · Your slides', P.qa('.cs-step .cs-sh h3').map(h=>h.lastChild.textContent), ['Who is it for?','What will you propose?','Your slides']);
  c('…each with its big number', P.qa('.cs-step .cs-num').map(e=>e.textContent), ['1','2','3']);
  c('…and ONE short line under each (80 characters or fewer)', P.qa('.cs-step > .cs-sh').map(h=>h.querySelectorAll('.note').length===1&&h.querySelector('.note').textContent.length<=80), [true,true,true]);
  c('screen readers hear "Step 1 of 3"', P.txt('#cs-s1 h3 .cs-vh'), 'Step 1 of 3:');
  const bar=()=>P.qa('#cs-bar .cs-st').map(b=>[b.className.replace('cs-st ',''),b.querySelector('small').textContent]);
  c('the bar: step 1 now, then next, next', bar(), [['now','Tap a group'],['next','Choose one idea'],['next','Check, then present']]);
  c('…as buttons (a jump, never a #hash in the address)', P.qa('#cs-bar [data-cs-jump]').map(b=>b.tagName), ['BUTTON','BUTTON','BUTTON']);
  c('step 2 before a group: one line, and the search still works', [P.txt('#cs-lib .cs-first'),!!P.q('#cs-q')], ['First choose who it is for, in step 1. The search above reaches every idea.',true]);
  c('step 3 before a choice: one line and the sample door', [P.txt('#cs-s3 .cs-sh .note'),!!P.q('#cs-s3 [data-cs-sample]')], ['Choose who it is for and an idea, and the slides appear here.',true]);
  P.E(`caseSetPrefs({ministry:'food-pantry'}); caseDraw3();`);
  c('…an idea but no group yet: it asks only for the group', P.txt('#cs-s3 .cs-sh .note'), 'Choose who it is for, and the slides appear here.');
  P.E(`caseSetPrefs({ministry:null}); caseDraw2(); caseDraw3(); caseStepBar();`);

  console.log('\n-- step 1 with builder D\'s groups (stubbed) --');
  addGroups(P); P.E('caseMount(true)');
  c('four sections in order, each with its colour: Decide gold, teams violet, Sabbath mint, conference blue',
    P.qa('#cs-s1 .cs-aud').map(s=>[s.dataset.csSec,s.getAttribute('style'),s.querySelector('h4').textContent]),
    [['decide','--g:var(--m-hardship)','Decide'],['teams','--g:var(--m-children)','Ministry teams'],['sabbath','--g:var(--m-language)','On Sabbath'],['conference','--g:var(--m-housing)','The conference']]);
  const inSec=id=>P.qa(`#cs-s1 [data-cs-sec="${id}"] [data-cs-group]`).map(b=>b.dataset.csGroup);
  c('Decide: board, business meeting, elders, deacons, treasurer, nominating', inSec('decide'), ['board','business','elders','deacons','finance','nominating']);
  const subs=P.qa('#cs-s1 [data-cs-sec="teams"] .cs-asub').map(h=>[h.textContent,[...h.nextElementSibling.querySelectorAll('[data-cs-group]')].map(b=>b.dataset.csGroup)]);
  c('Ministry teams in four sub-headings (and "More teams" for one nobody listed)', subs, [
    ['Worship & learning',['worship','sabbathschool','childrens','school']],['Children & youth',['adventurers','pathfinders','youth','youngadults']],
    ['Outreach & evangelism',['personal','evangelism','bibleworkers','literature','community','health','media','prison','liberty','possibility']],
    ['Care & family',['prayer','hospitality','family','womens','mens','seniors','smallgroups','stewardship']],['More teams',['zzz']]]);
  c('On Sabbath: the whole church; The conference: conference leaders', [inSec('sabbath'),inSec('conference')], [['congregation'],['conference']]);
  c('one short line where the name alone could mislead', ['business','congregation','conference'].map(id=>P.txt(`[data-cs-group="${id}"] em`)), ['the whole church votes','a 6–8 minute presentation','an evangelism proposal']);
  c('tiles: a coloured dot and the name, nothing else to read', P.qa('#cs-s1 .cs-atile').every(b=>b.querySelector('.cs-adot')&&b.querySelector('b')&&!b.querySelector('svg')), true);
  c('equal tiles, 4 a row on a computer and 2 on a phone (the rules; widths are checked in Chrome)',
    [/\.cs-agrid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/.test(html),/@media\(max-width:760px\)\{[^@]*\.cs-agrid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(html),/min-height:var\(--atile-h,54px\)/.test(html)], [true,true,true]);

  console.log('\n-- step 2: one list for the Prayer ministry --');
  P.q('[data-cs-group="prayer"]').click();
  await until(()=>cards(P,'out').length>0); await sleep(100);
  c('the tile is pressed; the bar moves on', [P.q('[data-cs-group="prayer"]').getAttribute('aria-pressed'),bar().map(b=>b[0])], ['true',['done','now','next']]);
  // v10.41.1: English takes "the" where it reads naturally, as the Spanish articles do ("Ideas para el Ministerio de Oración")
  // v10.42: the pastor (29 Sep 2026, section F, approved): "Why is there another section in Make the Case giving us another option for more ministries to do? Is this redundant or necessary?" The step's one line now says it is where support is won; the group and the town head "More ideas for
  // {group}" (its heading and line), below "From your plan" (tests/v42-plan-first.test.js)
  c('the line under the title says what step 2 is for; the group and the town head "More ideas"', [P.txt('#cs-s2 .cs-sh .note'),P.txt('#cs-more h4'),P.txt('#cs-more .cs-parth .note')],
    ['This is where you win support for what your church will do.','More ideas for the prayer ministry','Best fit for Warminster first.']);
  c('two sections: For God\'s people, For our community', P.qa('#cs-lib .lib-sech h4').map(h=>h.firstChild.textContent.trim()), ['For God’s people','For our community']);
  const libIds=sec=>cards(P,sec).filter(e=>!e.classList.contains('lib-sig')).map(e=>e.dataset.libId);
  // v10.41 integration: SPEC's map gives the Prayer ministry member-care and spiritual-care for God's people and
  // prayer for the community; now that those themes ship, each section counts every idea of the three themes
  // (own or cross-listed) that faces its way, and the built-ins filed under them.
  const PT=['member-care','spiritual-care','prayer'], PTI=PT.map(TI);
  const gRows=STUB.ideas.filter(r=>touches(r,PTI)), sig=w=>P.J(`SIGNATURE.filter(x=>libBuiltinThemes(x).some(t=>${JSON.stringify(PT)}.includes(t))&&lib${w}(libReach(x))).length`);
  const inN=gRows.filter(r=>['in','both'].includes(r[col('reach')])).length+sig('In'), outN=gRows.filter(r=>['out','both'].includes(r[col('reach')])).length+sig('Out');
  c('God\'s people: six at first, each one for God\'s people (in or both)', [libIds('in').length,libIds('in').every(id=>['in','both'].includes(reachOf(id)))], [6,true]);
  c('…counted: every idea of member-care, spiritual-care and prayer marked in or both (the 12 + 3 prayer ideas among them)', [secN(P,'in'),inN>=15+50], [inN,true]);
  c('community: every other idea of the three themes (own and cross-listed) and their built-ins, the both ideas in both', secN(P,'out'), outN);
  c('…the "both" ideas are in the community list too', P.J(`(()=>{ const G=caseGroupList(); return G.rows().filter(r=>libOut(libReach(r))).map(r=>r.id); })()`).filter(id=>BOTH_IDS.includes(id)).length, 3);
  c('no prayer idea marked "in" is in the community list', P.J(`caseGroupList().rows().filter(r=>libOut(libReach(r))).map(r=>r.id)`).some(id=>IN_IDS.includes(id)), false);
  { const inCards=cards(P,'in').filter(e=>reachOf(e.dataset.libId)==='in');   // v10.41 integration: whichever "in" ideas lead the section
    c('an idea for God\'s people carries no census "Why here" (its case is the church family)', [inCards.length>0,inCards.some(e=>!!e.querySelector('.lib-why'))], [true,false]); }
  c('the card style he loves, with "Choose this" first', [P.q('#cs-lib .lib-card .lib-kind')!==null,P.q('#cs-lib .lib-card .lib-acts button').textContent], [true,'Choose this']);
  c('Show more in each section', P.qa('#cs-lib [data-lib-more]').map(b=>b.dataset.libMore), ['in','out']);
  P.q('#cs-lib [data-lib-more="out"]').click(); await sleep(60);
  c('…twelve more', cards(P,'out').length, 18);
  { const S=P.J(`SIGNATURE.filter(x=>libBuiltinThemes(x).some(t=>${JSON.stringify(PT)}.includes(t))&&libOut(libReach(x))).map(x=>x.id)`);   // v10.41 integration: the three themes' built-ins
    for(let k=0;k<10&&P.q('#cs-lib [data-lib-more="out"]');k++){ P.q('#cs-lib [data-lib-more="out"]').click(); await sleep(40); }
    c('built-ins are cards of the same kind in the same list (prayer box, prayer walk, prayer list, meal train…)', P.qa('#cs-lib .lib-sig').map(e=>e.dataset.libId).sort(), S.sort()); }
  c('a built-in card: kind, name, size, people, cost, why here, the fit, "Choose this"', (()=>{ const e=P.q('#cs-lib .lib-sig'); return [!!e.querySelector('.lib-kind'),!!e.querySelector('h4'),e.querySelectorAll('.lib-facts li').length,e.querySelector('.lib-acts button').textContent]; })(), [true,true,3,'Choose this']);
  c('no filters and no second heading in the group list (fewer words)', [!!P.q('#cs-lib .lib-filters'),!!P.q('#cs-lib .lib-head')], [false,false]);

  console.log('\n-- the search still reaches every idea --');
  type(P,'#cs-q','feeding the homeless'); await until(()=>/homeless/.test(P.txt('#cs-lib .lib-head h3')||''),6000); await sleep(200);
  c('a search shows the library\'s answer, far beyond the prayer themes', /ideas from the library for “feeding the homeless”/.test(P.txt('#cs-lib .lib-head h3')), true);
  c('…in the same two sections', P.qa('#cs-lib .lib-sec').map(s=>s.dataset.libSec).includes('out'), true);
  type(P,'#cs-q','prayer'); await until(()=>/“prayer”/.test(P.txt('#cs-lib .lib-head h3')||''),6000); await sleep(200);
  c('built-ins found by name in a search, as cards, first', [P.qa('#cs-lib .lib-sig').map(e=>e.dataset.libId).sort(),cards(P,'out').slice(0,4).every(e=>e.classList.contains('lib-sig'))],
    [['blessing-bags','doorstep-prayer','jar-of-prayer','prayer-box'],true]);
  type(P,'#cs-q',''); await sleep(350);
  c('clearing it brings back the group\'s list', [P.J('LIB_UI.case.mode'),P.qa('#cs-lib .lib-sec').length], ['group',2]);

  console.log('\n-- deacons: theme chips --');
  P.q('[data-cs-group="deacons"]').click(); await until(()=>P.qa('#cs-lib .lib-chip').length>0); await sleep(60);
  c('chips: All, then the group\'s themes that have ideas, in the table\'s order', P.qa('#cs-lib .lib-chip').map(b=>b.dataset.libChip),
    ['','deacons','member-care','fellowship','hunger','clothing-practical','seniors','disaster-relief','transport']);   // v10.41 integration: the in-reach themes ship now (SPEC: deacons, member-care, fellowship · hunger…)
  P.q('#cs-lib [data-lib-chip="seniors"]').click(); await sleep(80);
  c('a chip keeps only its theme (own, cross-listed, or a built-in filed under it)', P.E(`[...document.querySelectorAll('#cs-lib .lib-card')].every(e=>{ const id=e.dataset.libId, r=LIB.byId.get(id); if(r) return r.theme==='seniors'||r.alsoIds.includes('seniors'); const x=SIGNATURE.find(s=>s.id===id); return !!x&&libBuiltinThemes(x).includes('seniors'); })`), true);
  c('…and it is pressed', P.q('#cs-lib [data-lib-chip="seniors"]').getAttribute('aria-pressed'), 'true');

  console.log('\n-- choosing an idea --');
  const pick=cards(P,'out')[0].dataset.libId;
  cards(P,'out')[0].querySelector('[data-lib-case]').click(); await sleep(200);
  c('step 2 shows it chosen, with Change', [P.J('casePrefs().ministry'),!!P.q('#cs-s2 [data-cs-change]'),P.q('#cs-s2 .cs-chosen .lib-card').dataset.libId], [pick,true,pick]);
  // v10.42 part 3 (PROPOSAL.md): the Proposal to vote on, after the handout
  c('step 3 has the slides and every action (present, share, handout, proposal, ask list, sample)', [P.J('CASE_ST.deck.slides.length')>=8,P.qa('#cs-s3 [data-cs-act]').map(b=>b.dataset.csAct)], [true,['present','share','pdf','proposal','ask','sample']]);
  c('the bar: done, done, now, with the slide count', bar().map(b=>b[0]).concat([/\d+ slides/.test(bar()[2][1])]), ['done','done','now',true]);
  // v10.41.1: "slides for the deacons and deaconesses" (English articles, as the Spanish)
  c('one short line over the slides', P.txt('#cs-s3 .cs-sh .note'), `${P.J('CASE_ST.deck.slides.length')} slides for the deacons and deaconesses. Swipe to check them, then present.`);
  P.q('[data-cs-group="hospitality"]').click(); await sleep(150);
  c('tapping another group opens the list for it and keeps the idea until he picks another', [!!P.q('#cs-s2 [data-cs-keep]'),P.J('casePrefs().ministry'),P.J('casePrefs().group')], [true,pick,'hospitality']);
  P.q('#cs-s2 [data-cs-keep]').click(); await sleep(60);
  c('"Keep this one" folds it again', !!P.q('#cs-s2 .cs-chosen'), true);
  P.q('#cs-s2 [data-cs-change]').click(); await until(()=>P.q('#cs-lib .lib-sig'),6000);
  for(let k=0;k<12&&!P.q('#cs-lib .lib-sig');k++){ const m=P.q('#cs-lib [data-lib-more="out"]'); if(m) m.click(); await sleep(40); }
  const sid=P.q('#cs-lib .lib-sig').dataset.libId; P.q('#cs-lib .lib-sig [data-lib-case]').click(); await sleep(200);
  c('a built-in chosen from its card works the same', [P.J('casePrefs().ministry'),P.q('#cs-s2 .cs-chosen .lib-sig').dataset.libId,P.J('CASE_ST.deck.slides.length')>=8], [sid,sid,true]);

  console.log('\n-- On Sabbath: ideas everyone can join --');
  P.q('#cs-s2 [data-cs-change]').click(); await sleep(40);
  P.q('[data-cs-group="congregation"]').click(); await until(()=>cards(P,'out').length>0); await sleep(60);
  c('most of the first ideas are "This week"', cards(P,'out').filter(e=>e.querySelector('.lib-facts li').textContent==='This week').length>=4, true);

  console.log('\n-- the conference: evangelism only, the Evangelism Planner series first --');
  P.E(`uChurch().plan={church:'Bucks County SDA',date:'2027-10-02',nights:20,kind:'prophecy',perweek:4,v:3}; uPersist();`);
  P.q('[data-cs-group="conference"]').click(); await until(()=>cards(P,'out').length>0); await sleep(60);
  // v10.42: the pastor (29 Sep 2026, section F, approved): "Why is there another section in Make the Case giving us another option for more ministries to do? Is this redundant or necessary?" His series is his plan: it opens "From your plan", above "More ideas" (it was the list's first row)
  c('the first card of all is his series, opening "From your plan" above the list, with the opening night', [P.q('#cs-s2 .lib-card').classList.contains('cs-plan'),!!P.q('#cs-plan .cs-plan'),!!P.q('#cs-lib .cs-plan'),P.txt('#cs-plan .cs-plan h4')], [true,true,false,'Your evangelism series: opening night October 2, 2027']);
  const EV=['interests','involvement','public-evangelism','personal-evangelism','health','media'];
  c('every idea it lists is evangelism (its themes, or built-ins filed under them)', P.J(`caseGroupList().rows().every(r=>${JSON.stringify(EV)}.includes(r.theme)||r.alsoIds.some(t=>${JSON.stringify(EV)}.includes(t)))`), true);
  c('…the chips too', P.qa('#cs-lib .lib-chip').map(b=>b.dataset.libChip).filter(Boolean).every(t=>EV.includes(t)), true);
  P.q('#cs-plan [data-cs-plan]').click(); await sleep(150);   // v10.42: in "From your plan"
  // v10.41 integration: his series is its own ministry (builder D's casePlanItem, 'plan-series'), so the conference deck
  // argues from the planner's own opening night, nights, workers and budget
  c('choosing the series: his Evangelism Planner series itself, marked as the plan', P.J('casePrefs()'), {ministry:'plan-series',type:'conference',group:'conference',plan:true});
  c('…and step 3 builds the conference proposal from it', [P.J('CASE_ST.model&&CASE_ST.model.type'),P.J('CASE_ST.deck.slides.length')>=8], ['conference',true]);
  c('…shown chosen as his series', P.txt('#cs-s2 .cs-chosen h4'), 'Your evangelism series: opening night October 2, 2027');
  P.E(`uChurch().plan=null; uPersist();`); P.q('#cs-s2 [data-cs-change]').click(); await sleep(80);
  c('no plan, no series card', !!P.q('#cs-s2 .cs-plan'), false);   // v10.42: anywhere in step 2

  console.log('\n-- the church line names the church --');
  { const Q=page(); await sleep(1300); setup(Q);
    c('the church profile\'s name', Q.txt('#homeline .hl-t b'), 'Bucks County SDA');
    Q.E(`uChurch().name='My church'; uPersist(); homeLine();`);
    c('the placeholder: the church given at registration', Q.txt('#homeline .hl-t b'), 'Bucks County SDA');
    Q.E(`REG_PREV=null; localStorage.setItem('terrain-reg',JSON.stringify({...${JSON.stringify(REG)},church:'Fairview Village SDA'})); homeLine();`);
    c('…whatever it is', Q.txt('#homeline .hl-t b'), 'Fairview Village SDA');
    Q.E(`(()=>{ const id=uId(); uStore().churches[id]={id,name:'',address:'',capacity:{},members:[],linked:[],drafts:[],selected:[],overrides:{}}; uPersist(); homeLine(); })()`);
    c('two churches on this device: never the other one\'s name', Q.q('#homeline .hl-t b'), null); }

  console.log('\n-- a saved "youth" Pathfinder choice --');
  { const Q=page(); await sleep(1300); addGroups(Q);
    setup(Q,{prefs:{ministry:'pathfinders',type:'team',group:'youth'},pre:`uChurch().caseEdits={'pathfinders|team|youth|en':{'motion:0':{headline:'Mine'}}};`});
    c('moves to the Pathfinder Club, his words with it', [Q.J('casePrefs().group'),Object.keys(Q.J('uChurch().caseEdits'))], ['pathfinders',['pathfinders|team|pathfinders|en']]);
    c('the Pathfinder tile is pressed', Q.q('[data-cs-group="pathfinders"]').getAttribute('aria-pressed'), 'true');
    const R=page(); await sleep(1300); addGroups(R);
    setup(R,{prefs:{ministry:'homework-club',type:'team',group:'youth'}});
    c('any other youth choice stays with Youth ministries', R.J('casePrefs().group'), 'youth');
    c('a Pathfinder sample goes to the Pathfinder Club', R.E(`caseDefaultGroup('team','pathfinders')`), 'pathfinders');
    c('the sample offers a conference slideshow once the group exists', (R.E('caseSampleOpen()'),R.qa('[data-cs-stype]').map(b=>b.dataset.csStype)), ['board','team','congregation','conference']);
    const Z=page(); await sleep(1300); setup(Z,{prefs:{ministry:'pathfinders',type:'team',group:'youth'}});
    // v10.41 integration: builder D's Pathfinder Club is real, so a saved youth Pathfinder choice moves without any stub
    c('…with the real Pathfinder Club (no stub), it moves', Z.J('casePrefs().group'), 'pathfinders'); }

  console.log('\n-- reach: every idea for God\'s people, the community, or both --');
  { const Q=page(); await sleep(1300); setup(Q); Q.E(`openTool('survey'); render();`);
    type(Q,'#u-search','prayer'); await until(()=>Q.qa('#u-lib .lib-sec').length===2); await sleep(60);
    c('the survey\'s library: the same two sections', Q.qa('#u-lib .lib-sech h4').map(h=>h.firstChild.textContent.trim()), ['For God’s people','For our community']);
    c('…God\'s people: the 12 "in" and the 3 "both"', Q.txt('#u-lib .lib-sec[data-lib-sec="in"] .lib-secn'), String(STUB.ideas.filter(r=>touches(r,[TI('prayer')])&&['in','both'].includes(r[col('reach')])).length));
    c('…twelve a page in each', [Q.qa('#u-lib .lib-sec[data-lib-sec="in"] .lib-card').length,Q.qa('#u-lib .lib-sec[data-lib-sec="out"] .lib-card').length], [12,12]);
    type(Q,'#u-search',''); await sleep(300); Q.q('#u-lib [data-lib-browse]').click(); await until(()=>Q.qa('#u-lib .lib-tile').length>0);
    const tl=sec=>Q.qa(`#u-lib .lib-sec[data-lib-sec="${sec}"] .lib-tile`).map(t=>t.dataset.libTheme);
    // v10.41 integration: member-care is a real inside-the-church theme now (it was small groups, stubbed)
    c('theme browse grouped the same way: an inside-the-church theme under God\'s people only', [tl('in').includes('member-care'),tl('out').includes('member-care')], [true,false]);
    c('…a theme with ten or more ideas each way under both, each counting its own', [tl('in').includes('prayer'),tl('out').includes('prayer'),Q.txt('#u-lib .lib-sec[data-lib-sec="in"] [data-lib-theme="prayer"] span')], [true,true,'15 ideas']);
    c('…a section\'s own themes first', tl('in')[0], 'member-care');
    c('…a theme with none for God\'s people only under the community', [tl('in').includes('hunger'),tl('out').includes('hunger')], [false,true]);
    c('libReach: the idea\'s own, else its theme\'s (inside → in, a theme\'s reach, else out); built-ins from their table, else out; a new idea its section',
      Q.J(`[libReach(LIB.byId.get(${JSON.stringify(IN_IDS[0])})),libReach(LIB.byId.get(${JSON.stringify(BOTH_IDS[0])})),libReach(LIB.rows.find(r=>r.theme==='hunger'&&r.reach==='out')),libReach(LIB.rows.find(r=>r.theme==='member-care')),
        libThemeReach({reach:'both'}),libReach(SIGNATURE.find(x=>x.id==='pathfinders')),libReach(SIGNATURE.find(x=>x.id==='food-pantry')),libReach({id:'fresh-x',ai:true,theme:'hunger',reach:'in'})]`),
      ['in','both','out','in','both','both','out','in']);
    // the classifier's file (v10.41 review: a copy in tests/, so this is checked in the repo too, not only beside the build scratchpad)
    const RB=JSON.parse(fs.readFileSync(path.join(__dirname,'reach-builtins.json'),'utf8'));
    c('…the built-ins\' reach is the classifier\'s (tests/reach-builtins.json), every built-in classified', [Object.keys(RB).length>=100,Q.J(`SIGNATURE.filter(x=>LIB_BUILTIN_THEMES[x.id]).map(x=>x.id)`).filter(id=>!RB[id]),Q.J(`SIGNATURE.map(x=>[x.id,libReach(x)])`).filter(([id,r])=>RB[id]&&RB[id]!==r)], [true,[],[]]);
    c('every built-in is filed under themes the library has (or will have: the new Adventist themes)', Q.J(`SIGNATURE.filter(x=>!libBuiltinThemes(x).length).map(x=>x.id)`), []);
    c('…the built-in reach table only says in, out or both', Q.J(`Object.values(LIB_BUILTIN_REACH).every(v=>['in','out','both'].includes(v))`), true);
    const KNOWN=[...IDX.themes.map(t=>t.id),'member-care','spiritual-care','deacons','stewardship','involvement','sabbath-school','fellowship','worship-music','childrens-ministries','pathfinders','adventurers','ay-youth','interests','religious-liberty','global-mission'];
    c('…and every theme a group or a built-in names is one of the 57', Q.J(`[...Object.values(CASE_GROUP_THEMES).flat(),...Object.values(LIB_BUILTIN_THEMES)].join(' ').split(' ').filter(t=>t&&t!=='*')`).filter(t=>!KNOWN.includes(t)), []);
    c('no errors', Q.errs, []); }

  console.log('\n-- Spanish --');
  { const S=page({lang:'es'}); await sleep(1300); addGroups(S); setup(S);
    c('titles in Spanish', S.qa('.cs-step .cs-sh h3').map(h=>h.lastChild.textContent), ['¿Para quién es?','¿Qué va a proponer?','Sus diapositivas']);
    c('sections in Spanish', S.qa('#cs-s1 .cs-aud h4').map(h=>h.textContent), ['Quienes deciden','Equipos de ministerio','En sábado','La asociación']);
    c('sub-headings and notes in Spanish', [S.qa('#cs-s1 .cs-asub').map(h=>h.textContent).slice(0,4),S.txt('[data-cs-group="business"] em')],
      [['Adoración y enseñanza','Niños y jóvenes','Alcance y evangelismo','Cuidado y familia'],'vota toda la iglesia']);
    S.q('[data-cs-group="prayer"]').click(); await until(()=>S.qa('#cs-lib .lib-sec').length===2); await sleep(60);
    c('the two sections in Spanish', S.qa('#cs-lib .lib-sech h4').map(h=>h.firstChild.textContent.trim()), ['Para la familia de la iglesia','Para la comunidad']);
    c('"Elegir esta" on the cards', S.q('#cs-lib .lib-card .lib-acts button').textContent, 'Elegir esta');
    c('every UI string in step 1 and 2 has both languages', S.J(`[...Object.entries(CASE_STEP_UI),...CASE_AUD_SECTIONS.map(s=>[s.id,s]),...Object.entries(CASE_AUD_SUBS),...Object.entries(CASE_AUD_NOTE)].filter(([k,v])=>!(v.en&&v.es)).map(([k])=>k)`), []); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{ console.log('CRASH',e&&e.stack); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); });
