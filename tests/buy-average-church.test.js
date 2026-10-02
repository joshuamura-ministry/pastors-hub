/* v56 · THE AVERAGE CHURCH buys a sound board and a camera (DESIGN-PURCHASE.md §11, §10 T7).
 * The fixture is tests/average-church/seed-purchase.json, made by tests/average-church/make-seed-purchase.mjs from seed-followup.json
 * (committed with it, so the fixture generator is never lost again: this suite runs it in memory and holds the file to it byte for byte).
 * Sampleton SDA (SAMPLE): 80 on the books, 55 in worship, 46 adults; the plan holds the health fair, back-to-school and the 4-night series;
 * 1 member with sound or video skill; the church's path team › finance › board (the purchase uses finance › board); the church's
 * business-meeting rule $10,000 (sample). The options are at sample prices from "Store A/B/C (sample)", with no links.
 * Held here: the story (the total, the funding, the plan's ministries that need sound and video, the dates, the path), the finance
 * committee's and the board's slides in English and Spanish, the Proposal's motion, the whole church's "I'm in", and a whole new project
 * on this church from "+ New" to the slides with stubbed Find prices (marked as sample prices; nothing spent).
 */
const fs = require('fs'), path = require('path');
const H = require('./v43-helpers.js');
const { c, page, ready, done, until, sleep, FX, SEED } = H;
const ADDR = SEED('purchase')['terrain-churches-v1'].churches['sample-sampleton-sda'].address;
const DATA = { ...FX.DATA, geo: { ...FX.DATA.geo, matched: ADDR } };
const ID = 'buy-avs001';
(async () => {
  console.log('-- the fixture, made by its committed generator --');
  const gen = await import(require('url').pathToFileURL(path.join(__dirname, 'average-church', 'make-seed-purchase.mjs')).href);
  const file = fs.readFileSync(path.join(__dirname, 'average-church', 'seed-purchase.json'), 'utf8');
  c('seed-purchase.json is make-seed-purchase.mjs\'s output, byte for byte', gen.makeSeedPurchase() === file, true);
  const F = JSON.parse(file), B = SEED('followup');
  const ch = F['terrain-churches-v1'].churches['sample-sampleton-sda'], ch0 = B['terrain-churches-v1'].churches['sample-sampleton-sda'];
  c('it is seed-followup with only caseBuys added', [Object.keys(ch).filter(k => !(k in ch0)), Object.keys(ch0).filter(k => JSON.stringify(ch0[k]) !== JSON.stringify(ch[k]))], [['caseBuys'], []]);
  c('made up: every store "(sample)", no links, the item and the rule marked sample', [ch.caseBuys.items[ID].options.every(o => /\(sample\)$/.test(o.store) && o.url === ''), ch.caseBuys.items[ID].sample, ch.caseBuys.rules.sample], [true, true, true]);

  const P = await ready(page('purchase', 'en', { data: DATA })), S = await ready(page('purchase', 'es', { data: DATA }));
  const has = P.E('typeof buyModel==="function"');
  c('the page has the purchase path (v56)', has);
  if (!has) return done();

  console.log('\n-- the story --');
  c('total $3,400 (Better: $3,150 + $250 technician) = the funding: budget $1,000 + offering $1,200 + gifts $600 + match $400 + the old mixer $200',
    P.J(`(()=>{ const it=buyGet('${ID}'); return [buyTotal(it),buyFundSum(it),buyMeter(it).state,it.fund.lines.map(l=>[l.k,l.amount])]; })()`),
    [3400, 3400, 'planned', [['budget', 1000], ['offering', 1200], ['designated', 600], ['match', 400], ['sell', 200]]]);
  c('"$5,450 less than Best"', P.J(`buyOptTotal(buyOpt(buyGet('${ID}'),'c'))-buyTotal(buyGet('${ID}'))`), 5450);
  c('the plan\'s ministries that need sound and video, computed: the health fair and the 4-night series', P.J(`buyPlanMins(buyGet('${ID}'),'en').map(p=>p.id)`), ['health-expo', 'four-nights']);
  c('1 member with sound or video skill (the profile)', P.J(`buyFacts(buyGet('${ID}'),{lang:'en'}).crew.value`), '1');
  c('the offering Sat 7 Nov 2026; install Sun 22 Nov; the committees on Tuesdays', P.J(`(()=>{ const it=buyGet('${ID}'); return [buyIsSat(it.fund.lines.find(l=>l.k==='offering').date),buyIsSat(it.dates.install),caseDecDay(it.dates.finance).getDay(),caseDecDay(it.dates.board).getDay()]; })()`), [true, false, 2, 2]);
  c('Finance committee › Church board; no business meeting ($3,400 is under his $10,000)', P.J(`buyPathOf(buyGet('${ID}'))`), { path: ['finance', 'board'], conf: false, bizAuto: false });

  console.log('\n-- the finance committee\'s slides (budget first) --');
  const words = (Q, a) => Q.J(`(()=>{ const d=buyDeck(buyModel(buyGet('${ID}'),'${a}')); return d.slides.slice(1).map(s=>[s.kicker||'',s.headline||'']); })()`);
  c('EN', words(P, 'finance'), [['Finance committee recommendation', 'Sound board and camera: $3,400'], ['How we’ll pay', '$3,400, without tithe'], ['Why it matters', 'So members at home can worship with us'],
    ['Three options', 'We compared three prices'], ['Our recommendation', 'Better: 16-channel digital mixer + PTZ camera + encoder'], ['How it will be used', 'Ready for the first Sabbath'],
    ['Safeguards', 'Done decently and in order'], ['Timeline', 'From the vote to the first stream'], ['Tonight we ask', 'Recommend the purchase to the church board'], ['', 'Will you recommend it?']]);
  c('ES', words(S, 'finance'), [['Recomendación de la comisión de finanzas', 'Consola de sonido y cámara: $3,400'], ['Cómo lo pagaremos', '$3,400, sin usar el diezmo'], ['Por qué importa', 'Para que los miembros en casa adoren con nosotros'],
    ['Tres opciones', 'Comparamos tres precios'], ['Nuestra recomendación', 'Mejor: Consola digital de 16 canales + cámara PTZ + codificador'], ['Cómo se usará', 'Listo para el primer sábado'],
    ['Salvaguardas', 'Hecho decentemente y con orden'], ['Calendario', 'Del voto a la primera transmisión'], ['Esta noche pedimos', 'Recomendar la compra a la junta directiva'], ['', '¿Lo recomiendan?']]);
  c('the opening\'s rows: Recommend · Paid by (never tithe) · Next: church board, 20 Oct', P.J(`buyDeck(buyModel(buyGet('${ID}'),'finance')).slides[1].rows`),
    // v10.44 review (finding 9): never cut what is voted on: the tier and its total (the whole name is on the recommendation slide)
    [['Recommend', 'Better · $3,400'], ['Paid by', 'budget · offering · gifts · sale · never tithe'], ['Next', 'Church board, 20 Oct']]);
  c('the money: one row a source, the offering\'s Sabbath, the sale on a weekday, the total', P.J(`buyDeck(buyModel(buyGet('${ID}'),'finance')).slides[2].rows`),
    [['Church budget', '$1,000'], ['Special offering in Sabbath worship, 7 Nov', '$1,200'], ['Designated gifts', '$600'], ['A matching gift', '$400'], ['The old mixer, sold on a weekday', '$200'], ['Total', '$3,400']]);
  c('why: 9 members who watch from home · 2 ministries in our plan need sound and video · 1 member with sound or video skill; we\'ll train 2 more', P.J(`buyDeck(buyModel(buyGet('${ID}'),'finance')).slides[3].items.map(i=>i.value+' '+i.label)`),
    ['9 members who watch from home', '2 ministries in our plan need sound and video', '1 member with sound or video skill; we’ll train 2 more']);
  c('…in Spanish', S.J(`buyDeck(buyModel(buyGet('${ID}'),'finance')).slides[3].items.map(i=>i.value+' '+i.label)`),
    ['9 miembros que siguen el culto desde casa', '2 ministerios de nuestro plan necesitan sonido y video', '1 miembro con habilidad en sonido o video; capacitaremos a 2 más']);
  c('the safeguards (the sample\'s prices said as sample prices; the streaming license for the songs)', P.J(`buyDeck(buyModel(buyGet('${ID}'),'finance')).slides[7].items`),
    ['3 prices on file (sample prices)', 'The treasurer pays the store; receipts kept', 'Gifts for this are used only for this', 'Never from tithe', 'Old equipment sold on a weekday', 'A streaming license for the songs before the first stream']);

  console.log('\n-- the board\'s slides (motion first), the Proposal, the whole church --');
  c('the board: "Proposal to the church board · Sound board and camera: $3,400", Approve · Paid by · Review', P.J(`(()=>{ const s=buyDeck(buyModel(buyGet('${ID}'),'board')).slides[1]; return [s.kicker,s.headline,s.rows.map(r=>r[0])]; })()`),
    ['Proposal to the church board', 'Sound board and camera: $3,400', ['Approve', 'Paid by', 'Review']]);
  c('the finance committee\'s Proposal: its motion', P.J(`buyProposal(buyModel(buyGet('${ID}'),'finance')).motion`),
    'To recommend to the church board the purchase of a 16-channel digital mixer, a PTZ camera and an encoder (Better) from Store B (sample) for up to $3,400, including installation, tax and shipping, paid from the church budget ($1,000), a special offering in Sabbath worship on 7 November ($1,200), designated gifts ($600), a matching gift ($400) and the sale of the old mixer ($200); never from tithe; with Media & communication responsible for its care and training, and a report to the board by 15 December 2026.');
  c('the whole church: the offering\'s Sabbath, the first livestream, "I\'m in" (Run the camera one Sabbath a month), Patriarchs and Prophets p. 344 at the close',
    P.J(`(()=>{ const d=buyDeck(buyModel(buyGet('${ID}'),'congregation')); return [d.slides[1].rows.slice(1),d.slides.find(s=>s.type==='yes').options.map(o=>o.text),d.slides.find(s=>s.type==='close').quote.ref]; })()`),
    [[['How we’ll pay', 'A special offering on Sabbath, 7 Nov'], ['When', 'First use: 28 Nov']], ['Pray for this work', 'Run the camera one Sabbath a month', 'Lead the training'], 'Ellen G. White · Patriarchs and Prophets, p. 344']);

  console.log('\n-- a new project on this church, from "+ New" to its slides, with Find prices stubbed (sample prices, nothing spent) --');
  P.E(`(()=>{ const ch=uChurch(); ch.proposalPrefs={...(ch.proposalPrefs||{}),path:'buy',buy:'new'}; uPersist(); openTool('case'); render(); return 1; })()`);
  await until(() => P.q('#bx-s1 [data-bx-cat]'), 8000);
  P.q('[data-bx-cat="light"]').click(); await sleep(30);
  const need = P.q('[data-bx-f="need"]'); need.value = 'Brighter LED lights for the platform so guests can see the speaker'; need.dispatchEvent(new P.w.Event('input')); await sleep(350);
  P.q('[data-bx-why="guests"]').click(); await sleep(30);
  const nid = P.E('BUY_ST.id');
  const U = t => 'https://www.sample-store.example.com/' + t;
  P.w.fetch = async (u, o) => { u = String(u); const b = o && o.body ? JSON.parse(o.body) : null;
    if (/advise/.test(u) && !b) return { ok: true, status: 200, json: async () => ({ enabled: true, prices: true }) };
    if (b && b.mode === 'prices') return { ok: false, status: 202, json: async () => ({ ok: true, job: 'J'.repeat(22), key: 'K'.repeat(43), poll: 4000 }) };
    if (b && b.mode === 'prices-status') return { ok: true, status: 200, json: async () => ({ ok: true, status: 'done', checked: '2026-10-01', notes: [],
      options: ['good', 'better', 'best'].map((t, i) => ({ id: 'abc'[i], tier: t, src: 'search', checked: '2026-10-01', name: { en: ['Two LED wash lights', 'Four LED wash lights and a controller', 'Six LED fixtures and a lighting desk'][i] }, store: 'Sample Store ' + 'ABC'[i] + ' (sample)', host: 'sample-store.example.com', url: U(t), price: [640, 1480, 3920][i], extra: 0, features: { en: [] }, warranty: { en: (i + 1) + ' year' + (i ? 's' : '') }, install: { how: i ? 'pro' : 'volunteers', cost: 0 }, running: null, alsoAt: [] })) }) };
    return new Promise(() => {}); };
  P.E(`localStorage.setItem('terrain-ai-pass','pastor-pass'); BUY_PRICES.info=null; BUY_PRICES.poll=10; buyDraw2(); 1`);
  await until(() => P.q('[data-bx-find]'), 3000);
  P.q('[data-bx-find]').click(); await until(() => /Found 3/.test(P.txt('[data-bx-pmsg]') || ''), 5000);
  c('three options found and placed; the better one suggested', P.J(`(()=>{ const it=buyGet('${nid}'); return [it.options.map(o=>o.id+':'+o.price),buyPickId(it),buyTotal(it)]; })()`), [['a:640', 'b:1480', 'c:3920'], 'b', 1480]);
  P.q('[data-bx-add="offering"]').click(); await sleep(20);
  const amt = P.q('[data-bx-amt="offering"]'); amt.value = '1480'; amt.dispatchEvent(new P.w.Event('input')); await sleep(350);
  c('one special offering pays for it: planned', P.qa('#bx-s3 .bx-mrow > *').map(e => e.textContent), ['To raise', '$1,480', 'planned ✓']);
  const d = P.J(`buyDeck(buyModel(buyGet('${nid}'),'board'))`);
  c('its board deck: the options slide says "Sample prices"; the lighting\'s own safeguard (a licensed electrician); no link', [d.slides.find(s => s.kicker === 'Three options').source, d.slides.find(s => s.type === 'risks').items.includes('Wiring by a licensed electrician'), /https?:/.test(JSON.stringify(d))], ['Sample prices', true, false]);
  c('…and its Proposal names where the prices came from (as plain text, for the sample: made up)', P.J(`buyHandout(buyModel(buyGet('${nid}'),'board')).sources`),
    ['Good: Sample Store A (sample) · sample prices, made up for this example', 'Better: Sample Store B (sample) · sample prices, made up for this example', 'Best: Sample Store C (sample) · sample prices, made up for this example']);
  done();
})();
