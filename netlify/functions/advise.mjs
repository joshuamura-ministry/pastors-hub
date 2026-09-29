// Terrain · optional AI ministry planner.                            advise-2.2
//
// The API key lives ONLY in Netlify's encrypted environment variables:
//   Netlify → Project configuration → Environment variables → ANTHROPIC_API_KEY
// It is never in this repository and never reaches the browser.
//
// GET  → { enabled, model, fn, locked }   the page asks this first and only
//                                          shows the button when a key exists
// POST { summary }                         → { text }   a prose plan (unchanged)
// POST { mode:'moves', summary, count, kind, avoid }
//                                          → { ideas:[...] }  fresh ministry
//                                          ideas as structured drafts
// POST { mode:'topic', summary, topic, theme, lang, count, tags, avoid }
//                                          → { ideas:[...], rejected }  "More ideas
//                                          for {town}" beside the Idea Library: up to
//                                          six on one topic, in the library's shape
//                                          and one language, each checked by the
//                                          library's rules before it is returned
//
// 2.2 (v10.40.0). The topic mode. Also: no "temperature" is sent any more.
// Current models (Opus 4.7 and later, Sonnet 5) refuse sampling parameters
// with a 400, which apiError() reported as "That model name was not
// accepted"; ideas vary through the prompt instead (the batches' own lanes).
// The default model (claude-opus-5-5) always thinks, and its thinking counts
// against max_tokens: every mode now leaves room for it and asks for a low
// effort (its default is medium), so a list or a plan is not cut short and
// each call stays inside Netlify's 60 seconds. A list cut off anyway keeps its
// whole ideas; a refusal (stop_reason "refusal") is reported in one sentence.
//
// WHY 2.0. Version 1.1 had no "moves" handler. The page has been sending
// mode:'moves' since v9.97 and getting a prose plan back, which it could not
// parse, so it silently showed the built-in playbook instead. The AI never
// produced a single idea on the live site. This version answers that request.
//
// MODEL. Defaults to Opus, the strongest available, because the point of this
// feature is ideas the built-in list does not already have. Set ADVISE_MODEL
// in Netlify to override — 'claude-sonnet-5' is faster if Opus ever runs into
// the 60-second function limit.
//
// BATCHES. The page asks for ideas in parallel batches, one per kind of
// ministry (Serve, Equip, Belong, Invite), a few ideas each. That keeps every
// call well inside Netlify's 60-second limit and stops the batches producing
// the same idea twice, because each is told to think in a different direction.

const MODEL = (process.env.ADVISE_MODEL || 'claude-opus-5-5').trim();
const FN_VERSION = 'advise-2.2';
const KEY = (process.env.ANTHROPIC_API_KEY || '').trim();
const PASS = (process.env.TERRAIN_AI_PASS || '').trim();
function passOk(given){
  const g = (given || '').trim();
  if (!PASS) return true;
  if (g.length !== PASS.length) return false;
  let diff = 0;
  for (let i = 0; i < PASS.length; i++) diff |= PASS.charCodeAt(i) ^ g.charCodeAt(i);
  return diff === 0;
}
const MAX_BODY = 40000;
// Netlify allows 60s. Leave a margin for the response to be written.
const UPSTREAM_TIMEOUT_MS = 54000;
// Ideas per call. More than this and a call risks the limit on Opus.
const MAX_IDEAS_PER_CALL = 6;

const NO_STORE = 'no-store, max-age=0';
const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': NO_STORE }
  });

const SYSTEM = `You are helping a Seventh-day Adventist pastor. He has just run a census report on the neighbourhood around one of his churches and wants practical ministry planning.

You will receive: the geography, the key figures for the neighbourhood with county comparisons, and the prompts an automated rule engine already produced.

Write a plan he could take to a church board on Sabbath afternoon. Requirements:

1. GROUND EVERY CLAIM IN A NUMBER HE GAVE YOU. Quote the figure. If you cannot tie a suggestion to a figure, do not make it.
2. BE CONCRETE AND LOCAL IN SCALE. A district of two congregations with volunteers, not a megachurch with staff. Say who does it, what it costs roughly, what the first step this week is, and how he will know in three months whether it worked.
3. SEQUENCE IT. What to do first, what to do next quarter, what to leave alone for now. A pastor cannot do fifteen things. Name the two or three with the highest ratio of need met to effort spent, and say why those.
4. NAME WHAT WOULD MAKE YOU WRONG. Where might the data mislead? What should he go and verify with a real conversation before spending money?
5. RESPECT THE PEOPLE IN THE DATA. These are neighbours, not targets. Never imply a group is deficient, needy by nature, or a project. Poverty, immigration status, and single parenthood describe circumstances, not character. Do not romanticise hardship either.
6. DO NOT INVENT FACTS. No specific organisation names, addresses, statistics, or programmes unless they were in the input. If you recommend partnering with "the nearest food bank", say that, do not invent its name.
7. Do not assume the congregation's own ethnicity or income matches the neighbourhood's — that gap is often the pastoral issue, and worth naming as a question rather than an assumption.

Format in plain markdown: ## for section headings, - for bullets, **bold** sparingly. No preamble, no sign-off, no offer to help further. Around 600-900 words. Write in British-neutral plain English, warm but unsentimental.`;

// The four things a church does, in the app's own vocabulary. A batch is told
// which one it is thinking about, so four batches cover four different ground.
const KINDS = {
  Serve:  'SERVE — meet a felt, practical need in the neighbourhood, with nothing asked in return. Food, transport, repairs, forms, childcare, the things that make a hard week easier.',
  Equip:  'EQUIP — teach something people actually want to learn: a skill, a language, money, health, parenting, a certificate that leads to a wage.',
  Belong: 'BELONG — create a place people come back to on a schedule and are known by name. Tables, groups, clubs, rhythms, the cure for isolation.',
  Invite: 'INVITE — the open, honest spiritual step, offered once trust is real: a study, a question night, a prayer, a series, a conversation about Jesus.'
};

const MOVES_SYSTEM = `You are inventing ministry ideas for a Seventh-day Adventist pastor of a small church, from a census report on the neighbourhood around it and an honest inventory of what his church can field.

These must be FRESH. He already has a list of nearly a hundred standard ministries — food pantries, VBS, health expos, homework clubs, grief groups — and a list of those will be given to you as "do not repeat". Anything on that list, or a thin variation of it, is worthless to him. He is asking you because he wants what is NOT on the list: the idea that fits THIS street and THIS church and that nobody has suggested to him before.

Rules, in order of importance:

1. FIT THE FIGURES. Every idea must name the specific figure from the report that makes it right for this neighbourhood, quoted. An idea that would fit any neighbourhood is not an idea.
2. FIT THE CHURCH. Use only the volunteers, hours, skills, rooms and money in the inventory. If they have no kitchen, nothing needs a kitchen. If they have three bilingual members, lean on that. A church of forty is not staffing a clinic. Respect zero.
3. MATCH THE COMMITMENT LEVEL you are given. A light lift is one or two people, no budget, could start before next Sabbath. A heavy lift is weekly with someone always present, or a campaign. Do not hand a light-lift request a weekly programme.
4. STAY IN YOUR LANE. You are given one kind of ministry to think about. Every idea in your batch belongs to that kind.
5. BE GENUINELY DIFFERENT FROM EACH OTHER AND FROM THE LIST. No two ideas in a batch should share a mechanism. Not "a coat drive" when "a clothing closet" is on the list. Not "a Saturday breakfast" when "a men's breakfast" is. Think about what THIS church, with THESE rooms and THESE people, could do that the standard list assumes a bigger church for — or never thought of.
6. SAY HOW TO ACTUALLY DO IT. Steps a member who has never organised anything could follow on Monday morning, in order. Who to phone, what to buy, what to say, what to write down. Four to six steps. This is the part he specifically asked for.
7. RESPECT THE PEOPLE IN THE DATA. Neighbours, not targets. Nobody is a project. Poverty, immigration status and single parenthood are circumstances, not character.
8. INVENT NOTHING. No named organisations, addresses, or statistics beyond what you were given. "The nearest school" is fine; a made-up school name is not. Do not attribute quotations to anyone. Never quote Scripture or Ellen White word for word; name the reference only (for example "a reading of Psalm 23").
9. ADVENTIST CONTEXT is assumed: Sabbath (Saturday) worship, a health emphasis, a literature tradition, Pathfinders, a conference structure. Use it where it helps; do not lecture on it.

Return ONLY a JSON array, nothing else, no markdown fence, no preamble. Each item:
{
  "name":   "short, concrete, distinctive — five words or fewer",
  "why":    "one or two sentences naming the exact figure(s) from the report that make this right HERE",
  "metric": "the key, from before the bar in the LOCAL FIGURES lines, of the ONE figure this idea most rests on, e.g. poverty, renters, limEng, kidsShare, seniorsAlone",
  "room":   "the ONE space it needs: none, outdoor, kitchen, classrooms, gym, field, center, parking, stage, av, nursery, library, vehicle, grounds, home, or any",
  "what":   "two or three sentences describing what actually happens, plainly",
  "first":  ["step one on Monday", "step two", "step three", "step four"],
  "week1":  "the single thing to do this week to find out if it will work",
  "ppl":    <integer, the smallest number of people who could honestly run it>,
  "cost":   <0 nothing beyond what they own, 1 a modest outlay, 2 a budget line>,
  "skills": ["any of: lead, medical, teach, kids, cook, music, lang, trade, vehicle, weekday, admin — only if genuinely required"],
  "watch":  "the one thing most likely to kill it, and the counter to it",
  "unlike": "in one sentence, why this is not already on his list"
}`;

// ---------------------------------------------------------- the idea library's shape and rules
// Mode 'topic' (v10.40.0, advise-2.2): "More ideas for {town}" beside the Idea Library. Six ideas on
// one topic ("prayer", "feeding the homeless"…) for this neighbourhood and this church, in the
// library's own shape (SCHEMA.md in the library source) and ONE language, the page's. Each idea is
// checked here by the library validator's rules before it leaves the server: repaired where the fix
// is mechanical (spaces, a final full stop, a tier that matches its numbers, minors ⇒ kids), rejected
// where it is not (children, banned content, waiting at the building, text out of bounds).
const LIB_TAGS = new Set(['affluent','car-dependent','changing','child-poverty','crowded','dense','divided','families','family-heavy','food-insecure','growing','homeowners','immigrant','jobless','k12','limited-english','low-income','many-kids','multilingual','newcomers','no-car','older','poor','professional','recent-arrivals','rent-burdened','renters','schools-near','seniors-alone','service-work','settled','single-parents','snap','spanish','students','unemp','uninsured','very-immigrant','very-old','very-poor','very-uninsured','veterans','young']);
const LIB_SKILLS = new Set(['lead','medical','teach','kids','cook','music','lang','trade','vehicle','weekday','admin','av','support']);
const LIB_FACS = new Set(['kitchen','classrooms','gym','field','center','parking','stage','av','nursery','library','vehicle','grounds','home']);
const LIB_THEMES = new Set(['prayer','hunger','homeless','children','youth','young-adults','seniors','families','marriage','single-parents','health','mental-health','addiction','grief','immigrants','jobs-money','education','prison','veterans','disability','women','men','personal-evangelism','public-evangelism','hospitality','neighbors','music-arts','sports-outdoors','clothing-practical','disaster-relief','creation-care','media','literature','schools','first-responders','foster-care','abuse-survivors','transport','holidays','small-groups','sabbath-rest','workplaces']);
const LIB_KINDS = ['serve','equip','belong','invite'], LIB_AGES = ['all','children','youth','adults','seniors','families'];
const LIB_WHERE = ['church','streets','homes','online','schools','parks','community','workplaces'], LIB_STAGES = ['open','trust','deeper','decide'];
const LIB_TIER = {
  1: {ppl: [1, 4], leaders: [0, 1], hrs: [1, 10], cost: 150, costMo: 50},
  2: {ppl: [2, 12], leaders: [1, 3], hrs: [1, 24], cost: 1500, costMo: 300},
  3: {ppl: [3, 40], leaders: [1, 6], hrs: [1, 60], cost: 50000, costMo: 10000}
};
const libFold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[‘’ʼ]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, '-').toLowerCase();
function libSentences(d) {        // as the library validator counts them
  let t = String(d);
  const q = (m, inner, off, all) => 'Q' + (/[.!?…]\s*$/.test(inner) && /^\s+[A-Z¿¡À-Ý]/.test(all.slice(off + m.length)) ? '.' : '');
  t = t.replace(/“([^”]*)”|"([^"]*)"|«([^»]*)»|‘([^’]*)’/g, (m, a, b, c, e, off, all) => q(m, a ?? b ?? c ?? e ?? '', off, all));
  t = t.replace(/(^|[\s(:])'([^']{3,}?)'(?=[\s.,;:!?)]|$)/g, (m, pre, inner, off, all) => pre + q(m.slice(pre.length), inner, off + pre.length, all));
  t = t.replace(/\b(?:e\.g|i\.e|a\.m|p\.m|u\.s|p\.\s?ej|ee\.\s?uu)\./gi, 'X').replace(/\b(?:etc|vs|approx|aprox|dr|mr|mrs|ms|st|ave|rd|sr|sra|dra|min|max|no)\.(?=\s+[a-z0-9])/g, 'X');
  const ends = (t.match(/[.!?…](?=["')”»]?(\s|$))/g) || []).length;
  return ends + (/[.!?…]["')”»]?\s*$/.test(t.trim()) ? 0 : 1);
}
// [label, EN regex, ES regex, exception (same language) or null]: the validator's BANNED list
const LIB_BANNED = [
  ['pork or unclean meat', /\b(pork|bacon|hams?(?! radio)|pepperoni|pulled pork|lard|shrimp|lobsters?|crabs?|clams?|oysters?|shellfish|catfish)\b|(?<!(veggie|vegetarian|plant-based|vegan|meatless|soy) )\b(sausages?|hot ?dogs?)\b/,
    /\b(cerdo|puerco|tocino|jamon(es)?|chorizos?|chicharron(es)?|carnitas|manteca de cerdo|camarones|camaron|mariscos|langostas?|cangrejos?|almejas|ostras|ostiones)\b|\bsalchichas?\b(?! (vegetarian|vegana|de soya|vegetal))/],
  ['alcohol', /\b(beers?|wines?|liquor|cocktails?|brewery|breweries|winery|wineries|taprooms?|pubs?|happy hour|sangria|champagne|mimosas?|bartend\w*|booze)\b/,
    /\b(cervezas?|cerveceria|licor(es)?|coctel(es)?|cantinas?|vinos|vino (tinto|blanco)|copas? de vino|hora feliz|bar de copas)\b/],
  ['games of chance', /\b(raffles?|raffling|lotter(y|ies)|casinos?|betting|poker|sweepstakes|door prizes?|50\/50|fifty-fifty|prize draws?|scratch-?offs?|slot machines?|games of chance|bingo)\b/,
    /\b(rifas?|rifar|sorteos?|loterias?|tragamonedas|raspaditos|bingo)\b/],
  ['gambling', /\bgambl\w*/, /\b(apuestas|juegos de azar|casinos?)\b/, /addict|recover|problem gambl|gamblers anonymous|adiccion|recuperacion|ludopatia|jugadores anonimos/],
  ['"target" people', /\btarget(s|ed|ing)?\b/, /\b(publico objetivo|poblacion objetivo|grupo objetivo|segmentar|segmentacion|segmentad[oa]s?|focaliza\w*)\b/],
  ['bait/lure/hook framing', /\b(bait(ed|ing)?|bait-and-switch|lure[sd]?|luring|hook (them|people|neighbou?rs|visitors)|foot in the door|trojan horse)\b/,
    /\b(carnada|cebo|anzuelo|engancharl[oa]s|atraparl[oa]s|atraerl[oa]s con)\b/],
  ['soul-counting framing', /\b(convert(ing)? (them|people|neighbou?rs|him|her|those|visitors|guests|the community)|make converts|new converts|count converts|win (them|souls)|soul-?winning|captive audience|prospect (list|card|name)s?|prospects for baptism|evangelism prospects)\b/,
    /\b(convertirl[oa]s|hacer conversos|conversos|ganarl[oa]s|ganar almas|prospectos|audiencia cautiva)\b/],
  ['door-to-door gathering of personal information', /\b(door-to-door (survey|census|questionnaire)s?|survey (the |every )?(homes|households|doors)|collect(ing)? (names|phone numbers|e-?mails|information|details) (at|from) (the |every )?(doors|homes|households))\b/,
    /\b(encuestas? (casa por casa|de puerta en puerta)|recoger (datos|nombres|telefonos) (en|de) (las )?(casas|puertas|hogares))\b/],
  ['dignity (say neighbors, families, guests)', /\b(the needy|the less fortunate|less fortunate|handouts?|charity cases?|underprivileged|the unchurched|the lost)\b/, /\b(los necesitados|los menos afortunados|los inconversos|los perdidos|limosnas?)\b/],
  ['meat on the menu (Adventist churches serve vegetarian food)', /\b(chicken|beef|turkey|hamburgers?|burgers?|steak|meatballs?|fish fry|barbecue|bbq|wings)\b/, /\b(pollo|carne de res|pavo|hamburguesas?|bistec|albondigas|parrillada|carne asada)\b/,
    /\b(veggie|vegetarian|plant-based|vegan|meatless|tofurky|vegetarian[oa]s?|vegan[oa]s?|a base de plantas|de soya)\b/]
];
const LIB_COUNSEL = {
  en: /\b(counsel(l)?ing|counsel(l)?ors?|therap(y|ies|ist|ists|eutic)|diagnos\w*|psychotherap\w*|treat(ing|ment) (of |for )?(depression|anxiety|addiction|trauma|ptsd|disorders?))\b/,
  es: /\b(consejeria|consejer[oa]s|terapias?|terapeut\w*|diagnostic\w*|psicoterap\w*|tratamiento (de|para) (la )?(depresion|ansiedad|adiccion|trauma))\b/,
  cue_en: /\b(not (a |an )?(counsel|therap)\w*|no (counsel|therap)\w*|isn't (counsel|therap)\w*|never (counsel|diagnos|therap)\w*|refer\w*|licensed|professional\w*|hotline|988|clinician\w*|psychologist\w*)\b/,
  cue_es: /\b(no es (una )?(terapia|consejeria)|deriva\w*|remit\w*|profesional\w*|licenciad\w*|con licencia|linea de (ayuda|crisis)|988|psicolog\w*)\b/
};
const LIB_KID = {en: '(?:kids?|child(?:ren)?|students?|sons?|daughters?|teens?|teenagers?|grandchildren|grandkids|minors?|pupils?)',
                 es: '(?:nin[oa]s?|hij[oa]s?|alumn[oa]s?|estudiantes?|niet[oa]s?|chic[oa]s|menores|adolescentes|muchach[oa]s)'};
const LIB_CHILD = {
  en: [
    new RegExp(`\\b(?:names?|photos?|photographs?|pictures?|birthdays?|addresses|phone numbers?)\\s+of\\s+(?:their|your|the|his|her|local|neighbou?rhood|any)?\\s*${LIB_KID.en}\\b`),
    new RegExp(`\\b${LIB_KID.en}(?:'s|s')?\\s+(?:first\\s+|full\\s+)?(?:names?|photos?|photographs?|pictures?|birthdays?|addresses|phone numbers?)\\b`),
    /\b(prayer requests?|requests? for prayer|what to pray (for|about)|send us|text us|tell us|submit)\b[^.!?]{0,50}\b(their|your|his|her) (kids?|children|child|sons?|daughters?|teens?|students?|grandchildren|grandkids)\b/,
    /\bpray\w*\b[^.!?]{0,50}\b(their|your|his|her) (kids?|children|child|sons?|daughters?|teens?|students?|grandchildren|grandkids)\b/,
    /\b(school gates?|school entrances?|school drop-?offs?|school pick-?ups?|drop-?off lines?|pick-?up lines?|car ?lines?|carpool lines?|school dismissal|playgrounds?|school bus stops?|bus stops? (for|where|used by) (students|kids|children)|skate ?parks?|youth hang-?outs?|outside (the |a |local |their )?schools?\b(?! (hours|time|days?|years?|terms?|calendar)))/,
    /\b(reach(ing)?|attract(ing)?|recruit(ing)?|grab(bing)?|win(ning)?) (the |more |local |neighbou?rhood )?(kids|children)\b|\b(get|getting|bring|bringing) (the |more )?(kids|children) in(to)?\b/,
    /\bapproach(es|ed|ing)? (the |local )?(kids|children|teens|students|minors)\b/,
    /\b(lists?|rosters?|databases?|sign-?up sheets?) of (the |local )?(kids|children|students|teens|minors)\b/
  ],
  es: [
    new RegExp(`\\b(?:nombres?|fotos?|fotografias?|imagenes|cumpleanos|direcciones|telefonos?|datos)\\s+de\\s+(?:los\\s+|las\\s+|sus\\s+|tus\\s+|nuestros\\s+)?${LIB_KID.es}\\b`),
    /\b(pedidos? de oracion|peticiones? de oracion|motivos? de oracion|por que orar|envienos|escribanos|diganos|cuentenos)\b[^.!?]{0,50}\b(sus|tus) (hij[oa]s|nin[oa]s|niet[oa]s|alumn[oa]s|estudiantes)\b/,
    /\bor(ar|amos|emos|aremos|ando|an|en)\b[^.!?]{0,50}\b(sus|tus) (hij[oa]s|nin[oa]s|niet[oa]s|alumn[oa]s|estudiantes)\b/,
    /\b(puertas? de (la |las )?escuelas?|entradas? de (la )?escuela|salidas? de (la )?escuela|(afuera|frente) (de |a )(la |una )?escuela|parques? infantil(es)?|patios? de juegos?|zonas? de juegos?|juegos infantiles|columpios|paradas? del? autobus escolar|skate ?park)\b/,
    /\b(alcanzar|atraer|captar|reclutar|ganar) (a )?(los |mas )?(nin[oa]s|chic[oa]s|menores)\b/,
    /\b(acercarse|abordar) a (los )?(nin[oa]s|menores|estudiantes|adolescentes)\b/,
    /\b(listas?|registros?|base de datos) de (los )?(nin[oa]s|alumn[oa]s|estudiantes|menores)\b/
  ]
};
const LIB_NEG = {en: /\b(no|never|not|without|nor|don't|do not|won't|avoid|instead of)\b[^.!?;]{0,30}$/, es: /\b(no|nunca|sin|ni|jamas|evite|en lugar de)\b[^.!?;]{0,30}$/};
const libNegated = (txt, re, lang) => { const m = txt.match(re); return !!m && LIB_NEG[lang].test(txt.slice(Math.max(0, m.index - 40), m.index)); };
const LIB_ADD_NAME = {en: /\badd (a|their|your|his|her|the) (\w+ )?names?\b/g, es: /\b(agregar|agregue|anadir|anada|anotar|anote|escribir|escriba) (el|un|su|los) nombres?\b/g};
const LIB_SCREEN = {
  en: /\b(screen(ed|ing)?|background[- ]checks?|two[- ]adult|two adults|shield the vulnerable|child[- ]protection|safeguarding|verified adults?)\b/,
  es: /\b(verificacion de antecedentes|antecedentes|dos adultos|shield the vulnerable|proteccion (infantil|de menores)|adultos verificados|verificad[oa]s)\b/
};
const LIB_REACH = {
  en: /\b(walk\w*|doors?|doorsteps?|cards?|postcards?|streets?|neighbo\w*|markets?|librar\w*|parks?|online|social|posts?|posting|posted|ads?|invit\w*|flyers?|fliers?|texts?|texting|events?|partner\w*|business\w*|school's invitation|nextdoor|facebook|instagram|qr|mail\w*|e-?mails?|signs?|banners?|radio|newspapers?|whatsapp|videos?|word of mouth|referr\w*|refers?|agenc\w*|clinics?|shelters?|laundromats?|stores?|shops?|cafes?|coffee shops?|town|township|borough|county|festivals?|fairs?)\b/,
  es: /\b(camin\w*|puertas?|tarjetas?|postales?|calles?|vecin\w*|mercados?|bibliotecas?|parques?|en linea|redes|publica\w*|anuncios?|invit\w*|volantes?|mensajes?|textos?|eventos?|socios?|alian\w*|negocios?|facebook|instagram|nextdoor|qr|correo\w*|carteles?|letreros?|pancartas?|radio|periodicos?|whatsapp|videos?|boca en boca|deriva\w*|agencias?|clinicas?|refugios?|albergues?|lavanderias?|tiendas?|cafeterias?|cafes?|pueblo|municipio|condado|ferias?|festivales?)\b/
};
const LIB_DIGITAL = {
  en: /\b(facebook|instagram|social media|online|websites?|text messages?|texting|text line|text us|whatsapp|nextdoor|youtube|tiktok|reels?|livestream\w*|live ?stream\w*|qr|ads?|videos?|podcasts?|e-?mails?|google|zoom|canva|messenger)\b/,
  es: /\b(facebook|instagram|redes sociales|en linea|sitio web|pagina web|mensajes? de texto|whatsapp|nextdoor|youtube|tiktok|reels?|transmision en vivo|en vivo|qr|anuncios?|videos?|podcasts?|podcast|correo electronico|correos|google|zoom|canva|messenger)\b/
};
// The validator's REVIEW lines, which a person re-reads for the library: for an AI idea nobody has
// re-read, the same lines reject it.
const LIB_STRICT = [
  ['knocking (a card, not a knock, unless invited)', /\bknock\w*/, /\b(toc(ar|a|an|amos|ando) (a |la )?puerta|golpe\w* (a |la )?puerta)/,
    /\b(no|never|without|nobody|not|nor) (knock|knocking)\b|\bunless (invited|someone|somebody|they)|\bby appointment|\binvited\b|\bno knocking\b/, /\bsin toc\w*|\bno toc\w*|\bnunca toc\w*|\bsolo si (le|lo|la|los|las)? ?invit\w*|con cita/],
  ['prayer requests with no private option', /\bprayer requests?\b/, /\b(pedidos?|peticiones?|motivos?) de oracion\b/,
    /anonym|privat|confidential|no name|first name only|without (a|their) name|optional/, /anonim|privad|confidencial|sin nombre|solo (el|su) (primer )?nombre|opcional/],
  ['photos with no consent', /\b(photos?|photograph\w*|pictures?|selfies?)\b/, /\b(fotos?|fotografias?|selfies?)\b/,
    /\b(no|never|without|nor) (photos?|photograph\w*|pictures?|selfies?|cameras?)|consent|permission/, /\b(sin|ninguna|nunca|no) (fotos?|fotografias?)|consentimiento|permiso/]
];
const LIB_SABBATH_SELL = /\b(sell|selling|sale|sales|buy|buying|purchas\w*|fundrais\w*|tournaments?|competition|competitive|leagues?|admission|tickets?|shopping|vend\w*|compra\w*|recaud\w*|torneos?|competencias?|entradas? pagadas|boletos?)\b/;
const LIB_EMOJI = /\p{Extended_Pictographic}/u;
const libClean = s => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '');
const libIntIn = (v, lo, hi) => { const n = typeof v === 'string' && /^\d+$/.test(v.trim()) ? +v : v; return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };

/* v10.40 fix: Scripture is quoted in this app only word for word from the KJV / RVA 1909 (checked
   against Bible Gateway); the model may name a passage but never quote one, nor Ellen White. A
   quotation (“…”, «…» or "…") is refused when it holds LORD, Jehová, thee or thou, or when a book of
   the Bible with a chapter number, or Ellen White's name, stands within 80 characters. */
const BIBLE_BOOKS = 'genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther|job|psalms?|proverbs|ecclesiastes|song of songs|song of solomon|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation|' +
  'exodo|levitico|numeros|deuteronomio|josue|jueces|rut|reyes|cronicas|esdras|nehemias|ester|salmos?|proverbios|eclesiastes|cantares|isaias|jeremias|lamentaciones|ezequiel|oseas|abdias|jonas|miqueas|habacuc|sofonias|hageo|zacarias|malaquias|mateo|marcos|lucas|juan|hechos|romanos|corintios|galatas|efesios|filipenses|colosenses|tesalonicenses|timoteo|tito|filemon|hebreos|santiago|pedro|judas|apocalipsis';
const SCRIPTURE_REF = new RegExp(`\\b(${BIBLE_BOOKS})\\s+\\d{1,3}\\b|\\bellen (g\\. )?white\\b|\\belena (g\\. )?de white\\b`);
const SCRIPTURE_WORDS = /\b(lord|jehova|thee|thou)\b/;
function quotesScripture(text) {
  const t = String(text || '');
  for (const m of t.matchAll(/“([^”]{6,})”|«([^»]{6,})»|"([^"]{6,})"/g)) {
    const inner = libFold(m[1] ?? m[2] ?? m[3] ?? '');
    if (/\bLORD\b/.test(m[0]) || SCRIPTURE_WORDS.test(inner.replace(/\blord'?s? (supper|prayer|day)\b/g, ''))) return true;
    const near = libFold(t.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80));
    if (SCRIPTURE_REF.test(near)) return true;
  }
  return false;
}
/* One idea from the model → {idea} or {why}. lang is the one language it was written in. */
function libCheckIdea(x, lang, ctx) {
  const no = why => ({why});
  if (!x || typeof x !== 'object' || Array.isArray(x)) return no('not an object');
  const T = x[lang] && typeof x[lang] === 'object' ? x[lang] : null;
  if (!T) return no('no text in ' + lang);
  // text: repaired spaces and a final full stop on the name; the lengths are the library's
  let n = libClean(T.n).replace(/\.$/, ''), d = libClean(T.d);
  let how = Array.isArray(T.how) ? T.how.map(libClean).filter(Boolean) : [];
  if (how.length > 4) how = how.slice(0, 4);                       // the first four, in order
  if (n.length < 6 || n.length > 60) return no('name length');
  if (d.length < 100 || d.length > 420) return no('description length');
  const sn = libSentences(d); if (sn < 2 || sn > 3) return no('description must be 2-3 sentences');
  if (how.length !== 4 || how.some(h => h.length < 20 || h.length > 140) || new Set(how).size !== 4) return no('four steps of 20-140 characters');
  if ([n, d, ...how].some(s => LIB_EMOJI.test(s))) return no('emoji');
  if (quotesScripture([n, d, ...how].join(' \n '))) return no('quotes Scripture or Ellen White word for word');
  if (ctx.avoid.has(libFold(n).replace(/[^a-z0-9]+/g, ' ').trim())) return no('already in the library');
  // enums
  const k = String(x.k || '').toLowerCase(); if (!LIB_KINDS.includes(k)) return no('kind');
  let ages = String(x.ages || 'all').toLowerCase(); if (!LIB_AGES.includes(ages)) ages = 'all';
  const where = String(x.where || '').toLowerCase(); if (!LIB_WHERE.includes(where)) return no('where');
  let minors = x.minors === true || ages === 'children' || ages === 'youth';
  // tags and skills: unknown ones dropped; an idea must still rest on one census tag
  const tags = v => [...new Set((Array.isArray(v) ? v : []).map(t => String(t)).filter(t => LIB_TAGS.has(t)))];
  const need = tags(x.need).slice(0, 6), boost = tags(x.boost).filter(t => !need.includes(t)).slice(0, 4);
  if (!need.length) return no('no census tag');
  const skill = [...new Set((Array.isArray(x.skill) ? x.skill : Array.isArray(x.skills) ? x.skills : []).map(String).filter(s => LIB_SKILLS.has(s)))].slice(0, 4);
  if (minors && !skill.includes('kids')) { if (skill.length >= 4) skill.pop(); skill.push('kids'); }
  let fac = Array.isArray(x.fac) ? x.fac.map(g => String(g).split('|').filter(f => LIB_FACS.has(f)).join('|')).filter(Boolean).slice(0, 3) : [];
  // numbers, and the size they add up to (the smallest tier whose limits they fit)
  const ppl = libIntIn(x.ppl, 1, 40), hrs = libIntIn(x.hrs, 1, 80), cost = libIntIn(x.cost, 0, 50000), costMo = libIntIn(x.costMo, 0, 10000);
  let leaders = libIntIn(x.leaders, 0, 6);
  if (ppl == null || hrs == null || cost == null || costMo == null || leaders == null) return no('numbers');
  if (leaders > ppl) leaders = ppl;
  let partner = null;
  const p = x.partner && typeof x.partner === 'object' ? libClean(x.partner[lang] || x.partner.en || x.partner.es) : typeof x.partner === 'string' ? libClean(x.partner) : '';
  if (p && p.length >= 3 && p.length <= 120) partner = {[lang]: p};
  const fits = t => { const L = LIB_TIER[t]; return ppl >= L.ppl[0] && ppl <= L.ppl[1] && leaders >= L.leaders[0] && leaders <= L.leaders[1] && hrs >= L.hrs[0] && hrs <= L.hrs[1] && cost <= L.cost && costMo <= L.costMo
    && (t < 3 || partner || cost >= 300 || costMo >= 100); };
  let tier = [1, 2, 3].includes(+x.tier) ? +x.tier : 2;
  if (!fits(tier)) { const t2 = [1, 2, 3].find(fits); if (!t2) return no('numbers fit no size'); tier = t2; }
  // the content rules, on folded text, in the idea's language
  const txt = libFold([n, d, ...how, p].join(' \n ')), howTxt = libFold(how.join(' '));
  for (const [label, reEn, reEs, unless] of LIB_BANNED) {
    const re = lang === 'es' ? reEs : reEn;
    if (re.test(txt) && !(unless && unless.test(txt)) && !libNegated(txt, re, lang)) return no('banned: ' + label);
  }
  if (!partner && LIB_COUNSEL[lang].test(txt) && !LIB_COUNSEL['cue_' + lang].test(txt)) return no('counselling with no professional or referral');
  if ((x.theme === 'abuse-survivors' || ctx.theme === 'abuse-survivors') && !partner && !/\b(hotline|shelter|advocate\w*|professional\w*|988|911|linea de ayuda|refugio|albergue|defensor\w*|profesional\w*)\b/.test(txt)) return no('abuse survivors need a professional partner');
  for (const re of LIB_CHILD[lang]) if (re.test(txt) && !libNegated(txt, re, lang)) return no('children: ' + String(txt.match(re)[0]).slice(0, 40));
  const kidRe = new RegExp(`\\b${LIB_KID[lang]}\\b`);
  for (const m of txt.matchAll(LIB_ADD_NAME[lang])) if (kidRe.test(txt.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80))) return no('children: a name asked for');
  if (minors && !LIB_SCREEN[lang].test(howTxt)) return no('children: the steps must name the screening');
  for (const [label, reEn, reEs, unEn, unEs] of LIB_STRICT) {
    const re = lang === 'es' ? reEs : reEn, un = lang === 'es' ? unEs : unEn;
    if (re.test(txt) && !un.test(txt)) return no(label);
  }
  if ((tier === 1 || tier === 2) && where === 'church' && !LIB_REACH[lang].test(txt)) return no('waits at the church building');
  let sabbath = x.sabbath === true;
  if (sabbath && LIB_SABBATH_SELL.test(txt)) sabbath = false;          // buying and selling is not for the Sabbath
  const theme = LIB_THEMES.has(ctx.theme) ? ctx.theme : LIB_THEMES.has(x.theme) ? x.theme : null;
  const idea = {theme, tier, k, ages, where, sabbath, minors, need, boost, ppl, leaders, hrs, cost, costMo, skill, partner,
    [lang]: {n, d, how}, dig: LIB_DIGITAL[lang].test(txt) ? 1 : 0};
  if (LIB_STAGES.includes(x.st)) idea.st = x.st;
  if (fac.length) idea.fac = fac;
  return {idea};
}

const TOPIC_SYSTEM = (lang) => `You are inventing ministry ideas for a Seventh-day Adventist pastor of a small or medium church (20 to 150 members, few paid staff, a modest budget) in the United States. You receive: one TOPIC the pastor searched for, a census report on the neighbourhood around the church, the census tags that fire there, the church's honest inventory, and the names of ideas he already has on this topic ("do not repeat").

In his own words:
"There aren't enough ministry ideas. If I say Prayer there should be 50 different things for prayer that a church can do. Creative, creative, creative, out of the box."
"Sitting at the porch of your church where nobody walks by is not a great idea. Prayer cards and walking the neighbourhood, prayer walking, Facebook ads for prayer. Make sure we use social media."
"With the kids we have to be careful not to be asking for praying for kids. It just sounds weird."

Rules, in order of importance:
1. CHILDREN. Never ask strangers or parents who do not know the church for children's names, photos, schools, ages or prayer requests about their children. Nothing at school gates, pick-up lines, bus stops for students, playgrounds or youth hang-outs. Never approach children directly. No lists, cards, boxes or forms that collect children's details. Anything with children goes through their parents, or a school or organisation that invites the church. Church-run programmes use screened adults (background checks, the two-adult rule, parental consent): if an idea involves anyone under 18, set "minors": true and say so in the steps.
2. THE OUTSIDER TEST. A neighbour who has never heard of the church must find the idea kind and natural, not strange, pushy or intrusive. Neighbours are neighbours: never "targets", "prospects", "the needy", "the lost". No bait, no strings, no soul-counting. Prayer requests always have a private or anonymous option. Homes get a card at the door, never a knock, unless someone invited you. Nothing goes in mailboxes except stamped mail. No photos of people served, and never of children, without written consent.
3. GO WHERE PEOPLE ARE. Every idea says how neighbours will actually come across it, and works for a church on a road with no foot traffic: the streets, homes (a card, not a knock), public places people already use (with permission: markets, laundromats, libraries, stations, parks, local events, businesses), or online. Nothing that only waits at the church building.
4. SOCIAL MEDIA WHERE IT FITS. At least two of the ideas have a real digital or social-media part, done as a practitioner would: a Facebook and Instagram ad shown within a few miles of the church at $5 a day, a post in a Nextdoor or Facebook community group as a neighbour, a text line (opt-in, honour STOP), a QR code on a printed card, a short vertical video with captions, a WhatsApp channel. At least one combines printed cards or walking with a digital follow-up. Meta rejects ad copy that implies the viewer has a condition; talk about the offer.
5. FRESH AND DIFFERENT. Nothing on the do-not-repeat list or a re-skin of it. No two ideas share a mechanism: vary the channel, the exchange, the rhythm and the people. Specific and concrete: a real action, a real price, a named role who answers.
6. FIT THIS PLACE AND THIS CHURCH. Use the figures and the census tags given. Respect the church's volunteers, skills, rooms and money, including zero.
7. ADVENTIST AND SAFE. Vegetarian food only (never pork or shellfish, no meat on menus), no alcohol, no raffles, lotteries, bingo or games of chance. Sabbath (Friday sunset to Saturday sunset): "sabbath": true only for worship, prayer, visiting, nature and mercy, never buying, selling, fundraising or competition. Counselling, therapy, addiction and abuse work only through licensed professionals or a hotline, named as the partner. Invent no named organisations, people, addresses or statistics: say "the county food bank", "a licensed counselor", "the library". Never quote Scripture or Ellen White word for word; name the reference only (for example "a reading of Psalm 23").

Sizes ("tier"), and the numbers must fit the size:
- 1: one person or a few, this week, little money: ppl 1-4, leaders 0-1, hrs 1-10, cost <= 150, costMo <= 50.
- 2: a small team, about a month: ppl 2-12, leaders 1-3, hrs 1-24, cost <= 1500, costMo <= 300.
- 3: a program with a budget line or a partner: ppl 3-40, leaders 1-6, hrs 1-60, and a partner, or cost >= 300, or costMo >= 100.
Mix the sizes: at least two ideas of size 1.
Kinds ("k"): serve (a felt need, no strings), equip (teach the skill the need exposes), belong (a group people come back to), invite (the open spiritual step, honest about what it is). Use at least three kinds.

Write the text in ${lang === 'es' ? 'natural Latin-American SPANISH, addressing the reader as usted' : 'plain US ENGLISH (neighbor, program, center)'} ONLY, under the key "${lang}".
- "n": the name, 6 to 60 characters, no final full stop. Say what it is, not a slogan.
- "d": 2 or 3 sentences, 100 to 400 characters: what it is, how neighbours come across it, and why it works.
- "how": exactly 4 steps, each 20 to 140 characters, each starting with a verb, in the order someone does them on Monday.

Return ONLY a JSON array, no markdown fence, no preamble. Each item:
{"tier":1,"k":"serve","ages":"all|children|youth|adults|seniors|families","where":"church|streets|homes|online|schools|parks|community|workplaces","sabbath":true,"minors":false,
 "need":["1 to 6 census tags from the list, most specific first, preferring tags that fire here"],"boost":["0 to 4 tags"],
 "ppl":2,"leaders":0,"hrs":3,"cost":60,"costMo":5,"skill":["0 to 4 of: lead, medical, teach, kids, cook, music, lang, trade, vehicle, weekday, admin, av, support"],
 "partner":null or {"${lang}":"the kind of partner"},"fac":["optional: kitchen, classrooms, gym, field, center, parking, stage, av, nursery, library, vehicle, grounds, home; a|b for alternatives"],
 "${lang}":{"n":"…","d":"…","how":["…","…","…","…"]}}
Census tags: ${[...LIB_TAGS].join(', ')}.`;

// The model is asked for bare JSON; if a long answer was cut off, keep every whole object before the cut.
function salvageObjects(text) {
  const t = String(text || ''), out = [];
  let i = t.indexOf('['); if (i < 0) return out;
  let depth = 0, start = -1, q = false, esc = false;
  for (let j = i + 1; j < t.length; j++) {
    const ch = t[j];
    if (q) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') q = false; continue; }
    if (ch === '"') { q = true; continue; }
    if (ch === '{') { if (depth === 0) start = j; depth++; }
    else if (ch === '}') { depth--; if (depth === 0 && start >= 0) { try { out.push(JSON.parse(t.slice(start, j + 1))); } catch {} start = -1; } }
  }
  return out;
}

async function callClaude(key, body){
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

function apiError(res, data){
  const detail = data && data.error && data.error.message ? data.error.message : 'HTTP ' + res.status;
  if (res.status === 401 || /api-key|authentication/i.test(detail)) {
    return reply({ error: 'Anthropic rejected the API key. Copy it again from console.anthropic.com (it begins sk-ant-), ' +
      'paste it into Netlify as ANTHROPIC_API_KEY with no spaces or line breaks, and redeploy.' }, 401);
  }
  if (res.status === 400 && /model/i.test(detail)) {
    return reply({ error: 'That model name was not accepted: "' + MODEL + '". Check the ADVISE_MODEL variable, or remove it to use the default.' }, 400);
  }
  if (res.status === 429) {
    return reply({ error: 'Rate limited by Anthropic, or the account has no credit. Check billing at console.anthropic.com, then try again.' }, 429);
  }
  return reply({ error: 'The AI service refused the request: ' + detail }, 502);
}

// The model is asked for bare JSON. Occasionally it fences it anyway, or
// prefaces it. Strip the fence and find the outermost array before giving up.
function extractArray(text){
  let t = String(text || '').trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { const j = JSON.parse(t); if (Array.isArray(j)) return j; if (j && Array.isArray(j.ideas)) return j.ideas; } catch {}
  const a = t.indexOf('['), b = t.lastIndexOf(']');
  if (a >= 0 && b > a) { try { const j = JSON.parse(t.slice(a, b + 1)); if (Array.isArray(j)) return j; } catch {} }
  return null;
}

const SKILL_KEYS = ['lead','medical','teach','kids','cook','music','lang','trade','vehicle','weekday','admin'];
function cleanIdea(x){
  if (!x || typeof x !== 'object') return null;
  const s = v => (typeof v === 'string' ? v.trim() : '');
  const name = s(x.name).slice(0, 80);
  const why = s(x.why).slice(0, 600);
  if (!name || !why) return null;
  const steps = Array.isArray(x.first) ? x.first.map(s).filter(Boolean).slice(0, 6) : [];
  const ppl = Number.isInteger(x.ppl) && x.ppl >= 1 && x.ppl <= 40 ? x.ppl : 2;
  const cost = [0,1,2].includes(x.cost) ? x.cost : 1;
  const skills = Array.isArray(x.skills) ? x.skills.map(s).filter(k => SKILL_KEYS.includes(k)) : [];
  const metric = /^[a-zA-Z0-9]{2,32}$/.test(s(x.metric)) ? s(x.metric) : '';
  const room = /^[a-z]{2,16}$/.test(s(x.room).toLowerCase()) ? s(x.room).toLowerCase() : '';
  return {
    name, why, metric, room,
    what:   s(x.what).slice(0, 800),
    first:  steps,
    week1:  s(x.week1).slice(0, 400),
    ppl, cost, skills,
    watch:  s(x.watch).slice(0, 400),
    unlike: s(x.unlike).slice(0, 300)
  };
}

export default async (request) => {
  if (request.method === 'GET') {
    return reply({
      enabled: !!KEY, model: MODEL, fn: FN_VERSION, locked: !!PASS,
      keyLooksRight: KEY.startsWith('sk-ant-') && KEY.length > 40, keyLength: KEY.length,
      maxIdeasPerCall: MAX_IDEAS_PER_CALL, kinds: Object.keys(KINDS), topic: true
    });
  }
  if (request.method !== 'POST') return reply({ error: 'Use GET or POST.' }, 405);
  if (!passOk(request.headers.get('x-terrain-pass'))) {
    return reply({ error: 'This ministry planner is private to the pastor who set it up.', code: 'locked' }, 401);
  }
  if (!KEY) return reply({ error: 'No API key is configured on the server, so AI planning is switched off.' }, 503);

  let payload;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return reply({ error: 'That report is too large to send.' }, 413);
    payload = JSON.parse(raw);
  } catch { return reply({ error: 'Could not read the report data.' }, 400); }
  if (!payload || typeof payload.summary !== 'string' || payload.summary.length < 40) {
    return reply({ error: 'No report data was included.' }, 400);
  }

  // ---------------------------------------------------------- fresh ideas
  if (payload.mode === 'moves') {
    const count = Math.max(1, Math.min(MAX_IDEAS_PER_CALL, parseInt(payload.count, 10) || 4));
    const kind = KINDS[payload.kind] ? payload.kind : null;
    const avoid = Array.isArray(payload.avoid) ? payload.avoid.filter(x => typeof x === 'string').slice(0, 300) : [];
    const user = [
      payload.summary,
      kind ? 'KIND OF MINISTRY FOR THIS BATCH: ' + KINDS[kind] : '',
      'DO NOT REPEAT ANY OF THESE, OR THIN VARIATIONS OF THEM: ' + (avoid.join('; ') || '(none given)'),
      'Return exactly ' + count + ' ideas.'
    ].filter(Boolean).join('\n\n');
    try {
      const { res, data } = await callClaude(KEY, {
        model: MODEL,
        // roughly 450 tokens per fully-specified idea. The default model always thinks, and its
        // thinking counts against max_tokens, so leave room for it (as the topic mode does); the old
        // 700 + 550 per idea could cut the list off once thinking ran (integration, v10.40.0).
        max_tokens: Math.min(12000, 2500 + count * 700),
        // a low effort keeps each batch well inside Netlify's 60-second limit (the default is medium)
        output_config: { effort: 'low' },
        system: MOVES_SYSTEM,
        messages: [{ role: 'user', content: user }]
      });
      if (!res.ok) return apiError(res, data);
      if (data && data.stop_reason === 'refusal') return reply({ error: 'The AI service declined to write these ideas.' }, 502);
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
      let arr = extractArray(text);
      // a reply cut off by max_tokens still keeps its whole ideas
      if (!arr || !arr.length) arr = salvageObjects(text);
      if (!arr || !arr.length) return reply({ error: 'The AI service did not return a usable list of ideas.' }, 502);
      // v10.40 fix: an idea that quotes Scripture or Ellen White word for word is left out, as in the topic mode
      const ideas = arr.map(cleanIdea).filter(Boolean).filter(x => !quotesScripture([x.name, x.why, x.what, ...x.first, x.week1, x.watch, x.unlike].join(' \n '))).slice(0, count);
      if (!ideas.length) return reply({ error: 'The AI service returned no usable ideas.' }, 502);
      const u = data.usage || {};
      return reply({ ideas, kind, model: MODEL, fn: FN_VERSION, usage: { in: u.input_tokens || 0, out: u.output_tokens || 0 } });
    } catch (e) {
      const msg = e && e.name === 'TimeoutError'
        ? 'The AI service took too long. Try a smaller batch, or set ADVISE_MODEL to claude-sonnet-5 in Netlify for a faster model.'
        : 'Could not reach the AI service: ' + (e && e.message ? e.message : String(e));
      return reply({ error: msg }, 502);
    }
  }

  // ---------------------------------------------------------- the idea library: more on one topic
  if (payload.mode === 'topic') {
    const lang = payload.lang === 'es' ? 'es' : 'en';
    const count = Math.max(1, Math.min(MAX_IDEAS_PER_CALL, parseInt(payload.count, 10) || MAX_IDEAS_PER_CALL));
    const topic = typeof payload.topic === 'string' ? payload.topic.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) : '';
    if (topic.length < 2) return reply({ error: 'No topic was given.' }, 400);
    const theme = LIB_THEMES.has(payload.theme) ? payload.theme : null;
    const themeName = typeof payload.themeName === 'string' ? payload.themeName.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
    const tags = Array.isArray(payload.tags) ? [...new Set(payload.tags.filter(t => LIB_TAGS.has(t)))] : [];
    const avoidList = Array.isArray(payload.avoid) ? payload.avoid.filter(x => typeof x === 'string').map(x => x.replace(/\s+/g, ' ').trim().slice(0, 120)).filter(Boolean).slice(0, 300) : [];
    const avoid = new Set(avoidList.map(x => libFold(x).replace(/[^a-z0-9]+/g, ' ').trim()));
    const user = [
      'TOPIC: ' + topic + (theme ? ' (library theme: ' + (themeName || theme) + ')' : ''),
      payload.summary,
      'CENSUS TAGS THAT FIRE HERE: ' + (tags.join(', ') || '(none given)'),
      'DO NOT REPEAT ANY OF THESE, OR THIN VARIATIONS OF THEM: ' + (avoidList.join('; ') || '(none given)'),
      'Return exactly ' + count + ' ideas on this topic, written in ' + (lang === 'es' ? 'Spanish' : 'English') + '.'
    ].join('\n\n');
    try {
      const { res, data } = await callClaude(KEY, {
        model: MODEL,
        // thinking tokens count against max_tokens: room for them and six ideas
        max_tokens: Math.min(12000, 2500 + count * 900),
        // a low effort keeps six ideas well inside Netlify's 60-second limit
        output_config: { effort: 'low' },
        system: TOPIC_SYSTEM(lang),
        messages: [{ role: 'user', content: user }]
      });
      if (!res.ok) return apiError(res, data);
      if (data && data.stop_reason === 'refusal') return reply({ error: 'The AI service declined to write ideas on this topic.' }, 502);
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
      let arr = extractArray(text);
      if (!arr || !arr.length) arr = salvageObjects(text);
      if (!arr || !arr.length) return reply({ error: 'The AI service did not return a usable list of ideas.' }, 502);
      const ideas = [], reasons = [];
      for (const x of arr.slice(0, count + 4)) {
        if (ideas.length >= count) break;
        const r = libCheckIdea(x, lang, { theme, avoid });
        if (!r.idea) { reasons.push(r.why); continue; }
        const key = libFold(r.idea[lang].n).replace(/[^a-z0-9]+/g, ' ').trim();
        if (avoid.has(key)) { reasons.push('repeated'); continue; }
        avoid.add(key); ideas.push(r.idea);
      }
      const u = data.usage || {};
      if (!ideas.length) return reply({ error: 'None of the ideas passed the library\'s checks.', rejected: reasons.length, reasons: reasons.slice(0, 8), fn: FN_VERSION }, 502);
      return reply({ ideas, rejected: reasons.length, reasons: reasons.slice(0, 8), lang, theme, model: MODEL, fn: FN_VERSION, usage: { in: u.input_tokens || 0, out: u.output_tokens || 0 } });
    } catch (e) {
      const msg = e && e.name === 'TimeoutError'
        ? 'The AI service took too long. Try again, or set ADVISE_MODEL to claude-sonnet-5 in Netlify for a faster model.'
        : 'Could not reach the AI service: ' + (e && e.message ? e.message : String(e));
      return reply({ error: msg }, 502);
    }
  }

  // ---------------------------------------------------------- the prose plan
  try {
    const { res, data } = await callClaude(KEY, {
      // 600-900 words is about 1,200 tokens; the default model's thinking counts against max_tokens too,
      // so 2000 could cut the plan short. Low effort keeps it inside the 60-second limit (integration, v10.40.0).
      model: MODEL, max_tokens: 6000, output_config: { effort: 'low' }, system: SYSTEM,
      messages: [{ role: 'user', content: payload.summary }]
    });
    if (!res.ok) return apiError(res, data);
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!text) return reply({ error: 'The AI service returned an empty response.' }, 502);
    const u = data.usage || {};
    return reply({ text, model: MODEL, fn: FN_VERSION, usage: { in: u.input_tokens || 0, out: u.output_tokens || 0 } });
  } catch (e) {
    return reply({ error: 'Could not reach the AI service: ' + (e && e.message ? e.message : String(e)) }, 502);
  }
};
