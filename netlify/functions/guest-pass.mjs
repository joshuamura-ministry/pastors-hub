// Terrain · the unlock for the parts Claude writes: the pastor's passphrase, and guest codes.        guest-pass-1.1
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
//
// Functions import this file as the others import digital.mjs; as a file in netlify/functions it is also a function of its own.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export const FN = 'guest-pass-1.1';
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
    const email = cleanEmail(m[1]), code = m[2];
    if (!RE_EMAIL.test(email) || code.length < CODE_MIN || (P && code === P)) continue;
    if (seen.has(code)) { twice.add(code); continue; }
    seen.add(code); out.push({ email, code });
  }
  // a code written beside two emails belongs to neither
  return out.filter(g => !twice.has(g.code)).slice(0, GUESTS_MAX);
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
  const guest = guestsOf(process.env.TERRAIN_AI_GUESTS, P).find(x => same(g, x.code));
  if (!guest) return '';
  const rid = regIdOf(regToken);
  if (!rid) return '';
  const id = await idOfEmail(guest.email);
  return id && same(id, rid) ? 'guest' : '';
}
export async function passCheck(given, regToken, pass) { return (await unlockOf(given, regToken, pass)) !== ''; }

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
  const code = b && typeof b.code === 'string' ? b.code.trim() : '';
  if (!code || code.length > 200 || /[\s<>]/.test(code)) return reply({ ok: false, code: 'bad' }, 400);
  if (!(await tryOk(clientIp(request, context)))) return reply({ ok: false, code: 'limit' }, 429);
  const st = await unlockOf(code, request.headers.get('x-terrain-reg'));
  return reply({ ok: true, unlocked: st === 'pass' || st === 'guest', open: st === 'open' });
};
