// Terrain · finding a church by its name, as it is typed.          places-1.0
//
// v10.69.0. The pastor (11 Oct 2026): "is there a way to make it so that it actually knows like … when you type in Google? It will actually
// populate or Google maps it will populate so if I say Fairview village seventh day so that I won't have to put in exactly … how every single
// thing should be before. It actually knows what church I'm talking about."
//
// Two sources, in this order:
//   1. the Adventist church directory of his conference, as Digital footprint has already read it (store "terrain-digital", c/<slug>: the
//      official list's name and address of every church; free, and the directory's own address, which the Census places);
//   2. Google's place search (Places API (New): Autocomplete, then Place Details for the one he picks; GOOGLE_PLACES_KEY, the same key as
//      Digital footprint's listing), only when the directory has fewer than three matches, so any church or street address can be found.
//
//   GET                                                        → { ok, fn, google }
//   POST { op:'suggest', q, conf?, session?, near?, lang? }   → { ok, list:[{src:'dir',name,address,town}|{src:'g',id,name,place}], google }
//   POST { op:'pick', id, session?, lang? }                   → { ok, address, lat, lon }
// Both POSTs ask for the registration token (x-terrain-reg), as census.mjs and digital.mjs do.
//
// Google's billing (read 11 Oct 2026): a session's Autocomplete requests and the one Place Details (Essentials fields only: formattedAddress,
// location) that ends it; 10,000 of each free a month. AC_MONTH_MAX and PD_MONTH_MAX (default 8,000 each) keep the site under that; past them,
// the directory alone answers. Nothing typed is kept: no log carries the query, and the store keeps only the month's two counts.
//
// Environment: GOOGLE_PLACES_KEY (optional: without it, the directory alone), TERRAIN_REG_SECRET, AC_MONTH_MAX, PD_MONTH_MAX.
import { CONF_ORG, slugOf, theStore } from './digital-read.mjs';
import { regId } from './digital.mjs';

export const FN = 'places-1.0';
const DIR_TTL = 10 * 60e3, DIR_MAX = 6, G_MAX = 5, G_WHEN_DIR_UNDER = 3, PER_MIN = 90;
const now = () => (globalThis.__terrainPlacesNow ? globalThis.__terrainPlacesNow() : Date.now());
const month = () => new Date(now()).toISOString().slice(0, 7);
const KEY = () => (process.env.GOOGLE_PLACES_KEY || '').trim();
const capOf = (k, d) => { const v = parseInt(process.env[k] || '', 10); return Number.isFinite(v) && v >= 0 ? v : d; };
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' } });
const fail = (code, status) => reply({ ok: false, code }, status);

// ---------------------------------------------------------------- words
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/* every church in the directory is Adventist, so the denomination's words (and "church") say nothing about which one: dropped from the
   query; "SDA" in a name is the same words */
const DENOM = /^(church|churches|iglesia|seventh|day|seventhday|adventist|adventists|adventista|adventistas|sda|septimo|del|de|la|el|the|of|company|group|grupo|compania)$/;
export function queryWords(q) { return fold(q).replace(/seventh-day/g, 'seventh day').split(/[^a-z0-9]+/).filter(w => w && !DENOM.test(w)); }
const hayOf = c => fold([c.name, c.aka, c.town, c.address].filter(Boolean).join(' ')).split(/[^a-z0-9]+/).filter(Boolean);
/* each word typed begins a word of the church's name, other name, town or address; a name match ranks first, then a church before a
   company or a group, then the shorter name */
export function matchDir(list, q) {
  const ws = queryWords(q);
  if (!ws.length || ws.join('').length < 2) return [];
  const out = [];
  for (const c of list) {
    const hay = hayOf(c);
    if (!ws.every(w => hay.some(h => h.startsWith(w)))) continue;
    const nm = fold(c.name).split(/[^a-z0-9]+/);
    out.push({ c, score: ws.filter(w => nm.some(h => h.startsWith(w))).length });
  }
  const k = c => (c.kind && c.kind !== 'church' ? 1 : 0);
  return out.sort((a, b) => b.score - a.score || k(a.c) - k(b.c) || a.c.name.length - b.c.name.length || a.c.name.localeCompare(b.c.name)).slice(0, DIR_MAX)
    .map(({ c }) => ({ src: 'dir', name: c.name, address: c.address, town: c.town || '' }));
}

// ---------------------------------------------------------------- the conference's directory (Digital footprint's findings)
const DIR = new Map();
export async function dirOf(store, conf) {
  if (!conf || !CONF_ORG[conf]) return [];
  const slug = slugOf(conf), hit = DIR.get(slug), t = now();
  if (hit && t - hit.at < DIR_TTL) return hit.list;
  let f = null;
  try { f = await store.get('c/' + slug, { type: 'json' }); } catch { f = null; }
  const list = (isPlain(f) && Array.isArray(f.churches) ? f.churches : [])
    .filter(c => isPlain(c) && typeof c.name === 'string' && typeof c.address === 'string' && c.address.trim() && /church|company|group/.test(c.kind || 'church'))
    .map(c => ({ name: c.name.slice(0, 120), kind: typeof c.kind === 'string' ? c.kind : 'church', aka: typeof c.aka === 'string' ? c.aka.slice(0, 120) : '', address: c.address.slice(0, 160), town: typeof c.town === 'string' ? c.town.slice(0, 60) : '' }));
  DIR.set(slug, { at: t, list });
  return list;
}

// ---------------------------------------------------------------- Google
async function bump(store, key, max) {
  if (max <= 0) return false;
  for (let i = 0; i < 4; i++) {
    const cur = typeof store.getWithMetadata === 'function' ? await store.getWithMetadata(key, { type: 'json' }) : null;
    const n = cur && cur.data && cur.data.n || 0; if (n >= max) return false;
    const w = cur ? await store.setJSON(key, { n: n + 1 }, { onlyIfMatch: cur.etag }) : await store.setJSON(key, { n: 1 }, { onlyIfNew: true });
    if (!w || w.modified !== false) return true;
  }
  return false;
}
const RE_SESSION = /^[A-Za-z0-9_-]{16,64}$/, RE_ID = /^[A-Za-z0-9_-]{10,300}$/;
const same = (a, b) => { const x = fold(a).replace(/\bsda\b|seventh|day|adventist|church|iglesia|[^a-z0-9]+/g, ''); return x && x === fold(b).replace(/\bsda\b|seventh|day|adventist|church|iglesia|[^a-z0-9]+/g, ''); };
async function gSuggest(store, q, session, near, lang, dir) {
  const key = KEY(); if (!key) return { list: [], on: false };
  if (!(await bump(store, `m/${month()}/ac`, capOf('AC_MONTH_MAX', 8000)))) return { list: [], on: true, cap: true };
  const body = { input: q, includedRegionCodes: ['us'], languageCode: lang === 'es' ? 'es' : 'en' };
  if (session) body.sessionToken = session;
  if (near) body.locationBias = { circle: { center: { latitude: near.lat, longitude: near.lon }, radius: 50000 } };
  try {
    const r = await fetch('https://places.googleapis.com/v1/places:autocomplete', { method: 'POST', signal: AbortSignal.timeout(4000),
      headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat' }, body: JSON.stringify(body) });
    if (!r.ok) { console.log('places: autocomplete', r.status); return { list: [], on: true, err: true }; }
    const j = await r.json();
    const list = [];
    for (const s of (j && Array.isArray(j.suggestions) ? j.suggestions : [])) {
      const p = s && s.placePrediction, sf = p && p.structuredFormat;
      if (!p || !RE_ID.test(p.placeId || '') || !sf || !sf.mainText || typeof sf.mainText.text !== 'string') continue;
      const name = sf.mainText.text.slice(0, 120), place = (sf.secondaryText && typeof sf.secondaryText.text === 'string' ? sf.secondaryText.text : '').replace(/,\s*USA$/, '').slice(0, 160);
      if (dir.some(d => same(d.name, name) && (!d.town || fold(place).includes(fold(d.town))))) continue;
      list.push({ src: 'g', id: p.placeId, name, place });
      if (list.length >= G_MAX) break;
    }
    return { list, on: true };
  } catch (e) { console.log('places: autocomplete failed'); return { list: [], on: true, err: true }; }
}
async function gPick(store, id, session, lang) {
  const key = KEY(); if (!key) return { code: 'off' };
  if (!(await bump(store, `m/${month()}/pd`, capOf('PD_MONTH_MAX', 8000)))) return { code: 'cap' };
  const u = new URL('https://places.googleapis.com/v1/places/' + id);
  if (session) u.searchParams.set('sessionToken', session);
  u.searchParams.set('languageCode', lang === 'es' ? 'es' : 'en');
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(4000), headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'formattedAddress,location' } });
    if (!r.ok) { console.log('places: details', r.status); return { code: 'google' }; }
    const j = await r.json(), loc = j && j.location;
    const address = typeof j.formattedAddress === 'string' ? j.formattedAddress.replace(/,\s*USA$/, '').slice(0, 200) : '';
    if (!address || !loc || !Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) return { code: 'google' };
    return { address, lat: Math.round(loc.latitude * 1e5) / 1e5, lon: Math.round(loc.longitude * 1e5) / 1e5 };
  } catch { console.log('places: details failed'); return { code: 'google' }; }
}

// ---------------------------------------------------------------- the requests
const SEEN = new Map();   // a registration's requests this minute (this instance): typing is quick, a script is not
function tooMany(reg) {
  const m = Math.floor(now() / 60e3), k = reg + '|' + m, n = (SEEN.get(k) || 0) + 1;
  SEEN.set(k, n); if (SEEN.size > 2000) for (const key of SEEN.keys()) if (!key.endsWith('|' + m)) SEEN.delete(key);
  return n > PER_MIN;
}
export function shape(b) {
  if (!isPlain(b)) return null;
  const lang = b.lang === 'es' ? 'es' : 'en';
  const session = b.session == null ? '' : (typeof b.session === 'string' && RE_SESSION.test(b.session) ? b.session : null);
  if (session === null) return null;
  if (b.op === 'suggest') {
    const q = typeof b.q === 'string' ? b.q.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim() : '';
    if (q.length < 2 || q.length > 80) return null;
    const conf = b.conf == null ? '' : (typeof b.conf === 'string' && CONF_ORG[b.conf] ? b.conf : null);
    if (conf === null) return null;
    let near = null;
    if (b.near != null) {
      if (!isPlain(b.near) || !Number.isFinite(b.near.lat) || !Number.isFinite(b.near.lon) || Math.abs(b.near.lat) > 90 || Math.abs(b.near.lon) > 180) return null;
      near = { lat: Math.round(b.near.lat * 1e3) / 1e3, lon: Math.round(b.near.lon * 1e3) / 1e3 };
    }
    return { op: 'suggest', q, conf, near, session, lang };
  }
  if (b.op === 'pick') return typeof b.id === 'string' && RE_ID.test(b.id) ? { op: 'pick', id: b.id, session, lang } : null;
  return null;
}
export default async function handler(request) {
  if (request.method === 'GET') return reply({ ok: true, fn: FN, google: !!KEY() });
  if (request.method !== 'POST') return fail('method', 405);
  const reg = regId(request.headers.get('x-terrain-reg'));
  if (!reg) return reply({ ok: false, code: 'noreg', error: 'Register on the first page to use Terrain.' }, 401);
  let b = null; try { b = await request.json(); } catch { b = null; }
  const s = shape(b);
  if (!s) return fail('bad', 400);
  if (tooMany(reg)) return fail('busy', 429);
  const store = theStore();
  if (s.op === 'pick') {
    const p = await gPick(store, s.id, s.session, s.lang);
    return p.code ? fail(p.code, p.code === 'cap' ? 429 : p.code === 'off' ? 503 : 502) : reply({ ok: true, ...p });
  }
  const dir = matchDir(await dirOf(store, s.conf), s.q);
  const g = dir.length < G_WHEN_DIR_UNDER ? await gSuggest(store, s.q, s.session, s.near, s.lang, dir) : { list: [], on: !!KEY() };
  return reply({ ok: true, list: [...dir, ...g.list], google: g.on });
}
