// Terrain · Make the Case live slides server.                       present-1.0
//
// The pastor presents a Make the Case slideshow; members open the same slides
// on their own phones, by QR code or a six-character code, and (once Firebase
// is set up) the phones follow the pastor's slide. Auto-detected at
// /.netlify/functions/present — no config file.
//
// TWO LAYERS.
//   The deck lives here, in Netlify Blobs. It is typed data (no HTML, no
//   links, no pictures), rebuilt field by field against the fixed list of
//   slide types below, so it can never carry anything but Terrain's slides.
//   Only the slide pointer lives in Firebase Realtime Database, in its own
//   project ("terrain-live"), at live/<room> = {i, v, on, end, at}. Phones
//   only read it (a plain EventSource on the REST stream); nobody but this
//   function writes it, with the database secret, so the Firebase rules are
//   write:false everywhere. Needs PRESENT_FB_URL (https://…firebaseio.com or
//   …firebasedatabase.app, nothing after the host) and PRESENT_FB_SECRET.
//   Without both (or with a URL on any other host) everything still works
//   except the live pointer: status says live:false and phones swipe freely.
//
// STORAGE. Netlify Blobs, store "terrain-present", strong consistency.
//   r/<room>        {room, keyHash, created, expires, v, n, lang, title, church,
//                    ended, code, respond, opts, upd}
//   d/<room>        {v, deck}         the latest deck, replaced on update
//   k/<CODE6>       {room, expires}   the typed join code → room
//   o/<room>/<id>   {}                one per phone that fetched the deck
//                                     ("23 phones opened the slides")
//   a/<room>/<tag><rnd>  {k, name, note, ts}   an "I'm in" answer, for the presenter
//                                     only; <tag> is 6 characters of a keyed hash of the
//                                     client address (the room's own salt), so one
//                                     address's answers can be counted by listing
//   x/<day>/<room>  {}                expiry marker, day = UTC date of `expires`;
//                                     present-sweep.mjs clears what is due daily
//   g/open g/join g/resp              hourly per-client counters (below)
//
// SECRETS. The room id is 16 random bytes (22 characters): whoever holds it
// can see the slides, nothing more. The presenter key is 32 random bytes
// (43 characters), shown once to the presenter's device and stored here only
// as a SHA-256, compared in constant time. No response ever contains a key, a
// hash, the Firebase secret or a client address; the pointer never holds a
// key, a name or an answer. Nothing that could contain a key, a code, a
// secret or a member's name is ever logged: only the op name on failure.
//
// RETENTION. A room lasts 1, 7 or 30 days (default 7) and then everything it
// holds is deleted, by the daily sweep or the moment anything touches it.
// "Remove now" (op remove) deletes at once. The expiry marker is only ever
// deleted by the sweep, on the day, after one more pass over everything the
// room could hold: a write still in flight when a room was removed or expired
// on sight (an answer, a slide change re-creating the pointer) is caught
// then. Nothing is written to a room in the last minute of its life
// (WRITE_MARGIN), so no write can land after the sweep's own pass.
//
// "I'M IN". Only when the deck's `yes` slide has respond:true. A member sends
// lead, help or pray and a first name (and an optional note); it goes to the
// presenter alone (op answers, with the key) and never appears in the deck,
// the pointer or any other response. Under-18s: a member who says they are
// under 18 (minor:true) is refused and nothing is kept; `minor` must be a
// true boolean or absent, any other type is refused rather than read as
// "adult". A deck for a young audience (audience.group youth, pathfinders,
// adventurers or school, as the page's CASE_YOUTH_GROUPS) never takes
// answers: its yes slides are stored with
// respond:false whatever the page sent. At most 500 answers per room, and 150
// from one client address per room (a whole church may share one Wi-Fi), taken
// until the room expires (after op end too: members may answer from the
// slides later in the week). Both caps are checked after the answer is
// written (list, and delete it again when over), so answers sent in parallel
// cannot all pass a count read before any was written. The presenter can
// delete answers (op drop, up to 600 at once), and stop them by updating the
// deck with respond:false.
//
// NO MARKUP. No text the server keeps (deck text, a member's name or note)
// may contain "<" followed by a letter, "/", "!" or "?": the start of an HTML
// tag. "<5" and "< 18" are fine. The pages draw text as text anyway; this is
// the second lock, for any page that one day forgets.
//
// ACCESS CODES. Opening a room follows the same switch as census and gifts:
// codes are enforced only while TERRAIN_REQUIRE_CODE is on (1, true, yes or
// on, in any case; any other value is off, and one that is not 0, false, no
// or off is logged once) and TERRAIN_CODES lists at least one code; then op
// open needs a valid x-terrain-code header. Members never need a code. A valid
// listed code also lets op open past the site-wide daily limit (never past the
// per-address one), whether or not codes are required, so strangers using up
// the day's rooms cannot stop a pastor who holds a code from presenting: the
// page should always send its code.
//
// REGISTRATION. With codes off and TERRAIN_REG_SECRET set (32 characters or
// more), op open needs the token register.mjs gives a registered pastor, in an
// x-terrain-reg header (401 noreg otherwise), exactly as census and gifts ask
// for it. Members never need one: deck, state, join and respond stay open.
//
// FIREBASE KEY. PRESENT_FB_SECRET is the database secret (Project settings →
// Service accounts → Database secrets), sent as auth=. If Firebase no longer
// offers those, it may instead hold the whole service-account key file (JSON,
// starting with "{"): the function then signs a token request with the key
// (RS256), trades it at oauth2.googleapis.com for an access token (cached for
// its hour, less five minutes) and sends access_token= instead. Nothing but
// the token request ever goes anywhere but the database.
// status says live:true only when both variables are set and Firebase took
// the key just now (a shallow read of the root, cached for a minute); fb says
// which: 'ok', 'bad-key', 'unreachable' or 'unset'.
//
// LIMITS. open: 20 an hour from one client address; then, a day (UTC), 10 per
// registration (the id in its token) and 1000 for all registered pastors
// together, or, while registration is off (no TERRAIN_REG_SECRET), 200 for
// the whole site. A listed access code passes the day limits. A day limit
// reached for the whole site answers 429 site-busy (not slow-down: it is not
// this client's doing). go: 10 a second per room (best effort, per warm
// instance). update: 60 an hour per room. join: 20 failed lookups an hour
// from one client address (only failures count: a whole church shares one
// Wi-Fi address). respond: 300 an hour from one client address across the
// site (a counter that lets the answer through when it is too busy to
// update), and the hard caps per room above. An IPv6 client
// counts as its /64 network (one household or phone gets a whole /64 and can
// pick any address in it). Client addresses are kept only as a keyed hash
// whose key is replaced every hour.
//
// OPS (POST JSON {op, ...}; GET ?op=deck|state&room=… ; GET alone answers status).
// A POST must say content-type application/json (415 otherwise) and is refused
// when the browser marks it Sec-Fetch-Site: cross-site (403), as register.mjs:
// another website cannot make its visitors' browsers open rooms or answer.
//   status                          → {ok, fn, live, fb, codeRequired, regRequired}
//   open    {deck, keepDays?}  +code header when required, +x-terrain-reg while
//                              registration is
//                                   → {ok, room, key, code, expires, v, n, url, live}
//   deck    {room, p?}              → {ok, v, deck, ended, expires, live}
//           (live is the stream URL, or null; p is an optional random id the
//            phone keeps, so a phone that reloads is counted once)
//   go      {room, key, i}          → {ok, i, opened, live}
//   update  {room, key, deck}       → {ok, v, n, pointer}
//   end     {room, key}             → {ok, ended, expires, pointer}
//           (pointer: whether Firebase took the change; false without it)
//   remove  {room, key}             → {ok, liveCleared}
//   join    {code}                  → {ok, room, lang}
//   state   {room}                  → {ok, state:{i,v,on,end,at}|null, ended, v}
//           (the pointer read here, for networks that block firebaseio.com, and
//            for phones without a live stream; a success may be kept 2 s at
//            Netlify's edge, never in the browser)
//   respond {room, k, name, note?, minor?}   → {ok}
//   answers {room, key}             → {ok, items:[{id,k,name,note,ts}], counts, total}
//   drop    {room, key, ids:[id]}   → {ok, deleted}     (the presenter deletes answers)
//   open and update also answer `respond`: whether the room takes answers.
//
// THE DECK (op open and update), rebuilt field by field. Unknown fields are
// dropped; a wrong type, an unknown slide type, a non-finite number or an
// oversized value is refused (400 bad-deck, with `where`); more than 64 KB of
// JSON is 413 too-large.
//   {kind:'tdeck', ver:1, lang:'en'|'es', title, church,
//    audience:{type:'board'|'team'|'congregation', group:<slug>},
//    ministry:{id:<slug>, name}|null, created:<number|short text>,
//    slides:[1–12 slides]}
//   Every slide has `type`, one of:
//   join     {note}               qrUrl and code6 are always set here, never
//                                 taken from the page (no link the page chose)
//   motion   {kicker, headline, rows:[[label,value]]≤5, by}
//   stat     {kicker, headline, value, unit, hue, freq, count,
//             dots:{n,on,hue}|null, compare:{here,county,label,sig,moe}|null, source}
//   trio     {kicker, headline, items:[{value,label,hue}]×3, source}
//   capacity {kicker, headline, rows:[{label,need,have,unit}]≤4, gaps:[text]≤6, source}
//   ability  {kicker, headline, value, label, gifts:[text]≤12, lead, source}
//   ask      {kicker, headline, rows:[[label,value]]≤7, verse:{text,ref}|null}
//   risks    {kicker, headline, items:[text]≤6, source}
//   timeline {kicker, headline, steps:[{date,title,text}]×3, quote:{text,ref}|null}
//   roles    {kicker, headline, roles:[{title,hours,text}]≤4}
//   yes      {kicker, headline, options:[{k:'lead'|'help'|'pray',label,text}]×3,
//             respond:true|false}
//   verse    {text, ref, version:'KJV'|'RVA'}
//   close    {headline, text, quote:{text,ref}|null}
//   Text is one line, at most 400 characters, with no markup (see NO MARKUP);
//   a value is a finite number or text; hues are kind tokens: hardship,
//   housing, children, people, language, acc.

import { getStore } from '@netlify/blobs';
import { randomBytes, createHash, createHmac, createSign, createPrivateKey, timingSafeEqual } from 'node:crypto';

const FN_VERSION = 'present-1.0';
const STORE_NAME = 'terrain-present';

const MAX_BODY = 128 * 1024;               // whole request
const MAX_DECK = 64 * 1024;                // deck, bytes of JSON
const MAX_SLIDES = 12;
const MAX_STR = 400;                       // any text in a deck
const MAX_NUM = 1e12;                      // any number in a deck, either sign
const MAX_ANSWER_NAME = 40;
const MAX_ANSWER_NOTE = 200;
const MAX_ANSWERS = 500;                   // "I'm in" answers per room
const MAX_OPENED = 1000;                   // o/ markers per room
const MAX_IP_OPENS = 20;                   // rooms opened from one client address, per hour
const MAX_SITE_OPENS = 200;                // rooms opened without a registration, per UTC day
const MAX_REG_OPENS = 10;                  // rooms opened by one registration, per UTC day
const MAX_TOKEN_OPENS = 1000;              // rooms opened by all registrations together, per UTC day
const MAX_GO_PER_SEC = 10;                 // slide changes per room, per second
const MAX_UPDATES = 60;                    // deck updates per room, per hour
const MAX_JOIN_FAILS = 20;                 // failed code lookups from one client address, per hour
const MAX_IP_RESPONDS = 300;               // answers from one client address, per hour (site-wide, soft)
const MAX_ADDR_ANSWERS = 150;              // answers from one client address, per room (hard)
const MAX_TAGS = 20000;                    // client addresses one counter holds in an hour
const KEEP_DAYS = new Set([1, 7, 30]);
const DAY_MS = 24 * 60 * 60 * 1000;
const ROOM_TTL = 10 * 1000;                // a warm instance trusts its copy of a room this long
const OPENED_TTL = 5 * 1000;               // … and its count of phones this long
const WRITE_MARGIN = 60 * 1000;            // nothing is written to a room this close to its expiry
const MAX_DROP = 600;                      // answers the presenter deletes in one call

const RE_ROOM = /^[A-Za-z0-9_-]{22}$/;     // 16 random bytes
const RE_KEY = /^[A-Za-z0-9_-]{43}$/;      // 32 random bytes
const CODE_ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O, 1/I/L
const RE_CODE6 = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
const RE_P = /^[A-Za-z0-9_-]{8,43}$/;      // a phone's own random id
const RE_SLUG = /^[a-z0-9][a-z0-9_-]{0,59}$/;
const RE_AID = /^[A-Za-z0-9_-]{1,43}$/;    // an answer's id: the last part of a/<room>/<id>
const HUES = new Set(['hardship', 'housing', 'children', 'people', 'language', 'acc']);
const ANSWER_KEYS = ['lead', 'help', 'pray'];
// Audiences made of young people: their decks never take "I'm in" answers.
// The same set as the page's CASE_YOUTH_GROUPS (a church-school deck is shown
// where pupils may be in the room).
const YOUTH_GROUPS = new Set(['youth', 'pathfinders', 'adventurers', 'school']);
// The start of an HTML tag (see NO MARKUP).
const RE_TAG = /<[A-Za-z!/?]/;

// ---------------------------------------------------------------- access codes
// The same format as census.mjs and gifts.mjs (functions do not import one
// another): CODE, CODE:Name or CODE:Name@Conference, comma-separated.
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
// Off unless TERRAIN_REQUIRE_CODE is 1, true, yes or on, in any case, read per
// request (as census.mjs and gifts.mjs). Any other value but 0, false, no or
// off is logged once, by the variable's name only.
const warned = new Set();
function envOn(name) {
  const v = (process.env[name] || '').trim();
  if (/^(1|true|yes|on)$/i.test(v)) return true;
  if (v && !/^(0|false|no|off)$/i.test(v) && !warned.has(name)) {
    warned.add(name);
    console.error(`present: ${name} is set, but not to 1, true, yes or on, so it is treated as off`);
  }
  return false;
}
const requireCode = () => envOn('TERRAIN_REQUIRE_CODE');
const codeRequired = () => requireCode() && codes().size > 0;

// ---------------------------------------------------------------- registration
// Copied from census.mjs and gifts.mjs (functions do not import one another):
// the token register.mjs hands a registered pastor, r1.<id>.<issued>.<HMAC>,
// good for 180 days, keyed by TERRAIN_REG_SECRET.
const TOKEN_DAYS = 180;
const RE_REGTOK = /^r1\.([A-Za-z0-9_-]{12})\.([0-9a-z]{1,9})\.([A-Za-z0-9_-]{32})$/;
function regSecret() {
  const v = (process.env.TERRAIN_REG_SECRET || '').trim();
  if (v && v.length < 32 && !warned.has('secret')) {
    warned.add('secret');
    console.error('present: TERRAIN_REG_SECRET is shorter than 32 characters, so it is ignored');
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
// Whether `given` is one of the listed codes, required or not. Constant-time
// over every configured code: hash both sides, compare all.
function codeListed(given) {
  const g = (typeof given === 'string' ? given : '').trim().toLowerCase();
  if (!g || codes().size === 0) return false;
  const gh = sha(g);
  let hit = false;
  for (const code of codes()) if (timingSafeEqual(gh, sha(code))) hit = true;
  return hit;
}
const codeOk = given => !codeRequired() || codeListed(given);

// ---------------------------------------------------------------- helpers
class Fail extends Error {
  constructor(status, error, extra) { super(error); this.status = status; this.error = error; this.extra = extra || null; }
}
const NO_STORE = 'no-store, max-age=0';
const reply = (body, status = 200, extra = null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': NO_STORE, 'x-content-type-options': 'nosniff', ...(extra || {}) }
  });
// op state is what phones without a live stream poll: Netlify's edge may answer it for
// 2 s (one room, one answer), keyed by op and room only. The browser still keeps nothing.
const EDGE_2S = { 'netlify-cdn-cache-control': 'public, s-maxage=2', 'netlify-vary': 'query=op|room' };

const rand = n => randomBytes(n).toString('base64url');
function sha(s) { return createHash('sha256').update(String(s), 'utf8').digest(); }
const shaHex = s => sha(s).toString('hex');
function secretOk(given, storedHex) {
  if (typeof given !== 'string' || typeof storedHex !== 'string' || !/^[0-9a-f]{64}$/.test(storedHex)) return false;
  return timingSafeEqual(sha(given), Buffer.from(storedHex, 'hex'));
}
// Six characters from a 31-letter alphabet, without bias (248 = 8 × 31).
function newCode6() {
  let s = '';
  while (s.length < 6) for (const x of randomBytes(12)) if (x < 248 && s.length < 6) s += CODE_ALPHA[x % 31];
  return s;
}

// Plain one-line text: no control characters (C0 or C1), no bidirectional
// overrides, runs of space collapsed.
function line(s) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
// A note may keep its line breaks; every other control character goes.
function para(s) {
  return String(s == null ? '' : s).replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]+/g, ' ')
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

const utcDay = t => new Date(t).toISOString().slice(0, 10);
const utcHour = t => new Date(t).toISOString().slice(0, 13);
// The caller's address as Netlify reports it; '' outside Netlify (no limit then).
// An IPv6 address counts as its /64 network: whoever holds one address can use
// any of the 2^64 in it, so a limit per address would be no limit at all.
function clientIp(request, context) {
  const ip = context && typeof context.ip === 'string' ? context.ip : (request && request.headers ? request.headers.get('x-nf-client-connection-ip') || '' : '');
  return addrBucket(line(ip).slice(0, 64));
}
function addrBucket(ip) {
  let s = ip.toLowerCase().replace(/^\[|\]$/g, '').replace(/%.*$/, '');
  const v4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
  if (v4) return v4[1];
  if (!s.includes(':')) return s;
  // A dotted IPv4 tail (::ffff:… handled above, NAT64 and the like) → two groups.
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
// An answer's tag: 6 characters of a keyed hash of the client address, keyed by the
// room's own salt (a room made before salts, by its key's hash), so it means nothing
// outside the room.
const answerTag = (rec, ip) => createHmac('sha256', String(rec.salt || rec.keyHash || rec.room)).update(ip, 'utf8').digest('base64url').slice(0, 6);
const isExpired = (rec, now = Date.now()) => !rec || typeof rec.expires !== 'number' || rec.expires <= now;
// Whether a room may still be written to (see RETENTION): not in its last minute.
const writable = (rec, now = Date.now()) => !!rec && typeof rec.expires === 'number' && rec.expires - now > WRITE_MARGIN;

function need(ok, status, error) { if (!ok) throw new Fail(status, error); }
const str = v => (typeof v === 'string' ? v : '');
const own = (o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);

function theStore() {
  if (globalThis.__terrainPresentStore) return globalThis.__terrainPresentStore;
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

// Read-modify-write, conditional on the ETag when the store offers one (the
// real Netlify store does), retried. fn mutates cur in place and returns the
// op's answer; it may throw a Fail to abort without writing.
async function mutate(store, key, fn, { onExpired } = {}) {
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
    if (onExpired && isExpired(cur)) { await onExpired(cur); throw new Fail(404, 'not-found'); }
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

// Run fn over items, n at a time.
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

// ---------------------------------------------------------------- per-client counters
// One blob per purpose, {hour, salt, to:{<tag>:n}}. soft: a counter too busy
// to update lets the request through (the hard caps still hold).
function hourCounter(g, hour) {
  return g && g.hour === hour && typeof g.salt === 'string' && isPlain(g.to)
    ? g : { hour, salt: rand(18), to: {} };
}
async function ipHit(store, key, ip, max, { soft = false } = {}) {
  if (!ip) return;
  const hour = utcHour(Date.now());
  try {
    await upsert(store, key, g => {
      const cur = hourCounter(g, hour);
      const tag = ipTag(ip, cur.salt);
      const mine = own(cur.to, tag) || 0;
      need(mine < max, 429, 'slow-down');
      need(mine > 0 || Object.keys(cur.to).length < MAX_TAGS, 429, 'slow-down');
      return { hour, salt: cur.salt, to: { ...cur.to, [tag]: mine + 1 } };
    });
  } catch (e) {
    if (soft && e instanceof Fail && e.error === 'busy') return;
    throw e;
  }
}
async function ipCount(store, key, ip) {
  if (!ip) return 0;
  const g = await store.get(key, { type: 'json' });
  const hour = utcHour(Date.now());
  if (!isPlain(g) || g.hour !== hour || typeof g.salt !== 'string' || !isPlain(g.to)) return 0;
  return own(g.to, ipTag(ip, g.salt)) || 0;
}

// ---------------------------------------------------------------- Firebase
// The pointer's database, or null when live follow is not set up. Only an
// https address on Firebase's own hosts, with nothing after the host, is
// used: the key is never sent anywhere else. The key is the database secret,
// or a service-account key file (see FIREBASE KEY), of which only the email
// and the private key are kept.
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
  const sa = serviceAccount(secret);
  return sa ? { base: u.origin, sa } : null;
}
// A service-account key file, read once per value: client_email and
// private_key only (nothing else in it is trusted, token_uri included).
let saRaw = null, saVal = null;
function serviceAccount(raw) {
  if (raw === saRaw) return saVal;
  let v = null;
  try {
    const j = JSON.parse(raw);
    const email = isPlain(j) ? j.client_email : null, key = isPlain(j) ? j.private_key : null;
    if (typeof email === 'string' && /^[^\s@]{1,200}@[a-z0-9.-]{1,200}$/i.test(email) &&
        typeof key === 'string' && /-----BEGIN (RSA )?PRIVATE KEY-----/.test(key)) {
      createPrivateKey(key);   // throws when it is not a usable key
      v = { email, key };
    }
  } catch { v = null; }
  saRaw = raw; saVal = v;
  return v;
}
// An access token for the service account: a signed request (RS256) traded
// at Google's token address, kept until five minutes before it runs out.
// saErr says why the last trade failed: 'bad-key' (Google refused it) or
// 'unreachable'.
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const FB_SCOPES = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database';
let saTok = null, saErr = null;
async function saToken(sa) {
  const now = Date.now();
  if (saTok && saTok.email === sa.email && saTok.key === sa.key && saTok.exp - now > 5 * 60 * 1000) return saTok.tok;
  const b64 = o => Buffer.from(JSON.stringify(o), 'utf8').toString('base64url');
  const iat = Math.floor(now / 1000);
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: sa.email, scope: FB_SCOPES, aud: GOOGLE_TOKEN, iat, exp: iat + 3600 });
  let res;
  try {
    const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.key).toString('base64url');
    res = await fetch(GOOGLE_TOKEN, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + unsigned + '.' + sig,
      redirect: 'error', signal: AbortSignal.timeout(5000)
    });
  } catch { saErr = 'unreachable'; return null; }
  if (!res || !res.ok) { saErr = res && res.status >= 400 && res.status < 500 ? 'bad-key' : 'unreachable'; return null; }
  let j = null; try { j = await res.json(); } catch { j = null; }
  if (!isPlain(j) || typeof j.access_token !== 'string' || !/^[\x21-\x7e]{1,4096}$/.test(j.access_token)) { saErr = 'unreachable'; return null; }
  const life = typeof j.expires_in === 'number' && j.expires_in > 0 ? Math.min(j.expires_in, 3600) : 3600;
  saTok = { email: sa.email, key: sa.key, tok: j.access_token, exp: now + life * 1000 };
  saErr = null;
  return saTok.tok;
}
// The query that carries the key: auth=<secret>, or access_token=<token>.
async function fbAuth(f) {
  if (f.secret) return 'auth=' + encodeURIComponent(f.secret);
  const t = await saToken(f.sa);
  return t ? 'access_token=' + encodeURIComponent(t) : null;
}
// One REST call on live/<room>. true when Firebase answered 2xx; false when it
// failed or live follow is not set up. The address carries the key, so it is
// never logged or returned, and a redirect is never followed (it would carry
// the key, and the body, to wherever the answer pointed).
async function fbCall(method, room, body) {
  const f = fb();
  if (!f || !RE_ROOM.test(room)) return false;
  const auth = await fbAuth(f);
  if (!auth) return false;
  const quiet = method === 'GET' ? '' : '&print=silent';
  try {
    const res = await fetch(`${f.base}/live/${room}.json?${auth}${quiet}`, {
      method,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(5000)
    });
    if (!res || !res.ok) return false;
    if (method !== 'GET') return true;
    try { return { data: await res.json() }; } catch { return false; }
  } catch { return false; }
}
// Whether Firebase takes the key right now, for status: a shallow read of the
// database root, which the rules refuse to anyone without the key (401 or
// 403); the answer itself is never read. Cached for a minute per address and key.
const PROBE_TTL = 60 * 1000;
let probe = null;
async function fbProbe() {
  const f = fb();
  if (!f) return 'unset';
  const id = shaHex(f.base + '|' + (f.secret || f.sa.email + '|' + f.sa.key));
  if (probe && probe.id === id && Date.now() - probe.at < PROBE_TTL) return probe.r;
  let r;
  const auth = await fbAuth(f);
  if (!auth) r = saErr || 'unreachable';
  else {
    try {
      const res = await fetch(`${f.base}/.json?shallow=true&${auth}`, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(4000) });
      r = res && res.ok ? 'ok' : res && (res.status === 401 || res.status === 403) ? 'bad-key' : 'unreachable';
      try { if (res && res.body && typeof res.body.cancel === 'function') await res.body.cancel(); } catch { /* the answer is never read */ }
    } catch { r = 'unreachable'; }
  }
  probe = { id, at: Date.now(), r };
  return r;
}
const liveUrl = room => { const f = fb(); return f ? `${f.base}/live/${room}.json` : null; };

// ---------------------------------------------------------------- rooms
// A warm instance keeps what `go` needs (the key's hash, the slide count, the
// end) for ROOM_TTL, so moving a slide reads no blob. A refusal on a stale
// copy reads the room again before refusing.
const ROOMS = new Map();
const GO_RATE = new Map();
const OPENED = new Map();
function remember(room, r) {
  if (!ROOMS.has(room) && ROOMS.size >= 500) ROOMS.delete(ROOMS.keys().next().value);
  const c = { keyHash: r.keyHash, n: r.n, ended: r.ended || null, expires: r.expires, lang: r.lang, v: r.v, t: Date.now() };
  ROOMS.set(room, c);
  return c;
}
function forget(room) { ROOMS.delete(room); GO_RATE.delete(room); OPENED.delete(room); }

// Everything a room holds, gone, the members' answers first; the Firebase
// pointer too. The expiry marker stays for the sweep (see RETENTION).
async function dropRoom(store, room, rec) {
  forget(room);
  const kids = [...await keysUnder(store, `a/${room}/`), ...await keysUnder(store, `o/${room}/`)];
  await pool(kids, 16, k => store.delete(k));
  if (rec && RE_CODE6.test(str(rec.code))) {
    const k = await store.get('k/' + rec.code, { type: 'json' });
    if (!k || k.room === room) await store.delete('k/' + rec.code);
  }
  await store.delete('d/' + room);
  await store.delete('r/' + room);
  return fbCall('DELETE', room);
}
// The room's record, or 404. An expired room is deleted on sight.
async function loadRoom(store, room) {
  need(RE_ROOM.test(str(room)), 400, 'bad-room');
  const r = await store.get('r/' + room, { type: 'json' });
  need(isPlain(r), 404, 'not-found');
  if (isExpired(r)) { await dropRoom(store, room, r); throw new Fail(404, 'not-found'); }
  remember(room, r);
  return r;
}
async function roomFor(store, room, { fresh = false } = {}) {
  need(RE_ROOM.test(str(room)), 400, 'bad-room');
  const c = ROOMS.get(room), now = Date.now();
  if (!fresh && c && now - c.t < ROOM_TTL && c.expires > now) return c;
  await loadRoom(store, room);
  return ROOMS.get(room);
}
async function authRoom(store, b) {
  need(RE_ROOM.test(str(b.room)), 400, 'bad-room');
  need(RE_KEY.test(str(b.key)), 403, 'bad-key');
  const r = await loadRoom(store, b.room);
  need(secretOk(b.key, r.keyHash), 403, 'bad-key');
  return r;
}
const onExpiredRoom = (store, room) => rec => dropRoom(store, room, rec);

// How many phones opened the slides (cached briefly: `go` answers it).
async function openedCount(store, room, { fresh = false } = {}) {
  const c = OPENED.get(room), now = Date.now();
  if (!fresh && c && now - c.t < OPENED_TTL) return c.n;
  const n = (await keysUnder(store, `o/${room}/`)).length;
  if (!OPENED.has(room) && OPENED.size >= 500) OPENED.delete(OPENED.keys().next().value);
  OPENED.set(room, { n, t: now });
  return n;
}

// The address a join slide's QR code points to. Never a host the page chose:
// SITE_URL, else the site's own address as Netlify reports it, and only
// outside Netlify the origin of the request.
function siteBase(request, context) {
  const siteUrl = context && context.site && typeof context.site.url === 'string' ? context.site.url : '';
  let base = (process.env.SITE_URL || '').trim() || siteUrl.trim();
  if (!/^https?:\/\/[^\s/?#]+/i.test(base)) base = new URL(request.url).origin;
  try { return new URL(base).origin; } catch { return new URL(request.url).origin; }
}
const watchUrl = (base, room, lang) => `${base}/#watch=${room}${lang === 'es' ? '~es' : ''}`;

// ---------------------------------------------------------------- the deck
// Rebuilt field by field; see THE DECK above. `where` names the first field
// refused, so the page can say which slide is wrong.
const bad = where => new Fail(400, 'bad-deck', { where });
function dText(v, where, { max = MAX_STR } = {}) {
  if (v == null) return '';
  if (typeof v !== 'string') throw bad(where);
  const s = line(v);
  if (s.length > max || RE_TAG.test(s)) throw bad(where);
  return s;
}
function dNum(v, where, { int = false, min = -MAX_NUM, max = MAX_NUM } = {}) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (int && !Number.isInteger(v))) throw bad(where);
  return v;
}
// A figure: a finite number, or text ("$85", "7 Oct – 18 Nov").
function dVal(v, where) {
  if (v == null) return '';
  if (typeof v === 'number') return dNum(v, where);
  return dText(v, where);
}
function dNumOrNull(v, where) { return v == null ? null : dNum(v, where); }
function dHue(v, where) {
  if (v == null) return 'acc';
  if (typeof v !== 'string' || !HUES.has(v)) throw bad(where);
  return v;
}
function dBool(v, where) {
  if (v == null) return false;
  if (typeof v !== 'boolean') throw bad(where);
  return v;
}
function dObj(v, where) { if (!isPlain(v)) throw bad(where); return v; }
function dList(v, where, { min = 0, max }) {
  if (v == null && min === 0) return [];
  if (!Array.isArray(v) || v.length < min || v.length > max) throw bad(where);
  return v;
}
function dQuote(v, where) {
  if (v == null) return null;
  const q = dObj(v, where);
  return { text: dText(own(q, 'text'), where + '.text'), ref: dText(own(q, 'ref'), where + '.ref') };
}
function dRows(v, where, max) {
  return dList(v, where, { max }).map((row, i) => {
    const w = `${where}[${i}]`;
    if (!Array.isArray(row) || row.length !== 2) throw bad(w);
    return [dText(row[0], w + '[0]'), dVal(row[1], w + '[1]')];
  });
}
const heads = (s, w) => ({ kicker: dText(own(s, 'kicker'), w + '.kicker'), headline: dText(own(s, 'headline'), w + '.headline') });

const SLIDES = {
  join: (s, w) => ({ note: dText(own(s, 'note'), w + '.note') }),
  motion: (s, w) => ({ ...heads(s, w), rows: dRows(own(s, 'rows'), w + '.rows', 5), by: dText(own(s, 'by'), w + '.by') }),
  stat: (s, w) => {
    const dots = own(s, 'dots');
    let d = null;
    if (dots != null) {
      const o = dObj(dots, w + '.dots');
      const n = dNum(own(o, 'n'), w + '.dots.n', { int: true, min: 1, max: 1000 });
      d = { n, on: dNum(own(o, 'on'), w + '.dots.on', { int: true, min: 0, max: n }), hue: dHue(own(o, 'hue'), w + '.dots.hue') };
    }
    const cmp = own(s, 'compare');
    let c = null;
    if (cmp != null) {
      const o = dObj(cmp, w + '.compare');
      const moe = own(o, 'moe');
      c = {
        here: dVal(own(o, 'here'), w + '.compare.here'), county: dVal(own(o, 'county'), w + '.compare.county'),
        label: dText(own(o, 'label'), w + '.compare.label'), sig: dBool(own(o, 'sig'), w + '.compare.sig'),
        moe: moe == null ? null : dVal(moe, w + '.compare.moe')
      };
    }
    return {
      ...heads(s, w), value: dVal(own(s, 'value'), w + '.value'), unit: dText(own(s, 'unit'), w + '.unit'),
      hue: dHue(own(s, 'hue'), w + '.hue'), freq: dText(own(s, 'freq'), w + '.freq'),
      count: dText(own(s, 'count'), w + '.count'), dots: d, compare: c, source: dText(own(s, 'source'), w + '.source')
    };
  },
  trio: (s, w) => ({
    ...heads(s, w),
    items: dList(own(s, 'items'), w + '.items', { min: 3, max: 3 }).map((it, i) => {
      const x = `${w}.items[${i}]`, o = dObj(it, x);
      return { value: dVal(own(o, 'value'), x + '.value'), label: dText(own(o, 'label'), x + '.label'), hue: dHue(own(o, 'hue'), x + '.hue') };
    }),
    source: dText(own(s, 'source'), w + '.source')
  }),
  capacity: (s, w) => ({
    ...heads(s, w),
    rows: dList(own(s, 'rows'), w + '.rows', { max: 4 }).map((it, i) => {
      const x = `${w}.rows[${i}]`, o = dObj(it, x);
      return {
        label: dText(own(o, 'label'), x + '.label'), need: dNumOrNull(own(o, 'need'), x + '.need'),
        have: dNumOrNull(own(o, 'have'), x + '.have'), unit: dText(own(o, 'unit'), x + '.unit')
      };
    }),
    gaps: dList(own(s, 'gaps'), w + '.gaps', { max: 6 }).map((g, i) => dText(g, `${w}.gaps[${i}]`)),
    source: dText(own(s, 'source'), w + '.source')
  }),
  ability: (s, w) => ({
    ...heads(s, w), value: dVal(own(s, 'value'), w + '.value'), label: dText(own(s, 'label'), w + '.label'),
    gifts: dList(own(s, 'gifts'), w + '.gifts', { max: 12 }).map((g, i) => dText(g, `${w}.gifts[${i}]`)),
    lead: dText(own(s, 'lead'), w + '.lead'), source: dText(own(s, 'source'), w + '.source')
  }),
  ask: (s, w) => ({ ...heads(s, w), rows: dRows(own(s, 'rows'), w + '.rows', 7), verse: dQuote(own(s, 'verse'), w + '.verse') }),
  risks: (s, w) => ({
    ...heads(s, w),
    items: dList(own(s, 'items'), w + '.items', { max: 6 }).map((t, i) => dText(t, `${w}.items[${i}]`)),
    source: dText(own(s, 'source'), w + '.source')
  }),
  timeline: (s, w) => ({
    ...heads(s, w),
    steps: dList(own(s, 'steps'), w + '.steps', { min: 3, max: 3 }).map((it, i) => {
      const x = `${w}.steps[${i}]`, o = dObj(it, x);
      return { date: dText(own(o, 'date'), x + '.date'), title: dText(own(o, 'title'), x + '.title'), text: dText(own(o, 'text'), x + '.text') };
    }),
    quote: dQuote(own(s, 'quote'), w + '.quote')
  }),
  roles: (s, w) => ({
    ...heads(s, w),
    roles: dList(own(s, 'roles'), w + '.roles', { max: 4 }).map((it, i) => {
      const x = `${w}.roles[${i}]`, o = dObj(it, x);
      return { title: dText(own(o, 'title'), x + '.title'), hours: dVal(own(o, 'hours'), x + '.hours'), text: dText(own(o, 'text'), x + '.text') };
    })
  }),
  yes: (s, w) => {
    const seen = new Set();
    const options = dList(own(s, 'options'), w + '.options', { min: 3, max: 3 }).map((it, i) => {
      const x = `${w}.options[${i}]`, o = dObj(it, x), k = own(o, 'k');
      if (typeof k !== 'string' || !ANSWER_KEYS.includes(k) || seen.has(k)) throw bad(x + '.k');
      seen.add(k);
      return { k, label: dText(own(o, 'label'), x + '.label'), text: dText(own(o, 'text'), x + '.text') };
    });
    return { ...heads(s, w), options, respond: dBool(own(s, 'respond'), w + '.respond') };
  },
  verse: (s, w) => {
    const version = own(s, 'version');
    if (version !== 'KJV' && version !== 'RVA') throw bad(w + '.version');
    return { text: dText(own(s, 'text'), w + '.text'), ref: dText(own(s, 'ref'), w + '.ref'), version };
  },
  close: (s, w) => ({ headline: dText(own(s, 'headline'), w + '.headline'), text: dText(own(s, 'text'), w + '.text'), quote: dQuote(own(s, 'quote'), w + '.quote') })
};

// The deck as stored and served. join slides get the room's own link and code.
function cleanDeck(raw, { room, code, base }) {
  if (!isPlain(raw)) throw bad('deck');
  let size = 0;
  try { size = Buffer.byteLength(JSON.stringify(raw), 'utf8'); } catch { throw bad('deck'); }
  need(size <= MAX_DECK, 413, 'too-large');
  if (own(raw, 'kind') !== 'tdeck') throw bad('kind');
  if (own(raw, 'ver') !== 1) throw bad('ver');
  const lang = own(raw, 'lang');
  if (lang !== 'en' && lang !== 'es') throw bad('lang');
  const au = dObj(own(raw, 'audience'), 'audience');
  const type = own(au, 'type');
  if (type !== 'board' && type !== 'team' && type !== 'congregation') throw bad('audience.type');
  const group = own(au, 'group');
  if (typeof group !== 'string' || !RE_SLUG.test(group)) throw bad('audience.group');
  let ministry = null;
  const mi = own(raw, 'ministry');
  if (mi != null) {
    const o = dObj(mi, 'ministry'), id = own(o, 'id');
    if (typeof id !== 'string' || !RE_SLUG.test(id)) throw bad('ministry.id');
    ministry = { id, name: dText(own(o, 'name'), 'ministry.name') };
  }
  const cr = own(raw, 'created');
  const created = cr == null ? null : (typeof cr === 'number' ? dNum(cr, 'created', { min: 0, max: 1e14 }) : dText(cr, 'created', { max: 40 }));
  const slides = dList(own(raw, 'slides'), 'slides', { min: 1, max: MAX_SLIDES }).map((s, i) => {
    const w = `slides[${i}]`;
    const o = dObj(s, w), t = own(o, 'type');
    if (typeof t !== 'string' || !Object.prototype.hasOwnProperty.call(SLIDES, t)) throw bad(w + '.type');
    const out = { type: t, ...SLIDES[t](o, w) };
    if (t === 'join') { out.qrUrl = watchUrl(base, room, lang); out.code6 = code; }
    // Young people are never asked for their names (see "I'M IN").
    if (t === 'yes' && YOUTH_GROUPS.has(group)) out.respond = false;
    return out;
  });
  const deck = {
    kind: 'tdeck', ver: 1, lang, title: dText(own(raw, 'title'), 'title'), church: dText(own(raw, 'church'), 'church'),
    audience: { type, group }, ministry, created, slides
  };
  need(Buffer.byteLength(JSON.stringify(deck), 'utf8') <= MAX_DECK, 413, 'too-large');
  return deck;
}
// What the room keeps about a deck: its size, and whether (and how) members
// may answer "I'm in".
function deckFacts(deck) {
  const opts = new Set();
  for (const s of deck.slides) if (s.type === 'yes' && s.respond) s.options.forEach(o => opts.add(o.k));
  return { n: deck.slides.length, lang: deck.lang, title: deck.title, church: deck.church, respond: opts.size > 0, opts: [...opts] };
}

// ---------------------------------------------------------------- ops
const OPS = {
  async status() {
    const f = await fbProbe();
    return { ok: true, fn: FN_VERSION, live: f === 'ok', fb: f, codeRequired: codeRequired(), regRequired: regRequired() };
  },

  async open(b, { request, context, store }) {
    const given = request.headers.get('x-terrain-code');
    if (!codeOk(given)) throw new Fail(401, 'nocode');
    if (regRequired() && !regTokenOk(request.headers.get('x-terrain-reg'), regSecret())) throw new Fail(401, 'noreg');
    // A pastor with a listed code is never shut out by the site-wide day limit.
    const vouched = codeListed(given);
    // A registered pastor's opens are counted apart from anonymous ones (registration off):
    // his own 10 a day, inside a larger pool for all registrations, so strangers opening
    // rooms without a token cannot use up the day for him, and one registration cannot
    // use up the pool for everyone.
    const regId = regRequired() ? (RE_REGTOK.exec(String(request.headers.get('x-terrain-reg') || '').trim()) || [])[1] || null : null;
    const keepDays = b.keepDays == null ? 7 : b.keepDays;
    need(KEEP_DAYS.has(keepDays), 400, 'bad-days');
    const base = siteBase(request, context);
    // Checked once before anything is counted, so a page with a bad deck does
    // not use up the allowance; rebuilt again below with the room's own code.
    cleanDeck(b.deck, { room: 'A'.repeat(22), code: 'AAAAAA', base });

    // This client per hour, then the whole site per day, in one update.
    const ip = clientIp(request, context);
    const now0 = Date.now(), hour = utcHour(now0), day = utcDay(now0);
    await upsert(store, 'g/open', g => {
      const cur = hourCounter(g, hour);
      const today = !!g && g.day === day;
      const n = today && Number.isInteger(g.n) ? g.n : 0;          // anonymous opens today
      const tn = today && Number.isInteger(g.tn) ? g.tn : 0;       // opens with a registration today
      const regs = today && isPlain(g.regs) ? g.regs : {};         // … per registration id
      const next = { hour, salt: cur.salt, to: cur.to, day, n, tn, regs };
      if (ip) {
        const tag = ipTag(ip, cur.salt), mine = own(cur.to, tag) || 0;
        need(mine < MAX_IP_OPENS, 429, 'slow-down');
        need(mine > 0 || Object.keys(cur.to).length < MAX_TAGS, 429, 'slow-down');
        next.to = { ...cur.to, [tag]: mine + 1 };
      }
      if (vouched) return next;
      if (regId) {
        const mine = own(regs, regId) || 0;
        need(mine < MAX_REG_OPENS, 429, 'slow-down');
        need(tn < MAX_TOKEN_OPENS, 429, 'site-busy');
        next.tn = tn + 1; next.regs = { ...regs, [regId]: mine + 1 };
      } else {
        need(n < MAX_SITE_OPENS, 429, 'site-busy');
        next.n = n + 1;
      }
      return next;
    });

    for (let attempt = 0; attempt < 8; attempt++) {
      const room = rand(16), key = rand(32), code = newCode6();
      if (await store.get('r/' + room, { type: 'json' })) continue;
      const created = Date.now(), expires = created + keepDays * DAY_MS;
      const deck = cleanDeck(b.deck, { room, code, base });
      const facts = deckFacts(deck);
      // The marker first: a room is never stored without one.
      await store.setJSON(`x/${utcDay(expires)}/${room}`, {});
      const kw = await store.setJSON('k/' + code, { room, expires }, { onlyIfNew: true });
      if (kw && kw.modified === false) continue;
      await store.setJSON('d/' + room, { v: 1, deck });
      const rec = {
        room, keyHash: shaHex(key), created, expires, v: 1, ...facts,
        ended: null, code, upd: { hour: '', n: 0 }, salt: rand(12)
      };
      const w = await store.setJSON('r/' + room, rec, { onlyIfNew: true });
      if (w && w.modified === false) { await store.delete('k/' + code); continue; }
      remember(room, rec);
      if (fb()) {
        const ptr = { i: 0, v: 1, on: false, end: false, at: { '.sv': 'timestamp' } };
        if (!await fbCall('PATCH', room, ptr)) await fbCall('PATCH', room, ptr);
      }
      return { ok: true, room, key, code, expires, v: 1, n: facts.n, respond: facts.respond, url: watchUrl(base, room, facts.lang), live: !!fb() };
    }
    throw new Fail(503, 'busy');
  },

  // Public: the slides, for whoever holds the room id.
  async deck(b, { store }) {
    const r = await loadRoom(store, b.room);
    const d = await store.get('d/' + b.room, { type: 'json' });
    need(isPlain(d) && isPlain(d.deck), 404, 'not-found');
    // One marker per phone. Best effort: counting never stops the slides.
    try {
      const p = str(b.p);
      const id = RE_P.test(p) ? createHash('sha256').update(b.room + '.' + p).digest('base64url').slice(0, 16) : rand(12);
      if (writable(r) && await openedCount(store, b.room) < MAX_OPENED) {
        const w = await store.setJSON(`o/${b.room}/${id}`, {}, { onlyIfNew: true });
        const c = OPENED.get(b.room);
        if (c && !(w && w.modified === false)) c.n++;
      }
    } catch { /* not counted */ }
    return { ok: true, v: d.v, deck: d.deck, ended: r.ended || null, expires: r.expires, live: liveUrl(b.room) };
  },

  async go(b, { store }) {
    need(RE_ROOM.test(str(b.room)), 400, 'bad-room');
    need(RE_KEY.test(str(b.key)), 403, 'bad-key');
    need(Number.isInteger(b.i) && b.i >= 0 && b.i < MAX_SLIDES, 400, 'bad-i');
    let r = await roomFor(store, b.room);
    need(secretOk(b.key, r.keyHash), 403, 'bad-key');
    // A copy made before an update or an end on another instance is checked
    // again before it refuses anything.
    if (b.i >= r.n || r.ended) r = await roomFor(store, b.room, { fresh: true });
    need(!r.ended, 409, 'ended');
    need(b.i < r.n, 400, 'bad-i');
    // A pointer written in a room's last minute could outlive the sweep.
    need(writable(r), 404, 'not-found');
    const sec = Math.floor(Date.now() / 1000);
    const g = GO_RATE.get(b.room);
    const used = g && g.sec === sec ? g.n : 0;
    need(used < MAX_GO_PER_SEC, 429, 'slow-down');
    if (!GO_RATE.has(b.room) && GO_RATE.size >= 500) GO_RATE.delete(GO_RATE.keys().next().value);
    GO_RATE.set(b.room, { sec, n: used + 1 });
    if (fb()) {
      const ok = await fbCall('PATCH', b.room, { i: b.i, on: true, at: { '.sv': 'timestamp' } });
      need(ok, 502, 'live-failed');
    }
    return { ok: true, i: b.i, opened: await openedCount(store, b.room), live: !!fb() };
  },

  async update(b, { request, context, store }) {
    const r0 = await authRoom(store, b);
    const base = siteBase(request, context);
    const deck = cleanDeck(b.deck, { room: b.room, code: r0.code, base });
    const facts = deckFacts(deck);
    const hour = utcHour(Date.now());
    const v = await mutate(store, 'r/' + b.room, r => {
      need(secretOk(b.key, r.keyHash), 403, 'bad-key');
      need(writable(r), 404, 'not-found');
      const u = isPlain(r.upd) && r.upd.hour === hour ? r.upd.n : 0;
      need(u < MAX_UPDATES, 429, 'slow-down');
      r.upd = { hour, n: u + 1 };
      r.v = (Number.isInteger(r.v) ? r.v : 1) + 1;
      Object.assign(r, facts);
      return r.v;
    }, { onExpired: onExpiredRoom(store, b.room) });
    // Never replaced by an older update that arrives late.
    await upsert(store, 'd/' + b.room, d => (d && Number.isInteger(d.v) && d.v >= v ? undefined : { v, deck }));
    ROOMS.delete(b.room);
    const pointer = fb() ? await fbCall('PATCH', b.room, { v, at: { '.sv': 'timestamp' } }) : false;
    return { ok: true, v, n: facts.n, respond: facts.respond, pointer };
  },

  async end(b, { store }) {
    await authRoom(store, b);
    const out = await mutate(store, 'r/' + b.room, r => {
      need(secretOk(b.key, r.keyHash), 403, 'bad-key');
      need(writable(r), 404, 'not-found');
      if (!r.ended) r.ended = Date.now();
      return { ended: r.ended, expires: r.expires };
    }, { onExpired: onExpiredRoom(store, b.room) });
    ROOMS.delete(b.room);
    // pointer:false with live follow set up means the phones did not hear it:
    // the page may send end again (it changes nothing else).
    const pointer = fb() ? await fbCall('PATCH', b.room, { on: false, end: true, at: { '.sv': 'timestamp' } }) : false;
    return { ok: true, ...out, pointer };
  },

  async remove(b, { store }) {
    const r = await authRoom(store, b);
    const cleared = await dropRoom(store, b.room, r);
    return { ok: true, liveCleared: !!cleared };
  },

  // A typed code → the room. Only failures count toward the client's limit.
  async join(b, { store, request, context }) {
    const ip = clientIp(request, context);
    need(await ipCount(store, 'g/join', ip) < MAX_JOIN_FAILS, 429, 'slow-down');
    const code = str(b.code).toUpperCase().replace(/[\s-]+/g, '');
    let hit = null;
    if (RE_CODE6.test(code)) {
      const k = await store.get('k/' + code, { type: 'json' });
      if (isPlain(k) && RE_ROOM.test(str(k.room))) {
        if (isExpired(k)) {
          try { await store.delete('k/' + code); } catch { /* the sweep tidies it */ }
        } else {
          try { const r = await loadRoom(store, k.room); if (r.code === code) hit = r; } catch (e) { if (!(e instanceof Fail)) throw e; }
        }
      }
    }
    if (!hit) {
      await ipHit(store, 'g/join', ip, MAX_JOIN_FAILS);
      throw new Fail(404, 'not-found');
    }
    return { ok: true, room: hit.room, lang: hit.lang === 'es' ? 'es' : 'en' };
  },

  // The pointer, read here for a phone whose network blocks firebaseio.com.
  async state(b, { store }) {
    const r = await roomFor(store, b.room);
    const v = Number.isInteger(r.v) && r.v > 0 ? r.v : 1;
    if (!fb()) return { ok: true, state: null, ended: r.ended || null, v };
    const got = await fbCall('GET', b.room);
    need(got, 502, 'live-failed');
    const d = got.data;
    const state = isPlain(d) ? {
      i: Number.isInteger(d.i) && d.i >= 0 && d.i < MAX_SLIDES ? d.i : 0,
      v: Number.isInteger(d.v) && d.v > 0 ? d.v : 1,
      on: d.on === true, end: d.end === true,
      at: typeof d.at === 'number' && Number.isFinite(d.at) ? d.at : null
    } : null;
    return { ok: true, state, ended: r.ended || null, v };
  },

  // "I'm in": to the presenter alone.
  async respond(b, { store, request, context }) {
    need(RE_ROOM.test(str(b.room)), 400, 'bad-room');
    need(b.minor == null || typeof b.minor === 'boolean', 400, 'bad-minor');
    need(b.minor !== true, 403, 'minor');
    need(typeof b.k === 'string' && ANSWER_KEYS.includes(b.k), 400, 'bad-k');
    need(typeof b.name === 'string', 400, 'bad-name');
    const name = line(b.name);
    need(name.length >= 1 && name.length <= MAX_ANSWER_NAME && /\p{L}/u.test(name) && !RE_TAG.test(name), 400, 'bad-name');
    need(b.note == null || typeof b.note === 'string', 400, 'bad-note');
    const note = para(b.note);
    need(note.length <= MAX_ANSWER_NOTE && !RE_TAG.test(note), 400, 'bad-note');
    const r = await loadRoom(store, b.room);
    need(r.respond === true, 403, 'respond-off');
    // An answer written in a room's last minute could outlive the sweep.
    need(writable(r), 404, 'not-found');
    need(Array.isArray(r.opts) && r.opts.includes(b.k), 400, 'bad-k');
    const prefix = `a/${b.room}/`;
    need((await keysUnder(store, prefix)).length < MAX_ANSWERS, 409, 'full');
    const ip = clientIp(request, context);
    await ipHit(store, 'g/resp', ip, MAX_IP_RESPONDS, { soft: true });
    // The id starts with this address's tag for this room: its answers are counted by
    // listing that prefix, with no shared counter for a flood to jam.
    const tag = ip ? answerTag(r, ip) : '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const key = prefix + tag + rand(9);
      const w = await store.setJSON(key, { k: b.k, name, note, ts: Date.now() }, { onlyIfNew: true });
      if (w && w.modified === false) continue;
      // Written, then counted: answers sent in parallel cannot all pass a count read before
      // any of them was written. Over a cap, this answer goes again.
      if (tag && (await keysUnder(store, prefix + tag)).length > MAX_ADDR_ANSWERS) { await store.delete(key); throw new Fail(429, 'slow-down'); }
      if ((await keysUnder(store, prefix)).length > MAX_ANSWERS) { await store.delete(key); throw new Fail(409, 'full'); }
      return { ok: true };
    }
    throw new Fail(503, 'busy');
  },

  async answers(b, { store }) {
    await authRoom(store, b);
    const prefix = `a/${b.room}/`;
    const keys = await keysUnder(store, prefix);
    const recs = await pool(keys, 32, async k => ({ id: k.slice(prefix.length), a: await store.get(k, { type: 'json' }) }));
    const items = recs.filter(x => RE_AID.test(x.id) && isPlain(x.a) && ANSWER_KEYS.includes(x.a.k))
      .map(({ id, a }) => ({ id, k: a.k, name: str(a.name), note: str(a.note), ts: typeof a.ts === 'number' ? a.ts : 0 }))
      .sort((x, y) => x.ts - y.ts);
    const counts = { lead: 0, help: 0, pray: 0 };
    for (const a of items) counts[a.k]++;
    return { ok: true, items, counts, total: items.length };
  },

  // The presenter deletes answers: a flood of junk, or someone who asked.
  async drop(b, { store }) {
    need(RE_ROOM.test(str(b.room)), 400, 'bad-room');
    need(RE_KEY.test(str(b.key)), 403, 'bad-key');
    need(Array.isArray(b.ids) && b.ids.length >= 1 && b.ids.length <= MAX_DROP, 400, 'bad-ids');
    const ids = [...new Set(b.ids)];
    need(ids.every(id => typeof id === 'string' && RE_AID.test(id)), 400, 'bad-ids');
    await authRoom(store, b);
    let deleted = 0;
    await pool(ids, 16, async id => {
      const k = `a/${b.room}/${id}`;
      if (!await store.get(k, { type: 'json' })) return;
      await store.delete(k); deleted++;
    });
    return { ok: true, deleted };
  }
};

// Read with GET (?op=…&room=…); everything else is POST.
const GET_OPS = new Set(['status', 'deck', 'state']);

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
      b = { op, room: q.get('room') || '', p: q.get('p') || '' };
    } else if (request.method === 'POST') {
      // As register.mjs: JSON only (a form or text/plain "simple request" needs no preflight),
      // and never a request the browser marks as sent from another site.
      const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (type !== 'application/json') return reply({ ok: false, error: 'content-type' }, 415);
      if ((request.headers.get('sec-fetch-site') || '').trim().toLowerCase() === 'cross-site') return reply({ ok: false, error: 'cross-site' }, 403);
      const len = Number(request.headers.get('content-length') || 0);
      if (len > MAX_BODY) return reply({ ok: false, error: 'too-large' }, 413);
      const raw = await request.text();
      if (raw.length > MAX_BODY || Buffer.byteLength(raw, 'utf8') > MAX_BODY) return reply({ ok: false, error: 'too-large' }, 413);
      try { b = JSON.parse(raw); } catch { return reply({ ok: false, error: 'bad-json' }, 400); }
      if (!isPlain(b)) return reply({ ok: false, error: 'bad-json' }, 400);
      op = typeof b.op === 'string' ? b.op : '';
      if (!Object.prototype.hasOwnProperty.call(OPS, op)) return reply({ ok: false, error: 'unknown-op' }, 400);
    } else {
      return reply({ ok: false, error: 'method' }, 405);
    }
    if (op === 'status') return reply(await OPS.status());
    const store = theStore();
    const out = await OPS[op](b, { request, store, context });
    return reply(out, 200, op === 'state' && request.method === 'GET' ? EDGE_2S : null);
  } catch (e) {
    if (e instanceof Fail) return reply({ ...(e.extra || {}), ok: false, error: e.error }, e.status);
    // Only the op name: never the message, which could carry a key or a code.
    console.error('present: unexpected failure in op ' + (/^[a-z]{1,10}$/.test(op) ? op : '?'));
    return reply({ ok: false, error: 'server' }, 500);
  }
};
