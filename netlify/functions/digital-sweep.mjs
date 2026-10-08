// Terrain · Digital footprint, the monthly refresh.                       digital-sweep-1.1
//
// v10.60.0. On the 1st of each month (Netlify's scheduler, the `config` export below; no URL reaches it in production) every conference
// a registered pastor opened in the last 60 days is read again (o/<slug>), when its findings are older than 25 days and no reading
// is running; Google's data is kept no longer than that month (its rule). Conferences nobody opened in 180 days are forgotten (their
// findings and readings deleted); the month counters older than two months go. Scheduled functions get 30 s: it stops at 20.
// v10.62.0 (digital-sweep-1.1): a forgotten conference's texts (x/<slug>/<org>, digital-read-1.2) and kept reviews (v/<slug>/<org>/<lang>,
// digital-1.2) go with its findings; the review's jobs (q/) after 7 days, its locks (l/) after a day, its day counters (c/site/, c/reg/) after 2.

import { CONF_ORG, slugOf, theStore } from './digital-read.mjs';
import { start, allowed } from './digital.mjs';

export const config = { schedule: '0 7 1 * *' };
export const FN = 'digital-sweep-1.1';
const BUDGET_MS = 20000;
const now = () => (globalThis.__terrainDigitalNow ? globalThis.__terrainDigitalNow() : Date.now());

export async function sweep(base) {
  const store = theStore(), t0 = now(), out = { started: 0, forgotten: 0, counters: 0 };
  const day = d => new Date(t0 - d * 864e5).toISOString().slice(0, 10);
  const { blobs } = await store.list({ prefix: 'o/' });
  const byName = Object.fromEntries(Object.keys(CONF_ORG).map(n => [slugOf(n), n]));
  for (const { key } of blobs) {
    if (now() - t0 > BUDGET_MS) break;
    const slug = key.slice(2), conf = byName[slug]; if (!conf) continue;
    const o = await store.get(key, { type: 'json' }); if (!o || !o.at) continue;
    if (o.at < day(180)) {
      for (const p of ['c/' + slug, 'j/' + slug, 't/' + slug, key]) await store.delete(p);
      const r = await store.list({ prefix: `r/${slug}/` }); for (const x of r.blobs) await store.delete(x.key);
      const x = await store.list({ prefix: `x/${slug}/` }); for (const y of x.blobs) await store.delete(y.key);   // v10.62.0: the review's texts
      const v = await store.list({ prefix: `v/${slug}/` }); for (const y of v.blobs) await store.delete(y.key);   // v10.62.0: its kept reviews
      out.forgotten++; continue;
    }
    if (o.at < day(60) || !allowed(conf)) continue;
    const c = await store.get('c/' + slug, { type: 'json' });
    if (c && c.at && t0 - c.at < 25 * 864e5) continue;
    if ((await start(store, base, conf)) === 'queued') out.started++;
  }
  const m = await store.list({ prefix: 'm/' }), keepFrom = new Date(t0 - 62 * 864e5).toISOString().slice(0, 7);
  for (const { key } of m.blobs) if (key.slice(2, 9) < keepFrom) { await store.delete(key); out.counters++; }
  const a = await store.list({ prefix: 'a/' });
  for (const { key } of a.blobs) if (key.slice(2, 12) < day(2)) await store.delete(key);
  // v10.62.0: the in-depth review's jobs, locks and day counters (digital-1.2); the findings' own c/<slug> keys are never under these prefixes
  for (const [prefix, days, field] of [['q/', 7, 'created'], ['l/', 1, 'created']]) {
    const { blobs } = await store.list({ prefix });
    for (const { key } of blobs) { if (now() - t0 > BUDGET_MS) break; const j = await store.get(key, { type: 'json' }); if (!j || !(j[field] > t0 - days * 864e5)) await store.delete(key); }
  }
  for (const prefix of ['c/site/', 'c/reg/']) { const { blobs } = await store.list({ prefix }); for (const { key } of blobs) if (key.slice(prefix.length, prefix.length + 10) < day(2)) await store.delete(key); }
  return out;
}

export default async () => {
  try {
    const base = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://terrain.church';
    const out = await sweep(base);
    console.log(JSON.stringify({ fn: FN, ok: true, ...out }));
  } catch { console.log(JSON.stringify({ fn: FN, ok: false })); }
  return new Response(null, { status: 204 });
};
