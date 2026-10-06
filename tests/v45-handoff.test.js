// v10.45.0 — "Create a proposal for this ministry": the Community Survey's idea sheet hands the idea to Make the Case.
// The pastor (5 Oct 2026): "if you click the ministry … it will then go to bring you to the create a proposal section. And then we're
// going to work on that as well a little bit more. But right now, let's just get all of this complete."
// The coordinator's spec (DESIGN-SURVEY.md §2.7): one clear primary button on every opened idea sheet; it takes the pastor straight to
// Make the Case with that idea already chosen and the view on it, and adds the idea to the church's plan; Make the Case is otherwise
// unchanged; the way back to the survey keeps the need and the idea that were open.
// Written failing-first against v10.44.1 (no #u-needs, no nsPropose): every block below FAILs there and must PASS on v10.45.0.
// jsdom does no layout: "the view lands on it" is checked as the last instant scrollIntoView() call and the focus; the pixels are a
// Chrome gate (DESIGN §7.3, step 5).
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
// A curated map as the build writes it (DESIGN §6.2), from the approved mockup's picks for rent50 (12 library ideas) and one built-in
// under snap (the rest of snap comes from the fallback). The hash is the shipped index's, so the page never renews.
const IDX=JSON.parse(fs.readFileSync(path.join(ROOT,'ideas','index.json'),'utf8'));
const NEEDS={v:1,hash:IDX.hash,
  needs:{rent50:['homeless-rent-help-page','jobs-money-read-before-you-sign-table','clothing-practical-renters-repair-request-evening','homeless-rental-scam-class',
    'homeless-rent-help-night','homeless-eviction-moving-crew','homeless-volunteer-mediators','homeless-application-fee-fund','jobs-money-lower-your-bills-night',
    'homeless-rent-bridge-fund','homeless-parsonage-bridge-housing','jobs-money-first-home-readiness-course'],
    snap:['pantry-box']},
  lang:{},d1:{}};
const IDEA='homeless-rent-help-page', NEED='rent50', BUILTIN='pantry-box';
function page(o){
  o=o||{};
  const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://pastorshub.org/'+(o.tier?'?tier='+o.tier:''),pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.scrollTo=()=>{}; w.scrollBy=()=>{}; w.__scrolled=[];
      w.Element.prototype.scrollIntoView=function(a){ w.__scrolled.push({id:this.id||'',lib:(this.dataset&&this.dataset.libId)||'',need:(this.dataset&&this.dataset.need)||'',
        cls:String(this.className||''),how:a&&typeof a==='object'?a.behavior||'':''}); };
      if(w.HTMLDialogElement){ w.HTMLDialogElement.prototype.showModal=function(){ this.setAttribute('open',''); };
        w.HTMLDialogElement.prototype.close=function(){ this.removeAttribute('open'); this.dispatchEvent(new w.Event('close')); }; }
      w.localStorage.setItem('terrain-reg',JSON.stringify(REG));
      if(o.lang) w.localStorage.setItem('terrain-lang',o.lang);
      w.__fetched=[];
      w.fetch=async(u)=>{ u=String(u); w.__fetched.push(u);
        if(/^\/ideas\/needs\.json/.test(u)) return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(NEEDS))};
        const m=/^\/ideas\/([a-z-]+)\.json/.exec(u);
        if(m){ const f=path.join(ROOT,'ideas',m[1]+'.json'); if(!fs.existsSync(f)) return {ok:false,status:404,json:async()=>null};
          const t=fs.readFileSync(f,'utf8'); return {ok:true,status:200,json:async()=>JSON.parse(t)}; }
        if(/advise/.test(u)) return {ok:true,status:200,json:async()=>({enabled:false})};
        return new Promise(()=>{}); }; }});
  const w=dom.window;
  return {w,E:s=>w.eval(s),J:s=>JSON.parse(w.eval(`JSON.stringify(${s})`)),errs,
    q:s=>w.document.querySelector(s),qa:s=>[...w.document.querySelectorAll(s)],txt:s=>{ const e=w.document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; }};
}
const ready=async P=>{ await until(()=>P.E('typeof uChurch==="function"&&typeof openTool==="function"')); await sleep(300); };
const sec=async(f)=>{ try{ await f(); }catch(e){ console.log('  FAIL  crashed: '+(e&&e.stack||e).toString().split('\n').slice(0,3).join(' | ')); fail++; } };
// the survey on the fixture's tract (rent50, snap and 18 more fire there), a church with NO profile (nothing is checked against it),
// and Make the Case last left on "A project or purchase" (the hand-off must bring it back to the ministry path)
function survey(P){
  P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; CAP=null; const ch=uChurch(); ch.name='Bucks County SDA'; ch.capacity={};
    ch.selected=[]; ch.lib={}; ch.proposalPrefs={path:'buy'}; uPersist(); openTool('survey'); render(); })()`);
}
async function openSheet(P,need,idea){
  await until(()=>P.q(`#u-needs [data-need="${need}"] .ns-head`));
  const h=P.q(`#u-needs [data-need="${need}"] .ns-head`); if(h.getAttribute('aria-expanded')!=='true') h.click();
  const s=P.q(`[data-ns-show="${need}"]`); if(s&&s.getAttribute('aria-expanded')!=='true') s.click();
  await until(()=>P.q(`#ns-i-${need} .ns-row[data-idea="${idea}"]`));
  P.q(`#ns-i-${need} .ns-row[data-idea="${idea}"]`).click();
  await until(()=>P.q('#ns-sheet[open]')&&P.q('#ns-sheet').dataset.idea===idea);
}
const lastScroll=P=>P.w.__scrolled[P.w.__scrolled.length-1]||null;

(async()=>{ try{
  console.log('\n-- the sheet: one clear primary button --');
  await sec(async()=>{
    const P=page(); await ready(P); survey(P);
    // v10.45.1 — the pastor changed his mind (5 Oct 2026): the report first ("what the community is like"), then the needs.
    // Was: #u-needs between the focus note and THE BRIEF.
    c('the needs at the bottom of the survey: #u-needs after Community resources (v10.46.1)',
      (P=>{ const n=P.q('#u-needs'), h=e=>e&&e.querySelector('h2')?e.querySelector('h2').textContent:(e&&e.id); return [!!n,!!n&&n.parentElement.id,h(n&&n.previousElementSibling)]; })(P),[true,'sections','Community resources']);   // v10.46.1: at the bottom, after Community resources
    await openSheet(P,NEED,IDEA);
    c('the sheet is open on the idea, for its need', [P.q('#ns-sheet').dataset.idea,P.q('#ns-sheet').dataset.need],[IDEA,NEED]);
    c('one primary button, "Create a proposal for this ministry"', [P.qa('#ns-sheet .primary').length,P.qa('#ns-sheet [data-ns-propose]').length,P.txt('#ns-sheet [data-ns-propose]')],[1,1,'Create a proposal for this ministry']);
    c('…and it is the primary one', P.q('#ns-sheet [data-ns-propose]').classList.contains('primary'), true);
    c('the One-page PDF beside it is not primary', [!!P.q('#ns-sheet [data-ns-pdf]'),P.q('#ns-sheet [data-ns-pdf]')&&P.q('#ns-sheet [data-ns-pdf]').classList.contains('primary')],[true,false]);
    c('no "In your plan" yet', !!P.q('#ns-sheet [data-ns-remove]'), false);

    console.log('\n-- Create a proposal: Make the Case, the idea chosen, the view on it, the plan --');
    P.w.__scrolled.length=0;
    P.q('#ns-sheet [data-ns-propose]').click();
    await until(()=>P.E('TOOL')==='case'&&P.q(`#cs-s2 .cs-chosen [data-lib-id="${IDEA}"]`));
    await sleep(120);   // the second jump runs after two animation frames
    c('Make the Case is open', P.E('TOOL'), 'case');
    c('the idea is the chosen one', P.J('casePrefs().ministry'), IDEA);
    c('on the ministry path, though he last used "A project or purchase"', [P.J('casePrefs().path'),P.J('buyPath()')],['ministry','ministry']);
    c('the idea is saved with the church (uChurch().lib), as "Make the case for this" always did', P.J(`!!(uChurch().lib&&uChurch().lib[${JSON.stringify(IDEA)}])`), true);
    c('…and added to the plan, with no capacity check (the church has no profile)', [P.J(`uSelected().includes(${JSON.stringify(IDEA)})`),P.J('capMerged().ready')],[true,false]);
    c('the sheet is closed', !!P.q('#ns-sheet[open]'), false);
    c('step 2 shows the chosen card, not the list', [!!P.q(`#cs-s2 .cs-chosen [data-lib-id="${IDEA}"]`),!!P.q('#cs-s2 #cs-q')],[true,false]);
    const L=lastScroll(P);
    // v10.47.0 — the pastor (5 Oct 2026): "this proposal will be front and center at the top and then below … who it's for … as simple
    // as possible". Was: landing on the chosen card in step 2, the step bar naming it, the way back as a line above the step bar.
    c('the view lands on the proposal card at the top: the last jump is to it, instant (never smooth)', [L&&L.id,L&&L.how],['cs-prop','auto']);
    c('…and the card has the focus (keyboard and screen readers start there)', P.E(`document.activeElement?document.activeElement.id:''`), 'cs-prop');
    c('nothing above it: it is the first thing in Make the Case (no ministry-or-project switch, no Gifts-first line, no step bar)',
      [P.q('#casebody').firstElementChild.id,!!P.q('#cs-bar'),!!P.q('#cs-gff'),P.q('#cs-switch').hidden],['cs-prop',false,false,true]);
    // v10.48.0 — "big letters above that says proposal … this beautiful thing [the sheet]": the card is the idea's whole sheet
    c('the card names the ministry, its lift and what it needs from our church, and the need it meets', [P.txt('#cs-prop .cs-pt'),!!P.q('#cs-prop .ns-liftline')&&P.qa('#cs-prop .ns-gi').length>=2,
      (P.txt('#cs-prop .cs-pneed')||'').includes(P.J(`NSM.needs.find(n=>n.id==='${NEED}').title`))], [P.E(`gfCap(nsView(${JSON.stringify(IDEA)},nsNeedLang(nsNeedById('${NEED}'))).name)`),true,true]);
    c('then Who is it for? (step 1), the list of ideas put away, then the slides (step 2)', [P.q('#cs-prop').nextElementSibling.id,P.q('#cs-s2').hidden,(P.txt('#cs-s3 .cs-num')||'')],['cs-s1',true,'2']);
    c('the way back, in the card: "← Back to the need"', [P.qa('#casebody [data-cs-from]').length,P.txt('#cs-prop [data-cs-from]')],[1,'← Back to the need']);
    P.q('#cs-prop [data-cs-other]').click();
    c('"Choose a different ministry" brings the list back (step 2), and says how to keep this one', [P.q('#cs-s2').hidden,P.txt('#cs-prop [data-cs-other]')],[false,'Keep this ministry']);
    P.q('#cs-prop [data-cs-other]').click();
    c('…"Keep this ministry" puts it away again', P.q('#cs-s2').hidden, true);

    console.log('\n-- the way back keeps the need and the idea --');
    P.w.__scrolled.length=0;
    P.q('#casebody [data-cs-from]').click();
    await until(()=>P.E('TOOL')==='survey'&&P.q('#ns-sheet[open]'));
    await sleep(120);
    c('back in the Community Survey', P.E('TOOL'), 'survey');
    c('the need is open', P.q(`#u-needs [data-need="${NEED}"] .ns-head`).getAttribute('aria-expanded'), 'true');
    c('…its ideas are open', [P.q(`[data-ns-show="${NEED}"]`).getAttribute('aria-expanded'),P.q(`#ns-i-${NEED}`).hidden],['true',false]);
    c('…and the idea\'s sheet is open again', [!!P.q('#ns-sheet[open]'),P.q('#ns-sheet').dataset.idea,P.q('#ns-sheet').dataset.need],[true,IDEA,NEED]);
    c('…now saying it is in the plan', [!!P.q('#ns-sheet [data-ns-remove]'),/In your plan/.test(P.txt('#ns-sheet')||'')],[true,true]);
    c('the page was brought to the need, instantly', P.w.__scrolled.some(s=>s.need===NEED&&s.how==='auto'), true);
    c('the back line is used up', P.J('NS.back'), null);

    console.log('\n-- again: never twice in the plan --');
    P.q('#ns-sheet [data-ns-propose]').click();
    await until(()=>P.E('TOOL')==='case'&&P.q(`#cs-s2 .cs-chosen [data-lib-id="${IDEA}"]`));
    c('the plan holds it once', P.J(`uSelected().filter(x=>x===${JSON.stringify(IDEA)}).length`), 1);

    console.log('\n-- the other way back (the tool bar, then the Community Survey tile): the need open, no sheet --');
    P.E(`showHub(); openTool('survey');`); await sleep(150);
    c('the need and its ideas are open', [P.q(`#u-needs [data-need="${NEED}"] .ns-head`).getAttribute('aria-expanded'),P.q(`#ns-i-${NEED}`).hidden],['true',false]);
    c('no sheet opens by itself', !!P.q('#ns-sheet[open]'), false);
    c('the idea\'s row is marked as the last one opened', P.q(`#ns-i-${NEED} .ns-row[data-idea="${IDEA}"]`).classList.contains('ns-last'), true);

    console.log('\n-- What\'s next and Your path see it --');
    // v10.47.1: What's next is no longer drawn in the survey ("Does that even have to be there?"); uOpenProposal still opens the ministry path
    c('no What\'s next in the survey', P.qa('#u-whatsnext').length, 0);
    P.E(`uChurch().proposalPrefs={...uChurch().proposalPrefs,path:'buy'}; uPersist(); uOpenProposal(${JSON.stringify(IDEA)});`); await sleep(80);
    c('uOpenProposal opens the ministry path on this idea (as What\'s next\'s button did)', [P.E('TOOL'),P.J('casePrefs().path'),P.J('casePrefs().ministry')],['case','ministry',IDEA]);
    c('Your path counts it ("1 ministry in your plan")', P.J('hubPathSteps()[2].state'), '1 ministry in your plan');
    c('no page error along the way', P.errs, []);
  });

  console.log('\n-- a built-in idea (pantry-box under snap) --');
  await sec(async()=>{
    const P=page(); await ready(P); survey(P);
    await openSheet(P,'snap',BUILTIN);
    P.q('#ns-sheet [data-ns-propose]').click();
    await until(()=>P.E('TOOL')==='case'&&P.q(`#cs-s2 .cs-chosen [data-lib-id="${BUILTIN}"]`)); await sleep(120);
    c('chosen and in the plan', [P.J('casePrefs().ministry'),P.J(`uSelected().includes('${BUILTIN}')`)],[BUILTIN,true]);
    c('nothing saved in the library store (a built-in is in the page)', P.J(`!!(uChurch().lib&&uChurch().lib['${BUILTIN}'])`), false);
    c('its built-in card is the chosen card', !!P.q(`#cs-s2 .cs-chosen .lib-sig[data-lib-id="${BUILTIN}"]`), true);
    c('the view lands on the proposal card, which names it (v10.47.0)', [(lastScroll(P)||{}).id,P.txt('#cs-prop .cs-pt')], ['cs-prop',P.E(`gfCap(nsView('${BUILTIN}').name)`)]);
  });

  console.log('\n-- Spanish --');
  await sec(async()=>{
    const P=page({lang:'es'}); await ready(P); survey(P);
    await openSheet(P,NEED,IDEA);
    c('"Crear una propuesta para este ministerio"', P.txt('#ns-sheet [data-ns-propose]'), 'Crear una propuesta para este ministerio');
    P.q('#ns-sheet [data-ns-propose]').click();
    await until(()=>P.E('TOOL')==='case'&&P.q('#casebody [data-cs-from]'));
    c('"← Volver a la necesidad" (in the proposal card), and "Propuesta" in large letters (v10.48.0)', [P.txt('#casebody [data-cs-from]'),P.txt('#cs-prop .cs-pbig')], ['← Volver a la necesidad','Propuesta']);
  });

  console.log('\n-- the free version: no ideas, so no hand-off --');
  await sec(async()=>{
    const P=page({tier:'free'}); await ready(P); survey(P);
    await until(()=>P.q(`#u-needs [data-need="${NEED}"] .ns-head`));
    P.q(`#u-needs [data-need="${NEED}"] .ns-head`).click();
    const s=P.q(`[data-ns-show="${NEED}"]`); if(s) s.click(); await sleep(200);
    c('the need and its detail show', [P.q(`#u-needs [data-need="${NEED}"] .ns-head`).getAttribute('aria-expanded'),!!P.q(`#ns-b-${NEED} .ns-detail`)],['true',true]);
    c('the ideas show the lock, not rows', [P.qa(`#ns-i-${NEED} .ns-row`).length,!!P.q(`#ns-b-${NEED} .lock, #ns-b-${NEED} [data-lock]`)||/Full version|versión completa/i.test(P.txt(`#ns-b-${NEED}`)||'')],[0,true]);
    c('no sheet, no propose button anywhere', [!!P.q('#ns-sheet[open]'),P.qa('[data-ns-propose]').length],[false,0]);
  });
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
} })();
