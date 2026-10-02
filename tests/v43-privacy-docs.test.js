/* v10.43 — THE PRIVACY PROMISE IS IN EVERY FOLLOW-UP PLAN (review, 1 Oct 2026).
 *
 * SPEC §3: "Privacy promise shown on the form and in the proposal"; DESIGN C1.12: the handout and the Proposal carry cnPromise(lang)
 * and, for children's ideas, "We never keep children's names." The review found the promise only in the board's Proposals: every team
 * and whole-church Proposal (their tight levels kept the next step and the timeline only) and about half of the handouts (the note
 * was left out from level 3) went without it, and 27 children's documents never said they keep no children's names.
 * Now the tight forms keep one privacy row (the promise and, for children, the children's line), on every level.
 */
const H = require('./v43-helpers.js');
const { c, page, ready, build, T } = H;
const FU_IDS = [...H.BUILTIN_EVENTS, ...Object.keys(H.BUILTIN_SERIES)].filter(id => !H.NOCARD_BUILTIN.includes(id));
const norm = a => (a || []).join(' ').replace(/\s+/g, ' ');
(async () => {
  for (const lang of ['en', 'es']) {
    const P = await ready(page('after', lang));
    const promise = P.J(`fuPromise(${JSON.stringify(lang)})`), kidsLine = P.J(`caseT(CASE_FU.pdf.kids)`);
    const kidsOf = P.J(`Object.fromEntries(${JSON.stringify(FU_IDS)}.map(id=>[id,caseKidsOf(SIGNATURE.find(x=>x.id===id))]))`);
    const groups = ['community', 'congregation', 'youth', 'board'];
    console.log(`\n-- ${lang.toUpperCase()}: ${FU_IDS.length} event and series built-ins × ${groups.join(', ')}: the Proposal and the handout --`);
    const miss = { prop: [], hand: [], kids: [], lv: {} };
    for (const id of FU_IDS) for (const g of groups) {
      const R = await build(P, id, g, { pdf: true });
      if (R.err) { miss.prop.push(id + ':' + g + ':error'); continue; }
      if (!R.m.followup) continue;
      const pl = norm(R.pl), hl = norm(R.hl);
      if (!pl.includes(promise)) miss.prop.push(id + ':' + g);
      if (!hl.includes(promise)) miss.hand.push(id + ':' + g);
      if (kidsOf[id] && !(pl.includes(kidsLine) && hl.includes(kidsLine))) miss.kids.push(id + ':' + g);
    }
    c(`${lang}: every Proposal says the privacy promise (${promise.slice(0, 40)}…)`, miss.prop, []);
    c(`${lang}: every handout says it`, miss.hand, []);
    c(`${lang}: every children's idea says "${kidsLine}" in both`, miss.kids, []);
    // the tight forms themselves: a privacy row at every level of the Proposal, and the handout's tight rows
    const fu = P.J(`(()=>{ const m=caseModel('backpack-giveaway',{type:'team',group:'community'},{timing:'options'}); const d=caseDeck(m); const Pz=caseProposal(m,d,{}), Hh=caseHandout(m,d,{});
      return {rows:Pz.followup.rows.map(r=>r[0]),tight:Pz.followup.tight.map(r=>r[0]),tight4:Pz.followup.tight4.map(r=>r[0]),last:Pz.followup.tight4[Pz.followup.tight4.length-1][1],hnote:Hh.followup.note}; })()`);
    const PRIV = lang === 'es' ? 'Privacidad' : 'Privacy';
    c(`${lang}: the Proposal's full, tight and tightest forms each end with "${PRIV}"`, [fu.rows[fu.rows.length - 1], fu.tight[fu.tight.length - 1], fu.tight4[fu.tight4.length - 1]], [PRIV, PRIV, PRIV]);
    c(`${lang}: back-to-school (children): the row says the promise and the children's line`, fu.last, promise + ' ' + kidsLine);
    c(`${lang}: the handout's note is the same words`, fu.hnote, promise + ' ' + kidsLine);
    c(`${lang}: no page errors`, P.errs.filter(e => !/Not implemented/.test(e)).slice(0, 3), []);
    P.w.close();
  }
  console.log(`\n${T.pass} passed, ${T.fail} failed`);
  process.exit(T.fail ? 1 : 0);
})();
