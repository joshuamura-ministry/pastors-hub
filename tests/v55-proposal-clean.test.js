// v10.55.0 — the Proposal page, cleaner. The pastor (6 Oct 2026), having sent an idea from a need to "the make the case or the proposal
// area": "I click CHURCH board it jumps down really doesn't have to jump down right cause it's just one line … because you're already
// choosing light lift moderate lift heavy lift we don't have to put it again there … and what would you like this to accomplish? We don't
// need that either because it's already understood … still have to settle before you present … short by 10 volunteers short by 2 L short
// by 82 volunteer hours … that is the reason … because the spiritual gifts and information hasn't been put in yet, right".
// Written failing-first on v10.55.0's first commit.
const {sleep,until,checker,page,ready,survey,openNeed,FX}=require('./v45-helpers.js');
const T=checker(), c=T.c;

(async()=>{ await T.sec(async()=>{
  const P=page({needs:'file'}); await ready(P);
  survey(P); await sleep(150);
  await openNeed(P,'snap',true);
  const idea=P.q('#ns-i-snap .ns-row').dataset.idea;
  P.q('#ns-i-snap .ns-row').click(); await until(()=>P.q('#ns-sheet[open]'),4000);
  P.q('#ns-sheet [data-ns-propose]').click(); await until(()=>P.E('TOOL')==='case'&&P.E('casePropMode()'),6000); await sleep(150);
  c('on the Proposal page (sent from a need)', [P.E('casePropMode()'),P.J('casePrefs().ministry')], [true,idea]);

  console.log('\n-- under the proposal, before "Who are you proposing to?": what is missing --');
  // the pastor: "maybe there can be a button under the proposal box before who are you proposing to just to remind … must fill in … the
  // spiritual gifts and church information"
  c('both reminders, under the proposal card and before step 1', [!!P.q('#cs-prop .cs-nudge'),P.q('#cs-prop .cs-nudge').previousElementSibling.classList.contains('cs-pcard'),
    P.qa('#cs-prop .cs-nudge button').map(b=>b.textContent)], [true,true,['Fill in Your church','Send the Spiritual Gifts survey']]);
  c('…in words', /Fill in your church first, so this proposal shows what your church can do\./.test(P.txt('#cs-prop .cs-nudge'))&&/A proposal is stronger with your members’ Spiritual Gifts results\./.test(P.txt('#cs-prop .cs-nudge')), true);

  console.log('\n-- choosing who it is for: no jump --');
  P.w.__scrolled.length=0;
  P.q('#cs-s1 [data-cs-group="board"]').click(); await sleep(150);
  c('the church board chosen; the page does not move to the slides', [P.J('casePrefs().group'),P.w.__scrolled.filter(s=>s.id==='cs-s3'||s.id==='cs-s2').length], ['board',0]);

  console.log('\n-- no Size, no goal box on the Proposal page --');
  c('no Light / Moderate / Heavy row (the lift was chosen with the idea)', !!P.q('#cs-s3 #cs-size'), false);
  c('no "What would you like this to accomplish?" (the need says it)', !!P.q('#cs-s3 #cs-goal'), false);
  c('…the slides still carry the suggested goal', typeof P.J(`(CASE_ST.deck.slides.find(s=>s.goal)||{}).goal`)==='string', true);

  console.log('\n-- an empty "Your church": one line and the way there --');
  const w=P.q('#cs-s3 .cs-warn');
  c('one line, not a list of shortfalls', [!!(w&&w.classList.contains('cs-fillchurch')),w?w.querySelectorAll('li').length:-1,/Fill in “Your church” in the Community Survey, just before the neighborhood’s needs/.test(w?w.textContent:'')], [true,0,true]);
  P.q('#cs-s3 [data-cs-church]').click(); await sleep(150);
  c('"Open Your church": the survey\'s Your church, open', [P.E('TOOL'),!!(P.q('#u-church #gf-church')&&P.q('#gf-church').open)], ['survey',true]);

  console.log('\n-- the survey\'s "Your church": its Spiritual Gifts line and button --');
  c('the line says to send the survey first, with the count', [/Proposals are strongest once your members’ Spiritual Gifts results are in/.test(P.txt('#u-gfnote')),P.txt('#u-gfnote .u-gfcount')], [true,'No results yet.']);
  P.q('#u-gfnote [data-u-gifts]').click(); await sleep(200);
  c('…its button opens the Spiritual Gifts invitation', [P.E('TOOL'),P.E('GF_VIEW')], ['gifts','setup']);
  P.E(`openTool('case')`); await sleep(100);

  console.log('\n-- with "Your church" filled in: the real list --');
  P.E(`(()=>{ capSave(${JSON.stringify(FX.MEDIUM)}); openTool('case'); caseDraw3(); })()`); await sleep(150);
  c('the fill-in line is gone; what is short (if anything) is listed', [!!P.q('#cs-s3 .cs-fillchurch')], [false]);
  P.E(`caseMount()`); await sleep(80);
  c('…and the proposal\'s church reminder is gone (the gifts one stays until results come in)', P.qa('#cs-prop .cs-nudge button').map(b=>b.textContent), ['Send the Spiritual Gifts survey']);

  console.log('\n-- Make the Case on its own keeps both --');
  P.E(`(()=>{ NS.back=null; try{ sessionStorage.removeItem('terrain-ns-back'); }catch(e){} caseDraw3(); })()`); await sleep(120);
  c('Size and the goal box are back when it is not the Proposal page', [P.E('casePropMode()'),!!P.q('#cs-s3 #cs-size'),!!P.q('#cs-s3 #cs-goal')], [false,true,true]);
  P.w.__scrolled.length=0;
  P.q('#cs-s1 [data-cs-group="finance"]').click(); await sleep(150);
  c('…and choosing a group there still brings its list into view', P.w.__scrolled.some(s=>s.id==='cs-s2'), true);
  c('no page errors', P.errs, []);
}); T.done(); })();
