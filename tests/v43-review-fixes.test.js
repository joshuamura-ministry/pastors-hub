/* v10.43 — THE REVIEW'S SMALLER FINDINGS (1 Oct 2026), each failing on the build before its fix.
 *
 * The pastor's bar for the connection cards: "beautiful and attractive, designed well, not just plain text"; the house rules: plain
 * words, nothing that tells a neighbour the card is not for them, nothing sent to anyone but the church. The design review and the
 * security review found these; the larger ones have their own suites (v43-privacy-docs, v43-cadence-words, connect-pdf, connect-tailor,
 * connect-function, connect-pastor).
 */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { load, lit } = require('./connect-blocks.js');
const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 500)); fail++; } else pass++; };
(async () => { try {
  const T = load(), BT = lit('LIB_BUILTIN_THEMES'), KIDS = lit('CASE_CHILD_BUILTINS');
  const B = (id, n) => T.cnIdea({ id, n, d: '' }, { builtinThemes: x => (BT[x.id] || '').split(' ').filter(Boolean), builtinKids: x => KIDS.includes(x.id), nameEs: x => x.n });

  console.log('\n-- S22: the neighbour\'s page asks no other site (Google Fonts only for the pastor\'s pages) --');
  { const head = HTML.slice(0, HTML.indexOf('</head>'));
    c('no stylesheet or preconnect to fonts.googleapis.com / fonts.gstatic.com in the page\'s markup', /<link[^>]+fonts\.(googleapis|gstatic)\.com/.test(head), false);
    const page = url => { const vc = new VirtualConsole(); const dom = new JSDOM(HTML, { runScripts: 'dangerously', url, virtualConsole: vc, beforeParse(w) { w.fetch = () => new Promise(() => { }); w.scrollTo = () => { }; } });
      const links = [...dom.window.document.querySelectorAll('link')].map(l => l.href).filter(h => /fonts\.(googleapis|gstatic)\.com/.test(h)); const cls = dom.window.document.documentElement.className; dom.window.close(); return [links.length, /\bcn-nofonts\b/.test(cls)]; };
    c('a #connect= page: no Google Fonts link at all, and the page is marked to use its own faces', page('https://pastorshub.org/#connect=HK7QM4RTZP'), [0, true]);
    c('the pastor\'s page: the three Google Fonts links, as before', page('https://pastorshub.org/'), [3, false]);
    c('the card page\'s faces are same-origin files (fonts/), with the phone\'s own as the fallback', [/@font-face\{font-family:'Terrain Card Script';src:url\(fonts\/CormorantGaramond-SemiBoldItalic\.ttf\)/.test(HTML), /html\.cn-nofonts \.cn-h\{font-family:'Terrain Card Script','Iowan Old Style'/.test(HTML)], [true, true]); }

  console.log('\n-- the phone\'s band: the church\'s name clear of the motif; headings that break well --');
  c('the church line ends before the motif\'s column (it ran 16–17 px into it on every phone)', [/\.cn-church\{position:relative;margin:0 0 8px;max-width:calc\(100% - min\(40%,220px\) - 24px\)/.test(HTML), /\.cn-church\{max-width:calc\(100% - min\(44%,240px\) - 24px\)\}/.test(HTML)], [true, true]);
  { const html = T.cnBandHTML({ church: 'Fairview Village Seventh-day Adventist Church', look: 'seasons', kind: 'family', cadence: 'event', title: { en: 'Fall festival', es: 'Festival de otoño' }, opts: [] }, 'en', {});
    c('"Seventh‑day" never breaks at its hyphen (a non-breaking hyphen in the band)', html.includes('Seventh‑day Adventist Church'), true); }
  c('headings keep "Thank you" together and never strand the last word', [T.cnHeadKeep('Thank you for coming!'), T.cnHeadKeep('Thank you, Grace'), T.cnHeadKeep('¡Gracias por venir!'), T.cnHeadKeep('We’re glad you came')],
    ['Thank you for coming!', 'Thank you, Grace', '¡Gracias por venir!', 'We’re glad you came']);

  console.log('\n-- the thank-you says the prayer too --');
  { const card = T.cnTailor(B('health-expo', 'Full health expo — screenings with a referral pathway'), { cadence: 'event', next: { name: { en: 'Plant-based cooking school', es: 'Escuela de cocina a base de plantas' } }, church: 'Sampleton SDA (SAMPLE)' });
    const th = (p, l) => T.cnThanks(card, new Set(p), 'Grace', l);
    c('the next step and prayer: "…the plant-based cooking school. We will pray for you." (EN, ES)', [th(['next', 'prayer'], 'en').body, th(['next', 'prayer'], 'es').body],
      ['Within two weeks we’ll tell you more about the plant-based cooking school. We will pray for you.', 'En las próximas dos semanas le contaremos más de la escuela de cocina a base de plantas. Oraremos por usted.']);
    c('…prayer alone keeps its own words once ("We will pray for you."), the next step alone says nothing of prayer', [th(['prayer'], 'en').full, th(['next'], 'en').body], ['Thank you, Grace. We will pray for you.', 'Within two weeks we’ll tell you more about the plant-based cooking school.']); }

  console.log('\n-- "For parents and guardians." only on cards about children --');
  { const sub = (id, n) => { const k = T.cnTailor(B(id, n), { cadence: 'event', church: 'Sampleton SDA (SAMPLE)' }); return [k.parent, T.cnWords(k, 'en').sub, !!T.cnWords(k, 'en').kidsHint]; };
    c('the fall festival and car care (all ages): "Let\'s stay in touch.", still "Please don\'t write children\'s names"', [sub('fall-festival', 'Fall festival on the church grounds'), sub('car-care', 'Car care day for single parents and seniors')],
      [[false, 'Let’s stay in touch.', true], [false, 'Let’s stay in touch.', true]]);
    c('back-to-school and the Christmas toy store for parents keep the parents\' line', [sub('backpack-giveaway', 'Back-to-school backpack giveaway')[1], sub('christmas-store', 'Christmas toy store for parents')[1]], ['For parents and guardians.', 'For parents and guardians.']); }

  console.log('\n-- the printed link, the icons, the health fair\'s own step --');
  c('the prayer icon is not a candle, the next step not the "sign in" door', [T.CN_ICON.prayer.includes('c-1.9 2.3-2.6 3.7'), T.CN_ICON.next.startsWith('M14 3h4a2 2 0 0 1 2 2v14')], [false, false]);
  { const step4 = /'health-expo':\['Book the venue[^\]]*\]/.exec(HTML)[0], step4es = /'health-expo':\{es:\[[^\]]*\]/.exec(HTML)[0];
    c('the health fair\'s step 4 matches the card: "Offer the connection card at every station; follow up within two weeks, only on what people ask for." (EN, ES)',
      [step4.includes('Offer the connection card at every station; follow up within two weeks, only on what people ask for.'), /worthless/.test(step4), step4es.includes('Ofrezca la tarjeta de contacto en cada estación; haga seguimiento en dos semanas, solo de lo que cada persona pida.'), /no sirve de nada/.test(step4es)],
      [true, false, true, false]); }
  c('the motifs say what they mean: open contour lines running off the edge, not target rings (general); no stars (seasons); no stray dots (family)',
    [Math.max(...T.CN_MOTIF.general.flatMap(it => (it.q || it.p || []).map(p => p[0]))) >= 359, T.CN_MOTIF.seasons.some(x => x.z), T.CN_MOTIF.family.some(x => x.f)], [true, false, false]);

  console.log('\n-- the built-ins\' own steps agree with the follow-up plan: a visit only if they ask, an invitation only to those who asked --');
  // (final review, 1 Oct 2026) The 4-night series said "Visit everyone who attended within two weeks" on slide 6 and "A visit: Only if
  // they ask" on its After slide; back-to-school's handout kept "the registration list" to invite every family. The plan he approved
  // (SPEC §2: "a visit only if they asked"; DESIGN D4: an invitation only to those who asked) is the rule, as the health fair's step 4.
  { const HOW = lit('HOW'), HES = lit('CASE_HOW_BUILTIN'); const i = HTML.indexOf('const SIGNATURE=['), sig = HTML.slice(i, HTML.indexOf('\n];', i));
    const en = JSON.stringify(HOW) + [...sig.matchAll(/\bhow:\[([^\]]*)\]/g)].map(m => m[1]).join('\n'), es = JSON.stringify(HES);
    const BAD_EN = /visit every(one|body)?\b|visit all\b|every attendee|everyone who (attended|came)|registration list and invite/gi;
    const BAD_ES = /visite a (todos|cada)|visite en dos semanas a todos|guarde la lista de inscripci[oó]n e invite/gi;
    c('no built-in step visits everyone, or invites every family from a list (EN, ES)', [[...en.matchAll(BAD_EN)].map(m => m[0]), [...es.matchAll(BAD_ES)].map(m => m[0])], [[], []]);
    c('the 4-night series, step 4 (EN, ES)', [HOW['four-nights'][3], HES['four-nights'].es[3]],
      ['Visit those who ask, within two weeks. Run it twice a year, not once a decade.', 'Visite en dos semanas a quienes lo pidan. Hágalo dos veces al año, no una vez por década.']);
    c('back-to-school, step 4 (EN, ES)', [/Invite only the families who ask to the fall festival and VBS\./.test(sig), HES['backpack-giveaway'].es[3]],
      [true, 'Invite solo a las familias que lo pidan al festival de otoño y a la Escuela Bíblica de Vacaciones.']); }
} catch (e) { console.log('  FAIL  crashed: ' + (e && e.stack || e)); fail++; }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
