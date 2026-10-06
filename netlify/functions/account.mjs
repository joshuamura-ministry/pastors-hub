// Terrain · accounts and plans.                                        account-1.0
//
// v10.54.0 (DESIGN-PRODUCT.md, Terrain-work/v69). The pastor (6 Oct 2026): "Now we need to make sure we connect this to the stripe
// and build this to be of the product." A pastor signs in (only to pay; the free survey still needs registration only) with Google or
// an emailed link, through Firebase Authentication. The page sends Firebase's ID token here; this function checks it itself (Google's
// public keys, RS256, this project as audience and issuer, not expired, the email verified) and answers with Terrain's own session (an
// HMAC token for 30 days) and the plan. Plans are Stripe subscriptions (hosted Checkout, the Customer Portal); stripe-webhook.mjs keeps
// the plan up to date. Card details never touch Terrain.
//
// GET  → { fn, auth, fb, billing, mode, trialDays, prices }   what the page needs to draw sign-in and the plans (no secret in it:
//        the Firebase web key is a public identifier; prices are read from Stripe)
// POST { op:'session', idToken }               → { ok, session, email, plan }
// POST { op:'plan', session }                  → { ok, email, plan }
// POST { op:'checkout', session, interval }    → { ok, url }   Stripe Checkout (yearly or monthly; 14 days free the first time)
// POST { op:'portal', session }                → { ok, url }   Stripe's Customer Portal (receipts, the card, switching, cancelling)
//
// PAYMENTS OFF UNTIL HE SAYS. TERRAIN_BILLING=on turns the paid version on for everyone; unset, the page gives everyone the full
// version as before. With a TEST key (sk_test_) checkout works whatever the switch says, so he can try it on one device (?billing=test).
// TERRAIN_COMP_EMAILS (comma-separated) always have the full version.
//
// STORAGE. Netlify Blobs "terrain-accounts": a/<uid> {uid, email, created, updated, customer, plan, trialUsed}; c/<customer> {uid};
// e/<event> (stripe-webhook.mjs); r/<hour>/<tag> {n} counters. account-sweep.mjs tidies events and counters.
//
// Environment: TERRAIN_REG_SECRET (required: the session's key is derived from it with its own label), FIREBASE_WEB_API_KEY and
// FIREBASE_PROJECT_ID (sign-in), STRIPE_SECRET_KEY, STRIPE_PRICE_YEAR, STRIPE_PRICE_MONTH (plans), TERRAIN_BILLING, TERRAIN_COMP_EMAILS.
// Values never appear in a reply or a log line.

import { getStore } from '@netlify/blobs';
import { createHash, createHmac, createPublicKey, verify as rsaVerify, timingSafeEqual } from 'node:crypto';

const FN = 'account-1.0';
const STORE_NAME = 'terrain-accounts';
export const TRIAL_DAYS = 14;
const SESSION_DAYS = 30;
const MAX_BODY = 8192;
const SESSION_HOUR = 30, CHECKOUT_HOUR = 10, PORTAL_HOUR = 20, PLAN_HOUR = 240;
export const FULL = new Set(['active', 'trialing', 'past_due', 'comp']);
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const env = k => String(process.env[k] || '').trim().replace(/^["']+|["']+$/g, '').trim();
const FB_KEY = () => env('FIREBASE_WEB_API_KEY'), FB_PROJECT = () => env('FIREBASE_PROJECT_ID');
const STRIPE_KEY = () => env('STRIPE_SECRET_KEY');
const PRICE = { year: () => env('STRIPE_PRICE_YEAR'), month: () => env('STRIPE_PRICE_MONTH') };
export const stripeMode = () => { const k = STRIPE_KEY(); return /^(sk|rk)_live_[A-Za-z0-9]+$/.test(k) ? 'live' : /^(sk|rk)_test_[A-Za-z0-9]+$/.test(k) ? 'test' : null; };
const switchOn = () => env('TERRAIN_BILLING').toLowerCase() === 'on';
const pricesSet = () => /^price_[A-Za-z0-9]+$/.test(PRICE.year()) && /^price_[A-Za-z0-9]+$/.test(PRICE.month());
export const billingOn = () => switchOn() && !!stripeMode() && pricesSet();
const checkoutOk = () => !!stripeMode() && pricesSet() && (switchOn() || stripeMode() === 'test');
const comps = () => new Set(env('TERRAIN_COMP_EMAILS').toLowerCase().split(/[,\s]+/).filter(Boolean));
const regSecret = () => { const v = env('TERRAIN_REG_SECRET'); return v.length >= 32 ? v : ''; };
const authOn = () => /^[A-Za-z0-9_-]{20,60}$/.test(FB_KEY()) && /^[a-z0-9-]{4,40}$/.test(FB_PROJECT()) && !!regSecret();

const NO_STORE = 'no-store, max-age=0';
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': NO_STORE } });
const fail = (code, status, extra) => { logLine(code); return reply({ ok: false, code, ...(extra || {}) }, status); };
function logLine(code) { try { console.log('[account] ' + JSON.stringify({ fn: FN, code })); } catch { /* never throws */ } }
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const sha = s => createHash('sha256').update(String(s), 'utf8').digest('hex');

function theStore() {
  if (globalThis.__terrainAccountsStore) return globalThis.__terrainAccountsStore;
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}
async function upsert(store, key, fn) {
  const cas = typeof store.getWithMetadata === 'function';
  for (let i = 0; i < 8; i++) {
    let cur = null, etag;
    if (cas) { const r = await store.getWithMetadata(key, { type: 'json' }); if (r) { cur = r.data; etag = r.etag; } }
    else cur = await store.get(key, { type: 'json' });
    const next = fn(cur);
    if (next == null) return cur;
    const w = await store.setJSON(key, next, cur == null ? { onlyIfNew: true } : (cas && etag ? { onlyIfMatch: etag } : undefined));
    if (!w || w.modified !== false) return next;
  }
  throw new Error('busy');
}
// a counter a client or an account may not pass in an hour
async function bump(store, kind, who, max, now) {
  const key = 'r/' + new Date(now).toISOString().slice(0, 13) + '/' + kind + '/' + sha('terrain-account|' + kind + '|' + who).slice(0, 16);
  let over = false;
  await upsert(store, key, cur => { const n = cur && Number.isInteger(cur.n) ? cur.n : 0; if (n >= max) { over = true; return null; } return { n: n + 1, at: now }; });
  return !over;
}
function clientTag(request, context) {
  const ip = (context && context.ip) || request.headers.get('x-nf-client-connection-ip') || '';
  return String(ip).slice(0, 64) || 'unknown';
}

// ---------------------------------------------------------------- Terrain's session
const sessKey = () => { const s = regSecret(); return s ? createHmac('sha256', s).update('terrain-session-v1').digest() : null; };
export function mintSession(uid, now = Date.now()) {
  const k = sessKey(); if (!k) return null;
  const u = Buffer.from(uid, 'utf8').toString('base64url'), exp = Math.floor((now + SESSION_DAYS * 864e5) / 1000).toString(36);
  const body = 's1.' + u + '.' + exp;
  return body + '.' + createHmac('sha256', k).update(body).digest('base64url');
}
export function readSession(tok, now = Date.now()) {
  const k = sessKey(); if (!k || typeof tok !== 'string' || tok.length > 400) return null;
  const m = /^s1\.([A-Za-z0-9_-]{1,180})\.([0-9a-z]{1,10})\.([A-Za-z0-9_-]{43})$/.exec(tok); if (!m) return null;
  const want = createHmac('sha256', k).update('s1.' + m[1] + '.' + m[2]).digest();
  const got = Buffer.from(m[3], 'base64url');
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  if (parseInt(m[2], 36) * 1000 <= now) return null;
  const uid = Buffer.from(m[1], 'base64url').toString('utf8');
  return /^[A-Za-z0-9_-]{1,128}$/.test(uid) ? uid : null;
}

// ---------------------------------------------------------------- Firebase's ID token, checked here
let JWKS = { keys: null, until: 0 };
async function googleKeys(now) {
  if (JWKS.keys && now < JWKS.until) return JWKS.keys;
  const r = await fetch(JWKS_URL, { signal: AbortSignal.timeout(8000) });
  if (!r || !r.ok) throw new Error('keys');
  const j = await r.json();
  const cc = (r.headers && typeof r.headers.get === 'function' && r.headers.get('cache-control')) || '';
  const m = /max-age=(\d+)/.exec(cc);
  JWKS = { keys: isPlain(j) && Array.isArray(j.keys) ? j.keys : [], until: now + Math.min(21600, m ? +m[1] : 3600) * 1000 };
  return JWKS.keys;
}
export function _resetKeys() { JWKS = { keys: null, until: 0 }; }
export async function verifyIdToken(tok, project, now = Date.now()) {
  if (typeof tok !== 'string' || tok.length > 4096) return null;
  const parts = tok.split('.'); if (parts.length !== 3) return null;
  let h, p;
  try { h = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); p = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); } catch { return null; }
  if (!isPlain(h) || !isPlain(p) || h.alg !== 'RS256' || typeof h.kid !== 'string') return null;
  const keys = await googleKeys(now);
  const jwk = keys.find(k => isPlain(k) && k.kid === h.kid && k.kty === 'RSA');
  if (!jwk) return null;
  let ok = false;
  try { ok = rsaVerify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(parts[2], 'base64url')); } catch { ok = false; }
  if (!ok) return null;
  const s = Math.floor(now / 1000);
  if (p.aud !== project || p.iss !== 'https://securetoken.google.com/' + project) return null;
  if (!(typeof p.exp === 'number' && p.exp > s) || !(typeof p.iat === 'number' && p.iat <= s + 60)) return null;
  if (typeof p.auth_time === 'number' && p.auth_time > s + 60) return null;
  if (typeof p.sub !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(p.sub)) return null;
  if (p.email_verified !== true || typeof p.email !== 'string' || p.email.length > 254 || !/^[^@\s]{1,64}@[^@\s]{3,190}$/.test(p.email)) return null;
  return { uid: p.sub, email: p.email.toLowerCase() };
}

// ---------------------------------------------------------------- the plan as the page reads it
export function planOf(rec, email) {
  if (email && comps().has(String(email).toLowerCase())) return { full: true, status: 'comp', trialUsed: !!(rec && rec.trialUsed) };
  const p = rec && rec.plan;
  if (!isPlain(p)) return { full: false, status: 'none', trialUsed: !!(rec && rec.trialUsed) };
  return { full: FULL.has(p.status), status: String(p.status || 'none'), interval: p.interval || null, end: p.end || null, trialEnd: p.trialEnd || null,
    cancelAtEnd: !!p.cancelAtEnd, trialUsed: !!(rec && rec.trialUsed), billing: !!(rec && rec.customer) };
}

// ---------------------------------------------------------------- Stripe (raw requests, no SDK)
async function stripe(path, pairs, method = 'POST') {
  const res = await fetch('https://api.stripe.com/v1/' + path, {
    method, headers: { authorization: 'Bearer ' + STRIPE_KEY(), 'content-type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : new URLSearchParams(pairs || []).toString(), signal: AbortSignal.timeout(15000) });
  const data = await res.json().catch(() => null);
  return { ok: !!res.ok, status: res.status, data };
}
let PRICES = { at: 0, v: null };
export function _resetPrices() { PRICES = { at: 0, v: null }; }
async function prices(now) {
  if (!stripeMode() || !pricesSet()) return null;
  if (PRICES.v && now - PRICES.at < 600000) return PRICES.v;
  try {
    const [y, m] = await Promise.all([stripe('prices/' + PRICE.year(), null, 'GET'), stripe('prices/' + PRICE.month(), null, 'GET')]);
    const one = r => r.ok && isPlain(r.data) && Number.isInteger(r.data.unit_amount) && typeof r.data.currency === 'string' ? { amount: r.data.unit_amount, currency: r.data.currency.toLowerCase() } : null;
    const v = { year: one(y), month: one(m) };
    if (!v.year || !v.month) return null;
    PRICES = { at: now, v };
    return v;
  } catch { return null; }
}
const siteOf = request => { try { const u = new URL(request.url); return u.protocol === 'https:' ? u.origin : null; } catch { return null; } };

// ---------------------------------------------------------------- the operations
async function opSession(request, context, b) {
  if (!authOn()) return fail('auth-off', 503);
  const store = theStore(), now = Date.now();
  if (!(await bump(store, 'ses', clientTag(request, context), SESSION_HOUR, now))) return fail('limit', 429);
  let who = null;
  try { who = await verifyIdToken(b.idToken, FB_PROJECT(), now); } catch { return fail('keys-unavailable', 503); }
  if (!who) return fail('bad-token', 401);
  const rec = await upsert(store, 'a/' + who.uid, cur => isPlain(cur) ? (cur.email === who.email ? null : { ...cur, email: who.email, updated: now })
    : { v: 1, uid: who.uid, email: who.email, created: now, updated: now, customer: null, plan: null, trialUsed: false });
  logLine('session');
  return reply({ ok: true, fn: FN, session: mintSession(who.uid, now), email: who.email, plan: planOf(rec, who.email) });
}
async function account(b) {
  const uid = readSession(b.session); if (!uid) return { err: fail('bad-session', 401) };
  const rec = await theStore().get('a/' + uid, { type: 'json' });
  if (!isPlain(rec)) return { err: fail('no-account', 404) };
  return { uid, rec };
}
async function opPlan(request, context, b) {
  const a = await account(b); if (a.err) return a.err;
  if (!(await bump(theStore(), 'pln', a.uid, PLAN_HOUR, Date.now()))) return fail('limit', 429);
  return reply({ ok: true, fn: FN, email: a.rec.email, plan: planOf(a.rec, a.rec.email) });
}
async function opCheckout(request, context, b) {
  if (!checkoutOk()) return fail('billing-off', 409);
  const a = await account(b); if (a.err) return a.err;
  const interval = b.interval === 'month' ? 'month' : b.interval === 'year' ? 'year' : null;
  if (!interval) return fail('bad-input', 400, { field: 'interval' });
  const store = theStore(), now = Date.now();
  if (!(await bump(store, 'chk', a.uid, CHECKOUT_HOUR, now))) return fail('limit', 429);
  const plan = planOf(a.rec, a.rec.email);
  if (plan.full) return fail('already', 409);
  const site = siteOf(request); if (!site) return fail('bad-site', 400);
  let customer = a.rec.customer;
  if (!(typeof customer === 'string' && /^cus_[A-Za-z0-9]+$/.test(customer))) {
    const c = await stripe('customers', [['email', a.rec.email], ['metadata[uid]', a.uid]]);
    if (!c.ok || !isPlain(c.data) || !/^cus_[A-Za-z0-9]+$/.test(String(c.data.id || ''))) return fail('stripe-unavailable', 502);
    customer = c.data.id;
    await upsert(store, 'a/' + a.uid, cur => isPlain(cur) ? { ...cur, customer, updated: now } : null);
    await store.setJSON('c/' + customer, { uid: a.uid, at: now });
  }
  const pairs = [['mode', 'subscription'], ['customer', customer], ['client_reference_id', a.uid],
    ['line_items[0][price]', PRICE[interval]()], ['line_items[0][quantity]', '1'],
    ['success_url', site + '/?plan=done'], ['cancel_url', site + '/?plan=back'],
    ['payment_method_collection', 'always'], ['allow_promotion_codes', 'true'], ['subscription_data[metadata][uid]', a.uid]];
  if (!a.rec.trialUsed) pairs.push(['subscription_data[trial_period_days]', String(TRIAL_DAYS)]);
  const s = await stripe('checkout/sessions', pairs);
  if (!s.ok || !isPlain(s.data) || typeof s.data.url !== 'string' || !/^https:\/\/checkout\.stripe\.com\//.test(s.data.url)) return fail('stripe-unavailable', 502);
  logLine('checkout');
  return reply({ ok: true, fn: FN, url: s.data.url });
}
async function opPortal(request, context, b) {
  if (!stripeMode()) return fail('billing-off', 409);
  const a = await account(b); if (a.err) return a.err;
  if (!(typeof a.rec.customer === 'string' && /^cus_[A-Za-z0-9]+$/.test(a.rec.customer))) return fail('no-customer', 409);
  if (!(await bump(theStore(), 'prt', a.uid, PORTAL_HOUR, Date.now()))) return fail('limit', 429);
  const site = siteOf(request); if (!site) return fail('bad-site', 400);
  const s = await stripe('billing_portal/sessions', [['customer', a.rec.customer], ['return_url', site + '/?plan=portal']]);
  if (!s.ok || !isPlain(s.data) || typeof s.data.url !== 'string' || !/^https:\/\/billing\.stripe\.com\//.test(s.data.url)) return fail('stripe-unavailable', 502);
  return reply({ ok: true, fn: FN, url: s.data.url });
}

export default async (request, context) => {
  try {
    if (request.method === 'GET') {
      const fb = authOn() ? { apiKey: FB_KEY(), authDomain: FB_PROJECT() + '.firebaseapp.com', projectId: FB_PROJECT() } : null;
      return reply({ fn: FN, auth: !!fb, fb, billing: billingOn() ? 'on' : 'off', mode: stripeMode(), checkout: checkoutOk(), trialDays: TRIAL_DAYS, prices: await prices(Date.now()) });
    }
    if (request.method !== 'POST') return reply({ ok: false, code: 'method' }, 405);
    const raw = await request.text();
    if (raw.length > MAX_BODY) return fail('too-large', 413);
    let b; try { b = JSON.parse(raw); } catch { return fail('bad-json', 400); }
    if (!isPlain(b)) return fail('bad-json', 400);
    if (b.op === 'session') return await opSession(request, context, b);
    if (b.op === 'plan') return await opPlan(request, context, b);
    if (b.op === 'checkout') return await opCheckout(request, context, b);
    if (b.op === 'portal') return await opPortal(request, context, b);
    return fail('bad-op', 400);
  } catch (e) {
    logLine('error');
    return reply({ ok: false, code: 'unavailable' }, 502);
  }
};
