// Terrain · the unlock for the parts Claude writes: the pastor's passphrase, and guest codes.        guest-pass-1.2
//
// v10.62.2. The pastor (9 Oct 2026), of his conference's ministerial director: "Just give him the unlock link but have him add like a secret
// code that only he can use". The parts Claude writes (the needs list, the ideas, the proposal's words, Find prices, "More ideas", the
// in-depth website review) run only on a device unlocked with `?ideas=<code>`. Until now the one code was the pastor's passphrase
// (TERRAIN_AI_PASS), good on any device that had it. A GUEST CODE is good only on a device registered with the one email written beside
// it: anyone else who opens the link gets the locked answer, exactly as with a wrong code.
//
// Environment (Netlify, marked secret; never in the repo or the chat):
//   TERRAIN_AI_PASS    the pastor's passphrase (unchanged; without it nothing is locked and no code is needed)
//   TERRAIN_AI_GUESTS  one guest a line (or a comma between them): `email=code`. A code of fewer than 12 characters, a code used twice,
//                      or one equal to the passphrase is left out. Taking the line away ends that guest's access at the next deploy.
//
// SAFE BY CONSTRUCTION
// - Every code is compared whole, in constant time (both sides hashed first), never by prefix.
// - A guest code also needs the registration token (TERRAIN_REG_SECRET signs it), and that registration must be the guest's own: the
//   record kept for the email (e/<sha256(email)> in terrain-registrations, register.mjs) holds the id the token carries. Without the
//   secret, a token or the record, a guest code unlocks nothing (it fails closed).
// - The guest's own limits apply as for anyone (a day's studies a registration, a device, an address, the site's).
// - Nothing here logs, and the GET below says only which version this is: never whether any guest is set.
// - v10.63.1 (guest-pass-1.1), the pastor: "Can you just put a tester code box on the top somewhere and he can click it and then he'll put
//   the code in and then it will unlock everything for him": POST {code} with the registration token answers {ok, unlocked} so the page
//   can say at once whether the code works on this registration. 12 tries an hour from one connection (its address hashed with the
//   registration secret: g/code/<hour>/<tag> in terrain-registrations, swept daily by gifts-sweep), so codes cannot be guessed by trying.
// - v10.70.0 (guest-pass-1.2), the pastor (14 Oct 2026), after a guest code written in Netlify did not work for his leader: "Why is this
//   so difficult … does it have to be tied to their email?", then "yes build those codes". TESTER CODES made in Terrain: on his own device
//   (his passphrase in x-terrain-pass) POST {op: make | list | off | on | delete}. A code is two words and four digits ("cedar-river-4821"),
//   made with crypto's randomInt, kept at t/<sha256 of its letters and digits> in terrain-registrations with his note of who it is for.
//   The first registration that checks it (POST {code} with its token) keeps it: reg, used, and the name and church its page sends, as
//   plain words. After that it unlocks for that registration only, in any capitals, with spaces or hyphens; anyone else is told it is
//   taken. Off locks it at once; a code that is off may be deleted. 50 codes on at most. Wrong passphrases: 12 an hour from one connection
//   (the right one is never counted), in the same hourly g/code/ counters. TERRAIN_AI_GUESTS still works, now in any capitals.
//
// Functions import this file as the others import digital.mjs; as a file in netlify/functions it is also a function of its own.

import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export const FN = 'guest-pass-1.2';
const TRIES_HOUR = 12;
const RE_REGTOK = /^r1\.([A-Za-z0-9_-]{12})\.([0-9a-z]{1,9})\.([A-Za-z0-9_-]{32})$/;
const RE_EMAIL = /^[^@\s,;=]{1,64}@[^@\s,;=]{3,190}$/;
const CODE_MIN = 12, GUESTS_MAX = 25, KEEP_MS = 10 * 60e3, KEEP_NONE_MS = 60e3;
const now = () => (globalThis.__terrainGuestNow ? globalThis.__terrainGuestNow() : Date.now());
const sha = s => createHash('sha256').update(String(s), 'utf8').digest();
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length > 0 && b.length > 0 && timingSafeEqual(sha(a), sha(b));
// an email as register.mjs keeps it: invisible format characters dropped, trimmed, lower case
const cleanEmail = v => String(v || '').replace(/\p{Cf}+/gu, '').trim().toLowerCase();

function regStore() {
  if (globalThis.__terrainRegStore) return globalThis.__terrainRegStore;
  return getStore({ name: 'terrain-registrations', consistency: 'strong' });
}
/* the guests in TERRAIN_AI_GUESTS: [{email, code}], the malformed and the weak left out */
export function guestsOf(raw = process.env.TERRAIN_AI_GUESTS, pass = process.env.TERRAIN_AI_PASS) {
  const P = String(pass || '').trim(), out = [], seen = new Set(), twice = new Set();
  for (const line of String(raw || '').split(/[\r\n,;]+/)) {
    const m = /^\s*([^=\s]+)\s*=\s*(\S+)\s*$/.exec(line);
    if (!m) continue;
    const email = cleanEmail(m[1]), code = m[2], low = code.toLowerCase();
    // v10.70.0: compared in any capitals (a phone capitalizes the first letter of a text message)
    if (!RE_EMAIL.test(email) || code.length < CODE_MIN || (P && low === P.toLowerCase())) continue;
    if (seen.has(low)) { twice.add(low); continue; }
    seen.add(low); out.push({ email, code });
  }
  // a code written beside two emails belongs to neither
  return out.filter(g => !twice.has(g.code.toLowerCase())).slice(0, GUESTS_MAX);
}
/* the registration id a token carries, when the token is good (the same check as advise.mjs's pRegTokenOk and digital.mjs's regId) */
export function regIdOf(tok, secret = (process.env.TERRAIN_REG_SECRET || '').trim(), t = now()) {
  const m = RE_REGTOK.exec(String(tok || '').trim());
  if (!m || secret.length < 32) return null;
  const iat = parseInt(m[2], 36) * 1000;
  if (!Number.isFinite(iat) || iat > t + 5 * 60e3 || t - iat > 180 * 864e5) return null;
  const want = createHmac('sha256', secret).update(`terrain-reg|r1|${m[1]}|${m[2]}`, 'utf8').digest('base64url').slice(0, 32);
  return timingSafeEqual(Buffer.from(want), Buffer.from(m[3])) ? m[1] : null;
}
// the registration id kept for an email, remembered a few minutes (a minute when there is none yet: he may be registering now)
const idKept = new Map();
async function idOfEmail(email) {
  const hit = idKept.get(email);
  if (hit && hit.until > now()) return hit.id;
  let id = null;
  try {
    const rec = await regStore().get('e/' + sha(email).toString('hex'), { type: 'json' });
    id = rec && typeof rec.id === 'string' && rec.id ? rec.id : null;
  } catch { id = null; }
  idKept.set(email, { id, until: now() + (id ? KEEP_MS : KEEP_NONE_MS) });
  return id;
}
export function forget() { idKept.clear(); }
/* → 'open' (no passphrase set: nothing is locked), 'pass' (the passphrase), 'guest' (a guest code on its own registration), '' (locked).
   `pass` is the caller's own reading of TERRAIN_AI_PASS, so each function keeps deciding "locked or open" exactly as it always has. */
export async function unlockOf(given, regToken, pass = process.env.TERRAIN_AI_PASS) {
  const P = String(pass || '').trim(), g = String(given || '').trim();
  if (!P) return 'open';
  if (!g) return '';
  if (same(g, P)) return 'pass';
  const gl = g.toLowerCase();
  const guest = guestsOf(process.env.TERRAIN_AI_GUESTS, P).find(x => same(gl, x.code.toLowerCase()));
  if (guest) {
    const rid = regIdOf(regToken);
    if (!rid) return '';
    const id = await idOfEmail(guest.email);
    return id && same(id, rid) ? 'guest' : '';
  }
  // v10.70.0: a tester code he made in Terrain, on the registration that keeps it (only the check below ever gives it one)
  const app = await appGet(g);
  if (!app || app.on !== true || typeof app.reg !== 'string' || !app.reg) return '';
  const rid = regIdOf(regToken);
  return rid && same(app.reg, rid) ? 'guest' : '';
}
export async function passCheck(given, regToken, pass) { return (await unlockOf(given, regToken, pass)) !== ''; }

// ---------------------------------------------------------------- v10.70.0: tester codes made in Terrain
const APP_MAX = 50, APP_SCAN = 200, ADMIN_TRIES = 12;
const WORDS = [...new Set(`amber anchor apple arbor aspen autumn badge banner barley basket beacon berry birch blossom bluff bramble branch
  breeze brook bridge cabin camel candle canyon cedar chapel cherry cider citrus clover cobalt comet copper coral cotton cove crane creek crest
  crown cypress daisy dawn delta desert dove dune eagle ember emerald falcon fern field finch flame flint forest fountain fox garden garnet
  gentle glade glacier grace granite grove harbor harvest hazel heron hickory hill honey horizon iris island ivory jasper juniper kettle kindle
  lake lantern laurel lemon light lily linen maple marble meadow melody mesa mint mist morning moss mountain myrtle nectar north oak oasis
  ocean olive orchard otter palm pasture pearl pebble pepper petal pine plain plum pond poplar prairie quail quartz quill rain raven reed
  ridge river robin rose ruby sage salt sapphire satin season shade shell shore silver sky slate snow sparrow spring spruce star stone summit
  sun swan thistle thrush timber topaz trail tulip valley velvet violet walnut wave willow wind winter wren yarrow acorn bay bell bloom bread
  castle cloud coast cocoa dew elm fable feather flower forge frost gate glen gold grain hawk hearth hope ink jewel joy lark leaf lodge lotus
  mercy moon nest path peace pecan pilot planet plaza pocket praise psalm quest rapid rhythm saddle scroll sierra signal song spark spice
  stream sunrise tide torch tower trumpet tundra vale vine vista wheat whistle wing yonder zinnia`.split(/\s+/).filter(w => /^[a-z]{3,8}$/.test(w)))];
// a code as it is kept and looked up: its letters and digits only, in small letters ("Cedar River 4821" = "cedar-river-4821")
export const canon = v => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const appShaped = k => /^[a-z]{6,24}\d{4}$/.test(k);
const RE_ID = /^[0-9a-f]{64}$/;
// a note, a name or a church as plain words: no markup or control characters, one line, cut to n
const plain = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const whoOf = w => { const name = plain(w && w.name, 80), church = plain(w && w.church, 80); return name || church ? { name, church } : null; };
const itemOf = (key, r) => ({ id: key.slice(2), code: r.code, note: typeof r.note === 'string' ? r.note : '', made: typeof r.made === 'number' ? r.made : 0,
  on: r.on === true, used: typeof r.used === 'number' ? r.used : null, who: r.who && typeof r.who === 'object' ? { name: plain(r.who.name, 80), church: plain(r.who.church, 80) } : null });
export function makeCode() {
  const a = WORDS[randomInt(WORDS.length)]; let b = a;
  while (b === a) b = WORDS[randomInt(WORDS.length)];
  return `${a}-${b}-${String(randomInt(10000)).padStart(4, '0')}`;
}
async function appGet(code) {
  const k = canon(code); if (!appShaped(k)) return null;
  try {
    const r = await regStore().get('t/' + sha(k).toString('hex'), { type: 'json' });
    return r && typeof r === 'object' && typeof r.code === 'string' ? r : null;
  } catch { return null; }
}
async function appList() {
  let keys = [];
  try {
    const st = regStore(), l = await st.list({ prefix: 't/' });
    keys = ((l && l.blobs) || []).map(x => x.key).filter(k => /^t\/[0-9a-f]{64}$/.test(k)).slice(0, APP_SCAN);
    const recs = await Promise.all(keys.map(k => st.get(k, { type: 'json' }).catch(() => null)));
    return keys.map((k, i) => recs[i] && typeof recs[i].code === 'string' ? itemOf(k, recs[i]) : null).filter(Boolean).sort((a, b) => b.made - a.made);
  } catch { return []; }
}
/* the check's own step for a tester code: the first registration keeps it; → {ok, rec} | {why: 'taken' | 'off' | ''} | null (not a code's shape) */
async function appClaim(code, rid, who) {
  const k = canon(code); if (!appShaped(k)) return null;
  const st = regStore(), key = 't/' + sha(k).toString('hex');
  for (let i = 0; i < 3; i++) {
    let got = null;
    try { got = typeof st.getWithMetadata === 'function' ? await st.getWithMetadata(key, { type: 'json' }) : { data: await st.get(key, { type: 'json' }), etag: null }; } catch { return { why: '' }; }
    const r = got && got.data;
    if (!r || typeof r.code !== 'string') return { why: '' };
    if (r.on !== true) return { why: 'off' };
    if (typeof r.reg === 'string' && r.reg) return rid && same(r.reg, rid) ? { ok: true, rec: r } : { why: 'taken' };
    if (!rid) return { why: '' };
    const next = { ...r, reg: rid, used: now(), who: whoOf(who) };
    let w = null;
    try { w = await st.setJSON(key, next, got.etag ? { onlyIfMatch: got.etag } : {}); } catch { return { why: '' }; }
    if (!w || w.modified !== false) return { ok: true, rec: next };
  }
  return { why: '' };
}
// wrong passphrases from one connection this hour (the right one is never counted): the same hourly g/code/ counters the sweep removes
async function adminCounter(ip) {
  const hour = new Date(now()).toISOString().slice(0, 13), secret = (process.env.TERRAIN_REG_SECRET || '').trim();
  const tag = createHmac('sha256', secret || 'terrain-guest').update('admin|' + (ip || 'none'), 'utf8').digest('base64url').slice(0, 22);
  const key = 'g/code/' + hour + '/' + tag;
  let n = 0; try { const cur = await regStore().get(key, { type: 'json' }); n = cur && typeof cur.n === 'number' ? cur.n : 0; } catch { n = 0; }
  return { key, n };
}
const ADMIN = new Set(['make', 'list', 'off', 'on', 'delete']);
async function admin(b, request, context) {
  const P = String(process.env.TERRAIN_AI_PASS || '').trim();
  if (!P) return reply({ ok: false, code: 'disabled' }, 403);
  const ctr = await adminCounter(clientIp(request, context));
  if (ctr.n >= ADMIN_TRIES) return reply({ ok: false, code: 'limit' }, 429);
  if (!same(String(request.headers.get('x-terrain-pass') || '').trim(), P)) {
    try { await regStore().setJSON(ctr.key, { n: ctr.n + 1 }); } catch { /* a counter that cannot be kept never locks him out */ }
    return reply({ ok: false, code: 'locked' }, 401);
  }
  const st = regStore();
  if (b.op === 'list') return reply({ ok: true, items: await appList(), max: APP_MAX });
  if (b.op === 'make') {
    if ((await appList()).filter(x => x.on).length >= APP_MAX) return reply({ ok: false, code: 'full' }, 409);
    const note = plain(b.note, 60);
    for (let i = 0; i < 8; i++) {
      const code = makeCode(), key = 't/' + sha(canon(code)).toString('hex');
      const rec = { v: 1, code, note, made: now(), on: true, reg: null, used: null, who: null };
      let w = null; try { w = await st.setJSON(key, rec, { onlyIfNew: true }); } catch { w = null; }
      if (w && w.modified !== false) return reply({ ok: true, item: itemOf(key, rec) });
    }
    return reply({ ok: false, code: 'busy' }, 503);
  }
  const id = String(b.id || '');
  if (!RE_ID.test(id)) return reply({ ok: false, code: 'bad' }, 400);
  const key = 't/' + id;
  let r = null; try { r = await st.get(key, { type: 'json' }); } catch { r = null; }
  if (!r || typeof r.code !== 'string') return reply({ ok: false, code: 'unknown' }, 404);
  if (b.op === 'delete') {
    if (r.on === true) return reply({ ok: false, code: 'on' }, 409);
    await st.delete(key); return reply({ ok: true });
  }
  if (b.op === 'on' && r.on !== true && (await appList()).filter(x => x.on).length >= APP_MAX) return reply({ ok: false, code: 'full' }, 409);
  const next = { ...r, on: b.op === 'on' };
  await st.setJSON(key, next);
  return reply({ ok: true, item: itemOf(key, next) });
}

const reply = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
function clientIp(request, context) {
  const ip = context && typeof context.ip === 'string' ? context.ip : (request.headers.get('x-nf-client-connection-ip') || '');
  return String(ip).trim().toLowerCase().slice(0, 64);
}
// one connection's tries this hour: true while under the limit (the count is kept even when the code is right)
async function tryOk(ip) {
  const t = now(), hour = new Date(t).toISOString().slice(0, 13);
  const secret = (process.env.TERRAIN_REG_SECRET || '').trim();
  const tag = createHmac('sha256', secret || 'terrain-guest').update('code|' + (ip || 'none'), 'utf8').digest('base64url').slice(0, 22);
  const key = 'g/code/' + hour + '/' + tag;
  try {
    const st = regStore(), cur = await st.get(key, { type: 'json' }), n = cur && typeof cur.n === 'number' ? cur.n : 0;
    if (n >= TRIES_HOUR) return false;
    await st.setJSON(key, { n: n + 1 });
  } catch { /* a counter that cannot be kept never locks a person out */ }
  return true;
}
export default async (request, context) => {
  if (request.method !== 'POST') return reply({ ok: true, fn: FN });
  let b = null; try { b = await request.json(); } catch { b = null; }
  // v10.70.0: his tester codes (his passphrase in x-terrain-pass)
  if (b && typeof b.op === 'string') return ADMIN.has(b.op) ? admin(b, request, context) : reply({ ok: false, code: 'bad' }, 400);
  const code = b && typeof b.code === 'string' ? b.code.trim() : '';
  // v10.70.0: spaces inside are fine now (a code read aloud is typed as words); markup and control characters are not
  if (!code || code.length > 200 || /[<>\u0000-\u001f\u007f]/.test(code)) return reply({ ok: false, code: 'bad' }, 400);
  if (!(await tryOk(clientIp(request, context)))) return reply({ ok: false, code: 'limit' }, 429);
  const tok = request.headers.get('x-terrain-reg');
  let st = await unlockOf(code, tok), keep = '', why = '';
  if (st === '') {
    const r = await appClaim(code, regIdOf(tok), b.who);
    if (r && r.ok) { st = 'guest'; keep = r.rec.code; } else if (r && r.why) why = r.why;
  } else if (st === 'guest') { const a = await appGet(code); if (a) keep = a.code; }
  return reply({ ok: true, unlocked: st === 'pass' || st === 'guest', open: st === 'open', kind: st === 'pass' ? 'pass' : st === 'guest' ? 'guest' : '',
    ...(keep ? { keep } : {}), ...(why ? { why } : {}) });
};
