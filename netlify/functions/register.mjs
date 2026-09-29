// Terrain · pastor registration.                                   register-1.1
//
// The first page asks a pastor for a name, an email address, the church and a
// role, once per device, after they have found their conference. This function
// keeps one record per email address, so there is a real list of who is using
// Terrain for the day it becomes a product. Auto-detected at
// /.netlify/functions/register — no config file.
//
// NOTHING IS EMAILED. There is no verification mail and no password: the
// address is stored (verified:false) and nothing else happens to it.
//
// REGISTRATION THAT KEEPS PEOPLE OUT (register-1.1). Set TERRAIN_REG_SECRET in
// Netlify to a long random value (at least 32 characters). From then on every
// registration is answered with a signed token, {ok, tok}, which the page keeps
// and sends with its Census calls and when it creates a Spiritual Gifts link;
// census.mjs and gifts.mjs refuse those without a current token (401 noreg).
// The token is an HMAC, keyed by the secret, over the record's id and the time
// it was issued; it lasts 180 days and the page quietly registers again for a
// new one. Without the secret the page still asks everyone to register, but
// the server cannot tell a registered visitor from anyone else: registration
// then collects details and keeps nobody out.
//
// STORAGE. Netlify Blobs, store "terrain-registrations", strong consistency.
//   e/<sha256(email)>      {id, name, email, church, role, conf, union, news,
//                           lang, verified, created, updated, count, claims}
//   g/reg/<hour>/<tag>     {n} registrations from one client this hour
//   g/adm/<hour>/<tag>     {n} failed admin-list attempts from one client
//   g/salt/<day>           {salt} only while TERRAIN_REG_SECRET is unset
// One small blob per client and window, so registrations from different people
// never wait on one another. gifts-sweep.mjs deletes earlier days' counters.
//
// ONE RECORD PER ADDRESS, AND THE FIRST WORD STANDS. Nothing proves that the
// person typing an address owns it, so registering again with an address that
// is already on file never changes what was stored: name, church, role,
// conference, union and language stay as first given. What the later visit
// said is kept beside it under `claims` (the last five that differed), for
// whoever reads the list. The news choice can be withdrawn (true to false) but
// never switched on by a later registration. The visit is counted and `updated`
// moves on. Every answer has the same shape, new address or not, so the reply
// never says whether an address was already registered.
//
// PRIVACY. The address is stored in full (it is the point of the list) but it
// is never sent back: no response carries it except the admin list below. A
// client address is never stored as typed: only as an HMAC tag, IPv6 by its
// /64. With TERRAIN_REG_SECRET set the tag's key is derived from the secret
// and a day, and is never stored, so the tags cannot be reversed from the
// store. Without it the day's key sits in the store (g/salt/<day>), so the
// tags are pseudonymous rather than anonymous: someone who could read the
// store could test every IPv4 address against them.
//
// ABUSE. At most 20 registrations an hour from one client (429 slow-down); an
// IPv6 client is counted by its /64, which one subscriber holds whole. Only a
// POST with content-type application/json is read (415 otherwise), so another
// website cannot make its visitors' browsers register people: a cross-site
// JSON request needs a preflight, which gets 405. A request the browser marks
// Sec-Fetch-Site: cross-site is refused outright (403). Every string is
// trimmed, bounded and one line, with control and invisible format characters
// (zero-width spaces, direction overrides) removed; a name and a church must
// contain a letter. The address must be a plain one (no spaces, line breaks,
// angle brackets, quotes or commas), so it can never carry an extra mail
// header if email is switched on later.
//
// ADMIN. op 'list' exists only while TERRAIN_ADMIN_KEY is set in Netlify to
// at least 32 characters (a shorter key counts as unset), and only for a
// request whose x-terrain-admin header matches it (compared in constant time).
// Otherwise it answers 404, exactly like an unknown op, so the op cannot be
// discovered. Ten wrong keys in an hour from one client and it answers 404
// for the rest of the hour without looking at the key.
//
// OPS (POST JSON {op, ...}; GET answers status):
//   status                                              → {ok, fn}
//   register {name, email, church, role, conf, union?, news?, lang?}
//                                                       → {ok, tok?}
//   list     {after?, limit?}   +x-terrain-admin header  → {ok, items:[record…], total, next?}
//
// LOGGING. Nothing a pastor typed is ever logged. Only the op name on an
// unexpected failure, and one line when a secret is set but too short.

import { getStore } from '@netlify/blobs';
import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';

const FN_VERSION = 'register-1.1';
const STORE_NAME = 'terrain-registrations';

const MAX_BODY = 8 * 1024;          // a registration is a few hundred bytes
const MAX_NAME = 80;
const MAX_EMAIL = 254;
const MAX_CHURCH = 120;
const MAX_CONF = 80;                // conference and union
const MAX_IP_HOUR = 20;             // registrations from one client, per hour
const MAX_ADMIN_FAILS = 10;         // wrong admin keys from one client, per hour
const MAX_CLAIMS = 5;               // later, differing registrations kept per record
const MIN_SECRET = 32;              // TERRAIN_REG_SECRET and TERRAIN_ADMIN_KEY
const LIST_PAGE = 100, LIST_MAX = 500;

const ROLES = new Set(['pastor', 'leader', 'other']);
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
// Conservative on purpose: lower-case letters, digits and . _ % + ' - before
// the @ (no leading, trailing or doubled dot), ordinary host labels after it,
// and a real top-level domain. Nothing that could end or extend a mail header.
// The page (regEmail in index.html) uses this same pattern.
const RE_EMAIL = /^(?=[^@]{1,64}@)[a-z0-9_%+'-]+(?:\.[a-z0-9_%+'-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,24}|xn--[a-z0-9-]{2,59})$/;

// ---------------------------------------------------------------- helpers
class Fail extends Error {
  constructor(status, error) { super(error); this.status = status; this.error = error; }
}
const NO_STORE = 'no-store, max-age=0';
const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': NO_STORE }
  });
function need(ok, status, error) { if (!ok) throw new Fail(status, error); }
const rand = n => randomBytes(n).toString('base64url');
const sha = s => createHash('sha256').update(String(s), 'utf8').digest();
const shaHex = s => sha(s).toString('hex');
const utcDay = t => new Date(t).toISOString().slice(0, 10);
const utcHour = t => new Date(t).toISOString().slice(0, 13);
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const warned = new Set();
function warnOnce(msg) { if (!warned.has(msg)) { warned.add(msg); console.error(msg); } }

// A secret from the environment, or '' when unset or too short to trust.
function secretEnv(name) {
  const v = (process.env[name] || '').trim();
  if (!v) return '';
  if (v.length < MIN_SECRET) { warnOnce(`register: ${name} is shorter than ${MIN_SECRET} characters, so it is ignored`); return ''; }
  return v;
}
const regSecret = () => secretEnv('TERRAIN_REG_SECRET');

// The registration token: r1.<id>.<issued, base-36 seconds>.<HMAC>. census.mjs
// and gifts.mjs check it with the same secret (their copies of regTokenOk).
function mintToken(secret, id, now) {
  const iat = Math.floor(now / 1000).toString(36);
  const sig = createHmac('sha256', secret).update(`terrain-reg|r1|${id}|${iat}`, 'utf8').digest('base64url').slice(0, 32);
  return `r1.${id}.${iat}.${sig}`;
}

// Plain one-line text: control characters become spaces, invisible format
// characters (zero-width, direction overrides, BOM) go, runs of space collapse.
function line(s) {
  return String(s).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ').replace(/\p{Cf}+/gu, '')
    .replace(/\s+/g, ' ').trim();
}
// A required or optional one-line field, as text, within max characters. With
// letter, it must contain at least one letter (a name, a church).
function field(v, max, error, { required = true, letter = false } = {}) {
  if (v == null) { need(!required, 400, error); return ''; }
  need(typeof v === 'string', 400, error);
  const s = line(v);
  need(s.length <= max, 400, error);
  need(!required || s.length > 0, 400, error);
  need(!letter || /\p{L}/u.test(s), 400, error);
  return s;
}
// The address, or a 400. Line breaks anywhere are refused outright (never
// tidied into a space): that is the shape of a header-injection attempt.
// Invisible format characters (a pasted zero-width space) are dropped first.
function cleanEmail(v) {
  need(typeof v === 'string', 400, 'bad-email');
  need(!/[\r\n\u0000-\u001f\u007f\u2028\u2029]/.test(v), 400, 'bad-email');
  const e = v.replace(/\p{Cf}+/gu, '').trim().toLowerCase();
  need(e.length > 0 && e.length <= MAX_EMAIL, 400, 'bad-email');
  need(RE_EMAIL.test(e), 400, 'bad-email');
  return e;
}

// The caller's address as Netlify reports it; '' outside Netlify (no limit then).
function clientIp(request, context) {
  const ip = context && typeof context.ip === 'string' ? context.ip
    : (request && request.headers ? request.headers.get('x-nf-client-connection-ip') || '' : '');
  return line(ip).slice(0, 64);
}
// What a limit counts: an IPv4 address as it is; an IPv6 address by its /64
// (one subscriber is given a whole /64 and can rotate through it); an
// IPv4-mapped IPv6 address as its IPv4.
function ipKey(ip) {
  const s = String(ip || '').trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/%.*$/, '');
  if (!s.includes(':')) return s;
  const v4 = /^[0:]*:ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
  if (v4) return v4[1];
  const halves = s.split('::');
  if (halves.length > 2) return s;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const parts = halves.length === 2 ? [...head, ...Array(Math.max(0, 8 - head.length - tail.length)).fill('0'), ...tail] : head;
  if (parts.length !== 8 || !parts.every(p => /^[0-9a-f]{1,4}$/.test(p))) return s;
  return parts.slice(0, 4).map(p => p.padStart(4, '0')).join(':') + '::/64';
}
const ipTag = (key, salt) => createHmac('sha256', String(salt)).update(key, 'utf8').digest('base64url').slice(0, 22);

function theStore() {
  if (globalThis.__terrainRegStore) return globalThis.__terrainRegStore;
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

// Read-modify-write for a blob that may not exist yet: fn(cur|null) returns
// {value, result}. Creation is onlyIfNew and an update is onlyIfMatch (when the
// store offers ETags, as the real one does), retried after a short random
// pause, so two writers at the same moment cannot both win or keep colliding.
const pause = attempt => new Promise(r => setTimeout(r, Math.floor(Math.random() * 15 * (attempt + 1))));
async function upsert(store, key, fn) {
  const cas = typeof store.getWithMetadata === 'function';
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt) await pause(attempt);
    let cur = null, etag, exists = false;
    if (cas) {
      const r = await store.getWithMetadata(key, { type: 'json' });
      if (r) { exists = true; cur = r.data; etag = r.etag; }
    } else {
      cur = await store.get(key, { type: 'json' });
      exists = cur != null;
    }
    const out = await fn(isPlain(cur) ? cur : null);
    const opts = !exists ? { onlyIfNew: true } : (cas && etag ? { onlyIfMatch: etag } : undefined);
    const w = await store.setJSON(key, out.value, opts);
    if (!w || w.modified !== false) return out.result;
  }
  throw new Fail(503, 'busy');
}

// The key that tags client addresses today: derived from TERRAIN_REG_SECRET
// and never stored, or (without it) a random one kept for the day.
async function daySalt(store, day) {
  const sec = regSecret();
  if (sec) return createHmac('sha256', sec).update('terrain-ip|' + day, 'utf8').digest('base64url');
  const k = 'g/salt/' + day;
  for (let attempt = 0; attempt < 4; attempt++) {
    const cur = await store.get(k, { type: 'json' });
    if (isPlain(cur) && typeof cur.salt === 'string' && cur.salt) return cur.salt;
    const salt = rand(18);
    const w = await store.setJSON(k, { salt }, { onlyIfNew: true });
    if (!w || w.modified !== false) return salt;
  }
  throw new Fail(503, 'busy');
}
// This client's counter for one kind of thing in one window, as a key.
async function counterKey(store, kind, ip, now) {
  return `g/${kind}/${utcHour(now)}/${ipTag(ipKey(ip), await daySalt(store, utcDay(now)))}`;
}
const countOf = cur => (cur && Number.isInteger(cur.n) && cur.n > 0 ? cur.n : 0);

// The admin key when it is configured and long enough; '' means no admin.
const adminKey = () => secretEnv('TERRAIN_ADMIN_KEY');
function adminOk(request, want) {
  const given = request.headers.get('x-terrain-admin') || '';
  if (!want || !given) return false;
  return timingSafeEqual(sha(given.trim()), sha(want));
}

// ---------------------------------------------------------------- ops
const OPS = {
  async status() {
    return { ok: true, fn: FN_VERSION };
  },

  async register(b, { request, context, store }) {
    const name = field(own(b, 'name'), MAX_NAME, 'bad-name', { letter: true });
    const email = cleanEmail(own(b, 'email'));
    const church = field(own(b, 'church'), MAX_CHURCH, 'bad-church', { letter: true });
    const role = own(b, 'role');
    need(typeof role === 'string' && ROLES.has(role), 400, 'bad-role');
    const conf = field(own(b, 'conf'), MAX_CONF, 'bad-conf');
    const union = field(own(b, 'union'), MAX_CONF, 'bad-union', { required: false });
    const news = own(b, 'news');
    need(news == null || typeof news === 'boolean', 400, 'bad-news');
    const lang = own(b, 'lang') === 'es' ? 'es' : 'en';

    // This client, this hour: one blob per client, so nobody else waits on it.
    const now = Date.now();
    const ip = clientIp(request, context);
    if (ip) {
      await upsert(store, await counterKey(store, 'reg', ip, now), cur => {
        const n = countOf(cur);
        need(n < MAX_IP_HOUR, 429, 'slow-down');
        return { value: { n: n + 1 }, result: null };
      });
    }

    const typed = { name, church, role, conf, union, news: news === true, lang };
    const id = await upsert(store, 'e/' + shaHex(email), cur => {
      if (cur && typeof cur.id === 'string' && cur.id) {
        // Already on file: the first registration's words stand (see above).
        const first = order(cur);
        const same = ['name', 'church', 'role', 'conf', 'union', 'lang', 'news'].every(k => first[k] === typed[k]);
        const claims = same ? first.claims : [...first.claims, { ...typed, at: now }].slice(-MAX_CLAIMS);
        const value = { ...first, news: first.news && typed.news, updated: now,
          count: (typeof first.count === 'number' ? first.count : 1) + 1, claims };
        return { value: order(value), result: first.id };
      }
      const fresh = rand(9);
      const value = { ...typed, email, id: fresh, verified: false, created: now, updated: now, count: 1, claims: [] };
      return { value: order(value), result: fresh };
    });
    // The same shape for a new address and a known one.
    const secret = regSecret();
    return secret ? { ok: true, tok: mintToken(secret, id, now) } : { ok: true };
  },

  async list(b, { request, context, store }) {
    // Indistinguishable from an op that does not exist, unless the key is right.
    const want = adminKey();
    need(!!want, 404, 'unknown-op');
    const ip = clientIp(request, context);
    let failKey = '';
    if (ip) {
      failKey = await counterKey(store, 'adm', ip, Date.now());
      need(countOf(await store.get(failKey, { type: 'json' })) < MAX_ADMIN_FAILS, 404, 'unknown-op');
    }
    if (!adminOk(request, want)) {
      if (failKey) await upsert(store, failKey, cur => ({ value: { n: countOf(cur) + 1 }, result: null }));
      throw new Fail(404, 'unknown-op');
    }
    const after = typeof own(b, 'after') === 'string' ? own(b, 'after') : '';
    const lim = Number.isInteger(own(b, 'limit')) ? Math.min(Math.max(own(b, 'limit'), 1), LIST_MAX) : LIST_PAGE;
    const l = await store.list({ prefix: 'e/' });
    const keys = ((l && l.blobs) || []).map(x => x.key).filter(k => /^e\/[0-9a-f]{64}$/.test(k)).sort();
    const from = after ? keys.findIndex(k => k > after) : 0;
    const page = from < 0 ? [] : keys.slice(from, from + lim);
    const items = [];
    for (const k of page) {
      const r = await store.get(k, { type: 'json' });
      if (isPlain(r)) items.push(order(r));
    }
    const res = { ok: true, items, total: keys.length };
    if (from >= 0 && from + lim < keys.length) res.next = page[page.length - 1];
    return res;
  }
};

// The stored shape, always in the same order, nothing else carried over.
function order(r) {
  const claims = (Array.isArray(r.claims) ? r.claims : []).filter(isPlain).slice(-MAX_CLAIMS).map(c => ({
    name: String(c.name || ''), church: String(c.church || ''), role: String(c.role || ''),
    conf: String(c.conf || ''), union: String(c.union || ''), news: c.news === true,
    lang: c.lang === 'es' ? 'es' : 'en', at: typeof c.at === 'number' ? c.at : 0 }));
  return { id: r.id, name: r.name, email: r.email, church: r.church, role: r.role, conf: r.conf,
    union: r.union || '', news: r.news === true, lang: r.lang === 'es' ? 'es' : 'en',
    verified: r.verified === true, created: r.created, updated: r.updated, count: r.count, claims };
}

// ---------------------------------------------------------------- handler
export default async (request, context) => {
  let op = '';
  try {
    if (request.method === 'GET') return reply(await OPS.status());
    if (request.method !== 'POST') return reply({ ok: false, error: 'method' }, 405);
    // JSON only: anything a web page can send another site without asking
    // first (text/plain, a form) is refused before it is read.
    const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (type !== 'application/json') return reply({ ok: false, error: 'content-type' }, 415);
    if ((request.headers.get('sec-fetch-site') || '').trim().toLowerCase() === 'cross-site') {
      return reply({ ok: false, error: 'cross-site' }, 403);
    }

    const len = Number(request.headers.get('content-length') || 0);
    if (len > MAX_BODY) return reply({ ok: false, error: 'too-large' }, 413);
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY) return reply({ ok: false, error: 'too-large' }, 413);
    let b;
    try { b = JSON.parse(raw); } catch { return reply({ ok: false, error: 'bad-json' }, 400); }
    if (!isPlain(b)) return reply({ ok: false, error: 'bad-json' }, 400);
    // JSON.parse makes "__proto__" an ordinary own key; refuse it (and its
    // cousins) outright rather than carry it anywhere.
    if (Object.keys(b).some(k => FORBIDDEN_KEYS.has(k))) return reply({ ok: false, error: 'bad-request' }, 400);

    op = typeof b.op === 'string' ? b.op : '';
    if (!Object.prototype.hasOwnProperty.call(OPS, op)) return reply({ ok: false, error: 'unknown-op' }, 404);
    if (op === 'status') return reply(await OPS.status());

    const store = theStore();
    return reply(await OPS[op](b, { request, context, store }));
  } catch (e) {
    if (e instanceof Fail) return reply({ ok: false, error: e.error }, e.status);
    // Only the op name: never the message, which could carry what was typed.
    console.error('register: unexpected failure in op ' + (/^[a-z]{1,10}$/.test(op) ? op : '?'));
    return reply({ ok: false, error: 'server' }, 500);
  }
};
