// v10.47.0 — the pastor (5 Oct 2026), two screens made simple:
//   Make the Case: "who is it for … decide … should be leadership … then Ministry departments … the three main places to propose …
//   the board, the finance, the business meeting … the elders … not the nominating committee … let's keep the Deacon and
//   Deaconesses … the top row … like the first page". (The proposal card on arrival from the survey is in v45-handoff.)
//   Community Survey: "focus everything show everything … erase all that and then the census track area … we just need to know
//   which church … neighborhood town and County … right above the brief … nice and clean". Written failing-first on v10.46.1.
const fs=require('fs'), path=require('path');
const {ROOT,sleep,checker,page,ready,survey}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const HTML=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');

(async()=>{ await T.sec(async()=>{
  console.log('\n-- Make the Case · Who is it for? --');
  const P=page(); await ready(P); survey(P); P.E(`openTool('case')`); await sleep(80);
  const cats=()=>P.qa('#cs-s1 .cs-acat').map(b=>[b.textContent,b.getAttribute('aria-expanded')]), shown=()=>P.qa('#cs-s1 .cs-aud').filter(x=>!x.hidden).map(x=>x.dataset.csSec);
  c('four buttons across the top: Leadership, Ministry departments, On Sabbath, The conference; Leadership open', [cats(),shown()],
    [[['Leadership','true'],['Ministry departments','false'],['On Sabbath','false'],['The conference','false']],['decide']]);
  c('Leadership: the church board, finance, the business meeting, the elders, the deacons', P.qa('#cs-asec-decide [data-cs-group]').map(b=>b.dataset.csGroup), ['board','finance','business','elders','deacons']);
  c('the nominating committee is no longer under Leadership (Ministry departments › Other committees)', [P.qa('#cs-asec-decide [data-cs-group="nominating"]').length,P.qa('#cs-asec-teams [data-cs-group="nominating"]').length], [0,1]);
  P.q('#cs-s1 [data-cs-asec="teams"]').click();
  c('Ministry departments: its groups show, the others are put away', [cats().map(x=>x[1]),shown()], [['false','true','false','false'],['teams']]);
  P.q('#cs-s1 [data-cs-group="pathfinders"]').click(); await sleep(30); P.E('caseDraw1()');
  c('with a group chosen, its section is the one open when drawn again', shown(), ['teams']);
  P.E(`CASE_ST.audSec=null; caseSetPrefs({group:'congregation',type:'congregation'}); caseDraw1()`);
  c('…the whole church: On Sabbath open', shown(), ['sabbath']);
  c('each button names the section it opens; each section keeps its colour', P.qa('#cs-s1 .cs-acat').every(b=>{ const s=P.q('#'+b.getAttribute('aria-controls')); return s&&s.dataset.csSec===b.dataset.csAsec&&b.getAttribute('style')===s.getAttribute('style'); }), true);
  const S=page({lang:'es'}); await ready(S); survey(S); S.E(`openTool('case')`); await sleep(80);
  // v10.61.0 (the audit): "Departamentos", one line on a phone (was "Departamentos de ministerio")
  c('in Spanish', S.qa('#cs-s1 .cs-acat').map(b=>b.textContent), ['Liderazgo','Departamentos','En sábado','La asociación']);

  console.log('\n-- v10.48.0: the Proposal page (from "Create a proposal for this ministry") --');
  // "I don't like make the case I just want it to [say] proposal … big letters above that says proposal … this beautiful thing should
  // be what you see … then … who are you proposing to … the church board … the business session … the finance committee … do we
  // need all the others" — the elders kept ("keep"), the schools left out ("we're focusing on the churches").
  { const {openSheet,openNeed}=require('./v45-helpers.js');
    const R=page({needs:'file'}); await ready(R); survey(R);
    const NEED=R.J(`NSM.needs[0].id`);
    await openNeed(R,NEED,true);
    const IDEA=R.q(`#ns-i-${NEED} .ns-row`).dataset.idea;
    await openSheet(R,NEED,IDEA);
    R.E(`uChurch().proposalPrefs={...uChurch().proposalPrefs,group:'pathfinders',type:'team'}; uPersist();`);
    R.q('#ns-sheet [data-ns-propose]').click();
    const {until}=require('./v45-helpers.js'); await until(()=>R.E('TOOL')==='case'&&R.q('#cs-prop'));
    c('the tool bar says "Proposal", not "Make the Case"', R.txt('#toolname'), 'Proposal');
    c('"Proposal" in large letters first, then the idea as its sheet shows it: the need, the name, the lift, why here, what it needs', [R.txt('#cs-prop .cs-pbig'),!!R.q('#cs-prop .cs-pneed'),!!R.q('#cs-prop .cs-pt'),!!R.q('#cs-prop .ns-liftline'),R.qa('#cs-prop .ns-block h3').map(h=>h.textContent).filter(t=>/Why here|What it needs/.test(t)).length], ['Proposal',true,true,true,2]);
    c('the one-page PDF, the way back and another ministry are on it', [!!R.q('#cs-prop [data-cs-pdf]'),!!R.q('#cs-prop [data-cs-from]'),!!R.q('#cs-prop [data-cs-other]')], [true,true,true]);
    c('"Who are you proposing to?": the church board, finance, the business meeting, the elders, and no one else', [R.txt('#cs-s1 h3').replace(/^Step \d of 3: /,''),R.qa('#cs-s1 [data-cs-group]').map(b=>b.dataset.csGroup),R.qa('#cs-s1 .cs-acat').length], ['Who are you proposing to?',['board','finance','business','elders'],0]);
    c('a group chosen before that is not one of the four (Pathfinders) is not kept', [R.J('casePrefs().group'),R.qa('#cs-s1 .cs-atile.on').length], [null,0]);
    R.q('#cs-s1 [data-cs-group="finance"]').click(); await sleep(40);
    c('tapping the finance committee chooses it', [R.J('casePrefs().group'),R.q('#cs-s1 [data-cs-group="finance"]').classList.contains('on')], ['finance',true]);
    R.q('#cs-prop [data-cs-other]').click(); await sleep(40);
    c('"Choose a different ministry": the full list of groups comes back with the list of ideas', R.qa('#cs-s1 .cs-acat').length, 4);
    R.q('#cs-prop [data-cs-other]').click(); await sleep(40);
    R.E(`showHub(); openTool('case')`); await sleep(40);
    c('Make the Case from the main menu with another ministry chosen is Make the Case again', (R.E(`caseSetPrefs({ministry:'vbs'}); caseMount(); 1`),R.txt('#toolname')), 'Make the Case');
    // v10.49.0 — "take the money part out of your church section … add it in the proposal section", then "we don't wanna add a
    // place to fill in anything … just … mention how much money they will need not versus available funds"
    R.E(`caseSetPrefs({ministry:NS.back.plan}); caseMount();`);
    // the Proposal page states the money in its "What it needs from our church" box (To start, Each month); nothing to fill in
    c('the proposal states what the ministry needs (To start, Each month), nothing to fill in, no comparison', [R.qa('#cs-prop .ns-gi dt').map(x=>x.textContent).filter(t=>/^(To start|Each month|In all)$/.test(t)).length>=1,R.qa('#cs-prop input').length,/Covered|Short by|has for it/.test(R.txt('#cs-prop'))], [true,0,false]);
    R.E(`CASE_ST.propList=true; caseMount();`); await sleep(20);
    R.E(`NS.back=null; caseMount();`); await sleep(20);
    c('Make the Case itself (not the proposal view): the Money box at the foot of step 2, its sums, nothing to fill in', [!!R.q('#cs-s2 #cs-money .cs-money'),R.qa('#cs-money input').length,/\$\d|No money needed/.test(R.txt('#cs-money')||'')], [true,0,true]);
    c('…and the slides compare nothing with funds (no "Left after this")', R.E(`(()=>{ const d=caseDeck(caseModel(casePrefs().ministry,{type:'board',group:'board'})); const a=d.slides.find(s=>s.type==='ask'); return !!(a&&a.rows.some(r=>r[0]==='Left after this')); })()`), false);
    c('no page error', R.errs, []); }

  console.log('\n-- v10.49.0: "Your church" without money; the room boxes in their place --');
  { const Y=page(); await ready(Y); survey(Y); Y.E(`openTool('gifts')`); await sleep(60);
    // v10.56.2 (stale, not a regression): and "At a glance", the summary as the slider's last page
    c('three steps: Your church, Your building, Skills (Money moved to the proposal), then At a glance', Y.qa('#u-steps-nav li span').map(x=>x.textContent), ['Your church','Your building','Skills','At a glance']);
    c('no money boxes in the form, and no Money group in the summary', [Y.qa('#u-cap-form [name="startupBudget"],#u-cap-form [name="monthlyBudget"],#u-cap-form [name="pendingBudget"]').length,/Startup funds|Monthly funds/.test(Y.txt('#capsumslot')||'')], [0,false]);
    c('what the church has holds no money any more (capMerged reads none)', [Y.J('capMerged().startup'),Y.J('capMerged().monthly')], [null,null]);
    // v10.55.0: the card's note, under its heading (the card is the survey's "Your church" now)
    c('the description says where the money is now', Y.txt('#gf-church > summary .note'), 'The money for a ministry is on its proposal.');
    c('the room boxes: the checkbox, the name and the + inside each box (the legend floats inside its fieldset)', /\.u-facilities>fieldset>legend\{float:left;width:100%/.test(HTML), true); }

  console.log('\n-- the Community Survey\'s top: the church, then Neighborhood · Town · County on the Brief --');
  const Q=page(); await ready(Q); survey(Q); await sleep(60);
  c('the first line is the church: its name and its address, no census tract', [Q.txt('#place'),/Census Tract|Tract /.test(Q.txt('#place'))], ['Bucks County SDA · '+Q.E('homeAddr(DATA.geo.matched)'),false]);
  c('then Neighborhood · Town · County, then the Brief', [Q.q('#place').nextElementSibling.id,Q.qa('#scope button').length,!!Q.q('#brief .k')], ['scope',3,true]);
  c('Focus and its "Showing everything" line are not shown', /#focusbar,#focusnote\{display:none!important\}/.test(HTML), true);
  c('…and with nothing chosen everything shows (no section hidden by Focus)', Q.qa('#sections section.blk.hidden').length, 0);

  console.log('\n-- v10.47.1: the needs, a place of their own; "Main menu" beside "Top" --');
  // "This is a whole new kind of a section … There's gotta be a title there … that will let people know that this is a clickable area"
  c('the needs open with a framed panel: a label, the heading, one line saying what to do, the verse', [Q.txt('#u-needs .ns-hero .ns-eyebrow'),Q.txt('#u-needs .ns-hero > h2'),Q.txt('#u-needs .ns-hero .ns-lead'),!!Q.q('#u-needs .ns-hero .verse')],
    ['From survey to ministry','Neighborhood needs','Tap a need and plant the seed.',true]);   // v10.50.0 — the pastor (6 Oct 2026): "Neighborhood needs", "tap the need and plant the seed"
  const QS=page({lang:'es'}); await ready(QS); survey(QS); await sleep(40);
  c('…in Spanish', [QS.txt('#u-needs .ns-hero .ns-eyebrow'),QS.txt('#u-needs .ns-hero .ns-lead')], ['De la encuesta al ministerio','Toque una necesidad y siembre la semilla.']);
  c('no "What\'s next" at the bottom of the survey ("Does that even have to be there?")', Q.qa('#u-whatsnext').length, 0);
  // "I like the top … at the bottom … keep that and then also … main menu which will bring you to the main menu"
  Q.q('#totop').hidden=false; Q.E('floatMenu()');
  c('in a tool, with "↑ Top": a "Main menu" button beside it', [Q.q('#tomenu').hidden,Q.txt('#tomenu span:last-child')], [false,'Main menu']);
  Q.q('#tomenu').click(); await sleep(30);
  c('…which goes to the main menu', [!Q.q('#hub').hidden,Q.q('#tomenu').hidden], [true,true]);
  Q.q('#totop').hidden=false; Q.E('floatMenu()');
  c('on the main menu itself it is not shown', Q.q('#tomenu').hidden, true);
  QS.q('#totop').hidden=false; QS.E('floatMenu()');
  c('…in Spanish: "Menú principal"', QS.txt('#tomenu span:last-child'), 'Menú principal');

  console.log('\n-- v10.50.0: the needs, their colours and the resources --');
  // "the categories should be much bolder … same color as the 1 2 3 … glowing"; "instead of having it all shades of … pink use … different colors"
  c('each kind of need its own colour (the newer kinds too): the card\'s --k by its category', Q.E(`(()=>{ const t=(c,k)=>nsHue({catLabel:c,kind:k}); return [t('Veterans','people'),t('Work & schedules','people'),t('Young adults','people'),t('Seniors & isolation','children'),t('Families with children','children'),t('Housing pressure','housing')].join(','); })()`), 'veterans,work,young,seniors,children,housing');
  c('…each of those colours defined for both themes', ['seniors','veterans','work','young','income','divided'].every(k=>(HTML.match(new RegExp('--m-'+k+':#','g'))||[]).length>=2), true);
  c('the category is the boldest line of the card: the number\'s colour, a glow', /\.ns-need \.ns-cat\{[^}]*font-weight:800;[^}]*color:var\(--k\);text-shadow:/.test(HTML), true);
  c('Community resources in two columns on a computer', /#helpslot\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(HTML), true);

  console.log('\n-- v10.50.0: Spiritual Gifts, in three steps --');
  { const G=page(); await ready(G); survey(G); G.E(`openTool('gifts'); GF_VIEW='roster'; gfRender();`); await sleep(40);
    // v10.55.0 — the pastor: "you can remove the … fill-in information in the spiritual gifts … that's all it's gonna be about just spiritual
    // gifts": two steps; "Your church" is the survey's
    // v10.56.2 (stale, not a regression): the pastor, "a three invite your members see the results and then one more step like fill the position"
    c('three steps at the top: Invite your members → See the results → Fill the positions', G.qa('#giftbody .gfsteps .gfstep span').map(x=>x.textContent), ['Invite your members','See the results','Fill the positions']);
    // v10.61.0 (the audit): step 1 is "Invite your members" (the page's own name no longer repeated in it)
    c('…then the invitation (1), the results (2) with the sample report under them; no church card', [G.q('.gfsteps').nextElementSibling.id,G.txt('#gf-invite .gfpart-h'),G.txt('#gf-results .gfpart-h'),G.q('#gf-results .gfresults')&&(G.q('#gf-results .gfresults').nextElementSibling||{}).id||null,!!G.q('#gifts #gf-church')], ['gf-invite','1Invite your members','2See the results',null,false]);   // v10.56.2 (stale): the sample report only with the demo ("if you click complete a demo … then the sample report will show")
    c('no "Nobody has taken it yet" card, and no code box', [G.qa('#giftbody [data-gf-first]').length,G.qa('#gfpaste,#gfadd').length], [0,0]);
    G.q('[data-gf-step="invite"]').click();
    c('the first step goes to the invitation', G.w.__scrolled.slice(-1)[0].id, 'gf-invite');
    G.q('[data-gf-step="results"]').click();
    c('the second goes to the results', G.w.__scrolled.slice(-1)[0].id, 'gf-results');
    const GS=page({lang:'es'}); await ready(GS); survey(GS); GS.E(`openTool('gifts'); GF_VIEW='roster'; gfRender();`); await sleep(40);
    c('…in Spanish', GS.qa('#giftbody .gfsteps .gfstep span').map(x=>x.textContent), ['Invite a sus miembros','Vea los resultados','Llene los puestos']);
    c('no page error', [G.errs,GS.errs], [[],[]]); }
  c('no page error', [P.errs,S.errs,Q.errs,QS.errs], [[],[],[],[]]);
}); T.done(); })();
