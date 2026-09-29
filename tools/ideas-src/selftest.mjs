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
  ['no raffles is a REVIEW', 'review', x => setEn(x, 1, 'No raffles and no sales: the cards are free and the QR form stays private.'), /negation/],
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
  ['raffle', 'fail', x => setEn(x, 0, 'Hold a raffle for a gift basket to pay for the printing of the cards.'), /raffles/],
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
  ['salad bar is fine', 'ok', x => setEn(x, 0, 'Meet at the grocery store salad bar and design the cards in Canva with a QR code.')]
];

let bad = 0;
cases.forEach(([label, expect, mutate, pat], i) => {
  const x = mutate(clone(base));
  const f = path.join(TMP, `case${i}.json`);
  fs.writeFileSync(f, JSON.stringify({theme: 'prayer', ideas: [x]}));
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
fs.rmSync(TMP, {recursive: true, force: true});
console.log(bad ? `${bad} case(s) wrong` : `all ${cases.length + quota.length} cases right`);
process.exit(bad ? 1 : 0);
