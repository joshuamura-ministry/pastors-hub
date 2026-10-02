/* v56 · Make the Case · projects and purchases: the handout and the Proposal to vote on (DESIGN-PURCHASE.md §5, §10 T5).
 * His words: "a good, solid, professional proposal… proposals to the finance committee, then the board, then the church". Held here, on the
 * average church's sample, for the finance committee, the board, the business meeting, the conference and the whole church (handout only),
 * English and Spanish, motion first and explanation first: the handout at most two pages, the Proposal one page for the sample's finance
 * committee and board and at most two in every case; no line outside its box (every line jsPDF draws is logged with its box); the chart's
 * rows; the funding table's total = buyTotal; "Never from tithe"; the policy lines with their Church Manual 2025 pages; the motion's words
 * (DESIGN §11); the trail; Action taken filled once his decision is recorded; and every PDF passes present.mjs's active-content rule (no
 * links, annotations or images: a store's link is printed as plain text).
 */
const H = require('./v43-helpers.js');
const { c, page, ready, done, FX, SEED } = H;
const DATA = { ...FX.DATA, geo: { ...FX.DATA.geo, matched: SEED('purchase')['terrain-churches-v1'].churches['sample-sampleton-sda'].address } };
const ID = 'buy-avs001';
// present.mjs's own rule (present-1.4 pdfActive, copied: functions do not export it)
const PDF_BLOCK = new Set(['JavaScript', 'Launch', 'EmbeddedFile', 'EmbeddedFiles', 'RichMedia', 'XFA', 'ObjStm', 'GoToR', 'GoToE', 'SubmitForm', 'ImportData',
  'URI', 'Annots', 'AA', 'Link', 'AcroForm', 'Widget', 'GoTo', 'Named', 'Rendition', 'Sound', 'Movie', 'Image']);
function pdfActive(bytes) { const s = bytes.toString('latin1'); const re = /\/([^\x00\x09\x0a\x0c\x0d\x20/[\]()<>{}%]{2,48})/g; let m;
  while ((m = re.exec(s))) { let n = m[1]; if (n.includes('#')) n = n.replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); if (PDF_BLOCK.has(n)) return true;
    if (n === 'OpenAction' && !/^[\x00\x09\x0a\x0c\x0d\x20]*\[/.test(s.slice(re.lastIndex, re.lastIndex + 256))) return true; } return false; }
(async () => {
  const pages = { en: await ready(page('purchase', 'en', { data: DATA })), es: await ready(page('purchase', 'es', { data: DATA })) };
  const has = pages.en.E('typeof buyPdfDoc==="function"&&typeof buyProposalDoc==="function"');
  c('the page has the purchase handout and Proposal (v56)', has);
  if (!has) return done();
  const make = (L, a, order, pre) => pages[L].J(`(()=>{ ${pre || ''} uChurch().caseApproval={...caseApproval(),order:${JSON.stringify(order)}}; const it=buyGet('${ID}'); const m=buyModel(it,'${a}');
    const H=buyHandout(m), hd=buyPdfDoc(H,{jsPDF:window.jspdf.jsPDF}); const box=d=>(d.__caseLog||[]).filter(l=>l.x0<l.bx0-0.5||l.x1>l.bx1+0.5).map(l=>l.t);
    const out={h:{pages:hd.getNumberOfPages(),out:box(hd),lines:(hd.__caseLog||[]).map(l=>l.t),bytes:hd.output('datauristring').split(',')[1]},H:{fund:H.fund,chart:H.chart.labels}};
    const Pz=buyProposal(m); if(Pz){ const pd=buyProposalDoc(Pz,{jsPDF:window.jspdf.jsPDF}); out.p={pages:pd.getNumberOfPages(),out:box(pd),lines:(pd.__caseLog||[]).map(l=>l.t),bytes:pd.output('datauristring').split(',')[1]}; out.Pz={motion:Pz.motion,action:Pz.action,policy:Pz.policy,order:Pz.order}; }
    return out; })()`);
  const R = {};
  for (const L of ['en', 'es']) for (const a of ['finance', 'board', 'business', 'conference', 'congregation', 'team']) for (const order of ['motion', 'explain']) R[[L, a, order].join('|')] = make(L, a, order);
  const all = Object.entries(R);

  console.log('\n-- pages and boxes --');
  c('every handout: two pages at most', all.filter(([k, r]) => r.h.pages > 2).map(([k]) => k), []);
  c('the Proposal: one page for the sample\'s finance committee and board (EN and ES, both orders)', ['en', 'es'].flatMap(L => ['finance', 'board'].flatMap(a => ['motion', 'explain'].map(o => R[[L, a, o].join('|')].p.pages))), Array(8).fill(1));
  c('…at most two in every case (the business meeting and the conference too)', all.filter(([k, r]) => r.p && r.p.pages > 2).map(([k]) => k), []);
  c('no Proposal for the whole church or a team (they are not asked to vote)', all.filter(([k, r]) => /congregation|team/.test(k) && r.p).map(([k]) => k), []);
  c('no line outside its box, in any document', all.flatMap(([k, r]) => [...r.h.out, ...(r.p ? r.p.out : [])].map(t => k + ': ' + t)), []);
  c('every PDF passes present.mjs\'s active-content rule (no link, annotation, form or image)', all.flatMap(([k, r]) => [r.h.bytes, ...(r.p ? [r.p.bytes] : [])].map(b => pdfActive(Buffer.from(b, 'base64')))).some(Boolean), false);

  console.log('\n-- the handout --');
  const he = R['en|board|motion'].h.lines.join(' '), hs = R['es|board|motion'].h.lines.join(' ');
  c('the chart\'s rows (price, where to buy, key features, warranty, installation, running costs, checked)', ['PRICE', 'WHERE TO BUY', 'KEY FEATURES', 'WARRANTY', 'INSTALLATION', 'RUNNING COSTS', 'CHECKED'].filter(w => !he.includes(w)), []);
  c('…in Spanish', ['PRECIO', 'DÓNDE COMPRAR', 'CARACTERÍSTICAS', 'GARANTÍA', 'INSTALACIÓN', 'COSTOS DE', 'CONSULTADO'].filter(w => !hs.includes(w)), []);
  c('the funding table adds up to buyTotal: $3,400', [R['en|board|motion'].H.fund.total, pages.en.J(`buyMoney(buyTotal(buyGet('${ID}')))`)], ['$3,400', '$3,400']);
  c('"Never from tithe. Gifts given for this are used only for this (Church Manual 2025, pp. 148, 93)."', he.includes('Never from tithe. Gifts given for this are used only for this (Church Manual 2025, pp. 148, 93).'), true);
  // v10.44 review (finding 21): the pages are the English 2025 edition's, and the Spanish says so
  c('…"Nunca del diezmo…" (Manual de la Iglesia 2025, edición en inglés)', hs.includes('Nunca del diezmo. Los donativos dados para esto se usan solo para esto (Manual de la Iglesia 2025, edición en inglés, pp. 148, 93).'), true);
  c('the goal, the facts with their counts, the recommendation, the timeline, the trail ("this meeting"), Scripture and where the prices came from',
    ['A sound board and a camera, so that members who cannot come can worship with us every', '9 members who watch from home.', 'Better: 16-channel digital mixer + PTZ camera + encoder', 'Finance committee: 13 Oct 2026', 'Church board: this meeting', 'SCRIPTURE', 'Better: Store B (sample) · sample prices, made up for this example'].filter(w => !he.includes(w)), []);
  c('the finance committee\'s is headed "Finance committee recommendation · To: Treasurer & finance committee"', R['en|finance|motion'].h.lines.slice(0, 3).join(' ').includes('FINANCE COMMITTEE RECOMMENDATION · TO: TREASURER & FINANCE COMMITTEE'), true);
  c('no member\'s name, no key, no link annotation; the sample marked SAMPLE / MUESTRA', [he.includes('SAMPLE'), hs.includes('MUESTRA'), /Sam Sample \(sample\)|key=/.test(he)], [true, true, false]);

  console.log('\n-- the Proposal to vote on --');
  c('the board\'s motion, word for word (DESIGN §11: the store\'s own words for the option, each part with its article: v56 look, 2 Oct 2026)', R['en|board|motion'].Pz.motion,
    'To approve the purchase of a 16-channel digital mixer, a PTZ camera and an encoder (Better) from Store B (sample) for up to $3,400, including installation, tax and shipping, paid from the church budget ($1,000), a special offering in Sabbath worship on 7 November ($1,200), designated gifts ($600), a matching gift ($400) and the sale of the old mixer ($200); never from tithe; with Media & communication responsible for its care and training, and a report to the board by 15 December 2026.');
  c('…in Spanish', R['es|board|motion'].Pz.motion,
    'Aprobar la compra de una consola digital de 16 canales, una cámara PTZ y un codificador (Mejor) en Store B (sample) por un máximo de $3,400, con instalación, impuestos y envío, pagada con el presupuesto de la iglesia ($1,000), una ofrenda especial en el culto del sábado el 7 de noviembre ($1,200), donativos designados ($600), un donativo equivalente ($400) y la venta de la consola anterior ($200); nunca del diezmo; con Comunicación y medios a cargo de su cuidado y capacitación, y un informe a la junta antes del 15 de diciembre de 2026.');
  c('the finance committee recommends to the board; the business meeting: "That the church approve…"', [R['en|finance|motion'].Pz.motion.slice(0, 58), R['en|business|motion'].Pz.motion.slice(0, 48)],
    ['To recommend to the church board the purchase of a 16-chan', 'That the church approve the purchase of a 16-cha']);
  c('Build or add on: "…subject to the approval of the conference and union committees before any commitment."', pages.en.J(`(()=>{ const it=buyGet('${ID}'); it.cat='building'; it.kind='build'; return buyProposal(buyModel(it,'board')).motion.endsWith('subject to the approval of the conference and union committees before any commitment.'); })()`), true);
  c('the policy lines, each with its Church Manual 2025 page', R['en|board|motion'].Pz.policy,
    ['Tithe is never used by the local church, nor for buildings (Church Manual 2025, p. 148).', 'Gifts given for this are used only for this (Church Manual 2025, p. 93).',
      'The treasurer pays only on the board’s or the business meeting’s authorization (Church Manual 2025, p. 92).', 'A strong stand against questionable ways of raising money, such as lotteries (Church Manual 2025, p. 152). No raffles or games of chance (our rule).']);
  console.log('\n-- v10.44 review fixes --');
  // finding 1: Ellen White is never printed under "Scripture" / "Escritura": her line has its own heading, Spirit of Prophecy
  const HEADS = L => pages[L].J(`Object.values(BUY_P.heads).map(h=>h['${L}'].toUpperCase())`);
  const H2 = { en: HEADS('en'), es: HEADS('es') };
  const egwUnder = ([k, r]) => { const L = k.split('|')[0], ls = r.h.lines, i = ls.findIndex(t => /^(Ellen G\. White|Elena G\. de White) · /.test(t)); if (i < 0) return k + ': no Ellen White line';
    for (let j = i - 1; j >= 0; j--) if (H2[L].includes(ls[j])) return ls[j]; return k + ': no heading'; };
  c('every handout (each audience, EN and ES, both orders) prints Ellen White under SPIRIT OF PROPHECY / ESPÍRITU DE PROFECÍA', [...new Set(all.map(egwUnder))].sort(), ['ESPÍRITU DE PROFECÍA', 'SPIRIT OF PROPHECY']);
  c('…Scripture keeps only the verses', all.every(([k, r]) => { const ls = r.h.lines, s = ls.findIndex(t => t === 'SCRIPTURE' || t === 'ESCRITURA'), p = ls.findIndex(t => t === 'SPIRIT OF PROPHECY' || t === 'ESPÍRITU DE PROFECÍA'); return s >= 0 && p > s; }), true);
  // finding 2: the Proposal to vote on carries the Spirit of Prophecy too (its Why), and still fits
  c('the Proposal\'s Why: Testimonies vol. 5 p. 491, EN and ES (the sample fits one page at level 2–3: its reference)', [R['en|board|motion'].p.lines.join(' ').includes('Ellen G. White · Testimonies for the Church, vol. 5, p. 491'), R['es|board|motion'].p.lines.join(' ').includes('Testimonios para la Iglesia, tomo 5, pp. 463, 464')], [true, true]);
  c('…its words ("Christ’s representatives") where the page has room (levels 0–1)', pages.en.J(`(()=>{ const Pz=buyProposal(buyModel(buyGet('${ID}'),'board')); const d=buyProposalDocAt(Pz,{jsPDF:window.jspdf.jsPDF},0); return [Pz.why.egw.text.includes('Christ’s representatives'),(d.__caseLog||[]).map(l=>l.t).join(' ').includes('Christ’s representatives')]; })()`), [true, true]);
  // finding 11: no heading says the same body twice
  c('the board\'s handout: "PROPOSAL TO THE CHURCH BOARD" (no "TO: CHURCH BOARD"); the finance committee\'s keeps "TO: TREASURER & …"', [R['en|board|motion'].h.lines[1], R['es|board|motion'].h.lines[1], R['en|finance|motion'].h.lines.slice(0, 3).join(' ').includes('TO: TREASURER & FINANCE COMMITTEE')],
    ['PROPOSAL TO THE CHURCH BOARD', 'PROPUESTA A LA JUNTA DIRECTIVA', true]);
  c('the Proposal: "PROPOSAL TO VOTE ON · CHURCH BOARD" / "PROPUESTA PARA VOTAR · JUNTA DIRECTIVA"', [R['en|board|motion'].p.lines[1], R['es|board|motion'].p.lines[1], R['en|finance|motion'].p.lines[1]],
    ['PROPOSAL TO VOTE ON · CHURCH BOARD', 'PROPUESTA PARA VOTAR · JUNTA DIRECTIVA', 'PROPOSAL TO VOTE ON · FINANCE COMMITTEE']);
  // finding 21: the Spanish documents say whose page numbers they give (the English 2025 edition's)
  c('Spanish: "Manual de la Iglesia 2025, edición en inglés, p. …" (the English pages, said so)', [R['es|board|motion'].Pz.policy.every(p => /\(Manual de la Iglesia 2025, edición en inglés, pp?\. /.test(p)), R['es|board|motion'].h.lines.join(' ').includes('(Manual de la Iglesia 2025, edición en inglés, pp. 148, 93)')], [true, true]);
  c('…the chance line in Spanish', R['es|board|motion'].Pz.policy[3], 'Oponerse a los métodos cuestionables de recolectar dinero, como las loterías (Manual de la Iglesia 2025, edición en inglés, p. 152). Nunca rifas ni juegos de azar (nuestra regla).');
  // finding 3: a repair or a building project's motion is for the work, by the company, with materials and labor
  const ROOF = `const it=buyGet('${ID}'); it.cat='building'; it.kind='repair'; it.team='deacons'; it.why=[{k:'safety'}]; it.name={en:'New roof',es:'Techo nuevo'}; it.need={en:'A new shingle roof',es:'Un techo nuevo de tejas'}; it.goal={};
    it.options=[{id:'a',tier:'good',src:'quote',company:'Roofer A',checked:'2026-09-20',name:{en:'Patch and repair',es:'Parche y reparación'},store:'Roofer A',price:9000,extra:0,features:{},install:{how:'pro',cost:0}},
      {id:'b',tier:'better',src:'quote',company:'Roofer B',checked:'2026-09-21',name:{en:'New shingle roof',es:'Techo nuevo de tejas'},store:'Roofer B',price:28000,extra:0,features:{},install:{how:'pro',cost:0}},
      {id:'c',tier:'best',src:'quote',company:'Roofer C',checked:'2026-09-22',name:{en:'Metal roof',es:'Techo de metal'},store:'Roofer C',price:41000,extra:0,features:{},install:{how:'pro',cost:0}}];
    it.pick='b'; it.fund={lines:[{k:'budget',amount:20000},{k:'offering',amount:8000,date:'2026-11-14'}],phases:null}; it.dates={}; delete it.sample;`;
  const motionOf = (L, a, pre) => pages[L].J(`(()=>{ ${ROOF} ${pre || ''} return buyProposal(buyModel(it,'${a}')).motion; })()`);
  c('the roof, business meeting: "That the church approve the work, a new shingle roof (Better) by Roofer B, … including materials and labor …"', motionOf('en', 'business'),
    'That the church approve the work, a new shingle roof (Better) by Roofer B, for up to $28,000, including materials and labor, paid from the church budget ($20,000) and a special offering in Sabbath worship on 14 November ($8,000); never from tithe; with Deacons & deaconesses overseeing the work, and a report to the board when it is finished.');
  c('…in Spanish', motionOf('es', 'business'),
    'Que la iglesia apruebe la obra, un techo nuevo de tejas (Mejor), a cargo de Roofer B, por un máximo de $28,000, con materiales y mano de obra, pagada con el presupuesto de la iglesia ($20,000) y una ofrenda especial en el culto del sábado el 14 de noviembre ($8,000); nunca del diezmo; con Diáconos y diaconisas supervisando la obra, y un informe a la junta cuando esté terminada.');
  c('…the board and the finance committee too; never "purchase", "tax and shipping" or "care and training"', ['board', 'finance'].flatMap(a => ['en', 'es'].map(L => motionOf(L, a))).filter(t => /purchase|compra|tax and shipping|impuestos y envío|care and training|cuidado y capacitación/.test(t)), []);
  // finding 20: the Church Manual's p. 153, said as it is: counsel for any debt; the conference and union committees for buying or building
  // church property; and a repair over his conference's amount is his conference's own rule, with no Church Manual page
  const confOf = (L, pre) => pages[L].J(`(()=>{ const it=buyGet('${ID}'); ${pre} const Pz=buyProposal(buyModel(it,'board')); return [Pz.policy.filter(p=>/153|onference|sociaci/.test(p)),Pz.risks.filter(p=>/onference|sociaci/.test(p)),Pz.motion.replace(/^.*never from tithe|^.*nunca del diezmo/,'')]; })()`);
  c('a loan: counsel with the conference officers first (p. 153), never the union', confOf('en', "it.fund.lines.push({k:'other',amount:500,note:{en:'A bank loan'}});"),
    [['Any loan or debt: counsel with the conference officers first (Church Manual 2025, p. 153).'], ['Counsel with the conference officers before any loan'], '; with Media & communication responsible for its care and training, and a report to the board by 15 December 2026, after counsel with the conference officers.']);
  c('…Spanish', confOf('es', "it.fund.lines.push({k:'other',amount:500,note:{es:'Un préstamo del banco'}});"),
    [['Cualquier préstamo o deuda: consultar primero con los dirigentes de la asociación (Manual de la Iglesia 2025, edición en inglés, p. 153).'], ['Consultar a la asociación antes de cualquier préstamo'], '; con Comunicación y medios a cargo de su cuidado y capacitación, y un informe a la junta antes del 15 de diciembre de 2026, después de consultar con los dirigentes de la asociación.']);
  c('Build or add on: the conference and union committees approve before any commitment (p. 153)', confOf('en', "it.cat='building'; it.kind='build';")[0],
    ['Buying or building church property: the conference and union committees approve before any commitment (Church Manual 2025, p. 153).']);
  c('…Spanish', confOf('es', "it.cat='building'; it.kind='build';")[0],
    ['Comprar o construir propiedades de la iglesia: las comisiones de la asociación y de la unión aprueban antes de cualquier compromiso (Manual de la Iglesia 2025, edición en inglés, p. 153).']);
  c('a repair over his conference\'s amount ($1,000): its review, no Church Manual page, no union', confOf('en', "it.cat='building'; it.kind='repair'; buyRulesSet({confAt:1000});"),
    [['Our conference reviews building work over $1,000 (our conference’s rule).'], ['Our conference reviews building work over $1,000'], '; with Media & communication overseeing the work, and a report to the board by 15 December 2026, after the conference’s review.']);
  c('…Spanish', confOf('es', "it.cat='building'; it.kind='repair'; buyRulesSet({confAt:1000});")[0], ['Nuestra asociación revisa obras de más de $1,000 (regla de nuestra asociación).']);
  c('the finance committee\'s puts the money first; the board\'s opens with the motion, or explains first when the church says so', [R['en|finance|motion'].Pz.order, R['en|board|motion'].Pz.order, R['en|board|explain'].Pz.order], ['fund', 'motion', 'explain']);
  const pe = R['en|board|motion'].p.lines.join(' ');
  c('its parts: the memo, THE MOTION, WHY, THE OPTIONS, OUR RECOMMENDATION, HOW WE\'LL PAY, POLICY, SAFEGUARDS, REVIEW, ACTION TAKEN', ['CHURCH', 'SUBJECT', 'THE MOTION', 'WHY', 'THREE OPTIONS', 'OUR RECOMMENDATION', 'HOW WE’LL PAY', 'POLICY', 'SAFEGUARDS', 'REVIEW', 'ACTION TAKEN', 'Report to the board after 28 Nov: cost, receipts, how it is used.'].filter(w => !pe.includes(w)), []);
  c('…Spanish: LA MOCIÓN, NORMAS, ACUERDO TOMADO, Secretario(a) de la iglesia', ['LA MOCIÓN', 'NORMAS', 'ACUERDO TOMADO', 'Secretario(a) de la iglesia'].filter(w => !R['es|board|motion'].p.lines.join(' ').includes(w)), []);
  c('Action taken: blank before a decision, the outcome ticked and the date and vote filled after it', pages.en.J(`(()=>{ const it=buyGet('${ID}'); const a=buyProposal(buyModel(it,'board')).action;
    caseDecSave('${ID}',{v:1,body:'board',date:'2026-10-01',outcome:'approved',vote:{for:9,against:1}}); const b=buyProposal(buyModel(it,'board')).action; caseDecDrop('${ID}','board');
    return [a.outcomes.filter(o=>o.on).length,a.date,b.outcomes.filter(o=>o.on).map(o=>o.label),b.date,b.vote.for]; })()`), [0, '', ['Approved'], '1 Oct 2026', 9]);
  c('the board\'s outcomes leave out "Recommended to the business meeting" when the business meeting is not on the path', R['en|board|motion'].Pz.action.outcomes.map(o => o.label), ['Approved', 'Amended', 'Referred', 'Declined']);
  done();
})();
