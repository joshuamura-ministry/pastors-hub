// v10.53.0 · the needs list made by Claude: advise.mjs advise-2.5 modes 'needs' / 'needs-status', the background worker
// advise-needs.mjs (needs-1.0) and the daily needs-sweep.mjs (needs-sweep-1.0), against an injected in-memory Netlify Blobs store
// and a stubbed fetch. No real storage, no network, no credit spent. Design: Terrain-work/v68/DESIGN-NEEDS.md.
// The pastor (6 Oct 2026): "I want the best list ever … I really want Claude to generate the best list based on the community survey
// and wherever else … drawing from the Internet too"; agreed: every figure checked against the Census, anything that fails dropped,
// sources linked, kept per neighborhood, "Generate new community needs", never "AI" on screen. Written failing-first on v10.52.0.
import { createHash } from 'node:crypto';
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', JSON.stringify(g).slice(0, 500)); console.log('    want:', JSON.stringify(e).slice(0, 300)); fail++; } else pass++; };
const tick = () => new Promise(r => setImmediate(r));
function makeStore() {
  const m = new Map(); let n = 0;
  const s = { m,
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
  return s;
}
let S = makeStore(); globalThis.__terrainNeedsStore = S;
const KEYV = 'sk-ant-test-key-0000000000000000000000000000000000', PASSV = 'open-sesame-needs';
const sha = s => createHash('sha256').update(String(s), 'utf8').digest('hex');
let wakes = [], api = [], script = [], wakeStatus = 202;
globalThis.fetch = async (u, o) => {
  u = String(u);
  if (/\/\.netlify\/functions\/advise-needs$/.test(u)) { wakes.push({ url: u, body: JSON.parse(o.body) }); return { status: wakeStatus, ok: wakeStatus < 300, json: async () => ({}) }; }
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
  for (const k of ['ANTHROPIC_API_KEY', 'TERRAIN_AI_PASS', 'TERRAIN_REG_SECRET', 'NEEDS_DAY_MAX', 'PRICES_DAY_MAX']) delete process.env[k];
  Object.assign(process.env, env);
  return (await import(new URL('../netlify/functions/advise.mjs?v=' + (++ver), import.meta.url).href)).default;
}
const W = await import(new URL('../netlify/functions/advise-needs.mjs', import.meta.url).href);
const SW = await import(new URL('../netlify/functions/needs-sweep.mjs', import.meta.url).href);
const dev = n => ('dev' + String(n).padStart(4, '0') + 'AAAAAAAAAAAAAAAAAAAA').slice(0, 22);

// the survey's own input, as the page sends it (place names and figures only)
const FIGS = [
  { k: 'pop', label: 'Population', unit: 'n', t: 5480, w: 32000, c: 646000 },
  { k: 'poverty', label: 'People below poverty line', unit: 'p', t: 19.4, w: 9.8, c: 7.1 },
  { k: 'snap', label: 'Households receiving SNAP', unit: 'p', t: 16.8, w: 8.2, c: 6.2 },
  { k: 'noCar', label: 'Households without a vehicle', unit: 'p', t: 13.5, w: 6, c: 4.9 },
  { k: 'seniorsAlone', label: 'Households: senior living alone', unit: 'p', t: 9.4, w: 10.2, c: 11.8 },
  { k: 'medInc', label: 'Median household income', unit: '$', t: 52000, w: 81000, c: 98000 },
  { k: 'kidsShare', label: 'Children, share of residents', unit: 'p', t: 27.2, w: 22, c: 20.4 },
  { k: 'limEng', label: 'Limited-English households', unit: 'p', t: 11.2, w: 5, c: 3.1 }];
const CANDS = [
  { id: 'lang-primary', cat: 'Language & newcomers', title: 'Materials and welcome in Spanish', ev: '19% speak Spanish at home, about 1,063 people; 40% of them speak English less than "very well."' },
  { id: 'poverty', cat: 'Hardship & work', title: 'Families stretched thin', ev: '19.4% of people live below the poverty line, against 7.1% in the county.' },
  { id: 'snap', cat: 'Hardship & work', title: 'Food on the table', ev: '16.8% of households receive SNAP.' },
  { id: 'nocar', cat: 'Hardship & work', title: 'Getting around without a car', ev: '13.5% of households have no vehicle.' },
  { id: 'kids', cat: 'Families with children', title: 'A neighborhood of children', ev: '27.2% of residents are children.' },
  { id: 'seniors-alone', cat: 'Seniors & isolation', title: 'Seniors living alone', ev: '9.4% of households are a senior living alone.' }];
const CATS = ['Language & newcomers', 'Hardship & work', 'Families with children', 'Seniors & isolation', 'Housing pressure'];
const THEMES = ['hunger', 'transport', 'seniors', 'children', 'immigrants', 'jobs-money'];
const BODY = (o = {}) => ({ mode: 'needs', lang: o.lang || 'en', device: o.device || dev(1), fresh: !!o.fresh,
  place: o.place || { tract: 'Census Tract 2041.02', town: 'Warminster Township', county: 'Bucks County', state: 'PA' },
  figs: o.figs || FIGS, langs: [{ name: 'Spanish', share: 19.4, count: 1063 }], origins: [{ name: 'Mexico', share: 35.6 }],
  cands: o.cands || CANDS, cats: o.cats || CATS, themes: o.themes || THEMES, ...(o.extra || {}) });
const req = (fn, body, h = {}) => quiet(() => fn(new Request('https://pastorshub.org/.netlify/functions/advise', { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(body) }), { ip: h['x-ip'] || '198.51.100.9' }));
const ask = (fn, o = {}) => req(fn, BODY(o), { 'x-terrain-pass': o.pass === undefined ? PASSV : o.pass, ...(o.reg ? { 'x-terrain-reg': o.reg } : {}), ...(o.ip ? { 'x-ip': o.ip } : {}) });
const J = async r => ({ status: r.status, ...(await r.json()) });

console.log('-- GET says whether the needs list is on: a key AND a passphrase --');
{ let fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV });
  let g = await (await fn(new Request('https://x/a', { method: 'GET' }))).json();
  // v10.55.0 (stale, not a regression): the work for each need (ideas / ideas-status / ideas-pick) makes it advise-2.6
  c('advise-2.6, needs true, needsFn needs-1.0', [g.fn, g.needs, g.needsFn], ['advise-2.6', true, 'needs-1.0']);
  fn = await advise({ ANTHROPIC_API_KEY: KEYV }); g = await (await fn(new Request('https://x/a', { method: 'GET' }))).json();
  c('a key but no passphrase: needs false', g.needs, false);
  fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV, NEEDS_DAY_MAX: '0' }); g = await (await fn(new Request('https://x/a', { method: 'GET' }))).json();
  c('NEEDS_DAY_MAX=0 turns it off', g.needs, false); }

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

console.log('\n-- the input: place names and figures only, checked field by field --');
{ const fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV });
  const bad = async o => (await J(await ask(fn, o))).field;
  c('a state that is not a US state', await bad({ place: { tract: 'Census Tract 1', town: 'Warminster', county: 'Bucks County', state: 'ZZ' } }), 'place.state');
  c('markup in a place name', await bad({ place: { tract: '<b>Tract</b>', town: 'Warminster', county: 'Bucks County', state: 'PA' } }), 'place.tract');
  c('a figure key with markup', await bad({ figs: [...FIGS.slice(1), { k: '<x>', label: 'x', unit: 'p', t: 1, w: 1, c: 1 }] }), 'figs.k');
  c('a figure of an unknown unit', await bad({ figs: [...FIGS.slice(1), { k: 'zz', label: 'Zed', unit: 'kg', t: 1, w: 1, c: 1 }] }), 'figs.unit');
  c('a figure value in words', await bad({ figs: [...FIGS.slice(1), { k: 'zz', label: 'Zed', unit: 'p', t: 'lots', w: 1, c: 1 }] }), 'figs.value');
  c('a need id in capitals', await bad({ cands: [...CANDS, { id: 'BAD', cat: CATS[0], title: 'Bad id', ev: '' }] }), 'cands.id');
  c('a need of a category not listed', await bad({ cands: [...CANDS, { id: 'zz', cat: 'Elsewhere', title: 'Zed', ev: '' }] }), 'cands.cat');
  c('a theme id of the wrong shape', await bad({ themes: ['Hunger Relief!'] }), 'themes');
  c('nothing stored, nothing woken, nothing spent', [S.keys(), wakes.length, api.length], [[], 0, 0]); }

console.log('\n-- 202: the job, kept as hashes; the worker woken once; no church, no pastor in it --');
S = makeStore(); globalThis.__terrainNeedsStore = S; wakes = []; api = [];
let JOB = null, KEY1 = null, REC = null;
{ const fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV });
  const r = await J(await ask(fn, { device: dev(10), ip: '203.0.113.7', extra: { church: 'Bucks County SDA', pastor: 'Joshua Mura', address: '10 Greene Rd' } }));
  c('202 {ok, fn, job, key, poll}', [r.status, r.ok, r.fn, /^[A-Za-z0-9_-]{22}$/.test(r.job), /^[A-Za-z0-9_-]{43}$/.test(r.key), r.poll], [202, true, 'advise-2.6', true, true, 4000]);
  JOB = r.job; KEY1 = r.key; REC = S.peek('j/' + r.job);
  c('the record: queued, the key and the worker token as SHA-256 only, kept by its place', [REC.status, REC.keyHash === sha(r.key), /^[0-9a-f]{64}$/.test(REC.workerHash), /^n\/[0-9a-f]{32}\/en$/.test(REC.cacheKey)], ['queued', true, true, true]);
  const txt = JSON.stringify(REC);
  c('…nothing of the church, the pastor, the device or the address in it', ['Bucks County SDA', 'Joshua Mura', '10 Greene Rd', dev(10), '203.0.113.7'].map(w => txt.includes(w)), [false, false, false, false, false]);
  c('…its input is the cleaned fields only', Object.keys(REC.input).sort(), ['cands', 'cats', 'figs', 'lang', 'langs', 'origins', 'place', 'themes']);
  c('the worker was woken once with a token that matches', [wakes.length, wakes[0].url, sha(wakes[0].body.worker) === REC.workerHash], [1, 'https://pastorshub.org/.netlify/functions/advise-needs', true]);
  c('what goes to the model names no church and no person', /Bucks County SDA|Joshua Mura|Greene Rd/.test(W.NEEDS_USER(REC.input)), false);
  c('…it names the place and the figures', [/Warminster Township/.test(W.NEEDS_USER(REC.input)), /poverty · People below poverty line \(%\) · 19\.4% · 9\.8% · 7\.1%/.test(W.NEEDS_USER(REC.input))], [true, true]); }

console.log('\n-- the study: every number checked against the Census, every link the search\'s own, never "AI" --');
const SR = (url, title) => ({ type: 'web_search_result', url, title, encrypted_content: 'x' });
const RESULTS = { type: 'web_search_tool_result', tool_use_id: 'srv1', content: [SR('https://www.buckscounty.gov/news/food-help?utm_source=x', 'Food help'), SR('https://www.example-sda.org/community-meal', 'Community meal'),
  SR('https://www.warminstertownship.org/transit', 'Transit')] };
const N = (o) => ({ id: 'poverty', title: 'Families stretched thin', cat: 'Hardship & work', why: 'Around the church 19.4% of people live below the poverty line, against 7.1% in the county.',
  figures: [{ key: 'poverty', place: 'tract' }, { key: 'poverty', place: 'county' }], plant: 'A monthly grocery table where neighbors pick what they need.', local: [], churches: [], themes: [], ...o });
const RECORD = { needs: [
  N({ id: 'lang-primary', cat: 'Language & newcomers', title: 'A welcome in Spanish', why: 'About 1,063 people around the church speak Spanish at home, 19% of residents.', figures: [{ key: 'limEng', place: 'tract' }],
    local: [{ text: 'Bucks County opened two new food help sites this fall, with Spanish speakers on hand.', url: 'https://www.buckscounty.gov/news/food-help' }],
    churches: [{ text: 'A church nearby runs a weekly community meal with an English class after it.', url: 'https://www.example-sda.org/community-meal' },
      { text: 'A church posted about it on a social site.', url: 'https://www.facebook.com/somechurch/posts/1' },
      { text: 'A church whose page the search never returned.', url: 'https://made-up-church.org/story' }] }),
  N({}),
  N({ id: 'snap', title: 'Food on the table', why: 'About 37% of households here go hungry each month.', figures: [{ key: 'snap', place: 'tract' }] }),
  N({ id: 'nocar', title: 'AI rides for neighbors', why: '13.5% of households have no car, nearly 3 times the county.', figures: [{ key: 'noCar', place: 'tract' }],
    local: [{ text: 'The township runs a shared ride for seniors on weekdays.', url: 'https://www.warminstertownship.org/transit?utm_campaign=y' }] }),
  N({ id: 'poverty', title: 'A repeat of the same need' }),
  N({ id: 'new', title: 'Neighbors with no car to the doctor', cat: 'Hardship & work', why: 'Around the church 13.5% of households have no vehicle, against 4.9% in the county.', figures: [{ key: 'noCar', place: 'tract' }], themes: ['transport', 'not-a-theme'] }),
  N({ id: 'new', title: 'A made-up need', cat: 'Hardship & work', why: 'Half of the neighbors, 52.5%, work night shifts.', figures: [{ key: 'pop', place: 'tract' }], themes: ['jobs-money'] }),
  N({ id: 'kids', cat: 'Families with children', title: 'A neighborhood of children', why: 'More than 1 in 4 residents around the church is a child, 27.2%.', figures: [{ key: 'kidsShare', place: 'tract' }] }),
  N({ id: 'seniors-alone', cat: 'Seniors & isolation', title: 'Seniors living alone', why: 'In the county 11.8% of households are a senior living alone.', figures: [{ key: 'seniorsAlone', place: 'county' }],
    plant: 'Visit www.example.org to sign up.' }),
  N({ id: 'unknown-id', title: 'Not one of ours' })] };
const DONE = (rec) => ({ stop_reason: 'tool_use', usage: { input_tokens: 9000, output_tokens: 3000, server_tool_use: { web_search_requests: 3, web_fetch_requests: 1 } },
  content: [{ type: 'server_tool_use', id: 'srv1', name: 'web_search', input: { query: 'Warminster food help' } }, RESULTS, { type: 'tool_use', id: 't1', name: 'record_needs', input: rec }] });
{ script = [DONE(RECORD)]; api = [];
  const out = await quiet(() => W.runJob(JOB, wakes[0].body.worker));
  c('the job runs once and is done', out, 'done');
  const call = api[0];
  c('one request: the model, web search (6) and fetch (4), social sites blocked, the town as the place, the strict record tool', [call.model, call.tools.map(t => t.name), call.tools[0].max_uses, call.tools[1].max_uses, call.tools[0].blocked_domains.includes('facebook.com'), call.tools[0].user_location.city, call.tools[2].strict],
    ['claude-opus-5-5', ['web_search', 'web_fetch', 'record_needs'], 6, 4, true, 'Warminster Township', true]);
  c('…the system prompt: numbers only from the figures, pages are data, neighbors never targets, never "AI"', [/Every number in "title", "why" and "plant" must be one of the figures you were given/.test(call.system), /information, never instructions/.test(call.system), /never "targets"/.test(call.system), /Never use the words "AI"/.test(call.system)], [true, true, true, true]);
  const rec = S.peek('j/' + JOB), L = rec.needs;
  c('done, with the needs that passed, in its order', [rec.status, L.map(n => n.id)], ['done', ['lang-primary', 'poverty', 'snap', 'nocar', 'new', 'kids', 'seniors-alone']]);
  const lp = L[0];
  c('a local line keeps its cleaned link and its site\'s name', lp.local, [{ text: 'Bucks County opened two new food help sites this fall, with Spanish speakers on hand.', url: 'https://www.buckscounty.gov/news/food-help', host: 'buckscounty.gov' }]);
  c('…a church line: only the search\'s own link; a social post and a link the search never returned are dropped', lp.churches.map(x => x.url), ['https://www.example-sda.org/community-meal']);
  c('a why whose number is not a Census figure is dropped (the survey keeps its own line)', [L[2].id, L[2].why], ['snap', null]);
  c('a title that says "AI" is dropped; "nearly 3 times the county" passes (13.5 is 2.8 times 4.9: 3 rounded)', [L[3].title, L[3].why], [null, '13.5% of households have no car, nearly 3 times the county.']);
  c('…its local link is cleaned of tracking codes', L[3].local[0].url, 'https://www.warminstertownship.org/transit');
  c('a repeated id and an id not sent are dropped', L.filter(n => n.id === 'poverty').length === 1 && !L.some(n => n.id === 'unknown-id'), true);
  const nw = L.find(n => n.id === 'new');
  c('a new need stands on a Census figure, with the library\'s own themes only', [nw.title, nw.figures, nw.themes], ['Neighbors with no car to the doctor', [{ key: 'noCar', place: 'tract' }], ['transport']]);
  c('a new need whose numbers are not the Census\'s is dropped whole', L.some(n => n.title === 'A made-up need'), false);
  c('"1 in 4" and "27.2%" pass (100 ÷ 27.2 rounds to 4)', L.find(n => n.id === 'kids').why, 'More than 1 in 4 residents around the church is a child, 27.2%.');
  c('a plant line with a web address is dropped', L.find(n => n.id === 'seniors-alone').plant, null);
  const cache = S.peek(REC.cacheKey);
  c('the neighborhood\'s list is kept (60 days) with the day it was made', [cache.v, cache.needs.length, /^\d{4}-\d{2}-\d{2}$/.test(cache.made), typeof cache.at], [1, 7, true, 'number']);
  const st = await J(await req(await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV }), { mode: 'needs-status', job: JOB, key: KEY1 }));
  c('needs-status gives the list', [st.status, st.needs.length, st.made === cache.made], ['done', 7, true]);
  c('the log lines carry codes and counts only (no town, no figure, no words)', logs.some(l => /Warminster|Bucks|19\.4|Spanish|grocery/.test(l)), false);
  c('a second wake does nothing (the job is no longer queued)', await quiet(() => W.runJob(JOB, wakes[0].body.worker)), 'skip'); }

console.log('\n-- the kept list: given again at no cost; "Generate new" makes a new one --');
{ const fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV });
  wakes = []; const before = S.keys('c/');
  const r = await J(await ask(fn, { device: dev(11) }));
  c('the same place: 200 cached, the list, nobody woken, no count spent', [r.status, r.cached, r.needs.length, wakes.length, JSON.stringify(S.keys('c/')) === JSON.stringify(before)], [200, true, 7, 0, true]);
  const other = await J(await ask(fn, { device: dev(11), figs: FIGS.map(f => f.k === 'snap' ? { ...f, t: 61.5 } : f) }));
  c('…the same place with other figures is not given that list (no list left by other numbers): a study', other.status, 202);
  const es = await J(await ask(fn, { device: dev(11), lang: 'es' }));
  c('…another language is its own list (a study)', es.status, 202);
  const f = await J(await ask(fn, { device: dev(11), fresh: true }));
  c('fresh: a new study even with a kept list', [f.status, S.peek('j/' + f.job).fresh], [202, true]); }

console.log('\n-- the limits, counted before anything is spent; a failure gives the device\'s back --');
S = makeStore(); globalThis.__terrainNeedsStore = S; wakes = [];
{ const fn = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV });
  const codes = [];
  for (let i = 0; i < 7; i++) codes.push((await J(await ask(fn, { device: dev(20), fresh: true, ip: '192.0.2.' + i }))).status);
  c('six studies a device a day, the seventh refused (429)', codes, [202, 202, 202, 202, 202, 202, 429]);
  const fn2 = await advise({ ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_PASS: PASSV, NEEDS_DAY_MAX: '2' });
  S = makeStore(); globalThis.__terrainNeedsStore = S;
  const site = [];
  for (let i = 0; i < 3; i++) site.push((await J(await ask(fn2, { device: dev(30 + i), fresh: true, ip: '192.0.2.' + (50 + i) }))).code || 'ok');
  c('NEEDS_DAY_MAX for the whole site', site, ['ok', 'ok', 'limit-site']);
  S = makeStore(); globalThis.__terrainNeedsStore = S; wakes = [];
  const r = await J(await ask(fn, { device: dev(40), fresh: true }));
  script = [{ status: 500 }];
  const devKey = S.peek('j/' + r.job).counts.dev;
  c('…the device counted one', S.peek(devKey).n, 1);
  c('a study that fails: failed, its device count given back', [await quiet(() => W.runJob(r.job, wakes[0].body.worker)), S.peek('j/' + r.job).code, S.peek(devKey).n], ['failed', 'unavailable', 0]);
  const st = await J(await req(fn, { mode: 'needs-status', job: r.job, key: 'A'.repeat(43) }));
  c('needs-status with the wrong key: 403', st.status, 403); }

console.log('\n-- the number check, on its own --');
{ const input = { figs: FIGS, langs: [{ name: 'Spanish', share: 19.4, count: 1063 }], origins: [], cands: CANDS };
  const pool = W.numberPool(input);
  const ok = t => W.numbersOk(t, pool);
  c('as given, rounded, "1 in N", a ratio to the county, a year, a small count', [ok('19.4%'), ok('19%'), ok('about 1 in 5'), ok('2.7 times the county'), ok('since 2020'), ok('two or 3 volunteers'), ok('$52,000'), ok('about 5,500 people')], [true, true, true, true, true, true, true, true]);
  c('a number from nowhere fails', [ok('37% go hungry'), ok('4,200 families'), ok('$61,000')], [false, false, false]);
  c('…and so does a figure written to many decimals (it is never said so)', ok('5.999250093738283% have no car'), false); }

console.log('\n-- the sweep --');
{ const St = makeStore(), now = Date.parse('2026-12-10T12:00:00Z');
  St.poke('n/' + 'a'.repeat(32) + '/en', { v: 1, at: now - 61 * 864e5, needs: [] });
  St.poke('n/' + 'b'.repeat(32) + '/es', { v: 1, at: now - 5 * 864e5, needs: [] });
  St.poke('j/' + 'A'.repeat(22), { created: now - 8 * 864e5 });
  St.poke('c/dev/2026-12-01/' + 'f'.repeat(16), { n: 1 });
  const r = await SW.sweep(St, now, now);
  c('a list after 60 days, a job after 7, a counter after 2 days go; a fresh list stays', [r.lists, r.jobs, r.counters, St.keys()], [1, 1, 1, ['n/' + 'b'.repeat(32) + '/es']]); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
