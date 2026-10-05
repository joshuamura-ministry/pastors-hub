/* v10.43 — THE AVERAGE CHURCH with a follow-up plan and connection cards (DESIGN.md §8.3 and §10; the integrator's suite).
 *
 * The pastor (30 Sep 2026): "A lot of our churches do a one-day thing, and after one day there needs to be some kind of
 * follow-up if we connect with the community. If people come in on a one-day event there has to be a way to collect
 * information, connect with the community, get their information somehow, so that we can build a relationship with the
 * people." Approved: "yes. it should host the connection cards tailored to the situations. and yes, the three-way split is good."
 *
 * The fixture is tests/average-church/seed-followup.json (made by the part-3 design's build-fixture.mjs, never by hand): the
 * average church AFTER its Spiritual Gifts (40 of 46 adults), with a plan of three: the health fair (health-expo, a one-day
 * event, his next step the plant-based cooking school), back-to-school (backpack-giveaway, an event for parents) and the
 * 4-night series (four-nights), each with a connection card; 23 made-up adult answers for the health fair (14 thanked, 12
 * invited, 2 visits asked, 9 took the next step), 6 for back-to-school (1 took the next step), none yet for the series.
 * The clock is frozen at 1 October 2026, 3 pm (v43-helpers), so "due today" is stable: 2 for the health fair.
 *
 * Held here: the fixture agrees with the timeline (DESIGN C1.10); the cards are the app's own tailoring (CONNECT §4.3) with
 * their looks; the decks, handouts and Proposals carry the follow-up plan with COUNTS ONLY; none of the made-up names, phones,
 * emails or notes reach a slide, a handout, a Proposal, a phone's PDF or any request; his own list on his device (the
 * Connections list, step 3's card); "Your path" and "What's next" on this church. EN and ES. With REQUIRE_V43=1 (run-all) a
 * page without v10.43 fails; without it such checks print PENDING.
 */
const REQUIRE_V43 = process.env.REQUIRE_V43 === '1';
const fs = require('fs'), path = require('path');
const H = require('./v43-helpers.js');
const { c, sleep, until, page, ready, build, slide, FX, T } = H;
const FXD = path.join(__dirname, 'average-church');
const SEED = v => JSON.parse(fs.readFileSync(path.join(FXD, `seed-${v}.json`), 'utf8'));
const F = SEED('followup'), A = SEED('after');
const CID = 'sample-sampleton-sda';
const CH = F['terrain-churches-v1'].churches[CID];
const KEYNAMES = JSON.parse(fs.readFileSync(path.join(FXD, 'gifts-after-key.json'), 'utf8')).members.map(m => m.name);
const PEOPLE = Object.values(CH.connect.people).flat();
const NAMES = PEOPLE.map(p => p.name), FIRST = NAMES.map(n => n.replace(/ \(sample\)$/, ''));
const CONTACTS = PEOPLE.filter(p => p.reach).map(p => p.reach.v), NOTES = PEOPLE.map(p => p.note).filter(Boolean);
// what must never be shared: each made-up full name, each first name as a whole word (case-sensitive), every phone, email and note
const LEAKS = s => [...NAMES.filter(n => s.includes(n)), ...FIRST.filter(f => new RegExp('(?<![\\p{L}\\p{N}])' + f + '(?![\\p{L}\\p{N}])', 'u').test(s)),
  ...CONTACTS.filter(v => s.includes(v)), ...NOTES.filter(n => s.includes(n))];
let pending = 0;
const v43 = (n, ok, note) => { if (ok) c(n, true); else if (REQUIRE_V43) c(n + (note ? '  — ' + note : ''), false); else { console.log('  PENDING  [v43] ' + n); pending++; } };
const ADDRESS = A['terrain-churches-v1'].churches[CID].address;
// the survey's tract with the made-up church's own address, so opening the survey keeps this church (uEnsureChurch)
const DATA = { ...FX.DATA, geo: { ...FX.DATA.geo, matched: ADDRESS } };

(async () => {
  console.log('\n-- the fixture: the average church after its gifts, a plan of three, his next step, three cards --');
  { const ch0 = A['terrain-churches-v1'].churches[CID];
    const same = Object.keys(ch0).filter(k => JSON.stringify(ch0[k]) !== JSON.stringify(CH[k]));
    c('seed-followup is seed-after with only the plan, his next step and the cards added', [same, Object.keys(CH).filter(k => !(k in ch0)).sort(),
      JSON.stringify(F['terrain-gifts-roster']) === JSON.stringify(A['terrain-gifts-roster']), JSON.stringify(F['terrain-reg']) === JSON.stringify(A['terrain-reg'])],
      [['selected'], ['connect', 'followUp'], true, true]);
    c('the plan: the health fair, back-to-school, the 4-night series; his next step for the health fair: the cooking school',
      [CH.selected, CH.followUp['health-expo'].next.id], [['health-expo', 'backpack-giveaway', 'four-nights'], 'cooking-school']);
    c('every made-up name ends "(sample)", none is a gifts respondent\'s, no first name twice', [NAMES.every(n => / \(sample\)$/.test(n)), NAMES.filter(n => KEYNAMES.includes(n)), new Set(FIRST).size === FIRST.length], [true, [], true]);
    const KEYS = ['id', 'src', 'ts', 'lang', 'name', 'picks', 'reach', 'consent', 'safe', 'note', 'cv', 'keep', 'fu'];
    c('adults only, in the shape the device keeps (no age, no child, nothing else): CONNECT §6.7', PEOPLE.filter(p => JSON.stringify(Object.keys(p)) !== JSON.stringify(KEYS)).map(p => p.name), []);
    const INVITE = ['next', 'news', 'events', 'series', 'remind', 'study', 'help'];
    const bad = [];
    for (const [ideaId, card] of Object.entries(CH.connect.cards)) for (const p of CH.connect.people[card.id] || []) {
      const on = new Set(card.opts.filter(o => !o.off).map(o => o.k));
      if (p.picks.some(k => !on.has(k))) bad.push(p.name + ': a choice not on the card');
      if (!p.reach && p.picks.some(k => card.opts.find(o => o.k === k).contact)) bad.push(p.name + ': a choice that needs contact, without one');
      if (!!p.reach !== !!p.consent) bad.push(p.name + ': consent only with contact');
      if (p.fu.thanks && !p.reach) bad.push(p.name + ': thanked without contact');
      if (p.fu.invite && !(p.reach && p.picks.some(k => INVITE.includes(k)))) bad.push(p.name + ': invited without asking');
      if (p.fu.visit && !p.picks.includes('visit')) bad.push(p.name + ': a visit not asked for');
      if (p.picks.includes('nothing') && p.picks.length > 1) bad.push(p.name + ': "nothing more" with another choice');
    }
    c('the ticks agree with the timeline (C1.10, D4): thanked = left a phone or email; invited = also ticked what comes next; a visit only if asked', bad, []);
  }

  const P = await ready(page('followup', 'en', { data: DATA })), Pes = await ready(page('followup', 'es', { data: DATA }));
  const has = P.E('typeof fuApplies==="function"&&typeof cnTailor==="function"&&typeof cnResults==="function"&&typeof hubPath==="function"');
  v43('the page has the follow-up plan, the connection cards and section 5 (v10.43)', has);
  if (!has) { console.log(`\n${T.pass} passed, ${T.fail} failed${pending ? ', ' + pending + ' pending' : ''}`); process.exit(T.fail ? 1 : 0); }

  console.log('\n-- three kinds of ministry, and the next step each one feeds --');
  c('cadence: a one-day event, a one-day event, a series of 4 nights in a row', P.J(`['health-expo','backpack-giveaway','four-nights'].map(id=>{ const k=caseCadenceOf(cnItemOf(id)); return [k.c,k.n,k.row]; })`),
    [['event', null, false], ['event', null, false], ['series', 4, true]]);
  c('each has a follow-up plan and is offered a connection card', P.J(`['health-expo','backpack-giveaway','four-nights'].map(id=>[fuApplies(cnItemOf(id)),cnEligible(cnItemOf(id))])`), [[true, true], [true, true], [true, true]]);
  c('the next step: his own pick (the cooking school), and the curated suggestions (the homework club, the kitchen-table study)',
    P.J(`['health-expo','backpack-giveaway','four-nights'].map(id=>{ const n=fuNextOf(cnItemOf(id)); return [n.id,n.suggested,n.why,n.name.en]; })`),
    [['cooking-school', false, null, 'Plant-based cooking school'], ['homework-club', true, 'fit', 'Weekly homework club'], ['kitchen-study', true, 'fit', 'One study, at one kitchen table']]);

  console.log('\n-- the three connection cards: the app\'s own tailoring, each with its look --');
  for (const id of ['health-expo', 'backpack-giveaway', 'four-nights']) {
    const d = P.J(`cnDraftFor(cnItemOf(${JSON.stringify(id)}))`), card = CH.connect.cards[id];
    const K = ['kind', 'look', 'cadence', 'church', 'title', 'parent', 'note', 'partner', 'opts'];
    c(`${id}: the card is the tailoring (kind, look, choices and their words, parent, title)`, K.filter(k => JSON.stringify(d[k]) !== JSON.stringify(card[k])), []);
  }
  c('looks: health · family · prayer; for parents only back-to-school, with no "screening results" on it', [Object.values(CH.connect.cards).map(x => x.look), Object.values(CH.connect.cards).map(x => x.parent),
    CH.connect.cards['backpack-giveaway'].opts.some(o => o.k === 'results')], [['health', 'family', 'prayer'], [false, true, false], false]);
  c('the next step\'s words as CONNECT §4.3 (EN)', Object.values(CH.connect.cards).map(x => x.opts[0].en),
    ['Tell me about the plant-based cooking school', 'Tell me about the weekly homework club', 'Tell me about “One study, at one kitchen table”']);
  c('…and in Spanish (de + el → del; quoted → sobre «»)', Object.values(CH.connect.cards).map(x => x.opts[0].es),
    ['Quiero saber más de la escuela de cocina a base de plantas', 'Quiero saber más del club semanal de tareas escolares', 'Quiero saber más sobre «Un estudio, en la mesa de una cocina»']);
  c('the thank-you names the next step and when it starts (D12), EN', P.J(`(t=>[t.head,t.body,t.starts])(cnThanks(cnCardFor('health-expo'),['next'],'Anita','en'))`),
    ['Thank you, Anita', 'Within two weeks we’ll tell you more about the plant-based cooking school.', 'It starts: Tuesday evenings, from October 13']);   // v10.43 (review, 1 Oct 2026): the fixture's cooking school starts after the samples' date (was September 29)
  c('…ES', P.J(`(t=>[t.head,t.body,t.starts])(cnThanks(cnCardFor('health-expo'),['next'],'Anita','es'))`),
    ['Gracias, Anita', 'En las próximas dos semanas le contaremos más de la escuela de cocina a base de plantas.', 'Comienza: Los martes por la noche, desde el 13 de octubre']);

  console.log('\n-- counts only, from his device (DESIGN C1.13) --');
  c('the health fair: 23 connected, 15 left a phone or email, 14 thanked, 12 invited, 2 asked for a visit, 9 took the next step',
    P.J(`(r=>[r.connected,r.reached,r.thanked,r.invited,r.visitAsked,r.nextTaken])(cnResults('health-expo'))`), [23, 15, 14, 12, 2, 9]);
  c('…due today (1 October): a late thank-you and a late visit', P.J(`(d=>[d.thanks,d.invite,d.visit,d.late,d.total])(cnDueFor('health-expo'))`), [1, 0, 1, 2, 2]);
  c('back-to-school: 6 connected, 1 took the next step, nothing due; the 4-night series: none yet', P.J(`[fuCounts('backpack-giveaway').connected,fuCounts('backpack-giveaway').nextTaken,fuCounts('backpack-giveaway').due,fuCounts('four-nights').connected]`), [6, 1, 0, 0]);

  const shared = [];   // every JSON and PDF line that leaves his device, for the names check below
  console.log('\n-- the health fair to the church board (EN, ES) --');
  for (const [PP, lang] of [[P, 'en'], [Pes, 'es']]) {
    const R = await build(PP, 'health-expo', 'board', { pdf: true });
    shared.push(JSON.stringify(R.d), JSON.stringify(R.H), JSON.stringify(R.Pz), (R.hl || []).join('\n'), (R.pl || []).join('\n'));
    const parts = R.d.slides.map(s => s.part || s.type), i = parts.indexOf('after'), a = slide(R, 'after');
    c(`${lang}: 12 slides; the After slide right after "decide" and before the ask (the ${i + 1}th)`, [R.d.slides.length, parts[i - 1], R.d.slides[i + 1] && R.d.slides[i + 1].type], [12, 'decide', 'ask']);
    c(`${lang}: "After the day" — the next step, the timeline, the list, and "So far" with two counts; no visit row beside it`, [a.kicker, a.rows.map(r => r[0]), a.rows[0][1], a.rows[a.rows.length - 1][1]],
      lang === 'en' ? ['After the day', ['Next step', 'Within 48 hours', 'Within 2 weeks', 'The list', 'So far'], 'Plant-based cooking school', '23 connected · 9 took the next step']
        : ['Después del evento', ['Siguiente paso', 'Antes de 48 horas', 'Antes de 2 semanas', 'La lista', 'Hasta ahora'], 'Escuela de cocina a base de plantas', '23 en contacto · 9 dieron el siguiente paso']);
    c(`${lang}: the handout's Follow-up plan, with the counts`, [R.hl.includes(lang === 'en' ? 'FOLLOW-UP PLAN' : 'PLAN DE SEGUIMIENTO'), R.hl.some(l => (lang === 'en' ? /23 connected · 9 took the next step/ : /23 en contacto · 9 dieron el siguiente paso/).test(l))], [true, true]);
    c(`${lang}: the Proposal's Follow-up plan, with the counts`, [R.pl.includes(lang === 'en' ? 'FOLLOW-UP PLAN' : 'PLAN DE SEGUIMIENTO'), R.pl.some(l => (lang === 'en' ? /^23 connected · 9 took the next step\.$/ : /^23 en contacto · 9 dieron el siguiente paso\.$/).test(l))], [true, true]);
    c(`${lang}: the motion names the cooking school ("…with the follow-up plan: an invitation to {next} within two weeks, for those who ask")`,
      (lang === 'en' ? /; with the follow-up plan \(an invitation to the plant-based cooking school within two weeks, for those who ask\);/ : /; con el plan de seguimiento \(una invitación a la escuela de cocina a base de plantas en un plazo de dos semanas, para quienes la pidan\);/).test(R.Pz.motion), true);
    // a member's copy, as phones download it (caseHandout(null, deck)): the After slide read back, still counts only
    const mem = PP.J(`(()=>{ const m=caseModel('health-expo',{type:'board',group:'board'},{timing:'options'}); const d=caseDeck(m); const H=caseHandout(null,d); const doc=casePdfDoc(H,{jsPDF:window.jspdf.jsPDF}); return {j:JSON.stringify(H),l:(doc.__caseLog||[]).map(x=>x.t)}; })()`);
    shared.push(mem.j, mem.l.join('\n'));
    c(`${lang}: a member's copy (phones) carries the plan and the counts`, mem.l.some(l => (lang === 'en' ? /23 connected · 9 took the next step/ : /23 en contacto · 9 dieron el siguiente paso/).test(l)), true);
  }

  console.log('\n-- back-to-school to Community Services (a team), for parents --');
  for (const [PP, lang] of [[P, 'en'], [Pes, 'es']]) {
    const R = await build(PP, 'backpack-giveaway', 'community', { pdf: true });
    shared.push(JSON.stringify(R.d), JSON.stringify(R.H), JSON.stringify(R.Pz), (R.hl || []).join('\n'), (R.pl || []).join('\n'));
    const a = slide(R, 'after');
    c(`${lang}: the After slide: "Next step · Weekly homework club", "So far · 6 connected · 1 took the next step"`, [a.rows[0], a.rows[a.rows.length - 1]],
      lang === 'en' ? [['Next step', 'Weekly homework club'], ['So far', '6 connected · 1 took the next step']] : [['Siguiente paso', 'Club semanal de tareas escolares'], ['Hasta ahora', '6 en contacto · 1 dio el siguiente paso']]);
  }

  console.log('\n-- the 4-night series to the whole church --');
  for (const [PP, lang] of [[P, 'en'], [Pes, 'es']]) {
    const R = await build(PP, 'four-nights', 'congregation', { pdf: true });
    shared.push(JSON.stringify(R.d), JSON.stringify(R.H), JSON.stringify(R.Pz), (R.hl || []).join('\n'), (R.pl || []).join('\n'));
    const a = slide(R, 'after');
    c(`${lang}: "After the series", the kitchen-table study; no "So far" row before anyone has answered`, [a.kicker, a.rows[0][1], a.rows.some(r => /So far|Hasta ahora/.test(r[0]))],
      lang === 'en' ? ['After the series', 'One study, at one kitchen table', false] : ['Después de la serie', 'Un estudio, en la mesa de una cocina', false]);
  }

  console.log('\n-- names stay on his device: never on a slide, a handout, a Proposal, a phone\'s PDF or a request --');
  c('none of the made-up names, phones, emails or notes in the 6 decks, handouts and Proposals, their PDFs or a member\'s copy (EN, ES)', [...new Set(shared.flatMap(LEAKS))], []);
  { // every request the app makes on the way: the hub (the quiet pull), the survey, Make the Case to step 3, the slides opened live
    const bodies = [];
    P.w.fetch = async (u, o) => { u = String(u); bodies.push(u + ' ' + (o && o.body ? String(o.body) : ''));
      const m = /^\/ideas\/([a-z-]+)\.json$/.exec(u);
      if (m) { const t = fs.readFileSync(path.join(H.ROOT, 'ideas', m[1] + '.json'), 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(t) }; }
      if (/connect/.test(u)) return { ok: true, status: 200, json: async () => ({ ok: true, items: [], card: null, next: null }) };
      if (/present/.test(u)) return { ok: true, status: 200, json: async () => ({ ok: true, room: 'ROOMSAMPLE', key: 'k'.repeat(43), code: '123456', url: 'https://pastorshub.org/#watch=ROOMSAMPLE', expires: Date.now() + 864e5, v: 1, mode: 'follow', pdf: true }) };
      return { ok: true, status: 200, json: async () => ({ enabled: false }) }; };
    P.E(`CN_QUIET_AT=0; Object.values(uChurch().connect.cards).forEach(x=>x.lastPull=0); showHub(); 1`); await sleep(300);
    P.E(`openTool('survey'); render(); 1`); await sleep(200);
    P.E(`openTool('case'); caseMount(true); caseChooseGroup('board'); caseChoose('health-expo'); 1`); await until(() => P.q('#cs-fu:not([hidden])'), 8000);
    await P.E(`(async()=>{ try{ await prEnsureRoom({deck:CASE_ST.deck,model:CASE_ST.model,respond:false}); }catch(e){ window.__pe=String(e); } })()`); await sleep(300);
    c('the requests on the way carry none of them (the pull asks by the card\'s id and key only)', [bodies.length > 3, bodies.some(b => /"op":"pull"/.test(b)), bodies.some(b => /"op":"open"/.test(b)), [...new Set(bodies.flatMap(LEAKS))]], [true, true, true, []]);
  }

  console.log('\n-- his own list, on his device --');
  for (const [PP, lang] of [[P, 'en'], [Pes, 'es']]) {
    PP.E(`cnOpenList(cnItemOf('health-expo')); 1`); await sleep(150);
    const t = PP.txt('#cn-sheet') || '';
    c(`${lang}: the Connections list: the counts strip and what is due today`, [(lang === 'en' ? /23 connected · 14 thanked · 12 invited · 9 took the next step/ : /23 en contacto · 14 con agradecimiento · 12 con invitación · 9 dieron el siguiente paso/).test(t),
      (lang === 'en' ? /Due today: 1 thank-you · 1 visit \(2 late\)/ : /Para hoy: 1 agradecimiento · 1 visita \(2 con retraso\)/).test(t), t.includes('Anita (sample)')], [true, true, true]);
    PP.E(`(document.querySelector('#cn-sheet [data-cn-close]')||{click(){}}).click(); 1`);
  }
  P.E(`openTool('case'); caseMount(true); caseChooseGroup('board'); caseChoose('health-expo'); 1`); await until(() => P.q('#cs-fu:not([hidden])'), 8000); await sleep(50);
  c('step 3\'s "After the day": his pick, the card made, "So far: 23 connected · 9 took the next step · 2 due today"', [P.txt('#cs-fu [data-fu-name]'), P.txt('#cs-fu [data-fu-make]'), P.txt('#cs-fu .cs-fuso')],
    ['Plant-based cooking school', 'Connection card', 'So far: 23 connected · 9 took the next step · 2 due today']);

  console.log('\n-- section 5 on this church: "Your path" and "What\'s next" --');
  for (const [PP, lang] of [[P, 'en'], [Pes, 'es']]) {
    PP.E(`showHub(); 1`); await sleep(50);
    c(`${lang}: Your path: done · 40 of 46 · 3 ministries in your plan · done`, PP.qa('#hubpath .hp-step small').map(s => s.textContent),
      lang === 'en' ? ['Done ✓', '40 of 46', '3 ministries in your plan', 'Done ✓'] : ['Hecho ✓', '40 de 46', '3 ministerios en su plan', 'Hecho ✓']);
    PP.E(`openTool('survey'); render(); 1`); await sleep(150);
    c(`${lang}: What's next: one "Make the case" per ministry in the plan, at step 1; a connection card beside each (all three are cnEligible)`,
      [PP.qa('#u-whatsnext [data-u-next-case]').map(b => b.dataset.uNextCase), PP.qa('#u-whatsnext [data-u-next-card]').length, PP.qa('#u-whatsnext [data-u-next-case]')[0].textContent.trim()],
      [['health-expo', 'backpack-giveaway', 'four-nights'], 3, lang === 'en' ? 'Create the proposal for the full health expo' : 'Crear la propuesta para la feria de salud completa']);   // v10.45.0 review #27d: one name for the proposal   // v10.43 (review, 1 Oct 2026): the Spanish name cut where the English is (it read «…, con pruebas y una ruta de derivación»)   // a name with a comma is quoted (CONNECT §4.3, rule 6)
  }
  c('no page errors', [...P.errs, ...Pes.errs].filter(e => !/Not implemented/.test(e)).slice(0, 3), []);
  console.log(`\n${T.pass} passed, ${T.fail} failed${pending ? ', ' + pending + ' pending' : ''}`);
  process.exit(T.fail ? 1 : 0);
})();
