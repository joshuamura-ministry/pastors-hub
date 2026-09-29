// v10.40.0 review pass (29 Sep 2026): what three independent reviewers found in the Idea Library
// and in the decks made from its ideas, pinned so it cannot come back. The pastor: "with the kids we
// have to be careful not to be asking for praying for kids, it sounds weird", "I put Prayer and only
// three came up", "feeding the homeless, so many amazing, unique and new ideas", and Scripture that
// persuades for THIS ministry.
//  1. A library idea's deck: its theme's verse first (only verified verses), never "Suffer the little
//     children" or "There is a lad here" for an idea that is not about children, never children as
//     the lead need unless the idea says so, and no figure borrowed from the group or the children's
//     share when the idea has none of its own.
//  2. Search: every synonym, typed as a query, opens its own theme and only it; possessives and filler
//     fold the same way in the query and in the synonym ("children's ministry", "dar de comer").
//  3. A theme query finds built-ins by their names only; a line under the box says how many library
//     ideas are below; the counts beside the box are the matches; the built-in prayer box goes where
//     people wait, not on the church fence.
//  4. "Why here" for a generic idea never gives a race or foreign-born shift as its reason.
//  5. "Feeding the homeless": ideas that are about both come first; the library now has them.
//  6. The library's budget lines in Spanish on the handout; no made-up "Places 8" for an idea nobody
//     is seated at; the handout's file name tells the board's from the congregation's.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
const IDX=JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','index.json'),'utf8'));
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,700));console.log('    want:',JSON.stringify(e).slice(0,300));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor'};

function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const net=[]; let scrolled=0;
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.Element.prototype.scrollIntoView=function(){ scrolled++; };
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      w.fetch=async(u)=>{ u=String(u); net.push(u);
        const m=/^\/ideas\/([a-z-]+)\.json$/.exec(u);
        if(m){ const t=fs.readFileSync(path.join(ROOT,'ideas',m[1]+'.json'),'utf8'); return {ok:true,status:200,json:async()=>JSON.parse(t)}; }
        if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false})};
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,net,scrolled:()=>scrolled,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
function setup(P,tool){
  P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null;
    capSave(${JSON.stringify(FX.MEDIUM)}); uPersist(); openTool('${tool||'survey'}'); render(); ${tool==='case'?'caseMount(true);':''} })()`);
}
const type=(P,sel,v)=>{ const e=P.q(sel); e.value=v; e.dispatchEvent(new P.w.Event('input',{bubbles:true})); };
const TI=Object.fromEntries(IDX.themes.map((t,i)=>[t.id,i])), col=k=>IDX.cols.indexOf(k);
const inQuery=ids=>{ const T=new Set(ids.map(i=>TI[i])); return IDX.ideas.filter(r=>T.has(r[col('t')])||r[col('also')].some(a=>T.has(a))).length; };

(async()=>{ try{
  const P=page(); await sleep(1300); setup(P,'survey');
  await P.E('libLoadIndex()'); await P.E('libLoadWords()');
  c('no boot errors', P.errs, []);

  console.log('-- 1. a library idea\'s deck: its theme\'s Scripture, never children unless it is about children --');
  const THEMES=['prayer','sabbath-rest','small-groups','literature','personal-evangelism'];
  await P.E(`Promise.all(${JSON.stringify([...THEMES,'hunger','children'])}.map(libLoadTheme))`);
  const R=P.J(`(()=>{ const out=[]; const ch=uChurch(), keep=ch.lib;
    for(const r of LIB.rows.filter(r=>${JSON.stringify(THEMES)}.includes(r.theme))){ const raw=libFull(r.id); ch.lib={[raw.id]:raw}; const x=libToCatalog(raw); CASE_ST.rank=null;
      const row={id:x.id,theme:x.theme,childOk:caseChildOk(x),ages:x.ages,sp:(x.need||[]).includes('single-parents')};
      for(const g of [['congregation','congregation'],['board','board'],['team','prayer']]){ const m=caseModel(x.id,{type:g[0],group:g[1]}); const d=caseDeck(m);
        row[g[0]]={lead:m.need.lead,hero:m.need.hero&&m.need.hero.key,verses:d.slides.map(s=>s.type==='verse'?s.ref:(s.verse&&s.verse.ref)).filter(Boolean).map(v=>v.replace(/ · .*/,'')),
          first:(d.slides.find(s=>s.type==='verse')||{}).ref||null,kidsDots:d.slides.some(s=>s.type==='stat'&&/in every 100 are children/.test(s.count||'')),n:d.slides.length,bring:((d.slides.find(s=>s.type==='place')||{}).bring||[]),keys:m.sources.map(z=>z.key)}; }
      out.push(row); }
    ch.lib=keep; return out; })()`);
  const free=R.filter(r=>!r.childOk);
  c(`${R.length} ideas (prayer, rest, small groups, literature, personal evangelism), three decks each, ${free.length} of them not about children`, R.length>250&&free.length>200, true);
  c('…none of those leads with children or carries Mark 10:14 or John 6:9', free.filter(r=>['congregation','board','team'].some(g=>r[g].lead==='kids'||r[g].verses.some(v=>/^(Mark 10:14|John 6:9|Proverbs 22:6)$/.test(v)))).map(r=>r.id), []);
  c('…nor shows the neighbours\' children dots', free.filter(r=>r.congregation.kidsDots).map(r=>r.id), []);
  // final critic (29 Sep 2026): two prayer ideas for everyone (a street prayer walk, a quiet tent at the fair) carried the
  // need tag "families", so caseChildOk counted them as about children and their board decks read "About 1 in 4 people
  // around us is a child" beside Mark 10:14. "families" moved to boost (ranking only) in the source.
  c('…and no prayer idea for everyone or for adults counts as about children', R.filter(r=>r.theme==='prayer'&&!['children','youth','families'].includes(r.ages)&&r.childOk).map(r=>r.id), []);
  c('…and none borrows a children\'s or poverty figure it does not carry (no hero kidsShare or childPoverty)', free.filter(r=>['congregation','board','team'].some(g=>['kidsShare','childPoverty'].includes(r[g].hero))).map(r=>r.id), []);
  c('…nor lists a children\'s figure among its reasons, on the slides or the handout (children\'s share, child poverty, school-age share, single parents)', free.filter(r=>['congregation','board','team'].some(g=>r[g].keys.some(k=>['kidsShare','childPoverty','k12Share'].includes(k)||(k==='singleParent'&&!r.sp)))).map(r=>r.id), []);
  // v10.41 final review: caseChildOk no longer counts a census tag (a "families" tag gave a Sunday picnic "About 1 in 4 people
  // around us is a child" beside Mark 10:14, "weird", the pastor said), so more ideas are checked here; single parents stay a
  // figure an idea may carry when it is tagged for single parents itself (a caregivers' retreat day), as caseBuild has always allowed
  c('the place slide never says "1 members"', R.flatMap(r=>['congregation','board','team'].flatMap(g=>r[g].bring)).filter(t=>/^1 members/.test(t)), []);
  const firstBy=t=>[...new Set(R.filter(r=>r.theme===t).map(r=>r.congregation.first))];
  c('the congregation\'s verse slide speaks to the theme: prayer Jeremiah 29:7, rest Matthew 9:36, small groups Romans 16:5, literature Habakkuk 2:2, personal evangelism Isaiah 6:8',
    THEMES.map(firstBy), [['Jeremiah 29:7'],['Matthew 9:36'],['Romans 16:5'],['Habakkuk 2:2'],['Isaiah 6:8']]);
  c('Isaiah 58:7 ("deal thy bread to the hungry") never on these themes\' decks', R.filter(r=>['congregation','board','team'].some(g=>r[g].verses.includes('Isaiah 58:7'))).map(r=>r.id), []);
  c('never the same verse twice in a deck', R.filter(r=>['congregation','board','team'].some(g=>new Set(r[g].verses).size!==r[g].verses.length)).map(r=>r.id), []);
  { const s=R.find(r=>r.id==='prayer-pray-with-stranger-training');
    c('"Teach members to pray with a stranger": Jeremiah 29:7 on the verse slide, no children, no borrowed need slide', [s.congregation.first,s.congregation.lead!=='kids',s.board.hero,s.congregation.kidsDots], ['Jeremiah 29:7',true,null,false]); }
  c('every theme verse is one of the verified CASE_VERSES, and every other theme falls back to Micah 6:8 / Matthew 25:40',
    P.J(`(()=>{ const V=new Set(CASE_VERSES.map(v=>v.id)); return [Object.values(CASE_LIB_THEME_VERSE).flat().filter(id=>!V.has(id)),CASE_LIB_THEME_VERSE._]; })()`), [[],['mic6_8','matt25_40']]);
  { const r=P.J(`(()=>{ const out={}; const ch=uChurch(), keep=ch.lib;
      for(const id of ['hunger-fourth-week-pantry']){ const raw=libFull(id); ch.lib={[id]:raw}; CASE_ST.rank=null; const m=caseModel(id,{type:'board',group:'board'}); const d=caseDeck(m); out[id]={hero:m.need.hero&&m.need.hero.key,lead:m.need.lead,first:d.slides.find(s=>s.type==='stat').verse.ref}; }
      const kid=LIB.rows.find(r=>r.theme==='children'); const raw=libFull(kid.id); ch.lib={[kid.id]:raw}; CASE_ST.rank=null; const m=caseModel(kid.id,{type:'congregation',group:'congregation'}); const d=caseDeck(m);
      out.kid={id:kid.id,lead:m.need.lead,first:(d.slides.find(s=>s.type==='verse')||{}).ref,dots:d.slides.some(s=>s.type==='stat'&&/in every 100 are children/.test(s.count||''))};
      ch.lib=keep; return out; })()`);
    c('an idea with its own figures still leads with them (the fourth-week pantry: SNAP)', [r['hunger-fourth-week-pantry'].hero,r['hunger-fourth-week-pantry'].lead], ['snap','snap']);
    c('a children\'s idea keeps "Suffer the little children" and the children dots', [r.kid.lead,r.kid.first,r.kid.dots], ['kids','Mark 10:14',true]); }
  { const r=P.J(`(()=>{ const d={id:'draft-x1',generated:true,n:'A made-up idea',d:'Something to try.',metric:'',need:[],k:KIND.serve,ppl:2,cost:1,skill:[],load:1,why:'',requirements:null};
      const ctx=caseCtx(); const item=ctx.item; ctx.item=id=>id==='draft-x1'?d:item(id); ctx.req=x=>x===d?{...caseReqPlain(SIGNATURE[0])}:uReq(x);
      const m=caseModel('draft-x1',{type:'congregation',group:'congregation'},{ctx}); return {ok:m.ok,hero:m.need.hero,lead:m.need.lead}; })()`);
    c('an AI draft with no figure of its own borrows none either (no children\'s share)', [r.ok,r.hero,r.lead], [true,null,null]); }

  console.log('\n-- 2. every synonym, typed, opens its own theme and only it --');
  { const bad=P.J(`(()=>{ const bad=[]; for(const t of LIB.idx.themes){ const s=t.syn||{}; for(const w of [t.id.replace(/-/g,' '),t.en,t.es,...(s.en||[]),...(s.es||[])]){ LIB.qmemo.clear(); const S=libSearch(w);
        if(!S.themes.includes(t.id)||(S.mode==='theme'&&S.themes.length>1)) bad.push(t.id+' "'+w+'" → '+S.mode+' '+S.themes.join('+')); } } return bad; })()`);
    const n=IDX.themes.reduce((a,t)=>a+3+(t.syn.en||[]).length+(t.syn.es||[]).length,0);
    c(`all ${n} names and synonyms, EN and ES (139 did not before)`, bad, []); }
  const S=q=>P.J(`(()=>{ LIB.qmemo.clear(); const s=libSearch(${JSON.stringify(q)}); return {mode:s.mode,themes:s.themes,n:s.rows.length}; })()`);
  for(const [q,t] of [["children's ministry",'children'],["women's ministry",'women'],["men's ministry",'men'],['Daniel and Revelation','public-evangelism'],['Signs of the Times','literature'],
    ['dar de comer','hunger'],['cuidado de la creación','creation-care'],['ministerio carcelario','prison'],['situación de calle','homeless'],['street outreach','homeless'],['visitation','seniors'],['visitas a enfermos','seniors']])
    c(`"${q}" → the whole ${t} theme (${inQuery([t])} ideas)`, S(q), {mode:'theme',themes:[t],n:inQuery([t])});
  c('"street" alone is still the neighbors\' own word', S('street').themes, ['neighbors']);
  c('"dar de comer a los sin hogar" → hunger and homeless, as "feeding the homeless" does', [S('dar de comer a los sin hogar').themes.sort(),S('feeding the homeless').themes.sort()], [['homeless','hunger'],['homeless','hunger']]);
  c('possessives fold away ("parents\'", "children\'s")', [P.E(`libFold("Children’s parents' night")`)], ['children parents night']);

  console.log('\n-- 3. a theme query: built-ins by their names, the line under the box, the counts --');
  type(P,'#u-search','prayer'); await until(()=>P.q('#u-lib .lib-card'),8000); await sleep(100);
  const names=P.qa('#u-cards .u-row, #u-cards .u-card').map(e=>e.textContent);
  c('the survey: "prayer" no longer brings the backpack giveaway (its description mentions a prayer)', names.some(t=>/backpack/i.test(t)), false);
  const SY=P.J(`libSearch('prayer').syns.filter(s=>s.length>=6||s.includes(' '))`);
  const byName=t=>{ const f=' '+P.E(`libFold(${JSON.stringify(t)})`)+' '; return /pray/i.test(t)||SY.some(s=>f.includes(' '+s+' ')); };
  const firstLine=t=>t.split(/\n/).map(x=>x.trim()).filter(Boolean)[0]||'';
  c('…every built-in it shows is named for prayer (the word, or one of the theme\'s own words such as "blessing")', names.length>0&&names.every(t=>byName(firstLine(t))), true);
  c('a line right under the search box: how many library ideas, as a link down to them', P.txt('#u-libjump .lib-jump'), `${inQuery(['prayer'])} ideas in the Idea Library for “prayer” ↓`);
  { const before=P.scrolled(); P.q('#u-libjump .lib-jump').click(); c('…which takes him to them', P.scrolled()>before, true); }
  type(P,'#u-search',''); await sleep(300);
  c('…and goes when the box is cleared', P.q('#u-libjump').children.length, 0);
  setup(P,'case'); await sleep(100);
  type(P,'#cs-q','prayer'); await until(()=>P.q('#cs-lib .lib-card'),8000); await sleep(100);
  // Updated v10.41 (the pastor: "Why do I type Prayer under 'What are you proposing?' and get four things, then 84
  // things underneath? Out of order."): Make the Case shows ONE list, the built-ins that match are cards in it
  // (libBuiltinsFor), so the separate built-in grid, its counts beside the box and the jump line are gone.
  const cs=P.J(`libBuiltinsFor(libSearch('prayer'),null).map(x=>x.n)`);
  c('Make the Case: the built-ins for "prayer" are those named for prayer, never the backpack giveaway', [cs.length>0,cs.some(n=>/backpack/i.test(n)),cs.every(byName)], [true,false,true]);
  c('…shown as cards in the one list, beside the library\'s ideas', P.qa('#cs-lib .lib-sig').map(e=>e.querySelector('h4').textContent).every(byName)&&P.qa('#cs-lib .lib-sig').length>0, true);
  c('…and no second list, no counts beside the box, no jump line', [!!P.q('#cs-grid'),!!P.q('[data-cs-filter]'),!!P.q('#cs-libjump')], [false,false,false]);
  type(P,'#cs-q','backpack'); await until(()=>P.q('#cs-lib .lib-sig'),6000);
  c('a word that is not a theme still finds a built-in by its description', P.qa('#cs-lib .lib-sig').length>0, true);
  c('the built-in prayer box goes where people already wait, with the owner\'s permission', P.J(`(()=>{ const x=SIGNATURE.find(s=>s.id==='prayer-box'); return [x.n,/laundromat/.test(x.d)&&/permission/.test(x.d),/fence|gate/.test(x.d+x.n),HOW['prayer-box'].some(h=>/fence/.test(h))]; })()`),
    ['A prayer request box where people wait',true,false,false]);

  console.log('\n-- 4. "Why here" for a generic idea never names who moved in --');
  c('the fixture tract is a changing and growing town (the test means something)', P.J(`[...libEnv().tags].filter(t=>['changing','growing','settled'].includes(t))`), ['changing','growing']);
  { const W=P.J(`(()=>{ const env=libEnv(); return LIB.rows.filter(r=>${JSON.stringify(THEMES)}.includes(r.theme)).map(r=>{ const x=libToCatalog(libFull(r.id)); const t0=(x.need||[]).find(t=>env.tags.has(t))||null;
      return {id:r.id,t0,en:libWhyText(x,env.m,env.tags),es:(()=>{ const p=LANG; LANG='es'; try{ return libWhyText(x,env.m,env.tags); }finally{ LANG=p; } })()}; }); })()`);
    // an idea whose own first tag is, say, "newcomers" may rightly speak of arrivals from abroad; the ten-year tags must not
    const G=W.filter(w=>['changing','growing','settled'].includes(w.t0));
    c(`${G.length} cards whose reason is a ten-year tag: never the Hispanic / Latino, Black or Asian share, nor the foreign-born share`, [G.length>100,G.filter(w=>/Hispanic|Latino|hispan|latin|Black|Asian|negra|asiátic|born abroad|nacidos en el extranjero/i.test(w.en+' '+w.es)).map(w=>w.id)], [true,[]]);
    c('…every card with a tag that fires here still says why with a real figure (uEvidence needs one)', W.filter(w=>w.t0&&!/\d/.test(w.en)).map(w=>w.id), []);
    c('…"changing" reads as a plain sentence about the town', W.find(w=>/changed over the last ten years/.test(w.en))!==undefined, true); }
  c('the immigrants theme keeps its own evidence (a shift in who lives here is its need)', P.J(`(()=>{ const x=libToCatalog({id:'immigrants-zz',theme:'immigrants',tier:1,k:'serve',ages:'all',where:'community',need:['changing'],boost:[],ppl:2,leaders:0,hrs:2,cost:0,costMo:0,skill:[],en:{n:'A test idea name',d:'x',how:[]},es:{n:'Una idea de prueba',d:'x',how:[]}});
    const env=libEnv(); return /changed over the last ten years/.test(libWhyText(x,env.m,env.tags)); })()`), false);

  console.log('\n-- 5. "feeding the homeless": ideas about both first, and more of them --');
  { const r=P.J(`(async()=>{ const S=libSearch('feeding the homeless'); await Promise.all(S.themes.map(libLoadTheme)); return 1; })()`); await sleep(50);
    const top=P.J(`(()=>{ LIB.qmemo.clear(); const S=libSearch('feeding the homeless'); return libRank(S.rows,S).slice(0,20).map(o=>({id:o.r.id,rel:o.rel,also:o.r.alsoIds})); })()`);
    c('the first twenty are all about both hunger and homelessness (in both themes, or in one and speaking of the other)', top.filter(o=>o.rel<200).map(o=>o.id), []);
    c('…fifteen new ideas that feed neighbors without a home where they are, cross-listed to hunger, among them', top.filter(o=>/^homeless-/.test(o.id)&&o.also.includes('hunger')).length>=12, true); }
  c('the homeless theme now has 20 or more ideas cross-listed to hunger', IDX.ideas.filter(r=>r[col('t')]===TI.homeless&&r[col('also')].includes(TI.hunger)).length>=15, true);
  { P.E(`libMount('survey')`); type(P,'#u-search','feeding the homeless'); await until(()=>P.qa('#u-lib .lib-card').length>=12,8000);
    // v10.41 integration: the community section (feeding neighbours without a home is outreach; the list has two sections now)
    const first=P.qa('#u-lib .lib-sec[data-lib-sec="out"] .lib-card h4').slice(0,6).map(e=>e.textContent);
    c('on the screen too: the first cards are about feeding people without a home', first.filter(n=>/lunch|supper|breakfast|meal|brunch|food|oatmeal|groceries|kitchen|diner|rescue|dinner/i.test(n)).length>=4, true); }

  console.log('\n-- 6. the handout\'s Spanish budget lines; no made-up places; the file name --');
  const flyer=P.J(`LIB.rows.find(r=>/^Tear-off prayer flyers/.test(r.n)).id`);
  const H=P.J(`(()=>{ const raw=libFull(${JSON.stringify(flyer)}); libSave(raw); CASE_ST.rank=null;
    const m=caseModel(raw.id,{type:'board',group:'board'},{lang:'es'}); const H=caseHandout(m,null,{}); return {lines:H.budget.lines.map(l=>l.name),facts:H.facts.map(f=>f[0]),reach:H.reach||''}; })()`);
  c('a library idea\'s Spanish handout names its budget lines in Spanish', H.lines.every(l=>/estimación de la Biblioteca de ideas|Materiales que ya tienen/.test(l)), true);
  c('…never "library estimate" alone (it read as the public library\'s)', P.J(`libToCatalog(libFull(${JSON.stringify(flyer)})).requirements.lines.map(l=>l.name)`).every(n=>/Idea Library estimate|Supplies already on hand/.test(n)), true);
  c('tear-off flyers seat nobody: no "Cupos" row and no "8 lugares serían…" line', [H.facts.some(f=>/Cupos|Places/.test(f)),H.reach], [false,'']);
  { const r=P.J(`(()=>{ const raw=libFull(${JSON.stringify(flyer)}); const m=caseModel(raw.id,{type:'team',group:'community'}); return {ask:m.motion.ask,rows:m.motion.rows.map(r=>r[0]),seats:libToCatalog(raw).seats}; })()`);
    c('…and the team\'s ask still reads whole, without places', [r.seats,r.rows.includes('Places'),/^For .*run/.test(r.ask||''),/\{places\}|places/.test(r.ask||'')], [false,false,true,false]); }
  { const sup=P.J(`LIB.rows.find(r=>r.theme==='hunger'&&r.where!=='online'&&r.where!=='streets'&&/supper|lunch|breakfast/i.test(r.n)).id`);
    const r=P.J(`(()=>{ const raw=libFull(${JSON.stringify(sup)}); libSave(raw); CASE_ST.rank=null; const m=caseModel(raw.id,{type:'board',group:'board'}); return {seats:libToCatalog(raw).seats,rows:m.motion.rows.map(r=>r[0])}; })()`);
    c('a meal people sit down to keeps its places', [r.seats,r.rows.includes('Places')], [true,true]); }
  { const nm=P.J(`(()=>{ const raw=libFull(${JSON.stringify(flyer)}); const b=caseModel(raw.id,{type:'board',group:'board'}), g=caseModel(raw.id,{type:'congregation',group:'congregation'});
      const d=new Date(2026,8,29); return [casePdfName(caseHandout(b,null,{}),d),casePdfName(caseHandout(g,null,{}),d)]; })()`);
    c('the board\'s and the congregation\'s handouts get different names; "Tear-off" keeps its hyphen; cut at a whole word',
      nm, ['Bucks-County-SDA-Tear-off-prayer-flyers-on-community-boards-board-2026-09-29.pdf','Bucks-County-SDA-Tear-off-prayer-flyers-on-community-boards-congregation-2026-09-29.pdf']); }
  c('no errors on the way', P.errs, []);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('CRASH',e&&e.stack||e); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
