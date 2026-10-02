/* v56 · Make the Case · projects and purchases: the screens (DESIGN-PURCHASE.md §1, §6.1, §7.8, §10 T3).
 * The pastor's rules for screens: framed steps, coloured sections, few words, plain words, English and Spanish, never "AI". His answers
 * (2 Oct 2026): "Find prices" only on his tap and only on an unlocked device; he can always type or edit his own three quotes. Held here in
 * jsdom (the pixels are a Chrome gate, work/screens.mjs): the switch above Make the Case (the ministry path below it unchanged); five
 * framed steps, each its own colour and one short line, EN + ES; nine kinds of need; the reasons of each; the goal suggestion; Find prices
 * absent without the server's yes or the device's passphrase ("Type your three quotes."), and its whole round with a stubbed server
 * (found prices never overwrite his typed ones, "Also found"; failed, the limit and the lock each in the page's own words); the quote letter
 * in both languages; the money rules on screen (tithe, raffles, the offering's Sabbath, work days); who decides, the audiences, and Record
 * what we decided with no day or length to agree; the actions of step 5.
 */
const H = require('./v43-helpers.js');
const { c, page, ready, done, until, sleep, FX, SEED } = H;
const ADDR = SEED('purchase')['terrain-churches-v1'].churches['sample-sampleton-sda'].address;
const DATA = { ...FX.DATA, geo: { ...FX.DATA.geo, matched: ADDR } };
const ID = 'buy-avs001';
async function open(L, prefs) {
  const P = await ready(page('purchase', L, { data: DATA }));
  P.E(`(()=>{ const ch=uChurch(); ch.proposalPrefs={...(ch.proposalPrefs||{}),...${JSON.stringify(prefs || { path: 'buy', buy: ID })}}; uPersist(); openTool('case'); render(); return 1; })()`);
  await until(() => P.q('#cs-switch [data-bx-path]'), 8000);
  return P;
}
(async () => {
  const P = await open('en');
  c('no page errors', P.errs, []);
  const has = !!P.q('#bx-s1');
  c('Make the Case draws the purchase path when chosen (v56)', has);
  if (!has) return done();

  console.log('\n-- the switch: "Make the case for: A ministry | A project or purchase" --');
  c('the switch, above the steps, in its own place', [P.txt('#cs-switch .bx-swl'), P.qa('#cs-switch [data-bx-path]').map(b => [b.textContent, b.getAttribute('aria-pressed')])],
    ['Make the case for:', [['A ministry', 'false'], ['A project or purchase', 'true']]]);
  P.q('[data-bx-path="ministry"]').click(); await sleep(50);
  c('"A ministry": exactly the ministry path\'s steps in #casebody (the step bar, then steps 1, 2, 3), no purchase step', [P.qa('#casebody > *').map(e => e.id || e.className).filter(id => id !== 'cs-gff').slice(0, 4), !!P.q('#bx')],
    [['cs-bar', 'cs-s1', 'cs-s2', 'cs-s3'], false]);
  c('…and casePrefs() is as it was (the path is kept beside it)', P.J('casePrefs()'), { ministry: null, type: null, group: null, plan: false });
  P.q('[data-bx-path="buy"]').click(); await sleep(50);
  c('"A project or purchase" again: the five steps, the project row and the bar', [!!P.q('#bx-items'), P.qa('#bx .bx-step').length, P.qa('#bx-bar .cs-st').length], [true, 5, 5]);

  console.log('\n-- five framed steps, each its own colour, one short line --');
  const heads = Q => [1, 2, 3, 4, 5].map(n => [Q.q('#bx-s' + n).dataset.bxHue, Q.txt('#bx-s' + n + ' .cs-sh h3'), Q.txt('#bx-s' + n + ' .cs-sh .note')]);
  c('EN', heads(P).map(h => h.slice(0, 2)), [['people', 'Step 1 of 5: What do you need?'], ['housing', 'Step 2 of 5: Three options'], ['hardship', 'Step 3 of 5: How we’ll pay'], ['children', 'Step 4 of 5: Who decides'], ['language', 'Step 5 of 5: Present and vote']]);
  c('…their lines', heads(P).slice(0, 4).map(h => h[2]), ['And why it matters for ministry.', 'Find prices, or type your own.', 'Offerings and gifts. Never tithe.', 'Your church’s path.']);
  const S = await open('es');
  c('ES', heads(S).map(h => h[1]), ['Paso 1 de 5: ¿Qué necesitan?', 'Paso 2 de 5: Tres opciones', 'Paso 3 de 5: Cómo lo pagaremos', 'Paso 4 de 5: Quién decide', 'Paso 5 de 5: Presentar y votar']);
  c('…the switch in Spanish', [S.txt('#cs-switch .bx-swl'), S.qa('#cs-switch [data-bx-path]').map(b => b.textContent)], ['Presentar la propuesta de:', ['Un ministerio', 'Un proyecto o compra']]);
  c('the bar\'s compact line names the current step (under 760 px the numbers alone show)', [P.txt('#bx-barnow'), S.txt('#bx-barnow')], ['Who decides', 'Quién decide']);

  console.log('\n-- ① What do you need? --');
  c('nine kinds of need', P.qa('[data-bx-cat]').map(b => b.textContent), ['Sound', 'Livestream & video', 'Lighting', 'Computer & projector', 'Music instruments', 'Building repair', 'Kitchen', 'Vehicle', 'Something else']);
  c('…in Spanish', S.qa('[data-bx-cat]').map(b => b.textContent), ['Sonido', 'Transmisión y video', 'Iluminación', 'Computadora y proyector', 'Instrumentos musicales', 'Reparación del edificio', 'Cocina', 'Vehículo', 'Otra cosa']);
  c('the reasons of the livestream (DESIGN §1.2), the two he ticked pressed, his count beside it', [P.qa('[data-bx-why]').map(b => b.dataset.bxWhy), P.qa('[data-bx-why][aria-pressed="true"]').map(b => b.dataset.bxWhy), P.q('[data-bx-n="shutins"]').value],
    [['shutins', 'neighbours', 'guests', 'ministries', 'reliability'], ['shutins', 'ministries'], '9']);
  c('"Ministries in our plan" says which (computed from the plan)', P.txt('.bx-plan'), '2 in your plan: Full health expo · Four nights');
  c('cared for by the team of its kind, with Change', P.txt('.bx-team > span'), 'Cared for by: Media & communication');
  P.q('[data-bx-item=""]').click(); await sleep(30);
  c('"+ New": only the kinds of need, nothing else yet; steps 2–5 say "First say what you need, in step 1."', [P.qa('[data-bx-cat]').length, !!P.q('[data-bx-f="need"]'), P.txt('#bx-s2 .bx-first')], [9, false, 'First say what you need, in step 1.']);
  P.q('[data-bx-cat="kitchen"]').click(); await sleep(30);
  const nid = P.E('BUY_ST.id');
  c('a tap on Kitchen makes the project: its kinds (Buy it · Repair or install · Build or add on), the deacons to care for it', [/^buy-[a-z0-9]{6}$/.test(nid), P.qa('[data-bx-kind]').map(b => b.textContent), P.J(`buyGet(BUY_ST.id).team`)], [true, ['Buy it', 'Repair or install', 'Build or add on'], 'deacons']);
  const need = P.q('[data-bx-f="need"]'); need.value = 'A new commercial stove for the fellowship meals'; need.dispatchEvent(new P.w.Event('input')); await sleep(400);
  c('his words name it (the suggestion in the short name\'s box)', [P.q('[data-bx-f="name"]').placeholder, P.J(`buyName(buyGet(BUY_ST.id),'en')`)], ['Commercial stove', 'Commercial stove']);
  P.q('[data-bx-why="meals"]').click(); await sleep(400);
  c('the goal follows: "{name}, so that {outcome}"', P.q('[data-bx-goal]').value, 'Commercial stove, so that we can serve meals well and safely.');
  P.q('[data-bx-why="ministries"]').click(); await sleep(50);
  c('no ministry in the plan needs the kitchen: "None in your plan yet"', P.txt('.bx-plan'), 'None in your plan yet');
  const tg = P.q('[data-bx-f="name"]'); tg.value = '<b>Stove</b>'; tg.dispatchEvent(new P.w.Event('input')); await sleep(50);
  c('markup is refused, in plain words', [P.txt('[data-bx-err1]'), P.J(`buyGet(BUY_ST.id).name.en||null`)], ['Plain words only, please (no < or >).', null]);
  c('Spanish goal: "para que" and the subjunctive', S.J(`(()=>{ const it=buyNew('kitchen'); it.name={es:'Estufa comercial'}; it.why=[{k:'meals'}]; return buyGoalSuggest(it,'es'); })()`), 'Estufa comercial, para que podamos servir comidas bien y con seguridad.');

  console.log('\n-- ② Three options --');
  P.q(`[data-bx-item="${ID}"]`).click(); await sleep(50);
  c('three cards, Good · Better · Best, the recommended one marked', [P.qa('.bx-opt').map(o => o.querySelector('.bx-tier').textContent), P.qa('.bx-opt.rec').map(o => o.dataset.bxOpt), P.txt('.bx-opt.rec .bx-price'), P.txt('.bx-opt.rec .bx-star')],
    [['Good', 'Better', 'Best'], ['b'], '$3,400', '★ Recommended']);
  c('the chart\'s rows on a card', P.qa('.bx-opt[data-bx-opt="b"] dt').map(d => d.textContent), ['Where to buy', 'Warranty', 'Installation', 'Running costs', 'Checked']);
  c('without the server\'s yes, no Find prices: "Type your three quotes."', [!!P.q('[data-bx-find]'), P.txt('.bx-typeown')], [false, 'Type your three quotes.']);
  P.q('[data-bx-rec="c"]').click(); await sleep(30);
  c('"Recommend this one" moves the star', [P.J(`buyGet('${ID}').pick`), P.qa('.bx-opt.rec').map(o => o.dataset.bxOpt)], ['c', ['c']]);
  P.E(`(()=>{ const it=buyGet('${ID}'); it.pick='b'; buySave(it); buyDraw2(); return 1; })()`);
  P.q('[data-bx-edit="a"]').click(); await sleep(30);
  const f = s => P.q(`[data-bx-oform="a"] [data-bx-of="${s}"]`);
  f('price').value = '0'; P.q('[data-bx-oform="a"]').dispatchEvent(new P.w.Event('submit', { cancelable: true })); await sleep(30);
  c('a price of 0 is refused, in plain words', P.txt('[data-bx-oerr]'), 'Type the price in dollars, more than 0.');
  f('price').value = '1240'; f('url').value = 'http://cheap.example.com/x'; P.q('[data-bx-oform="a"]').dispatchEvent(new P.w.Event('submit', { cancelable: true })); await sleep(30);
  c('a link that is not https is refused', P.txt('[data-bx-oerr]'), 'A link must start with https:// and name a website.');
  f('url').value = 'https://www.shop.example.com/mixer'; P.q('[data-bx-oform="a"]').dispatchEvent(new P.w.Event('submit', { cancelable: true })); await sleep(30);
  c('saved: his own, typed; the store page opens in a new tab, no referrer', [P.J(`(()=>{ const o=buyOpt(buyGet('${ID}'),'a'); return [o.src,o.price,o.host]; })()`), (() => { const a = P.q('.bx-opt[data-bx-opt="a"] a'); return a && [a.getAttribute('target'), a.getAttribute('rel')]; })()],
    [['typed', 1240, 'shop.example.com'], ['_blank', 'noopener noreferrer']]);

  console.log('\n-- Find prices (stubbed server: nothing spent) --');
  const stub = (P, plan) => { const calls = []; P.w.fetch = async (u, o) => { u = String(u); const b = o && o.body ? JSON.parse(o.body) : null; calls.push({ u, b, h: o && o.headers });
    if (/\/ideas\//.test(u)) return new Promise(() => {});
    if (/advise/.test(u) && (!o || o.method !== 'POST')) return { ok: true, status: 200, json: async () => ({ enabled: true, prices: plan.on !== false }) };
    if (b && b.mode === 'prices') return { ok: plan.start === 202, status: plan.start, json: async () => plan.startBody };
    if (b && b.mode === 'prices-status') { const n = plan.status.shift() || plan.status.last; return { ok: n.status === 200, status: n.status, json: async () => n.body }; }
    return new Promise(() => {}); }; return calls; };
  P.E(`localStorage.setItem('terrain-ai-pass','pastor-pass'); BUY_PRICES.info=null; BUY_PRICES.poll=10; 1`);
  const sample = [{ id: 'b', tier: 'better', src: 'search', checked: '2026-10-01', name: { en: 'Digital mixer and PTZ camera kit' }, store: 'Sweetwater', host: 'sweetwater.com', url: 'https://www.sweetwater.com/store/detail/kit', price: 3290, extra: 0, features: { en: ['Saved settings'] }, warranty: { en: '2 years' }, install: { how: 'pro', cost: 0 }, running: null, alsoAt: [] },
    { id: 'c', tier: 'best', src: 'search', checked: '2026-10-01', name: { en: 'Two-camera studio kit' }, store: 'B&H Photo', host: 'bhphotovideo.com', url: 'https://www.bhphotovideo.com/c/product/1', price: 7990, extra: 0, features: { en: [] }, warranty: null, install: { how: 'pro', cost: 0 }, running: null, alsoAt: [] }];
  let calls = stub(P, { start: 202, startBody: { ok: true, job: 'J'.repeat(22), key: 'K'.repeat(43), poll: 4000 }, status: [{ status: 200, body: { ok: true, status: 'running' } }, { status: 200, body: { ok: true, status: 'done', checked: '2026-10-01', options: sample, notes: [] } }] });
  P.E(`(()=>{ const it=buyGet('${ID}'); it.options=it.options.filter(o=>o.id!=='b'); it.pick=null; buySave(it); buyDrawAll(); return 1; })()`);
  await until(() => P.q('[data-bx-find]'), 3000);
  c('with the server\'s yes and an unlocked device: Find prices, "About a minute."', [P.txt('[data-bx-find]'), P.txt('.bx-find .note')], ['Find prices', 'About a minute.']);
  P.q('[data-bx-find]').click(); await sleep(5);
  c('while it looks: "Looking at store websites…", the button disabled', [P.txt('[data-bx-find]'), P.q('[data-bx-find]').disabled], ['Looking at store websites…', true]);
  await until(() => !P.E(`!!BUY_PRICES.run['${ID}']`) && /Found/.test(P.txt('[data-bx-pmsg]') || ''), 5000);
  const req = calls.find(x => x.b && x.b.mode === 'prices');
  c('the request: the passphrase in its header, the device id, the item\'s own words only, the church\'s town and state (never a person, a name or the church\'s name)',
    [req.h['x-terrain-pass'], /^[A-Za-z0-9_-]{22}$/.test(req.b.device), Object.keys(req.b.item).sort(), req.b.where.region, req.b.where.city, JSON.stringify(req.b).includes('Sampleton SDA')],
    ['pastor-pass', true, ['budget', 'cat', 'kind', 'must', 'names', 'need', 'qty'], 'PA', 'Sampleton', false]);
  c('found: "Found 2 options. Checked 1 Oct 2026. Confirm before buying."', P.txt('[data-bx-pmsg]'), 'Found 2 options. Checked 1 Oct 2026. Confirm before buying.');
  c('the empty slot took its tier; his typed ones stayed; the other waits in "Also found"', P.J(`(()=>{ const it=buyGet('${ID}'); return [it.options.map(o=>[o.id,o.src]),it.also.map(o=>[o.id,o.store])]; })()`),
    [[['a', 'typed'], ['b', 'search'], ['c', 'typed']], [['c', 'B&H Photo']]]);
  c('…"Also found (1)" with "Use this"', [P.txt('.bx-also summary'), P.txt('[data-bx-use]')], ['Also found (1)', 'Use this']);
  P.q('[data-bx-use="0"]').click(); await sleep(30);
  c('"Use this" swaps it in; his own goes to "Also found"', P.J(`(()=>{ const it=buyGet('${ID}'); return [buyOpt(it,'c').store,it.also.map(o=>o.store)]; })()`), ['B&H Photo', ['Store C (sample)']]);
  calls = stub(P, { start: 202, startBody: { ok: true, job: 'J'.repeat(22), key: 'K'.repeat(43) }, status: [{ status: 200, body: { ok: true, status: 'failed', code: 'refusal' } }] });
  P.q('[data-bx-find]').click(); await until(() => /could not/.test(P.txt('[data-bx-pmsg]') || ''), 5000);
  c('a failed search: "Prices could not be found just now. Type your own quotes below." (never the server\'s words)', P.txt('[data-bx-pmsg]'), 'Prices could not be found just now. Type your own quotes below.');
  stub(P, { start: 429, startBody: { ok: false, code: 'limit-device', retryAfter: 3600 }, status: [] });
  P.q('[data-bx-find]').click(); await until(() => /enough/.test(P.txt('[data-bx-pmsg]') || ''), 5000);
  c('the daily limit: "That is enough searches for today…"', P.txt('[data-bx-pmsg]'), 'That is enough searches for today. Type your own quotes below, or try again tomorrow.');
  stub(P, { start: 401, startBody: { ok: false, code: 'locked' }, status: [] });
  P.q('[data-bx-find]').click(); await until(() => !P.q('[data-bx-find]'), 5000);
  c('the lock refused: the button goes, "Type your three quotes."', [!!P.q('[data-bx-find]'), P.txt('.bx-typeown')], [false, 'Type your three quotes.']);
  c('nothing here ever says "AI"', /\bAI\b|\bIA\b/.test(P.q('#casebody').textContent + P.q('#cs-switch').textContent), false);

  console.log('\n-- the quote letter (Terrain sends nothing) --');
  const L1 = P.J(`buyRfq(buyGet('${ID}'),'en',{company:'Bucks Sound Co.'})`), L2 = S.J(`buyRfq(buyGet('${ID}'),'es',{company:'Bucks Sound Co.'})`);
  c('EN: the church, its address, the scope, license and insurance, "If your state allows it", "We meet for worship on Saturdays"',
    ['To: Bucks Sound Co.', 'Subject: Request for a quote — Sound board and camera at Sampleton SDA (SAMPLE)', '(100 SAMPLE RD, SAMPLETON, PA, 18999)', 'A new sound board and a camera so shut-ins can join the service', 'proof of license and insurance', 'If your state allows it', 'We meet for worship on Saturdays, so please suggest another day.'].filter(w => !L1.includes(w)), []);
  c('ES: the same, in Spanish', ['Asunto: Solicitud de cotización — Consola de sonido y cámara en Sampleton SDA (SAMPLE)', 'constancia de licencia y seguro', 'Si su estado lo permite', 'Nos reunimos para adorar los sábados; por favor sugiera otro día.'].filter(w => !L2.includes(w)), []);
  c('…signed with his registration', L1.trim().split('\n').pop(), 'Sam Sample, Pastor, Sampleton SDA (SAMPLE) · pastor@example.org');

  console.log('\n-- ③ How we\'ll pay --');
  // (the search above put a $3,290 "Better" in the empty slot: the plan of $3,400 is now $110 over, and the meter says so)
  c('the meter: "To raise $3,290 · $110 over"', P.qa('#bx-s3 .bx-mrow > *').map(e => e.textContent), ['To raise', '$3,290', '$110 over']);
  c('"Never from tithe (Church Manual)." always there', P.txt('.bx-tithe'), 'Never from tithe (Church Manual).');
  const note = P.q('[data-bx-lnote="match"]'); note.value = 'from the tithe'; note.dispatchEvent(new P.w.Event('input')); await sleep(30);
  c('a note that says tithe: refused, in the Church Manual\'s words, not saved', [P.txt('[data-bx-lerr="match"]'), P.J(`buyIn(buyGet('${ID}').fund.lines.find(l=>l.k==='match').note,'en')`)],
    ['Tithe is never used for local projects (Church Manual).', 'A member matches the offering up to $400 (sample)']);
  note.value = 'raffle tickets for a gift basket'; note.dispatchEvent(new P.w.Event('input')); await sleep(30);
  c('a raffle: "We never sell tickets or chances. A free drawing is fine."', P.txt('[data-bx-lerr="match"]'), 'We never sell tickets or chances. A free drawing is fine.');
  const od = P.q('[data-bx-ldate="offering"]'); od.value = '2026-11-08'; od.dispatchEvent(new P.w.Event('change')); await sleep(30);
  c('the offering on a Sunday: "Choose a Sabbath (a Saturday) for the offering."', [P.txt('[data-bx-lerr="offering"]'), P.J(`buyGet('${ID}').fund.lines.find(l=>l.k==='offering').date`)], ['Choose a Sabbath (a Saturday) for the offering.', '2026-11-07']);
  const inst = P.q('[data-bx-date="install"]'); inst.value = '2026-11-21'; inst.dispatchEvent(new P.w.Event('change')); await sleep(30);
  c('installing on a Saturday: "Work days: not the Sabbath."', [P.txt('[data-bx-derr="install"]'), P.J(`buyGet('${ID}').dates.install`)], ['Work days: not the Sabbath.', '2026-11-22']);
  c('the ways to pay not yet used, to add', P.qa('[data-bx-add]').map(b => b.dataset.bxAdd), ['grant', 'other']);

  console.log('\n-- ④ Who decides --');
  c('the path, his church\'s business-meeting rule, the audiences (no conference for a purchase)', [P.txt('#bx-s4 .cd-path > span'), P.q('[data-bx-rule="businessAt"]').value, P.qa('[data-bx-aud]').map(b => b.dataset.bxAud)],
    ['In Sampleton SDA (SAMPLE): Finance committee › Church board', '10000', ['finance', 'board', 'team', 'congregation']]);
  P.E(`(()=>{ const it=buyGet('${ID}'); it.kind='build'; it.cat='building'; buySave(it); buyDrawAll(); return 1; })()`);
  c('Build or add on: the conference row and the conference\'s slides', [P.txt('.bx-conf'), P.qa('[data-bx-aud]').map(b => b.dataset.bxAud).includes('conference')], ['Conference and union approval before any commitment (Church Manual)', true]);
  P.E(`(()=>{ const it=buyGet('${ID}'); it.kind='buy'; it.cat='stream'; buySave(it); buyDrawAll(); return 1; })()`);
  P.q('[data-bx-aud="board"]').click(); await sleep(30);
  P.q('[data-bx-record]').click(); await sleep(30);
  c('Record what we decided: the path\'s bodies, the board\'s outcomes (no "Recommended to the business meeting"), no day or length to agree',
    [P.qa('#bx-dec .cd-tile').map(t => t.textContent), P.qa('#bx-dec .cd-chip').map(t => t.textContent)], [['Finance committee', 'Church board'], ['Approved', 'Amended', 'Referred', 'Declined']]);
  P.q('#bx-dec [data-cd-out="approved"]').click(); await sleep(20);
  c('…a yes asks no day or length', P.q('#bx-dec [data-cd-timing]').hidden, true);
  P.q('#bx-dec [data-cd-out="amended"]').click(); await sleep(20);
  c('…"Amended" points to steps 2 and 3', [P.q('#bx-dec [data-cd-amend]').hidden, P.txt('#bx-dec [data-cd-amend]')], [false, 'If the amount changed, change it in step 2 or 3.']);
  P.q('#bx-dec [data-cd-out="approved"]').click(); P.q('#bx-dec [data-cd-date]').value = '2026-10-01';
  P.q('#bx-dec [data-cd-form]').dispatchEvent(new P.w.Event('submit', { cancelable: true })); await sleep(50);
  c('saved under caseDecisions[buyId] (the ministry path\'s records, unchanged), no timing; the trail and the project\'s dot follow', [P.J(`(()=>{ const r=uChurch().caseDecisions['${ID}'].board; return [r.outcome,r.timing]; })()`), /Approved by the church board on 1 Oct 2026/.test(P.txt('#bx-dec [data-bx-decmsg]'))],
    [['approved', null], true]);

  console.log('\n-- ⑤ Present and vote --');
  c('the board\'s slides and its actions: Present live, Share link & QR, Handout (PDF), Proposal to vote on (PDF)', [P.qa('#bx-s5 [data-bx-act]').map(b => b.textContent), !!P.q('#bx-pv [data-cs-phone]')],
    [['Present live', 'Share link & QR', 'Handout (PDF)', 'Proposal to vote on (PDF)'], true]);
  P.q('[data-bx-aud="congregation"]').click(); await sleep(30);
  c('the whole church: no Proposal to vote on', P.qa('#bx-s5 [data-bx-act]').map(b => b.dataset.bxAct), ['present', 'share', 'pdf']);
  c('…in Spanish', S.qa('#bx-s5 [data-bx-act]').map(b => b.textContent).slice(0, 3), ['Presentar en vivo', 'Compartir enlace y QR', 'Folleto (PDF)']);

  console.log('\n-- v10.44 review fixes --');
  // finding 10: "Why this one" shows the whole suggestion the slides will use (a box that grows, not one cut line)
  const Q = await open('es');
  const pw = Q.q('[data-bx-pickwhy]');
  c('"Why this one" is a box that wraps, its placeholder the whole suggestion', [pw && pw.tagName, pw && pw.getAttribute('placeholder')], ['TEXTAREA', 'Cubre nuestras necesidades; $5,450 menos que la opción Superior.']);
  // finding 6: "Something else" that names a sale or an event: its Sabbath rule; on the Sabbath, refused
  Q.E(`(()=>{ const it=buyGet('${ID}'); it.fund.lines.push({k:'other',amount:300,note:{es:'Venta de pasteles'}}); buySave(it); buyDraw3(); return 1; })()`);
  c('a sale under "Otra cosa": "No en sábado." under its line', Q.txt('[data-bx-line="other"] .bx-rule'), 'No en sábado.');
  const on = Q.q('[data-bx-lnote="other"]'); on.value = 'Cena el sábado por la tarde, boletos a $20'; on.dispatchEvent(new Q.w.Event('input')); await sleep(30);
  c('…a dinner with tickets on the Sabbath: refused, in plain words; not saved', [Q.txt('[data-bx-lerr="other"]'), Q.J(`buyIn(buyGet('${ID}').fund.lines.find(l=>l.k==='other').note,'es')`)],
    ['Las ventas, los boletos y los eventos para recaudar fondos no se hacen en sábado.', 'Venta de pasteles']);
  c('…the same rule in English (buyNoteBad)', Q.J(`[buyNoteBad('dinner on Sabbath afternoon, tickets $20'),buyNoteBad('Saturday night concert after sunset'),buyNoteBad('bake sale on a Sunday'),buyNoteBad('raffle tickets for a TV'),buyNoteBad('from the tithe')]`), ['sabbathNo', null, null, 'raffleNo', 'titheNo']);
  // finding 20: step 4 says what the Church Manual says, for each case
  const row4 = (L, pre) => { const X = L === 'es' ? Q : P; X.E(`(()=>{ const it=buyGet('${ID}'); ${pre} buySave(it); buyDraw4(); return 1; })()`); return X.qa('#bx-s4 .bx-conf').map(e => e.textContent); };
  c('step 4, a loan: "A loan: counsel with the conference officers first (Church Manual)"', row4('en', "it.cat='stream'; it.kind='buy'; it.fund.lines=it.fund.lines.filter(l=>l.k!=='other'); it.fund.lines.push({k:'other',amount:500,note:{en:'A bank loan'}});"), ['A loan: counsel with the conference officers first (Church Manual)']);
  c('…a repair over his conference\'s amount: its own rule', row4('en', "it.fund.lines=it.fund.lines.filter(l=>l.k!=='other'); it.cat='building'; it.kind='repair'; buyRulesSet({confAt:1000});"), ['Our conference reviews building work over $1,000 (your conference’s rule)']);
  c('…Spanish, Build or add on', row4('es', "it.fund.lines=it.fund.lines.filter(l=>l.k!=='other'); it.cat='building'; it.kind='build';"), ['Aprobación de la asociación y de la unión antes de cualquier compromiso (Manual de la Iglesia)']);
  // finding 15: a searched store's web address always shows (the name is the search's own words; the address is the link's)
  const R = await open('en');
  R.E(`(()=>{ const it=buyGet('${ID}'); it.options=it.options.filter(o=>o.id!=='b'); buyPricesAccept(it,[{id:'b',tier:'better',name:{en:'Mixer kit'},store:'Sweetwater (official)',url:'https://cheap-av-deals.example.shop/kit',price:3290,features:{en:[]},install:{how:'pro',cost:0}}],'2026-10-01'); buySave(it); buyDraw2(); return 1; })()`);
  c('a found option named "Sweetwater (official)": its Where to buy shows the link\'s own host', R.qa('.bx-opt[data-bx-opt="b"] dd')[0].textContent, 'Sweetwater (official) · cheap-av-deals.example.shop');
  c('…on the slide and in the chart too', R.J(`(()=>{ const it=buyGet('${ID}'); it.pick='b'; const m=buyModel(it,'board'); return [buyDeck(m).slides.find(s=>s.kicker==='Our recommendation').rows.find(r=>r[0]==='Store')[1],buyChart(m).cols.find(c=>c.id==='b').where]; })()`),
    ['Sweetwater (official) · cheap-av-deals.example.shop', 'Sweetwater (official) · cheap-av-deals.example.shop']);
  c('…a typed "(sample)" store keeps its name alone', R.qa('.bx-opt[data-bx-opt="c"] dd')[0].textContent, 'Store C (sample)');
  // finding 16: the request never carries a budget that is not one, nor a need the server refuses
  c('the price request: no budget while the plan is short; the planned total (≤ $500,000) when it is planned', R.J(`(()=>{ const it=buyGet('${ID}'); it.fund.lines=[{k:'budget',amount:buyTotal(it)}]; const a=buyPricesBody(it).item.budget.max===buyTotal(it)?3400:'x'; it.fund.lines=[{k:'budget',amount:200}]; const b=buyPricesBody(it).item.budget.max;
    it.fund.lines=[{k:'budget',amount:500000},{k:'designated',amount:500000}]; const c2=buyPricesBody(it).item.budget.max; return [a,b,c2]; })()`), [3400, null, null]);
  c('…a two-letter need ("TV") gets the kind of need\'s words (the server asks for 3 letters at least)', R.J(`(()=>{ const it=buyGet('${ID}'); it.cat='other'; it.need={en:'TV'}; it.name={}; return buyPricesBody(it).item.need; })()`), 'Something else: TV');
  // finding 13: a search still running when the page comes back is picked up again (no second paid search)
  const T2 = await open('en');
  const calls2 = []; let n2 = 0;
  T2.E(`localStorage.setItem('terrain-ai-pass','pastor-pass'); BUY_PRICES.info=null; BUY_PRICES.poll=10; 1`);
  T2.w.fetch = async (u, o) => { u = String(u); const b = o && o.body ? JSON.parse(o.body) : null; calls2.push(b ? b.mode : 'GET');
    if (/\/ideas\//.test(u)) return new Promise(() => {});
    if (/advise/.test(u) && (!o || o.method !== 'POST')) return { ok: true, status: 200, json: async () => ({ enabled: true, prices: true }) };
    if (b && b.mode === 'prices-status') { n2++; return { ok: true, status: 200, json: async () => n2 < 25 ? { ok: true, status: 'running' } : { ok: true, status: 'done', checked: '2026-10-01', options: sample.slice(0, 1), notes: [] } }; }
    if (b && b.mode === 'prices') return { ok: true, status: 202, json: async () => ({ ok: true, job: 'Z'.repeat(22), key: 'Y'.repeat(43) }) };
    return new Promise(() => {}); };
  T2.E(`(()=>{ const it=buyGet('${ID}'); it.options=it.options.filter(o=>o.id!=='b'); it.pick=null; it.lastSearch={job:'J'.repeat(22),key:'K'.repeat(43),at:Date.now()-40000,status:'running'}; buySave(it); caseMount(); return 1; })()`);
  await until(() => T2.q('[data-bx-find]'), 3000);
  c('reopened while it runs (40 s): "Looking at store websites…", the button waits', [T2.txt('[data-bx-find]'), T2.q('[data-bx-find]') && T2.q('[data-bx-find]').disabled], ['Looking at store websites…', true]);
  await until(() => T2.J(`buyGet('${ID}').lastSearch.status`) === 'done', 5000);
  c('…it is asked until done, then merged; no second search was started', [calls2.filter(x => x === 'prices-status').length >= 25, calls2.filter(x => x === 'prices').length, T2.J(`buyOpt(buyGet('${ID}'),'b').src`), /Found 1 option/.test(T2.txt('[data-bx-pmsg]') || '')], [true, 0, 'search', true]);
  done();
})();
