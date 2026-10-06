// Terrain · Stripe's word on a plan.                                  stripe-webhook-1.0
//
// v10.54.0 (DESIGN-PRODUCT.md). Stripe calls this when a pastor finishes Checkout and whenever a subscription changes (started,
// trial, renewed, card failed, switched, cancelled). Each call is checked before anything is read: the Stripe-Signature header is an
// HMAC-SHA256 of "<time>.<body>" keyed by STRIPE_WEBHOOK_SECRET, compared in constant time, and the time must be within 5 minutes
// (an old call sent again is refused). Each event is acted on once (e/<event id>, a create-only write). Nothing else in the request
// is trusted: the account is found by our own link (c/<customer>, written when Checkout began) or the subscription's own metadata
// (uid, set by account.mjs), and an older event never overwrites a newer plan.
//
// Events: checkout.session.completed (the customer joined to the account), customer.subscription.created / updated / deleted (the
// plan: status, yearly or monthly, the period's end, the trial's end, cancel at the period's end). Everything else: 200, ignored.
// Store: Netlify Blobs "terrain-accounts" (account.mjs). Logs: the event's type and a code only.

import { getStore } from '@netlify/blobs';
import { createHmac, timingSafeEqual } from 'node:crypto';

const FN = 'stripe-webhook-1.0';
const TOLERANCE_S = 300, MAX_BODY = 512 * 1024;
const env = k => String(process.env[k] || '').trim().replace(/^["']+|["']+$/g, '').trim();
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
function logLine(o) { try { console.log('[stripe-webhook] ' + JSON.stringify({ fn: FN, ...o })); } catch { /* never throws */ } }
function theStore() {
  if (globalThis.__terrainAccountsStore) return globalThis.__terrainAccountsStore;
  return getStore({ name: 'terrain-accounts', consistency: 'strong' });
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

// "t=<time>,v1=<sig>[,v1=<sig>…]" → true when one v1 is the HMAC of "<time>.<body>" and the time is close to now
export function signatureOk(header, raw, secret, now = Date.now()) {
  if (typeof header !== 'string' || header.length > 2000 || !secret) return false;
  const parts = header.split(',').map(s => s.trim().split('=')), t = parts.find(p => p[0] === 't');
  if (!t || !/^\d{1,12}$/.test(t[1] || '')) return false;
  if (Math.abs(Math.floor(now / 1000) - +t[1]) > TOLERANCE_S) return false;
  const want = createHmac('sha256', secret).update(t[1] + '.' + raw, 'utf8').digest();
  return parts.filter(p => p[0] === 'v1' && /^[0-9a-f]{64}$/.test(p[1] || '')).some(p => { const got = Buffer.from(p[1], 'hex'); return got.length === want.length && timingSafeEqual(got, want); });
}

const RE_CUS = /^cus_[A-Za-z0-9]+$/, RE_SUB = /^sub_[A-Za-z0-9]+$/, RE_UID = /^[A-Za-z0-9_-]{1,128}$/;
export function planFrom(sub, at) {
  const item = isPlain(sub.items) && Array.isArray(sub.items.data) && isPlain(sub.items.data[0]) ? sub.items.data[0] : {};
  const price = isPlain(item.price) ? item.price : isPlain(sub.plan) ? sub.plan : {};
  const iv = isPlain(price.recurring) ? price.recurring.interval : price.interval;
  const end = Number.isInteger(sub.current_period_end) ? sub.current_period_end : Number.isInteger(item.current_period_end) ? item.current_period_end : null;
  const status = ['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'].includes(sub.status) ? sub.status : 'unknown';
  return { sub: sub.id, status, interval: iv === 'year' ? 'year' : iv === 'month' ? 'month' : null, end: end ? end * 1000 : null,
    trialEnd: Number.isInteger(sub.trial_end) ? sub.trial_end * 1000 : null, cancelAtEnd: !!sub.cancel_at_period_end, at };
}
const LIVE = new Set(['active', 'trialing', 'past_due']);
async function uidFor(store, customer, meta) {
  if (isPlain(meta) && typeof meta.uid === 'string' && RE_UID.test(meta.uid)) return meta.uid;
  if (typeof customer === 'string' && RE_CUS.test(customer)) { const c = await store.get('c/' + customer, { type: 'json' }); if (isPlain(c) && RE_UID.test(String(c.uid || ''))) return c.uid; }
  return null;
}

export async function handle(evt) {
  const store = theStore(), o = isPlain(evt.data) && isPlain(evt.data.object) ? evt.data.object : null;
  if (!o) return 'ignored';
  const at = Number.isInteger(evt.created) ? evt.created * 1000 : Date.now();
  if (evt.type === 'checkout.session.completed') {
    const uid = typeof o.client_reference_id === 'string' && RE_UID.test(o.client_reference_id) ? o.client_reference_id : null;
    if (!uid || !RE_CUS.test(String(o.customer || ''))) return 'ignored';
    const rec = await upsert(store, 'a/' + uid, cur => isPlain(cur) ? (cur.customer === o.customer ? null : { ...cur, customer: o.customer, updated: Date.now() }) : null);
    if (!isPlain(rec)) return 'no-account';
    await store.setJSON('c/' + o.customer, { uid, at: Date.now() });
    return 'linked';
  }
  if (/^customer\.subscription\.(created|updated|deleted)$/.test(evt.type)) {
    if (!RE_SUB.test(String(o.id || ''))) return 'ignored';
    const uid = await uidFor(store, o.customer, o.metadata); if (!uid) return 'no-account';
    const next = planFrom(o, at);
    if (evt.type === 'customer.subscription.deleted') next.status = 'canceled';
    let applied = false;
    const rec = await upsert(store, 'a/' + uid, cur => {
      if (!isPlain(cur)) return null;
      const p = isPlain(cur.plan) ? cur.plan : null;
      if (p && p.sub === next.sub && typeof p.at === 'number' && p.at > at) return null;          // an older event: the newer plan stands
      if (p && p.sub !== next.sub && LIVE.has(p.status) && !LIVE.has(next.status)) return null;   // another, ended subscription: the live one stands
      applied = true;
      return { ...cur, plan: next, trialUsed: !!(cur.trialUsed || next.status === 'trialing' || next.trialEnd),
        customer: cur.customer || (RE_CUS.test(String(o.customer || '')) ? o.customer : null), updated: Date.now() };
    });
    if (!isPlain(rec)) return 'no-account';
    return applied ? 'plan' : 'stale';
  }
  return 'ignored';
}

export default async (request) => {
  try {
    if (request.method !== 'POST') return reply({ ok: false }, 405);
    const secret = env('STRIPE_WEBHOOK_SECRET');
    if (!/^whsec_[A-Za-z0-9+/=_-]{10,}$/.test(secret)) { logLine({ code: 'no-secret' }); return reply({ ok: false, code: 'no-secret' }, 503); }
    const raw = await request.text();
    if (raw.length > MAX_BODY) return reply({ ok: false }, 413);
    if (!signatureOk(request.headers.get('stripe-signature'), raw, secret)) { logLine({ code: 'bad-signature' }); return reply({ ok: false, code: 'bad-signature' }, 400); }
    let evt; try { evt = JSON.parse(raw); } catch { return reply({ ok: false }, 400); }
    if (!isPlain(evt) || !/^evt_[A-Za-z0-9]+$/.test(String(evt.id || '')) || typeof evt.type !== 'string') return reply({ ok: false }, 400);
    const store = theStore();
    const w = await store.setJSON('e/' + evt.id, { at: Date.now(), type: evt.type.slice(0, 60) }, { onlyIfNew: true });
    if (w && w.modified === false) { logLine({ type: evt.type, code: 'again' }); return reply({ received: true, again: true }); }
    let code;
    try { code = await handle(evt); }
    catch (e) { await store.delete('e/' + evt.id); logLine({ type: evt.type, code: 'error' }); return reply({ ok: false }, 500); }   // Stripe sends it again
    logLine({ type: evt.type, code });
    return reply({ received: true });
  } catch {
    logLine({ code: 'error' });
    return reply({ ok: false }, 500);
  }
};
