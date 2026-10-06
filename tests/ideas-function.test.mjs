// v10.55.0 · the work for each need, made by Claude: advise.mjs advise-2.6 modes 'ideas' / 'ideas-status' / 'ideas-pick', the background
// worker advise-ideas.mjs (ideas-1.0) and the daily needs-sweep.mjs (needs-sweep-1.1), against an injected in-memory Netlify Blobs store and
// a stubbed fetch. No real storage, no network, no credit spent. Design: Terrain-work/v72/DESIGN-IDEAS.md.
// The pastor (6 Oct 2026): "if Claude is generating the community needs then it also needs to generate the work to meet those needs …
// current fresh ideas things that are actually working … in line with our denomination seventh day Adventists, but … out of the box", and
// "the great ideas … selected we should consider … to put them in the library … that way it doesn't have to generate them all the time".
// Written failing-first on v10.54.2.
import { createHash } from 'node:crypto';
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 600)); console.log('    want:', JSON.stringify(e).slice(0, 300)); fail++; } else pass++; };
const tick = () => new Promise(r => setImmediate(r));
function makeStore() {
  const m = new Map(); let n = 0;
  return { m,
    async get(k) { await tick(); const v = m.get(k); return v === undefined ? null : JSON.parse(v.data); },
    async getWithMetadata(k) { await tick(); const v = m.get(k); return v ? { data: JSON.parse(v.data), etag: v.etag, metadata: {} } : null; },
    async setJSON(k, val, o = {}) { await tick(); const cur = m.get(k);
      if (o.onlyIfNew && cur) return { modified: false };
      if (o.onlyIfMatch && (!cur || cur.etag !== o.onlyIfMatch)) return { modified: false };
      const etag = 'e' + (++n); m.set(k, { data: JSON.stringify(val), etag }); return { modified: true, etag }; },
    async delete(k) { await tick(); m.delete(k); },
    async list({ prefix = '' } = {}) { await tick(); return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }; },
    peek(k) { const v = m.get(k); return v ? JSON.parse(v.data) : null; },
    poke(k, val) { m.set(k, { data: JSON.stringify(val), etag: 'e' + (++n) }); },
    keys(p = '') { return [...m.keys()].filter(k => k.startsWith(p)).sort(); } };
}
let S = makeStore(); globalThis.__terrainIdeasStore = S;
const KEYV = 'sk-ant-test-key-0000000000000000000000000000000000', PASSV = 'open-sesame-ideas';
const sha = s => createHash('sha256').update(String(s), 'utf8').digest('hex');
let wakes = [], api = [], script = [];
globalThis.fetch = async (u, o) => {
  u = String(u);
  if (/\/\.netlify\/functions\/advise-ideas$/.test(u)) { wakes.push({ url: u, body: JSON.parse(o.body) }); return { status: 202, ok: true, json: async () => ({}) }; }
  if (/api\.anthropic\.com/.test(u)) {
    const body = JSON.parse(o.body); api.push(body);
    let next = script.shift();
    if (typeof next === 'function') next = next(body);
    if (!next) return { ok: false, status: 500, json: async () => ({ error: { message: 'no script' } }) };
    if (next.status && next.status !== 200) return { ok: false, status: next.status, json: async () => next.data || { error: { message: 'boom' } } };
    return { ok: true, status: 200, json: async () => next };
  }
  throw new Error('unexpected fetch ' + u);
};
const logs = [];
const REAL = { log: console.log, error: console.error, warn: console.warn };
const cap = (...a) => logs.push(a.map(String).join(' '));
const quiet = async f => { console.log = cap; console.error = cap; console.warn = cap; try { return await f(); } finally { Object.assign(console, REAL); } };
let ver = 0;
async function advise(env) {
  for (const k of ['ANTHROPIC_API_KEY', 'TERRAIN_AI_PASS', 'TERRAIN_REG_SECRET', 'IDEAS_DAY_MAX', 'NEEDS_DAY_MAX', 'PRICES_DAY_MAX']) delete process.env[k];
  Object.assign(process.env, env);
  return (await import(new URL('../netlify/functions/advise.mjs?v=' + (++ver), import.meta.url).href)).default;
}
const W = await import(new URL('../netlify/functions/advise-ideas.mjs', import.meta.url).href);
const SW = await import(new URL('../netlify/functions/needs-sweep.mjs', import.meta.url).href);
const dev = n => ('dev' + String(n).padStart(4, '0') + 'AAAAAAAAAAAAAAAAAAAA').slice(0, 22);

const FIGS = [
  { k: 'pop', label: 'Population', unit: 'n', t: 5480, w: 32000, c: 646000 },
  { k: 'poverty', label: 'People below poverty line', unit: 'p', t: 19.4, w: 9.8, c: 7.1 },
  { k: 'snap', label: 'Households receiving SNAP', unit: 'p', t: 16.8, w: 8.2, c: 6.2 },
  { k: 'noCar', label: 'Households without a vehicle', unit: 'p', t: 13.5, w: 6, c: 4.9 },
  { k: 'medInc', label: 'Median household income', unit: '$', t: 52000, w: 81000, c: 98000 }];
const NEED = { id: 'snap', title: 'Food on the table', cat: 'Hardship & work', why: 'Around the church 16.8% of households receive SNAP, against 6.2% in the county.', themes: ['hunger'] };
const HAVE = [{ id: 'hunger-little-free-pantry', name: 'A little free pantry on the corner', lift: 1 }, { id: 'hunger-grocery-runs', name: 'Grocery runs for neighbors without a car', lift: 2 },
  { id: 'food-pantry', name: 'Food pantry', lift: 3 }];
const BODY = (o = {}) => ({ mode: 'ideas', lang: o.lang || 'en', device: o.device || dev(1), fresh: !!o.fresh,
  place: { tract: 'Census Tract 2041.02', town: 'Warminster Township', county: 'Bucks County', state: 'PA' },
  figs: o.figs || FIGS, langs: [{ name: 'Spanish', share: 19.4, count: 1063 }], origins: [{ name: 'Mexico', share: 35.6 }],
  need: o.need || NEED, tags: o.tags || ['snap', 'poor', 'no-car'], have: o.have || HAVE, ...(o.extra || {}) });
const req = (fn, body, h = {}) => quiet(() => fn(new Request('https://pastorshub.org/.netlify/functions/advise', { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(body) }), { ip: h['x-ip'] || '198.51.100.9' }));
const ask = (fn, o = {}) => req(fn, BODY(o), { 'x-terrain-pass': o.pass === undefined ? PASSV : o.pass, ...(o.ip ? { 'x-ip': o.ip } : {}) });
const J = async r => ({ status: r.status, ...(await r.json()) });

// ideas as the model would record them; numbers that fit each size
const NUMS = { 1: { ppl: 2, leaders: 0, hrs: 3, cost: 40, costMo: 0, partner: '' }, 2: { ppl: 6, leaders: 1, hrs: 12, cost: 400, costMo: 60, partner: '' },
  3: { ppl: 12, leaders: 2, hrs: 30, cost: 2000, costMo: 300, partner: 'the county food bank' } };
// v10.55.0: six a size (the pastor: "there should probably be a few more ideas")
const NAMES = { 1: ['Grocery list cards at the laundromat', 'A text line for a ride to the store', 'Recipe cards for the food bank line', 'A shelf swap at the library', 'A bus-stop sign for free meals', 'A neighbor note on the community board'],
  2: ['Saturday night soup supper', 'A cooking class on a SNAP budget', 'Market vouchers matched by members', 'Rides to the county food bank', 'A seed and seedling giveaway', 'A Sunday pancake breakfast for neighbors'],
  3: ['A mobile pantry stop with the food bank', 'A community garden with the township', 'A teaching kitchen night each month', 'Summer lunches with the library', 'A weekday food rescue route', 'A pantry with a health screening corner'] };
const IDEA = (t, i, o = {}) => { const name = NAMES[t][i];
  return { tier: t, k: ['serve', 'equip', 'belong', 'invite'][i % 4], ages: 'adults', where: 'community', sabbath: false, minors: false, cad: 'ongoing', sessions: 0,
    need: ['snap', 'poor'], ...NUMS[t], skill: [], fac: [], name,
    d: `${name} meets neighbors where they already shop and wait for the bus. Two members keep it going each week and answer every text within a day, with no strings attached.`,
    how: [`Ask the manager for permission to start ${name.toLowerCase()} near the door.`, 'Print 200 cards with the church text line and a note that every reply stays private.',
      'Choose two members who answer every text within a day, by first name only.', 'Review what worked each month and share the counts with the church board.'],
    why: 'Around the church 16.8% of households receive SNAP, against 6.2% in the county.', seen: [], ...o }; };
const SR = url => ({ type: 'web_search_result', url, title: 'x', encrypted_content: 'x' });
const RESULTS = { type: 'web_search_tool_result', tool_use_id: 'srv1', content: [SR('https://www.example-sda.org/soup-supper?utm_source=x'), SR('https://www.foodbank.example.org/mobile')] };
const DONE = rec => ({ stop_reason: 'tool_use', usage: { input_tokens: 9000, output_tokens: 5000, server_tool_use: { web_search_requests: 3, web_fetch_requests: 1 } },
  content: [{ type: 'server_tool_use', id: 'srv1', name: 'web_search', input: { query: 'church soup supper SNAP' } }, RESULTS, { type: 'tool_use', id: 't1', name: 'record_ideas', input: rec }] });

console.log('-- GET says whether the ideas are on: a key AND a passphrase --');
{ let fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV });
  let g = await (await fn(new Request('https://x/a', { method: 'GET' }))).json();
  c('advise-2.6, ideas true, ideasFn ideas-1.0 (the needs list still on)', [g.fn, g.ideas, g.ideasFn, g.needs], ['advise-2.6', true, 'ideas-1.0', true]);
  fn = await advise({ ANTHROPIC_API_KEY: KEYV }); g = await (await fn(new Request('https://x/a', { method: 'GET' }))).json();
  c('a key but no passphrase: ideas false', g.ideas, false);
  fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV, IDEAS_DAY_MAX: '0' }); g = await (await fn(new Request('https://x/a', { method: 'GET' }))).json();
  c('IDEAS_DAY_MAX=0 turns them off', g.ideas, false); }

console.log('\n-- the lock, before anything is read or spent --');
{ let fn = await advise({ TERRAIN_AI_PASS: PASSV });
  c('no key: 503 nokey', await J(await ask(fn)), { status: 503, ok: false, code: 'nokey' });
  fn = await advise({ ANTHROPIC_API_KEY: KEYV });
  c('no passphrase set: 403 disabled', await J(await ask(fn, { pass: '' })), { status: 403, ok: false, code: 'disabled' });
  fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV });
  c('wrong passphrase: 401 locked', await J(await ask(fn, { pass: 'nope' })), { status: 401, ok: false, code: 'locked' });
  fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV, TERRAIN_REG_SECRET: 'x'.repeat(40) });
  c('registration on, no token: 401 noreg', await J(await ask(fn)), { status: 401, ok: false, code: 'noreg' });
  c('nothing stored, nobody woken, nothing spent', [S.keys(), wakes.length, api.length], [[], 0, 0]); }

console.log('\n-- the input: the place, its figures, the need, the library\'s names, checked field by field --');
{ const fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV });
  const bad = async o => (await J(await ask(fn, o))).field;
  c('a need id in capitals', await bad({ need: { ...NEED, id: 'BAD' } }), 'need.id');
  c('markup in the need\'s title', await bad({ need: { ...NEED, title: '<b>Food</b>' } }), 'need.title');
  c('a theme that is not the library\'s', await bad({ need: { ...NEED, themes: ['made-up'] } }), 'need.themes');
  c('tags that are not a list', await bad({ tags: 'snap' }), 'tags');
  c('a library id of the wrong shape', await bad({ have: [{ id: 'Bad Id!', name: 'x x x', lift: 1 }] }), 'have.id');
  c('a lift that is not 1-3', await bad({ have: [{ id: 'hunger-x', name: 'An idea', lift: 4 }] }), 'have.lift');
  c('the needs list\'s own checks still hold (a state that is not one)', (await J(await req(fn, { ...BODY(), place: { tract: 'Census Tract 1', town: 'Warminster', county: 'Bucks County', state: 'ZZ' } }, { 'x-terrain-pass': PASSV }))).field, 'place.state');
  c('nothing stored, nothing woken, nothing spent', [S.keys(), wakes.length, api.length], [[], 0, 0]); }

console.log('\n-- 202: the job, kept as hashes; the worker woken; no church, no pastor in it --');
let JOB = null, KEY1 = null, REC = null;
{ const fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV });
  const r = await J(await ask(fn, { device: dev(10), ip: '203.0.113.7', tags: ['snap', 'poor', 'not-a-tag', 'no-car'], extra: { church: 'Bucks County SDA', pastor: 'Joshua Mura', address: '10 Greene Rd' } }));
  c('202 {ok, fn, job, key, poll}', [r.status, r.ok, r.fn, /^[A-Za-z0-9_-]{22}$/.test(r.job), /^[A-Za-z0-9_-]{43}$/.test(r.key), r.poll], [202, true, 'advise-2.6', true, true, 4000]);
  JOB = r.job; KEY1 = r.key; REC = S.peek('j/' + r.job);
  c('the record: queued, hashes only, kept by its place, need and figures', [REC.status, REC.keyHash === sha(r.key), /^i\/[0-9a-f]{32}\/en$/.test(REC.cacheKey)], ['queued', true, true]);
  const txt = JSON.stringify(REC);
  c('…nothing of the church, the pastor, the device or the address in it', ['Bucks County SDA', 'Joshua Mura', '10 Greene Rd', dev(10), '203.0.113.7'].map(w => txt.includes(w)), [false, false, false, false, false]);
  c('…its input is the cleaned fields only', Object.keys(REC.input).sort(), ['figs', 'have', 'lang', 'langs', 'need', 'origins', 'place', 'tags']);
  c('…only the library\'s census tags are kept (the page sends its whole profile)', REC.input.tags, ['snap', 'poor', 'no-car']);
  c('the worker was woken once, at advise-ideas', [wakes.length, wakes[0].url, sha(wakes[0].body.worker) === REC.workerHash], [1, 'https://pastorshub.org/.netlify/functions/advise-ideas', true]);
  const U = W.IDEAS_USER(REC.input, ['Picked: a soup night']);
  c('what goes to the model: the place, the need, the library\'s ideas by id, the picked names; never the church', [/Warminster Township/.test(U), /Food on the table · category: Hardship & work/.test(U),
    /hunger-little-free-pantry · size 1 · A little free pantry on the corner/.test(U), /DO NOT REPEAT .*Picked: a soup night/.test(U), /Bucks County SDA|Joshua Mura|Greene Rd/.test(U)], [true, true, true, true, false]); }

console.log('\n-- the study: the library\'s checks on every idea, numbers from the Census, links the search\'s own, four to a size --');
const RECORD = { keep: ['hunger-little-free-pantry', 'not-a-library-id'], ideas: [
  IDEA(1, 0), IDEA(1, 1), IDEA(1, 2, { why: 'About 37% of households here go hungry each month.' }), IDEA(1, 3), IDEA(1, 4), IDEA(1, 5),
  IDEA(2, 0, { cad: 'series', sessions: 6, seen: [{ text: 'A church in Ohio runs a Saturday night soup supper with a short class after it.', url: 'https://www.example-sda.org/soup-supper?utm_source=x' },
    { text: 'A church posted about it on a social site.', url: 'https://www.facebook.com/x/posts/1' }, { text: 'A page the search never returned.', url: 'https://made-up.example.org/x' }] }),
  IDEA(2, 1), IDEA(2, 2), IDEA(2, 3), IDEA(2, 4), IDEA(2, 5),
  IDEA(3, 0, { cad: 'event' }), IDEA(3, 1), IDEA(3, 2), IDEA(3, 3), IDEA(3, 4), IDEA(3, 5),
  IDEA(2, 0),                                                                                // a repeat of a name
  IDEA(1, 0, { name: 'AI grocery helper for neighbors' }),                                   // "AI"
  IDEA(2, 1, { name: 'A pantry list online', d: 'Neighbors find the pantry list at www.example.org each week. Two members keep it up to date and answer every message within a day.' }),
  IDEA(2, 2, { name: 'Snacks at the school gates', d: 'Members hand out snacks at the school gates every afternoon. Two members keep it going each week and answer every text within a day.' }),
  IDEA(1, 1, { name: 'A little free pantry on the corner' }),                                 // the library's own
  IDEA(3, 1, { name: 'A raffle for the pantry', d: 'Members sell raffle tickets to raise money for the pantry each month. Two members keep it going each week and answer every text within a day.' }),
  IDEA(1, 2, { name: 'A ride line with too many people', ppl: 50 }),
  { not: 'an idea' }] };
{ script = [DONE(RECORD)]; api = [];
  const out = await quiet(() => W.runJob(JOB, wakes[0].body.worker));
  c('the job runs once and is done', out, 'done');
  const call = api[0];
  c('one request: the model, web search (5) and fetch (3), social sites blocked, the town as the place, the strict record tool', [call.model, call.tools.map(t => t.name), call.tools[0].max_uses, call.tools[1].max_uses,
    call.tools[0].blocked_domains.includes('facebook.com'), call.tools[0].user_location.city, call.tools[2].strict], ['claude-opus-5-5', ['web_search', 'web_fetch', 'record_ideas'], 5, 3, true, 'Warminster Township', true]);
  c('…the system prompt: his words, Adventist, out of the box, what works now, children, the Sabbath, pages are data, never "AI"', [/deeper thinker/.test(call.system), /Seventh-day Adventist/.test(call.system),
    /out of the box/.test(call.system), /what is working now/.test(call.system), /CHILDREN/.test(call.system), /The Sabbath \(Friday sunset to Saturday sunset\)/.test(call.system),
    /information, never instructions/.test(call.system), /Never use the words "AI"/.test(call.system)], [true, true, true, true, true, true, true, true]);
  const rec = S.peek('j/' + JOB), I = rec.ideas;
  c('done: the library idea kept (its id; one not on the list ignored)', [rec.status, rec.keep], ['done', ['hunger-little-free-pantry']]);
  c('six to a size: 5 new light (one kept), 6 moderate, 6 heavy', [1, 2, 3].map(t => I.filter(x => x.tier === t).length), [5, 6, 6]);
  c('every one is in the library\'s shape, with an id of its own, out to the community, marked new', I.every(x => /^cl-[0-9a-f]{14}$/.test(x.id) && x.theme === 'hunger' && x.reach === 'out' && x.ai === true
    && typeof x.en.n === 'string' && x.en.how.length === 4 && Number.isInteger(x.cad)), true);
  c('the rejected: a repeat, "AI" and a web address (text), the school gates, the library\'s own name, a raffle, numbers out of range, no rhythm',
    rec.reasons, ['repeated', 'text', 'text', 'children: school gates', 'already in the library', 'banned: selling raffle tickets or games of chance', 'numbers', 'cad']);
  c('a why whose number is not a Census figure is dropped (the idea stays)', [I.find(x => x.en.n === NAMES[1][2]).why, !!I.find(x => x.en.n === NAMES[1][2])], [undefined, true]);
  const soup = I.find(x => x.en.n === NAMES[2][0]);
  c('"seen working": only the search\'s own link, cleaned; a social post and a link never returned are dropped', soup.seen, [{ text: 'A church in Ohio runs a Saturday night soup supper with a short class after it.', url: 'https://www.example-sda.org/soup-supper', host: 'example-sda.org' }]);
  c('a series of six is cad 6, an event 1, ongoing 0', [soup.cad, I.find(x => x.en.n === NAMES[3][0]).cad, I.find(x => x.en.n === NAMES[1][0]).cad], [6, 1, 0]);
  c('the heavy ideas keep their partner', I.filter(x => x.tier === 3).every(x => x.partner && x.partner.en === 'the county food bank'), true);
  const cache = S.peek(REC.cacheKey);
  c('the set is kept (60 days) with the need and the town', [cache.v, cache.ideas.length, cache.keep, cache.need, cache.town], [1, 17, ['hunger-little-free-pantry'], { id: 'snap', title: 'Food on the table' }, 'Warminster Township']);
  const st = await J(await req(await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV }), { mode: 'ideas-status', job: JOB, key: KEY1 }));
  c('ideas-status gives the set, what was kept and the set\'s key', [st.status, st.ideas.length, st.keep, st.set === REC.cacheKey.slice(2)], ['done', 17, ['hunger-little-free-pantry'], true]);
  c('the log lines carry codes and counts only', logs.some(l => /Warminster|Bucks|16\.8|soup|Food on the table/.test(l)), false);
  c('a second wake does nothing', await quiet(() => W.runJob(JOB, wakes[0].body.worker)), 'skip'); }

console.log('\n-- the kept set: given again at no cost; "Generate new ideas" makes a new one --');
{ const fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV });
  wakes = []; const before = S.keys('c/');
  const r = await J(await ask(fn, { device: dev(11) }));
  c('the same place and need: 200 cached, nobody woken, no count spent', [r.status, r.cached, r.ideas.length, r.keep, wakes.length, JSON.stringify(S.keys('c/')) === JSON.stringify(before)], [200, true, 17, ['hunger-little-free-pantry'], 0, true]);
  c('…another need of the same place is its own study', (await J(await ask(fn, { device: dev(11), need: { ...NEED, id: 'nocar', title: 'Getting around without a car', themes: ['transport'] } }))).status, 202);
  c('…the same need with other figures is its own study', (await J(await ask(fn, { device: dev(11), figs: FIGS.map(f => f.k === 'snap' ? { ...f, t: 61.5 } : f) }))).status, 202);
  c('…fresh: a new study even with a kept set', (await J(await ask(fn, { device: dev(11), fresh: true }))).status, 202); }

console.log('\n-- a picked idea goes to the pool, copied from the server\'s own set --');
{ const fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV });
  const set = REC.cacheKey.slice(2), soup = S.peek(REC.cacheKey).ideas.find(x => x.en.n === NAMES[2][0]);
  const pick = (o = {}) => req(fn, { mode: 'ideas-pick', device: o.device || dev(50), set: o.set === undefined ? set : o.set, id: o.id || soup.id, ...(o.extra || {}) }, { 'x-terrain-pass': o.pass === undefined ? PASSV : o.pass });
  c('locked without the passphrase', (await J(await pick({ pass: 'nope' }))).status, 401);
  const r = await J(await pick({ extra: { idea: { en: { n: 'Injected words' } } } }));
  c('picked: counted', [r.status, r.ok, r.counted], [200, true, true]);
  const p = S.peek('p/snap/' + soup.id);
  c('the pool keeps the server\'s copy (never words from the page), the need, the town, one pick', [p.idea.en.n, p.need, p.town, p.picks, JSON.stringify(p).includes('Injected')],
    [NAMES[2][0], { id: 'snap', title: 'Food on the table' }, 'Warminster Township', 1, false]);
  c('the same device again the same day: not counted twice', [(await J(await pick())).counted, S.peek('p/snap/' + soup.id).picks], [false, 1]);
  c('another device: two picks', [(await J(await pick({ device: dev(51) }))).counted, S.peek('p/snap/' + soup.id).picks], [true, 2]);
  c('an id not in the set: 404', (await J(await pick({ id: 'cl-' + '0'.repeat(14) }))).status, 404);
  c('a set of the wrong shape: 400', (await J(await pick({ set: '../j/x' }))).field, 'set');
  // the next study for this need is told the picked name, so it is never written again
  const fn2 = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV });
  wakes = []; const r2 = await J(await ask(fn2, { device: dev(12), fresh: true }));
  script = [DONE(RECORD)]; api = [];
  await quiet(() => W.runJob(r2.job, wakes[0].body.worker));
  c('the next study\'s request names the picked idea under DO NOT REPEAT', /DO NOT REPEAT \(ideas other pastors picked; names only\): Saturday night soup supper/.test(api[0].messages[0].content), true);
  c('…and a new idea with that name is refused', S.peek('j/' + r2.job).ideas.some(x => x.en.n === NAMES[2][0]), false); }

console.log('\n-- too few good ideas: no result; the device count given back --');
{ S = makeStore(); globalThis.__terrainIdeasStore = S; wakes = [];
  const fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV });
  const r = await J(await ask(fn, { device: dev(40), fresh: true }));
  script = [DONE({ keep: [], ideas: [IDEA(1, 0), IDEA(1, 1), IDEA(1, 2), IDEA(2, 0), IDEA(2, 1), IDEA(2, 2), IDEA(3, 0), IDEA(3, 1)] })];
  const devKey = S.peek('j/' + r.job).counts.dev;
  c('eight ideas (fewer than nine): failed no-result, the count given back', [await quiet(() => W.runJob(r.job, wakes[0].body.worker)), S.peek('j/' + r.job).code, S.peek(devKey).n], ['failed', 'no-result', 0]);
  const r2 = await J(await ask(fn, { device: dev(40), fresh: true }));
  script = [DONE({ keep: [], ideas: [IDEA(1, 0), IDEA(1, 1), IDEA(2, 0), IDEA(2, 1), IDEA(2, 2), IDEA(2, 3), IDEA(3, 0), IDEA(3, 1), IDEA(3, 2), IDEA(3, 3)] })];
  c('ten ideas, but a size with only two: failed (each size needs three)', [await quiet(() => W.runJob(r2.job, wakes[1].body.worker)), S.peek('j/' + r2.job).code], ['failed', 'no-result']); }

console.log('\n-- the limits --');
{ S = makeStore(); globalThis.__terrainIdeasStore = S;
  const fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV });
  const codes = [];
  for (let i = 0; i < 21; i++) codes.push((await J(await ask(fn, { device: dev(20), fresh: true, ip: '192.0.2.' + i }))).status);
  c('twenty studies a device a day, the twenty-first refused', [codes.slice(0, 20).every(s => s === 202), codes[20]], [true, 429]);
  S = makeStore(); globalThis.__terrainIdeasStore = S;
  const fn2 = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV, IDEAS_DAY_MAX: '2' });
  const site = [];
  for (let i = 0; i < 3; i++) site.push((await J(await ask(fn2, { device: dev(30 + i), fresh: true, ip: '192.0.2.' + (50 + i) }))).code || 'ok');
  c('IDEAS_DAY_MAX for the whole site', site, ['ok', 'ok', 'limit-site']); }

console.log('\n-- the sweep: sets after 60 days, picks\' counters after 2; the pool never --');
{ const St = makeStore(), now = Date.parse('2026-12-10T12:00:00Z');
  St.poke('i/' + 'a'.repeat(32) + '/en', { v: 1, at: now - 61 * 864e5, ideas: [] });
  St.poke('i/' + 'b'.repeat(32) + '/es', { v: 1, at: now - 5 * 864e5, ideas: [] });
  St.poke('c/pk1/2026-12-01/' + 'f'.repeat(16), { at: 1 });
  St.poke('c/pkd/2026-12-01/' + 'e'.repeat(16), { n: 1 });
  St.poke('p/snap/cl-' + '1'.repeat(14), { v: 1, first: now - 400 * 864e5, picks: 3 });
  const r = await SW.sweep(St, now, now);
  c('a set after 60 days and the picks\' counters go; a fresh set and the pool stay', [r.lists, r.counters, St.keys()], [1, 2, ['i/' + 'b'.repeat(32) + '/es', 'p/snap/cl-' + '1'.repeat(14)]]); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
