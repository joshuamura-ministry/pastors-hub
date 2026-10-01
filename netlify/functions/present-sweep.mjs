// Terrain · Make the Case live slides retention sweep.             present-sweep-1.1
//
// Runs once a day on Netlify's scheduler (the `config` export below). No URL
// reaches it in production. It keeps the promise made before a room goes
// live: the slides, the count of phones, the "I'm in" answers and the Firebase
// pointer are deleted when the room expires (1, 7 or 30 days), even if nobody
// ever opens it again.
//
// present.mjs writes an empty marker for every room:
//   x/<YYYY-MM-DD>/<room>     the UTC day the room expires
// This lists the markers and, for each whose day has passed, deletes
//   a/<room>/*  o/<room>/*  k/<CODE6>  p/<room>  q/<room>  d/<room>  r/<room>
// (p/<room> and q/<room>, present-sweep-1.1: the handout and the proposal to
// vote on that the presenter's device sent for the phones, present-1.4)
// (the members' answers first, many at a time, so a room with a thousand
// phones cannot run the sweep out of time with names still kept) and the
// pointer live/<room> in Firebase (REST DELETE with the server-only key,
// never following a redirect), then the marker. The marker is the last word:
// present.mjs never deletes it, so anything a room removed early or expired
// on sight still held (an answer that was in flight) goes here. On the day
// itself it deletes a room only once its time is up. A marker whose room was
// already removed ("Remove now") still deletes the pointer once more, then
// goes. If Firebase cannot be reached the marker stays and tomorrow's sweep
// tries again. Last, any typed code whose room has expired is deleted.
// Nothing is read or logged beyond the keys.

import { getStore } from '@netlify/blobs';
import { createSign, createPrivateKey } from 'node:crypto';

export const config = { schedule: '@daily' };

const STORE_NAME = 'terrain-present';
const RE_MARK = /^x\/(\d{4}-\d{2}-\d{2})\/([A-Za-z0-9_-]{22})$/;
const RE_CODE6 = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
const BUDGET_MS = 20000;   // scheduled functions get 30 s; the rest waits for tomorrow
const DELETES_AT_ONCE = 16;

function theStore() {
  if (globalThis.__terrainPresentStore) return globalThis.__terrainPresentStore;
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);

// The same rules as present.mjs: only an https address on Firebase's own
// hosts, nothing after the host, and the key sent nowhere else. The key is the
// database secret or a service-account key file (JSON), as in present.mjs.
function fb() {
  const raw = (process.env.PRESENT_FB_URL || '').trim().replace(/\/+$/, '');
  const secret = (process.env.PRESENT_FB_SECRET || '').trim();
  if (!raw || !secret) return null;
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.search || u.hash) return null;
  if (u.pathname !== '/' && u.pathname !== '') return null;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.(firebaseio\.com|firebasedatabase\.app)$/.test(u.hostname)) return null;
  if (secret[0] !== '{') return { base: u.origin, secret };
  try {
    const j = JSON.parse(secret);
    const email = isPlain(j) ? j.client_email : null, key = isPlain(j) ? j.private_key : null;
    if (typeof email !== 'string' || !/^[^\s@]{1,200}@[a-z0-9.-]{1,200}$/i.test(email) ||
        typeof key !== 'string' || !/-----BEGIN (RSA )?PRIVATE KEY-----/.test(key)) return null;
    createPrivateKey(key);
    return { base: u.origin, sa: { email, key } };
  } catch { return null; }
}
// A service-account key is traded for an access token once per run (see
// present.mjs: RS256, Google's token address only, never a redirect).
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const FB_SCOPES = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database';
let saTok = null;
async function fbAuth(f) {
  if (f.secret) return 'auth=' + encodeURIComponent(f.secret);
  const now = Date.now();
  if (saTok && saTok.email === f.sa.email && saTok.exp - now > 5 * 60 * 1000) return saTok.q;
  try {
    const b64 = o => Buffer.from(JSON.stringify(o), 'utf8').toString('base64url');
    const iat = Math.floor(now / 1000);
    const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: f.sa.email, scope: FB_SCOPES, aud: GOOGLE_TOKEN, iat, exp: iat + 3600 });
    const sig = createSign('RSA-SHA256').update(unsigned).sign(f.sa.key).toString('base64url');
    const res = await fetch(GOOGLE_TOKEN, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + unsigned + '.' + sig,
      redirect: 'error', signal: AbortSignal.timeout(5000)
    });
    if (!res || !res.ok) return null;
    const j = await res.json();
    if (!isPlain(j) || typeof j.access_token !== 'string' || !/^[\x21-\x7e]{1,4096}$/.test(j.access_token)) return null;
    const life = typeof j.expires_in === 'number' && j.expires_in > 0 ? Math.min(j.expires_in, 3600) : 3600;
    saTok = { email: f.sa.email, q: 'access_token=' + encodeURIComponent(j.access_token), exp: now + life * 1000 };
    return saTok.q;
  } catch { return null; }
}
// true once the pointer is gone (or live follow is not set up at all).
async function dropPointer(room) {
  const f = fb();
  if (!f) return true;
  const auth = await fbAuth(f);
  if (!auth) return false;
  try {
    const res = await fetch(`${f.base}/live/${room}.json?${auth}&print=silent`, {
      method: 'DELETE', redirect: 'error', signal: AbortSignal.timeout(5000)
    });
    return !!(res && res.ok);
  } catch { return false; }
}

async function keysUnder(store, prefix) {
  const l = await store.list({ prefix });
  return ((l && l.blobs) || []).map(b => b.key);
}
// Run fn over items, n at a time.
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

async function sweep(store, now = Date.now()) {
  const started = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const due = [];
  for (const key of await keysUnder(store, 'x/')) {
    const m = RE_MARK.exec(key);
    if (m && m[1] <= today) due.push({ key, day: m[1], room: m[2] });
  }
  let deleted = 0, left = 0, i = 0;
  const worker = async () => {
    while (i < due.length) {
      if (Date.now() - started > BUDGET_MS) { left++; i++; continue; }
      const d = due[i++];
      const rec = await store.get('r/' + d.room, { type: 'json' });
      // Due today: only once the moment has actually passed.
      if (d.day === today && isPlain(rec) && typeof rec.expires === 'number' && rec.expires > now) continue;
      await pool(await keysUnder(store, `a/${d.room}/`), DELETES_AT_ONCE, k => store.delete(k));
      await pool(await keysUnder(store, `o/${d.room}/`), DELETES_AT_ONCE, k => store.delete(k));
      if (isPlain(rec) && typeof rec.code === 'string' && RE_CODE6.test(rec.code)) {
        const k = await store.get('k/' + rec.code, { type: 'json' });
        if (!isPlain(k) || k.room === d.room) await store.delete('k/' + rec.code);
      }
      await store.delete('p/' + d.room);        // present-sweep-1.1: the room's PDFs
      await store.delete('q/' + d.room);
      await store.delete('d/' + d.room);
      await store.delete('r/' + d.room);
      if (await dropPointer(d.room)) { await store.delete(d.key); deleted++; }
      else left++;
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, due.length) }, worker));

  // Typed codes whose room has expired (a room's own code normally goes with it).
  let codes = 0;
  for (const key of await keysUnder(store, 'k/')) {
    if (Date.now() - started > BUDGET_MS) break;
    const k = await store.get(key, { type: 'json' });
    if (isPlain(k) && typeof k.expires === 'number' && k.expires <= now) { await store.delete(key); codes++; }
  }
  return { deleted, left, codes };
}

export default async () => {
  try {
    const r = await sweep(theStore());
    return new Response(JSON.stringify({ ok: true, ...r }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store, max-age=0' }
    });
  } catch {
    console.error('present-sweep: failed');
    return new Response(JSON.stringify({ ok: false }), {
      status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store, max-age=0' }
    });
  }
};
