// v10.42.0 (section F) — one flow from the Community Survey to Make the Case, no duplication.
// The pastor (29 Sep 2026): "On the Community Survey it gives you ideas — ministries your church could offer. Why is there
// another section in Make the Case giving us another option for more ministries to do? Is this redundant or necessary?"
// He approved the answer ("YES — build it"): the survey's ministries are what the NEIGHBOURHOOD needs (For our community),
// where the church chooses what to do; Make the Case step 2 is which one to PROPOSE to the group chosen in step 1. It opens
// with "From your plan" (the ministries added in the survey, and the idea already chosen, that fit this group), then "More
// ideas for {group}" (mainly the in-reach and department ideas the survey does not cover); an empty plan points back to the
// survey in one line; words on both screens make the difference plain in one short line each.
// Checked: the survey's first line and its outreach-only list (an in-reach library idea kept by the church never appears
// there, with or without the Idea Library's index loaded; the plan itself still lists it); step 2's one line; "From your
// plan" per group (the deciding bodies take the whole plan), its cards in the list's card style with one "Choose this",
// never repeated below; "More ideas for {group}" with the group's article for all 34 groups, EN and ES; the empty plan and
// the plan with nothing for this group; the idea already chosen; the conference's Evangelism Planner series; the board's
// "More ideas" opening on God's people; Spanish. jsdom does no layout: the screens are checked in Chrome.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,700));console.log('    want:',JSON.stringify(e).slice(0,500));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor'};
const theme=id=>JSON.parse(fs.readFileSync(path.join(ROOT,'ideas',id+'.json'),'utf8'));
const rawOf=(t,id)=>theme(t).ideas.find(x=>x.id===id);
// three library ideas the church may keep: an outreach prayer idea, an in-reach member-care card (its need tags fire in
// almost any town), and an in-reach idea filed under an OUTWARD theme (its reach is known only from the index)
const CAL=rawOf('prayer','prayer-town-prayer-calendar'), CARD=rawOf('member-care','member-care-two-sabbath-card'),
  ANNIV=rawOf('personal-evangelism','personal-evangelism-baptism-anniversary');
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const net={idx:0};
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){};
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      if(o.store) w.localStorage.setItem('terrain-churches-v1',JSON.stringify(o.store));
      w.fetch=async(u)=>{ u=String(u);
        const m=/^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if(m){ if(m[1]==='index') net.idx++;
          const f=path.join(ROOT,'ideas',m[1]+'.json'); if(!fs.existsSync(f)) return {ok:false,status:404,json:async()=>null};
          const t=fs.readFileSync(f,'utf8'); return {ok:true,status:200,json:async()=>JSON.parse(t)}; }
        if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false})};
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,net,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
function setup(P,o){
  o=o||{};
  P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null;
    capSave(${JSON.stringify(FX.MEDIUM)}); ${o.pre||''} uPersist(); openTool(${JSON.stringify(o.tool||'case')}); render(); ${o.tool==='survey'?'':'caseMount(true);'} })()`);
}
const listed=P=>!!P.q('#cs-lib .lib-sec .lib-card')||!!P.q('#cs-lib .lib-secnone');
const choose=async(P,g)=>{ P.E(`caseChooseGroup(${JSON.stringify(g)})`); await until(()=>listed(P)&&P.J('casePrefs().group')===g&&!!P.q('#cs-plan')); await sleep(30); };
const planIds=P=>P.qa('#cs-plan .lib-card').map(e=>e.dataset.libId);
// every row the survey's list can show (every level, within reach and not yet), whatever is open or folded
const rowsAll=P=>P.J(`(()=>{ const b=U_BAND, f=U_FILTER, out=[]; U_BAND=''; for(const k of ['fit','needs']){ U_FILTER=k; const d=document.createElement('div');
  d.innerHTML=uCardsHTML(suggestions(DATA.M,SCOPE).moves); out.push(...[...d.querySelectorAll('[data-row]')].map(e=>e.dataset.row)); } U_BAND=b; U_FILTER=f; return out; })()`);
const listIds=P=>P.qa('#cs-lib .lib-sec .lib-card').map(e=>e.dataset.libId);
const PLAN=`libSave(${JSON.stringify(CAL)}); uChurch().selected=['food-pantry','prayer-town-prayer-calendar'];`;
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
  // v10.45.0 (stale, kept in a new form): the survey's ministries list is gone (DESIGN-SURVEY §1.1); "the survey is for our community" is now
  // the needs' rule: no need's ideas include an idea for God's people (the build refuses them, §6.3; v45-needs-ui checks the page). The
  // list's first line (.u-choose) and "Your selected plan" retire with it; signatureMoves' own rule (reach) is still checked.
  console.log('\n-- 1. the survey: for our community --');
  await sec(async()=>{ const P=page(); await sleep(1300);
    await P.E(`libLoadIndex()`); await until(()=>P.J('!!LIB.idx'));
    setup(P,{tool:'survey',pre:`libSave(${JSON.stringify(CAL)}); libSave(${JSON.stringify(CARD)}); libSave(${JSON.stringify(ANNIV)});`});
    await P.E(`nsLoad()`); await until(()=>P.J('!!NS.map'));
    c('the needs\' ideas: every one for the community (none for God\'s people)', P.J(`NSM.needs.concat(NSM.also).flatMap(n=>nsIdeasFor(n)).filter(v=>v.reach==='in').map(v=>v.id)`), []);
    const moves=P.J(`suggestions(DATA.M,SCOPE).moves.map(x=>x.id)`);
    c('an outreach library idea the church keeps is in the list (its need tags fire here)', moves.includes('prayer-town-prayer-calendar'), true);
    c('…an in-reach one never is: the card after two missed Sabbaths, a card on each baptism anniversary (filed under personal evangelism)',
      [moves.includes('member-care-two-sabbath-card'),moves.includes('personal-evangelism-baptism-anniversary')], [false,false]);
    const rows=rowsAll(P);
    c('…nor in its rows, at any level, within reach or not yet (the outreach one is)', [rows.includes('member-care-two-sabbath-card'),rows.includes('personal-evangelism-baptism-anniversary'),rows.includes('prayer-town-prayer-calendar')], [false,false,true]);
    c('…their need tags DO fire here (so only the reach keeps them out)', P.J(`(()=>{ const t=suggestions(DATA.M,SCOPE).tags; return ['member-care-two-sabbath-card','personal-evangelism-baptism-anniversary'].map(id=>uCatalog().find(x=>x.id===id).need.some(n=>t.has(n))); })()`), [true,true]);
    P.E(`uChurch().selected=['member-care-two-sabbath-card']; uPersist(); uRefresh();`);
    // v10.47.1: What's next is no longer drawn in the survey; the plan itself is read
    c('added to the plan anyway (from the Idea Library), it is in the plan and still never in the rows', [P.J('uSelected()').includes('member-care-two-sabbath-card'),rowsAll(P).includes('member-care-two-sabbath-card')], [true,false]);
    c('no errors', P.errs, []);
    P.w.close(); });
  await sec(async()=>{ const id='church-1';
    const store={active:id,churches:{[id]:{id,name:'Bucks County SDA',address:'',capacity:{},selected:[],overrides:{},members:[],linked:[],drafts:[],share:{},
      lib:{[ANNIV.id]:ANNIV,[CAL.id]:CAL}}}};
    const P=page({store}); await sleep(1300);
    c('a fresh visit: the Idea Library\'s index is not loaded yet', P.J('!!LIB.idx'), false);
    setup(P,{tool:'survey'});
    await until(()=>P.J('!!LIB.idx'),4000); await sleep(80);
    c('…the survey loads it once, for the needs\' ideas (1.5 s after it draws)', [P.net.idx,P.J('!!LIB.idx')], [1,true]);
    c('…and the list is drawn again without the in-reach one filed under an outward theme', [P.J(`suggestions(DATA.M,SCOPE).moves.map(x=>x.id).includes('personal-evangelism-baptism-anniversary')`),rowsAll(P).includes('personal-evangelism-baptism-anniversary'),rowsAll(P).includes('prayer-town-prayer-calendar')], [false,false,true]);
    c('…and the needs section is wired (one handler, kept across a redraw)', [P.qa('#u-needs').length,typeof P.q('#u-needs').onclick], [1,'function']);
    c('no errors', P.errs, []);
    P.w.close(); });
  await sec(async()=>{ const P=page(); await sleep(1300); setup(P,{tool:'survey'});
    c('a church with no library ideas: nothing extra is fetched', P.net.idx, 0);
    P.w.close(); });
  await sec(async()=>{ const P=page({lang:'es'}); await sleep(1300); setup(P,{tool:'survey'});
    c('Spanish: the needs\' heading', P.txt('#u-needs .ns-hero > h2'), 'Necesidades del vecindario');   // v10.50.0 — the pastor (6 Oct 2026)
    P.w.close(); });

  console.log('\n-- 2. Make the Case step 2: "From your plan", then "More ideas for {group}" --');
  await sec(async()=>{ const P=page(); await sleep(1300);
    await P.E(`libLoadIndex()`); await until(()=>P.J('!!LIB.idx'));
    setup(P,{pre:PLAN});
    await choose(P,'community');
    c('ONE short line under the title: this is where you win support', P.txt('#cs-s2 .cs-sh .note'), 'This is where you win support for what your church will do.');
    // v10.43 (the pastor, 30 Sep 2026: "separate the things that are weekly or monthly — ongoing ministry — and events, which are one-time, one day… after one day there needs to be some kind of follow-up"): how it runs (#cs-cad) sits above "From your plan"
    c('the parts in order: How it runs, From your plan, More ideas for the group (its search inside), the list', P.qa('#cs-s2 > *').map(e=>e.id||e.className.split(' ')[0]),
      ['cs-sh','cs-cad','cs-plan','cs-more']);
    c('…the search and the list sit in "More ideas"', [!!P.q('#cs-more .cs-find #cs-q'),!!P.q('#cs-more #cs-lib')], [true,true]);
    c('From your plan: its heading and one line naming the group', [P.txt('#cs-plan h4'),P.txt('#cs-plan .cs-parth .note')], ['From your plan','What your church chose that fits Community Services (Dorcas).']);
    c('…Community Services (Dorcas): the food pantry (the prayer calendar is not theirs)', planIds(P), ['food-pantry']);
    c('More ideas for Community Services (Dorcas), best fit first', [P.txt('#cs-more h4'),P.txt('#cs-more .cs-parth .note')], ['More ideas for Community Services (Dorcas)','Best fit for Warminster first.']);
    c('the plan\'s card is not repeated below, in either section', listIds(P).includes('food-pantry'), false);
    c('…the card is the list\'s card: kind, title, facts, one "Choose this", the same fold', (()=>{ const e=P.q('#cs-plan .lib-card');
      return [e.classList.contains('lib-card'),!!e.querySelector('.lib-kind'),!!e.querySelector('h4'),!!e.querySelector('.lib-facts'),[...e.querySelectorAll('.lib-acts button')].map(b=>b.textContent),!!e.querySelector('details.lib-more'),!!P.q('#cs-plan.lib-compact')]; })(),
      [true,true,true,true,['Choose this'],true,true]);
    await choose(P,'prayer');
    c('the prayer ministry: the prayer calendar (a library idea, added in the survey)', planIds(P), ['prayer-town-prayer-calendar']);
    c('…in its library card, not repeated below', [!!P.q('#cs-plan .lib-card:not(.lib-sig)'),listIds(P).includes('prayer-town-prayer-calendar')], [true,false]);
    for(const g of ['board','business','finance']){ await choose(P,g);
      c(`${g}: a deciding body sees the whole plan`, planIds(P), ['food-pantry','prayer-town-prayer-calendar']); }
    await choose(P,'congregation');
    c('the whole church: both (outreach ideas of every theme)', planIds(P), ['food-pantry','prayer-town-prayer-calendar']);
    P.E(`uChurch().selected=['food-pantry','prayer-town-prayer-calendar','clothing-closet','community-dinner','bp-clinic','walking-club','grief','lot-market']; uPersist();`);
    await choose(P,'business');
    c('a long plan: six cards, then "Show all 8" (the list\'s page size)', [planIds(P).length,P.txt('#cs-plan [data-cs-planall]')], [6,'Show all 8']);
    P.q('#cs-plan [data-cs-planall]').click(); await sleep(30);
    c('…one tap shows the whole plan, and none of it again below', [planIds(P).length,!!P.q('#cs-plan [data-cs-planall]'),listIds(P).filter(id=>planIds(P).includes(id))], [8,false,[]]);
    P.E(`uChurch().selected=['food-pantry','prayer-town-prayer-calendar']; uPersist();`);
    await choose(P,'hospitality');
    c('the greeters: nothing in the plan is theirs: one line, no cards', [planIds(P),P.txt('#cs-plan .cs-parth .note')],
      [[],'Nothing in your plan fits the greeters and hospitality team yet. Add to it in the Community Survey, or pick an idea below.']);
    c('…with a way back to the survey\'s ministries', P.txt('#cs-plan [data-cs-survey]'), 'Open the Community Survey');
    await choose(P,'prayer');
    P.q('#cs-plan [data-lib-case]').click(); await until(()=>!!P.q('#cs-s2 .cs-chosen'));
    c('"Choose this" on a plan card chooses it: the chosen card, step 3 next', [P.J('casePrefs().ministry'),P.q('#cs-s2 .cs-chosen .lib-card').dataset.libId,!!P.q('#cs-plan')], ['prayer-town-prayer-calendar','prayer-town-prayer-calendar',false]);
    c('…and it says whom it was chosen for, as before', P.txt('#cs-s2 .cs-sh .note'), 'Chosen for the prayer ministry.');
    c('no errors', P.errs, []);
    P.w.close(); });

  await sec(async()=>{ const P=page(); await sleep(1300);
    await P.E(`libLoadIndex()`); await until(()=>P.J('!!LIB.idx'));
    setup(P);
    await choose(P,'prayer');
    c('an empty plan: one line points back to the survey (the approved words), no cards', [planIds(P),P.txt('#cs-plan .cs-parth .note')],
      [[],'Open a need in the Community Survey and choose an idea, or pick an idea below.']);
    c('…"More ideas" still opens on the list', [P.txt('#cs-more h4'),listIds(P).length>0], ['More ideas for the prayer ministry',true]);
    // the idea already chosen (a library idea chosen from the Idea Library), when he taps another group
    await P.E(`libLoadTheme('member-care')`); await until(()=>P.J(`!!libFull('member-care-two-sabbath-card')`));
    P.E(`libCase('survey','member-care-two-sabbath-card')`); await sleep(60);
    await choose(P,'hospitality');
    c('the idea already chosen, when it fits the group, opens the list (with "Keep this one")', [planIds(P),!!P.q('#cs-s2 [data-cs-keep]'),listIds(P).includes('member-care-two-sabbath-card')], [['member-care-two-sabbath-card'],true,false]);
    await choose(P,'pathfinders');
    c('…and not where it does not fit (the Pathfinder Club)', planIds(P), []);
    P.q('#cs-plan [data-cs-survey]').click(); await sleep(60);
    c('"Open the Community Survey" opens the survey', P.J('TOOL'), 'survey');
    c('no errors', P.errs, []);
    P.w.close(); });

  console.log('\n-- 3. "More ideas for {group}": every group with its article, and the board opens on God\'s people --');
  await sec(async()=>{ const P=page(); await sleep(1300); setup(P);
    const ids=P.J('CASE_GROUPS.map(g=>g.id)'); const lines=[];
    for(const g of ids){ await choose(P,g); lines.push([g,P.txt('#cs-more h4'),P.txt('#cs-more .cs-parth .note'),P.txt('#cs-s2 .cs-sh .note')]); }
    c('all 34: "More ideas for {the …}", "Best fit for Warminster first.", and the one step line', [ids.length,lines.filter(([g,h,n,s])=>h!==`More ideas for ${EN_FOR[g]}`||n!=='Best fit for Warminster first.'||s!=='This is where you win support for what your church will do.')], [34,[]]);
    c('the board and the business meeting open "More ideas" on God\'s people (the community is the survey\'s: it arrives through the plan)', P.J(`['board','business'].map(id=>caseDefaultTab({id}))`), ['in','in']);
    await choose(P,'board');
    c('…on the screen too', P.qa('#cs-lib .lib-sec').filter(s=>!s.hidden).map(s=>s.dataset.libSec), ['in']);
    c('…the outreach teams and the conference keep the community first (their own focus)', P.J(`['community','evangelism','health','conference','personal'].map(id=>caseDefaultTab({id}))`), ['out','out','out','out','out']);
    P.w.close(); });
  await sec(async()=>{ const P=page({lang:'es'}); await sleep(1300);
    await P.E(`libLoadIndex()`); await until(()=>P.J('!!LIB.idx'));
    setup(P,{pre:PLAN});
    const ids=P.J('CASE_GROUPS.map(g=>g.id)'), FOR=P.J('CASE_GROUP_ES_FOR'); const lines=[];
    for(const g of ids){ await choose(P,g); lines.push([g,P.txt('#cs-more h4'),P.txt('#cs-more .cs-parth .note')]); }
    c('Spanish, all 34: "Más ideas para {el/la/los/las …}", "Primero, lo que mejor encaja en Warminster."', lines.filter(([g,h,n])=>h!==`Más ideas para ${FOR[g]}`||n!=='Primero, lo que mejor encaja en Warminster.'), []);
    await choose(P,'pathfinders');
    c('…the Pathfinder Club', P.txt('#cs-more h4'), 'Más ideas para el Club de Conquistadores');
    c('…the step line', P.txt('#cs-s2 .cs-sh .note'), 'Aquí es donde consigue apoyo para lo que su iglesia hará.');
    await choose(P,'community');
    c('…"De su plan" and its line, with the group\'s article', [P.txt('#cs-plan h4'),P.txt('#cs-plan .cs-parth .note'),planIds(P)],
      ['De su plan','Lo que su iglesia eligió y que encaja con los Servicios Comunitarios Adventistas (Dorcas).',['food-pantry']]);
    c('…"Elegir esta" on its card', [...P.q('#cs-plan .lib-card .lib-acts').querySelectorAll('button')].map(b=>b.textContent), ['Elegir esta']);
    await choose(P,'hospitality');
    c('…nothing for this group', P.txt('#cs-plan .cs-parth .note'), 'Nada de su plan encaja todavía con el equipo de recepción y hospitalidad. Añada ideas en la Encuesta Comunitaria, o escoja una idea abajo.');
    c('…the way back', P.txt('#cs-plan [data-cs-survey]'), 'Abrir la Encuesta Comunitaria');
    P.E(`uChurch().selected=[]; uPersist(); caseDraw2();`); await until(()=>/Elija primero/.test(P.txt('#cs-plan')||''));
    c('…an empty plan', P.txt('#cs-plan .cs-parth .note'), 'Abra una necesidad en la Encuesta Comunitaria y elija una idea, o escoja una idea abajo.');
    c('no English and no "IA" in step 2\'s new words', /\b(IA|AI)\b|From your plan|More ideas/.test(P.txt('#cs-s2')), false);
    c('no errors', P.errs, []);
    P.w.close(); });

  console.log('\n-- 4. the conference: his Evangelism Planner series is his plan --');
  await sec(async()=>{ const P=page(); await sleep(1300);
    const d=new Date(); d.setMonth(d.getMonth()+12); const iso=d.toISOString().slice(0,10);
    setup(P,{pre:`uChurch().plan={date:'${iso}',kind:'prophecy',nights:12};`});
    await choose(P,'conference');
    c('the series card opens "From your plan", and is not in the list below', [P.qa('#cs-plan .lib-card').map(e=>e.classList.contains('cs-plan')),!!P.q('#cs-lib .cs-plan')], [[true],false]);
    c('…its title', /^Your evangelism series: opening night /.test(P.txt('#cs-plan .cs-plan h4')), true);
    P.q('#cs-plan [data-cs-plan]').click(); await until(()=>!!P.q('#cs-s2 .cs-chosen'));
    c('…choosing it chooses his series', P.J('casePrefs().ministry'), P.J('CASE_PLAN_ID'));
    c('no errors', P.errs, []);
    P.w.close(); });
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); fail++; }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0); })();
