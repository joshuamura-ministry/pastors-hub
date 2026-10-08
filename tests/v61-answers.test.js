// v10.61.1 — the pastor's answers to the audit's open questions (8 Oct 2026): "So keep the EVANGELISM planner in English for now yes high
// name conference for number two. We don't need to show twice. Just show the most important one skip four and five yes remove survey
// button any redundancy too like that is unnecessary. We need this app to be efficient". So: the phone header without "name ·
// conference"; each tool's name once (the page's own heading where it has one), every tool's title one size; no "← Tools" (the header's
// "Main menu" goes to the same place); one way to change church (the header's church button); one theme filter in Make the Case's step 2.
// The layout itself was measured in Chrome (Terrain-work/v78/redund.mjs: phone 390 EN + ES, computer 1366). Written failing-first on the
// audit's commit (v78/logs/ff-v61-answers.log).
const {sleep,until,checker,page,ready,survey,openNeed,openSheet}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const HTML=require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');

(async()=>{ await T.sec(async()=>{
  const P=page({needs:'file'}); await ready(P); survey(P,{}); await sleep(100);
  const dup=()=>[P.q('#toolname').classList.contains('tb-dup'),P.q('#toolbar').classList.contains('tb-empty')];

  console.log('\n-- one way to the main menu: "Main menu" (the header, and at the foot with Top); no "← Tools" --');
  c('no "← Tools" in the tool bar; the header\'s "Main menu" is there', [!!P.q('#backtools'),/id="backtools"/.test(HTML),P.txt('#brandlink')], [false,false,'Main menu']);
  c('…and it opens the main menu from a tool', (P.E(`openTool('planner')`),P.q('#brandlink').click(),[P.E('TOOL'),P.q('#hub').hidden]), [null,false]);

  console.log('\n-- each tool\'s name once: the page\'s own heading where it has one --');
  P.E(`openTool('survey')`); await sleep(30);
  c('the survey: its name in the tool bar (it has no heading of its own)', [P.txt('#toolname'),...dup()], ['Community Survey',false,false]);
  P.E(`openTool('planner')`); await sleep(30);
  c('the Planner: the same', [P.txt('#toolname'),...dup()], ['Evangelism Planner',false,false]);
  P.E(`openTool('gifts')`); await sleep(60);
  c('Spiritual Gifts: its page says "Spiritual Gifts", so the tool bar steps aside (and the empty bar with it)', [P.txt('#gifts .gfhead h2'),...dup()], ['Spiritual Gifts',true,true]);
  P.E(`openTool('compare')`); await sleep(60);
  c('Learn from other conferences: the same', [P.txt('#cmp .cmp-top h1'),...dup()], ['Learn from other conferences',true,true]);
  P.E(`openTool('churches')`); await sleep(60);
  c('Compare your churches: the same', [P.txt('#chc .chc-top h1'),...dup()], ['Compare your churches',true,true]);
  P.E(`openTool('case')`); await sleep(60);
  c('Make the Case: its name in the tool bar again (nothing left over from the tool before)', [P.txt('#toolname'),...dup()], ['Make the Case',false,false]);
  { const R=page({needs:'file'}); await ready(R); survey(R);
    const NEED=R.J(`NSM.needs[0].id`); await openNeed(R,NEED,true);
    const IDEA=R.q(`#ns-i-${NEED} .ns-row`).dataset.idea; await openSheet(R,NEED,IDEA);
    R.q('#ns-sheet [data-ns-propose]').click(); await until(()=>R.E('TOOL')==='case'&&R.q('#cs-prop')); R.E('tbSync()');
    c('the Proposal: "Proposal" in its big letters (his v10.48.0 request), once', [R.txt('#cs-prop-h'),R.q('#toolname').classList.contains('tb-dup'),R.q('#toolbar').classList.contains('tb-empty')], ['Proposal',true,true]); }
  { const S=page({lang:'es'}); await ready(S); survey(S); S.E(`openTool('gifts')`); await sleep(60);
    c('in Spanish too ("Dones espirituales")', [S.txt('#gifts .gfhead h2'),S.q('#toolname').classList.contains('tb-dup')], ['Dones espirituales',true]); }
  c('every tool\'s title one size and weight (the tool bar\'s and the pages\' own); the Proposal keeps its big letters',
    [/\.toolname,\.gfhead h2,\.chc-top h1,\.cmp-top h1\{font-family:var\(--disp\);font-size:clamp\(1\.5rem,4vw,2rem\);font-weight:700/.test(HTML),/#cs-prop \.cs-pbig\{display:block;font-family:var\(--disp\);font-weight:800;font-size:clamp\(2\.4rem,7vw,3\.6rem\)/.test(HTML)], [true,true]);

  console.log('\n-- one way to change church: the church button in the header --');
  c('the survey\'s tool-bar "Change church" and Make the Case\'s line\'s own link give way to the church button (kept only without one)',
    /body:has\(#chbtn\) #changech,body:has\(#chbtn\) \.homeline \.hl-end\{display:none!important\}/.test(HTML), true);
  c('…the church button is there, and it opens his churches with "+ Add a church"', (P.E(`showWho()`),P.q('#chbtn').click(),[!!P.q('#ch-sheet[open]'),!!P.q('#ch-sheet [data-ch-add]')]), [true,true]);

  console.log('\n-- the phone header: the church button and Change, no "name · conference" --');
  c('under 560 px: no "name · conference"; Change drawn as a person (never read as "change church" beside the church button)',
    [/@media\(max-width:560px\)\{\s*\.whoami \.whotxt\{display:none\}\s*\.whoami #regchange \.rc-t\{display:none\}\s*\.whoami #regchange \.rc-i\{display:block\}/.test(HTML),!!P.q('#regchange svg.rc-i'),P.txt('#regchange'),P.q('#regchange').getAttribute('aria-label')],
    [true,true,'Change','Change your name or conference']);
  c('…on a computer the words stay: "Sam Sample · Pennsylvania" and Change', [P.txt('#whoami .whotxt').includes(' · '),P.txt('#regchange .rc-t')], [true,'Change']);

  console.log('\n-- Make the Case, step 2: one theme filter --');
  P.E(`openTool('case'); caseSetPrefs({group:null,ministry:null}); caseMount();`); await sleep(60);
  c('before a group is chosen: "All themes" (the whole library\'s themes)', !!P.q('#cs-s2 [data-cs-browse]'), true);
  P.E(`caseChooseGroup('board')`); await sleep(120);
  c('with a group chosen: its own theme chips are the one theme filter; the search still reaches every idea', [!!P.q('#cs-s2 [data-cs-browse]'),!!P.q('#cs-q')], [false,true]);
}); T.done(); })();
