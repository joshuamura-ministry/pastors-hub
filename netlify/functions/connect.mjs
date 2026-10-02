// Terrain · Connection cards server.                                connect-1.0
//
// A church holds a one-day event or a series (a health fair, a back-to-school
// day, a four-night seminar). People who came fill in a short card on their
// own phone (#connect=<id>, by QR code or the printed link): a first name,
// what they would like (the choices come from the event, its theme and its
// next step), one way to reach them only when a choice needs it, and an
// optional private note. This function keeps what they send until the
// pastor's device collects it. Auto-detected at /.netlify/functions/connect —
// no config file. Modelled on gifts.mjs (campaign + key + public id) and
// present.mjs ("I'm in": adults only, no markup, per-client counters).
//
// STORAGE. Netlify Blobs, store "terrain-connect", strong consistency.
//   c/<CID>             the card {cid, keyHash, created, v, lang, kind, look,
//                       cadence, church, title{en,es}, day, parent, note,
//                       nextWhen{en,es}, opts[{k,en,es,contact,off}],
//                       partner{name,line}|null, past{k:{en,es}}, closed,
//                       closedAt, subs{hour,h,day,d}, upd{hour,n}, seen, last}
//                       look: how the phone and the paper draw it (one of nine
//                       colour-and-motif looks); nextWhen: when the next step
//                       starts, for the thank-you ("It starts: …"), may be empty
//   r/<CID>/<RID>       a response {rid, tokenHash, ts, expires, lang, name,
//                       picks[k], reach{t,v}|null, consent, safe, note, cv, taken}
//   t/<CID>/<RID>       a tombstone {ts, expires}: the person withdrew a response
//                       (always written: the pastor's device may have pulled it
//                       before its ack landed; op pull lists it under `gone`,
//                       and the device removes it)
//   x/<day>/r/<CID>/<RID>, x/<day>/t/<CID>/<RID>   expiry markers (empty), day =
//                       the UTC day the blob expires; connect-sweep.mjs deletes
//                       what is due every day
//   g/sub               submissions this hour {hour, salt, to:{<tag>:n}, n}
//   g/new               cards created {hour, salt, to:{<tag>:n}, day, n, tn, regs}
//
// IDS AND SECRETS. The card's public id (CID) is 10 characters from a 31-letter
// alphabet with no 0/O or 1/I/L (about 49 bits), so it can be printed and typed;
// lower case is read as upper. Whoever holds it can see the card's words and
// send a response, nothing more. The pastor's key is 32 random bytes (43
// characters), shown once to his device and stored here only as a SHA-256,
// compared in constant time. A response's token is chosen by the phone (24
// random bytes, `once`): the response id is a hash of it, so a send that is
// retried after a lost answer finds its own record instead of making a second
// one, and the phone can withdraw it. Only the token's hash is kept.
//
// WHAT IS ASKED, AND KEPT (the pastor's words, 30 Sep 2026: "a way to collect
// information… so that we can build a relationship with the people").
//   adult     must be the boolean true. false is answered 403 minor and nothing
//             at all is kept or counted; any other value is 400 bad-adult.
//   name      a first name: 1 to 40 characters, one letter at least, no markup,
//             no web address, no @.
//   picks     0 to 8 of the card's choices that are on; "nothing" stands alone.
//             None ticked is kept as [] and means "nothing more": nothing is
//             required beyond the first name (the pastor's SPEC, v10.43).
//   reach     {t:'phone'|'email', v}: kept only when a picked choice needs
//             contact, and then required (400 need-reach), with consent:true
//             (400 need-consent). Sent when nothing needs it, it is dropped.
//   safe      only on an abuse card's "talk" choice: may we leave a message.
//   note      optional, at most 500 characters; dropped when the card has
//             notes off. No markup, no web address.
//   lang      'en' or 'es' (the page's).
// Nothing else is stored: no address, no age, no children's details, no
// client address (the counters below keep an hourly keyed hash only).
//
// RETENTION. A response is kept at most one year. Once the pastor's device has
// taken it (op ack) it is kept TAKEN_KEEP_DAYS more (30: so the list can be
// pulled again, for example after a phone is replaced), then deleted,
// whichever is sooner. The pastor approved "1 year"; 30 days after his device
// has the list is the recommendation he was asked about and did not answer
// (DESIGN Q1), so it is one constant and one line of his privacy note.
// Expired responses are deleted by the daily sweep, and the moment anything
// touches them. The pastor can delete any response at once (op delete), and
// the card with everything in it (op remove). A person can withdraw their own
// response from the thank-you screen (op withdraw). A card with no responses
// that nobody has opened for 30 days, and whose event day (if any) is 30 days
// past, is deleted by the sweep.
//
// NEVER READABLE WITHOUT THE KEY. Only op pull returns responses. No other
// answer contains a name, a phone, an email, a note, a key, a token or a hash.
//
// NO MARKUP. Nothing kept may contain "<" followed by a letter, "/", "!" or
// "?" (the start of an HTML tag), as present.mjs; the pages draw text as text
// anyway. Names and notes also refuse web addresses (spam).
//
// FLOODS. The card's id is public (printed cards, QR codes), so responses are
// limited: 200 an hour from one client address across every card (a whole
// hall on one Wi-Fi must not be refused), 5,000 an hour for the whole site
// (429 site-busy), 300 an hour and 1,000 a day per card (429 slow-down), and
// 3,000 on file per card (409 card-full). A hidden field (hp) that a person
// never sees, and a form sent less than 1.5 seconds after it was shown (ms),
// are answered like a success and nothing is kept. The pastor can close a
// card (op close: 410 closed) and reopen it.
//
// CREATING A CARD follows the same switches as census, gifts and present:
// while TERRAIN_REQUIRE_CODE is on (1, true, yes or on) and TERRAIN_CODES lists
// a code, op create needs a valid x-terrain-code header (401 nocode); with codes
// off and TERRAIN_REG_SECRET set (32+ characters) it needs the token register.mjs
// gives a registered pastor, in x-terrain-reg (401 noreg). People filling in a
// card never need either. Limits: 10 cards an hour from one client address; a
// day, 20 per registration and 1,000 for all registrations together, or, with
// registration off, 200 for the whole site (429 site-busy). A listed code passes
// the day limits.
//
// OPS (POST JSON {op, ...}; GET ?op=card&id=… ; GET alone answers status).
// A POST must say content-type application/json (415) and is refused when the
// browser marks it Sec-Fetch-Site: cross-site (403), as register.mjs.
//   status                          → {ok, fn, codeRequired, regRequired}
//   create   {card}                 → {ok, id, key, v}
//   card     {id}                   → {ok, id, v, closed, card}      (public: the words and choices)
//   update   {id, key, card}        → {ok, v}           (60 an hour per card)
//   submit   {id, once, adult, name, picks, reach?, consent?, safe?, note?, lang?, hp?, ms?}
//                                   → {ok, rid}
//   withdraw {id, rid, token}       → {ok}              (token = the phone's `once`)
//   pull     {id, key, after?}      → {ok, id, v, closed, card, items, gone?, next?}
//   ack      {id, key, rids[≤500]}  → {ok, taken}
//   delete   {id, key, rids[≤500]}  → {ok, deleted}
//   close    {id, key, open?}       → {ok, closed}      (open:true reopens)
//   remove   {id, key}              → {ok, deleted, more}   (the card and everything in it; 500 responses a
//                                     call: while more is true the card is closed and the page asks again)
//
// LOGGING. Nothing a person wrote, no key, token or hash is ever logged. Only
// the op name on an unexpected failure.

import { getStore } from '@netlify/blobs';
import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';

const FN_VERSION = 'connect-1.0';
const STORE_NAME = 'terrain-connect';

const MAX_BODY = 16 * 1024;                 // whole request
const MAX_CARD = 12 * 1024;                 // a card, bytes of JSON
const MAX_CHURCH = 120;
const MAX_TITLE = 80;
const MAX_WHEN = 60;                        // "It starts: Tuesday evenings from November 3", one language
const MAX_LABEL = 90;                       // one choice, one language (two lines on the printed card)
const MAX_OPTS = 12;                        // choices on file, on and off
const MAX_ON = 8;                           // choices a person sees
const MAX_PAST = 16;                        // words of removed choices, kept to label older responses
const MAX_PARTNER_NAME = 80;
const MAX_PARTNER_LINE = 40;
const MAX_NAME = 40;
const MAX_NOTE = 500;
const MAX_EMAIL = 254;
const MAX_PHONE = 24;
const MIN_DIGITS = 7, MAX_DIGITS = 15;
const MAX_RESPONSES = 3000;                 // on file per card
const MAX_CARD_HOUR = 300;                  // new responses per card, per hour
const MAX_CARD_DAY = 1000;                  // … and per UTC day
const MAX_IP_SUBMITS = 200;                 // new responses from one client address, per hour, every card
const MAX_SITE_SUBMITS = 5000;              // new responses on the whole site, per hour
const MAX_IP_CREATES = 10;                  // cards from one client address, per hour
const MAX_REG_CREATES = 20;                 // cards per registration, per UTC day
const MAX_TOKEN_CREATES = 1000;             // cards by all registrations together, per UTC day
const MAX_SITE_CREATES = 200;               // cards without a registration (registration off), per UTC day
const MAX_UPDATES = 60;                     // card updates per card, per hour
const MAX_TAGS = 20000;                     // client addresses one counter holds in an hour
const MAX_DELETE = 500;                     // responses deleted in one call
const MAX_ACK = 500;                        // responses marked taken in one call
const PULL_PAGE = 500;                      // responses per pull page (each is under 1 KB)
const TAKEN_KEEP_DAYS = 30;                 // kept this long after the pastor's device took it (DESIGN Q1: 30 or 365)
const GONE_KEEP_DAYS = 30;                  // a tombstone's life
const MIN_FILL_MS = 1500;                   // a form sent faster than this was not filled in by a person
const DAY_WINDOW = 400;                     // an event day at most this many days from today
const DAY_MS = 864e5;

const CODE_ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O, 1/I/L
const RE_CID = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/;
const RE_KEY = /^[A-Za-z0-9_-]{43}$/;       // 32 random bytes
const RE_RID = /^[A-Za-z0-9_-]{12}$/;       // a hash of the token, 72 bits
const RE_TOK = /^[A-Za-z0-9_-]{32}$/;       // 24 random bytes, made by the phone
const RE_OPTK = /^[a-z][a-z0-9]{0,11}$/;
const RE_DAY = /^\d{4}-\d{2}-\d{2}$/;
const RE_TAG = /<[A-Za-z!/?]/;              // the start of an HTML tag (see NO MARKUP)
const RE_URL = /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|org|net|info|biz|xyz|top|ru|io|ly|link|site|online|click|shop)\b)/i;
// No ? # & = % / anywhere, and only letters, digits, dots and hyphens after the @: an address can never bend a mailto: link.
const RE_EMAIL = /^[^\s@<>()[\]\\,;:"'?#&=%/]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/;
const RE_REGTOK = /^r1\.([A-Za-z0-9_-]{12})\.([0-9a-z]{1,9})\.([A-Za-z0-9_-]{32})$/;

// The kinds of card the page tailors (index.html CN_KIND_IDS). The server only
// needs them for two rules: an abuse card never offers a visit, and only an
// abuse card has the "talk" choice with its "may we leave a message" question.
const KINDS = new Set(['health', 'family', 'neighbors', 'bible', 'prayer', 'practical', 'grief', 'care', 'recovery', 'abuse', 'general']);
// The nine looks (index.html CN_LOOK): a colour family and a drawn motif per kind
// of occasion. The server keeps the word so the phone and the paper draw the same card.
const LOOKS = new Set(['health', 'food', 'family', 'youth', 'music', 'prayer', 'seasons', 'calm', 'general']);
// Choices with a fixed meaning, and whether each needs a way to reach the
// person. c1 and c2 are the pastor's own, which say it themselves.
const OPT_FIXED = {
  prayer: false, nothing: false, visit: true, next: true, recipes: true, results: true, events: true,
  help: true, study: true, series: true, praywith: true, remind: true, news: true, talk: true
};
const RE_CUSTOM = /^c[12]$/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// ---------------------------------------------------------------- access codes
// Copied from present.mjs (functions do not import one another).
let codesRaw = null, codesSet = new Set();
function codes() {
  const raw = process.env.TERRAIN_CODES || '';
  if (raw === codesRaw) return codesSet;
  const s = new Set();
  raw.split(',').forEach(pair => {
    const r = pair.trim(); if (!r) return;
    const at = r.lastIndexOf('@');
    const head = at === -1 ? r : r.slice(0, at);
    const i = head.indexOf(':');
    const code = (i === -1 ? head : head.slice(0, i)).trim();
    if (code) s.add(code.toLowerCase());
  });
  codesRaw = raw; codesSet = s;
  return s;
}
const warned = new Set();
function envOn(name) {
  const v = (process.env[name] || '').trim();
  if (/^(1|true|yes|on)$/i.test(v)) return true;
  if (v && !/^(0|false|no|off)$/i.test(v) && !warned.has(name)) {
    warned.add(name);
    console.error(`connect: ${name} is set, but not to 1, true, yes or on, so it is treated as off`);
  }
  return false;
}
const requireCode = () => envOn('TERRAIN_REQUIRE_CODE');
const codeRequired = () => requireCode() && codes().size > 0;

// ---------------------------------------------------------------- registration
// Copied from present.mjs: the token register.mjs hands a registered pastor,
// r1.<id>.<issued>.<HMAC>, good for 180 days, keyed by TERRAIN_REG_SECRET.
const TOKEN_DAYS = 180;
function regSecret() {
  const v = (process.env.TERRAIN_REG_SECRET || '').trim();
  if (v && v.length < 32 && !warned.has('secret')) {
    warned.add('secret');
    console.error('connect: TERRAIN_REG_SECRET is shorter than 32 characters, so it is ignored');
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
function codeListed(given) {
  const g = (typeof given === 'string' ? given : '').trim().toLowerCase();
  if (!g || codes().size === 0) return false;
  const gh = sha(g);
  let hit = false;
  for (const code of codes()) if (timingSafeEqual(gh, sha(code))) hit = true;
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
    headers: { 'content-type': 'application/json', 'cache-control': NO_STORE, 'x-content-type-options': 'nosniff' }
  });

const rand = n => randomBytes(n).toString('base64url');
function sha(s) { return createHash('sha256').update(String(s), 'utf8').digest(); }
const shaHex = s => sha(s).toString('hex');
function secretOk(given, storedHex) {
  if (typeof given !== 'string' || typeof storedHex !== 'string' || !/^[0-9a-f]{64}$/.test(storedHex)) return false;
  return timingSafeEqual(sha(given), Buffer.from(storedHex, 'hex'));
}
// Ten characters from the 31-letter alphabet, without bias (248 = 8 × 31).
function newCid() {
  let s = '';
  while (s.length < 10) for (const x of randomBytes(16)) if (x < 248 && s.length < 10) s += CODE_ALPHA[x % 31];
  return s;
}
// A response's id: a one-way hash of the phone's token, so a retried send
// lands on the same record and the id says nothing about the token.
const ridOf = (cid, once) => createHash('sha256').update(`terrain-connect-rid|${cid}|${once}`, 'utf8').digest('base64url').slice(0, 12);

// Plain one-line text: no control characters (C0 or C1), no bidirectional
// overrides or invisible format characters, runs of space collapsed.
function line(s) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]+/g, ' ')
    .replace(/\p{Cf}+/gu, '')
    .replace(/\s+/g, ' ').trim();
}
// A note may keep its line breaks; every other control character goes.
function para(s) {
  return String(s == null ? '' : s).replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]+/g, ' ')
    .replace(/\p{Cf}+/gu, '')
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
// Text a card may carry: '' for absent, the cleaned line, or null when it is
// not text, too long, markup or a web address (the caller refuses it).
function text(v, max) {
  if (v == null) return '';
  if (typeof v !== 'string') return null;
  const s = line(v);
  if (s.length > max || RE_TAG.test(s) || RE_URL.test(s)) return null;
  return s;
}
const utcDay = t => new Date(t).toISOString().slice(0, 10);
const utcHour = t => new Date(t).toISOString().slice(0, 13);
function addYears(t, n) { const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear() + n); return d.getTime(); }
const isExpired = (rec, now = Date.now()) => !rec || typeof rec.expires !== 'number' || rec.expires <= now;
function dayOk(day, now = Date.now()) {
  const t = Date.parse(day + 'T00:00:00Z');
  return Number.isFinite(t) && utcDay(t) === day && Math.abs(t - now) <= DAY_WINDOW * DAY_MS;
}
function need(ok, status, error) { if (!ok) throw new Fail(status, error); }
const str = v => (typeof v === 'string' ? v : '');
const own = (o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);

// The caller's address as Netlify reports it; '' outside Netlify (no limit then).
// An IPv6 address counts as its /64 network (copied from present.mjs).
function clientIp(request, context) {
  const ip = context && typeof context.ip === 'string' ? context.ip : (request && request.headers ? request.headers.get('x-nf-client-connection-ip') || '' : '');
  return addrBucket(line(ip).slice(0, 64));
}
function addrBucket(ip) {
  let s = ip.toLowerCase().replace(/^\[|\]$/g, '').replace(/%.*$/, '');
  const v4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
  if (v4) return v4[1];
  if (!s.includes(':')) return s;
  const tail = /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (tail) {
    const b = tail.slice(1).map(Number);
    if (b.some(x => x > 255)) return s;
    s = s.slice(0, tail.index) + ((b[0] << 8) | b[1]).toString(16) + ':' + ((b[2] << 8) | b[3]).toString(16);
  }
  const halves = s.split('::');
  if (halves.length > 2) return s;
  const head = halves[0] ? halves[0].split(':') : [];
  const rest = halves.length === 2 ? (halves[1] ? halves[1].split(':') : []) : null;
  if (rest === null ? head.length !== 8 : head.length + rest.length > 7) return s;
  const groups = rest === null ? head : [...head, ...Array(8 - head.length - rest.length).fill('0'), ...rest];
  if (!groups.every(g => /^[0-9a-f]{1,4}$/.test(g))) return s;
  return groups.slice(0, 4).map(g => parseInt(g, 16).toString(16)).join(':') + '::/64';
}
// A client address is only ever kept as a keyed hash, and only for the current
// hour: the key is rolled with the hour, so an old tag means nothing.
const ipTag = (ip, salt) => createHmac('sha256', String(salt)).update(ip, 'utf8').digest('base64url').slice(0, 22);

function theStore() {
  if (globalThis.__terrainConnectStore) return globalThis.__terrainConnectStore;
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}
// Read-modify-write, conditional on the ETag when the store offers one (the
// real Netlify store does), retried. fn mutates cur in place and returns the
// op's answer; it may throw a Fail to abort without writing.
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
    if (!isPlain(cur)) throw new Fail(404, 'not-found');
    const res = await fn(cur);
    const w = await store.setJSON(key, cur, cas && etag ? { onlyIfMatch: etag } : undefined);
    if (!w || w.modified !== false) return res;
  }
  throw new Fail(503, 'busy');
}
// The same, for a blob that may not exist yet: fn(cur|null) returns the new
// value, or undefined to leave the blob as it is. Creation is onlyIfNew.
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
    const next = await fn(isPlain(cur) ? cur : null);
    if (next === undefined) return cur;
    const opts = !exists ? { onlyIfNew: true } : (cas && etag ? { onlyIfMatch: etag } : undefined);
    const w = await store.setJSON(key, next, opts);
    if (!w || w.modified !== false) return next;
  }
  throw new Fail(503, 'busy');
}
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const j = i++; out[j] = await fn(items[j]); }
  }));
  return out;
}
async function keysUnder(store, prefix) {
  const l = await store.list({ prefix });
  return ((l && l.blobs) || []).map(b => b.key);
}
function hourCounter(g, hour) {
  return g && g.hour === hour && typeof g.salt === 'string' && isPlain(g.to)
    ? g : { hour, salt: rand(18), to: {} };
}

// ---------------------------------------------------------------- markers
const markR = (cid, rid, expires) => `x/${utcDay(expires)}/r/${cid}/${rid}`;
const markT = (cid, rid, expires) => `x/${utcDay(expires)}/t/${cid}/${rid}`;
// A response goes, and its marker with it.
async function dropResp(store, cid, rid, rec) {
  await store.delete(`r/${cid}/${rid}`);
  if (rec && typeof rec.expires === 'number') { try { await store.delete(markR(cid, rid, rec.expires)); } catch { /* the sweep tidies it */ } }
}
// One response by key, or null; an expired one is deleted on the way.
async function readLive(store, cid, key, now) {
  const rec = await store.get(key, { type: 'json' });
  if (!isPlain(rec)) return null;
  if (isExpired(rec, now)) { await dropResp(store, cid, key.slice(`r/${cid}/`.length), rec); return null; }
  return rec;
}

// ---------------------------------------------------------------- cards
function cidOf(v) {
  const s = str(v).trim().toUpperCase();
  need(RE_CID.test(s), 400, 'bad-id');
  return s;
}
async function loadCard(store, cid) {
  const c = await store.get('c/' + cid, { type: 'json' });
  need(isPlain(c), 404, 'no-card');
  return c;
}
async function authCard(store, cid, key) {
  need(RE_KEY.test(str(key)), 403, 'bad-key');
  const c = await loadCard(store, cid);
  need(secretOk(key, c.keyHash), 403, 'bad-key');
  return c;
}
// A card notes the last UTC day anyone opened it (a phone, or its pastor), at
// most one write a day, so the sweep can tell an unused card from a quiet one.
async function markSeen(store, c) {
  const today = utcDay(Date.now());
  if (!c || c.seen === today) return;
  try { await mutate(store, 'c/' + c.cid, x => { x.seen = today; }); } catch { /* another day */ }
}

// The card as the pastor's page sends it, rebuilt field by field. Unknown
// fields are dropped; anything else wrong is 400 bad-card with `where`.
function cleanCard(raw) {
  const bad = where => { throw new Fail(400, 'bad-card', { where }); };
  if (!isPlain(raw)) bad('card');
  let size = 0;
  try { size = Buffer.byteLength(JSON.stringify(raw), 'utf8'); } catch { bad('card'); }
  need(size <= MAX_CARD, 413, 'too-large');
  const lang = own(raw, 'lang'); if (!['en', 'es', 'both'].includes(lang)) bad('lang');
  const kind = own(raw, 'kind'); if (typeof kind !== 'string' || !KINDS.has(kind)) bad('kind');
  const look = own(raw, 'look'); if (typeof look !== 'string' || !LOOKS.has(look)) bad('look');
  const cadence = own(raw, 'cadence'); if (!['event', 'series'].includes(cadence)) bad('cadence');
  const church = text(own(raw, 'church'), MAX_CHURCH); if (church === null || !/\p{L}/u.test(church)) bad('church');
  const t = own(raw, 'title'); if (!isPlain(t)) bad('title');
  const title = { en: text(own(t, 'en'), MAX_TITLE), es: text(own(t, 'es'), MAX_TITLE) };
  if (title.en === null || title.es === null) bad('title');
  // An abuse card may carry no event name at all (it then says "A card from {church}").
  if (!title.en && !title.es && kind !== 'abuse') bad('title');
  const d = own(raw, 'day'); let day = null;
  if (d != null) { if (typeof d !== 'string' || !RE_DAY.test(d) || !dayOk(d)) bad('day'); day = d; }
  const parent = own(raw, 'parent'); if (typeof parent !== 'boolean') bad('parent');
  const note = own(raw, 'note'); if (typeof note !== 'boolean') bad('note');
  // When the next step starts, for the thank-you screen: may be left out or empty.
  const w = own(raw, 'nextWhen'); let nextWhen = { en: '', es: '' };
  if (w != null) {
    if (!isPlain(w)) bad('nextWhen');
    nextWhen = { en: text(own(w, 'en'), MAX_WHEN), es: text(own(w, 'es'), MAX_WHEN) };
    if (nextWhen.en === null || nextWhen.es === null) bad('nextWhen');
  }
  const list = own(raw, 'opts'); if (!Array.isArray(list) || list.length < 3 || list.length > MAX_OPTS) bad('opts');
  const opts = [], seen = new Set();
  for (const o of list) {
    if (!isPlain(o)) bad('opts');
    const k = own(o, 'k');
    if (typeof k !== 'string' || !RE_OPTK.test(k) || FORBIDDEN_KEYS.has(k) || seen.has(k)) bad('opts');
    const fixed = Object.prototype.hasOwnProperty.call(OPT_FIXED, k);
    if (!fixed && !RE_CUSTOM.test(k)) bad('opts');
    const en = text(own(o, 'en'), MAX_LABEL), es = text(own(o, 'es'), MAX_LABEL);
    if (en === null || es === null || (!en && !es)) bad('label');
    const contact = own(o, 'contact'); if (typeof contact !== 'boolean') bad('opts');
    if (fixed && contact !== OPT_FIXED[k]) bad('contact');
    const off = own(o, 'off'); if (off != null && typeof off !== 'boolean') bad('opts');
    seen.add(k);
    opts.push({ k, en, es, contact, off: off === true });
  }
  const on = opts.filter(o => !o.off);
  if (on.length > MAX_ON) bad('opts');
  if (!on.some(o => o.k === 'prayer') || !on.some(o => o.k === 'nothing')) bad('always');
  if (kind === 'abuse' && on.some(o => o.k === 'visit')) bad('visit');
  if (kind !== 'abuse' && seen.has('talk')) bad('talk');
  const p = own(raw, 'partner'); let partner = null;
  if (p != null) {
    if (!isPlain(p)) bad('partner');
    const name = text(own(p, 'name'), MAX_PARTNER_NAME), ln = text(own(p, 'line'), MAX_PARTNER_LINE);
    if (name === null || ln === null) bad('partner');
    if (ln && !/^[\p{L}\p{N} +().,#*/-]+$/u.test(ln)) bad('partner');
    if (name || ln) partner = { name, line: ln };
  }
  return { lang, kind, look, cadence, church, title, day, parent, note, nextWhen, opts, partner };
}
// What a phone is told: the words and the choices that are on.
function publicCard(c) {
  return {
    lang: c.lang, kind: c.kind, look: LOOKS.has(c.look) ? c.look : 'general', cadence: c.cadence, church: c.church, title: c.title, day: c.day || null,
    parent: !!c.parent, note: c.note !== false, partner: c.partner || null,
    nextWhen: isPlain(c.nextWhen) ? { en: str(c.nextWhen.en), es: str(c.nextWhen.es) } : { en: '', es: '' },
    opts: (c.opts || []).filter(o => !o.off).map(({ k, en, es, contact }) => ({ k, en, es, contact }))
  };
}
// What the pastor's device is told: every choice on file, and the words of
// choices since removed, so an older response can still be labelled.
function fullCard(c) {
  return { ...publicCard(c), opts: (c.opts || []).map(({ k, en, es, contact, off }) => ({ k, en, es, contact, off: !!off })), past: isPlain(c.past) ? c.past : {} };
}

// ---------------------------------------------------------------- a response
function cleanPhone(v) {
  const s = line(v);
  if (!s || s.length > MAX_PHONE || !/^\+?[0-9 ().-]+$/.test(s)) return null;
  const n = s.replace(/\D/g, '').length;
  return n >= MIN_DIGITS && n <= MAX_DIGITS ? s : null;
}
function cleanEmail(v) {
  const s = line(v);
  return s && s.length <= MAX_EMAIL && RE_EMAIL.test(s) ? s : null;
}
// The shape of what a phone sends, checked before the card is read.
function responseFields(b) {
  need(typeof b.name === 'string', 400, 'bad-name');
  const name = line(b.name);
  need(name.length >= 1 && name.length <= MAX_NAME && /\p{L}/u.test(name) && !RE_TAG.test(name) && !RE_URL.test(name) && !name.includes('@'), 400, 'bad-name');
  // 0 to 8: a first name alone is enough ([] = "nothing more", DESIGN D11).
  need(Array.isArray(b.picks) && b.picks.length <= MAX_ON, 400, 'bad-picks');
  const picks = [...new Set(b.picks)];
  need(picks.every(k => typeof k === 'string' && RE_OPTK.test(k)), 400, 'bad-picks');
  let reach = null;
  if (b.reach != null) {
    need(isPlain(b.reach), 400, 'bad-reach');
    const t = own(b.reach, 't'), v = own(b.reach, 'v');
    need((t === 'phone' || t === 'email') && typeof v === 'string', 400, 'bad-reach');
    const val = t === 'phone' ? cleanPhone(v) : cleanEmail(v);
    need(val, 400, t === 'phone' ? 'bad-phone' : 'bad-email');
    reach = { t, v: val };
  }
  need(b.consent == null || typeof b.consent === 'boolean', 400, 'bad-consent');
  need(b.safe == null || typeof b.safe === 'boolean', 400, 'bad-safe');
  need(b.note == null || typeof b.note === 'string', 400, 'bad-note');
  const note = para(b.note);
  need(note.length <= MAX_NOTE && !RE_TAG.test(note) && !RE_URL.test(note), 400, 'bad-note');
  const lang = b.lang === 'es' ? 'es' : 'en';
  return { name, picks, reach, note, lang };
}
// This client per hour and the whole site per hour, in one update. A counter
// too busy to update lets the response through (the card's own caps still hold).
async function submitHit(store, ip) {
  const hour = utcHour(Date.now());
  try {
    await upsert(store, 'g/sub', g => {
      const cur = hourCounter(g, hour);
      const n = cur === g && Number.isInteger(g.n) ? g.n : 0;
      need(n < MAX_SITE_SUBMITS, 429, 'site-busy');
      const next = { hour, salt: cur.salt, to: cur.to, n: n + 1 };
      if (ip) {
        const tag = ipTag(ip, cur.salt), mine = own(cur.to, tag) || 0;
        need(mine < MAX_IP_SUBMITS, 429, 'slow-down');
        need(mine > 0 || Object.keys(cur.to).length < MAX_TAGS, 429, 'slow-down');
        next.to = { ...cur.to, [tag]: mine + 1 };
      }
      return next;
    });
  } catch (e) {
    if (e instanceof Fail && e.error === 'busy') return;
    throw e;
  }
}
function ridList(v, max) {
  need(Array.isArray(v) && v.length >= 1 && v.length <= max, 400, 'bad-rids');
  const rids = [...new Set(v)];
  need(rids.every(r => typeof r === 'string' && RE_RID.test(r)), 400, 'bad-rids');
  return rids;
}

// ---------------------------------------------------------------- ops
const OPS = {
  async status() {
    return { ok: true, fn: FN_VERSION, codeRequired: codeRequired(), regRequired: regRequired() };
  },

  async create(b, { request, store, context }) {
    const given = request.headers.get('x-terrain-code');
    if (codeRequired() && !codeListed(given)) throw new Fail(401, 'nocode');
    if (regRequired() && !regTokenOk(request.headers.get('x-terrain-reg'), regSecret())) throw new Fail(401, 'noreg');
    const card = cleanCard(b.card);            // before anything is counted
    const vouched = codeListed(given);
    const regId = regRequired() ? (RE_REGTOK.exec(String(request.headers.get('x-terrain-reg') || '').trim()) || [])[1] || null : null;
    const ip = clientIp(request, context);
    const now0 = Date.now(), hour = utcHour(now0), day = utcDay(now0);
    await upsert(store, 'g/new', g => {
      const cur = hourCounter(g, hour);
      const today = !!g && g.day === day;
      const n = today && Number.isInteger(g.n) ? g.n : 0;          // cards without a registration today
      const tn = today && Number.isInteger(g.tn) ? g.tn : 0;       // cards with a registration today
      const regs = today && isPlain(g.regs) ? g.regs : {};         // … per registration id
      const next = { hour, salt: cur.salt, to: cur.to, day, n, tn, regs };
      if (ip) {
        const tag = ipTag(ip, cur.salt), mine = own(cur.to, tag) || 0;
        need(mine < MAX_IP_CREATES, 429, 'slow-down');
        need(mine > 0 || Object.keys(cur.to).length < MAX_TAGS, 429, 'slow-down');
        next.to = { ...cur.to, [tag]: mine + 1 };
      }
      if (vouched) return next;
      if (regId) {
        const mine = own(regs, regId) || 0;
        need(mine < MAX_REG_CREATES, 429, 'slow-down');
        need(tn < MAX_TOKEN_CREATES, 429, 'site-busy');
        next.tn = tn + 1; next.regs = { ...regs, [regId]: mine + 1 };
      } else {
        need(n < MAX_SITE_CREATES, 429, 'site-busy');
        next.n = n + 1;
      }
      return next;
    });
    for (let attempt = 0; attempt < 6; attempt++) {
      const cid = newCid(), key = rand(32);
      if (await store.get('c/' + cid, { type: 'json' })) continue;
      const created = Date.now();
      const rec = {
        cid, keyHash: shaHex(key), created, v: 1, ...card, past: {}, closed: false, closedAt: null,
        subs: { hour: '', h: 0, day: '', d: 0 }, upd: { hour: '', n: 0 }, seen: utcDay(created), last: 0
      };
      const w = await store.setJSON('c/' + cid, rec, { onlyIfNew: true });
      if (w && w.modified === false) continue;
      return { ok: true, id: cid, key, v: 1 };
    }
    throw new Fail(503, 'busy');
  },

  // Public: the words and the choices, nothing anyone wrote.
  async card(b, { store }) {
    const cid = cidOf(b.id);
    const c = await loadCard(store, cid);
    await markSeen(store, c);
    return { ok: true, id: cid, v: c.v || 1, closed: !!c.closed, card: publicCard(c) };
  },

  async update(b, { store }) {
    const cid = cidOf(b.id);
    need(RE_KEY.test(str(b.key)), 403, 'bad-key');
    const card = cleanCard(b.card);
    await authCard(store, cid, b.key);
    return mutate(store, 'c/' + cid, c => {
      need(secretOk(b.key, c.keyHash), 403, 'bad-key');
      const now = Date.now(), hour = utcHour(now);
      const u = isPlain(c.upd) && c.upd.hour === hour ? (c.upd.n || 0) : 0;
      need(u < MAX_UPDATES, 429, 'slow-down');
      // Words of a choice that leaves the card are kept, so an older response still reads.
      const past = isPlain(c.past) ? { ...c.past } : {};
      for (const o of Array.isArray(c.opts) ? c.opts : []) if (!card.opts.some(x => x.k === o.k)) { delete past[o.k]; past[o.k] = { en: o.en, es: o.es }; }
      for (const o of card.opts) delete past[o.k];
      const keys = Object.keys(past);
      for (const k of keys.slice(0, Math.max(0, keys.length - MAX_PAST))) delete past[k];
      Object.assign(c, card, { v: (c.v || 1) + 1, upd: { hour, n: u + 1 }, past, seen: utcDay(now) });
      return { ok: true, v: c.v };
    });
  },

  async submit(b, { store, request, context }) {
    const cid = cidOf(b.id);
    need(typeof b.adult === 'boolean', 400, 'bad-adult');
    // Under 18: nothing is kept and nothing is counted.
    need(b.adult === true, 403, 'minor');
    need(RE_TOK.test(str(b.once)), 400, 'bad-once');
    const rid = ridOf(cid, b.once);
    // The hidden field, or a form sent faster than a person fills one in: a
    // quiet "thank you", and nothing is kept.
    if ((b.hp != null && b.hp !== '') || (typeof b.ms === 'number' && b.ms < MIN_FILL_MS)) return { ok: true, rid };
    const f = responseFields(b);
    const c = await loadCard(store, cid);
    need(!c.closed, 410, 'closed');
    const on = new Map((c.opts || []).filter(o => !o.off).map(o => [o.k, o]));
    need(f.picks.every(k => on.has(k)), 400, 'bad-picks');
    need(!(f.picks.includes('nothing') && f.picks.length > 1), 400, 'bad-picks');
    const needs = f.picks.some(k => on.get(k).contact === true);
    let reach = null, consent = null, safe = null;
    if (needs) {
      need(f.reach, 400, 'need-reach');
      need(b.consent === true, 400, 'need-consent');
      reach = f.reach; consent = Date.now();
      if (c.kind === 'abuse' && f.picks.includes('talk')) { need(typeof b.safe === 'boolean', 400, 'bad-safe'); safe = b.safe; }
    }
    const note = c.note === false ? '' : f.note;
    // The same send again (its answer was lost on the way): the same record,
    // nothing counted twice.
    const key = `r/${cid}/${rid}`;
    const had = await store.get(key, { type: 'json' });
    if (had) { need(secretOk(b.once, had.tokenHash), 409, 'again'); return { ok: true, rid }; }
    // This client and the site per hour, then this card per hour and day, then its size.
    await submitHit(store, clientIp(request, context));
    const now = Date.now(), hour = utcHour(now), day = utcDay(now);
    await mutate(store, 'c/' + cid, x => {
      need(!x.closed, 410, 'closed');
      const s = isPlain(x.subs) ? x.subs : {};
      const h = s.hour === hour ? (s.h || 0) : 0, d = s.day === day ? (s.d || 0) : 0;
      need(h < MAX_CARD_HOUR && d < MAX_CARD_DAY, 429, 'slow-down');
      x.subs = { hour, h: h + 1, day, d: d + 1 };
      x.last = now;
    });
    need((await keysUnder(store, `r/${cid}/`)).length < MAX_RESPONSES, 409, 'card-full');
    const ts = Date.now(), expires = addYears(ts, 1);
    const rec = {
      rid, tokenHash: shaHex(b.once), ts, expires, lang: f.lang, name: f.name, picks: f.picks,
      reach, consent, safe, note, cv: c.v || 1, taken: null
    };
    // The marker first: a response is never stored without one.
    await store.setJSON(markR(cid, rid, expires), {});
    const w = await store.setJSON(key, rec, { onlyIfNew: true });
    if (w && w.modified === false) {
      const again = await store.get(key, { type: 'json' });
      need(isPlain(again) && secretOk(b.once, again.tokenHash), 409, 'again');
    }
    return { ok: true, rid };
  },

  // The person, from the thank-you screen, with the token only their page holds.
  async withdraw(b, { store }) {
    const cid = cidOf(b.id);
    need(RE_RID.test(str(b.rid)), 400, 'bad-rid');
    need(RE_TOK.test(str(b.token)), 403, 'bad-token');
    const r = await store.get(`r/${cid}/${b.rid}`, { type: 'json' });
    if (!isPlain(r)) return { ok: true };           // already gone: nothing is kept either way
    need(secretOk(b.token, r.tokenHash), 403, 'bad-token');
    await dropResp(store, cid, b.rid, r);
    // Always a tombstone (it holds no name, only {ts, expires}, 30 days): his device may have pulled this answer and not yet
    // said so (op ack can fail on a weak signal); the tombstone tells it to let go either way.
    const exp = Date.now() + GONE_KEEP_DAYS * DAY_MS;
    await store.setJSON(markT(cid, b.rid, exp), {});
    await store.setJSON(`t/${cid}/${b.rid}`, { ts: Date.now(), expires: exp });
    return { ok: true };
  },

  // The pastor's device takes the list, page by page (a card holds at most 3,000).
  async pull(b, { store }) {
    const cid = cidOf(b.id);
    const c = await authCard(store, cid, b.key);
    need(b.after == null || RE_RID.test(str(b.after)), 400, 'bad-after');
    await markSeen(store, c);
    const prefix = `r/${cid}/`;
    const keys = (await keysUnder(store, prefix)).sort();
    let i = 0;
    if (b.after != null) { const from = prefix + b.after; while (i < keys.length && keys[i] <= from) i++; }
    const page = keys.slice(i, i + PULL_PAGE), now = Date.now();
    const recs = await pool(page, 32, k => readLive(store, cid, k, now));
    const items = recs.filter(Boolean).map(r => ({
      rid: r.rid, ts: r.ts, lang: r.lang === 'es' ? 'es' : 'en', name: str(r.name), picks: Array.isArray(r.picks) ? r.picks : [],
      reach: isPlain(r.reach) ? { t: r.reach.t, v: r.reach.v } : null, consent: r.consent || null,
      safe: typeof r.safe === 'boolean' ? r.safe : null, note: str(r.note), cv: r.cv || 1, taken: r.taken || null, expires: r.expires
    })).sort((x, y) => x.ts - y.ts);
    const out = { ok: true, id: cid, v: c.v || 1, closed: !!c.closed, card: fullCard(c), items };
    if (i + PULL_PAGE < keys.length) out.next = page[page.length - 1].slice(prefix.length);
    if (b.after == null) out.gone = (await keysUnder(store, `t/${cid}/`)).map(k => k.slice(`t/${cid}/`.length)).filter(r => RE_RID.test(r));
    return out;
  },

  // The device has them: each is kept 30 more days at most.
  async ack(b, { store }) {
    const cid = cidOf(b.id);
    await authCard(store, cid, b.key);
    const rids = ridList(b.rids, MAX_ACK);
    const now = Date.now(), until = now + TAKEN_KEEP_DAYS * DAY_MS;
    let taken = 0;
    await pool(rids, 16, async rid => {
      const key = `r/${cid}/${rid}`;
      const r0 = await store.get(key, { type: 'json' });
      if (!isPlain(r0) || r0.taken || isExpired(r0, now)) return;
      const exp = Math.min(r0.expires, until);
      // The marker for the new day first: a response is never without one.
      if (utcDay(exp) !== utcDay(r0.expires)) await store.setJSON(markR(cid, rid, exp), {});
      let old = null;
      try {
        await mutate(store, key, r => { if (r.taken) return; old = r.expires; r.taken = now; r.expires = Math.min(r.expires, until); });
      } catch (e) { if (e instanceof Fail && e.error === 'not-found') return; throw e; }
      if (old == null) return;
      taken++;
      if (utcDay(old) !== utcDay(Math.min(old, until))) { try { await store.delete(markR(cid, rid, old)); } catch { /* the sweep tidies it */ } }
    });
    return { ok: true, taken };
  },

  // The pastor deletes responses: someone asked, or junk.
  async delete(b, { store }) {
    const cid = cidOf(b.id);
    await authCard(store, cid, b.key);
    const rids = ridList(b.rids, MAX_DELETE);
    let deleted = 0;
    await pool(rids, 16, async rid => {
      const r = await store.get(`r/${cid}/${rid}`, { type: 'json' });
      if (!isPlain(r)) return;
      await dropResp(store, cid, rid, r); deleted++;
    });
    return { ok: true, deleted };
  },

  async close(b, { store }) {
    const cid = cidOf(b.id);
    need(RE_KEY.test(str(b.key)), 403, 'bad-key');
    need(b.open == null || typeof b.open === 'boolean', 400, 'bad-open');
    await authCard(store, cid, b.key);
    const open = b.open === true;
    await mutate(store, 'c/' + cid, c => {
      need(secretOk(b.key, c.keyHash), 403, 'bad-key');
      c.closed = !open; c.closedAt = open ? null : Date.now(); c.seen = utcDay(Date.now());
    });
    return { ok: true, closed: !open };
  },

  // The card and everything in it, now: 500 responses a call (a function has seconds, not minutes). While
  // more remain the card is closed and the answer says more:true; the page asks again until it says false.
  async remove(b, { store }) {
    const cid = cidOf(b.id);
    await authCard(store, cid, b.key);
    const rp = `r/${cid}/`, tp = `t/${cid}/`;
    let deleted = 0;
    const keys = await keysUnder(store, rp);
    if (keys.length > MAX_DELETE) {
      await mutate(store, 'c/' + cid, c => { c.closed = true; c.closedAt = c.closedAt || Date.now(); });
      await pool(keys.slice(0, MAX_DELETE), 16, async k => {
        const r = await store.get(k, { type: 'json' });
        if (isPlain(r)) await dropResp(store, cid, k.slice(rp.length), r); else await store.delete(k);
        deleted++;
      });
      return { ok: true, deleted, more: true };
    }
    await pool(keys, 16, async k => {
      const r = await store.get(k, { type: 'json' });
      if (isPlain(r)) await dropResp(store, cid, k.slice(rp.length), r); else await store.delete(k);
      deleted++;
    });
    await pool(await keysUnder(store, tp), 16, async k => {
      const t = await store.get(k, { type: 'json' });
      await store.delete(k);
      if (isPlain(t) && typeof t.expires === 'number') { try { await store.delete(markT(cid, k.slice(tp.length), t.expires)); } catch { /* the sweep tidies it */ } }
    });
    await store.delete('c/' + cid);
    return { ok: true, deleted, more: false };
  }
};

// Read with GET (?op=…&id=…); everything else is POST.
const GET_OPS = new Set(['status', 'card']);

// ---------------------------------------------------------------- handler
export default async (request, context) => {
  let op = '';
  try {
    let b;
    if (request.method === 'GET') {
      const q = new URL(request.url).searchParams;
      op = q.get('op') || 'status';
      if (!Object.prototype.hasOwnProperty.call(OPS, op)) return reply({ ok: false, error: 'unknown-op' }, 400);
      if (!GET_OPS.has(op)) return reply({ ok: false, error: 'method' }, 405);
      b = { op, id: q.get('id') || '' };
    } else if (request.method === 'POST') {
      const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (type !== 'application/json') return reply({ ok: false, error: 'content-type' }, 415);
      if ((request.headers.get('sec-fetch-site') || '').trim().toLowerCase() === 'cross-site') return reply({ ok: false, error: 'cross-site' }, 403);
      const len = Number(request.headers.get('content-length') || 0);
      if (len > MAX_BODY) return reply({ ok: false, error: 'too-large' }, 413);
      const raw = await request.text();
      if (Math.max(raw.length, Buffer.byteLength(raw, 'utf8')) > MAX_BODY) return reply({ ok: false, error: 'too-large' }, 413);
      try { b = JSON.parse(raw); } catch { return reply({ ok: false, error: 'bad-json' }, 400); }
      if (!isPlain(b)) return reply({ ok: false, error: 'bad-json' }, 400);
      op = typeof b.op === 'string' ? b.op : '';
      if (!Object.prototype.hasOwnProperty.call(OPS, op)) return reply({ ok: false, error: 'unknown-op' }, 400);
    } else {
      return reply({ ok: false, error: 'method' }, 405);
    }
    if (op === 'status') return reply(await OPS.status());
    const store = theStore();
    return reply(await OPS[op](b, { request, store, context }));
  } catch (e) {
    if (e instanceof Fail) return reply({ ...(e.extra || {}), ok: false, error: e.error }, e.status);
    // Only the op name: never the message, which could carry a name or a key.
    console.error('connect: unexpected failure in op ' + (/^[a-z]{1,10}$/.test(op) ? op : '?'));
    return reply({ ok: false, error: 'server' }, 500);
  }
};
