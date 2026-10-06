// v10.51.0 — the pastor (6 Oct 2026), the bottom of the Proposal page:
//   "the proposal to vote on PDF that you get from the proposal should show underneath … and it should be editable … a place you
//   can tap edit and every line you can change it" · "I don't know if we really need the how it is being decided … you don't need
//   it to have it on the bottom again" · "there's a verse and a scripture a quote from Ellen White so just keep the quote from Ellen
//   White … Let's clean everything up" · "the your church ready to serve probably needs to be at the end and it should have the
//   spiritual gifts icon, and smaller one with a button that will … send the Pastor to the spiritual gifts page".
// Written failing-first on v10.50.0.
const fs=require('fs'), path=require('path');
const {ROOT,sleep,until,checker,page,ready,survey,openNeed,openSheet}=require('./v45-helpers.js');
const T=checker(), c=T.c;
const HTML=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');

async function proposalPage(o){
  const R=page({needs:'file',...(o||{})}); await ready(R); survey(R);
  const NEED=R.J(`NSM.needs[0].id`);
  await openNeed(R,NEED,true);
  const IDEA=R.q(`#ns-i-${NEED} .ns-row`).dataset.idea;
  await openSheet(R,NEED,IDEA);
  R.q('#ns-sheet [data-ns-propose]').click();
  await until(()=>R.E('TOOL')==='case'&&R.q('#cs-prop'));
  R.q('#cs-s1 [data-cs-group="board"]').click(); await sleep(60);
  return R;
}
const typeIn=(P,el,v)=>{ el.value=v; el.dispatchEvent(new P.w.Event('input',{bubbles:true})); };

(async()=>{ await T.sec(async()=>{
  console.log('\n-- the proposal itself, under the slides --');
  const R=await proposalPage();
  const Pz=R.J('caseProposal(CASE_ST.model,CASE_ST.deck)');
  c('the board is chosen and step 3 shows its slides', [R.J('casePrefs().group'),!!R.q('#cs-s3 .cs-acts')], ['board',true]);
  c('"Proposal to vote on" right under the buttons (after the room line), before the rest of the step', [!!R.q('#cs-s3 #cs-pz'),R.q('#cs-pz')&&R.q('#cs-pz').previousElementSibling.id,R.q('#cs-pz')&&R.q('#cs-pz').hidden],
    [true,'cs-room',false]);
  c('…its heading, one line, and two buttons: Edit and its PDF', [R.txt('#cs-pz h3'),R.txt('#cs-pz .cs-pzn'),R.qa('#cs-pz .cs-pzb button').filter(b=>!b.hidden).map(b=>b.textContent)],
    ['Proposal to vote on','This is what the PDF prints. Tap Edit to change any line.',['Edit','Download PDF']]);
  c('the page reads as the PDF: the title, the memo (church, to, from, date, subject), the motion', [R.txt('#cs-pz .cs-pzt'),R.qa('#cs-pz .cs-pzmemo dt').map(x=>x.textContent),R.qa('#cs-pz .cs-pzmemo dd').map(x=>x.textContent),R.txt('#cs-pz [data-pz-f="motion"]')],
    [Pz.title,Pz.memo.map(r=>r[0]),Pz.memo.map(r=>r[1]),Pz.motion]);
  c('…why, the plan, the safeguards and the review, line for line', [R.qa('#cs-pz [data-pz-f^="why:"]').map(x=>x.textContent),R.qa('#cs-pz [data-pz-f^="plan:"]').map(x=>x.textContent),R.qa('#cs-pz [data-pz-f^="safe:"]').map(x=>x.textContent),R.qa('#cs-pz [data-pz-f^="rev:"]').map(x=>x.textContent)],
    [Pz.why.map(w=>w.text),Pz.plan.flatMap(p=>p.lines),Pz.safeguards.map(s=>s.text),Pz.review.map(r=>r[1])]);
  c('…the section heads the PDF uses', ['why','plan','safeguards','review'].every(k=>R.qa('#cs-pz h5').some(h=>h.textContent===Pz.labels[k])), true);
  c('…and the action taken: its boxes to tick at the meeting (not edited here)', [R.qa('#cs-pz .cs-pzbox').map(x=>x.textContent),R.qa('#cs-pz .cs-pzact [data-pz-f]').length], [Pz.action.boxes.map(b=>b.label),0]);
  const nRead=R.qa('#cs-pz [data-pz-f]').length;

  console.log('\n-- Edit: every line --');
  R.q('#cs-pz [data-pz-edit]').click(); await sleep(20);
  c('Edit: every line becomes a box with its words; Done and nothing else', [R.qa('#cs-pz textarea[data-pz-f]').length,nRead>10,R.qa('#cs-pz .cs-pzb button').filter(b=>!b.hidden).map(b=>b.textContent)], [nRead,true,['Done']]);
  c('…the motion\'s box holds the motion', R.q('#cs-pz textarea[data-pz-f="motion"]').value, Pz.motion);
  const MOTION='To approve the community meal for six weeks, with a named coordinator.', TO='The church board of Bucks County';
  typeIn(R,R.q('#cs-pz textarea[data-pz-f="motion"]'),MOTION);
  const whyK=R.q('#cs-pz textarea[data-pz-f^="why:"]').dataset.pzF, planK=R.q('#cs-pz textarea[data-pz-f^="plan:"]').dataset.pzF;
  typeIn(R,R.q(`#cs-pz textarea[data-pz-f="${whyK}"]`),'Our neighbors asked for this at the fall fair.');
  typeIn(R,R.q(`#cs-pz textarea[data-pz-f="${planK}"]`),'A Sunday supper in the fellowship hall.');
  typeIn(R,R.q(`#cs-pz textarea[data-pz-f="memo:To"]`),TO);
  const E=R.J('uChurch().propEdits[caseEditKey()]');
  c('each change is kept for this church, ministry and group as it is typed', [E.motion,E[whyK],E[planK],E['memo:To']], [MOTION,'Our neighbors asked for this at the fall fair.','A Sunday supper in the fellowship hall.',TO]);
  c('…and saved on this device', Object.values(JSON.parse(R.w.localStorage.getItem(R.E('U_STORE_KEY'))).churches).some(ch=>ch.propEdits&&Object.values(ch.propEdits).some(e=>e.motion===MOTION)), true);
  c('while editing, "Undo my changes" shows beside Done', R.qa('#cs-pz .cs-pzb button').filter(b=>!b.hidden).map(b=>b.textContent), ['Done','Undo my changes']);
  R.q('#cs-pz [data-pz-done]').click(); await sleep(20);
  c('Done: the page reads with his words', [R.txt('#cs-pz [data-pz-f="motion"]'),R.txt(`#cs-pz [data-pz-f="${whyK}"]`),R.txt(`#cs-pz [data-pz-f="${planK}"]`),R.qa('#cs-pz .cs-pzmemo dd')[1].textContent,R.qa('#cs-pz textarea').length],
    [MOTION,'Our neighbors asked for this at the fall fair.','A Sunday supper in the fellowship hall.',TO,0]);
  c('…an edited line is marked', R.q('#cs-pz [data-pz-f="motion"]').classList.contains('ed'), true);

  console.log('\n-- the PDF uses his words --');
  R.E(`window.__pz=null; gfLoadJsPDF=async()=>function(){}; caseProposalDoc=(Pz)=>{ window.__pz=Pz; return {save(){}}; };`);
  R.q('#cs-pz [data-cs-act="proposal"]').click(); await until(()=>R.E('!!window.__pz'));
  const PP=R.J('window.__pz');
  c('Download PDF (beside Edit): the motion, why, the plan and the memo as he wrote them', [PP.motion,PP.why.find(w=>'why:'+w.k===whyK).text,PP.plan.flatMap(p=>p.lines).includes('A Sunday supper in the fellowship hall.'),PP.memo.find(r=>r[0]==='To')[1]],
    [MOTION,'Our neighbors asked for this at the fall fair.',true,TO]);
  c('…the rest as the app wrote it', [PP.title,PP.safeguards.map(s=>s.text)], [Pz.title,Pz.safeguards.map(s=>s.text)]);

  console.log('\n-- kept, per group --');
  R.E('caseMount()'); await sleep(20);
  c('drawn again: still his words', R.txt('#cs-pz [data-pz-f="motion"]'), MOTION);
  R.q('#cs-s1 [data-cs-group="finance"]').click(); await sleep(40);
  c('the finance committee has its own proposal (his board words are not on it)', R.txt('#cs-pz [data-pz-f="motion"]')!==MOTION, true);
  R.q('#cs-s1 [data-cs-group="board"]').click(); await sleep(40);
  c('back to the board: his words again', R.txt('#cs-pz [data-pz-f="motion"]'), MOTION);
  R.q('#cs-pz [data-pz-edit]').click(); await sleep(20);
  typeIn(R,R.q('#cs-pz textarea[data-pz-f="motion"]'),'   ');
  c('a line emptied goes back to the app\'s words', [R.J('uChurch().propEdits[caseEditKey()].motion||null'),(R.q('#cs-pz [data-pz-done]').click(),R.txt('#cs-pz [data-pz-f="motion"]'))], [null,Pz.motion]);
  R.q('#cs-pz [data-pz-edit]').click(); await sleep(20);
  R.q('#cs-pz [data-pz-undo]').click(); await sleep(20);
  c('Undo my changes: every line as the app wrote it, nothing kept, back to reading', [R.txt(`#cs-pz [data-pz-f="${whyK}"]`),R.J('(uChurch().propEdits||{})[caseEditKey()]||null'),R.qa('#cs-pz textarea').length,R.qa('#cs-pz .ed').length],
    [Pz.why.find(w=>'why:'+w.k===whyK).text,null,0,0]);

  console.log('\n-- the bottom of the page, clean --');
  c('no "How it is being decided" on the Proposal page', R.qa('#cs-dec').length, 0);
  c('the close: the Ellen White quote only (no verse above it)', [R.qa('#casebody .cs-close .verse').length,R.qa('#casebody .cs-close .cs-egw').length], [0,1]);
  const last=R.q('#cs-ready');
  c('"Your church, ready to serve" is last in the step (only its folded ask list after it), a small card, not a fold', [last&&last.tagName,last&&last.nextElementSibling&&last.nextElementSibling.id,R.q('#cs-ask').hidden,R.q('#cs-ask').nextElementSibling,R.qa('#cs-ready summary').length,R.qa('#cs-ready .gfr-row').length],
    ['SECTION','cs-ask',true,null,0,0]);
  c('…with the Spiritual Gifts icon, its title, one line, and one button', [!!R.q('#cs-ready .cs-rico svg'),R.txt('#cs-ready .cs-rk'),!!R.txt('#cs-ready .cs-rl'),R.qa('#cs-ready .btn').map(b=>b.textContent)],
    [true,'Your church, ready to serve',true,['Open Spiritual Gifts']]);
  c('…the icon\'s colours are its own (no id shared with the main menu\'s)', R.qa('#cs-ready svg [id]').every(x=>R.qa('[id="'+x.id+'"]').length===1), true);
  R.q('#cs-ready [data-gfr-gifts]').click(); await sleep(40);
  c('the button opens Spiritual Gifts', R.E('TOOL'), 'gifts');

  console.log('\n-- the buttons under the slides, and the slide panel --');
  // "present live should probably be a different color and highlighted and glowing … that's the important button … see a sample
  // slideshow … keep that just in case … what is your private ask list" and "Dates … Runs as … restore the original. What is that?"
  R.E(`openTool('case'); NS.back=null; caseSetPrefs({ministry:'vbs',group:'board',type:'board'}); caseMount();`); await sleep(40);
  c('Present live first, alone and gold; then Share link & QR and the handout; nothing else in the row', [R.qa('#cs-s3 .cs-acts [data-cs-act]').map(b=>[b.dataset.csAct,b.classList.contains('cs-live')]),R.txt('#cs-s3 .cs-live')],
    [[['present',true],['share',false],['pdf',false]],'Present live']);
  c('the sample slideshow: a quiet link under them', [R.q('#cs-s3 .cs-samplel [data-cs-act="sample"]').classList.contains('gff-l'),R.txt('#cs-s3 .cs-samplel')], [true,'See a sample slideshow']);
  c('the Proposal\'s PDF is beside its Edit; the private ask list is "Who to ask" in the ready card', [R.qa('#cs-s3 [data-cs-act="proposal"]').map(b=>b.closest('#cs-pz')?'cs-pz':'row'),R.E(`caseU('askList')`)], [['cs-pz'],'Who to ask']);
  R.q('#cs-s3 .cs-outline [data-cs-go="1"]').click(); await sleep(30);   // a slide with words of its own
  c('the slide panel: no Dates, no Runs as, no "Saved on this device"', [R.qa('#cs-s3 [data-cs-timing]').length,R.qa('#cs-s3 [data-cs-runs]').length,/Saved on this device/.test(R.txt('#cs-s3'))], [0,0,false]);
  c('…"Undo my changes" only once the slide has his words', [R.qa('#cs-s3 [data-cs-restore]').every(b=>b.hidden),R.qa('#cs-s3 [data-cs-restore]').map(b=>b.textContent).slice(0,1)], [true,['Undo my changes']]);
  { const box=R.q('#cs-s3 [data-cs-f="headline"]');
    if(box){ typeIn(R,box,'Will you approve the Bible school this summer?'); await sleep(10);
      c('…typing in the headline shows it', R.qa('#cs-s3 [data-cs-restore]').some(b=>!b.hidden), true);
      R.q('#cs-s3 [data-cs-restore]:not([hidden])').click(); await sleep(300);
      c('…and Undo puts the app\'s words back and hides itself', R.qa('#cs-s3 [data-cs-restore]').every(b=>b.hidden), true); }
    else c('…a headline box to type in (a slide with words is shown)', !!box, true); }

  console.log('\n-- Make the Case (from the main menu) --');
  R.E(`showHub(); NS.back=null; openTool('case'); caseSetPrefs({ministry:'vbs',group:'board',type:'board'}); caseMount();`); await sleep(40);
  c('not a proposal from a need: still the Proposal to vote on, under the buttons', [R.E('casePropMode()'),!!R.q('#cs-s3 #cs-pz'),R.q('#cs-pz')&&R.q('#cs-pz').previousElementSibling.id], [false,true,'cs-room']);
  c('…no "How it is being decided" here either ("I don\'t think that even needs to be there"; Decision in the presenter view stays)', [R.qa('#cs-s3 #cs-dec').length,R.E(`typeof prDecideOk`)], [0,'function']);
  c('…the close: the Ellen White quote only', [R.qa('#casebody .cs-close .verse').length,R.qa('#casebody .cs-close .cs-egw').length], [0,1]);
  c('…"Your church, ready to serve" last (its folded ask list after it)', [R.q('#cs-s3').lastElementChild.id,R.q('#cs-s3').lastElementChild.previousElementSibling.id], ['cs-ask','cs-ready']);
  R.E(`caseSetPrefs({ministry:'vbs',group:'congregation',type:'congregation'}); caseMount();`); await sleep(40);
  c('the whole church (invited, not asked to vote): no proposal to vote on', [R.qa('#cs-s3 [data-cs-act="proposal"]').length,!R.q('#cs-pz')||R.q('#cs-pz').hidden], [0,true]);
  R.w.close();

  console.log('\n-- in Spanish --');
  const S=await proposalPage({lang:'es'});
  c('"Propuesta para votar", Editar', [S.txt('#cs-pz h3'),S.txt('#cs-pz .cs-pzn'),S.txt('#cs-pz [data-pz-edit]')], ['Propuesta para votar','Esto es lo que imprime el PDF. Toque Editar para cambiar cualquier línea.','Editar']);
  S.q('#cs-pz [data-pz-edit]').click(); await sleep(20);
  typeIn(S,S.q('#cs-pz textarea[data-pz-f="motion"]'),'Aprobar la cena comunitaria.');
  c('…Listo, Deshacer mis cambios', S.qa('#cs-pz .cs-pzb button').filter(b=>!b.hidden).map(b=>b.textContent), ['Listo','Deshacer mis cambios']);
  c('…"Su iglesia, lista para servir" and its button', [S.txt('#cs-ready .cs-rk'),S.txt('#cs-ready [data-gfr-gifts]')], ['Su iglesia, lista para servir','Abrir Dones espirituales']);
  S.w.close();

  console.log('\n-- the sample stays as it was --');
  c('the sample slideshow draws no proposal page of its own', /casePzDraw\(/.test(HTML.slice(HTML.indexOf('function caseSampleOpen'),HTML.indexOf('function caseSampleOpen')+6000)), false);
}); T.done(); })();
