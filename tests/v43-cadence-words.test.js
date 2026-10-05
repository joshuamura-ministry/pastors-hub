/* v10.43 — TIMING WORDS FOLLOW THE CADENCE: an event or a series never speaks in a monthly rhythm (review, 1 Oct 2026).
 *
 * SPEC §1: "Timing wording follows the cadence (an event has a date to choose, not a weekday rhythm; a series has a number of
 * sessions; ongoing keeps today's options)." The review found one-day events still talking by the month: roles "Coordinator · 3 h a
 * month", the help line "Give 2 hours on the days it runs", the Proposal's WHO "about 4 hours a month per person", the budget's "Each
 * month: $100", the motion's "($500 to start and $100 a month)" (ES "unas 17 horas al mes por persona", "2 h al mes", "Dar 2 horas los
 * días en que se realiza"). Now an event says "in all", "on the day" and "in the weeks before and on the day"; a series "a session",
 * "at each session", "for the series"; the church's own monthly budget is named as such. Ongoing ideas are unchanged (v43-ongoing-golden).
 */
const H = require('./v43-helpers.js');
const { c, page, ready, build, T } = H;
const IDS = [...H.BUILTIN_EVENTS, ...Object.keys(H.BUILTIN_SERIES)];
const RE = { en: /\ba month\b|\bper month\b|the days it runs|\beach month\b/i, es: /\bal mes\b|los días en que se realiza|\bcada mes\b/i };
// the interest coordinator's monthly count to the board (Church Manual p. 91) is a report, not the ministry's rhythm (said in
// FOLLOWUP's list row; a PDF line may break inside it, so the PDFs are read as one text with that sentence taken out)
const LIST = /the board receives counts only, each month\.|la junta recibe solo cifras, cada mes\.|a monthly count of interests|informa cada mes a la junta/g;
const strs = (o, p, out) => { if (typeof o === 'string') out.push([p, o]); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) strs(v, p + '.' + k, out); return out; };
(async () => {
  for (const lang of ['en', 'es']) {
    const P = await ready(page('after', lang));
    console.log(`\n-- ${lang.toUpperCase()}: the ${IDS.length} event and series built-ins × board, Community Services, the whole church (deck, handout, Proposal, both PDFs) --`);
    const bad = [];
    for (const id of IDS) for (const g of ['board', 'community', 'congregation']) {
      const R = await build(P, id, g, { pdf: true });
      if (R.err) { bad.push(id + ':' + g + ' error'); continue; }
      const all = [...strs(R.d, 'deck', []), ...strs(R.H, 'handout', []), ...strs(R.Pz, 'proposal', []), ['handout.pdf', (R.hl || []).join(' ')], ['proposal.pdf', (R.pl || []).join(' ')]]
        .map(([p, s]) => [p, s.replace(/\s+/g, ' ').replace(LIST, '')]);
      all.forEach(([p, s]) => { const m = RE[lang].exec(s); if (m) bad.push(id + ':' + g + ' ' + p + ': …' + s.slice(Math.max(0, m.index - 60), m.index + 40)); });
    }
    c(`${lang}: no monthly rhythm in any of them`, [...new Set(bad)].slice(0, 8), []);
    // the words themselves, on the average church
    const roles = R => ((R.d.slides.find(s => s.type === 'roles') || {}).roles || []).map(r => r.title + ' · ' + r.hours);
    const help = R => (((R.d.slides.find(s => s.type === 'yes') || {}).options || []).find(o => o.k === 'help') || {}).text;
    const who = R => ((R.Pz.plan || []).find(p => p.k === 'who') || { lines: [] }).lines[0];
    const B = await build(P, 'backpack-giveaway', 'community'), C = await build(P, 'cooking-school', 'community'), F = await build(P, 'food-pantry', 'community');
    const W = lang === 'es'
      ? { ev: [['Coordinación · 3 h en total', 'Integrante del equipo × 5 · 2 h en total', 'Recepción · 2 h en total', 'Apoyo en oración · Unos minutos al día'], 'Dar 2 horas ese día.', '1 líder · 6 voluntarios · unas 4 horas cada persona, en las semanas previas y ese día'],
        se: [['Coordinación · 3 h por sesión', 'Integrante del equipo × 2 · 2 h por sesión', 'Recepción · 2 h por sesión', 'Apoyo en oración · Unos minutos al día'], 'Dar 2 horas en cada sesión.', '1 líder · 3 voluntarios · unas 14 horas cada persona durante la serie'],
        on: [['Coordinación · 9 h al mes', 'Integrante del equipo × 5 · 8 h al mes', 'Recepción · 8 h al mes', 'Apoyo en oración · Unos minutos al día'], 'Dar 2 horas los días en que se realiza.', '1 líder · 6 voluntarios · unas 10 horas al mes por persona'] }
      : { ev: [['Coordinator · 3 h in all', 'Team member × 5 · 2 h in all', 'Host · 2 h in all', 'Prayer partner · A few minutes a day'], 'Give 2 hours on the day.', '1 leader · 6 volunteers · about 4 hours each, in the weeks before and on the day'],
        se: [['Coordinator · 3 h a session', 'Team member × 2 · 2 h a session', 'Host · 2 h a session', 'Prayer partner · A few minutes a day'], 'Give 2 hours at each session.', '1 leader · 3 volunteers · about 14 hours each over the series'],
        on: [['Coordinator · 9 h a month', 'Team member × 5 · 8 h a month', 'Host · 8 h a month', 'Prayer partner · A few minutes a day'], 'Give 2 hours on the days it runs.', '1 leader · 6 volunteers · about 10 hours a month per person'] };
    c(`${lang}: back-to-school (one day): roles in all, help on the day, WHO in the weeks before and on the day`, [roles(B), help(B), who(B)], W.ev);
    c(`${lang}: the cooking school (6 sessions): roles a session, help at each session, WHO over the series`, [roles(C), help(C), who(C)], W.se);
    c(`${lang}: the food pantry (ongoing) keeps its monthly words`, [roles(F), who(F)], [W.on[0], W.on[2]]);
    // the money: the event's own cost once, the series' cost for the series; the church's monthly budget named as such
    const budget = R => (R.Pz.budget && R.Pz.budget.rows || []).map(r => r.join(': '));
    const ask = R => ((R.d.slides.find(s => s.type === 'ask' && !s.part) || {}).rows || []).map(r => r.join(': '));
    // v10.45.0 review round (stale, the new intent): the built-ins the needs show are priced at their source (U_LINES_OWN, review #6): the backpack giveaway is $2,300 before and $200 on the day
    const BB0 = await build(P, 'backpack-giveaway', 'board');
    c(`${lang}: back-to-school's budget and the board's ask slide: "To start · on the day", no "Each month"`, [budget(B).filter(t => /^(To start|On the day|Each month|Para empezar|Ese día|Cada mes)/.test(t)),
      ask(BB0).find(t => /^(To start|Para empezar)/.test(t))],
      lang === 'es' ? [['Para empezar: $2,300', 'Ese día: $200'], 'Para empezar · ese día: $2,300 · $200'] : [['To start: $2,300', 'On the day: $200'], 'To start · on the day: $2,300 · $200']);
    const mo = R => (/\(([^)]*)\)/.exec(R.Pz.motion) || [])[1] || null;
    const BB = await build(P, 'backpack-giveaway', 'board'), CB = await build(P, 'cooking-school', 'board');
    c(`${lang}: the board's motion: "($500 to start and $100 on the day)", the series "($75 to start and $210 for the series)"`, [mo(BB), mo(CB)],
      lang === 'es' ? ['$2,300 para empezar y $200 ese día', '$75 para empezar y $210 durante la serie'] : ['$2,300 to start and $200 on the day', '$75 to start and $210 for the series']);
    c(`${lang}: no page errors`, P.errs.filter(e => !/Not implemented/.test(e)).slice(0, 3), []);
    P.w.close();
  }
  console.log(`\n${T.pass} passed, ${T.fail} failed`);
  process.exit(T.fail ? 1 : 0);
})();
