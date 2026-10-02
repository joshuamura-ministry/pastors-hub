/* v10.43 — THE PROPOSAL TO VOTE ON KEEPS ITS PAGES with the follow-up plan (the integrator's suite).
 *
 * The pastor (30 Sep 2026): "after one day there needs to be some kind of follow-up if we connect with the community"; SPEC §2:
 * "the handout and the Proposal to vote on get a 'Follow-up plan' section". v10.42 part 3 set the Proposal's pages (caseProposalDoc:
 * "the densest level that fits: a team's on one page, the others on two"; every English team Proposal kept one page). With the new
 * section and the motion's follow-up clause, every team Proposal of an outreach event or series ran onto a second page at every
 * level (the average church: 360 of 360, English and Spanish; the event and series built-ins: 72 of 432 English ones still on one).
 * The fix (v10.43, integration): a team's Proposal WITH a follow-up plan has one more level (4). It leaves out the WHAT row (at the
 * tight levels it is only the ministry's name, which the title, the subject and the motion already say), keeps two steps, one
 * safeguard and the review row, says the timeline in its short form (the step-3 card's words; the motion names the next step), at
 * 0.84 of the full size. Every other Proposal is drawn as before (an ongoing one never reaches level 4: v43-ongoing-golden).
 */
const fs = require('fs'), path = require('path');
const H = require('./v43-helpers.js');
const { c, page, ready, FX, T } = H;
const A = H.SEED('after');
const ADDRESS = A['terrain-churches-v1'].churches['sample-sampleton-sda'].address;
const DATA = { ...FX.DATA, geo: { ...FX.DATA.geo, matched: ADDRESS } };
const FU_IDS = [...H.BUILTIN_EVENTS, ...Object.keys(H.BUILTIN_SERIES)].filter(id => !H.NOCARD_BUILTIN.includes(id));
/* Spanish team Proposals to Community Services that v10.42.1 drew on one page (measured on that release, seed-after, both timings):
   none of them may need a second page now. */
const ES_ONE_PAGE_BEFORE = ['rights-clinic:fixed', 'backpack-giveaway:options', 'backpack-giveaway:fixed', 'christmas-store:fixed', 'kids-health:fixed',
  'questions-night:fixed', 'blood-drive:options', 'blood-drive:fixed', 'toy-swap:fixed', 'neighbor-table:fixed', 'come-and-see:fixed', 'sports-camp:fixed',
  'proph-news:fixed', 'proph-language:options', 'proph-language:fixed', 'four-nights:fixed', 'stop-smoking:fixed', 'chip:fixed', 'cooking-school:fixed',
  'mental-health:options', 'mental-health:fixed', 'grief:options', 'grief:fixed', 'archaeology:options', 'archaeology:fixed', 'family-life-series:fixed',
  'money-course:fixed', 'health-to-why:fixed', 'grief-to-hope:options', 'grief-to-hope:fixed', 'parents-study:fixed', 'open-baptism-class:options', 'open-baptism-class:fixed'];

/* One Proposal: its pages, the level drawn, every line (page, y, text, in its box) and what the Pz carries. */
const prop = (P, id, g, timing) => P.J(`(()=>{ try{ const G=CASE_GROUPS.find(g=>g.id===${JSON.stringify(g)});
  const m=caseModel(${JSON.stringify(id)},{type:G.type,group:G.id},{timing:${JSON.stringify(timing)}}); const d=caseDeck(m); const Pz=caseProposal(m,d,{});
  const doc=caseProposalDoc(Pz,{jsPDF:window.jspdf.jsPDF}); const L=doc.__caseLog||[];
  return {aud:Pz.audience,fu:!!Pz.followup,n:doc.getNumberOfPages(),lv:doc.__caseLevel,
    lines:L.map(l=>({p:l.p,y:Math.round(l.y),t:l.t,out:l.x0<l.bx0-0.6||l.x1>l.bx1+0.6||l.y>780})),
    how:(Pz.plan.find(p=>p.k==='how')||{lines:[]}).lines.length,safe:(Pz.safeguards||[]).length,review:(Pz.review||[]).map(r=>r[0]),
    tight4:Pz.followup?Pz.followup.tight4||null:null,title:Pz.title}; }catch(e){ return {err:String(e&&e.stack||e).slice(0,300)}; } })()`);

(async () => {
  const P = await ready(page('followup', 'en', { data: DATA })), Pes = await ready(page('followup', 'es', { data: DATA }));
  const teams = P.J(`CASE_GROUPS.filter(g=>g.type==='team'||g.type==='congregation').map(g=>g.id)`);
  const others = P.J(`CASE_GROUPS.filter(g=>!(g.type==='team'||g.type==='congregation')).map(g=>g.id)`);

  console.log('\n-- the average church: the health fair, back-to-school and the 4-night series, to every body, both timings, EN + ES --');
  const all = [];
  for (const [PP, lang] of [[P, 'en'], [Pes, 'es']]) for (const id of ['health-expo', 'backpack-giveaway', 'four-nights'])
    for (const g of [...teams, ...others]) for (const timing of ['options', 'fixed']) all.push({ lang, id, g, timing, ...prop(PP, id, g, timing) });
  console.log(`    ${all.length} Proposals · ` + ['en', 'es'].map(l => l + ': ' + [1, 2, 3].map(n => n + 'p ' + all.filter(r => r.lang === l && r.n === n).length).join(', ')).join(' · '));
  c('no Proposal fails to draw', all.filter(r => r.err).map(r => r.err).slice(0, 2), []);
  c('every one carries the Follow-up plan (an outreach event or series)', all.filter(r => !r.fu).length, 0);
  c('a team\'s (and the whole church\'s) Proposal: ONE page in English, every team, both timings (was two: the follow-up section pushed "Action taken" over)',
    all.filter(r => r.lang === 'en' && r.aud === 'team' && r.n !== 1).map(r => r.id + ':' + r.g + ':' + r.timing).slice(0, 8), []);
  c('…and in Spanish: one page for back-to-school and the 4-night series with dates, as in v10.42.1; never more than two',
    [all.filter(r => r.lang === 'es' && r.aud === 'team' && ES_ONE_PAGE_BEFORE.includes(r.id + ':' + r.timing) && r.n !== 1).map(r => r.id + ':' + r.g + ':' + r.timing).slice(0, 8),
      all.filter(r => r.lang === 'es' && r.aud === 'team' && r.n > 2).length], [[], 0]);
  c('the board, the business meeting, the finance committee and the conference: two pages at most', all.filter(r => r.aud !== 'team' && r.n > 2).map(r => r.lang + ':' + r.id + ':' + r.g + ':' + r.timing), []);
  c('every line in its box, on the page', all.filter(r => r.lines && r.lines.some(l => l.out)).map(r => r.lang + ':' + r.id + ':' + r.g + ':' + r.timing).slice(0, 6), []);

  console.log('\n-- the tightest level (4): what a team\'s one page keeps --');
  const lv4 = all.filter(r => r.lv === 4);
  c('level 4 is drawn only for a team\'s Proposal with a follow-up plan, and only where level 3 needed a second page', [lv4.length > 0, lv4.every(r => r.aud === 'team' && r.fu)], [true, true]);
  const keeps = r => { const t = r.lines.filter(l => l.p === 1).map(l => l.t), en = r.lang === 'en';
    const need = en ? ['MOTION', 'WHY', 'THE PLAN', 'FOLLOW-UP PLAN', 'NEXT STEP', 'TIMELINE', 'BUDGET', 'SAFEGUARDS', 'REVIEW AND REPORTING', 'REVIEW', 'THE MOTION, AS ABOVE', 'ACTION TAKEN']
      : ['MOCIÓN', 'POR QUÉ', 'EL PLAN', 'PLAN DE SEGUIMIENTO', 'SIGUIENTE PASO', 'PLAZOS', 'PRESUPUESTO', 'SALVAGUARDAS', 'REVISIÓN E INFORME', 'REVISIÓN', 'LA MOCIÓN, COMO ARRIBA', 'ACUERDO TOMADO'];
    return need.filter(h => !t.includes(h)); };
  c('…on page 1: the motion, why, the plan, the Follow-up plan (next step, timeline), the budget, a safeguard, the review, the motion again and "Action taken"',
    lv4.filter(r => r.n === 1).map(r => [r.lang + ':' + r.id + ':' + r.g + ':' + r.timing, keeps(r)]).filter(x => x[1].length).slice(0, 4), []);
  c('…the timeline in its short form, the step-3 card\'s words (EN, ES)', [P.J(`(caseProposal(caseModel('health-expo',{type:'team',group:'community'},{timing:'options'}),null,{}).followup.tight4||[])[1]||null`),
    Pes.J(`(caseProposal(caseModel('health-expo',{type:'team',group:'community'},{timing:'options'}),null,{}).followup.tight4||[])[1]||null`)],
    [['Timeline', 'A thank-you within 48 hours · an invitation within 2 weeks, if they asked · a visit only if they ask'],
      ['Plazos', 'Un agradecimiento antes de 48 horas · una invitación antes de 2 semanas, si la pidieron · una visita solo si la piden']]);
  c('…the health fair to Community Services (EN): its one page reads the title, his next step, two steps, one safeguard, the review row; no WHAT row (the title says it)', (() => {
    const r = all.find(x => x.lang === 'en' && x.id === 'health-expo' && x.g === 'community' && x.timing === 'options'), t = r.lines.map(l => l.t);
    return [r.n, r.lv, t.includes(r.title), t.includes('Plant-based cooking school (series · 6 sessions)'), t.filter(s => /^\d\. /.test(s)).length, t.includes('WHAT'), t.includes('REPORT'),
      t.includes('A thank-you within 48 hours · an invitation within 2 weeks, if they asked · a visit only if they ask')]; })(), [1, 4, true, true, 2, false, false, true]);

  console.log('\n-- every event and series built-in with a follow-up plan, to Community Services, both timings --');
  const bi = [];
  for (const [PP, lang] of [[P, 'en'], [Pes, 'es']]) for (const id of FU_IDS) for (const timing of ['options', 'fixed']) bi.push({ lang, id, timing, ...prop(PP, id, 'community', timing) });
  console.log(`    ${bi.length} Proposals · ` + ['en', 'es'].map(l => l + ': ' + [1, 2].map(n => n + 'p ' + bi.filter(r => r.lang === l && r.n === n).length).join(', ')).join(' · '));
  c(`English: one page, all ${FU_IDS.length * 2}`, bi.filter(r => r.lang === 'en' && r.n !== 1).map(r => r.id + ':' + r.timing), []);
  c('Spanish: one page wherever v10.42.1 had one; two at most', [bi.filter(r => r.lang === 'es' && ES_ONE_PAGE_BEFORE.includes(r.id + ':' + r.timing) && r.n !== 1).map(r => r.id + ':' + r.timing), bi.filter(r => r.lang === 'es' && r.n > 2).length], [[], 0]);
  c('every line in its box', bi.filter(r => r.lines.some(l => l.out)).map(r => r.lang + ':' + r.id + ':' + r.timing), []);

  console.log('\n-- an ongoing Proposal is drawn as before: never level 4 --');
  const og = [];
  for (const [PP, lang] of [[P, 'en'], [Pes, 'es']]) for (const id of ['food-pantry', 'homework-club', 'bp-clinic', 'walking-club']) for (const timing of ['options', 'fixed'])
    og.push({ lang, id, timing, ...prop(PP, id, 'community', timing) });
  c('the food pantry, the homework club, the blood-pressure check, the walking club (EN, ES): no follow-up plan, never level 4', og.filter(r => r.err || r.fu || r.lv > 3).map(r => r.lang + ':' + r.id + ':' + r.timing), []);
  c('no page errors', [...P.errs, ...Pes.errs].filter(e => !/Not implemented/.test(e)).slice(0, 3), []);
  console.log(`\n${T.pass} passed, ${T.fail} failed`);
  process.exit(T.fail ? 1 : 0);
})();
