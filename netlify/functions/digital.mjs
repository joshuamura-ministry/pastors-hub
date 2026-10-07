// Terrain · Digital footprint, what registered pastors ask for.          digital-1.1
//
// v10.60.0 (DESIGN-DIGITAL.md). The page's part of "Compare your churches": every church of the pastor's conference, read from public
// pages by digital-read.mjs (a background function) and kept in Netlify Blobs (store "terrain-digital"). The findings name real
// churches, so they are given only to a registered pastor (the registration token, as census.mjs and gifts.mjs ask), never from a
// public file. The pastor (7 Oct 2026): every registered pastor sees every church of his conference; the report is for his own.
//
//   GET  ?conf=<name>                          → { ok, fn, conf, supported, enabled, state: none|reading|ready, reading, findings }
//   POST { op:'read', conf }                   → 202 { state:'reading' } (a reading queued) · 200 { state:'ready' } (fresh already)
//   POST { op:'again', conf, org }             → 202 one church read again ("Check again"; 3 a registration a day)
//   GET  (no conf)                             → { ok, fn, places, search } (is Google's listing read? is the search set?)
//
// v10.60.1 (digital-1.1): `warm(store, base, conf)` starts the same reading when a pastor registers or signs in (register.mjs), so the
// first pastor of a conference never waits the hour on Compare your churches (the pastor: "yes as soon as they sign up for sure").
//
// Store keys: c/<slug> findings · j/<slug> the job (see digital-read.mjs) · e/<org> an official entry · r/<slug>/<org> a reading ·
// o/<slug> the day a conference was last opened (the monthly sweep reads those opened in 60 days) · t/<slug> the last start ·
// a/<day>/<reg> "Check again" counts · m/<month>/places, m/<month>/search the month's paid lookups.
//
// Environment: TERRAIN_REG_SECRET (as everywhere), DIGITAL_CONFS (the conferences that may be read, comma-separated; default
// "Pennsylvania"; "*" all), GOOGLE_PLACES_KEY, BRAVE_SEARCH_KEY (read by digital-read.mjs; here only said yes or no).

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { CONF_ORG, slugOf, sha, theStore, FN as READ_FN } from './digital-read.mjs';

export const FN = 'digital-1.1';
const FRESH_DAYS = 25, START_GAP_MS = 6 * 3600e3, STALL_MS = 4 * 60e3, AGAIN_DAY_MAX = 3;
const now = () => (globalThis.__terrainDigitalNow ? globalThis.__terrainDigitalNow() : Date.now());
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' } });

// the registration (the same token census.mjs and gifts.mjs check)
const TOKEN_DAYS = 180;
const RE_REGTOK = /^r1\.([A-Za-z0-9_-]{12})\.([0-9a-z]{1,9})\.([A-Za-z0-9_-]{32})$/;
const regSecret = () => { const v = (process.env.TERRAIN_REG_SECRET || '').trim(); return v.length >= 32 ? v : ''; };
export function regId(tok) {
  const secret = regSecret(), m = RE_REGTOK.exec(String(tok || '').trim());
  if (!secret) return 'open';
  if (!m) return null;
  const iat = parseInt(m[2], 36) * 1000, t = now();
  if (!Number.isFinite(iat) || iat > t + 5 * 60e3 || t - iat > TOKEN_DAYS * 864e5) return null;
  const want = createHmac('sha256', secret).update(`terrain-reg|r1|${m[1]}|${m[2]}`, 'utf8').digest('base64url').slice(0, 32);
  return timingSafeEqual(Buffer.from(want), Buffer.from(m[3])) ? m[1] : null;
}
export const allowed = conf => {
  const v = (process.env.DIGITAL_CONFS || 'Pennsylvania').split(',').map(s => s.trim()).filter(Boolean);
  return v.includes('*') || v.includes(conf);
};
const rand = n => randomBytes(n).toString('base64url');
async function wake(base, slug, worker) {
  try {
    const r = await fetch(new URL('/.netlify/functions/digital-read', base), { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, worker }), signal: AbortSignal.timeout(5000) });
    return !!r && r.status === 202;
  } catch { return false; }
}
async function getM(store, key) {
  if (typeof store.getWithMetadata === 'function') { const r = await store.getWithMetadata(key, { type: 'json' }); return r ? { data: r.data, etag: r.etag } : null; }
  const d = await store.get(key, { type: 'json' }); return d ? { data: d, etag: null } : null;
}
const running = j => !!j && j.status === 'running';
/* a reading that stopped (a wake lost, an instance gone): a new worker token, woken again, at most every 10 minutes */
async function rescue(store, base, slug, got) {
  const j = got.data, t = now();
  if (!running(j) || (j.lease && j.lease > t) || (j.touched || j.created || 0) > t - STALL_MS || (j.rescued || 0) > t - 10 * 60e3) return false;
  const worker = rand(32), w = await store.setJSON('j/' + slug, { ...j, workerHash: sha(worker), rescued: t, lease: 0 }, got.etag ? { onlyIfMatch: got.etag } : {});
  if (w && w.modified === false) return false;
  return wake(base, slug, worker);
}
export async function start(store, base, conf, extra = {}) {
  const slug = slugOf(conf), org = CONF_ORG[conf], t = now();
  const cur = await getM(store, 'j/' + slug);
  if (cur && running(cur.data)) return 'reading';
  const worker = rand(32);
  const job = { v: 1, status: 'running', conf, org, slug, phase: 'list', i: 0, workerHash: sha(worker), created: t, touched: t, ...extra };
  const w = cur ? await store.setJSON('j/' + slug, job, cur.etag ? { onlyIfMatch: cur.etag } : {}) : await store.setJSON('j/' + slug, job, { onlyIfNew: true });
  if (w && w.modified === false) return 'reading';
  await store.setJSON('t/' + slug, { at: t });
  await wake(base, slug, worker);
  return 'queued';
}

/* a reading when one is due: 'ready' (findings under 25 days), 'reading' (one running, or started now), 'later' (one failed within 6
   hours: never a loop of failures). The page's op read and the sign-up's warm both ask here. */
async function readIfNeeded(store, base, conf, t) {
  const slug = slugOf(conf);
  const c = await store.get('c/' + slug, { type: 'json' });
  if (c && c.at && t - c.at < FRESH_DAYS * 864e5) return 'ready';
  const last = await store.get('t/' + slug, { type: 'json' });
  const j = await getM(store, 'j/' + slug);
  if (j && running(j.data)) { await rescue(store, base, slug, j); return 'reading'; }
  if (last && last.at && t - last.at < START_GAP_MS && j && j.data.status === 'failed') return 'later';
  await start(store, base, conf);
  return 'reading';
}
const markOpened = async (store, slug, t) => {
  const day = new Date(t).toISOString().slice(0, 10), o = await store.get('o/' + slug, { type: 'json' });
  if (!o || o.at !== day) await store.setJSON('o/' + slug, { at: day });
};
/* v10.60.1: a pastor registered (or signed in): read the conference now, when it may be read and is not already fresh. Noted as opened
   today, so the monthly refresh keeps it and the sweep forgets it after 180 days unused. Never given the pastor's name or address. */
export async function warm(store, base, conf) {
  conf = String(conf || '').trim();
  if (!Object.prototype.hasOwnProperty.call(CONF_ORG, conf) || !allowed(conf)) return 'off';
  const t = now();
  await markOpened(store, slugOf(conf), t);
  return readIfNeeded(store, base, conf, t);
}

export default async (request) => {
  try {
    const store = theStore(), url = new URL(request.url), t = now();
    if (request.method === 'GET' && !url.searchParams.get('conf'))
      return reply({ ok: true, fn: FN, readFn: READ_FN, places: !!(process.env.GOOGLE_PLACES_KEY || '').trim(), search: !!(process.env.BRAVE_SEARCH_KEY || '').trim() });
    const reg = regId(request.headers.get('x-terrain-reg'));
    if (!reg) return reply({ ok: false, code: 'noreg', error: 'Register on the first page to use Terrain.' }, 401);
    let conf, b = {};
    if (request.method === 'GET') conf = url.searchParams.get('conf');
    else if (request.method === 'POST') {
      const raw = await request.text(); if (raw.length > 400) return reply({ ok: false, code: 'bad' }, 400);
      try { b = JSON.parse(raw); } catch { return reply({ ok: false, code: 'bad' }, 400); }
      if (!isPlain(b)) return reply({ ok: false, code: 'bad' }, 400);
      conf = b.conf;
    } else return reply({ ok: false, code: 'method' }, 405);
    conf = String(conf || '').trim();
    if (!Object.prototype.hasOwnProperty.call(CONF_ORG, conf)) return reply({ ok: true, fn: FN, conf: conf.slice(0, 60), supported: false });
    const slug = slugOf(conf), enabled = allowed(conf);

    if (request.method === 'GET') {
      const [c, j] = await Promise.all([store.get('c/' + slug, { type: 'json' }), getM(store, 'j/' + slug)]);
      if (j && running(j.data)) await rescue(store, request.url, slug, j);
      await markOpened(store, slug, t);
      const jd = j && j.data, reading = running(jd)
        ? { phase: jd.phase, done: jd.phase === 'read' ? jd.i : 0, total: (jd.list || []).length || null, only: jd.only || null } : null;
      return reply({ ok: true, fn: FN, conf, supported: true, enabled, state: reading && !jd.only ? 'reading' : c ? 'ready' : 'none', reading,
        places: !!(process.env.GOOGLE_PLACES_KEY || '').trim(), search: !!(process.env.BRAVE_SEARCH_KEY || '').trim(), findings: c || null });
    }
    if (!enabled) return reply({ ok: false, code: 'not-yet', conf }, 403);

    if (b.op === 'read') {
      const r = await readIfNeeded(store, request.url, conf, t);
      if (r === 'ready') return reply({ ok: true, state: 'ready' });
      if (r === 'later') return reply({ ok: false, code: 'later' }, 503);
      return reply({ ok: true, state: 'reading' }, 202);
    }
    if (b.op === 'again') {
      const org = String(b.org || '');
      const c = await store.get('c/' + slug, { type: 'json' });
      if (!c || !Array.isArray(c.churches) || !c.churches.some(x => x.org === org)) return reply({ ok: false, code: 'unknown' }, 404);
      const day = new Date(t).toISOString().slice(0, 10), ak = `a/${day}/${reg}`, n = (await store.get(ak, { type: 'json' })) || { n: 0 };
      if (n.n >= AGAIN_DAY_MAX) return reply({ ok: false, code: 'limit' }, 429);
      const j = await getM(store, 'j/' + slug);
      if (j && running(j.data)) return reply({ ok: false, code: 'busy' }, 409);
      await store.setJSON(ak, { n: n.n + 1 });
      const list = c.churches.map(x => ({ org: x.org, name: x.name, kind: x.kind }));
      const r = await start(store, request.url, conf, { phase: 'read', only: org, list });
      return reply({ ok: true, state: r === 'reading' ? 'busy' : 'again' }, 202);
    }
    return reply({ ok: false, code: 'bad' }, 400);
  } catch {
    return reply({ ok: false, code: 'error' }, 500);
  }
};
