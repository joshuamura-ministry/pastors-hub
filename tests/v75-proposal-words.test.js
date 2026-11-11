// v10.75.0 — Proposal: the name everywhere, a title and a line on every page, the three choices defined; the page turn, one
// highlight on the step bar, the projects row hidden until a project has a name. The pastor (10–11 Nov 2026): "instead of make the
// case I would like it to have be called proposal and each page has to have a nice title with a description of what the page
// actually does … I just have to define those three … someone who doesn't know the app who comes for the first time is gonna be
// totally lost"; and "it always drops down to this part when I click the five options … one of them stays highlighted pink, no
// matter what I press and I don't know what this new project". Design: ~/Ministry Work/Terrain-work/v90/DESIGN-PROPOSAL-WORDS.md.
// Written failing-first against v10.74.0.
const fs=require('fs'), path=require('path');
const {FX,checker,page,ready,until,sleep}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const HTML=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const AI=/\bAI\b|\bIA\b/;
function survey(P,pathK){ P.E(`(()=>{ DATA=${JSON.stringify(FX.DATA)}; SCOPE='tract'; CAP=null; const ch=uChurch(); ch.name='Bucks County SDA'; ch.capacity={}; ch.selected=[]; ch.lib={}; ch.proposalPrefs={path:${JSON.stringify(pathK||'ministry')}}; uPersist(); openTool('survey'); render(); capSave(${JSON.stringify(FX.MEDIUM)}); })()`); }
const tx=(P,s)=>{ const e=typeof P.q==='function'?P.q(s):P.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; };   // a page, or an element

(async()=>{ await T.sec(async()=>{
  const P=page(); await ready(P);
  console.log('\n-- the name: Proposal --');
  c('the main menu\'s tile: Proposal, and what it is for (inside the menu\'s 60-character line)', [tx(P,'.tool[data-tool="case"] b'),tx(P,'.tool[data-tool="case"] .td'),(tx(P,'.tool[data-tool="case"] .td')||'').length<=60], ['Proposal','Ministries, projects and purchases, ready for a vote.',true]);
  c('the tool\'s name and the full version\'s words', [P.J('TOOLS.case.name'),P.J('FEATURES.case.name'),P.J('FEATURES.case.es.name'),P.J('PR_UI.back.en'),P.J('NEXT_UI.caseH.en'),P.J('NEXT_UI.s3.en')], ['Proposal','Proposal','Propuesta','Back to Proposal','Proposal','Proposal']);
  c('never "Make the Case" or "Presentar el caso" in a string a person reads (the notes keep the old name)', (()=>{ const bad=[]; let inBlock=false;
    HTML.split('\n').forEach((l,i)=>{ let t=l;
      if(inBlock){ const e=t.indexOf('*/'); if(e<0) return; t=t.slice(e+2); inBlock=false; }
      t=t.replace(/\/\*[\s\S]*?\*\//g,''); const o=t.indexOf('/*'); if(o>=0){ t=t.slice(0,o); inBlock=true; }
      t=t.replace(/\/\/.*$/,'');
      if(/['"`][^'"`]*\b(Make the [Cc]ase|Presentar el caso)\b[^'"`]*['"`]/.test(t)) bad.push(i+1); }); return bad; })(), []);

  console.log('\n-- the tool: a title, a line, the three choices defined --');
  survey(P); P.E(`openTool('case')`); await sleep(120);
  c('the tool bar\'s own name steps aside for the page\'s title', [tx(P,'#cs-prop-h'),P.q('#toolname').classList.contains('tb-dup')], ['Proposal',true]);
  c('one line under the title', tx(P,'#cs-switch .cs-lead'), 'Turn an idea into a plan your church can vote on, with the slides and papers to present it.');
  c('the question, and the three choices each with a line', [tx(P,'#bx-swl'),P.qa('[data-bx-path]').map(b=>[tx(b,'b'),tx(b,'small')])],
    ['What is this proposal for?',[['A ministry','Something we do for people: a food pantry, a homework club, a health fair.'],['A project','Work on the building or the grounds: a repair, an installation, a build.'],['A purchase','Something we buy: sound, a camera, a van, chairs.']]]);
  c('how it works, under the choices: three steps for a ministry', tx(P,'#cs-switch .cs-how'), 'Three steps, one at a time. Press Done when a step is finished.');
  c('step 2 of a ministry says what to do there', P.J(`CASE_STEP_UI.n2.en`), 'Choose the ministry you will propose. Tap one to pick it.');
  P.q('[data-bx-path="project"]').click(); await sleep(120);
  c('a project: five steps', [tx(P,'#cs-switch .cs-how'),P.q('[data-bx-path="project"]').classList.contains('on')], ['Five steps, one at a time. Press Done when a step is finished.',true]);
  c('each step\'s line says what to do there', [1,2,3,4,5].map(n=>P.J(`BUY_UI.n${n}.en`)),
    ['Name it, say why it matters, and who will look after it.','Three prices, good, better and best; pick one and say why.','Where the money will come from, and how much from each. Never tithe.','Who has to say yes, and who you will present to.','Check the slides, then present; print the handout and the Proposal to vote on.']);
  c('…drawn under the step\'s title', tx(P,'#bx-s1 .cs-sh .note'), 'Name it, say why it matters, and who will look after it.');

  console.log('\n-- one highlight: the step he is on --');
  c('no style for the "next thing to do" marker; the viewed step carries the colour', [/\.cs-st\.now\{/.test(HTML),/\.cs-st\.view\{[^}]*border-color:var\(--case\)/.test(HTML),/\.cs-st\.view i\{[^}]*color:var\(--case\)/.test(HTML)], [false,true,true]);
  const sc0=P.w.__scrolled.length;
  P.q('[data-bx-jump="3"]').click(); await sleep(60);
  c('a tap on step 3: step 3 is the one marked view; nothing scrolled', [P.qa('#bx-bar .cs-st.view').length,P.q('#bx-bar .cs-st.view').dataset.bxJump,P.w.__scrolled.length-sc0], [1,'3',0]);

  console.log('\n-- the page turn --');
  c('the step he leaves slides out while the next slides in, the whole width; still under reduced motion', [/@keyframes csOutL\{from\{transform:none;opacity:1\}to\{transform:translateX\(-100%\);opacity:0\}\}/.test(HTML),/@keyframes csInR\{from\{transform:translateX\(100%\)/.test(HTML),/\.cs-pane\.cs-out-l,\.cs-pane\.cs-out-r\{[^}]*visibility:visible/.test(HTML),/prefers-reduced-motion:reduce\)\{\.cs-pane\.cs-in-r,\.cs-pane\.cs-in-l,\.cs-pane\.cs-out-l,\.cs-pane\.cs-out-r\{animation:none\}/.test(HTML)], [true,true,true,true]);
  P.q('[data-bx-jump="5"]').click();
  c('…step 3 goes out to the left as step 5 comes in from the right', [P.q('#bx-s3').classList.contains('cs-out-l'),P.q('#bx-s5').classList.contains('cs-in-r'),P.q('#bx-s5').classList.contains('on')], [true,true,true]);
  await sleep(500);
  c('…and is let go after the turn', P.q('#bx-s3').classList.contains('cs-out-l'), false);
  P.q('[data-bx-jump="2"]').click();
  c('…back the other way', [P.q('#bx-s5').classList.contains('cs-out-r'),P.q('#bx-s2').classList.contains('cs-in-l')], [true,true]);

  console.log('\n-- the projects row: only once a project has a name --');
  c('one empty project: no row', P.q('#bx-items').innerHTML.trim(), '');
  P.q('[data-bx-jump="1"]').click(); await sleep(60);
  P.q('#bx-s1 [data-bx-cat]').click(); await sleep(450);   // a category tapped makes the project (still unnamed)
  c('…a project made but not yet named: still no row', P.q('#bx-items').innerHTML.trim(), '');
  { const inp=P.q('#bx-s1 [data-bx-f="name"]'); inp.value='Sound board'; inp.dispatchEvent(new P.w.Event('input',{bubbles:true})); } await sleep(450);
  c('a name typed in step 1: the row, "+ New" then the project by its name', [tx(P,'#bx-items .bx-il'),P.qa('#bx-items .bx-ichip').map(b=>b.textContent.replace(/\s+/g,' ').trim())], ['Your projects',['+ New','Sound board']]);

  console.log('\n-- the Proposal view from a need keeps its title and gains the line --');
  c('the lead line under the big title there', /<h2 class="cs-pbig" id="cs-prop-h">\$\{esc\(L_PROP\('big'\)\)\}<\/h2>\s*<p class="cs-lead">/.test(HTML), true);

  console.log('\n-- the other places the name is read --');
  c('"Who to ask, in Proposal"; "Proposal and the Evangelism Planner read these numbers."; "Propose this"; the PDFs\' subjects',
    [/Who to ask, in Proposal/.test(HTML),/A quién invitar, en Propuesta/.test(HTML),/Proposal and the Evangelism Planner read these numbers\./.test(HTML),/L\('Propose this','Proponer esta idea'\)/.test(HTML),/'Proposal handout'/.test(HTML),/'Folleto de la propuesta'/.test(HTML),/'Proposal to vote on'/.test(HTML),/'Propuesta para votar'/.test(HTML)], [true,true,true,true,true,true,true,true]);
  c('the first-time card and the lock name Proposal', [/Proposal builds its slides from the Community Survey/.test(HTML),/Propuesta crea sus diapositivas/.test(HTML),/Spiritual Gifts for your whole church; Proposal; the Evangelism Planner/.test(HTML)], [true,true,true]);
  c('never "AI" on the tool', AI.test(P.txt('section[data-tab="case"]')||''), false);
  c('no page errors', P.errs, []);

  console.log('\n-- Spanish --');
  const E=page({lang:'es'}); await ready(E); survey(E,'buy'); E.E(`openTool('case')`); await sleep(120);
  c('Propuesta: the tile, the title, the line, the question, the choices, how it works', [tx(E,'.tool[data-tool="case"] b'),tx(E,'#cs-prop-h'),tx(E,'#cs-switch .cs-lead'),tx(E,'#bx-swl'),E.qa('[data-bx-path]').map(b=>tx(b,'b')),tx(E,'[data-bx-path="buy"] small'),tx(E,'#cs-switch .cs-how')],
    ['Propuesta','Propuesta','Convierta una idea en un plan que su iglesia pueda votar, con las diapositivas y los documentos para presentarlo.','¿Para qué es esta propuesta?',['Un ministerio','Un proyecto','Una compra'],'Algo que compramos: sonido, una cámara, una camioneta, sillas.','Cinco pasos, uno a la vez. Toque Hecho al terminar cada paso.']);
  c('…the step lines in Spanish', [tx(E,'#bx-s1 .cs-sh .note'),E.J('BUY_UI.n3.es')], ['Póngale nombre, diga por qué importa y quién lo cuidará.','De dónde saldrá el dinero y cuánto de cada fuente. Nunca el diezmo.']);
  c('no page errors (ES)', E.errs, []);

  console.log('\n-- the stamps --');
  c('the six stamps say v10.75.0', [(HTML.match(/v10\.75\.0/g)||[]).length>=6,/const VERSION = 'v10\.75\.0'/.test(HTML)], [true,true]);
}); T.done(); })();
