// Terrain · Spiritual Gifts results server.                           gifts-1.2
//
// Members take the assessment on their own phone. This function keeps their
// result so the pastor who sent the link can collect it, lets two or three
// people who know the member confirm what they have seen, and (optionally)
// emails the member a private link to their own report and, once that link
// has been opened and the member asks for one there, a PDF copy of it. Auto-detected at
// /.netlify/functions/gifts — no config file.
//
// STORAGE. Netlify Blobs, store "terrain-gifts", strong consistency.
//   c/<pub>          campaign  {pub, keyHash, created, church, sends:{date,n}, fullAt?,
//                               ctx?, ctxAt?}
//   r/<pub>/<rid>    result    {rid, tokenHash, code, name, email, emailOk, minor,
//                               lang, ts, expires, observers, invites, emails,
//                               vtoks, emailVerified, pdfs}
//   x/<day>/<pub>/<rid>  expiry marker (empty), day = UTC date of `expires`;
//                        gifts-sweep.mjs deletes what is due every day
//   g/sends          today's sends across every campaign {date, n, to:{<hmac>:n}}
//   g/cid/<day>/<tag>  campaigns created by one client today {n}
//   g/salt/<day>     the day's key for client tags, only while TERRAIN_REG_SECRET
//                    is unset (with it, the key is derived and never stored)
// gifts-sweep.mjs deletes earlier days' g/cid and g/salt blobs, and every
// campaign that has never received a result and has not been opened, by a
// member or by its pastor, for 30 days (`seen`, the last UTC day it was).
// Secrets (the pastor's campaign key, the member's token, each observer invite,
// each emailed verification token) are random, shown once, and stored only as
// a SHA-256. They are compared in constant time. No response ever contains an
// email address, a verification token or a hash.
//
// RETENTION. Adults two years, under-18s one year. The scheduled function
// gifts-sweep.mjs deletes every result whose day has passed, whether or not
// anyone ever opens the campaign again; expired results are also deleted the
// moment anything touches them. A member can delete their own result; the
// pastor can delete any result in the campaign.
//
// UNDER-18s. No email address is stored for a minor and a minor is never
// emailed, whatever the page sends. `minor` must be a true boolean; any other
// type is refused rather than read as "adult". Their result goes to whoever
// sent the link.
//
// EMAIL. Transactional only, to the member who took the assessment and ticked
// consent, via Resend. Needs RESEND_API_KEY and GIFTS_FROM, e.g.
//   GIFTS_FROM = Terrain <reports@pastorshub.org>
// SITE_URL (optional) is the base of the private link in the email; without it
// the link uses the site's own address from Netlify, and only outside Netlify
// the origin the request came from. With either variable unset the email ops
// answer 501 {ok:false, error:'email-off'}, status says email:false, and no
// address is stored at all, so the page simply hides the option.
// Anyone holding a member link can submit a result with any address, so
// nothing the submitter wrote is ever attached to an unconfirmed address
// (gifts-1.1, closing security review SEC-1 part 3). Two emails:
//   1. op 'email' — the LINK email. A fixed template (English or Spanish): the
//      first name (letters only), the church (letters, no dots, slashes or
//      long numbers), and the private link #gifts-report=PUB.RID.TOKEN.VTOK.
//      NEVER an attachment: a pdf sent with this op is ignored. VTOK is a new
//      random verification token per link email; only its hash is kept.
//   2. op 'emailpdf' — the PDF copy, attached. Refused (403 not-verified)
//      until op 'verify' has been called with a VTOK from a link email, which
//      only someone who can read that inbox has, and it must carry such a
//      VTOK itself (403 bad-vtok): the result's token alone, which whoever
//      submitted the result holds, never sends a PDF. Opening the link only
//      verifies; the page sends the PDF when the member taps "Email me a PDF
//      copy" there, never on open (mail scanners open links in a browser).
// Both are fenced against use as a relay: 3 link emails and 3 PDF copies per
// result, 100 per campaign and 500 in all per UTC day, 5 per recipient address
// and 30 per client address per day, a greeting that can carry letters only,
// and a PDF that may carry no scripts, launch actions, embedded files, object
// streams, links, annotations, forms, images or opening action other than
// jsPDF's own page view. A changed address (op 'update') is unconfirmed again.
// The per-recipient count is by inbox: +tags and dots do not make a new one.
// (What remains after verification: the owner of the inbox has opened the
// link, and the PDF's text is the report their own browser built from it,
// including the name and answers whoever submitted the result chose.)
//
// FLOODS. A campaign's pub is public (bulletin QR codes), so new results are
// rate-limited: 60 an hour from one client address, 200 an hour and 1000 a day
// per campaign (429 slow-down). The pastor can close a link (op 'close': no new
// results, 410 closed) and delete many results at once (op 'purge').
//
// ACCESS CODES. Same rules as census.mjs, and switched off the same way: they
// are enforced only while TERRAIN_REQUIRE_CODE is on (1, true, yes or on; from
// v10.38.0 pastors register on the first page instead). With the switch on,
// TERRAIN_CODES unset means open to everyone; set means creating a campaign
// (op 'id') needs a valid x-terrain-code header. Members and observers never
// need a code.
//
// REGISTRATION (gifts-1.2). With codes off and TERRAIN_REG_SECRET set (32
// characters or more), creating a campaign needs the token register.mjs gives
// a registered pastor, in an x-terrain-reg header (401 noreg otherwise). And
// whatever the settings, one client (an IPv6 client by its /64) can create at
// most 10 campaigns a UTC day (429 slow-down): a campaign holds up to 16 KB of
// church text that its member link shows to anyone.
//
// CAMPAIGN CONTEXT. What the member link used to carry in the address (the
// church, its building, what it runs, and the Community Survey's needs for
// the neighbourhood) can live on the campaign instead, so the link the pastor
// hands out is just #gifts=<pub>: short enough for a QR code. It is public by
// design: church information and census figures, never anything a member
// wrote. Only the campaign key can set it. It is rebuilt field by field from
// what is sent (nothing else is kept), at most 16 KB, every string bounded.
//
// OPS (POST JSON {op, ...}; GET answers status):
//   status                                   → {ok, fn, email}
//   id       {church?, ctx?}    (+code header while codes are required,
//                                 +x-terrain-reg while registration is)  → {pub, key, ctx:true?}
//   ctx      {pub}                           → {ok, ctx|null}
//   setctx   {pub, key, ctx}                 → {ok}
//   submit   {pub, code, name, email?, emailOk?, minor?, lang?}
//                                            → {ok, rid, token, hasEmail}
//   update   {pub, rid, token, code, name, email?, emailOk?, minor?, lang?}
//                                            → {ok, rid, hasEmail}
//            (the member sending again: the same record, observers, invites
//             and email count kept; never kept longer than first promised)
//   close    {pub, key}                      → {ok}   (no new results)
//   purge    {pub, key, rids:[≤500]}         → {ok, deleted}
//   list     {pub, key, after?}              → {items:[{rid,code,name,ts,minor,hasEmail,observers,...}], next?}
//            (one page stays under 4 MB; when `next` is present, ask again
//             with after:next until it is absent)
//   get      {pub, rid, token}               → {code, name, ts, minor, observers, ...}
//   delete   {pub, rid, token} | {pub, key, rid}   → {ok}
//   invite   {pub, rid, token, gifts:[≤8 ids]}     → {itok}
//   peek     {pub, rid, itok}                → {first, gifts, church, lang}
//            (a used or full invite answers 410/409 with the member's lang)
//   confirm  {pub, rid, itok, name, ratings, note?} → {ok}
//   email    {pub, rid, token, lang?}        → {ok, pdfFollows}   (the link; no attachment)
//   verify   {pub, rid, token, vtok}         → {ok, verified, pdfSent}   (idempotent)
//   emailpdf {pub, rid, token, vtok, pdf, lang?} → {ok}   (403 bad-vtok without the emailed
//            VTOK; 403 not-verified before verify)
//
// LOGGING. Nothing that could contain an email address, a token, a key or a
// result code is ever logged. Only the op name on an unexpected failure.

import { getStore } from '@netlify/blobs';
import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';

const FN_VERSION = 'gifts-1.2';
const STORE_NAME = 'terrain-gifts';

const MAX_BODY = 5 * 1024 * 1024;          // whole request
const MAX_CODE = 30000;                     // TG1- result code
const MAX_NAME = 200;                       // member name
const MAX_CHURCH = 200;
const MAX_OBS_NAME = 80;                    // observer name
const MAX_NOTE = 500;                       // observer note
const MAX_EMAIL = 254;
const MAX_RESULTS = 3000;                   // per campaign
const MAX_OPEN_INVITES = 5;                 // per result
const MAX_OBSERVERS = 5;                    // per result
const MAX_INVITE_GIFTS = 8;
const MAX_EMAILS = 3;                       // link emails per result, lifetime
const MAX_PDFS = 3;                         // PDF copies per result, lifetime (only once verified)
const MAX_DAILY_SENDS = 100;                // per campaign, per UTC day (well below the shared ceiling)
const MAX_GLOBAL_SENDS = 500;               // every campaign together, per UTC day
const MAX_RECIPIENT_SENDS = 5;              // one address, every campaign, per UTC day
const MAX_IP_SENDS = 30;                    // one client address, every campaign, per UTC day
const MAX_IP_SUBMITS = 60;                  // new results from one client address, per hour
const MAX_IP_CAMPAIGNS = 10;                // new campaigns from one client address, per UTC day
const MAX_CAMP_SUBMITS_HOUR = 200;          // new results in one campaign, per hour
const MAX_CAMP_SUBMITS_DAY = 1000;          // … and per UTC day
const MAX_PURGE = 500;                      // results deleted by one purge
const MAX_PDF = 3 * 1024 * 1024;            // decoded bytes
const MAX_GREET = 40;                       // the first name in an email greeting
const MAX_CTX = 16 * 1024;                  // campaign context, bytes of JSON
const MAX_CTX_FAC = 40;                     // facilities
const MAX_CTX_MIN = 80;                     // ministries running or starting
const MAX_CTX_MIN_NAME = 120;
const MAX_CTX_NEEDS = 40;                   // neighbourhood needs
const MAX_CTX_X = 80;                       // a need's extra (a language name)
const MAX_CTX_AREA = 120;
const MAX_CTX_ID = 80;                      // the church's id on the pastor's device
const LIST_BUDGET = 4 * 1024 * 1024;        // bytes of items per list page (Netlify caps a response at 6 MB)
const FULL_RESCAN_MS = 60 * 60 * 1000;      // a full campaign is re-scanned for expired results at most hourly

const GIFT_IDS = new Set(['admin', 'leader', 'teach', 'knowl', 'wisdom', 'discern', 'encour',
  'shep', 'mercy', 'helps', 'serve', 'hosp', 'evang', 'mission', 'faith', 'inter', 'giving',
  'proclaim', 'healing', 'reconcile', 'creative']);

// Random identifiers are base64url, so they are safe in a URL hash and never
// contain the '.' that separates them in the links.
const RE_PUB = /^[A-Za-z0-9_-]{12}$/;       // 9 random bytes
const RE_RID = /^[A-Za-z0-9_-]{12}$/;       // 9 random bytes
const RE_KEY = /^[A-Za-z0-9_-]{32}$/;       // 24 random bytes (campaign key, member token, email verification token)
const RE_ITOK = /^[A-Za-z0-9_-]{24}$/;      // 18 random bytes
const RE_EMAIL = /^[^\s@<>()[\]\\,;:"']+@[^\s@<>()[\]\\,;:"']+\.[^\s@<>()[\]\\,;:"'.]{2,}$/;

// ---------------------------------------------------------------- access codes
// Copied from census.mjs (functions do not import one another). Format:
//   CODE  or  CODE:Name  or  CODE:Name@Conference
// Parsed per request, memoised on the raw value, so a changed variable is seen.
let codesRaw = null, codesMap = new Map();
function codes() {
  const raw = process.env.TERRAIN_CODES || '';
  if (raw === codesRaw) return codesMap;
  const m = new Map();
  raw.split(',').forEach(pair => {
    const r = pair.trim(); if (!r) return;
    const at = r.lastIndexOf('@');
    const scope = at === -1 ? '*' : r.slice(at + 1).trim();
    const head = at === -1 ? r : r.slice(0, at);
    const i = head.indexOf(':');
    const code = (i === -1 ? head : head.slice(0, i)).trim();
    const who = (i === -1 ? '' : head.slice(i + 1)).trim();
    if (code) m.set(code.toLowerCase(), { name: who || 'Verified', conf: scope || '*' });
  });
  codesRaw = raw; codesMap = m;
  return m;
}
// Off unless TERRAIN_REQUIRE_CODE is 1, true, yes or on; read per request,
// like the codes. Any other value but 0, false, no or off is logged once.
const warned = new Set();
function envOn(name) {
  const v = (process.env[name] || '').trim();
  if (/^(1|true|yes|on)$/i.test(v)) return true;
  if (v && !/^(0|false|no|off)$/i.test(v) && !warned.has(name)) {
    warned.add(name);
    console.error(`gifts: ${name} is set, but not to 1, true, yes or on, so it is treated as off`);
  }
  return false;
}
const requireCode = () => envOn('TERRAIN_REQUIRE_CODE');

// ---------------------------------------------------------------- registration
// Copied from census.mjs (functions do not import one another): the token
// register.mjs hands a registered pastor, r1.<id>.<issued>.<HMAC>, good for
// 180 days, keyed by TERRAIN_REG_SECRET.
const TOKEN_DAYS = 180;
const RE_REGTOK = /^r1\.([A-Za-z0-9_-]{12})\.([0-9a-z]{1,9})\.([A-Za-z0-9_-]{32})$/;
function regSecret() {
  const v = (process.env.TERRAIN_REG_SECRET || '').trim();
  if (v && v.length < 32 && !warned.has('secret')) {
    warned.add('secret');
    console.error('gifts: TERRAIN_REG_SECRET is shorter than 32 characters, so it is ignored');
  }
  return v.length >= 32 ? v : '';
}
function regTokenOk(tok, secret, now = Date.now()) {
  const m = RE_REGTOK.exec(String(tok || '').trim());
  if (!m || !secret) return false;
  const iat = parseInt(m[2], 36) * 1000;
  if (!Number.isFinite(iat) || iat > now + 5 * 60 * 1000 || now - iat > TOKEN_DAYS * 864e5) return false;
  const want = createHmac('sha256', secret).update(`terrain-reg|r1|${m[1]}|${m[2]}`, 'utf8').digest('base64url').slice(0, 32);
  return timingSafeEqual(Buffer.from(want), Buffer.from(m[3]));
}
const regRequired = () => !requireCode() && !!regSecret();
// Constant-time over every configured code: hash both sides, compare all.
function codeOk(given) {
  const m = codes();
  if (m.size === 0) return true;
  const g = (given || '').trim().toLowerCase();
  if (!g) return false;
  const gh = sha(g);
  let hit = false;
  for (const code of m.keys()) if (timingSafeEqual(gh, sha(code))) hit = true;
  return hit;
}

// ---------------------------------------------------------------- helpers
class Fail extends Error {
  constructor(status, error, extra) { super(error); this.status = status; this.error = error; this.extra = extra || null; }
}
const NO_STORE = 'no-store, max-age=0';
const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': NO_STORE }
  });

const rand = n => randomBytes(n).toString('base64url');
function sha(s) { return createHash('sha256').update(String(s), 'utf8').digest(); }
const shaHex = s => sha(s).toString('hex');
function secretOk(given, storedHex) {
  if (typeof given !== 'string' || typeof storedHex !== 'string' || !/^[0-9a-f]{64}$/.test(storedHex)) return false;
  return timingSafeEqual(sha(given), Buffer.from(storedHex, 'hex'));
}

// Plain one-line text: no control characters, runs of space collapsed.
function line(s) {
  return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim();
}
// A note may keep its line breaks; every other control character goes.
function para(s) {
  return String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f\u2028\u2029]+/g, ' ').trim();
}
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const firstName = name => (line(name).split(' ')[0] || '');
const utcDay = t => new Date(t).toISOString().slice(0, 10);
const utcHour = t => new Date(t).toISOString().slice(0, 13);
// The caller's address as Netlify reports it, as the limits count it; ''
// outside Netlify (no limit then). An IPv6 address counts by its /64, which one
// subscriber holds whole; an IPv4-mapped one as its IPv4.
function clientIp(request, context) {
  const ip = context && typeof context.ip === 'string' ? context.ip : (request && request.headers ? request.headers.get('x-nf-client-connection-ip') || '' : '');
  return ipKey(line(ip).slice(0, 64));
}
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
// A client address is only ever kept as a keyed hash, and only for the current
// window: the salt is rolled with the window, so an old tag means nothing.
const ipTag = (ip, salt) => createHmac('sha256', String(salt)).update(ip, 'utf8').digest('base64url').slice(0, 22);
function addYears(t, n) { const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear() + n); return d.getTime(); }
const isExpired = (rec, now = Date.now()) => rec && typeof rec.expires === 'number' && rec.expires <= now;

function need(ok, status, error) { if (!ok) throw new Fail(status, error); }
const str = v => (typeof v === 'string' ? v : '');

function theStore() {
  if (globalThis.__terrainGiftsStore) return globalThis.__terrainGiftsStore;
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

// Read-modify-write. When the store offers ETags (the real Netlify store does)
// the write is conditional and retried, so two observers confirming at the
// same moment cannot overwrite each other. fn mutates cur in place and returns
// the op's answer; it may throw a Fail to abort without writing.
async function mutate(store, key, fn) {
  const cas = typeof store.getWithMetadata === 'function';
  for (let attempt = 0; attempt < 6; attempt++) {
    let cur = null, etag;
    if (cas) {
      const r = await store.getWithMetadata(key, { type: 'json' });
      if (r) { cur = r.data; etag = r.etag; }
    } else {
      cur = await store.get(key, { type: 'json' });
    }
    if (!cur || typeof cur !== 'object') throw new Fail(404, 'not-found');
    if (isExpired(cur)) { await dropKey(store, key, cur); throw new Fail(404, 'not-found'); }
    const res = await fn(cur);
    const w = await store.setJSON(key, cur, cas && etag ? { onlyIfMatch: etag } : undefined);
    if (!w || w.modified !== false) return res;
  }
  throw new Fail(503, 'busy');
}
// The same, for a blob that may not exist yet: fn(cur|null) returns the new
// value, or undefined to leave the blob as it is. Creation is onlyIfNew, so two
// first writes on the same day cannot both win.
async function upsert(store, key, fn) {
  const cas = typeof store.getWithMetadata === 'function';
  for (let attempt = 0; attempt < 8; attempt++) {
    let cur = null, etag, exists = false;
    if (cas) {
      const r = await store.getWithMetadata(key, { type: 'json' });
      if (r) { exists = true; cur = r.data; etag = r.etag; }
    } else {
      cur = await store.get(key, { type: 'json' });
      exists = cur != null;
    }
    const next = await fn(cur && typeof cur === 'object' ? cur : null);
    if (next === undefined) return cur;
    const opts = !exists ? { onlyIfNew: true } : (cas && etag ? { onlyIfMatch: etag } : undefined);
    const w = await store.setJSON(key, next, opts);
    if (!w || w.modified !== false) return next;
  }
  throw new Fail(503, 'busy');
}

// The day's key for client tags: derived from TERRAIN_REG_SECRET and never
// stored, or (without it) a random one kept for the day at g/salt/<day>.
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
// A campaign that has never received a result notes the last day anyone
// opened it (a member through its link, or its pastor listing it), at most
// one write a day, so the sweep can tell an unused campaign from a quiet one.
// Never in the way: a failed note is simply left for another day.
async function markSeen(store, c) {
  const today = utcDay(Date.now());
  if (!c || isPlain(c.subs) || c.seen === today) return;
  try { await mutate(store, 'c/' + c.pub, x => { x.seen = today; }); } catch { /* another day */ }
}

// RETENTION MARKERS. x/<YYYY-MM-DD>/<pub>/<rid>, the UTC day the result
// expires. The daily sweep lists x/ and deletes every result whose day has
// passed, so nothing outlives its retention because nobody came back to it.
const markerKey = (pub, rid, expires) => `x/${utcDay(expires)}/${pub}/${rid}`;
// Delete a blob; for a result, its expiry marker too.
async function dropKey(store, key, rec) {
  await store.delete(key);
  const m = /^r\/([A-Za-z0-9_-]{12})\/([A-Za-z0-9_-]{12})$/.exec(key);
  if (m && rec && typeof rec.expires === 'number') {
    try { await store.delete(markerKey(m[1], m[2], rec.expires)); } catch { /* the sweep tidies it */ }
  }
}

async function loadCampaign(store, pub) {
  need(RE_PUB.test(str(pub)), 400, 'bad-pub');
  const c = await store.get('c/' + pub, { type: 'json' });
  need(c && typeof c === 'object', 404, 'no-campaign');
  return c;
}
// A result, or null. An expired one is deleted on sight.
async function loadResult(store, pub, rid) {
  const key = `r/${pub}/${rid}`;
  const rec = await store.get(key, { type: 'json' });
  if (!rec || typeof rec !== 'object') return null;
  if (isExpired(rec)) { await dropKey(store, key, rec); return null; }
  return rec;
}
function checkIds(b, { rid = true } = {}) {
  need(RE_PUB.test(str(b.pub)), 400, 'bad-pub');
  if (rid) need(RE_RID.test(str(b.rid)), 400, 'bad-rid');
}
async function authResult(store, b) {
  checkIds(b);
  need(RE_KEY.test(str(b.token)), 403, 'bad-token');
  const rec = await loadResult(store, b.pub, b.rid);
  need(rec, 404, 'not-found');
  need(secretOk(b.token, rec.tokenHash), 403, 'bad-token');
  return rec;
}
async function authOwner(store, b) {
  const c = await loadCampaign(store, b.pub);
  need(RE_KEY.test(str(b.key)), 403, 'bad-key');
  need(secretOk(b.key, c.keyHash), 403, 'bad-key');
  return c;
}

// Run fn over items, n at a time (a campaign can hold thousands of results).
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const j = i++; out[j] = await fn(items[j]); }
  }));
  return out;
}
async function resultKeys(store, pub) {
  const l = await store.list({ prefix: `r/${pub}/` });
  return ((l && l.blobs) || []).map(b => b.key);
}
// One result by key, or null; an expired one is deleted on the way.
async function readLive(store, key, now) {
  const rec = await store.get(key, { type: 'json' });
  if (!rec || typeof rec !== 'object') return null;
  if (isExpired(rec, now)) { await dropKey(store, key, rec); return null; }
  return rec;
}
// How many live results a campaign holds.
async function liveCount(store, pub) {
  const keys = await resultKeys(store, pub);
  const now = Date.now();
  return (await pool(keys, 32, key => readLive(store, key, now))).filter(Boolean).length;
}

const observersOut = rec => (Array.isArray(rec.observers) ? rec.observers : [])
  .map(o => ({ name: o.name, ratings: o.ratings, note: o.note || '', ts: o.ts }));

const emailConfigured = () => !!((process.env.RESEND_API_KEY || '').trim() && (process.env.GIFTS_FROM || '').trim());

// ---------------------------------------------------------------- campaign context
// The shape the member page reads (its GF_CTX):
//   {church, fac:[facility ids], min:{<ministry name>:'r'|'s'}, churchId,
//    needs:[{id, v, x|null}], area, year|null}
// Rebuilt field by field: unknown fields are dropped, a wrong type or an
// oversized value is refused (400 bad-ctx), more than 16 KB is 413. Ministry
// names are object keys, so a key that could reach an object's prototype is
// refused outright rather than stored.
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const own = (o, k) => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);
function ctxStr(v, max) {
  if (v == null) return '';
  need(typeof v === 'string', 400, 'bad-ctx');
  const s = line(v);
  need(s.length <= max, 400, 'bad-ctx');
  return s;
}
function cleanCtx(raw) {
  need(isPlain(raw), 400, 'bad-ctx');
  let size = 0;
  try { size = Buffer.byteLength(JSON.stringify(raw), 'utf8'); } catch { throw new Fail(400, 'bad-ctx'); }
  need(size <= MAX_CTX, 413, 'too-large');
  const out = {
    church: ctxStr(own(raw, 'church'), MAX_CHURCH), fac: [], min: {},
    churchId: ctxStr(own(raw, 'churchId'), MAX_CTX_ID), needs: [],
    area: ctxStr(own(raw, 'area'), MAX_CTX_AREA), year: null
  };
  const fac = own(raw, 'fac');
  if (fac != null) {
    need(Array.isArray(fac) && fac.length <= MAX_CTX_FAC, 400, 'bad-ctx');
    for (const f of fac) {
      need(typeof f === 'string' && /^[a-z0-9_-]{1,40}$/.test(f), 400, 'bad-ctx');
      if (!out.fac.includes(f)) out.fac.push(f);
    }
  }
  const min = own(raw, 'min');
  if (min != null) {
    need(isPlain(min), 400, 'bad-ctx');
    const keys = Object.keys(min);
    need(keys.length <= MAX_CTX_MIN, 400, 'bad-ctx');
    for (const k of keys) {
      need(!FORBIDDEN_KEYS.has(k), 400, 'bad-ctx');
      need(k.length >= 1 && k.length <= MAX_CTX_MIN_NAME && line(k) === k, 400, 'bad-ctx');
      need(min[k] === 'r' || min[k] === 's', 400, 'bad-ctx');
      out.min[k] = min[k];
    }
  }
  const needs = own(raw, 'needs');
  if (needs != null) {
    need(Array.isArray(needs) && needs.length <= MAX_CTX_NEEDS, 400, 'bad-ctx');
    const seen = new Set();
    for (const n of needs) {
      need(isPlain(n), 400, 'bad-ctx');
      const id = own(n, 'id'), v = own(n, 'v');
      need(typeof id === 'string' && /^[a-z0-9-]{1,40}$/.test(id) && !seen.has(id), 400, 'bad-ctx');
      need(Number.isInteger(v) && Math.abs(v) <= 1e9, 400, 'bad-ctx');
      const x = ctxStr(own(n, 'x'), MAX_CTX_X);
      seen.add(id);
      out.needs.push({ id, v, x: x || null });
    }
  }
  const year = own(raw, 'year');
  if (year != null) {
    need(Number.isInteger(year) && year >= 2009 && year <= 2100, 400, 'bad-ctx');
    out.year = year;
  }
  return out;
}

// What a member sends with a result, checked once for submit and update.
function resultFields(b) {
  const code = str(b.code);
  need(code.startsWith('TG1-'), 400, 'bad-code');
  need(code.length <= MAX_CODE, 413, 'too-large');
  need(/^TG1-[A-Za-z0-9_\-=.]+$/.test(code), 400, 'bad-code');
  need(b.name == null || typeof b.name === 'string', 400, 'bad-name');
  const name = line(b.name);
  need(name.length <= MAX_NAME, 400, 'bad-name');
  // A true boolean or nothing. "true", 1, "yes" are refused rather than read
  // as "adult", which would store a child's address.
  need(b.minor == null || typeof b.minor === 'boolean', 400, 'bad-minor');
  const minor = b.minor === true;
  const emailOk = !minor && b.emailOk === true;
  // An address is kept only for an adult who ticked consent, gave one
  // plausible address as text, and only while email can actually be sent.
  // Anything else is dropped, never stored.
  let email = null;
  if (emailOk && emailConfigured() && typeof b.email === 'string') {
    const e = line(b.email);
    if (e && e.length <= MAX_EMAIL && RE_EMAIL.test(e)) email = e;
  }
  const lang = b.lang === 'es' ? 'es' : 'en';
  return { code, name, minor, emailOk, email, lang };
}

// ---------------------------------------------------------------- ops
const OPS = {
  async status() {
    return { ok: true, fn: FN_VERSION, email: emailConfigured() };
  },

  async id(b, { request, store, context }) {
    if (requireCode() && !codeOk(request.headers.get('x-terrain-code'))) throw new Fail(401, 'nocode');
    if (regRequired() && !regTokenOk(request.headers.get('x-terrain-reg'), regSecret())) throw new Fail(401, 'noreg');
    const ctx = b.ctx == null ? null : cleanCtx(b.ctx);
    const church = line(str(b.church)).slice(0, MAX_CHURCH) || (ctx ? ctx.church : '');
    // Ten a day from one client: one small blob per client and day.
    const ip = clientIp(request, context);
    if (ip) {
      const day = utcDay(Date.now());
      const tag = ipTag(ip, await daySalt(store, day));
      await upsert(store, `g/cid/${day}/${tag}`, cur => {
        const n = cur && Number.isInteger(cur.n) && cur.n > 0 ? cur.n : 0;
        need(n < MAX_IP_CAMPAIGNS, 429, 'slow-down');
        return { n: n + 1 };
      });
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      const pub = rand(9), key = rand(24);
      if (await store.get('c/' + pub, { type: 'json' })) continue;
      const created = Date.now();
      const rec = { pub, keyHash: shaHex(key), created, church, sends: { date: '', n: 0 } };
      if (ctx) { rec.ctx = ctx; rec.ctxAt = created; }
      const w = await store.setJSON('c/' + pub, rec, { onlyIfNew: true });
      if (w && w.modified === false) continue;
      // ctx:true tells the page the context is held here, so the short link
      // is safe to hand out (a server without this op would not say so).
      return ctx ? { pub, key, ctx: true } : { pub, key };
    }
    throw new Fail(503, 'busy');
  },

  // Public: church information and neighbourhood figures, nothing a member
  // wrote. A campaign without a context answers ctx:null.
  async ctx(b, { store }) {
    const c = await loadCampaign(store, b.pub);
    await markSeen(store, c);
    return c.closed ? { ok: true, ctx: isPlain(c.ctx) ? c.ctx : null, closed: true } : { ok: true, ctx: isPlain(c.ctx) ? c.ctx : null };
  },

  // The pastor closes a link: nothing new comes in through it. What is already
  // there can still be listed, confirmed, emailed, updated and deleted.
  async close(b, { store }) {
    checkIds(b, { rid: false });
    need(RE_KEY.test(str(b.key)), 403, 'bad-key');
    await authOwner(store, b);
    await mutate(store, 'c/' + b.pub, c => {
      need(secretOk(b.key, c.keyHash), 403, 'bad-key');
      c.closed = true; c.closedAt = Date.now();
    });
    return { ok: true };
  },

  // The pastor deletes many results at once (a flood of junk, or a closed link).
  async purge(b, { store }) {
    checkIds(b, { rid: false });
    await authOwner(store, b);
    need(Array.isArray(b.rids) && b.rids.length >= 1 && b.rids.length <= MAX_PURGE, 400, 'bad-rids');
    const rids = [...new Set(b.rids)];
    need(rids.every(r => RE_RID.test(str(r))), 400, 'bad-rids');
    let deleted = 0;
    await pool(rids, 16, async rid => {
      const key = `r/${b.pub}/${rid}`;
      const rec = await store.get(key, { type: 'json' });
      if (!rec || typeof rec !== 'object') return;
      await dropKey(store, key, rec); deleted++;
    });
    return { ok: true, deleted };
  },

  async setctx(b, { store }) {
    checkIds(b, { rid: false });
    need(RE_KEY.test(str(b.key)), 403, 'bad-key');
    const ctx = cleanCtx(b.ctx);
    await authOwner(store, b);
    await mutate(store, 'c/' + b.pub, c => {
      need(secretOk(b.key, c.keyHash), 403, 'bad-key');
      c.ctx = ctx; c.ctxAt = Date.now();
      if (ctx.church) c.church = ctx.church;
    });
    return { ok: true };
  },

  async submit(b, { store, request, context }) {
    const camp = await loadCampaign(store, b.pub);
    const { code, name, minor, emailOk, email, lang } = resultFields(b);
    need(!camp.closed, 410, 'closed');

    // A full campaign is checked for expired results at most once an hour, so
    // a flood of submissions to it cannot turn each one into thousands of reads.
    let count = (await resultKeys(store, b.pub)).length;
    if (count >= MAX_RESULTS) {
      const recent = typeof camp.fullAt === 'number' && Date.now() - camp.fullAt < FULL_RESCAN_MS;
      if (!recent) {
        count = await liveCount(store, b.pub);
        if (count >= MAX_RESULTS) await mutate(store, 'c/' + b.pub, c => { c.fullAt = Date.now(); });
      }
    }
    need(count < MAX_RESULTS, 429, 'campaign-full');

    // Rate: this client per hour first (so one sender's refusals can never use
    // up the campaign's allowance), then this campaign per hour and per day.
    const now = Date.now(), hour = utcHour(now), day = utcDay(now);
    const ip = clientIp(request, context);
    if (ip) {
      await upsert(store, 'g/ip', g => {
        const cur = g && g.hour === hour && typeof g.salt === 'string' ? g : { hour, salt: rand(18), to: {} };
        const to = isPlain(cur.to) ? cur.to : {};
        const tag = ipTag(ip, cur.salt);
        const mine = Object.prototype.hasOwnProperty.call(to, tag) ? to[tag] : 0;
        need(mine < MAX_IP_SUBMITS, 429, 'slow-down');
        return { hour, salt: cur.salt, to: { ...to, [tag]: mine + 1 } };
      });
    }
    await mutate(store, 'c/' + b.pub, c => {
      need(!c.closed, 410, 'closed');
      const s = isPlain(c.subs) ? c.subs : {};
      const h = s.hour === hour ? (s.h || 0) : 0, d = s.day === day ? (s.d || 0) : 0;
      need(h < MAX_CAMP_SUBMITS_HOUR && d < MAX_CAMP_SUBMITS_DAY, 429, 'slow-down');
      c.subs = { hour, h: h + 1, day, d: d + 1 };
    });

    const ts = Date.now();
    for (let attempt = 0; attempt < 5; attempt++) {
      const rid = rand(9), token = rand(24);
      const key = `r/${b.pub}/${rid}`;
      if (await store.get(key, { type: 'json' })) continue;
      const rec = {
        rid, tokenHash: shaHex(token), code, name,
        email, emailOk: !!(email && emailOk), minor, lang,
        ts, expires: addYears(ts, minor ? 1 : 2),
        observers: [], invites: [], emails: 0,
        // The address is unconfirmed until a link email is opened (op verify).
        vtoks: [], emailVerified: false, pdfs: 0
      };
      // The marker first: a result is never stored without one.
      await store.setJSON(markerKey(b.pub, rid, rec.expires), {});
      const w = await store.setJSON(key, rec, { onlyIfNew: true });
      if (w && w.modified === false) continue;
      return { ok: true, rid, token, hasEmail: !!rec.email };
    }
    throw new Fail(503, 'busy');
  },

  // The member sends again (new answers, or new details). The same record is
  // replaced in place, so nothing is left behind that the phone can no longer
  // delete: observers, invites and the email count stay; the first send's
  // date stays as ts0; the record is never kept longer than first promised,
  // and becomes one year from ts0 if the member is now under 18.
  async update(b, { store }) {
    checkIds(b);
    need(RE_KEY.test(str(b.token)), 403, 'bad-token');
    const f = resultFields(b);
    await loadCampaign(store, b.pub);
    const key = `r/${b.pub}/${b.rid}`;
    const now0 = await loadResult(store, b.pub, b.rid);
    need(now0, 404, 'not-found');
    need(secretOk(b.token, now0.tokenHash), 403, 'bad-token');
    const expOf = rec => {
      const first = typeof rec.ts0 === 'number' ? rec.ts0 : rec.ts;
      return f.minor ? Math.min(rec.expires, addYears(first, 1)) : rec.expires;
    };
    // The marker for the new day first: a result is never without one.
    const planned = expOf(now0);
    if (planned !== now0.expires) await store.setJSON(markerKey(b.pub, b.rid, planned), {});
    const out = await mutate(store, key, rec => {
      need(secretOk(b.token, rec.tokenHash), 403, 'bad-token');
      const oldExp = rec.expires, exp = expOf(rec);
      rec.ts0 = typeof rec.ts0 === 'number' ? rec.ts0 : rec.ts;
      rec.code = f.code; rec.name = f.name; rec.lang = f.lang; rec.ts = Date.now();
      // A different address (or none) is unconfirmed again: no PDF goes to it
      // until a link email sent to it has been opened.
      // Only A-Z fold: toLowerCase() would also fold the Kelvin sign and other
      // look-alikes, keeping a different mailbox confirmed.
      const fold = e => e.replace(/[A-Z]/g, ch => ch.toLowerCase());
      const same = !!(rec.email && f.email && fold(rec.email) === fold(f.email));
      if (!same) { rec.emailVerified = false; rec.vtoks = []; }
      rec.minor = f.minor; rec.email = f.email; rec.emailOk = !!(f.email && f.emailOk);
      rec.expires = exp;
      return { oldExp, exp, hasEmail: !!rec.email };
    });
    if (out.exp !== planned) await store.setJSON(markerKey(b.pub, b.rid, out.exp), {});
    for (const e of new Set([out.oldExp, planned])) {
      if (e !== out.exp && typeof e === 'number') { try { await store.delete(markerKey(b.pub, b.rid, e)); } catch { /* the sweep tidies it */ } }
    }
    return { ok: true, rid: b.rid, hasEmail: out.hasEmail };
  },

  // Paged by result id so a campaign of thousands of large codes never
  // exceeds Netlify's 6 MB response cap: each page stays under LIST_BUDGET
  // bytes. `next` appears only when more remain; everyday campaigns fit on
  // one page. Only the page being answered is read.
  async list(b, { store }) {
    await markSeen(store, await authOwner(store, b));
    need(b.after == null || RE_RID.test(str(b.after)), 400, 'bad-after');
    const prefix = `r/${b.pub}/`;
    const keys = (await resultKeys(store, b.pub)).sort();
    let i = 0;
    if (b.after != null) { const from = prefix + b.after; while (i < keys.length && keys[i] <= from) i++; }
    const items = [], now = Date.now();
    let used = 0, last = null, full = false;
    while (i < keys.length && !full) {
      const chunk = keys.slice(i, i + 32);
      const recs = await pool(chunk, 32, key => readLive(store, key, now));
      for (let j = 0; j < chunk.length; j++) {
        const r = recs[j];
        if (r) {
          const item = {
            rid: r.rid, code: r.code, name: r.name, ts: r.ts, minor: !!r.minor,
            hasEmail: !!r.email, observers: observersOut(r), lang: r.lang || 'en', expires: r.expires
          };
          const size = Buffer.byteLength(JSON.stringify(item), 'utf8') + 1;
          if (items.length && used + size > LIST_BUDGET) { full = true; break; }
          items.push(item); used += size;
        }
        last = chunk[j]; i++;
      }
    }
    items.sort((x, y) => (x.ts || 0) - (y.ts || 0));
    const out = { items };
    if (i < keys.length && last) out.next = last.slice(prefix.length);
    return out;
  },

  async get(b, { store }) {
    const r = await authResult(store, b);
    return {
      ok: true, code: r.code, name: r.name, ts: r.ts, minor: !!r.minor,
      observers: observersOut(r), lang: r.lang || 'en', expires: r.expires, hasEmail: !!r.email,
      invitesOpen: (r.invites || []).filter(i => !i.used).length
    };
  },

  async delete(b, { store }) {
    checkIds(b);
    let rec;
    if (b.key != null) {
      await authOwner(store, b);
      rec = await loadResult(store, b.pub, b.rid);
      need(rec, 404, 'not-found');
    } else if (b.token != null) {
      rec = await authResult(store, b);
    } else {
      throw new Fail(400, 'bad-auth');
    }
    await dropKey(store, `r/${b.pub}/${b.rid}`, rec);
    return { ok: true };
  },

  async invite(b, { store }) {
    checkIds(b);
    need(RE_KEY.test(str(b.token)), 403, 'bad-token');
    need(Array.isArray(b.gifts), 400, 'bad-gifts');
    const gifts = [...new Set(b.gifts)];
    need(gifts.length >= 1 && gifts.length <= MAX_INVITE_GIFTS && gifts.every(g => GIFT_IDS.has(g)), 400, 'bad-gifts');
    return mutate(store, `r/${b.pub}/${b.rid}`, rec => {
      need(secretOk(b.token, rec.tokenHash), 403, 'bad-token');
      rec.invites = Array.isArray(rec.invites) ? rec.invites : [];
      rec.observers = Array.isArray(rec.observers) ? rec.observers : [];
      need(rec.observers.length < MAX_OBSERVERS, 409, 'full');
      need(rec.invites.filter(i => !i.used).length < MAX_OPEN_INVITES, 429, 'too-many-invites');
      const itok = rand(18);
      rec.invites.push({ h: shaHex(itok), gifts, ts: Date.now(), used: false });
      return { ok: true, itok };
    });
  },

  async peek(b, { store }) {
    checkIds(b);
    need(RE_ITOK.test(str(b.itok)), 403, 'bad-invite');
    const c = await loadCampaign(store, b.pub);
    const rec = await loadResult(store, b.pub, b.rid);
    need(rec, 404, 'not-found');
    const inv = findInvite(rec, b.itok);
    need(inv, 403, 'bad-invite');
    // The member's language rides with a refusal too, so the observer who taps
    // the link a second time is answered in it.
    const lang = rec.lang === 'es' ? 'es' : 'en';
    if (inv.used) throw new Fail(410, 'used', { lang });
    if ((rec.observers || []).length >= MAX_OBSERVERS) throw new Fail(409, 'full', { lang });
    return { ok: true, first: firstName(rec.name), gifts: inv.gifts, church: c.church || '', lang };
  },

  async confirm(b, { store }) {
    checkIds(b);
    need(RE_ITOK.test(str(b.itok)), 403, 'bad-invite');
    need(typeof b.name === 'string', 400, 'bad-name');
    const name = line(b.name);
    need(name.length >= 1 && name.length <= MAX_OBS_NAME, 400, 'bad-name');
    need(b.note == null || typeof b.note === 'string', 400, 'bad-note');
    const note = para(b.note);
    need(note.length <= MAX_NOTE, 400, 'bad-note');
    need(b.ratings && typeof b.ratings === 'object' && !Array.isArray(b.ratings), 400, 'bad-ratings');
    return mutate(store, `r/${b.pub}/${b.rid}`, rec => {
      const inv = findInvite(rec, b.itok);
      need(inv, 403, 'bad-invite');
      need(!inv.used, 410, 'used');
      rec.observers = Array.isArray(rec.observers) ? rec.observers : [];
      need(rec.observers.length < MAX_OBSERVERS, 409, 'full');
      // Only the gifts this invite asked about; anything else is ignored.
      const ratings = {};
      for (const g of inv.gifts) {
        if (!Object.prototype.hasOwnProperty.call(b.ratings, g)) continue;
        const v = b.ratings[g];
        need(Number.isInteger(v) && v >= -1 && v <= 4, 400, 'bad-ratings');
        ratings[g] = v;
      }
      need(Object.keys(ratings).length > 0, 400, 'bad-ratings');
      const ts = Date.now();
      rec.observers.push({ name, ratings, note, ts });
      inv.used = true; inv.usedTs = ts;
      return { ok: true };
    });
  },

  // The LINK email: a fixed template and the private link, nothing attached,
  // whatever else was sent (a pdf here is ignored). Each one carries a new
  // verification token; opening the link proves the inbox is the member's.
  async email(b, env) {
    if (!emailConfigured()) throw new Fail(501, 'email-off');
    checkIds(b);
    return deliver(b, env, 'link', null);
  },

  // The link from a link email was opened: the address is the member's. Only
  // the result's token and a verification token that was emailed can do this.
  // Idempotent: opening the link again changes nothing.
  async verify(b, { store }) {
    checkIds(b);
    need(RE_KEY.test(str(b.token)), 403, 'bad-token');
    need(RE_KEY.test(str(b.vtok)), 403, 'bad-vtok');
    return mutate(store, `r/${b.pub}/${b.rid}`, r => {
      need(secretOk(b.token, r.tokenHash), 403, 'bad-token');
      need(r.email && r.emailOk === true && !r.minor, 403, 'no-email');
      need(vtokOk(r, b.vtok), 403, 'bad-vtok');
      if (r.emailVerified !== true) { r.emailVerified = true; r.verifiedAt = Date.now(); }
      return { ok: true, verified: true, pdfSent: (r.pdfs || 0) > 0 };
    });
  },

  // The PDF copy, attached: only to an address that has opened a link email.
  async emailpdf(b, env) {
    if (!emailConfigured()) throw new Fail(501, 'email-off');
    checkIds(b);
    // The PDF first: cheap to check, and nothing is reserved for a bad one.
    let pdf = str(b.pdf).replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
    need(pdf.length > 0 && /^[A-Za-z0-9+/_-]+={0,2}$/.test(pdf), 400, 'bad-pdf');
    need(pdf.length <= Math.ceil(MAX_PDF / 3) * 4 + 4, 413, 'too-large');
    const bytes = Buffer.from(pdf.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    need(bytes.length <= MAX_PDF, 413, 'too-large');
    need(bytes.length > 5 && bytes.subarray(0, 5).toString('latin1') === '%PDF-', 400, 'bad-pdf');
    need(!pdfActive(bytes), 400, 'bad-pdf');
    return deliver(b, env, 'pdf', bytes);
  }
};

// One email, link or PDF. Every counter is reserved before sending and given
// back if the send fails. Order: the result's own allowance (checked), the
// campaign, all campaigns + this address + this client, the result.
async function deliver(b, { store, request, context }, kind, bytes) {
  const isPdf = kind === 'pdf';
  const counter = isPdf ? 'pdfs' : 'emails', cap = isPdf ? MAX_PDFS : MAX_EMAILS;
  // The PDF copy needs a verification token from a link email as well as the
  // result's token. Whoever submitted the result holds its token; only the
  // inbox holds a VTOK. Without this, once the inbox owner had opened the link
  // the submitter could attach a PDF of their own writing, and could poll to
  // learn whether the link had been opened (security review of gifts-1.1).
  const eligible = r => {
    need(r.email && r.emailOk === true && !r.minor, 403, 'no-email');
    if (isPdf) {
      need(vtokOk(r, b.vtok), 403, 'bad-vtok');
      need(r.emailVerified === true, 403, 'not-verified');
    }
    need((r[counter] || 0) < cap, 429, 'email-limit');
  };
  const rec = await authResult(store, b);
  eligible(rec);
  const camp = await loadCampaign(store, b.pub);

  const today = utcDay(Date.now());
  const held = [];
  const release = async () => {
    for (const undo of held.reverse()) { try { await undo(); } catch { /* best effort */ } }
  };
  // A new verification token for a link email; only its hash is kept.
  const vtok = isPdf ? null : rand(24), vh = vtok ? shaHex(vtok) : null;
  let fresh;
  try {
    await mutate(store, 'c/' + b.pub, c => {
      const s = c.sends && c.sends.date === today ? c.sends : { date: today, n: 0 };
      need(s.n < MAX_DAILY_SENDS, 429, 'daily-limit');
      c.sends = { date: today, n: s.n + 1 };
    });
    held.push(() => mutate(store, 'c/' + b.pub, c => {
      if (c.sends && c.sends.date === today && c.sends.n > 0) c.sends = { date: today, n: c.sends.n - 1 };
    }));

    // Across every campaign: a daily ceiling, and a per-address one so no
    // inbox can be flooded by submitting its address to many results. The
    // address is kept only as a keyed hash, and only for today.
    // One client address is capped too, so a single sender cannot drain the
    // shared ceiling and shut email off for every other church.
    const who = recipientTag(rec.email);
    const ip = clientIp(request, context);
    let ipt = '';
    await upsert(store, 'g/sends', g => {
      const d = g && g.date === today ? g : { date: today, n: 0, to: {} };
      const to = d.to && typeof d.to === 'object' && !Array.isArray(d.to) ? d.to : {};
      const salt = typeof d.salt === 'string' && d.salt ? d.salt : rand(18);
      const ips = isPlain(d.ip) ? d.ip : {};
      ipt = ip ? ipTag(ip, salt) : '';
      const mine = Object.prototype.hasOwnProperty.call(to, who) ? to[who] : 0;
      const fromIp = ipt && Object.prototype.hasOwnProperty.call(ips, ipt) ? ips[ipt] : 0;
      need((d.n || 0) < MAX_GLOBAL_SENDS, 429, 'daily-limit');
      need(mine < MAX_RECIPIENT_SENDS, 429, 'daily-limit');
      need(fromIp < MAX_IP_SENDS, 429, 'daily-limit');
      return { date: today, n: (d.n || 0) + 1, to: { ...to, [who]: mine + 1 }, salt, ip: ipt ? { ...ips, [ipt]: fromIp + 1 } : ips };
    });
    held.push(() => upsert(store, 'g/sends', g => {
      if (!g || g.date !== today) return undefined;
      const to = { ...(g.to || {}) };
      if (to[who] > 1) to[who] -= 1; else delete to[who];
      const ips = { ...(isPlain(g.ip) ? g.ip : {}) };
      if (ipt) { if (ips[ipt] > 1) ips[ipt] -= 1; else delete ips[ipt]; }
      return { ...g, date: today, n: Math.max(0, (g.n || 0) - 1), to, ip: ips };
    }));

    fresh = await mutate(store, `r/${b.pub}/${b.rid}`, r => {
      need(secretOk(b.token, r.tokenHash), 403, 'bad-token');
      // The address counted above is the address mailed. An op 'update' that
      // changed it in the meantime (a race to reach an inbox without counting
      // against its daily five) makes this send try again.
      need(r.email === rec.email, 503, 'busy');
      eligible(r);
      r[counter] = (r[counter] || 0) + 1;
      if (vh) r.vtoks = [...(Array.isArray(r.vtoks) ? r.vtoks : []), vh].slice(-MAX_EMAILS);
      return { email: r.email, name: r.name, ts: r.ts, lang: r.lang, pdfs: r.pdfs || 0 };
    });
    held.push(() => mutate(store, `r/${b.pub}/${b.rid}`, r => {
      if ((r[counter] || 0) > 0) r[counter] -= 1;
      if (vh && Array.isArray(r.vtoks)) r.vtoks = r.vtoks.filter(h => h !== vh);
    }));
  } catch (e) { await release(); throw e; }

  const lang = b.lang === 'es' || b.lang === 'en' ? b.lang : (fresh.lang === 'es' ? 'es' : 'en');
  const church = mailChurch(camp.church);
  let msg, attachments;
  if (isPdf) {
    msg = composePdfEmail({ lang, name: fresh.name, church });
    attachments = [{ filename: pdfName(fresh.name, fresh.ts), content: bytes.toString('base64') }];
  } else {
    // The link's base: SITE_URL, else the site's own address as Netlify
    // reports it, and only outside Netlify the origin of the request. Never a
    // host the caller chose.
    const siteUrl = context && context.site && typeof context.site.url === 'string' ? context.site.url : '';
    const base = ((process.env.SITE_URL || '').trim() || siteUrl.trim() || new URL(request.url).origin).replace(/\/+$/, '');
    // A Spanish report's link says so, so it opens in Spanish on any device,
    // even after the result is gone and the server can no longer tell.
    const link = `${base}/#gifts-report=${b.pub}.${b.rid}.${b.token}.${vtok}${lang === 'es' ? '~es' : ''}`;
    msg = composeEmail({ lang, name: fresh.name, church, link, pdfFollows: fresh.pdfs === 0 });
  }
  const payload = {
    from: process.env.GIFTS_FROM.trim(),
    to: [fresh.email],
    subject: msg.subject,
    html: msg.html,
    text: msg.text
  };
  if (attachments) payload.attachments = attachments;
  let sent = false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + process.env.RESEND_API_KEY.trim(),
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8500)
    });
    sent = !!(res && res.ok);
  } catch { sent = false; }
  if (!sent) {
    await release();
    throw new Fail(502, 'send-failed');
  }
  // pdfFollows: no PDF copy has gone yet, so the email says one can be asked
  // for from the opened link (the page sends it only on the member's tap).
  return isPdf ? { ok: true } : { ok: true, pdfFollows: fresh.pdfs === 0 };
}

// A short keyed hash of an address, for today's per-recipient count. Keyed
// with the Resend key so the stored tag cannot be matched against a list of
// addresses by anyone who reads the store. The inbox, not the spelling, is
// counted: a +tag and dots in the local part are dropped (and googlemail.com
// is gmail.com), so victim+1@, v.ictim@ and victim@ share one daily five.
function recipientTag(email) {
  let e = String(email).trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at > 0) {
    const local = e.slice(0, at).split('+')[0].replace(/\./g, '');
    const dom = e.slice(at + 1) === 'googlemail.com' ? 'gmail.com' : e.slice(at + 1);
    if (local) e = local + '@' + dom;
  }
  return createHmac('sha256', (process.env.RESEND_API_KEY || '').trim())
    .update(e, 'utf8').digest('base64url').slice(0, 22);
}

// Active content a mailed report never needs. jsPDF writes none of these, so
// a PDF carrying one did not come from Terrain and is refused: the email can
// never deliver a script, a launch action, an embedded file, a remote go-to or
// a form that submits. Object streams are refused too, because they are the
// one place a PDF can hide a dictionary inside compressed bytes. Every name
// token is read, #-escapes decoded (/Java#53cript), and compared exactly.
// Terrain's own reports carry no links, annotations, forms or images either,
// so those are refused as well: a clickable page (a /Link or /URI, an /AA
// additional action, a form /Widget) or a picture would let the email carry a
// phishing page under Terrain's name. The only opening action allowed is
// jsPDF's own page view, an array ([3 0 R /FitH null]); a dictionary there
// (<</S /URI …>>) or a reference is refused.
const PDF_BLOCK = new Set(['JavaScript', 'Launch', 'EmbeddedFile', 'EmbeddedFiles', 'RichMedia',
  'XFA', 'ObjStm', 'GoToR', 'GoToE', 'SubmitForm', 'ImportData',
  'URI', 'Annots', 'AA', 'Link', 'AcroForm', 'Widget', 'GoTo', 'Named', 'Rendition', 'Sound', 'Movie', 'Image']);
function pdfActive(bytes) {
  const s = bytes.toString('latin1');
  const re = /\/([^\x00\x09\x0a\x0c\x0d\x20/[\]()<>{}%]{2,48})/g;
  let m;
  while ((m = re.exec(s))) {
    let n = m[1];
    if (n.includes('#')) n = n.replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    if (PDF_BLOCK.has(n)) return true;
    if (n === 'OpenAction' && !/^[\x00\x09\x0a\x0c\x0d\x20]*\[/.test(s.slice(re.lastIndex, re.lastIndex + 256))) return true;
  }
  return false;
}

// A verification token matches one of the link emails sent to the record's
// current address (op update forgets them when the address changes).
function vtokOk(rec, vtok) {
  if (!RE_KEY.test(str(vtok))) return false;
  let hit = false;
  for (const h of (Array.isArray(rec.vtoks) ? rec.vtoks : [])) if (secretOk(vtok, h)) hit = true;
  return hit;
}

function findInvite(rec, itok) {
  let hit = null;
  for (const inv of (Array.isArray(rec.invites) ? rec.invites : [])) {
    if (inv && secretOk(itok, inv.h) && !hit) hit = inv;
  }
  return hit;
}

// <First>-<Last>-Spiritual-Gifts-<YYYY-MM-DD>.pdf, ASCII only.
function pdfName(name, ts) {
  const words = line(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(' ').map(w => w.replace(/[^A-Za-z0-9]/g, '').slice(0, MAX_GREET)).filter(Boolean);
  const who = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  const day = utcDay(typeof ts === 'number' ? ts : Date.now());
  return [...who, 'Spiritual', 'Gifts', day].join('-') + '.pdf';
}

// The two fixed emails. Transactional: the report the member asked for, a
// private link back to it, how to delete it, and (once the link is opened) a
// PDF copy. Nothing else.
// The greeting name: letters of any script, marks, apostrophes and hyphens,
// at most 40. Whoever submits a result chooses the name, so it may not carry
// a web address, an email address, digits or markup into the message.
const greetName = name => firstName(name).replace(/[^\p{L}\p{M}'’-]/gu, '').slice(0, MAX_GREET);
// The church, as the email may name it: letters, digits, spaces, apostrophes,
// ampersands and hyphens only, so no dot, slash, colon or @ can make a web or
// email address of it; no digits at all when there are more than four (a
// phone number); at most 60 characters, ending on a whole word.
const MAX_MAIL_CHURCH = 60;
function mailChurch(c) {
  let s = line(c).replace(/[^\p{L}\p{M}\p{N}'’&\- ]/gu, ' ');
  if ((s.match(/\p{N}/gu) || []).length > 4) s = s.replace(/\p{N}/gu, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > MAX_MAIL_CHURCH) s = s.slice(0, MAX_MAIL_CHURCH + 1).replace(/\s+\S*$/, '').slice(0, MAX_MAIL_CHURCH).trim();
  return /[\p{L}]/u.test(s) ? s : '';
}
const mailShell = (es, paras) => `<!doctype html><html lang="${es ? 'es' : 'en'}"><body style="margin:0;padding:24px;background:#ffffff;color:#1f2937;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.55">
${paras.join('\n')}
</body></html>`;

// Email 1: the private link. No attachment, ever.
function composeEmail({ lang, name, church, link, pdfFollows }) {
  const first = greetName(name);
  const es = lang === 'es';
  const subject = es ? 'Su informe de dones espirituales' : 'Your spiritual gifts report';
  const hello = es ? (first ? `Hola, ${first}:` : 'Hola:') : (first ? `Hello ${first},` : 'Hello,');
  const thanks = es
    ? `Gracias por completar la evaluación de dones espirituales${church ? ` en ${church}` : ''}. Su informe está listo.`
    : `Thank you for taking the spiritual gifts assessment${church ? ` at ${church}` : ''}. Your report is ready.`;
  const linkLead = es
    ? 'Ábralo con este enlace privado, en este teléfono o en cualquier otro dispositivo:'
    : 'Open it with this private link, on this phone or any other device:';
  const linkText = es ? 'Ver mi informe' : 'View my report';
  const follows = pdfFollows === false ? '' : (es
    ? 'Cuando lo abra, también podrá pedir que le enviemos una copia del informe en PDF.'
    : 'When you open it, you can also ask for a PDF copy of the report to be emailed to you.');
  const keep = es
    ? 'Guarde el enlace para usted: cualquier persona que lo tenga puede ver su resultado.'
    : 'Please keep the link to yourself: anyone who has it can see your result.';
  const del = es
    ? 'Su resultado se guarda durante dos años y después se elimina automáticamente. Si desea eliminarlo antes, abra el enlace y use el botón para eliminar su resultado.'
    : 'Your result is kept for two years and then deleted automatically. To delete it sooner, open the link and choose “Delete my result”.';
  const only = es
    ? 'Su dirección de correo se usa solo para enviarle este informe. Si usted no hizo esta evaluación, puede ignorar este mensaje: no se le enviará nada más a menos que alguien abra el enlace y lo pida.'
    : 'Your email address is used only to send you this report. If you did not take this assessment, you can ignore this email: nothing more is sent unless someone opens the link and asks for it.';
  const sign = 'Terrain';

  // HTML: every piece of member-supplied text escaped; the link is built from
  // validated identifiers and escaped anyway.
  const html = mailShell(es, [
    `<p>${esc(hello)}</p>`,
    `<p>${esc(thanks)}</p>`,
    `<p>${esc(linkLead)}<br><a href="${esc(link)}" style="color:#0E8F6E">${esc(linkText)}</a></p>`,
    follows ? `<p>${esc(follows)}</p>` : '',
    `<p>${esc(keep)}</p>`,
    `<p>${esc(del)}</p>`,
    `<p style="color:#6b7280;font-size:14px">${esc(only)}</p>`,
    `<p>${esc(sign)}</p>`].filter(Boolean));
  const text = [hello, '', thanks, '', linkLead, link, '', ...(follows ? [follows, ''] : []), keep, '', del, '', only, '', sign].join('\n');
  return { subject, html, text };
}

// Email 2: the PDF copy, only to an address that opened email 1. No link:
// the private link is in the first email.
function composePdfEmail({ lang, name, church }) {
  const first = greetName(name);
  const es = lang === 'es';
  const subject = es ? 'Su informe de dones espirituales (PDF)' : 'Your spiritual gifts report (PDF)';
  const hello = es ? (first ? `Hola, ${first}:` : 'Hola:') : (first ? `Hello ${first},` : 'Hello,');
  const here = es
    ? `Aquí tiene la copia en PDF de su informe de dones espirituales${church ? ` de ${church}` : ''}. Va adjunta a este mensaje.`
    : `Here is the PDF copy of your spiritual gifts report${church ? ` from ${church}` : ''}. It is attached to this email.`;
  const back = es
    ? 'Para volver a ver el informe, o para eliminarlo, use el enlace privado de nuestro mensaje anterior.'
    : 'To see the report again, or to delete it, use the private link in our earlier email.';
  const only = es
    ? 'Su dirección de correo se usa solo para enviarle este informe.'
    : 'Your email address is used only to send you this report.';
  const sign = 'Terrain';
  const html = mailShell(es, [`<p>${esc(hello)}</p>`, `<p>${esc(here)}</p>`, `<p>${esc(back)}</p>`,
    `<p style="color:#6b7280;font-size:14px">${esc(only)}</p>`, `<p>${esc(sign)}</p>`]);
  const text = [hello, '', here, '', back, '', only, '', sign].join('\n');
  return { subject, html, text };
}

// ---------------------------------------------------------------- handler
export default async (request, context) => {
  let op = '';
  try {
    if (request.method === 'GET') return reply(await OPS.status());
    if (request.method !== 'POST') return reply({ ok: false, error: 'method' }, 405);

    const len = Number(request.headers.get('content-length') || 0);
    if (len > MAX_BODY) return reply({ ok: false, error: 'too-large' }, 413);
    const raw = await request.text();
    if (raw.length > MAX_BODY || Buffer.byteLength(raw, 'utf8') > MAX_BODY) {
      return reply({ ok: false, error: 'too-large' }, 413);
    }
    let b;
    try { b = JSON.parse(raw); } catch { return reply({ ok: false, error: 'bad-json' }, 400); }
    if (!b || typeof b !== 'object' || Array.isArray(b)) return reply({ ok: false, error: 'bad-json' }, 400);

    op = typeof b.op === 'string' ? b.op : '';
    if (!Object.prototype.hasOwnProperty.call(OPS, op)) return reply({ ok: false, error: 'unknown-op' }, 400);
    if (op === 'status') return reply(await OPS.status());

    const store = theStore();
    return reply(await OPS[op](b, { request, store, context }));
  } catch (e) {
    if (e instanceof Fail) return reply({ ...(e.extra || {}), ok: false, error: e.error }, e.status);
    // Only the op name: never the message, which could carry a key or a code.
    console.error('gifts: unexpected failure in op ' + (/^[a-z]{1,10}$/.test(op) ? op : '?'));
    return reply({ ok: false, error: 'server' }, 500);
  }
};
