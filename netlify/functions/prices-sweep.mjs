// Terrain · Find prices, the daily sweep.                             prices-sweep-1.0
//
// Runs once a day on Netlify's scheduler (the `config` export below). No URL reaches it in production. In the store
// "terrain-prices" (advise.mjs mode 'prices' and advise-prices.mjs) it deletes:
//   j/<job>                 a price search's job and its result, 7 days after it was made (the page keeps what he used);
//   c/dev|reg|site/<day>/…  the daily counters, 2 days after their UTC day;
//   c/ip|ipsalt/<hour>…     the hourly counters and the hour's salt, 2 days after their hour.
// Nothing is read or logged beyond the keys, a job's `created` time and the counts of what was deleted.

import { getStore } from '@netlify/blobs';

export const config = { schedule: '@daily' };

const STORE_NAME = 'terrain-prices';
const JOB_DAYS = 7, COUNTER_DAYS = 2;
const BUDGET_MS = 20000;   // scheduled functions get 30 s; the rest waits for tomorrow
const RE_JOB = /^j\/[A-Za-z0-9_-]{22}$/;
const RE_DAYC = /^c\/(?:dev|reg|site)\/(\d{4}-\d{2}-\d{2})(?:\/[A-Za-z0-9_-]{1,64})?$/;
const RE_HOURC = /^c\/(?:ip|ipsalt)\/(\d{4}-\d{2}-\d{2})T(\d{2})(?:\/[0-9a-f]{16})?$/;

function theStore() {
  if (globalThis.__terrainPricesStore) return globalThis.__terrainPricesStore;
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}
async function keysUnder(store, prefix) {
  const l = await store.list({ prefix });
  return ((l && l.blobs) || []).map(b => b.key);
}

export async function sweep(store, now = Date.now(), started = Date.now()) {
  const out = { jobs: 0, counters: 0, kept: 0, left: false };
  const late = () => Date.now() - started > BUDGET_MS;
  for (const k of await keysUnder(store, 'c/')) {
    if (late()) { out.left = true; break; }
    let t = null, m;
    if ((m = RE_DAYC.exec(k))) t = Date.parse(m[1] + 'T00:00:00Z') + 864e5;
    else if ((m = RE_HOURC.exec(k))) t = Date.parse(m[1] + 'T' + m[2] + ':00:00Z') + 3600e3;
    if (t == null || !Number.isFinite(t)) { out.kept++; continue; }   // not ours: never touched
    if (now - t > COUNTER_DAYS * 864e5) { await store.delete(k); out.counters++; } else out.kept++;
  }
  for (const k of await keysUnder(store, 'j/')) {
    if (late()) { out.left = true; break; }
    if (!RE_JOB.test(k)) { out.kept++; continue; }
    let rec = null; try { rec = await store.get(k, { type: 'json' }); } catch { rec = null; }
    const created = rec && typeof rec.created === 'number' ? rec.created : 0;
    if (!created || now - created > JOB_DAYS * 864e5) { await store.delete(k); out.jobs++; } else out.kept++;
  }
  return out;
}

export default async () => {
  try {
    const r = await sweep(theStore());
    console.log('[prices-sweep] ' + JSON.stringify({ fn: 'prices-sweep-1.0', ...r }));
  } catch (e) {
    console.log('[prices-sweep] ' + JSON.stringify({ fn: 'prices-sweep-1.0', ok: false }));
  }
  return new Response(null, { status: 204 });
};
