/* v10.44.0 — the integration's own checks (B1 projects and purchases + B2 Learn from other conferences, merged 2 Oct 2026).
 * 1. The goal box shows the whole goal. Seen when the integrator LOOKED at the samples: on a phone (390 wide) in Spanish, the purchase's
 *    suggested goal ("Una consola de sonido y una cámara, para que los miembros que no pueden venir adoren con nosotros cada sábado.")
 *    takes four lines and the box (rows="3") cut the last one in half; the ministry path's goal box (#cs-goal, v10.42) is the same box.
 *    Now each grows to its words (goalFit: the box's own scrollHeight, never under the 84 px it had), when drawn and as he types.
 *    jsdom does no layout: a phone's line breaks are stood in for by scrollHeight (about 34 characters a line of 23 px at 390 wide);
 *    the look itself is checked in Chrome (Terrain-work/v56/integ/samples).
 * 1b. The request-for-quote letter: with no phone typed, {contact} is his registration email; "please call pastor@example.org" now
 *    reads "please write to …" (a phone keeps "please call …"), EN and ES.
 * 1c. The Proposal to vote on (a purchase): the checkbox row under "Action taken" touched the motion's last line (0–1 pt; at the
 *    tightest level its boxes overlapped the words). It now sits 4 pt lower inside the same box (the room under the vote row).
 * 2. Both new paths live side by side: the five hub tiles, the purchase switch, Make the Case's door to the comparison for the
 *    conference, and the comparison never opening inside the purchase path.
 * 3. On a phone in Spanish the comparison's heat tables put "Conquistadores" under the first figure (an 88 px first column): the
 *    labels' long words carry a soft hyphen (cmpShy) and may break as a last resort.
 */
const H = require('./v43-helpers.js');
const { c, page, ready, done, FX, SEED, until, sleep } = H;
const DATA = { ...FX.DATA, geo: { ...FX.DATA.geo, matched: SEED('purchase')['terrain-churches-v1'].churches['sample-sampleton-sda'].address } };
const phoneLines = w => Object.defineProperty(w.HTMLTextAreaElement.prototype, 'scrollHeight', { configurable: true, get() { return Math.ceil((this.value || ' ').length / 34) * 23 + 20; } });
(async () => {
  console.log('-- 1. the goal box shows the whole goal --');
  const P = await ready(page('purchase', 'es', { data: DATA })); phoneLines(P.w);
  P.E(`(()=>{ const ch=uChurch(); ch.proposalPrefs={...(ch.proposalPrefs||{}),path:'buy',buy:'buy-avs001'}; uPersist(); openTool('case'); render(); return 1; })()`);
  await until(() => P.q('#bx-goal'));
  const g = P.J(`(()=>{ const t=document.getElementById('bx-goal'); return {v:t.value,len:t.value.length,h:t.style.height}; })()`);
  c('the purchase: the Spanish suggested goal is the sample\'s (110 characters: four lines on a phone)', [g.v.startsWith('Una consola de sonido y una cámara, para que'), g.len > 102], [true, true]);
  c('…its box is as tall as its words (4 lines × 23 + 20 + 2 = 114 px), not rows="3"', g.h, '114px');
  P.E(`(()=>{ const t=document.getElementById('bx-goal'); t.value='Corto.'; t.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
  c('…as he types it follows his words, never under the 84 px it always had', P.E(`document.getElementById('bx-goal').style.height`), '84px');
  P.E(`(()=>{ const t=document.getElementById('bx-goal'); t.value='x'.repeat(200); t.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
  c('…and grows with a long goal (200 characters: 6 lines)', P.E(`document.getElementById('bx-goal').style.height`), (6 * 23 + 20 + 2) + 'px');
  P.E(`(()=>{ const it=buyGet('buy-avs001'); it.goal={}; buySave(it); buyDrawAll(); return 1; })()`);
  P.E(`caseSetPrefs({path:'ministry',ministry:'food-pantry',type:'board',group:'board'}); openTool('case'); render();`); await sleep(300);
  const m = P.J(`(()=>{ const t=document.querySelector('#cs-s3 #cs-goal'); return t?{v:t.value,h:t.style.height}:null; })()`);
  const want = Math.max(84, Math.ceil(m.v.length / 34) * 23 + 20 + 2) + 'px';
  c('the ministry path\'s goal box (#cs-goal, step 3) grows the same way', [m.h, m.h === want], [want, true]);
  P.E(`(()=>{ const t=document.querySelector('#cs-s3 #cs-goal'); t.value='y'.repeat(180); t.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
  c('…and as he types', P.E(`document.querySelector('#cs-s3 #cs-goal').style.height`), (Math.ceil(180 / 34) * 23 + 20 + 2) + 'px');
  P.E(`(()=>{ const t=document.querySelector('#cs-s3 #cs-goal'); t.value=caseGoalSuggest(caseItemOf('food-pantry'),'es'); t.dispatchEvent(new Event('input',{bubbles:true})); caseGoalFlush(); return 1; })()`);

  console.log('\n-- 1b. the quote letter never asks a company to "call" an email address --');
  // Seen in the samples: with no phone typed, {contact} is his registration email, and the letter read "please call pastor@example.org"
  // ("por favor llame a pastor@example.org"). A phone keeps the design's words; an email is written to.
  const rq = (L, o) => P.J(`buyRfq(buyGet('buy-avs001'),'${L}',${JSON.stringify(o || {})}).split('\\n').find(l=>/visit|visitarnos/i.test(l))`);
  c('EN with his email: "please write to pastor@example.org", never "call" it', rq('en'), 'You are welcome to visit; please write to pastor@example.org to arrange a time. We meet for worship on Saturdays, so please suggest another day.');
  c('ES with his email: "por favor escriba a pastor@example.org"', rq('es'), 'Puede visitarnos; por favor escriba a pastor@example.org para acordar una hora. Nos reunimos para adorar los sábados; por favor sugiera otro día.');
  c('…with a phone, the design\'s own words: "please call 215-555-0100" / "por favor llame a 215-555-0100"',[rq('en', { contact: '215-555-0100' }), rq('es', { contact: '215-555-0100' })],
    ['You are welcome to visit; please call 215-555-0100 to arrange a time. We meet for worship on Saturdays, so please suggest another day.', 'Puede visitarnos; por favor llame a 215-555-0100 para acordar una hora. Nos reunimos para adorar los sábados; por favor sugiera otro día.']);

  console.log('\n-- 1c. the Proposal to vote on: the boxes under "Action taken" never touch the motion above them --');
  // Seen in the samples (rendered with PDFKit): the checkbox row sat 0 to 1 pt under the motion's last line, and at the tightest level
  // (the Spanish finance committee's one page) its boxes touched "capacitación". The box keeps its height (room under the vote row).
  for (const L of ['en', 'es']) {
    const P2 = L === 'es' ? P : await ready(page('purchase', 'en', { data: DATA }));
    const r = P2.J(`['finance','board'].map(a=>{ const it=buyGet('buy-avs001'); const m=buyModel(it,a); const Pz=buyProposal(m); const d=buyProposalDoc(Pz,{jsPDF:window.jspdf.jsPDF});
      const log=d.__caseLog, first=caseInLang('${L}',()=>Pz.action.outcomes[0].label), i=log.findIndex(l=>l.t===first); const mot=log[i-1];
      return {a,lv:d.__caseLevel,pages:d.getNumberOfPages(),gap:Math.round(((log[i].y-7)-(mot.y+2.2))*10)/10}; })`);
    c(`${L}: 2.5 pt or more between the motion's last line and the boxes (finance, board), each Proposal still one page`, r.map(x => [x.a, x.gap >= 2.5, x.pages]), [['finance', true, 1], ['board', true, 1]]);
    console.log('    ' + JSON.stringify(r));
  }

  console.log('\n-- 2. both new paths, side by side --');
  P.E(`showHub()`); await sleep(100);
// v10.57.0 (stale, not a regression): six tiles. The pastor (7 Oct 2026): "maybe we could also have a comparison between churches … kinda like how conferences compare each other"
  c('the hub: six tiles, the conferences\' comparison fifth', P.J(`[...document.querySelectorAll('#hub .tool')].map(t=>t.dataset.tool)`), ['survey', 'gifts', 'case', 'planner', 'compare', 'churches']);
  P.E(`caseSetPrefs({path:'ministry',ministry:'plan-series',type:'conference',group:'conference'}); openTool('case'); render();`); await sleep(300);
  c('Make the Case for a ministry, to Conference leaders: the switch above, and step 2\'s door to the comparison',
    P.J(`[!!document.querySelector('#cs-switch [data-bx-path="buy"]'),!!document.querySelector('#cs-s2 [data-cs-cmpdoor], #cs-s2 .cs-cmpdoor')]`), [true, true]);
  P.E(`(()=>{ const ch=uChurch(); ch.proposalPrefs={...(ch.proposalPrefs||{}),path:'buy',buy:'buy-avs001'}; uPersist(); openTool('case'); render(); return 1; })()`); await sleep(300);
  c('…the purchase path: its five steps, no door to the comparison, the comparison panel closed',
    P.J(`[[1,2,3,4,5].every(n=>!!document.getElementById('bx-s'+n)),!!document.querySelector('.cs-cmpdoor'),!!(document.getElementById('cmp')&&!document.getElementById('cmp').hidden)]`), [true, false, false]);
  console.log('\n-- 3. the comparison on a phone, in Spanish: a long word in a table\'s first column breaks, never runs under the figures --');
  // Seen in the samples (390 wide, Spanish, "By part of the country"): "Conquistadores" is wider than the 88 px first column and ran
  // under the "34%" cell. A word of 13 letters or more in a heat table's first column now carries one soft hyphen where Spanish and
  // English split a syllable (vowel | consonant + vowel, five letters or more on each side): "Conquista-dores" breaks only when it must.
  // (CSS hyphens:auto was tried and hyphenated every label, "Evangelismo y al-cance": not used.) jsdom does no layout: this holds the
  // rule; the look is checked in Chrome.
  const SHY = String.fromCharCode(173);
  c('cmpShy: "Conquistadores y niños" → "Conquista·dores y niños" (a soft hyphen), shorter words untouched',
    P.E('typeof cmpShy') !== 'function' ? 'no cmpShy' : [P.E(`cmpShy("Conquistadores y niños")`) === 'Conquista' + SHY + 'dores y niños', P.E(`cmpShy("Evangelismo y alcance · Pathfinders & children · discipleship")`).includes(SHY)], [true, false]);
  c('…both heat tables draw their first column through it (ministry by ministry, by part of the country)',
    [/esc\(cmpShy\(L\)\)/.test(P.E('String(cmpHeat)')), /esc\(cmpShy\(L\)\)/.test(P.E('String(cmpArea)'))], [true, true]);
  const css = P.E(`[...document.querySelectorAll('style')].map(s=>s.textContent).join('\\n')`);
  const lab = (css.match(/\.cmp-heat \.lab\{[^}]*\}/) || [''])[0];
  c('…and, as a last resort, a word that still does not fit may break (overflow-wrap:anywhere; no hyphens:auto)', [/overflow-wrap:anywhere/.test(lab), /hyphens:auto/.test(lab)], [true, false]);
  c('no page errors', P.errs, []);
  done();
})();
