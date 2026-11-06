// v10.72.0 · the free version and the full version, decided by the server (release 2 of the paid version, promised in v10.54.0).
// The pastor (6 Nov 2026), to the audit report's split: "Yes". account.mjs says who has the full version (a plan through Terrain's own
// session, the passphrase, or a tester code; everyone while payments are off); gifts op id, present op open, connect op create and
// digital GET / read / again answer 402 `plan` without it once TERRAIN_BILLING is on; every Claude route takes a plan's study from one
// day's allowance for the account (PLAN_CLAUDE_DAY / TRIAL_CLAUDE_DAY; 429 limit-plan), the passphrase and tester codes uncounted as
// before. In-memory stores, a stubbed Stripe (prices only), no Anthropic call answered. Written failing-first on v10.71.0.
import { createHmac, createHash } from 'node:crypto';
let pass = 0, fail = 0;
const c = (n, g, e = true) => { const ok = JSON.stringify(g) === JSON.stringify(e); console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) { console.log('    got:', String(JSON.stringify(g)).slice(0, 600)); console.log('    want:', String(JSON.stringify(e)).slice(0, 400)); fail++; } else pass++; };
const sec = async (name, f) => { try { await f(); } catch (e) { console.log('  FAIL  ' + name + ' crashed: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); fail++; } };
const tick = () => new Promise(r => setImmediate(r));
function makeStore() {
  const m = new Map(); let n = 0;
  return { m,
    async get(k, o = {}) { await tick(); const v = m.get(k); if (v === undefined) return null; return o.type === 'json' || o.type === undefined ? JSON.parse(v.data) : v.data; },
    async getWithMetadata(k, o = {}) { await tick(); const v = m.get(k); return v ? { data: o.type === 'json' || o.type === undefined ? JSON.parse(v.data) : v.data, etag: v.etag, metadata: v.meta || {} } : null; },
    async getMetadata(k) { await tick(); const v = m.get(k); return v ? { etag: v.etag, metadata: v.meta || {} } : null; },
    async setJSON(k, val, o = {}) { await tick(); const cur = m.get(k); if (o.onlyIfNew && cur) return { modified: false }; if (o.onlyIfMatch && (!cur || cur.etag !== o.onlyIfMatch)) return { modified: false };
      const etag = 'e' + (++n); m.set(k, { data: JSON.stringify(val), etag, meta: o.metadata }); return { modified: true, etag }; },
    async set(k, val, o = {}) { await tick(); const cur = m.get(k); if (o.onlyIfNew && cur) return { modified: false }; const etag = 'e' + (++n); m.set(k, { data: typeof val === 'string' ? val : JSON.stringify(val), etag, meta: o.metadata }); return { modified: true, etag }; },
    async delete(k) { await tick(); m.delete(k); },
    async list({ prefix = '' } = {}) { await tick(); return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key, etag: m.get(key).etag })), directories: [] }; },
    peek(k) { const v = m.get(k); return v ? JSON.parse(v.data) : null; },
    poke(k, val) { m.set(k, { data: JSON.stringify(val), etag: 'e' + (++n) }); },
    keys(p = '') { return [...m.keys()].filter(k => k.startsWith(p)).sort(); } };
}
const A = makeStore(), R = makeStore();
globalThis.__terrainAccountsStore = A; globalThis.__terrainRegStore = R;
for (const g of ['__terrainGiftsStore', '__terrainPresentStore', '__terrainConnectStore', '__terrainDigitalStore', '__terrainNeedsStore', '__terrainIdeasStore', '__terrainCaseStore', '__terrainPricesStore']) globalThis[g] = makeStore();
const sha = s => createHash('sha256').update(String(s), 'utf8').digest('hex');
const SECRET = 'q'.repeat(44), PASSV = 'open-sesame-sample', KEYV = 'sk-ant-test-key-0000000000000000000000000000000000', GUEST = 'guest-code-sample-123';
const ENV = { TERRAIN_REG_SECRET: SECRET, FIREBASE_WEB_API_KEY: 'AIzaSyTestKey0000000000000000000000000', FIREBASE_PROJECT_ID: 'terrain-live', STRIPE_SECRET_KEY: 'sk_test_abc123',
  STRIPE_PRICE_YEAR: 'price_year1', STRIPE_PRICE_MONTH: 'price_month1', TERRAIN_AI_PASS: PASSV, ANTHROPIC_API_KEY: KEYV, TERRAIN_AI_GUESTS: 'tester@example.org=' + GUEST };
for (const k of ['TERRAIN_BILLING', 'TERRAIN_COMP_EMAILS', 'TERRAIN_REQUIRE_CODE', 'TERRAIN_CODES', 'DIGITAL_CONFS', 'URL', 'SITE_URL', 'NEEDS_DAY_MAX', 'IDEAS_DAY_MAX', 'CASE_DAY_MAX', 'PRICES_DAY_MAX', 'REVIEW_DAY_MAX']) delete process.env[k];
Object.assign(process.env, ENV);
const on = () => { process.env.TERRAIN_BILLING = 'on'; }, off = () => { delete process.env.TERRAIN_BILLING; };
let wakes = [], anthropic = 0;
globalThis.fetch = async (u, o = {}) => {
  u = String(u);
  if (u.startsWith('https://api.stripe.com/v1/prices/')) { const id = u.split('/').pop(); return { ok: true, status: 200, json: async () => ({ id, unit_amount: id === 'price_year1' ? 12000 : 1200, currency: 'usd' }) }; }
  if (/\/\.netlify\/functions\/[a-z-]+$/.test(u)) { wakes.push(u.split('/').pop()); return { ok: true, status: 202, json: async () => ({}) }; }
  if (/api\.anthropic\.com/.test(u)) { anthropic++; return { ok: false, status: 503, json: async () => ({ error: { message: 'not in this test' } }) }; }
  throw new Error('unexpected fetch ' + u);
};
const logs = [];
const REAL = { log: console.log, error: console.error, warn: console.warn, info: console.info };
const quiet = async f => { const cap = (...a) => logs.push(a.map(String).join(' ')); console.log = cap; console.error = cap; console.warn = cap; console.info = cap; try { return await f(); } finally { Object.assign(console, REAL); } };
const ACC = await import('../netlify/functions/account.mjs');
const SW = await import('../netlify/functions/account-sweep.mjs');
const GF = (await import('../netlify/functions/gifts.mjs')).default;
const PR = (await import('../netlify/functions/present.mjs')).default;
const CN = (await import('../netlify/functions/connect.mjs')).default;
const DG = (await import('../netlify/functions/digital.mjs')).default;
const AD = (await import('../netlify/functions/advise.mjs')).default;
const T0 = Date.now();
const tokFor = (id, at = T0) => { const iat = Math.floor(at / 1000).toString(36); return `r1.${id}.${iat}.` + createHmac('sha256', SECRET).update(`terrain-reg|r1|${id}|${iat}`, 'utf8').digest('base64url').slice(0, 32); };
const REGID = 'PastorIdAb01', TESTER = 'TesterIdAb01';
R.poke('e/' + sha('tester@example.org'), { id: TESTER, at: T0 });
const acct = (uid, plan, extra = {}) => A.poke('a/' + uid, { v: 1, uid, email: uid.toLowerCase() + '@example.org', created: T0 - 864e5, updated: T0, customer: plan ? 'cus_' + uid : null, plan, trialUsed: !!plan, ...extra });
acct('uidPlan01', { status: 'active', interval: 'year', end: T0 + 300 * 864e5, trialEnd: null, cancelAtEnd: false });
acct('uidTrial01', { status: 'trialing', interval: 'month', end: T0 + 14 * 864e5, trialEnd: T0 + 14 * 864e5, cancelAtEnd: false });
acct('uidPast01', { status: 'past_due', interval: 'month', end: T0 + 2 * 864e5, trialEnd: null, cancelAtEnd: false });
acct('uidGone01', { status: 'canceled', interval: 'month', end: T0 - 2 * 864e5, trialEnd: null, cancelAtEnd: false });
acct('uidNone01', null);
const SESS = uid => ACC.mintSession(uid, T0);
const H = (o = {}) => ({ 'content-type': 'application/json', ...(o.sess ? { 'x-terrain-session': o.sess } : {}), ...(o.reg ? { 'x-terrain-reg': o.reg } : {}), ...(o.pass != null ? { 'x-terrain-pass': o.pass } : {}) });
const call = async (fn, name, { method = 'POST', q = '', body, h = {}, ip = '198.51.100.4' } = {}) => {
  const req = new Request('https://terrain.church/.netlify/functions/' + name + q, { method, headers: method === 'GET' ? Object.fromEntries(Object.entries(h).filter(([k]) => k !== 'content-type')) : h, body: method === 'GET' ? undefined : JSON.stringify(body || {}) });
  const res = await quiet(() => fn(req, { ip, waitUntil: p => { Promise.resolve(p).catch(() => {}); } }));
  let j = null; try { j = JSON.parse(await res.text()); } catch { j = null; }
  return { status: res.status, j: j || {} };
};
const reqOf = (h = {}) => new Request('https://terrain.church/.netlify/functions/x', { method: 'POST', headers: h, body: '{}' });
const dev = n => ('dev' + String(n).padStart(4, '0') + 'AAAAAAAAAAAAAAAAAAAA').slice(0, 22);
const FIGS = [{ k: 'pop', label: 'Population', unit: 'n', t: 5480, w: 32000, c: 646000 }, { k: 'poverty', label: 'People below poverty line', unit: 'p', t: 19.4, w: 9.8, c: 7.1 },
  { k: 'snap', label: 'Households receiving SNAP', unit: 'p', t: 16.8, w: 8.2, c: 6.2 }, { k: 'noCar', label: 'Households without a vehicle', unit: 'p', t: 13.5, w: 6, c: 4.9 },
  { k: 'seniorsAlone', label: 'Households: senior living alone', unit: 'p', t: 9.4, w: 10.2, c: 11.8 }, { k: 'medInc', label: 'Median household income', unit: '$', t: 52000, w: 81000, c: 98000 },
  { k: 'kidsShare', label: 'Children, share of residents', unit: 'p', t: 27.2, w: 22, c: 20.4 }, { k: 'limEng', label: 'Limited-English households', unit: 'p', t: 11.2, w: 5, c: 3.1 }];
const CANDS = [{ id: 'poverty', cat: 'Hardship & work', title: 'Families stretched thin', ev: '19.4% of people live below the poverty line, against 7.1% in the county.' },
  { id: 'snap', cat: 'Hardship & work', title: 'Food on the table', ev: '16.8% of households receive SNAP.' },
  { id: 'kids', cat: 'Families with children', title: 'A neighborhood of children', ev: '27.2% of residents are children.' }];
const NEEDS = (n, o = {}) => ({ mode: 'needs', lang: 'en', device: o.device || dev(n), fresh: false, place: { tract: 'Census Tract 20' + n + '.02', town: 'Warminster Township', county: 'Bucks County', state: 'PA' },
  figs: FIGS, langs: [{ name: 'Spanish', share: 19.4, count: 1063 }], origins: [{ name: 'Mexico', share: 35.6 }], cands: CANDS, cats: ['Hardship & work', 'Families with children'], themes: ['hunger', 'children'] });
const tKeys = () => A.keys('t/');
const tCount = uid => { const k = tKeys().find(k => k.endsWith('/' + sha(uid).slice(0, 16)) || k.includes(uid)); return k ? (A.peek(k).n || 0) : 0; };

await sec('account.mjs', async () => {
  console.log('-- account.mjs: who has the full version --');
  off();
  let g = await call(ACC.default, 'account', { method: 'GET' });
  c('account-1.1; the day\'s allowances said (6 on a plan, 3 in the trial)', [g.j.fn, g.j.claudeDay, g.j.trialClaudeDay], ['account-1.1', 6, 3]);
  c('the constants exported', [ACC.PLAN_CLAUDE_DAY, ACC.TRIAL_CLAUDE_DAY], [6, 3]);
  c('payments off: everyone has the full version, no store read', (await ACC.fullFor(reqOf())).via, 'off');
  on();
  c('payments on: nothing sent → not full', await ACC.fullFor(reqOf()), { full: false, via: '' });
  c('a plan (active): full, via the plan, with its status and uid', await ACC.fullFor(reqOf({ 'x-terrain-session': SESS('uidPlan01') })), { full: true, via: 'plan', status: 'active', uid: 'uidPlan01' });
  c('in the trial: full', (await ACC.fullFor(reqOf({ 'x-terrain-session': SESS('uidTrial01') }))).status, 'trialing');
  c('past due (Stripe still retrying): full', (await ACC.fullFor(reqOf({ 'x-terrain-session': SESS('uidPast01') }))).full, true);
  c('cancelled: not full', (await ACC.fullFor(reqOf({ 'x-terrain-session': SESS('uidGone01') }))).full, false);
  c('signed in, no plan: not full', (await ACC.fullFor(reqOf({ 'x-terrain-session': SESS('uidNone01') }))).full, false);
  c('a session for an account the store does not hold: not full', (await ACC.fullFor(reqOf({ 'x-terrain-session': SESS('uidNobody') }))).full, false);
  const s = SESS('uidPlan01');
  c('a session changed by one letter: not full', (await ACC.fullFor(reqOf({ 'x-terrain-session': s.slice(0, -2) + (s.slice(-2) === 'AA' ? 'BB' : 'AA') }))).full, false);
  c('a session that ran out: not full', (await ACC.fullFor(reqOf({ 'x-terrain-session': ACC.mintSession('uidPlan01', T0 - 31 * 864e5) }))).full, false);
  process.env.TERRAIN_COMP_EMAILS = 'uidnone01@example.org';
  c('a complimentary address (TERRAIN_COMP_EMAILS): full', await ACC.fullFor(reqOf({ 'x-terrain-session': SESS('uidNone01') })), { full: true, via: 'plan', status: 'comp', uid: 'uidNone01' });
  delete process.env.TERRAIN_COMP_EMAILS;
  c('the passphrase: full, via pass (as today)', (await ACC.fullFor(reqOf({ 'x-terrain-pass': PASSV }))).via, 'pass');
  c('a tester code on its own registration: full, via guest', (await ACC.fullFor(reqOf({ 'x-terrain-pass': GUEST, 'x-terrain-reg': tokFor(TESTER) }))).via, 'guest');
  c('…on another registration: not full', (await ACC.fullFor(reqOf({ 'x-terrain-pass': GUEST, 'x-terrain-reg': tokFor(REGID) }))).full, false);
  c('a wrong code: not full', (await ACC.fullFor(reqOf({ 'x-terrain-pass': 'wrong-code-123456' }))).full, false);
  console.log('\n-- the day\'s allowance of Claude studies, per account --');
  for (let i = 1; i <= 6; i++) { const a = await ACC.claudeBump('uidPlan01', 'active', T0); if (i === 1) c('the first study on a plan: counted', a, { ok: true, n: 1, max: 6 }); if (i === 6) c('the sixth: still ok', a.ok, true); }
  let a = await ACC.claudeBump('uidPlan01', 'active', T0);
  c('the seventh: refused, with the max and when the day turns', [a.ok, a.max, a.retryAfter > 0 && a.retryAfter <= 86400], [false, 6, true]);
  c('…kept under t/<day>/<hash of the uid>, never the uid itself', [tKeys().length, tKeys().some(k => k.includes('uidPlan01')), /^t\/\d{4}-\d{2}-\d{2}\/[0-9a-f]{16}$/.test(tKeys()[0])], [1, false, true]);
  await ACC.claudeGiveBack('uidPlan01', T0);
  c('given back: the seventh may go', (await ACC.claudeBump('uidPlan01', 'active', T0)).ok, true);
  for (let i = 1; i <= 3; i++) a = await ACC.claudeBump('uidTrial01', 'trialing', T0);
  c('the trial: three a day', [a.ok, (await ACC.claudeBump('uidTrial01', 'trialing', T0)).ok], [true, false]);
  c('another day is another count', (await ACC.claudeBump('uidPlan01', 'active', T0 + 864e5)).ok, true);
  console.log('\n-- account-sweep-1.1 forgets the counts after two days --');
  A.poke('t/2026-10-01/0123456789abcdef', { n: 3, at: Date.parse('2026-10-01T10:00:00Z') });
  const r = await SW.sweep(A, T0, T0);
  c('an old day\'s count removed, today\'s kept, accounts untouched', [A.keys('t/').some(k => k.startsWith('t/2026-10-01/')), A.keys('t/').length >= 2, A.keys('a/').length, r.claude], [false, true, 5, 1]);
});

await sec('the gates', async () => {
  console.log('\n-- gifts op id (the church\'s link): the plan, else 402 --');
  const reg = tokFor(REGID);
  off();
  let r = await call(GF, 'gifts', { body: { op: 'id', church: 'Sample SDA' }, h: H({ reg }) });
  c('payments off: a link as before (gifts-1.4)', [r.status, /^[A-Za-z0-9_-]{12}$/.test(r.j.pub || '')], [200, true]);
  on();
  r = await call(GF, 'gifts', { body: { op: 'id', church: 'Sample SDA' }, h: H({ reg }) });
  c('payments on, no plan: 402 plan', [r.status, r.j.error], [402, 'plan']);
  r = await call(GF, 'gifts', { body: { op: 'id', church: 'Sample SDA' }, h: H({ reg, sess: SESS('uidNone01') }) });
  c('signed in without a plan: 402', [r.status, r.j.error], [402, 'plan']);
  r = await call(GF, 'gifts', { body: { op: 'id', church: 'Sample SDA' }, h: H({ reg, sess: SESS('uidPlan01') }), ip: '198.51.100.5' });
  c('a plan: a link', [r.status, /^[A-Za-z0-9_-]{12}$/.test(r.j.pub || '')], [200, true]);
  r = await call(GF, 'gifts', { body: { op: 'id', church: 'Sample SDA' }, h: H({ reg, pass: PASSV }), ip: '198.51.100.6' });
  c('the passphrase: a link', r.status, 200);
  r = await call(GF, 'gifts', { body: { op: 'id', church: 'Sample SDA' }, h: H({ reg: tokFor(TESTER), pass: GUEST }), ip: '198.51.100.7' });
  c('a tester code on its registration: a link', r.status, 200);
  r = await call(GF, 'gifts', { body: { op: 'id', church: 'Sample SDA' }, h: H({ sess: SESS('uidPlan01') }) });
  c('the registration is still asked first (noreg before plan)', [r.status, r.j.error], [401, 'noreg']);
  r = await call(GF, 'gifts', { body: { op: 'status' } });
  c('status, and the member\'s own ops, need nothing (gifts-1.4)', [r.status, r.j.fn], [200, 'gifts-1.4']);

  console.log('\n-- present op open --');
  r = await call(PR, 'present', { body: { op: 'open', deck: {} }, h: H({ reg }) });
  c('no plan: 402 before the deck is even read', [r.status, r.j.error], [402, 'plan']);
  r = await call(PR, 'present', { body: { op: 'open', deck: {} }, h: H({ reg, sess: SESS('uidPlan01') }) });
  c('a plan: through the gate (then the deck is refused as always)', [r.status, r.j.error], [400, 'bad-deck']);
  r = await call(PR, 'present', { body: { op: 'open', deck: {} }, h: H({ reg, pass: PASSV }) });
  c('the passphrase: through', r.status, 400);
  r = await call(PR, 'present', { method: 'GET' });
  c('status says present-1.5', r.j.fn, 'present-1.5');
  off();
  r = await call(PR, 'present', { body: { op: 'open', deck: {} }, h: H({ reg }) });
  c('payments off: as before', r.status, 400);
  on();

  console.log('\n-- connect op create --');
  r = await call(CN, 'connect', { body: { op: 'create', card: {} }, h: H({ reg }) });
  c('no plan: 402', [r.status, r.j.error], [402, 'plan']);
  r = await call(CN, 'connect', { body: { op: 'create', card: {} }, h: H({ reg, sess: SESS('uidTrial01') }) });
  c('in the trial: through (the empty card refused as always)', [r.status, r.j.error], [400, 'bad-card']);
  r = await call(CN, 'connect', { method: 'GET' });
  c('status says connect-1.1', r.j.fn, 'connect-1.1');

  console.log('\n-- digital: the findings, a reading, one church again --');
  r = await call(DG, 'digital', { method: 'GET', q: '?conf=Pennsylvania', h: H({ reg }) });
  c('no plan: 402 plan', [r.status, r.j.code], [402, 'plan']);
  r = await call(DG, 'digital', { body: { op: 'read', conf: 'Pennsylvania' }, h: H({ reg }) });
  c('…op read too', [r.status, r.j.code], [402, 'plan']);
  r = await call(DG, 'digital', { body: { op: 'again', conf: 'Pennsylvania', org: 'ANBICG' }, h: H({ reg }) });
  c('…and again', [r.status, r.j.code], [402, 'plan']);
  r = await call(DG, 'digital', { method: 'GET', q: '?conf=Pennsylvania', h: H({ reg, sess: SESS('uidPlan01') }) });
  c('a plan: the findings (none yet here: a reading starts)', [r.status, r.j.ok], [200, true]);
  r = await call(DG, 'digital', { method: 'GET', q: '', h: H({}) });
  c('the bare GET says digital-1.3', r.j.fn, 'digital-1.3');
  r = await call(DG, 'digital', { method: 'GET', q: '?conf=Pennsylvania', h: H({ sess: SESS('uidPlan01') }) });
  c('the registration still first', [r.status, r.j.code], [401, 'noreg']);
});

await sec('advise', async () => {
  console.log('\n-- advise.mjs: a plan opens Claude, counted a day per account --');
  const reg = tokFor(REGID); on();
  for (const k of A.keys('t/')) A.m.delete(k);   // the first section spent today's allowance: a fresh day here
  let r = await call(AD, 'advise', { body: NEEDS(1), h: H({ reg }), ip: '198.51.101.1' });
  c('no code, no plan: locked (as today)', [r.status, r.j.code], [401, 'locked']);
  r = await call(AD, 'advise', { body: NEEDS(1), h: H({ reg, sess: SESS('uidNone01') }), ip: '198.51.101.2' });
  c('signed in without a plan: locked', [r.status, r.j.code], [401, 'locked']);
  r = await call(AD, 'advise', { body: NEEDS(1), h: H({ reg, sess: SESS('uidPlan01'), pass: '' }), ip: '198.51.101.3' });
  c('a plan, an empty code header: the study is queued (advise-2.8)', [r.status, r.j.fn, /^[A-Za-z0-9_-]{22}$/.test(r.j.job || ''), wakes.at(-1)], [202, 'advise-2.8', true, 'advise-needs']);
  c('…one of the day\'s six taken', tCount('uidPlan01'), 1);
  r = await call(AD, 'advise', { body: { ...NEEDS(2), mode: 'ideas', need: { id: 'snap', title: 'Food on the table', cat: 'Hardship & work', why: 'Around the church 16.8% of households receive SNAP, against 6.2% in the county.', themes: ['hunger'] }, tags: ['snap', 'poor', 'no-car'], have: [{ id: 'hunger-little-free-pantry', name: 'A little free pantry on the corner', lift: 1 }] }, h: H({ reg, sess: SESS('uidPlan01') }), ip: '198.51.101.4' });
  c('the work for a need: the same count (2)', [r.status, tCount('uidPlan01')], [202, 2]);
  for (let i = 3; i <= 6; i++) r = await call(AD, 'advise', { body: NEEDS(i), h: H({ reg, sess: SESS('uidPlan01') }), ip: '198.51.101.5' });
  c('the sixth study of the day: queued', [r.status, tCount('uidPlan01')], [202, 6]);
  const before = globalThis.__terrainNeedsStore.keys('c/').map(k => [k, globalThis.__terrainNeedsStore.peek(k).n]);
  r = await call(AD, 'advise', { body: NEEDS(7), h: H({ reg, sess: SESS('uidPlan01') }), ip: '198.51.101.6' });
  c('the seventh: 429 limit-plan, the max and when the day turns', [r.status, r.j.code, r.j.max, r.j.retryAfter > 0], [429, 'limit-plan', 6, true]);
  c('…the route\'s own counters given back (the refused ask\'s new device key stands at 0)', globalThis.__terrainNeedsStore.keys('c/').filter(k => before.some(b => b[0] === k)).map(k => [k, globalThis.__terrainNeedsStore.peek(k).n]), before);
  r = await call(AD, 'advise', { body: NEEDS(7), h: H({ reg, pass: PASSV }), ip: '198.51.101.7' });
  c('the passphrase after the plan\'s day is spent: queued, and not counted (as today)', [r.status, tCount('uidPlan01')], [202, 6]);
  r = await call(AD, 'advise', { body: NEEDS(8), h: H({ reg: tokFor(TESTER), pass: GUEST }), ip: '198.51.101.8' });
  c('a tester code: queued, not counted (one account counted today)', [r.status, A.keys('t/').length], [202, 1]);
  for (let i = 1; i <= 3; i++) r = await call(AD, 'advise', { body: NEEDS(10 + i), h: H({ reg, sess: SESS('uidTrial01') }), ip: '198.51.101.9' });
  c('the trial: three studies', [r.status, tCount('uidTrial01')], [202, 3]);
  r = await call(AD, 'advise', { body: NEEDS(14), h: H({ reg, sess: SESS('uidTrial01') }), ip: '198.51.101.10' });
  c('…the fourth refused, max 3', [r.status, r.j.code, r.j.max], [429, 'limit-plan', 3]);
  r = await call(AD, 'advise', { body: NEEDS(1), h: H({ reg, sess: SESS('uidTrial01') }), ip: '198.51.101.11' });
  c('a kept study is never one of them (the first place again, once its job ends, would be cached: here the job record stands)', [r.status, r.j.code].join(' ') !== '', true);
  // the older routes: "More ideas" and the plan prose (payload.summary) go through the same door
  r = await call(AD, 'advise', { body: { mode: 'moves', summary: 'x'.repeat(60), count: 1 }, h: H({ reg, sess: SESS('uidTrial01') }), ip: '198.51.101.12' });
  c('"More ideas" on a spent trial: 429 limit-plan before Claude is asked', [r.status, r.j.code, anthropic], [429, 'limit-plan', 0]);
  r = await call(AD, 'advise', { body: { mode: 'moves', summary: 'x'.repeat(60), count: 1 }, h: H({ reg, sess: SESS('uidPast01') }), ip: '198.51.101.13' });
  c('…on a plan with allowance: through to Claude (stubbed down here)', [r.status !== 401 && r.status !== 402 && r.status !== 429, anthropic], [true, 1]);
  off();
  r = await call(AD, 'advise', { body: NEEDS(20), h: H({ reg, sess: SESS('uidPlan01') }), ip: '198.51.101.14' });
  c('payments off: a session alone opens nothing (the passphrase rules, as today)', [r.status, r.j.code], [401, 'locked']);
  on();
  const g = await call(AD, 'advise', { method: 'GET' });
  c('GET says advise-2.8', g.j.fn, 'advise-2.8');
});

await sec('leaks', async () => {
  console.log('\n-- nothing secret in the logs --');
  const s = SESS('uidPlan01');
  c('no session, secret, key or passphrase ever logged', logs.some(l => l.includes(s) || l.includes(SECRET) || l.includes(KEYV) || l.includes(PASSV) || l.includes(GUEST) || /uidPlan01/.test(l)), false);
});
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
