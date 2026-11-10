// v10.73.0 — Make the Case, one step at a time. The pastor (9 Nov 2026): "when I click a Ministry a project or purchase, it jumps down
// every time … a project or purchase should not be together … there should be make the case for a Ministry, two a project or three a
// purchase … click save … it jumps to three options … I don't like that kind of switching … every time I finish it you just pretty much
// will press done and once you're done it scrolls left like the other ones. This is much cleaner instead of hopping down." Here: three
// choices at the top (A ministry · A project · A purchase); one step on screen in both paths (the sections keep their ids, wrapped in
// .cs-panes; the current pane .on, the others inert and unseen), a Back · "Step n of m" · Done row under them; the step bar slides, never
// scrolls; nothing scrolls by itself on a group, an idea, an audience or the switch; the tool opens on the first unfinished step; the
// Proposal view from a need the same. Written failing-first on v10.72.1.
const {sleep,until,checker,page,ready,survey,FX}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const BAD=/\bAI\b|\bIA\b/;
const html=require('fs').readFileSync(require('path').resolve(__dirname,'..','index.html'),'utf8');
const panes=(P,box)=>P.qa(`#${box} > .cs-step:not([hidden])`).map(s=>s.id);
const on=(P,box)=>P.qa(`#${box} > .cs-step.on`).map(s=>s.id);
const inert=(P,box)=>P.qa(`#${box} > .cs-step:not(.on)`).map(s=>[s.id,s.hasAttribute('inert'),s.getAttribute('aria-hidden')]);
const nav=(P,id)=>({back:P.txt(`#${id} [data-cs-back]`),n:P.txt(`#${id} .cs-navn`),done:P.txt(`#${id} [data-cs-done]`)});
const scrolledTo=(P,id)=>P.w.__scrolled.filter(s=>s.id===id).length;
const view=(P,bar)=>P.qa(`#${bar} .cs-st`).findIndex(b=>b.classList.contains('view'));

(async()=>{ await T.sec(async()=>{
  console.log('\n-- the top: three choices --');
  const P=page(); await ready(P); survey(P); await sleep(60); P.E(`capSave(${JSON.stringify(FX.MEDIUM)})`);
  P.E(`openTool('case')`); await sleep(120);
  c('Make the case for: A ministry · A project · A purchase (the ministry pressed)', [P.txt('#cs-switch .bx-swl'),P.qa('#cs-switch [data-bx-path]').map(b=>[b.dataset.bxPath,b.textContent,b.getAttribute('aria-pressed')])],
    ['Make the case for:',[['ministry','A ministry','true'],['project','A project','false'],['buy','A purchase','false']]]);
  console.log('\n-- the ministry path: one step on screen --');
  c('the bar, then the panes box, then the nav row, then the close', P.qa('#casebody > *').map(e=>e.id||e.className).filter(id=>id!=='cs-gff').slice(0,4), ['cs-bar','cs-panes','cs-nav','cs-close']);
  c('the three steps keep their ids inside the panes box; step 1 is on, the other two inert and hidden from readers', [panes(P,'cs-panes'),on(P,'cs-panes'),inert(P,'cs-panes')],
    [['cs-s1','cs-s2','cs-s3'],['cs-s1'],[['cs-s2',true,'true'],['cs-s3',true,'true']]]);
  c('the nav row: no Back on the first step, "Step 1 of 3", Done', nav(P,'cs-nav'), {back:null,n:'Step 1 of 3',done:'Done'});
  c('the step bar marks the viewed step', view(P,'cs-bar'), 0);
  P.w.__scrolled.length=0;
  P.q('#cs-s1 [data-cs-group="board"]').click(); await sleep(60);
  c('a group tapped: the list draws for it, the page does NOT move, step 1 stays on screen', [P.J('casePrefs().group'),scrolledTo(P,'cs-s2'),on(P,'cs-panes')], ['board',0,['cs-s1']]);
  P.q('#cs-nav [data-cs-done]').click(); await sleep(40);
  c('Done: step 2 slides in from the right; Back and Done; "Step 2 of 3"', [on(P,'cs-panes'),P.q('#cs-s2').classList.contains('cs-in-r'),nav(P,'cs-nav'),view(P,'cs-bar')], [['cs-s2'],true,{back:'← Back',n:'Step 2 of 3',done:'Done'},1]);
  P.w.__scrolled.length=0;
  const pick=P.J('uCatalog()[0].id'); P.E(`caseChoose(${JSON.stringify(pick)})`); await sleep(80);
  c('an idea chosen: the slides draw, the page does NOT move, step 2 stays on screen', [P.J('casePrefs().ministry'),scrolledTo(P,'cs-s3')+scrolledTo(P,'cs-s1'),on(P,'cs-panes')], [pick,0,['cs-s2']]);
  P.q('#cs-nav [data-cs-done]').click(); await sleep(40);
  c('Done again: the slides; no Done on the last step', [on(P,'cs-panes'),nav(P,'cs-nav')], [['cs-s3'],{back:'← Back',n:'Step 3 of 3',done:null}]);
  P.q('#cs-nav [data-cs-back]').click(); await sleep(40);
  c('Back: step 2 slides in from the left', [on(P,'cs-panes'),P.q('#cs-s2').classList.contains('cs-in-l')], [['cs-s2'],true]);
  P.w.__scrolled.length=0; P.q('#cs-bar [data-cs-jump="1"]').click(); await sleep(40);
  c('the step bar slides to its step, never scrolls', [on(P,'cs-panes'),scrolledTo(P,'cs-s1'),view(P,'cs-bar')], [['cs-s1'],0,0]);
  P.E(`openTool('survey')`); await sleep(40); P.E(`openTool('case')`); await sleep(120);
  c('opened again with a group and an idea chosen: it lands on the slides (the first unfinished step is the last)', on(P,'cs-panes'), ['cs-s3']);
  c('no scroll written into the group, idea or switch handlers', [/scrollIntoView/.test(P.E('caseChooseGroup.toString()')),/scrollIntoView/.test(P.E('caseChoose.toString()')),/scrollIntoView/.test(P.E('buySwitchWire.toString()')),/scrollIntoView/.test(P.E('buyDraw4.toString()'))], [false,false,false,false]);
  console.log('\n-- a purchase --');
  P.w.__scrolled.length=0; P.q('#cs-switch [data-bx-path="buy"]').click(); await sleep(120);
  c('the switch does not move the page; the five steps are panes, step 1 on; "Step 1 of 5"', [scrolledTo(P,'cs-switch'),panes(P,'bx-panes'),on(P,'bx-panes'),nav(P,'bx-nav')], [0,['bx-s1','bx-s2','bx-s3','bx-s4','bx-s5'],['bx-s1'],{back:null,n:'Step 1 of 5',done:'Done'}]);
  c('a purchase offers eight kinds of need (no "Building repair": nothing to buy there)', P.qa('#bx-s1 [data-bx-cat]').map(b=>b.textContent), ['Sound','Livestream & video','Lighting','Computer & projector','Music instruments','Kitchen','Vehicle','Something else']);
  P.q('#bx-s1 [data-bx-cat="kitchen"]').click(); await sleep(60);
  const kid=P.J('BUY_ST.id');
  c('Kitchen tapped: a purchase (kind buy), and no "what kind of work" row (a purchase is bought)', [P.J(`buyGet(${JSON.stringify(kid)}).kind`),P.qa('#bx-s1 [data-bx-kind]').length,P.J('buyWay()'),P.J('buyPath()')], ['buy',0,'purchase','buy']);
  P.q('#bx-nav [data-cs-done]').click(); await sleep(40);
  c('Done: Three options on screen, step 1 inert', [on(P,'bx-panes'),inert(P,'bx-panes').find(x=>x[0]==='bx-s1')], [['bx-s2'],['bx-s1',true,'true']]);
  console.log('\n-- a project --');
  P.q('#cs-switch [data-bx-path="project"]').click(); await sleep(120);
  c('stored as "project"; buyPath() still says buy (every older reader unchanged); the purchase is not in this list: + New alone', [P.J('uChurch().proposalPrefs.path'),P.J('buyPath()'),P.J('buyWay()'),P.qa('#bx-items [data-bx-item]').map(b=>b.textContent.trim())], ['project','buy','project',['+ New']]);
  c('a project offers all nine kinds of need, Building repair among them', P.qa('#bx-s1 [data-bx-cat]').length, 9);
  P.q('#bx-s1 [data-bx-cat="kitchen"]').click(); await sleep(60);
  c('Kitchen as a project: a repair by default, the row offers Repair or install · Build or add on, never Buy it', [P.J('buyCur().kind'),P.qa('#bx-s1 [data-bx-kind]').map(b=>b.textContent)], ['repair',['Repair or install','Build or add on']]);
  P.q('#bx-s1 [data-bx-cat="building"]').click(); await sleep(60);
  c('Building repair keeps the repair', P.J('buyCur().kind'), 'repair');
  P.q('#cs-switch [data-bx-path="buy"]').click(); await sleep(120);
  c('back to purchases: the kitchen purchase is listed and current again', [P.J('BUY_ST.id'),P.qa('#bx-items [data-bx-item]').length], [kid,2]);
  console.log('\n-- the Proposal view from a need --');
  P.q('#cs-switch [data-bx-path="ministry"]').click(); await sleep(80);
  P.E(`NS.back={need:'x-need',idea:${JSON.stringify(pick)},plan:${JSON.stringify(pick)}}; caseSetPrefs({ministry:${JSON.stringify(pick)},group:'board',type:'board'}); CASE_ST.propList=false; CASE_ST.pane=null; caseMount();`); await sleep(80);
  c('the proposal card, then two panes (Who is it for?, Your slides), landing on the slides (the group is chosen)', [P.J('casePropMode()'),panes(P,'cs-panes'),on(P,'cs-panes'),nav(P,'cs-nav')], [true,['cs-s1','cs-s3'],['cs-s3'],{back:'← Back',n:'Step 2 of 2',done:null}]);
  P.w.__scrolled.length=0; P.q('[data-cs-other]').click(); await sleep(80);
  c('"Choose a different ministry": the list becomes the second pane and slides in; no scroll', [panes(P,'cs-panes'),on(P,'cs-panes'),scrolledTo(P,'cs-s2'),P.txt('#cs-nav .cs-navn')], [['cs-s1','cs-s2','cs-s3'],['cs-s2'],0,'Step 2 of 3']);
  P.E('NS.back=null;');
  console.log('\n-- the look, Spanish, nothing else --');
  c('the panes box clips sideways motion and keeps the hidden panes laid out but unseen; reduced motion stills the slide; print shows every pane', [/\.cs-panes\{[^}]*overflow:hidden/.test(html),/\.cs-pane:not\(\.on\)\{[^}]*position:absolute[^}]*visibility:hidden/.test(html),/prefers-reduced-motion:reduce\)\{[^}]*\.cs-pane\.cs-in-r[^}]*animation:none/.test(html),/@media print\{[^}]*\.cs-nav\{display:none/.test(html)], [true,true,true,true]);
  c('three tabs across', /\.cs-tabs\.bx-tabs\{[^}]*repeat\(3,/.test(html), true);
  const S=page({lang:'es'}); await ready(S); survey(S); await sleep(60); S.E(`capSave(${JSON.stringify(FX.MEDIUM)})`); S.E(`openTool('case')`); await sleep(120);
  c('Spanish: the three choices, the nav row', [S.qa('#cs-switch [data-bx-path]').map(b=>b.textContent),nav(S,'cs-nav')], [['Un ministerio','Un proyecto','Una compra'],{back:null,n:'Paso 1 de 3',done:'Hecho'}]);
  S.q('#cs-nav [data-cs-done]').click(); await sleep(40);
  c('…Atrás', nav(S,'cs-nav'), {back:'← Atrás',n:'Paso 2 de 3',done:'Hecho'});
  c('no "AI" in Make the Case', BAD.test(P.txt('#casebody')+' '+P.txt('#cs-switch')), false);
  c('no page errors', [P.errs,S.errs], [[],[]]);
}); T.done(); })();
