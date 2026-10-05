// Terrain · Spiritual Gifts retention sweep.                       gifts-sweep-1.1
//
// Runs once a day on Netlify's scheduler (the `config` export below). No URL
// reaches it in production. It keeps the promise made to every member: adults'
// results are kept two years and under-18s' one year, and then deleted, even
// if nobody ever opens that campaign again.
//
// gifts.mjs writes an empty marker beside every result:
//   x/<YYYY-MM-DD>/<pub>/<rid>     the UTC day the result expires
// This lists the markers, deletes each result whose day has passed, then the
// marker. On the day itself it reads the result and deletes it only once its
// time is up. Nothing is read or logged beyond the keys.
//
// Then, with whatever time is left (gifts-sweep-1.1):
//   - a campaign (c/<pub>) that has never received a result and that nobody
//     has opened for 30 days (neither a member through its link nor its pastor:
//     `seen`, or `created` when it was never opened) is deleted. Creating one
//     needs no result, so without this an unused or junk campaign, and the
//     church text it carries, would be kept for ever.
//   - the per-client counters and day keys of earlier UTC days go, in this
//     store (g/cid/<day>/…, g/salt/<day>) and in register.mjs's store
//     "terrain-registrations" (g/reg/<hour>/…, g/adm/<hour>/…, g/sin/<hour>/…, g/salt/<day>).

import { getStore } from '@netlify/blobs';

export const config = { schedule: '@daily' };

const STORE_NAME = 'terrain-gifts';
const REG_STORE_NAME = 'terrain-registrations';
const RE_MARK = /^x\/(\d{4}-\d{2}-\d{2})\/([A-Za-z0-9_-]{12})\/([A-Za-z0-9_-]{12})$/;
const RE_CAMP = /^c\/([A-Za-z0-9_-]{12})$/;
// Only these counters: gifts.mjs's own g/ip and g/sends are not by-day keys.
const RE_COUNTER = /^g\/(?:cid|reg|adm|sin|salt)\/(\d{4}-\d{2}-\d{2})(?:T\d{2})?(?:\/[A-Za-z0-9_-]{1,64})?$/;
const UNUSED_DAYS = 30;
const BUDGET_MS = 20000;   // scheduled functions get 30 s; the rest waits for tomorrow

function theStore() {
  if (globalThis.__terrainGiftsStore) return globalThis.__terrainGiftsStore;
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}
function regStore() {
  if (globalThis.__terrainRegStore) return globalThis.__terrainRegStore;
  return getStore({ name: REG_STORE_NAME, consistency: 'strong' });
}

// Run fn over items, n at a time, until the time budget is spent. Returns how
// many were left for tomorrow.
async function pool(items, n, started, fn) {
  let i = 0, left = 0;
  const worker = async () => {
    while (i < items.length) {
      if (Date.now() - started > BUDGET_MS) { left++; i++; continue; }
      await fn(items[i++]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return left;
}

async function sweep(store, now = Date.now(), started = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  const l = await store.list({ prefix: 'x/' });
  const due = [];
  for (const b of (l && l.blobs) || []) {
    const m = RE_MARK.exec(b.key);
    if (m && m[1] <= today) due.push({ key: b.key, day: m[1], rk: `r/${m[2]}/${m[3]}` });
  }
  let deleted = 0;
  const left = await pool(due, 16, started, async d => {
    if (d.day === today) {
      // Due today: only once the moment has actually passed.
      const rec = await store.get(d.rk, { type: 'json' });
      if (rec && typeof rec === 'object' && typeof rec.expires === 'number' && rec.expires > now) return;
    }
    await store.delete(d.rk);
    await store.delete(d.key);
    deleted++;
  });
  return { deleted, left };
}

// Campaigns nobody has used: never a result, and not opened for 30 days.
async function sweepCampaigns(store, now = Date.now(), started = Date.now()) {
  const cutoff = new Date(now - UNUSED_DAYS * 864e5).toISOString().slice(0, 10);
  const l = await store.list({ prefix: 'c/' });
  const pubs = ((l && l.blobs) || []).map(b => RE_CAMP.exec(b.key)).filter(Boolean).map(m => m[1]);
  let campaigns = 0;
  const left = await pool(pubs, 16, started, async pub => {
    const c = await store.get('c/' + pub, { type: 'json' });
    if (!c || typeof c !== 'object' || (c.subs && typeof c.subs === 'object')) return;
    const last = typeof c.seen === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.seen) ? c.seen
      : (typeof c.created === 'number' ? new Date(c.created).toISOString().slice(0, 10) : '');
    if (!last || last >= cutoff) return;
    // Belt and braces: a campaign with any result on file is never deleted here.
    const r = await store.list({ prefix: `r/${pub}/` });
    if (((r && r.blobs) || []).length) return;
    await store.delete('c/' + pub);
    campaigns++;
  });
  return { campaigns, left };
}

// Per-client counters and day keys from before today.
async function sweepCounters(store, now = Date.now(), started = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  const l = await store.list({ prefix: 'g/' });
  const old = ((l && l.blobs) || []).map(b => b.key).filter(k => { const m = RE_COUNTER.exec(k); return m && m[1] < today; });
  let counters = 0;
  const left = await pool(old, 16, started, async k => { await store.delete(k); counters++; });
  return { counters, left };
}

export default async () => {
  try {
    const started = Date.now(), now = Date.now();
    const store = theStore();
    const r = await sweep(store, now, started);
    const c = await sweepCampaigns(store, now, started);
    const g1 = await sweepCounters(store, now, started);
    // The registrations store may not exist yet on a site that has never had
    // one; its tidying never stands in the way of the rest.
    let g2 = { counters: 0, left: 0 };
    try { g2 = await sweepCounters(regStore(), now, started); } catch { console.error('gifts-sweep: registration counters skipped'); }
    return new Response(JSON.stringify({ ok: true, deleted: r.deleted, left: r.left + c.left + g1.left + g2.left,
      campaigns: c.campaigns, counters: g1.counters + g2.counters }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store, max-age=0' }
    });
  } catch {
    console.error('gifts-sweep: failed');
    return new Response(JSON.stringify({ ok: false }), {
      status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store, max-age=0' }
    });
  }
};
