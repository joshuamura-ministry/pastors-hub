// Terrain · Digital footprint, what registered pastors ask for.          digital-1.2
//
// v10.60.0 (DESIGN-DIGITAL.md). The page's part of "Compare your churches": every church of the pastor's conference, read from public
// pages by digital-read.mjs (a background function) and kept in Netlify Blobs (store "terrain-digital"). The findings name real
// churches, so they are given only to a registered pastor (the registration token, as census.mjs and gifts.mjs ask), never from a
// public file. The pastor (7 Oct 2026): every registered pastor sees every church of his conference; the report is for his own.
//
//   GET  ?conf=<name>                          → { ok, fn, conf, supported, enabled, state: none|reading|ready, reading, findings }
//   POST { op:'read', conf }                   → 202 { state:'reading' } (a reading queued) · 200 { state:'ready' } (fresh already)
//   POST { op:'again', conf, org }             → 202 one church read again ("Check again"; 3 a registration a day)
//   POST { op:'review', conf, org, key, lang?, own?, myName?, fresh? }   → 202 { job, poll } a review queued · 200 { cached, made, review } the kept one
//   POST { op:'review-status', conf, org, lang? }                        → { status: none|queued|running|done|failed, lang, made?, review?, code? }
//   GET  (no conf)                             → { ok, fn, places, search, review, reviewFn } (is Google's listing read? the search set? the review on?)
//
// v10.60.1 (digital-1.1): `warm(store, base, conf)` starts the same reading when a pastor registers or signs in (register.mjs), so the
// first pastor of a conference never waits the hour on Compare your churches (the pastor: "yes as soon as they sign up for sure").
//
// v10.62.0 (digital-1.2, DESIGN-DIGITAL-2.md Part 3): the in-depth review of one church by Claude (digital-review.mjs, review-1.0), for a
// registered pastor on an unlocked device (the passphrase, as the needs list): op review (the refusals in the needs' order, the kept review
// at no cost until the church is read again, 3 a registration a day for a church that is not his own or for "Review again",
// REVIEW_DAY_MAX (40) a day for the site, one job a church at a time) and op review-status. The pastor (8 Oct 2026): "It needs to show
// really the deficiencies and where things can improve. Right now it's capped at a very, very low level."
//
// Store keys: c/<slug> findings · j/<slug> the job (see digital-read.mjs) · e/<org> an official entry · r/<slug>/<org> a reading ·
// o/<slug> the day a conference was last opened (the monthly sweep reads those opened in 60 days) · t/<slug> the last start ·
// a/<day>/<reg> "Check again" counts · m/<month>/places, m/<month>/search the month's paid lookups · (v10.62.0) x/<slug>/<org> the
// reader's page texts for the review · q/<job> a review job · l/<slug>/<org> the church's last review job · v/<slug>/<org>/<lang> the kept
// review {v, made, at, readAt, model, review} · c/reg/<day>/<reg>, c/site/<day> the review counts.
//
// Environment: TERRAIN_REG_SECRET (as everywhere), DIGITAL_CONFS (the conferences that may be read, comma-separated; default
// "Pennsylvania"; "*" all), GOOGLE_PLACES_KEY, BRAVE_SEARCH_KEY (read by digital-read.mjs; here only said yes or no); v10.62.0:
// ANTHROPIC_API_KEY and TERRAIN_AI_PASS (the review needs both), REVIEW_DAY_MAX (40; 0 turns the review off), REVIEW_MODEL.

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { CONF_ORG, slugOf, sha, theStore, FN as READ_FN, RE_ORG } from './digital-read.mjs';
import { reviewInput } from './digital-review.mjs';
import { giveBack } from './advise-needs.mjs';
// v10.62.2: the lock is the passphrase, or a guest code on its own registration (guest-pass.mjs; TERRAIN_AI_GUESTS)
import { passCheck } from './guest-pass.mjs';

export const FN = 'digital-1.2';
const REVIEW_FN = 'review-1.0';   // the worker's own stamp (digital-review.mjs), said back by the bare GET
const FRESH_DAYS = 25, START_GAP_MS = 6 * 3600e3, STALL_MS = 4 * 60e3, AGAIN_DAY_MAX = 3;
const REVIEW_REG_DAY = 3, STUCK_MS = 10 * 60e3, REVIEW_POLL_MS = 4000;
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

// ---------------------------------------------------------------- v10.62.0: the in-depth review (digital-1.2)
/* The pastor (8 Oct 2026): "Are you able to survey the whole website and see its deficiencies as well because this is not enough";
   "I want to set the bar high when it comes to our digital footprint". The lock, the registration, the church, the kept review and the
   limits are checked here, in the needs list's order; the input is built from the findings and the reader's page texts (reviewInput in
   digital-review.mjs: never from anything the page sends beyond the church, the language, "own" and his own name); the job (q/<job>) is
   written and digital-review.mjs woken with { job, worker }, exactly as advise.mjs wakes advise-case.mjs. */
const KEY = () => (process.env.ANTHROPIC_API_KEY || '').trim();
const PASS = () => (process.env.TERRAIN_AI_PASS || '').trim();
const reviewDayMax = () => { const n = parseInt(process.env.REVIEW_DAY_MAX, 10); return Number.isInteger(n) && n >= 0 && n <= 1000 ? n : 40; };
const reviewOn = () => !!KEY() && !!PASS() && reviewDayMax() > 0;
const utcDay = t => new Date(t).toISOString().slice(0, 10);
const nextUtcDay = t => { const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1); };
const RE_NAME = /^[A-Za-zÀ-ÖØ-öø-ÿ' .’-]+$/;
function reviewLog(code) { try { console.log('[review] ' + JSON.stringify({ fn: FN, code })); } catch { /* never throws */ } }
const rReply = (code, status, extra) => { reviewLog(code); return reply({ ok: false, code, ...(extra || {}) }, status); };
// → {conf, org, lang, own, myName, fresh} or {field}: the only things the page may say
function reviewShape(b) {
  const conf = String(b.conf || '').trim();
  if (!Object.prototype.hasOwnProperty.call(CONF_ORG, conf)) return { field: 'conf' };
  const org = String(b.org || '');
  if (!RE_ORG.test(org)) return { field: 'org' };
  const lang = b.lang == null ? 'en' : b.lang;
  if (lang !== 'en' && lang !== 'es') return { field: 'lang' };
  if (b.own != null && typeof b.own !== 'boolean') return { field: 'own' };
  if (b.fresh != null && typeof b.fresh !== 'boolean') return { field: 'fresh' };
  const own = b.own === true, fresh = b.fresh === true;
  let myName = null;
  if (own) {
    myName = typeof b.myName === 'string' ? b.myName.replace(/\s+/g, ' ').trim() : '';
    if (!myName || myName.length > 80 || !RE_NAME.test(myName)) return { field: 'myName' };
  }
  return { conf, org, lang, own, myName, fresh };
}
// the day counters (create-or-compare-and-set, as advise.mjs's pBump); c/reg/<day>/<reg> and c/site/<day>, the shapes giveBack knows
async function bumpDay(store, key, max, t) {
  for (let i = 0; i < 8; i++) {
    const r = await getM(store, key);
    const n = r && isPlain(r.data) && Number.isInteger(r.data.n) ? r.data.n : 0;
    if (n >= max) return false;
    const w = await store.setJSON(key, { n: n + 1, at: t }, !r ? { onlyIfNew: true } : (r.etag ? { onlyIfMatch: r.etag } : undefined));
    if (!w || w.modified !== false) return true;
  }
  throw new Error('busy');
}
/* a review job that stalled (queued or running for over ten minutes: a wake lost, an instance gone) is marked failed and its
   registration count given back; → the job record as it stands, or null */
async function settle(store, job, t) {
  const r = await getM(store, 'q/' + job);
  if (!r || !isPlain(r.data)) return null;
  const rec = r.data;
  const stuck = (rec.status === 'running' && t - (rec.started || rec.created || 0) > STUCK_MS) || (rec.status === 'queued' && t - (rec.created || 0) > STUCK_MS);
  if (!stuck) return rec;
  const next = { ...rec, status: 'failed', code: rec.status === 'running' ? 'timeout' : 'unavailable', finished: t };
  const w = await store.setJSON('q/' + job, next, r.etag ? { onlyIfMatch: r.etag } : undefined);
  if (w && w.modified === false) return (await store.get('q/' + job, { type: 'json' })) || rec;
  if (isPlain(rec.counts) && rec.counts.reg) await giveBack(store, rec.counts.reg);
  return next;
}
async function wakeReview(base, job, worker) {
  try {
    const r = await fetch(new URL('/.netlify/functions/digital-review', base), { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ job, worker }), signal: AbortSignal.timeout(5000) });
    return !!r && r.status === 202;
  } catch { return false; }
}
/* op review: nokey 503 → disabled 403 → locked 401 → noreg 401 → bad 400 → not-yet 403 → unknown 404 → limits 429 → busy 409;
   the kept review (readAt = the findings' at) at no cost unless fresh */
async function reviewRoute(store, request, b, t) {
  if (!KEY()) return rReply('nokey', 503);
  if (!PASS() || reviewDayMax() === 0) return rReply('disabled', 403);
  if (!(await passCheck(typeof b.key === 'string' ? b.key : request.headers.get('x-terrain-pass'), request.headers.get('x-terrain-reg'), PASS()))) return rReply('locked', 401);
  const reg = regId(request.headers.get('x-terrain-reg'));
  if (!reg) return rReply('noreg', 401, { error: 'Register on the first page to use Terrain.' });
  const got = reviewShape(b);
  if (got.field) return rReply('bad', 400, { field: got.field });
  const { conf, org, lang, own, myName, fresh } = got;
  if (!allowed(conf)) return rReply('not-yet', 403, { conf });
  const slug = slugOf(conf);
  const c = await store.get('c/' + slug, { type: 'json' });
  const entry = c && Array.isArray(c.churches) ? c.churches.find(x => isPlain(x) && x.org === org) : null;
  if (!entry) return rReply('unknown', 404);
  const readAt = typeof c.at === 'number' ? c.at : 0, cacheKey = `v/${slug}/${org}/${lang}`;
  if (!fresh) {
    let hit = null; try { hit = await store.get(cacheKey, { type: 'json' }); } catch { hit = null; }
    if (hit && isPlain(hit.review) && hit.readAt === readAt) { reviewLog('cached'); return reply({ ok: true, fn: FN, cached: true, made: hit.made, review: hit.review }); }
  }
  // the limits: 3 a registration a day for another church or "Review again" (his own churches review themselves once a reading),
  // REVIEW_DAY_MAX for the whole site; counted before anything is spent, given back on a refusal
  const day = utcDay(t);
  const keys = { reg: reg !== 'open' && (!own || fresh) ? `c/reg/${day}/${reg}` : null, site: `c/site/${day}` };
  const taken = [];
  const back = async () => { for (const k of taken) await giveBack(store, keys[k]); };
  for (const [k, max, code] of [['reg', REVIEW_REG_DAY, 'limit-reg'], ['site', reviewDayMax(), 'limit-site']]) {
    if (!keys[k]) continue;
    if (!(await bumpDay(store, keys[k], max, t))) { await back(); return rReply(code, 429, { retryAfter: Math.max(1, Math.ceil((nextUtcDay(t) - t) / 1000)) }); }
    taken.push(k);
  }
  const lock = await store.get(`l/${slug}/${org}`, { type: 'json' });
  if (lock && typeof lock.job === 'string') {
    const j = await settle(store, lock.job, t);
    if (j && (j.status === 'queued' || j.status === 'running')) { await back(); return rReply('busy', 409); }
  }
  const x = await store.get(`x/${slug}/${org}`, { type: 'json' });
  let input = null;
  try { input = reviewInput(entry, x && Array.isArray(x.pages) ? x.pages : null, { own, myName, lang }); } catch { input = null; }
  if (!input) { await back(); return rReply('error', 500); }
  const job = rand(16), worker = rand(32);
  const rec = { v: 1, status: 'queued', created: t, workerHash: sha(worker), slug, org, lang, own, fresh, readAt, cacheKey, input,
    model: (process.env.REVIEW_MODEL || 'claude-opus-5-5').trim(), counts: { reg: keys.reg, site: keys.site } };
  const w = await store.setJSON('q/' + job, rec, { onlyIfNew: true });
  if (w && w.modified === false) { await back(); return rReply('busy', 503); }
  await store.setJSON(`l/${slug}/${org}`, { job, lang, created: t });
  if (!(await wakeReview(request.url, job, worker))) {
    let lost = false;
    try {
      const failed = { ...rec, status: 'failed', code: 'unavailable', finished: t };
      let f;
      if (w && w.etag) f = await store.setJSON('q/' + job, failed, { onlyIfMatch: w.etag });
      else { const cur = await store.get('q/' + job, { type: 'json' }); f = cur && cur.status === 'queued' ? await store.setJSON('q/' + job, failed) : { modified: false }; }
      lost = !!(f && f.modified === false);
    } catch { /* settle() tidies it after ten minutes */ }
    if (lost) { reviewLog('queued-late'); return reply({ ok: true, fn: FN, job, poll: REVIEW_POLL_MS }, 202); }
    await back();
    return rReply('unavailable', 502);
  }
  reviewLog('queued');
  return reply({ ok: true, fn: FN, job, poll: REVIEW_POLL_MS }, 202);
}
/* op review-status (a registered pastor of the conference): the church's last job for that language, else the kept review, else none */
async function reviewStatus(store, b, slug, t) {
  const org = String(b.org || '');
  if (!RE_ORG.test(org)) return reply({ ok: false, code: 'bad', field: 'org' }, 400);
  const lang = b.lang == null ? 'en' : b.lang;
  if (lang !== 'en' && lang !== 'es') return reply({ ok: false, code: 'bad', field: 'lang' }, 400);
  const lock = await store.get(`l/${slug}/${org}`, { type: 'json' });
  const rec = lock && typeof lock.job === 'string' ? await settle(store, lock.job, t) : null;
  if (rec && rec.lang === lang) {
    const out = { ok: true, status: rec.status };
    if (rec.status === 'failed') out.code = typeof rec.code === 'string' ? rec.code : 'unavailable';
    out.lang = lang;
    if (rec.status === 'done') { out.made = rec.made; out.review = rec.review; }
    return reply(out);
  }
  const hit = await store.get(`v/${slug}/${org}/${lang}`, { type: 'json' });
  if (hit && isPlain(hit.review)) return reply({ ok: true, status: 'done', lang, made: hit.made, review: hit.review, cached: true });
  return reply({ ok: true, status: 'none', lang });
}

export default async (request) => {
  try {
    const store = theStore(), url = new URL(request.url), t = now();
    if (request.method === 'GET' && !url.searchParams.get('conf'))
      return reply({ ok: true, fn: FN, readFn: READ_FN, places: !!(process.env.GOOGLE_PLACES_KEY || '').trim(), search: !!(process.env.BRAVE_SEARCH_KEY || '').trim(),
        review: reviewOn(), reviewFn: REVIEW_FN });
    let conf, b = {};
    if (request.method === 'GET') conf = url.searchParams.get('conf');
    else if (request.method === 'POST') {
      const raw = await request.text(); if (raw.length > 400) return reply({ ok: false, code: 'bad' }, 400);
      try { b = JSON.parse(raw); } catch { return reply({ ok: false, code: 'bad' }, 400); }
      if (!isPlain(b)) return reply({ ok: false, code: 'bad' }, 400);
      // v10.62.0: the review keeps the needs list's order of refusals (the key, the passphrase, then the registration): its own road
      if (b.op === 'review') return reviewRoute(store, request, b, t);
      conf = b.conf;
    } else return reply({ ok: false, code: 'method' }, 405);
    const reg = regId(request.headers.get('x-terrain-reg'));
    if (!reg) return reply({ ok: false, code: 'noreg', error: 'Register on the first page to use Terrain.' }, 401);
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

    if (b.op === 'review-status') return reviewStatus(store, b, slug, t);
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
