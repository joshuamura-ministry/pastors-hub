#!/usr/bin/env node
/* Terrain Idea Library validator.  See SCHEMA.md and WRITERS.md.

   node validate.mjs themes/prayer.json [more files…]   one theme file each: every idea + the theme quotas
   node validate.mjs --ideas-only examples.json          idea checks only (no 50-idea quotas)
   node validate.mjs --all                               themes.json + every themes/<id>.json + cross-theme checks + counts
   node validate.mjs --vocab <path/to/index.html>        rebuild vocab.json from the app source
   add --no-review to hide REVIEW lines (they never fail a file)

   Prints "OK <file> <n> ideas" or "ERROR <file> <id>: …" lines and "FAIL <file> …".
   Exit code 0 only when nothing failed.

   Themes marked "inside": true in themes.json (the seven INSIDE THE CHURCH themes and four Adventist department
   themes, WRITERS.md) serve the church family itself and may set digitalMin 10. "inside": false (or no flag) is an
   outward or both-ways theme. Every idea has a reach: its optional "reach" field ("in" = for God's people, "out" =
   for the community, "both"), else its entry in reach.json beside this file (if there is one), else the theme's
   default ("in" when the theme is inside, "out" otherwise). An in-reach idea is rightly at the church, so it skips
   the two "waits at the building" REVIEWs; every other rule applies to it. The love-without-pressure checks (guilt
   phrasing, public lists of attendance, giving or sins) run on every theme. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = f => { const i = argv.indexOf(f); if (i < 0) return false; argv.splice(i, 1); return true; };
const SHOW_REVIEW = !flag('--no-review');

/* ------------------------------------------------------------------ vocab */
function extractLiteral(src, decl) {
  const start = src.indexOf(decl);
  if (start < 0) throw Error('not found in app source: ' + decl);
  let i = start + decl.length - 1, depth = 0, q = null, esc = false;
  const open = src[i], close = open === '[' ? ']' : '}';
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (q) { if (esc) { esc = false; continue; } if (ch === '\\') { esc = true; continue; } if (ch === q) q = null; continue; }
    if (ch === '/' && src[j + 1] === '*') { j = src.indexOf('*/', j) + 1; continue; }
    if (ch === '/' && src[j + 1] === '/') { j = src.indexOf('\n', j); continue; }
    if (ch === '"' || ch === "'" || ch === '`') { q = ch; continue; }
    if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) return src.slice(i, j + 1); }
  }
  throw Error('unbalanced literal: ' + decl);
}
function buildVocab(indexPath) {
  const src = fs.readFileSync(indexPath, 'utf8');
  const KIND = {serve: 'Serve', equip: 'Equip', belong: 'Belong', invite: 'Invite'};
  const EFFORT = {solo: 'solo', team: 'team', budget: 'budget', partner: 'partner'};
  const SIG = new Function('KIND', 'EFFORT', 'return ' + extractLiteral(src, 'const SIGNATURE=['))(KIND, EFFORT);
  const ES = new Function('return ' + extractLiteral(src, 'const ES={'))();
  const MIN_ES = new Function('return ' + extractLiteral(src, 'const CASE_MIN_ES={'))();
  const CAP = new Function('return ' + extractLiteral(src, 'const CAP_SKILLS=['))();
  const FAC = new Function('return ' + extractLiteral(src, 'const FACILITIES=['))();
  const pStart = src.indexOf('function profile(m,c,trend){'), pEnd = src.indexOf('\n}\n', pStart);
  const body = src.slice(pStart, pEnd);
  const tags = [...new Set([...body.matchAll(/'([a-z0-9-]+)'\)/g)].map(m => m[1]))];
  const uSkillLine = src.slice(src.indexOf('const U_SKILLS='), src.indexOf('\n', src.indexOf('const U_SKILLS=')));
  const uFacLine = src.slice(src.indexOf('const U_FAC='), src.indexOf('\n', src.indexOf('const U_FAC=')));
  const rulesSrc = src.slice(src.indexOf('const RULES=['), src.indexOf('const RULES_ES={'));
  const version = (src.match(/const VERSION\s*=\s*'([^']+)'/) || [])[1] || null;
  return {
    source: path.basename(path.dirname(indexPath)) + '/' + path.basename(indexPath), version,
    tags: tags.sort(),
    skills: [...CAP.map(s => s.k), ...[...uSkillLine.matchAll(/k:'([a-z]+)'/g)].map(m => m[1])],
    facilities: [...FAC.map(f => f.k), ...[...uFacLine.matchAll(/k:'([a-z]+)'/g)].map(m => m[1])],
    rules: [...rulesSrc.matchAll(/^ \{id:'([a-z0-9-]+)'/gm)].map(m => m[1]),
    signature: SIG.map(s => ({id: s.id, n: s.n, es: MIN_ES[s.id] || (typeof ES[s.n] === 'string' ? ES[s.n] : null)}))
  };
}

if (argv[0] === '--vocab') {
  const v = buildVocab(argv[1]);
  fs.writeFileSync(path.join(HERE, 'vocab.json'), JSON.stringify(v, null, 1));
  console.log(`vocab.json: ${v.tags.length} tags, ${v.skills.length} skills, ${v.facilities.length} facilities, ${v.rules.length} RULES ids, ${v.signature.length} SIGNATURE ideas (${v.signature.filter(s => s.es).length} with Spanish names)`);
  process.exit(0);
}

const VOCAB = JSON.parse(fs.readFileSync(path.join(HERE, 'vocab.json'), 'utf8'));
const TAGS = new Set(VOCAB.tags), SKILLS = new Set(VOCAB.skills), FACS = new Set(VOCAB.facilities);
const SIG_IDS = new Set(VOCAB.signature.map(s => s.id));
let THEMES = [];
try { THEMES = JSON.parse(fs.readFileSync(path.join(HERE, 'themes.json'), 'utf8')).themes || []; } catch (e) { THEMES = []; }
const THEME = new Map(THEMES.map(t => [t.id, t]));
// Optional reach.json ({ideaId: "in"|"out"|"both"}) beside this file: the reach of ideas written before the field
// existed. It is checked in full by --all; here it only feeds each idea's effective reach.
let REACH_FILE = null, REACH_MAP = {};
if (fs.existsSync(path.join(HERE, 'reach.json'))) {
  try { REACH_FILE = JSON.parse(fs.readFileSync(path.join(HERE, 'reach.json'), 'utf8')); } catch (e) { REACH_FILE = {error: e.message}; }
  if (REACH_FILE && typeof REACH_FILE === 'object' && !Array.isArray(REACH_FILE) && !REACH_FILE.error) REACH_MAP = REACH_FILE;
}

/* ------------------------------------------------------------------ constants */
const KINDS = ['serve', 'equip', 'belong', 'invite'];
const AGES = ['all', 'children', 'youth', 'adults', 'seniors', 'families'];
const WHERE = ['church', 'streets', 'homes', 'online', 'schools', 'parks', 'community', 'workplaces'];
const STAGES = ['open', 'trust', 'deeper', 'decide'];
const REACHES = ['in', 'out', 'both'];   // in = for God's people (members, officers, services); out = for the community; both
const REQUIRED = ['id', 'theme', 'tier', 'k', 'ages', 'where', 'sabbath', 'minors', 'need', 'boost', 'ppl', 'leaders', 'hrs', 'cost', 'costMo', 'skill', 'partner', 'en', 'es'];
const OPTIONAL = ['also', 'st', 'fac', 'reach'];
const themeReach = id => ((THEME.get(id) || {}).inside === true ? 'in' : 'out');
// The reach an idea is shown under: its own field, else reach.json, else the theme's default.
const reachOf = x => (x && REACHES.includes(x.reach)) ? x.reach
  : (x && typeof x.id === 'string' && REACHES.includes(REACH_MAP[x.id])) ? REACH_MAP[x.id] : themeReach(x && x.theme);
const LIM = {n: [6, 60], d: [100, 420], step: [20, 140], partner: [3, 120]};
const TIER = {
  1: {ppl: [1, 4], leaders: [0, 1], hrs: [1, 10], cost: 150, costMo: 50},
  2: {ppl: [2, 12], leaders: [1, 3], hrs: [1, 24], cost: 1500, costMo: 300},
  3: {ppl: [3, 40], leaders: [1, 6], hrs: [1, 60], cost: 50000, costMo: 10000}
};
const QUOTA = {ideas: 50, t1: 15, t2: 15, t3: 8, kindMax: 0.45, where: 4, digital: 12, printDigital: 3, jaccard: 0.6};

/* ------------------------------------------------------------------ text helpers */
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[‘’ʼ]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, '-').toLowerCase();
const textOf = (L, partner, lang) => [L && L.n, L && L.d, ...((L && Array.isArray(L.how)) ? L.how : []), partner && partner[lang]].filter(s => typeof s === 'string').join(' \n ');
const STOP = new Set(('a an the of for and to in on at by with from your our their its into as or per that this who is are be it we us you all ' +
  'el la los las un una unos unas de del al y e o u en con para por su sus que se lo le les nuestro nuestra nuestros nuestras cada').split(' '));
function tokens(name) {
  return new Set(fold(name).replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w && !STOP.has(w))
    .map(w => w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}
function jaccard(A, B) {
  if (!A.size || !B.size) return 0;
  let n = 0; for (const x of A) if (B.has(x)) n++;
  return n / (A.size + B.size - n);
}
function sentences(d) {
  let t = String(d);
  // A quotation counts as one word; when it closes a sentence (it ends in . ! ? and the next
  // word starts with a capital) the sentence still ends there.
  const q = (m, inner, off, all) => 'Q' + (/[.!?…]\s*$/.test(inner) && /^\s+[A-Z¿¡À-Ý]/.test(all.slice(off + m.length)) ? '.' : '');
  t = t.replace(/“([^”]*)”|"([^"]*)"|«([^»]*)»|‘([^’]*)’/g, (m, a, b, c, e, off, all) => q(m, a ?? b ?? c ?? e ?? '', off, all));
  t = t.replace(/(^|[\s(:])'([^']{3,}?)'(?=[\s.,;:!?)]|$)/g, (m, pre, inner, off, all) => pre + q(m.slice(pre.length), inner, off + pre.length, all));
  t = t.replace(/\b(?:e\.g|i\.e|a\.m|p\.m|u\.s|p\.\s?ej|ee\.\s?uu)\./gi, 'X').replace(/\b(?:etc|vs|approx|aprox|dr|mr|mrs|ms|st|ave|rd|sr|sra|dra|min|max|no)\.(?=\s+[a-z0-9])/g, 'X');
  const ends = (t.match(/[.!?…](?=["')”»]?(\s|$))/g) || []).length;
  return ends + (/[.!?…]["')”»]?\s*$/.test(t.trim()) ? 0 : 1);
}
const any = (re, s) => re.test(s);

/* ------------------------------------------------------------------ content rules (run on folded text) */
const DIGITAL = /\b(facebook|instagram|social media|online|websites?|text messages?|texting|text line|text us|whatsapp|nextdoor|youtube|tiktok|reels?|livestream\w*|live ?stream\w*|qr|ads?|videos?|podcasts?|e-?mails?|google|zoom|canva|messenger)\b/;
const PRINTWALK = /\b(cards?|postcards?|flyers?|fliers?|door hangers?|door-hangers?|posters?|bookmarks?|leaflets?|letters?|notes?|mailers?|signs?|walk\w*|door\w*|mailbox\w*|mail(ed|ing)?)\b/;
const REACH = /\b(walk\w*|doors?|doorsteps?|door-to-door|cards?|postcards?|streets?|neighbo\w*|markets?|librar\w*|parks?|online|social|posts?|posting|posted|ads?|invit\w*|flyers?|fliers?|texts?|texting|events?|partner\w*|business\w*|school's invitation|nextdoor|facebook|instagram|qr|mail\w*|e-?mails?|signs?|banners?|radio|newspapers?|whatsapp|videos?|word of mouth|referr\w*|refers?|agenc\w*|clinics?|shelters?|laundromats?|stores?|shops?|cafes?|coffee shops?|town|township|borough|county|festivals?|fairs?)\b/;

const BANNED = [
  // [label, regex on folded EN text, regex on folded ES text, exception-regex (same language) or null]
  ['pork or unclean meat (Adventist practice: never serve it)',
    /\b(pork|bacon|hams?(?! radio)|pepperoni|pulled pork|lard|shrimp|lobsters?|crabs?|clams?|oysters?|shellfish|catfish)\b|(?<!(veggie|vegetarian|plant-based|vegan|meatless|soy) )\b(sausages?|hot ?dogs?)\b/,
    /\b(cerdo|puerco|tocino|jamon(es)?|chorizos?|chicharron(es)?|carnitas|manteca de cerdo|camarones|camaron|mariscos|langostas?|cangrejos?|almejas|ostras|ostiones)\b|\bsalchichas?\b(?! (vegetarian|vegana|de soya|vegetal))/],
  ['alcohol', /\b(beers?|wines?|liquor|cocktails?|brewery|breweries|winery|wineries|taprooms?|pubs?|happy hour|sangria|champagne|mimosas?|bartend\w*|booze)\b/,
    /\b(cervezas?|cerveceria|licor(es)?|coctel(es)?|cantinas?|vinos|vino (tinto|blanco)|copas? de vino|hora feliz|bar de copas)\b/],
  ['raffles, lotteries or games of chance', /\b(raffles?|raffling|lotter(y|ies)|casinos?|betting|poker|sweepstakes|door prizes?|50\/50|fifty-fifty|prize draws?|scratch-?offs?|slot machines?|games of chance)\b/,
    /\b(rifas?|rifar|sorteos?|loterias?|tragamonedas|raspaditos)\b/],
  ['gambling (only allowed when the idea is recovery FROM gambling)', /\bgambl\w*/, /\b(apuestas|juegos de azar|casinos?)\b/,
    /addict|recover|problem gambl|gamblers anonymous|adiccion|recuperacion|ludopatia|jugadores anonimos/],
  ['"target/targeting" people (say "shown to people within 3 miles", "for", "with")', /\btarget(s|ed|ing)?\b/,
    /\b(publico objetivo|poblacion objetivo|grupo objetivo|segmentar|segmentacion|segmentad[oa]s?|focaliza\w*)\b/],
  ['"bait/lure/hook" framing', /\b(bait(ed|ing)?|bait-and-switch|lure[sd]?|luring|hook (them|people|neighbou?rs|visitors)|foot in the door|trojan horse)\b/,
    /\b(carnada|cebo|anzuelo|engancharl[oa]s|atraparl[oa]s|atraerl[oa]s con)\b/],
  ['"convert them" / soul-counting framing', /\b(convert(ing)? (them|people|neighbou?rs|him|her|those|visitors|guests|the community)|make converts|new converts|count converts|win (them|souls)|soul-?winning|captive audience|prospect (list|card|name)s?|prospects for baptism|evangelism prospects)\b/,
    /\b(convertirl[oa]s|hacer conversos|conversos|ganarl[oa]s|ganar almas|prospectos|audiencia cautiva)\b/],
  ['door-to-door gathering of personal information', /\b(door-to-door (survey|census|questionnaire)s?|survey (the |every )?(homes|households|doors)|collect(ing)? (names|phone numbers|e-?mails|information|details) (at|from) (the |every )?(doors|homes|households))\b/,
    /\b(encuestas? (casa por casa|de puerta en puerta)|recoger (datos|nombres|telefonos) (en|de) (las )?(casas|puertas|hogares))\b/]
];
const COUNSEL = {
  en: /\b(counsel(l)?ing|counsel(l)?ors?|therap(y|ies|ist|ists|eutic)|diagnos\w*|psychotherap\w*|treat(ing|ment) (of |for )?(depression|anxiety|addiction|trauma|ptsd|disorders?))\b/,
  es: /\b(consejeria|consejer[oa]s|terapias?|terapeut\w*|diagnostic\w*|psicoterap\w*|tratamiento (de|para) (la )?(depresion|ansiedad|adiccion|trauma))\b/,
  cueEn: /\b(not (a |an )?(counsel|therap)\w*|no (counsel|therap)\w*|isn't (counsel|therap)\w*|never (counsel|diagnos|therap)\w*|refer\w*|licensed|professional\w*|hotline|988|clinician\w*|psychologist\w*)\b/,
  cueEs: /\b(no es (una )?(terapia|consejeria)|deriva\w*|remit\w*|profesional\w*|licenciad\w*|con licencia|linea de (ayuda|crisis)|988|psicolog\w*)\b/
};
const KID_EN = '(?:kids?|child(?:ren)?|students?|sons?|daughters?|teens?|teenagers?|grandchildren|grandkids|minors?|pupils?)';
const KID_ES = '(?:nin[oa]s?|hij[oa]s?|alumn[oa]s?|estudiantes?|niet[oa]s?|chic[oa]s|menores|adolescentes|muchach[oa]s)';
const CHILD_FAIL = {
  en: [
    ['asks for or collects children\'s/students\' names, photos or details', new RegExp(`\\b(?:names?|photos?|photographs?|pictures?|birthdays?|addresses|phone numbers?)\\s+of\\s+(?:their|your|the|his|her|local|neighbou?rhood|any)?\\s*${KID_EN}\\b`)],
    ['asks for or collects children\'s/students\' names, photos or details', new RegExp(`\\b${KID_EN}(?:'s|s')?\\s+(?:first\\s+|full\\s+)?(?:names?|photos?|photographs?|pictures?|birthdays?|addresses|phone numbers?)\\b`)],
    ['asks for prayer requests about people\'s children (pray for a particular child only when a parent in a real relationship asks)', /\b(prayer requests?|requests? for prayer|what to pray (for|about)|send us|text us|tell us|submit)\b[^.!?]{0,50}\b(their|your|his|her) (kids?|children|child|sons?|daughters?|teens?|students?|grandchildren|grandkids)\b/],
    ['stations the idea at a school gate, school drop-off/pick-up, playground, school bus stop or youth hang-out', /\b(school gates?|school entrances?|school drop-?offs?|school pick-?ups?|drop-?off lines?|pick-?up lines?|car ?lines?|carpool lines?|school dismissal|playgrounds?|school bus stops?|bus stops? (for|where|used by) (students|kids|children)|skate ?parks?|youth hang-?outs?|outside (the |a |local |their )?schools?\b(?! (hours|time|days?|years?|terms?|calendar)))/],
    ['wording that sounds like the church wants access to children', /\b(reach(ing)?|attract(ing)?|recruit(ing)?|grab(bing)?|win(ning)?) (the |more |local |neighbou?rhood )?(kids|children)\b|\b(get|getting|bring|bringing) (the |more )?(kids|children) in(to)?\b/],
    ['approaches children directly', /\bapproach(es|ed|ing)? (the |local )?(kids|children|teens|students|minors)\b/],
    ['keeps lists of children', /\b(lists?|rosters?|databases?|sign-?up sheets?) of (the |local )?(kids|children|students|teens|minors)\b/]
  ],
  es: [
    ['pide o reúne nombres, fotos o datos de niños/alumnos', new RegExp(`\\b(?:nombres?|fotos?|fotografias?|imagenes|cumpleanos|direcciones|telefonos?|datos)\\s+de\\s+(?:los\\s+|las\\s+|sus\\s+|tus\\s+|nuestros\\s+)?${KID_ES}\\b`)],
    ['pide pedidos de oración sobre los hijos de otros', /\b(pedidos? de oracion|peticiones? de oracion|motivos? de oracion|por que orar|envienos|escribanos|diganos|cuentenos)\b[^.!?]{0,50}\b(sus|tus) (hij[oa]s|nin[oa]s|niet[oa]s|alumn[oa]s|estudiantes)\b/],
    ['sitúa la idea en la puerta de la escuela, parque infantil o parada del autobús escolar', /\b(puertas? de (la |las )?escuelas?|entradas? de (la )?escuela|salidas? de (la )?escuela|(afuera|frente) (de |a )(la |una )?escuela|parques? infantil(es)?|patios? de juegos?|zonas? de juegos?|juegos infantiles|columpios|paradas? del? autobus escolar|skate ?park)\b/],
    ['lenguaje de querer acceso a los niños', /\b(alcanzar|atraer|captar|reclutar|ganar) (a )?(los |mas )?(nin[oa]s|chic[oa]s|menores)\b/],
    ['se acerca directamente a los niños', /\b(acercarse|abordar) a (los )?(nin[oa]s|menores|estudiantes|adolescentes)\b/],
    ['listas de niños', /\b(listas?|registros?|base de datos) de (los )?(nin[oa]s|alumn[oa]s|estudiantes|menores)\b/]
  ]
};
// A mention inside a negation ("we never ask for student names", "no raffles") is a REVIEW, not an ERROR.
const NEG = {en: /\b(no|never|not|without|nor|don't|do not|won't|avoid|instead of)\b[^.!?;]{0,30}$/, es: /\b(no|nunca|sin|ni|jamas|evite|en lugar de)\b[^.!?;]{0,30}$/};
const negated = (txt, re, lang) => { const m = txt.match(re); return !!m && NEG[lang].test(txt.slice(Math.max(0, m.index - 40), m.index)); };
const PRAY_KIDS = {
  en: /\bpray\w*\b[^.!?]{0,50}\b(their|your|his|her) (kids?|children|child|sons?|daughters?|teens?|students?|grandchildren|grandkids)\b/,
  es: /\bor(ar|amos|emos|aremos|ando|an|en)\b[^.!?]{0,50}\b(sus|tus) (hij[oa]s|nin[oa]s|niet[oa]s|alumn[oa]s|estudiantes)\b/
};
const ADD_NAME = {en: /\badd (a|their|your|his|her|the) (\w+ )?names?\b/g, es: /\b(agregar|agregue|anadir|anada|anotar|anote|escribir|escriba) (el|un|su|los) nombres?\b/g};
const SCREEN = {
  en: /\b(screen(ed|ing)?|background[- ]checks?|two[- ]adult|two adults|shield the vulnerable|child[- ]protection|safeguarding|verified adults?)\b/,
  es: /\b(verificacion de antecedentes|antecedentes|dos adultos|shield the vulnerable|proteccion (infantil|de menores)|adultos verificados|verificad[oa]s)\b/
};
const REVIEWS = [
  // [message, EN regex, ES regex, unless-regex (EN), unless-regex (ES)]
  ['meat on the menu: Adventist churches serve vegetarian food', /\b(chicken|beef|turkey|hamburgers?|burgers?|steak|meatballs?|fish fry|barbecue|bbq|wings)\b/, /\b(pollo|carne de res|res|pavo|hamburguesas?|bistec|albondigas|parrillada|asado|carne asada)\b/,
    /\b(veggie|vegetarian|plant-based|vegan|meatless|tofurky)\b/, /\b(vegetarian[oa]s?|vegan[oa]s?|a base de plantas|de soya)\b/],
  ['bingo (read as gambling by many; is there a better game?)', /\bbingo\b/, /\bbingo\b/],
  ['"bar": make sure this is not a drinking venue', /(?<!(granola|snack|protein|salad|juice|cereal|candy|chocolate|grab|soap|energy|breakfast|fruit|oat|smoothie|coffee|espresso|tea|bar) )\bbars?\b(?! (codes?|exam|graph|chart))/, /\bbares\b|\bun bar\b|\bel bar\b/],
  ['photos: no photos of people served for publicity; children never without written parental consent', /\b(photos?|photograph\w*|pictures?|selfies?)\b/, /\b(fotos?|fotografias?|selfies?)\b/,
    /\b(no|never|without|nor) (photos?|photograph\w*|pictures?|selfies?|cameras?)|consent|permission/, /\b(sin|ninguna|nunca|no) (fotos?|fotografias?)|consentimiento|permiso/],
  ['dignity wording (say who they are: neighbors, families, guests, members)', /\b(the needy|the less fortunate|less fortunate|handouts?|charity cases?|underprivileged|the unchurched|the lost|backsliders?|backslidden|apostates?|delinquent (members|givers|tithers))\b/, /\b(los necesitados|los menos afortunados|los inconversos|los perdidos|limosnas?|apostatas)\b/],
  ['knocking: homes get a card, not a knock, unless invited', /\bknock\w*/, /\b(toc(ar|a|an|amos|ando) (a |la )?puerta|golpe\w* (a |la )?puerta)/,
    /\b(no|never|without|nobody|not|nor) (knock|knocking)\b|\bunless (invited|someone|somebody|they)|\bby appointment|\binvited\b|\bno knocking\b/, /\bsin toc\w*|\bno toc\w*|\bnunca toc\w*|\bsolo si (le|lo|la|los|las)? ?invit\w*|con cita/],
  ['prayer requests: offer an anonymous/private option', /\bprayer requests?\b/, /\b(pedidos?|peticiones?|motivos?) de oracion\b/,
    /anonym|privat|confidential|no name|first name only|without (a|their) name|optional/, /anonim|privad|confidencial|sin nombre|solo (el|su) (primer )?nombre|opcional/]
];
// Love without pressure (WRITERS.md, INSIDE THE CHURCH). Run on every theme, in both languages.
// A mention inside a clear safeguard ("never ask 'why weren't you here'", "nunca publique la asistencia") is a REVIEW.
const PRESSURE = [
  ['guilt or pressure (say "we missed you, we hope you are well"; never ask why, never keep score)',
    /\bwhy (weren't|werent|were not|wasn't|wasnt|was not|haven't|havent|have not|hadn't|hadnt|had not|didn't|didnt|did not) (you|he|she|they)\b|\bwhy (have|had) (you|they) been (absent|away|missing|gone)\b|\bwhere (have you been|were you)( (last (week|sabbath|month)|on sabbath|all this time|lately|hiding))?\s*\?|\b(you've|youve|you have|they've|they have) been (missing|absent|gone)\b|\bwe (noticed|saw|see|have noticed|'ve noticed|could tell) (that )?you ((weren't|werent|were not|haven't been|havent been|have not been) (here|in church|at church|around)|(were|have been) (missing|absent|away|gone))\b|\bno excuses?\b|\bguilt[- ]?trip\w*|\bguilt (them|people|members|him|her)\b|\b(make|makes|making|made) (them|him|her|people|members|someone|anyone) feel (guilty|ashamed)\b|\bname and shame\b|\bshame (them|people|members) into\b|\byou (should|must|ought to|need to) (have been|be) (here|in church|at church)\b/,
    /\bpor que no (vino|vinieron|viniste|ha venido|han venido|has venido|estuvo|estuvieron|estuviste|ha estado|han estado|has estado|asistio|asistieron|asististe|ha asistido|han asistido|volvio|volvieron|ha vuelto|han vuelto)\b|\b(ha|has|han) estado (faltando|ausentes?|desaparecid[oa]s?)\b|\bsin excusas?\b|¿\s*donde (estaba|estabas|estaban|estuvo|estuviste|estuvieron|ha estado|has estado|han estado)( (usted|ustedes|el sabado|la semana pasada|todo este tiempo))?\s*\?|\bnotamos (que (usted |ustedes )?(no (ha|han) (venido|estado|asistido)|(ha|han) faltado|falto|faltaron|no vino|no vinieron)|su ausencia)\b|\bhacerl[oa]s? sentir (culpables?|avergonzad[oa]s?)\b|\bculpabiliz\w*|\bavergonzarl[oa]s?\b|\b(deberia|deberian|debe|deben) (haber venido|haber estado|estar (aqui|en la iglesia))\b/],
  ['public listing of attendance or absence (care lists stay private: never on a screen, a board or in a group)',
    /\b(post|posts|posted|posting|publish|publishes|published|publishing|display|displays|displayed|displaying|announce|announces|announced|announcing|project|projects|projected|projecting|read out|reads out|read aloud|reads aloud|put up|puts up|pin up|pins up|call out|calls out) (the |a |an |each |every |this week's |last week's |weekly |monthly |quarterly |sabbath |class |our )?(attendance|attendees'? names|absentees?|absences|names of (the )?(absent|missing|absentees))\b|\b(attendance|absence) (boards?|charts?|walls?|leaderboards?|rankings?|contests?|competitions?|awards?|prizes?|trophy|trophies|stars?)\b|\bperfect attendance\b/,
    /\b(publicar|publique|publiquen|publicamos|anunciar|anuncie|anuncien|anunciamos|exhibir|exhiba|exhiban|proyectar|proyecte|proyecten|leer en voz alta|lea en voz alta|lean en voz alta|colgar|cuelgue|cuelguen|pegar|pegue|peguen|mostrar|muestre|muestren) (en (la |las )?pantallas? |en el tablero |en el boletin )?(la |las |el |los |una |un )?(lista de )?(asistencia|ausentes|ausencias|nombres de (los )?ausentes|quienes faltaron|quienes no vinieron)\b|\b(tableros?|cuadros?|graficas?|concursos?|premios?|competencias?|estrellas|trofeos?) (de|por) (la )?asistencia\b|\basistencia perfecta\b/],
  ['public listing of giving (thank givers without naming them or their amounts; the treasurer keeps giving records confidential)',
    /\blists? of (who|those who|people who|members who|everyone who|the people who|families who|the members who) (gave|give|gives|tithed|tithe|tithes|donated|donate|donates|pledged|pledge|pledges|contributed|contribute|contributes)\b|\bwho (gave|gives|tithed|tithes|donated|pledged) (what|how much)\b|\bhow much (each|every|individual) (member|family|person|donor|giver|one)s? (gave|gives|give|tithed|tithes|pledged|donated)\b|\b(names of|naming) (the |our |all )?(donors|givers|tithers|tithe payers|contributors|pledgers)\b|\b(top|biggest|largest) (givers|donors|tithers|contributors)\b|\bdonor (walls?|boards?|plaques?|rolls?)\b|\bhonor rolls? of (donors|givers)\b|\b(donors|givers|tithers|contributors|pledgers) by name\b[^.!?;]{0,40}\b(bulletin|screens?|pulpit|platform|newsletter|publicly|during (the )?(service|worship))\b|\b(bulletin|screens?|pulpit|platform|newsletter|publicly)\b[^.!?;]{0,40}\b(donors|givers|tithers|contributors|pledgers) by name\b/,
    /\blistas? de (quienes|los que|las personas que|los miembros que|las familias que|quien) (dieron|dan|diezmaron|diezman|ofrendaron|ofrendan|donaron|donan|contribuyeron|contribuyen|prometieron)\b|\bquien (dio|da|diezmo|diezma|dono|dona|ofrendo|ofrenda) (que|cuanto)\b|\bcuanto (dio|da|diezmo|diezma|dono|dona|ofrendo|ofrenda) cada (miembro|familia|persona|uno|donante|hermano|hermana)\b|\bnombres? de (los )?(donantes|dadores|diezmadores|contribuyentes|ofrendantes)\b|\b(mayores|principales) (donantes|dadores|diezmadores|contribuyentes|ofrendantes)\b|\b(muro|placa|cuadro) de (honor de )?(los )?(donantes|dadores|diezmadores)\b|\b(donantes|dadores|diezmadores|contribuyentes) por (su )?nombre\b[^.!?;]{0,40}\b(boletin|pantallas?|pulpito|tablero|publicamente|en publico)\b|\b(boletin|pantallas?|pulpito|tablero|publicamente|en publico)\b[^.!?;]{0,40}\b(donantes|dadores|diezmadores|contribuyentes) por (su )?nombre\b/],
  ['public exposure of sins or struggles (spiritual care is confidential)',
    /\bpublic confessions?\b(?! of (faith|christ|jesus))|\bconfess\w* (publicly|in public|before the (church|congregation|class)|in front of (the )?(church|congregation|class))\b|\bpublicly (rebuk|shame|shaming|expos|confront)\w*|\b(rebuk|expos|confront)\w* (them |him |her |members |people |someone )?(publicly|in public|in front of (the )?(church|congregation|class))\b|\blists? of (their |members'? |people's |our )?sins\b/,
    /\bconfesion(es)? publicas?\b(?! de (fe|cristo|jesus))|\bconfes\w* (publicamente|en publico|delante de (la |toda la )?(iglesia|congregacion|clase))\b|\bpublicamente (reprend|expon|avergonz|confront)\w*|\b(reprend|expon|avergonz|confront)\w* (publicamente|en publico|delante de (la |toda la )?(iglesia|congregacion|clase))\b|\blistas? de (sus |los )?pecados\b/]
];
// Stricter than NEG: only a clear safeguard ("never", "don't", "instead of", "nunca", "no diga…") softens these.
const NEG_SAFEGUARD = {
  en: /(\b(never|don't|dont|do not|does not|doesn't|avoid|avoids|instead of|rather than|without|won't|nor|no one|nobody|not (ask|say|write|post|publish|announce|display|read|print|put|use|keep|give|call))\b[^.!?;]{0,40}|\bno "?)$/,
  es: /(\b(nunca|jamas|evite\w*|en lugar de|en vez de|sin|ni|nadie|no (se |le |les |lo |la |los |las )?(diga\w*|decir|pregunt\w*|escrib\w*|publi\w*|anunci\w*|exhib\w*|muestr\w*|mostrar|lea\w*|leer|pegu\w*|pegar|cuelg\w*|colgar|use\w*|usar|hag\w*|hacer|pong\w*|poner|entreg\w*|llame\w*|llamar))\b[^.!?;]{0,40}|\bno "?)$/
};
const safeguarded = (txt, re, lang) => { const m = txt.match(re); return !!m && NEG_SAFEGUARD[lang].test(txt.slice(Math.max(0, m.index - 50), m.index)); };
const SABBATH_REVIEW = /\b(sell|selling|sale|sales|buy|buying|purchas\w*|fundrais\w*|tournaments?|competition|competitive|leagues?|admission|tickets?|shopping)\b/;
const USTED_REVIEW = /\b(tu|tus|tienes|puedes|quieres|necesitas|contigo|tuyo|tuya|haz)\b/;
const ES_ENGLISH_REVIEW = /\b(pathfinders?|adventurers?|sabbath|community services|sunday school|escuela dominical|church)\b/;
const US_SPELLING_REVIEW = /\b(neighbour\w*|programme\w*|colour\w*|centre\w*|organis\w*|favour\w*|honour\w*|labour\w*|licence|practise|counselling|travelled|cheque)\b/;
const EMOJI = /\p{Extended_Pictographic}/u;

/* ------------------------------------------------------------------ one idea */
function checkIdea(x, ctx) {
  const E = [], R = [], err = m => E.push(m), rev = m => R.push(m);
  const isStr = s => typeof s === 'string';
  const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  if (!x || typeof x !== 'object' || Array.isArray(x)) { err('idea is not an object'); return {E, R, digital: false, printDigital: false}; }
  for (const k of Object.keys(x)) if (!REQUIRED.includes(k) && !OPTIONAL.includes(k)) err(`unknown field "${k}"`);
  for (const k of REQUIRED) if (!(k in x)) err(`missing field "${k}"`);

  // id and theme
  if (!isStr(x.id) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(x.id)) err('id must be lowercase words joined by hyphens (a-z, 0-9)');
  else {
    if (x.id.length > 64) err('id longer than 64 characters');
    if (ctx.theme && !x.id.startsWith(ctx.theme + '-')) err(`id must start with "${ctx.theme}-"`);
    if (ctx.theme && x.id.length <= ctx.theme.length + 1) err('id needs a slug after the theme prefix');
    if (SIG_IDS.has(x.id)) err(`id "${x.id}" is a built-in SIGNATURE id; the app keys tables by id (CASE_BRIDGE, MOVE_REQ, HOW), so choose another`);
    if (/^(draft|sg)-/.test(x.id)) err('ids starting with "draft-" or "sg-" are reserved by the app');
  }
  if (!isStr(x.theme) || (THEMES.length && !THEME.has(x.theme))) err(`theme "${x.theme}" is not in themes.json`);
  if (ctx.theme && x.theme !== ctx.theme) err(`theme is "${x.theme}" but the file is "${ctx.theme}"`);
  if ('also' in x) {
    if (!Array.isArray(x.also) || x.also.length < 1 || x.also.length > 3) err('also must be an array of 1-3 other theme ids (omit it when empty)');
    else {
      if (new Set(x.also).size !== x.also.length) err('also has duplicates');
      for (const t of x.also) { if (THEMES.length && !THEME.has(t)) err(`also: unknown theme "${t}"`); if (t === x.theme) err('also must not repeat the idea\'s own theme'); }
    }
  }

  // enums and flags
  if (![1, 2, 3].includes(x.tier)) err('tier must be 1, 2 or 3');
  if (!KINDS.includes(x.k)) err(`k must be one of ${KINDS.join('|')}`);
  if (!AGES.includes(x.ages)) err(`ages must be one of ${AGES.join('|')}`);
  if (!WHERE.includes(x.where)) err(`where must be one of ${WHERE.join('|')}`);
  if (typeof x.sabbath !== 'boolean') err('sabbath must be true or false');
  if (typeof x.minors !== 'boolean') err('minors must be true or false');
  if ('st' in x && !STAGES.includes(x.st)) err(`st must be one of ${STAGES.join('|')} (or omitted)`);
  if ('reach' in x && !REACHES.includes(x.reach)) err(`reach must be one of ${REACHES.join('|')}, or omitted for the theme's default ("${themeReach(x.theme)}" here)`);

  // census tags and skills
  const tagList = (v, name, lo, hi) => {
    if (!Array.isArray(v)) { err(`${name} must be an array`); return; }
    if (v.length < lo || v.length > hi) err(`${name} must have ${lo}-${hi} tags`);
    if (new Set(v).size !== v.length) err(`${name} has duplicates`);
    for (const t of v) if (!TAGS.has(t)) err(`${name}: "${t}" is not a profile() tag`);
  };
  tagList(x.need, 'need', 1, 6); tagList(x.boost, 'boost', 0, 4);
  if (!Array.isArray(x.skill)) err('skill must be an array');
  else {
    if (x.skill.length > 4) err('skill: at most 4');
    if (new Set(x.skill).size !== x.skill.length) err('skill has duplicates');
    for (const s of x.skill) if (!SKILLS.has(s)) err(`skill: "${s}" is not in the church profile's skill list (${[...SKILLS].join(', ')})`);
    if (x.minors === true && !x.skill.includes('kids')) err('minors:true needs "kids" in skill (Make the Case reads it to apply the child-protection risk table)');
  }
  if ('fac' in x) {
    if (!Array.isArray(x.fac) || x.fac.length < 1 || x.fac.length > 3) err('fac must be an array of 1-3 facility strings (omit it when none)');
    else for (const g of x.fac) {
      if (!isStr(g) || !g.split('|').every(k => FACS.has(k))) err(`fac: "${g}" must be facility keys joined by "|" from ${[...FACS].join(', ')}`);
    }
  }

  // people, hours, money
  if (!isInt(x.ppl, 1, 40)) err('ppl must be a whole number 1-40');
  if (!isInt(x.leaders, 0, 6)) err('leaders must be a whole number 0-6');
  if (Number.isInteger(x.ppl) && Number.isInteger(x.leaders) && x.leaders > x.ppl) err('leaders cannot exceed ppl');
  if (!isInt(x.hrs, 1, 80)) err('hrs (per volunteer per month) must be a whole number 1-80');
  if (!isInt(x.cost, 0, 50000)) err('cost (start-up USD) must be a whole number 0-50000');
  if (!isInt(x.costMo, 0, 10000)) err('costMo (monthly USD) must be a whole number 0-10000');
  const T = TIER[x.tier];
  if (T) {
    if (Number.isInteger(x.ppl) && (x.ppl < T.ppl[0] || x.ppl > T.ppl[1])) err(`tier ${x.tier}: ppl must be ${T.ppl[0]}-${T.ppl[1]}`);
    if (Number.isInteger(x.leaders) && (x.leaders < T.leaders[0] || x.leaders > T.leaders[1])) err(`tier ${x.tier}: leaders must be ${T.leaders[0]}-${T.leaders[1]}`);
    if (Number.isInteger(x.hrs) && (x.hrs < T.hrs[0] || x.hrs > T.hrs[1])) err(`tier ${x.tier}: hrs must be ${T.hrs[0]}-${T.hrs[1]}`);
    if (Number.isInteger(x.cost) && x.cost > T.cost) err(`tier ${x.tier}: cost at most $${T.cost}`);
    if (Number.isInteger(x.costMo) && x.costMo > T.costMo) err(`tier ${x.tier}: costMo at most $${T.costMo}`);
    if (x.tier === 3 && x.partner === null && !(x.cost >= 300 || x.costMo >= 100)) err('tier 3 is a programme with a budget line or a partner: give a partner, or cost >= 300, or costMo >= 100');
  }

  // partner
  if (x.partner !== null) {
    if (!x.partner || typeof x.partner !== 'object' || Array.isArray(x.partner)) err('partner must be null or {"en","es"}');
    else {
      for (const k of Object.keys(x.partner)) if (k !== 'en' && k !== 'es') err(`partner: unknown field "${k}"`);
      for (const l of ['en', 'es']) if (!isStr(x.partner[l]) || x.partner[l].trim().length < LIM.partner[0] || x.partner[l].length > LIM.partner[1]) err(`partner.${l} must be ${LIM.partner[0]}-${LIM.partner[1]} characters`);
    }
  }

  // the words
  for (const l of ['en', 'es']) {
    const L = x[l];
    if (!L || typeof L !== 'object' || Array.isArray(L)) { err(`${l} must be {"n","d","how"}`); continue; }
    for (const k of Object.keys(L)) if (!['n', 'd', 'how'].includes(k)) err(`${l}: unknown field "${k}"`);
    if (!isStr(L.n) || L.n.length < LIM.n[0] || L.n.length > LIM.n[1]) err(`${l}.n must be ${LIM.n[0]}-${LIM.n[1]} characters (is ${isStr(L.n) ? L.n.length : 'missing'})`);
    else if (/[.]$/.test(L.n)) err(`${l}.n must not end with a full stop`);
    if (!isStr(L.d) || L.d.length < LIM.d[0] || L.d.length > LIM.d[1]) err(`${l}.d must be ${LIM.d[0]}-${LIM.d[1]} characters (is ${isStr(L.d) ? L.d.length : 'missing'})`);
    else { const s = sentences(L.d); if (s > 3) err(`${l}.d must be 2-3 sentences (counted ${s})`); else if (s < 2) rev(`${l}.d reads as ${s} sentence; aim for 2-3`); }
    if (!Array.isArray(L.how) || L.how.length !== 4) err(`${l}.how must have exactly 4 steps`);
    else {
      L.how.forEach((h, i) => { if (!isStr(h) || h.length < LIM.step[0] || h.length > LIM.step[1]) err(`${l}.how[${i}] must be ${LIM.step[0]}-${LIM.step[1]} characters (is ${isStr(h) ? h.length : 'missing'})`); });
      if (new Set(L.how).size !== L.how.length) err(`${l}.how repeats a step`);
    }
    for (const s of [L.n, L.d, ...(Array.isArray(L.how) ? L.how : [])]) if (isStr(s)) {
      if (s !== s.trim() || /\s{2,}|\n/.test(s)) err(`${l}: extra spaces or line breaks in "${s.slice(0, 40)}…"`);
      if (EMOJI.test(s)) err(`${l}: no emoji`);
    }
  }
  if (x.en && x.es && isStr(x.en.n) && x.en.n === x.es.n) err('es.n is the English name; translate it');
  if (x.en && x.es && isStr(x.en.d) && x.en.d === x.es.d) err('es.d is the English text; translate it');

  const en = fold(textOf(x.en, x.partner, 'en')), es = fold(textOf(x.es, x.partner, 'es'));
  const enHow = fold(x.en && Array.isArray(x.en.how) ? x.en.how.join(' ') : ''), esHow = fold(x.es && Array.isArray(x.es.how) ? x.es.how.join(' ') : '');

  // banned content
  for (const [label, reEn, reEs, unless] of BANNED) {
    for (const [lang, txt, re] of [['en', en, reEn], ['es', es, reEs]]) {
      if (!re.test(txt) || (unless && unless.test(txt))) continue;
      const msg = `banned (${lang.toUpperCase()}): ${label} — "${txt.match(re)[0]}"`;
      if (negated(txt, re, lang)) rev(`${msg} appears in a negation; rephrase without the word if you can`); else err(msg);
    }
  }
  if (x.partner === null) {
    if (COUNSEL.en.test(en) && !COUNSEL.cueEn.test(en)) err(`counselling/therapy beyond competence: name a professional partner or say how people are referred — "${en.match(COUNSEL.en)[0]}"`);
    if (COUNSEL.es.test(es) && !COUNSEL.cueEs.test(es)) err(`consejería/terapia sin profesional: nombre un socio profesional o diga cómo se deriva — "${es.match(COUNSEL.es)[0]}"`);
  }
  for (const [label, reEn, reEs] of PRESSURE) {
    for (const [lang, txt, re] of [['en', en, reEn], ['es', es, reEs]]) {
      if (!re.test(txt)) continue;
      const msg = `love without pressure (${lang.toUpperCase()}): ${label} — "${txt.match(re)[0]}"`;
      if (safeguarded(txt, re, lang)) rev(`${msg} appears in a safeguard; make sure it reads as one`); else err(msg);
    }
  }
  if (x.theme === 'abuse-survivors' && x.partner === null && !/\b(hotline|shelter|advocate\w*|professional\w*|988|911)\b/.test(en))
    err('abuse-survivors: every idea works through a professional partner (shelter, hotline, advocates); name one in partner or in the text');
  if (['addiction', 'mental-health'].includes(x.theme) && x.partner === null && x.tier > 1 && ['equip', 'belong'].includes(x.k))
    rev(`${x.theme}: tier ${x.tier} ${x.k} idea with no professional partner; is that safe?`);

  // children and young people
  for (const [lang, txt, tag] of [['en', en, 'children (EN)'], ['es', es, 'niños (ES)']]) {
    for (const [label, re] of CHILD_FAIL[lang]) {
      if (!re.test(txt)) continue;
      const msg = `${tag}: ${label} — "${txt.match(re)[0]}"`;
      if (negated(txt, re, lang)) rev(`${msg} appears in a negation; make sure it reads as a safeguard`); else err(msg);
    }
    if (PRAY_KIDS[lang].test(txt) && !CHILD_FAIL[lang].some(([, re]) => re.test(txt)))
      rev(`praying about particular children — "${txt.match(PRAY_KIDS[lang])[0]}": fine for members praying for their own children; strangers' children only when a parent in a real relationship asks`);
  }
  for (const [lang, txt, kid] of [['en', en, KID_EN], ['es', es, KID_ES]]) {
    const kidRe = new RegExp(`\\b${kid}\\b`);
    for (const m of txt.matchAll(ADD_NAME[lang])) {
      const win = txt.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80);
      if (kidRe.test(win)) err(`children (${lang.toUpperCase()}): "add a name" next to a child word — "${m[0]}"`);
    }
  }
  if ((x.ages === 'children' || x.ages === 'youth') && x.minors !== true) err(`ages "${x.ages}" involves under-18s: set minors:true`);
  if (x.minors === true) {
    if (!SCREEN.en.test(enHow)) err('minors:true — the English "how" must mention screening (background checks, the two-adult rule)');
    if (!SCREEN.es.test(esHow)) err('minors:true — el "how" en español debe mencionar la verificación de antecedentes / la regla de dos adultos');
  }
  if (x.ages === 'children' || x.ages === 'youth' || x.minors === true)
    rev(`involves children or teens (ages "${x.ages}", minors ${x.minors}): re-read with the outsider test — through parents, schools that invite us, screened adults`);

  // reach and digital
  const digital = DIGITAL.test(en), printDigital = digital && PRINTWALK.test(en);
  const reach = reachOf(x);   // an in-reach idea serves the church family, so it is rightly at the church
  if (reach !== 'in' && (x.tier === 1 || x.tier === 2) && x.where === 'church' && !REACH.test(en))
    rev('where "church" with no reach words: how will neighbors come across it? (an idea that only waits at the building fails the bar)');

  // softer checks
  for (const [msg, reEn, reEs, unlessEn, unlessEs] of REVIEWS) {
    if (reEn.test(en) && !(unlessEn && unlessEn.test(en))) rev(`${msg} — EN "${en.match(reEn)[0]}"`);
    else if (reEs.test(es) && !(unlessEs && unlessEs.test(es))) rev(`${msg} — ES "${es.match(reEs)[0]}"`);
  }
  if (x.sabbath === true && SABBATH_REVIEW.test(en)) rev(`sabbath:true but the text mentions "${en.match(SABBATH_REVIEW)[0]}"; check Adventist Sabbath practice`);
  if (USTED_REVIEW.test(es)) rev(`Spanish should address the reader as usted — found "${es.match(USTED_REVIEW)[0]}"`);
  if (ES_ENGLISH_REVIEW.test(es)) rev(`English term in the Spanish text — "${es.match(ES_ENGLISH_REVIEW)[0]}" (Conquistadores, Aventureros, Escuela Sabática, Servicios Comunitarios Adventistas)`);
  if (US_SPELLING_REVIEW.test(en)) rev(`use US spelling in English (the app is American English) — "${en.match(US_SPELLING_REVIEW)[0]}"`);

  // built-in catalogue names
  if (x.en && isStr(x.en.n)) {
    const A = tokens(x.en.n), fn = fold(x.en.n).replace(/[^a-z0-9]+/g, ' ').trim();
    for (const s of VOCAB.signature) {
      if (fold(s.n).replace(/[^a-z0-9]+/g, ' ').trim() === fn) err(`name equals the built-in ministry "${s.n}"`);
      else if (jaccard(A, tokens(s.n)) > QUOTA.jaccard) rev(`name close to the built-in ministry "${s.n}"; is the mechanism really different?`);
    }
  }
  if (x.es && isStr(x.es.n)) {
    const fn = fold(x.es.n).replace(/[^a-z0-9]+/g, ' ').trim();
    for (const s of VOCAB.signature) if (s.es && fold(s.es).replace(/[^a-z0-9]+/g, ' ').trim() === fn) err(`es.n equals the built-in ministry "${s.es}"`);
  }
  return {E, R, digital, printDigital};
}

/* ------------------------------------------------------------------ one file */
function nearDupes(items, lang) {
  const out = [];
  const toks = items.map(x => (x && x[lang] && typeof x[lang].n === 'string') ? tokens(x[lang].n) : new Set());
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const s = jaccard(toks[i], toks[j]);
    if (s > QUOTA.jaccard) out.push([items[i], items[j], s]);
  }
  return out;
}
function checkFile(file, {ideasOnly = false} = {}) {
  const res = {file, n: 0, errors: [], reviews: [], ideas: [], stats: null, theme: null};
  const bad = m => res.errors.push(m);
  let j;
  try { j = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { bad(`cannot read JSON: ${e.message}`); return res; }
  if (!j || typeof j !== 'object' || Array.isArray(j)) { bad('file must be {"theme":"<id>","ideas":[…]}'); return res; }
  for (const k of Object.keys(j)) if (k !== 'theme' && k !== 'ideas') bad(`unknown top-level field "${k}"`);
  const theme = j.theme; res.theme = theme;
  if (typeof theme !== 'string' || (THEMES.length && !THEME.has(theme))) bad(`theme "${theme}" is not in themes.json`);
  const base = path.basename(file, '.json');
  if (!ideasOnly && typeof theme === 'string' && base !== theme) bad(`file name should be themes/${theme}.json`);
  if (!Array.isArray(j.ideas)) { bad('"ideas" must be an array'); return res; }
  res.ideas = j.ideas; res.n = j.ideas.length;
  const seen = new Set();
  let digital = 0, printDigital = 0;
  const tier = {1: 0, 2: 0, 3: 0}, kind = {serve: 0, equip: 0, belong: 0, invite: 0}, where = {}, ages = {};
  const reach = {in: 0, out: 0, both: 0};
  let churchNotIn = 0, notIn = 0;   // "go where people are" is measured on ideas neighbors meet (reach out or both)
  j.ideas.forEach((x, i) => {
    const id = (x && typeof x.id === 'string') ? x.id : `#${i}`;
    if (seen.has(id)) bad(`${id}: duplicate id`); seen.add(id);
    const r = checkIdea(x, {theme: typeof theme === 'string' ? theme : null});
    r.E.forEach(m => bad(`${id}: ${m}`)); r.R.forEach(m => res.reviews.push(`${id}: ${m}`));
    if (r.digital) digital++; if (r.printDigital) printDigital++;
    if (x && tier[x.tier] !== undefined) tier[x.tier]++;
    if (x && kind[x.k] !== undefined) kind[x.k]++;
    if (x && typeof x.where === 'string') where[x.where] = (where[x.where] || 0) + 1;
    if (x && typeof x.ages === 'string') ages[x.ages] = (ages[x.ages] || 0) + 1;
    if (x && typeof x === 'object') { const r = reachOf(x); reach[r]++; if (r !== 'in') { notIn++; if (x.where === 'church') churchNotIn++; } }
  });
  for (const lang of ['en', 'es']) for (const [a, b, s] of nearDupes(j.ideas, lang))
    bad(`${a.id} / ${b.id}: names too close (${lang}, Jaccard ${s.toFixed(2)}): "${a[lang].n}" ~ "${b[lang].n}"`);
  res.stats = {tier, kind, where, ages, digital, printDigital, reach};
  if (ideasOnly) return res;
  const n = j.ideas.length, T = THEME.get(theme) || {};
  const digitalMin = T.digitalMin || QUOTA.digital;
  if (n < QUOTA.ideas) bad(`only ${n} ideas; at least ${QUOTA.ideas}`);
  if (tier[1] < QUOTA.t1) bad(`tier 1: ${tier[1]} ideas; at least ${QUOTA.t1}`);
  if (tier[2] < QUOTA.t2) bad(`tier 2: ${tier[2]} ideas; at least ${QUOTA.t2}`);
  if (tier[3] < QUOTA.t3) bad(`tier 3: ${tier[3]} ideas; at least ${QUOTA.t3}`);
  for (const k of KINDS) {
    if (!kind[k]) bad(`no "${k}" ideas; all four kinds must be present`);
    else if (n && kind[k] / n > QUOTA.kindMax) bad(`"${k}" is ${Math.round(100 * kind[k] / n)}% of ideas; at most ${Math.round(100 * QUOTA.kindMax)}%`);
  }
  if (Object.keys(where).length < QUOTA.where) bad(`only ${Object.keys(where).length} different "where" values; at least ${QUOTA.where}`);
  if (digital < digitalMin) bad(`${digital} ideas with a digital/social-media component; at least ${digitalMin}`);
  if (printDigital < QUOTA.printDigital) bad(`${printDigital} ideas combine printed cards or walking with a digital follow-up; at least ${QUOTA.printDigital}`);
  if (notIn && churchNotIn / notIn > 0.35) res.reviews.push(`(theme) ${churchNotIn} of ${notIn} ideas for neighbors (reach out or both) are at the church building; go where people are`);
  if (Object.keys(ages).length < 3) res.reviews.push(`(theme) only ${Object.keys(ages).length} age groups; vary ages`);
  return res;
}
function report(res, label, note = '') {
  for (const m of res.errors) console.log(`ERROR ${label} ${m}`);
  if (SHOW_REVIEW) for (const m of res.reviews) console.log(`REVIEW ${label} ${m}`);
  if (res.errors.length) console.log(`FAIL ${label} ${res.n} ideas, ${res.errors.length} error${res.errors.length === 1 ? '' : 's'}${note}`);
  else console.log(`OK ${label} ${res.n} ideas${note}`);
}

/* ------------------------------------------------------------------ themes.json */
function checkThemes() {
  const errs = [], file = path.join(HERE, 'themes.json');
  let j; try { j = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return [`themes.json: ${e.message}`]; }
  const ids = new Set();
  if (!Array.isArray(j.themes)) return ['themes.json: "themes" must be an array'];
  for (const t of j.themes) {
    const id = t && t.id;
    if (typeof id !== 'string' || !/^[a-z]+(-[a-z]+)*$/.test(id)) { errs.push(`themes.json: bad id ${JSON.stringify(id)}`); continue; }
    if (ids.has(id)) errs.push(`themes.json: duplicate id ${id}`); ids.add(id);
    for (const k of ['en', 'es', 'scope']) if (typeof t[k] !== 'string' || !t[k].trim()) errs.push(`themes.json ${id}: missing ${k}`);
    if (!t.syn || !Array.isArray(t.syn.en) || !Array.isArray(t.syn.es) || t.syn.en.length < 5 || t.syn.es.length < 5) errs.push(`themes.json ${id}: syn.en and syn.es need at least 5 terms each`);
    else for (const l of ['en', 'es']) for (const s of t.syn[l]) if (typeof s !== 'string' || s !== s.toLowerCase().trim()) errs.push(`themes.json ${id}: synonym ${JSON.stringify(s)} must be lowercase and trimmed`);
    if (!Array.isArray(t.tags) || !t.tags.length) errs.push(`themes.json ${id}: tags missing`);
    else for (const g of t.tags) if (!TAGS.has(g)) errs.push(`themes.json ${id}: "${g}" is not a profile() tag`);
    if (!Array.isArray(t.not)) errs.push(`themes.json ${id}: "not" must be an array of [what, themeId]`);
    if ('inside' in t && typeof t.inside !== 'boolean') errs.push(`themes.json ${id}: "inside" must be true or false, or left out`);
    for (const k of Object.keys(t)) if (!['id', 'inside', 'en', 'es', 'scope', 'not', 'syn', 'tags', 'digitalMin'].includes(k)) errs.push(`themes.json ${id}: unknown field "${k}"`);
    const dMin = t.inside === true ? 10 : 12;   // INSIDE THE CHURCH themes: at least 10 digital ideas
    if (t.digitalMin != null && !(Number.isInteger(t.digitalMin) && t.digitalMin >= dMin)) errs.push(`themes.json ${id}: digitalMin must be an integer >= ${dMin}`);
  }
  for (const t of j.themes) for (const p of (t.not || [])) {
    if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'string' || !ids.has(p[1])) errs.push(`themes.json ${t.id}: bad "not" entry ${JSON.stringify(p)}`);
    else if (p[1] === t.id) errs.push(`themes.json ${t.id}: "not" points at itself`);
  }
  // one synonym should not open two themes (search would be ambiguous)
  const owner = new Map();
  for (const t of j.themes) for (const l of ['en', 'es']) for (const s of ((t.syn || {})[l] || [])) {
    const k = fold(s);
    if (owner.has(k) && owner.get(k) !== t.id) errs.push(`themes.json: synonym "${s}" is in both ${owner.get(k)} and ${t.id}`);
    owner.set(k, t.id);
  }
  return errs;
}

/* ------------------------------------------------------------------ main */
let failed = false;
if (argv[0] === '--all') {
  const dir = path.join(HERE, 'themes');
  const tErr = checkThemes();
  tErr.forEach(m => console.log('ERROR ' + m));
  if (tErr.length) failed = true; else console.log(`OK themes.json ${THEMES.length} themes`);
  const present = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')) : [];
  for (const f of present) if (!THEME.has(path.basename(f, '.json'))) { console.log(`ERROR themes/${f} is not a theme in themes.json`); failed = true; }
  const results = [];
  for (const t of THEMES) {
    const f = path.join(dir, t.id + '.json');
    if (!fs.existsSync(f)) { console.log(`MISSING themes/${t.id}.json`); failed = true; continue; }
    const r = checkFile(f); report(r, `themes/${t.id}.json`); if (r.errors.length) failed = true; results.push(r);
  }
  // across themes
  const all = results.flatMap(r => r.ideas.filter(x => x && typeof x.id === 'string').map(x => ({x, theme: r.theme})));
  const idOwner = new Map();
  for (const {x, theme} of all) { if (idOwner.has(x.id)) { console.log(`ERROR duplicate id ${x.id} in ${idOwner.get(x.id)} and ${theme}`); failed = true; } idOwner.set(x.id, theme); }
  // reach.json (optional): {ideaId: "in"|"out"|"both"} for ideas written before the "reach" field
  if (REACH_FILE) {
    const rBad = [];
    if (REACH_FILE.error) rBad.push(`cannot read JSON: ${REACH_FILE.error}`);
    else if (typeof REACH_FILE !== 'object' || Array.isArray(REACH_FILE)) rBad.push('must be an object {"<idea id>": "in"|"out"|"both"}');
    else {
      const byId = new Map(all.map(({x}) => [x.id, x]));
      for (const [id, v] of Object.entries(REACH_FILE)) {
        if (!REACHES.includes(v)) rBad.push(`${id}: reach must be one of ${REACHES.join('|')} (is ${JSON.stringify(v)})`);
        if (!byId.has(id)) rBad.push(`${id}: no idea with this id in the written themes`);
        else if ('reach' in byId.get(id) && byId.get(id).reach !== v) rBad.push(`${id}: reach.json says "${v}" but the idea says "${byId.get(id).reach}"; keep one`);
      }
    }
    rBad.forEach(m => console.log(`ERROR reach.json ${m}`));
    if (rBad.length) failed = true; else console.log(`OK reach.json ${Object.keys(REACH_FILE).length} ideas`);
  }
  for (const lang of ['en', 'es']) {
    const toks = all.map(({x}) => (x[lang] && typeof x[lang].n === 'string') ? tokens(x[lang].n) : new Set());
    for (let i = 0; i < all.length; i++) for (let k = i + 1; k < all.length; k++) {
      if (all[i].theme === all[k].theme) continue;   // same-file pairs were checked above
      const s = jaccard(toks[i], toks[k]);
      if (s > QUOTA.jaccard) { console.log(`ERROR cross-theme near-duplicate (${lang}, Jaccard ${s.toFixed(2)}): ${all[i].x.id} "${all[i].x[lang].n}" ~ ${all[k].x.id} "${all[k].x[lang].n}"`); failed = true; }
    }
  }
  // counts
  const pad = (s, n) => String(s).padEnd(n), num = (s, n) => String(s).padStart(n);
  console.log('\n' + pad('theme', 22) + num('ideas', 6) + num('t1', 5) + num('t2', 5) + num('t3', 5) + num('serve', 7) + num('equip', 7) + num('belong', 7) + num('invite', 7) + num('digital', 8) + num('card+dig', 9) + num('where', 6) + num('in/out/both', 12) + num('review', 7) + num('errors', 7));
  let tot = 0, dig = 0; const rTot = {in: 0, out: 0, both: 0};
  for (const r of results) {
    const s = r.stats; tot += r.n; dig += s.digital; for (const k of REACHES) rTot[k] += s.reach[k];
    console.log(pad(r.theme + ((THEME.get(r.theme) || {}).inside === true ? ' *' : ''), 22) + num(r.n, 6) + num(s.tier[1], 5) + num(s.tier[2], 5) + num(s.tier[3], 5) + num(s.kind.serve, 7) + num(s.kind.equip, 7) + num(s.kind.belong, 7) + num(s.kind.invite, 7) + num(s.digital, 8) + num(s.printDigital, 9) + num(Object.keys(s.where).length, 6) + num(`${s.reach.in}/${s.reach.out}/${s.reach.both}`, 12) + num(r.reviews.length, 7) + num(r.errors.length, 7));
  }
  console.log(`TOTAL ${tot} ideas in ${results.length} of ${THEMES.length} themes, ${dig} with a digital component; reach in ${rTot.in}, out ${rTot.out}, both ${rTot.both}`);
  const insideN = THEMES.filter(t => t.inside === true).length;
  if (insideN) console.log(`* inside the church: ${insideN} themes (WRITERS.md, INSIDE THE CHURCH and ADVENTIST DEPARTMENTS); their ideas default to reach "in"`);
} else {
  const ideasOnly = flag('--ideas-only');
  if (!argv.length) { console.log('usage: node validate.mjs <themes/id.json…> | --ideas-only <file> | --all | --vocab <index.html>  [--no-review]'); process.exit(2); }
  for (const f of argv) {
    const io = ideasOnly || path.basename(f) === 'examples.json';
    const r = checkFile(f, {ideasOnly: io}); report(r, f, io ? ' (idea checks only, no theme quotas)' : ''); if (r.errors.length) failed = true;
  }
}
process.exit(failed ? 1 : 0);
