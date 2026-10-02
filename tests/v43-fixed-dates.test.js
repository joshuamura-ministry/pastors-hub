/* v10.43 — AN EVENT OR A SERIES ON FIXED DATES says its own dates everywhere (the integrator's suite).
 *
 * The pastor (30 Sep 2026): "separate the things that are weekly or monthly — ongoing ministry — and events, which are one-time,
 * one day". DESIGN C1.6 / FOLLOWUP §2.4: with dates set (timing "fixed"), the motion says "on {start}" for an event and "from {start}
 * to {last}" for a series. Found at integration: three places still said the six-week trial's window, start to REVIEW, with the
 * trial's words — the Proposal's WHEN ("20 Oct – 3 Nov · Tuesday evening" for a one-day event on 20 Oct), the handout's ask for the
 * board and the business meeting ("Approve a one-day event, from 20 Oct to 3 Nov") and the conference's "Runs" row, and the handout's
 * review line ("Review on 3 Nov: continue, change or stop."). Now each says what the deck and the motion say; ongoing ideas keep
 * v10.42.1's words byte for byte (v43-ongoing-golden).
 */
const H = require('./v43-helpers.js');
const { c, page, ready, build, FX, T } = H;
const A = H.SEED('after');
const ADDRESS = A['terrain-churches-v1'].churches['sample-sampleton-sda'].address;
const DATA = { ...FX.DATA, geo: { ...FX.DATA.geo, matched: ADDRESS } };
const IDS = [...H.BUILTIN_EVENTS, ...Object.keys(H.BUILTIN_SERIES)];
const when = R => ((R.Pz.plan || []).find(p => p.k === 'when') || { lines: [] }).lines;
const runsRow = R => { const s = R.d.slides.find(x => x.type === 'motion'); const r = s && (s.rows || []).find(r => /^(Runs|Fechas|Se realiza|Duración)/.test(r[0])); return r ? r[1] : (s && s.rows ? s.rows.map(r => r.join(' = ')) : null); };

(async () => {
  const P = await ready(page('after', 'en', { data: DATA })), Pes = await ready(page('after', 'es', { data: DATA }));
  const has = P.E('typeof caseCadenceOf==="function"');
  c('the page has the cadence (v10.43)', has, true);

  console.log('\n-- a one-day event on 20 October (the health fair) --');
  { const R = await build(P, 'health-expo', 'board', { timing: 'fixed' }), Re = await build(Pes, 'health-expo', 'board', { timing: 'fixed' });
    c('the motion: "on 20 Oct" (as before)', [/^To approve a one-day event, on 20 Oct: /.test(R.Pz.motion), /^Aprobar un evento de un día, el 20 oct: /.test(Re.Pz.motion)], [true, true]);
    c('the Proposal\'s WHEN: the day, as the deck says it ("On 20 Oct"), not "20 Oct – 3 Nov"', [when(R), when(Re)], [['On 20 Oct · Tuesday evening'], ['El 20 oct · Martes por la noche']]);
    c('the handout\'s ask: "Approve a one-day event, on 20 Oct: …"', [/^Approve a one-day event, on 20 Oct: Full health expo — /.test(R.H.askText), /^Aprobar un evento de un día, el 20 oct: Feria de salud completa, /.test(Re.H.askText)],
      [true, true]);
    c('the handout\'s review: "hold it again" (an event), on its review day', [R.H.review, Re.H.review],
      ['Review on 3 Nov: hold it again, change it or stop.', 'Revisión el 3 nov: repetirlo, cambiarlo o dejarlo.']);
    const B = await build(P, 'backpack-giveaway', 'business', { timing: 'fixed' });
    c('the business meeting\'s ask: "…: Back-to-school backpack giveaway, on 20 Oct, with a named coordinator…"', /: Back-to-school backpack giveaway, on 20 Oct, with /.test(B.H.askText), true);
    const C = await build(P, 'health-expo', 'conference', { timing: 'fixed' }), Ce = await build(Pes, 'health-expo', 'conference', { timing: 'fixed' });
    c('the conference\'s "Runs" row: "On 20 Oct" (was "20 Oct – 3 Nov")', [runsRow(C), runsRow(Ce)], ['On 20 Oct', 'El 20 oct']);
  }

  console.log('\n-- a series: four nights in a row, and a weekly cooking school --');
  { const R = await build(P, 'four-nights', 'congregation', { timing: 'fixed' }), Re = await build(Pes, 'four-nights', 'congregation', { timing: 'fixed' });
    c('four nights: WHEN "20 Oct – 23 Oct" (its last night), not the review on 6 Nov', [when(R), when(Re)], [['20 Oct – 23 Oct · Tuesday evening'], ['20 oct – 23 oct · Martes por la noche']]);
    c('…its review: "run it again"', [R.H.review, Re.H.review], ['Review on 6 Nov: run it again, change it or stop.', 'Revisión el 6 nov: repetirla, cambiarla o dejarla.']);
    const S = await build(P, 'cooking-school', 'board', { timing: 'fixed' }), Se = await build(Pes, 'cooking-school', 'board', { timing: 'fixed' });
    c('the cooking school: WHEN "20 Oct – 24 Nov · 6 sessions" (its sixth Tuesday), the ask "from 20 Oct to 24 Nov"',
      [when(S), /^Approve a series of 6 sessions, from 20 Oct to 24 Nov: /.test(S.H.askText), when(Se), /^Aprobar una serie de 6 sesiones, del 20 oct al 24 nov: /.test(Se.H.askText)],
      [['20 Oct – 24 Nov · 6 sessions · Tuesday evening'], true, ['20 oct – 24 nov · 6 sesiones · Martes por la noche'], true]);
    const C = await build(P, 'four-nights', 'conference', { timing: 'fixed' });
    c('the conference\'s "Runs" row for four nights: "20 Oct – 23 Oct"', runsRow(C), '20 Oct – 23 Oct');
  }

  console.log('\n-- the scan: every event and series built-in, with dates, five bodies, EN + ES --');
  { const bad = [];
    for (const [PP, lang] of [[P, 'en'], [Pes, 'es']]) for (const id of IDS) for (const g of ['board', 'business', 'community', 'congregation', 'conference']) {
      const R = await build(PP, id, g, { timing: 'fixed' });
      if (R.err || !R.m || !R.m.dates || !R.m.dates.reviewText) { bad.push(lang + ':' + id + ':' + g + ' no dates'); continue; }
      const st = R.m.dates.startText, rv = R.m.dates.reviewText, e = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`${e(st)} – ${e(rv)}|from ${e(st)} to ${e(rv)}|del ${e(st)} al ${e(rv)}|continue, change or stop|continuar, cambiar o parar`);
      const strs = []; const walk = (o, p) => { if (typeof o === 'string') strs.push([p, o]); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, p + '.' + k); };
      walk(R.d, 'deck'); walk(R.H, 'handout'); walk(R.Pz, 'proposal');
      strs.filter(([p, s]) => re.test(s)).forEach(([p, s]) => bad.push(lang + ':' + id + ':' + g + ' ' + p + ': ' + s.slice(0, 90)));
    }
    c(`no deck, handout or Proposal of ${IDS.length} events and series (with dates; board, business meeting, Community Services, the whole church, the conference; EN + ES) says the trial's window or words`, bad.slice(0, 6), []); }

  console.log('\n-- a one-day event has one day, not sessions (seen in the samples: "Serves at each session" on the backpack giveaway) --');
  { const words = R => { const ro = R.d.slides.find(x => x.type === 'roles'), su = R.d.slides.find(x => x.type === 'risks' && (x.items || []).some(t => /^(Training|Capacitación)/.test(t)));
      return [((ro && ro.roles) || []).map(r => r.text).find(t => /welcome|recibe/i.test(t)) || null, ((su && su.items) || [])[0] || null]; };
    const E = await build(P, 'backpack-giveaway', 'community', {}), Ee = await build(Pes, 'backpack-giveaway', 'community', {});
    c('an event: "Serves on the day and welcomes people by name", "Training before the day" (EN, ES)', [words(E), words(Ee)],
      [['Serves on the day and welcomes people by name.', 'Training before the day'], ['Sirve ese día y recibe a las personas por su nombre.', 'Capacitación antes del día']]);
    // the whole church's "Help" said "Give one evening a month" (ongoing words) for a one-day event and a series
    const help = R => ((R.d.slides.find(x => x.type === 'yes') || {}).options || []).find(o => o.k === 'help').text;
    const C1 = await build(P, 'four-nights', 'congregation', {}), C1e = await build(Pes, 'four-nights', 'congregation', {}), C2 = await build(P, 'health-expo', 'congregation', {}), C2e = await build(Pes, 'health-expo', 'congregation', {});
    const C3 = await build(P, 'food-pantry', 'congregation', {});
    c('the whole church: "Help · Give one evening of the series" / "Give a few hours on the day" (ES too); ongoing keeps "one evening a month"',
      [help(C1), help(C1e), help(C2), help(C2e), help(C3)], ['Give one evening of the series.', 'Dar una tarde de la serie.', 'Give a few hours on the day.', 'Dar unas horas ese día.', 'Give one evening a month.']);
    const S = await build(P, 'cooking-school', 'community', {});
    c('a series keeps its sessions: "Serves at each session…", "Training before the first session"', words(S), ['Serves at each session and welcomes people by name.', 'Training before the first session']); }

  console.log('\n-- ongoing: the trial keeps its words --');
  { const R = await build(P, 'food-pantry', 'board', { timing: 'fixed' });
    c('the food pantry with dates: WHEN "20 Oct – 1 Dec", the ask "a trial of 6 weeks, from 20 Oct to 1 Dec", the review "continue, change or stop"',
      [when(R), /^Approve a trial of 6 weeks, from 20 Oct to 1 Dec: /.test(R.H.askText), R.H.review], [['20 Oct – 1 Dec · Tuesday evening'], true, 'Review on 1 Dec: continue, change or stop.']); }
  c('no page errors', [...P.errs, ...Pes.errs].filter(e => !/Not implemented/.test(e)).slice(0, 3), []);
  console.log(`\n${T.pass} passed, ${T.fail} failed`);
  process.exit(T.fail ? 1 : 0);
})();
