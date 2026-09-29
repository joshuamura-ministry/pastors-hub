/* v10.41.0 review pass — what the independent reviewers found in v10.41.0, fixed before delivery, and held here.
 *
 * The pastor (29 Sep 2026): "When I choose, say, Prayer Ministry or another ministry, the answer should be tailored to
 * that ministry's focus … the greeters have their own ideas. Greeters can keep names and information so that when
 * people are missing … they send a card or call … The page is hard to take in: a lot of words, almost overwhelming."
 * And the house rules: screened adults and two adults for anything with minors; counts only on anything shared;
 * nothing keeps score of the members who were away.
 *
 *  1. (the blocker) child safeguarding stays on the slide of every deck whose idea involves children, in-reach too;
 *  2. step 2 is tailored where he looks first: the greeters' card after two missed Sabbaths on page 1, the whole
 *     church's community list free of the church's own themes, the board's "for God's people" led by the inside
 *     themes, and no card on page 1 of both sections;
 *  3. step 2 is lighter: a two-part switch (one section at a time), one "Choose this" per card, the rest folded;
 *  4. in-reach decks speak of the church family: no "every session of", no seats or evening for a card, no host, a
 *     neutral start, success in totals, attendance called attendance, a verse that does not rebuke the absent;
 *  5. the business meeting is a church vote; the conference asks only for counsel unless there is a cost to share,
 *     reports "after the trial" for anything but his series, and dates Pennsylvania's report form at the close;
 *  6. Spanish: "evangelismo" in the conference flow, "una tarjeta…" mid-sentence, the background notice;
 *  7. the ask never disappears (a street or online idea left the board's and the deacons' ask empty: found in review);
 *  8. data: two built-ins filed under their own outward themes; the Thirteenth Sabbath jar explained correctly.
 */
const fs=require('fs'), path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
const IDX=JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','index.json'),'utf8'));
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
      w.localStorage.setItem('terrain-reg',JSON.stringify(o.reg||REG));
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
const page1=(P,sec)=>P.qa(`#cs-lib .lib-sec[data-lib-sec="${sec}"] .lib-card`).map(e=>e.dataset.libId);
const col=k=>IDX.cols.indexOf(k);
const themeOf=id=>{ const r=IDX.ideas.find(x=>x[0]===id); return r?IDX.themes[r[col('t')]].id:null; };
/* A deck built straight from the model (no screen), for a library idea already saved with the church. */
const deckOf=(P,id,group,type,lang)=>P.J(`(()=>{ const m=caseModel(${JSON.stringify(id)},{type:${JSON.stringify(type)},group:${JSON.stringify(group)}},{lang:${JSON.stringify(lang||'en')}});
  if(!m||!m.ok) return {ok:false}; const d=caseDeck(m); return {ok:true,m:{inreach:m.inreach,kinds:m.risks.kinds,win:m.timeline.win,ask:m.motion.ask,rows:m.motion.rows,steps:m.timeline.steps,roles:m.roles.map(r=>r.key),kind:m.kind.name,to:m.motion.to,conf:m.conf,family:m.family},d}; })()`);

(async()=>{
  const P=page(); await sleep(1300);
  c('no boot errors', P.errs, []);
  setup(P);
  P.E(`caseChooseGroup('childrens')`); await until(()=>listed(P));
  const CAS=P.J(`CASE_RISKS.children.find(r=>r.id==='c-asv')`), CTWO=P.J(`CASE_RISKS.children.find(r=>r.id==='c-two')`);

  console.log('\n-- 1. child safeguarding on the slide (the blocker) --');
  { // every in-reach idea with minors in the library, as a team deck for the children's ministries, in English
    const kids=IDX.ideas.filter(r=>r[col('reach')]==='in'&&r[col('min')]===1).map(r=>r[0]);
    const themes=[...new Set(kids.map(themeOf))];
    for(const t of themes) await P.E(`libLoadTheme(${JSON.stringify(t)})`);
    P.E(`${JSON.stringify(kids)}.forEach(id=>{ const raw=libFull(id); if(raw) libSave(raw); })`);
    const miss=[];
    for(const id of kids){ const r=deckOf(P,id,'childrens','team','en'); if(!r.ok){ miss.push([id,'no deck']); continue; }
      const items=r.d.slides.filter(s=>s.type==='risks').flatMap(s=>s.items);
      if(!items.includes(CAS.en)||!items.includes(CTWO.en)) miss.push([id,items]); }
    c(`all ${kids.length} in-reach ideas with minors: the children's team deck shows screening (ASV) and two adults`, [kids.length>100,miss.slice(0,3)], [true,[]]);
    // the reviewers' four, for their own groups, in English and in Spanish, and as a board's decision
    const four=[['pathfinders','pathfinders-honor-instructors-pews'],['childrens','childrens-ministries-matching-check-in-tags'],['adventurers','adventurers-two-adult-check-in-table'],['youth','ay-youth-quarterly-youth-sabbath'],['worship','childrens-ministries-matching-check-in-tags']];
    const bad=[];
    for(const lang of ['en','es']) for(const [g,id] of four){ const r=deckOf(P,id,g,'team',lang); const items=r.d.slides.filter(s=>s.type==='risks').flatMap(s=>s.items);
      if(!items.includes(CAS[lang])||!items.includes(CTWO[lang])) bad.push([lang,g,id]); }
    c('…the reviewers\' decks (Pathfinders, children, Adventurers, AY, worship), EN and ES', bad, []);
    const brd=['en','es'].map(l=>{ const r=deckOf(P,'childrens-ministries-matching-check-in-tags','board','board',l); const it=r.d.slides.find(s=>s.type==='risks').items; return it.includes(CAS[l])&&it.includes(CTWO[l]); });
    c('…and a board\'s decision (the risks slide), EN and ES', brd, [true,true]);
    // outreach decks for the same groups keep them, as in v10.40
    const out=[['pathfinders','youth-anonymous-questions-videos'],['childrens','children-library-brick-club']];
    for(const [,id] of out){ const t=themeOf(id); await P.E(`libLoadTheme(${JSON.stringify(t)})`); P.E(`libSave(libFull(${JSON.stringify(id)}))`); }
    c('…outreach decks for children and youth keep them too', out.map(([g,id])=>{ const it=deckOf(P,id,g,'team','en').d.slides.filter(s=>s.type==='risks').flatMap(s=>s.items); return it.includes(CAS.en)&&it.includes(CTWO.en); }), [true,true]);
    const pri=deckOf(P,'childrens-ministries-matching-check-in-tags','childrens','team','en');
    c('…with children first in the risk kinds; a care-list row only if room remains', [pri.m.kinds[0],pri.m.inreach], ['children',true]);
  }

  console.log('\n-- 2. step 2, tailored where he looks first --');
  { P.E(`caseChooseGroup('hospitality')`); await until(()=>listed(P));
    // v10.41 final review. The pastor: "send a card if they're missing, or if they don't come one Sabbath… call and say we
    // missed you". On the first page was not enough: a Sunday picnic for neighbours (reach "both") opened the page and the
    // card came third. Now it opens the page, the greeters' door notebook next.
    c('Greeters: "a handwritten card when a member misses two Sabbaths" opens God\'s people, the door notebook next', page1(P,'in').slice(0,2), ['member-care-two-sabbath-card','member-care-greeters-door-notebook']);
    P.E(`caseChooseGroup('congregation')`); await until(()=>listed(P));
    const insideT=P.J(`LIB.idx.themes.filter(t=>libThemeReach(t)==='in').map(t=>t.id)`);
    const themeOfCard=id=>P.J(`(()=>{ const r=LIB.byId.get(${JSON.stringify(id)}); if(r) return r.theme; const x=SIGNATURE.find(s=>s.id===${JSON.stringify(id)}); return x?libBuiltinThemes(x)[0]:null; })()`);
    c('The whole church: the community\'s first page has no idea from an inside-the-church theme', page1(P,'out').filter(id=>insideT.includes(themeOfCard(id))), []);
    for(const g of ['board','business']){
      P.E(`caseChooseGroup(${JSON.stringify(g)})`); await until(()=>listed(P));
      const ins=page1(P,'in');
      c(`${g}: God's people led by the inside-the-church themes, ideas for God's people first (church fit, not the census)`,
        [ins.length,ins.filter(id=>!insideT.includes(themeOfCard(id))),ins.filter(id=>P.J(`libReach(LIB.byId.get(${JSON.stringify(id)}))`)!=='in')], [6,[],[]]);
      c(`${g}: …from more than one of them`, new Set(ins.map(themeOfCard)).size>=4, true);
    }
    P.E(`caseChooseGroup('deacons')`); await until(()=>listed(P));
    c('Deacons: their own work (the deacons\' theme) on the first page of God\'s people', page1(P,'in').filter(id=>themeOfCard(id)==='deacons').length>=2, true);
    const both=[];
    for(const g of P.J('CASE_GROUPS.map(g=>g.id)')){ P.E(`caseChooseGroup(${JSON.stringify(g)})`); await until(()=>listed(P));
      const a=page1(P,'in'), b=page1(P,'out'); a.filter(id=>b.includes(id)).forEach(id=>both.push([g,id])); }
    c('no group shows the same card on the first page of both sections (all 34)', both, []);
  }

  console.log('\n-- 3. step 2, lighter --');
  { P.E(`caseChooseGroup('hospitality')`); await until(()=>listed(P));
    const tabs=()=>P.qa('#cs-lib [data-lib-tab]').map(b=>[b.dataset.libTab,b.getAttribute('aria-selected')]);
    const shown=()=>P.qa('#cs-lib .lib-sec').filter(s=>!s.hidden).map(s=>s.dataset.libSec);
    c('a two-part switch at the top: For God\'s people · For our community, with their counts', [tabs(),/^For God’s people \d+$/.test(P.txt('#cs-lib [data-lib-tab="in"]')),/^For our community \d+$/.test(P.txt('#cs-lib [data-lib-tab="out"]'))], [[['in','true'],['out','false']],true,true]);
    c('…one section shown at a time (both drawn)', [shown(),P.qa('#cs-lib .lib-sec').length], [['in'],2]);
    P.q('#cs-lib [data-lib-tab="out"]').click();
    c('…a tap switches, nothing re-ranked', [tabs(),shown()], [[['in','false'],['out','true']],['out']]);
    P.E(`caseChooseGroup('board')`); await until(()=>listed(P));
    c('…the board opens on the community (what the town needs most); a care team on God\'s people', [shown(),P.J(`['prayer','deacons','hospitality','childrens'].map(caseDefaultTab)`)], [['out'],['in','in','in','in']]);
    const card=P.q('#cs-lib .lib-sec:not([hidden]) .lib-card');
    c('a card: one button, "Choose this"', [...card.querySelectorAll('.lib-acts button')].map(b=>b.textContent), ['Choose this']);
    c('…"Why here", the fit and the steps folded under one small line', [card.querySelector('details.lib-more summary').textContent,card.querySelector('details.lib-more').open,!!card.querySelector('.lib-more .lib-why'),!!card.querySelector('.lib-more ol')], ['More about this idea',false,true,true]);
    c('…nothing of it left outside the fold', [...card.children].filter(e=>e.matches('.lib-why,.lib-fit,.lib-pt,details:not(.lib-more)')).length, 0);
    c('…the chosen card has no "Add to our plan" in Make the Case', P.qa('#cs-lib [data-lib-add],#cs-lib [data-lib-addx]').length, 0);
  }

  console.log('\n-- 4. in-reach decks speak of the church family --');
  { const G=P.J('CASE_GROUPS.filter(g=>g.type!=="conference").map(g=>[g.id,g.type])');
    await P.E(`libLoadTheme('member-care')`); P.E(`libSave(libFull('member-care-two-sabbath-card'))`);
    c('the card after two missed Sabbaths: nobody seated, no room booked (an in-reach idea with no class, meal or group in its name)',
      P.J(`(()=>{ const x=libToCatalog(libFull('member-care-two-sabbath-card')); return [x.seats,x.requirements.facilities]; })()`), [false,[]]);
    c('…an in-reach idea that seats people keeps its places', P.J(`(()=>{ const r=LIB.rows.find(r=>libReach(r)==='in'&&!r.fac&&r.where==='church'&&LIB_SEAT_WORDS.test(r.n)); return libLite(r).seats; })()`), true);
    const bad={session:[],rows:[],host:[],start:[],score:[],ask:[]};
    for(const lang of ['en','es']) for(const [g,type] of G){
      const r=deckOf(P,'member-care-two-sabbath-card',g,type,lang), txt=JSON.stringify(r.d);
      if(/every session of|at every session|each session|first session|en cada sesión|primera sesión/i.test(txt+JSON.stringify(r.m.ask))) bad.session.push([lang,g]);
      if(r.m.rows.some(x=>/^(Places|When|Plazas|Cuándo|Lugares)$/.test(x[0]))) bad.rows.push([lang,g,r.m.rows.map(x=>x[0])]);
      if(r.m.roles.includes('host')) bad.host.push([lang,g]);
      if(r.m.steps[0].title!==(lang==='es'?'Inicio':'Start')||/members on their list|miembros de su lista/.test(r.m.steps[0].text)) bad.start.push([lang,g,r.m.steps[0]]);
      if(/came back|coming back|come back|who came|who took part|who was reached|regresa|quiénes/i.test(r.m.win||'')) bad.score.push([lang,g,r.m.win]);
      if(!r.m.ask) bad.ask.push([lang,g]);
    }
    c('no in-reach ask or slide says "every session of" (34 groups less the conference, EN and ES)', bad.session, []);
    c('…no "Places" or "When" row on the motion for an idea nobody sits at', bad.rows, []);
    c('…no host to sit with anyone who arrives alone', bad.host, []);
    c('…the first step is "Start", in words that fit any in-reach idea', bad.start, []);
    c('…success in totals: never who came back or who took part', bad.score, []);
    c('…and every group has an ask', bad.ask, []);
    const gr=deckOf(P,'member-care-two-sabbath-card','hospitality','team','en');
    c('Greeters\' own in-reach words: a private list with consent, a word within the week', /private and only with their consent/.test(gr.m.ask), true);
    const fam=deckOf(P,'member-care-two-sabbath-card','deacons','board','en').d.slides.find(s=>s.type==='place'&&s.kicker==='Our church family');
    c('"Our church family": attendance is called attendance, not membership', [/in worship on an average Sabbath$/.test(fam.headline),fam.facts[0].label], [true,'In worship on an average Sabbath']);
    const vs=['deacons','board','congregation'].map(g=>{ const t=g==='congregation'?'congregation':'board'; const d=deckOf(P,'member-care-two-sabbath-card',g,t,'en').d; const m=d.slides.find(s=>s.type==='motion'); return m&&m.verse?m.verse.ref:null; });
    c('the motion slide does not open with Hebrews 10:24–25 ("as the manner of some is")', vs.filter(r=>/Hebrews 10/.test(r||'')), []);
    c('Greeters\' in-reach deck: no "entertain strangers" (Hebrews 13:2)', JSON.stringify(gr.d).includes('Hebrews 13:2'), false);
  }

  console.log('\n-- 5. the business meeting and the conference --');
  { const b=deckOf(P,'member-care-two-sabbath-card','business','board','en');
    c('the business meeting is a church vote, reviewed at a business meeting', [b.m.kind.en||b.m.kind,b.m.rows.find(r=>r[0]==='Review')[1].endsWith('· business meeting'),b.m.steps[2].title], ['Church vote',true,'Business meeting review']);
    const bs=deckOf(P,'member-care-two-sabbath-card','business','board','es');
    c('…in Spanish too', [bs.m.kind.es,bs.m.steps[2].title], ['Votación de la iglesia','Revisión en la reunión administrativa']);
    c('…and its handout is headed as the church\'s vote, not a board decision', P.J(`(()=>{ const m=caseModel('member-care-two-sabbath-card',{type:'board',group:'business'},{lang:'en'}); return caseHandout(m,caseDeck(m),{}).kicker; })()`), 'Church vote · To: Business meeting');
    await P.E(`libLoadTheme('interests')`); P.E(`libSave(libFull('interests-vegetarian-kitchen-afternoon'))`); P.E(`uChurch().confAsk=null; uPersist();`);
    const k=deckOf(P,'interests-vegetarian-kitchen-afternoon','conference','conference','en');
    c('conference, a library idea (not his series): counsel only by default', k.m.conf.ask.keys, ['counsel']);
    c('…reported "after the trial", with no Evangelistic Report Form', [k.m.rows.find(r=>r[0]==='Report')[1],k.m.conf.report.some(q=>/Evangelistic Report Form|after the meetings/.test(q.text))], ['In writing, after the trial',false]);
    P.E(`uChurch().plan={church:'Bucks County SDA',date:'2027-09-11',nights:18,kind:'both',perweek:4,workers:30,budget:12000,v:3}; uPersist();`);
    const s=deckOf(P,'plan-series','conference','conference','en');
    c('his Planner series with a budget: a share of the cost and counsel, nothing else ticked for him', s.m.conf.ask.keys, ['cost','counsel']);
    c('Pennsylvania: the report form dated as the meetings close (the third step)', [s.m.conf.timeline.steps[2].title,s.m.conf.timeline.steps[2].date===P.J(`caseDate(caseConfBuild(caseCtx(),{x:casePlanItem(),V:{ministry:''},money:fmtMoney,now:Date.now()}).plan.close,true)`)], ['Report form to the conference',true]);
    const e=deckOf(P,'plan-series','conference','conference','es');
    c('Spanish: "evangelismo" throughout the conference proposal and its handout', [JSON.stringify(e.d).includes('evangelizaci'),P.J(`JSON.stringify(caseHandout(caseModel('plan-series',{type:'conference',group:'conference'},{lang:'es'}),null,{}))`).includes('evangelizaci'),e.d.title||''], [false,false,e.d.title||'']);
    const dist=P.J(`(()=>{ const m=caseModel('plan-series',{type:'conference',group:'conference'},{ctx:{...caseCtx(),district:CASE_CONF.sampleDistrict.map(c=>({name:c.name,members:c.members}))}}); return m.conf.district.items.map(i=>i.label); })()`);
    c('the churches slide says average Sabbath attendance, not members', dist.every(l=>/average Sabbath attendance$/.test(l)), true);
  }

  console.log('\n-- 6. Spanish --');
  { const d=deckOf(P,'member-care-two-sabbath-card','board','board','es');
    c('"una tarjeta a mano…" mid-sentence (the article in small letters, as the English "a")', [/: una tarjeta a mano/.test(d.m.ask||''),/: Una tarjeta/.test(JSON.stringify(d.d))], [true,false]); }

  console.log('\n-- 7. the ask never disappears --');
  { for(const id of ['prayer-tear-off-flyers','hunger-bulk-buying-club']){ const t=themeOf(id); await P.E(`libLoadTheme(${JSON.stringify(t)})`); P.E(`libSave(libFull(${JSON.stringify(id)}))`); }
    const asks=[['board','board','prayer-tear-off-flyers'],['deacons','board','prayer-tear-off-flyers'],['board','board','hunger-bulk-buying-club']].map(([g,t,id])=>deckOf(P,id,g,t,'en').m.ask);
    c('a street idea and a room-less idea: the board\'s and the deacons\' ask is still there', asks.map(a=>typeof a==='string'&&a.length>60), [true,true,true]); }

  console.log('\n-- 8. the data --');
  { // the theme a card wears is its first: an "out" built-in never wears an inside-the-church theme in the community list
    c('the meal train and the bereavement rota ("out") no longer wear "Caring for our members"; no "out" built-in wears an inside theme',
      [P.J(`['meal-train','bereavement-visits'].map(id=>libBuiltinThemes(SIGNATURE.find(x=>x.id===id)).includes('member-care'))`),P.J(`SIGNATURE.filter(x=>libReach(x)==='out'&&libThemeReachOf(libBuiltinThemes(x)[0]||'')==='in').map(x=>x.id)`)], [[false,false],[]]);
    const j=IDX.ideas.find(r=>r[0]==='global-mission-family-thirteenth-sabbath-jar');
    const raw=JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','global-mission.json'),'utf8'));
    const x=(raw.ideas||raw).find(z=>z.id==='global-mission-family-thirteenth-sabbath-jar');
    c('the Thirteenth Sabbath jar: a quarter of the offering to the quarter\'s projects, no "overflow"', [j[col('n')],/sends a quarter of its gifts/.test(x.en.d),/overflow|superávit/.test(JSON.stringify(x))], ['A family jar for the Thirteenth Sabbath Offering',true,false]); }

  console.log('\n-- Spanish step 2: built-ins without Spanish words after the library\'s cards --');
  { const S=page({lang:'es'}); await sleep(1300); setup(S);
    for(const g of ['conference','hospitality']){ S.E(`caseChooseGroup(${JSON.stringify(g)})`); await until(()=>listed(S));
      c(`${g}: every card on the first pages has its description`, S.qa('#cs-lib .lib-sec .lib-card').slice(0,24).filter(e=>!e.classList.contains('cs-plan')&&!(e.querySelector('.lib-d')&&e.querySelector('.lib-d').textContent.trim())).map(e=>e.dataset.libId), []); }
    c('no errors (Spanish)', S.errs, []); }

  c('no page errors', P.errs, []);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{ console.log('CRASH',e&&e.stack); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); });
