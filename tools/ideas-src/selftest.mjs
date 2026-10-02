#!/usr/bin/env node
/* Self-test for validate.mjs: each case mutates a passing example idea and states whether the
   validator must FAIL it, flag it for REVIEW, or pass it cleanly. Run: node selftest.mjs */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TMP = path.join(HERE, '.selftest');
fs.mkdirSync(TMP, {recursive: true});
const base = JSON.parse(fs.readFileSync(path.join(HERE, 'examples.json'), 'utf8')).ideas[0];
const clone = o => JSON.parse(JSON.stringify(o));
function run(file, ...extra) {
  try { return {code: 0, out: execFileSync(process.execPath, [path.join(HERE, 'validate.mjs'), ...extra, file], {encoding: 'utf8'})}; }
  catch (e) { return {code: e.status, out: String(e.stdout || '')}; }
}
const setEn = (x, i, s) => { x.en.how[i] = s; return x; };
const setEs = (x, i, s) => { x.es.how[i] = s; return x; };
// A quiet idea at the church building with no reach words, moved into theme `t`.
const atChurch = (x, t) => { x.theme = t; x.id = `${t}-quiet-hour`; x.where = 'church'; x.en = {n: 'Quiet hour in the sanctuary', d: 'The sanctuary is open for quiet prayer every Tuesday at noon. Two members sit at the front and pray there together for an hour.', how: ['Unlock the sanctuary at noon on Tuesday each week.', 'Two members sit at the front and pray together.', 'Keep the lights low and the room quiet.', 'Lock up at one and thank whoever came.']}; return x; };
const minorsOk = x => { x.minors = true; x.skill = ['kids']; setEn(x, 3, 'Every adult is screened with a background check, and two adults are always present.'); setEs(x, 3, 'Cada adulto pasa la verificación de antecedentes y siempre hay dos adultos presentes.'); return x; };

const cases = [
  // [label, expect 'fail'|'review'|'ok', mutate(x), pattern the output must contain]
  ['baseline passes', 'ok', x => x],
  ['children names EN', 'fail', x => setEn(x, 1, 'Ask parents to write the names of their children on the card so we can pray.'), /names, photos/],
  ["kids' names EN", 'fail', x => setEn(x, 1, "Keep a notebook of the kids' names who come by the table each month."), /names, photos/],
  ['school gate EN', 'fail', x => setEn(x, 2, 'Stand at the school gate at pick-up with a basket of cards for parents.'), /school gate/],
  ['playground EN', 'fail', x => setEn(x, 2, 'Leave cards on the benches at the playground on Sunday afternoons.'), /playground/],
  ['school bus stop EN', 'fail', x => setEn(x, 2, 'Hand cards to parents waiting at the school bus stop each morning.'), /school bus stop/],
  ['outside school hours is fine', 'ok', x => setEn(x, 2, 'Walk in pairs outside school hours, praying quietly for each home; tuck the card in the door.')],
  ['pray about their children EN', 'fail', x => setEn(x, 1, 'Invite neighbors to send prayer requests for their children and grandchildren.'), /prayer requests about/],
  ['members praying for their own children is a REVIEW', 'review', x => setEn(x, 1, 'Mothers who asked to join meet on Zoom to pray for their children and for the town.'), /own children/],
  ['negated safeguard is a REVIEW', 'review', x => setEn(x, 1, 'We never ask for student names or photos; the QR form asks only for the request.'), /negation/],
  ['no raffle tickets is a REVIEW', 'review', x => setEn(x, 1, 'No raffle tickets and no sales: the cards are free and the QR form stays private.'), /negation/],
  ['add a name next to child EN', 'fail', x => setEn(x, 1, 'The form lets a parent add a child name for the prayer team to remember.'), /add a name/],
  ['reach kids EN', 'fail', x => setEn(x, 1, 'This is the easiest way we have found to reach kids who never come to church.'), /access to children/],
  ['get kids in EN', 'fail', x => setEn(x, 1, 'A bounce house on the lawn will get the kids in and the parents will follow.'), /access to children/],
  ['get children to school is fine', 'ok', x => setEn(x, 1, 'Offer rides that help parents get children to school when the car breaks down.')],
  ['names of children ES', 'fail', x => setEs(x, 1, 'Pida a los padres los nombres de sus hijos para orar por ellos cada semana.'), /nombres, fotos/],
  ['school gate ES', 'fail', x => setEs(x, 2, 'Reparta tarjetas en la puerta de la escuela a la hora de salida.'), /puerta de la escuela/],
  ['playground ES', 'fail', x => setEs(x, 2, 'Deje tarjetas en el parque infantil los domingos por la tarde.'), /parque infantil/],
  ['prayer for their kids ES', 'fail', x => setEs(x, 1, 'Invite a los vecinos a enviar pedidos de oración por sus hijos.'), /hijos de otros/],
  ['pork', 'fail', x => setEn(x, 0, 'Serve bacon sandwiches to the walkers before they set out on the streets.'), /pork/],
  ['veggie hot dogs are fine', 'ok', x => setEn(x, 0, 'Serve veggie hot dogs to the walkers before they set out on the streets.')],
  ['ham radio is fine', 'ok', x => setEn(x, 0, 'Ask a ham radio operator in the church to join the walkers on the streets.')],
  ['chorizo ES', 'fail', x => setEs(x, 0, 'Sirva tacos de chorizo a los que caminan antes de salir a las calles.'), /pork/],
  ['alcohol', 'fail', x => setEn(x, 0, 'Meet at the brewery on Main Street afterwards to debrief the walk.'), /alcohol/],
  ['raffle that raises money', 'fail', x => setEn(x, 0, 'Hold a raffle for a gift basket to pay for the printing of the cards.'), /raffle/],
  ['selling raffle tickets', 'fail', x => setEn(x, 0, 'Sell raffle tickets for a gift basket at the table each week.'), /raffle/],
  ['a free drawing is fine (the pastor, 1 Oct 2026)', 'ok', x => setEn(x, 0, 'Draw one name among the guests for a free Bible; nobody pays to enter.'), /OK/],
  ['Sabbath: a fair with game booths is a REVIEW', 'review', x => setEn(x, 0, 'Add a festival with game booths and a bounce house on the lawn.'), /SABBATH-GUIDELINE/],
  ['Sabbath: Spanish selling is a REVIEW', 'review', x => setEs(x, 0, 'Vendan galletas en la mesa para cubrir la impresión de las tarjetas.'), /ES text mentions/],
  ['Sabbath: "vendrán" is not selling', 'ok', x => setEs(x, 0, 'Los vecinos vendrán a la mesa cuando vean las tarjetas gratuitas cada semana.'), /OK/],
  ['Sabbath: bought beforehand is fine', 'ok', x => setEn(x, 0, 'Buy the cards and pens beforehand so nothing is bought on the day itself.'), /OK/],
  ['Sabbath: a cafe with no home, church or park is a REVIEW', 'review', x => setEn(x, 0, 'Meet at the diner on Main Street each week and pray over the cards.'), /where nothing is bought/],
  ['gambling recovery is fine', 'ok', x => { x.theme = 'prayer'; setEn(x, 0, 'Pray for people in recovery from gambling addiction, and name a Gamblers Anonymous meeting.'); return x; }],
  ['targeting', 'fail', x => setEn(x, 0, 'Choose streets by targeting the homes with the most renters in the survey.'), /target/],
  ['segmentar ES', 'fail', x => setEs(x, 0, 'Use la segmentación de anuncios para llegar a su público objetivo en el barrio.'), /target/],
  ['bait', 'fail', x => setEn(x, 0, 'Use the free coffee as bait so neighbors stop at the table and talk.'), /bait/],
  ['convert them', 'fail', x => setEn(x, 0, 'The walk is the first step to convert them, so keep a careful record.'), /convert/],
  ['job prospects are fine', 'ok', x => setEn(x, 0, 'Pray by name for neighbors whose job prospects changed when the plant closed.')],
  ['counselling without partner', 'fail', x => setEn(x, 0, 'Offer free counseling sessions to anyone who texts the line with a problem.'), /counselling/],
  ['counselling with referral is fine', 'ok', x => setEn(x, 0, 'We are not counselors; refer anyone in crisis to 988 and to a licensed counselor.')],
  ['door-to-door survey', 'fail', x => setEn(x, 0, 'Do a door-to-door survey of needs and record each household on a sheet.'), /personal information/],
  ['minors without kids skill', 'fail', x => { x.minors = true; setEn(x, 3, 'Every adult is screened with a background check, and two adults are always present.'); setEs(x, 3, 'Cada adulto pasa la verificación de antecedentes y siempre hay dos adultos presentes.'); return x; }, /needs "kids" in skill/],
  ['minors without screening', 'fail', x => { x.minors = true; x.skill = ['kids']; return x; }, /must mention screening/],
  ['minors done right is a REVIEW', 'review', x => minorsOk(x), /outsider test/],
  ['ages children with minors false', 'fail', x => { x.ages = 'children'; return x; }, /set minors:true/],
  ['SIGNATURE id', 'fail', x => { x.id = 'prayer-box'; return x; }, /built-in SIGNATURE id/],
  ['SIGNATURE name', 'fail', x => { x.en.n = 'A prayer request box where people wait'; return x; }, /equals the built-in/],
  ['tier 1 too expensive', 'fail', x => { x.cost = 500; return x; }, /cost at most/],
  ['tier 3 needs budget or partner', 'fail', x => { x.tier = 3; x.ppl = 4; x.leaders = 1; x.cost = 100; x.costMo = 10; return x; }, /budget line or a partner/],
  ['unknown field', 'fail', x => { x.w = 7; return x; }, /unknown field "w"/],
  ['bad tag', 'fail', x => { x.need = ['prayerful']; return x; }, /not a profile\(\) tag/],
  ['bad skill', 'fail', x => { x.skill = ['prayer']; return x; }, /skill list/],
  ['bad fac', 'fail', x => { x.fac = ['kitchen|chapel']; return x; }, /facility keys/],
  ['good fac', 'ok', x => { x.fac = ['kitchen', 'classrooms|center']; return x; }],
  ['name too long', 'fail', x => { x.en.n = 'A very long name that goes on and on past the sixty character limit'; return x; }, /en\.n must be/],
  ['four sentences', 'fail', x => { x.en.d = 'One sentence here. Two sentences here. Three sentences here. Four sentences here, which is too many for a card.'; return x; }, /2-3 sentences/],
  ['step too long', 'fail', x => setEn(x, 0, 'x'.repeat(141)), /how\[0\] must be/],
  ['untranslated', 'fail', x => { x.es.n = x.en.n; return x; }, /translate it/],
  ['church with no reach words', 'review', x => { x.where = 'church'; x.en = {n: 'Quiet hour in the sanctuary', d: 'The sanctuary is open for quiet prayer every Tuesday at noon. Two members sit at the front and pray there together for an hour.', how: ['Unlock the sanctuary at noon on Tuesday each week.', 'Two members sit at the front and pray together.', 'Keep the lights low and the room quiet.', 'Lock up at one and note how many came.']}; return x; }, /no reach words/],
  ['tu instead of usted', 'review', x => setEs(x, 0, 'Diseña en Canva tus tarjetas con el mensaje y un código QR para tu equipo.'), /usted/],
  ['British spelling', 'review', x => setEn(x, 0, 'Design cards for every neighbour in Canva with the message and a QR code.'), /US spelling/],
  ['salad bar is fine', 'ok', x => setEn(x, 0, 'Meet at the grocery store salad bar and design the cards in Canva with a QR code.')],
  // love without pressure (WRITERS.md, INSIDE THE CHURCH): every theme
  ['guilt: why weren\'t you EN', 'fail', x => setEn(x, 3, 'If a member misses a week, text them: "Why weren\'t you here last Sabbath?"'), /guilt or pressure/],
  ["guilt: you've been missing EN", 'fail', x => setEn(x, 3, "Mail a card that says you've been missing for a month and the church needs you back."), /guilt or pressure/],
  ['guilt: no excuses EN', 'fail', x => setEn(x, 3, 'Remind every member that there are no excuses for missing prayer meeting.'), /guilt or pressure/],
  ['guilt: where have you been EN', 'fail', x => setEn(x, 3, 'When they come back, greet them warmly: "Where have you been?" and a hug.'), /guilt or pressure/],
  ['guilt: por qué no vino ES', 'fail', x => setEs(x, 3, 'Si alguien falta, llámelo el lunes y pregúntele: «¿Por qué no vino el sábado?»'), /guilt or pressure/],
  ['guilt: ha estado faltando ES', 'fail', x => setEs(x, 3, 'Envíe una tarjeta que diga que ha estado faltando y que la iglesia lo espera.'), /guilt or pressure/],
  ['a kind missed-you card is fine', 'ok', x => setEn(x, 3, 'Mail a card within three days: "We missed you and hope you are well. No need to reply."')],
  ['"why don\'t you join us" is fine', 'ok', x => setEn(x, 3, 'End each card with a warm line: "Why don\'t you join us for lunch after church?"')],
  ['¿Dónde estaba Dios? is fine', 'ok', x => setEs(x, 3, 'Titule la noche «¿Dónde estaba Dios en mi dolor?» y deje preguntas escritas en tarjetas.')],
  ['never ask why is a REVIEW', 'review', x => setEn(x, 3, 'Never ask "why weren\'t you here?"; say only that we missed them and are praying.'), /safeguard/],
  ['nunca pregunte por qué ES is a REVIEW', 'review', x => setEs(x, 3, 'Nunca pregunte «¿por qué no vino?»; diga solo que lo extrañamos y que oramos por usted.'), /safeguard/],
  ['post the attendance', 'fail', x => setEn(x, 3, 'Post the attendance on the lobby board each week so everyone sees who came.'), /attendance or absence/],
  ['perfect attendance award', 'fail', x => setEn(x, 3, 'Give a perfect attendance pin to each member at the end of the quarter.'), /attendance or absence/],
  ['publique la asistencia ES', 'fail', x => setEs(x, 3, 'Publique la lista de asistencia en el tablero cada sábado para animar a todos.'), /attendance or absence/],
  ['a private care list is fine', 'ok', x => setEn(x, 3, 'Keep the care list in one locked file that only the three greeters see; remove anyone who asks.')],
  ['list of who gave', 'fail', x => setEn(x, 3, 'Print a list of who gave to the building fund so the church can thank them.'), /listing of giving/],
  ['top givers', 'fail', x => setEn(x, 3, 'Invite the top givers to a thank-you breakfast with the pastor each year.'), /listing of giving/],
  ['donors by name from the pulpit', 'fail', x => setEn(x, 3, 'Thank the donors by name from the pulpit on the Sabbath after the drive.'), /listing of giving/],
  ['lista de quienes diezmaron ES', 'fail', x => setEs(x, 3, 'Lea una lista de quienes diezmaron este trimestre para dar gracias a Dios.'), /listing of giving/],
  ['thanking donors in the bulletin is fine', 'ok', x => setEn(x, 3, 'Thank donors in the bulletin as a group, and share budget totals with one simple chart.')],
  ['public confession', 'fail', x => setEn(x, 3, 'Ask members who fell to make a public confession before the church board.'), /sins or struggles/],
  ['public confession of faith is fine', 'ok', x => setEn(x, 3, 'Celebrate each public confession of faith with a card signed by the whole class.')],
  ['backsliders is a dignity REVIEW', 'review', x => setEn(x, 3, 'Send a card to the backsliders each month with a short note from the pastor.'), /dignity/],
  // INSIDE THE CHURCH themes: an idea rightly at the church skips the "no reach words" REVIEW
  ['inside theme at the church is fine', 'ok', x => atChurch(x, 'member-care')],
  // reach: optional "in" | "out" | "both"; the theme's default is "in" when inside, else "out"
  ['reach "in" is fine', 'ok', x => { x.reach = 'in'; return x; }],
  ['reach "out" is fine', 'ok', x => { x.reach = 'out'; return x; }],
  ['reach "both" is fine', 'ok', x => { x.reach = 'both'; return x; }],
  ['reach "inside" fails', 'fail', x => { x.reach = 'inside'; return x; }, /reach must be one of in\|out\|both/],
  ['reach "In" fails (lowercase only)', 'fail', x => { x.reach = 'In'; return x; }, /reach must be one of/],
  ['reach "" fails', 'fail', x => { x.reach = ''; return x; }, /reach must be one of/],
  ['reach null fails', 'fail', x => { x.reach = null; return x; }, /reach must be one of/],
  ['reach as a list fails', 'fail', x => { x.reach = ['in', 'out']; return x; }, /reach must be one of/],
  ['bad reach names the theme default', 'fail', x => { atChurch(x, 'member-care'); x.reach = 'members'; return x; }, /default \("in" here\)/],
  ['outward theme, reach "in", at the church: no reach-words REVIEW', 'ok', x => { atChurch(x, 'prayer'); x.reach = 'in'; return x; }],
  ['outward theme, reach "both", at the church: REVIEW', 'review', x => { atChurch(x, 'prayer'); x.reach = 'both'; return x; }, /no reach words/],
  ['inside theme, reach "out", at the church: REVIEW', 'review', x => { atChurch(x, 'member-care'); x.reach = 'out'; return x; }, /no reach words/],
  ['inside theme, reach "both", at the church: REVIEW', 'review', x => { atChurch(x, 'member-care'); x.reach = 'both'; return x; }, /no reach words/],
  ['department theme marked inside (global-mission) at the church is fine', 'ok', x => atChurch(x, 'global-mission')],
  ['department theme not inside (pathfinders) at the church: REVIEW', 'review', x => atChurch(x, 'pathfinders'), /no reach words/],
  ['department theme not inside (pathfinders), reach "in": fine', 'ok', x => { atChurch(x, 'pathfinders'); x.reach = 'in'; return x; }]
];

let bad = 0;
cases.forEach(([label, expect, mutate, pat], i) => {
  const x = mutate(clone(base));
  const f = path.join(TMP, `case${i}.json`);
  fs.writeFileSync(f, JSON.stringify({theme: x.theme, ideas: [x]}));
  const {code, out} = run(f, '--ideas-only');
  const failed = code !== 0, reviewed = /^REVIEW /m.test(out);
  let ok = expect === 'fail' ? failed : expect === 'review' ? (!failed && reviewed) : (!failed && !reviewed);
  if (ok && pat && !pat.test(out)) ok = false;
  if (!ok) { bad++; console.log(`WRONG  ${label}: expected ${expect}\n${out}`); } else console.log(`right  ${label}`);
});

// Theme quotas: 50 distinct ideas that pass one by one, then break the quotas.
const words = 'amber birch cedar delta ember fable grove harbor island juniper kettle lantern meadow north orchard prairie quarry river summit timber upland valley willow yarrow zephyr acorn brook canyon dune fjord glacier hollow inlet jetty knoll ledge marsh oasis pebble ridge shoal tundra vista wharf alder basin cliff dell eddy fen'.split(' ');
const make = (i, tier, k, where) => { const x = clone(base); x.id = `prayer-test-${i}`; x.tier = tier; x.k = k; x.where = where;
  if (tier > 1) { x.ppl = 4; x.leaders = 1; } if (tier === 3) { x.cost = 400; }
  x.en.n = `${words[i]} ${words[(i + 17) % 50]} test`; x.es.n = `prueba ${words[i]} ${words[(i + 17) % 50]}`; return x; };
const good = []; const K = ['serve', 'equip', 'belong', 'invite'], W = ['streets', 'homes', 'online', 'community', 'parks'];
for (let i = 0; i < 50; i++) good.push(make(i, i < 20 ? 1 : i < 40 ? 2 : 3, K[i % 4], W[i % 5]));
const tf = path.join(TMP, 'prayer.json');
const quota = [
  ['50 good ideas pass the quotas', 'ok', a => a],
  ['49 ideas', 'fail', a => a.slice(0, 49), /at least 50/],
  ['too few tier 3', 'fail', a => a.map((x, i) => i >= 40 && i < 45 ? {...x, tier: 2, cost: 60} : x), /tier 3: 5 ideas/],
  ['one kind above 45%', 'fail', a => a.map((x, i) => i < 24 ? {...x, k: 'serve'} : x), /"serve" is/],
  ['missing a kind', 'fail', a => a.map(x => x.k === 'invite' ? {...x, k: 'belong'} : x), /no "invite" ideas/],
  ['only 3 where values', 'fail', a => a.map(x => ['parks', 'community'].includes(x.where) ? {...x, where: 'streets'} : x), /different "where"/],
  ['too few digital ideas', 'fail', a => a.map((x, i) => i < 40 ? {...x, en: {...x.en, d: 'Members walk the streets around the church in pairs, praying for each home. A card goes in each door, and nothing is asked.', how: ['Print cards with a kind message and a phone number to call.', 'Walk in pairs, one street at a time, praying quietly for each home.', 'Tuck the card in the door, never in the mailbox.', 'Mark covered streets on a paper map and return in three months.']}} : x), /digital\/social-media component/],
  ['near-duplicate names', 'fail', a => a.map((x, i) => i === 1 ? {...x, en: {...x.en, n: a[0].en.n + ' again'}} : x), /names too close/]
];
quota.forEach(([label, expect, mutate, pat]) => {
  fs.writeFileSync(tf, JSON.stringify({theme: 'prayer', ideas: mutate(clone(good))}));
  const {code, out} = run(tf, '--no-review');
  let ok = expect === 'fail' ? code !== 0 : code === 0;
  if (ok && pat && !pat.test(out)) ok = false;
  if (!ok) { bad++; console.log(`WRONG  ${label}: expected ${expect}\n${out.slice(0, 2000)}`); } else console.log(`right  ${label}`);
});
// "More than 35% at the church building" is measured on the ideas neighbors meet (reach out or both).
const churchy = a => a.map((x, i) => i < 25 ? {...x, where: 'church'} : x);
const share = [
  ['25 of 50 outward ideas at the church: theme REVIEW', 'review', a => churchy(a)],
  ['the same 25 marked reach "in": no theme REVIEW', 'ok', a => churchy(a).map((x, i) => i < 25 ? {...x, reach: 'in'} : x)],
  ['reach "both" still counts as meeting neighbors', 'review', a => churchy(a).map((x, i) => i < 25 ? {...x, reach: 'both'} : x)]
];
share.forEach(([label, expect, mutate]) => {
  fs.writeFileSync(tf, JSON.stringify({theme: 'prayer', ideas: mutate(clone(good))}));
  const {code, out} = run(tf);
  const themeReview = /^REVIEW \S+ \(theme\) \d+ of \d+ ideas for neighbors/m.test(out);
  const ok = code === 0 && (expect === 'review' ? themeReview : !themeReview);
  if (!ok) { bad++; console.log(`WRONG  ${label}: expected ${expect}\n${out.slice(0, 2000)}`); } else console.log(`right  ${label}`);
});

// themes.json and reach.json, checked by --all in a scratch copy of the library (the other themes report MISSING).
const LIB = path.join(TMP, 'lib');
const realThemes = JSON.parse(fs.readFileSync(path.join(HERE, 'themes.json'), 'utf8'));
function runLib(themes, reach, ideas) {
  fs.rmSync(LIB, {recursive: true, force: true}); fs.mkdirSync(path.join(LIB, 'themes'), {recursive: true});
  for (const f of ['validate.mjs', 'vocab.json']) fs.copyFileSync(path.join(HERE, f), path.join(LIB, f));
  fs.writeFileSync(path.join(LIB, 'themes.json'), JSON.stringify(themes));
  fs.writeFileSync(path.join(LIB, 'themes', 'prayer.json'), JSON.stringify({theme: 'prayer', ideas}));
  if (reach !== undefined) fs.writeFileSync(path.join(LIB, 'reach.json'), typeof reach === 'string' ? reach : JSON.stringify(reach));
  try { return execFileSync(process.execPath, [path.join(LIB, 'validate.mjs'), '--all', '--no-review'], {encoding: 'utf8'}); }
  catch (e) { return String(e.stdout || ''); }
}
const withTheme = (id, f) => { const t = clone(realThemes); f(t.themes.find(x => x.id === id), t); return t; };
const lib = [
  // [label, themes.json, reach.json (undefined = none), ideas, pattern that must appear, pattern that must not]
  ['the real themes.json passes', realThemes, undefined, good, /^OK themes\.json 57 themes$/m, /^ERROR themes\.json/m],
  ['inside: false is fine', withTheme('pathfinders', t => { t.inside = false; }), undefined, good, /^OK themes\.json/m, /^ERROR themes\.json/m],
  ['inside: "yes" fails', withTheme('pathfinders', t => { t.inside = 'yes'; }), undefined, good, /"inside" must be true or false/, null],
  ['unknown theme field fails', withTheme('pathfinders', t => { t.insde = true; }), undefined, good, /unknown field "insde"/, null],
  ['digitalMin 10 without inside: true fails', withTheme('pathfinders', t => { t.digitalMin = 10; }), undefined, good, /pathfinders: digitalMin must be an integer >= 12/, null],
  ['digitalMin 10 with inside: true is fine', withTheme('global-mission', t => { t.digitalMin = 10; }), undefined, good, /^OK themes\.json/m, /^ERROR themes\.json/m],
  ['a synonym in two themes fails', withTheme('adventurers', t => { t.syn.en.push('pathfinders'); }), undefined, good, /synonym "pathfinders" is in both/, null],
  ['a good reach.json passes', realThemes, {'prayer-test-0': 'in', 'prayer-test-1': 'both'}, good, /^OK reach\.json 2 ideas$/m, /^ERROR reach\.json/m],
  ['reach.json: bad value fails', realThemes, {'prayer-test-0': 'inside'}, good, /^ERROR reach\.json prayer-test-0: reach must be one of/m, null],
  ['reach.json: unknown id fails', realThemes, {'prayer-no-such-idea': 'in'}, good, /^ERROR reach\.json prayer-no-such-idea: no idea with this id/m, null],
  ['reach.json: disagreeing with the idea fails', realThemes, {'prayer-test-0': 'in'}, good.map((x, i) => i === 0 ? {...x, reach: 'out'} : x), /reach\.json says "in" but the idea says "out"/, null],
  ['reach.json: agreeing with the idea is fine', realThemes, {'prayer-test-0': 'out'}, good.map((x, i) => i === 0 ? {...x, reach: 'out'} : x), /^OK reach\.json 1 ideas$/m, /^ERROR reach\.json/m],
  ['reach.json: not an object fails', realThemes, '["in"]', good, /^ERROR reach\.json must be an object/m, null],
  ['reach.json: broken JSON fails', realThemes, '{"prayer-test-0": "in",', good, /^ERROR reach\.json cannot read JSON/m, null],
  ['reach counts reach the table', realThemes, {'prayer-test-0': 'in', 'prayer-test-1': 'both'}, good, /^prayer\s+50\b.*\s1\/48\/1\s/m, null]
];
lib.forEach(([label, themes, reach, ideas, must, mustNot]) => {
  const out = runLib(themes, reach, ideas);
  const ok = must.test(out) && !(mustNot && mustNot.test(out));
  if (!ok) { bad++; console.log(`WRONG  ${label}\n${out.split('\n').filter(l => !/^MISSING/.test(l)).slice(0, 30).join('\n')}`); } else console.log(`right  ${label}`);
});

fs.rmSync(TMP, {recursive: true, force: true});
const total = cases.length + quota.length + share.length + lib.length;
console.log(bad ? `${bad} of ${total} case(s) wrong` : `all ${total} cases right`);
process.exit(bad ? 1 : 0);
