// Terrain · Connection cards retention sweep.                   connect-sweep-1.0
//
// Runs once a day on Netlify's scheduler (the `config` export below). No URL
// reaches it in production. It keeps the promise printed on every card: what a
// person sends is kept at most a year (and 30 days after the pastor's device
// has it), then deleted, even if nobody ever opens that card again.
//
// connect.mjs writes an empty marker beside every response and tombstone:
//   x/<YYYY-MM-DD>/r/<CID>/<RID>     the UTC day the response expires
//   x/<YYYY-MM-DD>/t/<CID>/<RID>     the UTC day the tombstone expires
// This lists the markers and deletes each blob whose day has passed, then the
// marker. On the day itself it reads a response and deletes it only once its
// time is up. A marker whose card no longer exists (the card was removed while
// a response was on its way) takes its blob with it at once.
//
// Then, with whatever time is left:
//   - a card (c/<CID>) with no response on file, that nobody has opened for 30
//     days (neither a phone nor its pastor: `seen`), whose last response (if
//     any) and whose event day (if any) are 30 days past, is deleted, with any
//     tombstones. A card printed weeks before its event is therefore kept until
//     30 days after the event.
// Nothing is read or logged beyond the keys and those dates.

import { getStore } from '@netlify/blobs';

export const config = { schedule: '@daily' };

const STORE_NAME = 'terrain-connect';
const RE_MARK = /^x\/(\d{4}-\d{2}-\d{2})\/([rt])\/([ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10})\/([A-Za-z0-9_-]{12})$/;
const RE_CARD = /^c\/([ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10})$/;
const UNUSED_DAYS = 30;
const BUDGET_MS = 20000;   // scheduled functions get 30 s; the rest waits for tomorrow

function theStore() {
  if (globalThis.__terrainConnectStore) return globalThis.__terrainConnectStore;
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const utcDay = t => new Date(t).toISOString().slice(0, 10);

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

export async function sweep(store, now = Date.now(), started = Date.now()) {
  const today = utcDay(now);
  const l = await store.list({ prefix: 'x/' });
  const marks = [];
  for (const b of (l && l.blobs) || []) {
    const m = RE_MARK.exec(b.key);
    if (m) marks.push({ key: b.key, day: m[1], kind: m[2], cid: m[3], blob: `${m[2]}/${m[3]}/${m[4]}` });
  }
  // Which cards still exist (one read per card, not per marker).
  const cards = new Map();
  const cardExists = async cid => {
    if (!cards.has(cid)) cards.set(cid, store.get('c/' + cid, { type: 'json' }).then(c => c !== null).catch(() => true));
    return cards.get(cid);
  };
  let deleted = 0, orphans = 0;
  const left = await pool(marks, 16, started, async d => {
    const due = d.day <= today;
    const orphan = !(await cardExists(d.cid));
    if (!due && !orphan) return;
    if (due && !orphan && d.day === today && d.kind === 'r') {
      // Due today: only once the moment has actually passed.
      const rec = await store.get(d.blob, { type: 'json' });
      if (isPlain(rec) && typeof rec.expires === 'number' && rec.expires > now) return;
    }
    await store.delete(d.blob);
    await store.delete(d.key);
    if (orphan && !due) orphans++; else deleted++;
  });
  return { deleted, orphans, left };
}

// Cards nobody uses any more.
export async function sweepCards(store, now = Date.now(), started = Date.now()) {
  const cutoff = utcDay(now - UNUSED_DAYS * 864e5);
  const l = await store.list({ prefix: 'c/' });
  const cids = ((l && l.blobs) || []).map(b => RE_CARD.exec(b.key)).filter(Boolean).map(m => m[1]);
  let removed = 0;
  const left = await pool(cids, 16, started, async cid => {
    const c = await store.get('c/' + cid, { type: 'json' });
    if (!isPlain(c)) return;
    const days = [
      typeof c.seen === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.seen) ? c.seen : '',
      typeof c.created === 'number' ? utcDay(c.created) : '',
      typeof c.last === 'number' && c.last > 0 ? utcDay(c.last) : '',
      typeof c.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.day) ? c.day : ''
    ].filter(Boolean).sort();
    const latest = days[days.length - 1] || '';
    if (!latest || latest >= cutoff) return;
    // Belt and braces: a card with any response on file is never deleted here.
    const r = await store.list({ prefix: `r/${cid}/` });
    if (((r && r.blobs) || []).length) return;
    const t = await store.list({ prefix: `t/${cid}/` });
    for (const b of (t && t.blobs) || []) await store.delete(b.key);   // their markers go on their own day
    await store.delete('c/' + cid);
    removed++;
  });
  return { removed, left };
}

export default async () => {
  try {
    const started = Date.now(), now = Date.now();
    const store = theStore();
    const r = await sweep(store, now, started);
    const c = await sweepCards(store, now, started);
    return new Response(JSON.stringify({ ok: true, deleted: r.deleted, orphans: r.orphans, cards: c.removed, left: r.left + c.left }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store, max-age=0' }
    });
  } catch {
    console.error('connect-sweep: failed');
    return new Response(JSON.stringify({ ok: false }), {
      status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store, max-age=0' }
    });
  }
};
