// v10.43 (C3, SPEC §5 / DESIGN C3) — clear next steps: "What's next" at the very bottom of the Community Survey, "Your path"
// on the hub, and the survey cards' "Build proposal" renamed.
// The pastor (30 Sep 2026): "At the end of the Community Survey, at the very bottom, there should be a Make the Case button for
// this specific ministry… right now they can click it and then there's no next. And maybe the Spiritual Gifts need to also be
// encouraged there for the congregation. Let me know where that could go on the first place, so it's accessible and easy to see
// and understand that this should be the next step. They could skip the Spiritual Gifts and go straight to Make the Case, but
// eventually the Spiritual Gifts need to be done so they know about their membership."
// Checked here (jsdom, no layout): the hub strip's four steps and their states on the average church (tests/average-church:
// before / partial / after; seed-followup.json is the integrator's), the glow on the first step not done, nothing blocked,
// reduced motion, hidden on member links / the flat view / before registration / the free tier, EN + ES; the survey's "What's
// next": one button per ministry in the plan opening Make the Case at step 1, the empty-plan line, the Gifts first card and its
// line, the connection card only where the connection cards say so (cnEligible), "Build proposal" gone. Pixels (equal heights,
// one row from 720 px, the glow) are checked in Chrome.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const FX=require('./fixtures.json');
const FXD=path.join(__dirname,'average-church');
const SEED=v=>JSON.parse(fs.readFileSync(path.join(FXD,`seed-${v}.json`),'utf8'));
let pass=0,fail=0;
const c=(n,g,e=true)=>{const ok=JSON.stringify(g)===JSON.stringify(e);console.log((ok?'  PASS  ':'  FAIL  ')+n);if(!ok){console.log('    got:',JSON.stringify(g).slice(0,700));console.log('    want:',JSON.stringify(e).slice(0,500));fail++}else pass++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(25); } return false; }
const REG={name:'Joshua Mura',email:'jm@example.org',church:'Bucks County SDA',conf:'Pennsylvania',role:'pastor'};
const AI=/\b(AI|IA|A\.I\.|artificial intelligence|inteligencia artificial)\b/;
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:(o.url||'https://pastorshub.org/')+(o.tier?'?tier='+o.tier:''),pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.__scrolled=[]; w.Element.prototype.scrollIntoView=function(){ w.__scrolled.push(this.id||this.className); };
      if(o.seed) for(const [k,v] of Object.entries(SEED(o.seed))) if(!k.startsWith('_')&&(o.reg!==false||k!=='terrain-reg')) w.localStorage.setItem(k,JSON.stringify(v));
      if(!o.seed&&o.reg!==false) w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
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
const ready=async P=>{ await until(()=>P.E('typeof gfReadiness==="function"&&typeof uChurch==="function"')); await sleep(300); };
const sec=async(f)=>{ try{ await f(); }catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e).toString().split('\n').slice(0,3).join(' | ')); fail++; } };
// the strip as the pastor reads it: [title, state, the why line, class]
const steps=P=>P.qa('#hubpath .hp-step').map(b=>[b.querySelector('b').textContent,b.querySelector('small').textContent,b.querySelector('em')?b.querySelector('em').textContent:'',b.classList.contains('now')?'now':b.classList.contains('done')?'done':'todo']);
const hub=async(seed,o)=>{ o=o||{}; const P=page({seed,...o}); await ready(P); if(o.pre) P.E(o.pre); P.E('showHub()'); return P; };
// the survey with a plan (the fixtures' tract and medium church)
function survey(P,pre){
  P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; uChurch().name='Bucks County SDA'; CAP=null;
    capSave(${JSON.stringify(FX.MEDIUM)}); ${pre||''} uPersist(); openTool('survey'); render(); })()`);
}
const nextBtns=P=>P.qa('#u-whatsnext [data-u-next-case]').map(b=>[b.dataset.uNextCase,b.textContent.trim()]);

(async()=>{ try{
  console.log('\n-- "Your path" on the hub: four steps above the tools --');
  await sec(async()=>{
    const P=await hub('before');
    c('the strip sits above the four tools, below the welcome and the quote', P.qa('#hub > *').map(e=>e.className.split(' ')[0]).join(','), 'hubwelcome,egw,rule,hubpath,tools,hubgifts');
    c('a nav, named "Your path", shown', [P.q('#hubpath').tagName,P.q('#hubpath').getAttribute('aria-label'),P.q('#hubpath').hidden,P.txt('#hubpath .hp-k')], ['NAV','Your path',false,'Your path']);
    c('the average church before (an address, 0 of 46, an empty plan, an opening night): four steps in order, the gifts step glows', steps(P), [
      ['Map your neighborhood','Done ✓','','done'],
      ['Discover your members’ gifts','0 of 46','So every proposal knows who is gifted and ready.','now'],
      ['Make the case','0 ministries in your plan','','todo'],
      ['Plan an evangelism series','Done ✓','','done']]);
    c('each step opens its tool, in order', P.qa('#hubpath [data-hp]').map(b=>b.dataset.hp), ['survey','gifts','case','planner']);
    c('the glowing step is the current one (aria-current), one only', [P.qa('#hubpath [aria-current="step"]').length,P.q('#hubpath [aria-current="step"]').dataset.hp], [1,'gifts']);
    c('nothing is blocked: every step is a live button (the gifts never block making the case)', P.qa('#hubpath button').map(b=>b.disabled||b.getAttribute('aria-disabled')==='true'), [false,false,false,false]);
    c('each step in its tool’s colour family (survey mint, gifts violet, the case amber, the Planner pink)', P.qa('#hubpath .hp-step').map(b=>b.style.getPropertyValue('--hc')), ['var(--m-language)','var(--m-children)','var(--m-hardship)','var(--m-people)']);
    P.q('#hubpath [data-hp="case"]').click();
    c('make the case is open while the gifts are not done (skippable)', [P.J('TOOL'),P.q('#hub').hidden], ['case',true]);
    P.E('showHub()'); P.q('#hubpath [data-hp="gifts"]').click();
    c('…the gifts step opens Spiritual Gifts', P.J('TOOL'), 'gifts');
    P.E('showHub()'); P.q('#hubpath [data-hp="planner"]').click();
    c('…the Planner step the Evangelism Planner', P.J('TOOL'), 'planner');
    P.E('showHub()'); P.q('#hubpath [data-hp="survey"]').click();
    c('…the first the Community Survey', P.J('TOOL'), 'survey');
    c('no names on the hub strip, no "AI"', [P.txt('#hubpath').includes('(sample)'),AI.test(P.txt('#hubpath'))], [false,false]);
    c('no errors', P.errs, []); P.w.close(); });
  await sec(async()=>{
    const P=await hub('partial');
    c('partial (18 of 46): "18 of 46", the gifts step still glows (below half)', steps(P)[1], ['Discover your members’ gifts','18 of 46','So every proposal knows who is gifted and ready.','now']); P.w.close();
    const A=await hub('after');
    c('after (40 of 46, half or more): the gifts step done, making the case glows', steps(A).map(s=>s[3]), ['done','done','now','done']);
    c('…"40 of 46"', steps(A)[1][1], '40 of 46');
    A.E(`uChurch().selected=['cooking-school']; uPersist(); showHub();`);
    c('one ministry in the plan: singular', steps(A)[2].slice(0,2), ['Make the case','1 ministry in your plan']);
    A.E(`uChurch().selected=['cooking-school','food-pantry','an-id-no-longer-here']; uPersist(); showHub();`);
    c('two (an id no longer in the catalogue is not counted)', steps(A)[2][1], '2 ministries in your plan');
    c('…still glowing: in the plan is not yet the case made', steps(A)[2][3], 'now');
    A.E(`caseDecSave('food-pantry',{body:'board',outcome:'approved',date:'2026-09-20'}); showHub();`);
    c('a decision recorded for one of them: the case is made, step 3 done', [A.J(`Object.keys(caseDecAll('food-pantry'))`),steps(A)[2][3]], [['board'],'done']);
    c('…all four done (the opening night is set): nothing glows', [steps(A).map(s=>s[3]),A.qa('#hubpath .now').length], [['done','done','done','done'],0]);
    A.E(`delete uChurch().plan.date; uPersist(); showHub();`);
    c('no opening night: the Planner step "Optional", and it glows last of all', steps(A)[3], ['Plan an evangelism series','Optional','','now']);
    A.E(`uChurch().address=''; uPersist(); showHub();`);
    c('no church address: "Start here" on the first step, and it glows', [steps(A)[0],A.qa('#hubpath .now').length], [['Map your neighborhood','Start here','','now'],1]);
    c('no errors', [P.errs,A.errs], [[],[]]); A.w.close(); });
  await sec(async()=>{
    const X=await hub('before',{pre:`(()=>{ const c=uChurch().capacity; delete c.adults; delete c.members; delete c.membership; uPersist(); CAP=null; })()`});
    c('no attendance in the profile and nobody yet: "Not yet"', steps(X)[1].slice(0,2), ['Discover your members’ gifts','Not yet']); X.w.close();
    const Y=await hub('partial',{pre:`(()=>{ const c=uChurch().capacity; delete c.adults; delete c.members; delete c.membership; uPersist(); CAP=null; })()`});
    c('…with results: "18 so far"', steps(Y)[1][1], '18 so far'); Y.w.close(); });
  await sec(async()=>{
    const S=await hub('before',{lang:'es'});
    c('in Spanish (usted): the label, the four steps, the states', [S.q('#hubpath').getAttribute('aria-label'),S.txt('#hubpath .hp-k'),steps(S)], ['Su camino','Su camino',[
      ['Conozca su vecindario','Hecho ✓','','done'],
      ['Descubra los dones de sus miembros','0 de 46','Para que cada propuesta sepa quién tiene el don y está listo.','now'],
      ['Presentar el caso','0 ministerios en su plan','','todo'],
      ['Planifique una serie de evangelismo','Hecho ✓','','done']]]);
    S.E(`uChurch().selected=['cooking-school']; delete uChurch().plan.date; uPersist(); showHub();`);
    c('…singular, and "Opcional"', [steps(S)[2][1],steps(S)[3][1]], ['1 ministerio en su plan','Opcional']);
    S.E(`uChurch().address=''; uPersist(); showHub();`);
    c('…"Empiece aquí"', steps(S)[0][1], 'Empiece aquí');
    c('no errors', S.errs, []); S.w.close(); });
  await sec(async()=>{
    const M=await hub('partial',{url:'https://pastorshub.org/#gifts=QLvn7p0Tqzd5'});
    c('never on a member’s page (#gifts=)', [M.q('#hubpath').hidden,M.qa('#hubpath .hp-step').length], [true,0]); M.w.close();
    const W=await hub('partial',{url:'https://pastorshub.org/#watch=AAAAAAAAAAAAAAAAAAAAAA'});
    c('…nor on a phone following slides (#watch=)', W.qa('#hubpath .hp-step').length, 0); W.w.close();
    const F=await hub('partial',{url:'https://pastorshub.org/?flat'});
    c('…nor in the flat view', F.qa('#hubpath .hp-step').length, 0); F.w.close();
    const G=page({seed:'partial',reg:false}); await ready(G); G.E('GATE=GATE||{}; showHub()');
    c('…nor before registration', [G.E('gated()'),G.qa('#hubpath .hp-step').length], [true,0]); G.w.close();
    const T=await hub('partial',{tier:'free'});
    c('…nor in the free tier (the tools behind it are locked)', T.qa('#hubpath .hp-step').length, 0); T.w.close();
    const N=page({}); await ready(N); N.E('uChurch(); showHub()');
    c('…nor for the "My church" placeholder with no profile and no results (as Gifts first)', [N.q('#hubpath').hidden,N.qa('#hubpath .hp-step').length], [true,0]); N.w.close();
    // v10.43 (integration): with the connection cards in the page, memberLink() is theirs (a const reading CONNECT_LINK), so the
    // link itself is switched on here rather than the function replaced.
    const L=page({seed:'partial',url:'https://pastorshub.org/'}); await ready(L); L.E('showHub();'); const before=L.qa('#hubpath .hp-step').length;
    L.E('CONNECT_LINK.on=true; hubPath();');
    c('…nor when the connection cards say this is a member’s link (memberLink)', [before,L.E('memberLink()'),L.qa('#hubpath .hp-step').length], [4,true,0]); L.w.close(); });
  await sec(async()=>{
    const R=await hub('partial');
    R.E(`(()=>{ const r=uRead(GF_ROSTER,[]); localStorage.setItem(GF_ROSTER,JSON.stringify(r.slice(0,1))); })(); gfFirstRefresh();`);
    c('results coming in redraw it (gfFirstRefresh)', steps(R)[1][1], '1 of 46'); R.w.close(); });
  console.log('\n-- the glow: gentle, and still for reduced motion --');
  // v10.45.1 — the pastor changed his mind (5 Oct 2026): "nothing stays highlighted", only the step under the pointer.
  // Was: the first step not done breathes (hpBreathe), and reduced motion stops it.
  c('the next step is not lit at rest: no border colour, no breathing', [/\.hp-step\.now\{/.test(html),/hpBreathe/.test(html)], [false,false]);
  c('the step under the pointer lights (on a computer), and keyboard focus shows', [/@media \(hover:hover\)\{\.hp-step:hover\{border-color:var\(--hc\);box-shadow:/.test(html),/\.hp-step:focus-visible\{outline:2px solid var\(--hc\)/.test(html)], [true,true]);
  c('print leaves the strip out', /@media print\{\.hubpath\{display:none\}\}/.test(html));
  c('symmetric: four equal columns from 720 px, two by two below, each step as tall as its row', [/\.hp-steps\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(html),/@media \(min-width:720px\)\{\.hp-steps\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}\}/.test(html),/\.hp-step\{[^}]*height:100%/.test(html)], [true,true,true]);

  console.log('\n-- "What’s next" at the very bottom of the Community Survey --');
  await sec(async()=>{
    const P=page(); await ready(P);
    survey(P,`uChurch().selected=['cooking-school','food-pantry']; caseSetPrefs({type:'board',group:'board'});`);
    const blks=P.qa('#sections section.blk'), i=blks.findIndex(s=>s.id==='u-whatsnext');
    // v10.45.0 (stale): the ministries list is gone; What's next follows Community resources (DESIGN-SURVEY §1.4)
    // v10.46.1: the needs moved to the bottom, after Community resources ("should go after community resources"); What's next follows them
    c('one block, the survey’s last (after the needs; Make the Case’s own block follows, shown only in that tool)',
      [P.qa('#u-whatsnext').length,blks[i-1].querySelector('h2').textContent,blks[i+1].dataset.tab,blks.slice(i+2).length], [1,'What this neighborhood needs from our church','case',0]);
    c('in the survey: shown, a section with its heading ("What’s next"), kept under a Focus (prompts)', [P.q('#u-whatsnext').classList.contains('offtab'),P.txt('#u-whatsnext h2'),P.q('#u-whatsnext').dataset.tab,P.q('#u-whatsnext').dataset.theme.split(' ')[0]], [false,'What’s next','mobilize','prompts']);
    c('…in the section bar too', P.qa('#secnav button').map(b=>b.textContent).includes('What’s next'), true);
    c('two parts: make the case, then the gifts', P.qa('#u-whatsnext .u-next-part h3').map(h=>h.textContent), ['Make the Case','Discover your members’ gifts']);
    const hasNoun=P.E('typeof cnNextNoun==="function"');
    c('one button per ministry in the plan, in plan order: "Make the case for …"', nextBtns(P), hasNoun
      ? [['cooking-school','Create the proposal for the plant-based cooking school'],['food-pantry','Create the proposal for “A real food pantry, on a schedule”']]
      : [['cooking-school','Make the case for “Plant-based cooking school”'],['food-pantry','Make the case for “A real food pantry, on a schedule”']]);
    console.log('    (the noun phrase: '+(hasNoun?'the connection cards’ cnNextNoun':'quoted; cnNextNoun is not in this page yet')+')');
    P.w.__scrolled.length=0;
    P.q('#u-whatsnext [data-u-next-case="food-pantry"]').click();
    c('a button opens Make the Case with that ministry chosen, at step 1 "Who is it for?" (even with a group already chosen)',
      [P.J('TOOL'),P.J('casePrefs().ministry'),P.w.__scrolled.slice(-1)[0],P.J('casePrefs().group')], ['case','food-pantry','cs-s1','board']);
    c('…step 1 drawn, the ministry in the step bar', [!!P.q('#cs-s1 [data-cs-group]'),P.txt('#cs-bar [data-cs-jump="2"] small')], [true,'A real food pantry, on a schedule']);
    // v10.45.0 (§1.4, a bug fixed): after he last used "A project or purchase", the button opened that path and his ministry was nowhere
    P.E(`openTool('survey'); caseSetPrefs({path:'buy'});`); P.q('#u-whatsnext [data-u-next-case="food-pantry"]').click();
    c('…on the ministry path, even when he last used "A project or purchase"', [P.J('casePrefs().path'),P.J('buyPath()'),P.J('casePrefs().ministry')], ['ministry','ministry','food-pantry']);
    P.E(`openTool('survey')`); P.w.__scrolled.length=0; P.E(`uOpenProposal('food-pantry')`);
    c('the survey and library cards’ own call is unchanged: its slides when a group is chosen', P.w.__scrolled.slice(-1)[0], 'cs-s3');
    P.E(`openTool('survey')`);
    const gf=P.q('#u-whatsnext [data-gf-first]');
    c('the gifts part: one line, then the Gifts first card (one number, one button)', [P.txt('#u-whatsnext .u-next-gifts > .note'),gf&&gf.dataset.gfFirst,P.qa('#u-whatsnext [data-gf-first] button').map(b=>b.textContent),!!P.q('#u-whatsnext [data-gf-first] .gff-n')],
      ['Proposals are stronger when your members know their gifts. You can make the case first and do this alongside.','survey-end',['Invite the whole church'],true]);
    c('…the line after the heading, the card after the line', [P.q('#u-whatsnext .u-next-gifts h3').nextElementSibling.className,P.q('#u-whatsnext .u-next-gifts > .note').nextElementSibling.dataset.gfFirst], ['note','survey-end']);
    P.q('#u-whatsnext [data-gf-invite]').click();
    c('"Invite the whole church" opens Spiritual Gifts', P.J('TOOL'), 'gifts');
    P.E(`openTool('survey')`);
    c('no connection card while the connection cards are not in the page (or say no)', P.qa('#u-whatsnext [data-u-next-card]').length, P.E(`typeof cnEligible==='function'?nxPlanItems().filter(x=>nxCardOk(x)).length:0`));
    // v10.45.0 (§1.4): the old list, where removal lived, is gone: a quiet "×" beside each
    c('a quiet remove button beside each, named for its ministry', P.qa('#u-whatsnext [data-u-next-drop]').map(b=>[b.dataset.uNextDrop,b.textContent,b.getAttribute('aria-label')]),
      [['cooking-school','×','Remove '+P.E(`gfCap(caseMinName(uCatalog().find(x=>x.id==='cooking-school')))`)+' from your plan'],['food-pantry','×','Remove A real food pantry, on a schedule from your plan']]);
    P.q('#u-whatsnext [data-u-next-drop="cooking-school"]').click();
    c('…which takes it out of the plan, in place', [P.J('uSelected()'),nextBtns(P).map(b=>b[0])], [['food-pantry'],['food-pantry']]);
    c('no "Build proposal" anywhere, and no "AI"', [/Build proposal/.test(P.w.document.documentElement.outerHTML),AI.test(P.txt('#u-whatsnext'))], [false,false]);
    c('no errors', P.errs, []);
    P.w.close(); });
  await sec(async()=>{
    // the connection cards (C2) decide which ideas get a card: an event or series in the plan; stubbed here so the wiring is checked alone
    const P=page(); await ready(P);
    P.E(`window.__made=[]; window.cnEligible=x=>x.id==='cooking-school'; window.cnOpenMaker=x=>window.__made.push(x.id);`);
    survey(P,`uChurch().selected=['cooking-school','food-pantry'];`);
    c('beside an event or series (cnEligible) a "Connection card" button; none beside the others', P.qa('#u-whatsnext .u-next-row').map(r=>[r.querySelector('[data-u-next-case]').dataset.uNextCase,r.querySelector('[data-u-next-card]')?r.querySelector('[data-u-next-card]').textContent:null]),
      [['cooking-school','Connection card'],['food-pantry',null]]);
    c('…every row then keeps the same column for it, so the "Make the case" buttons line up', P.q('#u-whatsnext .u-next-list').classList.contains('with-cards'), true);
    P.q('#u-whatsnext [data-u-next-card="cooking-school"]').click();
    c('…it opens the connection cards’ maker with that idea (cnOpenMaker)', P.J('__made'), ['cooking-school']);
    P.E(`window.cnEligible=()=>{ throw new Error('x'); }; uNextRefresh();`);
    c('…a failure there costs only the card button (and the list keeps one column)', [P.qa('#u-whatsnext [data-u-next-case]').length,P.qa('#u-whatsnext [data-u-next-card]').length,P.q('#u-whatsnext .u-next-list').classList.contains('with-cards')], [2,0,false]);
    c('no errors', P.errs, []); P.w.close(); });
  await sec(async()=>{
    // the noun phrase: the connection cards' cnNextNoun (C2), stubbed with its three shapes so the composition is checked alone
    const P=page({lang:'es'}); await ready(P);
    P.E(`window.cnNextNoun=(n,l)=>/cocina/i.test(n)?{np:'la escuela de cocina',art:'la',quoted:false}:/despensa/i.test(n)?{np:'«Una despensa de verdad, con horario»',art:'',quoted:true}:{np:'el club semanal de tareas',art:'el',quoted:false};`);
    survey(P,`uChurch().selected=['cooking-school','food-pantry','homework-club'];`);
    c('Spanish: "de la …", "del …" (de + el), "sobre «…»" when quoted', nextBtns(P).map(b=>b[1]),
      ['Crear la propuesta para la escuela de cocina','Crear la propuesta para «Una despensa de verdad, con horario»','Crear la propuesta para el club semanal de tareas']);
    P.E(`window.cnNextNoun=undefined; uNextRefresh();`);   // v10.43 (integration): C2's function is a declaration now; delete cannot remove it
    c('…without it, the Spanish name in «»', nextBtns(P)[0][1], 'Crear la propuesta para «'+P.E(`caseMinName(uCatalog().find(x=>x.id==='cooking-school'))`)+'»');
    c('the heading, the parts and the gifts line in Spanish', [P.txt('#u-whatsnext h2'),P.qa('#u-whatsnext .u-next-part h3').map(h=>h.textContent),P.txt('#u-whatsnext .u-next-gifts > .note')],
      ['Lo que sigue',['Presentar el caso','Descubra los dones de sus miembros'],'Las propuestas son más sólidas cuando sus miembros conocen sus dones. Puede presentar el caso primero y hacer esto a la vez.']);
    P.E(`window.cnEligible=()=>true; window.cnOpenMaker=()=>{}; uNextRefresh();`);
    c('…"Tarjeta de contacto"', P.qa('#u-whatsnext [data-u-next-card]').map(b=>b.textContent)[0], 'Tarjeta de contacto');
    P.E(`uChurch().selected=[]; uPersist(); uRefresh();`);
    c('…the empty plan in Spanish (v10.45.0: open a need, choose an idea)', P.txt('#u-whatsnext [data-u-next-up]'), '↑ Abra una necesidad arriba, elija una idea y toque «Crear una propuesta para este ministerio».');
    c('the survey card’s button: "Presentar el caso de esta idea"', P.E(`(()=>{ const d=document.createElement('div'); d.innerHTML=uCard(uCatalog().find(x=>x.id==='food-pantry')); return d.querySelector('[data-u-propose]').textContent; })()`), 'Presentar el caso de esta idea');
    c('no errors', P.errs, []); P.w.close(); });
  await sec(async()=>{
    const P=page(); await ready(P);
    survey(P,`uChurch().selected=[];`);
    // v10.45.0 (stale): the plan is filled from a need's idea now ("Create a proposal for this ministry")
    c('an empty plan: one line pointing up to the needs, no buttons', [P.txt('#u-whatsnext [data-u-next-up]'),P.qa('#u-whatsnext [data-u-next-case]').length], ['↑ Open a need above, choose an idea, then tap “Create a proposal for this ministry”.',0]);
    P.w.__scrolled.length=0; P.q('#u-whatsnext [data-u-next-up]').click();
    c('…tapping it goes up to the needs (their heading)', [P.w.__scrolled.slice(-1)[0],P.txt('#'+P.w.__scrolled.slice(-1)[0]+' > h2')], ['u-needs','What this neighborhood needs from our church']);
    const id=P.E(`(()=>{ const m=suggestions(DATA.M,SCOPE).moves.find(x=>uCheck(x).ok); return m&&m.id; })()`);
    P.E(`uChurch().selected=[${JSON.stringify(id)}]; uPersist(); uNextRefresh();`);   // (as "Create a proposal for this ministry" does: v45-handoff)
    c('a ministry in the plan: its button appears at the bottom', nextBtns(P).map(b=>b[0]), [id]);
    // a built-in added from the survey's Idea Library (libAddX) redraws the panel without the whole report
    const other=P.E(`(()=>{ const m=SIGNATURE.find(x=>x.id!==${JSON.stringify(id)}&&uCheck(x).ok); return m&&m.id; })()`);
    P.E(`libAddX('survey',${JSON.stringify(other)})`);
    c('…and one added from the Idea Library (in place)', nextBtns(P).map(b=>b[0]), [id,other]);
    c('the survey card: "Make the case for this" (the library cards’ words), opening Make the Case as before', P.E(`(()=>{ const d=document.createElement('div'); d.innerHTML=uCard(uCatalog().find(x=>x.id==='food-pantry')); const b=d.querySelector('[data-u-propose]'); return [b.textContent,b.dataset.uPropose]; })()`), ['Make the case for this','food-pantry']);
    c('…the same words as the library cards', P.E(`libT('mk')`), 'Create a proposal for this ministry');   // v10.45.0 review #27d (the old survey card, unreferenced now, keeps its words)
    c('no errors', P.errs, []); P.w.close(); });
  await sec(async()=>{
    const F=page({url:'https://pastorshub.org/?flat'}); await ready(F); survey(F,`uChurch().selected=['food-pantry'];`);
    c('never in the flat view', F.qa('#u-whatsnext').length, 0); F.w.close();
    const T=page({tier:'free'}); await ready(T); survey(T,`uChurch().selected=['food-pantry'];`);
    c('…nor in the free tier (the survey ends on its lock)', T.qa('#u-whatsnext').length, 0); T.w.close();
    const C=page(); await ready(C); survey(C,`uChurch().selected=['food-pantry'];`); C.E(`openTool('case')`);
    c('in Make the Case the block is out of sight (it belongs to the survey)', C.q('#u-whatsnext').classList.contains('offtab'), true); C.w.close(); });
  console.log('\n-- the look --');
  c('equal heights (each button as tall as the tallest, measured), one full-width button each, the connection card beside it from 640 px', [/\.u-next-row \.u-next-go\{min-height:var\(--nx-h,48px\)\}/.test(html)&&/function uNextEqual\(\)/.test(html),/@media \(min-width:640px\)\{[^\n]*\.u-next-list\.with-cards \.u-next-row\{grid-template-columns:minmax\(0,1fr\) 11rem\}/.test(html)], [true,true]);
  c('the two parts in their tools’ colours (the case amber, the gifts violet)', [/\.u-next-part\{--nc:var\(--m-hardship\)/.test(html),/\.u-next-part\.u-next-gifts\{--nc:var\(--m-children\)\}/.test(html)], [true,true]);
  c('"Build proposal" is gone from the file', /Build proposal/.test(html), false);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e)); console.log(`\n${pass} passed, ${fail+1} failed`); process.exit(1); } })();
