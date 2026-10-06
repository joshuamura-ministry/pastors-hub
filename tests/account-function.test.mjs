// v10.54.0 · accounts and plans: account.mjs (account-1.0), stripe-webhook.mjs (stripe-webhook-1.0), account-sweep.mjs, against an
// injected in-memory Netlify Blobs store, a made-up signing key standing in for Google's, and a stubbed Stripe. No network, no money.
// The pastor (6 Oct 2026): "Now we need to make sure we connect this to the stripe and build this to be of the product"; the trial he
// agreed to: 14 days with a card, the yearly plan first. DESIGN-PRODUCT.md (v69). Written failing-first on v10.53.0.
import { generateKeyPairSync, createSign, createHmac } from 'node:crypto';
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
let S = makeStore(); globalThis.__terrainAccountsStore = S;
const PROJECT = 'terrain-live', SECRET = 'r'.repeat(40), WHSEC = 'whsec_testsecret0123456789', FBKEY = 'AIzaSyTestKey0000000000000000000000000';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const JWK = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
const OTHER = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
function idToken(over = {}, o = {}) {
  const now = Math.floor(Date.now() / 1000);
  const h = { alg: 'RS256', kid: o.kid || 'k1', typ: 'JWT' };
  const p = { aud: PROJECT, iss: 'https://securetoken.google.com/' + PROJECT, sub: 'uidPastor01', email: 'Pastor@Example.org', email_verified: true, iat: now - 10, auth_time: now - 10, exp: now + 3600, ...over };
  const body = b64(h) + '.' + b64(p), sig = createSign('RSA-SHA256').update(body).sign(o.key || privateKey).toString('base64url');
  return body + '.' + sig;
}
let stripeCalls = [], stripeScript = {};
globalThis.fetch = async (u, o = {}) => {
  u = String(u);
  if (u.startsWith('https://www.googleapis.com/')) return { ok: true, status: 200, headers: { get: k => k === 'cache-control' ? 'public, max-age=3600' : null }, json: async () => ({ keys: [JWK] }) };
  if (u.startsWith('https://api.stripe.com/v1/')) {
    const path = u.slice(26), body = o.body ? Object.fromEntries(new URLSearchParams(o.body)) : null;
    stripeCalls.push({ path, method: o.method, body, auth: o.headers && o.headers.authorization });
    const h = stripeScript[path] || stripeScript[path.replace(/\/[^/]+$/, '/*')];
    const r = typeof h === 'function' ? h(body) : h;
    if (!r) return { ok: false, status: 500, json: async () => ({ error: { message: 'no script' } }) };
    return { ok: (r.status || 200) < 300, status: r.status || 200, json: async () => r.data };
  }
  throw new Error('unexpected fetch ' + u);
};
const logs = [];
const REAL = { log: console.log, error: console.error, warn: console.warn };
const quiet = async f => { const cap = (...a) => logs.push(a.map(String).join(' ')); console.log = cap; console.error = cap; console.warn = cap; try { return await f(); } finally { Object.assign(console, REAL); } };
let ver = 0;
async function load(env) {
  for (const k of ['TERRAIN_REG_SECRET', 'FIREBASE_WEB_API_KEY', 'FIREBASE_PROJECT_ID', 'STRIPE_SECRET_KEY', 'STRIPE_PRICE_YEAR', 'STRIPE_PRICE_MONTH', 'TERRAIN_BILLING', 'TERRAIN_COMP_EMAILS']) delete process.env[k];   // (the webhook's secret is the webhook's own)
  Object.assign(process.env, env);
  return await import(new URL('../netlify/functions/account.mjs?v=' + (++ver), import.meta.url).href);
}
const FULLENV = { TERRAIN_REG_SECRET: SECRET, FIREBASE_WEB_API_KEY: FBKEY, FIREBASE_PROJECT_ID: PROJECT, STRIPE_SECRET_KEY: 'sk_test_abc123', STRIPE_PRICE_YEAR: 'price_year1', STRIPE_PRICE_MONTH: 'price_month1' };
const post = (M, body, ip = '198.51.100.4') => quiet(() => M.default(new Request('https://pastorshub.org/.netlify/functions/account', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), { ip }));
const get = M => quiet(() => M.default(new Request('https://pastorshub.org/.netlify/functions/account', { method: 'GET' }), {}));
const J = async r => ({ status: r.status, ...(await r.json()) });
stripeScript = { 'prices/*': b => null };
stripeScript['prices/price_year1'] = { data: { id: 'price_year1', unit_amount: 15000, currency: 'usd' } };
stripeScript['prices/price_month1'] = { data: { id: 'price_month1', unit_amount: 1500, currency: 'usd' } };

console.log('-- GET: what the page needs, no secret in it --');
{ let M = await load({});
  c('nothing set: no sign-in, payments off', await J(await get(M)), { status: 200, fn: 'account-1.0', auth: false, fb: null, billing: 'off', mode: null, checkout: false, trialDays: 14, prices: null });
  M = await load(FULLENV);
  const g = await J(await get(M));
  c('set up in test mode: sign-in on (the public web config), payments off until TERRAIN_BILLING=on, checkout on for testing, the prices from Stripe',
    [g.auth, g.fb, g.billing, g.mode, g.checkout, g.prices], [true, { apiKey: FBKEY, authDomain: PROJECT + '.firebaseapp.com', projectId: PROJECT }, 'off', 'test', true, { year: { amount: 15000, currency: 'usd' }, month: { amount: 1500, currency: 'usd' } }]);
  c('…no secret key, no webhook secret, no reg secret in it', [JSON.stringify(g).includes('sk_test'), JSON.stringify(g).includes(SECRET)], [false, false]);
  M = await load({ ...FULLENV, TERRAIN_BILLING: 'on' });
  c('TERRAIN_BILLING=on: payments on', (await J(await get(M))).billing, 'on');
  M = await load({ ...FULLENV, STRIPE_SECRET_KEY: 'sk_live_abc123' });
  c('a LIVE key with the switch off: checkout off (only a test key may check out with the switch off)', [(await J(await get(M))).mode, (await J(await get(M))).checkout], ['live', false]); }

console.log('\n-- signing in: Firebase\'s token checked here --');
let SESS = null;
{ const M = await load(FULLENV); M._resetKeys();
  const bad = async (tok, why) => c(why + ': 401 bad-token', (await J(await post(M, { op: 'session', idToken: tok }))).code, 'bad-token');
  await bad(idToken({}, { key: OTHER }), 'signed by another key');
  await bad(idToken({ exp: Math.floor(Date.now() / 1000) - 5 }), 'expired');
  await bad(idToken({ aud: 'someone-else' }), 'for another project');
  await bad(idToken({ iss: 'https://evil.example/terrain-live' }), 'from another issuer');
  await bad(idToken({ email_verified: false }), 'an email not verified');
  await bad(idToken({ sub: 'bad/uid' }), 'a strange uid');
  await bad(idToken({}).replace(/\.[^.]+$/, '.AAAA'), 'a broken signature');
  c('nothing stored for any of them', S.keys('a/'), []);
  const r = await J(await post(M, { op: 'session', idToken: idToken() }));
  c('a good token: a session, the email (lower case), no plan yet', [r.status, /^s1\./.test(r.session), r.email, r.plan], [200, true, 'pastor@example.org', { full: false, status: 'none', trialUsed: false }]);
  SESS = r.session;
  c('…the account kept by its uid', [S.peek('a/uidPastor01').email, S.peek('a/uidPastor01').customer], ['pastor@example.org', null]);
  const p = await J(await post(M, { op: 'plan', session: SESS }));
  c('the session reads the plan', [p.status, p.email, p.plan.status], [200, 'pastor@example.org', 'none']);
  c('a session changed by one letter is refused', (await J(await post(M, { op: 'plan', session: SESS.slice(0, -2) + (SESS.slice(-2) === 'AA' ? 'BB' : 'AA') }))).code, 'bad-session');
  c('…and one made with another secret', (await J(await post(await load({ ...FULLENV, TERRAIN_REG_SECRET: 'z'.repeat(40) }), { op: 'plan', session: SESS }))).code, 'bad-session');
  const C = await load({ ...FULLENV, TERRAIN_COMP_EMAILS: 'someone@x.org, pastor@example.org' });
  c('his own addresses (TERRAIN_COMP_EMAILS): the full version always', (await J(await post(C, { op: 'plan', session: SESS }))).plan, { full: true, status: 'comp', trialUsed: false });
  c('the logs never carry the email or a token', logs.some(l => /pastor@example\.org|s1\.|eyJ/.test(l)), false); }

console.log('\n-- Checkout: the yearly or monthly plan, 14 days free the first time --');
{ let M = await load({ ...FULLENV, STRIPE_SECRET_KEY: 'sk_live_abc123' });
  c('a live key with the switch off: 409 billing-off', (await J(await post(M, { op: 'checkout', session: SESS, interval: 'year' }))).code, 'billing-off');
  M = await load(FULLENV);
  c('an interval that is not yearly or monthly: 400', (await J(await post(M, { op: 'checkout', session: SESS, interval: 'weekly' }))).field, 'interval');
  stripeCalls = [];
  stripeScript['customers'] = { data: { id: 'cus_A1' } };
  stripeScript['checkout/sessions'] = b => ({ data: { id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' } });
  const r = await J(await post(M, { op: 'checkout', session: SESS, interval: 'year' }));
  c('the Checkout page\'s address', [r.status, r.url], [200, 'https://checkout.stripe.com/c/pay/cs_test_1']);
  const cus = stripeCalls.find(x => x.path === 'customers'), cs = stripeCalls.find(x => x.path === 'checkout/sessions');
  c('a Stripe customer made once, with the email and our id; kept both ways', [cus.body, S.peek('a/uidPastor01').customer, S.peek('c/cus_A1').uid], [{ email: 'pastor@example.org', 'metadata[uid]': 'uidPastor01' }, 'cus_A1', 'uidPastor01']);
  c('…a subscription for the yearly price, 14 days free, the card taken, back to this site', [cs.body.mode, cs.body['line_items[0][price]'], cs.body['subscription_data[trial_period_days]'], cs.body.payment_method_collection, cs.body.success_url, cs.body.cancel_url, cs.body.client_reference_id, cs.body['subscription_data[metadata][uid]'], cs.body.customer],
    ['subscription', 'price_year1', '14', 'always', 'https://pastorshub.org/?plan=done', 'https://pastorshub.org/?plan=back', 'uidPastor01', 'uidPastor01', 'cus_A1']);
  c('…the secret key only in Stripe\'s own header', cs.auth, 'Bearer sk_test_abc123');
  stripeCalls = [];
  await J(await post(M, { op: 'checkout', session: SESS, interval: 'month' }));
  c('again: no second customer; the monthly price', [stripeCalls.filter(x => x.path === 'customers').length, stripeCalls.find(x => x.path === 'checkout/sessions').body['line_items[0][price]']], [0, 'price_month1']);
  S.poke('a/uidPastor01', { ...S.peek('a/uidPastor01'), trialUsed: true }); stripeCalls = [];
  await J(await post(M, { op: 'checkout', session: SESS, interval: 'year' }));
  c('a pastor who has had the trial: no second trial', 'subscription_data[trial_period_days]' in stripeCalls.find(x => x.path === 'checkout/sessions').body, false);
  stripeScript['checkout/sessions'] = { data: { id: 'cs_2', url: 'https://evil.example/pay' } };
  c('a Checkout address that is not Stripe\'s is never passed on', (await J(await post(M, { op: 'checkout', session: SESS, interval: 'year' }))).code, 'stripe-unavailable'); }

console.log('\n-- the webhook: Stripe\'s word, checked, once --');
const W = await import(new URL('../netlify/functions/stripe-webhook.mjs', import.meta.url).href);
const sign = (raw, t = Math.floor(Date.now() / 1000), sec = WHSEC) => 't=' + t + ',v1=' + createHmac('sha256', sec).update(t + '.' + raw).digest('hex');
const hook = (evt, o = {}) => { const raw = JSON.stringify(evt); return quiet(() => W.default(new Request('https://pastorshub.org/.netlify/functions/stripe-webhook', { method: 'POST', headers: { 'stripe-signature': o.sig || sign(raw, o.t, o.sec) }, body: raw }))); };
const SUB = (over = {}) => ({ id: 'sub_1', customer: 'cus_A1', status: 'trialing', cancel_at_period_end: false, trial_end: Math.floor(Date.now() / 1000) + 14 * 86400, metadata: { uid: 'uidPastor01' },
  items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 14 * 86400, price: { id: 'price_year1', recurring: { interval: 'year' } } }] }, ...over });
let evN = 0; const EV = (type, obj, created = Math.floor(Date.now() / 1000)) => ({ id: 'evt_' + (++evN), type, created, data: { object: obj } });
{ delete process.env.STRIPE_WEBHOOK_SECRET;
  c('no signing secret set: 503', (await hook(EV('customer.subscription.created', SUB()))).status, 503);
  process.env.STRIPE_WEBHOOK_SECRET = WHSEC;
  c('a wrong signature: 400', (await hook(EV('customer.subscription.created', SUB()), { sec: 'whsec_wrongsecret00000000' })).status, 400);
  c('a call from 10 minutes ago: 400 (an old call sent again)', (await hook(EV('customer.subscription.created', SUB()), { t: Math.floor(Date.now() / 1000) - 600 })).status, 400);
  c('…and nothing changed', S.peek('a/uidPastor01').plan || null, null);
  S.poke('a/uidPastor01', { ...S.peek('a/uidPastor01'), trialUsed: false });
  const e1 = EV('customer.subscription.created', SUB());
  c('subscription created (trial): 200', (await hook(e1)).status, 200);
  const rec = S.peek('a/uidPastor01');
  c('…the plan: trialing, yearly, its trial\'s end; the trial counted as used', [rec.plan.status, rec.plan.interval, typeof rec.plan.trialEnd, rec.trialUsed], ['trialing', 'year', 'number', true]);
  const M = await load(FULLENV);
  const p = (await J(await post(M, { op: 'plan', session: SESS }))).plan;
  c('…so the page has the full version', [p.full, p.status, p.interval], [true, 'trialing', 'year']);
  c('the same event again: acted on once', (await (await hook(e1)).json()).again, true);
  await hook(EV('customer.subscription.updated', SUB({ status: 'active', trial_end: null }), Math.floor(Date.now() / 1000) + 5));
  await hook(EV('customer.subscription.updated', SUB({ status: 'incomplete' }), Math.floor(Date.now() / 1000) - 100));
  c('an older event never overwrites a newer plan', S.peek('a/uidPastor01').plan.status, 'active');
  c('Checkout again while the plan is live: 409 already', (await J(await post(M, { op: 'checkout', session: SESS, interval: 'year' }))).code, 'already');
  await hook(EV('customer.subscription.updated', SUB({ status: 'active', cancel_at_period_end: true }), Math.floor(Date.now() / 1000) + 10));
  c('cancelled at the period\'s end: still full until then, and it says so', [(await J(await post(M, { op: 'plan', session: SESS }))).plan.full, (await J(await post(M, { op: 'plan', session: SESS }))).plan.cancelAtEnd], [true, true]);
  await hook(EV('customer.subscription.deleted', SUB({ status: 'canceled' }), Math.floor(Date.now() / 1000) + 20));
  c('deleted: the free version', [(await J(await post(M, { op: 'plan', session: SESS }))).plan.full, S.peek('a/uidPastor01').plan.status], [false, 'canceled']);
  c('an event for a customer we never linked: 200, nothing written', [(await hook(EV('customer.subscription.updated', SUB({ id: 'sub_9', customer: 'cus_ZZ', metadata: {} })))).status, S.keys('a/')], [200, ['a/uidPastor01']]);
  const done = EV('checkout.session.completed', { id: 'cs_9', customer: 'cus_B2', client_reference_id: 'uidPastor01' });
  await hook(done);
  c('Checkout completed links its customer to the account', S.peek('c/cus_B2').uid, 'uidPastor01');
  c('the webhook\'s logs carry the type and a code only', logs.filter(l => /\[stripe-webhook\]/.test(l)).every(l => !/pastor@|cus_|sub_|uidPastor/.test(l)), true); }

console.log('\n-- the billing portal --');
{ const M = await load(FULLENV);
  stripeScript['billing_portal/sessions'] = { data: { url: 'https://billing.stripe.com/p/session/test_1' } };
  const r = await J(await post(M, { op: 'portal', session: SESS }));
  c('Stripe\'s Customer Portal, back to this site', [r.url, stripeCalls.slice(-1)[0].body.return_url], ['https://billing.stripe.com/p/session/test_1', 'https://pastorshub.org/?plan=portal']);
  S.poke('a/uidPastor01', { ...S.peek('a/uidPastor01'), customer: null });
  c('no customer yet: 409', (await J(await post(M, { op: 'portal', session: SESS }))).code, 'no-customer'); }

console.log('\n-- limits --');
{ S = makeStore(); globalThis.__terrainAccountsStore = S;
  const M = await load(FULLENV);
  const codes = [];
  for (let i = 0; i < 31; i++) codes.push((await post(M, { op: 'session', idToken: 'x' }, '203.0.113.9')).status);
  c('thirty sign-ins an hour from one place, then 429', [codes.slice(0, 30).every(s => s === 401), codes[30]], [true, 429]); }

console.log('\n-- the sweep --');
{ const SW = await import(new URL('../netlify/functions/account-sweep.mjs', import.meta.url).href);
  const St = makeStore(), now = Date.parse('2026-12-10T12:00:00Z');
  St.poke('e/evt_old', { at: now - 31 * 864e5 }); St.poke('e/evt_new', { at: now - 2 * 864e5 });
  St.poke('r/2026-12-01T10/ses/' + 'a'.repeat(16), { n: 3 }); St.poke('a/uidX', { email: 'x@y.org' }); St.poke('c/cus_X', { uid: 'uidX' });
  const r = await SW.sweep(St, now, now);
  c('events after 30 days and counters after 2 go; accounts and links never', [r.events, r.counters, St.keys()], [1, 1, ['a/uidX', 'c/cus_X', 'e/evt_new']]); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
