/* v56 · Make the Case · projects and purchases: the slides (DESIGN-PURCHASE.md §3, §4, §10 T4).
 * His rule: "numbers on slides must relate to the ask (no detached figures)". Held here, on the average church's sample in English and
 * Spanish: every deck of every audience is stored by present.mjs exactly as sent (only the slide types present-1.4 already accepts;
 * present.mjs is not changed); 8–11 content slides and the join slide; the order of each audience (the finance committee budget first, the
 * board and the business meeting motion first, the whole church "I'm in"); a verse on every content slide that has room, from
 * PURCHASE_VERSES only, never twice, the same verses in English and Spanish; Ellen White only at the whole church's close; every number on
 * every slide maps to a price, the funding plan, his count for a reason he ticked, the plan's ministries, who can run it, a date, or the
 * plan's own words; no census figure unless rides, neighbours or language is ticked; no children's verse unless children's safety is a
 * reason; the options slide has exactly three and says where its prices came from; no link on any slide; "I'm in" is lead / help / pray and
 * the whole church is never asked for an amount. (The fit at 360 × 640 is a Chrome gate: work/buyslides.mjs.)
 */
const H = require('./v43-helpers.js');
const { c, page, ready, done, FX, SEED } = H;
const Q = require('./purchase-quotes.json');
const DATA = { ...FX.DATA, geo: { ...FX.DATA.geo, matched: SEED('purchase')['terrain-churches-v1'].churches['sample-sampleton-sda'].address } };
const ID = 'buy-avs001';
const AUDS = ['finance', 'board', 'business', 'team', 'congregation', 'conference'];
(async () => {
  // present.mjs, in process, against an in-memory store (as present-function.test.mjs)
  for (const k of ['TERRAIN_CODES', 'TERRAIN_REQUIRE_CODE', 'TERRAIN_REG_SECRET', 'PRESENT_FB_URL', 'PRESENT_FB_SECRET', 'SITE_URL']) delete process.env[k];
  const m = new Map(); let n = 0;
  globalThis.__terrainPresentStore = { async get(k) { const v = m.get(k); return v === undefined ? null : JSON.parse(v.data); },
    async setJSON(k, val, o = {}) { const cur = m.get(k); if (o.onlyIfNew && cur) return { modified: false }; if (o.onlyIfMatch && (!cur || cur.etag !== o.onlyIfMatch)) return { modified: false }; const etag = 'e' + (++n); m.set(k, { data: JSON.stringify(val), etag }); return { modified: true, etag }; },
    async delete(k) { m.delete(k); }, async list({ prefix = '' } = {}) { return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }; } };
  const present = (await import(require('url').pathToFileURL(require('path').join(__dirname, '..', 'netlify', 'functions', 'present.mjs')).href)).default;
  const quiet = async f => { const L = console.log, Er = console.error; console.log = console.error = () => {}; try { return await f(); } finally { console.log = L; console.error = Er; } };
  const store = async deck => { const r = await quiet(() => present(new Request('https://x.test/.netlify/functions/present', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'open', deck, keepDays: 1 }) }), { ip: '203.0.113.9' }));
    const j = await r.json(); if (r.status !== 200) return { status: r.status, j };
    const d = await quiet(() => present(new Request('https://x.test/.netlify/functions/present?op=deck&room=' + j.room, { method: 'GET' }), { ip: '203.0.113.9' })); return { status: 200, deck: (await d.json()).deck }; };

  const pages = { en: await ready(page('purchase', 'en', { data: DATA })), es: await ready(page('purchase', 'es', { data: DATA })) };
  const has = pages.en.E('typeof buyDeck==="function"');
  c('the page has the purchase decks (v56)', has);
  if (!has) return done();
  const deck = (L, a, pre) => pages[L].J(`(()=>{ ${pre || ''} const it=buyGet('${ID}'); it.aud=null; const m=buyModel(it,'${a}'); return m.ok?buyDeck(m):null; })()`);
  const D = {}; for (const L of ['en', 'es']) { D[L] = {}; for (const a of AUDS) D[L][a] = deck(L, a); }

  console.log('\n-- present.mjs stores every deck as sent (no new slide type, no new field) --');
  for (const L of ['en', 'es']) for (const a of AUDS) {
    const d = D[L][a]; const r = await store(d);
    // (present.mjs keeps the same fields in its own order, gives the join slide the room's link and code, and a timeline its quote: null)
    const norm = v => Array.isArray(v) ? v.map(norm) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().filter(k => !['part', 'qrUrl', 'code6'].includes(k) && v[k] !== null).map(k => [k, norm(v[k])])) : v;
    c(`${L} ${a}: op open 200, the stored deck is the deck sent`, [r.status, r.deck && JSON.stringify(norm(r.deck.slides)) === JSON.stringify(norm(d.slides)), r.deck && r.deck.ministry.id], [200, true, ID]);
  }

  console.log('\n-- the arc of each audience (DESIGN §4.2) --');
  const types = d => d.slides.map(s => s.type + (s.part ? ':' + s.part : ''));
  c('the finance committee: budget first', types(D.en.finance), ['join', 'motion', 'ask', 'trio', 'trio', 'ask', 'how', 'risks', 'timeline', 'ask', 'close']);
  c('…its second slide is "How we\'ll pay · $3,400, without tithe"', [D.en.finance.slides[2].kicker, D.en.finance.slides[2].headline], ['How we’ll pay', '$3,400, without tithe']);
  c('the board and the business meeting: motion first, the funding after the options', [types(D.en.board), types(D.en.business)].map(t => t.join(' ')), Array(2).fill('join motion trio trio ask ask how risks timeline ask close'));
  c('the whole church: the plan, why, what we chose, how we\'ll pay, how it will be used, "I\'m in", the close', types(D.en.congregation), ['join', 'motion', 'trio', 'ask', 'ask', 'how', 'yes', 'close']);
  c('the ministry team: choose together (Good · Better · Best), the roles, "I\'m in"', types(D.en.team), ['join', 'motion', 'trio', 'trio', 'ask', 'how', 'roles', 'ask:decide', 'yes', 'close']);
  c('8 to 11 content slides and the join slide (12 at most: present.mjs)', AUDS.flatMap(a => ['en', 'es'].map(L => { const k = D[L][a].slides.length - 1; return k >= 7 && k <= 11 && D[L][a].slides.length <= 12; })).every(Boolean), true);
  c('English and Spanish decks have the same slides', AUDS.every(a => JSON.stringify(types(D.en[a])) === JSON.stringify(types(D.es[a]))), true);
  c('the finance committee\'s opening: "Finance committee recommendation · Sound board and camera: $3,400"', [D.en.finance.slides[1].kicker, D.en.finance.slides[1].headline, D.es.finance.slides[1].kicker, D.es.finance.slides[1].headline],
    ['Finance committee recommendation', 'Sound board and camera: $3,400', 'Recomendación de la comisión de finanzas', 'Consola de sonido y cámara: $3,400']);
  c('the asks (DESIGN §4.3)', AUDS.filter(a => !['team', 'congregation'].includes(a)).map(a => D.en[a].slides.filter(s => s.type === 'ask').pop().headline),
    // v10.44 review (finding 20): the conference approves building or adding on (Church Manual p. 153); for the sample (a purchase, no loan)
    // it counsels: "Counsel before any commitment" (it said "Counsel and approval" for every case)
    ['Recommend the purchase to the church board', 'Approve the purchase', 'Today the church votes on the purchase', 'Counsel before any commitment']);
  c('the closes', AUDS.map(a => D.en[a].slides.find(s => s.type === 'close').headline), ['Will you recommend it?', 'Will you approve it?', 'Will you approve it?', 'Will you help?', 'Will you join us?', 'Will you counsel us?']);

  console.log('\n-- the verses: PURCHASE_VERSES only, never twice, the same in English and Spanish; Ellen White only at the whole church\'s close --');
  const refOf = (s, L) => s.verse ? s.verse.ref : s.type === 'verse' ? s.ref + ' · ' + s.version : s.quote ? s.quote.ref : null;
  const idOf = (ref, L) => { const r = String(ref || '').replace(/ · (KJV|RVA)$/, ''); const v = Q.verses.find(x => x[L].ref === r); if (v) return v.id; const g = Q.egw.find(x => x[L].ref === r); return g ? 'egw:' + g.id : 'other:' + r; };
  const vids = (L, a) => D[L][a].slides.map(s => refOf(s, L)).filter(Boolean).map(r => idOf(r, L));
  c('every verse and quote is from the purchase library (nothing else)', AUDS.flatMap(a => ['en', 'es'].flatMap(L => vids(L, a).filter(id => id.startsWith('other:')))), []);
  c('never the same verse twice in a deck', AUDS.flatMap(a => ['en', 'es'].map(L => { const v = vids(L, a); return new Set(v).size === v.length; })).every(Boolean), true);
  c('the same verses in English and Spanish', AUDS.filter(a => JSON.stringify(vids('en', a)) !== JSON.stringify(vids('es', a))), []);
  // v10.44 review (finding 2): the pastor asked for "a good, solid, professional proposal that uses the biblical foundation and the Spirit
  // of Prophecy"; the decks for the bodies that decide carried none. Now one Ellen White line a deck, at its close: the whole church's
  // Patriarchs and Prophets p. 344 (as before), every deciding body's Testimonies vol. 5 p. 491 ("Christ’s representatives"); a team's none
  c('Ellen White: one line a deck at its close (the whole church PP 344; finance, board, business meeting, conference 5T 491; a team none)', AUDS.map(a => vids('en', a).filter(id => id.startsWith('egw:'))),
    [['egw:5t491_1'], ['egw:5t491_1'], ['egw:5t491_1'], [], ['egw:pp344_5'], ['egw:5t491_1']]);
  c('each verse is word for word the library\'s, with its version', AUDS.every(a => ['en', 'es'].every(L => D[L][a].slides.every(s => { const v = s.verse || (s.type === 'close' && s.quote) || null; if (!v) return true;
    const id = idOf(v.ref, L); if (id.startsWith('egw:')) return Q.egw.find(g => 'egw:' + g.id === id)[L].text === v.text; return Q.verses.find(x => x.id === id)[L].text === v.text && / · (KJV|RVA)$/.test(v.ref) && (L === 'es') === / · RVA$/.test(v.ref); }))), true);
  // (the design's table: Luke 14:28 on the opening; measured at 360 × 640 it has no room beside a goal and three rows, so it counts the cost
  // on the options slide, the next in its own list)
  c('the finance deck\'s Scripture: 2 Corinthians 9:7 on the money, Colossians 2:5 on why, Luke 14:28 on the three prices, 1 Chronicles 29:9 at the close',
    // v10.44 review (finding 2): the close carries Testimonies vol. 5 p. 491 (it carried 1 Chronicles 29:9); every verse before it unchanged
    vids('en', 'finance'), ['2cor8_21', '2cor9_7', 'col2_5', 'luke14_28', 'ps33_3', 'neh8_8', '1cor14_40', 'neh2_18', '1chr29_14', 'egw:5t491_1']);
  c('a content slide without a verse is one with no room for any (passed over, never cut): the sample has none', AUDS.flatMap(a => D.en[a].slides.filter(s => !['join', 'close', 'yes', 'verse'].includes(s.type) && !s.verse).map(s => a + ':' + s.type)), []);
  c('no Mark 10:14 unless children\'s safety is a reason', AUDS.some(a => vids('en', a).includes('mark10_14')), false);
  c('…and with it ticked, it may come (a children\'s room repair)', pages.en.J(`(()=>{ const it=buyGet('${ID}'); it.cat='building'; it.kind='repair'; it.why=[{k:'children'}]; const d=buyDeck(buyModel(it,'board')); return d.slides.some(s=>s.verse&&/^Mark 10:14/.test(s.verse.ref)); })()`), true);
  c('Haggai 1:8 ("build the house") never on a sound board\'s deck', AUDS.some(a => vids('en', a).includes('hag1_8')), false);

  console.log('\n-- the relevance rule: every number on a slide relates to the ask --');
  const allowedNums = (L) => pages[L].J(`(()=>{ const it=buyGet('${ID}'), m=buyModel(it,'board'), out=new Set();
    const add=s=>String(s||'').replace(/(\\d),(\\d)/g,'$1$2').match(/\\d+(?:\\.\\d+)?/g)?.forEach(x=>out.add(x));
    m.facts.forEach(f=>add(f.value)); if(m.crew){ add(m.crew.value); add(m.crew.label); }
    it.options.forEach(o=>{ add(buyOptTotal(o)); add(o.price); add(o.extra); add(o.install.cost); add(buyIn(o.name,'${L}')); add(buyIn(o.warranty,'${L}')); (buyInList(o.features,'${L}')).forEach(add); if(o.install.note) add(buyIn(o.install.note,'${L}')); });
    it.fund.lines.forEach(l=>{ add(l.amount); if(l.date) add(buyDay(l.date,true)); });
    Object.values(it.dates).forEach(d=>add(buyDay(d,true))); add(m.total); add(buyOptTotal(buyOpt(it,'c'))-m.total);
    caseInLang('${L}',()=>{ add(caseT(m.how.steps).join(' ')); add(caseT(BUY_SL.roles.opsX)); add(BUY_CATS[it.cat].crew); add(caseT(m.how.help)); add(caseT(BUY_HOW[it.cat].risk||{en:'',es:''})); });
    add(it.options.length); add(caseDate(new Date(),true)); add(caseISO(new Date()));
    return [...out]; })()`);
  // the words a slide shows (its values, never its keys; the verse and quote are Scripture; a risks slide's source is the Church Manual's
  // own edition and pages, a citation and not a figure)
  const vals = v => Array.isArray(v) ? v.flatMap(vals) : v && typeof v === 'object' ? Object.values(v).flatMap(vals) : typeof v === 'string' || typeof v === 'number' ? [String(v)] : [];
  const nums = s => { const t = vals({ ...s, verse: null, quote: null, code6: null, qrUrl: null, source: /^(Church Manual|Manual de la Iglesia)/.test(s.source || '') ? null : s.source, text: s.type === 'verse' ? '' : s.text, ref: s.type === 'verse' ? '' : s.ref }).join(' ').replace(/(\d),(\d)/g, '$1$2'); return (t.match(/\d+(?:\.\d+)?/g) || []); };
  for (const L of ['en', 'es']) { const A = new Set(allowedNums(L));
    c(`${L}: every number on every slide of every audience is a price, the funding plan, a count, the plan, who can run it, a date or the plan's own words`,
      AUDS.flatMap(a => D[L][a].slides.flatMap((s, i) => nums(s).filter(x => !A.has(x)).map(x => a + ' #' + i + ' ' + s.type + ': ' + x))), []); }
  c('no census figure (no "%") on the sample\'s slides: no outward reason is ticked', AUDS.flatMap(a => D.en[a].slides.filter(s => /%/.test(JSON.stringify({ ...s, verse: null, quote: null })))).length, 0);
  c('with "Rides" ticked, the households with no car may appear (14%, the census source beside it)', pages.en.J(`(()=>{ const it=buyGet('${ID}'); it.cat='vehicle'; it.why=[{k:'rides',n:6},{k:'ministries'}]; const d=buyDeck(buyModel(it,'board')); const s=d.slides.find(x=>/%/.test(JSON.stringify(x.items||x.rows||''))); return s?[s.type,JSON.stringify(s.items||s.rows).includes('14%'),/Census/.test(s.source||'')]:null; })()`), ['trio', true, true]);
  c('a count he typed without ticking its reason is never shown', pages.en.J(`(()=>{ const it=buyGet('${ID}'); const keep=it.why; it.why=[{k:'guests'}]; const m=buyModel(it,'board'); return m.facts.map(f=>f.src); })()`), []);

  console.log('\n-- the options slide, links, "I\'m in" --');
  const opt = D.en.board.slides.find(s => s.type === 'trio' && s.kicker === 'Three options');
  c('exactly three, the recommended one marked, "Sample prices" for the sample', [opt.items.length, opt.items.map(i => i.value), opt.items.filter(i => /^★/.test(i.label)).length, opt.source], [3, ['$1,180', '$3,400', '$8,850'], 1, 'Sample prices']);
  c('…a real search\'s: "Prices checked {date} · confirm before buying" (ES "Precios consultados el … · confirme antes de comprar")', ['en', 'es'].map(L => pages[L].J(`(()=>{ const it=buyGet('${ID}'); delete it.sample; it.options.forEach(o=>{ o.store=o.store.replace(/ \\(sample\\)/,''); o.checked='2026-10-01'; }); const d=buyDeck(buyModel(it,'board')); return d.slides.find(s=>s.type==='trio'&&s.items.length===3&&/\\$/.test(s.items[0].value)).source; })()`)),
    ['Prices checked 1 Oct 2026 · confirm before buying', 'Precios consultados el 1 oct 2026 · confirme antes de comprar']);
  c('no link on any slide (no http, www. or .com/)', AUDS.flatMap(a => ['en', 'es'].flatMap(L => D[L][a].slides.filter(s => /https?:|www\.|\.com\//.test(JSON.stringify(s))).map(s => a + ':' + s.type))), []);
  const yesOf = (L, a) => D[L][a].slides.find(s => s.type === 'yes');
  c('"I\'m in": pray, help, lead (the help answer is the category\'s own)', [yesOf('en', 'congregation').options.map(o => o.k), yesOf('en', 'congregation').options[1].text, yesOf('es', 'congregation').options[1].text], [['pray', 'help', 'lead'], 'Run the camera one Sabbath a month', 'Manejar la cámara un sábado al mes']);
  c('the whole church is never asked for an amount ("I\'m in" and the close carry no $ and no "give")', ['en', 'es'].map(L => D[L].congregation.slides.filter(s => ['yes', 'close', 'motion'].includes(s.type)).some(s => /\$|\bgive\b|\bden\b|\bdar\b/i.test(JSON.stringify({ ...s, quote: null, verse: null, goal: null })))), [false, false]);
  c('…the offering is announced by its Sabbath, the gifts by their rule', [D.en.congregation.slides[1].rows[1], D.en.congregation.slides.find(s => s.kicker === 'How we’ll pay').rows.slice(0, 1)], [['How we’ll pay', 'A special offering on Sabbath, 7 Nov'], [['Special offering in Sabbath worship', '7 Nov']]]);

  console.log('\n-- v10.44 review fixes --');
  // finding 2: never a verse and Ellen White on one slide; Christ named in every deciding deck, EN and ES
  c('no slide carries both a verse and an Ellen White line', AUDS.flatMap(a => ['en', 'es'].flatMap(L => D[L][a].slides.filter(s => (s.verse && /White ·/.test(s.verse.ref) && s.quote) || (s.quote && /White ·/.test(s.quote.ref) && s.verse)).map(s => a + ':' + s.type))), []);
  c('…and the deciding decks\' close quotes Testimonies vol. 5 p. 491 / tomo 5, pp. 463, 464', ['en', 'es'].map(L => D[L].board.slides.find(s => s.type === 'close').quote.ref),
    ['Ellen G. White · Testimonies for the Church, vol. 5, p. 491', 'Elena G. de White · Testimonios para la Iglesia, tomo 5, pp. 463, 464']);
  c('Christ is named in every deciding deck (Christ / Cristo)', ['finance', 'board', 'business', 'conference'].flatMap(a => ['en', 'es'].map(L => (L === 'en' ? /\bChrist/ : /\bCristo\b/).test(JSON.stringify(D[L][a])))).every(Boolean), true);
  // finding 4: undated steps in the order they happen (bought, installed, first use)
  const tl = (L, pre) => pages[L].J(`(()=>{ const it=buyGet('${ID}'); ${pre} const d=buyDeck(buyModel(it,'board')); return d.slides.find(s=>s.type==='timeline').steps.map(x=>[x.date,x.title]); })()`);
  c('no dates yet: Bought, Installed, First use (never backwards)', ['en', 'es'].map(L => tl(L, "it.dates={}; it.fund.lines=it.fund.lines.filter(l=>l.k!=='offering'); it.path=['board'];").map(x => x[1])),
    [['Bought', 'Installed', 'First livestream Sabbath'], ['Comprado', 'Instalación', 'Primer sábado transmitido']]);
  c('…only the offering dated: Special offering, Installed, First use', tl('en', "it.dates={}; it.path=['board'];").map(x => x.join(' ')), ['7 Nov Special offering', 'To agree Installed', 'To agree First livestream Sabbath']);
  // finding 9: the slides never cut the thing voted on
  c('the opening\'s row and the three options\' labels are never cut ("…")', AUDS.flatMap(a => ['en', 'es'].flatMap(L => D[L][a].slides.filter(s => s.type === 'motion' || (s.type === 'trio' && s.items && /\$/.test(s.items[0].value))).flatMap(s => [...(s.rows || []).map(r => r[1]), ...(s.items || []).map(i => i.label)]).filter(v => /…$/.test(String(v))).map(v => a + ' ' + L + ': ' + v))), []);
  c('…the opening names the tier and its total ("Better · $3,400" / "Mejor · $3,400")', ['en', 'es'].map(L => D[L].board.slides[1].rows[0][1]), ['Better · $3,400', 'Mejor · $3,400']);
  c('…the whole church\'s opening: what was chosen, whole, never a price', ['en', 'es'].map(L => D[L].congregation.slides[1].rows[0]), [['What', '16-channel digital mixer, PTZ camera and encoder'], ['Qué', 'Consola digital de 16 canales, cámara PTZ y codificador']]);
  // finding 3: a repair or a building project speaks of the work, never of a purchase
  const ROOF = `const it=buyGet('${ID}'); it.cat='building'; it.kind='repair'; it.team='deacons'; it.why=[{k:'safety'}]; it.name={en:'New roof',es:'Techo nuevo'}; it.need={en:'A new shingle roof',es:'Un techo nuevo de tejas'}; it.goal={};
    it.options=[{id:'a',tier:'good',src:'quote',company:'Roofer A',checked:'2026-09-20',name:{en:'Patch and repair',es:'Parche y reparación'},store:'Roofer A',price:9000,extra:0,features:{},install:{how:'pro',cost:0}},
      {id:'b',tier:'better',src:'quote',company:'Roofer B',checked:'2026-09-21',name:{en:'New shingle roof',es:'Techo nuevo de tejas'},store:'Roofer B',price:28000,extra:0,features:{},install:{how:'pro',cost:0}},
      {id:'c',tier:'best',src:'quote',company:'Roofer C',checked:'2026-09-22',name:{en:'Metal roof',es:'Techo de metal'},store:'Roofer C',price:41000,extra:0,features:{},install:{how:'pro',cost:0}}];
    it.pick='b'; it.fund={lines:[{k:'budget',amount:20000},{k:'offering',amount:8000,date:'2026-11-14'}],phases:null}; it.dates={}; delete it.sample;`;
  const roof = (L, a) => pages[L].J(`(()=>{ ${ROOF} const d=buyDeck(buyModel(it,'${a}')); return d.slides.map(s=>({type:s.type,kicker:s.kicker,headline:s.headline,rows:s.rows||null,steps:s.steps||null,verse:s.verse?s.verse.ref:s.type==='verse'?s.ref:null})); })()`);
  const R3 = { en: roof('en', 'business'), es: roof('es', 'business') };
  c('the roof (a repair): "Today the church votes on the work" / "Hoy la iglesia vota la obra"', ['en', 'es'].map(L => R3[L].filter(s => s.type === 'ask').pop().headline), ['Today the church votes on the work', 'Hoy la iglesia vota la obra']);
  c('…the board: "Approve the work" / "Aprobar la obra"', ['en', 'es'].map(L => roof(L, 'board').filter(s => s.type === 'ask').pop().headline), ['Approve the work', 'Aprobar la obra']);
  c('…the ask\'s first row is "The work", never "Buy"', ['en', 'es'].map(L => R3[L].filter(s => s.type === 'ask').pop().rows[0][0]), ['The work', 'La obra']);
  c('…the contractor is a "Company" / "Empresa", never a "Store"', ['en', 'es'].map(L => R3[L].find(s => s.kicker === (L === 'en' ? 'Our recommendation' : 'Nuestra recomendación')).rows.map(r => r[0]).filter(k => /^(Store|Tienda|Company|Empresa)$/.test(k))), [['Company'], ['Empresa']]);
  c('…the why slide says the reason he ticked ("So everyone who comes is safe"), not "Why new roof?"', ['en', 'es'].map(L => R3[L].find(s => s.kicker === (L === 'en' ? 'Why it matters' : 'Por qué importa')).headline), ['So everyone who comes is safe', 'Para que todos los que vienen estén seguros']);
  const tlR = L => R3[L].find(s => s.type === 'timeline').steps;
  c('…the timeline: the offering, the work days, the finished work "Ready for use" (never "In use for worship")', ['en', 'es'].map(L => tlR(L).map(x => x.title + ': ' + x.text)),
    [['Special offering: Ask the treasurer which Sabbath', 'Work days: On a weekday or Sunday', 'Work finished: Ready for use'], ['Ofrenda especial: El tesorero indica el sábado', 'Días de trabajo: Entre semana o en domingo', 'Obra terminada: Lista para usarse']]);
  c('…no Psalm 33:3 ("play skilfully with a loud noise") on a building\'s deck, any audience', AUDS.filter(a => a !== 'team').flatMap(a => ['en', 'es'].flatMap(L => roof(L, a).filter(s => /^(Psalm|Salmos) 33:3/.test(s.verse || '')).map(s => a + ' ' + L))), []);
  c('…a sound purchase keeps its words (the sample)', [D.en.business.slides.filter(s => s.type === 'ask').pop().headline, D.en.board.slides.find(s => s.kicker === 'Our recommendation').rows.map(r => r[0]).includes('Store')], ['Today the church votes on the purchase', true]);
  // finding 6: a sale or an event under "Something else" carries the Sabbath safeguard
  c('"Something else: a bake sale and a benefit dinner": the safeguard "Sales and events never on the Sabbath" / "Ventas y eventos nunca en sábado"', ['en', 'es'].map(L => pages[L].J(`(()=>{ const it=buyGet('${ID}'); it.fund.lines.push({k:'other',amount:600,note:{en:'Bake sale and a benefit dinner',es:'Venta de pasteles y una cena benéfica'}}); return buyDeck(buyModel(it,'board')).slides.find(s=>s.type==='risks').items.filter(x=>/events|eventos/.test(x)); })()`)),
    [['Sales and events never on the Sabbath'], ['Ventas y eventos nunca en sábado']]);
  // finding 20: the conference's slides ask for what the Church Manual asks: counsel for a loan, approval for building
  const conf = (L, pre) => pages[L].J(`(()=>{ const it=buyGet('${ID}'); ${pre} const d=buyDeck(buyModel(it,'conference')); return [d.slides.filter(s=>s.type==='ask').pop().headline,d.slides.find(s=>s.type==='close').text,buyDeck(buyModel(it,'board')).slides.find(s=>s.type==='risks').items.filter(x=>/onference|sociaci/.test(x))]; })()`);
  c('a loan: the conference counsels ("Counsel before any commitment"); the safeguard asks counsel, never the union', conf('en', "it.fund.lines.push({k:'other',amount:500,note:{en:'A bank loan'}});"),
    ['Counsel before any commitment', 'Counsel us before any commitment.', ['Counsel with the conference officers before any loan']]);
  c('…Spanish', conf('es', "it.fund.lines.push({k:'other',amount:500,note:{es:'Un préstamo del banco'}});"),
    ['Consejo antes de cualquier compromiso', 'Aconséjennos antes de cualquier compromiso.', ['Consultar a la asociación antes de cualquier préstamo']]);
  c('Build or add on: the conference and union committees approve', conf('en', "it.cat='building'; it.kind='build';"),
    ['Counsel and approval before any commitment', 'Counsel us, and approve before any commitment.', ['Conference and union approval before any commitment']]);
  c('a repair over his conference\'s amount: its review, no Church Manual and no union', conf('en', "it.cat='building'; it.kind='repair'; buyRulesSet({confAt:1000});"),
    ['Counsel before any commitment', 'Counsel us before any commitment.', ['Our conference reviews building work over $1,000']]);
  // finding 25: the van rule as NAD working policy says it (model year; modified vans too)
  c('a vehicle: the NAD van rule by model year, and any modified 15-passenger van (S 60 31)', ['en', 'es'].map(L => pages[L].J(`(()=>{ const it=buyGet('${ID}'); it.cat='vehicle'; it.why=[{k:'rides',n:6}]; return buyDeck(buyModel(it,'board')).slides.find(s=>s.type==='risks').items.find(x=>/15/.test(x)); })()`)),
    // (in fewer words than the finding's: the Spanish safeguards slide overflowed at 360 × 640 with them)
    ['Check your conference’s vehicle rules first. NAD working policy (S 60 31): no 15-passenger van older than model year 2013, none modified',
      'Consulte primero las normas de su asociación. Norma S 60 31 de la División Norteamericana: ninguna camioneta de 15 pasajeros anterior al modelo 2013, ni modificada']);
  c('the safeguards slide\'s citation in Spanish: "Manual de la Iglesia 2025 (inglés), pp. …" (the English edition\'s pages)', D.es.board.slides.find(s => s.type === 'risks').source, 'Manual de la Iglesia 2025 (inglés), pp. 92, 93, 148');

  console.log('\n-- after a recorded decision --');
  c('the finance deck opens "Recommended on 1 Oct 2026"; the board\'s says who recommended it', pages.en.J(`(()=>{ caseDecSave('${ID}',{v:1,body:'finance',date:'2026-10-01',outcome:'recommended',vote:null}); const it=buyGet('${ID}');
    const f=buyDeck(buyModel(it,'finance')).slides[1].kicker, b=buyDeck(buyModel(it,'board')).slides[1].by; caseDecDrop('${ID}','finance'); return [f,b]; })()`), ['Recommended on 1 Oct 2026', 'Recommended by the finance committee on 1 Oct 2026']);
  done();
})();
