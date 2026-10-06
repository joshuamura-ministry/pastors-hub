// Terrain · accounts, the daily sweep.                                  account-sweep-1.0
//
// Runs once a day on Netlify's scheduler. In the store "terrain-accounts" (account.mjs, stripe-webhook.mjs) it deletes:
//   e/<event>                a Stripe event's "acted on once" mark, 30 days after it arrived (Stripe stops resending after 3 days);
//   r/<hour>/<kind>/<tag>    the hourly counters, 2 days after their hour.
// Accounts (a/) and customer links (c/) are never touched. Nothing is read or logged beyond the keys, the marks' times and counts.

import { getStore } from '@netlify/blobs';

export const config = { schedule: '@daily' };
const EVENT_DAYS = 30, COUNTER_DAYS = 2, BUDGET_MS = 20000;
const RE_EVT = /^e\/evt_[A-Za-z0-9]+$/, RE_CNT = /^r\/(\d{4}-\d{2}-\d{2})T(\d{2})\/[a-z]{3}\/[0-9a-f]{16}$/;
function theStore() {
  if (globalThis.__terrainAccountsStore) return globalThis.__terrainAccountsStore;
  return getStore({ name: 'terrain-accounts', consistency: 'strong' });
}
async function keysUnder(store, prefix) { const l = await store.list({ prefix }); return ((l && l.blobs) || []).map(b => b.key); }
export async function sweep(store, now = Date.now(), started = Date.now()) {
  const out = { events: 0, counters: 0, kept: 0, left: false };
  const late = () => Date.now() - started > BUDGET_MS;
  for (const k of await keysUnder(store, 'r/')) {
    if (late()) { out.left = true; break; }
    const m = RE_CNT.exec(k); if (!m) { out.kept++; continue; }
    const t = Date.parse(m[1] + 'T' + m[2] + ':00:00Z') + 3600e3;
    if (now - t > COUNTER_DAYS * 864e5) { await store.delete(k); out.counters++; } else out.kept++;
  }
  for (const k of await keysUnder(store, 'e/')) {
    if (late()) { out.left = true; break; }
    if (!RE_EVT.test(k)) { out.kept++; continue; }
    let rec = null; try { rec = await store.get(k, { type: 'json' }); } catch { rec = null; }
    const at = rec && typeof rec.at === 'number' ? rec.at : 0;
    if (!at || now - at > EVENT_DAYS * 864e5) { await store.delete(k); out.events++; } else out.kept++;
  }
  return out;
}
export default async () => {
  try { const r = await sweep(theStore()); console.log('[account-sweep] ' + JSON.stringify({ fn: 'account-sweep-1.0', ...r })); }
  catch { console.log('[account-sweep] ' + JSON.stringify({ fn: 'account-sweep-1.0', ok: false })); }
  return new Response(null, { status: 204 });
};
